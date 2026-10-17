// Trace de fluidité d’un duel JOUÉ (passe 12) : même duel que `perf:play` (seed 202, clics, séquences
// regardées au rythme normal), mais joué par le pilote en mode `lean` (aucun sondage de la vue, aucun
// audit DOM) pour que le fil principal ne porte que le jeu. Enregistre dans la page chaque intervalle
// requestAnimationFrame (vue A / B / Clash, phase et temps de résolution courants) et les Long Animation
// Frames (LoAF : scripts responsables, style et mise en page forcés) ; en option, une trace Chrome
// complète par CDP (`Tracing`, échantillonneur V8 compris) analysée par `tools/trace-analyze.mjs`.
// Passe 13 : coût de CHAQUE commande (apply() synchrone : moteur + rendu, mise en page forcée comprise,
// puis style / mise en page restants forcés juste après), des rendus hors commande et des temps de
// résolution, par famille (`commands` dans chaque duel, `commandSummary` par build) ; Event Timing
// des clics (durée jusqu’à l’image suivante, ≥ 16 ms).
//
// Usage : LQV_GPU=1 CHROMIUM_PATH=<Chrome> [LQV_CHROME_ARGS=--force_high_performance_gpu] node tools/perf-trace.mjs
//   LQV_TRACE=1            trace CDP complète (sinon : rAF + LoAF seulement, surcoût minimal)
//   LQV_TRACE_DRIVER=lean  lean (défaut) | qa (pilote historique : sondage 60 ms + audits) | both (alternés)
//   LQV_TRACE_ROUNDS=1     rondes ; chaque ronde joue chaque build × chaque pilote, ordre alterné (ABBA)
//   LQV_TRACE_BUILDS=      « nom=dossier,nom2=dossier2 » (défaut : dist courant) — mesures avant / après entrelacées
//   LQV_TRACE_FRESH=1      un navigateur NEUF par duel (profil vierge : caches de shaders de Chrome froids,
//                          comme le premier duel d’une session) ; sinon un seul navigateur, caches chauds après le 1er duel
//   LQV_TRACE_USERDATA=dir  profil PERSISTANT par build (dir/<build>) : caches disque de Chrome conservés d’un duel
//                          à l’autre, comme le navigateur d’un joueur (1er duel froid, suivants chauds)
//   LQV_TRACE_AIDELAY=650   délai de réponse du rival : 650 ms = valeur du JEU (la QA historique met 0, ce qui joue la
//                          réponse du rival et la révélation DANS la tâche du clic du joueur : deux rendus complets)
//   LQV_TRACE_TURNS=80      nombre de tours joués au plus (trace ciblée sur le début du duel : 2)
//   LQV_TRACE_CATS=         catégories de trace ajoutées (ex. « gpu,disabled-by-default-skia.gpu » : qui compile au GPU)
//   LQV_TRACE_LIGHT=1       avec LQV_TRACE=1 : tâches de premier niveau et repères seulement (surcoût minimal) ; sert au
//                          temps PROCESSEUR de la tâche de chaque commande (`commandPairsCpu`, insensible à la charge du poste)
//   LQV_TRACE_VIEWPORT=1280x720 · LQV_TRACE_OUT=artifacts/qa/trace/perf-trace.json
// Les traces brutes (lourdes) vont dans artifacts/qa/tmp/ (ignoré par git).
import { execSync } from 'node:child_process';
import { createWriteStream, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import { EXTRA_ARGS, GPU, launch, launchPersistent, rendererLabel, startPreview, watchConsole, webglRenderer } from './browser.mjs';
import { newStats, playTurn } from './duel-driver.mjs';
import { analyzeRun, commandFamily, loadBundleMapper, pairCommands, summarizeCommandRuns, summarizeCommands, summarizeRuns } from './trace-analyze.mjs';

const commit = execSync('git rev-parse --short HEAD').toString().trim();
const TRACE = process.env.LQV_TRACE === '1';
const FRESH = process.env.LQV_TRACE_FRESH === '1';
const TURNS = Number(process.env.LQV_TRACE_TURNS ?? 80);
const USERDATA = process.env.LQV_TRACE_USERDATA ?? null;
const AI_DELAY = Number(process.env.LQV_TRACE_AIDELAY ?? 650);
const DRIVER = process.env.LQV_TRACE_DRIVER ?? 'lean';
const ROUNDS = Math.max(1, Number(process.env.LQV_TRACE_ROUNDS ?? 1));
const OUT = process.env.LQV_TRACE_OUT ?? 'artifacts/qa/trace/perf-trace.json';
const RAW = 'artifacts/qa/tmp/traces';
const TAG = OUT.replace(/^.*\//, '').replace(/\.json$/, ''); // préfixe des fichiers bruts : une série n’écrase pas l’autre
const [vw, vh] = (process.env.LQV_TRACE_VIEWPORT ?? '1280x720').split('x').map(Number);
const builds = (process.env.LQV_TRACE_BUILDS ?? `courant=${process.env.LQV_DIST || 'dist'}`).split(',').map((s) => { const [name, dir] = s.split('='); return { name, dir }; });
const drivers = DRIVER === 'both' ? ['lean', 'qa'] : [DRIVER];
const machine = { cpu: os.cpus()[0]?.model, cores: os.cpus().length, memGB: Math.round(os.totalmem() / 2 ** 30), platform: `${os.platform()} ${os.release()}`, node: process.version };

// Catégories : fil principal (panneau Performance de DevTools), GC détaillé, échantillonneur V8, tâches de
// tous les fils (`toplevel` : fil principal du processus GPU) et compilation ANGLE. Écartées car trop
// volumineuses pour un duel de 2 min (≈ 1 Go) : `gpu` (chaque flush du tampon de commandes),
// `disabled-by-default-devtools.timeline.frame`, `loading`, `latencyInfo`.
const CATEGORIES = process.env.LQV_TRACE_LIGHT === '1' ? ['toplevel', 'blink.user_timing'] : [
  'devtools.timeline', 'disabled-by-default-devtools.timeline', 'toplevel', 'blink.user_timing', 'blink.console',
  'v8.execute', 'v8', 'disabled-by-default-v8.gc', 'disabled-by-default-v8.cpu_profiler', 'gpu.angle',
  ...(process.env.LQV_TRACE_CATS ?? '').split(',').filter(Boolean),
];

const r1 = (x) => Math.round(x * 10) / 10;
function summarize(intervals) {
  const s = [...intervals].sort((a, b) => a - b);
  if (!s.length) return null;
  const q = (k) => r1(s[Math.min(s.length - 1, Math.floor(k * s.length))]);
  return { frames: s.length, medianMs: q(0.5), p95Ms: q(0.95), p99Ms: q(0.99), maxMs: r1(s[s.length - 1]), over16_7ms: s.filter((d) => d > 1000 / 60).length, over33_3ms: s.filter((d) => d > 1000 / 30).length, over50ms: s.filter((d) => d > 50).length, over100ms: s.filter((d) => d > 100).length };
}

/** Relevé dans la page : rAF (intervalle, vue, contexte de jeu) + LoAF ; repère de synchronisation trace ↔ page. */
function installRecorder() {
  const c = window.__lqv.controller;
  const stageHost = document.getElementById('stage');
  const rec = { frames: [], ctx: [], loaf: [], sync: null, stop: false, cmds: [], renders: [], beats: [], events: [] };
  window.__perfTrace = rec;
  let lastCtx = '';
  let last = performance.now();
  const step = (t) => {
    const tag = stageHost?.querySelector('.clash-stage') ? 'clash' : c.viewMode;
    rec.frames.push([t, t - last, tag]);
    last = t;
    const v = c.view;
    const ctx = `${v.turn}|${v.phase}|${c.currentBeat()?.kind ?? ''}`;
    if (ctx !== lastCtx) { rec.ctx.push([t, ctx]); lastCtx = ctx; }
    if (!rec.stop) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
  // Coût par commande (passe 13). La mise en page forcée après coup ne coûte que ce que le rendu n’a pas
  // déjà forcé lui-même (défilement du journal, FLIP) : elle aurait eu lieu à l’image suivante.
  const settle = () => { const t = performance.now(); void document.querySelector('#app .command')?.getBoundingClientRect(); return performance.now() - t; };
  let depth = 0;
  const apply = c.apply.bind(c);
  c.apply = (cmd) => {
    const phase = c.view.phase;
    const view0 = c.viewMode;
    const d = depth++;
    // Illustrations générées sur place pendant la commande (passe 14 : pré-générées par un worker).
    const art0 = window.__lqv?.artCache?.() ?? 0;
    const t0 = performance.now();
    let ok;
    try { ok = apply(cmd); } finally { depth--; }
    const t1 = performance.now();
    rec.cmds.push({ t: t0, sync: t1 - t0, flush: d === 0 ? settle() : 0, type: cmd.type, player: cmd.player ?? '', phase, viewChange: view0 !== c.viewMode, depth: d, ok, art: (window.__lqv?.artCache?.() ?? 0) - art0 });
    return ok;
  };
  const wrap = (field, sink) => {
    const orig = c[field];
    if (typeof orig !== 'function') return;
    c[field] = () => {
      if (depth) return orig();
      const t0 = performance.now();
      orig();
      const t1 = performance.now();
      sink.push({ t: t0, sync: t1 - t0, flush: settle(), phase: c.view.phase, beat: c.currentBeat()?.kind ?? null });
    };
  };
  wrap('renderFn', rec.renders);
  wrap('beatFn', rec.beats);
  try {
    rec.evObs = new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        if (e.name === 'click' || e.name === 'keydown' || e.name === 'pointerup') rec.events.push({ t: e.startTime, name: e.name, duration: e.duration, delay: e.processingStart - e.startTime, processing: e.processingEnd - e.processingStart, key: e.target?.dataset?.key ?? null });
      }
    });
    rec.evObs.observe({ type: 'event', durationThreshold: 16, buffered: false });
  } catch { rec.eventTimingUnsupported = true; }
  try {
    rec.obs = new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        rec.loaf.push({
          startTime: e.startTime, duration: e.duration, renderStart: e.renderStart, styleAndLayoutStart: e.styleAndLayoutStart, blockingDuration: e.blockingDuration,
          scripts: e.scripts.map((s) => ({ invoker: s.invoker, invokerType: s.invokerType, sourceURL: s.sourceURL, sourceFunctionName: s.sourceFunctionName, sourceCharPosition: s.sourceCharPosition, startTime: s.startTime, executionStart: s.executionStart, duration: s.duration, forcedStyleAndLayoutDuration: s.forcedStyleAndLayoutDuration, pauseDuration: s.pauseDuration })),
        });
      }
    });
    rec.obs.observe({ type: 'long-animation-frame', buffered: false });
  } catch { rec.loafUnsupported = true; }
  rec.sync = [];
  rec.mark = () => {
    const mark = `lqv-sync-${Date.now()}-${rec.sync.length}`;
    performance.mark(mark);
    rec.sync.push({ mark, perfNow: performance.getEntriesByName(mark)[0].startTime });
  };
  rec.mark();
}

