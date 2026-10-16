// Captures déterministes des parcours opérateur (U01–U12) + comparatif caméra + galerie art.
// `freeze=1` (arène figée, animations CSS coupées), seeds explicites. Sortie : screenshots/qa/*.png + manifest.json
import { mkdirSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dragTo, launch, startPreview, view, waitDecision, watchConsole } from './browser.mjs';

const OUT = 'screenshots/qa';
mkdirSync(OUT, { recursive: true });
const commit = execSync('git rev-parse --short HEAD').toString().trim();
const manifest = { commit, date: new Date().toISOString(), note: 'Chromium headless + WebGL logiciel SwiftShader ; arène figée (freeze=1).', shots: [] };
const server = await startPreview(4181);
const browser = await launch();
const issues = [];

async function open(url, viewport = { width: 1280, height: 720 }, extra = {}) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, ...extra });
  const page = await ctx.newPage();
  page.setDefaultTimeout(8000);
  watchConsole(page, issues);
  await page.goto(`${server.base}/${url}`);
  await page.waitForTimeout(400);
  return { ctx, page };
}

async function shot(page, id, desc, meta = {}) {
  await page.waitForTimeout(150);
  const path = `${OUT}/${id}.png`;
  await page.screenshot({ path });
  const v = await page.evaluate(() => (window.__lqv ? window.__lqv.view() : null)).catch(() => null);
  manifest.shots.push({ id, path, desc, url: page.url().replace(server.base, ''), viewport: page.viewportSize(), turn: v?.turn ?? null, phase: v?.phase ?? null, ...meta });
  console.log(`✓ ${id} — ${desc}`);
}

const Q = 'qa=1&aiDelay=0&freeze=1&reducedMotion=1';

