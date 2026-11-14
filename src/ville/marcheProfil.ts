/**
 * Marche de profil du protagoniste en huit temps (décision du responsable du 2026-11-13, T4 : « par code d'abord »).
 * Constat (`docs/RETOURS_TEST_2026-11-13.md`) : les quatre temps de profil de toutes les feuilles `player*` sont des
 * foulées ouvertes ; aucune vraie pose de passage, la marche paraît glissée.
 *
 * Ici, au chargement et en mémoire seulement (aucune image modifiée, aucune approbation touchée) : un cycle complet de
 * huit temps, contact, appui, passage, élan, puis la même chose de l'autre jambe.
 *  - Le haut du corps (tête, buste, bras, besace, manteau) est repris de la feuille : les deux foulées aux bras opposés
 *    (la besace en arrière, puis en avant) donnent les bras en opposition des jambes ; au passage, le repos (bras le long
 *    du corps). Les jambes d'origine sont retirées (sous l'ourlet, et le pantalon vu par l'ouverture du manteau).
 *  - Les jambes et les bottes sont redessinées par code, avec la palette de la feuille (pantalon, bottes, trait) : hanche,
 *    genou et cheville, le genou plié vers l'avant ; la jambe lointaine plus sombre, dessinée d'abord.
 *  - Le corps monte et descend d'un pixel d'art (bas à l'appui, haut à l'élan).
 *  - Le pied d'appui recule exactement d'un quart de pas à chaque temps : un cycle vaut deux pas, la foulée annoncée au
 *    monde (`pas`) est celle des pieds dessinés, et les pieds ne glissent pas.
 * Fonctions pures, sur des pixels RGBA d'une case en pixels d'art, lignes de haut en bas, profil tourné vers la droite.
 */
import { estManteau } from './passage';

/** Nombre de temps du cycle de profil. */
export const TEMPS_PROFIL = 8;

export interface Case { px: Uint8ClampedArray | Uint8Array; w: number; h: number }
type Rgba = readonly [number, number, number, number];

/** Géométrie de la figure (pixels d'art) : `sol` dernière ligne des pieds, `ancreX` colonne des pieds au repos. */
export interface FigureProfil { sol: number; ancreX: number; figureH: number }

/** Palette des jambes tirée de la feuille : pantalon, bottes (proche et lointaine), trait. */
export interface PaletteJambes { pant: Rgba; pantOmbre: Rgba; botte: Rgba; botteOmbre: Rgba; trait: Rgba }

/** Le temps d'une jambe : cheville à plat (décalage depuis la hanche, levée du pied) et angle du pied (pivot). */
interface TempsJambe { dx: number; leve: number; angle: number; pivot: 'talon' | 'pointe' | 'cheville' }

/**
 * Le cycle d'une jambe, en fractions du pas `E` : appui de 0 à 4 (contact sur le talon, appui à plat, passage sous la
 * hanche, élan sur la pointe, la pointe qui quitte le sol), puis la jambe qui revient en l'air (5 à 7). L'autre jambe
 * suit le même cycle décalé de quatre temps. Le point d'appui (talon, pied à plat, pointe) recule de E/4 par temps.
 */
const CYCLE: readonly ((E: number) => TempsJambe)[] = [
  (E) => ({ dx: E / 2, leve: 0, angle: 14, pivot: 'talon' }),
  (E) => ({ dx: E / 4, leve: 0, angle: 0, pivot: 'cheville' }),
  () => ({ dx: 0, leve: 0, angle: 0, pivot: 'cheville' }),
  (E) => ({ dx: -E / 4, leve: 0, angle: -20, pivot: 'pointe' }),
  (E) => ({ dx: -E / 2, leve: 0, angle: -34, pivot: 'pointe' }),
  (E) => ({ dx: -E / 8, leve: 4, angle: -24, pivot: 'cheville' }),
  (E) => ({ dx: E / 6, leve: 3, angle: -6, pivot: 'cheville' }),
  (E) => ({ dx: E / 2 - 1, leve: 1, angle: 8, pivot: 'cheville' }),
];

/** Le corps monte et descend (pixels d'art, vers le bas) : bas à l'appui, haut à l'élan. */
export const BALANCEMENT: readonly number[] = [0, 1, 0, -1, 0, 1, 0, -1];

/** Pied (repère de la cheville, x vers l'avant, y vers le bas) : talon 3 px derrière, pointe 8 px devant, semelle à `h`. */
const PIED = { talon: -3, pointe: 8, h: 4 };

