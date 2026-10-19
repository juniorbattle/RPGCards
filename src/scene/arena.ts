/**
 * Arène de duel Three.js — M03 « salle aux bougies » (preview validée), 100 % code.
 *
 * - Décor du LIEU courant (M08 C2, ADR 022 ; `src/scene/venues/`) : la salle de jeu de cartes historique (fond
 *   peint, piliers, bannières, bougies) ou un autre lieu, réglant le même gréement de lumières. Le lieu change hors
 *   duel (`setVenue`) ; caméra, table, rival, FX et post-traitement restent ceux de l’arène.
 * - Grande table sombre vernie à incrustations dorées (cercle de Clash) ; le rival se tient derrière.
 * - Caméra ANCRÉE sur la mise en page DOM : la tête du rival et le bord lointain de la table tombent
 *   aux hauteurs d’écran fournies par `setLayout` (vue A frontale / vue B inclinée), sur toute taille
 *   d’écran. La vue B garde le visage du rival visible (plus de portrait incrusté).
 * - Transitions A↔B interpolées, interruptibles, instantanées en mouvement réduit / gel.
 * - FX déclenchés par les événements du moteur ; expressions du rival fournies par l’ExpressionDirector.
 * Aucun asset externe ; ni le moteur ni l’IA ne dépendent de ce module.
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { FAMILIES, type Family } from '../game/catalog/cards';
import { hashString, makeRng } from '../game/engine/rng';
import { drawEmblem } from '../art/emblems';
import { FAMILY_PALETTE } from '../art/palette';
import { cardBackCanvas } from '../art/cardArt';
import type { ViewMode } from '../presentation/director';
import type { Expression, Gesture } from '../presentation/expression';
import type { Mood, RivalPersonality } from '../presentation/personalities';
import { DEFAULT_VENUE, VENUE_IDS, type VenueId } from '../presentation/venues';
import { PostFallback, type FallbackState, type PostLevel } from './postFallback';
import { CHEST_WORLD, createRival, HEAD_WORLD, RIVAL_Z, type RivalRig } from './rival';
import { STAGING, type Staging, type StagingMul } from './staging';
import { CLASH_Z, TABLE_FAR_Z, TABLE_NEAR_Z, TABLE_TOP, TABLE_W } from './world';
import { canvas, texture } from './venues/common';
import { venueDef, type VenueDef, type VenueSet } from './venues';

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

export { STAGING, type Staging } from './staging';

export interface ArenaOptions {
  artSeed: number;
  view: ViewMode;
  reducedMotion: boolean;
  freeze: boolean;
  personality: RivalPersonality;
  /** M08 C2 : lieu du décor à la création (défaut : la salle de jeu de cartes). */
  venue?: VenueId;
  /** Nombre de décors gardés montés (QA, `?qa=1&venueCache=1` : un seul lieu résident, pour mesure). Défaut : VENUE_CACHE. */
  venueCache?: number;
  /** Mesure de coût (QA, `?qa=1&ablate=…` uniquement) : éléments retirés du rendu — `candles`
   *  (corps, flammes, halos, lumières), `banners` (bannières, tringles), `dust` (poussières), `bloom`
   *  (halo lumineux du post-traitement), `post` (tout le post-traitement : rendu direct). Vide en jeu. */
  ablate?: readonly string[];
  /** Repli automatique du post-traitement (QA, `?qa=1&fallback=…` uniquement) : `off` le désactive (mesure du
   *  rendu complet) ; `nobloom` / `direct` imposent ce niveau pour toute la session. Absent en jeu : repli actif. */
  fallback?: 'off' | 'nobloom' | 'direct';
  /** RC 0.8 (QA, `?qa=1&compileAsync=1`, piste à mesurer sur GPU réel) : programmes de la scène compilés sans bloquer
   *  le fil principal (`compileAsync`, seulement si `KHR_parallel_shader_compile` est présent), première image après.
   *  Absent en jeu : compilation lancée puis première image tout de suite (comportement historique). */
  asyncCompile?: boolean;
}

export interface ArenaStats {
  /** Nombre d’images rendues depuis la création (compteur three.js) : QA « aucune image hors duel ». */
  frame: number;
  fps: number;
  frameMs: number;
  drawCalls: number;
  triangles: number;
  textures: number;
  geometries: number;
  /** Programmes GPU vivants (QA : un changement de niveau du post-traitement n’en compile aucun). */
  programs: number;
  view: ViewMode;
  blend: number;
  portrait: boolean;
  rival: { mood: Mood; gesture: Gesture | null; cause: string };
  /** Niveau du post-traitement et état du repli automatique (QA : crans franchis pendant le duel). */
  post: FallbackState;
  /** M08 C2 : lieu du décor, et nombre de changements de lieu depuis la création (QA : coût, mémoire). */
  venue: VenueId;
  venueSwitches: number;
  /** Durée (ms) du dernier changement de lieu : libération, peinture et montage du décor, préparation des programmes. */
  venueMs: number;
  /** Lieux montés (courant compris) et mémoire GPU estimée de leurs textures, en Mo (mipmaps comprises). */
  venuesMounted: VenueId[];
  venueMB: number;
  /** Cadrage (QA) : identique d’un lieu à l’autre. */
  framing: { projection: number[]; view: number[]; rival: number[] };
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
  /** M07 L4 : plan de feux de l’écran courant (`duel` pendant un duel). Scène figée : une seule image. */
  setStaging(s: Staging): void;
  /** M08 C2 : lieu du décor (hors duel seulement : écrans de menu, lancement d’un duel). Même scène, même contexte
   *  WebGL ; l’ancien décor reste monté hors de la scène (tous les lieux par défaut, le plus ancien est libéré
   *  au-delà de la capacité), un décor neuf est monté et ses programmes préparés. */
  setVenue(v: VenueId): void;
  /** M08 C2 : prépare aux temps morts le décor d’un lieu (peinture, textures au GPU, programmes), hors de la scène,
   *  si la capacité du cache le permet ; le changement de lieu suivant n’a plus qu’à l’ajouter à la scène. */
  prepareVenue(v: VenueId): Promise<boolean>;
  stats(): ArenaStats;
  dispose(): void;
}

