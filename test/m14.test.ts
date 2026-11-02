/**
 * M14 — le Récit guidé (`docs/m14/01_RECIT_GUIDE.md`, ADR 048) : la suite du récit, pendant de `objectif`, sur le parcours
 * complet des quatre familles et de tous les ordres de voies ; Kaï jamais manqué ; un personnage réel à chaque étape ; le
 * découpage en séquences (les scènes s'enchaînent, la Préparation avant un duel de la trame) ; le mode, simple champ
 * facultatif de la sauvegarde.
 */
import { plansArriveeRecit } from '../src/aventure/cinematiques';
import { describe, expect, it } from 'vitest';
import { FAMILIES, type Family } from '../src/game/catalog/cards';
import { appliquer, chapitreDetaille, nouvelleAventure, type AventureEtat, type Evenement } from '../src/aventure/aventure';
import { convoquer, noterVu, nouveauDirecteur, poses } from '../src/aventure/directeur';
import { cleSuite, enchainement, etapeRecit, ILOTS_RECIT, joueursDeRue, kaiVientDeJouer, quartierDe, suiteRecit, type EtapeRecit } from '../src/aventure/guide';
import { ilotAventure } from '../src/aventure/ilots';
import { figure, KAI_PROLOGUE } from '../src/aventure/modele';
import { objectif } from '../src/aventure/quetes';
import { K_IDS } from '../src/aventure/rival';
import { CLE_AVENTURE, MagasinAventure, nouvelleSauvegarde } from '../src/aventure/sauvegarde';
import { QUARTIERS_AJOUTES, type IlotId } from '../src/ville/ilots';

const AT = '2026-11-01T00:00:00.000Z';
const directeur = nouveauDirecteur(7);
const posesDe = (e: AventureEtat) => (ilot: IlotId) => poses(directeur, e, ilot, true);
const ouverts = new Set<IlotId>(QUARTIERS_AJOUTES);

function memoire(): Storage {
  const m = new Map<string, string>();
  return { get length() { return m.size; }, clear: () => m.clear(), getItem: (k) => m.get(k) ?? null, key: (i) => [...m.keys()][i] ?? null, removeItem: (k) => { m.delete(k); }, setItem: (k, v) => { m.set(k, v); } };
}

function faire(e: AventureEtat, evs: Evenement[]): AventureEtat {
  let etat = e;
  for (const ev of evs) {
    const r = appliquer(etat, ev, AT);
    if (r.refus) throw new Error(`${ev.type} refusé : ${r.refus}`);
    etat = r.etat;
  }
  return etat;
}

/** Vérifie une personne de l'étape : elle est posée dans un quartier, et son point d'arrivée existe. */
function verifierPersonne(e: AventureEtat, id: string): void {
  const ilot = quartierDe(id, ILOTS_RECIT, posesDe(e));
  expect(ilot, `personne introuvable : ${id}`).not.toBeNull();
  const def = ilotAventure(ilot!, posesDe(e)(ilot!), true, ouverts);
  expect(def.ilot.spawns[`npc-${id}`], `point d'arrivée de ${id}`).toBeDefined();
}

/** La parité avec `objectif` : l'étape désigne la personne que la phrase nomme. */
function verifierParite(e: AventureEtat, etape: EtapeRecit): void {
  const txt = objectif(e);
  if (etape.kind === 'personne') {
    verifierPersonne(e, etape.id);
    if (etape.id === KAI_PROLOGUE.id) expect(txt).toContain(KAI_PROLOGUE.nom);
    else if (/^(cadet|brasDroit|chef)-/.test(etape.id)) expect(txt).toContain(figure(etape.id).nom);
  }
  if (etape.kind === 'choix') for (const id of etape.ids) verifierPersonne(e, id);
  if (etape.kind === 'bannieres') expect(txt).toContain('Salle des Bannières');
  if (etape.kind === 'championnat') { expect(txt).toContain('Championnat'); verifierPersonne(e, 'heraut'); }
}

interface Parcours { e: AventureEtat; ordres: Family[]; dernier?: string; vus: string[]; choix: number; prepas: string[] }

