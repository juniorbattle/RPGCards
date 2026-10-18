// Comparaison de rendu AVANT / APRÈS sur la même machine, en rondes ENTRELACÉES (l’ordre alterne à
// chaque ronde) : la charge du conteneur varie d’une minute à l’autre (moteur identique mesuré à
// 22 puis 37 ms/duel le même jour), un relevé isolé ne permet donc aucune conclusion. Chaque mesure :
// page neuve, 5 s de mise en régime, moyenne de 6 relevés de `arenaStats` (ms CPU/image, FPS).
// Par défaut SwiftShader (CPU) : jamais une mesure de GPU ; `LQV_GPU=1` : GPU réel, moteur de rendu relevé.
// Usage : LQV_BEFORE=<build avant> LQV_BEFORE_SHA=<sha> node tools/perf-compare.mjs [rondes=5]
// (LQV_PERF_COMPARE_OUT=… pour un autre fichier de sortie ; LQV_PERF_VIEWPORT=1707x1067 et LQV_PERF_DPR=1.5 pour une
// autre définition, défaut 1280×720 à 1 ; LQV_GPU_TIMER=1 : temps GPU de chaque image de l’arène, mesuré par
// EXT_disjoint_timer_query_webgl2 autour des rappels requestAnimationFrame, injecté par l’outil seulement)
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import { EXTRA_ARGS, GPU, launch, rendererLabel, startPreview, webglRenderer } from './browser.mjs';

const BEFORE = process.env.LQV_BEFORE;
if (!BEFORE) throw new Error('LQV_BEFORE=<dossier du build avant> requis');
const ROUNDS = Number(process.argv[2] ?? 5);
const commit = execSync('git rev-parse --short HEAD').toString().trim();
const builds = { avant: { sha: process.env.LQV_BEFORE_SHA ?? '?', server: await startPreview(4241, BEFORE) }, apres: { sha: commit, server: await startPreview(4242) } };
const browser = await launch();
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const r2 = (x) => Math.round(x * 100) / 100;
const [VW, VH] = (process.env.LQV_PERF_VIEWPORT ?? '1280x720').split('x').map(Number);
const DPR = Number(process.env.LQV_PERF_DPR ?? 1);
const GPU_TIMER = process.env.LQV_GPU_TIMER === '1';

/** Chronométrage GPU injecté dans la page (aucun code du jeu) : une requête TIME_ELAPSED par rappel rAF ; on
 *  garde les rappels qui dessinent (> 0,02 ms GPU), c’est-à-dire l’image de l’arène. */
function gpuTimer() {
  const getCtx = HTMLCanvasElement.prototype.getContext;
  let gl = null;
  let ext = null;
  const pending = [];
  HTMLCanvasElement.prototype.getContext = function (type, ...a) {
    const c = getCtx.call(this, type, ...a);
    // Dernier contexte créé : le premier est celui du test de disponibilité (webglAvailable), pas l’arène.
    if (type === 'webgl2' && c && c !== gl) { gl = c; ext = c.getExtension('EXT_disjoint_timer_query_webgl2'); pending.length = 0; }
    return c;
  };
  window.__gpuMs = [];
  window.__gpuDisjoint = 0;
  window.__gpuTimerOk = () => !!ext;
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => raf((t) => {
    let q = null;
    if (ext) { q = gl.createQuery(); gl.beginQuery(ext.TIME_ELAPSED_EXT, q); }
    try { cb(t); } finally {
      if (q) { gl.endQuery(ext.TIME_ELAPSED_EXT); pending.push(q); }
      while (pending.length && gl.getQueryParameter(pending[0], gl.QUERY_RESULT_AVAILABLE)) {
        const p = pending.shift();
        const disjoint = gl.getParameter(ext.GPU_DISJOINT_EXT);
        const ns = gl.getQueryParameter(p, gl.QUERY_RESULT);
        gl.deleteQuery(p);
        // Rupture signalée (changement d’horloge du GPU intégré) : échantillon gardé mais compté ; la médiane
        // absorbe les valeurs aberrantes.
        if (ns > 20000 && ns < 1e8) { window.__gpuMs.push(ns / 1e6); if (disjoint) window.__gpuDisjoint++; }
      }
    }
  });
}

