// Mesure EN JEU (protocole GPU §5.3, étape 3, automatisée) : un duel complet joué par l’interface au clic,
// séquences de résolution et chorégraphies de Clash en mouvement réel (rythme normal), pendant qu’un
// relevé dans la page enregistre chaque intervalle requestAnimationFrame, étiqueté par la vue affichée
// (A / B) et par la présence d’une scène de Clash, et `arenaStats()` toutes les 500 ms.
// Usage : LQV_GPU=1 CHROMIUM_PATH=<Chrome> [LQV_CHROME_ARGS=…] node tools/perf-play.mjs
// (LQV_PERF_PLAY_OUT=… pour le fichier de sortie, défaut artifacts/qa/perf-play.json)
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import { EXTRA_ARGS, GPU, launch, rendererLabel, startPreview, view, watchConsole, webglRenderer } from './browser.mjs';
import { newStats, playTurn } from './duel-driver.mjs';

const commit = execSync('git rev-parse --short HEAD').toString().trim();
const OUT = process.env.LQV_PERF_PLAY_OUT ?? 'artifacts/qa/perf-play.json';
const machine = { cpu: os.cpus()[0]?.model, cores: os.cpus().length, memGB: Math.round(os.totalmem() / 2 ** 30), platform: `${os.platform()} ${os.release()}`, node: process.version };
const runs = [
  { name: 'jeu-1280-clic', seed: 202, viewport: { width: 1280, height: 720 }, mode: 'click', tech: 'Sondage,Rupture', watchSequence: true },
  { name: 'jeu-1920-clic', seed: 202, viewport: { width: 1920, height: 1080 }, mode: 'click', tech: 'Sondage,Rupture', watchSequence: true },
];

const r1 = (x) => Math.round(x * 10) / 10;
function summarize(intervals) {
  const s = [...intervals].sort((a, b) => a - b);
  if (!s.length) return null;
  const q = (k) => r1(s[Math.min(s.length - 1, Math.floor(k * s.length))]);
  return { frames: s.length, medianMs: q(0.5), fps: r1(1000 / (s[Math.floor(s.length / 2)] || 1)), p95Ms: q(0.95), p99Ms: q(0.99), maxMs: r1(s[s.length - 1]), over16_7ms: s.filter((d) => d > 1000 / 60).length, over33_3ms: s.filter((d) => d > 1000 / 30).length };
}

const server = await startPreview(4187);
const browser = await launch();
const report = { commit, date: new Date().toISOString(), machine, chrome: browser.version(), gpu: GPU, chromeArgs: EXTRA_ARGS, renderer: null, runs: [] };
try {
  for (const run of runs) {
    const ctx = await browser.newContext({ viewport: run.viewport, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.setDefaultTimeout(10000);
    const consoleIssues = [];
    watchConsole(page, consoleIssues);
    await page.goto(`${server.base}/?seed=${run.seed}&autostart=1&qa=1&aiDelay=0&reducedMotion=0&pace=normal&tech=${run.tech}`);
    await page.waitForFunction(() => !!window.__lqv);
    report.renderer ??= await webglRenderer(page);
    await page.waitForTimeout(3000); // mise en régime (réveil du GPU, première image)
    await page.evaluate(() => {
      const rec = { frames: [], stats: [] };
      window.__perfPlay = rec;
      let tag = 'A';
      const retag = () => { const p = window.__lqv.presentation(); tag = p.stage ? 'clash' : p.view; };
      retag();
      rec.tagTimer = setInterval(retag, 100);
      rec.statTimer = setInterval(() => { const st = window.__lqv.arenaStats(); if (st) rec.stats.push({ tag, frameMs: st.frameMs, fps: st.fps, drawCalls: st.drawCalls, triangles: st.triangles }); }, 500);
      let last = performance.now();
      const step = (t) => { rec.frames.push([t - last, tag]); last = t; if (!rec.stop) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    });
    const stats = newStats();
    let outcome = 'running';
    const t0 = Date.now();
    try {
      for (let t = 0; t < 80 && outcome !== 'ended' && outcome !== 'stuck'; t++) outcome = await playTurn(page, run, stats);
    } catch (err) {
      outcome = 'error';
      stats.error = String(err.message).split('\n')[0];
      console.error(`[${run.name}] échec : ${stats.error}`);
    }
    const rec = await page.evaluate(() => { const r = window.__perfPlay; r.stop = true; clearInterval(r.tagTimer); clearInterval(r.statTimer); return { frames: r.frames, stats: r.stats }; });
    const v = await view(page);
    await ctx.close();
    const byTag = {};
    for (const tag of ['A', 'B', 'clash']) {
      const st = rec.stats.filter((x) => x.tag === tag);
      const med = (xs) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] : null);
      byTag[tag] = { frames: summarize(rec.frames.filter(([, t]) => t === tag).map(([d]) => d)), arenaStats: st.length ? { samples: st.length, medianFrameMsCpu: med(st.map((x) => x.frameMs)), maxFrameMsCpu: Math.max(...st.map((x) => x.frameMs)), drawCalls: Math.max(...st.map((x) => x.drawCalls)), triangles: Math.max(...st.map((x) => x.triangles)) } : null };
    }
    const result = { name: run.name, viewport: run.viewport, seed: run.seed, outcome, winner: v.winner, turns: v.turn, durationS: Math.round((Date.now() - t0) / 1000), sequencesWatched: stats.sequencesWatched, stagesSeen: stats.stagesSeen, leaks: [...new Set(stats.leaks)], viewErrors: stats.viewErrors, consoleIssues, all: summarize(rec.frames.map(([d]) => d)), byView: byTag };
    report.runs.push(result);
    console.log(JSON.stringify({ name: result.name, outcome, turns: result.turns, all: result.all, A: byTag.A.frames, B: byTag.B.frames, clash: byTag.clash.frames, cpuA: byTag.A.arenaStats?.medianFrameMsCpu, cpuB: byTag.B.arenaStats?.medianFrameMsCpu, console: consoleIssues.length }));
  }
} finally {
  await browser.close();
  server.stop();
}
report.rendererLabel = rendererLabel(report.renderer);
mkdirSync('artifacts/qa', { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log(`→ ${OUT}`);
