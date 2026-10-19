/**
 * M09 — logique PURE de la ville d'exploration (aucun Three.js, aucun DOM, aucun temps réel) : un îlot est un plan de
 * sol (x, z en mètres, +z vers le quai et l'eau), des obstacles (rectangles alignés, disques), des zones nommées
 * (portes, sorties, PNJ, informations). Le personnage est un disque qui se déplace sur ce plan ; les collisions
 * glissent le long des murs (résolution axe par axe). Déterministe : mêmes entrées, même trajectoire (tests).
 */

export interface Vec2 { x: number; z: number }
/** Rectangle aligné sur les axes, coins (x0, z0) – (x1, z1), x0 < x1, z0 < z1. */
export interface Rect { x0: number; z0: number; x1: number; z1: number }
export interface Disc { x: number; z: number; r: number }

export type ZoneKind = 'porte' | 'sortie' | 'parler' | 'info';

export interface Zone {
  id: string;
  kind: ZoneKind;
  /** Libellé de l'action proposée (« Entrer au Fanal », « Parler à Nora »). */
  label: string;
  /** Forme au sol : un rectangle, ou un disque (autour d'un PNJ). */
  area: Rect | Disc;
  /** Cible de l'action (identifiant de rencontre, d'îlot, de PNJ…) : lue par le produit, jamais par la logique. */
  target?: string;
}

export interface Ilot {
  id: string;
  name: string;
  /** Zone praticable (le personnage n'en sort pas). */
  bounds: Rect;
  rects: readonly Rect[];
  discs: readonly Disc[];
  zones: readonly Zone[];
  /** Points d'apparition nommés (arrivée, devant une porte, devant un PNJ). */
  spawns: Readonly<Record<string, Vec2 & { face?: Facing }>>;
}

export type Facing = 'face' | 'dos' | 'gauche' | 'droite';

export interface Walker {
  pos: Vec2;
  /** Vitesse courante (m/s), lissée. */
  vel: Vec2;
  facing: Facing;
  /** Phase du cycle de marche (0..1), avance avec la distance parcourue. */
  phase: number;
  moving: boolean;
}

export interface MoveInput {
  /** Direction voulue (clavier), composantes −1..1 ; normalisée si plus longue que 1. */
  dir: Vec2;
  /** Marche lente (Maj). */
  slow?: boolean;
  /** Destination (clic au sol) : utilisée si `dir` est nulle. */
  target?: Vec2 | null;
}

export const WALKER_RADIUS = 0.3;
export const RUN_SPEED = 3.2;
export const WALK_SPEED = 1.6;
/** Distance d'une foulée complète (deux pas) pour la phase du cycle de marche. */
export const STRIDE = 1.5;
/** Constante de temps du lissage de la vitesse (s). */
const ACCEL_TAU = 0.08;
/** Arrivé à destination en deçà de cette distance (m). */
export const ARRIVE = 0.08;

export function newWalker(at: Vec2, facing: Facing = 'face'): Walker {
  return { pos: { x: at.x, z: at.z }, vel: { x: 0, z: 0 }, facing, phase: 0, moving: false };
}

const isDisc = (a: Rect | Disc): a is Disc => 'r' in a;

/** Vrai si le point est dans la zone (rectangle ou disque). */
export function inArea(p: Vec2, a: Rect | Disc): boolean {
  if (isDisc(a)) return (p.x - a.x) ** 2 + (p.z - a.z) ** 2 <= a.r * a.r;
  return p.x >= a.x0 && p.x <= a.x1 && p.z >= a.z0 && p.z <= a.z1;
}

/** Vrai si un disque (centre p, rayon r) chevauche un obstacle de l'îlot ou sort de sa zone praticable. */
export function blocked(ilot: Ilot, p: Vec2, r = WALKER_RADIUS): boolean {
  const b = ilot.bounds;
  if (p.x - r < b.x0 || p.x + r > b.x1 || p.z - r < b.z0 || p.z + r > b.z1) return true;
  for (const q of ilot.rects) {
    const cx = Math.max(q.x0, Math.min(p.x, q.x1));
    const cz = Math.max(q.z0, Math.min(p.z, q.z1));
    if ((p.x - cx) ** 2 + (p.z - cz) ** 2 < r * r) return true;
  }
  for (const d of ilot.discs) if ((p.x - d.x) ** 2 + (p.z - d.z) ** 2 < (r + d.r) ** 2) return true;
  return false;
}

/**
 * Déplace le disque de `from` de (dx, dz) en glissant : on tente le mouvement complet, puis chaque axe seul, par
 * sous-pas de 5 cm au plus (aucun obstacle n'est traversé, même à grande vitesse). Renvoie la position atteinte.
 */
export function slide(ilot: Ilot, from: Vec2, dx: number, dz: number, r = WALKER_RADIUS): Vec2 {
  const n = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.05));
  let p = { x: from.x, z: from.z };
  for (let i = 0; i < n; i++) {
    const sx = dx / n;
    const sz = dz / n;
    const both = { x: p.x + sx, z: p.z + sz };
    if (!blocked(ilot, both, r)) { p = both; continue; }
    const onlyX = { x: p.x + sx, z: p.z };
    const onlyZ = { x: p.x, z: p.z + sz };
    if (sx !== 0 && !blocked(ilot, onlyX, r)) p = onlyX;
    else if (sz !== 0 && !blocked(ilot, onlyZ, r)) p = onlyZ;
  }
  return p;
}

