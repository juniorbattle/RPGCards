// Avenant 09 (M12) — l'éditeur du Duel standard (Basic, A, B, C par identité, collection complète du mode démo) et l'écran
// du choix de la variante dans l'aventure (`?choix=1` : en QA, le choix est sinon pris d'office). Captures et contrôles.
// Usage : npm run build && node tools/m12-editeur-variantes.mjs [dossier]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch, startPreview, watchConsole } from './browser.mjs';

const DIR = process.argv[2] ?? 'screenshots/qa/m12/variantes';
mkdirSync(DIR, { recursive: true });
const server = await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4494, process.env.LQV_DIST || 'dist');
const browser = await launch();
const errors = [];
const checks = [];
const check = (ok, what) => { checks.push(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); console.log(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); };
try {
  // --- Duel standard : éditeur ---------------------------------------------------------------------
  const p = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })).newPage();
  watchConsole(p, errors);
  await p.goto(`${server.base}/?qa=1&reducedMotion=1&sound=0`);
  await p.waitForSelector('[data-key="home-new"]');
  await p.click('[data-key="home-new"]');
  await p.click('[data-key="new-sig-Cendre"]');
  await p.click('[data-key="new-create"]');
  await p.waitForSelector('[data-key="board-home"]');
  await p.click('[data-key="board-deck"]');
  await p.waitForSelector('[data-key="ver-Cendre-1-variant-c"]');
  check(await p.locator('.sh-ident').count() === 16, 'éditeur : 16 identités');
  check(await p.locator('.sh-ident .sh-ver').count() === 64, 'éditeur : quatre versions par identité (Basic, A, B, C)');
  check(await p.locator('[data-key="ver-Cendre-1-variant-b"]:not([disabled])').count() === 1, 'collection de départ : B de Rang I équipable');
  check(await p.locator('[data-key="ver-Cendre-2-variant-b"][disabled]').count() === 1, 'collection de départ : B de Rang II verrouillée');
  await p.click('[data-key="ver-Cendre-1-variant-c"]');
  writeFileSync(join(DIR, 'editeur-depart.png'), await p.screenshot({ fullPage: true }));
  await p.click('[data-key="deck-save"]');
  const deck = await p.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find((k) => k.startsWith('lqv.save')) ?? '') ?? 'null')?.deck);
  check(deck?.variants?.includes('Cendre-1-escarbille'), `deck enregistré avec la variante C (${deck?.variants?.join(', ')})`);
  // mode démo : tout le catalogue
  await p.click('[data-key="deck-back"]');
  await p.click('[data-key="board-home"]');
  await p.click('[data-key="home-options"]');
  await p.click('[data-key="opt-full-on"]');
  await p.click('[data-key="opt-back"]');
  await p.click('[data-key="home-deck"]');
  for (const k of ['Voile-3-variant-b', 'Ronce-4-variant-c', 'Astre-2-variant-b', 'Cendre-4-variant']) await p.click(`[data-key="ver-${k}"]`);
  check(await p.locator('.sh-ver.locked').count() === 0, 'mode démo : aucune version verrouillée');
  writeFileSync(join(DIR, 'editeur-demo.png'), await p.screenshot({ fullPage: true }));
  await p.click('[data-key="deck-save"]');
  await p.click('[data-key="deck-back"]');
  await p.click('[data-key="home-collection"]').catch(() => p.click('[data-key="board-collection"]'));
  await p.waitForSelector('[data-key="coll-Voile-3-ombre"]');
  check((await p.textContent('.sh-head, .sh-screen header, body'))?.includes('sur 68'), 'collection : 68 cartes');
  writeFileSync(join(DIR, 'collection-demo.png'), await p.screenshot({ fullPage: true }));
  // --- Aventure : le choix de la variante après la première victoire contre Tessa (chapitre I, voie de la Cendre) ------
  const a = await (await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 })).newPage();
  a.setDefaultTimeout(Number(process.env.LQV_QA_TIMEOUT) || 90000);
  watchConsole(a, errors);
  await a.goto(`${server.base}/?aventure=1&qa=1&choix=1&aiDelay=0&reducedMotion=1&depart=I&famille=Cendre`, { timeout: Number(process.env.LQV_QA_NAV_TIMEOUT) || 90000 });
  await a.click('[data-key="av-depart"]');
  const townReady = () => a.waitForFunction(() => { const t = window.__lqvAventure?.town; return !!t && t.stats().frames > 1 && !document.querySelector('.ville-host').hidden; }, null, { timeout: 120000 });
  await townReady();
  check(await a.evaluate(() => window.__lqvAventure.qaDevant('cadet-Cendre')), 'devant Tessa');
  await a.waitForTimeout(700);
  await a.keyboard.press('KeyE');
  await a.waitForSelector('.ville-dialog');
  check(/une variante au choix de Cendre III \(Ferveur, Surenchère, Brûlure\)/.test(await a.textContent('.ville-dialog')), 'dialogue de Tessa : une variante au choix, les trois nommées');
  await a.click('[data-key="dlg-duel"]');
  await a.waitForSelector('[data-key="av-preparation"]');
  await a.click('[data-key="av-duel-go"]');
  await a.waitForFunction(() => !!window.__lqv?.controller?.view?.awaitingMe, null, { timeout: 120000 });
  await a.evaluate(() => window.__lqvAventure.qaTerminer('victoire'));
  await a.waitForSelector('[data-screen="av-choix"]');
  const avant = await a.evaluate(() => window.__lqvAventure.save.etat.registre.length);
  check(await a.locator('.av-choix-carte').count() === 3, 'écran du choix : trois variantes');
  await a.waitForTimeout(900);
  writeFileSync(join(DIR, 'aventure-choix.png'), await a.screenshot());
  await a.click('[data-key="av-choix-Cendre-3-brulure"]');
  await a.waitForSelector('[data-screen="av-resultat"]');
  const e = await a.evaluate(() => JSON.parse(JSON.stringify(window.__lqvAventure.save.etat)));
  check(e.registre.length === avant + 1 && e.registre.at(-1).key === 'variante:Cendre-3-brulure' && e.deck.cartes.includes('Cendre-3-brulure'), 'choix : Brûlure au registre et dans le deck');
  await a.waitForTimeout(900);
  writeFileSync(join(DIR, 'aventure-choix-resultat.png'), await a.screenshot());
  await a.click('[data-key="av-retour"]');
  await townReady();
  await a.evaluate(() => window.__lqvAventure.qaDevant('cadet-Cendre'));
  await a.waitForTimeout(700);
  await a.keyboard.press('KeyE');
  await a.waitForSelector('.ville-dialog');
  check(/Revanche : en jeu, Cendre III — Ferveur/.test(await a.textContent('.ville-dialog')), 'revanche : la variante suivante en jeu (Ferveur)');
  writeFileSync(join(DIR, 'aventure-revanche.png'), await a.screenshot());
} catch (e) {
  check(false, `exception : ${e.message}`);
} finally {
  await browser.close();
  server.stop();
}
console.log(`${checks.filter((c) => c.startsWith('ÉCHEC')).length} échec(s) ; console : ${errors.length} erreur(s)`);
for (const e of errors) console.log(' ', e);
writeFileSync(join(DIR, 'controles.txt'), [...checks, ...errors.map((e) => `console : ${e}`)].join('\n') + '\n');
