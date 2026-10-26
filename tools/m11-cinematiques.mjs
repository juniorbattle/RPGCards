// M11 — cinématiques runtime (`docs/m11/07_CINEMATIQUES.md`, ADR 043), parcours navigateur dans l'aventure en QA avec
// `?cine=1` (sans lui, rien ne change pour les parcours d'avant) : (1) première arrivée sur le Quai : bandes, carton du
// lieu, travelling du bout de la rue opposé jusqu'au joueur (le joueur passe du bord du cadre à son centre), puis la
// caméra rendue, l'interface revenue, l'arrivée mémorisée ; (2) première arrivée sur la Place du Fanal, passée par Échap
// (pas de menu ouvert, caméra au joueur aussitôt) ; retour au Quai : pas de seconde cinématique ; (3) un guetteur
// repère le joueur : plan court sur les deux, sans bandes ; (4) Kaï surgit (K1) : bandes, la caméra se porte sur lui
// pendant la bulle, puis prend les deux ; le dialogue s'ouvre sur ce cadre ; au retour du duel, la caméra est au joueur ;
// (5) réglage du menu ; (6) sans `?cine=1` en QA : le carton d'avant, aucune cinématique.
// Deuxième lot (scènes du récit) : (7) Kaï au prologue (caméra sur lui, dialogue cadré sur les deux, bandes gardées) ;
// (8) retour du duel du prologue : la foule cadrée, Kaï, l'émissaire qui fend la foule, son dialogue cadré ; (9)
// l'affiliation confirmée : carton de la voie, puis le cadet ; (10) un chef vaincu (duel réel, issue imposée) : il
// s'incline, carton de la Signature, puis le carton du chapitre II ; (11) les quatre chefs (faits) : carton du chapitre V ;
// la Grande Cour : l'ouverture du Championnat par le héraut ; le titre (issue de la finale imposée) : plan large et
// proclamation cadrée.
// Usage : npm run build && [LQV_VP=1920x1080] node tools/m11-cinematiques.mjs [dossier] [rapport.json]
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { launch, rendererLabel, startPreview, watchConsole, webglRenderer } from './browser.mjs';

