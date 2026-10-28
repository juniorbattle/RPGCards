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

export type ThemeId = 'quatre-voies' | 'ville-nuit' | 'duel' | 'maisons' | 'kai' | 'championnat';

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

/*
 * II. « La ville la nuit » — ré mineur, AABA de 32 mesures, swing feutré.
 * La tête s'ouvre sur le motif des quatre voies renversé (une quarte qui descend, un pas qui monte, une quarte qui
 * descend : la, mi, fa, do), qui revient en marche sur sol et sur do. Sa couleur : une note longue sur la quarte
 * augmentée d'un accord lydien (mi sur si bémol, la sur mi bémol), comme une enseigne qui grésille ; la neuvième mineure
 * de la dominante (si bémol sur la 7). Le pont monte vers le relatif majeur et retrouve la même couleur (mi sur si
 * bémol), puis redescend par la dominante altérée.
 */
const melodieVille = (): NoteP[] => [
  // mesure 1, Dm9 : le motif renversé
  n(0, 1.5, 'A4'), n(1.5, 0.5, 'E4'), n(2, 0.5, 'F4'), n(2.5, 1.5, 'C4'),
  // mesure 2, Bbmaj7#11 : la quarte augmentée tenue
  n(4, 0.5, 'D4'), n(4.5, 2.5, 'E4'), n(7, 0.5, 'F4'), n(7.5, 0.5, 'G4'),
  // mesure 3, Gm9 : le motif sur ré
  n(8, 1.5, 'D5'), n(9.5, 0.5, 'A4'), n(10, 0.5, 'Bb4'), n(10.5, 1.5, 'F4'),
  // mesure 4, A7b9 : la neuvième mineure
  n(12, 0.5, 'E4'), n(12.5, 0.5, 'G4'), n(13, 2, 'Bb4'), n(15, 1, 'A4'),
  // mesure 5, Dm9 : le motif sur do
  n(16, 1.5, 'C5'), n(17.5, 0.5, 'G4'), n(18, 0.5, 'A4'), n(18.5, 1.5, 'E4'),
  // mesure 6, Ebmaj7#11 : la quarte augmentée, un demi-ton plus haut
  n(20, 0.5, 'F4'), n(20.5, 2.5, 'A4'), n(23, 0.5, 'G4'), n(23.5, 0.5, 'Bb4'),
  // mesure 7, Em7b5 puis A7b9
  n(24, 1, 'D5'), n(25, 1, 'Bb4'), n(26, 0.5, 'G4'), n(26.5, 0.5, 'F4'), n(27, 0.5, 'E4'), n(27.5, 0.5, 'C#4'),
];
const accordsVille = (fin: AccordP[]): AccordP[] => [
  c(0, 4, 'Dm9'), c(4, 4, 'Bbmaj7#11'), c(8, 4, 'Gm9'), c(12, 4, 'A7b9'), c(16, 4, 'Dm9'), c(20, 4, 'Ebmaj7#11'),
  c(24, 2, 'Em7b5'), c(26, 2, 'A7b9'), ...fin,
];
const VA1: Section = {
  mesures: 8,
  melodie: [...melodieVille(), n(28, 2, 'D4'), n(30, 0.5, 'E4'), n(30.5, 0.5, 'G4'), n(31, 0.5, 'F4'), n(31.5, 0.5, 'E4')],
  accords: accordsVille([c(28, 2, 'Dm9'), c(30, 1, 'Em7b5'), c(31, 1, 'A7b9')]),
};
const VA2: Section = {
  mesures: 8,
  melodie: [...melodieVille(), n(28, 1.5, 'D4'), n(29.5, 0.5, 'G4'), n(30, 0.5, 'G4'), n(30.5, 0.5, 'C5'), n(31, 0.5, 'F#4'), n(31.5, 0.5, 'A4')],
  accords: accordsVille([c(28, 2, 'Dm9'), c(30, 1, 'Am7b5'), c(31, 1, 'D7b9')]),
};
const VB: Section = {
  mesures: 8,
  melodie: [
    // Gm9, C9 : la montée
    n(0, 0.5, 'Bb4'), n(0.5, 0.5, 'D5'), n(1, 1.5, 'F5'), n(2.5, 0.5, 'D5'), n(3, 0.5, 'C5'), n(3.5, 0.5, 'A4'),
    n(4, 1, 'Bb4'), n(5, 0.5, 'G4'), n(5.5, 0.5, 'Bb4'), n(6, 1.5, 'D5'), n(7.5, 0.5, 'E5'),
    // Fmaj9 : le sommet ; Bbmaj7#11 : la couleur revient
    n(8, 2.5, 'G5'), n(10.5, 0.5, 'F5'), n(11, 0.5, 'E5'), n(11.5, 0.5, 'C5'),
    n(12, 3, 'E5'), n(15, 0.5, 'D5'), n(15.5, 0.5, 'C5'),
    // Em7b5, A7b9 : la redescente
    n(16, 1.5, 'Bb4'), n(17.5, 0.5, 'G4'), n(18, 1, 'D5'), n(19, 1, 'A4'),
    n(20, 1.5, 'Bb4'), n(21.5, 0.5, 'A4'), n(22, 1, 'G4'), n(23, 1, 'E4'),
    // Dm9, puis Em7b5 et la dominante altérée qui ramène au motif
    n(24, 0.5, 'F4'), n(24.5, 0.5, 'A4'), n(25, 0.5, 'C5'), n(25.5, 1.5, 'E5'), n(27, 1, 'D5'),
    n(28, 1, 'Bb4'), n(29, 1, 'G4'), n(30, 0.5, 'C5'), n(30.5, 0.5, 'Bb4'), n(31, 0.5, 'G4'), n(31.5, 0.5, 'F4'),
  ],
  accords: [
    c(0, 4, 'Gm9'), c(4, 4, 'C9'), c(8, 4, 'Fmaj9'), c(12, 4, 'Bbmaj7#11'), c(16, 4, 'Em7b5'), c(20, 4, 'A7b9'),
    c(24, 4, 'Dm9'), c(28, 2, 'Em7b5'), c(30, 2, 'A7alt'),
  ],
};
export const VILLE_NUIT: Theme = {
  id: 'ville-nuit',
  titre: 'La ville la nuit',
  tonique: midi('D4'),
  mode: 'eolien',
  mesure: 4,
  sections: { A1: VA1, A2: VA2, B: VB, A3: { ...VA1 } },
  forme: ['A1', 'A2', 'B', 'A3'],
  motif: [n(0, 1, 'A4'), n(1, 1, 'E4'), n(2, 0.5, 'F4'), n(2.5, 1.5, 'C4')],
};

