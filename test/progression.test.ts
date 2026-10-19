/**
 * M05 — boucle RPG compacte : série, rencontres libres, déblocages de prototype, sauvegarde v2,
 * migration RÉELLE depuis une sauvegarde v1 produite par le build M04, reprise exacte d’un duel.
 */
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { cardDef } from '../src/game/catalog/cards';
import { Match, autoplay } from '../src/game/match';
import { PROFILES } from '../src/game/ai/policy';
import { CATALOG_VERSION, replay } from '../src/game/replay/replay';
import { viewFor } from '../src/game/visibility/view';
import { STARTER_COLLECTION, STARTER_DECK } from '../src/product/collection';
import { validateDeck } from '../src/product/deck';
import { ENCOUNTERS, SERIES, TOWN_DUELS, encounterById, encounterConfig, sheetOf } from '../src/product/encounters';
import { FIRST_WIN_REWARDS, applyOutcome, deriveFromHistory, encounterStatus, newProgress, playableEncounters, replaySeries } from '../src/product/progression';
import { SCHEMA_VERSION, SaveStore, newSave, parseSave, validateSave, type DuelSummary, type StorageLike } from '../src/product/save';
import { summarize } from '../src/product/stats';
import { verifyActiveCore } from '../src/product/resume';

const NOW = new Date('2026-10-17T12:00:00Z');
const sum = (encounterId: string, outcome: DuelSummary['outcome'], i = 0): DuelSummary => {
  const e = encounterById(encounterId)!;
  return { id: `d${i}`, encounterId, rival: e.rival, outcome, turns: 7, overtime: 0, dealt: 80, taken: 20, hp: { me: 70, opp: 0 }, seed: i, signature: 'Cendre', at: NOW.toISOString() };
};

