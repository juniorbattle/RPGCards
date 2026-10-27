// M12 (demande du responsable du 2026-10-27 : « Assurons-nous que le jeu soit bien configuré pour lancer l'aventure,
// comme un nouveau joueur, avec tout bien intégré ») — parcours d'un nouveau joueur dans un navigateur neuf, tout activé
// comme hors QA : cinématiques (`cine=1`), rencontres en vue (`vue=1`), conseils du duel (`conseils=1`), choix de la
// variante (`choix=1`) ; seul le son reste coupé (QA). Écran titre → nouvelle aventure → arrivée sur le Quai
// (cinématique) → prologue contre Kaï (conseils du duel, un à la fois, « Compris » mémorisé) → la foule, l'émissaire
// (cinématique), l'affiliation → les Basics → le premier lieutenant → victoire : écran du choix (A, B ou C) → Collection
// (trois variantes par Rang) → menu (Conseils du duel) → rechargement : même état. Captures, erreurs console.
// Usage : npm run build && [LQV_VP=1920x1080] node tools/m12-nouveau-joueur.mjs [dossier] [rapport.json]
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { launch, startPreview, watchConsole } from './browser.mjs';
import { newStats, playTurn } from './duel-driver.mjs';

const VP = (process.env.LQV_VP ?? '1280x720').split('x').map(Number);
const DIR = process.argv[2] ?? `screenshots/qa/m12/nouveau-joueur-${VP[0]}`;
const OUT = process.argv[3] ?? `artifacts/qa/m12/nouveau-joueur-${VP[0]}.json`;
mkdirSync(DIR, { recursive: true });
mkdirSync(dirname(OUT), { recursive: true });
const server = await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4495, process.env.LQV_DIST || 'dist');
const browser = await launch();
const issues = [];
const checks = [];
const steps = [];
const conseils = [];
const check = (ok, what) => { checks.push(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); console.log(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); };
let n = 0;
try {
  const p = await (await browser.newContext({ viewport: { width: VP[0], height: VP[1] }, deviceScaleFactor: 1 })).newPage();
  p.setDefaultTimeout(Number(process.env.LQV_QA_TIMEOUT) || 90000);
  watchConsole(p, issues);
  const shot = async (name, wait = 900) => {
    await p.waitForTimeout(wait);
    const file = `${DIR}/${String(++n).padStart(2, '0')}-${name}.png`;
    writeFileSync(file, await p.screenshot());
    steps.push({ name, file });
  };
  const av = (fn, arg) => p.evaluate(fn, arg);
  const etat = () => av(() => JSON.parse(JSON.stringify(window.__lqvAventure.save.etat)));
  const townReady = () => p.waitForFunction(() => { const t = window.__lqvAventure?.town; return !!t && t.stats().frames > 1 && !document.querySelector('.ville-host').hidden; }, null, { timeout: 120000 });
  /** Une cinématique en cours : on la regarde un instant (capture), puis « Passer ». */
  const cine = async (nom) => {
    const vue = await p.waitForFunction(() => !!document.querySelector('.av-cine.on'), null, { timeout: 8000 }).then(() => true, () => false);
    if (!vue) return false;
    if (nom) await shot(`cine-${nom}`, 1500);
    await p.click('[data-key="av-cine-passer"]').catch(() => undefined);
    await p.waitForFunction(() => !window.__lqvAventure.cine && !document.querySelector('.av-cine'), null, { timeout: 60000 });
    return true;
  };
  const parler = async (id) => {
    check(await av((x) => window.__lqvAventure.qaDevant(x), id), `devant ${id}`);
    await p.waitForTimeout(700);
    await p.keyboard.press('KeyE');
    await p.waitForSelector('.ville-dialog');
  };
  const duelPret = () => p.waitForFunction(() => !!window.__lqv?.controller?.view?.awaitingMe, null, { timeout: 120000 });
  /** Un guetteur qui a repéré le joueur (rencontres en vue) : le duel forcé se joue (issue imposée), comme le vivrait le
   *  joueur ; renvoie vrai s'il y en a eu un. */
  const rencontreForcee = async () => {
    await p.waitForTimeout(800);
    if (!(await av(() => !!window.__lqvAventure.force))) return false;
    await p.waitForSelector('[data-key="dlg-duel"]', { timeout: 60000 });
    await shot('rencontre-forcee');
    await p.click('[data-key="dlg-duel"]');
    await p.waitForSelector('[data-key="av-preparation"]');
    await p.click('[data-key="av-duel-go"]');
    await duelPret();
    await av(() => window.__lqvAventure.qaTerminer('victoire'));
    await p.waitForSelector('[data-screen="av-resultat"]');
    await p.click('[data-key="av-retour"]');
    await townReady();
    await cine();
    return true;
  };
  /** Lit le conseil affiché (s'il y en a un), le note, puis « Compris ». */
  const compris = async () => {
    const t = await p.$('.tip');
    if (!t) return null;
    const id = await t.getAttribute('data-tip');
    conseils.push(id);
    await p.click('[data-key="tip-ok"]');
    await p.waitForTimeout(250);
    return id;
  };

  await p.goto(`${server.base}/?aventure=1&qa=1&cine=1&vue=1&conseils=1&choix=1&aiDelay=0&profileSeed=5`, { timeout: Number(process.env.LQV_QA_NAV_TIMEOUT) || 90000 });
  await p.waitForSelector('[data-screen="av-titre"]');
  check(!(await p.$('[data-key="av-continue"]')) && !!(await p.$('[data-key="av-new"][data-shell-primary="true"]')), 'navigateur neuf : « Nouvelle aventure » en action principale, rien à continuer');
  await shot('titre');
  await p.click('[data-key="av-new"]');
  await p.fill('[data-key="av-name"]', 'Nouveau');
  await shot('nouvelle-aventure');
  await p.click('[data-key="av-start"]');
  await townReady();
  check(await cine('arrivee-quai'), 'première arrivée sur le Quai : cinématique jouée, passable');
  await shot('quai');

  // Prologue : Kaï ; les conseils du duel paraissent un à un, « Compris » les range
  await parler('kai-prologue');
  await shot('dialogue-kai');
  await p.click('[data-key="dlg-duel"]');
  await p.waitForSelector('[data-key="av-preparation"]');
  await shot('preparation-prologue');
  await p.click('[data-key="av-duel-go"]');
  await duelPret();
  await p.waitForTimeout(1200);
  const premier = await p.$('.tip');
  check(!!premier, `premier duel : un conseil affiché (${premier ? await premier.getAttribute('data-tip') : 'aucun'})`);
  await shot('prologue-conseil');
  // le duel joué par le pilote des QA, tour par tour ; entre deux tours, le conseil affiché est lu puis rangé
  const stats = newStats();
  for (let i = 0; i < 6; i++) {
    await compris();
    const out = await playTurn(p, { name: 'prologue', useLecture: false, mode: 'click' }, stats);
    await compris();
    if (out === 'ended' || out === 'stuck') break;
  }
  const lus = await av(() => window.__lqvAventure.save.conseils ?? []);
  check(lus.length >= 2 && lus.every((x) => conseils.includes(x)), `conseils lus mémorisés dans la sauvegarde de l’aventure (${lus.join(', ')})`);
  if (!(await p.$('[data-screen="av-resultat"]'))) await av(() => window.__lqvAventure.qaTerminer('victoire'));
  await p.waitForSelector('[data-screen="av-resultat"]');
  await shot('prologue-resultat');
  await p.click('[data-key="av-retour"]');
  await townReady();
  // la foule, Kaï, puis l'émissaire qui fend la foule (cinématique), qui présente sa famille
  for (let i = 0; i < 6; i++) {
    if (await p.$('.av-cine.on')) await cine(i === 0 ? 'foule' : 'emissaire');
    const d = await p.waitForSelector('.ville-dialog', { timeout: 20000 }).then(() => true, () => false);
    if (!d) continue;
    if (await p.$('[data-key="dlg-accepter"]')) break;
    if (await p.$('[data-key="dlg-next"]')) await p.click('[data-key="dlg-next"]');
    await p.waitForTimeout(600);
  }
  check(!!(await p.$('[data-key="dlg-accepter"]')), 'l’émissaire propose sa famille (choix libre, ADR 029)');
  await shot('emissaire');
  await p.click('[data-key="dlg-accepter"]');
  await p.waitForSelector('[data-key="av-confirmation"]');
  await shot('confirmation');
  await p.click('[data-key="av-confirmer"]');
  await p.waitForSelector('[data-key="av-recompense"]');
  let e = await etat();
  const f = e.affiliation;
  check(!!f && e.registre.some((g) => g.key === `basics:${f}`), `affiliation : les quatre Basics ${f ? `de ${f}` : ''}`);
  await shot('recompense-basics');
  await p.click('[data-key="av-continuer"]');
  await townReady();
  await cine('affiliation');
  // le cadet lance son défi : la variante au choix est annoncée
  const dlg = await p.waitForSelector('[data-key="dlg-duel"]', { timeout: 20000 }).then(() => true, () => false);
  if (!dlg) await parler(`cadet-${f}`);
  check(/une variante au choix de \S+ III \(\S+, \S+, \S+\)/u.test(await p.textContent('.ville-dialog')), 'défi du cadet : une variante au choix, les trois nommées');
  await shot('defi-cadet');
  await p.click('[data-key="dlg-duel"]');
  await p.waitForSelector('[data-key="av-preparation"]');
  check(await p.locator('.av-enjeu .card').count() === 3, 'préparation : les trois variantes en jeu');
  await shot('preparation-cadet');
  await p.click('[data-key="av-duel-go"]');
  await duelPret();
  await p.waitForTimeout(1200);
  await shot('duel-cadet');
  await compris();
  await av(() => window.__lqvAventure.qaTerminer('victoire'));
  await p.waitForSelector('[data-screen="av-choix"]');
  const choix = await p.$$eval('[data-key^="av-choix-carte-"]', (els) => els.map((x) => x.dataset.key.slice(15)));
  check(choix.length === 3, `écran du choix : trois variantes (${choix.join(', ')})`);
  await shot('choix-variante');
  const reg0 = (await etat()).registre.length;
  await p.click(`[data-key="av-choix-${choix[1]}"]`);
  await p.waitForSelector('[data-screen="av-resultat"]');
  e = await etat();
  check(e.registre.length === reg0 + 1 && e.registre.at(-1).key === `variante:${choix[1]}` && e.deck.cartes.includes(choix[1]), `variante B choisie : au registre et dans le deck (${choix[1]})`);
  await shot('resultat-variante');
  await p.click('[data-key="av-retour"]');
  await townReady();
  await cine();
  // Collection : trois variantes par Rang
  if (await rencontreForcee()) check(true, 'rencontre en vue : un guetteur a repéré le joueur, duel forcé joué');
  await p.click('[data-key="av-deck"]');
  await p.waitForSelector('[data-key="av-collection"]');
  await p.click('[data-key="av-onglet-collection"]');
  await p.waitForSelector(`[data-key="av-col-fam-${f}"]`);
  const cartes = await p.$$eval(`[data-key="av-col-fam-${f}"] .av-col-entree`, (els) => els.length);
  check(cartes === 17, `Collection : 17 cartes par famille (4 Basics, 12 variantes, la Signature) — ${cartes}`);
  await shot('collection');
  await p.click('[data-key="av-deck-close"]');
  // Menu : les conseils du duel se règlent
  if (await rencontreForcee()) check(true, 'rencontre en vue : un guetteur a repéré le joueur, duel forcé joué');
  await p.click('[data-key="av-menu"]');
  await p.waitForSelector('[data-key="menu-conseils"]');
  check(/affichés/.test(await p.textContent('[data-key="menu-conseils"]')), 'menu : « Conseils du duel : affichés »');
  await shot('menu');
  await p.click('[data-key="menu-conseils"]');
  await p.waitForSelector('[data-key="conseils-bascule"]');
  await shot('menu-conseils');
  await p.click('[data-key="dlg-close"]');
  // Rechargement : même état
  const avant = JSON.stringify(await etat());
  await p.reload();
  await p.waitForSelector('[data-key="av-continue"]', { state: 'visible' });
  await p.click('[data-key="av-continue"]');
  await townReady();
  check(JSON.stringify(await etat()) === avant, 'rechargement : même état de l’aventure');
} catch (err) {
  check(false, `exception : ${err.message}`);
} finally {
  await browser.close();
  server.stop();
}
const echecs = checks.filter((c) => c.startsWith('ÉCHEC')).length;
const erreurs = issues.filter((x) => !/^warning/.test(x));
console.log(`${echecs} échec(s) ; console : ${erreurs.length} erreur(s) ; conseils vus : ${conseils.join(', ')}`);
for (const e of erreurs) console.log(' ', e);
writeFileSync(OUT, JSON.stringify({ date: new Date().toISOString(), viewport: VP, checks, conseils, console: issues, steps }, null, 2));
process.exit(echecs || erreurs.length ? 1 : 0);
