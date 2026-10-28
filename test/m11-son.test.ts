/**
 * M11-E — le son synthétisé par code (`docs/m11/06_SON.md`, ADR 042), ce qui se teste sans écouter : la correspondance
 * événements du moteur → sons (publics et privés du joueur seulement), les réglages (bornes, stockage refusé), la coupure
 * en QA, aucun contexte audio sans geste ni quand le son est coupé.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { PROFILES } from '../src/game/ai/policy';
import { autoplay } from '../src/game/match';
import type { GameEvent } from '../src/game/model/types';
import { ambianceIlot, sonsDuDuel } from '../src/son/evenements';
import { bornerVolume, CLE_SON, ecrireReglages, gainGeneral, lireReglages, REGLAGES_DEFAUT, sonPermis } from '../src/son/reglages';
import { creerMoteurSon } from '../src/son/moteur';
import { config } from './helpers';

const ev = (kind: GameEvent['kind'], vis: GameEvent['vis'], data: Record<string, unknown>): GameEvent => ({ seq: 0, turn: 1, phase: 'RESOLVED', vis, kind, data });

describe('M11-E — événements du moteur → sons', () => {
  it('Clash, Garde, dégâts selon le camp, Signature annoncée, Interférence réussie, fin du duel', () => {
    expect(sonsDuDuel([ev('clash', 'public', { guardWin: true, absorbed: 0 })])).toEqual(['clash', 'garde']);
    expect(sonsDuDuel([ev('clash', 'public', { guardWin: false, absorbed: 3 })])).toEqual(['clash', 'garde']);
    expect(sonsDuDuel([ev('clash', 'public', { guardWin: false, absorbed: 0 })])).toEqual(['clash']);
    expect(sonsDuDuel([ev('damage', 'public', { player: 'p1', amount: 7 }), ev('damage', 'public', { player: 'p2', amount: 4 }), ev('damage', 'public', { player: 'p2', amount: 0 })])).toEqual(['degats', 'degats-adverse']);
    expect(sonsDuDuel([ev('signatureAnnounced', 'public', { player: 'p2', defId: 'sig-Cendre' })])).toEqual(['signature']);
    expect(sonsDuDuel([ev('interference', 'public', { success: true }), ev('interference', 'public', { success: false })])).toEqual(['interference']);
    expect(sonsDuDuel([ev('victory', 'public', { winner: 'p1' })])).toEqual(['victoire']);
    expect(sonsDuDuel([ev('victory', 'public', { winner: 'p2' })])).toEqual(['defaite']);
    expect(sonsDuDuel([ev('committed', 'public', { player: 'p1' }), ev('committed', 'public', { player: 'p2' })])).toEqual(['carte-pose']);
  });
  it('jamais un son sur un événement privé de l’adversaire', () => {
    expect(sonsDuDuel([ev('clash', 'p2', { guardWin: true }), ev('damage', 'p2', { player: 'p1', amount: 5 }), ev('victory', 'p2', { winner: 'p2' })], 'p1')).toEqual([]);
  });
  it('sur un vrai duel : un son de Clash par Clash, une fin', () => {
    const m = autoplay(config({ seed: 31 }), 200, [PROFILES.equilibre!, PROFILES.offensif!]);
    const s = sonsDuDuel(m.events, 'p1');
    expect(s.filter((x) => x === 'clash').length).toBe(m.events.filter((e) => e.kind === 'clash' && e.vis === 'public').length);
    expect(s.filter((x) => x === 'victoire' || x === 'defaite').length).toBe(1);
  });
  it('une ambiance par îlot', () => {
    expect(['quai', 'ruelles', 'parvis', 'cour', 'port', 'haute'].map(ambianceIlot)).toEqual(['amb-quai', 'amb-ruelles', 'amb-parvis', 'amb-cour', 'amb-port', 'amb-haute']);
  });
});

describe('M11-E — réglages', () => {
  const mem = () => { const m = new Map<string, string>(); return { m, st: { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) } }; };
  it('défaut, écriture, relecture, bornes', () => {
    const { m, st } = mem();
    expect(lireReglages(st)).toEqual(REGLAGES_DEFAUT);
    expect(ecrireReglages(st, { volume: 1.7, coupe: true, musique: 0.25 })).toBe(true);
    expect(JSON.parse(m.get(CLE_SON)!)).toEqual({ volume: 1, coupe: true, musique: 0.25 });
    expect(lireReglages(st)).toEqual({ volume: 1, coupe: true, musique: 0.25 });
    // M13 : un réglage d'avant la musique garde son volume et prend la musique à 60 %
    m.set(CLE_SON, JSON.stringify({ volume: 0.4, coupe: false }));
    expect(lireReglages(st)).toEqual({ volume: 0.4, coupe: false, musique: 0.6 });
    expect(bornerVolume(-3)).toBe(0);
    expect(bornerVolume(Number.NaN)).toBe(REGLAGES_DEFAUT.volume);
  });
  it('un stockage refusé ou illisible ne casse rien', () => {
    const refuse = { getItem: () => { throw new Error('refusé'); }, setItem: () => { throw new Error('refusé'); } };
    expect(lireReglages(refuse)).toEqual(REGLAGES_DEFAUT);
    expect(ecrireReglages(refuse, REGLAGES_DEFAUT)).toBe(false);
    expect(lireReglages({ getItem: () => '{pas du json', setItem: () => {} })).toEqual(REGLAGES_DEFAUT);
    expect(lireReglages(null)).toEqual(REGLAGES_DEFAUT);
  });
  it('coupé en QA sauf `son=1` ; `son=0` coupe partout ; gain nul si coupé', () => {
    expect(sonPermis('')).toBe(true);
    expect(sonPermis('?aventure=1')).toBe(true);
    expect(sonPermis('?qa=1')).toBe(false);
    expect(sonPermis('?qa=1&son=1')).toBe(true);
    expect(sonPermis('?son=0')).toBe(false);
    expect(gainGeneral({ volume: 0.5, coupe: false }, true)).toBe(0.5);
    expect(gainGeneral({ volume: 0.5, coupe: true }, true)).toBe(0);
    expect(gainGeneral({ volume: 0.5, coupe: false }, false)).toBe(0);
  });
});

describe('M11-E — le moteur : aucun contexte audio sans geste, ni coupé, ni en QA', () => {
  const g = globalThis as unknown as { window?: unknown };
  afterEach(() => { delete g.window; });
  function fenetre() {
    const ecoute: Record<string, Array<(e: Event) => void>> = {};
    let crees = 0;
    class FauxContexte { state = 'running'; constructor() { crees++; throw new Error('pas de vrai audio dans les tests'); } }
    g.window = { addEventListener: (k: string, f: (e: Event) => void) => { (ecoute[k] ??= []).push(f); }, AudioContext: FauxContexte };
    return { geste: () => (ecoute.pointerdown ?? []).forEach((f) => f({} as Event)), crees: () => crees };
  }
  it('sans geste : rien ; `jouer` ne fait rien mais note la demande', () => {
    const w = fenetre();
    const m = creerMoteurSon('', null);
    m.jouer('clash');
    expect(w.crees()).toBe(0);
    expect(m.actif()).toBe(false);
    expect(m.journal()).toEqual(['clash']);
  });
  it('en QA (`?qa=1`) ou coupé : un geste ne crée aucun contexte', () => {
    const w = fenetre();
    creerMoteurSon('?qa=1', null);
    w.geste();
    expect(w.crees()).toBe(0);
    const w2 = fenetre();
    const st = { getItem: () => JSON.stringify({ volume: 0.5, coupe: true }), setItem: () => {} };
    creerMoteurSon('', st);
    w2.geste();
    expect(w2.crees()).toBe(0);
  });
  it('permis et non coupé : le premier geste tente de créer le contexte (refus du navigateur toléré)', () => {
    const w = fenetre();
    const m = creerMoteurSon('', null);
    w.geste();
    expect(w.crees()).toBe(1);
    expect(m.actif()).toBe(false);
    expect(() => m.jouer('victoire')).not.toThrow();
  });
});