function pas(p: Parcours, famille: Family, deuxAuChoix: boolean): void {
  const s = suiteRecit(p.e, { ilots: ILOTS_RECIT, ici: 'quai', dernier: p.dernier });
  if (!s) throw new Error('fin de la suite');
  if (enchainement(s) === 'preparation') p.prepas.push(cleSuite(s));
  if ('rival' in s) {
    const { k } = s.rival;
    p.vus.push(k.id);
    p.dernier = `rival:${k.id}`;
    p.e = faire(p.e, k.duel ? [{ type: 'combat', issue: 'victoire' }, { type: 'rival', id: k.id, issue: 'victoire' }] : [{ type: 'rival', id: k.id, issue: 'scene' }]);
    return;
  }
  const et = s.etape;
  verifierParite(p.e, et);
  if (et.kind === 'bannieres') {
    const a = p.ordres.shift()!;
    const b = deuxAuChoix && p.ordres.length ? p.ordres.shift()! : null;
    p.e = faire(p.e, [{ type: 'engager', famille: a }, ...(b ? [{ type: 'engager', famille: b } as Evenement] : [])]);
    return;
  }
  if (et.kind === 'championnat') {
    p.dernier = 'champ:poule';
    const [a, b, c, d] = [FAMILIES[0], FAMILIES[1], FAMILIES[2], FAMILIES[3]] as const;
    p.e = faire(p.e, [
      { type: 'championnat', manche: 'poule', chef: a, signature: b, issue: 'victoire' },
      { type: 'championnat', manche: 'poule', chef: b, signature: c, issue: 'victoire' },
      { type: 'championnat', manche: 'poule', chef: c, signature: a, issue: 'victoire' },
      { type: 'championnat', manche: 'miroir', signature: d, issue: 'victoire' },
      { type: 'championnat', manche: 'finale', signature: d, issue: 'victoire' },
    ]);
    // une pause dans la Finale : le Récit guidé propose encore le Championnat
    if (etapeRecit(p.e)?.kind !== 'championnat') throw new Error('la Finale doit rester proposée');
    p.e = faire(p.e, [{ type: 'championnat', manche: 'finale', signature: c, issue: 'victoire' }]);
    return;
  }
  const id = et.kind === 'choix' ? et.ids[0]! : et.id;
  if (et.kind === 'choix') p.choix += 1;
  if (id === KAI_PROLOGUE.id) {
    p.dernier = 'prologue';
    p.e = faire(p.e, [{ type: 'scene', id: 'P2' }, { type: 'duelPrologue', issue: 'victoire', faits: { assautsGagnes: 2, gardesGagnees: 2, interferencesReussies: 0 } }, { type: 'combat', issue: 'victoire' }]);
    return;
  }
  if (id.startsWith('emissaire-')) {
    p.e = faire(p.e, [{ type: 'scene', id: 'P6' }, { type: 'confirmer', famille }]);
    return;
  }
  p.dernier = id;
  p.e = faire(p.e, [{ type: 'lancerDefi', figure: id }, { type: 'duelStructurant', figure: id, issue: 'victoire', duel: `d-${p.vus.length}-${id}` }, { type: 'combat', issue: 'victoire' }]);
}

function parcours(famille: Family, ordres: Family[], deuxAuChoix = false): Parcours {
  const p: Parcours = { e: faire(nouvelleAventure(AT), [{ type: 'scene', id: 'P1' }]), ordres: [...ordres], vus: [], choix: 0, prepas: [] };
  for (let i = 0; i < 80 && suiteRecit(p.e, { ilots: ILOTS_RECIT, ici: 'quai', dernier: p.dernier }); i++) pas(p, famille, deuxAuChoix);
  return p;
}

const permutations = <T>(xs: readonly T[]): T[][] => (xs.length < 2 ? [[...xs]] : xs.flatMap((x, i) => permutations(xs.filter((_, j) => j !== i)).map((r) => [x, ...r])));

