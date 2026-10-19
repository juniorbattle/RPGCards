/**
 * M09 V1 — personnages de la ville en pied, dessinés par code dans l'esprit du « vectoriel V2 » (ADR 021) : aplats
 * d'illustration, une bande d'ombre, contour fin et sombre, visage simple et lisible à petite taille. Les couleurs, les
 * coupes et les accessoires des PNJ viennent de leurs gabarits (ADR 023, `npcLook`) : même identifiant, même
 * personnage qu'au duel. Proportions « chibi » modérées (tête ≈ 1/3,4 de la hauteur) pour la lisibilité en ville.
 * Provisoire : les personnages clés passeront à Aseprite plus tard (M09, amendement de la règle des images).
 *
 * Atlas : 5 colonnes (repos, 4 temps de marche) × 3 rangées (face, dos, profil droit ; le profil gauche est le miroir).
 */
import * as THREE from 'three';
import { FAMILY_PALETTE } from '../art/palette';
import type { Family } from '../game/catalog/cards';
import { NPC_HAIRS, NPC_SKINS, npcLook, type Accessory, type HairCut, type Tone } from '../presentation/npcs';
import { COMMON_GLSL, U } from './materiaux';
import type { Facing } from './monde';

export const CELL_W = 96;
export const CELL_H = 160;
export const COLS = 5;
export const ROWS = 3;
/** Hauteur du personnage dans le monde (m) ; la cellule couvre un peu plus (marge du contour). */
export const WALKER_H = 1.62;
const PLANE_H = WALKER_H * (CELL_H / 148);
const PLANE_W = PLANE_H * (CELL_W / CELL_H);

export interface WalkerLook {
  skin: Tone;
  hair: Tone;
  cut: HairCut | 'pics' | 'carre-argent';
  cloth: Tone;
  shirt: Tone;
  legs: string;
  accessory: Accessory | 'bandeau-braise';
  /** Manteau long (marchande, joueuse, joueur) ou veste courte (docker, commis). */
  long: boolean;
  /** Châle croisé, bretelles, revers : un détail de gabarit. */
  detail: 'chale' | 'bretelles' | 'revers' | 'echarpe' | 'aucun';
  iris: string;
  /** Capuche rabattue sur la nuque et besace en bandoulière (duelliste joueur, d'après la référence de travail du
   *  2026-10-19 « marcheur », non approuvée). */
  hood?: boolean;
}

const tone = (base: string, shade: string, deep: string, hi: string): Tone => ({ base, shade, deep, hi });

