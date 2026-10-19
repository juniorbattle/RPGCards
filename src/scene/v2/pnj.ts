/**
 * M08 C3 — identité V2 des duellistes PNJ de la ville, sur le socle commun `../figureV2`. Un visage commun à tous les
 * PNJ (trois formes : carré, ovale, doux), avec moins de modelé que les rivaux ; douze coupes, quatre tenues et quelques
 * accessoires ; couleurs et choix tirés de l’identifiant par `npcLook` (`presentation/npcs`). Même modèle pour le duel et
 * le portrait ; expressions héritées du socle (tempérament par gabarit). Aucun emblème ni marque distinctive : ce sont
 * des figurants de la ville, pas des personnages signatures.
 */
import { hashString, makeRng } from '../../game/engine/rng';
import { NPC_TEMPLATES, npcLook, type FaceShape, type HairCut, type NpcLook, type Tone } from '../../presentation/npcs';
import {
  backCanvasH, canvas, clipped, edgeBand, EYE_CX, fill, mirrored, P, softShade, stroke, taper, torsoCanvasH, translatedPath,
  type BrowShape, type Ctx, type Cubic, type FigureV2Kit,
} from '../figureV2';

function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return `#${((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)}`;
}

const BOX: [number, number, number, number] = [0, 0, 256, 312];

// ---------------------------------------------------------------------------------------------------------------
// Visage commun (espace H)

const FACES: Record<FaceShape, string> = {
  carre: 'M128,50 C94,50 60,60 50,94 C44,116 44,140 46,160 C47,182 50,204 58,222 C64,236 84,254 104,264 C112,268 144,268 152,264 C172,254 192,236 198,222 C206,204 209,182 210,160 C212,140 212,116 206,94 C196,60 162,50 128,50 Z',
  ovale: 'M128,56 C97,56 64,64 55,97 C49,119 49,143 50,162 C51,183 56,203 66,221 C77,239 97,255 114,264 C122,267.6 134,267.6 142,264 C159,255 179,239 190,221 C200,203 205,183 206,162 C207,143 207,119 201,97 C192,64 159,56 128,56 Z',
  doux: 'M128,52 C95,52 61,61 52,95 C46,117 46,141 47,160 C48,181 52,204 62,223 C72,240 94,257 112,265 C120,268.5 136,268.5 144,265 C162,257 184,240 194,223 C204,204 208,181 209,160 C210,141 210,117 204,95 C195,61 161,52 128,52 Z',
};

/** Plan d’ombre du côté droit (lumière en haut à gauche), à adoucir par `softShade`. */
const SHADES: Record<FaceShape, string> = {
  carre: 'M206,66 C210,100 208,130 209,154 C207,170 198,184 188,194 C180,204 176,216 176,230 C176,246 168,258 152,268 L250,300 L250,40 Z',
  ovale: 'M201,72 C205,104 203,132 205,156 C203,170 196,182 186,192 C178,200 172,212 170,226 C168,242 158,257 142,266 L250,300 L250,40 Z',
  doux: 'M204,70 C208,104 206,132 208,156 C206,170 198,182 188,192 C180,200 174,212 172,226 C170,242 160,258 144,268 L250,300 L250,40 Z',
};

type Seg = [Cubic, number, number, number];
const CONTOURS: Record<FaceShape, Seg[]> = {
  carre: [
    [[46, 150, 47, 172, 48, 192, 52, 206], 0.5, 1, 1.3], [[52, 206, 54, 212, 56, 218, 58, 222], 1.3, 1.5, 1.7],
    [[58, 222, 64, 236, 84, 254, 104, 264], 1.7, 2, 1.9], [[104, 264, 112, 268, 144, 268, 152, 264], 1.9, 2.2, 2.1],
    [[152, 264, 172, 254, 192, 236, 198, 222], 2.1, 2.6, 2.6], [[198, 222, 206, 204, 209, 182, 210, 150], 2.6, 2.2, 1.1],
  ],
  ovale: [
    [[50, 150, 50.5, 170, 52.5, 190, 57, 205], 0.4, 0.8, 1], [[57, 205, 59, 211, 62, 216, 66, 221], 1, 1.2, 1.4],
    [[66, 221, 77, 239, 97, 255, 114, 264], 1.4, 1.7, 1.5], [[114, 264, 122, 267.6, 134, 267.6, 142, 264], 1.5, 1.8, 1.7],
    [[142, 264, 159, 255, 179, 239, 190, 221], 1.7, 2.2, 2.2], [[190, 221, 200, 203, 205, 183, 206, 150], 2.2, 1.9, 0.8],
  ],
  doux: [
    [[47, 150, 47.5, 172, 49.5, 192, 54, 206], 0.4, 0.9, 1.1], [[54, 206, 56, 213, 59, 218, 62, 223], 1.1, 1.3, 1.5],
    [[62, 223, 72, 240, 94, 257, 112, 265], 1.5, 1.8, 1.6], [[112, 265, 120, 268.5, 136, 268.5, 144, 265], 1.6, 1.9, 1.8],
    [[144, 265, 162, 257, 184, 240, 194, 223], 1.8, 2.3, 2.3], [[194, 223, 204, 204, 208, 181, 209, 150], 2.3, 2, 0.9],
  ],
};

/** Encolure : le cou s’arrête sur cette courbe (le buste est derrière), commune aux quatre tenues. */
const NECKLINE = 'M40,200 L216,200 L216,286 C188,292 158,300 128,302 C98,300 68,292 40,286 Z';
const EAR = 'M50,130 C39,125 32,135 33,150 C34,165 40,176 53,180 Z';

/** Couleurs de trait et de peau dérivées de la carnation. */
function skinInk(s: Tone) {
  return { line: mix(s.deep, '#1c0c08', 0.55), lineSoft: mix(s.deep, '#3a1c14', 0.25) };
}

// ---------------------------------------------------------------------------------------------------------------
// Coupes

interface Cut {
  /** Oreilles dégagées (boucles d’oreille visibles). */
  ears: boolean;
  /** Masse arrière dans le canvas de tête, avant le visage. */
  behind?(ctx: Ctx, h: Tone): void;
  /** Cheveux du dessus de la tête au-dessus de y ≈ 92 (canvas de tête, après le visage : hors des paupières découpées). */
  top?(ctx: Ctx, h: Tone, sk: Tone): void;
  /** Ombres portées sur le visage. */
  shadow?: (ctx: Ctx, color: string) => void;
  /** Couche des mèches : frange, pans sur les joues (au-dessus des yeux et des sourcils). */
  front?(ctx: Ctx, h: Tone): void;
  /** Plan arrière : chignon, queue, longueurs sur les épaules. */
  back?(ctx: Ctx, h: Tone): void;
}

/** Calotte courte qui suit le crâne, la lisière du front en `hairline` (dessus de tête des coupes courtes). */
function shortCap(hairline: number, temple = 100): string {
  return `M128,10 C76,10 38,42 34,96 C33,${temple + 16} 36,${temple + 34} 42,${temple + 52} L54,${temple + 50} C51,${temple + 28} 52,${temple + 8} 58,${hairline + 26} C70,${hairline + 6} 98,${hairline} 128,${hairline} C158,${hairline} 186,${hairline + 6} 198,${hairline + 26} C204,${temple + 8} 205,${temple + 28} 202,${temple + 50} L214,${temple + 52} C220,${temple + 34} 223,${temple + 16} 222,96 C218,42 180,10 128,10 Z`;
}

/** Plan d’ombre des cheveux, côté droit : terminateur courbe et bord fondu (pas de coupure verticale, cf. finition L5). */
const HAIR_SHADE = 'M150,-40 C140,10 144,56 160,96 C172,124 190,146 214,168 L270,168 L270,-40 Z';

function capShading(ctx: Ctx, path: Path2D, h: Tone, sheen: Cubic, alpha = 0.7): void {
  clipped(ctx, path, () => {
    softShade(ctx, HAIR_SHADE, h.shade, 0.6, -8);
    edgeBand(ctx, path, 3, 4, h.deep, 0.5, BOX);
    taper(ctx, sheen, 0, 5, 0, h.hi, alpha);
  });
}

