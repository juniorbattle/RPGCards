// Protagoniste, types de visage (demande du responsable du 2026-10-29 : « tu peux ajouter du budget pour effectuer les types
// de visages » ; décisions dans la session : « Calques de visage », trois types : « Yeux en amande, regard vif », « Visage
// rond, grands yeux », « Visage anguleux, sourcils marqués ») — spécification du lot (passe 169) : 3 images et 1 réserve au
// plus, au-delà de la deuxième reprise de M09 (budget de plus autorisé par le responsable). D'abord l'essai (V1), pour
// vérifier que le calque tombe juste sur les quatre feuilles ; puis V2 et V3.
//   V1 `visage-amande`   : la silhouette A, même personnage, mêmes cheveux, même tenue ; seul le visage change.
//   V2 `visage-rond`     : idem.
//   V3 `visage-anguleux` : idem.
//   R  `visage-<type>-r` : UNE réserve en tout.
// Seule entrée : notre feuille A approuvée. Le visage (yeux, sourcils, nez, bouche) est ensuite extrait par script et posé
// sur les quatre feuilles du protagoniste (`tools/m09-protagoniste-visages.ts`).
// Aucune image n'est produite par ce script ; générer image par image (`--only <nom>`).
// Usage : node tools/m09-lot-visages.mjs <spécification.json>
import { writeFileSync } from 'node:fs';

const commun = [
  'Keep everything else exactly as in the attached sheet: the same grid of 5 columns and 3 rows of equal cells (row 1 facing the viewer, row 2 seen from the back, row 3 right profile walking to the right; column 1 standing still, columns 2 to 5 the walking cycle), the same poses in every cell, the same size and position of the head in every cell, the same silver-white bob haircut and headband, the same outfit and colours, the same pixel size. The head and the face stay at exactly the same place in each cell as in the attached sheet.',
  'Each cell is 64 art pixels wide and 96 art pixels tall; the character is about 90 art pixels tall; same sturdy RPG proportions, about 3 heads tall; both eyes drawn identically (mirrored) in the front views; the face fully visible, the scarf below the chin.',
  'Premium illustrative pixel art exactly in the style of the attached sheet: crisp square pixels of one uniform size across the whole sheet; selective dark outlines; clean pixel clusters, no dithering, no noise, no anti-aliasing, no gradients, no blur.',
  'Colours exactly as in the attached sheet: coat and lowered hood in flat shades of pure magenta only, headband and scarf in flat shades of pure green only; silver-white hair in light neutral greys; natural light skin; blue eyes with a white catchlight; no other magenta or green anywhere. A perfectly flat, uniform pure cyan (#00FFFF) background with no shading, no floor and no cast shadow. No text, no letters, no numbers, no grid lines, no labels, no watermark, no logos, no playing-card suit symbols.',
];
const visage = (d) => [`The attached image is our own approved pixel-art sprite sheet of the player character, a young card duellist of a night harbour city. Redraw the same sheet with the same character; only the FACE changes: ${d}`, ...commun].join('\n\n');
const V = {
  'visage-amande': visage('almond-shaped eyes, narrower and slightly longer, with a lively, alert look; straight short eyebrows; a small confident mouth; the same face outline.'),
  'visage-rond': visage('a rounder, softer face with fuller cheeks; large round eyes with big irises and two catchlights; gently arched eyebrows; a small rounded mouth.'),
  'visage-anguleux': visage('a more angular face with a defined jaw and cheekbones; thick, strongly marked straight eyebrows; slightly narrower eyes with a serious, determined look; a firm straight mouth.'),
};
const q = { endpoint: 'edits', size: '1024x1024', quality: 'high', inputs: ['public/sprites/player.png'] };
const images = [
  ...Object.entries(V).map(([name, prompt]) => ({ name, prompt, ...q })),
  ...Object.entries(V).map(([name, prompt]) => ({ name: `${name}-r`, prompt, ...q, reserve: true })),
];
writeFileSync(process.argv[2], JSON.stringify({ lot: '2026-10-29-visages', images }, null, 2));
console.log(`${images.length} images décrites (trois réserves, une seule utilisable) ; générer une par une : \`--only <nom>\``);
