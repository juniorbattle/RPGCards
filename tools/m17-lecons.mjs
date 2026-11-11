// M17 — leçons du duel (contrat `docs/m17/01_TUTORIEL_DU_DUEL.md`) : parcours navigateur.
// (1) Jeu standard : chaque leçon (six de base, onze des éléments) jouée de bout en bout en suivant la lumière, comme un
//     joueur, à la souris, au clavier et à la manette simulée (API Gamepad remplacée) ; un geste hors consigne est refusé
//     avec sa raison ; la leçon finie est enregistrée ; l'accueil revient. (2) Premier lancement : la question du profil.
// (3) Aventure : l'entraînement proposé avant le prologue, refusable, mène aux leçons puis au duel contre Kaï ; « Leçons »
//     dans le menu. (4) Planche des leçons (captures du premier geste de chacune).
// M18 : les leçons se jouent au tour assisté (le défaut du jeu, `LQV_TOUR=assiste`) ou au tour classique (`LQV_TOUR=classique`).
// Usage : npm run build && [LQV_VP=1920x1080] [LQV_MODES=souris,clavier,manette] [LQV_REDUIT=1] [LQV_TOUR=classique] node tools/m17-lecons.mjs [dossier] [rapport.json]
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { launch, rendererLabel, startPreview, watchConsole, webglRenderer } from './browser.mjs';

const VP = (process.env.LQV_VP ?? '1280x720').split('x').map(Number);
const REDUIT = process.env.LQV_REDUIT === '1';
const MODES = (process.env.LQV_MODES ?? 'souris,clavier,manette').split(',');
const TOUR = process.env.LQV_TOUR === 'classique' ? 'classique' : 'assiste';
const SUFFIXE = `${VP[0]}${REDUIT ? '-reduit' : ''}${TOUR === 'classique' ? '-classique' : ''}`;
const DIR = process.argv[2] ?? `screenshots/qa/m17/${SUFFIXE}`;
const OUT = process.argv[3] ?? `artifacts/qa/m17/lecons-${SUFFIXE}.json`;
const LECONS = ['clash', 'posture', 'secondaires', 'tactique', 'interferer', 'insight', 'familles', 'effets', 'regard', 'tech-Sondage', 'tech-Recentrage', 'tech-Lecture', 'tech-Ancrage', 'tech-Rupture', 'tech-Dissipation', 'signature', 'prolongation'];
const head = execSync('git rev-parse --short HEAD').toString().trim();
mkdirSync(DIR, { recursive: true });
const server = await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4317, process.env.LQV_DIST || 'dist');
const browser = await launch();
const issues = [];
const checks = [];
const check = (ok, what) => { checks.push(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); console.log(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); return ok; };
const B = { A: 0, B: 1, START: 9, HAUT: 12, BAS: 13, GAUCHE: 14, DROITE: 15 };
const planche = [];
let renderer = '';
const rq = `${REDUIT ? '&reducedMotion=1' : ''}&tour=${TOUR}`;