/**
 * Le pas (pixels d'art, du pied avant au pied arrière, au contact), multiple de 4 pour des appuis entiers : environ
 * l'écart des foulées d'origine des feuilles (27 à 31 px d'art pour une figure de 91), pour que la cadence de la marche
 * reste celle d'avant à la même vitesse.
 */
export function pasDe(figureH: number): number {
  return 4 * Math.max(5, Math.round(figureH * 0.077));
}

/** La hanche (ligne, pixels d'art) : un peu au-dessus du milieu de la figure, cachée sous le manteau. */
export function hancheDe(f: FigureProfil): number {
  return f.sol - Math.round(f.figureH * 0.38);
}

const idx = (c: Case, x: number, y: number) => (y * c.w + x) * 4;
const opaque = (c: Case, x: number, y: number) => x >= 0 && y >= 0 && x < c.w && y < c.h && c.px[idx(c, x, y) + 3]! > 128;
const rgb = (c: Case, x: number, y: number): [number, number, number] => { const i = idx(c, x, y); return [c.px[i]!, c.px[i + 1]!, c.px[i + 2]!]; };
const manteau = (c: Case, x: number, y: number) => opaque(c, x, y) && estManteau(...rgb(c, x, y));
const bleu = (r: number, g: number, b: number) => b > r + 25 && b >= g;
const sombre = (r: number, g: number, b: number) => r + g + b < 90;
const brun = (r: number, g: number, b: number) => r > b + 10 && r >= g && r + g + b >= 60 && r + g + b < 330 && !estManteau(r, g, b);

/**
 * Le haut du corps d'un temps de la feuille : ses jambes retirées (tout ce qui est sous l'ourlet du manteau, colonne par
 * colonne, le trait sombre de l'ourlet gardé ; le pantalon vu par l'ouverture du manteau et son trait extérieur). Rend la
 * copie et les pixels retirés (pour la palette).
 */
export function hautDuCorps(c: Case, sol: number, hanche: number): { haut: Case; retires: Rgba[] } {
  const haut: Case = { px: c.px.slice(), w: c.w, h: c.h };
  const retire = new Uint8Array(c.w * c.h);
  const bas = Array.from({ length: c.w }, (_, x) => { let l = -1; for (let y = 0; y <= sol; y++) if (manteau(c, x, y)) l = y; return l; });
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    if (!opaque(c, x, y)) continue;
    const [r, g, b] = rgb(c, x, y);
    // jamais au-dessus de la hanche (une mèche claire ou la peau du visage comptent comme « manteau » dans leur colonne)
    const sous = y >= hanche - 4 && (bas[x]! >= 0 ? y > bas[x]! && !(y - bas[x]! <= 1 && sombre(r, g, b)) : true);
    if (sous || (y >= hanche - 6 && bleu(r, g, b))) retire[y * c.w + x] = 1;
  }
  // le trait extérieur du pantalon retiré (sombre, voisin d'un pixel retiré, et d'aucun pixel du manteau)
  for (let passe = 0; passe < 2; passe++) {
    const marques: number[] = [];
    for (let y = Math.max(0, hanche - 6); y < c.h; y++) for (let x = 0; x < c.w; x++) {
      if (retire[y * c.w + x] || !opaque(c, x, y) || !sombre(...rgb(c, x, y))) continue;
      const v = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;
      const pres = v.some(([dx, dy]) => x + dx >= 0 && x + dx < c.w && y + dy >= 0 && y + dy < c.h && retire[(y + dy) * c.w + x + dx]);
      const tenu = v.some(([dx, dy]) => manteau(c, x + dx, y + dy));
      if (pres && !tenu) marques.push(y * c.w + x);
    }
    for (const m of marques) retire[m] = 1;
  }
  const retires: Rgba[] = [];
  for (let k = 0; k < retire.length; k++) {
    if (!retire[k]) continue;
    const i = k * 4;
    retires.push([c.px[i]!, c.px[i + 1]!, c.px[i + 2]!, c.px[i + 3]!]);
    haut.px.fill(0, i, i + 4);
  }
  return { haut, retires };
}

