// Planche de la marche de profil du protagoniste, avant / après (retour du responsable du 2026-10-29) : en haut, le cycle
// de profil tiré de la feuille (avant : foulée, repos, foulée, repos, passe 162 ; après : plan de marche du manifeste,
// passages redessinés par `src/ville/passage.ts`) ; en bas, la marche au navigateur (bandes de `tools/marche-joueur.mjs`) ;
// et une capture animée (APNG, à la vitesse du jeu) des deux marches côte à côte, vers la droite puis vers la gauche.
// Usage : npx tsx tools/marche-joueur-planche.ts <capture avant> <capture après> <sortie (dossier)>
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';
import { lirePng, type PngRgba } from '../test/png';
import { cyclePlan, posePassage } from '../src/ville/passage';
import type { Browser } from 'playwright-core';

const SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const [avant, apres, out = 'screenshots/qa/protagoniste/marche'] = process.argv.slice(2);
if (!avant || !apres) throw new Error('usage : <capture avant> <capture après> <sortie>');
mkdirSync(out, { recursive: true });
const man = JSON.parse(readFileSync('public/sprites/manifest.json', 'utf8'));
const e = man.sprites.player;
const [CW, CH] = e.cell as [number, number];
const S = e.scale as number;
const sheet = lirePng(`public/sprites/${e.file}`);
const sol = e.anchor[1] - 1;
const hanche = sol - Math.round(e.figureH / 3);

/** Case de profil (pixels d'art, au centre des blocs agrandis), éventuellement redessinée en passage et soulevée. */
function caseProfil(col: number, passage: boolean, souleve: boolean): PngRgba {
  const data = new Uint8Array(CW * CH * 4);
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
    const i = (((2 * CH + y) * S + (S >> 1)) * sheet.width + (col * CW + x) * S + (S >> 1)) * 4;
    data.set(sheet.data.subarray(i, i + 4), (y * CW + x) * 4);
  }
  if (passage) posePassage({ px: data, w: CW, h: CH }, sol, hanche);
  if (souleve) { data.copyWithin(0, CW * 4); data.fill(0, (CH - 1) * CW * 4); }
  return { width: CW, height: CH, data };
}
const avantCycle = [caseProfil(1, false, false), caseProfil(0, false, true), caseProfil(3, false, false), caseProfil(0, false, true)];
const plan = cyclePlan(e.profil);
const apresCycle = plan.map((c, k) => caseProfil(c, k % 2 === 1, k % 2 === 1));
const url = (p: PngRgba) => `data:image/png;base64,${png(p.width, p.height, p.data).toString('base64')}`;
const dir = (d: string, nom: string) => readdirSync(join(d, nom)).filter((f) => f.endsWith('.png')).sort().map((f) => `data:image/png;base64,${readFileSync(join(d, nom, f)).toString('base64')}`);

