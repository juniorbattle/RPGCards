/**
 * M09 — registre des îlots de la ville (un seul en mémoire à la fois, cadrage `docs/M09_CADRAGE_VILLE.md` §2) : plan
 * pur, personnages, passants, bornes de la caméra, constructeur de la scène. Les sorties d'un îlot nomment l'îlot voisin
 * (`Zone.target`) et le point d'apparition d'arrivée.
 */
import type { RigTuning } from './cameras';
import type { Ilot } from './monde';
import { P_FACADE_Z, P_FRONT_Z, P_NPCS, PARVIS } from './parvis';
import { FACADE_Z, NPCS, QUAI, QUAY_Z, type IlotNpc } from './quai';
import { CHEMINS_COUR, GRANDE_COUR, NPCS_COUR, PLAN_COUR } from './grandeCour';
import { CHEMINS_PARVIS, NPCS_PARVIS, PARVIS_PROFOND, PLAN_PARVIS } from './parvisRangs';
import { CHEMINS_QUAI, FOND_Z, LANE_BACK_Z, NPCS_PROFOND, PLAN_QUAI, QUAI_PROFOND } from './quaiProfond';
import type { CheminSegment } from './rangs';
import { RUELLES, R_EDGE_Z, R_FACADE_Z, R_NPCS } from './ruelles';
import { CHEMINS_RUELLES, NPCS_RUELLES, PLAN_RUELLES, RUELLES_PROFOND } from './ruellesRangs';
import { buildRuellesD } from './ruellesScene';
import { buildParvisD } from './parvisScene';
import { buildQuai } from './quaiScene';
import type { QuaiScene } from './scene';

/** Îlots de la ville ; la Grande Cour (V5) n'existe que dans la ville en rangs (`ILOTS_RANGS`). */
export type IlotId = 'quai' | 'parvis' | 'ruelles' | 'cour';
/** Îlots de la ville d'aujourd'hui, en bande (décor par code ou diorama du manifeste par défaut). */
export type IlotBande = Exclude<IlotId, 'cour'>;

export interface Passer { id: string; x0: number; x1: number; z: number; speed: number; phase?: number }

/**
 * M09 V3 (passe 47) : flou de profondeur à la manière de Cité du Tournoi (`PostFX.ts` L. 35-80). Net dans la bande jouable,
 * de la face du mur du quai (`nearZ`) jusqu'au fond des maisons du premier rang (`farZ`) ; flou croissant au premier plan
 * (pleine force `nearSpan` m plus près) et au loin (pleine force `farSpan` m plus loin, atténuée par `farAmt`) ; rayon
 * maximal en pixels à 1080 lignes.
 */
export interface DofDef { nearZ: number; farZ: number; nearSpan: number; farSpan: number; farAmt: number; maxBlur: number }
/** M09 V3 (passe 47) : reflet plan de la rue (flaques, eau du port) ; relais du reflet de l'eau : plan des façades
 *  (z) et hauteur des toits (au-delà, la ville lointaine). */
export interface RefletsDef { proxyZ: number; proxyY: number }

export interface IlotDef {
  id: IlotId;
  ilot: Ilot;
  npcs: readonly IlotNpc[];
  ambient: readonly Passer[];
  /** Bornes du point visé par la caméra (l'îlot ne sort pas du cadre). */
  camera: { minX: number; maxX: number };
  /** Réglages de cadrage propres à l'îlot (sinon ceux de `RIGS.frontale`). */
  rig?: RigTuning;
  /** Hauteur des personnages dans l'îlot (m ; défaut `WALKER_H`). M09 V3 : plus grands sur le Quai retravaillé. */
  walkerH?: number;
  /** Direction artistique du rendu : `encre` = illustration de carte encrée (direction D retenue par le responsable le
   *  2026-10-19, ADR 026) : contours à l'encre, grain de papier ; sinon le rendu d'origine. */
  style?: 'encre';
  dof?: DofDef;
  reflets?: RefletsDef;
  build(artSeed: number): QuaiScene;
  /** Quartier en rangs (passe 68) : chemins lumineux au sol, dessinés par le diorama (sans flèche). */
  chemins?: readonly CheminSegment[];
  /** Liaisons : zone de sortie → îlot voisin et point d'apparition à l'arrivée. */
  exits: Readonly<Record<string, { to: IlotId; spawn: string }>>;
}

