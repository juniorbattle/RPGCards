/**
 * M07 L5 — porte de validation : Maëlle, gardienne des Ronces, en « vectoriel V2 ».
 *
 * Tracés vectoriels écrits à la main (données de chemin SVG → `Path2D`, courbes de Bézier cubiques), ombrage en
 * aplats façon illustration (lumière principale en haut à gauche, ombre propre à droite), traits d’encre effilés.
 * Aucune image, police ou modèle externe. Même architecture que V1 : couches animées séparées (yeux, paupières,
 * sourcils, bouche, rougeur) posées sur le même rig, même cadrage (visage ≈ 83 px des yeux au menton à 1280×720).
 *
 * Toutes les couches sont dessinées dans l’« espace H » : les unités du canvas de tête V1 (256 × 312, centre du
 * visage en (128, 156), yeux en y ≈ 151,5, menton en y ≈ 268). Capuche, buste et portrait des affiches convertissent
 * cet espace vers leur propre plan : le personnage du duel et son portrait proviennent du MÊME modèle.
 */
import { hashString, makeRng } from '../game/engine/rng';
import { drawEmblem } from '../art/emblems';
import type { Mood } from '../presentation/personalities';
import type { MouthShape } from './rivalTextures';

type Ctx = CanvasRenderingContext2D;
type Cubic = [number, number, number, number, number, number, number, number];

// ---------------------------------------------------------------------------------------------------------------
// Espace H et géométrie du rig (unités locales de la tête = avant l’échelle HEAD_SCALE du rig)

/** Unités H par unité locale de la tête (x, y). */
export const HX = 256 / 1.15;
export const HY = 312 / 1.4;
/** Sur-échantillonnage des textures (comme la tête V1). */
const RES = 2;
const EYE_DX = 0.21 * HX;
const EYE_Y = 156 - 0.02 * HY;
const EYE_CX = [128 - EYE_DX, 128 + EYE_DX] as const;

/** Paupière supérieure : ligne de cils (centre) en y = LASH0 + lid × TRAVEL (lid ≥ 0) ou + lid × TRAVEL_UP (lid < 0). */
const LASH0 = 136;
const TRAVEL = 32;
const TRAVEL_UP = 10;
/** Paupière inférieure : ligne de cils en y = LOW0 − squint × SQUINT. */
const LOW0 = 164;
const SQUINT = 16;

/** Humeurs V2 : mêmes champs que V1, plus le plissement de la paupière inférieure et la forme des sourcils. */
export type BrowShape = 'rest' | 'arch' | 'knit';
export interface FaceV2 {
  browL: number; browR: number; browAngle: number; lid: number; squint: number; tilt: number; flush: number;
  mouth: MouthShape; brow: BrowShape;
}
const f = (browL: number, browR: number, browAngle: number, lid: number, squint: number, tilt: number, flush: number, mouth: MouthShape, brow: BrowShape = 'rest'): FaceV2 =>
  ({ browL, browR, browAngle, lid, squint, tilt, flush, mouth, brow });
/**
 * `browAngle` > 0 = sourcils froncés, têtes (côté nez) ABAISSÉES (V2 applique ce sens ; V1 l’inverse, défaut relevé en
 * L5). Prudence (`focused`, `thinking`) : regard plissé par en dessous, lèvres pincées ; surprise : sourcils arqués,
 * blanc visible au-dessus de l’iris, lèvres entrouvertes.
 */
export const MOODS_V2: Record<Mood, FaceV2> = {
  neutral: f(0, 0, 0, 0.2, 0, 0, 0, 'neutral'),
  focused: f(-0.35, -0.25, 0.4, 0.34, 0.3, 0.02, 0, 'tight', 'knit'),
  confident: f(0.1, 0, 0.05, 0.28, 0.12, 0.03, 0, 'smirk'),
  smug: f(0.4, -0.1, 0.05, 0.4, 0.2, 0.06, 0, 'smirk'),
  pleased: f(0.2, 0.2, -0.1, 0.26, 0.35, 0.03, 0.15, 'smile'),
  triumphant: f(0.35, 0.35, -0.1, 0.2, 0.4, -0.03, 0.25, 'grin'),
  surprised: f(0.9, 0.85, -0.15, -0.3, 0, 0, 0, 'open', 'arch'),
  pained: f(-0.05, -0.1, -0.6, 0.42, 0.3, -0.06, 0.55, 'grimace'),
  annoyed: f(-0.3, -0.35, 0.5, 0.36, 0.2, 0, 0.1, 'frown', 'knit'),
  angry: f(-0.5, -0.5, 0.9, 0.3, 0.3, 0, 0.4, 'grimace', 'knit'),
  relieved: f(0.25, 0.25, -0.4, 0.45, 0.1, 0.03, 0, 'smile'),
  defeated: f(-0.2, -0.2, -0.75, 0.6, 0.1, -0.08, 0.2, 'frown'),
  thinking: f(0.3, -0.25, 0.1, 0.3, 0.15, 0.06, 0, 'tight'),
  shocked: f(1, 1, -0.25, -0.35, 0, 0, 0.1, 'open', 'arch'),
};
const LID_REST = MOODS_V2.neutral.lid;
const LASH_REST = LASH0 + LID_REST * TRAVEL;
/** Décalage des lignes de cils dessinées (repos dessiné : cils à −11,14 et +13,96 du centre de l’œil) vers le repos réglé. */
const UP_DY = LASH_REST - EYE_Y + 11.14;
const LOW_DY = LOW0 - EYE_Y - 13.96;

/** Régions des couches de l’œil, en coordonnées de l’œil (origine au centre de l’œil, y vers le bas, unités H). */
const LID_W = 64.6;
const UP_Y0 = LASH_REST - EYE_Y - 34;
const UP_H = 50;
const LOW_Y0 = LOW0 - EYE_Y - 16;
const LOW_H = 34;
const SHUT_Y0 = 116 - EYE_Y;
const SHUT_H = 68;
const SCLERA_W = 0.27 * HX;
const SCLERA_H = 0.2 * HY;
const IRIS_D = 0.13 * HX;
const BROW_W = 0.32 * HX;
const BROW_H = 0.1 * HY;
const BROW_Y = 0.155;
const MOUTH_W = 0.36 * HX;
const MOUTH_H = 0.18 * HY;
const FLUSH_W = 0.75 * HX;
const FLUSH_H = 0.22 * HY;
/** Capuche et pèlerine : rectangle H couvert par leur plan (plus grand que la capuche V1, pour la pèlerine). */
const HOOD_BOX = { u0: -96, v0: -44, u1: 352, v1: 424 };
const HOOD_SCALE = 0.75;
/** Buste V1 (2,7 × 2,1 sous le cou, hors échelle de la tête) exprimé en espace H au repos. */
const TORSO_A = { sx: (1.34 / HX) / (2.7 / 384), tx: 192 - 128 * ((1.34 / HX) / (2.7 / 384)), sy: (1.34 / HY) * (320 / 2.1) };
const TORSO_TY = -((1.72 + 1.34 * (0.6 + 156 / HY)) - 1.97) / (2.1 / 320);

/** Géométrie du rig V2, en unités locales de la tête (repère du visage : centre du plan de tête). */
export const RIG_V2 = {
  sclera: { w: SCLERA_W / HX, h: SCLERA_H / HY },
  iris: IRIS_D / HX,
  gaze: { x: 0.05, y: 0.02 },
  up: { w: LID_W / HX, h: UP_H / HY, y: -(UP_Y0 + UP_H / 2) / HY },
  low: { w: LID_W / HX, h: LOW_H / HY, y: -(LOW_Y0 + LOW_H / 2) / HY },
  shut: { w: LID_W / HX, h: SHUT_H / HY, y: -(SHUT_Y0 + SHUT_H / 2) / HY },
  brow: { w: BROW_W / HX, h: BROW_H / HY, y: BROW_Y },
  mouth: { w: MOUTH_W / HX, h: MOUTH_H / HY, y: -0.3 },
  flush: { w: FLUSH_W / HX, h: FLUSH_H / HY, y: -0.12 },
  hood: { w: (HOOD_BOX.u1 - HOOD_BOX.u0) / HX, h: (HOOD_BOX.v1 - HOOD_BOX.v0) / HY, y: 0.6 + (156 - (HOOD_BOX.v0 + HOOD_BOX.v1) / 2) / HY },
  /** Déplacement (unités locales, vers le bas) de la ligne de cils supérieure pour une valeur de paupière. */
  lidShift(lid: number): number { return ((lid >= 0 ? LASH0 + lid * TRAVEL : LASH0 + lid * TRAVEL_UP) - LASH_REST) / HY; },
  /** Montée (unités locales) de la paupière inférieure pour un plissement. */
  squintShift(squint: number): number { return (squint * SQUINT) / HY; },
};

// ---------------------------------------------------------------------------------------------------------------
// Palette d’identité de Maëlle (verts de la Ronce, peau hâlée, cheveux brun sombre, laiton)

const C = {
  skinHi: '#e6b48e', skin: '#cb906b', skinShade: '#a8694d', skinDeep: '#83493a', blush: '#d4705e',
  line: '#3e1c13', lineSoft: '#6e3527', freckle: '#8a4630',
  hair: '#3b2a1a', hairShade: '#25180f', hairDeep: '#150c07', hairHi: '#6c4b2d', hairSheen: '#a07848', hairRim: '#c89c66',
  hood: '#1f5230', hoodLight: '#2e7140', hoodHi: '#56a35a', hoodShade: '#133821', hoodDeep: '#0a2013',
  lining: '#0b1610', liningHi: '#1c3324', trim: '#d4ec7a', trimDeep: '#86a845',
  cloak: '#163522', cloakShade: '#0c2215', cloakHi: '#2b5a37',
  tunic: '#4a3220', tunicShade: '#2c1d11', leather: '#5c3b22', leatherHi: '#94663c',
  bronze: '#b48a3c', bronzeHi: '#f2d690', bronzeDeep: '#5e4218',
  sclera: '#f4ede6', scleraShade: '#b9a39a', caruncle: '#d68a7e', lash: '#190d09', lashSoft: '#4a2a1c',
  iris: '#4f9a4a', irisDeep: '#173419', irisLight: '#a3d47a', irisAmber: '#cfa64c', pupil: '#0a0806',
  brow: '#3a2616', browHi: '#7a5534',
  lipUp: '#9c4b3f', lipLow: '#b8604f', lipHi: '#e09a82', mouthIn: '#3a1110', teeth: '#f2eadf', teethShade: '#cfc2b4', tongue: '#b04a44',
};

