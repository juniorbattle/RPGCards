// Coût du plateau AU REPOS, insensible à la charge du poste : un duel ouvert, rien joué, trace Chrome de quelques
// secondes, temps PROCESSEUR (`tdur`) de chaque tâche par fil. Sert à voir ce que coûte une animation CSS sans fin :
// chaque réglage ajoute une feuille (outil seulement) et se compare à la base, dans le même navigateur.
// Usage : LQV_GPU=1 CHROMIUM_PATH=<Chrome> [LQV_CHROME_ARGS=…] [LQV_REPOS_OUT=…] [LQV_DIST=…] node tools/duel-cout-repos.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { launch, rendererLabel, startPreview, watchConsole, webglRenderer } from './browser.mjs';

const OUT = process.env.LQV_REPOS_OUT ?? 'artifacts/qa/duel-cout-repos.json';
const SECONDES = Number(process.env.LQV_REPOS_S ?? 5);
const REGLAGES = [
  ['base', ''],
  ['sans-legende', '.card.rar-Legendary .frame::after{animation:none!important}'],
  ['sans-sceau', '.tech.usable .seal{animation:none!important}'],
  ['sans-pulsations', '.btn.next,.stance.next .chip,.zone.next>.zone-floor,.step.current,.tech.usable .seal,.card.rar-Legendary .frame::after,.armed-badge,.zone.reveal-effect>.zone-floor{animation:none!important}'],
  ['base-bis', ''],
];
const NOMS = ['Paint', 'PrePaint', 'Layerize', 'UpdateLayerTree', 'Layout', 'Commit', 'FunctionCall', 'FireAnimationFrame', 'RasterTask', 'ImageDecodeTask', 'GPUTask', 'ThreadProxy::ScheduledActionDraw', 'LayerTreeHostImpl::PrepareToDraw', 'LayerTreeHostImpl::DrawLayers', 'Display::DrawAndSwap', 'SkiaRenderer::SwapBuffers', 'DirectRenderer::DrawFrame'];

async function trace(cdp, page) {
  await cdp.send('Tracing.start', { transferMode: 'ReturnAsStream', streamFormat: 'json', traceConfig: { includedCategories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'toplevel', 'cc', 'viz', 'gpu'], excludedCategories: ['*'], recordMode: 'recordContinuously' } });
  await page.waitForTimeout(1000 * SECONDES);
  const done = new Promise((resolve) => cdp.once('Tracing.tracingComplete', resolve));
  await cdp.send('Tracing.end');
  const { stream } = await done;
  const parts = [];
  for (;;) {
    const c = await cdp.send('IO.read', { handle: stream, size: 4 << 20 });
    if (c.data) parts.push(c.base64Encoded ? Buffer.from(c.data, 'base64').toString() : c.data);
    if (c.eof) break;
  }
  await cdp.send('IO.close', { handle: stream });
  return JSON.parse(parts.join('')).traceEvents;
}

function bilan(events) {
  const fils = new Map();
  for (const e of events) if (e.ph === 'M' && e.name === 'thread_name') fils.set(`${e.pid}:${e.tid}`, e.args.name);
  const parNom = {};
  const parFil = {};
  for (const e of events) {
    if (e.ph !== 'X') continue;
    const fil = fils.get(`${e.pid}:${e.tid}`) ?? '?';
    const ms = (e.tdur ?? e.dur ?? 0) / 1000 / SECONDES;
    if (NOMS.includes(e.name)) { const k = parNom[e.name] ??= { n: 0, ms: 0 }; k.n += 1 / SECONDES; k.ms += ms; }
    if (e.name === 'ThreadControllerImpl::RunTask' || e.name === 'ThreadPool_RunTask') parFil[fil] = (parFil[fil] ?? 0) + ms;
  }
  const r = (o) => Object.fromEntries(Object.entries(o).sort((a, b) => (b[1].ms ?? b[1]) - (a[1].ms ?? a[1])).map(([k, v]) => [k, typeof v === 'number' ? Math.round(v * 10) / 10 : { parS: Math.round(v.n), msParS: Math.round(v.ms * 10) / 10 }]));
  return { parNom: r(parNom), parFilMsParS: r(parFil) };
}

const server = await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4195);
const browser = await launch();
const report = { date: new Date().toISOString(), secondes: SECONDES, renderer: null, reglages: [] };
try {
  for (const [nom, css] of REGLAGES) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const issues = [];
    watchConsole(page, issues);
    if (css) await page.addInitScript((c) => { const add = () => document.head.append(Object.assign(document.createElement('style'), { textContent: c })); if (document.head) add(); else addEventListener('DOMContentLoaded', add); }, css);
    await page.goto(`${server.base}/?seed=202&autostart=1&qa=1&aiDelay=0&reducedMotion=0&pace=normal&tech=Sondage,Rupture`);
    await page.waitForFunction(() => !!window.__lqv);
    report.renderer ??= await webglRenderer(page);
    await page.waitForTimeout(4000);
    const animations = await page.evaluate(() => { const t = {}; for (const a of document.getAnimations()) { const n = a.animationName ?? a.constructor.name; t[n] = (t[n] ?? 0) + 1; } return t; });
    const cdp = await ctx.newCDPSession(page);
    const res = bilan(await trace(cdp, page));
    report.reglages.push({ nom, animations, ...res, consoleIssues: issues });
    console.log(nom, JSON.stringify(animations), JSON.stringify(res.parFilMsParS), JSON.stringify(res.parNom));
    await ctx.close();
  }
} finally {
  await browser.close();
  server.stop();
}
report.rendererLabel = rendererLabel(report.renderer);
mkdirSync(OUT.replace(/[^/]+$/, ''), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log(`→ ${OUT}`);
