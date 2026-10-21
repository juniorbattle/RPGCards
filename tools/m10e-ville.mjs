// M10-E — parcours navigateur de la ville vivante dans le prototype `?aventure=1` (ville en rangs, QA) : l'aventure est
// avancée jusqu'au chapitre V (les quatre chefs vaincus) par des FAITS rejoués dans la machine d'états (`qaFaits`, mêmes
// règles que le jeu), puis : la cour de la Chapelle → la porte cochère → **la Grande Cour** ; le héraut du Tournoi
// (« ! ») et l'ouverture du Championnat ; un duel de poule lancé pour de vrai (issue imposée en QA, `qaTerminer`) et le
// retour devant le héraut ; une rumeur écoutée (« ? », le passant repart) ; un refus (le personnage reste, puis repart
// au point de décision suivant) ; « Continuer » après un rechargement : la ville se relit sans tirage.
// Usage : npm run build && [LQV_GPU=1 CHROMIUM_PATH=<Chrome>] [LQV_VP=1920x1080] node tools/m10e-ville.mjs [dossier] [rapport.json]
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { launch, rendererLabel, startPreview, watchConsole, webglRenderer } from './browser.mjs';

const VP = (process.env.LQV_VP ?? '1280x720').split('x').map(Number);
const DIR = process.argv[2] ?? `screenshots/qa/m10e/ville-${VP[0]}`;
const OUT = process.argv[3] ?? `artifacts/qa/m10e/ville-${VP[0]}.json`;
const head = execSync('git rev-parse --short HEAD').toString().trim();
mkdirSync(DIR, { recursive: true });
const server = await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4296, process.env.LQV_DIST || 'dist');
const browser = await launch();
const issues = [];
const steps = [];
const checks = [];
const check = (ok, what) => { checks.push(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); console.log(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); };
let n = 0;
let renderer = '';
const ROLES = ['cadet', 'brasDroit', 'chef'];
const conquerir = (f, k) => ROLES.flatMap((r, i) => [{ type: 'lancerDefi', figure: `${r}-${f}` }, { type: 'duelStructurant', figure: `${r}-${f}`, issue: 'victoire', duel: `q${k}${i}` }]);
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
  const ilot = () => av(() => window.__lqvAventure.town.ilotId());
  const poses = (il) => av((x) => window.__lqvAventure.posesDe(x).map((q) => ({ id: q.id, genre: q.genre, repere: q.repere })), il);
  const fermer = async () => { if (await p.$('.ville-dialog')) { await p.keyboard.press('Escape'); await p.waitForTimeout(250); } };
  const devant = async (id) => {
    await fermer();
    await av((x) => { const t = window.__lqvAventure.town; const sp = t.ilot.spawns[`npc-${x}`]; t.place(sp, sp.face); }, id);
    await p.waitForTimeout(700);
    await p.keyboard.press('KeyE');
    await p.waitForSelector('.ville-dialog');
  };
  /** Voyage d'un îlot à un autre par la machine de l'aventure (fondu, point de décision) ; attend l'arrivée. */
  const voyage = async (to, spawn) => {
    await fermer();
    await av(([t, s]) => window.__lqvAventure.voyager(t, s), [to, spawn]);
    await p.waitForFunction((t) => window.__lqvAventure.town.ilotId() === t && !document.querySelector('.ville-fade'), to, { timeout: 30000 });
    await p.waitForTimeout(400);
  };

  await p.goto(`${server.base}/?aventure=1&qa=1&aiDelay=0&reducedMotion=1&profileSeed=21`, { timeout: Number(process.env.LQV_QA_NAV_TIMEOUT) || 90000 });
  renderer = rendererLabel(await webglRenderer(p).catch(() => null));
  await p.click('[data-key="av-new"]');
  await p.fill('[data-key="av-name"]', 'Sam');
  await p.click('[data-key="av-start"]');
  await townReady();
  check(await av(() => window.__lqvAventure.quaiRangs === true), 'la ville en rangs est affichée (QA : dioramas admis)');
  const faits = [
    { type: 'scene', id: 'P2' }, { type: 'duelPrologue', issue: 'victoire', faits: { assautsGagnes: 1, gardesGagnees: 3, interferencesReussies: 0 } },
    { type: 'confirmer', famille: 'Voile' }, ...conquerir('Voile', 'v'),
    { type: 'engager', famille: 'Cendre' }, ...conquerir('Cendre', 'c'),
    { type: 'engager', famille: 'Ronce' }, ...conquerir('Ronce', 'r'),
    { type: 'engager', famille: 'Astre' }, ...conquerir('Astre', 'a'),
  ];
  const refus = await av((evs) => window.__lqvAventure.qaFaits(evs), faits);
  check(refus.length === 0, `faits rejoués jusqu'au chapitre V sans refus (${refus.join(' | ') || 'aucun'})`);
  await townReady();

  // la cour de la Chapelle, puis la porte cochère : la Grande Cour
  await voyage('quai', 'cour-chapelle');
  await av(() => { const t = window.__lqvAventure.town; t.place({ x: 9.5, z: -39.5 }, 'droite'); });
  await p.waitForTimeout(600);
  check(await av(() => window.__lqvAventure.town.zone()?.id === 'sortie-cour'), 'la cour de la Chapelle : la porte cochère du bout est mène à la Grande Cour');
  await shot('cour-chapelle-porte');
  await p.keyboard.press('KeyE');
  await p.waitForFunction(() => window.__lqvAventure.town.ilotId() === 'cour' && !document.querySelector('.ville-fade'), null, { timeout: 30000 });
  await p.waitForTimeout(600);
  check((await p.textContent('.av-lieu b, .ville-place b, [data-key="av-lieu"]').catch(() => '')).includes('Grande Cour') || (await ilot()) === 'cour', 'arrivée dans la Grande Cour (par l’escalier du premier plan)');
  await shot('grande-cour-arrivee');
  const pc = await poses('cour');
  check(pc.some((q) => q.id === 'heraut' && q.repere === '!'), `le héraut du Tournoi, devant l’estrade, avec un « ! » (${pc.map((q) => q.id).join(', ')})`);

  // le héraut : l'ouverture, puis la poule ; un duel lancé pour de vrai, retour devant le héraut
  await devant('heraut');
  check(/quatre chefs lèvent leur bannière/.test(await p.textContent('.ville-dialog')), 'le héraut : l’ouverture du Championnat devant l’estrade');
  await shot('heraut-ouverture');
  await p.click('[data-key="dlg-next"]');
  await p.waitForSelector('[data-key^="dlg-poule-"]');
  check(/Quatre Bannières/.test(await p.textContent('.ville-dialog')), 'S’inscrire : les Quatre Bannières, le choix des chefs');
  await shot('heraut-poule');
  const chef = await p.getAttribute('[data-key^="dlg-poule-"]', 'data-key');
  await p.click(`[data-key="${chef}"]`);
  await p.waitForSelector('[data-key="av-duel-go"]');
  await p.click('[data-key="av-duel-go"]');
  await p.waitForFunction(() => !!window.__lqv?.controller?.view?.awaitingMe, null, { timeout: 120000 });
  await av(() => window.__lqvAventure.qaTerminer('defaite'));
  await p.waitForSelector('[data-screen="av-resultat"]');
  await p.click('[data-key="av-retour"]');
  await townReady();
  const apres = await av(() => { const t = window.__lqvAventure.town; const sp = t.ilot.spawns['npc-heraut']; const w = t.walker().pos; return { il: t.ilotId(), d: Math.hypot(w.x - sp.x, w.z - sp.z), dernier: window.__lqvAventure.save.etat.competitions.championnat.dernier }; });
  check(apres.il === 'cour' && apres.d < 0.1, `après le duel : retour dans la Grande Cour, devant le héraut (${apres.il}, ${apres.d.toFixed(2)} m)`);
  check(!!apres.dernier, `la Signature du duel de poule est retenue (${apres.dernier}) : la suivante devra en changer`);
  await devant('heraut');
  const txt = await p.textContent('.ville-dialog');
  const sigOk = await av(() => window.__lqvAventure.save.etat.deck.signature);
  check(!(await p.$('[data-key^="dlg-poule-"]')) || sigOk !== apres.dernier, 'même Signature : aucun chef proposé tant qu’elle n’a pas changé');
  await shot('heraut-meme-signature');
  check(/change à chaque duel|Équipez|aucun duel possible/i.test(txt), 'la raison est affichée (changer de Signature)');

  // une rumeur (« ? ») et un refus, cherchés en passant d'îlot en îlot (chaque arrivée est un point de décision)
  const ILOTS = ['cour', 'quai', 'parvis', 'ruelles'];
  let rumeur = null;
  let facultative = null;
  for (let i = 0; i < 16 && !(rumeur && facultative); i++) {
    const il = ILOTS[i % 4];
    if ((await ilot()) !== il) await voyage(il, 'arrivee');
    const ps = await poses(il);
    if (!rumeur) { const r = ps.find((q) => q.genre === 'ambiance'); if (r) rumeur = { il, id: r.id, repere: r.repere }; }
    if (!facultative) { const f = ps.find((q) => q.genre === 'facultative' || q.genre === 'rival'); if (f) facultative = { il, id: f.id }; }
    if (rumeur && rumeur.il === il && !rumeur.fait) {
      await devant(rumeur.id);
      rumeur.texte = await p.textContent('.ville-dialog');
      await shot(`rumeur-${il}`);
      await fermer();
      rumeur.parti = !(await poses(il)).some((q) => q.id === rumeur.id);
      rumeur.fait = true;
    }
    if (facultative && facultative.il === il && !facultative.fait) {
      await devant(facultative.id);
      await shot(`facultative-${il}`);
      await p.click('[data-key="dlg-close"]');
      await p.waitForTimeout(300);
      facultative.reste = (await poses(il)).some((q) => q.id === facultative.id);
      const autre = il === 'cour' ? 'quai' : 'cour';
      await voyage(autre, 'arrivee');
      await voyage(il, 'arrivee');
      facultative.parti = !(await poses(il)).some((q) => q.id === facultative.id);
      facultative.fait = true;
    }
  }
  check(!!rumeur?.fait && rumeur.repere === '?' && /«/.test(rumeur.texte ?? '') && rumeur.parti, `une rumeur (« ? ») : ${rumeur ? `${rumeur.id} @ ${rumeur.il}, réplique lue, le passant repart` : 'aucune rencontrée'}`);
  check(!!facultative?.fait && facultative.reste && facultative.parti, `un refus : ${facultative ? `${facultative.id} @ ${facultative.il} reste, sans redemander, puis repart au point de décision suivant` : 'aucune rencontre facultative'}`);

  // « Continuer » après un rechargement : la ville se relit, sans point de décision
  await fermer();
  await av(() => window.__lqvAventure.memoriser?.());
  const avant = await av(() => JSON.stringify(window.__lqvAventure.save.directeur));
  const ou = await ilot();
  await p.reload();
  await p.click('[data-key="av-continue"]');
  await townReady();
  const apresReload = await av(() => JSON.stringify(window.__lqvAventure.save.directeur));
  check(apresReload === avant && (await ilot()) === ou, `« Continuer » : même îlot (${ou}) et même directeur (aucun tirage au rechargement)`);
  await shot('reprise');
} catch (err) {
  check(false, `parcours interrompu : ${err.message.split('\n')[0]}`);
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