/** Calotte de la couche des mèches, posée sur les pans qui en sortent (aucun contour sur son bord inférieur). */
function crown(ctx: Ctx, h: Tone, d: string, sheen: Cubic): void {
  const c = P(d);
  fill(ctx, c, h.base);
  clipped(ctx, c, () => {
    softShade(ctx, HAIR_SHADE, h.shade, 0.6, -8);
    taper(ctx, sheen, 0, 5, 0, h.hi, 0.6);
  });
}

/** Mèches effilées le long d’une lisière (traits de demi-teinte et de séparation). */
function strands(ctx: Ctx, h: Tone, lines: Cubic[], hi: number[] = []): void {
  lines.forEach((s, i) => taper(ctx, s, 0.2, hi.includes(i) ? 2.4 : 1.1, 0.2, hi.includes(i) ? h.hi : h.deep, hi.includes(i) ? 0.55 : 0.6));
}

/** Pans latéraux (coupes longues), gauche dans la lumière, droit dans l’ombre ; `side` est le chemin du pan gauche. */
function sidePanels(ctx: Ctx, h: Tone, side: string, lines: Cubic[]): void {
  const left = P(side);
  const right = new Path2D();
  right.addPath(left, new DOMMatrix([-1, 0, 0, 1, 256, 0]));
  fill(ctx, left, h.base);
  clipped(ctx, left, () => {
    edgeBand(ctx, left, -5, -2, h.shade, 0.85, BOX);
    edgeBand(ctx, left, 3, 1, h.hi, 0.55, BOX);
    strands(ctx, h, lines, [0]);
  });
  fill(ctx, right, h.base);
  clipped(ctx, right, () => {
    fill(ctx, 'M128,0 L260,0 L260,330 L128,330 Z', h.shade, 0.55);
    edgeBand(ctx, right, 5, -2, h.deep, 0.6, BOX);
    mirrored(ctx, 128, () => strands(ctx, h, lines));
  });
  stroke(ctx, left, h.deep, 0.9, 0.6);
  stroke(ctx, right, h.deep, 0.9, 0.7);
}

/**
 * Mèche « coup de pinceau » : racine (rx, ry) dans la calotte, pointe (tx, ty), largeur à la racine `w`, ventre `bend`
 * (+ = vers la droite : la pointe revient vers la gauche, cheveux balayés). Tracée par `taper` (largeur variable le long
 * d’une cubique) : bords courbes et pointe effilée, aucune arête de polygone.
 */
type Lock = [rx: number, ry: number, tx: number, ty: number, w: number, bend: number];

function lockCubic([rx, ry, tx, ty, , bend]: Lock, dx = 0, dy = 0): Cubic {
  const h = ty - ry;
  return [rx + dx, ry + dy, rx + bend + dx, ry + h * 0.42 + dy, tx + (rx - tx) * 0.1 + bend * 0.45 + dx, ty - h * 0.3 + dy, tx + dx, ty + dy];
}

/** Calque temporaire de l’espace H (256 × 312), composé ensuite sur `ctx` : l’ombre n’y touche que les cheveux. */
function onLayer(ctx: Ctx, draw: (t: Ctx) => void): void {
  const { c, ctx: t } = canvas(256, 312);
  draw(t);
  ctx.drawImage(c, 0, 0, 256, 312);
}

/** Mèches qui se chevauchent de gauche à droite : aplat, ombre (même terminateur que la calotte), reflets, séparations. */
function brushLocks(ctx: Ctx, h: Tone, locks: Lock[]): void {
  onLayer(ctx, (t) => {
    // Corps en fuseau : étroit à la racine (dans la calotte), large au milieu, effilé à la pointe.
    for (const l of locks) taper(t, lockCubic(l), l[4] * 0.5, l[4], 0.5, h.base);
    t.save();
    t.globalCompositeOperation = 'source-atop';
    softShade(t, HAIR_SHADE, h.shade, 0.6, -8);
    for (const l of locks) {
      // Ombre, reflet et séparation naissent en fondu (largeur nulle à la racine) : aucune rangée de bosses à la lisière.
      taper(t, lockCubic(l, l[4] * 0.24, 1), 0, l[4] * 0.3, 0.2, h.shade, 0.5);
      taper(t, lockCubic(l, -l[4] * 0.16, -2), 0, l[4] * 0.16, 0.1, h.hi, 0.4);
      taper(t, lockCubic(l, l[4] * 0.42, 0), 0, 1.1, 0.1, h.deep, 0.65);
    }
    t.restore();
  });
}

/** Ombre portée des mèches sur le visage (mêmes courbes, décalées vers le bas à droite). */
function lockShadow(locks: Lock[]): (ctx: Ctx, color: string) => void {
  return (ctx, color) => { for (const l of locks) taper(ctx, lockCubic(l, 3, 6), l[4] * 0.9, l[4] * 0.65, 0.5, color, 0.6); };
}

/** Coupe courte du docker : mèches courtes qui retombent sur le front, balayées vers la gauche (pointes ≤ y 101). */
const COURTE_LOCKS: Lock[] = [
  [58, 60, 50, 99, 18, 7], [76, 48, 66, 97, 22, 9], [96, 44, 86, 101, 23, 10], [118, 42, 108, 96, 24, 9],
  [140, 42, 129, 100, 24, 10], [162, 44, 151, 95, 23, 9], [182, 48, 173, 99, 22, 8], [200, 58, 194, 94, 18, 6],
];
/** Courbe lisse (Catmull-Rom → cubiques) passant par des points : tangentes continues, aucune arête. */
function smooth(pts: Array<[number, number]>): string {
  let d = '';
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[Math.min(pts.length - 1, i + 2)]!;
    d += ` C${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]},${p2[1]}`;
  }
  return d;
}

/** Frange droite du commis : une masse au bord légèrement ondulé (pointes ≤ y 97), parcourue de fines mèches. */
const FRANGE_EDGE: Array<[number, number]> = [[203, 90], [188, 95], [172, 92], [156, 97], [140, 93], [124, 96], [108, 92], [92, 96], [76, 92], [62, 95], [53, 92]];
/** Masse de la frange jusqu’au sommet du crâne (elle recouvre la calotte : aucune jonction visible). */
const FRANGE = `M53,92 C46,44 80,10 128,10 C176,10 210,44 203,90${smooth(FRANGE_EDGE)} Z`;

/** Ombres portées décrites par des chemins (coupes à bord net : mèche balayée, carré). */
function pathShadow(...ds: string[]): (ctx: Ctx, color: string) => void {
  return (ctx, color) => { for (const d of ds) fill(ctx, translatedPath(d, 3, 6), color, 0.7); };
}

