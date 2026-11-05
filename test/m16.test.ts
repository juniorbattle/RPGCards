// M16 — chasse aux cartes en ville et Techniques gagnées (contrat `docs/m16/01_CHASSE_ET_TECHNIQUES.md`, fiche
// `docs/FICHE_ARBITRAGES_M16.md`) : calendrier des Techniques, armes égales, points de collecte, gardiens, pistes.
import { describe, expect, it } from 'vitest';
import { CATALOG } from '../src/game/catalog/cards';
import { appliquer, chapitreDetaille, collecteDe, nouvelleAventure, techniquesEnJeu, type AventureEtat, type Evenement } from '../src/aventure/aventure';
import { validerDeckAv } from '../src/aventure/deck';
import { collectionDe, variantesIdentite } from '../src/aventure/registre';
import { duelGardien, duelPrologue, techniquesAdverses } from '../src/aventure/rencontres';
import { figureDe, FIGURES } from '../src/aventure/modele';
import { POINTS_COLLECTE, pointCollecte } from '../src/aventure/collecteDonnees';
import { famillesCollecte, gardienPresent, pisteAEntendre, pointActif, pointsActifs, recompensePoint, variantesATrouver } from '../src/aventure/collecte';
import { choixVariante, conclureDuel } from '../src/aventure/fin';
import { nouvelleSauvegarde, validerSauvegarde } from '../src/aventure/sauvegarde';
import { ilotNu } from '../src/aventure/ilots';
import { blocked, zonesAt } from '../src/ville/monde';
import { QUARTIERS_AJOUTES, type IlotId } from '../src/ville/ilots';
import { RENCONTRES } from '../src/aventure/directeur';

const AT = '2026-11-05T12:00:00.000Z';

function run(e: AventureEtat, evs: Evenement[]): { etat: AventureEtat; gains: string[]; refus: string[] } {
  let etat = e;
  const gains: string[] = [];
  const refus: string[] = [];
  for (const ev of evs) {
    const r = appliquer(etat, ev, AT);
    if (r.refus) refus.push(r.refus);
    etat = r.etat;
    gains.push(...r.gains.map((g) => g.key));
  }
  return { etat, gains, refus };
}
const prologue = (t: 'Sondage' | 'Recentrage' | null = 'Sondage'): AventureEtat => run(nouvelleAventure(AT, t ?? undefined), [
  { type: 'scene', id: 'P1' }, { type: 'scene', id: 'P2' }, { type: 'duelPrologue', issue: 'victoire', faits: { assautsGagnes: 3, gardesGagnees: 1, interferencesReussies: 0 } },
]).etat;
const defi = (id: string, issue: 'victoire' | 'defaite' = 'victoire', duel = id): Evenement[] => [{ type: 'lancerDefi', figure: id }, { type: 'duelStructurant', figure: id, issue, duel }];
const maison = (f: 'Cendre' | 'Ronce' | 'Voile' | 'Astre', e = prologue()) => run(e, [{ type: 'confirmer', famille: f }, ...defi(figureDe(f, 'cadet').id), ...defi(figureDe(f, 'brasDroit').id), ...defi(figureDe(f, 'chef').id)]);

