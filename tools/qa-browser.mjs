// QA navigateur M02/M03 : duels complets PAR L’INTERFACE (glisser souris, clic, clavier, glisser tactile)
// sur 1280×720, 1920×1080 et mobile 390×844. Vérifie : issue atteinte, erreurs console, fuites de
// secrets dans le DOM, VUE attendue à chaque phase (A confrontation / B manipulation), bascule
// manuelle en pleine tactique, Techniques humaines exercées, séquence de résolution (jouée/sautée),
// humeurs du rival observées. Sortie : artifacts/qa/qa-browser.json (ou `LQV_QA_OUT`).
// `LQV_RENDER_CHECK=1` (passe 13) : chaque rendu ciblé du plateau est comparé dans la page à un rendu
// complet du même état ; toute différence est une erreur console, donc un échec. Passe 14 : chaque
// illustration pré-générée par le worker est aussi comparée à la génération synchrone (`artCheck=1`).
// 4b (arbitrage du 2026-10-18) : une scène du Clash hors résolution n’est tolérée que pendant son fondu de
// défausse, borné par sa durée réelle (`stageAudit`, compté dans `stageFades`). Cas NÉGATIF :
// `LQV_QA_STAGE_FAULT=opaque` (la fin de séquence ne nettoie plus la scène) ou `stuck` (nettoyage commencé,
// retrait programmé perdu) injecte le défaut dans la page de test, jamais dans le jeu : la QA doit échouer.
import { mkdirSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { launch, startPreview, view, watchConsole } from './browser.mjs';
import { playTurn, pres, sample } from './duel-driver.mjs';

const OUT = 'artifacts/qa';
mkdirSync(OUT, { recursive: true });
const commit = execSync('git rev-parse --short HEAD').toString().trim();
const RENDER_CHECK = process.env.LQV_RENDER_CHECK === '1';
const REPORT = process.env.LQV_QA_OUT ?? `${OUT}/qa-browser.json`;
const STAGE_FAULT = process.env.LQV_QA_STAGE_FAULT || null;
if (STAGE_FAULT && !['opaque', 'stuck'].includes(STAGE_FAULT)) throw new Error(`LQV_QA_STAGE_FAULT inconnu : ${STAGE_FAULT} (opaque | stuck)`);

async function runDuel(browser, base, run) {
  const ctx = await browser.newContext({ viewport: run.viewport, isMobile: !!run.isMobile, hasTouch: !!run.isMobile, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  // LQV_QA_TIMEOUT (ms) : délai des actions (clics, attentes) sur un conteneur lent en rendu logiciel ; sans la variable : inchangé.
  page.setDefaultTimeout(Number(process.env.LQV_QA_TIMEOUT) || 10000);
  // LQV_QA_NAV_TIMEOUT (ms) : délai des navigations seules (chargement à froid d’un conteneur lent : la compilation des
  // programmes WebGL en SwiftShader retarde l’événement load de 11 à 17 s ; RC 0.8). Sans la variable : inchangé.
  if (process.env.LQV_QA_NAV_TIMEOUT) page.setDefaultNavigationTimeout(Number(process.env.LQV_QA_NAV_TIMEOUT));
  const consoleIssues = [];
  watchConsole(page, consoleIssues);
  await page.goto(`${base}/?seed=${run.seed}&autostart=1&qa=1&aiDelay=0&reducedMotion=${run.watchSequence ? 0 : 1}&pace=${run.watchSequence ? 'fast' : 'normal'}&tech=${run.tech}${RENDER_CHECK ? '&renderCheck=1&artCheck=1' : ''}${process.env.LQV_QA_QUERY ? `&${process.env.LQV_QA_QUERY}` : ''}`);
  await page.waitForFunction(() => !!window.__lqv);
  if (STAGE_FAULT) {
    // Défaut injecté par l’écouteur de mise en scène du contrôleur ; `fired` prouve qu’il a joué.
    await page.evaluate((fault) => {
      const c = window.__lqv.controller;
      const fn = c.motionFn;
      const rec = (window.__lqvStageFault = { fault, fired: 0 });
      c.motionFn = (m) => {
        if (fault === 'opaque' && (m.type === 'end' || m.type === 'stop')) { if (window.__lqv.presentation().stage) rec.fired++; return; }
        if (fault === 'stuck' && m.type === 'end') {
          const st = window.setTimeout;
          window.setTimeout = () => 0;
          try { fn(m); } finally { window.setTimeout = st; }
          if (window.__lqv.presentation().stageLeaving) rec.fired++;
          return;
        }
        fn(m);
      };
    }, STAGE_FAULT);
  }
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
  const stats = { turns: 0, drags: 0, clicks: 0, keyboard: 0, tactics: 0, repels: 0, leaks: [], viewChecks: 0, viewErrors: [], lostClicks: [], tech: {}, moods: new Set(), sequencesWatched: 0, sequencesSkipped: 0, manualToggleChecked: null, holds: 0, layoutChecked: [], layoutIssues: [], stanceChecks: 0, stanceIssues: [], stageGhosts: [], stageFades: [], stagesSeen: 0, rotations: [] };
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
  const renderCheck = RENDER_CHECK ? await page.evaluate(() => window.__lqvRenderCheck?.() ?? null) : null;
  const artCheck = RENDER_CHECK ? await page.evaluate(() => window.__lqv.artWarm?.() ?? null) : null;
  const stageFault = STAGE_FAULT ? await page.evaluate(() => window.__lqvStageFault ?? null) : null;
  await ctx.close();
  return {
    ...run, outcome, renderCheck, artCheck, stageFault, phase: v.phase, winner: v.winner, turn: v.turn, hp: [v.me.hp, v.opp.hp], overtime: v.overtime, ms: Date.now() - t0, consoleIssues,
    ...stats, moods: [...stats.moods], leaks: [...new Set(stats.leaks)], viewSwitches: p.switches, personality: p.personality,
  };
}

const server = await startPreview();
const browser = await launch();
const report = { commit, date: new Date().toISOString(), chromium: browser.version(), stageFault: STAGE_FAULT, runs: [] };
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
    console.log(`${r.name}: ${r.outcome} au tour ${r.turn} · rival ${r.personality} · gagnant ${r.winner} · vues ${r.viewChecks} contrôles/${r.viewErrors.length} écarts, ${r.viewSwitches} bascules, V ${r.manualToggleChecked} · techniques ${JSON.stringify(r.tech)} · séquences vues ${r.sequencesWatched}/sautées ${r.sequencesSkipped} (scènes de Clash ${r.stagesSeen}, fantômes ${r.stageGhosts.length}, fondus tolérés ${r.stageFades.length})${r.stageFault ? ` · DÉFAUT INJECTÉ ${r.stageFault.fault} ×${r.stageFault.fired}` : ''} · postures ${r.stanceChecks} contrôles/${r.stanceIssues.length} écarts · composition ${r.layoutIssues.length} écart(s)${r.layoutIssues.length ? ` [${r.layoutIssues.slice(0, 3).join(' | ')}]` : ''} · humeurs ${r.moods.length} · console ${r.consoleIssues.length} · fuites ${r.leaks.length} · clics perdus ${r.lostClicks.length}${r.rotations.length ? ` · rotations ${r.rotations.join(' ; ')}` : ''}${r.renderCheck ? ` · rendus comparés ${r.renderCheck.renders}, écarts ${r.renderCheck.mismatches.length}` : ''}${r.artCheck ? ` · illustrations comparées ${r.artCheck.checked}, écarts ${r.artCheck.mismatches.length}` : ''} · ${r.ms} ms`);
  }
} finally {
  await browser.close();
  server.stop();
}
const moods = new Set(report.runs.flatMap((r) => r.moods));
report.distinctMoods = [...moods];
writeFileSync(REPORT, JSON.stringify(report, null, 2));
const failed = report.runs.filter((r) => r.outcome !== 'ended' || r.consoleIssues.length || r.leaks.length || r.viewErrors.length || r.lostClicks.length || r.manualToggleChecked !== 'ok' || r.layoutIssues.length || r.stanceIssues.length || r.stageGhosts.length || (RENDER_CHECK && (!r.renderCheck?.renders || r.renderCheck.mismatches.length || !r.artCheck?.done || !r.artCheck.checked || r.artCheck.mismatches.length)));
console.log(`humeurs distinctes du rival sur l’ensemble : ${moods.size} (${[...moods].join(', ')})`);
if (failed.length) {
  console.error(`ÉCHEC QA : ${failed.map((r) => `${r.name} ${r.error ?? ''} ${[...r.viewErrors, ...r.layoutIssues, ...r.stanceIssues, ...r.stageGhosts].slice(0, 4).join(' | ')}`).join(' ; ')}`);
  process.exit(1);
}
console.log(`QA navigateur M03 OK (${report.runs.length} duels complets) — rapport ${REPORT}`);
