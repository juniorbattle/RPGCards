// M07 L5 — preuve que le rendu V1 est inchangé au pixel près entre deux builds (avant : LQV_BEFORE, rendu par défaut ;
// après : dist/, rendu `LQV_APRES_QUERY`, défaut `&figure=v1` depuis que le V2 est le rendu par défaut) : scène 3D seule du duel (vue A, rendu figé, seed 202) pour les quatre rivaux, capture complète (HUD compris)
// du duel contre Maëlle, et écran Rencontres (affiches et portraits des quatre rivaux), à 1280×720 et 1920×1080.
// Usage : LQV_BEFORE=<dist avant> LQV_BEFORE_SHA=<sha> [LQV_GPU=1 CHROMIUM_PATH=…] node tools/l5-identique.mjs [sortie.json]
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { launch, rendererLabel, startPreview, watchConsole, webglRenderer } from './browser.mjs';

const BEFORE = process.env.LQV_BEFORE;
if (!BEFORE) throw new Error('LQV_BEFORE=<dossier du build avant> requis');
const OUT = process.argv[2] ?? 'artifacts/qa/m07/l5-identique.json';
const head = execSync('git rev-parse --short HEAD').toString().trim();
const commit = execSync('git status --porcelain src').toString().trim() ? `${head}+arbre de travail` : head;
const servers = { avant: await startPreview(4197, BEFORE), apres: await startPreview(4198) };
const browser = await launch();
const helper = await (await browser.newContext()).newPage();
const issues = [];
let renderer = null;

/** Écart entre deux PNG : moyenne absolue (0–255), maximum, nombre de pixels différents. */
const diff = (a, b) => helper.evaluate(async ({ a, b }) => {
  const load = async (src) => { const i = new Image(); i.src = src; await i.decode(); const c = new OffscreenCanvas(i.width, i.height); const x = c.getContext('2d'); x.drawImage(i, 0, 0); return x.getImageData(0, 0, i.width, i.height); };
  const [p, q] = [await load(a), await load(b)];
  if (p.width !== q.width || p.height !== q.height) return { error: 'tailles différentes' };
  let sum = 0; let max = 0; let px = 0;
  for (let i = 0; i < p.data.length; i += 4) {
    let d = 0;
    for (let c = 0; c < 3; c++) { const e = Math.abs(p.data[i + c] - q.data[i + c]); sum += e; d = Math.max(d, e); }
    if (d) px++;
    max = Math.max(max, d);
  }
  return { meanAbs: Math.round((sum / (p.data.length / 4 * 3)) * 1000) / 1000, max, pixels: px };
}, { a: `data:image/png;base64,${a.toString('base64')}`, b: `data:image/png;base64,${b.toString('base64')}` });

async function capture(which, vp, kind, rival, extra = '') {
  const ctx = await browser.newContext({ viewport: { width: vp[0], height: vp[1] }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  p.setDefaultTimeout(30000);
  watchConsole(p, issues);
  const base = servers[which].base;
  let buf;
  if (kind === 'rencontres') {
    await p.goto(`${base}/?qa=1&aiDelay=0&reducedMotion=1&freeze=1&profileSeed=5${extra}`);
    await p.click('[data-key="home-new"]');
    await p.fill('[data-key="new-name"]', 'Capture');
    await p.click('[data-key="new-sig-Ronce"]');
    await p.click('[data-key="new-create"]');
    await p.waitForSelector('[data-screen="board"]');
    await p.waitForTimeout(1200);
    buf = await p.screenshot({ fullPage: true });
  } else {
    await p.goto(`${base}/?seed=202&autostart=1&rival=${rival}&qa=1&aiDelay=0&reducedMotion=1&freeze=1&intro=1&view=A${extra}`);
    await p.waitForFunction(() => !!window.__lqv);
    renderer ??= await webglRenderer(p);
    await p.waitForTimeout(700);
    if (kind === 'scene') {
      await p.evaluate(() => { for (const id of ['app', 'shell', 'stage']) { const el = document.getElementById(id); if (el) el.style.visibility = 'hidden'; } });
      await p.waitForTimeout(150);
      buf = await p.locator('#arena canvas').screenshot();
    } else buf = await p.screenshot();
  }
  await ctx.close();
  return buf;
}

const APRES = process.env.LQV_APRES_QUERY ?? '&figure=v1';
const results = [];
const control = [];
try {
  for (const vp of [[1280, 720], [1920, 1080]]) {
    const cases = [...['braise', 'ronce', 'voile', 'astre'].map((r) => ['scene', r]), ['complet', 'ronce'], ['rencontres', null]];
    for (const [kind, rival] of cases) {
      const a = await capture('avant', vp, kind, rival);
      const b = await capture('apres', vp, kind, rival, APRES);
      const d = await diff(a, b);
      results.push({ viewport: `${vp[0]}x${vp[1]}`, kind, rival, ...d });
      console.log(`${vp[0]}×${vp[1]} ${kind}${rival ? ` ${rival}` : ''} : écart moyen ${d.meanAbs}/255, max ${d.max}, ${d.pixels} pixels différents`);
      if (kind === 'scene' && rival === 'ronce') {
        // Témoin : la même comparaison, V2 activée côté « après », doit relever un écart (la méthode le voit).
        const t = await diff(a, await capture('apres', vp, kind, rival, '&figure=v2'));
        control.push({ viewport: `${vp[0]}x${vp[1]}`, ...t });
        console.log(`  témoin (V2 activée) : écart moyen ${t.meanAbs}/255, ${t.pixels} pixels différents`);
      }
    }
  }
} finally {
  await browser.close();
  servers.avant.stop();
  servers.apres.stop();
}
const identical = results.every((r) => r.pixels === 0) && control.every((r) => r.pixels > 0);
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({ date: new Date().toISOString(), renderer: rendererLabel(renderer), builds: { avant: process.env.LQV_BEFORE_SHA ?? '?', apres: commit }, identical, results, control, issues }, null, 2));
console.log(identical ? 'IDENTIQUE au pixel près' : 'ÉCARTS relevés', issues.length ? `, console : ${issues.length}` : '');
