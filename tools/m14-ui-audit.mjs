// M14 — interface hors combat de l'aventure : une capture de chaque écran (titre, nouvelle aventure, ville, bulle, dialogue,
// choix, menu, journal, deck, collection, registre, Salle des Bannières, confirmation, préparation, résultat, récompense), à
// comparer avant et après ; aucune vérification de jeu ici, seulement les débordements (rien hors de la fenêtre) et la console.
// Usage : npm run build && [LQV_VP=1920x1080] node tools/m14-ui-audit.mjs [dossier]
import { mkdirSync } from 'node:fs';
import { launch, startPreview, watchConsole } from './browser.mjs';

const VP = (process.env.LQV_VP ?? '1280x720').split('x').map(Number);
const DIR = process.argv[2] ?? `screenshots/qa/m14/ui-${VP[0]}`;
mkdirSync(DIR, { recursive: true });
const server = await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4306, process.env.LQV_DIST || 'dist');
const browser = await launch();
const issues = [];
const debordements = [];
let n = 0;
try {
  const ctx = await browser.newContext({ viewport: { width: VP[0], height: VP[1] }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  p.setDefaultTimeout(60000);
  watchConsole(p, issues);
  const shot = async (name) => {
    await p.waitForTimeout(250);
    await p.screenshot({ path: `${DIR}/${String(++n).padStart(2, '0')}-${name}.png` });
    // un panneau plus haut ou plus large que la fenêtre, ou un texte coupé, est un défaut d'interface
    const d = await p.evaluate(() => {
      const out = [];
      for (const el of document.querySelectorAll('.av-confirm, .ville-dialog, .ville-objective, .av-titre, .av-prepa, .av-suite, .ville-tools, .ville-place, .ville-hud-bas')) {
        if (el.hidden || !el.getClientRects().length) continue;
        const r = el.getBoundingClientRect();
        if (r.left < -1 || r.top < -1 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1) out.push(`${el.className} [${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.right)},${Math.round(r.bottom)}]`);
      }
      return out;
    });
    if (d.length) debordements.push(`${name} : ${d.join(' ; ')}`);
  };
  const av = (fn, arg) => p.evaluate(fn, arg);
  const pret = () => p.waitForFunction(() => { const t = window.__lqvAventure?.town; return !!t && t.stats().frames > 1 && !document.querySelector('.ville-host').hidden; }, null, { timeout: 120000 });
  const fermer = () => av(() => { const a = window.__lqvAventure; a.fermerModal(); a.fermerDialogue(); });

  await p.goto(`${server.base}/?aventure=1&qa=1&aiDelay=0&profileSeed=31`, { timeout: 90000 });
  await p.waitForSelector('[data-key="av-new"]');
  await shot('titre-neuf');
  await p.click('[data-key="av-new"]');
  await p.waitForSelector('[data-key="av-suite"]');
  await p.waitForSelector('.av-ap-sil, .av-apparence', { timeout: 20000 }).catch(() => {});
  await shot('nouvelle-aventure');
  await p.fill('[data-key="av-name"]', 'Lou');
  await p.click('[data-key="av-suite"]');
  await p.waitForSelector('[data-key="av-start"]', { state: 'visible' });
  await p.waitForTimeout(400);
  await shot('nouvelle-aventure-recit');
  await p.click('[data-key="av-start"]');
  await pret();
  await p.waitForFunction(() => !document.querySelector('.ville-card'), null, { timeout: 15000 }).catch(() => {});
  await shot('ville-libre');
  const kai = await av(() => { const a = window.__lqvAventure; return a.posesDe('quai').find((x) => /gris|kai/i.test(x.id) || /Kaï/.test(x.nom))?.id; });
  await av((id) => window.__lqvAventure.qaDevant(id), kai);
  await p.waitForTimeout(400);
  await shot('ville-bulle');
  await av((id) => window.__lqvAventure.parler(id), kai);
  await p.waitForSelector('.ville-dialog');
  await shot('dialogue');
  await p.click('.ville-dialog [data-key="dlg-duel"]');
  await p.waitForSelector('[data-key="av-duel-go"]');
  await shot('preparation-duel');
  await p.click('[data-key="av-duel-go"]');
  await p.waitForFunction(() => !!window.__lqv?.controller?.view?.awaitingMe, null, { timeout: 120000 });
  await av(() => window.__lqvAventure.qaTerminer('victoire'));
  await p.waitForSelector('[data-screen="av-resultat"]');
  await shot('resultat');
  await p.click('[data-key="av-retour"]');
  await pret();
  await p.waitForSelector('.ville-dialog', { timeout: 15000 });
  await p.waitForTimeout(300);
  await shot('dialogue-foule');
  await fermer();

  await av(() => window.__lqvAventure.emissaireDialog('Astre'));
  await p.waitForSelector('.ville-dialog');
  await shot('dialogue-trois-choix');
  await p.click('.ville-dialog [data-key="dlg-accepter"]');
  await p.waitForSelector('.av-modal');
  await shot('confirmation-affiliation');
  await fermer();

  await p.click('[data-key="av-menu"]');
  await p.waitForSelector('[data-key="menu-recit"]');
  await shot('menu');
  await fermer();

  // chapitre II : un joueur avancé, pour remplir journal, deck, collection et bannières
  await av(() => {
    const a = window.__lqvAventure;
    const c = (r) => [{ type: 'lancerDefi', figure: `${r}-Astre` }, { type: 'duelStructurant', figure: `${r}-Astre`, issue: 'victoire', duel: `ui-${r}` }, { type: 'combat', issue: 'victoire' }];
    return a.qaFaits([{ type: 'scene', id: 'P6' }, { type: 'confirmer', famille: 'Astre' }, ...c('cadet'), ...c('brasDroit'), ...c('chef')]);
  });
  await p.waitForTimeout(400);
  await shot('ville-chapitre-II');
  await p.click('[data-key="av-journal"]');
  await p.waitForSelector('.av-modal');
  await shot('journal');
  await fermer();
  await p.click('[data-key="av-deck"]');
  await p.waitForSelector('.av-modal');
  await shot('deck');
  const onglets = await p.$$('.av-onglets button');
  await onglets[1].click();
  await shot('collection');
  await (await p.$$('.av-onglets button'))[2].click();
  await shot('registre');
  await fermer();
  await av(() => window.__lqvAventure.salleDesBannieres());
  await p.waitForSelector('.av-modal');
  await shot('salle-des-bannieres');
  await p.click('.av-banniere.etat-engageable button');
  await p.waitForTimeout(300);
  await shot('confirmation-engagement');
  await fermer();

  // le Récit guidé
  await av(() => { window.__lqvAventure.save.recit = 'guide'; });
  await p.waitForSelector('[data-key="av-prepa"]');
  await p.waitForFunction(() => !document.querySelector('.ville-fade'), null, { timeout: 15000 });
  await shot('preparation-recit-guide');
  await av(() => window.__lqvAventure.titre());
  await p.waitForSelector('[data-key="av-continue"]');
  await shot('titre-reprise');
  await ctx.close();
} finally {
  await browser.close();
  server.stop();
}
console.log(`${n} captures dans ${DIR}`);
console.log(debordements.length ? `DÉBORDEMENTS :\n${debordements.join('\n')}` : 'aucun débordement');
console.log(issues.length ? `console : ${issues.length}\n${issues.slice(0, 5).map((i) => String(i.text ?? i).slice(0, 200)).join('\n')}` : 'console : aucune erreur');
