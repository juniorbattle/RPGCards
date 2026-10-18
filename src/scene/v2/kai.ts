/**
 * M07 L5 — identité V2 de Kaï, la Braise du quai (Cendre, offensif, sûr de lui) : cheveux en pointes rejetés en
 * arrière dont les bouts virent à la braise, bandeau noué à plaque de laiton frappée de la Cendre, cicatrice sur la
 * pommette, mâchoire carrée, oreilles dégagées avec un anneau, veste de docker ouverte, maillot sombre et
 * baudrier de cuir. Socle commun : `../figureV2`.
 */
import { drawEmblem } from '../../art/emblems';
import {
  backCanvasH, canvas, clipped, edgeBand, EYE_CX, fill, mirrored, P, stroke, taper, torsoCanvasH, translatedPath,
  type BrowShape, type Ctx, type Cubic, type FigureV2Kit,
} from '../figureV2';

const C = {
  skinHi: '#f3c6a0', skin: '#e2a982', skinShade: '#b9775a', skinDeep: '#8c4e3c', line: '#3a1910', lineSoft: '#6e3424',
  scar: '#f2c8b4', scarEdge: '#9c4a3a',
  hair: '#2a1410', hairShade: '#170a07', hairDeep: '#0b0503', hairHi: '#5e2c18', ember: '#c2411d', emberHi: '#ff7a2e', emberGlow: '#ffc06a',
  band: '#d0541f', bandHi: '#ff8a3a', bandShade: '#8e2c10', plate: '#e9a640', plateHi: '#ffe2a0', plateDeep: '#8a5414',
  jacket: '#7a2410', jacketLight: '#a8381a', jacketHi: '#d0541f', jacketShade: '#4c140a', jacketDeep: '#2a0a06', trim: '#ffb347', trimDeep: '#c07a24',
  shirt: '#2a2422', shirtShade: '#151110', leather: '#4e2e1a', leatherHi: '#8a5a34', buckle: '#d8b060',
  lash: '#170b07', lashSoft: '#4e2a1a', brow: '#22100a', browHi: '#6e3420',
  lipUp: '#a85e48', lipLow: '#c27a62', lipHi: '#eab09a',
  iris: '#d98a1e', irisDeep: '#4a2006', irisLight: '#ffd27a', irisAmber: '#ff7a2a', pupil: '#0a0604',
  gold: '#e8b24a',
};

const FACE = 'M128,50 C94,50 60,60 50,94 C44,116 44,140 46,160 C47,182 50,204 58,222 C64,236 84,254 104,264 C112,268 144,268 152,264 C172,254 192,236 198,222 C206,204 209,182 210,160 C212,140 212,116 206,94 C196,60 162,50 128,50 Z';
const BAND = 'M40,74 C78,58 178,58 216,74 L214,90 C176,76 80,76 42,90 Z';
/** Mèches avant en pointes qui retombent sur le bandeau (bouts de braise en bas). */
/** Mèches avant en flammes qui retombent sur le bandeau (bouts de braise en bas). */
const FORELOCKS: Array<[number, number, number, number, number, number]> = [[68, 40, 56, 92, 22, 0.2], [92, 28, 76, 106, 34, 0.3], [160, 30, 172, 98, 28, -0.3]];
/** Encolure du maillot : le cou s’arrête sur cette ligne (le buste est derrière). */
const NECKLINE = 'M40,200 L216,200 L216,286 C186,290 156,300 128,302 C100,300 70,290 40,286 Z';

