/**
 * M07 L5 — identité V2 de Sélène, liseuse du Voile (Voile, lectrice, narquoise) : carré argent-lavande à frange nette
 * et reflet lustré, diadème d’argent au croissant du Voile, voile translucide semé d’étoiles qui tombe sur les épaules,
 * visage ovale au menton fin, grain de beauté, yeux violets aux longs cils, manteau indigo à col officier, brandebourgs
 * d’argent, broderie de constellation et pendentif de cristal. Socle commun : `../figureV2`.
 */
import { drawEmblem } from '../../art/emblems';
import {
  along, backCanvasH, canvas, chain, chainPath, clipped, edgeBand, EYE_CX, fill, HOOD_BOX, mirrored, P, stroke, taper, torsoCanvasH,
  translatedPath, type BrowShape, type Cubic, type FigureV2Kit,
} from '../figureV2';

const C = {
  skinHi: '#fde4d2', skin: '#f0c9b0', skinShade: '#cf9f8a', skinDeep: '#a46e5e', line: '#4a2830', lineSoft: '#8a5a58',
  hair: '#c9cbe8', hairShade: '#9a9cc6', hairDeep: '#5e6090', hairHi: '#f4f4ff', hairSheen: '#ffffff', hairRim: '#ffffff',
  silver: '#d6dcf4', silverHi: '#ffffff', silverDeep: '#7c84b0', gem: '#a8e6ff', gemDeep: '#3c86b4',
  veil: '#d8e0ff', veilEdge: '#ffffff',
  coat: '#2f2d6e', coatLight: '#45449a', coatHi: '#5d63c4', coatShade: '#1e1c4c', coatDeep: '#100e2e',
  lash: '#1a1024', lashSoft: '#4a3450', brow: '#62648e', browHi: '#c4c6e4',
  lipUp: '#b2606e', lipLow: '#ca7a88', lipHi: '#f4b8c6',
  iris: '#8a5cd6', irisDeep: '#24124a', irisLight: '#cdb0ff', irisAmber: '#f0d48a', pupil: '#0b0812',
};

const FACE = 'M128,52 C96,52 62,62 54,96 C48,118 48,142 49,160 C50,182 56,204 68,224 C80,244 102,260 120,268 C124,270 132,270 136,268 C154,260 176,244 188,224 C200,204 206,182 207,160 C208,142 208,118 202,96 C194,62 160,52 128,52 Z';
/** Frange nette (bord légèrement effilé) et pans du carré qui s’incurvent sous la mâchoire. */
const FRINGE = 'M40,96 C40,52 80,22 128,22 C176,22 216,52 216,96 C210,97 205,99 199,98 C188,96 176,99 164,98 C152,96 140,99 128,98 C116,96 104,99 92,98 C80,96 68,99 57,98 C51,98 45,97 40,96 Z';
const SIDE = 'M40,90 C33,130 33,180 39,222 C43,246 53,262 72,268 C63,252 57,234 55,212 C52,188 51,158 51,128 C51,114 53,102 57,94 Z';
/** Haut du col officier : le cou s’arrête sur cette courbe. */
const COLLAR_TOP = 'M40,180 L216,180 L216,262 L170,262 C160,282 146,292 128,294 C110,292 96,282 86,262 L40,262 Z';