/*
 * III. « Duel » — la mineur (dorien), AABA de 32 mesures, swing entraînant. Un riff de contrebasse de deux mesures (la
 * gamme de blues : la, do, ré, mi bémol, mi, sol), doublé au piano, tient les A ; il passe au IV (ré 7) puis s'arrête
 * sur la cadence (fa, mi 7 altéré). Par-dessus, la mélodie s'ouvre sur le motif des quatre voies en la mineur (mi, la,
 * sol, do) et lui répond ; elle n'entre qu'au premier Clash (couche « mélodie », contrat 2). Le pont marche.
 */
const melodieDuel = (): NoteP[] => [
  // mesures 1 et 2, Am7 : le motif, puis la réponse
  n(0, 1, 'E5'), n(1, 1, 'A5'), n(2, 0.5, 'G5'), n(2.5, 1.5, 'C6'),
  n(4.5, 0.5, 'B5'), n(5, 0.5, 'A5'), n(5.5, 0.5, 'G5'), n(6, 1, 'E5'), n(7, 1, 'D5'),
  // mesures 3 et 4 : l'appel redescend, la note tenue
  n(9, 0.5, 'C6'), n(9.5, 0.5, 'B5'), n(10, 0.5, 'A5'), n(10.5, 0.5, 'G5'), n(11, 1, 'E5'),
  n(12, 1.5, 'G5'), n(13.5, 2.5, 'A5'),
  // mesures 5 et 6, D7 : le motif sur ré
  n(16, 1, 'A4'), n(17, 1, 'D5'), n(18, 0.5, 'C5'), n(18.5, 1.5, 'F#5'),
  n(20.5, 0.5, 'E5'), n(21, 0.5, 'D5'), n(21.5, 0.5, 'C5'), n(22, 1, 'A4'), n(23, 1, 'B4'),
  // mesure 7, Fmaj7 puis E7alt ; mesure 8, Am7
  n(24, 1, 'C5'), n(25, 0.5, 'A4'), n(25.5, 0.5, 'E5'), n(26, 0.5, 'D5'), n(26.5, 0.5, 'C5'), n(27, 1, 'G#4'),
  n(28, 2, 'A4'),
];
const accordsDuelA: AccordP[] = [c(0, 8, 'Am7'), c(8, 8, 'Am7'), c(16, 8, 'D7'), c(24, 2, 'Fmaj7'), c(26, 2, 'E7alt'), c(28, 4, 'Am7')];
const DA: Section = { mesures: 8, melodie: melodieDuel(), accords: accordsDuelA };
const DB: Section = {
  mesures: 8,
  melodie: [
    n(0, 1.5, 'F5'), n(1.5, 0.5, 'E5'), n(2, 1, 'D5'), n(3, 1, 'A4'),
    n(4, 1.5, 'B4'), n(5.5, 0.5, 'D5'), n(6, 2, 'E5'),
    n(8, 1.5, 'D5'), n(9.5, 0.5, 'B4'), n(10, 1, 'G4'), n(11, 1, 'E5'),
    n(12, 3, 'B4'), n(15, 0.5, 'A4'), n(15.5, 0.5, 'C5'),
    n(16, 1.5, 'D5'), n(17.5, 0.5, 'F5'), n(18, 1, 'A5'), n(19, 1, 'E5'),
    n(20, 1.5, 'F5'), n(21.5, 0.5, 'E5'), n(22, 1, 'D5'), n(23, 1, 'G#4'),
    n(24, 0.5, 'A4'), n(24.5, 0.5, 'C5'), n(25, 0.5, 'E5'), n(25.5, 0.5, 'G5'), n(26, 2, 'B5'),
    n(28, 1, 'A5'), n(29, 1, 'F5'), n(30, 0.5, 'D5'), n(30.5, 0.5, 'C5'), n(31, 0.5, 'G#4'), n(31.5, 0.5, 'F4'),
  ],
  accords: [
    c(0, 4, 'Dm9'), c(4, 4, 'G13'), c(8, 4, 'Cmaj9'), c(12, 4, 'Fmaj7#11'), c(16, 4, 'Bm7b5'), c(20, 4, 'E7b9'),
    c(24, 4, 'Am9'), c(28, 2, 'Bm7b5'), c(30, 2, 'E7alt'),
  ],
};
/** Le riff de deux mesures (la mineur, registre de la contrebasse). */
export const RIFF_DUEL: NoteP[] = [
  n(0, 1.5, 'A1'), n(1.5, 0.5, 'C2'), n(2, 1, 'D2'), n(3, 0.5, 'Eb2'), n(3.5, 0.5, 'E2'),
  n(4, 1, 'G2'), n(5, 1, 'E2'), n(6, 0.5, 'D2'), n(6.5, 0.5, 'C2'), n(7, 0.5, 'A1'), n(7.5, 0.5, 'G1'),
];
export const DUEL: Theme = {
  id: 'duel',
  titre: 'Duel',
  tonique: midi('A4'),
  mode: 'dorien',
  mesure: 4,
  sections: { A1: DA, A2: { ...DA }, B: DB, A3: { ...DA } },
  forme: ['A1', 'A2', 'B', 'A3'],
  motif: [n(0, 1, 'E5'), n(1, 1, 'A5'), n(2, 0.5, 'G5'), n(2.5, 1.5, 'C6')],
};

