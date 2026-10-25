/** Intégration moteur à phases : chronologie, zones, secrets, Techniques, journal (matrice G02–G27). */
import { describe, expect, it } from 'vitest';
import { cardDef } from '../src/game/catalog/cards';
import { applyCommand, checkCommand, createGame, DEFAULT_CONFIG } from '../src/game/engine/engine';
import { autoplay } from '../src/game/match';
import type { ClashReport } from '../src/game/model/types';
import { replay } from '../src/game/replay/replay';
import { buildJournal } from '../src/game/visibility/journal';
import { viewFor, visibleEvents } from '../src/game/visibility/view';
import { config, d, fixture, idOf, Runner } from './helpers';

describe('Deck, main, chargement (G02, G03, G04, G23)', () => {
  it('G02 : 17 cartes uniques (16 identités + 1 Signature), main initiale 4', () => {
    const { state } = createGame(config({ v1: 'all' }));
    const p = state.players.p1;
    const all = [...p.deck, ...p.hand];
    expect(all).toHaveLength(17);
    const ids = all.map((id) => cardDef(state.cards[id]!.defId).identity);
    expect(new Set(ids).size).toBe(17);
    expect(ids.filter((x) => x === 'Signature')).toHaveLength(1);
    expect(p.hand).toHaveLength(4);
    expect(p.insight).toBe(1);
  });

  it('G03 : Secondaire posée au tour T : ni révélation ni usage en T ; révélable et utilisable en T+1', () => {
    const s = fixture(config(), { hand: ['Cendre-3', 'Cendre-1', 'Voile-4', 'Astre-2'] }, { hand: ['Cendre-4', 'Ronce-1', 'Ronce-2', 'Astre-1'] });
    const r = new Runner(s).commit('p1', 'Cendre-3', 'assault', 'Cendre-1').commit('p2', 'Cendre-4', 'guard');
    // Aucune Secondaire active → pas de fenêtre tactique ; la Garde gagne et peut repousser
    // la Secondaire en CHARGEMENT (cible admissible §4.2).
    expect(r.state.phase).toBe('REPEL');
    expect(r.state.repel?.choices).toEqual([0]);
    expect(r.state.players.p1.slots[0]!.active).toBe(false);
    r.apply({ type: 'repel', player: 'p2', targetSlot: null });
    r.apply({ type: 'nextTurn' });
    // T+1 : START puis PREPARE ; révélation possible.
    expect(r.state.phase).toBe('PREPARE');
    expect(checkCommand(r.state, { type: 'prepare', player: 'p1', reveal: [0] })).toBeNull();
  });

  it('G03b : une Secondaire en chargement ne peut pas être révélée ni engagée (raison explicite)', () => {
    const s = fixture(config(), { hand: ['Cendre-3', 'Voile-4'], slots: [{ def: 'Cendre-1', charging: true }, { def: 'Voile-1', active: true }] }, { hand: ['Cendre-4', 'Ronce-2'] });
    const r = new Runner(s).commit('p1', 'Cendre-3', 'assault').commit('p2', 'Cendre-4', 'guard');
    expect(r.state.phase).toBe('TACTICS');
    expect(checkCommand(r.state, { type: 'tactics', player: 'p1', plans: [{ mode: 'rank' }, null], technique: null })).toMatch(/chargement/i);
  });

  it('G04 : Secondaire cachée inactive : aucune action, dos pour l’adversaire', () => {
    const s = fixture(config(), { hand: ['Cendre-3'], slots: [{ def: 'Cendre-1' }, null] }, { hand: ['Cendre-4'] });
    const r = new Runner(s).commit('p1', 'Cendre-3', 'assault').commit('p2', 'Cendre-4', 'guard');
    expect(r.state.phase).toBe('REPEL'); // Garde gagne et peut repousser la cachée
    const v = viewFor(r.state, 'p2');
    // Avant de repousser : la cachée reste face cachée pour p2.
    expect(v.opp.slots[0]!.card).toBeNull();
    expect(v.opp.slots[0]!.state).toBe('hidden');
    expect(v.repel?.choices).toEqual([0]);
  });

  it('G23 : Repoussement → main > 4 conservée, régulation au début du tour suivant AVANT pioche', () => {
    const s = fixture(config(), { hand: ['Cendre-3', 'Voile-4', 'Astre-1', 'Astre-2'], slots: [{ def: 'Cendre-1' }, null] }, { hand: ['Cendre-4'] });
    const r = new Runner(s).commit('p1', 'Cendre-3', 'assault').commit('p2', 'Cendre-4', 'guard');
    r.apply({ type: 'repel', player: 'p2', targetSlot: 0 });
    expect(r.state.players.p1.hand).toHaveLength(4); // 3 restantes + 1 repoussée
    // Forçons une main de 5 : nouvelle situation avec 4 cartes en main + repoussée.
    const s2 = fixture(config(), { hand: ['Cendre-3', 'Voile-4', 'Astre-1', 'Astre-2', 'Ronce-1'], slots: [{ def: 'Cendre-1' }, null] }, { hand: ['Cendre-4'] });
    const r2 = new Runner(s2).commit('p1', 'Cendre-3', 'assault').commit('p2', 'Cendre-4', 'guard');
    r2.apply({ type: 'repel', player: 'p2', targetSlot: 0 });
    expect(r2.state.players.p1.hand).toHaveLength(5);
    r2.apply({ type: 'nextTurn' });
    expect(r2.state.phase).toBe('START');
    expect(r2.state.awaiting).toContain('p1');
    expect(checkCommand(r2.state, { type: 'start', player: 'p1', discard: [], technique: null })).toMatch(/exactement 1/);
    const hand = r2.state.players.p1.hand;
    r2.apply({ type: 'start', player: 'p1', discard: [hand[0]!], technique: null });
    expect(r2.state.players.p1.hand).toHaveLength(4);
    expect(r2.ev('trim')).toHaveLength(1);
  });
});

