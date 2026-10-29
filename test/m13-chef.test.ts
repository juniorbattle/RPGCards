/**
 * M13 — le chef d'orchestre (`src/son/musique/chef.ts`) et la musique du moteur du son : la correspondance « état
 * public du jeu → musique » (contrat `docs/m13/02_MUSIQUE_INTERACTIVE.md`, §1 et §3). Faits publics seulement : un
 * événement privé, même du joueur, ne fait jamais bouger la musique (ADR 011).
 */
import { describe, expect, it } from 'vitest';
import type { GameEvent } from '../src/game/model/types';
import { creerMoteurSon } from '../src/son/moteur';
import {
  consigneDuel, consigneVille, estTendu, intensiteDuel, musiqueEcran, numeroChapitre, proximiteFanal, roleDuelAventure, roleDuelStandard, salleDuLieu,
  suiviDepuis, suivreDuel, SUIVI_DEPART, versionDuel, versionQuartier,
} from '../src/son/musique/chef';
import { FONDU_SORTIE_S, SILENCE_S, finArret, planEnchainement } from '../src/son/musique/enchainement';

let seq = 0;
const ev = (kind: GameEvent['kind'], data: Record<string, unknown> = {}, vis: GameEvent['vis'] = 'public'): GameEvent => ({ seq: seq++, turn: 1, phase: 'CLASH' as GameEvent['phase'], vis, kind, data });
const PV = { me: 20, meMax: 20, opp: 20, oppMax: 20 };

describe('M13 — chef : les écrans et les rôles', () => {
  it('jeu standard : l\'accueil au titre, les écrans de préparation et le résultat au lounge ; le duel a sa propre musique', () => {
    expect(musiqueEcran('home').version).toBe('I-1');
    expect(musiqueEcran('new').version).toBe('I-1');
    for (const e of ['deck', 'collection', 'board', 'prep', 'options', 'help', 'result']) expect(musiqueEcran(e).version, e).toBe('I-2');
    expect(musiqueEcran('duel').version).toBeNull();
  });
  it('rôle musical : Kaï au jeu standard ; dans l\'aventure, Kaï, puis Championnat et Finale, puis Maison, puis le duel', () => {
    expect(roleDuelStandard('braise')).toEqual({ role: 'kai' });
    expect(roleDuelStandard('ronce')).toEqual({ role: 'duel' });
    for (const k of ['prologue', 'rival:K3', 'rival-kai', 'brasDroit-Cendre']) expect(roleDuelAventure(k), k).toEqual({ role: 'kai' });
    expect(roleDuelAventure('champ:finale')).toEqual({ role: 'finale' });
    expect(roleDuelAventure('champ:poule:Ronce')).toEqual({ role: 'championnat' });
    expect(roleDuelAventure('champ:miroir', 'braise')).toEqual({ role: 'kai' });
    expect(roleDuelAventure('champ:miroir', 'ronce')).toEqual({ role: 'championnat' });
    expect(roleDuelAventure('cadet-Ronce')).toEqual({ role: 'maison', famille: 'Ronce' });
    expect(roleDuelAventure('chef-Voile')).toEqual({ role: 'maison', famille: 'Voile' });
    expect(roleDuelAventure('joute:Astre')).toEqual({ role: 'maison', famille: 'Astre' });
    expect(roleDuelAventure('epreuve:Voile')).toEqual({ role: 'duel' });
    expect(roleDuelAventure('rue-docker')).toEqual({ role: 'duel' });
  });
  it('version d\'un duel : le thème propre au rôle (Maisons, Kaï, Championnat, Finale), sinon le thème III, tendu ou non', () => {
    expect(versionDuel({ role: 'duel' }, false)).toBe('III-1');
    expect(versionDuel({ role: 'duel' }, true)).toBe('III-2');
    expect(versionDuel({ role: 'kai' }, true)).toBe('V-1');
    expect(['Cendre', 'Voile', 'Ronce', 'Astre'].map((f) => versionDuel({ role: 'maison', famille: f as 'Cendre' }, false))).toEqual(['IV-1', 'IV-2', 'IV-3', 'IV-4']);
    expect(versionDuel({ role: 'championnat' }, false)).toBe('VI-1');
    expect(versionDuel({ role: 'kai' }, false, new Set())).toBe('III-1');
    expect(versionDuel({ role: 'maison', famille: 'Cendre' }, true, new Set())).toBe('III-2');
    expect(versionDuel({ role: 'kai' }, false, new Set(['V-1']))).toBe('V-1');
    expect(versionDuel({ role: 'maison', famille: 'Ronce' }, false, new Set(['IV-3']))).toBe('IV-3');
    expect(versionDuel({ role: 'finale' }, true, new Set(['VI-2']))).toBe('VI-2');
  });
});