const CUTS: Record<HairCut, Cut> = {
  // --- Docker : coupes courtes, oreilles dégagées
  rase: {
    ears: true,
    top(ctx, h, sk) {
      // Tondu : la peau du crâne sous un voile de cheveux très courts (velours), lisière fondue, grain semé.
      const cap = P(shortCap(70, 104));
      fill(ctx, cap, sk.base);
      clipped(ctx, cap, () => {
        fill(ctx, cap, h.base, 0.72);
        softShade(ctx, HAIR_SHADE, h.shade, 0.5, -8);
        edgeBand(ctx, cap, 0, 6, sk.base, 0.35, BOX);
        const r = makeRng(hashString('ras'));
        for (let i = 0; i < 140; i++) {
          const x = 38 + r() * 180;
          const y = 12 + r() * 94;
          taper(ctx, [x, y, x + 0.5, y + 1, x + 1, y + 2, x + 1.4, y + 3], 0, 0.9, 0, i % 4 ? h.deep : h.hi, i % 4 ? 0.3 : 0.25);
        }
        taper(ctx, [72, 44, 92, 26, 112, 20, 132, 18], 0, 5, 0, sk.hi, 0.25);
      });
    },
  },
  courte: {
    ears: true,
    top(ctx, h) {
      const cap = P(shortCap(66, 100));
      fill(ctx, cap, h.base);
      capShading(ctx, cap, h, [66, 40, 88, 22, 110, 16, 132, 14]);
      // Mèches courtes qui retombent sur le front, balayées vers la gauche.
      brushLocks(ctx, h, COURTE_LOCKS);
    },
    shadow: lockShadow(COURTE_LOCKS),
  },
  plaquee: {
    ears: true,
    top(ctx, h) {
      // Cheveux peignés en arrière, pointe au milieu du front.
      const d = 'M128,8 C76,8 38,40 34,94 C33,118 36,138 42,156 L54,154 C51,132 52,112 58,96 C66,80 82,70 100,66 C112,64 120,68 128,72 C136,68 144,64 156,66 C174,70 190,80 198,96 C204,112 205,132 202,154 L214,156 C220,138 223,118 222,94 C218,40 180,8 128,8 Z';
      const cap = P(d);
      fill(ctx, cap, h.base);
      capShading(ctx, cap, h, [70, 60, 86, 36, 106, 22, 128, 16], 0.75);
      clipped(ctx, cap, () => {
        for (const s of [[76, 84, 80, 56, 96, 34, 120, 22], [96, 74, 100, 48, 112, 30, 134, 20], [118, 72, 120, 46, 130, 28, 150, 20], [148, 70, 156, 46, 172, 30, 192, 26], [172, 78, 184, 56, 200, 44, 214, 44]] as Cubic[]) taper(ctx, s, 0.2, 1.2, 0.2, h.deep, 0.6);
        taper(ctx, [62, 90, 70, 64, 88, 40, 112, 28], 0, 3.6, 0, h.hi, 0.55);
      });
      stroke(ctx, 'M58,96 C66,80 82,70 100,66 C112,64 120,68 128,72 C136,68 144,64 156,66 C174,70 190,80 198,96', h.deep, 1, 0.6);
    },
  },

  // --- Marchande : cheveux tirés ou longs
  chignon: {
    ears: true,
    behind(ctx, h) {
      fill(ctx, 'M128,14 C74,14 38,48 36,100 C35,124 40,146 48,162 L208,162 C216,146 221,124 220,100 C218,48 182,14 128,14 Z', h.shade);
    },
    top(ctx, h) {
      // Raie au milieu, bandeaux lisses tirés vers l’arrière au-dessus des oreilles.
      const d = 'M128,12 C74,12 38,46 35,98 C34,116 37,132 42,146 C46,134 50,118 58,104 C68,86 90,74 112,72 C120,72 125,74 128,78 C131,74 136,72 144,72 C166,74 188,86 198,104 C206,118 210,134 214,146 C219,132 222,116 221,98 C218,46 182,12 128,12 Z';
      const cap = P(d);
      fill(ctx, cap, h.base);
      capShading(ctx, cap, h, [62, 98, 66, 60, 90, 30, 122, 20], 0.65);
      clipped(ctx, cap, () => {
        for (const s of [[118, 74, 96, 66, 74, 70, 56, 92], [122, 70, 100, 50, 72, 54, 48, 84], [138, 74, 160, 66, 182, 70, 200, 92], [134, 70, 156, 50, 184, 54, 208, 84]] as Cubic[]) taper(ctx, s, 0.2, 1.1, 0.2, h.deep, 0.55);
        taper(ctx, [126, 14, 127, 34, 127.6, 56, 128, 76], 0.4, 1.4, 0.6, mix(h.deep, '#000000', 0.2), 0.8);
      });
    },
    back(ctx, h) {
      // Chignon haut, vu par-dessus la tête.
      const bun = P('M128,-30 C104,-30 90,-14 90,6 C90,24 106,34 128,34 C150,34 166,24 166,6 C166,-14 152,-30 128,-30 Z');
      fill(ctx, bun, h.base);
      clipped(ctx, bun, () => {
        softShade(ctx, 'M138,-40 C134,-16 138,10 150,40 L180,40 L180,-40 Z', h.shade, 0.6, -6);
        for (const s of [[96, 4, 104, -16, 124, -26, 146, -20], [100, 18, 112, 0, 136, -6, 160, 4], [108, 28, 124, 16, 146, 14, 162, 20]] as Cubic[]) taper(ctx, s, 0.2, 1.2, 0.2, h.deep, 0.6);
        taper(ctx, [100, -4, 106, -18, 118, -24, 130, -26], 0, 3, 0, h.hi, 0.6);
      });
      stroke(ctx, bun, h.deep, 1, 0.65);
    },
  },
  queue: {
    ears: true,
    behind(ctx, h) {
      fill(ctx, 'M128,14 C74,14 38,48 36,100 C35,124 40,146 48,162 L208,162 C216,146 221,124 220,100 C218,48 182,14 128,14 Z', h.shade);
    },
    top(ctx, h) {
      // Cheveux tirés en arrière, raie sur le côté gauche.
      const d = 'M128,12 C74,12 38,46 35,98 C34,116 37,132 42,146 C46,132 50,116 58,102 C68,84 84,74 100,72 C120,70 150,72 172,80 C188,86 198,94 204,106 C208,118 212,132 214,146 C219,132 222,116 221,98 C218,46 182,12 128,12 Z';
      const cap = P(d);
      fill(ctx, cap, h.base);
      capShading(ctx, cap, h, [60, 100, 64, 62, 84, 32, 112, 20], 0.65);
      clipped(ctx, cap, () => {
        for (const s of [[100, 72, 130, 58, 170, 60, 210, 90], [96, 74, 120, 48, 168, 42, 214, 72], [96, 70, 86, 64, 70, 70, 54, 90]] as Cubic[]) taper(ctx, s, 0.2, 1.1, 0.2, h.deep, 0.55);
        taper(ctx, [96, 14, 97, 34, 97.6, 52, 98, 72], 0.4, 1.3, 0.6, mix(h.deep, '#000000', 0.2), 0.75);
      });
    },
    back(ctx, h) {
      // Queue de cheval haute qui retombe derrière l’épaule droite (à droite à l’écran).
      const tail = P('M176,20 C204,10 230,26 236,58 C242,94 236,140 224,178 C220,190 214,198 208,204 C210,186 210,166 206,146 C202,120 196,96 186,74 C180,60 172,46 166,34 Z');
      fill(ctx, tail, h.base);
      clipped(ctx, tail, () => {
        softShade(ctx, 'M210,0 C206,60 210,140 214,220 L260,220 L260,0 Z', h.shade, 0.6, -6);
        for (const s of [[180, 32, 204, 48, 218, 90, 218, 150], [190, 30, 216, 52, 228, 100, 224, 160], [176, 44, 194, 70, 204, 110, 208, 170]] as Cubic[]) taper(ctx, s, 0.2, 1.2, 0.2, h.deep, 0.6);
        taper(ctx, [192, 26, 214, 34, 226, 60, 230, 96], 0, 3.4, 0, h.hi, 0.5);
      });
      stroke(ctx, tail, h.deep, 1, 0.65);
      // Attache.
      fill(ctx, 'M168,24 C174,18 184,18 188,24 C186,32 176,36 168,32 Z', h.deep, 0.9);
    },
  },
  milongs: {
    // « mi-longs » : cheveux lâchés aux épaules, raie au milieu (la tresse sur l’épaule reste à Maëlle).
    ears: false,
    behind(ctx, h) {
      fill(ctx, 'M128,13 C70,11 33,49 29,106 C25,152 28,206 38,250 L218,250 C228,206 231,152 227,106 C223,49 186,11 128,13 Z', h.shade);
      clipped(ctx, P('M128,13 C70,11 33,49 29,106 C25,152 28,206 38,250 L218,250 C228,206 231,152 227,106 C223,49 186,11 128,13 Z'), () => fill(ctx, 'M56,180 C76,240 100,260 128,260 C156,260 180,240 200,180 L210,260 L46,260 Z', h.deep, 0.7));
    },
    top(ctx, h) {
      const d = 'M128,12 C76,12 40,44 36,96 L60,96 C70,80 96,70 122,70 L128,76 L134,70 C160,70 186,80 196,96 L220,96 C216,44 180,12 128,12 Z';
      const cap = P(d);
      fill(ctx, cap, h.base);
      capShading(ctx, cap, h, [64, 80, 74, 50, 96, 28, 122, 18], 0.6);
      clipped(ctx, cap, () => taper(ctx, [127, 14, 127.4, 36, 127.8, 58, 128, 76], 0.4, 1.3, 0.6, mix(h.deep, '#000000', 0.2), 0.75));
    },
    front(ctx, h) {
      sidePanels(ctx, h, 'M126,72 C96,72 66,84 56,108 C48,132 46,170 48,210 C50,240 46,262 38,282 C30,270 26,250 26,226 C26,170 26,124 34,96 C44,62 86,46 126,50 Z',
        [[100, 60, 64, 76, 46, 120, 42, 180], [118, 62, 84, 74, 60, 110, 52, 160], [54, 120, 46, 170, 46, 220, 38, 268]]);
    },
    back(ctx, h) {
      // Longueurs posées sur les épaules, derrière la tête.
      for (const side of [0, 1]) {
        const draw = () => {
          const d = P('M30,230 C26,262 22,292 14,318 C30,322 46,316 56,304 C62,286 64,266 64,246 Z');
          fill(ctx, d, side ? h.shade : h.base);
          clipped(ctx, d, () => strands(ctx, h, [[34, 236, 30, 262, 26, 288, 20, 312], [48, 244, 46, 270, 42, 292, 36, 312]]));
          stroke(ctx, d, h.deep, 0.9, 0.6);
        };
        if (side) mirrored(ctx, 128, draw); else draw();
      }
    },
  },

  // --- Commis : coupes courtes soignées
  raie: {
    ears: true,
    top(ctx, h) {
      // Raie à gauche, cheveux rabattus vers la droite en une vague sur le front.
      const d = 'M128,10 C76,10 38,42 34,96 C33,118 36,138 42,156 L54,154 C51,132 52,112 58,98 C64,84 74,76 86,74 C106,72 130,72 152,78 C172,84 190,90 200,104 C204,120 205,136 202,154 L214,156 C220,138 223,118 222,96 C218,42 180,10 128,10 Z';
      const cap = P(d);
      fill(ctx, cap, h.base);
      capShading(ctx, cap, h, [96, 64, 120, 46, 156, 40, 190, 50], 0.42);
      clipped(ctx, cap, () => {
        for (const s of [[86, 26, 110, 40, 150, 50, 200, 80], [86, 40, 112, 58, 150, 64, 196, 92], [86, 54, 104, 66, 132, 72, 160, 78]] as Cubic[]) taper(ctx, s, 0.2, 1.2, 0.2, h.deep, 0.55);
        taper(ctx, [84, 12, 85, 34, 86, 54, 86, 74], 0.4, 1.4, 0.6, mix(h.deep, '#000000', 0.2), 0.8);
      });
      stroke(ctx, 'M58,98 C64,84 74,76 86,74 C106,72 130,72 152,78 C172,84 190,90 200,104', h.deep, 1, 0.6);
    },
  },
  frange: {
    ears: true,
    top(ctx, h) {
      const cap = P(shortCap(64, 100));
      fill(ctx, cap, h.base);
      capShading(ctx, cap, h, [70, 44, 92, 26, 112, 20, 132, 18], 0.6);
    },
    front(ctx, h) {
      // Frange droite et courte : masse au bord ondulé doux, fines mèches effilées, ombre du même terminateur.
      const f = P(FRANGE);
      fill(ctx, f, h.base);
      clipped(ctx, f, () => {
        softShade(ctx, HAIR_SHADE, h.shade, 0.6, -8);
        for (let i = 0; i < 9; i++) {
          const x = 64 + i * 17 + (i % 3) * 2;
          const lean = -4 - (i % 2) * 2;
          taper(ctx, [x + 4, 52, x + 3, 66, x + lean * 0.5, 80, x + lean, 95], 0, i % 2 ? 1.4 : 1, 0, h.deep, 0.55);
          if (i % 2 === 0) taper(ctx, [x - 4, 54, x - 5, 66, x - 6 + lean * 0.3, 78, x - 7 + lean * 0.5, 88], 0, 2.2, 0, h.hi, 0.35);
        }
        taper(ctx, [70, 44, 92, 26, 112, 20, 132, 18], 0, 5, 0, h.hi, 0.6);
        edgeBand(ctx, f, 3, 4, h.deep, 0.35, BOX);
      });
      stroke(ctx, `M203,90${smooth(FRANGE_EDGE)}`, h.deep, 0.9, 0.65);
    },
    shadow: pathShadow(FRANGE),
  },
  boucles: {
    ears: true,
    top(ctx, h) {
      // Cheveux bouclés courts : un volume au contour bosselé (spline lisse, bosses irrégulières), des boucles
      // semées de tailles et d’orientations variées, en touches effilées (aucun motif répété).
      const r = makeRng(hashString('boucles'));
      const outer: Array<[number, number]> = [];
      for (let k = 0; k <= 14; k++) {
        const t = Math.PI * (1.08 - (k / 14) * 1.16); // de la tempe gauche à la tempe droite, par le sommet
        const bump = 1 + 0.035 * Math.sin(k * 2.3) + 0.02 * (r() - 0.5);
        outer.push([128 + Math.cos(t) * 92 * bump, 100 - Math.sin(t) * 90 * bump]);
      }
      const line: Array<[number, number]> = [];
      for (let k = 0; k <= 10; k++) {
        const x = 206 - (k / 10) * 156;
        const y = 70 + Math.pow(Math.abs(x - 128) / 78, 2) * 74 + (k % 2 ? 3.5 : -1.5) + (r() - 0.5) * 2;
        line.push([x, Math.min(y, 150)]);
      }
      const d = `M${outer[0]![0]},${outer[0]![1]}${smooth(outer)} L${line[0]![0]},${line[0]![1]}${smooth(line)} Z`;
      const cap = P(d);
      fill(ctx, cap, h.base);
      clipped(ctx, cap, () => {
        softShade(ctx, HAIR_SHADE, h.shade, 0.6, -8);
        edgeBand(ctx, cap, 3, 4, h.deep, 0.45, BOX);
        for (let i = 0; i < 46; i++) {
          const x = 44 + r() * 168;
          const y = 14 + r() * 84;
          const sz = 3 + r() * 3.5;
          const a0 = r() * Math.PI * 2;
          const arc: Cubic = [x + Math.cos(a0) * sz, y + Math.sin(a0) * sz, x + Math.cos(a0 + 1.2) * sz * 1.3, y + Math.sin(a0 + 1.2) * sz * 1.3, x + Math.cos(a0 + 2.6) * sz * 1.3, y + Math.sin(a0 + 2.6) * sz * 1.3, x + Math.cos(a0 + 3.6) * sz, y + Math.sin(a0 + 3.6) * sz];
          taper(ctx, arc, 0, i % 3 ? 1.5 : 1.9, 0, i % 3 ? h.deep : h.hi, i % 3 ? 0.5 : 0.45);
        }
        taper(ctx, [70, 44, 92, 26, 112, 20, 132, 18], 0, 4, 0, h.hi, 0.4);
      });
      stroke(ctx, `M${line[0]![0]},${line[0]![1]}${smooth(line)}`, h.deep, 0.9, 0.55);
    },
  },

  // --- Joueuse
  carre: {
    ears: false,
    behind(ctx, h) {
      const back = P('M128,13 C72,11 35,49 31,106 C27,152 30,200 40,238 C44,252 52,262 64,266 L192,266 C204,262 212,252 216,238 C226,200 229,152 225,106 C220,49 184,11 128,13 Z');
      fill(ctx, back, h.shade);
      clipped(ctx, back, () => fill(ctx, 'M56,190 C76,246 100,266 128,266 C156,266 180,246 200,190 L204,280 L52,280 Z', h.deep, 0.75));
    },
    top(ctx, h) {
      const d = 'M128,12 C76,12 40,44 36,96 L60,96 C76,76 110,68 150,70 C176,72 192,80 198,96 L220,96 C216,44 180,12 128,12 Z';
      const cap = P(d);
      fill(ctx, cap, h.base);
      capShading(ctx, cap, h, [70, 70, 86, 40, 110, 24, 140, 18], 0.65);
      clipped(ctx, cap, () => taper(ctx, [148, 14, 149, 34, 150, 52, 150, 70], 0.4, 1.3, 0.6, mix(h.deep, '#000000', 0.2), 0.75));
    },
    front(ctx, h) {
      // Carré au menton, raie à droite : mèche balayée sur le front côté gauche (au-dessus des sourcils).
      sidePanels(ctx, h, 'M66,64 C58,90 53,122 53,154 C53,182 56,206 62,226 C64,238 66,250 70,262 C58,264 46,262 38,256 C34,236 32,204 32,164 C32,126 34,92 40,64 Z',
        [[50, 96, 42, 140, 40, 190, 44, 236], [58, 80, 48, 120, 44, 170, 50, 226], [62, 150, 58, 190, 60, 226, 64, 254]]);
      crown(ctx, h, 'M128,10 C76,10 38,42 32,100 C44,90 56,84 68,80 C88,72 120,68 150,70 C176,72 190,80 196,94 C206,90 216,94 224,100 C218,42 180,10 128,10 Z', [70, 66, 86, 38, 110, 22, 140, 16]);
      const sweep = P('M150,70 C120,68 88,74 66,90 C58,96 54,104 52,112 C64,104 80,98 98,96 C120,92 140,86 150,70 Z');
      fill(ctx, sweep, h.base);
      clipped(ctx, sweep, () => { edgeBand(ctx, sweep, -2, -4, h.shade, 0.8, BOX); taper(ctx, [140, 74, 116, 78, 90, 84, 66, 98], 0, 2.2, 0, h.hi, 0.3); });
      stroke(ctx, 'M52,112 C64,104 80,98 98,96 C120,92 140,86 150,70', h.deep, 0.9, 0.7);
    },
    shadow: pathShadow('M150,70 C140,86 120,92 98,96 C80,98 64,104 52,112 L52,116 C70,108 100,100 150,74 Z'),
  },
  ondulee: {
    ears: false,
    behind(ctx, h) {
      fill(ctx, 'M128,13 C70,11 30,49 26,106 C22,152 26,206 36,250 L220,250 C230,206 234,152 230,106 C226,49 186,11 128,13 Z', h.shade);
      clipped(ctx, P('M128,13 C70,11 30,49 26,106 C22,152 26,206 36,250 L220,250 C230,206 234,152 230,106 C226,49 186,11 128,13 Z'), () => fill(ctx, 'M56,180 C76,240 100,260 128,260 C156,260 180,240 200,180 L210,260 L46,260 Z', h.deep, 0.7));
    },
    top(ctx, h) {
      const d = 'M128,12 C76,12 40,44 36,96 L58,98 C70,80 92,70 112,70 C140,70 172,74 196,94 L220,96 C216,44 180,12 128,12 Z';
      const cap = P(d);
      fill(ctx, cap, h.base);
      capShading(ctx, cap, h, [66, 82, 76, 50, 100, 28, 126, 18], 0.6);
      clipped(ctx, cap, () => taper(ctx, [110, 14, 111, 34, 111.6, 52, 112, 70], 0.4, 1.3, 0.6, mix(h.deep, '#000000', 0.2), 0.75));
    },
    front(ctx, h) {
      // Pans ondulés jusqu’aux épaules : bord extérieur en vagues.
      sidePanels(ctx, h, 'M112,70 C84,72 62,86 54,110 C48,132 50,160 46,186 C44,208 50,228 44,252 C40,268 32,280 22,288 C18,270 22,256 18,240 C14,222 22,206 18,188 C14,166 22,150 20,130 C18,100 34,70 66,56 C82,50 100,52 112,58 Z',
        [[96, 64, 64, 80, 48, 120, 44, 170], [54, 120, 40, 160, 46, 200, 34, 240], [70, 84, 56, 120, 54, 170, 50, 220]]);
    },
    back(ctx, h) {
      for (const side of [0, 1]) {
        const draw = () => {
          const d = P('M24,236 C14,262 18,286 8,316 C26,326 48,318 58,302 C64,282 60,262 64,244 Z');
          fill(ctx, d, side ? h.shade : h.base);
          clipped(ctx, d, () => strands(ctx, h, [[30, 240, 22, 266, 24, 290, 16, 314], [46, 248, 42, 272, 46, 292, 38, 314]]));
          stroke(ctx, d, h.deep, 0.9, 0.6);
        };
        if (side) mirrored(ctx, 128, draw); else draw();
      }
    },
  },
  garconne: {
    ears: true,
    top(ctx, h) {
      const cap = P(shortCap(66, 102));
      fill(ctx, cap, h.base);
      capShading(ctx, cap, h, [72, 46, 94, 26, 116, 18, 138, 16], 0.6);
    },
    front(ctx, h) {
      // Mèche balayée sur le côté, effilée, au-dessus du sourcil gauche.
      const d = 'M176,64 C146,58 106,62 82,76 C68,84 60,94 56,104 C66,98 76,96 86,98 C96,94 104,96 112,94 C130,88 152,80 176,64 Z';
      const f = P(d);
      fill(ctx, f, h.base);
      clipped(ctx, f, () => {
        edgeBand(ctx, f, -2, -4, h.shade, 0.8, BOX);
        strands(ctx, h, [[170, 66, 140, 70, 110, 80, 86, 96], [150, 66, 124, 70, 98, 80, 70, 98]], [0]);
      });
      stroke(ctx, f, h.deep, 0.9, 0.7);
    },
    shadow: pathShadow('M176,64 C152,80 130,88 112,94 C104,96 96,94 86,98 C76,96 66,98 56,104 L56,108 C80,100 120,96 176,68 Z'),
  },
};

