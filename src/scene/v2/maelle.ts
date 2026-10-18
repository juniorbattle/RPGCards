/**
 * M07 L5 — identité V2 de Maëlle, gardienne des Ronces (validée par le responsable le 2026-10-18) : capuche à revers
 * brodé de ronces, pèlerine à ourlet en feuilles pointues, agrafe de laiton à couronne d’épines, tresse sur l’épaule,
 * frange courte, taches de rousseur, yeux verts à cœur ambré. Socle commun : `../figureV2`.
 */
import { hashString, makeRng } from '../../game/engine/rng';
import { drawEmblem } from '../../art/emblems';
import {
  along, at, canvas, chain, chainPath, clipped, edgeBand, EYE_CX, fill, HOOD_BOX, HOOD_SCALE, mirrored, P, softShade, stroke, taper,
  TORSO_A, TORSO_TY, translatedPath, type Ctx, type Cubic, type FigureV2Kit,
} from '../figureV2';

// ---------------------------------------------------------------------------------------------------------------
// Palette d’identité de Maëlle (verts de la Ronce, peau hâlée, cheveux brun sombre, laiton)

const C = {
  skinHi: '#e6b48e', skin: '#cb906b', skinShade: '#a8694d', skinDeep: '#83493a', blush: '#d4705e',
  line: '#3e1c13', lineSoft: '#6e3527', freckle: '#8a4630',
  hair: '#3b2a1a', hairShade: '#25180f', hairDeep: '#150c07', hairHi: '#7c5838', hairSheen: '#c89a64', hairRim: '#c89c66',
  hood: '#1f5230', hoodLight: '#2e7140', hoodHi: '#56a35a', hoodShade: '#133821', hoodDeep: '#0a2013',
  lining: '#0b1610', liningHi: '#1c3324', trim: '#d4ec7a', trimDeep: '#86a845',
  cloak: '#163522', cloakShade: '#0c2215', cloakHi: '#2b5a37',
  tunic: '#4a3220', tunicShade: '#2c1d11', leather: '#5c3b22', leatherHi: '#94663c',
  bronze: '#b48a3c', bronzeHi: '#f2d690', bronzeDeep: '#5e4218',
  sclera: '#f4ede6', scleraShade: '#b9a39a', caruncle: '#d68a7e', lash: '#190d09', lashSoft: '#4a2a1c',
  iris: '#4f9a4a', irisDeep: '#173419', irisLight: '#a3d47a', irisAmber: '#cfa64c', pupil: '#0a0806',
  brow: '#3a2616', browHi: '#7a5534',
  lipUp: '#9c4b3f', lipLow: '#b8604f', lipHi: '#e09a82', mouthIn: '#3a1110', teeth: '#f2eadf', teethShade: '#cfc2b4', tongue: '#b04a44',
};

// ---------------------------------------------------------------------------------------------------------------
// Formes principales (espace H)

const FACE = 'M128,52 C96,52 62,62 52,96 C46,118 46,142 47,160 C48,180 52,204 64,226 C74,242 98,258 116,266 C122,269 134,269 140,266 C158,258 182,242 192,226 C204,204 208,180 209,160 C210,142 210,118 204,96 C194,62 160,52 128,52 Z';
/** Ouverture de la capuche (bord intérieur), qui se croise sous le menton, à l’agrafe. */
const RIM_IN = chain([128, 6, 82, 8, 34, 46, 22, 118, 14, 168, 26, 222, 60, 262, 82, 284, 106, 294, 128, 296, 150, 294, 174, 284, 196, 262, 230, 222, 242, 168, 234, 118, 222, 46, 174, 8, 128, 6]);
const RIM_OUT = chain([128, -10, 72, -8, 18, 36, 6, 116, -2, 170, 10, 230, 48, 276, 76, 302, 106, 312, 128, 314, 150, 312, 180, 302, 208, 276, 246, 230, 258, 170, 250, 116, 238, 36, 184, -8, 128, -10]);
const RIM_MID = RIM_IN.map((s, i) => s.map((v, k) => (v + RIM_OUT[i]![k]!) / 2) as Cubic);
const CLASP = { x: 128, y: 294 };

/** Mèches avant : frange courte écartée par la raie (les sourcils restent visibles, même haussés), pans le long des joues. */
const LEFT_FRONT = 'M127,22 C104,22 80,30 64,46 C48,62 38,86 34,112 C30,146 32,186 38,220 C42,244 48,264 56,282 C56,262 56,244 54,226 C52,206 48,186 47,166 C46,146 46,124 49,106 C52,94 58,84 68,76 C68,84 67,90 63,97 C73,86 82,76 93,68 C90,76 89,82 90,88 C97,74 107,62 118,54 C122,50 125,45 127,40 Z';
const RIGHT_FRONT = 'M129,22 C152,22 176,30 192,46 C208,62 218,86 222,112 C226,146 224,182 218,212 C214,232 208,250 204,266 C202,250 204,232 205,216 C207,196 209,178 209,160 C209,140 209,122 206,106 C203,94 197,84 188,76 C188,84 189,90 193,97 C183,86 174,76 163,68 C166,76 167,82 166,88 C159,74 149,62 138,54 C134,50 131,45 129,40 Z';

