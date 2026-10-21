/**
 * M10-E — la ville vivante (feuille de route `docs/m10/FEUILLE_DE_ROUTE_M10.md`, `VILLE_RENCONTRES_EVENEMENTS.md` §5 et
 * §7) : le directeur des rencontres dans la ville en rangs (places des rangs du fond et de la Grande Cour, jamais dans la
 * ville d'aujourd'hui), l'ombre de Kaï une fois par chapitre de la trame (I à V), après le premier battement du chapitre,
 * jamais dans un îlot où son personnage est déjà posé ; un refusé repart au point de décision suivant ; rien n'est tiré
 * hors d'un point de décision.
 */
import { describe, expect, it } from 'vitest';
import type { Family } from '../src/game/catalog/cards';
import { appliquer, chapitreDetaille, nouvelleAventure, type AventureEtat, type Evenement } from '../src/aventure/aventure';
import { battre, conclure, decider, nouveauDirecteur, poses, RENCONTRES, type EtatDirecteur } from '../src/aventure/directeur';
import { figureDe, ROLES } from '../src/aventure/modele';
import type { IlotId } from '../src/ville/ilots';

const AT = '2026-10-21T08:00:00.000Z';
const FAITS0 = { assautsGagnes: 0, gardesGagnees: 0, interferencesReussies: 0 };
const run = (e: AventureEtat, evs: Evenement[]): AventureEtat => evs.reduce((x, ev) => appliquer(x, ev, AT).etat, e);
const prologue = (): AventureEtat => run(nouvelleAventure(AT), [{ type: 'scene', id: 'P1' }, { type: 'scene', id: 'P2' }, { type: 'duelPrologue', issue: 'victoire', faits: FAITS0 }]);
const defi = (id: string, duel: string): Evenement[] => [{ type: 'lancerDefi', figure: id }, { type: 'duelStructurant', figure: id, issue: 'victoire', duel }];
const conquerir = (f: Family): Evenement[] => ROLES.flatMap((r) => defi(figureDe(f, r).id, `${f}-${r}`));
const ILOTS_RANGS: readonly IlotId[] = ['quai', 'parvis', 'ruelles', 'cour'];

/** Les états de la trame : chapitre I (la Ronce rejointe), II, III, IV (une autre famille vaincue de plus), V. */
function trame(): AventureEtat[] {
  const i = run(prologue(), [{ type: 'confirmer', famille: 'Ronce' }]);
  const ii = run(i, conquerir('Ronce'));
  const iii = run(ii, [{ type: 'engager', famille: 'Cendre' }, ...conquerir('Cendre')]);
  const iv = run(iii, [{ type: 'engager', famille: 'Voile' }, ...conquerir('Voile')]);
  const v = run(iv, [{ type: 'engager', famille: 'Astre' }, ...conquerir('Astre')]);
  return [i, ii, iii, iv, v];
}

describe('M10-E — la trame en chapitres (contrat narratif §5)', () => {
  it('prologue, I la maison, II à IV une par autre chef vaincu, V le Championnat', () => {
    expect(chapitreDetaille(prologue())).toBe('prologue');
    expect(trame().map(chapitreDetaille)).toEqual(['I', 'II', 'III', 'IV', 'V']);
  });
});

