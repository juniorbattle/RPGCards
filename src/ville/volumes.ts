/**
 * Essai de profondeur du décor sur la Grande Cour (retour du responsable du 2026-11-14 : « une image générée de bâtiment
 * avec un escalier mais il n'y a pas de profondeur, au contraire on sent que tout est collé/écrasé… ce qui casse
 * l'immersion »). Le relief de la passe 162 (`reliefs.ts`) décale l'image vue de biais ; vu de face, le cadrage de
 * référence, il ne change presque rien. Trois leviers choisis par le responsable, tous par code :
 *
 *  1. **Volumes éclairés** : des normales tirées de la carte des profondeurs (sa pente, `pentes`) ; les lanternes du moteur
 *     et un halo chaud autour du protagoniste les éclairent (les arêtes accrochent la lumière) ; les recoins s'assombrissent
 *     selon leur profondeur, les lumières peintes restent ; une ombre tombe sous les saillies (`ombrage`). Visible de face.
 *  2. **Ombres au sol** : un escalier, un perron posent une ombre douce sur les pavés devant eux (`ombresRampe`, `ombres.ts`).
 *  3. **Escaliers en vrai 3D** : la volée peinte est découpée dans l'image (un polygone en pixels, comme les formes du relief)
 *     et posée sur une rampe qui avance vers la rue (`sommetRampe`), ses flancs dans l'ombre (`flancsRampe`) ; le reste de
 *     l'image ne change pas, le trou derrière la rampe est assombri (et caché par elle).
 *
 * Aucune image n'est créée ni modifiée : formes, découpes et cartes sont des données, tracées au chargement. L'essai ne
 * vaut que pour les îlots de `ILOTS_ESSAI` (la Grande Cour) ; `?volume=0` le coupe (le relief de la passe 162 reste),
 * `?relief=0` coupe tout (le rendu d'avant le relief). Les autres quartiers attendent le verdict du responsable.
 */
import { RELIEF_MAX, RELIEF_MIN, RELIEFS, type Forme } from './reliefs';

/**
 * Réglages des volumes éclairés (nuanceur des plans) : assombrissement des recoins au plus profond (`creux`), part gardée
 * des lumières peintes (`garde`), ciel d'en haut sur les faces tournées vers lui (`ciel`) et ombre des côtés (`cotes`),
 * gain des arêtes sous les lanternes (`arete`), halo du protagoniste sur le mur plat et sur les arêtes, albédo plancher de
 * la lumière ajoutée (linéaire).
 */
export const REGLAGES = { creux: 0.25, garde: 1, ciel: 0.24, cotes: 0.3, arete: 1.6, areteMax: 0.35, haloPlat: 0.12, haloArete: 2.6, albedo: 0.035 } as const;

/** Îlots où l'essai est actif : la Grande Cour, puis le Quai en quatre rangs (précision du responsable : « ce sont surtout
 *  les bâtiments dans les zones profondes », les rangs du fond). */
export const ILOTS_ESSAI: ReadonlySet<string> = new Set(['cour', 'quai']);

/** L'essai est-il actif pour cet îlot, avec ces paramètres d'adresse ? */
export function volumeActif(ilot: string, search = ''): boolean {
  const q = new URLSearchParams(search);
  return ILOTS_ESSAI.has(ilot) && q.get('relief') !== '0' && q.get('volume') !== '0';
}

type Pt = readonly [number, number];

/** Escalier ou perron découpé dans l'image et posé sur une rampe 3D. Coordonnées en pixels de l'image d'origine. */
export interface Rampe {
  /** Contour de la découpe : la volée, ses limons et ses rampes, du palier au sol. */
  poly: readonly Pt[];
  /** Ligne du palier (px) : la marche du haut reste contre le mur. */
  haut: number;
  /** Ligne du sol (px) : la marche du bas, qui avance de `saillie` m vers la rue. */
  bas: number;
  /** Avancée de la marche du bas devant le plan (m). */
  saillie: number;
  /** Bande de l'image (px : x0, y0, x1, y1) qui habille les flancs, répétée et assombrie (maçonnerie, planches). */
  flanc: readonly [number, number, number, number];
}

