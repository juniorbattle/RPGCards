// M08 C2 — planche des lieux côte à côte, assemblée à partir des captures de `node tools/c2-lieux.mjs planche` (même
// dossier). Aucune capture nouvelle : mise en page seulement. Une colonne par lieu (`LQV_VENUES`, défaut : les quatre).
// Usage : [CHROMIUM_PATH=…] [LQV_VENUES=salle,rue] node tools/c2-planche.mjs [dossier=screenshots/qa/m08/c2] [sortie]
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch } from './browser.mjs';

const DIR = process.argv[2] ?? 'screenshots/qa/m08/c2';
const TITLES = {
  salle: 'Salle de jeu de cartes — le Cercle',
  rue: 'Rue — le Quai, la nuit',
  bar: 'Bar — le Fanal, taverne du port',
  arene: 'Arène — le grand duel en public',
};
const VENUES = (process.env.LQV_VENUES ?? 'salle,rue,bar,arene').split(',');
const OUT = process.argv[3] ?? join(DIR, VENUES.length === 4 ? 'planche-c2-quatre-lieux.png' : `planche-c2-${VENUES.join('-')}.png`);
const ROWS = [
  ['complet-vueA-1280x720', 'Duel, vue A, 1280×720'],
  ['complet-vueA-1920x1080', 'Duel, vue A, 1920×1080'],
  ['scene-vueA-1280x720', 'Scène 3D seule, vue A'],
  ['complet-vueB-1280x720', 'Duel, vue B (plateau, à la demande)'],
  ['preparation-1280x720', 'Écran Préparation (la scène reste le décor)'],
];
const W = VENUES.length > 2 ? 640 : 960;
const H = (W * 9) / 16;
const PAD = 20;
const HEAD = 64;
const LABEL = 28;

const browser = await launch();
const page = await (await browser.newContext()).newPage();
const img = (name) => { const f = join(DIR, `${name}.png`); return existsSync(f) ? `data:image/png;base64,${readFileSync(f).toString('base64')}` : null; };
const cells = ROWS.map(([key, label]) => ({ label, srcs: VENUES.map((v) => img(`${v}-${key}`)) })).filter((c) => c.srcs.some(Boolean));
const png = await page.evaluate(async ({ cells, titles, W, H, PAD, HEAD, LABEL }) => {
  const cw = PAD + titles.length * (W + PAD);
  const ch = HEAD + cells.length * (LABEL + H + PAD);
  const c = document.createElement('canvas');
  c.width = cw; c.height = ch;
  const x = c.getContext('2d');
  x.fillStyle = '#0c0a0d'; x.fillRect(0, 0, cw, ch);
  x.fillStyle = '#f2e4c4'; x.font = `600 ${W > 700 ? 26 : 21}px Georgia, serif`;
  titles.forEach((t, i) => x.fillText(t, PAD + i * (W + PAD), 42));
  for (const [r, cell] of cells.entries()) {
    const y = HEAD + r * (LABEL + H + PAD);
    x.fillStyle = '#c9b48a'; x.font = '17px system-ui, sans-serif';
    x.fillText(cell.label, PAD, y + 20);
    for (const [i, src] of cell.srcs.entries()) {
      if (!src) continue;
      const im = new Image(); im.src = src; await im.decode();
      x.drawImage(im, PAD + i * (W + PAD), y + LABEL, W, H);
    }
  }
  return c.toDataURL('image/png');
}, { cells, titles: VENUES.map((v) => TITLES[v] ?? v), W, H, PAD, HEAD, LABEL });
await browser.close();
writeFileSync(OUT, Buffer.from(png.split(',')[1], 'base64'));
console.log(`planche : ${OUT}`);
