// M10-D/E (provisoire) — parcours navigateur de la Joute de la maison et du Championnat des Champions dans le prototype
// `?aventure=1` : l'aventure est avancée jusqu'aux quatre chefs vaincus par des FAITS rejoués dans la machine d'états
// (`qaFaits`, mêmes règles que le jeu), puis : Joute de la Ronce (contrainte, variante II équipée) → porte de l'arène →
// poule des Quatre Bannières (une Signature différente à chaque victoire, changée dans le deck) → le Miroir (Kaï) → la
// Finale (changer de Signature entre deux manches) → titre. Duels lancés pour de vrai, issue imposée en QA (`qaTerminer`).
// Usage : npm run build && [LQV_VP=1920x1080] node tools/m10-championnat.mjs [dossier] [rapport.json]
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { launch, startPreview, watchConsole } from './browser.mjs';

const VP = (process.env.LQV_VP ?? '1280x720').split('x').map(Number);
const DIR = process.argv[2] ?? `screenshots/qa/m10/championnat-${VP[0]}`;
const OUT = process.argv[3] ?? `artifacts/qa/m10/championnat-${VP[0]}.json`;
const head = execSync('git rev-parse --short HEAD').toString().trim();
mkdirSync(DIR, { recursive: true });
const server = await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4292, process.env.LQV_DIST || 'dist');
const browser = await launch();
const issues = [];
const steps = [];
const checks = [];
const check = (ok, what) => { checks.push(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); console.log(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); };
let n = 0;
const ROLES = ['cadet', 'brasDroit', 'chef'];
const conquerir = (f, k) => ROLES.flatMap((r, i) => [{ type: 'lancerDefi', figure: `${r}-${f}` }, { type: 'duelStructurant', figure: `${r}-${f}`, issue: 'victoire', duel: `q${k}${i}` }]);
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
  const duelPret = () => p.waitForFunction(() => !!window.__lqv?.controller?.view?.awaitingMe, null, { timeout: 120000 });
  const gagner = async () => {
    await p.click('[data-key="av-duel-go"]');
    await duelPret();
    await av(() => window.__lqvAventure.qaTerminer('victoire'));
    await p.waitForSelector('[data-screen="av-resultat"]');
    await p.click('[data-key="av-retour"]');
    await townReady();
  };
  const porte = async () => {
    await p.waitForTimeout(400);
    if (await p.$('.ville-dialog')) await p.keyboard.press('Escape');
    await av(() => window.__lqvAventure.town.place({ x: 0, z: -4.4 }, 'dos'));
    await p.waitForTimeout(700);
    await p.keyboard.press('KeyE');
    await p.waitForSelector('.ville-dialog');
  };
  const signature = async (f) => {
    await p.click('[data-key="av-deck"]');
    await p.waitForSelector('[data-key="av-collection"]');
    await p.click(`[data-key="av-sig-${f}"]`);
    await p.click('[data-key="av-deck-save"]');
  };

  await p.goto(`${server.base}/?aventure=1&qa=1&aiDelay=0&reducedMotion=1&profileSeed=9`, { timeout: Number(process.env.LQV_QA_NAV_TIMEOUT) || 90000 });
  await p.click('[data-key="av-new"]');
  await p.fill('[data-key="av-name"]', 'Bo');
  await p.click('[data-key="av-start"]');
  await townReady();
  const faits = [
    { type: 'scene', id: 'P2' }, { type: 'duelPrologue', issue: 'victoire', faits: { assautsGagnes: 1, gardesGagnees: 3, interferencesReussies: 0 } },
    { type: 'confirmer', famille: 'Ronce' }, ...conquerir('Ronce', 'r'),
    { type: 'engager', famille: 'Cendre' }, ...conquerir('Cendre', 'c'),
    { type: 'engager', famille: 'Voile' }, ...conquerir('Voile', 'v'),
    { type: 'engager', famille: 'Astre' }, ...conquerir('Astre', 'a'),
  ];
  const refus = await av((evs) => window.__lqvAventure.qaFaits(evs), faits);
  check(refus.length === 0, `faits rejoués par la machine d'états sans refus (${refus.join(' | ') || 'aucun'})`);
  await townReady();
  let e = await etat();
  check(['Cendre', 'Voile', 'Ronce', 'Astre'].every((f) => e.familles[f] === 'chef') && e.deck.signature === 'Ronce' && !e.deck.cartes.some((c) => c.startsWith('neutre-')), 'quatre chefs vaincus ; deck au format standard, Signature de la Ronce équipée');
  check(/Championnat/.test(await p.textContent('[data-key="ville-objective"]')), 'objectif : le Championnat');
  await shot('quai-quatre-chefs', 2000);

  // Joute de la Ronce (Quai) : contrainte « trois cartes Ronce » respectée, variante II équipée à son gain
  check(await av(() => window.__lqvAventure.qaDevant('joute-Ronce')), 'devant le champion de la Joute de la Ronce');
  await p.waitForTimeout(700);
  await p.keyboard.press('KeyE');
  await p.waitForSelector('[data-key="dlg-duel"]');
  await shot('joute-ronce');
  await p.click('[data-key="dlg-duel"]');
  await p.waitForSelector('[data-key="av-preparation"]');
  await gagner();
  e = await etat();
  check(e.registre.some((g) => g.key === 'variante:Ronce-2-ecaille') && e.deck.cartes.includes('Ronce-2-ecaille'), 'Joute gagnée : variante II au registre, équipée à la place de sa Basic');

  // Parvis, porte de l'arène : poule des Quatre Bannières
  await av(() => window.__lqvAventure.town.place({ x: 18.6, z: 0.4 }, 'droite'));
  await p.waitForTimeout(700);
  await p.keyboard.press('KeyE');
  await p.waitForFunction(() => window.__lqvAventure.town.ilotId() === 'parvis', null, { timeout: 30000 });
  await porte();
  check(!!(await p.$('[data-key="dlg-poule-Cendre"]')), 'porte de l’arène : la poule des Quatre Bannières, chefs à défier');
  await shot('poule');
  await p.click('[data-key="dlg-poule-Cendre"]');
  await p.waitForSelector('[data-key="av-preparation"]');
  await shot('preparation-poule');
  await gagner();
  await porte();
  check(!(await p.$('[data-key^="dlg-poule-"]')) && /changez-la/.test(await p.textContent('.ville-dialog')), 'même Signature : aucun duel de poule possible, raison affichée');
  await shot('poule-signature-deja-utilisee');
  await p.keyboard.press('Escape');
  await signature('Voile');
  await porte();
  await p.click('[data-key="dlg-poule-Voile"]');
  await gagner();
  await signature('Astre');
  await porte();
  await p.click('[data-key="dlg-poule-Astre"]');
  await gagner();
  e = await etat();
  check(Object.keys(e.competitions.championnat.poule).length === 3 && new Set(Object.values(e.competitions.championnat.poule)).size === 3, 'poule : trois chefs vaincus, trois Signatures différentes');
  await porte();
  check(/Miroir/.test(await p.textContent('.ville-dialog')), 'le Miroir : Kaï');
  await shot('miroir');
  await p.click('[data-key="dlg-duel"]');
  await gagner();
  await porte();
  check(/Finale/.test(await p.textContent('.ville-dialog')), 'la Finale : la Tenante du titre');
  await shot('finale');
  await p.click('[data-key="dlg-duel"]');
  await gagner();
  await porte();
  check(!(await p.$('[data-key="dlg-duel"]')) && /Changez de Signature/.test(await p.textContent('.ville-dialog')), 'Finale : même Signature refusée pour la manche suivante');
  await p.keyboard.press('Escape');
  await signature('Cendre');
  await porte();
  await p.click('[data-key="dlg-duel"]');
  await p.click('[data-key="av-duel-go"]');
  await duelPret();
  await av(() => window.__lqvAventure.qaTerminer('victoire'));
  await p.waitForSelector('[data-screen="av-resultat"]');
  await p.click('[data-key="av-retour"]');
  await townReady();
  await p.waitForSelector('.ville-dialog');
  e = await etat();
  check(e.competitions.championnat.titre && /meilleur duelliste/.test(await p.textContent('.ville-dialog')), 'Finale gagnée : titre, proclamation');
  await shot('titre');
  check(/meilleur duelliste/.test(await p.textContent('[data-key="ville-objective"]')), 'objectif : meilleur duelliste de la ville');
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
