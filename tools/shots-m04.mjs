// Captures M04 du JEU réel (build courant, Chromium + SwiftShader) à 1280×720 et 1920×1080 : accueil,
// création, rencontres, deck, collection, préparation, duel (vue A, vue B), menu, Clash, résultat
// après un duel complet joué par l’interface, aide, options ; + smoke portrait 390×844.
// Preuve de non-régression du duel approuvé (ADR 013) : la scène 3D d’un duel lancé DEPUIS LE JEU
// est comparée pixel à pixel à celle de l’entrée QA historique (même seed, même rival, même vue) et
// les ancres de cadrage / la hauteur projetée du visage sont relevées.
// Usage : npm run build && node tools/shots-m04.mjs   (SHOTS_OUT=… pour un autre dossier)
import { mkdirSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import * as THREE from 'three';
import { launch, startPreview, watchConsole } from './browser.mjs';
import { newStats, playTurn } from './duel-driver.mjs';

const OUT = process.env.SHOTS_OUT ?? 'screenshots/qa/m04';
mkdirSync(OUT, { recursive: true });
const commit = execSync('git rev-parse --short HEAD').toString().trim();
const Q = 'qa=1&aiDelay=0&reducedMotion=1';
const manifest = { commit, date: new Date().toISOString(), renderer: 'Chromium headless + SwiftShader (CPU)', shots: [], framing: [], issues: [] };

/** Hauteur projetée yeux → menton (même calcul que shots-m03-2, géométrie M03.2 du rival). */
function faceHeight(anchors, H) {
  const pos = new THREE.Vector3(0, 3.15, 8.6);
  const look = new THREE.Vector3(0, 2.45, -2.7);
  const scale = 1.34;
  const head = new THREE.Vector3(0, 1.72 + 0.6 * scale, -2.7);
  const edge = new THREE.Vector3(0, 1.05, -2.35);
  const fwd = new THREE.Vector3().subVectors(look, pos).normalize();
  const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
  const up = new THREE.Vector3().crossVectors(right, fwd).normalize();
  const tan = (p) => { const d = new THREE.Vector3().subVectors(p, pos); return d.dot(up) / d.dot(fwd); };
  const k = (anchors.edge * H - anchors.head * H) / (tan(head) - tan(edge));
  const cy = anchors.head * H + k * tan(head);
  const y = (p) => cy - k * tan(p);
  return Math.round(y(new THREE.Vector3(0, head.y - 0.51 * scale, -2.68)) - y(new THREE.Vector3(0, head.y + 0.02 * scale, -2.68)));
}

const anchorsOf = (page) => page.evaluate(() => { const cs = getComputedStyle(document.getElementById('app')); return { head: parseFloat(cs.getPropertyValue('--a-head')), edge: parseFloat(cs.getPropertyValue('--a-edge')) }; });
/** Scène 3D seule : les calques DOM (plateau, enveloppe) sont masqués le temps de la capture. */
async function canvasPng(page) {
  await page.evaluate(() => { for (const id of ['app', 'shell', 'stage']) { const el = document.getElementById(id); if (el) el.style.visibility = 'hidden'; } });
  const png = await page.locator('#arena canvas').screenshot();
  await page.evaluate(() => { for (const id of ['app', 'shell', 'stage']) { const el = document.getElementById(id); if (el) el.style.visibility = ''; } });
  return png;
}

async function ctxFor(browser, vp, mobile = false) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
  const page = await ctx.newPage();
  page.setDefaultTimeout(20000);
  const issues = [];
  watchConsole(page, issues);
  return { ctx, page, issues };
}

async function shot(page, name, desc) {
  await page.waitForTimeout(350);
  const file = `${OUT}/${name}.png`;
  await page.screenshot({ path: file });
  manifest.shots.push({ file, desc, viewport: page.viewportSize() });
  console.log(`✓ ${name} — ${desc}`);
}

async function newProfile(page, sig = 'Ronce') {
  await page.click('[data-key="home-new"]');
  await page.fill('[data-key="new-name"]', 'Capture');
  await page.click(`[data-key="new-sig-${sig}"]`);
  await page.click('[data-key="new-create"]');
  await page.waitForSelector('[data-screen="board"]');
}

/** Différence moyenne absolue (0–255) entre deux PNG de même taille, calculée dans une page dédiée. */
async function pngDiff(helper, a, b) {
  return helper.evaluate(async ({ a, b }) => {
    const load = async (src) => { const i = new Image(); i.src = src; await i.decode(); const c = new OffscreenCanvas(i.width, i.height); const x = c.getContext('2d'); x.drawImage(i, 0, 0); return x.getImageData(0, 0, i.width, i.height); };
    const [p, q] = [await load(a), await load(b)];
    if (p.width !== q.width || p.height !== q.height) return { error: 'tailles différentes' };
    let sum = 0;
    let over = 0;
    for (let i = 0; i < p.data.length; i += 4) {
      const d = (Math.abs(p.data[i] - q.data[i]) + Math.abs(p.data[i + 1] - q.data[i + 1]) + Math.abs(p.data[i + 2] - q.data[i + 2])) / 3;
      sum += d;
      if (d > 24) over++;
    }
    const n = p.data.length / 4;
    return { meanAbs: Math.round((sum / n) * 100) / 100, pctOver24: Math.round((over / n) * 10000) / 100 };
  }, { a: `data:image/png;base64,${a.toString('base64')}`, b: `data:image/png;base64,${b.toString('base64')}` });
}

