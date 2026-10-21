/**
 * M09 (reprise, 2026-10-20) — **les Ruelles en quatre rangs** (grammaire de `rangs.ts`, conception
 * `docs/M09_QUARTIERS_EN_RANGS.md` §4 ; modèle : le Quai en quatre rangs, `quaiProfond.ts`). Son rang 1 est la ruelle du
 * canal d'aujourd'hui (`ruelles.ts`), inchangée : sortie, fontaine du Voile, étal de la liseuse et places des personnages
 * y gardent leur place (l'aventure aussi) ; le quartier du Voile s'enfonce derrière ses maisons hautes et étroites.
 *
 *   rang 1 : les Ruelles, le long du canal (z de −2,2 à 2,6) ; un passage à l'ouest de la fontaine ;
 *   bande 1 (8 m) : les maisons hautes et étroites du canal ;
 *   rang 2 : la ruelle des Tanneurs (4 m), qui déborde à l'est sur la **placette de l'Olivier** ;
 *   bande 2 (7 m) : un passage à l'est du centre ;
 *   rang 3 : la ruelle du Voile (4 m), étroite, sans place ;
 *   bande 3 (7 m) : un passage à l'ouest ;
 *   rang 4 : la **cour de la Guilde** (7 m), le cœur du quartier, devant la halle de la Guilde des joueurs ; par son bout
 *            est, on monte vers la Grande Cour.
 * Mêmes conventions que `ruelles.ts` (mètres ; x ouest → est, z des façades (−) vers le canal (+)).
 */
import type { Disc, Ilot, Vec2, Zone } from './monde';
import { NPC_RADIUS, TALK_RADIUS, type IlotNpc } from './quai';
import { balisesRangs, cheminsRangs, ilotRangs, meuble, objet, planRangs, spotsRangs, zonesBalises, type MeubleRang, type QuartierRangs } from './rangs';
import { FOUNTAIN, R_EDGE_Z, R_FACADE_Z, R_LAMPS, R_NPCS, R_X_MAX, R_X_MIN, SEER } from './ruelles';

export const RUELLES_RANGS: QuartierRangs = {
  rang1: { zFond: R_FACADE_Z, zAvant: R_EDGE_Z, x0: R_X_MIN, x1: R_X_MAX },
  decor: { x0: -31, x1: 31 },
  bandes: [
    { profondeur: 8, passages: [[-9.4, -6.8]] },
    { profondeur: 7, passages: [[1.0, 3.8]] },
    { profondeur: 7, passages: [[-6.4, -3.6]] },
  ],
  ruelles: [
    { id: 'ruelle-tanneurs', nom: 'la ruelle des Tanneurs', x0: -12.5, x1: 12.5, profondeur: 4, place: { id: 'placette-olivier', nom: 'la placette de l’Olivier', x0: 6.5, x1: 12.5, recul: 5 } },
    { id: 'ruelle-voile', nom: 'la ruelle du Voile', x0: -11, x1: 11, profondeur: 4 },
    { id: 'cour-guilde', nom: 'la cour de la Guilde', x0: -9, x1: 9, profondeur: 7 },
  ],
};
export const PLAN_RUELLES = planRangs(RUELLES_RANGS);
export const BALISES_RUELLES = balisesRangs(PLAN_RUELLES, 'les Ruelles');
/** Le cœur : devant la halle de la Guilde. */
export const COEUR_RUELLES: Vec2 = { x: 1.5, z: -36.4 };
export const CHEMINS_RUELLES = cheminsRangs(PLAN_RUELLES, COEUR_RUELLES);
const COUR = PLAN_RUELLES.rangs[3]!;

/**
 * Mobilier (mêmes places dans le manifeste, `tools/m09-quartiers-rangs.mjs`, qui les lit ici). Au rang 1, à la place des
 * obstacles des Ruelles d'aujourd'hui : la fontaine du Voile (le disque de `ruelles.ts`) et l'étal de la liseuse.
 */
