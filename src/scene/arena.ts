/**
 * Arène de duel Three.js — mise en scène PROVISOIRE, 100 % procédurale (aucun asset téléchargé).
 *
 * - Sol : CanvasTexture générée (cercle rituel, emblèmes des quatre voies, glyphes) — seed art.
 * - Deux estrades (joueur proche / rival lointain), quatre piliers à cristaux émissifs, bannières.
 * - Particules flottantes (Points), brouillard, éclairage simple.
 * - FX déclenchés par les ÉVÉNEMENTS du moteur (jamais l’inverse) : onde de Clash, éclat de dégâts,
 *   dôme de Garde, anneau prismatique de Signature, prolongation, victoire.
 * - Deux préréglages de caméra exploratoires : `tilted` (vue de dessus inclinée) et `frontal` (2.5D).
 */
import * as THREE from 'three';
import { FAMILIES, type Family } from '../game/catalog/cards';
import { hashString, makeRng } from '../game/engine/rng';
import { drawEmblem } from '../art/emblems';
import { FAMILY_PALETTE } from '../art/palette';

export type CameraPreset = 'tilted' | 'frontal';

export type ArenaFx =
  | { type: 'reveal' }
  | { type: 'clash'; winner: 'me' | 'opp' | null; family: Family | null }
  | { type: 'damage'; side: 'me' | 'opp'; amount: number }
  | { type: 'guard'; side: 'me' | 'opp' }
  | { type: 'interfere'; side: 'me' | 'opp' }
  | { type: 'signature'; family: Family; side: 'me' | 'opp' }
  | { type: 'overtime' }
  | { type: 'victory'; side: 'me' | 'opp' };

export interface ArenaOptions {
  artSeed: number;
  preset: CameraPreset;
  reducedMotion: boolean;
  freeze: boolean;
}

export interface ArenaStats {
  fps: number;
  frameMs: number;
  drawCalls: number;
  triangles: number;
  textures: number;
  geometries: number;
}

export interface ArenaHandle {
  fx(fx: ArenaFx): void;
  setPreset(p: CameraPreset): void;
  setFamilies(me: Family, opp: Family): void;
  setReducedMotion(v: boolean): void;
  stats(): ArenaStats;
  dispose(): void;
}

const PRESETS: Record<CameraPreset, { pos: THREE.Vector3; look: THREE.Vector3; fov: number }> = {
  tilted: { pos: new THREE.Vector3(0, 14.5, 8.4), look: new THREE.Vector3(0, 0, -0.4), fov: 42 },
  frontal: { pos: new THREE.Vector3(0, 2.6, 13.5), look: new THREE.Vector3(0, 2.2, -1), fov: 40 },
};

const ME_Z = 3.2;
const OPP_Z = -3.6;

