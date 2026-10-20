/**
 * M09 V4 — **quartiers en rangs** (passe 65 ; demande du responsable : « je veux que les quartiers soient composés de
 * plusieurs ruelles superposées qui débordent vers des places marchables, donc plus on s'enfonce dans les ruelles plus on
 * découvre de nouveaux spots ; 1er rang, 2e rang, 3e rang, voire un 4e rang ; de manière cohérente et structurée, tout en
 * gardant un décor autour, sur les côtés »). Grammaire PURE (aucun Three.js), commune à tous les quartiers ; conception
 * `docs/M09_QUARTIERS_EN_RANGS.md`, ADR 028.
 *
 * Un quartier vu de face (caméra frontale, ADR 024) est une suite de rangs parallèles à la caméra, du premier plan au fond :
 *   - **rang 1** : la rue du premier plan (quai, parvis, bord du canal), la plus large, avec les portes et les sorties
 *     vers les quartiers voisins ;
 *   - entre deux rangs, une **bande bâtie** (maisons de 6 à 8 m de profondeur) dont on ne voit que la façade avant,
 *     percée de **passages** ; ceux de deux bandes successives ne sont jamais alignés : on longe la ruelle pour trouver
 *     le suivant (la découverte) ;
 *   - **rangs 2 à 4** : des **ruelles** de plus en plus courtes, fermées à leurs bouts par un mur ; chacune peut
 *     **déborder sur une place** : la bande suivante recule sur une largeur donnée, et la place porte le spot du rang
 *     (une halle, un puits, une chapelle) ; le dernier rang est le cœur du quartier ;
 *   - sur les côtés, les façades des bandes continuent au-delà des bouts des ruelles (`decor`), et des **flancs** (les
 *     maisons qui bordent les bouts d'une ruelle, de face, sur sa ligne avant) en font une rue fermée : jamais de vide.
 * Mêmes conventions que les îlots (mètres ; x de l'ouest à l'est ; z vers la caméra, le fond en z négatif).
 */
import type { Ilot, Rect } from './monde';

/** Place d'un rang : la ruelle déborde dans la bande suivante, qui recule de `recul` m sur la largeur [x0, x1]. */
export interface PlaceRang { id: string; nom: string; x0: number; x1: number; recul: number }
/** Ruelle d'un rang 2 à 4 : étendue praticable en x (fermée par un mur à chaque bout), profondeur, place éventuelle. */
export interface RueRang { id: string; nom: string; x0: number; x1: number; profondeur: number; place?: PlaceRang }
/** Bande bâtie entre deux rangs : profondeur (m) et passages (x de début et de fin). */
export interface BandeRang { profondeur: number; passages: readonly (readonly [number, number])[] }

export interface QuartierRangs {
  /** Rang 1 : z du pied des façades (fond de la rue) et du bord avant ; étendue en x (les bornes du quartier). */
  rang1: { zFond: number; zAvant: number; x0: number; x1: number };
  /** `bandes[i]` est derrière le rang i + 1, devant la ruelle `ruelles[i]` (le rang i + 2). */
  bandes: readonly BandeRang[];
  ruelles: readonly RueRang[];
  /** Étendue des façades en x (décor des côtés, au-delà des bouts des ruelles). */
  decor: { x0: number; x1: number };
}

/** Bornes de la grammaire (contrôle) : de 2 à 4 rangs, passages et places à la mesure des personnages. */
export const RANGS = {
  maxRangs: 4,
  bande: [4, 12] as const,
  ruelle: [3, 8] as const,
  passageMin: 2.4,
  placeMin: 6,
  /** Écart minimal entre les axes des passages de deux bandes successives (m) : pas de vue traversante. */
  decalage: 5,
  /** Marge entre un passage et le bout d'une rue (m). */
  marge: 0.5,
} as const;

export interface RangPlan {
  /** 1 pour la rue du premier plan, 2 à 4 pour les ruelles. */
  n: number;
  id: string;
  nom: string;
  x0: number; x1: number; z0: number; z1: number;
  /** Place du rang : rectangle de son recul (devant, la rue elle-même). */
  place?: PlaceRang & { z0: number; z1: number };
}
export interface BandePlan { n: number; z0: number; z1: number; passages: [number, number][] }
/** Morceau de façade vu de face (le fond d'un rang) : z de son pied ; `place` pour le fond d'une place ; `flanc` pour les
 *  maisons des côtés d'une ruelle (sur sa ligne avant, au-delà de ses bouts). */
