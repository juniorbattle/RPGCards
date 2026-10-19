/**
 * M07 L5 — registre des identités « vectoriel V2 » (une par rival, sur le socle commun `../figureV2`), plus le duelliste
 * joueur (`player-<Famille>`, portrait du HUD), dont la tenue suit la famille de sa Signature, et (M08 C3) les
 * duellistes PNJ de la ville (`pnj-<gabarit>-<graine>`, `./pnj`).
 */
import { FAMILIES, type Family } from '../../game/catalog/cards';
import type { FigureV2Kit } from '../figureV2';
import { playerKitV2 } from './joueur';
import { KAI_V2 } from './kai';
import { MAELLE_V2 } from './maelle';
import { ORIN_V2 } from './orin';
import { npcKitV2 } from './pnj';
import { SELENE_V2 } from './selene';

const KITS: Record<string, FigureV2Kit> = {
  [KAI_V2.id]: KAI_V2,
  [MAELLE_V2.id]: MAELLE_V2,
  [SELENE_V2.id]: SELENE_V2,
  [ORIN_V2.id]: ORIN_V2,
};

/** Rivaux dessinés en V2 (ids de personnalité). */
export const V2_IDS: readonly string[] = Object.keys(KITS);

/** Identité V2 d’un rival (id de personnalité), du duelliste joueur (`player-<Famille>`) ou d’un PNJ (`pnj-…`). */
export function kitV2(id: string): FigureV2Kit | null {
  const rival = KITS[id];
  if (rival) return rival;
  if (id.startsWith('pnj-')) return npcKitV2(id);
  const fam = id.startsWith('player-') ? id.slice('player-'.length) : null;
  return fam && (FAMILIES as readonly string[]).includes(fam) ? playerKitV2(fam as Family) : null;
}
