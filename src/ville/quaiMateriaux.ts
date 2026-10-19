/**
 * M09 V3 — textures du Quai retravaillé, peintes par code (graine d'art, aucune image externe). Techniques adaptées de
 * Cité du Tournoi (RPG-ArtByCode, `src/materials/TexturePainters.ts`, commit 7eba83b, lecture seule) :
 *   - relief « du peintre » cuit dans l'albédo : `albédo *= 1 + 0,9 · (h[x−1, y+1] − h[x+1, y−1])` (L. 147-157) : une
 *     lumière fixe venue d'en haut à gauche fait lire le relief même loin des lanternes ;
 *   - pierre de taille : mortier, biseau adouci, assombrissement des arêtes, éclats, coulures (L. 57-159) ;
 *   - enduit : taches, traces de truelle, plaques tombées qui montrent la pierre (L. 163-210) ;
 *   - ardoises à lèvre festonnée et ombre portée sous la lèvre (L. 278-318) ;
 *   - pavés en dôme, joints sombres ; alpha = hauteur (l'eau remplit d'abord les joints, L. 366-450).
 * Plus petites que là-bas (256 à 512 px, pas de carte de normales) : le relief cuit et la géométrie font le travail.
 * Palette froide (ardoise, pierre grise), ambre réservé aux lumières (DA de M09).
 */
import * as THREE from 'three';
import { FAMILY_PALETTE } from '../art/palette';
import { drawEmblem } from '../art/emblems';
import { FAMILIES } from '../game/catalog/cards';
import { hashString, makeRng } from '../game/engine/rng';

type Ctx = CanvasRenderingContext2D;
function cnv(w: number, h: number): { c: HTMLCanvasElement; ctx: Ctx } {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return { c, ctx: c.getContext('2d', { willReadFrequently: true })! };
}
function tex(c: HTMLCanvasElement, repeat = true): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}
/**
 * Toiles déjà peintes, par painter et arguments : revenir sur le Quai (îlots chargés un à un) ne repeint pas les
 * textures en relief, le plus long de la construction de l'îlot (≈ 250 ms sur ce poste). Les textures GPU, elles,
 * sont recréées et libérées avec l'îlot ; seules les toiles restent en mémoire (≈ 6 Mo).
 */
const PAINTED = new Map<string, HTMLCanvasElement>();
function painted(key: string, paint: () => HTMLCanvasElement): HTMLCanvasElement {
  let c = PAINTED.get(key);
  if (!c) { c = paint(); PAINTED.set(key, c); }
  return c;
}
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = (a: number, b: number, x: number) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

/** Bruit de valeur 2D périodique (tuile sans couture), pour taches et grain. */
function valueNoise(seed: number, period: number): (x: number, y: number) => number {
  const rng = makeRng(seed);
  const g = Array.from({ length: period * period }, () => rng());
  const at = (i: number, j: number) => g[(((j % period) + period) % period) * period + (((i % period) + period) % period)]!;
  return (x, y) => {
    const i = Math.floor(x);
    const j = Math.floor(y);
    const fx = x - i;
    const fy = y - j;
    const u = fx * fx * (3 - 2 * fx);
    const v = fy * fy * (3 - 2 * fy);
    return (at(i, j) * (1 - u) + at(i + 1, j) * u) * (1 - v) + (at(i, j + 1) * (1 - u) + at(i + 1, j + 1) * u) * v;
  };
}
function fbm(n: (x: number, y: number) => number, x: number, y: number, oct = 4): number {
  let s = 0;
  let a = 0.5;
  let f = 1;
  let norm = 0;
  for (let i = 0; i < oct; i++) { s += a * n(x * f, y * f); norm += a; a *= 0.5; f *= 2; }
  return s / norm;
}

/** Applique le relief cuit (lumière fixe d'en haut à gauche) à une image RGB à partir d'une carte de hauteur. */
function bakeRelief(img: ImageData, h: Float32Array, S: number, k = 0.9, alphaFromHeight = false): void {
  const d = img.data;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const xm = (x - 1 + S) % S;
      const xp = (x + 1) % S;
      const yp = (y + 1) % S;
      const ym = (y - 1 + S) % S;
      const m = 1 + k * (h[yp * S + xm]! - h[ym * S + xp]!);
      const i = (y * S + x) * 4;
      d[i] = d[i]! * m;
      d[i + 1] = d[i + 1]! * m;
      d[i + 2] = d[i + 2]! * m;
      if (alphaFromHeight) d[i + 3] = Math.round(clamp01(h[y * S + x]!) * 255);
    }
  }
}