/*
 * IV. « Les Maisons » — un seul thème, écrit en ré mixolydien (16 mesures, A et B), que chaque famille colore à sa
 * manière (mode, harmonie, tempo, orchestration : la leçon de Zelda) : la Cendre telle quelle en hard bop, le Voile en
 * dorien, la Ronce en blues, l'Astre en lydien. Le motif des quatre voies l'ouvre (la, ré, do, fa dièse), revient sur sol
 * et ferme la forme ; le pont passe au IV puis par le VI bémol (si bémol), la couleur sombre de la maison.
 */
const MA: Section = {
  mesures: 8,
  melodie: [
    n(0, 1, 'A4'), n(1, 1, 'D5'), n(2, 0.5, 'C5'), n(2.5, 1.5, 'F#5'),
    n(4.5, 0.5, 'E5'), n(5, 0.5, 'D5'), n(5.5, 0.5, 'C5'), n(6, 2, 'A4'),
    n(8, 1, 'G4'), n(9, 1, 'C5'), n(10, 0.5, 'B4'), n(10.5, 1.5, 'E5'),
    n(12.5, 0.5, 'D5'), n(13, 0.5, 'C5'), n(13.5, 0.5, 'B4'), n(14, 2, 'G4'),
    n(16, 0.5, 'A4'), n(16.5, 0.5, 'B4'), n(17, 0.5, 'C5'), n(17.5, 0.5, 'D5'), n(18, 0.5, 'E5'), n(18.5, 0.5, 'F#5'), n(19, 1, 'A5'),
    n(20, 0.5, 'F#5'), n(20.5, 0.5, 'E5'), n(21, 0.5, 'D5'), n(21.5, 0.5, 'C5'), n(22, 1, 'A4'), n(23, 1, 'F#4'),
    n(24, 1, 'B4'), n(25, 0.5, 'D5'), n(25.5, 1.5, 'G5'), n(27, 1, 'E5'),
    n(28, 2, 'D5'), n(30, 0.5, 'E5'), n(30.5, 0.5, 'G4'), n(31, 1, 'A4'),
  ],
  accords: [c(0, 8, 'D7'), c(8, 8, 'C/D'), c(16, 8, 'D7'), c(24, 4, 'G7'), c(28, 4, 'A7sus4')],
};
const MB: Section = {
  mesures: 8,
  melodie: [
    n(0, 1.5, 'B4'), n(1.5, 0.5, 'D5'), n(2, 2, 'F#5'),
    n(4, 0.5, 'E5'), n(4.5, 0.5, 'D5'), n(5, 1, 'B4'), n(6, 2, 'A4'),
    n(8, 1, 'G4'), n(9, 1, 'B4'), n(10, 0.5, 'D5'), n(10.5, 1.5, 'F#5'),
    n(12, 1, 'E5'), n(13, 0.5, 'C#5'), n(13.5, 0.5, 'B4'), n(14, 1, 'A4'), n(15, 1, 'G4'),
    n(16, 1, 'A4'), n(17, 1, 'D5'), n(18, 0.5, 'C5'), n(18.5, 1.5, 'F#5'),
    n(20, 0.5, 'E5'), n(20.5, 1.5, 'G5'), n(22, 1, 'E5'), n(23, 1, 'C5'),
    n(24, 1.5, 'D5'), n(25.5, 0.5, 'F5'), n(26, 2, 'A5'),
    n(28, 1, 'G5'), n(29, 0.5, 'E5'), n(29.5, 0.5, 'D5'), n(30, 2, 'A4'),
  ],
  accords: [c(0, 8, 'Gmaj7'), c(8, 4, 'Em7'), c(12, 4, 'A7'), c(16, 4, 'D7'), c(20, 4, 'C/D'), c(24, 4, 'Bbmaj7'), c(28, 4, 'A7sus4')],
};
export const MAISONS: Theme = {
  id: 'maisons', titre: 'Les Maisons', tonique: midi('D4'), mode: 'mixolydien', mesure: 4,
  sections: { A: MA, B: MB }, forme: ['A', 'B'],
  motif: [n(0, 1, 'A4'), n(1, 1, 'D5'), n(2, 0.5, 'C5'), n(2.5, 1.5, 'F#5')],
};