/** Apparence d'un marcheur : PNJ (gabarit et graine), rival signature, ou duelliste joueur (`player-<Famille>`). */
export function walkerLook(id: string): WalkerLook {
  const n = npcLook(id);
  if (n) {
    return {
      skin: n.skin, hair: n.hair, cut: n.cut, cloth: n.cloth, shirt: n.shirt, legs: '#2a2d36', accessory: n.accessory,
      long: n.template === 'marchande' || n.template === 'joueuse',
      detail: n.template === 'marchande' ? 'chale' : n.template === 'docker' ? 'bretelles' : n.template === 'commis' ? 'revers' : 'aucun',
      iris: n.iris.iris,
    };
  }
  if (id.startsWith('player-')) {
    const fam = id.slice(7) as Family;
    const p = FAMILY_PALETTE[fam] ?? FAMILY_PALETTE.Cendre;
    return {
      skin: NPC_SKINS[0]!, hair: tone('#dfe2ef', '#b4b8c8', '#8a8ea0', '#ffffff'), cut: 'carre-argent',
      cloth: tone(p.mid, p.deep, p.deep, p.light), shirt: tone('#e6e0d2', '#c2bcae', '#98928a', '#f6f2ea'), legs: '#262a34',
      accessory: 'bandeau', long: true, detail: 'echarpe', iris: '#4a6fd6', hood: true,
    };
  }
  // Rivaux signatures présents dans la ville (couleurs de leurs identités V2, ADR 021) : Kaï sur le Quai, Orin au Parvis.
  const rivals: Record<string, WalkerLook> = {
    braise: {
      skin: tone('#e2a982', '#b9785a', '#8e5642', '#f2c4a2'), hair: tone('#2a1410', '#1a0c09', '#0c0605', '#c2411d'), cut: 'pics',
      cloth: tone('#7a2410', '#561808', '#3a0f05', '#d0541f'), shirt: tone('#2a2422', '#191514', '#0c0a09', '#4e4440'), legs: '#26201e',
      accessory: 'bandeau-braise', long: false, detail: 'aucun', iris: '#d98a1e',
    },
    astre: {
      skin: tone('#9a6444', '#6e432c', '#4e2e1e', '#b8825e'), hair: tone('#1c1f33', '#12141f', '#08090f', '#6f80c4'), cut: 'pics',
      cloth: tone('#3b3214', '#2a230c', '#1a1606', '#b8962f'), shirt: tone('#ffe08a', '#d8b860', '#a88a3a', '#fff2c4'), legs: '#1e2030',
      accessory: 'aucun', long: true, detail: 'revers', iris: '#e0b23a',
    },
  };
  return rivals[id] ?? {
    skin: NPC_SKINS[2]!, hair: NPC_HAIRS[1]!, cut: 'courte', cloth: tone('#3e5068', '#2c3a4e', '#1c2636', '#5e7290'),
    shirt: tone('#d8cdb4', '#b4a88e', '#8c826c', '#ece4d0'), legs: '#2a2d36', accessory: 'aucun', long: false, detail: 'aucun', iris: '#4a3a2a',
  };
}

const INK = '#16121c';
type Ctx = CanvasRenderingContext2D;

function blob(ctx: Ctx, fill: string, path: () => void, line = 2.4): void {
  ctx.beginPath();
  path();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = line;
  ctx.strokeStyle = INK;
  ctx.stroke();
}

type View = 'face' | 'dos' | 'profil';