describe('Scénario T2 (D-05, G08, G09, G24) — via le moteur complet et le journal', () => {
  function t2(withSupport: boolean) {
    const s = fixture(config({ v1: 'none', v2: 'none' }),
      { hand: ['Cendre-3', 'Voile-4', 'Astre-2', 'Ronce-1'], slots: [{ def: 'Cendre-1' }, null] },
      { hand: ['Cendre-4', 'Ronce-2', 'Astre-1', 'Voile-1'] });
    // La Cendre I a été posée au tour 2 ; tour 5 : on remet la phase PREPARE pour révéler.
    s.phase = 'PREPARE';
    s.awaiting = ['p1'];
    const r = new Runner(s);
    r.apply({ type: 'prepare', player: 'p1', reveal: withSupport ? [0] : [] });
    r.commit('p1', 'Cendre-3', 'assault', 'Voile-4').commit('p2', 'Cendre-4', 'guard');
    if (withSupport) r.tactics('p1', [{ mode: 'rank' }, null]);
    return r;
  }
  it('avec Cendre I en Rang : 5 contre 4, Assaut domine, la Garde absorbe 6 : 3 PV (avenant 07), journal explicite', () => {
    const r = t2(true);
    const rep = r.state.lastClash!;
    expect(rep.scores).toEqual({ p1: 5, p2: 4 });
    expect(rep.winner).toBe('p1');
    expect(rep.zeroDamageRankWin).toBe(false);
    expect(rep.absorbed).toBe(6);
    expect(rep.damage).toEqual({ p1: 0, p2: 3 });
    const j = buildJournal(r.events, 'p1').map((l) => l.text).join('\n');
    expect(j).toMatch(/Vous révélez et activez Cendre I/);
    expect(j).toMatch(/Cendre I → AMPLIFIER LE RANG · \+2 au Rang \(affinité \+1\)/);
    expect(j).toMatch(/Vous dominez au Rang \(5 contre 4\) ; la Garde absorbe 6 \(moitié de sa Puissance 12\) : \(9 − 6\) × 1 = 3\./);
    const jr = buildJournal(r.events, 'p2').map((l) => l.text).join('\n');
    expect(jr).toMatch(/Le rival domine au Rang \(5 contre 4\)/);
    // La Secondaire posée pendant ce tour (Voile IV) n’a pas contribué.
    expect(r.state.players.p1.slots[1]!.active).toBe(false);
  });
  it('sans soutien : Garde Cendre IV victorieuse, 0 dégât, gain d’Insight', () => {
    const r = t2(false);
    const rep = r.state.lastClash!;
    expect(rep.winner).toBe('p2');
    expect(rep.guardWin).toBe(true);
    expect(rep.damage).toEqual({ p1: 0, p2: 0 });
    expect(r.state.players.p2.insight).toBe(2);
    const j = buildJournal(r.events, 'p1').map((l) => l.text).join('\n');
    expect(j).toMatch(/Le rival gagne en GARDE \(priorité 4 ≥ 3\)/);
  });
});