/** Pierre de taille froide en relief : assises, blocs biseautés, mortier, éclats, coulures. `rows` assises par tuile. */
function paintAshlarRelief(seed: number, opts: { rows?: number; pal?: readonly (readonly number[])[]; mortar?: readonly number[]; S?: number } = {}): HTMLCanvasElement {
  const S = opts.S ?? 512;
  const rows = opts.rows ?? 6;
  const pal = opts.pal ?? [[124, 128, 140], [108, 114, 128], [132, 132, 138], [98, 104, 118], [118, 120, 128], [112, 116, 124]];
  const mortar = opts.mortar ?? [52, 54, 62];
  const { c, ctx } = cnv(S, S);
  const rng = makeRng(hashString(`v3|pierre|${seed}`));
  const n = valueNoise(hashString(`v3|pierre-n|${seed}`), 16);
  const img = ctx.createImageData(S, S);
  const h = new Float32Array(S * S);
  const rh = S / rows;
  // Blocs : pour chaque assise, une suite de largeurs ; chaque pixel cherche son bloc.
  const blocks: { x0: number; x1: number; tone: readonly number[]; k: number; tilt: number }[][] = [];
  for (let r = 0; r < rows; r++) {
    const list: { x0: number; x1: number; tone: readonly number[]; k: number; tilt: number }[] = [];
    let x = -rng() * rh;
    while (x < S) {
      const w = rh * (1.25 + rng() * 1.1);
      list.push({ x0: x, x1: x + w, tone: pal[Math.floor(rng() * pal.length)]!, k: 0.84 + rng() * 0.24, tilt: (rng() - 0.5) * 0.25 });
      x += w;
    }
    blocks.push(list);
  }
  const gap = 4.5;
  const bev = 9;
  for (let y = 0; y < S; y++) {
    const r = Math.min(rows - 1, Math.floor(y / rh));
    const ly = y - r * rh;
    for (let x = 0; x < S; x++) {
      const list = blocks[r]!;
      let b = list[0]!;
      for (const q of list) if (x >= q.x0 && x < q.x1) { b = q; break; }
      // le bloc qui déborde à droite se répète à gauche (tuile sans couture)
      if (x < list[0]!.x0) b = list[list.length - 1]!;
      const lx = x < b.x0 ? x + S - b.x0 : x - b.x0;
      const w = b.x1 - b.x0;
      const e = Math.min(lx, w - lx, ly, rh - ly) - gap;
      const i = (y * S + x) * 4;
      if (e <= 0) {
        const m = 0.85 + n(x / 16, y / 16) * 0.3;
        img.data[i] = mortar[0]! * m; img.data[i + 1] = mortar[1]! * m; img.data[i + 2] = mortar[2]! * m; img.data[i + 3] = 255;
        h[y * S + x] = 0;
        continue;
      }
      const bevel = smooth(0, bev, e);
      const grain = fbm(n, x / 12 + r * 7.3, y / 12, 3);
      const streak = n(x / 3.5, y / 60) * 0.5 + 0.5;
      let k = b.k * (0.62 + 0.38 * bevel) * (0.88 + grain * 0.26) * (0.94 + streak * 0.08) * (1 + b.tilt * (ly / rh - 0.5));
      // éclats (petites cuvettes sombres) et taches de suie
      if (grain > 0.68 && bevel > 0.6) k *= 0.86;
      img.data[i] = b.tone[0]! * k; img.data[i + 1] = b.tone[1]! * k; img.data[i + 2] = b.tone[2]! * k; img.data[i + 3] = 255;
      h[y * S + x] = 0.35 + 0.65 * bevel - (grain > 0.68 ? 0.12 : 0) + grain * 0.1;
    }
  }
  bakeRelief(img, h, S, 0.9);
  ctx.putImageData(img, 0, 0);
  // coulures verticales (eau de pluie) par-dessus
  for (let i = 0; i < 26; i++) {
    const x = rng() * S;
    const y = rng() * S * 0.6;
    const g = ctx.createLinearGradient(x, y, x, y + 80 + rng() * 160);
    g.addColorStop(0, 'rgba(18,22,32,0.2)');
    g.addColorStop(1, 'rgba(18,22,32,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, 2 + rng() * 5, 240);
  }
  return c;
}

/** Enduit ivoire désaturé : taches, traces de truelle, plaques tombées laissant voir la pierre, traînées d'humidité. */
function paintPlasterRelief(seed: number): HTMLCanvasElement {
  const S = 512;
  const { c, ctx } = cnv(S, S);
  const rng = makeRng(hashString(`v3|enduit|${seed}`));
  const n = valueNoise(hashString(`v3|enduit-n|${seed}`), 8);
  const n2 = valueNoise(hashString(`v3|enduit-t|${seed}`), 32);
  const img = ctx.createImageData(S, S);
  const h = new Float32Array(S * S);
  // plaques tombées : disques déformés
  // Plaques tombées : petites et rares (à 2,4 m par tuile, une grande plaque se lisait comme un anneau répété).
  const patches = Array.from({ length: 2 }, () => ({ x: rng() * S, y: rng() * S, r: 10 + rng() * 12 }));
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const blot = fbm(n, x / 64, y / 64, 4);
      const trowel = fbm(n2, x / 22, y / 6, 2);
      let base = 168 + (blot - 0.5) * 40 + (trowel - 0.5) * 14;
      let r = base;
      let g = base * 0.995;
      let b = base * 0.985;
      let hh = 0.6 + (trowel - 0.5) * 0.15;
      for (const p of patches) {
        let dx = x - p.x;
        let dy = y - p.y;
        if (dx > S / 2) dx -= S; else if (dx < -S / 2) dx += S;
        if (dy > S / 2) dy -= S; else if (dy < -S / 2) dy += S;
        const d = Math.hypot(dx, dy) / (p.r * (0.75 + 0.5 * n(x / 20, y / 20)));
        if (d < 1) {
          // pierre sous l'enduit (assises sombres), lèvre assombrie et relevée
          const row = Math.floor((y + p.x) / 26);
          const joint = (y % 26) < 3 || ((x + row * 17) % 44) < 3;
          const st = joint ? 70 : 112 + (n(x / 9, y / 9) - 0.5) * 30;
          r = st; g = st * 1.02; b = st * 1.1;
          hh = joint ? 0.1 : 0.35;
          r = r * 0.6 + base * 0.4; g = g * 0.6 + base * 0.4; b = b * 0.6 + base * 0.4;
          if (d > 0.82) { r *= 0.82; g *= 0.82; b *= 0.82; hh = 0.72; }
          break;
        }
      }
      const i = (y * S + x) * 4;
      img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
      h[y * S + x] = hh;
    }
  }
  bakeRelief(img, h, S, 0.7);
  ctx.putImageData(img, 0, 0);
  // traînées d'humidité sous les appuis et fissures fines
  for (let i = 0; i < 14; i++) {
    const x = rng() * S;
    const y = rng() * S;
    const gr = ctx.createLinearGradient(x, y, x, y + 140);
    gr.addColorStop(0, 'rgba(60,64,76,0.22)');
    gr.addColorStop(1, 'rgba(60,64,76,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(x - 6, y, 12 + rng() * 14, 140);
  }
  ctx.strokeStyle = 'rgba(70,70,80,0.45)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 7; i++) {
    let x = rng() * S;
    let y = rng() * S;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let k = 0; k < 8; k++) { x += (rng() - 0.5) * 18; y += 6 + rng() * 10; ctx.lineTo(x, y); }
    ctx.stroke();
  }
  return c;
}

