// M09 V2 (provisoire) — parcours de la démo jouable (`?demo=1`) par l’interface, captures à chaque étape (1280×720) :
// accueil → nouvelle partie → arrivée au Quai (tutoriel) → marche (clavier) → guide (dialogue) → défi du docker →
// préparation → duel (tour guidé) → abandon → résultat → « Retour au Quai » (réapparition devant le docker) →
// porte de la salle de jeu (Tournoi, manche 1) → préparation → retour. Erreurs console relevées.
// Usage : npm run build && [LQV_DIST=<dist>] node tools/m09-demo.mjs [dossier] [rapport.json]
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { launch, startPreview, watchConsole } from './browser.mjs';

const DIR = process.argv[2] ?? 'screenshots/qa/m09/v2-demo';
const OUT = process.argv[3] ?? 'artifacts/qa/m09/v2-demo.json';
const head = execSync('git rev-parse --short HEAD').toString().trim();
mkdirSync(DIR, { recursive: true });
const server = await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4283, process.env.LQV_DIST || 'dist');
const browser = await launch();
const issues = [];
const steps = [];
const checks = [];
const check = (ok, what) => { checks.push(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); console.log(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); };
let n = 0;
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
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
  // Menu (Échap)
  await p.keyboard.press('Escape');
  await p.waitForSelector('[data-key="menu-deck"]');
  await shot('menu');
  await p.click('[data-key="menu-deck"]');
  await p.waitForSelector('[data-screen="deck"]');
  await p.click('[data-key="deck-back"]');
  await p.waitForFunction(() => window.__lqvShell.flow.screen === 'board' && !document.querySelector('.ville-host').hidden);
  check(true, 'menu → deck → retour au Quai');
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
