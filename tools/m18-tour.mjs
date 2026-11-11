// M18 — le tour fluide (contrat `docs/m18/01_TOUR_FLUIDE.md`) : parcours navigateur.
// (1) Tour assisté, à la souris, au clavier et à la manette simulée (API Gamepad remplacée) : un Duel standard contre Kaï
//     (graine fixe, Techniques Sondage et Lecture pour que les questions paraissent), joué comme un joueur qui suit la
//     consigne posée sur place. On compte les gestes par tour ; à chaque instant où le joueur n'a rien à choisir (le rival
//     joue, le Clash se présente, la pause d'après le Clash), on vérifie qu'aucun bouton n'attend (pas de « Tour suivant »,
//     aucun bouton dans le panneau) et que le tour suivant commence seul ; une seule consigne à la fois ; les bandeaux
//     d'étape paraissent (aussi en mouvement réduit) ; aucun conseil contextuel.
// (2) Tour classique, même graine : les gestes par tour d'avant M18 (comparaison) et les captures « avant ».
// (3) Le réglage : Options du jeu standard et menu de l'aventure.
// (4) Planche avant / après de chaque étape.
// Usage : npm run build && [LQV_VP=1920x1080] [LQV_MODES=souris,clavier,manette] [LQV_REDUIT=1] [LQV_TOURS=4] node tools/m18-tour.mjs [dossier] [rapport.json]
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync as ecrireBrut } from 'node:fs';
import { dirname } from 'node:path';
import { launch, rendererLabel, startPreview, watchConsole, webglRenderer } from './browser.mjs';

/** Écriture qui réessaie : sous Windows, un fichier déjà présent peut être verrouillé un instant (erreur UNKNOWN, -4094). */
function writeFileSync(path, data) {
  for (let i = 0; ; i++) {
    try { return ecrireBrut(path, data); } catch (e) {
      if (i >= 8) throw e;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250 * (i + 1));
    }
  }
}

const VP = (process.env.LQV_VP ?? '1280x720').split('x').map(Number);
const REDUIT = process.env.LQV_REDUIT === '1';
const MODES = (process.env.LQV_MODES ?? 'souris,clavier,manette').split(',');
const TOURS = Number(process.env.LQV_TOURS) || 4;
const SUFFIXE = `${VP[0]}${REDUIT ? '-reduit' : ''}`;
const DIR = process.argv[2] ?? `screenshots/qa/m18/${SUFFIXE}`;
const OUT = process.argv[3] ?? `artifacts/qa/m18/tour-${SUFFIXE}.json`;
const head = execSync('git rev-parse --short HEAD').toString().trim();
mkdirSync(DIR, { recursive: true });
const server = await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4321, process.env.LQV_DIST || 'dist');
const browser = await launch();
const issues = [];
const checks = [];
const check = (ok, what) => { checks.push(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); console.log(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); return ok; };
const B = { A: 0, B: 1, START: 9, HAUT: 12, BAS: 13, GAUCHE: 14, DROITE: 15 };
const DUEL = `autostart=1&seed=20261016&rival=braise&tech=Sondage,Lecture&aiDelay=300${REDUIT ? '&reducedMotion=1' : ''}`;
let renderer = '';
/** Captures de la planche : étape → { avant, apres } (PNG en base64). */
const planche = {};
const ETAPES = [['start', 'Début : Technique'], ['prepare', 'Préparation'], ['commit', 'Engagement : carte choisie'], ['pret', 'Engagement : prêt'], ['tactics', 'Choix tactiques'], ['resolu', 'Après le Clash'], ['annonce', 'Bandeau d’étape']];

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
        const ok = await av((s) => { const e = [...document.querySelectorAll(s)].find((x) => x.getClientRects().length); e?.focus(); return !!e && document.activeElement === e; }, sel);
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

