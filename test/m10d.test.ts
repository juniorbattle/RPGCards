/**
 * M10-D — les trois autres voies (feuille de route `docs/m10/FEUILLE_DE_ROUTE_M10.md`) : la Salle des Bannières
 * (engagement officiel), les Basics à l'engagement une seule fois et jamais si elles sont déjà reçues, l'ordre libre des
 * trois familles (toutes les permutations, pour chaque famille d'accueil, avec et sans changement d'affiliation), la
 * transition du deck jusqu'au format standard (A-6), jusqu'à quatre Signatures possédées et une seule équipée, les
 * Épreuves et les Joutes (variantes I et II), la collection reconstruite depuis le registre.
 */
import { describe, expect, it } from 'vitest';
import { FAMILIES, type Family } from '../src/game/catalog/cards';
import { Match } from '../src/game/match';
import { PROFILES } from '../src/game/ai/policy';
import { createGame } from '../src/game/engine/engine';
import { validateDeck } from '../src/product/deck';
import { apercuEngagement, appliquer, bannieres, chapitre, controlerEtat, nouvelleAventure, peutEngager, statutDefi, type AventureEtat, type Evenement } from '../src/aventure/aventure';
import { deckMoteur, equiperSignature, equiperTechnique, siegeAventure, standardLegal, validerDeckAv, versStandard } from '../src/aventure/deck';
import { vueCollection } from '../src/aventure/collection';
import { statutEpreuve, statutJoute, varianteDe } from '../src/aventure/competitions';
import { figure, figureDe, isNeutre, MAISONS, ROLES } from '../src/aventure/modele';
import { objectif, quetes } from '../src/aventure/quetes';
import { collectionDe, type CollectionAv, type Gain } from '../src/aventure/registre';
import { duelFacultatif, duelFigure, niveauDe } from '../src/aventure/rencontres';
import { MagasinAventure, nouvelleSauvegarde } from '../src/aventure/sauvegarde';

const AT = '2026-10-20T12:00:00.000Z';
const FAITS0 = { assautsGagnes: 0, gardesGagnees: 0, interferencesReussies: 0 };

interface Trace { etat: AventureEtat; gains: Gain[]; refus: string[] }

/** Applique les faits un à un ; `apres` est appelé après chacun (contrôles « après chaque fait »). */
function run(e: AventureEtat, evs: Evenement[], apres?: (e: AventureEtat, gains: Gain[]) => void): Trace {
  const gains: Gain[] = [];
  const refus: string[] = [];
  for (const ev of evs) {
    const r = appliquer(e, ev, AT);
    e = r.etat;
    gains.push(...r.gains);
    if (r.refus) refus.push(r.refus);
    apres?.(e, r.gains);
  }
  return { etat: e, gains, refus };
}

const cles = (gs: readonly Gain[]) => gs.map((g) => g.key);
const prologue = (): AventureEtat => run(nouvelleAventure(AT), [{ type: 'scene', id: 'P1' }, { type: 'scene', id: 'P2' }, { type: 'duelPrologue', issue: 'victoire', faits: FAITS0 }]).etat;
const defi = (id: string, issue: 'victoire' | 'defaite' | 'abandon', duel: string): Evenement[] => [{ type: 'lancerDefi', figure: id }, { type: 'duelStructurant', figure: id, issue, duel }];
const conquerir = (f: Family, tag: string): Evenement[] => ROLES.flatMap((r) => defi(figureDe(f, r).id, 'victoire', `${tag}-${r}`));
const grises = (e: AventureEtat) => e.deck.cartes.filter(isNeutre).length;
const nBasics = (e: AventureEtat) => e.registre.filter((g) => g.kind === 'basics').length;

/** Toutes les permutations d'une liste. */
const permutations = <T>(xs: readonly T[]): T[][] => (xs.length <= 1 ? [[...xs]] : xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p])));

