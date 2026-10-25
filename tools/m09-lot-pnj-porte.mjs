// M09, reprise du 2026-10-25 — porte des feuilles des PNJ de la ville. Décision du responsable (passe 125) : « 16, avec une
// porte » (12 feuilles, une image chacune, et 4 images pour régénérer une feuille ratée ; d'abord 2 feuilles posées in situ
// sur une planche qu'il regarde, puis les 10 autres). Cette porte : 2 images, plus une réserve chacune (dans les 4) :
//   P1 `pnj-docker-p1` : la feuille du gabarit docker (contrat v3, cases de 64 × 96 px d'art), recolorée par graine dans le
//                       nuanceur : peau, cheveux, tenue et chemise peintes en tons clés (rouge, jaune, magenta, cyan), fond
//                       bleu pur (le cyan est pris par la chemise) ;
//   P2 `braise-p2`     : la feuille de Kaï (couleurs propres, aucune recoloration), fond cyan comme le joueur ;
//   réserves `pnj-docker-p1b`, `braise-p2b` : même prompt, seulement si la première ne tient pas au contrôle.
// Entrées (nos propres images seulement, AGENTS « Images de la ville ») : l'atlas du personnage dessiné par code (le docker
// en tons clés), exporté du build par le laboratoire, et la feuille du joueur approuvée (`public/sprites/player.png`) comme
// référence de style, d'échelle et de proportions.
// Usage : npm run build && node tools/m09-lot-pnj-porte.mjs <spécification.json>
//         puis node tools/m09-generer-images.mjs <spécification.json> --only <nom> (une image à la fois)
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { launch, startPreview } from './browser.mjs';

export const LOT = '2026-10-25-pnj-porte';
const main = dirname(resolve(execSync('git rev-parse --git-common-dir').toString().trim()));
const AG = join(main, 'art-gen', LOT).replace(/\\/g, '/');
const PLAYER = resolve('public/sprites/player.png').replace(/\\/g, '/');
mkdirSync(AG, { recursive: true });

// export des atlas dessinés par code, posés sur leur fond uni (échelle 1,5 : 720 × 720)
const srv = await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4431);
let browser = null;
try {
  browser = await launch();
  const pg = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  pg.setDefaultTimeout(90000);
  await pg.goto(`${srv.base}/?ville=1&qa=1`);
  await pg.waitForFunction(() => !!window.__lqvVille, null, { timeout: 90000 });
  for (const [id, keyed, bg, file] of [
    ['pnj-docker-1', ['peau', 'cheveux', 'tenue', 'chemise'], '#0000ff', 'pnj-docker-entree.png'],
    ['braise', [], '#00ffff', 'braise-entree.png'],
  ]) {
    const url = await pg.evaluate(async ({ id, keyed, bg }) => {
      const img = new Image(); img.src = window.__lqvVille.atlasAt(id, 1.5, keyed); await img.decode();
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const g = c.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height); g.imageSmoothingEnabled = false; g.drawImage(img, 0, 0);
      return c.toDataURL('image/png');
    }, { id, keyed, bg });
    writeFileSync(join(AG, file), Buffer.from(url.split(',')[1], 'base64'));
    console.log(`entrée ${file} (${id}${keyed.length ? `, tons clés ${keyed.join(', ')}` : ''})`);
  }
} finally {
  await browser?.close();
  srv.stop();
}

