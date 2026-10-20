// M09 V4 — spécification du lot 3 de la porte du Quai (passe 63, ADR 028, « Profondeur praticable ») pour
// `tools/m09-generer-images.mjs` : deux images ANNONCÉES au responsable avec leurs prompts complets, à générer seulement
// après son accord. Elles remplacent les plans approximatifs des zones arrière du Quai profond : la façade de la rue
// haute peinte à l'échelle des personnages (aujourd'hui le second rang, peint pour être vu de loin) et les murs des
// passages (aujourd'hui dessinés par code). Entrées : la référence approuvée `02.png` et nos bruts (`art-gen/`, dossier
// principal, ignoré par git) ; aucune image de Cité du Tournoi.
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
const im = (name, size, inputs, parts) => ({ name, endpoint: 'edits', inputs, size, quality: 'high', prompt: parts.join('\n\n') });

const images = [
  im('quai-rue-haute', '1536x1024', [REF, ESSAI, `${LOT1}/quai-second-rang.png`, `${LOT1}/quai-facades-ouest.png`], [
    'Use the attached images only as style references: match the painterly look, fine grain, cold stone masonry, half-timbering, night palette and warm amber lantern light of the harbour scene (first image) and of our harbour facades (second and fourth images). The third image shows the houses of the upper street seen from far away: paint them now close up, at the same scale as the harbour facades. Do not copy their composition.',
    `Paint ONE isolated background layer for a side-scrolling 2.5D night harbour town, ${ROW}: a continuous row of five narrow townhouses lining a quiet upper street, spanning the full width of the image, three storeys tall plus their roofs and filling about the lower 70% of the image. Street level at the scale of a person: doors about 120 pixels tall, a cobbler's shopfront with an ivory canvas awning and a lit window display, a small tavern door with a hanging lantern, a narrow covered archway, a closed carriage gate; half-timbered upper storeys with warm lit windows and dark ones, a balcony with flower boxes, steep slate roofs with dormers and chimneys; wall lanterns glowing warm amber at door height; one plain cloth pennant in veil blue without any mark. The bottom edge of the image is a straight horizontal line at the foot of the walls, with no ground, no steps and no cobbles in front.`,
    'Everything above the roofs is a perfectly flat, uniform pure magenta (#FF00FF) background with no shading and no texture: no sky, no clouds, no moon, no distant city.',
    NO, STYLE]),
  im('quai-murs-passage', '1536x1024', [REF, `${LOT1}/quai-facades-ouest.png`, ESSAI], [
    'Use the attached images only as style references: match the painterly look, fine grain, cold stone masonry, half-timbering, night palette and warm amber lantern light of the harbour scene (first image) and of our harbour facades (second and third images). Do not copy their composition.',
    'Paint ONE isolated layer with TWO different side walls of townhouses, side by side, each filling one half of the image, with a narrow vertical magenta gap between them; each wall seen straight on like an architectural elevation (no perspective, no vanishing lines). These are the long side walls that border a narrow passage between houses, about 8 metres long and 10 metres tall, each rising from the bottom edge of the image to about 95% of its height. Left wall: rough cold grey stone ground floor, half-timbered upper storeys, two small warm lit windows, a wooden drainpipe, a wall lantern glowing warm amber at head height near the left. Right wall: plain stone with patched plaster, one shuttered window, iron tie plates, an empty iron sign bracket, a barrel and stacked crates at its foot. The roof of each wall is seen edge-on as a thin eave line along its top. The bottom edge of each wall is a straight horizontal line with no ground in front.',
    'Everything above the walls and in the gap between them is a perfectly flat, uniform pure magenta (#FF00FF) background with no shading and no texture.',
    NO, STYLE]),
];
writeFileSync(process.argv[2], JSON.stringify({ lot: '2026-10-20-v4-quai-3', images }, null, 2));
console.log(`${images.length} images`);
