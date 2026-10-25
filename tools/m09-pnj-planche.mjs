// M09, reprise du 2026-10-25 — planche des douze feuilles des PNJ de la ville (porte, passe 125 ; suite, passe 127 :
// « génère les 10 autres feuilles des PNJ […], traite-les et pose-les »).
//   A  galerie : chaque feuille de face, au repos, ×3 ; les gabarits recolorés aux couleurs d'un personnage de la ville
//      (docker 1, Tessa, Gaspard, Mira), par la même table que le nuanceur ; rivaux et chefs à leurs couleurs ;
//   B  en jeu, 1920 × 1080, avant (atlas dessinés par code, `sprites=code`) et après (feuilles, non approuvées : QA
//      seulement) : le joueur face au docker 1, à la marchande guide et au commis 5 (le Quai), à Kaï (le Quai), à Orin
//      (le Parvis) et à Sélène (les Ruelles) ; vues ×2.
// Usage : npm run build && node tools/m09-pnj-planche.mjs [dossier] [rapport.json]
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch, rendererLabel, startPreview, watchConsole, webglRenderer } from './browser.mjs';

const DIR = process.argv[2] ?? 'screenshots/qa/m09/pnj';
const OUT = process.argv[3] ?? 'artifacts/qa/m09/pnj/planche.json';
const GALERIE = [
  ['pnj-docker', 'pnj-docker-1', 'docker'], ['pnj-marchande', 'pnj-marchande-21', 'marchande (Tessa)'], ['pnj-commis', 'pnj-commis-17', 'commis (Gaspard)'], ['pnj-joueuse', 'pnj-joueuse-29', 'joueuse (Mira)'],
  ['braise', 'braise', 'Kaï'], ['ronce', 'ronce', 'Maëlle'], ['voile', 'voile', 'Sélène'], ['astre', 'astre', 'Orin'],
  ['chef-cendre', 'chef-cendre', 'Bran'], ['chef-ronce', 'chef-ronce', 'Mère Aubépine'], ['chef-voile', 'chef-voile', 'Ilse'], ['chef-astre', 'chef-astre', 'Halvard'],
];
const SCENES = [
  ['docker 1', 'quai', 'pnj-docker', { x: -4.6, z: 1.2 }, 'droite', { x: -2.4, z: 1.4 }],
  ['marchande (guide)', 'quai', 'pnj-marchande', { x: -10.4, z: -1.4 }, 'gauche', { x: -12.6, z: -1.6 }],
  ['commis 5', 'quai', 'pnj-commis', { x: 2.4, z: 1.8 }, 'droite', { x: 4.6, z: 1.9 }],
  ['Kaï', 'quai', 'braise', { x: 11.4, z: 0.8 }, 'droite', { x: 13.6, z: 0.9 }],
  ['Orin', 'parvis', 'astre', { x: 0.7, z: -3.3 }, 'droite', { x: 2.9, z: -3.5 }],
  ['Sélène', 'ruelles', 'voile', { x: 7.4, z: -0.5 }, 'droite', { x: 9.6, z: -0.6 }],
];
const head = execSync('git rev-parse --short HEAD').toString().trim();
const dirty = execSync('git status --porcelain src tools public').toString().trim() ? '+arbre de travail' : '';
mkdirSync(DIR, { recursive: true });
const report = { date: new Date().toISOString(), commit: `${head}${dirty}`, renderer: null, checks: [], console: [], admises: {} };
const check = (ok, what) => { report.checks.push(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); console.log(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); };
const dataUrl = (b) => `data:image/png;base64,${b.toString('base64')}`;
const fromUrl = (u) => Buffer.from(u.split(',')[1], 'base64');
const toUrl = /* dans la page */ async (c) => { const bl = await c.convertToBlob({ type: 'image/png' }); return await new Promise((r) => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(bl); }); };

