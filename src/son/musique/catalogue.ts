/**
 * M13 — catalogue (pur) : les versions et les jingles. Une version = un thème déroulé (forme, transposition, harmonie),
 * des transformations de la mélodie, des générateurs (basse, accompagnement, batterie), un tempo, un swing, une salle,
 * un mélange. Chaque passage est regénéré avec sa graine (jamais deux fois la même boucle). Contrat
 * `docs/m13/01_MUSIQUE.md`, §2. Lot MU-A : le thème I en trois versions et les quatre jingles.
 */
import { makeRng } from '../../game/engine/rng';
import type { SalleId } from './effets';
import {
  accordsTenus, arpegesBallade, basseDeux, basseLofi, basseMarche, batterieBalais, batterieLofi, batterieRide, chorus, comping,
  eviterMelodie, humaniser, lier, orner, versEvenements, type Evenement, type InstrId, type Rng,
} from './generateurs';
import { QUATRE_VOIES, type AccordP, type NoteP, type Theme } from './partitions';
import { accord, midi, swinguer, voicer } from './theorie';
import { augmenter, changerMode, deplacer, enrichir, renverser, retrograde, transposer, transposerAccords } from './variations';
import { MONOPHONIQUES } from './vents';

export type VersionId = 'I-1' | 'I-2' | 'I-3';
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
const fenetre = <T extends { t: number }>(xs: readonly T[], a: number, b: number): T[] => xs.filter((x) => x.t >= a && x.t < b).map((x) => ({ ...x, t: x.t - a }));

/** La mélodie d'une section transformée par une variation « à la Zelda » (dans le ton de la section). */
function varier(ns: readonly NoteP[], v: VariationMelodie, th: Theme, duree: number): NoteP[] {
  switch (v) {
    case 'envers': return retrograde(ns, duree);
    case 'renversee': return renverser(ns, midi('A5'), th.tonique, th.mode);
    case 'mineur': return changerMode(ns, th.tonique, 'ionien', 'eolien'); // le mode mineur naturel (éolien)
    case 'lente': return augmenter(ns, 2).filter((x) => x.t < duree);
    default: return [...ns];
  }
}

// ------------------------------------------------------------------ mélanges

/**
 * Mélange de base (relatif ; `NIVEAU` ramène l'ensemble vers −18 LUFS). Équilibré sur les pistes mesurées une à une
 * (`tools/m13-pistes.mjs`) : la mélodie devant, la contrebasse environ 4 LU dessous, l'accompagnement 5, la ride 9, la
 * charleston 14, la grosse caisse et les notes fantômes 15.
 */
const NIVEAU = 0.37;
const MIX_BASE: Partial<Record<InstrId, Mix>> = {
  piano: { g: 0.42, pan: -0.15, rev: 0.22 },
  rhodes: { g: 0.5, pan: -0.2, rev: 0.22 },
  vibra: { g: 0.66, pan: 0.25, rev: 0.32 },
  basse: { g: 0.53, pan: 0, rev: 0.05 },
  guitare: { g: 0.75, pan: -0.25, rev: 0.15 },
  nylon: { g: 0.85, pan: -0.2, rev: 0.2 },
  trompette: { g: 0.5, pan: 0.1, rev: 0.26 },
  sax: { g: 0.62, pan: -0.08, rev: 0.25 },
  flute: { g: 0.62, pan: 0.15, rev: 0.3 },
  cuivres: { g: 0.5, pan: 0, rev: 0.25 },
  cordes: { g: 1.6, pan: 0, rev: 0.42 },
  nappe: { g: 1.1, pan: 0, rev: 0.5 },
  ride: { g: 0.37, pan: 0.35, rev: 0.14 },
  cloche: { g: 0.35, pan: 0.35, rev: 0.2 },
  crash: { g: 0.32, pan: 0.4, rev: 0.2 },
  charley: { g: 1.3, pan: -0.3, rev: 0.1 },
  'charley-ferme': { g: 0.6, pan: -0.25, rev: 0.06 },
  gc: { g: 0.77, pan: 0, rev: 0.06 },
  cc: { g: 0.64, pan: -0.08, rev: 0.15 },
  'cc-balai': { g: 0.64, pan: -0.08, rev: 0.15 },
  balai: { g: 0.65, pan: 0.1, rev: 0.15 },
  rim: { g: 0.55, pan: -0.1, rev: 0.12 },
};
export function mixDe(instr: InstrId, m: Partial<Record<InstrId, Mix>>): Required<Mix> {
  const x = { g: 1, pan: 0, rev: 0.15, ...MIX_BASE[instr], ...m[instr] } as Required<Mix>;
  return { ...x, g: x.g * NIVEAU };
}

