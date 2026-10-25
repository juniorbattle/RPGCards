// Pilote de duel PAR L’INTERFACE partagé (QA M03 historique et parcours produit M04+) : un tour joué
// comme un joueur (glisser souris, clic, clavier, glisser tactile), avec audits de vue, de composition,
// de posture et de secrets à chaque décision. Extrait de qa-browser.mjs sans changement de logique.
// T1 (M10-F) : l'engagement, la révision et les choix tactiques suivent l'IA « équilibré » du jeu sur la vue autorisée du
// joueur (`pilote-qa.mjs`), puis sont joués par l'interface ; les gestes (souris, clavier, glisser, tactile) ne changent pas.
import { dragTo, secretAudit, touchDrag, view, waitDecision } from './browser.mjs';
import { aDefausser, aRecentrer, decisionIa } from './pilote-qa.mjs';

export const pres = (page) => page.evaluate(() => window.__lqv.presentation());
const iaPour = async (page, v) => decisionIa(v, await page.evaluate(() => window.__lqv.events()));
const draftOf = (page) => page.evaluate(() => JSON.parse(JSON.stringify(window.__lqv.controller.ui.draft)));

/**
 * Attente SANS sondage (mode `run.lean`, mesures de fluidité, passe 12) : une seule évaluation par
 * attente, résolue dans la page quand le plateau est re-rendu (mutation dans #app : depuis la passe 13,
 * `renderApp` ne remplace plus que les nœuds modifiés, d’où `subtree`) et que la condition est vraie ;
 * filet de sécurité à 1 s.
 * `until` : 'decision' (même condition que waitDecision) ou 'sequenceDone'. Renvoie la vue p1.
 */