// ---------------------------------------------------------------------------------------------------------------
// Tête : coupe arrière, cou, oreilles, visage et modelé (sobre), dessus de tête, accessoires de tête

function drawHead(L: NpcLook, seed: number): HTMLCanvasElement {
  const { c, ctx } = canvas(256, 312);
  const s = L.skin;
  const ink = skinInk(s);
  const cut = CUTS[L.cut];
  const covered = L.accessory === 'bonnet' || L.accessory === 'fichu' || L.accessory === 'casquette';
  cut.behind?.(ctx, L.hair);
  // Oreilles (coupes courtes ou cheveux tirés).
  if (cut.ears) {
    fill(ctx, EAR, s.base);
    taper(ctx, [47, 140, 40, 140, 39, 154, 45, 166], 0.3, 1.4, 0.3, s.shade, 0.8);
    stroke(ctx, EAR, ink.line, 1.1, 0.5);
    mirrored(ctx, 128, () => {
      fill(ctx, EAR, s.shade);
      taper(ctx, [47, 140, 40, 140, 39, 154, 45, 166], 0.3, 1.4, 0.3, s.deep, 0.8);
      stroke(ctx, EAR, ink.line, 1.2, 0.6);
    });
  }
  // Cou, dans l’ombre de la mâchoire, arrêté sur l’encolure.
  clipped(ctx, NECKLINE, () => {
    const neck = P(L.face === 'carre' ? 'M96,210 C98,246 96,276 88,310 L168,310 C160,276 158,246 160,210 Z' : 'M102,212 C104,246 102,276 94,310 L162,310 C154,276 152,246 154,212 Z');
    fill(ctx, neck, s.shade);
    clipped(ctx, neck, () => {
      fill(ctx, 'M98,254 C104,272 102,290 96,308 L116,308 C112,292 108,274 102,254 Z', s.base, 0.9);
      fill(ctx, 'M100,226 C112,248 124,260 132,266 C142,260 152,246 156,226 L156,256 C146,266 136,272 128,274 C118,272 106,266 100,256 Z', s.deep, 0.5);
    });
  });
  // Visage : aplat, ombre propre adoucie, ombres portées, modelé.
  const face = P(FACES[L.face]);
  fill(ctx, face, s.base);
  clipped(ctx, face, () => {
    softShade(ctx, SHADES[L.face], s.shade);
    cut.shadow?.(ctx, s.shade);
    if (covered) fill(ctx, translatedPath('M40,70 C80,60 176,60 216,70 L216,92 C176,82 80,82 40,92 Z', 2, 6), s.shade, 0.75);
    for (const [i, cx] of EYE_CX.entries()) {
      const k = i === 0 ? 1 : -1;
      const g = ctx.createRadialGradient(cx + k * 6, 140, 2, cx + k * 4, 142, 30);
      g.addColorStop(0, 'rgba(110,64,52,0.28)');
      g.addColorStop(1, 'rgba(110,64,52,0)');
      fill(ctx, 'M0,100 L256,100 L256,180 L0,180 Z', g);
    }
    // Nez : plan d’ombre, dessous, narines, reflet.
    fill(ctx, 'M134,148 C138,164 142,180 147,191 C146,198 139,201 132,199 C137,190 137,174 132,158 Z', s.shade, 0.9);
    fill(ctx, 'M115,200 C121,205 135,206 143,201 C139,208 120,208 115,200 Z', s.deep, 0.75);
    fill(ctx, 'M117.5,199.6 C118.6,197.6 121.6,197.2 123.4,199 C121.6,200.6 119.2,200.8 117.5,199.6 Z', ink.line, 0.6);
    fill(ctx, 'M138.5,199.6 C137.4,197.6 134.4,197.2 132.6,199 C134.4,200.6 136.8,200.8 138.5,199.6 Z', ink.line, 0.6);
    fill(ctx, 'M121,192.5 C122.8,189.8 127.4,189.4 129.6,191.6 C127.6,193.6 123.4,194 121,192.5 Z', s.hi, 0.8);
    taper(ctx, [117.5, 192, 114, 195, 114.8, 199.4, 118.6, 201], 0.4, 1.1, 0.5, ink.lineSoft, 0.7);
    // Sillon, dessous de la lèvre, menton ; reflets de la pommette et du front.
    taper(ctx, [131.4, 205, 131.8, 208, 131.6, 211, 131, 214], 0.2, 0.8, 0.2, s.shade, 0.7);
    fill(ctx, 'M117,236 C123,240.4 133,240.4 140,236 C136,242.6 122,243 117,236 Z', s.shade, 0.8);
    fill(ctx, 'M117,256 C121,253 130,253 134,256.6 C129,259.4 121,259.4 117,256 Z', s.hi, 0.45);
    fill(ctx, 'M54,170 C61,166 71,165.4 80,168 C71,169 63,171.4 56,175 Z', s.hi, 0.5);
    if (L.face === 'carre') fill(ctx, 'M54,184 C62,196 70,210 74,228 C64,214 56,202 50,196 Z', s.shade, 0.6);
    // Barbe de trois jours (docker) : voile semé sur la mâchoire et la lèvre supérieure.
    if (L.accessory === 'barbe') {
      const beard = 'M54,196 C60,226 86,254 110,264 C120,268.5 136,268.5 146,264 C170,254 196,226 202,196 C192,212 176,226 162,232 C154,240 142,246 128,246 C114,246 102,240 94,232 C80,226 64,212 54,196 Z';
      fill(ctx, beard, L.hair.deep, 0.3);
      fill(ctx, 'M104,206 C112,202.6 122,202 128,203.4 C134,202 144,202.6 152,206 C146,210 136,210.4 128,209 C120,210.4 110,210 104,206 Z', L.hair.deep, 0.42);
      const r = makeRng(hashString(`barbe|${seed}`));
      clipped(ctx, beard, () => { for (let i = 0; i < 160; i++) { const x = 54 + r() * 148; const y = 196 + r() * 72; fill(ctx, `M${x},${y} m-0.7,0 a0.7,0.7 0 1,0 1.4,0 a0.7,0.7 0 1,0 -1.4,0`, L.hair.deep, 0.35); } });
    }
  });
  for (const [seg, a, b, d] of CONTOURS[L.face]) taper(ctx, seg, a, b, d, ink.line, 0.85);
  // Dessus de la tête (au-dessus des paupières découpées) ; caché sous un couvre-chef.
  if (!covered) cut.top?.(ctx, L.hair, s);
  else coveredHair(ctx, L.hair);
  // Boucle d’oreille (oreilles dégagées) : anneau discret.
  if (L.accessory === 'boucle' && cut.ears) {
    ctx.save();
    ctx.strokeStyle = '#c8a050'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(44, 183, 3.6, 0.2, Math.PI * 2 - 0.5); ctx.stroke();
    ctx.beginPath(); ctx.arc(212, 183, 3.6, Math.PI + 0.5, Math.PI * 3 - 0.2); ctx.stroke();
    ctx.restore();
  }
  return c;
}

