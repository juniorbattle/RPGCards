/**
 * M07 L5 — socle commun des personnages « vectoriel V2 » (direction validée par le responsable sur Maëlle, 2026-10-18).
 *
 * Tracés vectoriels écrits à la main (données de chemin SVG → `Path2D`, courbes de Bézier cubiques), ombrage en
 * aplats façon illustration (lumière principale en haut à gauche, ombre propre à droite), traits d’encre effilés.
 * Aucune image, police ou modèle externe. Même architecture que V1 : couches animées séparées (yeux, paupières,
 * sourcils, bouche, rougeur) posées sur le même rig, même cadrage (visage ≈ 83 px des yeux au menton à 1280×720).
 *
 * Toutes les couches sont dessinées dans l’« espace H » : les unités du canvas de tête V1 (256 × 312, centre du
 * visage en (128, 156), yeux en y ≈ 151,5, menton en y ≈ 268). Plan arrière, buste et portrait des affiches
 * convertissent cet espace vers leur propre plan : le personnage du duel et son portrait proviennent du MÊME modèle.
 * Ce module porte ce qui est commun (rig, outils, yeux, paupières, sourcils, bouches, rougeur, portrait) ; chaque rival
 * apporte son identité dans `src/scene/v2/` (tête, mèches, plan arrière, buste, couleurs, tempérament).
 */
import type { Mood } from '../presentation/personalities';
import type { MouthShape } from './rivalTextures';

export type Ctx = CanvasRenderingContext2D;
export type Cubic = [number, number, number, number, number, number, number, number];

/** Couleurs communes (yeux, intérieur de la bouche). */
const G = { sclera: '#f4ede6', scleraShade: '#b9a39a', caruncle: '#d68a7e', mouthIn: '#3a1110', teeth: '#f2eadf', teethShade: '#cfc2b4', tongue: '#b04a44' };

// ---------------------------------------------------------------------------------------------------------------
// Espace H et géométrie du rig (unités locales de la tête = avant l’échelle HEAD_SCALE du rig)

/** Unités H par unité locale de la tête (x, y). */
export const HX = 256 / 1.15;
export const HY = 312 / 1.4;
/** Sur-échantillonnage des textures (comme la tête V1). */
export const RES = 2;
export const EYE_DX = 0.21 * HX;
export const EYE_Y = 156 - 0.02 * HY;
export const EYE_CX = [128 - EYE_DX, 128 + EYE_DX] as const;

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
  focused: f(-0.35, -0.25, 0.4, 0.28, 0.16, 0.02, 0, 'tight', 'knit'),
  confident: f(0.1, 0, 0.05, 0.28, 0.12, 0.03, 0, 'smirk'),
  smug: f(0.4, -0.1, 0.05, 0.36, 0.12, 0.06, 0, 'smirk'),
  pleased: f(0.2, 0.2, -0.1, 0.26, 0.35, 0.03, 0.15, 'smile'),
  triumphant: f(0.35, 0.35, -0.1, 0.2, 0.4, -0.03, 0.25, 'grin'),
  surprised: f(0.9, 0.85, -0.15, -0.3, 0, 0, 0, 'open', 'arch'),
  pained: f(-0.05, -0.1, -0.6, 0.38, 0.24, -0.06, 0.55, 'grimace'),
  annoyed: f(-0.3, -0.35, 0.5, 0.3, 0.14, 0, 0.1, 'frown', 'knit'),
  angry: f(-0.5, -0.5, 0.9, 0.3, 0.3, 0, 0.4, 'grimace', 'knit'),
  relieved: f(0.25, 0.25, -0.4, 0.45, 0.1, 0.03, 0, 'smile'),
  defeated: f(-0.2, -0.2, -0.75, 0.6, 0.1, -0.08, 0.2, 'frown'),
  thinking: f(0.3, -0.25, 0.1, 0.27, 0.1, 0.06, 0, 'tight'),
  shocked: f(1, 1, -0.25, -0.35, 0, 0, 0.1, 'open', 'arch'),
};
export const LID_REST = MOODS_V2.neutral.lid;
export const LASH_REST = LASH0 + LID_REST * TRAVEL;
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
export const HOOD_BOX = { u0: -96, v0: -44, u1: 352, v1: 424 };
export const HOOD_SCALE = 0.75;
/** Buste V1 (2,7 × 2,1 sous le cou, hors échelle de la tête) exprimé en espace H au repos. */
export const TORSO_A = { sx: (1.34 / HX) / (2.7 / 384), tx: 192 - 128 * ((1.34 / HX) / (2.7 / 384)), sy: (1.34 / HY) * (320 / 2.1) };
export const TORSO_TY = -((1.72 + 1.34 * (0.6 + 156 / HY)) - 1.97) / (2.1 / 320);

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
// Outils de tracé

