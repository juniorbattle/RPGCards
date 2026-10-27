/**
 * Avenant 09 (M12, appliqué à titre provisoire) — les 32 variantes B et C : chaque effet sur le calcul pur du Clash
 * (`computeClash`), puis les effets hors du Clash sur le moteur (révélation volontaire, regards à la révélation de la
 * Primaire, Éclipse, Phénix, Lierre) ; secret : un regard reste privé, une conséquence publique ne nomme pas une carte
 * camouflée. Le catalogue : trois variantes par identité, deck par défaut en variantes A.
 */
import { describe, expect, it } from 'vitest';
import { buildDeck, CATALOG, cardDef, EFFECTS, FAMILIES, VARIANTS, variantLetter } from '../src/game/catalog/cards';
import { computeClash, type ClashInput, type ClashUse } from '../src/game/engine/clash';
import { applyCommand, checkCommand, DEFAULT_CONFIG } from '../src/game/engine/engine';
import { fixture, idOf } from '../src/game/fixtures/fixture';
import type { GameConfig, GameEvent, GameState, PlayerCommand, PlayerId, SlotIndex, Stance, TacticPlan } from '../src/game/model/types';
import { visibleEvents } from '../src/game/visibility/view';

type U = { slot: SlotIndex; def: string; mode: ClashUse['mode']; target?: SlotIndex };
const side = (primary: string, stance: Stance, uses: U[] = [], extraActive: Array<{ slot: SlotIndex; def: string }> = []) => ({
  primary: cardDef(primary), stance,
  active: [...uses.map((u) => ({ slot: u.slot, def: cardDef(u.def) })), ...extraActive.map((a) => ({ slot: a.slot, def: cardDef(a.def) }))],
  uses: uses.map((u) => ({ slot: u.slot, def: cardDef(u.def), mode: u.mode, ...(u.target !== undefined ? { target: u.target } : {}) })),
});
const clash = (p1: ReturnType<typeof side>, p2: ReturnType<typeof side>) => computeClash({ p1, p2 } as ClashInput);
const eff = (out: ReturnType<typeof computeClash>, id: string) => out.effects.find((e) => e.effect === id);

describe('avenant 09 — le catalogue', () => {
  it('trois variantes par identité (48), même Rang et même Puissance que la Basic ; le deck par défaut reste en A', () => {
    let n = 0;
    for (const f of FAMILIES) for (const r of [1, 2, 3, 4] as const) {
      expect(VARIANTS[f][r]).toHaveLength(3);
      for (const [e] of VARIANTS[f][r]) {
        const c = CATALOG[`${f}-${r}-${e}`]!;
        expect(c.power).toBe(CATALOG[`${f}-${r}-basic`]!.power);
        expect(EFFECTS[e].text.length).toBeGreaterThan(20);
        n++;
      }
    }
    expect(n).toBe(48);
    expect(buildDeck({ signature: 'Cendre', variants: 'all' }).filter((x) => cardDef(x).effect && !cardDef(x).signature).every((x) => variantLetter(cardDef(x)) === 'A')).toBe(true);
    // une identité = variante A ; une définition = cette variante
    const deck = buildDeck({ signature: 'Astre', variants: ['Cendre-1', 'Voile-2-filombre', 'Ronce-4-herse'] });
    expect(deck).toContain('Cendre-1-etincelle');
    expect(deck).toContain('Voile-2-filombre');
    expect(deck).toContain('Ronce-4-herse');
    expect(deck).toContain('Astre-1-basic');
  });
});