describe('M10-E — le directeur dans la ville en rangs', () => {
  it('les places des rangs du fond et de la Grande Cour ne sont tirées que dans la ville en rangs', () => {
    const e = trame()[1]!;
    for (const rangs of [true, false]) {
      let d = nouveauDirecteur(11);
      const vus = new Set<string>();
      for (let i = 0; i < 60; i++) {
        for (const il of rangs ? ILOTS_RANGS : (['quai', 'parvis', 'ruelles'] as const)) {
          const r = decider(d, e, il, rangs);
          d = r.directeur;
          for (const a of d.actives[il] ?? []) {
            const l = RENCONTRES.find((x) => x.id === a.id)!.lieux[a.place]!;
            expect(l.ilot).toBe(il);
            if (!rangs) expect(l.rangs, `${a.id} @ ${il}`).toBeUndefined();
            vus.add(`${a.id}@${il}${l.rangs ? ':rangs' : ''}`);
          }
          for (const a of [...(d.actives[il] ?? [])]) d = conclure(d, a.id, true);
        }
        d = battre(d);
      }
      // la ville en rangs voit la Grande Cour et les rangs du fond ; la ville d'aujourd'hui jamais
      expect([...vus].some((x) => x.includes('@cour')), `${rangs}`).toBe(rangs);
      expect([...vus].some((x) => x.endsWith(':rangs')), `${rangs}`).toBe(rangs);
    }
  });

  it('l’ombre de Kaï : une fois par chapitre de I à V, jamais avant le premier battement du chapitre', () => {
    const vus: Record<string, number> = {};
    let d: EtatDirecteur = nouveauDirecteur(5);
    for (const e of trame()) {
      const ch = chapitreDetaille(e);
      // premier point de décision du chapitre : pas encore de Kaï
      for (const il of ILOTS_RANGS) {
        const r = decider(d, e, il, true);
        d = r.directeur;
        expect(r.poses.some((p) => p.id === 'rival-kai'), `${ch}, premier point de décision`).toBe(false);
        for (const a of [...(d.actives[il] ?? [])]) d = conclure(d, a.id, true);
      }
      for (let i = 0; i < 30; i++) {
        d = battre(d);
        for (const il of ILOTS_RANGS) {
          const r = decider(d, e, il, true);
          d = r.directeur;
          if (r.poses.some((p) => p.id === 'rival-kai')) vus[ch] = (vus[ch] ?? 0) + 1;
          for (const a of [...(d.actives[il] ?? [])]) d = conclure(d, a.id, true);
        }
      }
    }
    expect(vus).toEqual({ I: 1, II: 1, III: 1, IV: 1, V: 1 });
  });

  it('Kaï n’est jamais tiré dans un îlot où son personnage est déjà posé (bras droit de la Cendre)', () => {
    const e = run(prologue(), [{ type: 'confirmer', famille: 'Cendre' }]);
    expect(poses(nouveauDirecteur(1), e, 'quai', true).some((p) => p.apparence === 'braise')).toBe(true);
    let d = nouveauDirecteur(2);
    for (let i = 0; i < 80; i++) {
      const r = decider(d, e, 'quai', true);
      d = r.directeur;
      expect(d.actives.quai?.some((a) => a.id === 'rival-kai')).not.toBe(true);
      expect(r.poses.filter((p) => p.apparence === 'braise')).toHaveLength(1);
      for (const a of [...(d.actives.quai ?? [])]) d = conclure(d, a.id, true);
      d = battre(d);
    }
  });

  it('un refus : le personnage reste sans redemander jusqu’au point de décision suivant, puis repart ; aucune conséquence de progression', () => {
    const e = trame()[0]!;
    let d = nouveauDirecteur(4);
    let id: string | undefined;
    let il: IlotId = 'quai';
    for (let i = 0; i < 20 && !id; i++) {
      for (const x of ILOTS_RANGS) { const r = decider(d, e, x, true); d = r.directeur; const a = d.actives[x]?.[0]; if (a && !id) { id = a.id; il = x; } }
      if (!id) d = battre(d);
    }
    expect(id).toBeDefined();
    d = conclure(d, id!, false);
    // relu sans point de décision : toujours là (aucun tirage, aucune disparition)
    expect(poses(d, e, il, true).some((p) => p.id === id)).toBe(true);
    const d2 = decider(d, e, il, true).directeur;
    expect(d2.actives[il]?.some((a) => a.id === id)).not.toBe(true);
    expect(d2.partants ?? []).not.toContain(id);
    expect(d2.refuses[id!]).toBe(1);
  });

  it('déterministe et sérialisable avec les nouveaux champs ; une ancienne sauvegarde (sans eux) se relit', () => {
    const e = trame()[2]!;
    let d = nouveauDirecteur(8);
    for (let i = 0; i < 25; i++) {
      for (const il of ILOTS_RANGS) {
        const a = decider(d, e, il, true);
        expect(decider(JSON.parse(JSON.stringify(d)) as EtatDirecteur, e, il, true)).toEqual(a);
        d = a.directeur;
        const x = d.actives[il]?.[0];
        if (x && i % 3 === 0) d = conclure(d, x.id, false);
      }
      d = battre(d);
    }
    const ancien = { ...nouveauDirecteur(8) } as Partial<EtatDirecteur>;
    delete ancien.debuts; delete ancien.partants;
    expect(() => decider(ancien as EtatDirecteur, e, 'cour', true)).not.toThrow();
  });
});
