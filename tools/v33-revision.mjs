// Avenant 08, amendement 1 (révision après une Signature annoncée) — parcours navigateur : (1) `?scenario=signature-revision` :
// le rival verrouille Ronce IV, le joueur engage ensuite sa Signature par l'interface : fenêtre « Le rival réagit à votre
// Signature… », puis révision du rival (son IA, sur sa seule vue) et révélation ; (2) `?scenario=signature-annonce` avec le
// rival retenu : le joueur verrouille d'abord Cendre IV, le rival annonce sa Signature : fenêtre « Garder / Réviser » du
// joueur, brouillon prérempli ; le joueur révise vers sa Signature.
// Usage : npm run build && [LQV_GPU=1 CHROMIUM_PATH=…] [LQV_VP=1920x1080] node tools/v33-revision.mjs [dossier] [rapport.json]
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { launch, rendererLabel, startPreview, watchConsole, webglRenderer } from './browser.mjs';

const VP = (process.env.LQV_VP ?? '1280x720').split('x').map(Number);
const DIR = process.argv[2] ?? `screenshots/qa/v33/revision-${VP[0]}`;
const OUT = process.argv[3] ?? `artifacts/qa/v33/revision-${VP[0]}.json`;
const head = execSync('git rev-parse --short HEAD').toString().trim();
mkdirSync(DIR, { recursive: true });
const server = await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4297, process.env.LQV_DIST || 'dist');
const browser = await launch();
const issues = [];
const checks = [];
const steps = [];
const check = (ok, what) => { checks.push(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); console.log(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); };
let renderer = null;
let n = 0;
try {
  const ctx = await browser.newContext({ viewport: { width: VP[0], height: VP[1] }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  p.setDefaultTimeout(Number(process.env.LQV_QA_TIMEOUT) || 60000);
  watchConsole(p, issues);
  const shot = async (name) => { await p.waitForTimeout(400); const file = `${DIR}/${String(++n).padStart(2, '0')}-${name}.png`; writeFileSync(file, await p.screenshot()); steps.push({ name, file }); };
  const engager = (pred, stance) => p.evaluate(({ pred, stance }) => {
    const c = window.__lqv.controller;
    c.ui.selected = c.view.me.hand.find((x) => new RegExp(pred).test(x.defId)).cardId;
    c.placeSelected(stance);
    c.lockCommit();
  }, { pred, stance });
  const publics = () => p.evaluate(() => window.__lqv.events().filter((e) => e.vis === 'public').map((e) => ({ kind: e.kind, data: e.data })));

  // 1. Le rival verrouille d'abord ; le joueur engage sa Signature ; le rival réagit.
  await p.goto(`${server.base}/?scenario=signature-revision&qa=1&aiDelay=2500`);
  await p.waitForFunction(() => window.__lqv?.view?.().opp.locked, null, { timeout: 30000 });
  renderer = rendererLabel(await webglRenderer(p));
  await engager('^sig-', 'assault');
  await p.waitForFunction(() => window.__lqv.view().phase === 'REVISION', null, { timeout: 10000 });
  const t = await p.evaluate(() => document.body.innerText);
  check(/Le rival réagit à votre Signature/.test(t), 'fenêtre de réaction du rival affichée');
  await shot('le-rival-reagit');
  await p.waitForFunction(() => window.__lqv.view().reveal.primaries, null, { timeout: 30000 });
  const ev1 = await publics();
  const rev = ev1.find((e) => e.kind === 'revised');
  check(!!rev && rev.data.player === 'p2', `le rival a gardé ou révisé (${rev ? (rev.data.kept ? 'gardé' : 'révisé') : 'rien'})`);
  const avantRevelation = ev1.slice(0, ev1.findIndex((e) => e.kind === 'primariesRevealed'));
  check(!JSON.stringify(avantRevelation).includes('Ronce-4'), 'engagement initial du rival jamais publié avant la révélation');
  await shot('revelation-apres-reaction');

  // 2. Le joueur verrouille d'abord, le rival annonce sa Signature : fenêtre « Garder / Réviser » du joueur.
  await p.goto(`${server.base}/?scenario=signature-annonce&qa=1&aiDelay=3000`);
  await p.waitForFunction(() => window.__lqv?.controller?.view?.awaitingMe && window.__lqv.view().phase === 'COMMIT', null, { timeout: 30000 });
  await engager('^Cendre-4', 'assault');
  await p.waitForFunction(() => window.__lqv.view().phase === 'REVISION', null, { timeout: 15000 });
  const t2 = await p.evaluate(() => document.body.innerText);
  check(/Le rival a engagé sa Signature/.test(t2) && /Garder mon engagement/.test(t2) && /Verrouiller la révision/.test(t2), 'fenêtre « Garder / Réviser » du joueur');
  const draft = await p.evaluate(() => { const c = window.__lqv.controller; return c.view.me.hand.find((x) => x.cardId === c.ui.draft.primaryId)?.defId; });
  check(draft === 'Cendre-4-basic', 'brouillon prérempli avec l’engagement verrouillé');
  await shot('fenetre-de-revision');
  await engager('^sig-', 'assault');
  await p.waitForFunction(() => window.__lqv.view().reveal.primaries, null, { timeout: 15000 });
  const ev2 = await publics();
  check(ev2.some((e) => e.kind === 'revised' && e.data.player === 'p1' && e.data.kept === false), 'révision du joueur : nouvel engagement');
  check(ev2.filter((e) => e.kind === 'signatureAnnounced').map((e) => e.data.player).join(',') === 'p2,p1', 'Signature du joueur annoncée à la révision');
  await shot('revision-du-joueur');
  check(issues.length === 0, `console : ${issues.length ? issues.join(' | ') : 'aucune erreur'}`);
} finally {
  await browser.close();
  server.stop?.();
}
const ok = checks.every((c) => c.startsWith('OK'));
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({ commit: head, viewport: VP, renderer, ok, checks, steps, issues }, null, 1) + '\n');
console.log(`${checks.filter((c) => c.startsWith('OK')).length}/${checks.length} contrôles ; ${ok ? 'OK' : 'ÉCHEC'}`);
process.exit(ok ? 0 : 1);
