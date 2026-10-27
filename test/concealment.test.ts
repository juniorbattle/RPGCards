/**
 * M03.1B / ADR 011 — l’ORIGINE d’un effet de Secondaire camouflée par Dissimulation ne fuit par aucune
 * surface publique ; ses conséquences publiques restent visibles et le propriétaire garde tout en privé.
 *
 * Chaque scénario joue de vraies commandes moteur, puis inspecte RÉCURSIVEMENT (clés et valeurs) tout ce
 * que l’adversaire peut lire : événements publics (export spectateur), événements qui lui sont visibles,
 * sa vue (`viewFor`, rapport du Clash compris), l’état `lastClash`, son journal, la séquence de
 * résolution, la chorégraphie du Clash, la mémoire de l’IA, les réactions et répliques du rival.
 */
import { describe, expect, it } from 'vitest';
import { cardDef, EFFECTS, type EffectId } from '../src/game/catalog/cards';
import { buildMemory } from '../src/game/ai/memory';
import { applyCommand, checkCommand, createGame, DEFAULT_CONFIG, eligibleReveals } from '../src/game/engine/engine';
import { makeRng } from '../src/game/engine/rng';
import { autoplay } from '../src/game/match';
import { decide, PROFILES } from '../src/game/ai/policy';
import type { ClashReport, GameConfig, GameEvent, PlayerCommand, PlayerId, SlotIndex, Stance, TacticMode, TacticPlan } from '../src/game/model/types';
import { buildJournal } from '../src/game/visibility/journal';
import { publicEvents, viewFor, visibleEvents } from '../src/game/visibility/view';
import { buildResolutionBeats, resolutionStart } from '../src/presentation/beats';
import { buildActivations } from '../src/presentation/activations';
import { buildClashScript } from '../src/presentation/clashMotion';
import { ExpressionDirector } from '../src/presentation/expression';
import { PERSONALITIES } from '../src/presentation/personalities';
import { rivalLine } from '../src/presentation/rivalLines';
import { config, d, fixture, idOf, Runner, type SideSetup } from './helpers';

const other = (p: PlayerId): PlayerId => (p === 'p1' ? 'p2' : 'p1');
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Toutes les chaînes d’une valeur (clés d’objet comprises), récursivement. */
function strings(x: unknown, out: string[] = []): string[] {
  if (typeof x === 'string') out.push(x);
  else if (Array.isArray(x)) x.forEach((y) => strings(y, out));
  else if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) { out.push(k); strings(v, out); }
  return out;
}

/** Marqueurs d’identité d’une carte : définition, identité de deck, nom, instance, nom et id d’effet. */
function tokens(defId: string, cardId: string): RegExp[] {
  const c = cardDef(defId);
  const res = [new RegExp(`${esc(c.identity)}(?!\\d)`), new RegExp(`${esc(c.name)}(?![IV])`), new RegExp(`${esc(cardId)}(?!\\d)`)];
  if (c.effect) res.push(new RegExp(esc(EFFECTS[c.effect].name), 'i'), new RegExp(`\\b${esc(c.effect)}\\b`, 'i'));
  return res;
}

/** Tout ce que `viewer` peut lire, toutes surfaces confondues (JSON-isables). */
function exposure(r: Runner, viewer: PlayerId): Record<string, unknown> {
  const vis = visibleEvents(r.events, viewer);
  const prim = r.state.reveal.primaries ?? (vis.find((e) => e.kind === 'primariesRevealed')?.data as Record<PlayerId, { defId: string; stance: Stance }> | undefined) ?? null;
  const start = resolutionStart(vis);
  const beats = start >= 0 ? buildResolutionBeats(vis.slice(start), { viewer, primaries: prim }) : [];
  const script = buildClashScript(vis, viewer, prim);
  const rival = other(viewer);
  const reactions = PERSONALITIES.flatMap((p) => new ExpressionDirector(rival, p, 7).observe(vis).map((e) => [e.cause, rivalLine(e, p, 7)]));
  // Fin du tour (ARB-005) : la défausse et le terrain adverses nomment désormais légalement la carte.
  const view = viewFor(r.state, viewer);
  const legalView = r.state.phase === 'RESOLVED' ? { ...view, opp: { ...view.opp, discard: [], slots: [null, null] } } : view;
  return {
    publicEvents: JSON.parse(JSON.stringify(publicEvents(r.events))),
    visibleEvents: vis,
    view: legalView,
    lastClash: r.state.lastClash,
    journal: buildJournal(vis, viewer).map((l) => l.text),
    beats: beats.map((b) => [b.title, b.detail]),
    script: script ? [script.verdict, script.detail, script.bullets] : null,
    // M12 (ADR 045) : les temps forts mis en avant au premier plan
    activations: buildActivations(vis, { viewer, primaries: prim }).map((a) => [a.title, a.consequence, a.detail, a.defId, a.targetDefId ?? null, a.seen ?? null]),
    memory: buildMemory(vis, viewer),
    reactions,
  };
}

/** Échoue en citant la surface et la chaîne fautives. */
function expectNoLeak(r: Runner, viewer: PlayerId, defId: string): void {
  const owner = other(viewer);
  const cardId = idOf(r.state, owner, defId);
  const leaks: string[] = [];
  for (const [surface, value] of Object.entries(exposure(r, viewer))) {
    for (const s of strings(value)) for (const re of tokens(defId, cardId)) if (re.test(s)) leaks.push(`${surface}: « ${s} » (${re})`);
  }
  expect(leaks).toEqual([]);
}

