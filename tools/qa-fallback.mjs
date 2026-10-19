// QA du repli automatique du post-traitement (amendement ADR 019) dans le jeu réel, sur deux duels du produit :
// 1. duel 1 sous une charge GPU injectée par l’outil (`gpuStress`, cible LQV_GPU_STRESS_MS, défaut 6 ms par image, ×1,5
//    toutes les 20 s sans rendu direct, trois fois au plus : l’effet d’une même charge dépend de l’état du poste) : le
//    repli doit franchir ses crans dans l’ordre (halo coupé, puis rendu direct), sans compiler de programme GPU, et
//    seulement après un décrochage mesuré par l’outil ;
// 2. charge retirée, « Sauvegarder et quitter » (menus : arène figée, LQV_QA_MENU_S secondes, défaut 8, le temps que
//    le poste refroidisse), puis « Reprendre » : le duel suivant repart au rendu complet, rythme nominal remesuré, et
//    n’y descend pas sans décrochage MESURÉ par l’outil (intervalles rAF relevés dans la page, indépendamment du jeu) ;
// console sans erreur ni avertissement. Sortie : artifacts/qa/qa-fallback.json (ou LQV_QA_OUT) ; LQV_QA_QUERY=… : paramètres d’URL en plus (M08 C2 : `venue=bar`, lieu du duel imposé).
// Usage : LQV_GPU=1 CHROMIUM_PATH=<Chrome> [LQV_CHROME_ARGS=…] node tools/qa-fallback.mjs
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { EXTRA_ARGS, GPU, gpuStress, launch, rendererLabel, startPreview, watchConsole, webglRenderer } from './browser.mjs';

const OUT = process.env.LQV_QA_OUT ?? 'artifacts/qa/qa-fallback.json';
const STRESS_MS = Number(process.env.LQV_GPU_STRESS_MS ?? 6);
const MENU_S = Number(process.env.LQV_QA_MENU_S ?? 8);
const commit = execSync('git rev-parse --short HEAD').toString().trim();
const screenIs = (page, id, timeout = 15000) => page.waitForSelector(`[data-screen="${id}"]`, { timeout });
const post = (page) => page.evaluate(() => { const s = window.__lqv.arenaStats(); return s ? { ...s.post, programs: s.programs } : null; });
// Relevé indépendant du jeu : intervalles rAF, médiane et part au-delà de 16,7 ms depuis le dernier départ.
const ivStart = (page) => page.evaluate(() => { const rec = (window.__qaIv = { iv: [], stop: false }); let l = performance.now(); const f = (t) => { rec.iv.push(t - l); l = t; if (!rec.stop) requestAnimationFrame(f); }; requestAnimationFrame(f); });
// `badRun` : plus longue suite de secondes mauvaises (≥ 5 % d’images > 16,7 ms, ou médiane > 1,6 fois le premier quartile
// de tout le relevé), comptée par l’outil sur ses propres intervalles.
const ivStop = (page) => page.evaluate(() => {
  const rec = window.__qaIv;
  rec.stop = true;
  const iv = rec.iv.slice(1);
  const s = [...iv].sort((a, b) => a - b);
  const q1 = s[Math.floor(s.length / 4)] ?? 0;
  const late = (d) => d > 1000 / 60;
  let badRun = 0;
  let run = 0;
  for (let i = 0, sum = 0, b = []; i < iv.length; i++) {
    b.push(iv[i]);
    sum += iv[i];
    if (sum < 1000) continue;
    const bs = [...b].sort((x, y) => x - y);
    const bad = b.filter(late).length / b.length >= 0.05 || bs[Math.floor(bs.length / 2)] > 1.6 * q1;
    run = bad ? run + 1 : 0;
    badRun = Math.max(badRun, run);
    b = [];
    sum = 0;
  }
  return { frames: s.length, medianMs: Math.round(s[Math.floor(s.length / 2)] * 10) / 10, late: s.filter(late).length, lateShare: Math.round((s.filter(late).length / Math.max(1, s.length)) * 1000) / 1000, badRun };
});