export function canvas(w: number, h: number, res = RES): { c: HTMLCanvasElement; ctx: Ctx } {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * res));
  c.height = Math.max(1, Math.round(h * res));
  const ctx = c.getContext('2d')!;
  ctx.scale(c.width / w, c.height / h);
  return { c, ctx };
}

export const P = (d: string): Path2D => new Path2D(d);

export function fill(ctx: Ctx, p: Path2D | string, style: string | CanvasGradient, alpha = 1): void {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = style;
  ctx.fill(typeof p === 'string' ? P(p) : p);
  ctx.restore();
}

export function stroke(ctx: Ctx, p: Path2D | string, style: string, width: number, alpha = 1): void {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = style;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke(typeof p === 'string' ? P(p) : p);
  ctx.restore();
}

export function clipped(ctx: Ctx, p: Path2D | string, draw: () => void): void {
  ctx.save();
  ctx.clip(typeof p === 'string' ? P(p) : p);
  draw();
  ctx.restore();
}

export function at(c: Cubic, t: number): [number, number, number, number] {
  const u = 1 - t;
  const x = u * u * u * c[0] + 3 * u * u * t * c[2] + 3 * u * t * t * c[4] + t * t * t * c[6];
  const y = u * u * u * c[1] + 3 * u * u * t * c[3] + 3 * u * t * t * c[5] + t * t * t * c[7];
  const dx = 3 * u * u * (c[2] - c[0]) + 6 * u * t * (c[4] - c[2]) + 3 * t * t * (c[6] - c[4]);
  const dy = 3 * u * u * (c[3] - c[1]) + 6 * u * t * (c[5] - c[3]) + 3 * t * t * (c[7] - c[5]);
  return [x, y, dx, dy];
}