const outils = './browser.mjs';
const { launch } = (await import(outils)) as { launch: () => Promise<Browser> };
const browser = await launch();
try {
  const page = await (await browser.newContext()).newPage();
  await page.setContent('<!doctype html><html><body></body></html>');
  // tsx nomme les fonctions fléchées par un appel à `__name`, absent de la page
  await page.evaluate('window.__name = (f) => f');
  const r = await page.evaluate(async (a: { avantCycle: string[]; apresCycle: string[]; sol: number; avD: string[]; apD: string[]; avG: string[]; apG: string[] }) => {
    const load = async (s: string) => { const i = new Image(); i.src = s; await i.decode(); return i; };
    const enc = async (c: OffscreenCanvas) => { const b = await c.convertToBlob({ type: 'image/png' }); return await new Promise<string>((res) => { const f = new FileReader(); f.onload = () => res(f.result as string); f.readAsDataURL(b); }); };
    const [cAv, cAp] = await Promise.all([Promise.all(a.avantCycle.map(load)), Promise.all(a.apresCycle.map(load))]);
    const jeu = { avD: await Promise.all(a.avD.map(load)), apD: await Promise.all(a.apD.map(load)), avG: await Promise.all(a.avG.map(load)), apG: await Promise.all(a.apG.map(load)) };
    // planche
    const Z = 4; const pad = 24; const cw = cAv[0]!.width * Z; const ch = cAv[0]!.height * Z;
    const n = 12; const jw = jeu.avD[0]!.width * 2; const jh = jeu.avD[0]!.height * 2;
    const W = Math.max(2 * (4 * cw + 3 * 8) + 3 * pad, n * jw + 2 * pad);
    const H = 70 + ch + 40 + 2 * (jh + 34) + pad;
    const c = new OffscreenCanvas(W, H); const g = c.getContext('2d')!;
    g.imageSmoothingEnabled = false;
    g.fillStyle = '#1d212b'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#e8dcc0'; g.font = 'bold 18px system-ui';
    g.fillText('Protagoniste, marche de profil : avant (passe 162) | après (passages redessinés par code ; image approuvée inchangée)', pad, 28);
    g.font = '15px system-ui';
    const cycle = (ims: HTMLImageElement[], x0: number, titre: string) => {
      g.fillStyle = '#c8c0aa'; g.fillText(titre, x0, 58);
      ims.forEach((im, k) => {
        const x = x0 + k * (cw + 8);
        g.fillStyle = '#2a2f3c'; g.fillRect(x, 70, cw, ch);
        g.fillStyle = '#5a4a3a'; g.fillRect(x, 70 + (a.sol + 1) * Z, cw, 2);
        g.drawImage(im, x, 70, cw, ch);
      });
    };
    cycle(cAv, pad, 'Avant : foulée, repos (+1 px), foulée, repos : bras, besace et manteau sautent à chaque pas');
    cycle(cAp, 2 * pad + 4 * cw + 24, 'Après : contact, passage, contact (bras opposés), passage');
    const bande = (ims: HTMLImageElement[], y: number, titre: string) => {
      g.fillStyle = '#c8c0aa'; g.fillText(titre, pad, y - 8);
      ims.slice(0, n).forEach((im, k) => g.drawImage(im, pad + k * jw, y, jw, jh));
    };
    const y1 = 70 + ch + 40 + 20;
    bande(jeu.avD, y1, 'Au jeu, vers la droite, avant (12 images à 30 par seconde, horloge tenue)');
    bande(jeu.apD, y1 + jh + 34, 'Au jeu, vers la droite, après');
    const planche = await enc(c);
    // capture animée : avant | après, droite puis gauche
    const fw = jeu.avD[0]!.width * 3; const fh = jeu.avD[0]!.height * 3;
    const frames: string[] = [];
    const b64 = (d: Uint8ClampedArray) => { let s = ''; for (let i = 0; i < d.length; i += 0x8000) s += String.fromCharCode(...d.subarray(i, i + 0x8000)); return btoa(s); };
    const A = new OffscreenCanvas(2 * fw + 3 * 12, fh + 40); const ga = A.getContext('2d', { willReadFrequently: true })!;
    ga.imageSmoothingEnabled = false;
    for (const [av, ap, sens] of [[jeu.avD, jeu.apD, 'droite'], [jeu.avG, jeu.apG, 'gauche']] as const) {
      for (let k = 0; k < Math.min(av.length, ap.length); k++) {
        ga.fillStyle = '#1d212b'; ga.fillRect(0, 0, A.width, A.height);
        ga.fillStyle = '#e8dcc0'; ga.font = 'bold 16px system-ui';
        ga.fillText(`Avant (${sens})`, 12, 26); ga.fillText(`Après (${sens})`, 24 + fw, 26);
        ga.drawImage(av[k]!, 12, 36, fw, fh); ga.drawImage(ap[k]!, 24 + fw, 36, fw, fh);
        frames.push(b64(ga.getImageData(0, 0, A.width, A.height).data));
      }
    }
    return { planche, frames, w: A.width, h: A.height };
  }, { avantCycle: avantCycle.map(url), apresCycle: apresCycle.map(url), sol, avD: dir(avant, 'droite'), apD: dir(apres, 'droite'), avG: dir(avant, 'gauche'), apG: dir(apres, 'gauche') });
  writeFileSync(join(out, 'planche-marche-profil.png'), Buffer.from(r.planche.split(',')[1]!, 'base64'));
  writeFileSync(join(out, 'marche-profil-avant-apres.apng'), apng(r.w, r.h, r.frames.map((f: string) => new Uint8Array(Buffer.from(f, 'base64'))), 1, 30));
} finally {
  await browser.close();
}
console.log(`planche et capture animée : ${out}`);

function crc(b: Buffer): number { let c = ~0; for (const x of b) { c ^= x; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); } return ~c >>> 0; }
function chunk(t: string, d: Buffer): Buffer { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); }
function lignes(w: number, h: number, data: Uint8Array): Buffer { const raw = Buffer.alloc((w * 4 + 1) * h); for (let y = 0; y < h; y++) Buffer.from(data.buffer, data.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1); return deflateSync(raw); }
function ihdr(w: number, h: number): Buffer { const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 6; return chunk('IHDR', ih); }
function png(w: number, h: number, data: Uint8Array): Buffer { return Buffer.concat([SIG, ihdr(w, h), chunk('IDAT', lignes(w, h, data)), chunk('IEND', Buffer.alloc(0))]); }
/** PNG animé (APNG) : images pleines, délai num/den s chacune, en boucle. */
function apng(w: number, h: number, frames: Uint8Array[], num: number, den: number): Buffer {
  const parts = [SIG, ihdr(w, h)];
  const ac = Buffer.alloc(8); ac.writeUInt32BE(frames.length, 0); ac.writeUInt32BE(0, 4); parts.push(chunk('acTL', ac));
  let seq = 0;
  frames.forEach((f, k) => {
    const fc = Buffer.alloc(26); fc.writeUInt32BE(seq++, 0); fc.writeUInt32BE(w, 4); fc.writeUInt32BE(h, 8); fc.writeUInt32BE(0, 12); fc.writeUInt32BE(0, 16); fc.writeUInt16BE(num, 20); fc.writeUInt16BE(den, 22); fc[24] = 0; fc[25] = 0;
    parts.push(chunk('fcTL', fc));
    const z = lignes(w, h, f);
    if (k === 0) parts.push(chunk('IDAT', z));
    else { const s = Buffer.alloc(4); s.writeUInt32BE(seq++, 0); parts.push(chunk('fdAT', Buffer.concat([s, z]))); }
  });
  parts.push(chunk('IEND', Buffer.alloc(0)));
  return Buffer.concat(parts);
}