/** Palette des jambes : les couleurs les plus fréquentes des jambes retirées (pantalon bleu, bottes brunes, trait sombre). */
export function paletteJambes(pixels: readonly Rgba[]): PaletteJambes {
  const compte = (f: (r: number, g: number, b: number) => boolean) => {
    const m = new Map<string, { c: Rgba; n: number }>();
    for (const p of pixels) if (f(p[0], p[1], p[2])) { const k = `${p[0]},${p[1]},${p[2]}`; const e = m.get(k); if (e) e.n++; else m.set(k, { c: [p[0], p[1], p[2], 255], n: 1 }); }
    return [...m.values()].sort((a, b) => b.n - a.n);
  };
  const lum = (c: Rgba) => c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11;
  const ombre = (c: Rgba, k: number): Rgba => [Math.round(c[0] * k), Math.round(c[1] * k), Math.round(c[2] * k), 255];
  const bleus = compte(bleu);
  const bruns = compte(brun);
  const traits = compte(sombre);
  const pant = bleus[0]?.c ?? [21, 49, 110, 255];
  // l'ombre : la teinte bleue fréquente la plus sombre, sinon le pantalon assombri
  const total = bleus.reduce((s, x) => s + x.n, 0);
  const pantOmbre = bleus.filter((x) => x.n >= total * 0.06 && lum(x.c) < lum(pant) - 6).sort((a, b) => lum(a.c) - lum(b.c))[0]?.c ?? ombre(pant, 0.62);
  // les bottes : parmi les trois bruns les plus fréquents, le plus clair (la botte proche) et le plus sombre (la lointaine)
  const tete = bruns.slice(0, 3).map((x) => x.c).sort((a, b) => lum(b) - lum(a));
  const botte = tete[0] ?? [73, 47, 23, 255];
  const botteOmbre = tete.length > 1 && lum(tete.at(-1)!) < lum(botte) - 6 ? tete.at(-1)! : ombre(botte, 0.66);
  const trait = traits[0]?.c ?? [2, 2, 2, 255];
  return { pant, pantOmbre: lum(pantOmbre) < 8 ? ombre(pant, 0.62) : pantOmbre, botte, botteOmbre: lum(botteOmbre) < 8 ? ombre(botte, 0.66) : botteOmbre, trait };
}

/** Position de la besace (moyenne des x des pixels bruns du buste) : plus petite, la besace est en arrière. */
export function besaceX(c: Case, sol: number, hanche: number): number | null {
  let s = 0;
  let n = 0;
  for (let y = Math.max(0, hanche - 16); y <= Math.min(c.h - 1, sol - 14); y++) for (let x = 0; x < c.w; x++) {
    if (opaque(c, x, y) && brun(...rgb(c, x, y))) { s += x; n++; }
  }
  return n >= 6 ? s / n : null;
}

// ---------------------------------------------------------------------------
// Dessin des jambes

type Pt = { x: number; y: number };
const sub = (a: Pt, b: Pt): Pt => ({ x: a.x - b.x, y: a.y - b.y });
const len = (a: Pt) => Math.hypot(a.x, a.y);
const rot = (p: Pt, o: Pt, deg: number): Pt => {
  // angle positif : la pointe se relève (sens anti-horaire à l'écran, y vers le bas)
  const a = (-deg * Math.PI) / 180;
  const d = sub(p, o);
  return { x: o.x + d.x * Math.cos(a) - d.y * Math.sin(a), y: o.y + d.x * Math.sin(a) + d.y * Math.cos(a) };
};

function distSeg(p: Pt, a: Pt, b: Pt): number {
  const ab = sub(b, a);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * ab.x + (p.y - a.y) * ab.y) / Math.max(1e-6, ab.x * ab.x + ab.y * ab.y)));
  return Math.hypot(p.x - (a.x + ab.x * t), p.y - (a.y + ab.y * t));
}

function dansPolygone(p: Pt, poly: readonly Pt[]): boolean {
  let dedans = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!;
    const b = poly[j]!;
    if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) dedans = !dedans;
  }
  return dedans;
}

/** Une jambe posée : hanche, genou, cheville, et le pied (polygone). */
export interface JambePosee { hanche: Pt; genou: Pt; cheville: Pt; pied: Pt[] }

/**
 * Pose une jambe : cheville du temps (à plat, puis le pied tourné autour de son pivot), genou trouvé à longueurs égales
 * (cuisse, tibia), plié vers l'avant ; une cheville hors d'atteinte est ramenée sur la droite hanche-cheville.
 */