// ---------------------------------------------------------------------------------------------------------------
// Outils de tracé

function canvas(w: number, h: number, res = RES): { c: HTMLCanvasElement; ctx: Ctx } {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * res));
  c.height = Math.max(1, Math.round(h * res));
  const ctx = c.getContext('2d')!;
  ctx.scale(c.width / w, c.height / h);
  return { c, ctx };
}

const P = (d: string): Path2D => new Path2D(d);

function fill(ctx: Ctx, p: Path2D | string, style: string | CanvasGradient, alpha = 1): void {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = style;
  ctx.fill(typeof p === 'string' ? P(p) : p);
  ctx.restore();
}

function stroke(ctx: Ctx, p: Path2D | string, style: string, width: number, alpha = 1): void {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = style;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke(typeof p === 'string' ? P(p) : p);
  ctx.restore();
}

function clipped(ctx: Ctx, p: Path2D | string, draw: () => void): void {
  ctx.save();
  ctx.clip(typeof p === 'string' ? P(p) : p);
  draw();
  ctx.restore();
}

function at(c: Cubic, t: number): [number, number, number, number] {
  const u = 1 - t;
  const x = u * u * u * c[0] + 3 * u * u * t * c[2] + 3 * u * t * t * c[4] + t * t * t * c[6];
  const y = u * u * u * c[1] + 3 * u * u * t * c[3] + 3 * u * t * t * c[5] + t * t * t * c[7];
  const dx = 3 * u * u * (c[2] - c[0]) + 6 * u * t * (c[4] - c[2]) + 3 * t * t * (c[6] - c[4]);
  const dy = 3 * u * u * (c[3] - c[1]) + 6 * u * t * (c[5] - c[3]) + 3 * t * t * (c[7] - c[5]);
  return [x, y, dx, dy];
}

