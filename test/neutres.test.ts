/**
 * Avenant M10-A (AV-01 à AV-03, AV-13 ; ADR 030) — cartes neutres dans le moteur : composition, aucune affinité
 * (l'affinité exige une famille), Interférence et Repoussement selon le Rang, deck sans Signature jouable jusqu'au bout,
 * forme R-AV d'un deck explicite, projections et IA sans fuite. Le mode standard est couvert par les autres tests du
 * dépôt, qui passent sans modification, et par les empreintes de `tools/m10a-empreintes.ts`.
 */
import { describe, expect, it } from 'vitest';
import { CATALOG, cardDef, isNeutralDef, NEUTRAL_CATALOG } from '../src/game/catalog/cards';
import { computeClash, damageCoefficient, rankSupport, type ClashSideInput, type ClashUse } from '../src/game/engine/clash';
import { applyCommand, createGame } from '../src/game/engine/engine';
import { assertInvariants } from '../src/game/engine/invariants';
import { decide, PROFILES } from '../src/game/ai/policy';
import { autoplay } from '../src/game/match';
import { RuleError, type GameConfig, type GameState, type PlayerId, type SlotIndex, type Stance } from '../src/game/model/types';
import { viewFor } from '../src/game/visibility/view';
import { fixture } from './helpers';

const N16 = [1, 2, 3, 4].flatMap((r) => Array.from({ length: 4 }, () => `neutre-${r}`));
const seat = (deck: string[], signature: GameConfig['players']['p1']['signature'] = null, hp = 60): GameConfig['players']['p1'] =>
  ({ name: 'x', hp, signature, variants: [], techniques: ['Sondage', 'Recentrage'], deck });
const neutralCfg = (seed = 1): GameConfig => ({ seed, players: { p1: seat(N16), p2: seat(N16) } });
const c = (id: string) => cardDef(id);

function side(primary: string, stance: Stance, uses: Array<[string, ClashUse['mode'], SlotIndex?]> = []): ClashSideInput {
  const active: ClashSideInput['active'] = [];
  const u: ClashUse[] = [];
  uses.forEach(([card, mode, target], i) => {
    active.push({ slot: i as SlotIndex, def: c(card) });
    u.push(mode === 'interfere' ? { slot: i as SlotIndex, def: c(card), mode, target: target ?? 0 } : { slot: i as SlotIndex, def: c(card), mode });
  });
  return { primary: c(primary), stance, active, uses: u };
}

/** Engagement d'une carte de la main (les neutres ont plusieurs instances : on prend celle qui est en main). */
function commit(s: GameState, pid: PlayerId, defId: string, stance: Stance): GameState {
  const id = s.players[pid].hand.find((x) => s.cards[x]!.defId === defId);
  if (!id) throw new Error(`${defId} absente de la main de ${pid}`);
  return applyCommand(s, { type: 'commit', player: pid, primaryId: id, stance, secondaryId: null, replaceSlot: null }).state;
}

describe('M10-A — cartes neutres (AV-01)', () => {
  it('16 instances, 4 par Rang, identifiants distincts, sans famille ni effet, Puissance 3/6/9/12', () => {
    const { state } = createGame(neutralCfg());
    const p1 = Object.values(state.cards).filter((x) => x.owner === 'p1');
    expect(p1).toHaveLength(16);
    expect(new Set(p1.map((x) => x.id)).size).toBe(16);
    for (const r of [1, 2, 3, 4]) expect(p1.filter((x) => x.defId === `neutre-${r}`)).toHaveLength(4);
    for (const x of p1) { const d = c(x.defId); expect(d.family).toBeNull(); expect(d.effect).toBeNull(); expect(d.signature).toBe(false); expect(d.power).toBe(3 * d.rank!); }
  });

  it('pas une cinquième famille : le catalogue standard est inchangé (36 définitions), les neutres sont à part', () => {
    expect(Object.keys(CATALOG)).toHaveLength(36);
    expect(Object.values(CATALOG).every((d) => d.family !== null)).toBe(true);
    expect(Object.keys(NEUTRAL_CATALOG)).toEqual(['neutre-1', 'neutre-2', 'neutre-3', 'neutre-4']);
    expect(isNeutralDef('neutre-2')).toBe(true);
    expect(isNeutralDef('Cendre-2-basic')).toBe(false);
  });
});

