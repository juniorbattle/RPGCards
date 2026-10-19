// RC 0.8 (M08 C5, étape 4) — parcours « nouveau joueur » de la démo, capturé écran par écran (1280×720) :
// accueil → nouvelle partie → rencontres → deck → collection → préparation → duel (premier tour guidé) → abandon →
// résultat → retour à l’accueil. Relève textes visibles, erreurs console et durées. Sert à repérer les frictions.
// Usage : npm run build && node tools/rc08-parcours.mjs [dossier de captures] [rapport.json]
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { launch, startPreview, watchConsole } from './browser.mjs';

const DIR = process.argv[2] ?? 'screenshots/qa/rc08/parcours';
const OUT = process.argv[3] ?? 'artifacts/qa/rc08/parcours.json';
const head = execSync('git rev-parse --short HEAD').toString().trim();
mkdirSync(DIR, { recursive: true });
const server = await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4271);
const browser = await launch();
const issues = [];
const steps = [];
const report = { date: new Date().toISOString(), commit: head, steps, issues };
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  p.setDefaultTimeout(60000);
  watchConsole(p, issues);
  let n = 0;
  const shot = async (name) => {
    await p.waitForTimeout(900);
    const file = `${DIR}/${String(++n).padStart(2, '0')}-${name}.png`;
    writeFileSync(file, await p.screenshot());
    const text = await p.evaluate(() => (document.querySelector('#shell:not([hidden])') ?? document.querySelector('#app'))?.innerText.replace(/\s+/g, ' ').slice(0, 900));
    steps.push({ name, file, text });
    console.log(`${name} : ${text.slice(0, 160)}`);
  };
  await p.goto(`${server.base}/?qa=1&aiDelay=300`);
  await p.waitForSelector('[data-key="home-new"]', { state: 'visible' });
  await shot('accueil');
  await p.click('[data-key="home-new"]');
  await shot('nouveau-duelliste');
  await p.click('[data-key="new-create"]');
  await p.waitForSelector('[data-screen="board"]');
  await shot('rencontres');
  await p.click('[data-key="board-deck"]');
  await shot('deck');
  await p.click('[data-key="deck-back"]');
  await p.click('[data-key="board-collection"]');
  await shot('collection');
  await p.click('[data-key="coll-back"]');
  await p.click('[data-key="enc-quai-1"]');
  await p.waitForSelector('[data-screen="prep"]');
  await shot('preparation');
  await p.click('[data-key="prep-start"]');
  await p.waitForFunction(() => !!window.__lqv?.controller?.view?.awaitingMe, null, { timeout: 60000 });
  await shot('duel-debut');
  await p.click('[data-key="tool-menu"]');
  await shot('duel-menu');
  await p.click('[data-key="menu-abandon"]');
  await shot('duel-confirmer-abandon');
  await p.click('[data-key="confirm-ok"]');
  await p.waitForSelector('[data-screen="result"]');
  await shot('resultat');
  await p.click('[data-key="result-home"]');
  await shot('accueil-retour');
} finally {
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(report, null, 2));
  await browser.close();
  server.stop();
}
console.log('console :', issues.length ? issues : 'aucune erreur');
