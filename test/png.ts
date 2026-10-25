/**
 * Lecture minimale d'un PNG RVBA 8 bits non entrelacé (les plans de décor de `public/decors/`), pour les tests : zlib de
 * Node et les cinq filtres de lignes du format. Renvoie largeur, hauteur et pixels (4 octets par pixel, ligne du haut
 * d'abord).
 */
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

export interface PngRgba { width: number; height: number; data: Uint8Array }

export function lirePng(chemin: string): PngRgba {
  const b = readFileSync(chemin);
  let o = 8;
  let width = 0; let height = 0; let depth = 0; let type = 0; let interlace = 0;
  const idat: Buffer[] = [];
  while (o < b.length) {
    const len = b.readUInt32BE(o); const kind = b.toString('ascii', o + 4, o + 8); const d = b.subarray(o + 8, o + 8 + len);
    if (kind === 'IHDR') { width = d.readUInt32BE(0); height = d.readUInt32BE(4); depth = d[8]!; type = d[9]!; interlace = d[12]!; }
    if (kind === 'IDAT') idat.push(d);
    if (kind === 'IEND') break;
    o += 12 + len;
  }
  if (depth !== 8 || type !== 6 || interlace !== 0) throw new Error(`${chemin} : PNG RVBA 8 bits non entrelacé attendu (profondeur ${depth}, type ${type})`);
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * 4;
  const data = new Uint8Array(height * stride);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)]!;
    const src = y * (stride + 1) + 1;
    const dst = y * stride;
    for (let x = 0; x < stride; x++) {
      const v = raw[src + x]!;
      const a = x >= 4 ? data[dst + x - 4]! : 0;
      const up = y > 0 ? data[dst - stride + x]! : 0;
      const ul = y > 0 && x >= 4 ? data[dst - stride + x - 4]! : 0;
      let r: number;
      if (f === 0) r = v;
      else if (f === 1) r = v + a;
      else if (f === 2) r = v + up;
      else if (f === 3) r = v + ((a + up) >> 1);
      else { const p = a + up - ul; const pa = Math.abs(p - a); const pb = Math.abs(p - up); const pc = Math.abs(p - ul); r = v + (pa <= pb && pa <= pc ? a : pb <= pc ? up : ul); }
      data[dst + x] = r & 255;
    }
  }
  return { width, height, data };
}

/**
 * Silhouette opaque d'un morceau d'image (`uv` : u0, v0, u1, v1, v depuis le haut) : bornes des pixels d'alpha ≥ `seuil`,
 * en fractions du morceau (gauche, droite depuis la gauche ; haut depuis le bas du morceau).
 */
export function silhouette(img: PngRgba, uv: readonly [number, number, number, number] = [0, 0, 1, 1], seuil = 128): { gauche: number; droite: number; haut: number } {
  const x0 = Math.round(uv[0] * img.width); const x1 = Math.round(uv[2] * img.width);
  const y0 = Math.round(uv[1] * img.height); const y1 = Math.round(uv[3] * img.height);
  let gx = Infinity; let dx = -Infinity; let hy = Infinity;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    if (img.data[(y * img.width + x) * 4 + 3]! < seuil) continue;
    if (x < gx) gx = x; if (x > dx) dx = x; if (y < hy) hy = y;
  }
  if (!Number.isFinite(gx)) return { gauche: 0, droite: 0, haut: 0 };
  return { gauche: (gx - x0) / (x1 - x0), droite: (dx + 1 - x0) / (x1 - x0), haut: (y1 - hy) / (y1 - y0) };
}

/** Hauteur opaque de chaque colonne d'un morceau d'image (`n` colonnes, de gauche à droite), en fraction du morceau. */
export function profilColonnes(img: PngRgba, uv: readonly [number, number, number, number] = [0, 0, 1, 1], n = 32, seuil = 128): number[] {
  const x0 = Math.round(uv[0] * img.width); const x1 = Math.round(uv[2] * img.width);
  const y0 = Math.round(uv[1] * img.height); const y1 = Math.round(uv[3] * img.height);
  const out = new Array<number>(n).fill(0);
  for (let x = x0; x < x1; x++) {
    let top = y1;
    for (let y = y0; y < y1; y++) if (img.data[(y * img.width + x) * 4 + 3]! >= seuil) { top = y; break; }
    const i = Math.min(n - 1, Math.floor(((x - x0) / (x1 - x0)) * n));
    out[i] = Math.max(out[i]!, (y1 - top) / (y1 - y0));
  }
  return out;
}
