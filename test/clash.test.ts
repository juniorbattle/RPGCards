/** Arithmétique normative du Clash (§6, §7, §14, delta D-01) — calcul pur. */
import { describe, expect, it } from 'vitest';
import { cardDef, type CardDef } from '../src/game/catalog/cards';
import { computeClash, damageCoefficient, rankSupport, type ClashSideInput, type ClashUse } from '../src/game/engine/clash';
import type { SlotIndex, Stance } from '../src/game/model/types';
import { d } from './helpers';

const c = (s: string): CardDef => cardDef(d(s));

function side(primary: string, stance: Stance, uses: Array<[string, ClashUse['mode'], SlotIndex?]> = [], keep: string[] = [], extra: Partial<ClashSideInput> = {}): ClashSideInput {
  const active: ClashSideInput['active'] = [];
  const u: ClashUse[] = [];
  uses.forEach(([card, mode, target], i) => {
    active.push({ slot: i as SlotIndex, def: c(card) });
    u.push(mode === 'interfere' ? { slot: i as SlotIndex, def: c(card), mode, target: target ?? 0 } : { slot: i as SlotIndex, def: c(card), mode });
  });
  keep.forEach((card) => active.push({ slot: active.length as SlotIndex, def: c(card) }));
  return { primary: c(primary), stance, active, uses: u, ...extra };
}

describe('Delta V3.2 D-01 — affinité de Rang', () => {
  it('G05 : soutien même famille = rang + 1, chaque soutien reçoit le bonus', () => {
    expect(rankSupport(c('Cendre-1'), c('Cendre-3'))).toBe(2);
    const o = computeClash({ p1: side('Cendre-2', 'assault', [['Cendre-1', 'rank'], ['Cendre-3', 'rank']]), p2: side('Voile-1', 'guard') });
    expect(o.scores.p1).toBe(2 + 2 + 4);
  });
  it('G06 : famille différente = rang seul ; la Garde gagne l’égalité', () => {
    // Exemple D-01 : Garde Ronce II + Ronce I (1+1) = 4 contre Assaut Cendre IV score 4 → Garde gagne.
    const a = computeClash({ p1: side('Cendre-4', 'assault'), p2: side('Ronce-2', 'guard', [['Ronce-1', 'rank']]) });
    expect(a.scores.p2).toBe(4);
    expect(a.guardWin).toBe(true);
    expect(a.winner).toBe('p2');
    expect(a.damage.p2).toBe(0);
    // Avec Astre I : score 3, la Garde perd et subit 12 − 6 = 6.
    const b = computeClash({ p1: side('Cendre-4', 'assault'), p2: side('Ronce-2', 'guard', [['Astre-1', 'rank']]) });
    expect(b.scores.p2).toBe(3);
    expect(b.winner).toBe('p1');
    expect(b.damage.p2).toBe(6);
  });
  it('le bonus de Rang n’augmente jamais la Puissance ni les coefficients', () => {
    // §14.1 : Astre III + Voile II Rang (+2) = 5 contre Cendre IV : inflige 9, pas 11 ni 12.
    const o = computeClash({ p1: side('Astre-3', 'assault', [['Voile-2', 'rank']]), p2: side('Cendre-4', 'assault') });
    expect(o.scores.p1).toBe(5);
    expect(o.damage.p2).toBe(9);
    expect(o.multipliers.p1).toBe(1);
  });
  it('G08 / D-05 : Cendre III P9 + Cendre I Rang vs Garde Cendre IV P12 → 5 contre 4, victoire au Rang, 0 dégât', () => {
    const o = computeClash({ p1: side('Cendre-3', 'assault', [['Cendre-1', 'rank']]), p2: side('Cendre-4', 'guard') });
    expect(o.scores).toEqual({ p1: 5, p2: 4 });
    expect(o.winner).toBe('p1');
    expect(o.guardWin).toBe(false);
    expect(o.damage).toEqual({ p1: 0, p2: 0 });
    expect(o.zeroDamageRankWin).toBe(true);
    expect(o.repelRight).toBeNull();
  });
  it('G09 : sans soutien la Garde IV gagne, 0 dégât, droit de Repoussement', () => {
    const o = computeClash({ p1: side('Cendre-3', 'assault'), p2: side('Cendre-4', 'guard') });
    expect(o.winner).toBe('p2');
    expect(o.guardWin).toBe(true);
    expect(o.damage).toEqual({ p1: 0, p2: 0 });
    expect(o.repelRight?.owner).toBe('p2');
    expect(o.insightReasons.p2).toContain('Garde victorieuse');
  });
});