// ---------------------------------------------------------------------------------------------------------------
// Tête : cheveux arrière, cou, visage et son modelé (les mèches avant sont une couche à part, au-dessus des yeux)

function drawHead(seed: number): HTMLCanvasElement {
  const { c, ctx } = canvas(256, 312);
  const rimIn = chainPath(RIM_IN);
  // Cheveux arrière, dans l’ouverture de la capuche : sombres vers le bord (occlusion), plus clairs au sommet.
  clipped(ctx, rimIn, () => {
    const back = P('M128,16 C70,14 30,56 26,118 C22,172 34,226 64,268 C76,284 90,292 104,298 L152,298 C166,292 180,284 192,268 C222,226 234,172 230,118 C226,56 186,14 128,16 Z');
    fill(ctx, back, C.hair);
    clipped(ctx, back, () => {
      fill(ctx, 'M128,0 L300,0 L300,320 L128,320 Z', C.hairShade, 0.55);
      stroke(ctx, rimIn, C.hairDeep, 22, 0.5);
      fill(ctx, 'M60,250 C80,276 100,290 128,296 C156,290 176,276 196,250 L200,320 L56,320 Z', C.hairDeep, 0.6);
      for (const s of [[96, 22, 60, 40, 40, 90, 38, 150], [160, 22, 196, 40, 216, 90, 218, 150], [72, 40, 44, 80, 34, 140, 40, 210], [184, 40, 212, 80, 222, 140, 216, 210]] as Cubic[]) taper(ctx, s, 0.2, 1.1, 0.2, C.hairDeep, 0.7);
      taper(ctx, [116, 20, 96, 22, 78, 30, 64, 42], 0, 2.4, 0, C.hairHi, 0.7);
      // Mèches du dessus et des côtés, reflet en couronne : la chevelure arrière n’est plus un aplat sombre.
      for (const s of [[118, 18, 92, 22, 66, 40, 50, 70], [138, 18, 164, 22, 190, 40, 206, 70], [56, 60, 40, 100, 34, 150, 40, 200], [200, 60, 216, 100, 222, 150, 216, 200], [44, 120, 34, 160, 36, 200, 50, 240], [212, 120, 222, 160, 220, 200, 206, 240]] as Cubic[]) taper(ctx, s, 0, 3.4, 0, C.hairHi, 0.6);
      taper(ctx, [92, 20, 110, 15, 146, 15, 164, 20], 0, 2.6, 0, C.hairSheen, 0.55);
    });
    // Cou, dans l’ombre de la tête ; flanc gauche éclairé ; base dans l’ombre du col.
    const neck = P('M100,212 C102,246 100,276 92,308 L164,308 C156,276 154,246 156,212 Z');
    fill(ctx, neck, C.skinShade);
    clipped(ctx, neck, () => {
      fill(ctx, 'M98,262 C103,278 101,294 96,308 L118,308 C114,292 108,276 102,262 Z', C.skin, 0.9);
      const base = ctx.createLinearGradient(0, 274, 0, 297);
      base.addColorStop(0, 'rgba(70,30,22,0)');
      base.addColorStop(1, 'rgba(70,30,22,0.55)');
      fill(ctx, 'M80,280 L176,280 L176,312 L80,312 Z', base);
      taper(ctx, [106, 234, 110, 256, 116, 280, 124, 302], 0.2, 0.9, 0.2, C.lineSoft, 0.35);
      taper(ctx, [150, 234, 148, 256, 144, 280, 136, 302], 0.2, 1.1, 0.2, C.skinDeep, 0.4);
    });
  });

  // Visage : aplat de base, puis modelé en aplats découpés dans la silhouette.
  const face = P(FACE);
  fill(ctx, face, C.skin);
  clipped(ctx, face, () => {
    // Plan d’ombre du côté droit : tempe, pommette, creux sous la pommette, mâchoire.
    softShade(ctx, 'M204,70 C208,104 206,132 208,156 C206,170 198,182 188,192 C180,200 174,212 172,226 C170,242 160,258 144,268 L250,300 L250,40 Z', C.skinShade);
    // Ombres portées des mèches et de la frange (lumière en haut à gauche → décalage vers le bas et la droite).
    fill(ctx, translatedPath(LEFT_FRONT, 3, 5), C.skinShade, 0.8);
    fill(ctx, translatedPath(RIGHT_FRONT, 2, 5), C.skinDeep, 0.55);
    // Orbites : ombre douce sous l’arcade, côté nez.
    for (const [i, cx] of EYE_CX.entries()) {
      const s = i === 0 ? 1 : -1;
      const g = ctx.createRadialGradient(cx + s * 6, 140, 2, cx + s * 4, 142, 30);
      g.addColorStop(0, 'rgba(130,70,50,0.32)');
      g.addColorStop(1, 'rgba(130,70,50,0)');
      fill(ctx, 'M0,100 L256,100 L256,180 L0,180 Z', g);
    }
    // Creux sous la pommette gauche, côté éclairé (fin croissant).
    fill(ctx, 'M56,188 C64,198 72,212 76,228 C68,216 60,206 54,200 Z', C.skinShade, 0.7);
    // Nez : plan d’ombre à droite de l’arête, dessous du nez, narines ; reflets de l’arête et de la pointe.
    fill(ctx, 'M134,148 C138,164 142,180 147,191 C146,198 139,201 132,199 C137,190 137,174 132,158 Z', C.skinShade);
    fill(ctx, 'M115,200 C121,205 135,206 143,201 C139,208 120,208 115,200 Z', C.skinDeep, 0.85);
    fill(ctx, 'M117.5,199.6 C118.6,197.6 121.6,197.2 123.4,199 C121.6,200.6 119.2,200.8 117.5,199.6 Z', C.line, 0.75);
    fill(ctx, 'M138.5,199.6 C137.4,197.6 134.4,197.2 132.6,199 C134.4,200.6 136.8,200.8 138.5,199.6 Z', C.line, 0.75);
    fill(ctx, 'M125.4,160 C124.6,170 123.8,180 124.8,188 C126.2,181 127.2,171 127.8,161 Z', C.skinHi, 0.75);
    fill(ctx, 'M121,192.5 C122.8,189.8 127.4,189.4 129.6,191.6 C127.6,193.6 123.4,194 121,192.5 Z', C.skinHi, 0.85);
    taper(ctx, [117.5, 192, 114, 195, 114.8, 199.4, 118.6, 201], 0.4, 1.3, 0.5, C.lineSoft, 0.8);
    // Sillon sous-nasal, ombre sous la lèvre inférieure, menton.
    taper(ctx, [124.6, 205, 124.2, 208, 124.4, 211, 125, 214], 0.2, 0.9, 0.2, C.skinShade, 0.6);
    taper(ctx, [131.4, 205, 131.8, 208, 131.6, 211, 131, 214], 0.2, 0.9, 0.2, C.skinShade, 0.8);
    fill(ctx, 'M117,236 C123,240.4 133,240.4 140,236 C136,242.6 122,243 117,236 Z', C.skinShade, 0.9);
    fill(ctx, 'M117,256 C121,253 130,253 134,256.6 C129,259.4 121,259.4 117,256 Z', C.skinHi, 0.5);
    // Reflets : pommette gauche, front.
    fill(ctx, 'M54,170 C61,166 71,165.4 80,168 C71,169 63,171.4 56,175 Z', C.skinHi, 0.4);
    fill(ctx, 'M84,72 C94,67 110,66 122,69 C110,72 96,75 88,80 Z', C.skinHi, 0.22);
    // Joues : rose discret (permanent), puis taches de rousseur sur l’arête du nez et les pommettes.
    for (const [cx, a] of [[76, 0.3], [182, 0.22]] as const) {
      const g = ctx.createRadialGradient(cx, 190, 2, cx, 190, 22);
      g.addColorStop(0, `rgba(212,112,94,${a})`);
      g.addColorStop(1, 'rgba(212,112,94,0)');
      fill(ctx, 'M0,160 L256,160 L256,220 L0,220 Z', g);
    }
    const rng = makeRng(hashString(`maelle-v2|freckles|${seed}`));
    for (let i = 0; i < 46; i++) {
      const s = rng() < 0.5 ? -1 : 1;
      const d = Math.pow(rng(), 0.8) * 58; // plus denses près de l’arête du nez
      const x = 128 + s * (6 + d);
      const y = 172 + d * 0.16 + rng() * 14 - (d < 14 ? 8 : 0);
      if (Math.abs(x - 128) < 9 && y > 186) continue; // pas sur la pointe du nez
      const r = 0.55 + rng() * 0.75;
      ctx.save();
      ctx.globalAlpha = 0.45 + rng() * 0.35;
      ctx.fillStyle = C.freckle;
      ctx.beginPath();
      ctx.ellipse(x, y, r * 1.15, r * 0.9, rng() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  });
  // Contour d’encre effilé : fin du côté éclairé, appuyé sous la mâchoire et du côté de l’ombre.
  const contour: Array<[Cubic, number, number, number]> = [
    [[47, 150, 47, 168, 49, 186, 52, 200], 0.4, 0.9, 1.1],
    [[52, 200, 55, 210, 59, 219, 64, 226], 1.1, 1.3, 1.5],
    [[64, 226, 74, 242, 98, 258, 116, 266], 1.5, 1.8, 1.5],
    [[116, 266, 122, 269, 134, 269, 140, 266], 1.5, 1.9, 1.8],
    [[140, 266, 158, 258, 182, 242, 192, 226], 1.8, 2.4, 2.4],
    [[192, 226, 204, 204, 208, 180, 209, 150], 2.4, 2.1, 1.0],
  ];
  for (const [s, a, b, d] of contour) taper(ctx, s, a, b, d, C.line, 0.85);
  // L’agrafe de la capuche passe devant le cou.
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(CLASP.x, CLASP.y, 15.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  return c;
}

// ---------------------------------------------------------------------------------------------------------------
// Mèches avant et frange (couche au-dessus des yeux et des sourcils)

function drawFront(): HTMLCanvasElement {
  const { c, ctx } = canvas(256, 312);
  const box: [number, number, number, number] = [0, 0, 256, 312];
  const left = P(LEFT_FRONT);
  const right = P(RIGHT_FRONT);
  // Masse gauche (côté de la lumière).
  fill(ctx, left, C.hair);
  clipped(ctx, left, () => {
    edgeBand(ctx, left, -5, -3, C.hairShade, 0.9, box);
    edgeBand(ctx, left, 3, 2, C.hairHi, 0.75, box);
    // Mèches (demi-teinte au cœur de chaque mèche), séparations, puis reflets en tirets sur deux bandes lustrées.
    const clumps: Array<[Cubic, number]> = [
      [[120, 28, 100, 34, 84, 50, 72, 70], 6], [[112, 44, 98, 54, 88, 68, 82, 86], 4.6], [[100, 34, 84, 42, 70, 56, 60, 80], 4],
      [[58, 96, 44, 128, 40, 168, 44, 210], 6.4], [[50, 150, 48, 188, 50, 226, 54, 264], 4.4], [[44, 110, 38, 140, 36, 170, 38, 200], 3.6],
    ];
    for (const [s, w] of clumps) taper(ctx, s, 0.5, w, 0.5, C.hairHi, 0.7);
    const strands: Cubic[] = [
      [122, 28, 98, 34, 76, 54, 62, 84], [114, 44, 96, 54, 82, 72, 74, 96], [106, 36, 90, 44, 76, 60, 66, 82], [64, 52, 46, 80, 38, 120, 38, 160],
      [58, 92, 46, 130, 44, 180, 50, 230], [50, 160, 50, 200, 52, 240, 56, 280], [52, 104, 42, 140, 40, 176, 44, 214],
    ];
    for (const s of strands) taper(ctx, s, 0.2, 1.15, 0.2, C.hairDeep, 0.85);
    const dashes: Array<[number, number, number, number]> = [
      [108, 37, -2.6, 13], [96, 45, -2.2, 12], [86, 54, -2, 11], [78, 64, -1.9, 10],
      [41, 140, -1.62, 14], [47, 150, -1.6, 12], [38, 168, -1.56, 12],
    ];
    for (const [x, y, a, l] of dashes) {
      const ux = Math.cos(a) * l / 2;
      const uy = -Math.sin(a) * l / 2;
      taper(ctx, [x - ux, y - uy, x - ux / 3, y - uy / 3, x + ux / 3, y + uy / 3, x + ux, y + uy], 0, 3.2, 0, C.hairSheen, 0.9);
    }
  });
  // Masse droite (côté de l’ombre) : plus sombre, liseré de contre-jour sur le bord extérieur.
  fill(ctx, right, C.hair);
  clipped(ctx, right, () => {
    fill(ctx, 'M150,0 L260,0 L260,320 L150,320 Z', C.hairShade, 0.45);
    edgeBand(ctx, right, 5, -3, C.hairShade, 0.9, box);
    edgeBand(ctx, right, -3, 0, C.hairRim, 0.55, box);
    const clumps: Array<[Cubic, number]> = [
      [[136, 28, 156, 34, 172, 50, 184, 70], 5.6], [[144, 44, 158, 54, 168, 68, 174, 86], 4.2], [[198, 96, 212, 128, 216, 168, 212, 210], 5.6], [[206, 150, 208, 188, 206, 222, 204, 256], 3.8],
    ];
    for (const [s, w] of clumps) taper(ctx, s, 0.5, w, 0.5, C.hairHi, 0.42);
    taper(ctx, [138, 30, 150, 34, 160, 42, 168, 52], 0, 2.2, 0, C.hairHi, 0.7);
    taper(ctx, [146, 42, 156, 48, 164, 56, 170, 66], 0, 1.6, 0, C.hairHi, 0.55);
    const strands: Cubic[] = [[134, 28, 158, 34, 180, 54, 194, 84], [142, 44, 160, 54, 174, 72, 182, 96], [150, 36, 166, 44, 180, 60, 190, 82], [192, 52, 210, 80, 218, 120, 218, 160], [198, 92, 210, 130, 212, 180, 208, 226], [204, 104, 214, 140, 216, 176, 212, 214]];
    for (const s of strands) taper(ctx, s, 0.2, 1.15, 0.2, C.hairDeep, 0.85);
    for (const [x, y, a, l] of [[150, 38, -0.6, 12], [162, 48, -0.8, 11], [214, 140, -1.5, 12], [212, 160, -1.56, 10]] as Array<[number, number, number, number]>) {
      const ux = Math.cos(a) * l / 2;
      const uy = Math.sin(a) * l / 2;
      taper(ctx, [x - ux, y + uy, x - ux / 3, y + uy / 3, x + ux / 3, y - uy / 3, x + ux, y - uy], 0, 2, 0, C.hairSheen, 0.45);
    }
  });
  // Quelques cheveux libres sur le bord extérieur des pans (la silhouette n’est plus un bloc).
  for (const s of [[38, 120, 30, 150, 29, 182, 34, 214], [40, 200, 37, 226, 40, 250, 46, 270], [222, 120, 228, 150, 228, 182, 222, 210]] as Cubic[]) taper(ctx, s, 0, 0.8, 0, C.hairHi, 0.6);
  // Raie : la peau du crâne en fine encoche.
  fill(ctx, 'M127.2,23 L128.8,23 L128.5,38 L127.5,38 Z', C.skinShade, 0.85);
  // Encre sur les bords qui passent devant le visage.
  for (const s of [[49, 106, 46, 124, 46, 146, 47, 166], [47, 166, 48, 186, 52, 206, 54, 226], [68, 76, 68, 84, 67, 90, 63, 97], [93, 68, 90, 76, 89, 82, 90, 88]] as Cubic[]) taper(ctx, s, 0.3, 1.1, 0.3, C.hairDeep, 0.9);
  for (const s of [[206, 106, 209, 122, 209, 140, 209, 160], [209, 160, 209, 178, 207, 196, 205, 216], [188, 76, 188, 84, 189, 90, 193, 97], [163, 68, 166, 76, 167, 82, 166, 88]] as Cubic[]) taper(ctx, s, 0.3, 1.2, 0.3, C.hairDeep, 0.9);
  // Mèche folle sur le front, du côté de la lumière.
  taper(ctx, [117, 40, 110, 56, 105, 74, 104, 94], 0.6, 2.6, 0.2, C.hair, 1);
  taper(ctx, [116, 44, 110, 58, 106, 72, 105, 86], 0, 0.9, 0, C.hairSheen, 0.7);
  return c;
}

// ---------------------------------------------------------------------------------------------------------------
// Capuche, pèlerine, agrafe et tresse (plan derrière la tête, devant le buste)

function hoodOuter(): Path2D {
  const p = new Path2D();
  p.moveTo(134, -38);
  p.bezierCurveTo(118, -32, 82, -22, 58, -2);
  p.bezierCurveTo(22, 28, 0, 78, -10, 140);
  p.bezierCurveTo(-16, 186, -16, 232, -26, 268);
  p.bezierCurveTo(-38, 300, -56, 326, -62, 350);
  hem(p, [-62, 350, -52, 380, 20, 396, 72, 388], 5);
  p.bezierCurveTo(88, 362, 108, 326, 122, 306);
  p.lineTo(134, 306);
  p.bezierCurveTo(148, 326, 168, 362, 184, 388);
  hem(p, [184, 388, 236, 396, 308, 380, 318, 350], 5);
  p.bezierCurveTo(312, 326, 294, 300, 282, 268);
  p.bezierCurveTo(272, 232, 272, 186, 266, 140);
  p.bezierCurveTo(256, 78, 234, 28, 198, -2);
  p.bezierCurveTo(176, -20, 150, -32, 134, -38);
  p.closePath();
  return p;
}

/** Ourlet de la pèlerine découpé en feuilles pointues (crans), le long d’une cubique de base. */
function hem(p: Path2D, base: Cubic, n: number, depth = 11): void {
  for (let i = 0; i < n; i++) {
    const [x0, y0] = at(base, i / n);
    const [x1, y1] = at(base, (i + 1) / n);
    const [xm, ym, dx, dy] = at(base, (i + 0.5) / n);
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    // normale orientée vers le bas (extérieur de la pèlerine)
    let nx = -uy;
    let ny = ux;
    if (ny < 0) { nx = -nx; ny = -ny; }
    const tx = xm + nx * depth + ux * 2;
    const ty = ym + ny * depth + uy * 2;
    p.bezierCurveTo(x0 + (xm - x0) * 0.4 + nx * 2, y0 + (ym - y0) * 0.4 + ny * 2, tx - ux * 5 - nx * 2, ty - uy * 5 - ny * 2, tx, ty);
    p.bezierCurveTo(tx - nx * 3 + ux * 1.5, ty - ny * 3 + uy * 1.5, x1 - (x1 - xm) * 0.3 + nx, y1 - (y1 - ym) * 0.3 + ny, x1, y1);
  }
}

function drawHood(): HTMLCanvasElement {
  const B = HOOD_BOX;
  const { c, ctx } = canvas((B.u1 - B.u0) * HOOD_SCALE, (B.v1 - B.v0) * HOOD_SCALE);
  ctx.scale(HOOD_SCALE, HOOD_SCALE);
  ctx.translate(-B.u0, -B.v0);
  const box: [number, number, number, number] = [B.u0, B.v0, B.u1, B.v1];
  const outer = hoodOuter();
  const rimIn = chainPath(RIM_IN);
  const rimOut = chainPath(RIM_OUT);
  // Étoffe extérieure : aplat, plan éclairé à gauche, plan d’ombre à droite, plis.
  fill(ctx, outer, C.hood);
  clipped(ctx, outer, () => {
    fill(ctx, 'M60,-6 C24,24 2,74 -8,138 C-14,184 -16,230 -26,268 C-40,300 -56,326 -62,350 L-30,366 C-20,320 -6,280 4,236 C12,190 18,140 30,96 C40,56 52,24 70,-4 Z', C.hoodLight);
    taper(ctx, [56, 2, 30, 36, 14, 86, 6, 138], 0, 4.5, 0, C.hoodHi, 0.6);
    taper(ctx, [2, 170, -2, 210, -10, 246, -20, 276], 0, 3, 0, C.hoodHi, 0.4);
    fill(ctx, 'M168,-30 C214,-6 244,46 256,110 C266,166 270,224 284,266 C296,300 316,330 324,356 L360,430 L232,430 C250,380 262,330 262,280 C262,220 252,150 236,96 C220,44 196,4 168,-30 Z', C.hoodShade);
    for (const [s, w, col, a] of [
      [[14, 70, 4, 110, -2, 160, -6, 210], 3, C.hoodShade, 0.8], [[246, 60, 256, 116, 260, 170, 264, 222], 3.5, C.hoodDeep, 0.7],
      [[-22, 268, -32, 292, -46, 318, -56, 344], 3, C.hoodDeep, 0.5], [[280, 268, 290, 292, 304, 318, 312, 344], 3, C.hoodDeep, 0.65],
      [[-6, 300, -10, 330, -14, 356, -18, 384], 4, C.hoodShade, 0.75], [[30, 318, 28, 344, 30, 366, 34, 390], 3.5, C.hoodShade, 0.6],
      [[226, 318, 228, 344, 226, 366, 222, 392], 3.5, C.hoodDeep, 0.6], [[268, 300, 272, 330, 276, 356, 280, 382], 4, C.hoodDeep, 0.7],
    ] as Array<[Cubic, number, string, number]>) taper(ctx, s, 0, w, 0, col, a);
    // Ombre portée par le revers de la capuche (vers le bas et la droite).
    ctx.save();
    ctx.translate(4, 5);
    stroke(ctx, rimOut, C.hoodDeep, 10, 0.4);
    ctx.restore();
    // Bas de la pèlerine dans l’ombre de la table et du buste.
    const g = ctx.createLinearGradient(0, 330, 0, 400);
    g.addColorStop(0, 'rgba(6,18,10,0)');
    g.addColorStop(1, 'rgba(6,18,10,0.55)');
    fill(ctx, 'M-100,320 L360,320 L360,430 L-100,430 Z', g);
  });
  // Doublure, dans l’ouverture : très sombre, lumière rasante sur le bord gauche.
  fill(ctx, rimIn, C.lining);
  fill(ctx, 'M22,118 C30,60 76,12 128,8 C88,20 48,62 36,120 C30,170 36,226 62,268 C40,236 18,180 22,118 Z', C.liningHi, 0.8);
  // Revers (bord de la capuche) : bande claire, ombrée à droite, liseré et broderie de ronces.
  const band = new Path2D();
  band.addPath(rimOut);
  band.addPath(rimIn);
  ctx.save();
  ctx.fillStyle = C.hoodLight;
  ctx.fill(band, 'evenodd');
  ctx.clip(band, 'evenodd');
  fill(ctx, 'M150,-16 C202,-2 246,50 256,116 C264,182 246,248 206,292 L170,330 L360,330 L360,-30 Z', C.hood);
  fill(ctx, 'M60,-4 C30,24 12,70 8,118 L22,118 C26,74 44,34 74,8 Z', C.hoodHi, 0.5);
  stroke(ctx, rimIn, C.hoodDeep, 5, 0.75);
  ctx.restore();
  vine(ctx, RIM_MID, 15);
  stroke(ctx, rimOut, C.trim, 1.6, 0.9);
  stroke(ctx, rimIn, C.trimDeep, 1.1, 0.8);
  // Bords de l’ouverture de la pèlerine sous l’agrafe (le buste se voit entre eux).
  const frontEdge = (col: string) => {
    fill(ctx, 'M120,304 C106,326 88,360 72,388 L83,390 C97,364 112,334 127,310 Z', col);
    stroke(ctx, 'M83,390 C97,364 112,334 127,310', C.trim, 1.4, 0.85);
  };
  frontEdge(C.hoodLight);
  mirrored(ctx, 128, () => frontEdge(C.hood));
  // Liseré de l’ourlet et épines.
  for (const base of [[-62, 350, -52, 380, 20, 396, 72, 388], [184, 388, 236, 396, 308, 380, 318, 350]] as Cubic[]) {
    const pts = along([base], 6);
    const lp = new Path2D();
    pts.forEach((q, i) => { const y = q.y - 3; if (i === 0) lp.moveTo(q.x, y); else lp.lineTo(q.x, y); });
    stroke(ctx, lp, C.trim, 1.3, 0.8);
  }
  // Contour d’encre de la silhouette (sépare du contre-jour).
  stroke(ctx, outer, C.hoodDeep, 2.2, 0.7);
  clasp(ctx);
  braid(ctx);
  return c;
}

/** Broderie de ronces le long du revers : tige ondulée, feuilles alternées, épines. */
function vine(ctx: Ctx, mid: Cubic[], step: number): void {
  const pts = along(mid, 2);
  const stem = new Path2D();
  pts.forEach((q, i) => {
    const w = Math.sin(i * (2 * Math.PI / (step / 2))) * 2.4;
    const x = q.x + q.nx * w;
    const y = q.y + q.ny * w;
    if (i === 0) stem.moveTo(x, y); else stem.lineTo(x, y);
  });
  // la broderie s’interrompt sous l’agrafe
  ctx.save();
  ctx.beginPath();
  ctx.rect(-200, -100, 600, 600);
  ctx.arc(CLASP.x, CLASP.y, 20, 0, Math.PI * 2, true);
  ctx.clip();
  stroke(ctx, stem, C.trim, 1.1, 0.8);
  const marks = along(mid, step);
  marks.forEach((q, i) => {
    const s = i % 2 ? 1 : -1;
    const ang = Math.atan2(q.ny, q.nx) * 1;
    ctx.save();
    ctx.translate(q.x + q.nx * s * 2.6, q.y + q.ny * s * 2.6);
    ctx.rotate(ang + (s > 0 ? 0.5 : Math.PI - 0.5));
    fill(ctx, 'M0,0 C2,-2.6 6,-2.6 8,0 C6,2.6 2,2.6 0,0 Z', i % 3 === 0 ? C.trim : C.trimDeep, 0.9);
    ctx.restore();
    ctx.save();
    ctx.translate(q.x - q.nx * s * 2.2, q.y - q.ny * s * 2.2);
    ctx.rotate(ang + (s > 0 ? Math.PI : 0));
    fill(ctx, 'M0,-1.1 L3.4,0 L0,1.1 Z', C.trim, 0.85);
    ctx.restore();
  });
  ctx.restore();
}

/** Agrafe de laiton à la gorge : anneau d’épines autour de l’emblème de la Ronce, deux feuilles. */
function clasp(ctx: Ctx): void {
  const { x, y } = CLASP;
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.translate(x + s * 13, y - 2);
    ctx.scale(s, 1);
    ctx.rotate(-0.35);
    fill(ctx, 'M0,0 C4,-5 11,-6 16,-2 C11,2 5,3 0,0 Z', C.hoodHi);
    stroke(ctx, 'M1,0 C6,-1.6 10,-2 15,-2', C.hoodDeep, 0.7, 0.8);
    ctx.restore();
  }
  ctx.save();
  ctx.translate(x, y);
  for (let i = 0; i < 9; i++) {
    ctx.save();
    ctx.rotate((i / 9) * Math.PI * 2 + 0.2);
    fill(ctx, 'M-2.6,-8.6 L0,-14.6 L2.6,-8.6 Z', C.bronze);
    fill(ctx, 'M-1.2,-9 L0,-14.6 L0.6,-9 Z', C.bronzeHi, 0.6);
    ctx.restore();
  }
  ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.fillStyle = C.bronze; ctx.fill();
  ctx.lineWidth = 1; ctx.strokeStyle = C.bronzeDeep; ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, 7.2, 0, Math.PI * 2);
  ctx.fillStyle = C.hoodDeep; ctx.fill();
  ctx.beginPath(); ctx.arc(0, 0, 9, Math.PI * 1.05, Math.PI * 1.6);
  ctx.lineWidth = 1.4; ctx.strokeStyle = C.bronzeHi; ctx.globalAlpha = 0.85; ctx.stroke(); ctx.globalAlpha = 1;
  ctx.fillStyle = C.trim;
  drawEmblem(ctx, 'Ronce', 0, 0, 5.2);
  ctx.restore();
}

/** Tresse sur l’épaule gauche de Maëlle (à droite à l’écran), posée sur la pèlerine. */
function braid(ctx: Ctx): void {
  const line: Cubic = [204, 254, 214, 294, 226, 338, 229, 384];
  const n = 11;
  // Brins alternés, chacun sortant de sous le précédent (dessinés de haut en bas) ; ombre là où le suivant le recouvre.
  for (let i = 0; i < n; i++) {
    const t = 0.03 + i * 0.087;
    const [x, y, dx, dy] = at(line, t);
    const s = i % 2 ? 1 : -1;
    const w = 23 - i * 0.7;
    const h = 17 - i * 0.4;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.atan2(dy, dx) - Math.PI / 2);
    ctx.scale(s, 1);
    ctx.rotate(0.32);
    const lobe = P(`M${-w * 0.5},${-h * 0.3} C${-w * 0.3},${-h * 0.78} ${w * 0.32},${-h * 0.62} ${w * 0.5},${h * 0.02} C${w * 0.34},${h * 0.5} ${-w * 0.22},${h * 0.42} ${-w * 0.5},${-h * 0.3} Z`);
    fill(ctx, lobe, C.hair);
    clipped(ctx, lobe, () => {
      fill(ctx, `M${-w},${h * 0.12} C${-w * 0.2},${h * 0.02} ${w * 0.2},${-h * 0.05} ${w},${-h * 0.12} L${w},${h} L${-w},${h} Z`, C.hairShade, 0.85);
      taper(ctx, [-w * 0.34, -h * 0.34, -w * 0.12, -h * 0.56, w * 0.14, -h * 0.46, w * 0.36, -h * 0.12], 0, 2.6, 0, C.hairSheen, 0.8);
    });
    stroke(ctx, lobe, C.hairDeep, 1, 0.9);
    ctx.restore();
  }
  // Lien de cuir et feuille, puis la pointe de la tresse.
  const [x, y, dx, dy] = at(line, 0.97);
  const ang = Math.atan2(dy, dx) - Math.PI / 2;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  const tuft = P('M-5,0 C-6,8 -3,16 1,24 C3,16 6,8 5,0 Z');
  fill(ctx, tuft, C.hair);
  taper(ctx, [-1, 2, -2, 8, -1, 14, 1, 21], 0, 1.4, 0, C.hairSheen, 0.6);
  stroke(ctx, tuft, C.hairDeep, 0.8, 0.9);
  fill(ctx, 'M-7,-3 L7,-3 L7.6,3 L-7.6,3 Z', C.leather);
  stroke(ctx, 'M-6.6,-0.4 L6.8,-0.4', C.leatherHi, 0.8, 0.8);
  ctx.translate(7, 0);
  ctx.rotate(0.6);
  fill(ctx, 'M0,0 C3,-4 9,-4 12,0 C9,3.4 3,3.4 0,0 Z', C.hoodHi);
  stroke(ctx, 'M0.6,0 L11,0', C.hoodDeep, 0.6, 0.7);
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------------------------
// Buste (derrière la pèlerine) : manteau sombre, tunique et baudrier dans l’ouverture

function drawTorso(): HTMLCanvasElement {
  const { c, ctx } = canvas(384, 320);
  ctx.transform(TORSO_A.sx, 0, 0, TORSO_A.sy, TORSO_A.tx, TORSO_TY);
  const body = P('M100,282 C60,286 0,300 -40,318 C-66,330 -80,352 -84,384 L-88,610 L344,610 L340,384 C336,352 322,330 296,318 C256,300 196,286 156,282 Z');
  fill(ctx, body, C.cloak);
  clipped(ctx, body, () => {
    fill(ctx, 'M-84,384 C-80,352 -66,330 -40,318 C-56,336 -66,358 -70,392 L-72,610 L-90,610 Z', C.cloakHi, 0.9);
    fill(ctx, 'M262,300 C300,316 330,340 340,384 L344,610 L270,610 C280,500 280,400 262,300 Z', C.cloakShade, 0.8);
    fill(ctx, 'M106,292 L150,292 L204,440 L52,440 Z', C.tunic);
    fill(ctx, 'M128,292 L150,292 L204,440 L128,440 Z', C.tunicShade, 0.6);
    taper(ctx, [128, 300, 128, 330, 128, 360, 128, 400], 0.4, 1.2, 0.4, C.tunicShade, 0.9);
    const strap = P('M66,326 L82,320 L182,444 L166,450 Z');
    fill(ctx, strap, C.leather);
    stroke(ctx, 'M70,327 L170,449', C.leatherHi, 0.8, 0.6);
    stroke(ctx, 'M79,322 L179,445', C.leatherHi, 0.8, 0.4);
    for (const s of [[-40, 340, -46, 380, -48, 430, -46, 480], [296, 340, 302, 380, 304, 430, 302, 480], [10, 330, 14, 370, 16, 420, 14, 470]] as Cubic[]) taper(ctx, s, 0, 4, 0, C.cloakShade, 0.8);
  });
  stroke(ctx, body, C.cloakShade, 2, 0.8);
  return c;
}

export const MAELLE_V2: FigureV2Kit = {
  id: 'ronce',
  colors: {
    skinShade: C.skinShade, line: C.line, lineSoft: C.lineSoft, lash: C.lash, lashSoft: C.lashSoft, brow: C.brow, browHi: C.browHi,
    lipUp: C.lipUp, lipLow: C.lipLow, lipHi: C.lipHi, iris: C.iris, irisDeep: C.irisDeep, irisLight: C.irisLight, irisAmber: C.irisAmber,
    pupil: C.pupil, irisGlow: '163,212,122',
  },
  head: drawHead,
  front: drawFront,
  back: drawHood,
  torso: drawTorso,
};
