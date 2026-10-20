/**
 * Générateur d’illustrations de cartes — Canvas 2D, 100 % code, seedé.
 *
 * Entrées : defId (famille, rang, rareté, effet), artSeed. Sortie : dataURL PNG 240×336.
 * Coût : ~1 canvas 240×336 par définition (36 au catalogue), mis en cache par (artSeed, defId).
 * Invalidation : changement d’artSeed. N’utilise jamais la RNG gameplay.
 * Le catalogue est pré-généré hors du fil principal (`artWarmup.ts`, passe 14) ; la génération
 * synchrone ci-dessous reste le repli d’une carte demandée avant l’arrivée de son illustration.
 */
import { cardDef, type CardDef, type Family } from '../game/catalog/cards';
import { hashString, makeRng } from '../game/engine/rng';
import { drawEmblem } from './emblems';
import { FAMILY_PALETTE } from './palette';

export const ART_W = 240;
export const ART_H = 336;

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
type Rng = () => number;

const cache = new Map<string, string>();
let backCache: { seed: number; url: string; canvas: HTMLCanvasElement } | null = null;

export function artCacheSize(): number {
  return cache.size;
}

/** Clé de cache d’une illustration ; c’est aussi la graine de son tirage (même image partout). */
export function artKey(defId: string, artSeed: number): string {
  return `${artSeed}|${defId}`;
}

/**
 * Range une illustration produite ailleurs (worker). La première arrivée gagne : l’`src` d’une
 * carte déjà affichée ne change jamais. Renvoie vrai si l’illustration a été retenue.
 */
export function adoptCardArt(key: string, url: string): boolean {
  if (cache.has(key)) return false;
  cache.set(key, url);
  return true;
}

function canvas(w: number, h: number): { c: HTMLCanvasElement; ctx: Ctx } {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  // Tramé par le PROCESSEUR (`willReadFrequently`) : l’illustration est aussitôt encodée en PNG ; un
  // canvas accéléré imposerait une relecture depuis le GPU, ≈ 3× plus lente que l’encodage et bloquée
  // quand le processus GPU est occupé (46 ms à la première révélation, trace de la passe 12).
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D indisponible');
  return { c, ctx };
}

function bg(ctx: Ctx, def: CardDef & { family: Family }, rng: Rng): void {
  const p = FAMILY_PALETTE[def.family];
  const g = ctx.createRadialGradient(ART_W * (0.35 + rng() * 0.3), ART_H * 0.38, 10, ART_W / 2, ART_H / 2, ART_H * 0.75);
  g.addColorStop(0, p.light);
  g.addColorStop(0.45, p.mid);
  g.addColorStop(1, p.deep);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, ART_W, ART_H);
}

// --- Motifs par famille ---------------------------------------------------