describe('M13 — chef : le duel suit les faits publics', () => {
  it('Clash gagné ou perdu par le joueur : un accent ; une égalité : aucun ; la mélodie entre au premier Clash', () => {
    let r = suivreDuel(SUIVI_DEPART, [ev('clash', { winner: 'p1' })], 'p1', PV);
    expect(r.ponctuations).toEqual(['gagne']);
    expect(consigneDuel({ role: 'duel' }, r.suivi, PV).couches).toEqual({ melodie: 1, tension: 0, cuivres: 0 });
    r = suivreDuel(r.suivi, [ev('clash', { winner: 'p2' })], 'p1', PV);
    expect(r.ponctuations).toEqual(['perdu']);
    r = suivreDuel(r.suivi, [ev('clash', { winner: null })], 'p1', PV);
    expect(r.ponctuations).toEqual([]);
    expect(r.suivi.clashes).toBe(3);
  });
  it('Signature annoncée : les cuivres (un accent la première fois) ; prolongation : le duel tendu ; PV sous 30 % : le duel tendu', () => {
    let r = suivreDuel(SUIVI_DEPART, [ev('signatureAnnounced', { player: 'p2' })], 'p1', PV);
    expect(r.ponctuations).toEqual(['signature']);
    r = suivreDuel(r.suivi, [ev('signatureAnnounced', { player: 'p1' })], 'p1', PV);
    expect(r.ponctuations).toEqual([]);
    expect(consigneDuel({ role: 'duel' }, r.suivi, PV).couches?.cuivres).toBe(1);
    const o = suivreDuel(SUIVI_DEPART, [ev('overtime', { overtime: 1 })], 'p1', PV);
    expect(o.ponctuations).toEqual(['prolongation']);
    expect(o.suivi.tendu).toBe(true);
    expect(consigneDuel({ role: 'duel' }, o.suivi, PV).version).toBe('III-2');
    expect(estTendu({ ...PV, opp: 6 }, 0)).toBe(true);
    expect(estTendu({ ...PV, me: 7 }, 0)).toBe(false);
    expect(suivreDuel(SUIVI_DEPART, [ev('damage', { player: 'p1', amount: 14 })], 'p1', { ...PV, me: 6 }).suivi.tendu).toBe(true);
  });
  it('fin du duel : victoire ou défaite du joueur, sans accent dans le même temps', () => {
    const v = suivreDuel(SUIVI_DEPART, [ev('clash', { winner: 'p1' }), ev('victory', { winner: 'p1' })], 'p1', PV);
    expect(v.fin).toBe('victoire');
    expect(v.ponctuations).toEqual([]);
    expect(suivreDuel(SUIVI_DEPART, [ev('victory', { winner: 'p2' })], 'p1', PV).fin).toBe('defaite');
  });
  it('secret (ADR 011) : un événement privé ne fait rien, qu\'il soit au joueur ou à l\'adversaire', () => {
    const prives = [ev('clash', { own: true, player: 'p2', score: 9 }, 'p2'), ev('clash', { own: true, player: 'p1' }, 'p1'), ev('peek', { card: 'x' }, 'p2'), ev('signatureAnnounced', {}, 'p2')];
    const r = suivreDuel(SUIVI_DEPART, prives, 'p1', PV);
    expect(r.suivi).toEqual(SUIVI_DEPART);
    expect(r.ponctuations).toEqual([]);
  });
  it('un duel repris retrouve ses couches sans accent ; l\'intensité reste entre 0 et 1 et monte avec l\'usure', () => {
    const s = suiviDepuis([ev('clash', { winner: 'p1' }), ev('signatureAnnounced', {})], 'p1', PV);
    expect(s).toMatchObject({ clashes: 1, signature: true, tendu: false });
    const a = intensiteDuel(SUIVI_DEPART, PV);
    const b = intensiteDuel({ ...SUIVI_DEPART, clashes: 6 }, { ...PV, me: 8 });
    expect(a).toBeGreaterThanOrEqual(0);
    expect(b).toBeLessThanOrEqual(1);
    expect(b).toBeGreaterThan(a);
  });
});

describe('M13 — chef : l\'acoustique du lieu d\'un duel', () => {
  it('la rue en plein air, le bar au club, la salle de jeu feutrée, l\'arène en grande salle ; sans lieu, la salle de la version', () => {
    expect(['rue', 'bar', 'salle', 'arene', 'ailleurs'].map(salleDuLieu)).toEqual(['rue', 'club', 'studio', 'grande', undefined]);
    expect(consigneDuel({ role: 'duel' }, SUIVI_DEPART, PV, undefined, 'arene').salle).toBe('grande');
    expect('salle' in consigneDuel({ role: 'duel' }, SUIVI_DEPART, PV)).toBe(false);
  });
});

