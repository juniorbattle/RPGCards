// Avenant 08 (annonce des Signatures) — parcours navigateur du scénario `?scenario=signature-annonce` : (1) le rival
// verrouille sa Signature : elle est annoncée face visible sur le plateau, mode « ? », journal et HUD, sans rien du mode ;
// (2) le joueur engage sa propre Signature par l'interface (brouillon, mode, verrouillage) ; (3) révélation ; (4) même
// chose avec le joueur qui verrouille en premier (rival retenu par `aiDelay`) : « ANNONCÉE AU RIVAL », main sans la carte.
// Usage : npm run build && [LQV_GPU=1 CHROMIUM_PATH=…] [LQV_VP=1920x1080] node tools/v33-annonce.mjs [dossier] [rapport.json]
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { launch, rendererLabel, startPreview, watchConsole, webglRenderer } from './browser.mjs';

const VP = (process.env.LQV_VP ?? '1280x720').split('x').map(Number);
const DIR = process.argv[2] ?? `screenshots/qa/v33/annonce-${VP[0]}`;
const OUT = process.argv[3] ?? `artifacts/qa/v33/annonce-${VP[0]}.json`;
const head = execSync('git rev-parse --short HEAD').toString().trim();
mkdirSync(DIR, { recursive: true });
const server = await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4296, process.env.LQV_DIST || 'dist');
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
  const shot = async (name) => { await p.waitForTimeout(500); const file = `${DIR}/${String(++n).padStart(2, '0')}-${name}.png`; writeFileSync(file, await p.screenshot()); steps.push({ name, file }); };
  const journal = () => p.evaluate(() => window.__lqv.events().filter((e) => e.vis !== 'p2').map((e) => e.kind));

  // 1. Le rival verrouille d'abord (rythme du jeu) : annonce.
  await p.goto(`${server.base}/?scenario=signature-annonce&qa=1&aiDelay=300`);
  await p.waitForFunction(() => window.__lqv?.view?.().reveal.signatures.opp, null, { timeout: 30000 });
  renderer = rendererLabel(await webglRenderer(p));
  check(await p.locator('[data-key="prim-opp-annoncee"]').count() === 1, 'Signature du rival face visible sur le plateau dès son verrouillage');
  const z = await p.evaluate(() => document.body.innerText);
  check(/SIGNATURE ANNONCÉE/.test(z) && /Mode : \?/.test(z), 'bandeau « SIGNATURE ANNONCÉE » et « Mode : ? »');
  check(/Verrouillé · Signature annoncée/.test(z), 'HUD du rival : « Verrouillé · Signature annoncée »');
  const modeRival = await p.evaluate(() => {
    const zone = document.querySelector('[data-focus-key="opp-primary"]');
    if (!zone) return -1;
    return zone.querySelectorAll('.stance-banner, .secret-stance.guard, .secret-stance.assault').length + (/Garde|Assaut|GARDE|ASSAUT/.test(zone.textContent) ? 1 : 0);
  });
  check(modeRival === 0, 'aucun mode du rival dans sa case Primaire');
  const v = await p.evaluate(() => window.__lqv.view());
  check(v.opp.primary === null && v.reveal.signatures.opp === 'sig-Ronce', 'vue du joueur : identité annoncée, aucune Primaire ni mode du rival');
  await shot('annonce-du-rival');

  // 2. Le joueur répond par sa Signature, par l'interface.
  await p.evaluate(() => { const c = window.__lqv.controller; const id = c.view.me.hand.find((x) => x.defId.startsWith('sig-')).cardId; c.ui.selected = id; });
  await p.evaluate(() => window.__lqv.controller.placeSelected('assault'));
  await p.evaluate(() => window.__lqv.controller.lockCommit());
  await p.waitForFunction(() => window.__lqv.view().reveal.primaries, null, { timeout: 30000 });
  const kinds = await journal();
  check(kinds.filter((k) => k === 'signatureAnnounced').length === 2, 'deux annonces au journal (rival puis joueur)');
  check(kinds.indexOf('signatureAnnounced') < kinds.indexOf('primariesRevealed'), 'annonces avant la révélation simultanée');
  await shot('deux-signatures-revelees');

  // 3. Le joueur verrouille en premier (rival retenu) : « ANNONCÉE AU RIVAL », la carte quitte la main.
  await p.goto(`${server.base}/?scenario=signature-annonce&qa=1&aiDelay=60000`);
  await p.waitForFunction(() => window.__lqv?.controller?.view?.awaitingMe && window.__lqv.view().phase === 'COMMIT', null, { timeout: 30000 });
  await p.evaluate(() => { const c = window.__lqv.controller; const id = c.view.me.hand.find((x) => x.defId.startsWith('sig-')).cardId; c.ui.selected = id; });
  await p.evaluate(() => window.__lqv.controller.placeSelected('guard'));
  await p.evaluate(() => window.__lqv.controller.lockCommit());
  await p.waitForFunction(() => window.__lqv.view().reveal.signatures.me, null, { timeout: 10000 });
  await p.waitForTimeout(400);
  check(await p.locator('[data-key="prim-me-annoncee"]').count() === 1, 'ma Signature « ANNONCÉE AU RIVAL » sur le plateau en attendant le rival');
  const mainSansSig = await p.evaluate(() => [...document.querySelectorAll('.hand .card[data-def]')].filter((e) => e.dataset.def === 'sig-Cendre').length);
  check(mainSansSig === 0, 'la Signature engagée ne revient pas dans la main');
  await shot('annonce-au-rival');
  check(issues.length === 0, `console : ${issues.length ? issues.join(' | ') : 'aucune erreur'}`);
} finally {
  await browser.close();
  server.stop?.();
  server.kill?.();
}
const ok = checks.every((c) => c.startsWith('OK'));
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({ commit: head, viewport: VP, renderer, ok, checks, steps, issues }, null, 1) + '\n');
console.log(`${checks.filter((c) => c.startsWith('OK')).length}/${checks.length} contrôles ; ${ok ? 'OK' : 'ÉCHEC'}`);
process.exit(ok ? 0 : 1);
