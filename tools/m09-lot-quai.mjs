// M09 V4 — spécification du lot « porte du Quai » (passe 57, ADR 028) pour `tools/m09-generer-images.mjs` : dix images
// gpt-image-2 annoncées au responsable avec leurs prompts complets avant génération. Prompts composés de parties
// communes (bible de style, interdits, références) ; la façade centrale de l'essai (passe 56) est reprise telle quelle.
// Entrées : la référence approuvée `02.png`, les bruts de l'essai et du lot (`art-gen/`, dossier principal, ignoré).
// Usage : node tools/m09-lot-quai.mjs <spécification.json>
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const main = dirname(resolve(execSync('git rev-parse --git-common-dir').toString().trim()));
const AG = join(main, 'art-gen').replace(/\\/g, '/');
const REF = 'reference/generated/2026-10-19-quai-nuit-cameras/02.png';
const ESSAI = `${AG}/2026-10-19-v4-essai/quai-facades-essai.png`;
const LOT = `${AG}/2026-10-20-v4-quai`;
const STYLE = 'Style bible: stylized HD-2D, theatrical; night with near-monochrome indigo and slate dominant, cold grey stone as secondary, warm amber lantern light, desaturated ivory for canvas and highlights; the four family colours (ember orange, veil blue and silver, bramble green, star gold) only on banners and small accents; props concentrated at focal points, never uniform clutter; world of a harbour city where people challenge each other at card duels.';
const NO = 'Strictly no people, no text, no letters, no numbers, no signature, no watermark, no logos, no playing-card suit symbols.';
const REFS = 'Use the attached images only as style references: match the painterly look, fine grain, detailed cold stone masonry, dark timber, night palette and warm amber lantern light of the harbour scene (first image) and of the harbour facade layer (second image). Do not copy their composition.';
const MAG_ROOF = 'Everything above the roofs is a perfectly flat, uniform pure magenta (#FF00FF) background with no shading and no texture: no sky, no clouds, no moon, no distant city.';
const ROW = 'seen straight from the front like an architectural elevation (camera at eye level, no perspective tilt, no vanishing lines)';
const im = (name, size, inputs, parts) => ({ name, endpoint: 'edits', inputs, size, quality: 'high', prompt: parts.join('\n\n') });

