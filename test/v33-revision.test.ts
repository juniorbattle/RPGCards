/**
 * Avenant 08, amendement 1 (`contracts/08_AVENANT_V3_3_SIGNATURES_ANNONCEES.md`) : quand un joueur a déjà verrouillé son
 * engagement et que l'adversaire verrouille ensuite une Signature, le premier peut réviser son engagement une fois
 * (garder, ou nouvel engagement complet), définitivement. Pour les deux camps. Tests prévus en A1-5.
 */
import { describe, expect, it } from 'vitest';
import { decide, PROFILES } from '../src/game/ai/policy';
import { checkCommand, DEFAULT_CONFIG } from '../src/game/engine/engine';
import { autoplay } from '../src/game/match';
import type { GameEvent } from '../src/game/model/types';
import { replay } from '../src/game/replay/replay';
import { buildJournal } from '../src/game/visibility/journal';
import { viewFor, visibleEvents } from '../src/game/visibility/view';
import { RULES, verifyActiveCore } from '../src/product/resume';
import { config, d, fixture, idOf, Runner } from './helpers';

const kinds = (evs: GameEvent[]) => evs.map((e) => e.kind);
const pub = (evs: GameEvent[]) => evs.filter((e) => e.vis === 'public');

/** p2 (le « rival ») verrouille d'abord une Primaire ordinaire, puis p1 verrouille une Signature. */
function rivalPuisSignature(rivalHand = ['Ronce-4', 'Ronce-1', 'Astre-1', 'Voile-2'], rivalPrim = 'Ronce-4') {
  const s = fixture(config(), { hand: ['sig-Cendre', 'Cendre-2', 'Voile-1', 'Astre-2'] }, { hand: rivalHand });
  const r = new Runner(s).commit('p2', rivalPrim, 'assault', 'Voile-2');
  const before = r.events.length;
  r.commit('p1', 'sig-Cendre', 'assault');
  return { r, before };
}

describe('Amendement 1 — la fenêtre de révision (A1-5, 1 à 5)', () => {
  it('1 : rival verrouillé, puis Signature du joueur → révision pour le rival seul', () => {
    const { r, before } = rivalPuisSignature();
    expect(kinds(r.events.slice(before))).toEqual(['locked', 'signatureAnnounced', 'revisionOpened']);
    expect(r.state.phase).toBe('REVISION');
    expect(r.state.awaiting).toEqual(['p2']);
    expect(viewFor(r.state, 'p2').revision).toEqual({ player: 'me', open: true, held: { primaryId: idOf(r.state, 'p2', d('Ronce-4')), stance: 'assault', secondaryId: idOf(r.state, 'p2', d('Voile-2')), replaceSlot: null } });
    expect(viewFor(r.state, 'p1').revision).toEqual({ player: 'opp', open: true, held: null }); // rien de l’engagement du rival
    // l’engagement n’est pas encore appliqué : les cartes du rival sont en main
    expect(r.state.players.p2.primary).toBeNull();
  });
  it('2 : joueur verrouillé (ordinaire), puis Signature du rival → même fenêtre pour le joueur (les deux camps)', () => {
    const s = fixture(config(), { hand: ['Cendre-4', 'Voile-1'] }, { hand: ['sig-Ronce', 'Astre-1'] });
    const r = new Runner(s).commit('p1', 'Cendre-4', 'assault').commit('p2', 'sig-Ronce', 'guard');
    expect(r.state.phase).toBe('REVISION');
    expect(r.state.awaiting).toEqual(['p1']);
    expect(viewFor(r.state, 'p1').revision?.player).toBe('me');
  });
  it('3 : second verrouillage ordinaire → aucune révision (comme avant l’amendement)', () => {
    const s = fixture(config(), { hand: ['sig-Cendre', 'Voile-1'] }, { hand: ['Ronce-4', 'Astre-1'] });
    const r = new Runner(s).commit('p1', 'sig-Cendre', 'assault').commit('p2', 'Ronce-4', 'guard');
    expect(kinds(r.events)).not.toContain('revisionOpened');
    expect(r.state.revision).toBeNull();
    expect(r.state.lastClash!.damage.p2).toBe(8);
  });
  it('4 : révision unique et définitive ; celui qui a annoncé ne peut rien changer', () => {
    const { r } = rivalPuisSignature();
    expect(checkCommand(r.state, { type: 'revise', player: 'p1', commit: null })).toMatch(/attendue/);
    r.apply({ type: 'revise', player: 'p2', commit: null });
    expect(r.state.phase).not.toBe('REVISION');
    expect(checkCommand(r.state, { type: 'revise', player: 'p2', commit: null })).not.toBeNull();
    expect(r.state.revision).toBe('p2'); // marquée pour le tour : pas de seconde fenêtre
  });
  it('5 : garder → rien n’est révélé ; même état qu’un engagement sans révision', () => {
    const { r, before } = rivalPuisSignature();
    r.apply({ type: 'revise', player: 'p2', commit: null });
    const after = r.events.slice(before);
    expect(pub(after).find((e) => e.kind === 'revised')!.data).toEqual({ player: 'p2', kept: true });
    expect(r.state.reveal.primaries!.p2).toEqual({ defId: d('Ronce-4'), stance: 'assault' });
    expect(r.state.players.p2.slots.some((x) => x && r.state.cards[x.cardId]!.defId === d('Voile-2'))).toBe(true);
  });
});

