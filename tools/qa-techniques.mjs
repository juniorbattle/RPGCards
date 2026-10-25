// QA M03.1B — Techniques Rupture / Dissipation et effet d’une Secondaire camouflée, joués PAR LES
// VRAIS CONTRÔLES de l’interface (clic souris 1280×720, toucher tactile 390×844) dans les scénarios
// déterministes `?scenario=rupture | rupture-cachee | dissipation | masque` (rival scripté, mode démo).
// Assertions : résultat, coût et Insight, cibles légales / refusées, zones, journal (sans doublon),
// informations cachées (DOM, scène du Clash, export public), console. Sortie : artifacts/qa/qa-techniques.json
// + captures $TECH_OUT (défaut screenshots/qa/m03-1b/ ; une passe ultérieure garde ses preuves à part).
import { mkdirSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { launch, startPreview, view, waitDecision, watchConsole } from './browser.mjs';

const OUT = process.env.TECH_OUT ?? 'screenshots/qa/m03-1b';
mkdirSync(OUT, { recursive: true });
mkdirSync('artifacts/qa', { recursive: true });
const commit = execSync('git rev-parse --short HEAD').toString().trim();
const ONLY = process.env.QA_ONLY ?? '';

const MODES = [
  { name: 'souris-1280', viewport: { width: 1280, height: 720 }, touch: false },
  { name: 'tactile-390', viewport: { width: 390, height: 844 }, touch: true },
];

const lqv = (page, fn, arg) => page.evaluate(fn, arg);
const state = (page) => lqv(page, () => window.__lqv.state());
const events = (page) => lqv(page, () => window.__lqv.events());

async function act(page, sel, touch) {
  await page.locator(sel).first().waitFor({ state: 'visible', timeout: 5000 });
  if (touch) await page.tap(sel);
  else await page.click(sel);
  await page.waitForTimeout(80);
}

/** Chaînes interdites présentes dans le DOM du jeu (texte, attributs) ou dans la scène du Clash. */
async function domLeaks(page, patterns) {
  return lqv(page, (pats) => {
    const html = (document.getElementById('app')?.innerHTML ?? '') + (document.getElementById('stage')?.innerHTML ?? '');
    return pats.filter((p) => new RegExp(p, 'i').test(html));
  }, patterns);
}

async function journalLines(page) {
  return lqv(page, () => [...document.querySelectorAll('.journal li, .journal .line, .journal p')].map((x) => x.textContent?.trim() ?? '').filter(Boolean));
}

async function toastText(page) {
  return lqv(page, () => document.querySelector('.toast')?.textContent ?? '');
}

async function untilPhase(page, pred, timeout = 15000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const v = await view(page);
    if (pred(v)) return v;
    await page.waitForTimeout(80);
  }
  return view(page);
}

async function commitPrimary(page, prefix, stance, touch) {
  const v = await waitDecision(page);
  const card = v.me.hand.find((x) => x.defId.startsWith(prefix));
  if (!card) throw new Error(`carte ${prefix} absente de la main`);
  await act(page, `[data-key="hand-${card.cardId}"]`, touch);
  await act(page, '[data-drop="primary"]', touch);
  await act(page, `[data-key="stance-${stance}"]`, touch);
  await act(page, '[data-key="act-commit"]', touch);
}

/** Laisse jouer la séquence de résolution (normal) ou la passe (« Passer »). */
async function finishSequence(page, touch, skip) {
  if (skip && await page.locator('[data-key="act-skip"]').count()) await act(page, '[data-key="act-skip"]', touch);
  await page.waitForFunction(() => !window.__lqv.presentation().sequencing, null, { timeout: 30000 });
}

function check(list, cond, msg) {
  if (!cond) list.push(msg);
}

