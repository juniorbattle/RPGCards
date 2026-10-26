/**
 * M11-A — Kaï, le rival en événements fixes (`docs/m11/02_RIVAL_EVENEMENTS_FIXES.md`, ADR 038) ; la sauvegarde versionnée
 * `aventure/2` (migration de `aventure/1` sans perte, original gardé à part) ; la fin d'un duel du rival et d'un guetteur.
 */
import { describe, expect, it } from 'vitest';
import type { Family } from '../src/game/catalog/cards';
import { appliquer, chapitreDetaille, nouvelleAventure, type AventureEtat, type Evenement } from '../src/aventure/aventure';
import { decider, nouveauDirecteur } from '../src/aventure/directeur';
import { conclureDuel, ouvrirDuel } from '../src/aventure/fin';
import { figureDe, ROLES } from '../src/aventure/modele';
import { quetes } from '../src/aventure/quetes';
import { duelFacultatif, duelRival } from '../src/aventure/rencontres';
import { EVENEMENTS_RIVAL, evenementRival, K_IDS } from '../src/aventure/rival';
import { CLE_AVENTURE, CLE_V1, MagasinAventure, nouvelleSauvegarde, SCHEMA_AVENTURE } from '../src/aventure/sauvegarde';
import type { IlotId } from '../src/ville/ilots';

const AT = '2026-10-26T08:00:00.000Z';
const F0 = { assautsGagnes: 0, gardesGagnees: 0, interferencesReussies: 0 };
const run = (e: AventureEtat, evs: Evenement[]): AventureEtat => evs.reduce((x, ev) => appliquer(x, ev, AT).etat, e);
const prologue = () => run(nouvelleAventure(AT), [{ type: 'scene', id: 'P1' }, { type: 'scene', id: 'P2' }, { type: 'duelPrologue', issue: 'victoire', faits: F0 }]);
const defi = (id: string): Evenement[] => [{ type: 'lancerDefi', figure: id }, { type: 'duelStructurant', figure: id, issue: 'victoire', duel: id }];
const conquerir = (f: Family): Evenement[] => ROLES.flatMap((r) => defi(figureDe(f, r).id));
const TOUS: IlotId[] = ['quai', 'parvis', 'ruelles', 'cour', 'port', 'haute'];

function trame(f: Family = 'Ronce'): Record<string, AventureEtat> {
  const i0 = run(prologue(), [{ type: 'confirmer', famille: f }, { type: 'scene', id: 'P8' }]);
  const i1 = run(i0, defi(figureDe(f, 'cadet').id));
  const ii = run(i0, conquerir(f));
  const autres = (['Cendre', 'Ronce', 'Voile', 'Astre'] as Family[]).filter((x) => x !== f);
  const iii = run(ii, [{ type: 'engager', famille: autres[0]! }, ...conquerir(autres[0]!)]);
  const iv = run(iii, [{ type: 'engager', famille: autres[1]! }, ...conquerir(autres[1]!)]);
  const v = run(iv, [{ type: 'engager', famille: autres[2]! }, ...conquerir(autres[2]!)]);
  return { i0, i1, ii, iii, iv, v };
}
const ou = (e: AventureEtat, rangs = true) => TOUS.filter((il) => evenementRival(e, il, rangs) !== null).map((il) => `${il}:${evenementRival(e, il, rangs)!.id}`);