function floorTexture(seed: number): THREE.CanvasTexture {
  const size = 1024;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  const rng = makeRng(hashString(`floor|${seed}`));
  // dalles
  ctx.fillStyle = '#17141c';
  ctx.fillRect(0, 0, size, size);
  const tile = 64;
  for (let y = 0; y < size; y += tile) {
    for (let x = 0; x < size; x += tile) {
      const l = 34 + Math.floor(rng() * 18);
      ctx.fillStyle = `rgb(${l + 6},${l + 1},${l + 12})`;
      ctx.fillRect(x + 1, y + 1, tile - 2, tile - 2);
      if (rng() < 0.25) {
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.moveTo(x + rng() * tile, y);
        ctx.lineTo(x + rng() * tile, y + tile);
        ctx.stroke();
      }
    }
  }
  const cx = size / 2;
  const cy = size / 2;
  // cercles rituels
  ctx.strokeStyle = 'rgba(226,196,138,0.55)';
  for (const [r, w] of [[430, 3], [400, 1.5], [300, 2], [180, 2.5], [120, 1]] as const) {
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  // glyphes runiques entre deux anneaux (segments aléatoires seedés)
  ctx.strokeStyle = 'rgba(226,196,138,0.45)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    const r0 = 405;
    const r1 = 428;
    const ox = Math.cos(a);
    const oy = Math.sin(a);
    ctx.beginPath();
    ctx.moveTo(cx + ox * r0, cy + oy * r0);
    const mid = r0 + (r1 - r0) * rng();
    const ta = a + (rng() - 0.5) * 0.03;
    ctx.lineTo(cx + Math.cos(ta) * mid, cy + Math.sin(ta) * mid);
    ctx.lineTo(cx + ox * r1, cy + oy * r1);
    ctx.stroke();
  }
  // emblèmes des quatre voies aux points cardinaux + rayons
  FAMILIES.forEach((f, i) => {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    const p = FAMILY_PALETTE[f];
    ctx.strokeStyle = `${p.glow}66`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * 130, cy + Math.sin(a) * 130);
    ctx.lineTo(cx + Math.cos(a) * 395, cy + Math.sin(a) * 395);
    ctx.stroke();
    ctx.fillStyle = p.accent;
    drawEmblem(ctx, f, cx + Math.cos(a) * 350, cy + Math.sin(a) * 350, 34);
  });
  // ligne de Clash centrale
  ctx.strokeStyle = 'rgba(226,196,138,0.35)';
  ctx.setLineDash([14, 10]);
  ctx.beginPath();
  ctx.moveTo(cx - 300, cy);
  ctx.lineTo(cx + 300, cy);
  ctx.stroke();
  ctx.setLineDash([]);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function bannerTexture(family: Family, seed: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 384;
  const ctx = c.getContext('2d')!;
  const p = FAMILY_PALETTE[family];
  const rng = makeRng(hashString(`banner|${family}|${seed}`));
  const g = ctx.createLinearGradient(0, 0, 0, 384);
  g.addColorStop(0, p.mid);
  g.addColorStop(1, p.deep);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 384);
  ctx.fillStyle = p.accent;
  drawEmblem(ctx, family, 64, 120, 38);
  ctx.strokeStyle = `${p.accent}aa`;
  ctx.lineWidth = 3;
  ctx.strokeRect(10, 10, 108, 344);
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = `${p.accent}${rng() < 0.5 ? '66' : '33'}`;
    drawEmblem(ctx, family, 30 + rng() * 68, 200 + i * 26, 6 + rng() * 4);
  }
  // pointe de bannière
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.moveTo(0, 384); ctx.lineTo(64, 340); ctx.lineTo(128, 384); ctx.closePath();
  ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

interface Transient {
  obj: THREE.Object3D;
  t0: number;
  dur: number;
  update: (k: number) => void;
}

export function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

