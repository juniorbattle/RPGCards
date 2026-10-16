/** M02 §4 — séquence de résolution intelligible, pilotée par les événements résolus. */
import { describe, expect, it } from 'vitest';
import { buildResolutionBeats, hpAfterBeat, hpBeforeSequence, resolutionStart } from '../src/presentation/beats';
import { config, fixture, Runner } from './helpers';

function t2() {
  const s = fixture(config(), { hand: ['Cendre-3', 'Voile-4', 'Astre-2', 'Ronce-1'], slots: [{ def: 'Cendre-1' }, null] }, { hand: ['Cendre-4', 'Ronce-2', 'Astre-1', 'Voile-1'] });
  s.phase = 'PREPARE';
  s.awaiting = ['p1'];
  const r = new Runner(s);
  r.apply({ type: 'prepare', player: 'p1', reveal: [0] });
  r.commit('p1', 'Cendre-3', 'assault').commit('p2', 'Cendre-4', 'guard');
  const before = r.events.length;
  r.tactics('p1', [{ mode: 'rank' }, null]);
  return { r, batch: r.events.slice(before) };
}

describe('Séquenceur de résolution', () => {
  it('T2 lisible sans le journal : Rang 5 contre 4 (affinité) puis « 0 blessure : la Garde absorbe »', () => {
    const { r, batch } = t2();
    expect(resolutionStart(batch)).toBeGreaterThanOrEqual(0);
    const beats = buildResolutionBeats(batch.slice(resolutionStart(batch)), { viewer: 'p1', primaries: r.state.reveal.primaries });
    const kinds = beats.map((b) => b.kind);
    expect(kinds.indexOf('tactics')).toBeLessThan(kinds.indexOf('rank'));
    expect(kinds.indexOf('rank')).toBeLessThan(kinds.indexOf('outcome'));
    const rank = beats.find((b) => b.kind === 'rank')!;
    expect(rank.title).toBe('Rang : Vous 5 contre 4');
    expect(rank.detail).toMatch(/5 = Cendre III 3 \+ Cendre I \+2 \(affinité \+1\)/);
    const out = beats.find((b) => b.kind === 'outcome')!;
    expect(out.title).toBe('Vous gagnez au Rang… mais 0 blessure');
    expect(out.detail).toMatch(/La Garde absorbe : Puissance 9 contre Garde 12/);
    expect(out.tone).toBe('warn');
    expect(beats.some((b) => b.kind === 'damage')).toBe(false);
  });

  it('ordre pédagogique : Interférences avant Rang, dégâts après l’issue ; soutien annulé signalé', () => {
    const s = fixture(config(),
      { hand: ['Cendre-4'], slots: [{ def: 'Cendre-3', active: true }, { def: 'Astre-4', active: true }] },
      { hand: ['Ronce-3'], slots: [{ def: 'Voile-4', active: true }, null] });
    const r = new Runner(s).commit('p1', 'Cendre-4', 'assault').commit('p2', 'Ronce-3', 'guard');
    const before = r.events.length;
    r.tactics('p1', [{ mode: 'damage' }, { mode: 'interfere', target: 0 }]);
    r.tactics('p2', [{ mode: 'interfere', target: 0 }, null]);
    const batch = r.events.slice(before);
    const beats = buildResolutionBeats(batch.slice(resolutionStart(batch)), { viewer: 'p1', primaries: r.state.reveal.primaries });
    const kinds = beats.map((b) => b.kind);
    expect(kinds.slice(0, 4)).toEqual(['tactics', 'interference', 'interference', 'rank']);
    expect(kinds.indexOf('damage')).toBeGreaterThan(kinds.indexOf('outcome'));
    expect(beats.filter((b) => b.kind === 'interference').every((b) => /RÉUSSIE/.test(b.title))).toBe(true);
    expect(beats.find((b) => b.kind === 'damage')!.title).toBe('Le rival perd 3 PV');
  });

  it('PV mis en scène : avant la séquence = PV d’avant impact ; prolongation à 1 PV appliquée au bon temps', () => {
    const s = fixture(config({ v1: ['Cendre-4'] }), { hand: ['Cendre-4-contrecoup', 'Voile-1'], hp: 3, slots: [{ def: 'Astre-2', active: true }, null] }, { hand: ['sig-Ronce', 'Astre-1'], hp: 3 });
    const r = new Runner(s).commit('p1', 'Cendre-4-contrecoup', 'assault').commit('p2', 'sig-Ronce', 'assault');
    const before = r.events.length;
    r.tactics('p1', [{ mode: 'keep' }, null]);
    const batch = r.events.slice(before);
    const seq = batch.slice(resolutionStart(batch));
    const finalHp = { p1: r.state.players.p1.hp, p2: r.state.players.p2.hp };
    expect(finalHp).toEqual({ p1: 1, p2: 1 });
    let hp = hpBeforeSequence(seq, finalHp);
    expect(hp).toEqual({ p1: 3, p2: 3 });
    const beats = buildResolutionBeats(seq, { viewer: 'p1', primaries: r.state.reveal.primaries });
    const trail: string[] = [];
    for (const b of beats) { hp = hpAfterBeat(hp, b); trail.push(`${b.kind}:${hp.p1}/${hp.p2}`); }
    expect(trail).toContain('damage:0/0');
    expect(trail[trail.length - 1]).toMatch(/overtime:1\/1|destination:1\/1/);
    expect(beats.some((b) => b.kind === 'overtime')).toBe(true);
  });
});
