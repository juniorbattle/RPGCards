// M08 C1 — rendu identique au pixel près avec la préparation aux temps morts. Parcours réel du jeu, build avant C1
// (LQV_BEFORE) contre build après (dist/) : profil de test (quatre duels libres ouverts), tableau, temps mort, clic sur
// l’affiche de Maëlle, Sélène, Orin puis Kaï (côté après, chacun est pris TOUT PRÊT : `__lqvPrep().taken`) ; à l’écran de
// préparation, scène 3D seule (calques DOM masqués) ; puis duel lancé contre Kaï : scène seule et capture complète
// (HUD compris). Rendu figé, mouvement réduit, 1280×720 et 1920×1080. Témoin : même parcours, `figure=v1` côté après,
// qui doit différer (la méthode voit un changement de personnage).
// Usage : npm run build && LQV_BEFORE=<dist avant> LQV_BEFORE_SHA=<sha> [LQV_GPU=1 CHROMIUM_PATH=…] [LQV_SHOTS=<dossier>]
//         node tools/c1-identique.mjs [sortie.json]
// LQV_SHOTS : les captures avant / après (préparation contre Maëlle, duel complet) y sont enregistrées en PNG.
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
const SHOTS = process.env.LQV_SHOTS ?? null;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
import { dirname } from 'node:path';
import { launch, rendererLabel, startPreview, watchConsole, webglRenderer } from './browser.mjs';

const BEFORE = process.env.LQV_BEFORE;
if (!BEFORE) throw new Error('LQV_BEFORE=<dossier du build avant> requis');
const OUT = process.argv[2] ?? 'artifacts/qa/m08/c1-identique.json';
const head = execSync('git rev-parse --short HEAD').toString().trim();
// LQV_AFTER / LQV_AFTER_SHA : build « après » construit hors du dépôt (commit précis), au lieu de `dist`.
const AFTER = process.env.LQV_AFTER ?? 'dist';
const commit = process.env.LQV_AFTER_SHA ?? (execSync('git status --porcelain src').toString().trim() ? `${head}+arbre de travail` : head);
const port = Number(process.env.LQV_PREVIEW_PORT) || 4221;
const servers = { avant: await startPreview(port, BEFORE), apres: await startPreview(port + 1, AFTER) };
const browser = await launch();
const helper = await (await browser.newContext()).newPage();
const issues = [];
let renderer = null;
const TARGETS = ['ronce', 'voile', 'astre', 'braise'];

/** Écart entre deux PNG : moyenne absolue (0–255), maximum, nombre de pixels différents. */
const diff = (a, b) => helper.evaluate(async ({ a, b }) => {
  const load = async (src) => { const i = new Image(); i.src = src; await i.decode(); const c = new OffscreenCanvas(i.width, i.height); const x = c.getContext('2d'); x.drawImage(i, 0, 0); return x.getImageData(0, 0, i.width, i.height); };
  const [p, q] = [await load(a), await load(b)];
  if (p.width !== q.width || p.height !== q.height) return { error: 'tailles différentes' };
  let sum = 0; let max = 0; let px = 0;
  const box = [Infinity, Infinity, -1, -1];
  for (let i = 0; i < p.data.length; i += 4) {
    let d = 0;
    for (let c = 0; c < 3; c++) { const e = Math.abs(p.data[i + c] - q.data[i + c]); sum += e; d = Math.max(d, e); }
    if (d) {
      px++;
      const x = (i / 4) % p.width; const y = Math.floor(i / 4 / p.width);
      box[0] = Math.min(box[0], x); box[1] = Math.min(box[1], y); box[2] = Math.max(box[2], x); box[3] = Math.max(box[3], y);
    }
    max = Math.max(max, d);
  }
  return { meanAbs: Math.round((sum / (p.data.length / 4 * 3)) * 1000) / 1000, max, pixels: px, box: px ? box : null };
}, { a: `data:image/png;base64,${a.toString('base64')}`, b: `data:image/png;base64,${b.toString('base64')}` });

const OPEN_ALL = () => {
  const s = JSON.parse(localStorage.getItem('lqv.save'));
  s.progress.met = ['braise', 'ronce', 'voile', 'astre'];
  s.progress.series = { step: 0, completed: 1 };
  localStorage.setItem('lqv.save', JSON.stringify(s));
};

const sceneOnly = async (p) => {
  await p.evaluate(() => { for (const id of ['app', 'shell', 'stage']) { const el = document.getElementById(id); if (el) el.style.visibility = 'hidden'; } });
  await p.waitForTimeout(150);
  const buf = await p.locator('#arena canvas').screenshot();
  await p.evaluate(() => { for (const id of ['app', 'shell', 'stage']) { const el = document.getElementById(id); if (el) el.style.visibility = ''; } });
  return buf;
};

