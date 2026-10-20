/**
 * M09 V4 — **preuve de la profondeur praticable** (passe 62, demande du responsable sur la fiche de la porte : « On doit
 * pouvoir se deplacer en profondeur de la ville et non avoir l'impression que seul le premier plan est pratiquable ») :
 * plan PUR d'un Quai profond, pour le laboratoire seulement (`?ville=1&qa=1&profondeur=1`) ; le jeu et la démo gardent
 * le Quai en bande (`quai.ts`). Conception proposée au responsable (ADR 028, « Profondeur praticable »), à valider avant
 * toute image.
 *
 * Le quai reste la rue du premier plan (z de −3 à 3,4). Les façades deviennent trois blocs de 8 m de profondeur (z de
 * −11 à −3) ; entre eux, deux passages de 3 m mènent à la **rue haute** (z de −17 à −11), bordée au fond par le second
 * rang (devenu une façade où l'on marche). Mêmes conventions que `quai.ts` (mètres ; x ouest → est, z des façades (−)
 * vers l'eau (+)).
 */
import type { Disc, Ilot, Rect, Vec2, Zone } from './monde';
import { BOLLARDS, FACADE_Z, LAMPS, NPC_RADIUS, NPCS, QUAY_Z, STALL, TALK_RADIUS, X_MAX, X_MIN, type IlotNpc } from './quai';

/** Profondeur des blocs de façades (m) : le fond des blocs, bord de la rue haute. */
export const BLOCK_BACK_Z = -11;
/** Fond de la rue haute (pied du second rang, devenu une façade où l'on marche). */
export const LANE_BACK_Z = -17;
/** Demi-largeur de la rue haute (fermée au-delà). */
export const LANE_HALF_X = 15;
/**
 * Passages entre les blocs (x de début et de fin) : aux raccords des trois images de façades du diorama (ouest, centre
 * de l'essai, est), écartées de 3 m de part et d'autre.
 */
export const PASSAGES: readonly [number, number][] = [[-13.6, -10.6], [11.2, 14.2]];

/** Blocs de façades et extrémités fermées de la rue haute (obstacles). */
export const BLOCKS: readonly Rect[] = [
  { x0: X_MIN, z0: BLOCK_BACK_Z, x1: PASSAGES[0]![0], z1: FACADE_Z },
  { x0: PASSAGES[0]![1], z0: BLOCK_BACK_Z, x1: PASSAGES[1]![0], z1: FACADE_Z },
  { x0: PASSAGES[1]![1], z0: BLOCK_BACK_Z, x1: X_MAX, z1: FACADE_Z },
  { x0: X_MIN, z0: LANE_BACK_Z, x1: -LANE_HALF_X, z1: BLOCK_BACK_Z },
  { x0: LANE_HALF_X, z0: LANE_BACK_Z, x1: X_MAX, z1: BLOCK_BACK_Z },
];

/**
 * Accessoires du pied des façades, aux places de la bande du pied découpée du diorama : tonneaux au bord du passage
 * ouest, caisses de l'est écartées de 3 m avec leur bloc (celles de l'ouest sortent du quai et sont retirées).
 */
export const PROPS_PROFOND: readonly Rect[] = [
  { x0: -11.0, z0: -2.95, x1: -10.0, z1: -2.2 },
  { x0: 15.0, z0: -2.95, x1: 16.4, z1: -2.1 },
  { x0: 17.6, z0: 2.1, x1: 18.8, z1: 3.0 },
];

/**
 * Rue haute meublée (passe 64, « décor isolé » relevé par le responsable) : caisses au bout ouest, tonneaux au bout est,
 * deux lampadaires au bord de la rue ; mêmes places que dans le manifeste de la preuve (`m09-profondeur-preuve.mjs`).
 */
