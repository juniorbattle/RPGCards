/**
 * Rivaux et rencontres — DONNÉES DE PROTOTYPE, NON CANONIQUES (M04/M05 ; duellistes PNJ de la ville : M08 C3).
 *
 * Les PV sont propres à chaque personnage (§9.1 : pas de réserve universelle, repères de calibration
 * 60 / 90 / 125…) ; la difficulté vient du deck du rival (variantes équipées), de ses Techniques et
 * de son profil d’IA, jamais d’une IA qui tricherait. Tout chiffre ici est réglable par donnée et
 * signalé « provisoire » dans l’interface.
 */
import { FAMILIES, type Family } from '../game/catalog/cards';
import type { TechniqueId } from '../game/catalog/techniques';
import type { GameConfig } from '../game/model/types';
import { NPC_TEMPLATES, type NpcId } from '../presentation/npcs';
import { PERSONALITIES, isSignatureRival, personalityById, type OpponentId, type RivalPersonality, type SignatureRivalId } from '../presentation/personalities';
import { DEFAULT_VENUE, type VenueId } from '../presentation/venues';
import { playerSeat, type DeckChoice } from './deck';

/** PV du duelliste joueur : repère « quartier » (§9.1), fixe tant qu’aucune progression de PV n’est ratifiée. */
export const PLAYER_HP = 90;

export interface RivalSheet {
  id: OpponentId;
  hp: number;
  /** Identités jouées en variante par le rival (les autres en Basic). */
  variants: string[];
  techniques: TechniqueId[];
  /** Style tactique PUBLIC (profil comportemental, aucune intention cachée). */
  style: string;
  difficulty: 1 | 2 | 3;
}

const ids = (fam: Family, ranks: number[]) => ranks.map((r) => `${fam}-${r}`);

export const RIVALS: Record<SignatureRivalId, RivalSheet> = {
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
  astre: {
    id: 'astre', hp: 110, variants: FAMILIES.flatMap((f) => ids(f, [1, 2, 3, 4])), techniques: ['Recentrage', 'Ancrage'], difficulty: 3,
    style: 'Équilibré : alterne Assauts et Gardes, recycle ses soutiens et protège ses Secondaires engagées.',
  },
};

/** M08 C3 — style PUBLIC des profils génériques des PNJ (aucune intention cachée). */
const NPC_STYLE: Partial<Record<RivalPersonality['aiProfile'], string>> = {
  novice: 'Joue franc : engage souvent en Assaut et se sert peu de ses Techniques.',
  timide: 'Prudent : se met volontiers en Garde et garde ses Secondaires.',
};

/**
 * Fiche de jeu d’un adversaire. Rival signature : ses données ci-dessus. Duelliste PNJ : fiche générique de difficulté
 * basse — PV au repère bas de calibration (60, §9.1), deck tout en Basic, ses deux Techniques ordinaires, une étoile.
 */
export function sheetOf(id: string): RivalSheet {
  if (isSignatureRival(id)) return RIVALS[id];
  const p = personalityOf(id);
  return { id: p.id, hp: 60, variants: [], techniques: [...p.techniques], style: NPC_STYLE[p.aiProfile] ?? '', difficulty: 1 };
}

export const DIFFICULTY_LABEL: Record<1 | 2 | 3, string> = { 1: 'Abordable', 2: 'Coriace', 3: 'Redoutable' };

export interface Encounter {
  id: string;
  rival: OpponentId;
  /** `series` : étape d’une mini-série (dans l’ordre) ; `free` : rencontre libre, rejouable ; `town` : duel contre un
   *  duelliste PNJ de la ville (M08 C3), ouvert d’emblée, sans récompense. */
  kind: 'series' | 'free' | 'town';
  title: string;
  /** Étape 1..3 de la série. */
  step?: number;
  /** M08 C2 (ADR 022) : lieu du duel (décor, plan de feux, ambiance) ; par défaut la salle de jeu de cartes. */
  venue: VenueId;
}

/** Mini-série rejouable de trois duels (M05) : difficulté croissante, déclarative (données ci-dessus). */
export const SERIES = { id: 'quai', title: 'Tournoi du Quai', steps: ['braise', 'ronce', 'voile'] as SignatureRivalId[] };

/** M08 C3 — « Duels de la ville » de prototype : un duelliste PNJ par gabarit (identifiants `pnj-<gabarit>-<graine>`). */
export const TOWN_DUELS: readonly NpcId[] = ['pnj-docker-1', 'pnj-marchande-9', 'pnj-commis-5', 'pnj-joueuse-5'];

/**
 * M08 C2 — lieu des duels libres (porte de validation de la rue, décision du responsable du 2026-10-18) : Kaï, le
 * docker du Quai, se défie dans la rue ; les autres rencontres restent dans la salle de jeu de cartes.
 */
const FREE_VENUE: Partial<Record<RivalPersonality['id'], VenueId>> = { braise: 'rue' };

export const ENCOUNTERS: Encounter[] = [
  ...SERIES.steps.map((rival, i) => ({ id: `quai-${i + 1}`, rival, kind: 'series' as const, step: i + 1, title: `${SERIES.title} — manche ${i + 1} sur ${SERIES.steps.length}`, venue: DEFAULT_VENUE })),
  ...PERSONALITIES.map((p) => ({ id: `libre-${p.id}`, rival: p.id, kind: 'free' as const, title: `Duel libre — ${p.name}`, venue: FREE_VENUE[p.id] ?? DEFAULT_VENUE })),
  ...TOWN_DUELS.map((id) => { const p = personalityOf(id); return { id: `ville-${id}`, rival: id, kind: 'town' as const, venue: DEFAULT_VENUE, title: `Duel de la ville — ${p.name}, ${NPC_TEMPLATES[p.npc!].label.toLowerCase()}` }; }),
];

export function encounterById(id: string): Encounter | null {
  return ENCOUNTERS.find((e) => e.id === id) ?? null;
}

/** Personnalité d’un adversaire (rival signature ou PNJ) ; un identifiant inconnu est une erreur de données. */
export function personalityOf(id: string): RivalPersonality {
  const p = personalityById(id);
  if (!p) throw new Error(`Adversaire inconnu : ${id}`);
  return p;
}

/** Configuration moteur d’une rencontre : siège joueur (deck du profil) contre siège rival (données). */
export function encounterConfig(enc: Encounter, deck: DeckChoice, seed: number): GameConfig {
  const p = personalityOf(enc.rival);
  const r = sheetOf(enc.rival);
  return {
    seed,
    players: {
      p1: playerSeat(deck, 'Vous', PLAYER_HP),
      p2: { name: p.name, hp: r.hp, signature: p.family, variants: [...r.variants], techniques: [...r.techniques] },
    },
  };
}
