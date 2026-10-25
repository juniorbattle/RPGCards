// M10-F — profils et sauvegardes d'avant la RC de l'aventure, chargés par le build courant (migration ou refus expliqué).
// (1) Un VRAI profil de la RC 0.8 (`LQV_RC08_DIST`, build de b128bd9) : créé par l'interface, un duel du Tournoi joué
//     jusqu'au bout, puis un second duel laissé en cours (règles V3.0+delta-V3.2) ; la sauvegarde `lqv.save` est relevée.
// (2) Une sauvegarde d'aventure d'avant V3.3 (`LQV_AVANT_SRC`, sources de f7339ad) : écrite par le code de ce commit (logique
//     pure, hors navigateur) : prologue joué, famille confirmée, défi du cadet en cours (règles V3.0+delta-V3.2).
// (3) Le build courant (`LQV_DIST`, défaut `dist`) charge les deux : profil, collection, progression et historique gardés,
//     duel en cours refusé avec sa raison et recommencé sous les règles en vigueur ; aventure gardée, son duel refusé avec
//     sa raison et retiré ; aucune des deux sauvegardes n'est touchée par l'autre mode.
// Usage : npm run build && LQV_RC08_DIST=<dist b128bd9> LQV_AVANT_SRC=<arbre f7339ad> [LQV_GPU=1 CHROMIUM_PATH=…] node tools/m10f-migration.mjs [dossier] [rapport.json]
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { tsImport } from 'tsx/esm/api';
import { launch, startPreview, view, watchConsole } from './browser.mjs';
import { newStats, playTurn } from './duel-driver.mjs';

const DIR = process.argv[2] ?? 'screenshots/qa/m10f/migration';
const OUT = process.argv[3] ?? 'artifacts/qa/m10f/migration.json';
const RC08 = process.env.LQV_RC08_DIST;
const AVANT = process.env.LQV_AVANT_SRC;
if (!RC08 || !AVANT) throw new Error('LQV_RC08_DIST (dist de b128bd9) et LQV_AVANT_SRC (arbre de f7339ad) sont requis.');
const head = execSync('git rev-parse --short HEAD').toString().trim();
mkdirSync(DIR, { recursive: true });
const checks = [];
const issues = [];
const check = (ok, what) => { checks.push(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); console.log(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); };
const shot = async (p, name) => { await p.waitForTimeout(600); await p.screenshot({ path: `${DIR}/${name}.png` }); };
const screenIs = (p, id, timeout = 60000) => p.waitForSelector(`[data-screen="${id}"]`, { timeout });
const browser = await launch();
const report = { commit: head, rc08: RC08, avant: AVANT };

// ---------------------------------------------------------------- (2) aventure écrite par le code de f7339ad
async function aventureAvant() {
  const imp = (f) => tsImport(pathToFileURL(`${AVANT}/src/${f}`).href, import.meta.url);
  const [{ nouvelleSauvegarde, validerSauvegarde, CATALOG_AVENTURE }, { appliquer }, { duelPrologue, duelFigure }, { Match }, { PROFILES }, { RULES }, { duelSeed }] = await Promise.all([
    imp('aventure/sauvegarde.ts'), imp('aventure/aventure.ts'), imp('aventure/rencontres.ts'), imp('game/match.ts'), imp('game/ai/policy.ts'), imp('product/resume.ts'), imp('product/save.ts'),
  ]);
  const at = '2026-10-23T20:00:00.000Z';
  const s = nouvelleSauvegarde(new Date(at), 'QA Avant V3.3', 4242);
  const fait = (ev) => { const r = appliquer(s.etat, ev, at); if (r.refus) throw new Error(r.refus); s.etat = r.etat; };
  fait({ type: 'scene', id: 'P1' });
  fait({ type: 'scene', id: 'P2' });
  const jouer = (prevu, tours) => {
    const m = new Match(prevu.config, { p1: { profile: PROFILES.equilibre, seed: prevu.config.seed ^ 0x51 }, p2: { profile: PROFILES[prevu.personnalite.aiProfile], seed: prevu.config.seed ^ 0xa7 } });
    while (m.state.phase !== 'ENDED' && m.state.turn <= tours) { m.stepAi(); if (m.state.phase === 'RESOLVED') m.nextTurn(); }
    return m;
  };
  const pro = duelPrologue(duelSeed(4242, s.compteur), s.etat);
  s.compteur++;
  const m0 = jouer(pro, 200);
  const issue = m0.state.winner === 'p1' ? 'victoire' : 'defaite';
  s.historique.push({ id: 'a1', rencontre: 'prologue', issue, turns: m0.state.turn, at });
  fait({ type: 'combat', issue });
  fait({ type: 'duelPrologue', issue, faits: { assautsGagnes: 0, gardesGagnees: 0, interferencesReussies: 0 } });
  fait({ type: 'confirmer', famille: 'Ronce' });
  fait({ type: 'scene', id: 'P8' });
  const prevu = duelFigure('cadet-Ronce', s.etat, duelSeed(4242, s.compteur), false);
  s.compteur++;
  fait({ type: 'lancerDefi', figure: 'cadet-Ronce' });
  const m1 = jouer(prevu, 3);
  s.duel = { id: 'a2', rencontre: 'cadet-Ronce', seed: prevu.config.seed, startedAt: at, rules: RULES, catalog: CATALOG_AVENTURE, config: structuredClone(prevu.config), commands: structuredClone(m1.commands), hash: m1.hash(), turn: m1.state.turn, pret: false };
  s.updatedAt = at;
  const errs = validerSauvegarde(s);
  check(!errs.length && RULES === 'V3.0+delta-V3.2', `aventure d'avant V3.3 écrite par le code de f7339ad (règles ${RULES}, duel du cadet en cours au tour ${m1.state.turn}, ${errs.length} erreur)`);
  return JSON.stringify(s);
}