describe('M11-A — les moments écrits du rival (contrat 2, §1, §2)', () => {
  it('jamais au prologue ; K1 après le premier lieutenant de la maison, au Quai seulement', () => {
    const t = trame();
    expect(ou(prologue())).toEqual([]);
    expect(ou(t.i0!)).toEqual([]);
    expect(ou(t.i1!)).toEqual(['quai:K1']);
  });
  it('K2 à K5 dans leur chapitre et leurs îlots ; secours sans Grande Cour ni quartiers ajoutés', () => {
    const t = trame();
    expect(chapitreDetaille(t.ii!)).toBe('II');
    expect(ou(t.ii!)).toEqual(['quai:K2', 'cour:K2']);
    expect(ou(t.iii!)).toEqual(['parvis:K3', 'ruelles:K3', 'port:K3', 'haute:K3']);
    expect(ou(t.iv!)).toEqual(['quai:K4', 'parvis:K4', 'ruelles:K4']);
    expect(ou(t.v!)).toEqual(['cour:K5']);
    expect(ou(t.v!, false)).toEqual(['parvis:K5']);
    expect(ou(t.iii!, false)).toEqual(['parvis:K3', 'ruelles:K3']);
  });
  it('une fois : accompli à l’issue d’un duel mené à son terme (victoire ou défaite) ; un abandon le laisse dû', () => {
    const t = trame();
    const ab = appliquer(t.i1!, { type: 'rival', id: 'K1', issue: 'abandon' }, AT).etat;
    expect(evenementRival(ab, 'quai')?.id).toBe('K1');
    const def = appliquer(t.i1!, { type: 'rival', id: 'K1', issue: 'defaite' }, AT).etat;
    expect(evenementRival(def, 'quai')).toBeNull();
    expect(def.rival?.faits.K1).toBe('defaite');
    expect(appliquer(def, { type: 'rival', id: 'K1', issue: 'victoire' }, AT).etat.rival?.faits.K1).toBe('defaite');
  });
  it('jamais au retour d’un duel contre Kaï ; un événement manqué ne se rattrape pas au chapitre suivant', () => {
    const t = trame();
    expect(evenementRival(t.i1!, 'quai', true, true)).toBeNull();
    // chapitre II sans avoir eu K1 : seul K2 est dû
    expect(evenementRival(t.ii!, 'quai')?.id).toBe('K2');
  });
  it('K6, scène du titre, sans duel ; la quête « Kaï, la Braise du quai » suit les cinq duels', () => {
    expect(EVENEMENTS_RIVAL.find((k) => k.id === 'K6')!.duel).toBe(false);
    expect(K_IDS.length).toBe(6);
    const t = trame();
    const e = appliquer(t.i1!, { type: 'rival', id: 'K1', issue: 'victoire' }, AT).etat;
    const q = quetes(e).find((x) => x.id === 'rival')!;
    expect(q.etapes.length).toBe(5);
    expect(q.etapes.map((s) => s.faite)).toEqual([true, false, false, false, false]);
    expect(quetes(e).some((x) => x.id === 'ombre')).toBe(false);
  });
  it('le directeur ne tire plus l’ombre de Kaï quand le rival est fixe (et la tire encore sinon : comportement de M10)', () => {
    const e = trame().iii!;
    let d = nouveauDirecteur(5);
    let fixe = 0;
    let libre = 0;
    let d2 = nouveauDirecteur(5);
    for (let i = 0; i < 30; i++) {
      for (const il of ['quai', 'parvis', 'ruelles', 'cour'] as IlotId[]) {
        const a = decider(d, e, il, true, { rivalFixe: true });
        d = a.directeur;
        if (a.poses.some((p) => p.id === 'rival-kai')) fixe++;
        const b = decider(d2, e, il, true);
        d2 = b.directeur;
        if (b.poses.some((p) => p.id === 'rival-kai')) libre++;
      }
      d = { ...d, battement: d.battement + 1 };
      d2 = { ...d2, battement: d2.battement + 1 };
    }
    expect(fixe).toBe(0);
    expect(libre).toBeGreaterThan(0);
  });
});

describe('M11-A — fin des duels du rival et des guetteurs (fin.ts)', () => {
  it('un duel `rival:K1` mené à son terme accomplit l’événement ; un guetteur note son issue (repos)', () => {
    const s = nouvelleSauvegarde(new Date(AT), 'Test', 42);
    s.etat = trame().i1!;
    const prevu = duelRival('K1', s.etat, 99);
    expect(prevu.rencontre).toBe('rival:K1');
    expect(prevu.personnalite.aiProfile).toBe('offensif');
    const o = ouvrirDuel(s, prevu, AT);
    conclureDuel(s, o.duel, [], 'defaite', 9, AT);
    expect(s.etat.rival?.faits.K1).toBe('defaite');
    expect(s.etat.combats).toBe(trame().i1!.combats + 1);
    const g = ouvrirDuel(s, duelFacultatif('rue-docker', s.etat, 100), AT);
    conclureDuel(s, g.duel, [], 'victoire', 8, AT);
    expect(s.directeur.vus?.['rue-docker']).toEqual({ issue: 'victoire', battement: s.directeur.battement, chapitre: 'I' });
  });
});

describe('M11-A — sauvegarde versionnée (aventure/2)', () => {
  it('une sauvegarde aventure/1 se lit, se migre sans perte, et son texte d’origine est gardé à part', () => {
    const mem = new Map<string, string>();
    const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) };
    const s = nouvelleSauvegarde(new Date(AT), 'Ana', 7);
    s.etat = trame().i1!;
    const v1 = JSON.stringify({ ...s, schema: 'aventure/1' });
    mem.set(CLE_AVENTURE, v1);
    const st = new MagasinAventure(storage, () => new Date(AT));
    const c = st.charger();
    expect(c.status).toBe('ok');
    if (c.status !== 'ok') return;
    expect(c.save.schema).toBe(SCHEMA_AVENTURE);
    expect(c.save.etat).toEqual(s.etat);
    expect(st.ecrire(c.save).ok).toBe(true);
    expect(mem.get(CLE_V1)).toBe(v1);
    expect(JSON.parse(mem.get(CLE_AVENTURE)!).schema).toBe('aventure/2');
    // une seconde écriture ne remplace pas l'original
    expect(st.ecrire(c.save).ok).toBe(true);
    expect(mem.get(CLE_V1)).toBe(v1);
  });
  it('une version plus récente (aventure/3) est refusée sans être modifiée', () => {
    const mem = new Map<string, string>([[CLE_AVENTURE, JSON.stringify({ schema: 'aventure/3' })]]);
    const st = new MagasinAventure({ getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, v), removeItem: (k) => void mem.delete(k) });
    expect(st.charger().status).toBe('future');
  });
});