/** Temps mort : préparation achevée côté après ; même attente minimale des deux côtés. */
const idle = async (p) => {
  await p.waitForTimeout(1200);
  await p.waitForFunction(() => !window.__lqvPrep || window.__lqvPrep().pending === 0, null, { timeout: 20000 });
};

/** Parcours complet sur un build : scènes de préparation des quatre rivaux, puis duel contre le dernier. */
async function journey(which, vp, extra = '') {
  const ctx = await browser.newContext({ viewport: { width: vp[0], height: vp[1] }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  p.setDefaultTimeout(30000);
  watchConsole(p, issues);
  await p.goto(`${servers[which].base}/?qa=1&aiDelay=0&reducedMotion=1&freeze=1&profileSeed=5${extra}`);
  renderer ??= await webglRenderer(p);
  await p.click('[data-key="home-new"]');
  await p.fill('[data-key="new-name"]', 'Capture');
  await p.click('[data-key="new-sig-Ronce"]');
  await p.click('[data-key="new-create"]');
  await p.waitForSelector('[data-screen="board"]');
  await p.evaluate(OPEN_ALL);
  await p.reload();
  await p.click('[data-key="home-continue"]');
  await p.waitForSelector('[data-screen="board"]');
  const shots = {};
  const taken = {};
  for (const [i, id] of TARGETS.entries()) {
    await idle(p);
    const before = await p.evaluate(() => window.__lqvPrep?.().taken ?? null);
    await p.click(`[data-key="enc-libre-${id}"]`);
    await p.waitForSelector('[data-screen="prep"]');
    await idle(p);
    const after = await p.evaluate(() => window.__lqvPrep?.().taken ?? null);
    taken[id] = before === null ? null : after - before === 1;
    shots[`prep-${id}`] = await sceneOnly(p);
    if (i < TARGETS.length - 1) {
      await p.click('[data-key="prep-back"]');
      await p.waitForSelector('[data-screen="board"]');
    }
  }
  await p.click('[data-key="prep-start"]');
  await p.waitForFunction(() => !!window.__lqv);
  await p.waitForTimeout(900);
  shots['duel-scene'] = await sceneOnly(p);
  shots['duel-complet'] = await p.screenshot();
  await ctx.close();
  return { shots, taken };
}

const results = [];
const control = [];
const noise = [];
const prepared = {};
try {
  for (const vp of [[1280, 720], [1920, 1080]]) {
    const v = `${vp[0]}x${vp[1]}`;
    const a = await journey('avant', vp);
    const b = await journey('apres', vp);
    prepared[v] = b.taken;
    if (SHOTS) for (const k of ['prep-ronce', 'duel-scene', 'duel-complet']) for (const [w, j] of [['avant', a], ['apres', b]]) writeFileSync(`${SHOTS}/c1-${k}-${w}-${vp[0]}.png`, j.shots[k]);
    for (const k of Object.keys(a.shots)) {
      const d = await diff(a.shots[k], b.shots[k]);
      results.push({ viewport: v, kind: k, ...d });
      console.log(`${v} ${k} : écart moyen ${d.meanAbs}/255, max ${d.max}, ${d.pixels} pixels différents${d.box ? `, boîte ${JSON.stringify(d.box)}` : ''}`);
    }
    // Bruit de la méthode : le build d’avant contre lui-même (deuxième parcours), sur chaque capture.
    const a2 = await journey('avant', vp);
    for (const k of Object.keys(a.shots)) {
      const d = await diff(a.shots[k], a2.shots[k]);
      noise.push({ viewport: v, kind: k, ...d });
      if (d.pixels) console.log(`  bruit avant/avant ${k} : écart moyen ${d.meanAbs}/255, max ${d.max}, ${d.pixels} pixels, boîte ${JSON.stringify(d.box)}`);
    }
    // Témoin : personnages en V1 côté après (même parcours) : la comparaison doit relever un écart.
    const t = await journey('apres', vp, '&figure=v1');
    const d = await diff(a.shots['prep-ronce'], t.shots['prep-ronce']);
    control.push({ viewport: v, kind: 'prep-ronce, figure=v1', ...d });
    console.log(`  témoin (figure=v1) : écart moyen ${d.meanAbs}/255, ${d.pixels} pixels différents`);
  }
} finally {
  await browser.close();
  servers.avant.stop();
  servers.apres.stop();
}
const allTaken = Object.values(prepared).every((t) => Object.values(t).every(Boolean));
const identical = results.every((r) => r.pixels === 0) && control.every((r) => r.pixels > 0);
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({ date: new Date().toISOString(), renderer: rendererLabel(renderer), builds: { avant: process.env.LQV_BEFORE_SHA ?? '?', apres: commit }, identical, preparedPathUsed: allTaken, prepared, results, noise, control, issues }, null, 2));
console.log(identical ? 'IDENTIQUE au pixel près' : 'ÉCARTS relevés', `· rivaux pris tout prêts : ${allTaken ? 'oui' : 'NON'}`, issues.length ? `· console : ${issues.length}` : '');