/**
 * Les rampes, par image. La volée de la maison à l'escalier (frise A des rangs du fond, à droite de la Grande Cour, au
 * fond de la rue Haute et de la cour de la Chapelle : la porte de l'étage, 4,5 m plus haut, la volée et son parapet
 * courbe), les deux volées de la frise B (la même maison, en miroir, et une autre), le perron de la maison du Puits, les
 * marches de l'estrade des duels (0,7 m).
 */
export const RAMPES: Readonly<Record<string, readonly Rampe[]>> = {
  'rangs-frise-a.png': [
    { poly: [[1722, 834], [1722, 716], [1744, 700], [1760, 642], [1776, 602], [1787, 562], [1860, 559], [1875, 600], [1874, 834]], haut: 562, bas: 834, saillie: 2.6, flanc: [1726, 718, 1800, 832] },
  ],
  'rangs-frise-b.png': [
    { poly: [[845, 834], [845, 600], [858, 560], [935, 556], [955, 610], [980, 660], [1000, 705], [1008, 834]], haut: 560, bas: 834, saillie: 2.6, flanc: [920, 718, 1000, 832] },
    { poly: [[3168, 834], [3168, 712], [3200, 660], [3222, 610], [3236, 563], [3300, 559], [3322, 600], [3322, 834]], haut: 562, bas: 834, saillie: 1.7, flanc: [3172, 718, 3240, 832] },
  ],
  'rangs-monuments.png': [
    { poly: [[958, 864], [958, 757], [1062, 757], [1062, 864]], haut: 759, bas: 864, saillie: 1.3, flanc: [930, 770, 958, 858] },
  ],
  'villes-objets.png': [
    { poly: [[655, 535], [655, 457], [909, 457], [909, 535]], haut: 459, bas: 534, saillie: 1.1, flanc: [568, 466, 650, 528] },
  ],
};

/** Jettée (étage à colombages qui avance sur le rez-de-chaussée de pierre), toit compris : profondeur constante. */
const jettee = (x0: number, y0: number, x1: number, y1: number, prof = -0.5): Forme => ({ rect: [x0, y0, x1, y1], prof });
/** Bannière pendue, pointe en bas. */
const banniere = (x0: number, x1: number, y0: number, y1: number, pointe: number, prof: number): Forme => ({ poly: [[x0, y0], [x1, y0], [x1, y1], [(x0 + x1) / 2, pointe], [x0, y1]], prof });
/** Fenêtre en arc en retrait (vitrage). */
const fenetre = (x0: number, x1: number, sommet: number, bas: number, prof = 0.1): Forme => ({ arc: [x0, x1, sommet + (x1 - x0) / 2, sommet, bas], prof });

/**
 * Formes de relief de l'essai, par image (elles remplacent celles de `RELIEFS` dans les îlots de l'essai ; les formes
 * d'origine y sont reprises). Relevées sur les images, grille de 25 px.
 */