function motifCendre(ctx: Ctx, def: CardDef, rng: Rng, intensity: number): void {
  const p = FAMILY_PALETTE.Cendre;
  // Langues de flamme ascendantes (courbes de Bézier superposées)
  const tongues = 5 + Math.round(intensity * 7);
  for (let i = 0; i < tongues; i++) {
    const x = ART_W * (0.1 + rng() * 0.8);
    const h = ART_H * (0.35 + rng() * 0.45 * intensity);
    const w = 18 + rng() * 26;
    const g = ctx.createLinearGradient(x, ART_H, x, ART_H - h);
    g.addColorStop(0, `${p.glow}cc`);
    g.addColorStop(0.6, `${p.accent}55`);
    g.addColorStop(1, `${p.accent}00`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - w, ART_H);
    ctx.bezierCurveTo(x - w * 0.6, ART_H - h * 0.5, x + w * (rng() - 0.5), ART_H - h * 0.7, x + (rng() - 0.5) * 20, ART_H - h);
    ctx.bezierCurveTo(x + w * 0.3, ART_H - h * 0.6, x + w * 0.7, ART_H - h * 0.4, x + w, ART_H);
    ctx.fill();
  }
  // Escarbilles losanges
  const embers = 18 + Math.round(intensity * 40);
  for (let i = 0; i < embers; i++) {
    const x = rng() * ART_W;
    const y = rng() * ART_H * 0.85;
    const s = 1.5 + rng() * 4 * intensity;
    ctx.fillStyle = rng() < 0.5 ? p.accent : p.glow;
    ctx.globalAlpha = 0.35 + rng() * 0.6;
    ctx.beginPath();
    ctx.moveTo(x, y - s); ctx.lineTo(x + s * 0.6, y); ctx.lineTo(x, y + s); ctx.lineTo(x - s * 0.6, y); ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function motifVoile(ctx: Ctx, def: CardDef, rng: Rng, intensity: number): void {
  const p = FAMILY_PALETTE.Voile;
  // Voiles ondulants (bandes sinusoïdales translucides)
  const bands = 4 + Math.round(intensity * 5);
  for (let b = 0; b < bands; b++) {
    const y0 = ART_H * (0.15 + (b / bands) * 0.8);
    const amp = 8 + rng() * 22;
    const freq = 0.015 + rng() * 0.02;
    const phase = rng() * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(0, y0);
    for (let x = 0; x <= ART_W; x += 6) ctx.lineTo(x, y0 + Math.sin(x * freq + phase) * amp);
    ctx.lineTo(ART_W, y0 + 40);
    for (let x = ART_W; x >= 0; x -= 6) ctx.lineTo(x, y0 + 30 + Math.sin(x * freq + phase + 0.8) * amp * 0.8);
    ctx.closePath();
    ctx.fillStyle = b % 2 ? `${p.accent}22` : `${p.light}33`;
    ctx.fill();
  }
  // Yeux / fragments de miroir (losanges creux)
  const shards = 6 + Math.round(intensity * 10);
  ctx.lineWidth = 1.2;
  for (let i = 0; i < shards; i++) {
    const x = rng() * ART_W;
    const y = rng() * ART_H;
    const s = 4 + rng() * 12;
    ctx.strokeStyle = `${p.accent}${rng() < 0.5 ? '88' : '44'}`;
    ctx.beginPath();
    ctx.moveTo(x, y - s); ctx.lineTo(x + s, y); ctx.lineTo(x, y + s); ctx.lineTo(x - s, y); ctx.closePath();
    ctx.stroke();
  }
}

function branch(ctx: Ctx, rng: Rng, x: number, y: number, ang: number, len: number, depth: number, color: string, thorn: string): void {
  if (depth <= 0 || len < 6) return;
  const x2 = x + Math.cos(ang) * len;
  const y2 = y + Math.sin(ang) * len;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, depth * 0.9);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo((x + x2) / 2 + (rng() - 0.5) * len * 0.4, (y + y2) / 2 + (rng() - 0.5) * len * 0.4, x2, y2);
  ctx.stroke();
  // épines
  if (rng() < 0.8) {
    const t = 0.5;
    const tx = x + (x2 - x) * t;
    const ty = y + (y2 - y) * t;
    const na = ang + (rng() < 0.5 ? 1 : -1) * 1.2;
    ctx.fillStyle = thorn;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx + Math.cos(na) * 6, ty + Math.sin(na) * 6);
    ctx.lineTo(tx + Math.cos(ang) * 3, ty + Math.sin(ang) * 3);
    ctx.fill();
  }
  const n = rng() < 0.35 ? 3 : 2;
  for (let i = 0; i < n; i++) branch(ctx, rng, x2, y2, ang + (rng() - 0.5) * 1.3, len * (0.62 + rng() * 0.2), depth - 1, color, thorn);
}