/** Bois de colombage : fil étiré, nœuds, ombrage cylindrique en travers de la pièce (u le long de la poutre). */
function paintTimberRelief(seed: number): HTMLCanvasElement {
  const S = 256;
  const { c, ctx } = cnv(S, S);
  const n = valueNoise(hashString(`v3|bois|${seed}`), 16);
  const img = ctx.createImageData(S, S);
  const h = new Float32Array(S * S);
  for (let y = 0; y < S; y++) {
    const across = Math.sin((y % 64) / 64 * Math.PI); // quatre pièces par tuile, arrondies
    for (let x = 0; x < S; x++) {
      const grain = fbm(n, x / 40, y / 2.2 + n(x / 30, y / 30) * 3, 3);
      const k = (0.62 + 0.38 * across) * (0.78 + grain * 0.4) * ((y % 64) < 2 ? 0.45 : 1);
      const i = (y * S + x) * 4;
      img.data[i] = 78 * k; img.data[i + 1] = 66 * k; img.data[i + 2] = 60 * k; img.data[i + 3] = 255;
      h[y * S + x] = across * 0.6 + grain * 0.3;
    }
  }
  bakeRelief(img, h, S, 0.6);
  ctx.putImageData(img, 0, 0);
  return c;
}

/** Planches (portes, volets, coques, balcons) : lames verticales, joints, clous, usure grise. */
function paintPlanksRelief(seed: number, tone: readonly number[] = [86, 74, 64]): HTMLCanvasElement {
  const S = 256;
  const { c, ctx } = cnv(S, S);
  const rng = makeRng(hashString(`v3|planches|${seed}`));
  const n = valueNoise(hashString(`v3|planches-n|${seed}`), 16);
  const img = ctx.createImageData(S, S);
  const h = new Float32Array(S * S);
  const W = 32;
  const ks = Array.from({ length: S / W }, () => 0.8 + rng() * 0.32);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const p = Math.floor(x / W);
      const lx = x % W;
      const joint = lx < 2;
      const grain = fbm(n, x / 2.5 + p * 9, y / 36, 3);
      const k = joint ? 0.35 : ks[p]! * (0.78 + grain * 0.4) * (0.9 + 0.1 * Math.sin((lx / W) * Math.PI));
      const grey = grain > 0.62 ? 0.15 : 0;
      const i = (y * S + x) * 4;
      img.data[i] = (tone[0]! * (1 - grey) + 96 * grey) * k;
      img.data[i + 1] = (tone[1]! * (1 - grey) + 98 * grey) * k;
      img.data[i + 2] = (tone[2]! * (1 - grey) + 104 * grey) * k;
      img.data[i + 3] = 255;
      h[y * S + x] = joint ? 0 : 0.5 + grain * 0.2;
    }
  }
  bakeRelief(img, h, S, 0.7);
  ctx.putImageData(img, 0, 0);
  ctx.fillStyle = 'rgba(30,26,24,0.8)';
  for (let p = 0; p < S / W; p++) for (const y of [24, S - 24]) { ctx.beginPath(); ctx.arc(p * W + W / 2, y, 1.8, 0, Math.PI * 2); ctx.fill(); }
  return c;
}