export function poserJambe(hanche: Pt, t: TempsJambe, sol: number, longueur: number): JambePosee {
  const plate: Pt = { x: hanche.x + t.dx, y: sol - PIED.h - t.leve };
  const pivotLocal = t.pivot === 'talon' ? { x: PIED.talon, y: PIED.h } : t.pivot === 'pointe' ? { x: PIED.pointe, y: PIED.h } : { x: 0, y: 0 };
  const o = { x: plate.x + pivotLocal.x, y: plate.y + pivotLocal.y };
  // tige et cou-de-pied, puis la pointe arrondie, la semelle à plat
  const local: Pt[] = [{ x: PIED.talon, y: -1.5 }, { x: 1.5, y: -1.5 }, { x: 4.5, y: 0.6 }, { x: 6.8, y: 1.4 }, { x: PIED.pointe, y: 2.4 }, { x: PIED.pointe, y: PIED.h }, { x: PIED.talon + 0.4, y: PIED.h }, { x: PIED.talon, y: PIED.h - 0.6 }];
  const pied = local.map((p) => rot({ x: plate.x + p.x, y: plate.y + p.y }, o, t.angle));
  let cheville = rot(plate, o, t.angle);
  const l = longueur / 2;
  let d = len(sub(cheville, hanche));
  if (d > 2 * l - 0.05) {
    const k = (2 * l - 0.05) / d;
    const dc = { x: (cheville.x - hanche.x) * k, y: (cheville.y - hanche.y) * k };
    const decale = sub({ x: hanche.x + dc.x, y: hanche.y + dc.y }, cheville);
    cheville = { x: cheville.x + decale.x, y: cheville.y + decale.y };
    for (const p of pied) { p.x += decale.x; p.y += decale.y; }
    d = 2 * l - 0.05;
  }
  const v = { x: (cheville.x - hanche.x) / d, y: (cheville.y - hanche.y) / d };
  const h = Math.sqrt(Math.max(0, l * l - (d / 2) * (d / 2)));
  // perpendiculaire tournée vers l'avant (x croissant) : le genou plie vers l'avant
  const genou = { x: (hanche.x + cheville.x) / 2 + h * v.y, y: (hanche.y + cheville.y) / 2 - h * v.x };
  return { hanche, genou, cheville, pied };
}

/** Pixels d'une jambe (pantalon, botte), en masque sur la case. */
function masqueJambe(j: JambePosee, w: number, h: number): { pant: Uint8Array; botte: Uint8Array } {
  const pant = new Uint8Array(w * h);
  const botte = new Uint8Array(w * h);
  // tige de la botte : de la cheville, 5 px le long du tibia
  const tib = sub(j.genou, j.cheville);
  const lt = Math.max(1e-6, len(tib));
  const haut = { x: j.cheville.x + (tib.x / lt) * 5, y: j.cheville.y + (tib.y / lt) * 5 };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = { x: x + 0.5, y: y + 0.5 };
    const k = y * w + x;
    if (dansPolygone(p, j.pied) || distSeg(p, j.cheville, haut) <= 2.7) botte[k] = 1;
    else if (distSeg(p, j.hanche, j.genou) <= 3.1 || distSeg(p, j.genou, j.cheville) <= 2.6) pant[k] = 1;
  }
  return { pant, botte };
}

/** Peint une jambe (pantalon, botte, puis le trait tout autour) sur la case. */
function peindreJambe(c: Case, j: JambePosee, pantC: Rgba, botteC: Rgba, trait: Rgba): void {
  const { pant, botte } = masqueJambe(j, c.w, c.h);
  const dans = (x: number, y: number) => x >= 0 && y >= 0 && x < c.w && y < c.h && (pant[y * c.w + x] || botte[y * c.w + x]);
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    const k = y * c.w + x;
    if (pant[k]) c.px.set(pantC, k * 4);
    else if (botte[k]) c.px.set(botteC, k * 4);
    else if (dans(x + 1, y) || dans(x - 1, y) || dans(x, y + 1) || dans(x, y - 1)) c.px.set(trait, k * 4);
  }
  // la limite du pantalon et de la botte (le haut de la tige) marquée d'un trait
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    const k = y * c.w + x;
    if (botte[k] && y > 0 && pant[k - c.w]) c.px.set(trait, k * 4);
  }
}

/** Pose un calque (pixels opaques) sur la case, décalé de `dy` lignes. */
function poserCalque(c: Case, calque: Case, dy: number): void {
  for (let y = 0; y < c.h; y++) {
    const sy = y - dy;
    if (sy < 0 || sy >= calque.h) continue;
    for (let x = 0; x < c.w; x++) {
      const i = (sy * calque.w + x) * 4;
      if (calque.px[i + 3]! > 128) c.px.set(calque.px.subarray(i, i + 4), (y * c.w + x) * 4);
    }
  }
}

