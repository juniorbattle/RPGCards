/**
 * M10-B — directeur des rencontres de la ville (`docs/m10/VILLE_RENCONTRES_EVENEMENTS.md`, PROPOSÉ). Pur et
 * déterministe : il ne décide qu'aux POINTS DE DÉCISION (entrée dans un îlot, retour d'un duel, scène terminée), jamais
 * à chaque pas ; son horloge est le BATTEMENT narratif (duels et scènes), pas le temps ni la distance. Il pose les
 * personnages structurants dont les prérequis sont vrais, et tire au plus UNE rencontre facultative nouvelle par îlot et
 * par point de décision, au plus DEUX présentes à la fois. Séparé du moteur de marche (la ville reçoit une liste de
 * personnages) et du moteur de combat (un accord ouvre une rencontre de duel).
 *
 * M10-E (la ville vivante, après la reprise de M09) : dans la ville en rangs, les rencontres de rue et l'ombre de Kaï ont
 * aussi des places dans les rangs du fond et dans la Grande Cour (`rangs` : seulement dans la ville en rangs) ; l'ombre
 * de Kaï compte par chapitre de la trame (I à V, `chapitreDetaille`) et n'apparaît qu'après le premier battement du
 * chapitre ; jamais dans un îlot où son personnage est déjà posé ; un refusé repart au point de décision suivant.
 */
import { hashString, makeRng } from '../game/engine/rng';
import type { Facing } from '../ville/monde';
import type { IlotId } from '../ville/ilots';
import { chapitreDetaille, statutDefi, type AventureEtat } from './aventure';
import { deF, emissaire, FIGURES, KAI_PROLOGUE } from './modele';
import { ELITE_JOUTE, manche, MEMBRES_EPREUVE, ouvertChampionnat } from './competitions';
import { aGain } from './registre';
import { personalityById } from '../presentation/personalities';

/** Place d'une rencontre ; au Quai, dans le Quai en quatre rangs (ARB-M10-12), avec sa place dans l'ancien Quai en
 *  bande (`bande`, le secours tant que le Quai en rangs n'est pas affiché ; absente : la même) ; `rangs` : une place des
 *  rangs du fond ou de la Grande Cour, qui n'existe que dans la ville en rangs (M10-E). */
export interface PlaceRencontre { ilot: IlotId; at: { x: number; z: number }; facing: Facing; bande?: { at: { x: number; z: number }; facing: Facing }; rangs?: true }

export interface RencontreDef {
  id: string;
  genre: 'structurante' | 'facultative' | 'rival' | 'ambiance' | 'competition';
  /** Apparence (rival V2 ou PNJ `pnj-<gabarit>-<graine>`). */
  apparence: string;
  nom: string;
  lieux: PlaceRencontre[];
  /** Prérequis et fenêtre de disponibilité (faits de l'aventure). */
  dispo: (e: AventureEtat) => boolean;
  /** Battements entre deux apparitions (facultatives). */
  delai: number;
  poids: number;
  /** Au plus N apparitions par chapitre (rival). */
  maxParChapitre?: number;
  /** Repère au-dessus du personnage : « ! » (un défi), « ? » (quelqu'un à écouter). */
  repere: (e: AventureEtat) => '!' | '?' | null;
}

export interface EtatDirecteur {
  graine: number;
  battement: number;
  /** Facultatives présentes par îlot (identifiant et indice de place). */
  actives: Partial<Record<IlotId, Array<{ id: string; place: number }>>>;
  derniere: Record<string, number>;
  /** Apparitions par chapitre (`<id>@<chapitre>`). */
  parChapitre: Record<string, number>;
  joues: Record<string, number>;
  refuses: Record<string, number>;
  /** Battement du premier point de décision de chaque chapitre (M10-E : l'ombre de Kaï vient après). */
  debuts?: Record<string, number>;
  /** Refusés (M10-E) : ils restent jusqu'au point de décision suivant, sans redemander, puis repartent. */
  partants?: string[];
}

export interface Pose { id: string; apparence: string; nom: string; at: { x: number; z: number }; facing: Facing; repere: '!' | '?' | null; genre: RencontreDef['genre'] }

