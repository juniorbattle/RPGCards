// M13 — la musique dans le jeu, au navigateur (contrat `docs/m13/02_MUSIQUE_INTERACTIVE.md`) : le son permis en QA
// (`?son=1`), un geste crée le contexte audio, l'orchestre se charge (instruments calculés dans le worker), puis le
// journal de la musique et l'état de l'orchestre suivent le jeu : accueil (titre), tableau (lounge), duel contre Kaï
// (rôle « kai », thème du duel tant que celui de Kaï n'existe pas), accents des Clashes, fin sur le temps fort et jingle,
// écran de résultat ; aventure (départ au chapitre III) : la ville du Quai arrangée selon le chapitre, le combo du Fanal
// qu'on approche, le focus sous un dialogue ; réglage du volume de la musique ; console vide.
// Usage : npm run build && node tools/m13-jeu.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { launch, startPreview, watchConsole } from './browser.mjs';
import { newStats, playTurn } from './duel-driver.mjs';

const DIR = 'screenshots/qa/m13/jeu';
const OUT = 'artifacts/qa/m13/jeu.json';
mkdirSync(DIR, { recursive: true });
const server = await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4502, process.env.LQV_DIST || 'dist');
const browser = await launch();
const erreurs = [];
const checks = [];
const check = (ok, what) => { checks.push(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); console.log(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); };
const journaux = {};
try {
  // ------------------------------------------------------------ jeu standard
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const p = await ctx.newPage();
  p.setDefaultTimeout(120000);
  watchConsole(p, erreurs);
  const m = (fn) => p.evaluate(fn);
  await p.goto(`${server.base}/?qa=1&son=1&aiDelay=0&pace=instant&reducedMotion=1`);
  await p.waitForSelector('[data-key="home-new"]');
  check((await m(() => window.__lqvSon.musique.journal())).includes('version:I-1'), 'accueil : le titre est demandé (avant tout geste, rien ne joue)');
  check(!(await m(() => window.__lqvSon.musique.active())), 'avant un geste : aucune musique, aucun contexte audio');
  await p.click('[data-key="home-new"]');
  await p.waitForFunction(() => window.__lqvSon.musique.active(), null, { timeout: 90000 });
  check(true, 'premier geste : contexte créé, orchestre chargé, instruments calculés dans le worker');
  await p.waitForTimeout(1500);
  check((await m(() => window.__lqvSon.musique.etat()))?.version === 'I-1', 'le titre joue (I-1)');
  await p.click('[data-key="new-sig-Cendre"]');
  await p.click('[data-key="new-create"]');
  await p.waitForSelector('[data-key="enc-libre-braise"]');
  await p.waitForTimeout(3500);
  check((await m(() => window.__lqvSon.musique.etat()))?.version === 'I-2', 'tableau des rencontres : le lounge (I-2), enchaîné sur la mesure');
  await p.click('[data-key="enc-libre-braise"]');
  await p.click('[data-key="prep-start"]');
  await p.waitForFunction(() => !!window.__lqv?.controller?.view?.awaitingMe, null, { timeout: 120000 });
  check((await m(() => window.__lqvSon.musique.journal())).includes('duel:kai:V-1'), 'duel contre Kaï : rôle « kai », son thème (V-1)');
  await p.waitForTimeout(3500);
  const e0 = await m(() => window.__lqvSon.musique.etat());
  check(e0?.version === 'V-1' && e0.couches.melodie === 0, `le thème de Kaï joue, mélodie en attente (${JSON.stringify(e0?.couches)})`);
  writeFileSync(`${DIR}/duel.png`, await p.screenshot());
  const stats = newStats();
  for (let i = 0; i < 60; i++) {
    // le duel fini, la page passe au résultat (le pilote ne trouve plus le plateau)
    const out = await playTurn(p, { name: 'm13', useLecture: false, mode: 'click' }, stats).catch(() => 'ended');
    if (out === 'ended' || out === 'stuck' || await p.$('[data-key="result-board"]')) break;
  }
  const j = await m(() => window.__lqvSon.musique.journal());
  journaux.standard = j;
  check(j.some((x) => x.startsWith('ponctuation:')), `Clashes : des accents (${j.filter((x) => x.startsWith('ponctuation:')).length})`);
  check(j.some((x) => /^version:V-1:melodie/.test(x)), 'la mélodie est entrée au premier Clash');
  check(j.some((x) => x === 'fin:victoire' || x === 'fin:defaite'), `fin du duel : ${j.find((x) => x.startsWith('fin:'))}`);
  await p.waitForSelector('[data-key="result-board"]', { timeout: 120000 });
  await p.waitForTimeout(6000);
  check((await m(() => window.__lqvSon.musique.etat()))?.version === 'I-2', 'écran de résultat : le lounge après le jingle');
  // le volume de la musique : 0 % arrête tout, 60 % reprend
  await p.click('[data-key="result-board"]');
  await p.click('[data-key="board-home"]');
  await p.click('[data-key="home-options"]');
  for (let i = 0; i < 6; i++) await p.click('[data-key="opt-musique-moins"]');
  check(/coupée/.test(await p.textContent('[data-key="opt-musique-l"]')), 'Options : musique à 0 % (« coupée »)');
  await p.waitForTimeout(800);
  check((await m(() => window.__lqvSon.musique.etat()))?.version === null && !(await m(() => window.__lqvSon.musique.active())), 'à 0 % : plus rien ne joue');
  for (let i = 0; i < 6; i++) await p.click('[data-key="opt-musique-plus"]');
  await p.waitForTimeout(2500);
  check((await m(() => window.__lqvSon.musique.etat()))?.version === 'I-2', 'à 60 % : la musique de l\'écran reprend');
  check(JSON.parse(await m(() => localStorage.getItem('lqv.son'))).musique === 0.6, 'réglage mémorisé (lqv.son)');
  await ctx.close();

  // ------------------------------------------------------------ aventure
  const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const a = await ctx2.newPage();
  a.setDefaultTimeout(120000);
  watchConsole(a, erreurs);
  const am = (fn, arg) => a.evaluate(fn, arg);
  await a.goto(`${server.base}/?aventure=1&qa=1&son=1&aiDelay=0&reducedMotion=1&depart=III&famille=Ronce`, { timeout: 90000 });
  await a.click('[data-key="av-depart"]');
  await a.waitForFunction(() => { const t = window.__lqvAventure?.town; return !!t && t.stats().frames > 1; }, null, { timeout: 120000 });
  await a.waitForFunction(() => window.__lqvSon.musique.active(), null, { timeout: 90000 });
  await a.waitForTimeout(3000);
  const c = await am(() => window.__lqvSon.musique.consigne());
  check(c.version === 'II-1' && c.options?.chapitre === 3, `la ville : le Quai au chapitre III, le trio (${JSON.stringify(c)})`);
  check((await am(() => window.__lqvSon.musique.etat()))?.version === 'II-1', 'la ville joue (II-1)');
  check(await am((x) => window.__lqvAventure.qaDevant(x), 'cadet-Ronce'), 'devant Gaspard, à deux pas du Fanal');
  await a.waitForFunction(() => (window.__lqvSon.musique.etat()?.sources?.fanal?.x ?? 0) > 0.7, null, { timeout: 8000 }).catch(() => undefined);
  const fanal = (await am(() => window.__lqvSon.musique.etat()))?.sources?.fanal;
  check(fanal?.version === 'I-2' && fanal.x > 0.7, `le combo du Fanal s'entend de près (${JSON.stringify(fanal)})`);
  await a.keyboard.press('KeyE');
  await a.waitForSelector('.ville-dialog');
  await a.waitForTimeout(600);
  check((await am(() => window.__lqvSon.musique.etat()))?.focus === true, 'dialogue : la musique s\'efface (focus)');
  writeFileSync(`${DIR}/aventure-dialogue.png`, await a.screenshot());
  journaux.aventure = await am(() => window.__lqvSon.musique.journal());
  await ctx2.close();
} catch (e) {
  check(false, `exception : ${e.message}`);
} finally {
  await browser.close();
  server.stop();
}
check(erreurs.length === 0, `console vide (${erreurs.slice(0, 3).join(' | ')})`);
writeFileSync(OUT, JSON.stringify({ date: new Date().toISOString(), checks, journaux, console: erreurs }, null, 2));
process.exit(checks.some((x) => x.startsWith('ÉCHEC')) ? 1 : 0);
