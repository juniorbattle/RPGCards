// M14 — le Récit guidé (`docs/m14/01_RECIT_GUIDE.md`, ADR 048), parcours navigateur dans l'aventure : (1) le choix du mode
// à la nouvelle aventure, Promenade libre présélectionnée ; (2) marche et bulle coupées, bouton « Suite du récit » ; (3) la
// transition au noir, la scène qui s'ouvre près de son personnage ; (4) refuser une scène : le bouton la repropose ; (5) la
// trame entière, du prologue au titre, sans un pas du joueur, duels à l'issue imposée (`qaTerminer`), avec Kaï K1 à K6 ;
// (6) après le titre, la marche revient ; (7) le changement de mode dans le menu, dans les deux sens ; (8) la Promenade libre
// d'une nouvelle aventure : ni bouton, ni marche coupée.
// Usage : npm run build && [LQV_VP=1920x1080] node tools/m14-recit-guide.mjs [dossier] [rapport.json]
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { launch, rendererLabel, startPreview, watchConsole, webglRenderer } from './browser.mjs';

const VP = (process.env.LQV_VP ?? '1280x720').split('x').map(Number);
const DIR = process.argv[2] ?? `screenshots/qa/m14/recit-guide-${VP[0]}`;
const OUT = process.argv[3] ?? `artifacts/qa/m14/recit-guide-${VP[0]}.json`;
const head = execSync('git rev-parse --short HEAD').toString().trim();
mkdirSync(DIR, { recursive: true });
const server = await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4299, process.env.LQV_DIST || 'dist');
const browser = await launch();
const issues = [];
const checks = [];
const journal = [];
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
  const pos = () => av(() => ({ ...window.__lqvAventure.town.walker().pos }));
  const suiteVisible = () => p.isVisible('[data-key="av-suite"]');
  const pret = () => p.waitForFunction(() => { const t = window.__lqvAventure?.town; return !!t && t.stats().frames > 1 && !document.querySelector('.ville-host').hidden; }, null, { timeout: 120000 });
  const marche = async () => {
    await p.waitForTimeout(400); // l'élan du pas d'avant
    const a = await pos();
    await p.keyboard.down('ArrowRight'); await p.waitForTimeout(500); await p.keyboard.up('ArrowRight');
    const b = await pos();
    return Math.hypot(b.x - a.x, b.z - a.z);
  };
  const dialogue = () => av(() => document.querySelector('.ville-dialog b')?.textContent ?? null);

  await p.goto(`${server.base}/?aventure=1&qa=1&aiDelay=0&profileSeed=31${process.env.LQV_M14_CINE ? "&cine=1" : ""}`, { timeout: Number(process.env.LQV_QA_NAV_TIMEOUT) || 90000 });
  renderer = rendererLabel(await webglRenderer(p).catch(() => null));

  // (1) le choix du mode
  await p.click('[data-key="av-new"]');
  await p.waitForSelector('[data-key="av-recit-guide"]');
  const presse = (k) => p.getAttribute(`[data-key="av-recit-${k}"]`, 'aria-pressed');
  check(await presse('libre') === 'true' && await presse('guide') === 'false', 'nouvelle aventure : Promenade libre présélectionnée');
  await p.click('[data-key="av-recit-guide"]');
  check(await presse('guide') === 'true' && /événement en événement/.test(await p.textContent('[data-key="av-recit-texte"]')), 'Récit guidé choisi, son texte affiché');
  await shot('choix-du-mode');
  await p.fill('[data-key="av-name"]', 'Lou');
  await p.click('[data-key="av-start"]');
  await pret();

  // (2) marche et bulle coupées, bouton
  await p.waitForSelector('[data-key="av-suite"]:not([hidden])');
  await p.waitForFunction(() => !document.querySelector('.ville-card'), null, { timeout: 20000 }).catch(() => {});
  await shot('ville-suite-du-recit');
  check(await marche() < 0.01, 'marche coupée');
  check(await av(() => window.__lqvAventure.save.recit) === 'guide', 'le mode est noté dans la sauvegarde');

  // (3) la transition, la scène, (4) refuser
  await av(() => { document.querySelector('[data-key="av-suite"]').click(); });
  check(await p.$('.ville-fade') !== null, 'écran noir à la suite du récit');
  await p.waitForSelector('.ville-dialog');
  check(/Kaï/.test(await dialogue() ?? ''), `la scène s'ouvre seule (${await dialogue()})`);
  await p.waitForFunction(() => !document.querySelector('.ville-fade'), null, { timeout: 20000 });
  await shot('scene-kai');
  await p.click('.ville-dialog [data-key="dlg-close"]');
  await p.waitForSelector('[data-key="av-suite"]:not([hidden])');
  check(await marche() < 0.01, 'scène refusée : marche toujours coupée, le bouton la repropose');
  await p.keyboard.press('Enter');
  await p.waitForSelector('.ville-dialog');
  check(/Kaï/.test(await dialogue() ?? ''), 'Entrée vaut « Suite du récit »');

  // (5) la trame entière, sans un pas : une boucle qui ne connaît que ce qu'un joueur voit à l'écran
  const depart = await av(() => window.__lqvAventure.save.etat.combats);
  const rivalVu = [];
  let bloque = 0;
  for (let i = 0; i < 400; i++) {
    const vu = await av(() => {
      const a = window.__lqvAventure;
      const q = (s) => document.querySelector(s);
      const vis = (s) => { const x = q(s); return !!x && !x.hidden && x.getClientRects().length > 0; };
      if (vis('[data-screen="av-resultat"]')) return 'resultat';
      if (vis('[data-key="av-choix"]')) return 'variante';
      if (vis('[data-key="av-duel-go"]')) return 'preparer';
      if (a.cine) return 'cine';
      if (q('[data-key="av-bannieres"]')) return 'bannieres';
      if (q('.av-modal')) return 'modal';
      if (q('.ville-dialog')) return `dialogue:${q('.ville-dialog b')?.textContent ?? ''}`;
      if (vis('[data-key="av-suite"]')) return 'suite';
      if (a.etat.competitions.championnat.titre && !a.verrouRecit) return 'fin';
      return 'attente';
    });
    if (vu === 'fin') break;
    if (vu === 'cine') await p.keyboard.press('Escape');
    if (vu === 'attente' || vu === 'cine') { bloque++; if (bloque > 600) throw new Error(`bloqué sur ${vu}`); await p.waitForTimeout(100); continue; }
    bloque = 0;
    if (journal.at(-1) !== vu) journal.push(vu);
    if (vu === 'suite') await p.click('[data-key="av-suite"]');
    else if (vu === 'resultat') await p.click('[data-key="av-retour"]');
    else if (vu === 'variante') await p.click('[data-key="av-choix"] button');
    else if (vu === 'preparer') {
      await p.click('[data-key="av-duel-go"]');
      await p.waitForFunction(() => !!window.__lqv?.controller?.view?.awaitingMe, null, { timeout: 120000 });
      await av(() => window.__lqvAventure.qaTerminer('victoire'));
      await p.waitForSelector('[data-screen="av-resultat"]');
    } else if (vu === 'bannieres') {
      await p.click('.av-banniere.etat-engageable button');
      await p.waitForFunction(() => !document.querySelector('[data-key="av-bannieres"]') || !!document.querySelector('.av-modal .primary'));
      await p.click('.av-modal .primary');
    } else if (vu === 'modal') await p.click('.av-modal .primary');
    else if (vu.startsWith('dialogue:')) {
      if (/^dialogue:Kaï —/.test(vu)) rivalVu.push(vu.slice(9));
      // le Championnat : ses règles (Signature à changer) sont vérifiées par `qa:championnat`, on proclame par le crochet
      if (/Championnat|héraut/i.test(vu) && await p.$('.ville-dialog [data-key="dlg-close"]') && await av(() => window.__lqvAventure.etat.familles && Object.values(window.__lqvAventure.etat.familles).every((f) => f === 'chef'))) {
        await p.click('.ville-dialog [data-key="dlg-close"]');
        await av(() => window.__lqvAventure.qaTitre());
        continue;
      }
      const primaire = await p.$('.ville-dialog .primary');
      await (primaire ?? await p.$('.ville-dialog button')).click();
    }
    await p.waitForTimeout(30);
  }
  await shot('apres-le-titre');
  const fin = await av(() => { const a = window.__lqvAventure; return { titre: a.etat.competitions.championnat.titre, faits: Object.keys(a.etat.rival?.faits ?? {}).sort(), combats: a.etat.combats, chefs: Object.values(a.etat.familles).filter((f) => f === 'chef').length }; });
  check(fin.titre && fin.chefs === 4, `la trame entière, du prologue au titre (${fin.combats - depart} combats)`);
  check(fin.faits.join() === 'K1,K2,K3,K4,K5,K6', `Kaï K1 à K6, aucun manqué (${fin.faits.join(' ')})`);

  // (6) après le titre, la marche revient
  check(!(await suiteVisible()), 'après le titre : plus de bouton');
  check(await marche() > 0.05, 'après le titre : la marche revient');

  // (7) le changement de mode dans le menu
  await p.goto(`${server.base}/?aventure=1&qa=1&aiDelay=0&profileSeed=32&recit=guide`, { timeout: 90000 });
  await p.click('[data-key="av-new"]');
  await p.waitForFunction(() => /Recommencer/.test(document.body.textContent) || !!document.querySelector('[data-key="av-name"]'));
  const conf = await p.$('button:has-text("Recommencer")');
  if (conf) await conf.click();
  await p.waitForSelector('[data-key="av-name"]');
  check(await presse('guide') === 'true', '`?recit=guide` en QA présélectionne le mode');
  await p.click('[data-key="av-start"]');
  await pret();
  await p.waitForSelector('[data-key="av-suite"]:not([hidden])');
  await p.click('[data-key="av-menu"]');
  await p.waitForSelector('[data-key="menu-recit"]');
  check(/récit guidé/i.test(await p.textContent('[data-key="menu-recit"]')), 'le menu dit le mode');
  await p.click('[data-key="menu-recit"]');
  await p.waitForFunction(() => /promenade libre/i.test(document.querySelector('[data-key="menu-recit"]')?.textContent ?? ''));
  await shot('menu-promenade-libre');
  await p.click('[data-key="dlg-close"]');
  await p.waitForSelector('[data-key="av-suite"]', { state: 'hidden' });
  check(await marche() > 0.05 && await av(() => window.__lqvAventure.save.recit === undefined), 'passage en Promenade libre : plus de bouton, la marche revient, sans champ dans la sauvegarde');
  await p.click('[data-key="av-menu"]');
  await p.click('[data-key="menu-recit"]');
  await p.waitForFunction(() => /récit guidé/i.test(document.querySelector('[data-key="menu-recit"]')?.textContent ?? ''));
  await p.click('[data-key="dlg-close"]');
  await p.waitForSelector('[data-key="av-suite"]:not([hidden])');
  check(await marche() < 0.01, 'retour au Récit guidé : marche coupée de nouveau');

  // (8) la Promenade libre
  await p.goto(`${server.base}/?aventure=1&qa=1&aiDelay=0&profileSeed=33`, { timeout: 90000 });
  await p.click('[data-key="av-new"]');
  await p.waitForFunction(() => /Recommencer/.test(document.body.textContent) || !!document.querySelector('[data-key="av-name"]'));
  const conf2 = await p.$('button:has-text("Recommencer")');
  if (conf2) await conf2.click();
  await p.waitForSelector('[data-key="av-start"]');
  await p.click('[data-key="av-start"]');
  await pret();
  await p.waitForTimeout(800);
  check(!(await suiteVisible()) && await marche() > 0.05 && await av(() => !('recit' in window.__lqvAventure.save)), 'Promenade libre : ni bouton, ni marche coupée, ni champ');
  await ctx.close();
} finally {
  await browser.close();
  await server.stop();
}
const echecs = checks.filter((c) => c.startsWith('ÉCHEC'));
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({ head, viewport: VP, renderer, checks, journal, issues }, null, 1));
console.log(`\n${checks.length - echecs.length}/${checks.length} vérifications, console : ${issues.length} problème(s), rendu : ${renderer}`);
for (const i of issues.slice(0, 6)) console.log('  ', String(i.text ?? i).slice(0, 180));
process.exit(echecs.length || issues.length ? 1 : 0);