export const FORMES_ESSAI: Readonly<Record<string, readonly Forme[]>> = {
  // la Grande Cour : la Maison du Tournoi (tour, balcon aux bannières, grande porte) et ses deux ailes à colombages
  'villes-cour-facades.png': [
    // les étages à colombages des deux ailes avancent sur les échoppes de pierre (corbeaux à 700 px)
    jettee(0, 140, 428, 706),
    jettee(1030, 140, 1453, 706),
    // corniche de la tour, piliers d'angle, pilastres de la porte
    { rect: [430, 452, 1030, 492], prof: -0.2 },
    { rect: [428, 470, 456, 1003], prof: -0.28 },
    { rect: [972, 470, 1002, 1003], prof: -0.28 },
    { rect: [584, 640, 612, 1003], prof: -0.16 },
    { rect: [815, 640, 843, 1003], prof: -0.16 },
    // la porte en retrait d'un cran sous son arc mouluré
    { arc: [592, 836, 850, 768, 1003], prof: 0.12 },
    // fenêtres en retrait (tour : trois baies, ailes : trois fenêtres chacune)
    fenetre(547, 601, 505, 604), fenetre(697, 753, 505, 604), fenetre(852, 904, 505, 604),
    { rect: [92, 552, 135, 628], prof: 0.18 }, { rect: [222, 552, 265, 628], prof: 0.18 }, { rect: [310, 552, 352, 628], prof: 0.18 },
    { rect: [1100, 552, 1145, 628], prof: 0.18 }, { rect: [1185, 552, 1230, 628], prof: 0.18 }, { rect: [1290, 552, 1335, 628], prof: 0.18 },
    // le balcon aux bannières, en saillie sur ses corbeaux ; les bannières pendues devant
    { rect: [505, 608, 938, 724], prof: -0.4 },
    banniere(546, 615, 610, 762, 790, -0.5),
    banniere(645, 711, 610, 762, 790, -0.5),
    banniere(739, 808, 610, 762, 790, -0.5),
    banniere(836, 906, 610, 762, 790, -0.5),
    // lanternes sur potences
    { rect: [480, 540, 516, 604], prof: -0.45 }, { rect: [922, 540, 958, 604], prof: -0.45 },
    { rect: [496, 798, 532, 868], prof: -0.45 }, { rect: [912, 798, 948, 868], prof: -0.45 },
    { rect: [12, 818, 48, 880], prof: -0.45 }, { rect: [1404, 806, 1442, 872], prof: -0.45 },
    // reprises des formes d'origine : clocheton, grande porte, échoppes en arcades, auvents (plus profonds, frange comprise)
    ...(RELIEFS['villes-cour-facades.png'] ?? []).slice(0, 11),
    { poly: [[98, 748], [340, 748], [346, 832], [92, 832]], prof: [-0.25, -1.05] },
    { poly: [[1113, 748], [1356, 748], [1362, 812], [1108, 812]], prof: [-0.25, -1.05] },
  ],
  // rangs du fond (les deux côtés de la Grande Cour et d'autres quartiers) : étages qui avancent, auvents, oriel, balcons,
  // portes en retrait ; la remise ouverte et son auvent ; la maison à l'escalier ; la galerie de la maison d'à côté
  'rangs-frise-a.png': [
    jettee(0, 150, 268, 548), jettee(268, 196, 432, 578), jettee(432, 118, 662, 572), jettee(662, 100, 898, 583), jettee(898, 36, 1268, 533),
    { poly: [[15, 558], [258, 558], [262, 642], [12, 642]], prof: [-0.2, -0.95] },
    { rect: [44, 655, 183, 778], prof: 0.3 },
    { rect: [205, 650, 250, 834], prof: 0.3 }, { rect: [333, 655, 411, 834], prof: 0.3 },
    banniere(422, 472, 450, 580, 600, -0.5),
    { poly: [[511, 578], [711, 578], [715, 622], [507, 622]], prof: [-0.2, -0.8] },
    { rect: [505, 640, 711, 778], prof: -0.5 },
    { rect: [505, 505, 583, 545], prof: -0.35 }, { rect: [628, 505, 700, 545], prof: -0.35 },
    { arc: [783, 950, 705, 622, 834], prof: 0.5 },
    { rect: [1039, 467, 1250, 533], prof: -0.6 },
    { rect: [1150, 690, 1215, 834], prof: 0.3 },
    // la remise et son auvent d'ardoise
    { rect: [1288, 553, 1700, 590], prof: -0.5 },
    ...(RELIEFS['rangs-frise-a.png'] ?? []).slice(0, 4),
    // la maison à l'escalier : la porte de l'étage en retrait
    { rect: [1798, 445, 1852, 560], prof: 0.3 },
    // la maison d'à côté : linge pendu, galerie du rez-de-chaussée (poutre, piliers), un mur en retrait et un passage sombre
    { rect: [2070, 326, 2200, 474], prof: -0.4 },
    { rect: [1902, 586, 2112, 834], prof: 0.9 },
    { rect: [2142, 586, 2348, 834], prof: 1.6 },
    { rect: [1895, 568, 2380, 588], prof: -0.25 },
    // la suite de la frise (rangs du fond du Quai) : la maison de pierre et son auvent, la maison aux fleurs, le portail,
    // l'oriel sous son auvent, la bannière, la boutique au store
    jettee(2720, 120, 3000, 560, -0.4), jettee(3260, 130, 3510, 560, -0.4), jettee(3510, 220, 3700, 560, -0.4), jettee(3700, 70, 3989, 548, -0.4),
    { rect: [2360, 320, 2420, 500], prof: -0.5 },
    { poly: [[2538, 500], [2722, 500], [2722, 572], [2538, 572]], prof: [-0.15, -0.8] },
    { rect: [2560, 660, 2622, 834], prof: 0.3 },
    banniere(2638, 2682, 300, 430, 452, -0.45),
    { rect: [2740, 460, 2982, 522], prof: -0.55 },
    { rect: [2760, 690, 2812, 834], prof: 0.3 },
    { arc: [3030, 3200, 690, 610, 834], prof: 0.5 },
    { rect: [3290, 500, 3462, 532], prof: -0.35 },
    { poly: [[3280, 585], [3482, 585], [3486, 626], [3276, 626]], prof: [-0.2, -0.8] },
    { rect: [3300, 640, 3480, 790], prof: -0.45 },
    banniere(3510, 3562, 450, 580, 600, -0.5),
    { rect: [3600, 640, 3662, 834], prof: 0.3 },
    { poly: [[3730, 555], [3962, 555], [3966, 642], [3726, 642]], prof: [-0.2, -0.95] },
    { rect: [3780, 660, 3952, 790], prof: 0.3 },
    { rect: [3700, 680, 3762, 834], prof: 0.3 },
  ],
  // frise B des rangs du fond (le Quai, les flancs de la Grande Cour) : étages qui avancent, galeries et remises, balcons,
  // auvents, oriels, portes et portails en retrait ; les deux maisons à l'escalier (volées en rampes)
  'rangs-frise-b.png': [
    jettee(0, 90, 345, 500, -0.35), jettee(1450, 70, 1720, 545, -0.4), jettee(1720, 120, 1990, 545, -0.4), jettee(1990, 120, 2250, 545, -0.4), jettee(2250, 130, 2720, 545, -0.4), jettee(3800, 120, 3951, 520, -0.4),
    { poly: [[0, 500], [172, 500], [176, 562], [0, 562]], prof: [-0.2, -0.85] },
    { rect: [250, 290, 352, 490], prof: -0.55 },
    { rect: [85, 650, 140, 834], prof: 0.3 },
    // la maison à la galerie : poutre, deux baies en retrait, linge pendu
    { rect: [345, 570, 805, 590], prof: -0.25 },
    { rect: [370, 600, 572, 834], prof: 0.9 },
    { rect: [620, 610, 792, 834], prof: 0.9 },
    { rect: [520, 330, 640, 400], prof: -0.35 },
    // la maison à l'escalier (en miroir) : la porte de l'étage ; la remise et ses vantaux (formes d'origine)
    { rect: [875, 440, 917, 556], prof: 0.3 },
    { rect: [1020, 555, 1450, 595], prof: -0.45 },
    ...(RELIEFS['rangs-frise-b.png'] ?? []).slice(1, 5),
    { rect: [1460, 470, 1702, 522], prof: -0.55 },
    { rect: [1500, 700, 1562, 834], prof: 0.3 },
    { arc: [1770, 1940, 720, 640, 834], prof: 0.5 },
    { rect: [2010, 500, 2232, 542], prof: -0.35 },
    { rect: [2030, 600, 2232, 800], prof: -0.45 },
    banniere(2250, 2292, 450, 570, 592, -0.45),
    { poly: [[2460, 555], [2702, 555], [2706, 640], [2456, 640]], prof: [-0.2, -0.95] },
    { rect: [2470, 650, 2680, 800], prof: 0.3 },
    { rect: [2330, 670, 2392, 834], prof: 0.3 },
    // la remise de la maison de pierre (formes d'origine) et son auvent
    { rect: [2720, 555, 3100, 595], prof: -0.45 },
    ...(RELIEFS['rangs-frise-b.png'] ?? []).slice(5, 8),
    { rect: [2725, 600, 2830, 834], prof: -0.35 },
    // la seconde maison à l'escalier : la porte de l'étage ; la maison à la galerie, son linge, son passage sombre
    { rect: [3268, 440, 3322, 556], prof: 0.3 },
    { rect: [3550, 330, 3680, 410], prof: -0.35 },
    { rect: [3335, 578, 3800, 596], prof: -0.25 },
    { rect: [3342, 600, 3562, 834], prof: 0.9 },
    { rect: [3590, 600, 3800, 834], prof: 1.6 },
    { rect: [3800, 380, 3902, 470], prof: -0.5 },
  ],
  // les monuments des rangs : l'étage à colombages de la Halle et ses bannières ; la maison du Puits (formes d'origine,
  // son perron en rampe) ; la chapelle
  'rangs-monuments.png': [
    jettee(20, 372, 680, 562, -0.4),
    banniere(53, 100, 400, 545, 575, -0.5),
    banniere(593, 647, 400, 545, 575, -0.5),
    ...(RELIEFS['rangs-monuments.png'] ?? []).filter((f) => !('rect' in f && f.rect[0] === 936)),
  ],
};

