/**
 * M10-C — identités V2 des quatre chefs de famille du mode Aventure (noms de travail retenus par le responsable, S1),
 * sur le socle commun `../figureV2`, plus âgés et plus graves que les bras droits (les rivaux signatures) :
 *   - **Bran, le Premier Feu** (Cendre) : crâne rasé, couronne de cheveux gris, barbe carrée gris de fer aux reflets de
 *     braise, brûlure à la tempe, manteau de forge noir de suie doublé de rouge, col haut riveté, médaillon de fer ;
 *   - **Mère Aubépine, la Gardienne du Fanal** (Ronce) : cheveux blancs en couronne tressée piquée d'aubépine en fleur,
 *     visage rond et ridé, yeux verts, châle de laine vert croisé, broche de branche d'épines ;
 *   - **Ilse, la Dame aux Voiles** (Voile) : cheveux noirs à mèche blanche sous un voile de dentelle indigo bordé
 *     d'argent, fronteau d'argent, regard gris, robe à col haut brodée d'yeux, miroir rond en pendentif ;
 *   - **Halvard, le Cartographe** (Astre) : front haut, longs cheveux blancs, moustache et barbiche blanches, monocle
 *     cerclé d'or à chaînette, manteau bleu nuit brodé d'une rose des vents, étui de carte en bandoulière.
 * Mêmes conventions que les rivaux : espace H, lumière en haut à gauche, traits d'encre effilés ; aucune image.
 * Identifiants `chef-<famille>` (hors des quatre rivaux signatures : le jeu standard ne les tire jamais).
 */
import { drawEmblem } from '../../art/emblems';
import { hashString, makeRng } from '../../game/engine/rng';
import {
  backCanvasH, canvas, clipped, EYE_CX, EYE_Y, fill, mirrored, P, softShade, stroke, taper, torsoCanvasH,
  type BrowShape, type Ctx, type Cubic, type FigureV2Kit,
} from '../figureV2';

// ---------------------------------------------------------------------------------------------------------------
// Aides communes : teint, oreilles, cou, modelé, rides

interface Teint { skinHi: string; skin: string; skinShade: string; skinDeep: string; line: string; lineSoft: string }

const EAR = 'M50,130 C39,125 32,135 33,150 C34,165 40,176 53,180 Z';
const SHADE_R = 'M206,66 C210,100 208,130 209,154 C207,170 198,184 188,194 C180,204 176,216 176,230 C176,246 168,258 152,268 L250,300 L250,40 Z';
const NECKLINE = 'M40,200 L216,200 L216,286 C188,292 158,300 128,302 C98,300 68,292 40,286 Z';
/** Visage carré (Bran), rond et doux (Mère Aubépine), ovale fin (Ilse), long et creusé (Halvard). */
const FACES = {
  carre: 'M128,50 C94,50 60,60 50,94 C44,116 44,140 46,160 C47,182 50,204 58,222 C64,236 84,254 104,264 C112,268 144,268 152,264 C172,254 192,236 198,222 C206,204 209,182 210,160 C212,140 212,116 206,94 C196,60 162,50 128,50 Z',
  rond: 'M128,52 C94,52 58,62 50,98 C44,120 45,144 47,164 C49,186 55,206 66,224 C78,242 98,258 116,265 C123,268 133,268 140,265 C158,258 178,242 190,224 C201,206 207,186 209,164 C211,144 212,120 206,98 C198,62 162,52 128,52 Z',
  ovale: 'M128,56 C97,56 64,64 55,97 C49,119 49,143 50,162 C51,183 56,203 66,221 C77,239 97,255 114,264 C122,267.6 134,267.6 142,264 C159,255 179,239 190,221 C200,203 205,183 206,162 C207,143 207,119 201,97 C192,64 159,56 128,56 Z',
  long: 'M128,46 C96,46 64,56 55,92 C49,116 49,142 51,164 C53,188 58,210 68,230 C78,248 98,264 116,272 C123,275 133,275 140,272 C158,264 178,248 188,230 C198,210 203,188 205,164 C207,142 207,116 201,92 C192,56 160,46 128,46 Z',
} as const;
type Forme = keyof typeof FACES;

function oreilles(ctx: Ctx, t: Teint, boucle?: { color: string; hi: string }): void {
  const ear = P(EAR);
  fill(ctx, ear, t.skin);
  taper(ctx, [47, 140, 40, 140, 39, 154, 45, 166], 0.3, 1.4, 0.3, t.skinShade, 0.8);
  stroke(ctx, ear, t.line, 1.1, 0.55);
  mirrored(ctx, 128, () => {
    fill(ctx, ear, t.skinShade);
    taper(ctx, [47, 140, 40, 140, 39, 154, 45, 166], 0.3, 1.4, 0.3, t.skinDeep, 0.85);
    stroke(ctx, ear, t.line, 1.2, 0.65);
  });
  if (boucle) for (const x of [41, 215]) {
    const p = new Path2D();
    p.ellipse(x, 184, 3.2, 4.4, 0, 0, Math.PI * 2);
    fill(ctx, p, boucle.color);
    fill(ctx, `M${x - 1.6},${182} A1,1 0 1 1 ${x - 0.4},${182} A1,1 0 1 1 ${x - 1.6},${182} Z`, boucle.hi, 0.9);
  }
}

function cou(ctx: Ctx, t: Teint, large = false): void {
  clipped(ctx, NECKLINE, () => {
    const neck = P(large ? 'M92,210 C94,246 92,276 84,310 L172,310 C164,276 162,246 164,210 Z' : 'M100,210 C102,246 100,276 92,310 L164,310 C156,276 154,246 156,210 Z');
    fill(ctx, neck, t.skinShade);
    clipped(ctx, neck, () => {
      fill(ctx, 'M96,250 C102,270 100,290 94,310 L114,310 C110,292 106,272 102,250 Z', t.skin, 0.85);
      fill(ctx, 'M98,226 C112,250 124,262 134,268 C146,262 156,248 158,226 L160,256 C150,268 138,276 128,278 C116,276 104,268 98,256 Z', t.skinDeep, 0.55);
      taper(ctx, [106, 232, 110, 256, 116, 280, 124, 300], 0.2, 1, 0.2, t.skinDeep, 0.4);
      taper(ctx, [150, 232, 148, 256, 142, 280, 134, 300], 0.2, 1.1, 0.2, t.skinDeep, 0.45);
    });
  });
}