function drawHead(): HTMLCanvasElement {
  const { c, ctx } = canvas(256, 312);
  // Arrière du carré (s’arrête à la mâchoire, derrière le cou).
  const back = P('M128,14 C70,12 34,52 30,110 C26,160 30,210 44,250 C52,262 66,268 82,268 L174,268 C190,268 204,262 212,250 C226,210 230,160 226,110 C222,52 186,12 128,14 Z');
  fill(ctx, back, C.hairShade);
  clipped(ctx, back, () => {
    fill(ctx, 'M60,200 C80,250 100,268 128,268 C156,268 176,250 196,200 L196,280 L60,280 Z', C.hairDeep, 0.7);
    fill(ctx, 'M128,0 L240,0 L240,280 L128,280 Z', C.hairDeep, 0.25);
  });
  // Cou fin, arrêté sur le col officier.
  clipped(ctx, COLLAR_TOP, () => {
    const neck = P('M104,214 C106,246 104,276 98,308 L158,308 C152,276 150,246 152,214 Z');
    fill(ctx, neck, C.skinShade);
    clipped(ctx, neck, () => {
      fill(ctx, 'M102,256 C106,272 104,288 100,306 L118,306 C114,290 110,274 106,256 Z', C.skin, 0.9);
      fill(ctx, 'M104,226 C114,246 122,256 130,262 C140,256 148,244 152,226 L152,252 C142,262 134,268 128,270 C120,268 110,262 104,252 Z', C.skinDeep, 0.4);
      taper(ctx, [108, 232, 112, 254, 118, 274, 124, 292], 0.2, 0.8, 0.2, C.lineSoft, 0.3);
    });
  });
  const face = P(FACE);
  fill(ctx, face, C.skin);
  clipped(ctx, face, () => {
    fill(ctx, 'M196,64 C204,100 200,128 204,150 C206,164 198,178 186,190 C178,198 172,210 170,224 C168,240 158,256 142,268 L250,300 L250,40 Z', C.skinShade);
    fill(ctx, translatedPath(FRINGE, 2, 6), C.skinShade, 0.8);
    fill(ctx, translatedPath(SIDE, 4, 3), C.skinShade, 0.7);
    mirrored(ctx, 128, () => fill(ctx, translatedPath(SIDE, -2, 3), C.skinDeep, 0.5));
    for (const [i, cx] of EYE_CX.entries()) {
      const s = i === 0 ? 1 : -1;
      const g = ctx.createRadialGradient(cx + s * 6, 140, 2, cx + s * 4, 142, 30);
      g.addColorStop(0, 'rgba(150,90,110,0.3)');
      g.addColorStop(1, 'rgba(150,90,110,0)');
      fill(ctx, 'M0,100 L256,100 L256,180 L0,180 Z', g);
    }
    fill(ctx, 'M58,186 C66,196 74,210 78,226 C70,214 62,204 56,198 Z', C.skinShade, 0.55);
    // Nez fin, à peine marqué.
    fill(ctx, 'M134,150 C137,165 140,180 144,190 C143,196 137,199 131,197 C135,189 135,175 132,160 Z', C.skinShade, 0.9);
    fill(ctx, 'M117,199 C122,203 134,204 140,200 C137,206 121,206 117,199 Z', C.skinDeep, 0.7);
    fill(ctx, 'M119.4,198.6 C120.4,196.8 123,196.6 124.4,198 C123,199.4 121,199.6 119.4,198.6 Z', C.line, 0.55);
    fill(ctx, 'M136.6,198.6 C135.6,196.8 133,196.6 131.6,198 C133,199.4 135,199.6 136.6,198.6 Z', C.line, 0.55);
    fill(ctx, 'M126,162 C125.4,172 124.8,181 125.6,188 C126.8,181 127.6,172 128,163 Z', C.skinHi, 0.8);
    fill(ctx, 'M122,191.6 C123.6,189.4 127.6,189 129.4,191 C127.6,192.8 124,193.2 122,191.6 Z', C.skinHi, 0.85);
    taper(ctx, [119, 191, 116, 194, 116.6, 198, 120, 199.6], 0.3, 1, 0.4, C.lineSoft, 0.7);
    taper(ctx, [124.8, 205, 124.4, 208, 124.6, 211, 125.2, 214], 0.2, 0.8, 0.2, C.skinShade, 0.5);
    taper(ctx, [131.2, 205, 131.6, 208, 131.4, 211, 130.8, 214], 0.2, 0.8, 0.2, C.skinShade, 0.7);
    fill(ctx, 'M118,236 C124,240 132,240 138,236 C134,242 122,242.4 118,236 Z', C.skinShade, 0.85);
    fill(ctx, 'M120,258 C124,255 132,255 136,258.4 C131,261 124,261 120,258 Z', C.skinHi, 0.5);
    // Reflets (pommette haute), joues, grain de beauté près de la bouche.
    fill(ctx, 'M56,168 C64,163 76,162.6 86,166 C76,167.4 66,170 58,174 Z', C.skinHi, 0.55);
    for (const [cx, a] of [[78, 0.26], [180, 0.2]] as const) {
      const g = ctx.createRadialGradient(cx, 190, 2, cx, 190, 22);
      g.addColorStop(0, `rgba(232,140,150,${a})`);
      g.addColorStop(1, 'rgba(232,140,150,0)');
      fill(ctx, 'M0,160 L256,160 L256,220 L0,220 Z', g);
    }
    fill(ctx, 'M167.6,226 A1.9,1.9 0 1 1 163.8,226 A1.9,1.9 0 1 1 167.6,226 Z', '#3a2030', 0.9);
  });
  const contour: Array<[Cubic, number, number, number]> = [
    [[49, 150, 50, 172, 53, 192, 58, 206], 0.3, 0.8, 1],
    [[58, 206, 61, 214, 64, 219, 68, 224], 1, 1.2, 1.3],
    [[68, 224, 80, 244, 102, 260, 120, 268], 1.3, 1.5, 1.4],
    [[120, 268, 124, 270, 132, 270, 136, 268], 1.4, 1.6, 1.6],
    [[136, 268, 154, 260, 176, 244, 188, 224], 1.6, 2, 2],
    [[188, 224, 200, 204, 206, 182, 207, 150], 2, 1.8, 0.8],
  ];
  for (const [s, a, b, d] of contour) taper(ctx, s, a, b, d, C.line, 0.8);
  return c;
}

