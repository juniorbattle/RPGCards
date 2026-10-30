/**
 * M07 L5 — identité V2 du duelliste joueur (portrait du HUD bas-gauche) : même apparence qu’en V1 (cheveux argent au
 * carré, bandeau aux couleurs de la Signature, manteau de la famille, yeux bleus), redessinée sur le socle commun
 * `../figureV2`. Carré argent à frange balayée en mèches effilées, raie sur le côté, pans qui se recourbent sous la
 * mâchoire ; bandeau d’étoffe à médaillon frappé de l’emblème, dont les pans flottent derrière la tête ; manteau
 * boutonné à patte de couleur, emblème brodé sur la poitrine. La tenue suit la famille de la Signature jouée.
 */
import { drawEmblem } from '../../art/emblems';
import { paletteOf } from '../../art/palette';
import type { Family } from '../../game/catalog/cards';
import { APPARENCE_DEFAUT, CHEVEUX, PEAUX, YEUX, coupeDe, estOrigine, idJoueur, type Apparence, type CoupePortrait } from '../../ville/apparence';
import {
  backCanvasH, canvas, clipped, edgeBand, EYE_CX, fill, mirrored, P, softShade, stroke, taper, torsoCanvasH, translatedPath,
  type BrowShape, type Cubic, type FigureV2Kit,
} from '../figureV2';

/** Peau claire, cheveux argent aux ombres d’acier, yeux bleus (apparence V1 du joueur). */
const C_ORIGINE = {
  skinHi: '#fde6d6', skin: '#f2cdb4', skinShade: '#cf9f88', skinDeep: '#a87262', line: '#4a2a24', lineSoft: '#8c5c50',
  hair: '#dfe2ef', hairShade: '#aab1cb', hairDeep: '#6c7392', hairHi: '#ffffff', hairSheen: '#ffffff', hairRim: '#f2f5ff',
  lash: '#241a20', lashSoft: '#56444c', brow: '#767c98', browHi: '#d2d6e8',
  lipUp: '#b06c62', lipLow: '#c98478', lipHi: '#f0bcae',
  iris: '#4a6fd6', irisDeep: '#16224e', irisLight: '#a9c6ff', irisAmber: '#a6e4ff', pupil: '#06080f',
};
type Couleurs = typeof C_ORIGINE;
/** Couleurs du portrait en cours de dessin : celles d'origine, ou celles de l'apparence choisie (`avec`). */
let C: Couleurs = C_ORIGINE;
/**
 * Coupe du portrait en cours de dessin (`apparence.ts`, `COUPES`) : le carré d'origine, ou une coupe sans pans ni arrière
 * long (le dessous de l'oreille dégagé), avec ses marques : queue de cheval (houppe au-dessus du crâne), chignon bas (sur
 * la nuque, de part et d'autre du cou), courte effilée (longue mèche sur le front), côtés rasés (arrière ras, tempes
 * ombrées), bouclée (contour en boucles).
 */
let COUPE: CoupePortrait = 'carre';
const COURT = () => COUPE !== 'carre';
const avec = <T>(c: Couleurs, coupe: CoupePortrait, f: () => T): T => {
  const [pc, pk] = [C, COUPE];
  C = c;
  COUPE = coupe;
  try { return f(); } finally { C = pc; COUPE = pk; }
};

/** Couleurs d'une apparence (`apparence.ts`) : peau, cheveux et iris ; le trait et les lèvres d'origine. */
function couleursApparence(a: Apparence): Couleurs {
  const p = PEAUX[a.peau]!;
  const h = CHEVEUX[a.cheveux]!;
  const y = YEUX[a.yeux]!;
  return {
    ...C_ORIGINE,
    skinHi: p.hi, skin: p.base, skinShade: p.shade, skinDeep: p.deep,
    hair: h.base, hairShade: h.shade, hairDeep: h.deep, hairHi: h.hi, hairSheen: mix(h.hi, '#ffffff', 0.5), hairRim: mix(h.hi, '#ffffff', 0.3),
    brow: h.deep, browHi: h.shade,
    iris: y.iris, irisDeep: y.deep, irisLight: y.light, irisAmber: y.light,
  };
}

/** Tenue : la famille de la Signature, ou `gris` (sans Signature, deck d'aventure, avenant M10-A : sans emblème). */
export type Tenue = Family | 'gris';

/** Couleurs de tenue dérivées de la palette de la famille (manteau, patte, bandeau). */
function outfit(family: Tenue) {
  const p = paletteOf(family === 'gris' ? null : family);
  return {
    coat: p.mid, coatHi: p.light, coatLight: mix(p.mid, p.light, 0.5), coatShade: mix(p.mid, p.deep, 0.45), coatDeep: p.deep,
    undershirt: mix(p.deep, '#000000', 0.35), trim: p.accent, trimDeep: mix(p.accent, p.mid, 0.55), trimHi: mix(p.accent, '#ffffff', 0.55),
  };
}
type Outfit = ReturnType<typeof outfit>;

