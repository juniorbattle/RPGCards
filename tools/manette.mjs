// Manette de console (passe 210, `src/entree/manette.ts`) : parcours navigateur avec une manette simulée (API Gamepad
// remplacée avant le chargement), sans un clic ni une touche : (1) au repos, rien ne change (ni classe, ni style) ;
// (2) l'écran titre et la nouvelle aventure à la croix et à A, anneau de focus visible ; (3) les cinématiques : A ne les
// coupe pas, B les passe ; (4) les dialogues avancent à A ; (5) un tour de duel joué à la manette (carte choisie, posée en
// Primaire et en Secondaire, verrouillée par Y) ; (6) la marche au stick gauche, analogique (à mi-course plus lente) ;
// (7) Start ouvre le menu, B le ferme.
// Usage : npm run build && [LQV_VP=1920x1080] node tools/manette.mjs [dossier] [rapport.json]
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { launch, rendererLabel, startPreview, watchConsole, webglRenderer } from './browser.mjs';

const VP = (process.env.LQV_VP ?? '1280x720').split('x').map(Number);
const DIR = process.argv[2] ?? `screenshots/qa/manette/${VP[0]}`;
const OUT = process.argv[3] ?? `artifacts/qa/manette/manette-${VP[0]}.json`;
const head = execSync('git rev-parse --short HEAD').toString().trim();
mkdirSync(DIR, { recursive: true });
const server = await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4299, process.env.LQV_DIST || 'dist');
const browser = await launch();
const issues = [];
const checks = [];
const journal = [];
const check = (ok, what) => { checks.push(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); console.log(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); };
const B = { A: 0, B: 1, X: 2, Y: 3, START: 9, HAUT: 12, BAS: 13, GAUCHE: 14, DROITE: 15 };
let n = 0;
let renderer = '';
try {
  const ctx = await browser.newContext({ viewport: { width: VP[0], height: VP[1] }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => {
    const pad = { id: 'Manette simulée (STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], vibrationActuator: null, hapticActuators: [], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) };
    Object.defineProperty(Navigator.prototype, 'getGamepads', { configurable: true, value: () => [pad, null, null, null] });
    window.__pad = { set: (i, v) => { pad.buttons[i] = { pressed: v, touched: v, value: v ? 1 : 0 }; }, axes: (a) => { pad.axes = a; } };
  });
  const p = await ctx.newPage();
  p.setDefaultTimeout(60000);
  watchConsole(p, issues);
  const shot = async (name) => writeFileSync(`${DIR}/${String(++n).padStart(2, '0')}-${name}.png`, await p.screenshot());
  const av = (fn, arg) => p.evaluate(fn, arg);
  const presser = async (i, tenir = 70) => { await av((k) => window.__pad.set(k, true), i); await p.waitForTimeout(tenir); await av((k) => window.__pad.set(k, false), i); await p.waitForTimeout(160); };
  const actif = () => av(() => { const a = document.activeElement; return a && a !== document.body ? (a.dataset.key ?? a.className ?? a.tagName) : null; });
  // va jusqu'à l'élément visé à la croix seulement, en lisant l'écran comme un joueur
  const atteindre = async (sel) => {
    const vus = new Map();
    for (let i = 0; i < 30; i++) {
      const d = await av((s) => {
        const vis = (e) => e.getClientRects().length > 0;
        const a = document.activeElement;
        if (a && a !== document.body && a.matches(s)) return 'ok';
        if (!a || a === document.body) return [...document.querySelectorAll(s)].some(vis) ? 'bas' : 'absent';
        const r = a.getBoundingClientRect();
        const centre = (b) => ({ x: b.left + b.width / 2, y: b.top + b.height / 2 });
        const c0 = centre(r);
        // la cible la plus proche du focus, comme un joueur viserait
        const cibles = [...document.querySelectorAll(s)].filter(vis).map((e) => e.getBoundingClientRect());
        if (!cibles.length) return 'absent';
        const t = cibles.sort((u, v) => Math.hypot(centre(u).x - c0.x, centre(u).y - c0.y) - Math.hypot(centre(v).x - c0.x, centre(v).y - c0.y))[0];
        const dx = centre(t).x - c0.x; const dy = centre(t).y - c0.y;
        const chevH = t.left < r.right && r.left < t.right; const chevV = t.top < r.bottom && r.top < t.bottom;
        const vertical = chevH ? true : chevV ? false : Math.abs(dy) >= Math.abs(dx);
        const v = dy > 0 ? 'bas' : 'haut'; const h = dx > 0 ? 'droite' : 'gauche';
        return vertical ? `${v}|${h}` : `${h}|${v}`;
      }, sel);
      if (d === 'ok') return true;
      if (d === 'absent') { await p.waitForTimeout(150); continue; }
      // un joueur qui tourne en rond essaie l'autre axe
      const ici = await actif();
      vus.set(ici, (vus.get(ici) ?? 0) + 1);
      const [dir, autre] = d.split('|');
      const choix = vus.get(ici) > 1 ? autre : dir;
      if (process.env.LQV_PAD_DEBUG) console.log(`  ${sel} : ${ici} → ${choix}`);
      await presser({ bas: B.BAS, haut: B.HAUT, gauche: B.GAUCHE, droite: B.DROITE }[choix]);
    }
    return false;
  };
  const anneau = () => av(() => { const a = document.activeElement; if (!a || a === document.body) return false; const s = getComputedStyle(a); return document.documentElement.classList.contains('lqv-manette') && s.outlineStyle === 'solid' && parseFloat(s.outlineWidth) >= 2; });

  await p.goto(`${server.base}/?aventure=1&qa=1&aiDelay=0&profileSeed=31&cine=1`, { timeout: 90000 });
  renderer = rendererLabel(await webglRenderer(p).catch(() => null));
  await p.waitForSelector('[data-key="av-new"]');

  // (1) au repos
  check(await av(() => !document.documentElement.classList.contains('lqv-manette') && !document.getElementById('lqv-manette-style')), 'au repos : ni classe ni style de manette (le jeu ne change pas sans manette)');

  // (2) écran titre et nouvelle aventure
  await presser(B.BAS);
  check(await actif() !== null, `un appui sur la croix pose le focus (${await actif()})`);
  check(await atteindre('[data-key="av-new"]'), 'la croix mène à « Nouvelle aventure »');
  check(await anneau(), 'anneau de focus visible à la manette');
  await p.waitForTimeout(400);
  await shot('titre-focus');
  await presser(B.A);
  await p.waitForSelector('[data-key="av-suite"]', { state: 'visible' });
  check(true, 'A ouvre la nouvelle aventure');
  check(await atteindre('[data-key="av-suite"]'), 'la croix mène au bouton « Suite »');
  await shot('nouvelle-aventure');
  await presser(B.A);
  await p.waitForSelector('[data-key="av-start"]', { state: 'visible' });
  check(await atteindre('[data-key="av-start"]'), 'la croix mène au bouton de départ');
  await presser(B.A);
  await p.waitForFunction(() => { const t = window.__lqvAventure?.town; return !!t && t.stats().frames > 1; }, null, { timeout: 120000 });
  check(true, 'A lance l\'aventure');

  // (3) à (5) : à la manette, la Promenade libre jusqu'à la marche, puis le Récit guidé jusqu'après le premier duel
  let cineVue = false; let duelJoue = false; let dialogues = 0; let marcheLibre = false; let bloque = 0; let resultats = 0;
  const aller = async (sel, quoi) => { const ok = await atteindre(sel); if (!ok) check(false, `la croix mène à ${quoi}`); await presser(B.A); await p.waitForTimeout(300); };
  const parcourir = async (fini) => {
  for (let i = 0; i < 900 && !fini(); i++) {
    const vu = await av(() => {
      const a = window.__lqvAventure;
      const q = (s) => document.querySelector(s);
      const vis = (s) => { const x = q(s); return !!x && !x.hidden && x.getClientRects().length > 0; };
      if (q('.ville-fade.in')) return 'attente';
      if (vis('[data-screen="av-resultat"]')) return 'resultat';
      if (vis('[data-key="av-choix"]')) return 'variante';
      if (a.ecran === 'duel') return window.__lqv?.controller?.view?.awaitingMe ? 'duel' : 'attente';
      if (vis('[data-key="av-duel-go"]')) return 'fenetre-de-duel';
      if (a.cine) return 'cine';
      if (q('.av-modal')) return 'modal';
      if (vis('[data-key="av-prepa"]')) return 'prepa';
      if (q('.ville-dialog')) return `dialogue:${q('.ville-dialog b')?.textContent ?? ''}`;
      if (a.ecran === 'ville' && vis('.av-hud') && !a.force && !a.enVoyage) return 'libre';
      return 'attente';
    });
    if (vu === 'attente') { if (++bloque > 900) throw new Error('bloqué'); await p.waitForTimeout(100); continue; }
    bloque = 0;
    if (journal.at(-1) !== vu) journal.push(vu);
    if (vu === 'cine') {
      if (!cineVue) {
        cineVue = true;
        await presser(B.A);
        await p.waitForTimeout(250);
        check(await av(() => !!window.__lqvAventure.cine), 'A ne coupe pas une cinématique');
        await shot('cinematique');
      }
      await presser(B.B);
      await p.waitForTimeout(200);
    } else if (vu.startsWith('dialogue:')) {
      if (dialogues++ === 0) { await p.waitForTimeout(500); check(await anneau() || (await actif()) !== null, 'le bouton du dialogue a le focus'); await shot('dialogue'); }
      await presser(B.A);
      await p.waitForTimeout(250);
    } else if (vu === 'duel' && !duelJoue) {
      duelJoue = true;
      const vue = () => av(() => { const v = window.__lqv.controller.view; return { phase: v.phase, attend: v.awaitingMe, locked: !!v.me.locked }; });
      for (let k = 0; k < 20 && (await vue()).phase !== 'COMMIT'; k++) { if ((await vue()).attend) await presser(B.Y); await p.waitForTimeout(300); }
      const main = () => av(() => document.querySelectorAll('.hand [data-drag-card]').length);
      const avant = await main();
      check(await atteindre('.hand [data-drag-card]'), 'duel : la croix mène à une carte de la main');
      await p.waitForTimeout(300);
      await shot('duel-carte-focus');
      await presser(B.A);
      check(await av(() => !!window.__lqv.controller.ui.selected), 'duel : A choisit la carte');
      check(await atteindre('[data-key="zone-primary"]'), 'duel : la croix mène à la case Primaire');
      await presser(B.A);
      await p.waitForTimeout(300);
      check(await main() === avant - 1, `duel : A pose la carte en Primaire (main ${avant} → ${await main()})`);
      check(await atteindre('.hand [data-drag-card]'), 'duel : retour à la main');
      await presser(B.A);
      check(await atteindre('[data-key^="zone-me-"]'), 'duel : la croix mène à une case Secondaire');
      await presser(B.A);
      await p.waitForTimeout(400);
      if (await p.$('.menu button:focus')) await presser(B.A);
      await p.waitForTimeout(300);
      check(await main() === avant - 2, `duel : seconde carte posée (main ${await main()})`);
      check(await atteindre('.chip.guard'), 'duel : la croix mène à la posture GARDE');
      await presser(B.A);
      await p.waitForTimeout(300);
      check(await av(() => document.querySelector('.chip.guard')?.getAttribute('aria-pressed') === 'true'), 'duel : A choisit la posture');
      await shot('duel-pose');
      await presser(B.Y);
      await p.waitForFunction(() => { const v = window.__lqv.controller.view; return v.me.locked || v.phase !== 'COMMIT'; }, null, { timeout: 15000 }).then(() => check(true, 'duel : Y verrouille (action principale)'), () => check(false, 'duel : Y verrouille (action principale)'));
      await p.waitForTimeout(500);
      await av(() => window.__lqvAventure.qaTerminer('victoire'));
    } else if (vu === 'duel') await av(() => window.__lqvAventure.qaTerminer('victoire'));
    else if (vu === 'libre') { marcheLibre = true; await p.waitForTimeout(100); }
    else if (vu === 'prepa') { if (!journal.includes('prepa-vue')) { journal.push('prepa-vue'); await p.waitForTimeout(400); await shot('preparation'); } await aller('[data-key^="av-prepa-choix-"], [data-key="av-prepa-suite"]', 'la suite de la Préparation'); }
    else if (vu === 'fenetre-de-duel') await aller('[data-key="av-duel-go"]', 'le bouton du duel');
    else if (vu === 'modal') await aller('.av-modal .primary', 'le bouton de la fenêtre');
    else if (vu === 'resultat') { resultats++; await p.waitForTimeout(400); await shot('resultat'); await aller('[data-key="av-retour"]', 'le retour du résultat'); }
    else if (vu === 'variante') await aller('[data-key="av-choix"] button', 'une variante');
  }
  };
  await parcourir(() => marcheLibre);
  check(cineVue, 'une cinématique passée à B');
  check(marcheLibre, 'la marche libre atteinte sans clic ni touche');

  // (6) la marche au stick
  if (marcheLibre) {
    await p.waitForTimeout(800);
    const pos = () => av(() => ({ ...window.__lqvAventure.town.walker().pos }));
    const pousser = async (x, y, ms) => { const a = await pos(); await av((v) => window.__pad.axes(v), [x, y, 0, 0]); await p.waitForTimeout(ms); await av(() => window.__pad.axes([0, 0, 0, 0])); await p.waitForTimeout(500); const b = await pos(); return Math.hypot(b.x - a.x, b.z - a.z); };
    const plein = await pousser(1, 0, 700);
    const plein2 = plein > 0.05 ? plein : await pousser(-1, 0, 700);
    const mi = await pousser(-0.5, 0, 700);
    check(plein2 > 0.5, `le stick gauche fait marcher (${plein2.toFixed(2)} m)`);
    check(mi > 0.05 && mi < plein2 * 0.8, `à mi-course, plus lentement (${mi.toFixed(2)} m contre ${plein2.toFixed(2)})`);
    await shot('marche');
    // (7) Start et B
    await presser(B.START);
    await p.waitForTimeout(500);
    const menu = await av(() => document.querySelector('.ville-dialog b')?.textContent ?? null);
    check(menu === 'Menu', `Start ouvre le menu (${menu})`);
    await presser(B.BAS);
    await p.waitForTimeout(400);
    await shot('menu');
    check(await av(() => !!document.activeElement?.closest('.ville-dialog')), 'la croix reste dans le menu');
    await presser(B.B);
    await p.waitForTimeout(500);
    check(await av(() => !document.querySelector('.ville-dialog')), 'B ferme le menu');
    const apres = await pousser(1, 0, 500);
    check(apres > 0.05 || (await pousser(-1, 0, 500)) > 0.05, 'la marche reprend après le menu');
    // passage au Récit guidé par le menu, à la manette : scènes, dialogues, Préparation et duel
    await presser(B.START);
    await p.waitForTimeout(500);
    check(await atteindre('[data-key="menu-recit"]'), 'la croix mène à « Récit » dans le menu');
    await presser(B.A);
    await p.waitForTimeout(600);
    await parcourir(() => duelJoue && resultats > 0);
    check(dialogues > 0, `dialogues avancés à A (${dialogues})`);
    check(duelJoue, 'un tour de duel joué à la manette');
    check(resultats > 0, 'le résultat quitté à la manette');
  }
  // une vraie souris reprend la main
  await p.mouse.move(200, 200); await p.mouse.move(260, 240);
  check(await av(() => !document.documentElement.classList.contains('lqv-manette')), 'la souris efface le mode manette');
} catch (e) {
  check(false, `exception : ${e.message}`);
} finally {
  await browser.close();
  await server.stop();
}
check(issues.length === 0, `console propre (${issues.length})`);
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({ head, renderer, viewport: VP, checks, journal, issues }, null, 2));
const ko = checks.filter((c) => c.startsWith('ÉCHEC')).length;
console.log(`${checks.length - ko}/${checks.length} — ${renderer}`);
process.exit(ko ? 1 : 0);
