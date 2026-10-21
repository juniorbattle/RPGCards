// M09 V4/V5 — spécification du lot 4 pour `tools/m09-generer-images.mjs` : **le Parvis et les Ruelles en rangs, la Grande
// Cour** (reprise de M09, décision S1 du responsable ; ADR 028, `docs/M09_QUARTIERS_EN_RANGS.md`). Six images ANNONCÉES au
// responsable avec leurs prompts complets, à générer seulement après son accord ; 27 images sur 30 après ce lot (la
// feuille du joueur, J1, en demande 2 de plus). Comme le kit des rangs (passe 66), chaque image est découpée par script et
// reposée : les rangs 2 à 4 des trois quartiers gardent le kit (frises, murs, monuments, mobilier) ; ce lot n'apporte que
// ce qui fait l'identité de chaque quartier :
//   P1 `parvis-porte`   : le pavillon de la porte du Tournoi, fond du rang 1 du Parvis (entre ses deux passages) ;
//   P2 `parvis-arene`   : le grand mur courbe de l'arène, fond du cœur du Parvis (la cour des Champions), qui domine le
//                         quartier et se voit au-dessus de ses toits ;
//   R1 `ruelles-canal`  : la rangée de maisons hautes et étroites des Ruelles, fond du rang 1 (le long du canal ; le canal
//                         et son mur reprennent l'eau et le mur du Quai) ; coupée aux murs mitoyens pour ouvrir son passage ;
//   R2 `ruelles-guilde` : la halle de la Guilde des joueurs, fond du cœur des Ruelles ;
//   C1 `villes-objets`  : six objets (monument des Quatre Voies, estrade de duels, balustrade de terrasse, brasero,
//                         kiosque des paris, tableau des annonces), pour le Parvis et la Grande Cour ;
//   C2 `cour-facades`   : les grands bâtiments du fond de la Grande Cour (la Maison du Tournoi et ses ailes à arcades).
// Entrées : la référence approuvée `02.png` et nos bruts (`art-gen/`, dossier principal, ignoré par git), en référence de
// style seulement ; aucune image de Cité du Tournoi.
// Usage : node tools/m09-lot-villes-4.mjs <spécification.json>
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const main = dirname(resolve(execSync('git rev-parse --git-common-dir').toString().trim()));
const AG = join(main, 'art-gen').replace(/\\/g, '/');
const REF = 'reference/generated/2026-10-19-quai-nuit-cameras/02.png';
const ESSAI = `${AG}/2026-10-19-v4-essai/quai-facades-essai.png`;
const RANGS = `${AG}/2026-10-20-v4-rangs`;
// blocs communs, repris du kit des rangs (`tools/m09-lot-quai-3.mjs`)
const STYLE = 'Style bible: stylized HD-2D, theatrical; night with near-monochrome indigo and slate dominant, cold grey stone as secondary, warm amber lantern light, desaturated ivory for canvas and highlights; the four family colours (ember orange, veil blue and silver, bramble green, star gold) only on banners and small accents; props concentrated at focal points, never uniform clutter; world of a harbour city where people challenge each other at card duels.';
const NO = 'Strictly no people, no text, no letters, no numbers, no signature, no watermark, no logos, no playing-card suit symbols, no emblems on any cloth.';
const ROW = 'seen straight from the front like an architectural elevation (camera at eye level, no perspective tilt, no vanishing lines)';
const KEY = 'Everything around the subjects (above the roofs, between the panels, around the objects) is a perfectly flat, uniform pure magenta (#FF00FF) background with no shading, no texture, no sky, no clouds, no moon, no distant city.';
const LOOK = 'Use the attached images only as style references: match the painterly look, fine grain, cold stone masonry, half-timbering, night palette and warm amber lantern light of the harbour scene (first image), of our harbour facades (second image) and of our back-street houses (third image). Do not copy their composition.';
const FOOT = 'The bottom edge of the image is a straight horizontal line at the foot of the walls, with no ground, no steps and no cobbles in front.';
const im = (name, size, inputs, parts) => ({ name, endpoint: 'edits', inputs, size, quality: 'high', prompt: parts.join('\n\n') });
const INPUTS = [REF, ESSAI, `${RANGS}/rangs-ruelle-a.png`];