describe('avenant 09 — effets au Clash', () => {
  it('Tison : coefficient +1 en Assaut ; Primaire battue : 2 dégâts fixes à son propriétaire', () => {
    const win = clash(side('Cendre-4-basic', 'assault', [{ slot: 0, def: 'Cendre-1-tison', mode: 'damage' }]), side('Ronce-2-basic', 'assault'));
    expect(win.multipliers.p1).toBe(1 + 1 + 1); // Rang I + affinité + Tison
    const lose = clash(side('Cendre-2-basic', 'assault', [{ slot: 0, def: 'Cendre-1-tison', mode: 'damage' }]), side('Ronce-4-basic', 'assault'));
    expect(lose.fixedDamage.p1).toBe(2);
    expect(eff(lose, 'tison')).toMatchObject({ status: 'success', consequence: { kind: 'fixed-damage', amount: 2, self: true } });
  });

  it('Surenchère : soutien +2 ; Primaire battue : 3 dégâts fixes', () => {
    const out = clash(side('Ronce-1-basic', 'assault', [{ slot: 0, def: 'Cendre-3-surenchere', mode: 'rank' }]), side('Astre-4-basic', 'assault', [{ slot: 1, def: 'Astre-3-basic', mode: 'rank' }]));
    expect(out.scores.p1).toBe(1 + 3 + 2);
    expect(out.winner).toBe('p2');
    expect(out.fixedDamage.p1).toBe(3);
  });

  it('Percée (−2), Fournaise (quart), Rempart (trois quarts), Fournaise contre Rempart (moitié)', () => {
    const base = (atk: U[], guard: string) => clash(side('Cendre-4-basic', 'assault', atk), side(guard, 'guard'));
    expect(base([{ slot: 0, def: 'Cendre-3-basic', mode: 'rank' }], 'Ronce-3-basic').absorbed).toBe(5); // ⌈9/2⌉
    expect(base([{ slot: 0, def: 'Cendre-2-percee', mode: 'rank' }], 'Ronce-3-basic').absorbed).toBe(3);
    expect(base([{ slot: 0, def: 'Cendre-1-basic', mode: 'rank' }, { slot: 1, def: 'Cendre-4-fournaise', mode: 'damage' }], 'Ronce-3-basic').absorbed).toBe(3); // ⌈9/4⌉
    const rempart = clash(side('Cendre-4-basic', 'assault', [{ slot: 0, def: 'Cendre-3-basic', mode: 'rank' }, { slot: 1, def: 'Cendre-1-basic', mode: 'rank' }]), side('Ronce-4-rempart', 'guard'));
    expect(rempart.winner).toBe('p1');
    expect(rempart.absorbed).toBe(Math.min(9, 12 - 1)); // ⌈3 × 12 / 4⌉ = 9
    expect(eff(rempart, 'rempart')?.status).toBe('success');
    const both = clash(side('Cendre-4-basic', 'assault', [{ slot: 0, def: 'Cendre-3-basic', mode: 'rank' }, { slot: 1, def: 'Cendre-4-fournaise', mode: 'damage' }]), side('Ronce-4-rempart', 'guard'));
    expect(both.absorbed).toBe(6); // ⌈12/2⌉
  });

  it('Brûlure : Interférence réussie → 2 dégâts fixes à l’adversaire ; Contre-jour : réussit contre un Rang de plus', () => {
    const b = clash(side('Cendre-2-basic', 'assault', [{ slot: 0, def: 'Cendre-3-brulure', mode: 'interfere', target: 0 }]), side('Ronce-2-basic', 'guard', [{ slot: 0, def: 'Ronce-3-basic', mode: 'rank' }]));
    expect(b.fixedDamage.p2).toBe(2);
    const c = clash(side('Voile-2-basic', 'assault', [{ slot: 0, def: 'Voile-3-contrejour', mode: 'interfere', target: 0 }]), side('Ronce-2-basic', 'assault', [{ slot: 0, def: 'Ronce-4-basic', mode: 'rank' }]));
    expect(c.uses.p1[0]!.success).toBe(true);
    const plain = clash(side('Voile-2-basic', 'assault', [{ slot: 0, def: 'Voile-3-basic', mode: 'interfere', target: 0 }]), side('Ronce-2-basic', 'assault', [{ slot: 0, def: 'Ronce-4-basic', mode: 'rank' }]));
    expect(plain.uses.p1[0]!.success).toBe(false);
  });

  it('Leurre : une Interférence contre elle (engagée en Rang) échoue, quel que soit son Rang', () => {
    const out = clash(side('Voile-3-basic', 'assault', [{ slot: 0, def: 'Voile-1-leurre', mode: 'rank' }]), side('Cendre-3-basic', 'assault', [{ slot: 1, def: 'Cendre-4-basic', mode: 'interfere', target: 0 }]));
    expect(out.uses.p2[0]).toMatchObject({ success: false, targetProtected: true });
    expect(out.uses.p1[0]!.cancelled).toBe(false);
    expect(eff(out, 'leurre')?.status).toBe('success');
  });

  it('Bravade : la Garde victorieuse ne Repousse pas et ne gagne pas l’Insight de Garde victorieuse', () => {
    const out = clash(side('Cendre-2-bravade', 'assault'), side('Ronce-4-basic', 'guard'));
    expect(out.guardWin).toBe(true);
    expect(out.repelRight).toBeNull();
    expect(out.insightSources.p2).toEqual([]);
    expect(eff(out, 'bravade')?.status).toBe('success');
  });

  it('Phénix (battue) et Racines profondes (Garde victorieuse) : la Primaire retourne en main', () => {
    expect(clash(side('Cendre-4-phenix', 'assault'), side('sig-Ronce', 'assault')).primaryToHand.p1).toBe(true);
    expect(clash(side('Cendre-4-phenix', 'assault'), side('Ronce-1-basic', 'assault')).primaryToHand.p1).toBe(false);
    expect(clash(side('Ronce-3-profondes', 'guard'), side('Cendre-2-basic', 'assault')).primaryToHand.p1).toBe(true);
  });

  it('regards : Écho (battue), Fil d’ombre (victoire), Murmure (Interférence réussie : sommet de la pioche adverse)', () => {
    expect(clash(side('Voile-2-echo', 'assault'), side('Cendre-4-basic', 'assault')).peeks.p1).toEqual([{ effect: 'echo', what: 'hand' }]);
    expect(clash(side('Voile-4-basic', 'assault', [{ slot: 0, def: 'Voile-2-filombre', mode: 'rank' }]), side('Cendre-1-basic', 'assault')).peeks.p1).toEqual([{ effect: 'filombre', what: 'hand' }]);
    const m = clash(side('Voile-2-basic', 'assault', [{ slot: 0, def: 'Voile-1-murmure', mode: 'interfere', target: 0 }]), side('Cendre-2-basic', 'assault', [{ slot: 0, def: 'Cendre-1-basic', mode: 'rank' }]));
    expect(m.peeks.p1).toEqual([{ effect: 'murmure', what: 'deck-top' }]);
  });

  it('Éclipse : victoire blessante → l’adversaire perd 1 Insight et n’en gagne aucun', () => {
    const out = clash(side('Voile-4-basic', 'assault', [{ slot: 0, def: 'Voile-4-eclipse', mode: 'damage' }]), side('Ronce-2-basic', 'assault', [{ slot: 0, def: 'Ronce-1-basic', mode: 'interfere', target: 1 }], [{ slot: 1, def: 'Ronce-1-racine' }]));
    expect(out.insightDrain.p2).toBe(1);
    expect(out.insightSources.p2).toEqual([]);
  });

  it('Épine (1) et Herse (3) : dégâts fixes d’une Garde victorieuse ; Bouture : soin 2 ; Lierre : reste active', () => {
    expect(clash(side('Ronce-4-basic', 'guard', [{ slot: 0, def: 'Ronce-1-epine', mode: 'rank' }]), side('Cendre-3-basic', 'assault')).fixedDamage.p2).toBe(1);
    expect(clash(side('Ronce-3-basic', 'guard', [{ slot: 0, def: 'Ronce-4-herse', mode: 'rank' }]), side('Cendre-4-basic', 'assault')).fixedDamage.p2).toBe(3);
    const bo = clash(side('Ronce-2-basic', 'assault', [{ slot: 0, def: 'Ronce-1-bouture', mode: 'interfere', target: 0 }]), side('Cendre-2-basic', 'assault', [{ slot: 0, def: 'Cendre-1-basic', mode: 'rank' }]));
    expect(bo.heal.p1).toBe(2);
    const li = clash(side('Ronce-2-basic', 'assault', [{ slot: 1, def: 'Ronce-2-lierre', mode: 'interfere', target: 0 }]), side('Cendre-2-basic', 'assault', [{ slot: 0, def: 'Cendre-2-basic', mode: 'rank' }]));
    expect(li.destinations.p1[1]).toBe('stay');
  });

  it('Mur de ronces (+2 en Garde), Boussole (affinité avec toute famille), Zénith (+1 hors famille, sommet), Harmonie et Constellation', () => {
    expect(clash(side('Cendre-2-basic', 'guard', [{ slot: 0, def: 'Ronce-3-mur', mode: 'rank' }]), side('Voile-1-basic', 'assault')).scores.p1).toBe(2 + 3 + 2);
    expect(clash(side('Cendre-2-basic', 'assault', [{ slot: 0, def: 'Astre-1-boussole', mode: 'rank' }]), side('Voile-1-basic', 'assault')).scores.p1).toBe(2 + 1 + 1);
    const z = clash(side('Cendre-2-basic', 'assault', [{ slot: 0, def: 'Astre-4-zenith', mode: 'rank' }]), side('Voile-1-basic', 'assault'));
    expect(z.scores.p1).toBe(2 + 4 + 1);
    expect(z.destinations.p1[0]).toBe('top');
    const h = clash(side('Astre-2-basic', 'assault', [{ slot: 0, def: 'Astre-3-harmonie', mode: 'rank' }, { slot: 1, def: 'Astre-2-constellation', mode: 'damage' }]), side('Voile-1-basic', 'assault'));
    // Harmonie (Astre) et Constellation (Astre) : même famille → aucun bonus
    expect(h.scores.p1).toBe(2 + 3 + 1);
    const h2 = clash(side('Astre-2-basic', 'assault', [{ slot: 0, def: 'Astre-3-harmonie', mode: 'rank' }, { slot: 1, def: 'Cendre-3-basic', mode: 'damage' }]), side('Voile-1-basic', 'assault'));
    expect(h2.scores.p1).toBe(2 + 3 + 1 + 2);
    const c = clash(side('Astre-2-basic', 'assault', [{ slot: 0, def: 'Astre-2-constellation', mode: 'damage' }, { slot: 1, def: 'Ronce-1-basic', mode: 'rank' }]), side('Voile-1-basic', 'assault'));
    expect(c.multipliers.p1).toBe(2 + 1 + 1);
  });

  it('Comète (sommet après une victoire), Équinoxe (gagne l’égalité A/A, pas contre une autre Équinoxe), Solstice (+1 Insight)', () => {
    expect(clash(side('Astre-4-basic', 'assault', [{ slot: 0, def: 'Astre-1-comete', mode: 'damage' }]), side('Voile-1-basic', 'assault')).destinations.p1[0]).toBe('top');
    const eq = clash(side('Astre-3-equinoxe', 'assault'), side('Cendre-3-basic', 'assault'));
    expect(eq).toMatchObject({ outcome: 'win', winner: 'p1' });
    expect(eq.damage.p1).toBe(0);
    expect(eq.damage.p2).toBe(9);
    expect(clash(side('Astre-3-equinoxe', 'assault'), side('Astre-3-equinoxe', 'assault')).outcome).toBe('tie-assault');
    expect(clash(side('Astre-4-solstice', 'assault'), side('Cendre-1-basic', 'assault')).insightSources.p1).toEqual([{ kind: 'effect', effect: 'solstice', slot: null }]);
  });

  it('Silence neutralise l’effet en attente d’une Primaire de l’avenant (Phénix)', () => {
    const out = computeClash({
      p1: side('Cendre-4-phenix', 'assault', [{ slot: 0, def: 'Cendre-4-basic', mode: 'rank' }]),
      p2: side('sig-Ronce', 'assault', [{ slot: 1, def: 'Voile-4-silence', mode: 'interfere', target: 0 }]),
    } as ClashInput);
    expect(out.silenced.p1).toBe(true);
    expect(out.primaryToHand.p1).toBe(false);
    expect(eff(out, 'phenix')?.status).toBe('cancelled');
  });
});

