/**
 * M09 — îlot « le Parvis de l'arène » : place dallée devant la façade monumentale de l'arène (grande porte embrasée,
 * arcades, bannières des familles, deux braseros), balustrade sur la ville basse. Relié au Quai par sa sortie ouest.
 * Plan PUR partagé par la logique et la scène (mêmes conventions que `quai.ts`). Données de prototype.
 */
import type { Disc, Ilot, Rect, Vec2, Zone } from './monde';
import type { IlotNpc } from './quai';

export const P_FACADE_Z = -5.2;
export const P_FRONT_Z = 3.4;
export const P_X_MIN = -14;
export const P_X_MAX = 14;
/** Centre et demi-largeur de la grande porte. */
export const GATE = { x: 0, half: 2.3, h: 6.2 };
export const BRAZIERS: readonly Vec2[] = [{ x: -4.4, z: -4.3 }, { x: 4.4, z: -4.3 }];
/** Lampadaires sur les côtés seulement : au centre, un lampadaire masquait le joueur devant la grande porte. */
export const P_LAMPS: readonly Vec2[] = [-10.5, 10.5].map((x) => ({ x, z: 3.0 }));
/** Table des inscriptions (point focal secondaire) et tonneaux. */
export const BOOTH: Rect = { x0: 7.2, z0: -5.1, x1: 9.6, z1: -4.0 };
export const P_PROPS: readonly Rect[] = [{ x0: -10.4, z0: -5.1, x1: -9.2, z1: -4.2 }];

export const P_NPCS: readonly IlotNpc[] = [
  { id: 'astre', at: { x: 2.9, z: -3.5 }, facing: 'face', role: 'rival', encounter: 'libre-astre' },
  { id: 'pnj-joueuse-5', at: { x: -6.2, z: 0.7 }, facing: 'droite', role: 'duel', encounter: 'ville-pnj-joueuse-5' },
];

const TALK = 1.35;

export const PARVIS: Ilot = {
  id: 'parvis',
  name: 'le Parvis de l’arène',
  bounds: { x0: P_X_MIN, z0: P_FACADE_Z, x1: P_X_MAX, z1: P_FRONT_Z },
  rects: [BOOTH, ...P_PROPS],
  discs: [
    ...BRAZIERS.map((b): Disc => ({ ...b, r: 0.6 })),
    ...P_LAMPS.map((p): Disc => ({ ...p, r: 0.16 })),
    ...P_NPCS.map((n): Disc => ({ ...n.at, r: 0.32 })),
  ],
  zones: [
    { id: 'porte-arene', kind: 'porte', label: 'Entrer dans l’arène', target: 'arene', area: { x0: GATE.x - GATE.half, z0: P_FACADE_Z, x1: GATE.x + GATE.half, z1: P_FACADE_Z + 1.2 } },
    { id: 'sortie-quai', kind: 'sortie', label: 'Retour au Quai', target: 'quai', area: { x0: P_X_MIN, z0: -1.4, x1: P_X_MIN + 1.1, z1: 2.2 } },
    ...P_NPCS.map((n): Zone => ({ id: `npc-${n.id}`, kind: 'parler', label: 'Parler', target: n.id, area: { x: n.at.x, z: n.at.z, r: TALK } })),
  ],
  spawns: {
    arrivee: { x: -12.3, z: 0.5, face: 'droite' },
    'porte-arene': { x: 0, z: -3.3, face: 'face' },
    // Devant chaque personnage, dans sa zone de dialogue (test : `ville.test.ts`) : en face de lui s'il regarde la rue.
    ...Object.fromEntries(P_NPCS.map((n) => [`npc-${n.id}`, n.facing === 'face'
      ? { x: n.at.x, z: n.at.z + 1.0, face: 'dos' as const }
      : { x: n.at.x + (n.facing === 'gauche' ? -1.0 : 1.0), z: n.at.z + 0.2, face: n.facing === 'gauche' ? 'droite' as const : 'gauche' as const }])),
  },
};