describe('M14 — la suite du récit, du prologue au titre', () => {
  for (const f of FAMILIES) {
    const autres = FAMILIES.filter((x) => x !== f);
    for (const ordre of permutations(autres)) {
      it(`${f} puis ${ordre.join(', ')} : du prologue au titre, Kaï K1 à K6 sans en manquer un`, () => {
        const p = parcours(f, ordre);
        expect(chapitreDetaille(p.e)).toBe('titre');
        expect(p.e.competitions.championnat.titre).toBe(true);
        expect([...p.vus].sort()).toEqual([...K_IDS]);
        expect(etapeRecit(p.e)).toBeNull();
        expect(suiteRecit(p.e, { ilots: ILOTS_RECIT, ici: 'quai', dernier: p.dernier })).toBeNull();
      });
    }
  }

  it('plusieurs familles engagées : le joueur choisit qui affronter, le mode ne décide pas', () => {
    const f: Family = 'Cendre';
    const p = parcours(f, FAMILIES.filter((x) => x !== f), true);
    expect(chapitreDetaille(p.e)).toBe('titre');
    expect(p.choix).toBeGreaterThan(1);
  });

  it('jamais deux duels de suite contre Kaï, sauf s\'il ne reste que lui', () => {
    expect(kaiVientDeJouer('brasDroit-Cendre')).toBe(true);
    expect(kaiVientDeJouer('rival:K2')).toBe(true);
    expect(kaiVientDeJouer('chef-Ronce')).toBe(false);
    let e = faire(nouvelleAventure(AT), [{ type: 'scene', id: 'P1' }, { type: 'scene', id: 'P2' }, { type: 'duelPrologue', issue: 'victoire', faits: { assautsGagnes: 2, gardesGagnees: 2, interferencesReussies: 0 } }, { type: 'scene', id: 'P6' }, { type: 'confirmer', famille: 'Cendre' }]);
    e = faire(e, [{ type: 'lancerDefi', figure: 'cadet-Cendre' }, { type: 'duelStructurant', figure: 'cadet-Cendre', issue: 'victoire', duel: 'c' }]);
    const apres = suiteRecit(e, { ilots: ILOTS_RECIT, ici: 'quai', dernier: 'cadet-Cendre' });
    expect(apres && 'rival' in apres && apres.rival.k.id).toBe('K1');
    const repos = suiteRecit(e, { ilots: ILOTS_RECIT, ici: 'quai', dernier: 'brasDroit-Cendre' });
    expect(repos && 'etape' in repos).toBe(true);
  });

  it('un événement de Kaï mène à un de ses quartiers, l\'îlot courant d\'abord', () => {
    const p = parcours('Voile', FAMILIES.filter((x) => x !== 'Voile'));
    expect(p.vus).toContain('K3');
    const e = faire(nouvelleAventure(AT), [{ type: 'scene', id: 'P1' }]);
    expect(suiteRecit(e, { ilots: ILOTS_RECIT, ici: 'parvis' })).toEqual({ etape: { kind: 'personne', id: KAI_PROLOGUE.id } });
  });
});

describe('M14 — les séquences (révision 3 du contrat, §4)', () => {
  const rival = (id: 'K1' | 'K6', duel: boolean) => ({ rival: { k: { id, titre: id, chapitre: 'I', ilots: [], secours: [], duel }, ilot: 'quai' } }) as unknown as Parameters<typeof enchainement>[0];
  const etape = (e: EtapeRecit) => ({ etape: e });

  it('les scènes s\'enchaînent seules : le prologue, la Salle des Bannières, la main tendue de Kaï', () => {
    expect(enchainement(etape({ kind: 'personne', id: KAI_PROLOGUE.id }))).toBe('scene');
    expect(enchainement(etape({ kind: 'personne', id: 'emissaire-Ronce' }))).toBe('scene');
    expect(enchainement(etape({ kind: 'bannieres' }))).toBe('scene');
    expect(enchainement(rival('K6', false))).toBe('scene');
  });

  it('la Préparation avant un duel de la trame ou un choix', () => {
    for (const id of ['cadet-Cendre', 'brasDroit-Voile', 'chef-Astre']) expect(enchainement(etape({ kind: 'personne', id }))).toBe('preparation');
    expect(enchainement(etape({ kind: 'choix', titre: '', texte: '', ids: [] }))).toBe('preparation');
    expect(enchainement(etape({ kind: 'championnat' }))).toBe('preparation');
    expect(enchainement(rival('K1', true))).toBe('preparation');
  });

  it('du prologue au titre : une Préparation par figure, aucune avant l\'affiliation', () => {
    const p = parcours('Cendre', ['Ronce', 'Voile', 'Astre']);
    for (const f of FAMILIES) for (const r of ['cadet', 'brasDroit', 'chef']) expect(p.prepas).toContain(`${r}-${f}`);
    expect(p.prepas[0]).toBe('cadet-Cendre');
    expect(p.prepas).not.toContain(KAI_PROLOGUE.id);
    expect(p.prepas).not.toContain('bannieres');
    expect(p.prepas).not.toContain('rival:K6');
  });

  it('une suite a une identité stable : une scène refusée ne se rouvre pas seule', () => {
    expect(cleSuite(etape({ kind: 'bannieres' }))).toBe('bannieres');
    expect(cleSuite(etape({ kind: 'personne', id: 'emissaire-Ronce' }))).toBe('emissaire-Ronce');
    expect(cleSuite(rival('K6', false))).toBe('rival:K6');
  });
});