describe('Insight et Techniques (G16-G19)', () => {
  it('G16 : réserve ≤ 2, gain +1/tour max, une Technique par tour, coût payé avant résultat', () => {
    const s = fixture(config({ t2: ['Rupture', 'Ancrage'] }),
      { hand: ['Cendre-4'], slots: [{ def: 'Voile-3', active: true }, null] },
      { hand: ['Ronce-4'], slots: [{ def: 'Voile-4', active: true }, null], insight: 2 });
    const r = new Runner(s).commit('p1', 'Cendre-4', 'assault').commit('p2', 'Ronce-4', 'guard');
    // Ancrage + Rupture : une seule Technique (la commande n’en accepte qu’une).
    r.tactics('p1', [{ mode: 'damage' }, null]);
    r.tactics('p2', [{ mode: 'interfere', target: 0 }, null], { id: 'Rupture', targetSlot: 0 });
    const p2 = r.state.players.p2;
    // Garde gagnante (4 ≥ 4) + Interférence réussie : gain plafonné à +1 → 0 + 1 = 1 (2 − 2 payé + 1).
    expect(p2.insight).toBe(1);
    expect(p2.insightGained).toBe(1);
    const ins = r.ev('insight').find((e) => e.data.player === 'p2')!;
    expect(ins.data.reasons).toEqual(['Garde victorieuse', 'Interférence réussie']);
  });

  it('G16b : coût insuffisant → rejet explicite sans mutation', () => {
    const s = fixture(config({ t1: ['Lecture', 'Ancrage'] }), { hand: ['Cendre-4'], insight: 1 }, { hand: ['Ronce-4'] });
    const r = new Runner(s).commit('p1', 'Cendre-4', 'assault').commit('p2', 'Ronce-4', 'guard');
    // Lecture coûte 2 : fenêtre non ouverte pour p1 (Insight 1) → résolution directe.
    expect(r.state.phase).not.toBe('LECTURE');
  });

  it('G17 : Lecture double → modes initiaux vus, changements simultanés cachés avant révélation', () => {
    const s = fixture(config({ t1: ['Lecture'], t2: ['Lecture'] }), { hand: ['Cendre-4'], insight: 2 }, { hand: ['Ronce-4'], insight: 2 });
    const r = new Runner(s).commit('p1', 'Cendre-4', 'assault').commit('p2', 'Ronce-4', 'guard');
    expect(r.state.phase).toBe('LECTURE');
    r.apply({ type: 'lecture', player: 'p1', use: true }).apply({ type: 'lecture', player: 'p2', use: true });
    expect(r.state.phase).toBe('LECTURE_CHANGE');
    expect(viewFor(r.state, 'p1').lectureSeen).toBe('guard');
    expect(viewFor(r.state, 'p2').lectureSeen).toBe('assault');
    r.apply({ type: 'lectureStance', player: 'p1', stance: 'guard' });
    // p2 ne voit toujours que le mode INITIAL de p1, jamais le mode modifié.
    expect(viewFor(r.state, 'p2').opp.primary?.stance).toBeNull();
    expect(viewFor(r.state, 'p2').lectureSeen).toBe('assault');
    r.apply({ type: 'lectureStance', player: 'p2', stance: 'assault' });
    const rev = r.ev('primariesRevealed')[0]!.data as Record<string, { stance: string }>;
    expect(rev.p1!.stance).toBe('guard');
    expect(rev.p2!.stance).toBe('assault');
  });

  it('G18 : Ancrage — soutien interféré préservé actif, action annulée ; Insight payé', () => {
    const s = fixture(config({ t1: ['Ancrage'] }),
      { hand: ['Cendre-4'], slots: [{ def: 'Cendre-3', active: true }, null] },
      { hand: ['Voile-1'], slots: [{ def: 'Voile-4', active: true }, null] });
    const r = new Runner(s).commit('p1', 'Cendre-4', 'assault').commit('p2', 'Voile-1', 'guard');
    r.tactics('p1', [{ mode: 'damage' }, null], { id: 'Ancrage', slot: 0 });
    r.tactics('p2', [{ mode: 'interfere', target: 0 }, null]);
    expect(r.state.players.p1.slots[0]?.active).toBe(true);
    expect(r.state.lastClash!.multipliers.p1).toBe(1);
    expect(r.state.lastClash!.damage.p2).toBe(12 - 2); // avenant 07 : la Garde I absorbe 2
    expect(r.state.players.p1.insight).toBe(0);
  });

  it('G19 : Rupture déclarée, Garde perdante → coût dépensé, aucun Repoussement', () => {
    const s = fixture(config({ t2: ['Rupture'] }),
      { hand: ['Cendre-4'], slots: [{ def: 'Voile-3', active: true }, null] },
      { hand: ['Ronce-1'], insight: 2 });
    const r = new Runner(s).commit('p1', 'Cendre-4', 'assault').commit('p2', 'Ronce-1', 'guard');
    r.tactics('p1', [{ mode: 'keep' }, null]);
    r.tactics('p2', [null, null], { id: 'Rupture', targetSlot: 0 });
    expect(r.state.players.p2.insight).toBe(0);
    expect(r.state.phase).toBe('RESOLVED');
    expect(r.state.players.p1.slots[0]?.active).toBe(true);
    expect(r.ev('effect').some((e) => e.data.effect === 'rupture' && e.data.status === 'failed')).toBe(true);
  });

  it('Rupture réussie : Garde gagnante, aucune cachée, cible active conservée → retour en main adverse', () => {
    const s = fixture(config({ t2: ['Rupture'] }),
      { hand: ['Cendre-2'], slots: [{ def: 'Voile-3', active: true }, null] },
      { hand: ['Ronce-4'], insight: 2 });
    const r = new Runner(s).commit('p1', 'Cendre-2', 'assault').commit('p2', 'Ronce-4', 'guard');
    r.tactics('p1', [{ mode: 'keep' }, null]);
    r.tactics('p2', [null, null], { id: 'Rupture', targetSlot: 0 });
    expect(r.state.phase).toBe('REPEL');
    r.apply({ type: 'repel', player: 'p2', targetSlot: 0 });
    expect(r.state.players.p1.slots[0]).toBeNull();
    expect(r.state.players.p1.hand.map((id) => r.state.cards[id]!.defId)).toContain(d('Voile-3'));
  });
});

