// M09 V1 — laboratoire de caméra : captures comparables des deux caméras et coût mesuré (SwiftShader, processeur).
//   - captures : pour chaque caméra (dessus, frontale) × taille (1280×720, 1920×1080) × position (arrivée, étal, Fanal,
//     porte de la salle, Kaï), temps figé (`freeze=1`) ;
//   - coût : 4 s de rendu animé par caméra en marchant (intervalles d’images, temps processeur du rendu, appels de
//     dessin, triangles, textures, programmes), construction de la scène ;
//   - planche côte à côte des deux caméras (mêmes positions).
// Usage : npm run build && [LQV_DIST=<dist>] node tools/m09-labo.mjs [dossier] [rapport.json]
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { launch, rendererLabel, startPreview, watchConsole, webglRenderer } from './browser.mjs';

const DIR = process.argv[2] ?? 'screenshots/qa/m09/v1';
const OUT = process.argv[3] ?? 'artifacts/qa/m09/v1-labo.json';
const SIZES = (process.env.LQV_SIZES ?? '1280x720,1920x1080').split(',').map((s) => s.split('x').map(Number));
const SPOTS = { arrivee: [-17.4, 0.6, 'droite'], etal: [-0.6, 0.2, 'face'], fanal: [7.2, -1.4, 'dos'], salle: [-6.75, -1.4, 'dos'], kai: [12.0, 1.0, 'droite'], 'parvis-porte': [0, -2.6, 'dos', 'parvis'], 'parvis-joueuse': [-4.8, 0.9, 'gauche', 'parvis'] };
const ONLY = process.env.LQV_SPOTS?.split(',') ?? Object.keys(SPOTS);
const head = execSync('git rev-parse --short HEAD').toString().trim();
const commit = execSync('git status --porcelain src').toString().trim() ? `${head}+arbre de travail` : head;
mkdirSync(DIR, { recursive: true });
const server = await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4281, process.env.LQV_DIST || 'dist');
const browser = await launch();
const issues = [];
const report = { date: new Date().toISOString(), commit, renderer: null, shots: [], cost: {}, issues };
try {
  for (const cam of ['frontale']) {
    for (const [w, h] of SIZES) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
      const p = await ctx.newPage();
      p.setDefaultTimeout(90000);
      watchConsole(p, issues);
      await p.goto(`${server.base}/?ville=1&vcam=${cam}&qa=1&freeze=1`);
      await p.waitForFunction(() => !!window.__lqvVille);
      report.renderer ??= rendererLabel(await webglRenderer(p));
      for (const k of ONLY) {
        const [x, z, f, ilot = 'quai'] = SPOTS[k];
        await p.evaluate(({ x, z, f, ilot }) => { const t = window.__lqvVille.town; if (t.ilotId() !== ilot) t.goTo(ilot, 'arrivee'); t.place({ x, z }, f); t.renderNow(); }, { x, z, f, ilot });
        await p.waitForTimeout(300);
        const file = `${DIR}/${cam}-${k}-${w}x${h}.png`;
        writeFileSync(file, await p.screenshot());
        report.shots.push({ cam, spot: k, size: `${w}x${h}`, file });
        console.log(file);
      }
      await ctx.close();
    }
    // coût animé (1280×720) : marche le long du quai pendant 4 s
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    p.setDefaultTimeout(90000);
    watchConsole(p, issues);
    const t0 = Date.now();
    await p.goto(`${server.base}/?ville=1&vcam=${cam}&qa=1`);
    await p.waitForFunction(() => !!window.__lqvVille && window.__lqvVille.town.stats().frames > 2);
    const ready = Date.now() - t0;
    await p.keyboard.down('KeyD');
    await p.waitForTimeout(4000);
    await p.keyboard.up('KeyD');
    const r = await p.evaluate(() => {
      const iv = window.__lqvVille.intervals().slice(5);
      const s = [...iv].sort((a, b) => a - b);
      const st = window.__lqvVille.town.stats();
      return { st, median: Math.round(s[s.length >> 1]), p95: Math.round(s[Math.floor(s.length * 0.95)]), n: iv.length, walked: window.__lqvVille.town.walker().pos };
    });
    report.cost[cam] = { readyMs: ready, ...r };
    console.log(cam, JSON.stringify(report.cost[cam]));
    await ctx.close();
  }
} finally {
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(report, null, 2));
  await browser.close();
  server.stop();
}
console.log('console :', issues.length ? issues.slice(0, 10) : 'aucune erreur');