function facingOf(vx: number, vz: number, prev: Facing): Facing {
  if (Math.abs(vx) < 1e-3 && Math.abs(vz) < 1e-3) return prev;
  if (Math.abs(vx) > Math.abs(vz) * 1.15) return vx > 0 ? 'droite' : 'gauche';
  return vz > 0 ? 'face' : 'dos';
}

/** Un pas de simulation (dt en secondes) : direction voulue (ou destination), lissage de la vitesse, collisions. */
export function stepWalker(ilot: Ilot, w: Walker, input: MoveInput, dt: number): Walker {
  let { x: ix, z: iz } = input.dir;
  const len = Math.hypot(ix, iz);
  if (len > 1) { ix /= len; iz /= len; }
  const speed = input.slow ? WALK_SPEED : RUN_SPEED;
  let want = { x: ix * speed, z: iz * speed };
  if (len < 1e-3 && input.target) {
    const tx = input.target.x - w.pos.x;
    const tz = input.target.z - w.pos.z;
    const d = Math.hypot(tx, tz);
    // Ralentit à l'approche pour ne pas dépasser la destination en un pas.
    const s = d < ARRIVE ? 0 : Math.min(speed, d / Math.max(dt, 1e-3));
    want = d < ARRIVE ? { x: 0, z: 0 } : { x: (tx / d) * s, z: (tz / d) * s };
  }
  const k = 1 - Math.exp(-dt / ACCEL_TAU);
  const vel = { x: w.vel.x + (want.x - w.vel.x) * k, z: w.vel.z + (want.z - w.vel.z) * k };
  if (Math.hypot(want.x, want.z) < 1e-3 && Math.hypot(vel.x, vel.z) < 0.05) { vel.x = 0; vel.z = 0; }
  const pos = slide(ilot, w.pos, vel.x * dt, vel.z * dt);
  const moved = Math.hypot(pos.x - w.pos.x, pos.z - w.pos.z);
  // Vitesse réelle après collision : contre un mur, on ne « court » pas sur place.
  const real = dt > 0 ? { x: (pos.x - w.pos.x) / dt, z: (pos.z - w.pos.z) / dt } : vel;
  const moving = moved / Math.max(dt, 1e-6) > 0.2;
  return {
    pos,
    vel: real,
    facing: moving ? facingOf(want.x || real.x, want.z || real.z, w.facing) : w.facing,
    phase: moving ? (w.phase + moved / STRIDE) % 1 : 0,
    moving,
  };
}

/** Zones qui contiennent le point, la plus proche d'abord (distance au centre). */
export function zonesAt(ilot: Ilot, p: Vec2): Zone[] {
  const centre = (a: Rect | Disc): Vec2 => (isDisc(a) ? { x: a.x, z: a.z } : { x: (a.x0 + a.x1) / 2, z: (a.z0 + a.z1) / 2 });
  return ilot.zones
    .filter((z) => inArea(p, z.area))
    .sort((a, b) => {
      const ca = centre(a.area);
      const cb = centre(b.area);
      return Math.hypot(ca.x - p.x, ca.z - p.z) - Math.hypot(cb.x - p.x, cb.z - p.z);
    });
}

/** Zone d'interaction active (la plus proche), ou null. */
export function activeZone(ilot: Ilot, p: Vec2): Zone | null {
  return zonesAt(ilot, p)[0] ?? null;
}

/** Point praticable le plus proche d'une destination cliquée (recherche en anneaux de 10 cm), ou null. */
export function nearestFree(ilot: Ilot, p: Vec2, maxR = 2): Vec2 | null {
  if (!blocked(ilot, p)) return p;
  for (let r = 0.1; r <= maxR; r += 0.1) {
    for (let a = 0; a < 16; a++) {
      const q = { x: p.x + Math.cos((a / 16) * Math.PI * 2) * r, z: p.z + Math.sin((a / 16) * Math.PI * 2) * r };
      if (!blocked(ilot, q)) return q;
    }
  }
  return null;
}

/** Vérifie la cohérence d'un îlot : apparitions praticables, zones atteignables (un point praticable dans chacune). */
export function validateIlot(ilot: Ilot): string[] {
  const issues: string[] = [];
  for (const [k, s] of Object.entries(ilot.spawns)) if (blocked(ilot, s)) issues.push(`apparition « ${k} » bloquée`);
  for (const z of ilot.zones) {
    const a = z.area;
    let ok = false;
    const pts: Vec2[] = isDisc(a)
      ? Array.from({ length: 24 }, (_, i) => ({ x: a.x + Math.cos(i / 24 * Math.PI * 2) * a.r * 0.8, z: a.z + Math.sin(i / 24 * Math.PI * 2) * a.r * 0.8 }))
      : Array.from({ length: 25 }, (_, i) => ({ x: a.x0 + ((i % 5) + 0.5) / 5 * (a.x1 - a.x0), z: a.z0 + (Math.floor(i / 5) + 0.5) / 5 * (a.z1 - a.z0) }));
    for (const p of pts) if (!blocked(ilot, p)) { ok = true; break; }
    if (!ok) issues.push(`zone « ${z.id} » inatteignable`);
  }
  return issues;
}
