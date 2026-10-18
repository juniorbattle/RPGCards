/**
 * M07 L5 — identité V2 d’Orin, l’arpenteur des Astres (Astre, équilibré, pensif) : peau sombre, locks rassemblés en
 * chignon haut dont quelques mèches retombent, côtés courts, barbe taillée, lunettes rondes cerclées de laiton, yeux
 * d’or, manteau ocre aux revers brodés d’une carte du ciel, gilet bleu nuit et astrolabe en pendentif.
 * Socle commun : `../figureV2`.
 */
import { drawEmblem } from '../../art/emblems';
import { hashString, makeRng } from '../../game/engine/rng';
import {
  backCanvasH, canvas, clipped, edgeBand, EYE_CX, EYE_Y, fill, mirrored, P, softShade, stroke, taper, torsoCanvasH, translatedPath,
  type BrowShape, type Ctx, type Cubic, type FigureV2Kit,
} from '../figureV2';

const C = {
  skinHi: '#c99270', skin: '#9a6444', skinShade: '#73452e', skinDeep: '#52301f', line: '#24120b', lineSoft: '#4a2a1a',
  hair: '#1c1f33', hairShade: '#11131f', hairDeep: '#07080e', hairHi: '#3e4872', hairSheen: '#7486c8',
  beard: '#1a1a26', beardHi: '#3a4060',
  coat: '#6e5418', coatLight: '#957424', coatHi: '#b8962f', coatShade: '#463610', coatDeep: '#261d08',
  collar: '#3b3214', collarHi: '#5c4e1e', gold: '#ffe08a', goldDeep: '#b8962f',
  vest: '#1e2238', vestShade: '#11142a', brass: '#c9a04a', brassHi: '#ffe6a0', brassDeep: '#6a4e16',
  lash: '#0e0806', lashSoft: '#2e1a12', brow: '#14151e', browHi: '#4a5274',
  lipUp: '#6e3c2c', lipLow: '#8a523e', lipHi: '#b47e66',
  iris: '#e0b23a', irisDeep: '#4a3008', irisLight: '#ffe39a', irisAmber: '#c8702a', pupil: '#0a0604',
};

const FACE = 'M128,50 C94,50 60,60 50,94 C44,116 44,140 46,160 C47,184 52,206 62,226 C72,244 94,260 112,266 C120,269 136,269 144,266 C162,260 184,244 194,226 C204,206 209,184 210,160 C212,140 212,116 206,94 C196,60 162,50 128,50 Z';
const BEARD = 'M47,168 C48,188 53,208 62,226 C72,244 94,260 112,266 C120,269 136,269 144,266 C162,260 184,244 194,226 C203,208 208,188 209,168 L204,170 C201,190 194,206 184,218 C172,230 158,238 146,240 C140,239 134,238 128,238 C122,238 116,239 110,240 C98,238 84,230 72,218 C62,206 55,190 52,170 Z';
const MUSTACHE = 'M108,214 C113,208.4 122,207.4 128,209.6 C134,207.4 143,208.4 148,214 C142,212.4 135,212 128,212.6 C121,212 114,212.4 108,214 Z';
/** Encolure du gilet : le cou s’arrête sur cette ligne. */
const NECKLINE = 'M40,200 L216,200 L216,284 C188,290 158,300 128,302 C98,300 68,290 40,284 Z';
/** Mèche (loc) qui retombe devant, le long de la tempe droite à l’écran. */
const FRONT_LOC: Cubic = [176, 34, 200, 60, 212, 104, 214, 150];

/** Loc : corde arrondie le long d’une cubique, segments torsadés et reflet bleuté. */
function loc(ctx: Ctx, c: Cubic, w: number, shade = 0): void {
  taper(ctx, c, w * 0.9, w, w * 0.7, C.hair);
  taper(ctx, [c[0] - 1, c[1], c[2] - 1.4, c[3], c[4] - 1.4, c[5], c[6] - 1, c[7]], w * 0.25, w * 0.35, w * 0.2, C.hairHi, 0.75 - shade);
  for (let t = 0.08; t < 0.95; t += 0.11) {
    const u = 1 - t;
    const x = u * u * u * c[0] + 3 * u * u * t * c[2] + 3 * u * t * t * c[4] + t * t * t * c[6];
    const y = u * u * u * c[1] + 3 * u * u * t * c[3] + 3 * u * t * t * c[5] + t * t * t * c[7];
    taper(ctx, [x - w * 0.45, y - 1.2, x - w * 0.15, y + 0.4, x + w * 0.15, y + 1.2, x + w * 0.45, y + 2.4], 0.2, 0.9, 0.2, C.hairDeep, 0.8);
  }
}

