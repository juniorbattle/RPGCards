/**
 * Lot de correction de clôture (passe 227) — aventure : sauvegarde mal formée sans exception, copie de secours restaurable ;
 * nom de l'Observatoire (fiche M11, D2) ; notes de résultat par type de rencontre ; répliques propres à chaque événement de
 * Kaï ; contraintes des Joutes (C1) ; objectifs du Récit guidé (G5) ; B3 (+3 PV aux victoires qui apportent quelque chose).
 */
import { describe, expect, it } from 'vitest';
import type { Family } from '../src/game/catalog/cards';
import { appliquer, nouvelleAventure, type AventureEtat, type Evenement } from '../src/aventure/aventure';
import { noteResultat } from '../src/aventure/app';
import { CONTRAINTE_JOUTE } from '../src/aventure/competitions';
import { deckDepart } from '../src/aventure/deck';
import { conclureDuel, ouvrirDuel } from '../src/aventure/fin';
import { figureDe, MAISONS, ROLES } from '../src/aventure/modele';
import { objectif } from '../src/aventure/quetes';
import { duelFacultatif, duelFigure } from '../src/aventure/rencontres';
import { choisir, memoireVide, type Contexte } from '../src/aventure/repliques';
import { CLE_AVENTURE, CLE_ECART, CLE_SECOURS, MagasinAventure, nouvelleSauvegarde, validerSansException } from '../src/aventure/sauvegarde';
import type { Gain } from '../src/aventure/registre';

const AT = '2026-11-11T12:00:00.000Z';
const F0 = { assautsGagnes: 0, gardesGagnees: 0, interferencesReussies: 0 };
const run = (e: AventureEtat, evs: Evenement[]): AventureEtat => evs.reduce((x, ev) => appliquer(x, ev, AT).etat, e);
const prologue = () => run(nouvelleAventure(AT), [{ type: 'scene', id: 'P1' }, { type: 'scene', id: 'P2' }, { type: 'duelPrologue', issue: 'victoire', faits: F0 }]);
const memoire = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); }, m }; };

describe('sauvegarde mal formée : jamais d’exception, la copie de secours proposée', () => {
  const malformees: Array<[string, (x: Record<string, any>) => void]> = [
    ['deck sans Techniques', (x) => { delete x.etat.deck.techniques; }],
    ['registre avec null', (x) => { x.etat.registre.push(null); }],
    ['figure inconnue vaincue', (x) => { x.etat.vaincues = ['personne']; }],
    ['engagée inconnue', (x) => { x.etat.engages = [42]; }],
    ['rival invalide', (x) => { x.etat.rival = { faits: { K9: 'victoire' } }; }],
    ['collecte invalide', (x) => { x.etat.collecte = { trouves: 'tout' }; }],
    ['duel invalide', (x) => { x.duel = { id: 3 }; }],
  ];
  it.each(malformees)('%s : la validation rend une raison, ne lève rien ; le magasin la dit illisible', (_nom, abimer) => {
    const st = memoire();
    const store = new MagasinAventure(st, () => new Date(AT));
    const bonne = nouvelleSauvegarde(new Date(AT), 'Lou', 7);
    expect(store.ecrire(bonne)).toEqual({ ok: true });
    // une seconde écriture : la première devient la copie de secours
    expect(store.ecrire({ ...bonne, compteur: 1 })).toEqual({ ok: true });
    const x = JSON.parse(st.m.get(CLE_AVENTURE)!);
    abimer(x);
    expect(() => validerSansException(x)).not.toThrow();
    expect(validerSansException(x).length).toBeGreaterThan(0);
    st.setItem(CLE_AVENTURE, JSON.stringify(x));
    const c = store.charger();
    expect(c.status).toBe('illisible');
    if (c.status !== 'illisible') return;
    expect(c.secours?.profil.nom).toBe('Lou');
    // « Restaurer la copie de secours » : l'illisible mise à l'écart, jamais effacée ; la copie reprise
    expect(store.restaurerSecours(c.secours!)).toEqual({ ok: true });
    expect(store.charger().status).toBe('ok');
    expect(JSON.parse(st.m.get(CLE_ECART)!).text).toContain('"Lou"');
    expect(st.m.get(CLE_SECOURS)).toBeTruthy();
  });
});