function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return `#${((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)}`;
}

// ---------------------------------------------------------------------------------------------------------------
// Formes principales (espace H)

const FACE = 'M128,52 C95,52 61,61 52,95 C46,117 46,141 47,160 C48,181 52,204 62,223 C72,240 94,257 112,265 C120,268.5 136,268.5 144,265 C162,257 184,240 194,223 C204,204 208,181 209,160 C210,141 210,117 204,95 C195,61 161,52 128,52 Z';
/** Pan gauche du carré : encadre la joue, pointes effilées qui se recourbent sous la mâchoire. */
const SIDE = 'M66,64 C58,90 53,122 53,154 C53,180 56,204 62,224 C66,238 70,250 76,266 C72,262 68,258 64,254 C64,260 62,266 58,272 C55,264 52,258 48,252 C46,258 44,262 40,264 C36,246 32,206 32,164 C32,126 34,92 40,64 Z';
/** Frange balayée vers la gauche : mèches dont la pointe penche à gauche, sous le bandeau ; dessus du crâne et raie à droite. */
/** Une mèche longue tombe entre les sourcils ; les autres s’arrêtent au-dessus d’eux (sourcils toujours visibles). */
const NOTCH: Array<[number, number]> = [[42, 98], [62, 82], [88, 78], [112, 76], [142, 76], [168, 78], [194, 82], [214, 88]];
const TIP: Array<[number, number]> = [[45, 117], [66, 112], [94, 111], [121, 125], [150, 105], [176, 101], [203, 97]];
/** Bord gauche (court, bombé) puis bord droit (long, creusé) d’une mèche : de l’encoche à la pointe, puis à l’encoche suivante. */
const lockEdges = (i: number): [Cubic, Cubic] => {
  const [xa, ya] = NOTCH[i]!;
  const [tx, ty] = TIP[i]!;
  const [xb, yb] = NOTCH[i + 1]!;
  return [
    [xa, ya, xa - 2, ya + (ty - ya) * 0.45, tx - 3, ty - (ty - ya) * 0.3, tx, ty],
    [tx, ty, tx + 3, ty - (ty - yb) * 0.45, xb - (xb - tx) * 0.5, yb + 10, xb, yb],
  ];
};
const FRINGE = (() => {
  let d = `M${NOTCH[0]![0]},${NOTCH[0]![1]}`;
  for (let i = 0; i < TIP.length; i++) for (const s of lockEdges(i)) d += ` C${s[2]},${s[3]} ${s[4]},${s[5]} ${s[6]},${s[7]}`;
  return `${d} C222,62 214,34 190,22 C170,12 146,10 128,11 C104,11 78,18 60,34 C44,50 37,74 42,98 Z`;
})();
/** Bandeau d’étoffe, courbé sur le front (au-dessus de la frange). */
const BAND = 'M38,84 C76,62 180,62 218,84 L217,95 C180,74 76,74 39,95 Z';
/** Encolure du manteau : le cou s’arrête sur cette courbe (le buste est derrière). */
const NECKLINE = 'M40,200 L216,200 L216,286 C188,292 158,300 128,302 C98,300 68,292 40,286 Z';

// ---------------------------------------------------------------------------------------------------------------
// Tête : arrière du carré, cou, visage et son modelé (pans, frange et bandeau sont sur la couche des mèches)