const images = [
  // P1 : fond du rang 1 du Parvis, entre ses deux passages (≈ 21 m) ; la grande porte au centre (zone « Entrer dans
  // l'arène », x −2,3 à 2,3) ; les braseros sont des objets posés devant (C1)
  im('parvis-porte', '1536x1024', INPUTS, [
    LOOK,
    `Paint ONE isolated background layer for a 2.5D night harbour town, ${ROW}: the monumental gate pavilion of the city's card-duel arena (the Tournament gate), about 21 metres wide and 15 metres tall to its ridge, spanning the full width of the image and filling about the lower 85% of it. Scale: a person is about 125 pixels tall in this image. In the centre, a great round-arched gate about 4.6 metres wide and 6 metres tall, its heavy wooden doors open inwards, a warm orange glow of torches inside and a glimpse of a sandy floor; on each side, two smaller round arcades closed by dark iron grilles; rusticated cold grey stone; above the gate, a stone gallery of small columns and a deep balcony; four long hanging cloth banners on the upper storey, one in each family colour (ember orange, veil blue and silver, bramble green, star gold), plain; a crenellated parapet and two corner turrets with pointed slate roofs; iron wall lanterns glowing warm amber beside the gate.`,
    FOOT, KEY, NO, STYLE]),
  // P2 : fond du cœur du Parvis (la cour des Champions, ≈ 30 m), assez haut pour dominer le quartier
  im('parvis-arene', '1536x1024', INPUTS, [
    LOOK,
    `Paint ONE isolated background layer for a 2.5D night harbour town, ${ROW} (only the roofline may curve very slightly): the great outer wall of the city's card-duel arena, a vast round stone amphitheatre about 30 metres wide in view and 22 metres tall, spanning the full width of the image and filling about 92% of its height. Scale: a person is about 90 pixels tall in this image. Two tiers of tall round arches between heavy buttresses: the lower tier closed by dark wooden doors and iron grilles, the upper tier open, showing darkness and the faint warm flicker of torches inside; a cornice with tall flagpoles carrying long pennants in the four family colours, plain; at street level in the centre, a heavy arched gate (the Champions' gate) with two iron lanterns glowing warm amber and a pair of stone braziers; weathered cold grey stone, darker at the foot.`,
    FOOT, KEY, NO, STYLE]),
  // R1 : fond du rang 1 des Ruelles (≈ 26 m), coupé à ses murs mitoyens pour ouvrir son passage
  im('ruelles-canal', '1536x1024', INPUTS, [
    LOOK,
    `Paint ONE isolated background layer for a 2.5D night harbour town, ${ROW}: a continuous row of six tall, narrow townhouses of the seers' quarter lining a canal, spanning the full width of the image, four storeys tall plus their roofs, filling about the lower 85% of the image. Scale: a person is about 100 pixels tall in this image; doors are about 130 pixels tall. Each house is narrow and tall, its half-timbered upper storeys jettied out over the street, steep slate roofs with pointed gables and thin chimneys, heights varying by about one storey; clear vertical party walls between the houses. Street level, from left to right: a narrow door with a hanging lantern, a seer's little shop with a veil-blue awning and a window full of candles and crystal globes, a closed shutter shop, the tallest house with a carved door and two long veil-blue and silver cloth banners (plain), a bow window glowing warm amber, a plain door with a pale silver-blue lamp. Upper storeys: warm lit windows and dark ones, one small balcony, laundry on a pole. Light mixes warm amber lanterns with a few cold silver-blue lamps.`,
    FOOT, KEY, NO, STYLE]),
  // R2 : fond du cœur des Ruelles (≈ 14 m)
  im('ruelles-guilde', '1536x1024', INPUTS, [
    LOOK,
    `Paint ONE isolated background layer for a 2.5D night harbour town, ${ROW}: the hall of the players' guild at the heart of the old seers' quarter, a wide and stately three-storey building about 14 metres wide, spanning the full width of the image and filling about the lower 90% of it. Scale: a person is about 180 pixels tall in this image. Ground floor: four open round stone arcades, warmly lit inside, showing long wooden card tables, benches and hanging lanterns (no people); first floor: a carved timber gallery with a balustrade and tall lit windows; a large steep slate roof with two dormers and a small lantern turret glowing amber on the ridge; two long veil-blue and silver cloth banners (plain) between the arcades; old cold grey stone and dark timber.`,
    FOOT, KEY, NO, STYLE]),
  // C1 : objets du Parvis et de la Grande Cour (découpés par script, posés devant, obstacles)
  im('villes-objets', '1536x1024', INPUTS, [
    LOOK,
    `Paint ONE isolated layer with SIX separate objects arranged in a 3 × 2 grid with wide magenta gaps between them, each ${ROW} with a slight view from above, each standing on its own straight horizontal base line with a soft contact shadow and no ground around it. Scale: a person would be about 110 pixels tall in this image. Top row: the monument of the Four Ways, an octagonal stone fountain basin with a tall carved column in its centre, crowned by a bronze sphere ringed by four arms pointing four ways, four small hanging cloth pennants in the four family colours (plain), thin streams of water catching the lamplight; a public duel stage, a square wooden platform about one metre high with three steps in front, a small square card table and two stools in its centre, a lantern on a post at each corner, an ivory canvas canopy; a straight segment of stone balustrade standing on top of a tall terrace retaining wall (the edge of a raised square), with an iron lantern post at its right end. Bottom row: a tall iron brazier burning with a warm fire on a short stone plinth; a small wooden betting kiosk with an ivory awning, a counter with small purses and wooden tokens, and a blank dark slate board with small coloured pins only; a tall wooden notice board under a little shingled roof, covered with blank parchment slips held by coloured pins, with nothing written on them.`,
    KEY, NO, STYLE]),
  // C2 : fond de la Grande Cour (≈ 26 m entre ses deux passages)
  im('cour-facades', '1536x1024', INPUTS, [
    LOOK,
    `Paint ONE isolated background layer for a 2.5D night harbour town, ${ROW}: the grand buildings that close the back of the city's central square, about 26 metres wide, spanning the full width of the image and filling about the lower 88% of it. Scale: a person is about 95 pixels tall in this image. In the centre, the Tournament house: a stately three-storey civic hall of cold grey stone, a high round-arched portal with open doors and warm light inside, above it a stone balcony for proclamations with four long cloth banners hanging from it, one in each family colour (ember orange, veil blue and silver, bramble green, star gold), plain; tall lit windows, a steep slate roof with a small belfry. On each side, a tall merchant house joined to it, with an arcaded ground floor sheltering lit shop counters, half-timbered upper storeys and steep roofs; clear vertical party walls between the three buildings; iron wall lanterns glowing warm amber.`,
    FOOT, KEY, NO, STYLE]),
];
writeFileSync(process.argv[2], JSON.stringify({ lot: '2026-10-20-v4-villes', images }, null, 2));
console.log(`${images.length} images`);