function drawHead(): HTMLCanvasElement {
  const { c, ctx } = canvas(256, 312);
  // Cheveux arrière : calotte et tempes courtes (les pointes sont sur le plan arrière).
  const cap = P('M128,12 C76,12 40,46 36,98 C34,124 38,148 44,170 L56,168 C52,140 52,116 60,98 L196,98 C204,116 204,140 200,168 L212,170 C218,148 222,124 220,98 C216,46 180,12 128,12 Z');
  fill(ctx, cap, C.hair);
  clipped(ctx, cap, () => {
    fill(ctx, 'M128,0 L240,0 L240,200 L128,200 Z', C.hairShade, 0.5);
    taper(ctx, [62, 46, 84, 26, 108, 18, 128, 16], 0, 3, 1, C.hairHi, 0.8);
    for (const s of [[70, 30, 58, 60, 50, 100, 48, 150], [186, 30, 198, 60, 206, 100, 208, 150]] as Cubic[]) taper(ctx, s, 0.2, 1.2, 0.2, C.hairDeep, 0.7);
  });
  // Oreilles (dégagées), anneau d’or à l’oreille droite à l’écran.
  const earL = P('M50,130 C39,125 32,135 33,150 C34,165 40,176 53,180 Z');
  fill(ctx, earL, C.skin);
  taper(ctx, [47, 140, 40, 140, 39, 154, 45, 166], 0.3, 1.4, 0.3, C.skinShade, 0.8);
  stroke(ctx, earL, C.line, 1.1, 0.55);
  mirrored(ctx, 128, () => {
    fill(ctx, earL, C.skinShade);
    taper(ctx, [47, 140, 40, 140, 39, 154, 45, 166], 0.3, 1.4, 0.3, C.skinDeep, 0.8);
    stroke(ctx, earL, C.line, 1.2, 0.65);
  });
  ctx.save();
  ctx.strokeStyle = C.gold; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.arc(218, 181, 4.2, 0.2, Math.PI * 2 - 0.5); ctx.stroke();
  ctx.restore();
  fill(ctx, 'M216.4,177.6 A1.2,1.2 0 1 1 214,177.6 A1.2,1.2 0 1 1 216.4,177.6 Z', '#fff6d8', 0.9);
  // Cou large, dans l’ombre de la mâchoire, arrêté sur l’encolure du maillot.
  clipped(ctx, NECKLINE, () => {
    const neck = P('M96,210 C98,246 96,276 88,310 L168,310 C160,276 158,246 160,210 Z');
    fill(ctx, neck, C.skinShade);
    clipped(ctx, neck, () => {
      fill(ctx, 'M94,250 C100,270 98,290 92,310 L114,310 C110,292 106,272 100,250 Z', C.skin, 0.9);
      fill(ctx, 'M98,226 C112,250 124,262 134,268 C146,262 156,248 160,226 L162,256 C150,268 138,276 128,278 C116,276 104,268 96,256 Z', C.skinDeep, 0.55);
      taper(ctx, [124, 268, 126, 274, 128, 280, 130, 286], 0.2, 1.6, 0.2, C.skinDeep, 0.5);
      taper(ctx, [104, 232, 108, 256, 114, 280, 122, 300], 0.2, 1, 0.2, C.lineSoft, 0.35);
      taper(ctx, [152, 232, 150, 256, 144, 280, 136, 300], 0.2, 1.2, 0.2, C.skinDeep, 0.45);
    });
  });
  // Visage : aplat, puis modelé anguleux en aplats.
  const face = P(FACE);
  fill(ctx, face, C.skin);
  clipped(ctx, face, () => {
    fill(ctx, 'M198,60 C206,96 204,128 206,150 C206,166 198,180 188,192 C180,202 176,214 176,228 C176,244 168,258 152,268 L250,300 L250,40 Z', C.skinShade);
    // Ombres portées du bandeau et des mèches.
    fill(ctx, translatedPath(BAND, 2, 6), C.skinShade, 0.85);
    for (const l of FORELOCKS) { const sh = new Path2D(); sh.addPath(lockPath(l), new DOMMatrix([1, 0, 0, 1, 3, 6])); fill(ctx, sh, C.skinShade, 0.75); }
    for (const [i, cx] of EYE_CX.entries()) {
      const s = i === 0 ? 1 : -1;
      const g = ctx.createRadialGradient(cx + s * 6, 138, 2, cx + s * 4, 140, 30);
      g.addColorStop(0, 'rgba(120,58,40,0.4)');
      g.addColorStop(1, 'rgba(120,58,40,0)');
      fill(ctx, 'M0,96 L256,96 L256,180 L0,180 Z', g);
    }
    // Pommettes marquées, creux des joues, mâchoire.
    fill(ctx, 'M52,182 C62,196 70,210 74,230 C64,214 56,202 50,196 Z', C.skinShade, 0.85);
    taper(ctx, [186, 192, 180, 204, 176, 216, 174, 232], 0.2, 2.2, 0.2, C.skinDeep, 0.6);
    fill(ctx, 'M60,224 C74,242 92,256 106,262 C92,262 74,250 58,234 Z', C.skinShade, 0.6);
    // Nez : arête, plan d’ombre, dessous, narines, reflets.
    fill(ctx, 'M134,144 C139,162 144,180 150,192 C149,200 141,203 132,201 C138,192 138,174 132,156 Z', C.skinShade);
    fill(ctx, 'M113,200 C120,206 136,207 145,201 C141,209 119,209 113,200 Z', C.skinDeep, 0.9);
    fill(ctx, 'M115.6,200 C116.8,197.8 120.2,197.4 122.2,199.4 C120.2,201 117.4,201.2 115.6,200 Z', C.line, 0.8);
    fill(ctx, 'M140.4,200 C139.2,197.8 135.8,197.4 133.8,199.4 C135.8,201 138.6,201.2 140.4,200 Z', C.line, 0.8);
    fill(ctx, 'M125,156 C124,168 123,180 124.4,189 C126,181 127.2,170 127.8,158 Z', C.skinHi, 0.8);
    fill(ctx, 'M120,193 C122,190 127.6,189.6 130,192 C127.6,194.2 122.6,194.6 120,193 Z', C.skinHi, 0.85);
    taper(ctx, [116, 192, 112, 195.6, 113, 200, 117.4, 201.6], 0.4, 1.4, 0.5, C.lineSoft, 0.85);
    // Sillon, dessous de la lèvre, menton carré à fossette.
    taper(ctx, [124.4, 206, 124, 209, 124.2, 212, 124.8, 215], 0.2, 0.9, 0.2, C.skinShade, 0.6);
    taper(ctx, [131.6, 206, 132, 209, 131.8, 212, 131.2, 215], 0.2, 0.9, 0.2, C.skinShade, 0.8);
    fill(ctx, 'M114,237 C122,241.6 134,241.6 142,237 C137,244 120,244.4 114,237 Z', C.skinShade, 0.95);
    fill(ctx, 'M110,255 C118,251 132,251 140,255 C132,259 118,259 110,255 Z', C.skinHi, 0.45);
    taper(ctx, [128, 254, 128.4, 257, 128.6, 261, 128.4, 265], 0.2, 1.1, 0.2, C.skinDeep, 0.55);
    // Reflets : pommette gauche, front sous le bandeau.
    fill(ctx, 'M52,168 C60,163 72,162.4 82,165 C72,166.4 62,169 54,173 Z', C.skinHi, 0.4);
    fill(ctx, 'M88,92 C98,88 112,87 124,89 C112,92 100,94 92,98 Z', C.skinHi, 0.25);
    const g = ctx.createRadialGradient(74, 192, 2, 74, 192, 20);
    g.addColorStop(0, 'rgba(212,112,94,0.14)');
    g.addColorStop(1, 'rgba(212,112,94,0)');
    fill(ctx, 'M0,160 L256,160 L256,220 L0,220 Z', g);
    // Cicatrice sur la pommette (à droite à l’écran) : trait clair bordé, trois points de suture.
    taper(ctx, [180, 166, 186, 175, 192, 186, 199, 199], 0.6, 2.6, 0.5, C.scar, 0.95);
    taper(ctx, [181.6, 165, 187.6, 174, 193.8, 185, 200.6, 198], 0.2, 0.7, 0.1, C.scarEdge, 0.7);
    for (const [x, y] of [[184, 171], [189.4, 180], [195, 190]]) taper(ctx, [x! - 3.4, y! + 2, x! - 1, y! + 0.6, x! + 1, y! - 0.6, x! + 3.4, y! - 2], 0.3, 0.8, 0.3, C.scarEdge, 0.75);
  });
  const contour: Array<[Cubic, number, number, number]> = [
    [[46, 150, 47, 172, 48, 192, 52, 206], 0.5, 1.1, 1.4],
    [[52, 206, 54, 212, 56, 218, 58, 222], 1.4, 1.6, 1.8],
    [[58, 222, 64, 236, 84, 254, 104, 264], 1.8, 2.2, 2],
    [[104, 264, 112, 268, 144, 268, 152, 264], 2, 2.4, 2.2],
    [[152, 264, 172, 254, 192, 236, 198, 222], 2.2, 2.8, 2.8],
    [[198, 222, 206, 204, 209, 182, 210, 150], 2.8, 2.4, 1.2],
  ];
  for (const [s, a, b, d] of contour) taper(ctx, s, a, b, d, C.line, 0.88);
  return c;
}

