/** Invariants absolus (contrat 03 §Invariants, règlement §16.1). Lèvent une erreur si violés. */
import { cardDef } from '../catalog/cards';
import { INSIGHT_MAX } from '../catalog/techniques';
import { PLAYERS, type GameState } from '../model/types';

export function assertInvariants(state: GameState): void {
  for (const pid of PLAYERS) {
    const p = state.players[pid];
    const zones: string[] = [
      ...p.deck, ...p.hand, ...p.discard,
      ...p.slots.filter((s) => s !== null).map((s) => s!.cardId),
      ...(p.primary ? [p.primary.cardId] : []),
    ];
    if (zones.length !== 17) throw new Error(`${pid} : conservation rompue (${zones.length}/17 cartes)`);
    if (new Set(zones).size !== 17) throw new Error(`${pid} : carte dupliquée entre zones`);
    const identities = new Set<string>();
    for (const id of zones) {
      const inst = state.cards[id];
      if (!inst || inst.owner !== pid) throw new Error(`${pid} : carte étrangère ${id}`);
      identities.add(cardDef(inst.defId).identity);
    }
    if (identities.size !== 17) throw new Error(`${pid} : identités non uniques`);
    for (const s of p.slots) {
      if (s && cardDef(state.cards[s.cardId]!.defId).signature) throw new Error(`${pid} : Signature en Secondaire`);
      if (s && s.active && s.revealedTurn !== null && s.revealedTurn <= s.placedTurn) throw new Error(`${pid} : révélation pendant le tour de pose`);
    }
    if (!Number.isInteger(p.insight) || p.insight < 0 || p.insight > INSIGHT_MAX) throw new Error(`${pid} : Insight hors limites (${p.insight})`);
    if (p.insightGained > 1) throw new Error(`${pid} : gain d’Insight > 1 ce tour`);
    if (p.techniques.length > 2) throw new Error(`${pid} : plus de deux Techniques équipées`);
    if (p.hp < 0 || p.hp > p.maxHp) throw new Error(`${pid} : PV hors bornes`);
  }
}
