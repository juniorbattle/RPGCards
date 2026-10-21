// M09 J1 — le joueur in situ (laboratoire, QA : feuille non approuvée admise) dans les quatre couleurs de famille, au
// premier rang des Ruelles en rangs, en 1920 × 1080 : un recadrage autour du personnage par famille, assemblés en planche
// (`screenshots/qa/m09/j1/joueur-insitu.png`) ; hauteur à l'écran et feuille chargée relevées.
// Usage : npm run build && LQV_GPU=1 CHROMIUM_PATH=<Chrome> node tools/m09-joueur-insitu.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { launch, startPreview, watchConsole } from './browser.mjs';

const FAM = ['Cendre', 'Voile', 'Ronce', 'Astre'];
const browser = await launch();
const srv = await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4463, process.env.LQV_DIST || 'dist');
const out = { console: [], familles: {} };
const crops = [];
try {
  for (const f of FAM) {
    const pg = await (await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })).newPage();
    watchConsole(pg, out.console);
    await pg.goto(`${srv.base}/?ville=1&qa=1&freeze=1&profondeur=1&ilot=ruelles&sig=${f}`);
    await pg.waitForFunction(() => !!window.__lqvVille, null, { timeout: 120000 });
    const r = await pg.evaluate(() => { const t = window.__lqvVille.town; t.place({ x: -1.2, z: 0.8 }, 'face'); t.renderNow(); const p = t.walker().pos; const a = t.project({ x: p.x, y: 0, z: p.z }); const b = t.project({ x: p.x, y: t.walkerH(), z: p.z }); return { a, b, ext: t.externalReport() }; });
    await pg.evaluate(() => { for (const e of document.querySelectorAll('.ville-panel, .ville-bubble, .ville-toast')) e.style.display = 'none'; });
    await pg.waitForTimeout(300);
    const h = r.a.y - r.b.y;
    crops.push(await pg.screenshot({ clip: { x: Math.round(r.a.x - 1.1 * h), y: Math.round(r.b.y - 0.35 * h), width: Math.round(2.2 * h), height: Math.round(1.55 * h) } }));
    out.familles[f] = { hauteurPx: Math.round(h), feuilles: r.ext.loaded, refus: r.ext.issues };
    console.log(`${r.ext.loaded.includes(`player-${f}`) && !r.ext.issues.length ? 'OK' : 'ÉCHEC'} ${f} : feuille ${r.ext.loaded.join(', ')}, ${Math.round(h)} px`);
    await pg.context().close();
  }
  const pp = await (await browser.newContext()).newPage();
  const url = await pp.evaluate(async ({ imgs, fam }) => {
    const im = await Promise.all(imgs.map(async (s) => { const i = new Image(); i.src = s; await i.decode(); return i; }));
    const k = 2; const pad = 14; const w = im[0].width * k; const hh = im[0].height * k;
    const c = new OffscreenCanvas(4 * w + 5 * pad, hh + 2 * pad + 34); const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    g.fillStyle = '#10121a'; g.fillRect(0, 0, c.width, c.height); g.fillStyle = '#e8dcc0'; g.font = 'bold 16px system-ui';
    g.fillText('Feuille du joueur J1 in situ (Ruelles en rangs, 1920 × 1080, recadrage ×2) : tenue et accent recolorés par famille ; non approuvée', pad, 24);
    im.forEach((i, n) => { g.drawImage(i, pad + n * (w + pad), 34 + pad, w, hh); g.fillText(fam[n], pad + n * (w + pad) + 6, 34 + pad + 20); });
    const b = await c.convertToBlob({ type: 'image/png' });
    return await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(b); });
  }, { imgs: crops.map((b) => `data:image/png;base64,${b.toString('base64')}`), fam: FAM });
  mkdirSync('screenshots/qa/m09/j1', { recursive: true });
  writeFileSync('screenshots/qa/m09/j1/joueur-insitu.png', Buffer.from(url.split(',')[1], 'base64'));
} finally {
  const bad = out.console.filter((x) => !/GPU stall due to ReadPixels|Automatic fallback to software WebGL/.test(x));
  console.log(`${bad.length ? 'ÉCHEC' : 'OK'} console : ${bad.length} erreur(s)`);
  writeFileSync('artifacts/qa/m09/joueur-insitu.json', `${JSON.stringify(out, null, 2)}\n`);
  srv.stop();
  await browser.close();
}
