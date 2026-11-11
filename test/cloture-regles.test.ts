/**
 * Lot de correction de clôture (fiche de clôture, passe 224) — règles et moteur :
 * - Contre-jour (Voile III C) : une seule règle de légalité de l'Interférence (`interferenceReaches`), partagée par le
 *   Clash, le moteur, l'interface et l'IA ; vérifiée ici par `applyCommand` (le défaut : le moteur refusait la cible) ;
 * - A1 (V3.0 §9.3) : PV, dégâts et soins d'un seul tenant, puis le K.-O. (Bouture mortelle, double K.-O., Écaille) ;
 * - A2 : les trois lectures ratifiées (Fournaise et Rempart, Percée, Équinoxe) restent testées dans `variantes09.test.ts` ;
 * - hygiène : raison publique d'une Interférence contre une cible masquée (Leurre), verdict de Garde sous l'avenant 09,
 *   Escarbille et Sève évaluées sur un instantané, étiquette des règles unique, version du catalogue.
 */
import { describe, expect, it } from 'vitest';
import { cardDef } from '../src/game/catalog/cards';
import { computeClash, interferenceReaches, type ClashUse } from '../src/game/engine/clash';
import { applyCommand, checkCommand, createGame, DEFAULT_CONFIG } from '../src/game/engine/engine';
import { RULES_LABEL, type GameConfig, type GameEvent, type GameState, type PlayerCommand, type PlayerId, type SlotIndex, type Stance, type TacticPlan } from '../src/game/model/types';
import { CATALOG_VERSION } from '../src/game/replay/replay';
import { buildJournal, verdictText } from '../src/game/visibility/journal';
import { visibleEvents } from '../src/game/visibility/view';
import { REGLES_DUEL } from '../src/aventure/fin';
import { RULES } from '../src/product/resume';
import { fixture, idOf, Runner } from './helpers';

const cfg = (p1: string[], p2: string[] = [], seed = 2240): GameConfig => ({
  seed,
  players: {
    p1: { ...DEFAULT_CONFIG.players.p1, signature: 'Cendre', variants: p1, techniques: [] },
    p2: { ...DEFAULT_CONFIG.players.p2, signature: 'Ronce', variants: p2, techniques: [] },
  },
});

interface Plan { reveal?: SlotIndex[]; primary?: string; stance?: Stance; tactics?: [TacticPlan | null, TacticPlan | null] }

/** Joue un tour jusqu'à sa fin (RESOLVED ou ENDED) ; chaque commande passe par `checkCommand` puis `applyCommand`. */
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