/** Frange, pans du carré et diadème au croissant (au-dessus des yeux). */
function drawFront(): HTMLCanvasElement {
  const { c, ctx } = canvas(256, 312);
  const box: [number, number, number, number] = [0, 0, 256, 312];
  const side = new Path2D();
  side.addPath(P(SIDE));
  side.addPath(P(SIDE), new DOMMatrix([-1, 0, 0, 1, 256, 0]));
  fill(ctx, side, C.hair);
  clipped(ctx, side, () => {
    fill(ctx, 'M128,0 L260,0 L260,320 L128,320 Z', C.hairShade, 0.6);
    edgeBand(ctx, side, -4, -1, C.hairShade, 0.8, box);
    edgeBand(ctx, side, 3, 0, C.hairHi, 0.8, box);
    taper(ctx, [40, 130, 38, 160, 39, 196, 44, 228], 0, 2.6, 0, C.hairSheen, 0.75);
    taper(ctx, [216, 130, 218, 160, 217, 196, 212, 228], 0, 1.6, 0, C.hairRim, 0.6);
    for (const s of [[46, 110, 44, 150, 46, 200, 56, 250], [200, 110, 212, 150, 210, 200, 200, 250]] as Cubic[]) taper(ctx, s, 0.2, 0.8, 0.2, C.hairDeep, 0.55);
  });
  const fringe = P(FRINGE);
  fill(ctx, fringe, C.hair);
  clipped(ctx, fringe, () => {
    fill(ctx, 'M150,0 L260,0 L260,120 L150,120 Z', C.hairShade, 0.45);
    fill(ctx, 'M30,86 C70,92 186,92 226,86 L226,104 L30,104 Z', C.hairShade, 0.7);
    // Reflet lustré en couronne, puis mèches de la frange.
    fill(ctx, 'M54,52 C80,34 176,34 202,52 C178,44 80,44 54,58 Z', C.hairSheen, 0.85);
    fill(ctx, 'M66,58 C90,48 120,46 140,48 C116,52 88,56 70,64 Z', C.hairHi, 0.7);
    for (const [x, t] of [[74, 58], [104, 50], [146, 50], [178, 58]]) taper(ctx, [x! + 10, t!, x! + 6, t! + 14, x! + 3, t! + 28, x!, 97], 0.1, 0.8, 0.2, C.hairDeep, 0.35);
  });
  stroke(ctx, fringe, C.hairDeep, 0.9, 0.7);
  stroke(ctx, side, C.hairDeep, 0.8, 0.6);
  // Diadème d’argent et croissant du Voile, pendeloque de cristal.
  const band = P('M40,70 C80,54 176,54 216,70 L216,75 C176,59 80,59 40,75 Z');
  fill(ctx, band, C.silver);
  taper(ctx, [44, 70, 80, 57, 120, 55.6, 160, 57], 0, 1.2, 0, C.silverHi, 0.9);
  stroke(ctx, band, C.silverDeep, 0.6, 0.8);
  for (let i = 0; i < 8; i++) {
    const x = 58 + i * 20 + (i >= 4 ? 20 : 0);
    if (x > 200) break;
    fill(ctx, `M${x + 1.3},${63 - Math.abs(x - 128) * 0.06} A1.3,1.3 0 1 1 ${x - 1.3},${63 - Math.abs(x - 128) * 0.06} A1.3,1.3 0 1 1 ${x + 1.3},${63 - Math.abs(x - 128) * 0.06} Z`, C.silverHi, 0.9);
  }
  ctx.save();
  ctx.beginPath(); ctx.arc(128, 66, 7.6, 0, Math.PI * 2);
  ctx.fillStyle = C.silver; ctx.fill();
  ctx.lineWidth = 0.8; ctx.strokeStyle = C.silverDeep; ctx.stroke();
  ctx.fillStyle = C.gemDeep;
  drawEmblem(ctx, 'Voile', 128, 66, 5.4);
  ctx.restore();
  const drop = P('M128,74 C131,78 132,82 128,88 C124,82 125,78 128,74 Z');
  fill(ctx, drop, C.gem);
  fill(ctx, 'M127,77 C128,78 128.6,80 127.6,82 C126.6,80 126.6,78.6 127,77 Z', C.silverHi, 0.9);
  stroke(ctx, drop, C.gemDeep, 0.6, 0.9);
  return c;
}