describe('Puissance, M additif, issues (§6-7, §14, §16.4)', () => {
  it('G01 : coefficients de dégâts R / R+1', () => {
    expect([1, 2, 3, 4].map((r) => damageCoefficient(c(`Voile-${r}`), c('Cendre-4')))).toEqual([1, 2, 3, 4]);
    expect([1, 2, 3, 4].map((r) => damageCoefficient(c(`Cendre-${r}`), c('Cendre-4')))).toEqual([2, 3, 4, 5]);
  });
  it('§14.3 : ultime additif 12 × (4+3) = 84 contre Assaut, 21 contre Garde III — jamais ×12', () => {
    const vsA = computeClash({ p1: side('Cendre-4', 'assault', [['Cendre-3', 'damage'], ['Cendre-2', 'damage']]), p2: side('Voile-1', 'assault') });
    expect(vsA.multipliers.p1).toBe(7);
    expect(vsA.damage.p2).toBe(84);
    const vsG = computeClash({ p1: side('Cendre-4', 'assault', [['Cendre-3', 'damage'], ['Cendre-2', 'damage']]), p2: side('Ronce-3', 'guard') });
    expect(vsG.damage.p2).toBe(21);
  });
  it('§14.2 : Assaut IV P12 vs Garde III P9 → 3 ; vs Garde IV → bloqué', () => {
    expect(computeClash({ p1: side('Cendre-4', 'assault'), p2: side('Ronce-3', 'guard') }).damage.p2).toBe(3);
    const g4 = computeClash({ p1: side('Cendre-4', 'assault'), p2: side('Ronce-4', 'guard') });
    expect(g4.guardWin).toBe(true);
  });
  it('G10 : Signature P14 ×5+×4 vs Garde IV → 18 ; vs Assaut ordinaire → 126', () => {
    const g = computeClash({ p1: side('sig-Cendre', 'assault', [['Cendre-4', 'damage'], ['Cendre-3', 'damage']]), p2: side('Ronce-4', 'guard') });
    expect(g.multipliers.p1).toBe(9);
    expect(g.damage.p2).toBe(18);
    const a = computeClash({ p1: side('sig-Cendre', 'assault', [['Cendre-4', 'damage'], ['Cendre-3', 'damage']]), p2: side('Ronce-4', 'assault') });
    expect(a.damage.p2).toBe(126);
  });
  it('G11 : A/A égalité → impacts simultanés, aucun vainqueur ; ×7 contre ×1', () => {
    const o = computeClash({ p1: side('Cendre-4', 'assault', [['Cendre-3', 'damage'], ['Cendre-2', 'damage']]), p2: side('Voile-4', 'assault') });
    expect(o.outcome).toBe('tie-assault');
    expect(o.winner).toBeNull();
    expect(o.damage).toEqual({ p1: 12, p2: 84 });
  });
  it('G12 : ∞ domine un score ordinaire renforcé mais la Garde absorbe selon P', () => {
    const o = computeClash({ p1: side('sig-Voile', 'assault'), p2: side('Ronce-4', 'guard', [['Ronce-3', 'rank'], ['Ronce-2', 'rank']]) });
    expect(o.scores.p2).toBe(4 + 4 + 3);
    expect(o.winner).toBe('p1');
    expect(o.damage.p2).toBe(0); // P12 − P12
    expect(o.guardWin).toBe(false);
    expect(o.repelRight).toBeNull(); // pas de Repoussement pour la Garde perdante
    expect(o.insightReasons.p2).toEqual([]); // pas d’Insight naturel de Garde
  });
  it('G13 : ∞ Assaut vs ∞ Garde → Garde gagne, 0 ; ∞/∞ Assauts → échange 14/12', () => {
    const ag = computeClash({ p1: side('sig-Cendre', 'assault'), p2: side('sig-Ronce', 'guard') });
    expect(ag.guardWin).toBe(true);
    expect(ag.damage).toEqual({ p1: 0, p2: 0 });
    const aa = computeClash({ p1: side('sig-Cendre', 'assault'), p2: side('sig-Voile', 'assault') });
    expect(aa.outcome).toBe('tie-assault');
    expect(aa.damage).toEqual({ p1: 12, p2: 14 });
  });
  it('Garde / Garde : 0 blessure, aucune victoire, aucun Repoussement', () => {
    const o = computeClash({ p1: side('Cendre-4', 'guard'), p2: side('Ronce-1', 'guard') });
    expect(o.outcome).toBe('double-guard');
    expect(o.repelRight).toBeNull();
  });
});

