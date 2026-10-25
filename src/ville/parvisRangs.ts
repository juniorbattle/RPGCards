/**
 * M09 (reprise, 2026-10-20) — **le Parvis de l'arène en quatre rangs** (grammaire de `rangs.ts`, conception
 * `docs/M09_QUARTIERS_EN_RANGS.md` §4 ; modèle : le Quai en quatre rangs, `quaiProfond.ts`). Son rang 1 est le Parvis
 * d'aujourd'hui (`parvis.ts`), inchangé : portes, sorties, braseros, table des inscriptions et places des personnages y
 * gardent leur place (l'aventure aussi) ; le quartier s'enfonce derrière lui jusqu'au pied de l'arène.
 *
 *   rang 1 : le Parvis (z de −5,2 à 3,4) ; la porte du Tournoi au centre, deux passages à ses côtés ;
 *   bande 1 (8 m) : le pavillon de la porte et les maisons de ses côtés ;
 *   rang 2 : la rue des Gradins (6 m), qui déborde à l'est sur la **place des Paris** (le kiosque des paris) ;
 *   bande 2 (8 m) : un passage à l'ouest du centre ;
 *   rang 3 : la rue des Lices (4 m), qui déborde à l'ouest sur la **placette du Tableau** (le tableau des annonces) ;
 *   bande 3 (7 m) : un passage à l'est ;
 *   rang 4 : la **cour des Champions** (8 m), le cœur du quartier, au pied du grand mur de l'arène, qui domine le
 *            quartier ; par son bout ouest, on monte vers la Grande Cour.
 * Mêmes conventions que `parvis.ts` (mètres ; x ouest → est, z de la façade (−) vers la balustrade (+)).
 */
import type { Disc, Ilot, Vec2, Zone } from './monde';
import { BOOTH, BRAZIERS, GATE, P_FACADE_Z, P_FRONT_Z, P_LAMPS, P_NPCS, P_PROPS, P_X_MAX, P_X_MIN } from './parvis';
import { NPC_RADIUS, TALK_RADIUS, type IlotNpc } from './quai';
import { balisesRangs, cheminsRangs, ilotRangs, meuble, objet, planRangs, spotsRangs, zonesBalises, type MeubleRang, type QuartierRangs } from './rangs';

export const PARVIS_RANGS: QuartierRangs = {
  rang1: { zFond: P_FACADE_Z, zAvant: P_FRONT_Z, x0: P_X_MIN, x1: P_X_MAX },
  decor: { x0: -31, x1: 31 },
  bandes: [
    { profondeur: 8, passages: [[-13.2, -10.6], [10.6, 13.2]] },
    { profondeur: 8, passages: [[-7.6, -4.6]] },
    { profondeur: 7, passages: [[4.6, 7.6]] },
  ],
  ruelles: [
    { id: 'rue-gradins', nom: 'la rue des Gradins', x0: -13.7, x1: 13.7, profondeur: 6, place: { id: 'place-paris', nom: 'la place des Paris', x0: 1.5, x1: 12.5, recul: 5 } },
    { id: 'rue-lices', nom: 'la rue des Lices', x0: -11, x1: 11, profondeur: 4, place: { id: 'placette-tableau', nom: 'la placette du Tableau', x0: -11, x1: -5, recul: 5 } },
    { id: 'cour-champions', nom: 'la cour des Champions', x0: -9, x1: 9, profondeur: 8 },
  ],
};
export const PLAN_PARVIS = planRangs(PARVIS_RANGS);
export const BALISES_PARVIS = balisesRangs(PLAN_PARVIS, 'le Parvis');
/** Le cœur : devant la porte des Champions, au pied de l'arène. */
export const COEUR_PARVIS: Vec2 = { x: 0, z: -42.4 };
export const CHEMINS_PARVIS = cheminsRangs(PLAN_PARVIS, COEUR_PARVIS);
const COUR = PLAN_PARVIS.rangs[3]!;

/**
 * Mobilier (mêmes places dans le manifeste, `tools/m09-quartiers-rangs.mjs`, qui les lit ici). Au rang 1, à la place des
 * obstacles du Parvis d'aujourd'hui : braseros (disques), table des inscriptions et tonneaux. Objets du kit des rangs
 * (`rangs-mobilier`) ou du lot des villes (`villes-objets` : brasero, kiosque, tableau ; peints plus grands que nature,
 * ramenés à leur taille par `echelle`).
 */