describe('M16 — Techniques gagnées (fiche T1 à T6)', () => {
  it('T1 : une seule Technique au départ, au choix, et le deck est légal', () => {
    for (const t of ['Sondage', 'Recentrage'] as const) {
      const e = nouvelleAventure(AT, t);
      expect(e.calendrier).toBe('m16');
      expect(collectionDe(e.registre).techniques).toEqual([t]);
      expect(e.deck.techniques).toEqual([t]);
      expect(validerDeckAv(e.deck, collectionDe(e.registre))).toEqual([]);
    }
  });
  it('T6 : sans Technique choisie, le calendrier d’avant (les aventures déjà commencées gardent tout)', () => {
    const e = nouvelleAventure(AT);
    expect(e.calendrier).toBeUndefined();
    expect(collectionDe(e.registre).techniques).toEqual(['Sondage', 'Recentrage']);
    const r = run(prologue(null), [{ type: 'confirmer', famille: 'Ronce' }]);
    expect(r.gains).toContain('technique:Rupture');
  });
  it('T3 : l’affiliation ne donne plus la Technique de la famille ; T2 : l’autre Technique de la rue au premier cadet', () => {
    const a = run(prologue('Sondage'), [{ type: 'confirmer', famille: 'Ronce' }]);
    expect(a.gains).toEqual(['basics:Ronce']);
    expect(a.etat.deck.techniques).toEqual(['Sondage']);
    expect(validerDeckAv(a.etat.deck, collectionDe(a.etat.registre))).toEqual([]);
    expect(techniquesEnJeu(a.etat, figureDe('Ronce', 'cadet').id)).toEqual(['Recentrage']);
    const b = run(a.etat, defi(figureDe('Ronce', 'cadet').id));
    expect(b.gains).toContain('technique:Recentrage');
    expect(b.etat.deck.techniques).toEqual(['Sondage', 'Recentrage']);
    expect(collectionDe(b.etat.registre).techniques).toEqual(['Sondage', 'Recentrage']);
    // une défaite ne donne rien ; une revanche gagnée ne redonne rien
    expect(run(a.etat, defi(figureDe('Ronce', 'cadet').id, 'defaite')).gains).toEqual([]);
    expect(run(b.etat, defi(figureDe('Ronce', 'cadet').id, 'victoire', 'r2')).gains.filter((g) => g.startsWith('technique:'))).toEqual([]);
  });
  it('T3 : la Technique de la famille à la victoire sur son chef, avec la Signature (équipée s’il reste une place)', () => {
    const r = maison('Cendre');
    expect(r.gains).toEqual(expect.arrayContaining(['technique:Recentrage', 'technique:Lecture', 'signature:Cendre']));
    expect(r.gains.indexOf('technique:Lecture')).toBeGreaterThan(r.gains.indexOf('signature:Cendre'));
    expect(collectionDe(r.etat.registre).techniques).toEqual(['Sondage', 'Recentrage', 'Lecture']);
    expect(r.etat.deck.techniques).toHaveLength(2);
    expect(validerDeckAv(r.etat.deck, collectionDe(r.etat.registre))).toEqual([]);
    // l'engagement d'une autre famille ne donne que ses cartes de base ; sa Technique, contre son chef
    const g = run(r.etat, [{ type: 'engager', famille: 'Voile' }]);
    expect(g.gains).toEqual(['basics:Voile']);
    expect(techniquesEnJeu(g.etat, figureDe('Voile', 'chef').id)).toEqual(['Dissipation']);
    const v = run(g.etat, [...defi(figureDe('Voile', 'cadet').id), ...defi(figureDe('Voile', 'brasDroit').id), ...defi(figureDe('Voile', 'chef').id)]);
    expect(v.gains).toContain('technique:Dissipation');
  });
  it('T5 : à armes égales, l’adversaire n’équipe pas plus de Techniques que le joueur n’en a apprises', () => {
    const e = prologue('Recentrage');
    expect(techniquesAdverses(e)).toBe(1);
    expect(duelPrologue(7, e).config.players.p2.techniques).toHaveLength(1);
    const apres = run(e, [{ type: 'confirmer', famille: 'Astre' }, ...defi(figureDe('Astre', 'cadet').id)]).etat;
    expect(techniquesAdverses(apres)).toBe(2);
    // calendrier d'avant : rien ne change
    expect(duelPrologue(7, prologue(null)).config.players.p2.techniques).toHaveLength(2);
  });
  it('T1 : la sauvegarde d’une nouvelle aventure au calendrier M16 est valide', () => {
    const s = nouvelleSauvegarde(new Date(AT), 'Lou', 42, undefined, 'Recentrage');
    expect(s.etat.calendrier).toBe('m16');
    expect(validerSauvegarde(JSON.parse(JSON.stringify(s)))).toEqual([]);
  });
});