// ------------------------------------------------------------------------------------------- moteur complet

const cfg = (p1: string[], p2: string[] = [], seed = 909): GameConfig => ({
  seed,
  players: {
    p1: { ...DEFAULT_CONFIG.players.p1, signature: 'Cendre', variants: p1, techniques: [] },
    p2: { ...DEFAULT_CONFIG.players.p2, signature: 'Ronce', variants: p2, techniques: [] },
  },
});

interface Plan { reveal?: SlotIndex[]; primary?: string; stance?: Stance; tactics?: [TacticPlan | null, TacticPlan | null] }

/** Joue un tour depuis l'état donné jusqu'à sa fin (RESOLVED ou ENDED). */
function runTurn(state: GameState, plans: Record<PlayerId, Plan>): { state: GameState; events: GameEvent[] } {
  let s = state;
  const events: GameEvent[] = [];
  for (let guard = 0; guard < 30 && s.phase !== 'RESOLVED' && s.phase !== 'ENDED'; guard++) {
    const pid = s.awaiting.find((x) => !s.pending[x])!;
    const pl = plans[pid];
    let cmd: PlayerCommand;
    switch (s.phase) {
      case 'PREPARE': cmd = { type: 'prepare', player: pid, reveal: pl.reveal ?? [] }; break;
      case 'DISSIPATION': cmd = { type: 'dissipate', player: pid, targetSlot: null }; break;
      case 'COMMIT': cmd = { type: 'commit', player: pid, primaryId: idOf(s, pid, pl.primary!), stance: pl.stance ?? 'assault', secondaryId: null, replaceSlot: null }; break;
      case 'REVISION': cmd = { type: 'revise', player: pid, commit: null }; break;
      case 'LECTURE': cmd = { type: 'lecture', player: pid, use: false }; break;
      case 'TACTICS': cmd = { type: 'tactics', player: pid, plans: pl.tactics ?? [null, null], technique: null }; break;
      case 'REPEL': cmd = { type: 'repel', player: pid, targetSlot: null }; break;
      default: throw new Error(`phase ${s.phase}`);
    }
    const why = checkCommand(s, cmd);
    if (why) throw new Error(`${s.phase} ${pid} : ${why}`);
    const r = applyCommand(s, cmd);
    s = r.state;
    events.push(...r.events);
  }
  return { state: s, events };
}

