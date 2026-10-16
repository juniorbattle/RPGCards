/**
 * M03 §4 — chorégraphies du Clash dérivées du résultat RÉSOLU par le moteur (jamais recalculé).
 * Chaque issue est produite par de vraies commandes moteur, puis classée par le ClashMotionDirector.
 */
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../src/game/engine/engine';
import { autoplay } from '../src/game/match';
import type { ClashReport, GameEvent, PlayerId, Stance } from '../src/game/model/types';
import { buildClashScript, stepForBeat, type ClashScript } from '../src/presentation/clashMotion';
import { config, fixture, Runner } from './helpers';

type Plans = Parameters<Runner['tactics']>[1];

/** Joue un Clash complet : p1 et p2 engagent, p1 (et éventuellement p2) choisit ses tactiques. */
function clash(p1: { prim: string; stance: Stance; slots?: Array<{ def: string; active?: boolean } | null>; plans?: Plans; hp?: number }, p2: { prim: string; stance: Stance; slots?: Array<{ def: string; active?: boolean } | null>; plans?: Plans; hp?: number }, cfg = config()): { script: ClashScript; batch: GameEvent[]; r: Runner } {
  const s = fixture(cfg,
    { hand: [p1.prim, 'Voile-1'], slots: p1.slots ?? [null, null], hp: p1.hp },
    { hand: [p2.prim, 'Astre-1'], slots: p2.slots ?? [null, null], hp: p2.hp });
  const r = new Runner(s);
  // Sans Secondaire active, le moteur enchaîne la résolution dès le second engagement.
  const before = r.events.length;
  r.commit('p1', p1.prim, p1.stance).commit('p2', p2.prim, p2.stance);
  if (r.state.phase === 'TACTICS') {
    if (r.state.awaiting.includes('p1')) r.tactics('p1', p1.plans ?? [null, null]);
    if (r.state.awaiting.includes('p2')) r.tactics('p2', p2.plans ?? [null, null]);
  }
  const batch = r.events.slice(before);
  const prim = r.state.reveal.primaries!;
  const script = buildClashScript(batch, 'p1', prim)!;
  return { script, batch, r };
}