const CASES = {
  async rupture(page, m, r) {
    await commitPrimary(page, 'Ronce-4', 'guard', m.touch);
    let v = await untilPhase(page, (x) => x.phase === 'TACTICS' && x.awaitingMe);
    const s0 = await state(page);
    check(r.issues, !!s0.pending.p2, 'le rival n’a pas verrouillé avant le joueur');
    check(r.issues, (await lqv(page, () => window.__lqv.rivalView().opp.techniqueUsed)) === null, 'Technique du joueur visible du rival avant révélation');
    check(r.issues, v.me.insight === 2, `Insight avant Rupture ${v.me.insight} (attendu 2)`);
    await act(page, '[data-key="tech-me-Rupture"]', m.touch);
    check(r.issues, await page.locator('[data-key="zone-opp-0"].targetable').count() === 1, 'cible Rupture (Astre III active) non proposée');
    await act(page, '[data-key="zone-opp-0"]', m.touch);
    const tech = await lqv(page, () => window.__lqv.controller.ui.tacticsTech);
    check(r.issues, tech?.id === 'Rupture' && tech.targetSlot === 0, `Rupture non armée sur la case 1 (${JSON.stringify(tech)})`);
    await page.screenshot({ path: `${OUT}/rupture-${m.name}-1-ciblage.png` });
    await act(page, '[data-key="act-tactics"]', m.touch);
    v = await untilPhase(page, (x) => x.phase === 'REPEL' && x.repel?.mine);
    check(r.issues, JSON.stringify(v.repel) === JSON.stringify({ mine: true, kind: 'rupture', choices: [0] }), `fenêtre de Repoussement ${JSON.stringify(v.repel)}`);
    await finishSequence(page, m.touch, m.touch);
    await page.screenshot({ path: `${OUT}/rupture-${m.name}-2-repoussement.png` });
    await act(page, '[data-key="zone-opp-0"]', m.touch);
    v = await untilPhase(page, (x) => x.phase === 'RESOLVED');
    const evs = (await events(page)).filter((e) => e.vis === 'public' && e.turn === 5);
    check(r.issues, v.me.insight === 1, `Insight final ${v.me.insight} (attendu 2 − 2 + 1 = 1)`);
    check(r.issues, evs.filter((e) => e.kind === 'technique').map((e) => `${e.data.technique}:${e.data.cost}`).join() === 'Rupture:2', 'coût de Rupture non publié / incorrect');
    const repels = evs.filter((e) => e.kind === 'repel');
    check(r.issues, repels.length === 1 && repels[0].data.kind === 'rupture' && repels[0].data.defId === 'Astre-3-basic' && repels[0].data.dest === 'hand', `Repoussement ${JSON.stringify(repels.map((e) => e.data))}`);
    check(r.issues, evs.some((e) => e.kind === 'effect' && e.data.effect === 'rupture' && e.data.status === 'success'), 'Rupture non RÉUSSIE');
    check(r.issues, v.opp.slots[0] === null && v.opp.handCount === 4, `zones rival : case 1 ${JSON.stringify(v.opp.slots[0])}, main ${v.opp.handCount}`);
    r.expectLines = ['Vous utilisez la Technique Rupture (−2 Insight).', 'Rupture : Vous renvoyez Astre III (case 1) dans la main de son propriétaire.', 'Rupture (vous) : RÉUSSI — Secondaire active renvoyée en main adverse.'];
  },

  async 'rupture-cachee'(page, m, r) {
    await commitPrimary(page, 'Ronce-4', 'guard', m.touch);
    await untilPhase(page, (x) => x.phase === 'TACTICS' && x.awaitingMe);
    await act(page, '[data-key="tech-me-Rupture"]', m.touch);
    await act(page, '[data-key="zone-opp-0"]', m.touch);
    await act(page, '[data-key="act-tactics"]', m.touch);
    let v = await untilPhase(page, (x) => x.phase === 'REPEL' && x.repel?.mine);
    check(r.issues, JSON.stringify(v.repel) === JSON.stringify({ mine: true, kind: 'basic', choices: [1] }), `fenêtre de Repoussement ${JSON.stringify(v.repel)}`);
    await finishSequence(page, m.touch, true);
    // Cible refusée : la Secondaire ACTIVE (seules les cachées sont admissibles au Repoussement Basic).
    await act(page, '[data-key="zone-opp-0"]', m.touch);
    check(r.issues, /non admissible/.test(await toastText(page)), 'refus de la cible active non signalé');
    check(r.issues, (await view(page)).phase === 'REPEL', 'cible illégale acceptée');
    await page.screenshot({ path: `${OUT}/rupture-cachee-${m.name}-1-cible-refusee.png` });
    await act(page, '[data-key="zone-opp-1"]', m.touch);
    v = await untilPhase(page, (x) => x.phase === 'RESOLVED');
    const evs = (await events(page)).filter((e) => e.vis === 'public' && e.turn === 5);
    const repels = evs.filter((e) => e.kind === 'repel');
    check(r.issues, repels.length === 1 && repels[0].data.kind === 'basic' && repels[0].data.slot === 1 && repels[0].data.defId === null, `Repoussement ${JSON.stringify(repels.map((e) => e.data))}`);
    check(r.issues, evs.some((e) => e.kind === 'effect' && e.data.effect === 'rupture' && e.data.status === 'failed'), 'échec de Rupture non publié');
    check(r.issues, v.me.insight === 1, `Insight final ${v.me.insight} (coût non remboursé, attendu 1)`);
    check(r.issues, v.opp.slots[0]?.state === 'active' && v.opp.slots[1] === null, 'zones rival après Repoussement Basic');
    r.forbidden = ['Voile-4', 'Voile IV', 'Silence'];
    r.expectLines = ['Vous utilisez la Technique Rupture (−2 Insight).', 'Rupture (vous) : CONDITION NON REMPLIE — une autre cible de Repoussement existe ou la cible n’est plus active.', 'Repoussement : Vous renvoyez une Secondaire cachée (case 2) dans la main de son propriétaire.'];
  },

  async dissipation(page, m, r) {
    let v = await untilPhase(page, (x) => x.phase === 'DISSIPATION' && x.awaitingMe);
    const forbidden = ['Voile-1', 'Voile I(?![IV])', 'Éclaireur', 'eclaireur'];
    check(r.issues, v.opp.slots[1]?.masked === true && v.opp.slots[1]?.card === null && v.opp.slots[1]?.family === 'Voile', `case 2 du rival non masquée : ${JSON.stringify(v.opp.slots[1])}`);
    const before = await domLeaks(page, forbidden);
    check(r.issues, before.length === 0, `identité camouflée dans le DOM avant Dissipation : ${before}`);
    const peek = (await events(page)).find((e) => e.kind === 'peek' && e.vis === 'p2');
    const mem0 = await lqv(page, () => window.__lqv.rivalMemory().knownOppHand);
    check(r.issues, peek?.data.source === 'Éclaireur' && mem0.length === 1, `observation du rival ${JSON.stringify(peek?.data)} / mémoire ${mem0}`);
    await page.screenshot({ path: `${OUT}/dissipation-${m.name}-1-masquee.png` });
    // Cible refusée : la carte masquée elle-même (seule la source du camouflage est visable).
    await act(page, '[data-key="zone-opp-1"]', m.touch).catch(() => {});
    check(r.issues, (await lqv(page, () => window.__lqv.controller.ui.dissipTarget)) === null, 'cible de Dissipation illégale acceptée');
    await act(page, '[data-key="zone-opp-0"]', m.touch);
    check(r.issues, (await lqv(page, () => window.__lqv.controller.ui.dissipTarget)) === 0, 'Dissimulation non visée');
    await act(page, '[data-key="act-dissip"]', m.touch);
    v = await untilPhase(page, (x) => x.phase === 'COMMIT' && x.awaitingMe);
    check(r.issues, v.me.insight === 0, `Insight après Dissipation ${v.me.insight} (attendu 0)`);
    check(r.issues, v.opp.slots[1]?.card?.defId === 'Voile-1-eclaireur' && !v.opp.slots[1]?.masked, `carte non restaurée : ${JSON.stringify(v.opp.slots[1])}`);
    check(r.issues, await page.locator('.side.opp [data-def="Voile-1-eclaireur"]').count() >= 1, 'carte restaurée absente du plateau');
    const mem1 = await lqv(page, () => window.__lqv.rivalMemory().knownOppHand);
    check(r.issues, JSON.stringify(mem1) === JSON.stringify(mem0), `connaissance du rival modifiée par Dissipation : ${mem0} → ${mem1}`);
    await page.screenshot({ path: `${OUT}/dissipation-${m.name}-2-levee.png` });
    await commitPrimary(page, 'Cendre-4', 'assault', m.touch);
    v = await untilPhase(page, (x) => x.phase === 'RESOLVED');
    await finishSequence(page, m.touch, m.touch);
    r.expectLines = ['Le rival révèle une Secondaire Voile en case 2 — identité, Rang et Puissance masqués par un effet.', 'Vous utilisez la Technique Dissipation (−1 Insight).', 'Dissipation neutralise le camouflage : Voile I — Éclaireur (case 2) redevient visible ; ce qui a déjà été observé reste acquis.'];
    r.privateRival = /\[Privé\] Éclaireur/;
  },

  async masque(page, m, r) {
    const forbidden = ['Cendre-3', 'Cendre III(?![IV])', 'Ferveur', 'p2#02'];
    let v = await untilPhase(page, (x) => x.phase === 'COMMIT' && x.awaitingMe);
    check(r.issues, v.opp.slots[1]?.masked === true, 'Secondaire du rival non masquée');
    await commitPrimary(page, 'Ronce-2', 'guard', m.touch);
    // Séquence inspectée TEMPS PAR TEMPS (pause + avance par le crochet QA) : déterministe sous
    // SwiftShader, où une capture d’écran dure plus qu’un temps de la séquence.
    await page.waitForFunction(() => window.__lqv.presentation().sequencing, null, { timeout: 15000 });
    await lqv(page, () => window.__lqv.pauseSequence());
    const seen = new Set();
    for (let i = 0; i < 24; i++) {
      const p = await lqv(page, () => window.__lqv.presentation());
      if (!p.sequencing) break;
      if (p.beat) seen.add(p.beat);
      // Après le temps « destinations », la défausse du HUD est celle de fin de tour (ARB-005) : seule
      // son infobulle peut alors nommer la carte ; avant, rien ne la nomme.
      const late = ['destination', 'repel', 'overtime', 'victory'].includes(p.beat);
      const leaks = await lqv(page, ({ pats, late }) => {
        const app = document.getElementById('app').cloneNode(true);
        if (late) app.querySelectorAll('[data-discard-list]').forEach((x) => x.removeAttribute('title'));
        const html = app.innerHTML + (document.getElementById('stage')?.innerHTML ?? '');
        return pats.filter((x) => new RegExp(x, 'i').test(html));
      }, { pats: forbidden, late });
      check(r.issues, leaks.length === 0, `temps ${p.beat} : ${leaks}`);
      if (p.beat === 'insight' || p.beat === 'effect') await page.screenshot({ path: `${OUT}/masque-${m.name}-${p.beat}.png` });
      await lqv(page, () => { window.__lqv.controller.advanceBeat(); window.__lqv.pauseSequence(); });
      await page.waitForTimeout(120);
    }
    r.beats = [...seen];
    check(r.issues, seen.has('effect') && seen.has('insight'), `temps effet / Insight non montrés : ${[...seen]}`);
    v = await view(page);
    check(r.issues, v.me.hp === 90 - (12 - 3) * 4 && v.opp.insight === 2, // avenant 07 : la Garde II absorbe 3
      `résultat : PV ${v.me.hp}, Insight rival ${v.opp.insight}`);
    // Fin du tour : seule la défausse publique (infobulle du HUD) peut désormais nommer la carte (ARB-005).
    const leaksEnd = await lqv(page, (pats) => {
      const app = document.getElementById('app').cloneNode(true);
      app.querySelectorAll('[data-discard-list]').forEach((x) => x.removeAttribute('title'));
      return pats.filter((p) => new RegExp(p, 'i').test(app.innerHTML));
    }, forbidden);
    check(r.issues, leaksEnd.length === 0, `fin du tour : ${leaksEnd}`);
    r.forbiddenEvents = forbidden;
    r.expectLines = ['Le rival gagne 1 Insight (effet de la Secondaire Cendre masquée (case 2)) → 2/2.', 'Effet de la Secondaire Cendre masquée du rival (case 2) : RÉUSSI — +1 Insight.'];
  },
};

