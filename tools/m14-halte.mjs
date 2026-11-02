// M14 — la Halte du Récit guidé (`docs/m14/01_RECIT_GUIDE.md`, §4 bis), parcours navigateur : le bouton, l'écran sans
// défilement, les joueurs de rue, le défi (écran noir, scène devant le joueur choisi, refus possible), le duel, le joueur
// qui quitte la liste, deck, menu et journal, la suite du récit ; la Promenade libre n'a pas de Halte.
// Usage : npm run build && [LQV_VP=1920x1080] node tools/m14-halte.mjs [dossier] [rapport.json]
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { launch, rendererLabel, startPreview, watchConsole, webglRenderer } from './browser.mjs';

const VP = (process.env.LQV_VP ?? '1280x720').split('x').map(Number);
const DIR = process.argv[2] ?? `screenshots/qa/m14/halte-${VP[0]}`;
const OUT = process.argv[3] ?? `artifacts/qa/m14/halte-${VP[0]}.json`;
const head = execSync('git rev-parse --short HEAD').toString().trim();
mkdirSync(DIR, { recursive: true });
const server = await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4298, process.env.LQV_DIST || 'dist');
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
  const shot = async (name) => writeFileSync(`${DIR}/${String(++n).padStart(2, '0')}-${name}.png`, await p.screenshot());
  const av = (fn, arg) => p.evaluate(fn, arg);
  const pret = () => p.waitForFunction(() => { const t = window.__lqvAventure?.town; return !!t && t.stats().frames > 1 && !document.querySelector('.ville-host').hidden; }, null, { timeout: 120000 });
  const ouvrir = async () => { await p.waitForSelector('[data-key="av-halte-btn"]:not([hidden])'); await p.click('[data-key="av-halte-btn"]'); await p.waitForSelector('[data-key="av-halte"]'); };
  const cartes = () => p.$$eval('[data-key^="av-rue-"]', (xs) => xs.map((x) => x.getAttribute('data-key').slice(7)));

  await p.goto(`${server.base}/?aventure=1&qa=1&aiDelay=0&profileSeed=31&depart=II&famille=Ronce`, { timeout: Number(process.env.LQV_QA_NAV_TIMEOUT) || 90000 });
  renderer = rendererLabel(await webglRenderer(p).catch(() => null));
  await p.click('[data-key="av-depart"]');
  await pret();
  check(!(await p.isVisible('[data-key="av-halte-btn"]')), 'Promenade libre : pas de Halte');
  await p.click('[data-key="av-menu"]');
  await p.click('[data-key="menu-recit"]');
  await p.waitForFunction(() => /récit guidé/i.test(document.querySelector('[data-key="menu-recit"]')?.textContent ?? ''));
  await p.click('[data-key="dlg-close"]');
  await ouvrir();
  check(true, 'Récit guidé : le bouton Halte, à côté de « Suite du récit »');

  const ids = await cartes();
  check(ids.length >= 3 && ids.every((x) => x.startsWith('rue-')), `joueurs de rue listés (${ids.join(', ')})`);
  const debord = await av(() => { const b = document.querySelector('[data-key="av-halte"]'); return { sh: b.scrollHeight, ch: b.clientHeight, sw: b.scrollWidth, cw: b.clientWidth }; });
  check(debord.sh <= debord.ch && debord.sw <= debord.cw, `tout tient sans défilement (${debord.sh}/${debord.ch})`);
  check(await av(() => [...document.querySelectorAll('.av-rue img')].every((i) => i.naturalWidth > 0)), 'chaque joueur a son portrait');
  check(await p.$('.ville-card') === null, 'pas de carton de lieu devant la Halte');
  check(!(await p.textContent('[data-key="av-halte"]')).includes('en rangs'), 'noms des quartiers tels que dans le jeu');
  await shot('halte');

  await p.keyboard.press('Escape');
  check(await p.$('[data-key="av-halte"]') === null, 'Échap referme la Halte');
  await ouvrir();
  await p.click('[data-key="av-halte-deck"]');
  await p.waitForSelector('[data-key="av-collection"]');
  check(true, 'le deck depuis la Halte');
  await p.keyboard.press('Escape');
  await ouvrir();
  await p.click('[data-key="av-halte-menu"]');
  await p.waitForSelector('[data-key="menu-recit"]');
  check(true, 'les réglages depuis la Halte');
  await p.click('[data-key="dlg-close"]');
  await p.waitForFunction(() => !document.querySelector('.ville-dialog') && !document.querySelector('.av-modal'));

  // un défi loin d'ici, puis un défi refusé
  await ouvrir();
  const loin = ids.includes('rue-port') ? 'rue-port' : ids.at(-1);
  await p.click(`[data-key="av-defier-${loin}"]`);
  check(await p.$('.ville-fade') !== null, 'défier : écran noir');
  await p.waitForSelector('.ville-dialog');
  await p.waitForFunction(() => !document.querySelector('.ville-fade'), null, { timeout: 20000 });
  const lieu = await av((id) => ({ ilot: window.__lqvAventure.town.ilotId(), proche: (() => { const t = window.__lqvAventure.town; const s = t.ilot.spawns[`npc-${id}`]; const w = t.walker().pos; return !!s && Math.hypot(s.x - w.x, s.z - w.z) < 0.05; })() }), loin);
  check(lieu.proche, `le joueur est devant lui (${lieu.ilot})`);
  await shot('devant-le-joueur');
  await p.click('.ville-dialog [data-key="dlg-close"]');
  await p.waitForSelector('[data-key="av-suite"]:not([hidden])');
  await ouvrir();
  check((await cartes()).includes(loin), 'un refus ne le retire pas de la liste');

  await p.click(`[data-key="av-defier-${loin}"]`);
  await p.waitForSelector('.ville-dialog [data-key="dlg-duel"]');
  await p.click('.ville-dialog [data-key="dlg-duel"]');
  await p.click('[data-key="av-duel-go"]');
  await p.waitForFunction(() => !!window.__lqv?.controller?.view?.awaitingMe, null, { timeout: 120000 });
  await av(() => window.__lqvAventure.qaTerminer('victoire'));
  await p.waitForSelector('[data-screen="av-resultat"]');
  await p.click('[data-key="av-retour"]');
  await pret();
  await ouvrir();
  check(!(await cartes()).includes(loin), 'affronté, il quitte la liste jusqu’au chapitre suivant');
  const combats = await av(() => window.__lqvAventure.etat.combats);
  check(combats > 0, `le duel compte comme à pied (${combats} combats)`);
  await shot('apres-duel');

  await p.click('[data-key="av-halte-suite"]');
  await p.waitForFunction(() => !document.querySelector('[data-key="av-halte"]'));
  await p.waitForSelector('.ville-dialog, .av-modal', { timeout: 30000 });
  check(true, '« Suite du récit » depuis la Halte reprend la trame');
  await shot('suite');
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
