/**
 * M03.1B P1 — scénarios QA des Techniques (Rupture, Dissipation) et du camouflage d’effet, joués ici
 * par commandes moteur (les mêmes que l’interface envoie), avec le rival SCRIPTÉ du scénario.
 * La QA navigateur (`tools/qa-techniques.mjs`) rejoue ces scénarios par les vrais contrôles UI.
 */
import { describe, expect, it } from 'vitest';
import { buildMemory } from '../src/game/ai/memory';
import { cardDef } from '../src/game/catalog/cards';
import { applyCommand } from '../src/game/engine/engine';
import type { GameEvent, GameState, PlayerCommand } from '../src/game/model/types';
import { buildJournal } from '../src/game/visibility/journal';
import { publicEvents, viewFor, visibleEvents } from '../src/game/visibility/view';
import { SCENARIOS } from '../src/app/scenarios';
import { d, idOf } from './helpers';

/** Rejoue un scénario : commandes humaines fournies, rival scripté par `tour:phase`. */
class Play {
  state: GameState;
  events: GameEvent[] = [];
  constructor(public id: string) {
    const sc = SCENARIOS[id]!;
    this.state = sc.build(sc.config);
    this.rival();
  }
  private rival(): void {
    const sc = SCENARIOS[this.id]!;
    for (let guard = 0; guard < 4; guard++) {
      const v = viewFor(this.state, 'p2');
      if (!v.awaitingMe) return;
      const script = sc.rival[`${v.turn}:${v.phase}`];
      if (!script) throw new Error(`rival non scripté en ${v.turn}:${v.phase}`);
      this.push(script(this.state));
    }
  }
  private push(cmd: PlayerCommand): void {
    const r = applyCommand(this.state, cmd);
    this.state = r.state;
    this.events.push(...r.events);
  }
  me(cmd: PlayerCommand): this {
    this.push(cmd);
    this.rival();
    return this;
  }
  journal(viewer: 'p1' | 'p2' = 'p1'): string[] {
    return buildJournal(visibleEvents(this.events, viewer), viewer).map((l) => l.text);
  }
}

const commit = (p: Play, def: string, stance: 'assault' | 'guard') => p.me({ type: 'commit', player: 'p1', primaryId: idOf(p.state, 'p1', d(def)), stance, secondaryId: null, replaceSlot: null });

