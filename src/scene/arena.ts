/**
 * Arène de duel Three.js — M02 « confrontation face à face ». Mise en scène PROVISOIRE, 100 % code.
 *
 * - Une table de duel sépare le joueur (côté caméra) du rival, debout derrière la table.
 * - Vue A « confrontation » : caméra frontale à hauteur de regard ; le rival (visage + buste) est
 *   cadré dans la bande libre que le DOM lui réserve (`setStage`), quelle que soit la taille d’écran.
 * - Vue B « manipulation » : caméra inclinée vers la table ; le rival reste visible en haut et, si
 *   demandé, dans un PORTRAIT vivant incrusté (`setPortrait`, même renderer, scissor).
 * - Transitions A↔B interpolées, interruptibles, instantanées en mouvement réduit / gel.
 * - FX déclenchés par les événements du moteur ; expressions du rival fournies par l’ExpressionDirector.
 * Aucun asset externe ; ni le moteur ni l’IA ne dépendent de ce module.
 */
import * as THREE from 'three';
import { FAMILIES, type Family } from '../game/catalog/cards';
import { hashString, makeRng } from '../game/engine/rng';
import { drawEmblem } from '../art/emblems';
import { FAMILY_PALETTE } from '../art/palette';
import { cardBackCanvas } from '../art/cardArt';
import type { ViewMode } from '../presentation/director';
import type { Expression, Gesture } from '../presentation/expression';
import type { Mood, RivalPersonality } from '../presentation/personalities';
import { createRival, HEAD_WORLD, RIVAL_Z, type RivalRig } from './rival';

/** Conservé pour compatibilité des paramètres d’URL M01 (`cam=`) : tilted ≙ B, frontal ≙ A. */
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
  view: ViewMode;
  reducedMotion: boolean;
  freeze: boolean;
  personality: RivalPersonality;
}

export interface ArenaStats {
  fps: number;
  frameMs: number;
  drawCalls: number;
  triangles: number;
  textures: number;
  geometries: number;
  view: ViewMode;
  blend: number;
  portrait: boolean;
  rival: { mood: Mood; gesture: Gesture | null; cause: string };
}

export interface Rect { x: number; y: number; w: number; h: number }

export interface ArenaHandle {
  fx(fx: ArenaFx): void;
  setView(v: ViewMode): void;
  /** Bande d’écran (px CSS) où le rival doit apparaître en vue A. */
  setStage(r: Rect | null): void;
  /** Zone du plateau DOM (px CSS) : centre horizontal de la vue B. */
  setBoard(r: Rect | null): void;
  /** Cadre DOM (px CSS) du portrait vivant du rival, ou null. */
  setPortrait(r: Rect | null): void;
  expression(e: Expression): void;
  setRivalHand(n: number): void;
  setFamilies(me: Family, opp: Family): void;
  setReducedMotion(v: boolean): void;
  stats(): ArenaStats;
  dispose(): void;
}

const TABLE_TOP = 1.05;
const ME_Z = 1.6;
const OPP_Z = -1.9;
const VIEW_B = { pos: new THREE.Vector3(0, 10.2, 6.4), look: new THREE.Vector3(0, TABLE_TOP, 0.35), fov: 46 };
const VIEW_A = { pos: new THREE.Vector3(0, 2.8, 6.4), look: new THREE.Vector3(0, 2.62, RIVAL_Z), worldH: 2.25 };

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

