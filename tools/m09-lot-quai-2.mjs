// M09 V4 — spécification du lot 2 de la porte du Quai (passe 60, ADR 028) pour `tools/m09-generer-images.mjs` : quatre
// images annoncées au responsable avec leurs prompts complets avant génération, après ses décisions sur la planche 2
// (profondeur : troisième rang et ruelles ; feuille du joueur refaite en 64 × 96, sans image d'entrée de Cité du Tournoi).
// Entrées : la référence approuvée `02.png` et nos bruts (`art-gen/`, dossier principal, ignoré par git).
// Usage : node tools/m09-lot-quai-2.mjs <spécification.json>
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const main = dirname(resolve(execSync('git rev-parse --git-common-dir').toString().trim()));
const AG = join(main, 'art-gen').replace(/\\/g, '/');
const REF = 'reference/generated/2026-10-19-quai-nuit-cameras/02.png';
const ESSAI = `${AG}/2026-10-19-v4-essai/quai-facades-essai.png`;
const LOT1 = `${AG}/2026-10-20-v4-quai`;
const STYLE = 'Style bible: stylized HD-2D, theatrical; night with near-monochrome indigo and slate dominant, cold grey stone as secondary, warm amber lantern light, desaturated ivory for canvas and highlights; the four family colours (ember orange, veil blue and silver, bramble green, star gold) only on banners and small accents; props concentrated at focal points, never uniform clutter; world of a harbour city where people challenge each other at card duels.';
const NO = 'Strictly no people, no text, no letters, no numbers, no signature, no watermark, no logos, no playing-card suit symbols.';
const MAG_ROOF = 'Everything above the roofs is a perfectly flat, uniform pure magenta (#FF00FF) background with no shading and no texture: no sky, no clouds, no moon, no distant city.';
const ROW = 'seen straight from the front like an architectural elevation (camera at eye level, no perspective tilt, no vanishing lines)';
const im = (name, size, inputs, parts) => ({ name, endpoint: 'edits', inputs, size, quality: 'high', prompt: parts.join('\n\n') });

const images = [
  im('quai-troisieme-rang', '1536x1024', [REF, ESSAI, `${LOT1}/quai-second-rang.png`], [
    'Use the attached images only as style references: match the painterly look, fine grain, night palette and warm amber lantern light of the harbour scene (first image), of the harbour facade layer (second image) and of the row of rooftops just behind the harbour front (third image). Do not copy their composition.',
    `Paint ONE isolated background layer for a side-scrolling 2.5D night harbour town, ${ROW}: the rooftops of the town further back, a third and more distant row behind the rooftops of the third image: smaller-looking roofs, gables and chimneys, a bell tower and two slender spires, sparse warm windows, softened by thin night haze, slightly bluer and paler than the nearer row; the bottom of the layer fades into dark haze and its bottom edge is a straight horizontal line. The buildings fill about the lower 65% of the image.`,
    MAG_ROOF, NO, STYLE]),
  im('quai-ruelle', '1024x1024', [REF, `${LOT1}/quai-facades-ouest.png`], [
    'Use the attached images only as style references: match the painterly look, fine grain, night palette and warm amber lantern light of the harbour scene (first image); the second image shows, on its left, the stone archway that opens onto the lane to paint. Do not copy their composition.',
    'Paint ONE layer filling the whole image: a narrow cobbled lane seen straight on from its entrance, receding far into the distance in central perspective, its vanishing point slightly above the centre: tall stone and half-timbered houses on both sides leaning slightly inward, laundry lines across the lane, hanging lanterns glowing warm amber, one lantern glowing veil blue, a few lit windows, a small flight of steps going up at the far end, night mist deepening with distance.',
    NO, STYLE]),
  im('quai-passage-parvis', '1024x1024', [REF, `${LOT1}/quai-facades-est.png`], [
    'Use the attached images only as style references: match the painterly look, fine grain, detailed cold stone masonry, night palette and warm amber lantern light of the harbour scene (first image) and of the harbour facade layer (second image, whose stone ramp on the right leads up to this passage). Do not copy their composition.',
    `Paint ONE isolated background layer ${ROW}: a broad stone stair-street rising from the lower left toward the upper right between high stone walls, lanterns along the steps, leading up to the curved outer wall of an arena with tall arches glowing warm from inside, a few pennants in the four family colours (ember orange, veil blue, bramble green, star gold), plain cloth without any emblem or mark; the bottom edge of the image is the street level.`,
    'Everything above the walls and the arena is a perfectly flat, uniform pure magenta (#FF00FF) background with no shading and no texture: no sky, no clouds, no moon.',
    NO, STYLE]),
  im('player-pixel-64', '1024x1024', [`${LOT1}/player-pixel.png`], [
    'The attached image is our own pixel-art sprite sheet of the player character. Redraw it as a finer final sprite sheet with exactly the same character, layout and placeholder colours: an exact grid of 5 columns and 3 rows of equal cells, nothing between the cells; row 1 facing the viewer, row 2 seen from the back, row 3 right profile walking to the right; column 1 standing still, columns 2 to 5 a clear four-frame walking cycle (legs alternating, arms swinging, head steady); same size in every cell, feet on the same baseline, figure centred.',
    'Higher resolution pixel art: each cell is 64 art pixels wide and 96 art pixels tall, the character about 88 art pixels tall with a large readable head (about one third of the height). Give the head and face real care: silver-white bob with a straight fringe drawn as distinct locks with two highlight tones, clearly drawn eyes with dark outline, blue iris and a white catchlight, short eyebrows, a hint of nose shading and a small mouth, soft cheek shading; the cloth headband across the forehead and the lowered hood framing the neck.',
    'Colour ramps of five tones per material, cool and saturated in the shadows and warm in the highlights. Placeholder colours for in-game recolouring: coat and lowered hood in flat shades of pure magenta only (from #400040 to #FF00FF), headband and scarf in flat shades of pure green only (from #004000 to #00FF00); everything else in natural colours, no other magenta or green.',
    'True pixel art: every art pixel a crisp square of the same size, a one-pixel dark outline, no anti-aliasing, no gradients, no blur, no shadow on the ground. A perfectly flat, uniform pure cyan (#00FFFF) background with no shading and no texture.',
    'No text, no letters, no numbers, no grid lines, no labels, no watermark, no logos, no playing-card suit symbols.']),
];
writeFileSync(process.argv[2], JSON.stringify({ lot: '2026-10-20-v4-quai-2', images }, null, 2));
console.log(`${images.length} images`);
