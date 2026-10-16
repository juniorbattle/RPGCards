/** M02 — directeur de vues et directeur d’expressions (modules purs). */
import { describe, expect, it } from 'vitest';
import { applyCommand } from '../src/game/engine/engine';
import type { GameEvent } from '../src/game/model/types';
import { naturalView, PresentationDirector } from '../src/presentation/director';
import { ExpressionDirector } from '../src/presentation/expression';
import { PERSONALITIES, personalityFor } from '../src/presentation/personalities';
import { config, d, fixture, idOf } from './helpers';

describe('PresentationDirector (vues A/B pilotées par phase)', () => {
  const at = (phase: string, awaitingMe = true, turn = 3) => ({ phase: phase as never, turn, awaitingMe, repelMine: false });
  it('chorégraphie M02 §2 : A par défaut, B pour composer, retour A après verrouillage, A en tactique', () => {
    expect(naturalView(at('START', false))).toBe('A');
    expect(naturalView(at('PREPARE'))).toBe('B');
    expect(naturalView(at('COMMIT'))).toBe('B');
    expect(naturalView(at('COMMIT', false))).toBe('A'); // engagement verrouillé
    expect(naturalView(at('LECTURE'))).toBe('A');
    expect(naturalView(at('TACTICS'))).toBe('A');
    expect(naturalView(at('RESOLVED', false))).toBe('A');
    expect(naturalView(at('ENDED', false))).toBe('A');
  });
  it('bascule manuelle valable jusqu’au changement de phase ; gel pendant un glisser', () => {
    const dir = new PresentationDirector();
    expect(dir.update(at('TACTICS'))).toBe('A');
    expect(dir.toggle(at('TACTICS'))).toBe('B');
    expect(dir.update(at('TACTICS'))).toBe('B');
    expect(dir.update(at('RESOLVED', false))).toBe('A'); // nouvelle phase : préférence oubliée
    dir.update(at('COMMIT', true, 4));
    expect(dir.view).toBe('B');
    dir.setFrozen(true, at('COMMIT', true, 4));
    expect(dir.update(at('COMMIT', false, 4))).toBe('B'); // gelé : pas de transition sous le pointeur
    expect(dir.setFrozen(false, at('COMMIT', false, 4))).toBe('A'); // rattrapage après le glisser
  });
});

describe('ExpressionDirector (rival) — événements publics uniquement', () => {
  const pers = PERSONALITIES[0]!;

  it('ignore tout événement non public, même transmis par erreur', () => {
    const dir = new ExpressionDirector('p2', pers, 1);
    const priv: GameEvent = { seq: 1, turn: 1, phase: 'COMMIT', vis: 'p2', kind: 'committed', data: { own: true, primaryDefId: 'Cendre-4-basic', stance: 'assault' } };
    const priv2: GameEvent = { seq: 2, turn: 1, phase: 'START', vis: 'p1', kind: 'peek', data: { defIds: ['sig-Cendre'] } };
    expect(dir.observe([priv, priv2])).toEqual([]);
  });

  it('non-fuite : mains et engagements secrets différents du joueur → mêmes expressions avant révélation', () => {
    const make = (hand: string[], prim: string, stance: 'assault' | 'guard') => {
      const s = fixture(config(), { hand }, { hand: ['Ronce-4', 'Astre-1', 'Voile-3', 'Cendre-2'] });
      const r1 = applyCommand(s, { type: 'commit', player: 'p1', primaryId: idOf(s, 'p1', d(prim)), stance, secondaryId: null, replaceSlot: null });
      const dir = new ExpressionDirector('p2', pers, 77);
      const reacts = dir.observe(r1.events);
      const base = dir.baseline({ phase: r1.state.phase, rivalDeciding: true, playerDeciding: false, rivalHpRatio: 1, playerHpRatio: 1 });
      return { reacts, base, publicEvents: r1.events.filter((e) => e.vis === 'public') };
    };
    const a = make(['Cendre-4', 'Voile-1', 'Astre-2', 'Ronce-3'], 'Cendre-4', 'assault');
    const b = make(['Voile-4', 'Ronce-1', 'Cendre-2', 'Astre-3'], 'Ronce-1', 'guard');
    expect(a.publicEvents).toEqual(b.publicEvents);
    expect(a.reacts).toEqual(b.reacts);
    expect(a.base).toEqual(b.base);
  });

  it('au moins cinq réactions distinctes déclenchées par des faits publics', () => {
    const dir = new ExpressionDirector('p2', pers, 3);
    const ev = (seq: number, kind: GameEvent['kind'], data: Record<string, unknown>): GameEvent => ({ seq, turn: 2, phase: 'TACTICS', vis: 'public', kind, data });
    const all = dir.observe([
      ev(1, 'locked', { player: 'p2', phase: 'COMMIT' }),
      ev(2, 'primariesRevealed', { p1: { defId: 'sig-Voile', stance: 'assault' }, p2: { defId: 'Ronce-4-basic', stance: 'guard' } }),
      ev(3, 'clash', { outcome: 'win', winner: 'p2', guardWin: true, damage: { p1: 0, p2: 0 } }),
      ev(4, 'damage', { player: 'p2', amount: 30 }),
      ev(5, 'interference', { player: 'p1', success: true }),
      ev(6, 'damage', { player: 'p1', amount: 12 }),
      ev(7, 'overtime', {}),
      ev(8, 'victory', { winner: 'p1' }),
    ]);
    const moods = new Set(all.map((x) => x.mood));
    const gestures = new Set(all.map((x) => x.gesture).filter(Boolean));
    expect(moods.size).toBeGreaterThanOrEqual(5);
    expect(gestures.size).toBeGreaterThanOrEqual(4);
  });

  it('trois personnalités distinctes, choix déterministe par seed', () => {
    expect(new Set(PERSONALITIES.map((p) => p.id)).size).toBe(3);
    expect(new Set(PERSONALITIES.map((p) => p.aiProfile)).size).toBe(3);
    expect(personalityFor(7).id).toBe(personalityFor(7).id);
    expect(personalityFor(1, 'voile').id).toBe('voile');
  });
});
