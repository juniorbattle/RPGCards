/**
 * M09 V4 — **le Quai en quatre rangs** (preuve, laboratoire seulement : `?ville=1&qa=1&profondeur=1` ; le jeu et la démo
 * gardent le Quai en bande, `quai.ts`). Passe 62 : profondeur praticable proposée (blocs, passages, rue haute) ; passe 63 :
 * retenue par le responsable ; passe 65 : **quartier en rangs** (`rangs.ts`, `docs/M09_QUARTIERS_EN_RANGS.md`) :
 * « plusieurs ruelles superposées qui débordent vers des places marchables ».
 *
 *   rang 1 : le Quai (z de −3 à 3,4) ; portes de la salle et du Fanal, sorties vers le Parvis et les Ruelles ;
 *   bande 1 (8 m) : les façades du Quai, deux passages (ouest, est), aux raccords de ses trois images ;
 *   rang 2 : la rue Haute (6 m), qui déborde à l'est sur la **place de la Halle** (étal, marchande) ;
 *   bande 2 (8 m) : un passage à l'ouest du centre ;
 *   rang 3 : la ruelle des Lanternes (4 m), qui déborde à l'ouest sur la **placette du Puits** (devant la maison des
 *            Joueurs) ;
 *   bande 3 (7 m) : un passage à l'est ;
 *   rang 4 : la **cour de la Chapelle** (7 m), le cœur du quartier, au pied de la ville haute.
 * Mêmes conventions que `quai.ts` (mètres ; x ouest → est, z des façades (−) vers l'eau (+)).
 */
import type { Disc, Ilot, Rect, Vec2, Zone } from './monde';
import { BOLLARDS, FACADE_Z, LAMPS, NPC_RADIUS, NPCS, QUAY_Z, STALL, TALK_RADIUS, X_MAX, X_MIN, type IlotNpc } from './quai';
import { balisesRangs, ilotRangs, planRangs, type QuartierRangs } from './rangs';

/** Le Quai en rangs (grammaire de `rangs.ts`). Les passages de la bande 1 sont aux raccords des trois images de façades
 *  du diorama (ouest, centre de l'essai, est), écartées de 3 m de part et d'autre. */
export const QUAI_RANGS: QuartierRangs = {
  rang1: { zFond: FACADE_Z, zAvant: QUAY_Z, x0: X_MIN, x1: X_MAX },
  decor: { x0: -31, x1: 31 },
  bandes: [
    { profondeur: 8, passages: [[-13.6, -10.6], [11.2, 14.2]] },
    { profondeur: 8, passages: [[-8, -5]] },
    { profondeur: 7, passages: [[5.5, 8.5]] },
  ],
  ruelles: [
    { id: 'rue-haute', nom: 'la rue Haute', x0: -17, x1: 17, profondeur: 6, place: { id: 'place-halle', nom: 'la place de la Halle', x0: 1, x1: 13, recul: 6 } },
    { id: 'ruelle-lanternes', nom: 'la ruelle des Lanternes', x0: -14, x1: 14, profondeur: 4, place: { id: 'placette-puits', nom: 'la placette du Puits', x0: -14, x1: -8, recul: 5 } },
    { id: 'cour-chapelle', nom: 'la cour de la Chapelle', x0: -10, x1: 10, profondeur: 7 },
  ],
};
export const PLAN_QUAI = planRangs(QUAI_RANGS);
/** Balises des passages (passe 67) : aller vers le rang suivant, retour au précédent ; leur nom en zone « info ». */
export const BALISES_QUAI = balisesRangs(PLAN_QUAI, 'le Quai');

/** Fond des blocs du premier rang (bord de la rue Haute) et fond de la rue Haute. */
export const BLOCK_BACK_Z = PLAN_QUAI.bandes[0]!.z0;
export const LANE_BACK_Z = PLAN_QUAI.rangs[1]!.z0;
/** Fond du quartier (le pied de la façade du fond de la cour). */
export const FOND_Z = PLAN_QUAI.bounds.z0;
export const PASSAGES = PLAN_QUAI.bandes[0]!.passages;

/**
 * Accessoires du pied des façades du Quai, aux places de la bande du pied découpée du diorama : tonneaux au bord du
 * passage ouest, caisses de l'est écartées de 3 m avec leur bloc (celles de l'ouest sortent du quai et sont retirées).
 */
