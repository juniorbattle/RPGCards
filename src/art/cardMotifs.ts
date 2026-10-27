/**
 * M12 (contrat 1, ADR 044) — motifs propres à chaque variante et à chaque Signature : une composition tracée par code
 * qui raconte l'effet (une étincelle pour Étincelle, un voile pour Dissimulation, des écailles pour Écaille…), sur le
 * fond et le motif de la famille (`cardArt.ts`). Canvas 2D seulement (page et worker : même tracé, mêmes pixels) ;
 * aucun texte ; graine d'art seulement (jamais la RNG du jeu).
 *
 * Repère : l'illustration fait 240 × 336 ; la plaque couvre le bas (≈ 30 %), le Rang et l'emblème les coins du haut ;
 * le motif se compose autour de (120, 141), dans un rayon d'environ 80.
 */
import type { EffectId, Family } from '../game/catalog/cards';
import { drawEmblem } from './emblems';
import { FAMILY_PALETTE, type FamilyPalette } from './palette';

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
type Rng = () => number;

const W = 240;
const H = 336;
const CX = W / 2;
const CY = H * 0.42;
const TAU = Math.PI * 2;

/** Couleurs des quatre familles (Prisme, Convergence). */
const FAMILY_HUES: readonly string[] = ['#ff7a2e', '#8fb8ff', '#8fdc6a', '#ffd36b'];

// ---------------------------------------------------------------------------------------------- outils de tracé

