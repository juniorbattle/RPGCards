/**
 * M08 C2 — lieux des duels (ADR 022) : identifiants et intention de chaque lieu. Données pures (aucun three.js),
 * lues par le produit (une rencontre déclare son lieu, `product/encounters.ts`) ; le décor, le plan de feux et
 * l’ambiance de chaque lieu sont montés par `src/scene/venues/`.
 *
 * Seuls les lieux construits figurent ici : le bar et l’arène s’ajouteront après la porte de validation de la rue.
 */
export const VENUE_IDS = ['salle', 'rue'] as const;
export type VenueId = (typeof VENUE_IDS)[number];

/** Lieu par défaut : la salle de jeu de cartes, décor historique du duel (M03 à M07). */
export const DEFAULT_VENUE: VenueId = 'salle';

export interface VenueInfo {
  id: VenueId;
  /** Nom du lieu dans le monde du jeu. */
  name: string;
  /** Catégorie du mandat M08 (rue, salle de jeu de cartes, bar, arène). */
  kind: string;
  /** Intention de mise en scène, en une ligne. */
  mood: string;
}

export const VENUES: Record<VenueId, VenueInfo> = {
  salle: { id: 'salle', name: 'Le Cercle', kind: 'Salle de jeu de cartes', mood: 'Cercle de jeu cossu, à la bougie : bannières des quatre familles, arches ouvertes sur la nuit.' },
  rue: { id: 'rue', name: 'Le Quai', kind: 'Rue', mood: 'La rue des docks, la nuit : lanternes, pavés mouillés, brume du port.' },
};

export function isVenueId(x: unknown): x is VenueId {
  return typeof x === 'string' && (VENUE_IDS as readonly string[]).includes(x);
}
