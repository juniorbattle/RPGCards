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
import { CHEF_KITS } from './chefs';
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
  // M10-C : les quatre chefs de famille du mode Aventure (`chef-<famille>`), hors des rivaux signatures
  const chef = CHEF_KITS[id];
  if (chef) return chef;
  if (id.startsWith('pnj-')) return npcKitV2(id);
  const fam = id.startsWith('player-') ? id.slice('player-'.length) : null;
  // `player-gris` : duelliste sans Signature (deck d'aventure, avenant M10-A), tenue grise sans emblème
  if (fam === 'gris') return playerKitV2('gris');
  return fam && (FAMILIES as readonly string[]).includes(fam) ? playerKitV2(fam as Family) : null;
}

/** Rival signature de chaque famille (repli de `figureKitV2`). */
const BY_FAMILY: Record<Family, FigureV2Kit> = { Cendre: KAI_V2, Ronce: MAELLE_V2, Voile: SELENE_V2, Astre: ORIN_V2 };

/**
 * Identité V2 d’une figure (rig du rival, portraits), jamais nulle depuis le retrait du rendu V1 (M08 C5) : toute
 * figure que le jeu produit en a une (quatre rivaux, PNJ `pnj-…` valides, joueur `player-<Famille>`). Repli sûr pour un
 * identifiant sans identité, qu’aucune donnée du jeu ne produit : l’identité du rival signature de sa famille, plutôt
 * qu’une scène ou un portrait en échec.
 */
export function figureKitV2(f: { id: string; family: Family | null }): FigureV2Kit {
  return kitV2(f.id) ?? BY_FAMILY[f.family ?? 'Cendre'];
}
