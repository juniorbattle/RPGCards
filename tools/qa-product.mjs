// QA navigateur du JEU (M04+) : parcours de joueur ordinaires depuis l’accueil, SANS paramètre de
// scénario — création de profil, deck, rencontre, duel complet joué par l’interface (souris, clic,
// clavier, glisser), résultat, retour, rechargement, abandon, deck illégal refusé, sauvegarde
// illisible. Chaque duel est audité comme en M03 (vues, composition, postures, secrets).
// Sortie : artifacts/qa/qa-product.json (ou `LQV_QA_OUT`). `?qa=1` n’expose que des crochets de lecture.
// `LQV_RENDER_CHECK=1` (passe 13) : rendus ciblés du plateau comparés à un rendu complet (écart = erreur console).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { launch, startPreview, view, watchConsole } from './browser.mjs';
import { newStats, playTurn, pres, sample } from './duel-driver.mjs';

const OUT = 'artifacts/qa';
mkdirSync(`${OUT}/tmp`, { recursive: true });
const commit = execSync('git rev-parse --short HEAD').toString().trim();
const RENDER_CHECK = process.env.LQV_RENDER_CHECK === '1';
// LQV_QA_QUERY=… : paramètres d’URL en plus (par exemple `venue=rue`).
const Q = `qa=1&aiDelay=0${RENDER_CHECK ? '&renderCheck=1' : ''}${process.env.LQV_QA_QUERY ? `&${process.env.LQV_QA_QUERY}` : ''}`;

const shellState = (page) => page.evaluate(() => {
  const s = window.__lqvShell;
  return { screen: s.flow.screen, overlay: s.flow.overlay, encounter: s.flow.encounterId, save: s.save ? JSON.parse(JSON.stringify(s.save)) : null, last: s.lastResult, load: s.load.status, live: !!s.live };
});
// Captures facultatives du runtime réel pendant les parcours (QA_SHOTS=dossier).
const SHOTS = process.env.QA_SHOTS ?? null;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const snap = async (page, name) => { if (!SHOTS) return; await page.waitForTimeout(350); await page.screenshot({ path: `${SHOTS}/${name}.png` }); };
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