/** Modelé commun : ombre propre, orbites, nez, sillon, menton ; `age` (0 à 1) : poches, plis, pattes d'oie, front. */
function modele(ctx: Ctx, t: Teint, age: number, front: number): void {
  softShade(ctx, SHADE_R, t.skinShade);
  for (const [i, cx] of EYE_CX.entries()) {
    const s = i === 0 ? 1 : -1;
    const g = ctx.createRadialGradient(cx + s * 6, 138, 2, cx + s * 4, 140, 30);
    g.addColorStop(0, 'rgba(70,34,24,0.36)');
    g.addColorStop(1, 'rgba(70,34,24,0)');
    fill(ctx, 'M0,96 L256,96 L256,180 L0,180 Z', g);
  }
  fill(ctx, 'M52,182 C62,196 70,210 74,228 C64,214 56,202 50,196 Z', t.skinShade, 0.75);
  // Nez : arête, plan d'ombre, dessous, narines, reflets.
  fill(ctx, 'M134,146 C139,162 144,180 150,192 C149,200 141,203 132,201 C138,192 138,174 132,156 Z', t.skinShade);
  fill(ctx, 'M112,200 C119,206 137,207 146,201 C142,209 118,209 112,200 Z', t.skinDeep, 0.9);
  fill(ctx, 'M115,200 C116.2,197.8 119.8,197.4 121.8,199.4 C119.8,201 117,201.2 115,200 Z', t.line, 0.8);
  fill(ctx, 'M141,200 C139.8,197.8 136.2,197.4 134.2,199.4 C136.2,201 139,201.2 141,200 Z', t.line, 0.8);
  fill(ctx, 'M125,156 C124,168 123,180 124.4,189 C126,181 127.2,170 127.8,158 Z', t.skinHi, 0.75);
  fill(ctx, 'M120,193 C122,190 127.6,189.6 130,192 C127.6,194.2 122.6,194.6 120,193 Z', t.skinHi, 0.8);
  taper(ctx, [116, 192, 112, 195.6, 113, 200, 117.4, 201.6], 0.4, 1.4, 0.5, t.lineSoft, 0.8);
  taper(ctx, [124.4, 206, 124, 209, 124.2, 212, 124.8, 215], 0.2, 0.9, 0.2, t.skinShade, 0.6);
  taper(ctx, [131.6, 206, 132, 209, 131.8, 212, 131.2, 215], 0.2, 0.9, 0.2, t.skinShade, 0.8);
  fill(ctx, 'M114,238 C122,242.6 134,242.6 142,238 C137,245 120,245.4 114,238 Z', t.skinShade, 0.85);
  fill(ctx, 'M52,168 C60,163 72,162.4 82,165 C72,166.4 62,169 54,173 Z', t.skinHi, 0.4);
  if (age <= 0) return;
  // Poches sous les yeux, plis du nez à la bouche, pattes d'oie, plis d'amertume, rides du front.
  for (const sx of [0, 1]) {
    const m = (c: Cubic): Cubic => (sx ? [256 - c[0], c[1], 256 - c[2], c[3], 256 - c[4], c[5], 256 - c[6], c[7]] : c);
    const ink = sx ? t.skinDeep : t.lineSoft;
    taper(ctx, m([64, 171, 74, 177, 88, 178, 100, 173]), 0.2, 1.1, 0.2, ink, 0.32 * age);
    taper(ctx, m([109, 197, 101, 206, 98, 216, 101, 229]), 0.3, 1.6, 0.4, ink, 0.55 * age);
    taper(ctx, m([52, 146, 48, 144.6, 45, 143.4, 42, 142.6]), 0.2, 0.9, 0.1, ink, 0.5 * age);
    taper(ctx, m([52, 152, 48, 152.2, 45, 152.6, 42, 153.2]), 0.2, 0.9, 0.1, ink, 0.5 * age);
    taper(ctx, m([53, 158, 49, 160, 46, 162, 43, 164.4]), 0.2, 0.9, 0.1, ink, 0.45 * age);
    taper(ctx, m([102, 238, 100, 245, 100, 252, 103, 258]), 0.2, 1, 0.2, ink, 0.35 * age);
  }
  for (const [i, y] of [front, front + 9, front + 18].entries()) {
    taper(ctx, [92 + i * 4, y + 2, 108, y - 1.2, 148, y - 1.2, 164 - i * 4, y + 2], 0.2, 1, 0.2, t.lineSoft, 0.28 * age);
  }
}

function contourVisage(ctx: Ctx, t: Teint, forme: Forme): void {
  const segs: Record<Forme, Array<[Cubic, number, number, number]>> = {
    carre: [[[46, 150, 47, 172, 48, 192, 52, 206], 0.5, 1.1, 1.4], [[52, 206, 56, 218, 70, 244, 104, 264], 1.4, 2, 2], [[152, 264, 186, 244, 200, 218, 204, 206], 2.2, 2.8, 2.6], [[204, 206, 208, 192, 209, 172, 210, 150], 2.6, 2.4, 1.2]],
    rond: [[[47, 150, 47, 172, 50, 192, 56, 208], 0.5, 1, 1.3], [[56, 208, 64, 228, 90, 252, 116, 265], 1.3, 1.8, 1.6], [[140, 265, 166, 252, 192, 228, 200, 208], 1.8, 2.4, 2.4], [[200, 208, 206, 192, 209, 172, 209, 150], 2.4, 2.2, 1]],
    ovale: [[[50, 150, 50.5, 170, 52.5, 190, 57, 205], 0.4, 0.8, 1], [[57, 205, 66, 228, 92, 252, 114, 264], 1, 1.5, 1.4], [[142, 264, 164, 252, 190, 228, 199, 205], 1.6, 2.2, 2.2], [[199, 205, 203.5, 190, 205.5, 170, 206, 150], 2.2, 1.9, 0.8]],
    long: [[[51, 150, 51.5, 174, 54, 196, 60, 214], 0.4, 0.9, 1.2], [[60, 214, 70, 240, 94, 262, 116, 272], 1.2, 1.7, 1.6], [[140, 272, 162, 262, 186, 240, 196, 214], 1.8, 2.3, 2.3], [[196, 214, 202, 196, 204.5, 174, 205, 150], 2.3, 2, 0.9]],
  };
  for (const [s, a, b, d] of segs[forme]) taper(ctx, s, a, b, d, t.line, 0.85);
}

/** Barbe et moustache texturées (poils courts semés), sous les couches animées de la bouche. */
function poils(ctx: Ctx, zone: Path2D, rng: () => number, n: number, x0: number, y0: number, w: number, h: number, hi: string, deep: string): void {
  clipped(ctx, zone, () => {
    for (let i = 0; i < n; i++) {
      const x = x0 + rng() * w;
      const y = y0 + rng() * h;
      const a = (rng() - 0.5) * 0.9;
      const col = rng() < 0.55 ? hi : deep;
      taper(ctx, [x, y, x + a * 1.2, y + 1.4, x + a * 2.2, y + 2.8, x + a * 2.8, y + 4], 0.1, 0.65, 0.1, col, x < 128 ? 0.55 : 0.35);
    }
  });
}

const BODY = 'M96,282 C56,288 0,300 -44,318 C-72,332 -86,356 -90,388 L-94,610 L350,610 L346,388 C342,356 328,332 300,318 C256,300 200,288 160,282 Z';
const FOLDS: Cubic[] = [[-36, 346, -42, 390, -44, 440, -42, 490], [292, 346, 298, 390, 300, 440, 298, 490], [20, 334, 24, 376, 26, 420, 24, 470], [236, 334, 232, 376, 230, 420, 232, 470]];

const disc = (ctx: Ctx, x: number, y: number, r: number, color: string, alpha = 1) => {
  const p = new Path2D();
  p.arc(x, y, r, 0, Math.PI * 2);
  fill(ctx, p, color, alpha);
};

// ---------------------------------------------------------------------------------------------------------------
// Bran, le Premier Feu (Cendre)

const B = {
  skinHi: '#e9b892', skin: '#c88d66', skinShade: '#9a5e44', skinDeep: '#6c3a28', line: '#2e140c', lineSoft: '#5e2e1e',
  burn: '#d77a64', burnHi: '#f0a890',
  hair: '#5a5652', hairShade: '#363230', hairDeep: '#181614', hairHi: '#9a958f',
  beard: '#4e4a47', beardHi: '#a8a29c', beardDeep: '#1e1b19', ember: '#e2622a', emberHi: '#ffb060',
  coat: '#2c2624', coatHi: '#504642', coatShade: '#181413', coatDeep: '#0c0a09', lining: '#a8301a', liningHi: '#d8542a',
  iron: '#6e6864', ironHi: '#b4aea6', ironDeep: '#2c2826', brass: '#c9902a', brassHi: '#f2c46a',
  lash: '#1c0e08', lashSoft: '#4a2a1c', brow: '#3e3a37', browHi: '#9a948e',
  lipUp: '#9a5644', lipLow: '#b06a54', lipHi: '#d89a84',
  iris: '#c8641a', irisDeep: '#3a1606', irisLight: '#ffb060', irisAmber: '#ff6a20', pupil: '#0a0604',
};
const BRAN_BEARD = 'M46,166 C47,188 50,206 58,222 C66,240 82,258 96,270 C104,282 116,292 128,293 C140,292 152,282 160,270 C174,258 190,240 198,222 C206,206 209,188 210,166 L203,170 C200,190 192,208 182,220 C170,232 156,238 144,238 C138,236 133,234 128,234 C123,234 118,236 112,238 C100,238 86,232 74,220 C64,208 56,190 53,170 Z';
const BRAN_MUSTACHE = 'M100,214 C104,204 116,201 128,205 C140,201 152,204 156,214 C158,219 154,224 150,223 C146,216 138,212 128,213 C118,212 110,216 106,223 C102,224 98,219 100,214 Z';