/** Sous un couvre-chef : seulement les tempes et la nuque. */
function coveredHair(ctx: Ctx, h: Tone): void {
  const d = 'M40,92 C36,112 38,134 44,156 L54,154 C51,134 52,114 58,96 Z M216,92 C220,112 218,134 212,156 L202,154 C205,134 204,114 198,96 Z';
  fill(ctx, d, h.base);
  fill(ctx, d, h.shade, 0.4);
}

// ---------------------------------------------------------------------------------------------------------------
// Couche des mèches : frange, pans, couvre-chefs, lunettes

function drawFront(L: NpcLook): HTMLCanvasElement {
  const { c, ctx } = canvas(256, 312);
  const covered = L.accessory === 'bonnet' || L.accessory === 'fichu' || L.accessory === 'casquette';
  if (!covered || L.accessory === 'fichu') CUTS[L.cut].front?.(ctx, L.hair);
  const k = L.cloth;
  switch (L.accessory) {
    case 'bonnet': {
      // Bonnet de laine à revers côtelé.
      const cap = P('M40,92 C36,46 74,10 128,10 C182,10 220,46 216,92 Z');
      fill(ctx, cap, k.base);
      clipped(ctx, cap, () => {
        softShade(ctx, HAIR_SHADE, k.shade, 0.55, -8);
        for (let x = 48; x <= 208; x += 9) taper(ctx, [x, 88, x + (x - 128) * 0.04, 60, x + (x - 128) * 0.12, 34, x + (x - 128) * 0.2, 14], 0.2, 1.1, 0.2, k.deep, 0.35);
        taper(ctx, [62, 70, 74, 40, 96, 22, 122, 16], 0, 4, 0, k.hi, 0.5);
      });
      const cuff = P('M36,94 C34,82 36,72 40,66 C80,56 176,56 216,66 C220,72 222,82 220,94 C176,84 80,84 36,94 Z');
      fill(ctx, cuff, k.shade);
      clipped(ctx, cuff, () => { for (let x = 40; x <= 216; x += 6) stroke(ctx, `M${x},${60 + Math.abs(x - 128) * 0.06} L${x},${94 - Math.abs(x - 128) * 0.03}`, k.deep, 1.2, 0.45); });
      stroke(ctx, cuff, mix(k.deep, '#000000', 0.3), 1, 0.7);
      stroke(ctx, cap, mix(k.deep, '#000000', 0.3), 1, 0.6);
      break;
    }
    case 'casquette': {
      // Casquette plate de toile, visière courte.
      const cap = P('M36,88 C34,50 70,22 130,22 C188,22 222,46 220,84 C192,78 160,76 128,76 C96,76 64,80 36,88 Z');
      fill(ctx, cap, k.base);
      clipped(ctx, cap, () => {
        softShade(ctx, HAIR_SHADE, k.shade, 0.55, -8);
        stroke(ctx, 'M128,24 C120,40 116,58 118,76', k.deep, 1, 0.5);
        taper(ctx, [58, 70, 70, 44, 94, 30, 124, 26], 0, 4, 0, k.hi, 0.45);
      });
      stroke(ctx, cap, mix(k.deep, '#000000', 0.3), 1, 0.65);
      const visor = P('M58,86 C80,78 176,76 200,84 C196,96 176,102 128,102 C82,102 62,96 58,86 Z');
      fill(ctx, visor, k.deep);
      clipped(ctx, visor, () => taper(ctx, [70, 88, 100, 84, 150, 84, 190, 88], 0, 1.6, 0, k.hi, 0.4));
      stroke(ctx, visor, mix(k.deep, '#000000', 0.4), 1, 0.7);
      fill(ctx, 'M124,24 a4,3 0 1,0 8,0 a4,3 0 1,0 -8,0', k.shade);
      break;
    }
    case 'fichu': {
      // Fichu noué sur la tête : couvre le dessus et l’arrière, lisière du front visible.
      const scarf = P('M36,98 C32,46 72,12 128,12 C184,12 224,46 220,98 C206,88 188,82 168,80 C150,78 140,82 128,82 C116,82 106,78 88,80 C68,82 50,88 36,98 Z');
      fill(ctx, scarf, k.base);
      clipped(ctx, scarf, () => {
        softShade(ctx, HAIR_SHADE, k.shade, 0.55, -8);
        // Petit motif semé (pois discrets).
        for (let y = 26; y < 92; y += 13) for (let x = 46 + ((y / 13) % 2) * 6; x < 214; x += 12) fill(ctx, `M${x},${y} m-1.6,0 a1.6,1.6 0 1,0 3.2,0 a1.6,1.6 0 1,0 -3.2,0`, L.shirt.base, 0.55);
        for (const s of [[60, 90, 70, 56, 96, 30, 128, 22], [196, 90, 186, 56, 160, 30, 128, 22]] as Cubic[]) taper(ctx, s, 0.2, 1.4, 0.2, k.deep, 0.5);
      });
      stroke(ctx, scarf, mix(k.deep, '#000000', 0.3), 1, 0.65);
      break;
    }
    case 'lunettes': {
      // Lunettes à monture fine rectangulaire (les rondes de laiton restent à Orin).
      ctx.save();
      ctx.strokeStyle = '#2a2420'; ctx.lineWidth = 2;
      for (const cx of EYE_CX) { ctx.beginPath(); ctx.roundRect(cx - 24, 138, 48, 30, 7); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(EYE_CX[0] + 24, 148); ctx.quadraticCurveTo(128, 142, EYE_CX[1] - 24, 148); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(EYE_CX[0] - 24, 146); ctx.lineTo(48, 142); ctx.moveTo(EYE_CX[1] + 24, 146); ctx.lineTo(208, 142); ctx.stroke();
      ctx.globalAlpha = 0.18; ctx.fillStyle = '#ffffff';
      for (const cx of EYE_CX) { ctx.beginPath(); ctx.moveTo(cx - 18, 142); ctx.lineTo(cx - 4, 142); ctx.lineTo(cx - 14, 164); ctx.lineTo(cx - 22, 164); ctx.closePath(); ctx.fill(); }
      ctx.restore();
      break;
    }
    case 'bandeau': {
      const band = P('M38,84 C76,64 180,64 218,84 L217,93 C180,74 76,74 39,93 Z');
      fill(ctx, band, k.base);
      clipped(ctx, band, () => taper(ctx, [46, 82, 76, 70, 104, 67, 128, 67], 0, 1.6, 0, k.hi, 0.7));
      stroke(ctx, band, mix(k.deep, '#000000', 0.3), 0.9, 0.6);
      break;
    }
    case 'fleur': {
      // Petite fleur des champs piquée au-dessus de l’oreille gauche.
      const petal = (a: number) => { ctx.save(); ctx.translate(58, 92); ctx.rotate(a); fill(ctx, 'M0,0 C-3,-4 -3,-10 0,-12 C3,-10 3,-4 0,0 Z', L.shirt.hi); stroke(ctx, 'M0,0 C-3,-4 -3,-10 0,-12 C3,-10 3,-4 0,0 Z', L.shirt.deep, 0.6, 0.6); ctx.restore(); };
      for (let i = 0; i < 5; i++) petal((i / 5) * Math.PI * 2);
      fill(ctx, 'M58,92 m-3,0 a3,3 0 1,0 6,0 a3,3 0 1,0 -6,0', '#d8a640');
      break;
    }
    case 'boucle': {
      // Oreilles couvertes par les cheveux : une barrette discrète sur le pan gauche.
      if (!CUTS[L.cut].ears) { const b = P('M48,128 L64,122 L66,127 L50,133 Z'); fill(ctx, b, '#c8a050'); stroke(ctx, b, '#7a5a24', 0.8, 0.8); }
      break;
    }
  }
  return c;
}

/** Plan arrière : chignon, queue, longueurs ; nœud du fichu. */
function drawBack(L: NpcLook): HTMLCanvasElement {
  const { c, ctx } = backCanvasH();
  const covered = L.accessory === 'bonnet' || L.accessory === 'casquette';
  if (L.accessory === 'fichu') {
    const knot = P('M196,92 C214,96 226,108 230,124 C218,122 208,116 202,106 Z M200,96 C214,110 218,128 214,146 C206,134 200,120 198,106 Z');
    fill(ctx, knot, L.cloth.shade);
    stroke(ctx, knot, L.cloth.deep, 0.9, 0.6);
    if (L.cut === 'milongs') CUTS.milongs.back?.(ctx, L.hair);
  } else if (!covered || L.cut === 'milongs' || L.cut === 'ondulee') CUTS[L.cut].back?.(ctx, L.hair);
  return c;
}

// ---------------------------------------------------------------------------------------------------------------
// Bustes : une tenue par gabarit, couleurs tirées (vêtement principal, chemise), aucun emblème

const BODY = 'M100,284 C62,290 10,302 -30,320 C-56,332 -70,354 -74,386 L-78,610 L334,610 L330,386 C326,354 312,332 286,320 C246,302 194,290 156,284 Z';
const BODY_BROAD = 'M96,282 C56,288 0,300 -44,318 C-72,332 -86,356 -90,388 L-94,610 L350,610 L346,388 C342,356 328,332 300,318 C256,300 200,288 160,282 Z';

function bodyShading(ctx: Ctx, k: Tone, broad: boolean): void {
  if (broad) {
    fill(ctx, 'M-90,388 C-86,356 -72,332 -44,318 C-58,338 -68,362 -72,396 L-76,610 L-96,610 Z', k.hi, 0.7);
    fill(ctx, 'M258,302 C300,316 330,338 346,388 L350,610 L268,610 C280,500 280,400 258,302 Z', k.shade, 0.85);
  } else {
    fill(ctx, 'M-74,386 C-70,354 -56,332 -30,320 C-44,340 -54,362 -58,394 L-62,610 L-80,610 Z', k.hi, 0.7);
    fill(ctx, 'M250,302 C290,316 318,336 330,386 L334,610 L262,610 C272,500 272,400 250,302 Z', k.shade, 0.85);
  }
}

function drawTorso(L: NpcLook): HTMLCanvasElement {
  const { c, ctx } = torsoCanvasH();
  const k = L.cloth;
  const sh = L.shirt;
  const dark = mix(k.deep, '#000000', 0.3);
  switch (L.template) {
    case 'docker': {
      // Tricot à encolure ronde côtelée, bretelles de cuir.
      const body = P(BODY_BROAD);
      fill(ctx, body, k.base);
      clipped(ctx, body, () => {
        bodyShading(ctx, k, true);
        for (let x = -80; x < 350; x += 14) taper(ctx, [x, 330, x + 1, 420, x + 2, 520, x + 2, 610], 0, 1.4, 0, k.deep, 0.18);
        const rib = 'M94,280 C106,298 118,304 128,304.6 C138,304 150,298 162,280 L170,288 C156,310 142,316 128,316.6 C114,316 100,310 86,288 Z';
        fill(ctx, rib, k.shade);
        clipped(ctx, P(rib), () => { for (let x = 86; x <= 170; x += 4) stroke(ctx, `M${x},280 L${x + (x - 128) * 0.08},318`, k.deep, 1, 0.4); });
        for (const x0 of [40, 216]) {
          const strap = P(`M${x0 - 9},300 L${x0 + 9},298 L${x0 + 13},610 L${x0 - 5},610 Z`);
          fill(ctx, strap, '#4e3424');
          stroke(ctx, `M${x0 - 5},304 L${x0 - 1},610`, '#7a5a3e', 0.8, 0.6);
          fill(ctx, `M${x0 - 6},372 L${x0 + 10},370 L${x0 + 11},386 L${x0 - 5},388 Z`, '#a08050');
        }
      });
      stroke(ctx, body, dark, 2, 0.8);
      break;
    }
    case 'marchande': {
      // Corsage clair à encolure ronde, châle croisé noué devant.
      const body = P(BODY);
      fill(ctx, body, sh.base);
      clipped(ctx, body, () => {
        bodyShading(ctx, sh, false);
        stroke(ctx, 'M96,286 C106,300 118,306 128,306.6 C138,306 150,300 160,286', sh.deep, 1.6, 0.7);
        const shawlL = 'M-74,386 C-70,354 -56,332 -30,320 C10,302 62,290 98,286 C110,330 124,380 132,452 C100,440 60,430 20,436 C-20,442 -54,452 -78,470 Z';
        for (const [side, tone] of [[0, k.base], [1, k.shade]] as const) {
          const draw = () => {
            const p = P(shawlL);
            fill(ctx, p, tone);
            clipped(ctx, p, () => {
              edgeBand(ctx, p, 4, -4, k.hi, side ? 0.25 : 0.5, [-100, 260, 360, 620]);
              for (let i = 0; i < 6; i++) taper(ctx, [-60 + i * 30, 330 + i * 4, -40 + i * 32, 380, -20 + i * 34, 420, -6 + i * 36, 450], 0, 2, 0, k.deep, 0.35);
            });
            stroke(ctx, p, k.deep, 1.2, 0.7);
            // Franges du châle.
            for (let x = -70; x < 128; x += 7) taper(ctx, [x, 452 - (x + 70) * 0.06, x + 0.5, 460, x + 1, 466, x + 1.5, 472 - (x + 70) * 0.04], 0, 1.2, 0, tone, 0.9);
          };
          if (side) mirrored(ctx, 128, draw); else draw();
        }
        // Nœud du châle sur la poitrine.
        const knot = P('M118,436 C124,428 134,428 140,436 C138,448 130,454 128,454 C126,454 120,448 118,436 Z');
        fill(ctx, knot, k.shade);
        stroke(ctx, knot, k.deep, 1, 0.8);
      });
      stroke(ctx, body, mix(sh.deep, '#000000', 0.3), 2, 0.8);
      break;
    }
    case 'commis': {
      // Veste courte boutonnée à revers sur une chemise ; cravate en accessoire.
      const body = P(BODY);
      fill(ctx, body, k.base);
      clipped(ctx, body, () => {
        bodyShading(ctx, k, false);
        const shirt = P('M98,284 L158,284 L170,440 L86,440 Z');
        fill(ctx, shirt, sh.base);
        clipped(ctx, shirt, () => fill(ctx, 'M128,284 L176,284 L176,440 L128,440 Z', sh.shade, 0.5));
        // Pointes du col de chemise, couchées sous l’encolure (pas de col montant).
        for (const side of [0, 1]) {
          const draw = () => { const p = P('M98,288 C106,300 116,308 126,312 L114,326 C106,316 100,302 96,292 Z'); fill(ctx, p, sh.hi); stroke(ctx, p, sh.deep, 0.9, 0.7); };
          if (side) mirrored(ctx, 128, draw); else draw();
        }
        if (L.accessory === 'cravate') {
          const tie = P('M122,312 L134,312 L138,324 L132,330 L140,420 L128,436 L116,420 L124,330 L118,324 Z');
          fill(ctx, tie, mix(k.deep, '#5a1a1a', 0.5));
          stroke(ctx, tie, '#1a0c0a', 0.9, 0.7);
        } else for (const y of [330, 352, 374]) fill(ctx, `M130.4,${y} a2.4,2.4 0 1,0 -4.8,0 a2.4,2.4 0 1,0 4.8,0`, sh.deep, 0.8);
        const lapel = 'M98,284 C92,330 96,390 112,450 L84,452 C70,388 70,318 82,288 Z';
        fill(ctx, lapel, k.hi);
        stroke(ctx, lapel, dark, 1, 0.6);
        mirrored(ctx, 128, () => { fill(ctx, lapel, k.shade); stroke(ctx, lapel, dark, 1, 0.6); });
        for (const y of [470, 510]) fill(ctx, `M150,${y} a3.4,3.4 0 1,0 -6.8,0 a3.4,3.4 0 1,0 6.8,0`, k.deep);
        stroke(ctx, 'M150,450 L156,610', dark, 1, 0.5);
      });
      stroke(ctx, body, dark, 2, 0.8);
      break;
    }
    case 'joueuse': {
      // Gilet sans manches sur une chemise blanche aux manches bouffantes ; broche en accessoire.
      const body = P(BODY);
      fill(ctx, body, sh.base);
      clipped(ctx, body, () => {
        bodyShading(ctx, sh, false);
        for (const s of [[-50, 340, -40, 400, -36, 460, -40, 520], [306, 340, 296, 400, 292, 460, 296, 520]] as Cubic[]) taper(ctx, s, 0, 3, 0, sh.deep, 0.4);
        const vest = P('M20,312 C50,300 80,292 100,288 C110,320 120,360 128,420 C136,360 146,320 156,288 C176,292 206,300 236,312 C252,380 256,480 250,610 L6,610 C0,480 4,380 20,312 Z');
        fill(ctx, vest, k.base);
        clipped(ctx, vest, () => {
          fill(ctx, 'M128,280 L260,280 L260,620 L128,620 Z', k.shade, 0.5);
          taper(ctx, [30, 330, 36, 400, 40, 480, 38, 560], 0, 3, 0, k.hi, 0.5);
        });
        stroke(ctx, vest, dark, 1.4, 0.75);
        for (const y of [450, 486, 522]) {
          fill(ctx, `M132,${y} a3,3 0 1,0 -6,0 a3,3 0 1,0 6,0`, '#c8a050');
          stroke(ctx, `M132,${y} a3,3 0 1,0 -6,0 a3,3 0 1,0 6,0`, '#6a4a1a', 0.7, 0.7);
        }
        stroke(ctx, 'M96,286 C106,300 118,306 128,306.6 C138,306 150,300 160,286', sh.deep, 1.4, 0.6);
        if (L.accessory === 'broche') {
          const b = P('M66,356 m-8,0 a8,8 0 1,0 16,0 a8,8 0 1,0 -16,0');
          fill(ctx, b, '#c8a050');
          fill(ctx, 'M66,356 m-4.4,0 a4.4,4.4 0 1,0 8.8,0 a4.4,4.4 0 1,0 -8.8,0', mix(k.hi, '#ffffff', 0.4));
          stroke(ctx, b, '#6a4a1a', 1, 0.8);
        }
      });
      stroke(ctx, body, mix(sh.deep, '#000000', 0.3), 2, 0.8);
      break;
    }
  }
  return c;
}

// ---------------------------------------------------------------------------------------------------------------
// Identité

/** Sourcils plus épais pour le docker, plus fins pour la joueuse (mêmes trois formes, repère 72 × 22). */
const BROWS_EPAIS: Record<BrowShape, string> = {
  rest: 'M2,16 C12,10.6 26,7.2 40,6.4 C52,5.8 61,6.6 68,8.4 C70.8,9.2 71.2,13 69.8,17 C61,15.2 51,14.6 41,14.6 C28,14.6 15,16 2,17.8 Z',
  arch: 'M2,18.4 C10,9.6 22,4.6 36,3.8 C50,3.2 60,5.6 67.6,9.6 C70.4,11 71,14.4 69.6,17.8 C60,15 50,13 40,12.8 C27,12.6 14,14.8 2,18.6 Z',
  knit: 'M2,12.2 C16,9 30,8.2 44,9.2 C55,10 63,12.6 69,15.8 C71.4,17.2 71,20.4 68.8,21.8 C60,18.8 50,17 40,16.4 C27,15.8 14,15.4 2,15.8 Z',
};

const KITS = new Map<string, FigureV2Kit>();

/** Identité V2 d’un PNJ (`pnj-<gabarit>-<graine>`), en cache ; null si l’identifiant n’est pas celui d’un PNJ. */
export function npcKitV2(id: string): FigureV2Kit | null {
  const hit = KITS.get(id);
  if (hit) return hit;
  const L = npcLook(id);
  if (!L) return null;
  const s = L.skin;
  const ink = skinInk(s);
  const t = NPC_TEMPLATES[L.template];
  const kit: FigureV2Kit = {
    id,
    colors: {
      skinShade: s.shade, line: ink.line, lineSoft: ink.lineSoft,
      lash: mix(L.hair.deep, '#0a0606', 0.5), lashSoft: mix(L.hair.shade, s.deep, 0.4),
      brow: mix(L.hair.base, L.hair.deep, 0.35), browHi: mix(L.hair.hi, s.base, 0.3),
      lipUp: mix(s.deep, '#a0483a', 0.35), lipLow: mix(s.shade, '#c06a58', 0.3), lipHi: mix(s.hi, '#f0b8a8', 0.4),
      iris: L.iris.iris, irisDeep: L.iris.deep, irisLight: L.iris.light, irisAmber: L.iris.amber, pupil: '#080606', irisGlow: L.iris.glow,
      lashWeight: t.gender === 'f' ? 0.95 : 0.8, lashWing: false, lashStrands: false,
    },
    brows: L.template === 'docker' ? BROWS_EPAIS : undefined,
    head: (seed) => drawHead(L, seed),
    front: () => drawFront(L),
    back: () => drawBack(L),
    torso: () => drawTorso(L),
  };
  KITS.set(id, kit);
  return kit;
}