function motifRonce(ctx: Ctx, def: CardDef, rng: Rng, intensity: number): void {
  const p = FAMILY_PALETTE.Ronce;
  const roots = 2 + Math.round(intensity * 3);
  for (let i = 0; i < roots; i++) {
    const fromLeft = i % 2 === 0;
    branch(ctx, rng, fromLeft ? -4 : ART_W + 4, ART_H * (0.25 + rng() * 0.7), fromLeft ? -0.4 - rng() * 0.4 : Math.PI + 0.4 + rng() * 0.4, 46 + rng() * 26, 4 + Math.round(intensity * 2), `${p.light}cc`, p.accent);
  }
  // petites fleurs
  const flowers = 3 + Math.round(intensity * 6);
  for (let i = 0; i < flowers; i++) {
    ctx.fillStyle = `${p.accent}${rng() < 0.5 ? 'aa' : '66'}`;
    drawEmblem(ctx, 'Ronce', rng() * ART_W, rng() * ART_H, 4 + rng() * 6);
  }
}

function motifAstre(ctx: Ctx, def: CardDef, rng: Rng, intensity: number): void {
  const p = FAMILY_PALETTE.Astre;
  // champ d’étoiles
  const stars = 40 + Math.round(intensity * 90);
  for (let i = 0; i < stars; i++) {
    ctx.fillStyle = rng() < 0.2 ? p.accent : '#ffffff';
    ctx.globalAlpha = 0.25 + rng() * 0.75;
    const s = rng() < 0.92 ? 1 : 2;
    ctx.fillRect(rng() * ART_W, rng() * ART_H, s, s);
  }
  ctx.globalAlpha = 1;
  // orbites
  ctx.strokeStyle = `${p.accent}55`;
  ctx.lineWidth = 1;
  const orbits = 1 + Math.round(intensity * 3);
  for (let i = 0; i < orbits; i++) {
    ctx.beginPath();
    ctx.ellipse(ART_W / 2, ART_H * 0.42, 40 + i * 22, 14 + i * 9, -0.35 + rng() * 0.2, 0, Math.PI * 2);
    ctx.stroke();
  }
  // constellation
  const pts = Array.from({ length: 4 + Math.round(intensity * 4) }, () => [20 + rng() * (ART_W - 40), 20 + rng() * (ART_H - 40)] as const);
  ctx.strokeStyle = `${p.accent}99`;
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  ctx.fillStyle = p.accent;
  for (const [x, y] of pts) drawEmblem(ctx, 'Astre', x, y, 4);
}

const MOTIFS: Record<Family, (ctx: Ctx, def: CardDef, rng: Rng, intensity: number) => void> = {
  Cendre: motifCendre, Voile: motifVoile, Ronce: motifRonce, Astre: motifAstre,
};