function drawHead(seed: number): HTMLCanvasElement {
  const { c, ctx } = canvas(256, 312);
  // Côtés courts et dessus serré (texture crépue), sous les locks du chignon.
  const cap = P('M128,16 C80,16 44,48 40,96 C38,120 40,140 44,158 L54,156 C52,130 54,108 62,92 L194,92 C202,108 204,130 202,156 L212,158 C216,140 218,120 216,96 C212,48 176,16 128,16 Z');
  fill(ctx, cap, C.hair);
  const rng = makeRng(hashString(`orin-v2|cheveux|${seed}`));
  clipped(ctx, cap, () => {
    fill(ctx, 'M128,0 L240,0 L240,200 L128,200 Z', C.hairShade, 0.5);
    for (let i = 0; i < 140; i++) {
      const x = 40 + rng() * 176;
      const y = 16 + rng() * 140;
      const r = 1.1 + rng() * 1.2;
      ctx.save();
      ctx.globalAlpha = x < 128 ? 0.45 : 0.25;
      ctx.strokeStyle = C.hairHi;
      ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.arc(x, y, r, Math.PI * (0.9 + rng() * 0.4), Math.PI * (1.7 + rng() * 0.4)); ctx.stroke();
      ctx.restore();
    }
    taper(ctx, [62, 46, 84, 28, 108, 20, 128, 18], 0, 2.4, 1, C.hairSheen, 0.5);
  });
  // Oreilles.
  const ear = P('M50,130 C39,125 32,135 33,150 C34,165 40,176 53,180 Z');
  fill(ctx, ear, C.skin);
  taper(ctx, [47, 140, 40, 140, 39, 154, 45, 166], 0.3, 1.4, 0.3, C.skinDeep, 0.8);
  stroke(ctx, ear, C.line, 1.1, 0.6);
  mirrored(ctx, 128, () => {
    fill(ctx, ear, C.skinShade);
    taper(ctx, [47, 140, 40, 140, 39, 154, 45, 166], 0.3, 1.4, 0.3, C.skinDeep, 0.9);
    stroke(ctx, ear, C.line, 1.2, 0.7);
  });
  // Cou, arrêté sur l’encolure du gilet.
  clipped(ctx, NECKLINE, () => {
    const neck = P('M98,210 C100,246 98,276 90,310 L166,310 C158,276 156,246 158,210 Z');
    fill(ctx, neck, C.skinShade);
    clipped(ctx, neck, () => {
      fill(ctx, 'M96,250 C102,270 100,290 94,310 L114,310 C110,292 106,272 102,250 Z', C.skin, 0.85);
      fill(ctx, 'M98,226 C112,250 124,262 134,268 C146,262 156,248 158,226 L160,256 C150,268 138,276 128,278 C116,276 104,268 98,256 Z', C.skinDeep, 0.6);
      taper(ctx, [106, 232, 110, 256, 116, 280, 124, 300], 0.2, 1, 0.2, C.skinDeep, 0.4);
    });
  });
  const face = P(FACE);
  fill(ctx, face, C.skin);
  clipped(ctx, face, () => {
    softShade(ctx, 'M206,66 C210,100 208,130 209,154 C207,170 198,184 188,194 C180,204 176,216 174,230 C172,246 164,258 148,268 L250,300 L250,40 Z', C.skinShade);
    for (const [i, cx] of EYE_CX.entries()) {
      const s = i === 0 ? 1 : -1;
      const g = ctx.createRadialGradient(cx + s * 6, 138, 2, cx + s * 4, 140, 30);
      g.addColorStop(0, 'rgba(50,24,14,0.4)');
      g.addColorStop(1, 'rgba(50,24,14,0)');
      fill(ctx, 'M0,96 L256,96 L256,180 L0,180 Z', g);
    }
    fill(ctx, 'M54,184 C64,196 70,208 74,224 C66,212 58,202 52,196 Z', C.skinShade, 0.8);
    // Nez large : arête, ailes, dessous, narines ; reflets.
    fill(ctx, 'M134,146 C138,162 142,178 150,190 C152,198 144,203 134,202 C138,192 138,174 132,156 Z', C.skinShade);
    fill(ctx, 'M108,198 C116,206 140,207 148,198 C144,209 112,209 108,198 Z', C.skinDeep, 0.95);
    fill(ctx, 'M112,199.6 C113.4,197 117.6,196.4 120.4,198.6 C117.8,200.6 114.6,200.8 112,199.6 Z', C.line, 0.85);
    fill(ctx, 'M144,199.6 C142.6,197 138.4,196.4 135.6,198.6 C138.2,200.6 141.4,200.8 144,199.6 Z', C.line, 0.85);
    taper(ctx, [114, 190, 108, 194, 108.6, 200, 114, 202], 0.4, 1.6, 0.5, C.lineSoft, 0.85);
    taper(ctx, [142, 190, 148, 194, 147.4, 200, 142, 202], 0.4, 1.6, 0.5, C.skinDeep, 0.8);
    fill(ctx, 'M125,158 C124,168 123,178 124.4,187 C126,180 127,170 127.6,160 Z', C.skinHi, 0.75);
    fill(ctx, 'M119,192 C121.4,188.6 128,188.2 131,191 C128,193.6 122,194 119,192 Z', C.skinHi, 0.8);
    // Barbe taillée et moustache (texture courte), sous la lèvre.
    const beard = P(BEARD);
    fill(ctx, beard, C.beard, 0.92);
    fill(ctx, MUSTACHE, C.beard);
    clipped(ctx, beard, () => {
      for (let i = 0; i < 160; i++) {
        const x = 46 + rng() * 164;
        const y = 166 + rng() * 104;
        const a = rng() * Math.PI;
        taper(ctx, [x, y, x + Math.cos(a) * 1, y + 1, x + Math.cos(a) * 2, y + 2, x + Math.cos(a) * 2.6, y + 3], 0.1, 0.6, 0.1, C.beardHi, x < 128 ? 0.5 : 0.3);
      }
    });
    taper(ctx, [109, 211, 116, 207, 122, 207, 127, 209], 0, 1.2, 0, C.beardHi, 0.6);
    // Reflets : pommette, front.
    fill(ctx, 'M52,168 C60,163 72,162.4 82,165 C72,166.4 62,169 54,173 Z', C.skinHi, 0.5);
    fill(ctx, 'M86,96 C98,90 116,88 130,90 C116,94 102,98 92,104 Z', C.skinHi, 0.3);
  });
  const contour: Array<[Cubic, number, number, number]> = [
    [[46, 150, 47, 168, 48, 186, 52, 200], 0.5, 1, 1.2],
    [[194, 226, 204, 206, 209, 184, 210, 150], 2.4, 2.2, 1.1],
  ];
  for (const [s, a, b, d] of contour) taper(ctx, s, a, b, d, C.line, 0.85);
  stroke(ctx, 'M62,226 C72,244 94,260 112,266 C120,269 136,269 144,266 C162,260 184,244 194,226', C.hairDeep, 1.6, 0.8);
  return c;
}