/** État du duel lu dans la page (vue du joueur, présentation, tour assisté). */
const ETAT = () => {
  const c = window.__lqv?.controller;
  if (!c) return null;
  const v = c.view;
  const vis = (e) => e.getClientRects().length > 0 && !e.disabled;
  const app = document.getElementById('app');
  const boutonsPanneau = [...app.querySelectorAll('.command .btn')].filter(vis).map((b) => b.dataset.key);
  return {
    turn: v.turn, phase: v.phase, me: v.awaitingMe || (v.phase === 'REPEL' && !!v.repel?.mine), seq: c.sequencing, fin: v.phase === 'ENDED',
    hp: [v.me.hp, v.opp.hp],
    assiste: c.assiste,
    actNext: [...app.querySelectorAll('[data-key="act-next"]')].some(vis),
    boutonsPanneau,
    primaire: [...app.querySelectorAll('[data-primary-action]')].filter(vis).map((b) => b.dataset.key),
    valider: [...app.querySelectorAll('[data-key="act-tactics"]')].some(vis),
    consignes: [...app.querySelectorAll('.ask-tech, .ask-ligne')].filter((e) => e.getClientRects().length).length,
    tip: !!app.querySelector('.tip'),
    annonce: document.querySelector('#annonce .annonce')?.textContent ?? '',
    assist: window.__lqv.assist?.() ?? null,
  };
};

/** Le geste suivant au tour assisté : ce que la consigne posée sur place demande (null : rien à faire). */
const GESTE_ASSISTE = (tour) => {
  const c = window.__lqv?.controller;
  const v = c?.view;
  if (!v || (c.sequencing && !(v.phase === 'REPEL' && v.repel?.mine))) return null;
  const k = (x) => `[data-key="${x}"]`;
  const vis = (s) => [...document.querySelectorAll(s)].some((e) => e.getClientRects().length && !e.disabled);
  if (v.phase === 'REPEL' && v.repel?.mine) { const z = document.querySelector('.side.opp .zone.targetable'); return z ? `[data-key="${z.dataset.key}"]` : k('act-repel-skip'); }
  if (!v.awaitingMe) return null;
  const tech = document.querySelector('.ask-tech[data-key^="ask-tech-"]');
  if (tech) { const t = tech.dataset.key.slice(9); return k(`tech-${t === 'Sondage' ? 'oui' : 'non'}-${t}`); }
  const reserve = document.querySelector('[data-key^="reveal-oui-"]');
  if (reserve) return k(reserve.dataset.key);
  if (c.ui.menuSlot !== null) { const i = c.ui.menuSlot; return vis(k(`menu-${i}-rank`)) ? k(`menu-${i}-rank`) : k(`menu-${i}-keep`); }
  if (c.ui.targetingFor !== null) { const z = document.querySelector('.side.opp .zone.targetable'); return z ? `[data-key="${z.dataset.key}"]` : null; }
  switch (v.phase) {
    // aux choix tactiques, aucun bouton à cliquer : le dernier choix les envoie
    case 'TACTICS': return null;
    case 'REVISION': return k('act-revision-keep');
    case 'LECTURE_CHANGE': return k('stance-guard');
    case 'COMMIT': {
      const dr = c.ui.draft;
      if (!dr.primaryId) return c.ui.selected ? k(tour % 2 ? 'place-assault' : 'place-guard') : '.hand [data-drag-card]';
      // au premier tour, une Secondaire aussi (elle chargera, puis on la révèle)
      if (tour === 1 && !dr.secondaryId && vis('.hand [data-drag-card]')) return c.ui.selected ? k('place-secondary') : '.hand [data-drag-card]';
      return k('act-commit');
    }
    default: return null;
  }
};