describe('textes de l’aventure', () => {
  it('fiche M11, D2 : la maison de l’Astre est l’Observatoire de la Ville haute ; ses figures reçoivent au Parvis', () => {
    expect(MAISONS.Astre.nom).toBe('l’Observatoire de la Ville haute');
    expect(MAISONS.Astre.siege).toBe('haute');
    expect(MAISONS.Astre.ilot).toBe('parvis');
  });

  it('une note par type de rencontre ; « au choix » à la première victoire, « la variante suivante » en revanche', () => {
    const v: Gain = { key: 'variante:Ronce-1-epine', kind: 'variante', family: 'Ronce', items: ['Ronce-1-epine'], source: 'x', at: AT };
    expect(noteResultat('epreuve:Ronce', 'victoire', [v], true)).toMatch(/de votre choix/);
    expect(noteResultat('epreuve:Ronce', 'victoire', [v], false)).toMatch(/variante suivante/);
    expect(noteResultat('joute:Ronce', 'victoire', [v], false)).toMatch(/Joute rejouée : la variante suivante/);
    expect(noteResultat('joute:Ronce', 'victoire', [], false)).toMatch(/déjà à vous/);
    for (const r of ['rue-docker', 'rival:K3', 'rival-kai', 'gardien:fontaine']) {
      const n = noteResultat(r, 'victoire', [], false);
      expect(n, r).not.toMatch(/Revanche|trois variantes/);
    }
    expect(noteResultat('rival:K3', 'defaite', [], false)).toMatch(/Kaï reviendra/);
    expect(noteResultat('cadet-Ronce', 'victoire', [], false)).toMatch(/^Revanche/);
    expect(noteResultat('cadet-Ronce', 'victoire', [v], true)).toMatch(/de votre choix/);
  });

  it('Kaï parle selon l’événement qu’il rejoue (K3 au chapitre IV), plus selon le chapitre', () => {
    const ctx = (o: Partial<Contexte>): Contexte => ({ moment: 'rival', chapitre: 'IV', voie: 'Ronce', temperament: null, joues: 2, victoires: 0, defaites: 2, dernier: 'defaite', chefs: 2, cheffe: true, ...o });
    expect(choisir('kai', ctx({ evenement: 'K3' }), memoireVide(), 3)!.replique.id).toBe('kai-K3-perdu');
    expect(choisir('kai', ctx({ evenement: 'K4', dernier: null, joues: 0, defaites: 0 }), memoireVide(), 3)!.replique.id).toMatch(/^kai-K4/);
    // sans événement dans le contexte : celui du chapitre (comportement d'avant)
    expect(choisir('kai', ctx({ chapitre: 'III' }), memoireVide(), 3)!.replique.id).toBe('kai-K3-perdu');
  });

  it('G5 : en Récit guidé, l’objectif ne parle pas de marcher', () => {
    const e = run(nouvelleAventure(AT), [{ type: 'scene', id: 'P1' }]);
    expect(objectif(e)).toMatch(/Approchez-vous/);
    expect(objectif(e, true)).not.toMatch(/Approchez|à l’est|Retournez/);
  });
});

describe('C1 — contraintes des Joutes accordées à l’avenant 09 et à M16', () => {
  it('Cendre : une variante Cendre IV ; Voile : deux variantes Voile ; Astre : deux familles', () => {
    const d = deckDepart();
    const avec = (cartes: string[]) => ({ ...d, cartes });
    const neutres = d.cartes.filter((c) => c.startsWith('neutre-'));
    expect(CONTRAINTE_JOUTE.Cendre.ok(avec(['Cendre-4-fournaise', ...neutres.slice(1)]))).toBe(true);
    expect(CONTRAINTE_JOUTE.Cendre.ok(avec(['Cendre-4-basic', ...neutres.slice(1)]))).toBe(false);
    expect(CONTRAINTE_JOUTE.Voile.ok(avec(['Voile-1-leurre', 'Voile-2-echo', ...neutres.slice(2)]))).toBe(true);
    expect(CONTRAINTE_JOUTE.Voile.ok(avec(['Voile-1-leurre', 'Voile-2-basic', ...neutres.slice(2)]))).toBe(false);
    expect(CONTRAINTE_JOUTE.Astre.ok(avec(['Astre-1-basic', 'Ronce-2-basic', ...neutres.slice(2)]))).toBe(true);
    expect(CONTRAINTE_JOUTE.Astre.ok(avec(['Astre-1-basic', 'Astre-2-basic', ...neutres.slice(2)]))).toBe(false);
  });
});

describe('B3 — +3 PV seulement pour une victoire qui apporte quelque chose', () => {
  it('duel de rue : la première victoire compte, la seconde non ; une défaite jamais ; revanche contre une figure sans gain : non', () => {
    const s = nouvelleSauvegarde(new Date(AT), 'Lou', 7);
    s.etat = run(prologue(), [{ type: 'confirmer', famille: 'Ronce' as Family }, { type: 'scene', id: 'P8' }]);
    const pv = () => s.etat.combats;
    const c0 = pv();
    const rue = () => ouvrirDuel(s, duelFacultatif('rue-docker', s.etat, 100 + s.compteur), AT).duel;
    conclureDuel(s, rue(), [], 'defaite', 6, AT);
    expect(pv()).toBe(c0);
    conclureDuel(s, rue(), [], 'victoire', 6, AT);
    expect(pv()).toBe(c0 + 1);
    conclureDuel(s, rue(), [], 'victoire', 6, AT);
    expect(pv()).toBe(c0 + 1);
    // la figure : première victoire (+1), puis une revanche gagnée, la variante déjà prise et toutes les suivantes aussi : rien
    const cadet = figureDe('Ronce', ROLES[0]!).id;
    s.etat = run(s.etat, [{ type: 'lancerDefi', figure: cadet }]);
    conclureDuel(s, ouvrirDuel(s, duelFigure(cadet, s.etat, 300, false), AT).duel, [], 'victoire', 6, AT);
    expect(pv()).toBe(c0 + 2);
    const avant = pv();
    for (let i = 0; i < 4; i++) conclureDuel(s, ouvrirDuel(s, duelFigure(cadet, s.etat, 400 + i, true), AT).duel, [], 'victoire', 6, AT);
    // deux revanches donnent encore les deux autres variantes (+1 chacune), puis plus rien
    expect(pv()).toBe(avant + 2);
  });
});
