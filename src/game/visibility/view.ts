/**
 * Projections de visibilité (contrat 03) : ce qu’un joueur — humain ou IA — a le droit de voir.
 * La vue est construite par COPIE filtrée ; aucune référence à l’état brut n’est exposée.
 * Les cartes cachées adverses n’ont ni identifiant d’instance ni définition dans la vue.
 */
import { cardDef } from '../catalog/cards';
import type { TechniqueId } from '../catalog/techniques';
import {
  other, PLAYERS, SLOTS,
  type ClashReport, type GameEvent, type GameState, type Phase, type PlayerId,
  type RevealedTactic, type SecondaryState, type SlotIndex, type Stance,
} from '../model/types';
import type { Family } from '../catalog/cards';

export interface CardRef { cardId: string; defId: string }

export interface SlotView {
  slot: SlotIndex;
  state: SecondaryState;
  placedTurn: number;
  revealedTurn: number | null;
  /** Identité visible pour ce spectateur (null = face cachée / masquée). */
  card: CardRef | null;
  /** Masquée par Dissimulation (vue adverse) — identité, Rang, Puissance cachés. */
  masked: boolean;
  /** Famille publique d’une carte active (visible même masquée, §13.2) ; null si face cachée. */
  family: Family | null;
  /** Source d’un camouflage actif (carte Dissimulation). */
  maskSource: boolean;
}

export interface SideView {
  id: PlayerId;
  name: string;
  hp: number;
  maxHp: number;
  insight: number;
  insightGained: number;
  techniques: TechniqueId[];
  techniqueUsed: TechniqueId | null;
  signatureFamily: Family;
  handCount: number;
  /** Uniquement pour soi-même. */
  hand: CardRef[] | null;
  deckCount: number;
  /** Défausse publique ; `null` : carte camouflée défaussée ce tour, nommée à la fin du tour (ARB-005). */
  discard: Array<string | null>;
  slots: [SlotView | null, SlotView | null];
  /** Primaire : identité/mode visibles pour soi, ou après révélation simultanée. */
  primary: null | { committed: true; card: CardRef | null; stance: Stance | null; initialStance: Stance | null };
  locked: boolean;
}

export interface PlayerView {
  viewer: PlayerId;
  seed: number;
  turn: number;
  phase: Phase;
  awaitingMe: boolean;
  awaitingOpponent: boolean;
  me: SideView;
  opp: SideView;
  reveal: {
    primaries: Record<'me' | 'opp', { defId: string; stance: Stance }> | null;
    tactics: Record<'me' | 'opp', Array<RevealedTactic | null>> | null;
  };
  lastClash: ClashReport | null;
  repel: null | { mine: boolean; kind: string; choices: SlotIndex[] };
  lectureUsers: Array<'me' | 'opp'>;
  /** Mode initial adverse vu par Lecture (uniquement pour l’utilisateur de Lecture). */
  lectureSeen: Stance | null;
  winner: 'me' | 'opp' | null;
  overtime: number;
  rules: string;
}

function side(state: GameState, pid: PlayerId, viewer: PlayerId): SideView {
  const p = state.players[pid];
  const self = pid === viewer;
  const revealed = !!state.reveal.primaries;
  const slots = SLOTS.map((i): SlotView | null => {
    const sl = p.slots[i];
    if (!sl) return null;
    const st: SecondaryState = sl.active ? 'active' : sl.placedTurn >= state.turn ? 'charging' : 'hidden';
    const maskedNow = p.mask?.target === i;
    // Information déjà publique avant ce tour : jamais « désapprise » (§11.3).
    const knownBefore = sl.active && sl.revealedTurn !== null && sl.revealedTurn < state.turn;
    const visible = self || (sl.active && (!maskedNow || knownBefore));
    const inst = state.cards[sl.cardId]!;
    return {
      slot: i,
      state: st,
      placedTurn: sl.placedTurn,
      revealedTurn: sl.revealedTurn,
      card: visible ? { cardId: inst.id, defId: inst.defId } : null,
      masked: maskedNow && !knownBefore,
      family: sl.active || self ? cardDef(inst.defId).family : null,
      maskSource: p.mask?.source === i,
    };
  }) as [SlotView | null, SlotView | null];
  let primary: SideView['primary'] = null;
  if (p.primary) {
    const inst = state.cards[p.primary.cardId]!;
    const show = self || revealed;
    primary = {
      committed: true,
      card: show ? { cardId: inst.id, defId: inst.defId } : null,
      stance: show ? p.primary.stance : null,
      initialStance: self ? p.primary.initialStance : null,
    };
  }
  return {
    id: pid,
    name: p.name,
    hp: p.hp,
    maxHp: p.maxHp,
    insight: p.insight,
    insightGained: p.insightGained,
    techniques: [...p.techniques],
    techniqueUsed: p.techniqueUsed,
    signatureFamily: p.signatureFamily,
    handCount: p.hand.length,
    hand: self ? p.hand.map((id) => ({ cardId: id, defId: state.cards[id]!.defId })) : null,
    deckCount: p.deck.length,
    discard: p.discard.map((id) => (!self && p.maskedDiscards.includes(id) ? null : state.cards[id]!.defId)),
    slots,
    primary,
    locked: !!state.pending[pid],
  };
}

export function viewFor(state: GameState, viewer: PlayerId): PlayerView {
  const o = other(viewer);
  const rel = (pid: PlayerId): 'me' | 'opp' => (pid === viewer ? 'me' : 'opp');
  const prim = state.reveal.primaries;
  const tac = state.reveal.tactics;
  return {
    viewer,
    seed: state.seed,
    turn: state.turn,
    phase: state.phase,
    awaitingMe: state.awaiting.includes(viewer) && !state.pending[viewer],
    awaitingOpponent: state.awaiting.includes(o) && !state.pending[o],
    me: side(state, viewer, viewer),
    opp: side(state, o, viewer),
    reveal: {
      primaries: prim ? { me: { ...prim[viewer] }, opp: { ...prim[o] } } : null,
      tactics: tac ? { me: structuredClone(tac[viewer]), opp: structuredClone(tac[o]) } : null,
    },
    // Rapport public par construction (valeurs camouflées à null dès le moteur) : simple copie.
    lastClash: state.lastClash ? structuredClone(state.lastClash) : null,
    repel: state.repel ? { mine: state.repel.owner === viewer, kind: state.repel.kind, choices: state.repel.owner === viewer ? [...state.repel.choices] : [] } : null,
    lectureUsers: state.lectureUsers.map(rel),
    lectureSeen: state.lectureUsers.includes(viewer) ? state.players[o].primary?.initialStance ?? null : null,
    winner: state.winner ? rel(state.winner) : null,
    overtime: state.overtime,
    rules: state.rules,
  };
}

/** Événements visibles par un joueur (publics + privés le concernant). */
export function visibleEvents(events: readonly GameEvent[], viewer: PlayerId): GameEvent[] {
  return events.filter((e) => e.vis === 'public' || e.vis === viewer);
}

/** Journal public strict (spectateur / export) : aucun événement privé. */
export function publicEvents(events: readonly GameEvent[]): GameEvent[] {
  return events.filter((e) => e.vis === 'public');
}

export function defName(defId: string): string {
  return cardDef(defId).name;
}

export { PLAYERS };