/** Voile translucide semé d’étoiles (derrière la tête, sur les épaules) et col officier du manteau. */
const VEIL_EDGE = chain([136, -14, 62, -12, 12, 38, 0, 110, -12, 188, -34, 274, -80, 360]);

function drawBack(): HTMLCanvasElement {
  const { c, ctx } = backCanvasH();
  const drape = 'M136,-14 C62,-12 12,38 0,110 C-12,188 -34,274 -80,360 C-84,372 -88,384 -92,396 C-76,390 -60,394 -44,402 C-28,398 -14,402 0,408 C8,372 18,330 30,300 C44,266 48,220 44,170 C40,120 52,60 136,24 Z';
  // Les deux pans sont réunis sur un calque opaque (leurs sens de tracé s’annuleraient au remplissage), posé translucide.
  const B = HOOD_BOX;
  const layer = canvas(B.u1 - B.u0, B.v1 - B.v0);
  layer.ctx.translate(-B.u0, -B.v0);
  fill(layer.ctx, drape, C.veil);
  mirrored(layer.ctx, 128, () => fill(layer.ctx, drape, C.veil));
  layer.ctx.globalCompositeOperation = 'source-atop';
  fill(layer.ctx, 'M150,-40 L360,-40 L360,420 L150,420 Z', '#8c96d8', 0.45);
  for (const s of [[30, 60, 18, 140, 6, 230, -30, 330], [226, 60, 238, 140, 250, 230, 286, 330], [60, 20, 30, 80, 20, 160, 10, 260]] as Cubic[]) taper(layer.ctx, s, 0, 5, 0, '#ffffff', 0.3);
  ctx.save();
  ctx.globalAlpha = 0.38;
  ctx.drawImage(layer.c, B.u0, B.v0, B.u1 - B.u0, B.v1 - B.v0);
  ctx.restore();
  // Bord du voile : liseré et petites étoiles.
  for (const m of [1, -1]) {
    ctx.save();
    if (m < 0) { ctx.translate(256, 0); ctx.scale(-1, 1); }
    stroke(ctx, chainPath(VEIL_EDGE, false), C.veilEdge, 1, 0.55);
    along(VEIL_EDGE, 13).forEach((q, i) => {
      const r = i % 3 === 0 ? 2.6 : 1.6;
      const x = q.x - q.nx * 4;
      const y = q.y - q.ny * 4;
      fill(ctx, `M${x},${y - r} L${x + r * 0.3},${y - r * 0.3} L${x + r},${y} L${x + r * 0.3},${y + r * 0.3} L${x},${y + r} L${x - r * 0.3},${y + r * 0.3} L${x - r},${y} L${x - r * 0.3},${y - r * 0.3} Z`, C.veilEdge, 0.85);
    });
    ctx.restore();
  }
  // Col officier : bande qui entoure le cou, liseré d’argent, cristal au centre.
  const collar = P('M84,258 C94,280 110,290 128,292 C146,290 162,280 172,258 L178,280 C164,304 146,314 128,316 C110,314 92,304 78,280 Z');
  fill(ctx, collar, C.coatLight);
  clipped(ctx, collar, () => fill(ctx, 'M128,250 L190,250 L190,330 L128,330 Z', C.coatShade, 0.7));
  stroke(ctx, 'M84,258 C94,280 110,290 128,292 C146,290 162,280 172,258', C.silver, 1.3, 0.9);
  stroke(ctx, 'M78,280 C92,304 110,314 128,316 C146,314 164,304 178,280', C.silverDeep, 1, 0.8);
  const gem = P('M128,296 L133,303 L128,312 L123,303 Z');
  fill(ctx, gem, C.gem);
  fill(ctx, 'M128,297.6 L130.6,302.6 L128,306 Z', C.silverHi, 0.8);
  stroke(ctx, gem, C.gemDeep, 0.7, 0.9);
  return c;
}

