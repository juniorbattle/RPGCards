// M09 V4 — spécification du lot 3 pour `tools/m09-generer-images.mjs` : le **kit des quartiers en rangs** (passe 65, ADR
// 028 « Quartiers en rangs », `docs/M09_QUARTIERS_EN_RANGS.md`). Cinq images ANNONCÉES au responsable avec leurs prompts
// complets, à générer seulement après son accord ; elles remplacent les deux images annoncées à la passe 63 (façade de la
// rue haute, murs des passages), qui y sont reprises. Un kit, et non des décors : chaque image est découpée par script
// (`uv`) et reposée à plusieurs rangs et dans plusieurs quartiers (fonds des ruelles, murs, monuments des places,
// mobilier) ; 21 images sur 30 après ce lot.
// Entrées : la référence approuvée `02.png` et nos bruts (`art-gen/`, dossier principal, ignoré par git), en référence de
// style seulement ; aucune image de Cité du Tournoi.
// Usage : node tools/m09-lot-quai-3.mjs <spécification.json>
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const main = dirname(resolve(execSync('git rev-parse --git-common-dir').toString().trim()));
const AG = join(main, 'art-gen').replace(/\\/g, '/');
const REF = 'reference/generated/2026-10-19-quai-nuit-cameras/02.png';
const ESSAI = `${AG}/2026-10-19-v4-essai/quai-facades-essai.png`;
const LOT1 = `${AG}/2026-10-20-v4-quai`;
const STYLE = 'Style bible: stylized HD-2D, theatrical; night with near-monochrome indigo and slate dominant, cold grey stone as secondary, warm amber lantern light, desaturated ivory for canvas and highlights; the four family colours (ember orange, veil blue and silver, bramble green, star gold) only on banners and small accents; props concentrated at focal points, never uniform clutter; world of a harbour city where people challenge each other at card duels.';
const NO = 'Strictly no people, no text, no letters, no numbers, no signature, no watermark, no logos, no playing-card suit symbols, no emblems on any cloth.';
const ROW = 'seen straight from the front like an architectural elevation (camera at eye level, no perspective tilt, no vanishing lines)';
const KEY = 'Everything around the subjects (above the roofs, between the panels, around the objects) is a perfectly flat, uniform pure magenta (#FF00FF) background with no shading, no texture, no sky, no clouds, no moon, no distant city.';
const LOOK = 'Use the attached images only as style references: match the painterly look, fine grain, cold stone masonry, half-timbering, night palette and warm amber lantern light of the harbour scene (first image) and of our harbour facades (second and third images). Do not copy their composition.';
const SCALE = 'Scale: a person is about 170 pixels tall in this image; doors are about 200 pixels tall.';
const im = (name, size, inputs, parts) => ({ name, endpoint: 'edits', inputs, size, quality: 'high', prompt: parts.join('\n\n') });
const INPUTS = [REF, ESSAI, `${LOT1}/quai-facades-ouest.png`];