/*
 * V. « Kaï » — mi, blues de douze mesures, rapide et crâneur. Le riff de deux mesures monte par la blue note (mi, sol,
 * la, si bémol, si) et retombe ; il passe au IV (une quinte plus bas) ; les quatre dernières mesures répondent par le motif des quatre voies
 * sur la dominante (fa dièse, si, la, ré dièse), puis le riff revient en tête de chorus.
 */
export const RIFF_KAI: NoteP[] = [
  n(0, 0.5, 'E4'), n(0.5, 0.5, 'G4'), n(1, 0.5, 'A4'), n(1.5, 0.5, 'Bb4'), n(2, 1, 'B4'), n(3.5, 0.5, 'D5'),
  n(4, 1.5, 'E5'), n(5.5, 0.5, 'D5'), n(6, 0.5, 'B4'), n(6.5, 0.5, 'A4'), n(7, 0.5, 'G4'), n(7.5, 0.5, 'E4'),
];
const KB: NoteP[] = [
  // mesures 9 et 10 : le motif sur si 7 (fa dièse, si, la, ré dièse), puis sur la 7 (mi, la, sol, do dièse)
  n(32, 1, 'F#4'), n(33, 1, 'B4'), n(34, 0.5, 'A4'), n(34.5, 1.5, 'D#5'),
  n(36, 1, 'E4'), n(37, 1, 'A4'), n(38, 0.5, 'G4'), n(38.5, 1.5, 'C#5'),
  // mesures 11 et 12 : la chute, la note bleue, la reprise
  n(40, 0.5, 'B4'), n(40.5, 0.5, 'Bb4'), n(41, 0.5, 'A4'), n(41.5, 0.5, 'G4'), n(42, 1, 'E4'),
  n(44, 0.5, 'F#4'), n(44.5, 0.5, 'A4'), n(45, 0.5, 'B4'), n(45.5, 1.5, 'D#5'),
];
export const KAI: Theme = {
  id: 'kai', titre: 'Kaï', tonique: midi('E4'), mode: 'mixolydien', mesure: 4,
  sections: {
    T: {
      mesures: 12,
      melodie: [...RIFF_KAI, ...RIFF_KAI.map((x) => ({ ...x, t: x.t + 8 })), ...RIFF_KAI.map((x) => ({ ...x, t: x.t + 16, m: x.m - 7 })), ...RIFF_KAI.map((x) => ({ ...x, t: x.t + 24 })), ...KB],
      accords: [c(0, 16, 'E7'), c(16, 8, 'A7'), c(24, 8, 'E7'), c(32, 4, 'B7'), c(36, 4, 'A7'), c(40, 4, 'E7'), c(44, 4, 'B7')],
    },
  },
  forme: ['T'],
  motif: [n(0, 1, 'F#4'), n(1, 1, 'B4'), n(2, 0.5, 'A4'), n(2.5, 1.5, 'D#5')],
};
/** La gamme de blues de mi (mi, sol, la, si bémol, si, ré) : les notes du riff de Kaï. */
export const BLUES_MI = [4, 7, 9, 10, 11, 2];

