// RC 0.8 (M08 C5, étape 4) — démarrage à froid, mesuré dans le produit (build de production, `vite preview`).
// Chaque ronde : contexte neuf (cache HTTP vide, aucune sauvegarde), navigation, puis
//   - `home` : accueil affiché ET interactif (bouton « Nouvelle partie » présent, une image peinte après) ;
//   - `arene` : première image 3D de la scène derrière l’accueil (`stats().frame` > 0) ;
//   - `duel` : du clic sur « Duel ! » (manche 1, nouveau profil) jusqu’à la première décision jouable.
// Relevés : DOMContentLoaded, load, tâches longues (> 50 ms) jusqu’à l’accueil, octets transférés.
// SwiftShader (processeur) : ordres de grandeur relatifs entre deux builds, jamais une mesure de GPU.
// Usage : npm run build && [LQV_DIST=<dist>] [LQV_RONDES=5] [LQV_DEMARRAGE_QUERY=compileAsync=1] node tools/rc08-demarrage.mjs [rapport.json]
// Sur GPU réel : LQV_GPU=1 CHROMIUM_PATH=<Chrome>, comparer sans puis avec LQV_DEMARRAGE_QUERY=compileAsync=1.
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { launch, rendererLabel, startPreview, watchConsole, webglRenderer } from './browser.mjs';

const OUT = process.argv[2] ?? 'artifacts/qa/rc08/demarrage.json';
const DIST = process.env.LQV_DIST || 'dist';
const ROUNDS = Number(process.env.LQV_RONDES ?? 5);
const head = execSync('git rev-parse --short HEAD').toString().trim();
const commit = execSync('git status --porcelain src').toString().trim() ? `${head}+arbre de travail` : head;
const assets = readdirSync(join(DIST, 'assets')).filter((f) => !f.endsWith('.map')).map((f) => ({ f, octets: statSync(join(DIST, 'assets', f)).size }));
const server = await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4265, DIST);
const browser = await launch();
const issues = [];
let renderer = null;
const report = { date: new Date().toISOString(), commit, dist: DIST, assets, renderer: null, rounds: [], median: {}, issues };
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
try {
  for (let i = 0; i < ROUNDS; i++) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    await ctx.addInitScript(() => {
      window.__lt = [];
      try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lt.push([Math.round(e.startTime), Math.round(e.duration)]); }).observe({ type: 'longtask', buffered: true }); } catch { /* */ }
    });
    const p = await ctx.newPage();
    p.setDefaultTimeout(60000);
    watchConsole(p, issues);
    let bytes = 0;
    p.on('response', async (r) => { try { bytes += (await r.body()).length; } catch { /* */ } });
    await p.goto(`${server.base}/?qa=1&aiDelay=0${process.env.LQV_DEMARRAGE_QUERY ? `&${process.env.LQV_DEMARRAGE_QUERY}` : ''}`, { waitUntil: 'commit' });
    await p.waitForSelector('[data-key="home-new"]', { state: 'visible' });
    const homeT = await p.evaluate(() => new Promise((res) => requestAnimationFrame(() => res(performance.now()))));
    await p.waitForFunction(() => (window.__lqvShell?.d.arena()?.stats().frame ?? 0) > 0);
    const arenaT = await p.evaluate(() => performance.now());
    const nav = await p.evaluate(() => { const n = performance.getEntriesByType('navigation')[0]; return { dcl: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd) }; });
    const lt = await p.evaluate((t) => window.__lt.filter(([s]) => s <= t), homeT);
    renderer ??= await webglRenderer(p);
    await p.click('[data-key="home-new"]');
    await p.click('[data-key="new-create"]');
    await p.waitForSelector('[data-screen="board"]');
    await p.click('[data-key="enc-quai-1"]');
    await p.waitForSelector('[data-screen="prep"]');
    const duelMs = await p.evaluate(() => new Promise((res) => {
      const t0 = performance.now();
      document.querySelector('[data-key="prep-start"]').click();
      const tick = () => {
        const c = window.__lqv?.controller;
        const v = c?.view;
        if (v && (v.awaitingMe || v.phase === 'ENDED')) requestAnimationFrame(() => res(performance.now() - t0)); else setTimeout(tick, 10);
      };
      tick();
    }));
    const r = { home: Math.round(homeT), arene: Math.round(arenaT), dcl: nav.dcl, load: nav.load, longTasks: lt.length, longTasksMs: lt.reduce((a, [, d]) => a + d, 0), maxLongTask: lt.reduce((a, [, d]) => Math.max(a, d), 0), duel: Math.round(duelMs), octets: bytes };
    report.rounds.push(r);
    console.log(`ronde ${i + 1} : accueil ${r.home} ms · arène ${r.arene} ms · DCL ${r.dcl} · load ${r.load} · tâches longues ${r.longTasks} (${r.longTasksMs} ms, max ${r.maxLongTask}) · premier duel ${r.duel} ms · ${Math.round(bytes / 1024)} Kio`);
    await ctx.close();
  }
  for (const k of Object.keys(report.rounds[0])) report.median[k] = med(report.rounds.map((r) => r[k]));
  report.renderer = rendererLabel(renderer);
  console.log('médianes', report.median);
} finally {
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(report, null, 2));
  await browser.close();
  server.stop();
}