describe('Interférences (§7.3, G07, G14, G15)', () => {
  it('G07 : l’Interférence compare les Rangs imprimés, jamais le bonus d’affinité', () => {
    // p2 Cendre I (rang 1) interfère sur p1 Cendre II engagée en Rang (bonus 3) : rang 1 < 2 → échec.
    const o = computeClash({
      p1: side('Cendre-4', 'assault', [['Cendre-2', 'rank']]),
      p2: side('Voile-3', 'guard', [['Cendre-1', 'interfere', 0]]),
    });
    expect(o.uses.p2[0]!.success).toBe(false);
    const ok = computeClash({
      p1: side('Cendre-4', 'assault', [['Cendre-2', 'rank']]),
      p2: side('Voile-3', 'guard', [['Voile-2', 'interfere', 0]]),
    });
    expect(ok.uses.p2[0]!.success).toBe(true);
    expect(ok.uses.p1[0]!.cancelled).toBe(true);
    expect(ok.scores.p1).toBe(4);
  });
  it('G14 : contre une cible Conservée → échec, cible intacte, interférente consommée, pas d’Insight', () => {
    const o = computeClash({ p1: side('Cendre-4', 'assault', [], ['Cendre-2']), p2: side('Voile-3', 'guard', [['Voile-3', 'interfere', 0]]) });
    expect(o.uses.p2[0]!.success).toBe(false);
    expect(o.destinations.p2[0]).toBe('discard');
    expect(o.insightReasons.p2).not.toContain('Interférence réussie');
  });
  it('G15 : Interférences mutuelles valides → deux annulations en une passe, Insight des deux côtés', () => {
    const o = computeClash({ p1: side('Cendre-4', 'assault', [['Voile-3', 'interfere', 0]]), p2: side('Ronce-3', 'guard', [['Astre-3', 'interfere', 0]]) });
    expect(o.uses.p1[0]!.success && o.uses.p2[0]!.success).toBe(true);
    expect(o.uses.p1[0]!.cancelled && o.uses.p2[0]!.cancelled).toBe(true);
    expect(o.insightReasons.p1).toContain('Interférence réussie');
    expect(o.insightReasons.p2).toContain('Interférence réussie');
  });
  it('§14.3 : soutien Dégâts interféré → M ne compte que les coefficients survivants', () => {
    const o = computeClash({
      p1: side('Cendre-4', 'assault', [['Cendre-3', 'damage'], ['Cendre-2', 'damage']]),
      p2: side('Voile-1', 'assault', [['Voile-4', 'interfere', 0]]),
    });
    expect(o.multipliers.p1).toBe(3);
    expect(o.damage.p2).toBe(36);
  });
});

