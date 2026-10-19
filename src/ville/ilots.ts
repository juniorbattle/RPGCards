/**
 * M09 — registre des îlots de la ville (un seul en mémoire à la fois, cadrage `docs/M09_CADRAGE_VILLE.md` §2) : plan
 * pur, personnages, passants, bornes de la caméra, constructeur de la scène. Les sorties d'un îlot nomment l'îlot voisin
 * (`Zone.target`) et le point d'apparition d'arrivée.
 */
import type { Ilot } from './monde';
import { P_NPCS, PARVIS } from './parvis';
import { NPCS, QUAI, type IlotNpc } from './quai';
import { buildParvis, buildQuai, type QuaiScene } from './scene';

export type IlotId = 'quai' | 'parvis';

export interface Passer { id: string; x0: number; x1: number; z: number; speed: number; phase?: number }

export interface IlotDef {
  id: IlotId;
  ilot: Ilot;
  npcs: readonly IlotNpc[];
  ambient: readonly Passer[];
  /** Bornes du point visé par la caméra (l'îlot ne sort pas du cadre). */
  camera: { minX: number; maxX: number };
  build(artSeed: number): QuaiScene;
  /** Liaisons : zone de sortie → îlot voisin et point d'apparition à l'arrivée. */
  exits: Readonly<Record<string, { to: IlotId; spawn: string }>>;
}

export const ILOTS: Record<IlotId, IlotDef> = {
  quai: {
    id: 'quai', ilot: QUAI, npcs: NPCS, camera: { minX: -11, maxX: 11 }, build: buildQuai,
    ambient: [
      { id: 'pnj-joueuse-1', x0: -16.5, x1: -5.5, z: 2.35, speed: 0.95, phase: 0.3 },
      { id: 'pnj-docker-9', x0: 5.5, x1: 16.5, z: 2.5, speed: 1.1, phase: 0.7 },
    ],
    exits: { 'sortie-arene': { to: 'parvis', spawn: 'arrivee' } },
  },
  parvis: {
    id: 'parvis', ilot: PARVIS, npcs: P_NPCS, camera: { minX: -8, maxX: 8 }, build: buildParvis,
    ambient: [{ id: 'pnj-commis-2', x0: -11, x1: 11, z: 2.2, speed: 0.85, phase: 0.55 }],
    exits: { 'sortie-quai': { to: 'quai', spawn: 'sortie-arene' } },
  },
};

export const isIlotId = (x: unknown): x is IlotId => x === 'quai' || x === 'parvis';