let renderer = null;
async function measure(base, view) {
  const page = await browser.newPage({ viewport: { width: VW, height: VH }, deviceScaleFactor: DPR });
  if (GPU_TIMER) await page.addInitScript(gpuTimer);
  await page.goto(`${base}/?scenario=signature&qa=1&aiDelay=0&view=${view}&reducedMotion=0`);
  renderer ??= await webglRenderer(page);
  await page.waitForTimeout(5000);
  if (GPU_TIMER) await page.evaluate(() => { window.__gpuMs.length = 0; window.__gpuDisjoint = 0; });
  const xs = [];
  for (let i = 0; i < 6; i++) { xs.push(await page.evaluate(() => window.__lqv.arenaStats())); await page.waitForTimeout(500); }
  const gpu = GPU_TIMER ? await page.evaluate(() => ({ ok: window.__gpuTimerOk(), ms: window.__gpuMs.slice(), disjoint: window.__gpuDisjoint })) : null;
  await page.close();
  const g = gpu?.ok && gpu.ms.length ? { gpuMs: r2(median(gpu.ms)), gpuP95Ms: r2([...gpu.ms].sort((a, b) => a - b)[Math.floor(gpu.ms.length * 0.95)]), gpuFrames: gpu.ms.length, gpuDisjoint: gpu.disjoint } : { gpuTimer: gpu ? (gpu.ok ? 'aucun échantillon' : 'extension absente') : undefined };
  return { frameMs: r2(xs.reduce((a, x) => a + x.frameMs, 0) / xs.length), fps: r2(xs.reduce((a, x) => a + x.fps, 0) / xs.length), drawCalls: xs.at(-1).drawCalls, triangles: xs.at(-1).triangles, ...g };
}

const runs = { A: { avant: [], apres: [] }, B: { avant: [], apres: [] } };
try {
  for (const view of ['A', 'B']) {
    for (let r = 0; r < ROUNDS; r++) {
      for (const which of r % 2 ? ['apres', 'avant'] : ['avant', 'apres']) {
        const m = await measure(builds[which].server.base, view);
        runs[view][which].push(m);
        console.log(`vue ${view} · ronde ${r + 1} · ${which} : ${m.frameMs} ms CPU/image, ${m.fps} FPS, ${m.drawCalls} draw calls${m.gpuMs != null ? `, ${m.gpuMs} ms GPU/image (p95 ${m.gpuP95Ms})` : ''}`);
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
    const gx = xs.filter((x) => x.gpuMs != null);
    summary[view][which] = { medianFrameMs: r2(median(xs.map((x) => x.frameMs))), minFrameMs: Math.min(...xs.map((x) => x.frameMs)), maxFrameMs: Math.max(...xs.map((x) => x.frameMs)), medianFps: r2(median(xs.map((x) => x.fps))), drawCalls: xs.at(-1).drawCalls, triangles: xs.at(-1).triangles, ...(gx.length ? { medianGpuMs: r2(median(gx.map((x) => x.gpuMs))), medianGpuP95Ms: r2(median(gx.map((x) => x.gpuP95Ms))) } : {}) };
  }
}
const machine = { cpu: os.cpus()[0]?.model, cores: os.cpus().length, memGB: Math.round(os.totalmem() / 2 ** 30), node: process.version };
const report = { date: new Date().toISOString(), machine, renderer: rendererLabel(renderer), gpu: GPU, chromeArgs: EXTRA_ARGS,protocol: `${ROUNDS} rondes entrelacées par vue, ${VW}×${VH} à ${DPR}, scénario signature, 5 s de mise en régime, moyenne de 6 relevés${GPU_TIMER ? ', temps GPU par image (médiane sur 3 s)' : ''}`, builds: { avant: builds.avant.sha, apres: builds.apres.sha }, summary, runs };
mkdirSync('artifacts/qa', { recursive: true });
writeFileSync(process.env.LQV_PERF_COMPARE_OUT ?? 'artifacts/qa/perf-compare-m03-2.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(summary, null, 2));