/** Loc qui retombe devant la tempe et lunettes rondes cerclées de laiton (au-dessus des yeux). */
function drawFront(): HTMLCanvasElement {
  const { c, ctx } = canvas(256, 312);
  loc(ctx, FRONT_LOC, 9, 0.35);
  loc(ctx, [160, 30, 176, 54, 186, 80, 190, 108], 8, 0.3);
  const ry = EYE_Y + 2;
  for (const cx of EYE_CX) {
    const lens = new Path2D();
    lens.ellipse(cx, ry, 27, 23, 0, 0, Math.PI * 2);
    fill(ctx, lens, '#cfe4ff', 0.07);
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.ellipse(cx, ry, 21, 17, 0, Math.PI * 1.08, Math.PI * 1.42); ctx.stroke();
    ctx.globalAlpha = 0.3;
    ctx.beginPath(); ctx.ellipse(cx, ry, 21, 17, 0, Math.PI * 1.5, Math.PI * 1.6); ctx.stroke();
    ctx.restore();
    stroke(ctx, lens, C.brassDeep, 3.2, 0.95);
    stroke(ctx, lens, C.brass, 1.8, 1);
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = C.brassHi;
    ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.ellipse(cx, ry, 27, 23, 0, Math.PI * 1.05, Math.PI * 1.5); ctx.stroke();
    ctx.restore();
  }
  // Pont et branches.
  stroke(ctx, `M${EYE_CX[0] + 26},${ry - 6} C120,${ry - 13} 136,${ry - 13} ${EYE_CX[1] - 26},${ry - 6}`, C.brassDeep, 2.6, 0.95);
  stroke(ctx, `M${EYE_CX[0] + 26},${ry - 6} C120,${ry - 13} 136,${ry - 13} ${EYE_CX[1] - 26},${ry - 6}`, C.brass, 1.4, 1);
  stroke(ctx, `M${EYE_CX[0] - 27},${ry - 4} L44,${ry - 8}`, C.brass, 1.6, 0.95);
  stroke(ctx, `M${EYE_CX[1] + 27},${ry - 4} L212,${ry - 8}`, C.brassDeep, 1.6, 0.95);
  return c;
}

