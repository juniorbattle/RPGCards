/**
 * M07 L5 — registre des identités « vectoriel V2 » (une par rival, sur le socle commun `../figureV2`).
 */
import type { FigureV2Kit } from '../figureV2';
import { KAI_V2 } from './kai';
import { MAELLE_V2 } from './maelle';
import { ORIN_V2 } from './orin';
import { SELENE_V2 } from './selene';

const KITS: Record<string, FigureV2Kit> = {
  [KAI_V2.id]: KAI_V2,
  [MAELLE_V2.id]: MAELLE_V2,
  [SELENE_V2.id]: SELENE_V2,
  [ORIN_V2.id]: ORIN_V2,
};

/** Identités dessinées en V2 (ids de personnalité). */
export const V2_IDS: readonly string[] = Object.keys(KITS);

export function kitV2(id: string): FigureV2Kit | null {
  return KITS[id] ?? null;
}
