// RC 0.8 — écran Rencontres : état transitoire ou écart réel ? Captures répétées du même écran (profil neuf, rendu figé)
// sur deux builds, à deux délais après l'apparition du tableau (LQV_ATTENTES, défaut 1200,5000 ms), avec contrôle A/A
// (même build, deux passages) et cadre englobant des pixels différents.
// Usage : LQV_BEFORE=<dist avant> [LQV_DIST=<dist après>] [LQV_VP=1920x1080] [LQV_N=3] node tools/rc08-rencontres-transitoire.mjs [sortie.json]
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { launch, startPreview, watchConsole } from './browser.mjs';

const BEFORE = process.env.LQV_BEFORE;
if (!BEFORE) throw new Error('LQV_BEFORE=<dossier du build avant> requis');
const OUT = process.argv[2] ?? 'artifacts/qa/rc08/rencontres-transitoire.json';
const VP = (process.env.LQV_VP ?? '1920x1080').split('x').map(Number);
const N = Number(process.env.LQV_N ?? 3);
const WAITS = (process.env.LQV_ATTENTES ?? '1200,5000').split(',').map(Number);
const servers = { avant: await startPreview(4231, BEFORE), apres: await startPreview(4232) };
const browser = await launch();
const helper = await (await browser.newContext()).newPage();
const issues = [];
const diff = (a, b) => helper.evaluate(async ({ a, b }) => {
  const load = async (src) => { const i = new Image(); i.src = src; await i.decode(); const c = new OffscreenCanvas(i.width, i.height); const x = c.getContext('2d'); x.drawImage(i, 0, 0); return x.getImageData(0, 0, i.width, i.height); };
  const [p, q] = [await load(a), await load(b)];
  let px = 0; let max = 0; let x0 = 1e9; let y0 = 1e9; let x1 = -1; let y1 = -1;
  for (let i = 0; i < p.data.length; i += 4) {
    let d = 0;
    for (let c = 0; c < 3; c++) d = Math.max(d, Math.abs(p.data[i + c] - q.data[i + c]));
    if (d) { px++; const k = i / 4; const x = k % p.width; const y = (k / p.width) | 0; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    max = Math.max(max, d);
  }
  return { pixels: px, max, box: px ? [x0, y0, x1 - x0 + 1, y1 - y0 + 1] : null };
}, { a: `data:image/png;base64,${a.toString('base64')}`, b: `data:image/png;base64,${b.toString('base64')}` });
async function capture(which, wait) {
  const ctx = await browser.newContext({ viewport: { width: VP[0], height: VP[1] }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  p.setDefaultTimeout(90000);
  watchConsole(p, issues);
  await p.goto(`${servers[which].base}/?qa=1&aiDelay=0&reducedMotion=1&freeze=1&profileSeed=5`);
  await p.click('[data-key="home-new"]');
  await p.fill('[data-key="new-name"]', 'Capture');
  await p.click('[data-key="new-sig-Ronce"]');
  await p.click('[data-key="new-create"]');
  await p.waitForSelector('[data-screen="board"]');
  await p.waitForTimeout(wait);
  const buf = await p.screenshot({ fullPage: true });
  await ctx.close();
  return buf;
}
const rows = [];
try {
  for (let i = 0; i < N; i++) {
    for (const w of WAITS) {
      const a = await capture('avant', w);
      const b = await capture('apres', w);
      const b2 = await capture('apres', w);
      const r = { round: i + 1, wait: w, avantApres: await diff(a, b), apresApres: await diff(b, b2) };
      rows.push(r);
      console.log(`ronde ${r.round} · attente ${w} ms : avant/après ${r.avantApres.pixels} px (max ${r.avantApres.max}, cadre ${JSON.stringify(r.avantApres.box)}) · après/après (A/A) ${r.apresApres.pixels} px (cadre ${JSON.stringify(r.apresApres.box)})`);
    }
  }
} finally {
  await browser.close();
  servers.avant.stop();
  servers.apres.stop();
}
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({ date: new Date().toISOString(), viewport: VP.join('x'), rows, issues }, null, 2));
console.log(issues.length ? `console : ${issues.length} problème(s)` : 'console : aucune erreur');
