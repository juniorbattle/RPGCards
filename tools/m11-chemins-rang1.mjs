// M11 — chemins lumineux des premiers rangs (demande du responsable du 2026-10-26 : « ajouter des chemins lumineux pour les
// premiers rangs de scènes afin qu'ils soient cohérents à nos autres rangs »). Vérification au navigateur, sur le build :
// le personnage posé sur le premier rang de chacun des six îlots de la ville en rangs, à gauche, au milieu et à droite ;
// une planche par îlot et une planche d'ensemble.
// Usage : npm run build && node tools/m11-chemins-rang1.mjs [dossier rapport.json]
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { launch, rendererLabel, startPreview, watchConsole, webglRenderer } from './browser.mjs';

const DIR = process.argv[2] ?? 'screenshots/qa/m11/chemins-rang1';
const OUT = process.argv[3] ?? 'artifacts/qa/m11/chemins-rang1.json';
const [VW, VH] = (process.env.LQV_VP ?? '1280x720').split('x').map(Number);
/** Le personnage sur le premier rang de chaque îlot : x, z. */
const VUES = {
  quai: [[-13, 1.2], [0, 1.2], [13, 1.2]],
  parvis: [[-10, 0.8], [0, 0.2], [10, 0.8]],
  ruelles: [[-8, 1.6], [0, 1.6], [8, 1.6]],
  cour: [[-10, 1.2], [0, 1.2], [10, 1.2]],
  port: [[-10, 0.6], [0, 0.6], [10, 0.6]],
  haute: [[-10, 0.6], [0, 0.6], [10, 0.6]],
};
const report = { date: new Date().toISOString(), checks: [], console: [], renderer: null, vues: {} };
const check = (ok, label) => { report.checks.push(`${ok ? 'OK' : 'ÉCHEC'} ${label}`); console.log(`${ok ? 'OK' : 'ÉCHEC'} ${label}`); };
const dataUrl = (png) => `data:image/png;base64,${png.toString('base64')}`;
const fromUrl = (u) => Buffer.from(u.split(',')[1], 'base64');

async function planche(browser, title, shots, cols) {
  const pp = await (await browser.newContext({ viewport: { width: 1800, height: 1200 }, deviceScaleFactor: 1 })).newPage();
  const url = await pp.evaluate(async (u) => {
    const im = await Promise.all(u.imgs.map(async (src) => { const i = new Image(); i.src = src; await i.decode(); return i; }));
    const pad = 12; const tw = 560; const th = Math.round(tw * im[0].height / im[0].width); const top = 40; const rows = Math.ceil(im.length / u.cols);
    const c = document.createElement('canvas'); c.width = u.cols * tw + (u.cols + 1) * pad; c.height = top + rows * (th + 28) + 8;
    const g = c.getContext('2d'); g.fillStyle = '#10121a'; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#e8dcc0'; g.font = 'bold 17px system-ui'; g.fillText(u.title, pad, 26); g.font = '14px system-ui';
    im.forEach((i, n) => {
      const x = pad + (n % u.cols) * (tw + pad); const y = top + Math.floor(n / u.cols) * (th + 28);
      g.drawImage(i, x, y, tw, th); g.fillText(u.labels[n], x, y + th + 18);
    });
    return c.toDataURL('image/png');
  }, { title, imgs: shots.map(([p]) => dataUrl(p)), labels: shots.map(([, l]) => l), cols });
  await pp.context().close();
  return fromUrl(url);
}

mkdirSync(DIR, { recursive: true });
const browser = await launch();
const srv = await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4467, process.env.LQV_DIST || 'dist');
const tous = [];
try {
  for (const [id, vues] of Object.entries(VUES)) {
    const pg = await (await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 1 })).newPage();
    pg.setDefaultTimeout(180000);
    watchConsole(pg, report.console);
    await pg.goto(`${srv.base}/?ville=1&qa=1&freeze=1&profondeur=1&ilot=${id}`);
    await pg.waitForFunction(() => !!window.__lqvVille, null, { timeout: 180000 });
    report.renderer ??= rendererLabel(await webglRenderer(pg));
    await pg.evaluate(() => { for (const e of document.querySelectorAll('.ville-panel, .ville-bubble, .ville-toast, .ville-hud')) e.style.display = 'none'; });
    const shots = [];
    for (const [x, z] of vues) {
      const r = await pg.evaluate(({ x, z }) => {
        const t = window.__lqvVille.town;
        t.place({ x, z }, 'face');
        t.renderNow();
        return { ilot: t.ilotId() };
      }, { x, z });
      await pg.waitForTimeout(300);
      const png = await pg.screenshot();
      writeFileSync(join(DIR, `${id}-x${x}.png`), png);
      shots.push([png, `${id} · rang 1, x ${x}`]);
      report.vues[`${id}/x${x}`] = { at: [x, z], ilot: r.ilot };
      check(r.ilot === id, `${id} : vue du rang 1 à x ${x}`);
    }
    await pg.context().close();
    writeFileSync(join(DIR, `planche-${id}.png`), await planche(browser, `Chemins lumineux du premier rang — ${id}`, shots, 3));
    tous.push(shots[1]);
  }
  writeFileSync(join(DIR, 'planche-chemins-rang1.png'), await planche(browser, 'Chemins lumineux des premiers rangs (2026-10-26) — les six îlots, personnage au milieu du rang 1', tous, 3));
  check(report.console.filter((l) => /error/i.test(l)).length === 0, `console sans erreur (${report.console.length} lignes)`);
} finally {
  srv.stop();
  await browser.close();
}
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2));
const ko = report.checks.filter((c) => c.startsWith('ÉCHEC')).length;
console.log(`${report.checks.length - ko}/${report.checks.length} vérifications`);
process.exit(ko ? 1 : 0);
