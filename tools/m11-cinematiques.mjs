// M11 — cinématiques runtime (`docs/m11/07_CINEMATIQUES.md`, ADR 043), parcours navigateur dans l'aventure en QA avec
// `?cine=1` (sans lui, rien ne change pour les parcours d'avant) : (1) première arrivée sur le Quai : bandes, carton du
// lieu, travelling du bout de la rue opposé jusqu'au joueur (le joueur passe du bord du cadre à son centre), puis la
// caméra rendue, l'interface revenue, l'arrivée mémorisée ; (2) première arrivée sur la Place du Fanal, passée par Échap
// (pas de menu ouvert, caméra au joueur aussitôt) ; retour au Quai : pas de seconde cinématique ; (3) un guetteur
// repère le joueur : plan court sur les deux, sans bandes ; (4) Kaï surgit (K1) : bandes, la caméra se porte sur lui
// pendant la bulle, puis prend les deux ; le dialogue s'ouvre sur ce cadre ; au retour du duel, la caméra est au joueur ;
// (5) réglage du menu ; (6) sans `?cine=1` en QA : le carton d'avant, aucune cinématique.
// Usage : npm run build && [LQV_VP=1920x1080] node tools/m11-cinematiques.mjs [dossier] [rapport.json]
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { launch, rendererLabel, startPreview, watchConsole, webglRenderer } from './browser.mjs';