export interface FacadePlan { rang: number; x0: number; x1: number; z: number; place?: string; flanc?: true }
/** Mur vu de côté : x, longueur en z, côté peint (`est` = tourné vers +x) ; rôle dans la grammaire. */
export interface MurPlan { x: number; z0: number; z1: number; vers: 'est' | 'ouest'; role: 'passage' | 'place' | 'bout'; rang: number }
export interface PlanRangs {
  rangs: RangPlan[];
  bandes: BandePlan[];
  /** Fonds de chaque rang (façade avant de la bande qui suit, ou du fond du quartier), découpés aux passages et aux places. */
  facades: FacadePlan[];
  murs: MurPlan[];
  obstacles: Rect[];
  bounds: Rect;
}

const r3 = (x: number) => Math.round(x * 1000) / 1000;

/** Intervalle [a, b] privé des trous (intervalles), morceaux de plus de 1 cm. */
export function minus(a: number, b: number, holes: readonly (readonly [number, number])[]): [number, number][] {
  let out: [number, number][] = [[a, b]];
  for (const [h0, h1] of holes) {
    const next: [number, number][] = [];
    for (const [s0, s1] of out) {
      if (h1 <= s0 || h0 >= s1) { next.push([s0, s1]); continue; }
      if (h0 > s0) next.push([s0, h0]);
      if (h1 < s1) next.push([h1, s1]);
    }
    out = next;
  }
  return out.filter(([s0, s1]) => s1 - s0 > 0.01);
}

/** Contrôle pur d'un quartier en rangs : liste des écarts (vide si conforme). */
export function checkRangs(q: QuartierRangs): string[] {
  const out: string[] = [];
  const n = q.ruelles.length;
  if (q.bandes.length !== n) out.push(`${q.bandes.length} bandes pour ${n} ruelles (une bande devant chaque ruelle)`);
  if (n < 1 || n + 1 > RANGS.maxRangs) out.push(`${n + 1} rangs (de 2 à ${RANGS.maxRangs})`);
  if (q.decor.x0 > q.rang1.x0 || q.decor.x1 < q.rang1.x1) out.push('décor des côtés plus étroit que le premier rang');
  const rues = [{ id: 'rang 1', x0: q.rang1.x0, x1: q.rang1.x1 }, ...q.ruelles];
  q.bandes.forEach((b, i) => {
    if (b.profondeur < RANGS.bande[0] || b.profondeur > RANGS.bande[1]) out.push(`bande ${i + 1} : ${b.profondeur} m de profondeur (de ${RANGS.bande[0]} à ${RANGS.bande[1]})`);
    if (!b.passages.length) out.push(`bande ${i + 1} : aucun passage (le rang suivant serait inaccessible)`);
    const front = rues[i]!;
    const back = rues[i + 1];
    for (const [a, c] of b.passages) {
      if (c - a < RANGS.passageMin) out.push(`bande ${i + 1} : passage [${a}, ${c}] de moins de ${RANGS.passageMin} m`);
      for (const r of [front, back]) if (r && (a < r.x0 + RANGS.marge || c > r.x1 - RANGS.marge)) out.push(`bande ${i + 1} : passage [${a}, ${c}] hors de ${r.id} [${r.x0}, ${r.x1}]`);
      const place = i > 0 ? q.ruelles[i - 1]?.place : undefined;
      if (place && a < place.x1 && c > place.x0) out.push(`bande ${i + 1} : passage [${a}, ${c}] dans le recul de ${place.id}`);
    }
    const prev = q.bandes[i - 1];
    if (prev) {
      for (const [a, c] of b.passages) for (const [d, e] of prev.passages) {
        if (Math.abs((a + c) / 2 - (d + e) / 2) < RANGS.decalage) out.push(`bandes ${i} et ${i + 1} : passages alignés (axes à moins de ${RANGS.decalage} m)`);
      }
    }
  });
  q.ruelles.forEach((r, i) => {
    if (r.profondeur < RANGS.ruelle[0] || r.profondeur > RANGS.ruelle[1]) out.push(`${r.id} : ${r.profondeur} m de profondeur (de ${RANGS.ruelle[0]} à ${RANGS.ruelle[1]})`);
    if (r.x0 < q.rang1.x0 || r.x1 > q.rang1.x1 || r.x1 - r.x0 < RANGS.placeMin) out.push(`${r.id} : étendue [${r.x0}, ${r.x1}] hors du quartier`);
    const p = r.place;
    if (!p) return;
    if (p.x0 < r.x0 || p.x1 > r.x1 || p.x1 - p.x0 < RANGS.placeMin) out.push(`${p.id} : largeur [${p.x0}, ${p.x1}] hors de ${r.id} ou de moins de ${RANGS.placeMin} m`);
    const behind = q.bandes[i + 1];
    if (behind && (p.recul <= 0 || p.recul > behind.profondeur - 1)) out.push(`${p.id} : recul de ${p.recul} m (de 0 à ${behind.profondeur - 1} m, la bande qui suit garde une façade)`);
    if (!behind && (p.recul <= 0 || p.recul > 12)) out.push(`${p.id} : recul de ${p.recul} m (de 0 à 12 m au fond du quartier)`);
  });
  return out;
}

