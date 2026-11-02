// M14 — l'enveloppe du Duel standard accordée à l'interface de l'aventure (ADR 049, amendement 1), et « Aventure » à
// l'accueil : captures de chaque écran, contrôle de débordement horizontal, bouton qui mène à l'aventure.
// Usage : npm run build && [LQV_VP=1920x1080] node tools/m14-enveloppe.mjs [dossier] [rapport.json]
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { launch, rendererLabel, startPreview, watchConsole, webglRenderer } from './browser.mjs';

const VP = (process.env.LQV_VP ?? '1280x720').split('x').map(Number);
const DIR = process.argv[2] ?? `screenshots/qa/m14/enveloppe-${VP[0]}`;
const OUT = process.argv[3] ?? `artifacts/qa/m14/enveloppe-${VP[0]}.json`;
const head = execSync('git rev-parse --short HEAD').toString().trim();
mkdirSync(DIR, { recursive: true });
const server = await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4297, process.env.LQV_DIST || 'dist');
const browser = await launch();
const issues = [];
const checks = [];
const check = (ok, what) => { checks.push(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); console.log(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); };
let n = 0;
let renderer = '';
try {
  const ctx = await browser.newContext({ viewport: { width: VP[0], height: VP[1] }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  p.setDefaultTimeout(Number(process.env.LQV_QA_TIMEOUT) || 90000);
  watchConsole(p, issues);
  const ecran = async (name) => {
    await p.waitForTimeout(700);
    const o = await p.evaluate(() => { const s = document.getElementById('shell'); return { sw: s.scrollWidth, cw: s.clientWidth }; });
    check(o.sw <= o.cw, `${name} : aucun débordement horizontal (${o.sw}/${o.cw})`);
    writeFileSync(`${DIR}/${String(++n).padStart(2, '0')}-${name}.png`, await p.screenshot());
  };

  await p.goto(`${server.base}/?qa=1&aiDelay=0&profileSeed=31`, { timeout: Number(process.env.LQV_QA_NAV_TIMEOUT) || 90000 });
  renderer = rendererLabel(await webglRenderer(p).catch(() => null));
  await p.waitForSelector('[data-key="home-new"]');
  check(await p.isVisible('[data-key="home-aventure"]'), 'accueil sans partie : « Aventure » proposée');
  await ecran('accueil-neuf');
  await p.click('[data-key="home-new"]');
  await p.waitForSelector('[data-key="new-create"]');
  await ecran('nouvelle-partie');
  await p.click('[data-key="new-create"]');
  await p.waitForSelector('[data-key="board-deck"]');
  await ecran('rencontres');
  await p.click('[data-key="board-deck"]');
  await p.waitForFunction(() => document.querySelector('[data-screen="deck"]'));
  await ecran('deck');
  await p.goBack().catch(() => {});
  await p.goto(`${server.base}/?qa=1&aiDelay=0&profileSeed=31`);
  await p.waitForSelector('[data-key="home-continue"]');
  await ecran('accueil');
  await p.click('[data-key="home-options"]');
  await p.waitForFunction(() => document.querySelector('[data-screen="options"]'));
  await ecran('options');
  await p.goto(`${server.base}/?qa=1&aiDelay=0&profileSeed=31`);
  await p.click('[data-key="home-help"]');
  await p.waitForFunction(() => document.querySelector('[data-screen="help"]'));
  await ecran('aide');
  await p.goto(`${server.base}/?qa=1&aiDelay=0&profileSeed=31`);
  await p.click('[data-key="home-collection"]');
  await p.waitForFunction(() => document.querySelector('[data-screen="collection"]'));
  await ecran('collection');
  await p.goto(`${server.base}/?qa=1&aiDelay=0&profileSeed=31`);
  await p.click('[data-key="home-continue"]');
  await p.waitForSelector('[data-key="board-deck"]');
  await p.click('[data-encounter] .btn');
  await p.waitForSelector('[data-key="prep-start"]');
  await ecran('preparation');

  await p.goto(`${server.base}/?qa=1&aiDelay=0&profileSeed=31`);
  await p.click('[data-key="home-aventure"]');
  await p.waitForURL(/aventure=1/);
  await p.waitForSelector('[data-key="av-new"], [data-key="av-continue"]');
  check(true, '« Aventure » ouvre l’écran titre de l’aventure');

  // le lancement réel : l'adresse nue, sans QA, dans un navigateur neuf
  const neuf = await browser.newContext({ viewport: { width: VP[0], height: VP[1] }, deviceScaleFactor: 1 });
  const j = await neuf.newPage();
  j.setDefaultTimeout(Number(process.env.LQV_QA_TIMEOUT) || 90000);
  watchConsole(j, issues);
  const images = [];
  j.on('response', (r) => { const m = r.url().match(/decors\/([^/?]+\.png)/); if (m && r.ok()) images.push(m[1]); });
  await j.goto(`${server.base}/`, { timeout: Number(process.env.LQV_QA_NAV_TIMEOUT) || 90000 });
  await j.waitForSelector('[data-screen="av-titre"]');
  check(await j.$('[data-key="home-new"]') === null, 'adresse nue : l’écran titre de l’aventure, pas l’accueil du prototype');
  await j.waitForTimeout(4000); // le buste vient avec l'arène
  check(await j.evaluate(() => { const b = document.querySelector('[data-key="av-new"]').getBoundingClientRect(); const s = document.querySelector('.av-titre'); return getComputedStyle(s).position === 'relative' && getComputedStyle(s).zIndex === '1' && b.height > 0; }), 'le titre passe devant le dégradé de l’accueil');
  writeFileSync(`${DIR}/${String(++n).padStart(2, '0')}-lancement-titre.png`, await j.screenshot());
  await j.click('[data-key="av-new"]');
  await j.waitForSelector('[data-key="av-start"]');
  await j.click('[data-key="av-start"]');
  await j.waitForSelector('.av-cartouche', { timeout: 120000 });
  for (let i = 0; i < 14; i++) { await j.keyboard.press('Escape'); await j.waitForTimeout(350); }
  check(await j.isVisible('.av-cartouche') && await j.$('.sh-home') === null, 'nouvelle aventure : le HUD en cartouche de la nouvelle interface');
  check(images.includes('quai-facades.png'), `hors QA, le décor approuvé du Quai se charge (${images.length} images de décor)`);
  writeFileSync(`${DIR}/${String(++n).padStart(2, '0')}-lancement-ville.png`, await j.screenshot());
  await j.goto(`${server.base}/`);
  await j.waitForSelector('[data-key="av-standard"]');
  await j.click('[data-key="av-standard"]');
  await j.waitForURL(/standard=1/);
  await j.waitForSelector('[data-key="home-aventure"]');
  check(true, 'le lien de l’écran titre garde l’accès au jeu standard');
  await neuf.close();
  await ctx.close();
} finally {
  await browser.close();
  await server.stop();
}
const echecs = checks.filter((c) => c.startsWith('ÉCHEC'));
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({ head, viewport: VP, renderer, checks, issues }, null, 1));
console.log(`\n${checks.length - echecs.length}/${checks.length} vérifications, console : ${issues.length} problème(s), rendu : ${renderer}`);
for (const i of issues.slice(0, 6)) console.log('  ', String(i.text ?? i).slice(0, 180));
process.exit(echecs.length || issues.length ? 1 : 0);
