// QA navigateur : joue des duels complets PAR L’INTERFACE (clics, glisser-déposer pointeur, clavier),
// sur 1280×720, 1920×1080 et mobile portrait tactile. Vérifie : erreurs console, fuites de secrets
// dans le DOM, fin de partie atteinte, rejets explicites. Sortie : artifacts/qa/qa-browser.json
import { mkdirSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dragTo, launch, secretAudit, startPreview, touchDrag, view, waitDecision, watchConsole } from './browser.mjs';

const OUT = 'artifacts/qa';
mkdirSync(OUT, { recursive: true });
const commit = execSync('git rev-parse --short HEAD').toString().trim();

/** Joue un tour complet côté humain via l’UI. mode : 'drag' | 'click' | 'keyboard' | 'touch'. */
async function playTurn(page, mode, stats) {
  for (let guard = 0; guard < 20; guard++) {
    const v = await waitDecision(page);
    if (process.env.QA_TRACE) console.log(`  [${mode}] tour ${v.turn} ${v.phase} awaiting=${v.awaitingMe}`);
    if (v.phase === 'ENDED') return 'ended';
    if (v.phase === 'RESOLVED') {
      await page.click('[data-key="act-next"]');
      stats.turns++;
      return 'next';
    }
    if (v.phase === 'START') {
      const excess = Math.max(0, v.me.handCount - 4);
      for (let i = 0; i < excess; i++) await page.locator('.hand .card').nth(i).click();
      await page.click('[data-key="act-start"]');
    } else if (v.phase === 'PREPARE') {
      const zones = page.locator('.side.me .zone[role="button"]');
      const n = await zones.count();
      for (let i = 0; i < n; i++) await zones.nth(i).click();
      await page.click('[data-key="act-prepare"]');
    } else if (v.phase === 'DISSIPATION') {
      await page.click('[data-key="act-dissip-pass"]');
    } else if (v.phase === 'COMMIT') {
      const hand = v.me.hand;
      // Primaire : la carte de plus haut rang (Signature incluse) ; Secondaire : une autre carte ordinaire.
      const order = [...hand].sort((a, b) => rankOf(b.defId) - rankOf(a.defId));
      const prim = order[0];
      const sec = order.find((c) => c.cardId !== prim.cardId && !c.defId.startsWith('sig-'));
      const freeSlot = v.me.slots.findIndex((s) => s === null);
      if (mode === 'drag') {
        await dragTo(page, `[data-key="hand-${prim.cardId}"]`, '[data-drop="primary"]');
        stats.drags++;
      } else if (mode === 'touch') {
        await touchDrag(page, `[data-key="hand-${prim.cardId}"]`, '[data-drop="primary"]');
        stats.drags++;
      } else if (mode === 'keyboard') {
        await page.focus(`[data-key="hand-${prim.cardId}"]`);
        await page.keyboard.press('Enter');
        await page.focus('[data-key="zone-primary"]');
        await page.keyboard.press('Enter');
        stats.keyboard++;
      } else {
        await page.click(`[data-key="hand-${prim.cardId}"]`);
        await page.click('[data-drop="primary"]');
        stats.clicks++;
      }
      const stance = stats.turns % 3 === 2 ? 'guard' : 'assault';
      if (mode === 'keyboard') await page.keyboard.press(stance === 'guard' ? 'g' : 'a');
      else await page.click(`[data-key="stance-${stance}"]`);
      if (sec && freeSlot >= 0) {
        if (mode === 'drag') { await dragTo(page, `[data-key="hand-${sec.cardId}"]`, `[data-drop="slot${freeSlot}"]`); stats.drags++; }
        else if (mode === 'touch') { await page.tap(`[data-key="hand-${sec.cardId}"]`); await page.tap(`[data-drop="slot${freeSlot}"]`); stats.clicks++; }
        else { await page.click(`[data-key="hand-${sec.cardId}"]`); await page.click(`[data-drop="slot${freeSlot}"]`); }
      }
      if (mode === 'keyboard') await page.keyboard.press('n');
      else await page.click('[data-key="act-commit"]');
    } else if (v.phase === 'LECTURE') {
      await page.click('[data-key="act-lecture-pass"]');
    } else if (v.phase === 'LECTURE_CHANGE') {
      await page.click('[data-key="act-lecture-stance"]');
    } else if (v.phase === 'TACTICS') {
      const leaks = await secretAudit(page);
      stats.leaks.push(...leaks);
      for (const s of v.me.slots) {
        if (!s || s.state !== 'active') continue;
        await page.click(`[data-key="zone-me-${s.slot}"]`);
        const mode2 = v.reveal.primaries.me.stance === 'assault' && s.slot === 0 ? 'damage' : 'rank';
        await page.click(`[data-key="menu-${s.slot}-${mode2}"]`);
        stats.tactics++;
      }
      await page.click('[data-key="act-tactics"]');
    } else if (v.phase === 'REPEL' && v.repel?.mine) {
      const t = v.repel.choices[0];
      await page.click(`[data-key="zone-opp-${t}"]`);
      stats.repels++;
    }
    stats.leaks.push(...(await secretAudit(page)));
  }
  return 'stuck';
}

function rankOf(defId) {
  if (defId.startsWith('sig-')) return 5;
  return Number(defId.split('-')[1]);
}

