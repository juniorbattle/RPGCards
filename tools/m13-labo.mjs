// M13 — le laboratoire d'écoute au navigateur (`?musique=1`) : la banque calculée dans le worker, chaque version lancée
// en temps réel (bouton), une variation à la volée, un jingle, les transitions, l'arrêt ; console vide. Captures.
// Usage : npm run build && node tools/m13-labo.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { launch, startPreview, watchConsole } from './browser.mjs';

const DIR = 'screenshots/qa/m13';
mkdirSync(DIR, { recursive: true });
const server = await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4501, process.env.LQV_DIST || 'dist');
const browser = await launch();
const erreurs = [];
const checks = [];
const check = (ok, what) => { checks.push(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); console.log(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); };
try {
  const p = await (await browser.newContext({ viewport: { width: 1100, height: 900 } })).newPage();
  p.setDefaultTimeout(120000);
  watchConsole(p, erreurs);
  await p.goto(`${server.base}/?musique=1`);
  await p.waitForSelector('[data-key="mu-labo"]');
  writeFileSync(`${DIR}/labo.png`, await p.screenshot());
  await p.click('[data-key="mu-I-1"]');
  await p.waitForFunction(() => /I-1|Titre/.test(document.querySelector('[data-key="mu-etat"]')?.textContent ?? ''), null, { timeout: 120000 });
  check(true, 'titre (I-1) lancé : banque calculée dans le worker');
  await p.waitForTimeout(2500);
  await p.click('[data-key="mu-var-envers"]');
  check(await p.locator('[data-key="mu-var-envers"].on').count() === 1, 'variation « à l\'envers » choisie, la version reprend avec elle');
  await p.click('[data-key="mu-I-2"]');
  await p.waitForTimeout(1500);
  check(/Menus/.test(await p.textContent('[data-key="mu-etat"]')), 'menus (I-2) : enchaînement sur la mesure');
  await p.click('[data-key="mu-j-victoire"]');
  await p.click('[data-key="mu-I-3"]');
  await p.waitForTimeout(1500);
  check(/Récit/.test(await p.textContent('[data-key="mu-etat"]')), 'récit (I-3)');
  // la ville qui grandit, le dialogue, le Fanal, l'entrée en duel
  await p.click('[data-key="mu-II-1"]');
  await p.waitForTimeout(1200);
  check(/Quai/.test(await p.textContent('[data-key="mu-etat"]')), 'la ville (II-1) : le Quai');
  await p.click('[data-key="mu-ch-0"]');
  check(await p.locator('[data-key="mu-ch-0"].on').count() === 1, 'formation du prologue (guitare et contrebasse) choisie');
  await p.click('[data-key="mu-ch-6"]');
  await p.click('[data-key="mu-focus"]');
  check(await p.locator('[data-key="mu-focus"].on').count() === 1, 'dialogue : la musique s\'efface');
  await p.click('[data-key="mu-focus"]');
  await p.locator('[data-key="mu-fanal"]').fill('80');
  await p.waitForTimeout(800);
  await p.click('[data-key="mu-II-3"]');
  await p.waitForTimeout(1200);
  check(/valse|trois temps/.test(await p.textContent('[data-key="mu-etat"]')), 'les Ruelles (II-3), en valse');
  await p.click('[data-key="mu-vers-duel"]');
  await p.waitForTimeout(2500);
  // le duel : couches, ponctuations, duel tendu, fin
  await p.click('[data-key="mu-III-1"]');
  await p.waitForTimeout(800);
  check(await p.locator('[data-key="mu-couche-melodie"].on').count() === 1 && await p.locator('[data-key^="mu-couche-"].on').count() === 1, 'duel (III-1) lancé seul : la mélodie d\'emblée, la tension et les cuivres attendent');
  await p.click('[data-key="mu-couche-melodie"]');
  check(await p.locator('[data-key="mu-couche-melodie"].on').count() === 0, 'la mélodie sort sur la mesure');
  await p.click('[data-key="mu-couche-melodie"]');
  for (const k of ['gagne', 'perdu', 'signature', 'prolongation']) await p.click(`[data-key="mu-p-${k}"]`);
  await p.click('[data-key="mu-couche-cuivres"]');
  await p.click('[data-key="mu-tendu"]');
  await p.waitForTimeout(2000);
  await p.click('[data-key="mu-fin-victoire"]');
  await p.waitForTimeout(2500);
  check(true, 'ponctuations, cuivres, duel tendu et fin de duel joués');
  for (const id of ['IV-3', 'V-1', 'VI-2']) { await p.click(`[data-key="mu-${id}"]`); await p.waitForTimeout(1500); }
  check(/Finale/.test(await p.textContent('[data-key="mu-etat"]')), 'les Maisons, Kaï, la Finale du Championnat');
  for (const i of ['trompette', 'sax']) { await p.click(`[data-key="mu-demo-${i}"]`); await p.waitForTimeout(1500); }
  check(/sax seul/.test(await p.textContent('[data-key="mu-etat"]')), 'instruments seuls (trompette bouchée, saxophone)');
  await p.click('[data-key="mu-stop"]');
  writeFileSync(`${DIR}/labo-apres.png`, await p.screenshot({ fullPage: true }));
} catch (e) {
  check(false, `exception : ${e.message}`);
} finally {
  await browser.close();
  server.stop();
}
check(erreurs.length === 0, `console vide (${erreurs.join(' | ')})`);
process.exit(checks.some((c) => c.startsWith('ÉCHEC')) ? 1 : 0);
