// M10-C — parcours complet d'une famille d'accueil (la Cendre) au navigateur, par l'interface du mode Aventure :
// nouvelle aventure → prologue → Tessa (émissaire) → confirmation → quatre Basics (écran de récompense) → éditeur de
// deck (case par case) → Collection → Registre → Tessa, duel JOUÉ jusqu'au bout par le pilote des QA (victoire : variante
// III ; défaite : défi toujours ouvert, rien de gagné, puis victoire imposée) → revanche (variante suivante) → Kaï, bras droit,
// dans la rue Haute (variante IV) → Bran, chef, dans la cour de la Chapelle (préparation, duel, Signature équipée) →
// Collection finale → rechargement : même état. Puis la planche des écrans de récompense. Erreurs console.
// Usage : npm run build && [LQV_GPU=1 CHROMIUM_PATH=<Chrome>] [LQV_VP=1920x1080] [LQV_AV_QS=&decors=code]
//         node tools/m10c-parcours.mjs [dossier] [rapport.json]
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { EXTRA_ARGS, launch, rendererLabel, startPreview, watchConsole, webglRenderer } from './browser.mjs';
import { newStats, playTurn } from './duel-driver.mjs';

const VP = (process.env.LQV_VP ?? '1280x720').split('x').map(Number);
const DIR = process.argv[2] ?? `screenshots/qa/m10c/parcours-${VP[0]}`;
const OUT = process.argv[3] ?? `artifacts/qa/m10c/parcours-${VP[0]}.json`;
const QS = process.env.LQV_AV_QS ?? '';
const head = execSync('git rev-parse --short HEAD').toString().trim();
const commit = execSync('git status --porcelain src').toString().trim() ? `${head}+arbre de travail` : head;
mkdirSync(DIR, { recursive: true });
const server = await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4293, process.env.LQV_DIST || 'dist');
const browser = await launch();
const issues = [];
const steps = [];
const checks = [];
const recompenses = [];
const check = (ok, what) => { checks.push(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); console.log(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); };
let n = 0;
let renderer = null;
let duelJoue = null;
try {
  const ctx = await browser.newContext({ viewport: { width: VP[0], height: VP[1] }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  p.setDefaultTimeout(Number(process.env.LQV_QA_TIMEOUT) || 90000);
  watchConsole(p, issues);
  const shot = async (name, wait = 1200, recompense = null) => {
    await p.waitForTimeout(wait);
    const file = `${DIR}/${String(++n).padStart(2, '0')}-${name}.png`;
    writeFileSync(file, await p.screenshot());
    steps.push({ name, file });
    if (recompense) recompenses.push({ file, titre: recompense });
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
  const finDuel = async (issue) => {
    await av((x) => window.__lqvAventure.qaTerminer(x), issue);
    await p.waitForSelector('[data-screen="av-resultat"]');
  };
  const retour = async () => { await p.click('[data-key="av-retour"]'); await townReady(); };
  const lancer = async (id, shotPrep) => {
    await parler(id);
    await p.click('[data-key="dlg-duel"]');
    await p.waitForSelector('[data-key="av-preparation"]');
    if (shotPrep) await shot(shotPrep);
    await p.click('[data-key="av-duel-go"]');
    await duelPret();
  };

  await p.goto(`${server.base}/?aventure=1&qa=1&aiDelay=0&reducedMotion=1&profileSeed=11${QS}`, { timeout: Number(process.env.LQV_QA_NAV_TIMEOUT) || 90000 });
  renderer = await webglRenderer(p);
  await p.click('[data-key="av-new"]');
  await p.fill('[data-key="av-name"]', 'Sam');
  await p.click('[data-key="av-start"]');
  await townReady();
  // Prologue : Kaï (issue imposée), la foule, les émissaires
  await lancer('kai-prologue');
  await finDuel('victoire');
  await retour();
  await p.waitForSelector('.ville-dialog');
  await p.click('[data-key="dlg-next"]');
  await p.click('[data-key="dlg-next"]');
  // le premier émissaire (selon les faits publics du duel) : « Différer », puis aller voir Tessa
  await p.click('[data-key="dlg-differer"]');
  await p.click('[data-key="dlg-close"]');
  await p.waitForSelector('.ville-dialog', { state: 'detached' });
  // Tessa, émissaire de la Cendre : confirmation, quatre Basics
  await parler('emissaire-Cendre');
  await p.click('[data-key="dlg-accepter"]');
  await p.waitForSelector('[data-key="av-confirmation"]');
  await p.click('[data-key="av-confirmer"]');
  await p.waitForSelector('[data-key="av-recompense"]');
  let e = await etat();
  check(e.affiliation === 'Cendre' && e.registre.some((g) => g.key === 'basics:Cendre') && e.deck.techniques.includes('Lecture'), 'confirmation : affiliation à la Cendre, quatre Basics et la Lecture');
  await shot('recompense-basics-cendre', 1200, 'Affiliation : les quatre Basics de la Cendre et la Lecture');
  await p.click('[data-key="av-continuer"]');
  await townReady();
  // Tessa lance aussitôt le premier défi : « Plus tard », le temps de regarder le deck
  await p.waitForSelector('[data-key="dlg-duel"]');
  await p.click('[data-key="dlg-close"]');

  // Éditeur de deck : une case, ses choix, retour à une neutre puis à la Basic ; Collection ; Registre
  await p.click('[data-key="av-deck"]');
  await p.waitForSelector('[data-key="av-collection"]');
  check(!!(await p.$('[data-key="av-deck-ok"]')), 'éditeur : deck légal (R-AV)');
  await shot('deck-editeur');
  const iBasic = e.deck.cartes.indexOf('Cendre-3-basic');
  await p.click(`[data-key="av-case-${iBasic}"]`);
  await p.waitForSelector('[data-key="av-choix"]');
  const choix = await p.$$eval('[data-key="av-choix"] [data-key^="av-choix-"]', (els) => els.map((x) => x.dataset.key.slice(9)));
  check(JSON.stringify(choix) === JSON.stringify(['neutre-3', 'Cendre-3-basic']), `case de Cendre III : ${choix.join(', ')}`);
  await shot('deck-choix-case');
  await p.click('[data-key="av-choix-neutre-3"]');
  check(/non enregistrées/.test(await p.textContent('[data-key="av-deck-ok"]')), 'Basic rendue à une neutre : deck légal, modifications non enregistrées');
  await p.click('[data-key="av-deck-reset"]');
  await p.click('[data-key="av-onglet-collection"]');
  await p.waitForSelector('[data-key="av-col-fam-Cendre"]');
  const possede = await p.$$eval('[data-possedee="true"]', (els) => els.map((x) => x.dataset.key));
  check(possede.length === 4 && possede.every((k) => /Cendre-\d-basic/.test(k)), `Collection : ${possede.length} cartes familiales possédées (les Basics de la Cendre)`);
  check(/Battre Tessa/.test(await p.textContent('[data-key="av-col-Cendre-3-ferveur"]')), 'Collection : la variante III dit comment la gagner (Battre Tessa)');
  await shot('collection-depart');
  await p.click('[data-key="av-onglet-registre"]');
  await p.waitForSelector('[data-key="av-registre"]');
  check(/Affiliation de la Cendre/.test(await p.textContent('[data-key="av-registre"]')), 'Registre : origines lisibles');
  await shot('registre-depart');
  await p.click('[data-key="av-deck-close"]');

  // Tessa : duel JOUÉ par le pilote des QA jusqu'au bout
  const reg0 = (await etat()).registre.length;
  await lancer('cadet-Cendre', 'preparation-tessa');
  const stats = newStats();
  let outcome = 'running';
  const t0 = Date.now();
  for (let t = 0; t < 90 && outcome !== 'ended' && outcome !== 'stuck'; t++) outcome = await playTurn(p, { name: 'tessa', useLecture: false, mode: 'click' }, stats);
  await p.waitForSelector('[data-screen="av-resultat"]', { timeout: 60000 });
  e = await etat();
  const gagne = e.registre.some((g) => g.key === 'variante:Cendre-3-ferveur');
  const dernier = await av(() => window.__lqvAventure.save.historique.at(-1) ?? null);
  duelJoue = { issue: gagne ? 'victoire' : 'defaite', tours: dernier?.turns ?? null, combats: e.combats, ms: Date.now() - t0, leaks: [...new Set(stats.leaks)] };
  check(outcome === 'ended', `duel contre Tessa joué jusqu’au bout par l’interface (${duelJoue.issue}, ${Math.round(duelJoue.ms / 1000)} s)`);
  check(!stats.leaks.length, 'duel joué : aucune fuite d’information (vue du joueur)');
  if (gagne) {
    await shot('victoire-tessa-variante-III', 1500, 'Victoire contre Tessa : variante III (Ferveur)');
  } else {
    check(e.registre.length === reg0, 'défaite contre Tessa : rien de gagné');
    await shot('defaite-tessa');
    await retour();
    await parler('cadet-Cendre');
    check(!/Revanche/.test(await p.textContent('.ville-dialog')), 'défaite : le défi de Tessa reste ouvert (pas une revanche)');
    await p.click('[data-key="dlg-duel"]');
    await p.click('[data-key="av-duel-go"]');
    await duelPret();
    await finDuel('victoire');
    e = await etat();
    check(e.registre.some((g) => g.key === 'variante:Cendre-3-ferveur'), 'victoire (imposée) contre Tessa : variante III');
    await shot('victoire-tessa-variante-III', 1500, 'Victoire contre Tessa : variante III (Ferveur)');
  }
  check(e.deck.cartes.includes('Cendre-3-ferveur') && !e.deck.cartes.includes('Cendre-3-basic'), 'la variante III remplace la Basic de son identité dans le deck');
  await retour();
  // Revanche : la variante suivante (avenant 09 : B, Surenchère), la variante équipée reste
  const nReg = (await etat()).registre.length;
  await parler('cadet-Cendre');
  check(/Revanche/.test(await p.textContent('.ville-dialog')), 'Tessa battue : revanche proposée');
  await p.click('[data-key="dlg-duel"]');
  await p.click('[data-key="av-duel-go"]');
  await duelPret();
  await finDuel('victoire');
  e = await etat();
  check(e.registre.length === nReg + 1 && e.registre.some((g) => g.key === 'variante:Cendre-3-surenchere') && e.deck.cartes.includes('Cendre-3-ferveur'), 'revanche gagnée : la variante suivante (Surenchère) au registre ; Ferveur reste équipée');
  await retour();
  // Kaï, bras droit, dans la rue Haute
  await lancer('brasDroit-Cendre');
  await finDuel('victoire');
  e = await etat();
  check(e.registre.some((g) => g.key === 'variante:Cendre-4-contrecoup'), 'Kaï vaincu : variante IV (Contrecoup)');
  await shot('victoire-kai-variante-IV', 1500, 'Victoire contre Kaï : variante IV (Contrecoup)');
  await retour();
  // Bran, chef, dans la cour de la Chapelle : préparation (portrait V2, enjeu Signature), duel, Signature
  await lancer('chef-Cendre', 'preparation-bran');
  const rival = await av(() => window.__lqv.presentation().personality);
  check(rival === 'chef-cendre', `duel contre Bran : identité V2 du chef à la table (${rival})`);
  await shot('duel-bran', 2500);
  await finDuel('victoire');
  e = await etat();
  check(e.registre.some((g) => g.key === 'signature:Cendre') && e.deck.signature === 'Cendre' && e.familles.Cendre === 'chef', 'Bran vaincu : Signature de la Cendre au registre et équipée ; état « chef »');
  await shot('victoire-bran-signature', 1500, 'Victoire contre Bran : la Signature de la Cendre');
  await retour();
  // Collection finale
  await p.click('[data-key="av-deck"]');
  await p.waitForSelector('[data-key="av-collection"]');
  check(!!(await p.$('[data-key="av-deck-ok"]')), 'deck légal après chaque gain (fin de la maison)');
  await shot('deck-fin-maison');
  await p.click('[data-key="av-onglet-collection"]');
  const fin = await p.$$eval('[data-possedee="true"]', (els) => els.map((x) => x.dataset.key));
  check(fin.length === 8, `Collection : 8 cartes de la Cendre possédées (4 Basics, 3 variantes, la Signature) — ${fin.length}`);
  await shot('collection-fin-maison', 1200, 'Collection en fin de maison (Cendre)');
  await p.click('[data-key="av-deck-close"]');
  // Rechargement : même état
  const avant = JSON.stringify(await etat());
  await p.reload();
  await p.waitForSelector('[data-key="av-continue"]', { state: 'visible' });
  await p.click('[data-key="av-continue"]');
  await townReady();
  check(JSON.stringify(await etat()) === avant, 'rechargement : état de l’aventure identique');
  check(await av(() => localStorage.getItem('lqv.save') === null), 'sauvegarde du jeu standard jamais créée');
  await ctx.close();

  // Planche des écrans de récompense
  const pw = await browser.newPage({ viewport: { width: 1800, height: 1000 } });
  const img = (f) => `data:image/png;base64,${readFileSync(f).toString('base64')}`;
  await pw.setContent(`<!doctype html><meta charset="utf-8"><body style="margin:0;background:#120e14;color:#efe6d6;font:14px system-ui;padding:16px 20px">
<h1 style="font:600 24px Georgia,serif;color:#ffe2a6;margin:0 0 4px">M10-C — écrans de récompense d’une maison (la Cendre), ${VP[0]}×${VP[1]}</h1>
<p style="margin:0 0 12px;color:#b9ad98">Build ${commit}, ${rendererLabel(renderer)}. Parcours par l’interface (<code>tools/m10c-parcours.mjs</code>).</p>
<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px">${recompenses.map((r) => `<figure style="margin:0"><img src="${img(r.file)}" style="width:100%;display:block;border:1px solid #3a3040"><figcaption style="color:#d8ccb4;font-size:13px;margin-top:4px">${r.titre}</figcaption></figure>`).join('')}</div></body>`);
  await pw.waitForTimeout(400);
  const plate = `${DIR}/planche-recompenses-${VP[0]}.png`;
  writeFileSync(plate, await pw.screenshot({ fullPage: true }));
  steps.push({ name: 'planche-recompenses', file: plate });
  await pw.close();
} catch (err) {
  check(false, `exception : ${String(err.message).split('\n')[0]}`);
} finally {
  await browser.close();
  server.stop();
}
const failed = checks.filter((c) => c.startsWith('ÉCHEC')).length;
const report = { date: new Date().toISOString(), commit, viewport: VP, qs: QS, chromeArgs: EXTRA_ARGS, renderer: rendererLabel(renderer), duelJoue, checks, steps, issues, ok: failed === 0 && issues.length === 0 };
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log(`${checks.length - failed}/${checks.length} contrôles ; console : ${issues.length ? issues.join(' | ') : 'aucune erreur'}`);
process.exitCode = report.ok ? 0 : 1;
