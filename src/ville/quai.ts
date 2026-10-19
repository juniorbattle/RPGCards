/**
 * M09 — îlot « le Quai, la nuit » : plan PUR partagé par la logique (collisions, zones) et par la scène (géométrie).
 * Mètres ; x le long du quai (ouest → est), z du pied des façades (−) vers le bord du quai et l'eau (+), y vers le haut.
 * Données de prototype, non canoniques : placement proposé pour le laboratoire de caméra et la démo (M09 V1/V2).
 */
import type { Disc, Facing, Ilot, Rect, Vec2, Zone } from './monde';

/** Pied des façades (le personnage ne va pas au-delà). */
export const FACADE_Z = -3.0;
/** Bord du quai (arête du parapet) ; l'eau commence derrière, 1,15 m plus bas (échelle de Cité du Tournoi). */
export const QUAY_Z = 3.4;
export const WATER_Y = -1.15;
export const X_MIN = -19;
export const X_MAX = 19;

/** Une façade de l'îlot (la scène la construit ; la logique n'en garde que le pied). */
export interface Facade {
  id: string;
  x0: number;
  x1: number;
  /** Hauteur à l'égout (m) ; le toit monte au-dessus. */
  h: number;
  kind: 'maison' | 'salle' | 'fanal';
  /** Porte (centre x) ; null = pas de porte praticable. */
  door: number | null;
  seed: number;
}

export const FACADES: readonly Facade[] = [
  { id: 'chantier', x0: -19.5, x1: -11.2, h: 7.6, kind: 'maison', door: -15.2, seed: 11 },
  { id: 'salle', x0: -10.6, x1: -2.9, h: 9.4, kind: 'salle', door: -6.75, seed: 23 },
  { id: 'etroite', x0: -2.4, x1: 2.6, h: 8.2, kind: 'maison', door: 0.1, seed: 37 },
  { id: 'fanal', x0: 3.2, x1: 11.2, h: 7.9, kind: 'fanal', door: 7.2, seed: 41 },
  { id: 'armateur', x0: 11.7, x1: 19.5, h: 10.2, kind: 'maison', door: 15.6, seed: 53 },
];

/** Lampadaires du bord du quai, tous les 9 m (rythme de Cité du Tournoi), décalés des portes : en frontale, un
 *  lampadaire devant une porte masquait le joueur qui s'y présentait. */
export const LAMPS: readonly Vec2[] = [-13, -4, 5, 14].map((x) => ({ x, z: 2.95 }));
/** Bornes d'amarrage. */
export const BOLLARDS: readonly Vec2[] = [-12, -2.6, 6.4, 15.5].map((x) => ({ x, z: 3.05 }));

/** Étal principal (point focal) : table, caisses, toile ivoire, lanterne. */
export const STALL: Rect = { x0: 0.6, z0: -2.95, x1: 3.6, z1: -1.55 };
/** Groupes d'accessoires (caisses, tonneaux) aux points focaux. */
export const PROPS: readonly (Rect & { kind: 'caisses' | 'tonneaux' | 'filets' })[] = [
  { x0: -18.6, z0: -2.95, x1: -17.4, z1: -2.05, kind: 'caisses' },
  { x0: -11.0, z0: -2.95, x1: -10.0, z1: -2.2, kind: 'tonneaux' },
  { x0: 12.0, z0: -2.95, x1: 13.4, z1: -2.1, kind: 'caisses' },
  { x0: 17.6, z0: 2.1, x1: 18.8, z1: 3.0, kind: 'filets' },
];

/** Personnages de l'îlot : identifiant de personnalité (PNJ ou rival) et leur rôle dans la démo. */
export interface IlotNpc {
  id: string;
  at: Vec2;
  facing: Facing;
  role: 'guide' | 'duel' | 'rival';
  /** Rencontre lancée par un défi (identifiant de `src/product/encounters.ts`). */
  encounter?: string;
}

export const NPCS: readonly IlotNpc[] = [
  { id: 'pnj-marchande-9', at: { x: -12.6, z: -1.6 }, facing: 'droite', role: 'guide' },
  { id: 'pnj-docker-1', at: { x: -2.4, z: 1.4 }, facing: 'gauche', role: 'duel', encounter: 'ville-pnj-docker-1' },
  { id: 'pnj-commis-5', at: { x: 4.6, z: 1.9 }, facing: 'face', role: 'duel', encounter: 'ville-pnj-commis-5' },
  { id: 'braise', at: { x: 13.6, z: 0.9 }, facing: 'gauche', role: 'rival', encounter: 'libre-braise' },
];

export const NPC_RADIUS = 0.32;
/** Rayon de la zone « parler » autour d'un personnage. */
export const TALK_RADIUS = 1.35;

const door = (f: Facade, label: string, target: string): Zone => ({
  id: `porte-${f.id}`, kind: 'porte', label, target, area: { x0: f.door! - 0.85, z0: FACADE_Z, x1: f.door! + 0.85, z1: FACADE_Z + 1.1 },
});
const facade = (id: string) => FACADES.find((f) => f.id === id)!;

export const QUAI: Ilot = {
  id: 'quai',
  name: 'le Quai',
  bounds: { x0: X_MIN, z0: FACADE_Z, x1: X_MAX, z1: QUAY_Z },
  rects: [STALL, ...PROPS],
  discs: [
    ...LAMPS.map((p): Disc => ({ ...p, r: 0.16 })),
    ...BOLLARDS.map((p): Disc => ({ ...p, r: 0.2 })),
    ...NPCS.map((n): Disc => ({ ...n.at, r: NPC_RADIUS })),
  ],
  zones: [
    door(facade('salle'), 'Entrer dans la salle de jeu de cartes', 'salle'),
    door(facade('fanal'), 'Entrer au Fanal', 'fanal'),
    { id: 'sortie-arene', kind: 'sortie', label: 'Vers le Parvis de l’arène', target: 'arene', area: { x0: X_MAX - 1.1, z0: -1.4, x1: X_MAX, z1: 2.2 } },
    { id: 'sortie-ruelles', kind: 'sortie', label: 'Vers les Ruelles', target: 'ruelles', area: { x0: X_MIN, z0: -1.4, x1: X_MIN + 0.9, z1: 2.2 } },
    ...NPCS.map((n): Zone => ({ id: `npc-${n.id}`, kind: 'parler', label: 'Parler', target: n.id, area: { x: n.at.x, z: n.at.z, r: TALK_RADIUS } })),
  ],
  spawns: {
    arrivee: { x: -17.4, z: 0.6, face: 'droite' },
    'porte-salle': { x: -6.75, z: -1.3, face: 'face' },
    'porte-fanal': { x: 7.2, z: -1.3, face: 'face' },
    'sortie-arene': { x: 17.2, z: 0.4, face: 'gauche' },
    'sortie-ruelles': { x: -17.0, z: 1.2, face: 'droite' },
    ...Object.fromEntries(NPCS.map((n) => [`npc-${n.id}`, { x: n.at.x + (n.facing === 'gauche' ? -1.0 : 1.0), z: n.at.z + 0.2, face: n.facing === 'gauche' ? 'droite' as const : 'gauche' as const }])),
  },
};
