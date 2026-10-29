// Marche de profil (retour du responsable du 2026-10-29 : de côté, la marche de tous les personnages semblait bloquée) :
// sur chaque feuille approuvée, le cycle de profil alterne deux foulées et une pose de passage nettement plus fermée.
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { bandePieds, cycleProfil, largeursPieds } from '../src/ville/sprites';

/** PNG RGBA 8 bits non entrelacé → pixels (les feuilles de `public/sprites`). */
function lirePng(file: string): { w: number; h: number; data: Uint8Array } {
  const b = readFileSync(file);
  let o = 8;
  let w = 0;
  let h = 0;
  const idat: Buffer[] = [];
  while (o < b.length) {
    const len = b.readUInt32BE(o);
    const type = b.toString('ascii', o + 4, o + 8);
    const body = b.subarray(o + 8, o + 8 + len);
    if (type === 'IHDR') {
      w = body.readUInt32BE(0);
      h = body.readUInt32BE(4);
      expect([body[8], body[9], body[12]]).toEqual([8, 6, 0]);
    } else if (type === 'IDAT') idat.push(body);
    o += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * 4;
  const data = new Uint8Array(stride * h);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)]!;
    for (let x = 0; x < stride; x++) {
      const v = raw[y * (stride + 1) + 1 + x]!;
      const a = x >= 4 ? data[y * stride + x - 4]! : 0;
      const up = y > 0 ? data[(y - 1) * stride + x]! : 0;
      const c = x >= 4 && y > 0 ? data[(y - 1) * stride + x - 4]! : 0;
      const p = a + up - c;
      const pa = Math.abs(p - a);
      const pb = Math.abs(p - up);
      const pc = Math.abs(p - c);
      const pred = [0, a, up, (a + up) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? up : c][f]!;
      data[y * stride + x] = (v + pred) & 255;
    }
  }
  return { w, h, data };
}

const manifeste = JSON.parse(readFileSync('public/sprites/manifest.json', 'utf8')) as { sprites: Record<string, { file: string; anchor: [number, number]; cell?: [number, number] }> };

describe('marche de profil', () => {
  it('le cycle alterne deux foulées et un passage', () => {
    // largeurs mesurées sur la feuille du joueur, de Kaï et du docker
    expect(cycleProfil([53, 98, 104, 110, 104])).toEqual([1, 0, 3, 0]);
    expect(cycleProfil([38, 41, 83, 59, 92])).toEqual([2, 1, 4, 1]);
    expect(cycleProfil([53, 74, 101, 80, 98])).toEqual([2, 0, 4, 0]);
  });

  for (const [id, e] of Object.entries(manifeste.sprites)) {
    it(`${id} : le passage est plus fermé que les deux foulées`, () => {
      const im = lirePng(`public/sprites/${e.file}`);
      const b = bandePieds(im.h, e);
      const pieds = largeursPieds(im.data.subarray(b.y0 * im.w * 4, (b.y0 + b.h) * im.w * 4), im.w, b.h);
      // la même mesure sur l'image retournée à la création (comme au jeu : ImageBitmap en `flipY`)
      const ret = new Uint8Array(im.data.length);
      const ligne = im.w * 4;
      for (let y = 0; y < im.h; y++) ret.set(im.data.subarray(y * ligne, (y + 1) * ligne), (im.h - 1 - y) * ligne);
      const br = bandePieds(im.h, e, true);
      expect(largeursPieds(ret.subarray(br.y0 * ligne, (br.y0 + br.h) * ligne), im.w, br.h)).toEqual(pieds);
      const [a, passe, c, passe2] = cycleProfil(pieds);
      expect(passe).toBe(passe2);
      expect(a).not.toBe(c);
      expect(pieds[passe]!).toBeLessThan(Math.min(pieds[a]!, pieds[c]!) * 0.8);
    });
  }
});
