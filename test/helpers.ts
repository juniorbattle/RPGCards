import { cardDef } from '../src/game/catalog/cards';
import type { TechniqueId } from '../src/game/catalog/techniques';
import { applyCommand } from '../src/game/engine/engine';
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

export { d, fixture, idOf, type SideSetup } from '../src/game/fixtures/fixture';
import { d, idOf } from '../src/game/fixtures/fixture';

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