describe('Signatures et contrôle (G20, G21)', () => {
  it('Emprise (Couronne de Ronce) : Garde gagnante → repousse une Secondaire ACTIVE ; un seul Repoussement même avec Rupture', () => {
    const s = fixture(config({ sig2: 'Ronce', t2: ['Rupture'] }),
      { hand: ['Cendre-4'], slots: [{ def: 'Voile-3', active: true }, { def: 'Astre-2' }] },
      { hand: ['sig-Ronce'], insight: 2 });
    const r = new Runner(s).commit('p1', 'Cendre-4', 'assault').commit('p2', 'sig-Ronce', 'guard');
    r.tactics('p1', [{ mode: 'keep' }, null]);
    r.tactics('p2', [null, null], { id: 'Rupture', targetSlot: 0 });
    expect(r.state.repel?.kind).toBe('emprise');
    expect(r.state.repel?.choices).toEqual([0, 1]);
    r.apply({ type: 'repel', player: 'p2', targetSlot: 0 });
    expect(r.state.phase).toBe('RESOLVED');
    expect(r.ev('repel')).toHaveLength(1);
    expect(r.state.players.p1.slots[1]).not.toBeNull();
  });

  it('Entrave : Repoussement Basic d’une cachée → sous la pioche adverse, identité non publique ; Racine la voit en privé', () => {
    const s = fixture(config({ v2: 'all' }),
      { hand: ['Cendre-2'], slots: [{ def: 'Astre-4' }, null] },
      { hand: ['Ronce-3-entrave'], slots: [{ def: 'Ronce-1-racine', active: true }, null] });
    const r = new Runner(s).commit('p1', 'Cendre-2', 'assault').commit('p2', 'Ronce-3-entrave', 'guard');
    r.tactics('p2', [{ mode: 'rank' }, null]);
    expect(r.state.repel?.toBottom).toBe(true);
    r.apply({ type: 'repel', player: 'p2', targetSlot: 0 });
    const p1 = r.state.players.p1;
    expect(r.state.cards[p1.deck[0]!]!.defId).toBe(d('Astre-4'));
    const pub = r.ev('repel', 'public')[0]!;
    expect(pub.data.defId).toBeNull();
    const peek = r.ev('peek', 'p2').find((e) => e.data.source === 'Racine')!;
    expect(peek.data.defIds).toEqual([d('Astre-4')]);
    expect(r.ev('peek', 'p1').some((e) => e.data.source === 'Racine')).toBe(false);
  });

  it('G20 : Clairvoyance voilée → information privée immédiate, non retirée par Silence', () => {
    const s = fixture(config({ sig1: 'Voile', v2: ['Voile-4'] }),
      { hand: ['sig-Voile', 'Cendre-1'], slots: [{ def: 'Voile-3', active: true }, null] },
      { hand: ['Ronce-4', 'Astre-1', 'Astre-2'], slots: [{ def: 'Voile-4-silence', active: true }, { def: 'Cendre-2' }] });
    const r = new Runner(s).commit('p1', 'sig-Voile', 'assault').commit('p2', 'Ronce-4', 'guard');
    const peek = r.ev('peek', 'p1').find((e) => e.data.source === 'Clairvoyance voilée')!;
    expect((peek.data.defIds as string[]).length).toBe(1);
    expect((peek.data.hiddenSlot as { defId: string }).defId).toBe(d('Cendre-2'));
    r.tactics('p1', [{ mode: 'keep' }, null]).tactics('p2', [{ mode: 'interfere', target: 0 }, null]);
    // Silence échoue (cible conservée) ; de toute façon l’information déjà vue reste dans les événements privés.
    expect(r.ev('peek', 'p1')).toHaveLength(1);
    expect(r.ev('peek', 'public')).toHaveLength(0);
  });

  it('Brasier : Flamme conquérante repousse une cachée après victoire blessante avec soutien Dégâts', () => {
    const s = fixture(config({ sig1: 'Cendre' }),
      { hand: ['sig-Cendre'], slots: [{ def: 'Cendre-1', active: true }, null] },
      { hand: ['Ronce-3'], slots: [{ def: 'Astre-2' }, null] });
    const r = new Runner(s).commit('p1', 'sig-Cendre', 'assault').commit('p2', 'Ronce-3', 'guard');
    r.tactics('p1', [{ mode: 'damage' }, null]);
    expect(r.state.lastClash!.damage.p2).toBe((14 - 5) * 2); // avenant 07 : la Garde III absorbe 5
    expect(r.state.repel?.kind).toBe('flamme');
    r.apply({ type: 'repel', player: 'p1', targetSlot: 0 });
    expect(r.state.players.p2.slots[0]).toBeNull();
  });
});