/** Densité de rendu maximale de la scène 3D quand le post-traitement est actif (voir createArena). */
const RENDER_SCALE_POST = 1;
/**
 * Décors gardés montés (ADR 022, amendement « bar et arène ») : tous les lieux. Mesuré sur la Radeon 780M en faisant le
 * tour des quatre lieux : avec deux décors gardés, chaque changement remonte un décor (première image 106 ms en médiane,
 * jusqu’à 163 ms) ; avec les quatre, préparés aux temps morts, 1,8 ms (4,1 ms au pire), pour ≈ 66 Mo de textures au GPU
 * au lieu de ≈ 32 Mo. `?qa=1&venueCache=n` pour mesurer une autre capacité.
 */
const VENUE_CACHE = VENUE_IDS.length;
const EDGE_WORLD = new THREE.Vector3(0, TABLE_TOP, TABLE_FAR_Z);
const ME_Z = 1.9;
const VIEW_A = { pos: new THREE.Vector3(0, 3.15, 8.6), look: new THREE.Vector3(0, 2.45, RIVAL_Z) };
const VIEW_B = { pos: new THREE.Vector3(0, 7.9, 7.6), look: new THREE.Vector3(0, 1.0, -0.6) };
const DEFAULT_LAYOUT: ArenaLayout = { A: { head: 0.205, edge: 0.455 }, B: { head: 0.148, edge: 0.305 } };