function branHead(seed: number): HTMLCanvasElement {
  const { c, ctx } = canvas(256, 312);
  const rng = makeRng(hashString(`chef-cendre-v2|${seed}`));
  // Crâne rasé (dôme de peau) et couronne de cheveux gris ras sur les côtés et la nuque.
  const dome = P('M128,14 C80,14 44,46 40,98 C38,120 40,140 44,160 L212,160 C216,140 218,120 216,98 C212,46 176,14 128,14 Z');
  fill(ctx, dome, B.skin);
  clipped(ctx, dome, () => {
    softShade(ctx, 'M170,18 C204,34 218,70 218,110 L250,110 L250,0 Z', B.skinShade);
    fill(ctx, 'M62,40 C80,24 102,18 118,18 C98,26 80,38 68,56 Z', B.skinHi, 0.55);
    for (const sx of [0, 1]) {
      const side = P(sx ? 'M214,96 C216,120 214,144 210,164 L196,160 C200,140 202,118 198,100 Z' : 'M42,96 C40,120 42,144 46,164 L60,160 C56,140 54,118 58,100 Z');
      fill(ctx, side, B.hair);
      clipped(ctx, side, () => { for (let i = 0; i < 40; i++) disc(ctx, (sx ? 196 : 40) + rng() * 20, 96 + rng() * 68, 0.7, rng() < 0.5 ? B.hairHi : B.hairDeep, 0.6); });
    }
  });
  oreilles(ctx, B);
  cou(ctx, B, true);
  const face = P(FACES.carre);
  fill(ctx, face, B.skin);
  clipped(ctx, face, () => {
    modele(ctx, B, 0.75, 92);
    // Brûlure ancienne sur la tempe gauche à l'écran, qui file vers la lisière : peau marbrée, bords irréguliers.
    const burn = P('M50,96 C56,88 66,84 76,88 C84,92 86,100 82,108 C78,116 70,118 66,124 C62,130 54,128 50,120 C47,112 47,102 50,96 Z');
    fill(ctx, burn, B.burn, 0.3);
    clipped(ctx, burn, () => { for (let i = 0; i < 26; i++) disc(ctx, 48 + rng() * 38, 84 + rng() * 44, 0.8 + rng() * 1.8, rng() < 0.5 ? B.burnHi : B.skinShade, 0.32); });
    taper(ctx, [52, 94, 62, 86, 74, 86, 82, 94], 0.2, 1, 0.2, B.skinDeep, 0.3);
    taper(ctx, [80, 110, 72, 118, 64, 126, 54, 126], 0.2, 0.9, 0.2, B.skinDeep, 0.25);
    // Barbe carrée gris de fer et moustache épaisse, quelques braises prises dans les poils.
    const beard = P(BRAN_BEARD);
    fill(ctx, beard, B.beard);
    poils(ctx, beard, rng, 320, 46, 164, 166, 130, B.beardHi, B.beardDeep);
    fill(ctx, BRAN_MUSTACHE, B.beard);
    poils(ctx, P(BRAN_MUSTACHE), rng, 60, 98, 200, 60, 26, B.beardHi, B.beardDeep);
    for (let i = 0; i < 7; i++) {
      const x = 70 + rng() * 116;
      const y = 236 + rng() * 44;
      disc(ctx, x, y, 1.6, B.ember, 0.85);
      disc(ctx, x - 0.4, y - 0.4, 0.7, B.emberHi, 0.95);
    }
  });
  // Le bas de la barbe déborde sous le menton (au-dessus du cou).
  const under = P('M96,262 C104,280 116,292 128,293 C140,292 152,280 160,262 C150,272 140,278 128,279 C116,278 106,272 96,262 Z');
  fill(ctx, under, B.beard);
  poils(ctx, under, rng, 60, 96, 260, 64, 36, B.beardHi, B.beardDeep);
  stroke(ctx, 'M58,222 C66,240 82,258 96,270 C104,282 116,292 128,293 C140,292 152,282 160,270 C174,258 190,240 198,222', B.beardDeep, 1.4, 0.75);
  contourVisage(ctx, B, 'carre');
  return c;
}

/** Moustache tombante par-dessus la lèvre (au-dessus des couches animées), sourcils broussailleux portés par le socle. */
function branFront(): HTMLCanvasElement {
  const { c, ctx } = canvas(256, 312);
  const rng = makeRng(hashString('chef-cendre-v2|moustache'));
  const m = P('M98,213 C102,206 114,203 128,207 C142,203 154,206 158,213 C160,220 156,226 151,226 C147,219 138,215 128,216 C118,215 109,219 105,226 C100,226 96,220 98,213 Z');
  fill(ctx, m, B.beard);
  poils(ctx, m, rng, 90, 96, 202, 64, 26, B.beardHi, B.beardDeep);
  stroke(ctx, m, B.beardDeep, 0.9, 0.7);
  return c;
}

/** Col haut du manteau de forge, riveté, doublé de rouge, qui monte derrière la nuque. */
function branBack(): HTMLCanvasElement {
  const { c, ctx } = backCanvasH();
  const collar = P('M-6,330 C-4,300 10,262 40,236 L216,236 C246,262 260,300 262,330 C228,312 180,300 128,300 C76,300 28,312 -6,330 Z');
  fill(ctx, collar, B.coat);
  clipped(ctx, collar, () => {
    fill(ctx, 'M40,236 L216,236 C232,250 244,266 252,284 C214,268 172,262 128,262 C84,262 42,268 4,284 C12,266 24,250 40,236 Z', B.lining, 0.95);
    fill(ctx, 'M40,236 L80,236 C60,252 44,270 30,296 L4,300 C14,276 26,254 40,236 Z', B.liningHi, 0.5);
    fill(ctx, 'M150,236 L216,236 C240,258 254,286 262,330 L200,310 Z', B.coatShade, 0.6);
  });
  stroke(ctx, collar, B.coatDeep, 1.6, 0.85);
  for (const x of [24, 52, 82, 174, 204, 232]) { disc(ctx, x, x < 128 ? 304 - (128 - x) * 0.18 : 304 - (x - 128) * 0.18, 3, B.brass); disc(ctx, x - 0.8, (x < 128 ? 304 - (128 - x) * 0.18 : 304 - (x - 128) * 0.18) - 0.8, 1.1, B.brassHi); }
  return c;
}

function branTorso(): HTMLCanvasElement {
  const { c, ctx } = torsoCanvasH();
  const body = P(BODY);
  fill(ctx, body, B.coat);
  clipped(ctx, body, () => {
    fill(ctx, 'M-90,388 C-86,356 -72,332 -44,318 C-58,338 -68,362 -72,396 L-76,610 L-96,610 Z', B.coatHi, 0.85);
    fill(ctx, 'M258,302 C300,316 330,338 346,388 L350,610 L268,610 C280,500 280,400 258,302 Z', B.coatShade, 0.85);
    // Ouverture du manteau sur la doublure rouge et un tablier de cuir.
    const opening = P('M100,284 L156,284 L176,450 L80,450 Z');
    fill(ctx, opening, B.lining);
    const apron = P('M108,300 L148,300 L164,450 L92,450 Z');
    fill(ctx, apron, '#4a2e1c');
    clipped(ctx, apron, () => { fill(ctx, 'M128,300 L160,300 L176,450 L128,450 Z', '#2e1a10', 0.6); for (let y = 320; y < 450; y += 22) stroke(ctx, `M96,${y} L160,${y + 4}`, '#6a4430', 0.8, 0.5); });
    // Bretelles de cuir et rivets.
    for (const d of ['M94,286 L108,286 L112,330 L98,330 Z', 'M148,286 L162,286 L158,330 L144,330 Z']) fill(ctx, d, '#5a3622');
    for (const [x, y] of [[103, 322], [153, 322]]) { disc(ctx, x!, y!, 2.6, B.brass); disc(ctx, x! - 0.7, y! - 0.7, 1, B.brassHi); }
    // Revers épais du manteau.
    const lapel = 'M100,284 C90,320 90,380 104,450 L80,450 C68,380 68,316 78,288 Z';
    fill(ctx, lapel, B.coatHi);
    stroke(ctx, 'M100,284 C90,320 90,380 104,450', B.liningHi, 1.4, 0.8);
    mirrored(ctx, 128, () => { fill(ctx, lapel, B.coat); stroke(ctx, 'M100,284 C90,320 90,380 104,450', B.lining, 1.4, 0.8); });
    // Chaîne et médaillon de fer frappé de la Cendre, posé sur le tablier.
    stroke(ctx, 'M102,290 C108,320 118,336 128,342 C138,336 148,320 154,290', B.iron, 1.6, 0.9);
    disc(ctx, 128, 358, 15, B.ironDeep);
    disc(ctx, 128, 358, 13, B.iron);
    clipped(ctx, (() => { const p = new Path2D(); p.arc(128, 358, 13, 0, Math.PI * 2); return p; })(), () => fill(ctx, 'M128,340 L150,340 L150,380 L128,380 Z', B.ironDeep, 0.35));
    ctx.save();
    ctx.fillStyle = B.ember;
    drawEmblem(ctx, 'Cendre', 128, 358, 8.4);
    ctx.restore();
    taper(ctx, [118, 348, 122, 346, 126, 345, 130, 345], 0, 1.2, 0, B.ironHi, 0.8);
    for (const s of FOLDS) taper(ctx, s, 0, 4, 0, B.coatDeep, 0.7);
  });
  stroke(ctx, body, B.coatDeep, 2, 0.8);
  return c;
}

