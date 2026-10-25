/**
 * M09, deuxième reprise (2026-10-25, décision du responsable : « Fanal et Ville haute ») — **la Place du Fanal**, quartier
 * du Port (identifiant `port` : `fanal` est le lieu de duel du bar). Même grammaire que les autres quartiers (`rangs.ts`) ;
 * quartier ajouté, ouvert seulement si son diorama est admis (ADR 028, « Deuxième reprise »). On y passe par le bout ouest
 * de la cour de la Chapelle, le cœur du Quai.
 *
 *   rang 1 : la Place du Fanal (z de −6 à 3,4), au bord de l'eau, au pied du vieux phare et de ses entrepôts ;
 *   bande 1 (8 m) : le phare et les entrepôts, deux passages à leurs côtés ;
 *   rang 2 : la rue des Cordiers (6 m), qui déborde à l'est sur la **placette des Filets** (le puits) ;
 *   bande 2 (7 m) : un passage à l'ouest du centre ;
 *   rang 3 : la **cour de la Ronce** (7 m), le cœur du quartier, devant la maison de la Ronce.
 * Mêmes conventions que `quai.ts` (mètres ; x ouest → est, z des façades (−) vers l'eau (+)).
 */
import type { Disc, Ilot, Vec2, Zone } from './monde';
import { NPC_RADIUS, TALK_RADIUS, type IlotNpc } from './quai';
import { balisesRangs, cheminsRangs, ilotRangs, meuble, objet, planRangs, spotsRangs, zonesBalises, type MeubleRang, type QuartierRangs } from './rangs';

export const PORT_RANGS: QuartierRangs = {
  rang1: { zFond: -6, zAvant: 3.4, x0: -16, x1: 16 },
  decor: { x0: -31, x1: 31 },
  bandes: [
    { profondeur: 8, passages: [[-12.6, -10], [9.6, 12.2]] },
    { profondeur: 7, passages: [[-6.6, -4]] },
  ],
  ruelles: [
    { id: 'rue-cordiers', nom: 'la rue des Cordiers', x0: -14, x1: 14, profondeur: 6, place: { id: 'placette-filets', nom: 'la placette des Filets', x0: 2, x1: 12, recul: 5 } },
    { id: 'cour-ronce', nom: 'la cour de la Ronce', x0: -10, x1: 10, profondeur: 7 },
  ],
};
export const PLAN_PORT = planRangs(PORT_RANGS);
export const BALISES_PORT = balisesRangs(PLAN_PORT, 'la Place du Fanal');
/** Le cœur : devant la maison de la Ronce. */
export const COEUR_PORT: Vec2 = { x: 0, z: -31.4 };
export const CHEMINS_PORT = cheminsRangs(PLAN_PORT, COEUR_PORT);
const COUR = PLAN_PORT.rangs[PLAN_PORT.rangs.length - 1]!;
export const PORT_FRONT_Z = PORT_RANGS.rang1.zAvant;

/** Mobilier (mêmes places dans le manifeste de son diorama, `tools/m09-quartiers-rangs.mjs`, qui les lit ici). */
export const MEUBLES_PORT: readonly MeubleRang[] = [
  objet('fanal-etal', 'etal', -6.0, -4.6, 4.0, 1.4),
  meuble('fanal-tonneaux', [-11.3, -9.7], 5.6, -5.0, 1.2, 0.9),
  meuble('fanal-caisses', [11.6, 13.7], -15.0, -5.1, 1.2, 0.8),
  objet('cordiers-niche', 'niche', -1.5, -19.6, 1.0, 0.6),
  objet('filets-puits', 'puits', 9.0, -23.6, 2.6, 1.6),
  objet('ronce-banc', 'banc', -6.4, -32.8, 3.2, 0.8),
];
/** Lampadaires (morceau de la bande de la rue du Quai). */
export const LAMPES_PORT: readonly Vec2[] = [
  { x: -3, z: -5.4 }, { x: 8.4, z: -5.4 },
  { x: 6.0, z: -19.4 },
  { x: -5.0, z: -28.6 }, { x: 5.0, z: -28.6 },
];

/** Personnages (gabarits validés, ADR 023) : une marchande à son étal, un docker sur la place, un commis aux Filets, une
 *  joueuse dans la cour de la Ronce. */
export const NPCS_PORT: readonly IlotNpc[] = [
  { id: 'pnj-marchande-81', at: { x: -6.0, z: -3.4 }, facing: 'face', role: 'guide' },
  { id: 'pnj-docker-80', at: { x: 4.0, z: -1.0 }, facing: 'gauche', role: 'guide' },
  { id: 'pnj-commis-82', at: { x: 6.4, z: -22.4 }, facing: 'droite', role: 'guide' },
  { id: 'pnj-joueuse-83', at: { x: -2.6, z: -31.6 }, facing: 'face', role: 'guide' },
];

export const PLACE_FANAL: Ilot = ilotRangs(PLAN_PORT, {
  id: 'port',
  name: 'la Place du Fanal',
  rects: MEUBLES_PORT.flatMap((m) => (m.rect ? [m.rect] : [])),
  discs: [
    ...LAMPES_PORT.map((p): Disc => ({ ...p, r: 0.16 })),
    ...NPCS_PORT.map((n): Disc => ({ ...n.at, r: NPC_RADIUS })),
  ],
  zones: [
    { id: 'sortie-quai', kind: 'sortie', label: 'Retour au Quai', target: 'quai', area: { x0: 15.1, z0: -3, x1: 16, z1: 1 } },
    ...spotsRangs(PLAN_PORT, { x0: -4, z0: COUR.z0, x1: 4, z1: COUR.z0 + 2.5 }),
    ...zonesBalises(BALISES_PORT),
    ...NPCS_PORT.map((n): Zone => ({ id: `npc-${n.id}`, kind: 'parler', label: 'Parler', target: n.id, area: { x: n.at.x, z: n.at.z, r: TALK_RADIUS } })),
  ],
  spawns: {
    arrivee: { x: 14.4, z: -1, face: 'gauche' },
    'sortie-quai': { x: 14.4, z: -1, face: 'gauche' },
    'rue-cordiers': { x: 0, z: -17, face: 'face' },
    'placette-filets': { x: 5, z: -21.6, face: 'face' },
    'cour-ronce': { x: 0, z: -30.2, face: 'dos' },
    ...Object.fromEntries(NPCS_PORT.map((n) => [`npc-${n.id}`, n.facing === 'face'
      ? { x: n.at.x, z: n.at.z + 1.0, face: 'dos' as const }
      : { x: n.at.x + (n.facing === 'gauche' ? -1.0 : 1.0), z: n.at.z + 0.2, face: n.facing === 'gauche' ? 'droite' as const : 'gauche' as const }])),
  },
});
