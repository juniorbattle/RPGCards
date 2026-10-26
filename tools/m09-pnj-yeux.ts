// M09, finalisation de la ville (passe 138) — planche avant / après des visages des feuilles des PNJ (les 5 cadres de face,
// agrandis), pour juger les yeux : la feuille d'un commit de référence (avant) contre celle de `public/sprites/` (après) ;
// les tons clés recolorés comme un PNJ de la ville (peau brune, cheveux châtains, tenue bleue, chemise claire), pour voir
// ce que montre le jeu ; barre rouge : avant, verte : après. Sans navigateur.
// Usage : npx tsx tools/m09-pnj-yeux.ts <ref> <sortie.png> <id> [<id> ...]
import { execSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';
import { lirePng, type PngRgba } from '../test/png';

const [ref, out, ...ids] = process.argv.slice(2);
if (!ref || !out || !ids.length) throw new Error('usage : npx tsx tools/m09-pnj-yeux.ts <ref> <sortie.png> <id> ...');
const man = JSON.parse(readFileSync('public/sprites/manifest.json', 'utf8')).sprites;
const tmp = mkdtempSync(join(tmpdir(), 'lqv-yeux-'));
const avant = (id: string): PngRgba => { const f = join(tmp, `${id}.png`); writeFileSync(f, execSync(`git show ${ref}:public/sprites/${id}.png`, { maxBuffer: 1 << 26 })); return lirePng(f); };

const K = 6; const X0 = 18; const X1 = 46; const Y0 = 16; const Y1 = 46; const GAP = 8;
const w = (X1 - X0) * K; const h = (Y1 - Y0) * K;
const W = 5 * (w + GAP) + GAP; const H = ids.length * 2 * (h + GAP) + GAP;
const data = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) data.set([24, 26, 34, 255], i * 4);
const TEINTE: Record<string, readonly [number, number, number]> = { peau: [176, 118, 82], cheveux: [92, 58, 34], tenue: [52, 84, 150], chemise: [222, 214, 196] };
const NIVEAUX = [64, 128, 191, 255];
const recolore = (r: number, g: number, b: number): [number, number, number] => {
  const t = (n: string, l: number) => TEINTE[n]!.map((c) => Math.round(c * (0.35 + (0.65 * l) / 255))) as [number, number, number];
  if (g === 0 && b === 0 && NIVEAUX.includes(r)) return t('peau', r);
  if (b === 0 && r === g && NIVEAUX.includes(r)) return t('cheveux', r);
  if (g === 0 && r === b && NIVEAUX.includes(r)) return t('tenue', r);
  if (r === 0 && g === b && NIVEAUX.includes(g)) return t('chemise', g);
  return [r, g, b];
};
ids.forEach((id, n) => {
  const e = man[id]; if (!e) throw new Error(`feuille inconnue : ${id}`);
  [avant(id), lirePng(`public/sprites/${e.file}`)].forEach((im, v) => {
    const top = (n * 2 + v) * (h + GAP) + GAP; const S = e.scale as number;
    for (let c = 0; c < 5; c++) for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) {
      const s = ((y * S + 1) * im.width + (c * e.cell[0] + x) * S + 1) * 4; const a = im.data[s + 3]! / 255;
      const [r, g, b] = recolore(im.data[s]!, im.data[s + 1]!, im.data[s + 2]!);
      for (let dy = 0; dy < K; dy++) for (let dx = 0; dx < K; dx++) {
        const o = ((top + (y - Y0) * K + dy) * W + GAP + c * (w + GAP) + (x - X0) * K + dx) * 4;
        data[o] = Math.round(r * a + data[o]! * (1 - a)); data[o + 1] = Math.round(g * a + data[o + 1]! * (1 - a)); data[o + 2] = Math.round(b * a + data[o + 2]! * (1 - a));
      }
    }
    for (let y = top; y < top + h; y++) for (let x = 0; x < 4; x++) data.set(v ? [70, 190, 70] : [200, 60, 70], (y * W + x) * 4);
  });
});
// écriture PNG RVBA (filtre 0, zlib de Node)
const raw = Buffer.alloc((W * 4 + 1) * H);
for (let y = 0; y < H; y++) Buffer.from(data.buffer, y * W * 4, W * 4).copy(raw, y * (W * 4 + 1) + 1);
const crc = (b: Buffer) => { let c = ~0; for (const x of b) { c ^= x; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); } return ~c >>> 0; };
const chunk = (t: string, d: Buffer) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
const ih = Buffer.alloc(13); ih.writeUInt32BE(W, 0); ih.writeUInt32BE(H, 4); ih[8] = 8; ih[9] = 6;
writeFileSync(out, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
console.log(`planche ${out} : ${ids.join(', ')} (avant : ${ref})`);
