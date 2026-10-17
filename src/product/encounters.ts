/**
 * Rivaux et rencontres — DONNÉES DE PROTOTYPE, NON CANONIQUES (M04/M05).
 *
 * Les PV sont propres à chaque personnage (§9.1 : pas de réserve universelle, repères de calibration
 * 60 / 90 / 125…) ; la difficulté vient du deck du rival (variantes équipées), de ses Techniques et
 * de son profil d’IA, jamais d’une IA qui tricherait. Tout chiffre ici est réglable par donnée et
 * signalé « provisoire » dans l’interface.
 */
import { FAMILIES, type Family } from '../game/catalog/cards';
import type { TechniqueId } from '../game/catalog/techniques';
import type { GameConfig } from '../game/model/types';
import { PERSONALITIES, type RivalPersonality } from '../presentation/personalities';
import { playerSeat, type DeckChoice } from './deck';

/** PV du duelliste joueur : repère « quartier » (§9.1), fixe tant qu’aucune progression de PV n’est ratifiée. */
export const PLAYER_HP = 90;

export interface RivalSheet {
  id: RivalPersonality['id'];
  hp: number;
  /** Identités jouées en variante par le rival (les autres en Basic). */
  variants: string[];
  techniques: TechniqueId[];
  /** Style tactique PUBLIC (profil comportemental, aucune intention cachée). */
  style: string;
  difficulty: 1 | 2 | 3;
}

const ids = (fam: Family, ranks: number[]) => ranks.map((r) => `${fam}-${r}`);

export const RIVALS: Record<RivalPersonality['id'], RivalSheet> = {
  braise: {
    id: 'braise', hp: 80, variants: [...ids('Cendre', [1, 2, 3, 4]), 'Astre-1'], techniques: ['Sondage', 'Lecture'], difficulty: 1,
    style: 'Attaque souvent, soutient peu ses Assauts et garde rarement ses Secondaires.',
  },
  ronce: {
    id: 'ronce', hp: 95, variants: [...ids('Ronce', [1, 2, 3, 4]), 'Cendre-1', 'Voile-1', 'Astre-1', 'Astre-2'], techniques: ['Ancrage', 'Rupture'], difficulty: 2,
    style: 'Prudente : Gardes renforcées, Secondaires conservées longtemps, Interférences de protection.',
  },
  voile: {
    id: 'voile', hp: 100, variants: FAMILIES.flatMap((f) => ids(f, [1, 2, 3, 4])), techniques: ['Lecture', 'Dissipation'], difficulty: 3,
    style: 'Lectrice : observe vos habitudes publiques, interfère volontiers et camoufle ses soutiens.',
  },
};

export const DIFFICULTY_LABEL: Record<1 | 2 | 3, string> = { 1: 'Abordable', 2: 'Coriace', 3: 'Redoutable' };

export interface Encounter {
  id: string;
  rival: RivalPersonality['id'];
  kind: 'free';
  title: string;
}

/** Duels libres contre chacun des rivaux (M04). */
export const ENCOUNTERS: Encounter[] = PERSONALITIES.map((p) => ({ id: `libre-${p.id}`, rival: p.id, kind: 'free', title: `Duel libre — ${p.name}` }));

export function encounterById(id: string): Encounter | null {
  return ENCOUNTERS.find((e) => e.id === id) ?? null;
}

export function personalityOf(id: RivalPersonality['id']): RivalPersonality {
  return PERSONALITIES.find((p) => p.id === id)!;
}

/** Configuration moteur d’une rencontre : siège joueur (deck du profil) contre siège rival (données). */
export function encounterConfig(enc: Encounter, deck: DeckChoice, seed: number): GameConfig {
  const p = personalityOf(enc.rival);
  const r = RIVALS[enc.rival];
  return {
    seed,
    players: {
      p1: playerSeat(deck, 'Vous', PLAYER_HP),
      p2: { name: p.name, hp: r.hp, signature: p.family, variants: [...r.variants], techniques: [...r.techniques] },
    },
  };
}