const TRIO: InstrId[] = ['piano', 'vibra', 'basse', 'ride', 'crash', 'charley', 'gc', 'cc', 'cc-balai', 'balai'];

// ------------------------------------------------------------------ I-1 Titre

const TETE = derouler(QUATRE_VOIES);
const LEVEE_I1: AccordP[] = [{ t: 0, d: 2, sym: 'Gm7' }, { t: 2, d: 2, sym: 'C7' }, { t: 4, d: 2, sym: 'Gm7' }, { t: 6, d: 2, sym: 'C7' }];

const titre: DefVersion = {
  id: 'I-1', titre: 'Les Quatre Voies — Titre', tempo: 126, mesure: 4, swing: 0.64, sub: 1, salle: 'club', gain: 1,
  mix: {}, instruments: TRIO, duree: TETE.total, grille: () => TETE.acc,
  intro: {
    duree: 8,
    acc: LEVEE_I1,
    ev: (rng) => {
      const acc = LEVEE_I1;
      return [
        ...comping(acc, 8, rng, { instr: 'piano', densite: 0.5, vel: 0.5 }),
        ...basseDeux(acc, 8, rng, 4, { fantomes: 0 }),
        ...batterieBalais(8, rng, { intensite: 0.4 }),
        // la levée : les deux dernières notes du motif, au vibraphone
        { t: 7, d: 0.5, instr: 'vibra', m: midi('E5'), v: 0.45 }, { t: 7.5, d: 0.5, instr: 'vibra', m: midi('G5'), v: 0.5 },
      ];
    },
  },
  passe: (p, rng, o) => {
    const { acc, total, debuts } = TETE;
    const tete = p % 2 === 0;
    const ev: Evenement[] = [];
    const var_ = o.melodie ?? 'originale';
    // mélodie de la tête, section par section (variation à la volée appliquée dans chaque section)
    let mel: NoteP[] = [];
    if (tete) {
      debuts.forEach((d0, i) => {
        const s = QUATRE_VOIES.sections[TETE.cles[i]!]!;
        const ns = varier(s.melodie, var_, QUATRE_VOIES, s.mesures * 4);
        mel.push(...deplacer(p >= 2 ? orner(ns, rng) : ns, d0));
      });
      mel = mel.filter((x) => x.t < total);
      ev.push(...humaniser(versEvenements(mel, 'vibra', 0.72), rng, 0.01, 0.06));
    } else {
      // chorus : le piano improvise sur la grille ; le vibraphone rappelle le motif, renversé au pont, à l'envers au dernier A
      ev.push(...humaniser(chorus(acc, total, rng, { instr: 'piano', lo: 63, hi: 86, vel: 0.56 }), rng, 0.01, 0.04));
      const motif = QUATRE_VOIES.motif;
      ev.push(...versEvenements(renverser(motif, midi('A5'), QUATRE_VOIES.tonique, 'ionien'), 'vibra', 0.42, debuts[2]!));
      ev.push(...versEvenements(retrograde(motif), 'vibra', 0.42, debuts[3]! + 24));
    }
    // basse : deux temps au premier A de la tête, puis la marche
    if (tete) {
      ev.push(...basseDeux(fenetre(acc, 0, 32), 32, rng));
      ev.push(...basseMarche(fenetre(acc, 32, total), total - 32, rng, { depart: 41 }).map((e) => ({ ...e, t: e.t + 32 })));
    } else ev.push(...basseMarche(acc, total, rng));
    // batterie : balais au premier A de la tête, puis la ride
    if (tete) {
      ev.push(...batterieBalais(32, rng, { intensite: 0.45 }));
      ev.push(...batterieRide(total - 32, rng, { intensite: 0.55, relance: 8 }).map((e) => ({ ...e, t: e.t + 32 })));
    } else ev.push(...batterieRide(total, rng, { intensite: 0.7, relance: 8 }));
    // accompagnement du piano, sous la mélodie (tête) ou sous son propre chorus (plus bas)
    ev.push(...comping(acc, total, rng, tete ? { instr: 'piano', densite: 0.5, vel: 0.48, melodie: mel } : { instr: 'piano', densite: 0.45, vel: 0.44, tessiture: { lo: 48, hi: 66 } }));
    // la tête respire (premier A retenu, le pont qui s'ouvre) ; le chorus monte jusqu'au dernier A
    return dynamiques(ev, debuts, tete ? [0.88, 0.95, 1.06, 1] : [0.92, 1, 1.07, 1.1]);
  },
};