/** Le geste suivant au tour classique (l'affichage d'avant M18), pour comparer. */
const GESTE_CLASSIQUE = (tour) => {
  const c = window.__lqv?.controller;
  const v = c?.view;
  if (!v || c.sequencing) return null;
  const k = (x) => `[data-key="${x}"]`;
  if (v.phase === 'RESOLVED') return k('act-next');
  if (v.phase === 'REPEL' && v.repel?.mine) return k('act-repel-skip');
  if (!v.awaitingMe) return null;
  switch (v.phase) {
    case 'START': return c.ui.startTech || !v.me.techniques.includes('Sondage') || v.me.insight < 1 || v.me.techniqueUsed ? k('act-start') : k('tech-me-Sondage');
    case 'PREPARE': return c.ui.reveal.length || !v.me.slots.some((s) => s?.state === 'hidden') ? k('act-prepare') : `[data-key="zone-me-${v.me.slots.findIndex((s) => s?.state === 'hidden')}"]`;
    case 'DISSIPATION': return k('act-dissip-pass');
    case 'LECTURE': return k('act-lecture-pass');
    case 'LECTURE_CHANGE': return k('act-lecture-stance');
    case 'REVISION': return k('act-revision-keep');
    case 'TACTICS': {
      const i = v.me.slots.findIndex((s, n) => s?.state === 'active' && !c.ui.plans[n]);
      if (c.ui.menuSlot !== null) return k(`menu-${c.ui.menuSlot}-rank`);
      if (i >= 0 && !c.ui.plans[i]) return `[data-key="zone-me-${i}"]`;
      return k('act-tactics');
    }
    case 'COMMIT': {
      const dr = c.ui.draft;
      if (!dr.primaryId) return c.ui.selected ? k(tour % 2 ? 'place-assault' : 'place-guard') : '.hand [data-drag-card]';
      if (tour === 1 && !dr.secondaryId) return c.ui.selected ? k('place-secondary') : '.hand [data-drag-card]';
      return k('act-commit');
    }
    default: return null;
  }
};

/**
 * Joue `TOURS` tours. Rend les gestes par tour et les contrôles « rien n'attend » ; capture la première occurrence de
 * chaque étape (`captures` : clé de la planche).
 */
