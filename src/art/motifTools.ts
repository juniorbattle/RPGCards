/**
 * M12 (contrat 1, ADR 044) — outils de tracé des motifs des cartes (partagés par `cardMotifs.ts` et `cardMotifs09.ts`) :
 * repère de l'illustration (240 × 336, motif autour de (120, 141)), halos, lueurs, étoiles, flammes, losanges, yeux,
 * petites cartes, branches d'épines, roses. Canvas 2D seulement (page et worker).
 */
import { drawEmblem } from './emblems';
import type { FamilyPalette } from './palette';

export type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
export type Rng = () => number;

export const W = 240;
export const H = 336;
export const CX = W / 2;
export const CY = H * 0.42;
export const TAU = Math.PI * 2;

/** Couleurs des quatre familles (Prisme, Convergence). */
export const FAMILY_HUES: readonly string[] = ['#ff7a2e', '#8fb8ff', '#8fdc6a', '#ffd36b'];

// ---------------------------------------------------------------------------------------------- outils de tracé

export function halo(ctx: Ctx, x: number, y: number, r: number, color: string, a = 'aa'): void {
  const g = ctx.createRadialGradient(x, y, 2, x, y, r);
  g.addColorStop(0, `${color}${a}`);
  g.addColorStop(1, `${color}00`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

/** Trace avec une lueur (ombre portée colorée, sans décalage). */
export function glow(ctx: Ctx, color: string, blur: number, draw: () => void): void {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  draw();
  ctx.restore();
}

/** Étoile à quatre branches concaves (l'astre de la famille), centrée en (x, y). */
export function star4(ctx: Ctx, x: number, y: number, r: number, k = 0.22): void {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x + r * k, y - r * k, x + r, y);
  ctx.quadraticCurveTo(x + r * k, y + r * k, x, y + r);
  ctx.quadraticCurveTo(x - r * k, y + r * k, x - r, y);
  ctx.quadraticCurveTo(x - r * k, y - r * k, x, y - r);
  ctx.closePath();
}

/** Langue de flamme : pied en (x, y), hauteur h, largeur w, inclinaison `lean` (−1 à 1). */
export function flamePath(ctx: Ctx, x: number, y: number, w: number, h: number, lean = 0): void {
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  ctx.bezierCurveTo(x - w * 0.62, y - h * 0.45, x - w * 0.1 + lean * w * 0.4, y - h * 0.62, x + lean * w * 0.7, y - h);
  ctx.bezierCurveTo(x + w * 0.2 + lean * w * 0.4, y - h * 0.62, x + w * 0.62, y - h * 0.45, x + w / 2, y);
  ctx.quadraticCurveTo(x, y + w * 0.18, x - w / 2, y);
  ctx.closePath();
}

export function flame(ctx: Ctx, p: FamilyPalette, x: number, y: number, w: number, h: number, lean = 0, alpha = 1): void {
  const g = ctx.createLinearGradient(x, y, x + lean * w * 0.5, y - h);
  g.addColorStop(0, p.mid);
  g.addColorStop(0.35, p.glow);
  g.addColorStop(0.75, p.accent);
  g.addColorStop(1, `${p.ink}`);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  flamePath(ctx, x, y, w, h, lean);
  ctx.fill();
  // cœur clair
  ctx.globalAlpha = alpha * 0.8;
  ctx.fillStyle = `${p.ink}cc`;
  flamePath(ctx, x + lean * w * 0.1, y - h * 0.06, w * 0.38, h * 0.55, lean);
  ctx.fill();
  ctx.restore();
}

export function diamond(ctx: Ctx, x: number, y: number, rx: number, ry = rx * 1.35): void {
  ctx.beginPath();
  ctx.moveTo(x, y - ry);
  ctx.lineTo(x + rx, y);
  ctx.lineTo(x, y + ry);
  ctx.lineTo(x - rx, y);
  ctx.closePath();
}

/** Œil en amande (contour et iris), de demi-largeur r. */
export function eye(ctx: Ctx, p: FamilyPalette, x: number, y: number, r: number, open = 1): void {
  const hgt = r * 0.55 * open;
  ctx.beginPath();
  ctx.moveTo(x - r, y);
  ctx.quadraticCurveTo(x, y - hgt * 2, x + r, y);
  ctx.quadraticCurveTo(x, y + hgt * 2, x - r, y);
  ctx.closePath();
  ctx.fillStyle = `${p.ink}e6`;
  ctx.fill();
  ctx.lineWidth = Math.max(1.5, r * 0.08);
  ctx.strokeStyle = p.deep;
  ctx.stroke();
  if (open > 0.3) {
    const g = ctx.createRadialGradient(x, y, 1, x, y, r * 0.45);
    g.addColorStop(0, p.accent);
    g.addColorStop(0.7, p.light);
    g.addColorStop(1, p.mid);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.42 * Math.min(1, open * 1.2), 0, TAU);
    ctx.fill();
    ctx.fillStyle = p.deep;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.17, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x - r * 0.12, y - r * 0.12, r * 0.07, 0, TAU);
    ctx.fill();
  }
}

/** Petite carte (silhouette) : coin haut gauche en (x, y). */
export function cardShape(ctx: Ctx, x: number, y: number, w: number, h: number, fill: string, stroke: string): void {
  const r = w * 0.12;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = stroke;
  ctx.stroke();
}

/** Branche d'épines (récursive), comme le motif de la famille, mais orientable et plus nette. */
export function thornBranch(ctx: Ctx, rng: Rng, x: number, y: number, ang: number, len: number, depth: number, color: string, thorn: string, width = 1): void {
  if (depth <= 0 || len < 5) return;
  const x2 = x + Math.cos(ang) * len;
  const y2 = y + Math.sin(ang) * len;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, depth * width);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo((x + x2) / 2 + (rng() - 0.5) * len * 0.35, (y + y2) / 2 + (rng() - 0.5) * len * 0.35, x2, y2);
  ctx.stroke();
  const tx = (x + x2) / 2;
  const ty = (y + y2) / 2;
  const na = ang + (rng() < 0.5 ? 1 : -1) * 1.25;
  ctx.fillStyle = thorn;
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineTo(tx + Math.cos(na) * (4 + depth * 1.5), ty + Math.sin(na) * (4 + depth * 1.5));
  ctx.lineTo(tx + Math.cos(ang) * 3, ty + Math.sin(ang) * 3);
  ctx.fill();
  const n = rng() < 0.3 ? 2 : 1;
  for (let i = 0; i < n; i++) thornBranch(ctx, rng, x2, y2, ang + (rng() - 0.5) * 0.9, len * (0.7 + rng() * 0.15), depth - 1, color, thorn, width);
}

export function rose(ctx: Ctx, p: FamilyPalette, x: number, y: number, r: number): void {
  halo(ctx, x, y, r * 2.2, p.glow, '66');
  ctx.fillStyle = '#e8506a';
  drawEmblem(ctx, 'Ronce', x, y, r);
  ctx.fillStyle = '#ffd0d8';
  ctx.beginPath();
  ctx.arc(x, y, r * 0.22, 0, TAU);
  ctx.fill();
}