function drawHead(): HTMLCanvasElement {
  const { c, ctx } = canvas(256, 312);
  // Arrière du carré : sombre derrière la mâchoire et du côté de l’ombre (occlusion).
  // queue de cheval : houppe au-dessus du crâne, derrière la tête ; chignon bas : sur la nuque, de part et d'autre du cou
  if (COUPE === 'queue') {
    const queue = P('M150,30 C160,4 196,-6 222,8 C214,10 206,16 202,24 C214,24 224,30 230,40 C210,34 188,36 170,44 Z');
    fill(ctx, queue, C.hairShade);
    clipped(ctx, queue, () => { taper(ctx, [160, 26, 180, 10, 200, 6, 218, 10], 0, 3, 0, C.hairHi, 0.7); taper(ctx, [168, 40, 188, 30, 208, 30, 226, 38], 0.2, 1.2, 0.2, C.hairDeep, 0.7); });
  }
  if (COUPE === 'chignon') {
    for (const [cx, s] of [[84, -1], [172, 1]] as const) {
      const chignon = P(`M${cx - 30},236 C${cx - 30},210 ${cx + 30},210 ${cx + 30},236 C${cx + 30},258 ${cx - 30},258 ${cx - 30},236 Z`);
      fill(ctx, chignon, C.hairShade);
      clipped(ctx, chignon, () => taper(ctx, [cx - 20 * s, 222, cx - 6 * s, 216, cx + 8 * s, 218, cx + 20 * s, 228], 0, 3, 0, C.hairHi, 0.6));
    }
  }
  const back = P(COUPE === 'carre'
    ? 'M128,13 C72,11 35,49 31,106 C27,152 30,200 40,238 C44,252 52,262 64,266 L192,266 C204,262 212,252 216,238 C226,200 229,152 225,106 C220,49 184,11 128,13 Z'
    : COUPE === 'rase'
      ? 'M128,14 C80,12 46,44 42,94 C41,106 42,116 46,122 L210,122 C214,116 215,106 214,94 C210,44 176,12 128,14 Z'
      : 'M128,13 C72,11 35,49 31,106 C29,128 32,146 40,158 L216,158 C224,146 227,128 225,106 C220,49 184,11 128,13 Z');
  fill(ctx, back, C.hairShade);
  // bouclée : le contour de l'arrière en boucles
  if (COUPE === 'boucles') {
    for (let k = 0; k <= 12; k++) {
      const t = Math.PI * (0.98 + (k / 12) * 1.04);
      const x = 128 + Math.cos(t) * 102; const y = 112 + Math.sin(t) * 100;
      ctx.beginPath(); ctx.arc(x, y, 17, 0, Math.PI * 2); ctx.fillStyle = C.hairShade; ctx.fill();
      ctx.beginPath(); ctx.arc(x - 4, y - 5, 7, 0, Math.PI * 2); ctx.fillStyle = C.hairHi; ctx.globalAlpha = 0.35; ctx.fill(); ctx.globalAlpha = 1;
    }
  }
  clipped(ctx, back, () => {
    fill(ctx, 'M128,0 L240,0 L240,280 L128,280 Z', C.hairDeep, 0.3);
    fill(ctx, 'M56,190 C76,246 100,266 128,266 C156,266 180,246 200,190 L204,280 L52,280 Z', C.hairDeep, 0.75);
  });
  // Cou, dans l’ombre de la mâchoire, arrêté sur l’encolure.
  clipped(ctx, NECKLINE, () => {
    const neck = P('M102,212 C104,246 102,276 94,310 L162,310 C154,276 152,246 154,212 Z');
    fill(ctx, neck, C.skinShade);
    clipped(ctx, neck, () => {
      fill(ctx, 'M100,256 C105,272 103,290 98,308 L118,308 C114,292 110,274 104,256 Z', C.skin, 0.9);
      fill(ctx, 'M102,226 C114,248 124,260 132,266 C142,260 150,246 154,226 L154,254 C144,264 136,270 128,272 C118,270 108,264 102,254 Z', C.skinDeep, 0.5);
      taper(ctx, [106, 232, 110, 256, 116, 280, 124, 300], 0.2, 0.9, 0.2, C.lineSoft, 0.3);
      taper(ctx, [150, 232, 148, 256, 144, 280, 136, 300], 0.2, 1.1, 0.2, C.skinDeep, 0.4);
    });
  });
  // Visage : aplat, puis modelé en aplats découpés dans la silhouette.
  const face = P(FACE);
  fill(ctx, face, C.skin);
  clipped(ctx, face, () => {
    softShade(ctx, 'M204,70 C208,104 206,132 208,156 C206,170 198,182 188,192 C180,200 174,212 172,226 C170,242 160,258 144,268 L250,300 L250,40 Z', C.skinShade);
    // Ombres portées de la frange, du bandeau et des pans (lumière en haut à gauche).
    // (bouclée : l'ombre douce de la frange de boucles, pas celle des pointes de la frange balayée)
    if (COUPE === 'boucles') fill(ctx, 'M40,104 C80,116 176,116 216,104 L216,122 C176,128 80,128 40,122 Z', C.skinShade, 0.55);
    else fill(ctx, translatedPath(FRINGE, 3, 6), C.skinShade, 0.8);
    fill(ctx, translatedPath(SIDE, 4, 3), C.skinShade, 0.7);
    mirrored(ctx, 128, () => fill(ctx, translatedPath(SIDE, -2, 3), C.skinDeep, 0.5));
    // Orbites : ombre douce sous l’arcade, côté nez.
    for (const [i, cx] of EYE_CX.entries()) {
      const s = i === 0 ? 1 : -1;
      const g = ctx.createRadialGradient(cx + s * 6, 140, 2, cx + s * 4, 142, 30);
      g.addColorStop(0, 'rgba(140,86,76,0.3)');
      g.addColorStop(1, 'rgba(140,86,76,0)');
      fill(ctx, 'M0,100 L256,100 L256,180 L0,180 Z', g);
    }
    fill(ctx, 'M56,188 C64,198 72,212 76,228 C68,216 60,206 54,200 Z', C.skinShade, 0.6);
    // Nez droit : plan d’ombre à droite de l’arête, dessous, narines ; reflets de l’arête et de la pointe.
    fill(ctx, 'M134,148 C138,164 142,180 147,191 C146,198 139,201 132,199 C137,190 137,174 132,158 Z', C.skinShade, 0.95);
    fill(ctx, 'M115,200 C121,205 135,206 143,201 C139,208 120,208 115,200 Z', C.skinDeep, 0.8);
    fill(ctx, 'M117.5,199.6 C118.6,197.6 121.6,197.2 123.4,199 C121.6,200.6 119.2,200.8 117.5,199.6 Z', C.line, 0.65);
    fill(ctx, 'M138.5,199.6 C137.4,197.6 134.4,197.2 132.6,199 C134.4,200.6 136.8,200.8 138.5,199.6 Z', C.line, 0.65);
    fill(ctx, 'M125.4,160 C124.6,170 123.8,180 124.8,188 C126.2,181 127.2,171 127.8,161 Z', C.skinHi, 0.85);
    fill(ctx, 'M121,192.5 C122.8,189.8 127.4,189.4 129.6,191.6 C127.6,193.6 123.4,194 121,192.5 Z', C.skinHi, 0.9);
    taper(ctx, [117.5, 192, 114, 195, 114.8, 199.4, 118.6, 201], 0.4, 1.2, 0.5, C.lineSoft, 0.75);
    // Sillon sous-nasal, ombre sous la lèvre inférieure, menton.
    taper(ctx, [124.6, 205, 124.2, 208, 124.4, 211, 125, 214], 0.2, 0.8, 0.2, C.skinShade, 0.55);
    taper(ctx, [131.4, 205, 131.8, 208, 131.6, 211, 131, 214], 0.2, 0.8, 0.2, C.skinShade, 0.75);
    fill(ctx, 'M117,236 C123,240.4 133,240.4 140,236 C136,242.6 122,243 117,236 Z', C.skinShade, 0.85);
    fill(ctx, 'M117,256 C121,253 130,253 134,256.6 C129,259.4 121,259.4 117,256 Z', C.skinHi, 0.55);
    // Reflets : pommette gauche, front ; joues à peine rosées.
    fill(ctx, 'M54,170 C61,166 71,165.4 80,168 C71,169 63,171.4 56,175 Z', C.skinHi, 0.6);
    fill(ctx, 'M84,96 C96,92 112,91 124,93 C112,96 98,99 88,104 Z', C.skinHi, 0.3);
    for (const [cx, a] of [[78, 0.2], [180, 0.15]] as const) {
      const g = ctx.createRadialGradient(cx, 190, 2, cx, 190, 22);
      g.addColorStop(0, `rgba(226,128,118,${a})`);
      g.addColorStop(1, 'rgba(226,128,118,0)');
      fill(ctx, 'M0,160 L256,160 L256,220 L0,220 Z', g);
    }
  });
  // Contour d’encre effilé : fin du côté éclairé, appuyé sous la mâchoire et du côté de l’ombre.
  const contour: Array<[Cubic, number, number, number]> = [
    [[47, 150, 47.5, 172, 49.5, 192, 54, 206], 0.4, 0.9, 1.1],
    [[54, 206, 56, 213, 59, 218, 62, 223], 1.1, 1.3, 1.5],
    [[62, 223, 72, 240, 94, 257, 112, 265], 1.5, 1.8, 1.6],
    [[112, 265, 120, 268.5, 136, 268.5, 144, 265], 1.6, 1.9, 1.8],
    [[144, 265, 162, 257, 184, 240, 194, 223], 1.8, 2.3, 2.3],
    [[194, 223, 204, 204, 208, 181, 209, 150], 2.3, 2, 0.9],
  ];
  for (const [s, a, b, d] of contour) taper(ctx, s, a, b, d, C.line, 0.85);
  return c;
}

