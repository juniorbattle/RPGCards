/**
 * Arène de duel Three.js — M03 « salle aux bougies » (preview validée), 100 % code.
 *
 * - Salle HD-2D en couches : fond peint (arches, ciel nocturne étoilé, pierre chaude), piliers,
 *   piédestaux, balustrade, bannières des quatre familles derrière le rival, plantes, bougies
 *   vacillantes (corps instanciés + flammes/halos en points animés par shader, 2 draw calls).
 * - Grande table sombre vernie à incrustations dorées (cercle de Clash) ; le rival se tient derrière.
 * - Caméra ANCRÉE sur la mise en page DOM : la tête du rival et le bord lointain de la table tombent
 *   aux hauteurs d’écran fournies par `setLayout` (vue A frontale / vue B inclinée), sur toute taille
 *   d’écran. La vue B garde le visage du rival visible (plus de portrait incrusté).
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
import { CHEST_WORLD, createRival, HEAD_WORLD, RIVAL_Z, type RivalRig } from './rival';

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
  /** Mesure de coût (QA, `?qa=1&ablate=…` uniquement) : éléments retirés du rendu — `candles`
   *  (corps, flammes, halos, lumières), `banners` (bannières, tringles), `dust` (poussières). Vide en jeu. */
  ablate?: readonly string[];
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

/** Hauteurs d’écran (fractions de la hauteur) où tombent la tête du rival et le bord lointain de la table. */
export interface ViewAnchors { head: number; edge: number }
export interface ArenaLayout { A: ViewAnchors; B: ViewAnchors }

export interface ArenaHandle {
  fx(fx: ArenaFx): void;
  setView(v: ViewMode): void;
  /** Ancrage caméra ↔ mise en page DOM (lu depuis les variables CSS par main.ts). */
  setLayout(l: ArenaLayout): void;
  expression(e: Expression): void;
  setRivalHand(n: number): void;
  setFamilies(me: Family, opp: Family): void;
  setReducedMotion(v: boolean): void;
  /** M04 : change le rival assis à la table (même scène, même contexte WebGL, mêmes réglages). */
  setRival(p: RivalPersonality): void;
  /** M04 : fige la scène (une image, aucune boucle) pendant les écrans de menu ; reprend ensuite. */
  setPaused(v: boolean): void;
  stats(): ArenaStats;
  dispose(): void;
}

const TABLE_TOP = 1.05;
const TABLE_FAR_Z = -2.35;
const TABLE_NEAR_Z = 6.2;
const TABLE_W = 22;
const EDGE_WORLD = new THREE.Vector3(0, TABLE_TOP, TABLE_FAR_Z);
const CLASH_Z = 0.1;
const ME_Z = 1.9;
const VIEW_A = { pos: new THREE.Vector3(0, 3.15, 8.6), look: new THREE.Vector3(0, 2.45, RIVAL_Z) };
const VIEW_B = { pos: new THREE.Vector3(0, 7.9, 7.6), look: new THREE.Vector3(0, 1.0, -0.6) };
const DEFAULT_LAYOUT: ArenaLayout = { A: { head: 0.205, edge: 0.455 }, B: { head: 0.148, edge: 0.305 } };

type Ctx2 = CanvasRenderingContext2D;

function canvas(w: number, h: number): { c: HTMLCanvasElement; ctx: Ctx2 } {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return { c, ctx: c.getContext('2d')! };
}

function texture(c: HTMLCanvasElement, aniso = 4): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  return t;
}