describe('M14 — le mode, champ facultatif de la sauvegarde', () => {
  it('`aventure/2` se relit avec et sans le champ ; une valeur inconnue est refusée', () => {
    const store = memoire();
    const m = new MagasinAventure(store);
    const s = nouvelleSauvegarde(new Date(AT), 'Essai', 7);
    expect(s.recit).toBeUndefined();
    expect(JSON.stringify(s)).not.toContain('recit');
    s.recit = 'guide';
    m.ecrire(s);
    const lu = m.charger();
    expect(lu.status === 'ok' && lu.save.recit).toBe('guide');
    store.setItem(CLE_AVENTURE, JSON.stringify({ ...s, recit: 'autre' }));
    expect(m.charger().status).toBe('illisible');
  });

  it('le mode n\'entre pas dans les faits : la même suite de faits donne le même état', () => {
    const a = faire(nouvelleAventure(AT), [{ type: 'scene', id: 'P1' }]);
    expect(JSON.stringify(a)).not.toContain('recit');
    expect(JSON.stringify(a)).not.toContain('guide');
  });
});

describe('M14 — les joueurs de rue de la Préparation (contrat, §4 bis ; fiche, G1 et G2)', () => {
  const ILOTS = ['quai', 'parvis', 'ruelles', 'cour', 'port', 'haute'] as const;
  const affilie = (): AventureEtat => {
    const e = nouvelleAventure(AT);
    return [{ type: 'scene', id: 'P1' }, { type: 'scene', id: 'P2' }, { type: 'duelPrologue', issue: 'victoire', faits: { assautsGagnes: 0, gardesGagnees: 0, interferencesReussies: 0 } }, { type: 'confirmer', famille: 'Ronce' }, { type: 'scene', id: 'P8' }]
      .reduce((x: AventureEtat, ev) => appliquer(x, ev as Evenement, AT).etat, e);
  };
  it('rien avant l’affiliation ; ensuite, seulement des joueurs de rue, où qu’ils se tiennent', () => {
    expect(joueursDeRue(nouveauDirecteur(1), nouvelleAventure(AT), ILOTS)).toEqual([]);
    const j = joueursDeRue(nouveauDirecteur(1), affilie(), ILOTS);
    expect(j.length).toBeGreaterThan(0);
    expect(j.every((x) => x.id.startsWith('rue-') && ILOTS.includes(x.ilot as (typeof ILOTS)[number]))).toBe(true);
  });
  it('un joueur déjà posé reste à sa place ; un quartier fermé n’en propose aucun', () => {
    const d = nouveauDirecteur(1);
    const posee = convoquer(d, 'rue-docker', 'quai', 1);
    expect(joueursDeRue(posee, affilie(), ILOTS).find((x) => x.id === 'rue-docker')).toEqual({ id: 'rue-docker', ilot: 'quai', place: 1 });
    expect(joueursDeRue(d, affilie(), ['quai']).every((x) => x.ilot === 'quai')).toBe(true);
    const deplacee = convoquer(posee, 'rue-docker', 'quai', 0);
    expect(deplacee.actives.quai?.filter((a) => a.id === 'rue-docker')).toEqual([{ id: 'rue-docker', place: 0 }]);
  });
  it('affronté, il quitte la liste jusqu’au chapitre suivant, quelle que soit l’issue', () => {
    const e = affilie();
    for (const issue of ['victoire', 'defaite'] as const) {
      const d = noterVu(nouveauDirecteur(1), 'rue-docker', issue, 'I');
      expect(joueursDeRue(d, e, ILOTS).some((x) => x.id === 'rue-docker')).toBe(false);
      expect(joueursDeRue(noterVu(nouveauDirecteur(1), 'rue-docker', issue, 'prologue'), e, ILOTS).some((x) => x.id === 'rue-docker')).toBe(true);
    }
  });
  it('un joueur convoqué est bien posé dans son quartier (la scène peut s’ouvrir devant lui)', () => {
    const e = affilie();
    for (const j of joueursDeRue(nouveauDirecteur(1), e, ILOTS)) {
      const d = convoquer(nouveauDirecteur(1), j.id, j.ilot, j.place);
      expect(poses(d, e, j.ilot).some((p) => p.id === j.id), j.id).toBe(true);
    }
  });
});

describe('M14 : aucun plan de promenade dans le Récit guidé', () => {
  it('l’arrivée reste serrée, sans plan large ni retour au cadrage ordinaire', () => {
    const plans = plansArriveeRecit({ x: 12, z: 1 }, { minX: -14, maxX: 14 });
    expect(plans.every((p) => (p.zoom ?? 1) < 0.8)).toBe(true);
    expect(plans).toHaveLength(2);
    expect(plans.at(-1)!.at.x).toBe(12);
    expect(plans[0]!.at.x).toBeLessThan(12);
  });
});
