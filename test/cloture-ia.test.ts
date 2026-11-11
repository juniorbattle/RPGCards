/**
 * Lot de correction de clôture (passe 225, fiche B2) — IA de niveau 1 pour des mesures probantes : elle joue Recentrage et
 * retient tous les regards privés (mémoire construite des seuls événements de son siège, ADR 011).
 */
import { describe, expect, it } from 'vitest';
import { cardDef } from '../src/game/catalog/cards';
import { buildMemory, emptyMemory } from '../src/game/ai/memory';
import { decide, PROFILES } from '../src/game/ai/policy';
import { DEFAULT_CONFIG } from '../src/game/engine/engine';
import type { GameConfig, GameEvent, PlayerId } from '../src/game/model/types';
import { viewFor } from '../src/game/visibility/view';
import { fixture } from './helpers';

let seq = 0;
const ev = (vis: GameEvent['vis'], kind: GameEvent['kind'], data: Record<string, unknown>): GameEvent => ({ seq: ++seq, turn: 3, phase: 'TACTICS', vis, kind, data });

describe('mémoire : tous les regards privés retenus', () => {
  it('Murmure : le sommet de la pioche adverse rejoint sa main connue à sa prochaine pioche publique', () => {
    const evs = [ev('p2', 'peek', { player: 'p2', source: 'Murmure', defIds: ['Astre-4-basic'], deckTop: true })];
    expect(buildMemory(evs, 'p2').knownOppHand).toEqual([]);
    evs.push(ev('public', 'draw', { player: 'p1', count: 1 }));
    expect(buildMemory(evs, 'p2').knownOppHand).toEqual(['Astre-4']);
  });

  it('Ombre portée, Miroir brisé, Clairvoyance : les Secondaires cachées adverses, jusqu’à ce qu’elles quittent leur case', () => {
    const evs = [
      ev('p2', 'peek', { player: 'p2', source: 'Miroir brisé', defIds: [], hiddenSlots: [{ slot: 0, defId: 'Voile-1-leurre' }, { slot: 1, defId: 'Cendre-3-basic' }] }),
    ];
    expect(buildMemory(evs, 'p2').oppSlots).toEqual({ 0: 'Voile-1-leurre', 1: 'Cendre-3-basic' });
    // révélée masquée (Dissimulation) : toujours connue de ce siège ; consommée : partie
    evs.push(ev('public', 'secondaryRevealed', { player: 'p1', slot: 0, defId: null, masked: true, family: 'Voile' }));
    evs.push(ev('public', 'destination', { player: 'p1', slot: 1, dest: 'discard', defId: 'Cendre-3-basic' }));
    expect(buildMemory(evs, 'p2').oppSlots).toEqual({ 0: 'Voile-1-leurre' });
    // un regard d'un AUTRE siège n'est jamais lu
    const autre = [ev('p1', 'peek', { player: 'p1', source: 'Ombre portée', defIds: [], hiddenSlots: [{ slot: 0, defId: 'Ronce-2-basic' }] })];
    expect(buildMemory(autre, 'p2').oppSlots).toEqual({});
  });

  it('Racine : la carte cachée repoussée en main est connue ; Entrave (sous la pioche) : non', () => {
    const main = [ev('public', 'repel', { player: 'p2', target: 'p1', slot: 0, kind: 'basic', dest: 'hand', defId: null }), ev('p2', 'peek', { player: 'p2', source: 'Racine', defIds: ['Ronce-3-basic'] })];
    expect(buildMemory(main, 'p2').knownOppHand).toEqual(['Ronce-3']);
    const dessous = [ev('public', 'repel', { player: 'p2', target: 'p1', slot: 0, kind: 'basic', dest: 'bottom', defId: null }), ev('p2', 'peek', { player: 'p2', source: 'Racine', defIds: ['Ronce-3-basic'] })];
    expect(buildMemory(dessous, 'p2').knownOppHand).toEqual([]);
    // Repoussement public d'une active : son identité, publique, rejoint la main connue
    expect(buildMemory([ev('public', 'repel', { player: 'p2', target: 'p1', slot: 1, kind: 'rupture', dest: 'hand', defId: 'Astre-2-basic' })], 'p2').knownOppHand).toEqual(['Astre-2']);
  });

  it('Repère et Sextant : le sommet de sa propre pioche, jusqu’à ce qu’il soit pioché', () => {
    const evs = [ev('p2', 'peek', { player: 'p2', source: 'Sextant', defIds: ['Cendre-1-basic', 'Astre-4-basic'], own: true })];
    expect(buildMemory(evs, 'p2').myDeckTop).toEqual(['Cendre-1-basic', 'Astre-4-basic']);
    evs.push(ev('p2', 'draw', { player: 'p2', cardId: 'p2#03', defId: 'Cendre-1-basic' }));
    expect(buildMemory(evs, 'p2').myDeckTop).toEqual(['Astre-4-basic']);
    expect(buildMemory(evs, 'p1').myDeckTop).toEqual([]);
  });
});

describe('IA de niveau 1 : Recentrage', () => {
  const cfg = (t: GameConfig['players']['p1']['techniques']): GameConfig => ({ seed: 2250, players: { p1: { ...DEFAULT_CONFIG.players.p1, variants: 'none', techniques: [] }, p2: { ...DEFAULT_CONFIG.players.p2, variants: 'none', techniques: t } } });
  const choix = (hand: string[], techniques: GameConfig['players']['p1']['techniques'], memoire = emptyMemory()) => {
    const s = fixture(cfg(techniques), { hand: ['Cendre-4', 'Voile-1', 'Astre-2', 'Ronce-3'] }, { hand, insight: 1 }, { phase: 'START' });
    const v = viewFor(s, 'p2' as PlayerId);
    const rang = (cardId: string) => cardDef(v.me.hand!.find((c) => c.cardId === cardId)!.defId).rank;
    return [...Array(24).keys()].map((i) => decide(v, PROFILES.equilibre!, 100 + i, memoire)).map((c) => (c?.type === 'start' ? c.technique : null))
      .map((t) => (t?.id === 'Recentrage' ? { ...t, rang: rang(t.cardId) } : t));
  };

  it('main faible (Rang I, ni Rang III ni IV ni Signature) : Recentrage d’une carte de Rang I, selon le goût du profil pour les Techniques', () => {
    const t = choix(['Cendre-1', 'Voile-2', 'Astre-1', 'Ronce-2'], ['Recentrage']);
    const recentrages = t.filter((x) => x?.id === 'Recentrage');
    expect(recentrages.length).toBeGreaterThan(6);
    expect(recentrages.length).toBeLessThan(24);
    for (const r of recentrages) expect(r && 'rang' in r ? r.rang : null).toBe(1);
  });

  it('main forte : jamais de Recentrage ; sommet connu (Sextant) aussi faible : pas de Recentrage', () => {
    expect(choix(['Cendre-1', 'Voile-2', 'Astre-3', 'Ronce-2'], ['Recentrage']).some((x) => x?.id === 'Recentrage')).toBe(false);
    const m = { ...emptyMemory(), myDeckTop: ['Ronce-1-basic'] };
    expect(choix(['Cendre-1', 'Voile-2', 'Astre-1', 'Ronce-2'], ['Recentrage'], m).some((x) => x?.id === 'Recentrage')).toBe(false);
  });
});