export async function waitLean(page, until, timeout = 30000) {
  return page.evaluate(({ until, timeout }) => new Promise((resolve) => {
    const c = window.__lqv.controller;
    const test = () => {
      const v = c.view;
      if (until === 'sequenceDone') return !c.sequencing;
      return v.phase === 'ENDED' || v.phase === 'RESOLVED' || v.awaitingMe || (v.phase === 'REPEL' && !!v.repel?.mine);
    };
    const app = document.getElementById('app');
    let mo = null;
    let iv = 0;
    let to = 0;
    const done = () => { mo?.disconnect(); clearInterval(iv); clearTimeout(to); resolve({ ...c.view, clashScripted: !!c.seq?.script }); };
    if (test()) { done(); return; }
    mo = new MutationObserver(() => { if (test()) done(); });
    mo.observe(app, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    iv = setInterval(() => { if (test()) done(); }, 1000);
    to = setTimeout(done, timeout);
  }), { until, timeout });
}

export async function sample(page, stats) {
  const p = await pres(page);
  if (p.rival?.mood) stats.moods.add(p.rival.mood);
  return p;
}

/** Vue attendue quand aucune bascule manuelle n’est active : toujours la vue frontale (ADR 016,
 *  qui remplace la bascule vers B pendant la pose de M02 §2). */
export function expectedView(_v) {
  return 'A';
}

export async function checkView(page, v, stats) {
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
export async function layoutAudit(page) {
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
export async function stanceAudit(page) {
  return page.evaluate(() => {
    const v = window.__lqv.view();
    const issues = [];
    // Avenant 08 : la Signature annoncée du rival porte la seule pastille neutre « Mode : ? » (aucun mode, aucune classe).
    const neutral = (el) => el.matches('.secret-stance') && !!v.reveal.signatures?.opp && !el.matches('.assault, .guard') && el.textContent.trim() === 'Mode : ?';
    const oppBanners = [...document.querySelectorAll('.side.opp .stance-banner, .side.opp .secret-stance')].filter((el) => !neutral(el));
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

/**
 * Retard de minuterie toléré au-delà du délai de retrait programmé par la scène (page chargée, rendu
 * SwiftShader). Une scène bloquée ne part jamais : elle est détectée quelle que soit cette marge.
 */
export const STAGE_SLACK_MS = 400;

/**
 * Scène du Clash hors résolution (4b, arbitrage du responsable du 2026-10-18 : vérification tolérante, la
 * chorégraphie ne change pas). Seul le fondu de défausse est toléré : nettoyage commencé (`stageLeaving`,
 * délai de retrait réel lu dans la page) et retrait effectif avant ce délai + `STAGE_SLACK_MS` ; la QA attend
 * la fin de CE fondu. Tout le reste est un fantôme : plusieurs scènes, scène hors fondu (`residual` : pleine,
 * nettoyage jamais commencé) ou encore présente après son délai (`stuck` : bloquée).
 */
export async function stageAudit(page) {
  return page.evaluate(async (slack) => {
    const count = () => document.querySelectorAll('#stage .clash-stage').length;
    const n = count();
    if (!n) return { verdict: 'none' };
    const lv = window.__lqv.presentation().stageLeaving ?? null;
    if (n !== 1 || !lv) return { verdict: 'residual', n };
    const t0 = performance.now();
    const deadline = t0 + lv.ms + slack - lv.elapsed;
    while (count() && performance.now() < deadline) await new Promise((r) => setTimeout(r, 16));
    const waited = Math.round(performance.now() - t0);
    const elapsed = Math.round(lv.elapsed);
    if (count()) return { verdict: 'stuck', ms: lv.ms, elapsed: elapsed + waited };
    return { verdict: 'faded', ms: lv.ms, elapsed, waited };
  }, STAGE_SLACK_MS);
}

/**
 * `run.lean` (mesures de fluidité, passe 12) : mêmes décisions et mêmes clics, mais ni sondage de la
 * vue (attente `waitLean`), ni audits (vue, composition, posture, secrets, bascule V, clic perdu) :
 * le fil principal de la page ne porte que le jeu et les entrées. Absent : comportement QA historique.
 */
export async function playTurn(page, run, stats) {
  const { mode } = run;
  const lean = !!run.lean;
  // compteurs du pilote T1, absents des statistiques créées par d’autres outils (qa-browser)
  stats.signatures ??= 0; stats.stances ??= { assault: 0, guard: 0 }; stats.plans ??= {}; stats.revisions ??= 0; stats.revised ??= 0;
  for (let guard = 0; guard < (run.maxDecisions ?? 24); guard++) {
    const v = lean ? await waitLean(page, 'decision', 8000) : await waitDecision(page);
    if (process.env.QA_TRACE) console.log(`  [${run.name}] tour ${v.turn} ${v.phase} awaiting=${v.awaitingMe}`);
    if (v.phase === 'ENDED') return 'ended';
    if (!lean) await checkView(page, v, stats);
    if (!lean && v.phase !== 'RESOLVED' && v.phase !== 'REPEL') {
      // Aucune scène de Clash fantôme hors résolution (nettoyage après passage/saut/nouveau tour) ; seul le
      // fondu de défausse en cours est toléré, borné par sa durée réelle (`stageAudit`, 4b).
      const st = await stageAudit(page);
      if (st.verdict === 'faded') stats.stageFades.push(`tour ${v.turn} ${v.phase} : fondu de défausse à ${st.elapsed}/${st.ms} ms, scène retirée ${st.waited} ms plus tard`);
      else if (st.verdict === 'stuck') stats.stageGhosts.push(`tour ${v.turn} ${v.phase} : scène de Clash bloquée, encore là ${st.elapsed} ms après le début de son fondu (retrait prévu à ${st.ms} ms)`);
      else if (st.verdict === 'residual') stats.stageGhosts.push(`tour ${v.turn} ${v.phase} : ${st.n} scène(s) de Clash résiduelle(s) hors fondu de défausse`);
    }
    if (!lean && (v.phase === 'COMMIT' || v.phase === 'TACTICS') && v.awaitingMe && !stats.layoutChecked.includes(v.phase)) {
      stats.layoutChecked.push(v.phase);
      stats.layoutIssues.push(...(await layoutAudit(page)).map((x) => `${v.phase} : ${x}`));
    }
    if (!lean && (v.phase === 'TACTICS' || v.phase === 'COMMIT' || v.phase === 'LECTURE')) {
      stats.stanceChecks++;
      stats.stanceIssues.push(...(await stanceAudit(page)).map((x) => `tour ${v.turn} ${v.phase} : ${x}`));
    }
    if (v.phase === 'RESOLVED' && lean) {
      // Même rythme que le mode historique (séquence entière, 1,2 s de lecture), sans sondage.
      if (run.watchSequence) {
        if (v.clashScripted) stats.stagesSeen++;
        await waitLean(page, 'sequenceDone', 30000);
        stats.sequencesWatched++;
        await page.waitForTimeout(1200);
      }
      await page.click('[data-key="act-next"]');
      stats.turns++;
      return 'next';
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
      // Les cartes les plus faibles partent (défausse, Recentrage) : la Signature reste en main.
      const trim = aDefausser(v);
      for (const id of trim) await page.click(`[data-key="hand-${id}"]`);
      const sond = page.locator('[data-key="tech-me-Sondage"]:not([disabled])');
      const rec = page.locator('[data-key="tech-me-Recentrage"]:not([disabled])');
      if (!trim.length && await sond.count()) { await sond.click(); stats.tech.Sondage = (stats.tech.Sondage ?? 0) + 1; }
      else if (!trim.length && await rec.count()) {
        await rec.click();
        await page.click(`[data-key="hand-${aRecentrer(v)}"]`);
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
      const ia = await iaPour(page, v);
      const prim = { cardId: ia.primaryId };
      const sec = ia.secondaryId ? { cardId: ia.secondaryId } : null;
      const freeSlot = ia.replaceSlot ?? v.me.slots.findIndex((s) => s === null);
      stats.signatures += v.me.hand.some((c) => c.cardId === ia.primaryId && c.defId.startsWith('sig-')) ? 1 : 0;
      if (mode === 'drag') { await dragTo(page, `[data-key="hand-${prim.cardId}"]`, '[data-drop="primary"]'); stats.drags++; }
      else if (mode === 'touch') { await touchDrag(page, `[data-key="hand-${prim.cardId}"]`, '[data-drop="primary"]'); stats.drags++; }
      else if (mode === 'keyboard') {
        await page.focus(`[data-key="hand-${prim.cardId}"]`);
        await page.keyboard.press('Enter');
        await page.focus('[data-key="zone-primary"]');
        await page.keyboard.press('Enter');
        stats.keyboard++;
      } else { await page.click(`[data-key="hand-${prim.cardId}"]`); await page.click('[data-drop="primary"]'); stats.clicks++; }
      const stance = ia.stance;
      stats.stances[stance]++;
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
      const after = lean ? null : await view(page);
      if (after && after.phase === 'COMMIT' && after.turn === turnBefore && after.awaitingMe) stats.lostClicks.push(`tour ${v.turn} : verrouillage d’engagement non pris en compte`);
    } else if (v.phase === 'REVISION') {
      // Avenant 08, amendement 1 : le rival a verrouillé sa Signature après moi ; garder, ou réviser une fois (brouillon
      // prérempli avec l’engagement verrouillé : un clic sur une case du brouillon rend sa carte à la main, puis le nouvel
      // engagement est posé).
      const ia = await iaPour(page, v);
      stats.revisions++;
      if (!ia.commit) await page.click('[data-key="act-revision-keep"]');
      else {
        const c = ia.commit;
        const dr = await draftOf(page);
        if (dr.secondaryId) await page.click(`[data-drop="slot${dr.slot}"]`);
        if (dr.primaryId) await page.click('[data-drop="primary"]');
        await page.click(`[data-key="hand-${c.primaryId}"]`);
        await page.click('[data-drop="primary"]');
        await page.click(`[data-key="stance-${c.stance}"]`);
        const slot = c.replaceSlot ?? c.slot ?? v.me.slots.findIndex((s) => s === null);
        if (c.secondaryId && slot >= 0) { await page.click(`[data-key="hand-${c.secondaryId}"]`); await page.click(`[data-drop="slot${slot}"]`); }
        await page.click('[data-key="act-revision"]');
        stats.revised++;
      }
    } else if (v.phase === 'LECTURE') {
      if (run.useLecture) { await page.click('[data-key="act-lecture"]'); stats.tech.Lecture = (stats.tech.Lecture ?? 0) + 1; }
      else await page.click('[data-key="act-lecture-pass"]');
    } else if (v.phase === 'LECTURE_CHANGE') {
      const seen = v.lectureSeen;
      if (seen === 'guard') await page.click('[data-key="stance-assault"]');
      await page.click('[data-key="act-lecture-stance"]');
    } else if (v.phase === 'TACTICS') {
      if (!lean) stats.leaks.push(...(await secretAudit(page)));
      // Bascule manuelle vers B puis retour A (touche V) sans perdre la décision en cours.
      if (!lean && !stats.manualToggleChecked) {
        await page.keyboard.press('v');
        const pB = await pres(page);
        await page.keyboard.press('v');
        const pA = await pres(page);
        stats.manualToggleChecked = pB.view === 'B' && pA.view === 'A' ? 'ok' : `échec (${pB.view}/${pA.view})`;
      }
      // Choix de l’IA du joueur, joués par le menu de chaque Secondaire active (Conserver : rien à cliquer).
      const ia = await iaPour(page, v);
      for (const s of v.me.slots) {
        const plan = s && ia.plans[s.slot];
        if (!plan || plan.mode === 'keep') continue;
        await page.click(`[data-key="zone-me-${s.slot}"]`);
        await page.click(`[data-key="menu-${s.slot}-${plan.mode}"]`);
        if (plan.mode === 'interfere') await page.click(`[data-key="zone-opp-${plan.target}"]`);
        stats.tactics++;
        stats.plans[plan.mode] = (stats.plans[plan.mode] ?? 0) + 1;
      }
      const tech = ia.technique;
      if (tech?.id === 'Ancrage') {
        await page.click('[data-key="tech-me-Ancrage"]');
        await page.click(`[data-key="zone-me-${tech.slot}"]`);
        stats.tech.Ancrage = (stats.tech.Ancrage ?? 0) + 1;
      } else if (tech?.id === 'Rupture') {
        await page.click('[data-key="tech-me-Rupture"]');
        await page.click(`[data-key="zone-opp-${tech.targetSlot}"]`);
        stats.tech.Rupture = (stats.tech.Rupture ?? 0) + 1;
      }
      await page.click('[data-key="act-tactics"]');
    } else if (v.phase === 'REPEL' && v.repel?.mine) {
      await page.click(`[data-key="zone-opp-${v.repel.choices[0]}"]`);
      stats.repels++;
    }
    if (!lean) stats.leaks.push(...(await secretAudit(page)));
  }
  return 'stuck';
}


/** Statistiques vierges d’un duel piloté (même forme que qa-browser). */
export function newStats() {
  return { turns: 0, drags: 0, clicks: 0, keyboard: 0, tactics: 0, repels: 0, leaks: [], viewChecks: 0, viewErrors: [], lostClicks: [], tech: {}, moods: new Set(), sequencesWatched: 0, sequencesSkipped: 0, manualToggleChecked: null, holds: 0, layoutChecked: [], layoutIssues: [], stanceChecks: 0, stanceIssues: [], stageGhosts: [], stageFades: [], stagesSeen: 0, rotations: [], signatures: 0, stances: { assault: 0, guard: 0 }, plans: {}, revisions: 0, revised: 0 };
}