/** Ardoises en écailles : lèvre festonnée, ombre portée sous la lèvre, teintes froides. */
function paintSlateRelief(seed: number): HTMLCanvasElement {
  const S = 256;
  const { c, ctx } = cnv(S, S);
  const rng = makeRng(hashString(`v3|ardoise|${seed}`));
  const pal = [[80, 86, 98], [70, 74, 88], [92, 96, 106], [86, 90, 100], [74, 78, 92], [98, 100, 108]];
  ctx.fillStyle = 'rgb(30,32,40)';
  ctx.fillRect(0, 0, S, S);
  const rows = 10;
  const rh = S / rows;
  const cols = 8;
  const cw = S / cols;
  for (let r = rows - 1; r >= -1; r--) {
    for (let i = -1; i <= cols; i++) {
      const x = i * cw + (r % 2 ? cw / 2 : 0);
      const y = r * rh;
      const tone = pal[Math.floor(rng() * pal.length)]!;
      const k = 0.82 + rng() * 0.3;
      // ombre portée sous la lèvre de la rangée du dessus
      ctx.fillStyle = 'rgba(8,10,16,0.55)';
      ctx.beginPath();
      ctx.roundRect(x + 1, y + 2, cw - 2, rh * 1.25, [0, 0, cw * 0.45, cw * 0.45]);
      ctx.fill();
      const g = ctx.createLinearGradient(0, y, 0, y + rh * 1.2);
      g.addColorStop(0, `rgb(${tone[0]! * k * 0.78},${tone[1]! * k * 0.78},${tone[2]! * k * 0.8})`);
      g.addColorStop(0.8, `rgb(${tone[0]! * k * 1.08},${tone[1]! * k * 1.08},${tone[2]! * k * 1.08})`);
      g.addColorStop(1, `rgb(${tone[0]! * k * 0.9},${tone[1]! * k * 0.9},${tone[2]! * k * 0.92})`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(x + 1.5, y, cw - 3, rh * 1.18, [0, 0, cw * 0.42, cw * 0.42]);
      ctx.fill();
    }
  }
  return c;
}

/** Pavés en dôme gris-bleu, joints sombres ; alpha = hauteur (les flaques remplissent d'abord les joints). */
function paintCobbleRelief(seed: number): HTMLCanvasElement {
  const S = 512;
  const { c, ctx } = cnv(S, S);
  const rng = makeRng(hashString(`v3|paves|${seed}`));
  const n = valueNoise(hashString(`v3|paves-n|${seed}`), 32);
  const pal = [[78, 84, 98], [70, 76, 90], [88, 90, 100], [96, 92, 94], [62, 68, 84], [84, 86, 92], [74, 74, 84], [92, 90, 100]];
  const rows = 10;
  const rh = S / rows;
  type Stone = { x0: number; w: number; tone: readonly number[]; k: number; tx: number; ty: number };
  const stones: Stone[][] = [];
  for (let r = 0; r < rows; r++) {
    const list: Stone[] = [];
    let x = -rng() * 30;
    while (x < S) {
      const w = 36 + rng() * 26;
      list.push({ x0: x, w, tone: pal[Math.floor(rng() * pal.length)]!, k: 0.8 + rng() * 0.26, tx: (rng() - 0.5) * 0.16, ty: (rng() - 0.5) * 0.16 });
      x += w;
    }
    stones.push(list);
  }
  const img = ctx.createImageData(S, S);
  const h = new Float32Array(S * S);
  for (let y = 0; y < S; y++) {
    const r = Math.min(rows - 1, Math.floor(y / rh));
    const ly = (y - r * rh) / rh - 0.5;
    for (let x = 0; x < S; x++) {
      const list = stones[r]!;
      let s = list[list.length - 1]!;
      let lx0 = x - s.x0 + S;
      for (const q of list) if (x >= q.x0 && x < q.x0 + q.w) { s = q; lx0 = x - q.x0; break; }
      const lx = lx0 / s.w - 0.5;
      // rectangle arrondi en distance signée normalisée
      const qx = Math.abs(lx) * 2;
      const qy = Math.abs(ly) * 2;
      const rr = 0.42;
      const dx = Math.max(qx - (1 - rr), 0);
      const dy = Math.max(qy - (1 - rr), 0);
      const sd = Math.hypot(dx, dy) / rr; // 0 au centre .. 1 au bord arrondi
      const inside = Math.max(qx, qy) < 0.86 + (1 - sd) * 0.1 && sd < 0.92;
      const i = (y * S + x) * 4;
      if (!inside) {
        const m = 0.8 + n(x / 6, y / 6) * 0.4;
        img.data[i] = 22 * m; img.data[i + 1] = 24 * m; img.data[i + 2] = 30 * m; img.data[i + 3] = 255;
        h[y * S + x] = 0;
        continue;
      }
      const dome = 1 - Math.min(1, (lx * lx + ly * ly) * 2.4);
      const grain = fbm(n, x / 5, y / 5, 3);
      const k = s.k * (0.72 + 0.32 * dome) * (0.86 + grain * 0.28) * (1 + s.tx * lx * 2 + s.ty * ly * 2);
      img.data[i] = s.tone[0]! * k; img.data[i + 1] = s.tone[1]! * k; img.data[i + 2] = s.tone[2]! * k; img.data[i + 3] = 255;
      h[y * S + x] = 0.3 + 0.7 * dome * smooth(0.92, 0.5, sd);
    }
  }
  bakeRelief(img, h, S, 0.8, true);
  ctx.putImageData(img, 0, 0);
  return c;
}

// Textures exportées : toile mise en cache, texture neuve à chaque construction de l'îlot.
export function ashlarRelief(seed: number, opts: { rows?: number; pal?: readonly (readonly number[])[]; mortar?: readonly number[]; S?: number } = {}): THREE.CanvasTexture {
  return tex(painted(`pierre|${JSON.stringify(seed)}|${JSON.stringify(opts)}`, () => paintAshlarRelief(seed, opts)));
}
export function plasterRelief(seed: number): THREE.CanvasTexture {
  return tex(painted(`enduit|${JSON.stringify(seed)}`, () => paintPlasterRelief(seed)));
}
export function timberRelief(seed: number): THREE.CanvasTexture {
  return tex(painted(`bois|${JSON.stringify(seed)}`, () => paintTimberRelief(seed)));
}
export function planksRelief(seed: number, tone: readonly number[] = [86, 74, 64]): THREE.CanvasTexture {
  return tex(painted(`planches|${JSON.stringify(seed)}|${JSON.stringify(tone)}`, () => paintPlanksRelief(seed, tone)));
}
export function slateRelief(seed: number): THREE.CanvasTexture {
  return tex(painted(`ardoise|${JSON.stringify(seed)}`, () => paintSlateRelief(seed)));
}
export function cobbleRelief(seed: number): THREE.CanvasTexture {
  return tex(painted(`paves|${JSON.stringify(seed)}`, () => paintCobbleRelief(seed)));
}

/**
 * Atlas de fenêtres (4 × 2 cases de 64 × 96) : allumées (chaude, tamisée, rideau, bougie, petits carreaux sertis) et
 * éteintes (reflet de ciel, volets clos avec fente de lumière, vitre sombre à carreaux). Les fenêtres d'une façade
 * partagent un appel de dessin : chaque vitre choisit sa case par ses UV.
 */
export const WINDOW_CELLS = { warm: 0, dim: 1, curtain: 2, candle: 3, leaded: 4, dark: 5, slit: 6, darkLeaded: 7 } as const;
export type WindowCell = keyof typeof WINDOW_CELLS;
export function windowAtlas(seed: number): THREE.CanvasTexture {
  const W = 64;
  const H = 96;
  const { c, ctx } = cnv(W * 4, H * 2);
  const rng = makeRng(hashString(`v3|fenetres|${seed}`));
  const cell = (k: number, draw: (x: number, y: number) => void) => { ctx.save(); ctx.translate((k % 4) * W, Math.floor(k / 4) * H); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip(); draw(0, 0); ctx.restore(); };
  const warmGrad = (top: string, bot: string) => { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, top); g.addColorStop(1, bot); return g; };
  const panes = (lead: string, n = 3) => {
    ctx.strokeStyle = lead;
    ctx.lineWidth = 1.4;
    for (let i = 1; i < n; i++) { ctx.beginPath(); ctx.moveTo((W * i) / n, 0); ctx.lineTo((W * i) / n, H); ctx.stroke(); }
    for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(0, (H * i) / 5); ctx.lineTo(W, (H * i) / 5); ctx.stroke(); }
  };
  const diamonds = (lead: string) => {
    ctx.strokeStyle = lead;
    ctx.lineWidth = 1.2;
    for (let i = -6; i < 10; i++) {
      ctx.beginPath(); ctx.moveTo(i * 14, 0); ctx.lineTo(i * 14 + H * 0.6, H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(i * 14 + H * 0.6, 0); ctx.lineTo(i * 14, H); ctx.stroke();
    }
  };
  // allumée, chaude : intérieur deviné (poutre, étagère), carreaux
  cell(0, () => {
    ctx.fillStyle = warmGrad('#ffd793', '#c86a22'); ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(90,40,14,0.45)'; ctx.fillRect(0, 10, W, 6); ctx.fillRect(8, 58, 40, 4);
    panes('rgba(40,22,12,0.6)');
  });
  // tamisée
  cell(1, () => { ctx.fillStyle = warmGrad('#c98a46', '#6e3412'); ctx.fillRect(0, 0, W, H); panes('rgba(30,16,8,0.6)'); });
  // rideau à demi tiré
  cell(2, () => {
    ctx.fillStyle = warmGrad('#ffcf86', '#b65a1c'); ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(120,46,22,0.72)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W * 0.48, 0); ctx.quadraticCurveTo(W * 0.3, H * 0.5, W * 0.36, H); ctx.lineTo(0, H); ctx.fill();
    ctx.fillStyle = 'rgba(90,30,14,0.5)'; for (let x = 4; x < W * 0.4; x += 7) ctx.fillRect(x, 0, 2, H);
    panes('rgba(40,22,12,0.5)', 2);
  });
  // bougie : sombre, lueur ronde en bas
  cell(3, () => {
    ctx.fillStyle = '#2a1a12'; ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(W * 0.5, H * 0.72, 2, W * 0.5, H * 0.72, H * 0.6); g.addColorStop(0, '#ffcf7a'); g.addColorStop(0.4, '#a2501a'); g.addColorStop(1, '#2a1a12');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); panes('rgba(20,12,8,0.6)');
  });
  // petits carreaux sertis (losanges), allumée
  cell(4, () => { ctx.fillStyle = warmGrad('#ffd08a', '#b8601e'); ctx.fillRect(0, 0, W, H); diamonds('rgba(40,22,12,0.75)'); });
  // éteinte : reflet de ciel en biais
  cell(5, () => {
    ctx.fillStyle = warmGrad('#1d2b44', '#0b1220'); ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(120,150,200,0.16)'; ctx.beginPath(); ctx.moveTo(0, H * 0.55); ctx.lineTo(W, H * 0.1); ctx.lineTo(W, H * 0.28); ctx.lineTo(0, H * 0.73); ctx.fill();
    panes('rgba(6,8,14,0.8)');
  });
  // volets clos, fente de lumière (sous l'œil, d'après Cité du Tournoi)
  cell(6, () => {
    ctx.fillStyle = '#3a3430'; ctx.fillRect(0, 0, W, H);
    for (let x = 0; x < W; x += 8) { ctx.fillStyle = `rgba(20,16,14,${0.4 + rng() * 0.2})`; ctx.fillRect(x, 0, 1.5, H); }
    ctx.fillStyle = '#ffb860'; ctx.fillRect(W / 2 - 1.5, 6, 3, H - 12);
    ctx.fillStyle = 'rgba(255,184,96,0.25)'; ctx.fillRect(W / 2 - 5, 6, 10, H - 12);
  });
  // éteinte à losanges
  cell(7, () => { ctx.fillStyle = warmGrad('#1a2438', '#0a101c'); ctx.fillRect(0, 0, W, H); diamonds('rgba(4,6,12,0.85)'); });
  const t = tex(c, false);
  t.anisotropy = 4;
  return t;
}