export const MAX_FACULTATIVES = 2;

export function nouveauDirecteur(graineProfil: number): EtatDirecteur {
  return { graine: hashString(`directeur:${graineProfil >>> 0}`), battement: 0, actives: {}, derniere: {}, parChapitre: {}, joues: {}, refuses: {} };
}

/** Un fait significatif (duel terminé, scène principale terminée) fait passer un battement. */
export function battre(d: EtatDirecteur): EtatDirecteur {
  return { ...structuredClone(d), battement: d.battement + 1 };
}

const PLACES_EPREUVE: Record<'Cendre' | 'Ronce' | 'Voile' | 'Astre', PlaceRencontre> = {
  // la Cendre : sur la place de la Halle (rue Haute, deuxième rang)
  Cendre: { ilot: 'quai', at: { x: 10.2, z: -19.6 }, facing: 'gauche', bande: { at: { x: -9.0, z: 1.6 }, facing: 'face' } },
  Ronce: { ilot: 'quai', at: { x: 9.6, z: 1.6 }, facing: 'face' },
  Voile: { ilot: 'ruelles', at: { x: -11.0, z: 0.2 }, facing: 'droite' },
  Astre: { ilot: 'parvis', at: { x: -10.0, z: 1.4 }, facing: 'droite' },
};
const PLACES_JOUTE: Record<'Cendre' | 'Ronce' | 'Voile' | 'Astre', PlaceRencontre> = {
  // la Cendre : dans la cour de la Chapelle (le cœur du Quai) ; la Ronce : sur la placette du Puits (troisième rang)
  Cendre: { ilot: 'quai', at: { x: 5.0, z: -40.0 }, facing: 'face', bande: { at: { x: -17.0, z: 1.8 }, facing: 'droite' } },
  Ronce: { ilot: 'quai', at: { x: -9.0, z: -30.2 }, facing: 'gauche', bande: { at: { x: 7.2, z: 1.0 }, facing: 'face' } },
  Voile: { ilot: 'ruelles', at: { x: 2.2, z: -1.4 }, facing: 'face' },
  Astre: { ilot: 'parvis', at: { x: 10.4, z: -1.0 }, facing: 'gauche' },
};

