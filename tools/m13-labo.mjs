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
  await p.click('[data-key="mu-stop"]');
  writeFileSync(`${DIR}/labo-apres.png`, await p.screenshot());
} catch (e) {
  check(false, `exception : ${e.message}`);
} finally {
  await browser.close();
  server.stop();
}
check(erreurs.length === 0, `console vide (${erreurs.join(' | ')})`);
process.exit(checks.some((c) => c.startsWith('ÉCHEC')) ? 1 : 0);