/** Dessine un personnage dans une cellule (origine : pieds au centre bas). `t` : temps de marche 0..1, null = repos. */
function drawWalker(ctx: Ctx, L: WalkerLook, view: View, t: number | null): void {
  const swing = t === null ? 0 : Math.sin(t * Math.PI * 2);
  const bob = t === null ? 0 : Math.abs(Math.sin(t * Math.PI * 2)) * 2.2;
  ctx.save();
  ctx.translate(CELL_W / 2, CELL_H - 8 - bob);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const hipY = -50;
  const shoulderY = -96;
  const headY = -120;
  const side = view === 'profil';
  // --- jambes (derrière le manteau) ---
  const leg = (dx: number, a: number, shade: boolean) => {
    ctx.save();
    ctx.translate(dx, hipY);
    ctx.rotate(a);
    blob(ctx, shade ? shadeOf(L.legs) : L.legs, () => ctx.roundRect(-5.5, 0, 11, 44, 4));
    blob(ctx, '#1b1a1e', () => ctx.roundRect(side ? -6 : -6.5, 40, side ? 15 : 13, 8, 3));
    ctx.restore();
  };
  if (side) {
    leg(0, swing * 0.5, true);
    leg(0, -swing * 0.5, false);
  } else {
    const lift = (s: number) => (t === null ? 0 : Math.max(0, s) * 4);
    ctx.save(); ctx.translate(0, -lift(swing)); leg(-7, 0, false); ctx.restore();
    ctx.save(); ctx.translate(0, -lift(-swing)); leg(7, 0, false); ctx.restore();
  }
  // --- bras arrière (profil) ---
  const arm = (dx: number, a: number, back: boolean) => {
    ctx.save();
    ctx.translate(dx, shoulderY + 6);
    ctx.rotate(a);
    blob(ctx, back ? L.cloth.shade : L.cloth.base, () => ctx.roundRect(-5, 0, 10, 36, 5));
    blob(ctx, back ? L.skin.shade : L.skin.base, () => ctx.ellipse(0, 39, 5, 5.5, 0, 0, Math.PI * 2), 2);
    ctx.restore();
  };
  if (side) arm(2, -swing * 0.55, true);
  // --- buste et manteau ---
  const bodyW = side ? 26 : 36;
  const hem = L.long ? hipY + 30 : hipY + 8;
  const coat = () => {
    ctx.moveTo(-bodyW / 2 + 2, shoulderY);
    ctx.quadraticCurveTo(-bodyW / 2 - 3, shoulderY + 30, -bodyW / 2 - (L.long ? 6 : 1), hem);
    ctx.lineTo(bodyW / 2 + (L.long ? 6 : 1), hem);
    ctx.quadraticCurveTo(bodyW / 2 + 3, shoulderY + 30, bodyW / 2 - 2, shoulderY);
    ctx.quadraticCurveTo(0, shoulderY - 7, -bodyW / 2 + 2, shoulderY);
  };
  blob(ctx, L.cloth.base, coat);
  // bande d'ombre (lumière venue de la gauche, comme le contre-jour des duels), découpée DANS la silhouette du manteau
  ctx.save();
  ctx.beginPath();
  coat();
  ctx.clip();
  ctx.fillStyle = L.cloth.shade;
  ctx.globalAlpha = 0.7;
  ctx.fillRect(bodyW * 0.12, shoulderY - 8, bodyW, hem - shoulderY + 12);
  ctx.restore();
  ctx.beginPath();
  coat();
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = INK;
  ctx.stroke();
  if (view === 'face') {
    // chemise / plastron et détail de gabarit
    blob(ctx, L.shirt.base, () => { ctx.moveTo(-7, shoulderY - 2); ctx.lineTo(7, shoulderY - 2); ctx.lineTo(5, shoulderY + 24); ctx.lineTo(-5, shoulderY + 24); ctx.closePath(); }, 2);
    if (L.detail === 'chale') blob(ctx, L.cloth.hi, () => { ctx.moveTo(-bodyW / 2 + 1, shoulderY + 2); ctx.lineTo(0, shoulderY + 26); ctx.lineTo(bodyW / 2 - 1, shoulderY + 2); ctx.lineTo(0, shoulderY + 14); ctx.closePath(); }, 2);
    if (L.detail === 'bretelles') { ctx.strokeStyle = L.cloth.deep; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-9, shoulderY + 1); ctx.lineTo(-7, hipY + 4); ctx.moveTo(9, shoulderY + 1); ctx.lineTo(7, hipY + 4); ctx.stroke(); }
    if (L.detail === 'revers') { blob(ctx, L.cloth.hi, () => { ctx.moveTo(-8, shoulderY); ctx.lineTo(-2, shoulderY + 18); ctx.lineTo(-12, shoulderY + 10); ctx.closePath(); }, 1.6); blob(ctx, L.cloth.hi, () => { ctx.moveTo(8, shoulderY); ctx.lineTo(2, shoulderY + 18); ctx.lineTo(12, shoulderY + 10); ctx.closePath(); }, 1.6); }
    if (L.detail === 'echarpe') blob(ctx, L.cloth.hi, () => ctx.roundRect(-12, shoulderY - 4, 24, 9, 4), 2);
    if (L.accessory === 'cravate') blob(ctx, '#7a2e2e', () => { ctx.moveTo(-2.5, shoulderY + 2); ctx.lineTo(2.5, shoulderY + 2); ctx.lineTo(3.5, shoulderY + 20); ctx.lineTo(0, shoulderY + 24); ctx.lineTo(-3.5, shoulderY + 20); ctx.closePath(); }, 1.5);
  }
  // ceinture
  ctx.fillStyle = L.cloth.deep;
  ctx.fillRect(-bodyW / 2, hipY - 3, bodyW, 4);
  // --- bras avant ---
  if (side) arm(-2, swing * 0.55, false);
  else {
    arm(-bodyW / 2 - 1, 0.12 + swing * 0.18, false);
    arm(bodyW / 2 + 1, -0.12 - swing * 0.18, false);
  }
  // --- besace en bandoulière (joueur) ---
  if (L.hood && view !== 'dos') {
    ctx.strokeStyle = '#3a2a1e';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(side ? 6 : -bodyW / 2 + 4, shoulderY + 1);
    ctx.lineTo(side ? -4 : bodyW / 2 - 4, hipY - 2);
    ctx.stroke();
    blob(ctx, '#6a5640', () => ctx.roundRect(side ? -16 : bodyW / 2 - 12, hipY - 12, 16, 13, 3), 2);
    ctx.fillStyle = '#e2c48a';
    ctx.fillRect(side ? -10 : bodyW / 2 - 6, hipY - 8, 4, 4);
  }
  // --- capuche rabattue (derrière la tête) et liseré ivoire du manteau ---
  if (L.hood) {
    blob(ctx, L.cloth.shade, () => ctx.ellipse(side ? -8 : 0, headY + 10, side ? 18 : 25, 17, 0, 0, Math.PI * 2));
    ctx.strokeStyle = '#d8d0bc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-bodyW / 2 - (L.long ? 5 : 0), hipY + 28);
    ctx.lineTo(bodyW / 2 + (L.long ? 5 : 0), hipY + 28);
    ctx.stroke();
  }
  // --- cou et tête ---
  blob(ctx, L.skin.shade, () => ctx.roundRect(-5, shoulderY - 12, 10, 12, 3), 2);
  drawHead(ctx, L, view, headY);
  ctx.restore();
}

