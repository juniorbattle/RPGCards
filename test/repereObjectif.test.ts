/**
 * Passe 240 — le repère d'objectif de la Promenade libre (`src/aventure/repereObjectif.ts`, `src/ville/repereEcran.ts`) :
 * la cible de l'étape dans le quartier, le passage vers son quartier sinon (plus court chemin), Kaï seulement quand il
 * s'annonce, sur tout le parcours d'une aventure et depuis chaque quartier ; le réglage ; la place à l'écran.
 */
import { describe, expect, it } from 'vitest';
import { FAMILIES, type Family } from '../src/game/catalog/cards';
import { appliquer, nouvelleAventure, type AventureEtat, type Evenement } from '../src/aventure/aventure';
import { nouveauDirecteur, poses } from '../src/aventure/directeur';
import { etapeRecit, ILOTS_RECIT, suiteRecit } from '../src/aventure/guide';
import { ilotAventure, ilotBase, nomIlot } from '../src/aventure/ilots';
import { KAI_PROLOGUE } from '../src/aventure/modele';
import { ecrireRepere, guidage, lireRepere, premierPassage, reperePermis, type Guidage, type MondeGuide } from '../src/aventure/repereObjectif';
import { QUARTIERS_AJOUTES, type IlotId } from '../src/ville/ilots';
import { placerRepere } from '../src/ville/repereEcran';

const AT = '2026-11-15T00:00:00.000Z';
const directeur = nouveauDirecteur(7);
const ouverts = new Set<IlotId>(QUARTIERS_AJOUTES);

function faire(e: AventureEtat, evs: Evenement[]): AventureEtat {
  let etat = e;
  for (const ev of evs) {
    const r = appliquer(etat, ev, AT);
    if (r.refus) throw new Error(`${ev.type} refusé : ${r.refus}`);
    etat = r.etat;
  }
  return etat;
}

/** Le monde de la ville en rangs, quartiers ajoutés ouverts, vu depuis `ici`. */
function monde(e: AventureEtat, ici: IlotId, o: { kai?: boolean; ilots?: readonly IlotId[]; ouverts?: ReadonlySet<IlotId> } = {}): MondeGuide {
  const ouv = o.ouverts ?? ouverts;
  const posesDe = (id: IlotId) => poses(directeur, e, id, true);
  return {
    ici, ilots: o.ilots ?? ILOTS_RECIT, quaiRangs: true, kai: o.kai ?? true,
    posesDe,
    zonesDe: (id) => ilotAventure(id, posesDe(id), true, ouv).ilot.zones,
    sortiesDe: (id) => ilotBase(id, true, ouv).exits,
    nomDe: (id) => nomIlot(id, true, ouv),
  };
}

const debut = () => faire(nouvelleAventure(AT), [{ type: 'scene', id: 'P1' }]);
const PROLOGUE: Evenement[] = [{ type: 'scene', id: 'P2' }, { type: 'duelPrologue', issue: 'victoire', faits: { assautsGagnes: 2, gardesGagnees: 2, interferencesReussies: 0 } }];
const affilie = (f: Family) => faire(debut(), [...PROLOGUE, { type: 'scene', id: 'P6' }, { type: 'confirmer', famille: f }]);
const battre = (e: AventureEtat, id: string) => faire(e, [{ type: 'lancerDefi', figure: id }, { type: 'duelStructurant', figure: id, issue: 'victoire', duel: `d-${id}` }, { type: 'combat', issue: 'victoire' }]);

/** Le quartier où une sortie mène, depuis `ici`. */
const destination = (ici: IlotId, sortie: string): IlotId => ilotBase(ici, true, ouverts).exits[sortie]!.to;

describe('repère d\'objectif — le plus court chemin entre quartiers', () => {
  const m = monde(debut(), 'quai');
  it('un passage direct, puis deux, puis trois', () => {
    expect(premierPassage(m, 'quai', 'parvis')).toEqual({ sortie: 'sortie-arene', distance: 1 });
    expect(premierPassage(m, 'quai', 'haute')).toEqual({ sortie: 'sortie-cour', distance: 2 });
    expect(premierPassage(m, 'parvis', 'port')).toEqual({ sortie: 'sortie-quai', distance: 2 });
    expect(premierPassage(m, 'haute', 'port')).toEqual({ sortie: 'sortie-cour', distance: 3 });
  });
  it('rien dans le même quartier ; un quartier fermé est injoignable', () => {
    expect(premierPassage(m, 'cour', 'cour')).toBeNull();
    const ferme = monde(debut(), 'quai', { ilots: ILOTS_RECIT.filter((x) => !QUARTIERS_AJOUTES.includes(x)), ouverts: new Set() });
    expect(premierPassage(ferme, 'quai', 'port')).toBeNull();
    expect(premierPassage(ferme, 'quai', 'cour')).toEqual({ sortie: 'sortie-cour', distance: 1 });
  });
});

