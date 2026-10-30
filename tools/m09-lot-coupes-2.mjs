// Protagoniste, coupes de plus, deuxième lot (passe 172 ; demande du responsable : « tu peux proposer d'autres variantes de
// coupes cheveux » ; choix dans la session : A « Chignon bas » et « Courte effilée », B « Côtés rasés, dessus en brosse » et
// « Bouclée courte », chacune avec les trois visages : « Oui, 4 images par coupe ») — 16 images (4 coupes × 4 visages), plus
// 1 réserve par lot au plus. D'abord les quatre coupes (visage d'origine), depuis la feuille approuvée de leur silhouette ;
// puis les visages de chacune (`tools/m09-lot-visages.mjs`, depuis la feuille de la coupe posée).
//   A3 `player-a3` : silhouette A, chignon bas        A4 `player-a4` : silhouette A, courte effilée
//   B3 `player-b3` : silhouette B, côtés rasés         B4 `player-b4` : silhouette B, bouclée courte
// Un lot par silhouette (`2026-10-29-coupes2-a`, `-b`) pour générer en parallèle sans mêler les journaux de provenance.
// Aucune image n'est produite par ce script ; générer image par image (`--only <nom>`).
// Usage : node tools/m09-lot-coupes-2.mjs <spécification.json> <a|b>
import { writeFileSync } from 'node:fs';

const S = process.argv[3];
if (S !== 'a' && S !== 'b') throw new Error('silhouette a ou b');
const commun = [
  'Exact grid of 5 columns and 3 rows of equal cells, nothing between the cells; row 1 facing the viewer, row 2 seen from the back, row 3 right profile walking to the right; column 1 standing still, columns 2 to 5 a four-frame walking cycle with real passing poses (contact, passing, contact with the other leg, passing); same size in every cell, both boots fully visible, both feet on the same baseline, figure centred, head steady.',
  'Same cell size, same sturdy RPG proportions (about 3 heads tall) and the same character height as the attached sheet; both eyes drawn identically in the front views; the face fully visible, the scarf below the chin.',
  'Premium illustrative pixel art exactly in the style of the attached sheet: crisp square pixels of one uniform size across the whole sheet; selective dark outlines with a continuous dark line around the whole silhouette; clean pixel clusters, no dithering, no noise, no anti-aliasing, no gradients, no blur.',
  'Colours exactly as in the attached sheet: coat and lowered hood in flat shades of pure magenta only, headband and scarf in flat shades of pure green only; silver-white hair in light neutral greys; natural light skin; blue eyes with a white catchlight; dark blue trousers, brown leather; no other magenta or green anywhere. A perfectly flat, uniform pure cyan (#00FFFF) background with no shading, no floor and no cast shadow. No text, no letters, no numbers, no grid lines, no labels, no watermark, no logos, no playing-card suit symbols.',
];
const coupe = (d) => [`The attached image is our own approved pixel-art sprite sheet of the player character, a young card duellist of a night harbour city. Redraw the same character on a new sprite sheet with exactly the same layout, the same face, the same outfit and the same overall silhouette. Only the hair changes: ${d}`, ...commun].join('\n\n');
const C = S === 'a'
  ? {
    'player-a3': coupe('the silver-white hair is gathered in a low bun at the nape, with a side-swept fringe under the headband and two short locks in front of the ears; the bun is clearly visible in the back and profile views; nothing falls on the shoulders.'),
    'player-a4': coupe('the silver-white hair is cut short and layered, the nape uncovered, a long side-swept lock falling over the forehead under the headband; nothing reaches the jaw.'),
  }
  : {
    'player-b3': coupe('the silver-white hair is shaved very short on the sides and at the back, the top left longer and brushed upward like a short brush; the shaved sides clearly visible in the front, back and profile views.'),
    'player-b4': coupe('the silver-white hair is short and tightly curled, with a round volume of small curls around the head, curls peeking under the headband; nothing reaches the jaw.'),
  };
const q = { endpoint: 'edits', size: '1024x1024', quality: 'high', inputs: [S === 'a' ? 'public/sprites/player.png' : 'public/sprites/player-b.png'] };
const images = [
  ...Object.entries(C).map(([name, prompt]) => ({ name, prompt, ...q })),
  ...Object.entries(C).map(([name, prompt]) => ({ name: `${name}-r`, prompt, ...q, reserve: true })),
];
writeFileSync(process.argv[2], JSON.stringify({ lot: `2026-10-29-coupes2-${S}`, images }, null, 2));
console.log(`2026-10-29-coupes2-${S} : ${images.length} images décrites (réserves comprises, une seule utilisable) ; générer une par une : \`--only <nom>\``);
