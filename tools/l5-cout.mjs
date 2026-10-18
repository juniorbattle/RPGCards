// M07 L5 — coût des personnages V1 contre V2, pour chaque rival : génération des couches (`__lqvFigureCost`, page
// `?qa=1`, médiane de 25 essais) et apparition du rival en jeu : l’arène, créée sur un autre rival, passe au rival
// mesuré (`setRival`, comme au clic sur une rencontre) ; on chronomètre `setRival` (rig et canvas) puis l’image suivante
// (envoi des textures au GPU compris), page neuve à chaque mesure, en rondes entrelacées V1 / V2.
// Usage : npm run build && LQV_GPU=1 CHROMIUM_PATH=<Chrome> [LQV_CHROME_ARGS=--force_high_performance_gpu]
//         node tools/l5-cout.mjs <sortie.json> [rondes=5] [rivaux=braise,ronce,voile,astre]
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { EXTRA_ARGS, launch, rendererLabel, startPreview, webglRenderer } from './browser.mjs';

const OUT = process.argv[2] ?? 'artifacts/qa/m07/l5-cout.json';
const ROUNDS = Number(process.argv[3] ?? 5);
const RIVALS = (process.argv[4] ?? 'braise,ronce,voile,astre').split(',');
const head = execSync('git rev-parse --short HEAD').toString().trim();
const commit = execSync('git status --porcelain src').toString().trim() ? `${head}+arbre de travail` : head;
const server = await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4199);
const browser = await launch();
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const r2 = (x) => Math.round(x * 100) / 100;
let renderer = null;
const report = { date: new Date().toISOString(), commit, chromeArgs: EXTRA_ARGS, renderer: null, rivals: {} };
try {
  for (const id of RIVALS) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.goto(`${server.base}/?seed=202&autostart=1&rival=${id}&qa=1&aiDelay=0&reducedMotion=1&freeze=1&view=A`);
    await page.waitForFunction(() => !!window.__lqv);
    renderer ??= await webglRenderer(page);
    const generation = await page.evaluate((id) => window.__lqvFigureCost(25, id), id);
    // Personnalité (données simples), passée telle quelle à `setRival` dans les pages de mesure.
    const personality = await page.evaluate(() => JSON.parse(JSON.stringify(window.__lqv.controller.rival)));
    await page.close();
    const from = id === 'braise' ? 'ronce' : 'braise';
    const swap = { v1: [], v2: [] };
    for (let r = 0; r < ROUNDS; r++) {
      for (const fig of r % 2 ? ['v2', 'v1'] : ['v1', 'v2']) {
        const p = await browser.newPage({ viewport: { width: 1280, height: 720 } });
        await p.goto(`${server.base}/?seed=202&autostart=1&rival=${from}&qa=1&aiDelay=0&reducedMotion=0&view=A${fig === 'v2' ? '&figure=v2' : ''}`);
        await p.waitForFunction(() => !!window.__lqv);
        await p.waitForTimeout(2500);
        const res = await p.evaluate(async (pers) => {
          const arena = window.__lqv.controller.arena;
          const t0 = performance.now();
          arena.setRival(pers);
          const t1 = performance.now();
          await new Promise((r) => requestAnimationFrame(() => r()));
          const t2 = performance.now();
          await new Promise((r) => requestAnimationFrame(() => r()));
          const t3 = performance.now();
          const st = arena.stats();
          const q = (x) => Math.round(x * 100) / 100;
          return { setRivalMs: q(t1 - t0), firstFrameMs: q(t3 - t1), nextFrameMs: q(t3 - t2), textures: st.textures, programs: st.programs, drawCalls: st.drawCalls };
        }, personality);
        swap[fig].push(res);
        console.log(`${id} · ronde ${r + 1} · ${fig} : setRival ${res.setRivalMs} ms, image suivante ${res.firstFrameMs} ms`);
        await p.close();
      }
    }
    const med = (xs, k) => r2(median(xs.map((x) => x[k])));
    report.rivals[id] = {
      generation,
      swap,
      swapSummary: Object.fromEntries(['v1', 'v2'].map((f) => [f, { setRivalMs: med(swap[f], 'setRivalMs'), firstFrameMs: med(swap[f], 'firstFrameMs'), textures: swap[f][0]?.textures, programs: swap[f][0]?.programs, drawCalls: swap[f][0]?.drawCalls }])),
    };
  }
} finally {
  await browser.close();
  server.stop();
}
report.renderer = rendererLabel(renderer);
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ renderer: report.renderer, rivals: Object.fromEntries(Object.entries(report.rivals).map(([k, v]) => [k, { genV1: v.generation.v1.medianMs, genV2: v.generation.v2?.medianMs, texelsV1: v.generation.v1.texels, texelsV2: v.generation.v2?.texels, swap: v.swapSummary }])) }, null, 2));