// ---------------------------------------------------------------------------------------------------------------
// Pans du carré, frange balayée et bandeau (couche au-dessus des yeux et des sourcils)

function drawFront(o: Outfit, family: Tenue): HTMLCanvasElement {
  const { c, ctx } = canvas(256, 312);
  const box: [number, number, number, number] = [0, 0, 256, 312];
  // Pans : gauche dans la lumière, droit dans l’ombre avec un liseré de contre-jour.
  const left = P(SIDE);
  const right = new Path2D();
  right.addPath(left, new DOMMatrix([-1, 0, 0, 1, 256, 0]));
  if (!COURT()) fill(ctx, left, C.hair);
  if (!COURT()) clipped(ctx, left, () => {
    edgeBand(ctx, left, -5, -2, C.hairShade, 0.9, box);
    edgeBand(ctx, left, 3, 1, C.hairHi, 0.8, box);
    for (const [s, w] of [[[50, 96, 42, 140, 40, 190, 46, 236], 6], [[56, 120, 52, 160, 52, 200, 58, 240], 3.6]] as Array<[Cubic, number]>) taper(ctx, s, 0.5, w, 0.5, C.hairHi, 0.6);
    for (const s of [[58, 80, 48, 120, 44, 170, 50, 226], [46, 110, 40, 150, 40, 200, 46, 248], [60, 150, 58, 190, 62, 230, 66, 258]] as Cubic[]) taper(ctx, s, 0.2, 1.1, 0.2, C.hairDeep, 0.7);
    for (const [x, y, l] of [[41, 144, 14], [45, 172, 12], [43, 200, 11]] as Array<[number, number, number]>) taper(ctx, [x, y - l / 2, x - 0.4, y - l / 6, x - 0.4, y + l / 6, x, y + l / 2], 0, 3, 0, C.hairSheen, 0.85);
  });
  if (!COURT()) fill(ctx, right, C.hair);
  if (!COURT()) clipped(ctx, right, () => {
    fill(ctx, 'M150,0 L260,0 L260,320 L150,320 Z', C.hairShade, 0.55);
    edgeBand(ctx, right, 5, -2, C.hairShade, 0.9, box);
    edgeBand(ctx, right, -3, 0, C.hairRim, 0.6, box);
    for (const s of [[198, 80, 208, 120, 212, 170, 206, 226], [210, 110, 216, 150, 216, 200, 210, 248], [196, 150, 198, 190, 194, 230, 190, 258]] as Cubic[]) taper(ctx, s, 0.2, 1.1, 0.2, C.hairDeep, 0.75);
    taper(ctx, [206, 120, 212, 150, 213, 180, 210, 210], 0, 2.2, 0, C.hairHi, 0.45);
  });
  // bouclée (retour du responsable, passe 175 : « la frange devant n'est pas bonne ») : pas de frange balayée, une frange
  // de boucles (plus bas)
  if (COUPE !== 'boucles') {
    // Frange balayée, dessus du crâne et raie à droite.
    const fringe = P(FRINGE);
    fill(ctx, fringe, C.hair);
    clipped(ctx, fringe, () => {
      edgeBand(ctx, fringe, -3, -5, C.hairShade, 0.85, box);
      fill(ctx, 'M168,0 L260,0 L260,120 L168,120 Z', C.hairShade, 0.45);
      // Une mèche par pointe, balayée depuis la raie : demi-teinte au cœur, séparation sombre.
      for (let i = 0; i < TIP.length; i++) {
        const [tx, ty] = TIP[i]!;
        const [xb, yb] = NOTCH[i + 1]!;
        taper(ctx, [xb + 14, yb - 34, xb + 2, yb - 10, tx + 7, ty - 16, tx + 1, ty - 1], 0.4, 6, 0.3, C.hairHi, i < 4 ? 0.6 : 0.32);
        taper(ctx, [xb + 14, yb - 36, xb + 4, yb - 12, xb - 1, yb + 4, xb - 4, yb + 12], 0.2, 1.2, 0.2, C.hairDeep, 0.75);
      }
      // Dessus du crâne : mèches qui partent de la raie vers la gauche, reflet en couronne, raie.
      for (const s of [[170, 18, 140, 18, 100, 22, 70, 40], [172, 24, 146, 28, 112, 36, 84, 56], [176, 22, 194, 28, 208, 44, 214, 66]] as Cubic[]) taper(ctx, s, 0.2, 1, 0.2, C.hairDeep, 0.55);
      taper(ctx, [150, 22, 120, 22, 88, 30, 64, 50], 0, 5, 0, C.hairSheen, 0.9);
      for (const [x, y, a, l] of [[112, 26, -0.2, 14], [92, 32, -0.5, 12], [76, 42, -0.8, 11]] as Array<[number, number, number, number]>) {
        const ux = Math.cos(a) * l / 2;
        const uy = Math.sin(a) * l / 2;
        taper(ctx, [x - ux, y - uy, x - ux / 3, y - uy / 3, x + ux / 3, y + uy / 3, x + ux, y + uy], 0, 2.4, 0, C.hairSheen, 0.9);
      }
      taper(ctx, [168, 16, 171, 30, 174, 44, 178, 60], 0.6, 1.6, 0.4, C.skinShade, 0.9);
    });
    // Encre sur les bords des pointes qui passent devant le front.
    for (let i = 0; i < TIP.length; i++) {
      const [a, b] = lockEdges(i);
      taper(ctx, a, 0.3, 0.9, 0.2, C.hairDeep, 0.85);
      taper(ctx, b, 0.2, 1, 0.3, C.hairDeep, 0.85);
    }
  }
  // courte effilée : une longue mèche balayée sur le front, de la raie jusqu'au sourcil
  if (COUPE === 'effilee') {
    const meche = P('M172,22 C130,40 92,82 74,156 C72,166 84,168 88,158 C102,112 128,76 180,46 Z');
    fill(ctx, meche, C.hair);
    clipped(ctx, meche, () => { taper(ctx, [166, 30, 130, 52, 102, 90, 84, 148], 0, 4, 0, C.hairHi, 0.6); edgeBand(ctx, meche, 3, 2, C.hairShade, 0.8, box); });
    taper(ctx, [180, 46, 128, 76, 102, 112, 88, 158], 0.3, 1.2, 0.2, C.hairDeep, 0.85);
  }
  // bouclée : calotte de cheveux, puis boucles sur le crâne, aux tempes et en frange courte sous le bandeau (au-dessus des
  // sourcils), chacune avec son ombre et son reflet, la lumière en haut à gauche
  if (COUPE === 'boucles') {
    const calotte = P('M38,104 C34,52 76,12 128,11 C180,12 222,52 218,104 C190,96 66,96 38,104 Z');
    fill(ctx, calotte, C.hairShade);
    const boucle = (x: number, y: number, r: number) => {
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = C.hair; ctx.fill();
      ctx.beginPath(); ctx.arc(x + r * 0.25, y + r * 0.3, r * 0.75, 0.1 * Math.PI, 1.1 * Math.PI); ctx.fillStyle = C.hairShade; ctx.globalAlpha = 0.6; ctx.fill(); ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.lineWidth = 1.3; ctx.strokeStyle = C.hairDeep; ctx.globalAlpha = 0.75; ctx.stroke(); ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.arc(x - r * 0.32, y - r * 0.36, r * 0.36, 0, Math.PI * 2); ctx.fillStyle = C.hairHi; ctx.globalAlpha = 0.55; ctx.fill(); ctx.globalAlpha = 1;
    };
    // crâne (le bandeau passe par-dessus), puis tempes, puis frange : de l'arrière vers l'avant
    for (const [x, y, r] of [[128, 18, 13], [100, 22, 13], [156, 22, 13], [74, 36, 13], [182, 36, 13], [54, 56, 12], [202, 56, 12], [114, 42, 12], [142, 42, 12], [88, 56, 11], [168, 56, 11]] as const) boucle(x, y, r);
    for (const [x, y, r] of [[44, 82, 12], [212, 82, 12], [40, 106, 11], [216, 106, 11], [44, 128, 9], [212, 128, 9]] as const) boucle(x, y, r);
    for (const [x, y, r] of [[64, 100, 10], [84, 104, 10], [104, 101, 10], [124, 104, 10], [144, 101, 10], [164, 104, 10], [184, 100, 10], [200, 96, 9], [56, 96, 9]] as const) boucle(x, y, r);
  }
  if (!COURT()) {
    for (const s of [[66, 64, 58, 90, 53, 122, 53, 154], [53, 154, 53, 180, 56, 204, 62, 224]] as Cubic[]) taper(ctx, s, 0.3, 1, 0.3, C.hairDeep, 0.8);
    for (const s of [[190, 64, 198, 90, 203, 122, 203, 154], [203, 154, 203, 180, 200, 204, 194, 224]] as Cubic[]) taper(ctx, s, 0.3, 1.2, 0.3, C.hairDeep, 0.85);
    // Cheveux libres sur le bord extérieur des pans.
    for (const s of [[36, 120, 30, 152, 30, 186, 34, 218], [220, 120, 226, 152, 226, 186, 222, 218]] as Cubic[]) taper(ctx, s, 0, 0.8, 0, C.hairHi, 0.55);
  }
  // Bandeau d’étoffe aux couleurs de la Signature, médaillon frappé de l’emblème.
  const band = P(BAND);
  fill(ctx, translatedPath(BAND, 1.5, 3), C.hairDeep, 0.35);
  fill(ctx, band, o.trim);
  clipped(ctx, band, () => {
    fill(ctx, 'M150,50 L240,50 L240,100 L150,100 Z', o.trimDeep, 0.45);
    fill(ctx, 'M30,90 C80,72 176,72 226,90 L226,100 L30,100 Z', o.trimDeep, 0.6);
    taper(ctx, [46, 80, 76, 67, 104, 65, 126, 65], 0, 1.8, 0, o.trimHi, 0.85);
  });
  stroke(ctx, band, C.line, 0.9, 0.55);
  ctx.save();
  ctx.beginPath(); ctx.arc(128, 73, 9.4, 0, Math.PI * 2);
  ctx.fillStyle = o.trimHi; ctx.fill();
  ctx.lineWidth = 1.4; ctx.strokeStyle = o.trimDeep; ctx.stroke();
  ctx.beginPath(); ctx.arc(128, 73, 9.4, Math.PI * 0.15, Math.PI * 0.95);
  ctx.lineWidth = 1.6; ctx.strokeStyle = o.coatShade; ctx.globalAlpha = 0.5; ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = o.coat;
  if (family !== 'gris') drawEmblem(ctx, family, 128, 73, 6.4);
  ctx.restore();
  taper(ctx, [121.6, 67.6, 123.6, 65.6, 126, 64.8, 128.6, 64.6], 0, 1.4, 0, '#ffffff', 0.75);
  return c;
}