/** Buste : manteau indigo, brandebourgs d’argent, broderie de constellation sur l’épaule. */
function drawTorso(): HTMLCanvasElement {
  const { c, ctx } = torsoCanvasH();
  const body = P('M100,284 C62,290 10,302 -30,320 C-56,332 -70,354 -74,386 L-78,610 L334,610 L330,386 C326,354 312,332 286,320 C246,302 194,290 156,284 Z');
  fill(ctx, body, C.coat);
  clipped(ctx, body, () => {
    fill(ctx, 'M-74,386 C-70,354 -56,332 -30,320 C-44,340 -54,362 -58,394 L-62,610 L-80,610 Z', C.coatHi, 0.85);
    fill(ctx, 'M250,302 C290,316 318,336 330,386 L334,610 L262,610 C272,500 272,400 250,302 Z', C.coatShade, 0.85);
    fill(ctx, 'M128,286 L148,286 L156,610 L128,610 Z', C.coatShade, 0.45);
    stroke(ctx, 'M128,300 L128,460', C.silver, 1.4, 0.85);
    for (const y of [326, 352, 378, 404]) {
      stroke(ctx, `M112,${y} C118,${y - 5} 124,${y - 5} 128,${y} C132,${y - 5} 138,${y - 5} 144,${y}`, C.silver, 1.3, 0.9);
      fill(ctx, `M130.4,${y} A2.4,2.4 0 1 1 125.6,${y} A2.4,2.4 0 1 1 130.4,${y} Z`, C.silverHi, 0.9);
    }
    const stars: Array<[number, number]> = [[-6, 334], [18, 322], [40, 340], [30, 368], [58, 360], [8, 384]];
    stroke(ctx, `M${stars.map(([x, y]) => `${x},${y}`).join(' L')}`, C.silver, 0.7, 0.6);
    for (const [i, [x, y]] of stars.entries()) {
      const r = i % 2 ? 1.6 : 2.4;
      fill(ctx, `M${x},${y - r} L${x + r * 0.35},${y - r * 0.35} L${x + r},${y} L${x + r * 0.35},${y + r * 0.35} L${x},${y + r} L${x - r * 0.35},${y + r * 0.35} L${x - r},${y} L${x - r * 0.35},${y - r * 0.35} Z`, C.silverHi, 0.95);
    }
    for (const s of [[-24, 340, -30, 380, -32, 430, -30, 480], [282, 340, 288, 380, 290, 430, 288, 480]] as Cubic[]) taper(ctx, s, 0, 4, 0, C.coatDeep, 0.7);
  });
  stroke(ctx, body, C.coatDeep, 2, 0.8);
  return c;
}

const BROWS_SELENE: Record<BrowShape, string> = {
  rest: 'M4,15 C14,9.6 26,6.6 38,6.4 C50,6.2 60,8.4 67,11 C68.6,11.8 68.8,13.4 67.6,14.2 C60,12.6 50,11.2 40,11.2 C28,11.4 16,13.2 4,16.2 Z',
  arch: 'M4,17 C12,9 24,4.4 38,4 C51,3.8 61,7 67.4,11.6 C68.8,12.6 68.6,14.2 67.2,14.6 C60,11.8 50,9.4 39,9.4 C27,9.6 15,12.4 4,17.8 Z',
  knit: 'M4,13 C16,10.4 30,9.6 42,10.4 C53,11.2 61,13.4 67.6,16.6 C69,17.4 68.8,19 67.4,19.4 C60,16.4 51,14.6 41,14.2 C28,13.8 16,14 4,14.4 Z',
};

export const SELENE_V2: FigureV2Kit = {
  id: 'voile',
  colors: {
    skinShade: C.skinShade, line: C.line, lineSoft: C.lineSoft, lash: C.lash, lashSoft: C.lashSoft, brow: C.brow, browHi: C.browHi,
    lipUp: C.lipUp, lipLow: C.lipLow, lipHi: C.lipHi, iris: C.iris, irisDeep: C.irisDeep, irisLight: C.irisLight, irisAmber: C.irisAmber,
    pupil: C.pupil, irisGlow: '205,176,255', lashWeight: 1.05,
  },
  brows: BROWS_SELENE,
  // Tempérament : narquoise, observatrice ; paupières mi-closes, sourire en coin.
  moods: {
    smug: { browL: 0.4, browR: -0.12, browAngle: 0.05, lid: 0.44, squint: 0.2, tilt: 0.07, mouth: 'smirk' },
    confident: { browL: 0.2, browR: 0, lid: 0.34, squint: 0.15, tilt: 0.04, mouth: 'smirk' },
  },
  head: drawHead,
  front: drawFront,
  back: drawBack,
  torso: drawTorso,
};
