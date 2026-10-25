/**
 * Avenant 07 (règle V3.3, `contracts/07_AVENANT_V3_3_GARDE.md`) : la Garde réduit sans annuler. Quand l'Assaut gagne la
 * priorité contre une Garde, `absorptionEffective = min(⌈P_Garde / 2⌉, P_Assaut − 1)` et les dégâts de base valent
 * `(P_Assaut − absorptionEffective) × M`. Cas de test prioritaires du responsable (G-07) et invariants.
 */
import { describe, expect, it } from 'vitest';
import { cardDef, type CardDef } from '../src/game/catalog/cards';
import { computeClash, guardAbsorption, guardHalf, type ClashSideInput, type ClashUse } from '../src/game/engine/clash';
import { DEFAULT_CONFIG } from '../src/game/engine/engine';
import { autoplay } from '../src/game/match';
import type { ClashReport, SlotIndex, Stance } from '../src/game/model/types';
import { replay } from '../src/game/replay/replay';
import { buildJournal } from '../src/game/visibility/journal';
import { buildResolutionBeats, resolutionStart } from '../src/presentation/beats';
import { buildClashScript } from '../src/presentation/clashMotion';
import { RULES, verifyActiveCore } from '../src/product/resume';
import { config, d, fixture, Runner } from './helpers';

const c = (s: string): CardDef => cardDef(d(s));
function side(primary: string, stance: Stance, uses: Array<[string, ClashUse['mode'], SlotIndex?]> = []): ClashSideInput {
  const active: ClashSideInput['active'] = [];
  const u: ClashUse[] = [];
  uses.forEach(([card, mode, target], i) => {
    active.push({ slot: i as SlotIndex, def: c(card) });
    u.push(mode === 'interfere' ? { slot: i as SlotIndex, def: c(card), mode, target: target ?? 0 } : { slot: i as SlotIndex, def: c(card), mode });
  });
  return { primary: c(primary), stance, active, uses: u };
}

describe('Avenant 07 — absorption effective (G-02)', () => {
  it('moitié arrondie au supérieur : Garde I 2, II 3, III 5, IV 6 ; Signatures 6, 7, 7', () => {
    expect([3, 6, 9, 12, 13, 14].map(guardHalf)).toEqual([2, 3, 5, 6, 7, 7]);
  });
  it('plafonnée à P_Assaut − 1 : au moins 1 dégât de base', () => {
    expect(guardAbsorption(3, 12)).toBe(2);
    expect(guardAbsorption(6, 12)).toBe(5);
    expect(guardAbsorption(6, 9)).toBe(5);
    expect(guardAbsorption(9, 12)).toBe(6);
    for (const pa of [3, 6, 9, 12, 13, 14]) for (const pg of [3, 6, 9, 12]) expect(pa - guardAbsorption(pa, pg)).toBeGreaterThanOrEqual(1);
  });
});