/** Bandeau (au-dessus des yeux) et mèches-flammes qui retombent dessus. */
function drawFront(): HTMLCanvasElement {
  const { c, ctx } = canvas(256, 312);
  const box: [number, number, number, number] = [0, 0, 256, 312];
  const band = P(BAND);
  fill(ctx, band, C.band);
  clipped(ctx, band, () => {
    fill(ctx, 'M30,82 C80,68 176,68 226,82 L226,100 L30,100 Z', C.bandShade, 0.8);
    fill(ctx, 'M150,50 L240,50 L240,100 L150,100 Z', C.bandShade, 0.35);
    taper(ctx, [48, 72, 80, 62, 112, 60, 136, 60], 0, 2.2, 0, C.bandHi, 0.85);
    for (const x of [62, 88, 168, 194]) taper(ctx, [x, 68, x + 1, 74, x + 2, 80, x + 3, 86], 0.2, 0.8, 0.2, C.bandShade, 0.6);
  });
  stroke(ctx, band, C.line, 1.2, 0.7);
  // Plaque de laiton frappée de la Cendre.
  const plate = P('M112,64 C112,61 114,60 117,60 L139,60 C142,60 144,61 144,64 L144,80 C144,83 142,84 139,84 L117,84 C114,84 112,83 112,80 Z');
  fill(ctx, plate, C.plate);
  clipped(ctx, plate, () => {
    fill(ctx, 'M128,56 L150,56 L150,90 L128,90 Z', C.plateDeep, 0.45);
    taper(ctx, [114, 62, 120, 61, 128, 61, 136, 61.4], 0, 1.4, 0, C.plateHi, 0.9);
  });
  stroke(ctx, plate, C.plateDeep, 1.1, 0.9);
  ctx.fillStyle = C.jacketDeep;
  drawEmblem(ctx, 'Cendre', 128, 72, 7);
  // Mèches en flammes sur le bandeau, bouts de braise.
  for (const l of FORELOCKS) flameLock(ctx, l, 0.8, 0.3);
  return c;
}