/** Le validateur du mode Duel STANDARD (`src/product/deck.ts`) sur le deck de l'aventure traduit, ou null s'il n'est pas au format standard. */
function validateurStandard(e: AventureEtat): string[] | null {
  const s = versStandard(e.deck);
  if (!s) return null;
  const col = collectionDe(e.registre);
  return validateDeck(s, { variants: col.variantes, signatures: col.signatures, techniques: col.techniques }).map((p) => p.text);
}

/** Collection accumulée gain par gain (ce que les écrans de récompense ont remis), sans relire le registre. */
function accumuler(col: CollectionAv, gains: readonly Gain[]): CollectionAv {
  const c: CollectionAv = structuredClone(col);
  for (const g of gains) {
    if (g.kind === 'neutres') for (const id of g.items) c.neutres[Number(id.slice(7)) as 1 | 2 | 3 | 4] += 1;
    else if (g.kind === 'basics') c.basics.push(g.family!);
    else if (g.kind === 'variante') c.variantes.push(g.items[0]!);
    else if (g.kind === 'signature') c.signatures.push(g.family!);
    else c.techniques.push(g.items[0] as CollectionAv['techniques'][number]);
  }
  return c;
}
const trie = (c: CollectionAv) => ({ neutres: c.neutres, basics: [...c.basics].sort(), variantes: [...c.variantes].sort(), signatures: [...c.signatures].sort(), techniques: [...c.techniques].sort() });

class Mem { m = new Map<string, string>(); getItem(k: string) { return this.m.get(k) ?? null; } setItem(k: string, v: string) { this.m.set(k, v); } removeItem(k: string) { this.m.delete(k); } }

/**
 * Parcours complet jusqu'aux quatre chefs : affiliation (après des changements éventuels : `avant`), la maison, puis
 * les trois autres familles dans l'ordre `ordre` (Salle des Bannières, cadet, bras droit, chef), avec l'Épreuve de chaque
 * famille après son engagement (une défaite au milieu remet la série à zéro) et sa Joute dès qu'elle est ouverte. Les
 * contrôles de la feuille de route sont faits après chaque fait.
 */