describe('ClashMotionDirector — six chorégraphies pilotées par le moteur', () => {
  it('ASSAUT contre ASSAUT, priorité différente : un vainqueur, le vaincu est blessé', () => {
    const { script } = clash({ prim: 'Cendre-4', stance: 'assault' }, { prim: 'Ronce-3', stance: 'assault' });
    expect(script.outcome).toBe('aa-win');
    expect(script.winner).toBe('me');
    expect(script.actors.me.role).toBe('winner');
    expect(script.actors.opp.role).toBe('loser');
    expect(script.actors.opp.damageTaken).toBeGreaterThan(0);
    expect(script.verdict).toBe('VOUS DOMINEZ AU RANG');
  });

  it('ASSAUT contre ASSAUT, égalité : aucun faux vainqueur, blessures simultanées', () => {
    const { script } = clash({ prim: 'Cendre-3', stance: 'assault' }, { prim: 'Ronce-3', stance: 'assault' });
    expect(script.outcome).toBe('aa-tie');
    expect(script.winner).toBeNull();
    expect(script.actors.me.role).toBe('equal');
    expect(script.actors.opp.role).toBe('equal');
    expect(script.actors.me.damageTaken).toBeGreaterThan(0);
    expect(script.actors.opp.damageTaken).toBeGreaterThan(0);
    expect(script.verdict).toMatch(/SIMULTANÉS/);
  });

  it('ASSAUT contre GARDE, la Garde gagne au Rang (égalité incluse) : Assaut repoussé, 0 dégât', () => {
    const { script } = clash({ prim: 'Cendre-3', stance: 'assault' }, { prim: 'Ronce-3', stance: 'guard' });
    expect(script.outcome).toBe('guard-holds');
    expect(script.winner).toBe('opp');
    expect(script.attacker).toBe('me');
    expect(script.actors.me.damageTaken).toBe(0);
    expect(script.actors.opp.damageTaken).toBe(0);
    expect(script.verdict).toBe('GARDE VICTORIEUSE');
  });

  it('ASSAUT contre GARDE, l’Assaut gagne ET blesse : la Garde cède, blessure positive', () => {
    const { script } = clash({ prim: 'Cendre-4', stance: 'assault' }, { prim: 'Ronce-1', stance: 'guard' });
    expect(script.outcome).toBe('guard-breaks');
    expect(script.winner).toBe('me');
    expect(script.actors.opp.damageTaken).toBeGreaterThan(0);
    expect(script.absorption).not.toBeNull();
    expect(script.verdict).toBe('LA GARDE CÈDE');
  });

  it('ASSAUT contre GARDE, victoire au Rang SANS blessure (T2) : absorption, jamais une victoire défensive', () => {
    const { script } = clash(
      { prim: 'Cendre-3', stance: 'assault', slots: [{ def: 'Cendre-1', active: true }, null], plans: [{ mode: 'rank' }, null] },
      { prim: 'Cendre-4', stance: 'guard' });
    expect(script.outcome).toBe('guard-absorbs');
    expect(script.winner).toBe('me'); // l’Assaut gagne bien au Rang
    expect(script.actors.me.role).toBe('winner');
    expect(script.actors.opp.damageTaken).toBe(0);
    expect(script.verdict).toBe('VICTOIRE AU RANG · 0 BLESSURE · ABSORPTION');
    expect(script.verdict).not.toMatch(/GARDE VICTORIEUSE/);
    expect(script.absorption).toEqual({ assault: 9, guard: 12, absorbed: 9 });
    expect(script.actors.me.score).toBe('5');
    expect(script.actors.opp.score).toBe('4');
  });

  it('GARDE contre GARDE : neutralité, aucun vainqueur ni blessure', () => {
    const { script } = clash({ prim: 'Cendre-4', stance: 'guard' }, { prim: 'Ronce-2', stance: 'guard' });
    expect(script.outcome).toBe('gg-neutral');
    expect(script.winner).toBeNull();
    expect(script.actors.me.damageTaken + script.actors.opp.damageTaken).toBe(0);
  });

  it('Signature ∞ contre Garde : priorité ∞, la Puissance de Garde absorbe toujours', () => {
    const { script } = clash({ prim: 'sig-Cendre', stance: 'assault' }, { prim: 'Ronce-4', stance: 'guard' }, config({ sig1: 'Cendre' }));
    expect(script.actors.me.signature).toBe(true);
    expect(script.actors.me.score).toBe('∞');
    expect(['guard-breaks', 'guard-absorbs']).toContain(script.outcome);
    expect(script.absorption!.guard).toBe(script.actors.opp.power);
  });

  it('double K.-O. : prolongation signalée, pas de faux écran de victoire', () => {
    const { script } = clash({ prim: 'Cendre-3', stance: 'assault', hp: 3 }, { prim: 'Ronce-3', stance: 'assault', hp: 3 });
    expect(script.outcome).toBe('aa-tie');
    expect(script.overtime).toBe(true);
    expect(script.finalBlow).toBeNull();
  });

  it('Interférences : les soutiens annulés sont transmis tels que publiés par le moteur', () => {
    const { script } = clash(
      { prim: 'Cendre-4', stance: 'assault', slots: [{ def: 'Cendre-3', active: true }, { def: 'Astre-4', active: true }], plans: [{ mode: 'damage' }, { mode: 'interfere', target: 0 }] },
      { prim: 'Ronce-3', stance: 'guard', slots: [{ def: 'Voile-4', active: true }, null], plans: [{ mode: 'interfere', target: 0 }, null] });
    expect(script.cancelled.me).toContain(0);
    expect(script.cancelled.opp).toContain(0);
  });

  it('non-fuite : seuls les événements publics sont lus (un événement privé est ignoré)', () => {
    const { batch, r } = clash({ prim: 'Cendre-4', stance: 'assault' }, { prim: 'Ronce-3', stance: 'assault' });
    const prim = r.state.reveal.primaries!;
    const base = buildClashScript(batch, 'p1', prim);
    const poisoned: GameEvent[] = [{ seq: 99999, turn: 1, kind: 'clash', vis: 'p2', data: { winner: 'p2', outcome: 'win', stances: { p1: 'guard', p2: 'guard' } } } as unknown as GameEvent, ...batch];
    expect(buildClashScript(poisoned, 'p1', prim)).toEqual(base);
  });

  it('étapes de mise en scène associées aux temps de la séquence M02', () => {
    expect(stepForBeat('rank')).toBe('present');
    expect(stepForBeat('outcome')).toBe('impact');
    expect(stepForBeat('damage')).toBe('damage');
    expect(stepForBeat('destination')).toBe('cleanup');
    expect(stepForBeat('tactics')).toBeNull();
  });

  it('propriété : sur 40 duels IA/IA, chaque Clash est classé conformément au rapport du moteur', () => {
    let n = 0;
    const seen = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      const m = autoplay({ ...DEFAULT_CONFIG, seed });
      let prim: Record<PlayerId, { defId: string; stance: Stance }> | null = null;
      for (const e of m.events) {
        if (e.vis !== 'public') continue;
        if (e.kind === 'primariesRevealed') prim = e.data as Record<PlayerId, { defId: string; stance: Stance }>;
        if (e.kind !== 'clash' || (e.data as Record<string, unknown>).own) continue;
        const r = e.data as unknown as ClashReport;
        const s = buildClashScript([e], 'p1', prim)!;
        n++;
        seen.add(s.outcome);
        if (s.outcome === 'gg-neutral') expect(r.damage.p1 + r.damage.p2).toBe(0);
        if (s.outcome === 'aa-tie') expect(r.winner).toBeNull();
        if (s.outcome === 'guard-holds') { expect(r.guardWin).toBe(true); expect(r.damage[r.winner === 'p1' ? 'p1' : 'p2']).toBe(0); }
        if (s.outcome === 'guard-absorbs') { expect(r.zeroDamageRankWin).toBe(true); expect(s.verdict).not.toMatch(/GARDE VICTORIEUSE/); }
        if (s.outcome === 'guard-breaks') expect(r.damage[r.winner === 'p1' ? 'p2' : 'p1']).toBeGreaterThan(0);
        if (s.winner) expect(r.winner).toBe(s.winner === 'me' ? 'p1' : 'p2');
      }
    }
    expect(n).toBeGreaterThan(200);
    expect(seen.size).toBeGreaterThanOrEqual(5);
  });
});
