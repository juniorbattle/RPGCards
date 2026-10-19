/**
 * M09 — îlot « les Ruelles » (quartier du Voile) : ruelle étroite le long d'un canal, maisons hautes et étroites à
 * encorbellement, bannières bleu et argent, une fontaine (point focal), l'étal d'une liseuse ; une passerelle enjambe le
 * canal au premier plan. Sélène, liseuse du Voile, y passe ses soirées (duel libre, ouvert après l'avoir rencontrée au
 * Tournoi). Reliée au Quai par sa sortie est. Plan PUR (mêmes conventions que `quai.ts`). Données de prototype.
 */
import type { Disc, Ilot, Rect, Vec2, Zone } from './monde';
import type { IlotNpc } from './quai';

export const R_FACADE_Z = -2.2;
export const R_EDGE_Z = 2.6;
export const R_X_MIN = -13;
export const R_X_MAX = 13;
export const R_WATER_Y = -1.0;

/** Maisons hautes et étroites (encorbellement à l'étage), de l'ouest à l'est. */
export interface Narrow { x0: number; x1: number; h: number; door: number; seed: number }
export const NARROW: readonly Narrow[] = [
  { x0: -16, x1: -11.6, h: 10.5, door: -13.6, seed: 61 },
  { x0: -11.2, x1: -7.0, h: 11.8, door: -9.1, seed: 67 },
  { x0: -6.6, x1: -1.9, h: 9.6, door: -4.3, seed: 71 },
  { x0: -1.5, x1: 3.2, h: 12.4, door: 0.8, seed: 73 },
  { x0: 3.6, x1: 8.1, h: 10.2, door: 5.9, seed: 79 },
  { x0: 8.5, x1: 13.0, h: 11.4, door: 10.7, seed: 83 },
  { x0: 13.4, x1: 18, h: 9.8, door: 15.7, seed: 89 },
];

/** Fontaine (point focal) : bassin rond au milieu de la ruelle. */
export const FOUNTAIN: Disc = { x: -3.6, z: 0.3, r: 0.95 };
/** Étal de la liseuse (toile ardoise, boule de cristal). */
export const SEER: Rect = { x0: 6.2, z0: -2.15, x1: 8.4, z1: -1.2 };
export const R_LAMPS: readonly Vec2[] = [-9.5, 2.5].map((x) => ({ x, z: 2.2 }));

export const R_NPCS: readonly IlotNpc[] = [
  { id: 'voile', at: { x: 9.6, z: -0.6 }, facing: 'gauche', role: 'rival', encounter: 'libre-voile' },
];

export const RUELLES: Ilot = {
  id: 'ruelles',
  name: 'les Ruelles',
  bounds: { x0: R_X_MIN, z0: R_FACADE_Z, x1: R_X_MAX, z1: R_EDGE_Z },
  rects: [SEER],
  discs: [FOUNTAIN, ...R_LAMPS.map((p): Disc => ({ ...p, r: 0.16 })), ...R_NPCS.map((n): Disc => ({ ...n.at, r: 0.32 }))],
  zones: [
    { id: 'sortie-quai', kind: 'sortie', label: 'Retour au Quai', target: 'quai', area: { x0: R_X_MAX - 1.1, z0: -1.2, x1: R_X_MAX, z1: 2.0 } },
    { id: 'fontaine', kind: 'info', label: 'La fontaine du Voile', area: { x: FOUNTAIN.x, z: FOUNTAIN.z, r: FOUNTAIN.r + 0.9 } },
    ...R_NPCS.map((n): Zone => ({ id: `npc-${n.id}`, kind: 'parler', label: 'Parler', target: n.id, area: { x: n.at.x, z: n.at.z, r: 1.35 } })),
  ],
  spawns: {
    arrivee: { x: 11.4, z: 0.6, face: 'gauche' },
    ...Object.fromEntries(R_NPCS.map((n) => [`npc-${n.id}`, { x: n.at.x - 1.0, z: n.at.z + 0.2, face: 'droite' as const }])),
  },
};
