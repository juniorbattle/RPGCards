import { cardDef } from '../src/game/catalog/cards';
import type { TechniqueId } from '../src/game/catalog/techniques';
import { applyCommand, createGame } from '../src/game/engine/engine';
import type { Command, GameConfig, GameEvent, GameState, PlayerId, SlotIndex, Stance, TacticPlan, TacticsTechnique } from '../src/game/model/types';
import type { Family } from '../src/game/catalog/cards';

export function config(opts: Partial<{ seed: number; sig1: Family; sig2: Family; v1: GameConfig['players']['p1']['variants']; v2: GameConfig['players']['p1']['variants']; t1: TechniqueId[]; t2: TechniqueId[]; hp1: number; hp2: number }> = {}): GameConfig {
  return {
    seed: opts.seed ?? 42,
    players: {
      p1: { name: 'Vous', hp: opts.hp1 ?? 90, signature: opts.sig1 ?? 'Cendre', variants: opts.v1 ?? 'none', techniques: opts.t1 ?? [] },
      p2: { name: 'Rival', hp: opts.hp2 ?? 90, signature: opts.sig2 ?? 'Ronce', variants: opts.v2 ?? 'none', techniques: opts.t2 ?? [] },
    },
  };
}

export function idOf(state: GameState, pid: PlayerId, defId: string): string {
  const inst = Object.values(state.cards).find((c) => c.owner === pid && c.defId === defId);
  if (!inst) throw new Error(`Carte ${defId} absente du deck de ${pid}`);
  return inst.id;
}

/** Définition courte : `Cendre-3` (Basic), `Cendre-3-ferveur`, `sig-Cendre`. */
export function d(short: string): string {
  if (short.startsWith('sig-')) return short;
  return /-\d$/.test(short) ? `${short}-basic` : short;
}

export interface SideSetup {
  hand: string[];
  /** Secondaires sur le terrain : actives (révélées un tour antérieur) ou cachées. */
  slots?: Array<null | { def: string; active?: boolean; charging?: boolean }>;
  insight?: number;
  hp?: number;
}

/**
 * Fixture : construit un état au début de la phase COMMIT du tour 5, avec mains/terrains imposés.
 * Le reste des cartes est en pioche (ordre de pioche conservé). Test-only.
 */
export function fixture(cfg: GameConfig, p1: SideSetup, p2: SideSetup): GameState {
  const { state } = createGame(cfg);
  const s = structuredClone(state);
  s.turn = 5;
  for (const [pid, setup] of [['p1', p1], ['p2', p2]] as const) {
    const p = s.players[pid];
    const all = [...p.deck, ...p.hand, ...p.discard];
    p.hand = [];
    p.discard = [];
    p.slots = [null, null];
    const take = (short: string) => {
      const id = idOf(s, pid, d(short));
      const i = all.indexOf(id);
      if (i < 0) throw new Error(`Carte déjà utilisée : ${short}`);
      all.splice(i, 1);
      return id;
    };
    p.hand = setup.hand.map(take);
    (setup.slots ?? []).forEach((sl, i) => {
      if (!sl) return;
      const id = take(sl.def);
      p.slots[i as SlotIndex] = { cardId: id, placedTurn: sl.charging ? 5 : 2, active: !!sl.active, revealedTurn: sl.active ? 3 : null };
    });
    p.deck = all;
    if (setup.insight !== undefined) p.insight = setup.insight;
    if (setup.hp !== undefined) p.hp = setup.hp;
  }
  s.phase = 'COMMIT';
  s.awaiting = ['p1', 'p2'];
  s.pending = {};
  return s;
}

export class Runner {
  events: GameEvent[] = [];
  constructor(public state: GameState) {}
  apply(cmd: Command): this {
    const r = applyCommand(this.state, cmd);
    this.state = r.state;
    this.events.push(...r.events);
    return this;
  }
  commit(pid: PlayerId, primary: string, stance: Stance, secondary: string | null = null, replaceSlot: SlotIndex | null = null): this {
    return this.apply({ type: 'commit', player: pid, primaryId: idOf(this.state, pid, d(primary)), stance, secondaryId: secondary ? idOf(this.state, pid, d(secondary)) : null, replaceSlot });
  }
  tactics(pid: PlayerId, plans: [TacticPlan | null, TacticPlan | null], technique: TacticsTechnique | null = null): this {
    return this.apply({ type: 'tactics', player: pid, plans, technique });
  }
  ev(kind: GameEvent['kind'], vis: GameEvent['vis'] | 'any' = 'any'): GameEvent[] {
    return this.events.filter((e) => e.kind === kind && (vis === 'any' || e.vis === vis));
  }
}

export const def = cardDef;