const commun = (cellNote) => [
  'Each cell is 64 art pixels wide and 96 art pixels tall; the character is about 88 art pixels tall. ' + cellNote,
  'Exact grid of 5 columns and 3 rows of equal cells, nothing between the cells; row 1 facing the viewer, row 2 seen from the back, row 3 right profile walking to the right; column 1 standing still, columns 2 to 5 a clear four-frame walking cycle (legs alternating, arms swinging, head steady); same size in every cell, both boots fully visible and both feet on the same baseline, figure centred.',
  'Premium illustrative pixel art exactly like the second attached image: crisp square pixels of one uniform size across the whole sheet; colour ramps of four to five tones per material; selective dark outlines; soft directional shading with readable fabric folds; clean pixel clusters, no dithering, no scattered noise, no anti-aliasing, no gradients, no blur. The face stays fully visible, with clearly drawn eyes, a small mouth and a hint of nose shading.',
];
const fin = (bg) => [
  `A perfectly flat, uniform pure ${bg} background with no shading, no texture, no floor and no cast shadow.`,
  'No text, no letters, no numbers, no grid lines, no labels, no watermark, no logos, no playing-card suit symbols.',
];
const promptDocker = [
  'The first attached image is our own code-drawn sprite sheet of a dock worker, a background character of a night harbour city where people duel with cards. The second attached image is the approved pixel-art sprite sheet of the player character of the same game. Redraw the dock worker as a final sprite sheet in exactly the style, pixel size, proportions, figure height and cell layout of the second image, so that both characters stand side by side in the same scene.',
  ...commun('Stylised RPG proportions like the player: sturdy, about 3 heads tall, but broader in the shoulders and heavier in build than the player; large readable hands.'),
  'The dock worker: an adult man, friendly and tough; short cropped hair; a short work jacket with the sleeves rolled up to the elbows, a collarless shirt, braces (suspenders) over the shirt, sturdy work trousers, heavy boots; no hat, no bag, no tools in the hands.',
  'Placeholder colours for in-game recolouring, each in flat shades of one pure hue only: skin (face, ears, neck, hands, forearms) in shades of pure red only (from #400000 to #FF0000); hair and eyebrows in shades of pure yellow only (from #404000 to #FFFF00); the jacket in shades of pure magenta only (from #400040 to #FF00FF); the shirt in shades of pure cyan only (from #004040 to #00FFFF). Everything else in dark, desaturated natural greys and browns: trousers dark grey, braces, belt and boots dark grey-brown, eyes very dark brown with a white catchlight, mouth dark. A dark outline separates every placeholder-coloured area from any other colour. No other red, yellow, magenta, cyan, green or blue anywhere.',
  ...fin('blue (#0000FF)'),
].join('\n\n');
const promptKai = [
  'The first attached image is our own code-drawn sprite sheet of Kaï, a rival card duellist of a night harbour city, nicknamed the Ember of the quay. The second attached image is the approved pixel-art sprite sheet of the player character of the same game. Redraw Kaï as a final sprite sheet in exactly the style, pixel size, proportions, figure height and cell layout of the second image, so that both characters stand side by side in the same scene, keeping Kaï’s own colours from the first image.',
  ...commun('Stylised RPG proportions like the player: sturdy, about 3 heads tall, lean and confident; large readable hands.'),
  'Kaï: a young man with a cocky, confident stance; spiky black hair with glowing ember-red tips; an ember-red cloth headband knotted at the back of the head; amber eyes; a short dark ember-red jacket open over a dark charcoal shirt, dark trousers, dark boots; warm light skin. Kaï’s colours: ember reds and oranges, charcoal and black, one small warm amber accent; no magenta, no green, no cyan and no blue anywhere.',
  ...fin('cyan (#00FFFF)'),
].join('\n\n');
const images = [
  { name: 'pnj-docker-p1', endpoint: 'edits', inputs: [`${AG}/pnj-docker-entree.png`, PLAYER], size: '1024x1024', quality: 'high', prompt: promptDocker },
  { name: 'braise-p2', endpoint: 'edits', inputs: [`${AG}/braise-entree.png`, PLAYER], size: '1024x1024', quality: 'high', prompt: promptKai },
  { name: 'pnj-docker-p1b', endpoint: 'edits', inputs: [`${AG}/pnj-docker-entree.png`, PLAYER], size: '1024x1024', quality: 'high', prompt: promptDocker, reserve: true },
  { name: 'braise-p2b', endpoint: 'edits', inputs: [`${AG}/braise-entree.png`, PLAYER], size: '1024x1024', quality: 'high', prompt: promptKai, reserve: true },
];
writeFileSync(process.argv[2], JSON.stringify({ lot: LOT, images }, null, 2));
console.log(`${images.length} images décrites (2 de la porte, 2 réserves : \`--only <nom>\`, seulement si la première ne tient pas)`);
