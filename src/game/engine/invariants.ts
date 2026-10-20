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
    // Avenant M10-A (AV-03) : 17 cartes avec une Signature (standard), 16 sans (deck d'aventure avant le premier chef) ;
    // seules les identités FAMILIALES (et la Signature) sont uniques, les neutres se répètent (ADR 030).
    const owned = Object.values(state.cards).filter((c) => c.owner === pid).length;
    if (owned !== (p.signatureFamily === null ? 16 : 17)) throw new Error(`${pid} : taille du deck ${owned}`);
    if (zones.length !== owned) throw new Error(`${pid} : conservation rompue (${zones.length}/${owned} cartes)`);
    if (new Set(zones).size !== owned) throw new Error(`${pid} : carte dupliquée entre zones`);
    const identities = new Set<string>();
    let familiales = 0;
    for (const id of zones) {
      const inst = state.cards[id];
      if (!inst || inst.owner !== pid) throw new Error(`${pid} : carte étrangère ${id}`);
      const d = cardDef(inst.defId);
      if (d.family === null) continue;
      familiales += 1;
      identities.add(d.identity);
    }
    if (identities.size !== familiales) throw new Error(`${pid} : identités non uniques`);
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