export const PROPS_PROFOND: readonly Rect[] = [
  { x0: -11.0, z0: -2.95, x1: -10.0, z1: -2.2 },
  { x0: 15.0, z0: -2.95, x1: 16.4, z1: -2.1 },
  { x0: 17.6, z0: 2.1, x1: 18.8, z1: 3.0 },
];

/**
 * Mobilier des rangs 2 à 4 (mêmes places dans le manifeste de la preuve, `m09-profondeur-preuve.mjs`, qui les lit ici) :
 * objets du kit des rangs (passe 66, `source: 'kit'`, `objet` : son nom dans `art-src/decors/kit-rangs.json`), ou
 * morceaux des bandes du pied du diorama (`source: 'pied'`, x de la source au monde, avant écart). `x`, `z` : pied du
 * meuble au monde ; `rect` : obstacle.
 */
export interface MeubleRang { id: string; source: 'pied' | 'kit'; src?: readonly [number, number]; objet?: string; x: number; z: number; rect: Rect }
const meuble = (id: string, src: readonly [number, number], x: number, z: number, w: number, d: number): MeubleRang => ({ id, source: 'pied', src, x, z, rect: { x0: x - w / 2, z0: z - d, x1: x + w / 2, z1: z } });
const objet = (id: string, nom: string, x: number, z: number, w: number, d: number): MeubleRang => ({ id, source: 'kit', objet: nom, x, z, rect: { x0: x - w / 2, z0: z - d, x1: x + w / 2, z1: z } });
export const MEUBLES_RANGS: readonly MeubleRang[] = [
  meuble('rue-haute-caisses', [-18.95, -17.05], -14.0, -12.6, 1.2, 0.8),
  meuble('rue-haute-tonneaux', [-11.3, -9.7], 15.0, -15.2, 1.0, 0.8),
  objet('rue-haute-charrette', 'charrette', -2.6, -16.0, 4.0, 1.0),
  objet('halle-etal', 'etal', 7.4, -20.8, 4.0, 1.4),
  meuble('halle-caisses', [11.6, 13.7], 11.8, -21.9, 1.2, 0.8),
  objet('lanternes-niche', 'niche', -3.0, -28.4, 1.0, 0.6),
  objet('puits', 'puits', -11.2, -31.0, 2.6, 1.6),
  meuble('placette-tonneaux', [-11.3, -9.7], -13.3, -33.4, 1.0, 0.6),
  objet('cour-fontaine', 'fontaine', 0, -39.6, 3.2, 1.6),
  objet('cour-banc', 'banc', -6.4, -42.2, 3.2, 0.8),
];
/** Lampadaires des rangs 2 à 4 (morceau de la bande de la rue). */
export const LAMPES_RANGS: readonly Vec2[] = [
  { x: -7.5, z: -11.6 }, { x: 7.5, z: -11.6 },
  { x: 2.2, z: -21.6 },
  { x: 1.0, z: -25.5 },
  { x: -5.5, z: -36.6 }, { x: 5.5, z: -36.6 },
];

/**
 * Personnages : ceux du Quai (la marchande, qui barrait l'entrée du passage ouest, écartée de 3,6 m avec son bloc ; le
 * commis monté à la place de la Halle) et un par spot plus loin : la marchande de la Halle, une joueuse à la placette du
 * Puits, un docker dans la cour de la Chapelle.
 */
export const NPCS_PROFOND: readonly IlotNpc[] = [
  ...NPCS.map((n) => (n.id === 'pnj-commis-5' ? { ...n, at: { x: 3.4, z: -19.4 }, facing: 'droite' as const } : n.id === 'pnj-marchande-9' ? { ...n, at: { x: -16.2, z: -1.6 } } : n)),
  { id: 'pnj-marchande-12', at: { x: 9.6, z: -19.6 }, facing: 'gauche', role: 'guide' },
  { id: 'pnj-joueuse-7', at: { x: -9.2, z: -30.6 }, facing: 'gauche', role: 'guide' },
  { id: 'pnj-docker-3', at: { x: -2.6, z: -39.6 }, facing: 'face', role: 'guide' },
];