/**
 * Plan d'un quartier en rangs (pur ; le contrôle `checkRangs` d'abord) : rues de chaque rang et leurs places, bandes et
 * passages, façades vues de face (fond de chaque rang, découpé aux passages et aux places), murs vus de côté (passages,
 * côtés des places, bouts des ruelles), obstacles et bornes du plan où l'on marche.
 */
export function planRangs(q: QuartierRangs): PlanRangs {
  const rangs: RangPlan[] = [{ n: 1, id: 'rang-1', nom: 'rang 1', x0: q.rang1.x0, x1: q.rang1.x1, z0: q.rang1.zFond, z1: q.rang1.zAvant }];
  const bandes: BandePlan[] = [];
  let z = q.rang1.zFond;
  q.bandes.forEach((b, i) => {
    bandes.push({ n: i + 1, z0: r3(z - b.profondeur), z1: z, passages: b.passages.map(([a, c]) => [a, c]) });
    z = r3(z - b.profondeur);
    const r = q.ruelles[i]!;
    const rz0 = r3(z - r.profondeur);
    rangs.push({ n: i + 2, id: r.id, nom: r.nom, x0: r.x0, x1: r.x1, z0: rz0, z1: z, ...(r.place ? { place: { ...r.place, z0: r3(rz0 - r.place.recul), z1: rz0 } } : {}) });
    z = rz0;
  });
  const last = rangs[rangs.length - 1]!;
  const zMin = last.place ? last.place.z0 : last.z0;
  const bounds: Rect = { x0: q.rang1.x0, z0: zMin, x1: q.rang1.x1, z1: q.rang1.zAvant };
  const facades: FacadePlan[] = [];
  const murs: MurPlan[] = [];
  const obstacles: Rect[] = [];
  const holeOf = (r: RangPlan) => (r.place ? [[r.place.x0, r.place.x1] as const] : []);
  rangs.forEach((r, i) => {
    // fond du rang : la façade avant de la bande qui suit (ou du fond du quartier), découpée aux passages et à la place
    const behind = bandes[i];
    const pass = behind ? behind.passages : [];
    for (const [a, c] of minus(q.decor.x0, q.decor.x1, [...pass, ...holeOf(r)])) facades.push({ rang: r.n, x0: a, x1: c, z: r.z0 });
    if (r.place) {
      facades.push({ rang: r.n, x0: r.place.x0, x1: r.place.x1, z: r.place.z0, place: r.place.id });
      murs.push({ x: r.place.x0, z0: r.place.z0, z1: r.place.z1, vers: 'est', role: 'place', rang: r.n });
      murs.push({ x: r.place.x1, z0: r.place.z0, z1: r.place.z1, vers: 'ouest', role: 'place', rang: r.n });
    }
    if (r.n > 1) {
      // flancs : au-delà des bouts de la ruelle, les maisons des côtés, de face sur sa ligne avant
      for (const [a, c] of minus(q.decor.x0, q.decor.x1, [[r.x0, r.x1]])) facades.push({ rang: r.n, x0: a, x1: c, z: r.z1, flanc: true });
      // bouts de la ruelle : fermés par un mur, le décor continue au-delà (obstacles jusqu'aux bornes)
      murs.push({ x: r.x0, z0: r.z0, z1: r.z1, vers: 'est', role: 'bout', rang: r.n });
      murs.push({ x: r.x1, z0: r.z0, z1: r.z1, vers: 'ouest', role: 'bout', rang: r.n });
      if (r.x0 > bounds.x0) obstacles.push({ x0: bounds.x0, z0: r.z0, x1: r.x0, z1: r.z1 });
      if (r.x1 < bounds.x1) obstacles.push({ x0: r.x1, z0: r.z0, x1: bounds.x1, z1: r.z1 });
    }
    // la bande derrière le rang : blocs entre les passages, moins le recul de la place (qui garde sa façade au fond)
    const zb0 = behind ? behind.z0 : zMin;
    for (const [a, c] of minus(bounds.x0, bounds.x1, [...pass, ...holeOf(r)])) if (r.z0 - zb0 > 0.01) obstacles.push({ x0: a, z0: zb0, x1: c, z1: r.z0 });
    if (r.place && r.place.z0 - zb0 > 0.01) obstacles.push({ x0: r.place.x0, z0: zb0, x1: r.place.x1, z1: r.place.z0 });
    if (behind) for (const [a, c] of behind.passages) {
      murs.push({ x: a, z0: behind.z0, z1: behind.z1, vers: 'est', role: 'passage', rang: r.n });
      murs.push({ x: c, z0: behind.z0, z1: behind.z1, vers: 'ouest', role: 'passage', rang: r.n });
    }
  });
  return { rangs, bandes, facades, murs, obstacles, bounds };
}

