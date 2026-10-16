/**
 * Orchestrateur headless d’un duel : applique les commandes humaines, laisse jouer l’IA
 * sur SA projection, conserve le journal d’événements et l’enregistrement de replay.
 * Aucune dépendance DOM — utilisé par l’application, les tests et les outils.
 */
import { decide, PROFILES, type AiProfile } from './ai/policy';
import { buildMemory } from './ai/memory';
import { visibleEvents } from './visibility/view';
import { applyCommand, createGame } from './engine/engine';
import type { Command, GameConfig, GameEvent, GameState, PlayerCommand, PlayerId } from './model/types';
import { CATALOG_VERSION, hashGame, type ReplayRecord } from './replay/replay';
import { viewFor, type PlayerView } from './visibility/view';

export class Match {
  state: GameState;
  events: GameEvent[] = [];
  commands: Command[] = [];
  readonly config: GameConfig;

  constructor(config: GameConfig, public ai: Partial<Record<PlayerId, { profile: AiProfile; seed: number }>> = {}) {
    this.config = structuredClone(config);
    const { state, events } = createGame(config);
    this.state = state;
    this.events.push(...events);
  }

  view(pid: PlayerId): PlayerView {
    return viewFor(this.state, pid);
  }

  /** Applique une commande ; lève RuleError sans muter l’état si illégale. */
  submit(cmd: Command): GameEvent[] {
    const r = applyCommand(this.state, cmd);
    this.state = r.state;
    this.commands.push(structuredClone(cmd));
    this.events.push(...r.events);
    return r.events;
  }

  /** Fait jouer toutes les IA attendues (chacune sur sa propre vue). */
  stepAi(): GameEvent[] {
    const produced: GameEvent[] = [];
    for (let guard = 0; guard < 8; guard++) {
      let acted = false;
      for (const pid of ['p1', 'p2'] as PlayerId[]) {
        const ai = this.ai[pid];
        if (!ai) continue;
        const v = this.view(pid);
        if (!v.awaitingMe) continue;
        const cmd = decide(v, ai.profile, ai.seed, buildMemory(visibleEvents(this.events, pid), pid));
        if (cmd) {
          produced.push(...this.submit(cmd));
          acted = true;
        }
      }
      if (!acted) break;
    }
    return produced;
  }

  nextTurn(): GameEvent[] {
    return this.submit({ type: 'nextTurn' });
  }

  record(): ReplayRecord {
    return { format: 'lqv-replay/1', rules: this.state.rules, catalog: CATALOG_VERSION, config: structuredClone(this.config), commands: structuredClone(this.commands) };
  }

  hash(): string {
    return hashGame(this.state, this.events);
  }
}

/** Partie IA contre IA jusqu’à l’issue (ou plafond de sécurité de test, non règlementaire). */
export function autoplay(config: GameConfig, maxTurns = 200, profiles: [AiProfile, AiProfile] = [PROFILES.equilibre!, PROFILES.offensif!]): Match {
  const m = new Match(config, { p1: { profile: profiles[0], seed: config.seed ^ 0x51 }, p2: { profile: profiles[1], seed: config.seed ^ 0xa7 } });
  while (m.state.phase !== 'ENDED' && m.state.turn <= maxTurns) {
    m.stepAi();
    const phase: string = m.state.phase;
    if (phase === 'RESOLVED') m.nextTurn();
    else if (phase !== 'ENDED' && !m.state.awaiting.some((p) => !m.state.pending[p])) throw new Error(`Blocage en phase ${phase}`);
  }
  return m;
}

export type { PlayerCommand };