describe('Contre-jour : une seule règle de légalité, admise par le moteur', () => {
  it('la règle : un cran de plus pour Contre-jour, jamais pour une Basic ni une autre variante', () => {
    expect(interferenceReaches(cardDef('Voile-3-contrejour'), cardDef('Ronce-4-basic'))).toBe(true);
    expect(interferenceReaches(cardDef('Voile-3-basic'), cardDef('Ronce-4-basic'))).toBe(false);
    expect(interferenceReaches(cardDef('Voile-3-ombre'), cardDef('Ronce-4-basic'))).toBe(false);
    expect(interferenceReaches(cardDef('Voile-3-basic'), cardDef('Ronce-3-basic'))).toBe(true);
    expect(interferenceReaches(cardDef('Voile-1-leurre'), cardDef('Ronce-2-basic'))).toBe(false);
  });

  it('applyCommand : Contre-jour (Rang III) interfère une Secondaire de Rang IV engagée et l’annule ; une Voile III Basic est refusée', () => {
    const s0 = fixture(cfg(['Voile-3-contrejour']), { hand: ['Cendre-2', 'Voile-1', 'Astre-2', 'Ronce-3'], slots: [{ def: 'Voile-3-contrejour', active: true }, null] }, { hand: ['Cendre-3', 'Astre-1', 'Voile-2', 'Ronce-1'], slots: [{ def: 'Ronce-4', active: true }, null] });
    const plans: Record<PlayerId, Plan> = {
      p1: { primary: 'Cendre-2-basic', stance: 'assault', tactics: [{ mode: 'interfere', target: 0 }, null] },
      p2: { primary: 'Cendre-3-basic', stance: 'assault', tactics: [{ mode: 'rank' }, null] },
    };
    const r = runTurn(s0, plans);
    const inter = r.events.find((e) => e.kind === 'interference' && e.data.player === 'p1')!;
    expect(inter.data).toMatchObject({ success: true, target: 0, reason: 'cible engagée annulée' });
    expect(r.state.lastClash?.cancelled.p2).toEqual([0]);
    // sans la Ronce IV (annulée), la Primaire adverse (Rang III) n'a plus que 3 contre 2 : elle gagne quand même ; le Rang
    // IV adverse ne compte pas (score 3 et non 3 + 4)
    expect(r.state.lastClash?.scores.p2).toBe(3);

    // la Voile III Basic (même situation) : refusée par le moteur, sans mutation
    const b0 = fixture(cfg([]), { hand: ['Cendre-2', 'Voile-1', 'Astre-2', 'Ronce-3'], slots: [{ def: 'Voile-3', active: true }, null] }, { hand: ['Cendre-3', 'Astre-1', 'Voile-2', 'Ronce-1'], slots: [{ def: 'Ronce-4', active: true }, null] });
    const b = new Runner(b0).commit('p1', 'Cendre-2', 'assault').commit('p2', 'Cendre-3', 'assault');
    expect(b.state.phase).toBe('TACTICS');
    const cmd: PlayerCommand = { type: 'tactics', player: 'p1', plans: [{ mode: 'interfere', target: 0 }, null], technique: null };
    expect(checkCommand(b.state, cmd)).toBe('Interférence : Rang imprimé insuffisant contre cette cible.');
    expect(() => applyCommand(b.state, cmd)).toThrow(/Rang imprimé insuffisant/);
  });
});

