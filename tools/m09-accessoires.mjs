// M09 — retours R1 du responsable sur la ville en rangs (fiche du lot M10-E, 2026-10-21 : « ajouter des ombres aux props
// décoratifs comme les stands », « pas de sensation d'image collée sur la scène mais bien des props intégrés », « le
// chemin lumineux ne doit pas être caché par ces props »). Vérification au navigateur, sur le build : chaque accessoire du
// mobilier des quatre îlots de la ville en rangs (Quai, Parvis, Ruelles, Grande Cour) vu de près, le personnage posé
// devant lui ; vues larges du rang 1 de chaque îlot (accessoires des bandes du pied des façades) ; planche par îlot.
// Usage : npm run build && LQV_GPU=1 CHROMIUM_PATH=<Chrome> npm run qa:accessoires [-- dossier rapport.json]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { launch, rendererLabel, startPreview, watchConsole, webglRenderer } from './browser.mjs';
import { MEUBLES_RANGS } from '../src/ville/quaiProfond.ts';
import { MEUBLES_PARVIS } from '../src/ville/parvisRangs.ts';
import { MEUBLES_RUELLES } from '../src/ville/ruellesRangs.ts';
import { MEUBLES_COUR } from '../src/ville/grandeCour.ts';

const DIR = process.argv[2] ?? 'screenshots/qa/m09/accessoires';
const OUT = process.argv[3] ?? 'artifacts/qa/m09/accessoires.json';
const MEUBLES = { quai: MEUBLES_RANGS, parvis: MEUBLES_PARVIS, ruelles: MEUBLES_RUELLES, cour: MEUBLES_COUR };
/** Vues larges du rang 1 (accessoires des bandes du pied des façades et lampadaires de la rue) : x, z du personnage. */
const RANG1 = { quai: [[-12, 1.5], [0, 1.5], [12, 1.5]], parvis: [[-8, 1.0], [8, 1.0]], ruelles: [[-6, 2.5], [6, 2.5]], cour: [[-8, 0.5], [8, 0.5]] };
const man = JSON.parse(readFileSync('public/decors/manifest-profondeur.json', 'utf8'));
const report = { date: new Date().toISOString(), checks: [], console: [], renderer: null, vues: {} };
const check = (ok, label) => { report.checks.push(`${ok ? 'OK' : 'ÉCHEC'} ${label}`); console.log(`${ok ? 'OK' : 'ÉCHEC'} ${label}`); };
const dataUrl = (png) => `data:image/png;base64,${png.toString('base64')}`;
const fromUrl = (u) => Buffer.from(u.split(',')[1], 'base64');

