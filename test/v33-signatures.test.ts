/**
 * Avenant 08 (règle V3.3, `contracts/08_AVENANT_V3_3_SIGNATURES_ANNONCEES.md`) : une Signature engagée en Primaire est
 * annoncée aux deux joueurs, face visible, dès le verrouillage de son propriétaire ; son mode reste secret jusqu'à la
 * révélation. Tests prévus en S-08.
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

const pub = (evs: GameEvent[]) => evs.filter((e) => e.vis === 'public');
const annonces = (evs: GameEvent[]) => evs.filter((e) => e.kind === 'signatureAnnounced');

describe('Avenant 08 — annonce au verrouillage (S-08, 1 à 4)', () => {
  it('1 : Signature verrouillée en premier → annoncée tout de suite, mode et Secondaire secrets, l’adversaire reste libre', () => {
    const s = fixture(config(), { hand: ['sig-Cendre', 'Voile-1', 'Astre-2', 'Cendre-2'] }, { hand: ['Ronce-4', 'Ronce-1', 'Astre-1', 'Voile-2'] });
    const r = new Runner(s);
    r.commit('p1', 'sig-Cendre', 'assault', 'Voile-1');
    const batch = r.events;
    expect(batch.map((e) => `${e.vis}:${e.kind}`)).toEqual(['public:locked', 'public:signatureAnnounced']);
    expect(batch[1]!.data).toEqual({ player: 'p1', defId: 'sig-Cendre' });
    const v2 = viewFor(r.state, 'p2');
    expect(v2.reveal.signatures).toEqual({ me: null, opp: 'sig-Cendre' });
    expect(v2.opp.primary).toBeNull(); // l’engagement ne s’applique qu’au verrouillage des deux
    expect(v2.awaitingMe).toBe(true);
    // le mode (assault) et la Secondaire (Voile I) n’apparaissent nulle part chez p2
    const chezP2 = JSON.stringify([v2, visibleEvents(r.events, 'p2')]);
    expect(chezP2).not.toMatch(/assault|Voile-1/);
    // libre de son choix : n’importe quelle carte, n’importe quel mode
    for (const c of ['Ronce-4', 'Ronce-1', 'Astre-1']) for (const st of ['assault', 'guard'] as const) {
      expect(checkCommand(r.state, { type: 'commit', player: 'p2', primaryId: idOf(r.state, 'p2', d(c)), stance: st, secondaryId: null, replaceSlot: null })).toBeNull();
    }
  });
  it('2 : Signature verrouillée en second → annoncée à son verrouillage ; révision du premier (amendement 1), qui garde ici', () => {
    const s = fixture(config(), { hand: ['sig-Cendre', 'Voile-1'] }, { hand: ['Ronce-4', 'Astre-1'] });
    const r = new Runner(s).commit('p2', 'Ronce-4', 'guard');
    expect(annonces(r.events)).toHaveLength(0);
    const before = r.events.length;
    r.commit('p1', 'sig-Cendre', 'assault');
    expect(r.events.slice(before).map((e) => e.kind)).toEqual(['locked', 'signatureAnnounced', 'revisionOpened']);
    expect(r.state.phase).toBe('REVISION');
    expect(r.state.awaiting).toEqual(['p2']);
    expect(checkCommand(r.state, { type: 'commit', player: 'p2', primaryId: idOf(r.state, 'p2', d('Astre-1')), stance: 'assault', secondaryId: null, replaceSlot: null })).not.toBeNull();
    r.apply({ type: 'revise', player: 'p2', commit: null });
    const kinds = r.events.slice(before).map((e) => e.kind);
    expect(kinds.indexOf('revised')).toBeLessThan(kinds.indexOf('committed'));
    // Clash inchangé : Brasier (∞, P14) domine la Garde IV, qui absorbe 6 (avenant 07)
    expect(r.state.lastClash!.damage.p2).toBe(8);
  });
  it('3 : deux Signatures le même tour → deux annonces, chacune à son verrouillage ; ∞ contre ∞ inchangé', () => {
    const s = fixture(config(), { hand: ['sig-Cendre', 'Voile-1'] }, { hand: ['sig-Ronce', 'Astre-1'] });
    const r = new Runner(s).commit('p2', 'sig-Ronce', 'guard');
    expect(annonces(r.events).map((e) => e.data.player)).toEqual(['p2']);
    r.commit('p1', 'sig-Cendre', 'assault');
    expect(annonces(r.events).map((e) => e.data.player)).toEqual(['p2', 'p1']);
    r.apply({ type: 'revise', player: 'p2', commit: null }); // amendement 1 : p2 garde sa Signature
    expect(r.state.lastClash!.guardWin).toBe(true);
    expect(r.state.lastClash!.damage).toEqual({ p1: 0, p2: 0 });
  });
  it('4 : Primaire ordinaire → aucune annonce, rien de la Primaire avant la révélation', () => {
    const s = fixture(config(), { hand: ['Cendre-4', 'Voile-1'] }, { hand: ['Ronce-4', 'Astre-1'] });
    const r = new Runner(s).commit('p1', 'Cendre-4', 'assault');
    expect(annonces(r.events)).toHaveLength(0);
    const v2 = viewFor(r.state, 'p2');
    expect(v2.reveal.signatures.opp).toBeNull();
    expect(JSON.stringify([v2, visibleEvents(r.events, 'p2')])).not.toMatch(/Cendre-4|assault/);
  });
  it('l’annonce dure jusqu’au tour suivant, puis s’efface', () => {
    const s = fixture(config(), { hand: ['sig-Cendre', 'Voile-1'] }, { hand: ['Ronce-4', 'Astre-1'] });
    const r = new Runner(s).commit('p1', 'sig-Cendre', 'assault').commit('p2', 'Ronce-4', 'guard');
    expect(r.state.reveal.signatures).toEqual({ p1: d('sig-Cendre'), p2: null });
    expect(viewFor(r.state, 'p2').reveal.signatures.opp).not.toBeNull();
    r.apply({ type: 'nextTurn' });
    expect(r.state.reveal.signatures).toEqual({ p1: null, p2: null });
  });
});

describe('Avenant 08 — secrets, IA, Lecture (S-08, 5 à 8)', () => {
  it('5 : aucune fuite du mode, des Secondaires ni de la main avant la révélation (événements publics, vues)', () => {
    const s = fixture(config(), { hand: ['sig-Cendre', 'Voile-3', 'Astre-2'], slots: [{ def: 'Cendre-1', active: true }, { def: 'Ronce-2' }] }, { hand: ['Ronce-4', 'Astre-1'] });
    const r = new Runner(s).commit('p1', 'sig-Cendre', 'guard', 'Voile-3', 1);
    const secrets = /guard|Voile-3|Astre-2|Ronce-2/;
    expect(JSON.stringify(pub(r.events))).not.toMatch(secrets);
    expect(JSON.stringify(viewFor(r.state, 'p2'))).not.toMatch(secrets);
    r.commit('p2', 'Ronce-4', 'assault');
    // après l’application commune, avant la révélation : le remplacement est public (comme avant), pas le reste
    const avantRevelation = pub(r.events).filter((e) => e.kind !== 'primariesRevealed' && e.seq < (r.events.find((x) => x.kind === 'primariesRevealed')?.seq ?? Infinity));
    expect(JSON.stringify(avantRevelation)).not.toMatch(/"guard"|Voile-3|Astre-2/);
  });
  it('6 : un engagement verrouillé, Signature comprise, ne se modifie plus', () => {
    const s = fixture(config(), { hand: ['sig-Cendre', 'Voile-1'] }, { hand: ['Ronce-4', 'Astre-1'] });
    const r = new Runner(s).commit('p1', 'sig-Cendre', 'assault');
    expect(checkCommand(r.state, { type: 'commit', player: 'p1', primaryId: idOf(r.state, 'p1', d('Voile-1')), stance: 'guard', secondaryId: null, replaceSlot: null })).toMatch(/verrouill|attendue/i);
  });
  it('7 : l’IA n’utilise que la projection publique : même décision quel que soit le mode secret ; elle tient compte de l’annonce', () => {
    const decisionFor = (stance: 'assault' | 'guard') => {
      const s = fixture(config(), { hand: ['sig-Cendre', 'Cendre-2', 'Voile-1', 'Astre-2'] }, { hand: ['Ronce-4', 'Ronce-1', 'Astre-1', 'Voile-2'] });
      const r = new Runner(s).commit('p1', 'sig-Cendre', stance);
      return { r, v: viewFor(r.state, 'p2') };
    };
    const a = decisionFor('assault'); const g = decisionFor('guard');
    expect(a.v).toEqual(g.v); // la vue de l’IA ne contient pas le mode
    const ca = decide(a.v, PROFILES.equilibre!, 1); const cg = decide(g.v, PROFILES.equilibre!, 1);
    expect(ca).toEqual(cg);
    // sans l’annonce (même vue, annonce retirée), l’IA engagerait sa meilleure carte en Assaut ; avec, elle la garde
    const sans = structuredClone(a.v); sans.reveal.signatures.opp = null;
    const cs = decide(sans, PROFILES.equilibre!, 1)!;
    const def = (c: typeof ca) => (c && 'primaryId' in c ? `${a.r.state.cards[c.primaryId]!.defId}/${c.stance}` : '?');
    expect(def(cs)).toBe('Ronce-4-basic/assault');
    expect(def(ca)).not.toBe('Ronce-4-basic/assault');
  });
  it('8 : la Lecture reste le seul moyen de voir le mode d’une Signature annoncée', () => {
    const s = fixture(config({ t2: ['Lecture'] }), { hand: ['sig-Cendre', 'Voile-1'] }, { hand: ['Ronce-4', 'Astre-1'], insight: 2 });
    const r = new Runner(s).commit('p1', 'sig-Cendre', 'guard').commit('p2', 'Ronce-4', 'assault');
    expect(r.state.phase).toBe('LECTURE');
    expect(viewFor(r.state, 'p2').lectureSeen).toBeNull();
    r.apply({ type: 'lecture', player: 'p2', use: true });
    expect(viewFor(r.state, 'p2').lectureSeen).toBe('guard');
  });
});

describe('Avenant 08 — résolution, replay, reprise, journal (S-08, 9 à 11)', () => {
  it('9 et 10 : replay déterministe avec annonces ; reprise d’un duel sauvegardé pendant l’engagement ; étiquette', () => {
    expect(RULES).toBe('V3.0+delta-V3.3.2');
    const m = autoplay({ ...DEFAULT_CONFIG, seed: 808 }, 200, undefined, ['p2', 'p1']);
    expect(annonces(m.events).length).toBeGreaterThan(0);
    expect(replay(m.record()).hash).toBe(m.hash());
    // sauvegarde au milieu d’un engagement, juste après l’annonce d’une Signature (commande verrouillée en attente)
    const s = fixture(config(), { hand: ['sig-Cendre', 'Voile-1'] }, { hand: ['Ronce-4', 'Astre-1'] });
    const r = new Runner(s).commit('p1', 'sig-Cendre', 'assault');
    expect(r.state.pending.p1).toBeTruthy();
    expect(r.state.reveal.signatures.p1).toBe(d('sig-Cendre'));
    const rec = m.record();
    const active = { id: 'x', encounterId: 'libre-braise', seed: 808, startedAt: '2026-10-24T00:00:00.000Z', rules: RULES, catalog: rec.catalog, config: m.config, commands: m.commands, hash: m.hash(), turn: m.state.turn };
    expect(verifyActiveCore(active)).toEqual({ ok: true });
    expect(verifyActiveCore({ ...active, rules: 'V3.0+delta-V3.3.1' })).toEqual({ ok: false, reason: 'Règles différentes (V3.0+delta-V3.3.1).' });
  });
  it('9 bis : mi-engagement rejoué → même annonce retrouvée', () => {
    const m = autoplay({ ...DEFAULT_CONFIG, seed: 808 }, 200, undefined, ['p2', 'p1']);
    const i = m.commands.findIndex((c) => c.type === 'commit' && m.state.cards[c.primaryId]!.defId.startsWith('sig-'));
    expect(i).toBeGreaterThanOrEqual(0);
    const partiel = replay({ ...m.record(), commands: m.commands.slice(0, i + 1) });
    const c = m.commands[i]! as { player: 'p1' | 'p2' };
    expect(partiel.state.reveal.signatures[c.player]).toMatch(/^sig-/);
    expect(annonces(partiel.events).length).toBeGreaterThan(0);
  });
  it('11 : journal public et privé', () => {
    const s = fixture(config(), { hand: ['sig-Cendre', 'Voile-1'] }, { hand: ['Ronce-4', 'Astre-1'] });
    const r = new Runner(s).commit('p1', 'sig-Cendre', 'assault').commit('p2', 'Ronce-4', 'guard');
    const j2 = buildJournal(visibleEvents(r.events, 'p2'), 'p2').map((l) => l.text).join('\n');
    expect(j2).toMatch(/SIGNATURE ANNONCÉE — le rival engage Brasier Originel \(∞, Puissance 14\) ; son mode reste secret\./);
    expect(j2).toMatch(/Le rival engage sa Signature annoncée \(mode secret\)\./);
    const j1 = buildJournal(visibleEvents(r.events, 'p1'), 'p1').map((l) => l.text).join('\n');
    expect(j1).toMatch(/Vous engagez votre Signature : Brasier Originel \(∞, Puissance 14\) ; le rival la voit, pas votre mode\./);
  });
});