describe('A1 — dégâts et soins d’un seul tenant, puis le K.-O. (V3.0 §9.3)', () => {
  it('Bouture mortelle : à 3 PV, 12 dégâts et un soin de 2 ne sauvent plus (le rival gagne)', () => {
    const s0 = fixture(cfg(['Ronce-1-bouture']), { hand: ['Cendre-2', 'Voile-1', 'Astre-2', 'Ronce-3'], slots: [{ def: 'Ronce-1-bouture', active: true }, null], hp: 3 }, { hand: ['Cendre-4', 'Voile-2', 'Astre-3', 'Ronce-2'], slots: [{ def: 'Astre-1', active: true }, null] });
    const r = runTurn(s0, {
      p1: { primary: 'Cendre-2-basic', stance: 'assault', tactics: [{ mode: 'interfere', target: 0 }, null] },
      p2: { primary: 'Cendre-4-basic', stance: 'assault', tactics: [{ mode: 'rank' }, null] },
    });
    expect(r.events.find((e) => e.kind === 'effect' && e.data.effect === 'bouture')?.data.status).toBe('success');
    expect(r.state.phase).toBe('ENDED');
    expect(r.state.winner).toBe('p2');
    expect(r.state.players.p1.hp).toBe(0);
    // les PV montrés : 3 → 0 par les dégâts, puis un soin qui ne rend rien
    expect(r.events.find((e) => e.kind === 'damage' && e.data.player === 'p1')?.data).toMatchObject({ amount: 12, before: 3, hp: 0 });
    expect(r.events.find((e) => e.kind === 'heal' && e.data.player === 'p1')?.data).toMatchObject({ amount: 0, hp: 0 });
  });

  it('double K.-O. avec un soin : mort subite (prolongation, 1 PV chacun), plus une victoire du porteur de Bouture', () => {
    const s0 = fixture(cfg(['Ronce-1-bouture']), { hand: ['Cendre-4', 'Voile-1', 'Astre-2', 'Ronce-3'], slots: [{ def: 'Ronce-1-bouture', active: true }, null], hp: 3 }, { hand: ['Ronce-4', 'Voile-2', 'Astre-3', 'Cendre-2'], slots: [{ def: 'Astre-1', active: true }, null], hp: 5 });
    const r = runTurn(s0, {
      p1: { primary: 'Cendre-4-basic', stance: 'assault', tactics: [{ mode: 'interfere', target: 0 }, null] },
      p2: { primary: 'Ronce-4-basic', stance: 'assault', tactics: [{ mode: 'rank' }, null] },
    });
    expect(r.state.lastClash?.outcome).toBe('tie-assault');
    expect(r.state.phase).toBe('RESOLVED');
    expect(r.state.winner).toBeNull();
    expect(r.state.overtime).toBe(1);
    expect(r.state.players.p1.hp).toBe(1);
    expect(r.state.players.p2.hp).toBe(1);
    expect(buildJournal(r.events, 'p1').some((l) => /DOUBLE K\.-O\./.test(l.text))).toBe(true);
  });

  it('Écaille : à 1 PV, 2 dégâts fixes (Brûlure) et un soin de 2 laissent 1 PV (et non 2) ; le soin plafonne à PV_max', () => {
    const setup = (hp: number) => fixture(cfg(['Cendre-3-brulure'], ['Ronce-2-ecaille']), { hand: ['Cendre-2', 'Voile-1', 'Astre-2', 'Ronce-3'], slots: [{ def: 'Cendre-3-brulure', active: true }, null] }, { hand: ['Ronce-4', 'Voile-2', 'Astre-3', 'Cendre-1'], slots: [{ def: 'Ronce-2-ecaille', active: true }, { def: 'Astre-1', active: true }], hp });
    const plans: Record<PlayerId, Plan> = {
      p1: { primary: 'Cendre-2-basic', stance: 'assault', tactics: [{ mode: 'interfere', target: 1 }, null] },
      p2: { primary: 'Ronce-4-basic', stance: 'guard', tactics: [{ mode: 'rank' }, { mode: 'rank' }] },
    };
    const r = runTurn(setup(1), plans);
    expect(r.state.lastClash?.guardWin).toBe(true);
    expect(r.events.find((e) => e.kind === 'effect' && e.data.effect === 'brulure')?.data.status).toBe('success');
    expect(r.events.find((e) => e.kind === 'effect' && e.data.effect === 'ecaille')?.data.status).toBe('success');
    expect(r.state.players.p2.hp).toBe(1);
    expect(r.state.phase).not.toBe('ENDED');
    expect(r.events.find((e) => e.kind === 'damage' && e.data.player === 'p2')?.data).toMatchObject({ amount: 2, before: 1, hp: 0 });
    expect(r.events.find((e) => e.kind === 'heal' && e.data.player === 'p2')?.data).toMatchObject({ amount: 1, hp: 1 });
    // loin du K.-O., le résultat est celui d'avant : 50 − 2 + 2 = 50 ; à PV_max, le soin ne dépasse pas (90 − 2 + 2 = 90)
    expect(runTurn(setup(50), plans).state.players.p2.hp).toBe(50);
    expect(runTurn(setup(90), plans).state.players.p2.hp).toBe(90);
  });
});

describe('A2 — les trois lectures de l’avenant 09 ratifiées (fiche de clôture)', () => {
  type U = { slot: SlotIndex; def: string; mode: ClashUse['mode']; target?: SlotIndex };
  const side = (primary: string, stance: Stance, uses: U[] = []) => ({
    primary: cardDef(primary), stance,
    active: uses.map((u) => ({ slot: u.slot, def: cardDef(u.def) })),
    uses: uses.map((u) => ({ slot: u.slot, def: cardDef(u.def), mode: u.mode, ...(u.target !== undefined ? { target: u.target } : {}) })),
  });
  it('Fournaise et Rempart s’annulent : la Garde absorbe la moitié', () => {
    const out = computeClash({ p1: side('Cendre-4-basic', 'assault', [{ slot: 0, def: 'Cendre-3-basic', mode: 'rank' }, { slot: 1, def: 'Cendre-4-fournaise', mode: 'damage' }]), p2: side('Ronce-4-rempart', 'guard') });
    expect(out.absorbed).toBe(6);
  });
  it('Percée s’applique après Rempart (ou Fournaise) : trois quarts de 12 = 9, puis 2 de moins = 7', () => {
    const out = computeClash({ p1: side('Cendre-4-basic', 'assault', [{ slot: 0, def: 'Cendre-2-percee', mode: 'rank' }, { slot: 1, def: 'Cendre-1-basic', mode: 'rank' }]), p2: side('Ronce-4-rempart', 'guard') });
    expect(out.winner).toBe('p1');
    expect(out.absorbed).toBe(7);
    expect(out.baseDamage.p2).toBe(12 - 7);
  });
  it('les effets du perdant se déclenchent quand Équinoxe gagne l’égalité (Tison : Primaire battue)', () => {
    const out = computeClash({ p1: side('Astre-3-equinoxe', 'assault'), p2: side('Cendre-3-basic', 'assault', [{ slot: 0, def: 'Cendre-1-tison', mode: 'damage' }]) });
    expect(out.winner).toBe('p1');
    expect(out.baseDamage.p1).toBe(0);
    expect(out.effects.find((e) => e.effect === 'tison')).toMatchObject({ status: 'success', consequence: { kind: 'fixed-damage', amount: 2, self: true } });
    expect(out.fixedDamage.p2).toBe(2);
  });
});

