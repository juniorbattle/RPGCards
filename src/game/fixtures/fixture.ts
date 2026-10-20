/**
 * Constructeur d’états de démonstration / test (QA, captures déterministes).
 * Ne fait PAS partie du flux de jeu normal : il fabrique un état légal (invariants vérifiés)
 * au début de la phase COMMIT ou PREPARE d’un tour donné.
 */
import { createGame } from '../engine/engine';
import { assertInvariants } from '../engine/invariants';
import type { GameConfig, GameState, PlayerId, SlotIndex } from '../model/types';

/** Définition courte : `Cendre-3` (Basic), `Cendre-3-ferveur`, `sig-Cendre`, `neutre-3` (avenant M10-A). */
export function d(short: string): string {
  if (short.startsWith('sig-') || short.startsWith('neutre-')) return short;
  return /-\d$/.test(short) ? `${short}-basic` : short;
}

export function idOf(state: GameState, pid: PlayerId, defId: string): string {
  const inst = Object.values(state.cards).find((c) => c.owner === pid && c.defId === defId);
  if (!inst) throw new Error(`Carte ${defId} absente du deck de ${pid}`);
  return inst.id;
}

export interface SideSetup {
  hand: string[];
  slots?: Array<null | { def: string; active?: boolean; charging?: boolean }>;
  insight?: number;
  hp?: number;
  /** Cartes à placer au sommet de la pioche (dernier = sommet). */
  deckTop?: string[];
}

export function fixture(cfg: GameConfig, p1: SideSetup, p2: SideSetup, opts: { turn?: number; phase?: 'COMMIT' | 'PREPARE' } = {}): GameState {
  const { state } = createGame(cfg);
  const s = structuredClone(state);
  const turn = opts.turn ?? 5;
  s.turn = turn;
  for (const [pid, setup] of [['p1', p1], ['p2', p2]] as const) {
    const p = s.players[pid];
    const all = [...p.deck, ...p.hand, ...p.discard];
    p.hand = [];
    p.discard = [];
    p.slots = [null, null];
    // première instance encore libre de cette définition (les neutres ont quatre instances par Rang, avenant M10-A)
    const take = (short: string) => {
      idOf(s, pid, d(short));
      const i = all.findIndex((x) => s.cards[x]!.defId === d(short));
      if (i < 0) throw new Error(`Carte déjà utilisée : ${short}`);
      const id = all[i]!;
      all.splice(i, 1);
      return id;
    };
    p.hand = setup.hand.map(take);
    (setup.slots ?? []).forEach((sl, i) => {
      if (!sl) return;
      const id = take(sl.def);
      p.slots[i as SlotIndex] = { cardId: id, placedTurn: sl.charging ? turn : sl.active ? turn - 3 : turn - 1, active: !!sl.active, revealedTurn: sl.active ? turn - 2 : null };
    });
    const top = (setup.deckTop ?? []).map(take);
    p.deck = [...all, ...top];
    if (setup.insight !== undefined) p.insight = setup.insight;
    if (setup.hp !== undefined) p.hp = setup.hp;
  }
  s.phase = opts.phase ?? 'COMMIT';
  s.awaiting = s.phase === 'COMMIT' ? ['p1', 'p2'] : (['p1', 'p2'] as PlayerId[]).filter((pid) => s.players[pid].slots.some((x) => x && !x.active && x.placedTurn < turn));
  s.pending = {};
  assertInvariants(s);
  return s;
}