/** Trait d’encre effilé le long d’une cubique : largeur w0 au départ, wm au milieu, w1 à l’arrivée. */
function taper(ctx: Ctx, c: Cubic, w0: number, wm: number, w1: number, style: string, alpha = 1, n = 22): void {
  const wc = 2 * wm - 0.5 * (w0 + w1);
  const left: number[] = [];
  const right: number[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const [x, y, dx, dy] = at(c, t);
    const len = Math.hypot(dx, dy) || 1;
    const w = Math.max(0, (1 - t) * (1 - t) * w0 + 2 * t * (1 - t) * wc + t * t * w1) / 2;
    left.push(x - (dy / len) * w, y + (dx / len) * w);
    right.push(x + (dy / len) * w, y - (dx / len) * w);
  }
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = style;
  ctx.beginPath();
  ctx.moveTo(left[0]!, left[1]!);
  for (let i = 2; i < left.length; i += 2) ctx.lineTo(left[i]!, left[i + 1]!);
  for (let i = right.length - 2; i >= 0; i -= 2) ctx.lineTo(right[i]!, right[i + 1]!);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Chaîne de cubiques [x0, y0, (c1x, c1y, c2x, c2y, x, y)…] → segments. */
function chain(pts: number[]): Cubic[] {
  const out: Cubic[] = [];
  for (let i = 2; i + 5 < pts.length; i += 6) out.push([pts[i - 2]!, pts[i - 1]!, pts[i]!, pts[i + 1]!, pts[i + 2]!, pts[i + 3]!, pts[i + 4]!, pts[i + 5]!]);
  return out;
}

function chainPath(segs: Cubic[], close = true, p = new Path2D()): Path2D {
  p.moveTo(segs[0]![0], segs[0]![1]);
  for (const s of segs) p.bezierCurveTo(s[2], s[3], s[4], s[5], s[6], s[7]);
  if (close) p.closePath();
  return p;
}

/** Points régulièrement espacés (abscisse curviligne) le long d’une chaîne, avec leur normale. */
function along(segs: Cubic[], step: number): Array<{ x: number; y: number; nx: number; ny: number }> {
  const fine: Array<[number, number, number, number]> = [];
  for (const s of segs) for (let i = 0; i < 40; i++) fine.push(at(s, i / 40));
  const out: Array<{ x: number; y: number; nx: number; ny: number }> = [];
  let acc = step;
  for (let i = 1; i < fine.length; i++) {
    const [x0, y0] = fine[i - 1]!;
    const [x1, y1, dx, dy] = fine[i]!;
    acc += Math.hypot(x1 - x0, y1 - y0);
    if (acc >= step) {
      acc = 0;
      const len = Math.hypot(dx, dy) || 1;
      out.push({ x: x1, y: y1, nx: -dy / len, ny: dx / len });
    }
  }
  return out;
}

/** Bande le long d’un bord : la forme moins sa copie décalée (reflet ou ombre de bord, en aplat). */
function edgeBand(ctx: Ctx, p: Path2D, dx: number, dy: number, style: string, alpha: number, box: [number, number, number, number]): void {
  const [u0, v0, u1, v1] = box;
  const { c, ctx: t } = canvas(u1 - u0, v1 - v0);
  t.translate(-u0, -v0);
  t.fillStyle = style;
  t.fill(p);
  t.globalCompositeOperation = 'destination-out';
  t.translate(dx, dy);
  t.fill(p);
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.drawImage(c, u0, v0, u1 - u0, v1 - v0);
  ctx.restore();
}

function mirrored(ctx: Ctx, cx: number, draw: () => void): void {
  ctx.save();
  ctx.translate(2 * cx, 0);
  ctx.scale(-1, 1);
  draw();
  ctx.restore();
}

function translatedPath(d: string, dx: number, dy: number): Path2D {
  const p = new Path2D();
  p.addPath(P(d), new DOMMatrix([1, 0, 0, 1, dx, dy]));
  return p;
}

// ---------------------------------------------------------------------------------------------------------------
// Formes principales (espace H)

const FACE = 'M128,52 C96,52 62,62 52,96 C46,118 46,142 47,160 C48,180 52,204 64,226 C74,242 98,258 116,266 C122,269 134,269 140,266 C158,258 182,242 192,226 C204,204 208,180 209,160 C210,142 210,118 204,96 C194,62 160,52 128,52 Z';
/** Ouverture de la capuche (bord intérieur), qui se croise sous le menton, à l’agrafe. */
const RIM_IN = chain([128, 6, 82, 8, 34, 46, 22, 118, 14, 168, 26, 222, 60, 262, 82, 284, 106, 294, 128, 296, 150, 294, 174, 284, 196, 262, 230, 222, 242, 168, 234, 118, 222, 46, 174, 8, 128, 6]);
const RIM_OUT = chain([128, -10, 72, -8, 18, 36, 6, 116, -2, 170, 10, 230, 48, 276, 76, 302, 106, 312, 128, 314, 150, 312, 180, 302, 208, 276, 246, 230, 258, 170, 250, 116, 238, 36, 184, -8, 128, -10]);
const RIM_MID = RIM_IN.map((s, i) => s.map((v, k) => (v + RIM_OUT[i]![k]!) / 2) as Cubic);
const CLASP = { x: 128, y: 294 };

/** Mèches avant : frange courte écartée par la raie (les sourcils restent visibles, même haussés), pans le long des joues. */
const LEFT_FRONT = 'M127,22 C104,22 80,30 64,46 C48,62 38,86 34,112 C30,146 32,186 38,220 C42,244 48,264 56,282 C56,262 56,244 54,226 C52,206 48,186 47,166 C46,146 46,124 49,106 C52,94 58,84 68,76 C68,84 67,90 63,97 C73,86 82,76 93,68 C90,76 89,82 90,88 C97,74 107,62 118,54 C122,50 125,45 127,40 Z';
const RIGHT_FRONT = 'M129,22 C152,22 176,30 192,46 C208,62 218,86 222,112 C226,146 224,182 218,212 C214,232 208,250 204,266 C202,250 204,232 205,216 C207,196 209,178 209,160 C209,140 209,122 206,106 C203,94 197,84 188,76 C188,84 189,90 193,97 C183,86 174,76 163,68 C166,76 167,82 166,88 C159,74 149,62 138,54 C134,50 131,45 129,40 Z';

// ---------------------------------------------------------------------------------------------------------------
// Tête : cheveux arrière, cou, visage et son modelé (les mèches avant sont une couche à part, au-dessus des yeux)

function drawHead(seed: number): HTMLCanvasElement {
  const { c, ctx } = canvas(256, 312);
  const rimIn = chainPath(RIM_IN);
  // Cheveux arrière, dans l’ouverture de la capuche : sombres vers le bord (occlusion), plus clairs au sommet.
  clipped(ctx, rimIn, () => {
    const back = P('M128,16 C70,14 30,56 26,118 C22,172 34,226 64,268 C76,284 90,292 104,298 L152,298 C166,292 180,284 192,268 C222,226 234,172 230,118 C226,56 186,14 128,16 Z');
    fill(ctx, back, C.hair);
    clipped(ctx, back, () => {
      fill(ctx, 'M128,0 L300,0 L300,320 L128,320 Z', C.hairShade, 0.55);
      stroke(ctx, rimIn, C.hairDeep, 26, 0.75);
      fill(ctx, 'M60,250 C80,276 100,290 128,296 C156,290 176,276 196,250 L200,320 L56,320 Z', C.hairDeep, 0.6);
      for (const s of [[96, 22, 60, 40, 40, 90, 38, 150], [160, 22, 196, 40, 216, 90, 218, 150], [72, 40, 44, 80, 34, 140, 40, 210], [184, 40, 212, 80, 222, 140, 216, 210]] as Cubic[]) taper(ctx, s, 0.2, 1.1, 0.2, C.hairDeep, 0.7);
      taper(ctx, [116, 20, 96, 22, 78, 30, 64, 42], 0, 2.4, 0, C.hairHi, 0.7);
    });
    // Cou, dans l’ombre de la tête ; flanc gauche éclairé ; base dans l’ombre du col.
    const neck = P('M100,212 C102,246 100,276 92,308 L164,308 C156,276 154,246 156,212 Z');
    fill(ctx, neck, C.skinShade);
    clipped(ctx, neck, () => {
      fill(ctx, 'M98,262 C103,278 101,294 96,308 L118,308 C114,292 108,276 102,262 Z', C.skin, 0.9);
      const base = ctx.createLinearGradient(0, 274, 0, 297);
      base.addColorStop(0, 'rgba(70,30,22,0)');
      base.addColorStop(1, 'rgba(70,30,22,0.55)');
      fill(ctx, 'M80,280 L176,280 L176,312 L80,312 Z', base);
      taper(ctx, [106, 234, 110, 256, 116, 280, 124, 302], 0.2, 0.9, 0.2, C.lineSoft, 0.35);
      taper(ctx, [150, 234, 148, 256, 144, 280, 136, 302], 0.2, 1.1, 0.2, C.skinDeep, 0.4);
    });
  });

  // Visage : aplat de base, puis modelé en aplats découpés dans la silhouette.
  const face = P(FACE);
  fill(ctx, face, C.skin);
  clipped(ctx, face, () => {
    // Plan d’ombre du côté droit : tempe, pommette, creux sous la pommette, mâchoire.
    fill(ctx, 'M196,64 C204,100 200,128 204,150 C206,164 198,178 186,190 C178,198 172,210 170,224 C168,240 160,256 146,268 L250,300 L250,40 Z', C.skinShade);
    // Ombres portées des mèches et de la frange (lumière en haut à gauche → décalage vers le bas et la droite).
    fill(ctx, translatedPath(LEFT_FRONT, 3, 5), C.skinShade, 0.8);
    fill(ctx, translatedPath(RIGHT_FRONT, 2, 5), C.skinDeep, 0.55);
    // Orbites : ombre douce sous l’arcade, côté nez.
    for (const [i, cx] of EYE_CX.entries()) {
      const s = i === 0 ? 1 : -1;
      const g = ctx.createRadialGradient(cx + s * 6, 140, 2, cx + s * 4, 142, 30);
      g.addColorStop(0, 'rgba(130,70,50,0.32)');
      g.addColorStop(1, 'rgba(130,70,50,0)');
      fill(ctx, 'M0,100 L256,100 L256,180 L0,180 Z', g);
    }
    // Creux sous la pommette gauche, côté éclairé (fin croissant).
    fill(ctx, 'M56,188 C64,198 72,212 76,228 C68,216 60,206 54,200 Z', C.skinShade, 0.7);
    // Nez : plan d’ombre à droite de l’arête, dessous du nez, narines ; reflets de l’arête et de la pointe.
    fill(ctx, 'M134,148 C138,164 142,180 147,191 C146,198 139,201 132,199 C137,190 137,174 132,158 Z', C.skinShade);
    fill(ctx, 'M115,200 C121,205 135,206 143,201 C139,208 120,208 115,200 Z', C.skinDeep, 0.85);
    fill(ctx, 'M117.5,199.6 C118.6,197.6 121.6,197.2 123.4,199 C121.6,200.6 119.2,200.8 117.5,199.6 Z', C.line, 0.75);
    fill(ctx, 'M138.5,199.6 C137.4,197.6 134.4,197.2 132.6,199 C134.4,200.6 136.8,200.8 138.5,199.6 Z', C.line, 0.75);
    fill(ctx, 'M125.4,160 C124.6,170 123.8,180 124.8,188 C126.2,181 127.2,171 127.8,161 Z', C.skinHi, 0.75);
    fill(ctx, 'M121,192.5 C122.8,189.8 127.4,189.4 129.6,191.6 C127.6,193.6 123.4,194 121,192.5 Z', C.skinHi, 0.85);
    taper(ctx, [117.5, 192, 114, 195, 114.8, 199.4, 118.6, 201], 0.4, 1.3, 0.5, C.lineSoft, 0.8);
    // Sillon sous-nasal, ombre sous la lèvre inférieure, menton.
    taper(ctx, [124.6, 205, 124.2, 208, 124.4, 211, 125, 214], 0.2, 0.9, 0.2, C.skinShade, 0.6);
    taper(ctx, [131.4, 205, 131.8, 208, 131.6, 211, 131, 214], 0.2, 0.9, 0.2, C.skinShade, 0.8);
    fill(ctx, 'M117,236 C123,240.4 133,240.4 140,236 C136,242.6 122,243 117,236 Z', C.skinShade, 0.9);
    fill(ctx, 'M117,256 C121,253 130,253 134,256.6 C129,259.4 121,259.4 117,256 Z', C.skinHi, 0.5);
    // Reflets : pommette gauche, front.
    fill(ctx, 'M54,170 C61,166 71,165.4 80,168 C71,169 63,171.4 56,175 Z', C.skinHi, 0.4);
    fill(ctx, 'M84,72 C94,67 110,66 122,69 C110,72 96,75 88,80 Z', C.skinHi, 0.22);
    // Joues : rose discret (permanent), puis taches de rousseur sur l’arête du nez et les pommettes.
    for (const [cx, a] of [[76, 0.3], [182, 0.22]] as const) {
      const g = ctx.createRadialGradient(cx, 190, 2, cx, 190, 22);
      g.addColorStop(0, `rgba(212,112,94,${a})`);
      g.addColorStop(1, 'rgba(212,112,94,0)');
      fill(ctx, 'M0,160 L256,160 L256,220 L0,220 Z', g);
    }
    const rng = makeRng(hashString(`maelle-v2|freckles|${seed}`));
    for (let i = 0; i < 46; i++) {
      const s = rng() < 0.5 ? -1 : 1;
      const d = Math.pow(rng(), 0.8) * 58; // plus denses près de l’arête du nez
      const x = 128 + s * (6 + d);
      const y = 172 + d * 0.16 + rng() * 14 - (d < 14 ? 8 : 0);
      if (Math.abs(x - 128) < 9 && y > 186) continue; // pas sur la pointe du nez
      const r = 0.55 + rng() * 0.75;
      ctx.save();
      ctx.globalAlpha = 0.45 + rng() * 0.35;
      ctx.fillStyle = C.freckle;
      ctx.beginPath();
      ctx.ellipse(x, y, r * 1.15, r * 0.9, rng() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  });
  // Contour d’encre effilé : fin du côté éclairé, appuyé sous la mâchoire et du côté de l’ombre.
  const contour: Array<[Cubic, number, number, number]> = [
    [[47, 150, 47, 168, 49, 186, 52, 200], 0.4, 0.9, 1.1],
    [[52, 200, 55, 210, 59, 219, 64, 226], 1.1, 1.3, 1.5],
    [[64, 226, 74, 242, 98, 258, 116, 266], 1.5, 1.8, 1.5],
    [[116, 266, 122, 269, 134, 269, 140, 266], 1.5, 1.9, 1.8],
    [[140, 266, 158, 258, 182, 242, 192, 226], 1.8, 2.4, 2.4],
    [[192, 226, 204, 204, 208, 180, 209, 150], 2.4, 2.1, 1.0],
  ];
  for (const [s, a, b, d] of contour) taper(ctx, s, a, b, d, C.line, 0.85);
  // L’agrafe de la capuche passe devant le cou.
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(CLASP.x, CLASP.y, 15.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  return c;
}

// ---------------------------------------------------------------------------------------------------------------
// Mèches avant et frange (couche au-dessus des yeux et des sourcils)

function drawFront(): HTMLCanvasElement {
  const { c, ctx } = canvas(256, 312);
  const box: [number, number, number, number] = [0, 0, 256, 312];
  const left = P(LEFT_FRONT);
  const right = P(RIGHT_FRONT);
  // Masse gauche (côté de la lumière).
  fill(ctx, left, C.hair);
  clipped(ctx, left, () => {
    edgeBand(ctx, left, -5, -3, C.hairShade, 0.9, box);
    edgeBand(ctx, left, 3, 2, C.hairHi, 0.75, box);
    const sheen: Array<[Cubic, number]> = [
      [[118, 30, 104, 34, 92, 42, 82, 52], 2.8], [[110, 40, 98, 46, 88, 56, 80, 68], 2.2], [[100, 52, 90, 60, 82, 70, 76, 82], 1.6],
      [[40, 120, 36, 150, 37, 182, 42, 214], 2.2], [[46, 226, 48, 240, 51, 254, 54, 268], 1.4],
    ];
    for (const [s, w] of sheen) taper(ctx, s, 0, w, 0, C.hairSheen, 0.85);
    const strands: Cubic[] = [[122, 28, 98, 34, 76, 54, 62, 84], [114, 44, 96, 54, 82, 72, 74, 96], [64, 52, 46, 80, 38, 120, 38, 160], [58, 92, 46, 130, 44, 180, 50, 230], [50, 160, 50, 200, 52, 240, 56, 280]];
    for (const s of strands) taper(ctx, s, 0.2, 0.9, 0.2, C.hairDeep, 0.7);
  });
  // Masse droite (côté de l’ombre) : plus sombre, liseré de contre-jour sur le bord extérieur.
  fill(ctx, right, C.hair);
  clipped(ctx, right, () => {
    fill(ctx, 'M150,0 L260,0 L260,320 L150,320 Z', C.hairShade, 0.45);
    edgeBand(ctx, right, 5, -3, C.hairShade, 0.9, box);
    edgeBand(ctx, right, -3, 0, C.hairRim, 0.55, box);
    taper(ctx, [138, 30, 150, 34, 160, 42, 168, 52], 0, 2.2, 0, C.hairHi, 0.7);
    taper(ctx, [146, 42, 156, 48, 164, 56, 170, 66], 0, 1.6, 0, C.hairHi, 0.55);
    const strands: Cubic[] = [[134, 28, 158, 34, 180, 54, 194, 84], [142, 44, 160, 54, 174, 72, 182, 96], [192, 52, 210, 80, 218, 120, 218, 160], [198, 92, 210, 130, 212, 180, 208, 226]];
    for (const s of strands) taper(ctx, s, 0.2, 0.9, 0.2, C.hairDeep, 0.75);
  });
  // Raie : la peau du crâne en fine encoche.
  fill(ctx, 'M127.2,23 L128.8,23 L128.5,38 L127.5,38 Z', C.skinShade, 0.85);
  // Encre sur les bords qui passent devant le visage.
  for (const s of [[49, 106, 46, 124, 46, 146, 47, 166], [47, 166, 48, 186, 52, 206, 54, 226], [68, 76, 68, 84, 67, 90, 63, 97], [93, 68, 90, 76, 89, 82, 90, 88]] as Cubic[]) taper(ctx, s, 0.3, 1.1, 0.3, C.hairDeep, 0.9);
  for (const s of [[206, 106, 209, 122, 209, 140, 209, 160], [209, 160, 209, 178, 207, 196, 205, 216], [188, 76, 188, 84, 189, 90, 193, 97], [163, 68, 166, 76, 167, 82, 166, 88]] as Cubic[]) taper(ctx, s, 0.3, 1.2, 0.3, C.hairDeep, 0.9);
  // Mèche folle sur le front, du côté de la lumière.
  taper(ctx, [117, 40, 110, 56, 105, 74, 104, 94], 0.6, 2.6, 0.2, C.hair, 1);
  taper(ctx, [116, 44, 110, 58, 106, 72, 105, 86], 0, 0.9, 0, C.hairSheen, 0.7);
  return c;
}

// ---------------------------------------------------------------------------------------------------------------
// Capuche, pèlerine, agrafe et tresse (plan derrière la tête, devant le buste)

function hoodOuter(): Path2D {
  const p = new Path2D();
  p.moveTo(134, -38);
  p.bezierCurveTo(118, -32, 82, -22, 58, -2);
  p.bezierCurveTo(22, 28, 0, 78, -10, 140);
  p.bezierCurveTo(-16, 186, -16, 232, -26, 268);
  p.bezierCurveTo(-38, 300, -56, 326, -62, 350);
  hem(p, [-62, 350, -52, 380, 20, 396, 72, 388], 5);
  p.bezierCurveTo(88, 362, 108, 326, 122, 306);
  p.lineTo(134, 306);
  p.bezierCurveTo(148, 326, 168, 362, 184, 388);
  hem(p, [184, 388, 236, 396, 308, 380, 318, 350], 5);
  p.bezierCurveTo(312, 326, 294, 300, 282, 268);
  p.bezierCurveTo(272, 232, 272, 186, 266, 140);
  p.bezierCurveTo(256, 78, 234, 28, 198, -2);
  p.bezierCurveTo(176, -20, 150, -32, 134, -38);
  p.closePath();
  return p;
}

/** Ourlet de la pèlerine découpé en feuilles pointues (crans), le long d’une cubique de base. */
function hem(p: Path2D, base: Cubic, n: number, depth = 11): void {
  for (let i = 0; i < n; i++) {
    const [x0, y0] = at(base, i / n);
    const [x1, y1] = at(base, (i + 1) / n);
    const [xm, ym, dx, dy] = at(base, (i + 0.5) / n);
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    // normale orientée vers le bas (extérieur de la pèlerine)
    let nx = -uy;
    let ny = ux;
    if (ny < 0) { nx = -nx; ny = -ny; }
    const tx = xm + nx * depth + ux * 2;
    const ty = ym + ny * depth + uy * 2;
    p.bezierCurveTo(x0 + (xm - x0) * 0.4 + nx * 2, y0 + (ym - y0) * 0.4 + ny * 2, tx - ux * 5 - nx * 2, ty - uy * 5 - ny * 2, tx, ty);
    p.bezierCurveTo(tx - nx * 3 + ux * 1.5, ty - ny * 3 + uy * 1.5, x1 - (x1 - xm) * 0.3 + nx, y1 - (y1 - ym) * 0.3 + ny, x1, y1);
  }
}

function drawHood(): HTMLCanvasElement {
  const B = HOOD_BOX;
  const { c, ctx } = canvas((B.u1 - B.u0) * HOOD_SCALE, (B.v1 - B.v0) * HOOD_SCALE);
  ctx.scale(HOOD_SCALE, HOOD_SCALE);
  ctx.translate(-B.u0, -B.v0);
  const box: [number, number, number, number] = [B.u0, B.v0, B.u1, B.v1];
  const outer = hoodOuter();
  const rimIn = chainPath(RIM_IN);
  const rimOut = chainPath(RIM_OUT);
  // Étoffe extérieure : aplat, plan éclairé à gauche, plan d’ombre à droite, plis.
  fill(ctx, outer, C.hood);
  clipped(ctx, outer, () => {
    fill(ctx, 'M60,-6 C24,24 2,74 -8,138 C-14,184 -16,230 -26,268 C-40,300 -56,326 -62,350 L-30,366 C-20,320 -6,280 4,236 C12,190 18,140 30,96 C40,56 52,24 70,-4 Z', C.hoodLight);
    taper(ctx, [56, 2, 30, 36, 14, 86, 6, 138], 0, 4.5, 0, C.hoodHi, 0.6);
    taper(ctx, [2, 170, -2, 210, -10, 246, -20, 276], 0, 3, 0, C.hoodHi, 0.4);
    fill(ctx, 'M168,-30 C214,-6 244,46 256,110 C266,166 270,224 284,266 C296,300 316,330 324,356 L360,430 L232,430 C250,380 262,330 262,280 C262,220 252,150 236,96 C220,44 196,4 168,-30 Z', C.hoodShade);
    for (const [s, w, col, a] of [
      [[14, 70, 4, 110, -2, 160, -6, 210], 3, C.hoodShade, 0.8], [[246, 60, 256, 116, 260, 170, 264, 222], 3.5, C.hoodDeep, 0.7],
      [[-22, 268, -32, 292, -46, 318, -56, 344], 3, C.hoodDeep, 0.5], [[280, 268, 290, 292, 304, 318, 312, 344], 3, C.hoodDeep, 0.65],
      [[-6, 300, -10, 330, -14, 356, -18, 384], 4, C.hoodShade, 0.75], [[30, 318, 28, 344, 30, 366, 34, 390], 3.5, C.hoodShade, 0.6],
      [[226, 318, 228, 344, 226, 366, 222, 392], 3.5, C.hoodDeep, 0.6], [[268, 300, 272, 330, 276, 356, 280, 382], 4, C.hoodDeep, 0.7],
    ] as Array<[Cubic, number, string, number]>) taper(ctx, s, 0, w, 0, col, a);
    // Ombre portée par le revers de la capuche (vers le bas et la droite).
    ctx.save();
    ctx.translate(4, 5);
    stroke(ctx, rimOut, C.hoodDeep, 10, 0.4);
    ctx.restore();
    // Bas de la pèlerine dans l’ombre de la table et du buste.
    const g = ctx.createLinearGradient(0, 330, 0, 400);
    g.addColorStop(0, 'rgba(6,18,10,0)');
    g.addColorStop(1, 'rgba(6,18,10,0.55)');
    fill(ctx, 'M-100,320 L360,320 L360,430 L-100,430 Z', g);
  });
  // Doublure, dans l’ouverture : très sombre, lumière rasante sur le bord gauche.
  fill(ctx, rimIn, C.lining);
  fill(ctx, 'M22,118 C30,60 76,12 128,8 C88,20 48,62 36,120 C30,170 36,226 62,268 C40,236 18,180 22,118 Z', C.liningHi, 0.8);
  // Revers (bord de la capuche) : bande claire, ombrée à droite, liseré et broderie de ronces.
  const band = new Path2D();
  band.addPath(rimOut);
  band.addPath(rimIn);
  ctx.save();
  ctx.fillStyle = C.hoodLight;
  ctx.fill(band, 'evenodd');
  ctx.clip(band, 'evenodd');
  fill(ctx, 'M150,-16 C202,-2 246,50 256,116 C264,182 246,248 206,292 L170,330 L360,330 L360,-30 Z', C.hood);
  fill(ctx, 'M60,-4 C30,24 12,70 8,118 L22,118 C26,74 44,34 74,8 Z', C.hoodHi, 0.5);
  stroke(ctx, rimIn, C.hoodDeep, 5, 0.75);
  ctx.restore();
  vine(ctx, RIM_MID, 15);
  stroke(ctx, rimOut, C.trim, 1.6, 0.9);
  stroke(ctx, rimIn, C.trimDeep, 1.1, 0.8);
  // Bords de l’ouverture de la pèlerine sous l’agrafe (le buste se voit entre eux).
  const frontEdge = (col: string) => {
    fill(ctx, 'M120,304 C106,326 88,360 72,388 L83,390 C97,364 112,334 127,310 Z', col);
    stroke(ctx, 'M83,390 C97,364 112,334 127,310', C.trim, 1.4, 0.85);
  };
  frontEdge(C.hoodLight);
  mirrored(ctx, 128, () => frontEdge(C.hood));
  // Liseré de l’ourlet et épines.
  for (const base of [[-62, 350, -52, 380, 20, 396, 72, 388], [184, 388, 236, 396, 308, 380, 318, 350]] as Cubic[]) {
    const pts = along([base], 6);
    const lp = new Path2D();
    pts.forEach((q, i) => { const y = q.y - 3; if (i === 0) lp.moveTo(q.x, y); else lp.lineTo(q.x, y); });
    stroke(ctx, lp, C.trim, 1.3, 0.8);
  }
  // Contour d’encre de la silhouette (sépare du contre-jour).
  stroke(ctx, outer, C.hoodDeep, 2.2, 0.7);
  clasp(ctx);
  braid(ctx);
  return c;
}

/** Broderie de ronces le long du revers : tige ondulée, feuilles alternées, épines. */
function vine(ctx: Ctx, mid: Cubic[], step: number): void {
  const pts = along(mid, 2);
  const stem = new Path2D();
  pts.forEach((q, i) => {
    const w = Math.sin(i * (2 * Math.PI / (step / 2))) * 2.4;
    const x = q.x + q.nx * w;
    const y = q.y + q.ny * w;
    if (i === 0) stem.moveTo(x, y); else stem.lineTo(x, y);
  });
  // la broderie s’interrompt sous l’agrafe
  ctx.save();
  ctx.beginPath();
  ctx.rect(-200, -100, 600, 600);
  ctx.arc(CLASP.x, CLASP.y, 20, 0, Math.PI * 2, true);
  ctx.clip();
  stroke(ctx, stem, C.trim, 1.1, 0.8);
  const marks = along(mid, step);
  marks.forEach((q, i) => {
    const s = i % 2 ? 1 : -1;
    const ang = Math.atan2(q.ny, q.nx) * 1;
    ctx.save();
    ctx.translate(q.x + q.nx * s * 2.6, q.y + q.ny * s * 2.6);
    ctx.rotate(ang + (s > 0 ? 0.5 : Math.PI - 0.5));
    fill(ctx, 'M0,0 C2,-2.6 6,-2.6 8,0 C6,2.6 2,2.6 0,0 Z', i % 3 === 0 ? C.trim : C.trimDeep, 0.9);
    ctx.restore();
    ctx.save();
    ctx.translate(q.x - q.nx * s * 2.2, q.y - q.ny * s * 2.2);
    ctx.rotate(ang + (s > 0 ? Math.PI : 0));
    fill(ctx, 'M0,-1.1 L3.4,0 L0,1.1 Z', C.trim, 0.85);
    ctx.restore();
  });
  ctx.restore();
}

/** Agrafe de laiton à la gorge : anneau d’épines autour de l’emblème de la Ronce, deux feuilles. */
function clasp(ctx: Ctx): void {
  const { x, y } = CLASP;
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.translate(x + s * 13, y - 2);
    ctx.scale(s, 1);
    ctx.rotate(-0.35);
    fill(ctx, 'M0,0 C4,-5 11,-6 16,-2 C11,2 5,3 0,0 Z', C.hoodHi);
    stroke(ctx, 'M1,0 C6,-1.6 10,-2 15,-2', C.hoodDeep, 0.7, 0.8);
    ctx.restore();
  }
  ctx.save();
  ctx.translate(x, y);
  for (let i = 0; i < 9; i++) {
    ctx.save();
    ctx.rotate((i / 9) * Math.PI * 2 + 0.2);
    fill(ctx, 'M-2.6,-8.6 L0,-14.6 L2.6,-8.6 Z', C.bronze);
    fill(ctx, 'M-1.2,-9 L0,-14.6 L0.6,-9 Z', C.bronzeHi, 0.6);
    ctx.restore();
  }
  ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.fillStyle = C.bronze; ctx.fill();
  ctx.lineWidth = 1; ctx.strokeStyle = C.bronzeDeep; ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, 7.2, 0, Math.PI * 2);
  ctx.fillStyle = C.hoodDeep; ctx.fill();
  ctx.beginPath(); ctx.arc(0, 0, 9, Math.PI * 1.05, Math.PI * 1.6);
  ctx.lineWidth = 1.4; ctx.strokeStyle = C.bronzeHi; ctx.globalAlpha = 0.85; ctx.stroke(); ctx.globalAlpha = 1;
  ctx.fillStyle = C.trim;
  drawEmblem(ctx, 'Ronce', 0, 0, 5.2);
  ctx.restore();
}

/** Tresse sur l’épaule gauche de Maëlle (à droite à l’écran), posée sur la pèlerine. */
function braid(ctx: Ctx): void {
  const line: Cubic = [204, 254, 214, 294, 226, 338, 229, 384];
  const n = 11;
  // Brins alternés, chacun sortant de sous le précédent (dessinés de haut en bas) ; ombre là où le suivant le recouvre.
  for (let i = 0; i < n; i++) {
    const t = 0.03 + i * 0.087;
    const [x, y, dx, dy] = at(line, t);
    const s = i % 2 ? 1 : -1;
    const w = 23 - i * 0.7;
    const h = 17 - i * 0.4;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.atan2(dy, dx) - Math.PI / 2);
    ctx.scale(s, 1);
    ctx.rotate(0.32);
    const lobe = P(`M${-w * 0.5},${-h * 0.3} C${-w * 0.3},${-h * 0.78} ${w * 0.32},${-h * 0.62} ${w * 0.5},${h * 0.02} C${w * 0.34},${h * 0.5} ${-w * 0.22},${h * 0.42} ${-w * 0.5},${-h * 0.3} Z`);
    fill(ctx, lobe, C.hair);
    clipped(ctx, lobe, () => {
      fill(ctx, `M${-w},${h * 0.12} C${-w * 0.2},${h * 0.02} ${w * 0.2},${-h * 0.05} ${w},${-h * 0.12} L${w},${h} L${-w},${h} Z`, C.hairShade, 0.85);
      taper(ctx, [-w * 0.34, -h * 0.34, -w * 0.12, -h * 0.56, w * 0.14, -h * 0.46, w * 0.36, -h * 0.12], 0, 2.6, 0, C.hairSheen, 0.8);
    });
    stroke(ctx, lobe, C.hairDeep, 1, 0.9);
    ctx.restore();
  }
  // Lien de cuir et feuille, puis la pointe de la tresse.
  const [x, y, dx, dy] = at(line, 0.97);
  const ang = Math.atan2(dy, dx) - Math.PI / 2;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  const tuft = P('M-5,0 C-6,8 -3,16 1,24 C3,16 6,8 5,0 Z');
  fill(ctx, tuft, C.hair);
  taper(ctx, [-1, 2, -2, 8, -1, 14, 1, 21], 0, 1.4, 0, C.hairSheen, 0.6);
  stroke(ctx, tuft, C.hairDeep, 0.8, 0.9);
  fill(ctx, 'M-7,-3 L7,-3 L7.6,3 L-7.6,3 Z', C.leather);
  stroke(ctx, 'M-6.6,-0.4 L6.8,-0.4', C.leatherHi, 0.8, 0.8);
  ctx.translate(7, 0);
  ctx.rotate(0.6);
  fill(ctx, 'M0,0 C3,-4 9,-4 12,0 C9,3.4 3,3.4 0,0 Z', C.hoodHi);
  stroke(ctx, 'M0.6,0 L11,0', C.hoodDeep, 0.6, 0.7);
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------------------------
// Buste (derrière la pèlerine) : manteau sombre, tunique et baudrier dans l’ouverture

function drawTorso(): HTMLCanvasElement {
  const { c, ctx } = canvas(384, 320);
  ctx.transform(TORSO_A.sx, 0, 0, TORSO_A.sy, TORSO_A.tx, TORSO_TY);
  const body = P('M100,282 C60,286 0,300 -40,318 C-66,330 -80,352 -84,384 L-88,610 L344,610 L340,384 C336,352 322,330 296,318 C256,300 196,286 156,282 Z');
  fill(ctx, body, C.cloak);
  clipped(ctx, body, () => {
    fill(ctx, 'M-84,384 C-80,352 -66,330 -40,318 C-56,336 -66,358 -70,392 L-72,610 L-90,610 Z', C.cloakHi, 0.9);
    fill(ctx, 'M262,300 C300,316 330,340 340,384 L344,610 L270,610 C280,500 280,400 262,300 Z', C.cloakShade, 0.8);
    fill(ctx, 'M106,292 L150,292 L204,440 L52,440 Z', C.tunic);
    fill(ctx, 'M128,292 L150,292 L204,440 L128,440 Z', C.tunicShade, 0.6);
    taper(ctx, [128, 300, 128, 330, 128, 360, 128, 400], 0.4, 1.2, 0.4, C.tunicShade, 0.9);
    const strap = P('M66,326 L82,320 L182,444 L166,450 Z');
    fill(ctx, strap, C.leather);
    stroke(ctx, 'M70,327 L170,449', C.leatherHi, 0.8, 0.6);
    stroke(ctx, 'M79,322 L179,445', C.leatherHi, 0.8, 0.4);
    for (const s of [[-40, 340, -46, 380, -48, 430, -46, 480], [296, 340, 302, 380, 304, 430, 302, 480], [10, 330, 14, 370, 16, 420, 14, 470]] as Cubic[]) taper(ctx, s, 0, 4, 0, C.cloakShade, 0.8);
  });
  stroke(ctx, body, C.cloakShade, 2, 0.8);
  return c;
}

// ---------------------------------------------------------------------------------------------------------------
// Yeux : sclère (dessinée pour l’œil gauche à l’écran, coin externe à gauche), iris, paupières découpées dans la tête

function drawSclera(): HTMLCanvasElement {
  const { c, ctx } = canvas(SCLERA_W, SCLERA_H);
  ctx.translate(SCLERA_W / 2, SCLERA_H / 2);
  const almond = P('M-28,2.2 C-20,-14.6 -6,-20.6 4,-20.2 C16,-19.6 24,-10 28.2,1.2 C22,14 12,20 0,20.2 C-12,20 -22,14 -28,2.2 Z');
  fill(ctx, almond, C.sclera);
  clipped(ctx, almond, () => {
    const g = ctx.createRadialGradient(0, 4, 4, 0, 4, 30);
    g.addColorStop(0, 'rgba(185,163,154,0)');
    g.addColorStop(1, 'rgba(185,163,154,0.55)');
    fill(ctx, almond, g);
    const top = ctx.createLinearGradient(0, -20, 0, 2);
    top.addColorStop(0, 'rgba(120,80,70,0.55)');
    top.addColorStop(1, 'rgba(120,80,70,0)');
    fill(ctx, almond, top);
  });
  fill(ctx, 'M21.6,1.2 C23.4,-1.6 26.6,-1.6 28.4,1.2 C26.6,3.8 23.4,3.8 21.6,1.2 Z', C.caruncle);
  return c;
}

function drawIris(): HTMLCanvasElement {
  const D = IRIS_D;
  const { c, ctx } = canvas(D, D, 3);
  const r = D / 2;
  ctx.translate(r, r);
  const disc = P(`M${r},0 A${r},${r} 0 1 1 ${-r},0 A${r},${r} 0 1 1 ${r},0 Z`);
  fill(ctx, disc, C.irisDeep);
  fill(ctx, P(`M${r - 1.7},0 A${r - 1.7},${r - 1.7} 0 1 1 ${-(r - 1.7)},0 A${r - 1.7},${r - 1.7} 0 1 1 ${r - 1.7},0 Z`), C.iris);
  clipped(ctx, disc, () => {
    const glow = ctx.createRadialGradient(0, 3, 1, 0, 3, r);
    glow.addColorStop(0, 'rgba(163,212,122,0.85)');
    glow.addColorStop(0.55, 'rgba(163,212,122,0.25)');
    glow.addColorStop(1, 'rgba(163,212,122,0)');
    fill(ctx, disc, glow);
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2;
      const k = i % 2 ? C.irisDeep : C.irisLight;
      taper(ctx, [Math.cos(a) * 5, Math.sin(a) * 5, Math.cos(a) * 7, Math.sin(a) * 7, Math.cos(a + 0.08) * 9.5, Math.sin(a + 0.08) * 9.5, Math.cos(a + 0.1) * 12, Math.sin(a + 0.1) * 12], 0.6, 0.7, 0.1, k, 0.35);
    }
    fill(ctx, `M6.4,0 A6.4,6.4 0 1 1 -6.4,0 A6.4,6.4 0 1 1 6.4,0 Z`, C.irisAmber, 0.75);
    fill(ctx, `M4.2,0 A4.2,4.2 0 1 1 -4.2,0 A4.2,4.2 0 1 1 4.2,0 Z`, C.pupil);
    // Ombre de la paupière supérieure sur le haut de l’iris.
    fill(ctx, `M${-r - 2},${-r * 0.2} C${-r * 0.5},${-r * 0.48} ${r * 0.5},${-r * 0.48} ${r + 2},${-r * 0.2} L${r + 2},${-r - 2} L${-r - 2},${-r - 2} Z`, C.irisDeep, 0.6);
  });
  fill(ctx, 'M-8.6,-5.8 C-7.6,-8.4 -3.4,-8.6 -2.6,-5.8 C-3.6,-3.4 -7.6,-3.4 -8.6,-5.8 Z', '#ffffff', 0.95);
  fill(ctx, 'M5.4,4.8 A1.3,1.3 0 1 1 2.8,4.8 A1.3,1.3 0 1 1 5.4,4.8 Z', '#ffffff', 0.7);
  return c;
}

/** Ligne de cils supérieure au repos et ses dérivées (coordonnées de l’œil gauche, coin externe à gauche). */
const UP_LASH: Cubic[] = chain([-28, 2, -20, -8, -11, -11.3, -2, -11.2, 8, -11, 20, -7.9, 27, -0.5]);
const LOW_LASH: Cubic[] = chain([-27, 2.6, -18, 10.6, -6, 14.1, 4, 13.9, 14, 13.5, 22, 8.6, 26, 1.6]);
const SHUT_LASH: Cubic[] = chain([-28.6, 3.2, -18, 9.4, -6, 10.8, 4, 10.4, 14, 9.8, 22, 6.6, 27, 1.2]);

/** Recadre la tête autour de l’œil `side` (−1 gauche, 1 droite), y0/h en coordonnées de l’œil. */
function cropEye(head: HTMLCanvasElement, side: 0 | 1, y0: number, h: number): { c: HTMLCanvasElement; ctx: Ctx } {
  const { c, ctx } = canvas(LID_W, h);
  const k = head.width / 256;
  const x = EYE_CX[side] - LID_W / 2;
  const y = EYE_Y + y0;
  ctx.drawImage(head, x * k, y * k, LID_W * k, h * k, 0, 0, LID_W, h);
  return { c, ctx };
}

/** Repère de l’œil dans la texture recadrée : origine au centre de l’œil, coin externe à gauche pour les deux yeux. */
function eyeFrame(ctx: Ctx, side: 0 | 1, y0: number, draw: () => void): void {
  ctx.save();
  ctx.translate(LID_W / 2, -y0);
  if (side === 1) ctx.scale(-1, 1);
  draw();
  ctx.restore();
}

function fadeEdges(ctx: Ctx, w: number, h: number, sides: number, top: number, bottom: number): void {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-in';
  const gx = ctx.createLinearGradient(0, 0, w, 0);
  gx.addColorStop(0, 'rgba(0,0,0,0)');
  gx.addColorStop(sides / w, 'rgba(0,0,0,1)');
  gx.addColorStop(1 - sides / w, 'rgba(0,0,0,1)');
  gx.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gx;
  ctx.fillRect(0, 0, w, h);
  const gy = ctx.createLinearGradient(0, 0, 0, h);
  gy.addColorStop(0, top ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,1)');
  if (top) gy.addColorStop(top / h, 'rgba(0,0,0,1)');
  if (bottom) gy.addColorStop(1 - bottom / h, 'rgba(0,0,0,1)');
  gy.addColorStop(1, bottom ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,1)');
  ctx.fillStyle = gy;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function drawUpperLid(head: HTMLCanvasElement, side: 0 | 1): HTMLCanvasElement {
  const { c, ctx } = cropEye(head, side, UP_Y0, UP_H);
  eyeFrame(ctx, side, UP_Y0, () => {
    ctx.translate(0, UP_DY);
    // Tout ce qui est sous la ligne de cils est transparent : la sclère et l’iris se voient en dessous.
    const below = chainPath(UP_LASH, false);
    below.lineTo(40, -0.5); below.lineTo(40, 20); below.lineTo(-40, 20); below.lineTo(-40, 2); below.closePath();
    ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.fill(below); ctx.restore();
    // Paupière mobile un peu ombrée, pli de la paupière, puis la ligne de cils épaisse avec son départ externe.
    const lidSkin = chainPath(chain([-26, 0.6, -18, -14.4, -6, -18.6, 4, -18.2, 12, -17.8, 20, -14.6, 25, -2]), false);
    lidSkin.lineTo(27, -0.5);
    for (const s of UP_LASH.slice().reverse()) lidSkin.bezierCurveTo(s[4], s[5], s[2], s[3], s[0], s[1]);
    lidSkin.closePath();
    fill(ctx, lidSkin, C.skinShade, 0.35);
    taper(ctx, [-24, -8.6, -16, -17, -6, -19, 4, -18.6], 0.3, 1.1, 0.9, C.lineSoft, 0.6);
    taper(ctx, [4, -18.6, 12, -18.2, 19, -16, 23, -11.6], 0.9, 0.9, 0.2, C.lineSoft, 0.6);
    taper(ctx, UP_LASH[0]!, 3.2, 3.8, 3.3, C.lash);
    taper(ctx, UP_LASH[1]!, 3.3, 2.8, 1.0, C.lash);
    taper(ctx, [-26.6, 0.6, -29, -0.8, -31.4, -2.4, -33.4, -4.6], 3, 1.8, 0.2, C.lash);
    for (const [x, y, ex, ey] of [[-23, -3.8, -28, -9.4], [-18, -7.2, -21.6, -12.6], [-12.6, -9.4, -14.8, -14.6]]) {
      taper(ctx, [x!, y!, (x! + ex!) / 2 - 0.6, (y! + ey!) / 2, ex! + 0.4, ey! + 0.6, ex!, ey!], 1.2, 0.6, 0, C.lash, 0.9);
    }
  });
  fadeEdges(ctx, LID_W, UP_H, 4, 6, 0);
  return c;
}

function drawLowerLid(head: HTMLCanvasElement, side: 0 | 1): HTMLCanvasElement {
  const { c, ctx } = cropEye(head, side, LOW_Y0, LOW_H);
  eyeFrame(ctx, side, LOW_Y0, () => {
    ctx.translate(0, LOW_DY);
    const above = chainPath(LOW_LASH, false);
    above.lineTo(40, 1.6); above.lineTo(40, -20); above.lineTo(-40, -20); above.lineTo(-40, 2.6); above.closePath();
    ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.fill(above); ctx.restore();
    taper(ctx, LOW_LASH[0]!, 1.4, 1.3, 0.9, C.lashSoft, 0.85);
    taper(ctx, LOW_LASH[1]!, 0.9, 0.7, 0.2, C.lashSoft, 0.6);
    taper(ctx, [-20, 15.6, -10, 20.6, 4, 21.4, 16, 17.8], 0.1, 0.7, 0.1, C.skinShade, 0.7);
  });
  fadeEdges(ctx, LID_W, LOW_H, 4, 0, 6);
  return c;
}

function drawShutLid(head: HTMLCanvasElement, side: 0 | 1): HTMLCanvasElement {
  const { c, ctx } = cropEye(head, side, SHUT_Y0, SHUT_H);
  eyeFrame(ctx, side, SHUT_Y0, () => {
    taper(ctx, [-22, -4, -12, 2.6, 2, 4, 16, 1.4], 0.2, 1, 0.2, C.lineSoft, 0.55);
    taper(ctx, SHUT_LASH[0]!, 1, 2.8, 2.6, C.lash);
    taper(ctx, SHUT_LASH[1]!, 2.6, 2, 0.6, C.lash);
    for (const [x, y, ex, ey] of [[-24, 6.2, -27.6, 10.6], [-18, 8.6, -20.6, 13.2], [-11, 10, -12.4, 14.6]]) {
      taper(ctx, [x!, y!, (x! + ex!) / 2, (y! + ey!) / 2, ex!, ey! - 0.4, ex!, ey!], 1.1, 0.5, 0, C.lash, 0.85);
    }
  });
  fadeEdges(ctx, LID_W, SHUT_H, 4, 4, 4);
  return c;
}

// ---------------------------------------------------------------------------------------------------------------
// Sourcils (dessinés pour le sourcil gauche à l’écran : queue à gauche, tête côté nez à droite)

const BROWS: Record<BrowShape, string> = {
  rest: 'M3,14.5 C12,10 22,7.4 32,7 C44,6.6 56,8 66,9.4 C69.4,9.9 70.6,12.4 69.6,15.2 C61,14.2 51,13 41,12.8 C29,12.6 16,13.6 3,14.5 Z',
  arch: 'M3,17 C10,10.4 20,5.6 31,5 C44,4.4 56,7.2 66,10.4 C69.4,11.4 70.6,13.8 69.4,16.6 C60,14.6 50,12 40,11.2 C28,10.6 15,12.6 3,17 Z',
  knit: 'M3,12.6 C14,10.2 26,9.2 38,9.6 C50,10 60,12 67,14.4 C69.8,15.4 70.4,18 68.8,19.6 C60,17 50,15 40,14.4 C28,13.8 15,13.4 3,13.6 Z',
};

function drawBrow(shape: BrowShape): HTMLCanvasElement {
  const { c, ctx } = canvas(BROW_W, BROW_H);
  ctx.translate((BROW_W - 72) / 2, (BROW_H - 22) / 2);
  const p = P(BROWS[shape]);
  fill(ctx, p, C.brow);
  clipped(ctx, p, () => {
    for (let i = 0; i < 9; i++) {
      const x = 10 + i * 6.4;
      taper(ctx, [x, 15, x - 1.2, 12, x - 2.6, 10, x - 4.4, 7], 0, 0.9, 0, C.browHi, 0.45);
    }
    for (const x of [62, 65, 67.6]) taper(ctx, [x, 16, x - 0.4, 13, x - 1, 10.6, x - 2, 8], 0, 1, 0, C.browHi, 0.55);
  });
  return c;
}

// ---------------------------------------------------------------------------------------------------------------
// Bouches (repère : 80 × 40, centre (40, 20) = centre de la bouche)

function drawMouth(shape: MouthShape): HTMLCanvasElement {
  const { c, ctx } = canvas(MOUTH_W, MOUTH_H);
  ctx.translate((MOUTH_W - 80) / 2, (MOUTH_H - 40) / 2);
  // Dessinées à 80 × 40, agrandies de 25 % autour du centre : lisibles à 1280×720 (≈ 30 px de large).
  ctx.translate(40, 20);
  ctx.scale(1.25, 1.25);
  ctx.translate(-40, -20);
  const lips = (up: string, low: string, hi: [number, number, number]) => {
    fill(ctx, up, C.lipUp);
    fill(ctx, low, C.lipLow);
    ctx.save(); ctx.globalAlpha = 0.75; ctx.fillStyle = C.lipHi;
    ctx.beginPath(); ctx.ellipse(hi[0], hi[1], hi[2], hi[2] * 0.24, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  };
  const opening = (d: string, draw?: () => void) => {
    fill(ctx, d, C.mouthIn);
    if (draw) clipped(ctx, d, draw);
  };
  switch (shape) {
    case 'neutral':
      lips('M22,20 C27,18.6 32,16.6 36.5,17 C38.4,17.2 39.2,18 40,18 C40.8,18 41.6,17.2 43.5,17 C48,16.6 53,18.6 58,20 C52,20.6 46,20.9 40,20.9 C34,20.9 28,20.6 22,20 Z',
        'M24,20.6 C30,21.4 50,21.4 56,20.6 C53,25.6 47,27.6 40,27.6 C33,27.6 27,25.6 24,20.6 Z', [41, 24, 5]);
      taper(ctx, [21, 20.4, 28, 21, 34, 21.3, 40, 21.2], 0.6, 1.4, 1.6, C.line);
      taper(ctx, [40, 21.2, 46, 21.2, 52, 21, 59, 20.4], 1.6, 1.4, 0.6, C.line);
      taper(ctx, [21.4, 20.4, 20.8, 20.8, 20.2, 21.4, 19.6, 22], 0.9, 0.6, 0.1, C.line, 0.8);
      taper(ctx, [58.6, 20.4, 59.2, 20.8, 59.8, 21.4, 60.4, 22], 0.9, 0.6, 0.1, C.line, 0.8);
      break;
    case 'tight':
      lips('M23,20 C30,19 36,18.4 40,18.7 C44,18.4 50,19 57,20 C50,20.4 44,20.5 40,20.5 C36,20.5 30,20.4 23,20 Z',
        'M25,20.6 C32,21.1 48,21.1 55,20.6 C52,23.6 46,24.6 40,24.6 C34,24.6 28,23.6 25,20.6 Z', [41, 22.6, 4]);
      taper(ctx, [20.6, 20.2, 28, 20.7, 34, 20.8, 40, 20.7], 0.8, 1.7, 1.8, C.line);
      taper(ctx, [40, 20.7, 46, 20.6, 52, 20.4, 59.4, 19.8], 1.8, 1.7, 0.8, C.line);
      taper(ctx, [21, 20.2, 20.2, 19.6, 19.6, 19.2, 19, 18.6], 1, 0.6, 0.1, C.line, 0.85);
      taper(ctx, [59.6, 19.8, 60.4, 20.4, 61, 21, 61.6, 21.8], 0.6, 0.4, 0.1, C.lineSoft, 0.6);
      break;
    case 'smile':
      lips('M21,17.4 C28,19 34,19.4 37,19.6 C38.8,19.6 39.4,20.2 40,20.2 C40.6,20.2 41.2,19.6 43,19.6 C46,19.4 52,19 59,17.4 C54,21 47,22.6 40,22.6 C33,22.6 26,21 21,17.4 Z',
        'M25,22.4 C31,23.8 49,23.8 55,22.4 C52,26.8 46,28.4 40,28.4 C34,28.4 28,26.8 25,22.4 Z', [41, 25.2, 5]);
      taper(ctx, [19, 16.5, 26, 21.5, 33, 23, 40, 23], 0.5, 1.4, 1.6, C.line);
      taper(ctx, [40, 23, 47, 23, 54, 21.5, 61, 16.5], 1.6, 1.4, 0.5, C.line);
      taper(ctx, [18.4, 15.4, 17.6, 16.6, 17.6, 18, 18.2, 19.2], 0.2, 0.8, 0.1, C.lineSoft, 0.6);
      taper(ctx, [61.6, 15.4, 62.4, 16.6, 62.4, 18, 61.8, 19.2], 0.2, 0.8, 0.1, C.lineSoft, 0.6);
      break;
    case 'smirk':
      lips('M24,20.6 C30,19.4 35,18 38,18.2 C39.4,18.3 40.2,19 41,19 C42,18.9 43,18.2 45,18 C50,17.6 55,16.8 59,16 C54,19.6 47,21.4 41,21.4 C34,21.6 28,21.4 24,20.6 Z',
        'M26,21.6 C32,22.4 46,22 54,19.8 C52,24.6 46,26.8 40,26.6 C33,26.4 28,25 26,21.6 Z', [40, 24.4, 4.6]);
      taper(ctx, [22, 21, 30, 21.8, 36, 22, 41, 21.6], 0.6, 1.4, 1.6, C.line);
      taper(ctx, [41, 21.6, 48, 21, 54, 19, 60.4, 15.4], 1.6, 1.4, 0.4, C.line);
      taper(ctx, [61, 14.8, 62.2, 16, 62.6, 17.4, 62.2, 18.8], 0.2, 0.9, 0.1, C.lineSoft, 0.7);
      break;
    case 'frown':
      lips('M23,22.6 C28,19.6 33,17.8 37,18 C38.6,18.1 39.4,18.8 40,18.8 C40.6,18.8 41.4,18.1 43,18 C47,17.8 52,19.6 57,22.6 C52,20.8 46,20.2 40,20.2 C34,20.2 28,20.8 23,22.6 Z',
        'M25,22 C31,20.6 49,20.6 55,22 C53,26.4 47,28 40,28 C33,28 27,26.4 25,22 Z', [40, 24, 4.4]);
      taper(ctx, [21, 23.6, 28, 20.6, 34, 19.8, 40, 19.8], 0.6, 1.4, 1.6, C.line);
      taper(ctx, [40, 19.8, 46, 19.8, 52, 20.6, 59, 23.6], 1.6, 1.4, 0.6, C.line);
      taper(ctx, [21.2, 23.6, 20.6, 24.4, 20.2, 25.2, 20, 26], 0.9, 0.5, 0.1, C.line, 0.7);
      taper(ctx, [58.8, 23.6, 59.4, 24.4, 59.8, 25.2, 60, 26], 0.9, 0.5, 0.1, C.line, 0.7);
      break;
    case 'grin': {
      const o = 'M18,16 C26,19 33,20 40,20 C47,20 54,19 62,16 C57,26 49,31 40,31 C31,31 23,26 18,16 Z';
      opening(o, () => {
        fill(ctx, 'M18,16 C26,19 33,20 40,20 C47,20 54,19 62,16 L62,22 C54,24.5 47,25.4 40,25.4 C33,25.4 26,24.5 18,22 Z', C.teeth);
        fill(ctx, 'M18,21 C26,23.6 33,24.4 40,24.4 C47,24.4 54,23.6 62,21 L62,22.4 C54,24.8 47,25.6 40,25.6 C33,25.6 26,24.8 18,22.4 Z', C.teethShade, 0.8);
        for (const x of [34, 46]) stroke(ctx, `M${x},20 L${x + (x < 40 ? -0.4 : 0.4)},24.6`, C.teethShade, 0.5, 0.8);
        ctx.save(); ctx.globalAlpha = 0.85; ctx.fillStyle = C.tongue; ctx.beginPath(); ctx.ellipse(40, 30, 9, 3.4, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      });
      lips('M18,16 C25,14 33,12.8 37,13.2 C38.6,13.4 39.4,14.2 40,14.2 C40.6,14.2 41.4,13.4 43,13.2 C47,12.8 55,14 62,16 C54,19 47,20 40,20 C33,20 26,19 18,16 Z',
        'M22,24 C28,29.6 34,31.4 40,31.4 C46,31.4 52,29.6 58,24 C56,30.6 49,34.6 40,34.6 C31,34.6 24,30.6 22,24 Z', [40, 32.8, 5]);
      taper(ctx, [18, 16, 26, 19, 33, 20, 40, 20], 0.4, 1.1, 1.2, C.line);
      taper(ctx, [40, 20, 47, 20, 54, 19, 62, 16], 1.2, 1.1, 0.4, C.line);
      taper(ctx, [18, 16, 22, 24, 30, 30.6, 40, 31], 0.4, 0.9, 1, C.line, 0.7);
      taper(ctx, [40, 31, 50, 30.6, 58, 24, 62, 16], 1, 0.9, 0.4, C.line, 0.7);
      break;
    }
    case 'grimace': {
      // Dents serrées, lèvre supérieure relevée, coins tirés vers le bas et vers l’extérieur (douleur, colère).
      const o = 'M18,23 C24,17.6 32,16 40,16.4 C48,16 56,17.6 62,23 C56,26.2 48,27.4 40,27.4 C32,27.4 24,26.2 18,23 Z';
      opening(o, () => {
        fill(ctx, 'M10,10 L70,10 L70,21.2 C56,22 30,22 10,21.2 Z', C.teethShade);
        fill(ctx, 'M24,15 L56,15 L56,21.4 C48,21.9 32,21.9 24,21.4 Z', C.teeth, 0.9);
        fill(ctx, 'M10,22.4 C30,23 56,23 70,22.4 L70,32 L10,32 Z', '#a8998a');
        stroke(ctx, 'M18,21.8 C30,22.6 52,22.6 62,21.8', C.mouthIn, 1.1);
        for (const x of [32, 37, 43, 48]) stroke(ctx, `M${x},16.8 L${x},21.4`, '#a8998a', 0.5, 0.9);
      });
      lips('M16,23.4 C22,15.6 32,13.6 40,14 C48,13.6 58,15.6 64,23.4 C58,18.4 48,16.2 40,16.6 C32,16.2 22,18.4 16,23.4 Z',
        'M19,24 C26,27.8 33,28.6 40,28.6 C47,28.6 54,27.8 61,24 C56,30.4 48,32 40,32 C32,32 24,30.4 19,24 Z', [40, 30.4, 4]);
      taper(ctx, [18, 23, 24, 17.6, 32, 16, 40, 16.4], 0.8, 1.4, 1.4, C.line);
      taper(ctx, [40, 16.4, 48, 16, 56, 17.6, 62, 23], 1.4, 1.4, 0.8, C.line);
      taper(ctx, [18, 23, 24, 26.2, 32, 27.4, 40, 27.4], 0.8, 1.2, 1.3, C.line, 0.9);
      taper(ctx, [40, 27.4, 48, 27.4, 56, 26.2, 62, 23], 1.3, 1.2, 0.8, C.line, 0.9);
      taper(ctx, [16.4, 23.4, 15.4, 24.6, 14.6, 25.8, 13.6, 27.2], 1.1, 0.7, 0.1, C.line, 0.85);
      taper(ctx, [63.6, 23.4, 64.6, 24.6, 65.4, 25.8, 66.4, 27.2], 1.1, 0.7, 0.1, C.line, 0.85);
      break;
    }
    case 'open': {
      const o = 'M31,19 C34,17.4 37,16.8 40,16.8 C43,16.8 46,17.4 49,19 C49.4,24 46,29.6 40,29.8 C34,29.6 30.6,24 31,19 Z';
      opening(o, () => {
        fill(ctx, 'M31,19 C34,17.4 37,16.8 40,16.8 C43,16.8 46,17.4 49,19 L49,20.8 C46,20 43,19.8 40,19.8 C37,19.8 34,20 31,20.8 Z', C.teeth, 0.95);
        ctx.save(); ctx.globalAlpha = 0.65; ctx.fillStyle = C.tongue; ctx.beginPath(); ctx.ellipse(40, 28.4, 6, 2.6, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      });
      lips('M27,19.4 C31,16.4 35,15 38,15.2 C39,15.3 39.6,15.9 40,15.9 C40.4,15.9 41,15.3 42,15.2 C45,15 49,16.4 53,19.4 C50,18.2 46,17 40,16.9 C34,17 30,18.2 27,19.4 Z',
        'M29,22 C30.6,28.4 35,31.4 40,31.4 C45,31.4 49.4,28.4 51,22 C52,29.6 47,33.6 40,33.6 C33,33.6 28,29.6 29,22 Z', [40, 32.2, 3.6]);
      taper(ctx, [31, 19, 34, 17.4, 37, 16.8, 40, 16.8], 0.5, 0.9, 1, C.line);
      taper(ctx, [40, 16.8, 43, 16.8, 46, 17.4, 49, 19], 1, 0.9, 0.5, C.line);
      taper(ctx, [31, 19, 30.6, 24, 34, 29.6, 40, 29.8], 0.5, 1, 1.1, C.line, 0.85);
      taper(ctx, [40, 29.8, 46, 29.6, 49.4, 24, 49, 19], 1.1, 1, 0.5, C.line, 0.85);
      taper(ctx, [27, 19.4, 26.4, 19.8, 25.8, 20.2, 25.2, 20.8], 0.8, 0.5, 0.1, C.lineSoft, 0.8);
      taper(ctx, [53, 19.4, 53.6, 19.8, 54.2, 20.2, 54.8, 20.8], 0.8, 0.5, 0.1, C.lineSoft, 0.8);
      break;
    }
  }
  return c;
}

/** Rougeur : deux taches douces sur les pommettes (texture d’alpha, opacité animée par le rig). */
function drawFlush(): HTMLCanvasElement {
  const { c, ctx } = canvas(FLUSH_W, FLUSH_H);
  for (const x of [FLUSH_W / 2 - 52, FLUSH_W / 2 + 52]) {
    const g = ctx.createRadialGradient(x, FLUSH_H / 2 + 1, 2, x, FLUSH_H / 2 + 1, 26);
    g.addColorStop(0, 'rgba(226,92,80,0.95)');
    g.addColorStop(0.6, 'rgba(226,92,80,0.45)');
    g.addColorStop(1, 'rgba(226,92,80,0)');
    ctx.save();
    ctx.translate(0, FLUSH_H / 2);
    ctx.scale(1, 0.6);
    ctx.translate(0, -FLUSH_H / 2);
    fill(ctx, `M0,-20 L${FLUSH_W},-20 L${FLUSH_W},${FLUSH_H + 20} L0,${FLUSH_H + 20} Z`, g);
    ctx.restore();
  }
  return c;
}

// ---------------------------------------------------------------------------------------------------------------
// Ensemble des couches

export const MOUTHS_V2: MouthShape[] = ['neutral', 'smile', 'grin', 'frown', 'grimace', 'open', 'smirk', 'tight'];

export interface MaelleV2Art {
  head: HTMLCanvasElement;
  front: HTMLCanvasElement;
  hood: HTMLCanvasElement;
  torso: HTMLCanvasElement;
  sclera: HTMLCanvasElement;
  iris: HTMLCanvasElement;
  /** Par œil : [gauche, droite] à l’écran. */
  lidUp: [HTMLCanvasElement, HTMLCanvasElement];
  lidLow: [HTMLCanvasElement, HTMLCanvasElement];
  lidShut: [HTMLCanvasElement, HTMLCanvasElement];
  brows: Record<BrowShape, HTMLCanvasElement>;
  mouths: Record<MouthShape, HTMLCanvasElement>;
  flush: HTMLCanvasElement;
}

/** Toutes les couches de Maëlle V2 (graine d’art : placement des taches de rousseur). */
export function maelleV2Art(seed: number): MaelleV2Art {
  const head = drawHead(seed);
  return {
    head,
    front: drawFront(),
    hood: drawHood(),
    torso: drawTorso(),
    sclera: drawSclera(),
    iris: drawIris(),
    lidUp: [drawUpperLid(head, 0), drawUpperLid(head, 1)],
    lidLow: [drawLowerLid(head, 0), drawLowerLid(head, 1)],
    lidShut: [drawShutLid(head, 0), drawShutLid(head, 1)],
    brows: { rest: drawBrow('rest'), arch: drawBrow('arch'), knit: drawBrow('knit') },
    mouths: Object.fromEntries(MOUTHS_V2.map((m) => [m, drawMouth(m)])) as Record<MouthShape, HTMLCanvasElement>,
    flush: drawFlush(),
  };
}

/**
 * Portrait des affiches et des HUD composé à partir des MÊMES couches, à leur place dans le rig (expression de repos,
 * regard vers le joueur) : fenêtre carrée de l’espace H.
 */
export function drawMaelleV2Portrait(ctx: Ctx, size: number, art: MaelleV2Art, mouth: MouthShape = 'neutral'): void {
  const W = { u0: -70, v0: -34, s: 396 };
  const k = size / W.s;
  ctx.save();
  ctx.scale(k, k);
  ctx.translate(-W.u0, -W.v0);
  const put = (img: HTMLCanvasElement, u: number, v: number, w: number, h: number, mirror = false) => {
    if (mirror) { ctx.save(); ctx.translate(2 * u + w, 0); ctx.scale(-1, 1); ctx.drawImage(img, u, v, w, h); ctx.restore(); } else ctx.drawImage(img, u, v, w, h);
  };
  put(art.torso, -TORSO_A.tx / TORSO_A.sx, -TORSO_TY / TORSO_A.sy, 384 / TORSO_A.sx, 320 / TORSO_A.sy);
  put(art.hood, HOOD_BOX.u0, HOOD_BOX.v0, HOOD_BOX.u1 - HOOD_BOX.u0, HOOD_BOX.v1 - HOOD_BOX.v0);
  put(art.head, 0, 0, 256, 312);
  const n = MOODS_V2.neutral;
  EYE_CX.forEach((cx, i) => {
    const side = i as 0 | 1;
    put(art.sclera, cx - SCLERA_W / 2, EYE_Y - SCLERA_H / 2, SCLERA_W, SCLERA_H, side === 1);
    put(art.iris, cx - IRIS_D / 2, EYE_Y - IRIS_D / 2 - 0.05 * RIG_V2.gaze.y * HY, IRIS_D, IRIS_D);
    put(art.lidLow[side], cx - LID_W / 2, EYE_Y + LOW_Y0 - n.squint * SQUINT, LID_W, LOW_H);
    put(art.lidUp[side], cx - LID_W / 2, EYE_Y + UP_Y0, LID_W, UP_H);
    put(art.brows[n.brow], cx - BROW_W / 2, 156 - BROW_Y * HY - BROW_H / 2, BROW_W, BROW_H, side === 1);
  });
  put(art.mouths[mouth], 128 - MOUTH_W / 2, 156 + 0.3 * HY - MOUTH_H / 2, MOUTH_W, MOUTH_H);
  put(art.front, 0, 0, 256, 312);
  ctx.restore();
}
