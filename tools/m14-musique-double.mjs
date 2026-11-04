// Retour du test du responsable (2026-11-03) : « j'ai l'impression parfois d'entendre 2 musiques en même temps, c'est le cas
// lors d'un combat et peut-être du menu récit ». Une sonde lit, toutes les 50 ms, les versions qui sonnent dans le lecteur
// (`Lecteur.sonnent` : commencées, pas encore éteintes, sur chaque piste) pendant une vraie aventure en Récit guidé, son
// permis (`?son=1`), cinématiques actives, duels joués coup par coup jusqu'à leur fin (la musique finit sur le temps fort,
// puis le jingle) : nouvelle aventure, prologue, duel de Kaï, la foule, l'émissaire, l'affiliation, Préparations et duels
// suivants. Chaque instant où deux morceaux différents sonnent ensemble (hors fondu de sortie d'un même morceau) est
// relevé avec l'écran où il tombe.
// Usage : npm run build && node tools/m14-musique-double.mjs [duels=3]
import { mkdirSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { launch, startPreview, watchConsole } from './browser.mjs';
import { newStats, playTurn } from './duel-driver.mjs';

const DUELS = Number(process.argv[2] ?? 3);
const OUT = process.env.LQV_OUT ?? 'artifacts/qa/m14/musique-double.json';
mkdirSync('artifacts/qa/m14', { recursive: true });
const head = execSync('git rev-parse --short HEAD').toString().trim();
const server = await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4311, process.env.LQV_DIST || 'dist');
const browser = await launch();
const erreurs = [];
const checks = [];
const check = (ok, what) => { checks.push(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); console.log(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); };
let res = null;
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  p.setDefaultTimeout(120000);
  watchConsole(p, erreurs);
  const av = (fn, arg) => p.evaluate(fn, arg);
  await p.goto(`${server.base}/?aventure=1&qa=1&son=1&cine=1&aiDelay=0&profileSeed=41`, { timeout: 90000 });
  await p.click('[data-key="av-new"]');
  await p.waitForFunction(() => window.__lqvSon?.musique.active(), null, { timeout: 90000 });
  await p.fill('[data-key="av-name"]', 'Lou');
  await p.click('[data-key="av-suite"]');
  await p.click('[data-key="av-recit-guide"]');
  // la sonde : à chaque relevé, les versions qui sonnent, l'écran, le niveau de la piste du Fanal
  await av(() => {
    const log = window.__sonde = [];
    const ecran = () => {
      const a = window.__lqvAventure;
      const q = (s) => document.querySelector(s);
      if (!a) return 'accueil';
      if (q('[data-screen="av-resultat"]')) return 'resultat';
      if (q('[data-key="av-prepa"]')) return 'preparation';
      if (a.ecran === 'duel') return 'duel';
      if (a.cine) return 'cine';
      if (q('.ville-dialog')) return `dialogue:${q('.ville-dialog b')?.textContent ?? ''}`;
      return a.ecran ?? '?';
    };
    setInterval(() => {
      const e = window.__lqvSon.musique.etat();
      if (!e) return;
      log.push({ t: performance.now(), ecran: ecran(), sonnent: e.sonnent.map((s) => `${s.piste}:${s.version}`), sources: e.sources, voulu: window.__lqvSon.musique.consigne()?.version ?? null });
    }, 50);
  });
  await p.click('[data-key="av-start"]');

  let duels = 0;
  let bloque = 0;
  const stats = newStats();
  for (let i = 0; i < 6000 && duels < DUELS; i++) {
    const vu = await av(() => {
      const a = window.__lqvAventure;
      const q = (s) => document.querySelector(s);
      const vis = (s) => { const x = q(s); return !!x && !x.hidden && x.getClientRects().length > 0; };
      if (!a) return 'attente';
      if (q('.ville-fade.in')) return 'attente';
      if (vis('[data-screen="av-resultat"]')) return 'resultat';
      if (vis('[data-key="av-choix"]')) return 'variante';
      if (a.ecran === 'duel') return 'duel';
      if (a.cine) return 'attente';
      if (q('[data-key="av-bannieres"]')) return 'bannieres';
      if (q('.av-modal')) return 'modal';
      if (q('.ville-dialog')) return 'dialogue';
      if (vis('[data-key="av-prepa"]')) return 'prepa';
      return 'attente';
    });
    if (vu === 'attente') { if (++bloque > 900) throw new Error('bloqué'); await p.waitForTimeout(100); continue; }
    bloque = 0;
    if (vu === 'duel') {
      // le duel joué jusqu'au bout, à la vitesse du jeu : la musique finit sur le temps fort, puis le jingle
      for (let k = 0; k < 80; k++) {
        const out = await playTurn(p, { name: 'musique', useLecture: false, mode: 'click' }, stats).catch(() => 'ended');
        if (out === 'ended' || out === 'stuck' || await p.$('[data-screen="av-resultat"]')) break;
      }
      await p.waitForSelector('[data-screen="av-resultat"]', { timeout: 240000 });
      duels++;
      // le résultat se lit quelques secondes, comme un joueur
      await p.waitForTimeout(4000);
    } else if (vu === 'resultat') { await p.click('[data-key="av-retour"]'); }
    else if (vu === 'variante') await p.click('[data-key="av-choix"] button');
    else if (vu === 'prepa') {
      await p.waitForTimeout(3000);
      const choix = await p.$('[data-key^="av-prepa-choix-"]');
      await (choix ?? await p.$('[data-key="av-prepa-suite"]')).click();
    } else if (vu === 'bannieres') {
      await p.click('.av-banniere.etat-engageable button');
      await p.waitForFunction(() => !document.querySelector('[data-key="av-bannieres"]') || !!document.querySelector('.av-modal .primary'));
      await p.click('.av-modal .primary');
    } else if (vu === 'modal') await p.click('.av-modal .primary');
    else if (vu === 'dialogue') {
      // une réplique se lit
      await p.waitForTimeout(1200);
      const b = await p.$('.ville-dialog .primary') ?? await p.$('.ville-dialog button');
      await b?.click().catch(() => {});
    }
    await p.waitForTimeout(50);
  }
  await p.waitForTimeout(6000);
  const log = await av(() => window.__sonde);
  // deux morceaux différents en même temps : sur la piste de fond (une instance qui commence avant que l'autre se soit
  // éteinte) ou le fond et une source de la ville audible
  const doubles = [];
  for (const r of log) {
    const fond = [...new Set(r.sonnent.filter((s) => s.startsWith('fond:')))];
    const autres = r.sonnent.filter((s) => !s.startsWith('fond:') && (r.sources?.[s.split(':')[0]]?.x ?? 0) > 0.02);
    if (r.sonnent.filter((s) => s.startsWith('fond:')).length > 1 || (fond.length && autres.length)) doubles.push(r);
  }
  const plages = [];
  for (const r of doubles) {
    const d = plages.at(-1);
    if (d && r.t - d.fin < 120 && d.ecran === r.ecran && d.quoi === r.sonnent.join(' + ')) d.fin = r.t;
    else plages.push({ debut: r.t, fin: r.t, ecran: r.ecran, quoi: r.sonnent.join(' + '), voulu: r.voulu });
  }
  const t0 = log[0]?.t ?? 0;
  res = { head, duels, releves: log.length, doubles: doubles.length, plages: plages.map((x) => ({ ...x, debut: +((x.debut - t0) / 1000).toFixed(2), duree: +((x.fin - x.debut) / 1000 + 0.05).toFixed(2), fin: undefined })) };
  for (const x of res.plages) console.log(`  ${x.debut}s  ${x.duree}s  ${x.ecran}  ${x.quoi}  (voulu ${x.voulu})`);
  // le parcours des écrans et des morceaux, pour lire où il tombe
  const suite = [];
  for (const r of log) { const k = `${r.ecran} | ${r.sonnent.join(' + ') || 'silence'}`; if (suite.at(-1)?.k !== k) suite.push({ k, t: +((r.t - t0) / 1000).toFixed(2) }); }
  res.suite = suite;
  check(duels >= DUELS, `${duels} duels joués jusqu'au bout, ${log.length} relevés`);
  check(plages.length === 0, `aucun instant où deux morceaux sonnent ensemble (${plages.length} plage(s))`);
  check(erreurs.length === 0, `console sans erreur (${erreurs.length})`);
} catch (e) {
  check(false, `exception : ${e.message}`);
} finally {
  writeFileSync(OUT, JSON.stringify({ ...res, checks, erreurs }, null, 2));
  await browser.close();
  server.stop();
}
