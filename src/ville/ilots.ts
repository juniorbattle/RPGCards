/**
 * M09 — registre des îlots de la ville (un seul en mémoire à la fois, cadrage `docs/M09_CADRAGE_VILLE.md` §2) : plan
 * pur, personnages, passants, bornes de la caméra, constructeur de la scène. Les sorties d'un îlot nomment l'îlot voisin
 * (`Zone.target`) et le point d'apparition d'arrivée.
 */
import type { RigTuning } from './cameras';
import type { Ilot } from './monde';
import { P_FACADE_Z, P_FRONT_Z, P_NPCS, PARVIS } from './parvis';
import { FACADE_Z, NPCS, QUAI, QUAY_Z, type IlotNpc } from './quai';
import { RUELLES, R_EDGE_Z, R_FACADE_Z, R_NPCS } from './ruelles';
import { buildRuellesD } from './ruellesScene';
import { buildParvisD } from './parvisScene';
import { buildQuai } from './quaiScene';
import type { QuaiScene } from './scene';

export type IlotId = 'quai' | 'parvis' | 'ruelles';

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
  /** Liaisons : zone de sortie → îlot voisin et point d'apparition à l'arrivée. */
  exits: Readonly<Record<string, { to: IlotId; spawn: string }>>;
}

export const ILOTS: Record<IlotId, IlotDef> = {
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

export const isIlotId = (x: unknown): x is IlotId => x === 'quai' || x === 'parvis' || x === 'ruelles';