describe('Amendement 1 — réviser (A1-5, 6 à 8)', () => {
  it('6 : réviser → l’engagement initial n’est jamais publié ; le nouveau s’applique, main cohérente', () => {
    const { r, before } = rivalPuisSignature();
    r.apply({ type: 'revise', player: 'p2', commit: { primaryId: idOf(r.state, 'p2', d('Astre-1')), stance: 'guard', secondaryId: null, replaceSlot: null } });
    expect(pub(r.events.slice(before)).find((e) => e.kind === 'revised')!.data).toEqual({ player: 'p2', kept: false });
    // jusqu’à la révélation, aucune trace publique de Ronce IV, de son mode ni de Voile II
    const revel = r.events.findIndex((e) => e.kind === 'primariesRevealed');
    const avant = JSON.stringify(pub(r.events.slice(0, revel < 0 ? undefined : revel)));
    expect(avant).not.toMatch(/Ronce-4|Voile-2/);
    expect(r.state.reveal.primaries!.p2).toEqual({ defId: d('Astre-1'), stance: 'guard' });
    expect(r.state.players.p2.hand.map((x) => r.state.cards[x]!.defId)).toEqual(expect.arrayContaining([d('Ronce-4'), d('Voile-2')]));
    expect(r.state.players.p2.slots.every((x) => x === null)).toBe(true);
  });
  it('7 : deux Signatures, le premier renonce → la sienne retourne en main, journal ; ou garde → ∞ contre ∞', () => {
    const mk = () => {
      const s = fixture(config(), { hand: ['sig-Cendre', 'Voile-1'] }, { hand: ['sig-Ronce', 'Astre-1'] });
      return new Runner(s).commit('p2', 'sig-Ronce', 'assault').commit('p1', 'sig-Cendre', 'assault');
    };
    const renonce = mk();
    expect(renonce.state.phase).toBe('REVISION');
    renonce.apply({ type: 'revise', player: 'p2', commit: { primaryId: idOf(renonce.state, 'p2', d('Astre-1')), stance: 'guard', secondaryId: null, replaceSlot: null } });
    expect(pub(renonce.events).find((e) => e.kind === 'signatureWithdrawn')!.data).toEqual({ player: 'p2', defId: d('sig-Ronce') });
    expect(renonce.state.reveal.signatures.p2).toBeNull();
    expect(renonce.state.players.p2.hand.map((x) => renonce.state.cards[x]!.defId)).toContain(d('sig-Ronce'));
    expect(buildJournal(visibleEvents(renonce.events, 'p1'), 'p1').map((l) => l.text).join('\n')).toMatch(/Le rival renonce à sa Signature : Couronne de Ronce retourne dans sa main\./);
    const garde = mk();
    garde.apply({ type: 'revise', player: 'p2', commit: null });
    expect(garde.state.lastClash!.outcome).toBe('tie-assault');
  });
  it('8 : révision vers une Signature → annoncée à la révision ; l’autre ne réagit plus', () => {
    const { r } = rivalPuisSignature(['sig-Ronce', 'Ronce-4', 'Astre-1', 'Voile-2']);
    r.apply({ type: 'revise', player: 'p2', commit: { primaryId: idOf(r.state, 'p2', d('sig-Ronce')), stance: 'guard', secondaryId: null, replaceSlot: null } });
    expect(pub(r.events).filter((e) => e.kind === 'signatureAnnounced').map((e) => e.data.player)).toEqual(['p1', 'p2']);
    expect(r.state.phase).not.toBe('REVISION');
    expect(r.state.lastClash!.guardWin).toBe(true); // Couronne ∞ en Garde gagne l’égalité ∞
  });
});