const exact = (defId: string) => new RegExp(`"${esc(defId)}"`);
const numbers = (x: unknown): number[] => (typeof x === 'number' ? [x] : x && typeof x === 'object' ? Object.values(x).flatMap(numbers) : []);

/**
 * Le propriétaire révèle ensemble Voile III — Dissimulation (case 1) et `card` (case 2), qui est donc
 * camouflée ce tour (identité jamais publique avant). `known` : la carte était déjà active et publique.
 */
function masked(owner: PlayerId, card: string, o: { variants: string[]; hand: string[]; other: SideSetup; ownerHp?: number; insight?: number; known?: boolean; cfg?: Partial<Parameters<typeof config>[0]> }): Runner {
  const mine: SideSetup = { hand: o.hand, slots: [{ def: 'Voile-3-dissimulation' }, { def: card, active: !!o.known }], hp: o.ownerHp, insight: o.insight };
  const vKey = owner === 'p1' ? 'v1' : 'v2';
  const cfg = config({ ...o.cfg, [vKey]: ['Voile-3', ...o.variants] });
  const s = owner === 'p1' ? fixture(cfg, mine, o.other, { phase: 'PREPARE' }) : fixture(cfg, o.other, mine, { phase: 'PREPARE' });
  const r = new Runner(s).apply({ type: 'prepare', player: owner, reveal: o.known ? [0] : [0, 1] });
  if (r.state.phase === 'PREPARE') r.apply({ type: 'prepare', player: other(owner), reveal: [] });
  return r;
}

function engage(r: Runner, a: { pid: PlayerId; prim: string; stance: Stance }, b: { pid: PlayerId; prim: string; stance: Stance }): Runner {
  return r.commit(a.pid, a.prim, a.stance).commit(b.pid, b.prim, b.stance);
}

const pubOf = (r: Runner, kind: GameEvent['kind'], player: PlayerId) => r.ev(kind, 'public').filter((e) => e.data.player === player).map((e) => e.data);
/** Effets publics de la résolution (hors effet de révélation de Dissimulation, public par nature). */
const pubEffects = (r: Runner, player: PlayerId) => pubOf(r, 'effect', player).filter((x) => x.effect !== 'dissimulation');
const ownOf = (r: Runner, kind: GameEvent['kind'], player: PlayerId) => r.ev(kind, player).filter((e) => e.data.own).map((e) => e.data);
const report = (r: Runner) => r.ev('clash', 'public')[0]?.data as unknown as ClashReport;

