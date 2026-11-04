// Passe 200 — la fluidité (`src/aventure/rideau.ts`), mesurée image par image : le jeu joué avec les cinématiques, sans
// mouvement réduit ; une sonde lit à chaque image le rideau, l'écran, le dialogue, la fenêtre et la caméra, et compte les
// coupures qu'un joueur verrait : un écran qui change, un dialogue ou une fenêtre qui disparaît sans fondu, le noir qui saute,
// la caméra qui saute dans une image visible.
// Récit guidé (prologue, duels, Préparation, séquences) puis Promenade libre (quartiers, dialogue, duel).
// Usage : npm run build && [LQV_VP=1920x1080] [LQV_ETAPES=120] node tools/m14-fluidite.mjs [dossier] [rapport.json]
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { launch, rendererLabel, startPreview, watchConsole, webglRenderer } from './browser.mjs';

const VP = (process.env.LQV_VP ?? '1280x720').split('x').map(Number);
const ETAPES = Number(process.env.LQV_ETAPES) || 120;
const DIR = process.argv[2] ?? `screenshots/qa/m14/fluidite-${VP[0]}`;
const OUT = process.argv[3] ?? `artifacts/qa/m14/fluidite-${VP[0]}.json`;
const head = execSync('git rev-parse --short HEAD').toString().trim();
mkdirSync(DIR, { recursive: true });
const server = await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4298, process.env.LQV_DIST || 'dist');
const browser = await launch();
const issues = [];
const checks = [];
const check = (ok, what) => { checks.push(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); console.log(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); };
let renderer = '';
let mesures = {};

/** La sonde, dans la page : une lecture par image, un compte des coupures. */
const sonde = () => {
  const f = window.__fluide = { images: 0, coupures: [], lentes: [], pirePasNoir: 0, pirePasCam: 0, pireImageVisible: 0, marche: true };
  const op = (x) => (x ? Number(getComputedStyle(x).opacity) : 0);
  const lire = () => {
    const a = window.__lqvAventure;
    const v = document.querySelector('.ville-fade');
    const m = document.querySelector('.av-modal');
    const noir = op(v);
    const fondNoir = m?.classList.contains('noire') ? op(m) : 0;
    const shell = document.getElementById('shell');
    const scr = [...(shell?.children ?? [])].map((c) => c.getAttribute('data-screen') ?? '').join('|');
    const s = a?.town?.stats?.();
    return {
      t: performance.now(), noir, couvre: Math.max(noir, fondNoir),
      // ce qui est à l'écran : la ville, le plateau ou l'écran de l'enveloppe
      ecran: `${a?.ecran}:${scr}`,
      dialogue: !!document.querySelector('.ville-dialog'), dialogueSort: !!document.querySelector('.ville-dialog-sortie'),
      fenetre: !!m, fenetreSort: !!document.querySelector('.av-modal-sortie'), fantome: !!document.querySelector('.shell-fantome'),
      cam: a?.ecran === 'ville' ? s?.cam ?? null : null,
    };
  };
  // la première lecture peut dater de l'image d'avant : elle ne compte pas
  let p = null;
  const noter = (quoi, c) => { if (f.coupures.length < 40) f.coupures.push({ quoi, t: Math.round(c.t), ecran: c.ecran, couvre: +c.couvre.toFixed(2) }); };
  const tour = () => {
    const c = lire();
    if (!p) { p = c; requestAnimationFrame(tour); return; }
    const dt = c.t - p.t;
    f.images++;
    const visible = Math.max(p.couvre, c.couvre) < 0.97;
    if (visible && dt > f.pireImageVisible) f.pireImageVisible = dt;
    if (visible && dt > 60 && f.lentes.length < 30) f.lentes.push({ ms: Math.round(dt), t: Math.round(c.t), ecran: c.ecran, couvre: +c.couvre.toFixed(2), noir: +p.noir.toFixed(2), scene: !!window.__lqvAventure?.cine || c.dialogue });
    // le noir : continu d'une image à l'autre (une image longue ne compte pas : elle n'est pas un saut du fondu)
    const pas = Math.abs(c.noir - p.noir);
    if (dt < 40) { f.pirePasNoir = Math.max(f.pirePasNoir, pas); if (pas > 0.3 && Math.abs(c.couvre - p.couvre) > 0.3) noter('le noir saute', c); }
    if (visible && c.ecran !== p.ecran && !c.fantome) noter(`écran coupé (${p.ecran} → ${c.ecran})`, c);
    if (visible && p.dialogue && !c.dialogue && !c.dialogueSort) noter('dialogue coupé', c);
    if (visible && p.fenetre && !c.fenetre && !c.fenetreSort) noter('fenêtre coupée', c);
    if (visible && c.cam && p.cam) {
      const d = Math.hypot(c.cam[0] - p.cam[0], c.cam[1] - p.cam[1], c.cam[2] - p.cam[2]);
      f.pirePasCam = Math.max(f.pirePasCam, d);
      if (d > 2.5 && dt < 40) noter(`caméra coupée (${d.toFixed(1)} m ; plan ${window.__lqvAventure?.cine?.etape ?? 'hors cinématique'} ; ${p.cam.map((x) => x.toFixed(1))} → ${c.cam.map((x) => x.toFixed(1))})`, c);
    }
    p = c;
    if (f.marche) requestAnimationFrame(tour);
  };
  requestAnimationFrame(tour);
};