/** Formes de la carte des profondeurs d'une image dans un îlot de l'essai : celles de l'essai (ou du relief), puis chaque
 *  découpe ramenée au plan du mur (la rampe 3D la remplace ; l'image derrière elle ne glisse plus). */
export function formesVolume(file: string): readonly Forme[] {
  const base = FORMES_ESSAI[file] ?? RELIEFS[file] ?? [];
  return [...base, ...(RAMPES[file] ?? []).map((r): Forme => ({ poly: r.poly, prof: 0 }))];
}

/** Le point est-il dans le polygone (règle pair-impair) ? */
export function dansPoly(x: number, y: number, poly: readonly Pt[]): boolean {
  let dedans = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]!; const [xj, yj] = poly[j]!;
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dedans = !dedans;
  }
  return dedans;
}

/** Flou de boîte séparable, deux passes (≈ gaussien) ; bords répétés. */
export function flou(src: Float32Array, w: number, h: number, r: number): Float32Array {
  if (r < 1) return Float32Array.from(src);
  let a = Float32Array.from(src);
  const b = new Float32Array(src.length);
  const n = 2 * r + 1;
  for (let passe = 0; passe < 2; passe++) {
    for (let y = 0; y < h; y++) {
      const o = y * w;
      let s = 0;
      for (let k = -r; k <= r; k++) s += a[o + Math.min(w - 1, Math.max(0, k))]!;
      for (let x = 0; x < w; x++) {
        b[o + x] = s / n;
        s += a[o + Math.min(w - 1, x + r + 1)]! - a[o + Math.max(0, x - r)]!;
      }
    }
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (let k = -r; k <= r; k++) s += b[Math.min(h - 1, Math.max(0, k)) * w + x]!;
      for (let y = 0; y < h; y++) {
        a[y * w + x] = s / n;
        s += b[Math.min(h - 1, y + r + 1) * w + x]! - b[Math.max(0, y - r) * w + x]!;
      }
    }
  }
  return a;
}