export const ILOTS: Record<IlotBande, IlotDef> = {
  quai: {
    id: 'quai', ilot: QUAI, npcs: NPCS, camera: { minX: -11, maxX: 11 }, build: buildQuai,
    // M09 V3 (passe de qualité du Quai) : cadrage plus large et plus bas (eau au premier plan, toits, ville haute et ciel
    // au loin) avec des personnages plus grands ; le Parvis et les Ruelles gardent le cadrage d'origine jusqu'à validation.
    rig: { pitch: 7, distance: 18.5, fov: 39, aimY: 3.05 }, walkerH: 2.2, style: 'encre',
    // Passe 47 (retour du responsable : « il nous manque le blur et les flaques d'eau réfléchissantes ») : la rue et les
    // façades nettes, l'eau et les bateaux du premier plan flous, la ville haute adoucie ; flaques et port en miroir.
    dof: { nearZ: QUAY_Z + 0.5, farZ: FACADE_Z - 7.5, nearSpan: 3.2, farSpan: 45, farAmt: 0.42, maxBlur: 9 },
    reflets: { proxyZ: FACADE_Z, proxyY: 11 },
    ambient: [
      { id: 'pnj-joueuse-1', x0: -16.5, x1: -5.5, z: 2.35, speed: 0.95, phase: 0.3 },
      { id: 'pnj-docker-9', x0: 5.5, x1: 16.5, z: 2.5, speed: 1.1, phase: 0.7 },
    ],
    exits: { 'sortie-arene': { to: 'parvis', spawn: 'arrivee' }, 'sortie-ruelles': { to: 'ruelles', spawn: 'arrivee' } },
  },
  parvis: {
    id: 'parvis', ilot: PARVIS, npcs: P_NPCS, camera: { minX: -8, maxX: 8 }, build: buildParvisD,
    // Passe 49 (validation du Quai par le responsable : « Étends-le au Parvis et aux Ruelles ») : même cadrage, mêmes
    // personnages et même direction que le Quai ; net de la balustrade à l'amphithéâtre, ville basse et ville haute floues.
    rig: { pitch: 7, distance: 18.5, fov: 39, aimY: 3.05 }, walkerH: 2.2, style: 'encre',
    dof: { nearZ: P_FRONT_Z + 0.6, farZ: P_FACADE_Z - 8, nearSpan: 3.2, farSpan: 45, farAmt: 0.42, maxBlur: 9 },
    reflets: { proxyZ: P_FACADE_Z, proxyY: 10 },
    ambient: [{ id: 'pnj-commis-2', x0: -11, x1: 11, z: 2.2, speed: 0.85, phase: 0.55 }],
    exits: { 'sortie-quai': { to: 'quai', spawn: 'sortie-arene' } },
  },
  ruelles: {
    id: 'ruelles', ilot: RUELLES, npcs: R_NPCS, camera: { minX: -7.5, maxX: 7.5 }, build: buildRuellesD,
    // Passe 49 : même cadrage, mêmes personnages et même direction que le Quai ; net du canal au fond des maisons.
    rig: { pitch: 7, distance: 18.5, fov: 39, aimY: 3.05 }, walkerH: 2.2, style: 'encre',
    dof: { nearZ: R_EDGE_Z + 0.5, farZ: R_FACADE_Z - 8, nearSpan: 3.2, farSpan: 45, farAmt: 0.42, maxBlur: 9 },
    reflets: { proxyZ: R_FACADE_Z, proxyY: 10 },
    ambient: [{ id: 'pnj-marchande-4', x0: -11, x1: 10.5, z: 1.7, speed: 0.8, phase: 0.2 }],
    exits: { 'sortie-quai': { to: 'quai', spawn: 'sortie-ruelles' } },
  },
};