const srv = await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4433);
let browser = null;
try {
  browser = await launch();
  const shots = {};
  let targets = null;
  for (const mode of ['avant', 'apres']) {
    for (const ilot of ['quai', 'parvis', 'ruelles']) {
      const p = await (await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })).newPage();
      p.setDefaultTimeout(90000);
      watchConsole(p, report.console);
      await p.goto(`${srv.base}/?ville=1&qa=1&ilot=${ilot}${mode === 'avant' ? '&sprites=code' : ''}`);
      await p.waitForFunction(() => !!window.__lqvVille, null, { timeout: 90000 });
      report.renderer ??= rendererLabel(await webglRenderer(p));
      if (mode === 'apres') report.admises[ilot] = JSON.stringify(await p.evaluate(() => window.__lqvVille.town.externalReport()));
      if (!targets && mode === 'apres') targets = await p.evaluate((ids) => Object.fromEntries(ids.map((id) => [id, window.__lqvVille.targets(id)])), GALERIE.map((g) => g[1]));
      for (const [nom, il, , at, facing, cible] of SCENES.filter((s) => s[1] === ilot)) {
        const box = await p.evaluate(({ at, facing, cible }) => {
          const t = window.__lqvVille.town;
          t.place(at, facing); t.renderNow();
          const a = t.project({ x: at.x, y: 0, z: at.z }); const b = t.project({ x: cible.x, y: 0, z: cible.z });
          const top = t.project({ x: at.x, y: t.walkerH(), z: at.z });
          return { x0: Math.min(a.x, b.x), x1: Math.max(a.x, b.x), feet: Math.max(a.y, b.y), hh: a.y - top.y };
        }, { at, facing, cible });
        await p.waitForTimeout(400);
        const pad = box.hh * 0.55;
        const clip = { x: Math.max(0, Math.round(box.x0 - pad)), y: Math.max(0, Math.round(box.feet - box.hh * 1.35)), width: Math.round(box.x1 - box.x0 + 2 * pad), height: Math.round(box.hh * 1.5) };
        const buf = await p.screenshot({ clip });
        writeFileSync(join(DIR, `${il}-${nom.split(' ')[0].toLowerCase()}-${mode}.png`), buf);
        shots[`${nom}-${mode}`] = dataUrl(buf);
      }
      await p.context().close();
    }
  }
  for (const [nom, il, id] of SCENES) check(report.admises[il]?.includes(`"${id}"`) || report.admises[il]?.includes(id), `${nom} : feuille ${id} admise en QA (${il})`);
  check(report.console.filter((m) => /^(error|pageerror)/.test(m)).length === 0, `console sans erreur (${report.console.length} messages)`);

  const pg = await (await browser.newContext()).newPage();
  await pg.setContent('<!doctype html><html><body></body></html>');
  const sheets = Object.fromEntries(GALERIE.map(([id]) => [id, dataUrl(readFileSync(`public/sprites/${id}.png`))]));
  const planche = await pg.evaluate(async ({ GALERIE, SCENES, sheets, targets, shots, toUrlSrc }) => {
    const toUrl = eval(toUrlSrc);
    const load = async (s) => { const i = new Image(); i.src = s; await i.decode(); return i; };
    const LV = [64, 128, 191, 255]; const STEPS = ['deep', 'shade', 'base', 'hi'];
    const MASK = { peau: [1, 0, 0], cheveux: [1, 1, 0], tenue: [1, 0, 1], chemise: [0, 1, 1] };
    const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
    // A : galerie (case face-repos de chaque feuille, recolorée au besoin), ×1 ici puis ×3 à la pose
    const cells = [];
    for (const [id, who] of GALERIE) {
      const img = await load(sheets[id]); const W = img.width / 5; const H = img.height / 3;
      const c = new OffscreenCanvas(W, H); const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, W, H, 0, 0, W, H);
      if (id.startsWith('pnj-')) {
        const d = g.getImageData(0, 0, W, H);
        for (let i = 0; i < d.data.length; i += 4) {
          if (!d.data[i + 3]) continue;
          for (const [slot, m] of Object.entries(MASK)) {
            const l = LV.findIndex((v) => m.every((mm, j) => d.data[i + j] === mm * v));
            if (l >= 0 && targets[who][slot]) { const t = hex(targets[who][slot][STEPS[l]]); d.data[i] = t[0]; d.data[i + 1] = t[1]; d.data[i + 2] = t[2]; break; }
          }
        }
        g.putImageData(d, 0, 0);
      }
      cells.push(c);
    }
    const rows = [];
    for (const [nom] of SCENES) rows.push([await load(shots[`${nom}-avant`]), await load(shots[`${nom}-apres`]), nom]);
    const pad = 16; const top = 40; const lab = 22; const S = 2;
    const cw = cells[0].width; const ch = cells[0].height; // feuille ×3 : 192 × 288
    const galW = 6 * cw + 7 * pad;
    const sceneW = Math.max(...rows.map(([a, b]) => S * (a.width + b.width) + 3 * pad));
    const width = Math.max(galW, sceneW);
    const height = top + lab + 2 * (ch + lab) + pad + rows.reduce((s, [a, b]) => s + S * Math.max(a.height, b.height) + lab + pad, 0) + pad;
    const c = new OffscreenCanvas(width, height); const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    x.fillStyle = '#20232c'; x.fillRect(0, 0, width, height);
    x.fillStyle = '#e8dcc0'; x.font = 'bold 18px system-ui';
    x.fillText('Feuilles des PNJ de la ville (12) : non approuvées, QA seulement', pad, 26);
    let y = top; x.font = '15px system-ui';
    x.fillStyle = '#c8bfa8'; x.fillText('Galerie, de face au repos (gabarits recolorés aux couleurs d’un personnage de la ville)', pad, y + 15); y += lab;
    cells.forEach((cell, k) => {
      const gx = pad + (k % 6) * (cw + pad); const gy = y + Math.floor(k / 6) * (ch + lab);
      x.drawImage(cell, gx, gy); x.fillStyle = '#c8bfa8'; x.fillText(GALERIE[k][2], gx + 4, gy + ch + 15);
    });
    y += 2 * (ch + lab) + pad;
    for (const [a, b, t] of rows) {
      x.fillStyle = '#c8bfa8'; x.fillText(`${t}, 1920 × 1080 : avant (dessin par code) | après (feuille) ; ×2`, pad, y + 15); y += lab;
      x.drawImage(a, pad, y, S * a.width, S * a.height); x.drawImage(b, 2 * pad + S * a.width, y, S * b.width, S * b.height); y += S * Math.max(a.height, b.height) + pad;
    }
    return await toUrl(c);
  }, { GALERIE, SCENES, sheets, targets, shots, toUrlSrc: toUrl.toString() });
  writeFileSync(join(DIR, 'planche-pnj.png'), fromUrl(planche));
  console.log(`planche : ${join(DIR, 'planche-pnj.png')}`);
} finally {
  await browser?.close();
  srv.stop();
}
mkdirSync('artifacts/qa/m09/pnj', { recursive: true });
writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);
process.exit(report.checks.every((c) => c.startsWith('OK')) ? 0 : 1);