describe('Avenant 07 — tableau G-03 : les 28 cases, Assaut vainqueur', () => {
  // Assauts ordinaires (Cendre I à IV) soutenus en Rang par Voile IV (+4) : score ≥ 5 > toute Garde ordinaire sans soutien.
  const ASSAUTS: Array<[string, number[]]> = [
    ['Cendre-1', [1, 1, 1, 1]],
    ['Cendre-2', [4, 3, 1, 1]],
    ['Cendre-3', [7, 6, 4, 3]],
    ['Cendre-4', [10, 9, 7, 6]],
    ['sig-Voile', [10, 9, 7, 6]],
    ['sig-Astre', [11, 10, 8, 7]],
    ['sig-Cendre', [12, 11, 9, 8]],
  ];
  const GARDES = ['Ronce-1', 'Ronce-2', 'Ronce-3', 'Ronce-4'];
  for (const [a, attendus] of ASSAUTS) {
    it(`${a} contre les Gardes I à IV : ${attendus.join(' / ')} ; ×3 : ${attendus.map((x) => x * 3).join(' / ')}`, () => {
      GARDES.forEach((g, i) => {
        const sig = a.startsWith('sig-');
        const m1 = computeClash({ p1: side(a, 'assault', sig ? [] : [['Voile-4', 'rank']]), p2: side(g, 'guard') });
        expect(m1.winner).toBe('p1');
        expect(m1.guardWin).toBe(false);
        expect(m1.baseDamage.p2).toBe(attendus[i]);
        expect(m1.absorbed).toBe(c(a).power - attendus[i]!);
        expect(m1.zeroDamageRankWin).toBe(false);
        // M = 3 par un soutien Dégâts hors famille de Rang III (Ronce III), appliqué APRÈS la soustraction
        const m3 = computeClash({ p1: side(a, 'assault', sig ? [['Ronce-3', 'damage']] : [['Voile-4', 'rank'], ['Ronce-3', 'damage']]), p2: side(g, 'guard') });
        expect(m3.multipliers.p1).toBe(3);
        expect(m3.baseDamage.p2).toBe(attendus[i]! * 3);
      });
    });
  }
  it('le score de Rang de la Garde ne devient jamais de la Puissance d’absorption', () => {
    // Garde Ronce II renforcée (Ronce I +2 → score 4) dominée par Cendre IV + Voile I (score 5) : elle absorbe 3, pas plus.
    const o = computeClash({ p1: side('Cendre-4', 'assault', [['Voile-1', 'rank']]), p2: side('Ronce-2', 'guard', [['Ronce-1', 'rank']]) });
    expect(o.scores).toEqual({ p1: 5, p2: 4 });
    expect(o.absorbed).toBe(3);
    expect(o.damage.p2).toBe(9);
  });
});