/** Fond peint : mur de pierre chaude, grandes arches ouvertes sur un ciel nocturne étoilé. */
function backdropTexture(seed: number): THREE.CanvasTexture {
  const W = 2048;
  const H = 1024;
  const { c, ctx } = canvas(W, H);
  const rng = makeRng(hashString(`backdrop|${seed}`));
  // Ciel (peint partout, le mur le recouvre hors des arches)
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#050a1e');
  sky.addColorStop(0.55, '#10204c');
  sky.addColorStop(1, '#22306a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 900; i++) {
    const x = rng() * W;
    const y = rng() * H * 0.85;
    const r = rng() < 0.94 ? 0.6 + rng() * 1.1 : 1.6 + rng() * 1.6;
    ctx.fillStyle = `rgba(255,${235 + Math.floor(rng() * 20)},${210 + Math.floor(rng() * 45)},${0.35 + rng() * 0.65})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const moon = ctx.createRadialGradient(W * 0.83, H * 0.2, 4, W * 0.83, H * 0.2, 160);
  moon.addColorStop(0, 'rgba(220,230,255,0.55)');
  moon.addColorStop(1, 'rgba(120,150,255,0)');
  ctx.fillStyle = moon;
  ctx.fillRect(0, 0, W, H);
  // Mur percé d’arches : on peint le mur dans un calque puis on évide les arches.
  const wall = canvas(W, H);
  const wg = wall.ctx.createLinearGradient(0, 0, 0, H);
  wg.addColorStop(0, '#2a1c15');
  wg.addColorStop(0.6, '#3a2617');
  wg.addColorStop(1, '#1c130e');
  wall.ctx.fillStyle = wg;
  wall.ctx.fillRect(0, 0, W, H);
  // appareillage de pierre
  wall.ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  wall.ctx.lineWidth = 2;
  for (let y = 0; y < H; y += 46) {
    const off = (y / 46) % 2 ? 0 : 60;
    for (let x = -off; x < W; x += 120) {
      wall.ctx.strokeRect(x + rng() * 3, y, 120, 46);
    }
  }
  wall.ctx.fillStyle = 'rgba(255,170,90,0.04)';
  for (let i = 0; i < 160; i++) wall.ctx.fillRect(rng() * W, rng() * H, 40 + rng() * 80, 10 + rng() * 20);
  const arches = [
    { x: 0.1, w: 0.12, top: 0.18, bottom: 0.84 },
    { x: 0.27, w: 0.13, top: 0.12, bottom: 0.84 },
    { x: 0.5, w: 0.2, top: 0.06, bottom: 0.84 },
    { x: 0.73, w: 0.13, top: 0.12, bottom: 0.84 },
    { x: 0.9, w: 0.12, top: 0.18, bottom: 0.84 },
  ];
  const archPath = (g: Ctx2, a: (typeof arches)[number], grow = 0) => {
    const cx = a.x * W;
    const hw = (a.w * W) / 2 + grow;
    const top = a.top * H - grow;
    const bot = a.bottom * H + grow;
    g.beginPath();
    g.moveTo(cx - hw, bot);
    g.lineTo(cx - hw, top + hw);
    g.arc(cx, top + hw, hw, Math.PI, 0);
    g.lineTo(cx + hw, bot);
    g.closePath();
  };
  // moulures
  for (const a of arches) {
    archPath(wall.ctx, a, 22);
    wall.ctx.fillStyle = '#3a271c';
    wall.ctx.fill();
    archPath(wall.ctx, a, 10);
    wall.ctx.strokeStyle = 'rgba(226,186,120,0.45)';
    wall.ctx.lineWidth = 3;
    wall.ctx.stroke();
  }
  wall.ctx.globalCompositeOperation = 'destination-out';
  for (const a of arches) { archPath(wall.ctx, a); wall.ctx.fill(); }
  wall.ctx.globalCompositeOperation = 'source-over';
  // meneaux des fenêtres latérales
  ctx.drawImage(wall.c, 0, 0);
  ctx.strokeStyle = 'rgba(30,20,16,0.9)';
  ctx.lineWidth = 7;
  for (const a of arches) {
    if (a.x === 0.5) continue;
    ctx.beginPath();
    ctx.moveTo(a.x * W, a.top * H + 20);
    ctx.lineTo(a.x * W, a.bottom * H);
    ctx.moveTo(a.x * W - (a.w * W) / 2, (a.top + 0.32) * H);
    ctx.lineTo(a.x * W + (a.w * W) / 2, (a.top + 0.32) * H);
    ctx.stroke();
  }
  // grande arche centrale : tenture sombre (derrière les bannières)
  const drape = ctx.createLinearGradient(0, 0, 0, H);
  drape.addColorStop(0, 'rgba(20,10,12,0.55)');
  drape.addColorStop(1, 'rgba(10,6,8,0.9)');
  archPath(ctx, arches[2]!);
  ctx.fillStyle = drape;
  ctx.fill();
  // halos chauds des bougies peints sur le mur
  for (const [x, y, r] of [[0.19, 0.62, 170], [0.81, 0.62, 170], [0.36, 0.7, 120], [0.64, 0.7, 120]] as const) {
    const g = ctx.createRadialGradient(x * W, y * H, 4, x * W, y * H, r);
    g.addColorStop(0, 'rgba(255,170,80,0.42)');
    g.addColorStop(1, 'rgba(255,140,60,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  // sol / pied du mur
  const foot = ctx.createLinearGradient(0, H * 0.8, 0, H);
  foot.addColorStop(0, 'rgba(14,9,8,0)');
  foot.addColorStop(1, 'rgba(14,9,8,1)');
  ctx.fillStyle = foot;
  ctx.fillRect(0, H * 0.8, W, H * 0.2);
  return texture(c, 2);
}

/** Bannière d’une famille : étoffe, liseré doré, grand emblème lumineux, pointe (M03.2 : plus courte,
 *  1:2, pour rester entière au-dessus du rival agrandi). */
function bannerTexture(family: Family, seed: number): THREE.CanvasTexture {
  const W = 256;
  const H = 512;
  const { c, ctx } = canvas(W, H);
  const p = FAMILY_PALETTE[family];
  const rng = makeRng(hashString(`banner|${family}|${seed}`));
  const base: Record<Family, [string, string]> = { Cendre: ['#8a1e12', '#3a0906'], Ronce: ['#1f5a2a', '#0b2410'], Astre: ['#16224f', '#070b22'], Voile: ['#244bb0', '#0c1a4e'] };
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, base[family][0]);
  g.addColorStop(1, base[family][1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // plis verticaux
  for (let i = 0; i < 7; i++) {
    const x = 18 + i * 36 + rng() * 8;
    const fold = ctx.createLinearGradient(x - 14, 0, x + 14, 0);
    fold.addColorStop(0, 'rgba(0,0,0,0)');
    fold.addColorStop(0.5, 'rgba(0,0,0,0.22)');
    fold.addColorStop(1, 'rgba(255,255,255,0.03)');
    ctx.fillStyle = fold;
    ctx.fillRect(x - 14, 0, 28, H);
  }
  // liseré doré
  ctx.strokeStyle = '#d9b26a';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(14, 0); ctx.lineTo(14, H - 100); ctx.lineTo(W / 2, H - 34); ctx.lineTo(W - 14, H - 100); ctx.lineTo(W - 14, 0);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,220,150,0.6)';
  ctx.beginPath();
  ctx.moveTo(26, 0); ctx.lineTo(26, H - 112); ctx.lineTo(W / 2, H - 52); ctx.lineTo(W - 26, H - 112); ctx.lineTo(W - 26, 0);
  ctx.stroke();
  // losange décoratif + emblème lumineux
  const ey = 170;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.moveTo(W / 2, ey - 112); ctx.lineTo(W / 2 + 86, ey); ctx.lineTo(W / 2, ey + 112); ctx.lineTo(W / 2 - 86, ey); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#d9b26a';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.shadowColor = p.glow;
  ctx.shadowBlur = 28;
  ctx.fillStyle = family === 'Astre' ? p.accent : family === 'Cendre' ? '#ffd9a0' : p.accent;
  drawEmblem(ctx, family, W / 2, ey, 60);
  ctx.shadowBlur = 0;
  // petits motifs
  for (let i = 0; i < 2; i++) {
    ctx.fillStyle = `${p.accent}${i % 2 ? '55' : '88'}`;
    drawEmblem(ctx, family, W / 2, 330 + i * 44, 10 + (i % 2) * 4);
  }
  // pointe
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.moveTo(0, H); ctx.lineTo(0, H - 98); ctx.lineTo(W / 2, H - 28); ctx.lineTo(W, H - 98); ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();
  return texture(c);
}

/** Plateau : bois sombre verni, incrustations dorées, cercle de Clash, ornements. */
function tableTexture(seed: number): THREE.CanvasTexture {
  const W = 2048;
  const H = 1024;
  const { c, ctx } = canvas(W, H);
  const rng = makeRng(hashString(`table|${seed}`));
  // M03.2 : bois verni plus clair et plus chaud (la preview montre une table lumineuse).
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#553420');
  g.addColorStop(0.5, '#452a19');
  g.addColorStop(1, '#341f12');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // veinage
  for (let i = 0; i < 240; i++) {
    const y = rng() * H;
    ctx.strokeStyle = `rgba(${rng() < 0.5 ? '90,60,40' : '0,0,0'},${0.05 + rng() * 0.12})`;
    ctx.lineWidth = 1 + rng() * 3;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= W; x += 128) ctx.lineTo(x, y + Math.sin(x * 0.004 + i) * 6 + (rng() - 0.5) * 3);
    ctx.stroke();
  }
  // reflets de vernis (bandes chaudes)
  for (const [y, a] of [[0.3, 0.1], [0.62, 0.08]] as const) {
    const sh = ctx.createLinearGradient(0, H * (y - 0.08), 0, H * (y + 0.08));
    sh.addColorStop(0, 'rgba(255,190,120,0)');
    sh.addColorStop(0.5, `rgba(255,190,120,${a})`);
    sh.addColorStop(1, 'rgba(255,190,120,0)');
    ctx.fillStyle = sh;
    ctx.fillRect(0, 0, W, H);
  }
  // M03.2 : flaque de lumière chaude peinte au centre du plateau (x 0, z 0,6), à la place d’une lampe.
  {
    const px = W / 2;
    const py = H * ((0.6 - TABLE_FAR_Z) / (TABLE_NEAR_Z - TABLE_FAR_Z));
    const rx = (W / TABLE_W) * 5.2;
    const ry = (H / (TABLE_NEAR_Z - TABLE_FAR_Z)) * 3.6;
    ctx.save();
    ctx.translate(px, py);
    ctx.scale(rx / ry, 1);
    const pool = ctx.createRadialGradient(0, 0, 0, 0, 0, ry);
    pool.addColorStop(0, 'rgba(255,196,128,0.22)');
    pool.addColorStop(0.55, 'rgba(255,180,110,0.1)');
    pool.addColorStop(1, 'rgba(255,170,100,0)');
    ctx.fillStyle = pool;
    ctx.fillRect(-ry, -ry, 2 * ry, 2 * ry);
    ctx.restore();
  }
  const gold = 'rgba(222,182,108,0.85)';
  const goldDim = 'rgba(222,182,108,0.45)';
  // liseré du bord lointain + bord proche
  ctx.strokeStyle = gold;
  ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(0, 14); ctx.lineTo(W, 14); ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, 30); ctx.lineTo(W, 30); ctx.stroke();
  // Cercle de Clash (centre du duel) : coordonnées table → texture (u = x / TABLE_W, v = z)
  const cx = W / 2;
  const cy = H * ((CLASH_Z - TABLE_FAR_Z) / (TABLE_NEAR_Z - TABLE_FAR_Z));
  const sx = W / TABLE_W; // px par unité en x
  const sy = H / (TABLE_NEAR_Z - TABLE_FAR_Z);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(sx, sy);
  ctx.lineWidth = 0.035;
  ctx.strokeStyle = gold;
  for (const r of [2.35, 2.15]) { ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke(); }
  ctx.strokeStyle = goldDim;
  ctx.lineWidth = 0.02;
  for (const r of [1.4, 0.75]) { ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke(); }
  // étoile à quatre branches centrale
  ctx.fillStyle = 'rgba(240,200,120,0.75)';
  ctx.beginPath();
  const k = 0.12;
  ctx.moveTo(0, -0.62); ctx.quadraticCurveTo(k, -k, 0.62, 0); ctx.quadraticCurveTo(k, k, 0, 0.62); ctx.quadraticCurveTo(-k, k, -0.62, 0); ctx.quadraticCurveTo(-k, -k, 0, -0.62);
  ctx.fill();
  // rayons + petites étoiles
  ctx.strokeStyle = goldDim;
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 + Math.PI / 8;
    ctx.beginPath(); ctx.moveTo(Math.cos(a) * 0.8, Math.sin(a) * 0.8); ctx.lineTo(Math.cos(a) * 2.1, Math.sin(a) * 2.1); ctx.stroke();
    ctx.save();
    ctx.translate(Math.cos(a) * 1.78, Math.sin(a) * 1.78);
    ctx.fillStyle = 'rgba(240,200,120,0.6)';
    ctx.beginPath();
    const q = 0.03;
    ctx.moveTo(0, -0.14); ctx.quadraticCurveTo(q, -q, 0.14, 0); ctx.quadraticCurveTo(q, q, 0, 0.14); ctx.quadraticCurveTo(-q, q, -0.14, 0); ctx.quadraticCurveTo(-q, -q, 0, -0.14);
    ctx.fill();
    ctx.restore();
  }
  // emblèmes des familles aux points cardinaux
  FAMILIES.forEach((f, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 2;
    ctx.fillStyle = `${FAMILY_PALETTE[f].accent}aa`;
    drawEmblem(ctx, f, Math.cos(a) * 2.25, Math.sin(a) * 2.25, 0.16);
  });
  ctx.restore();
  // losanges d’ornement (bords des zones des duellistes)
  ctx.fillStyle = 'rgba(240,200,120,0.7)';
  for (const z of [-1.6, 3.4]) {
    const y = H * ((z - TABLE_FAR_Z) / (TABLE_NEAR_Z - TABLE_FAR_Z));
    ctx.beginPath(); ctx.moveTo(cx, y - 14); ctx.lineTo(cx + 22, y); ctx.lineTo(cx, y + 14); ctx.lineTo(cx - 22, y); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = goldDim;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - 520, y); ctx.lineTo(cx - 40, y); ctx.moveTo(cx + 40, y); ctx.lineTo(cx + 520, y); ctx.stroke();
  }
  return texture(c, 8);
}

/** Flamme : goutte lumineuse (cœur blanc-jaune → orange → transparent), sur un sprite carré. */
function flameTexture(): THREE.CanvasTexture {
  const { c, ctx } = canvas(64, 128);
  const g = ctx.createRadialGradient(32, 88, 2, 32, 80, 40);
  g.addColorStop(0, 'rgba(255,255,235,1)');
  g.addColorStop(0.25, 'rgba(255,214,120,0.95)');
  g.addColorStop(0.6, 'rgba(255,130,40,0.55)');
  g.addColorStop(1, 'rgba(255,90,20,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(32, 10);
  ctx.bezierCurveTo(46, 52, 52, 78, 46, 98);
  ctx.quadraticCurveTo(32, 120, 18, 98);
  ctx.bezierCurveTo(12, 78, 18, 52, 32, 10);
  ctx.fill();
  const t = texture(c, 1);
  return t;
}

function haloTexture(): THREE.CanvasTexture {
  const { c, ctx } = canvas(128, 128);
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,190,110,0.85)');
  g.addColorStop(0.25, 'rgba(255,160,70,0.35)');
  g.addColorStop(1, 'rgba(255,120,40,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return texture(c, 1);
}

/** Feuillage (plante en pot) en silhouette éclairée, sur fond transparent. */
function plantTexture(seed: number): THREE.CanvasTexture {
  const { c, ctx } = canvas(256, 256);
  const rng = makeRng(hashString(`plant|${seed}`));
  ctx.fillStyle = '#2a1a12';
  ctx.beginPath(); ctx.moveTo(92, 256); ctx.lineTo(100, 196); ctx.lineTo(156, 196); ctx.lineTo(164, 256); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#4a3022';
  ctx.fillRect(94, 192, 68, 10);
  for (let i = 0; i < 46; i++) {
    const a = -Math.PI / 2 + (rng() - 0.5) * 2.6;
    const len = 50 + rng() * 80;
    const x0 = 128 + (rng() - 0.5) * 20;
    const y0 = 196;
    const x1 = x0 + Math.cos(a) * len;
    const y1 = y0 + Math.sin(a) * len;
    const shade = 30 + Math.floor(rng() * 50);
    ctx.fillStyle = `rgb(${shade * 0.5},${shade + 30},${shade * 0.6})`;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo((x0 + x1) / 2 + 14, (y0 + y1) / 2, x1, y1);
    ctx.quadraticCurveTo((x0 + x1) / 2 - 14, (y0 + y1) / 2, x0, y0);
    ctx.fill();
  }
  return texture(c, 1);
}

function floorTexture(seed: number): THREE.CanvasTexture {
  const { c, ctx } = canvas(512, 512);
  const rng = makeRng(hashString(`floor|${seed}`));
  ctx.fillStyle = '#120c0a';
  ctx.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 64) {
    for (let x = 0; x < 512; x += 64) {
      const l = 18 + Math.floor(rng() * 12);
      ctx.fillStyle = `rgb(${l + 8},${l + 3},${l})`;
      ctx.fillRect(x + 2, y + 2, 60, 60);
    }
  }
  const t = texture(c, 4);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(6, 6);
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

const POINT_VERT = `
attribute float size;
attribute float phase;
attribute vec3 tint;
uniform float uTime;
uniform float uScale;
uniform float uStill;
uniform float uFlicker;
varying float vAlpha;
varying vec3 vTint;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float f = uStill > 0.5 ? 1.0 : 1.0 - uFlicker + uFlicker * (0.55 + 0.45 * sin(uTime * 9.0 + phase) * sin(uTime * 5.3 + phase * 1.7));
  gl_PointSize = size * f * uScale / max(0.1, -mv.z);
  vAlpha = 0.75 + 0.25 * f;
  vTint = tint;
  gl_Position = projectionMatrix * mv;
}`;
const POINT_FRAG = `
uniform sampler2D map;
varying float vAlpha;
varying vec3 vTint;
void main() {
  vec4 t = texture2D(map, gl_PointCoord);
  gl_FragColor = vec4(t.rgb * vTint, t.a * vAlpha);
}`;

export function createArena(container: HTMLElement, opts: ArenaOptions): ArenaHandle | null {
  if (!webglAvailable()) return null;
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
  } catch {
    return null;
  }
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
  renderer.setPixelRatio(pixelRatio);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.className = 'arena-canvas';
  renderer.domElement.setAttribute('aria-hidden', 'true');
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0708);
  scene.fog = new THREE.Fog(0x0b0807, 18, 40);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);

  let reduced = opts.reducedMotion;
  let view: ViewMode = opts.view;
  let blend = view === 'B' ? 1 : 0; // 0 = A, 1 = B
  let blendFrom = blend;
  let blendT = 1;
  let layout: ArenaLayout = DEFAULT_LAYOUT;

  // --- Lumières : ambiance chaude de bougies, clé sur le visage du rival, contre-jour de famille.
  // M03.2 : visage et table plus éclairés SANS lumière supplémentaire (chaque lumière coûte à chaque
  // fragment) : clé visant la tête, auto-éclairage peint du rival (rival.ts), flaque chaude peinte
  // dans la texture de la table.
  scene.add(new THREE.HemisphereLight(0xffd4a4, 0x2a1a14, 1.0));
  const key = new THREE.DirectionalLight(0xffe2bc, 1.35);
  key.position.set(-2.5, 6, 9);
  key.target.position.copy(HEAD_WORLD);
  scene.add(key, key.target);
  const rim = new THREE.PointLight(0xffffff, 7, 7, 1.6);
  rim.position.set(0, 3.8, RIVAL_Z - 1.3);
  scene.add(rim);
  // Intensité de base par lumière (M03.2 : bougies de table moins fortes, sans reflet disproportionné) ;
  // le vacillement module autour de cette base.
  const candleLights: THREE.PointLight[] = [];
  const candleBase: number[] = [];
  for (const [x, y, z] of [[-3.6, TABLE_TOP + 0.7, -1.9], [3.6, TABLE_TOP + 0.7, -1.9], [-5.6, 2.4, -6.4], [5.6, 2.4, -6.4]] as const) {
    const base = z > -3 ? 2.8 : 3.4;
    const l = new THREE.PointLight(0xffa458, base, 8, 1.8);
    l.position.set(x, y, z);
    scene.add(l);
    candleLights.push(l);
    candleBase.push(base);
  }
  const center = new THREE.PointLight(0xffd9a0, 0, 9, 1.6);
  center.position.set(0, TABLE_TOP + 1.2, CLASH_Z);
  scene.add(center);

  // --- Fond peint, sol, architecture
  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(44, 22), new THREE.MeshBasicMaterial({ map: backdropTexture(opts.artSeed), fog: false }));
  backdrop.position.set(0, 7.2, -13);
  scene.add(backdrop);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), new THREE.MeshStandardMaterial({ map: floorTexture(opts.artSeed), roughness: 0.6, metalness: 0.05 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, -2);
  scene.add(floor);

  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x3a2a22, roughness: 0.85 });
  const darkStone = new THREE.MeshStandardMaterial({ color: 0x241914, roughness: 0.9 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xc89a52, roughness: 0.35, metalness: 0.8 });
  // piliers hauts (avec chapiteau) + piédestaux bas
  for (const s of [-1, 1]) {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.58, 9, 12), stoneMat);
    pillar.position.set(s * 7.4, 4.5, -8.2);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.35, 1.5), darkStone);
    cap.position.set(s * 7.4, 3.0, -8.2);
    scene.add(pillar, cap);
    for (const [x, z, hgt] of [[5.6, -6.8, 1.7], [9.2, -3.8, 1.4]] as const) {
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, hgt, 10), stoneMat);
      ped.position.set(s * x, hgt / 2, z);
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.12, 10), darkStone);
      top.position.set(s * x, hgt + 0.06, z);
      scene.add(ped, top);
    }
  }
  // balustrade derrière le rival
  const rail = new THREE.Mesh(new THREE.BoxGeometry(18, 0.18, 0.4), darkStone);
  rail.position.set(0, 2.05, -8.9);
  const railBase = new THREE.Mesh(new THREE.BoxGeometry(18, 1.9, 0.3), new THREE.MeshStandardMaterial({ color: 0x1c130f, roughness: 0.9 }));
  railBase.position.set(0, 1.0, -8.95);
  scene.add(rail, railBase);

  // bannières des quatre familles (ordre de la preview : Cendre, Ronce | rival | Astre, Voile)
  const bannerOrder: Family[] = ['Cendre', 'Ronce', 'Astre', 'Voile'];
  const bannerX = [-3.5, -1.85, 1.85, 3.5];
  const banners: THREE.Mesh[] = [];
  const rods: THREE.Mesh[] = [];
  bannerOrder.forEach((f, i) => {
    const mat = new THREE.MeshStandardMaterial({ map: bannerTexture(f, opts.artSeed), transparent: true, side: THREE.DoubleSide, roughness: 0.85, emissive: new THREE.Color(0xffffff), emissiveMap: null, emissiveIntensity: 0 });
    mat.emissiveMap = mat.map;
    mat.emissiveIntensity = 0.32;
    const b = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 1.9), mat);
    b.position.set(bannerX[i]!, 2.6, -7.2);
    scene.add(b);
    banners.push(b);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.2, 6), brass);
    rod.rotation.z = Math.PI / 2;
    rod.position.set(bannerX[i]!, 3.57, -7.18);
    scene.add(rod);
    rods.push(rod);
  });

  // plantes en pot (silhouettes éclairées)
  const plantTex = plantTexture(opts.artSeed);
  for (const [x, z, s] of [[-6.4, -6.2, 2.2], [6.6, -6.0, 2.4], [-8.6, -3.4, 1.9], [8.8, -3.2, 2.0]] as const) {
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(s, s), new THREE.MeshLambertMaterial({ map: plantTex, transparent: true, alphaTest: 0.08, side: THREE.DoubleSide }));
    pl.position.set(x, s / 2 + (z > -5 ? 1.5 : 0), z);
    scene.add(pl);
  }

  // --- Table de duel
  const tableTex = tableTexture(opts.artSeed);
  const tableDepth = TABLE_NEAR_Z - TABLE_FAR_Z;
  const topMat = new THREE.MeshStandardMaterial({ map: tableTex, roughness: 0.66, metalness: 0.05 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x2a1910, roughness: 0.55 });
  const table = new THREE.Mesh(new THREE.BoxGeometry(TABLE_W, 0.24, tableDepth), [woodMat, woodMat, topMat, woodMat, woodMat, woodMat]);
  table.position.set(0, TABLE_TOP - 0.12, (TABLE_FAR_Z + TABLE_NEAR_Z) / 2);
  scene.add(table);
  const edgeTrim = new THREE.Mesh(new THREE.BoxGeometry(TABLE_W, 0.06, 0.06), brass);
  edgeTrim.position.set(0, TABLE_TOP + 0.01, TABLE_FAR_Z + 0.02);
  scene.add(edgeTrim);

  // --- Bougies : corps instanciés + flammes/halos en points animés (2 draw calls)
  const candles: Array<{ x: number; y: number; z: number; h: number; r: number }> = [];
  const crng = makeRng(hashString(`candles|${opts.artSeed}`));
  const cluster = (x: number, baseY: number, z: number, n: number, hMax: number) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + crng();
      const d = n > 1 ? 0.16 + crng() * 0.08 : 0;
      candles.push({ x: x + Math.cos(a) * d, y: baseY, z: z + Math.sin(a) * d, h: hMax * (0.45 + 0.55 * (1 - i / n)), r: 0.06 + crng() * 0.03 });
    }
  };
  for (const s of [-1, 1]) {
    cluster(s * 3.7, TABLE_TOP, -1.75, 3, 0.55);
    cluster(s * 5.6, 1.76, -6.8, 3, 0.5);
    cluster(s * 9.2, 1.46, -3.8, 2, 0.45);
    cluster(s * 7.4, 3.18, -8.2, 2, 0.5);
    for (const x of [2.6, 4.6, 6.4]) cluster(s * x, 2.14, -8.85, 1, 0.3 + crng() * 0.15);
  }
  const bodyGeo = new THREE.CylinderGeometry(1, 1, 1, 10);
  const bodies = new THREE.InstancedMesh(bodyGeo, new THREE.MeshStandardMaterial({ color: 0xeee0c4, roughness: 0.6, emissive: 0xffb070, emissiveIntensity: 0.22 }), candles.length);
  const m4 = new THREE.Matrix4();
  candles.forEach((cd, i) => {
    m4.compose(new THREE.Vector3(cd.x, cd.y + cd.h / 2, cd.z), new THREE.Quaternion(), new THREE.Vector3(cd.r, cd.h, cd.r));
    bodies.setMatrixAt(i, m4);
  });
  scene.add(bodies);
  const candleFx: THREE.Points[] = [];
  const pointsOf = (sizeK: number, yOff: number, tex: THREE.Texture, flicker: number, tint: [number, number, number]) => {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(candles.length * 3);
    const size = new Float32Array(candles.length);
    const phase = new Float32Array(candles.length);
    const tints = new Float32Array(candles.length * 3);
    candles.forEach((cd, i) => {
      pos[i * 3] = cd.x;
      pos[i * 3 + 1] = cd.y + cd.h + yOff;
      pos[i * 3 + 2] = cd.z;
      size[i] = sizeK * (0.8 + cd.r * 3);
      phase[i] = crng() * 20;
      tints[i * 3] = tint[0]; tints[i * 3 + 1] = tint[1]; tints[i * 3 + 2] = tint[2];
    });
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(size, 1));
    geo.setAttribute('phase', new THREE.BufferAttribute(phase, 1));
    geo.setAttribute('tint', new THREE.BufferAttribute(tints, 3));
    const mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: tex }, uTime: { value: 0 }, uScale: { value: 300 }, uStill: { value: 0 }, uFlicker: { value: flicker } },
      vertexShader: POINT_VERT, fragmentShader: POINT_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    scene.add(pts);
    candleFx.push(pts);
    return mat;
  };
  const haloMat = pointsOf(0.62, 0.06, haloTexture(), 0.18, [1, 0.85, 0.7]);
  const flameMat = pointsOf(0.2, 0.06, flameTexture(), 0.35, [1, 1, 1]);

  // --- Poussières dorées
  const N = 140;
  const prng = makeRng(hashString(`motes|${opts.artSeed}`));
  const mpos = new Float32Array(N * 3);
  const speed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    mpos[i * 3] = (prng() - 0.5) * 18;
    mpos[i * 3 + 1] = prng() * 7;
    mpos[i * 3 + 2] = -1 - prng() * 9;
    speed[i] = 0.05 + prng() * 0.18;
  }
  const motesGeo = new THREE.BufferGeometry();
  motesGeo.setAttribute('position', new THREE.BufferAttribute(mpos, 3));
  const motes = new THREE.Points(motesGeo, new THREE.PointsMaterial({ color: 0xffcf8a, size: 0.04, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(motes);

  // Mesure de coût (QA uniquement) : retrait d’éléments du rendu, sans autre effet.
  const ablate = new Set(opts.ablate ?? []);
  const hide = (objs: THREE.Object3D[]) => objs.forEach((o) => { o.visible = false; });
  if (ablate.has('candles')) hide([bodies, ...candleFx, ...candleLights]);
  if (ablate.has('banners')) hide([...banners, ...rods]);
  if (ablate.has('dust')) hide([motes]);

  // --- Rival
  const backTex = new THREE.CanvasTexture(cardBackCanvas(opts.artSeed));
  backTex.colorSpace = THREE.SRGBColorSpace;
  let rival: RivalRig = createRival(opts.personality, opts.artSeed, backTex);
  let rivalId = opts.personality.id;
  scene.add(rival.group);
  rim.color.setHex(FAMILY_PALETTE[opts.personality.family].hex);

  // --- FX transitoires ----------------------------------------------------
  const transients: Transient[] = [];
  let clock = 0;
  let shake = 0;
  let paused = false;
  const still = () => reduced || opts.freeze || paused;

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

  const zOf = (side: 'me' | 'opp') => (side === 'me' ? ME_Z : TABLE_FAR_Z + 0.6);
  const chestOf = (side: 'me' | 'opp') => (side === 'me' ? new THREE.Vector3(0, TABLE_TOP + 0.4, 2.6) : CHEST_WORLD.clone());
  let meHex = 0xffffff;
  let oppHex = FAMILY_PALETTE[opts.personality.family].hex;

  // --- Caméra ancrée sur la mise en page --------------------------------------
  const tmpPos = new THREE.Vector3();
  const tmpLook = new THREE.Vector3();
  const fwd = new THREE.Vector3();
  const right = new THREE.Vector3();
  const upv = new THREE.Vector3();
  const d = new THREE.Vector3();
  let W = 1;
  let H = 1;

  /**
   * Cadrage : pour la position/visée courantes, choisit focale et décalage vertical
   * (`setViewOffset`) pour que la tête du rival tombe à `head`·H et le bord lointain de la table à
   * `edge`·H (pixels CSS depuis le haut). Échelle uniforme, centrage horizontal, aucune déformation.
   */
  function frame(anchors: ViewAnchors): void {
    fwd.subVectors(tmpLook, tmpPos).normalize();
    right.crossVectors(fwd, THREE.Object3D.DEFAULT_UP).normalize();
    upv.crossVectors(right, fwd).normalize();
    const tanOf = (p: THREE.Vector3) => {
      d.subVectors(p, tmpPos);
      return d.dot(upv) / Math.max(0.01, d.dot(fwd));
    };
    const th = tanOf(HEAD_WORLD);
    const te = tanOf(EDGE_WORLD);
    const yh = anchors.head * H;
    const ye = anchors.edge * H;
    const k = Math.max(1, (ye - yh) / Math.max(0.005, th - te)); // px par unité de tangente
    const cy = yh + k * th; // ordonnée écran de l’axe optique
    const F = 2 * Math.max(cy, H - cy, 1);
    camera.fov = (2 * Math.atan(F / (2 * k)) * 180) / Math.PI;
    camera.aspect = W / F;
    camera.setViewOffset(W, F, 0, F / 2 - cy, W, H);
    camera.updateProjectionMatrix();
  }

  function placeCamera(t: number): void {
    const b = ease(Math.min(1, Math.max(0, blend)));
    tmpPos.lerpVectors(VIEW_A.pos, VIEW_B.pos, b);
    tmpLook.lerpVectors(VIEW_A.look, VIEW_B.look, b);
    const drift = still() ? 0 : 1;
    tmpPos.x += Math.sin(t * 0.13) * 0.1 * drift;
    tmpPos.y += Math.sin(t * 0.21) * 0.03 * drift;
    if (shake > 0) {
      tmpPos.x += Math.sin(t * 90) * shake * 0.05;
      tmpPos.y += Math.cos(t * 77) * shake * 0.03;
    }
    camera.position.copy(tmpPos);
    camera.lookAt(tmpLook);
    frame({ head: layout.A.head + (layout.B.head - layout.A.head) * b, edge: layout.A.edge + (layout.B.edge - layout.A.edge) * b });
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
    for (const m of [flameMat, haloMat]) {
      m.uniforms.uTime!.value = clock;
      m.uniforms.uStill!.value = still() ? 1 : 0;
    }
    candleLights.forEach((l, i) => { const b = candleBase[i]!; l.intensity = still() ? b : b * (0.944 + Math.sin(clock * 7.3 + i * 2.1) * 0.07 + Math.sin(clock * 13.1 + i) * 0.04); });
    banners.forEach((b, i) => { b.rotation.y = still() ? 0 : Math.sin(clock * 0.6 + i * 1.3) * 0.035; });
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
    const scale = camera.projectionMatrix.elements[5]! * H * pixelRatio * 0.5;
    flameMat.uniforms.uScale!.value = scale;
    haloMat.uniforms.uScale!.value = scale;
    renderer.render(scene, camera);
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

  const sameLayout = (a: ArenaLayout, b: ArenaLayout) => a.A.head === b.A.head && a.A.edge === b.A.edge && a.B.head === b.B.head && a.B.edge === b.B.edge;

  return {
    fx(fx: ArenaFx) {
      switch (fx.type) {
        case 'reveal':
          center.intensity = 5;
          ring(0xffe0a8, CLASH_Z, 3, 0.8);
          break;
        case 'clash': {
          const color = fx.family ? FAMILY_PALETTE[fx.family].hex : 0xffe0a8;
          center.color.setHex(color);
          center.intensity = 9;
          ring(color, CLASH_Z, 6, 1.0);
          burst(color, new THREE.Vector3(0, TABLE_TOP + 0.2, CLASH_Z), 70);
          shake = still() ? 0 : 0.18;
          break;
        }
        case 'damage':
          burst(0xff4a3a, chestOf(fx.side), Math.min(140, 30 + fx.amount * 2));
          ring(0xff4a3a, zOf(fx.side), 2.5, 0.7);
          shake = still() ? 0 : Math.min(0.35, 0.1 + fx.amount / 120);
          break;
        case 'guard':
          // M03 : le bouclier est mis en scène par la scène du Clash (DOM) ; l’arène ne fait
          // qu’un anneau discret sur la table, du côté de la Garde victorieuse.
          ring(fx.side === 'me' ? meHex : oppHex, zOf(fx.side), 2.2, 0.8);
          break;
        case 'interfere':
          ring(0xb48cff, zOf(fx.side), 2, 0.6);
          break;
        case 'signature':
          [0xff8fa3, 0xffd36b, 0x8fdc6a, 0x8fb8ff].forEach((c, i) => ring(c, zOf(fx.side), 2 + i * 0.6, 1.1 + i * 0.12));
          break;
        case 'overtime':
          ring(0xffffff, CLASH_Z, 7, 1.4);
          ring(0xff4a3a, CLASH_Z, 5, 1.2);
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
    setLayout(l: ArenaLayout) {
      if (sameLayout(l, layout)) return;
      layout = l;
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
    setRival(p: RivalPersonality) {
      if (p.id === rivalId) return;
      scene.remove(rival.group);
      rival.dispose();
      rival = createRival(p, opts.artSeed, backTex);
      rivalId = p.id;
      scene.add(rival.group);
      rim.color.setHex(FAMILY_PALETTE[p.family].hex);
      oppHex = FAMILY_PALETTE[p.family].hex;
      rival.update(0, clock, true);
      if (still()) requestRender();
    },
    setPaused(v: boolean) {
      if (v === paused) return;
      paused = v;
      start();
    },
    stats(): ArenaStats {
      const info = renderer.info;
      return {
        fps: Math.round(fps * 10) / 10, frameMs: Math.round(frameMs * 100) / 100, drawCalls: info.render.calls, triangles: info.render.triangles,
        textures: info.memory.textures, geometries: info.memory.geometries, view, blend: Math.round(blend * 100) / 100, portrait: false, rival: rival.current(),
      };
    },
    dispose() {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVis);
      rival.dispose();
      scene.traverse((o) => {
        const mat = (o as THREE.Mesh).material as THREE.MeshBasicMaterial | THREE.MeshBasicMaterial[] | undefined;
        for (const m of Array.isArray(mat) ? mat : mat ? [mat] : []) m.map?.dispose();
      });
      scene.traverse((o) => disposeObj(o));
      backTex.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