function halo(ctx: Ctx, x: number, y: number, r: number, color: string, a = 'aa'): void {
  const g = ctx.createRadialGradient(x, y, 2, x, y, r);
  g.addColorStop(0, `${color}${a}`);
  g.addColorStop(1, `${color}00`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

/** Trace avec une lueur (ombre portée colorée, sans décalage). */
function glow(ctx: Ctx, color: string, blur: number, draw: () => void): void {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  draw();
  ctx.restore();
}

/** Étoile à quatre branches concaves (l'astre de la famille), centrée en (x, y). */
function star4(ctx: Ctx, x: number, y: number, r: number, k = 0.22): void {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x + r * k, y - r * k, x + r, y);
  ctx.quadraticCurveTo(x + r * k, y + r * k, x, y + r);
  ctx.quadraticCurveTo(x - r * k, y + r * k, x - r, y);
  ctx.quadraticCurveTo(x - r * k, y - r * k, x, y - r);
  ctx.closePath();
}

/** Langue de flamme : pied en (x, y), hauteur h, largeur w, inclinaison `lean` (−1 à 1). */
function flamePath(ctx: Ctx, x: number, y: number, w: number, h: number, lean = 0): void {
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  ctx.bezierCurveTo(x - w * 0.62, y - h * 0.45, x - w * 0.1 + lean * w * 0.4, y - h * 0.62, x + lean * w * 0.7, y - h);
  ctx.bezierCurveTo(x + w * 0.2 + lean * w * 0.4, y - h * 0.62, x + w * 0.62, y - h * 0.45, x + w / 2, y);
  ctx.quadraticCurveTo(x, y + w * 0.18, x - w / 2, y);
  ctx.closePath();
}

function flame(ctx: Ctx, p: FamilyPalette, x: number, y: number, w: number, h: number, lean = 0, alpha = 1): void {
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

function diamond(ctx: Ctx, x: number, y: number, rx: number, ry = rx * 1.35): void {
  ctx.beginPath();
  ctx.moveTo(x, y - ry);
  ctx.lineTo(x + rx, y);
  ctx.lineTo(x, y + ry);
  ctx.lineTo(x - rx, y);
  ctx.closePath();
}

/** Œil en amande (contour et iris), de demi-largeur r. */
function eye(ctx: Ctx, p: FamilyPalette, x: number, y: number, r: number, open = 1): void {
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
function cardShape(ctx: Ctx, x: number, y: number, w: number, h: number, fill: string, stroke: string): void {
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
function thornBranch(ctx: Ctx, rng: Rng, x: number, y: number, ang: number, len: number, depth: number, color: string, thorn: string, width = 1): void {
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

function rose(ctx: Ctx, p: FamilyPalette, x: number, y: number, r: number): void {
  halo(ctx, x, y, r * 2.2, p.glow, '66');
  ctx.fillStyle = '#e8506a';
  drawEmblem(ctx, 'Ronce', x, y, r);
  ctx.fillStyle = '#ffd0d8';
  ctx.beginPath();
  ctx.arc(x, y, r * 0.22, 0, TAU);
  ctx.fill();
}

// ---------------------------------------------------------------------------------------------- Cendre

/** Étincelle : une étincelle qui éclate, rayons fins et escarbilles. */
function etincelle(ctx: Ctx, p: FamilyPalette, rng: Rng): void {
  halo(ctx, CX, CY, 96, p.glow, '99');
  const rays = 16;
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * TAU + 0.1;
    const long = i % 2 === 0;
    const len = long ? 74 + rng() * 10 : 36 + rng() * 10;
    const w = long ? 4.2 : 2.6;
    const g = ctx.createLinearGradient(CX, CY, CX + Math.cos(a) * len, CY + Math.sin(a) * len);
    g.addColorStop(0, p.ink);
    g.addColorStop(0.4, p.accent);
    g.addColorStop(1, `${p.glow}00`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(CX + Math.cos(a + Math.PI / 2) * w, CY + Math.sin(a + Math.PI / 2) * w);
    ctx.lineTo(CX + Math.cos(a) * len, CY + Math.sin(a) * len);
    ctx.lineTo(CX + Math.cos(a - Math.PI / 2) * w, CY + Math.sin(a - Math.PI / 2) * w);
    ctx.closePath();
    ctx.fill();
  }
  // escarbilles : traits courts qui fusent vers l'extérieur
  ctx.lineCap = 'round';
  for (let i = 0; i < 34; i++) {
    const a = rng() * TAU;
    const r0 = 28 + rng() * 44;
    const r1 = r0 + 5 + rng() * 9;
    ctx.strokeStyle = rng() < 0.5 ? p.ink : p.accent;
    ctx.globalAlpha = 0.5 + rng() * 0.5;
    ctx.lineWidth = 1.2 + rng() * 1.4;
    ctx.beginPath();
    ctx.moveTo(CX + Math.cos(a) * r0, CY + Math.sin(a) * r0);
    ctx.lineTo(CX + Math.cos(a) * r1, CY + Math.sin(a) * r1);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  const core = ctx.createRadialGradient(CX, CY, 1, CX, CY, 22);
  core.addColorStop(0, '#ffffff');
  core.addColorStop(0.45, p.ink);
  core.addColorStop(1, `${p.accent}00`);
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(CX, CY, 22, 0, TAU);
  ctx.fill();
}

/** Braise : une braise rougeoyante, fendue de lumière, sur un lit de cendres. */
function braise(ctx: Ctx, p: FamilyPalette, rng: Rng): void {
  halo(ctx, CX, CY + 10, 92, p.glow, '88');
  // lit de cendres
  for (let i = 0; i < 70; i++) {
    const x = CX + (rng() - 0.5) * 150;
    const y = CY + 46 + rng() * 22;
    ctx.fillStyle = rng() < 0.5 ? 'rgba(120,110,104,0.55)' : 'rgba(60,52,48,0.6)';
    ctx.beginPath();
    ctx.arc(x, y, 1.2 + rng() * 2.6, 0, TAU);
    ctx.fill();
  }
  // la braise : bloc arrondi irrégulier
  const pts: Array<[number, number]> = [];
  const n = 11;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const r = 46 + (rng() - 0.5) * 12;
    pts.push([CX + Math.cos(a) * r * 1.15, CY + 8 + Math.sin(a) * r * 0.82]);
  }
  ctx.beginPath();
  pts.forEach(([x, y], i) => {
    const [nx, ny] = pts[(i + 1) % n]!;
    if (i === 0) ctx.moveTo((x + nx) / 2, (y + ny) / 2);
    else ctx.quadraticCurveTo(x, y, (x + nx) / 2, (y + ny) / 2);
  });
  const [x0, y0] = pts[0]!;
  const [x1, y1] = pts[1]!;
  ctx.quadraticCurveTo(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
  ctx.closePath();
  const g = ctx.createRadialGradient(CX - 10, CY - 4, 6, CX, CY + 8, 60);
  g.addColorStop(0, '#5a1a0c');
  g.addColorStop(0.6, '#2a0b05');
  g.addColorStop(1, '#120403');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = `${p.glow}aa`;
  ctx.stroke();
  // fissures de lumière
  ctx.save();
  ctx.clip();
  glow(ctx, p.glow, 10, () => {
    ctx.lineCap = 'round';
    for (let k = 0; k < 6; k++) {
      let x = CX + (rng() - 0.5) * 60;
      let y = CY + 8 + (rng() - 0.5) * 40;
      let a = rng() * TAU;
      ctx.strokeStyle = k % 2 ? p.accent : p.ink;
      ctx.lineWidth = 2.6 - k * 0.25;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let s = 0; s < 5; s++) {
        a += (rng() - 0.5) * 1.4;
        x += Math.cos(a) * (8 + rng() * 9);
        y += Math.sin(a) * (6 + rng() * 7);
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  });
  ctx.restore();
  // petites flammes au sommet
  for (let i = 0; i < 3; i++) flame(ctx, p, CX - 22 + i * 22, CY - 26, 16, 26 + rng() * 14, (rng() - 0.5) * 0.6, 0.85);
}

/** Ferveur : une flamme dressée dans des ondes de chaleur, un losange d'Insight au cœur. */
function ferveur(ctx: Ctx, p: FamilyPalette): void {
  halo(ctx, CX, CY, 100, p.glow, '88');
  // ondes de chaleur
  ctx.lineWidth = 2;
  for (let k = 3; k >= 1; k--) {
    ctx.strokeStyle = `${p.accent}${['55', '77', '99'][k - 1]}`;
    ctx.beginPath();
    for (let t = 0; t <= 1.0001; t += 0.02) {
      const yy = CY + 62 - t * (128 + k * 10);
      const wob = Math.sin(t * 18 + k) * 3;
      const ww = (1 - t) * (34 + k * 14) + 6;
      if (t === 0) ctx.moveTo(CX - ww + wob, yy);
      else ctx.lineTo(CX - ww + wob, yy);
    }
    ctx.stroke();
    ctx.beginPath();
    for (let t = 0; t <= 1.0001; t += 0.02) {
      const yy = CY + 62 - t * (128 + k * 10);
      const wob = Math.sin(t * 18 + k + 1) * 3;
      const ww = (1 - t) * (34 + k * 14) + 6;
      if (t === 0) ctx.moveTo(CX + ww + wob, yy);
      else ctx.lineTo(CX + ww + wob, yy);
    }
    ctx.stroke();
  }
  flame(ctx, p, CX, CY + 62, 70, 136, 0);
  // le losange d'Insight au cœur
  glow(ctx, '#ffffff', 12, () => {
    ctx.fillStyle = '#fff6d8';
    diamond(ctx, CX, CY + 18, 12);
    ctx.fill();
  });
  ctx.lineWidth = 2;
  ctx.strokeStyle = p.mid;
  diamond(ctx, CX, CY + 18, 12);
  ctx.stroke();
}

/** Contrecoup : deux flammes qui se heurtent, onde de choc en arcs. */
function contrecoup(ctx: Ctx, p: FamilyPalette, rng: Rng): void {
  halo(ctx, CX, CY, 96, p.glow, '88');
  // deux flammes couchées qui se rencontrent
  ctx.save();
  ctx.translate(CX - 12, CY + 6);
  ctx.rotate(Math.PI / 2 - 0.25);
  flame(ctx, p, 0, 64, 52, 92, 0.1);
  ctx.restore();
  ctx.save();
  ctx.translate(CX + 12, CY + 6);
  ctx.rotate(-Math.PI / 2 + 0.25);
  flame(ctx, p, 0, 64, 52, 92, -0.1);
  ctx.restore();
  // onde de choc : arcs concentriques
  ctx.lineCap = 'round';
  for (let k = 0; k < 4; k++) {
    ctx.strokeStyle = `${p.ink}${['ee', 'bb', '88', '55'][k]}`;
    ctx.lineWidth = 3.2 - k * 0.6;
    const r = 22 + k * 16;
    ctx.beginPath();
    ctx.arc(CX, CY + 6, r, -Math.PI / 2 - 0.7, -Math.PI / 2 + 0.7);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(CX, CY + 6, r, Math.PI / 2 - 0.7, Math.PI / 2 + 0.7);
    ctx.stroke();
  }
  // éclat central
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU + rng() * 0.2;
    ctx.strokeStyle = p.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(CX + Math.cos(a) * 8, CY + 6 + Math.sin(a) * 8);
    ctx.lineTo(CX + Math.cos(a) * 20, CY + 6 + Math.sin(a) * 20);
    ctx.stroke();
  }
  halo(ctx, CX, CY + 6, 18, '#ffffff', 'ee');
}

/** Brasier Originel : un brasier en ailes de feu autour de l'emblème, couronne de flammes. */
function brasier(ctx: Ctx, p: FamilyPalette, rng: Rng): void {
  halo(ctx, CX, CY, 130, p.glow, 'bb');
  // ailes : plumes de flamme en éventail de chaque côté
  for (const side of [-1, 1]) {
    for (let i = 0; i < 6; i++) {
      const a = -0.35 - i * 0.24;
      ctx.save();
      ctx.translate(CX + side * 10, CY + 18);
      ctx.rotate(side * (Math.PI / 2 + a));
      flame(ctx, p, 0, 0, 22 - i * 1.2, 92 - i * 7, side * -0.15, 0.92);
      ctx.restore();
    }
  }
  // couronne de flammes
  for (let i = 0; i < 5; i++) flame(ctx, p, CX - 34 + i * 17, CY - 34, 15, 30 + (i === 2 ? 22 : rng() * 10), (i - 2) * 0.12, 0.95);
  // l'emblème en or
  halo(ctx, CX, CY + 6, 48, '#ffffff', '88');
  ctx.fillStyle = p.deep;
  drawEmblem(ctx, 'Cendre', CX + 2, CY + 9, 40);
  const g = ctx.createLinearGradient(CX - 30, CY - 30, CX + 30, CY + 40);
  g.addColorStop(0, '#fff7da');
  g.addColorStop(0.5, '#ffd36b');
  g.addColorStop(1, p.glow);
  ctx.fillStyle = g;
  drawEmblem(ctx, 'Cendre', CX, CY + 6, 40);
}

// ---------------------------------------------------------------------------------------------- Voile

/** Éclaireur : une lanterne dont le faisceau fend la brume. */
function eclaireur(ctx: Ctx, p: FamilyPalette, rng: Rng): void {
  const lx = CX - 42;
  const ly = CY - 34;
  // faisceau
  const g = ctx.createLinearGradient(lx, ly, CX + 110, CY + 70);
  g.addColorStop(0, `${p.ink}dd`);
  g.addColorStop(0.5, `${p.accent}66`);
  g.addColorStop(1, `${p.accent}00`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(lx + 6, ly + 4);
  ctx.lineTo(CX + 130, CY + 10);
  ctx.lineTo(CX + 70, CY + 110);
  ctx.closePath();
  ctx.fill();
  // éclats dans le faisceau
  for (let i = 0; i < 14; i++) {
    const t = 0.25 + rng() * 0.7;
    const x = lx + (CX + 100 - lx) * t + (rng() - 0.5) * 30 * t;
    const y = ly + (CY + 60 - ly) * t + (rng() - 0.5) * 30 * t;
    ctx.strokeStyle = `${p.ink}${rng() < 0.5 ? 'cc' : '77'}`;
    ctx.lineWidth = 1.4;
    diamond(ctx, x, y, 3 + rng() * 4, 5 + rng() * 5);
    ctx.stroke();
  }
  // la lanterne
  halo(ctx, lx, ly, 46, p.ink, 'aa');
  ctx.strokeStyle = p.deep;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(lx, ly - 30, 8, Math.PI, 0);
  ctx.stroke();
  ctx.fillStyle = '#1a1840';
  ctx.beginPath();
  ctx.moveTo(lx - 14, ly - 22);
  ctx.lineTo(lx + 14, ly - 22);
  ctx.lineTo(lx + 18, ly - 14);
  ctx.lineTo(lx + 18, ly + 16);
  ctx.lineTo(lx + 12, ly + 24);
  ctx.lineTo(lx - 12, ly + 24);
  ctx.lineTo(lx - 18, ly + 16);
  ctx.lineTo(lx - 18, ly - 14);
  ctx.closePath();
  ctx.fill();
  const lg = ctx.createRadialGradient(lx, ly + 1, 2, lx, ly + 1, 16);
  lg.addColorStop(0, '#ffffff');
  lg.addColorStop(0.5, p.ink);
  lg.addColorStop(1, p.accent);
  ctx.fillStyle = lg;
  ctx.fillRect(lx - 12, ly - 14, 24, 30);
  ctx.strokeStyle = p.deep;
  ctx.lineWidth = 2;
  for (const dx of [-4, 4]) {
    ctx.beginPath();
    ctx.moveTo(lx + dx, ly - 14);
    ctx.lineTo(lx + dx, ly + 16);
    ctx.stroke();
  }
}

/** Détour : un ruban qui serpente et contourne un obstacle. */
function detour(ctx: Ctx, p: FamilyPalette): void {
  halo(ctx, CX, CY, 96, p.glow, '77');
  // obstacle : un losange sombre
  ctx.fillStyle = '#121032';
  diamond(ctx, CX + 4, CY + 4, 24, 30);
  ctx.fill();
  ctx.strokeStyle = `${p.accent}88`;
  ctx.lineWidth = 2;
  ctx.stroke();
  // le ruban : courbe en S, épais, avec une flèche au bout
  const path = (off: number) => {
    ctx.beginPath();
    ctx.moveTo(CX - 70 + off, CY + 82);
    ctx.bezierCurveTo(CX - 90 + off, CY + 20, CX + 64 + off, CY + 40, CX + 56 + off, CY - 12);
    ctx.bezierCurveTo(CX + 48 + off, CY - 60, CX - 50 + off, CY - 40, CX - 36 + off, CY - 78);
  };
  ctx.lineCap = 'round';
  glow(ctx, p.accent, 14, () => {
    ctx.strokeStyle = `${p.light}`;
    ctx.lineWidth = 16;
    path(0);
    ctx.stroke();
  });
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 6;
  path(0);
  ctx.stroke();
  // pointillés sur le ruban
  ctx.setLineDash([2, 9]);
  ctx.strokeStyle = p.deep;
  ctx.lineWidth = 2.5;
  path(0);
  ctx.stroke();
  ctx.setLineDash([]);
  // flèche
  ctx.fillStyle = p.ink;
  ctx.beginPath();
  ctx.moveTo(CX - 40, CY - 98);
  ctx.lineTo(CX - 22, CY - 72);
  ctx.lineTo(CX - 52, CY - 70);
  ctx.closePath();
  ctx.fill();
}

/** Dissimulation : un voile qui tombe sur une forme. */
function dissimulation(ctx: Ctx, p: FamilyPalette): void {
  halo(ctx, CX, CY, 96, p.glow, '66');
  // la forme cachée (une carte et l'emblème du Voile, à peine visible)
  cardShape(ctx, CX - 30, CY - 38, 60, 84, '#2b2a66', `${p.accent}99`);
  ctx.fillStyle = `${p.accent}88`;
  drawEmblem(ctx, 'Voile', CX, CY + 4, 20);
  // le voile : plis verticaux translucides, ourlet ondulé
  const top = CY - 92;
  for (let k = 0; k < 9; k++) {
    const x0 = CX - 72 + k * 18;
    const g = ctx.createLinearGradient(x0, 0, x0 + 18, 0);
    g.addColorStop(0, `${p.ink}${k % 2 ? '55' : '33'}`);
    g.addColorStop(0.5, `${p.ink}${k % 2 ? '99' : '66'}`);
    g.addColorStop(1, `${p.ink}${k % 2 ? '55' : '33'}`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(CX - 10 + k * 2.5, top);
    ctx.lineTo(CX - 6 + k * 2.5, top);
    ctx.quadraticCurveTo(x0 + 24, CY + 20, x0 + 18, CY + 66 + Math.sin(k * 1.7) * 7);
    ctx.lineTo(x0, CY + 66 + Math.sin((k - 1) * 1.7) * 7);
    ctx.quadraticCurveTo(x0 + 2, CY + 10, CX - 10 + k * 2.5, top);
    ctx.closePath();
    ctx.fill();
  }
  // anneau d'attache en haut
  ctx.strokeStyle = p.accent;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(CX, top - 4, 7, 0, TAU);
  ctx.stroke();
}

/** Silence : un croissant de lune, un œil clos, des ondes coupées. */
function silence(ctx: Ctx, p: FamilyPalette): void {
  halo(ctx, CX, CY - 10, 100, p.glow, '77');
  // croissant
  glow(ctx, p.accent, 18, () => {
    ctx.fillStyle = p.ink;
    ctx.beginPath();
    ctx.arc(CX, CY - 24, 44, 0, TAU);
    ctx.arc(CX + 18, CY - 34, 40, 0, TAU, true);
    ctx.fill('evenodd');
  });
  // œil clos : arc et cils
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 3.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(CX, CY + 30, 30, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  for (let i = 0; i < 5; i++) {
    const a = (0.22 + i * 0.14) * Math.PI;
    const x = CX + Math.cos(a) * 30;
    const y = CY + 30 + Math.sin(a) * 30;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * 9, y + Math.sin(a) * 9);
    ctx.stroke();
  }
  // ondes coupées (barrées) de chaque côté
  for (const side of [-1, 1]) {
    for (let k = 0; k < 3; k++) {
      ctx.strokeStyle = `${p.accent}${['cc', '99', '66'][k]}`;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(CX + side * 30, CY + 44, 18 + k * 12, side > 0 ? -0.5 : Math.PI - 0.5, side > 0 ? 0.5 : Math.PI + 0.5);
      ctx.stroke();
    }
    ctx.strokeStyle = p.ink;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(CX + side * 46, CY + 26);
    ctx.lineTo(CX + side * 74, CY + 62);
    ctx.stroke();
  }
}

/** Miroir du Voile : un miroir ovale où s'ouvre un œil, rideaux de voile. */
function miroir(ctx: Ctx, p: FamilyPalette, rng: Rng): void {
  halo(ctx, CX, CY, 130, p.glow, 'aa');
  // rideaux
  for (const side of [-1, 1]) {
    for (let k = 0; k < 4; k++) {
      ctx.fillStyle = `${p.light}${['55', '44', '33', '22'][k]}`;
      ctx.beginPath();
      ctx.moveTo(CX + side * (120 - k * 10), CY - 140);
      ctx.quadraticCurveTo(CX + side * (64 - k * 6), CY - 30, CX + side * (110 - k * 12), CY + 90);
      ctx.lineTo(CX + side * 125, CY + 90);
      ctx.lineTo(CX + side * 125, CY - 140);
      ctx.closePath();
      ctx.fill();
    }
  }
  // cadre du miroir
  const rx = 50;
  const ry = 66;
  glow(ctx, '#ffd36b', 16, () => {
    ctx.strokeStyle = '#ffd36b';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.ellipse(CX, CY, rx, ry, 0, 0, TAU);
    ctx.stroke();
  });
  const mg = ctx.createLinearGradient(CX - rx, CY - ry, CX + rx, CY + ry);
  mg.addColorStop(0, '#dfe8ff');
  mg.addColorStop(0.45, '#7f8ad8');
  mg.addColorStop(1, '#25235c');
  ctx.fillStyle = mg;
  ctx.beginPath();
  ctx.ellipse(CX, CY, rx - 4, ry - 4, 0, 0, TAU);
  ctx.fill();
  // perles du cadre
  ctx.fillStyle = '#fff3c4';
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * TAU;
    ctx.beginPath();
    ctx.arc(CX + Math.cos(a) * (rx + 7), CY + Math.sin(a) * (ry + 7), 2.4, 0, TAU);
    ctx.fill();
  }
  // reflet et œil
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(CX, CY, rx - 4, ry - 4, 0, 0, TAU);
  ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.moveTo(CX - rx, CY - 20);
  ctx.lineTo(CX - 6, CY - ry);
  ctx.lineTo(CX + 12, CY - ry);
  ctx.lineTo(CX - rx, CY + 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  eye(ctx, p, CX, CY + 2, 32, 1);
  // éclats
  for (let i = 0; i < 6; i++) {
    const x = CX + (rng() - 0.5) * 170;
    const y = CY + (rng() - 0.5) * 170;
    ctx.fillStyle = p.ink;
    star4(ctx, x, y, 4 + rng() * 4, 0.18);
    ctx.fill();
  }
}

// ---------------------------------------------------------------------------------------------- Ronce

/** Racine : des racines qui plongent et enserrent une pierre (qui voit la carte repoussée). */
function racine(ctx: Ctx, p: FamilyPalette, rng: Rng): void {
  halo(ctx, CX, CY + 10, 92, p.glow, '66');
  // pierre
  const g = ctx.createRadialGradient(CX - 12, CY - 2, 4, CX, CY + 12, 46);
  g.addColorStop(0, '#9aa39a');
  g.addColorStop(0.6, '#5a645b');
  g.addColorStop(1, '#2b322c');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(CX, CY + 14, 42, 34, -0.15, 0, TAU);
  ctx.fill();
  // rune lumineuse (l'œil de la Racine)
  glow(ctx, p.accent, 10, () => {
    ctx.strokeStyle = p.accent;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(CX - 14, CY + 14);
    ctx.quadraticCurveTo(CX, CY + 2, CX + 14, CY + 14);
    ctx.quadraticCurveTo(CX, CY + 26, CX - 14, CY + 14);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(CX, CY + 14, 4, 0, TAU);
    ctx.fillStyle = p.accent;
    ctx.fill();
  });
  // racines : depuis le haut, elles plongent et entourent la pierre
  for (let i = 0; i < 5; i++) {
    const x = CX - 56 + i * 28;
    thornBranch(ctx, rng, x, CY - 96, Math.PI / 2 + (rng() - 0.5) * 0.3, 34, 4, `${p.light}ee`, p.accent, 1.1);
  }
  ctx.strokeStyle = `${p.light}ee`;
  ctx.lineCap = 'round';
  for (const [a0, a1, w] of [[-2.6, -0.4, 5], [0.2, 2.9, 4], [-1.2, 1.4, 3]] as const) {
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.ellipse(CX, CY + 14, 46, 38, -0.15, a0, a1);
    ctx.stroke();
  }
}

/** Écaille : des écailles en bouclier, un cœur de sève lumineux (le soin). */
function ecaille(ctx: Ctx, p: FamilyPalette): void {
  halo(ctx, CX, CY, 100, p.glow, '77');
  const top = CY - 70;
  const shield = () => {
    ctx.beginPath();
    ctx.moveTo(CX - 58, top);
    ctx.lineTo(CX + 58, top);
    ctx.quadraticCurveTo(CX + 62, CY + 30, CX, CY + 76);
    ctx.quadraticCurveTo(CX - 62, CY + 30, CX - 58, top);
    ctx.closePath();
  };
  shield();
  ctx.fillStyle = '#123b20';
  ctx.fill();
  ctx.save();
  shield();
  ctx.clip();
  // écailles : rangées de demi-cercles décalés
  for (let row = 0; row < 9; row++) {
    const y = top + row * 16;
    for (let col = -5; col <= 5; col++) {
      const x = CX + col * 20 + (row % 2) * 10;
      const g = ctx.createLinearGradient(x, y - 10, x, y + 12);
      g.addColorStop(0, p.accent);
      g.addColorStop(1, p.mid);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, 11, 0, Math.PI);
      ctx.fill();
      ctx.strokeStyle = `${p.deep}cc`;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  }
  ctx.restore();
  shield();
  ctx.strokeStyle = p.accent;
  ctx.lineWidth = 3.5;
  ctx.stroke();
  // cœur de sève
  glow(ctx, '#d8ffb0', 18, () => {
    ctx.fillStyle = '#eaffd0';
    ctx.beginPath();
    const x = CX;
    const y = CY + 4;
    ctx.moveTo(x, y + 14);
    ctx.bezierCurveTo(x - 26, y - 4, x - 12, y - 24, x, y - 10);
    ctx.bezierCurveTo(x + 12, y - 24, x + 26, y - 4, x, y + 14);
    ctx.fill();
  });
  ctx.fillStyle = p.mid;
  ctx.fillRect(CX - 2, CY - 9, 4, 14);
  ctx.fillRect(CX - 7, CY - 4, 14, 4);
}

/** Entrave : des lianes d'épines nouées en entrave, une carte liée vers le bas. */
function entrave(ctx: Ctx, p: FamilyPalette, rng: Rng): void {
  halo(ctx, CX, CY, 96, p.glow, '66');
  // carte entravée, inclinée vers le bas
  ctx.save();
  ctx.translate(CX, CY + 12);
  ctx.rotate(0.18);
  cardShape(ctx, -24, -34, 48, 68, '#1d3b26', `${p.accent}99`);
  ctx.restore();
  // deux boucles d'épines entrelacées
  ctx.lineCap = 'round';
  for (const [dx, rot] of [[-16, -0.5], [16, 0.5]] as const) {
    ctx.save();
    ctx.translate(CX + dx, CY + 10);
    ctx.rotate(rot);
    ctx.strokeStyle = '#2f6b33';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.ellipse(0, 0, 30, 46, 0, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = p.light;
    ctx.lineWidth = 4;
    ctx.stroke();
    // épines le long de la boucle
    ctx.fillStyle = p.accent;
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * TAU + rng() * 0.1;
      const x = Math.cos(a) * 30;
      const y = Math.sin(a) * 46;
      const nx = Math.cos(a) * 30 * 1.28;
      const ny = Math.sin(a) * 46 * 1.2;
      ctx.beginPath();
      ctx.moveTo(x + Math.sin(a) * 3, y - Math.cos(a) * 3);
      ctx.lineTo(nx, ny);
      ctx.lineTo(x - Math.sin(a) * 3, y + Math.cos(a) * 3);
      ctx.fill();
    }
    ctx.restore();
  }
  // flèche vers le bas (sous la pioche)
  ctx.fillStyle = p.ink;
  ctx.beginPath();
  ctx.moveTo(CX - 12, CY + 64);
  ctx.lineTo(CX + 12, CY + 64);
  ctx.lineTo(CX, CY + 80);
  ctx.closePath();
  ctx.fill();
}

/** Ténacité : un tronc à cernes, une pousse neuve qui repart. */
function tenacite(ctx: Ctx, p: FamilyPalette): void {
  halo(ctx, CX, CY + 10, 96, p.glow, '66');
  // tronc (souche) vu de trois quarts
  ctx.fillStyle = '#4a3220';
  ctx.beginPath();
  ctx.moveTo(CX - 50, CY + 10);
  ctx.lineTo(CX - 54, CY + 64);
  ctx.quadraticCurveTo(CX, CY + 82, CX + 54, CY + 64);
  ctx.lineTo(CX + 50, CY + 10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 2;
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(CX + i * 13, CY + 18);
    ctx.lineTo(CX + i * 14, CY + 70);
    ctx.stroke();
  }
  // dessus : cernes
  const tg = ctx.createRadialGradient(CX, CY + 10, 2, CX, CY + 10, 50);
  tg.addColorStop(0, '#e2c08a');
  tg.addColorStop(1, '#b58a52');
  ctx.fillStyle = tg;
  ctx.beginPath();
  ctx.ellipse(CX, CY + 10, 50, 16, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#7a5530';
  ctx.lineWidth = 1.4;
  for (let k = 1; k <= 5; k++) {
    ctx.beginPath();
    ctx.ellipse(CX + 2, CY + 10, k * 9, k * 2.9, 0, 0, TAU);
    ctx.stroke();
  }
  // racines
  ctx.strokeStyle = '#3a2716';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  for (const [x, dx] of [[-50, -22], [50, 22], [-20, -10], [24, 12]] as const) {
    ctx.beginPath();
    ctx.moveTo(CX + x * 0.9, CY + 66);
    ctx.quadraticCurveTo(CX + x + dx * 0.5, CY + 76, CX + x + dx, CY + 84);
    ctx.stroke();
  }
  // pousse neuve
  ctx.strokeStyle = p.light;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(CX + 4, CY + 8);
  ctx.quadraticCurveTo(CX - 6, CY - 30, CX + 4, CY - 62);
  ctx.stroke();
  glow(ctx, p.glow, 10, () => {
    for (const [sx, a] of [[-1, -0.6], [1, 0.5]] as const) {
      ctx.save();
      ctx.translate(CX + 2 + sx * 2, CY - 36 + (sx > 0 ? -12 : 0));
      ctx.rotate(a);
      ctx.fillStyle = p.accent;
      ctx.beginPath();
      ctx.ellipse(sx * 16, 0, 16, 7, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  });
}

/** Couronne de Ronce : une couronne d'épines fleurie de roses. */
function couronne(ctx: Ctx, p: FamilyPalette, rng: Rng): void {
  halo(ctx, CX, CY, 130, p.glow, 'aa');
  halo(ctx, CX, CY - 10, 70, '#ffd36b', '55');
  // pointes de la couronne (épines dressées)
  for (let i = 0; i < 7; i++) {
    const x = CX - 60 + i * 20;
    const hgt = i === 3 ? 62 : i % 2 ? 40 : 50;
    const g = ctx.createLinearGradient(x, CY + 10, x, CY + 10 - hgt);
    g.addColorStop(0, p.mid);
    g.addColorStop(1, p.accent);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - 8, CY + 16);
    ctx.quadraticCurveTo(x - 2, CY - hgt * 0.4, x, CY + 10 - hgt);
    ctx.quadraticCurveTo(x + 2, CY - hgt * 0.4, x + 8, CY + 16);
    ctx.closePath();
    ctx.fill();
  }
  // bandeau tressé (ellipse en perspective) : deux branches d'épines enroulées
  ctx.lineCap = 'round';
  for (let k = 0; k < 2; k++) {
    ctx.strokeStyle = k ? p.light : '#2d6431';
    ctx.lineWidth = k ? 5 : 11;
    ctx.beginPath();
    ctx.ellipse(CX, CY + 22, 70, 20, 0, 0, TAU);
    ctx.stroke();
  }
  ctx.fillStyle = p.accent;
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * TAU + rng() * 0.08;
    const x = CX + Math.cos(a) * 70;
    const y = CY + 22 + Math.sin(a) * 20;
    ctx.beginPath();
    ctx.moveTo(x - 3, y);
    ctx.lineTo(x + Math.cos(a) * 9, y + Math.sin(a) * 6 - 4);
    ctx.lineTo(x + 3, y);
    ctx.fill();
  }
  // roses
  for (const [x, y, r] of [[CX - 46, CY + 34, 11], [CX, CY + 42, 13], [CX + 46, CY + 34, 11], [CX - 24, CY + 6, 8], [CX + 24, CY + 6, 8]] as const) rose(ctx, p, x, y, r);
}

// ---------------------------------------------------------------------------------------------- Astre

/** Repère : une étoile guide au-dessus d'une pile de cartes. */
function repere(ctx: Ctx, p: FamilyPalette): void {
  halo(ctx, CX, CY - 40, 80, p.glow, '88');
  // pile de cartes
  for (let i = 2; i >= 0; i--) {
    ctx.save();
    ctx.translate(CX - 26 + i * 4, CY + 10 - i * 6);
    ctx.rotate(-0.12 + i * 0.06);
    cardShape(ctx, 0, 0, 52, 70, i === 0 ? p.mid : p.deep, `${p.accent}${i === 0 ? 'ee' : '77'}`);
    ctx.restore();
  }
  // rayon de l'étoile vers la carte du dessus
  const g = ctx.createLinearGradient(CX, CY - 56, CX, CY + 10);
  g.addColorStop(0, `${p.ink}cc`);
  g.addColorStop(1, `${p.accent}00`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(CX - 4, CY - 50);
  ctx.lineTo(CX + 4, CY - 50);
  ctx.lineTo(CX + 30, CY + 4);
  ctx.lineTo(CX - 30, CY + 4);
  ctx.closePath();
  ctx.fill();
  // l'étoile guide
  glow(ctx, p.glow, 18, () => {
    ctx.fillStyle = p.ink;
    star4(ctx, CX, CY - 60, 30, 0.2);
    ctx.fill();
  });
  ctx.fillStyle = p.accent;
  star4(ctx, CX, CY - 60, 14, 0.25);
  ctx.fill();
}

/** Prisme : un prisme qui décompose la lumière en quatre couleurs. */
function prisme(ctx: Ctx, p: FamilyPalette): void {
  halo(ctx, CX, CY, 92, p.glow, '66');
  const ax = CX;
  const ay = CY - 52;
  const bx = CX - 46;
  const by = CY + 34;
  const cx = CX + 46;
  const cy = CY + 34;
  // rayon blanc entrant
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 5;
  glow(ctx, '#ffffff', 10, () => {
    ctx.beginPath();
    ctx.moveTo(CX - 120, CY + 14);
    ctx.lineTo(CX - 22, CY - 4);
    ctx.stroke();
  });
  // quatre rayons sortants, aux couleurs des familles
  FAMILY_HUES.forEach((hue, i) => {
    const y1 = CY - 30 + i * 24;
    const g = ctx.createLinearGradient(CX + 22, CY, CX + 120, y1 + 30);
    g.addColorStop(0, hue);
    g.addColorStop(1, `${hue}22`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(CX + 18, CY - 2 + i * 3);
    ctx.lineTo(CX + 124, y1 + (i - 1.5) * 10);
    ctx.lineTo(CX + 124, y1 + 14 + (i - 1.5) * 10);
    ctx.lineTo(CX + 18, CY + 5 + i * 3);
    ctx.closePath();
    ctx.fill();
  });
  // le prisme : face avant et arête
  const g = ctx.createLinearGradient(bx, by, cx, ay);
  g.addColorStop(0, 'rgba(255,255,255,0.55)');
  g.addColorStop(0.5, 'rgba(190,210,255,0.25)');
  g.addColorStop(1, 'rgba(255,255,255,0.7)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(cx, cy);
  ctx.lineTo(bx, by);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.strokeStyle = `${p.accent}cc`;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(ax + 6, CY + 30);
  ctx.stroke();
}

/** Relance : une orbite qui revient sur elle-même autour d'un astre. */
function relance(ctx: Ctx, p: FamilyPalette): void {
  halo(ctx, CX, CY, 92, p.glow, '77');
  // astre central
  ctx.fillStyle = p.accent;
  star4(ctx, CX, CY, 22, 0.22);
  ctx.fill();
  // orbite (presque complète) et sa flèche de retour
  ctx.lineCap = 'round';
  glow(ctx, p.glow, 12, () => {
    ctx.strokeStyle = p.ink;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.ellipse(CX, CY, 70, 46, -0.35, 0.35, TAU - 0.35);
    ctx.stroke();
  });
  const endA = TAU - 0.35;
  const rot = -0.35;
  const ex = CX + Math.cos(endA) * 70 * Math.cos(rot) - Math.sin(endA) * 46 * Math.sin(rot);
  const ey = CY + Math.cos(endA) * 70 * Math.sin(rot) + Math.sin(endA) * 46 * Math.cos(rot);
  ctx.fillStyle = p.ink;
  ctx.save();
  ctx.translate(ex, ey);
  ctx.rotate(rot + endA + Math.PI / 2);
  ctx.beginPath();
  ctx.moveTo(14, 0);
  ctx.lineTo(-8, -10);
  ctx.lineTo(-8, 10);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // une carte en orbite, et sa traîne
  for (let i = 0; i < 7; i++) {
    const a = 1.9 + i * 0.13;
    const x = CX + Math.cos(a) * 70 * Math.cos(rot) - Math.sin(a) * 46 * Math.sin(rot);
    const y = CY + Math.cos(a) * 70 * Math.sin(rot) + Math.sin(a) * 46 * Math.cos(rot);
    ctx.fillStyle = `${p.accent}${['22', '33', '44', '66', '88', 'aa', 'ff'][i]}`;
    ctx.beginPath();
    ctx.arc(x, y, 2 + i * 0.6, 0, TAU);
    ctx.fill();
  }
  const ca = 2.9;
  const kx = CX + Math.cos(ca) * 70 * Math.cos(rot) - Math.sin(ca) * 46 * Math.sin(rot);
  const ky = CY + Math.cos(ca) * 70 * Math.sin(rot) + Math.sin(ca) * 46 * Math.cos(rot);
  ctx.save();
  ctx.translate(kx, ky);
  ctx.rotate(-0.4);
  cardShape(ctx, -12, -16, 24, 32, p.mid, p.accent);
  ctx.restore();
}

/** Convergence : des rayons qui convergent en un point, venus des quatre familles. */
function convergence(ctx: Ctx, p: FamilyPalette): void {
  halo(ctx, CX, CY, 100, p.glow, '88');
  const origins: Array<[number, number]> = [[CX - 104, CY - 96], [CX + 104, CY - 96], [CX - 104, CY + 76], [CX + 104, CY + 76]];
  const fams: Family[] = ['Cendre', 'Voile', 'Ronce', 'Astre'];
  // faisceaux : des quatre coins vers le centre, et des rayons fins entre eux
  origins.forEach(([x, y], i) => {
    const hue = FAMILY_HUES[i]!;
    const g = ctx.createLinearGradient(x, y, CX, CY);
    g.addColorStop(0, `${hue}22`);
    g.addColorStop(1, hue);
    ctx.fillStyle = g;
    const a = Math.atan2(CY - y, CX - x) + Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * 14, y + Math.sin(a) * 14);
    ctx.lineTo(CX, CY);
    ctx.lineTo(x - Math.cos(a) * 14, y - Math.sin(a) * 14);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = hue;
    drawEmblem(ctx, fams[i]!, x * 0.86 + CX * 0.14, y * 0.86 + CY * 0.14, 9);
  });
  ctx.strokeStyle = `${p.ink}66`;
  ctx.lineWidth = 1;
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * TAU;
    ctx.beginPath();
    ctx.moveTo(CX + Math.cos(a) * 110, CY + Math.sin(a) * 110);
    ctx.lineTo(CX + Math.cos(a) * 18, CY + Math.sin(a) * 18);
    ctx.stroke();
  }
  // le point de convergence
  glow(ctx, '#ffffff', 22, () => {
    ctx.fillStyle = '#ffffff';
    star4(ctx, CX, CY, 26, 0.16);
    ctx.fill();
  });
  ctx.fillStyle = p.accent;
  star4(ctx, CX, CY, 12, 0.22);
  ctx.fill();
}

/** Convergence Astrale : une spirale de constellations autour d'un astrolabe. */
function astrale(ctx: Ctx, p: FamilyPalette, rng: Rng): void {
  halo(ctx, CX, CY, 132, p.glow, 'aa');
  // anneaux d'astrolabe gradués
  ctx.strokeStyle = '#ffd36b';
  for (const [r, w] of [[78, 3], [62, 1.6], [46, 2.4]] as const) {
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.arc(CX, CY, r, 0, TAU);
    ctx.stroke();
  }
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * TAU;
    const r0 = i % 4 === 0 ? 70 : 74;
    ctx.beginPath();
    ctx.moveTo(CX + Math.cos(a) * r0, CY + Math.sin(a) * r0);
    ctx.lineTo(CX + Math.cos(a) * 78, CY + Math.sin(a) * 78);
    ctx.stroke();
  }
  // spirale d'étoiles qui converge au centre
  let prev: [number, number] | null = null;
  for (let i = 0; i < 26; i++) {
    const t = i / 25;
    const a = t * TAU * 1.6 + 0.4;
    const r = 104 * (1 - t) + 10;
    const x = CX + Math.cos(a) * r;
    const y = CY + Math.sin(a) * r * 0.92;
    if (prev && i % 3 !== 0) {
      ctx.strokeStyle = `${p.ink}88`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(prev[0], prev[1]);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    ctx.fillStyle = i % 4 === 0 ? p.accent : p.ink;
    star4(ctx, x, y, 3 + (1 - t) * 4 + rng() * 1.5, 0.2);
    ctx.fill();
    prev = [x, y];
  }
  // l'astre central
  glow(ctx, '#ffffff', 20, () => {
    const g = ctx.createLinearGradient(CX - 30, CY - 30, CX + 30, CY + 30);
    g.addColorStop(0, '#fffbe8');
    g.addColorStop(0.6, '#ffd36b');
    g.addColorStop(1, p.light);
    ctx.fillStyle = g;
    star4(ctx, CX, CY, 34, 0.22);
    ctx.fill();
  });
}

// ---------------------------------------------------------------------------------------------- registre

type Motif = (ctx: Ctx, p: FamilyPalette, rng: Rng) => void;

/** Un motif par effet de variante et de Signature (les 20 effets du catalogue). */
export const EFFECT_MOTIFS: Readonly<Record<EffectId, Motif>> = {
  etincelle, braise, ferveur, contrecoup,
  eclaireur, detour, dissimulation, silence,
  racine, ecaille, entrave, tenacite,
  repere, prisme, relance, convergence,
  flamme: brasier, clairvoyance: miroir, emprise: couronne, cycle: astrale,
};

/** Trace le motif de l'effet `effect` pour une carte de la famille `family`. */
export function drawEffectMotif(ctx: Ctx, family: Family, effect: EffectId, rng: Rng): void {
  ctx.save();
  EFFECT_MOTIFS[effect](ctx, FAMILY_PALETTE[family], rng);
  ctx.restore();
}