const server = await startPreview(4195);
const browser = await launch();
const report = { commit, date: new Date().toISOString(), note: 'Chromium headless, WebGL logiciel SwiftShader ; rival SCRIPTÉ (scénarios de démonstration), jamais présenté comme l’IA.', runs: [] };
let failed = 0;
try {
  for (const [id, run] of Object.entries(CASES)) {
    if (ONLY && !ONLY.split(',').includes(id)) continue;
    for (const m of MODES) {
      const ctx = await browser.newContext({ viewport: m.viewport, deviceScaleFactor: 1, hasTouch: m.touch, isMobile: m.touch });
      const page = await ctx.newPage();
      const consoleIssues = [];
      watchConsole(page, consoleIssues);
      const r = { scenario: id, mode: m.name, issues: [] };
      const t0 = Date.now();
      try {
        await page.goto(`${server.base}/?scenario=${id}&qa=1&aiDelay=0`);
        await page.waitForFunction(() => !!window.__lqv);
        await run(page, m, r);
        // Journal (DOM) : lignes attendues présentes, aucune ligne dupliquée consécutive, aucune ligne privée du rival.
        const lines = await journalLines(page);
        for (const l of r.expectLines ?? []) check(r.issues, lines.some((x) => x.includes(l)), `journal : ligne absente « ${l} »`);
        for (let i = 1; i < lines.length; i++) check(r.issues, lines[i] !== lines[i - 1] || /^— TOUR/.test(lines[i]), `journal : doublon « ${lines[i]} »`);
        if (r.privateRival) check(r.issues, !lines.some((x) => r.privateRival.test(x)), 'journal : information privée du rival');
        if (r.forbidden) {
          const leaks = await domLeaks(page, r.forbidden);
          check(r.issues, leaks.length === 0, `DOM : ${leaks}`);
        }
        // Export public (événements publics, JSON) : aucune identité camouflée avant la fin du tour.
        if (r.forbiddenEvents) {
          const pub = JSON.stringify((await events(page)).filter((e) => e.vis === 'public'));
          for (const p of r.forbiddenEvents) check(r.issues, !new RegExp(p, 'i').test(pub), `export public : ${p}`);
        }
        await act(page, '[data-key="tool-journal"]', m.touch);
        await page.waitForTimeout(250);
        await page.screenshot({ path: `${OUT}/${id}-${m.name}-journal.png` });
        r.journal = lines.slice(-14);
      } catch (e) {
        r.issues.push(`exception : ${e.message}`);
        await page.screenshot({ path: `${OUT}/${id}-${m.name}-ECHEC.png` }).catch(() => {});
      }
      r.console = consoleIssues;
      for (const c of consoleIssues) r.issues.push(`console : ${c}`);
      r.ms = Date.now() - t0;
      if (r.issues.length) failed++;
      report.runs.push(r);
      console.log(`${r.issues.length ? '✗' : '✓'} ${id} · ${m.name} · ${r.ms} ms${r.issues.length ? `\n    ${r.issues.join('\n    ')}` : ''}`);
      await ctx.close();
    }
  }
} finally {
  await browser.close();
  server.stop();
}
writeFileSync('artifacts/qa/qa-techniques.json', JSON.stringify(report, null, 2));
console.log(`${report.runs.length - failed}/${report.runs.length} parcours sans problème`);
process.exit(failed ? 1 : 0);