describe('repère d\'objectif — la cible de l\'étape', () => {
  it('le prologue : Kaï sur le Quai, le passage vers le Quai ailleurs', () => {
    const e = debut();
    const g = guidage(e, monde(e, 'quai'))!;
    expect(g.ailleurs).toBe(false);
    expect(g.reperes).toHaveLength(1);
    expect(g.reperes[0]).toMatchObject({ id: KAI_PROLOGUE.id, hauteur: 'tete', nom: KAI_PROLOGUE.nom, apparence: KAI_PROLOGUE.apparence });
    const p = guidage(e, monde(e, 'parvis'))!;
    expect(p.ailleurs).toBe(true);
    expect(p.reperes[0]).toMatchObject({ id: 'sortie-quai', hauteur: 'passage', nom: 'Retour au Quai' });
    expect(p.reperes[0]!.detail).toContain(KAI_PROLOGUE.nom);
    // le passage mène droit au Quai : son nom le dit, la précision ne répète pas le quartier
    expect(p.reperes[0]!.detail).toBe(KAI_PROLOGUE.nom);
    // deux passages depuis la Ville haute : d'abord la Grande Cour, et la précision nomme le quartier de l'étape
    const h = guidage(e, monde(e, 'haute'))!.reperes[0]!;
    expect(h.id).toBe('sortie-cour');
    expect(h.detail).toBe(`${KAI_PROLOGUE.nom} · ${nomIlot('quai', true, ouverts)}`);
  });

  it('le choix de la voie : chaque émissaire du quartier, sinon le passage vers le plus proche', () => {
    const e = faire(debut(), [...PROLOGUE, { type: 'scene', id: 'P6' }]);
    const etape = etapeRecit(e)!;
    expect(etape.kind).toBe('choix');
    let vus = 0;
    for (const ici of ILOTS_RECIT) {
      const g = guidage(e, monde(e, ici))!;
      expect(g, ici).not.toBeNull();
      if (!g.ailleurs) {
        for (const r of g.reperes) { expect(r.id.startsWith('emissaire-')).toBe(true); expect(poses(directeur, e, ici, true).some((p) => p.id === r.id)).toBe(true); }
        vus += g.reperes.length;
      }
    }
    // les quatre émissaires sont montrés, chacun dans son quartier
    expect(vus).toBe(4);
  });

  it('la Salle des Bannières : sa porte sur le Quai ; la porte se lit au-dessus du linteau', () => {
    let e = affilie('Cendre');
    for (const r of ['cadet', 'brasDroit', 'chef']) e = battre(e, `${r}-Cendre`);
    expect(etapeRecit(e)).toEqual({ kind: 'bannieres' });
    const g = guidage(e, monde(e, 'quai', { kai: false }))!;
    expect(g.reperes[0]).toMatchObject({ id: 'porte-salle', hauteur: 'porte', nom: 'La Salle des Bannières' });
    const c = guidage(e, monde(e, 'cour', { kai: false }))!;
    expect(c.reperes[0]).toMatchObject({ id: 'sortie-quai', hauteur: 'passage' });
    expect(c.reperes[0]!.detail).toContain('La Salle des Bannières');
  });

  it("Kaï seulement quand il s'annonce : dû ou à rejouer, il vient au joueur, le guide garde l'étape", () => {
    // la Ronce (le bras droit de la Cendre est Kaï lui-même)
    let e = battre(affilie('Ronce'), 'cadet-Ronce');
    // K1 dû mais pas annoncé : il surgira sans prévenir sur le Quai, le guide montre l'étape
    const s = suiteRecit(e, { ilots: ILOTS_RECIT, ici: 'parvis' });
    expect(s && 'rival' in s && s.rival.k.id).toBe('K1');
    expect(guidage(e, monde(e, 'parvis'))!.reperes[0]!.detail).not.toContain('Kaï');
    // perdu : la revanche se rejoue dans tout quartier, au prochain point de décision ; le guide garde l'étape
    e = faire(e, [{ type: 'combat', issue: 'defaite' }, { type: 'rival', id: 'K1', issue: 'defaite' }]);
    for (const ici of ILOTS_RECIT) expect(guidage(e, monde(e, ici))!.reperes[0]!.detail ?? '', ici).not.toContain('Kaï');
  });
});

