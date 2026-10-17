// Comparaison de rendu AVANT / APRÈS sur la même machine, en rondes ENTRELACÉES (l’ordre alterne à
// chaque ronde) : la charge du conteneur varie d’une minute à l’autre (moteur identique mesuré à
// 22 puis 37 ms/duel le même jour), un relevé isolé ne permet donc aucune conclusion. Chaque mesure :
// page neuve, 5 s de mise en régime, moyenne de 6 relevés de `arenaStats` (ms CPU/image, FPS).
// SwiftShader (CPU) : jamais une mesure de GPU.
// Usage : LQV_BEFORE=<build avant> LQV_BEFORE_SHA=<sha> node tools/perf-compare.mjs [rondes=5]
// (LQV_PERF_COMPARE_OUT=… pour un autre fichier de sortie)
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import { launch, startPreview } from './browser.mjs';

const BEFORE = process.env.LQV_BEFORE;
if (!BEFORE) throw new Error('LQV_BEFORE=<dossier du build avant> requis');
const ROUNDS = Number(process.argv[2] ?? 5);
const commit = execSync('git rev-parse --short HEAD').toString().trim();
const builds = { avant: { sha: process.env.LQV_BEFORE_SHA ?? '?', server: await startPreview(4241, BEFORE) }, apres: { sha: commit, server: await startPreview(4242) } };
const browser = await launch();
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const r2 = (x) => Math.round(x * 100) / 100;

async function measure(base, view) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(`${base}/?scenario=signature&qa=1&aiDelay=0&view=${view}&reducedMotion=0`);
  await page.waitForTimeout(5000);
  const xs = [];
  for (let i = 0; i < 6; i++) { xs.push(await page.evaluate(() => window.__lqv.arenaStats())); await page.waitForTimeout(500); }
  await page.close();
  return { frameMs: r2(xs.reduce((a, x) => a + x.frameMs, 0) / xs.length), fps: r2(xs.reduce((a, x) => a + x.fps, 0) / xs.length), drawCalls: xs.at(-1).drawCalls, triangles: xs.at(-1).triangles };
}

const runs = { A: { avant: [], apres: [] }, B: { avant: [], apres: [] } };
try {
  for (const view of ['A', 'B']) {
    for (let r = 0; r < ROUNDS; r++) {
      for (const which of r % 2 ? ['apres', 'avant'] : ['avant', 'apres']) {
        const m = await measure(builds[which].server.base, view);
        runs[view][which].push(m);
        console.log(`vue ${view} · ronde ${r + 1} · ${which} : ${m.frameMs} ms CPU/image, ${m.fps} FPS, ${m.drawCalls} draw calls`);
      }
    }
  }
} finally {
  await browser.close();
  builds.avant.server.stop();
  builds.apres.server.stop();
}
const summary = {};
for (const view of ['A', 'B']) {
  summary[view] = {};
  for (const which of ['avant', 'apres']) {
    const xs = runs[view][which];
    summary[view][which] = { medianFrameMs: r2(median(xs.map((x) => x.frameMs))), minFrameMs: Math.min(...xs.map((x) => x.frameMs)), maxFrameMs: Math.max(...xs.map((x) => x.frameMs)), medianFps: r2(median(xs.map((x) => x.fps))), drawCalls: xs.at(-1).drawCalls, triangles: xs.at(-1).triangles };
  }
}
const machine = { cpu: os.cpus()[0]?.model, cores: os.cpus().length, memGB: Math.round(os.totalmem() / 2 ** 30), node: process.version };
const report = { date: new Date().toISOString(), machine, renderer: 'Chromium headless + ANGLE/SwiftShader (CPU) — jamais une mesure de GPU', protocol: `${ROUNDS} rondes entrelacées par vue, 1280×720, scénario signature, 5 s de mise en régime, moyenne de 6 relevés`, builds: { avant: builds.avant.sha, apres: builds.apres.sha }, summary, runs };
mkdirSync('artifacts/qa', { recursive: true });
writeFileSync(process.env.LQV_PERF_COMPARE_OUT ?? 'artifacts/qa/perf-compare-m03-2.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(summary, null, 2));
