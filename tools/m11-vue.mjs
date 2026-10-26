// M11-A — parcours navigateur des rencontres « en vue » et du rival en événements fixes (`?aventure=1&qa=1&vue=1`,
// ville en rangs) : l'aventure est menée au chapitre I par des FAITS (`qaFaits`) ; un guetteur posé sur le Quai
// (`qaGuetteur`) : le joueur derrière lui n'est pas arrêté, sur le côté hors de l'angle non plus ; il entre dans le cône :
// bulle « ! », le PNJ vient, le dialogue ne se ferme pas par Échap, la préparation n'a pas « Plus tard », le duel s'ouvre ;
// issue imposée en QA (`qaTerminer`), retour : le PNJ est parti, son issue notée (repos). Puis le cadet battu : au point
// de décision suivant sur le Quai, **Kaï surgit** (K1), court au joueur, défie ; défaite imposée : K1 accompli, pas de
// second Kaï au retour.
// Usage : npm run build && [LQV_VP=1920x1080] node tools/m11-vue.mjs [dossier] [rapport.json]
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { launch, rendererLabel, startPreview, watchConsole, webglRenderer } from './browser.mjs';

const VP = (process.env.LQV_VP ?? '1280x720').split('x').map(Number);
const DIR = process.argv[2] ?? `screenshots/qa/m11/vue-${VP[0]}`;
const OUT = process.argv[3] ?? `artifacts/qa/m11/vue-${VP[0]}.json`;
const head = execSync('git rev-parse --short HEAD').toString().trim();
mkdirSync(DIR, { recursive: true });
const server = await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4297, process.env.LQV_DIST || 'dist');
const browser = await launch();
const issues = [];
const steps = [];
const checks = [];
const check = (ok, what) => { checks.push(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); console.log(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); };
let n = 0;
let renderer = '';
try {
  const ctx = await browser.newContext({ viewport: { width: VP[0], height: VP[1] }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  p.setDefaultTimeout(Number(process.env.LQV_QA_TIMEOUT) || 90000);
  watchConsole(p, issues);
  const shot = async (name, wait = 1200) => {
    await p.waitForTimeout(wait);
    const file = `${DIR}/${String(++n).padStart(2, '0')}-${name}.png`;
    writeFileSync(file, await p.screenshot());
    steps.push({ name, file });
  };
  const av = (fn, arg) => p.evaluate(fn, arg);
  const townReady = () => p.waitForFunction(() => { const t = window.__lqvAventure?.town; return !!t && t.stats().frames > 1 && !document.querySelector('.ville-host').hidden; }, null, { timeout: 120000 });
  const vue = () => av(() => window.__lqvAventure.qaVue());
  const placer = (pos, face) => av(([q, f]) => window.__lqvAventure.town.place(q, f), [pos, face]);
  const frames = async (k = 4) => { const f0 = await av(() => window.__lqvAventure.town.stats().frames); await p.waitForFunction(([a, b]) => window.__lqvAventure.town.stats().frames >= a + b, [f0, k], { timeout: 60000 }); };
  const voyage = async (to, spawn) => {
    await av(([t, s]) => window.__lqvAventure.voyager(t, s), [to, spawn]);
    await p.waitForFunction((t) => window.__lqvAventure.town.ilotId() === t && !document.querySelector('.ville-fade'), to, { timeout: 30000 });
    await frames(3);
  };
  const duel = async (issue) => {
    await p.waitForSelector('[data-key="av-duel-go"]');
    check(!(await p.$('[data-key="av-duel-back"]')) && !!(await p.$('[data-key="av-duel-force"]')), 'préparation d’un duel forcé : pas de « Plus tard », la mention de l’abandon possible');
    await p.keyboard.press('Escape');
    await p.waitForTimeout(300);
    check(!!(await p.$('[data-key="av-duel-go"]')), 'Échap ne ferme pas la préparation forcée');
    await shot('preparation-forcee', 300);
    await p.click('[data-key="av-duel-go"]');
    await p.waitForFunction(() => !!window.__lqv?.controller?.view?.awaitingMe, null, { timeout: 120000 });
    await shot('duel', 2500);
    await av((x) => window.__lqvAventure.qaTerminer(x), issue);
    await p.waitForSelector('[data-screen="av-resultat"]');
    await p.click('[data-key="av-retour"]');
    await townReady();
    await frames(4);
  };

  await p.goto(`${server.base}/?aventure=1&qa=1&vue=1&aiDelay=0&reducedMotion=1&profileSeed=31`, { timeout: Number(process.env.LQV_QA_NAV_TIMEOUT) || 90000 });
  renderer = rendererLabel(await webglRenderer(p).catch(() => null));
  await p.click('[data-key="av-new"]');
  await p.fill('[data-key="av-name"]', 'Lou');
  await p.click('[data-key="av-start"]');
  await townReady();
  check(await av(() => window.__lqvAventure.quaiRangs === true), 'la ville en rangs est affichée (QA : dioramas admis)');
  const refus = await av((evs) => window.__lqvAventure.qaFaits(evs), [
    { type: 'scene', id: 'P2' }, { type: 'duelPrologue', issue: 'victoire', faits: { assautsGagnes: 1, gardesGagnees: 3, interferencesReussies: 0 } },
    { type: 'confirmer', famille: 'Ronce' }, { type: 'scene', id: 'P8' },
  ]);
  check(refus.length === 0, `chapitre I (la Ronce rejointe) par des faits, sans refus (${refus.join(' | ') || 'aucun'})`);
  await townReady();
  await frames(4);
  check((await vue()).force === null, 'aucune rencontre forcée à l’entrée (aucun événement du rival dû avant le premier lieutenant)');

  // un guetteur posé sur le Quai
  check(await av(() => window.__lqvAventure.qaGuetteur('rue-docker')), 'un docker du Quai posé (guetteur)');
  await frames(4);
  const v0 = await vue();
  const g = v0.guetteurs.find((x) => x.id === 'rue-docker');
  check(!!g, `le docker guette (${JSON.stringify(g)})`);
  const u = { face: [0, 1], dos: [0, -1], gauche: [-1, 0], droite: [1, 0] }[g.facing];
  const at = (k, lat = 0) => ({ x: g.at.x + u[0] * k + u[1] * lat, z: g.at.z + u[1] * k + u[0] * lat });
  // derrière lui : rien
  await placer(at(-1.6), 'droite');
  await frames(4);
  check((await vue()).force === null, 'derrière le guetteur : pas repéré');
  // sur le côté, hors de l'angle (3 m de côté, 1,5 m devant : ≈ 63°) : rien
  await placer(at(1.5, 3), 'gauche');
  await frames(4);
  check((await vue()).force === null, 'sur le côté, hors de l’angle : pas repéré');
  await shot('hors-de-vue', 300);
  // dans le cône : repéré
  await placer(at(3), 'dos');
  await p.waitForFunction(() => window.__lqvAventure.qaVue().force?.kind === 'vue', null, { timeout: 30000 });
  check(true, 'dans le cône : repéré (rencontre forcée « vue »)');
  await shot('repere', 200);
  await p.waitForSelector('.ville-dialog [data-key="dlg-duel"]', { timeout: 60000 });
  const npc = await av(() => { const t = window.__lqvAventure.town; return { j: t.walker().pos, d: t.npcAt('pnj-docker-1') }; });
  check(Math.hypot(npc.j.x - at(3).x, npc.j.z - at(3).z) < 0.05, 'la marche du joueur est suspendue pendant l’approche');
  check(!!npc.d && Math.abs(Math.hypot(npc.d.x - npc.j.x, npc.d.z - npc.j.z) - 0.95) < 0.1, `le docker est venu au joueur (${npc.d ? Math.hypot(npc.d.x - npc.j.x, npc.d.z - npc.j.z).toFixed(2) : '?'} m)`);
  await shot('dialogue-ouverture', 300);
  check((await p.$$('.ville-dialog .ville-btn')).length === 1, 'un seul choix : relever le défi');
  await p.keyboard.press('Escape');
  await p.waitForTimeout(300);
  check(!!(await p.$('.ville-dialog [data-key="dlg-duel"]')), 'Échap ne ferme pas le dialogue d’un duel forcé');
  await p.click('.ville-dialog [data-key="dlg-duel"]');
  await duel('victoire');
  const apres = await av(() => ({ vus: window.__lqvAventure.save.directeur.vus, poses: window.__lqvAventure.posesDe('quai').map((q) => q.id), force: window.__lqvAventure.force }));
  check(apres.vus?.['rue-docker']?.issue === 'victoire', `issue notée pour le repos (${JSON.stringify(apres.vus)})`);
  check(!apres.poses.includes('rue-docker') && apres.force === null, 'retour : le docker est parti, plus de rencontre forcée');
  await shot('retour', 600);

  // Kaï surgit (K1) : le cadet de la Ronce vaincu, puis un point de décision sur le Quai
  const r2 = await av((evs) => window.__lqvAventure.qaFaits(evs), [{ type: 'lancerDefi', figure: 'cadet-Ronce' }, { type: 'duelStructurant', figure: 'cadet-Ronce', issue: 'victoire', duel: 'qa-cadet' }]);
  check(r2.length === 0, 'le cadet de la Ronce vaincu (fait)');
  // la ville se relit (`qaFaits` : un point de décision sur le Quai) : Kaï surgit
  await p.waitForFunction(() => window.__lqvAventure.qaVue().force?.kind === 'rival', null, { timeout: 60000 });
  check((await vue()).rival === 'K1', 'au point de décision suivant sur le Quai, Kaï surgit (K1)');
  await shot('kai-surgit', 200);
  await p.waitForSelector('.ville-dialog [data-key="dlg-duel"]', { timeout: 60000 });
  const titre = await p.textContent('.ville-dialog b');
  check(/Kaï — La Braise/.test(titre ?? ''), `réplique de l’événement (${titre})`);
  const kai = await av(() => ({ k: window.__lqvAventure.town.npcAt('braise'), j: window.__lqvAventure.town.walker().pos }));
  check(!!kai.k && Math.abs(Math.hypot(kai.k.x - kai.j.x, kai.k.z - kai.j.z) - 0.95) < 0.1, `Kaï est venu au joueur (${kai.k ? Math.hypot(kai.k.x - kai.j.x, kai.k.z - kai.j.z).toFixed(2) : '?'} m)`);
  await shot('kai-defi', 300);
  await p.click('.ville-dialog [data-key="dlg-duel"]');
  await duel('defaite');
  const k = await av(() => ({ rival: window.__lqvAventure.save.etat.rival, force: window.__lqvAventure.qaVue() }));
  check(k.rival?.faits?.K1 === 'defaite', 'défaite : K1 accompli (l’histoire continue)');
  check(k.force.force === null && k.force.rival === null, 'au retour : pas de second Kaï');
  await shot('apres-kai', 600);
} catch (err) {
  check(false, `exception : ${err instanceof Error ? err.message : err}`);
} finally {
  const bad = issues.filter((x) => !/GPU stall due to ReadPixels|Automatic fallback to software WebGL/.test(x));
  check(bad.length === 0, `console : ${bad.length ? bad.slice(0, 3).join(' | ') : 'aucune erreur'}`);
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, `${JSON.stringify({ date: new Date().toISOString(), commit: head, viewport: VP, renderer, checks, steps, console: issues }, null, 2)}\n`);
  console.log(`${checks.filter((c) => c.startsWith('OK')).length}/${checks.length} contrôles ; console : ${issues.length ? issues.length : 'aucune erreur'}`);
  server.stop();
  await browser.close();
}
process.exit(checks.every((c) => c.startsWith('OK')) ? 0 : 1);
