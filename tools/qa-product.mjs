// QA navigateur du JEU (M04+) : parcours de joueur ordinaires depuis l’accueil, SANS paramètre de
// scénario — création de profil, deck, rencontre, duel complet joué par l’interface (souris, clic,
// clavier, glisser), résultat, retour, rechargement, abandon, deck illégal refusé, sauvegarde
// illisible. Chaque duel est audité comme en M03 (vues, composition, postures, secrets).
// Sortie : artifacts/qa/qa-product.json. `?qa=1` n’expose que des crochets de lecture.
import { mkdirSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { launch, startPreview, view, watchConsole } from './browser.mjs';
import { newStats, playTurn, pres, sample } from './duel-driver.mjs';

const OUT = 'artifacts/qa';
mkdirSync(`${OUT}/tmp`, { recursive: true });
const commit = execSync('git rev-parse --short HEAD').toString().trim();
const Q = 'qa=1&aiDelay=0';

const shellState = (page) => page.evaluate(() => {
  const s = window.__lqvShell;
  return { screen: s.flow.screen, overlay: s.flow.overlay, encounter: s.flow.encounterId, save: s.save ? JSON.parse(JSON.stringify(s.save)) : null, last: s.lastResult, load: s.load.status, live: !!s.live };
});
const screenIs = (page, id, timeout = 15000) => page.waitForSelector(`[data-screen="${id}"]`, { timeout });

/** Joue un duel produit jusqu’au K.-O. par l’interface ; renvoie le gagnant moteur et les audits. */
async function playDuel(page, run, mode) {
  await page.waitForFunction(() => !!window.__lqv);
  const stats = newStats();
  let outcome = 'running';
  for (let t = 0; t < 90 && outcome !== 'ended' && outcome !== 'stuck'; t++) outcome = await playTurn(page, { ...run, mode }, stats);
  const v = await view(page);
  await sample(page, stats);
  const p = await pres(page);
  return { outcome, winner: v.winner, turn: v.turn, hp: [v.me.hp, v.opp.hp], personality: p.personality, ...stats, moods: [...stats.moods], leaks: [...new Set(stats.leaks)] };
}

async function newProfile(page, { name, sig, techs }) {
  await screenIs(page, 'home');
  await page.click('[data-key="home-new"]');
  await page.fill('[data-key="new-name"]', name);
  await page.click(`[data-key="new-sig-${sig}"]`);
  // Techniques : on désélectionne celles du deck de départ puis on choisit les deux demandées.
  for (const t of ['Lecture', 'Ancrage', 'Sondage', 'Recentrage']) if (await page.locator(`[data-key="new-tech-${t}"][aria-pressed="true"]`).count()) await page.click(`[data-key="new-tech-${t}"]`);
  for (const t of techs) await page.click(`[data-key="new-tech-${t}"]`);
  await page.click('[data-key="new-create"]');
  await screenIs(page, 'board');
}

async function withPage(browser, base, vp, fn, init) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1 });
  if (init) await ctx.addInitScript(init.fn, init.arg);
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  const consoleIssues = [];
  watchConsole(page, consoleIssues);
  const res = { consoleIssues, checks: [], fails: [] };
  const check = (ok, what) => { res.checks.push(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); if (!ok) res.fails.push(what); };
  try {
    await fn(page, check, res);
  } catch (err) {
    res.fails.push(`exception : ${String(err.message).split('\n')[0]}`);
    await page.screenshot({ path: `${OUT}/tmp/product-fail-${Date.now()}.png` }).catch(() => {});
  }
  await ctx.close();
  return res;
}