const BROWS_BRAN: Record<BrowShape, string> = {
  rest: 'M1,17 C12,10 26,6 41,5.4 C53,5 62,6.6 69,9 C71.6,10 72,14.6 70.4,19 C61,16.4 51,15.4 41,15.6 C28,15.8 15,17.6 1,20 Z',
  arch: 'M1,19.6 C10,9.6 23,4 37,3 C51,2.2 61,5 68.6,9.6 C71.4,11.4 71.8,15.4 70.2,19.4 C60,15.6 50,13.4 40,13.4 C27,13.4 14,15.8 1,20.6 Z',
  knit: 'M1,13 C16,9.6 31,8.6 45,9.8 C56,10.8 64,13.6 70,17.4 C72.4,19 72,22.8 69.8,24 C60,20.2 50,18.2 40,17.8 C27,17.4 14,17.2 1,17.8 Z',
};

export const BRAN_V2: FigureV2Kit = {
  id: 'chef-cendre',
  colors: {
    skinShade: B.skinShade, line: B.line, lineSoft: B.lineSoft, lash: B.lash, lashSoft: B.lashSoft, brow: B.brow, browHi: B.browHi,
    lipUp: B.lipUp, lipLow: B.lipLow, lipHi: B.lipHi, iris: B.iris, irisDeep: B.irisDeep, irisLight: B.irisLight, irisAmber: B.irisAmber,
    pupil: B.pupil, irisGlow: '255,170,90', lashWeight: 0.8, lashWing: false, lashStrands: false,
  },
  brows: BROWS_BRAN,
  // Tempérament : la force tranquille du forgeron ; regard dur par en dessous, rire franc à la victoire.
  moods: {
    confident: { browL: -0.05, browR: -0.1, browAngle: 0.2, lid: 0.32, squint: 0.2, tilt: 0.02, mouth: 'tight', brow: 'knit' },
    triumphant: { browL: 0.3, browR: 0.3, lid: 0.22, squint: 0.45, tilt: -0.03, flush: 0.25, mouth: 'grin' },
  },
  head: branHead,
  front: branFront,
  back: branBack,
  torso: branTorso,
};

// ---------------------------------------------------------------------------------------------------------------
// Mère Aubépine, la Gardienne du Fanal (Ronce)

const A = {
  skinHi: '#f8d8c4', skin: '#e9b9a1', skinShade: '#c28c76', skinDeep: '#946250', line: '#4a2620', lineSoft: '#7e4a3e',
  hair: '#e8e4de', hairShade: '#bdb5ac', hairDeep: '#837b74', hairHi: '#ffffff',
  shawl: '#2f5a32', shawlHi: '#4f8a4c', shawlShade: '#1c3a1f', shawlDeep: '#0e2010', dress: '#5a2a2a', dressShade: '#3a1818',
  blossom: '#fbf5ee', blossomShade: '#d8c8bc', berry: '#b81e2a', berryHi: '#ff6a6a', leaf: '#4a7a3a', silver: '#c8ccd4', silverHi: '#ffffff',
  lash: '#3a2220', lashSoft: '#6a4a44', brow: '#b4aca4', browHi: '#ece8e2',
  lipUp: '#b07468', lipLow: '#c4887a', lipHi: '#e8b4a6',
  iris: '#4a8a3a', irisDeep: '#14300e', irisLight: '#a8dc7a', irisAmber: '#c8a03a', pupil: '#0a0806',
};

/** Fleur d'aubépine (cinq pétales et cœur rose) et baie rouge. */
function fleur(ctx: Ctx, x: number, y: number, r: number): void {
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    const p = new Path2D();
    p.ellipse(x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62, r * 0.55, r * 0.42, a, 0, Math.PI * 2);
    fill(ctx, p, A.blossom);
    stroke(ctx, p, A.blossomShade, 0.6, 0.8);
  }
  disc(ctx, x, y, r * 0.28, '#e8a0a8');
}
function baie(ctx: Ctx, x: number, y: number, r: number): void {
  disc(ctx, x, y, r, A.berry);
  disc(ctx, x - r * 0.35, y - r * 0.35, r * 0.35, A.berryHi, 0.85);
}

/** Tresse en couronne : maillons alternés le long d'une courbe. */
function couronne(ctx: Ctx, pts: Cubic, n: number, w: number, light = 1): void {
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const u = 1 - t;
    const x = u * u * u * pts[0] + 3 * u * u * t * pts[2] + 3 * u * t * t * pts[4] + t * t * t * pts[6];
    const y = u * u * u * pts[1] + 3 * u * u * t * pts[3] + 3 * u * t * t * pts[5] + t * t * t * pts[7];
    const p = new Path2D();
    p.ellipse(x, y, w * 0.62, w * 0.42, (i % 2 ? 0.5 : -0.5) + (t - 0.5) * 1.2, 0, Math.PI * 2);
    fill(ctx, p, i % 2 ? A.hair : A.hairShade);
    taper(ctx, [x - w * 0.4, y - w * 0.12, x - w * 0.1, y - w * 0.3, x + w * 0.1, y - w * 0.3, x + w * 0.4, y - w * 0.12], 0.2, 1, 0.2, A.hairHi, 0.7 * light);
    stroke(ctx, p, A.hairDeep, 0.8, 0.55);
  }
}

function aubepineHead(seed: number): HTMLCanvasElement {
  const { c, ctx } = canvas(256, 312);
  const rng = makeRng(hashString(`chef-ronce-v2|${seed}`));
  // Cheveux blancs lissés en arrière, raie au milieu, ondulations douces.
  const cap = P('M128,16 C78,16 40,48 38,100 C37,126 40,148 46,168 L58,164 C54,140 54,116 62,96 C80,80 104,76 128,78 C152,76 176,80 194,96 C202,116 202,140 198,164 L210,168 C216,148 219,126 218,100 C216,48 178,16 128,16 Z');
  fill(ctx, cap, A.hair);
  clipped(ctx, cap, () => {
    fill(ctx, 'M128,0 L240,0 L240,200 L128,200 Z', A.hairShade, 0.5);
    for (let i = 0; i < 9; i++) {
      const x = 48 + i * 9;
      taper(ctx, [128, 20, x + 20, 30, x + 2, 60, x - 6, 100 + i * 3], 0.2, 1, 0.2, i % 2 ? A.hairDeep : A.hairHi, 0.45);
      taper(ctx, [128, 20, 256 - x - 20, 30, 256 - x - 2, 60, 256 - x + 6, 100 + i * 3], 0.2, 1, 0.2, A.hairDeep, 0.4);
    }
    stroke(ctx, 'M128,20 C128,40 128,60 128,78', A.hairDeep, 1.2, 0.6);
  });
  oreilles(ctx, A, { color: '#3e8a4a', hi: '#bff0c0' });
  cou(ctx, A);
  const face = P(FACES.rond);
  fill(ctx, face, A.skin);
  clipped(ctx, face, () => {
    modele(ctx, A, 0.95, 100);
    // Joues roses et reflet de bonté.
    for (const [x, a] of [[78, 0.22], [178, 0.14]] as const) {
      const g = ctx.createRadialGradient(x, 196, 2, x, 196, 26);
      g.addColorStop(0, `rgba(222,110,100,${a})`);
      g.addColorStop(1, 'rgba(222,110,100,0)');
      fill(ctx, 'M0,160 L256,160 L256,240 L0,240 Z', g);
    }
    void rng;
  });
  contourVisage(ctx, A, 'rond');
  return c;
}