/** Catalogue des rencontres de la première aventure (prototype). */
export const RENCONTRES: readonly RencontreDef[] = [
  {
    id: KAI_PROLOGUE.id, genre: 'structurante', apparence: KAI_PROLOGUE.apparence, nom: KAI_PROLOGUE.nom,
    lieux: [{ ilot: KAI_PROLOGUE.ilot, at: KAI_PROLOGUE.at, facing: KAI_PROLOGUE.facing }],
    dispo: (e) => e.prologue === null, delai: 0, poids: 1, repere: () => '!',
  },
  // Émissaires (cadets) : posés près de leur maison dès l'invitation, tant que la famille n'est pas rejointe (P6).
  ...(['Cendre', 'Ronce', 'Voile', 'Astre'] as const).map((f): RencontreDef => {
    const c = emissaire(f);
    return {
      id: `emissaire-${f}`, genre: 'structurante', apparence: c.apparence, nom: c.nom,
      lieux: [{ ilot: c.ilot, at: c.at, facing: c.facing, ...(c.bande ? { bande: c.bande } : {}) }],
      dispo: (e) => e.familles[f] === 'invite' && e.affiliation === null, delai: 0, poids: 1,
      repere: (e) => (e.premier === f && !e.scenes.includes('P6') ? '!' : '?'),
    };
  }),
  // Figures structurantes (lieutenants, chefs) : posées dès que leur famille est rejointe ou défiée.
  ...FIGURES.map((fig): RencontreDef => ({
    id: fig.id, genre: 'structurante', apparence: fig.apparence, nom: fig.nom,
    lieux: [{ ilot: fig.ilot, at: fig.at, facing: fig.facing, ...(fig.bande ? { bande: fig.bande } : {}) }],
    dispo: (e) => ['affilie', 'defiee', 'chef'].includes(e.familles[fig.famille]) || (fig.role === 'cadet' && e.familles[fig.famille] === 'invite' && e.affiliation !== null),
    delai: 0, poids: 1,
    repere: (e) => { const s = statutDefi(e, fig); return s.ouvert && !s.deja ? '!' : null; },
  })),
  // Facultatives : duels de rue (aucune récompense), un docker et une joueuse de passage.
  {
    id: 'rue-docker', genre: 'facultative', apparence: 'pnj-docker-1', nom: 'un docker du Quai',
    lieux: [{ ilot: 'quai', at: { x: -2.4, z: 1.4 }, facing: 'gauche' }, { ilot: 'quai', at: { x: 2.2, z: -13.4 }, facing: 'face', bande: { at: { x: 2.2, z: 1.8 }, facing: 'face' } }],
    dispo: (e) => e.prologue !== null, delai: 2, poids: 2, repere: () => '!',
  },
  {
    id: 'rue-joueuse', genre: 'facultative', apparence: 'pnj-joueuse-5', nom: 'une joueuse du Parvis',
    // M10-E : aussi sur la place des Paris (deuxième rang du Parvis)
    lieux: [{ ilot: 'parvis', at: { x: -2.8, z: 1.2 }, facing: 'face' }, { ilot: 'parvis', at: { x: 4.4, z: -21.4 }, facing: 'droite', rangs: true }],
    dispo: (e) => e.prologue !== null, delai: 2, poids: 2, repere: () => '!',
  },
  {
    id: 'rue-commis', genre: 'facultative', apparence: 'pnj-commis-5', nom: 'un commis des Ruelles',
    // M10-E : aussi dans la ruelle du Voile (troisième rang des Ruelles)
    lieux: [{ ilot: 'ruelles', at: { x: -8.4, z: 0.9 }, facing: 'droite' }, { ilot: 'ruelles', at: { x: -0.6, z: -22.8 }, facing: 'droite', rangs: true }],
    dispo: (e) => e.prologue !== null, delai: 2, poids: 1, repere: () => '!',
  },
  // M10-E : une joueuse de la Grande Cour (la place n'existe que dans la ville en rangs)
  {
    id: 'rue-cour', genre: 'facultative', apparence: 'pnj-joueuse-31', nom: 'une joueuse de la Grande Cour',
    lieux: [{ ilot: 'cour', at: { x: 7.6, z: -9.8 }, facing: 'droite', rangs: true }, { ilot: 'cour', at: { x: 3.2, z: 0.8 }, facing: 'gauche', rangs: true }],
    dispo: (e) => e.prologue !== null, delai: 2, poids: 2, repere: () => '!',
  },
  // Compétitions facultatives (M10-D, option a d'ARB-M10-06) : l'organisateur de l'Épreuve du quartier et le membre
  // d'élite de la Joute, posés dans le quartier de leur famille dès qu'elles sont ouvertes (pas de tirage).
  ...(['Cendre', 'Ronce', 'Voile', 'Astre'] as const).flatMap((f): RencontreDef[] => [
    {
      id: `epreuve-${f}`, genre: 'competition', apparence: MEMBRES_EPREUVE[f][0], nom: `${personalityById(MEMBRES_EPREUVE[f][0])?.gender === 'f' ? 'l’organisatrice' : 'l’organisateur'} de l’Épreuve ${deF(f)}`,
      lieux: [PLACES_EPREUVE[f]], dispo: (e) => aGain(e.registre, `basics:${f}`), delai: 0, poids: 1,
      repere: (e) => (e.competitions.epreuves[f]?.gagnee ? null : '!'),
    },
    {
      id: `joute-${f}`, genre: 'competition', apparence: ELITE_JOUTE[f], nom: `${personalityById(ELITE_JOUTE[f])?.gender === 'f' ? 'la championne' : 'le champion'} de la Joute ${deF(f)}`,
      lieux: [PLACES_JOUTE[f]], dispo: (e) => e.vaincues.includes(`brasDroit-${f}`), delai: 0, poids: 1,
      repere: (e) => (e.competitions.joutes[f]?.gagnee ? null : '!'),
    },
  ]),
  // M10-E : le héraut du Tournoi, devant l'estrade de la Grande Cour, dès que le Championnat est ouvert : il en ouvre les
  // duels et en proclame le titre (ouverture et clôture dans la Grande Cour, PROGRESSION §4) ; ville en rangs seulement.
  {
    id: 'heraut', genre: 'structurante', apparence: 'pnj-commis-40', nom: 'le héraut du Tournoi',
    lieux: [{ ilot: 'cour', at: { x: -7.5, z: -6.9 }, facing: 'face', rangs: true }],
    dispo: (e) => ouvertChampionnat(e.familles), delai: 0, poids: 1,
    repere: (e) => (manche(e.competitions) === 'titre' ? null : '!'),
  },
  // Le rival : un défi facultatif par chapitre au plus, après le prologue (P-N8) ; M10-E : aussi dans la cour des
  // Champions, sur la placette de l'Olivier et dans la Grande Cour (ville en rangs).
  {
    id: 'rival-kai', genre: 'rival', apparence: 'braise', nom: 'Kaï',
    lieux: [{ ilot: 'quai', at: { x: 12.0, z: -13.0 }, facing: 'gauche', bande: { at: { x: 11.8, z: 1.2 }, facing: 'gauche' } }, { ilot: 'parvis', at: { x: 9.2, z: 0.8 }, facing: 'gauche' }, { ilot: 'ruelles', at: { x: -4.8, z: 1.4 }, facing: 'droite' },
      { ilot: 'parvis', at: { x: 2.6, z: -41.2 }, facing: 'face', rangs: true }, { ilot: 'ruelles', at: { x: 8.0, z: -16.2 }, facing: 'face', rangs: true }, { ilot: 'cour', at: { x: -5.0, z: -6.2 }, facing: 'gauche', rangs: true }],
    dispo: (e) => e.affiliation !== null, delai: 4, poids: 1, maxParChapitre: 1, repere: () => '!',
  },
];

