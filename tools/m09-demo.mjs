// M09 V2 (provisoire) — parcours de la démo jouable (`?demo=1`) par l’interface, captures à chaque étape (1280×720) :
// accueil → nouvelle partie → arrivée au Quai (tutoriel) → marche (clavier) → guide (dialogue) → défi du docker →
// préparation → duel (tour guidé) → abandon → résultat → « Retour au Quai » (réapparition devant le docker) →
// porte de la salle de jeu (Tournoi, manche 1) → préparation → retour → Fanal verrouillé → Parvis de l’arène (Orin
// verrouillé, défi de la joueuse) → retour au Quai → menu → deck. Erreurs console relevées.
// Usage : npm run build && [LQV_DIST=<dist>] [LQV_VP=1920x1080] node tools/m09-demo.mjs [dossier] [rapport.json]
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { launch, startPreview, watchConsole } from './browser.mjs';

const DIR = process.argv[2] ?? 'screenshots/qa/m09/v2-demo';
const OUT = process.argv[3] ?? 'artifacts/qa/m09/v2-demo.json';
const head = execSync('git rev-parse --short HEAD').toString().trim();
mkdirSync(DIR, { recursive: true });
const VP = (process.env.LQV_VP ?? '1280x720').split('x').map(Number);
const server = await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4283, process.env.LQV_DIST || 'dist');
const browser = await launch();
const issues = [];
const steps = [];
const checks = [];
const check = (ok, what) => { checks.push(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); console.log(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); };
let n = 0;
try {
  const ctx = await browser.newContext({ viewport: { width: VP[0], height: VP[1] }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  p.setDefaultTimeout(90000);
  watchConsole(p, issues);
  const shot = async (name, wait = 1200) => {
    await p.waitForTimeout(wait);
    const file = `${DIR}/${String(++n).padStart(2, '0')}-${name}.png`;
    writeFileSync(file, await p.screenshot());
    steps.push({ name, file });
  };
  const town = () => p.evaluate(() => { const t = window.__lqvDemo?.townHandle; return t ? { pos: t.walker().pos, zone: t.zone()?.id ?? null, frames: t.stats().frames } : null; });
  await p.goto(`${server.base}/?demo=1&qa=1&aiDelay=0&reducedMotion=1`);
  await p.waitForSelector('[data-key="home-new"]', { state: 'visible' });
  await shot('accueil');
  await p.click('[data-key="home-new"]');
  await p.fill('[data-key="new-name"]', 'Démo');
  await p.click('[data-key="new-create"]');
  await p.waitForFunction(() => !!window.__lqvDemo?.townHandle && window.__lqvDemo.townHandle.stats().frames > 1);
  check(await p.evaluate(() => window.__lqvShell.flow.screen === 'board' && !document.querySelector('[data-screen="board"]')), 'après « Créer » : la ville remplace le tableau des rencontres');
  await shot('arrivee-tutoriel');
  check(/Déplacez-vous/.test(await p.textContent('[data-key="ville-tip"]')), 'tutoriel de déplacement affiché à l’arrivée');
  await p.keyboard.down('KeyD');
  await p.waitForFunction(() => window.__lqvDemo.townHandle.walker().pos.x > -14.8, null, { timeout: 120000 });
  await p.keyboard.up('KeyD');
  check(/Approchez/.test(await p.textContent('[data-key="ville-tip"]')), 'après 2 m de marche : le tutoriel passe à « parler »');
  // Guide : placée devant elle, E, quatre pages
  await p.evaluate(() => { const t = window.__lqvDemo.townHandle; t.place(t.ilot.spawns['npc-pnj-marchande-9'], 'gauche'); });
  await p.waitForTimeout(800);
  check((await town()).zone === 'npc-pnj-marchande-9', 'devant la guide : zone « parler » active');
  await shot('bulle-guide');
  await p.keyboard.press('KeyE');
  await p.waitForSelector('.ville-dialog');
  await shot('dialogue-guide');
  for (let i = 0; i < 4; i++) { await p.click('[data-key="dlg-next"]'); await p.waitForTimeout(150); }
  check(await p.evaluate(() => !document.querySelector('.ville-dialog')), 'dialogue de la guide terminé');
  check(await p.waitForFunction(() => /Défiez/.test(document.querySelector('[data-key="ville-objective"]').textContent), null, { timeout: 20000 }).then(() => true, () => false), 'objectif suivant : défier le docker');
  // Docker : défi → préparation → duel → abandon → résultat → retour au Quai
  await p.evaluate(() => { const t = window.__lqvDemo.townHandle; t.place(t.ilot.spawns['npc-pnj-docker-1'], 'droite'); });
  await p.waitForTimeout(800);
  await p.keyboard.press('KeyE');
  await p.waitForSelector('[data-key="dlg-duel"]');
  await shot('defi-docker');
  await p.click('[data-key="dlg-duel"]');
  await p.waitForSelector('[data-screen="prep"]');
  check(await p.evaluate(() => window.__lqvShell.flow.encounterId === 'ville-pnj-docker-1' && window.__lqvShell.d.arena()?.stats().venue === 'rue'), 'préparation du duel du docker, dans la rue');
  await shot('preparation');
  await p.click('[data-key="prep-start"]');
  await p.waitForFunction(() => !!window.__lqv?.controller?.view?.awaitingMe, null, { timeout: 120000 });
  await shot('duel', 2500);
  await p.click('[data-key="tool-menu"]');
  await p.click('[data-key="menu-abandon"]');
  await p.click('[data-key="confirm-ok"]');
  await p.waitForSelector('[data-screen="result"]');
  check((await p.textContent('[data-key="result-board"]')).includes('Retour au Quai'), 'résultat : bouton « Retour au Quai »');
  await shot('resultat');
  await p.click('[data-key="result-board"]');
  await p.waitForFunction(() => window.__lqvShell.flow.screen === 'board' && !document.querySelector('.ville-host').hidden);
  await p.waitForTimeout(800);
  const back = await town();
  const sp = await p.evaluate(() => window.__lqvDemo.townHandle.ilot.spawns['npc-pnj-docker-1']);
  check(back && Math.hypot(back.pos.x - sp.x, back.pos.z - sp.z) < 0.05, `retour au Quai devant le docker (${back && back.pos.x.toFixed(2)}, ${back && back.pos.z.toFixed(2)})`);
  await shot('retour-quai');
  // Porte de la salle de jeu : Tournoi du Quai, manche 1 (Kaï)
  await p.evaluate(() => { const t = window.__lqvDemo.townHandle; t.place({ x: -6.75, z: -2.4 }, 'dos'); });
  await p.waitForTimeout(800);
  check((await town()).zone === 'porte-salle', 'devant la porte de la salle de jeu de cartes');
  await p.keyboard.press('Enter');
  await p.waitForSelector('[data-key="dlg-duel"]');
  await shot('porte-salle');
  await p.click('[data-key="dlg-duel"]');
  await p.waitForSelector('[data-screen="prep"]');
  check(await p.evaluate(() => window.__lqvShell.flow.encounterId === 'quai-1'), 'la porte ouvre la manche 1 du Tournoi du Quai');
  await p.click('[data-key="prep-back"]');
  await p.waitForFunction(() => window.__lqvShell.flow.screen === 'board' && !document.querySelector('.ville-host').hidden);
  check(true, 'retour de la préparation : le Quai');
  // Fanal : Maëlle verrouillée tant qu’on ne l’a pas rencontrée au Tournoi
  await p.evaluate(() => { const t = window.__lqvDemo.townHandle; t.place({ x: 7.2, z: -2.4 }, 'dos'); });
  await p.waitForTimeout(800);
  await p.keyboard.press('KeyE');
  await p.waitForSelector('.ville-dialog');
  check(!(await p.$('[data-key="dlg-duel"]')) && /Rencontrez d’abord/.test(await p.textContent('.ville-dialog')), 'le Fanal : Maëlle verrouillée, raison affichée');
  await shot('fanal-verrouille');
  await p.keyboard.press('Escape');
  // Passage au Parvis de l’arène (sortie est du Quai), Orin verrouillé, défi de la joueuse, retour au Quai
  await p.evaluate(() => { const t = window.__lqvDemo.townHandle; t.place({ x: 18.6, z: 0.4 }, 'droite'); });
  await p.waitForTimeout(800);
  check((await town()).zone === 'sortie-arene', 'au bout du Quai : sortie vers le Parvis');
  await p.keyboard.press('KeyE');
  await p.waitForFunction(() => window.__lqvDemo.townHandle.ilotId() === 'parvis', null, { timeout: 30000 });
  await p.waitForTimeout(1500);
  check(true, 'passage au Parvis de l’arène (fondu, îlot remplacé)');
  await shot('parvis-arrivee');
  await p.evaluate(() => { const t = window.__lqvDemo.townHandle; t.place(t.ilot.spawns['npc-astre'], 'dos'); });
  await p.waitForTimeout(800);
  await p.keyboard.press('KeyE');
  await p.waitForSelector('.ville-dialog');
  check(!(await p.$('[data-key="dlg-duel"]')) && /Remportez le Tournoi/.test(await p.textContent('.ville-dialog')), 'Orin : verrouillé tant que le Tournoi n’est pas remporté, raison affichée');
  await shot('parvis-orin');
  await p.keyboard.press('Escape');
  await p.evaluate(() => { const t = window.__lqvDemo.townHandle; t.place(t.ilot.spawns['npc-pnj-joueuse-5'], 'gauche'); });
  await p.waitForTimeout(800);
  await p.keyboard.press('KeyE');
  await p.waitForSelector('[data-key="dlg-duel"]');
  await p.click('[data-key="dlg-duel"]');
  await p.waitForSelector('[data-screen="prep"]');
  check(await p.evaluate(() => window.__lqvShell.flow.encounterId === 'ville-pnj-joueuse-5'), 'Parvis : défi de la joueuse → préparation');
  await p.click('[data-key="prep-back"]');
  await p.waitForFunction(() => window.__lqvShell.flow.screen === 'board' && !document.querySelector('.ville-host').hidden);
  check(await p.evaluate(() => window.__lqvDemo.townHandle.ilotId() === 'parvis'), 'retour de la préparation : on reste sur le Parvis');
  await p.evaluate(() => { const t = window.__lqvDemo.townHandle; t.place({ x: -13.6, z: 0.4 }, 'gauche'); });
  await p.waitForTimeout(800);
  await p.keyboard.press('KeyE');
  await p.waitForFunction(() => window.__lqvDemo.townHandle.ilotId() === 'quai', null, { timeout: 30000 });
  const arr = await p.evaluate(() => { const t = window.__lqvDemo.townHandle; return { w: t.walker().pos, s: t.ilot.spawns['sortie-arene'] }; });
  check(Math.hypot(arr.w.x - arr.s.x, arr.w.z - arr.s.z) < 0.05, 'retour au Quai, au bout est (point d’arrivée de la liaison)');
  // Les Ruelles (sortie ouest du Quai) : Sélène verrouillée, fontaine, retour
  await p.evaluate(() => { const t = window.__lqvDemo.townHandle; t.place({ x: -18.6, z: 0.4 }, 'gauche'); });
  await p.waitForTimeout(800);
  check((await town()).zone === 'sortie-ruelles', 'au bout ouest du Quai : sortie vers les Ruelles');
  await p.keyboard.press('KeyE');
  await p.waitForFunction(() => window.__lqvDemo.townHandle.ilotId() === 'ruelles', null, { timeout: 30000 });
  await p.waitForTimeout(1500);
  await shot('ruelles-arrivee');
  await p.evaluate(() => { const t = window.__lqvDemo.townHandle; t.place(t.ilot.spawns['npc-voile'], 'droite'); });
  await p.waitForTimeout(800);
  await p.keyboard.press('KeyE');
  await p.waitForSelector('.ville-dialog');
  check(!(await p.$('[data-key="dlg-duel"]')) && /Rencontrez d’abord Sélène/.test(await p.textContent('.ville-dialog')), 'Ruelles : Sélène verrouillée tant qu’on ne l’a pas rencontrée au Tournoi, raison affichée');
  await shot('ruelles-selene');
  await p.keyboard.press('Escape');
  await p.evaluate(() => { const t = window.__lqvDemo.townHandle; t.place({ x: -3.6, z: 1.9 }, 'dos'); });
  await p.waitForTimeout(800);
  await p.keyboard.press('KeyE');
  await p.waitForSelector('.ville-dialog');
  check(/fontaine/i.test(await p.textContent('.ville-dialog')), 'Ruelles : la fontaine (information)');
  await p.keyboard.press('Escape');
  await p.evaluate(() => { const t = window.__lqvDemo.townHandle; t.place({ x: 12.6, z: 0.4 }, 'droite'); });
  await p.waitForTimeout(800);
  await p.keyboard.press('KeyE');
  await p.waitForFunction(() => window.__lqvDemo.townHandle.ilotId() === 'quai', null, { timeout: 30000 });
  const rr = await p.evaluate(() => { const t = window.__lqvDemo.townHandle; return { w: t.walker().pos, s: t.ilot.spawns['sortie-ruelles'] }; });
  check(Math.hypot(rr.w.x - rr.s.x, rr.w.z - rr.s.z) < 0.05, 'retour au Quai, au bout ouest');
  // Menu (Échap)
  await p.keyboard.press('Escape');
  await p.waitForSelector('[data-key="menu-deck"]');
  await shot('menu');
  await p.click('[data-key="menu-deck"]');
  await p.waitForSelector('[data-screen="deck"]');
  // Échap sur l'écran du deck : la ville (en pause) ne doit pas ouvrir son menu par-dessus.
  await p.keyboard.press('Escape');
  await p.waitForTimeout(600);
  check(!(await p.$('.ville-dialog')), 'Échap hors de la ville (deck) : aucun menu de la ville par-dessus');
  if (!(await p.$('[data-screen="deck"]'))) await p.click('[data-key="ville-deck"]');
  await p.waitForSelector('[data-screen="deck"]');
  await p.click('[data-key="deck-back"]');
  await p.waitForFunction(() => window.__lqvShell.flow.screen === 'board' && !document.querySelector('.ville-host').hidden);
  check(true, 'menu → deck → retour au Quai');
  // Menu → Aide : les commandes de la ville en tête (démo seulement), puis retour au Quai.
  await p.keyboard.press('Escape');
  await p.waitForSelector('[data-key="menu-help"]');
  await p.click('[data-key="menu-help"]');
  await p.waitForSelector('[data-screen="help"]');
  check(await p.evaluate(() => document.querySelector('[data-screen="help"] h2')?.textContent === 'La ville (démo)'), 'aide : commandes de la ville en tête');
  await p.click('[data-key="help-back"]');
  await p.waitForFunction(() => window.__lqvShell.flow.screen === 'board' && !document.querySelector('.ville-host').hidden);
  // Menu → « Toutes les rencontres » (tableau classique) → « Retour au Quai »
  await p.keyboard.press('Escape');
  await p.waitForSelector('[data-key="menu-board"]');
  await p.click('[data-key="menu-board"]');
  await p.waitForSelector('[data-screen="board"]');
  check(await p.evaluate(() => document.querySelector('.ville-host').hidden && !!document.querySelector('[data-key="board-ville"]')), 'menu → tableau classique des rencontres, bouton « Retour au Quai »');
  await shot('tableau-classique');
  await p.click('[data-key="board-ville"]');
  await p.waitForFunction(() => !document.querySelector('.ville-host').hidden);
  check(true, 'tableau → retour au Quai');
  // Reprise : au Parvis, rechargement de la page → « Continuer » → même îlot, même endroit ; puis nouvelle partie →
  // tutoriel neuf, arrivée au Quai.
  await p.evaluate(() => { const t = window.__lqvDemo.townHandle; t.place({ x: 18.6, z: 0.4 }, 'droite'); });
  await p.waitForTimeout(800);
  await p.keyboard.press('KeyE');
  await p.waitForFunction(() => window.__lqvDemo.townHandle.ilotId() === 'parvis', null, { timeout: 30000 });
  await p.evaluate(() => { const t = window.__lqvDemo.townHandle; t.place({ x: 5.5, z: 1.2 }, 'droite'); });
  await p.waitForTimeout(500);
  await p.reload();
  await p.waitForSelector('[data-key="home-continue"]', { state: 'visible' });
  await p.click('[data-key="home-continue"]');
  await p.waitForFunction(() => !!window.__lqvDemo?.townHandle && window.__lqvDemo.townHandle.stats().frames > 1, null, { timeout: 120000 });
  const back2 = await p.evaluate(() => { const t = window.__lqvDemo.townHandle; return { ilot: t.ilotId(), pos: t.walker().pos, tip: document.querySelector('[data-key="ville-tip"]')?.hidden }; });
  check(back2.ilot === 'parvis' && Math.hypot(back2.pos.x - 5.5, back2.pos.z - 1.2) < 0.3, `rechargement → Continuer : retour au Parvis, au même endroit (${back2.ilot}, ${back2.pos.x.toFixed(2)}, ${back2.pos.z.toFixed(2)})`);
  check(back2.tip === true, 'tutoriel déjà fait : pas de bulle de tutoriel à la reprise');
  await shot('reprise-parvis');
} catch (e) {
  checks.push(`ÉCHEC exception : ${String(e.message).split('\n')[0]}`);
  console.log('exception', e.message);
} finally {
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify({ date: new Date().toISOString(), commit: head, checks, steps, issues }, null, 2));
  await browser.close();
  server.stop();
}
console.log('console :', issues.length ? issues.slice(0, 10) : 'aucune erreur');
process.exit(checks.every((c) => c.startsWith('OK')) ? 0 : 1);
