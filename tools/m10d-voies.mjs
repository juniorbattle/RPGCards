// M10-D — parcours complet jusqu'aux quatre chefs au navigateur, par l'interface du mode Aventure : prologue → la Ronce
// acceptée (Gaspard) puis quittée pour la Cendre (Tessa, avant le premier lieutenant : changement d'affiliation) → la
// maison de la Cendre (Tessa, Kaï, Bran) → les Ruelles : parler à Lior n'engage rien → Salle des Bannières (quatre
// bannières) → la Ronce engagée (Basics déjà reçues : rien n'est remis, deck inchangé) → Gaspard, Maëlle, Mère Aubépine
// → le Voile engagé (quatre Basics, 8 → 4 cartes grises) → les Ruelles : Lior, duel JOUÉ jusqu'au bout par le pilote des
// QA, puis Sélène, Ilse, l'Épreuve du Voile (variante I) → l'Astre engagé (4 → 0 : format standard) → le Parvis : Mira,
// Orin, Halvard, la Joute de l'Astre (variante II) → quatre Signatures, une équipée, changée dans le deck → Collection,
// Registre, Journal → rechargement : même état. Chefs à la table avec leur identité V2. Planche des écrans du lot.
// Usage : npm run build && [LQV_GPU=1 CHROMIUM_PATH=<Chrome>] [LQV_VP=1920x1080] [LQV_AV_QS=&decors=code&sprites=code]
//         node tools/m10d-voies.mjs [dossier] [rapport.json]
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { EXTRA_ARGS, launch, rendererLabel, startPreview, watchConsole, webglRenderer } from './browser.mjs';
import { newStats, playTurn } from './duel-driver.mjs';

