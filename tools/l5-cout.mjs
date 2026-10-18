// M07 L5 — coût de génération des couches de Maëlle, V1 contre V2 (`__lqvFigureCost`, page `?qa=1`), et coût de
// l’apparition du rival en jeu : l’arène, créée sur Kaï, passe à Maëlle (`setRival`, comme au clic sur une rencontre) ;
// on chronomètre `setRival` (rig et canvas) puis l’image suivante (envoi des textures au GPU compris), page neuve à
// chaque mesure, en rondes entrelacées V1 / V2.
// Usage : npm run build && LQV_GPU=1 CHROMIUM_PATH=<Chrome> [LQV_CHROME_ARGS=--force_high_performance_gpu]
//         node tools/l5-cout.mjs <sortie.json> [rondes=7]
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { EXTRA_ARGS, launch, rendererLabel, startPreview, webglRenderer } from './browser.mjs';

const OUT = process.argv[2] ?? 'artifacts/qa/m07/l5-cout.json';
const ROUNDS = Number(process.argv[3] ?? 7);
const head = execSync('git rev-parse --short HEAD').toString().trim();
const commit = execSync('git status --porcelain src').toString().trim() ? `${head}+arbre de travail` : head;
const server = await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4199);
const browser = await launch();
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const r2 = (x) => Math.round(x * 100) / 100;
let renderer = null;
const report = { date: new Date().toISOString(), commit, chromeArgs: EXTRA_ARGS, renderer: null, generation: null, swap: { v1: [], v2: [] } };
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(`${server.base}/?seed=202&autostart=1&rival=ronce&qa=1&aiDelay=0&reducedMotion=1&freeze=1&view=A`);
  await page.waitForFunction(() => !!window.__lqv);
  renderer = await webglRenderer(page);
  report.generation = await page.evaluate(() => window.__lqvFigureCost(25));
  // Personnalité de Maëlle (données simples), passée telle quelle à `setRival` dans les pages de mesure.
  const ronce = await page.evaluate(() => JSON.parse(JSON.stringify(window.__lqv.controller.rival)));
  await page.close();
  for (let r = 0; r < ROUNDS; r++) {
    for (const fig of r % 2 ? ['v2', 'v1'] : ['v1', 'v2']) {
      const p = await browser.newPage({ viewport: { width: 1280, height: 720 } });
      await p.goto(`${server.base}/?seed=202&autostart=1&rival=braise&qa=1&aiDelay=0&reducedMotion=0&view=A${fig === 'v2' ? '&figure=v2' : ''}`);
      await p.waitForFunction(() => !!window.__lqv);
      await p.waitForTimeout(2500);
      const res = await p.evaluate(async (ronce) => {
        const arena = window.__lqv.controller.arena;
        const t0 = performance.now();
        arena.setRival(ronce);
        const t1 = performance.now();
        await new Promise((r) => requestAnimationFrame(() => r()));
        const t2 = performance.now();
        await new Promise((r) => requestAnimationFrame(() => r()));
        const t3 = performance.now();
        return { setRivalMs: r2(t1 - t0), firstFrameMs: r2(t3 - t1), nextFrameMs: r2(t3 - t2), textures: arena.stats().textures, programs: arena.stats().programs, drawCalls: arena.stats().drawCalls };
        function r2(x) { return Math.round(x * 100) / 100; }
      }, ronce);
      report.swap[fig].push(res);
      console.log(`ronde ${r + 1} ${fig} : setRival ${res.setRivalMs} ms, image suivante ${res.firstFrameMs} ms`);
      await p.close();
    }
  }
} finally {
  await browser.close();
  server.stop();
}
report.renderer = rendererLabel(renderer);
const med = (xs, k) => r2(median(xs.map((x) => x[k])));
report.swapSummary = Object.fromEntries(['v1', 'v2'].map((f) => [f, { setRivalMs: med(report.swap[f], 'setRivalMs'), firstFrameMs: med(report.swap[f], 'firstFrameMs'), textures: report.swap[f][0]?.textures, programs: report.swap[f][0]?.programs, drawCalls: report.swap[f][0]?.drawCalls }]));
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ renderer: report.renderer, generation: report.generation, swap: report.swapSummary }, null, 2));