/** Fixe les UV d'un plan de vitre sur une case de l'atlas des fenêtres. */
export function windowUV(geo: THREE.BufferGeometry, cellName: WindowCell): THREE.BufferGeometry {
  const k = WINDOW_CELLS[cellName];
  const u0 = (k % 4) / 4;
  const v0 = 1 - (Math.floor(k / 4) + 1) / 2;
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * 0.25 * 0.94 + 0.0075, v0 + uv.getY(i) * 0.5 * 0.96 + 0.01);
  return geo;
}

/**
 * Atlas d'enseignes sans texte (4 cases de 128 × 160) : écusson indigo cerclé d'or, emblème doré (DA de Cité du
 * Tournoi, `CanvasArt` L. 279-282) : lanterne (le Fanal), éventail de cartes (salle de jeu), ancre (armateur), poulie et
 * cordage (chantier).
 */
export const SIGN_CELLS = { lanterne: 0, cartes: 1, ancre: 2, poulie: 3 } as const;
export function signAtlas(): THREE.CanvasTexture {
  const W = 128;
  const H = 160;
  const { c, ctx } = cnv(W * 4, H);
  const gold = '#d6ae5e';
  const goldDeep = '#8e6a2c';
  const shield = (k: number, emblem: () => void) => {
    ctx.save();
    ctx.translate(k * W, 0);
    ctx.beginPath();
    ctx.moveTo(8, 8); ctx.lineTo(W - 8, 8); ctx.lineTo(W - 8, H * 0.66); ctx.lineTo(W / 2, H - 6); ctx.lineTo(8, H * 0.66); ctx.closePath();
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#2a3354'); g.addColorStop(1, '#141a30');
    ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = 6; ctx.strokeStyle = goldDeep; ctx.stroke();
    ctx.lineWidth = 2.5; ctx.strokeStyle = gold; ctx.stroke();
    ctx.translate(W / 2, H * 0.44);
    ctx.fillStyle = gold; ctx.strokeStyle = gold; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    emblem();
    ctx.restore();
  };
  shield(0, () => {
    // lanterne
    ctx.fillRect(-10, -42, 20, 6);
    ctx.beginPath(); ctx.moveTo(-20, -34); ctx.lineTo(20, -34); ctx.lineTo(16, 26); ctx.lineTo(-16, 26); ctx.closePath(); ctx.lineWidth = 4; ctx.stroke();
    ctx.fillStyle = '#ffd98a'; ctx.beginPath(); ctx.ellipse(0, -2, 8, 14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = gold; ctx.fillRect(-22, 26, 44, 7);
  });
  shield(1, () => {
    // éventail de trois cartes
    for (const a of [-0.42, 0, 0.42]) { ctx.save(); ctx.rotate(a); ctx.beginPath(); ctx.roundRect(-13, -40, 26, 40, 3); ctx.lineWidth = 3.5; ctx.stroke(); ctx.restore(); }
    ctx.beginPath(); ctx.moveTo(0, -24); ctx.lineTo(6, -16); ctx.lineTo(0, -8); ctx.lineTo(-6, -16); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(0, 4, 5, 0, Math.PI * 2); ctx.fill();
  });
  shield(2, () => {
    // ancre
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(0, -34, 7, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -27); ctx.lineTo(0, 28); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-16, -16); ctx.lineTo(16, -16); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 6, 24, 0.25, Math.PI - 0.25); ctx.stroke();
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 23, 14); ctx.lineTo(s * 28, 4); ctx.lineTo(s * 16, 10); ctx.closePath(); ctx.fill(); }
  });
  shield(3, () => {
    // poulie et cordage
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(0, -14, 16, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -14, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, -42); ctx.lineTo(0, -30); ctx.stroke();
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-16, -14); ctx.lineTo(-16, 30); ctx.moveTo(16, -14); ctx.lineTo(16, 18); ctx.stroke();
    ctx.beginPath(); ctx.roundRect(8, 18, 16, 12, 3); ctx.fill();
  });
  return tex(c, false);
}
export function signUV(geo: THREE.BufferGeometry, k: number): THREE.BufferGeometry {
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setX(i, (k + uv.getX(i)) / 4);
  return geo;
}