/*
 * VI. « Championnat » — si bémol majeur, AABA de 32 mesures, big band. Le motif des quatre voies tombe juste sur
 * l'accord de tonique (fa, si bémol, la, ré) : il ouvre chaque A, revient sur do et sur ré ; le pont part vers le IV
 * (mi bémol), passe par la porte de derrière (mi bémol mineur, la bémol 7) et remonte par sol 7 vers la cadence.
 */
const ca = (fin: AccordP[]): AccordP[] => [c(0, 4, 'Bbmaj7'), c(4, 4, 'Gm7'), c(8, 4, 'Cm7'), c(12, 4, 'F7'), c(16, 4, 'Dm7'), c(20, 4, 'G7'), c(24, 2, 'Cm7'), c(26, 2, 'F7'), ...fin];
const melodieChamp = (): NoteP[] => [
  n(0, 1, 'F4'), n(1, 1, 'Bb4'), n(2, 0.5, 'A4'), n(2.5, 1.5, 'D5'),
  n(4.5, 0.5, 'C5'), n(5, 0.5, 'D5'), n(5.5, 2.5, 'F5'),
  n(8, 1, 'G4'), n(9, 1, 'C5'), n(10, 0.5, 'Bb4'), n(10.5, 1.5, 'Eb5'),
  n(12.5, 0.5, 'D5'), n(13, 0.5, 'C5'), n(13.5, 0.5, 'A4'), n(14, 2, 'F4'),
  n(16, 1, 'A4'), n(17, 1, 'D5'), n(18, 0.5, 'C5'), n(18.5, 1.5, 'F5'),
  n(20.5, 0.5, 'E5'), n(21, 0.5, 'D5'), n(21.5, 0.5, 'B4'), n(22, 1, 'G4'), n(23, 1, 'A4'),
  n(24, 1, 'Bb4'), n(25, 0.5, 'G4'), n(25.5, 0.5, 'Eb5'), n(26, 0.5, 'D5'), n(26.5, 0.5, 'C5'), n(27, 1, 'A4'),
];
const CA1: Section = { mesures: 8, melodie: [...melodieChamp(), n(28, 3, 'Bb4')], accords: ca([c(28, 2, 'Bbmaj7'), c(30, 1, 'Cm7'), c(31, 1, 'F7')]) };
const CA2: Section = { mesures: 8, melodie: [...melodieChamp(), n(28, 1.5, 'Bb4'), n(29.5, 0.5, 'D5'), n(30, 1, 'F5'), n(31, 1, 'Ab5')], accords: ca([c(28, 2, 'Bbmaj7'), c(30, 2, 'Bb7')]) };
const CB: Section = {
  mesures: 8,
  melodie: [
    n(0, 1.5, 'G5'), n(1.5, 0.5, 'F5'), n(2, 2, 'D5'),
    n(4, 1, 'Gb5'), n(5, 1, 'Eb5'), n(6, 1, 'C5'), n(7, 1, 'Gb5'),
    n(8, 1.5, 'F5'), n(9.5, 0.5, 'D5'), n(10, 2, 'A4'),
    n(12, 1, 'Ab4'), n(13, 1, 'B4'), n(14, 1, 'D5'), n(15, 1, 'F5'),
    n(16, 1.5, 'Eb5'), n(17.5, 0.5, 'G5'), n(18, 2, 'Bb5'),
    n(20, 1, 'A5'), n(21, 0.5, 'G5'), n(21.5, 0.5, 'F5'), n(22, 1, 'Eb5'), n(23, 1, 'C5'),
    n(24, 0.5, 'D5'), n(24.5, 0.5, 'F5'), n(25, 1, 'A5'), n(26, 0.5, 'G5'), n(26.5, 0.5, 'F5'), n(27, 1, 'E5'),
    n(28, 1, 'Eb5'), n(29, 1, 'D5'), n(30, 1, 'C5'), n(31, 1, 'A4'),
  ],
  accords: [c(0, 4, 'Ebmaj7'), c(4, 2, 'Ebm7'), c(6, 2, 'Ab7'), c(8, 4, 'Bbmaj7'), c(12, 4, 'G7b9'), c(16, 4, 'Cm7'), c(20, 4, 'F7'), c(24, 2, 'Dm7'), c(26, 2, 'G7'), c(28, 2, 'Cm7'), c(30, 2, 'F7')],
};
export const CHAMPIONNAT: Theme = {
  id: 'championnat', titre: 'Championnat', tonique: midi('Bb4'), mode: 'ionien', mesure: 4,
  sections: { A1: CA1, A2: CA2, B: CB, A3: { ...CA1 } }, forme: ['A1', 'A2', 'B', 'A3'],
  motif: [n(0, 1, 'F4'), n(1, 1, 'Bb4'), n(2, 0.5, 'A4'), n(2.5, 1.5, 'D5')],
};

export const THEMES: Record<ThemeId, Theme> = { 'quatre-voies': QUATRE_VOIES, 'ville-nuit': VILLE_NUIT, duel: DUEL, maisons: MAISONS, kai: KAI, championnat: CHAMPIONNAT };