export const isIlotId = (x: unknown): x is IlotId => x === 'quai' || x === 'parvis' || x === 'ruelles' || x === 'cour';
export const isIlotBande = (x: unknown): x is IlotBande => x === 'quai' || x === 'parvis' || x === 'ruelles';

/**
 * Preuve de la profondeur praticable (passe 62, laboratoire seulement : `?ville=1&qa=1&profondeur=1`, manifeste
 * `decors/manifest-profondeur.json`) : le Quai profond (`quaiProfond.ts`), à faire valider par le responsable avant toute
 * image ; en quatre rangs depuis la passe 65 (`rangs.ts`). Même îlot pour le reste (personnages, sorties) ; net du bord
 * du quai au fond de la cour de la Chapelle ; un passant par ruelle. Sans son diorama, le décor par code du Quai en bande
 * serait dessiné sur ce plan : la preuve se lit en QA, diorama admis.
 */
export const QUAI_PROFOND_DEF: IlotDef = {
  ...ILOTS.quai,
  ilot: QUAI_PROFOND,
  npcs: NPCS_PROFOND,
  chemins: CHEMINS_QUAI,
  dof: { nearZ: QUAY_Z + 0.5, farZ: FOND_Z - 1.5, nearSpan: 3.2, farSpan: 45, farAmt: 0.42, maxBlur: 9 },
  // passe 64 : un passant dans la rue haute (la rue vit aussi au fond) ; passe 65 : un autre dans la ruelle des Lanternes
  ambient: [
    ...ILOTS.quai.ambient,
    { id: 'pnj-commis-2', x0: -12, x1: 12, z: LANE_BACK_Z + 1.6, speed: 0.8, phase: 0.4 },
    { id: 'pnj-joueuse-4', x0: -6, x1: 12, z: PLAN_QUAI.rangs[2]!.z0 + 1.8, speed: 0.75, phase: 0.6 },
  ],
  // reprise de M09 : le cœur s'ouvre sur la Grande Cour
  exits: { ...ILOTS.quai.exits, 'sortie-cour': { to: 'cour', spawn: 'sortie-quai' } },
};

/**
 * Reprise de M09 (2026-10-20) : **le Parvis et les Ruelles en rangs** (`parvisRangs.ts`, `ruellesRangs.ts`), même
 * grammaire et même principe que le Quai en rangs : leur rang 1 est l'îlot d'aujourd'hui, le quartier s'enfonce derrière
 * lui ; net du bord jusqu'au fond du cœur ; un passant par ruelle. Comme le Quai en rangs, ils ne se lisent que par leur
 * diorama (manifeste `MANIFESTE_RANGS`).
 */