export const MEUBLES_RUELLES: readonly MeubleRang[] = [
  { ...objet('fontaine-voile', 'fontaine', FOUNTAIN.x, FOUNTAIN.z + 0.75, 2.3, 1.5), echelle: 0.6, rect: null },
  { ...objet('etal-liseuse', 'etal', (SEER.x0 + SEER.x1) / 2, SEER.z1, SEER.x1 - SEER.x0, SEER.z1 - SEER.z0), echelle: 0.55, rect: SEER },
  meuble('tanneurs-tonneaux', [-11.3, -9.7], -2.4, -13.6, 1.0, 0.6),
  { ...objet('tanneurs-niche', 'niche', -11.2, -13.6, 1.0, 0.6), echelle: 0.7 },
  objet('olivier-banc', 'banc', 9.6, -18.4, 3.6, 0.8),
  objet('voile-charrette', 'charrette', 6.2, -24.6, 4.0, 1.0),
  meuble('voile-caisses', [11.6, 13.7], -8.6, -24.6, 1.2, 0.8),
  objet('guilde-puits', 'puits', -5.6, -38.2, 2.6, 1.4),
];
/** Lampadaires des rangs 2 à 4 (morceau de la bande de la rue du Quai). */
export const LAMPES_RUELLES: readonly Vec2[] = [
  { x: -6, z: -10.6 }, { x: 5, z: -10.6 },
  { x: -1, z: -21.6 },
  { x: -4.5, z: -32.6 }, { x: 5.5, z: -32.6 },
];

/** Personnages : ceux des Ruelles, et un par spot plus loin (gabarits validés, ADR 023). */
export const NPCS_RUELLES: readonly IlotNpc[] = [
  ...R_NPCS,
  { id: 'pnj-marchande-17', at: { x: 8.0, z: -16.2 }, facing: 'face', role: 'guide' },
  { id: 'pnj-commis-19', at: { x: -0.6, z: -22.8 }, facing: 'droite', role: 'guide' },
  { id: 'pnj-joueuse-21', at: { x: 3.4, z: -37.6 }, facing: 'face', role: 'guide' },
];

export const RUELLES_PROFOND: Ilot = ilotRangs(PLAN_RUELLES, {
  id: 'ruelles',
  name: 'les Ruelles (en rangs)',
  rects: MEUBLES_RUELLES.flatMap((m) => (m.rect ? [m.rect] : [])),
  discs: [
    FOUNTAIN,
    ...R_LAMPS.map((p): Disc => ({ ...p, r: 0.16 })),
    ...LAMPES_RUELLES.map((p): Disc => ({ ...p, r: 0.16 })),
    ...NPCS_RUELLES.map((n): Disc => ({ ...n.at, r: NPC_RADIUS })),
  ],
  zones: [
    { id: 'sortie-quai', kind: 'sortie', label: 'Retour au Quai', target: 'quai', area: { x0: R_X_MAX - 1.1, z0: -1.2, x1: R_X_MAX, z1: 2.0 } },
    { id: 'sortie-cour', kind: 'sortie', label: 'Monter vers la Grande Cour', target: 'cour', area: { x0: COUR.x1 - 0.9, z0: -37.2, x1: COUR.x1, z1: -34.2 } },
    { id: 'fontaine', kind: 'info', label: 'La fontaine du Voile', area: { x: FOUNTAIN.x, z: FOUNTAIN.z, r: FOUNTAIN.r + 0.9 } },
    ...spotsRangs(PLAN_RUELLES, { x0: -4, z0: COUR.z0, x1: 4, z1: COUR.z0 + 2.5 }),
    ...zonesBalises(BALISES_RUELLES),
    ...NPCS_RUELLES.map((n): Zone => ({ id: `npc-${n.id}`, kind: 'parler', label: 'Parler', target: n.id, area: { x: n.at.x, z: n.at.z, r: TALK_RADIUS } })),
  ],
  spawns: {
    arrivee: { x: 11.4, z: 0.6, face: 'gauche' },
    'sortie-cour': { x: COUR.x1 - 1.6, z: -35.7, face: 'gauche' },
    'ruelle-tanneurs': { x: 0, z: -12.2, face: 'face' },
    'placette-olivier': { x: 8.6, z: -15, face: 'face' },
    'ruelle-voile': { x: 0, z: -23.2, face: 'face' },
    'cour-guilde': { x: 0, z: -35, face: 'dos' },
    ...Object.fromEntries(NPCS_RUELLES.map((n) => [`npc-${n.id}`, n.facing === 'face'
      ? { x: n.at.x, z: n.at.z + 1.0, face: 'dos' as const }
      : { x: n.at.x + (n.facing === 'gauche' ? -1.0 : 1.0), z: n.at.z + 0.2, face: n.facing === 'gauche' ? 'droite' as const : 'gauche' as const }])),
  },
});
