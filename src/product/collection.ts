/**
 * Collection du joueur — DÉBLOCAGES DE PROTOTYPE, NON CANONIQUES (M04 ; règles de gain en M05).
 *
 * §11.1 / §15.2 : la collection fait progresser par la SPÉCIALISATION (variantes qui remplacent une
 * identité), jamais par une carte supplémentaire ni un bonus de Puissance. Aucune monnaie, rareté
 * nouvelle ou rang de joueur : seulement « quelles cartes et Techniques existantes sont équipables ».
 */
import { FAMILIES } from '../game/catalog/cards';
import { TECHNIQUE_IDS } from '../game/catalog/techniques';
import { ALL_VARIANTS, variantA, variantsOf, type Collection, type DeckChoice } from './deck';

/** Départ (prototype) : 16 Basic, les 4 Signatures, 4 Techniques, et les variantes de Rang I de chaque famille (A, B et C
 *  depuis l'avenant 09). */
export const STARTER_COLLECTION: Collection = {
  variants: FAMILIES.flatMap((f) => variantsOf(`${f}-1`)),
  signatures: [...FAMILIES],
  techniques: ['Sondage', 'Recentrage', 'Lecture', 'Ancrage'],
};

/** Mode démo réversible (options) : tout le catalogue initial est équipable. */
export const FULL_COLLECTION: Collection = { variants: [...ALL_VARIANTS], signatures: [...FAMILIES], techniques: [...TECHNIQUE_IDS] };

/** Deck de départ légal avec la collection de départ : les variantes A de Rang I (comme avant l'avenant 09). */
export const STARTER_DECK: DeckChoice = { signature: 'Cendre', variants: FAMILIES.map((f) => variantA(`${f}-1`)), techniques: ['Lecture', 'Ancrage'] };