async function contexte(manette) {
  const ctx = await browser.newContext({ viewport: { width: VP[0], height: VP[1] }, deviceScaleFactor: 1 });
  if (manette) await ctx.addInitScript(() => {
    const pad = { id: 'Manette simulée (STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], vibrationActuator: null, hapticActuators: [], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) };
    Object.defineProperty(Navigator.prototype, 'getGamepads', { configurable: true, value: () => [pad, null, null, null] });
    window.__pad = { set: (i, v) => { pad.buttons[i] = { pressed: v, touched: v, value: v ? 1 : 0 }; } };
  });
  const p = await ctx.newPage();
  p.setDefaultTimeout(60000);
  watchConsole(p, issues);
  return { ctx, p };
}

/** Un joueur : souris (clic au centre), clavier (focus puis Entrée), manette (croix jusqu'à l'élément, puis A). */
function joueur(p, mode) {
  const av = (fn, arg) => p.evaluate(fn, arg);
  const presser = async (i) => { await av((k) => window.__pad.set(k, true), i); await p.waitForTimeout(70); await av((k) => window.__pad.set(k, false), i); await p.waitForTimeout(150); };
  const actif = () => av(() => { const a = document.activeElement; return a && a !== document.body ? (a.dataset.key ?? a.className ?? a.tagName) : null; });
  const atteindre = async (sel) => {
    const vus = new Map();
    for (let i = 0; i < 36; i++) {
      const d = await av((s) => {
        const vis = (e) => e.getClientRects().length > 0;
        const a = document.activeElement;
        const cible = [...document.querySelectorAll(s)].find(vis);
        if (!cible) return 'absent';
        if (a && a !== document.body && (a === cible || cible.contains(a) || a.contains(cible) && a.matches(s))) return 'ok';
        if (!a || a === document.body) return 'bas|droite';
        const r = a.getBoundingClientRect(); const t = cible.getBoundingClientRect();
        const c = (b) => ({ x: b.left + b.width / 2, y: b.top + b.height / 2 });
        const dx = c(t).x - c(r).x; const dy = c(t).y - c(r).y;
        const chevH = t.left < r.right && r.left < t.right; const chevV = t.top < r.bottom && r.top < t.bottom;
        const vertical = chevH ? true : chevV ? false : Math.abs(dy) >= Math.abs(dx);
        const v = dy > 0 ? 'bas' : 'haut'; const h = dx > 0 ? 'droite' : 'gauche';
        return vertical ? `${v}|${h}` : `${h}|${v}`;
      }, sel);
      if (d === 'ok') return true;
      if (d === 'absent') { await p.waitForTimeout(120); continue; }
      const ici = await actif();
      vus.set(ici, (vus.get(ici) ?? 0) + 1);
      const [dir, autre] = d.split('|');
      await presser({ bas: B.BAS, haut: B.HAUT, gauche: B.GAUCHE, droite: B.DROITE }[vus.get(ici) > 1 ? autre : dir]);
    }
    return false;
  };
  let replis = 0;
  return {
    get replis() { return replis; },
    async agir(sel) {
      const box = await p.locator(sel).first().boundingBox().catch(() => null);
      if (!box) return false;
      if (mode === 'souris') { await p.mouse.click(box.x + box.width / 2, box.y + box.height / 2); return true; }
      if (mode === 'clavier') {
        const ok = await av((s) => { const e = document.querySelector(s); e?.focus(); return !!e && document.activeElement === e; }, sel);
        if (!ok) { replis++; await p.mouse.click(box.x + box.width / 2, box.y + box.height / 2); return true; }
        await p.keyboard.press('Enter');
        return true;
      }
      if (await atteindre(sel)) { await presser(B.A); return true; }
      replis++;
      console.log(`  repli manette : ${sel} (focus : ${await actif()})`);
      await p.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      return true;
    },
  };
}

/** Le geste d'un tour libre (aucune lumière) : ce qu'un joueur pressé ferait. */
const LIBRE = () => {
  const c = window.__lqv?.controller;
  const v = c?.view;
  if (!v) return null;
  const k = (x) => `[data-key="${x}"]`;
  const vis = (s) => [...document.querySelectorAll(s)].some((e) => e.getClientRects().length && !e.disabled);
  if (c.sequencing) return vis(k('act-skip')) ? k('act-skip') : null;
  if (v.phase === 'RESOLVED') return vis(k('act-next')) ? k('act-next') : null;
  if (!v.awaitingMe) return null;
  // M18 : au tour assisté, les « Non » des questions posées sur place (et le tour suivant s'enchaîne seul)
  const par = { START: ['act-start', 'tech-non-Sondage', 'tech-non-Recentrage'], PREPARE: ['act-prepare', 'reveal-non-0', 'reveal-non-1'], DISSIPATION: ['act-dissip-pass', 'tech-non-Dissipation'], LECTURE: ['act-lecture-pass', 'tech-non-Lecture'], LECTURE_CHANGE: ['act-lecture-stance', 'stance-assault'], REVISION: ['act-revision-keep'], TACTICS: ['act-tactics'], REPEL: ['act-repel-skip'] }[v.phase];
  if (par) return par.map(k).find(vis) ?? null;
  if (v.phase === 'COMMIT') {
    const dr = c.ui.draft;
    if (!dr.primaryId) return c.ui.selected ? k('place-assault') : '.hand [data-drag-card]';
    if (!dr.stance) return k('stance-assault');
    return k('act-commit');
  }
  return null;
};

async function jouerLecon(p, j, id, capture) {
  const av = (fn, arg) => p.evaluate(fn, arg);
  await av((x) => window.__lqvLecons.lancer([x]), id);
  await p.waitForFunction(() => { const r = document.querySelector('.lecon-rideau'); return document.querySelector('.lecon-coach') && window.__lqv?.controller && r && !r.classList.contains('on') && +getComputedStyle(r).opacity < 0.05; }, null, { timeout: 30000 });
  let anneaux = 0; let refus = 0; let gestes = 0; let premier = true;
  const t0 = Date.now();
  while (Date.now() - t0 < 60000) {
    const st = await av(() => ({ fin: !!document.querySelector('.lecon-fin-overlay'), cibles: JSON.parse(document.querySelector('.lecon-anneaux')?.dataset.cibles || '[]'), anneaux: document.querySelectorAll('.lecon-anneau').length, toast: document.querySelector('.toast')?.textContent ?? '' }));
    if (st.fin) break;
    if (/^Pas |Attends/.test(st.toast)) refus++;
    let sel = null;
    if (st.cibles.length) {
      anneaux = Math.max(anneaux, st.anneaux);
      sel = await av((l) => l.find((s) => [...document.querySelectorAll(s)].some((e) => e.getClientRects().length && !e.disabled)) ?? null, st.cibles);
      if (sel && premier && capture) { premier = false; await p.waitForTimeout(250); planche.push({ id, png: (await p.screenshot()).toString('base64') }); }
    } else sel = await av(LIBRE);
    if (!sel) { await p.waitForTimeout(150); continue; }
    await j.agir(sel);
    gestes++;
    await p.waitForTimeout(140);
  }
  const fin = await av(() => !!document.querySelector('.lecon-fin-overlay'));
  if (fin && capture && id === 'clash') writeFileSync(`${DIR}/fin-lecon.png`, await p.screenshot());
  if (fin) await j.agir('[data-key="lecon-terminer"]');
  else { await p.keyboard.press('Escape'); await p.waitForSelector('.lecon-pause', { timeout: 5000 }).catch(() => {}); await p.click('[data-key="lecon-quitter"]').catch(() => {}); }
  await p.waitForFunction(() => !window.__lqvLecons.active() && !document.querySelector('.lecon-coach'), null, { timeout: 20000 }).catch(() => {});
  const faite = await av((x) => JSON.parse(localStorage.getItem('lqv.lecons') || '{}').faites?.includes(x) ?? false, id);
  return { fin, faite, anneaux, refus, gestes, s: Math.round((Date.now() - t0) / 100) / 10 };
}

try {
  // (1) les dix-sept leçons, dans chaque mode
  const resultats = {};
  for (const mode of MODES) {
    const { ctx, p } = await contexte(mode === 'manette');
    const j = joueur(p, mode);
    await p.goto(`${server.base}/?standard=1&qa=1&lecons=1&aiDelay=0${rq}`, { timeout: 90000 });
    if (!renderer) renderer = rendererLabel(await webglRenderer(p).catch(() => null));
    await p.evaluate(() => localStorage.setItem('lqv.lecons', JSON.stringify({ demande: true, profil: 'decouverte' })));
    await p.reload();
    await p.waitForFunction(() => !!window.__lqvLecons);
    await p.waitForTimeout(500);
    check(!(await p.$('.lecon-profil-overlay')), `${mode} : profil déjà choisi, la question n’est pas posée`);
    resultats[mode] = {};
    for (const id of LECONS) {
      const r = await jouerLecon(p, j, id, mode === MODES[0]);
      resultats[mode][id] = r;
      check(r.fin && r.faite && r.anneaux > 0 && r.refus === 0, `${mode} · ${id} : finie (${r.gestes} gestes, ${r.s} s${r.refus ? `, ${r.refus} refus` : ''})`);
    }
    if (mode !== 'souris') check(j.replis === 0, `${mode} : aucun geste replié sur la souris (${j.replis})`);
    // un geste hors consigne est refusé, avec sa raison
    if (mode === MODES[0]) {
      await p.evaluate(() => window.__lqvLecons.lancer(['clash']));
      await p.waitForFunction(() => window.__lqv?.controller && document.querySelector('.lecon-coach') && +getComputedStyle(document.querySelector('.lecon-rideau')).opacity < 0.05);
      const mauvaise = await p.evaluate(() => { const c = window.__lqv.controller; const id = c.view.me.hand.find((x) => x.defId === 'neutre-1').cardId; return `[data-key="hand-${CSS.escape(id)}"]`; });
      await p.click(mauvaise);
      await p.waitForTimeout(150);
      const refus = await p.evaluate(() => ({ toast: document.querySelector('.toast')?.textContent ?? '', sel: window.__lqv.controller.ui.selected }));
      check(/Neutre IV/.test(refus.toast) && refus.sel === null, `geste hors consigne refusé : « ${refus.toast} »`);
      writeFileSync(`${DIR}/refus.png`, await p.screenshot());
      // pause : Échap ouvre le menu de la leçon, « Quitter les leçons » ramène l'accueil
      await p.keyboard.press('Escape');
      await p.waitForSelector('.lecon-pause');
      await p.click('[data-key="lecon-quitter"]');
      await p.waitForFunction(() => !window.__lqvLecons.active() && !!document.querySelector('[data-key="home-apprendre"]'), null, { timeout: 20000 });
      check(true, 'Échap : pause de la leçon ; quitter ramène l’accueil (« Apprendre » visible)');
      // reduced : rideau sans fondu
      if (REDUIT) check(await p.evaluate(() => document.documentElement.classList.contains('reduced')), 'mouvement réduit : appliqué');
    }
    await ctx.close();
  }

  // (2) premier lancement : la question du profil, puis la séance du profil
  {
    const { ctx, p } = await contexte(false);
    await p.goto(`${server.base}/?standard=1&qa=1&lecons=1&aiDelay=0${rq}`, { timeout: 90000 });
    await p.waitForSelector('.lecon-profil-overlay');
    writeFileSync(`${DIR}/profil.png`, await p.screenshot());
    check(true, 'premier lancement : la question du profil s’ouvre à l’accueil');
    await p.click('[data-key="lecon-profil-habitue"]');
    await p.waitForFunction(() => window.__lqvLecons.active() && document.querySelector('.lecon-coach'));
    const titre = await p.textContent('.lecon-titre');
    check(/Leçon 1 \/ 3/.test(titre ?? ''), `profil « habitué » : trois leçons (${titre})`);
    const court = await p.textContent('.lecon-dire');
    check((court ?? '').length < 90, `phrases courtes (${court})`);
    await p.keyboard.press('Escape');
    await p.click('[data-key="lecon-quitter"]');
    await p.waitForFunction(() => !window.__lqvLecons.active());
    await p.reload();
    await p.waitForSelector('[data-key="home-apprendre"]');
    await p.waitForTimeout(800);
    check(!(await p.$('.lecon-profil-overlay')), 'la question n’est pas reposée');
    await p.click('[data-key="home-apprendre"]');
    await p.waitForSelector('.lecon-biblio');
    const lignes = await p.$$eval('.lecon-biblio .lecon-ligne', (l) => l.length);
    check(lignes === 17, `« Apprendre » : la bibliothèque, ${lignes} leçons`);
    writeFileSync(`${DIR}/bibliotheque.png`, await p.screenshot());
    await ctx.close();
  }

  // (3) aventure : l'entraînement avant le prologue
  {
    const { ctx, p } = await contexte(false);
    const av = (fn, arg) => p.evaluate(fn, arg);
    await p.goto(`${server.base}/?aventure=1&qa=1&lecons=1&aiDelay=0&profileSeed=31${rq}`, { timeout: 90000 });
    await p.click('[data-key="av-new"]');
    await p.fill('[data-key="av-name"]', 'Lou');
    await p.click('[data-key="av-suite"]');
    await p.click('[data-key="av-start"]');
    await p.waitForFunction(() => { const t = window.__lqvAventure?.town; return !!t && t.stats().frames > 1 && !document.querySelector('.ville-host')?.hidden; }, null, { timeout: 120000 });
    await av(() => window.__lqvAventure.parler('kai-prologue'));
    await p.click('.ville-dialog [data-key="dlg-duel"]');
    await p.waitForSelector('.ville-dialog [data-key="dlg-lecons"]');
    await p.waitForTimeout(900);
    writeFileSync(`${DIR}/aventure-entrainement.png`, await p.screenshot());
    check(/entraînement/.test(await p.textContent('.ville-dialog') ?? ''), 'aventure : le maître de table propose l’entraînement avant le prologue');
    await p.click('[data-key="dlg-lecons"]');
    await p.waitForSelector('.lecon-profil-overlay');
    await p.click('[data-key="lecon-profil-decouverte"]');
    await p.waitForFunction(() => document.querySelector('.lecon-coach') && window.__lqv?.controller && window.__lqvAventure.ecran === 'lecon');
    check(/Leçon 1 \/ 6/.test(await p.textContent('.lecon-titre') ?? ''), 'aventure : les six leçons du profil « découverte »');
    await p.waitForFunction(() => +getComputedStyle(document.querySelector('.lecon-rideau')).opacity < 0.05 && !document.querySelector('.ville-fade.in'), null, { timeout: 15000 }).catch(() => {});
    writeFileSync(`${DIR}/aventure-lecon.png`, await p.screenshot());
    await p.keyboard.press('Escape');
    await p.click('[data-key="lecon-quitter"]');
    await p.waitForSelector('[data-key="av-preparation"], [data-key="av-duel-go"]', { timeout: 30000 });
    const leve = await p.waitForFunction(() => { const f = document.querySelector('.ville-fade'); return (!f || +getComputedStyle(f).opacity < 0.05) && +getComputedStyle(document.querySelector('.lecon-rideau') ?? document.body).opacity < 0.05; }, null, { timeout: 15000 }).then(() => true, () => false);
    check(leve, 'aventure : en quittant les leçons, le noir se lève sur la ville et la préparation du duel contre Kaï');
    writeFileSync(`${DIR}/aventure-retour.png`, await p.screenshot());
    await p.click('[data-key="av-duel-back"]').catch(() => {});
    await av(() => window.__lqvAventure.menu());
    await p.click('[data-key="menu-lecons"]');
    await p.waitForSelector('.lecon-biblio');
    check(true, 'aventure : « Leçons » dans le menu ouvre la bibliothèque');
    await p.click('[data-key="lecon-fermer"]');
    // Kaï : l'offre n'est faite qu'une fois
    await av(() => window.__lqvAventure.parler('kai-prologue'));
    await p.click('.ville-dialog [data-key="dlg-duel"]');
    await p.waitForSelector('[data-key="av-preparation"]');
    check(!(await p.$('[data-key="dlg-lecons"]')), 'aventure : l’entraînement n’est proposé qu’une fois');
    await ctx.close();
  }

  // (4) planche
  if (planche.length) {
    const { ctx, p } = await contexte(false);
    const html = `<html><body style="margin:0;background:#111;display:grid;grid-template-columns:repeat(4,1fr);gap:6px;padding:6px;font:14px system-ui;color:#eee">${planche.map((x) => `<figure style="margin:0"><img style="width:100%" src="data:image/png;base64,${x.png}"><figcaption>${x.id}</figcaption></figure>`).join('')}</body></html>`;
    await p.setViewportSize({ width: 1800, height: 1200 });
    await p.setContent(html);
    await p.waitForTimeout(300);
    writeFileSync(`${DIR}/planche-lecons.png`, await p.screenshot({ fullPage: true }));
    await ctx.close();
  }
  writeFileSync(`${DIR}/README.md`, `Planche M17 (leçons) : ${head}, ${VP.join('×')}${REDUIT ? ', mouvement réduit' : ''}.\n`);
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify({ head, viewport: VP, reduit: REDUIT, tour: TOUR, renderer, modes: MODES, checks, issues, resultats }, null, 2));
} finally {
  await browser.close();
  server.stop();
}
const echecs = checks.filter((c) => c.startsWith('ÉCHEC')).length;
console.log(`\n${checks.length - echecs}/${checks.length} contrôles · console : ${issues.length ? issues.join(' | ') : 'vide'}`);
process.exit(echecs || issues.length ? 1 : 0);
