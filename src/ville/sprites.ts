/**
 * M09 V1 — personnages de la ville en pied, dessinés par code dans l'esprit du « vectoriel V2 » (ADR 021) : aplats
 * d'illustration, une bande d'ombre, contour fin et sombre, visage simple et lisible à petite taille. Les couleurs, les
 * coupes et les accessoires des PNJ viennent de leurs gabarits (ADR 023, `npcLook`) : même identifiant, même
 * personnage qu'au duel. Proportions « chibi » modérées (tête ≈ 1/3,4 de la hauteur) pour la lisibilité en ville.
 * Provisoire : les personnages clés passeront à Aseprite plus tard (M09, amendement de la règle des images).
 * M09 V3 (passe de qualité du Quai) : atlas 1,5 fois plus fin, contour extérieur épais par dilatation, liserés, ceinture,
 * poignets, bottes à revers, yeux à iris et reflets, capuche du joueur ; liserés de lumière dans le nuanceur.
 *
 * Atlas : 5 colonnes (repos, 4 temps de marche) × 3 rangées (face, dos, profil droit ; le profil gauche est le miroir).
 * Contrat commun avec les feuilles externes (ADR 027, `spritesExternes.ts`) : une feuille qui le respecte remplace
 * l'atlas d'un personnage, avec sa propre échelle, son ancrage et sa hauteur de figure (panneau tiré de la feuille), et
 * ses tons clés recolorés dans le nuanceur (peau, cheveux, tenue, chemise, accent : `recolorTargets`).
 */
import * as THREE from 'three';
import { FAMILY_PALETTE } from '../art/palette';
import type { Family } from '../game/catalog/cards';
import { NPC_HAIRS, NPC_SKINS, npcLook, type Accessory, type HairCut, type Tone } from '../presentation/npcs';
import { COMMON_GLSL, MAX_LIGHTS, U } from './materiaux';
import type { Facing } from './monde';
import { DEFAULT_ANCHOR, DEFAULT_FIGURE_H, RAMP_STEPS, RECOLOR_SLOTS, keyColor, type RecolorSlot, type SheetSpec } from './spritesExternes';

export const CELL_W = 96;
export const CELL_H = 160;
export const COLS = 5;
export const ROWS = 3;
/** Hauteur du personnage dans le monde (m) ; la cellule couvre un peu plus (marge du contour). */
export const WALKER_H = 1.62;

