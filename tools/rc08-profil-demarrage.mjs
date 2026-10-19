// RC 0.8 (M08 C5, étape 4) — profil processeur (CDP) du démarrage à froid jusqu’à l’accueil interactif :
// temps propre agrégé par fonction (nom, fichier:ligne du bundle, ramené aux sources par la sourcemap si présente).
// Usage : npm run build && [LQV_DIST=<dist>] node tools/rc08-profil-demarrage.mjs [rapport.json]
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { launch, startPreview } from './browser.mjs';

const OUT = process.argv[2] ?? 'artifacts/qa/rc08/profil-demarrage.json';
const server = await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4267, process.env.LQV_DIST || 'dist');
const browser = await launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const p = await ctx.newPage();
  p.setDefaultTimeout(90000);
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.setSamplingInterval', { interval: 1000 });
  await cdp.send('Profiler.start');
  await p.goto(`${server.base}/?qa=1&aiDelay=0`);
  await p.waitForSelector('[data-key="home-new"]', { state: 'visible' });
  await p.evaluate(() => new Promise((r) => requestAnimationFrame(r)));
  const { profile } = await cdp.send('Profiler.stop');
  const dt = new Map();
  const ids = profile.samples;
  const deltas = profile.timeDeltas;
  const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  for (let i = 0; i < ids.length; i++) dt.set(ids[i], (dt.get(ids[i]) ?? 0) + (deltas[i] ?? 0));
  const agg = new Map();
  const total = [...dt.values()].reduce((a, b) => a + b, 0);
  for (const [id, us] of dt) {
    const cf = byId.get(id).callFrame;
    const k = `${cf.functionName || '(anonyme)'} ${cf.url.split('/').pop()}:${cf.lineNumber + 1}:${cf.columnNumber + 1}`;
    agg.set(k, (agg.get(k) ?? 0) + us);
  }
  // Temps inclusif par fonction (pile) : chaque échantillon compte pour tous ses ancêtres distincts.
  const parent = new Map();
  for (const n of profile.nodes) for (const c of n.children ?? []) parent.set(c, n.id);
  const incl = new Map();
  for (const [id, us] of dt) {
    const seen = new Set();
    for (let n = id; n !== undefined; n = parent.get(n)) {
      const cf = byId.get(n).callFrame;
      const k = `${cf.functionName || '(anonyme)'} ${cf.url.split('/').pop()}:${cf.lineNumber + 1}:${cf.columnNumber + 1}`;
      if (seen.has(k)) continue;
      seen.add(k);
      incl.set(k, (incl.get(k) ?? 0) + us);
    }
  }
  const top = (m, n) => [...m].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, us]) => [k, Math.round(us / 1000)]);
  const rep = { totalMs: Math.round(total / 1000), selfTop: top(agg, 40), inclusiveTop: top(incl, 60) };
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(rep, null, 2));
  console.log(`total ${rep.totalMs} ms`);
  for (const [k, ms] of rep.inclusiveTop.slice(0, 45)) console.log(`${String(ms).padStart(6)} ms  ${k}`);
} finally {
  await browser.close();
  server.stop();
}