/** Mèche-flamme : base (bx, by) de largeur w, pointe (tx, ty), courbure `bend` (vers la normale gauche de l’axe). */
type Lock = [number, number, number, number, number, number];

function lockPath(l: Lock, p = new Path2D()): Path2D {
  const [bx, by, tx, ty, w, bend] = l;
  const dx = tx - bx;
  const dy = ty - by;
  const len = Math.hypot(dx, dy);
  const nx = -dy / len;
  const ny = dx / len;
  const b = -bend * len; // bend > 0 : la pointe se recourbe vers la droite de l’écran (mèche montante)
  const lx = bx - nx * w / 2;
  const ly = by - ny * w / 2;
  const rx = bx + nx * w / 2;
  const ry = by + ny * w / 2;
  p.moveTo(lx, ly);
  p.bezierCurveTo(lx + dx * 0.35 - nx * b * 0.25, ly + dy * 0.35 - ny * b * 0.25, tx - dx * 0.28 - nx * b * 0.35, ty - dy * 0.28 - ny * b * 0.35, tx, ty);
  p.bezierCurveTo(tx - dx * 0.32 - nx * b * 0.15 + nx * w * 0.2, ty - dy * 0.32 - ny * b * 0.15 + ny * w * 0.2, rx + dx * 0.45 - nx * b * 0.3, ry + dy * 0.45 - ny * b * 0.3, rx, ry);
  p.closePath();
  return p;
}