// ---------------------------------------------------------------------------------------------------------------
// Pans du bandeau (plan arrière, derrière la tête) et buste

function drawBack(o: Outfit): HTMLCanvasElement {
  const { c, ctx } = backCanvasH();
  // Pans noués derrière la tête, qui flottent à gauche (Kaï, le sien à droite, porte un bandeau large à plaque).
  // Rubans d’étoffe à bout fourchu (lecture « tissu », pas plume).
  for (const [d, col] of [
    ['M46,96 C32,108 22,126 16,150 L22,145 L23,158 C30,140 38,122 50,104 Z', o.trimDeep],
    ['M48,82 C28,82 8,90 -14,104 L-4,107 L-20,116 C0,116 18,108 46,96 Z', o.trim],
  ] as const) {
    fill(ctx, d, col);
    stroke(ctx, d, C.line, 0.9, 0.5);
  }
  taper(ctx, [44, 86, 26, 88, 8, 96, -8, 106], 0, 1.4, 0, o.trimHi, 0.8);
  taper(ctx, [40, 100, 26, 112, 16, 128, 12, 144], 0, 1, 0, o.trimHi, 0.35);
  return c;
}

function drawTorso(o: Outfit, family: Tenue): HTMLCanvasElement {
  const { c, ctx } = torsoCanvasH();
  const body = P('M100,284 C62,290 10,302 -30,320 C-56,332 -70,354 -74,386 L-78,610 L334,610 L330,386 C326,354 312,332 286,320 C246,302 194,290 156,284 Z');
  fill(ctx, body, o.coat);
  clipped(ctx, body, () => {
    fill(ctx, 'M-74,386 C-70,354 -56,332 -30,320 C-44,340 -54,362 -58,394 L-62,610 L-80,610 Z', o.coatHi, 0.85);
    fill(ctx, 'M100,284 C62,290 10,302 -30,320 C-10,316 40,304 98,296 Z', o.coatLight, 0.8);
    fill(ctx, 'M250,302 C290,316 318,336 330,386 L334,610 L262,610 C272,500 272,400 250,302 Z', o.coatShade, 0.85);
    fill(ctx, 'M128,286 L156,286 L170,610 L128,610 Z', o.coatShade, 0.4);
    // Encolure ronde : maillot sombre, liseré de la couleur de la Signature (pas de col montant).
    fill(ctx, 'M98,282 C108,298 118,304 128,304.6 C138,304 148,298 158,282 L164,288 C152,308 140,314 128,314.6 C116,314 104,308 92,288 Z', o.undershirt);
    stroke(ctx, 'M92,288 C104,308 116,314 128,314.6 C140,314 152,308 164,288', o.trim, 1.6, 0.9);
    // Patte de boutonnage et boutons.
    const placket = P('M122.4,314 L133.6,314 L136,610 L120,610 Z');
    fill(ctx, placket, o.trim);
    clipped(ctx, placket, () => fill(ctx, 'M128,300 L140,300 L140,610 L128,610 Z', o.trimDeep, 0.55));
    stroke(ctx, placket, o.coatDeep, 0.9, 0.7);
    for (const y of [330, 352, 374, 396]) {
      fill(ctx, `M147.4,${y} A3.4,3.4 0 1 1 140.6,${y} A3.4,3.4 0 1 1 147.4,${y} Z`, o.trim);
      fill(ctx, `M145.4,${y - 1.2} A1.2,1.2 0 1 1 143,${y - 1.2} A1.2,1.2 0 1 1 145.4,${y - 1.2} Z`, o.trimHi, 0.9);
      stroke(ctx, `M147.4,${y} A3.4,3.4 0 1 1 140.6,${y} A3.4,3.4 0 1 1 147.4,${y} Z`, o.coatDeep, 0.8, 0.8);
    }
    // Emblème de la famille brodé sur la poitrine (à gauche à l’écran), comme en V1.
    ctx.save();
    ctx.beginPath(); ctx.arc(50, 338, 17, 0, Math.PI * 2);
    ctx.fillStyle = o.coatShade; ctx.globalAlpha = 0.55; ctx.fill(); ctx.globalAlpha = 1;
    ctx.lineWidth = 1.6; ctx.strokeStyle = o.trimDeep; ctx.stroke();
    ctx.fillStyle = o.trim;
    if (family !== 'gris') drawEmblem(ctx, family, 50, 338, 12.5);
    ctx.restore();
    // Coutures d’emmanchure et plis.
    for (const s of [[-6, 318, 18, 336, 30, 362, 32, 396], [262, 318, 238, 336, 226, 362, 224, 396]] as Cubic[]) taper(ctx, s, 0.3, 1.4, 0.3, o.coatDeep, 0.7);
    for (const s of [[-24, 340, -30, 380, -32, 430, -30, 480], [282, 340, 288, 380, 290, 430, 288, 480], [70, 330, 74, 380, 76, 430, 74, 480]] as Cubic[]) taper(ctx, s, 0, 4, 0, o.coatDeep, 0.6);
  });
  stroke(ctx, body, o.coatDeep, 2, 0.8);
  return c;
}

