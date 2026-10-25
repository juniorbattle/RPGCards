// M09, reprise du 2026-10-25 — suite des feuilles des PNJ de la ville, après la porte (`tools/m09-lot-pnj-porte.mjs`).
// Ordre du responsable (passe 127) : « Oui : génère les 10 autres feuilles des PNJ (gabarits marchande, commis, joueuse ;
// Maëlle, Sélène, Orin ; les quatre chefs), traite-les et pose-les. » Une image par feuille (12 sur 16 après ce lot ; les
// 4 restantes servent à régénérer une feuille qui ne tient pas au contrôle). Même contrat que la porte :
//   gabarits : peau, cheveux, tenue, chemise en tons clés (rouge, jaune, magenta, cyan), fond bleu pur ;
//   rivaux et chefs : leurs couleurs propres, fond cyan (Sélène, dont la chemise est bleu ciel : fond magenta).
// Entrées : notre atlas dessiné par code du personnage (exporté du build par le laboratoire) et la feuille du joueur
// approuvée (`public/sprites/player.png`), référence de style, d'échelle et de proportions ; nos images seulement.
// Retour du responsable sur la porte (passe 126) : aucun contour clair, un trait sombre tout autour de la silhouette.
// Usage : npm run build && node tools/m09-lot-pnj-suite.mjs <spécification.json>
//         puis node tools/m09-generer-images.mjs <spécification.json> --only <nom> (une image à la fois)
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { launch, startPreview } from './browser.mjs';

export const LOT = '2026-10-25-pnj-suite';
const main = dirname(resolve(execSync('git rev-parse --git-common-dir').toString().trim()));
const AG = join(main, 'art-gen', LOT).replace(/\\/g, '/');
const PLAYER = resolve('public/sprites/player.png').replace(/\\/g, '/');
const CLES = ['peau', 'cheveux', 'tenue', 'chemise'];
const FOND = { bleu: ['#0000ff', 'blue (#0000FF)'], cyan: ['#00ffff', 'cyan (#00FFFF)'], magenta: ['#ff00ff', 'magenta (#FF00FF)'] };