const server = await startPreview();
const browser = await launch();
const helper = await (await browser.newContext()).newPage();
try {
  for (const vp of [{ width: 1280, height: 720 }, { width: 1920, height: 1080 }]) {
    const tag = `${vp.width}`;
    // Parcours d’écrans (profil neuf).
    {
      const { ctx, page, issues } = await ctxFor(browser, vp);
      await page.goto(`${server.base}/?${Q}&freeze=1`);
      await page.waitForSelector('[data-screen="home"]');
      await shot(page, `01-accueil-vide-${tag}`, 'Accueil, aucune sauvegarde');
      await page.click('[data-key="home-new"]');
      await page.click('[data-key="new-sig-Ronce"]');
      await shot(page, `02-nouveau-duelliste-${tag}`, 'Création du profil : Signature (voie) et deux Techniques');
      await page.click('[data-key="new-create"]');
      await page.waitForSelector('[data-screen="board"]');
      await shot(page, `03-rencontres-${tag}`, 'Tableau des rencontres (données de prototype signalées)');
      await page.click('[data-key="board-deck"]');
      await page.click('[data-key="ver-Cendre-1-basic"]');
      await page.click('[data-key="inspect-Ronce-2"]');
      await shot(page, `04-deck-${tag}`, 'Éditeur de deck : modification non enregistrée, inspection, état légal');
      await page.click('[data-key="deck-save"]');
      await page.click('[data-key="deck-back"]');
      await page.click('[data-key="board-collection"]');
      await page.click('[data-key="filter-Voile"]');
      await page.click('[data-key="coll-Voile-3-dissimulation"]');
      await shot(page, `05-collection-${tag}`, 'Collection filtrée (Voile) : possédées / non possédées / dans le deck');
      await page.click('[data-key="coll-back"]');
      await page.click('[data-key="enc-libre-ronce"]');
      await shot(page, `06-preparation-${tag}`, 'Préparation : dossier public du rival, votre deck, conditions du duel');
      await page.click('[data-key="board-home"]').catch(() => {});
      await page.goto(`${server.base}/?${Q}&freeze=1`);
      await page.click('[data-key="home-help"]');
      await shot(page, `11-aide-${tag}`, 'Aide intégrée');
      await page.click('[data-key="help-back"]');
      await page.click('[data-key="home-options"]');
      await shot(page, `12-options-${tag}`, 'Options (présentation, sauvegarde)');
      await page.click('[data-key="opt-back"]');
      await shot(page, `13-accueil-sauvegarde-${tag}`, 'Accueil avec sauvegarde : Continuer');
      manifest.issues.push(...issues.map((x) => `${tag} écrans : ${x}`));
      await ctx.close();
    }
    // Duel lancé depuis le jeu, comparé à l’entrée QA historique (même seed 202, Maëlle, vue A figée).
    {
      const { ctx, page, issues } = await ctxFor(browser, vp);
      await page.goto(`${server.base}/?${Q}&freeze=1&intro=1&seed=202`);
      await newProfile(page);
      await page.click('[data-key="enc-libre-ronce"]');
      await page.click('[data-key="prep-start"]');
      await page.waitForFunction(() => !!window.__lqv);
      await shot(page, `07-duel-vue-A-${tag}`, 'Duel lancé depuis le jeu : vue A (observation du rival), conseil contextuel');
      const product = await canvasPng(page);
      const anchors = await anchorsOf(page);
      const legacy = await (async () => {
        const l = await ctxFor(browser, vp);
        await l.page.goto(`${server.base}/?seed=202&autostart=1&rival=ronce&${Q}&freeze=1&intro=1`);
        await l.page.waitForFunction(() => !!window.__lqv);
        await l.page.waitForTimeout(350);
        const png = await canvasPng(l.page);
        const a = await anchorsOf(l.page);
        await l.ctx.close();
        return { png, a };
      })();
      const diff = await pngDiff(helper, product, legacy.png);
      const fr = { viewport: tag, anchorsJeu: anchors, anchorsQA: legacy.a, visageJeuPx: faceHeight(anchors, vp.height), visageQAPx: faceHeight(legacy.a, vp.height), sceneDiff: diff };
      manifest.framing.push(fr);
      console.log(`  cadrage ${tag} : ancres jeu ${anchors.head}/${anchors.edge} = QA ${legacy.a.head}/${legacy.a.edge} · visage ${fr.visageJeuPx} px · écart scène 3D moyen ${diff.meanAbs}/255 (${diff.pctOver24} % de pixels > 24)`);
      // Vue B : Primaire posée, choix de posture.
      await page.evaluate(() => window.__lqv.controller.endHold());
      const v = await page.evaluate(() => window.__lqv.view());
      if (v.phase === 'START') await page.click('[data-key="act-start"]');
      await page.waitForFunction(() => window.__lqv.view().phase === 'COMMIT' || window.__lqv.view().phase === 'PREPARE');
      if (await page.evaluate(() => window.__lqv.view().phase === 'PREPARE')) await page.click('[data-key="act-prepare"]');
      const hand = await page.evaluate(() => window.__lqv.view().me.hand.map((c) => c.cardId));
      await page.click(`[data-key="hand-${hand[0]}"]`);
      await page.click('[data-drop="primary"]');
      await shot(page, `08-duel-vue-B-${tag}`, 'Vue B : Primaire posée, choix ASSAUT / GARDE');
      await page.click('[data-key="tool-menu"]');
      await shot(page, `09-menu-pause-${tag}`, 'Menu du duel (pause) : reprendre, options, aide, abandon');
      manifest.issues.push(...issues.map((x) => `${tag} duel : ${x}`));
      await ctx.close();
    }
    // Duel COMPLET joué par l’interface (clic), Clash en mouvement réel au rythme rapide, puis Résultat.
    {
      const { ctx, page, issues } = await ctxFor(browser, vp);
      await page.goto(`${server.base}/?qa=1&aiDelay=0&reducedMotion=0&pace=fast&seed=101`);
      await newProfile(page, 'Cendre');
      await page.click('[data-key="enc-libre-braise"]');
      await page.click('[data-key="prep-start"]');
      await page.waitForFunction(() => !!window.__lqv);
      const st = newStats();
      let out = 'running';
      // Capture du premier Clash en mouvement, en parallèle du pilote (qui laisse jouer la séquence).
      const clash = page.waitForFunction(() => window.__lqv?.presentation().stage && ['outcome', 'damage'].includes(window.__lqv.presentation().beat), null, { timeout: 180000, polling: 40 })
        .then(async () => { await page.screenshot({ path: `${OUT}/10-clash-${tag}.png` }); manifest.shots.push({ file: `${OUT}/10-clash-${tag}.png`, desc: 'Clash en cours (chorégraphie M03.2, temps réel, rythme rapide)', viewport: vp }); console.log(`✓ 10-clash-${tag}`); })
        .catch(() => manifest.issues.push(`${tag} : aucun Clash capturé`));
      for (let t = 0; t < 90 && out !== 'ended' && out !== 'stuck'; t++) out = await playTurn(page, { name: 'shots', useLecture: false, mode: 'click', watchSequence: true }, st);
      await clash;
      await page.waitForSelector('[data-screen="result"]', { timeout: 60000 });
      await page.waitForTimeout(1500);
      await shot(page, `14-resultat-${tag}`, `Résultat après un duel complet joué par l’interface (${st.turns} tours)`);
      await page.click('[data-key="result-board"]');
      await shot(page, `15-retour-rencontres-${tag}`, 'Retour au tableau : bilan et historique mis à jour');
      manifest.issues.push(...issues.map((x) => `${tag} duel complet : ${x}`), ...st.leaks.map((x) => `${tag} fuite : ${x}`), ...st.layoutIssues.map((x) => `${tag} composition : ${x}`));
      await ctx.close();
    }
  }
  // Smoke portrait (pas de nouveau chantier mobile) : accueil, rencontres, préparation, duel.
  {
    const { ctx, page, issues } = await ctxFor(browser, { width: 390, height: 844 }, true);
    await page.goto(`${server.base}/?${Q}&freeze=1`);
    await page.waitForSelector('[data-screen="home"]');
    await shot(page, '16-mobile-accueil-390', 'Smoke portrait : accueil');
    await newProfile(page);
    await shot(page, '17-mobile-rencontres-390', 'Smoke portrait : rencontres');
    await page.tap('[data-key="enc-libre-voile"]');
    await page.tap('[data-key="prep-start"]');
    await page.waitForFunction(() => !!window.__lqv);
    await shot(page, '18-mobile-duel-390', 'Smoke portrait : duel lancé depuis le jeu (gabarit M03.2)');
    manifest.issues.push(...issues.map((x) => `390 : ${x}`));
    await ctx.close();
  }
} finally {
  await browser.close();
  server.stop();
}
writeFileSync(`${OUT}/manifest.json`, JSON.stringify(manifest, null, 2));
console.log(`${manifest.shots.length} captures · problèmes : ${manifest.issues.length}${manifest.issues.length ? ` (${manifest.issues.slice(0, 4).join(' | ')})` : ''}`);
if (manifest.issues.length) process.exit(1);