export function createArena(container: HTMLElement, opts: ArenaOptions): ArenaHandle | null {
  if (!webglAvailable()) return null;
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.className = 'arena-canvas';
  renderer.domElement.setAttribute('aria-hidden', 'true');
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0c0a10);
  scene.fog = new THREE.Fog(0x0c0a10, 16, 34);

  const camera = new THREE.PerspectiveCamera(PRESETS[opts.preset].fov, 1, 0.1, 100);
  let preset = opts.preset;
  let reduced = opts.reducedMotion;

  // Lumières
  scene.add(new THREE.HemisphereLight(0x9a8fb8, 0x1a1420, 0.7));
  const key = new THREE.DirectionalLight(0xffe6c0, 1.3);
  key.position.set(4, 12, 6);
  scene.add(key);
  const center = new THREE.PointLight(0xffd9a0, 0, 12, 1.6);
  center.position.set(0, 2.2, 0);
  scene.add(center);

  // Sol
  const floorTex = floorTexture(opts.artSeed);
  // Même texture en carte émissive : seuls les tracés clairs (cercle rituel, emblèmes) « brillent ».
  const floor = new THREE.Mesh(new THREE.CircleGeometry(11, 64), new THREE.MeshStandardMaterial({ map: floorTex, emissiveMap: floorTex, emissive: 0xffd9a0, emissiveIntensity: 0.22, roughness: 0.92, metalness: 0.05 }));
  floor.rotation.x = -Math.PI / 2;
  // la texture du cercle (diamètre 860/1024) correspond au rayon ~ 12.6 : on l’échelonne
  floorTex.repeat.set(1, 1);
  scene.add(floor);

  // Estrades
  const daisMat = (hex: number) => new THREE.MeshStandardMaterial({ color: 0x1c1822, roughness: 0.8, metalness: 0.1, emissive: hex, emissiveIntensity: 0.04 });
  const meDais = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.5, 0.22, 6), daisMat(0xffffff));
  meDais.position.set(0, 0.11, ME_Z);
  const oppDais = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.5, 0.22, 6), daisMat(0xffffff));
  oppDais.position.set(0, 0.11, OPP_Z);
  scene.add(meDais, oppDais);
  const meRim = new THREE.Mesh(new THREE.TorusGeometry(2.42, 0.025, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 }));
  meRim.rotation.x = -Math.PI / 2;
  meRim.rotation.z = Math.PI / 6; // aligne les sommets du liseré sur l’hexagone de l’estrade
  meRim.position.set(0, 0.23, ME_Z);
  const oppRim = meRim.clone();
  oppRim.material = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 });
  oppRim.position.set(0, 0.23, OPP_Z);
  scene.add(meRim, oppRim);
  const meLight = new THREE.PointLight(0xffffff, 0.22, 6, 2);
  meLight.position.set(0, 1.2, ME_Z);
  const oppLight = new THREE.PointLight(0xffffff, 0.22, 6, 2);
  oppLight.position.set(0, 1.2, OPP_Z);
  scene.add(meLight, oppLight);

  // Piliers et cristaux des quatre voies
  const crystals: THREE.Mesh[] = [];
  const crystalLights: THREE.PointLight[] = [];
  FAMILIES.forEach((f, i) => {
    const x = i % 2 === 0 ? -9.4 : 9.4;
    const z = i < 2 ? -6.5 : 2.2;
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.6, 4.2, 8), new THREE.MeshStandardMaterial({ color: 0x2b2632, roughness: 0.85 }));
    pillar.position.set(x, 2.1, z);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.55, 0.35, 8), new THREE.MeshStandardMaterial({ color: 0x3a3341, roughness: 0.7 }));
    cap.position.set(x, 4.35, z);
    const hex = FAMILY_PALETTE[f].hex;
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), new THREE.MeshStandardMaterial({ color: hex, emissive: hex, emissiveIntensity: 1.6, roughness: 0.25, metalness: 0.1 }));
    crystal.position.set(x, 5.1, z);
    const l = new THREE.PointLight(hex, 1.3, 9, 1.6);
    l.position.set(x, 5.1, z);
    scene.add(pillar, cap, crystal, l);
    crystals.push(crystal);
    crystalLights.push(l);
    // bannière (lisible surtout en vue frontale)
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 3.6), new THREE.MeshStandardMaterial({ map: bannerTexture(f, opts.artSeed), transparent: true, side: THREE.DoubleSide, roughness: 0.9 }));
    banner.position.set(x * 0.62, 3.0, -9.2);
    scene.add(banner);
  });
  // Arche de fond (frontale 2.5D : couche de profondeur)
  const archMat = new THREE.MeshStandardMaterial({ color: 0x241f2a, roughness: 0.9 });
  const arch = new THREE.Mesh(new THREE.TorusGeometry(5.4, 0.35, 8, 24, Math.PI), archMat);
  arch.position.set(0, 0, -10.5);
  scene.add(arch);

  // Particules (positions déterministes, seed art)
  const N = 420;
  const prng = makeRng(hashString(`motes|${opts.artSeed}`));
  const pos = new Float32Array(N * 3);
  const speed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (prng() - 0.5) * 22;
    pos[i * 3 + 1] = prng() * 7;
    pos[i * 3 + 2] = (prng() - 0.5) * 18;
    speed[i] = 0.12 + prng() * 0.35;
  }
  const motesGeo = new THREE.BufferGeometry();
  motesGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const motes = new THREE.Points(motesGeo, new THREE.PointsMaterial({ color: 0xffd9a0, size: 0.06, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(motes);

  // --- FX transitoires ----------------------------------------------------
  const transients: Transient[] = [];
  let clock = 0;
  let shake = 0;

  function addTransient(obj: THREE.Object3D, dur: number, update: (k: number) => void): void {
    scene.add(obj);
    transients.push({ obj, t0: clock, dur, update });
    if (reduced || opts.freeze) {
      // mouvement réduit : état final lisible immédiatement, sans animation prolongée
      update(0.35);
      renderOnce();
      window.setTimeout(() => { scene.remove(obj); disposeObj(obj); renderOnce(); }, 700);
      transients.pop();
    }
  }

  function ring(color: number, z: number, maxScale: number, dur: number): void {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.6, 0.85, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(0, 0.45, z);
    addTransient(m, dur, (k) => {
      m.scale.setScalar(1 + k * maxScale);
      (m.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - k);
    });
  }

  function burst(color: number, z: number, count: number): void {
    const g = new THREE.BufferGeometry();
    const p = new Float32Array(count * 3);
    const v: number[] = [];
    const r = makeRng(hashString(`burst|${clock.toFixed(2)}|${z}`));
    for (let i = 0; i < count; i++) {
      p[i * 3] = 0; p[i * 3 + 1] = 1; p[i * 3 + 2] = z;
      const a = r() * Math.PI * 2;
      const s = 2 + r() * 5;
      v.push(Math.cos(a) * s, 1 + r() * 4, Math.sin(a) * s * 0.6);
    }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ color, size: 0.16, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false }));
    addTransient(pts, 1.1, (k) => {
      const arr = g.attributes.position!.array as Float32Array;
      for (let i = 0; i < count; i++) {
        arr[i * 3] = v[i * 3]! * k;
        arr[i * 3 + 1] = 1 + v[i * 3 + 1]! * k - 4 * k * k;
        arr[i * 3 + 2] = z + v[i * 3 + 2]! * k;
      }
      g.attributes.position!.needsUpdate = true;
      (pts.material as THREE.PointsMaterial).opacity = 1 - k;
    });
  }

  function dome(color: number, z: number): void {
    const m = new THREE.Mesh(new THREE.SphereGeometry(2.6, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.position.set(0, 0.35, z);
    addTransient(m, 1.2, (k) => {
      m.scale.setScalar(0.6 + 0.4 * Math.min(1, k * 3));
      (m.material as THREE.MeshBasicMaterial).opacity = 0.6 * (1 - k);
    });
  }

  const zOf = (side: 'me' | 'opp') => (side === 'me' ? ME_Z : OPP_Z);
  let meHex = 0xffffff;
  let oppHex = 0xffffff;

  // --- Boucle -------------------------------------------------------------
  let raf = 0;
  let last = performance.now();
  let fps = 0;
  let frameMs = 0;
  let frames = 0;
  let acc = 0;

  function resize(): void {
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Écran étroit (portrait) : recul de caméra pour conserver l’arène dans le cadre.
    const pr = PRESETS[preset];
    camera.fov = pr.fov * (camera.aspect < 0.8 ? 1.35 : 1);
    camera.updateProjectionMatrix();
  }

  function placeCamera(t: number): void {
    const pr = PRESETS[preset];
    const drift = reduced || opts.freeze ? 0 : 1;
    camera.position.set(pr.pos.x + Math.sin(t * 0.13) * 0.25 * drift, pr.pos.y + Math.sin(t * 0.21) * 0.08 * drift, pr.pos.z);
    if (shake > 0) {
      camera.position.x += (Math.sin(t * 90) * shake) * 0.12;
      camera.position.y += (Math.cos(t * 77) * shake) * 0.08;
    }
    camera.lookAt(pr.look);
  }

  function update(dt: number): void {
    clock += dt;
    shake = Math.max(0, shake - dt * 2.5);
    const arr = motesGeo.attributes.position!.array as Float32Array;
    for (let i = 0; i < N; i++) {
      arr[i * 3 + 1]! += speed[i]! * dt;
      if (arr[i * 3 + 1]! > 7) arr[i * 3 + 1] = 0;
    }
    motesGeo.attributes.position!.needsUpdate = true;
    crystals.forEach((c, i) => {
      c.rotation.y = clock * (0.4 + i * 0.07);
      c.position.y = 5.1 + Math.sin(clock * 1.1 + i) * 0.12;
      crystalLights[i]!.intensity = 1.2 + Math.sin(clock * 3.1 + i * 1.7) * 0.15;
    });
    center.intensity = Math.max(0, center.intensity - dt * 6);
    for (let i = transients.length - 1; i >= 0; i--) {
      const tr = transients[i]!;
      const k = Math.min(1, (clock - tr.t0) / tr.dur);
      tr.update(k);
      if (k >= 1) {
        scene.remove(tr.obj);
        disposeObj(tr.obj);
        transients.splice(i, 1);
      }
    }
  }

  function renderOnce(): void {
    placeCamera(clock);
    renderer.render(scene, camera);
  }

  function loop(now: number): void {
    raf = requestAnimationFrame(loop);
    const realDt = (now - last) / 1000;
    const dt = Math.min(0.05, realDt);
    last = now;
    const t0 = performance.now();
    update(dt);
    renderOnce();
    frameMs = frameMs * 0.9 + (performance.now() - t0) * 0.1;
    frames++;
    acc += realDt; // temps réel (non plafonné) pour une mesure FPS honnête
    if (acc >= 1) {
      fps = frames / acc;
      frames = 0;
      acc = 0;
    }
  }

  function start(): void {
    cancelAnimationFrame(raf);
    if (opts.freeze || reduced) {
      // Image fixe déterministe (captures) ou mouvement réduit : rendu à la demande.
      clock = 1.234;
      update(0);
      renderOnce();
      return;
    }
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }

  const onResize = () => { resize(); if (opts.freeze || reduced) renderOnce(); };
  const onVis = () => { if (document.hidden) cancelAnimationFrame(raf); else start(); };
  window.addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', onVis);
  resize();
  start();

  function disposeObj(o: THREE.Object3D): void {
    o.traverse((x) => {
      const m = x as THREE.Mesh;
      m.geometry?.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((y) => y.dispose());
      else mat?.dispose();
    });
  }

  return {
    fx(fx: ArenaFx) {
      switch (fx.type) {
        case 'reveal':
          center.intensity = 6;
          ring(0xffe0a8, 0, 3, 0.8);
          break;
        case 'clash': {
          const color = fx.family ? FAMILY_PALETTE[fx.family].hex : 0xffe0a8;
          center.color.setHex(color);
          center.intensity = 10;
          ring(color, 0, 7, 1.0);
          burst(color, 0, 90);
          shake = reduced ? 0 : 0.6;
          break;
        }
        case 'damage':
          burst(0xff4a3a, zOf(fx.side), Math.min(160, 30 + fx.amount * 2));
          ring(0xff4a3a, zOf(fx.side), 3, 0.7);
          (fx.side === 'me' ? meLight : oppLight).intensity = 4;
          shake = reduced ? 0 : Math.min(1.2, 0.3 + fx.amount / 60);
          break;
        case 'guard':
          dome(fx.side === 'me' ? meHex : oppHex, zOf(fx.side));
          break;
        case 'interfere':
          ring(0xb48cff, zOf(fx.side) * 0.5, 2.2, 0.6);
          break;
        case 'signature':
          [0xff8fa3, 0xffd36b, 0x8fdc6a, 0x8fb8ff].forEach((c, i) => ring(c, zOf(fx.side), 2.5 + i * 0.8, 1.1 + i * 0.12));
          break;
        case 'overtime':
          ring(0xffffff, 0, 8, 1.4);
          ring(0xff4a3a, 0, 6, 1.2);
          break;
        case 'victory':
          burst(0xffe08a, zOf(fx.side), 200);
          ring(0xffe08a, zOf(fx.side), 6, 1.6);
          break;
      }
      // retour d’intensité des estrades
      window.setTimeout(() => { meLight.intensity = 0.22; oppLight.intensity = 0.22; if (reduced || opts.freeze) renderOnce(); }, 600);
      if (reduced || opts.freeze) renderOnce();
    },
    setPreset(p: CameraPreset) {
      preset = p;
      resize();
      renderOnce();
    },
    setFamilies(me: Family, opp: Family) {
      meHex = FAMILY_PALETTE[me].hex;
      oppHex = FAMILY_PALETTE[opp].hex;
      (meRim.material as THREE.MeshBasicMaterial).color.setHex(meHex);
      (oppRim.material as THREE.MeshBasicMaterial).color.setHex(oppHex);
      meLight.color.setHex(meHex);
      oppLight.color.setHex(oppHex);
      (meDais.material as THREE.MeshStandardMaterial).emissive.setHex(meHex);
      (meDais.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.035;
      (oppDais.material as THREE.MeshStandardMaterial).emissive.setHex(oppHex);
      (oppDais.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.035;
      renderOnce();
    },
    setReducedMotion(v: boolean) {
      reduced = v;
      start();
    },
    stats(): ArenaStats {
      const info = renderer.info;
      return { fps: Math.round(fps * 10) / 10, frameMs: Math.round(frameMs * 100) / 100, drawCalls: info.render.calls, triangles: info.render.triangles, textures: info.memory.textures, geometries: info.memory.geometries };
    },
    dispose() {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVis);
      scene.traverse((o) => disposeObj(o));
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