describe('Avenant 07 — cas de non-régression prioritaires (G-07)', () => {
  it('1 : Assaut II P6, score 6, contre Garde IV P12, score 4 → 1 dégât de base, ni Repoussement ni Insight de Garde', () => {
    const s = fixture(config(), { hand: ['Cendre-2', 'Voile-1'], slots: [{ def: 'Cendre-3', active: true }, { def: 'Astre-1' }] }, { hand: ['Cendre-4', 'Astre-2'] });
    const r = new Runner(s).commit('p1', 'Cendre-2', 'assault').commit('p2', 'Cendre-4', 'guard');
    const before = r.events.length;
    r.tactics('p1', [{ mode: 'rank' }, null]);
    const batch = r.events.slice(before);
    const rep = r.state.lastClash!;
    expect(rep.scores).toEqual({ p1: 6, p2: 4 });
    // même absorption effective dans la mise en scène (« ABSORBE 5 ») et les temps forts
    const sc = buildClashScript(batch, 'p1', r.state.reveal.primaries!)!;
    expect(sc.outcome).toBe('guard-breaks');
    expect(sc.absorption).toEqual({ assault: 6, guard: 12, absorbed: 5 });
    expect(sc.bullets).toContain('La Garde absorbe 5 sur 6 : 1 de Puissance passe (au moins 1).');
    const out = buildResolutionBeats(batch.slice(resolutionStart(batch)), { viewer: 'p1', primaries: r.state.reveal.primaries }).find((b) => b.kind === 'outcome')!;
    expect(out.detail).toContain('la Garde absorbe 5 (plafonnée : au moins 1 dégât passe)');
    expect(rep.winner).toBe('p1');
    expect(rep.absorbed).toBe(5);
    expect(rep.baseDamage.p2).toBe(1);
    expect(rep.damage).toEqual({ p1: 0, p2: 1 });
    expect(rep.zeroDamageRankWin).toBe(false);
    expect(r.state.phase).not.toBe('REPEL');
    expect(r.state.players.p1.slots[1]).not.toBeNull(); // la Secondaire cachée n’est pas repoussée
    expect(r.state.players.p2.insight).toBe(1);
    expect(buildJournal(r.events, 'p1').map((l) => l.text).join('\n')).toMatch(/Vous dominez au Rang \(6 contre 4\) ; la Garde absorbe 5 \(plafonnée : au moins 1 dégât passe\) : \(6 − 5\) × 1 = 1\./);
  });
  it('2 : même situation avec ×5 (Cendre IV en Dégâts) → 5 dégâts', () => {
    const s = fixture(config(), { hand: ['Cendre-2', 'Voile-1'], slots: [{ def: 'Cendre-3', active: true }, { def: 'Cendre-4', active: true }] }, { hand: ['Cendre-4', 'Astre-2'] });
    const r = new Runner(s).commit('p1', 'Cendre-2', 'assault').commit('p2', 'Cendre-4', 'guard');
    r.tactics('p1', [{ mode: 'rank' }, { mode: 'damage' }]);
    const rep = r.state.lastClash!;
    expect(rep.multipliers.p1).toBe(5);
    expect(rep.damage.p2).toBe(5);
  });
  it('3 : Assaut III P9, score 5, contre Garde IV P12, score 4 → 3 dégâts (D-05)', () => {
    const o = computeClash({ p1: side('Cendre-3', 'assault', [['Cendre-1', 'rank']]), p2: side('Cendre-4', 'guard') });
    expect(o.scores).toEqual({ p1: 5, p2: 4 });
    expect(o.damage.p2).toBe(3);
  });
  it('4 : Garde IV, score 4, contre Assaut IV, score 4 → victoire défensive, 0 dégât, +1 Insight, Repoussement', () => {
    const s = fixture(config(), { hand: ['Cendre-4', 'Voile-1'], slots: [{ def: 'Astre-1' }, null] }, { hand: ['Ronce-4', 'Astre-2'] });
    const r = new Runner(s).commit('p1', 'Cendre-4', 'assault').commit('p2', 'Ronce-4', 'guard');
    const rep = r.state.lastClash!;
    expect(rep.guardWin).toBe(true);
    expect(rep.winner).toBe('p2');
    expect(rep.damage).toEqual({ p1: 0, p2: 0 });
    expect(rep.absorbed).toBe(0);
    expect(r.state.players.p2.insight).toBe(2);
    expect(r.state.phase).toBe('REPEL');
    expect(r.state.repel?.choices).toEqual([0]);
  });
  it('5 : Garde renforcée au-dessus de l’Assaut → blocage et Repoussement d’une Secondaire en chargement', () => {
    const s = fixture(config(), { hand: ['Cendre-4', 'Voile-1', 'Astre-3'] }, { hand: ['Ronce-3', 'Astre-2'], slots: [{ def: 'Ronce-1', active: true }, null] });
    const r = new Runner(s).commit('p1', 'Cendre-4', 'assault', 'Voile-1').commit('p2', 'Ronce-3', 'guard');
    r.tactics('p2', [{ mode: 'rank' }, null]);
    const rep = r.state.lastClash!;
    expect(rep.scores).toEqual({ p1: 4, p2: 5 });
    expect(rep.guardWin).toBe(true);
    expect(rep.damage).toEqual({ p1: 0, p2: 0 });
    expect(r.state.players.p2.insight).toBe(2);
    expect(r.state.phase).toBe('REPEL');
    expect(r.state.players.p1.slots[0]?.placedTurn).toBe(r.state.turn); // posée ce tour : en chargement
    expect(r.state.repel?.choices).toEqual([0]);
    r.apply({ type: 'repel', player: 'p2', targetSlot: 0 });
    expect(r.state.players.p1.slots[0]).toBeNull();
  });
  it('6 : Signature en Garde contre Signature en Assaut → égalité ∞, Garde victorieuse, 0 dégât', () => {
    const o = computeClash({ p1: side('sig-Cendre', 'assault', [['Cendre-4', 'damage']]), p2: side('sig-Ronce', 'guard') });
    expect(o.scores).toEqual({ p1: Infinity, p2: Infinity });
    expect(o.guardWin).toBe(true);
    expect(o.winner).toBe('p2');
    expect(o.damage).toEqual({ p1: 0, p2: 0 });
    expect(o.repelRight?.kind).toBe('emprise');
    expect(o.insightSources.p2).toEqual([{ kind: 'guard-win' }]);
  });
});