/** Une mèche : aplat, ombre et reflet de bord, bandes de braise vers la pointe, contour. */
function flameLock(ctx: Ctx, l: Lock, light: number, mid: number | null = null): void {
  const [bx, by, tx, ty, w] = l;
  const p = lockPath(l);
  const box: [number, number, number, number] = [Math.min(bx, tx) - w - 20, Math.min(by, ty) - w - 20, Math.max(bx, tx) + w + 20, Math.max(by, ty) + w + 20];
  fill(ctx, p, C.hair);
  clipped(ctx, p, () => {
    const dx = tx - bx;
    const dy = ty - by;
    const len = Math.hypot(dx, dy);
    const nx = (-dy / len) * 80;
    const ny = (dx / len) * 80;
    const band = (t0: number) => `M${bx + dx * t0 + nx},${by + dy * t0 + ny} L${bx + dx * t0 - nx},${by + dy * t0 - ny} L${bx + dx * 1.6 - nx},${by + dy * 1.6 - ny} L${bx + dx * 1.6 + nx},${by + dy * 1.6 + ny} Z`;
    if (mid !== null) fill(ctx, band(mid), C.hairHi, 0.95);
    fill(ctx, band(mid !== null ? 0.62 : 0.42), C.ember, 0.9);
    fill(ctx, band(mid !== null ? 0.82 : 0.66), C.emberHi, 0.9);
    if (mid === null) fill(ctx, band(0.86), C.emberGlow, 0.85);
    edgeBand(ctx, p, -5, -2, C.hairShade, 0.85, box);
    edgeBand(ctx, p, 3, 1, C.hairHi, light, box);
  });
  stroke(ctx, p, C.hairDeep, 1.1, 0.9);
}

/** Chevelure en flammes (derrière la tête) et queues du bandeau (col montant retiré : mal intégré, jugé superflu par le responsable). */
const LOCKS: Lock[] = [
  [50, 96, 14, 40, 40, -0.1], [214, 104, 254, 70, 30, 0.25], [66, 66, 40, 0, 46, 0.12], [200, 72, 250, 20, 40, 0.3],
  [92, 46, 80, -30, 50, 0.22], [176, 50, 226, -14, 46, 0.34], [122, 38, 122, -44, 52, 0.3], [150, 40, 182, -36, 50, 0.36],
];

function drawBack(): HTMLCanvasElement {
  const { c, ctx } = backCanvasH();
  // Queues du bandeau, nouées derrière la tête, qui flottent à droite.
  for (const [d, col] of [['M206,78 C230,70 254,78 276,98 C262,100 246,94 212,92 Z', C.band], ['M208,88 C228,94 246,108 258,132 C246,124 230,112 206,98 Z', C.bandShade]] as const) {
    fill(ctx, d, col);
    stroke(ctx, d, C.line, 1, 0.6);
  }
  // Calotte, puis mèches-flammes des côtés vers le centre (les dernières recouvrent les premières).
  const cap = P('M128,22 C80,22 42,50 40,98 L216,98 C214,50 176,22 128,22 Z');
  fill(ctx, cap, C.hair);
  clipped(ctx, cap, () => fill(ctx, 'M128,0 L240,0 L240,120 L128,120 Z', C.hairShade, 0.5));
  LOCKS.forEach((l, i) => flameLock(ctx, l, l[2] < 128 ? 0.75 : 0.35 + i * 0.01));
  return c;
}