/** Une seule décision (le pilote joue jusqu’au prochain choix, puis rend la main). */
async function playTurnOnce(page, stats = newStats()) {
  return playTurn(page, { name: 'once', useLecture: false, mode: 'click', maxDecisions: 1 }, stats);
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
  // LQV_QA_TIMEOUT (ms) : délai des actions (clics, attentes) sur un conteneur lent en rendu logiciel ; sans la variable : inchangé.
  page.setDefaultTimeout(Number(process.env.LQV_QA_TIMEOUT) || 15000);
  // LQV_QA_NAV_TIMEOUT (ms) : délai des navigations seules (chargement à froid d’un conteneur lent : la compilation des
  // programmes WebGL en SwiftShader retarde l’événement load de 11 à 17 s ; RC 0.8). Sans la variable : inchangé.
  if (process.env.LQV_QA_NAV_TIMEOUT) page.setDefaultNavigationTimeout(Number(process.env.LQV_QA_NAV_TIMEOUT));
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
  if (RENDER_CHECK) res.renderCheck = await page.evaluate(() => window.__lqvRenderCheck?.() ?? null).catch(() => null);
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
    // M08 C1 : aucune génération ni préparation de personnage pendant le duel (compteurs figés du début à la fin).
    await page.waitForFunction(() => !!window.__lqv);
    const prepCount = () => page.evaluate(() => { const s = window.__lqvPrep(); return { held: s.held, n: [s.steps, s.finishedSteps, s.generated, s.built, s.taken, s.uploaded] }; });
    const prepAtStart = await prepCount();
    const duel = await playDuel(page, { name: 'A', useLecture: true }, 'click');
    const prepAtEnd = await prepCount();
    res.prepDuringDuel = { start: prepAtStart, end: prepAtEnd };
    check(prepAtStart.held && prepAtEnd.held && prepAtStart.n.join() === prepAtEnd.n.join(), `aucune génération ni préparation de personnage pendant le duel (compteurs ${prepAtStart.n.join('/')} → ${prepAtEnd.n.join('/')})`);
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
    await page.click('[data-key="enc-libre-braise"]');
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
    await page.click('[data-key="enc-libre-braise"]');
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
  // E — M05 : la série complète (3 manches) jouée par l’interface, revanches comprises, puis récapitulatif,
  // déblocages, Orin débloqué, deck enrichi des nouveautés et Technique apprise ; rechargement final.
  'E-serie-complete-1280': () => withPage(browser, server.base, { width: 1280, height: 720 }, async (page, check, res) => {
    await page.goto(`${server.base}/?${Q}&reducedMotion=1&profileSeed=${process.env.QA_PROFILE_SEED ?? 20261017}`);
    await newProfile(page, { name: 'QA Série', sig: 'Cendre', techs: ['Lecture', 'Ancrage'] });
    res.duels = [];
    let step = 0;
    for (let n = 0; n < Number(process.env.QA_SERIES_MAX ?? 16) && step < 3; n++) {
      await screenIs(page, 'board');
      await page.click(`[data-key="enc-quai-${step + 1}"]`);
      await screenIs(page, 'prep');
      await page.click('[data-key="prep-start"]');
      const d = await playDuel(page, { name: `E${n}`, useLecture: n % 2 === 0 }, n % 3 === 1 ? 'drag' : 'click');
      await screenIs(page, 'result', 40000);
      const st = await shellState(page);
      await snap(page, `E-resultat-duel${n + 1}-manche${step + 1}-${st.last?.outcome}`);
      res.duels.push({ manche: step + 1, rival: d.personality, winner: d.winner, turns: d.turn, leaks: d.leaks.length, viewErrors: d.viewErrors.length, layout: d.layoutIssues.length, lost: d.lostClicks.length, outcome: st.last?.outcome, unlocked: st.save.collection.variants.length });
      for (const x of [...d.leaks, ...d.viewErrors, ...d.layoutIssues, ...d.lostClicks, ...d.stanceIssues]) res.fails.push(`manche ${step + 1} duel ${n} : ${x}`);
      check(d.outcome === 'ended' && st.last?.outcome === (d.winner === 'me' ? 'victory' : 'defeat'), `manche ${step + 1} (${d.personality}) : duel ${n + 1} terminé, ${st.last?.outcome}`);
      if (st.last?.outcome === 'victory') {
        step++;
        check(st.save.progress.series.step === step, `série à la manche ${step}`);
        if (step < 3) { await page.click('[data-key="result-next"]'); await screenIs(page, 'prep'); await page.click('[data-key="prep-back"]'); }
      } else {
        check(st.save.progress.series.step === step, 'défaite : la série n’avance pas');
        await page.click('[data-key="result-board"]');
      }
    }
    const st = await shellState(page);
    check(step === 3 && st.save.progress.series.completed === 1, `série remportée (${res.duels.length} duels joués)`);
    if (step === 3) {
      check((await page.textContent('.sh-recap'))?.includes('remporté'), 'récapitulatif de série affiché');
      await snap(page, 'E-recapitulatif-serie');
      check(st.save.collection.techniques.includes('Rupture') && st.save.collection.techniques.includes('Dissipation') && st.save.collection.variants.length === 39, 'déblocages : 27 variantes (A, B et C de 9 identités, avenant 09) + Rupture + Dissipation');
      await page.click('[data-key="result-board"]');
      check(await page.locator('[data-key="enc-libre-astre"]:not([disabled])').count() === 1, 'Orin débloqué en duel libre');
      await snap(page, 'E-rencontres-apres-serie');
      await page.click('[data-key="board-collection"]');
      await snap(page, 'E-collection-apres-serie');
      await page.click('[data-key="coll-back"]');
      await page.click('[data-key="enc-libre-astre"]');
      await snap(page, 'E-preparation-orin');
      await page.click('[data-key="prep-back"]');
      await page.click('[data-key="board-deck"]');
      await page.click('[data-key="ver-Cendre-3-variant"]');
      await page.click('[data-key="deck-tech-Lecture"]');
      await page.click('[data-key="deck-tech-Rupture"]');
      await page.click('[data-key="deck-save"]');
      const s2 = await shellState(page);
      check(s2.save.deck.variants.includes('Cendre-3-ferveur') && s2.save.deck.techniques.includes('Rupture'), 'deck enrichi : variante débloquée et Technique apprise équipées');
      await page.reload();
      await screenIs(page, 'home');
      const s3 = await shellState(page);
      check(s3.save.progress.series.completed === 1 && s3.save.deck.techniques.includes('Rupture') && s3.save.history.length === res.duels.length, 'après rechargement : série, collection, deck et historique intacts');
    }
  }),
  // F — M05 : reprise EXACTE en plein duel (rechargement pendant l’engagement), Sauvegarder et quitter,
  // abandon depuis le tableau ; le duel repris se termine et n’est compté qu’une fois.
  'F-reprise-en-plein-duel': () => withPage(browser, server.base, { width: 1280, height: 720 }, async (page, check, res) => {
    await page.goto(`${server.base}/?${Q}&reducedMotion=1&profileSeed=777`);
    await newProfile(page, { name: 'QA Reprise', sig: 'Ronce', techs: ['Sondage', 'Ancrage'] });
    await snap(page, 'F-rencontres-debut');
    await page.click('[data-key="enc-quai-1"]');
    await page.click('[data-key="prep-start"]');
    await page.waitForFunction(() => !!window.__lqv);
    const st0 = newStats();
    for (let i = 0; i < 3; i++) await playTurn(page, { name: 'F', useLecture: false, mode: 'click' }, st0);
    // Au milieu d’un engagement : brouillon non verrouillé (Primaire posée), puis fermeture brutale.
    const { waitDecision } = await import('./browser.mjs');
    let v = await waitDecision(page);
    while (v.phase !== 'COMMIT') { await playTurnOnce(page); v = await waitDecision(page); }
    const before = await page.evaluate(() => ({ hash: window.__lqv.hash(), view: JSON.stringify(window.__lqv.view()), turn: window.__lqv.view().turn }));
    await page.click(`[data-key="hand-${v.me.hand[0].cardId}"]`);
    await page.click('[data-drop="primary"]');
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('lqv.save')).activeDuel);
    check(saved && saved.hash === before.hash && saved.turn === before.turn, `duel sauvegardé à chaque commande (tour ${before.turn}, ${saved?.commands.length} commandes)`);
    await page.reload();
    await screenIs(page, 'home');
    check((await page.textContent('[data-key="home-continue"]')).includes('Reprendre le duel contre Kaï'), 'accueil : « Reprendre le duel contre Kaï »');
    await snap(page, 'F-accueil-reprendre');
    await page.click('[data-key="home-continue"]');
    await page.waitForFunction(() => !!window.__lqv);
    const after = await page.evaluate(() => ({ hash: window.__lqv.hash(), view: JSON.stringify(window.__lqv.view()), draft: window.__lqv.controller.ui.draft.primaryId }));
    check(after.hash === before.hash, 'reprise exacte : même hash (état, zones, RNG, journal)');
    check(after.view === before.view, 'reprise exacte : vue du joueur identique (main, cases, PV, Insight, phase)');
    check(after.draft === null, 'brouillon non verrouillé non conservé (annoncé dans le menu)');
    // Sauvegarder et quitter, puis reprendre depuis le tableau.
    await page.click('[data-key="tool-menu"]');
    await page.click('[data-key="menu-quit"]');
    await screenIs(page, 'board');
    check(await page.locator('.sh-active').count() === 1 && await page.locator('[data-key="enc-libre-braise"][disabled]').count() === 1, 'tableau : duel en cours signalé, autres rencontres bloquées');
    await snap(page, 'F-rencontres-duel-en-cours');
    await page.click('[data-key="board-resume"]');
    await page.waitForFunction(() => !!window.__lqv);
    check(await page.evaluate(() => window.__lqv.hash()) === before.hash, 'Sauvegarder et quitter → Reprendre : même état');
    const d = await playDuel(page, { name: 'F2', useLecture: false }, 'click');
    res.duel = d;
    await screenIs(page, 'result', 40000);
    const st = await shellState(page);
    check(st.save.history.length === 1 && st.save.activeDuel === null, 'duel repris terminé : compté une seule fois, plus de duel en cours');
    // Rechargement pendant la résolution d’un Clash : reprise à l’état résolu, sans plantage.
    await page.click('[data-key="result-board"]');
    await page.click(`[data-key="enc-${st.save.progress.series.step === 1 ? 'quai-2' : 'quai-1'}"]`);
    await page.click('[data-key="prep-start"]');
    await page.waitForFunction(() => !!window.__lqv);
    const st2 = newStats();
    for (let i = 0; i < 12; i++) {
      const w = await waitDecision(page);
      if (w.phase === 'TACTICS' && w.awaitingMe) break;
      await playTurnOnce(page, st2);
    }
    await page.click('[data-key="act-tactics"]');
    await page.waitForFunction(() => window.__lqv.view().phase === 'RESOLVED' || window.__lqv.view().phase === 'REPEL' || window.__lqv.view().phase === 'ENDED');
    const h1 = await page.evaluate(() => window.__lqv.hash());
    await page.reload();
    await page.click('[data-key="home-continue"]');
    await page.waitForFunction(() => !!window.__lqv);
    check(await page.evaluate(() => window.__lqv.hash()) === h1, 'rechargement pendant la résolution : état résolu retrouvé');
    // Abandon depuis le tableau (sans rouvrir le duel).
    await page.click('[data-key="tool-menu"]');
    await page.click('[data-key="menu-quit"]');
    await page.click('[data-key="board-abandon"]');
    await page.click('[data-key="confirm-ok"]');
    await screenIs(page, 'result');
    const st3 = await shellState(page);
    check(st3.last?.outcome === 'abandon' && st3.save.activeDuel === null && st3.save.history.length === 2, 'abandon depuis le tableau : classé à part, duel retiré');
  }),
  // G — M05 : migration d’une VRAIE sauvegarde v1 (écrite par le build M04) au premier chargement.
  'G-migration-v1-reelle': () => withPage(browser, server.base, { width: 1280, height: 720 }, async (page, check) => {
    const v1 = readFileSync('test/fixtures/save-v1-m04.json', 'utf8');
    await page.goto(`${server.base}/?${Q}&reducedMotion=1`);
    await page.evaluate((t) => { localStorage.clear(); localStorage.setItem('lqv.save', t); }, v1);
    await page.reload();
    await screenIs(page, 'home');
    check((await page.textContent('.sh-save-status')).includes('schéma 1'), 'accueil : migration depuis le schéma 1 annoncée');
    await snap(page, 'G-accueil-migration-v1');
    const st = await shellState(page);
    const old = JSON.parse(v1);
    check(st.save.profile.name === old.profile.name && st.save.history.length === old.history.length && JSON.stringify(st.save.deck) === JSON.stringify(old.deck), 'profil, deck et historique conservés');
    const wins = [...new Set(old.history.filter((h) => h.outcome === 'victory').map((h) => h.rival))];
    check(wins.every((r) => st.save.progress.defeated.includes(r)), `rivaux vaincus reconstitués depuis l’historique (${wins.join(', ') || 'aucun'})`);
    await page.click('[data-key="home-continue"]');
    await screenIs(page, 'board');
    check(await page.evaluate(() => JSON.parse(localStorage.getItem('lqv.save')).schemaVersion) === 2, 'réécrite au schéma 2 dès la première écriture');
  }),
  // H — M05 : duel sauvegardé altéré ⇒ reprise refusée avec raison ; recommencer depuis le début.
  'H-reprise-alteree-refusee': () => withPage(browser, server.base, { width: 1280, height: 720 }, async (page, check) => {
    await page.goto(`${server.base}/?${Q}&reducedMotion=1&profileSeed=4242`);
    await newProfile(page, { name: 'QA Altéré', sig: 'Astre', techs: ['Lecture', 'Ancrage'] });
    await page.click('[data-key="enc-quai-1"]');
    await page.click('[data-key="prep-start"]');
    await page.waitForFunction(() => !!window.__lqv);
    const st0 = newStats();
    for (let i = 0; i < 2; i++) await playTurn(page, { name: 'H', useLecture: false, mode: 'click' }, st0);
    await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('lqv.save')); s.activeDuel.config.players.p2.hp = 5; localStorage.setItem('lqv.save', JSON.stringify(s)); });
    await page.reload();
    await page.click('[data-key="home-continue"]');
    await page.waitForSelector('.sh-confirm');
    // Deux refus légitimes selon l’altération : le rejeu échoue (commande devenue illégale) ou il
    // aboutit à un autre état (hash différent). Dans les deux cas, une raison est affichée.
    const why = await page.textContent('.sh-confirm');
    check(/ne retrouve pas|a échoué/.test(why), `reprise refusée, raison affichée : « ${why.match(/Le rejeu[^.]*\./)?.[0] ?? why.slice(0, 80)} »`);
    await snap(page, 'H-reprise-refusee');
    check(!(await page.evaluate(() => !!window.__lqv)), 'aucun duel ouvert sur un état non vérifié');
    await page.click('[data-key="confirm-ok"]');
    await page.waitForFunction(() => !!window.__lqv);
    const v = await page.evaluate(() => window.__lqv.view());
    check(v.turn === 1 && v.opp.hp === 5, 'recommencé depuis le début avec la configuration enregistrée (tour 1)');
  }),
  // I — M08 C3 : duel de la ville contre un duelliste PNJ (rubrique « Duels de la ville »), joué jusqu’au K.-O. par
  // l’interface ; le résultat entre dans l’historique sans aucune progression ni déblocage ; la sauvegarde reste valide.
  'I-duel-de-la-ville-1280': () => withPage(browser, server.base, { width: 1280, height: 720 }, async (page, check, res) => {
    await page.goto(`${server.base}/?${Q}&reducedMotion=1&profileSeed=777`);
    await newProfile(page, { name: 'QA Ville', sig: 'Ronce', techs: ['Lecture', 'Ancrage'] });
    const town = await page.locator('.sh-town [data-encounter]').evaluateAll((els) => els.map((e) => e.getAttribute('data-encounter')));
    check(town.length >= 3 && town.every((id) => id.startsWith('ville-pnj-')), `rubrique « Duels de la ville » : ${town.length} rencontres de PNJ ouvertes d’emblée`);
    await page.click(`[data-key="enc-${town[0]}"]`);
    await screenIs(page, 'prep');
    await page.click('[data-key="prep-start"]');
    const duel = await playDuel(page, { name: 'I', useLecture: true }, 'click');
    res.duel = duel;
    check(duel.outcome === 'ended', `duel joué jusqu’au K.-O. (tour ${duel.turn})`);
    check(String(duel.personality).startsWith('pnj-'), `adversaire : duelliste PNJ (${duel.personality})`);
    await screenIs(page, 'result', 40000);
    let st = await shellState(page);
    check(st.save.history.length === 1 && st.save.history[0].rival === duel.personality, 'résultat enregistré dans l’historique contre le PNJ');
    check(!st.save.progress.met.length && !st.save.progress.defeated.length && !st.save.progress.unlockLog.length, 'aucune progression ni déblocage (entraînement)');
    await page.click('[data-key="result-board"]');
    await screenIs(page, 'board');
    await page.reload();
    st = await shellState(page);
    check(st.load === 'ok' && st.save.history.length === 1, 'sauvegarde valide après un duel de la ville (rechargement)');
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
    console.log(`${name}: ${r.checks.length - r.fails.length}/${r.checks.length} contrôles${d} · console ${r.consoleIssues.length}${r.renderCheck ? ` · rendus comparés ${r.renderCheck.renders}, écarts ${r.renderCheck.mismatches.length}` : ''} · ${r.ms} ms`);
    for (const f of r.fails) console.log(`   ÉCHEC ${f}`);
  }
} finally {
  await browser.close();
  server.stop();
}
const REPORT = process.env.LQV_QA_OUT ?? `${OUT}/qa-product${only ? `-${only}` : ''}.json`;
writeFileSync(REPORT, JSON.stringify(report, null, 2));
const bad = Object.entries(report.runs).filter(([, r]) => r.fails.length || r.consoleIssues.length || r.renderCheck?.mismatches.length || (r.duel && (r.duel.outcome !== 'ended' || r.duel.leaks.length || r.duel.viewErrors.length || r.duel.layoutIssues.length || r.duel.stanceIssues.length || r.duel.lostClicks.length || r.duel.stageGhosts.length)));
if (bad.length) { console.error(`ÉCHEC QA produit : ${bad.map(([n]) => n).join(', ')}`); process.exit(1); }
console.log(`QA produit OK (${Object.keys(report.runs).length} parcours) — ${REPORT}`);