describe('Amendement 1 — IA, replay, reprise, journal (A1-5, 9 et 10)', () => {
  it('9 : l’IA révise sur sa seule vue ; même révision quel que soit le mode secret de la Signature annoncée ; garde si rien ne change', () => {
    const revise = (stance: 'assault' | 'guard') => {
      const s = fixture(config(), { hand: ['sig-Cendre', 'Cendre-2', 'Voile-1', 'Astre-2'] }, { hand: ['Ronce-4', 'Ronce-1', 'Astre-1', 'Voile-2'] });
      const r = new Runner(s);
      r.apply(decide(viewFor(r.state, 'p2'), PROFILES.equilibre!, 1)!);
      r.commit('p1', 'sig-Cendre', stance);
      return { r, v: viewFor(r.state, 'p2') };
    };
    const a = revise('assault'); const g = revise('guard');
    expect(a.v).toEqual(g.v);
    const ca = decide(a.v, PROFILES.equilibre!, 1)!; const cg = decide(g.v, PROFILES.equilibre!, 1)!;
    expect(ca).toEqual(cg);
    expect(ca.type).toBe('revise');
    // l’IA avait engagé Ronce IV en Assaut ; face au Brasier annoncé, elle le garde en main
    expect(ca.type === 'revise' && ca.commit && a.r.state.cards[ca.commit.primaryId]!.defId).toBe(d('Voile-2'));
    // sans annonce nouvelle (même vue, Signature retirée), l’IA garde son engagement de base
    const sans = structuredClone(a.v); sans.reveal.signatures.opp = null;
    expect(decide(sans, PROFILES.equilibre!, 1)).toEqual({ type: 'revise', player: 'p2', commit: null });
  });
  it('10 : replay déterministe avec révisions ; reprise pendant la fenêtre ; étiquette précédente refusée', () => {
    expect(RULES).toBe('V3.0+delta-V3.3.2');
    let m = autoplay({ ...DEFAULT_CONFIG, seed: 1 }, 200, undefined, ['p2', 'p1']);
    for (let seed = 2; seed < 60 && !m.events.some((e) => e.kind === 'revisionOpened'); seed++) m = autoplay({ ...DEFAULT_CONFIG, seed }, 200, undefined, ['p2', 'p1']);
    expect(m.events.some((e) => e.kind === 'revisionOpened')).toBe(true);
    expect(replay(m.record()).hash).toBe(m.hash());
    const i = m.events.findIndex((e) => e.kind === 'revisionOpened');
    const nCmd = m.commands.findIndex((c) => c.type === 'revise');
    const partiel = replay({ ...m.record(), commands: m.commands.slice(0, nCmd) });
    expect(partiel.state.phase).toBe('REVISION');
    expect(i).toBeGreaterThan(0);
    const rec = m.record();
    const active = { id: 'x', encounterId: 'libre-braise', seed: m.config.seed, startedAt: '2026-10-24T00:00:00.000Z', rules: RULES, catalog: rec.catalog, config: m.config, commands: m.commands.slice(0, nCmd), hash: partiel.hash, turn: partiel.state.turn };
    expect(verifyActiveCore(active)).toEqual({ ok: true });
    expect(verifyActiveCore({ ...active, rules: 'V3.0+delta-V3.3.1' })).toEqual({ ok: false, reason: 'Règles différentes (V3.0+delta-V3.3.1).' });
  });
  it('journal : fenêtre ouverte et engagement gardé, vus des deux côtés', () => {
    const { r } = rivalPuisSignature();
    r.apply({ type: 'revise', player: 'p2', commit: null });
    const j1 = buildJournal(visibleEvents(r.events, 'p1'), 'p1').map((l) => l.text).join('\n');
    expect(j1).toMatch(/Vous avez engagé votre Signature après le rival : il peut réviser son engagement une fois\./);
    expect(j1).toMatch(/Le rival garde son engagement\./);
    const j2 = buildJournal(visibleEvents(r.events, 'p2'), 'p2').map((l) => l.text).join('\n');
    expect(j2).toMatch(/Le rival a engagé sa Signature après vous : vous pouvez réviser votre engagement une fois\./);
  });
});
