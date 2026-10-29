// Planche des apparences du protagoniste (passe 165) : pour chaque apparence (silhouette, peau, cheveux, yeux), les cases
// de face et de dos au repos et le cycle de profil, tirés des feuilles par les MÊMES fonctions que le jeu (`teintes.ts`,
// `passage.ts`) ; tenue et accent en tons clés recolorés à la famille (Cendre), comme le nuanceur.
// Usage : npx tsx tools/protagoniste-apparences.ts [sortie] [codes, ex. a000,a530,b200]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { deflateSync } from 'node:zlib';
import type { Browser } from 'playwright-core';
import { lirePng } from '../test/png';
import { CHEVEUX, PEAUX, YEUX, coupeDe, estOrigine, feuilleApparence, lireCode } from '../src/ville/apparence';
import { cyclePlan, posePassage } from '../src/ville/passage';
import { classerTeintes, repeindre } from '../src/ville/teintes';
import { FAMILY_PALETTE } from '../src/art/palette';

const OUT = process.argv[2] ?? 'screenshots/qa/protagoniste/apparences/planche-apparences.png';
const CODES = (process.argv[3] ?? 'a000,a530,a193,a1000,a1281,b200,b462,b581,b1200,b1390').split(',');
const man = JSON.parse(readFileSync('public/sprites/manifest.json', 'utf8'));
const hex = (s: string) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
const fam = FAMILY_PALETTE.Cendre;
// tons clés de la tenue (magenta) et de l'accent (vert) sur quatre niveaux, recolorés comme `recolorTargets`
const RAMPES: Record<string, number[][]> = { tenue: [fam.deep, fam.deep, fam.mid, fam.light].map(hex), accent: [fam.mid, fam.light, fam.accent, fam.ink].map(hex) };
const NIV = [64, 128, 191, 255];

function feuille(code: string) {
  const a = lireCode(code)!;
  const e = man.sprites[feuilleApparence(a)];
  const im = lirePng(`public/sprites/${e.file}`);
  const [cw, ch] = e.cell as [number, number];
  const W = cw * 5; const H = ch * 3; const S = e.scale as number;
  const px = new Uint8Array(W * H * 4);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const k = ((j * S + (S >> 1)) * im.width + i * S + (S >> 1)) * 4; px.set(im.data.subarray(k, k + 4), (j * W + i) * 4); }
  const f = { px, w: W, h: H };
  if (!estOrigine(a)) repeindre(f, classerTeintes(f, cw, ch), { peau: PEAUX[a.peau], cheveux: CHEVEUX[a.cheveux], yeux: YEUX[a.yeux] });
  const sol = e.anchor[1] - 1;
  const plan = e.profil;
  if (plan && !plan.dessines) for (const col of plan.passages) {
    const c = new Uint8Array(cw * ch * 4);
    for (let j = 0; j < ch; j++) c.set(px.subarray(((2 * ch + j) * W + col * cw) * 4, ((2 * ch + j) * W + col * cw + cw) * 4), j * cw * 4);
    posePassage({ px: c, w: cw, h: ch }, sol, sol - Math.round(e.figureH / 3));
    for (let j = 0; j < ch; j++) px.set(c.subarray(j * cw * 4, (j + 1) * cw * 4), ((2 * ch + j) * W + col * cw) * 4);
  }
  for (let p = 0; p < W * H; p++) {
    const [r, g, b] = [px[p * 4]!, px[p * 4 + 1]!, px[p * 4 + 2]!];
    const n = NIV.indexOf(g === 0 ? r : r === 0 && b === 0 ? g : -1);
    if (n < 0) continue;
    if (g === 0 && r === b) px.set(RAMPES.tenue![n]!, p * 4);
    else if (r === 0 && b === 0) px.set(RAMPES.accent![n]!, p * 4);
  }
  const cases = [[0, 0], [1, 0], ...(plan ? cyclePlan(plan) : [1, 2, 3, 4]).map((c: number) => [2, c])];
  return { code, a, cw, ch, cases: cases.map(([r, c]) => { const d = new Uint8Array(cw * ch * 4); for (let j = 0; j < ch; j++) d.set(px.subarray(((r! * ch + j) * W + c! * cw) * 4, ((r! * ch + j) * W + c! * cw + cw) * 4), j * cw * 4); return png(cw, ch, d); }) };
}

const lignes = CODES.map(feuille);
const outils = './browser.mjs';
const { launch } = (await import(outils)) as { launch: () => Promise<Browser> };
const browser = await launch();
try {
  const page = await (await browser.newContext()).newPage();
  await page.setContent('<!doctype html><html><body></body></html>');
  await page.evaluate('window.__name = (f) => f');
  const url = await page.evaluate(async (ls: { titre: string; cases: string[] }[]) => {
    const Z = 3; const cw = 64 * Z; const ch = 100 * Z; const pad = 16; const lab = 300;
    const c = new OffscreenCanvas(lab + 6 * (cw + 8) + pad, 50 + ls.length * (ch + 10));
    const g = c.getContext('2d')!; g.imageSmoothingEnabled = false;
    g.fillStyle = '#1d212b'; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#e8dcc0'; g.font = 'bold 18px system-ui';
    g.fillText('Protagoniste : apparences repeintes par code (feuilles inchangées) — face, dos, cycle de profil ; tenue de la Cendre', pad, 30);
    for (const [k, l] of ls.entries()) {
      const y = 50 + k * (ch + 10);
      g.fillStyle = '#c8c0aa'; g.font = '15px system-ui';
      l.titre.split('\n').forEach((t, i) => g.fillText(t, pad, y + 30 + i * 22));
      for (const [j, s] of l.cases.entries()) {
        const im = new Image(); im.src = s; await im.decode();
        g.fillStyle = '#2a2f3c'; g.fillRect(lab + j * (cw + 8), y, cw, ch);
        g.drawImage(im, lab + j * (cw + 8), y + ch - im.height * Z, im.width * Z, im.height * Z);
      }
    }
    const blob = await c.convertToBlob({ type: 'image/png' });
    return await new Promise<string>((r) => { const f = new FileReader(); f.onload = () => r(f.result as string); f.readAsDataURL(blob); });
  }, lignes.map((l) => ({ titre: `${l.code}\nSilhouette ${l.a.silhouette.toUpperCase()}, coupe ${coupeDe(l.a).nom}\npeau ${l.a.peau + 1}, cheveux ${l.a.cheveux + 1}, yeux ${l.a.yeux + 1}${estOrigine(l.a) ? '\n(origine : rien de repeint)' : ''}`, cases: l.cases.map((b) => `data:image/png;base64,${b.toString('base64')}`) })));
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, Buffer.from(url.split(',')[1]!, 'base64'));
} finally {
  await browser.close();
}
console.log(`planche : ${OUT}`);

function png(w: number, h: number, data: Uint8Array): Buffer {
  const crc = (b: Buffer) => { let c = ~0; for (const x of b) { c ^= x; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); } return ~c >>> 0; };
  const chunk = (t: string, d: Buffer) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 6;
  const raw = Buffer.alloc((w * 4 + 1) * h); for (let y = 0; y < h; y++) Buffer.from(data.buffer, data.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