/**
 * Pentes de la carte des profondeurs (m de profondeur par texel), différences centrées : `sx` vers la droite, `sy` vers le
 * HAUT (l'image a ses lignes de haut en bas). La normale du relief (plan de face, +z vers la caméra) en découle :
 * normalize(sx, sy, mètres par texel) ; une saillie (profondeur négative) a ses bords tournés vers l'extérieur.
 */
export function pentes(prof: Float32Array, w: number, h: number): { sx: Float32Array; sy: Float32Array } {
  const sx = new Float32Array(w * h);
  const sy = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const yh = Math.max(0, y - 1); const yb = Math.min(h - 1, y + 1);
    for (let x = 0; x < w; x++) {
      const xg = Math.max(0, x - 1); const xd = Math.min(w - 1, x + 1);
      sx[y * w + x] = (prof[y * w + xd]! - prof[y * w + xg]!) / Math.max(1, xd - xg);
      sy[y * w + x] = (prof[yh * w + x]! - prof[yb * w + x]!) / Math.max(1, yb - yh);
    }
  }
  return { sx, sy };
}

/** Normale du relief (plan de face) pour une pente et une taille de texel (m). */
export function normale(sx: number, sy: number, mpt: number): [number, number, number] {
  const l = Math.hypot(sx, sy, mpt) || 1;
  return [sx / l, sy / l, mpt / l];
}

