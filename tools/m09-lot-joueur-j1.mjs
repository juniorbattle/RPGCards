// M09 J1 — spécification de la feuille du joueur refaite (fiche d'arbitrages de la porte, passe 61 : J1 « Refaire, cases
// plus grandes (≈ 2 images) » ; J2 « Ne pas autoriser : style décrit dans le prompt » — « donner plutôt les prompts,
// feuille des PNJ du district merchant du projet Cité du Tournoi »). Deux images ANNONCÉES au responsable avec leurs
// prompts complets, générées seulement après son accord (29 sur 30 après le lot des villes et celui-ci) :
//   J1a `player-pixel-j1`  : la feuille complète (contrat v3 : 5 colonnes × 3 rangées, cases de 64 × 96 px d'art), redessinée
//                            depuis NOTRE feuille de la passe 60 (seule image d'entrée) : écharpe nouée sous le menton (elle
//                            couvrait la bouche comme un masque), proportions trapues de RPG (≈ 3 têtes), rampes de cinq tons,
//                            contour sombre sélectif ; le style des PNJ de Cité du Tournoi est DÉCRIT en mots (lecture seule
//                            de leurs briefs, `HD-2D/art-lab/characters/briefs/npc2-proposal.md` §6.3 et §6.4), aucune de
//                            leurs images en entrée ;
//   J1b `player-pixel-j1b` : réserve : une seconde génération du même prompt, seulement si la première ne tient pas au
//                            contrôle (grille, tons clés, visage) ; sinon non générée et rendue au budget.
// Usage : node tools/m09-lot-joueur-j1.mjs <spécification.json>
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const main = dirname(resolve(execSync('git rev-parse --git-common-dir').toString().trim()));
const AG = join(main, 'art-gen').replace(/\\/g, '/');
const INPUT = `${AG}/2026-10-20-v4-quai-2/player-pixel-64.png`;
const prompt = [
  'The attached image is our own pixel-art sprite sheet of the player character, a young card duellist of a night harbour city. Redraw it as the final sprite sheet with the same character, the same outfit and the same placeholder colours, and fix what is wrong: an exact grid of 5 columns and 3 rows of equal cells, nothing between the cells; row 1 facing the viewer, row 2 seen from the back, row 3 right profile walking to the right; column 1 standing still, columns 2 to 5 a clear four-frame walking cycle (legs alternating, arms swinging, head steady); same size in every cell, both boots fully visible and both feet on the same baseline, figure centred.',
  'Each cell is 64 art pixels wide and 96 art pixels tall; the character is about 88 art pixels tall. Stylised RPG proportions, sturdy and not slender, not chibi: about 3 heads tall, the head (hair included) one third of the total height and about 0.35 of the height wide, with big readable eyes; shoulders with the sleeves about 0.40 of the height wide; short sturdy legs and boots; large readable hands.',
  'The face must stay fully visible: the scarf is knotted loosely UNDER the chin around the neck and never covers the mouth or the nose; a small mouth, a hint of nose shading, short eyebrows, clearly drawn eyes with a dark outline, blue iris and a white catchlight, soft cheek shading. Silver-white bob with a straight fringe drawn as distinct locks with two highlight tones; the cloth headband across the forehead; the lowered hood framing the neck; a leather satchel on a strap across the chest.',
  'Premium illustrative pixel art: crisp square pixels of one uniform size across the whole sheet; colour ramps of five tones per material, cool and saturated in the shadows and warm in the highlights; selective dark outlines; soft directional shading with readable fabric folds; one small warm amber accent only (the belt buckle); clean pixel clusters, no dithering, no scattered noise, no mechanical stripes, no pillow shading, no anti-aliasing, no gradients, no blur.',
  'Placeholder colours for in-game recolouring: coat and lowered hood in flat shades of pure magenta only (from #400040 to #FF00FF), headband and scarf in flat shades of pure green only (from #004000 to #00FF00); everything else in natural muted colours (skin, silver hair, dark blue trousers, brown leather), no other magenta or green anywhere.',
  'A perfectly flat, uniform pure cyan (#00FFFF) background with no shading, no texture, no floor and no cast shadow.',
  'No text, no letters, no numbers, no grid lines, no labels, no watermark, no logos, no playing-card suit symbols.',
].join('\n\n');
const images = [
  { name: 'player-pixel-j1', endpoint: 'edits', inputs: [INPUT], size: '1024x1024', quality: 'high', prompt },
  { name: 'player-pixel-j1b', endpoint: 'edits', inputs: [INPUT], size: '1024x1024', quality: 'high', prompt, reserve: true },
];
writeFileSync(process.argv[2], JSON.stringify({ lot: '2026-10-21-j1-joueur', images }, null, 2));
console.log(`${images.length} images (la seconde en réserve : \`--only player-pixel-j1b\`, seulement si la première ne tient pas)`);