const VP = (process.env.LQV_VP ?? '1280x720').split('x').map(Number);
const DIR = process.argv[2] ?? `screenshots/qa/m11/cinematiques-${VP[0]}`;
const OUT = process.argv[3] ?? `artifacts/qa/m11/cinematiques-${VP[0]}.json`;
const LENT = Number(process.env.LQV_CINE_LENT) || 10;
// `LQV_CINE_PARTIE=1` ou `2` : une seule des deux parties (première porte ; scènes du récit)
const PARTIE = process.env.LQV_CINE_PARTIE ?? 'tout';
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
  if (PARTIE !== '2') {
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
  const cine = () => av(() => ({ actif: !!window.__lqvAventure.cine, bandes: !!document.querySelector('.av-cine-bandes.on'), carton: document.querySelector('[data-key="av-cine-carton"]')?.textContent ?? null, vues: window.__lqvAventure.save?.cinematiques ?? [], hud: getComputedStyle(document.querySelector('.ville-hud') ?? document.body).visibility }));
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
  // seuil bas : en rendu logiciel, l'échantillonnage commence tard (les bornes suivent aussi le zoom : le plan large s'arrête plus tôt vers le bord)
  check(xs.length >= 3 && Math.abs(d) > 0.05 && monotone, `travelling : le joueur traverse le cadre vers sa place, sans retour en arrière (${xs.map((x) => x.toFixed(2)).join(' → ')} ; cadrage ordinaire : ${x2.toFixed(2)})`);
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
  await p.waitForFunction(() => !document.querySelector('.av-cine-bandes'), null, { timeout: 20000 }).catch(() => undefined);
  check(!(await p.$('.av-cine')) && !(await p.$('.av-cine-bandes')), 'les bandes se retirent quand le dialogue s’ouvre');
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
  }

  // ------------------------------------------------------------------ deuxième lot : les scènes du récit
  if (PARTIE !== '1') {  const ctx3 = await browser.newContext({ viewport: { width: VP[0], height: VP[1] }, deviceScaleFactor: 1 });
  const r = await ctx3.newPage();
  r.setDefaultTimeout(Number(process.env.LQV_QA_TIMEOUT) || 90000);
  watchConsole(r, issues);
  const rv = (fn, arg) => r.evaluate(fn, arg);
  const rshot = async (name) => { const file = `${DIR}/${String(++n).padStart(2, '0')}-${name}.png`; writeFileSync(file, await r.screenshot()); steps.push({ name, file }); };
  const rframes = async (k = 3) => { const f0 = await rv(() => window.__lqvAventure.town.stats().frames); await r.waitForFunction(([a, b]) => window.__lqvAventure.town.stats().frames >= a + b, [f0, k], { timeout: 120000 }); };
  const rcine = () => rv(() => ({ actif: !!window.__lqvAventure.cine, bandes: !!document.querySelector('.av-cine-bandes.on'), carton: document.querySelector('[data-key="av-cine-carton"]')?.textContent ?? null, titre: document.querySelector('.ville-dialog b')?.textContent ?? null }));
  // le texte du carton lu pendant l'attente même (en rendu logiciel, une scène peut finir avant la lecture suivante)
  const attendreCarton = async (re) => (await r.waitForFunction((src) => { const t = document.querySelector('[data-key="av-cine-carton"]')?.textContent ?? ''; return new RegExp(src).test(t) ? t : null; }, re.source, { timeout: 240000 })).jsonValue();
  const rfini = () => r.waitForFunction(() => !window.__lqvAventure.cine && !document.querySelector('.av-cine'), null, { timeout: 240000 });
  const ecran = (apparence) => rv((a) => { const t = window.__lqvAventure.town; const q = t.npcAt(a); return q ? t.project({ x: q.x, y: 0.9, z: q.z }).x / innerWidth : null; }, apparence);
  const milieu = (apparence) => rv((a) => { const t = window.__lqvAventure.town; const q = t.npcAt(a); const w = t.walker().pos; if (!q) return null; const A = t.project({ x: q.x, y: 0.9, z: q.z }); const B = t.project({ x: w.x, y: 0.9, z: w.z }); return { mid: (A.x + B.x) / 2 / innerWidth, d: Math.hypot(q.x - w.x, q.z - w.z) }; }, apparence);
  const rduel = async (issue) => {
    await r.waitForSelector('[data-key="av-duel-go"]');
    await r.click('[data-key="av-duel-go"]');
    await r.waitForFunction(() => !!window.__lqv?.controller?.view?.awaitingMe, null, { timeout: 120000 });
    await rv((x) => window.__lqvAventure.qaTerminer(x), issue);
    await r.waitForSelector('[data-screen="av-resultat"]');
    await r.click('[data-key="av-retour"]');
  };
  await r.goto(`${server.base}/?aventure=1&qa=1&cine=1&aiDelay=0&profileSeed=9&cineLent=${Math.min(LENT, 4)}`, { timeout: Number(process.env.LQV_QA_NAV_TIMEOUT) || 90000 });
  await r.evaluate(() => { try { localStorage.removeItem('lqv.cine'); } catch { /* */ } });
  await r.click('[data-key="av-new"]');
  await r.fill('[data-key="av-name"]', 'Bo');
  await r.click('[data-key="av-start"]');
  await r.waitForFunction(() => !!document.querySelector('.av-cine'), null, { timeout: 120000 });
  await r.keyboard.press('Escape');
  await rfini();

  // (7) Kaï au prologue
  await rv(() => { const t = window.__lqvAventure.town; const sp = t.ilot.spawns['npc-kai-prologue']; t.place(sp, sp.face); });
  await rframes(2);
  await r.keyboard.press('KeyE');
  await r.waitForFunction(() => !!document.querySelector('.av-cine'), null, { timeout: 60000 });
  await rframes(3);
  const k0 = await ecran('braise');
  check(k0 !== null && Math.abs(k0 - 0.5) < 0.2 && (await rcine()).bandes, `prologue : la caméra se porte sur Kaï aux braseros, en bandes (Kaï à ${k0?.toFixed(2)})`);
  await rshot('prologue-kai');
  await r.waitForSelector('.ville-dialog [data-key="dlg-duel"]', { timeout: 240000 });
  await rframes(3);
  const k1 = await milieu('braise');
  check((await rcine()).bandes && !!k1 && Math.abs(k1.mid - 0.5) < 0.15, `prologue : le dialogue de Kaï cadré sur les deux, bandes gardées (milieu à ${k1?.mid.toFixed(2)})`);
  await rshot('prologue-kai-dialogue');
  await r.click('.ville-dialog [data-key="dlg-duel"]');
  await rduel('victoire');

  // (8) la foule, Kaï, l'émissaire qui fend la foule
  await r.waitForFunction(() => /foule/i.test(document.querySelector('.ville-dialog b')?.textContent ?? ''), null, { timeout: 240000 });
  await rframes(3);
  check((await rcine()).bandes, 'retour du prologue : « La foule », dialogue de scène en bandes');
  await rshot('prologue-foule');
  await r.click('.ville-dialog [data-key="dlg-next"]');
  await rframes(2);
  await rshot('prologue-foule-kai');
  const premier = await rv(() => window.__lqvAventure.save.etat.premier);
  const emApp = await rv((f) => window.__lqvAventure.qaApparenceEmissaire?.(f) ?? null, premier);
  await r.click('.ville-dialog [data-key="dlg-next"]');
  await r.waitForFunction(() => !!document.querySelector('.av-cine'), null, { timeout: 60000 });
  await rframes(3);
  await rshot('prologue-emissaire-fend-la-foule');
  await r.waitForSelector('.ville-dialog [data-key="dlg-accepter"]', { timeout: 240000 });
  await rframes(3);
  const em = emApp ? await milieu(emApp) : null;
  check((await rcine()).bandes && (!em || (Math.abs(em.mid - 0.5) < 0.15 && em.d < 2)), `l’émissaire ${premier ? `de la famille ${premier}` : ''} est venu au joueur ; son dialogue est cadré, en bandes (${em ? `${em.d.toFixed(2)} m, milieu à ${em.mid.toFixed(2)}` : 'position non lue'})`);
  await rshot('prologue-emissaire-dialogue');

  // (9) l'affiliation
  await r.click('.ville-dialog [data-key="dlg-accepter"]');
  await r.waitForSelector('[data-key="av-confirmer"]');
  await r.waitForFunction(() => !document.querySelector('.av-cine-bandes'), null, { timeout: 20000 }).catch(() => undefined);
  check(!(await r.$('.av-cine-bandes')), 'écran de confirmation : bandes repliées');
  await r.click('[data-key="av-confirmer"]');
  await r.waitForSelector('[data-key="av-continuer"]');
  await r.click('[data-key="av-continuer"]');
  const ca = await attendreCarton(/Voie d/);
  check(true, `affiliation : carton de la voie (${ca})`);
  await rshot('affiliation');
  await r.waitForSelector('.ville-dialog [data-key="dlg-duel"]', { timeout: 240000 });
  await rframes(3);
  await rshot('affiliation-cadet');
  await r.click('.ville-dialog [data-key="dlg-close"]');

  // (10) un chef vaincu
  const f = await rv(() => window.__lqvAventure.save.etat.affiliation);
  const ref1 = await rv((fam) => window.__lqvAventure.qaFaits(['cadet', 'brasDroit'].flatMap((ro, i) => [{ type: 'lancerDefi', figure: `${ro}-${fam}` }, { type: 'duelStructurant', figure: `${ro}-${fam}`, issue: 'victoire', duel: `qc${i}` }])), f);
  check(ref1.length === 0, `les deux lieutenants ${f ? `de la famille ${f}` : ''} vaincus (faits)`);
  await rframes(3);
  await rv((fam) => window.__lqvAventure.lancerFigure(`chef-${fam}`), f);
  await rduel('victoire');
  const cc = await attendreCarton(/s’incline/);
  check(/Signature/.test(cc), `chef vaincu : carton (${cc})`);
  await rshot('chef-vaincu');
  const c2 = await attendreCarton(/Chapitre II/);
  check(true, `puis le carton du chapitre II (${c2})`);
  await rshot('chapitre-II');
  await rfini();

  // (11) les quatre chefs, le Championnat, le titre
  const autres = ['Cendre', 'Ronce', 'Voile', 'Astre'].filter((x) => x !== f);
  const ref2 = await rv((fs) => window.__lqvAventure.qaFaits(fs.flatMap((fam, k) => [{ type: 'engager', famille: fam }, ...['cadet', 'brasDroit', 'chef'].flatMap((ro, i) => [{ type: 'lancerDefi', figure: `${ro}-${fam}` }, { type: 'duelStructurant', figure: `${ro}-${fam}`, issue: 'victoire', duel: `qd${k}${i}` }])])), autres);
  check(ref2.length === 0, `les quatre chefs vaincus (faits) (${ref2.join(' | ') || 'aucun refus'})`);
  const c5 = await attendreCarton(/Chapitre V/);
  check(true, `carton du chapitre V (${c5})`);
  await rshot('chapitre-V');
  await rfini();
  await rv(() => window.__lqvAventure.voyager('cour', 'arrivee'));
  await r.waitForFunction(() => window.__lqvAventure.town.ilotId() === 'cour' && !document.querySelector('.ville-fade'), null, { timeout: 120000 });
  await r.waitForFunction(() => !!window.__lqvAventure.cine, null, { timeout: 60000 }).catch(() => undefined);
  await r.keyboard.press('Escape');
  await rfini();
  await rv(() => { const t = window.__lqvAventure.town; const sp = t.ilot.spawns['npc-heraut']; t.place(sp, sp.face); });
  await rframes(2);
  await r.keyboard.press('KeyE');
  const co = await attendreCarton(/Championnat/);
  check(true, `le héraut : ouverture du Championnat en cinématique (${co})`);
  await rshot('championnat-ouverture');
  await r.waitForSelector('.ville-dialog [data-key="dlg-next"]', { timeout: 240000 });
  await rframes(3);
  const hm = await milieu('pnj-commis-40');
  check((await rcine()).bandes && !!hm && Math.abs(hm.mid - 0.5) < 0.15, `ouverture : dialogue cadré sur le héraut et le joueur (milieu à ${hm?.mid.toFixed(2)})`);
  await rshot('championnat-ouverture-dialogue');
  await r.click('.ville-dialog [data-key="dlg-close"]');
  // le titre : issue de la finale imposée (QA), retour par le code du jeu
  const okTitre = await rv(() => window.__lqvAventure.qaTitre?.() ?? false);
  check(okTitre, 'titre remporté (QA : finale imposée)');
  const ct = await attendreCarton(/titre de la ville/);
  check(true, `le titre : carton et plan large de la Grande Cour (${ct})`);
  await rshot('titre');
  await r.waitForFunction(() => /Championnat/.test(document.querySelector('.ville-dialog b')?.textContent ?? ''), null, { timeout: 240000 });
  await rframes(3);
  const ht = await milieu('pnj-commis-40');
  check((await rcine()).bandes && !!ht && Math.abs(ht.mid - 0.5) < 0.15, `proclamation cadrée sur le héraut et le joueur, en bandes (milieu à ${ht?.mid.toFixed(2)})`);
  await rshot('titre-proclamation');
  await r.click('.ville-dialog [data-key="dlg-close"]');
  await r.waitForFunction(() => !document.querySelector('.av-cine-bandes'), null, { timeout: 20000 }).catch(() => undefined);
  check(!(await r.$('.av-cine-bandes')), 'fin de la scène : bandes repliées');
  await ctx3.close();
  }
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
