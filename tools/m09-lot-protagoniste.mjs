// Protagoniste (demande du responsable du 2026-10-29) — spécification du lot d'images (réserve de la deuxième reprise de
// M09 : 4 images, 16 sur 20 utilisées). Accord du responsable dans la session (passe 164) : « H1 + réserve » (2 images au
// plus) ; personnage personnalisable, « 4 images, couleurs par code » : peau et cheveux en tons clés (rouge, jaune),
// recolorés en jeu comme ceux des gabarits des PNJ ; la rangée de profil du protagoniste actuel (F1) non retenue.
//   H1  `player-homme`   : la version homme, feuille complète au contrat v3, redessinée depuis NOTRE feuille approuvée (seule
//                          image d'entrée) : même tenue, même structure, même silhouette générale ; cheveux courts ; peau
//                          et cheveux en tons clés ; rangée de profil en vrai cycle de marche (jambes alternées).
//   H1b `player-homme-b` : réserve de H1, seulement si H1 ne tient pas aux contrôles (grille, tons clés, visage, cycle).
// Aucune image n'est produite par ce script : il écrit la spécification lue par `tools/m09-generer-images.mjs`, à lancer
// TOUJOURS image par image (`--only <nom>`) : sans cette option, le générateur produit toutes les images de la
// spécification, réserves comprises.
// Usage : node tools/m09-lot-protagoniste.mjs <spécification.json>
import { writeFileSync } from 'node:fs';

const INPUT = 'public/sprites/player.png';
const prompt = [
  'The attached image is our own approved pixel-art sprite sheet of the player character, a young card duellist of a night harbour city. Draw the male version of this character on a new sprite sheet with exactly the same layout, the same outfit and the same overall silhouette: a young man of the same age and height. Only these differences: his hair is short, cut above the ears and at the nape, a short tousled fringe falling under the headband, nothing reaching the jaw (no bob); a slightly squarer jaw and slightly broader shoulders. Keep everything else: the cloth headband across the forehead, the scarf knotted loosely under the chin (never covering the mouth), the lowered hood framing the neck, the long coat, the leather satchel on its strap across the chest, the belt with its small amber buckle, dark blue trousers and brown boots, clearly drawn eyes.',
  'Exact grid of 5 columns and 3 rows of equal cells, nothing between the cells; row 1 facing the viewer, row 2 seen from the back, row 3 right profile walking to the right; column 1 standing still, columns 2 to 5 a four-frame walking cycle; same size in every cell, both boots fully visible, both feet on the same baseline, figure centred, head steady.',
  'The profile walk (row 3, columns 2 to 5) must be a real walking cycle, frame by frame: column 2 contact: the near leg (the lighter trouser leg) forward with the heel down, the far leg (the darker trouser leg) behind on its toes, the far arm swinging forward; column 3 passing: both legs under the body, the near leg straight and supporting, the far foot lifted just beside it, arms close to the body, the body one pixel higher; column 4 contact with the OTHER leg forward: the far leg forward with the heel down, the near leg behind on its toes, the near arm swinging forward; column 5 passing: both legs under the body, the near foot lifted beside the far leg. The two contact frames must show different legs in front. Rows 1 and 2 keep alternating legs as well.',
  'Each cell is 64 art pixels wide and 96 art pixels tall; the character is about 90 art pixels tall. Same sturdy RPG proportions as the attached sheet, about 3 heads tall, big readable eyes with both eyes drawn identically, large readable hands, short sturdy legs and boots.',
  'Premium illustrative pixel art exactly in the style of the attached sheet: crisp square pixels of one uniform size across the whole sheet; colour ramps of four to five tones per material; selective dark outlines with a continuous dark line around the whole silhouette; clean pixel clusters, no dithering, no noise, no anti-aliasing, no gradients, no blur.',
  'Placeholder colours for in-game recolouring, each in flat shades of one pure hue only: skin (face, ears, neck, hands) in shades of pure red only (from #400000 to #FF0000), shaded as a light warm tan skin; hair and eyebrows in shades of pure yellow only (from #404000 to #FFFF00), shaded as silver-white hair; coat and lowered hood in shades of pure magenta only (from #400040 to #FF00FF); headband and scarf in shades of pure green only (from #004000 to #00FF00). Everything else in natural muted colours: dark blue trousers, brown leather satchel, belt and boots, a small amber buckle, blue eyes with a white catchlight, a dark mouth. A dark outline separates every placeholder-coloured area from any other colour. No other red, yellow, magenta, cyan or green anywhere.',
  'A perfectly flat, uniform pure cyan (#00FFFF) background with no shading, no texture, no floor and no cast shadow. No text, no letters, no numbers, no grid lines, no labels, no watermark, no logos, no playing-card suit symbols.',
].join('\n\n');
const images = [
  { name: 'player-homme', endpoint: 'edits', inputs: [INPUT], size: '1024x1024', quality: 'high', prompt },
  { name: 'player-homme-b', endpoint: 'edits', inputs: [INPUT], size: '1024x1024', quality: 'high', prompt, reserve: true },
];
writeFileSync(process.argv[2], JSON.stringify({ lot: '2026-10-29-protagoniste', images }, null, 2));
console.log(`${images.length} images décrites (la seconde en réserve) ; générer une par une : \`--only <nom>\``);
