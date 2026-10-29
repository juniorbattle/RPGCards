// Marche du protagoniste filmée au navigateur (retour du responsable du 2026-10-29 : sa marche de côté « demande encore du
// peaufinage ») : horloge de la page tenue par Playwright (images à pas fixe, reproductibles), le joueur marche dans les
// quatre directions ; pour chacune, une bande d'images recadrées sur lui et la suite des temps de la feuille affichés.
// Usage : npm run build && node tools/marche-joueur.mjs <sortie (dossier)> [îlot, défaut quai] [lent]
//   (ou LQV_BASE=http://localhost:5173 pour filmer le serveur de dev)
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch, startPreview, watchConsole } from './browser.mjs';

const OUT = process.argv[2] ?? 'artifacts/qa/marche-joueur';
const ILOT = process.argv[3] ?? 'quai';
const LENT = process.argv[4] === 'lent';
const FPS = 30;
const N = 24;
mkdirSync(OUT, { recursive: true });
const server = process.env.LQV_BASE ? { base: process.env.LQV_BASE, stop() {} } : await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4392);
const browser = await launch();
const erreurs = [];
const rapport = { ilot: ILOT, fps: FPS, lent: LENT, directions: {} };
try {
  const p = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  watchConsole(p, erreurs);
  await p.clock.install();
  await p.goto(`${server.base}/?ville=1&qa=1&profondeur=1&ilot=${ILOT}`);
  for (let i = 0; i < 600; i++) {
    await p.clock.runFor(100);
    if (await p.evaluate(() => !!window.__lqvVille && window.__lqvVille.town.stats().frames > 3)) break;
  }
  await p.clock.runFor(1500);
  const dirs = [['droite', 'ArrowRight'], ['gauche', 'ArrowLeft'], ['dos', 'ArrowUp'], ['face', 'ArrowDown']];
  for (const [nom, key] of dirs) {
    if (LENT) await p.keyboard.down('ShiftLeft');
    await p.keyboard.down(key);
    await p.clock.runFor(400);
    const images = [];
    const etats = [];
    for (let i = 0; i < N; i++) {
      await p.clock.runFor(1000 / FPS);
      const e = await p.evaluate(() => {
        const t = window.__lqvVille.town;
        const w = t.walker();
        const h = t.walkerH();
        const pied = t.project({ x: w.pos.x, y: 0, z: w.pos.z });
        const tete = t.project({ x: w.pos.x, y: h, z: w.pos.z });
        return { x: w.pos.x, z: w.pos.z, phase: w.phase, facing: w.facing, moving: w.moving, pied, tete };
      });
      const hpx = Math.max(40, e.pied.y - e.tete.y);
      const clip = { x: Math.round(e.pied.x - hpx * 0.6), y: Math.round(e.tete.y - hpx * 0.15), width: Math.round(hpx * 1.2), height: Math.round(hpx * 1.25) };
      images.push(await p.screenshot({ clip }));
      etats.push({ x: +e.x.toFixed(3), phase: +e.phase.toFixed(3), facing: e.facing, moving: e.moving, temps: Math.floor(e.phase * 4) % 4 });
    }
    await p.keyboard.up(key);
    if (LENT) await p.keyboard.up('ShiftLeft');
    await p.clock.runFor(600);
    rapport.directions[nom] = etats;
    // bande : les images côte à côte, dans la page (canvas)
    const bande = await p.evaluate(async (srcs) => {
      const ims = await Promise.all(srcs.map(async (s) => { const i = new Image(); i.src = s; await i.decode(); return i; }));
      const w = ims[0].width; const h = ims[0].height;
      const c = new OffscreenCanvas(w * ims.length, h);
      const g = c.getContext('2d');
      ims.forEach((im, k) => g.drawImage(im, k * w, 0));
      const blob = await c.convertToBlob({ type: 'image/png' });
      return await new Promise((r) => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(blob); });
    }, images.map((b) => `data:image/png;base64,${b.toString('base64')}`));
    writeFileSync(join(OUT, `bande-${nom}.png`), Buffer.from(bande.split(',')[1], 'base64'));
    images.forEach((b, k) => { mkdirSync(join(OUT, nom), { recursive: true }); writeFileSync(join(OUT, nom, `${String(k).padStart(2, '0')}.png`), b); });
  }
} finally {
  await browser.close();
  server.stop();
}
rapport.console = erreurs.filter((c) => c.startsWith('error') || c.startsWith('pageerror'));
writeFileSync(join(OUT, 'rapport.json'), `${JSON.stringify(rapport, null, 1)}\n`);
for (const [nom, e] of Object.entries(rapport.directions)) console.log(`${nom} : temps ${e.map((x) => (x.moving ? x.temps : '-')).join('')} ; x ${e[0].x} → ${e.at(-1).x}`);
console.log(`console : ${rapport.console.length ? rapport.console.slice(0, 3).join(' | ') : 'vide'}`);
process.exit(rapport.console.length ? 1 : 0);