function parcours(accueil: Family, ordre: readonly Family[], avant: readonly Family[] = []): { e: AventureEtat; gains: Gain[] } {
  let e = prologue();
  const tous: Gain[] = [...e.registre];
  const verifier = (x: AventureEtat, gains: Gain[]) => {
    tous.push(...gains);
    const col = collectionDe(x.registre);
    expect(validerDeckAv(x.deck, col), cles(gains).join(',')).toEqual([]);
    expect(controlerEtat(x)).toEqual([]);
    expect(deckMoteur(x.deck).filter((c) => c.startsWith('sig-')).length).toBeLessThanOrEqual(1);
    expect(col.signatures.length).toBeLessThanOrEqual(4);
    // une clé de registre est unique ; une variante n'arrive jamais sans les Basics de sa famille
    expect(new Set(x.registre.map((g) => g.key)).size).toBe(x.registre.length);
    for (const v of col.variantes) expect(col.basics).toContain(v.split('-')[0]);
    // après les quatre `basics:*`, le validateur du mode standard accepte le deck tel quel (Signature équipée)
    if (col.basics.length === 4 && x.deck.signature) expect(validateurStandard(x)).toEqual([]);
  };
  const faire = (evs: Evenement[]) => { const r = run(e, evs, verifier); expect(r.refus).toEqual([]); e = r.etat; return r; };
  const joutes = new Set<Family>();
  const jouter = (f: Family) => {
    if (joutes.has(f)) return;
    if (f === 'Voile' && !e.deck.techniques.some((t) => t === 'Lecture' || t === 'Dissipation')) e = { ...e, deck: equiperTechnique(e.deck, 'Dissipation') };
    if (!statutJoute(e.competitions, e.vaincues, f, e.deck).ouvert) return;
    const r = faire([{ type: 'joute', famille: f, issue: 'defaite', duel: `j-${f}-0` }, { type: 'joute', famille: f, issue: 'victoire', duel: `j-${f}-1` }]);
    expect(cles(r.gains)).toEqual([`variante:${varianteDe(f, 2)}`]);
    joutes.add(f);
  };
  const epreuve = (f: Family) => {
    expect(statutEpreuve(e.competitions, e.registre, f).ouvert).toBe(true);
    const r = faire([
      { type: 'epreuve', famille: f, issue: 'victoire', duel: `e-${f}-1` }, { type: 'epreuve', famille: f, issue: 'defaite', duel: `e-${f}-2` },
      ...[3, 4, 5].map((k): Evenement => ({ type: 'epreuve', famille: f, issue: 'victoire', duel: `e-${f}-${k}` })),
    ]);
    expect(cles(r.gains)).toEqual([`variante:${varianteDe(f, 1)}`]);
  };

  // affiliation : d'abord les familles quittées (changement avant le premier lieutenant), puis la famille d'accueil
  const premieres = [...avant, accueil];
  faire([{ type: 'confirmer', famille: premieres[0]! }, ...premieres.slice(1).map((f): Evenement => ({ type: 'changer', famille: f }))]);
  expect(e.affiliation).toBe(accueil);
  expect(nBasics(e)).toBe(premieres.length);
  expect(grises(e)).toBe(16 - 4 * premieres.length);
  faire(conquerir(accueil, 'maison'));
  jouter(accueil);
  expect(e.deck.signature).toBe(accueil);

  for (const [i, f] of ordre.entries()) {
    const ap = apercuEngagement(e, f);
    expect(ap.ok).toBe(true);
    const n0 = grises(e);
    const deja = avant.includes(f);
    expect(ap.basicsDeja).toBe(deja);
    const r = faire([{ type: 'engager', famille: f }]);
    // l'aperçu dit exactement ce que la machine a fait
    expect(ap.neutres).toEqual([n0, grises(e)]);
    expect(ap.standard).toBe(standardLegal(e.deck, collectionDe(e.registre)));
    if (deja) {
      // Basics déjà reçues (affiliation quittée) : rien n'est remis, le deck ne change pas
      expect(r.gains).toEqual([]);
      expect(grises(e)).toBe(n0);
    } else {
      expect(cles(r.gains).sort()).toEqual([`basics:${f}`, `technique:${MAISONS[f].technique}`].sort());
      expect(grises(e)).toBe(n0 - 4);
    }
    // engager deux fois est refusé ; la famille est « défiée », ses figures s'ouvrent dans l'ordre
    expect(appliquer(e, { type: 'engager', famille: f }, AT).refus).toMatch(/déjà engagé/);
    expect(e.familles[f]).toBe('defiee');
    expect(statutDefi(e, figureDe(f, 'cadet')).ouvert).toBe(true);
    expect(statutDefi(e, figureDe(f, 'chef')).ouvert).toBe(false);
    epreuve(f);
    const sigs = collectionDe(e.registre).signatures.length;
    faire(conquerir(f, `voie${i}`).slice(0, 4));
    jouter(f);
    faire(conquerir(f, `voie${i}`).slice(4));
    expect(e.familles[f]).toBe('chef');
    expect(collectionDe(e.registre).signatures).toHaveLength(sigs + 1);
    // une Signature de plus possédée, toujours celle de la famille d'accueil équipée (le joueur choisit)
    expect(e.deck.signature).toBe(accueil);
  }
  epreuve(accueil);
  for (const f of FAMILIES) jouter(f);
  return { e, gains: tous };
}