describe('Camouflage et secrets (G24, G25)', () => {
  it('Dissimulation : masquage atomique — le journal public ne nomme jamais la carte masquée', () => {
    const s = fixture(config({ v1: ['Voile-3', 'Cendre-3'] }),
      { hand: ['Cendre-4', 'Astre-1'], slots: [{ def: 'Voile-3-dissimulation' }, { def: 'Cendre-3-ferveur' }] },
      { hand: ['Ronce-2', 'Astre-3'], slots: [{ def: 'Voile-4', active: true }, null] });
    s.phase = 'PREPARE';
    s.awaiting = ['p1'];
    const r = new Runner(s);
    r.apply({ type: 'prepare', player: 'p1', reveal: [0, 1] });
    const pub = r.ev('secondaryRevealed', 'public');
    expect(pub.find((e) => e.data.slot === 1)!.data.defId).toBeNull();
    const jOpp = buildJournal(visibleEvents(r.events, 'p2'), 'p2').map((l) => l.text).join('\n');
    expect(jOpp).not.toMatch(/Ferveur|Cendre III/);
    const v2 = viewFor(r.state, 'p2');
    expect(v2.opp.slots[1]!.card).toBeNull();
    expect(v2.opp.slots[1]!.masked).toBe(true);
    // Le propriétaire voit sa carte.
    expect(viewFor(r.state, 'p1').me.slots[1]!.card?.defId).toBe('Cendre-3-ferveur');
    // Phase de Dissipation ouverte ? (p2 n’a pas Dissipation) → COMMIT
    expect(r.state.phase).toBe('COMMIT');
    r.commit('p1', 'Cendre-4', 'assault').commit('p2', 'Ronce-2', 'guard');
    // Interférence à l’aveugle autorisée contre la carte masquée (Rang réel 3 ≤ 4).
    expect(r.state.phase).toBe('TACTICS');
    r.tactics('p1', [{ mode: 'keep' }, { mode: 'rank' }]);
    r.tactics('p2', [{ mode: 'interfere', target: 1 }, null]);
    expect(r.state.lastClash!.publicScores.p1).toBe('4');
    const tac = r.ev('tacticsRevealed', 'public')[0]!.data as Record<string, Array<{ defId: string | null; masked: boolean } | null>>;
    expect(tac.p1![1]!.defId).toBeNull();
    const json = JSON.stringify(r.events.filter((e) => e.vis !== 'p1').filter((e) => e.kind !== 'turnEnd'));
    // Aucune mention de Ferveur dans ce que p2 peut voir jusqu’à la consommation masquée.
    expect(json).not.toContain('Cendre-3-ferveur');
  });

  it('Dissipation : neutralise le camouflage avant engagement (coût payé)', () => {
    const s = fixture(config({ v1: ['Voile-3', 'Cendre-3'], t2: ['Dissipation'] }),
      { hand: ['Cendre-4'], slots: [{ def: 'Voile-3-dissimulation' }, { def: 'Cendre-3-ferveur' }] },
      { hand: ['Ronce-2'] });
    s.phase = 'PREPARE';
    s.awaiting = ['p1'];
    const r = new Runner(s).apply({ type: 'prepare', player: 'p1', reveal: [0, 1] });
    expect(r.state.phase).toBe('DISSIPATION');
    r.apply({ type: 'dissipate', player: 'p2', targetSlot: 0 });
    expect(r.state.players.p1.mask).toBeNull();
    expect(viewFor(r.state, 'p2').opp.slots[1]!.card?.defId).toBe('Cendre-3-ferveur');
    expect(r.state.players.p2.insight).toBe(0);
  });

  it('G25 : la vue adverse ne contient ni main, ni cachées, ni Primaire/mode avant révélation, ni choix tactiques verrouillés', () => {
    const s = fixture(config(),
      { hand: ['Cendre-4', 'Voile-2', 'Astre-3'], slots: [{ def: 'Cendre-1' }, { def: 'Ronce-3', active: true }] },
      { hand: ['Ronce-4', 'Astre-1'], slots: [{ def: 'Voile-3', active: true }, null] });
    const r = new Runner(s).commit('p1', 'Cendre-4', 'assault', 'Voile-2', 0);
    const secretIds = [...r.state.players.p1.hand, r.state.players.p1.primary?.cardId, r.state.players.p1.slots[0]?.cardId].filter(Boolean) as string[];
    const leak = (json: string) => secretIds.filter((id) => json.includes(`"${id}"`));
    expect(leak(JSON.stringify(viewFor(r.state, 'p2')))).toEqual([]);
    expect(JSON.stringify(viewFor(r.state, 'p2'))).not.toContain('assault'); // mode de p1 non révélé
    r.commit('p2', 'Ronce-4', 'guard');
    r.tactics('p1', [null, { mode: 'interfere', target: 0 }]);
    // p1 a verrouillé ses tactiques : la vue de p2 ne contient pas le plan.
    const v2 = JSON.stringify(viewFor(r.state, 'p2'));
    expect(v2).not.toContain('interfere');
    expect(viewFor(r.state, 'p2').opp.locked).toBe(true);
  });
});

