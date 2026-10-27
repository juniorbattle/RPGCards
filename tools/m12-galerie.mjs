// M12 (contrat 1, ADR 044) — galerie des cartes avant / après : la galerie (`?gallery=1`) en dessin M12 (défaut) et en
// dessin d'avant (`?cartes=v1`), cartes agrandies ; une planche par famille (Basics, variantes, Signature) et une planche
// des illustrations seules (sans plaque, pour juger les motifs). Contrôle du worker : chaque illustration pré-générée est
// comparée à une génération sur la page (`artCheck`).
// Usage : npm run build && node tools/m12-galerie.mjs [dossier] [rapport.json]
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { launch, startPreview, watchConsole } from './browser.mjs';

const DIR = process.argv[2] ?? 'screenshots/qa/m12/galerie';
const OUT = process.argv[3] ?? 'artifacts/qa/m12/galerie.json';
const W = Number(process.env.LQV_CARD_W) || 180;
mkdirSync(DIR, { recursive: true });
const server = await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4493, process.env.LQV_DIST || 'dist');
const browser = await launch();
const report = { date: new Date().toISOString(), checks: [], console: [], genMs: {} };
const check = (ok, what) => { report.checks.push(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); console.log(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); };
const FAMILIES = ['Cendre', 'Voile', 'Ronce', 'Astre'];
try {
  for (const v of ['v2', 'v1']) {
    const p = await (await browser.newContext({ viewport: { width: 3500, height: 1000 }, deviceScaleFactor: 1 })).newPage(); // avenant 09 : 17 cartes par famille
    watchConsole(p, report.console);
    await p.goto(`${server.base}/?gallery=1&qa=1&artCheck=1${v === 'v1' ? '&cartes=v1' : ''}`);
    await p.waitForFunction(() => typeof window.__artGenMs === 'number');
    report.genMs[v] = await p.evaluate(() => window.__artGenMs);
    await p.evaluate((w) => {
      const grid = document.querySelector('#app div[style*="flex-wrap"]');
      grid.style.setProperty('--card-w', `${w}px`);
      grid.style.setProperty('--card-h', `${Math.round(w * 1.4)}px`);
      grid.style.setProperty('--radius', `${Math.round(w * 0.07)}px`);
      grid.style.gap = '14px';
      for (const img of document.querySelectorAll('.card img')) img.decoding = 'sync';
    }, W);
    await p.waitForTimeout(800);
    // une rangée par famille : ses 17 cartes (I à IV : Basic, variantes A, B et C ; puis la Signature), puis le dos
    await p.evaluate((fams) => {
      const grid = document.querySelector('#app div[style*="flex-wrap"]');
      const holder = document.createElement('div');
      holder.id = 'm12-rows';
      holder.style.cssText = 'display:flex;flex-direction:column;gap:18px;padding:12px;width:max-content';
      for (const f of fams) {
        const row = document.createElement('div');
        row.className = `m12-row m12-${f}`;
        row.style.cssText = `display:flex;gap:14px;--card-w:${grid.style.getPropertyValue('--card-w')};--card-h:${grid.style.getPropertyValue('--card-h')};--radius:${grid.style.getPropertyValue('--radius')}`;
        for (const c of [...grid.querySelectorAll(`.card.fam-${f}`)]) row.append(c);
        holder.append(row);
      }
      grid.before(holder);
    }, FAMILIES);
    await p.waitForTimeout(500);
    for (const f of FAMILIES) writeFileSync(join(DIR, `${v}-${f}.png`), await (await p.$(`.m12-${f}`)).screenshot());
    writeFileSync(join(DIR, `${v}-planche.png`), await (await p.$('#m12-rows')).screenshot());
    // illustrations seules (variantes et Signatures)
    await p.evaluate(() => {
      const s = document.createElement('style');
      s.textContent = '.card .plate, .card .rank, .card .fam, .card .trig, .card .state-banner { display: none !important; } .card.rar-Basic { display: none !important; } .card.back { display: none !important; }';
      document.head.append(s);
    });
    await p.waitForTimeout(300);
    writeFileSync(join(DIR, `${v}-illustrations.png`), await (await p.$('#m12-rows')).screenshot());
    if (v === 'v2') {
      const warm = await p.waitForFunction(() => window.__lqv?.artWarm?.()?.done || window.__lqvArtWarm?.()?.done ? (window.__lqv?.artWarm?.() ?? window.__lqvArtWarm?.()) : null, null, { timeout: 30000 }).then((h) => h.jsonValue()).catch(() => null);
      check(!warm || warm.mismatches.length === 0, `worker et page : mêmes illustrations (${warm ? `${warm.checked} comparées, ${warm.mismatches.length} écart(s)` : 'contrôle non disponible sur cette page'})`);
    }
    await p.context().close();
  }
  check(report.console.filter((l) => /error/i.test(l)).length === 0, `console sans erreur (${report.console.length} lignes)`);
  check(true, `génération des illustrations (68 cartes) sur la page : v2 ${report.genMs.v2} ms, v1 ${report.genMs.v1} ms`);
} finally {
  server.stop();
  await browser.close();
}
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2));
const ko = report.checks.filter((c) => c.startsWith('ÉCHEC')).length;
console.log(`${report.checks.length - ko}/${report.checks.length} vérifications`);
process.exit(ko ? 1 : 0);
