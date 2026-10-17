// Illustrations de cartes : coût de génération et écart de pixels entre deux builds (passe 12, canvas
// tramé par le processeur). Galerie `?gallery=1` (36 définitions + verso, `__artGenMs`), rondes
// entrelacées AVANT / APRÈS sur le navigateur de mesure (GPU réel avec LQV_GPU=1), puis comparaison des
// images décodées : APRÈS vs AVANT sur ce navigateur, et chaque build entre GPU réel et SwiftShader
// (reproductibilité d’une machine à l’autre).
// Usage : LQV_GPU=1 CHROMIUM_PATH=<Chrome> LQV_BEFORE=<dist avant> [LQV_ART_OUT=…] node tools/art-canvas-compare.mjs [rondes=6]
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { CHROMIUM, GPU, launch, startPreview, webglRenderer } from './browser.mjs';

const ROUNDS = Number(process.argv[2] ?? 6);
const OUT = process.env.LQV_ART_OUT ?? 'artifacts/qa/trace/art-canvas.json';
if (!process.env.LQV_BEFORE) throw new Error('LQV_BEFORE=<dossier du build avant> requis');
const before = await startPreview(4205, process.env.LQV_BEFORE);
const after = await startPreview(4206, 'dist');
const main = await launch();
const swift = await chromium.launch({ executablePath: CHROMIUM, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

async function gallery(browser, base) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  await page.goto(`${base}/?gallery=1&artSeed=7`);
  await page.waitForFunction(() => window.__artGenMs !== undefined);
  const r = await page.evaluate(() => ({ ms: window.__artGenMs, srcs: [...document.querySelectorAll('img.art')].map((i) => i.src) }));
  r.renderer = await webglRenderer(page);
  await ctx.close();
  return r;
}

const times = { avant: [], apres: [] };
const last = {};
for (let i = 0; i < ROUNDS; i++) {
  for (const k of i % 2 ? ['apres', 'avant'] : ['avant', 'apres']) {
    const r = await gallery(main, k === 'avant' ? before.base : after.base);
    times[k].push(r.ms);
    last[k] = r;
  }
}
const sw = { avant: await gallery(swift, before.base), apres: await gallery(swift, after.base) };

const cmpPage = await (await main.newContext()).newPage();
await cmpPage.goto(`${after.base}/?gallery=1`);
const compare = (A, B) => cmpPage.evaluate(async ({ A, B }) => {
  const load = (s) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.src = s; });
  const px = async (s) => { const im = await load(s); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0); return x.getImageData(0, 0, c.width, c.height).data; };
  let identical = 0;
  let maxDiff = 0;
  let meanMax = 0;
  let changedMax = 0;
  for (let i = 0; i < A.length; i++) {
    if (A[i] === B[i]) { identical++; continue; }
    const p = await px(A[i]);
    const q = await px(B[i]);
    let s = 0;
    let n = 0;
    for (let k = 0; k < p.length; k++) { const d = Math.abs(p[k] - q[k]); if (d) n++; if (d > maxDiff) maxDiff = d; s += d; }
    meanMax = Math.max(meanMax, s / p.length);
    changedMax = Math.max(changedMax, n / p.length);
  }
  return { images: A.length, identical, maxChannelDiff: maxDiff, worstMeanDiff: Math.round(meanMax * 1000) / 1000, worstChangedPct: Math.round(changedMax * 1000) / 10 };
}, { A, B });

const med = (x) => [...x].sort((p, q) => p - q)[x.length >> 1];
const report = {
  commit: execSync('git rev-parse --short HEAD').toString().trim(),
  date: new Date().toISOString(),
  chrome: main.version(),
  gpu: GPU,
  renderer: last.apres.renderer,
  before: process.env.LQV_BEFORE,
  galleryMs: { avant: times.avant, apres: times.apres, medianAvant: med(times.avant), medianApres: med(times.apres) },
  pixels: {
    apresVsAvant_memeNavigateur: await compare(last.avant.srcs, last.apres.srcs),
    avant_gpuVsSwiftShader: await compare(last.avant.srcs, sw.avant.srcs),
    apres_gpuVsSwiftShader: await compare(last.apres.srcs, sw.apres.srcs),
    apresVsAvant_swiftShader: await compare(sw.avant.srcs, sw.apres.srcs),
  },
};
await main.close();
await swift.close();
before.stop();
after.stop();
mkdirSync(OUT.replace(/[^/]+$/, ''), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.galleryMs), JSON.stringify(report.pixels, null, 1));
console.log(`→ ${OUT}`);