export const rencontreDef = (id: string): RencontreDef | undefined => RENCONTRES.find((r) => r.id === id);

/**
 * POINT DE DÉCISION dans l'îlot `ilot` : retire les facultatives indisponibles (et les refusées au point précédent), puis
 * en tire au plus une nouvelle (graine, battement, îlot) si moins de `MAX_FACULTATIVES` sont présentes. Renvoie le nouvel
 * état et les personnages à poser. `quaiRangs` : la ville en rangs est-elle affichée (ses places du fond et la Grande Cour
 * n'existent que là) ?
 */
export function decider(d0: EtatDirecteur, e: AventureEtat, ilot: IlotId, quaiRangs = true): { directeur: EtatDirecteur; poses: Pose[] } {
  const d: EtatDirecteur = structuredClone(d0);
  const ch = chapitreDetaille(e);
  const cle = (id: string) => `${id}@${ch}`;
  const debuts = { ...(d.debuts ?? {}) };
  if (debuts[ch] === undefined) debuts[ch] = d.battement;
  d.debuts = debuts;
  const placeOk = (l: PlaceRencontre | undefined) => !!l && l.ilot === ilot && (quaiRangs || !l.rangs);
  // un refusé repart au premier point de décision qui suit son refus, dans l'îlot où il se tenait
  const partants = new Set(d.partants ?? []);
  const ici = d.actives[ilot] ?? [];
  let actives = ici.filter((a) => { const r = rencontreDef(a.id); return !!r && !partants.has(a.id) && r.dispo(e) && placeOk(r.lieux[a.place]); });
  if (d.partants?.length) d.partants = d.partants.filter((id) => !ici.some((a) => a.id === id) && Object.values(d.actives).some((xs) => (xs ?? []).some((a) => a.id === id)));
  if (actives.length < MAX_FACULTATIVES) {
    const presentes = new Set(Object.values(d.actives).flatMap((xs) => (xs ?? []).map((a) => a.id)));
    // un personnage déjà posé dans l'îlot (Kaï, bras droit de la Cendre) n'y est jamais tiré une seconde fois
    const posees = new Set(poses(d, e, ilot, quaiRangs).filter((p) => p.genre === 'structurante' || p.genre === 'competition').map((p) => p.apparence));
    const cand = RENCONTRES.filter((r) => (r.genre === 'facultative' || r.genre === 'rival')
      && !presentes.has(r.id)
      && !posees.has(r.apparence)
      && r.lieux.some(placeOk)
      && r.dispo(e)
      && (d.derniere[r.id] === undefined || d.battement >= d.derniere[r.id]! + r.delai)
      && (r.maxParChapitre === undefined || (d.parChapitre[cle(r.id)] ?? 0) < r.maxParChapitre)
      // l'ombre de Kaï vient après le premier battement du chapitre (« après la première scène du chapitre »)
      && (r.genre !== 'rival' || d.battement > debuts[ch]!));
    if (cand.length) {
      const rng = makeRng(hashString(`${d.graine}:${d.battement}:${ilot}`));
      const total = cand.reduce((a, r) => a + r.poids, 0);
      let x = rng() * total;
      const pick = cand.find((r) => (x -= r.poids) < 0) ?? cand[cand.length - 1]!;
      const places = pick.lieux.map((l, i) => ({ l, i })).filter((p) => placeOk(p.l));
      const place = places[Math.floor(rng() * places.length)]!.i;
      actives = [...actives, { id: pick.id, place }];
      d.derniere[pick.id] = d.battement;
      d.parChapitre[cle(pick.id)] = (d.parChapitre[cle(pick.id)] ?? 0) + 1;
    }
  }
  d.actives[ilot] = actives;
  return { directeur: d, poses: poses(d, e, ilot, quaiRangs) };
}