export interface CycleProfil {
  /** Les huit temps (pixels d'art, même taille que la case), dans l'ordre du cycle. */
  temps: Case[];
  /** Le pas dessiné (pixels d'art) : un cycle vaut deux pas. */
  pas: number;
  /** La jambe proche est devant au premier temps ; colonnes de la feuille reprises pour le haut du corps. */
  hauts: { arriere: number; avant: number; repos: number };
}

/**
 * Le cycle de huit temps d'une feuille : `cases` sont les cinq cases de sa rangée de profil (repos puis les quatre temps
 * de marche), `marche` les colonnes des deux foulées aux bras opposés (le plan du manifeste), `bras` : `trois` reprend le
 * repos au passage (bras le long du corps), `deux` garde les foulées.
 */
export function cycleProfil8(cases: readonly Case[], f: FigureProfil, marche: readonly number[], bras: 'trois' | 'deux' = 'trois'): CycleProfil {
  const hanche = hancheDe(f);
  const hauts = cases.map((c) => hautDuCorps(c, f.sol, hanche));
  const palette = paletteJambes(hauts.slice(1).flatMap((h) => h.retires));
  // les bras en opposition des jambes : la jambe proche devant, son bras (et la besace) en arrière
  const cols = [...new Set(marche.filter((m) => m >= 1 && m < cases.length))];
  const xs = cols.map((m) => ({ m, x: besaceX(cases[m]!, f.sol, hanche) }));
  const mesures = xs.filter((e) => e.x !== null) as { m: number; x: number }[];
  const [arriere, avant] = mesures.length >= 2
    ? [mesures.reduce((a, b) => (b.x < a.x ? b : a)).m, mesures.reduce((a, b) => (b.x > a.x ? b : a)).m]
    : [cols[0] ?? 1, cols[1] ?? cols[0] ?? 1];
  const E = pasDe(f.figureH);
  const poses = posesProfil(f);
  const haut = (k: number) => (bras === 'trois' && (k === 2 || k === 6) ? 0 : k === 7 || k <= 2 ? arriere : avant);
  const temps = Array.from({ length: TEMPS_PROFIL }, (_, k) => {
    const c: Case = { px: new Uint8ClampedArray(cases[0]!.w * cases[0]!.h * 4), w: cases[0]!.w, h: cases[0]!.h };
    const b = BALANCEMENT[k]!;
    const { proche, loin } = poses[k]!;
    peindreJambe(c, loin, palette.pantOmbre, palette.botteOmbre, palette.trait);
    peindreJambe(c, proche, palette.pant, palette.botte, palette.trait);
    poserCalque(c, hauts[haut(k)]!.haut, b);
    return c;
  });
  return { temps, pas: E, hauts: { arriere, avant, repos: 0 } };
}

/**
 * Les jambes posées des huit temps (proche, lointaine, un pixel derrière) : la hanche à l'aplomb des pieds au repos,
 * balancée ; la longueur de jambe atteint juste la cheville du contact (genou presque tendu), le genou plie ailleurs.
 */
export function posesProfil(f: FigureProfil): Array<{ proche: JambePosee; loin: JambePosee }> {
  const hanche = hancheDe(f);
  const E = pasDe(f.figureH);
  const longueur = Math.hypot(E / 2, f.sol - PIED.h - hanche) + 0.6;
  return Array.from({ length: TEMPS_PROFIL }, (_, k) => {
    const H = { x: f.ancreX + 0.5, y: hanche + BALANCEMENT[k]! };
    return { proche: poserJambe(H, CYCLE[k]!(E), f.sol, longueur), loin: poserJambe({ x: H.x - 1, y: H.y }, CYCLE[(k + 4) % 8]!(E), f.sol, longueur) };
  });
}

/** Sommets du pied qui portent : la pointe (index 5) et le talon (index 6) de la semelle. */
export const POINTE = 5;
export const TALON = 6;

/** Position du pied d'appui (pixels d'art, depuis la hanche) de la jambe proche à chaque temps (contrôle : il ne glisse pas). */
export function appuisProche(figureH: number): Array<number | null> {
  const E = pasDe(figureH);
  return CYCLE.map((t, k) => (k <= 4 ? t(E).dx : null));
}
