import type { EffectId, Family } from '../catalog/cards';
import type { TechniqueId } from '../catalog/techniques';

export type PlayerId = 'p1' | 'p2';
export const PLAYERS: readonly PlayerId[] = ['p1', 'p2'];
export const other = (p: PlayerId): PlayerId => (p === 'p1' ? 'p2' : 'p1');

export type Stance = 'assault' | 'guard';
export type SlotIndex = 0 | 1;
export const SLOTS: readonly SlotIndex[] = [0, 1];

/**
 * Phases moteur (§5). Les phases optionnelles (DISSIPATION, LECTURE, LECTURE_CHANGE, REPEL)
 * ne sont ouvertes que si une décision non triviale existe d’après l’information publique.
 */
export type Phase =
  | 'START'
  | 'PREPARE'
  | 'DISSIPATION'
  | 'COMMIT'
  | 'LECTURE'
  | 'LECTURE_CHANGE'
  | 'TACTICS'
  | 'REPEL'
  | 'RESOLVED'
  | 'ENDED';

/** Instance physique : identifiant stable `p1#07`, la définition est séparée. */
export interface CardInstance {
  id: string;
  owner: PlayerId;
  defId: string;
}

export interface SecondarySlot {
  cardId: string;
  placedTurn: number;
  active: boolean;
  revealedTurn: number | null;
}

export type SecondaryState = 'charging' | 'hidden' | 'active';

export type TacticMode = 'keep' | 'rank' | 'damage' | 'interfere';
export interface TacticPlan {
  mode: TacticMode;
  /** Emplacement adverse visé pour `interfere`. */
  target?: SlotIndex;
}

export type StartTechnique = { id: 'Sondage' } | { id: 'Recentrage'; cardId: string };
export type TacticsTechnique = { id: 'Ancrage'; slot: SlotIndex } | { id: 'Rupture'; targetSlot: SlotIndex };

export type Command =
  | { type: 'start'; player: PlayerId; discard: string[]; technique: StartTechnique | null }
  | { type: 'prepare'; player: PlayerId; reveal: SlotIndex[] }
  | { type: 'dissipate'; player: PlayerId; targetSlot: SlotIndex | null }
  | { type: 'commit'; player: PlayerId; primaryId: string; stance: Stance; secondaryId: string | null; replaceSlot: SlotIndex | null; slot?: SlotIndex }
  | { type: 'lecture'; player: PlayerId; use: boolean }
  | { type: 'lectureStance'; player: PlayerId; stance: Stance }
  | { type: 'tactics'; player: PlayerId; plans: [TacticPlan | null, TacticPlan | null]; technique: TacticsTechnique | null }
  | { type: 'repel'; player: PlayerId; targetSlot: SlotIndex | null }
  | { type: 'nextTurn' };

export type PlayerCommand = Exclude<Command, { type: 'nextTurn' }>;

export interface PlayerState {
  id: PlayerId;
  name: string;
  hp: number;
  maxHp: number;
  insight: number;
  insightGained: number;
  techniqueUsed: TechniqueId | null;
  techniques: TechniqueId[];
  signatureFamily: Family | null;
  /** Pioche : index 0 = dessous, dernier = sommet. */
  deck: string[];
  hand: string[];
  discard: string[];
  slots: [SecondarySlot | null, SecondarySlot | null];
  primary: { cardId: string; stance: Stance; initialStance: Stance } | null;
  /** Camouflage Dissimulation actif ce tour : source (Dissimulation) et cible masquée. */
  mask: { source: SlotIndex; target: SlotIndex } | null;
  /**
   * Instances défaussées CE tour alors qu’elles étaient camouflées (consommées ou remplacées) : leur
   * identité ne devient publique qu’à la fin du tour (ARB-005) ; la vue adverse les montre `null`.
   */
  maskedDiscards: string[];
}

/** Données privées de résolution conservées pendant la fenêtre REPEL. */
export interface PendingRepel {
  owner: PlayerId;
  kind: 'basic' | 'emprise' | 'flamme' | 'rupture';
  choices: SlotIndex[];
  toBottom: boolean;
  racine: boolean;
  /** Case de la Racine engagée si elle était camouflée (déjà consommée) : son effet reste privé. */
  racineHiddenSlot?: SlotIndex;
}

export interface GameConfig {
  seed: number;
  players: Record<PlayerId, {
    name: string;
    hp: number;
    /** `null` : aucune Signature (deck Aventure avant le premier chef, avenant M10-A proposé). */
    signature: Family | null;
    variants: 'all' | 'none' | string[];
    /** Avenant M10-A (PROPOSÉ) : liste explicite des définitions du deck (mode Aventure) ; absent : deck standard. */
    deck?: string[];
    techniques: TechniqueId[];
    insightStart?: number;
  }>;
}