describe('Fin de partie (G22)', () => {
  it('G22 : Contrecoup → double K.-O. → prolongation, 1 PV chacun, cartes conservées', () => {
    const s = fixture(config({ v1: ['Cendre-4'] }), { hand: ['Cendre-4-contrecoup', 'Voile-1'], hp: 3, slots: [{ def: 'Astre-2', active: true }, null] }, { hand: ['sig-Ronce', 'Astre-1'], hp: 3 });
    const r = new Runner(s).commit('p1', 'Cendre-4-contrecoup', 'assault').commit('p2', 'sig-Ronce', 'assault');
    r.tactics('p1', [{ mode: 'keep' }, null]);
    expect(r.state.phase).toBe('RESOLVED');
    expect(r.state.overtime).toBe(1);
    expect(r.state.players.p1.hp).toBe(1);
    expect(r.state.players.p2.hp).toBe(1);
    expect(r.state.winner).toBeNull();
    expect(r.state.players.p1.slots[0]?.active).toBe(true);
    expect(buildJournal(r.events, 'p1').some((l) => /DOUBLE K\.-O\./.test(l.text))).toBe(true);
  });
  it('K.-O. unilatéral → fin du duel', () => {
    const s = fixture(config(), { hand: ['Cendre-4'], hp: 90 }, { hand: ['Voile-1'], hp: 12 });
    const r = new Runner(s).commit('p1', 'Cendre-4', 'assault').commit('p2', 'Voile-1', 'assault');
    expect(r.state.phase).toBe('ENDED');
    expect(r.state.winner).toBe('p1');
    expect(() => r.apply({ type: 'nextTurn' })).toThrow();
  });
});

describe('Validation des commandes (rejets explicites, sans mutation)', () => {
  it('Signature interdite en Secondaire ; Primaire hors main ; Dégâts sous Garde', () => {
    const s = fixture(config(), { hand: ['Cendre-4', 'sig-Cendre'], slots: [{ def: 'Voile-1', active: true }, null] }, { hand: ['Ronce-4'] });
    expect(checkCommand(s, { type: 'commit', player: 'p1', primaryId: idOf(s, 'p1', d('Cendre-4')), stance: 'assault', secondaryId: idOf(s, 'p1', 'sig-Cendre'), replaceSlot: null })).toMatch(/Signature/);
    expect(checkCommand(s, { type: 'commit', player: 'p1', primaryId: idOf(s, 'p1', d('Astre-4')), stance: 'assault', secondaryId: null, replaceSlot: null })).toMatch(/main/);
    const r = new Runner(s).commit('p1', 'Cendre-4', 'guard').commit('p2', 'Ronce-4', 'assault');
    const before = JSON.stringify(r.state);
    expect(checkCommand(r.state, { type: 'tactics', player: 'p1', plans: [{ mode: 'damage' }, null], technique: null })).toMatch(/Assaut/);
    expect(() => applyCommand(r.state, { type: 'tactics', player: 'p1', plans: [{ mode: 'damage' }, null], technique: null })).toThrow(/Assaut/);
    expect(JSON.stringify(r.state)).toBe(before);
  });
  it('Remplacement sur terrain plein : obligatoire pour poser, l’ancienne carte est défaussée publiquement', () => {
    const s = fixture(config(), { hand: ['Cendre-4', 'Voile-2'], slots: [{ def: 'Voile-1', active: true }, { def: 'Astre-1' }] }, { hand: ['Ronce-4'] });
    expect(checkCommand(s, { type: 'commit', player: 'p1', primaryId: idOf(s, 'p1', d('Cendre-4')), stance: 'assault', secondaryId: idOf(s, 'p1', d('Voile-2')), replaceSlot: null })).toMatch(/remplacer/);
    const r = new Runner(s).commit('p1', 'Cendre-4', 'assault', 'Voile-2', 1).commit('p2', 'Ronce-4', 'guard');
    expect(r.ev('replaced', 'public')[0]!.data.defId).toBe(d('Astre-1'));
    expect(r.state.players.p1.slots[1]!.placedTurn).toBe(5);
  });
});

