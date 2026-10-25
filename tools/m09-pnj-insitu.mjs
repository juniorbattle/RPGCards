// M09, reprise du 2026-10-25 — planche in situ de la porte des feuilles des PNJ (décision du responsable, passe 125 :
// « 16, avec une porte » : 2 feuilles posées in situ sur une planche qu'il regarde avant les 10 autres).
//   A  le Quai du laboratoire, avant (atlas dessinés par code, `sprites=code`) et après (feuilles, non approuvées : QA
//      seulement), le joueur à côté du docker 1, puis devant Kaï, en 1280 × 720 et 1920 × 1080 ;
//   B  la feuille du gabarit docker recolorée aux couleurs de chaque docker de la ville (graines de la ville et de
//      l'aventure), par la même table que le nuanceur (niveaux 64, 128, 191, 255 → ombre profonde, ombre, aplat, rehaut).
// Usage : npm run build && node tools/m09-pnj-insitu.mjs [dossier] [rapport.json]
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch, rendererLabel, startPreview, watchConsole, webglRenderer } from './browser.mjs';

const DIR = process.argv[2] ?? 'screenshots/qa/m09/pnj-porte';
const OUT = process.argv[3] ?? 'artifacts/qa/m09/pnj/insitu.json';
const DOCKERS = ['pnj-docker-1', 'pnj-docker-9', 'pnj-docker-12', 'pnj-docker-61', 'pnj-docker-63', 'pnj-docker-71', 'pnj-docker-73'];
const head = execSync('git rev-parse --short HEAD').toString().trim();
const dirty = execSync('git status --porcelain src tools public').toString().trim() ? '+arbre de travail' : '';
mkdirSync(DIR, { recursive: true });
const report = { date: new Date().toISOString(), commit: `${head}${dirty}`, renderer: null, checks: [], console: [], vues: {} };
const check = (ok, what) => { report.checks.push(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); console.log(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); };
const dataUrl = (b) => `data:image/png;base64,${b.toString('base64')}`;
const fromUrl = (u) => Buffer.from(u.split(',')[1], 'base64');