const ctxPage = async (vp = { width: 1280, height: 720 }, init) => {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1 });
  if (init) await ctx.addInitScript(init.fn, init.arg);
  const p = await ctx.newPage();
  p.setDefaultTimeout(Number(process.env.LQV_QA_TIMEOUT) || 60000);
  watchConsole(p, issues);
  return { ctx, p };
};

try {
  // ---------------------------------------------------------------- (1) profil de la RC 0.8, par l'interface
  const old = await startPreview(Number(process.env.LQV_PREVIEW_PORT_ANCIEN) || 4381, RC08);
  let save08;
  try {
    const { ctx, p } = await ctxPage();
    await p.goto(`${old.base}/?qa=1&aiDelay=0&reducedMotion=1&profileSeed=8080`, { timeout: Number(process.env.LQV_QA_NAV_TIMEOUT) || 90000 });
    await screenIs(p, 'home');
    await p.click('[data-key="home-new"]');
    await p.fill('[data-key="new-name"]', 'QA RC 0.8');
    await p.click('[data-key="new-sig-Voile"]');
    await p.click('[data-key="new-create"]');
    await screenIs(p, 'board');
    await p.click('[data-key="enc-quai-1"]');
    await p.click('[data-key="prep-start"]');
    await p.waitForFunction(() => !!window.__lqv);
    const st = newStats();
    let out = 'running';
    for (let t = 0; t < 90 && out !== 'ended' && out !== 'stuck'; t++) out = await playTurn(p, { name: 'rc08', useLecture: false, mode: 'click' }, st);
    const v1 = await view(p);
    check(out === 'ended', `RC 0.8 : premier duel joué jusqu'au bout par l'interface (tour ${v1.turn}, gagnant ${v1.winner})`);
    await screenIs(p, 'result', 60000);
    await p.click('[data-key="result-board"]').catch(() => p.click('[data-key="result-next"]'));
    await p.waitForSelector('[data-screen="board"], [data-screen="prep"]');
    if (await p.$('[data-screen="board"]')) { await p.click(`[data-key="enc-quai-${v1.winner === 'me' ? 2 : 1}"]`); }
    await p.click('[data-key="prep-start"]');
    await p.waitForFunction(() => !!window.__lqv);
    for (let i = 0; i < 2; i++) await playTurn(p, { name: 'rc08b', useLecture: false, mode: 'click' }, newStats());
    save08 = await p.evaluate(() => localStorage.getItem('lqv.save'));
    const s = JSON.parse(save08);
    check(s.schemaVersion === 2 && s.gameVersion === '0.8.0-rc.1' && !!s.activeDuel && s.activeDuel.rules === 'V3.0+delta-V3.2' && s.history.length === 1, `RC 0.8 : sauvegarde relevée (schéma ${s.schemaVersion}, version ${s.gameVersion}, ${s.history.length} duel à l'historique, duel en cours sous ${s.activeDuel?.rules} au tour ${s.activeDuel?.turn})`);
    await shot(p, '01-rc08-duel-en-cours');
    await ctx.close();
  } finally { old.stop(); }
  writeFileSync(`${DIR}/lqv.save-rc08.json`, save08);
  const aventure = await aventureAvant();
  writeFileSync(`${DIR}/lqv.aventure-f7339ad.json`, aventure);
  report.anciennes = { save: JSON.parse(save08), aventure: JSON.parse(aventure) };

  // ---------------------------------------------------------------- (3) le build courant charge les deux
  const server = await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4382, process.env.LQV_DIST || 'dist');
  try {
    const init = { fn: ([a, b]) => { if (!sessionStorage.getItem('m10f-init')) { localStorage.clear(); localStorage.setItem('lqv.save', a); localStorage.setItem('lqv.aventure', b); sessionStorage.setItem('m10f-init', '1'); } }, arg: [save08, aventure] };
    const { ctx, p } = await ctxPage(undefined, init);
    // jeu standard
    await p.goto(`${server.base}/?qa=1&aiDelay=0&reducedMotion=1`, { timeout: Number(process.env.LQV_QA_NAV_TIMEOUT) || 90000 });
    await screenIs(p, 'home');
    const sh = await p.evaluate(() => ({ load: window.__lqvShell.load.status, save: JSON.parse(JSON.stringify(window.__lqvShell.save)), status: document.querySelector('.sh-save-status')?.textContent ?? '' }));
    const o = JSON.parse(save08);
    check(sh.load === 'ok' && sh.save.profile.name === o.profile.name && JSON.stringify(sh.save.collection) === JSON.stringify(o.collection) && JSON.stringify(sh.save.progress) === JSON.stringify(o.progress) && sh.save.history.length === o.history.length && JSON.stringify(sh.save.deck) === JSON.stringify(o.deck), `standard : profil de la RC 0.8 chargé (nom, deck, collection, progression, historique gardés ; « ${sh.status.trim().slice(0, 90)} »)`);
    await shot(p, '02-standard-accueil');
    await p.click('[data-key="home-continue"]');
    await p.waitForSelector('.sh-confirm');
    const why = (await p.textContent('.sh-confirm')) ?? '';
    check(/Règles différentes \(V3\.0\+delta-V3\.2\)/.test(why), `standard : duel en cours de la RC 0.8 refusé, raison affichée : « ${why.replace(/\s+/g, ' ').trim().slice(0, 200)} »`);
    check(!(await p.evaluate(() => !!window.__lqv)), 'standard : aucun duel ouvert sur un état non vérifié');
    await shot(p, '03-standard-reprise-refusee');
    report.raisonStandard = why.replace(/\s+/g, ' ').trim();
    await p.click('[data-key="confirm-ok"]');
    await p.waitForFunction(() => !!window.__lqv);
    const st = await p.evaluate(() => ({ rules: window.__lqv.state().rules, turn: window.__lqv.view().turn, saved: JSON.parse(localStorage.getItem('lqv.save')) }));
    check(st.rules === 'V3.0+delta-V3.3.2' && st.turn === 1 && st.saved.activeDuel?.rules === 'V3.0+delta-V3.3.2' && st.saved.history.length === o.history.length, `standard : le duel recommence au tour 1 sous ${st.rules}, configuration et historique gardés`);
    const apresStandard = await p.evaluate(() => localStorage.getItem('lqv.aventure'));
    check(apresStandard === aventure, 'standard : la sauvegarde de l’aventure n’est ni lue ni écrite (octet pour octet)');
    // aventure
    const saveAvant = await p.evaluate(() => localStorage.getItem('lqv.save'));
    await p.goto(`${server.base}/?aventure=1&qa=1&aiDelay=0&reducedMotion=1`, { timeout: Number(process.env.LQV_QA_NAV_TIMEOUT) || 90000 });
    await p.waitForSelector('[data-key="av-continue"]');
    const profil = (await p.textContent('.av-profil')) ?? '';
    check(/QA Avant V3\.3/.test(profil), `aventure : sauvegarde d'avant V3.3 chargée (« ${profil.replace(/\s+/g, ' ').trim()} »)`);
    await shot(p, '04-aventure-titre');
    await p.click('[data-key="av-continue"]');
    const toast = await p.waitForSelector('.ville-toast', { timeout: 60000 }).then((t) => t.textContent());
    check(/Reprise exacte impossible : Version des règles ou du catalogue différente\. Le duel est retiré \(non compté\)\./.test(toast ?? ''), `aventure : duel d'avant V3.3 refusé, raison affichée : « ${toast} »`);
    report.raisonAventure = toast;
    await shot(p, '05-aventure-reprise-refusee');
    await p.waitForFunction(() => { const t = window.__lqvAventure?.town; return !!t && t.stats().frames > 1; }, null, { timeout: 120000 });
    const av = await p.evaluate(() => JSON.parse(localStorage.getItem('lqv.aventure')));
    const a0 = JSON.parse(aventure);
    check(av.duel === null && JSON.stringify(av.etat) === JSON.stringify(a0.etat) && av.historique.length === a0.historique.length && av.compteur === a0.compteur && av.profil.nom === a0.profil.nom, 'aventure : état, registre, deck, historique et compteur gardés ; seul le duel non vérifiable est retiré (non compté)');
    await shot(p, '06-aventure-ville');
    check((await p.evaluate(() => localStorage.getItem('lqv.save'))) === saveAvant, 'aventure : la sauvegarde du jeu standard n’est ni lue ni écrite (octet pour octet)');
    await ctx.close();
  } finally { server.stop(); }
} finally {
  await browser.close();
}
check(!issues.length, `console sans erreur (${issues.length})`);
report.checks = checks;
report.console = issues;
mkdirSync(OUT.replace(/[^/]+$/, ''), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 1));
const ok = checks.every((c) => c.startsWith('OK'));
console.log(`${checks.filter((c) => c.startsWith('OK')).length}/${checks.length} contrôles ; ${ok ? 'OK' : 'ÉCHEC'}`);
process.exit(ok ? 0 : 1);
