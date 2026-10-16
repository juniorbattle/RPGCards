// Mesures indicatives, consignées avec la machine et le commit. AUCUNE extrapolation GPU :
// le conteneur n’a pas de GPU (WebGL logiciel SwiftShader).
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import { launch, startPreview } from './browser.mjs';

mkdirSync('artifacts/qa', { recursive: true });
const commit = execSync('git rev-parse --short HEAD').toString().trim();
const machine = { cpu: os.cpus()[0]?.model, cores: os.cpus().length, memGB: Math.round(os.totalmem() / 2 ** 30), platform: `${os.platform()} ${os.release()}`, node: process.version };
const engine = JSON.parse(execSync('npx tsx tools/perf-engine.ts 200').toString().trim().split('\n').pop());
console.log('moteur', engine);

const server = await startPreview(4183);
const browser = await launch();
const scene = {};
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
    scene[`renderer${v}`] = await page.evaluate(() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      const ext = gl?.getExtension('WEBGL_debug_renderer_info');
      return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : null;
    });
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
const report = { commit, date: new Date().toISOString(), machine, renderer: 'Chromium headless + ANGLE/SwiftShader (CPU) — FPS non représentatifs d’un GPU', engine, scene };
writeFileSync('artifacts/qa/perf.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