mkdirSync(DIR, { recursive: true });
const browser = await launch();
const srv = await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4463, process.env.LQV_DIST || 'dist');
try {
  for (const [id, meubles] of Object.entries(MEUBLES)) {
    const pg = await (await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })).newPage();
    pg.setDefaultTimeout(120000);
    watchConsole(pg, report.console);
    await pg.goto(`${srv.base}/?ville=1&qa=1&freeze=1&profondeur=1&ilot=${id}`);
    await pg.waitForFunction(() => !!window.__lqvVille, null, { timeout: 120000 });
    report.renderer ??= rendererLabel(await webglRenderer(pg));
    await pg.evaluate(() => { for (const e of document.querySelectorAll('.ville-panel, .ville-bubble, .ville-toast, .ville-hud')) e.style.display = 'none'; });
    const plans = man.ilots[id].plans;
    const shots = [];
    const vues = [];
    for (const [x, z] of RANG1[id]) vues.push({ k: `rang1-${x}`, at: [x, z], f: 'dos', crop: null, label: `rang 1, x ${x}` });
    for (const m of meubles) {
      const p = plans[m.id];
      if (!p) { check(false, `${id}/${m.id} : plan absent du manifeste`); continue; }
      const h = p.width * p.size[1] / p.size[0];
      vues.push({ k: m.id, at: [m.x + (m.x > 0 ? -1 : 1) * (p.width / 2 + 1.4), m.z + 1.6], f: m.x > 0 ? 'droite' : 'gauche', crop: { x: p.at[0], z: p.at[2], w: p.width, h }, label: m.id });
    }
    for (const v of vues) {
      const r = await pg.evaluate(({ at, f, crop }) => {
        const t = window.__lqvVille.town;
        t.place({ x: at[0], z: at[1] }, f);
        t.renderNow();
        if (!crop) return { box: null };
        const pts = [[crop.x - crop.w / 2, 0, crop.z + 1.2], [crop.x + crop.w / 2, 0, crop.z + 1.2], [crop.x - crop.w / 2, crop.h, crop.z], [crop.x + crop.w / 2, crop.h, crop.z], [crop.x, 0, crop.z - 1.5]].map(([x, y, z]) => t.project({ x, y, z }));
        const xs = pts.map((q) => q.x); const ys = pts.map((q) => q.y);
        return { box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], visible: pts.every((q) => q.visible) };
      }, v);
      await pg.waitForTimeout(250);
      let clip;
      if (r.box) {
        const [x0, y0, x1, y1] = r.box; const mx = (x1 - x0) * 0.35 + 30; const my = (y1 - y0) * 0.35 + 30;
        const cx0 = Math.max(0, x0 - mx); const cy0 = Math.max(0, y0 - my);
        clip = { x: cx0, y: cy0, width: Math.max(80, Math.min(1920, x1 + mx) - cx0), height: Math.max(60, Math.min(1080, y1 + my) - cy0) };
      }
      const png = await pg.screenshot(clip ? { clip } : {});
      writeFileSync(join(DIR, `${id}-${v.k}.png`), png);
      shots.push([png, v.label]);
      report.vues[`${id}/${v.k}`] = { at: v.at, clip: clip ?? null, visible: r.visible ?? true };
    }
    check(true, `${id} : ${vues.length} vues (${meubles.length} accessoires, ${RANG1[id].length} vues du rang 1)`);
    await pg.context().close();
    const pp = await (await browser.newContext({ viewport: { width: 2100, height: 1400 }, deviceScaleFactor: 1 })).newPage();
    const planche = await pp.evaluate(async (u) => {
      const im = await Promise.all(u.imgs.map(async (src) => { const i = new Image(); i.src = src; await i.decode(); return i; }));
      const pad = 14; const tw = 520; const th = 320; const top = 40; const cols = 4; const rows = Math.ceil(im.length / cols);
      const c = document.createElement('canvas'); c.width = cols * tw + (cols + 1) * pad; c.height = top + rows * (th + 32) + 8;
      const g = c.getContext('2d'); g.fillStyle = '#10121a'; g.fillRect(0, 0, c.width, c.height);
      g.fillStyle = '#e8dcc0'; g.font = 'bold 17px system-ui'; g.fillText(u.title, pad, 26); g.font = '14px system-ui';
      im.forEach((i, n) => {
        const x = pad + (n % cols) * (tw + pad); const y = top + Math.floor(n / cols) * (th + 32);
        const s = Math.min(tw / i.width, th / i.height); const w = i.width * s; const h = i.height * s;
        g.drawImage(i, x + (tw - w) / 2, y + (th - h) / 2, w, h); g.fillText(u.labels[n], x, y + th + 20);
      });
      return c.toDataURL('image/png');
    }, { imgs: shots.map(([p]) => dataUrl(p)), labels: shots.map(([, l]) => l), title: `${id} : accessoires de la ville en rangs (retours R1)` });
    writeFileSync(join(DIR, `planche-${id}.png`), fromUrl(planche));
    await pp.context().close();
  }
} finally {
  const bad = report.console.filter((x) => !/GPU stall due to ReadPixels|Automatic fallback to software WebGL/.test(x));
  check(bad.length === 0, `console : ${bad.length ? bad.slice(0, 3).join(' | ') : 'aucune erreur'}`);
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);
  srv.stop();
  await browser.close();
}
process.exit(report.checks.every((c) => c.startsWith('OK')) ? 0 : 1);
