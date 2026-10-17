/**
 * Résumé PUBLIC d’un duel (résultat, historique) : construit à partir des seuls événements visibles
 * du siège du joueur et de sa vue — jamais d’un champ privé du rival (main, engagements, plans).
 */
import type { Family } from '../game/catalog/cards';
import type { GameEvent } from '../game/model/types';
import { visibleEvents, type PlayerView } from '../game/visibility/view';
import type { DuelOutcome, DuelSummary } from './save';

export interface SummaryInput {
  id: string;
  encounterId: string;
  rival: string;
  seed: number;
  signature: Family;
  view: PlayerView;
  events: readonly GameEvent[];
  /** Abandon décidé par le joueur (classé à part : ce n’est pas un K.-O.). */
  abandoned: boolean;
  at: Date;
}

export function summarize(i: SummaryInput): DuelSummary {
  const vis = visibleEvents([...i.events], 'p1');
  let dealt = 0;
  let taken = 0;
  for (const e of vis) {
    if (e.kind !== 'damage' || e.vis !== 'public') continue;
    const d = e.data as { player: string; amount: number };
    if (d.player === 'p2') dealt += d.amount;
    else if (d.player === 'p1') taken += d.amount;
  }
  const outcome: DuelOutcome = i.abandoned ? 'abandon' : i.view.winner === 'me' ? 'victory' : 'defeat';
  return {
    id: i.id, encounterId: i.encounterId, rival: i.rival, outcome, turns: i.view.turn, overtime: i.view.overtime,
    dealt, taken, hp: { me: i.view.me.hp, opp: i.view.opp.hp }, seed: i.seed, signature: i.signature, at: i.at.toISOString(),
  };
}

/** Bilan par rival : victoires / défaites / abandons. */
export function record(history: readonly DuelSummary[], rival: string): { w: number; l: number; a: number } {
  const r = { w: 0, l: 0, a: 0 };
  for (const h of history) {
    if (h.rival !== rival) continue;
    if (h.outcome === 'victory') r.w++;
    else if (h.outcome === 'defeat') r.l++;
    else r.a++;
  }
  return r;
}
