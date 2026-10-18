// QA du repli automatique du post-traitement (amendement ADR 019) dans le jeu réel, sur deux duels du produit :
// 1. duel 1 sous une charge GPU injectée par l’outil (`gpuStress`, cible LQV_GPU_STRESS_MS, défaut 6 ms par image) :
//    le repli doit franchir ses crans dans l’ordre (halo coupé, puis rendu direct), sans compiler de programme GPU ;
// 2. charge retirée, « Sauvegarder et quitter » (menus : arène figée), puis « Reprendre » : le duel suivant repart au
//    rendu complet, rythme nominal remesuré, et y reste (aucune remontée ni descente sans raison) ;
// console sans erreur ni avertissement. Sortie : artifacts/qa/qa-fallback.json (ou LQV_QA_OUT).
// Usage : LQV_GPU=1 CHROMIUM_PATH=<Chrome> [LQV_CHROME_ARGS=…] node tools/qa-fallback.mjs
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { EXTRA_ARGS, GPU, gpuStress, launch, rendererLabel, startPreview, watchConsole, webglRenderer } from './browser.mjs';

const OUT = process.env.LQV_QA_OUT ?? 'artifacts/qa/qa-fallback.json';
const STRESS_MS = Number(process.env.LQV_GPU_STRESS_MS ?? 6);
const commit = execSync('git rev-parse --short HEAD').toString().trim();
const screenIs = (page, id, timeout = 15000) => page.waitForSelector(`[data-screen="${id}"]`, { timeout });
const post = (page) => page.evaluate(() => { const s = window.__lqv.arenaStats(); return s ? { ...s.post, programs: s.programs } : null; });

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
  await page.goto(`${server.base}/?qa=1&aiDelay=0&reducedMotion=0&profileSeed=7`);
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
  await page.waitForFunction(() => window.__lqv.arenaStats().post.level === 'direct', null, { timeout: 40000 }).catch(() => {});
  const d1 = await post(page);
  report.duel1 = { start: start1, end: d1, stressMs: await page.evaluate(() => window.__gpuStress?.ms.slice(-10) ?? null) };
  check(start1.level === 'full' && start1.auto, 'duel 1 : départ au rendu complet, repli actif');
  check(d1.level === 'direct', `duel 1 sous ${STRESS_MS} ms de charge GPU : rendu direct atteint`);
  check(JSON.stringify(d1.steps.map((s) => [s.from, s.to])) === JSON.stringify([['full', 'nobloom'], ['nobloom', 'direct']]), 'duel 1 : crans dans l’ordre (halo coupé, puis rendu direct)');
  check(d1.steps.every((s) => s.atS >= 3), 'duel 1 : aucun cran pendant la mise en place (2 premières secondes)');
  check(d1.programs === start1.programs, `duel 1 : aucun programme GPU compilé par les changements de niveau (${start1.programs} → ${d1.programs})`);
  // Charge retirée, puis menus et reprise.
  await page.evaluate(() => { window.__gpuStress.targetMs = 0; });
  await page.click('[data-key="tool-menu"]');
  await page.click('[data-key="menu-quit"]');
  await screenIs(page, 'board');
  await page.waitForTimeout(1500);
  await page.click('[data-key="board-resume"]');
  await page.waitForFunction(() => !!window.__lqv?.arenaStats());
  const start2 = await post(page);
  await page.waitForTimeout(20000);
  const d2 = await post(page);
  report.duel2 = { start: start2, end: d2 };
  check(start2.level === 'full' && start2.runs === d1.runs + 1 && start2.steps.length === 0, 'duel suivant (après les menus) : rendu complet, historique remis à zéro');
  check(d2.level === 'full' && d2.steps.length === 0, 'duel suivant sans charge, 20 s : reste au rendu complet');
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