describe("repère d'objectif — Kaï après le titre (« Il vous attend »)", () => {
  /** Le titre gagné, sans aucun événement de Kaï joué : K6 est dû, dans la Grande Cour ou au Parvis. */
  function titre(): AventureEtat {
    let e = affilie('Astre');
    for (const x of ['Astre', ...FAMILIES.filter((y) => y !== 'Astre')] as Family[]) {
      if (x !== 'Astre') e = faire(e, [{ type: 'engager', famille: x }]);
      for (const r of ['cadet', 'brasDroit', 'chef']) e = battre(e, `${r}-${x}`);
    }
    return faire(e, [
      { type: 'championnat', manche: 'poule', chef: 'Cendre', signature: 'Ronce', issue: 'victoire' },
      { type: 'championnat', manche: 'poule', chef: 'Ronce', signature: 'Voile', issue: 'victoire' },
      { type: 'championnat', manche: 'poule', chef: 'Voile', signature: 'Cendre', issue: 'victoire' },
      { type: 'championnat', manche: 'miroir', signature: 'Astre', issue: 'victoire' },
      { type: 'championnat', manche: 'finale', signature: 'Astre', issue: 'victoire' },
      { type: 'championnat', manche: 'finale', signature: 'Voile', issue: 'victoire' },
    ]);
  }
  it('ailleurs, le passage vers un quartier où il surgit ; là, rien (il vient) ; sans rencontres, rien', () => {
    const e = titre();
    expect(etapeRecit(e)).toBeNull();
    const g = guidage(e, monde(e, 'quai'))!;
    expect(g.ailleurs).toBe(true);
    expect(g.reperes[0]!.hauteur).toBe('passage');
    expect(['parvis', 'cour']).toContain(destination('quai', g.reperes[0]!.id));
    expect(g.reperes[0]!.detail).toContain('Kaï vous attend');
    expect(guidage(e, monde(e, 'haute'))!.reperes[0]!.id).toBe('sortie-cour');
    expect(guidage(e, monde(e, 'cour'))).toBeNull();
    expect(guidage(e, monde(e, 'quai', { kai: false }))).toBeNull();
    // K6 accompli : plus rien à montrer
    expect(guidage(faire(e, [{ type: 'rival', id: 'K6', issue: 'scene' }]), monde(e, 'quai'))).toBeNull();
  });
});

/** Suit les passages du guide depuis `ici` jusqu'à un quartier où la cible est montrée. */
function suivre(e: AventureEtat, ici: IlotId): { g: Guidage; ilot: IlotId; sauts: number } | null {
  let ilot = ici;
  for (let sauts = 0; sauts < 6; sauts++) {
    const g = guidage(e, monde(e, ilot));
    if (!g) return null;
    if (!g.ailleurs) return { g, ilot, sauts };
    ilot = destination(ilot, g.reperes[0]!.id);
  }
  throw new Error(`boucle depuis ${ici}`);
}

describe('repère d\'objectif — du prologue au titre, depuis chaque quartier', () => {
  for (const f of FAMILIES) {
    it(`${f} : à chaque étape, le guide mène à la personne ou à la porte, en trois passages au plus`, () => {
      let e = debut();
      const ordre = FAMILIES.filter((x) => x !== f);
      let etapes = 0;
      for (let i = 0; i < 60; i++) {
        const etape = etapeRecit(e);
        if (!etape) break;
        etapes++;
        for (const ici of ILOTS_RECIT) {
          const r = suivre(e, ici);
          expect(r, `${f}, étape ${i} (${etape.kind}) depuis ${ici}`).not.toBeNull();
          expect(r!.sauts).toBeLessThanOrEqual(3);
          for (const rep of r!.g.reperes) {
            if (rep.hauteur === 'tete') expect(poses(directeur, e, r!.ilot, true).some((p) => p.id === rep.id), rep.id).toBe(true);
            else expect(rep.hauteur).toBe('porte');
          }
          if (etape.kind === 'personne') expect(r!.g.reperes.map((x) => x.id)).toContain(etape.id);
        }
        // avancer dans la trame (comme le parcours du Récit guidé)
        if (etape.kind === 'personne' && etape.id === KAI_PROLOGUE.id) e = faire(e, PROLOGUE);
        else if (etape.kind === 'personne' && etape.id.startsWith('emissaire-')) e = faire(e, [{ type: 'scene', id: 'P6' }]);
        else if (etape.kind === 'choix' && etape.ids[0]!.startsWith('emissaire-')) e = faire(e, [{ type: 'confirmer', famille: f }]);
        else if (etape.kind === 'personne') e = battre(e, etape.id);
        else if (etape.kind === 'choix') e = battre(e, etape.ids[0]!);
        else if (etape.kind === 'bannieres') e = faire(e, [{ type: 'engager', famille: ordre.shift()! }]);
        else {
          e = faire(e, [
            { type: 'championnat', manche: 'poule', chef: FAMILIES[0], signature: FAMILIES[1], issue: 'victoire' },
            { type: 'championnat', manche: 'poule', chef: FAMILIES[1], signature: FAMILIES[2], issue: 'victoire' },
            { type: 'championnat', manche: 'poule', chef: FAMILIES[2], signature: FAMILIES[0], issue: 'victoire' },
            { type: 'championnat', manche: 'miroir', signature: FAMILIES[3], issue: 'victoire' },
            { type: 'championnat', manche: 'finale', signature: FAMILIES[3], issue: 'victoire' },
            { type: 'championnat', manche: 'finale', signature: FAMILIES[2], issue: 'victoire' },
          ]);
        }
      }
      expect(etapes).toBeGreaterThan(12);
      expect(etapeRecit(e)).toBeNull();
      expect(e.competitions.championnat.titre).toBe(true);
    });
  }

  it('le Championnat : le héraut dans la Grande Cour, le passage vers elle ailleurs', () => {
    let e = affilie('Ronce');
    for (const x of ['Ronce', ...FAMILIES.filter((y) => y !== 'Ronce')] as Family[]) {
      if (x !== 'Ronce') e = faire(e, [{ type: 'engager', famille: x }]);
      for (const r of ['cadet', 'brasDroit', 'chef']) e = battre(e, `${r}-${x}`);
    }
    expect(etapeRecit(e)).toEqual({ kind: 'championnat' });
    const g = guidage(e, monde(e, 'cour', { kai: false }))!;
    expect(g.reperes[0]).toMatchObject({ id: 'heraut', hauteur: 'tete', detail: 'Championnat des Champions' });
    expect(guidage(e, monde(e, 'quai', { kai: false }))!.reperes[0]!.id).toBe('sortie-cour');
  });
});

