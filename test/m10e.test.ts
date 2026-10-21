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
import { famillesDominantes, PLAN_TENANTE } from '../src/aventure/competitions';
import { faitsPublics } from '../src/aventure/faits';
import { figureDe, ROLES } from '../src/aventure/modele';
import { PV_ADVERSE } from '../src/aventure/paliers';
import { duelChampionnat } from '../src/aventure/rencontres';
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

describe('M10-E — le Championnat des Champions (PROGRESSION §4)', () => {
  const v = (): AventureEtat => trame()[4]!;
  const champ = (e: AventureEtat, manche: 'poule' | 'miroir' | 'finale', signature: Family, issue: 'victoire' | 'defaite', chef?: Family) => appliquer(e, { type: 'championnat', manche, chef, signature, issue }, AT);

  it('poule : la Signature change à chaque duel, gagné ou perdu ; une différente pour chaque victoire ; vérifié dans la logique pure', () => {
    let e = v();
    let r = champ(e, 'poule', 'Voile', 'defaite', 'Cendre');
    expect(r.refus).toBeUndefined();
    e = r.etat;
    // le même chef rejoué avec la même Signature : refusé (elle doit changer) ; avec une autre : accepté
    expect(champ(e, 'poule', 'Voile', 'victoire', 'Cendre').refus).toMatch(/change à chaque duel/);
    r = champ(e, 'poule', 'Astre', 'victoire', 'Cendre');
    expect(r.refus).toBeUndefined();
    e = r.etat;
    expect(champ(e, 'poule', 'Astre', 'victoire', 'Ronce').refus).toMatch(/déjà servi|change à chaque duel/);
    e = champ(e, 'poule', 'Voile', 'victoire', 'Ronce').etat;
    e = champ(e, 'poule', 'Cendre', 'victoire', 'Astre').etat;
    expect(Object.keys(e.competitions.championnat.poule).sort()).toEqual(['Astre', 'Cendre', 'Ronce']);
    // la poule est close : un duel de poule de plus est refusé, la manche est le Miroir
    expect(champ(e, 'poule', 'Ronce', 'victoire', 'Voile').refus).toMatch(/manche « miroir »/);
  });

  it('Finale : la Signature change entre deux manches (refus sinon) ; deux manches gagnantes donnent le titre ; aucune statistique modifiée', () => {
    let e = v();
    for (const [s, c] of [['Voile', 'Cendre'], ['Astre', 'Ronce'], ['Cendre', 'Voile']] as const) e = champ(e, 'poule', s, 'victoire', c).etat;
    e = champ(e, 'miroir', 'Ronce', 'victoire').etat;
    e = champ(e, 'finale', 'Ronce', 'victoire').etat;
    expect(champ(e, 'finale', 'Ronce', 'victoire').refus).toMatch(/Changez de Signature/);
    const avant = e.combats;
    e = champ(e, 'finale', 'Astre', 'victoire').etat;
    expect(e.competitions.championnat.titre).toBe(true);
    expect(chapitreDetaille(e)).toBe('titre');
    expect(e.combats).toBe(avant);
  });

  it('le Miroir : construit sur les deux familles les plus jouées des cinq derniers duels ; contre Kaï, ou un bras droit d’une autre maison pour la Cendre', () => {
    const h = [{ familles: { Voile: 9, Astre: 2 } }, { familles: { Astre: 8, Ronce: 1 } }, { familles: { Ronce: 3 } }];
    expect(famillesDominantes(h, 'Ronce')).toEqual(['Astre', 'Voile']);
    expect(famillesDominantes([], 'Ronce')).toEqual(['Ronce', 'Cendre']);
    // seuls les cinq derniers comptent
    expect(famillesDominantes([{ familles: { Cendre: 99 } }, ...Array(5).fill({ familles: { Voile: 1, Ronce: 1 } })], 'Astre')).toEqual(['Voile', 'Ronce']);
    const e = v();
    const kai = duelChampionnat('miroir', e, 1, undefined, h);
    expect(kai.personnalite.name).toBe('Kaï');
    const fam = (d: string) => d.split('-')[0];
    const vars = new Set(kai.config.players.p2.deck!.filter((d) => !d.endsWith('-basic') && !d.startsWith('neutre-') && !d.startsWith('sig-')).map(fam));
    expect([...vars].sort()).toEqual(['Astre', 'Cendre', 'Voile']);
    expect(kai.config.players.p2.signature).toBe('Cendre');
    expect(kai.config.players.p2.hp).toBe(PV_ADVERSE.championnat[3]);
    const cendre = { ...e, affiliation: 'Cendre' as const };
    const autre = duelChampionnat('miroir', cendre, 1, undefined, [{ familles: { Cendre: 9, Ronce: 4 } }]);
    expect(autre.personnalite.name).toBe(figureDe('Ronce', 'brasDroit').nom);
    expect(autre.config.players.p2.signature).toBe('Ronce');
  });

  it('la Tenante suit son plan public : une Signature annoncée par manche', () => {
    let e = v();
    for (const [s, c] of [['Voile', 'Cendre'], ['Astre', 'Ronce'], ['Cendre', 'Voile']] as const) e = champ(e, 'poule', s, 'victoire', c).etat;
    e = champ(e, 'miroir', 'Ronce', 'victoire').etat;
    const sigs: (Family | null)[] = [];
    for (const s of ['Ronce', 'Cendre'] as const) {
      sigs.push(duelChampionnat('finale', e, 1).config.players.p2.signature ?? null);
      e = champ(e, 'finale', s, 'defaite').etat;
    }
    // deux manches perdues : la finale recommence, le plan aussi
    expect(e.competitions.championnat.finale).toEqual([]);
    expect(sigs).toEqual([PLAN_TENANTE[0], PLAN_TENANTE[1]]);
    expect(duelChampionnat('finale', e, 1).config.players.p2.signature).toBe(PLAN_TENANTE[0]);
  });

  it('les familles des Primaires révélées par le joueur sont lues dans le journal public', () => {
    const ev = (p1: string, seq: number) => ({ seq, turn: seq, phase: 'TACTICS', vis: 'public', kind: 'primariesRevealed', data: { p1: { defId: p1, stance: 'assault' }, p2: { defId: 'Cendre-1-basic', stance: 'guard' } } });
    const f = faitsPublics([ev('Voile-2-basic', 1), ev('Voile-3-dissimulation', 2), ev('Astre-1-basic', 3)] as never);
    expect(f.familles).toEqual({ Voile: 2, Astre: 1 });
  });

  it('le héraut du Tournoi se tient dans la Grande Cour dès l’ouverture du Championnat (ville en rangs seulement)', () => {
    const d = nouveauDirecteur(1);
    expect(poses(d, trame()[3]!, 'cour', true).some((p) => p.id === 'heraut')).toBe(false);
    const p = poses(d, v(), 'cour', true).find((x) => x.id === 'heraut');
    expect(p?.repere).toBe('!');
    expect(poses(d, v(), 'parvis', true).some((x) => x.id === 'heraut')).toBe(false);
  });
});
