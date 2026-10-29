// Marche de profil (retour du responsable du 2026-10-29) : au navigateur, chaque personnage dessiné par une feuille a son
// cycle de profil mesuré sur l'image chargée (retournée à la création), foulée, passage, foulée, passage ; le protagoniste
// suit le plan de marche de son manifeste (contact, passage, contact, passage : quatre colonnes distinctes, `passage.ts`).
// Usage : npm run build && node tools/marche-profil.mjs
import { launch, startPreview, watchConsole } from './browser.mjs';

const server = await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4391, process.env.LQV_DIST || 'dist');
const browser = await launch();
const erreurs = [];
let ko = 0;
try {
  const p = await (await browser.newContext({ viewport: { width: 960, height: 600 } })).newPage();
  watchConsole(p, erreurs);
  for (const ilot of ['quai', 'parvis', 'ruelles', 'cour', 'port', 'haute']) {
    await p.goto(`${server.base}/?ville=1&qa=1&profondeur=1&ilot=${ilot}`);
    await p.waitForFunction(() => !!window.__lqvVille && window.__lqvVille.town.stats().frames > 3, null, { timeout: 120000 });
    await p.waitForTimeout(1500);
    const r = await p.evaluate(() => window.__lqvVille.town.externalReport());
    for (const [id, c] of Object.entries(r.marche)) {
      const feuille = r.loaded.includes(id) || id === 'joueur';
      const ok = !feuille || (Array.isArray(c) && c.length === 4 && c[0] !== c[2] && (c[1] === c[3] || new Set(c).size === 4));
      if (!ok) ko++;
      console.log(`${ok ? 'OK ' : 'ÉCHEC'} ${ilot} ${id} : ${JSON.stringify(c)}`);
    }
  }
} finally {
  await browser.close();
  server.stop();
}
const err = erreurs.filter((c) => c.startsWith('error') || c.startsWith('pageerror'));
console.log(`${ko ? `${ko} échec(s)` : 'tout est vert'} ; console : ${err.length ? err.slice(0, 3).join(' | ') : 'vide'}`);
process.exit(ko || err.length ? 1 : 0);
