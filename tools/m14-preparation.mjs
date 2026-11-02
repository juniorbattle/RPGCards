// M14 — la Préparation du Récit guidé (`docs/m14/01_RECIT_GUIDE.md`, §4 bis, révision 3), parcours navigateur : plein écran, sans la
// ville et sans défilement, les joueurs de rue, le défi (écran noir, scène devant le joueur choisi, refus possible), le duel, le
// joueur qui quitte la liste, deck, menu et journal, un choix entre deux défis, Kaï qui surgit à la place de l'étape annoncée ;
// la Promenade libre n'a pas de Préparation.
// Usage : npm run build && [LQV_VP=1920x1080] node tools/m14-preparation.mjs [dossier] [rapport.json]
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { launch, rendererLabel, startPreview, watchConsole, webglRenderer } from './browser.mjs';

const VP = (process.env.LQV_VP ?? '1280x720').split('x').map(Number);
const DIR = process.argv[2] ?? `screenshots/qa/m14/preparation-${VP[0]}`;
const OUT = process.argv[3] ?? `artifacts/qa/m14/preparation-${VP[0]}.json`;
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
  const prepa = async () => { await p.waitForSelector('[data-key="av-prepa"]'); await p.waitForFunction(() => !document.querySelector('.ville-fade'), null, { timeout: 20000 }); };
  const cartes = () => p.$$eval('[data-key^="av-rue-"]', (xs) => xs.map((x) => x.getAttribute('data-key').slice(7)));
  const duel = async () => {
    await p.click('.ville-dialog [data-key="dlg-duel"]');
    await p.click('[data-key="av-duel-go"]');
    await p.waitForFunction(() => !!window.__lqv?.controller?.view?.awaitingMe, null, { timeout: 120000 });
    await av(() => window.__lqvAventure.qaTerminer('victoire'));
    await p.waitForSelector('[data-screen="av-resultat"]');
    check((await p.textContent('[data-key="av-retour"]')).includes('Continuer'), 'le résultat dit « Continuer », pas « Retour en ville »');
    await p.click('[data-key="av-retour"]');
  };

  await p.goto(`${server.base}/?aventure=1&qa=1&aiDelay=0&profileSeed=31&depart=II&famille=Ronce`, { timeout: Number(process.env.LQV_QA_NAV_TIMEOUT) || 90000 });
  renderer = rendererLabel(await webglRenderer(p).catch(() => null));
  await p.click('[data-key="av-depart"]');
  await pret();
  check(await p.$('[data-key="av-prepa"]') === null, 'Promenade libre : pas de Préparation');
  await p.click('[data-key="av-menu"]');
  await p.click('[data-key="menu-recit"]');
  await p.waitForFunction(() => /récit guidé/i.test(document.querySelector('[data-key="menu-recit"]')?.textContent ?? ''));
  await p.click('[data-key="dlg-close"]');
  await prepa();
  check(true, 'Récit guidé : la Préparation s\'ouvre seule');
  const fond = await av(() => ({ ville: document.querySelector('.ville-host').hidden, hud: !!document.querySelector('.av-hud'), image: getComputedStyle(document.querySelector('#shell')).backgroundImage, position: getComputedStyle(document.querySelector('#shell')).position }));
  check(fond.ville && !fond.hud && /gradient/.test(fond.image) && !/rgba/.test(fond.image), 'plein écran opaque : ni ville ni HUD derrière');

  const ids = await cartes();
  check(ids.length >= 3 && ids.every((x) => x.startsWith('rue-')), `joueurs de rue listés (${ids.join(', ')})`);
  const debord = await av(() => { const b = document.querySelector('#shell'); const l = document.querySelector('.av-prepa-liste'); return { sh: b.scrollHeight, ch: b.clientHeight, sw: b.scrollWidth, cw: b.clientWidth, lh: l.scrollHeight, lc: l.clientHeight }; });
  check(debord.sh <= debord.ch && debord.sw <= debord.cw && debord.lh <= debord.lc, `tout tient sans défilement (${debord.sh}/${debord.ch}, liste ${debord.lh}/${debord.lc})`);
  check(await av(() => [...document.querySelectorAll('.av-rue img')].every((i) => i.naturalWidth > 0)), 'chaque joueur a son portrait');
  check(await p.$('.ville-card') === null, 'pas de carton de lieu devant la Préparation');
  check(!(await p.textContent('[data-key="av-prepa"]')).includes('en rangs'), 'noms des quartiers tels que dans le jeu');
  check(await av(() => document.activeElement?.getAttribute('data-key')) === 'av-prepa-suite', 'le bouton « Suite du récit » a le focus (Entrée, Espace)');
  await shot('preparation');

  await p.keyboard.press('Escape');
  await p.waitForSelector('[data-key="menu-recit"]');
  check(true, 'Échap ouvre le menu');
  await p.click('[data-key="dlg-close"]');
  await p.click('[data-key="av-prepa-deck"]');
  await p.waitForSelector('[data-key="av-collection"]');
  check(await p.$('[data-key="av-prepa"]') !== null, 'le deck depuis la Préparation, qui reste derrière');
  await p.keyboard.press('Escape');
  await p.click('[data-key="av-prepa-journal"]');
  await p.waitForSelector('[data-key="av-journal-panel"]');
  check(true, 'le journal depuis la Préparation');
  await p.click('[data-key="av-journal-close"]');
  await p.click('[data-key="av-prepa-menu"]');
  await p.waitForSelector('[data-key="menu-recit"]');
  check(true, 'les réglages depuis la Préparation');
  await p.click('[data-key="dlg-close"]');
  await p.waitForFunction(() => !document.querySelector('.ville-dialog') && !document.querySelector('.av-modal'));

  // un défi loin d'ici, puis un défi refusé
  const loin = ids.includes('rue-port') ? 'rue-port' : ids.at(-1);
  await p.click(`[data-key="av-defier-${loin}"]`);
  check(await p.$('.ville-fade') !== null, 'défier : écran noir');
  await p.waitForSelector('.ville-dialog', { timeout: 60000 });
  await p.waitForFunction(() => !document.querySelector('.ville-fade'), null, { timeout: 20000 });
  const lieu = await av((id) => ({ ilot: window.__lqvAventure.town.ilotId(), proche: (() => { const t = window.__lqvAventure.town; const s = t.ilot.spawns[`npc-${id}`]; const w = t.walker().pos; return !!s && Math.hypot(s.x - w.x, s.z - w.z) < 0.05; })() }), loin);
  check(lieu.proche, `le joueur est devant lui (${lieu.ilot})`);
  await shot('devant-le-joueur');
  await p.click('.ville-dialog [data-key="dlg-close"]');
  await prepa();
  check((await cartes()).includes(loin), 'un refus ramène à la Préparation et ne le retire pas de la liste');

  await p.click(`[data-key="av-defier-${loin}"]`);
  await p.waitForSelector('.ville-dialog [data-key="dlg-duel"]', { timeout: 60000 });
  await duel();
  await prepa();
  check(!(await cartes()).includes(loin), 'affronté, il quitte la liste jusqu’au chapitre suivant');
  const combats = await av(() => window.__lqvAventure.etat.combats);
  check(combats > 0, `le duel compte comme à pied (${combats} combats)`);
  await shot('apres-duel');

  // deux défis ouverts : le choix se fait sur l'écran ; Kaï surgit à la place, puis le choix revient
  const refus = await av(() => window.__lqvAventure.qaFaits([{ type: 'engager', famille: 'Cendre' }, { type: 'engager', famille: 'Voile' }]));
  check(!refus.length, `deux familles engagées (${refus.join(' ; ')})`);
  await p.waitForSelector('[data-key="av-prepa-choix"]');
  const options = await p.$$eval('[data-key^="av-prepa-choix-"]', (xs) => xs.map((x) => x.getAttribute('data-key').slice(15)));
  check(options.length === 2 && await p.$('[data-key="av-prepa-suite"]') === null, `le choix sur l'écran, sans bouton général (${options.join(', ')})`);
  await shot('choix');
  await p.click(`[data-key="av-prepa-choix-${options[1]}"]`);
  await p.waitForFunction(() => !!document.querySelector('.ville-dialog b')?.textContent.startsWith('Kaï —'), null, { timeout: 60000 });
  check(true, 'Kaï surgit à la place de l\'étape choisie');
  await shot('kai-interrompt');
  await duel();
  await p.waitForSelector('[data-key="av-prepa-choix"]');
  await prepa();
  check(true, 'retour à la Préparation, le choix proposé de nouveau');
  await p.click(`[data-key="av-prepa-choix-${options[1]}"]`);
  await p.waitForSelector('.ville-dialog [data-key="dlg-duel"]', { timeout: 60000 });
  check(true, 'la personne choisie ouvre sa scène');
  await p.waitForTimeout(800);
  await shot('scene-figure');
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
