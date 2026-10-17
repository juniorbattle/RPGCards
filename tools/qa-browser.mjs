// QA navigateur M02/M03 : duels complets PAR L’INTERFACE (glisser souris, clic, clavier, glisser tactile)
// sur 1280×720, 1920×1080 et mobile 390×844. Vérifie : issue atteinte, erreurs console, fuites de
// secrets dans le DOM, VUE attendue à chaque phase (A confrontation / B manipulation), bascule
// manuelle en pleine tactique, Techniques humaines exercées, séquence de résolution (jouée/sautée),
// humeurs du rival observées. Sortie : artifacts/qa/qa-browser.json
import { mkdirSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { launch, startPreview, view, watchConsole } from './browser.mjs';
import { playTurn, pres, sample } from './duel-driver.mjs';

const OUT = 'artifacts/qa';
mkdirSync(OUT, { recursive: true });
const commit = execSync('git rev-parse --short HEAD').toString().trim();

async function runDuel(browser, base, run) {
  const ctx = await browser.newContext({ viewport: run.viewport, isMobile: !!run.isMobile, hasTouch: !!run.isMobile, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.setDefaultTimeout(10000);
  const consoleIssues = [];
  watchConsole(page, consoleIssues);
  await page.goto(`${base}/?seed=${run.seed}&autostart=1&qa=1&aiDelay=0&reducedMotion=${run.watchSequence ? 0 : 1}&pace=${run.watchSequence ? 'fast' : 'normal'}&tech=${run.tech}`);
  await page.waitForFunction(() => !!window.__lqv);
  if (process.env.QA_DEBUG) {
    // Trace des événements pointeur (diagnostic d’un glisser qui n’aboutit pas).
    await page.evaluate(() => {
      window.__ptr = [];
      const t0 = performance.now();
      for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'touchstart', 'touchend', 'touchcancel', 'click']) {
        window.addEventListener(type, (e) => {
          const t = e.target;
          window.__ptr.push(`${Math.round(performance.now() - t0)} ${type} ${Math.round(e.clientX ?? e.touches?.[0]?.clientX ?? -1)},${Math.round(e.clientY ?? e.touches?.[0]?.clientY ?? -1)} ${t?.dataset?.key ?? t?.closest?.('[data-key]')?.dataset?.key ?? t?.className ?? ''} prevented=${e.defaultPrevented}`);
          if (window.__ptr.length > 200) window.__ptr.shift();
        }, true);
      }
    });
  }
  const stats = { turns: 0, drags: 0, clicks: 0, keyboard: 0, tactics: 0, repels: 0, leaks: [], viewChecks: 0, viewErrors: [], lostClicks: [], tech: {}, moods: new Set(), sequencesWatched: 0, sequencesSkipped: 0, manualToggleChecked: null, holds: 0, layoutChecked: [], layoutIssues: [], stanceChecks: 0, stanceIssues: [], stageGhosts: [], stagesSeen: 0, rotations: [] };
  let outcome = 'running';
  const t0 = Date.now();
  try {
    for (let t = 0; t < 80 && outcome !== 'ended' && outcome !== 'stuck'; t++) outcome = await playTurn(page, run, stats);
  } catch (err) {
    mkdirSync(`${OUT}/tmp`, { recursive: true });
    await page.screenshot({ path: `${OUT}/tmp/fail-${run.name}.png` });
    if (process.env.QA_DEBUG) {
      const dbg = await page.evaluate(() => ({ ptr: window.__ptr?.slice(-60), toast: window.__lqv.controller.ui.toast, pres: window.__lqv.presentation(), drag: window.__lqv.controller.ui }));
      console.error(JSON.stringify(dbg, null, 1));
    }
    console.error(`[${run.name}] échec : ${String(err.message).split('\n')[0]}`);
    outcome = 'error';
    stats.error = String(err.message).split('\n')[0];
  }
  await page.waitForFunction(() => !window.__lqv.controller.sequencing, null, { timeout: 30000 }).catch(() => {});
  await sample(page, stats);
  const v = await view(page);
  const p = await pres(page);
  await ctx.close();
  return {
    ...run, outcome, phase: v.phase, winner: v.winner, turn: v.turn, hp: [v.me.hp, v.opp.hp], overtime: v.overtime, ms: Date.now() - t0, consoleIssues,
    ...stats, moods: [...stats.moods], leaks: [...new Set(stats.leaks)], viewSwitches: p.switches, personality: p.personality,
  };
}

const server = await startPreview();
const browser = await launch();
const report = { commit, date: new Date().toISOString(), chromium: browser.version(), runs: [] };
try {
  const only = process.env.QA_ONLY;
  const plans0 = [
    { name: 'desktop-1280-drag', seed: 101, viewport: { width: 1280, height: 720 }, mode: 'drag', tech: 'Lecture,Ancrage', useLecture: true },
    { name: 'desktop-1920-click', seed: 202, viewport: { width: 1920, height: 1080 }, mode: 'click', tech: 'Sondage,Rupture', watchSequence: true },
    { name: 'desktop-1280-keyboard', seed: 303, viewport: { width: 1280, height: 720 }, mode: 'keyboard', tech: 'Recentrage,Dissipation' },
    { name: 'mobile-390-touch', seed: 404, viewport: { width: 390, height: 844 }, mode: 'touch', tech: 'Lecture,Ancrage', isMobile: true },
    // M03.2 : téléphone tourné en plein tour (portrait ↔ paysage), puis petite tablette paysage.
    { name: 'mobile-rotation-touch', seed: 505, viewport: { width: 390, height: 844 }, mode: 'touch', tech: 'Sondage,Rupture', isMobile: true,
      rotate: [{ afterTurns: 1, viewport: { width: 844, height: 390 } }, { afterTurns: 4, viewport: { width: 390, height: 844 } }, { afterTurns: 6, viewport: { width: 844, height: 390 } }, { afterTurns: 9, viewport: { width: 960, height: 540 } }] },
  ];
  const plans = only ? plans0.filter((p) => p.name.includes(only)) : plans0;
  for (const p of plans) {
    const r = await runDuel(browser, server.base, p);
    report.runs.push(r);
    console.log(`${r.name}: ${r.outcome} au tour ${r.turn} · rival ${r.personality} · gagnant ${r.winner} · vues ${r.viewChecks} contrôles/${r.viewErrors.length} écarts, ${r.viewSwitches} bascules, V ${r.manualToggleChecked} · techniques ${JSON.stringify(r.tech)} · séquences vues ${r.sequencesWatched}/sautées ${r.sequencesSkipped} (scènes de Clash ${r.stagesSeen}, fantômes ${r.stageGhosts.length}) · postures ${r.stanceChecks} contrôles/${r.stanceIssues.length} écarts · composition ${r.layoutIssues.length} écart(s)${r.layoutIssues.length ? ` [${r.layoutIssues.slice(0, 3).join(' | ')}]` : ''} · humeurs ${r.moods.length} · console ${r.consoleIssues.length} · fuites ${r.leaks.length} · clics perdus ${r.lostClicks.length}${r.rotations.length ? ` · rotations ${r.rotations.join(' ; ')}` : ''} · ${r.ms} ms`);
  }
} finally {
  await browser.close();
  server.stop();
}
const moods = new Set(report.runs.flatMap((r) => r.moods));
report.distinctMoods = [...moods];
writeFileSync(`${OUT}/qa-browser.json`, JSON.stringify(report, null, 2));
const failed = report.runs.filter((r) => r.outcome !== 'ended' || r.consoleIssues.length || r.leaks.length || r.viewErrors.length || r.lostClicks.length || r.manualToggleChecked !== 'ok' || r.layoutIssues.length || r.stanceIssues.length || r.stageGhosts.length);
console.log(`humeurs distinctes du rival sur l’ensemble : ${moods.size} (${[...moods].join(', ')})`);
if (failed.length) {
  console.error(`ÉCHEC QA : ${failed.map((r) => `${r.name} ${r.error ?? ''} ${[...r.viewErrors, ...r.layoutIssues, ...r.stanceIssues, ...r.stageGhosts].slice(0, 4).join(' | ')}`).join(' ; ')}`);
  process.exit(1);
}
console.log(`QA navigateur M03 OK (${report.runs.length} duels complets) — rapport ${OUT}/qa-browser.json`);