// ------------------------------------------------------------------ I-2 Menus (lounge lofi)

const GRILLE_LOUNGE: AccordP[] = [
  { t: 0, d: 4, sym: 'Fmaj9' }, { t: 4, d: 4, sym: 'Bbmaj9' }, { t: 8, d: 4, sym: 'Gm9' }, { t: 12, d: 4, sym: 'C9sus4' },
  { t: 16, d: 4, sym: 'Am9' }, { t: 20, d: 4, sym: 'D7b9' }, { t: 24, d: 2, sym: 'Gm9' }, { t: 26, d: 2, sym: 'C9sus4' }, { t: 28, d: 4, sym: 'Fmaj9' },
];

const menus: DefVersion = {
  id: 'I-2', titre: 'Les Quatre Voies — Menus (lounge)', tempo: 80, mesure: 4, swing: 0.6, sub: 0.5, salle: 'studio', lofi: true, gain: 1,
  mix: { piano: { g: 0.6, rev: 0.25 }, rhodes: { g: 0.45, rev: 0.2 }, basse: { g: 0.5 }, gc: { g: 0.7 }, vibra: { g: 0.45 }, 'charley-ferme': { g: 0.9 } },
  instruments: ['piano', 'rhodes', 'vibra', 'basse', 'gc', 'rim', 'cc-balai', 'charley-ferme'], duree: 32, grille: () => GRILLE_LOUNGE,
  passe: (p, rng) => {
    const ev: Evenement[] = [];
    const th = QUATRE_VOIES;
    const motif = th.motif;
    // la mélodie change à chaque passage : le motif deux fois plus lent, à l'envers, renversé, puis rien (le groove seul)
    const cycle = p % 4;
    let mel: NoteP[] = [];
    if (cycle === 0) mel = [...augmenter(motif, 2), ...deplacer(transposer(augmenter(motif, 2), 4), 16)];
    else if (cycle === 1) mel = [...augmenter(retrograde(motif), 2), ...deplacer(augmenter(retrograde(transposer(motif, 2)), 2), 16)];
    else if (cycle === 2) mel = [...deplacer(augmenter(renverser(motif, midi('A5'), th.tonique, 'ionien'), 2), 8), ...deplacer(augmenter(renverser(transposer(motif, 2), midi('A5'), th.tonique, 'ionien'), 2), 24)];
    ev.push(...humaniser(versEvenements(mel, 'piano', 0.5), rng, 0.015, 0.05));
    // le Rhodes : accords tenus, un peu poussés, et une petite relance du motif en doubles croches en fin de cycle
    ev.push(...accordsTenus(GRILLE_LOUNGE, 32, rng, { instr: 'rhodes', tessiture: { lo: 52, hi: 76 }, quartes: true, vel: 0.42, antic: 0.25, melodie: mel }));
    if (cycle === 3) ev.push(...versEvenements(transposer(augmenter(motif, 0.5), 12), 'vibra', 0.35, 30));
    ev.push(...basseLofi(GRILLE_LOUNGE, 32, rng));
    ev.push(...batterieLofi(32, rng));
    return ev;
  },
};

// ------------------------------------------------------------------ I-3 Récit (ballade)

const BALLADE = derouler(QUATRE_VOIES, { transposer: -4, enrichir: true });