describe('M10-D — engager le défi d’une autre famille (Salle des Bannières, ADR 031 §4)', () => {
  it('entrer dans un quartier, parler à un membre ou battre un membre n’engage pas le défi', () => {
    let e = run(prologue(), [{ type: 'confirmer', famille: 'Ronce' }, ...conquerir('Ronce', 'm')]).etat;
    const avant = JSON.stringify({ familles: e.familles, registre: e.registre, deck: e.deck });
    for (const f of FAMILIES.filter((x) => x !== 'Ronce')) {
      const r = run(e, [
        { type: 'visite', lieu: MAISONS[f].ilot }, { type: 'rencontre', personne: figureDe(f, 'cadet').id }, { type: 'rencontre', personne: figureDe(f, 'chef').id },
        // un duel de rue gagné contre un membre de la famille (le docker, la joueuse, le commis : PNJ à famille)
        { type: 'combat', issue: 'victoire' },
      ]);
      expect(r.refus).toEqual([]);
      e = r.etat;
      expect(e.familles[f]).toBe('invite');
      // ses lieutenants restent fermés, un duel structurant non lancé ne compte pas, son Épreuve reste fermée
      expect(statutDefi(e, figureDe(f, 'cadet')).raison).toMatch(/Salle des Bannières/);
      expect(appliquer(e, { type: 'lancerDefi', figure: figureDe(f, 'cadet').id }, AT).refus).toBeTruthy();
      expect(appliquer(e, { type: 'duelStructurant', figure: figureDe(f, 'cadet').id, issue: 'victoire', duel: 'x' }, AT).refus).toBeTruthy();
      expect(appliquer(e, { type: 'epreuve', famille: f, issue: 'victoire', duel: 'x' }, AT).refus).toMatch(/cartes/);
    }
    // les duels de rue sont joués contre des membres de famille (rien à gagner) ; rien n'a bougé hors des combats
    const rue = duelFacultatif('rue-docker', e, 5);
    expect(rue.enjeu).toBeNull();
    expect(rue.personnalite.family).not.toBeNull();
    expect(JSON.stringify({ familles: e.familles, registre: e.registre, deck: e.deck })).toBe(avant);
    expect(e.combats).toBe(3);
  });

  it('jamais avant le chef de la famille d’accueil ; la Salle montre les quatre bannières, sans rien cacher', () => {
    let e = prologue();
    expect(peutEngager(e, 'Voile').ok).toBe(false);
    e = run(e, [{ type: 'confirmer', famille: 'Astre' }, ...defi('cadet-Astre', 'victoire', 'a1')]).etat;
    let b = bannieres(e);
    expect(Object.fromEntries(b.map((x) => [x.famille, x.etat]))).toEqual({ Cendre: 'fermee', Voile: 'fermee', Ronce: 'fermee', Astre: 'accueil' });
    expect(b.find((x) => x.famille === 'Voile')!.texte).toMatch(/chef de l’Astre/);
    // la raison d'un lieutenant fermé dit aussi qu'il faut d'abord battre son propre chef
    expect(statutDefi(e, figureDe('Voile', 'cadet')).raison).toMatch(/Battez d’abord le chef de l’Astre/);
    e = run(e, [...defi('brasDroit-Astre', 'victoire', 'a2'), ...defi('chef-Astre', 'victoire', 'a3'), { type: 'engager', famille: 'Voile' }]).etat;
    b = bannieres(e);
    expect(Object.fromEntries(b.map((x) => [x.famille, x.etat]))).toEqual({ Cendre: 'engageable', Voile: 'engagee', Ronce: 'engageable', Astre: 'accueil' });
    expect(b.find((x) => x.famille === 'Voile')!.texte).toMatch(/Lior/);
    e = run(e, conquerir('Voile', 'v')).etat;
    expect(bannieres(e).find((x) => x.famille === 'Voile')!.etat).toBe('conquise');
    // plusieurs défis peuvent être engagés en parallèle (PROGRESSION §3)
    e = run(e, [{ type: 'engager', famille: 'Cendre' }, { type: 'engager', famille: 'Ronce' }]).etat;
    expect([e.familles.Cendre, e.familles.Ronce]).toEqual(['defiee', 'defiee']);
  });

  it('les Basics à l’engagement une seule fois ; jamais si elles sont déjà reçues (changement d’affiliation), ni après un rechargement', () => {
    // la Ronce rejointe puis quittée pour la Cendre : ses Basics et sa Technique restent, sans double remise
    let e = run(prologue(), [{ type: 'confirmer', famille: 'Ronce' }, { type: 'changer', famille: 'Cendre' }]).etat;
    expect(collectionDe(e.registre).basics).toEqual(['Cendre', 'Ronce']);
    // revenir à la Ronce (toujours avant le premier lieutenant) ne redonne rien
    let r = run(e, [{ type: 'changer', famille: 'Ronce' }]);
    expect(r.gains).toEqual([]);
    expect(r.etat.deck).toEqual(e.deck);
    e = run(e, conquerir('Cendre', 'c')).etat;
    const ap = apercuEngagement(e, 'Ronce');
    expect([ap.ok, ap.basicsDeja, ap.techniqueDeja, ap.neutres]).toEqual([true, true, true, [8, 8]]);
    r = run(e, [{ type: 'engager', famille: 'Ronce' }]);
    expect(r.gains).toEqual([]);
    expect(r.etat.familles.Ronce).toBe('defiee');
    expect(r.etat.deck).toEqual(e.deck);
    expect(r.etat.registre.filter((g) => g.key === 'basics:Ronce')).toHaveLength(1);
    // après un rechargement, le même fait est refusé et ne remet rien
    const mem = new Mem();
    const st = new MagasinAventure(mem, () => new Date(AT));
    const s = nouvelleSauvegarde(new Date(AT), 'Lou', 3);
    s.etat = r.etat;
    expect(st.ecrire(s)).toEqual({ ok: true });
    const l = st.charger();
    expect(l.status).toBe('ok');
    if (l.status !== 'ok') return;
    const again = appliquer(l.save.etat, { type: 'engager', famille: 'Ronce' }, AT);
    expect(again.refus).toBeTruthy();
    expect(again.etat).toEqual(l.save.etat);
    // une famille jamais rejointe : quatre Basics, sa Technique, une carte grise de chaque Rang cède sa place
    const v = run(l.save.etat, [{ type: 'engager', famille: 'Voile' }, { type: 'engager', famille: 'Voile' }]);
    expect(cles(v.gains).sort()).toEqual(['basics:Voile', 'technique:Dissipation']);
    expect(v.refus).toHaveLength(1);
    expect(grises(v.etat)).toBe(4);
  });
});