/** Les dix feuilles : identifiant du manifeste, atlas d'entrée, fond, gabarit (tons clés) ou couleurs propres, portrait. */
export const SUITE = [
  { id: 'pnj-marchande', atlas: 'pnj-marchande-21', bg: 'bleu', cles: true, qui: 'a market trader of the city halls, a background character',
    corps: 'an adult woman, warm and lively; hair tied up in a bun; a long coat reaching below the knees with a knitted shawl crossed over the chest, a blouse, dark trousers, sturdy boots; no hat, no bag, nothing in the hands',
    roles: 'skin (face, ears, neck, hands) in shades of pure red only (from #400000 to #FF0000); hair and eyebrows in shades of pure yellow only (from #404000 to #FFFF00); the long coat in shades of pure magenta only (from #400040 to #FF00FF); the blouse in shades of pure cyan only (from #004040 to #00FFFF). Everything else in dark, desaturated natural greys and browns: the shawl dark grey-brown, trousers dark grey, boots dark grey-brown, eyes very dark brown with a white catchlight, mouth dark' },
  { id: 'pnj-commis', atlas: 'pnj-commis-17', bg: 'bleu', cles: true, qui: 'a clerk of the city, a background character',
    corps: 'a young man, slender and friendly; neat short hair with a side parting; a short jacket with lapels, a collared shirt, dark trousers, shoes; no hat, no bag, nothing in the hands',
    roles: 'skin (face, ears, neck, hands) in shades of pure red only (from #400000 to #FF0000); hair and eyebrows in shades of pure yellow only (from #404000 to #FFFF00); the jacket in shades of pure magenta only (from #400040 to #FF00FF); the shirt in shades of pure cyan only (from #004040 to #00FFFF). Everything else in dark, desaturated natural greys and browns: trousers dark grey, shoes and belt dark grey-brown, eyes very dark brown with a white catchlight, mouth dark' },
  { id: 'pnj-joueuse', atlas: 'pnj-joueuse-29', bg: 'bleu', cles: true, qui: 'a card player, a regular of the gambling den, a background character',
    corps: 'an adult woman, confident and sharp; chin-length bob hair; a long coat reaching below the knees, a collared shirt, dark trousers, boots; no hat, no bag, nothing in the hands',
    roles: 'skin (face, ears, neck, hands) in shades of pure red only (from #400000 to #FF0000); hair and eyebrows in shades of pure yellow only (from #404000 to #FFFF00); the long coat in shades of pure magenta only (from #400040 to #FF00FF); the shirt in shades of pure cyan only (from #004040 to #00FFFF). Everything else in dark, desaturated natural greys and browns: trousers dark grey, boots and belt dark grey-brown, eyes very dark brown with a white catchlight, mouth dark' },
  { id: 'ronce', atlas: 'ronce', bg: 'cyan', qui: 'Maëlle, the warden of the Brambles, a rival card duellist',
    corps: 'a young woman, calm and stubborn; auburn-red hair in a ponytail under a small headscarf; green eyes; a forest-green long coat with a shawl over the shoulders, a cream shirt, dark green trousers, boots; light skin',
    roles: 'Maëlle’s colours: forest greens, auburn red, cream, dark leather; no cyan and no blue anywhere' },
  { id: 'voile', atlas: 'voile', bg: 'magenta', qui: 'Sélène, the reader of the Veil, a rival card duellist',
    corps: 'a young woman, quiet and perceptive; a silver-lavender bob with a thin silver diadem; violet eyes; a deep indigo long coat with a shawl, a pale sky-blue shirt, dark indigo trousers, boots; fair skin',
    roles: 'Sélène’s colours: deep indigo, pale sky blue, silver lavender; no magenta, no pink and no purple-red anywhere' },
  { id: 'astre', atlas: 'astre', bg: 'cyan', qui: 'Orin, the surveyor of the Stars, a rival card duellist',
    corps: 'a young man, curious and composed; dark brown skin; spiky very dark navy hair with blue highlights; golden eyes; a long olive-bronze coat with lapels and gold trims, a pale gold shirt, dark trousers, boots',
    roles: 'Orin’s colours: olive bronze, gold, pale gold, dark navy; no cyan anywhere' },
  { id: 'chef-cendre', atlas: 'chef-cendre', bg: 'cyan', qui: 'Bran, the First Fire, head of the Ash family',
    corps: 'an imposing older man, broad and heavy; shaved head, a short grey beard; amber eyes; a long charcoal coat with ember-red trims, a brown shirt with braces, dark trousers, heavy boots; tanned skin',
    roles: 'Bran’s colours: charcoal, ember red, brown, grey; no cyan and no blue anywhere' },
  { id: 'chef-ronce', atlas: 'chef-ronce', bg: 'cyan', qui: 'Mother Hawthorn, the keeper of the Lantern tavern, head of the Bramble family',
    corps: 'an elderly woman, a warm and unshakeable matriarch; white hair in a bun with a small hawthorn flower; green eyes; a forest-green long coat with a shawl, a dark wine-red blouse, dark trousers, boots; light skin',
    roles: 'Mother Hawthorn’s colours: forest green, wine red, white; no cyan and no blue anywhere' },
  { id: 'chef-voile', atlas: 'chef-voile', bg: 'cyan', qui: 'Ilse, the Lady of the Veils, head of the Veil family',
    corps: 'a tall woman, elegant and mysterious; long straight very dark indigo hair; a silver brooch; grey-blue eyes; a near-black indigo long coat with a shawl, a pale silver-blue blouse, dark trousers, boots; fair skin',
    roles: 'Ilse’s colours: near-black indigo, pale silver blue, silver; no cyan anywhere' },
  { id: 'chef-astre', atlas: 'chef-astre', bg: 'cyan', qui: 'Halvard, the Cartographer, head of the Star family',
    corps: 'an older man, a calm scholar; long white hair and a white beard; blue eyes; a navy long coat with lapels, a gold shirt, dark navy trousers, boots; light skin',
    roles: 'Halvard’s colours: navy, gold, white; no cyan anywhere' },
];