/** Couronne tressée sur le dessus de la tête, piquée d'aubépine en fleur et de baies (au-dessus du front). */
function aubepineFront(): HTMLCanvasElement {
  const { c, ctx } = canvas(256, 312);
  couronne(ctx, [44, 98, 60, 44, 196, 44, 212, 98], 15, 20);
  // Brin d'aubépine piqué à gauche à l'écran : tige, feuilles, fleurs, baies.
  taper(ctx, [44, 78, 54, 70, 64, 64, 76, 60], 0.4, 1.4, 0.4, '#5a3a22', 0.95);
  for (const [x, y, a] of [[52, 70, -0.6], [66, 60, 0.4], [40, 86, 0.9]] as const) {
    const leaf = new Path2D();
    leaf.ellipse(x, y, 7, 3.4, a, 0, Math.PI * 2);
    fill(ctx, leaf, A.leaf);
    stroke(ctx, leaf, '#24461c', 0.6, 0.8);
  }
  fleur(ctx, 58, 56, 7.4);
  fleur(ctx, 74, 52, 6.2);
  fleur(ctx, 44, 66, 5.8);
  baie(ctx, 64, 70, 3.4);
  baie(ctx, 70, 73, 3);
  baie(ctx, 59, 76, 2.8);
  return c;
}

/** Arrière de la couronne tressée et haut du châle autour de la nuque. */
function aubepineBack(): HTMLCanvasElement {
  const { c, ctx } = backCanvasH();
  const knot = new Path2D();
  knot.ellipse(128, 40, 70, 42, 0, 0, Math.PI * 2);
  fill(ctx, knot, A.hairShade);
  couronne(ctx, [58, 36, 80, -6, 176, -6, 198, 36], 13, 22, 0.6);
  const shawl = P('M-10,332 C-2,296 20,262 50,240 C80,258 104,266 128,266 C152,266 176,258 206,240 C236,262 258,296 266,332 C226,318 180,310 128,310 C76,310 30,318 -10,332 Z');
  fill(ctx, shawl, A.shawl);
  clipped(ctx, shawl, () => {
    fill(ctx, 'M150,240 L270,240 L270,340 L150,340 Z', A.shawlShade, 0.55);
    for (let x = -10; x < 270; x += 9) taper(ctx, [x, 300, x + 3, 290, x + 6, 280, x + 9, 268], 0.2, 1, 0.2, A.shawlDeep, 0.35);
  });
  stroke(ctx, shawl, A.shawlDeep, 1.4, 0.8);
  return c;
}

function aubepineTorso(): HTMLCanvasElement {
  const { c, ctx } = torsoCanvasH();
  const body = P(BODY);
  fill(ctx, body, A.dress);
  clipped(ctx, body, () => {
    fill(ctx, 'M128,284 L350,284 L350,610 L128,610 Z', A.dressShade, 0.5);
    // Châle de laine croisé sur la poitrine : deux pans, côtes tricotées, ourlet de feuilles.
    const left = P('M-94,330 C-60,300 0,288 60,286 C96,300 120,340 150,420 L150,470 C110,420 70,380 -94,380 Z');
    const right = P('M350,330 C316,300 256,288 196,286 C160,300 136,340 106,420 L106,470 C146,420 186,380 350,380 Z');
    for (const [p, col, sh] of [[right, A.shawlShade, A.shawlDeep], [left, A.shawl, A.shawlShade]] as const) {
      fill(ctx, p, col);
      clipped(ctx, p, () => { for (let x = -100; x < 360; x += 10) taper(ctx, [x, 280, x + 8, 340, x + 14, 400, x + 20, 470], 0.2, 1.4, 0.2, sh, 0.35); });
      stroke(ctx, p, A.shawlDeep, 1.2, 0.85);
    }
    taper(ctx, [-60, 318, 0, 296, 40, 290, 70, 292], 0, 2.4, 0, A.shawlHi, 0.6);
    // Broche d'argent : branche d'épines frappée de la Ronce.
    disc(ctx, 128, 398, 13, A.silver);
    disc(ctx, 128, 398, 10.4, '#1e2e1e');
    ctx.save();
    ctx.fillStyle = A.silver;
    drawEmblem(ctx, 'Ronce', 128, 398, 7.2);
    ctx.restore();
    taper(ctx, [92, 410, 108, 404, 148, 392, 166, 386], 0.4, 1.6, 0.4, A.silver, 0.95);
    for (const x of [100, 116, 142, 158]) taper(ctx, [x, 404 - (x - 100) * 0.2, x + 2, 398 - (x - 100) * 0.2, x + 3, 395 - (x - 100) * 0.2, x + 5, 392 - (x - 100) * 0.2], 0.6, 0.6, 0, A.silverHi, 0.85);
    for (const s of FOLDS) taper(ctx, s, 0, 4, 0, A.shawlDeep, 0.45);
  });
  stroke(ctx, body, A.shawlDeep, 2, 0.8);
  return c;
}

const BROWS_AUBEPINE: Record<BrowShape, string> = {
  rest: 'M4,16.4 C14,12 27,9.6 40,9.2 C52,9 60,10.4 67,12.6 C69.4,13.4 69.6,16.4 68.4,18.6 C60,16.8 51,16 41,16 C28,16.2 16,17.4 4,19.2 Z',
  arch: 'M4,18.6 C12,11.6 25,7.6 39,7 C52,6.6 61,9.2 67.4,12.6 C69.8,14 70,16.8 68.8,19 C60,16.4 50,14.8 40,14.8 C27,14.8 15,16.6 4,19.6 Z',
  knit: 'M4,14.8 C17,12 31,11.6 44,12.4 C55,13.2 62,15.4 68.2,18.4 C70.2,19.6 70,22.2 68.4,23 C60,20.4 51,18.8 41,18.4 C28,18 16,17.8 4,18.2 Z',
};

export const AUBEPINE_V2: FigureV2Kit = {
  id: 'chef-ronce',
  colors: {
    skinShade: A.skinShade, line: A.line, lineSoft: A.lineSoft, lash: A.lash, lashSoft: A.lashSoft, brow: A.brow, browHi: A.browHi,
    lipUp: A.lipUp, lipLow: A.lipLow, lipHi: A.lipHi, iris: A.iris, irisDeep: A.irisDeep, irisLight: A.irisLight, irisAmber: A.irisAmber,
    pupil: A.pupil, irisGlow: '200,240,170', lashWeight: 0.85, lashWing: false, lashStrands: true,
  },
  brows: BROWS_AUBEPINE,
  // Tempérament : bienveillante et inflexible ; sourire paisible, regard qui ne cède pas.
  moods: {
    neutral: { mouth: 'smile' },
    confident: { browL: 0.1, browR: 0.1, lid: 0.32, squint: 0.3, tilt: 0.02, mouth: 'smile' },
    annoyed: { browL: -0.2, browR: -0.2, browAngle: 0.4, lid: 0.32, squint: 0.2, mouth: 'tight', brow: 'knit' },
  },
  head: aubepineHead,
  front: aubepineFront,
  back: aubepineBack,
  torso: aubepineTorso,
};