const recit: DefVersion = {
  id: 'I-3', titre: 'Les Quatre Voies — Récit (ballade)', tempo: 64, mesure: 4, swing: 0.56, sub: 1, salle: 'grande', pedale: true, gain: 1,
  mix: { piano: { g: 0.62, rev: 0.32, pan: -0.05 }, basse: { g: 0.4 } },
  instruments: ['piano', 'basse', 'cc-balai', 'balai', 'gc', 'charley'], duree: BALLADE.total, grille: () => BALLADE.acc,
  passe: (p, rng) => {
    const { mel, acc, total, debuts } = BALLADE;
    const ev: Evenement[] = [];
    const m2 = p >= 1 ? orner(mel, rng, 0.25) : mel;
    // le chant au piano, rubato (plus de souplesse) ; à l'octave sur les notes longues du pont au deuxième passage
    ev.push(...humaniser(versEvenements(m2, 'piano', 0.62), rng, 0.03, 0.06));
    if (p % 2 === 1) for (const x of m2) if (x.t >= debuts[2]! && x.t < debuts[3]! && x.d >= 2) ev.push({ t: x.t + 0.01, d: x.d, instr: 'piano', m: x.m - 12, v: 0.4 });
    ev.push(...arpegesBallade(acc, total, rng, { instr: 'piano', vel: 0.32 }).map((e) => ({ ...e, v: Math.min(e.v, 0.42) })));
    ev.push(...accordsTenus(acc, total, rng, { instr: 'nappe', tessiture: { lo: 55, hi: 79 }, vel: 0.35, melodie: m2 }));
    if (p % 2 === 1) {
      ev.push(...basseDeux(fenetre(acc, debuts[1]!, total), total - debuts[1]!, rng, 4, { fantomes: 0.05 }).map((e) => ({ ...e, t: e.t + debuts[1]!, v: e.v * 0.8 })));
      ev.push(...batterieBalais(total - debuts[2]!, rng, { intensite: 0.15 }).map((e) => ({ ...e, t: e.t + debuts[2]!, v: e.v * 0.7 })));
    }
    return ev;
  },
};

export const VERSIONS: Record<VersionId, DefVersion> = { 'I-1': titre, 'I-2': menus, 'I-3': recit };

// ------------------------------------------------------------------ jingles (tirés du motif)

const voix = (sym: string, lo: number, hi: number, mel: number | null): number[] => eviterMelodie(voicer(accord(sym), null, { lo, hi }), mel, accord(sym));
const accordEv = (t: number, d: number, instr: InstrId, sym: string, v: number, lo = 52, hi = 72, mel: number | null = null): Evenement[] => voix(sym, lo, hi, mel).map((m) => ({ t, d, instr, m, v }));
const n = (t: number, d: number, instr: InstrId, nom: string, v: number): Evenement => ({ t, d, instr, m: midi(nom), v });

