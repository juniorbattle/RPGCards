// HISTORIQUE (M02) : dépend du gabarit M02 (`.stage-window`), remplacé en M03 par tools/shots-m03.mjs.
// Captures M02 déterministes (freeze=1 : arène figée, réactions figées sur le dernier fait public).
// Sortie : screenshots/qa/m02/*.png + manifest.json (seed, scénario, viewport, vue, humeur du rival).
import { mkdirSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dragTo, launch, startPreview, view, waitDecision, watchConsole } from './browser.mjs';

const OUT = 'screenshots/qa/m02';
mkdirSync(OUT, { recursive: true });
const commit = execSync('git rev-parse --short HEAD').toString().trim();
const manifest = { commit, date: new Date().toISOString(), note: 'Chromium headless + WebGL logiciel SwiftShader ; freeze=1 (arène et réactions figées).', shots: [] };
const server = await startPreview(4181);
const browser = await launch();
const issues = [];
const Q = 'qa=1&aiDelay=0&freeze=1';

async function open(url, viewport = { width: 1280, height: 720 }, extra = {}) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, ...extra });
  const page = await ctx.newPage();
  page.setDefaultTimeout(10000);
  watchConsole(page, issues);
  await page.goto(`${server.base}/${url}`);
  await page.waitForTimeout(500);
  return { ctx, page };
}

async function shot(page, id, desc, opts = {}) {
  await page.waitForTimeout(200);
  const path = `${OUT}/${id}.png`;
  await page.screenshot({ path, clip: opts.clip });
  const p = await page.evaluate(() => (window.__lqv?.presentation ? window.__lqv.presentation() : null)).catch(() => null);
  const v = await page.evaluate(() => (window.__lqv ? window.__lqv.view() : null)).catch(() => null);
  manifest.shots.push({ id, path, desc, url: page.url().replace(server.base, ''), viewport: page.viewportSize(), turn: v?.turn ?? null, phase: v?.phase ?? null, view: p?.view ?? null, rival: p?.rival ? `${p.personality}:${p.rival.mood} (${p.rival.cause})` : null });
  console.log(`✓ ${id} — ${desc}${p ? ` [vue ${p.view}${p.rival ? `, ${p.rival.mood}` : ''}]` : ''}`);
}

const pick = async (page, prefix) => (await view(page)).me.hand.find((c) => c.defId.startsWith(prefix));

async function t2(beat) {
  const { ctx, page } = await open(`?scenario=t2&${Q}${beat !== null ? `&beat=${beat}` : ''}`);
  await page.click('[data-key="zone-me-0"]');
  await page.click('[data-key="act-prepare"]');
  await waitDecision(page);
  const c3 = await pick(page, 'Cendre-3-basic');
  await page.click(`[data-key="hand-${c3.cardId}"]`);
  await page.click('[data-drop="primary"]');
  await page.click('[data-key="stance-assault"]');
  await page.click('[data-key="act-commit"]');
  await waitDecision(page);
  await page.click('[data-key="zone-me-0"]');
  await page.click('[data-key="menu-0-rank"]');
  return { ctx, page };
}