describe('Hygiène du moteur', () => {
  it('ADR 011 : une Interférence contre une Leurre masquée et engagée échoue sous une raison générique (ni « protégée », ni le Rang)', () => {
    const s0 = fixture(cfg([], ['Voile-1-leurre', 'Voile-3']), { hand: ['Cendre-2', 'Voile-1', 'Astre-2', 'Ronce-3'], slots: [{ def: 'Voile-3', active: true }, null] },
      { hand: ['Cendre-4', 'Voile-2', 'Astre-3', 'Ronce-1'], slots: [{ def: 'Voile-3-dissimulation' }, { def: 'Voile-1-leurre' }] }, { phase: 'PREPARE' });
    const r = runTurn(s0, {
      p1: { primary: 'Cendre-2-basic', stance: 'assault', tactics: [{ mode: 'interfere', target: 1 }, null] },
      p2: { reveal: [0, 1], primary: 'Cendre-4-basic', stance: 'assault', tactics: [{ mode: 'keep' }, { mode: 'rank' }] },
    });
    const inter = r.events.find((e) => e.kind === 'interference' && e.data.player === 'p1')!;
    expect(inter.vis).toBe('public');
    expect(inter.data).toMatchObject({ success: false, target: 1, targetDefId: null, reason: 'sans succès contre une Secondaire masquée' });
    const pub = JSON.stringify(visibleEvents(r.events, 'p1'));
    expect(pub).not.toContain('protégée');
    expect(pub).not.toContain('Voile-1-leurre');
  });

  it('verdict de Garde sous l’avenant 09 : Rempart (trois quarts), Fournaise (quart), Percée (2 de moins), jamais « moitié » à tort', () => {
    const garde = (atk: { primary: string; slots: string[]; tactics: [TacticPlan | null, TacticPlan | null] }, guard: string, v1: string[], v2: string[]) => {
      const s0 = fixture(cfg(v1, v2), { hand: [atk.primary, 'Voile-1', 'Astre-2', 'Ronce-3'].filter((x, i, a) => a.indexOf(x) === i), slots: atk.slots.map((def) => ({ def, active: true })) }, { hand: [guard, 'Voile-2', 'Astre-3', 'Cendre-1'] });
      const r = runTurn(s0, { p1: { primary: atk.primary, stance: 'assault', tactics: atk.tactics }, p2: { primary: guard, stance: 'guard' } });
      return verdictText(r.state.lastClash!, 'p1');
    };
    const rempart = garde({ primary: 'Cendre-4-basic', slots: ['Cendre-3', 'Cendre-1'], tactics: [{ mode: 'rank' }, { mode: 'rank' }] }, 'Ronce-4-rempart', [], ['Ronce-4-rempart']);
    expect(rempart).toContain('la Garde absorbe 9 (trois quarts de sa Puissance 12 ; Rempart)');
    expect(rempart).not.toContain('moitié');
    const fournaise = garde({ primary: 'Astre-4-basic', slots: ['Cendre-1', 'Cendre-4-fournaise'], tactics: [{ mode: 'rank' }, { mode: 'damage' }] }, 'Ronce-3-basic', ['Cendre-4-fournaise'], []);
    expect(fournaise).toContain('la Garde absorbe 3 (quart de sa Puissance 9 ; Fournaise)');
    expect(fournaise).not.toContain('plafonnée');
    const percee = garde({ primary: 'Cendre-4-basic', slots: ['Cendre-2-percee'], tactics: [{ mode: 'rank' }, null] }, 'Ronce-3-basic', ['Cendre-2-percee'], []);
    expect(percee).toContain('la Garde absorbe 3 (moitié de sa Puissance 9 ; Percée : 2 de moins)');
    // sans effet de l'avenant 09, le texte d'avant (avenant 07)
    const base = garde({ primary: 'Cendre-4-basic', slots: ['Cendre-3'], tactics: [{ mode: 'rank' }, null] }, 'Ronce-3-basic', [], []);
    expect(base).toContain('la Garde absorbe 5 (moitié de sa Puissance 9)');
  });

  it('Escarbille et Sève évaluées sur les PV d’avant toute révélation : même issue quel que soit le siège', () => {
    // p1 (20 PV) révèle Escarbille ; p2 (19 PV) révèle Sève : 19 < 20 sur l'instantané → soin (avant : 19 < 19, échec)
    const a0 = fixture(cfg(['Cendre-1-escarbille'], ['Ronce-2-seve']), { hand: ['Cendre-4', 'Voile-1', 'Astre-2', 'Ronce-3'], slots: [{ def: 'Cendre-1-escarbille' }, null], hp: 20 }, { hand: ['Ronce-4', 'Astre-1', 'Voile-3', 'Cendre-2'], slots: [{ def: 'Ronce-2-seve' }, null], hp: 19 }, { phase: 'PREPARE' });
    const a = runTurn(a0, { p1: { reveal: [0], primary: 'Cendre-4-basic' }, p2: { reveal: [0], primary: 'Ronce-4-basic', stance: 'guard' } });
    const seve = (evs: GameEvent[]) => evs.find((e) => e.kind === 'effect' && e.data.effect === 'seve')?.data.status;
    const escarbille = (evs: GameEvent[]) => evs.find((e) => e.kind === 'effect' && e.data.effect === 'escarbille')?.data.status;
    expect(escarbille(a.events)).toBe('success');
    expect(seve(a.events)).toBe('success');
    // sièges échangés : p1 (19 PV) révèle Sève, p2 (20 PV) révèle Escarbille → même issue
    const cfgB: GameConfig = { seed: 2240, players: { p1: { ...DEFAULT_CONFIG.players.p1, signature: 'Ronce', variants: ['Ronce-2-seve'], techniques: [] }, p2: { ...DEFAULT_CONFIG.players.p2, signature: 'Cendre', variants: ['Cendre-1-escarbille'], techniques: [] } } };
    const b0 = fixture(cfgB, { hand: ['Ronce-4', 'Astre-1', 'Voile-3', 'Cendre-2'], slots: [{ def: 'Ronce-2-seve' }, null], hp: 19 }, { hand: ['Cendre-4', 'Voile-1', 'Astre-2', 'Ronce-3'], slots: [{ def: 'Cendre-1-escarbille' }, null], hp: 20 }, { phase: 'PREPARE' });
    const b = runTurn(b0, { p1: { reveal: [0], primary: 'Ronce-4-basic', stance: 'guard' }, p2: { reveal: [0], primary: 'Cendre-4-basic' } });
    expect(escarbille(b.events)).toBe('success');
    expect(seve(b.events)).toBe('success');
  });

  it('une seule étiquette des règles (V3.0+delta-V3.4) ; catalogue des 48 variantes', () => {
    expect(RULES_LABEL).toBe('V3.0+delta-V3.4');
    expect(RULES).toBe(RULES_LABEL);
    expect(REGLES_DUEL).toBe(RULES_LABEL);
    expect(createGame(DEFAULT_CONFIG).state.rules).toBe(RULES_LABEL);
    expect(CATALOG_VERSION).toBe('catalogue-V3.0+48v+4s+6t');
  });
});