export const PARVIS_PROFOND_DEF: IlotDef = {
  ...ILOTS.parvis,
  ilot: PARVIS_PROFOND,
  npcs: NPCS_PARVIS,
  chemins: CHEMINS_PARVIS,
  dof: { nearZ: P_FRONT_Z + 0.6, farZ: PLAN_PARVIS.bounds.z0 - 1.5, nearSpan: 3.2, farSpan: 45, farAmt: 0.42, maxBlur: 9 },
  ambient: [
    ...ILOTS.parvis.ambient,
    { id: 'pnj-marchande-6', x0: -12, x1: 12, z: PLAN_PARVIS.rangs[1]!.z1 - 1.6, speed: 0.8, phase: 0.35 },
    { id: 'pnj-docker-8', x0: -9, x1: 9, z: PLAN_PARVIS.rangs[2]!.z1 - 1.4, speed: 0.75, phase: 0.65 },
  ],
  exits: { ...ILOTS.parvis.exits, 'sortie-cour': { to: 'cour', spawn: 'sortie-parvis' } },
};
export const RUELLES_PROFOND_DEF: IlotDef = {
  ...ILOTS.ruelles,
  ilot: RUELLES_PROFOND,
  npcs: NPCS_RUELLES,
  chemins: CHEMINS_RUELLES,
  dof: { nearZ: R_EDGE_Z + 0.5, farZ: PLAN_RUELLES.bounds.z0 - 1.5, nearSpan: 3.2, farSpan: 45, farAmt: 0.42, maxBlur: 9 },
  ambient: [
    ...ILOTS.ruelles.ambient,
    { id: 'pnj-joueuse-10', x0: -10, x1: 5, z: PLAN_RUELLES.rangs[1]!.z1 - 1.4, speed: 0.75, phase: 0.45 },
    { id: 'pnj-commis-12', x0: -9, x1: 9, z: PLAN_RUELLES.rangs[2]!.z1 - 1.2, speed: 0.8, phase: 0.15 },
  ],
  exits: { ...ILOTS.ruelles.exits, 'sortie-cour': { to: 'cour', spawn: 'sortie-ruelles' } },
};
/**
 * La Grande Cour (V5, ADR 028 : C1 à C3, `grandeCour.ts`) : caméra de face plus haute, qui suit en profondeur (celle de
 * son diorama). Elle n'a pas de décor par code : on n'y entre que dans la ville en rangs, dont tous les dioramas sont
 * admis ; `build` ne dessine que le sol et la nuit du Quai, en dernier secours (jamais montré hors du laboratoire).
 */
export const COUR_DEF: IlotDef = {
  ...ILOTS.parvis,
  id: 'cour',
  ilot: GRANDE_COUR,
  npcs: NPCS_COUR,
  chemins: CHEMINS_COUR,
  camera: { minX: -8, maxX: 8 },
  build: buildQuai,
  dof: { nearZ: 4.5, farZ: PLAN_COUR.bounds.z0 - 1.5, nearSpan: 3.2, farSpan: 45, farAmt: 0.42, maxBlur: 9 },
  reflets: { proxyZ: -12, proxyY: 12 },
  ambient: [
    { id: 'pnj-joueuse-15', x0: -13, x1: 13, z: 1.4, speed: 0.9, phase: 0.25 },
    { id: 'pnj-docker-18', x0: -12, x1: 12, z: -1.6, speed: 0.8, phase: 0.75 },
    { id: 'pnj-commis-22', x0: -12, x1: 12, z: PLAN_COUR.rangs[1]!.z1 - 1.2, speed: 0.7, phase: 0.5 },
  ],
  exits: { 'sortie-quai': { to: 'quai', spawn: 'sortie-cour' }, 'sortie-ruelles': { to: 'ruelles', spawn: 'sortie-cour' }, 'sortie-parvis': { to: 'parvis', spawn: 'sortie-cour' } },
};

/** Manifeste des plans de la ville en rangs (les quatre îlots ; laboratoire `?profondeur=1`, aventure). */
export const MANIFESTE_RANGS = 'manifest-profondeur.json';
/** La ville en rangs : le Quai, le Parvis et les Ruelles en quatre rangs, et la Grande Cour. */
export const ILOTS_RANGS: Record<IlotId, IlotDef> = { quai: QUAI_PROFOND_DEF, parvis: PARVIS_PROFOND_DEF, ruelles: RUELLES_PROFOND_DEF, cour: COUR_DEF };
/** Définition d'un îlot dans la ville en rangs ou dans la ville d'aujourd'hui (la Grande Cour n'existe qu'en rangs). */
export const ilotDef = (id: IlotId, rangs: boolean): IlotDef => (rangs || id === 'cour' ? ILOTS_RANGS[id] : ILOTS[id]);