describe('avenant 09 — effets hors du Clash (moteur)', () => {
  it('Escarbille : révélée, 1 dégât fixe à son propriétaire et une carte piochée ; sans effet à 1 PV (après mesure)', () => {
    const s0 = fixture(cfg(['Cendre-1-escarbille']), { hand: ['Cendre-4', 'Voile-1', 'Astre-2', 'Ronce-3'], slots: [{ def: 'Cendre-1-escarbille' }, null], hp: 20 }, { hand: ['Ronce-4', 'Astre-1', 'Voile-3', 'Cendre-2'] }, { phase: 'PREPARE' });
    const r = runTurn(s0, { p1: { reveal: [0], primary: 'Cendre-4-basic' }, p2: { primary: 'Ronce-4-basic', stance: 'guard' } });
    const dmg = r.events.find((e) => e.kind === 'damage' && e.phase === 'PREPARE');
    expect(dmg?.data).toMatchObject({ player: 'p1', amount: 1 });
    expect(r.events.some((e) => e.kind === 'draw' && e.vis === 'public' && e.data.player === 'p1' && e.data.count === 1 && e.phase === 'PREPARE')).toBe(true);
    const low = fixture(cfg(['Cendre-1-escarbille']), { hand: ['Cendre-4', 'Voile-1', 'Astre-2', 'Ronce-3'], slots: [{ def: 'Cendre-1-escarbille' }, null], hp: 1 }, { hand: ['Ronce-4', 'Astre-1', 'Voile-3', 'Cendre-2'] }, { phase: 'PREPARE' });
    const r2 = runTurn(low, { p1: { reveal: [0], primary: 'Cendre-4-basic' }, p2: { primary: 'Ronce-4-basic', stance: 'guard' } });
    expect(r2.events.find((e) => e.kind === 'effect' && e.data.effect === 'escarbille')?.data.status).toBe('failed');
  });

  it('Sève (soin si derrière) et Sextant (deux cartes du sommet, en privé)', () => {
    const s0 = fixture(cfg(['Ronce-2-seve', 'Astre-2-sextant']), { hand: ['Cendre-4', 'Voile-1', 'Astre-3', 'Ronce-3'], slots: [{ def: 'Ronce-2-seve' }, { def: 'Astre-2-sextant' }], hp: 30 }, { hand: ['Ronce-4', 'Astre-1', 'Voile-3', 'Cendre-2'] }, { phase: 'PREPARE' });
    const r = runTurn(s0, { p1: { reveal: [0, 1], primary: 'Cendre-4-basic' }, p2: { primary: 'Ronce-4-basic', stance: 'guard' } });
    expect(r.events.find((e) => e.kind === 'heal' && e.phase === 'PREPARE')?.data).toMatchObject({ player: 'p1', amount: 2 });
    const peek = r.events.find((e) => e.kind === 'peek' && e.data.source === 'Sextant')!;
    expect(peek.vis).toBe('p1');
    expect((peek.data.defIds as string[]).length).toBe(2);
    expect(visibleEvents(r.events, 'p2').some((e) => e.kind === 'peek')).toBe(false);
  });

  it('Ombre portée et Miroir brisé : regards privés immédiats sur les Secondaires adverses cachées ; jamais « armés »', () => {
    const s0 = fixture(cfg(['Voile-4-miroirbrise']), { hand: ['Voile-4-miroirbrise', 'Cendre-1', 'Astre-2', 'Ronce-3'] }, { hand: ['Ronce-4', 'Astre-1', 'Voile-3', 'Cendre-2'], slots: [{ def: 'Astre-3' }, { def: 'Cendre-1' }] });
    const r = runTurn(s0, { p1: { primary: 'Voile-4-miroirbrise' }, p2: { primary: 'Ronce-4-basic', stance: 'guard' } });
    const peek = r.events.find((e) => e.kind === 'peek' && e.data.source === 'Miroir brisé')!;
    expect(peek.vis).toBe('p1');
    expect((peek.data.hiddenSlots as unknown[]).length).toBe(2);
    expect(r.events.some((e) => e.kind === 'effectArmed' && e.data.effect === 'miroirbrise')).toBe(false);
    const pub = JSON.stringify(visibleEvents(r.events, 'p2'));
    expect(pub).not.toContain('Astre-3-basic');
  });

  it('Éclipse retire 1 Insight à l’adversaire ; Phénix retourne en main ; Lierre reste active', () => {
    const s0 = fixture(cfg(['Voile-4-eclipse'], ['Ronce-2-lierre']), { hand: ['Cendre-4', 'Cendre-1', 'Astre-2', 'Ronce-3'], slots: [{ def: 'Voile-4-eclipse', active: true }, null] }, { hand: ['Ronce-1', 'Astre-1', 'Voile-3', 'Cendre-2'], slots: [{ def: 'Ronce-2-lierre', active: true }, null], insight: 2 });
    const r = runTurn(s0, { p1: { primary: 'Cendre-4-basic', tactics: [{ mode: 'damage' }, null] }, p2: { primary: 'Ronce-1-basic', tactics: [{ mode: 'keep' }, null] } });
    // Éclipse : l'adversaire perd 1 Insight
    expect(r.state.players.p2.insight).toBe(1);
    expect(r.events.find((e) => e.kind === 'insight' && e.data.drain)?.data).toMatchObject({ player: 'p2', drain: 1 });
    const s1 = fixture(cfg(['Cendre-4-phenix'], ['Ronce-2-lierre']), { hand: ['Cendre-4-phenix', 'Voile-1', 'Astre-2', 'Ronce-3'], slots: [{ def: 'Cendre-1', active: true }, null] }, { hand: ['sig-Ronce', 'Astre-1', 'Voile-3', 'Cendre-2'], slots: [{ def: 'Ronce-2-lierre', active: true }, null] });
    const r1 = runTurn(s1, { p1: { primary: 'Cendre-4-phenix', tactics: [{ mode: 'rank' }, null] }, p2: { primary: 'sig-Ronce', tactics: [{ mode: 'interfere', target: 0 }, null] } });
    expect(r1.events.some((e) => e.kind === 'primaryReturned' && e.data.player === 'p1')).toBe(true);
    expect(r1.state.players.p1.hand).toContain(idOf(r1.state, 'p1', 'Cendre-4-phenix'));
    expect(r1.state.players.p2.slots[0]?.cardId).toBe(idOf(r1.state, 'p2', 'Ronce-2-lierre'));
    expect(r1.events.find((e) => e.kind === 'destination' && e.data.reason === 'Lierre')).toBeTruthy();
  });
});