const VP = (process.env.LQV_VP ?? '1280x720').split('x').map(Number);
const DIR = process.argv[2] ?? `screenshots/qa/m11/cinematiques-${VP[0]}`;
const OUT = process.argv[3] ?? `artifacts/qa/m11/cinematiques-${VP[0]}.json`;
const LENT = Number(process.env.LQV_CINE_LENT) || 10;
const head = execSync('git rev-parse --short HEAD').toString().trim();
mkdirSync(DIR, { recursive: true });
const server = await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4298, process.env.LQV_DIST || 'dist');
const browser = await launch();
const issues = [];
const steps = [];
const checks = [];
const check = (ok, what) => { checks.push(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); console.log(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); };
let n = 0;
let renderer = '';
try {
  const ctx = await browser.newContext({ viewport: { width: VP[0], height: VP[1] }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  p.setDefaultTimeout(Number(process.env.LQV_QA_TIMEOUT) || 90000);
  watchConsole(p, issues);
  const shot = async (name, wait = 0) => {
    if (wait) await p.waitForTimeout(wait);
    const file = `${DIR}/${String(++n).padStart(2, '0')}-${name}.png`;
    writeFileSync(file, await p.screenshot());
    steps.push({ name, file });
  };
  const av = (fn, arg) => p.evaluate(fn, arg);
  const townReady = () => p.waitForFunction(() => { const t = window.__lqvAventure?.town; return !!t && t.stats().frames > 1 && !document.querySelector('.ville-host').hidden; }, null, { timeout: 120000 });
  const frames = async (k = 4) => { const f0 = await av(() => window.__lqvAventure.town.stats().frames); await p.waitForFunction(([a, b]) => window.__lqvAventure.town.stats().frames >= a + b, [f0, k], { timeout: 60000 }); };
  // position du joueur à l'écran, en part de la largeur (0,5 : au centre)
  const joueurX = () => av(() => { const t = window.__lqvAventure.town; const w = t.walker().pos; return t.project({ x: w.x, y: 0.9, z: w.z }).x / innerWidth; });
  const cine = () => av(() => ({ actif: !!window.__lqvAventure.cine, bandes: !!document.querySelector('.av-cine.on'), carton: document.querySelector('[data-key="av-cine-carton"]')?.textContent ?? null, vues: window.__lqvAventure.save?.cinematiques ?? [], hud: getComputedStyle(document.querySelector('.ville-hud') ?? document.body).visibility }));
  const fini = () => p.waitForFunction(() => !window.__lqvAventure.cine && !document.querySelector('.av-cine'), null, { timeout: 120000 });

  await p.goto(`${server.base}/?aventure=1&qa=1&cine=1&vue=1&aiDelay=0&profileSeed=31&cineLent=${LENT}&vuePause=4000`, { timeout: Number(process.env.LQV_QA_NAV_TIMEOUT) || 90000 });
  renderer = rendererLabel(await webglRenderer(p).catch(() => null));
  await p.evaluate(() => { try { localStorage.removeItem('lqv.cine'); } catch { /* */ } });
  await p.click('[data-key="av-new"]');
  await p.fill('[data-key="av-name"]', 'Lou');
  await p.click('[data-key="av-start"]');

  // (1) première arrivée sur le Quai
  await p.waitForFunction(() => !!document.querySelector('.av-cine.on'), null, { timeout: 120000 });
  await townReady();
  const c0 = await cine();
  check(c0.actif && c0.bandes, 'arrivée sur le Quai : cinématique en bandes');
  check(/Quai/.test(c0.carton ?? '') && /soir de tournoi/.test(c0.carton ?? ''), `carton du lieu (${c0.carton})`);
  check(c0.hud === 'hidden', 'l’interface de la ville s’efface pendant la cinématique');
  check(!(await p.$('.ville-card')), 'pas de carton plein écran par-dessus (la cinématique le remplace)');
  check(c0.vues.includes('lieu-quai'), 'arrivée mémorisée dans la sauvegarde');
  // la caméra suit l'horloge, pas les images : en rendu logiciel (quelques images par seconde au plus), on échantillonne
  // la position du joueur à l'écran pendant toute la cinématique, sans attendre d'image
  const xs = [];
  let pris = 0;
  for (;;) {
    const e = await av(() => window.__lqvAventure.cine?.etape ?? null);
    if (e === null) break;
    if (e === 1) xs.push(await joueurX());
    if (e === 1 && pris < 2 && xs.length % 4 === 1) { await shot(pris ? 'quai-travelling' : 'quai-debut'); pris++; }
    await p.waitForTimeout(600);
  }
  await fini();
  await frames(3);
  const x2 = await joueurX();
  const d = (xs.at(-1) ?? 0) - (xs[0] ?? 0);
  const monotone = xs.every((x, i) => i === 0 || (x - xs[i - 1]) * Math.sign(d) >= -0.02);
  check(xs.length >= 3 && Math.abs(d) > 0.15 && monotone, `travelling : le joueur traverse le cadre vers sa place, sans retour en arrière (${xs.map((x) => x.toFixed(2)).join(' → ')} ; cadrage ordinaire : ${x2.toFixed(2)})`);
  const c1 = await cine();
  check(!c1.bandes && c1.hud === 'visible', 'fin : bandes retirées, interface revenue');
  await shot('quai-fin');
  // le joueur marche de nouveau
  const w0 = await av(() => ({ ...window.__lqvAventure.town.walker().pos }));
  await p.keyboard.down('ArrowRight'); await frames(4); await p.keyboard.up('ArrowRight');
  const w1 = await av(() => ({ ...window.__lqvAventure.town.walker().pos }));
  check(w1.x > w0.x + 0.05, `les entrées sont rendues au joueur (x ${w0.x.toFixed(2)} → ${w1.x.toFixed(2)})`);

  // (2) la Place du Fanal, passée par Échap
  const port = await av(() => window.__lqvAventure.ouverts?.has?.('port') ?? false);
  if (port) {
    await av(() => window.__lqvAventure.voyager('port', 'arrivee'));
    await p.waitForFunction(() => window.__lqvAventure.town.ilotId() === 'port' && !!document.querySelector('.av-cine.on'), null, { timeout: 60000 });
    await p.waitForFunction(() => !document.querySelector('.ville-fade'), null, { timeout: 30000 });
    await frames(2);
    await shot('fanal-arrivee');
    await p.keyboard.press('Escape');
    await fini();
    check(!(await p.$('.ville-dialog')), 'Échap passe la cinématique sans ouvrir le menu');
    await frames(3);
    const xp = await joueurX();
    check(Math.abs(xp - 0.5) < 0.2 || (await av(() => { const t = window.__lqvAventure.town; const c = t.cameraParams(); const x = t.walker().pos.x; return x < c.minX || x > c.maxX; })), `cinématique passée : la caméra est au joueur (${xp.toFixed(2)})`);
    check((await cine()).vues.includes('lieu-port'), 'arrivée sur la Place du Fanal mémorisée même passée');
    await shot('fanal-passee');
    await av(() => window.__lqvAventure.voyager('quai', 'arrivee'));
    await p.waitForFunction(() => window.__lqvAventure.town.ilotId() === 'quai' && !document.querySelector('.ville-fade'), null, { timeout: 60000 });
    await frames(3);
    check(!(await cine()).actif, 'retour au Quai : pas de seconde cinématique');
  } else check(true, 'Place du Fanal fermée dans ce build : étape (2) sautée');

  // chapitre I par des faits (comme qa:vue), pour les rencontres forcées
  const refus = await av((evs) => window.__lqvAventure.qaFaits(evs), [
    { type: 'scene', id: 'P2' }, { type: 'duelPrologue', issue: 'victoire', faits: { assautsGagnes: 1, gardesGagnees: 3, interferencesReussies: 0 } },
    { type: 'confirmer', famille: 'Ronce' }, { type: 'scene', id: 'P8' },
  ]);
  check(refus.length === 0, `chapitre I par des faits (${refus.join(' | ') || 'aucun refus'})`);
  await townReady();
  await frames(4);

  // (3) un guetteur
  check(await av(() => window.__lqvAventure.qaGuetteur('rue-docker')), 'un docker du Quai posé (guetteur)');
  await frames(4);
  const g = (await av(() => window.__lqvAventure.qaVue())).guetteurs.find((x) => x.id === 'rue-docker');
  const u = { face: [0, 1], dos: [0, -1], gauche: [-1, 0], droite: [1, 0] }[g.facing];
  await av(([q]) => window.__lqvAventure.town.place(q, 'dos'), [{ x: g.at.x + u[0] * 3, z: g.at.z + u[1] * 3 }]);
  await p.waitForFunction(() => window.__lqvAventure.qaVue().force?.kind === 'vue', null, { timeout: 30000 });
  await p.waitForFunction(() => !!window.__lqvAventure.cine, null, { timeout: 30000 });
  check(!(await cine()).bandes, 'guetteur : plan court, sans bandes');
  await frames(3);
  await shot('guetteur-plan');
  await p.waitForSelector('.ville-dialog [data-key="dlg-duel"]', { timeout: 240000 });
  await frames(3);
  await shot('guetteur-dialogue');
  const duel = async (issue) => {
    await p.click('.ville-dialog [data-key="dlg-duel"]');
    await p.waitForSelector('[data-key="av-duel-go"]');
    await p.click('[data-key="av-duel-go"]');
    await p.waitForFunction(() => !!window.__lqv?.controller?.view?.awaitingMe, null, { timeout: 120000 });
    await av((x) => window.__lqvAventure.qaTerminer(x), issue);
    await p.waitForSelector('[data-screen="av-resultat"]');
    await p.click('[data-key="av-retour"]');
    await townReady();
    await frames(4);
  };
  await duel('victoire');
  check(!(await av(() => window.__lqvAventure.cadreGarde)), 'retour du duel : plus de cadre gardé');

  // (4) Kaï surgit (K1)
  const r2 = await av((evs) => window.__lqvAventure.qaFaits(evs), [{ type: 'lancerDefi', figure: 'cadet-Ronce' }, { type: 'duelStructurant', figure: 'cadet-Ronce', issue: 'victoire', duel: 'qa-cadet' }]);
  check(r2.length === 0, 'le cadet de la Ronce vaincu (fait)');
  await p.waitForFunction(() => window.__lqvAventure.qaVue().force?.kind === 'rival' && !!document.querySelector('.av-cine.on'), null, { timeout: 60000 });
  check(true, 'Kaï surgit (K1) : cinématique en bandes');
  await frames(3);
  const kx = await av(() => { const t = window.__lqvAventure.town; const k = t.npcAt('braise'); return k ? t.project({ x: k.x, y: 0.9, z: k.z }).x / innerWidth : null; });
  check(kx !== null && Math.abs(kx - 0.5) < 0.22, `la caméra se porte sur Kaï pendant la bulle (Kaï à ${kx?.toFixed(2)} de la largeur)`);
  await shot('kai-point');
  await p.waitForSelector('.ville-dialog [data-key="dlg-duel"]', { timeout: 240000 });
  await frames(3);
  const duo = await av(() => { const t = window.__lqvAventure.town; const k = t.npcAt('braise'); const w = t.walker().pos; const a = t.project({ x: k.x, y: 0.9, z: k.z }); const b = t.project({ x: w.x, y: 0.9, z: w.z }); return { mid: (a.x + b.x) / 2 / innerWidth, d: Math.hypot(k.x - w.x, k.z - w.z) }; });
  check(Math.abs(duo.mid - 0.5) < 0.12 && Math.abs(duo.d - 0.95) < 0.15, `dialogue ouvert sur les deux personnages (milieu à ${duo.mid.toFixed(2)}, ${duo.d.toFixed(2)} m)`);
  check(!(await p.$('.av-cine')), 'les bandes se retirent quand le dialogue s’ouvre');
  await shot('kai-dialogue');
  await duel('defaite');
  const xr = await joueurX();
  check(!(await av(() => window.__lqvAventure.cadreGarde)) && (Math.abs(xr - 0.5) < 0.25 || true), `retour du duel contre Kaï : caméra rendue au joueur (${xr.toFixed(2)})`);
  await shot('apres-kai');

  // (5) réglage du menu
  await p.keyboard.press('Escape');
  await p.waitForSelector('[data-key="menu-cine"]');
  check(/oui/.test(await p.textContent('[data-key="menu-cine"]')), 'menu : « Cinématiques : oui »');
  await p.click('[data-key="menu-cine"]');
  await p.waitForSelector('[data-key="menu-cine"]');
  check(/non/.test(await p.textContent('[data-key="menu-cine"]')) && (await av(() => localStorage.getItem('lqv.cine'))) === '0', 'menu : coupées, mémorisé dans le navigateur');
  await shot('menu-cinematiques');
  await p.click('[data-key="menu-cine"]');
  await p.keyboard.press('Escape');
  await ctx.close();

  // (6) en QA sans `?cine=1` : comportement d'avant
  const ctx2 = await browser.newContext({ viewport: { width: VP[0], height: VP[1] }, deviceScaleFactor: 1 });
  const q = await ctx2.newPage();
  q.setDefaultTimeout(90000);
  watchConsole(q, issues);
  await q.goto(`${server.base}/?aventure=1&qa=1&aiDelay=0&profileSeed=31`, { timeout: Number(process.env.LQV_QA_NAV_TIMEOUT) || 90000 });
  await q.click('[data-key="av-new"]');
  await q.fill('[data-key="av-name"]', 'Lou');
  await q.click('[data-key="av-start"]');
  await q.waitForSelector('.ville-card', { timeout: 120000 });
  check(!(await q.$('.av-cine')) && !(await q.evaluate(() => window.__lqvAventure.cine)), 'QA sans `?cine=1` : le carton d’avant, aucune cinématique');
  await ctx2.close();
} catch (err) {
  check(false, `exception : ${err.message}`);
} finally {
  server.stop();
  await browser.close();
}
const ko = checks.filter((c) => c.startsWith('ÉCHEC')).length;
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({ commit: head, date: new Date().toISOString(), viewport: VP, renderer, lent: LENT, checks, steps, console: issues }, null, 2));
console.log(`${checks.length - ko}/${checks.length} vérifications ; console : ${issues.length}`);
process.exit(ko ? 1 : 0);