describe('M10-D — ordre libre des trois autres familles (toutes les permutations, pour chaque famille d’accueil)', () => {
  for (const accueil of FAMILIES) {
    it(`${accueil} : les six ordres des trois autres familles mènent aux quatre chefs ; deck au format standard dès les quatre lots`, () => {
      const autres = FAMILIES.filter((x) => x !== accueil);
      const finals = new Set<string>();
      for (const ordre of permutations(autres)) {
        const { e } = parcours(accueil, ordre);
        expect(FAMILIES.every((f) => e.familles[f] === 'chef')).toBe(true);
        expect(chapitre(e)).toBe('championnat');
        const col = collectionDe(e.registre);
        expect([col.basics.length, col.variantes.length, col.signatures.length, grises(e)]).toEqual([4, 16, 4, 0]);
        expect(deckMoteur(e.deck)).toHaveLength(17);
        expect(validateurStandard(e)).toEqual([]);
        expect(quetes(e).find((q) => q.id === 'voies')!.etapes.every((x) => x.faite)).toBe(true);
        finals.add(JSON.stringify(trie(col)));
      }
      // l'ordre ne change rien à ce qui est possédé à la fin
      expect(finals.size).toBe(1);
    }, 30000);
  }

  it('avec un changement d’affiliation avant le premier lieutenant : toutes les familles quittées, toutes les familles d’accueil, tous les ordres', () => {
    let n = 0;
    for (const accueil of FAMILIES) for (const quittee of FAMILIES.filter((x) => x !== accueil)) {
      for (const ordre of permutations(FAMILIES.filter((x) => x !== accueil))) {
        const { e } = parcours(accueil, ordre, [quittee]);
        expect(FAMILIES.every((f) => e.familles[f] === 'chef')).toBe(true);
        expect(e.registre.filter((g) => g.kind === 'basics')).toHaveLength(4);
        expect(validateurStandard(e)).toEqual([]);
        n++;
      }
    }
    expect(n).toBe(4 * 3 * 6);
  }, 60000);

  it('transition du deck : 16, 12, 8, 4, 0 cartes grises ; validé par le standard dès le quatrième lot, et le moteur le joue', () => {
    let e = prologue();
    const suite: number[] = [grises(e)];
    e = run(e, [{ type: 'confirmer', famille: 'Voile' }]).etat;
    suite.push(grises(e));
    expect(validateurStandard(e)).toBeNull(); // cartes grises et pas encore de Signature
    e = run(e, conquerir('Voile', 'v')).etat;
    for (const f of ['Astre', 'Cendre', 'Ronce'] as const) {
      e = run(e, [{ type: 'engager', famille: f }]).etat;
      suite.push(grises(e));
      expect(validateurStandard(e)).toEqual(f === 'Ronce' ? [] : null);
      e = run(e, conquerir(f, f)).etat;
    }
    expect(suite).toEqual([16, 12, 8, 4, 0]);
    // les quatre familles au complet dans le deck, une Signature : 17 cartes que le moteur accepte et joue
    const cfg = { seed: 21, players: { p1: siegeAventure(e.deck, 'Vous', 80), p2: siegeAventure(e.deck, 'Miroir', 80) } };
    expect(() => createGame(cfg)).not.toThrow();
    const m = new Match(cfg, { p1: { profile: PROFILES.equilibre!, seed: 1 }, p2: { profile: PROFILES.offensif!, seed: 2 } });
    for (let t = 0; m.state.phase !== 'ENDED' && t < 400; t++) { m.stepAi(); if (m.state.phase === 'RESOLVED') m.nextTurn(); }
    expect(m.state.phase).toBe('ENDED');
  }, 30000);
});