describe('Scénarios QA des Techniques — résultats, Insight, cibles, informations cachées', () => {
  it('rupture : Garde gagnante, aucune cible cachée → Rupture renvoie la Secondaire active visée (un seul Repoussement)', () => {
    const p = new Play('rupture');
    commit(p, 'Ronce-4', 'guard');
    expect(p.state.phase).toBe('TACTICS');
    // Le rival a déjà verrouillé (Conserver) sans rien savoir de la Technique : Rupture équipée est
    // publique (ARB-002), sa DÉCLARATION et sa cible ne le sont qu’à la révélation commune des tactiques.
    expect(p.state.pending.p2).toBeDefined();
    expect(viewFor(p.state, 'p2').opp.techniqueUsed).toBeNull();
    const n = p.events.length;
    p.me({ type: 'tactics', player: 'p1', plans: [null, null], technique: { id: 'Rupture', targetSlot: 0 } });
    const batch = p.events.slice(n).map((e) => e.kind);
    expect(batch.indexOf('technique')).toBeGreaterThan(batch.indexOf('locked'));
    expect(batch.indexOf('technique')).toBeLessThan(batch.indexOf('tacticsRevealed'));
    expect(p.state.phase).toBe('REPEL');
    expect(viewFor(p.state, 'p1').repel).toEqual({ mine: true, kind: 'rupture', choices: [0] });
    p.me({ type: 'repel', player: 'p1', targetSlot: 0 });
    expect(p.state.phase).toBe('RESOLVED');
    // Coût 2 payé, puis +1 Insight de Garde victorieuse (jamais pour financer le coût du même tour).
    expect(p.state.players.p1.insight).toBe(1);
    expect(p.state.players.p1.techniqueUsed).toBe('Rupture');
    const pub = publicEvents(p.events);
    expect(pub.filter((e) => e.kind === 'technique').map((e) => e.data)).toEqual([{ player: 'p1', technique: 'Rupture', cost: 2, targetSlot: 0 }]);
    expect(pub.filter((e) => e.kind === 'repel').map((e) => e.data)).toEqual([{ player: 'p1', target: 'p2', slot: 0, kind: 'rupture', dest: 'hand', defId: 'Astre-3-basic' }]);
    expect(pub.filter((e) => e.kind === 'effect').map((e) => e.data)).toEqual([{ player: 'p1', effect: 'rupture', status: 'success', detail: 'Secondaire active renvoyée en main adverse', technique: true }]);
    // Zones : la carte retourne en MAIN adverse (elle devra être reposée et rechargée).
    expect(p.state.players.p2.slots[0]).toBeNull();
    expect(p.state.players.p2.hand).toContain(idOf(p.state, 'p2', 'Astre-3-basic'));
    const j = p.journal();
    expect(j).toContain('Vous utilisez la Technique Rupture (−2 Insight).');
    expect(j).toContain('Rupture : Vous renvoyez Astre III (case 1) dans la main de son propriétaire.');
    expect(j).toContain('Rupture (vous) : RÉUSSI — Secondaire active renvoyée en main adverse.');
  });

  it('rupture-cachee : une cible cachée existe → Repoussement Basic sur la carte cachée, Rupture échoue sans remboursement', () => {
    const p = new Play('rupture-cachee');
    commit(p, 'Ronce-4', 'guard');
    p.me({ type: 'tactics', player: 'p1', plans: [null, null], technique: { id: 'Rupture', targetSlot: 0 } });
    expect(viewFor(p.state, 'p1').repel).toEqual({ mine: true, kind: 'basic', choices: [1] });
    expect(applyCommand.bind(null, p.state, { type: 'repel', player: 'p1', targetSlot: 0 })).toThrow(/non admissible/);
    p.me({ type: 'repel', player: 'p1', targetSlot: 1 });
    expect(p.state.players.p1.insight).toBe(1);
    const pub = publicEvents(p.events);
    // Un seul Repoussement : la carte CACHÉE, non nommée publiquement.
    expect(pub.filter((e) => e.kind === 'repel').map((e) => e.data)).toEqual([{ player: 'p1', target: 'p2', slot: 1, kind: 'basic', dest: 'hand', defId: null }]);
    expect(pub.filter((e) => e.kind === 'effect').map((e) => e.data)).toEqual([{ player: 'p1', effect: 'rupture', status: 'failed', detail: 'une autre cible de Repoussement existe ou la cible n’est plus active', technique: true }]);
    expect(p.state.players.p2.slots[0]?.active).toBe(true); // Astre III reste en jeu
    expect(JSON.stringify(viewFor(p.state, 'p1'))).not.toContain('Voile-4');
  });

  it('dissipation : camouflage levé pendant la fenêtre légale, coût 1, carte désormais publique, rien d’oublié', () => {
    const p = new Play('dissipation');
    expect(p.state.phase).toBe('DISSIPATION');
    const before = viewFor(p.state, 'p1');
    expect(before.opp.slots[1]).toMatchObject({ card: null, masked: true, family: 'Voile' });
    expect(before.opp.slots[0]!.maskSource).toBe(true);
    // Ce que le rival a observé (Éclaireur camouflé) reste privé et ne nomme pas la carte publiquement.
    const peek = p.events.find((e) => e.kind === 'peek' && e.vis === 'p2')!;
    expect(peek.data.source).toBe('Éclaireur');
    expect(p.journal().join('\n')).not.toMatch(/Éclaireur|Voile I(?![IV])/);
    expect(JSON.stringify(publicEvents(p.events))).not.toMatch(/eclaireur/i);
    const known = buildMemory(visibleEvents(p.events, 'p2'), 'p2').knownOppHand;
    expect(known).toEqual([cardDef((peek.data.defIds as string[])[0]!).identity]);
    expect(() => applyCommand(p.state, { type: 'dissipate', player: 'p1', targetSlot: 1 })).toThrow(/effet de préparation actif/);
    p.me({ type: 'dissipate', player: 'p1', targetSlot: 0 });
    expect(p.state.phase).toBe('COMMIT');
    expect(p.state.players.p1.insight).toBe(0);
    expect(p.state.players.p2.mask).toBeNull();
    const after = viewFor(p.state, 'p1');
    expect(after.opp.slots[1]).toMatchObject({ card: { defId: 'Voile-1-eclaireur' }, masked: false });
    const j = p.journal();
    expect(j).toContain('Vous utilisez la Technique Dissipation (−1 Insight).');
    expect(j).toContain('Dissipation neutralise le camouflage : Voile I — Éclaireur (case 2) redevient visible ; ce qui a déjà été observé reste acquis.');
    // Historique non réécrit : la révélation masquée reste masquée dans le journal.
    expect(j).toContain('Le rival révèle une Secondaire Voile en case 2 — identité, Rang et Puissance masqués par un effet.');
    // Absence d’oubli : la connaissance du rival (observation déjà faite) est intacte.
    expect(buildMemory(visibleEvents(p.events, 'p2'), 'p2').knownOppHand).toEqual(known);
  });

  it('masque : l’effet d’une Secondaire masquée du rival montre ses conséquences, jamais son nom', () => {
    const p = new Play('masque');
    expect(p.state.phase).toBe('COMMIT');
    commit(p, 'Ronce-2', 'guard');
    expect(p.state.phase).toBe('RESOLVED');
    expect(p.state.players.p1.hp).toBe(90 - (12 - 3) * 4); // avenant 07 : la Garde II absorbe 3
    expect(p.state.players.p2.insight).toBe(2);
    const j = p.journal();
    expect(j).toContain('Le rival gagne 1 Insight (effet de la Secondaire Cendre masquée (case 2)) → 2/2.');
    expect(j).toContain('Effet de la Secondaire Cendre masquée du rival (case 2) : RÉUSSI — +1 Insight.');
    expect(j.join('\n')).not.toMatch(/Ferveur|Cendre III/);
    // Fin du tour : la carte consommée est désormais une carte réellement défaussée (ARB-005).
    expect(viewFor(p.state, 'p1').opp.discard).toContain('Cendre-3-ferveur');
  });
});
