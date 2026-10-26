/**
 * M11-A — les rencontres « en vue » (`docs/m11/01_RENCONTRES_EN_VUE.md`, PROPOSÉ ; ADR 037). Logique PURE : le cône de
 * vision d'un guetteur (portée, demi-angle, direction de sa place), la ligne de vue coupée par les obstacles de l'îlot, le
 * front montant (entrer dans le champ, pas y apparaître), les guetteurs qui peuvent forcer un duel selon l'état du
 * directeur (repos après un duel) et de l'aventure (après P8), le point d'approche et le point où surgit le rival.
 * Aucun DOM, aucun rendu, aucun temps réel : la ville n'exécute que des positions.
 */
import { blocked, type Facing, type Ilot, type Vec2 } from '../ville/monde';
import { chapitreDetaille, type AventureEtat, type Issue } from './aventure';
import type { EtatDirecteur, Pose } from './directeur';

/** Valeurs proposées (contrat 1, §2 et §5), provisoires jusqu'à la fiche. */
export const VUE = { portee: 4.5, demiAngle: 32, approche: 0.95, reposDefaite: 2, pas: 0.1 } as const;

/** Les joueurs de cartes de la ville qui guettent (duels de rue, membres des familles). */
export const GUETTEURS: ReadonlySet<string> = new Set(['rue-docker', 'rue-joueuse', 'rue-commis', 'rue-cour', 'rue-port', 'rue-haute', 'membre-Cendre', 'membre-Ronce', 'membre-Voile', 'membre-Astre']);
export const estGuetteur = (id: string): boolean => GUETTEURS.has(id);

const DIR: Record<Facing, Vec2> = { face: { x: 0, z: 1 }, dos: { x: 0, z: -1 }, gauche: { x: -1, z: 0 }, droite: { x: 1, z: 0 } };
export const directionDe = (f: Facing): Vec2 => DIR[f];

/** Le point est-il dans le cône (portée, demi-angle) d'un regard posé en `at` ? */
export function dansLeCone(at: Vec2, facing: Facing, p: Vec2, portee: number = VUE.portee, demiAngle: number = VUE.demiAngle): boolean {
  const dx = p.x - at.x;
  const dz = p.z - at.z;
  const d = Math.hypot(dx, dz);
  if (d > portee || d < 1e-6) return false;
  const u = DIR[facing];
  return (dx * u.x + dz * u.z) / d >= Math.cos((demiAngle * Math.PI) / 180);
}

/** Un point (sans rayon) est-il dans un obstacle de l'îlot ? Les disques centrés sur `ignore` ne comptent pas. */
function dansObstacle(ilot: Ilot, p: Vec2, ignore: readonly Vec2[]): boolean {
  for (const q of ilot.rects) if (p.x >= q.x0 && p.x <= q.x1 && p.z >= q.z0 && p.z <= q.z1) return true;
  for (const c of ilot.discs) {
    if (ignore.some((g) => Math.hypot(g.x - c.x, g.z - c.z) < 0.05)) continue;
    if ((p.x - c.x) ** 2 + (p.z - c.z) ** 2 < c.r * c.r) return true;
  }
  return false;
}

/** La ligne de `a` à `b` est-elle dégagée (échantillonnée tous les 10 cm, sans les deux extrémités sur 35 cm) ? */
export function ligneDegagee(ilot: Ilot, a: Vec2, b: Vec2, ignore: readonly Vec2[] = [a]): boolean {
  const d = Math.hypot(b.x - a.x, b.z - a.z);
  for (let t = 0.35; t <= d - 0.35; t += VUE.pas) {
    const p = { x: a.x + ((b.x - a.x) * t) / d, z: a.z + ((b.z - a.z) * t) / d };
    if (dansObstacle(ilot, p, ignore)) return false;
  }
  return true;
}

/** Le guetteur voit-il le joueur (cône et ligne dégagée) ? */
export function voit(ilot: Ilot, g: { at: Vec2; facing: Facing }, joueur: Vec2): boolean {
  return dansLeCone(g.at, g.facing, joueur) && ligneDegagee(ilot, g.at, joueur);
}