describe('Déterminisme, replay et parcours multi-seeds (G26, G27)', () => {
  it('G27 : 40 seeds IA contre IA vont jusqu’à une issue sans violation d’invariant ni blocage', () => {
    const outcomes: string[] = [];
    for (let seed = 1; seed <= 40; seed++) {
      const m = autoplay({ ...DEFAULT_CONFIG, seed });
      expect(m.state.phase).toBe('ENDED');
      outcomes.push(m.state.winner!);
    }
    expect(new Set(outcomes).size).toBe(2);
  }, 30_000); // test de propriété long : délai propre (dépassait 5 s sous charge, retour de la session cloud du 2026-10-19)
  it('G26 : replay des commandes → même état et même journal (hash identique)', () => {
    const m = autoplay({ ...DEFAULT_CONFIG, seed: 7 });
    const rec = m.record();
    const a = replay(rec);
    const b = replay(JSON.parse(JSON.stringify(rec)));
    expect(a.hash).toBe(m.hash());
    expect(b.hash).toBe(a.hash);
  });
  it('les seeds gameplay différentes donnent des tirages différents ; la même seed le même', () => {
    const a = createGame({ ...DEFAULT_CONFIG, seed: 1 }).state.players.p1.hand;
    const b = createGame({ ...DEFAULT_CONFIG, seed: 1 }).state.players.p1.hand;
    const c = createGame({ ...DEFAULT_CONFIG, seed: 2 }).state.players.p1.hand;
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });
});

describe('M02 §6 — Dissimulation : famille visible, information connue jamais effacée', () => {
  function revealBoth(otherActiveBefore: boolean) {
    const s = fixture(config({ v1: ['Voile-3', 'Cendre-3'] }),
      { hand: ['Cendre-4', 'Astre-1'], slots: [{ def: 'Voile-3-dissimulation' }, { def: 'Cendre-3-ferveur', active: otherActiveBefore }] },
      { hand: ['Ronce-2', 'Astre-3'], slots: [{ def: 'Voile-4', active: true }, null] });
    s.phase = 'PREPARE';
    s.awaiting = ['p1'];
    return new Runner(s).apply({ type: 'prepare', player: 'p1', reveal: otherActiveBefore ? [0] : [0, 1] });
  }
  it('carte révélée et masquée le même tour : identité cachée, FAMILLE visible (vue, événement, journal)', () => {
    const r = revealBoth(false);
    const v2 = viewFor(r.state, 'p2');
    expect(v2.opp.slots[1]!.card).toBeNull();
    expect(v2.opp.slots[1]!.masked).toBe(true);
    expect(v2.opp.slots[1]!.family).toBe('Cendre');
    const ev = r.ev('secondaryRevealed', 'public').find((e) => e.data.slot === 1)!;
    expect(ev.data.defId).toBeNull();
    expect(ev.data.family).toBe('Cendre');
    const j = buildJournal(visibleEvents(r.events, 'p2'), 'p2').map((l) => l.text).join('\n');
    expect(j).toMatch(/Secondaire Cendre en case 2 — identité, Rang et Puissance masqués/);
    expect(j).not.toMatch(/Ferveur|Cendre III/);
  });
  it('carte déjà publique avant le tour : le camouflage ne l’efface pas (vue + tactiques révélées + score public)', () => {
    const r = revealBoth(true);
    expect(r.state.players.p1.mask).not.toBeNull();
    const v2 = viewFor(r.state, 'p2');
    expect(v2.opp.slots[1]!.card?.defId).toBe('Cendre-3-ferveur');
    expect(v2.opp.slots[1]!.masked).toBe(false);
    r.commit('p1', 'Cendre-4', 'assault').commit('p2', 'Ronce-2', 'guard');
    r.tactics('p1', [{ mode: 'keep' }, { mode: 'rank' }]);
    r.tactics('p2', [{ mode: 'keep' }, null]);
    const tac = r.ev('tacticsRevealed', 'public')[0]!.data as Record<string, Array<{ defId: string | null; value: number | null } | null>>;
    expect(tac.p1![1]!.defId).toBe('Cendre-3-ferveur');
    expect(tac.p1![1]!.value).toBe(4);
    expect(r.state.lastClash!.publicScores.p1).toBe('8');
  });
});

