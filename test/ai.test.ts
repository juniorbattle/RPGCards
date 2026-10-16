/** G25 — l’IA n’observe que sa vue : ses décisions sont invariantes aux secrets du joueur. */
import { describe, expect, it } from 'vitest';
import { decide, PROFILES } from '../src/game/ai/policy';
import { applyCommand, checkCommand } from '../src/game/engine/engine';
import { viewFor } from '../src/game/visibility/view';
import { config, d, fixture, idOf } from './helpers';

describe('IA non omnisciente (G25)', () => {
  it('même vue publique, mains secrètes différentes → même décision d’engagement', () => {
    const a = fixture(config(), { hand: ['Cendre-4', 'Voile-1', 'Astre-2', 'Ronce-3'] }, { hand: ['Ronce-4', 'Astre-1', 'Voile-3', 'Cendre-2'] });
    const b = fixture(config(), { hand: ['Voile-4', 'Ronce-1', 'Cendre-2', 'Astre-3'] }, { hand: ['Ronce-4', 'Astre-1', 'Voile-3', 'Cendre-2'] });
    // Les vues IA ne diffèrent que par le pool d’identités non localisées → on aligne les pioches
    const va = viewFor(a, 'p2');
    const vb = viewFor(b, 'p2');
    expect(JSON.stringify(va.opp.slots)).toBe(JSON.stringify(vb.opp.slots));
    expect(va.opp.handCount).toBe(vb.opp.handCount);
    expect(decide(va, PROFILES.equilibre, 9)).toEqual(decide(vb, PROFILES.equilibre, 9));
  });

  it('l’engagement secret verrouillé du joueur ne change pas la vue ni la décision de l’IA', () => {
    const s = fixture(config(), { hand: ['Cendre-4', 'Voile-1', 'Astre-2', 'Ronce-3'] }, { hand: ['Ronce-4', 'Astre-1', 'Voile-3', 'Cendre-2'] });
    const before = decide(viewFor(s, 'p2'), PROFILES.equilibre, 3);
    const viewBefore = viewFor(s, 'p2');
    for (const [prim, stance] of [['Cendre-4', 'assault'], ['Voile-1', 'guard']] as const) {
      const r = applyCommand(s, { type: 'commit', player: 'p1', primaryId: idOf(s, 'p1', d(prim)), stance, secondaryId: null, replaceSlot: null });
      const v = viewFor(r.state, 'p2');
      // Seul change : « l’adversaire a verrouillé » (information publique).
      const norm = (x: typeof v) => ({ ...x, awaitingOpponent: false, opp: { ...x.opp, locked: false } });
      expect(norm(v)).toEqual(norm(viewBefore));
      expect(decide(v, PROFILES.equilibre, 3)).toEqual(before);
    }
  });

  it('choix tactiques secrets du joueur : invisibles et sans effet sur la décision tactique de l’IA', () => {
    const s0 = fixture(config(),
      { hand: ['Cendre-4'], slots: [{ def: 'Cendre-3', active: true }, { def: 'Voile-2', active: true }] },
      { hand: ['Ronce-4'], slots: [{ def: 'Voile-4', active: true }, { def: 'Astre-3', active: true }] });
    let s = applyCommand(s0, { type: 'commit', player: 'p1', primaryId: idOf(s0, 'p1', d('Cendre-4')), stance: 'assault', secondaryId: null, replaceSlot: null }).state;
    s = applyCommand(s, { type: 'commit', player: 'p2', primaryId: idOf(s, 'p2', d('Ronce-4')), stance: 'guard', secondaryId: null, replaceSlot: null }).state;
    expect(s.phase).toBe('TACTICS');
    const base = decide(viewFor(s, 'p2'), PROFILES.prudent, 5);
    const variants = [
      [{ mode: 'damage' }, { mode: 'damage' }],
      [{ mode: 'interfere', target: 1 }, { mode: 'rank' }],
      [{ mode: 'keep' }, { mode: 'keep' }],
    ] as const;
    for (const plans of variants) {
      const cmd = { type: 'tactics', player: 'p1', plans: plans as never, technique: null } as const;
      expect(checkCommand(s, cmd)).toBeNull();
      const locked = applyCommand(s, cmd).state;
      expect(decide(viewFor(locked, 'p2'), PROFILES.prudent, 5)).toEqual(base);
    }
  });

  it('l’IA ne propose que des commandes légales sur 30 duels (aucun rejet)', async () => {
    const { autoplay } = await import('../src/game/match');
    const { DEFAULT_CONFIG } = await import('../src/game/engine/engine');
    for (let seed = 100; seed < 130; seed++) expect(autoplay({ ...DEFAULT_CONFIG, seed }).state.phase).toBe('ENDED');
  });
});