const server = await startPreview();
const browser = await launch();
const report = { commit, date: new Date().toISOString(), chromium: browser.version(), runs: {} };
const only = process.env.QA_ONLY;
const runs = {
  // A — nouveau joueur, souris (clic) : profil → deck édité → Kaï → duel complet → résultat → rechargement → Continuer.
  'A-nouveau-joueur-1280-clic': () => withPage(browser, server.base, { width: 1280, height: 720 }, async (page, check, res) => {
    await page.goto(`${server.base}/?${Q}&reducedMotion=1`);
    await newProfile(page, { name: 'QA Nouveau', sig: 'Voile', techs: ['Sondage', 'Lecture'] });
    let st = await shellState(page);
    check(st.save?.profile.name === 'QA Nouveau' && st.save.deck.signature === 'Voile' && st.save.deck.techniques.join() === 'Sondage,Lecture', 'profil créé avec Signature et Techniques choisies');
    // Deck : Voile I en Basic, puis enregistrement.
    await page.click('[data-key="board-deck"]');
    await screenIs(page, 'deck');
    await page.click('[data-key="ver-Voile-1-basic"]');
    check(await page.locator('[data-key="deck-save"]:not([disabled])').count() === 1, 'deck modifié : enregistrement possible');
    await page.click('[data-key="deck-save"]');
    st = await shellState(page);
    check(!st.save.deck.variants.includes('Voile-1-eclaireur') && st.save.deck.variants.length === 3, 'variante retirée enregistrée (Basic à la place)');
    await page.click('[data-key="deck-back"]');
    await screenIs(page, 'board');
    await page.click('[data-key="enc-libre-braise"]');
    await screenIs(page, 'prep');
    await page.click('[data-key="prep-start"]');
    const duel = await playDuel(page, { name: 'A', useLecture: true }, 'click');
    res.duel = duel;
    check(duel.outcome === 'ended', `duel joué jusqu’au K.-O. (tour ${duel.turn})`);
    await screenIs(page, 'result', 40000);
    st = await shellState(page);
    check(st.last?.outcome === (duel.winner === 'me' ? 'victory' : 'defeat') && st.save.history.length === 1, `résultat enregistré (${st.last?.outcome}) = vainqueur moteur (${duel.winner})`);
    check(st.last?.turns === duel.turn, 'tours du résumé = tours du moteur');
    check(await page.evaluate(() => !window.__lqv && document.getElementById('app').hidden && !document.querySelector('#stage .clash-stage')), 'session de duel retirée (crochets, plateau, scène)');
    await page.click('[data-key="result-board"]');
    await screenIs(page, 'board');
    check((await page.textContent('[data-encounter="libre-braise"] .sh-enc-rec'))?.includes(duel.winner === 'me' ? '1 V' : '1 D'), 'bilan du rival mis à jour sur le tableau');
    await page.click('[data-key="board-home"]');
    await page.reload();
    await screenIs(page, 'home');
    check(await page.locator('[data-key="home-continue"]').count() === 1, 'après rechargement : bouton Continuer');
    st = await shellState(page);
    check(st.save?.history.length === 1 && st.save.deck.techniques.join() === 'Sondage,Lecture', 'après rechargement : profil, deck et historique intacts');
    await page.click('[data-key="home-continue"]');
    await screenIs(page, 'board');
  }),
  // B — 1920, glisser souris puis clavier : Sélène, revanche, abandon confirmé (classé à part).
  'B-1920-glisser-abandon': () => withPage(browser, server.base, { width: 1920, height: 1080 }, async (page, check, res) => {
    await page.goto(`${server.base}/?${Q}&reducedMotion=1`);
    await newProfile(page, { name: 'QA Glisser', sig: 'Cendre', techs: ['Lecture', 'Ancrage'] });
    await page.click('[data-key="enc-libre-voile"]');
    await page.click('[data-key="prep-start"]');
    const duel = await playDuel(page, { name: 'B', useLecture: false }, 'drag');
    res.duel = duel;
    check(duel.outcome === 'ended', `duel glisser joué jusqu’au K.-O. (tour ${duel.turn})`);
    await screenIs(page, 'result', 40000);
    await page.click('[data-key="result-rematch"]');
    await screenIs(page, 'prep');
    await page.click('[data-key="prep-start"]');
    await page.waitForFunction(() => !!window.__lqv);
    // Deux tours au clavier, puis abandon par le menu (Annuler d’abord, puis confirmer).
    const kb = newStats();
    for (let i = 0; i < 2; i++) await playTurn(page, { name: 'B2', useLecture: false, mode: 'keyboard' }, kb);
    res.keyboardTurns = kb.turns;
    await page.click('[data-key="tool-menu"]');
    await page.click('[data-key="menu-abandon"]');
    await page.click('[data-key="confirm-cancel"]');
    check((await shellState(page)).screen === 'duel', 'abandon annulé : le duel continue');
    await page.click('[data-key="menu-abandon"]');
    await page.click('[data-key="confirm-ok"]');
    await screenIs(page, 'result');
    const st = await shellState(page);
    check(st.last?.outcome === 'abandon' && st.save.history.length === 2, 'abandon classé à part (ni victoire ni défaite)');
    check((await page.textContent('[data-screen="result"] h1')) === 'Abandon', 'écran Résultat : « Abandon »');
  }),
  // C — deck illégal en sauvegarde (variante non possédée) : refusé jusqu’à correction.
  'C-deck-illegal-refuse': () => withPage(browser, server.base, { width: 1280, height: 720 }, async (page, check) => {
    await page.goto(`${server.base}/?${Q}&reducedMotion=1`);
    await newProfile(page, { name: 'QA Illégal', sig: 'Astre', techs: ['Lecture', 'Ancrage'] });
    await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('lqv.save'));
      s.deck.variants.push('Astre-4-convergence');
      localStorage.setItem('lqv.save', JSON.stringify(s));
    });
    await page.reload();
    await screenIs(page, 'home');
    check((await page.textContent('.sh-save-status')).includes('plus légal'), 'accueil : deck enregistré signalé illégal');
    await page.click('[data-key="home-continue"]');
    await page.click('[data-key="enc-libre-ronce"]');
    await screenIs(page, 'prep');
    check(await page.locator('[data-key="prep-start"][disabled]').count() === 1, 'préparation : « Commencer » désactivé');
    const refused = await page.evaluate(() => { window.__lqvShell.startDuel(); return window.__lqvShell.flow.screen; });
    check(refused === 'prep' && !(await page.evaluate(() => !!window.__lqv)), 'lancement forcé refusé par le flux (aucun duel créé)');
    await page.click('[data-key="prep-deck"]');
    await screenIs(page, 'deck');
    check((await page.textContent('.sh-issues')).includes('non possédée'), 'éditeur : raison affichée');
    await page.click('[data-key="ver-Astre-4-basic"]');
    await page.click('[data-key="deck-save"]');
    await page.click('[data-key="deck-back"]');
    await screenIs(page, 'prep');
    check(await page.locator('[data-key="prep-start"]:not([disabled])').count() === 1, 'deck corrigé : duel possible');
  }),
  // D — sauvegarde illisible : rien n’est effacé ; restauration de la copie de secours ; sinon mise à l’écart.
  'D-sauvegarde-illisible': () => withPage(browser, server.base, { width: 1280, height: 720 }, async (page, check) => {
    await page.goto(`${server.base}/?${Q}&reducedMotion=1`);
    await newProfile(page, { name: 'QA Secours', sig: 'Ronce', techs: ['Sondage', 'Ancrage'] });
    await page.click('[data-key="board-deck"]');
    await page.click('[data-key="ver-Ronce-1-basic"]');
    await page.click('[data-key="deck-save"]'); // 2e écriture : la 1re devient la copie de secours
    await page.evaluate(() => localStorage.setItem('lqv.save', '{"schemaVersion":1,"profile":'));
    await page.reload();
    await screenIs(page, 'home');
    check(await page.locator('.sh-corrupt').count() === 1 && await page.locator('[data-key="corrupt-restore"]').count() === 1, 'illisible : diagnostic + restauration proposée');
    check(await page.evaluate(() => localStorage.getItem('lqv.save')) === '{"schemaVersion":1,"profile":', 'illisible conservée tant que le joueur n’a rien choisi');
    await page.click('[data-key="corrupt-restore"]');
    const st = await shellState(page);
    check(st.save?.profile.name === 'QA Secours' && st.load === 'ok', 'copie de secours restaurée');
    check(await page.evaluate(() => JSON.parse(localStorage.getItem('lqv.save.corrupt')).text.startsWith('{"schemaVersion":1')), 'fichier illisible mis à l’écart (lqv.save.corrupt)');
    // Schéma futur : refus explicite, nouvelle partie possible, le fichier futur est conservé à part.
    await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('lqv.save')); s.schemaVersion = 99; localStorage.setItem('lqv.save', JSON.stringify(s)); localStorage.removeItem('lqv.save.backup'); });
    await page.reload();
    await screenIs(page, 'home');
    check((await page.textContent('.sh-corrupt')).includes('plus récente'), 'schéma futur refusé explicitement');
    await page.click('[data-key="corrupt-new"]');
    await page.click('[data-key="new-create"]');
    await screenIs(page, 'board');
    check(await page.evaluate(() => JSON.parse(localStorage.getItem('lqv.save.corrupt')).text.includes('"schemaVersion":99')), 'nouvelle partie : la sauvegarde future est conservée à part');
  }),
};
try {
  for (const [name, fn] of Object.entries(runs)) {
    if (only && !name.includes(only)) continue;
    const t0 = Date.now();
    const r = await fn();
    r.ms = Date.now() - t0;
    report.runs[name] = r;
    const d = r.duel ? ` · duel : ${r.duel.outcome} tour ${r.duel.turn}, gagnant ${r.duel.winner}, rival ${r.duel.personality}, vues ${r.duel.viewChecks}/${r.duel.viewErrors.length} écarts, composition ${r.duel.layoutIssues.length}, postures ${r.duel.stanceIssues.length}, fuites ${r.duel.leaks.length}, clics perdus ${r.duel.lostClicks.length}` : '';
    console.log(`${name}: ${r.checks.length - r.fails.length}/${r.checks.length} contrôles${d} · console ${r.consoleIssues.length} · ${r.ms} ms`);
    for (const f of r.fails) console.log(`   ÉCHEC ${f}`);
  }
} finally {
  await browser.close();
  server.stop();
}
writeFileSync(`${OUT}/qa-product.json`, JSON.stringify(report, null, 2));
const bad = Object.entries(report.runs).filter(([, r]) => r.fails.length || r.consoleIssues.length || (r.duel && (r.duel.outcome !== 'ended' || r.duel.leaks.length || r.duel.viewErrors.length || r.duel.layoutIssues.length || r.duel.stanceIssues.length || r.duel.lostClicks.length || r.duel.stageGhosts.length)));
if (bad.length) { console.error(`ÉCHEC QA produit : ${bad.map(([n]) => n).join(', ')}`); process.exit(1); }
console.log(`QA produit OK (${Object.keys(report.runs).length} parcours) — ${OUT}/qa-product.json`);