// ---------------------------------------------------------------------------------------------------------------
// Ilse, la Dame aux Voiles (Voile)

const I = {
  skinHi: '#f6ddd2', skin: '#e3c1b2', skinShade: '#b48f86', skinDeep: '#86635f', line: '#2a1a24', lineSoft: '#5a3a46',
  hair: '#16131f', hairShade: '#0b0912', hairDeep: '#040308', hairHi: '#3e3c5e', streak: '#dcdcea',
  veil: '#1c1a3c', veilHi: '#3a3870', veilShade: '#0e0c24', lace: '#b8bedc', laceHi: '#ffffff',
  gown: '#141230', gownHi: '#2c2a5c', gownShade: '#09081c', silver: '#c4cae0', silverHi: '#ffffff', mirror: '#9fb4dc',
  lash: '#0c0810', lashSoft: '#3a2a3a', brow: '#1c1824', browHi: '#4c4660',
  lipUp: '#7a3a52', lipLow: '#8e4a62', lipHi: '#c07a92',
  iris: '#8e9abc', irisDeep: '#1e2440', irisLight: '#d6ddf4', irisAmber: '#a07ad0', pupil: '#06060c',
};

/** Bord festonné de dentelle le long d'une suite de cubiques. */
function feston(ctx: Ctx, c: Cubic, n: number, r: number): void {
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    const x = u * u * u * c[0] + 3 * u * u * t * c[2] + 3 * u * t * t * c[4] + t * t * t * c[6];
    const y = u * u * u * c[1] + 3 * u * u * t * c[3] + 3 * u * t * t * c[5] + t * t * t * c[7];
    const p = new Path2D();
    p.arc(x, y, r, 0, Math.PI * 2);
    stroke(ctx, p, I.lace, 0.9, 0.8);
    disc(ctx, x, y, r * 0.3, I.laceHi, 0.8);
  }
}

function ilseHead(seed: number): HTMLCanvasElement {
  const { c, ctx } = canvas(256, 312);
  void seed;
  // Cheveux noirs tirés en arrière, raie au milieu, mèche blanche à gauche à l'écran.
  const cap = P('M128,18 C80,18 44,50 42,100 C41,124 44,146 50,166 L60,162 C56,138 56,116 64,98 C80,84 104,80 128,82 C152,80 176,84 192,98 C200,116 200,138 196,162 L206,166 C212,146 215,124 214,100 C212,50 176,18 128,18 Z');
  fill(ctx, cap, I.hair);
  clipped(ctx, cap, () => {
    fill(ctx, 'M128,0 L240,0 L240,200 L128,200 Z', I.hairShade, 0.5);
    taper(ctx, [126, 22, 98, 30, 74, 56, 62, 100], 1, 7, 2, I.streak, 0.92);
    taper(ctx, [124, 24, 100, 34, 80, 58, 70, 96], 0.2, 1.2, 0.2, '#ffffff', 0.7);
    taper(ctx, [140, 24, 168, 34, 186, 60, 194, 100], 0.4, 1.6, 0.4, I.hairHi, 0.5);
  });
  oreilles(ctx, I, { color: I.silver, hi: I.silverHi });
  cou(ctx, I);
  const face = P(FACES.ovale);
  fill(ctx, face, I.skin);
  clipped(ctx, face, () => {
    modele(ctx, I, 0.35, 104);
    // Joues creusées sous des pommettes hautes (ombres diffuses), ombre de paupière bleutée.
    for (const [cx, a] of [[84, 0.12], [172, 0.2]] as const) {
      const g = ctx.createRadialGradient(cx, 202, 1, cx, 202, 24);
      g.addColorStop(0, `rgba(90,50,64,${a})`);
      g.addColorStop(1, 'rgba(90,50,64,0)');
      fill(ctx, 'M40,170 L216,170 L216,236 L40,236 Z', g);
    }
    for (const cx of EYE_CX) {
      const g = ctx.createRadialGradient(cx, EYE_Y - 12, 2, cx, EYE_Y - 10, 26);
      g.addColorStop(0, 'rgba(70,60,130,0.28)');
      g.addColorStop(1, 'rgba(70,60,130,0)');
      fill(ctx, 'M0,110 L256,110 L256,170 L0,170 Z', g);
    }
  });
  contourVisage(ctx, I, 'ovale');
  return c;
}

/** Bord du voile sur le haut du front, fronteau d'argent à goutte de lune, pans qui encadrent les tempes. */
function ilseFront(): HTMLCanvasElement {
  const { c, ctx } = canvas(256, 312);
  const hood = P('M20,180 C18,120 32,60 72,34 C96,18 112,14 128,14 C144,14 160,18 184,34 C224,60 238,120 236,180 L222,176 C222,130 212,92 190,72 C170,56 150,50 128,50 C106,50 86,56 66,72 C44,92 34,130 34,176 Z');
  fill(ctx, hood, I.veil, 0.94);
  clipped(ctx, hood, () => {
    fill(ctx, 'M128,0 L256,0 L256,200 L128,200 Z', I.veilShade, 0.55);
    for (let i = 0; i < 26; i++) {
      const a = Math.PI * (0.06 + i * 0.034);
      disc(ctx, 128 - Math.cos(a) * 96, 120 - Math.sin(a) * 92, 1.3, I.lace, 0.55);
    }
  });
  feston(ctx, [34, 176, 34, 120, 66, 60, 128, 50], 14, 2.6);
  feston(ctx, [128, 50, 190, 60, 222, 120, 222, 176], 14, 2.6);
  // Fronteau d'argent à goutte de lune sur le front.
  stroke(ctx, 'M70,74 C96,62 160,62 186,74', I.silver, 2, 0.95);
  stroke(ctx, 'M70,74 C96,62 160,62 186,74', I.silverHi, 0.7, 0.8);
  const drop = P('M128,66 C133,72 134,80 128,86 C122,80 123,72 128,66 Z');
  fill(ctx, drop, I.mirror);
  stroke(ctx, drop, I.silver, 1.1, 0.95);
  taper(ctx, [126, 70, 125, 74, 125, 78, 126, 82], 0.2, 0.9, 0.2, I.silverHi, 0.9);
  return c;
}

/** Pans du voile qui tombent sur les épaules, dentelle et yeux brodés. */
function ilseBack(): HTMLCanvasElement {
  const { c, ctx } = backCanvasH();
  const veil = P('M128,-20 C66,-20 18,28 6,110 C-6,190 -20,280 -40,380 L-60,420 C-10,400 30,360 46,300 C40,240 38,160 60,96 L196,96 C218,160 216,240 210,300 C226,360 266,400 316,420 L296,380 C276,280 262,190 250,110 C238,28 190,-20 128,-20 Z');
  fill(ctx, veil, I.veil);
  clipped(ctx, veil, () => {
    fill(ctx, 'M140,-40 L340,-40 L340,440 L140,440 Z', I.veilShade, 0.55);
    for (const [x, y] of [[20, 220], [236, 220], [6, 320], [250, 320]]) {
      const eye = new Path2D();
      eye.ellipse(x!, y!, 9, 4.4, 0, 0, Math.PI * 2);
      stroke(ctx, eye, I.lace, 0.9, 0.7);
      disc(ctx, x!, y!, 2, I.lace, 0.8);
    }
    for (let i = 0; i < 60; i++) disc(ctx, -50 + (i * 37) % 360, -10 + ((i * 53) % 430), 1, I.lace, 0.35);
  });
  feston(ctx, [-60, 420, -20, 380, 20, 330, 46, 300], 10, 2.6);
  feston(ctx, [210, 300, 236, 330, 276, 380, 316, 420], 10, 2.6);
  stroke(ctx, veil, I.veilShade, 1.2, 0.8);
  return c;
}