/** Lumière d'en haut (lanternes hautes, lune) : pente de l'ombre (m de saillie par m de chute), chute maximale (m), fondu,
 *  force ; l'avancée comptée au plus `dh` m (un intérieur profond n'a que la bande du linteau : sa lumière peinte reste). */
export const OMBRAGE = { cot: 0.55, chute: 2.0, douceur: 0.25, force: 0.55, dh: 0.8 } as const;

/**
 * Ombre des saillies (balcons, auvents, étages qui avancent, linteaux) sur ce qui est dessous, la lumière tombant d'en
 * haut : pour chaque texel, ce qui avance plus que lui au-dessus (dans la colonne) l'ombre s'il avance de plus que la
 * chute fois `cot` ; douce, plus faible loin sous la saillie. Renvoie l'éclairage (1 : éclairé, 1 − `force` : à l'ombre).
 */
export function ombrage(prof: Float32Array, w: number, h: number, mpt: number): Float32Array {
  const lit = new Float32Array(w * h).fill(1);
  const pas = Math.max(1, Math.round(0.05 / mpt));
  const n = Math.max(1, Math.ceil(OMBRAGE.chute / (pas * mpt)));
  const fen = n * pas;
  // maximum de la saillie (−profondeur) au-dessus de chaque texel, sur la fenêtre de chute (file monotone par colonne)
  const maxAu = new Float32Array(w * h);
  const file = new Int32Array(h);
  for (let x = 0; x < w; x++) {
    let d = 0; let f = 0;
    for (let y = 0; y < h; y++) {
      while (d < f && file[d]! < y - fen) d++;
      maxAu[y * w + x] = d < f ? -prof[file[d]! * w + x]! : -Infinity;
      const v = -prof[y * w + x]!;
      while (f > d && -prof[file[f - 1]! * w + x]! <= v) f--;
      file[f++] = y;
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const h0 = -prof[i]!;
      if (!(maxAu[i]! - h0 > 0.02)) continue;
      let best = 0;
      for (let s = 1; s <= n; s++) {
        const yy = y - s * pas;
        if (yy < 0) break;
        const chute = s * pas * mpt;
        const occ = Math.min(1, Math.max(0, (Math.min(OMBRAGE.dh, -prof[yy * w + x]! - h0) - chute * OMBRAGE.cot) / OMBRAGE.douceur)) * (1 - chute / OMBRAGE.chute);
        if (occ > best) best = occ;
      }
      lit[i] = 1 - OMBRAGE.force * best;
    }
  }
  return lit;
}

/** Éclairage d'un texel dans le trou laissé par une rampe (le mur dans l'ombre de la volée). */
export const TROU = 0.22;

/** Encodage des pentes dans la carte (octet) : ±0,25 m par texel. */
export const PENTE_MAX = 0.25;
const octet = (v: number) => Math.round(Math.min(255, Math.max(0, v)));