describe('ADR 011 — effets d’une Secondaire camouflée : conséquences publiques, origine privée', () => {
  it('Ferveur (cas du JOURNAL passe 4) : ni le nom, ni le motif d’Insight, ni le rapport ne la désignent', () => {
    const r = masked('p1', 'Cendre-3-ferveur', { variants: ['Cendre-3'], hand: ['Cendre-4', 'Astre-1'], other: { hand: ['Ronce-2', 'Astre-3'] } });
    engage(r, { pid: 'p1', prim: 'Cendre-4', stance: 'assault' }, { pid: 'p2', prim: 'Ronce-2', stance: 'guard' });
    r.tactics('p1', [{ mode: 'keep' }, { mode: 'damage' }]);
    // Résultats identiques : Cendre IV gagne et blesse ×4 (avenant 07 : la Garde II absorbe 3), Ferveur rapporte +1 Insight.
    expect(r.state.players.p2.hp).toBe(90 - (12 - 3) * 4);
    expect(r.state.players.p1.insight).toBe(2);
    expectNoLeak(r, 'p2', 'Cendre-3-ferveur');
    // Le gain est public (Insight), son motif générique : seule explication publique possible.
    expect(pubOf(r, 'insight', 'p1')).toEqual([{ player: 'p1', gain: 1, reasons: ['effet de la Secondaire Cendre masquée (case 2)'], insight: 2 }]);
    expect(pubEffects(r, 'p1')).toEqual([{ player: 'p1', effect: null, masked: true, family: 'Cendre', slot: 1, status: 'success', detail: '+1 Insight' }]);
    expect(report(r).effects).toEqual(pubEffects(r, 'p1'));
    // Le propriétaire garde l’information complète, en privé.
    expect(ownOf(r, 'effect', 'p1')).toEqual([{ player: 'p1', effect: 'ferveur', status: 'success', detail: '+1 Insight (sous limite)', own: true, slot: 1 }]);
    expect(buildJournal(visibleEvents(r.events, 'p1'), 'p1').map((l) => l.text).join('\n')).toMatch(/\[Privé\] Ferveur \(votre Secondaire masquée, case 2\) : RÉUSSI/);
  });

  it('Ferveur, réserve pleine : le gain plafonné n’a aucune conséquence publique, donc aucun événement public', () => {
    const r = masked('p1', 'Cendre-3-ferveur', { variants: ['Cendre-3'], hand: ['Cendre-4', 'Astre-1'], insight: 2, other: { hand: ['Ronce-2', 'Astre-3'] } });
    engage(r, { pid: 'p1', prim: 'Cendre-4', stance: 'assault' }, { pid: 'p2', prim: 'Ronce-2', stance: 'guard' });
    r.tactics('p1', [{ mode: 'keep' }, { mode: 'damage' }]);
    expect(r.state.players.p1.insight).toBe(2);
    expectNoLeak(r, 'p2', 'Cendre-3-ferveur');
    expect(pubOf(r, 'insight', 'p1')).toEqual([]);
    expect(pubEffects(r, 'p1')).toEqual([]);
    expect(ownOf(r, 'insight', 'p1')).toEqual([{ player: 'p1', gain: 0, reasons: ['Ferveur'], insight: 2, capped: true, own: true }]);
  });

  it('Ferveur + Interférence réussie : seul le motif naturel est public (le gain est déjà expliqué)', () => {
    const r = masked('p1', 'Cendre-3-ferveur', { variants: ['Cendre-3'], hand: ['Cendre-4', 'Astre-1'], other: { hand: ['Ronce-2', 'Astre-3'], slots: [{ def: 'Astre-2', active: true }, null] } });
    engage(r, { pid: 'p1', prim: 'Cendre-4', stance: 'assault' }, { pid: 'p2', prim: 'Ronce-2', stance: 'guard' });
    r.tactics('p2', [{ mode: 'rank' }, null]);
    r.tactics('p1', [{ mode: 'interfere', target: 0 }, { mode: 'damage' }]);
    expect(r.state.players.p1.insight).toBe(2);
    expectNoLeak(r, 'p2', 'Cendre-3-ferveur');
    expect(pubOf(r, 'insight', 'p1')).toEqual([{ player: 'p1', gain: 1, reasons: ['Interférence réussie'], insight: 2 }]);
    expect(pubEffects(r, 'p1')).toEqual([]);
    expect(ownOf(r, 'insight', 'p1')).toEqual([{ player: 'p1', gain: 1, reasons: ['Interférence réussie', 'Ferveur'], insight: 2, own: true }]);
  });

  it('Étincelle (valeur exacte) : +2 dégâts fixes publics, sans nom ni « avance exacte de 1 » ; score toujours « ? »', () => {
    const r = masked('p1', 'Cendre-1-etincelle', { variants: ['Cendre-1'], hand: ['Cendre-4', 'Astre-1'], other: { hand: ['Ronce-4', 'Astre-3'], slots: [{ def: 'Astre-1', active: true }, null] } });
    engage(r, { pid: 'p1', prim: 'Cendre-4', stance: 'assault' }, { pid: 'p2', prim: 'Ronce-4', stance: 'assault' });
    r.tactics('p2', [{ mode: 'rank' }, null]);
    r.tactics('p1', [{ mode: 'keep' }, { mode: 'rank' }]);
    // 6 (4 + 1 + 1) contre 5 (4 + 1) : victoire d’exactement 1 point, 12 + 2 fixes.
    expect(r.state.players.p2.hp).toBe(90 - 14);
    expectNoLeak(r, 'p2', 'Cendre-1-etincelle');
    const all = strings(exposure(r, 'p2')).join('\n');
    expect(all).not.toMatch(/avance/);
    expect(report(r).publicScores.p1).toBe('?');
    expect(numbers(report(r))).not.toContain(6);
    expect(pubOf(r, 'damage', 'p2')).toEqual([{ player: 'p2', amount: 14, base: 12, fixed: 2, before: 90, hp: 76 }]);
    expect(pubEffects(r, 'p1')).toEqual([{ player: 'p1', effect: null, masked: true, family: 'Cendre', slot: 1, status: 'success', detail: '+2 dégâts fixes' }]);
    expect(ownOf(r, 'effect', 'p1')[0]).toMatchObject({ effect: 'etincelle', status: 'success', detail: '+2 dégâts fixes (avance exacte de 1)' });
  });

  it('Étincelle sans condition remplie, puis Interférée : aucun événement public (un échec n’a pas de conséquence)', () => {
    const failed = masked('p1', 'Cendre-1-etincelle', { variants: ['Cendre-1'], hand: ['Cendre-4', 'Astre-1'], other: { hand: ['Ronce-4', 'Astre-3'] } });
    engage(failed, { pid: 'p1', prim: 'Cendre-4', stance: 'assault' }, { pid: 'p2', prim: 'Ronce-4', stance: 'assault' });
    failed.tactics('p1', [{ mode: 'keep' }, { mode: 'rank' }]);
    expectNoLeak(failed, 'p2', 'Cendre-1-etincelle');
    expect(pubEffects(failed, 'p1')).toEqual([]);
    expect(ownOf(failed, 'effect', 'p1')[0]).toMatchObject({ effect: 'etincelle', status: 'failed' });

    const cancelled = masked('p1', 'Cendre-1-etincelle', { variants: ['Cendre-1'], hand: ['Cendre-4', 'Astre-1'], other: { hand: ['Ronce-4', 'Astre-3'], slots: [{ def: 'Astre-2', active: true }, null] } });
    engage(cancelled, { pid: 'p1', prim: 'Cendre-4', stance: 'assault' }, { pid: 'p2', prim: 'Ronce-4', stance: 'assault' });
    cancelled.tactics('p2', [{ mode: 'interfere', target: 1 }, null]);
    cancelled.tactics('p1', [{ mode: 'keep' }, { mode: 'rank' }]);
    expect(cancelled.ev('interference', 'public')[0]!.data).toMatchObject({ player: 'p2', target: 1, success: true, targetDefId: null, targetFamily: 'Cendre' });
    expectNoLeak(cancelled, 'p2', 'Cendre-1-etincelle');
    expect(pubEffects(cancelled, 'p1')).toEqual([]);
    expect(ownOf(cancelled, 'effect', 'p1')[0]).toMatchObject({ effect: 'etincelle', status: 'cancelled' });
  });

  it('Écaille (rival) : le soin est public, l’effet générique ; à PV pleins, rien de public', () => {
    for (const hp of [80, 90]) {
      const r = masked('p2', 'Ronce-2-ecaille', { variants: ['Ronce-2'], hand: ['Ronce-3', 'Astre-1'], ownerHp: hp, other: { hand: ['Cendre-4', 'Voile-1'] } });
      engage(r, { pid: 'p1', prim: 'Cendre-4', stance: 'assault' }, { pid: 'p2', prim: 'Ronce-3', stance: 'guard' });
      r.tactics('p2', [{ mode: 'keep' }, { mode: 'rank' }]);
      expect(r.state.players.p2.hp).toBe(Math.min(90, hp + 2));
      expectNoLeak(r, 'p1', 'Ronce-2-ecaille');
      expect(pubOf(r, 'insight', 'p2')).toEqual([{ player: 'p2', gain: 1, reasons: ['Garde victorieuse'], insight: 2 }]);
      if (hp === 80) {
        expect(pubOf(r, 'heal', 'p2')).toEqual([{ player: 'p2', amount: 2, hp: 82 }]);
        expect(pubEffects(r, 'p2')).toEqual([{ player: 'p2', effect: null, masked: true, family: 'Ronce', slot: 1, status: 'success', detail: 'soin de 2 PV' }]);
      } else {
        expect(pubOf(r, 'heal', 'p2')).toEqual([]);
        expect(pubEffects(r, 'p2')).toEqual([]);
        expect(ownOf(r, 'heal', 'p2')).toEqual([{ player: 'p2', amount: 0, hp: 90, own: true }]);
      }
      expect(ownOf(r, 'effect', 'p2')[0]).toMatchObject({ effect: 'ecaille', status: 'success' });
    }
  });

  it('Ténacité (rival) : le retour sous la pioche est public, l’identité non', () => {
    const r = masked('p2', 'Ronce-4-tenacite', { variants: ['Ronce-4'], hand: ['Ronce-1', 'Astre-1'], other: { hand: ['sig-Cendre', 'Voile-1'] } });
    engage(r, { pid: 'p1', prim: 'sig-Cendre', stance: 'assault' }, { pid: 'p2', prim: 'Ronce-1', stance: 'guard' });
    r.tactics('p2', [{ mode: 'keep' }, { mode: 'rank' }]);
    expectNoLeak(r, 'p1', 'Ronce-4-tenacite');
    expect(pubOf(r, 'destination', 'p2')).toEqual([{ player: 'p2', slot: 1, dest: 'bottom', defId: null }]);
    expect(pubEffects(r, 'p2')).toEqual([{ player: 'p2', effect: null, masked: true, family: 'Ronce', slot: 1, status: 'success', detail: 'retour sous la pioche' }]);
    expect(r.state.players.p2.deck[0]).toBe(idOf(r.state, 'p2', 'Ronce-4-tenacite'));
  });

  it('Relance : Interférence réussie et retour au sommet publics, identité masquée', () => {
    const r = masked('p1', 'Astre-3-relance', { variants: ['Astre-3'], hand: ['Cendre-4', 'Voile-1'], other: { hand: ['Ronce-2', 'Astre-1'], slots: [{ def: 'Cendre-3', active: true }, null] } });
    engage(r, { pid: 'p1', prim: 'Cendre-4', stance: 'assault' }, { pid: 'p2', prim: 'Ronce-2', stance: 'guard' });
    r.tactics('p2', [{ mode: 'rank' }, null]);
    r.tactics('p1', [{ mode: 'keep' }, { mode: 'interfere', target: 0 }]);
    expectNoLeak(r, 'p2', 'Astre-3-relance');
    expect(pubOf(r, 'destination', 'p1')).toEqual([{ player: 'p1', slot: 1, dest: 'top', defId: null }]);
    expect(pubEffects(r, 'p1')).toEqual([{ player: 'p1', effect: null, masked: true, family: 'Astre', slot: 1, status: 'success', detail: 'retour au sommet de la pioche' }]);
    expect(pubOf(r, 'insight', 'p1')).toEqual([{ player: 'p1', gain: 1, reasons: ['Interférence réussie'], insight: 2 }]);
  });

  it('Détour (rival) : l’observation privée n’est annoncée ni par nom ni par effet générique', () => {
    const r = masked('p2', 'Voile-2-detour', { variants: ['Voile-2'], hand: ['Ronce-2', 'Astre-1'], other: { hand: ['Cendre-4', 'Astre-3'], slots: [{ def: 'Cendre-2', active: true }, null] } });
    engage(r, { pid: 'p1', prim: 'Cendre-4', stance: 'assault' }, { pid: 'p2', prim: 'Ronce-2', stance: 'guard' });
    r.tactics('p1', [{ mode: 'rank' }, null]);
    r.tactics('p2', [{ mode: 'keep' }, { mode: 'interfere', target: 0 }]);
    expectNoLeak(r, 'p1', 'Voile-2-detour');
    expect(pubEffects(r, 'p2')).toEqual([]);
    expect(ownOf(r, 'effect', 'p2')[0]).toMatchObject({ effect: 'detour', status: 'success' });
    expect(r.ev('peek', 'p2').map((e) => e.data.source)).toEqual(['Détour']);
  });

  it('Silence (rival) : la Braise neutralisée reste ANNULÉE publiquement, sans nommer sa cause', () => {
    const r = masked('p2', 'Voile-4-silence', { variants: ['Voile-4'], hand: ['Ronce-3', 'Astre-1'], cfg: { v1: ['Cendre-2'] }, other: { hand: ['Cendre-2-braise', 'Astre-3'], slots: [{ def: 'Ronce-4', active: true }, null] } });
    engage(r, { pid: 'p1', prim: 'Cendre-2-braise', stance: 'assault' }, { pid: 'p2', prim: 'Ronce-3', stance: 'guard' });
    r.tactics('p1', [{ mode: 'rank' }, null]);
    r.tactics('p2', [{ mode: 'keep' }, { mode: 'interfere', target: 0 }]);
    expectNoLeak(r, 'p1', 'Voile-4-silence');
    expect(pubEffects(r, 'p1')).toEqual([{ player: 'p1', effect: 'braise', status: 'cancelled', detail: 'neutralisation par l’effet d’une Secondaire masquée', by: { player: 'p2', family: 'Voile', slot: 1 } }]);
    expect(buildJournal(visibleEvents(r.events, 'p1'), 'p1').map((l) => l.text)).toContain('Braise (vous) : ANNULÉ — neutralisation par l’effet de la Secondaire Voile masquée du rival (case 2).');
    expect(buildJournal(visibleEvents(r.events, 'p2'), 'p2').map((l) => l.text)).toContain('Braise (rival) : ANNULÉ — neutralisation par l’effet de votre Secondaire Voile masquée (case 2).');
    expect(pubEffects(r, 'p2')).toEqual([{ player: 'p2', effect: null, masked: true, family: 'Voile', slot: 1, status: 'success', detail: 'effet en attente de la Primaire adverse neutralisé' }]);
    expect(ownOf(r, 'effect', 'p2')[0]).toMatchObject({ effect: 'silence', status: 'success' });
  });

  it('Silence contre une Primaire sans effet : aucune conséquence, aucun événement public', () => {
    const r = masked('p2', 'Voile-4-silence', { variants: ['Voile-4'], hand: ['Ronce-3', 'Astre-1'], other: { hand: ['Cendre-2', 'Astre-3'], slots: [{ def: 'Ronce-4', active: true }, null] } });
    engage(r, { pid: 'p1', prim: 'Cendre-2', stance: 'assault' }, { pid: 'p2', prim: 'Ronce-3', stance: 'guard' });
    r.tactics('p1', [{ mode: 'rank' }, null]);
    r.tactics('p2', [{ mode: 'keep' }, { mode: 'interfere', target: 0 }]);
    expectNoLeak(r, 'p1', 'Voile-4-silence');
    expect(pubEffects(r, 'p2')).toEqual([]);
  });

  it('Racine (rival) : Repoussement public, observation privée ; la carte consommée reste masquée en défausse jusqu’à la fin du tour', () => {
    const r = masked('p2', 'Ronce-1-racine', { variants: ['Ronce-1'], hand: ['Ronce-3', 'Astre-1'], other: { hand: ['Cendre-4', 'Astre-3'], slots: [{ def: 'Cendre-2' }, null] } });
    engage(r, { pid: 'p1', prim: 'Cendre-4', stance: 'assault' }, { pid: 'p2', prim: 'Ronce-3', stance: 'guard' });
    r.tactics('p2', [{ mode: 'keep' }, { mode: 'rank' }]);
    expect(r.state.phase).toBe('REPEL');
    // Fenêtre de Repoussement : le tour n’est pas fini, la carte camouflée consommée n’est pas nommée.
    expect(viewFor(r.state, 'p1').opp.discard).toContain(null);
    expectNoLeak(r, 'p1', 'Ronce-1-racine');
    r.apply({ type: 'repel', player: 'p2', targetSlot: 0 });
    expect(r.state.phase).toBe('RESOLVED');
    expectNoLeak(r, 'p1', 'Ronce-1-racine');
    // Fin du tour : carte réellement défaussée, désormais publique (ARB-005).
    expect(viewFor(r.state, 'p1').opp.discard).toContain('Ronce-1-racine');
    expect(pubEffects(r, 'p2')).toEqual([]);
    expect(ownOf(r, 'effect', 'p2')[0]).toMatchObject({ effect: 'racine', status: 'success' });
    expect(r.ev('peek', 'p2').map((e) => e.data.source)).toEqual(['Racine']);
  });

  it('Éclaireur et Repère camouflés : leur effet de révélation reste privé', () => {
    const e = masked('p2', 'Voile-1-eclaireur', { variants: ['Voile-1'], hand: ['Ronce-3', 'Astre-1'], other: { hand: ['Cendre-4', 'Astre-3'] } });
    expectNoLeak(e, 'p1', 'Voile-1-eclaireur');
    expect(pubOf(e, 'effect', 'p2').map((x) => x.effect)).toEqual(['dissimulation']);
    expect(ownOf(e, 'effect', 'p2')[0]).toMatchObject({ effect: 'eclaireur', status: 'success' });
    const p = masked('p1', 'Astre-1-repere', { variants: ['Astre-1'], hand: ['Cendre-4', 'Voile-1'], other: { hand: ['Ronce-3', 'Astre-3'] } });
    expectNoLeak(p, 'p2', 'Astre-1-repere');
    expect(pubOf(p, 'effect', 'p1').map((x) => x.effect)).toEqual(['dissimulation']);
    expect(ownOf(p, 'effect', 'p1')[0]).toMatchObject({ effect: 'repere', status: 'success' });
  });

  it('carte déjà publique avant le tour : aucun oubli, ses effets restent nommés', () => {
    const r = masked('p1', 'Cendre-3-ferveur', { variants: ['Cendre-3'], hand: ['Cendre-4', 'Astre-1'], known: true, other: { hand: ['Ronce-2', 'Astre-3'] } });
    expect(r.state.players.p1.mask).not.toBeNull();
    engage(r, { pid: 'p1', prim: 'Cendre-4', stance: 'assault' }, { pid: 'p2', prim: 'Ronce-2', stance: 'guard' });
    r.tactics('p1', [{ mode: 'keep' }, { mode: 'damage' }]);
    expect(pubEffects(r, 'p1')).toEqual([{ player: 'p1', effect: 'ferveur', status: 'success', detail: '+1 Insight (sous limite)' }]);
    expect(pubOf(r, 'insight', 'p1')).toEqual([{ player: 'p1', gain: 1, reasons: ['Ferveur'], insight: 2 }]);
    expect(ownOf(r, 'effect', 'p1')).toEqual([]);
  });

  it('Dissipation lève légalement le camouflage : les effets redeviennent nommés, l’historique masqué n’est pas réécrit', () => {
    const r = masked('p1', 'Cendre-3-ferveur', { variants: ['Cendre-3'], hand: ['Cendre-4', 'Astre-1'], cfg: { t2: ['Dissipation'] }, other: { hand: ['Ronce-2', 'Astre-3'] } });
    expect(r.state.phase).toBe('DISSIPATION');
    r.apply({ type: 'dissipate', player: 'p2', targetSlot: 0 });
    expect(r.ev('dissipation', 'public')[0]!.data).toMatchObject({ player: 'p2', slot: 1, defId: 'Cendre-3-ferveur' });
    expect(r.ev('secondaryRevealed', 'public').find((e) => e.data.slot === 1)!.data.defId).toBeNull();
    engage(r, { pid: 'p1', prim: 'Cendre-4', stance: 'assault' }, { pid: 'p2', prim: 'Ronce-2', stance: 'guard' });
    r.tactics('p1', [{ mode: 'keep' }, { mode: 'damage' }]);
    expect(pubEffects(r, 'p1')).toEqual([{ player: 'p1', effect: 'ferveur', status: 'success', detail: '+1 Insight (sous limite)' }]);
    expect(report(r).publicMultipliers.p1).toBe('4');
  });

  it('camouflages des deux côtés le même tour (Rang chez l’un, Dégâts chez l’autre) : aucune valeur ni origine', () => {
    const s = fixture(config({ v1: ['Voile-3', 'Cendre-1'], v2: ['Voile-3', 'Cendre-3'] }),
      { hand: ['Astre-2', 'Ronce-1'], slots: [{ def: 'Voile-3-dissimulation' }, { def: 'Cendre-1-etincelle' }] },
      { hand: ['Cendre-2', 'Astre-1'], slots: [{ def: 'Voile-3-dissimulation' }, { def: 'Cendre-3-ferveur' }] }, { phase: 'PREPARE', turn: 7 });
    const r = new Runner(s).apply({ type: 'prepare', player: 'p1', reveal: [0, 1] }).apply({ type: 'prepare', player: 'p2', reveal: [0, 1] });
    engage(r, { pid: 'p1', prim: 'Astre-2', stance: 'assault' }, { pid: 'p2', prim: 'Cendre-2', stance: 'assault' });
    r.tactics('p1', [{ mode: 'keep' }, { mode: 'rank' }]);
    r.tactics('p2', [{ mode: 'keep' }, { mode: 'damage' }]);
    // p1 : 2 + 1 = 3 (secret) ; p2 : 2, ×(3 + 1) = ×4 (secret) ; Étincelle réussit (+2), Ferveur échoue (p2 perd).
    expect(r.state.players.p2.hp).toBe(90 - 6 - 2);
    const rep = report(r);
    expect(rep.publicScores).toEqual({ p1: '?', p2: '2' });
    expect(rep.publicMultipliers).toEqual({ p1: '1', p2: '?' });
    expect(numbers(rep)).not.toContain(3);
    expect(numbers(rep)).not.toContain(4);
    expectNoLeak(r, 'p2', 'Cendre-1-etincelle');
    expectNoLeak(r, 'p1', 'Cendre-3-ferveur');
    expect(pubEffects(r, 'p1')).toEqual([{ player: 'p1', effect: null, masked: true, family: 'Cendre', slot: 1, status: 'success', detail: '+2 dégâts fixes' }]);
    expect(pubEffects(r, 'p2')).toEqual([]);
    expect(ownOf(r, 'effect', 'p2')[0]).toMatchObject({ effect: 'ferveur', status: 'failed' });
  });

  it('Secondaire camouflée remplacée pendant l’engagement : défaussée sans être nommée avant la fin du tour (ARB-005)', () => {
    const r = masked('p1', 'Cendre-3-ferveur', { variants: ['Cendre-3'], hand: ['Cendre-4', 'Astre-1'], other: { hand: ['Ronce-2', 'Astre-3'] } });
    r.commit('p1', 'Cendre-4', 'assault', 'Astre-1', 1).commit('p2', 'Ronce-2', 'guard');
    expect(r.ev('replaced', 'public')[0]!.data).toEqual({ player: 'p1', slot: 1, defId: null, masked: true, family: 'Cendre' });
    expect(ownOf(r, 'replaced', 'p1')).toEqual([{ player: 'p1', slot: 1, defId: 'Cendre-3-ferveur', own: true }]);
    expect(viewFor(r.state, 'p2').opp.discard).toEqual([null]);
    expectNoLeak(r, 'p2', 'Cendre-3-ferveur');
    // Fin du tour : la carte est désormais une carte réellement défaussée, publique (ARB-005).
    r.tactics('p1', [{ mode: 'keep' }, null]);
    expect(r.state.phase).toBe('RESOLVED');
    expect(viewFor(r.state, 'p2').opp.discard).toContain('Cendre-3-ferveur');
  });

  it('sans camouflage : information publique strictement inchangée (Ferveur nommée, motif nommé)', () => {
    const s = fixture(config({ v1: ['Cendre-3'] }), { hand: ['Cendre-4', 'Astre-1'], slots: [null, { def: 'Cendre-3-ferveur', active: true }] }, { hand: ['Ronce-2', 'Astre-3'] });
    const r = engage(new Runner(s), { pid: 'p1', prim: 'Cendre-4', stance: 'assault' }, { pid: 'p2', prim: 'Ronce-2', stance: 'guard' });
    r.tactics('p1', [null, { mode: 'damage' }]);
    expect(pubEffects(r, 'p1')).toEqual([{ player: 'p1', effect: 'ferveur', status: 'success', detail: '+1 Insight (sous limite)' }]);
    expect(pubOf(r, 'insight', 'p1')).toEqual([{ player: 'p1', gain: 1, reasons: ['Ferveur'], insight: 2 }]);
    expect(report(r).effects).toEqual([{ player: 'p1', effect: 'ferveur', status: 'success', detail: '+1 Insight (sous limite)' }]);
    expect(r.ev('effect').filter((e) => e.vis !== 'public')).toEqual([]);
  });
});