describe('M16 — points de collecte (fiche C1 à C5)', () => {
  it('dix points, deux par chapitre, trois sortes de garde, six quartiers', () => {
    expect(POINTS_COLLECTE).toHaveLength(10);
    for (const ch of ['I', 'II', 'III', 'IV', 'V']) expect(POINTS_COLLECTE.filter((p) => p.chapitre === ch)).toHaveLength(2);
    expect(new Set(POINTS_COLLECTE.map((p) => p.garde))).toEqual(new Set(['libre', 'rumeur', 'gardien']));
    expect(new Set(POINTS_COLLECTE.map((p) => p.ilot)).size).toBe(6);
    for (const p of POINTS_COLLECTE) expect(!!p.gardien).toBe(p.garde === 'gardien');
  });
  it('chaque point et chaque gardien se tiennent dans la ville en rangs : praticables, hors des autres zones, loin des personnages', () => {
    const ouverts = new Set<IlotId>(QUARTIERS_AJOUTES);
    for (const p of POINTS_COLLECTE) {
      const ilot = ilotNu(p.ilot, true, ouverts);
      expect(blocked(ilot, p.at, 0.6), `${p.id} bloqué`).toBe(false);
      expect(zonesAt(ilot, p.at), `${p.id} dans une zone`).toEqual([]);
      const places = RENCONTRES.flatMap((r) => r.lieux).filter((l) => l.ilot === p.ilot).map((l) => l.at).concat(FIGURES.filter((f) => f.ilot === p.ilot).map((f) => f.at));
      for (const q of places) expect(Math.hypot(q.x - p.at.x, q.z - p.at.z), `${p.id} trop près d’un personnage`).toBeGreaterThanOrEqual(1.8);
      if (p.gardien) {
        expect(blocked(ilot, p.gardien.at), `gardien de ${p.id} bloqué`).toBe(false);
        const d = Math.hypot(p.gardien.at.x - p.at.x, p.gardien.at.z - p.at.z);
        expect(d).toBeGreaterThan(0.8);
        expect(d).toBeLessThan(1.6);
        for (const q of places) expect(Math.hypot(q.x - p.gardien.at.x, q.z - p.gardien.at.z), `gardien de ${p.id} trop près`).toBeGreaterThanOrEqual(1.2);
      }
    }
  });
  it('éteints au prologue ; les points du chapitre I s’allument avec la famille, ceux du II après son chef', () => {
    const e0 = prologue();
    expect(chapitreDetaille(e0)).toBe('prologue');
    expect(pointsActifs(e0)).toEqual([]);
    const e1 = run(e0, [{ type: 'confirmer', famille: 'Cendre' }]).etat;
    expect(pointsActifs(e1).map((p) => p.id)).toEqual(['quai-caisses', 'quai-chapelle']);
    const e2 = maison('Cendre').etat;
    expect(chapitreDetaille(e2)).toBe('II');
    expect(pointsActifs(e2).map((p) => p.chapitre)).toEqual(['I', 'I', 'II', 'II']);
  });
  it('C1 : une variante qui manque, d’une famille rejointe ou engagée, tirée à graine fixe ; le point s’éteint', () => {
    const e = run(prologue(), [{ type: 'confirmer', famille: 'Voile' }]).etat;
    expect(famillesCollecte(e)).toEqual(['Voile']);
    const v = recompensePoint(e, 'quai-caisses', 1234)!;
    expect(CATALOG[v]!.family).toBe('Voile');
    expect(recompensePoint(e, 'quai-caisses', 1234)).toBe(v);
    const r = run(e, [{ type: 'collecte', point: 'quai-caisses', variante: v }]);
    expect(r.refus).toEqual([]);
    expect(r.gains).toEqual([`variante:${v}`]);
    expect(r.etat.registre.find((g) => g.key === `variante:${v}`)!.source).toBe('collecte:quai-caisses');
    expect(collecteDe(r.etat).trouves).toEqual(['quai-caisses']);
    expect(pointActif(r.etat, pointCollecte('quai-caisses')!)).toBe(false);
    // ramassé deux fois : refusé ; une carte d'une famille non approchée : refusée
    expect(run(r.etat, [{ type: 'collecte', point: 'quai-caisses', variante: recompensePoint(r.etat, 'quai-caisses', 1)! }]).refus).toHaveLength(1);
    expect(run(e, [{ type: 'collecte', point: 'quai-chapelle', variante: variantesIdentite('Cendre-3')[0]! }]).refus).toHaveLength(1);
  });
  it('C1 : plus rien à trouver dans ses familles : le point s’éteint sans carte', () => {
    let e = run(prologue(), [{ type: 'confirmer', famille: 'Astre' }]).etat;
    for (const v of variantesATrouver(e)) e = run(e, [{ type: 'collecte', point: 'quai-caisses', variante: v }]).etat.registre.length ? appliquerBrutVariante(e, v) : e;
    expect(variantesATrouver(e)).toEqual([]);
    expect(recompensePoint(e, 'quai-chapelle', 9)).toBeNull();
    const r = run(e, [{ type: 'collecte', point: 'quai-chapelle' }]);
    expect(r.refus).toEqual([]);
    expect(collecteDe(r.etat).trouves).toContain('quai-chapelle');
  });
  it('C3 : un point gardé ne se ramasse qu’après la victoire sur son gardien (duel, puis carte)', () => {
    const e = run(maison('Ronce').etat, []).etat;
    const p = pointCollecte('parvis-tableau')!;
    expect(pointActif(e, p)).toBe(true);
    expect(gardienPresent(e, p)).toBe(true);
    const v = recompensePoint(e, p.id, 5)!;
    expect(run(e, [{ type: 'collecte', point: p.id, variante: v }]).refus).toHaveLength(1);
    const prevu = duelGardien(p.id, e, 77);
    expect(prevu.rencontre).toBe('gardien:parvis-tableau');
    expect(prevu.config.players.p2.techniques.length).toBeLessThanOrEqual(2);
    expect(run(e, [{ type: 'gardien', point: p.id, issue: 'defaite' }]).etat.collecte?.gardiens ?? []).toEqual([]);
    const g = run(e, [{ type: 'gardien', point: p.id, issue: 'victoire' }]).etat;
    expect(gardienPresent(g, p)).toBe(false);
    expect(run(g, [{ type: 'collecte', point: p.id, variante: v }]).refus).toEqual([]);
  });
  it('C3 : la fin d’un duel contre un gardien le note battu', () => {
    const s = nouvelleSauvegarde(new Date(AT), 'Lou', 3, undefined, 'Sondage');
    s.etat = maison('Ronce', s.etat.prologue === null ? run(s.etat, [{ type: 'scene', id: 'P2' }, { type: 'duelPrologue', issue: 'victoire', faits: { assautsGagnes: 0, gardesGagnees: 3, interferencesReussies: 0 } }]).etat : s.etat).etat;
    const duel = { id: 'a9', rencontre: 'gardien:parvis-tableau', seed: 1, startedAt: AT, rules: '', catalog: '', config: duelGardien('parvis-tableau', s.etat, 1).config, commands: [], hash: '', turn: 3, pret: false };
    conclureDuel(s, duel, [], 'victoire', 3, AT);
    expect(collecteDe(s.etat).gardiens).toEqual(['parvis-tableau']);
  });
  it('C3 : une rumeur met sur la piste des recoins d’abord, une seule fois chacun', () => {
    const e = run(prologue(), [{ type: 'confirmer', famille: 'Cendre' }]).etat;
    const p1 = pisteAEntendre(e)!;
    expect(p1.garde).toBe('rumeur');
    const e2 = run(e, [{ type: 'piste', point: p1.id }]).etat;
    const p2 = pisteAEntendre(e2)!;
    expect(p2.id).not.toBe(p1.id);
    const e3 = run(e2, [{ type: 'piste', point: p2.id }]).etat;
    expect(pisteAEntendre(e3)).toBeNull();
  });
  it('contrat §2.5 : une variante trouvée en ville avant le lieutenant : le choix porte sur celles qui manquent', () => {
    const e = run(prologue(), [{ type: 'confirmer', famille: 'Cendre' }]).etat;
    const ids = variantesIdentite('Cendre-3');
    const t = run(e, [{ type: 'collecte', point: 'quai-caisses', variante: ids[1]! }]).etat;
    expect(choixVariante(t, figureDe('Cendre', 'cadet').id)).toEqual([ids[0], ids[2]]);
    expect(choixVariante(e, figureDe('Cendre', 'cadet').id)).toEqual(ids);
  });
});

/** Accorde une variante comme un point le ferait, sans éteindre de point (pour épuiser les variantes d'une famille). */
function appliquerBrutVariante(e: AventureEtat, v: string): AventureEtat {
  const r = appliquer(e, { type: 'collecte', point: 'quai-caisses', variante: v }, AT);
  if (r.refus) return e;
  return { ...r.etat, collecte: { ...collecteDe(r.etat), trouves: collecteDe(r.etat).trouves.filter((x) => x !== 'quai-caisses') } };
}
