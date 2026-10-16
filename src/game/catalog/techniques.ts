/** §12 — Insight et six Techniques. */
export const TECHNIQUE_IDS = ['Sondage', 'Recentrage', 'Lecture', 'Ancrage', 'Rupture', 'Dissipation'] as const;
export type TechniqueId = (typeof TECHNIQUE_IDS)[number];

export type TechniqueWindow = 'start' | 'dissipation' | 'lecture' | 'tactics';

export interface TechniqueDef {
  id: TechniqueId;
  cost: 1 | 2;
  window: TechniqueWindow;
  timing: string;
  text: string;
}

export const TECHNIQUES: Record<TechniqueId, TechniqueDef> = {
  Sondage: { id: 'Sondage', cost: 1, window: 'start', timing: 'Début de tour, avant engagement', text: 'Observe privément une carte aléatoire de la main adverse.' },
  Recentrage: { id: 'Recentrage', cost: 1, window: 'start', timing: 'Début de tour, avant engagement', text: 'Place une carte de votre main sous votre pioche, puis piochez une carte.' },
  Lecture: { id: 'Lecture', cost: 2, window: 'lecture', timing: 'Après engagement, avant révélation des Primaires', text: 'Observe le mode initial (Assaut/Garde) adverse, puis vous pouvez changer le mode de votre Primaire.' },
  Ancrage: { id: 'Ancrage', cost: 1, window: 'tactics', timing: 'Fenêtre tactique', text: 'Désigne une de vos Secondaires engagées : si une Interférence l’annule, elle reste active sur son emplacement (son action reste annulée).' },
  Rupture: { id: 'Rupture', cost: 2, window: 'tactics', timing: 'Fenêtre tactique, Primaire en Garde', text: 'Désigne une Secondaire adverse active : si votre Garde gagne, sans cible cachée repoussable, et que la cible reste active, elle retourne en main adverse.' },
  Dissipation: { id: 'Dissipation', cost: 1, window: 'dissipation', timing: 'Après révélation volontaire, avant engagement', text: 'Neutralise jusqu’à la fin du tour un effet persistant de préparation adverse (camouflage).' },
};

export const INSIGHT_MAX = 2;
export const INSIGHT_START = 1;