const images = [
  // K1 et K2 : fonds des ruelles (rangs 2 et 3), découpés aux passages et aux places, calés différemment d'un rang à l'autre
  im('rangs-ruelle-a', '1536x1024', INPUTS, [
    LOOK,
    `Paint ONE isolated background layer for a 2.5D night harbour town, ${ROW}: a continuous row of five narrow townhouses lining a quiet back street, spanning the full width of the image, three storeys tall plus their roofs, filling about the lower 75% of the image. ${SCALE} Street level, from left to right: a cobbler's shopfront with an ivory canvas awning and a lit window display, a plain house door with a hanging lantern, a narrow tavern with a lit bow window, a closed carriage gate, a herbalist's door with bunches of dried plants. Half-timbered upper storeys with warm lit windows and dark ones, one balcony with flower boxes, steep slate roofs with dormers and chimneys, house heights varying by about one storey; wall lanterns glowing warm amber at door height; one plain cloth pennant in veil blue without any mark. The bottom edge of the image is a straight horizontal line at the foot of the walls, with no ground, no steps and no cobbles in front.`,
    KEY, NO, STYLE]),
  im('rangs-ruelle-b', '1536x1024', INPUTS, [
    LOOK,
    `Paint ONE isolated background layer for a 2.5D night harbour town, ${ROW}: a continuous row of four narrow buildings of a poorer craftsmen's street, spanning the full width of the image, two to three storeys plus their roofs, filling about the lower 70% of the image, different from a merchants' street: rough grey stone and patched pale plaster rather than fine half-timbering. ${SCALE} Street level, from left to right: a cooper's workshop with wide-open plank doors and a warm glow inside, an outside stone stair climbing to an upper door, a dark covered porch tunnelling through the ground floor (an opening about 3 metres wide, deep shadow inside), a small gambling den door with a single red lantern. Upper storeys: shuttered windows, a few warm lit ones, a laundry line between two windows, a wooden gallery, crooked chimneys, slate and old tile roofs. Wall lanterns glowing warm amber at door height. The bottom edge of the image is a straight horizontal line at the foot of the walls, with no ground in front.`,
    KEY, NO, STYLE]),
  // K3 : murs de côté (passages, côtés des places, bouts des ruelles), posés de côté (`cote`)
  im('rangs-murs', '1536x1024', INPUTS, [
    LOOK,
    'Paint ONE isolated layer with THREE different side walls of townhouses, side by side, each filling one third of the image, separated by narrow vertical magenta gaps; each wall seen straight on like an architectural elevation (no perspective, no vanishing lines), rising from the bottom edge of the image to about 90% of its height; these are the long side walls that border narrow passages and the end of a street, about 8 metres long and 10 metres tall. ' + SCALE + ' Left wall: rough cold grey stone ground floor, half-timbered upper storeys, two small warm lit windows, a wooden drainpipe, a wall lantern glowing warm amber at head height. Middle wall: plain stone with patched plaster, one shuttered window, iron tie plates, an empty iron sign bracket, stacked crates at its foot. Right wall: the gable end of a tall house closing a street, with a closed arched wooden gate in the middle (the street seems to continue behind it), a small lit window above the gate and a lantern beside it. The roof of each wall is seen edge-on as a thin eave line along its top. The bottom edge of each wall is a straight horizontal line with no ground in front.',
    KEY, NO, STYLE]),
  // K4 : monuments des places (le spot de chaque rang) : la halle, la maison des joueurs, la chapelle (le cœur)
  im('rangs-monuments', '1536x1024', INPUTS, [
    LOOK,
    `Paint ONE isolated layer with THREE different landmark buildings side by side, each filling one third of the image, separated by narrow vertical magenta gaps, ${ROW}, each rising from the bottom edge of the image to between 80% and 95% of its height. ${SCALE} Left: a covered market hall, an open ground floor of three wide stone arcades with market tables and baskets in the warm lantern light, a heavy timber upper floor and a big slate roof with a small bell turret. Middle: a players' guild house on a small square, a carved wooden door up three steps, a large lit bay window showing card tables inside, a balcony with an ivory awning, a plain cloth banner in star gold without any mark. Right: a small seamen's chapel, grey stone, a round rose window glowing amber, a bell gable with one bell, a carved portal with candles at its foot, and an iron anchor sculpted above the door. The bottom edge of each building is a straight horizontal line with no ground in front.`,
    KEY, NO, STYLE]),
  // K5 : mobilier des places et des ruelles (posé devant, obstacles où l'on tourne autour)
  im('rangs-mobilier', '1536x1024', INPUTS, [
    LOOK,
    `Paint ONE isolated layer with SIX separate street objects arranged in a 3 × 2 grid with wide magenta gaps between them, each ${ROW} with a slight view from above, each standing on its own straight horizontal base line with a soft contact shadow and no ground around it. ${SCALE} Top row: a stone well with a small wooden roof, a winch, a rope and a bucket; a small round fountain with a carved stone basin and a thin stream of water catching the lamplight; a market stall with an ivory canvas awning and crates of fish and fruit. Bottom row: a wooden bench beside a potted olive tree; a handcart loaded with barrels and crates; a street shrine niche on a short stone post with candles and flowers glowing warm amber.`,
    KEY, NO, STYLE]),
];
writeFileSync(process.argv[2], JSON.stringify({ lot: '2026-10-20-v4-rangs', images }, null, 2));
console.log(`${images.length} images`);