/** Issue du dernier duel contre un PNJ (état du directeur, `vus`). */
export interface Vu { issue: Issue; battement: number; chapitre: string }

/**
 * Un PNJ peut-il FORCER un duel maintenant ? Guetteur, prologue terminé (une famille rejointe, P7), pas sur le départ, et pas au repos :
 * battu par le joueur, il attend le chapitre suivant ; vainqueur (ou duel abandonné), deux battements.
 */
export function peutForcer(d: EtatDirecteur, e: AventureEtat, id: string): boolean {
  if (!estGuetteur(id) || e.affiliation === null) return false;
  if ((d.partants ?? []).includes(id)) return false;
  const v = d.vus?.[id];
  if (!v) return true;
  if (v.issue === 'victoire') return chapitreDetaille(e) !== v.chapitre;
  return d.battement >= v.battement + VUE.reposDefaite;
}

/** Les guetteurs actifs parmi les personnages posés dans l'îlot. */
export const guetteursActifs = (d: EtatDirecteur, e: AventureEtat, poses: readonly Pose[]): Pose[] => poses.filter((p) => p.genre === 'facultative' && peutForcer(d, e, p.id));

/**
 * Front montant : `dedansAvant` = guetteurs qui voyaient déjà le joueur à l'image précédente. Renvoie ceux qui le voient
 * maintenant, et le premier qui vient de le voir (le plus proche), ou null.
 */
export function detecter(ilot: Ilot, guetteurs: readonly Pose[], joueur: Vec2, dedansAvant: ReadonlySet<string>): { dedans: Set<string>; repere: Pose | null } {
  const dedans = new Set<string>();
  let repere: Pose | null = null;
  let best = Infinity;
  for (const g of guetteurs) {
    if (!voit(ilot, g, joueur)) continue;
    dedans.add(g.id);
    const dist = Math.hypot(g.at.x - joueur.x, g.at.z - joueur.z);
    if (!dedansAvant.has(g.id) && dist < best) { best = dist; repere = g; }
  }
  return { dedans, repere };
}

/** Où s'arrête un personnage qui vient au joueur : sur la ligne, à `VUE.approche` du joueur, sur un point praticable. */
export function pointApproche(ilot: Ilot, from: Vec2, joueur: Vec2, ignore: readonly Vec2[] = [from]): Vec2 {
  const d = Math.hypot(joueur.x - from.x, joueur.z - from.z);
  if (d <= VUE.approche) return { ...from };
  const u = { x: (joueur.x - from.x) / d, z: (joueur.z - from.z) / d };
  const sansLui: Ilot = { ...ilot, discs: ilot.discs.filter((c) => !ignore.some((g) => Math.hypot(g.x - c.x, g.z - c.z) < 0.05)) };
  for (let s = d - VUE.approche; s > 0; s -= 0.05) {
    const p = { x: from.x + u.x * s, z: from.z + u.z * s };
    if (!blocked(sansLui, p, 0.28)) return p;
  }
  return { ...from };
}

/** Regard d'un personnage vers un point (quatre directions de la ville). */
export function regardVers(from: Vec2, to: Vec2): Facing {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  if (Math.abs(dx) > Math.abs(dz)) return dx > 0 ? 'droite' : 'gauche';
  return dz > 0 ? 'face' : 'dos';
}

/** Où surgit le rival (contrat 2, §3) : à 3,5 m, premier point praticable d'une liste fixe d'où il voit le joueur. */
export const OFFSETS_SURGISSEMENT: readonly Vec2[] = [{ x: 3.5, z: 0 }, { x: -3.5, z: 0 }, { x: 0, z: -3.5 }, { x: 0, z: 3 }, { x: 2.5, z: -2.5 }, { x: -2.5, z: -2.5 }, { x: 2.5, z: 2 }, { x: -2.5, z: 2 }];
export function pointSurgissement(ilot: Ilot, joueur: Vec2): Vec2 | null {
  for (const o of OFFSETS_SURGISSEMENT) {
    const p = { x: joueur.x + o.x, z: joueur.z + o.z };
    if (!blocked(ilot, p, 0.35) && ligneDegagee(ilot, p, joueur, [p])) return p;
  }
  return null;
}