try {
  // LQV_SYSTEME_REDUIT=1 : le navigateur annonce « mouvement réduit », comme sur un Windows aux animations coupées (2026-11-03) ;
  // l'aventure garde ses fondus (son réglage, non par défaut)
  const ctx = await browser.newContext({ viewport: { width: VP[0], height: VP[1] }, deviceScaleFactor: 1, ...(process.env.LQV_SYSTEME_REDUIT === '1' ? { reducedMotion: 'reduce' } : {}) });
  const p = await ctx.newPage();
  p.setDefaultTimeout(Number(process.env.LQV_QA_TIMEOUT) || 90000);
  watchConsole(p, issues);
  const av = (fn, arg) => p.evaluate(fn, arg);
  let n = 0;
  const shot = async (name) => writeFileSync(`${DIR}/${String(++n).padStart(2, '0')}-${name}.png`, await p.screenshot());
  // une rafale pendant une transition, pour la voir à l'œil
  const rafale = async (name, fois = 5, pause = 120) => { for (let i = 0; i < fois; i++) { await shot(`${name}-${i}`); await p.waitForTimeout(pause); } };
  const vis = (s) => av((x) => { const e = document.querySelector(x); return !!e && !e.hidden && e.getClientRects().length > 0; }, s);

  await p.goto(`${server.base}/?aventure=1&qa=1&aiDelay=0&profileSeed=41&cine=1`, { timeout: Number(process.env.LQV_QA_NAV_TIMEOUT) || 90000 });
  renderer = rendererLabel(await webglRenderer(p).catch(() => null));
  await av(sonde);

  // Récit guidé : du titre au prologue, puis la trame, en jouant les scènes jusqu'au bout (quelques cinématiques passées)
  await p.click('[data-key="av-new"]');
  await p.click('[data-key="av-suite"]');
  await p.click('[data-key="av-recit-guide"]');
  await p.click('[data-key="av-start"]');
  await rafale('titre-vers-ville', 4, 160);
  let etapes = 0;
  let cines = 0;
  let duels = 0;
  let prepas = 0;
  let rafales = 0;
  let bloque = 0;
  while (etapes < ETAPES) {
    const vu = await av(() => {
      const a = window.__lqvAventure;
      const q = (s) => document.querySelector(s);
      const v = (s) => { const x = q(s); return !!x && !x.hidden && x.getClientRects().length > 0; };
      if (q('.ville-fade.in')) return 'attente';
      if (v('[data-screen="av-resultat"]')) return 'resultat';
      if (v('[data-key="av-choix"]')) return 'variante';
      if (a.ecran === 'duel') return window.__lqv?.controller?.view?.awaitingMe ? 'duel' : 'attente';
      if (a.cine) return 'cine';
      if (q('[data-key="av-bannieres"]')) return 'bannieres';
      if (q('.av-modal')) return 'modal';
      if (q('.ville-dialog')) return 'dialogue';
      if (v('[data-key="av-prepa"]')) return 'prepa';
      return 'attente';
    });
    if (vu === 'attente' || vu === 'cine') {
      // une cinématique sur trois est passée : le fondu de « Passer » compte aussi
      if (vu === 'cine' && ++cines % 12 === 4) await p.keyboard.press('Escape');
      if (++bloque > 900) throw new Error(`bloqué sur ${vu}`);
      await p.waitForTimeout(50);
      continue;
    }
    bloque = 0;
    etapes++;
    if (vu === 'prepa') {
      prepas++;
      await p.waitForTimeout(700);
      if (rafales === 0) { rafales++; await shot('preparation'); }
      const choix = await p.$('[data-key^="av-prepa-choix-"]');
      await (choix ?? await p.$('[data-key="av-prepa-suite"]')).click();
      if (rafales === 1) { rafales++; await rafale('preparation-vers-scene', 6, 120); }
      await p.waitForFunction(() => !document.querySelector('[data-key="av-prepa"]'));
    } else if (vu === 'resultat') { await p.waitForTimeout(900); await p.click('[data-key="av-retour"]'); }
    else if (vu === 'variante') await p.click('[data-key="av-choix"] button');
    else if (vu === 'duel') {
      await p.waitForTimeout(600);
      await av(() => window.__lqvAventure.qaTerminer('victoire'));
      if (duels++ === 0) await rafale('fin-de-duel', 8, 160);
      await p.waitForSelector('[data-screen="av-resultat"]');
    } else if (vu === 'bannieres') {
      await p.waitForTimeout(500);
      await p.click('.av-banniere.etat-engageable button');
      await p.waitForFunction(() => !document.querySelector('[data-key="av-bannieres"]') || !!document.querySelector('.av-modal .primary'));
      await p.click('.av-modal .primary');
    } else if (vu === 'modal') { await p.waitForTimeout(500); await p.click('.av-modal .primary'); }
    else if (vu === 'dialogue') {
      await p.waitForTimeout(650); // le temps de lire : les fondus se jouent en entier
      const b = await p.$('.ville-dialog .primary') ?? await p.$('.ville-dialog button');
      await b?.click().catch(() => undefined);
    }
    await p.waitForTimeout(60);
  }
  mesures.guide = await av(() => window.__fluide);
  mesures.parcours = { etapes, duels, prepas, cines };
  check(duels >= 3 && prepas >= 2, `Récit guidé : ${etapes} étapes, ${duels} duels, ${prepas} Préparations, ${cines} instants de cinématique`);
  check(mesures.guide.coupures.length === 0, `Récit guidé : aucune coupure sur ${mesures.guide.images} images (${mesures.guide.coupures.length}${mesures.guide.coupures.length ? ` : ${JSON.stringify(mesures.guide.coupures.slice(0, 4))}` : ''})`);

  // Promenade libre : un quartier, un dialogue, un duel, et retour
  await p.goto(`${server.base}/?aventure=1&qa=1&aiDelay=0&profileSeed=42&cine=1`, { timeout: 90000 });
  await av(sonde);
  await p.click('[data-key="av-new"]');
  await p.waitForFunction(() => /Recommencer/.test(document.body.textContent) || !!document.querySelector('[data-key="av-name"]'));
  const conf = await p.$('button:has-text("Recommencer")');
  if (conf) await conf.click();
  await p.waitForSelector('[data-key="av-suite"]');
  await p.click('[data-key="av-suite"]'); await p.click('[data-key="av-start"]');
  await p.waitForFunction(() => { const a = window.__lqvAventure; return !!a?.town && a.ecran === 'ville' && !a.cine && !document.querySelector('.ville-fade'); }, null, { timeout: 120000 });
  check(await vis('.av-hud'), 'Promenade libre : le HUD');
  await p.waitForTimeout(600);
  await av(() => window.__lqvAventure.menu());
  await p.waitForSelector('.ville-dialog');
  await p.waitForTimeout(500);
  await p.keyboard.press('Escape');
  await p.waitForTimeout(500);
  await av(() => window.__lqvAventure.voyager('parvis', 'arrivee'));
  await rafale('promenade-voyage', 4, 110);
  await p.waitForFunction(() => { const a = window.__lqvAventure; return a.town.ilotId() === 'parvis' && !a.cine && !document.querySelector('.ville-fade'); }, null, { timeout: 60000 });
  await p.waitForTimeout(500);
  await av(() => window.__lqvAventure.voyager('quai', 'arrivee'));
  await p.waitForFunction(() => { const a = window.__lqvAventure; return a.town.ilotId() === 'quai' && !a.cine && !document.querySelector('.ville-fade'); }, null, { timeout: 60000 });
  await p.waitForTimeout(400);
  await av(() => window.__lqvAventure.menu());
  await p.waitForSelector('[data-key="menu-home"]');
  await p.click('[data-key="menu-home"]');
  await p.waitForSelector('[data-screen="av-titre"]');
  await p.waitForFunction(() => !document.querySelector('.ville-fade'), null, { timeout: 20000 });
  await p.waitForTimeout(300);
  mesures.promenade = await av(() => window.__fluide);
  check(mesures.promenade.coupures.length === 0, `Promenade libre : aucune coupure sur ${mesures.promenade.images} images (${mesures.promenade.coupures.length}${mesures.promenade.coupures.length ? ` : ${JSON.stringify(mesures.promenade.coupures.slice(0, 4))}` : ''})`);
  await ctx.close();
} finally {
  await browser.close();
  await server.stop();
}
check(issues.length === 0, `console propre (${issues.length})`);
for (const i of issues.slice(0, 5)) console.log(String(i.text ?? i).slice(0, 240));
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({ head, renderer, viewport: VP, checks, mesures }, null, 1));
const ko = checks.filter((c) => c.startsWith('ÉCHEC')).length;
console.log(`${checks.length - ko}/${checks.length} — ${renderer}`);
console.log(JSON.stringify({ guide: { images: mesures.guide?.images, pirePasNoir: mesures.guide?.pirePasNoir, pirePasCam: mesures.guide?.pirePasCam, pireImageVisible: mesures.guide?.pireImageVisible }, promenade: { images: mesures.promenade?.images, pirePasNoir: mesures.promenade?.pirePasNoir, pirePasCam: mesures.promenade?.pirePasCam } }));
process.exit(ko ? 1 : 0);
