// QA navigateur M02/M03 : duels complets PAR L’INTERFACE (glisser souris, clic, clavier, glisser tactile)
// sur 1280×720, 1920×1080 et mobile 390×844. Vérifie : issue atteinte, erreurs console, fuites de
// secrets dans le DOM, VUE attendue à chaque phase (A confrontation / B manipulation), bascule
// manuelle en pleine tactique, Techniques humaines exercées, séquence de résolution (jouée/sautée),
// humeurs du rival observées. Sortie : artifacts/qa/qa-browser.json
import { mkdirSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dragTo, launch, secretAudit, startPreview, touchDrag, view, waitDecision, watchConsole } from './browser.mjs';

const OUT = 'artifacts/qa';
mkdirSync(OUT, { recursive: true });
const commit = execSync('git rev-parse --short HEAD').toString().trim();

const pres = (page) => page.evaluate(() => window.__lqv.presentation());
const rankOf = (defId) => (defId.startsWith('sig-') ? 5 : Number(defId.split('-')[1]));

async function sample(page, stats) {
  const p = await pres(page);
  if (p.rival?.mood) stats.moods.add(p.rival.mood);
  return p;
}

/** Vue attendue (chorégraphie M02 §2) quand aucune bascule manuelle n’est active. */
function expectedView(v) {
  if (['PREPARE', 'DISSIPATION', 'COMMIT', 'START'].includes(v.phase) && v.awaitingMe) return 'B';
  return 'A';
}

async function checkView(page, v, stats) {
  const p = await sample(page, stats);
  if (p.manual) return;
  const want = expectedView(v);
  stats.viewChecks++;
  if (p.holding && want === 'B' && p.view === 'A') { stats.holds++; return; } // observation du rival en début de tour
  if (p.view !== want) stats.viewErrors.push(`tour ${v.turn} ${v.phase} : vue ${p.view}, attendue ${want}`);
}

/**
 * M03 — composition : HUD rival haut-gauche, HUD joueur bas-gauche, bande centrale libre de tout HUD,
 * aucun chevauchement main / commandes / emplacements / HUD joueur.
 */
async function layoutAudit(page) {
  return page.evaluate(() => {
    const W = innerWidth;
    const H = innerHeight;
    const issues = [];
    const r = (el) => el?.getBoundingClientRect();
    const opp = r(document.querySelector('.hud.opp'));
    const me = r(document.querySelector('.hud.me'));
    const mobile = W < 700;
    if (!opp || opp.left > W * 0.05 || opp.top > H * 0.05 || (!mobile && opp.right > W * 0.42)) issues.push('HUD rival hors du coin haut-gauche');
    if (!me || me.left > W * 0.05 || me.bottom < H * 0.95 || (!mobile && me.right > W * 0.42)) issues.push('HUD joueur hors du coin bas-gauche');
    if (!mobile) {
      const band = { left: W * 0.3, right: W * 0.7, top: H * 0.15, bottom: H * 0.62 };
      for (const el of document.querySelectorAll('.hud, .command')) {
        const b = r(el);
        if (b.right > band.left && b.left < band.right && b.bottom > band.top && b.top < band.bottom) issues.push(`module ${el.className} dans la zone centrale`);
      }
    }
    const boxes = [];
    document.querySelectorAll('.hand .card').forEach((el) => boxes.push(['main', r(el)]));
    document.querySelectorAll('.side .zone').forEach((el) => boxes.push(['case', r(el)]));
    for (const sel of ['.command', '.hud.me', '.hud.opp']) { const el = document.querySelector(sel); if (el) boxes.push([sel, r(el)]); }
    const hit = (a, b) => a.right - 2 > b.left && a.left + 2 < b.right && a.bottom - 2 > b.top && a.top + 2 < b.bottom;
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const [na, a] = boxes[i];
        const [nb, b] = boxes[j];
        if (na === nb && na !== '.command') continue;
        if (hit(a, b)) issues.push(`chevauchement ${na} / ${nb}`);
      }
    }
    if (document.documentElement.scrollWidth > W + 1) issues.push('défilement horizontal');
    return [...new Set(issues)];
  });
}