/** Trait d’encre effilé le long d’une cubique : largeur w0 au départ, wm au milieu, w1 à l’arrivée. */
export function taper(ctx: Ctx, c: Cubic, w0: number, wm: number, w1: number, style: string, alpha = 1, n = 22): void {
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
export function chain(pts: number[]): Cubic[] {
  const out: Cubic[] = [];
  for (let i = 2; i + 5 < pts.length; i += 6) out.push([pts[i - 2]!, pts[i - 1]!, pts[i]!, pts[i + 1]!, pts[i + 2]!, pts[i + 3]!, pts[i + 4]!, pts[i + 5]!]);
  return out;
}

export function chainPath(segs: Cubic[], close = true, p = new Path2D()): Path2D {
  p.moveTo(segs[0]![0], segs[0]![1]);
  for (const s of segs) p.bezierCurveTo(s[2], s[3], s[4], s[5], s[6], s[7]);
  if (close) p.closePath();
  return p;
}

/** Points régulièrement espacés (abscisse curviligne) le long d’une chaîne, avec leur normale. */
export function along(segs: Cubic[], step: number): Array<{ x: number; y: number; nx: number; ny: number }> {
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
export function edgeBand(ctx: Ctx, p: Path2D, dx: number, dy: number, style: string, alpha: number, box: [number, number, number, number]): void {
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

export function mirrored(ctx: Ctx, cx: number, draw: () => void): void {
  ctx.save();
  ctx.translate(2 * cx, 0);
  ctx.scale(-1, 1);
  draw();
  ctx.restore();
}

/**
 * Ombre propre du visage, adoucie (finition L5, demande du responsable : « plan d’ombre du visage moins tranché ») :
 * une demi-teinte décalée vers la lumière borde l’ombre, et les deux aplats ont le bord légèrement fondu. À dessiner
 * dans la découpe du visage : le contour reste net.
 */
export function softShade(ctx: Ctx, d: string, color: string, alpha = 1, dx = -7): void {
  ctx.save();
  ctx.filter = 'blur(2.6px)';
  fill(ctx, translatedPath(d, dx, 0), color, 0.42 * alpha);
  ctx.filter = 'blur(1.4px)';
  fill(ctx, d, color, alpha);
  ctx.restore();
}

/** Canvas du plan arrière (`HOOD_BOX`), repère réglé sur l’espace H. */
export function backCanvasH(): { c: HTMLCanvasElement; ctx: Ctx } {
  const B = HOOD_BOX;
  const r = canvas((B.u1 - B.u0) * HOOD_SCALE, (B.v1 - B.v0) * HOOD_SCALE);
  r.ctx.scale(HOOD_SCALE, HOOD_SCALE);
  r.ctx.translate(-B.u0, -B.v0);
  return r;
}

/** Canvas du buste (plan V1 2,7 × 2,1), repère réglé sur l’espace H au repos. */
export function torsoCanvasH(): { c: HTMLCanvasElement; ctx: Ctx } {
  const r = canvas(384, 320);
  r.ctx.transform(TORSO_A.sx, 0, 0, TORSO_A.sy, TORSO_A.tx, TORSO_TY);
  return r;
}

/** Boîte du plan arrière, pour `edgeBand`. */
export const BACK_BOX: [number, number, number, number] = [HOOD_BOX.u0, HOOD_BOX.v0, HOOD_BOX.u1, HOOD_BOX.v1];

export function translatedPath(d: string, dx: number, dy: number): Path2D {
  const p = new Path2D();
  p.addPath(P(d), new DOMMatrix([1, 0, 0, 1, dx, dy]));
  return p;
}

// ---------------------------------------------------------------------------------------------------------------
// Yeux : sclère (dessinée pour l’œil gauche à l’écran, coin externe à gauche), iris, paupières découpées dans la tête

function drawSclera(): HTMLCanvasElement {
  const { c, ctx } = canvas(SCLERA_W, SCLERA_H);
  ctx.translate(SCLERA_W / 2, SCLERA_H / 2);
  const almond = P('M-28,2.2 C-20,-14.6 -6,-20.6 4,-20.2 C16,-19.6 24,-10 28.2,1.2 C22,14 12,20 0,20.2 C-12,20 -22,14 -28,2.2 Z');
  fill(ctx, almond, G.sclera);
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
  fill(ctx, 'M21.6,1.2 C23.4,-1.6 26.6,-1.6 28.4,1.2 C26.6,3.8 23.4,3.8 21.6,1.2 Z', G.caruncle);
  return c;
}

function drawIris(k: FigureColors): HTMLCanvasElement {
  const D = IRIS_D;
  const { c, ctx } = canvas(D, D, 3);
  const r = D / 2;
  ctx.translate(r, r);
  const disc = P(`M${r},0 A${r},${r} 0 1 1 ${-r},0 A${r},${r} 0 1 1 ${r},0 Z`);
  fill(ctx, disc, k.irisDeep);
  fill(ctx, P(`M${r - 1.7},0 A${r - 1.7},${r - 1.7} 0 1 1 ${-(r - 1.7)},0 A${r - 1.7},${r - 1.7} 0 1 1 ${r - 1.7},0 Z`), k.iris);
  clipped(ctx, disc, () => {
    const glow = ctx.createRadialGradient(0, 3, 1, 0, 3, r);
    glow.addColorStop(0, `rgba(${k.irisGlow},0.85)`);
    glow.addColorStop(0.55, `rgba(${k.irisGlow},0.25)`);
    glow.addColorStop(1, `rgba(${k.irisGlow},0)`);
    fill(ctx, disc, glow);
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2;
      const col = i % 2 ? k.irisDeep : k.irisLight;
      taper(ctx, [Math.cos(a) * 5, Math.sin(a) * 5, Math.cos(a) * 7, Math.sin(a) * 7, Math.cos(a + 0.08) * 9.5, Math.sin(a + 0.08) * 9.5, Math.cos(a + 0.1) * 12, Math.sin(a + 0.1) * 12], 0.6, 0.7, 0.1, col, 0.35);
    }
    fill(ctx, `M6.4,0 A6.4,6.4 0 1 1 -6.4,0 A6.4,6.4 0 1 1 6.4,0 Z`, k.irisAmber, 0.75);
    fill(ctx, `M4.2,0 A4.2,4.2 0 1 1 -4.2,0 A4.2,4.2 0 1 1 4.2,0 Z`, k.pupil);
    // Ombre de la paupière supérieure sur le haut de l’iris.
    fill(ctx, `M${-r - 2},${-r * 0.2} C${-r * 0.5},${-r * 0.48} ${r * 0.5},${-r * 0.48} ${r + 2},${-r * 0.2} L${r + 2},${-r - 2} L${-r - 2},${-r - 2} Z`, k.irisDeep, 0.6);
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

function drawUpperLid(k: FigureColors, head: HTMLCanvasElement, side: 0 | 1): HTMLCanvasElement {
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
    fill(ctx, lidSkin, k.skinShade, 0.35);
    taper(ctx, [-24, -8.6, -16, -17, -6, -19, 4, -18.6], 0.3, 1.1, 0.9, k.lineSoft, 0.6);
    taper(ctx, [4, -18.6, 12, -18.2, 19, -16, 23, -11.6], 0.9, 0.9, 0.2, k.lineSoft, 0.6);
    const w = k.lashWeight ?? 1;
    taper(ctx, UP_LASH[0]!, 3.2 * w, 3.8 * w, 3.3 * w, k.lash);
    taper(ctx, UP_LASH[1]!, 3.3 * w, 2.8 * w, 1.0 * w, k.lash);
    if (k.lashWing !== false) taper(ctx, [-26.6, 0.6, -29, -0.8, -31.4, -2.4, -33.4, -4.6], 3, 1.8, 0.2, k.lash);
    if (k.lashStrands !== false) {
      for (const [x, y, ex, ey] of [[-23, -3.8, -28, -9.4], [-18, -7.2, -21.6, -12.6], [-12.6, -9.4, -14.8, -14.6]]) {
        taper(ctx, [x!, y!, (x! + ex!) / 2 - 0.6, (y! + ey!) / 2, ex! + 0.4, ey! + 0.6, ex!, ey!], 1.2, 0.6, 0, k.lash, 0.9);
      }
    }
  });
  fadeEdges(ctx, LID_W, UP_H, 4, 6, 0);
  return c;
}

function drawLowerLid(k: FigureColors, head: HTMLCanvasElement, side: 0 | 1): HTMLCanvasElement {
  const { c, ctx } = cropEye(head, side, LOW_Y0, LOW_H);
  eyeFrame(ctx, side, LOW_Y0, () => {
    ctx.translate(0, LOW_DY);
    const above = chainPath(LOW_LASH, false);
    above.lineTo(40, 1.6); above.lineTo(40, -20); above.lineTo(-40, -20); above.lineTo(-40, 2.6); above.closePath();
    ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.fill(above); ctx.restore();
    taper(ctx, LOW_LASH[0]!, 1.4, 1.3, 0.9, k.lashSoft, 0.85);
    taper(ctx, LOW_LASH[1]!, 0.9, 0.7, 0.2, k.lashSoft, 0.6);
    taper(ctx, [-20, 15.6, -10, 20.6, 4, 21.4, 16, 17.8], 0.1, 0.7, 0.1, k.skinShade, 0.7);
  });
  fadeEdges(ctx, LID_W, LOW_H, 4, 0, 6);
  return c;
}

function drawShutLid(k: FigureColors, head: HTMLCanvasElement, side: 0 | 1): HTMLCanvasElement {
  const { c, ctx } = cropEye(head, side, SHUT_Y0, SHUT_H);
  eyeFrame(ctx, side, SHUT_Y0, () => {
    taper(ctx, [-22, -4, -12, 2.6, 2, 4, 16, 1.4], 0.2, 1, 0.2, k.lineSoft, 0.55);
    const w = k.lashWeight ?? 1;
    taper(ctx, SHUT_LASH[0]!, 1 * w, 2.8 * w, 2.6 * w, k.lash);
    taper(ctx, SHUT_LASH[1]!, 2.6 * w, 2 * w, 0.6 * w, k.lash);
    if (k.lashStrands !== false) {
      for (const [x, y, ex, ey] of [[-24, 6.2, -27.6, 10.6], [-18, 8.6, -20.6, 13.2], [-11, 10, -12.4, 14.6]]) {
        taper(ctx, [x!, y!, (x! + ex!) / 2, (y! + ey!) / 2, ex!, ey! - 0.4, ex!, ey!], 1.1, 0.5, 0, k.lash, 0.85);
      }
    }
  });
  fadeEdges(ctx, LID_W, SHUT_H, 4, 4, 4);
  return c;
}

// ---------------------------------------------------------------------------------------------------------------
// Sourcils (dessinés pour le sourcil gauche à l’écran : queue à gauche, tête côté nez à droite)

/** Sourcils par défaut (Maëlle) ; un rival peut fournir les siens (mêmes trois formes, même repère 72 × 22). */
export const BROWS: Record<BrowShape, string> = {
  rest: 'M3,14.5 C12,10 22,7.4 32,7 C44,6.6 56,8 66,9.4 C69.4,9.9 70.6,12.4 69.6,15.2 C61,14.2 51,13 41,12.8 C29,12.6 16,13.6 3,14.5 Z',
  arch: 'M3,17 C10,10.4 20,5.6 31,5 C44,4.4 56,7.2 66,10.4 C69.4,11.4 70.6,13.8 69.4,16.6 C60,14.6 50,12 40,11.2 C28,10.6 15,12.6 3,17 Z',
  knit: 'M3,12.6 C14,10.2 26,9.2 38,9.6 C50,10 60,12 67,14.4 C69.8,15.4 70.4,18 68.8,19.6 C60,17 50,15 40,14.4 C28,13.8 15,13.4 3,13.6 Z',
};

function drawBrow(k: FigureColors, shapes: Record<BrowShape, string>, shape: BrowShape): HTMLCanvasElement {
  const { c, ctx } = canvas(BROW_W, BROW_H);
  ctx.translate((BROW_W - 72) / 2, (BROW_H - 22) / 2);
  const p = P(shapes[shape]);
  fill(ctx, p, k.brow);
  clipped(ctx, p, () => {
    for (let i = 0; i < 9; i++) {
      const x = 10 + i * 6.4;
      taper(ctx, [x, 15, x - 1.2, 12, x - 2.6, 10, x - 4.4, 7], 0, 0.9, 0, k.browHi, 0.45);
    }
    for (const x of [62, 65, 67.6]) taper(ctx, [x, 16, x - 0.4, 13, x - 1, 10.6, x - 2, 8], 0, 1, 0, k.browHi, 0.55);
  });
  return c;
}

// ---------------------------------------------------------------------------------------------------------------
// Bouches (repère : 80 × 40, centre (40, 20) = centre de la bouche)

function drawMouth(k: FigureColors, shape: MouthShape): HTMLCanvasElement {
  const { c, ctx } = canvas(MOUTH_W, MOUTH_H);
  ctx.translate((MOUTH_W - 80) / 2, (MOUTH_H - 40) / 2);
  // Dessinées à 80 × 40, agrandies de 25 % autour du centre : lisibles à 1280×720 (≈ 30 px de large).
  ctx.translate(40, 20);
  ctx.scale(1.25, 1.25);
  ctx.translate(-40, -20);
  const lips = (up: string, low: string, hi: [number, number, number]) => {
    fill(ctx, up, k.lipUp);
    fill(ctx, low, k.lipLow);
    ctx.save(); ctx.globalAlpha = 0.75; ctx.fillStyle = k.lipHi;
    ctx.beginPath(); ctx.ellipse(hi[0], hi[1], hi[2], hi[2] * 0.24, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  };
  const opening = (d: string, draw?: () => void) => {
    fill(ctx, d, G.mouthIn);
    if (draw) clipped(ctx, d, draw);
  };
  switch (shape) {
    case 'neutral':
      lips('M22,20 C27,18.6 32,16.6 36.5,17 C38.4,17.2 39.2,18 40,18 C40.8,18 41.6,17.2 43.5,17 C48,16.6 53,18.6 58,20 C52,20.6 46,20.9 40,20.9 C34,20.9 28,20.6 22,20 Z',
        'M24,20.6 C30,21.4 50,21.4 56,20.6 C53,25.6 47,27.6 40,27.6 C33,27.6 27,25.6 24,20.6 Z', [41, 24, 5]);
      taper(ctx, [21, 20.4, 28, 21, 34, 21.3, 40, 21.2], 0.6, 1.4, 1.6, k.line);
      taper(ctx, [40, 21.2, 46, 21.2, 52, 21, 59, 20.4], 1.6, 1.4, 0.6, k.line);
      taper(ctx, [21.4, 20.4, 20.8, 20.8, 20.2, 21.4, 19.6, 22], 0.9, 0.6, 0.1, k.line, 0.8);
      taper(ctx, [58.6, 20.4, 59.2, 20.8, 59.8, 21.4, 60.4, 22], 0.9, 0.6, 0.1, k.line, 0.8);
      break;
    case 'tight':
      lips('M23,20 C30,19 36,18.4 40,18.7 C44,18.4 50,19 57,20 C50,20.4 44,20.5 40,20.5 C36,20.5 30,20.4 23,20 Z',
        'M25,20.6 C32,21.1 48,21.1 55,20.6 C52,23.6 46,24.6 40,24.6 C34,24.6 28,23.6 25,20.6 Z', [41, 22.6, 4]);
      taper(ctx, [20.6, 20.2, 28, 20.7, 34, 20.8, 40, 20.7], 0.8, 1.7, 1.8, k.line);
      taper(ctx, [40, 20.7, 46, 20.6, 52, 20.4, 59.4, 19.8], 1.8, 1.7, 0.8, k.line);
      taper(ctx, [21, 20.2, 20.2, 19.6, 19.6, 19.2, 19, 18.6], 1, 0.6, 0.1, k.line, 0.85);
      taper(ctx, [59.6, 19.8, 60.4, 20.4, 61, 21, 61.6, 21.8], 0.6, 0.4, 0.1, k.lineSoft, 0.6);
      break;
    case 'smile':
      lips('M21,17.4 C28,19 34,19.4 37,19.6 C38.8,19.6 39.4,20.2 40,20.2 C40.6,20.2 41.2,19.6 43,19.6 C46,19.4 52,19 59,17.4 C54,21 47,22.6 40,22.6 C33,22.6 26,21 21,17.4 Z',
        'M25,22.4 C31,23.8 49,23.8 55,22.4 C52,26.8 46,28.4 40,28.4 C34,28.4 28,26.8 25,22.4 Z', [41, 25.2, 5]);
      taper(ctx, [19, 16.5, 26, 21.5, 33, 23, 40, 23], 0.5, 1.4, 1.6, k.line);
      taper(ctx, [40, 23, 47, 23, 54, 21.5, 61, 16.5], 1.6, 1.4, 0.5, k.line);
      taper(ctx, [18.4, 15.4, 17.6, 16.6, 17.6, 18, 18.2, 19.2], 0.2, 0.8, 0.1, k.lineSoft, 0.6);
      taper(ctx, [61.6, 15.4, 62.4, 16.6, 62.4, 18, 61.8, 19.2], 0.2, 0.8, 0.1, k.lineSoft, 0.6);
      break;
    case 'smirk':
      lips('M24,20.6 C30,19.4 35,18 38,18.2 C39.4,18.3 40.2,19 41,19 C42,18.9 43,18.2 45,18 C50,17.6 55,16.8 59,16 C54,19.6 47,21.4 41,21.4 C34,21.6 28,21.4 24,20.6 Z',
        'M26,21.6 C32,22.4 46,22 54,19.8 C52,24.6 46,26.8 40,26.6 C33,26.4 28,25 26,21.6 Z', [40, 24.4, 4.6]);
      taper(ctx, [22, 21, 30, 21.8, 36, 22, 41, 21.6], 0.6, 1.4, 1.6, k.line);
      taper(ctx, [41, 21.6, 48, 21, 54, 19, 60.4, 15.4], 1.6, 1.4, 0.4, k.line);
      taper(ctx, [61, 14.8, 62.2, 16, 62.6, 17.4, 62.2, 18.8], 0.2, 0.9, 0.1, k.lineSoft, 0.7);
      break;
    case 'frown':
      lips('M23,22.6 C28,19.6 33,17.8 37,18 C38.6,18.1 39.4,18.8 40,18.8 C40.6,18.8 41.4,18.1 43,18 C47,17.8 52,19.6 57,22.6 C52,20.8 46,20.2 40,20.2 C34,20.2 28,20.8 23,22.6 Z',
        'M25,22 C31,20.6 49,20.6 55,22 C53,26.4 47,28 40,28 C33,28 27,26.4 25,22 Z', [40, 24, 4.4]);
      taper(ctx, [21, 23.6, 28, 20.6, 34, 19.8, 40, 19.8], 0.6, 1.4, 1.6, k.line);
      taper(ctx, [40, 19.8, 46, 19.8, 52, 20.6, 59, 23.6], 1.6, 1.4, 0.6, k.line);
      taper(ctx, [21.2, 23.6, 20.6, 24.4, 20.2, 25.2, 20, 26], 0.9, 0.5, 0.1, k.line, 0.7);
      taper(ctx, [58.8, 23.6, 59.4, 24.4, 59.8, 25.2, 60, 26], 0.9, 0.5, 0.1, k.line, 0.7);
      break;
    case 'grin': {
      const o = 'M18,16 C26,19 33,20 40,20 C47,20 54,19 62,16 C57,26 49,31 40,31 C31,31 23,26 18,16 Z';
      opening(o, () => {
        fill(ctx, 'M18,16 C26,19 33,20 40,20 C47,20 54,19 62,16 L62,22 C54,24.5 47,25.4 40,25.4 C33,25.4 26,24.5 18,22 Z', G.teeth);
        fill(ctx, 'M18,21 C26,23.6 33,24.4 40,24.4 C47,24.4 54,23.6 62,21 L62,22.4 C54,24.8 47,25.6 40,25.6 C33,25.6 26,24.8 18,22.4 Z', G.teethShade, 0.8);
        for (const x of [34, 46]) stroke(ctx, `M${x},20 L${x + (x < 40 ? -0.4 : 0.4)},24.6`, G.teethShade, 0.5, 0.8);
        ctx.save(); ctx.globalAlpha = 0.85; ctx.fillStyle = G.tongue; ctx.beginPath(); ctx.ellipse(40, 30, 9, 3.4, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      });
      lips('M18,16 C25,14 33,12.8 37,13.2 C38.6,13.4 39.4,14.2 40,14.2 C40.6,14.2 41.4,13.4 43,13.2 C47,12.8 55,14 62,16 C54,19 47,20 40,20 C33,20 26,19 18,16 Z',
        'M22,24 C28,29.6 34,31.4 40,31.4 C46,31.4 52,29.6 58,24 C56,30.6 49,34.6 40,34.6 C31,34.6 24,30.6 22,24 Z', [40, 32.8, 5]);
      taper(ctx, [18, 16, 26, 19, 33, 20, 40, 20], 0.4, 1.1, 1.2, k.line);
      taper(ctx, [40, 20, 47, 20, 54, 19, 62, 16], 1.2, 1.1, 0.4, k.line);
      taper(ctx, [18, 16, 22, 24, 30, 30.6, 40, 31], 0.4, 0.9, 1, k.line, 0.7);
      taper(ctx, [40, 31, 50, 30.6, 58, 24, 62, 16], 1, 0.9, 0.4, k.line, 0.7);
      break;
    }
    case 'grimace': {
      // Dents serrées, lèvre supérieure relevée, coins tirés vers le bas et vers l’extérieur (douleur, colère).
      const o = 'M18,23 C24,17.6 32,16 40,16.4 C48,16 56,17.6 62,23 C56,26.2 48,27.4 40,27.4 C32,27.4 24,26.2 18,23 Z';
      opening(o, () => {
        fill(ctx, 'M10,10 L70,10 L70,21.2 C56,22 30,22 10,21.2 Z', G.teethShade);
        fill(ctx, 'M24,15 L56,15 L56,21.4 C48,21.9 32,21.9 24,21.4 Z', G.teeth, 0.9);
        fill(ctx, 'M10,22.4 C30,23 56,23 70,22.4 L70,32 L10,32 Z', '#a8998a');
        stroke(ctx, 'M18,21.8 C30,22.6 52,22.6 62,21.8', G.mouthIn, 1.1);
        for (const x of [32, 37, 43, 48]) stroke(ctx, `M${x},16.8 L${x},21.4`, '#a8998a', 0.5, 0.9);
      });
      lips('M16,23.4 C22,15.6 32,13.6 40,14 C48,13.6 58,15.6 64,23.4 C58,18.4 48,16.2 40,16.6 C32,16.2 22,18.4 16,23.4 Z',
        'M19,24 C26,27.8 33,28.6 40,28.6 C47,28.6 54,27.8 61,24 C56,30.4 48,32 40,32 C32,32 24,30.4 19,24 Z', [40, 30.4, 4]);
      taper(ctx, [18, 23, 24, 17.6, 32, 16, 40, 16.4], 0.8, 1.4, 1.4, k.line);
      taper(ctx, [40, 16.4, 48, 16, 56, 17.6, 62, 23], 1.4, 1.4, 0.8, k.line);
      taper(ctx, [18, 23, 24, 26.2, 32, 27.4, 40, 27.4], 0.8, 1.2, 1.3, k.line, 0.9);
      taper(ctx, [40, 27.4, 48, 27.4, 56, 26.2, 62, 23], 1.3, 1.2, 0.8, k.line, 0.9);
      taper(ctx, [16.4, 23.4, 15.4, 24.6, 14.6, 25.8, 13.6, 27.2], 1.1, 0.7, 0.1, k.line, 0.85);
      taper(ctx, [63.6, 23.4, 64.6, 24.6, 65.4, 25.8, 66.4, 27.2], 1.1, 0.7, 0.1, k.line, 0.85);
      break;
    }
    case 'open': {
      const o = 'M31,19 C34,17.4 37,16.8 40,16.8 C43,16.8 46,17.4 49,19 C49.4,24 46,29.6 40,29.8 C34,29.6 30.6,24 31,19 Z';
      opening(o, () => {
        fill(ctx, 'M31,19 C34,17.4 37,16.8 40,16.8 C43,16.8 46,17.4 49,19 L49,20.8 C46,20 43,19.8 40,19.8 C37,19.8 34,20 31,20.8 Z', G.teeth, 0.95);
        ctx.save(); ctx.globalAlpha = 0.65; ctx.fillStyle = G.tongue; ctx.beginPath(); ctx.ellipse(40, 28.4, 6, 2.6, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      });
      lips('M27,19.4 C31,16.4 35,15 38,15.2 C39,15.3 39.6,15.9 40,15.9 C40.4,15.9 41,15.3 42,15.2 C45,15 49,16.4 53,19.4 C50,18.2 46,17 40,16.9 C34,17 30,18.2 27,19.4 Z',
        'M29,22 C30.6,28.4 35,31.4 40,31.4 C45,31.4 49.4,28.4 51,22 C52,29.6 47,33.6 40,33.6 C33,33.6 28,29.6 29,22 Z', [40, 32.2, 3.6]);
      taper(ctx, [31, 19, 34, 17.4, 37, 16.8, 40, 16.8], 0.5, 0.9, 1, k.line);
      taper(ctx, [40, 16.8, 43, 16.8, 46, 17.4, 49, 19], 1, 0.9, 0.5, k.line);
      taper(ctx, [31, 19, 30.6, 24, 34, 29.6, 40, 29.8], 0.5, 1, 1.1, k.line, 0.85);
      taper(ctx, [40, 29.8, 46, 29.6, 49.4, 24, 49, 19], 1.1, 1, 0.5, k.line, 0.85);
      taper(ctx, [27, 19.4, 26.4, 19.8, 25.8, 20.2, 25.2, 20.8], 0.8, 0.5, 0.1, k.lineSoft, 0.8);
      taper(ctx, [53, 19.4, 53.6, 19.8, 54.2, 20.2, 54.8, 20.8], 0.8, 0.5, 0.1, k.lineSoft, 0.8);
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

/** Couleurs propres à un rival utilisées par les couches communes (paupières, iris, sourcils, bouches). */
export interface FigureColors {
  skinShade: string; line: string; lineSoft: string; lash: string; lashSoft: string;
  brow: string; browHi: string; lipUp: string; lipLow: string; lipHi: string;
  iris: string; irisDeep: string; irisLight: string; irisAmber: string; pupil: string;
  /** Lueur de l’iris (« r,g,b »). */
  irisGlow: string;
  /** Trait des cils : épaisseur relative (1 par défaut), départ externe et cils détachés (oui par défaut). */
  lashWeight?: number;
  lashWing?: boolean;
  lashStrands?: boolean;
}

/** Identité d’un rival en V2 : ses propres couches (tête, mèches, plan arrière, buste) et ses couleurs. */
export interface FigureV2Kit {
  id: string;
  colors: FigureColors;
  /** Tête 256 × 312 (espace H) : cheveux arrière, cou, visage et modelé ; les paupières y sont découpées. */
  head(seed: number): HTMLCanvasElement;
  /** Mèches avant (même plan que la tête, au-dessus des yeux et des sourcils). */
  front(): HTMLCanvasElement;
  /** Plan arrière (`HOOD_BOX`) : capuche, voile, col ou chevelure derrière la tête, devant le buste. */
  back(): HTMLCanvasElement;
  /** Buste (plan V1 2,7 × 2,1, dessiné en espace H au repos). */
  torso(): HTMLCanvasElement;
  brows?: Record<BrowShape, string>;
  /** Réglages d’humeur propres au tempérament (le repos des paupières, `neutral.lid`, reste commun). */
  moods?: Partial<Record<Mood, Partial<FaceV2>>>;
}

export interface FigureV2Art {
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
  moods: Record<Mood, FaceV2>;
}

/** Humeurs d’un rival : table commune, retouchée par son tempérament (le repos des paupières reste commun). */
export function moodsFor(kit: Pick<FigureV2Kit, 'moods'>): Record<Mood, FaceV2> {
  const out = { ...MOODS_V2 };
  for (const [m, o] of Object.entries(kit.moods ?? {}) as Array<[Mood, Partial<FaceV2>]>) {
    out[m] = { ...MOODS_V2[m], ...o, ...(m === 'neutral' ? { lid: MOODS_V2.neutral.lid } : {}) };
  }
  return out;
}

/** Toutes les couches V2 d’un rival (graine d’art : détails semés, taches de rousseur…). */
export function figureV2Art(kit: FigureV2Kit, seed: number): FigureV2Art {
  const k = kit.colors;
  const head = kit.head(seed);
  const shapes = kit.brows ?? BROWS;
  return {
    head,
    front: kit.front(),
    hood: kit.back(),
    torso: kit.torso(),
    sclera: drawSclera(),
    iris: drawIris(k),
    lidUp: [drawUpperLid(k, head, 0), drawUpperLid(k, head, 1)],
    lidLow: [drawLowerLid(k, head, 0), drawLowerLid(k, head, 1)],
    lidShut: [drawShutLid(k, head, 0), drawShutLid(k, head, 1)],
    brows: { rest: drawBrow(k, shapes, 'rest'), arch: drawBrow(k, shapes, 'arch'), knit: drawBrow(k, shapes, 'knit') },
    mouths: Object.fromEntries(MOUTHS_V2.map((m) => [m, drawMouth(k, m)])) as Record<MouthShape, HTMLCanvasElement>,
    flush: drawFlush(),
    moods: moodsFor(kit),
  };
}

/**
 * Portrait des affiches et des HUD composé à partir des MÊMES couches, à leur place dans le rig (expression de repos,
 * regard vers le joueur) : fenêtre carrée de l’espace H.
 */
export function drawFigureV2Portrait(ctx: Ctx, size: number, art: FigureV2Art, mouth: MouthShape = 'neutral'): void {
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
  const n = art.moods.neutral;
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