describe('M10-A — l’affinité exige une famille (AV-02)', () => {
  it('aucune affinité : neutre + neutre, neutre + Basic, Basic + neutre ; Basic + Basic de même famille : +1 (inchangé)', () => {
    expect(rankSupport(c('neutre-2'), c('neutre-4'))).toBe(2);
    expect(rankSupport(c('neutre-2'), c('Cendre-4-basic'))).toBe(2);
    expect(rankSupport(c('Cendre-2-basic'), c('neutre-4'))).toBe(2);
    expect(rankSupport(c('Cendre-2-basic'), c('Cendre-4-basic'))).toBe(3);
    expect(damageCoefficient(c('neutre-2'), c('neutre-4'))).toBe(2);
    expect(damageCoefficient(c('neutre-2'), c('Cendre-4-basic'))).toBe(2);
    expect(damageCoefficient(c('Cendre-2-basic'), c('neutre-4'))).toBe(2);
    expect(damageCoefficient(c('Cendre-2-basic'), c('Cendre-4-basic'))).toBe(3);
  });

  it('Prisme garde +1 et Convergence compte une Primaire neutre comme « d’une autre famille » (×6)', () => {
    expect(damageCoefficient(c('Astre-2-prisme'), c('neutre-4'))).toBe(3);
    expect(damageCoefficient(c('Astre-4-convergence'), c('neutre-4'))).toBe(6);
  });

  it('référence de non-régression : Assaut Neutre III + Neutre I au Rang = 4 contre Garde Neutre IV = 4 → la Garde gagne (D-05 avec des Cendre : 5 contre 4)', () => {
    const n = computeClash({ p1: side('neutre-3', 'assault', [['neutre-1', 'rank']]), p2: side('neutre-4', 'guard') });
    expect(n.scores).toEqual({ p1: 4, p2: 4 });
    expect(n.winner).toBe('p2');
    expect(n.guardWin).toBe(true);
    const f = computeClash({ p1: side('Cendre-3-basic', 'assault', [['Cendre-1-basic', 'rank']]), p2: side('Cendre-4-basic', 'guard') });
    expect(f.scores).toEqual({ p1: 5, p2: 4 });
    expect(f.winner).toBe('p1');
  });

  it('deux soutiens neutres au Rang et aux Dégâts : sans aucun +1', () => {
    const o = computeClash({ p1: side('neutre-2', 'assault', [['neutre-1', 'rank'], ['neutre-3', 'damage']]), p2: side('neutre-1', 'assault') });
    expect(o.scores.p1).toBe(2 + 1);
    expect(o.multipliers.p1).toBe(3);
    expect(o.damage.p2).toBe(6 * 3);
  });

  it('Interférence d’une neutre : son Rang imprimé contre le Rang imprimé de la cible engagée', () => {
    const rate = computeClash({ p1: side('Cendre-4-basic', 'assault', [['Cendre-3-basic', 'rank']]), p2: side('neutre-3', 'guard', [['neutre-2', 'interfere', 0]]) });
    expect(rate.scores.p1).toBe(4 + 4); // Interférence II contre III : ratée, le soutien tient
    const ok = computeClash({ p1: side('Cendre-4-basic', 'assault', [['Cendre-3-basic', 'rank']]), p2: side('neutre-3', 'guard', [['neutre-3', 'interfere', 0]]) });
    expect(ok.scores.p1).toBe(4); // III contre III : réussie, le soutien est annulé
  });
});

describe('M10-A — duels à neutres dans le moteur complet', () => {
  it('une neutre cachée est repoussée par une Garde gagnante et revient en main, comme une Basic', () => {
    const s = fixture(neutralCfg(5), { hand: ['neutre-3', 'neutre-4', 'neutre-2'], slots: [{ def: 'neutre-1' }, null] }, { hand: ['neutre-4', 'neutre-1'] });
    let st = commit(s, 'p1', 'neutre-3', 'assault');
    st = commit(st, 'p2', 'neutre-4', 'guard');
    expect(st.phase).toBe('REPEL');
    expect(st.repel?.choices).toEqual([0]);
    const repelled = st.players.p1.slots[0]!.cardId;
    st = applyCommand(st, { type: 'repel', player: 'p2', targetSlot: 0 }).state;
    expect(st.players.p1.hand).toContain(repelled);
    expect(st.players.p1.slots[0]).toBeNull();
    assertInvariants(st);
  });

  it('deck de 16 sans Signature : 1 000 duels IA contre IA jusqu’au bout (K.-O. ou prolongation), invariants tenus, jamais ∞', () => {
    const profils = [PROFILES.equilibre!, PROFILES.offensif!, PROFILES.prudent!, PROFILES.lecteur!];
    let prolongations = 0;
    for (let s = 1; s <= 1000; s++) {
      const m = autoplay(neutralCfg(s), 200, [profils[s % 4]!, profils[(s + 1) % 4]!]);
      expect(m.state.phase).toBe('ENDED');
      assertInvariants(m.state);
      if (m.state.overtime > 0) prolongations++;
      expect(m.events.some((e) => e.kind === 'clash' && Object.values((e.data as { scores: Record<string, unknown> }).scores).includes('inf'))).toBe(false);
    }
    expect(prolongations).toBeGreaterThan(0);
  }, 300000);

  it('mixte : 12 neutres + 4 Basics contre un chef (variantes et Signature) : jouable', () => {
    const deck = ['Voile-1-basic', 'Voile-2-basic', 'Voile-3-basic', 'Voile-4-basic', ...N16.filter((_, i) => i % 4 !== 0)];
    const chef = ['Ronce-1-racine', 'Ronce-2-ecaille', 'Ronce-3-entrave', 'Ronce-4-tenacite', ...N16.filter((_, i) => i % 4 !== 0), 'sig-Ronce'];
    const m = autoplay({ seed: 3, players: { p1: seat(deck, null, 90), p2: { ...seat(chef, 'Ronce', 110), techniques: ['Ancrage', 'Rupture'] } } });
    expect(m.state.phase).toBe('ENDED');
    expect(Object.values(m.state.cards).filter((x) => x.owner === 'p2')).toHaveLength(17);
  });
});