function ilseTorso(): HTMLCanvasElement {
  const { c, ctx } = torsoCanvasH();
  const body = P(BODY);
  fill(ctx, body, I.gown);
  clipped(ctx, body, () => {
    fill(ctx, 'M-90,388 C-86,356 -72,332 -44,318 C-58,338 -68,362 -72,396 L-76,610 L-96,610 Z', I.gownHi, 0.8);
    fill(ctx, 'M258,302 C300,316 330,338 346,388 L350,610 L268,610 C280,500 280,400 258,302 Z', I.gownShade, 0.85);
    // Col montant, broderie d'argent : un œil voilé sous la gorge, deux rangs de perles.
    const col = P('M92,280 C100,296 116,304 128,304 C140,304 156,296 164,280 L170,300 C160,318 144,326 128,326 C112,326 96,318 86,300 Z');
    fill(ctx, col, I.gownHi);
    stroke(ctx, col, I.silver, 1, 0.8);
    for (let x = 92; x <= 164; x += 6) disc(ctx, x, 314 - Math.abs(128 - x) * 0.18, 1.4, I.silverHi, 0.85);
    const eye = new Path2D();
    eye.ellipse(128, 346, 16, 7, 0, 0, Math.PI * 2);
    stroke(ctx, eye, I.silver, 1.4, 0.95);
    disc(ctx, 128, 346, 4, I.silver);
    for (let i = -3; i <= 3; i++) taper(ctx, [128 + i * 5, 352, 128 + i * 5.4, 358, 128 + i * 5.8, 364, 128 + i * 6.2, 370], 0.2, 0.9, 0.1, I.silver, 0.7);
    // Chaîne et miroir rond en pendentif.
    stroke(ctx, 'M96,300 C104,340 116,380 128,396 C140,380 152,340 160,300', I.silver, 1, 0.85);
    disc(ctx, 128, 408, 13, I.silver);
    disc(ctx, 128, 408, 10.6, I.mirror);
    taper(ctx, [121, 402, 123, 399, 127, 398, 131, 399], 0.4, 1.6, 0.4, I.silverHi, 0.95);
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = I.gown;
    drawEmblem(ctx, 'Voile', 128, 410, 5.6);
    ctx.restore();
    for (const s of FOLDS) taper(ctx, s, 0, 4, 0, I.gownShade, 0.75);
  });
  stroke(ctx, body, I.gownShade, 2, 0.85);
  return c;
}

const BROWS_ILSE: Record<BrowShape, string> = {
  rest: 'M5,17 C16,12 28,8 40,6.8 C51,5.8 60,7 67,9.8 C68.8,10.6 69,12.8 67.8,14.2 C60,12.6 51,12 41,12.4 C29,12.8 17,15 5,18.6 Z',
  arch: 'M5,19 C14,10 26,4.4 39,3.4 C51,2.6 60,5.2 67,9.4 C68.8,10.6 69,12.8 67.6,14.2 C59,10.8 50,9.6 40,10 C28,10.6 16,13.6 5,19.8 Z',
  knit: 'M5,15.4 C18,12.6 31,11.8 44,12.4 C55,13 62,15.4 67.8,18.4 C69.4,19.4 69.2,21.6 67.8,22.2 C60,19.8 51,18.4 41,18 C29,17.6 17,17.6 5,18 Z',
};

export const ILSE_V2: FigureV2Kit = {
  id: 'chef-voile',
  colors: {
    skinShade: I.skinShade, line: I.line, lineSoft: I.lineSoft, lash: I.lash, lashSoft: I.lashSoft, brow: I.brow, browHi: I.browHi,
    lipUp: I.lipUp, lipLow: I.lipLow, lipHi: I.lipHi, iris: I.iris, irisDeep: I.irisDeep, irisLight: I.irisLight, irisAmber: I.irisAmber,
    pupil: I.pupil, irisGlow: '210,220,255', lashWeight: 1.1, lashWing: true, lashStrands: true,
  },
  brows: BROWS_ILSE,
  // Tempérament : elle sait ; paupières mi-closes, un sourcil haussé, sourire à peine.
  moods: {
    smug: { browL: 0.55, browR: -0.05, browAngle: 0.05, lid: 0.4, squint: 0.18, tilt: 0.05, mouth: 'smirk', brow: 'arch' },
    thinking: { browL: 0.35, browR: -0.2, lid: 0.38, squint: 0.15, tilt: 0.06, mouth: 'tight' },
  },
  head: ilseHead,
  front: ilseFront,
  back: ilseBack,
  torso: ilseTorso,
};

// ---------------------------------------------------------------------------------------------------------------
// Halvard, le Cartographe (Astre)

const H = {
  skinHi: '#f4d3bd', skin: '#dcaf95', skinShade: '#b07e66', skinDeep: '#7e5242', line: '#3a2018', lineSoft: '#6a4232',
  hair: '#ecebe7', hairShade: '#c4c0ba', hairDeep: '#8a8682', hairHi: '#ffffff',
  coat: '#1a2450', coatHi: '#2e3c7a', coatShade: '#0e1430', coatDeep: '#070a1c', gold: '#e8c46a', goldHi: '#fff0b8', goldDeep: '#9a7a2a',
  leather: '#6a4428', leatherHi: '#9a6a40', parchment: '#e8d8b0',
  lash: '#2a1a14', lashSoft: '#5a4034', brow: '#cdc9c3', browHi: '#ffffff',
  lipUp: '#a86a5a', lipLow: '#bc7e6c', lipHi: '#e2ac98',
  iris: '#5a8ac8', irisDeep: '#16284a', irisLight: '#b0d4ff', irisAmber: '#e8c46a', pupil: '#06080e',
};

function halvardHead(seed: number): HTMLCanvasElement {
  const { c, ctx } = canvas(256, 312);
  const rng = makeRng(hashString(`chef-astre-v2|${seed}`));
  // Front haut (golfes dégarnis) et longs cheveux blancs ramenés derrière les oreilles.
  const cap = P('M128,12 C78,12 40,44 38,98 C37,130 40,160 44,190 L58,186 C54,160 54,128 60,100 C64,86 72,72 84,62 C96,58 108,60 116,64 C122,58 134,58 140,64 C148,60 160,58 172,62 C184,72 192,86 196,100 C202,128 202,160 198,186 L212,190 C216,160 219,130 218,98 C216,44 178,12 128,12 Z');
  fill(ctx, cap, H.hair);
  clipped(ctx, cap, () => {
    fill(ctx, 'M128,0 L240,0 L240,220 L128,220 Z', H.hairShade, 0.55);
    for (let i = 0; i < 14; i++) {
      const x = 44 + rng() * 168;
      taper(ctx, [128, 16, x * 0.6 + 51, 40, x, 90, x + (x < 128 ? -6 : 6), 190], 0.2, 1, 0.2, rng() < 0.5 ? H.hairDeep : H.hairHi, 0.4);
    }
  });
  oreilles(ctx, H);
  cou(ctx, H);
  const face = P(FACES.long);
  fill(ctx, face, H.skin);
  clipped(ctx, face, () => {
    modele(ctx, H, 0.85, 84);
    // Joues creusées, pommettes saillantes.
    fill(ctx, 'M58,196 C66,206 72,220 76,236 C68,224 60,214 56,206 Z', H.skinShade, 0.6);
    fill(ctx, 'M198,196 C190,206 184,220 180,236 C188,224 196,214 200,206 Z', H.skinDeep, 0.5);
    // Barbiche pointue blanche sous la lèvre (la moustache est sur la couche avant).
    const goatee = P('M112,236 C118,232 138,232 144,236 C146,252 140,272 128,294 C116,272 110,252 112,236 Z');
    fill(ctx, goatee, H.hair);
    poils(ctx, goatee, rng, 70, 110, 230, 36, 66, H.hairHi, H.hairDeep);
  });
  // La pointe de la barbiche déborde sous le menton.
  const tip = P('M118,268 C122,276 126,286 128,296 C130,286 134,276 138,268 C134,272 130,274 128,274 C126,274 122,272 118,268 Z');
  fill(ctx, tip, H.hair);
  stroke(ctx, 'M112,236 C110,252 116,272 128,296 C140,272 146,252 144,236', H.hairDeep, 0.9, 0.6);
  contourVisage(ctx, H, 'long');
  return c;
}