/** Chignon de locks (derrière la tête) et locks qui tombent dans le dos (col châle retiré : mal intégré, jugé superflu par le responsable). */
function drawBack(): HTMLCanvasElement {
  const { c, ctx } = backCanvasH();
  // Locks qui tombent dans le dos, de part et d’autre (visibles derrière les épaules).
  for (const [i, s] of ([[70, 40, 40, 100, 30, 180, 28, 260], [60, 60, 30, 120, 18, 200, 14, 280], [186, 40, 216, 100, 226, 180, 228, 260], [196, 60, 226, 120, 238, 200, 242, 280]] as Cubic[]).entries()) loc(ctx, s, 10, i >= 2 ? 0.3 : 0);
  // Chignon haut : boucles de locks enroulées.
  const bun = new Path2D();
  bun.ellipse(128, -4, 46, 34, 0, 0, Math.PI * 2);
  fill(ctx, bun, C.hair);
  clipped(ctx, bun, () => {
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI * 0.95 + i * 0.3;
      taper(ctx, [128 + Math.cos(a) * 40, -4 + Math.sin(a) * 28, 128 + Math.cos(a + 0.6) * 30, -4 + Math.sin(a + 0.6) * 18, 128 + Math.cos(a + 1.2) * 18, -4 + Math.sin(a + 1.2) * 10, 128, -2], 8, 9, 4, C.hairShade, 0.6);
      taper(ctx, [128 + Math.cos(a) * 40 - 1, -5 + Math.sin(a) * 28, 128 + Math.cos(a + 0.6) * 30 - 1, -5 + Math.sin(a + 0.6) * 18, 128 + Math.cos(a + 1.2) * 18, -5 + Math.sin(a + 1.2) * 10, 128, -3], 1.6, 2.4, 0.6, C.hairHi, i < 4 ? 0.8 : 0.45);
    }
  });
  stroke(ctx, bun, C.hairDeep, 1.4, 0.8);
  // Lien d’or autour du chignon, étoile de l’Astre.
  stroke(ctx, 'M92,22 C110,30 146,30 164,22', C.gold, 3, 0.95);
  ctx.fillStyle = C.gold;
  drawEmblem(ctx, 'Astre', 128, 28, 6);
  return c;
}

