/**
 * M12 — conseils des nouveaux signaux (`src/shell/tips.ts`) : RÉVÉLER, ARMÉ, la pastille de déclenchement, les temps
 * forts, le regard privé ; chacun quand il paraît, après le conseil de base de la phase ; et leur réglage dans l'aventure
 * (`src/aventure/conseils.ts`).
 */
import { describe, expect, it } from 'vitest';
import type { Controller } from '../src/app/controller';
import { conseilLu, conseilsPermis, ecrireConseils, lireConseils } from '../src/aventure/conseils';
import { applyCommand, checkCommand, DEFAULT_CONFIG } from '../src/game/engine/engine';
import { fixture, idOf } from '../src/game/fixtures/fixture';
import type { GameConfig, GameEvent, GameState, Phase, PlayerCommand, PlayerId, SlotIndex, Stance } from '../src/game/model/types';
import { viewFor } from '../src/game/visibility/view';
import { duelTip, TIP_IDS } from '../src/shell/tips';

const cfg = (p1: string[], p2: string[] = []): GameConfig => ({
  seed: 77,
  players: {
    p1: { ...DEFAULT_CONFIG.players.p1, signature: 'Cendre', variants: p1, techniques: [] },
    p2: { ...DEFAULT_CONFIG.players.p2, signature: 'Ronce', variants: p2, techniques: [] },
  },
});
const ctl = (state: GameState, events: GameEvent[]): Controller => ({ view: viewFor(state, 'p1'), match: { events } }) as unknown as Controller;

interface Plan { reveal?: SlotIndex[]; primary: string; stance?: Stance }
/** Avance jusqu'à `stop` (ou la fin du tour), sans Technique ni soutien. */
function avancer(state: GameState, plans: Record<PlayerId, Plan>, stop: Phase): { state: GameState; events: GameEvent[] } {
  let s = state;
  const events: GameEvent[] = [];
  for (let g = 0; g < 30 && s.phase !== stop && s.phase !== 'RESOLVED' && s.phase !== 'ENDED'; g++) {
    const pid = s.awaiting.find((x) => !s.pending[x])!;
    const pl = plans[pid];
    const cmd: PlayerCommand = s.phase === 'PREPARE' ? { type: 'prepare', player: pid, reveal: pl.reveal ?? [] }
      : s.phase === 'DISSIPATION' ? { type: 'dissipate', player: pid, targetSlot: null }
      : s.phase === 'COMMIT' ? { type: 'commit', player: pid, primaryId: idOf(s, pid, pl.primary), stance: pl.stance ?? 'assault', secondaryId: null, replaceSlot: null }
      : s.phase === 'REVISION' ? { type: 'revise', player: pid, commit: null }
      : s.phase === 'LECTURE' ? { type: 'lecture', player: pid, use: false }
      : s.phase === 'TACTICS' ? { type: 'tactics', player: pid, plans: [null, null], technique: null }
      : { type: 'repel', player: pid, targetSlot: null };
    const why = checkCommand(s, cmd);
    if (why) throw new Error(`${s.phase} ${pid} : ${why}`);
    const r = applyCommand(s, cmd);
    s = r.state;
    events.push(...r.events);
  }
  return { state: s, events };
}
const BASE = ['start', 'prepare', 'commit', 'tactics', 'resolved', 'zero', 'insight'];

describe('M12 — conseils des nouveaux signaux', () => {
  it('RÉVÉLER en préparation (après le conseil de base), puis le regard privé de Sextant à l’engagement', () => {
    const s0 = fixture(cfg(['Astre-2-sextant']), { hand: ['Cendre-4', 'Voile-1', 'Astre-3', 'Ronce-3'], slots: [{ def: 'Astre-2-sextant' }, null] }, { hand: ['Ronce-4', 'Astre-1', 'Voile-3', 'Cendre-2'] }, { phase: 'PREPARE' });
    expect(duelTip(ctl(s0, []), [])?.id).toBe('prepare');
    expect(duelTip(ctl(s0, []), ['prepare'])?.id).toBe('reveler');
    expect(duelTip(ctl(s0, []), ['prepare', 'reveler'])).toBeNull();
    const r = avancer(s0, { p1: { reveal: [0], primary: 'Cendre-4-basic' }, p2: { primary: 'Ronce-4-basic' } }, 'COMMIT');
    expect(r.state.phase).toBe('COMMIT');
    expect(duelTip(ctl(r.state, r.events), ['commit'])?.id).toBe('prive');
    // la vue du rival n'y est pour rien : seul le regard du joueur (p1) compte
    expect(duelTip(ctl(r.state, r.events.filter((e) => e.vis !== 'p1')), ['commit'])).toBeNull();
  });

  it('ARMÉ et la pastille de déclenchement en Tactique ; les temps forts à la fin du tour', () => {
    const s0 = fixture(cfg(['Cendre-4-phenix', 'Astre-2-constellation']), { hand: ['Cendre-4-phenix', 'Voile-1', 'Astre-3', 'Ronce-3'], slots: [{ def: 'Astre-2-constellation', active: true }, null] }, { hand: ['Ronce-4', 'Astre-1', 'Voile-3', 'Cendre-2'] }, { phase: 'COMMIT' });
    const r = avancer(s0, { p1: { primary: 'Cendre-4-phenix' }, p2: { primary: 'Ronce-4-basic', stance: 'guard' } }, 'TACTICS');
    expect(r.state.phase).toBe('TACTICS');
    const c = ctl(r.state, r.events);
    expect(duelTip(c, [])?.id).toBe('tactics');
    expect(duelTip(c, ['tactics'])?.id).toBe('arme');
    expect(duelTip(c, ['tactics', 'arme'])?.id).toBe('pastille');
    // fin du tour : Phénix perd contre la Garde et retourne en main (un effet s'est activé)
    const fin = avancer(r.state, { p1: { primary: 'Cendre-4-phenix' }, p2: { primary: 'Ronce-4-basic', stance: 'guard' } }, 'RESOLVED');
    expect(fin.state.phase).toBe('RESOLVED');
    expect(duelTip(ctl(fin.state, [...r.events, ...fin.events]), BASE)?.id).toBe('temps');
  });

  it('les cinq conseils existent ; ils ne paraissent jamais sans leur signal', () => {
    for (const id of ['reveler', 'arme', 'pastille', 'temps', 'prive']) expect(TIP_IDS).toContain(id);
    const s0 = fixture(cfg([]), { hand: ['Cendre-4', 'Voile-1', 'Astre-3', 'Ronce-3'], slots: [{ def: 'Cendre-2' }, null] }, { hand: ['Ronce-4', 'Astre-1', 'Voile-3', 'Cendre-2'] }, { phase: 'PREPARE' });
    expect(duelTip(ctl(s0, []), BASE)).toBeNull();
  });

  it('réglage dans l’aventure : affichés par défaut, coupés en QA sans ?conseils=1, mémoire des conseils lus', () => {
    expect(conseilsPermis('?aventure=1')).toBe(true);
    expect(conseilsPermis('?aventure=1&qa=1')).toBe(false);
    expect(conseilsPermis('?aventure=1&qa=1&conseils=1')).toBe(true);
    expect(conseilsPermis('?aventure=1&conseils=0')).toBe(false);
    const m = new Map<string, string>();
    const st = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
    expect(lireConseils(st)).toBe(true);
    ecrireConseils(st, false);
    expect(lireConseils(st)).toBe(false);
    expect(lireConseils(null)).toBe(true);
    expect(conseilLu(conseilLu(undefined, 'arme'), 'arme')).toEqual(['arme']);
  });
});
