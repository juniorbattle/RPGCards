// Apparence du protagoniste dans l'aventure (passe 165), au navigateur : écran « Nouvelle aventure » (éditeur, silhouette B
// en QA), sauvegarde (`profil.apparence`), personnage de la ville à l'apparence choisie, reprise, menu « Apparence »
// (changement et remontage de la ville), sauvegarde d'origine sans apparence (compatibilité). Captures.
// Usage : npm run build && node tools/protagoniste-aventure.mjs [sortie, défaut screenshots/qa/protagoniste/aventure]
//   (ou LQV_BASE=http://localhost:5173 pour le serveur de dev ; LQV_QS=&sprites=approuvees : politique du jeu)
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch, startPreview, watchConsole } from './browser.mjs';

const OUT = process.argv[2] ?? 'screenshots/qa/protagoniste/aventure';
mkdirSync(OUT, { recursive: true });
const server = process.env.LQV_BASE ? { base: process.env.LQV_BASE, stop() {} } : await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4393);
const browser = await launch();
const erreurs = [];
const checks = [];
const norm = (o) => JSON.stringify(o ? Object.fromEntries(Object.entries(o).sort()) : o);
const check = (ok, what) => { checks.push(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); console.log(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); };
try {
  const p = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  watchConsole(p, erreurs);
  const townReady = () => p.waitForFunction(() => { const t = window.__lqvAventure?.town; return !!t && t.stats().frames > 1 && !document.querySelector('.ville-host').hidden; }, null, { timeout: 120000 });
  const joueur = () => p.evaluate(() => window.__lqvAventure.town.externalReport().loaded.find((id) => id.startsWith('player-')) ?? null);
  const save = () => p.evaluate(() => JSON.parse(JSON.stringify(window.__lqvAventure.save.profil)));
  const go = async (qs = '') => {
    await p.goto(`${server.base}/?aventure=1&qa=1&aiDelay=0&reducedMotion=1&profileSeed=5${qs}${process.env.LQV_QS ?? ""}`, { timeout: 90000 });
    await p.waitForSelector('[data-key="av-new"]', { state: 'visible' });
  };
  await go();
  await p.evaluate(() => localStorage.clear());
  await go();
  await p.click('[data-key="av-new"]');
  await p.waitForSelector('[data-key="av-apparence"]');
  await p.waitForSelector('[data-key="av-ap-sil-b"]');
  await p.waitForTimeout(800);
  await p.screenshot({ path: join(OUT, '01-nouvelle-aventure.png') });
  check(true, 'écran « Nouvelle aventure » : éditeur et silhouette B');
  await p.click('[data-key="av-ap-sil-b"]');
  // passe 167 : la coupe mi-longue de la silhouette B (feuille en QA)
  await p.waitForSelector('[data-key="av-ap-coupe-1"]');
  await p.click('[data-key="av-ap-coupe-1"]');
  // passe 170 : le visage rond de cette coupe
  await p.waitForSelector('[data-key="av-ap-visage-2"]');
  await p.click('[data-key="av-ap-visage-2"]');
  await p.click('[data-key="av-ap-peau-4"]');
  await p.click('[data-key="av-ap-cheveux-3"]');
  await p.click('[data-key="av-ap-yeux-1"]');
  await p.waitForTimeout(600);
  await p.screenshot({ path: join(OUT, '02-apparence-choisie.png') });
  const textes = await p.evaluate(() => document.querySelector('[data-key="av-apparence"]').closest('section').innerText);
  check(!/\b(homme|femme|masculin|féminin|garçon|fille)\b/i.test(textes), 'aucun mot genré à l’écran de création');
  await p.click('[data-key="av-start"]');
  await townReady();
  await p.waitForTimeout(1500);
  check(norm((await save()).apparence) === norm({ silhouette: 'b', coupe: 1, visage: 2, peau: 4, cheveux: 3, yeux: 1 }), `sauvegarde : ${JSON.stringify((await save()).apparence)}`);
  check((await joueur()) === 'player-gris@b12431', `personnage de la ville : ${await joueur()}`);
  await p.screenshot({ path: join(OUT, '03-ville-silhouette-b.png') });
  // reprise
  await go();
  await p.click('[data-key="av-continue"]').catch(() => p.click('text=Continuer'));
  await townReady();
  await p.waitForTimeout(800);
  check((await joueur()) === 'player-gris@b12431', `après reprise : ${await joueur()}`);
  // menu « Apparence » : silhouette A, cheveux bleu nuit
  await p.keyboard.press('Escape');
  await p.waitForSelector('[data-key="menu-apparence"]');
  await p.click('[data-key="menu-apparence"]');
  await p.waitForSelector('[data-key="av-apparence-menu"]');
  await p.click('[data-key="av-ap-sil-a"]');
  await p.click('[data-key="av-ap-cheveux-9"]');
  await p.waitForTimeout(600);
  await p.screenshot({ path: join(OUT, '04-menu-apparence.png') });
  await p.click('[data-key="av-apparence-ok"]');
  await townReady();
  await p.waitForTimeout(1500);
  // une autre silhouette garde le visage choisi (il existe sur toutes les feuilles)
  check((await joueur()) === 'player-gris@a02090', `menu : personnage remonté ${await joueur()}`);
  check(norm((await save()).apparence) === norm({ silhouette: 'a', visage: 2, peau: 0, cheveux: 9, yeux: 0 }), 'menu : sauvegardé');
  await p.screenshot({ path: join(OUT, '05-ville-apres-menu.png') });
  // retour à l'origine : plus d'apparence dans la sauvegarde, identifiant historique
  await p.keyboard.press('Escape');
  await p.click('[data-key="menu-apparence"]');
  await p.waitForSelector('[data-key="av-apparence-menu"]');
  await p.click('[data-key="av-ap-cheveux-0"]');
  await p.click('[data-key="av-ap-visage-0"]');
  await p.click('[data-key="av-apparence-ok"]');
  await townReady();
  await p.waitForTimeout(1200);
  check((await save()).apparence === undefined && (await joueur()) === 'player-gris', `origine : sauvegarde sans apparence, ${await joueur()}`);
} finally {
  await browser.close();
  server.stop();
}
const err = erreurs.filter((c) => c.startsWith('error') || c.startsWith('pageerror'));
check(err.length === 0, `console : ${err.length ? err.slice(0, 3).join(' | ') : 'vide'}`);
writeFileSync(join(OUT, 'rapport.json'), `${JSON.stringify({ date: new Date().toISOString(), checks }, null, 1)}\n`);
const ko = checks.filter((c) => !c.startsWith('OK')).length;
console.log(`${checks.length - ko}/${checks.length} contrôles`);
process.exit(ko ? 1 : 0);