function shadeOf(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const k = 0.72;
  return `rgb(${Math.round(((n >> 16) & 255) * k)},${Math.round(((n >> 8) & 255) * k)},${Math.round((n & 255) * k)})`;
}

function drawHead(ctx: Ctx, L: WalkerLook, view: View, y: number): void {
  const R = 22;
  const H = L.hair;
  const side = view === 'profil';
  // masse arrière des cheveux (longs, queue, chignon) derrière la tête
  if (L.cut === 'milongs' || L.cut === 'ondulee' || L.cut === 'carre' || L.cut === 'carre-argent') {
    blob(ctx, H.shade, () => ctx.roundRect(-R - 2, y - 8, 2 * R + 4, L.cut === 'milongs' || L.cut === 'ondulee' ? 38 : 28, 10));
  }
  if (L.cut === 'queue' && view !== 'face') blob(ctx, H.base, () => ctx.ellipse(side ? -R + 2 : 0, y + 16, 7, 18, side ? 0.3 : 0, 0, Math.PI * 2));
  // tête
  blob(ctx, L.skin.base, () => {
    if (side) ctx.ellipse(1, y, R * 0.92, R, 0, 0, Math.PI * 2);
    else ctx.ellipse(0, y, R, R * 1.02, 0, 0, Math.PI * 2);
  });
  if (side) {
    // nez et oreille
    blob(ctx, L.skin.base, () => { ctx.moveTo(R * 0.86, y - 2); ctx.quadraticCurveTo(R + 6, y + 4, R * 0.84, y + 7); }, 1.8);
    blob(ctx, L.skin.shade, () => ctx.ellipse(-4, y + 2, 4, 5.5, 0, 0, Math.PI * 2), 1.6);
  }
  if (view !== 'dos') {
    // ombre de joue côté droit
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = L.skin.shade;
    ctx.beginPath();
    ctx.ellipse(side ? -6 : 9, y + 4, 10, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // yeux : amande sombre, iris coloré, reflet (lisibles à 20 px)
    const eye = (ex: number) => {
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.ellipse(ex, y + 2, 3.6, 4.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = L.iris;
      ctx.beginPath();
      ctx.ellipse(ex, y + 3, 2.3, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex - 1.1, y + 0.6, 1.1, 0, Math.PI * 2);
      ctx.fill();
    };
    if (side) eye(11);
    else { eye(-8); eye(8); }
    // sourcils, bouche, rougeur
    ctx.strokeStyle = H.deep;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    if (side) { ctx.moveTo(7, y - 6); ctx.lineTo(15, y - 7); } else { ctx.moveTo(-12, y - 6); ctx.lineTo(-4, y - 7); ctx.moveTo(4, y - 7); ctx.lineTo(12, y - 6); }
    ctx.stroke();
    ctx.strokeStyle = '#6a2c26';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    if (side) { ctx.moveTo(12, y + 13); ctx.lineTo(17, y + 12.5); } else { ctx.moveTo(-4, y + 13); ctx.quadraticCurveTo(0, y + 15, 4, y + 13); }
    ctx.stroke();
    ctx.fillStyle = 'rgba(214,110,96,0.35)';
    for (const cx of side ? [8] : [-12, 12]) { ctx.beginPath(); ctx.ellipse(cx, y + 9, 4, 2.5, 0, 0, Math.PI * 2); ctx.fill(); }
    if (L.accessory === 'barbe') { ctx.fillStyle = 'rgba(40,30,26,0.28)'; ctx.beginPath(); ctx.ellipse(side ? 8 : 0, y + 14, side ? 10 : 15, 8, 0, 0, Math.PI); ctx.fill(); }
    if (L.accessory === 'lunettes') { ctx.strokeStyle = INK; ctx.lineWidth = 1.6; for (const ex of side ? [11] : [-8, 8]) ctx.strokeRect(ex - 5, y - 2, 10, 8); }
  }
  // cheveux : calotte selon la coupe (face/profil), masse complète de dos
  const cap = () => {
    if (view === 'dos') { ctx.ellipse(0, y - 1, R + 1.5, R + 2, 0, 0, Math.PI * 2); return; }
    ctx.moveTo(-R - 1, y + (L.cut === 'rase' ? -6 : 2));
    ctx.quadraticCurveTo(-R - 2, y - R - 6, 0, y - R - 4);
    ctx.quadraticCurveTo(R + 2, y - R - 6, R + 1, y + (L.cut === 'rase' ? -6 : 2));
    const fr = L.cut === 'frange' || L.cut === 'carre' || L.cut === 'carre-argent' ? 2 : L.cut === 'plaquee' || L.cut === 'chignon' || L.cut === 'queue' ? -10 : -5;
    ctx.quadraticCurveTo(R * 0.4, y + fr - 6, 0, y + fr - 2);
    ctx.quadraticCurveTo(-R * 0.5, y + fr - 8, -R - 1, y + (L.cut === 'rase' ? -6 : 2));
  };
  blob(ctx, view === 'dos' ? H.base : H.base, cap);
  if (L.cut === 'pics') {
    for (let i = -3; i <= 3; i++) blob(ctx, H.base, () => { ctx.moveTo(i * 6 - 5, y - R + 2); ctx.lineTo(i * 6 + (side ? -5 : 0), y - R - 14 + Math.abs(i) * 2); ctx.lineTo(i * 6 + 5, y - R + 2); }, 1.8);
    ctx.fillStyle = H.hi;
    ctx.globalAlpha = 0.6;
    ctx.fillRect(-10, y - R - 6, 6, 3);
    ctx.globalAlpha = 1;
  }
  if (L.cut === 'boucles') for (let i = -2; i <= 2; i++) blob(ctx, H.base, () => ctx.arc(i * 9, y - R + 1, 6, 0, Math.PI * 2), 1.6);
  if (L.cut === 'chignon') blob(ctx, H.base, () => ctx.arc(side ? -10 : 0, y - R - 6, 9, 0, Math.PI * 2));
  // reflet de cheveux
  ctx.strokeStyle = H.hi;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(side ? -2 : -4, y - 6, R - 4, Math.PI * 1.15, Math.PI * 1.45);
  ctx.stroke();
  ctx.globalAlpha = 1;
  // accessoires de tête
  const acc = L.accessory;
  if (acc === 'bandeau' || acc === 'bandeau-braise') blob(ctx, acc === 'bandeau-braise' ? '#c8321c' : L.cloth.hi, () => ctx.roundRect(-R - 1, y - 12, 2 * R + 2, 6, 3), 1.8);
  if (acc === 'bonnet') blob(ctx, L.cloth.hi, () => { ctx.moveTo(-R - 2, y - 6); ctx.quadraticCurveTo(0, y - R - 20, R + 2, y - 6); ctx.closePath(); });
  if (acc === 'casquette') { blob(ctx, L.cloth.base, () => { ctx.moveTo(-R, y - 8); ctx.quadraticCurveTo(0, y - R - 12, R, y - 8); ctx.closePath(); }); if (view !== 'dos') blob(ctx, L.cloth.deep, () => ctx.roundRect(side ? 4 : -R + 2, y - 10, side ? 24 : 2 * R - 4, 5, 2), 1.6); }
  if (acc === 'fichu') blob(ctx, '#8a3a3a', () => { ctx.moveTo(-R - 2, y - 2); ctx.quadraticCurveTo(0, y - R - 14, R + 2, y - 2); ctx.quadraticCurveTo(0, y - 10, -R - 2, y - 2); });
  if (acc === 'fleur' && view !== 'dos') blob(ctx, '#e8a0b0', () => ctx.arc(side ? -6 : -14, y - 12, 4.5, 0, Math.PI * 2), 1.4);
  if (acc === 'boucle' && view !== 'dos') { ctx.fillStyle = '#e2c48a'; ctx.beginPath(); ctx.arc(side ? -4 : -R + 1, y + 10, 2.2, 0, Math.PI * 2); ctx.fill(); }
}

const ATLAS = new Map<string, THREE.CanvasTexture>();

/** Atlas d'un personnage (mis en cache par identifiant). */
export function walkerAtlas(id: string): THREE.CanvasTexture {
  const hit = ATLAS.get(id);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = CELL_W * COLS;
  c.height = CELL_H * ROWS;
  const ctx = c.getContext('2d')!;
  const L = walkerLook(id);
  const views: View[] = ['face', 'dos', 'profil'];
  views.forEach((v, r) => {
    for (let k = 0; k < COLS; k++) {
      ctx.save();
      ctx.translate(k * CELL_W, r * CELL_H);
      ctx.beginPath();
      ctx.rect(0, 0, CELL_W, CELL_H);
      ctx.clip();
      drawWalker(ctx, L, v, k === 0 ? null : (k - 1) / 4);
      ctx.restore();
    }
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.generateMipmaps = true;
  ATLAS.set(id, t);
  return t;
}

/** Canvas de l'atlas (planche de revue, QA). */
export function walkerAtlasCanvas(id: string): HTMLCanvasElement {
  return walkerAtlas(id).image as HTMLCanvasElement;
}

const SPRITE_FRAG = /* glsl */ `
${COMMON_GLSL}
uniform sampler2D tAtlas; uniform vec2 uCell; uniform vec2 uOff; uniform float uFlip; uniform vec3 uWorld;
varying vec2 vUv; varying vec3 vWorld;
void main(){
  vec2 uv = vec2(uFlip > 0.5 ? 1.0 - vUv.x : vUv.x, vUv.y);
  vec4 A = texture2D(tAtlas, (uOff + uv) * uCell);
  if (A.a < 0.5) discard;
  // Éclairage au centre du personnage (plat, comme une figurine peinte) : ambiante, lune, lanternes proches.
  vec3 P = uWorld + vec3(0.0, 0.9, 0.0);
  vec3 N = normalize(cameraPosition - P); N.y = 0.25; N = normalize(N);
  vec3 V = N;
  vec3 diff, spec; lightSum(P, N, V, 1.0, 8.0, diff, spec);
  vec3 col = A.rgb * (mix(uGroundAmb, uSkyAmb, 0.7) * 1.25 + uMoonCol * 0.42 + diff * 0.9);
  gl_FragColor = vec4(applyFog(col, vWorld), 1.0);
}`;

export interface WalkerSprite {
  group: THREE.Group;
  set(pos: { x: number; z: number }, facing: Facing, phase: number, moving: boolean, time: number): void;
  setTilt(rad: number): void;
  /** Remplace l'atlas dessiné par code (feuille externe vérifiée, `spritesExternes.ts`). */
  setAtlas(tex: THREE.Texture): void;
  dispose(): void;
}

/** Personnage en panneau tourné vers le plan de la caméra, ombre de contact au sol, découpe nette (alpha testé). */
export function createWalkerSprite(id: string): WalkerSprite {
  const atlas = walkerAtlas(id);
  const geo = new THREE.PlaneGeometry(PLANE_W, PLANE_H);
  geo.translate(0, PLANE_H / 2 - (8 / CELL_H) * PLANE_H, 0);
  const uniforms = {
    ...U,
    tAtlas: { value: atlas as THREE.Texture },
    uCell: { value: new THREE.Vector2(1 / COLS, 1 / ROWS) },
    uOff: { value: new THREE.Vector2(0, ROWS - 1) },
    uFlip: { value: 0 },
    uWorld: { value: new THREE.Vector3() },
  };
  const mat = new THREE.ShaderMaterial({
    name: 'VilleMarcheur',
    uniforms,
    vertexShader: /* glsl */ `varying vec2 vUv; varying vec3 vWorld; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: SPRITE_FRAG,
    side: THREE.DoubleSide,
  });
  const body = new THREE.Mesh(geo, mat);
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(0.95, 0.5),
    new THREE.MeshBasicMaterial({ map: contactShadow(), transparent: true, depthWrite: false, color: 0xffffff }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.012;
  shadow.renderOrder = 1;
  const group = new THREE.Group();
  group.add(shadow, body);
  const pivot = new THREE.Group();
  body.removeFromParent();
  pivot.add(body);
  group.add(pivot);
  return {
    group,
    set(pos, facing, phase, moving, time) {
      group.position.set(pos.x, 0, pos.z);
      uniforms.uWorld.value.set(pos.x, 0, pos.z);
      const row = facing === 'face' ? 0 : facing === 'dos' ? 1 : 2;
      const col = moving ? 1 + (Math.floor(phase * 4) % 4) : 0;
      uniforms.uOff.value.set(col, ROWS - 1 - row);
      uniforms.uFlip.value = facing === 'gauche' ? 1 : 0;
      // respiration discrète au repos
      pivot.scale.y = moving ? 1 : 1 + Math.sin(time * 2.2) * 0.008;
    },
    setTilt(rad) { pivot.rotation.x = rad; },
    setAtlas(tex) { uniforms.tAtlas.value = tex; },
    dispose() { geo.dispose(); mat.dispose(); shadow.geometry.dispose(); (shadow.material as THREE.Material).dispose(); },
  };
}

let shadowTex: THREE.CanvasTexture | null = null;
function contactShadow(): THREE.CanvasTexture {
  if (shadowTex) return shadowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(3,5,12,0.82)');
  g.addColorStop(0.5, 'rgba(3,5,12,0.4)');
  g.addColorStop(1, 'rgba(3,5,12,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  shadowTex = new THREE.CanvasTexture(c);
  return shadowTex;
}