/** Moustache blanche effilée et monocle cerclé d'or à chaînette sur l'œil droit à l'écran. */
function halvardFront(): HTMLCanvasElement {
  const { c, ctx } = canvas(256, 312);
  const rng = makeRng(hashString('chef-astre-v2|moustache'));
  const m = P('M96,214 C104,206 118,204 128,208 C138,204 152,206 160,214 C164,218 168,218 172,216 C168,222 160,224 152,221 C144,216 136,214 128,215 C120,214 112,216 104,221 C96,224 88,222 84,216 C88,218 92,218 96,214 Z');
  fill(ctx, m, H.hair);
  poils(ctx, m, rng, 70, 84, 202, 88, 24, H.hairHi, H.hairDeep);
  stroke(ctx, m, H.hairDeep, 0.8, 0.6);
  const cx = EYE_CX[1];
  const ry = EYE_Y + 1;
  const lens = new Path2D();
  lens.arc(cx, ry, 24, 0, Math.PI * 2);
  fill(ctx, lens, '#d8ecff', 0.08);
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(cx, ry, 18, Math.PI * 1.08, Math.PI * 1.42); ctx.stroke();
  ctx.restore();
  stroke(ctx, lens, H.goldDeep, 3.2, 0.95);
  stroke(ctx, lens, H.gold, 1.8, 1);
  // Chaînette du monocle qui descend vers le col.
  stroke(ctx, `M${cx + 22},${ry + 10} C${cx + 34},${ry + 44} ${cx + 30},${ry + 96} ${cx + 18},${ry + 150}`, H.gold, 1, 0.85);
  return c;
}

/** Longs cheveux blancs qui tombent derrière les épaules ; haut de l'étui de carte derrière l'épaule gauche à l'écran. */
function halvardBack(): HTMLCanvasElement {
  const { c, ctx } = backCanvasH();
  const tube = P('M-30,150 L-6,138 L52,316 L28,328 Z');
  fill(ctx, tube, H.leather);
  stroke(ctx, tube, '#2e1c10', 1.2, 0.8);
  const capTube = new Path2D();
  capTube.ellipse(-18, 144, 14, 7, -0.35, 0, Math.PI * 2);
  fill(ctx, capTube, H.goldDeep);
  stroke(ctx, capTube, H.gold, 1.2, 0.95);
  const hair = P('M128,10 C70,10 32,46 30,104 C28,170 22,240 10,300 C40,310 66,300 76,280 C70,230 64,160 66,110 L190,110 C192,160 186,230 180,280 C190,300 216,310 246,300 C234,240 228,170 226,104 C224,46 186,10 128,10 Z');
  fill(ctx, hair, H.hair);
  clipped(ctx, hair, () => {
    fill(ctx, 'M140,0 L260,0 L260,320 L140,320 Z', H.hairShade, 0.55);
    for (const x of [20, 34, 48, 62, 194, 208, 222, 236]) taper(ctx, [x + (x < 128 ? 30 : -30), 30, x, 110, x - (x < 128 ? 6 : -6), 200, x - (x < 128 ? 10 : -10), 300], 0.2, 1, 0.2, H.hairDeep, 0.5);
  });
  stroke(ctx, hair, H.hairDeep, 1, 0.6);
  return c;
}

function halvardTorso(): HTMLCanvasElement {
  const { c, ctx } = torsoCanvasH();
  const body = P(BODY);
  fill(ctx, body, H.coat);
  clipped(ctx, body, () => {
    fill(ctx, 'M-90,388 C-86,356 -72,332 -44,318 C-58,338 -68,362 -72,396 L-76,610 L-96,610 Z', H.coatHi, 0.85);
    fill(ctx, 'M258,302 C300,316 330,338 346,388 L350,610 L268,610 C280,500 280,400 258,302 Z', H.coatShade, 0.85);
    // Col montant boutonné, liseré d'or.
    const col = P('M94,280 L162,280 L166,312 C150,322 106,322 90,312 Z');
    fill(ctx, col, H.coatHi);
    stroke(ctx, col, H.gold, 1.2, 0.9);
    for (const y of [338, 366, 394, 422]) { disc(ctx, 128, y, 3, H.gold); disc(ctx, 127.2, y - 0.8, 1.1, H.goldHi); }
    stroke(ctx, 'M128,322 L128,450', H.coatDeep, 1.2, 0.7);
    // Rose des vents brodée d'or sur la poitrine (à gauche à l'écran), étoile de l'Astre au centre.
    ctx.save();
    ctx.translate(76, 372);
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      const r = i % 2 ? 11 : 20;
      stroke(ctx, `M0,0 L${Math.cos(a) * r},${Math.sin(a) * r}`, H.gold, i % 2 ? 0.8 : 1.4, 0.9);
    }
    ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.lineWidth = 0.8; ctx.strokeStyle = H.gold; ctx.globalAlpha = 0.8; ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = H.goldHi;
    drawEmblem(ctx, 'Astre', 0, 0, 4.6);
    ctx.restore();
    // Bandoulière de cuir de l'étui de carte, de l'épaule droite à l'écran vers la hanche gauche.
    const strap = P('M250,300 L232,296 L36,450 L56,454 Z');
    fill(ctx, strap, H.leather);
    stroke(ctx, 'M244,300 L48,452', H.leatherHi, 0.8, 0.6);
    const buckle = P('M150,370 L166,366 L170,382 L154,386 Z');
    fill(ctx, buckle, H.gold);
    stroke(ctx, buckle, H.goldDeep, 1, 0.9);
    for (const s of FOLDS) taper(ctx, s, 0, 4, 0, H.coatDeep, 0.75);
  });
  stroke(ctx, body, H.coatDeep, 2, 0.8);
  return c;
}

const BROWS_HALVARD: Record<BrowShape, string> = {
  rest: 'M2,16 C12,9.6 26,6 40,5.6 C52,5.2 61,7 68,9.8 C71,11 71.4,15.4 69.6,19 C61,16.4 51,15.4 41,15.4 C28,15.6 15,17.4 2,19.8 Z',
  arch: 'M2,18.6 C11,9 24,3.8 38,3 C51,2.4 61,5.4 68,9.6 C70.8,11.4 71,15.6 69.4,19 C60,15.2 50,13.2 40,13.2 C27,13.4 14,15.6 2,19.6 Z',
  knit: 'M2,13 C16,9.8 30,9 44,10 C55,10.8 63,13.4 69,17 C71.4,18.6 71,22.4 68.8,23.6 C60,20 50,18 40,17.6 C27,17.2 14,17 2,17.6 Z',
};

export const HALVARD_V2: FigureV2Kit = {
  id: 'chef-astre',
  colors: {
    skinShade: H.skinShade, line: H.line, lineSoft: H.lineSoft, lash: H.lash, lashSoft: H.lashSoft, brow: H.brow, browHi: H.browHi,
    lipUp: H.lipUp, lipLow: H.lipLow, lipHi: H.lipHi, iris: H.iris, irisDeep: H.irisDeep, irisLight: H.irisLight, irisAmber: H.irisAmber,
    pupil: H.pupil, irisGlow: '190,220,255', lashWeight: 0.8, lashWing: false, lashStrands: false,
  },
  brows: BROWS_HALVARD,
  // Tempérament : le savant qui a tout mesuré ; sourcil levé derrière le monocle, sourire d'érudit.
  moods: {
    thinking: { browL: -0.1, browR: 0.45, browAngle: 0.05, lid: 0.3, squint: 0.12, tilt: 0.06, mouth: 'tight' },
    confident: { browL: 0.05, browR: 0.25, lid: 0.3, squint: 0.2, tilt: 0.03, mouth: 'smirk' },
  },
  head: halvardHead,
  front: halvardFront,
  back: halvardBack,
  torso: halvardTorso,
};

/** Les quatre chefs, par identifiant (`chef-<famille>`). */
export const CHEF_KITS: Readonly<Record<string, FigureV2Kit>> = {
  [BRAN_V2.id]: BRAN_V2,
  [AUBEPINE_V2.id]: AUBEPINE_V2,
  [ILSE_V2.id]: ILSE_V2,
  [HALVARD_V2.id]: HALVARD_V2,
};