describe('ADR 011 — propriétés : aucune surface publique ne désigne une carte camouflée', () => {
  /** Toutes les variantes ordinaires (hors Dissimulation, qui est la source). */
  const VARIANTS = Object.values(createGame(DEFAULT_CONFIG).state.cards).filter((c) => c.owner === 'p1').map((c) => c.defId)
    .filter((x) => !x.startsWith('sig-') && x !== 'Voile-3-dissimulation');

  const DECKS: Record<PlayerId, string[]> = { p1: [], p2: [] };
  for (const c of Object.values(createGame(DEFAULT_CONFIG).state.cards)) DECKS[c.owner].push(c.defId);

  /** Le propriétaire camoufle `defId` (révélée avec Dissimulation) ; mains et terrain adverse tirés au sort. */
  function forced(owner: PlayerId, defId: string, seed: number): Runner {
    const cfg: GameConfig = { ...DEFAULT_CONFIG, seed };
    const rnd = makeRng(seed * 7919 + defId.length);
    const pick = <T,>(xs: T[], n: number) => { const a = [...xs]; const out: T[] = []; while (out.length < n && a.length) out.push(a.splice(Math.floor(rnd() * a.length), 1)[0]!); return out; };
    const deck = (pid: PlayerId) => DECKS[pid];
    const ident = cardDef(defId).identity;
    const mine = pick(deck(owner).filter((x) => x !== defId && x !== 'Voile-3-dissimulation'), 4);
    const theirs = pick(deck(other(owner)).filter((x) => cardDef(x).identity !== ident), 6);
    const [a, b] = theirs.slice(4).filter((x) => !x.startsWith('sig-'));
    const sideMine: SideSetup = { hand: mine, slots: [{ def: 'Voile-3-dissimulation' }, { def: defId }] };
    const sideOther: SideSetup = { hand: theirs.slice(0, 4), slots: [a ? { def: a, active: true } : null, b ? { def: b } : null] };
    const st = owner === 'p1' ? fixture(cfg, sideMine, sideOther, { phase: 'PREPARE', turn: 4 }) : fixture(cfg, sideOther, sideMine, { phase: 'PREPARE', turn: 4 });
    return new Runner(st);
  }

  /** Joue le tour : le propriétaire révèle tout et engage la carte camouflée dans `mode` si c’est légal ; l’IA fait le reste. */
  function playTurn(r: Runner, owner: PlayerId, mode: TacticMode, seed: number): void {
    for (let guard = 0; guard < 12 && r.state.phase !== 'RESOLVED' && r.state.phase !== 'ENDED'; guard++) {
      for (const pid of ['p1', 'p2'] as PlayerId[]) {
        const v = viewFor(r.state, pid);
        if (!v.awaitingMe) continue;
        let cmd = decide(v, PROFILES.lecteur!, seed, buildMemory(visibleEvents(r.events, pid), pid));
        if (pid === owner && r.state.phase === 'PREPARE') cmd = { type: 'prepare', player: pid, reveal: eligibleReveals(r.state, pid) };
        if (pid === owner && r.state.phase === 'TACTICS' && cmd?.type === 'tactics') {
          const target = viewFor(r.state, pid).opp.slots.find((x) => x?.state === 'active')?.slot;
          const plan: TacticPlan = mode === 'interfere' ? { mode, target: target ?? 0 } : { mode };
          const forcedCmd: PlayerCommand = { ...cmd, plans: [cmd.plans[0], plan], technique: null };
          if (checkCommand(r.state, forcedCmd) === null) cmd = forcedCmd;
        }
        if (cmd) r.apply(cmd);
      }
    }
  }

  it('chaque variante camouflée, engagée en Rang / Dégâts / Interférence / Conservée, face à l’IA : aucune fuite', () => {
    let runs = 0;
    let engaged = 0;
    let privateEffects = 0;
    for (const owner of ['p1', 'p2'] as PlayerId[]) {
      for (const defId of VARIANTS) {
        for (const mode of ['rank', 'damage', 'interfere', 'keep'] as TacticMode[]) {
          for (const seed of [11, 23]) {
            const r = forced(owner, defId, seed + VARIANTS.indexOf(defId));
            playTurn(r, owner, mode, seed);
            expect(['RESOLVED', 'ENDED']).toContain(r.state.phase);
            if (!r.ev('secondaryRevealed', owner).some((e) => e.data.own)) continue; // camouflage effectif
            runs++;
            const tac = r.ev('tacticsRevealed', 'public')[0]?.data[owner] as Array<{ mode: string } | null> | undefined;
            if (tac?.[1] && tac[1].mode !== 'keep') engaged++;
            privateEffects += r.ev('effect', owner).filter((e) => e.data.own).length;
            expectNoLeak(r, other(owner), defId);
            // Rapport public : jamais d’effet nommé pour la case camouflée, jamais un échec générique.
            for (const e of report(r)?.effects ?? []) if (e.player === owner && e.slot === 1) expect(e).toMatchObject({ effect: null, masked: true, status: 'success' });
          }
        }
      }
    }
    expect(runs).toBeGreaterThan(200);
    expect(engaged).toBeGreaterThan(100);
    expect(privateEffects).toBeGreaterThan(20);
  }, 30_000);

  /** Configurations où les deux decks jouent Voile III avec toutes les variantes. */
  const CONFIGS: GameConfig[] = [
    DEFAULT_CONFIG,
    { ...DEFAULT_CONFIG, players: { p1: { ...DEFAULT_CONFIG.players.p1, signature: 'Voile' }, p2: { ...DEFAULT_CONFIG.players.p2, signature: 'Voile' } } },
  ];
  it('80 duels IA/IA rejoués commande par commande : événements publics et vue adverse anonymes jusqu’à la fin du tour', () => {
    let hidden = 0;
    let views = 0;
    for (const base of CONFIGS) {
      for (let seed = 1; seed <= 40; seed++) {
        const m = autoplay({ ...base, seed }, 200, [PROFILES.prudent!, PROFILES.lecteur!]);
        // Cartes camouflées : révélées en privé (« own ») à leur seul propriétaire.
        const secrets = m.events.filter((e) => e.kind === 'secondaryRevealed' && e.data.own).map((e) => {
          const owner = e.vis as PlayerId;
          const defId = e.data.defId as string;
          const lifted = m.events.some((x) => x.turn === e.turn && x.kind === 'dissipation' && x.data.target === owner);
          return { turn: e.turn, seq: e.seq, owner, defId, cardId: idOf(m.state, owner, defId), lifted };
        }).filter((x) => !x.lifted);
        hidden += secrets.length;
        for (const sec of secrets) {
          const res = tokens(sec.defId, sec.cardId).slice(2); // instance + nom/id d’effet : propres à CETTE carte
          const exactRe = exact(sec.defId);
          for (const x of m.events) {
            if (x.turn !== sec.turn || x.seq <= sec.seq || x.vis !== 'public' || x.data.player !== sec.owner) continue;
            if (x.kind === 'tacticsRevealed') continue;
            // Champs qui décrivent une carte de l’AUTRE camp (cible d’Interférence, de Repoussement, de Dissipation).
            const { targetDefId: _t, ...own } = x.data as Record<string, unknown>;
            const json = JSON.stringify(x.kind === 'repel' || x.kind === 'dissipation' ? { ...own, defId: null } : own);
            for (const re of res) expect(json, `${x.kind} ${json}`).not.toMatch(re);
            expect(json, `${x.kind} ${json}`).not.toMatch(exactRe);
          }
        }
        // Vue adverse à chaque commande : le camp du propriétaire ne contient ni l’instance ni la définition.
        let { state } = createGame({ ...base, seed });
        for (const cmd of m.record().commands) {
          state = applyCommand(state, cmd).state;
          if (state.phase === 'RESOLVED') continue; // fin du tour : défausse publique (ARB-005)
          for (const sec of secrets) {
            if (sec.turn !== state.turn) continue;
            const v = viewFor(state, other(sec.owner));
            const json = JSON.stringify([v.opp, v.lastClash, v.reveal.tactics?.opp ?? null]);
            views++;
            expect(json).not.toContain(`"${sec.cardId}"`);
            expect(json).not.toMatch(exact(sec.defId));
          }
        }
      }
    }
    expect(hidden).toBeGreaterThan(10);
    expect(views).toBeGreaterThan(30);
  }, 30_000);
});

export type { SlotIndex, EffectId };
void d;