try {
  // 1. Entrée du duel : vue A, rival observé (temps d’observation de début de tour).
  {
    const { ctx, page } = await open(`?seed=101&autostart=1&${Q}&intro=1`);
    await shot(page, '01-frontale-entree-duel-1280', 'Entrée du duel : vue A confrontation, visage et buste du rival, plateau lisible');
    await ctx.close();
  }
  // 2. Préparation / engagement : vue B, portrait vivant, carte posée par glisser.
  {
    const { ctx, page } = await open(`?seed=101&autostart=1&${Q}`);
    const v = await waitDecision(page);
    const c = v.me.hand.find((x) => !x.defId.startsWith('sig-'));
    await dragTo(page, `[data-key="hand-${c.cardId}"]`, '[data-drop="primary"]');
    await page.click('[data-key="stance-assault"]');
    await shot(page, '02-inclinee-engagement-1280', 'Vue B manipulation : Primaire posée par glisser, ASSAUT/GARDE, portrait vivant du rival');
    await page.click('[data-key="act-commit"]');
    await waitDecision(page);
    await shot(page, '03-frontale-apres-verrouillage-1280', 'Engagement verrouillé : retour en vue A, le rival réagit (fait public : verrouillage)');
    await ctx.close();
  }
  // 3. Tactique en vue A (scénario Interférence, rival scripté de démonstration).
  {
    const { ctx, page } = await open(`?scenario=interference&${Q}`);
    const c = await pick(page, 'Cendre-4');
    await page.click(`[data-key="hand-${c.cardId}"]`);
    await page.click('[data-drop="primary"]');
    await page.click('[data-key="stance-assault"]');
    await page.click('[data-key="act-commit"]');
    await waitDecision(page);
    await shot(page, '04-frontale-primaires-revelees', 'Révélation simultanée des Primaires en vue A : réaction du rival');
    await page.click('[data-key="zone-me-0"]');
    await shot(page, '05-frontale-tactique-menu', 'Choix tactique en vue A : menu contextuel, rival observable, prévision provisoire');
    await page.click('[data-key="menu-0-damage"]');
    await page.click('[data-key="zone-me-1"]');
    await page.click('[data-key="menu-1-interfere"]');
    await shot(page, '06-frontale-ciblage-interference', 'Ciblage d’Interférence direct sur le terrain adverse, en vue A');
    await page.keyboard.press('v');
    await shot(page, '07-bascule-manuelle-B-en-tactique', 'Bascule manuelle (V) vers la vue B pendant la tactique : ciblage conservé, portrait du rival');
    await page.keyboard.press('v');
    await ctx.close();
  }
  // 4. Résolution séquencée : Interférences → Rang → issue → dégâts.
  for (const [beat, name, desc] of [[1, '08-resolution-interference', 'Temps « Interférence » : soutien annulé, mise en évidence des cases'], [3, '09-resolution-rang', 'Temps « Rang » : scores et contributions'], [5, '10-resolution-degats', 'Temps « Dégâts » : PV mis en scène, réaction du rival']]) {
    const { ctx, page } = await open(`?scenario=interference&${Q}&beat=${beat}`);
    const c = await pick(page, 'Cendre-4');
    await page.click(`[data-key="hand-${c.cardId}"]`);
    await page.click('[data-drop="primary"]');
    await page.click('[data-key="stance-assault"]');
    await page.click('[data-key="act-commit"]');
    await waitDecision(page);
    await page.click('[data-key="zone-me-0"]');
    await page.click('[data-key="menu-0-damage"]');
    await page.click('[data-key="zone-me-1"]');
    await page.click('[data-key="menu-1-interfere"]');
    await page.click('[data-key="zone-opp-0"]');
    await page.click('[data-key="act-tactics"]');
    await page.waitForTimeout(200);
    await shot(page, name, desc);
    await ctx.close();
  }
  // 5. T2 : Rang 5/4 puis 0 blessure, lisible sans journal.
  for (const [beat, name, desc] of [[1, '11-T2-rang-5-contre-4', 'T2 : Rang 5 (Cendre III 3 + Cendre I +2 affinité) contre 4'], [2, '12-T2-zero-blessure', 'T2 : victoire au Rang mais 0 blessure, la Garde absorbe — réaction du rival']]) {
    const { ctx, page } = await t2(beat);
    await page.click('[data-key="act-tactics"]');
    await page.waitForTimeout(200);
    await shot(page, name, desc);
    await ctx.close();
  }
  // 6. Réactions sur événements publics réels : Signature, double K.-O.
  {
    const { ctx, page } = await open(`?scenario=signature&${Q}&beat=3`);
    const sig = await pick(page, 'sig-');
    await dragTo(page, `[data-key="hand-${sig.cardId}"]`, '[data-drop="primary"]');
    await page.click('[data-key="stance-assault"]');
    await page.click('[data-key="act-commit"]');
    await waitDecision(page);
    await shot(page, '13-reaction-signature-revelee', 'Réaction du rival à une Signature ∞ révélée (fait public)');
    await page.click('[data-key="zone-me-0"]');
    await page.click('[data-key="menu-0-damage"]');
    await page.click('[data-key="zone-me-1"]');
    await page.click('[data-key="menu-1-damage"]');
    await page.click('[data-key="act-tactics"]');
    await page.waitForTimeout(200);
    await shot(page, '14-reaction-degats-subis', 'Signature ∞ : (14 − 12) × 9 = 18 ; le rival encaisse');
    await ctx.close();
  }
  {
    const { ctx, page } = await open(`?scenario=doubleko&${Q}`);
    const c = await pick(page, 'Cendre-4');
    await page.click(`[data-key="hand-${c.cardId}"]`);
    await page.click('[data-drop="primary"]');
    await page.click('[data-key="stance-assault"]');
    await page.click('[data-key="act-commit"]');
    await page.waitForTimeout(300);
    await shot(page, '15-reaction-double-ko', 'Double K.-O. → prolongation 1 PV chacun ; stupéfaction du rival');
    await ctx.close();
  }
  // 7. Trois personnalités (même situation publique) + planche d’humeurs (pose de revue QA).
  for (const r of ['braise', 'ronce', 'voile']) {
    const { ctx, page } = await open(`?seed=101&autostart=1&${Q}&intro=1&rival=${r}`);
    await shot(page, `16-personnalite-${r}`, `Personnalité « ${r} » en vue A (apparence, tempérament, profil IA cohérents)`);
    for (const mood of ['confident', 'surprised', 'pained', 'annoyed', 'triumphant', 'defeated']) {
      const g = await open(`?seed=101&autostart=1&${Q}&intro=1&rival=${r}&pose=${mood}`);
      const rect = await g.page.evaluate(() => { const e = document.querySelector('.stage-window').getBoundingClientRect(); return { x: e.left, y: e.top, width: e.width, height: e.height }; });
      await shot(g.page, `17-planche-${r}-${mood}`, `Planche (pose de revue QA, pas un état de jeu) : ${r} / ${mood}`, { clip: { x: Math.round(rect.x + rect.width * 0.2), y: Math.round(rect.y), width: Math.round(rect.width * 0.6), height: Math.round(rect.height) } });
      await g.ctx.close();
    }
    await ctx.close();
  }
  // 8. 1920×1080, mobile 390×844 (A et B), mouvement réduit.
  {
    const a = await open(`?seed=202&autostart=1&${Q}&intro=1`, { width: 1920, height: 1080 });
    await shot(a.page, '18-frontale-1920', 'Vue A en 1920×1080');
    await a.ctx.close();
    const b = await open(`?seed=202&autostart=1&${Q}`, { width: 1920, height: 1080 });
    await shot(b.page, '19-inclinee-1920', 'Vue B en 1920×1080');
    await b.ctx.close();
    const m = await open(`?seed=404&autostart=1&${Q}&intro=1`, { width: 390, height: 844 }, { isMobile: true, hasTouch: true });
    await shot(m.page, '20-mobile-frontale', 'Mobile 390×844 : vue A');
    await m.ctx.close();
    const mb = await open(`?seed=404&autostart=1&${Q}`, { width: 390, height: 844 }, { isMobile: true, hasTouch: true });
    const v = await waitDecision(mb.page);
    const c = v.me.hand.find((x) => !x.defId.startsWith('sig-'));
    await mb.page.tap(`[data-key="hand-${c.cardId}"]`);
    await mb.page.tap('[data-drop="primary"]');
    await mb.page.tap('[data-key="stance-guard"]');
    await shot(mb.page, '21-mobile-inclinee-pose-tactile', 'Mobile : vue B, pose tactile, portrait vivant');
    await mb.ctx.close();
    const rm = await open(`?scenario=t2&qa=1&aiDelay=0&reducedMotion=1`);
    await shot(rm.page, '22-mouvement-reduit', 'Mouvement réduit : transitions instantanées, aucun mouvement imposé');
    await rm.ctx.close();
  }
} finally {
  await browser.close();
  server.stop();
}
manifest.consoleIssues = issues;
writeFileSync(`${OUT}/manifest.json`, JSON.stringify(manifest, null, 2));
console.log(`${manifest.shots.length} captures · problèmes console : ${issues.length}`);
if (issues.length) { console.error(issues.join('\n')); process.exit(1); }