class Mem implements StorageLike {
  m = new Map<string, string>();
  getItem(k: string) { return this.m.get(k) ?? null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
  removeItem(k: string) { this.m.delete(k); }
}

/** Rencontres jouables hors duels de la ville (toujours ouverts, M08 C3). */
const signatureOnly = (p: Parameters<typeof playableEncounters>[0]) => playableEncounters(p).filter((id) => !id.startsWith('ville-'));

describe('M05 — série, rencontres libres et déblocages (prototype)', () => {
  it('au départ : manche 1, duel libre contre Kaï et duels de la ville (M08 C3) ; les autres sont verrouillés avec une raison', () => {
    const p = newProgress();
    const town = TOWN_DUELS.map((id) => `ville-${id}`);
    expect(playableEncounters(p)).toEqual(['quai-1', 'libre-braise', ...town]);
    for (const e of ENCOUNTERS.filter((x) => !['quai-1', 'libre-braise', ...town].includes(x.id))) {
      const st = encounterStatus(e, p);
      expect(st.open).toBe(false);
      expect(st.reason.length).toBeGreaterThan(5);
    }
  });

  it('parcours de série : défaite (rien), victoire (manche + déblocage), suivante… série remportée, Orin débloqué', () => {
    let col = structuredClone(STARTER_COLLECTION);
    let p = newProgress();
    let r = applyOutcome(col, p, sum('quai-1', 'defeat'));
    expect(r.progress.series.step).toBe(0);
    expect(r.unlocked).toEqual([]);
    expect(r.progress.met).toEqual(['braise']);
    r = applyOutcome(r.collection, r.progress, sum('quai-1', 'victory', 1));
    expect(r.series).toEqual({ step: 1, completed: false });
    expect(r.unlocked).toEqual(FIRST_WIN_REWARDS.braise.variants);
    expect(signatureOnly(r.progress)).toEqual(['quai-2', 'libre-braise']);
    r = applyOutcome(r.collection, r.progress, sum('quai-2', 'victory', 2));
    expect(r.unlocked).toContain('Rupture');
    expect(signatureOnly(r.progress)).toEqual(['quai-3', 'libre-braise', 'libre-ronce']);
    r = applyOutcome(r.collection, r.progress, sum('quai-3', 'abandon', 3));
    expect(r.progress.series.step).toBe(2);
    expect(r.progress.met).toContain('voile');
    r = applyOutcome(r.collection, r.progress, sum('quai-3', 'victory', 4));
    expect(r.series).toEqual({ step: 3, completed: true });
    expect(r.progress.series.completed).toBe(1);
    expect(signatureOnly(r.progress)).toEqual(['libre-braise', 'libre-ronce', 'libre-voile', 'libre-astre']);
    col = r.collection;
    p = r.progress;
    expect(col.techniques).toEqual(['Sondage', 'Recentrage', 'Lecture', 'Ancrage', 'Rupture', 'Dissipation']);
    expect(col.variants).toHaveLength(4 + 9);
    // Revanche contre un rival déjà vaincu : aucun nouveau déblocage (pas de « farm » d’une monnaie).
    expect(applyOutcome(col, p, sum('libre-braise', 'victory', 5)).unlocked).toEqual([]);
    // Rejouer la série : manche 1, collection conservée.
    const again = replaySeries(p);
    expect(again.series).toEqual({ step: 0, completed: 1 });
    expect(playableEncounters(again)).toContain('quai-1');
  });

  it('les récompenses ne sont que des cartes / Techniques EXISTANTES : jamais une 18e identité ni un bonus', () => {
    for (const r of Object.values(FIRST_WIN_REWARDS)) {
      for (const v of r.variants) {
        const d = cardDef(v);
        expect(d.rarity).not.toBe('Basic');
        expect(d.power).toBe(cardDef(`${d.identity}-basic`).power);
      }
    }
    const all = new Set(Object.values(FIRST_WIN_REWARDS).flatMap((r) => r.variants));
    expect(all.size).toBe(12);
  });

  it('chaque rencontre se joue jusqu’au bout avec les mêmes règles ; Orin (Astre, profil équilibré) compris', () => {
    for (const e of ENCOUNTERS) {
      const cfg = encounterConfig(e, STARTER_DECK, 900 + ENCOUNTERS.indexOf(e));
      expect(cfg.players.p2.hp).toBe(sheetOf(e.rival).hp);
      expect(autoplay(cfg, 200, [PROFILES.equilibre!, PROFILES.equilibre!]).state.phase).toBe('ENDED');
    }
    expect(SERIES.steps).toEqual(['braise', 'ronce', 'voile']);
  });

  it('dérivation depuis l’historique = application successive (migration 1 → 2)', () => {
    const history = [sum('libre-braise', 'defeat', 1), sum('libre-braise', 'victory', 2), sum('libre-ronce', 'victory', 3)];
    const d = deriveFromHistory(history);
    expect(d.progress.defeated).toEqual(['braise', 'ronce']);
    expect(d.progress.series.step).toBe(0);
    expect(d.collection.techniques).toContain('Rupture');
    expect(validateDeck(STARTER_DECK, d.collection)).toEqual([]);
  });
});

describe('M05 — sauvegarde schéma 2 et migration', () => {
  it('une sauvegarde neuve est au schéma 2 et valide', () => {
    const s = newSave(NOW, 'x', 1, STARTER_DECK);
    expect(SCHEMA_VERSION).toBe(2);
    expect(validateSave(s)).toEqual([]);
  });

  const fixture = 'test/fixtures/save-v1-m04.json';
  it.runIf(existsSync(fixture))('migre une VRAIE sauvegarde v1 écrite par le build M04 (profil, deck, options, historique conservés)', () => {
    const text = readFileSync(fixture, 'utf8');
    const v1 = JSON.parse(text);
    expect(v1.schemaVersion).toBe(1);
    const r = parseSave(text);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.migratedFrom).toBe(1);
    expect(r.save.profile).toEqual(v1.profile);
    expect(r.save.deck).toEqual(v1.deck);
    expect(r.save.options).toEqual(v1.options);
    expect(r.save.history).toEqual(v1.history);
    expect(r.save.activeDuel).toBeNull();
    const wins = v1.history.filter((h: DuelSummary) => h.outcome === 'victory').map((h: DuelSummary) => h.rival);
    expect([...new Set(wins)].sort()).toEqual([...r.save.progress.defeated].sort());
    expect(validateDeck(r.save.deck, r.save.collection)).toEqual([]);
    // Écrite à nouveau, elle reste lisible (aller-retour au schéma 2).
    const st = new SaveStore(new Mem(), () => NOW);
    expect(st.write(r.save).ok).toBe(true);
    expect(st.load().status).toBe('ok');
  });

  it('collection ou progression incohérente refusée (carte inconnue, Signature comme variante, manche hors bornes)', () => {
    const s = newSave(NOW, 'x', 1, STARTER_DECK);
    expect(validateSave({ ...s, collection: { ...s.collection, variants: ['sig-Voile'] } })).not.toEqual([]);
    expect(validateSave({ ...s, collection: { ...s.collection, variants: ['Cendre-9-feu'] } })).not.toEqual([]);
    expect(validateSave({ ...s, progress: { ...s.progress, series: { step: 7, completed: 0 } } })).not.toEqual([]);
    expect(validateSave({ ...s, activeDuel: { id: 'x' } })).not.toEqual([]);
  });
});

