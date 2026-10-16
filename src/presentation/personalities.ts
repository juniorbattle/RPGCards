/**
 * Personnalités de rivaux — PROVISOIRES (aucun personnage canonique validé).
 * Une personnalité relie : apparence procédurale, tempérament expressif et profil tactique de l’IA.
 * Les expressions dépendent du tempérament et des événements PUBLICS uniquement (pas de tells).
 */
import type { Family } from '../game/catalog/cards';
import type { TechniqueId } from '../game/catalog/techniques';

export type HairStyle = 'spiky' | 'braid' | 'bob';
export type Outfit = 'jacket' | 'cloak' | 'coat';

export interface RivalPersonality {
  id: 'braise' | 'ronce' | 'voile';
  name: string;
  title: string;
  /** Accord des libellés d’humeur (« concentré » / « concentrée »). */
  gender: 'f' | 'm';
  family: Family;
  aiProfile: 'offensif' | 'prudent' | 'lecteur';
  techniques: TechniqueId[];
  /** Tempérament : amplitude des réactions (0..1), humeur de repos. */
  expressiveness: number;
  restMood: Mood;
  look: {
    skin: string;
    skinShade: string;
    hair: string;
    hairHi: string;
    hairStyle: HairStyle;
    outfit: Outfit;
    cloth: string;
    clothHi: string;
    trim: string;
    eyes: string;
    jaw: number; // 0 rond … 1 anguleux
    mark: 'scar' | 'freckles' | 'beauty' | null;
    headband: boolean;
  };
}

export type Mood =
  | 'neutral' | 'focused' | 'confident' | 'smug' | 'pleased' | 'triumphant'
  | 'surprised' | 'pained' | 'annoyed' | 'angry' | 'relieved' | 'defeated' | 'thinking' | 'shocked';

export const PERSONALITIES: RivalPersonality[] = [
  {
    id: 'braise', name: 'Kaï', title: 'la Braise du quai', gender: 'm', family: 'Cendre', aiProfile: 'offensif',
    techniques: ['Sondage', 'Lecture'], expressiveness: 1, restMood: 'confident',
    look: { skin: '#e2a982', skinShade: '#b9785a', hair: '#2a1410', hairHi: '#c2411d', hairStyle: 'spiky', outfit: 'jacket', cloth: '#7a2410', clothHi: '#d0541f', trim: '#ffb347', eyes: '#d98a1e', jaw: 0.8, mark: 'scar', headband: true },
  },
  {
    id: 'ronce', name: 'Maëlle', title: 'gardienne des Ronces', gender: 'f', family: 'Ronce', aiProfile: 'prudent',
    techniques: ['Ancrage', 'Rupture'], expressiveness: 0.55, restMood: 'neutral',
    look: { skin: '#c98e6a', skinShade: '#9a6248', hair: '#3b2a1a', hairHi: '#7a5a34', hairStyle: 'braid', outfit: 'cloak', cloth: '#1d4a29', clothHi: '#3f8a46', trim: '#d4ec7a', eyes: '#4f9a4a', jaw: 0.3, mark: 'freckles', headband: false },
  },
  {
    id: 'voile', name: 'Sélène', title: 'liseuse du Voile', gender: 'f', family: 'Voile', aiProfile: 'lecteur',
    techniques: ['Lecture', 'Dissipation'], expressiveness: 0.75, restMood: 'smug',
    look: { skin: '#f0c9b0', skinShade: '#c99a82', hair: '#c9cbe8', hairHi: '#ffffff', hairStyle: 'bob', outfit: 'coat', cloth: '#2f2d6e', clothHi: '#5d63c4', trim: '#a8e6ff', eyes: '#8a5cd6', jaw: 0.45, mark: 'beauty', headband: true },
  },
];

export function personalityFor(seed: number, forced?: string | null): RivalPersonality {
  const byId = PERSONALITIES.find((p) => p.id === forced);
  if (byId) return byId;
  return PERSONALITIES[((seed % 3) + 3) % 3]!;
}
