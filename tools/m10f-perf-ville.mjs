// M10-F — performances de la ville de l'aventure sur GPU réel : la ville en rangs (images approuvées), chacun des quatre
// îlots (le Quai, le Parvis, les Ruelles, la Grande Cour) parcouru à pied 4 s (2 s vers la droite, 2 s vers la gauche),
// intervalles entre images relevés dans la page (requestAnimationFrame), appels de dessin, triangles, textures,
// programmes, temps processeur du rendu, temps de mise en place de l'îlot. Animations réelles (sans `reducedMotion`).
// Usage : npm run build && LQV_GPU=1 CHROMIUM_PATH=<Chrome> [LQV_CHROME_ARGS=--force_high_performance_gpu] [LQV_VP=1920x1080] node tools/m10f-perf-ville.mjs [rapport.json]
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { launch, startPreview, watchConsole, webglRenderer } from './browser.mjs';

const VP = (process.env.LQV_VP ?? '1280x720').split('x').map(Number);
const OUT = process.argv[2] ?? `artifacts/qa/m10f/perf-ville-${VP[0]}.json`;
const head = execSync('git rev-parse --short HEAD').toString().trim();
const server = await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4383, process.env.LQV_DIST || 'dist');
const browser = await launch();
const issues = [];
const report = { commit: head, viewport: VP, ilots: {} };
try {
  const ctx = await browser.newContext({ viewport: { width: VP[0], height: VP[1] }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  p.setDefaultTimeout(120000);
  watchConsole(p, issues);
  await p.goto(`${server.base}/?aventure=1&qa=1&profileSeed=31`, { timeout: 120000 });
  report.renderer = await webglRenderer(p).catch(() => null);
  await p.click('[data-key="av-new"]');
  await p.click('[data-key="av-start"]');
  const pret = (id) => p.waitForFunction((x) => { const t = window.__lqvAventure?.town; return !!t && t.ilot.id === x && t.stats().frames > 2 && !document.querySelector('.ville-host').hidden && !document.querySelector('.ville-fade'); }, id, { timeout: 120000 });
  for (const id of ['quai', 'parvis', 'ruelles', 'cour']) {
    if (id !== 'quai') await p.evaluate((x) => window.__lqvAventure.voyager(x, 'arrivee'), id);
    const t0 = Date.now();
    await pret(id);
    const pretMs = Date.now() - t0;
    await p.waitForTimeout(1500);
    await p.evaluate(() => { window.__m10fIv = []; let last = performance.now(); const tick = (t) => { window.__m10fIv.push(t - last); last = t; if (window.__m10fIv) requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
    await p.keyboard.down('KeyD'); await p.waitForTimeout(2000); await p.keyboard.up('KeyD');
    await p.keyboard.down('KeyA'); await p.waitForTimeout(2000); await p.keyboard.up('KeyA');
    const r = await p.evaluate(() => {
      const iv = window.__m10fIv.slice(3);
      window.__m10fIv = null;
      const s = [...iv].sort((a, b) => a - b);
      const q = (f) => Math.round(s[Math.min(s.length - 1, Math.floor(s.length * f))] * 10) / 10;
      const t = window.__lqvAventure.town;
      return { images: iv.length, medianeMs: q(0.5), p95Ms: q(0.95), p99Ms: q(0.99), maxMs: Math.round(s[s.length - 1] * 10) / 10, sup33ms: s.filter((d) => d > 33.4).length, stats: t.stats(), decors: t.decorReport?.().world ?? null };
    });
    report.ilots[id] = { pretMs, ...r };
    console.log(id, JSON.stringify({ pretMs, images: r.images, medianeMs: r.medianeMs, p95Ms: r.p95Ms, maxMs: r.maxMs, appels: r.stats.calls, triangles: r.stats.triangles, textures: r.stats.textures, programmes: r.stats.programs, cpuMs: r.stats.cpuMs, monde: r.decors }));
  }
  await ctx.close();
} finally {
  await browser.close();
  server.stop();
}
report.console = issues;
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 1));
console.log(`console : ${issues.length ? issues.slice(0, 5).join(' | ') : 'aucune erreur'} ; rendu : ${report.renderer ?? '?'}`);
process.exit(issues.length ? 1 : 0);
