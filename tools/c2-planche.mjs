// M08 C2 — planche de la porte de validation : salle de jeu de cartes et rue côte à côte, assemblées à partir des
// captures de `node tools/c2-lieux.mjs planche` (même dossier). Aucune capture nouvelle : mise en page seulement.
// Usage : [CHROMIUM_PATH=…] node tools/c2-planche.mjs [dossier=screenshots/qa/m08/c2]
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch } from './browser.mjs';

const DIR = process.argv[2] ?? 'screenshots/qa/m08/c2';
const VENUES = [['salle', 'Salle de jeu de cartes — le Cercle (décor historique)'], ['rue', 'Rue — le Quai, la nuit (nouveau lieu)']];
const ROWS = [
  ['complet-vueA-1280x720', 'Duel, vue A, 1280×720'],
  ['scene-vueA-1280x720', 'Scène 3D seule, vue A'],
  ['complet-vueB-1280x720', 'Duel, vue B (plateau, à la demande)'],
  ['preparation-1280x720', 'Écran Préparation (la scène reste le décor)'],
  ['accueil-1280x720', 'Accueil'],
  ['scene-direct-1280x720', 'Repli du post-traitement, niveau « direct »'],
];
const W = 960;
const H = 540;
const PAD = 24;
const HEAD = 70;
const LABEL = 30;

const browser = await launch();
const page = await (await browser.newContext()).newPage();
const img = (name) => `data:image/png;base64,${readFileSync(join(DIR, `${name}.png`)).toString('base64')}`;
const cells = ROWS.map(([key, label]) => ({ label, srcs: VENUES.map(([v]) => img(`${v}-${key}`)) }));
const png = await page.evaluate(async ({ cells, venues, W, H, PAD, HEAD, LABEL }) => {
  const cw = PAD + venues.length * (W + PAD);
  const ch = HEAD + cells.length * (LABEL + H + PAD);
  const c = document.createElement('canvas');
  c.width = cw; c.height = ch;
  const x = c.getContext('2d');
  x.fillStyle = '#0c0a0d'; x.fillRect(0, 0, cw, ch);
  x.fillStyle = '#f2e4c4'; x.font = '600 26px Georgia, serif';
  venues.forEach(([, title], i) => x.fillText(title, PAD + i * (W + PAD), 44));
  for (const [r, cell] of cells.entries()) {
    const y = HEAD + r * (LABEL + H + PAD);
    x.fillStyle = '#c9b48a'; x.font = '18px system-ui, sans-serif';
    x.fillText(cell.label, PAD, y + 21);
    for (const [i, src] of cell.srcs.entries()) {
      const im = new Image(); im.src = src; await im.decode();
      x.drawImage(im, PAD + i * (W + PAD), y + LABEL, W, H);
    }
  }
  return c.toDataURL('image/png');
}, { cells, venues: VENUES, W, H, PAD, HEAD, LABEL });
await browser.close();
const out = join(DIR, 'planche-c2-salle-rue.png');
writeFileSync(out, Buffer.from(png.split(',')[1], 'base64'));
console.log(`planche : ${out}`);