const BROWS_JOUEUR: Record<BrowShape, string> = {
  rest: 'M3,15.4 C13,10.6 26,8 39,7.6 C51,7.2 60,8.6 67.6,10.6 C70.2,11.4 70.8,14.4 69.6,16.8 C61,15.2 51,14.4 41,14.4 C28,14.4 15,15.8 3,17.2 Z',
  arch: 'M3,17.6 C11,10.6 24,6.2 38,5.6 C51,5.2 61,7.8 67.8,11.2 C70.4,12.6 70.6,15.6 69.2,18 C60,15.2 50,13.4 40,13.4 C27,13.4 14,15.2 3,18.4 Z',
  knit: 'M3,13.4 C16,10.8 30,10.4 43,11.2 C54,12 62,14.2 68.6,17.2 C70.8,18.4 70.6,21.2 68.8,22.2 C60,19.4 51,17.8 41,17.4 C28,17 15,16.6 3,17 Z',
};

/**
 * Visages du portrait (`apparence.ts`, `VISAGES`), par code : yeux en amande (sourcils fins et droits, paupière basse
 * relevée, départ des cils étiré), rond (sourcils arqués, joues rosées, cils marqués), anguleux (sourcils épais et
 * droits, têtes abaissées, regard plissé). Celui d'origine (0) garde le portrait historique.
 */
