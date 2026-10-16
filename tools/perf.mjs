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
  for (const cam of ['tilted', 'frontal']) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.goto(`${server.base}/?scenario=signature&qa=1&aiDelay=0&cam=${cam}&reducedMotion=0`);
    await page.waitForTimeout(6000);
    scene[cam] = await page.evaluate(() => window.__lqv.arenaStats());
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