async function startTracing(cdp, page) {
  await cdp.send('Tracing.start', { transferMode: 'ReturnAsStream', streamFormat: 'json', streamCompression: 'gzip', traceConfig: { includedCategories: CATEGORIES, excludedCategories: ['*'], recordMode: 'recordContinuously' } });
  // `Tracing.start` rend la main avant que le processus de rendu n’enregistre : sans ce délai, le
  // repère de synchronisation posé juste après manque à la trace (constaté au premier essai).
  await page.waitForTimeout(1000);
}

async function stopTracing(cdp, file) {
  const done = new Promise((resolve) => cdp.once('Tracing.tracingComplete', resolve));
  await cdp.send('Tracing.end');
  const { stream } = await done;
  const out = createWriteStream(file);
  for (;;) {
    const chunk = await cdp.send('IO.read', { handle: stream, size: 4 << 20 });
    if (chunk.data) out.write(Buffer.from(chunk.data, chunk.base64Encoded ? 'base64' : 'utf8'));
    if (chunk.eof) break;
  }
  await cdp.send('IO.close', { handle: stream });
  await new Promise((r) => out.end(r));
}

mkdirSync(RAW, { recursive: true });
mkdirSync(OUT.replace(/[^/]+$/, ''), { recursive: true });
const servers = [];
for (const [i, b] of builds.entries()) servers.push(await startPreview(4191 + i, b.dir));
let browser = await launch();
const report = { commit, date: new Date().toISOString(), machine, chrome: browser.version(), gpu: GPU, chromeArgs: EXTRA_ARGS, renderer: null, trace: TRACE, traceCategories: TRACE ? CATEGORIES : null, maxTurns: TURNS, freshBrowserPerDuel: FRESH, persistentProfile: USERDATA, aiDelay: AI_DELAY, viewport: { width: vw, height: vh }, builds, drivers, rounds: ROUNDS, runs: [] };
try {
  for (let round = 0; round < ROUNDS; round++) {
    // Ordre alterné d’une ronde à l’autre (ABBA) : la dérive de charge du poste ne favorise aucun build.
    const combos = builds.flatMap((b, bi) => drivers.map((d) => ({ b, bi, d })));
    if (round % 2 === 1) combos.reverse();
    for (const { b, bi, d } of combos) {
      const name = `r${round + 1}-${b.name}-${d}`;
      if (FRESH && report.runs.length) { await browser.close(); browser = await launch(); }
      const ctx = USERDATA ? await launchPersistent(`${USERDATA}/${b.name}`, { viewport: { width: vw, height: vh }, deviceScaleFactor: 1 }) : await browser.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      page.setDefaultTimeout(10000);
      const consoleIssues = [];
      watchConsole(page, consoleIssues);
      const run = { name, seed: 202, mode: 'click', tech: 'Sondage,Rupture', watchSequence: true, lean: d === 'lean' };
      await page.goto(`${servers[bi].base}/?seed=${run.seed}&autostart=1&qa=1&aiDelay=${AI_DELAY}&reducedMotion=0&pace=normal&tech=${run.tech}`);
      await page.waitForFunction(() => !!window.__lqv);
      report.renderer ??= await webglRenderer(page);
      await page.waitForTimeout(3000); // mise en régime (réveil du GPU, première image)
      const cdp = TRACE ? await ctx.newCDPSession(page) : null;
      if (cdp) await startTracing(cdp, page);
      await page.evaluate(installRecorder);
      const stats = newStats();
      let outcome = 'running';
      const t0 = Date.now();
      try {
        for (let t = 0; t < TURNS && outcome !== 'ended' && outcome !== 'stuck'; t++) outcome = await playTurn(page, run, stats);
      } catch (err) {
        outcome = 'error';
        stats.error = String(err.message).split('\n')[0];
        console.error(`[${name}] échec : ${stats.error}`);
      }
      await page.waitForTimeout(500);
      const rec = await page.evaluate(() => { const r = window.__perfTrace; r.mark(); r.stop = true; r.obs?.disconnect(); r.evObs?.disconnect(); return { frames: r.frames, ctx: r.ctx, loaf: r.loaf, sync: r.sync, loafUnsupported: !!r.loafUnsupported, cmds: r.cmds, renders: r.renders, beats: r.beats, events: r.events }; });
      const end = await page.evaluate(() => ({ phase: window.__lqv.view().phase, turn: window.__lqv.view().turn, winner: window.__lqv.view().winner, hash: window.__lqv.hash() }));
      const traceFile = cdp ? `${RAW}/${TAG}-${name}.json.gz` : null;
      if (cdp) await stopTracing(cdp, traceFile);
      await ctx.close();
      const recFile = `${RAW}/${TAG}-${name}.page.json`;
      writeFileSync(recFile, JSON.stringify(rec));
      const result = { name, round: round + 1, build: b.name, driver: d, outcome, turns: end.turn, winner: end.winner, hash: end.hash, durationS: Math.round((Date.now() - t0) / 1000), sequencesWatched: stats.sequencesWatched, stagesSeen: stats.stagesSeen, consoleIssues, all: summarize(rec.frames.map(([, dt]) => dt)), byView: Object.fromEntries(['A', 'B', 'clash'].map((tag) => [tag, summarize(rec.frames.filter(([, , t]) => t === tag).map(([, dt]) => dt))])), loafCount: rec.loaf.length, commands: summarizeCommands(rec), rawTrace: traceFile, pageRecord: recFile };
      report.runs.push(result);
      console.log(JSON.stringify({ name, outcome, turns: result.turns, hash: result.hash, all: result.all, loaf: result.loafCount, console: consoleIssues.length, commandes: Object.fromEntries(Object.entries(result.commands).map(([k, v]) => [k, v && `n=${v.n} méd=${v.medianMs} p95=${v.p95Ms} max=${v.maxMs}`])) }));
    }
  }
} finally {
  await browser.close();
  for (const s of servers) s.stop();
}
report.rendererLabel = rendererLabel(report.renderer);
// Attribution des à-coups (> 50 ms) de chaque duel : LoAF toujours, trace CDP si enregistrée.
for (const r of report.runs) {
  const b = builds.find((x) => x.name === r.build);
  const mapper = loadBundleMapper(b.dir);
  // Trace réduite aux fenêtres des à-coups (fil principal + GPU), assez légère pour être versionnée.
  const trimOut = r.rawTrace ? OUT.replace(/\.json$/, `-${r.name}-pics.json.gz`) : null;
  r.hitches = await analyzeRun({ pageRecord: r.pageRecord, rawTrace: r.rawTrace, mapper, trimOut, commandFamily });
}
report.summary = summarizeRuns(report.runs);
report.commandSummary = summarizeCommandRuns(report.runs);
report.commandPairs = pairCommands(report.runs);
if (TRACE) report.commandPairsCpu = pairCommands(report.runs, 'cpu');
writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.summary));
console.log(JSON.stringify(report.commandSummary, null, 1));
console.log(JSON.stringify(report.commandPairs));
if (TRACE) console.log(JSON.stringify(report.commandPairsCpu));
console.log(`→ ${OUT}`);