/** Buste : veste de docker ouverte sur un maillot sombre, revers à liseré, baudrier, écusson de la Cendre. */
function drawTorso(): HTMLCanvasElement {
  const { c, ctx } = torsoCanvasH();
  const body = P('M96,282 C56,288 0,300 -44,318 C-72,332 -86,356 -90,388 L-94,610 L350,610 L346,388 C342,356 328,332 300,318 C256,300 200,288 160,282 Z');
  fill(ctx, body, C.jacket);
  clipped(ctx, body, () => {
    fill(ctx, 'M-90,388 C-86,356 -72,332 -44,318 C-58,338 -68,362 -72,396 L-76,610 L-96,610 Z', C.jacketHi, 0.85);
    fill(ctx, 'M258,302 C300,316 330,338 346,388 L350,610 L268,610 C280,500 280,400 258,302 Z', C.jacketShade, 0.85);
    for (const s of [[-36, 346, -42, 390, -44, 440, -42, 490], [292, 346, 298, 390, 300, 440, 298, 490], [20, 334, 24, 376, 26, 420, 24, 470], [236, 334, 232, 376, 230, 420, 232, 470]] as Cubic[]) taper(ctx, s, 0, 4, 0, C.jacketDeep, 0.7);
    const shirt = P('M96,284 L160,284 L180,450 L76,450 Z');
    fill(ctx, shirt, C.shirt);
    clipped(ctx, shirt, () => fill(ctx, 'M128,284 L170,284 L190,450 L128,450 Z', C.shirtShade, 0.7));
    const lapel = 'M96,284 C88,320 90,380 104,450 L86,450 C74,380 74,316 82,288 Z';
    fill(ctx, lapel, C.jacketHi);
    stroke(ctx, 'M96,284 C88,320 90,380 104,450', C.trim, 1.4, 0.9);
    mirrored(ctx, 128, () => {
      fill(ctx, lapel, C.jacketLight);
      stroke(ctx, 'M96,284 C88,320 90,380 104,450', C.trimDeep, 1.4, 0.9);
    });
    // Baudrier de cuir, de l’épaule droite (à gauche à l’écran) vers la hanche.
    const strap = P('M6,302 L26,296 L222,446 L202,452 Z');
    fill(ctx, strap, C.leather);
    stroke(ctx, 'M12,303 L208,451', C.leatherHi, 0.8, 0.6);
    stroke(ctx, 'M22,298 L218,446', C.leatherHi, 0.8, 0.4);
    const buckle = P('M86,354 L104,352 L108,372 L90,374 Z');
    fill(ctx, buckle, C.buckle);
    stroke(ctx, buckle, C.plateDeep, 1, 0.9);
    // Écusson de la Cendre sur la poitrine (à droite à l’écran).
    ctx.save();
    ctx.beginPath(); ctx.arc(214, 356, 12, 0, Math.PI * 2);
    ctx.fillStyle = C.jacketDeep; ctx.fill();
    ctx.lineWidth = 1.4; ctx.strokeStyle = C.trim; ctx.stroke();
    ctx.fillStyle = C.trim;
    drawEmblem(ctx, 'Cendre', 214, 356, 7.5);
    ctx.restore();
  });
  stroke(ctx, body, C.jacketDeep, 2, 0.8);
  return c;
}

const BROWS_KAI: Record<BrowShape, string> = {
  rest: 'M2,16 C12,11 26,7.6 40,6.6 C52,5.8 61,6.6 68,8.2 C70.6,9 71.2,12.6 70,16.4 C61,14.8 51,14 41,14 C28,14 15,15.6 2,17.6 Z',
  arch: 'M2,18.4 C10,10 22,5 36,4 C50,3.2 60,5.6 67.6,9.4 C70.4,10.8 71,14 69.6,17.2 C60,14.6 50,12.6 40,12.4 C27,12.2 14,14.4 2,18.4 Z',
  knit: 'M2,12.4 C16,9.4 30,8.6 44,9.6 C55,10.4 63,12.8 69,15.8 C71.2,17 71,20 69,21.4 C60,18.4 50,16.6 40,16 C27,15.4 14,15 2,15.4 Z',
};

export const KAI_V2: FigureV2Kit = {
  id: 'braise',
  colors: {
    skinShade: C.skinShade, line: C.line, lineSoft: C.lineSoft, lash: C.lash, lashSoft: C.lashSoft, brow: C.brow, browHi: C.browHi,
    lipUp: C.lipUp, lipLow: C.lipLow, lipHi: C.lipHi, iris: C.iris, irisDeep: C.irisDeep, irisLight: C.irisLight, irisAmber: C.irisAmber,
    pupil: C.pupil, irisGlow: '255,200,110', lashWeight: 0.78, lashWing: false, lashStrands: false,
  },
  brows: BROWS_KAI,
  // Tempérament : sûr de lui, explosif ; sourire en coin un sourcil haussé, triomphe à pleines dents.
  moods: {
    confident: { browL: 0.35, browR: -0.05, browAngle: 0.1, lid: 0.3, squint: 0.15, tilt: 0.04, mouth: 'smirk' },
    smug: { browL: 0.5, browR: -0.15, lid: 0.38, squint: 0.2, tilt: 0.07, mouth: 'smirk' },
    triumphant: { browL: 0.4, browR: 0.4, lid: 0.18, squint: 0.45, tilt: -0.04, flush: 0.2, mouth: 'grin' },
  },
  head: drawHead,
  front: drawFront,
  back: drawBack,
  torso: drawTorso,
};