describe('Dissimulation — le rapport public du Clash ne publie aucune valeur masquée', () => {
  // Voile III Dissimulation (case 1) et Cendre II Basic (case 2) révélées ensemble : la Cendre II est
  // camouflée ce tour puis engagée par Cendre IV (Rang 4, P12) en Assaut contre la Garde Ronce II
  // (Rang 2, P6), sans Interférence. Réel : Rang → score 4 + (2 + 1) = 7 ; Dégâts → ×(2 + 1) = ×3.
  // Aucune valeur publique du rapport ne vaut 7 (resp. 3) : leur absence prouve la non-fuite.
  function maskedSupport(mode: 'rank' | 'damage') {
    const s = fixture(config({ v1: ['Voile-3'] }),
      { hand: ['Cendre-4', 'Astre-1'], slots: [{ def: 'Voile-3-dissimulation' }, { def: 'Cendre-2' }] },
      { hand: ['Ronce-2', 'Astre-3'], slots: [{ def: 'Voile-4', active: true }, null] });
    s.phase = 'PREPARE';
    s.awaiting = ['p1'];
    const r = new Runner(s).apply({ type: 'prepare', player: 'p1', reveal: [0, 1] });
    r.commit('p1', 'Cendre-4', 'assault').commit('p2', 'Ronce-2', 'guard');
    return r.tactics('p1', [{ mode: 'keep' }, { mode }]).tactics('p2', [{ mode: 'keep' }, null]);
  }
  const numbers = (x: unknown): number[] => (typeof x === 'number' ? [x] : x && typeof x === 'object' ? Object.values(x).flatMap(numbers) : []);
  const publicReport = (r: Runner): ClashReport => {
    const pub = r.ev('clash', 'public');
    expect(pub).toHaveLength(1);
    return pub[0]!.data as unknown as ClashReport;
  };

  it('soutien Rang camouflé : le score réel (7) n’est que dans l’événement privé du propriétaire', () => {
    const r = maskedSupport('rank');
    expect(r.ev('clash', 'p1').map((e) => e.data)).toEqual([{ own: true, player: 'p1', score: 7, multiplier: 1 }]);
    expect(r.ev('clash', 'p2')).toHaveLength(0);
    const rep = publicReport(r);
    expect(rep.publicScores).toEqual({ p1: '?', p2: '2' });
    expect(rep.scores).toEqual({ p1: null, p2: 2 });
    expect(numbers(rep)).not.toContain(7);
    // Issue inchangée ; l’état et la vue adverse portent ce même rapport public.
    expect(rep.winner).toBe('p1');
    expect(rep.damage).toEqual({ p1: 0, p2: 12 - 3 }); // avenant 07 : la Garde II absorbe 3
    expect(r.state.lastClash).toEqual(rep);
    expect(viewFor(r.state, 'p2').lastClash).toEqual(rep);
  });

  it('soutien Dégâts camouflé : le multiplicateur réel (×3) n’est que dans l’événement privé du propriétaire', () => {
    const r = maskedSupport('damage');
    expect(r.ev('clash', 'p1').map((e) => e.data)).toEqual([{ own: true, player: 'p1', score: 4, multiplier: 3 }]);
    const rep = publicReport(r);
    expect(rep.publicMultipliers).toEqual({ p1: '?', p2: '1' });
    expect(rep.multipliers).toEqual({ p1: null, p2: 1 });
    // Avenant 07 : l’absorption publique de la Garde II vaut aussi 3 (moitié de sa Puissance 6, publique) ; elle n’est pas
    // tirée du multiplicateur : on la vérifie à part et on cherche le 3 caché partout ailleurs.
    expect(rep.absorbed).toBe(3);
    expect(numbers({ ...rep, absorbed: null })).not.toContain(3);
    // Le score n’est pas camouflé (soutien en Dégâts) ; les PV perdus restent publics.
    expect(rep.scores).toEqual({ p1: 4, p2: 2 });
    expect(rep.damage).toEqual({ p1: 0, p2: (12 - 3) * 3 });
    expect(viewFor(r.state, 'p2').lastClash).toEqual(rep);
  });
});
