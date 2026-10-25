// M09, deuxième reprise (2026-10-25) — spécification du lot des quartiers ajoutés pour `tools/m09-generer-images.mjs` :
// **la Place du Fanal et la Ville haute** (décision du responsable : « Fanal et Ville haute », 4 images au plus ; ordre :
// « attaque la Place du Fanal et la Ville haute » ; ADR 028, « Deuxième reprise »). Comme le lot des villes
// (`tools/m09-lot-villes-4.mjs`), ce lot n'apporte que ce qui fait l'identité de chaque quartier ; le reste vient du kit des
// rangs et du lot des villes :
//   F1 `port-fanal`         : le vieux phare du port (le Fanal) et ses entrepôts, fond du rang 1 de la Place du Fanal
//                             (entre ses deux passages, ≈ 19,6 m) ;
//   F2 `port-ronce`         : la maison de la Ronce, fond de la cour de la Ronce (le cœur, ≈ 14 m) ;
//   H1 `haute-hotels`       : les hôtels à arcades de la Ville haute, fond du rang 1 (entre ses deux passages, ≈ 19,6 m) ;
//   H2 `haute-observatoire` : l'Observatoire de l'Astre, fond du parvis de l'Observatoire (le cœur, ≈ 16 m).
// Entrées : la référence approuvée `02.png` et nos bruts (`art-gen/`, dossier principal, ignoré par git), en référence de
// style seulement ; aucune image de Cité du Tournoi. Bannières unies (brodées des emblèmes du jeu par script).
// Usage : node tools/m09-lot-quartiers.mjs <spécification.json>
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

export const LOT = '2026-10-25-quartiers';
const main = dirname(resolve(execSync('git rev-parse --git-common-dir').toString().trim()));
const AG = join(main, 'art-gen').replace(/\\/g, '/');
const REF = 'reference/generated/2026-10-19-quai-nuit-cameras/02.png';
const ESSAI = `${AG}/2026-10-19-v4-essai/quai-facades-essai.png`;
const RANGS = `${AG}/2026-10-20-v4-rangs`;
// blocs communs, repris du lot des villes (`tools/m09-lot-villes-4.mjs`)
const STYLE = 'Style bible: stylized HD-2D, theatrical; night with near-monochrome indigo and slate dominant, cold grey stone as secondary, warm amber lantern light, desaturated ivory for canvas and highlights; the four family colours (ember orange, veil blue and silver, bramble green, star gold) only on banners and small accents; props concentrated at focal points, never uniform clutter; world of a harbour city where people challenge each other at card duels.';
const NO = 'Strictly no people, no text, no letters, no numbers, no signature, no watermark, no logos, no playing-card suit symbols, no emblems on any cloth.';
const ROW = 'seen straight from the front like an architectural elevation (camera at eye level, no perspective tilt, no vanishing lines)';
const KEY = 'Everything around the subjects (above the roofs, around the tower, between the buildings) is a perfectly flat, uniform pure magenta (#FF00FF) background with no shading, no texture, no sky, no clouds, no moon, no distant city.';
const LOOK = 'Use the attached images only as style references: match the painterly look, fine grain, cold stone masonry, half-timbering, night palette and warm amber lantern light of the harbour scene (first image), of our harbour facades (second image) and of our back-street houses (third image). Do not copy their composition.';
const FOOT = 'The bottom edge of the image is a straight horizontal line at the foot of the walls, with no ground, no steps and no cobbles in front.';
const im = (name, size, inputs, parts) => ({ name, endpoint: 'edits', inputs, size, quality: 'high', prompt: parts.join('\n\n') });
const INPUTS = [REF, ESSAI, `${RANGS}/rangs-ruelle-a.png`];

const images = [
  im('port-fanal', '1536x1024', INPUTS, [
    LOOK,
    `Paint ONE isolated background layer for a 2.5D night harbour town, ${ROW}: the old harbour lighthouse of the city (the Lantern) and its warehouses, about 20 metres wide, spanning the full width of the image and filling about the lower 95% of it. Scale: a person is about 120 pixels tall in this image. In the centre, a tall, slender round stone lighthouse tower rising almost to the top of the image, weathered cold grey stone with a few narrow slit windows, an iron gallery near its top and a glazed lantern room glowing warm amber, a small conical slate cap; at its foot, a heavy arched wooden door with two iron wall lanterns. On each side, a two-storey stone harbour warehouse joined to the tower, with large arched loading doors (one open, showing coils of rope and stacked crates in warm light), hoist beams with ropes and pulleys under the gables, small lit windows, steep slate roofs; one long plain bramble-green cloth banner hanging on each warehouse.`,
    FOOT, KEY, NO, STYLE]),
  im('port-ronce', '1536x1024', INPUTS, [
    LOOK,
    `Paint ONE isolated background layer for a 2.5D night harbour town, ${ROW}: the house of the Bramble family at the heart of the harbour quarter, an old fortified merchant house about 14 metres wide, spanning the full width of the image and filling about the lower 90% of it. Scale: a person is about 180 pixels tall in this image. Thick cold grey stone walls overgrown with dark ivy and flowering hawthorn branches, a deep round-arched gate with heavy studded doors and a warm glow inside, a small balcony above the gate, tall lit windows with dark green shutters, a steep slate roof with two chimneys and a little lantern turret; two long plain bramble-green cloth banners hanging on each side of the gate; two iron wall lanterns glowing warm amber.`,
    FOOT, KEY, NO, STYLE]),
  im('haute-hotels', '1536x1024', INPUTS, [
    LOOK,
    `Paint ONE isolated background layer for a 2.5D night town, ${ROW}: a continuous row of three stately townhouses of the upper town, about 20 metres wide, spanning the full width of the image and filling about the lower 88% of it. Scale: a person is about 110 pixels tall in this image. Pale cold grey dressed stone, more refined than the harbour houses: a ground floor of round arcades sheltering lit doors and a bookseller's window full of rolled maps and brass instruments; tall first-floor windows with small wrought-iron balconies; carved cornices; steep slate roofs with dormers and slender chimneys; clear vertical party walls between the three houses; two long plain star-gold cloth banners hanging from the middle house; iron wall lanterns glowing warm amber.`,
    FOOT, KEY, NO, STYLE]),
  im('haute-observatoire', '1536x1024', INPUTS, [
    LOOK,
    `Paint ONE isolated background layer for a 2.5D night town, ${ROW}: the Observatory of the Star family at the heart of the upper town, about 16 metres wide, spanning the full width of the image and filling about the lower 92% of it. Scale: a person is about 150 pixels tall in this image. A round stone building with a great copper-green dome on top, a long vertical slit open in the dome with the brass tube of a telescope pointing to the sky; below the dome a ring of tall arched windows glowing warm amber; a monumental round-arched entrance at street level with open doors and warm light inside, flanked by two slender columns; two long plain star-gold cloth banners hanging on each side of the entrance; small brass armillary spheres on the parapet; weathered cold grey stone.`,
    FOOT, KEY, NO, STYLE]),
];
writeFileSync(process.argv[2], JSON.stringify({ lot: LOT, images }, null, 2));
console.log(`${images.length} images`);
