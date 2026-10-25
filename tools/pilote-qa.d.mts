// Types de `pilote-qa.mjs` (pour `t1-pilote.ts`).
import type { PlayerCommand, GameEvent } from '../src/game/model/types';
import type { PlayerView } from '../src/game/visibility/view';
export function isSig(defId: string): boolean;
export function rankOf(defId: string): number;
export function graineIa(v: PlayerView): number;
export function aDefausser(v: PlayerView): string[];
export function aRecentrer(v: PlayerView): string | null;
export function decisionIa(v: PlayerView, events: readonly GameEvent[]): Promise<PlayerCommand | null>;