try {
  // U00 — écran de préparation
  {
    const { ctx, page } = await open(`?seed=101&${Q}`);
    await shot(page, 'U00-preparation-duel', 'Écran de préparation : Signature et deux Techniques par tuiles cliquables (aucun select)');
    await ctx.close();
  }
  // U01 / U05 / U02 / U03 — duel normal seed 101
  {
    const { ctx, page } = await open(`?seed=101&autostart=1&${Q}`);
    let v = await waitDecision(page);
    await shot(page, 'U01a-main-plateau-engagement', 'Main de 4, plateau vide, phase Engagement', { seed: 101 });
    const [c0, c1] = v.me.hand.filter((c) => !c.defId.startsWith('sig-'));
    // U05 : glisser en cours (fantôme + destinations légales/illégales)
    const a = await page.locator(`[data-key="hand-${c0.cardId}"]`).boundingBox();
    const b = await page.locator('[data-drop="primary"]').boundingBox();
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    for (let i = 1; i <= 8; i++) await page.mouse.move(a.x + a.width / 2 + (b.x + b.width / 2 - a.x - a.width / 2) * i / 8, a.y + a.height / 2 + (b.y + b.height / 2 - a.y - a.height / 2) * i / 8);
    await shot(page, 'U05-glisser-en-cours', 'Glisser-déposer pointeur en cours : fantôme, destinations légales surlignées', { seed: 101 });
    await page.mouse.up();
    await page.click('[data-key="stance-assault"]');
    // clic-pour-poser de la Secondaire
    await page.click(`[data-key="hand-${c1.cardId}"]`);
    await shot(page, 'U01b-carte-selectionnee-cases-legales', 'Clic sur une carte : cases compatibles surlignées (alternative au glisser)', { seed: 101 });
    await page.click('[data-drop="slot0"]');
    await shot(page, 'U01c-primaire-assaut-garde-avant-verrouillage', 'Primaire posée avec choix ASSAUT/GARDE, Secondaire en pose cachée, non verrouillées (annulables)', { seed: 101 });
    await page.click('[data-key="act-commit"]');
    v = await waitDecision(page);
    if (v.phase === 'TACTICS') { await page.click('[data-key="act-tactics"]'); v = await waitDecision(page); }
    if (v.phase === 'REPEL') { await page.click('[data-key="act-repel-skip"]'); v = await waitDecision(page); }
    await shot(page, 'U02-secondaire-chargement-resolution', 'Après résolution : Secondaire en CHARGEMENT (inutilisable ce tour), résultat du Clash expliqué', { seed: 101 });
    if (v.phase === 'RESOLVED') await page.click('[data-key="act-next"]');
    v = await waitDecision(page);
    if (v.phase === 'START') { await page.click('[data-key="act-start"]'); v = await waitDecision(page); }
    if (v.phase === 'PREPARE') {
      await shot(page, 'U03a-reserve-cachee-inactive', 'Tour suivant : la Secondaire est en RÉSERVE CACHÉE / INACTIVE (garder ou révéler)', { seed: 101 });
      await page.click('[data-key="zone-me-0"]');
      await shot(page, 'U03b-revelation-volontaire-choisie', 'Révélation volontaire sélectionnée (secrète jusqu’à application simultanée)', { seed: 101 });
      await page.click('[data-key="act-prepare"]');
      await waitDecision(page);
      await shot(page, 'U03c-secondaire-active-prete', 'Secondaire révélée : ACTIVE / PRÊTE ; journal de révélation', { seed: 101 });
    }
    await ctx.close();
  }
  // U04 / U09 — Interférence (rival scripté, démonstration)
  {
    const { ctx, page } = await open(`?scenario=interference&${Q}`);
    let v = await view(page);
    const prim = v.me.hand.find((c) => c.defId.startsWith('Cendre-4'));
    await dragTo(page, `[data-key="hand-${prim.cardId}"]`, '[data-drop="primary"]');
    await page.click('[data-key="stance-assault"]');
    await page.click('[data-key="act-commit"]');
    v = await waitDecision(page);
    await shot(page, 'U06-primaires-revelees-simultanement', 'Primaires révélées simultanément ; prévision provisoire sans information cachée', { scenario: 'interference' });
    await page.click('[data-key="zone-me-0"]');
    await shot(page, 'U04-menu-contextuel-secondaire', 'Menu contextuel sur Secondaire active : Conserver / Rang (+affinité) / Dégâts (×) / Interférer', { scenario: 'interference' });
    await page.click('[data-key="menu-0-damage"]');
    await page.click('[data-key="zone-me-1"]');
    await page.click('[data-key="menu-1-interfere"]');
    await shot(page, 'U04b-ciblage-interference', 'Interférer : ciblage direct sur le terrain adverse (cibles légales surlignées)', { scenario: 'interference' });
    await page.click('[data-key="zone-opp-0"]');
    await shot(page, 'U04c-choix-tactiques-secrets', 'Choix verrouillables affichés au seul propriétaire ; rival verrouillé sans fuite', { scenario: 'interference' });
    await page.click('[data-key="act-tactics"]');
    await waitDecision(page);
    await shot(page, 'U09-interference-resultat', 'Interférences simultanées en une passe : soutien annulé, journal détaillé', { scenario: 'interference' });
    await ctx.close();
  }
  // U07 — T2 : victoire au Rang, 0 dégât
  {
    const { ctx, page } = await open(`?scenario=t2&${Q}`);
    await page.click('[data-key="zone-me-0"]');
    await page.click('[data-key="act-prepare"]');
    let v = await waitDecision(page);
    const c3 = v.me.hand.find((c) => c.defId === 'Cendre-3-basic');
    await page.click(`[data-key="hand-${c3.cardId}"]`);
    await page.click('[data-drop="primary"]');
    await page.click('[data-key="stance-assault"]');
    await page.click('[data-key="act-commit"]');
    v = await waitDecision(page);
    await page.click('[data-key="zone-me-0"]');
    await page.click('[data-key="menu-0-rank"]');
    await shot(page, 'U07a-T2-soutien-rang-provisoire', 'T2 : Cendre I en Amplifier le Rang (+2 affinité) — prévision provisoire 5 contre 4', { scenario: 't2' });
    await page.click('[data-key="act-tactics"]');
    await waitDecision(page);
    await shot(page, 'U07b-T2-victoire-rang-zero-degat', 'T2 : « Vous dominez au Rang (5 contre 4), mais 0 blessure : la Garde absorbe »', { scenario: 't2' });
    await ctx.close();
  }
  // U10 — Signature ∞ contre Garde IV
  {
    const { ctx, page } = await open(`?scenario=signature&${Q}`);
    let v = await view(page);
    const sig = v.me.hand.find((c) => c.defId.startsWith('sig-'));
    await dragTo(page, `[data-key="hand-${sig.cardId}"]`, '[data-drop="primary"]');
    await page.click('[data-key="stance-assault"]');
    await page.click('[data-key="act-commit"]');
    await waitDecision(page);
    await page.click('[data-key="zone-me-0"]');
    await page.click('[data-key="menu-0-damage"]');
    await page.click('[data-key="zone-me-1"]');
    await page.click('[data-key="menu-1-damage"]');
    await page.click('[data-key="act-tactics"]');
    v = await waitDecision(page);
    await shot(page, 'U10-signature-infini-contre-garde', 'Signature ∞ (P14, ×5+×4) contre Garde IV renforcée : priorité ∞, (14−12)×9 = 18', { scenario: 'signature' });
    await ctx.close();
  }
  // U11 — double K.-O.
  {
    const { ctx, page } = await open(`?scenario=doubleko&${Q}`);
    const v = await view(page);
    const cc = v.me.hand.find((c) => c.defId.startsWith('Cendre-4'));
    await page.click(`[data-key="hand-${cc.cardId}"]`);
    await page.click('[data-drop="primary"]');
    await page.click('[data-key="stance-assault"]');
    await page.click('[data-key="act-commit"]');
    await waitDecision(page);
    await shot(page, 'U11-double-ko-prolongation', 'Contrecoup → double K.-O. → prolongation : 1 PV chacun, cartes conservées', { scenario: 'doubleko' });
    await ctx.close();
  }
  // U12 — mobile portrait tactile + clavier + mouvement réduit
  {
    const { ctx, page } = await open(`?seed=404&autostart=1&${Q}`, { width: 390, height: 844 }, { isMobile: true, hasTouch: true });
    let v = await waitDecision(page);
    await shot(page, 'U12a-mobile-portrait-engagement', 'Mobile portrait 390×844 : main, plateau, HUD', { seed: 404 });
    const c = v.me.hand.find((x) => !x.defId.startsWith('sig-'));
    await page.tap(`[data-key="hand-${c.cardId}"]`);
    await page.tap('[data-drop="primary"]');
    await page.tap('[data-key="stance-guard"]');
    await shot(page, 'U12b-mobile-pose-tactile', 'Mobile : pose par toucher-toucher, mode GARDE choisi', { seed: 404 });
    await ctx.close();
  }
  {
    const { ctx, page } = await open(`?seed=303&autostart=1&${Q}`);
    const v = await waitDecision(page);
    await page.focus(`[data-key="hand-${v.me.hand[1].cardId}"]`);
    await page.keyboard.press('Enter');
    await page.keyboard.press('Tab');
    await page.focus('[data-key="zone-primary"]');
    await shot(page, 'U12c-clavier-focus-visible', 'Clavier seul : carte sélectionnée (Entrée), focus visible sur la case Primaire', { seed: 303 });
    await ctx.close();
  }
  // 1920×1080 + comparatif caméras (même état)
  for (const cam of ['tilted', 'frontal']) {
    const { ctx, page } = await open(`?scenario=signature&cam=${cam}&${Q}`, { width: 1920, height: 1080 });
    await shot(page, `cam-${cam}-1920`, `Caméra exploratoire « ${cam} » à 1920×1080 (même état)`, { cam });
    await page.addStyleTag({ content: '#app{display:none!important}' });
    await shot(page, `cam-${cam}-arene-seule`, `Arène Three.js seule, caméra « ${cam} »`, { cam });
    await ctx.close();
  }
  // Galerie art
  {
    const { ctx, page } = await open(`?gallery=1&artSeed=7`, { width: 1280, height: 1100 });
    await shot(page, 'art-galerie-seed7', 'Galerie : 32 cartes ordinaires (Basic + variantes) + 4 Signatures + verso, artSeed 7');
    await ctx.close();
    const g2 = await open(`?gallery=1&artSeed=99`, { width: 1280, height: 1100 });
    await shot(g2.page, 'art-galerie-seed99', 'Même galerie, artSeed 99 : motifs différents, identités et lisibilité inchangées');
    await g2.ctx.close();
  }
} finally {
  await browser.close();
  server.stop();
}
manifest.consoleIssues = issues;
writeFileSync(`${OUT}/manifest.json`, JSON.stringify(manifest, null, 2));
console.log(`${manifest.shots.length} captures · problèmes console : ${issues.length}`);
if (issues.length) { console.error(issues.join('\n')); process.exit(1); }