/** Rang (1 à 4) où se trouve un point du plan, ou 0 hors des rues (dans un passage, une place compte pour son rang). */
export function rangAt(plan: PlanRangs, p: { x: number; z: number }): number {
  for (const r of plan.rangs) {
    if (p.x >= r.x0 && p.x <= r.x1 && p.z >= r.z0 && p.z <= r.z1) return r.n;
    const pl = r.place;
    if (pl && p.x >= pl.x0 && p.x <= pl.x1 && p.z >= pl.z0 && p.z <= pl.z1) return r.n;
  }
  return 0;
}

/** Îlot d'un quartier en rangs : le plan de la grammaire, plus ce que l'îlot pose lui-même (accessoires, personnages). */
export function ilotRangs(plan: PlanRangs, base: Omit<Ilot, 'bounds'>): Ilot {
  return { ...base, bounds: plan.bounds, rects: [...plan.obstacles, ...base.rects] };
}

/**
 * Balise d'un passage (passe 67, demande du responsable : « des effets visuels indicatifs pour les chemins ruelles qui
 * permettent d'aller et revenir vers chaque rang ») : une lueur au sol à chaque bouche d'un passage, des chevrons qui
 * filent vers le rang où il mène (`sens` −1 : vers le fond, +1 : vers l'avant), et le nom de ce rang (zone « info »).
 */
export interface Balise { id: string; x: number; z: number; largeur: number; sens: -1 | 1; vers: number; label: string }

const capital = (s: string) => s[0]!.toUpperCase() + s.slice(1);

/** Balises de tous les passages : à l'avant (vers le rang suivant) et à l'arrière (retour au rang précédent). */
export function balisesRangs(plan: PlanRangs, nomRang1: string): Balise[] {
  const nom = (n: number) => (n === 1 ? nomRang1 : plan.rangs[n - 1]!.nom);
  return plan.bandes.flatMap((b) => b.passages.flatMap(([a, c], i): Balise[] => [
    { id: `balise-${b.n}-${i + 1}-avant`, x: r3((a + c) / 2), z: r3(b.z1 + 0.9), largeur: r3(c - a), sens: -1, vers: b.n + 1, label: `${capital(`vers ${nom(b.n + 1)}`)}` },
    { id: `balise-${b.n}-${i + 1}-retour`, x: r3((a + c) / 2), z: r3(b.z0 - 0.9), largeur: r3(c - a), sens: 1, vers: b.n, label: `Retour vers ${nom(b.n)}` },
  ]));
}