async function runDuel(browser, base, { name, seed, viewport, mode, isMobile = false }) {
  const ctx = await browser.newContext({ viewport, isMobile, hasTouch: isMobile, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.setDefaultTimeout(10000);
  const consoleIssues = [];
  watchConsole(page, consoleIssues);
  await page.goto(`${base}/?seed=${seed}&autostart=1&qa=1&aiDelay=0&reducedMotion=1`);
  await page.waitForFunction(() => !!window.__lqv);
  const stats = { turns: 0, drags: 0, clicks: 0, keyboard: 0, tactics: 0, repels: 0, leaks: [] };
  let outcome = 'running';
  const t0 = Date.now();
  try {
    for (let t = 0; t < 80 && outcome !== 'ended' && outcome !== 'stuck'; t++) outcome = await playTurn(page, mode, stats);
  } catch (err) {
    mkdirSync(`${OUT}/tmp`, { recursive: true });
    await page.screenshot({ path: `${OUT}/tmp/fail-${name}.png` });
    const vv = await view(page);
    console.error(`[${name}] échec : ${String(err.message).split('\n')[0]} — phase ${vv.phase} tour ${vv.turn}`);
    outcome = 'error';
    stats.error = String(err.message).split('\n')[0];
  }
  const v = await view(page);
  // Rejet explicite : poser une Signature en Secondaire doit afficher une raison (si une Signature est en main).
  await ctx.close();
  return { name, seed, mode, viewport, outcome, phase: v.phase, winner: v.winner, turn: v.turn, hp: [v.me.hp, v.opp.hp], overtime: v.overtime, ms: Date.now() - t0, consoleIssues, ...stats, leaks: [...new Set(stats.leaks)] };
}

async function rejectionChecks(browser, base) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const consoleIssues = [];
  watchConsole(page, consoleIssues);
  await page.goto(`${base}/?scenario=signature&qa=1&aiDelay=0&reducedMotion=1`);
  await page.waitForFunction(() => !!window.__lqv);
  const v = await view(page);
  const sig = v.me.hand.find((c) => c.defId.startsWith('sig-'));
  const results = {};
  // Drag d’une Signature vers une Secondaire (les deux cases sont occupées) : refus avec raison.
  await dragTo(page, `[data-key="hand-${sig.cardId}"]`, '[data-drop="slot0"]');
  results.signatureAsSecondary = (await page.locator('.toast').textContent().catch(() => null)) ?? null;
  // Verrouiller sans mode : bouton désactivé.
  await page.click(`[data-key="hand-${sig.cardId}"]`);
  await page.click('[data-drop="primary"]');
  results.lockDisabledWithoutStance = await page.locator('[data-key="act-commit"]').isDisabled();
  await page.click('[data-key="stance-assault"]');
  await page.click('[data-key="act-commit"]');
  await waitDecision(page);
  // Fenêtre tactique : Dégâts autorisé (Assaut) ; vérifier libellés d’affinité.
  await page.click('[data-key="zone-me-0"]');
  results.menuDamageLabel = await page.locator('[data-key="menu-0-damage"]').textContent();
  await page.click('[data-key="menu-0-damage"]');
  await page.click('[data-key="zone-me-1"]');
  await page.click('[data-key="menu-1-damage"]');
  await page.click('[data-key="act-tactics"]');
  await page.waitForTimeout(200);
  const after = await view(page);
  results.signatureClash = after.lastClash ? { scores: after.lastClash.publicScores, damage: after.lastClash.damage, mult: after.lastClash.publicMultipliers, winner: after.lastClash.winner } : null;
  results.consoleIssues = consoleIssues;
  await ctx.close();
  return results;
}

const server = await startPreview();
const browser = await launch();
const report = { commit, date: new Date().toISOString(), chromium: browser.version(), runs: [], rejection: null };
try {
  const only = process.env.QA_ONLY;
  const plans0 = [
    { name: 'desktop-1280-drag', seed: 101, viewport: { width: 1280, height: 720 }, mode: 'drag' },
    { name: 'desktop-1920-click', seed: 202, viewport: { width: 1920, height: 1080 }, mode: 'click' },
    { name: 'desktop-1280-keyboard', seed: 303, viewport: { width: 1280, height: 720 }, mode: 'keyboard' },
    { name: 'mobile-390-touch', seed: 404, viewport: { width: 390, height: 844 }, mode: 'touch', isMobile: true },
  ];
  const plans = only ? plans0.filter((p) => p.name.includes(only)) : plans0;
  for (const p of plans) {
    const r = await runDuel(browser, server.base, p);
    report.runs.push(r);
    console.log(`${r.name}: ${r.outcome} au tour ${r.turn} · gagnant ${r.winner} · PV ${r.hp.join('/')} · drags ${r.drags} clics ${r.clicks} clavier ${r.keyboard} tactiques ${r.tactics} · console ${r.consoleIssues.length} · fuites ${r.leaks.length} · ${r.ms} ms`);
  }
  report.rejection = await rejectionChecks(browser, server.base);
  console.log('rejets :', JSON.stringify(report.rejection));
} finally {
  await browser.close();
  server.stop();
}
writeFileSync(`${OUT}/qa-browser.json`, JSON.stringify(report, null, 2));
const failed = report.runs.filter((r) => r.outcome !== 'ended' || r.consoleIssues.length || r.leaks.length);
if (failed.length || report.rejection?.consoleIssues?.length) {
  console.error(`ÉCHEC QA : ${failed.map((r) => r.name).join(', ')}`);
  process.exit(1);
}
console.log(`QA navigateur OK (${report.runs.length} duels complets) — rapport ${OUT}/qa-browser.json`);
