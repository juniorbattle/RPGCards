// RC 0.8 (M08 C5, étape 1) — vérification ciblée : les « Duels de la ville » (PNJ) s’ouvrent dans la rue, le reste
// des rencontres garde son lieu. Produit réel (nouveau profil), 1280×720 : Rencontres → Préparation de chaque
// rencontre (lieu monté dans l’arène lu par `stats().venue`) ; puis un duel PNJ lancé (lieu pendant le duel) et
// une capture. Usage : npm run build && node tools/rc08-ville-rue.mjs [rapport.json] [capture.png]
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { launch, rendererLabel, startPreview, watchConsole, webglRenderer } from './browser.mjs';

const OUT = process.argv[2] ?? 'artifacts/qa/rc08/ville-rue.json';
const SHOT = process.argv[3] ?? 'screenshots/qa/rc08/duel-ville-rue.png';
const head = execSync('git rev-parse --short HEAD').toString().trim();
const commit = execSync('git status --porcelain src').toString().trim() ? `${head}+arbre de travail` : head;
const server = await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4261);
const browser = await launch();
const issues = [];
const report = { date: new Date().toISOString(), commit, renderer: null, encounters: {}, duel: null, issues, ok: false };
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  p.setDefaultTimeout(30000);
  watchConsole(p, issues);
  await p.goto(`${server.base}/?qa=1&aiDelay=0&profileSeed=5&reducedMotion=1`);
  report.renderer = rendererLabel(await webglRenderer(p));
  await p.click('[data-key="home-new"]');
  await p.fill('[data-key="new-name"]', 'Rue');
  await p.click('[data-key="new-sig-Ronce"]');
  await p.click('[data-key="new-create"]');
  await p.waitForSelector('[data-screen="board"]');
  const ids = await p.evaluate(() => [...document.querySelectorAll('[data-key^="enc-"]')].map((e) => e.getAttribute('data-key').slice(4)));
  for (const id of ids) {
    const enabled = await p.evaluate((k) => !document.querySelector(`[data-key="enc-${k}"]`).disabled, id);
    if (!enabled) { report.encounters[id] = { playable: false }; continue; }
    await p.click(`[data-key="enc-${id}"]`);
    await p.waitForSelector('[data-screen="prep"]');
    const venue = await p.evaluate(() => window.__lqvShell.d.arena().stats().venue);
    report.encounters[id] = { playable: true, venue };
    console.log(`${id} → ${venue}`);
    await p.click('[data-key="prep-back"]');
    await p.waitForSelector('[data-screen="board"]');
  }
  const town = ids.find((i) => i.startsWith('ville-'));
  await p.click(`[data-key="enc-${town}"]`);
  await p.waitForSelector('[data-screen="prep"]');
  await p.click('[data-key="prep-start"]');
  await p.waitForFunction(() => !!window.__lqv && window.__lqvShell.flow.screen === 'duel');
  await p.waitForTimeout(2500);
  report.duel = { encounter: town, venue: await p.evaluate(() => window.__lqvShell.d.arena().stats().venue) };
  mkdirSync(dirname(SHOT), { recursive: true });
  writeFileSync(SHOT, await p.screenshot());
  console.log(`duel ${town} → ${report.duel.venue}`);
  const bad = Object.entries(report.encounters).filter(([id, e]) => e.playable && id.startsWith('ville-') && e.venue !== 'rue');
  report.ok = bad.length === 0 && report.duel.venue === 'rue' && Object.keys(report.encounters).some((k) => k.startsWith('ville-'));
} finally {
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(report, null, 2));
  await browser.close();
  server.stop();
}
console.log(report.ok ? 'OK' : 'ÉCHEC', issues.length ? issues : '');
process.exit(report.ok ? 0 : 1);