/**
 * Carte de l'essai, RGBA, lignes de BAS en haut (texture WebGL sans retournement) : R la profondeur (encodée comme la
 * carte du relief, `encoder`), G et B les pentes (lissées, `flou`), A l'éclairage des saillies et des trous. `profR` :
 * les octets R de la carte tracée (lignes de haut en bas) ; `mpt` : mètres par texel ; `trou` : 1 dans les découpes.
 */
export function texelsVolume(profR: ArrayLike<number>, w: number, h: number, mpt: number, trou?: ArrayLike<number>): Uint8Array {
  const prof = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) prof[i] = RELIEF_MIN + (profR[i]! / 255) * (RELIEF_MAX - RELIEF_MIN);
  const lisse = flou(prof, w, h, Math.min(8, Math.max(1, Math.round(0.12 / mpt))));
  const { sx, sy } = pentes(lisse, w, h);
  const lit = ombrage(flou(prof, w, h, 1), w, h, mpt);
  const out = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    const o = (h - 1 - y) * w;
    for (let x = 0; x < w; x++) {
      const i = y * w + x; const j = (o + x) * 4;
      out[j] = profR[i]!;
      out[j + 1] = octet(128 + (sx[i]! / PENTE_MAX) * 127);
      out[j + 2] = octet(128 + (sy[i]! / PENTE_MAX) * 127);
      out[j + 3] = octet((trou?.[i] ? Math.min(lit[i]!, TROU) : lit[i]!) * 255);
    }
  }
  return out;
}

/** Morceau d'image d'un plan de face, pour passer des pixels de l'image au monde. */
export interface MorceauPlan {
  /** Taille de l'image (px). */
  size: readonly [number, number];
  /** Morceau (u0, v0, u1, v1, comptés depuis le haut). */
  uv: readonly [number, number, number, number];
  /** Centre en x du plan, y de son pied, z du plan (m), largeur et hauteur (m). */
  x: number; y: number; z: number; w: number; h: number;
}

/** Pixel de l'image → point du plan (m), sans relief. */
export function pointPlan(m: MorceauPlan, px: number, py: number): [number, number, number] {
  const [u0, v0, u1, v1] = m.uv;
  const x = m.x - m.w / 2 + ((px / m.size[0] - u0) / (u1 - u0)) * m.w;
  const y = m.y + (1 - (py / m.size[1] - v0) / (v1 - v0)) * m.h;
  return [x, y, m.z];
}

/** Mètres par pixel de l'image dans ce plan. */
export const metresParPixel = (m: MorceauPlan): number => m.w / ((m.uv[2] - m.uv[0]) * m.size[0]);

/**
 * Pixel de la découpe → point de la rampe (m) : il garde sa place à l'écran vu de face (x, y du plan), mais avance vers la
 * rue de 0 (palier, contre le mur) à `saillie` (marche du bas), linéairement : la volée devient un plan incliné.
 */
export function sommetRampe(m: MorceauPlan, r: Rampe, px: number, py: number): [number, number, number] {
  const [x, y, z] = pointPlan(m, px, py);
  const t = Math.min(1, Math.max(0, (py - r.haut) / (r.bas - r.haut)));
  return [x, y, z + r.saillie * t];
}

/** Bords gauche et droit de la découpe à la ligne `py` (px), ou null. */
export function bordsLigne(poly: readonly Pt[], py: number): [number, number] | null {
  const xs: number[] = [];
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]!; const [xj, yj] = poly[j]!;
    if ((yi > py) !== (yj > py)) xs.push(xi + ((py - yi) * (xj - xi)) / (yj - yi));
  }
  return xs.length >= 2 ? [Math.min(...xs), Math.max(...xs)] : null;
}

/**
 * Flancs de la rampe : sous chaque bord de la volée, du palier à la marche du bas, un rideau vertical jusqu'au sol, en
 * `n` bandes (quads : arête de la rampe en haut, sol en bas). Coordonnées de texture en mètres (le long du flanc, en
 * hauteur), répétées par le nuanceur sur la bande `flanc` de l'image.
 */