const commun = [
  'Each cell is 64 art pixels wide and 96 art pixels tall; the character is about 88 art pixels tall and fills the cell height like the character of the second image (top of the head near the top of the cell, feet near the bottom). Stylised RPG proportions like the player: sturdy, about 3 heads tall; large readable hands.',
  'Exact grid of 5 columns and 3 rows of equal cells, nothing between the cells; row 1 facing the viewer, row 2 seen from the back, row 3 right profile walking to the right; column 1 standing still, columns 2 to 5 a clear four-frame walking cycle (legs alternating, arms swinging, head steady); same size in every cell, both feet fully visible and on the same baseline, figure centred.',
  'Premium illustrative pixel art exactly like the second attached image: crisp square pixels of one uniform size across the whole sheet; colour ramps of four to five tones per material; a continuous very dark (near black) outline around the whole silhouette, never a light or white outline; soft directional shading with readable fabric folds; clean pixel clusters, no dithering, no scattered noise, no anti-aliasing, no gradients, no blur. The face stays fully visible, with clearly drawn eyes, a small mouth and a hint of nose shading.',
];
const fin = (bg) => [
  `A perfectly flat, uniform pure ${bg} background with no shading, no texture, no floor and no cast shadow.`,
  'No text, no letters, no numbers, no grid lines, no labels, no watermark, no logos, no playing-card suit symbols.',
];
const prompt = (s) => [
  `The first attached image is our own code-drawn sprite sheet of ${s.qui} of a night harbour city where people duel with cards. The second attached image is the approved pixel-art sprite sheet of the player character of the same game. Redraw the character of the first image as a final sprite sheet in exactly the style, pixel size, proportions, figure height and cell layout of the second image, so that both characters stand side by side in the same scene${s.cles ? '' : ', keeping the character’s own colours from the first image'}.`,
  ...commun,
  `The character: ${s.corps}.`,
  s.cles ? `Placeholder colours for in-game recolouring, each in flat shades of one pure hue only: ${s.roles}. A dark outline separates every placeholder-coloured area from any other colour. No other red, yellow, magenta, cyan, green or blue anywhere.` : `${s.roles}.`,
  ...fin(FOND[s.bg][1]),
].join('\n\n');

mkdirSync(AG, { recursive: true });
const srv = await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4431);
let browser = null;
try {
  browser = await launch();
  const pg = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  pg.setDefaultTimeout(90000);
  await pg.goto(`${srv.base}/?ville=1&qa=1`);
  await pg.waitForFunction(() => !!window.__lqvVille, null, { timeout: 90000 });
  for (const s of SUITE) {
    const url = await pg.evaluate(async ({ id, keyed, bg }) => {
      const img = new Image(); img.src = window.__lqvVille.atlasAt(id, 1.5, keyed); await img.decode();
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const g = c.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height); g.imageSmoothingEnabled = false; g.drawImage(img, 0, 0);
      return c.toDataURL('image/png');
    }, { id: s.atlas, keyed: s.cles ? CLES : [], bg: FOND[s.bg][0] });
    writeFileSync(join(AG, `${s.id}-entree.png`), Buffer.from(url.split(',')[1], 'base64'));
    console.log(`entrée ${s.id}-entree.png (${s.atlas}${s.cles ? ', tons clés' : ''}, fond ${s.bg})`);
  }
} finally {
  await browser?.close();
  srv.stop();
}
const images = SUITE.map((s) => ({ name: `${s.id}-s1`, endpoint: 'edits', inputs: [`${AG}/${s.id}-entree.png`, PLAYER], size: '1024x1024', quality: 'high', prompt: prompt(s) }));
writeFileSync(process.argv[2], JSON.stringify({ lot: LOT, images }, null, 2));
console.log(`${images.length} images décrites`);
