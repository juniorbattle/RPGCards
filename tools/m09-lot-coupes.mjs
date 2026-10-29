// Protagoniste, coupes de plus (demande du responsable du 2026-10-29 : « fait donc », après « d'autres coupes ou visages
// demanderaient de nouvelles images […] il reste 3 images sur 20 ») — spécification du lot (passe 167), les 3 dernières
// images de la deuxième reprise de M09 :
//   A2 `player-a2`       : la silhouette A, même personnage et même tenue, cheveux argentés en queue de cheval haute ;
//                          seule entrée : notre feuille A approuvée (`public/sprites/player.png`).
//   B2 `player-b2`       : la silhouette B, même personnage et même tenue, cheveux argentés mi-longs, en mèches libres
//                          jusqu'à la nuque ; seule entrée : notre feuille B approuvée (`public/sprites/player-b.png`).
//   R  `player-a2-r` ou `player-b2-r` : UNE réserve en tout, pour la feuille qui ne tiendrait pas aux contrôles.
// Peau et cheveux au naturel (cheveux argentés) : ils sont reconnus et repeints en jeu par code (`src/ville/teintes.ts`).
// Aucune image n'est produite par ce script ; générer image par image (`--only <nom>`).
// Usage : node tools/m09-lot-coupes.mjs <spécification.json>
import { writeFileSync } from 'node:fs';

const commun = [
  'Exact grid of 5 columns and 3 rows of equal cells, nothing between the cells; row 1 facing the viewer, row 2 seen from the back, row 3 right profile walking to the right; column 1 standing still, columns 2 to 5 a four-frame walking cycle; same size in every cell, both boots fully visible, both feet on the same baseline, figure centred, head steady.',
  'The profile walk (row 3, columns 2 to 5) must be a real walking cycle, frame by frame: column 2 contact: the near leg (the lighter trouser leg) forward with the heel down, the far leg (the darker trouser leg) behind on its toes, the far arm swinging forward; column 3 passing: both legs under the body, the near leg straight and supporting, the far foot lifted just beside it, arms close to the body, the body one pixel higher; column 4 contact with the OTHER leg forward: the far leg forward with the heel down, the near leg behind on its toes, the near arm swinging forward; column 5 passing: both legs under the body, the near foot lifted beside the far leg. The two contact frames must show different legs in front. Rows 1 and 2 keep alternating legs as well.',
  'Each cell is 64 art pixels wide and 96 art pixels tall; the character is about 90 art pixels tall. Same sturdy RPG proportions as the attached sheet, about 3 heads tall, big readable eyes with both eyes drawn identically, large readable hands, short sturdy legs and boots.',
  'Premium illustrative pixel art exactly in the style of the attached sheet: crisp square pixels of one uniform size across the whole sheet; colour ramps of four to five tones per material; selective dark outlines with a continuous dark line around the whole silhouette; clean pixel clusters, no dithering, no noise, no anti-aliasing, no gradients, no blur.',
  'Colours exactly as in the attached sheet: coat and lowered hood in flat shades of pure magenta only (from #400040 to #FF00FF), headband and scarf in flat shades of pure green only (from #004000 to #00FF00); silver-white hair in light neutral greys; natural light skin; dark blue trousers, brown leather satchel, belt and boots, a small amber buckle, blue eyes with a white catchlight. No other magenta or green anywhere.',
  'A perfectly flat, uniform pure cyan (#00FFFF) background with no shading, no texture, no floor and no cast shadow. No text, no letters, no numbers, no grid lines, no labels, no watermark, no logos, no playing-card suit symbols.',
];
const a2 = [
  'The attached image is our own approved pixel-art sprite sheet of the player character, a young card duellist of a night harbour city. Redraw the same character on a new sprite sheet with exactly the same layout, the same face, the same outfit and the same overall silhouette. Only the hair changes: the silver-white hair is gathered in a high ponytail tied with a small dark cord at the back of the head, with a short side-swept fringe under the headband and two short locks framing the face; the ponytail falls to the nape, clearly visible behind the head in the back and profile views and swinging slightly with the walk; nothing reaches the shoulders at the sides.',
  ...commun,
].join('\n\n');
const b2 = [
  'The attached image is our own approved pixel-art sprite sheet of the player character, a young card duellist of a night harbour city. Redraw the same character on a new sprite sheet with exactly the same layout, the same face, the same outfit and the same overall silhouette. Only the hair changes: the silver-white hair is worn longer and loose, in tousled locks falling over the ears to the nape and the jaw line, a messy fringe under the headband; clearly longer than the attached sheet, never reaching the shoulders.',
  ...commun,
].join('\n\n');
const q = { endpoint: 'edits', size: '1024x1024', quality: 'high' };
const images = [
  { name: 'player-a2', inputs: ['public/sprites/player.png'], prompt: a2, ...q },
  { name: 'player-b2', inputs: ['public/sprites/player-b.png'], prompt: b2, ...q },
  { name: 'player-a2-r', inputs: ['public/sprites/player.png'], prompt: a2, ...q, reserve: true },
  { name: 'player-b2-r', inputs: ['public/sprites/player-b.png'], prompt: b2, ...q, reserve: true },
];
writeFileSync(process.argv[2], JSON.stringify({ lot: '2026-10-29-coupes', images }, null, 2));
console.log(`${images.length} images décrites (deux réserves, une seule utilisable) ; générer une par une : \`--only <nom>\``);
