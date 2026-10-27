// M10-A/B (provisoire) — parcours du prototype du mode Aventure (`?aventure=1`) par l’interface, captures à chaque étape :
// écran titre → Nouvelle aventure (16 neutres) → le Quai → Kaï (« Pas maintenant », puis défi) → préparation (bandeau du
// deck de prêt) → duel → rechargement pendant le duel → reprise exacte (hash) → abandon → résultat → la foule → premier
// émissaire → « Chercher une autre voie » → les Ruelles → Lior → confirmation → « Revenir » (rien reçu) → confirmation →
// quatre Basics → premier défi de lieutenant → victoire (QA) → variante → revanche (variante suivante) → deck et registre →
// journal → rechargement → reprise au même endroit ; jeu par défaut et sauvegarde standard intacts. Erreurs console.
// Usage : npm run build && [LQV_DIST=<dist>] [LQV_VP=1920x1080] node tools/m10-aventure.mjs [dossier] [rapport.json]
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { launch, startPreview, watchConsole } from './browser.mjs';

const VP = (process.env.LQV_VP ?? '1280x720').split('x').map(Number);
const DIR = process.argv[2] ?? `screenshots/qa/m10/aventure-${VP[0]}`;
const OUT = process.argv[3] ?? `artifacts/qa/m10/aventure-${VP[0]}.json`;
const head = execSync('git rev-parse --short HEAD').toString().trim();
mkdirSync(DIR, { recursive: true });
const server = await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4291, process.env.LQV_DIST || 'dist');
const browser = await launch();
const issues = [];
const steps = [];
const checks = [];
const check = (ok, what) => { checks.push(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); console.log(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); };
const QS = process.env.LQV_AV_QS ?? '';
let n = 0;
try {
  const ctx = await browser.newContext({ viewport: { width: VP[0], height: VP[1] }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  p.setDefaultTimeout(Number(process.env.LQV_QA_TIMEOUT) || 90000);
  watchConsole(p, issues);
  const shot = async (name, wait = 1200) => {
    await p.waitForTimeout(wait);
    const file = `${DIR}/${String(++n).padStart(2, '0')}-${name}.png`;
    writeFileSync(file, await p.screenshot());
    steps.push({ name, file });
  };
  const av = (fn, arg) => p.evaluate(fn, arg);
  const etat = () => av(() => JSON.parse(JSON.stringify(window.__lqvAventure.save.etat)));
  const townReady = () => p.waitForFunction(() => { const t = window.__lqvAventure?.town; return !!t && t.stats().frames > 1 && !document.querySelector('.ville-host').hidden; }, null, { timeout: 120000 });
  const parler = async (id) => {
    check(await av((x) => window.__lqvAventure.qaDevant(x), id), `devant ${id}`);
    await p.waitForTimeout(700);
    await p.keyboard.press('KeyE');
    await p.waitForSelector('.ville-dialog');
  };
  const duelPret = () => p.waitForFunction(() => !!window.__lqv?.controller?.view?.awaitingMe, null, { timeout: 120000 });

  await p.goto(`${server.base}/?aventure=1&qa=1&aiDelay=0&reducedMotion=1&profileSeed=5${QS}`, { timeout: Number(process.env.LQV_QA_NAV_TIMEOUT) || 90000 });
  await p.waitForSelector('[data-key="av-new"]', { state: 'visible' });
  check(!(await p.$('[data-key="av-continue"]')), 'écran titre : pas d’aventure, « Nouvelle aventure » seule');
  await shot('titre');
  await p.click('[data-key="av-new"]');
  await p.waitForSelector('[data-key="av-name"]');
  check((await p.$$('.av-neutre')).length === 4, 'création : les quatre Rangs de cartes grises (×4) présentés');
  await shot('nouvelle-aventure');
  await p.fill('[data-key="av-name"]', 'Ana');
  await p.click('[data-key="av-start"]');
  await townReady();
  let e = await etat();
  check(e.deck.cartes.length === 16 && e.deck.cartes.every((c) => c.startsWith('neutre-')) && e.deck.signature === null, 'départ : deck de 16 neutres, sans Signature');
  check(await av(() => localStorage.getItem('lqv.save') === null && !!localStorage.getItem('lqv.aventure')), 'sauvegarde à part : lqv.aventure écrite, lqv.save jamais créée');
  check(/Kaï/.test(await p.textContent('[data-key="ville-objective"]')) && (await p.textContent('[data-key="av-statut"]')) === 'Sans famille', 'objectif : Kaï ; statut : sans famille');
  await shot('arrivee-quai', 2500);

  // Kaï : « Pas maintenant », puis le défi
  await parler('kai-prologue');
  await shot('kai-defi');
  await p.click('[data-key="dlg-close"]');
  check(/Retournez le voir/.test(await p.textContent('[data-key="ville-objective"]')), '« Pas maintenant » : aucun duel forcé, objectif mis à jour');
  await parler('kai-prologue');
  await p.click('[data-key="dlg-duel"]');
  await p.waitForSelector('[data-key="av-preparation"]');
  check(/cartes grises/.test(await p.textContent('[data-key="av-deck-adverse"]')) && /16 neutres/.test(await p.textContent('[data-key="av-deck-reel"]')), 'préparation : les deux decks annoncés (seize cartes grises de chaque côté)');
  await shot('preparation-prologue');
  await p.click('[data-key="av-duel-go"]');
  await duelPret();
  check(!!(await p.$('[data-key="av-banner"]')), 'duel : bandeau du prototype visible');
  check(await av(() => { const c = window.__lqv.controller; const s = c.match.state; return Object.values(s.cards).length === 32 && Object.values(s.cards).every((x) => x.defId.startsWith('neutre-')); }), 'duel du prologue : seize cartes grises de chaque côté dans le moteur (avenant M10-A)');
  check((await p.$$('.card.fam-neutre')).length > 0, 'duel du prologue : cartes neutres dessinées en main (blanches et grises, sans emblème)');
  await shot('duel-prologue', 2500);
  // un tour joué par l’IA du joueur, puis rechargement : reprise exacte
  const h1 = await av(() => window.__lqv.hash());
  await p.reload();
  await p.waitForSelector('[data-key="av-continue"]', { state: 'visible' });
  check(/Reprendre le duel/.test(await p.textContent('[data-key="av-continue"]')), 'rechargement pendant le duel : « Reprendre le duel en cours »');
  await p.click('[data-key="av-continue"]');
  await duelPret();
  check((await av(() => window.__lqv.hash())) === h1, 'reprise exacte du duel (même hash)');
  await p.click('[data-key="tool-menu"]');
  await p.click('[data-key="menu-abandon"]');
  await p.click('[data-key="confirm-ok"]');
  await p.waitForSelector('[data-screen="av-resultat"]');
  await shot('resultat-prologue');
  await p.click('[data-key="av-retour"]');
  await townReady();
  await p.waitForSelector('.ville-dialog');
  check(/foule/i.test(await p.textContent('.ville-dialog')), 'retour au Quai : la foule');
  await shot('foule');
  await p.click('[data-key="dlg-next"]');
  await p.click('[data-key="dlg-next"]');
  e = await etat();
  check(['Cendre', 'Voile', 'Ronce', 'Astre'].every((f) => e.familles[f] === 'invite') && e.prologue === 'abandon', 'abandon au prologue : les quatre familles invitent quand même');
  check(/remarqué aussi/.test(await p.textContent('.ville-dialog')), `le premier émissaire (${e.premier}) s’avance et cite les trois autres`);
  await shot('premier-emissaire');
  await p.click('[data-key="dlg-chercher"]');
  check(/Lior/.test(await p.textContent('.ville-dialog')) || e.premier === 'Voile', '« Chercher une autre voie » : les autres émissaires et leurs lieux');
  await shot('chercher-voie');
  await p.click('[data-key="dlg-close"]');

  // Les Ruelles : Lior (Voile) ; Revenir puis Confirmer
  await av(() => window.__lqvAventure.town.place({ x: -18.6, z: 0.4 }, 'gauche'));
  await p.waitForTimeout(700);
  await p.keyboard.press('KeyE');
  await p.waitForFunction(() => window.__lqvAventure.town.ilotId() === 'ruelles', null, { timeout: 30000 });
  await p.waitForTimeout(800);
  await shot('ruelles', 2000);
  await parler('emissaire-Voile');
  await p.click('[data-key="dlg-accepter"]');
  await p.waitForSelector('[data-key="av-confirmation"]');
  await shot('confirmation-voile');
  await p.click('[data-key="av-revenir"]');
  e = await etat();
  check(e.affiliation === null && !e.registre.some((g) => g.key.startsWith('basics:')), '« Revenir » : aucune carte familiale avant la confirmation');
  await parler('emissaire-Voile');
  await p.click('[data-key="dlg-accepter"]');
  await p.click('[data-key="av-confirmer"]');
  await p.waitForSelector('[data-key="av-recompense"]');
  e = await etat();
  check(e.affiliation === 'Voile' && e.familles.Voile === 'affilie' && e.registre.some((g) => g.key === 'basics:Voile'), 'confirmation : affilié au Voile, quatre Basics au registre');
  check(e.deck.cartes.filter((c) => c.startsWith('neutre-')).length === 12 && e.deck.cartes.filter((c) => c.startsWith('Voile-')).length === 4, 'deck : 12 neutres + 4 Basics du Voile');
  await shot('basics-voile');
  await p.click('[data-key="av-continuer"]');
  await townReady();
  await p.waitForSelector('[data-key="dlg-duel"]');
  check((await p.textContent('[data-key="av-statut"]')) === 'Voie du Voile', 'statut : voie du Voile');
  await shot('premier-defi', 2000);
  await p.click('[data-key="dlg-duel"]');
  await p.waitForSelector('[data-key="av-preparation"]');
  check(!!(await p.$('.av-enjeu .card')), 'préparation du cadet : l’enjeu (variante) annoncé');
  await shot('preparation-cadet');
  await p.click('[data-key="av-duel-go"]');
  await duelPret();
  await shot('duel-cadet', 2500);
  await av(() => window.__lqvAventure.qaTerminer('victoire'));
  await p.waitForSelector('[data-screen="av-resultat"]');
  e = await etat();
  check(e.registre.some((g) => g.key === 'variante:Voile-3-dissimulation'), 'victoire contre le cadet (issue imposée en QA) : variante III au registre');
  await shot('victoire-cadet');
  await p.click('[data-key="av-retour"]');
  await townReady();
  const nReg = e.registre.length;
  await parler('cadet-Voile');
  check(/Revanche : en jeu/.test(await p.textContent('.ville-dialog')), 'cadet battu : revanche proposée, la variante suivante en jeu (avenant 09)');
  await p.click('[data-key="dlg-duel"]');
  await p.click('[data-key="av-duel-go"]');
  await duelPret();
  await av(() => window.__lqvAventure.qaTerminer('victoire'));
  await p.waitForSelector('[data-screen="av-resultat"]');
  check((await etat()).registre.length === nReg + 1 && (await etat()).registre.some((g) => g.key === 'variante:Voile-3-ombre'), 'revanche gagnée : la variante suivante (B, Ombre portée) au registre, sans duplication');
  await p.click('[data-key="av-retour"]');
  await townReady();
  await p.click('[data-key="av-deck"]');
  await p.waitForSelector('[data-key="av-collection"]');
  check(!(await p.$('[data-key="av-issues"]')), 'deck de l’aventure légal (R-AV)');
  await p.click('[data-key="av-onglet-registre"]');
  await p.waitForSelector('[data-key="av-registre"]');
  await shot('deck-registre');
  await p.click('[data-key="av-deck-close"]');
  await p.click('[data-key="av-journal"]');
  await p.waitForSelector('[data-key="av-journal-panel"]');
  await shot('journal');
  await p.click('[data-key="av-journal-close"]');
  await av(() => window.__lqvAventure.town.place({ x: 4.5, z: 1.2 }, 'droite'));
  await p.waitForTimeout(500);
  await p.reload();
  await p.waitForSelector('[data-key="av-continue"]', { state: 'visible' });
  await shot('titre-reprise');
  await p.click('[data-key="av-continue"]');
  await townReady();
  const back = await av(() => ({ ilot: window.__lqvAventure.town.ilotId(), pos: window.__lqvAventure.town.walker().pos }));
  check(back.ilot === 'ruelles' && Math.hypot(back.pos.x - 4.5, back.pos.z - 1.2) < 0.3, `reprise : les Ruelles, au même endroit (${back.ilot}, ${back.pos.x.toFixed(2)}, ${back.pos.z.toFixed(2)})`);
  // M10-C en avance : bras droit (variante IV), chef (Signature ∞), puis M10-D : défi officiel d’une autre famille
  const vaincre = async (id, shotName) => {
    await parler(id);
    await p.click('[data-key="dlg-duel"]');
    await p.click('[data-key="av-duel-go"]');
    await duelPret();
    await av(() => window.__lqvAventure.qaTerminer('victoire'));
    await p.waitForSelector('[data-screen="av-resultat"]');
    if (shotName) await shot(shotName);
    await p.click('[data-key="av-retour"]');
    await townReady();
  };
  await vaincre('brasDroit-Voile');
  check((await etat()).registre.some((g) => g.key === 'variante:Voile-4-silence'), 'bras droit (Sélène) vaincu : variante IV au registre');
  await vaincre('chef-Voile', 'signature-voile');
  e = await etat();
  check(e.registre.some((g) => g.key === 'signature:Voile') && e.familles.Voile === 'chef' && e.deck.signature === 'Voile', 'chef (Ilse) vaincu : Signature du Voile au registre, équipée ; état « chef »');
  await av(() => window.__lqvAventure.town.place({ x: 12.6, z: 0.4 }, 'droite'));
  await p.waitForTimeout(700);
  await p.keyboard.press('KeyE');
  await p.waitForFunction(() => window.__lqvAventure.town.ilotId() === 'quai', null, { timeout: 30000 });
  await p.waitForTimeout(800);
  await av(() => window.__lqvAventure.town.place({ x: -6.75, z: -2.4 }, 'dos'));
  await p.waitForTimeout(700);
  await p.keyboard.press('KeyE');
  await p.waitForSelector('[data-key="dlg-engager-Ronce"]');
  await shot('salle-des-bannieres');
  await p.click('[data-key="dlg-engager-Ronce"]');
  // M10-D : l'écran de confirmation de l'engagement (ce qui est remis, le deck, la suite)
  await p.waitForSelector('[data-key="av-engagement"]');
  await shot('engagement-ronce');
  await p.click('[data-key="av-engager-confirmer"]');
  await p.waitForSelector('[data-key="av-recompense"]');
  e = await etat();
  check(e.familles.Ronce === 'defiee' && e.registre.filter((g) => g.key === 'basics:Ronce').length === 1 && e.deck.cartes.filter((c) => c.startsWith('neutre-')).length === 8, 'Salle des Bannières : défi de la Ronce engagé, ses quatre Basics une fois, 8 neutres restantes');
  await shot('defi-ronce-engage');
  await p.click('[data-key="av-continuer"]');
  await townReady();
  check(/Gaspard/.test(await p.textContent('[data-key="ville-objective"]')), 'objectif : défier Gaspard, cadet de la Ronce');
  await shot('quai-apres-engagement', 2000);
  // Compétition facultative : l’Épreuve du quartier de la Ronce (trois duels en série, variante I)
  for (let i = 1; i <= 3; i++) {
    await parler('epreuve-Ronce');
    if (i === 1) await shot('epreuve-ronce');
    await p.click('[data-key="dlg-duel"]');
    await p.click('[data-key="av-duel-go"]');
    await duelPret();
    await av(() => window.__lqvAventure.qaTerminer('victoire'));
    await p.waitForSelector('[data-screen="av-resultat"]');
    await p.click('[data-key="av-retour"]');
    await townReady();
  }
  e = await etat();
  check(e.registre.some((g) => g.key === 'variante:Ronce-1-racine') && e.competitions.epreuves.Ronce.gagnee, 'Épreuve du quartier de la Ronce : trois victoires, variante I au registre');
  // ARB-M10-12 : le Quai de l’aventure est le Quai en quatre rangs (diorama admis : en QA) ; avec le décor par code,
  // l’ancien Quai en secours
  const rangs = await av(() => window.__lqvAventure.quaiRangs);
  const attendu = !/decors=code/.test(QS);
  check(rangs === attendu, `Quai de l’aventure : ${rangs ? 'le Quai en quatre rangs (ARB-M10-12)' : 'l’ancien Quai, dessiné par code (secours)'}`);
  check((await p.textContent('[data-key="ville-place"]')) === 'Le Quai', 'HUD : « Le Quai »');
  if (rangs) {
    const dr = await av(() => { const r = window.__lqvAventure.town.decorReport(); return { world: r.world, ilot: r.ilot, loaded: r.loaded, plans: r.unapproved.length }; });
    check(dr.world === 'diorama' && dr.ilot === 'quai', `Quai en rangs : diorama des rangs affiché (${dr.plans} plans non approuvés, QA seulement)`);
    // marche réelle (clavier) au travers du passage ouest, du Quai jusqu’à la rue Haute
    await av(() => window.__lqvAventure.town.place({ x: -12.1, z: -1.8 }, 'dos'));
    await p.waitForTimeout(400);
    await p.keyboard.down('KeyW');
    await p.waitForTimeout(4200);
    await p.keyboard.up('KeyW');
    const zr = await av(() => window.__lqvAventure.town.walker().pos.z);
    check(zr < -11, `marche au clavier au travers du passage ouest jusqu’à la rue Haute (z ${zr.toFixed(1)})`);
    await shot('rang-2-rue-haute', 1500);
    // Mère Aubépine, cheffe de la Ronce, attend dans la ruelle des Lanternes (troisième rang)
    await parler('chef-Ronce');
    const za = await av(() => window.__lqvAventure.town.walker().pos.z);
    check(za < -25 && /Pas encore/.test(await p.textContent('.ville-dialog')), `Mère Aubépine dans la ruelle des Lanternes (rang 3, z ${za.toFixed(1)}) ; défi pas encore ouvert`);
    await shot('rang-3-aubepine');
    await p.click('[data-key="dlg-close"]');
    for (const [sp, nom] of [['placette-puits', 'rang-3-placette-puits'], ['cour-chapelle', 'rang-4-cour-chapelle']]) {
      await av((x) => { const t = window.__lqvAventure.town; t.place(t.ilot.spawns[x], t.ilot.spawns[x].face); }, sp);
      await shot(nom, 1800);
    }
  } else {
    await parler('chef-Ronce');
    const za = await av(() => window.__lqvAventure.town.walker().pos.z);
    check(za > -3.5, `secours : Mère Aubépine devant le Fanal, sur l’ancien Quai (z ${za.toFixed(1)})`);
    await p.click('[data-key="dlg-close"]');
  }
  // Jeu par défaut : aucune trace de l’aventure, sauvegarde standard non créée
  await p.goto(`${server.base}/?qa=1&reducedMotion=1`);
  await p.waitForSelector('[data-key="home-new"]', { state: 'visible' });
  check(!(await p.$('.av-btn, .av-titre')) && (await av(() => localStorage.getItem('lqv.save') === null)), 'jeu par défaut : accueil habituel, sans le mode Aventure ni sa sauvegarde');
} catch (err) {
  checks.push(`ÉCHEC exception : ${String(err.message).split('\n')[0]}`);
  console.log('exception', err.message);
} finally {
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify({ date: new Date().toISOString(), commit: head, viewport: VP, checks, steps, issues }, null, 2));
  await browser.close();
  server.stop();
}
console.log('console :', issues.length ? issues.slice(0, 10) : 'aucune erreur');
process.exit(checks.every((c) => c.startsWith('OK')) && !issues.length ? 0 : 1);