export interface GameState {
  schema: 1;
  rules: 'V3.0+delta-V3.3.1';
  seed: number;
  rng: number;
  turn: number;
  phase: Phase;
  cards: Record<string, CardInstance>;
  players: Record<PlayerId, PlayerState>;
  /** Décisions verrouillées secrètement pour la phase courante (jamais projetées publiquement). */
  pending: Partial<Record<PlayerId, PlayerCommand>>;
  /** Joueurs dont une décision est attendue dans la phase courante. */
  awaiting: PlayerId[];
  lectureUsers: PlayerId[];
  repel: PendingRepel | null;
  lastClash: ClashReport | null;
  /** Informations publiques du Clash courant (après révélations), conservées jusqu’au tour suivant. */
  reveal: {
    primaries: Record<PlayerId, { defId: string; stance: Stance }> | null;
    tactics: Record<PlayerId, Array<RevealedTactic | null>> | null;
    /** Avenant 08 : Signature engagée en Primaire, annoncée (identité seule, jamais le mode) dès le verrouillage de son
     *  propriétaire ; publique jusqu’au tour suivant. */
    signatures: Record<PlayerId, string | null>;
  };
  winner: PlayerId | null;
  overtime: number;
  eventSeq: number;
}

export type Visibility = 'public' | PlayerId;

export interface GameEvent {
  seq: number;
  turn: number;
  phase: Phase;
  vis: Visibility;
  kind: EventKind;
  data: Record<string, unknown>;
}

export type EventKind =
  | 'turnStart' | 'draw' | 'shuffle' | 'trim' | 'technique' | 'peek' | 'recentrage'
  | 'secondaryRevealed' | 'masking' | 'dissipation' | 'locked'
  | 'committed' | 'replaced' | 'signatureAnnounced' | 'lecture' | 'primariesRevealed' | 'effectArmed'
  | 'tacticsRevealed' | 'interference' | 'clash' | 'effect' | 'damage' | 'heal'
  | 'insight' | 'destination' | 'repel' | 'repelSkipped' | 'overtime' | 'victory' | 'turnEnd';

/**
 * Rapport public de Clash : seules des informations autorisées après verrouillage. Public PAR
 * CONSTRUCTION : `GameState.lastClash`, l’événement public `clash` et `PlayerView.lastClash` (copie)
 * portent ce même rapport. Une valeur camouflée par Dissimulation ce tour y vaut `null` (affichée
 * `'?'`) ; sa valeur réelle ne parvient qu’à son propriétaire, par l’événement privé `clash` (`own`).
 */
export interface ClashReport {
  turn: number;
  outcome: 'win' | 'tie-assault' | 'double-guard';
  winner: PlayerId | null;
  guardWin: boolean;
  /** `null` : soutien Rang camouflé (`publicScores` = '?'). */
  scores: Record<PlayerId, number | 'inf' | null>;
  publicScores: Record<PlayerId, string>;
  /** `null` : soutien Dégâts camouflé (`publicMultipliers` = '?'). */
  multipliers: Record<PlayerId, number | null>;
  publicMultipliers: Record<PlayerId, string>;
  baseDamage: Record<PlayerId, number>;
  fixedDamage: Record<PlayerId, number>;
  damage: Record<PlayerId, number>;
  absorbed: number;
  powers: Record<PlayerId, number>;
  stances: Record<PlayerId, Stance>;
  zeroDamageRankWin: boolean;
  /** Usages annulés par Interférence (public après verrouillage commun). */
  cancelled: Record<PlayerId, SlotIndex[]>;
  /** Effets tels que PUBLIÉS (ADR 011) : ceux d’une Secondaire camouflée n’y figurent que sous forme générique. */
  effects: PublicEffect[];
}

/**
 * Payload PUBLIC d’un événement `effect` (ADR 011), construit par liste blanche. Effet d’une carte
 * publique : nom, statut, motif (inchangé). Effet d’une Secondaire camouflée : `effect: null`, origine
 * générique (famille et case, publiques) et SEULE conséquence publiquement observable, jamais un échec.
 */
export interface PublicEffect {
  player: PlayerId;
  effect: EffectId | 'rupture' | null;
  status: 'success' | 'failed' | 'cancelled';
  detail: string;
  technique?: true;
  masked?: true;
  family?: Family | null;
  slot?: SlotIndex;
  /** Effet de Primaire neutralisé par une Secondaire camouflée : origine générique (famille, case). */
  by?: { player: PlayerId; family: Family | null; slot: SlotIndex };
}

export interface RevealedTactic {
  slot: SlotIndex;
  mode: TacticMode;
  target: SlotIndex | null;
  defId: string | null;
  /** Famille toujours publique (§13.2), même sous camouflage ; `null` : carte neutre. */
  family: Family | null;
  masked: boolean;
  value: number | null;
  affinity: boolean | null;
}

export class RuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RuleError';
  }
}