const VP = (process.env.LQV_VP ?? '1280x720').split('x').map(Number);
const DIR = process.argv[2] ?? `screenshots/qa/m10d/voies-${VP[0]}`;
const OUT = process.argv[3] ?? `artifacts/qa/m10d/voies-${VP[0]}.json`;
const QS = process.env.LQV_AV_QS ?? '';
const head = execSync('git rev-parse --short HEAD').toString().trim();
const commit = execSync('git status --porcelain src').toString().trim() ? `${head}+arbre de travail` : head;
mkdirSync(DIR, { recursive: true });
const server = await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4294, process.env.LQV_DIST || 'dist');
const browser = await launch();
const issues = [];
const steps = [];
const checks = [];
const planche = [];
const check = (ok, what) => { checks.push(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); console.log(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); };
let n = 0;
let renderer = null;
let duelJoue = null;
const grises = (e) => e.deck.cartes.filter((c) => c.startsWith('neutre-')).length;
const SORTIE = { parvis: 'sortie-arene', ruelles: 'sortie-ruelles', quai: 'sortie-quai' };
try {
  const ctx = await browser.newContext({ viewport: { width: VP[0], height: VP[1] }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  p.setDefaultTimeout(Number(process.env.LQV_QA_TIMEOUT) || 90000);
  watchConsole(p, issues);
  const shot = async (name, wait = 1200, titre = null) => {
    await p.waitForTimeout(wait);
    const file = `${DIR}/${String(++n).padStart(2, '0')}-${name}.png`;
    writeFileSync(file, await p.screenshot());
    steps.push({ name, file });
    if (titre) planche.push({ file, titre });
  };
  const av = (fn, arg) => p.evaluate(fn, arg);
  const etat = () => av(() => JSON.parse(JSON.stringify(window.__lqvAventure.save.etat)));
  const texte = (sel) => p.textContent(sel);
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
  /** Un défi gagné (issue imposée en QA) ; pour un chef, son identité V2 à la table. */
  const vaincre = async (id, chef) => {
    await lancer(id);
    if (chef) {
      const rival = await av(() => window.__lqv.presentation().personality);
      check(rival === chef, `${id} : identité V2 du chef à la table (${rival})`);
      await shot(`duel-${id}`, 2500, `Duel contre ${id.replace('chef-', 'le chef — ')} : identité V2 (ADR 034)`);
    }
    await finDuel('victoire');
    await retour();
  };
  /** Change d'îlot par sa sortie (la vraie zone de la ville, touche E). */
  const voyager = async (vers) => {
    const de = await av(() => window.__lqvAventure.town.ilotId());
    const id = vers === 'quai' ? SORTIE.quai : SORTIE[vers];
    const ok = await av(([z]) => {
      const t = window.__lqvAventure.town;
      const zone = t.ilot.zones.find((x) => x.id === z);
      if (!zone) return false;
      const a = zone.area;
      t.place({ x: (a.x0 + a.x1) / 2, z: (a.z0 + a.z1) / 2 }, a.x0 > 0 ? 'droite' : 'gauche');
      return true;
    }, [id]);
    check(ok, `${de} : sortie vers ${vers}`);
    await p.waitForTimeout(600);
    await p.keyboard.press('KeyE');
    await p.waitForFunction((x) => window.__lqvAventure.town.ilotId() === x, vers, { timeout: 30000 });
    await p.waitForTimeout(900);
  };
  const salle = async () => {
    await av(() => window.__lqvAventure.town.place({ x: -6.75, z: -2.4 }, 'dos'));
    await p.waitForTimeout(700);
    await p.keyboard.press('KeyE');
    await p.waitForSelector('[data-key="av-bannieres"]');
  };
  const banniere = (f) => p.getAttribute(`[data-key="av-banniere-${f}"]`, 'data-etat');
  const engager = async (f, shotName) => {
    await salle();
    check((await banniere(f)) === 'engageable', `Salle des Bannières : la bannière ${f} est à engager`);
    await p.click(`[data-key="dlg-engager-${f}"]`);
    await p.waitForSelector('[data-key="av-engagement"]');
    const t = { basics: await texte('[data-key="av-engagement-basics"]'), deck: await texte('[data-key="av-engagement-deck"]') };
    await shot(`engagement-${f}`, 1200, shotName);
    const avant = await etat();
    await p.click('[data-key="av-engager-confirmer"]');
    await p.waitForSelector('[data-key="av-recompense"]');
    const cartes = (await p.$$('[data-key="av-recompense"] .card')).length;
    const notes = await p.$$eval('[data-key^="av-recompense-note-"]', (els) => els.map((x) => x.textContent));
    await shot(`recompense-${f}`, 1200);
    await p.click('[data-key="av-continuer"]');
    await townReady();
    return { avant, apres: await etat(), t, cartes, notes };
  };

  await p.goto(`${server.base}/?aventure=1&qa=1&aiDelay=0&reducedMotion=1&profileSeed=13${QS}`, { timeout: Number(process.env.LQV_QA_NAV_TIMEOUT) || 90000 });
  renderer = await webglRenderer(p);
  await p.click('[data-key="av-new"]');
  await p.fill('[data-key="av-name"]', 'Alex');
  await p.click('[data-key="av-start"]');
  await townReady();
  // Prologue (issue imposée), la foule, le premier émissaire : « Différer »
  await lancer('kai-prologue');
  await finDuel('victoire');
  await retour();
  await p.waitForSelector('.ville-dialog');
  await p.click('[data-key="dlg-next"]');
  await p.click('[data-key="dlg-next"]');
  await p.click('[data-key="dlg-differer"]');
  await p.click('[data-key="dlg-close"]');
  await p.waitForSelector('.ville-dialog', { state: 'detached' });

  // La Ronce acceptée (Gaspard), puis quittée pour la Cendre (Tessa) avant le premier lieutenant
  await parler('emissaire-Ronce');
  await p.click('[data-key="dlg-accepter"]');
  await p.click('[data-key="av-confirmer"]');
  await p.waitForSelector('[data-key="av-recompense"]');
  await p.click('[data-key="av-continuer"]');
  await townReady();
  await p.waitForSelector('[data-key="dlg-close"]');
  await p.click('[data-key="dlg-close"]');
  let e = await etat();
  check(e.affiliation === 'Ronce' && grises(e) === 12, 'affiliation à la Ronce : quatre Basics, 12 cartes grises');
  await parler('cadet-Cendre');
  await p.click('[data-key="dlg-changer"]');
  await p.waitForSelector('[data-key="av-confirmation"]');
  check(/cartes déjà reçues restent à vous.*\(2 après ce changement\)/.test(await texte('[data-key="av-confirmation"]')), 'changement d’affiliation : les cartes reçues restent, le niveau des adversaires annoncé (2)');
  await shot('changement-cendre', 1200, 'Changer de voie avant le premier lieutenant : la Ronce quittée pour la Cendre ; les cartes restent, les adversaires en tiennent compte');
  await p.click('[data-key="av-confirmer"]');
  await p.waitForSelector('[data-key="av-recompense"]');
  await p.click('[data-key="av-continuer"]');
  await townReady();
  await p.waitForSelector('[data-key="dlg-close"]');
  await p.click('[data-key="dlg-close"]');
  e = await etat();
  check(e.affiliation === 'Cendre' && e.familles.Ronce === 'invite' && ['basics:Ronce', 'basics:Cendre'].every((k) => e.registre.some((g) => g.key === k)) && grises(e) === 8, 'changement d’affiliation vers la Cendre : les Basics de la Ronce restent, 8 cartes grises');

  // La maison de la Cendre
  await vaincre('cadet-Cendre');
  await vaincre('brasDroit-Cendre');
  await vaincre('chef-Cendre', 'chef-cendre');
  e = await etat();
  check(e.familles.Cendre === 'chef' && e.deck.signature === 'Cendre', 'Bran vaincu : Signature de la Cendre, équipée');

  // Entrer dans les Ruelles et parler à Lior n'engage pas le défi du Voile
  await voyager('ruelles');
  await parler('cadet-Voile');
  const lior = await texte('.ville-dialog');
  await shot('lior-avant-engagement', 1200, 'Les Ruelles, avant l’engagement : parler à Lior n’engage rien');
  await p.click('[data-key="dlg-close"]');
  e = await etat();
  check(/Salle des Bannières/.test(lior) && e.familles.Voile === 'invite' && !e.registre.some((g) => g.key === 'basics:Voile'), 'entrer dans le quartier du Voile et parler à Lior n’engagent rien (renvoi à la Salle des Bannières)');
  await voyager('quai');

  // Salle des Bannières : quatre bannières
  await salle();
  const etats = {};
  for (const f of ['Cendre', 'Voile', 'Ronce', 'Astre']) etats[f] = await banniere(f);
  check(JSON.stringify(etats) === JSON.stringify({ Cendre: 'accueil', Voile: 'engageable', Ronce: 'engageable', Astre: 'engageable' }), `Salle des Bannières : ${Object.entries(etats).map(([f, x]) => `${f} ${x}`).join(', ')}`);
  await shot('salle-des-bannieres', 1200, 'La Salle des Bannières : les quatre bannières, la Cendre (famille d’accueil) et trois défis à engager');
  await p.click('[data-key="av-bannieres-fermer"]');

  // La Ronce : Basics déjà reçues (affiliation quittée) : rien n'est remis, le deck ne change pas
  let r = await engager('Ronce', 'Engager la Ronce : ses Basics sont déjà à vous (affiliation quittée), rien n’est remis');
  check(/déjà à vous/.test(r.t.basics) && /ne change pas/.test(r.t.deck), `confirmation (Ronce) : « ${r.t.basics.slice(0, 60)}… » ; « ${r.t.deck} »`);
  check(r.cartes === 0 && /déjà à vous/.test(r.notes.join(' ')), 'récompense (Ronce) : aucune carte remise, la raison affichée');
  check(r.apres.familles.Ronce === 'defiee' && r.apres.registre.filter((g) => g.key === 'basics:Ronce').length === 1 && JSON.stringify(r.apres.deck) === JSON.stringify(r.avant.deck), 'Ronce défiée : Basics une seule fois au registre, deck inchangé');
  await vaincre('cadet-Ronce');
  await vaincre('brasDroit-Ronce');
  await vaincre('chef-Ronce', 'chef-ronce');
  e = await etat();
  check(e.familles.Ronce === 'chef' && e.registre.filter((g) => g.kind === 'signature').length === 2 && e.deck.signature === 'Cendre', 'Mère Aubépine vaincue : deux Signatures possédées, la Cendre toujours seule équipée');

  // Le Voile : quatre Basics, 8 → 4 cartes grises
  r = await engager('Voile', 'Engager le Voile : quatre Basics, une carte grise de chaque Rang cède sa place');
  check(/Vous recevrez|cartes de base du Voile \(I à IV\)/.test(r.t.basics) && /8 → 4/.test(r.t.deck), `confirmation (Voile) : « ${r.t.deck} »`);
  check(r.cartes === 4 && grises(r.apres) === 4 && r.apres.registre.some((g) => g.key === 'basics:Voile') && r.apres.registre.some((g) => g.key === 'technique:Dissipation'), 'Voile engagé : quatre Basics et la Dissipation remises, 4 cartes grises restent');
  check(/Gaspard|Lior/.test(await texte('[data-key="ville-objective"]')), `objectif : ${await texte('[data-key="ville-objective"]')}`);
  await voyager('ruelles');
  // Lior : duel JOUÉ par le pilote des QA jusqu'au bout
  const reg0 = (await etat()).registre.length;
  await lancer('cadet-Voile', 'preparation-lior');
  const stats = newStats();
  let outcome = 'running';
  const t0 = Date.now();
  for (let t = 0; t < 90 && outcome !== 'ended' && outcome !== 'stuck'; t++) outcome = await playTurn(p, { name: 'lior', useLecture: false, mode: 'click' }, stats);
  await p.waitForSelector('[data-screen="av-resultat"]', { timeout: 60000 });
  e = await etat();
  const gagne = e.registre.some((g) => g.key === 'variante:Voile-3-dissimulation');
  const dernier = await av(() => window.__lqvAventure.save.historique.at(-1) ?? null);
  duelJoue = { contre: 'Lior', issue: gagne ? 'victoire' : 'defaite', tours: dernier?.turns ?? null, ms: Date.now() - t0, leaks: [...new Set(stats.leaks)] };
  check(outcome === 'ended', `duel contre Lior joué jusqu’au bout par l’interface (${duelJoue.issue}, ${duelJoue.tours} tours, ${Math.round(duelJoue.ms / 1000)} s)`);
  check(!stats.leaks.length, 'duel joué : aucune fuite d’information (vue du joueur)');
  if (!gagne) {
    check(e.registre.length === reg0, 'défaite contre Lior : rien de gagné, le défi reste ouvert');
    await retour();
    await vaincre('cadet-Voile');
  } else await retour();
  await vaincre('brasDroit-Voile');
  await vaincre('chef-Voile', 'chef-voile');
  // L'Épreuve du quartier du Voile : trois victoires, variante I
  for (let i = 1; i <= 3; i++) {
    await parler('epreuve-Voile');
    if (i === 1) await shot('epreuve-voile', 1000, 'L’Épreuve du quartier du Voile (les Ruelles) : variante I en jeu');
    await p.click('[data-key="dlg-duel"]');
    await p.click('[data-key="av-duel-go"]');
    await duelPret();
    await finDuel('victoire');
    await retour();
  }
  e = await etat();
  check(e.familles.Voile === 'chef' && e.registre.some((g) => g.key === 'variante:Voile-1-eclaireur') && e.deck.cartes.includes('Voile-1-eclaireur'), 'Voile : Ilse vaincue, l’Épreuve gagnée (variante I au registre, équipée)');
  await voyager('quai');

  // L'Astre : 4 → 0 cartes grises, format standard
  r = await engager('Astre', 'Engager l’Astre : les dernières cartes grises sortent, le deck passe au format standard');
  check(/4 → 0/.test(r.t.deck) && /Format standard/.test(r.t.deck), `confirmation (Astre) : « ${r.t.deck} »`);
  check(grises(r.apres) === 0 && r.apres.deck.signature === 'Cendre' && /Format standard/.test(r.notes.join(' ')), 'Astre engagé : plus aucune carte grise, 17 cartes au format standard (annoncé)');
  await voyager('parvis');
  await vaincre('cadet-Astre');
  await vaincre('brasDroit-Astre');
  // La Joute de l'Astre (au moins trois familles dans le deck) : variante II
  await parler('joute-Astre');
  check(/Contrainte respectée/.test(await texte('.ville-dialog')), 'Joute de l’Astre : contrainte de construction respectée');
  await shot('joute-astre', 1000, 'La Joute de la maison de l’Astre (le Parvis) : contrainte vérifiée avant le duel');
  await p.click('[data-key="dlg-duel"]');
  await p.click('[data-key="av-duel-go"]');
  await duelPret();
  await finDuel('victoire');
  await retour();
  await vaincre('chef-Astre', 'chef-astre');
  e = await etat();
  check(['Cendre', 'Voile', 'Ronce', 'Astre'].every((f) => e.familles[f] === 'chef'), 'les quatre chefs vaincus');
  check(e.registre.filter((g) => g.kind === 'signature').length === 4 && e.deck.signature === 'Cendre' && e.registre.some((g) => g.key === 'variante:Astre-2-prisme'), 'quatre Signatures possédées, une seule équipée ; Joute de l’Astre gagnée (variante II)');
  check(/Championnat/.test(await texte('[data-key="ville-objective"]')), 'objectif : le Championnat des Champions');

  // Deck : format standard ; changer de Signature (une seule équipée)
  await p.click('[data-key="av-deck"]');
  await p.waitForSelector('[data-key="av-collection"]');
  check(!!(await p.$('[data-key="av-deck-standard"]')), 'éditeur : deck au format standard (17 cartes, validateur du mode Duel)');
  const sigs = await p.$$eval('[data-key^="av-sig-"]', (els) => els.map((x) => x.dataset.key.slice(7)));
  check(JSON.stringify(sigs) === JSON.stringify(['aucune', 'Cendre', 'Voile', 'Ronce', 'Astre']), `éditeur : quatre Signatures possédées au choix (${sigs.join(', ')})`);
  await p.click('[data-key="av-sig-Voile"]');
  await shot('deck-standard', 1200, 'Deck au format standard, quatre Signatures possédées, une seule équipée');
  await p.click('[data-key="av-deck-save"]');
  e = await etat();
  check(e.deck.signature === 'Voile', 'Signature du Voile équipée à la place de celle de la Cendre (une seule)');
  await p.click('[data-key="av-deck"]');
  await p.waitForSelector('[data-key="av-collection"]');
  await p.click('[data-key="av-onglet-collection"]');
  const possede = await p.$$eval('[data-possedee="true"]', (els) => els.length);
  check(possede === 4 * 4 + 8 + 2 + 4, `Collection : ${possede} cartes familiales et Signatures possédées (16 Basics, 10 variantes, 4 Signatures)`);
  await shot('collection-quatre-chefs', 1200, 'Collection après les quatre chefs');
  await p.click('[data-key="av-onglet-registre"]');
  check(/Défi officiel du Voile engagé/.test(await texte('[data-key="av-registre"]')) && /Affiliation de la Ronce/.test(await texte('[data-key="av-registre"]')), 'Registre : origines lisibles (affiliation quittée, défis engagés)');
  await p.click('[data-key="av-deck-close"]');
  await p.click('[data-key="av-journal"]');
  await p.waitForSelector('[data-key="av-journal-panel"]');
  check(/Les trois voies/.test(await texte('[data-key="av-journal-panel"]')), 'Journal : « Les trois voies »');
  await shot('journal', 1000, 'Journal des quêtes : la maison et les trois voies');
  await p.click('[data-key="av-journal-close"]');
  // Rechargement : même état
  const avant = JSON.stringify(await etat());
  await p.reload();
  await p.waitForSelector('[data-key="av-continue"]', { state: 'visible' });
  await p.click('[data-key="av-continue"]');
  await townReady();
  check(JSON.stringify(await etat()) === avant, 'rechargement : état de l’aventure identique');
  check(await av(() => localStorage.getItem('lqv.save') === null), 'sauvegarde du jeu standard jamais créée');
  await ctx.close();

  // Planche des écrans du lot
  const pw = await browser.newPage({ viewport: { width: 1800, height: 1000 } });
  const img = (f) => `data:image/png;base64,${readFileSync(f).toString('base64')}`;
  await pw.setContent(`<!doctype html><meta charset="utf-8"><body style="margin:0;background:#120e14;color:#efe6d6;font:14px system-ui;padding:16px 20px">
<h1 style="font:600 24px Georgia,serif;color:#ffe2a6;margin:0 0 4px">M10-D — les trois autres voies, ${VP[0]}×${VP[1]}</h1>
<p style="margin:0 0 12px;color:#b9ad98">Build ${commit}, ${rendererLabel(renderer)}${QS ? `, ${QS}` : ''}. Parcours par l’interface (<code>tools/m10d-voies.mjs</code>).</p>
<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px">${planche.map((x) => `<figure style="margin:0"><img src="${img(x.file)}" style="width:100%;display:block;border:1px solid #3a3040"><figcaption style="color:#d8ccb4;font-size:13px;margin-top:4px">${x.titre}</figcaption></figure>`).join('')}</div></body>`);
  await pw.waitForTimeout(400);
  const plate = `${DIR}/planche-voies-${VP[0]}.png`;
  writeFileSync(plate, await pw.screenshot({ fullPage: true }));
  steps.push({ name: 'planche-voies', file: plate });
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