/** M03 §3 — ASSAUT/GARDE : bandeau sur chaque Primaire RÉVÉLÉE ; rien avant la révélation officielle. */
async function stanceAudit(page) {
  return page.evaluate(() => {
    const v = window.__lqv.view();
    const issues = [];
    const oppBanners = document.querySelectorAll('.side.opp .stance-banner, .side.opp .secret-stance');
    if (!v.reveal.primaries) {
      if (oppBanners.length) issues.push('mode de la Primaire adverse affiché avant sa révélation');
      return issues;
    }
    if (window.__lqv.controller.primaryOnBoard() !== 'card') return issues;
    for (const who of ['me', 'opp']) {
      const want = v.reveal.primaries[who].stance;
      const zone = document.querySelector(`[data-focus-key="${who}-primary"]`);
      const b = zone?.querySelector('.stance-banner');
      if (!b) issues.push(`bandeau de posture absent (${who})`);
      else if (!b.classList.contains(want)) issues.push(`bandeau ${who} incohérent : ${b.className} au lieu de ${want}`);
      else if (!/ASSAUT|GARDE/.test(b.textContent ?? '') || !b.querySelector('svg')) issues.push(`bandeau ${who} sans texte ou sans symbole`);
    }
    return issues;
  });
}

async function playTurn(page, run, stats) {
  const { mode } = run;
  for (let guard = 0; guard < 24; guard++) {
    const v = await waitDecision(page);
    if (process.env.QA_TRACE) console.log(`  [${run.name}] tour ${v.turn} ${v.phase} awaiting=${v.awaitingMe}`);
    if (v.phase === 'ENDED') return 'ended';
    await checkView(page, v, stats);
    if (v.phase !== 'RESOLVED' && v.phase !== 'REPEL') {
      // Aucune scène de Clash fantôme hors résolution (nettoyage après passage/saut/nouveau tour).
      const ghosts = await page.evaluate(() => document.querySelectorAll('#stage .clash-stage').length);
      if (ghosts) stats.stageGhosts.push(`tour ${v.turn} ${v.phase} : ${ghosts} scène(s) de Clash résiduelle(s)`);
    }
    if ((v.phase === 'COMMIT' || v.phase === 'TACTICS') && v.awaitingMe && !stats.layoutChecked.includes(v.phase)) {
      stats.layoutChecked.push(v.phase);
      stats.layoutIssues.push(...(await layoutAudit(page)).map((x) => `${v.phase} : ${x}`));
    }
    if (v.phase === 'TACTICS' || v.phase === 'COMMIT' || v.phase === 'LECTURE') {
      stats.stanceChecks++;
      stats.stanceIssues.push(...(await stanceAudit(page)).map((x) => `tour ${v.turn} ${v.phase} : ${x}`));
    }
    if (v.phase === 'RESOLVED') {
      if (run.watchSequence) {
        // Laisse la séquence se jouer en entier (rythme rapide, mouvement réel) avant le tour suivant.
        const seen = await page.waitForFunction(() => window.__lqv.presentation().stage || !window.__lqv.controller.sequencing, null, { timeout: 30000 }).then(() => page.evaluate(() => window.__lqv.presentation().stage));
        if (seen) stats.stagesSeen++;
        await page.waitForFunction(() => !window.__lqv.controller.sequencing, null, { timeout: 30000 });
        stats.sequencesWatched++;
        await page.waitForTimeout(1200);
        const ghosts = await page.evaluate(() => document.querySelectorAll('#stage .clash-stage').length);
        if (ghosts) stats.stageGhosts.push(`tour ${v.turn} : scène de Clash encore présente après la séquence`);
      } else if (await page.evaluate(() => window.__lqv.controller.sequencing)) stats.sequencesSkipped++;
      await sample(page, stats);
      await page.click('[data-key="act-next"]');
      stats.turns++;
      return 'next';
    }
    if (v.phase === 'START') {
      const excess = Math.max(0, v.me.handCount - 4);
      for (let i = 0; i < excess; i++) await page.locator('.hand .card').nth(i).click();
      const sond = page.locator('[data-key="tech-me-Sondage"]:not([disabled])');
      const rec = page.locator('[data-key="tech-me-Recentrage"]:not([disabled])');
      if (!excess && await sond.count()) { await sond.click(); stats.tech.Sondage = (stats.tech.Sondage ?? 0) + 1; }
      else if (!excess && await rec.count()) {
        await rec.click();
        await page.locator('.hand .card').first().click();
        stats.tech.Recentrage = (stats.tech.Recentrage ?? 0) + 1;
      }
      await page.click('[data-key="act-start"]');
    } else if (v.phase === 'PREPARE') {
      const zones = page.locator('.side.me .zone[role="button"]');
      const n = await zones.count();
      for (let i = 0; i < n; i++) await zones.nth(i).click();
      await page.click('[data-key="act-prepare"]');
    } else if (v.phase === 'DISSIPATION') {
      const src = v.opp.slots.find((s) => s?.maskSource);
      if (src && v.me.techniques.includes('Dissipation') && v.me.insight >= 1 && !v.me.techniqueUsed) {
        await page.click(`[data-key="zone-opp-${src.slot}"]`);
        await page.click('[data-key="act-dissip"]');
        stats.tech.Dissipation = (stats.tech.Dissipation ?? 0) + 1;
      } else await page.click('[data-key="act-dissip-pass"]');
    } else if (v.phase === 'COMMIT') {
      const order = [...v.me.hand].sort((a, b) => rankOf(b.defId) - rankOf(a.defId));
      const prim = order[0];
      const sec = order.find((c) => c.cardId !== prim.cardId && !c.defId.startsWith('sig-'));
      const freeSlot = v.me.slots.findIndex((s) => s === null);
      if (mode === 'drag') { await dragTo(page, `[data-key="hand-${prim.cardId}"]`, '[data-drop="primary"]'); stats.drags++; }
      else if (mode === 'touch') { await touchDrag(page, `[data-key="hand-${prim.cardId}"]`, '[data-drop="primary"]'); stats.drags++; }
      else if (mode === 'keyboard') {
        await page.focus(`[data-key="hand-${prim.cardId}"]`);
        await page.keyboard.press('Enter');
        await page.focus('[data-key="zone-primary"]');
        await page.keyboard.press('Enter');
        stats.keyboard++;
      } else { await page.click(`[data-key="hand-${prim.cardId}"]`); await page.click('[data-drop="primary"]'); stats.clicks++; }
      const stance = stats.turns % 3 === 2 ? 'guard' : 'assault';
      if (mode === 'keyboard') await page.keyboard.press(stance === 'guard' ? 'g' : 'a');
      else await page.click(`[data-key="stance-${stance}"]`);
      // M03.2 — rotation de l’écran EN PLEIN engagement : l’état du tour et le brouillon survivent.
      const rot = run.rotate?.[stats.rotations.length];
      if (rot && stats.turns >= rot.afterTurns) {
        const snap = () => page.evaluate(() => ({ s: JSON.stringify(window.__lqv.state()), draft: JSON.stringify(window.__lqv.controller.ui.draft) }));
        const before = await snap();
        await page.setViewportSize(rot.viewport);
        await page.waitForTimeout(450);
        const after = await snap();
        const ok = before.s === after.s && before.draft === after.draft;
        stats.rotations.push(`${rot.viewport.width}×${rot.viewport.height} tour ${v.turn} : ${ok ? 'état conservé' : 'ÉTAT PERDU'}`);
        if (!ok) stats.layoutIssues.push(`rotation ${rot.viewport.width}×${rot.viewport.height} : état ou brouillon modifié`);
        stats.layoutChecked = [];
        stats.layoutIssues.push(...(await layoutAudit(page)).map((x) => `${rot.viewport.width}×${rot.viewport.height} COMMIT : ${x}`));
      }
      if (sec && freeSlot >= 0) {
        if (mode === 'drag') { await dragTo(page, `[data-key="hand-${sec.cardId}"]`, `[data-drop="slot${freeSlot}"]`); stats.drags++; }
        else if (mode === 'touch') { await page.tap(`[data-key="hand-${sec.cardId}"]`); await page.tap(`[data-drop="slot${freeSlot}"]`); stats.clicks++; }
        else { await page.click(`[data-key="hand-${sec.cardId}"]`); await page.click(`[data-drop="slot${freeSlot}"]`); }
      }
      const turnBefore = v.turn;
      if (mode === 'keyboard') await page.keyboard.press('n');
      else await page.click('[data-key="act-commit"]');
      // Aucun clic perdu : le verrouillage doit avoir été pris en compte malgré la transition B → A.
      const after = await view(page);
      if (after.phase === 'COMMIT' && after.turn === turnBefore && after.awaitingMe) stats.lostClicks.push(`tour ${v.turn} : verrouillage d’engagement non pris en compte`);
    } else if (v.phase === 'LECTURE') {
      if (run.useLecture) { await page.click('[data-key="act-lecture"]'); stats.tech.Lecture = (stats.tech.Lecture ?? 0) + 1; }
      else await page.click('[data-key="act-lecture-pass"]');
    } else if (v.phase === 'LECTURE_CHANGE') {
      const seen = v.lectureSeen;
      if (seen === 'guard') await page.click('[data-key="stance-assault"]');
      await page.click('[data-key="act-lecture-stance"]');
    } else if (v.phase === 'TACTICS') {
      stats.leaks.push(...(await secretAudit(page)));
      // Bascule manuelle vers B puis retour A (touche V) sans perdre la décision en cours.
      if (!stats.manualToggleChecked) {
        await page.keyboard.press('v');
        const pB = await pres(page);
        await page.keyboard.press('v');
        const pA = await pres(page);
        stats.manualToggleChecked = pB.view === 'B' && pA.view === 'A' ? 'ok' : `échec (${pB.view}/${pA.view})`;
      }
      const engaged = [];
      for (const s of v.me.slots) {
        if (!s || s.state !== 'active') continue;
        await page.click(`[data-key="zone-me-${s.slot}"]`);
        const mode2 = v.reveal.primaries.me.stance === 'assault' && s.slot === 0 ? 'damage' : 'rank';
        await page.click(`[data-key="menu-${s.slot}-${mode2}"]`);
        engaged.push(s.slot);
        stats.tactics++;
      }
      const oppActive = v.opp.slots.filter((s) => s?.state === 'active');
      const anc = page.locator('[data-key="tech-me-Ancrage"]:not([disabled])');
      const rup = page.locator('[data-key="tech-me-Rupture"]:not([disabled])');
      if (engaged.length && oppActive.length && await anc.count()) {
        await anc.click();
        await page.click(`[data-key="zone-me-${engaged[0]}"]`);
        stats.tech.Ancrage = (stats.tech.Ancrage ?? 0) + 1;
      } else if (oppActive.length && v.reveal.primaries.me.stance === 'guard' && await rup.count()) {
        await rup.click();
        await page.click(`[data-key="zone-opp-${oppActive[0].slot}"]`);
        stats.tech.Rupture = (stats.tech.Rupture ?? 0) + 1;
      }
      await page.click('[data-key="act-tactics"]');
    } else if (v.phase === 'REPEL' && v.repel?.mine) {
      await page.click(`[data-key="zone-opp-${v.repel.choices[0]}"]`);
      stats.repels++;
    }
    stats.leaks.push(...(await secretAudit(page)));
  }
  return 'stuck';
}

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
