/**
 * M07 L4 (ADR 020) — plan de feux de chaque écran hors duel : multiplicateurs des lumières du duel (salle,
 * projecteur du visage, projecteur de table, bougies, contre-jour). `duel` vaut 1 partout : le duel est inchangé.
 * M08 C2 (ADR 022) : les multiplicateurs s’appliquent aux réglages du lieu courant (`candle` = lumières pratiques).
 */
export type Staging = 'duel' | 'title' | 'board' | 'gallery' | 'portrait';
export interface StagingMul { house: number; key: number; stage: number; candle: number; back: number }
export const STAGING: Record<Staging, StagingMul> = {
  duel: { house: 1, key: 1, stage: 1, candle: 1, back: 1 },
  /** Accueil : salle noire, le rival seul dans son projecteur. */
  title: { house: 0.5, key: 1.12, stage: 0.5, candle: 0.7, back: 1.3 },
  /** Rencontres : salle baissée, la scène attend. */
  board: { house: 0.7, key: 1, stage: 0.75, candle: 0.85, back: 1.1 },
  /** Deck, collection, création, options, aide : la scène s’efface derrière les cartes. */
  gallery: { house: 0.42, key: 0.6, stage: 0.5, candle: 0.6, back: 0.8 },
  /** Préparation, résultat : le rival éclairé comme en duel, la table un peu en retrait. */
  portrait: { house: 0.85, key: 1.08, stage: 0.85, candle: 1, back: 1.15 },
};