function centralEmblem(ctx: Ctx, def: CardDef & { family: Family }, rng: Rng): void {
  const p = FAMILY_PALETTE[def.family];
  const cx = ART_W / 2;
  const cy = ART_H * 0.42;
  const r = def.signature ? 58 : 34 + (def.rank ?? 1) * 6;
  // halo
  const halo = ctx.createRadialGradient(cx, cy, 4, cx, cy, r * 1.9);
  halo.addColorStop(0, `${p.glow}aa`);
  halo.addColorStop(1, `${p.glow}00`);
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, ART_W, ART_H);
  // anneau de rang : n segments
  const segs = def.signature ? 12 : (def.rank ?? 1);
  ctx.strokeStyle = p.accent;
  ctx.lineWidth = def.signature ? 3 : 4;
  for (let i = 0; i < segs; i++) {
    const a0 = -Math.PI / 2 + (i * 2 * Math.PI) / segs + 0.12;
    const a1 = -Math.PI / 2 + ((i + 1) * 2 * Math.PI) / segs - 0.12;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.32, a0, a1);
    ctx.stroke();
  }
  // emblème
  ctx.fillStyle = p.deep;
  drawEmblem(ctx, def.family, cx + 3, cy + 4, r);
  const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  g.addColorStop(0, p.ink);
  g.addColorStop(0.5, p.accent);
  g.addColorStop(1, p.light);
  ctx.fillStyle = g;
  drawEmblem(ctx, def.family, cx, cy, r);
  if (def.signature) {
    // Signature : double emblème tournant + rayons prismatiques
    ctx.save();
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + rng() * 0.1;
      ctx.strokeStyle = ['#ff8fa3', '#ffd36b', '#8fdc6a', '#8fb8ff'][i % 4]!;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r * 1.5, cy + Math.sin(a) * r * 1.5);
      ctx.lineTo(cx + Math.cos(a) * r * 2.4, cy + Math.sin(a) * r * 2.4);
      ctx.stroke();
    }
    ctx.restore();
  }
  // variante : glyphe d’effet discret (petits points en couronne)
  if (def.effect && !def.signature) {
    ctx.fillStyle = p.ink;
    const n = 3 + (hashString(def.effect) % 4);
    for (let i = 0; i < n; i++) {
      const a = Math.PI * 0.15 + (i / (n - 1 || 1)) * Math.PI * 0.7;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * r * 1.62, cy + Math.sin(a) * r * 1.62, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function vignette(ctx: Ctx): void {
  const v = ctx.createRadialGradient(ART_W / 2, ART_H / 2, ART_H * 0.25, ART_W / 2, ART_H / 2, ART_H * 0.72);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, ART_W, ART_H);
}

/**
 * Avenant M10-A (AV-01, ADR 030) : carte NEUTRE, blanche et grise, Rang lisible, sans emblème ni motif de famille :
 * pierre claire au grain fin, anneau de Rang (un segment par Rang) et chiffre romain gravé.
 */
function neutreArt(ctx: Ctx, def: CardDef, rng: Rng): void {
  const g = ctx.createRadialGradient(ART_W * (0.4 + rng() * 0.2), ART_H * 0.36, 8, ART_W / 2, ART_H / 2, ART_H * 0.78);
  g.addColorStop(0, '#f1efe9');
  g.addColorStop(0.5, '#c4c2bb');
  g.addColorStop(1, '#55575d');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, ART_W, ART_H);
  // grain de la pierre et fines veines
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = rng() < 0.5 ? `rgba(40,40,46,${0.03 + rng() * 0.07})` : `rgba(255,255,255,${0.03 + rng() * 0.08})`;
    ctx.fillRect(rng() * ART_W, rng() * ART_H, 1 + rng() * 1.4, 1 + rng() * 1.4);
  }
  ctx.strokeStyle = 'rgba(70,70,78,0.16)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const y0 = rng() * ART_H;
    ctx.beginPath();
    ctx.moveTo(0, y0);
    ctx.bezierCurveTo(ART_W * 0.3, y0 + (rng() - 0.5) * 60, ART_W * 0.7, y0 + (rng() - 0.5) * 60, ART_W, y0 + (rng() - 0.5) * 40);
    ctx.stroke();
  }
  const cx = ART_W / 2;
  const cy = ART_H * 0.42;
  const r = 34 + (def.rank ?? 1) * 6;
  const halo = ctx.createRadialGradient(cx, cy, 4, cx, cy, r * 1.9);
  halo.addColorStop(0, 'rgba(255,255,255,0.55)');
  halo.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, ART_W, ART_H);
  const segs = def.rank ?? 1;
  ctx.strokeStyle = '#4a4c53';
  ctx.lineWidth = 4;
  for (let i = 0; i < segs; i++) {
    const a0 = -Math.PI / 2 + (i * 2 * Math.PI) / segs + 0.12;
    const a1 = -Math.PI / 2 + ((i + 1) * 2 * Math.PI) / segs - 0.12;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.32, a0, a1);
    ctx.stroke();
  }
  // chiffre romain gravé : ombre claire puis trait sombre (typographie système)
  const txt = def.rank ? ['', 'I', 'II', 'III', 'IV'][def.rank]! : '';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `600 ${Math.round(r * 1.25)}px Georgia, 'Times New Roman', serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText(txt, cx + 1.5, cy + 2.5);
  ctx.fillStyle = '#3b3d44';
  ctx.fillText(txt, cx, cy);
}

/** Dessine l’illustration sur un contexte NEUF de ART_W × ART_H (page ou worker, même tracé). */
export function drawCardArt(ctx: Ctx, defId: string, artSeed: number): void {
  const def = cardDef(defId);
  const rng = makeRng(hashString(artKey(defId, artSeed)));
  if (def.family === null) {
    neutreArt(ctx, def, rng);
    vignette(ctx);
    return;
  }
  const fdef = def as CardDef & { family: Family };
  bg(ctx, fdef, rng);
  const intensity = def.signature ? 1 : 0.35 + ((def.rank ?? 1) - 1) * 0.2 + (def.effect ? 0.05 : 0);
  MOTIFS[def.family](ctx, def, rng, intensity);
  centralEmblem(ctx, fdef, rng);
  vignette(ctx);
}

/** Génération synchrone sur le fil principal, sans cache (repli, et contrôle QA `artCheck`). */
export function paintCardArtUrl(defId: string, artSeed: number): string {
  const { c, ctx } = canvas(ART_W, ART_H);
  drawCardArt(ctx, defId, artSeed);
  return c.toDataURL('image/png');
}

export function cardArtUrl(defId: string, artSeed: number): string {
  const key = artKey(defId, artSeed);
  const hit = cache.get(key);
  if (hit) return hit;
  const url = paintCardArtUrl(defId, artSeed);
  cache.set(key, url);
  return url;
}

/** Verso commun (secret) : mandala des quatre voies, identique pour toutes les cartes. */
export function cardBackUrl(artSeed: number): string {
  if (backCache && backCache.seed === artSeed) return backCache.url;
  const rng = makeRng(hashString(`back|${artSeed}`));
  const { c, ctx } = canvas(ART_W, ART_H);
  const g = ctx.createLinearGradient(0, 0, ART_W, ART_H);
  g.addColorStop(0, '#16131f');
  g.addColorStop(1, '#2a2337');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, ART_W, ART_H);
  // treillis
  ctx.strokeStyle = 'rgba(214,196,160,0.10)';
  ctx.lineWidth = 1;
  for (let i = -ART_H; i < ART_W + ART_H; i += 14) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + ART_H, ART_H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(i, ART_H); ctx.lineTo(i + ART_H, 0); ctx.stroke();
  }
  const cx = ART_W / 2;
  const cy = ART_H / 2;
  ctx.strokeStyle = 'rgba(232,208,150,0.75)';
  ctx.lineWidth = 2;
  for (let k = 0; k < 3; k++) {
    ctx.beginPath();
    ctx.arc(cx, cy, 30 + k * 22 + rng() * 2, 0, Math.PI * 2);
    ctx.stroke();
  }
  const fams: Family[] = ['Cendre', 'Voile', 'Ronce', 'Astre'];
  fams.forEach((f, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 2;
    ctx.fillStyle = FAMILY_PALETTE[f].accent;
    drawEmblem(ctx, f, cx + Math.cos(a) * 74, cy + Math.sin(a) * 74, 15);
  });
  ctx.fillStyle = 'rgba(232,208,150,0.9)';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 22); ctx.lineTo(cx + 22, cy); ctx.lineTo(cx, cy + 22); ctx.lineTo(cx - 22, cy); ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(232,208,150,0.6)';
  ctx.lineWidth = 3;
  ctx.strokeRect(8, 8, ART_W - 16, ART_H - 16);
  const url = c.toDataURL('image/png');
  backCache = { seed: artSeed, url, canvas: c };
  return url;
}

/** Verso commun sous forme de canvas (texture Three.js), même génération que `cardBackUrl`. */
export function cardBackCanvas(artSeed: number): HTMLCanvasElement {
  cardBackUrl(artSeed);
  return backCache!.canvas;
}
