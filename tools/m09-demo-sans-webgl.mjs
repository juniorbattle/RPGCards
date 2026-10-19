// M09 V2 — démo `?demo=1` dans un navigateur SANS WebGL : la ville (WebGL) n'est pas branchée, la démo reste le jeu
// habituel (tableau des rencontres, arène en repli CSS comme `qa:rc` I). Avant ce garde-fou, le tableau n'apparaissait
// jamais (la ville remplaçait l'écran et échouait).
// Usage : npm run build && node tools/m09-demo-sans-webgl.mjs
import { chromium } from 'playwright-core';
import { CHROMIUM, startPreview, watchConsole } from './browser.mjs';
const server = await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4291, process.env.LQV_DIST || 'dist');
const b = await chromium.launch({ executablePath: CHROMIUM, args: ['--disable-webgl', '--disable-3d-apis', '--disable-gpu'] });
const issues = [];
try {
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  p.setDefaultTimeout(90000);
  watchConsole(p, issues);
  await p.goto(`${server.base}/?demo=1&qa=1&reducedMotion=1`);
  await p.click('[data-key="home-new"]');
  await p.click('[data-key="new-create"]');
  await p.waitForSelector('[data-screen="board"]');
  const r = await p.evaluate(() => ({ gl: !!document.createElement('canvas').getContext('webgl'), ville: !!document.querySelector('.ville-host'), board: !!document.querySelector('[data-screen="board"]'), quai: !!document.querySelector('[data-key="board-ville"]') }));
  if (!(r.gl === false && !r.ville && r.board && !r.quai)) process.exitCode = 1;
  console.log(JSON.stringify(r), r.gl === false && !r.ville && r.board && !r.quai ? 'OK : sans WebGL, ?demo=1 = tableau des rencontres (aucune ville, aucun bouton « Retour au Quai »)' : 'ÉCHEC');
  await p.click('[data-key="enc-quai-1"]');
  await p.waitForSelector('[data-screen="prep"]');
  console.log('OK : préparation du duel ouverte');
} finally { await b.close(); server.stop(); }
console.log(issues.length ? `console : ${JSON.stringify(issues).slice(0, 300)}` : 'console : aucune erreur');