describe('M10-D — Signatures, compétitions, collection', () => {
  it('jusqu’à quatre Signatures possédées, une seule équipée ; on en change entre deux duels', () => {
    const { e } = parcours('Cendre', ['Ronce', 'Voile', 'Astre']);
    const col = collectionDe(e.registre);
    expect(col.signatures).toEqual(['Cendre', 'Voile', 'Ronce', 'Astre']);
    // rejouer les chefs (revanches) n'ajoute aucune Signature
    const r = run(e, FAMILIES.flatMap((f) => defi(figureDe(f, 'chef').id, 'victoire', `rev-${f}`)));
    expect(r.gains).toEqual([]);
    expect(collectionDe(r.etat.registre).signatures).toHaveLength(4);
    for (const f of [...FAMILIES, null]) {
      const d = equiperSignature(e.deck, f);
      expect(validerDeckAv(d, col)).toEqual([]);
      expect(deckMoteur(d).filter((c) => c.startsWith('sig-'))).toEqual(f ? [`sig-${f}`] : []);
      expect(deckMoteur(d)).toHaveLength(f ? 17 : 16);
      // la Signature équipée est celle que le duel suivant joue
      expect(duelFigure('chef-Voile', { ...e, deck: d }, 3, true).config.players.p1.signature).toBe(f);
    }
    // une Signature non possédée n'est jamais équipable
    const avant = run(prologue(), [{ type: 'confirmer', famille: 'Cendre' }, ...conquerir('Cendre', 'c')]).etat;
    expect(validerDeckAv(equiperSignature(avant.deck, 'Astre'), collectionDe(avant.registre)).map((p) => p.code)).toContain('signature');
  });

  it('Épreuves et Joutes des trois autres familles : variantes I et II ; les seize variantes A au bout du parcours ; B et C en revanche', () => {
    const { e } = parcours('Astre', ['Voile', 'Cendre', 'Ronce']);
    const col = collectionDe(e.registre);
    for (const f of FAMILIES) {
      expect(col.variantes).toEqual(expect.arrayContaining([varianteDe(f, 1), varianteDe(f, 2)]));
      expect(e.registre.find((g) => g.key === `variante:${varianteDe(f, 1)}`)!.source).toMatch(new RegExp(`^epreuve:${f}:`));
      expect(e.registre.find((g) => g.key === `variante:${varianteDe(f, 2)}`)!.source).toMatch(new RegExp(`^joute:${f}:`));
      expect(e.competitions.epreuves[f]!.gagnee && e.competitions.joutes[f]!.gagnee).toBe(true);
    }
    expect(col.variantes).toHaveLength(16);
    // avenant 09 : une série regagnée ou une Joute regagnée donne la variante suivante de son identité (B) ; le même fait
    // rejoué n'ajoute rien
    const r = run(e, [...[1, 2, 3].map((k): Evenement => ({ type: 'epreuve', famille: 'Voile', issue: 'victoire', duel: `z${k}` })), { type: 'joute', famille: 'Voile', issue: 'victoire', duel: 'z4' }]);
    expect(cles(r.gains)).toEqual(['variante:Voile-1-leurre', 'variante:Voile-2-echo']);
    expect(run(r.etat, [{ type: 'joute', famille: 'Voile', issue: 'victoire', duel: 'z4' }]).gains).toEqual([]);
  });

  it('la collection reconstruite depuis le registre est identique à la collection stockée (et à ce que les récompenses ont remis)', () => {
    const { e, gains } = parcours('Ronce', ['Astre', 'Cendre', 'Voile'], ['Voile']);
    const col = collectionDe(e.registre);
    // la sauvegarde ne garde que le registre (AV-07 : la collection se dérive du registre seul) ; relue, elle redonne la même
    const mem = new Mem();
    const st = new MagasinAventure(mem, () => new Date(AT));
    const s = nouvelleSauvegarde(new Date(AT), 'Noa', 7);
    s.etat = e;
    expect(st.ecrire(s)).toEqual({ ok: true });
    const l = st.charger();
    expect(l.status).toBe('ok');
    if (l.status !== 'ok') return;
    expect('collection' in l.save.etat).toBe(false);
    expect(collectionDe(l.save.etat.registre)).toEqual(col);
    expect(vueCollection(l.save.etat)).toEqual(vueCollection(e));
    // l'ordre du registre n'y fait rien
    expect(trie(collectionDe([...e.registre].reverse()))).toEqual(trie(col));
    // la collection accumulée gain par gain (écrans de récompense) est la même
    const vide: CollectionAv = { neutres: { 1: 0, 2: 0, 3: 0, 4: 0 }, basics: [], variantes: [], signatures: [], techniques: [] };
    expect(trie(accumuler(vide, gains))).toEqual(trie(col));
    // tout le parcours sans revanche : 16 neutres, 16 Basics, 16 variantes (une par identité), 4 Signatures, 6 Techniques ;
    // les 32 autres variantes (avenant 09) se gagnent en revanche ou au titre du Championnat
    expect(vueCollection(e).compte).toEqual({ possedees: 36, total: 68 });
    expect(col.techniques).toHaveLength(6);
  });
});