/** Contre-jour du rival (M07 L3) : ovale de lumière diffuse, blanc (teinté par le matériau). */
function backlightTexture(): THREE.CanvasTexture {
  const { c, ctx } = canvas(256, 256);
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.3, 'rgba(255,255,255,0.5)');
  g.addColorStop(0.55, 'rgba(255,255,255,0.16)');
  g.addColorStop(0.75, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  return texture(c, 1);
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
  // M03.2 : flaque de lumière chaude peinte au centre du plateau (x 0, z CLASH_Z + 0,5), à la place d’une lampe.
  {
    const px = W / 2;
    const py = H * ((CLASH_Z + 0.5 - TABLE_FAR_Z) / (TABLE_NEAR_Z - TABLE_FAR_Z));
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
  // losanges d’ornement (bords des zones des duellistes) : au-delà des deux rangées de la vue A (M08, cadres de cartes)
  ctx.fillStyle = 'rgba(240,200,120,0.7)';
  for (const z of [-2.1, 4.4]) {
    const y = H * ((z - TABLE_FAR_Z) / (TABLE_NEAR_Z - TABLE_FAR_Z));
    ctx.beginPath(); ctx.moveTo(cx, y - 14); ctx.lineTo(cx + 22, y); ctx.lineTo(cx, y + 14); ctx.lineTo(cx - 22, y); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = goldDim;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - 520, y); ctx.lineTo(cx - 40, y); ctx.moveTo(cx + 40, y); ctx.lineTo(cx + 520, y); ctx.stroke();
  }
  // M07 L3 : la table comme une scène — la lumière tombe sur le cercle de Clash et les deux rangées ; les
  // bouts de la table et le bord proche s’enfoncent dans l’ombre (peint : aucun coût par image).
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(sx * 8.5, sy * 5.2);
  const falloff = ctx.createRadialGradient(0, 0, 0.45, 0, 0, 1);
  falloff.addColorStop(0, 'rgba(8,5,4,0)');
  falloff.addColorStop(0.6, 'rgba(8,5,4,0.28)');
  falloff.addColorStop(1, 'rgba(8,5,4,0.62)');
  ctx.fillStyle = falloff;
  ctx.fillRect(-3, -3, 6, 6);
  ctx.restore();
  return texture(c, 8);
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

/** Vacillement d’une lumière pratique autour de sa base : flamme nue (bougies de la salle, formule de M03),
 *  ou lanterne vitrée (plus lente et plus douce). */
function flickerOf(kind: 'candle' | 'lantern', clock: number, i: number): number {
  return kind === 'candle'
    ? 0.944 + Math.sin(clock * 7.3 + i * 2.1) * 0.07 + Math.sin(clock * 13.1 + i) * 0.04
    : 0.97 + Math.sin(clock * 3.1 + i * 1.7) * 0.03 + Math.sin(clock * 8.3 + i) * 0.015;
}

/**
 * Passe de finition (M07 L3), une seule passe plein écran sur l’image HDR linéaire : étalonnage (ombres
 * tirées vers le bleu froid, hautes lumières vers l’ambre, saturation légèrement relevée), vignettage ovale
 * centré un peu au-dessus du milieu (visage du rival, cercle de Clash : le centre reste intact), puis
 * tonemapping ACES et transfert sRGB (ce que ferait l’OutputPass de three.js, fusionné ici pour économiser
 * une passe). Réglages fixes : ACES et sortie sRGB, comme le renderer.
 */
function finishMaterial(exposure: number): THREE.RawShaderMaterial {
  return new THREE.RawShaderMaterial({
    name: 'LqvFinish',
    uniforms: { tDiffuse: { value: null }, uAspect: { value: 16 / 9 }, toneMappingExposure: { value: exposure } },
    defines: { ACES_FILMIC_TONE_MAPPING: '', SRGB_TRANSFER: '' },
    vertexShader: `
precision highp float;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
attribute vec3 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,
    fragmentShader: `
precision highp float;
uniform sampler2D tDiffuse;
uniform float uAspect;
#include <tonemapping_pars_fragment>
#include <colorspace_pars_fragment>
varying vec2 vUv;
void main() {
  vec4 t = texture2D(tDiffuse, vUv);
  vec3 c = t.rgb;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(c, c * vec3(0.9, 0.95, 1.16), (1.0 - smoothstep(0.0, 0.22, l)) * 0.55);
  c *= mix(vec3(1.0), vec3(1.06, 1.0, 0.92), smoothstep(0.25, 1.2, l));
  c = max(mix(vec3(l), c, 1.1), 0.0);
  vec2 p = (vUv - vec2(0.5, 0.56)) * vec2(uAspect, 1.0);
  float r = length(p) / length(vec2(uAspect * 0.5, 0.56));
  c *= 1.0 - smoothstep(0.42, 1.0, r) * 0.5;
  gl_FragColor = vec4(ACESFilmicToneMapping(c), t.a);
  gl_FragColor = sRGBTransferOETF(gl_FragColor);
}`,
  });
}

/**
 * FXAA compact, sans boucle (M07 L3) : luminance du pixel et de ses quatre diagonales, direction de l’arête,
 * puis deux ou quatre lectures le long de cette direction. Le FXAA de three.js (boucle de recherche avec
 * lectures de texture à gradient) fait émettre au compilateur Direct3D d’ANGLE des avertissements que la
 * console relaie ; celui-ci n’en produit pas. Sur l’image finale (sRGB).
 */
function fxaaMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    name: 'LqvFxaa',
    uniforms: { tDiffuse: { value: null }, uTexel: { value: new THREE.Vector2(1, 1) } },
    vertexShader: `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,
    fragmentShader: `
uniform sampler2D tDiffuse;
uniform vec2 uTexel;
varying vec2 vUv;
const vec3 LUMA = vec3(0.299, 0.587, 0.114);
void main() {
  vec4 m = texture2D(tDiffuse, vUv);
  float lM = dot(m.rgb, LUMA);
  float lNW = dot(texture2D(tDiffuse, vUv + vec2(-1.0, -1.0) * uTexel).rgb, LUMA);
  float lNE = dot(texture2D(tDiffuse, vUv + vec2(1.0, -1.0) * uTexel).rgb, LUMA);
  float lSW = dot(texture2D(tDiffuse, vUv + vec2(-1.0, 1.0) * uTexel).rgb, LUMA);
  float lSE = dot(texture2D(tDiffuse, vUv + vec2(1.0, 1.0) * uTexel).rgb, LUMA);
  float lMin = min(lM, min(min(lNW, lNE), min(lSW, lSE)));
  float lMax = max(lM, max(max(lNW, lNE), max(lSW, lSE)));
  vec2 dir = vec2(-((lNW + lNE) - (lSW + lSE)), (lNW + lSW) - (lNE + lSE));
  float reduce = max((lNW + lNE + lSW + lSE) * (0.25 * 0.125), 1.0 / 128.0);
  float rcpMin = 1.0 / (min(abs(dir.x), abs(dir.y)) + reduce);
  dir = clamp(dir * rcpMin, vec2(-8.0), vec2(8.0)) * uTexel;
  vec3 a = 0.5 * (texture2D(tDiffuse, vUv + dir * (1.0 / 3.0 - 0.5)).rgb + texture2D(tDiffuse, vUv + dir * (2.0 / 3.0 - 0.5)).rgb);
  vec3 b = a * 0.5 + 0.25 * (texture2D(tDiffuse, vUv - dir * 0.5).rgb + texture2D(tDiffuse, vUv + dir * 0.5).rgb);
  float lB = dot(b, LUMA);
  gl_FragColor = vec4((lB < lMin || lB > lMax) ? a : b, m.a);
}`,
  });
}

export function createArena(container: HTMLElement, opts: ArenaOptions): ArenaHandle | null {
  if (!webglAvailable()) return null;
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
  } catch {
    return null;
  }
  // M07 L3 : avec le post-traitement, la scène 3D est rendue à 1 pixel par pixel CSS (1,5 au plus sans) : sur
  // un écran 2560×1600 à 150 %, le coût GPU suit le nombre de pixels (Radeon 780M, temps GPU par image : 6,4 ms
  // à 1,5 ; 4,4 ms à 1,25 ; 2,9 ms à 1, contre 2,6 ms avant le lot ; journal passe 18). L’interface DOM reste à
  // la pleine définition de l’écran ; sur un écran à 100 %, rien ne change.
  const usePost = !(opts.ablate ?? []).includes('post');
  const pixelRatio = Math.min(window.devicePixelRatio || 1, usePost ? RENDER_SCALE_POST : 1.5);
  renderer.setPixelRatio(pixelRatio);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // Le post-traitement rend plusieurs passes par image : compteurs remis à zéro une fois par image (renderOnce).
  renderer.info.autoReset = false;
  renderer.domElement.className = 'arena-canvas';
  renderer.domElement.setAttribute('aria-hidden', 'true');
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  // M08 C2 : lieu du décor (ADR 022). Couleur de fond et brume viennent du lieu ; la brume reste linéaire (même
  // programme d’un lieu à l’autre). Salle : M07 L3, perspective atmosphérique — les plans lointains tirent vers un
  // bleu ardoise, le voile commence derrière le rival et le bord de la table, qui restent nets et chauds.
  let def: VenueDef = venueDef(opts.venue ?? DEFAULT_VENUE);
  scene.background = new THREE.Color(def.background);
  scene.fog = new THREE.Fog(def.fog.color, def.fog.near, def.fog.far);

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
  // M07 L3 — plan de feux de théâtre : la salle baisse (ambiance), deux projecteurs sans atténuation
  // (decay 0, comme l’ancienne lumière directionnelle) découpent le visage du rival et la table ; le reste
  // de la salle ne garde que les bougies et le contre-jour. Même nombre de lumières qu’avant, plus une.
  // M08 C2 — gréement FIXE commun à tous les lieux (ADR 022) : ambiance, projecteur du visage, projecteur de table,
  // contour du rival, quatre lumières pratiques (bougies, lanternes…), lumière du Clash, toujours dans cet ordre.
  // Le lieu en règle les couleurs et intensités (et la place des pratiques) ; position et cône des projecteurs
  // restent ceux-ci. Même nombre de lumières partout : aucun programme recompilé au changement de lieu.
  const house = new THREE.HemisphereLight(def.house.sky, def.house.ground, def.house.intensity);
  scene.add(house);
  const key = new THREE.SpotLight(def.key.color, def.key.intensity, 0, 0.27, 0.65, 0);
  key.position.set(-2.5, 6, 9);
  key.target.position.copy(HEAD_WORLD);
  scene.add(key, key.target);
  const stage = new THREE.SpotLight(def.stage.color, def.stage.intensity, 0, 0.5, 0.75, 0);
  stage.position.set(0, 9.5, 4.2);
  stage.target.position.set(0, TABLE_TOP, 0.4);
  scene.add(stage, stage.target);
  const rim = new THREE.PointLight(0xffffff, 7, 7, 1.6);
  rim.position.set(0, 3.8, RIVAL_Z - 1.3);
  scene.add(rim);
  // Lumières pratiques du lieu : intensité de base (salle : bougies de table moins fortes, sans reflet
  // disproportionné) ; le vacillement module autour de cette base.
  const practicals = def.practicals.map((p) => {
    const l = new THREE.PointLight(p.color, p.intensity, p.distance, p.decay);
    l.position.set(p.pos[0], p.pos[1], p.pos[2]);
    scene.add(l);
    return l;
  });
  const center = new THREE.PointLight(0xffd9a0, 0, 9, 1.6);
  center.position.set(0, TABLE_TOP + 1.2, CLASH_Z);
  scene.add(center);

  /** Réglages du lieu courant posés sur la scène (hors intensités, posées à chaque `update`). */
  const applyVenue = () => {
    (scene.background as THREE.Color).setHex(def.background);
    const fog = scene.fog as THREE.Fog;
    fog.color.setHex(def.fog.color);
    fog.near = def.fog.near;
    fog.far = def.fog.far;
    house.color.setHex(def.house.sky);
    house.groundColor.setHex(def.house.ground);
    key.color.setHex(def.key.color);
    stage.color.setHex(def.stage.color);
    def.practicals.forEach((p, i) => {
      const l = practicals[i]!;
      l.color.setHex(p.color);
      l.distance = p.distance;
      l.decay = p.decay;
      l.position.set(p.pos[0], p.pos[1], p.pos[2]);
    });
    if (post) {
      post.bloom.strength = def.bloom.strength;
      post.bloom.radius = def.bloom.radius;
      post.bloom.threshold = def.bloom.threshold;
    }
  };
  /** Plan de feux de l’écran (ADR 020), surchargé par le lieu s’il le déclare. */
  const stagingOf = (s: Staging): StagingMul => {
    const o = def.staging?.[s];
    return o ? { ...STAGING[s], ...o } : STAGING[s];
  };

  // Matériaux de la table créés AVANT le décor : three.js trie les objets opaques par identifiant de matériau ; le
  // liseré, puis le plateau, restent dessinés avant le décor du lieu, dans l’ordre historique (sinon quelques égalités
  // de profondeur au bord lointain de la table changent de gagnant : 6 × 3 pixels à 1920×1080, preuve de migration).
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xc89a52, roughness: 0.35, metalness: 0.8 });
  const topMat = new THREE.MeshStandardMaterial({ roughness: 0.66, metalness: 0.05 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x2a1910, roughness: 0.55 });

  // --- Décor du lieu (M08 C2) : géométrie, textures peintes, éléments animés.
  let venueId: VenueId = def.id;
  let venue: VenueSet = def.mount({ artSeed: opts.artSeed });
  // Décors montés (du plus ancien au plus récent) : un lieu monté reste peint, compilé et envoyé au GPU, hors de la
  // scène ; y revenir ne coûte qu’un ajout à la scène. Au-delà de la capacité, le plus ancien est libéré (ADR 022).
  const mounted = new Map<VenueId, VenueSet>([[venueId, venue]]);
  const venueCache = Math.max(1, opts.venueCache ?? VENUE_CACHE);
  const evictVenues = () => {
    for (const [id, set] of mounted) {
      if (mounted.size <= venueCache) break;
      if (id === venueId) continue;
      mounted.delete(id);
      set.dispose();
    }
  };
  let venueSwitches = 0;
  let venueMs = 0;
  /** Cible de 1 × 1 pixel où un décor préparé est dessiné une fois (tampons de géométrie envoyés au GPU). */
  let warmTarget: THREE.WebGLRenderTarget | null = null;
  /** QA : octets des textures des décors montés (largeur × hauteur × 4, × 4/3 avec mipmaps), chaque texture une fois. */
  const venueBytes = () => {
    const seen = new Set<THREE.Texture>();
    for (const set of mounted.values()) {
      set.group.traverse((o) => {
        const mat = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
        for (const m of Array.isArray(mat) ? mat : mat ? [mat] : []) {
          for (const v of Object.values(m)) if (v instanceof THREE.Texture) seen.add(v);
          const u = (m as THREE.ShaderMaterial).uniforms;
          if (u) for (const x of Object.values(u)) if (x?.value instanceof THREE.Texture) seen.add(x.value);
        }
      });
    }
    let n = 0;
    for (const t of seen) {
      const img = t.image as { width?: number; height?: number } | null;
      if (img?.width && img.height) n += img.width * img.height * 4 * (t.generateMipmaps ? 4 / 3 : 1);
    }
    return n;
  };
  /** QA : cadrage courant (projection et vue de la caméra, transformation du rival), arrondi au millionième. */
  const framing = () => {
    const r = (m: THREE.Matrix4) => m.elements.map((x) => Math.round(x * 1e6) / 1e6);
    return { projection: r(camera.projectionMatrix), view: r(camera.matrixWorldInverse), rival: r(rival.group.matrixWorld) };
  };
  scene.add(venue.group);

  // --- Table de duel (invariant de la composition : son bord lointain ancre la caméra)
  topMat.map = tableTexture(opts.artSeed);
  const tableDepth = TABLE_NEAR_Z - TABLE_FAR_Z;
  const table = new THREE.Mesh(new THREE.BoxGeometry(TABLE_W, 0.24, tableDepth), [woodMat, woodMat, topMat, woodMat, woodMat, woodMat]);
  table.position.set(0, TABLE_TOP - 0.12, (TABLE_FAR_Z + TABLE_NEAR_Z) / 2);
  scene.add(table);
  const edgeTrim = new THREE.Mesh(new THREE.BoxGeometry(TABLE_W, 0.06, 0.06), trimMat);
  edgeTrim.position.set(0, TABLE_TOP + 0.01, TABLE_FAR_Z + 0.02);
  scene.add(edgeTrim);

  // Mesure de coût (QA uniquement) : retrait d’éléments du décor, sans autre effet (`candles` retire aussi les
  // lumières pratiques du lieu).
  const ablate = new Set(opts.ablate ?? []);
  const applyAblation = (set: VenueSet) => {
    for (const [k, objs] of Object.entries(set.ablatable)) if (ablate.has(k)) objs?.forEach((o) => { o.visible = false; });
    if (ablate.has('candles')) practicals.forEach((l) => { l.visible = false; });
  };
  applyAblation(venue);

  // --- Rival
  const backTex = new THREE.CanvasTexture(cardBackCanvas(opts.artSeed));
  backTex.colorSpace = THREE.SRGBColorSpace;
  let rival: RivalRig = createRival(opts.personality, opts.artSeed, backTex);
  let rivalId = opts.personality.id;
  scene.add(rival.group);
  rim.color.setHex(FAMILY_PALETTE[opts.personality.family].hex);
  // M07 L3 — contre-jour : lumière diffuse derrière la silhouette du rival (couleur de sa famille mêlée de
  // blanc chaud), qui le détache du décor. Les plans 2,5D ne reçoivent pas de lumière par l’arrière : un
  // plan additif derrière le buste, caché en bas par la table, fait ce travail en un seul appel de dessin.
  const BACKLIGHT = 0.4;
  const backlight = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 4.4), new THREE.MeshBasicMaterial({ map: backlightTexture(), transparent: true, opacity: BACKLIGHT, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  backlight.position.set(0, 2.5, RIVAL_Z - 0.5);
  scene.add(backlight);
  const tintBacklight = (f: Family) => { (backlight.material as THREE.MeshBasicMaterial).color.setHex(FAMILY_PALETTE[f].hex).lerp(new THREE.Color(0xffe6c4), 0.45); };
  tintBacklight(opts.personality.family);

  // --- Post-traitement (M07 L3) : scène rendue dans une cible HDR, halo lumineux des sources (flammes,
  // emblèmes, contre-jour, effets), passe de finition (étalonnage, vignettage, ACES, sRGB), puis FXAA.
  // Coût GPU mesuré (Radeon 780M, 1280×720) : l’anticrénelage multi-échantillonné ×4 de la cible HDR coûtait
  // à lui seul ≈ 3,5 ms par image ; FXAA, en une passe, le remplace pour ≈ 0,2 ms (journal, passe 18).
  const post = !usePost ? null : (() => {
    const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType }));
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), def.bloom.strength, def.bloom.radius, def.bloom.threshold);
    // Halo calculé à demi-définition (sa première réduction tombe au quart) : flou par nature, il n’y perd rien
    // de visible et coûte environ quatre fois moins.
    const bloomSize = bloom.setSize.bind(bloom);
    bloom.setSize = (w: number, h: number) => bloomSize(Math.max(1, Math.round(w / 2)), Math.max(1, Math.round(h / 2)));
    composer.addPass(bloom);
    const grade = new ShaderPass(finishMaterial(renderer.toneMappingExposure));
    composer.addPass(grade);
    const fxaa = new ShaderPass(fxaaMaterial());
    fxaa.setSize = (w: number, h: number) => { (fxaa.uniforms.uTexel!.value as THREE.Vector2).set(1 / Math.max(1, w), 1 / Math.max(1, h)); };
    composer.addPass(fxaa);
    return { composer, grade, bloom };
  })();
  let frames3d = 0;

  /**
   * M08 C2 — programmes d’un objet préparés pour les DEUX sorties possibles : la cible HDR du post-traitement (sans
   * tonemapping, sortie linéaire : les variantes de chaque image en rendu complet) et l’écran (rendu direct du repli).
   * `renderer.compile` seul ne vise que l’écran : un décor préparé ainsi compilait encore ses variantes HDR à sa
   * première image (234 ms, 54 programmes au lieu de 46 ; journal, passe 31). Sans compilation parallèle
   * (`KHR_parallel_shader_compile` absent, par exemple en rendu logiciel), `compileAsync` avertit dans la console :
   * compilation synchrone, hors duel seulement.
   */
  const parallel = renderer.extensions.has('KHR_parallel_shader_compile');
  const compileFor = (obj: THREE.Object3D): Promise<unknown> => {
    const prev = renderer.getRenderTarget();
    const jobs: Promise<unknown>[] = [];
    const run = () => { if (parallel) jobs.push(renderer.compileAsync(obj, camera, scene)); else renderer.compile(obj, camera, scene); };
    if (post) {
      renderer.setRenderTarget(post.composer.readBuffer);
      run();
    }
    renderer.setRenderTarget(null);
    run();
    renderer.setRenderTarget(prev);
    return Promise.all(jobs);
  };

  // --- Repli automatique du post-traitement (amendement de l’ADR 019) : quand les images décrochent durablement
  // (règles dans postFallback.ts), le halo est coupé, puis tout le post-traitement (rendu direct, tonemapping du
  // renderer) ; jamais de remontée pendant un duel. La densité de rendu ne change pas : sur l’écran du poste
  // (Radeon 780M, 2560×1600 à 150 %, vue A), le rendu direct coûte 3,35 ms GPU par image à 1,5 (densité de
  // l’ablation `post`), plus que le post-traitement complet à 1 (2,82 ms), et 2,10 ms à 1 (amendement de l’ADR 019).
  // Les programmes du rendu direct sont compilés à la création (`renderer.compile` vise l’écran) et gardés par
  // chaque matériau : changer de niveau ne compile rien (44 programmes avant comme après, qa-fallback).
  const forced = opts.fallback === 'nobloom' || opts.fallback === 'direct' ? opts.fallback : null;
  const startLevel: PostLevel = !post ? 'direct' : forced ?? (ablate.has('bloom') ? 'nobloom' : 'full');
  const fallback = new PostFallback(startLevel, !!post && !forced && opts.fallback !== 'off');
  let level: PostLevel = startLevel;
  const applyLevel = (l: PostLevel) => {
    level = l;
    if (post) post.bloom.enabled = l === 'full';
  };
  applyLevel(startLevel);

  // --- FX transitoires ----------------------------------------------------
  const transients: Transient[] = [];
  let clock = 0;
  let shake = 0;
  let focus = 0; // 1 au début d’une révélation ou d’un Clash, décroît en 2,6 s (lumières de salle)
  let paused = false;
  let staging: Staging = 'duel';
  const still =() => reduced || opts.freeze || paused;

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

  // Matériaux des FX transitoires : une seule définition, partagée avec le témoin `fxKeep` ci-dessous.
  const ringMaterial = (color: number) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
  const burstMaterial = (color: number) => new THREE.PointsMaterial({ color, size: 0.09, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false });
  // Programmes des FX préparés dès la création de l’arène (menus) et CONSERVÉS par un témoin : sans lui,
  // le premier anneau compile son shader en plein duel, et la fin de chaque effet libère le programme,
  // relié de nouveau par le processus GPU à l’effet suivant (à-coups de 50 à 115 ms à la révélation et
  // au Clash, trace de la passe 12). Le témoin n’est dessiné qu’à la PREMIÈRE image, à opacité nulle
  // (mélange additif : aucun pixel changé) : le premier usage de ses programmes (lecture synchrone des
  // uniformes auprès du GPU) a lieu à la création, pas à la première révélation. Masqué ensuite.
  const fxKeep = new THREE.Group();
  const keepPts = new THREE.BufferGeometry();
  keepPts.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3), 3));
  fxKeep.add(new THREE.Mesh(new THREE.RingGeometry(0.4, 0.55, 8), ringMaterial(0xffffff)), new THREE.Points(keepPts, burstMaterial(0xffffff)));
  fxKeep.traverse((o) => {
    o.frustumCulled = false;
    const m = (o as THREE.Mesh).material as THREE.Material | undefined;
    if (m) m.opacity = 0;
  });
  scene.add(fxKeep);

  function ring(color: number, z: number, maxScale: number, dur: number, y = TABLE_TOP + 0.03): void {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.55, 48), ringMaterial(color));
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
    const pts = new THREE.Points(g, burstMaterial(color));
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
    if (post) {
      post.composer.setSize(W, H);
      post.grade.uniforms.uAspect!.value = W / Math.max(1, H);
    }
  }

  // --- Boucle -------------------------------------------------------------
  let raf = 0;
  let last = performance.now();
  let prevRaf = -1; // horodatage rAF de l’image précédente de la boucle (−1 : boucle (re)partie)
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
    // M07 L3 : pendant la révélation et le Clash, la salle baisse et le projecteur de table monte (« noir
    // salle »), puis tout revient en douceur. Jamais en mouvement réduit ni en rendu figé.
    focus = still() ? 0 : Math.max(0, focus - dt / 2.6);
    const dim = ease(Math.min(1, focus * 1.6));
    const st = stagingOf(staging);
    house.intensity = def.house.intensity * st.house * (1 - 0.4 * dim);
    stage.intensity = def.stage.intensity * st.stage * (1 + 0.3 * dim);
    key.intensity = def.key.intensity * st.key;
    (backlight.material as THREE.MeshBasicMaterial).opacity = BACKLIGHT * st.back;
    practicals.forEach((l, i) => {
      const p = def.practicals[i]!;
      const b = p.intensity * st.candle * (1 - 0.35 * dim);
      l.intensity = still() || p.flicker === 'none' ? b : b * flickerOf(p.flicker, clock, i);
    });
    venue.update(dt, clock, still());
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
    if (!compiled) return;
    placeCamera(clock);
    const scale = camera.projectionMatrix.elements[5]! * H * pixelRatio * 0.5;
    venue.prerender(scale);
    renderer.info.reset();
    if (post && level !== 'direct') post.composer.render();
    else renderer.render(scene, camera);
    frames3d++;
    fxKeep.visible = false; // témoin des FX : dessiné à la première image seulement (voir sa création)
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
    // Seuls les intervalles entre deux images de la boucle comptent (pas celui qui suit une reprise).
    if (prevRaf >= 0) {
      const next = fallback.frame(now - prevRaf);
      if (next) applyLevel(next);
    }
    prevRaf = now;
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
    if (!compiled) return;
    if (still()) {
      clock = clock || 1.234;
      update(0);
      renderOnce();
      return;
    }
    last = performance.now();
    prevRaf = -1;
    raf = requestAnimationFrame(loop);
  }

  const onResize = () => { resize(); if (still()) requestRender(); };
  const onVis = () => { if (document.hidden) cancelAnimationFrame(raf); else start(); };
  window.addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', onVis);
  resize();
  // Tous les programmes de la scène (objets hors champ de la vue A et témoin des FX compris) lancés
  // maintenant : la compilation est asynchrone côté GPU, les erreurs ne sont lues qu’au premier usage.
  let compiled = true;
  if (opts.asyncCompile && parallel) {
    compiled = false;
    void compileFor(scene).then(() => { compiled = true; start(); });
  } else renderer.compile(scene, camera);
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
          focus = 1;
          center.intensity = 5;
          ring(0xffe0a8, CLASH_Z, 3, 0.8);
          break;
        case 'clash': {
          focus = 1;
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
      tintBacklight(p.family);
      oppHex = FAMILY_PALETTE[p.family].hex;
      rival.update(0, clock, true);
      if (still()) requestRender();
    },
    setPaused(v: boolean) {
      if (v === paused) return;
      paused = v;
      // Effets transitoires en cours (anneaux, éclats) : achevés et libérés plutôt que figés dans la
      // scène des menus (ils n’avancent qu’avec la boucle de rendu).
      if (v) {
        for (const tr of transients.splice(0)) { scene.remove(tr.obj); disposeObj(tr.obj); }
        center.intensity = 0;
        focus = 0;
        shake = 0;
        // Menus : le duel suivant repart au niveau de départ, nominal remesuré (seul moment où le rendu remonte).
        fallback.reset();
        applyLevel(fallback.current);
      }
      start();
    },
    setVenue(v: VenueId) {
      const next = venueDef(v);
      if (next.id === venueId) return;
      const t0 = performance.now();
      scene.remove(venue.group);
      def = next;
      venueId = def.id;
      const cached = mounted.get(venueId);
      venue = cached ?? def.mount({ artSeed: opts.artSeed });
      mounted.delete(venueId);
      mounted.set(venueId, venue);
      evictVenues();
      scene.add(venue.group);
      venueSwitches++;
      applyVenue();
      applyAblation(venue);
      // Décor neuf : ses programmes lancés tout de suite (compilation parallèle côté GPU), avant sa première image.
      if (!cached) void compileFor(scene);
      venueMs = performance.now() - t0;
      if (still()) { update(0); requestRender(); }
    },
    prepareVenue(v: VenueId): Promise<boolean> {
      const d = venueDef(v);
      if (mounted.has(d.id) || mounted.size >= venueCache) return Promise.resolve(false);
      const set = d.mount({ artSeed: opts.artSeed });
      mounted.delete(d.id);
      mounted.set(d.id, set);
      applyAblation(set);
      set.group.updateMatrixWorld(true);
      // Textures envoyées au GPU et programmes compilés hors de la scène, avec ses lumières et sa brume (les lumières
      // pratiques sont les mêmes pour tous les lieux : mêmes programmes qu’une fois le décor en scène).
      set.group.traverse((o) => {
        const mat = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
        for (const m of Array.isArray(mat) ? mat : mat ? [mat] : []) {
          for (const x of Object.values(m)) if (x instanceof THREE.Texture) renderer.initTexture(x);
          const u = (m as THREE.ShaderMaterial).uniforms;
          if (u) for (const x of Object.values(u)) if (x?.value instanceof THREE.Texture) renderer.initTexture(x.value);
        }
      });
      return compileFor(set.group).then(() => {
        // Géométries envoyées au GPU : three.js n’en crée les tampons qu’au premier dessin, et la première image d’un lieu
        // préparé coûtait encore 10 à 12 ms au lieu de 3 à 5 (Radeon 780M ; `qa:rc` J voyait les géométries monter à la
        // première visite de chaque lieu, journal, passe 33). Une image de la scène, le décor posé le temps de ce rendu,
        // dans une cible de 1 × 1 pixel : une cible prend les variantes de programme de la cible HDR, déjà compilées par
        // `compileFor`, rien ne recompile. Sans post-traitement (ablation QA `post`), les tampons partent à la première
        // image. Tout le décor est dessiné, hors du champ de la caméra compris (vue B, autres plans de feux). Rien si le
        // lieu est devenu le lieu courant (déjà dessiné) ou a été libéré pendant la compilation.
        if (post && mounted.get(d.id) === set && set.group.parent === null) {
          warmTarget ??= new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
          const culled: THREE.Object3D[] = [];
          set.group.traverse((o) => { if (o.frustumCulled) { o.frustumCulled = false; culled.push(o); } });
          const prev = renderer.getRenderTarget();
          scene.add(set.group);
          renderer.setRenderTarget(warmTarget);
          renderer.render(scene, camera);
          renderer.setRenderTarget(prev);
          scene.remove(set.group);
          for (const o of culled) o.frustumCulled = true;
        }
        return true;
      });
    },
    setStaging(s: Staging) {
      if (s === staging) return;
      staging = s;
      // Scène figée : lumières posées par `update` (pas de temps), puis une seule image.
      if (still()) { update(0); requestRender(); }
    },
    stats(): ArenaStats {
      const info = renderer.info;
      return {
        frame: frames3d,
        fps: Math.round(fps * 10) / 10, frameMs: Math.round(frameMs * 100) / 100, drawCalls: info.render.calls, triangles: info.render.triangles,
        textures: info.memory.textures, geometries: info.memory.geometries, programs: info.programs?.length ?? 0, view, blend: Math.round(blend * 100) / 100, portrait: false, rival: rival.current(),
        post: fallback.state(),
        venue: venueId,
        venueSwitches,
        venueMs: Math.round(venueMs * 10) / 10,
        venuesMounted: [...mounted.keys()],
        venueMB: Math.round(venueBytes() / 1e5) / 10,
        framing: framing(),
      };
    },
    dispose() {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVis);
      rival.dispose();
      for (const set of mounted.values()) set.dispose();
      warmTarget?.dispose();
      scene.traverse((o) => {
        const mat = (o as THREE.Mesh).material as THREE.MeshBasicMaterial | THREE.MeshBasicMaterial[] | undefined;
        for (const m of Array.isArray(mat) ? mat : mat ? [mat] : []) m.map?.dispose();
      });
      scene.traverse((o) => disposeObj(o));
      if (post) {
        for (const pass of post.composer.passes) pass.dispose();
        post.composer.dispose();
      }
      backTex.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
