/**
 * M13 — arrangement (pur) : ce qu'une version est (thème déroulé, générateurs, tempo, swing, salle, mélange, couches,
 * contexte), et les outils communs aux versions (déroulé de la forme, dynamique par section, variations de la tête,
 * formation de la ville selon le chapitre). Contrats `docs/m13/01_MUSIQUE.md` et `02_MUSIQUE_INTERACTIVE.md`.
 */
import type { SalleId } from './effets';
import type { Evenement, InstrId, Rng } from './generateurs';
import type { AccordP, NoteP, Theme } from './partitions';
import { midi } from './theorie';
import { augmenter, changerMode, deplacer, enrichir, renverser, retrograde, transposer, transposerAccords } from './variations';

export type VersionId = 'I-1' | 'I-2' | 'I-3' | 'II-1' | 'II-2' | 'II-3' | 'III-1' | 'III-2' | 'IV-1' | 'IV-2' | 'IV-3' | 'IV-4' | 'V-1' | 'VI-1' | 'VI-2';
export type JingleId = 'victoire' | 'defaite' | 'carte' | 'chapitre';
/** Variations à la volée (laboratoire) : la mélodie de la tête transformée, à la manière de Zelda. */
export type VariationMelodie = 'originale' | 'envers' | 'renversee' | 'mineur' | 'lente';

export interface Mix { g?: number; pan?: number; rev?: number }

export interface DefVersion {
  id: VersionId;
  titre: string;
  tempo: number;
  mesure: number;
  /** Rapport de swing (0,5 : droit) et grille (1 : croches, 0,5 : doubles croches). */
  swing: number;
  sub: number;
  salle: SalleId;
  lofi?: boolean;
  /** Pédale tenue (piano de ballade, vibraphone) : les notes s'éteignent lentement. */
  pedale?: boolean;
  gain: number;
  mix: Partial<Record<InstrId, Mix>>;
  instruments: InstrId[];
  /** Durée d'un passage, en temps. */
  duree: number;
  passe: (p: number, rng: Rng, o: OptVersion) => Evenement[];
  /** La grille du passage, en temps droits (ponctuations dans l'accord qui sonne, fin de duel sur la fondamentale). */
  grille: (p: number, o: OptVersion) => readonly AccordP[];
  /** Levée jouée avant le premier passage quand la version commence seule. */
  intro?: { duree: number; ev: (rng: Rng) => Evenement[]; acc?: readonly AccordP[] };
  /** Place des musiciens dans le temps (lecteur) : jazz par défaut, lofi pour les versions lofi. */
  jeu?: 'jazz' | 'lofi' | 'droit';
  /** Niveau de départ des couches (0 à 1) ; une couche absente part à 1 (contrat 2, §2). */
  couches?: Record<string, number>;
  /** Correction de niveau par formation de la ville, en dB (mesurée : la ville grandit en instruments, pas en volume). */
  niveaux?: Partial<Record<Formation, number>>;
}

/**
 * Contexte d'une version (faits publics seulement, contrat 2, §1) : variation de la mélodie, intensité (0 à 1 : le duel
 * qui se tend), chapitre de l'aventure (0 prologue à 5 ; 6 : champion), lu au début de chaque passage.
 */
export interface OptVersion { melodie?: VariationMelodie; intensite?: number; chapitre?: number }

export interface DefJingle {
  id: JingleId;
  titre: string;
  tempo: number;
  salle: SalleId;
  gain: number;
  mix: Partial<Record<InstrId, Mix>>;
  instruments: InstrId[];
  duree: number;
  ev: () => Evenement[];
}

// ------------------------------------------------------------------ déroulé d'un thème

export interface Deroule { mel: NoteP[]; acc: AccordP[]; total: number; debuts: number[]; cles: string[] }

/** La forme du thème mise bout à bout (positions absolues), transposée et réharmonisée au besoin. */
export function derouler(th: Theme, o: { transposer?: number; enrichir?: boolean; forme?: string[] } = {}): Deroule {
  const mel: NoteP[] = [];
  const acc: AccordP[] = [];
  const debuts: number[] = [];
  const cles = o.forme ?? th.forme;
  let t0 = 0;
  for (const k of cles) {
    const s = th.sections[k]!;
    debuts.push(t0);
    mel.push(...deplacer(transposer(s.melodie, o.transposer ?? 0), t0));
    let a = deplacerAccords(s.accords, t0);
    if (o.transposer) a = transposerAccords(a, o.transposer);
    if (o.enrichir) a = enrichir(a);
    acc.push(...a);
    t0 += s.mesures * th.mesure;
  }
  return { mel, acc, total: t0, debuts, cles };
}
const deplacerAccords = (as: readonly AccordP[], dt: number): AccordP[] => as.map((a) => ({ ...a, t: a.t + dt }));
/**
 * Dynamique par section (contrat 2, §2, « jeu ensemble ») : la vélocité de chaque note multipliée selon la section où
 * elle tombe (`debuts` : début de chaque section, en temps).
 */
export function dynamiques(ev: readonly Evenement[], debuts: readonly number[], f: readonly number[]): Evenement[] {
  return ev.map((e) => {
    let i = 0;
    for (let k = 0; k < debuts.length; k++) if (e.t >= debuts[k]! - 1e-6) i = k;
    return { ...e, v: Math.min(1, e.v * (f[i] ?? 1)) };
  });
}
export const fenetre = <T extends { t: number }>(xs: readonly T[], a: number, b: number): T[] => xs.filter((x) => x.t >= a && x.t < b).map((x) => ({ ...x, t: x.t - a }));

/**
 * La mélodie d'une section transformée par une variation « à la Zelda » (dans le ton de la section) : à l'envers,
 * renversée autour de `axe`, dans l'autre mode (majeur ↔ mineur naturel), en valeurs doublées.
 */
export function varier(ns: readonly NoteP[], v: VariationMelodie, th: Theme, duree: number, axe = midi('A5')): NoteP[] {
  switch (v) {
    case 'envers': return retrograde(ns, duree);
    case 'renversee': return renverser(ns, axe, th.tonique, th.mode);
    case 'mineur': return th.mode === 'ionien' ? changerMode(ns, th.tonique, 'ionien', 'eolien') : changerMode(ns, th.tonique, th.mode, 'ionien');
    case 'lente': return augmenter(ns, 2).filter((x) => x.t < duree);
    default: return [...ns];
  }
}

/**
 * La formation de la ville selon le chapitre (contrat 2, §2, « la ville qui grandit ») : au prologue et au chapitre I,
 * une guitare et une contrebasse ; aux chapitres II et III, le trio ; IV et V, avec les vents ; champion (6), la
 * réharmonisation triomphante. Sans chapitre (laboratoire, jeu standard) : le trio.
 */
export type Formation = 'duo' | 'trio' | 'vents' | 'champion';
export function formation(chapitre: number | undefined): Formation {
  if (chapitre === undefined) return 'trio';
  return chapitre <= 1 ? 'duo' : chapitre <= 3 ? 'trio' : chapitre <= 5 ? 'vents' : 'champion';
}

/** Les événements d'une couche du mélange (contrat 2, §2). */
export const enCouche = (ev: readonly Evenement[], couche: string): Evenement[] => ev.map((e) => ({ ...e, couche }));
/** Les événements décalés de `dt` temps. */
export const decaler = (ev: readonly Evenement[], dt: number): Evenement[] => ev.map((e) => ({ ...e, t: e.t + dt }));

