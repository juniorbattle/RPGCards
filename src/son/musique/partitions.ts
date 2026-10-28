/**
 * M13 — partitions (pur, données) : les thèmes écrits en notes. Positions et durées en temps (noires), depuis le début
 * de la section ; hauteurs MIDI. Compositions originales (contrat `docs/m13/01_MUSIQUE.md`, §1 et §2).
 */
import { midi, type Mode } from './theorie';

export interface NoteP {
  t: number;
  d: number;
  m: number;
  /** Vélocité relative (1 par défaut). */
  v?: number;
}

export interface AccordP {
  t: number;
  d: number;
  sym: string;
}

export interface Section {
  mesures: number;
  melodie: NoteP[];
  accords: AccordP[];
}

export type ThemeId = 'quatre-voies';

export interface Theme {
  id: ThemeId;
  titre: string;
  /** Tonique (MIDI, octave de référence 4) et mode, pour les transformations diatoniques. */
  tonique: number;
  mode: Mode;
  /** Temps par mesure. */
  mesure: 3 | 4;
  sections: Record<string, Section>;
  forme: string[];
  /** Le motif du thème (quatre notes), source des jingles et des fragments. */
  motif: NoteP[];
}

const n = (t: number, d: number, nom: string, v?: number): NoteP => (v === undefined ? { t, d, m: midi(nom) } : { t, d, m: midi(nom), v });
const c = (t: number, d: number, sym: string): AccordP => ({ t, d, sym });

/*
 * I. « Les Quatre Voies » — Fa majeur, AABA de 32 mesures, swing.
 * Le motif des quatre voies : une quarte qui monte, un pas qui descend, une quarte qui monte (do, fa, mi, la). Il revient
 * trois fois en marche ascendante (sur do, ré, mi), chaque fois suivi d'une descente qui s'arrête sur la note où
 * commence le motif suivant ; puis une cadence. Le pont part vers le IV (si bémol), passe par la porte de derrière
 * (si bémol mineur, mi bémol 7) et revient par une cadence en deux temps, en citant le motif sur do 7 sus.
 */
const melodieA = (): NoteP[] => [
  // mesure 1, Fmaj7 : le motif
  n(0, 1, 'C5'), n(1, 1, 'F5'), n(2, 0.5, 'E5'), n(2.5, 2.5, 'A5'),
  // mesure 2, Bbmaj7 : la descente (septième majeure tenue, 13, quinte, tierce)
  n(5.5, 0.5, 'G5'), n(6, 1, 'F5'), n(7, 1, 'D5'),
  // mesure 3, Gm7 : le motif sur ré
  n(8, 1, 'D5'), n(9, 1, 'G5'), n(10, 0.5, 'F5'), n(10.5, 2.5, 'Bb5'),
  // mesure 4, C7
  n(13.5, 0.5, 'A5'), n(14, 1, 'G5'), n(15, 1, 'E5'),
  // mesure 5, Am7 : le motif sur mi
  n(16, 1, 'E5'), n(17, 1, 'A5'), n(18, 0.5, 'G5'), n(18.5, 2.5, 'C6'),
  // mesure 6, D7b9 (si bémol : la treizième mineure)
  n(21.5, 0.5, 'Bb5'), n(22, 1, 'A5'), n(23, 1, 'F#5'),
];

const accordsA = (fin: AccordP[]): AccordP[] => [
  c(0, 4, 'Fmaj7'), c(4, 4, 'Bbmaj7'), c(8, 4, 'Gm7'), c(12, 4, 'C7'), c(16, 4, 'Am7'), c(20, 4, 'D7b9'),
  c(24, 2, 'Gm7'), c(26, 2, 'C7'), ...fin,
];

const A1: Section = {
  mesures: 8,
  melodie: [
    ...melodieA(),
    // mesures 7 et 8 : enveloppe bebop, puis le fa
    n(24, 1, 'G5'), n(25, 0.5, 'Bb5'), n(25.5, 0.5, 'A5'), n(26, 0.5, 'G5'), n(26.5, 1.5, 'E5'),
    n(28, 2, 'F5'),
  ],
  accords: accordsA([c(28, 2, 'Fmaj7'), c(30, 1, 'Gm7'), c(31, 1, 'C7')]),
};

const finA2 = (): NoteP[] => [n(24, 1, 'A5'), n(25, 0.5, 'G5'), n(25.5, 0.5, 'F5'), n(26, 0.5, 'D5'), n(26.5, 1.5, 'E5'), n(28, 3, 'F5')];

const A2: Section = { mesures: 8, melodie: [...melodieA(), ...finA2()], accords: accordsA([c(28, 4, 'F6')]) };

const B: Section = {
  mesures: 8,
  melodie: [
    n(0, 2, 'G5'), n(2, 1, 'A5'), n(3, 1, 'C6'),
    n(4, 3, 'D6'), n(7, 0.5, 'C6'), n(7.5, 0.5, 'Bb5'),
    n(8, 2, 'Ab5'), n(10, 1, 'G5'), n(11, 1, 'Db6'),
    n(12, 1.5, 'C6'), n(13.5, 0.5, 'B5'), n(14, 1, 'A5'), n(15, 1, 'F#5'),
    n(16, 2, 'G5'), n(18, 0.5, 'F5'), n(18.5, 1.5, 'D5'),
    // le motif cité sur do 7 sus (ré, sol, fa, si bémol)
    n(20, 1, 'D5'), n(21, 1, 'G5'), n(22, 0.5, 'F5'), n(22.5, 1.5, 'Bb5'),
    n(24, 0.5, 'A5'), n(24.5, 0.5, 'G5'), n(25, 1, 'E5'), n(26, 1, 'F#5'), n(27, 0.5, 'Eb5'), n(27.5, 0.5, 'D5'),
    n(28, 1, 'Bb5'), n(29, 0.5, 'A5'), n(29.5, 0.5, 'G5'), n(30, 1.5, 'E5'),
  ],
  accords: [
    c(0, 2, 'Cm7'), c(2, 2, 'F7'), c(4, 4, 'Bbmaj7'), c(8, 2, 'Bbm7'), c(10, 2, 'Eb7'), c(12, 2, 'Am7'), c(14, 2, 'D7b9'),
    c(16, 4, 'Gm7'), c(20, 4, 'C7sus4'), c(24, 2, 'Am7'), c(26, 2, 'D7b9'), c(28, 2, 'Gm7'), c(30, 2, 'C7'),
  ],
};

/** Dernier A : la fin du deuxième, avec le retournement qui ramène au début de la boucle. */
const A3: Section = { mesures: 8, melodie: [...melodieA(), ...finA2()], accords: accordsA([c(28, 2, 'F6'), c(30, 1, 'Gm7'), c(31, 1, 'C7')]) };

export const QUATRE_VOIES: Theme = {
  id: 'quatre-voies',
  titre: 'Les Quatre Voies',
  tonique: midi('F4'),
  mode: 'ionien',
  mesure: 4,
  sections: { A1, A2, B, A3 },
  forme: ['A1', 'A2', 'B', 'A3'],
  motif: [n(0, 1, 'C5'), n(1, 1, 'F5'), n(2, 0.5, 'E5'), n(2.5, 1.5, 'A5')],
};

export const THEMES: Record<ThemeId, Theme> = { 'quatre-voies': QUATRE_VOIES };