describe('M10-A — forme R-AV d’un deck explicite (AV-03)', () => {
  const avec = (deck: string[], signature: GameConfig['players']['p1']['signature'] = null) => () => createGame({ seed: 1, players: { p1: seat(deck, signature), p2: seat(N16) } });
  it('decks légaux : 16 neutres ; 12 neutres + 4 Basics ; + Signature annoncée', () => {
    expect(avec(N16)).not.toThrow();
    expect(avec(['Ronce-1-basic', 'Ronce-2-basic', 'Ronce-3-basic', 'Ronce-4-basic', ...N16.filter((_, i) => i % 4 !== 0)])).not.toThrow();
    expect(avec([...N16, 'sig-Voile'], 'Voile')).not.toThrow();
  });
  it('decks illégaux refusés (RuleError) : 5 cartes d’un Rang, 17 ordinaires, identité familiale en double, Signature non annoncée ou en double', () => {
    const cinq = [...N16.slice(1), 'neutre-4'];
    expect(avec(cinq)).toThrow(RuleError);
    expect(avec([...N16, 'neutre-1'])).toThrow(RuleError);
    const double = ['Cendre-1-basic', 'Cendre-1-etincelle', ...N16.slice(2)];
    expect(avec(double)).toThrow(RuleError);
    expect(avec([...N16, 'sig-Voile'])).toThrow(RuleError);
    expect(avec([...N16, 'sig-Voile', 'sig-Cendre'], 'Voile')).toThrow(RuleError);
  });
  it('sans deck explicite, une Signature est exigée (deck standard)', () => {
    expect(() => createGame({ seed: 1, players: { p1: { name: 'x', hp: 90, signature: null, variants: 'none', techniques: [] }, p2: seat(N16) } })).toThrow(RuleError);
  });
});

describe('M10-A — secrets et IA sur un duel neutre (ADR 011)', () => {
  it('vue adverse : main et Secondaires cachées invisibles ; aucune famille publique pour une neutre ; pas de Signature', () => {
    const m = autoplay(neutralCfg(7), 3);
    const v = viewFor(m.state, 'p2');
    expect(v.opp.hand).toBeNull();
    expect(v.opp.signatureFamily).toBeNull();
    for (const s of v.opp.slots) if (s && s.state === 'hidden') expect(s.card).toBeNull();
    expect(v.opp.slots.every((s) => !s || s.family === null)).toBe(true);
  });

  it('IA non omnisciente : mêmes informations publiques, mains secrètes différentes → même décision', () => {
    const a = fixture(neutralCfg(9), { hand: ['neutre-4', 'neutre-4', 'neutre-1', 'neutre-1'] }, { hand: ['neutre-3', 'neutre-2', 'neutre-1', 'neutre-4'] });
    const b = fixture(neutralCfg(9), { hand: ['neutre-3', 'neutre-2', 'neutre-2', 'neutre-3'] }, { hand: ['neutre-3', 'neutre-2', 'neutre-1', 'neutre-4'] });
    const va = viewFor(a, 'p2');
    const vb = viewFor(b, 'p2');
    expect(JSON.stringify(va.opp)).toBe(JSON.stringify(vb.opp));
    for (const seed of [1, 2, 3, 4, 5]) expect(decide(va, PROFILES.lecteur!, seed)).toEqual(decide(vb, PROFILES.lecteur!, seed));
  });
});
