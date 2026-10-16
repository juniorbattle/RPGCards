/**
 * Replay déterministe : config + seed + flux de commandes → même état et même journal normatif.
 * Le hash couvre l’état complet et les événements (publics ET privés).
 */
import { applyCommand, createGame } from '../engine/engine';
import { hashString } from '../engine/rng';
import type { Command, GameConfig, GameEvent, GameState } from '../model/types';

export const CATALOG_VERSION = 'catalogue-initial-V3.0+16v+4s+6t';

export interface ReplayRecord {
  format: 'lqv-replay/1';
  rules: GameState['rules'];
  catalog: string;
  config: GameConfig;
  commands: Command[];
}

export function replay(rec: ReplayRecord): { state: GameState; events: GameEvent[]; hash: string } {
  let { state, events } = createGame(rec.config);
  const all = [...events];
  for (const cmd of rec.commands) {
    const r = applyCommand(state, cmd);
    state = r.state;
    all.push(...r.events);
  }
  return { state, events: all, hash: hashGame(state, all) };
}

export function hashGame(state: GameState, events: readonly GameEvent[]): string {
  const h1 = hashString(JSON.stringify(state));
  const h2 = hashString(JSON.stringify(events));
  return `${h1.toString(16).padStart(8, '0')}${h2.toString(16).padStart(8, '0')}`;
}