export const JINGLES: Record<JingleId, DefJingle> = {
  victoire: {
    id: 'victoire', titre: 'Victoire', tempo: 132, salle: 'club', gain: 1, mix: {}, instruments: ['vibra', 'piano', 'basse', 'crash', 'gc', 'cc', 'ride'], duree: 6,
    ev: () => [
      // le motif en croches, puis le do aigu tenu sur Fa majeur 9
      n(0, 0.5, 'vibra', 'C5', 0.7), n(0.5, 0.5, 'vibra', 'F5', 0.72), n(1, 0.5, 'vibra', 'E5', 0.74), n(1.5, 0.5, 'vibra', 'A5', 0.78),
      n(2, 3, 'vibra', 'C6', 0.85), n(2, 3, 'vibra', 'F5', 0.5),
      n(0, 0.5, 'piano', 'C4', 0.4), n(0.5, 0.5, 'piano', 'F4', 0.42), n(1, 0.5, 'piano', 'E4', 0.44), n(1.5, 0.5, 'piano', 'A4', 0.46),
      ...accordEv(2, 3, 'piano', 'Fmaj9', 0.62, 53, 76, midi('C6')),
      n(2, 3, 'basse', 'F2', 0.85), n(1.5, 0.5, 'basse', 'C2', 0.6),
      { t: 1.5, d: 0.3, instr: 'cc', m: 0, v: 0.35 }, { t: 2, d: 3, instr: 'crash', m: 0, v: 0.55 }, { t: 2, d: 0.4, instr: 'gc', m: 0, v: 0.5 },
    ],
  },
  defaite: {
    id: 'defaite', titre: 'Défaite', tempo: 88, salle: 'club', gain: 1, mix: { piano: { g: 0.85 }, rhodes: { g: 0.6 } }, instruments: ['piano', 'rhodes', 'basse', 'ride'], duree: 8,
    ev: () => {
      // le motif à l'envers (la, mi, fa, do), sur une cadence qui tombe en fa mineur
      const mel = [n(0, 1, 'piano', 'A4', 0.55), n(1, 1, 'piano', 'E4', 0.5), n(2, 1, 'piano', 'F4', 0.5), n(3, 3.5, 'piano', 'C4', 0.48)];
      return [
        ...mel,
        ...accordEv(0, 1, 'rhodes', 'Dm9', 0.34, 48, 64, midi('A4')),
        ...accordEv(1, 1, 'rhodes', 'Bbmaj7#11', 0.32, 46, 62, midi('E4')),
        ...accordEv(2, 1, 'rhodes', 'Dbmaj7', 0.32, 46, 63, midi('F4')),
        ...accordEv(3, 3.5, 'piano', 'Fm6', 0.36, 41, 58, midi('C4')),
        n(0, 1, 'basse', 'D2', 0.65), n(1, 1, 'basse', 'Bb1', 0.62), n(2, 1, 'basse', 'Db2', 0.62), n(3, 3.5, 'basse', 'F1', 0.66),
        { t: 3, d: 3, instr: 'ride', m: 0, v: 0.22 },
      ];
    },
  },
  carte: {
    id: 'carte', titre: 'Carte gagnée', tempo: 160, salle: 'club', gain: 0.8, mix: { vibra: { g: 0.75 } }, instruments: ['vibra', 'rhodes', 'cloche'], duree: 5,
    ev: () => [
      n(0, 0.25, 'vibra', 'C5', 0.62), n(0.25, 0.25, 'vibra', 'F5', 0.66), n(0.5, 0.25, 'vibra', 'E5', 0.7), n(0.75, 0.25, 'vibra', 'A5', 0.74),
      n(1, 2.5, 'vibra', 'F6', 0.8), n(1, 2.5, 'vibra', 'C6', 0.5),
      ...accordEv(1, 3, 'rhodes', 'Fmaj7#11', 0.4, 55, 76, midi('C6')),
      { t: 1, d: 2, instr: 'cloche', m: 0, v: 0.28 },
    ],
  },
  chapitre: {
    id: 'chapitre', titre: 'Nouveau chapitre', tempo: 72, salle: 'grande', gain: 0.72, mix: { rhodes: { g: 0.8 } }, instruments: ['rhodes', 'vibra', 'basse', 'ride'], duree: 7,
    ev: () => [
      n(0, 1, 'rhodes', 'C5', 0.6), n(1, 1, 'rhodes', 'F5', 0.62), n(2, 0.5, 'rhodes', 'E5', 0.6), n(2.5, 3, 'rhodes', 'A5', 0.66),
      n(2.5, 3, 'vibra', 'A5', 0.38),
      ...accordEv(0, 5.5, 'nappe', 'Fmaj9', 0.4, 53, 72, midi('C5')),
      ...accordEv(2.5, 3, 'rhodes', 'Fmaj9', 0.36, 50, 70, midi('A5')),
      n(0, 5.5, 'basse', 'F2', 0.6),
      { t: 2.5, d: 3, instr: 'ride', m: 0, v: 0.18 },
    ],
  },
};

// ------------------------------------------------------------------ passage prêt à jouer

/** Graine d'un passage (version, graine de la partie, numéro). */
export function graineDe(id: string, graine: number, p: number): number {
  let h = 2166136261;
  for (const ch of id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return (h ^ Math.imul(graine | 0, 0x9e3779b1) ^ Math.imul(p + 1, 0x85ebca6b)) >>> 0;
}

/** Les événements d'un passage, swingués (positions et fins), triés. `p` = -1 : la levée. */
export function passage(v: DefVersion, p: number, graine: number, o: OptVersion = {}): { ev: Evenement[]; duree: number; acc: readonly AccordP[] } {
  const rng = makeRng(graineDe(v.id, graine, p));
  const brut = p < 0 ? v.intro?.ev(rng) ?? [] : v.passe(p, rng, o);
  const duree = p < 0 ? v.intro?.duree ?? 0 : v.duree;
  const sw = (t: number) => swinguer(t, v.swing, v.sub);
  const ev = brut
    .filter((e) => e.t < duree)
    .map((e) => {
      if (e.droit) return e;
      const t = sw(e.t);
      return { ...e, t, d: Math.max(0.05, sw(e.t + e.d) - t) };
    })
    .sort((a, b) => a.t - b.t);
  return { ev: lier(ev, MONOPHONIQUES), duree, acc: p < 0 ? v.intro?.acc ?? [] : v.grille(p, o) };
}