describe('repère d\'objectif — le réglage', () => {
  const st = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); } }; };
  it('affiché par défaut ; masqué se mémorise ; un stockage refusé ne casse rien', () => {
    const s = st();
    expect(lireRepere(s)).toBe(true);
    expect(ecrireRepere(s, false)).toBe(true);
    expect(lireRepere(s)).toBe(false);
    ecrireRepere(s, true);
    expect(lireRepere(s)).toBe(true);
    expect(lireRepere(null)).toBe(true);
    const casse = { getItem: () => { throw new Error('refus'); }, setItem: () => { throw new Error('refus'); } };
    expect(lireRepere(casse)).toBe(true);
    expect(ecrireRepere(casse, false)).toBe(false);
  });
  it('l\'adresse : `?repere=0` le coupe ; en QA, seulement avec `?repere=1`', () => {
    expect(reperePermis('')).toBe(true);
    expect(reperePermis('?aventure=1')).toBe(true);
    expect(reperePermis('?repere=0')).toBe(false);
    expect(reperePermis('?qa=1&aventure=1')).toBe(false);
    expect(reperePermis('?qa=1&aventure=1&repere=1')).toBe(true);
  });
});

describe('repère d\'objectif — la place à l\'écran', () => {
  const vue = { w: 1280, h: 720 };
  const m = { haut: 160, bas: 64, gauche: 56, droite: 56 };
  it('dans le cadre utile : au point projeté, au-dessus de la cible', () => {
    expect(placerRepere({ x: 640, y: 400, devant: true }, vue, m)).toMatchObject({ x: 640, y: 400, dedans: true, cote: 'dessus' });
  });
  it('hors du cadre : contre le bord, sur la droite qui va vers la cible', () => {
    const d = placerRepere({ x: 2000, y: 408, devant: true }, vue, m);
    expect(d).toMatchObject({ dedans: false, cote: 'droite' });
    expect(d.x).toBeCloseTo(1280 - 56);
    expect(d.y).toBeCloseTo(408, 0);
    expect(d.angle).toBeCloseTo(0);
    const h = placerRepere({ x: 640, y: 40, devant: true }, vue, m);
    expect(h).toMatchObject({ dedans: false, cote: 'haut', y: 160 });
    const g = placerRepere({ x: -300, y: 900, devant: true }, vue, m);
    expect(['gauche', 'bas']).toContain(g.cote);
    expect(g.x).toBeGreaterThanOrEqual(56 - 1e-6);
    expect(g.y).toBeLessThanOrEqual(720 - 64 + 1e-6);
  });
  it('sous le cartouche, la cible du fond se range en haut ; derrière la caméra, la direction s\'inverse', () => {
    expect(placerRepere({ x: 900, y: 120, devant: true }, vue, m).cote).toBe('haut');
    const b = placerRepere({ x: 2000, y: 408, devant: false }, vue, m);
    expect(b.cote).toBe('gauche');
  });
});