const server = await startPreview(4189);
const browser = await launch();
const report = { commit, date: new Date().toISOString(), gpu: GPU, chromeArgs: EXTRA_ARGS, stressMs: STRESS_MS, renderer: null, checks: [], fails: [], duel1: null, duel2: null, consoleIssues: [] };
const check = (ok, what) => { report.checks.push(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); if (!ok) report.fails.push(what); };
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(gpuStress, STRESS_MS);
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  watchConsole(page, report.consoleIssues);
  await page.goto(`${server.base}/?qa=1&aiDelay=0&reducedMotion=0&profileSeed=7${process.env.LQV_QA_QUERY ? `&${process.env.LQV_QA_QUERY}` : ""}`);
  report.renderer = rendererLabel(await webglRenderer(page));
  await screenIs(page, 'home');
  await page.click('[data-key="home-new"]');
  await page.fill('[data-key="new-name"]', 'QA Repli');
  await page.click('[data-key="new-create"]');
  await screenIs(page, 'board');
  await page.click('[data-key="enc-libre-braise"]');
  await screenIs(page, 'prep');
  await page.click('[data-key="prep-start"]');
  await page.waitForFunction(() => !!window.__lqv?.arenaStats());
  // Duel 1, sous charge : on laisse la boucle tourner (le joueur réfléchit) jusqu’au rendu direct, 40 s au plus.
  const start1 = await post(page);
  await ivStart(page);
  const targets = [];
  for (let k = 0; k < 4; k++) {
    const target = Math.round(STRESS_MS * 1.5 ** k * 10) / 10;
    targets.push(target);
    await page.evaluate((t) => { window.__gpuStress.targetMs = t; }, target);
    const reached = await page.waitForFunction(() => window.__lqv.arenaStats().post.level === 'direct', null, { timeout: 20000 }).then(() => true, () => false);
    if (reached) break;
  }
  const d1 = await post(page);
  report.duel1 = { start: start1, end: d1, frames: await ivStop(page), stressTargetsMs: targets, stressMs: await page.evaluate(() => window.__gpuStress?.ms.slice(-10) ?? null) };
  check(start1.level === 'full' && start1.auto, 'duel 1 : départ au rendu complet, repli actif');
  check(d1.level === 'direct', `duel 1 sous charge GPU (${targets.join(' → ')} ms) : rendu direct atteint (${report.duel1.frames.late} images > 16,7 ms sur ${report.duel1.frames.frames}, médiane ${report.duel1.frames.medianMs} ms)`);
  check(d1.steps.length === 0 || report.duel1.frames.badRun >= 2, `duel 1 : crans après un décrochage mesuré par l’outil (${report.duel1.frames.badRun} secondes mauvaises de suite)`);
  check(JSON.stringify(d1.steps.map((s) => [s.from, s.to])) === JSON.stringify([['full', 'nobloom'], ['nobloom', 'direct']]), 'duel 1 : crans dans l’ordre (halo coupé, puis rendu direct)');
  check(d1.steps.every((s) => s.atS >= 3), 'duel 1 : aucun cran pendant la mise en place (2 premières secondes)');
  check(d1.programs === start1.programs, `duel 1 : aucun programme GPU compilé par les changements de niveau (${start1.programs} → ${d1.programs})`);
  // Charge retirée, puis menus et reprise.
  await page.evaluate(() => { window.__gpuStress.targetMs = 0; });
  await page.click('[data-key="tool-menu"]');
  await page.click('[data-key="menu-quit"]');
  await screenIs(page, 'board');
  await page.waitForTimeout(MENU_S * 1000);
  await page.click('[data-key="board-resume"]');
  await page.waitForFunction(() => !!window.__lqv?.arenaStats());
  const start2 = await post(page);
  await ivStart(page);
  await page.waitForTimeout(20000);
  const d2 = await post(page);
  report.duel2 = { start: start2, end: d2, frames: await ivStop(page) };
  check(start2.level === 'full' && start2.runs === d1.runs + 1 && start2.steps.length === 0, 'duel suivant (après les menus) : rendu complet, historique remis à zéro');
  const f2 = report.duel2.frames;
  check(d2.steps.length === 0 || f2.badRun >= 2, `duel suivant sans charge, 20 s : ${d2.steps.length ? `cran(s) ${d2.steps.map((x) => x.to).join(', ')} ${f2.badRun >= 2 ? 'justifié(s) par' : 'SANS'} un décrochage mesuré par l’outil (${f2.badRun} secondes mauvaises de suite)` : 'reste au rendu complet'} (${f2.late} images > 16,7 ms sur ${f2.frames})`);
  check(d2.nominalMs !== null && d2.nominalMs < 20, `duel suivant : rythme nominal remesuré (${d2.nominalMs} ms)`);
  check(report.consoleIssues.length === 0, `console : ${report.consoleIssues.length} erreur(s) ou avertissement(s)`);
  await ctx.close();
} catch (err) {
  report.fails.push(`exception : ${String(err.message).split('\n')[0]}`);
} finally {
  await browser.close();
  server.stop();
}
mkdirSync(OUT.replace(/[\\/][^\\/]*$/, ''), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2));
for (const c of report.checks) console.log(c);
if (report.fails.length) console.log(`ÉCHECS : ${report.fails.join(' | ')}`);
console.log(`→ ${OUT}`);
process.exitCode = report.fails.length ? 1 : 0;
