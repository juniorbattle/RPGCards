// M16 — chasse aux cartes en ville et Techniques gagnées, parcours navigateur (contrat `docs/m16/01_CHASSE_ET_TECHNIQUES.md`) :
// (1) la nouvelle aventure propose la Technique de départ (Sondage présélectionnée), Recentrage choisie ; une seule apprise ;
// (2) chapitre I : les cartes du Quai scintillent, le HUD le dit ; on ramasse la carte au clavier : la découverte (carte,
// lieu, compte de la chasse), le registre, le point éteint ; (3) le premier cadet met en jeu l'autre Technique de la rue
// (dialogue, préparation), la victoire la donne (résultat) ; (4) chapitre II : le gardien du Parvis garde sa carte (« ! »),
// le duel d'abord, puis la carte ; (5) le Journal tient « Les cartes de la ville » ; (6) en Récit guidé, aucune carte.
// Usage : npm run build && [LQV_VP=1920x1080] node tools/m16-chasse.mjs [dossier] [rapport.json]
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { launch, rendererLabel, startPreview, watchConsole, webglRenderer } from './browser.mjs';

const VP = (process.env.LQV_VP ?? '1280x720').split('x').map(Number);
const DIR = process.argv[2] ?? `screenshots/qa/m16/chasse-${VP[0]}`;
const OUT = process.argv[3] ?? `artifacts/qa/m16/chasse-${VP[0]}.json`;
const head = execSync('git rev-parse --short HEAD').toString().trim();
mkdirSync(DIR, { recursive: true });
const server = await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4299, process.env.LQV_DIST || 'dist');
const browser = await launch();
const issues = [];
const checks = [];
const check = (ok, what) => { checks.push(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); console.log(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); };
let n = 0;
let renderer = '';
try {
  const ctx = await browser.newContext({ viewport: { width: VP[0], height: VP[1] }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  p.setDefaultTimeout(90000);
  watchConsole(p, issues);
  const shot = async (name) => writeFileSync(`${DIR}/${String(++n).padStart(2, '0')}-${name}.png`, await p.screenshot());
  const av = (fn, arg) => p.evaluate(fn, arg);
  const pret = () => p.waitForFunction(() => { const t = window.__lqvAventure?.town; return !!t && t.stats().frames > 1 && !document.querySelector('.ville-host')?.hidden && !document.querySelector('.ville-fade'); }, null, { timeout: 120000 });
  const faire = (evs) => av((x) => { const a = window.__lqvAventure; for (const ev of x) a.faire(ev); a.rafraichir(); }, evs);
  const fin = async (issue = 'victoire') => {
    await p.waitForFunction(() => window.__lqvAventure.ecran === 'duel' && window.__lqv?.controller);
    await av((i) => window.__lqvAventure.qaTerminer(i), issue);
  };

  await p.goto(`${server.base}/?aventure=1&qa=1&aiDelay=0&profileSeed=31`, { timeout: 90000 });
  renderer = rendererLabel(await webglRenderer(p).catch(() => null));

  // (1) la Technique de départ
  await p.click('[data-key="av-new"]');
  await p.fill('[data-key="av-name"]', 'Lou');
  await p.click('[data-key="av-suite"]');
  await p.waitForSelector('[data-key="av-tech-Sondage"]', { state: 'visible' });
  check(await p.getAttribute('[data-key="av-tech-Sondage"]', 'aria-pressed') === 'true' && await p.getAttribute('[data-key="av-tech-Recentrage"]', 'aria-pressed') === 'false', 'nouvelle aventure : Sondage présélectionnée');
  await p.click('[data-key="av-tech-Recentrage"]');
  check(await p.getAttribute('[data-key="av-tech-Recentrage"]', 'aria-pressed') === 'true', 'Recentrage choisie');
  check(/Insight/.test(await p.getAttribute('[data-key="av-tech-Recentrage"]', 'data-info') ?? ''), 'son effet en infobulle');
  const deborde = await av(() => { const s = document.querySelector('[data-screen="av-nouveau"]'); const r = s.getBoundingClientRect(); return r.bottom > innerHeight + 1 || s.scrollHeight > s.clientHeight + 2; });
  check(!deborde, 'la page du récit et de la Technique tient à l’écran');
  await shot('nouvelle-aventure-technique');
  await p.click('[data-key="av-start"]');
  await pret();
  const e0 = await av(() => { const e = window.__lqvAventure.save.etat; return { cal: e.calendrier, t: e.deck.techniques, reg: e.registre.filter((g) => g.kind === 'technique').map((g) => g.items[0]) }; });
  check(e0.cal === 'm16' && JSON.stringify(e0.t) === '["Recentrage"]' && JSON.stringify(e0.reg) === '["Recentrage"]', `une seule Technique apprise et équipée (${e0.reg})`);

  // (2) chapitre I : les cartes du Quai
  await faire([{ type: 'scene', id: 'P2' }, { type: 'duelPrologue', issue: 'victoire', faits: { assautsGagnes: 3, gardesGagnees: 0, interferencesReussies: 0 } }, { type: 'confirmer', famille: 'Cendre' }]);
  await p.waitForTimeout(600);
  const tr = await av(() => window.__lqvAventure.town.tresors());
  check(tr.includes('quai-caisses') && tr.includes('quai-chapelle'), `deux cartes scintillent sur le Quai (${tr})`);
  const lueurs = await av(() => document.querySelector('[data-key="av-lueurs"]')?.textContent ?? '');
  check(/2 cartes scintillent dans ce quartier/.test(lueurs), `le HUD le dit (« ${lueurs} »)`);
  await av(() => window.__lqvAventure.town.place({ x: 4.4, z: 1.6 }, 'droite'));
  await p.waitForTimeout(900);
  await shot('quai-carte-scintille');
  const pr = await av(() => window.__lqvAventure.town.project({ x: 7, y: 0.8, z: 1 }));
  writeFileSync(`${DIR}/${String(++n).padStart(2, '0')}-quai-carte-zoom.png`, await p.screenshot({ clip: { x: Math.max(0, pr.x - 200), y: Math.max(0, pr.y - 170), width: 400, height: 260 } }));
  await av(() => window.__lqvAventure.town.place({ x: 6.4, z: 1.2 }, 'droite'));
  await p.waitForTimeout(500);
  const bulle = await av(() => window.__lqvAventure.town.zone()?.label ?? null);
  check(bulle === 'Ramasser la carte', `la bulle propose de ramasser (${bulle})`);
  await p.keyboard.press('e');
  await p.waitForSelector('[data-key="av-decouverte"]');
  await p.waitForTimeout(1100);
  await shot('decouverte');
  const dec = await av(() => {
    const e = window.__lqvAventure.save.etat;
    const g = e.registre.find((x) => x.source === 'collecte:quai-caisses');
    return { g: g ? g.items[0] : null, fam: g?.family, compte: document.querySelector('[data-key="av-decouverte-compte"]')?.textContent, carte: !!document.querySelector('.av-decouverte .card'), trouves: e.collecte?.trouves ?? [] };
  });
  check(!!dec.g && dec.fam === 'Cendre' && dec.carte, `la découverte montre une variante de la Cendre (${dec.g})`);
  check(/1 \/ 10/.test(dec.compte ?? ''), `le compte de la chasse (${dec.compte})`);
  await p.click('[data-key="av-decouverte"] [data-key="av-continuer"]');
  await p.waitForTimeout(700);
  check(!(await av(() => window.__lqvAventure.town.tresors())).includes('quai-caisses'), 'le point ramassé s’éteint');
  check(/Une carte scintille dans ce quartier/.test(await av(() => document.querySelector('[data-key="av-lueurs"]')?.textContent ?? '')), 'le HUD n’en compte plus qu’une');

  // (3) le premier cadet : l'autre Technique de la rue
  await av(() => window.__lqvAventure.parler('cadet-Cendre'));
  await p.waitForSelector('.ville-dialog');
  check(/Technique Sondage/.test(await p.textContent('.ville-dialog')), 'le dialogue du cadet met la Technique en jeu');
  await p.click('.ville-dialog [data-key="dlg-duel"]');
  await p.waitForSelector('[data-key="av-preparation"]');
  check(/Sondage/.test(await p.textContent('[data-key="av-tech-en-jeu"]') ?? ''), 'la préparation la montre');
  await shot('preparation-technique-en-jeu');
  await p.click('[data-key="av-duel-go"]');
  const tAdv = await p.waitForFunction(() => window.__lqv?.controller?.match?.state?.players?.p2?.techniques).then((h) => h.jsonValue());
  check(Array.isArray(tAdv) && tAdv.length === 1, `à armes égales : la cadette n’équipe qu’une Technique (${JSON.stringify(tAdv)})`);
  await fin();
  await p.waitForSelector('[data-screen="av-resultat"]');
  await p.waitForTimeout(800);
  check(/Sondage/.test(await p.textContent('[data-screen="av-resultat"]')), 'le résultat donne la Technique Sondage');
  await shot('resultat-technique');
  check(await av(() => JSON.stringify(window.__lqvAventure.save.etat.deck.techniques)) === '["Recentrage","Sondage"]', 'les deux Techniques équipées');
  await p.click('[data-key="av-retour"]');
  await pret();

  // (4) chapitre II : le gardien du Parvis
  await faire([{ type: 'lancerDefi', figure: 'brasDroit-Cendre' }, { type: 'duelStructurant', figure: 'brasDroit-Cendre', issue: 'victoire', duel: 'qa-b' }, { type: 'lancerDefi', figure: 'chef-Cendre' }, { type: 'duelStructurant', figure: 'chef-Cendre', issue: 'victoire', duel: 'qa-c' }]);
  check(await av(() => window.__lqvAventure.save.etat.registre.some((g) => g.key === 'technique:Lecture' && g.source === 'chef:chef-Cendre')), 'la Lecture gagnée face à Bran (avec la Signature)');
  await av(() => window.__lqvAventure.voyager('parvis', 'arrivee'));
  await p.waitForFunction(() => window.__lqvAventure.town?.ilotId() === 'parvis');
  await pret();
  await p.waitForTimeout(600);
  check((await av(() => window.__lqvAventure.town.tresors())).includes('parvis-tableau'), 'la carte gardée scintille au Parvis');
  check(await av(() => !!window.__lqvAventure.town.npcAt('pnj-joueuse-61')), 'sa gardienne se tient à côté');
  await av(() => window.__lqvAventure.town.place({ x: 1.0, z: -13.4 }, 'droite'));
  await p.waitForTimeout(900);
  await shot('parvis-gardienne');
  await av(() => window.__lqvAventure.town.place({ x: 2.0, z: -13.6 }, 'droite'));
  await p.waitForTimeout(400);
  await p.keyboard.press('e');
  await p.waitForSelector('.ville-dialog [data-key="dlg-duel"]');
  check(/une carte en jeu/.test(await p.textContent('.ville-dialog')), 'la lueur gardée : la gardienne propose le duel');
  await p.click('.ville-dialog [data-key="dlg-duel"]');
  await p.waitForSelector('[data-key="av-preparation"]');
  check(/La carte qu’il garde/.test(await p.textContent('[data-key="av-preparation"]')), 'la préparation : la carte en jeu');
  await p.click('[data-key="av-duel-go"]');
  await fin();
  await p.waitForSelector('[data-screen="av-resultat"]');
  await p.click('[data-key="av-retour"]');
  await pret();
  check(await av(() => (window.__lqvAventure.save.etat.collecte?.gardiens ?? []).includes('parvis-tableau')), 'la gardienne battue');
  await av(() => window.__lqvAventure.town.place({ x: 2.0, z: -13.6 }, 'droite'));
  await p.waitForTimeout(400);
  await p.keyboard.press('e');
  await p.waitForSelector('[data-key="av-decouverte"]');
  check(/2 \/ 10/.test(await p.textContent('[data-key="av-decouverte-compte"]')), 'la carte ramassée après le duel (2 / 10)');
  await p.click('[data-key="av-decouverte"] [data-key="av-continuer"]');

  // (5) le Journal
  await p.waitForTimeout(500);
  await p.click('[data-key="av-journal"]');
  await p.waitForTimeout(600);
  const j = await p.textContent('body');
  check(/Les cartes de la ville \(2\/10/.test(j), 'le Journal tient « Les cartes de la ville »');
  await shot('journal-chasse');
  await p.keyboard.press('Escape');

  // (6) en Récit guidé, aucune carte
  await av(() => { const a = window.__lqvAventure; a.save.recit = 'guide'; a.marquer(); });
  await p.waitForTimeout(300);
  check((await av(() => window.__lqvAventure.town.tresors())).length === 0, 'en Récit guidé, aucune carte ne scintille');
} catch (e) {
  check(false, `exception : ${e.message}`);
} finally {
  await browser.close();
  await server.stop();
}
check(issues.length === 0, `console propre (${issues.length})`);
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({ head, renderer, viewport: VP, checks, issues }, null, 2));
const ko = checks.filter((c) => c.startsWith('ÉCHEC')).length;
console.log(`${checks.length - ko}/${checks.length} — ${renderer}`);
process.exit(ko ? 1 : 0);