describe('M05 — reprise exacte d’un duel sauvegardé', () => {
  /** Duel IA contre IA arrêté en plein milieu : la sauvegarde ne garde que config + commandes + hash. */
  function midDuel(stopAt: number) {
    const cfg = encounterConfig(encounterById('quai-2')!, STARTER_DECK, 4242);
    const m = new Match(cfg, { p1: { profile: PROFILES.prudent!, seed: 1 }, p2: { profile: PROFILES.prudent!, seed: cfg.seed ^ 0xa7 } });
    while (m.state.phase !== 'ENDED' && m.commands.length < stopAt) {
      m.stepAi();
      if (m.state.phase === 'RESOLVED') m.nextTurn();
    }
    return { cfg, m };
  }

  it('rejeu des commandes = même état, mêmes événements (publics et privés), même hash ; vue joueur identique', () => {
    for (const stop of [3, 17, 40]) {
      const { cfg, m } = midDuel(stop);
      const a = { id: 'd1', encounterId: 'quai-2', seed: cfg.seed, startedAt: NOW.toISOString(), rules: m.state.rules, catalog: CATALOG_VERSION, config: cfg, commands: structuredClone(m.commands), hash: m.hash(), turn: m.state.turn };
      expect(verifyActiveCore(a)).toEqual({ ok: true });
      const r = replay({ format: 'lqv-replay/1', rules: a.rules as never, catalog: a.catalog, config: a.config, commands: a.commands });
      expect(r.hash).toBe(m.hash());
      expect(viewFor(r.state, 'p1')).toEqual(viewFor(m.state, 'p1'));
      // Passage par la sauvegarde (JSON) : identique.
      const s = { ...newSave(NOW, 'x', 1, STARTER_DECK), activeDuel: a };
      const back = parseSave(JSON.stringify(s));
      expect(back.ok && verifyActiveCore(back.save.activeDuel!)).toEqual({ ok: true });
    }
  });

  it('données altérées ou catalogue différent : reprise refusée avec une raison, jamais un état inventé', () => {
    const { cfg, m } = midDuel(20);
    const a = { id: 'd1', encounterId: 'quai-2', seed: cfg.seed, startedAt: NOW.toISOString(), rules: m.state.rules, catalog: CATALOG_VERSION, config: cfg, commands: structuredClone(m.commands), hash: m.hash(), turn: m.state.turn };
    const tampered = structuredClone(a);
    tampered.config.players.p2.hp = 999;
    expect(verifyActiveCore(tampered).ok).toBe(false);
    expect(verifyActiveCore({ ...a, catalog: 'autre-catalogue' }).ok).toBe(false);
    const broken = structuredClone(a);
    (broken.commands[broken.commands.length - 1] as { type: string }).type = 'inconnue';
    expect(verifyActiveCore(broken).ok).toBe(false);
  });

  it('le résumé d’un duel repris est celui du duel d’origine (restaurer un profil ne change pas l’issue)', () => {
    const cfg = encounterConfig(encounterById('libre-voile')!, STARTER_DECK, 77);
    const m = autoplay(cfg);
    const r = replay(m.record());
    const s1 = summarize({ id: 'd', encounterId: 'libre-voile', rival: 'voile', seed: 77, signature: 'Cendre', view: viewFor(m.state, 'p1'), events: m.events, abandoned: false, at: NOW });
    const s2 = summarize({ id: 'd', encounterId: 'libre-voile', rival: 'voile', seed: 77, signature: 'Cendre', view: viewFor(r.state, 'p1'), events: r.events, abandoned: false, at: NOW });
    expect(s2).toEqual(s1);
  });
});