export const MEUBLES_PARVIS: readonly MeubleRang[] = [
  ...BRAZIERS.map((b, i) => ({ ...objet(`parvis-brasero-${i + 1}`, 'brasero', b.x, b.z + 0.6, 1.2, 1.2), echelle: 0.4, rect: null })),
  { ...objet('parvis-inscriptions', 'etal', (BOOTH.x0 + BOOTH.x1) / 2, BOOTH.z1, BOOTH.x1 - BOOTH.x0, BOOTH.z1 - BOOTH.z0), echelle: 0.55, rect: BOOTH },
  { ...meuble('parvis-tonneaux', [-11.3, -9.7], (P_PROPS[0]!.x0 + P_PROPS[0]!.x1) / 2, P_PROPS[0]!.z1, 1.2, 0.9), rect: P_PROPS[0]! },
  objet('gradins-charrette', 'charrette', -10.2, -18.2, 4.0, 1.0),
  { ...objet('paris-kiosque', 'kiosque', 7.6, -23.0, 3.0, 1.2), echelle: 0.5 },
  meuble('paris-caisses', [11.6, 13.7], 11.2, -23.6, 1.2, 0.8),
  { ...objet('tableau-annonces', 'tableau', -8.4, -35.4, 2.6, 0.6), echelle: 0.5 },
  // passe 116 (retours R1) : le banc et son olivier, écartés du passage vers la cour des Champions qu'ils cachaient
  objet('lices-banc', 'banc', -1.6, -30.4, 3.2, 0.8),
  { ...objet('champions-brasero-o', 'brasero', -3.6, -44.8, 1.2, 1.2), echelle: 0.4, rect: null },
  { ...objet('champions-brasero-e', 'brasero', 3.6, -44.8, 1.2, 1.2), echelle: 0.4, rect: null },
];
/** Braseros de la cour des Champions (disques, comme ceux du Parvis). */
const BRASEROS_COUR: readonly Vec2[] = [{ x: -3.6, z: -45.4 }, { x: 3.6, z: -45.4 }];
/** Lampadaires des rangs 2 à 4 (morceau de la bande de la rue du Quai). */
export const LAMPES_PARVIS: readonly Vec2[] = [
  { x: -8, z: -13.6 }, { x: 8, z: -13.6 },
  { x: 1.5, z: -27.6 },
  { x: -6.5, z: -38.6 }, { x: 6.5, z: -38.6 },
];

/** Personnages : ceux du Parvis, et un par spot plus loin (gabarits validés, ADR 023). */
export const NPCS_PARVIS: readonly IlotNpc[] = [
  ...P_NPCS,
  { id: 'pnj-commis-14', at: { x: 4.4, z: -21.4 }, facing: 'droite', role: 'guide' },
  { id: 'pnj-docker-11', at: { x: -6.2, z: -33.4 }, facing: 'gauche', role: 'guide' },
  { id: 'pnj-joueuse-13', at: { x: 2.6, z: -41.2 }, facing: 'face', role: 'guide' },
];

export const PARVIS_PROFOND: Ilot = ilotRangs(PLAN_PARVIS, {
  id: 'parvis',
  name: 'le Parvis de l’arène (en rangs)',
  rects: MEUBLES_PARVIS.flatMap((m) => (m.rect ? [m.rect] : [])),
  discs: [
    ...[...BRAZIERS, ...BRASEROS_COUR].map((b): Disc => ({ ...b, r: 0.6 })),
    ...P_LAMPS.map((p): Disc => ({ ...p, r: 0.16 })),
    ...LAMPES_PARVIS.map((p): Disc => ({ ...p, r: 0.16 })),
    ...NPCS_PARVIS.map((n): Disc => ({ ...n.at, r: NPC_RADIUS })),
  ],
  zones: [
    { id: 'porte-arene', kind: 'porte', label: 'Entrer dans l’arène', target: 'arene', area: { x0: GATE.x - GATE.half, z0: P_FACADE_Z, x1: GATE.x + GATE.half, z1: P_FACADE_Z + 1.2 } },
    { id: 'sortie-quai', kind: 'sortie', label: 'Retour au Quai', target: 'quai', area: { x0: P_X_MIN, z0: -1.4, x1: P_X_MIN + 1.1, z1: 2.2 } },
    { id: 'sortie-cour', kind: 'sortie', label: 'Monter vers la Grande Cour', target: 'cour', area: { x0: COUR.x0, z0: -43.4, x1: COUR.x0 + 0.9, z1: -40.6 } },
    ...spotsRangs(PLAN_PARVIS, { x0: -4, z0: COUR.z0, x1: 4, z1: COUR.z0 + 2.5 }),
    ...zonesBalises(BALISES_PARVIS),
    ...NPCS_PARVIS.map((n): Zone => ({ id: `npc-${n.id}`, kind: 'parler', label: 'Parler', target: n.id, area: { x: n.at.x, z: n.at.z, r: TALK_RADIUS } })),
  ],
  spawns: {
    arrivee: { x: -12.3, z: 0.5, face: 'droite' },
    'porte-arene': { x: 0, z: -3.3, face: 'face' },
    'sortie-cour': { x: COUR.x0 + 1.6, z: -42, face: 'droite' },
    'rue-gradins': { x: -2, z: -16, face: 'face' },
    'place-paris': { x: 5, z: -21, face: 'face' },
    'rue-lices': { x: 0, z: -29.2, face: 'face' },
    'placette-tableau': { x: -8, z: -32.6, face: 'dos' },
    'cour-champions': { x: 0, z: -41, face: 'dos' },
    // devant chaque personnage, dans sa zone de dialogue (même règle que `parvis.ts`)
    ...Object.fromEntries(NPCS_PARVIS.map((n) => [`npc-${n.id}`, n.facing === 'face'
      ? { x: n.at.x, z: n.at.z + 1.0, face: 'dos' as const }
      : { x: n.at.x + (n.facing === 'gauche' ? -1.0 : 1.0), z: n.at.z + 0.2, face: n.facing === 'gauche' ? 'droite' as const : 'gauche' as const }])),
  },
});