/** Intérieur d'échoppe éclairé (vitrine) : fond chaud, étagères, silhouettes de marchandises (bocaux, rouleaux, filets). */
export function shopInterior(seed: number): THREE.CanvasTexture {
  const W = 256;
  const H = 160;
  const { c, ctx } = cnv(W, H);
  const rng = makeRng(hashString(`v3|echoppe|${seed}`));
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#f2c27a'); g.addColorStop(0.6, '#c27630'); g.addColorStop(1, '#5a2a10');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  for (const y of [42, 84, 124]) {
    ctx.fillStyle = 'rgba(60,26,10,0.85)'; ctx.fillRect(0, y, W, 5);
    for (let x = 6; x < W - 10;) {
      const w = 8 + rng() * 16;
      const hh = 10 + rng() * 22;
      ctx.fillStyle = `rgba(${50 + rng() * 40},${22 + rng() * 20},${10 + rng() * 10},${0.55 + rng() * 0.3})`;
      if (rng() < 0.5) { ctx.beginPath(); ctx.roundRect(x, y - hh, w, hh, 3); ctx.fill(); } else { ctx.beginPath(); ctx.ellipse(x + w / 2, y - hh / 2, w / 2, hh / 2, 0, 0, Math.PI * 2); ctx.fill(); }
      x += w + 3 + rng() * 6;
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Salle commune du Fanal vue par la porte ouverte : lueur chaude, poutre, comptoir, silhouettes attablées. */
export function tavernInterior(seed: number): THREE.CanvasTexture {
  const W = 128;
  const H = 192;
  const { c, ctx } = cnv(W, H);
  const rng = makeRng(hashString(`v3|taverne|${seed}`));
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#7a3c16'); g.addColorStop(0.45, '#e09a4e'); g.addColorStop(0.8, '#b8662a'); g.addColorStop(1, '#4a2410');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W * 0.6, H * 0.4, 4, W * 0.6, H * 0.4, H * 0.5);
  glow.addColorStop(0, 'rgba(255,214,140,0.85)'); glow.addColorStop(1, 'rgba(255,214,140,0)');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(50,20,8,0.85)'; ctx.fillRect(0, 22, W, 10); ctx.fillRect(18, 0, 8, H * 0.6);
  // comptoir et silhouettes attablées
  ctx.fillStyle = 'rgba(46,18,8,0.9)'; ctx.fillRect(0, H * 0.66, W, H * 0.34);
  for (const [x, s] of [[30, 1], [86, 0.9]] as const) {
    ctx.fillStyle = `rgba(36,14,6,${0.8 + rng() * 0.15})`;
    ctx.beginPath(); ctx.ellipse(x, H * 0.5, 10 * s, 12 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.roundRect(x - 16 * s, H * 0.56, 32 * s, 34 * s, 10); ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,224,160,0.9)'; for (const x of [58, 66]) ctx.fillRect(x, H * 0.6, 4, 8);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Façades de la ville haute (au loin) : ardoise très sombre, fenêtres chaudes rares sur une grille de 1,6 × 2,6 m. */
export function farFacadeTexture(seed: number, litChance = 0.12, large = false, cool = 0): THREE.CanvasTexture {
  const S = 256;
  const { c, ctx } = cnv(S, S);
  const rng = makeRng(hashString(`v3|loin|${seed}`));
  ctx.fillStyle = 'rgb(12,14,22)';
  ctx.fillRect(0, 0, S, S);
  // 8 colonnes × 5 rangées par tuile (la tuile couvre 12,8 × 13 m)
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 8; x++) {
      const r = rng();
      const lit = r < litChance;
      const dim = !lit && r < litChance * 2.2;
      // `cool` : part des fenêtres éclairées d'argent bleuté (la ville haute baignée par la lueur du Voile, direction D)
      const silver = lit && rng() < cool;
      ctx.fillStyle = silver ? `rgb(${150 + rng() * 40},${185 + rng() * 40},${240 + rng() * 15})` : lit ? `rgb(${215 + rng() * 40},${130 + rng() * 40},${55 + rng() * 25})` : dim ? 'rgb(70,40,22)' : 'rgb(18,22,34)';
      // au loin, des fenêtres plus larges : à 60-90 m, une fenêtre de 0,5 m disparaîtrait dans les mipmaps
      if (large) ctx.fillRect(x * 32 + 8, y * 51 + 12, 16, 26);
      else ctx.fillRect(x * 32 + 11, y * 51 + 14, 10, 20);
    }
  }
  const t = tex(c);
  t.anisotropy = 2;
  return t;
}

/** Brume : bruit doux périodique en niveaux de gris (alpha), pour les nappes basses animées. */
export function mistTexture(seed: number): THREE.CanvasTexture {
  const S = 256;
  const { c, ctx } = cnv(S, S);
  const n = valueNoise(hashString(`v3|brume|${seed}`), 8);
  const img = ctx.createImageData(S, S);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const v = fbm(n, x / 32, y / 32, 4);
      const i = (y * S + x) * 4;
      const a = smooth(0.35, 0.8, v);
      img.data[i] = 255; img.data[i + 1] = 255; img.data[i + 2] = 255; img.data[i + 3] = Math.round(a * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// --- Direction D (ADR 026) : couleurs des quatre familles dans le décor ---------------------------------------------

/**
 * Vitraux des familles (5 cases de 128 × 192) : verre au plomb dans la couleur de chaque famille, emblème du jeu au
 * centre (`drawEmblem`, pas les enseignes du jeu de cartes classique) ; 5e case : rose à quatre quartiers (tympan de la
 * salle de jeu). Émissif : la lumière vient de l'intérieur.
 */
export function stainedGlassAtlas(seed: number): THREE.CanvasTexture {
  const W = 128;
  const H = 192;
  const { c, ctx } = cnv(W * 5, H);
  const rng = makeRng(hashString(`v3|vitraux|${seed}`));
  // Petites pièces en losanges décalés (verre au plomb), teinte de la famille du plus sombre au plus clair,
  // quelques pièces claires seulement ; plombs fins sur chaque pièce, bordure épaisse.
  const pieces = (x0: number, w: number, h: number, pal: readonly string[]) => {
    const cw = 13;
    const ch = 17;
    for (let j = -1; j * ch < h + ch; j++) {
      for (let i = -1; i * cw < w + cw; i++) {
        const cx = x0 + i * cw + (j % 2 ? cw / 2 : 0);
        const cy = j * ch;
        const r = rng();
        ctx.fillStyle = pal[r < 0.08 ? pal.length - 1 : Math.floor(rng() * (pal.length - 1))]!;
        ctx.beginPath();
        ctx.moveTo(cx, cy - ch / 2); ctx.lineTo(cx + cw / 2, cy); ctx.lineTo(cx, cy + ch / 2); ctx.lineTo(cx - cw / 2, cy); ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(14,10,18,0.9)';
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }
    }
  };
  const lead = (x0: number, w: number, h: number) => {
    ctx.strokeStyle = 'rgba(14,10,18,0.95)';
    ctx.lineWidth = 7;
    ctx.strokeRect(x0 + 3.5, 3.5, w - 7, h - 7);
  };
  FAMILIES.forEach((fam, k) => {
    const p = FAMILY_PALETTE[fam];
    const x0 = k * W;
    ctx.save();
    ctx.beginPath(); ctx.rect(x0, 0, W, H); ctx.clip();
    pieces(x0, W, H, [p.deep, p.mid, p.mid, p.light, p.light, p.glow, p.accent]);
    lead(x0, W, H);
    // médaillon : disque sombre cerclé d'or, emblème dans l'accent de la famille
    ctx.fillStyle = 'rgba(12,10,20,0.92)';
    ctx.beginPath(); ctx.arc(x0 + W / 2, H * 0.5, 34, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#e2c27a'; ctx.lineWidth = 4; ctx.stroke();
    ctx.fillStyle = p.accent;
    drawEmblem(ctx, fam, x0 + W / 2, H * 0.5, 24);
    ctx.restore();
  });
  // rose à quatre quartiers
  {
    const x0 = 4 * W;
    ctx.save();
    ctx.beginPath(); ctx.rect(x0, 0, W, H); ctx.clip();
    FAMILIES.forEach((fam, k) => {
      const p = FAMILY_PALETTE[fam];
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x0 + W / 2, H / 2);
      ctx.arc(x0 + W / 2, H / 2, H, Math.PI + (k * Math.PI) / 4, Math.PI + ((k + 1) * Math.PI) / 4);
      ctx.closePath();
      ctx.clip();
      pieces(x0, W, H, [p.mid, p.light, p.light, p.glow, p.accent]);
      ctx.restore();
    });
    // rayons de plomb entre les quartiers et cœur doré
    ctx.strokeStyle = 'rgba(14,10,18,0.95)';
    ctx.lineWidth = 5;
    for (let k = 0; k <= 4; k++) { const a = Math.PI + (k * Math.PI) / 4; ctx.beginPath(); ctx.moveTo(x0 + W / 2, H / 2); ctx.lineTo(x0 + W / 2 + Math.cos(a) * H, H / 2 + Math.sin(a) * H); ctx.stroke(); }
    ctx.fillStyle = '#e2c27a';
    ctx.beginPath(); ctx.arc(x0 + W / 2, H / 2, 14, Math.PI, 0); ctx.fill(); ctx.stroke();
    lead(x0, W, H);
    ctx.restore();
  }
  const t = tex(c, false);
  t.anisotropy = 4;
  return t;
}
/** UV d'un plan (ou demi-disque) de vitrail sur une case de l'atlas (0 à 3 : familles ; 4 : rose). */
export function glassUV(geo: THREE.BufferGeometry, k: number): THREE.BufferGeometry {
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setX(i, (k + 0.03 + uv.getX(i) * 0.94) / 5);
  return geo;
}

/**
 * Glyphes des familles gravés dans le mur du quai et doucement lumineux (4 cases de 128 × 128) : emblème du jeu
 * dans la lueur de la famille, anneau gravé, halo. Fusion additive.
 */
export function glyphAtlas(): THREE.CanvasTexture {
  const S = 128;
  const { c, ctx } = cnv(S * 4, S);
  FAMILIES.forEach((fam, k) => {
    const p = FAMILY_PALETTE[fam];
    const cx = k * S + S / 2;
    const cy = S / 2;
    const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, S / 2);
    g.addColorStop(0, `${p.glow}55`);
    g.addColorStop(1, `${p.glow}00`);
    ctx.fillStyle = g;
    ctx.fillRect(k * S, 0, S, S);
    ctx.strokeStyle = p.glow;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx, cy, 40, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = p.accent;
    drawEmblem(ctx, fam, cx, cy, 26);
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
export function glyphUV(geo: THREE.BufferGeometry, k: number): THREE.BufferGeometry {
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setX(i, (k + uv.getX(i)) / 4);
  return geo;
}