export interface ArreteFlanc { haut: [number, number, number]; sol: [number, number, number]; uv: [number, number] }
export function flancsRampe(m: MorceauPlan, r: Rampe, n = 12): { cote: 'gauche' | 'droite'; quads: [ArreteFlanc, ArreteFlanc][] }[] {
  const out: ReturnType<typeof flancsRampe> = [];
  for (const cote of ['gauche', 'droite'] as const) {
    const quads: [ArreteFlanc, ArreteFlanc][] = [];
    let prec: ArreteFlanc | null = null;
    for (let i = 0; i <= n; i++) {
      const py = r.haut + 0.5 + ((r.bas - 0.5 - (r.haut + 0.5)) * i) / n;
      const b = bordsLigne(r.poly, py);
      if (!b) continue;
      const p = sommetRampe(m, r, cote === 'gauche' ? b[0] : b[1], py);
      const cur: ArreteFlanc = { haut: p, sol: [p[0], m.y, p[2]] as [number, number, number], uv: [p[2] - m.z, p[1] - m.y] as [number, number] };
      if (prec) quads.push([prec, cur]);
      prec = cur;
    }
    out.push({ cote, quads });
  }
  return out;
}

/** Une découpe touche-t-elle ce morceau d'image (u0, v0, u1, v1) ? Une rampe n'est posée que si toute sa découpe y est. */
export function rampeDansMorceau(r: Rampe, size: readonly [number, number], uv: readonly [number, number, number, number]): boolean {
  const [x0, y0, x1, y1] = [uv[0] * size[0], uv[1] * size[1], uv[2] * size[0], uv[3] * size[1]];
  return r.poly.every(([x, y]) => x >= x0 - 0.5 && x <= x1 + 0.5 && y >= y0 - 0.5 && y <= y1 + 0.5);
}

/** Plan d'un diorama, vu de l'essai (entrée du manifeste). */
export interface PlanEssai { file: string; size: readonly [number, number]; uv?: readonly [number, number, number, number]; at: readonly [number, number, number]; width: number; orient: string }

/** Morceau d'image d'un plan de face (entrée du manifeste). */
export function morceauDuPlan(p: PlanEssai): MorceauPlan {
  const uv = p.uv ?? [0, 0, 1, 1];
  const h = p.width * (((uv[3] - uv[1]) * p.size[1]) / ((uv[2] - uv[0]) * p.size[0]));
  return { size: p.size, uv, x: p.at[0], y: p.at[1], z: p.at[2], w: p.width, h };
}

/** Rétrécissement de l'emprise d'une rampe sur ses côtés (m) : limons et parapets débordent à peine au sol. */
export const EMPRISE_RETRAIT = 0.1;

/**
 * Emprises au sol des rampes d'un diorama (pur) : une rampe en vrai 3D occupe le sol, du mur à sa marche du bas, sur la
 * largeur du bas de la volée ; ces rectangles deviennent des obstacles de l'îlot (on ne marche plus dans un escalier, et
 * il ne cache plus le personnage qui s'y serait glissé ; rangs profonds aux ruelles de 4 à 7 m).
 */
export function emprisesRampes(plans: readonly PlanEssai[]): { x0: number; z0: number; x1: number; z1: number }[] {
  const out: { x0: number; z0: number; x1: number; z1: number }[] = [];
  for (const p of plans) {
    if (p.orient !== 'face') continue;
    for (const r of RAMPES[p.file] ?? []) {
      if (!rampeDansMorceau(r, p.size, p.uv ?? [0, 0, 1, 1])) continue;
      const m = morceauDuPlan(p);
      const xs = r.poly.map(([x, y]) => sommetRampe(m, r, x, y)[0]);
      out.push({ x0: Math.min(...xs) + EMPRISE_RETRAIT, z0: m.z - 0.05, x1: Math.max(...xs) - EMPRISE_RETRAIT, z1: m.z + r.saillie });
    }
  }
  return out;
}