async function jouerDuel(p, j, tour, captures) {
  const av = (fn, arg) => p.evaluate(fn, arg);
  const gestesParTour = {};
  const attentes = []; // durée (ms) entre la fin du Clash présenté et le tour suivant, sans geste
  const fautes = [];
  let consignesMax = 0;
  let tips = 0;
  let resoluDepuis = 0;
  let resoluTour = 0;
  let precedent = '';
  let precedentDebug = "";
  const vu = new Set();
  const capturer = async (cle) => {
    if (!captures || vu.has(cle)) return;
    vu.add(cle);
    // un temps fort au centre (Technique, regard) passe d'abord ; le bandeau, lui, se capture tout de suite
    if (cle !== 'annonce') await p.waitForFunction(() => !window.__lqv.activations().busy, null, { timeout: 8000 }).catch(() => {});
    await p.waitForTimeout(cle === 'annonce' ? 120 : 380);
    (planche[cle] ??= {})[tour === 'assiste' ? 'apres' : 'avant'] = (await p.screenshot()).toString('base64');
  };
  const t0 = Date.now();
  while (Date.now() - t0 < 240000) {
    const s = await av(ETAT);
    if (!s) { await p.waitForTimeout(150); continue; }
    // la pause d'après le Clash : du Clash présenté au tour suivant
    if (resoluDepuis && s.turn > resoluTour) { attentes.push(Date.now() - resoluDepuis); resoluDepuis = 0; }
    { const d = `${s.turn}:${s.phase}:${s.me}:${s.seq}`; if (process.env.LQV_M18_DEBUG && d !== precedentDebug) { precedentDebug = d; console.log(`  ${d} ${Date.now() - t0}`); } }
    if (s.fin || s.turn > TOURS) break;
    const cle = `${s.turn}:${s.phase}:${s.me}:${s.seq}`;
    // bandeau d'étape : capturé à sa première apparition
    if (tour === 'assiste' && s.annonce && s.turn >= 2) await capturer('annonce');
    // rien à choisir : aucun bouton n'attend
    if (!s.me) {
      if (tour === 'assiste') {
        if (s.actNext) fautes.push(`tour ${s.turn} ${s.phase} : « Tour suivant » affiché`);
        if (s.boutonsPanneau.some((b) => b !== 'act-skip')) fautes.push(`tour ${s.turn} ${s.phase} : bouton dans le panneau (${s.boutonsPanneau.join(', ')})`);
        if (!s.seq && s.primaire.length) fautes.push(`tour ${s.turn} ${s.phase} : action principale offerte sans choix (${s.primaire.join(', ')})`);
      }
      if (s.phase === 'RESOLVED' && !s.seq) {
        if (resoluTour !== s.turn) { resoluTour = s.turn; resoluDepuis = Date.now(); await capturer('resolu'); }
        if (tour === 'classique') { const sel = await av(GESTE_CLASSIQUE, s.turn); if (sel) { await j.agir(sel); gestesParTour[s.turn] = (gestesParTour[s.turn] ?? 0) + 1; await p.waitForTimeout(200); } }
      }
      await p.waitForTimeout(60);
      continue;
    }
    if (tour === 'assiste') {
      consignesMax = Math.max(consignesMax, s.consignes);
      if (s.tip) tips++;
      if (s.actNext) fautes.push(`tour ${s.turn} ${s.phase} : « Tour suivant » affiché`);
      if (s.valider) fautes.push(`tour ${s.turn} ${s.phase} : bouton « Valider » des choix tactiques`);
      if (s.boutonsPanneau.some((b) => b !== 'act-skip')) fautes.push(`tour ${s.turn} ${s.phase} : bouton dans le panneau (${s.boutonsPanneau.join(', ')})`);
    }
    const sel = await av(tour === 'assiste' ? GESTE_ASSISTE : GESTE_CLASSIQUE, s.turn);
    if (!sel) { await p.waitForTimeout(100); continue; }
    if (cle !== precedent) {
      precedent = cle;
      const etape = { START: 'start', PREPARE: 'prepare', TACTICS: 'tactics' }[s.phase];
      if (etape) await capturer(etape);
    }
    if (s.phase === 'COMMIT' && /place-(assault|guard)/.test(sel)) await capturer('commit');
    if (s.phase === 'COMMIT' && /act-commit/.test(sel)) await capturer('pret');
    await j.agir(sel);
    gestesParTour[s.turn] = (gestesParTour[s.turn] ?? 0) + 1;
    await p.waitForTimeout(170);
  }
  return { gestesParTour, attentes, fautes: [...new Set(fautes)], consignesMax, tips, s: Math.round((Date.now() - t0) / 100) / 10, final: await av(ETAT) };
}

const moyenne = (o) => { const v = Object.values(o); return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : 0; };

