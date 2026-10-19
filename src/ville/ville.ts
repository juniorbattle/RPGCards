/**
 * M09 — la ville d'exploration : rendu de l'îlot, personnage du joueur au clavier et à la souris, PNJ, bulles
 * d'interaction. Indépendante du produit : elle signale les interactions (`onInteract`) et c'est l'appelant qui décide
 * (laboratoire de caméra en V1, démo jouable en V2). Caméra derrière l'interface `CameraRig` (cameras.ts).
 *
 * Post-traitement en trois passes, à la manière de l'arène (ADR 019) et de Cité du Tournoi (`PostFX.ts`) : scène HDR
 * linéaire → halo des lanternes à demi-définition → finition (flou de bascule « miniature » au-dessus et au-dessous du
 * personnage, étalonnage ombres froides / hautes lumières chaudes, vignettage, ACES, sRGB) en une seule passe.
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { createRig, RIGS, type CameraId, type CameraRig } from './cameras';
import { ILOTS, type IlotDef, type IlotId, type Passer } from './ilots';
import { activeZone, nearestFree, newWalker, stepWalker, type Facing, type Ilot, type Vec2, type Walker, type Zone } from './monde';
import type { IlotNpc } from './quai';
import type { QuaiScene } from './scene';
import { CELL_H, CELL_W, COLS, ROWS, createWalkerSprite, type WalkerSprite } from './sprites';
import { loadExternalAtlas } from './spritesExternes';

export interface TownOptions {
  host: HTMLElement;
  artSeed: number;
  camera: CameraId;
  /** Identifiant du personnage joueur (`player-<Famille>`). */
  player: string;
  /** Îlot de départ (défaut : le Quai) et point d'apparition (clé de ses `spawns`). */
  ilot?: IlotId;
  spawn?: string;
  /** Captures : temps figé, aucune animation. */
  freeze?: boolean;
  reducedMotion?: boolean;
  /** Interaction demandée (E / Entrée / clic sur la bulle) dans une zone. */
  onInteract?: (zone: Zone) => void;
  /** Touche Échap (menu). */
  onMenu?: () => void;
  /** PRÉPARATION (QA, `?qa=1&sprites=externes`) : feuilles de sprites externes vérifiées si un manifeste existe. */
  externalSprites?: boolean;
}

export interface TownStats {
  camera: CameraId;
  calls: number;
  triangles: number;
  textures: number;
  geometries: number;
  programs: number;
  lights: number;
  cpuMs: number;
  frames: number;
  buildMs: number;
}

export interface Town {
  /** Îlot courant (plan pur). */
  readonly ilot: Ilot;
  ilotId(): IlotId;
  /** Change d'îlot (un seul en mémoire) et place le joueur à un point d'apparition. */
  goTo(id: IlotId, spawn: string): void;
  setCamera(id: CameraId): void;
  camera(): CameraId;
  /** Place le joueur (téléportation, caméra sans amorti). */
  place(at: Vec2, facing?: Facing): void;
  walker(): Walker;
  zone(): Zone | null;
  /** Suspend la boucle (pendant un duel) / la reprend. */
  setPaused(p: boolean): void;
  /** Bloque les entrées du joueur (dialogue ouvert). */
  setInputLocked(l: boolean): void;
  stats(): TownStats;
  /** Feuilles externes chargées et refus motivés (préparation Aseprite). */
  externalReport(): { loaded: string[]; issues: string[] };
  /** Rend une image tout de suite (captures en temps figé). */
  renderNow(): void;
  /** Repères au-dessus des personnages de l'îlot (« ! » : un défi à relever ; « ? » : quelqu'un à écouter). */
  setMarkers(m: Readonly<Record<string, '!' | '?' | null>>): void;
  /** Position écran (px CSS) d'un point du monde, pour les bulles DOM. */
  project(p: { x: number; y: number; z: number }): { x: number; y: number; visible: boolean };
  dispose(): void;
}