describe('M10-D — figures des trois autres familles, quêtes', () => {
  it('cadets, bras droits et chefs : palier de deck selon le niveau du joueur ; chefs en identité V2 ; enjeux annoncés', () => {
    let e = run(prologue(), [{ type: 'confirmer', famille: 'Cendre' }, ...conquerir('Cendre', 'c'), { type: 'engager', famille: 'Astre' }]).etat;
    expect(niveauDe(e)).toBe(2);
    const cadet = duelFigure('cadet-Astre', e, 1, false);
    expect(figure('cadet-Astre').enjeu).toEqual({ kind: 'variante', defId: 'Astre-3-relance' });
    expect(cadet.enjeu).toBe('Astre-3-relance');
    expect(cadet.config.players.p2.hp).toBe(65);
    expect(cadet.config.players.p2.deck!.filter(isNeutre)).toHaveLength(8);
    e = run(e, [...defi('cadet-Astre', 'victoire', 'a1'), ...defi('brasDroit-Astre', 'victoire', 'a2')]).etat;
    const chef = duelFigure('chef-Astre', e, 2, false);
    expect(chef.personnalite.id).toBe('chef-astre');
    expect(chef.enjeu).toBe('sig-Astre');
    expect(chef.config.players.p2.signature).toBe('Astre');
    expect(chef.config.players.p2.hp).toBe(80);
    // plus tard dans l'aventure (quatre familles), le même chef a un deck plus complet
    e = run(e, [...defi('chef-Astre', 'victoire', 'a3'), { type: 'engager', famille: 'Voile' }, { type: 'engager', famille: 'Ronce' }]).etat;
    expect(niveauDe(e)).toBe(4);
    const tard = duelFigure('chef-Voile', e, 3, false);
    expect(tard.config.players.p2.deck!.filter(isNeutre)).toHaveLength(0);
    expect(tard.config.players.p2.hp).toBe(105);
  });

  it('niveau du joueur (D1, annexe de calibrage amendement 1) : familles rejointes ou engagées ; changer de voie ne durcit pas la maison', () => {
    // une affiliation directe et une affiliation après trois changements : même niveau, mêmes adversaires dans la maison
    const directe = run(prologue(), [{ type: 'confirmer', famille: 'Voile' }]).etat;
    const trois = run(prologue(), [{ type: 'confirmer', famille: 'Cendre' }, { type: 'changer', famille: 'Ronce' }, { type: 'changer', famille: 'Astre' }, { type: 'changer', famille: 'Voile' }]).etat;
    expect(collectionDe(trois.registre).basics).toHaveLength(4);
    expect([niveauDe(directe), niveauDe(trois)]).toEqual([1, 1]);
    for (const r of ROLES) expect(duelFigure(figureDe('Voile', r).id, trois, 9, false).config.players.p2).toEqual(duelFigure(figureDe('Voile', r).id, directe, 9, false).config.players.p2);
    // la Cendre, quittée, compte dès l'engagement de son défi (sans Basics nouvelles), comme une famille engagée
    let e = run(trois, conquerir('Voile', 'v')).etat;
    expect(niveauDe(e)).toBe(1);
    e = run(e, [{ type: 'engager', famille: 'Cendre' }]).etat;
    expect(niveauDe(e)).toBe(2);
    expect(niveauDe(run(e, [{ type: 'engager', famille: 'Ronce' }, { type: 'engager', famille: 'Astre' }]).etat)).toBe(4);
    // sans changement d'affiliation, le niveau est celui d'avant l'amendement : les familles dont le joueur a les Basics
    const { e: fin } = parcours('Ronce', ['Cendre', 'Astre', 'Voile']);
    expect(niveauDe(fin)).toBe(collectionDe(fin.registre).basics.length);
  });

  it('journal : « Les trois voies » après le chef d’accueil ; objectif vers la Salle des Bannières entre deux voies', () => {
    let e = run(prologue(), [{ type: 'confirmer', famille: 'Voile' }, ...conquerir('Voile', 'v')]).etat;
    expect(quetes(e).find((q) => q.id === 'voies')!.etapes.map((x) => x.faite)).toEqual([false, false, false]);
    expect(objectif(e)).toMatch(/Salle des Bannières/);
    e = run(e, [{ type: 'engager', famille: 'Ronce' }]).etat;
    expect(objectif(e)).toMatch(/Gaspard/);
    e = run(e, conquerir('Ronce', 'r')).etat;
    expect(objectif(e)).toMatch(/1 voie sur 3 conquise : engagez/);
    const q = quetes(e);
    expect(q.find((x) => x.id === 'voies')!.etapes.filter((x) => x.faite)).toHaveLength(1);
    expect(q.find((x) => x.id === 'voie:Ronce')!.etapes.every((x) => x.faite)).toBe(true);
  });
});