describe('Variantes et Signatures (§8, §11)', () => {
  it('Convergence (Astre IV) soutenant Cendre IV : ×6 + ×3 = ×9 → 108 / 27', () => {
    const a = computeClash({ p1: side('Cendre-4', 'assault', [['Astre-4-convergence', 'damage'], ['Cendre-2', 'damage']]), p2: side('Voile-1', 'assault') });
    expect(a.multipliers.p1).toBe(9);
    expect(a.damage.p2).toBe(108);
    const g = computeClash({ p1: side('Cendre-4', 'assault', [['Astre-4-convergence', 'damage'], ['Cendre-2', 'damage']]), p2: side('Ronce-3', 'guard') });
    expect(g.damage.p2).toBe(27);
    expect(damageCoefficient(c('Astre-4-convergence'), c('Astre-3'))).toBe(5);
  });
  it('Prisme : +1 hors famille, sans double +1 en Astre', () => {
    expect(damageCoefficient(c('Astre-2-prisme'), c('Cendre-4'))).toBe(3);
    expect(damageCoefficient(c('Astre-2-prisme'), c('Astre-4'))).toBe(3);
  });
  it('Braise : victoire A/A sans soutien Dégâts → +2 fixes ; égalité ≠ victoire', () => {
    const o = computeClash({ p1: side('Cendre-2-braise', 'assault'), p2: side('Voile-1', 'assault') });
    expect(o.damage.p2).toBe(6 + 2);
    const tie = computeClash({ p1: side('Cendre-2-braise', 'assault'), p2: side('Voile-2', 'assault') });
    expect(tie.fixedDamage.p2).toBe(0);
  });
  it('Contrecoup : défaite A/A → 3 fixes simultanés (peut créer un double K.-O.)', () => {
    const o = computeClash({ p1: side('Cendre-4-contrecoup', 'assault'), p2: side('sig-Voile', 'assault') });
    expect(o.winner).toBe('p2');
    expect(o.damage.p2).toBe(3);
    expect(o.damage.p1).toBe(12);
  });
  it('Étincelle : victoire avec exactement 1 point d’avance et blessure → +2 après formule', () => {
    const o = computeClash({ p1: side('Voile-3', 'assault', [['Cendre-1-etincelle', 'rank']]), p2: side('Ronce-3', 'assault') });
    expect(o.scores).toEqual({ p1: 4, p2: 3 });
    expect(o.damage.p2).toBe(9 + 2);
    const big = computeClash({ p1: side('Voile-4', 'assault', [['Cendre-1-etincelle', 'rank']]), p2: side('Ronce-3', 'assault') });
    expect(big.fixedDamage.p2).toBe(0);
  });
  it('Ferveur : Primaire Cendre gagnante et blessante → raison Insight', () => {
    const o = computeClash({ p1: side('Cendre-4', 'assault', [['Cendre-3-ferveur', 'damage']]), p2: side('Voile-1', 'assault') });
    expect(o.insightReasons.p1).toContain('Ferveur');
  });
  it('Écaille : Garde gagnante → soin 2 ; Ténacité : Garde perdante → sous la pioche', () => {
    const e = computeClash({ p1: side('Cendre-2', 'assault'), p2: side('Ronce-1', 'guard', [['Ronce-2-ecaille', 'rank']]) });
    expect(e.guardWin).toBe(true);
    expect(e.heal.p2).toBe(2);
    const t = computeClash({ p1: side('Cendre-4', 'assault', [['Cendre-3', 'rank']]), p2: side('Ronce-1', 'guard', [['Ronce-4-tenacite', 'rank']]) });
    expect(t.winner).toBe('p1');
    expect(t.destinations.p2[0]).toBe('bottom');
  });
  it('Relance : Interférence réussie contre Rang III → sommet ; contre II → défausse', () => {
    const r = computeClash({ p1: side('Cendre-4', 'assault', [['Cendre-3', 'damage']]), p2: side('Voile-1', 'guard', [['Astre-3-relance', 'interfere', 0]]) });
    expect(r.destinations.p2[0]).toBe('top');
    const n = computeClash({ p1: side('Cendre-4', 'assault', [['Cendre-2', 'damage']]), p2: side('Voile-1', 'guard', [['Astre-3-relance', 'interfere', 0]]) });
    expect(n.destinations.p2[0]).toBe('discard');
  });
  it('Silence : succès contre Secondaire IV → effet de Primaire en attente neutralisé, priorité ∞ intacte', () => {
    const o = computeClash({
      p1: side('sig-Cendre', 'assault', [['Cendre-4', 'damage']]),
      p2: side('Ronce-4', 'guard', [['Voile-4-silence', 'interfere', 0]]),
    });
    expect(o.silenced.p1).toBe(true);
    expect(o.scores.p1).toBe(Infinity);
    expect(o.winner).toBe('p1');
    expect(o.repelRight).toBeNull(); // Flamme conquérante neutralisée
  });
  it('Flamme conquérante : victoire en Assaut, blessure et soutien Dégâts non annulé → droit de Repousser', () => {
    const o = computeClash({ p1: side('sig-Cendre', 'assault', [['Cendre-1', 'damage']]), p2: side('Ronce-3', 'guard') });
    expect(o.damage.p2).toBe((14 - 9) * 2);
    expect(o.repelRight?.kind).toBe('flamme');
    const none = computeClash({ p1: side('sig-Cendre', 'assault'), p2: side('Ronce-4', 'guard') });
    expect(none.damage.p2).toBe(2);
    expect(none.repelRight).toBeNull();
  });
  it('Cycle astral : exactement un soutien valide → sommet ; deux soutiens → rien ; Rang seul → rien', () => {
    const one = computeClash({ p1: side('sig-Astre', 'assault', [['Voile-2', 'damage']]), p2: side('Ronce-1', 'assault') });
    expect(one.destinations.p1[0]).toBe('top');
    const two = computeClash({ p1: side('sig-Astre', 'assault', [['Voile-2', 'damage'], ['Voile-3', 'damage']]), p2: side('Ronce-1', 'assault') });
    expect(Object.values(two.destinations.p1)).toEqual(['discard', 'discard']);
    const rank = computeClash({ p1: side('sig-Astre', 'assault', [['Voile-2', 'rank']]), p2: side('Ronce-1', 'assault') });
    expect(rank.destinations.p1[0]).toBe('discard');
    // Deux engagées dont une annulée → condition satisfaite.
    const cancelled = computeClash({
      p1: side('sig-Astre', 'assault', [['Voile-2', 'damage'], ['Voile-3', 'damage']]),
      p2: side('Ronce-1', 'assault', [['Ronce-4', 'interfere', 1]]),
    });
    expect(cancelled.destinations.p1[0]).toBe('top');
  });
  it('Ancrage : soutien interféré préservé (action annulée) ; non interféré → consommé', () => {
    const o = computeClash({
      p1: side('Cendre-4', 'assault', [['Cendre-3', 'damage']], [], { ancrageSlot: 0 }),
      p2: side('Voile-1', 'guard', [['Voile-4', 'interfere', 0]]),
    });
    expect(o.uses.p1[0]!.cancelled).toBe(true);
    expect(o.destinations.p1[0]).toBe('stay');
    expect(o.multipliers.p1).toBe(1);
    const n = computeClash({ p1: side('Cendre-4', 'assault', [['Cendre-3', 'damage']], [], { ancrageSlot: 0 }), p2: side('Voile-1', 'guard') });
    expect(n.destinations.p1[0]).toBe('discard');
  });
});