const images = [
  im('quai-ciel-ville-haute', '1536x1024', [REF], [
    'Use the attached image only as the style reference: match its painterly HD-2D look, fine grain, night palette and the distant upper city of its background. Do not copy its composition.',
    'Paint ONE isolated far background layer for a side-scrolling 2.5D night harbour scene, seen from the front at eye level: the night sky and, on a hill, the upper city seen from far away. The lower half: the upper city climbing a hill, dense rooftops, spires, bell towers and a large cathedral with a rose window, many small warm windows and a few cold blue ones, softened by a thin layer of night mist; the city is darkest and most hazy at the bottom edge. The upper half: a deep indigo night sky with a bright moon to the upper right, a soft halo, thin silvery clouds and a few stars. No harbour, no water, no boats, no near houses, no foreground.',
    NO, STYLE]),
  im('quai-second-rang', '1536x1024', [REF, ESSAI], [
    REFS,
    `Paint ONE isolated background layer for a side-scrolling 2.5D night harbour street, ${ROW}: the rooftops of the houses one street behind the harbour front, a continuous dense row filling the full width: slate and tile roofs of varied heights, gables, chimneys with faint smoke, dormers and attic windows, two small towers, a few warm lit windows and one veil-blue lit window; the top floors and roofs are detailed, the walls below fade into dark shadow toward the bottom edge, which is a straight horizontal line. The buildings fill about the lower 70% of the image.`,
    MAG_ROOF, NO, STYLE]),
  im('quai-facades-ouest', '1024x1024', [REF, ESSAI], [
    REFS,
    `Paint ONE isolated layer that continues the harbour facade row of the second image to its LEFT, at exactly the same scale, storey heights, lighting and fine grain, ${ROW}; the bottom edge of the image is the straight line where the walls meet the street, the street itself is not shown. From left to right: (1) a tall stone archway opening onto a narrow dark alley that leads to the lanes, with a small lantern glowing veil blue beside it; (2) the shipwright's workshop: stone ground floor with a wide arched timber workshop door glowing warm orange from a forge inside, a half-timbered upper floor with two lit windows, a timber hoisting beam with a pulley and rope above the door, an iron bracket holding a pulley-shaped sign with no lettering, two dormers in a slate roof with a chimney. The buildings fill the full width and about 85% of the image height.`,
    MAG_ROOF, `${NO} No street paving, no water, no boats, no foreground objects.`, STYLE]),
  im('quai-facades-est', '1024x1024', [REF, ESSAI, `${LOT}/quai-facades-ouest.png`], [
    'Use the attached images only as style references: match the painterly look, fine grain, detailed cold stone masonry, dark timber, night palette and warm amber lantern light of the harbour scene (first image) and of the two harbour facade layers (second and third images). Do not copy their composition.',
    `Paint ONE isolated layer that continues the harbour facade row of the second image to its RIGHT, at exactly the same scale, storey heights, lighting and fine grain, ${ROW}; the bottom edge of the image is the straight line where the walls meet the street, the street itself is not shown. From left to right: (1) the shipowner's house, the tallest of the row: stone ground floor with a shop window under a slate-grey canvas awning and a plain door, plastered upper floors with stone corner quoins, small wrought-iron balconies at the first-floor windows, a cross gable facing the street with a round stained-glass window glowing veil blue, an iron bracket holding an anchor-shaped sign with no lettering, a small veil-blue pennant on a pole; (2) at the far right, a lower stone warehouse with large timber double doors and a stone ramp rising toward the right edge (the way up to the arena square), with a lantern at the ramp. The buildings fill the full width and about 85% of the image height.`,
    MAG_ROOF, `${NO} No street paving, no water, no boats, no foreground objects.`, STYLE]),
  im('quai-etal', '1024x1024', [REF, ESSAI], [
    REFS,
    'Paint ONE isolated object seen straight from the front at eye level, centred and filling about 80% of the image width, standing on an invisible ground line near the bottom edge: a harbour merchant stall, the focal point of the street: a wooden trestle table covered with a cloth, displaying small wooden boxes, stacked card packs with plain backs, folded cloths in the four family colours and a few trinkets; a large desaturated ivory canvas awning stretched on wooden poles above it; a cluster of two hanging amber lanterns casting warm light on the goods; a small crate and a barrel beside the table.',
    'Everything that is not the stall is a perfectly flat, uniform pure magenta (#FF00FF) background with no shading, no texture and no cast shadow.',
    NO, STYLE]),
  im('quai-accessoires', '1536x1024', [REF, ESSAI], [
    REFS,
    'A prop sheet of separate street objects for the same night harbour, each seen straight from the front at eye level, all at the same scale, standing on invisible ground lines, spaced well apart with nothing overlapping or touching: (1) a tall ornate cast-iron street lamp post with a cluster of three glowing amber lanterns at the top (about three times as tall as the barrels); (2) a short stone mooring bollard with an iron cap and a coil of rope; (3) a stack of three wooden crates; (4) a group of three barrels; (5) a pile of fishing nets with cork floats and a coiled rope.',
    'Everything that is not an object is a perfectly flat, uniform pure magenta (#FF00FF) background with no shading, no texture and no cast shadows.',
    NO, STYLE]),
  im('quai-premier-plan-ouest', '1536x1024', [REF, ESSAI], [
    REFS,
    'Paint ONE isolated foreground layer for a side-scrolling 2.5D night harbour scene, seen from the front at eye level. The bottom edge of the image is the water line. Along the whole bottom of the image rises the top part of a massive stone quay wall seen from the water side (large cut blocks, iron mooring rings, a small drainage arch, an iron ladder), its top edge a straight horizontal line at about one fifth of the image height. In front of the wall, in the lower left, the dark wooden hull and bow of a moored fishing boat; its mast and rigging lines rise to the top edge of the image; a few tall wooden mooring posts stand in front of the wall.',
    'Everything else is a perfectly flat, uniform pure magenta (#FF00FF) background with no shading and no texture: the street and the houses behind are not shown, no sky, no water surface.',
    NO, STYLE]),
  im('quai-premier-plan-est', '1536x1024', [REF, ESSAI, `${LOT}/quai-premier-plan-ouest.png`], [
    'Use the attached images only as style references: match the painterly look, fine grain, detailed cold stone masonry, dark timber, night palette and warm amber lantern light of the harbour scene (first image), of the harbour facade layer (second image) and of the foreground layer (third image). Do not copy their composition.',
    'Paint ONE isolated foreground layer that continues the foreground layer of the third image to its RIGHT, seen from the front at eye level, with the same quay wall at exactly the same height and scale. The bottom edge of the image is the water line; the top edge of the quay wall is a straight horizontal line at about one fifth of the image height. In front of the wall: on the right, the stern of a larger moored boat with a small amber lantern at its stern, its mast and rigging rising to the top edge; a small rowing boat tied alongside; a few tall wooden mooring posts.',
    'Everything else is a perfectly flat, uniform pure magenta (#FF00FF) background with no shading and no texture: the street and the houses behind are not shown, no sky, no water surface.',
    NO, STYLE]),
  im('quai-eau', '1536x1024', [REF], [
    'Use the attached image only as the style reference for its dark harbour water. Do not copy its composition.',
    'Paint a texture of calm dark harbour water at night seen from directly above, filling the whole image: near-black indigo water with gentle irregular ripples, long soft streaks of warm amber lantern reflections running from the top edge toward the bottom, a few cold silvery moonlight glints, painterly fine grain; even enough to be laid flat as the water surface of a game scene.',
    'No boats, no objects, no shore, no people, no text, no letters, no numbers, no signature, no watermark, no logos.']),
  im('player-pixel', '1024x1024', [`${AG}/2026-10-19-v4-essai/player-pixel-essai.png`], [
    'The attached image is our own pixel-art sprite sheet of the player character. Redraw it as a clean final sprite sheet: keep exactly the same character design, proportions, colours (coat and lowered hood in flat shades of pure magenta from #400040 to #FF00FF, headband and scarf in flat shades of pure green from #004000 to #00FF00, as placeholders for in-game recolouring; everything else in natural colours, no other magenta or green), the same pixel size and the same layout: an exact grid of 5 columns and 3 rows of equal cells, nothing between the cells.',
    'Row 1: facing the viewer; row 2: seen from the back; row 3: right profile walking to the right. Column 1: standing still; columns 2 to 5: a clear four-frame walking cycle in every row (contact, passing, contact with the other leg forward, passing), legs visibly alternating and arms swinging, the head steady. Same size in every cell, feet on the same baseline near the bottom of each cell, figure centred.',
    'True low-resolution pixel art: every art pixel a crisp square of the same size, a one-pixel dark outline, flat colour areas with at most three shades each, no anti-aliasing, no gradients, no blur, no shadows on the ground. A perfectly flat, uniform pure cyan (#00FFFF) background with no shading and no texture.',
    'No text, no letters, no numbers, no grid lines, no labels, no watermark, no logos, no playing-card suit symbols.']),
];
writeFileSync(process.argv[2], JSON.stringify({ lot: '2026-10-20-v4-quai', images }, null, 2));
console.log(`${images.length} images`);
