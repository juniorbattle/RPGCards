// Protagoniste, types de visage (demande du responsable du 2026-10-29 : « tu peux ajouter du budget pour effectuer les types
// de visages » ; trois types : « Yeux en amande, regard vif », « Visage rond, grands yeux », « Visage anguleux, sourcils
// marqués ») — spécification des lots (passes 169 et 170), au-delà de la deuxième reprise de M09 (budget de plus autorisé).
// Passe 169 : « Calques de visage » ; essai `visage-amande` sur la silhouette A au carré, réussi, mais le calque posé par
// script sur les autres feuilles ne tient pas. Passe 170 : décision du responsable « Feuilles complètes » : chaque visage
// redessiné par le modèle sur chacune des quatre feuilles (3 × 4 = 12, dont l'essai : 11 images, 1 réserve au plus).
// Un lot par feuille de base (seule entrée : la feuille approuvée), pour générer les quatre en parallèle sans mêler leurs
// journaux de provenance :
//   player    → `2026-10-29-visages`    : visage-amande (essai, passe 169), visage-rond, visage-anguleux
//   player-b  → `2026-10-29-visages-b`  : player-b-amande, player-b-rond, player-b-anguleux
//   player-a2 → `2026-10-29-visages-a2` : player-a2-amande, …
//   player-b2 → `2026-10-29-visages-b2` : player-b2-amande, …
// Chaque lot décrit aussi ses réserves (`-r`) ; une seule utilisable en tout. Aucune image n'est produite par ce script ;
// générer image par image (`--only <nom>`).
// Usage : node tools/m09-lot-visages.mjs <spécification.json> [feuille de base, défaut player]
import { writeFileSync } from 'node:fs';

const BASE = process.argv[3] ?? 'player';
// passe 172 : les visages des quatre coupes du deuxième lot (`tools/m09-lot-coupes-2.mjs`), depuis la feuille de la coupe
// posée (non encore approuvée)
const LOTS = { player: '2026-10-29-visages', 'player-b': '2026-10-29-visages-b', 'player-a2': '2026-10-29-visages-a2', 'player-b2': '2026-10-29-visages-b2', 'player-a3': '2026-10-29-visages-a3', 'player-a4': '2026-10-29-visages-a4', 'player-b3': '2026-10-29-visages-b3', 'player-b4': '2026-10-29-visages-b4' };
const APPROUVEE = ['player', 'player-b', 'player-a2', 'player-b2'].includes(BASE);
if (!LOTS[BASE]) throw new Error(`feuille de base inconnue : ${BASE}`);
const commun = [
  'Keep everything else exactly as in the attached sheet: the same grid of 5 columns and 3 rows of equal cells (row 1 facing the viewer, row 2 seen from the back, row 3 right profile walking to the right; column 1 standing still, columns 2 to 5 the walking cycle), the same poses in every cell, the same size and position of the head in every cell, the same silver-white haircut and headband, the same outfit and colours, the same pixel size. The head and the face stay at exactly the same place in each cell as in the attached sheet.',
  'Each cell has the same size as in the attached sheet; same sturdy RPG proportions, about 3 heads tall; both eyes drawn identically (mirrored) in the front views; the face fully visible, the scarf below the chin.',
  'Premium illustrative pixel art exactly in the style of the attached sheet: crisp square pixels of one uniform size across the whole sheet; selective dark outlines; clean pixel clusters, no dithering, no noise, no anti-aliasing, no gradients, no blur.',
  'Colours exactly as in the attached sheet: coat and lowered hood in flat shades of pure magenta only, headband and scarf in flat shades of pure green only; silver-white hair in light neutral greys; natural light skin; blue eyes with a white catchlight; no other magenta or green anywhere. A perfectly flat, uniform pure cyan (#00FFFF) background with no shading, no floor and no cast shadow. No text, no letters, no numbers, no grid lines, no labels, no watermark, no logos, no playing-card suit symbols.',
];
const visage = (d) => [`The attached image is our own ${APPROUVEE ? 'approved ' : ''}pixel-art sprite sheet of the player character, a young card duellist of a night harbour city. Redraw the same sheet with the same character; only the FACE changes: ${d}`, ...commun].join('\n\n');
const V = {
  amande: visage('almond-shaped eyes, narrower and slightly longer, with a lively, alert look; straight short eyebrows; a small confident mouth; the same face outline.'),
  rond: visage('a rounder, softer face with fuller cheeks; large round eyes with big irises and two catchlights; gently arched eyebrows; a small rounded mouth.'),
  anguleux: visage('a more angular face with a defined jaw and cheekbones; thick, strongly marked straight eyebrows; slightly narrower eyes with a serious, determined look; a firm straight mouth.'),
};
const nom = (t) => (BASE === 'player' ? `visage-${t}` : `${BASE}-${t}`);
const q = { endpoint: 'edits', size: '1024x1024', quality: 'high', inputs: [`public/sprites/${BASE}.png`] };
const images = [
  ...Object.entries(V).map(([t, prompt]) => ({ name: nom(t), prompt, ...q })),
  ...Object.entries(V).map(([t, prompt]) => ({ name: `${nom(t)}-r`, prompt, ...q, reserve: true })),
];
writeFileSync(process.argv[2], JSON.stringify({ lot: LOTS[BASE], images }, null, 2));
console.log(`${LOTS[BASE]} : ${images.length} images décrites (réserves comprises) ; générer une par une : \`--only <nom>\``);