const VISAGES_PORTRAIT: Record<number, { brows?: Partial<Record<BrowShape, string>>; moods?: FigureV2Kit['moods']; lashWeight?: number; lashWing?: boolean }> = {
  1: {
    brows: { rest: 'M3,14.6 C16,12.2 30,11.2 43,11.2 C54,11.2 62,12.2 68,13.6 C70,14.4 70.4,16 69.4,17.2 C61,16.4 51,15.8 41,15.8 C28,15.8 15,16.6 3,17.4 Z' },
    moods: { neutral: { squint: 0.45 } }, lashWeight: 1, lashWing: true,
  },
  2: {
    brows: { rest: 'M3,15.6 C11,8.6 24,4.2 38,3.6 C51,3.2 61,5.8 67.8,9.2 C70.4,10.6 70.6,13.6 69.2,16 C60,13.2 50,11.4 40,11.4 C27,11.4 14,13.2 3,16.4 Z' },
    moods: { neutral: { squint: -0.2, flush: 0.22, browL: 0.15, browR: 0.15 } }, lashWeight: 1.15,
  },
  3: {
    brows: { rest: 'M3,14.6 C16,11.8 30,10.8 43,10.8 C54,10.8 62,11.8 68.6,13.4 C71,14.4 71.2,19.6 69.4,21.8 C61,20.6 51,20 41,20 C28,20 15,20.8 3,22.4 Z' },
    moods: { neutral: { browAngle: 0.3, squint: 0.3, browL: -0.1, browR: -0.1 } }, lashWeight: 0.8,
  },
};