try {
  const resultats = {};
  // (2) d'abord le tour classique (référence « avant »), à la souris
  {
    const { ctx, p } = await contexte(false);
    const j = joueur(p, 'souris');
    await p.goto(`${server.base}/?qa=1&tour=classique&${DUEL}`, { timeout: 90000 });
    await p.waitForFunction(() => !!window.__lqv?.controller, null, { timeout: 60000 });
    if (!renderer) renderer = rendererLabel(await webglRenderer(p).catch(() => null));
    const r = await jouerDuel(p, j, 'classique', true);
    resultats.classique = r;
    check(r.final?.turn > TOURS || r.final?.fin, `classique : ${TOURS} tours joués (${r.s} s) ; gestes par tour ${JSON.stringify(r.gestesParTour)}, moyenne ${moyenne(r.gestesParTour)}`);
    await ctx.close();
  }
  // (1) le tour assisté, dans chaque mode
  for (const mode of MODES) {
    const { ctx, p } = await contexte(mode === 'manette');
    const j = joueur(p, mode);
    await p.goto(`${server.base}/?qa=1&tour=assiste&${DUEL}`, { timeout: 90000 });
    await p.waitForFunction(() => !!window.__lqv?.controller, null, { timeout: 60000 });
    const r = await jouerDuel(p, j, 'assiste', mode === MODES[0]);
    resultats[mode] = r;
    const a = r.final?.assist;
    check(r.final?.turn > TOURS || r.final?.fin, `${mode} : ${TOURS} tours joués au tour assisté (${r.s} s)`);
    check(true, `${mode} : gestes par tour ${JSON.stringify(r.gestesParTour)}, moyenne ${moyenne(r.gestesParTour)} (classique : ${moyenne(resultats.classique.gestesParTour)})`);
    check(moyenne(r.gestesParTour) < moyenne(resultats.classique.gestesParTour), `${mode} : moins de gestes par tour qu’au tour classique`);
    check(r.fautes.length === 0, `${mode} : aucun bouton n’attend quand il n’y a rien à choisir${r.fautes.length ? ` (${r.fautes.slice(0, 4).join(' ; ')})` : ''}`);
    const lim = 1500 * 1 + 1600; // pause au rythme normal, plus la marge du parcours (lecture de l'état, rendu)
    check(r.attentes.length >= TOURS && r.attentes.every((ms) => ms <= lim), `${mode} : le tour suivant commence seul après le Clash, sans geste (${r.attentes.join(', ')} ms)`);
    check(r.consignesMax <= 1, `${mode} : une seule consigne à la fois (au plus ${r.consignesMax})`);
    check(r.tips === 0, `${mode} : aucun conseil contextuel (la consigne en tient lieu)`);
    // un bandeau retardé par un temps fort au centre est sauté si le joueur a déjà répondu à l'étape : au moins un tour sur deux
    check((a?.annonces?.length ?? 0) >= Math.ceil(TOURS / 2) + 1, `${mode} : bandeaux d’étape (${a?.annonces?.length ?? 0}) : ${(a?.annonces ?? []).slice(0, 3).join(' | ')}…`);
    if (mode !== 'souris') check(j.replis === 0, `${mode} : aucun geste replié sur la souris (${j.replis})`);
    if (REDUIT) check(await p.evaluate(() => document.documentElement.classList.contains('reduced')), `${mode} : mouvement réduit appliqué`);
    await ctx.close();
  }
  // (3) le réglage : Options du jeu standard (assisté ↔ classique, mémorisé)
  {
    const { ctx, p } = await contexte(false);
    await p.goto(`${server.base}/?standard=1&qa=1${REDUIT ? '&reducedMotion=1' : ''}`, { timeout: 90000 });
    await p.waitForSelector('[data-key="home-options"]', { timeout: 60000 }).catch(() => {});
    const optOk = await p.$('[data-key="home-options"]');
    if (optOk) {
      await p.click('[data-key="home-options"]');
      await p.waitForSelector('[data-key="opt-tour-assiste"]');
      writeFileSync(`${DIR}/options-tour.png`, await p.screenshot());
      const avant = await p.getAttribute('[data-key="opt-tour-classique"]', 'aria-checked');
      await p.click('[data-key="opt-tour-assiste"]');
      await p.waitForTimeout(200);
      const apres = await p.getAttribute('[data-key="opt-tour-assiste"]', 'aria-checked');
      const stocke = await p.evaluate(() => localStorage.getItem('lqv.tour'));
      check(avant === 'true' && apres === 'true' && stocke === 'assiste', `Options du jeu standard : « Tour du duel » Assisté / Classique (QA : classique ; choisi : ${stocke})`);
    } else check(false, 'Options du jeu standard : accueil introuvable');
    await ctx.close();
  }
  // (3 bis) le menu de l'aventure
  {
    const { ctx, p } = await contexte(false);
    const av = (fn, arg) => p.evaluate(fn, arg);
    await p.goto(`${server.base}/?aventure=1&qa=1&profileSeed=31${REDUIT ? '&reducedMotion=1' : ''}`, { timeout: 90000 });
    await p.click('[data-key="av-new"]');
    await p.fill('[data-key="av-name"]', 'Lou');
    await p.click('[data-key="av-suite"]');
    await p.click('[data-key="av-start"]');
    await p.waitForFunction(() => { const t = window.__lqvAventure?.town; return !!t && t.stats().frames > 1 && !document.querySelector('.ville-host')?.hidden; }, null, { timeout: 120000 });
    await av(() => window.__lqvAventure.menu());
    await p.waitForSelector('[data-key="menu-tour"]');
    const l1 = await p.textContent('[data-key="menu-tour"]');
    writeFileSync(`${DIR}/aventure-menu-tour.png`, await p.screenshot());
    await p.click('[data-key="menu-tour"]');
    await p.waitForTimeout(400);
    const l2 = await p.textContent('[data-key="menu-tour"]').catch(() => '');
    const stocke = await p.evaluate(() => localStorage.getItem('lqv.tour'));
    check(/classique/.test(l1 ?? '') && /assisté/.test(l2 ?? '') && stocke === 'assiste', `menu de l’aventure : « ${l1?.trim()} » → « ${l2?.trim()} » (mémorisé : ${stocke})`);
    await ctx.close();
  }
  // (4) planche avant / après
  {
    const { ctx, p } = await contexte(false);
    const lignes = ETAPES.filter(([k]) => planche[k]).map(([k, nom]) => `<tr><th>${nom}</th><td>${planche[k].avant ? `<img src="data:image/png;base64,${planche[k].avant}">` : '<em>—</em>'}</td><td>${planche[k].apres ? `<img src="data:image/png;base64,${planche[k].apres}">` : '<em>—</em>'}</td></tr>`).join('');
    const html = `<html><body style="margin:0;background:#111;color:#eee;font:15px system-ui;padding:8px"><h2 style="margin:4px 0 8px">M18 — le tour, avant (classique) / après (assisté) · ${head} · ${VP.join('×')}${REDUIT ? ' · mouvement réduit' : ''}</h2><table style="border-collapse:collapse;width:100%"><tr><th></th><th>Avant : tour classique</th><th>Après : tour assisté</th></tr>${lignes}</table><style>th{text-align:left;padding:4px 8px;vertical-align:top;width:9rem}td{padding:3px;width:45%}img{width:100%;display:block}</style></body></html>`;
    await p.setViewportSize({ width: 1900, height: 1200 });
    await p.setContent(html);
    await p.waitForTimeout(400);
    writeFileSync(`${DIR}/planche-avant-apres.png`, await p.screenshot({ fullPage: true }));
    for (const [k] of ETAPES) for (const cote of ['avant', 'apres']) if (planche[k]?.[cote]) writeFileSync(`${DIR}/${k}-${cote}.png`, Buffer.from(planche[k][cote], 'base64'));
    check(Object.keys(planche).length >= 5, `planche avant / après : ${ETAPES.filter(([k]) => planche[k]).map(([, n]) => n).join(', ')}`);
    await ctx.close();
  }
  writeFileSync(`${DIR}/README.md`, `Planche M18 (le tour fluide) : ${head}, ${VP.join('×')}${REDUIT ? ', mouvement réduit' : ''}. Avant : tour classique ; après : tour assisté.\n`);
  mkdirSync(dirname(OUT), { recursive: true });
  const resume = Object.fromEntries(Object.entries(resultats).map(([m, r]) => [m, { gestesParTour: r.gestesParTour, moyenne: moyenne(r.gestesParTour), attentes: r.attentes, fautes: r.fautes, consignesMax: r.consignesMax, tips: r.tips, annonces: r.final?.assist?.annonces ?? [], s: r.s }]));
  writeFileSync(OUT, JSON.stringify({ head, viewport: VP, reduit: REDUIT, tours: TOURS, renderer, modes: MODES, checks, issues, resultats: resume }, null, 2));
} finally {
  await browser.close();
  server.stop();
}
const echecs = checks.filter((c) => c.startsWith('ÉCHEC')).length;
console.log(`\n${checks.length - echecs}/${checks.length} contrôles · console : ${issues.length ? issues.join(' | ') : 'vide'}`);
process.exit(echecs || issues.length ? 1 : 0);