const FINISH_VERT = /* glsl */ `
precision highp float;
uniform mat4 modelViewMatrix; uniform mat4 projectionMatrix;
attribute vec3 position; attribute vec2 uv; varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const FINISH_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D tDiffuse; uniform vec2 uTexel; uniform float uAspect; uniform float uTilt; uniform float uFocusY; uniform float uFocusW;
#include <tonemapping_pars_fragment>
#include <colorspace_pars_fragment>
varying vec2 vUv;
void main(){
  vec3 c = texture2D(tDiffuse, vUv).rgb;
  // Flou de bascule (miniature HD-2D) : net autour du personnage, flou croissant vers le haut et le bas du cadre.
  float amt = smoothstep(uFocusW, uFocusW + 0.32, abs(vUv.y - uFocusY)) * uTilt;
  if (amt > 0.02) {
    vec3 acc = c; float n = 1.0;
    for (int i = 0; i < 12; i++) {
      float a = float(i) * 2.39996; float r = sqrt((float(i) + 0.5) / 12.0);
      acc += texture2D(tDiffuse, vUv + vec2(cos(a), sin(a)) * r * amt * 6.5 * uTexel).rgb; n += 1.0;
    }
    c = acc / n;
  }
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(c, c * vec3(0.92, 0.98, 1.22), (1.0 - smoothstep(0.0, 0.2, l)) * 0.6);
  c *= mix(vec3(1.0), vec3(1.07, 1.0, 0.9), smoothstep(0.25, 1.2, l));
  c += vec3(0.005, 0.008, 0.017) * (1.0 - smoothstep(0.0, 0.08, l));
  vec2 p = (vUv - vec2(0.5, 0.5)) * vec2(uAspect, 1.0);
  float r = length(p) / length(vec2(uAspect * 0.5, 0.5));
  c *= 1.0 - smoothstep(0.45, 1.05, r) * 0.42;
  gl_FragColor = vec4(ACESFilmicToneMapping(c), 1.0);
  gl_FragColor = sRGBTransferOETF(gl_FragColor);
}`;

/** Flou de bascule par caméra (discret en frontale : surtout le haut des façades et le premier plan). */
const TILT: Record<CameraId, { amount: number; width: number }> = { frontale: { amount: 0.55, width: 0.24 } };