const KITS = new Map<string, FigureV2Kit>();

/**
 * Identité V2 du duelliste joueur pour la famille de sa Signature (id `player-<Famille>`, comme `playerFigure`) ;
 * apparence choisie (`apparence.ts`) : peau, cheveux et yeux, coupe courte pour la silhouette B (`player-<Famille>@code`).
 */
export function playerKitV2(family: Tenue, apparence: Apparence = APPARENCE_DEFAUT.a): FigureV2Kit {
  const id = idJoueur(family, apparence);
  const hit = KITS.get(id);
  if (hit) return hit;
  const o = outfit(family);
  const origine = estOrigine(apparence);
  const C = origine ? C_ORIGINE : couleursApparence(apparence);
  const coupe = coupeDe(apparence).portrait;
  const dessin = <T>(f: () => T) => (origine ? f : () => avec(C, coupe, f));
  const visage = VISAGES_PORTRAIT[apparence.visage ?? 0];
  const kit: FigureV2Kit = {
    id,
    colors: {
      skinShade: C.skinShade, line: C.line, lineSoft: C.lineSoft, lash: C.lash, lashSoft: C.lashSoft, brow: C.brow, browHi: C.browHi,
      lipUp: C.lipUp, lipLow: C.lipLow, lipHi: C.lipHi, iris: C.iris, irisDeep: C.irisDeep, irisLight: C.irisLight, irisAmber: C.irisAmber,
      pupil: C.pupil, irisGlow: '170,205,255', lashWeight: visage?.lashWeight ?? 0.9, lashWing: visage?.lashWing ?? false, lashStrands: false,
    },
    brows: visage?.brows ? { ...BROWS_JOUEUR, ...visage.brows } : BROWS_JOUEUR,
    ...(visage?.moods ? { moods: visage.moods } : {}),
    head: dessin(drawHead),
    front: dessin(() => drawFront(o, family)),
    back: dessin(() => drawBack(o)),
    torso: dessin(() => drawTorso(o, family)),
  };
  KITS.set(id, kit);
  return kit;
}