export const RUE_HAUTE_PROPS: readonly Rect[] = [
  { x0: -14.6, z0: -13.4, x1: -13.4, z1: -12.6 },
  { x0: 13.5, z0: -16.0, x1: 14.5, z1: -15.2 },
];
export const RUE_HAUTE_LAMPS: readonly Vec2[] = [{ x: -7.5, z: -11.6 }, { x: 7.5, z: -11.6 }];

/**
 * Personnages : ceux du Quai ; le commis monté dans la rue haute (il montre l'échelle au loin) ; la marchande, qui
 * barrait l'entrée du passage ouest, écartée de 3,6 m avec son bloc.
 */
export const NPCS_PROFOND: readonly IlotNpc[] = NPCS.map((n) => (n.id === 'pnj-commis-5' ? { ...n, at: { x: 2.4, z: -14.6 }, facing: 'face' as const } : n.id === 'pnj-marchande-9' ? { ...n, at: { x: -16.2, z: -1.6 } } : n));

export const QUAI_PROFOND: Ilot = {
  id: 'quai',
  name: 'le Quai (profondeur, preuve)',
  bounds: { x0: X_MIN, z0: LANE_BACK_Z, x1: X_MAX, z1: QUAY_Z },
  rects: [STALL, ...PROPS_PROFOND, ...BLOCKS, ...RUE_HAUTE_PROPS],
  discs: [
    ...LAMPS.map((p): Disc => ({ ...p, r: 0.16 })),
    ...BOLLARDS.map((p): Disc => ({ ...p, r: 0.2 })),
    ...RUE_HAUTE_LAMPS.map((p): Disc => ({ ...p, r: 0.16 })),
    ...NPCS_PROFOND.map((n): Disc => ({ ...n.at, r: NPC_RADIUS })),
  ],
  zones: [
    { id: 'porte-salle', kind: 'porte', label: 'Entrer dans la salle de jeu de cartes', target: 'salle', area: { x0: -7.6, z0: FACADE_Z, x1: -5.9, z1: FACADE_Z + 1.1 } },
    { id: 'porte-fanal', kind: 'porte', label: 'Entrer au Fanal', target: 'fanal', area: { x0: 6.35, z0: FACADE_Z, x1: 8.05, z1: FACADE_Z + 1.1 } },
    { id: 'sortie-arene', kind: 'sortie', label: 'Vers le Parvis de l’arène', target: 'arene', area: { x0: X_MAX - 1.1, z0: -1.4, x1: X_MAX, z1: 2.2 } },
    { id: 'sortie-ruelles', kind: 'sortie', label: 'Vers les Ruelles', target: 'ruelles', area: { x0: X_MIN, z0: -1.4, x1: X_MIN + 0.9, z1: 2.2 } },
    { id: 'rue-haute', kind: 'info', label: 'La rue haute (preuve de la profondeur)', target: 'rue-haute', area: { x0: -3, z0: LANE_BACK_Z, x1: 3, z1: LANE_BACK_Z + 1.2 } },
    ...NPCS_PROFOND.map((n): Zone => ({ id: `npc-${n.id}`, kind: 'parler', label: 'Parler', target: n.id, area: { x: n.at.x, z: n.at.z, r: TALK_RADIUS } })),
  ],
  spawns: {
    arrivee: { x: -17.4, z: 0.6, face: 'droite' },
    'porte-salle': { x: -6.75, z: -1.3, face: 'face' },
    'porte-fanal': { x: 7.2, z: -1.3, face: 'face' },
    'sortie-arene': { x: 17.2, z: 0.4, face: 'gauche' },
    'sortie-ruelles': { x: -17.0, z: 1.2, face: 'droite' },
    'passage-ouest': { x: -12.1, z: -6.5, face: 'dos' },
    'rue-haute': { x: 0, z: -14, face: 'face' },
    ...Object.fromEntries(NPCS_PROFOND.map((n) => [`npc-${n.id}`, { x: n.at.x + (n.facing === 'gauche' ? -1.0 : 1.0), z: n.at.z + 0.2, face: n.facing === 'gauche' ? 'droite' as const : 'gauche' as const }])),
  },
};
