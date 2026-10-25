/**
 * M09, deuxième reprise (2026-10-25, décision du responsable : « Fanal et Ville haute ») — **la Ville haute** (identifiant
 * `haute`), au-dessus du Belvédère de la Grande Cour, par son bout ouest. Même grammaire que les autres quartiers
 * (`rangs.ts`) ; quartier ajouté, ouvert seulement si son diorama est admis (ADR 028, « Deuxième reprise »).
 *
 *   rang 1 : l'esplanade des Hôtels (z de −6 à 3,4), une terrasse fermée par une balustrade, la ville en contrebas ;
 *   bande 1 (8 m) : les hôtels à arcades, deux passages à leurs côtés ;
 *   rang 2 : la rue des Astronomes (6 m), qui déborde à l'ouest sur le **jardin des Sphères** (la fontaine) ;
 *   bande 2 (7 m) : un passage à l'est du centre ;
 *   rang 3 : le **parvis de l'Observatoire** (8 m), le cœur du quartier, au pied de l'Observatoire de l'Astre.
 * Mêmes conventions que `quai.ts` (mètres ; x ouest → est, z des façades (−) vers la balustrade (+)).
 */
import type { Disc, Ilot, Vec2, Zone } from './monde';
import { NPC_RADIUS, TALK_RADIUS, type IlotNpc } from './quai';
import { balisesRangs, cheminsRangs, ilotRangs, objet, planRangs, spotsRangs, zonesBalises, type MeubleRang, type QuartierRangs } from './rangs';

export const HAUTE_RANGS: QuartierRangs = {
  rang1: { zFond: -6, zAvant: 3.4, x0: -15, x1: 15 },
  decor: { x0: -31, x1: 31 },
  bandes: [
    { profondeur: 8, passages: [[-12.4, -9.8], [9.8, 12.4]] },
    { profondeur: 7, passages: [[3.6, 6.2]] },
  ],
  ruelles: [
    { id: 'rue-astronomes', nom: 'la rue des Astronomes', x0: -13, x1: 13, profondeur: 6, place: { id: 'jardin-spheres', nom: 'le jardin des Sphères', x0: -12, x1: -2, recul: 5 } },
    { id: 'parvis-observatoire', nom: 'le parvis de l’Observatoire', x0: -10, x1: 10, profondeur: 8 },
  ],
};
export const PLAN_HAUTE = planRangs(HAUTE_RANGS);
export const BALISES_HAUTE = balisesRangs(PLAN_HAUTE, 'l’esplanade des Hôtels');
/** Le cœur : devant la porte de l'Observatoire. */
export const COEUR_HAUTE: Vec2 = { x: 0, z: -32.2 };
export const CHEMINS_HAUTE = cheminsRangs(PLAN_HAUTE, COEUR_HAUTE);
const COUR = PLAN_HAUTE.rangs[PLAN_HAUTE.rangs.length - 1]!;

/** Mobilier (mêmes places dans le manifeste de son diorama, `tools/m09-quartiers-rangs.mjs`, qui les lit ici). */
export const MEUBLES_HAUTE: readonly MeubleRang[] = [
  // deux braseros au milieu de l'esplanade (comme au rang 1 du Parvis) : des bancs à olivier y montraient, vus de la rue
  // des Astronomes tout près de la caméra, le liseré magenta de leur feuillage ; plus à l'écart, ils cachaient le chemin
  { ...objet('esplanade-brasero-o', 'brasero', -2.4, -4.8, 1.2, 1.2), echelle: 0.4, rect: null },
  { ...objet('esplanade-brasero-e', 'brasero', 2.4, -4.8, 1.2, 1.2), echelle: 0.4, rect: null },
  objet('astronomes-niche', 'niche', 0.0, -19.6, 1.0, 0.6),
  objet('spheres-fontaine', 'fontaine', -7.0, -23.6, 3.2, 1.6),
  { ...objet('observatoire-brasero-o', 'brasero', -3.6, -33.8, 1.2, 1.2), echelle: 0.4, rect: null },
  { ...objet('observatoire-brasero-e', 'brasero', 3.6, -33.8, 1.2, 1.2), echelle: 0.4, rect: null },
];
const BRASEROS: readonly Vec2[] = [{ x: -2.4, z: -5.4 }, { x: 2.4, z: -5.4 }, { x: -3.6, z: -34.4 }, { x: 3.6, z: -34.4 }];
/** Lampadaires (morceau de la bande de la rue du Quai). */
export const LAMPES_HAUTE: readonly Vec2[] = [
  { x: -5.6, z: -5.4 }, { x: 5.6, z: -5.4 },
  { x: -4.0, z: -19.4 },
  { x: -6.5, z: -29.0 }, { x: 6.5, z: -29.0 },
];

/** Personnages (gabarits validés, ADR 023) : un commis sur l'esplanade, un passant de la rue des Astronomes, une joueuse
 *  au jardin des Sphères, un docker devant l'Observatoire. */
export const NPCS_HAUTE: readonly IlotNpc[] = [
  { id: 'pnj-commis-86', at: { x: 3.0, z: -2.2 }, facing: 'gauche', role: 'guide' },
  { id: 'pnj-marchande-88', at: { x: -3.0, z: -16.0 }, facing: 'face', role: 'guide' },
  { id: 'pnj-joueuse-87', at: { x: -5.2, z: -22.4 }, facing: 'droite', role: 'guide' },
  { id: 'pnj-docker-89', at: { x: -3.0, z: -32.6 }, facing: 'face', role: 'guide' },
];

export const VILLE_HAUTE: Ilot = ilotRangs(PLAN_HAUTE, {
  id: 'haute',
  name: 'la Ville haute',
  rects: MEUBLES_HAUTE.flatMap((m) => (m.rect ? [m.rect] : [])),
  discs: [
    ...BRASEROS.map((b): Disc => ({ ...b, r: 0.6 })),
    ...LAMPES_HAUTE.map((p): Disc => ({ ...p, r: 0.16 })),
    ...NPCS_HAUTE.map((n): Disc => ({ ...n.at, r: NPC_RADIUS })),
  ],
  zones: [
    { id: 'sortie-cour', kind: 'sortie', label: 'Descendre vers la Grande Cour', target: 'cour', area: { x0: -15, z0: -3, x1: -14.1, z1: 1 } },
    ...spotsRangs(PLAN_HAUTE, { x0: -4, z0: COUR.z0, x1: 4, z1: COUR.z0 + 2.5 }),
    ...zonesBalises(BALISES_HAUTE),
    ...NPCS_HAUTE.map((n): Zone => ({ id: `npc-${n.id}`, kind: 'parler', label: 'Parler', target: n.id, area: { x: n.at.x, z: n.at.z, r: TALK_RADIUS } })),
  ],
  spawns: {
    arrivee: { x: -14.2, z: -1, face: 'droite' },
    'sortie-cour': { x: -14.2, z: -1, face: 'droite' },
    'rue-astronomes': { x: 0, z: -17, face: 'face' },
    'jardin-spheres': { x: -4, z: -21.6, face: 'face' },
    'parvis-observatoire': { x: 0, z: -30.6, face: 'dos' },
    ...Object.fromEntries(NPCS_HAUTE.map((n) => [`npc-${n.id}`, n.facing === 'face'
      ? { x: n.at.x, z: n.at.z + 1.0, face: 'dos' as const }
      : { x: n.at.x + (n.facing === 'gauche' ? -1.0 : 1.0), z: n.at.z + 0.2, face: n.facing === 'gauche' ? 'droite' as const : 'gauche' as const }])),
  },
});