/**
 * Personnages à poser dans l'îlot (structurants disponibles + facultatives actives), SANS tirer : relecture pure.
 * `quaiRangs` : le Quai est-il le Quai en quatre rangs (sinon l'ancien Quai, en secours : places `bande`) ?
 */
export function poses(d: EtatDirecteur, e: AventureEtat, ilot: IlotId, quaiRangs = true): Pose[] {
  const out: Pose[] = [];
  const ou = (l: PlaceRencontre): { at: { x: number; z: number }; facing: Facing } => (!quaiRangs && l.ilot === 'quai' && l.bande ? l.bande : l);
  for (const r of RENCONTRES) {
    if ((r.genre !== 'structurante' && r.genre !== 'competition') || !r.dispo(e)) continue;
    const l = r.lieux.find((x) => x.ilot === ilot);
    if (!l || (!quaiRangs && l.rangs)) continue;
    // Un même personnage n'est posé qu'une fois (l'émissaire et le cadet sont la même figure).
    if (out.some((p) => p.apparence === r.apparence)) continue;
    out.push({ id: r.id, apparence: r.apparence, nom: r.nom, ...ou(l), repere: r.repere(e), genre: r.genre });
  }
  for (const a of d.actives[ilot] ?? []) {
    const r = rencontreDef(a.id);
    const l = r?.lieux[a.place];
    if (!r || !l || (!quaiRangs && l.rangs) || !r.dispo(e) || out.some((p) => p.apparence === r.apparence)) continue;
    out.push({ id: r.id, apparence: r.apparence, nom: r.nom, ...ou(l), repere: r.repere(e), genre: r.genre });
  }
  return out;
}

/** Une facultative jouée (duel accepté) quitte l'îlot ; un refus la laisse jusqu'au prochain point de décision, sans
 *  redemander, puis elle repart (M10-E). */
export function conclure(d0: EtatDirecteur, id: string, accord: boolean): EtatDirecteur {
  const d: EtatDirecteur = structuredClone(d0);
  if (accord) {
    d.joues[id] = (d.joues[id] ?? 0) + 1;
    for (const k of Object.keys(d.actives) as IlotId[]) d.actives[k] = (d.actives[k] ?? []).filter((a) => a.id !== id);
    if (d.partants) d.partants = d.partants.filter((x) => x !== id);
  } else {
    d.refuses[id] = (d.refuses[id] ?? 0) + 1;
    if (!(d.partants ?? []).includes(id)) d.partants = [...(d.partants ?? []), id];
  }
  return d;
}