describe('M13 — chef : la ville', () => {
  it('quartiers : le Quai et la Place du Fanal, le Parvis et la Grande Cour, les Ruelles et la Ville haute', () => {
    expect(['quai', 'port', 'parvis', 'cour', 'ruelles', 'haute'].map(versionQuartier)).toEqual(['II-1', 'II-1', 'II-2', 'II-2', 'II-3', 'II-3']);
    expect(['prologue', 'I', 'II', 'III', 'IV', 'V', 'titre'].map((c) => numeroChapitre(c as 'I'))).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(consigneVille('ruelles', 4)).toEqual({ version: 'II-3', options: { chapitre: 4 }, couches: { melodie: 1 } });
    expect(consigneVille('quai')).toEqual({ version: 'II-1', options: {}, couches: { melodie: 1 } });
    // la ville respire : au repos, la mélodie se retire (les musiciens continuent)
    expect(consigneVille('quai', 2, true).couches).toEqual({ melodie: 0 });
  });
  it('le combo du Fanal : tout près de sa porte, plus rien à seize mètres ; hors du Quai, pas de source', () => {
    expect(proximiteFanal('quai', { x: 7.2, z: -1.3 })).toBe(1);
    expect(proximiteFanal('quai', { x: 7.2 + 8, z: -1.3 })).toBe(0.5);
    expect(proximiteFanal('quai', { x: -20, z: 3 })).toBe(0);
    expect(proximiteFanal('ruelles', { x: 7.2, z: -1.3 })).toBeNull();
  });
});

describe('M13 — la musique du moteur du son (sans contexte audio)', () => {
  it('les consignes sont retenues et lisibles (QA) même sans orchestre : versions, duel, accents, fin, jingles', () => {
    const m = creerMoteurSon('?qa=1', null).musique;
    expect(m.active()).toBe(false);
    m.vouloir({ version: 'I-1' });
    m.vouloir({ version: 'I-1' });
    m.debutDuel({ role: 'kai' }, [], PV);
    m.duel([ev('clash', { winner: 'p1' })], PV);
    m.duel([ev('victory', { winner: 'p1' })], PV);
    m.jingle('carte');
    expect(m.journal()).toEqual(['version:I-1', 'duel:kai:V-1', 'ponctuation:gagne', 'version:V-1:melodie', 'fin:victoire', 'jingle:carte']);
    expect(m.consigne()).toEqual({ version: null });
  });
});

describe('M13 — les enchaînements entre deux morceaux (retour du responsable du 2026-10-29)', () => {
  const base = { now: 10, debutDe: 2, prochainTemps: 10.3, prochainePhrase: 12, libre: 0 };
  it('un autre morceau : effacement à partir du temps suivant, un silence, puis la levée du nouveau ; jamais de chevauchement', () => {
    const p = planEnchainement({ ...base, de: 'II-1' }, 'III-1', 1.67);
    expect(p.sortie).toEqual({ a: 10.3, duree: FONDU_SORTIE_S, coupe: false });
    expect(p.debut).toBeCloseTo(10.3 + FONDU_SORTIE_S + SILENCE_S, 9);
    expect(p.debut - (p.sortie!.a + p.sortie!.duree)).toBeGreaterThanOrEqual(1);
    expect(p.intro).toBe(true);
  });
  it('le duel qui se tend : un break, arrêt net sur la phrase et une mesure de silence, sans levée', () => {
    const p = planEnchainement({ ...base, de: 'III-1' }, 'III-2', 1.54);
    expect(p.sortie).toEqual({ a: 12, duree: 0.08, coupe: true });
    expect(p.debut).toBeCloseTo(13.54, 9);
    expect(p.intro).toBe(false);
  });
  it('depuis le silence : tout de suite, ou après le silence qui suit un arrêt ou un jingle de fin', () => {
    expect(planEnchainement({ ...base, de: null, debutDe: null }, 'I-1', 1.9)).toEqual({ sortie: null, debut: 10.1, intro: true });
    expect(planEnchainement({ ...base, de: null, debutDe: null, libre: 14 }, 'II-1', 2.5).debut).toBe(14);
    expect(finArret(10, 0)).toBeCloseTo(10.02 + FONDU_SORTIE_S + SILENCE_S, 9);
    expect(finArret(10, 20)).toBe(20);
  });
  it('un morceau prévu qui n\'a pas commencé (dans le silence) est remplacé sans allonger le silence', () => {
    const p = planEnchainement({ ...base, de: 'II-2', debutDe: 12.5 }, 'II-1', 2.5);
    expect(p.sortie).toEqual({ a: 10, duree: 0, coupe: false });
    expect(p.debut).toBe(12.5);
  });
});
