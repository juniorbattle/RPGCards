/**
 * M04 — enveloppe produit : flux d’écrans, deck légal, sauvegarde versionnée, résumé public.
 * Modules purs (aucun DOM) : `src/product/*`.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FAMILIES, cardDef } from '../src/game/catalog/cards';
import { TECHNIQUE_IDS, type TechniqueId } from '../src/game/catalog/techniques';
import { createGame } from '../src/game/engine/engine';
import { autoplay } from '../src/game/match';
import { viewFor } from '../src/game/visibility/view';
import { FULL_COLLECTION, STARTER_COLLECTION, STARTER_DECK } from '../src/product/collection';
import { ALL_VARIANTS, IDENTITIES, deckDefs, equippedFor, setVersion, toggleTechnique, validateDeck, type DeckChoice } from '../src/product/deck';
import { ENCOUNTERS, RIVALS, encounterConfig } from '../src/product/encounters';
import { INITIAL_FLOW, transition, type FlowContext, type FlowState } from '../src/product/flow';
import { BACKUP_KEY, CORRUPT_KEY, SAVE_KEY, SaveStore, duelSeed, newSave, parseSave, validateSave, type StorageLike } from '../src/product/save';
import { record, summarize } from '../src/product/stats';
import { GAME_VERSION } from '../src/product/version';

class MemStorage implements StorageLike {
  m = new Map<string, string>();
  failWrites = false;
  getItem(k: string) { return this.m.get(k) ?? null; }
  setItem(k: string, v: string) { if (this.failWrites) { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; } this.m.set(k, v); }
  removeItem(k: string) { this.m.delete(k); }
}

const NOW = new Date('2026-10-17T10:00:00Z');
const ctx = (o: Partial<FlowContext> = {}): FlowContext => ({ hasSave: true, deckLegal: true, activeDuel: null, playable: ENCOUNTERS.map((e) => e.id), ...o });
const go = (s: FlowState, e: Parameters<typeof transition>[1], c = ctx()) => {
  const r = transition(s, e, c);
  if (!r.ok) throw new Error(r.reason);
  return r.state;
};

describe('M04 — flux produit (machine d’états distincte du duel)', () => {
  it('parcours nominal : accueil → rencontres → préparation → duel → résultat → rencontres', () => {
    let s = go(INITIAL_FLOW, { type: 'board' });
    s = go(s, { type: 'prep', encounterId: 'libre-braise' });
    expect(s).toMatchObject({ screen: 'prep', encounterId: 'libre-braise' });
    s = go(s, { type: 'startDuel' });
    expect(s.screen).toBe('duel');
    s = go(s, { type: 'duelEnded' });
    expect(s.screen).toBe('result');
    expect(go(s, { type: 'board' }).screen).toBe('board');
    expect(go(s, { type: 'prep', encounterId: 'libre-braise' }).screen).toBe('prep');
  });

  it('un deck illégal ne lance jamais de duel ; une rencontre indisponible est refusée', () => {
    const prep = go(go(INITIAL_FLOW, { type: 'board' }), { type: 'prep', encounterId: 'libre-ronce' });
    const r = transition(prep, { type: 'startDuel' }, ctx({ deckLegal: false }));
    expect(r.ok).toBe(false);
    expect(transition(INITIAL_FLOW, { type: 'prep', encounterId: 'inconnue' }, ctx()).ok).toBe(false);
    expect(transition(INITIAL_FLOW, { type: 'startDuel' }, ctx()).ok).toBe(false);
  });

  it('pendant un duel : seules les fenêtres superposées et la sortie confirmée sont possibles', () => {
    const duel: FlowState = { screen: 'duel', back: [], encounterId: 'libre-voile', overlay: null };
    expect(transition(duel, { type: 'open', screen: 'deck' }, ctx()).ok).toBe(false);
    expect(transition(duel, { type: 'home' }, ctx()).ok).toBe(false);
    expect(go(duel, { type: 'overlay', overlay: 'menu' }).overlay).toBe('menu');
    expect(go(duel, { type: 'leaveDuel' }).screen).toBe('board');
  });

  it('écrans consultatifs : pile de retour sans empilement infini', () => {
    let s = go(INITIAL_FLOW, { type: 'open', screen: 'deck' });
    s = go(s, { type: 'open', screen: 'collection' });
    s = go(s, { type: 'open', screen: 'deck' });
    expect(s).toMatchObject({ screen: 'deck', back: ['home'] });
    expect(go(s, { type: 'back' }).screen).toBe('home');
    expect(go(go(INITIAL_FLOW, { type: 'board' }), { type: 'back' }).screen).toBe('home');
  });

  it('Continuer : reprend le duel en cours, sinon le tableau ; refusé sans sauvegarde', () => {
    expect(go(INITIAL_FLOW, { type: 'continue' }).screen).toBe('board');
    expect(go(INITIAL_FLOW, { type: 'continue' }, ctx({ activeDuel: 'libre-ronce' }))).toMatchObject({ screen: 'duel', encounterId: 'libre-ronce' });
    expect(transition(INITIAL_FLOW, { type: 'continue' }, ctx({ hasSave: false })).ok).toBe(false);
    expect(transition(INITIAL_FLOW, { type: 'prep', encounterId: 'libre-ronce' }, ctx({ activeDuel: 'libre-braise' })).ok).toBe(false);
  });
});

describe('M04 — deck légal à partir du catalogue canonique', () => {
  it('le deck de départ est légal avec la collection de départ : 17 cartes, 16 identités + 1 Signature', () => {
    expect(validateDeck(STARTER_DECK, STARTER_COLLECTION)).toEqual([]);
    const defs = deckDefs(STARTER_DECK);
    expect(defs).toHaveLength(17);
    expect(new Set(defs.map((x) => cardDef(x).identity)).size).toBe(17);
    expect(defs.filter((x) => cardDef(x).signature)).toEqual(['sig-Cendre']);
  });

  it('toutes les Signatures × toutes les paires de Techniques sont légales en collection complète', () => {
    let n = 0;
    for (const sig of FAMILIES) {
      for (let i = 0; i < TECHNIQUE_IDS.length; i++) {
        for (let j = i + 1; j < TECHNIQUE_IDS.length; j++) {
          const deck: DeckChoice = { signature: sig, variants: [...ALL_VARIANTS], techniques: [TECHNIQUE_IDS[i]!, TECHNIQUE_IDS[j]!] };
          expect(validateDeck(deck, FULL_COLLECTION)).toEqual([]);
          expect(() => createGame({ seed: n, players: { p1: { name: 'a', hp: 90, signature: sig, variants: IDENTITIES as string[], techniques: deck.techniques }, p2: { name: 'b', hp: 90, signature: 'Ronce', variants: 'none', techniques: [] } } })).not.toThrow();
          n++;
        }
      }
    }
    expect(n).toBe(4 * 15);
    expect(ALL_VARIANTS).toHaveLength(16);
  });

  it('refuse : variante non possédée, deux versions d’une identité, variante inconnue, Techniques invalides', () => {
    const locked = validateDeck({ ...STARTER_DECK, variants: [...STARTER_DECK.variants, 'Cendre-3-ferveur'] }, STARTER_COLLECTION);
    expect(locked.map((i) => i.code)).toContain('variant-locked');
    const dup = validateDeck({ ...STARTER_DECK, variants: ['Cendre-1-etincelle', 'Cendre-1-etincelle'] }, FULL_COLLECTION);
    expect(dup.map((i) => i.code)).toContain('variant-duplicate');
    expect(validateDeck({ ...STARTER_DECK, variants: ['Cendre-1-basic'] }, FULL_COLLECTION).map((i) => i.code)).toContain('variant-unknown');
    expect(validateDeck({ ...STARTER_DECK, variants: ['sig-Voile'] }, FULL_COLLECTION).map((i) => i.code)).toContain('variant-unknown');
    expect(validateDeck({ ...STARTER_DECK, techniques: ['Lecture'] }, STARTER_COLLECTION).map((i) => i.code)).toContain('tech-count');
    expect(validateDeck({ ...STARTER_DECK, techniques: ['Lecture', 'Lecture'] }, STARTER_COLLECTION).map((i) => i.code)).toContain('tech-duplicate');
    expect(validateDeck({ ...STARTER_DECK, techniques: ['Lecture', 'Rupture'] }, STARTER_COLLECTION).map((i) => i.code)).toContain('tech-locked');
    expect(validateDeck({ ...STARTER_DECK, techniques: ['Lecture', 'Bluff' as TechniqueId] }, FULL_COLLECTION).map((i) => i.code)).toContain('tech-unknown');
    expect(validateDeck({ ...STARTER_DECK, signature: 'Astre' }, { ...STARTER_COLLECTION, signatures: ['Cendre'] }).map((i) => i.code)).toContain('signature');
  });

  it('bascule Basic ↔ variante : jamais deux versions d’une même identité ; Techniques plafonnées à deux', () => {
    let d = setVersion(STARTER_DECK, 'Cendre-3', 'Cendre-3-ferveur');
    d = setVersion(d, 'Cendre-3', 'Cendre-3-ferveur');
    expect(d.variants.filter((v) => v.startsWith('Cendre-3'))).toEqual(['Cendre-3-ferveur']);
    expect(equippedFor(d, 'Cendre-3')).toBe('Cendre-3-ferveur');
    d = setVersion(d, 'Cendre-3', null);
    expect(equippedFor(d, 'Cendre-3')).toBe('Cendre-3-basic');
    let t = toggleTechnique(STARTER_DECK, 'Sondage');
    expect(t.techniques).toEqual(['Ancrage', 'Sondage']);
    t = toggleTechnique(t, 'Sondage');
    expect(t.techniques).toEqual(['Ancrage']);
  });
});

describe('M04 — sauvegarde versionnée', () => {
  const fresh = () => newSave(NOW, 'Duelliste', 1234, STARTER_DECK);

  it('une sauvegarde neuve est valide ; écriture puis lecture identiques', () => {
    const st = new MemStorage();
    const store = new SaveStore(st, () => NOW);
    const s = fresh();
    expect(validateSave(s)).toEqual([]);
    expect(store.write(s)).toEqual({ ok: true });
    const r = store.load();
    expect(r.status).toBe('ok');
    if (r.status === 'ok') expect(r.save).toEqual(s);
    expect(s.gameVersion).toBe(GAME_VERSION);
  });

  it('la version précédente valide devient la copie de secours ; une illisible n’est jamais effacée sans trace', () => {
    const st = new MemStorage();
    const store = new SaveStore(st, () => NOW);
    const s = fresh();
    store.write(s);
    s.profile.name = 'Second';
    store.write(s);
    expect(JSON.parse(st.getItem(BACKUP_KEY)!).profile.name).toBe('Duelliste');
    st.setItem(SAVE_KEY, '{"schemaVersion":1, cassé');
    const r = store.load();
    expect(r).toMatchObject({ status: 'corrupt', kind: 'syntax' });
    if (r.status === 'corrupt') expect(r.backup?.profile.name).toBe('Duelliste');
    expect(st.getItem(SAVE_KEY)).toContain('cassé'); // rien n’est détruit au chargement
    const restored = store.restoreBackup();
    expect(restored?.profile.name).toBe('Duelliste');
    expect(JSON.parse(st.getItem(CORRUPT_KEY)!).text).toContain('cassé');
    expect(store.load().status).toBe('ok');
  });

  it('refus explicites : version de schéma future, champ invalide, absence de version', () => {
    const s = fresh();
    expect(parseSave(JSON.stringify({ ...s, schemaVersion: 99 }))).toMatchObject({ ok: false, kind: 'future' });
    expect(parseSave(JSON.stringify({ ...s, options: { ...s.options, pace: 'turbo' } }))).toMatchObject({ ok: false, kind: 'invalid' });
    expect(parseSave(JSON.stringify({ ...s, deck: { ...s.deck, techniques: ['Bluff'] } }))).toMatchObject({ ok: false, kind: 'invalid' });
    expect(parseSave('{"profile":{}}')).toMatchObject({ ok: false, kind: 'invalid' });
    expect(parseSave('pas du json')).toMatchObject({ ok: false, kind: 'syntax' });
  });

  it('stockage plein : l’écriture échoue proprement et l’ancienne sauvegarde reste intacte', () => {
    const st = new MemStorage();
    const store = new SaveStore(st, () => NOW);
    const s = fresh();
    store.write(s);
    const before = st.getItem(SAVE_KEY);
    st.failWrites = true;
    s.profile.name = 'Perdu';
    const w = store.write(s);
    expect(w.ok).toBe(false);
    expect(st.getItem(SAVE_KEY)).toBe(before);
    expect(new SaveStore(null).load().status).toBe('unavailable');
  });

  it('une sauvegarde incohérente n’est jamais écrite', () => {
    const st = new MemStorage();
    const store = new SaveStore(st, () => NOW);
    const bad = { ...fresh(), duelCounter: -1 };
    expect(store.write(bad).ok).toBe(false);
    expect(st.getItem(SAVE_KEY)).toBeNull();
  });

  it('seed de duel reproductible et distincte d’un duel à l’autre', () => {
    expect(duelSeed(1234, 0)).toBe(duelSeed(1234, 0));
    const seeds = new Set(Array.from({ length: 200 }, (_, i) => duelSeed(1234, i)));
    expect(seeds.size).toBe(200);
  });

  it('GAME_VERSION suit package.json', () => {
    expect(JSON.parse(readFileSync('package.json', 'utf8')).version).toBe(GAME_VERSION);
  });
});

describe('M04 — rencontres et résumé public', () => {
  it('chaque rencontre produit une configuration jouable jusqu’au K.-O. (PV propres au rival)', () => {
    for (const enc of ENCOUNTERS) {
      const cfg = encounterConfig(enc, STARTER_DECK, duelSeed(77, ENCOUNTERS.indexOf(enc)));
      expect(cfg.players.p2.hp).toBe(RIVALS[enc.rival].hp);
      expect(cfg.players.p1.hp).toBe(90);
      const m = autoplay(cfg);
      expect(m.state.phase).toBe('ENDED');
    }
  });

  it('le résumé ne lit que les événements visibles du joueur ; abandon classé à part', () => {
    const cfg = encounterConfig(ENCOUNTERS[0]!, STARTER_DECK, 4242);
    const m = autoplay(cfg);
    const view = viewFor(m.state, 'p1');
    const sum = summarize({ id: 'd1', encounterId: ENCOUNTERS[0]!.id, rival: 'braise', seed: 4242, signature: 'Cendre', view, events: m.events, abandoned: false, at: NOW });
    const dmg = (pid: string) => m.events.filter((e) => e.kind === 'damage' && e.vis === 'public' && e.data.player === pid).reduce((a, e) => a + (e.data.amount as number), 0);
    expect(sum.dealt).toBe(dmg('p2'));
    expect(sum.taken).toBe(dmg('p1'));
    expect(sum.outcome).toBe(view.winner === 'me' ? 'victory' : 'defeat');
    expect(summarize({ id: 'd2', encounterId: 'x', rival: 'braise', seed: 1, signature: 'Cendre', view, events: m.events, abandoned: true, at: NOW }).outcome).toBe('abandon');
    // Aucun champ privé dans le résumé (ni main, ni identifiant d’instance).
    expect(JSON.stringify(sum)).not.toMatch(/p2#\d|hand|pending/);
    const s = newSave(NOW, 'x', 1, STARTER_DECK);
    s.history.push(sum);
    expect(validateSave(s)).toEqual([]);
    expect(record(s.history, 'braise')).toEqual(sum.outcome === 'victory' ? { w: 1, l: 0, a: 0 } : { w: 0, l: 1, a: 0 });
  });
});