export function createTown(o: TownOptions): Town {
  const t0 = performance.now();
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 1);
  renderer.setPixelRatio(pixelRatio);
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.info.autoReset = false;
  renderer.domElement.className = 'ville-canvas';
  o.host.appendChild(renderer.domElement);

  let def: IlotDef = ILOTS[o.ilot ?? 'quai'];
  let world: QuaiScene = def.build(o.artSeed);
  let scene = world.scene;
  const camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.5, 400);
  let rig: CameraRig = createRig(o.camera, def.camera);

  // --- personnages ---
  const playerSprite: WalkerSprite = createWalkerSprite(o.player);
  scene.add(playerSprite.group);
  type NpcSprite = { n: IlotNpc; s: WalkerSprite; marker: THREE.Mesh; kind: '!' | '?' | null };
  const makeNpcs = (): NpcSprite[] => def.npcs.map((n) => {
    const s = createWalkerSprite(n.id);
    scene.add(s.group);
    s.set(n.at, n.facing, 0, false, 0);
    applyExternal(n.id, s);
    const marker = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.42), new THREE.MeshBasicMaterial({ map: markerTexture('!'), transparent: true, depthWrite: false, color: new THREE.Color(1.5, 1.5, 1.5) }));
    marker.position.set(n.at.x, 2.15, n.at.z + 0.02);
    marker.visible = false;
    marker.renderOrder = 3;
    scene.add(marker);
    return { n, s, marker, kind: null };
  });
  // Passants : va-et-vient sur une ligne z, déterministe (figé avec `freeze`) ; ils s'arrêtent si le joueur est juste
  // devant eux (pas d'obstacle dynamique dans la logique pure : on ne traverse pas, on attend).
  type PasserSprite = { a: Passer; s: WalkerSprite; x: number; dir: 1 | -1; phase: number; blocked: boolean };
  const makePassers = (): PasserSprite[] => def.ambient.map((a) => {
    const s = createWalkerSprite(a.id);
    scene.add(s.group);
    applyExternal(a.id, s);
    return { a, s, x: a.x0 + (a.phase ?? 0) * (a.x1 - a.x0), dir: 1, phase: 0, blocked: false };
  });
  // Feuilles externes (préparation, inactive par défaut) : appliquées dès qu'elles sont vérifiées, sinon atlas par code.
  const ext = { loaded: [] as string[], issues: [] as string[] };
  const applyExternal = (id: string, s: WalkerSprite) => {
    if (!o.externalSprites) return;
    void loadExternalAtlas(id, { cell: [CELL_W, CELL_H], cols: COLS, rows: ROWS }, ext.issues).then((a) => { if (a) { s.setAtlas(a.texture); if (!ext.loaded.includes(id)) ext.loaded.push(id); } });
  };
  applyExternal(o.player, playerSprite);
  let npcSprites = makeNpcs();
  let passers = makePassers();
  const spawn = def.ilot.spawns[o.spawn ?? 'arrivee'] ?? def.ilot.spawns.arrivee!;
  let walker = newWalker(spawn, spawn.face ?? 'face');

  // --- post-traitement ---
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType }));
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.42, 0.55, 0.92);
  const bloomSize = bloom.setSize.bind(bloom);
  bloom.setSize = (w: number, h: number) => bloomSize(Math.max(1, Math.round(w / 2)), Math.max(1, Math.round(h / 2)));
  composer.addPass(bloom);
  const finish = new ShaderPass(new THREE.RawShaderMaterial({
    name: 'VilleFinition',
    uniforms: {
      tDiffuse: { value: null }, uTexel: { value: new THREE.Vector2() }, uAspect: { value: 16 / 9 }, toneMappingExposure: { value: 1.05 },
      uTilt: { value: 1 }, uFocusY: { value: 0.45 }, uFocusW: { value: 0.16 },
    },
    defines: { ACES_FILMIC_TONE_MAPPING: '', SRGB_TRANSFER: '' },
    vertexShader: FINISH_VERT,
    fragmentShader: FINISH_FRAG,
  }));
  composer.addPass(finish);

  const applyRig = () => {
    const tl = TILT[rig.params.id];
    finish.uniforms.uTilt!.value = tl.amount;
    finish.uniforms.uFocusW!.value = tl.width;
    playerSprite.setTilt(rig.params.spriteTilt);
    for (const { s } of npcSprites) s.setTilt(rig.params.spriteTilt);
  };
  applyRig();

  const resize = () => {
    const w = Math.max(1, o.host.clientWidth || window.innerWidth);
    const h = Math.max(1, o.host.clientHeight || window.innerHeight);
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = `${w}px`;
    renderer.domElement.style.height = `${h}px`;
    composer.setSize(w, h);
    (finish.uniforms.uTexel!.value as THREE.Vector2).set(1 / (w * pixelRatio), 1 / (h * pixelRatio));
    finish.uniforms.uAspect!.value = w / h;
    rig.resize(camera, w / h);
  };
  window.addEventListener('resize', resize);
  resize();

  // --- entrées ---
  const keys = new Set<string>();
  let locked = false;
  let target: Vec2 | null = null;
  const KEYMAP: Record<string, [number, number]> = {
    ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
    KeyW: [0, -1], KeyZ: [0, -1], KeyS: [0, 1], KeyA: [-1, 0], KeyQ: [-1, 0], KeyD: [1, 0],
  };
  const onKey = (e: KeyboardEvent) => {
    const down = e.type === 'keydown';
    // Ville en pause (préparation, duel, deck, options…) : ses raccourcis ne doivent rien faire par-dessus l'écran.
    if (paused) { keys.clear(); return; }
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if (KEYMAP[e.code] || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      if (down) keys.add(e.code); else keys.delete(e.code);
      if (down) { target = null; e.preventDefault(); }
      return;
    }
    if (!down) return;
    // Échap passe toujours (fermer un dialogue ouvert même si le focus est resté sur la scène).
    if (e.code === 'Escape') { o.onMenu?.(); return; }
    if (locked) return;
    if (e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Space') {
      const z = activeZone(def.ilot, walker.pos);
      if (z) { e.preventDefault(); o.onInteract?.(z); }
    }
  };
  // Phase de capture : la ville voit la touche AVANT l'enveloppe (qui peut la remettre en marche en quittant un écran ;
  // sans cela, l'Échap qui ferme le deck rouvrait aussitôt le menu de la ville).
  window.addEventListener('keydown', onKey, true);
  window.addEventListener('keyup', onKey, true);
  const blurAll = () => keys.clear();
  window.addEventListener('blur', blurAll);
  // Clic au sol : rayon de la caméra par le pixel (dé-projection), intersection avec le plan y = 0.
  const onClick = (e: PointerEvent) => {
    if (locked || e.button !== 0) return;
    const r = renderer.domElement.getBoundingClientRect();
    const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
    const ny = -((e.clientY - r.top) / r.height) * 2 + 1;
    const a = new THREE.Vector3(nx, ny, -1).unproject(camera);
    const b = new THREE.Vector3(nx, ny, 1).unproject(camera);
    if (Math.abs(b.y - a.y) < 1e-6) return;
    const t = a.y / (a.y - b.y);
    if (t < 0) return;
    const hit = a.clone().lerp(b, t);
    // Clic sur (ou tout près d') un PNJ : aller devant lui, puis l'interaction se propose.
    const npc = def.npcs.find((n) => Math.hypot(n.at.x - hit.x, n.at.z - hit.z) < 0.9);
    const want = npc ? { x: npc.at.x + (walker.pos.x < npc.at.x ? -0.9 : 0.9), z: npc.at.z + 0.2 } : { x: hit.x, z: hit.z };
    target = nearestFree(def.ilot, want);
  };
  renderer.domElement.addEventListener('pointerdown', onClick);

  // --- boucle ---
  let paused = false;
  let raf = 0;
  let last = performance.now();
  let acc = 0;
  let time = o.freeze ? 1 : 0;
  let frames = 0;
  let cpuMs = 0;
  const STEP = 1 / 60;
  const inputDir = (): Vec2 => {
    let x = 0;
    let z = 0;
    for (const k of keys) { const d = KEYMAP[k]; if (d) { x += d[0]; z += d[1]; } }
    return { x, z };
  };
  const focus = new THREE.Vector3();
  const render = () => {
    world.update(time);
    playerSprite.set(walker.pos, walker.facing, walker.phase, walker.moving, time);
    for (const { n, s } of npcSprites) {
      // Les PNJ se tournent vers le joueur quand il approche (à moins de 2,5 m).
      const d = Math.hypot(walker.pos.x - n.at.x, walker.pos.z - n.at.z);
      const face: Facing = d < 2.5 ? (Math.abs(walker.pos.x - n.at.x) > Math.abs(walker.pos.z - n.at.z) ? (walker.pos.x > n.at.x ? 'droite' : 'gauche') : walker.pos.z > n.at.z ? 'face' : 'dos') : n.facing;
      s.set(n.at, face, 0, false, time + n.at.x);
    }
    for (const { n, marker } of npcSprites) if (marker.visible) marker.position.y = 2.15 + (o.freeze ? 0 : Math.sin(time * 2.4 + n.at.x) * 0.05);
    for (const p of passers) p.s.set({ x: p.x, z: p.a.z }, p.dir > 0 ? 'droite' : 'gauche', p.phase, !o.freeze && !p.blocked, time);
    focus.set(walker.pos.x, 0.9, walker.pos.z).project(camera);
    finish.uniforms.uFocusY!.value = THREE.MathUtils.clamp(focus.y * 0.5 + 0.5, 0.2, 0.8);
    const c0 = performance.now();
    renderer.info.reset();
    composer.render();
    cpuMs = performance.now() - c0;
    frames++;
  };
  const tick = (now: number) => {
    raf = requestAnimationFrame(tick);
    if (paused) { last = now; return; }
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (!o.freeze) {
      time += dt;
      acc += dt;
      let n = 0;
      while (acc >= STEP && n++ < 6) {
        const dir = locked ? { x: 0, z: 0 } : inputDir();
        walker = stepWalker(def.ilot, walker, { dir, slow: keys.has('ShiftLeft') || keys.has('ShiftRight'), target: locked ? null : target }, STEP);
        if (target && !walker.moving && Math.hypot(target.x - walker.pos.x, target.z - walker.pos.z) < 0.15) target = null;
        for (const p of passers) {
          const ahead = (walker.pos.x - p.x) * p.dir;
          p.blocked = ahead > 0 && ahead < 1.1 && Math.abs(walker.pos.z - p.a.z) < 0.8;
          if (p.blocked) continue;
          p.x += p.dir * p.a.speed * STEP;
          p.phase = (p.phase + (p.a.speed * STEP) / 1.5) % 1;
          if (p.x > p.a.x1) { p.x = p.a.x1; p.dir = -1; }
          if (p.x < p.a.x0) { p.x = p.a.x0; p.dir = 1; }
        }
        acc -= STEP;
      }
      acc = Math.min(acc, STEP);
    }
    rig.update(camera, walker.pos, dt, o.freeze);
    render();
  };
  rig.update(camera, walker.pos, 0, true);
  raf = requestAnimationFrame(tick);
  const buildMs = Math.round(performance.now() - t0);

  /** Démonte l'îlot courant (personnages, passants, scène) et monte le suivant ; le renderer et le post-traitement restent. */
  const mount = (id: IlotId, spawnKey: string) => {
    scene.remove(playerSprite.group);
    for (const e of npcSprites) { e.s.dispose(); e.marker.geometry.dispose(); (e.marker.material as THREE.Material).dispose(); }
    for (const p of passers) p.s.dispose();
    world.dispose();
    def = ILOTS[id];
    world = def.build(o.artSeed);
    scene = world.scene;
    renderPass.scene = scene;
    scene.add(playerSprite.group);
    npcSprites = makeNpcs();
    passers = makePassers();
    const sp = def.ilot.spawns[spawnKey] ?? def.ilot.spawns.arrivee!;
    walker = newWalker(sp, sp.face ?? walker.facing);
    target = null;
    keys.clear();
    rig = createRig(rig.params.id, def.camera);
    applyRig();
    resize();
    rig.update(camera, walker.pos, 0, true);
  };

  return {
    get ilot() { return def.ilot; },
    ilotId: () => def.id,
    goTo: mount,
    setCamera(id) {
      rig = createRig(id, def.camera);
      applyRig();
      resize();
      rig.update(camera, walker.pos, 0, true);
    },
    camera: () => rig.params.id,
    place(at, facing) {
      walker = { ...newWalker(at, facing ?? walker.facing) };
      target = null;
      rig.update(camera, walker.pos, 0, true);
    },
    walker: () => walker,
    zone: () => activeZone(def.ilot, walker.pos),
    setPaused(p) { paused = p; renderer.domElement.style.visibility = p ? 'hidden' : 'visible'; keys.clear(); },
    setInputLocked(l) { locked = l; if (l) { keys.clear(); target = null; } },
    stats() {
      const info = renderer.info;
      return {
        camera: rig.params.id, calls: info.render.calls, triangles: info.render.triangles, textures: info.memory.textures,
        geometries: info.memory.geometries, programs: info.programs?.length ?? 0, lights: world.lights.length,
        cpuMs: Math.round(cpuMs * 10) / 10, frames, buildMs,
      };
    },
    externalReport: () => ({ loaded: [...ext.loaded], issues: [...ext.issues] }),
    renderNow() { rig.update(camera, walker.pos, 0, true); render(); },
    setMarkers(m) {
      for (const e of npcSprites) {
        const k = m[e.n.id] ?? null;
        if (k !== e.kind) {
          e.kind = k;
          e.marker.visible = !!k;
          if (k) (e.marker.material as THREE.MeshBasicMaterial).map = markerTexture(k);
        }
      }
    },
    project(p) {
      const v = new THREE.Vector3(p.x, p.y, p.z).project(camera);
      const r = renderer.domElement.getBoundingClientRect();
      return { x: r.left + (v.x * 0.5 + 0.5) * r.width, y: r.top + (-v.y * 0.5 + 0.5) * r.height, visible: v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1 };
    },
    dispose() {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('keyup', onKey, true);
      window.removeEventListener('blur', blurAll);
      playerSprite.dispose();
      for (const { s, marker } of npcSprites) { s.dispose(); marker.geometry.dispose(); (marker.material as THREE.Material).dispose(); }
      for (const p of passers) p.s.dispose();
      for (const t of MARKERS.values()) t.dispose();
      MARKERS.clear();
      world.dispose();
      composer.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

const MARKERS = new Map<string, THREE.CanvasTexture>();
/** Repère peint : losange ambré (accent chaud des lanternes), signe sombre au centre. */
function markerTexture(kind: '!' | '?'): THREE.CanvasTexture {
  const hit = MARKERS.get(kind);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 80;
  const g = c.getContext('2d')!;
  g.translate(32, 36);
  g.beginPath();
  g.moveTo(0, -30); g.lineTo(26, 0); g.lineTo(0, 30); g.lineTo(-26, 0); g.closePath();
  g.fillStyle = '#e8b45a';
  g.fill();
  g.lineWidth = 4;
  g.strokeStyle = '#2a1a0c';
  g.stroke();
  g.fillStyle = '#2a1a0c';
  g.font = 'bold 34px Georgia, serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(kind, 0, 2);
  g.beginPath();
  g.moveTo(-6, 34); g.lineTo(6, 34); g.lineTo(0, 42); g.closePath();
  g.fillStyle = '#e8b45a';
  g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  MARKERS.set(kind, t);
  return t;
}

export { RIGS };