/** Plateau de table : feutre sombre, liseré, cercle de Clash central, deux zones de duellistes. */
function tableTexture(seed: number): THREE.CanvasTexture {
  const W = 1024;
  const H = 640;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  const rng = makeRng(hashString(`table|${seed}`));
  const g = ctx.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, W * 0.6);
  g.addColorStop(0, '#2b1f2e');
  g.addColorStop(1, '#120d16');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // grain du feutre
  for (let i = 0; i < 2600; i++) {
    ctx.fillStyle = `rgba(255,255,255,${rng() * 0.025})`;
    ctx.fillRect(rng() * W, rng() * H, 2, 2);
  }
  ctx.strokeStyle = 'rgba(226,196,138,0.55)';
  ctx.lineWidth = 6;
  ctx.strokeRect(18, 18, W - 36, H - 36);
  ctx.lineWidth = 2;
  ctx.strokeRect(34, 34, W - 68, H - 68);
  // cercle de Clash
  ctx.strokeStyle = 'rgba(226,196,138,0.4)';
  for (const r of [70, 100]) { ctx.beginPath(); ctx.arc(W / 2, H / 2, r, 0, Math.PI * 2); ctx.stroke(); }
  FAMILIES.forEach((f, i) => {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    ctx.fillStyle = `${FAMILY_PALETTE[f].accent}99`;
    drawEmblem(ctx, f, W / 2 + Math.cos(a) * 85, H / 2 + Math.sin(a) * 85, 10);
  });
  // ligne médiane
  ctx.setLineDash([12, 10]);
  ctx.beginPath(); ctx.moveTo(60, H / 2); ctx.lineTo(W / 2 - 120, H / 2); ctx.moveTo(W / 2 + 120, H / 2); ctx.lineTo(W - 60, H / 2); ctx.stroke();
  ctx.setLineDash([]);
  // emplacements (3 par côté, rappel visuel des zones DOM)
  for (const y of [H * 0.2, H * 0.8]) {
    for (const x of [W / 2 - 170, W / 2, W / 2 + 170]) {
      ctx.strokeStyle = 'rgba(226,196,138,0.22)';
      ctx.strokeRect(x - 46, y - 62, 92, 124);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
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

const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

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
  renderer.toneMappingExposure = 1.08;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.autoClear = false;
  renderer.domElement.className = 'arena-canvas';
  renderer.domElement.setAttribute('aria-hidden', 'true');
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d0a12);
  scene.fog = new THREE.Fog(0x0d0a12, 14, 30);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  const portraitCam = new THREE.PerspectiveCamera(17, 1, 0.1, 50);
  portraitCam.position.set(0, HEAD_WORLD.y + 0.05, 1.6);
  portraitCam.lookAt(HEAD_WORLD.x, HEAD_WORLD.y - 0.12, HEAD_WORLD.z);

  let reduced = opts.reducedMotion;
  let view: ViewMode = opts.view;
  let blend = view === 'B' ? 1 : 0; // 0 = A, 1 = B
  let blendFrom = blend;
  let blendT = 1;
  let stage: Rect | null = null;
  let boardRect: Rect | null = null;
  let portrait: Rect | null = null;

  // Lumières : clé frontale chaude, contre-jour coloré derrière le rival, remplissage froid.
  scene.add(new THREE.HemisphereLight(0x9a8fb8, 0x1a1420, 0.75));
  const key = new THREE.DirectionalLight(0xffe6c0, 1.25);
  key.position.set(2.5, 6, 8);
  scene.add(key);
  const rim = new THREE.PointLight(0xffffff, 6, 7, 1.6);
  rim.position.set(0, 3.6, RIVAL_Z - 1.4);
  scene.add(rim);
  const faceFill = new THREE.PointLight(0xfff0e0, 1.6, 6, 1.8);
  faceFill.position.set(-1.2, 3.2, 0.2);
  scene.add(faceFill);
  const center = new THREE.PointLight(0xffd9a0, 0, 8, 1.6);
  center.position.set(0, TABLE_TOP + 1.2, -0.2);
  scene.add(center);

  // Sol rituel
  const floorTex = floorTexture(opts.artSeed);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(11, 64), new THREE.MeshStandardMaterial({ map: floorTex, emissiveMap: floorTex, emissive: 0xffd9a0, emissiveIntensity: 0.18, roughness: 0.92, metalness: 0.05 }));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  // Table de duel
  const tableTex = tableTexture(opts.artSeed);
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x3a2618, roughness: 0.75, metalness: 0.05 });
  const topMat = new THREE.MeshStandardMaterial({ map: tableTex, roughness: 0.95 });
  const table = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.24, 7.2), [woodMat, woodMat, topMat, woodMat, woodMat, woodMat]);
  table.position.set(0, TABLE_TOP - 0.12, 1.2);
  scene.add(table);
  const apron = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.9, 6.8), new THREE.MeshStandardMaterial({ color: 0x24170f, roughness: 0.9 }));
  apron.position.set(0, TABLE_TOP - 0.7, 1.2);
  scene.add(apron);
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xc9a25a, roughness: 0.4, metalness: 0.7 });
  const trim = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.05, 0.08), trimMat);
  trim.position.set(0, TABLE_TOP, 4.8);
  scene.add(trim);

  // Fond : piliers, cristaux, bannières, arche (couches de profondeur 2.5D)
  const crystals: THREE.Mesh[] = [];
  const crystalLights: THREE.PointLight[] = [];
  FAMILIES.forEach((f, i) => {
    const x = [-5.6, 5.6, -8.4, 8.4][i]!;
    const z = [-6.2, -6.2, -3.2, -3.2][i]!;
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.6, 5.2, 8), new THREE.MeshStandardMaterial({ color: 0x2b2632, roughness: 0.85 }));
    pillar.position.set(x, 2.6, z);
    const hex = FAMILY_PALETTE[f].hex;
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.38, 0), new THREE.MeshStandardMaterial({ color: hex, emissive: hex, emissiveIntensity: 1.6, roughness: 0.25 }));
    crystal.position.set(x, 5.7, z);
    const l = new THREE.PointLight(hex, 1.2, 8, 1.6);
    l.position.set(x, 5.6, z);
    scene.add(pillar, crystal, l);
    crystals.push(crystal);
    crystalLights.push(l);
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 3.3), new THREE.MeshStandardMaterial({ map: bannerTexture(f, opts.artSeed), transparent: true, side: THREE.DoubleSide, roughness: 0.9 }));
    banner.position.set([-3.4, 3.4, -1.3, 1.3][i]!, 3.9, -8.6);
    scene.add(banner);
  });
  const arch = new THREE.Mesh(new THREE.TorusGeometry(5.2, 0.32, 8, 24, Math.PI), new THREE.MeshStandardMaterial({ color: 0x241f2a, roughness: 0.9 }));
  arch.position.set(0, 0, -9.2);
  scene.add(arch);

  // Particules
  const N = 300;
  const prng = makeRng(hashString(`motes|${opts.artSeed}`));
  const pos = new Float32Array(N * 3);
  const speed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (prng() - 0.5) * 18;
    pos[i * 3 + 1] = prng() * 7;
    pos[i * 3 + 2] = -2 - prng() * 9;
    speed[i] = 0.1 + prng() * 0.3;
  }
  const motesGeo = new THREE.BufferGeometry();
  motesGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(motesGeo, new THREE.PointsMaterial({ color: 0xffd9a0, size: 0.05, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false })));

  // Rival
  const backTex = new THREE.CanvasTexture(cardBackCanvas(opts.artSeed));
  backTex.colorSpace = THREE.SRGBColorSpace;
  const rival: RivalRig = createRival(opts.personality, opts.artSeed, backTex);
  scene.add(rival.group);
  rim.color.setHex(FAMILY_PALETTE[opts.personality.family].hex);

  // --- FX transitoires ----------------------------------------------------
  const transients: Transient[] = [];
  let clock = 0;
  let shake = 0;
  const still = () => reduced || opts.freeze;

  function addTransient(obj: THREE.Object3D, dur: number, update: (k: number) => void): void {
    scene.add(obj);
    transients.push({ obj, t0: clock, dur, update });
    if (still()) {
      update(0.35);
      requestRender();
      window.setTimeout(() => { scene.remove(obj); disposeObj(obj); requestRender(); }, 700);
      transients.pop();
    }
  }

  function ring(color: number, z: number, maxScale: number, dur: number, y = TABLE_TOP + 0.03): void {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.55, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(0, y, z);
    addTransient(m, dur, (k) => {
      m.scale.setScalar(1 + k * maxScale);
      (m.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - k);
    });
  }

  function burst(color: number, origin: THREE.Vector3, count: number): void {
    const g = new THREE.BufferGeometry();
    const p = new Float32Array(count * 3);
    const v: number[] = [];
    const r = makeRng(hashString(`burst|${clock.toFixed(2)}|${origin.z}`));
    for (let i = 0; i < count; i++) {
      p[i * 3] = origin.x; p[i * 3 + 1] = origin.y; p[i * 3 + 2] = origin.z;
      const a = r() * Math.PI * 2;
      const s = 1 + r() * 3;
      v.push(Math.cos(a) * s, 0.5 + r() * 3, Math.sin(a) * s * 0.4 + 0.6);
    }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ color, size: 0.09, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false }));
    addTransient(pts, 1.0, (k) => {
      const arr = g.attributes.position!.array as Float32Array;
      for (let i = 0; i < count; i++) {
        arr[i * 3] = origin.x + v[i * 3]! * k;
        arr[i * 3 + 1] = origin.y + v[i * 3 + 1]! * k - 3 * k * k;
        arr[i * 3 + 2] = origin.z + v[i * 3 + 2]! * k;
      }
      g.attributes.position!.needsUpdate = true;
      (pts.material as THREE.PointsMaterial).opacity = 1 - k;
    });
  }

  function dome(color: number, z: number): void {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1.6, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.position.set(0, TABLE_TOP, z);
    addTransient(m, 1.2, (k) => {
      m.scale.setScalar(0.6 + 0.4 * Math.min(1, k * 3));
      (m.material as THREE.MeshBasicMaterial).opacity = 0.55 * (1 - k);
    });
  }

  const zOf = (side: 'me' | 'opp') => (side === 'me' ? ME_Z : OPP_Z);
  const chestOf = (side: 'me' | 'opp') => (side === 'me' ? new THREE.Vector3(0, TABLE_TOP + 0.4, 2.2) : new THREE.Vector3(0, 2.1, RIVAL_Z + 0.4));
  let meHex = 0xffffff;
  let oppHex = FAMILY_PALETTE[opts.personality.family].hex;

  // --- Caméra : cadrage A (bande du rival) / B (table), mélange interpolé ---------------
  const tmpPos = new THREE.Vector3();
  const tmpLook = new THREE.Vector3();
  let W = 1;
  let H = 1;

  /**
   * Projection de la vue A : le point visé tombe au centre de la bande `stage` (px CSS), et la
   * hauteur monde `worldH` (visage + buste + bord de table) remplit la hauteur de cette bande.
   * Implémenté par `setViewOffset` sur un frustum virtuel élargi (aucune déformation).
   */
  function frameA(): { fov: number; Fw: number; F: number; offX: number; offY: number } {
    const band = stage ?? { x: 0, y: H * 0.06, w: W, h: H * 0.42 };
    const ay = Math.min(0.9, Math.max(0.1, (band.y + band.h / 2) / H));
    const ax = Math.min(0.9, Math.max(0.1, (band.x + band.w / 2) / W));
    const dist = VIEW_A.pos.distanceTo(VIEW_A.look);
    const Hw = (VIEW_A.worldH * H) / Math.max(80, band.h);
    const F = ay < 0.5 ? 2 * (1 - ay) * H : 2 * ay * H;
    const offY = ay < 0.5 ? (1 - 2 * ay) * H : 0;
    const Fw = ax < 0.5 ? 2 * (1 - ax) * W : 2 * ax * W;
    const offX = ax < 0.5 ? (1 - 2 * ax) * W : 0;
    const fov = (2 * Math.atan((Hw * F) / H / (2 * dist)) * 180) / Math.PI;
    return { fov, Fw, F, offX, offY };
  }

  function placeCamera(t: number): void {
    const b = ease(Math.min(1, Math.max(0, blend)));
    tmpPos.lerpVectors(VIEW_A.pos, VIEW_B.pos, b);
    tmpLook.lerpVectors(VIEW_A.look, VIEW_B.look, b);
    const drift = still() ? 0 : 1;
    tmpPos.x += Math.sin(t * 0.13) * 0.12 * drift;
    tmpPos.y += Math.sin(t * 0.21) * 0.04 * drift;
    if (shake > 0) {
      tmpPos.x += Math.sin(t * 90) * shake * 0.06;
      tmpPos.y += Math.cos(t * 77) * shake * 0.04;
    }
    camera.position.copy(tmpPos);
    camera.lookAt(tmpLook);
    const A = frameA();
    // Vue B : centrée horizontalement sur le plateau DOM (le journal latéral décentre l’écran).
    const bx = boardRect ? Math.min(0.9, Math.max(0.1, (boardRect.x + boardRect.w / 2) / W)) : 0.5;
    const BFw = bx < 0.5 ? 2 * (1 - bx) * W : 2 * bx * W;
    const BoffX = bx < 0.5 ? (1 - 2 * bx) * W : 0;
    const fov = A.fov + (VIEW_B.fov - A.fov) * b;
    const F = A.F + (H - A.F) * b;
    const Fw = A.Fw + (BFw - A.Fw) * b;
    camera.fov = Math.min(110, Math.max(10, fov));
    camera.aspect = Fw / F;
    camera.setViewOffset(Fw, F, A.offX + (BoffX - A.offX) * b, A.offY * (1 - b), W, H);
    camera.updateProjectionMatrix();
  }

  function resize(): void {
    W = container.clientWidth || window.innerWidth;
    H = container.clientHeight || window.innerHeight;
    renderer.setSize(W, H, false);
  }

  // --- Boucle -------------------------------------------------------------
  let raf = 0;
  let last = performance.now();
  let fps = 0;
  let frameMs = 0;
  let frames = 0;
  let acc = 0;
  let portraitShown = false;

  function update(dt: number): void {
    clock += dt;
    shake = Math.max(0, shake - dt * 2.5);
    if (blendT < 1) {
      blendT = still() ? 1 : Math.min(1, blendT + dt / 0.85);
      const target = view === 'B' ? 1 : 0;
      blend = blendFrom + (target - blendFrom) * blendT;
    }
    const arr = motesGeo.attributes.position!.array as Float32Array;
    for (let i = 0; i < N; i++) {
      arr[i * 3 + 1]! += speed[i]! * dt;
      if (arr[i * 3 + 1]! > 7) arr[i * 3 + 1] = 0;
    }
    motesGeo.attributes.position!.needsUpdate = true;
    crystals.forEach((c, i) => {
      c.rotation.y = clock * (0.4 + i * 0.07);
      crystalLights[i]!.intensity = 1.1 + Math.sin(clock * 3.1 + i * 1.7) * 0.12;
    });
    center.intensity = Math.max(0, center.intensity - dt * 6);
    rival.update(dt, clock, still());
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
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, W, H);
    renderer.clear();
    renderer.render(scene, camera);
    // Portrait vivant : affiché dès que la vue s’éloigne de A (le visage sort du cadre principal).
    portraitShown = !!portrait && blend > 0.5;
    if (portraitShown && portrait) {
      const r = portrait;
      portraitCam.aspect = r.w / r.h;
      portraitCam.updateProjectionMatrix();
      renderer.setScissorTest(true);
      renderer.setScissor(r.x, H - r.y - r.h, r.w, r.h);
      renderer.setViewport(r.x, H - r.y - r.h, r.w, r.h);
      renderer.clear();
      renderer.render(scene, portraitCam);
      renderer.setScissorTest(false);
      renderer.setViewport(0, 0, W, H);
    }
  }

  /**
   * Rendu à la demande (mouvement réduit / gel) : les demandes d’une même image sont FUSIONNÉES
   * en un seul rendu. Évite les rafales de rendus synchrones (fil principal bloqué en rendu logiciel).
   */
  let renderQueued = false;
  function requestRender(): void {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => {
      renderQueued = false;
      if (still()) renderOnce();
    });
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
    acc += realDt;
    if (acc >= 1) {
      fps = frames / acc;
      frames = 0;
      acc = 0;
    }
  }

  function start(): void {
    cancelAnimationFrame(raf);
    if (still()) {
      clock = clock || 1.234;
      update(0);
      renderOnce();
      return;
    }
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }

  const onResize = () => { resize(); if (still()) requestRender(); };
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

  const sameRect = (a: Rect | null, b: Rect | null) => (!a && !b) || (!!a && !!b && a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h);

  return {
    fx(fx: ArenaFx) {
      switch (fx.type) {
        case 'reveal':
          center.intensity = 5;
          ring(0xffe0a8, -0.15, 3, 0.8);
          break;
        case 'clash': {
          const color = fx.family ? FAMILY_PALETTE[fx.family].hex : 0xffe0a8;
          center.color.setHex(color);
          center.intensity = 9;
          ring(color, -0.15, 6, 1.0);
          burst(color, new THREE.Vector3(0, TABLE_TOP + 0.2, -0.15), 70);
          shake = still() ? 0 : 0.5;
          break;
        }
        case 'damage':
          burst(0xff4a3a, chestOf(fx.side), Math.min(140, 30 + fx.amount * 2));
          ring(0xff4a3a, zOf(fx.side), 2.5, 0.7);
          shake = still() ? 0 : Math.min(1, 0.25 + fx.amount / 60);
          break;
        case 'guard':
          dome(fx.side === 'me' ? meHex : oppHex, zOf(fx.side));
          break;
        case 'interfere':
          ring(0xb48cff, zOf(fx.side), 2, 0.6);
          break;
        case 'signature':
          [0xff8fa3, 0xffd36b, 0x8fdc6a, 0x8fb8ff].forEach((c, i) => ring(c, zOf(fx.side), 2 + i * 0.6, 1.1 + i * 0.12));
          break;
        case 'overtime':
          ring(0xffffff, -0.15, 7, 1.4);
          ring(0xff4a3a, -0.15, 5, 1.2);
          break;
        case 'victory':
          burst(0xffe08a, chestOf(fx.side), 160);
          ring(0xffe08a, zOf(fx.side), 5, 1.6);
          break;
      }
      if (still()) requestRender();
    },
    setView(v: ViewMode) {
      if (v === view) return;
      view = v;
      blendFrom = blend;
      blendT = 0;
      if (still()) { update(0); requestRender(); }
    },
    setStage(r: Rect | null) {
      if (sameRect(r, stage)) return;
      stage = r;
      if (still()) requestRender();
    },
    setBoard(r: Rect | null) {
      if (sameRect(r, boardRect)) return;
      boardRect = r;
      if (still()) requestRender();
    },
    setPortrait(r: Rect | null) {
      if (sameRect(r, portrait)) return;
      portrait = r;
      if (still()) requestRender();
    },
    expression(e: Expression) {
      rival.setExpression(e);
      if (still()) { rival.update(0, clock, true); requestRender(); }
    },
    setRivalHand(n: number) {
      rival.setHandCount(n);
      if (still()) requestRender();
    },
    setFamilies(me: Family, opp: Family) {
      meHex = FAMILY_PALETTE[me].hex;
      oppHex = FAMILY_PALETTE[opp].hex;
    },
    setReducedMotion(v: boolean) {
      reduced = v;
      start();
    },
    stats(): ArenaStats {
      const info = renderer.info;
      return {
        fps: Math.round(fps * 10) / 10, frameMs: Math.round(frameMs * 100) / 100, drawCalls: info.render.calls, triangles: info.render.triangles,
        textures: info.memory.textures, geometries: info.memory.geometries, view, blend: Math.round(blend * 100) / 100, portrait: portraitShown, rival: rival.current(),
      };
    },
    dispose() {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVis);
      rival.dispose();
      scene.traverse((o) => disposeObj(o));
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
