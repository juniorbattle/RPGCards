// Mesures indicatives, consignées avec la machine et le commit. Par défaut WebGL logiciel (SwiftShader) :
// aucune extrapolation GPU. `LQV_GPU=1` : GPU réel du poste, moteur de rendu relevé dans le rapport.
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import { EXTRA_ARGS, GPU, launch, rendererLabel, startPreview, waitDecision, webglRenderer } from './browser.mjs';

mkdirSync('artifacts/qa', { recursive: true });
// Build mesuré : dist/ du commit courant, ou un autre build (LQV_DIST + LQV_BUILD_SHA, ex. l’« avant »
// M03.2) écrit dans LQV_PERF_OUT pour une comparaison sur la même machine, dans la même session.
const commit = process.env.LQV_BUILD_SHA ?? execSync('git rev-parse --short HEAD').toString().trim();
const OUT = process.env.LQV_PERF_OUT ?? 'artifacts/qa/perf.json';
const machine = { cpu: os.cpus()[0]?.model, cores: os.cpus().length, memGB: Math.round(os.totalmem() / 2 ** 30), platform: `${os.platform()} ${os.release()}`, node: process.version };
const engine = JSON.parse(execSync('npx tsx tools/perf-engine.ts 200').toString().trim().split('\n').pop());
console.log('moteur', engine);

const server = await startPreview(4183);
const browser = await launch();
const scene = {};
/** Statistiques de l’arène (vue imposée, 1280×720) : moyenne de 4 relevés après 5 s de mise en régime. */
async function measure(v, ablate = '') {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(`${server.base}/?scenario=signature&qa=1&aiDelay=0&view=${v}&reducedMotion=0${ablate ? `&ablate=${ablate}` : ''}`);
  await page.waitForTimeout(5000);
  const samples = [];
  for (let i = 0; i < 4; i++) { samples.push(await page.evaluate(() => window.__lqv.arenaStats())); await page.waitForTimeout(500); }
  await page.close();
  const avg = (k) => Math.round((samples.reduce((a, x) => a + x[k], 0) / samples.length) * 100) / 100;
  const last = samples[samples.length - 1];
  return { drawCalls: last.drawCalls, triangles: last.triangles, frameMs: avg('frameMs'), fps: avg('fps') };
}
try {
  for (const v of ['A', 'B']) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.goto(`${server.base}/?scenario=signature&qa=1&aiDelay=0&view=${v}&reducedMotion=0`);
    await page.waitForTimeout(6000);
    scene[`view${v}`] = await page.evaluate(() => window.__lqv.arenaStats());
    // Chronométrage GPU : extension de requêtes temporelles (absente sous SwiftShader en général).
    scene[`gpuTimerQuery${v}`] = await page.evaluate(() => {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl2');
      return !!gl && !!gl.getExtension('EXT_disjoint_timer_query_webgl2');
    });
    scene[`renderer${v}`] = await webglRenderer(page);
    await page.close();
  }
  // M03.2 — coût des éléments du décor (vue A) : chaque mesure retire un élément (paramètre QA
  // `ablate`, inerte hors qa=1). Aucun post-traitement n’existe (pas d’EffectComposer) : le tone
  // mapping ACES est calculé dans les shaders des matériaux.
  // (LQV_PERF_ABLATE=0 pour un build antérieur qui ignore `ablate`.)
  // Rondes entrelacées (ordre inversé une ronde sur deux), médiane par variante : la charge du
  // conteneur varie trop pour un relevé isolé.
  if (process.env.LQV_PERF_ABLATE !== '0') {
    const variants = ['', 'candles', 'banners', 'dust', 'candles,banners,dust'];
    const runs = Object.fromEntries(variants.map((a) => [a || 'complet', []]));
    for (let r = 0; r < 3; r++) {
      for (const a of r % 2 ? [...variants].reverse() : variants) runs[a || 'complet'].push(await measure('A', a));
    }
    const med = (xs) => [...xs].sort((x, y) => x - y)[Math.floor(xs.length / 2)];
    scene.ablationViewA = Object.fromEntries(Object.entries(runs).map(([k, xs]) => [k, { drawCalls: xs[0].drawCalls, triangles: xs[0].triangles, medianFrameMs: med(xs.map((x) => x.frameMs)), medianFps: med(xs.map((x) => x.fps)), frameMs: xs.map((x) => x.frameMs) }]));
  }
  // M03.2 — Clash joué en temps réel (non figé, mouvement complet) : intervalles requestAnimationFrame
  // pendant la scène de Clash (ASSAUT III + soutien Rang contre GARDE IV : absorption). Sous SwiftShader,
  // ces intervalles mesurent le rendu logiciel du conteneur, pas un GPU.
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.goto(`${server.base}/?scenario=clash-ag&qa=1&aiDelay=0&reducedMotion=0`);
    await page.waitForFunction(() => !!window.__lqv);
    const v = await waitDecision(page);
    const card = v.me.hand.find((x) => x.defId.startsWith('Cendre-3'));
    await page.click(`[data-key="hand-${card.cardId}"]`);
    await page.click('[data-drop="primary"]');
    await page.click('[data-key="stance-assault"]');
    await page.click('[data-key="act-commit"]');
    for (let i = 0; i < 6; i++) {
      const w = await waitDecision(page);
      if (w.phase === 'LECTURE') { await page.click('[data-key="act-lecture-pass"]'); continue; }
      if (w.phase === 'TACTICS' && w.awaitingMe) {
        await page.click('[data-key="zone-me-0"]');
        await page.click('[data-key="menu-0-rank"]');
        await page.click('[data-key="act-tactics"]');
        continue;
      }
      break;
    }
    await page.waitForFunction(() => window.__lqv.presentation().stage, null, { timeout: 20000 });
    const deltas = await page.evaluate(() => new Promise((res) => {
      const out = [];
      let last = performance.now();
      const t0 = last;
      const step = (t) => { out.push(t - last); last = t; if (t - t0 < 2500) requestAnimationFrame(step); else res(out); };
      requestAnimationFrame(step);
    }));
    const sorted = deltas.slice(1).sort((a, b) => a - b);
    const q = (k) => Math.round(sorted[Math.min(sorted.length - 1, Math.floor(k * sorted.length))] * 10) / 10;
    scene.clashRealtime = { scenario: 'clash-ag (Assaut contre Garde)', window: '2,5 s depuis l’apparition de la scène de Clash', frames: sorted.length, medianMs: q(0.5), p95Ms: q(0.95), maxMs: Math.round(sorted[sorted.length - 1] * 10) / 10, over50ms: sorted.filter((d) => d > 50).length, arena: await page.evaluate(() => window.__lqv.arenaStats()) };
    await page.close();
  }
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(`${server.base}/?gallery=1&artSeed=123`);
  const art = await page.evaluate(() => window.__artGenMs);
  const t = await page.evaluate(() => performance.getEntriesByType('navigation')[0]?.toJSON?.() ?? null);
  scene.galleryLoad = { domContentLoadedMs: t ? Math.round(t.domContentLoadedEventEnd) : null, loadMs: t ? Math.round(t.loadEventEnd) : null, artGeneration37CardsMs: art };
  await page.close();
} finally {
  await browser.close();
  server.stop();
}
const report = { commit, date: new Date().toISOString(), machine, renderer: rendererLabel(scene.rendererA), gpu: GPU, chromeArgs: EXTRA_ARGS, engine, scene };
writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