/** Buste : manteau ocre, gilet bleu nuit, chaîne et astrolabe de laiton. */
function drawTorso(): HTMLCanvasElement {
  const { c, ctx } = torsoCanvasH();
  const body = P('M96,282 C56,288 0,300 -44,318 C-72,332 -86,356 -90,388 L-94,610 L350,610 L346,388 C342,356 328,332 300,318 C256,300 200,288 160,282 Z');
  fill(ctx, body, C.coat);
  clipped(ctx, body, () => {
    fill(ctx, 'M-90,388 C-86,356 -72,332 -44,318 C-58,338 -68,362 -72,396 L-76,610 L-96,610 Z', C.coatHi, 0.85);
    fill(ctx, 'M258,302 C300,316 330,338 346,388 L350,610 L268,610 C280,500 280,400 258,302 Z', C.coatShade, 0.85);
    const vest = P('M94,284 L162,284 L186,450 L70,450 Z');
    fill(ctx, vest, C.vest);
    clipped(ctx, vest, () => fill(ctx, 'M128,284 L176,284 L196,450 L128,450 Z', C.vestShade, 0.7));
    for (const y of [330, 362, 394]) fill(ctx, `M130.6,${y} A2.6,2.6 0 1 1 125.4,${y} A2.6,2.6 0 1 1 130.6,${y} Z`, C.brass, 0.95);
    // Revers châle : bandes sombres le long de l’ouverture, liseré d’or.
    const lapel = 'M94,284 C84,320 86,380 100,450 L78,450 C66,380 66,316 76,288 Z';
    fill(ctx, lapel, C.collar);
    stroke(ctx, 'M94,284 C84,320 86,380 100,450', C.gold, 1.2, 0.85);
    mirrored(ctx, 128, () => { fill(ctx, lapel, C.collar); stroke(ctx, 'M94,284 C84,320 86,380 100,450', C.goldDeep, 1.2, 0.85); });
    // Carte du ciel brodée sur le revers gauche à l’écran.
    const stars: Array<[number, number]> = [[84, 300], [79, 322], [85, 344], [80, 366], [88, 390]];
    stroke(ctx, `M${stars.map(([x, y]) => `${x},${y}`).join(' L')}`, C.gold, 0.7, 0.7);
    for (const [x, y] of stars) fill(ctx, `M${x + 1.6},${y} A1.6,1.6 0 1 1 ${x - 1.6},${y} A1.6,1.6 0 1 1 ${x + 1.6},${y} Z`, C.gold, 0.95);
    // Chaîne et astrolabe.
    stroke(ctx, 'M104,290 C110,318 120,330 128,334 C136,330 146,318 152,290', C.brass, 1.2, 0.9);
    ctx.save();
    ctx.translate(128, 346);
    for (const [r, w, col] of [[12, 2.4, C.brassDeep], [12, 1.4, C.brass], [7.4, 1, C.brass]] as Array<[number, number, string]>) {
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.lineWidth = w; ctx.strokeStyle = col; ctx.stroke();
    }
    stroke(ctx, 'M-12,0 L12,0 M0,-12 L0,12', C.brass, 0.8, 0.9);
    ctx.beginPath(); ctx.ellipse(0, 0, 12, 4.6, 0.5, 0, Math.PI * 2); ctx.lineWidth = 0.9; ctx.strokeStyle = C.brassHi; ctx.stroke();
    ctx.fillStyle = C.gold;
    drawEmblem(ctx, 'Astre', 0, 0, 3.6);
    ctx.restore();
    for (const s of [[-36, 346, -42, 390, -44, 440, -42, 490], [292, 346, 298, 390, 300, 440, 298, 490], [20, 334, 24, 376, 26, 420, 24, 470], [236, 334, 232, 376, 230, 420, 232, 470]] as Cubic[]) taper(ctx, s, 0, 4, 0, C.coatDeep, 0.7);
  });
  stroke(ctx, body, C.coatDeep, 2, 0.8);
  return c;
}

const BROWS_ORIN: Record<BrowShape, string> = {
  rest: 'M3,15 C14,11 28,9 42,8.6 C53,8.4 61,9.4 68,11 C70.4,11.8 70.8,15 69.6,17.6 C61,16.2 51,15.6 41,15.6 C28,15.8 15,16.8 3,18 Z',
  arch: 'M3,18 C11,11 24,6.6 38,6 C51,5.6 61,8.2 67.8,11.6 C70.4,13 70.6,16 69.2,18.4 C60,15.6 50,13.8 40,13.8 C27,13.8 14,15.6 3,18.8 Z',
  knit: 'M3,13.6 C16,11 30,10.6 43,11.4 C54,12.2 62,14.4 68.6,17.4 C70.8,18.6 70.6,21.4 68.8,22.4 C60,19.6 51,18 41,17.6 C28,17.2 15,16.8 3,17.2 Z',
};

export const ORIN_V2: FigureV2Kit = {
  id: 'astre',
  colors: {
    skinShade: C.skinShade, line: C.line, lineSoft: C.lineSoft, lash: C.lash, lashSoft: C.lashSoft, brow: C.brow, browHi: C.browHi,
    lipUp: C.lipUp, lipLow: C.lipLow, lipHi: C.lipHi, iris: C.iris, irisDeep: C.irisDeep, irisLight: C.irisLight, irisAmber: C.irisAmber,
    pupil: C.pupil, irisGlow: '255,226,140', lashWeight: 0.82, lashWing: false, lashStrands: false,
  },
  brows: BROWS_ORIN,
  // Tempérament : pensif, posé ; un sourcil levé, regard calme, sourire bref.
  moods: {
    thinking: { browL: 0.4, browR: -0.15, browAngle: 0.08, lid: 0.27, squint: 0.1, tilt: 0.07, mouth: 'tight' },
    confident: { browL: 0.15, browR: 0.05, lid: 0.3, squint: 0.2, tilt: 0.03, mouth: 'smile' },
  },
  head: drawHead,
  front: drawFront,
  back: drawBack,
  torso: drawTorso,
};