const srv = await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4433);
let browser = null;
try {
  browser = await launch();
  const shots = {};
  for (const [w, h] of [[1280, 720], [1920, 1080]]) {
    for (const mode of ['avant', 'apres']) {
      const p = await (await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 })).newPage();
      p.setDefaultTimeout(90000);
      watchConsole(p, report.console);
      await p.goto(`${srv.base}/?ville=1&qa=1${mode === 'avant' ? '&sprites=code' : ''}`);
      await p.waitForFunction(() => !!window.__lqvVille, null, { timeout: 90000 });
      report.renderer ??= rendererLabel(await webglRenderer(p));
      const rep = await p.evaluate(() => window.__lqvVille.town.externalReport());
      report.vues[`${mode}-${w}`] = rep;
      for (const [nom, at, facing, cible] of [
        ['docker', { x: -4.6, z: 1.2 }, 'droite', { x: -2.4, z: 1.4 }],
        ['kai', { x: 11.4, z: 0.8 }, 'droite', { x: 13.6, z: 0.9 }],
      ]) {
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
        const name = `${nom}-${mode}-${w}`;
        writeFileSync(join(DIR, `${name}.png`), buf);
        shots[name] = dataUrl(buf);
      }
      if (mode === 'apres' && w === 1280) {
        report.targets = await p.evaluate((ids) => Object.fromEntries(ids.map((id) => [id, window.__lqvVille.targets(id)])), DOCKERS);
      }
      await p.context().close();
    }
  }
  const ap = report.vues['apres-1280'];
  const vu = (k) => JSON.stringify(ap).includes(k);
  check(vu('pnj-docker') && vu('braise'), 'feuilles pnj-docker et braise admises en QA (rapport des feuilles externes)');
  check(report.console.filter((m) => /error/i.test(m.type ?? m)).length === 0, `console sans erreur (${report.console.length} messages)`);

  // B : recoloration de la feuille du gabarit docker aux couleurs de chaque docker
  const pg = await (await browser.newContext()).newPage();
  await pg.setContent('<!doctype html><html><body></body></html>');
  const recol = await pg.evaluate(async ({ url, targets }) => {
    const img = new Image(); img.src = url; await img.decode();
    const W = img.width / 5; const H = img.height / 3; // une case (face, repos)
    const LV = [64, 128, 191, 255]; const STEPS = ['deep', 'shade', 'base', 'hi'];
    const MASK = { peau: [1, 0, 0], cheveux: [1, 1, 0], tenue: [1, 0, 1], chemise: [0, 1, 1] };
    const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
    const ids = Object.keys(targets);
    const c = new OffscreenCanvas(W * ids.length, H); const g = c.getContext('2d', { willReadFrequently: true });
    g.imageSmoothingEnabled = false;
    ids.forEach((id, k) => {
      g.drawImage(img, 0, 0, W, H, k * W, 0, W, H);
      const d = g.getImageData(k * W, 0, W, H);
      for (let i = 0; i < d.data.length; i += 4) {
        if (!d.data[i + 3]) continue;
        for (const [slot, m] of Object.entries(MASK)) {
          const l = LV.findIndex((v) => m.every((mm, j) => d.data[i + j] === mm * v));
          if (l >= 0 && targets[id][slot]) { const t = hex(targets[id][slot][STEPS[l]]); d.data[i] = t[0]; d.data[i + 1] = t[1]; d.data[i + 2] = t[2]; break; }
        }
      }
      g.putImageData(d, k * W, 0);
    });
    const blob = await c.convertToBlob({ type: 'image/png' });
    return await new Promise((r) => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(blob); });
  }, { url: dataUrl(readFileSync('public/sprites/pnj-docker.png')), targets: report.targets });
  writeFileSync(join(DIR, 'dockers-recolores.png'), fromUrl(recol));

  // planche : A (1280 puis 1920 : avant | après, docker puis Kaï) et B
  const planche = await pg.evaluate(async ({ shots, recol }) => {
    const load = async (s) => { const i = new Image(); i.src = s; await i.decode(); return i; };
    const rows = [];
    for (const w of [1280, 1920]) for (const nom of ['docker', 'kai']) rows.push([await load(shots[`${nom}-avant-${w}`]), await load(shots[`${nom}-apres-${w}`]), `${nom === 'kai' ? 'Kaï' : 'docker 1'}, ${w === 1280 ? '1280 × 720' : '1920 × 1080'}`]);
    const rc = await load(recol);
    const pad = 16; const top = 40; const lab = 22; const RS = 2; const S = 2;
    const width = Math.max(...rows.map(([a, b]) => S * (a.width + b.width) + 3 * pad), rc.width * RS + 2 * pad);
    const height = top + rows.reduce((s, [a, b]) => s + S * Math.max(a.height, b.height) + lab + pad, 0) + lab + rc.height * RS + 2 * pad;
    const c = new OffscreenCanvas(width, height); const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    x.fillStyle = '#20232c'; x.fillRect(0, 0, width, height);
    x.fillStyle = '#e8dcc0'; x.font = 'bold 18px system-ui';
    x.fillText('Porte des feuilles des PNJ : avant (dessin par code) | après (feuilles en pixel art, non approuvées, QA seulement) ; vues du jeu ×2', pad, 26);
    let y = top; x.font = '15px system-ui';
    for (const [a, b, t] of rows) {
      x.fillStyle = '#c8bfa8'; x.fillText(t, pad, y + 15); y += lab;
      x.drawImage(a, pad, y, S * a.width, S * a.height); x.drawImage(b, 2 * pad + S * a.width, y, S * b.width, S * b.height); y += S * Math.max(a.height, b.height) + pad;
    }
    x.fillStyle = '#c8bfa8'; x.fillText('Gabarit docker recoloré par graine (docker 1, 9, 12, 61, 63, 71, 73), même table que le nuanceur ; ×2', pad, y + 15); y += lab;
    x.drawImage(rc, pad, y, rc.width * RS, rc.height * RS);
    const blob = await c.convertToBlob({ type: 'image/png' });
    return await new Promise((r) => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(blob); });
  }, { shots, recol });
  writeFileSync(join(DIR, 'planche-pnj-porte.png'), fromUrl(planche));
  console.log(`planche : ${join(DIR, 'planche-pnj-porte.png')}`);
} finally {
  await browser?.close();
  srv.stop();
}
mkdirSync('artifacts/qa/m09/pnj', { recursive: true });
writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);
process.exit(report.checks.every((c) => c.startsWith('OK')) ? 0 : 1);