describe('Avenant 07 — effets qui dépendent de la blessure (G-05)', () => {
  it('Étincelle : contre une Garde, seule compte l’avance exacte de 1 (Cendre III + Étincelle contre Garde IV → 3 + 2)', () => {
    const o = computeClash({ p1: side('Cendre-3', 'assault', [['Cendre-1-etincelle', 'rank']]), p2: side('Cendre-4', 'guard') });
    expect(o.scores).toEqual({ p1: 5, p2: 4 });
    expect(o.baseDamage.p2).toBe(3);
    expect(o.fixedDamage.p2).toBe(2);
    expect(o.damage.p2).toBe(5);
    const big = computeClash({ p1: side('Cendre-3', 'assault', [['Cendre-1-etincelle', 'rank'], ['Voile-2', 'rank']]), p2: side('Cendre-4', 'guard') });
    expect(big.fixedDamage.p2).toBe(0); // avance de 3
  });
  it('Ferveur : une victoire d’une Primaire Cendre contre une Garde blesse toujours → +1 Insight', () => {
    const o = computeClash({ p1: side('Cendre-2', 'assault', [['Cendre-4', 'rank'], ['Cendre-3-ferveur', 'damage']]), p2: side('Ronce-3', 'guard') });
    expect(o.scores.p1).toBe(7);
    expect(o.multipliers.p1).toBe(4);
    expect(o.damage.p2).toBe((6 - 5) * 4);
    expect(o.insightReasons.p1).toContain('Ferveur');
  });
  it('Flamme conquérante : issue inchangée ; soutien interféré → échec, 8 PV quand même', () => {
    const ok = computeClash({ p1: side('sig-Cendre', 'assault', [['Cendre-1', 'damage']]), p2: side('Ronce-4', 'guard') });
    expect(ok.damage.p2).toBe((14 - 6) * 2);
    expect(ok.repelRight?.kind).toBe('flamme');
    const ko = computeClash({ p1: side('sig-Cendre', 'assault', [['Cendre-1', 'damage']]), p2: side('Ronce-4', 'guard', [['Voile-1', 'interfere', 0]]) });
    expect(ko.damage.p2).toBe(8);
    expect(ko.repelRight).toBeNull();
    expect(ko.effects.find((e) => e.effect === 'flamme')?.status).toBe('failed');
  });
  it('Garde dominée : ni Repoussement ni Insight naturel, même contre une Signature', () => {
    const o = computeClash({ p1: side('sig-Voile', 'assault'), p2: side('Ronce-4', 'guard', [['Ronce-3', 'rank'], ['Ronce-2', 'rank']]) });
    expect(o.damage.p2).toBe(6);
    expect(o.repelRight).toBeNull();
    expect(o.insightSources.p2).toEqual([]);
  });
});

describe('Avenant 07 — invariants, sauvegardes et replays (G-07 7d, 7e ; G-08)', () => {
  it('7d : sur des duels IA contre IA, aucun Assaut vainqueur contre une Garde ne finit sans blessure', () => {
    let ag = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const m = autoplay({ ...DEFAULT_CONFIG, seed: 33000 + seed });
      for (const e of m.events) {
        if (e.kind !== 'clash' || e.vis !== 'public') continue;
        const r = e.data as unknown as ClashReport;
        expect(r.zeroDamageRankWin).toBe(false);
        if (r.stances.p1 !== r.stances.p2 && !r.guardWin) {
          ag++;
          const l = r.winner === 'p1' ? 'p2' : 'p1';
          expect(r.baseDamage[l]).toBeGreaterThanOrEqual(1);
          expect(r.absorbed).toBe(guardAbsorption(r.powers[r.winner!], r.powers[l]));
        }
      }
    }
    expect(ag).toBeGreaterThan(20);
  });
  it('7e : étiquette V3.0+delta-V3.3.2 (avenants 07 et 08, amendement 1) ; un duel sauvegardé sous V3.2 est refusé avec sa raison ; un replay V3.3 rejoue à l’identique', () => {
    expect(RULES).toBe('V3.0+delta-V3.3.2');
    const m = autoplay({ ...DEFAULT_CONFIG, seed: 33101 }, 4);
    expect(m.state.rules).toBe('V3.0+delta-V3.3.2');
    expect(replay(m.record()).hash).toBe(m.hash());
    const active = { id: 'x', encounterId: 'libre-braise', seed: 33101, startedAt: '2026-10-24T00:00:00.000Z', rules: RULES, catalog: m.record().catalog, config: m.config, commands: m.commands, hash: m.hash(), turn: m.state.turn };
    expect(verifyActiveCore(active)).toEqual({ ok: true });
    expect(verifyActiveCore({ ...active, rules: 'V3.0+delta-V3.2' })).toEqual({ ok: false, reason: 'Règles différentes (V3.0+delta-V3.2).' });
  });
});