export interface WalkerLook {
  skin: Tone;
  hair: Tone;
  cut: HairCut | 'pics' | 'carre-argent';
  cloth: Tone;
  shirt: Tone;
  legs: string;
  accessory: Accessory | 'bandeau-braise' | 'diademe-voile';
  /** Manteau long (marchande, joueuse, joueur) ou veste courte (docker, commis). */
  long: boolean;
  /** Châle croisé, bretelles, revers : un détail de gabarit. */
  detail: 'chale' | 'bretelles' | 'revers' | 'echarpe' | 'aucun';
  iris: string;
  /** Capuche rabattue sur la nuque et besace en bandoulière (duelliste joueur, d'après la référence de travail du
   *  2026-10-19 « marcheur », non approuvée). */
  hood?: boolean;
  /** QA (preuve de la recoloration) : tons remplacés par les tons clés ; sans les voiles posés sur la peau (joues, barbe). */
  keyed?: boolean;
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
  // Rivaux signatures présents dans la ville (couleurs de leurs identités V2, ADR 021) : Kaï sur le Quai, Orin au Parvis, Sélène dans les Ruelles.
  const rivals: Record<string, WalkerLook> = {
    braise: {
      skin: tone('#e2a982', '#b9785a', '#8e5642', '#f2c4a2'), hair: tone('#2a1410', '#1a0c09', '#0c0605', '#c2411d'), cut: 'pics',
      cloth: tone('#7a2410', '#561808', '#3a0f05', '#d0541f'), shirt: tone('#2a2422', '#191514', '#0c0a09', '#4e4440'), legs: '#26201e',
      accessory: 'bandeau-braise', long: false, detail: 'aucun', iris: '#d98a1e',
    },
    voile: {
      skin: tone('#f0c9b0', '#c99a82', '#a07a66', '#fde2d0'), hair: tone('#c9cbe8', '#9fa2c4', '#7a7ea2', '#ffffff'), cut: 'carre',
      cloth: tone('#2f2d6e', '#211f50', '#151336', '#5d63c4'), shirt: tone('#a8e6ff', '#7cc0e0', '#5a98b8', '#e0f6ff'), legs: '#1c1c34',
      accessory: 'diademe-voile', long: true, detail: 'chale', iris: '#8a5cd6',
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

/**
 * Couleurs cibles de la recoloration d'une feuille (C5, ADR 027) : les tons du personnage par code, pour qu'un même
 * identifiant garde ses couleurs (PNJ : `npcLook` par graine ; duelliste joueur : tenue de sa famille, `FAMILY_PALETTE`) ;
 * l'accent n'existe que pour le joueur (couleur d'accent de sa famille).
 */
export function recolorTargets(id: string): Partial<Record<RecolorSlot, Tone>> {
  const L = walkerLook(id);
  const t: Partial<Record<RecolorSlot, Tone>> = { peau: L.skin, cheveux: L.hair, tenue: L.cloth, chemise: L.shirt };
  if (id.startsWith('player-')) {
    const p = FAMILY_PALETTE[id.slice(7) as Family] ?? FAMILY_PALETTE.Cendre;
    t.accent = tone(p.accent, p.light, p.mid, p.ink);
  }
  return t;
}

/** Ton clé réservé d'un emplacement (quatre niveaux), pour peindre une feuille recolorable. */
const keyTone = (slot: RecolorSlot): Tone => tone(keyColor(slot, 2), keyColor(slot, 1), keyColor(slot, 0), keyColor(slot, 3));

/** QA : apparence d'un personnage dont les emplacements donnés sont peints en tons clés (feuille de preuve de C5). */
export function keyedLook(L: WalkerLook, slots: readonly RecolorSlot[]): WalkerLook {
  const k = new Set(slots);
  return {
    ...L, keyed: true,
    skin: k.has('peau') ? keyTone('peau') : L.skin,
    hair: k.has('cheveux') ? keyTone('cheveux') : L.hair,
    cloth: k.has('tenue') ? keyTone('tenue') : L.cloth,
    shirt: k.has('chemise') ? keyTone('chemise') : L.shirt,
  };
}


/**
 * Résolution de l'atlas dessiné par code. La grille logique reste 96 × 160 par case (contrat des feuilles externes de
 * `spritesExternes.ts`) ; M09 V3 dessine 1,5 fois plus fin, pour des personnages plus grands à l'écran (≈ 110 px en
 * 1280 × 720, ≈ 165 px en 1920 × 1080) sans flou d'agrandissement.
 */
export const ATLAS_SCALE = 1.5;

const INK = '#15111c';
type Ctx = CanvasRenderingContext2D;
type View = 'face' | 'dos' | 'profil';

/** Remplit un tracé et le cerne d'un trait intérieur fin (le contour extérieur épais est ajouté à part, par dilatation). */
function blob(ctx: Ctx, fill: string, path: () => void, line = 1.5): void {
  ctx.beginPath();
  path();
  ctx.fillStyle = fill;
  ctx.fill();
  if (line > 0) {
    ctx.lineWidth = line;
    ctx.strokeStyle = INK;
    ctx.stroke();
  }
}
/** Bande d'ombre (lumière venue de la gauche, comme le contre-jour des duels), découpée dans la silhouette du tracé. */
function shadeIn(ctx: Ctx, path: () => void, color: string, fromX: number, alpha = 0.75): void {
  ctx.save();
  ctx.beginPath();
  path();
  ctx.clip();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(fromX, -200, 200, 260);
  ctx.restore();
}
/** Reflet (bord éclairé à gauche), découpé dans la silhouette. */
function lightIn(ctx: Ctx, path: () => void, color: string, toX: number, alpha = 0.45): void {
  ctx.save();
  ctx.beginPath();
  path();
  ctx.clip();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(-200, -200, 200 + toX, 260);
  ctx.restore();
}
function line(ctx: Ctx, color: string, w: number, pts: readonly (readonly [number, number])[]): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
}
function shadeOf(hex: string, k = 0.72): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${Math.round(((n >> 16) & 255) * k)},${Math.round(((n >> 8) & 255) * k)},${Math.round((n & 255) * k)})`;
}

/** Couleur des liserés : ivoire pour le duelliste joueur (référence de travail « marcheur »), sinon le clair de la tenue. */
const trimOf = (L: WalkerLook) => (L.hood ? '#d9d0bb' : L.cloth.hi);

/**
 * Dessine un personnage dans une case (origine : pieds au centre bas, unités logiques ; figure ≈ 148 de haut).
 * `t` : temps de marche 0..1, null = repos. Proportions « chibi » (tête ≈ 1/3,1 de la hauteur), une seule bande d'ombre
 * à droite et un reflet à gauche, liserés, ceinture, poignets, bottes à revers (planche « marcheur » du 2026-10-19).
 */
function drawWalker(ctx: Ctx, L: WalkerLook, view: View, t: number | null): void {
  const swing = t === null ? 0 : Math.sin(t * Math.PI * 2);
  const bob = t === null ? 0 : Math.abs(Math.sin(t * Math.PI * 2)) * 2.2;
  ctx.save();
  ctx.translate(CELL_W / 2, CELL_H - 8 - bob);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const hipY = -50;
  const shoulderY = -92;
  const headY = -117;
  const side = view === 'profil';
  const back = view === 'dos';
  const trim = trimOf(L);
  // --- capuche rabattue : le fond de la capuche, derrière la tête et sur les épaules ---
  if (L.hood && !back) blob(ctx, L.cloth.deep, () => ctx.ellipse(side ? -9 : 0, headY + 12, side ? 19 : 27, 18, 0, 0, Math.PI * 2));
  // --- cheveux longs derrière (face, profil) ---
  if (!back) backHair(ctx, L, view, headY);
  // --- jambes et bottes ---
  const leg = (dx: number, a: number, far: boolean) => {
    ctx.save();
    ctx.translate(dx, hipY);
    ctx.rotate(a);
    const legC = far ? shadeOf(L.legs, 0.7) : L.legs;
    blob(ctx, legC, () => ctx.roundRect(-5.8, 0, 11.6, 40, 4.5));
    // botte : tige, revers clair, semelle, reflet
    blob(ctx, far ? '#141217' : '#221e24', () => { ctx.moveTo(-6.2, 30); ctx.lineTo(6.2, 30); ctx.lineTo(side ? 9.5 : 7, 44); ctx.quadraticCurveTo(side ? 10 : 7.5, 49, side ? 6 : 4, 49); ctx.lineTo(-6.6, 49); ctx.quadraticCurveTo(-7.4, 44, -6.2, 30); });
    blob(ctx, far ? '#2c2830' : '#3a3440', () => ctx.roundRect(-6.6, 28, 13.2, 5, 2), 1.2);
    ctx.fillStyle = 'rgba(200,205,225,0.28)';
    ctx.fillRect(-4.2, 35, 2, 9);
    ctx.restore();
  };
  if (side) {
    leg(0, swing * 0.5, true);
    leg(0, -swing * 0.5, false);
  } else {
    const lift = (s: number) => (t === null ? 0 : Math.max(0, s) * 4);
    ctx.save(); ctx.translate(0, -lift(swing)); leg(-7.5, 0, false); ctx.restore();
    ctx.save(); ctx.translate(0, -lift(-swing)); leg(7.5, 0, false); ctx.restore();
  }
  // --- bras arrière (profil) ---
  const arm = (dx: number, a: number, far: boolean) => {
    ctx.save();
    ctx.translate(dx, shoulderY + 7);
    ctx.rotate(a);
    blob(ctx, far ? L.cloth.deep : L.cloth.base, () => ctx.roundRect(-5.6, 0, 11.2, 35, 5.5));
    if (!far) shadeIn(ctx, () => ctx.roundRect(-5.6, 0, 11.2, 35, 5.5), L.cloth.shade, 1.5, 0.7);
    blob(ctx, far ? shadeOf(trim, 0.6) : trim, () => ctx.roundRect(-6, 29, 12, 6, 2.5), 1.2);
    blob(ctx, far ? L.skin.shade : L.skin.base, () => ctx.ellipse(0, 39.5, 5, 5.6, 0, 0, Math.PI * 2), 1.4);
    ctx.restore();
  };
  if (side) arm(3, -swing * 0.55, true);
  // --- buste et manteau ---
  const bodyW = side ? 27 : 38;
  const hem = L.long ? -11 : hipY + 9;
  const flare = L.long ? 7 : 1.5;
  const coat = () => {
    ctx.moveTo(-bodyW / 2 + 3, shoulderY - 1);
    ctx.quadraticCurveTo(-bodyW / 2 - 2, shoulderY + 2, -bodyW / 2 - 1, shoulderY + 14);
    ctx.lineTo(-bodyW / 2 + 0.5, hipY);
    ctx.quadraticCurveTo(-bodyW / 2 - flare * 0.5, (hipY + hem) / 2, -bodyW / 2 - flare, hem);
    ctx.quadraticCurveTo(0, hem + 3, bodyW / 2 + flare, hem);
    ctx.quadraticCurveTo(bodyW / 2 + flare * 0.5, (hipY + hem) / 2, bodyW / 2 - 0.5, hipY);
    ctx.lineTo(bodyW / 2 + 1, shoulderY + 14);
    ctx.quadraticCurveTo(bodyW / 2 + 2, shoulderY + 2, bodyW / 2 - 3, shoulderY - 1);
    ctx.quadraticCurveTo(0, shoulderY - 6, -bodyW / 2 + 3, shoulderY - 1);
  };
  blob(ctx, L.cloth.base, coat, 1.6);
  shadeIn(ctx, coat, L.cloth.shade, side ? 2 : bodyW * 0.14, 0.78);
  lightIn(ctx, coat, L.cloth.hi, side ? -bodyW / 2 + 4 : -bodyW / 2 + 4, 0.35);
  // liseré de l'ourlet
  ctx.save();
  ctx.beginPath(); coat(); ctx.clip();
  line(ctx, trim, 3.2, [[-bodyW / 2 - flare - 2, hem - 2.5], [0, hem + 0.5], [bodyW / 2 + flare + 2, hem - 2.5]]);
  if (L.long) line(ctx, shadeOf(trim, 0.8), 1.2, [[-bodyW / 2 - flare, hem - 6], [0, hem - 3], [bodyW / 2 + flare, hem - 6]]);
  if (back) {
    // dos : couture centrale et fente basse du manteau
    line(ctx, L.cloth.deep, 1.6, [[0, shoulderY + 2], [0, hem]]);
    if (L.long) blob(ctx, L.cloth.deep, () => { ctx.moveTo(-3, hipY + 8); ctx.lineTo(3, hipY + 8); ctx.lineTo(4, hem + 1); ctx.lineTo(-4, hem + 1); ctx.closePath(); }, 0);
  } else if (!side) {
    // face : ouverture du manteau sous la ceinture (doublure sombre), liserés de devant, boutons
    if (L.long) blob(ctx, shadeOf(L.legs, 0.85), () => { ctx.moveTo(0, hipY + 3); ctx.lineTo(7, hem + 2); ctx.lineTo(-7, hem + 2); ctx.closePath(); }, 1.2);
    line(ctx, trim, 2.2, [[-2.5, shoulderY + 6], [-2.5, hipY], [L.long ? -7 : -2.5, hem]]);
    line(ctx, trim, 2.2, [[2.5, shoulderY + 6], [2.5, hipY], [L.long ? 7 : 2.5, hem]]);
    ctx.fillStyle = L.cloth.deep;
    for (const y of [shoulderY + 22, shoulderY + 32]) { ctx.beginPath(); ctx.arc(5.5, y, 1.5, 0, Math.PI * 2); ctx.fill(); }
  } else {
    // profil : bord de devant du manteau
    line(ctx, trim, 2.2, [[bodyW / 2 - 1, shoulderY + 6], [bodyW / 2 + 0.5, hipY], [bodyW / 2 + flare, hem]]);
  }
  ctx.restore();
  ctx.beginPath(); coat(); ctx.lineWidth = 1.6; ctx.strokeStyle = INK; ctx.stroke();
  if (view === 'face') {
    // plastron, col et détail du gabarit
    blob(ctx, L.shirt.base, () => { ctx.moveTo(-7.5, shoulderY - 3); ctx.lineTo(7.5, shoulderY - 3); ctx.lineTo(4.5, shoulderY + 20); ctx.lineTo(-4.5, shoulderY + 20); ctx.closePath(); }, 1.3);
    shadeIn(ctx, () => { ctx.moveTo(-7.5, shoulderY - 3); ctx.lineTo(7.5, shoulderY - 3); ctx.lineTo(4.5, shoulderY + 20); ctx.lineTo(-4.5, shoulderY + 20); ctx.closePath(); }, L.shirt.shade, 1, 0.8);
    blob(ctx, trim, () => { ctx.moveTo(-10, shoulderY - 3); ctx.lineTo(-2, shoulderY + 12); ctx.lineTo(-5, shoulderY - 4); ctx.closePath(); }, 1.1);
    blob(ctx, trim, () => { ctx.moveTo(10, shoulderY - 3); ctx.lineTo(2, shoulderY + 12); ctx.lineTo(5, shoulderY - 4); ctx.closePath(); }, 1.1);
    if (L.detail === 'chale') blob(ctx, L.cloth.hi, () => { ctx.moveTo(-bodyW / 2 + 1, shoulderY + 1); ctx.lineTo(0, shoulderY + 25); ctx.lineTo(bodyW / 2 - 1, shoulderY + 1); ctx.lineTo(0, shoulderY + 13); ctx.closePath(); }, 1.4);
    if (L.detail === 'bretelles') { line(ctx, L.cloth.deep, 3, [[-9, shoulderY + 1], [-7, hipY + 3]]); line(ctx, L.cloth.deep, 3, [[9, shoulderY + 1], [7, hipY + 3]]); }
    if (L.detail === 'revers') { blob(ctx, L.cloth.hi, () => { ctx.moveTo(-8, shoulderY); ctx.lineTo(-2, shoulderY + 18); ctx.lineTo(-13, shoulderY + 10); ctx.closePath(); }, 1.2); blob(ctx, L.cloth.hi, () => { ctx.moveTo(8, shoulderY); ctx.lineTo(2, shoulderY + 18); ctx.lineTo(13, shoulderY + 10); ctx.closePath(); }, 1.2); }
    if (L.detail === 'echarpe') blob(ctx, L.cloth.hi, () => ctx.roundRect(-12, shoulderY - 5, 24, 9, 4), 1.4);
    if (L.accessory === 'cravate') blob(ctx, '#7a2e2e', () => { ctx.moveTo(-2.5, shoulderY + 2); ctx.lineTo(2.5, shoulderY + 2); ctx.lineTo(3.5, shoulderY + 19); ctx.lineTo(0, shoulderY + 23); ctx.lineTo(-3.5, shoulderY + 19); ctx.closePath(); }, 1.1);
  }
  // ceinture et boucle
  blob(ctx, L.cloth.deep, () => ctx.roundRect(-bodyW / 2 + 0.5, hipY - 4, bodyW - 1, 5, 1.5), 1.1);
  if (!back) blob(ctx, '#b8975a', () => ctx.roundRect(side ? bodyW / 2 - 7 : -3, hipY - 4.6, 6, 6.2, 1.2), 1);
  // --- bras avant ---
  if (side) arm(-2, swing * 0.55, false);
  else {
    arm(-bodyW / 2 - 1.5, 0.1 + swing * 0.18, false);
    arm(bodyW / 2 + 1.5, -0.1 - swing * 0.18, false);
  }
  // --- besace en bandoulière (duelliste joueur) ---
  if (L.hood) {
    if (!back) line(ctx, '#3a2a1e', 3.4, [[side ? 7 : -bodyW / 2 + 5, shoulderY], [side ? -5 : bodyW / 2 - 5, hipY - 2]]);
    else line(ctx, '#3a2a1e', 3.4, [[bodyW / 2 - 5, shoulderY], [-bodyW / 2 + 5, hipY - 2]]);
    const bx = side ? -18 : back ? -bodyW / 2 - 4 : bodyW / 2 - 9;
    blob(ctx, '#6a5640', () => ctx.roundRect(bx, hipY - 12, 16, 14, 3), 1.4);
    blob(ctx, '#56442f', () => ctx.roundRect(bx, hipY - 12, 16, 6, [3, 3, 1, 1]), 1.1);
    ctx.fillStyle = '#d6b878';
    ctx.fillRect(bx + 6.5, hipY - 8, 3, 3.5);
  }
  // --- capuche rabattue : plis autour du cou, liseré ---
  if (L.hood) {
    if (back) {
      // capuche rabattue pendant dans le dos, en pointe
      const hoodBack = () => { ctx.moveTo(-17, shoulderY - 3); ctx.quadraticCurveTo(-19, shoulderY + 18, 0, shoulderY + 30); ctx.quadraticCurveTo(19, shoulderY + 18, 17, shoulderY - 3); ctx.quadraticCurveTo(0, shoulderY - 10, -17, shoulderY - 3); };
      blob(ctx, L.cloth.base, hoodBack, 1.4);
      shadeIn(ctx, hoodBack, L.cloth.shade, 3, 0.7);
      line(ctx, trim, 1.8, [[-15, shoulderY + 6], [0, shoulderY + 24], [15, shoulderY + 6]]);
    } else {
      blob(ctx, L.cloth.shade, () => { ctx.moveTo(side ? -10 : -15, shoulderY - 4); ctx.quadraticCurveTo(side ? -12 : -16, shoulderY + 4, side ? -2 : -8, shoulderY + 3); ctx.lineTo(side ? 8 : 8, shoulderY + 3); ctx.quadraticCurveTo(side ? 9 : 16, shoulderY + 4, side ? 7 : 15, shoulderY - 4); ctx.closePath(); }, 1.3);
      line(ctx, trim, 1.6, [[side ? -9 : -14, shoulderY - 1], [side ? 7 : 14, shoulderY - 1]]);
    }
  }
  // --- cou et tête ---
  blob(ctx, L.skin.shade, () => ctx.roundRect(-5, shoulderY - 11, 10, 11, 3), 1.3);
  drawHead(ctx, L, view, headY);
  ctx.restore();
}

/** Masse arrière des cheveux longs (derrière la tête, face et profil). */
function backHair(ctx: Ctx, L: WalkerLook, view: View, y: number): void {
  const H = L.hair;
  const R = 24;
  const side = view === 'profil';
  if (L.cut === 'milongs' || L.cut === 'ondulee') {
    blob(ctx, H.shade, () => { ctx.moveTo(-R - 2, y - 4); ctx.quadraticCurveTo(-R - 6, y + 26, -R + 2, y + 34); ctx.lineTo(R - 2, y + 34); ctx.quadraticCurveTo(R + 6, y + 26, R + 2, y - 4); ctx.closePath(); });
    if (L.cut === 'ondulee') for (const sx of [-1, 1]) line(ctx, H.deep, 1.4, [[sx * (R - 2), y + 6], [sx * (R + 1), y + 16], [sx * (R - 3), y + 26]]);
  } else if (L.cut === 'carre' || L.cut === 'carre-argent') {
    blob(ctx, H.shade, () => ctx.roundRect(-R - 3, y - 8, 2 * R + 6, 30, [10, 10, 6, 6]));
  } else if (L.cut === 'queue' && side) {
    blob(ctx, H.base, () => ctx.ellipse(-R + 1, y + 14, 7, 17, 0.35, 0, Math.PI * 2));
  }
}

function drawHead(ctx: Ctx, L: WalkerLook, view: View, y: number): void {
  const R = 24;
  const H = L.hair;
  const side = view === 'profil';
  const back = view === 'dos';
  if (L.cut === 'queue' && back) blob(ctx, H.base, () => ctx.ellipse(0, y + 18, 7, 18, 0, 0, Math.PI * 2));
  // oreilles
  if (!back && !side) for (const sx of [-1, 1]) blob(ctx, L.skin.shade, () => ctx.ellipse(sx * (R - 1), y + 3, 4, 5.5, 0, 0, Math.PI * 2), 1.2);
  // visage : ovale à menton doux
  const face = () => {
    if (side) { ctx.ellipse(1, y, R * 0.93, R, 0, 0, Math.PI * 2); return; }
    ctx.moveTo(-R, y - 2);
    ctx.bezierCurveTo(-R, y - R * 1.35, R, y - R * 1.35, R, y - 2);
    ctx.bezierCurveTo(R, y + R * 0.62, R * 0.42, y + R * 0.98, 0, y + R * 0.98);
    ctx.bezierCurveTo(-R * 0.42, y + R * 0.98, -R, y + R * 0.62, -R, y - 2);
  };
  blob(ctx, L.skin.base, face, 1.5);
  if (!back) {
    shadeIn(ctx, face, L.skin.shade, side ? -8 : 7, 0.42);
    lightIn(ctx, face, L.skin.hi, side ? -12 : -12, 0.35);
  }
  if (side) {
    blob(ctx, L.skin.base, () => { ctx.moveTo(R * 0.85, y - 3); ctx.quadraticCurveTo(R + 6.5, y + 4, R * 0.84, y + 7); }, 1.4);
    blob(ctx, L.skin.shade, () => ctx.ellipse(-5, y + 2, 4, 5.5, 0, 0, Math.PI * 2), 1.2);
  }
  if (!back) {
    // yeux : amande sombre, iris coloré, pupille, deux reflets ; paupière supérieure appuyée (lisibles à 25 px)
    const eye = (ex: number) => {
      ctx.fillStyle = '#f4efe6';
      ctx.beginPath(); ctx.ellipse(ex, y + 3, 4.4, 5.6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = L.iris;
      ctx.beginPath(); ctx.ellipse(ex + (side ? 0.8 : 0), y + 3.6, 3.4, 4.6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = INK;
      ctx.beginPath(); ctx.ellipse(ex + (side ? 0.8 : 0), y + 4, 1.7, 2.4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(ex - 1.2, y + 1.6, 1.3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(ex + 1.4, y + 6, 0.6, 0, Math.PI * 2); ctx.fill();
      line(ctx, INK, 2.2, [[ex - 4.6, y - 0.6], [ex, y - 2.8], [ex + 4.8, y - 0.4]]);
      line(ctx, INK, 0.9, [[ex - 3.4, y + 8.2], [ex + 3.4, y + 8.2]]);
    };
    if (side) eye(11.5);
    else { eye(-8.5); eye(8.5); }
    // sourcils, nez, bouche, joues
    ctx.strokeStyle = H.deep;
    ctx.lineWidth = 2.1;
    ctx.beginPath();
    if (side) { ctx.moveTo(7.5, y - 7); ctx.lineTo(15.5, y - 7.5); } else { ctx.moveTo(-12.5, y - 6.5); ctx.lineTo(-4.5, y - 7.5); ctx.moveTo(4.5, y - 7.5); ctx.lineTo(12.5, y - 6.5); }
    ctx.stroke();
    if (!side) { ctx.fillStyle = L.skin.deep; ctx.beginPath(); ctx.ellipse(0.8, y + 10, 1.4, 1, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = '#6a2c26';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    if (side) { ctx.moveTo(12, y + 15); ctx.lineTo(17, y + 14.5); } else { ctx.moveTo(-3.6, y + 14.5); ctx.quadraticCurveTo(0, y + 16.8, 3.6, y + 14.5); }
    ctx.stroke();
    ctx.fillStyle = 'rgba(214,110,96,0.32)';
    if (!L.keyed) for (const cx of side ? [8] : [-12.5, 12.5]) { ctx.beginPath(); ctx.ellipse(cx, y + 11, 4.2, 2.6, 0, 0, Math.PI * 2); ctx.fill(); }
    if (L.accessory === 'barbe' && !L.keyed) { ctx.fillStyle = 'rgba(40,30,26,0.32)'; ctx.beginPath(); ctx.ellipse(side ? 8 : 0, y + 16, side ? 10 : 15, 8, 0, 0, Math.PI); ctx.fill(); }
    if (L.accessory === 'lunettes') { ctx.strokeStyle = INK; ctx.lineWidth = 1.4; for (const ex of side ? [11.5] : [-8.5, 8.5]) ctx.strokeRect(ex - 5.5, y - 2, 11, 9); }
  }
  // cheveux : calotte et frange selon la coupe ; mèches ; reflet
  const fr = L.cut === 'frange' || L.cut === 'carre' || L.cut === 'carre-argent' ? 1 : L.cut === 'plaquee' || L.cut === 'chignon' || L.cut === 'queue' ? -11 : -6;
  const low = L.cut === 'rase' ? -8 : 2;
  const cap = () => {
    if (back) { ctx.ellipse(0, y - 1, R + 1.8, R + 2.2, 0, 0, Math.PI * 2); return; }
    if (side) {
      ctx.moveTo(R * 0.7, y + fr - 6);
      ctx.quadraticCurveTo(R * 0.9, y - R - 6, -2, y - R - 5);
      ctx.quadraticCurveTo(-R - 4, y - R + 2, -R - 2, y + low + 8);
      ctx.quadraticCurveTo(-6, y + 4, R * 0.7, y + fr - 6);
      return;
    }
    ctx.moveTo(-R - 1.5, y + low);
    ctx.quadraticCurveTo(-R - 3, y - R - 7, 0, y - R - 5);
    ctx.quadraticCurveTo(R + 3, y - R - 7, R + 1.5, y + low);
    ctx.quadraticCurveTo(R * 0.55, y + fr - 4, R * 0.18, y + fr - 2);
    ctx.quadraticCurveTo(-R * 0.15, y + fr - 7, -R * 0.4, y + fr - 2);
    ctx.quadraticCurveTo(-R * 0.75, y + fr - 6, -R - 1.5, y + low);
  };
  blob(ctx, H.base, cap, 1.5);
  shadeIn(ctx, cap, H.shade, side ? -6 : back ? 6 : 8, 0.55);
  if (back && L.cut !== 'rase') {
    // de dos : mèches qui descendent du sommet en éventail, nuque plus sombre, bas de coupe festonné
    ctx.save();
    ctx.beginPath(); cap(); ctx.clip();
    const g = ctx.createLinearGradient(0, y - R, 0, y + R);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, H.deep);
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = g;
    ctx.fillRect(-R - 3, y - R, 2 * R + 6, 2 * R + 4);
    ctx.globalAlpha = 1;
    for (const dx of [-16, -9, -2, 5, 12, 18]) line(ctx, H.shade, 1.6, [[dx * 0.25, y - R - 2], [dx * 0.8, y - 4], [dx * 1.02, y + R]]);
    ctx.restore();
    ctx.fillStyle = H.base;
    for (const dx of [-14, -5, 4, 13]) { ctx.beginPath(); ctx.moveTo(dx - 5, y + R - 4); ctx.lineTo(dx, y + R + 2); ctx.lineTo(dx + 5, y + R - 4); ctx.fill(); }
  }
  if (L.cut === 'pics') {
    for (let i = -3; i <= 3; i++) blob(ctx, H.base, () => { ctx.moveTo(i * 6.4 - 5.5, y - R + 2); ctx.lineTo(i * 6.4 + (side ? -5 : 0), y - R - 15 + Math.abs(i) * 2.2); ctx.lineTo(i * 6.4 + 5.5, y - R + 2); }, 1.4);
    ctx.fillStyle = H.hi; ctx.globalAlpha = 0.7; ctx.fillRect(-11, y - R - 7, 7, 3); ctx.globalAlpha = 1;
  }
  if (L.cut === 'boucles') for (let i = -2; i <= 2; i++) blob(ctx, H.base, () => ctx.arc(i * 9.5, y - R + 1, 6.4, 0, Math.PI * 2), 1.3);
  if (L.cut === 'chignon') blob(ctx, H.base, () => ctx.arc(side ? -11 : 0, y - R - 7, 9.5, 0, Math.PI * 2));
  // mèches (traits sombres) et reflet en arc
  if (!back && L.cut !== 'rase') {
    line(ctx, H.deep, 1.1, [[-R * 0.5, y - R + 3], [-R * 0.35, y + fr - 6]]);
    line(ctx, H.deep, 1.1, [[R * 0.2, y - R + 1], [R * 0.3, y + fr - 7]]);
  }
  ctx.save();
  ctx.strokeStyle = H.hi;
  ctx.globalAlpha = 0.65;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(side ? -3 : -5, y - 7, R - 5, Math.PI * 1.12, Math.PI * 1.48);
  ctx.stroke();
  ctx.restore();
  // accessoires de tête
  const acc = L.accessory;
  if (acc === 'bandeau' || acc === 'bandeau-braise') {
    blob(ctx, acc === 'bandeau-braise' ? '#c8321c' : L.cloth.hi, () => ctx.roundRect(-R - 1.5, y - 13, 2 * R + 3, 6.5, 3), 1.4);
    if (acc === 'bandeau-braise' && !side) blob(ctx, '#c8321c', () => { ctx.moveTo(R - 2, y - 10); ctx.lineTo(R + 9, y - 2); ctx.lineTo(R + 4, y - 0.5); ctx.closePath(); }, 1.1);
  }
  // Sélène : diadème d'argent et cristal (son identité V2), pas le bandeau du joueur.
  if (acc === 'diademe-voile') {
    blob(ctx, '#d6dcf4', () => ctx.roundRect(-R, y - 14, 2 * R, 3.4, 1.6), 1.1);
    if (!back) blob(ctx, '#a8e6ff', () => ctx.arc(side ? 9 : 0, y - 12.3, 3.2, 0, Math.PI * 2), 1.1);
  }
  if (acc === 'bonnet') blob(ctx, L.cloth.hi, () => { ctx.moveTo(-R - 2.5, y - 6); ctx.quadraticCurveTo(0, y - R - 22, R + 2.5, y - 6); ctx.closePath(); });
  if (acc === 'casquette') { blob(ctx, L.cloth.base, () => { ctx.moveTo(-R, y - 8); ctx.quadraticCurveTo(0, y - R - 13, R, y - 8); ctx.closePath(); }); if (!back) blob(ctx, L.cloth.deep, () => ctx.roundRect(side ? 4 : -R + 2, y - 10, side ? 25 : 2 * R - 4, 5, 2), 1.3); }
  if (acc === 'fichu') blob(ctx, '#8a3a3a', () => { ctx.moveTo(-R - 2.5, y - 2); ctx.quadraticCurveTo(0, y - R - 15, R + 2.5, y - 2); ctx.quadraticCurveTo(0, y - 10, -R - 2.5, y - 2); });
  if (acc === 'fleur' && !back) blob(ctx, '#e8a0b0', () => ctx.arc(side ? -6 : -15, y - 13, 4.8, 0, Math.PI * 2), 1.2);
  if (acc === 'boucle' && !back) { ctx.fillStyle = '#e2c48a'; ctx.beginPath(); ctx.arc(side ? -5 : -R + 1, y + 11, 2.3, 0, Math.PI * 2); ctx.fill(); }
}

const ATLAS = new Map<string, THREE.CanvasTexture>();

/**
 * Atlas d'un personnage (mis en cache par identifiant). Chaque case est dessinée à part puis posée sur sa silhouette
 * dilatée à l'encre : un contour extérieur épais et régulier (lisibilité de nuit, à la manière du V2), des traits
 * intérieurs fins.
 */
export function walkerAtlas(id: string): THREE.CanvasTexture {
  const hit = ATLAS.get(id);
  if (hit) return hit;
  const t = new THREE.CanvasTexture(drawAtlas(walkerLook(id), ATLAS_SCALE));
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.generateMipmaps = true;
  ATLAS.set(id, t);
  return t;
}

/** Feuille d'atlas dessinée à l'échelle `S` (px par px logique). */
function drawAtlas(L: WalkerLook, S: number): HTMLCanvasElement {
  const cw = Math.round(CELL_W * S);
  const ch = Math.round(CELL_H * S);
  const c = document.createElement('canvas');
  c.width = cw * COLS;
  c.height = ch * ROWS;
  const ctx = c.getContext('2d')!;
  const cell = document.createElement('canvas');
  cell.width = cw;
  cell.height = ch;
  const cc = cell.getContext('2d')!;
  const sil = document.createElement('canvas');
  sil.width = cw;
  sil.height = ch;
  const sc = sil.getContext('2d')!;
  const views: View[] = ['face', 'dos', 'profil'];
  const rOut = 1.35 * S;
  views.forEach((v, r) => {
    for (let k = 0; k < COLS; k++) {
      cc.setTransform(1, 0, 0, 1, 0, 0);
      cc.clearRect(0, 0, cw, ch);
      cc.setTransform(S, 0, 0, S, 0, 0);
      drawWalker(cc, L, v, k === 0 ? null : (k - 1) / 4);
      sc.globalCompositeOperation = 'source-over';
      sc.clearRect(0, 0, cw, ch);
      for (let a = 0; a < 12; a++) sc.drawImage(cell, Math.cos((a / 12) * Math.PI * 2) * rOut, Math.sin((a / 12) * Math.PI * 2) * rOut);
      sc.globalCompositeOperation = 'source-in';
      sc.fillStyle = INK;
      sc.fillRect(0, 0, cw, ch);
      ctx.drawImage(sil, k * cw, r * ch);
      ctx.drawImage(cell, k * cw, r * ch);
    }
  });
  return c;
}

/** Canvas de l'atlas (planche de revue, QA). */
export function walkerAtlasCanvas(id: string): HTMLCanvasElement {
  return walkerAtlas(id).image as HTMLCanvasElement;
}

/**
 * QA (preuves du contrat v2, jamais en jeu) : atlas d'un personnage dessiné à une autre échelle (feuille de 960 × 960 à
 * l'échelle 2), et au besoin avec des emplacements en tons clés (`keyedLook`), non mis en cache.
 */
export function walkerAtlasCanvasFor(id: string, o: { scale?: number; keyed?: readonly RecolorSlot[] } = {}): HTMLCanvasElement {
  const L = walkerLook(id);
  return drawAtlas(o.keyed?.length ? keyedLook(L, o.keyed) : L, o.scale ?? ATLAS_SCALE);
}

/** Feuille de l'atlas par code : échelle 1,5, ancrage et figure du contrat, aucune teinte. */
export const CODE_SPEC: SheetSpec = { scale: ATLAS_SCALE, anchor: DEFAULT_ANCHOR, figureH: DEFAULT_FIGURE_H, recolor: [] };

/**
 * Éclairage du personnage, plat comme une figurine peinte, au centre du corps : ambiante, lune, lanternes proches
 * (compressées). M09 V3, d'après Cité du Tournoi (`SpriteRenderer.ts` L. 77-202) : dégradé vertical (pieds plus
 * sombres), liseré de lumière sur le bord tourné vers la lanterne la plus forte (bord détecté dans l'alpha de l'atlas),
 * liseré froid de lune sur le haut, ombre légèrement refroidie, compression douce des hautes lumières.
 *
 * Recoloration des feuilles (C5, ADR 027 ; `uRecolor`, inactive pour l'atlas par code) : un texel proche d'un ton clé
 * réservé (`RECOLOR_KEYS`) prend la rampe du personnage (`uRamp`, quatre tons par emplacement, linéaires) à son niveau.
 * L'encre est retirée avant le test : un bord filtré « ton clé + encre » reste sur la droite du ton clé et prend un ton
 * plus sombre de la rampe ; le test se fait en racine (proche du sRGB) pour ne pas confondre un rouge franc avec la peau.
 */
const SPRITE_FRAG = /* glsl */ `
${COMMON_GLSL}
uniform sampler2D tAtlas; uniform vec2 uCell; uniform vec2 uOff; uniform float uFlip; uniform vec3 uWorld; uniform vec2 uTexel;
uniform float uRecolor; uniform vec3 uRamp[20]; uniform float uSlots[5]; uniform vec3 uInkLin;
varying vec2 vUv; varying vec3 vWorld;
float alphaAt(vec2 uv){ uv = clamp(uv, vec2(0.0), vec2(1.0)); return texture2D(tAtlas, (uOff + vec2(uFlip > 0.5 ? 1.0 - uv.x : uv.x, uv.y)) * uCell).a; }
// niveaux des tons clés (sRGB 64, 128, 191, 255), en linéaire
const vec4 KEY_LV = vec4(0.05127, 0.21586, 0.52099, 1.0);
vec3 keyMask(int s){ return s == 0 ? vec3(1.0, 0.0, 0.0) : s == 1 ? vec3(1.0, 1.0, 0.0) : s == 2 ? vec3(1.0, 0.0, 1.0) : s == 3 ? vec3(0.0, 1.0, 1.0) : vec3(0.0, 1.0, 0.0); }
vec3 keyRamp(int s, float t){
  vec3 r0 = uRamp[s * 4]; vec3 r1 = uRamp[s * 4 + 1]; vec3 r2 = uRamp[s * 4 + 2]; vec3 r3 = uRamp[s * 4 + 3];
  if (t < KEY_LV.x) return mix(uInkLin, r0, t / KEY_LV.x);
  if (t < KEY_LV.y) return mix(r0, r1, (t - KEY_LV.x) / (KEY_LV.y - KEY_LV.x));
  if (t < KEY_LV.z) return mix(r1, r2, (t - KEY_LV.y) / (KEY_LV.z - KEY_LV.y));
  return mix(r2, r3, clamp((t - KEY_LV.z) / (KEY_LV.w - KEY_LV.z), 0.0, 1.0));
}
vec3 recolorKeys(vec3 c){
  vec3 d = max(c - uInkLin, 0.0);
  vec3 best = c; float bw = 0.0;
  for (int s = 0; s < 5; s++) {
    if (uSlots[s] < 0.5) continue;
    vec3 m = keyMask(s);
    vec3 o = d * (1.0 - m);
    vec3 hiA = d * m; vec3 loA = d * m + (1.0 - m) * 4.0;
    float ts = sqrt(dot(d, m) / dot(m, vec3(1.0)));
    float spread = sqrt(max(max(hiA.r, hiA.g), hiA.b)) - sqrt(min(min(loA.r, loA.g), loA.b));
    float r = max(sqrt(max(max(o.r, o.g), o.b)), spread) / max(ts, 1e-4);
    float w = (1.0 - smoothstep(0.06, 0.16, r)) * smoothstep(0.03, 0.08, ts);
    if (w > bw) { bw = w; best = keyRamp(s, dot(c, m) / dot(m, vec3(1.0))); }
  }
  return mix(c, best, bw);
}
void main(){
  vec2 uv = vec2(uFlip > 0.5 ? 1.0 - vUv.x : vUv.x, vUv.y);
  vec4 A = texture2D(tAtlas, (uOff + uv) * uCell);
  if (A.a < 0.5) discard;
  if (uRecolor > 0.5) A.rgb = recolorKeys(A.rgb);
  vec3 P = uWorld + vec3(0.0, 0.9, 0.0);
  vec3 N = normalize(cameraPosition - P); N.y = 0.25; N = normalize(N);
  vec3 diff, spec; lightSum(P, N, N, 1.0, 8.0, diff, spec);
  // lanterne dominante : côté (écran) d'où vient la lumière
  vec3 key = vec3(0.0); float kx = 0.0;
  for (int i = 0; i < ${MAX_LIGHTS}; i++) {
    if (i >= uLightCount) break;
    vec3 Lv = uLightPos[i].xyz - P; float d2 = dot(Lv, Lv); float r = uLightPos[i].w;
    float x = max(1.0 - d2 / (r * r), 0.0); float att = x * x / (1.0 + 0.22 * d2);
    vec3 c = uLightCol[i] * att; key += c; kx += dot(c, vec3(0.3, 0.5, 0.2)) * sign(Lv.x);
  }
  diff = diff / (1.0 + 0.6 * diff);
  vec3 col = A.rgb * (mix(uGroundAmb, uSkyAmb, 0.7) * 1.3 + uMoonCol * 0.42 + diff * 1.15);
  col *= mix(0.74, 1.04, smoothstep(0.0, 0.45, vUv.y));
  // liserés : bord de la silhouette tourné vers la lumière dominante (chaud), haut de la silhouette (froid, lune)
  float sx = kx >= 0.0 ? 1.0 : -1.0;
  float edgeKey = 1.0 - alphaAt(vUv + vec2(sx * 2.5 * uTexel.x, 0.0));
  float edgeTop = 1.0 - alphaAt(vUv + vec2(0.0, 2.5 * uTexel.y));
  float keyLum = dot(key, vec3(0.3, 0.5, 0.2));
  col += A.rgb * key * edgeKey * 0.9 + vec3(1.0, 0.72, 0.42) * edgeKey * min(keyLum, 1.2) * 0.22;
  col += uMoonCol * edgeTop * 0.35;
  col /= 1.0 + 0.12 * col;
  gl_FragColor = vec4(applyFog(col, vWorld), 1.0);
}`;

export interface WalkerSprite {
  group: THREE.Group;
  set(pos: { x: number; z: number }, facing: Facing, phase: number, moving: boolean, time: number): void;
  setTilt(rad: number): void;
  /** Hauteur du personnage dans le monde (m) : l'atlas est le même, le panneau et l'ombre suivent. */
  setHeight(h: number): void;
  /**
   * Remplace l'atlas dessiné par code par une feuille vérifiée (`spritesExternes.ts`) : panneau tiré de son ancrage et
   * de sa hauteur de figure, tons clés recolorés aux couleurs du personnage.
   */
  setSheet(sheet: { texture: THREE.Texture; spec: SheetSpec }): void;
  dispose(): void;
}

/**
 * Panneau d'un personnage à la hauteur de référence `WALKER_H` (la hauteur de l'îlot s'applique par l'échelle du
 * groupe) : la figure (`figureH` px logiques) vaut `WALKER_H`, les pieds (`anchor`) sont à l'origine. `ax` : décalage
 * horizontal du panneau qui ramène l'ancrage sous l'origine (nul pour l'atlas par code, centré).
 */
function walkerPanel(spec: SheetSpec): { geo: THREE.PlaneGeometry; ax: number } {
  const planeH = WALKER_H * (CELL_H / spec.figureH);
  const planeW = planeH * (CELL_W / CELL_H);
  const geo = new THREE.PlaneGeometry(planeW, planeH);
  geo.translate(0, planeH / 2 - ((CELL_H - spec.anchor[1]) / CELL_H) * planeH, 0);
  return { geo, ax: (0.5 - spec.anchor[0] / CELL_W) * planeW };
}

/** Personnage en panneau tourné vers le plan de la caméra, ombre de contact au sol, découpe nette (alpha testé). */
export function createWalkerSprite(id: string): WalkerSprite {
  const atlas = walkerAtlas(id);
  let { geo, ax } = walkerPanel(CODE_SPEC);
  const img = atlas.image as HTMLCanvasElement;
  const uniforms = {
    ...U,
    tAtlas: { value: atlas as THREE.Texture },
    uCell: { value: new THREE.Vector2(1 / COLS, 1 / ROWS) },
    uOff: { value: new THREE.Vector2(0, ROWS - 1) },
    uFlip: { value: 0 },
    uWorld: { value: new THREE.Vector3() },
    // pas d'un texel de l'atlas, exprimé dans les UV d'une case (détection du bord pour les liserés)
    uTexel: { value: new THREE.Vector2(COLS / img.width, ROWS / img.height) },
    // recoloration des tons clés d'une feuille (inactive pour l'atlas par code)
    uRecolor: { value: 0 },
    uRamp: { value: Array.from({ length: RECOLOR_SLOTS.length * 4 }, () => new THREE.Color()) },
    uSlots: { value: RECOLOR_SLOTS.map(() => 0) },
    uInkLin: { value: new THREE.Color(INK) },
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
      // ancrage hors du milieu de la case (feuille) : le miroir du profil gauche le renverse
      if (ax !== 0) body.position.x = facing === 'gauche' ? -ax : ax;
      // respiration discrète au repos
      pivot.scale.y = moving ? 1 : 1 + Math.sin(time * 2.2) * 0.008;
    },
    setTilt(rad) { pivot.rotation.x = rad; },
    setHeight(h) { group.scale.setScalar(h / WALKER_H); },
    setSheet({ texture, spec }) {
      uniforms.tAtlas.value = texture;
      const im = texture.image as { width?: number; height?: number } | undefined;
      if (im?.width && im.height) uniforms.uTexel.value.set(COLS / im.width, ROWS / im.height);
      const panel = walkerPanel(spec);
      geo.dispose();
      geo = panel.geo;
      ax = panel.ax;
      body.geometry = geo;
      body.position.x = 0;
      const targets = recolorTargets(id);
      const slots = RECOLOR_SLOTS.map((s) => (spec.recolor.includes(s) && targets[s] ? 1 : 0));
      RECOLOR_SLOTS.forEach((s, i) => {
        const t = targets[s];
        if (t) RAMP_STEPS.forEach((k, j) => uniforms.uRamp.value[i * 4 + j]!.set(t[k]));
      });
      uniforms.uSlots.value = slots;
      uniforms.uRecolor.value = slots.some((x) => x) ? 1 : 0;
    },
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
  g.addColorStop(0, 'rgba(3,5,12,0.85)');
  g.addColorStop(0.5, 'rgba(3,5,12,0.42)');
  g.addColorStop(1, 'rgba(3,5,12,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  shadowTex = new THREE.CanvasTexture(c);
  return shadowTex;
}