/** Zones des spots : chaque place (son recul) et la cour du fond ; points d'apparition de chaque rang et de chaque spot. */
const spots: Zone[] = PLAN_QUAI.rangs.flatMap((r): Zone[] => {
  if (r.place) return [{ id: r.place.id, kind: 'info', label: r.place.nom[0]!.toUpperCase() + r.place.nom.slice(1), target: r.place.id, area: { x0: r.place.x0, z0: r.place.z0, x1: r.place.x1, z1: r.place.z1 } }];
  if (r.n === PLAN_QUAI.rangs.length) return [{ id: r.id, kind: 'info', label: r.nom[0]!.toUpperCase() + r.nom.slice(1), target: r.id, area: { x0: -4, z0: r.z0, x1: 4, z1: r.z0 + 2.5 } }];
  return [];
});

export const QUAI_PROFOND: Ilot = ilotRangs(PLAN_QUAI, {
  id: 'quai',
  name: 'le Quai (en rangs, preuve)',
  rects: [STALL, ...PROPS_PROFOND, ...MEUBLES_RANGS.map((m) => m.rect)],
  discs: [
    ...LAMPS.map((p): Disc => ({ ...p, r: 0.16 })),
    ...BOLLARDS.map((p): Disc => ({ ...p, r: 0.2 })),
    ...LAMPES_RANGS.map((p): Disc => ({ ...p, r: 0.16 })),
    ...NPCS_PROFOND.map((n): Disc => ({ ...n.at, r: NPC_RADIUS })),
  ],
  zones: [
    { id: 'porte-salle', kind: 'porte', label: 'Entrer dans la salle de jeu de cartes', target: 'salle', area: { x0: -7.6, z0: FACADE_Z, x1: -5.9, z1: FACADE_Z + 1.1 } },
    { id: 'porte-fanal', kind: 'porte', label: 'Entrer au Fanal', target: 'fanal', area: { x0: 6.35, z0: FACADE_Z, x1: 8.05, z1: FACADE_Z + 1.1 } },
    { id: 'sortie-arene', kind: 'sortie', label: 'Vers le Parvis de l’arène', target: 'arene', area: { x0: X_MAX - 1.1, z0: -1.4, x1: X_MAX, z1: 2.2 } },
    { id: 'sortie-ruelles', kind: 'sortie', label: 'Vers les Ruelles', target: 'ruelles', area: { x0: X_MIN, z0: -1.4, x1: X_MIN + 0.9, z1: 2.2 } },
    ...spots,
    ...BALISES_QUAI.map((b): Zone => ({ id: b.id, kind: 'info', label: b.label, target: `rang-${b.vers}`, area: { x0: b.x - b.largeur / 2 + 0.2, z0: b.z - 0.7, x1: b.x + b.largeur / 2 - 0.2, z1: b.z + 0.7 } })),
    ...NPCS_PROFOND.map((n): Zone => ({ id: `npc-${n.id}`, kind: 'parler', label: 'Parler', target: n.id, area: { x: n.at.x, z: n.at.z, r: TALK_RADIUS } })),
  ],
  spawns: {
    arrivee: { x: -17.4, z: 0.6, face: 'droite' },
    'porte-salle': { x: -6.75, z: -1.3, face: 'face' },
    'porte-fanal': { x: 7.2, z: -1.3, face: 'face' },
    'sortie-arene': { x: 17.2, z: 0.4, face: 'gauche' },
    'sortie-ruelles': { x: -17.0, z: 1.2, face: 'droite' },
    'passage-ouest': { x: -12.1, z: -6.5, face: 'dos' },
    'rue-haute': { x: -2, z: -14, face: 'face' },
    'place-halle': { x: 5.2, z: -18.4, face: 'face' },
    'ruelle-lanternes': { x: -1, z: -27, face: 'face' },
    'placette-puits': { x: -9.6, z: -28.4, face: 'gauche' },
    'cour-chapelle': { x: 0, z: -38.5, face: 'dos' },
    ...Object.fromEntries(NPCS_PROFOND.map((n) => [`npc-${n.id}`, { x: n.at.x + (n.facing === 'gauche' ? -1.0 : 1.0), z: n.at.z + 0.2, face: n.facing === 'gauche' ? 'droite' as const : 'gauche' as const }])),
  },
});
