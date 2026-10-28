/**
 * M13 — thème II, « La ville la nuit » (pur) : trois versions, une par paire de quartiers de l'aventure, et la ville qui
 * grandit avec l'histoire (contrat 2, §2) : au prologue et au chapitre I, une guitare et une contrebasse ; aux chapitres
 * II et III, le trio ; IV et V, avec les vents ; champion, la réharmonisation triomphante (cuivres, cordes).
 * - II-1 « Le Quai et la Place du Fanal » : cool jazz de film noir en ré mineur, balais, la tête feutrée (96).
 * - II-2 « Le Parvis et la Grande Cour » : la même tête en ré majeur (changement de mode), swing festif à la ride (138).
 * - II-3 « Les Ruelles et la Ville haute » : la tête en valse (une mesure à quatre temps devient deux à trois), mode
 *   dorien, vibraphone, contre-chant joué à l'envers (112, à trois temps).
 * Un passage sur deux, un chorus improvisé sur la grille. Contrat `docs/m13/01_MUSIQUE.md`, §2.
 */
import { derouler, dynamiques, enCouche, fenetre, formation, type DefVersion } from './arrangement';
import {
  accordsTenus, basseDeux, basseMarche, basseValse, batterieBalais, batterieRide, batterieValse, chorus, comping, coups, guitareQuatre,
  harmoniser, humaniser, orner, ornerVents, versEvenements, type Evenement, type InstrId, type Rng,
} from './generateurs';
import { VILLE_NUIT, type AccordP, type NoteP } from './partitions';
import { midi } from './theorie';
import { changerMode, consonner, contreChant, enrichir, enValse, transposer } from './variations';

const c = (t: number, d: number, sym: string): AccordP => ({ t, d, sym });
const TETE = derouler(VILLE_NUIT);
const D4 = midi('D4');
const mel = (ns: readonly NoteP[], instr: InstrId, v: number, rng: Rng, s = 0.012): Evenement[] => humaniser(versEvenements(ns, instr, v), rng, s, 0.05);
const vent = (ns: readonly NoteP[], instr: InstrId, v: number, rng: Rng): Evenement[] => ornerVents(mel(ns, instr, v, rng, 0.015), rng);

// ------------------------------------------------------------------ II-1 Le Quai et la Place du Fanal (noir, ré mineur)

/** Champion : couleurs enrichies et la tierce picarde à la fin de la forme (ré majeur 9). */
const ACC_CHAMPION: AccordP[] = enrichir(TETE.acc).map((a) => (a.t === TETE.debuts[3]! + 28 ? { ...a, sym: 'Dmaj9' } : a));
const TRIO_VILLE: InstrId[] = ['piano', 'basse', 'guitare', 'balai', 'cc-balai', 'gc', 'charley', 'ride', 'crash', 'cc', 'vibra', 'nylon', 'trompette', 'sax', 'flute', 'cuivres', 'cordes'];

/** Contrebasse : deux temps aux A (marche au pont), marche partout au chorus. */
function basseVille(acc: readonly AccordP[], total: number, debuts: readonly number[], rng: Rng, marche: boolean): Evenement[] {
  if (marche) return basseMarche(acc, total, rng);
  const [, , b, a3] = debuts as [number, number, number, number];
  return [
    ...basseDeux(fenetre(acc, 0, b), b, rng),
    ...basseMarche(fenetre(acc, b, a3), a3 - b, rng).map((e) => ({ ...e, t: e.t + b })),
    ...basseDeux(fenetre(acc, a3, total), total - a3, rng).map((e) => ({ ...e, t: e.t + a3 })),
  ];
}

const quai: DefVersion = {
  id: 'II-1', titre: 'La ville la nuit — Le Quai et la Place du Fanal', tempo: 96, mesure: 4, swing: 0.62, sub: 1, salle: 'club', gain: 0.9,
  mix: { piano: { g: 0.55 }, guitare: { g: 0.6 }, sax: { g: 0.55 } }, instruments: TRIO_VILLE, duree: TETE.total,
  niveaux: { duo: -0.8, trio: 0.8, vents: -0.9, champion: -1.4 },
  grille: (_p, o) => (formation(o.chapitre) === 'champion' ? ACC_CHAMPION : TETE.acc),
  passe: (p, rng, o) => {
    const f = formation(o.chapitre);
    const { total, debuts } = TETE;
    const acc = f === 'champion' ? ACC_CHAMPION : TETE.acc;
    const tete = p % 2 === 0;
    const m0 = p >= 2 ? orner(TETE.mel, rng, 0.25) : TETE.mel;
    const ev: Evenement[] = [];
    // la mélodie (tête, chorus, contre-chant) en couche : elle s'efface quand le joueur s'arrête longtemps (la ville respire)
    const melo: Evenement[] = [];
    const [, , b, a3] = debuts as [number, number, number, number];
    if (f === 'duo') {
      // une guitare et une contrebasse : la tête à la guitare, des accords discrets dessous ; au chorus, la guitare improvise
      melo.push(...(tete ? mel(m0, 'guitare', 0.6, rng) : chorus(acc, total, rng, { instr: 'guitare', lo: 57, hi: 79, vel: 0.52, densite: 0.8 })));
      ev.push(...comping(acc, total, rng, { instr: 'guitare', densite: 0.25, vel: 0.32, tessiture: { lo: 45, hi: 60 }, melodie: tete ? m0 : undefined }));
      ev.push(...basseVille(acc, total, debuts, rng, !tete));
    } else if (f === 'trio') {
      melo.push(...(tete ? mel(transposer(m0, 12), 'piano', 0.56, rng) : chorus(acc, total, rng, { instr: 'piano', lo: 62, hi: 86, vel: 0.52 })));
      ev.push(...comping(acc, total, rng, { instr: 'piano', densite: 0.4, vel: 0.4, tessiture: { lo: 48, hi: 64 }, melodie: tete ? transposer(m0, 12) : undefined }));
      ev.push(...basseVille(acc, total, debuts, rng, !tete));
      ev.push(...batterieBalais(total, rng, { intensite: tete ? 0.4 : 0.5 }));
    } else {
      // les vents : le ténor aux A, la trompette bouchée au pont, les deux à l'octave au dernier A ; au chorus, l'un puis l'autre
      if (tete) {
        const aux = (a: number, z: number) => fenetre(m0, a, z).map((x) => ({ ...x, t: x.t + a }));
        const octaves = f === 'champion';
        melo.push(...vent(transposer(aux(0, b), -12), 'sax', 0.62, rng));
        if (octaves) melo.push(...vent(aux(0, b), 'trompette', 0.5, rng));
        melo.push(...vent(aux(b, a3), 'trompette', 0.6, rng));
        if (octaves) melo.push(...vent(transposer(aux(b, a3), -12), 'sax', 0.5, rng));
        melo.push(...vent(aux(a3, total), 'trompette', 0.56, rng), ...vent(transposer(aux(a3, total), -12), 'sax', 0.56, rng));
      } else {
        melo.push(...ornerVents(p % 4 === 1 ? chorus(acc, total, rng, { instr: 'sax', lo: 48, hi: 72, vel: 0.55, densite: 0.8 }) : chorus(acc, total, rng, { instr: 'trompette', lo: 60, hi: 82, vel: 0.55, densite: 0.8 }), rng));
      }
      ev.push(...comping(acc, total, rng, { instr: 'piano', densite: 0.4, vel: 0.38, tessiture: { lo: 50, hi: 68 }, melodie: tete ? m0 : undefined }));
      ev.push(...basseVille(acc, total, debuts, rng, !tete || f === 'champion'));
      if (f === 'champion') {
        ev.push(...batterieRide(total, rng, { intensite: 0.55, relance: 8 }));
        // les cuivres tiennent le pont, puis ponctuent la fin de la forme
        ev.push(...accordsTenus(fenetre(acc, b, a3), a3 - b, rng, { instr: 'cuivres', tessiture: { lo: 53, hi: 72 }, vel: 0.24 }).map((e) => ({ ...e, t: e.t + b })));
        ev.push(...coups(acc, [[a3 + 27.5, 0.45], [a3 + 28, 1.8]], { instr: 'cuivres', vel: 0.42, tessiture: { lo: 55, hi: 76 } }));
      } else ev.push(...batterieBalais(total, rng, { intensite: tete ? 0.45 : 0.55 }));
    }
    ev.push(...enCouche(melo, 'melodie'));
    return dynamiques(ev, debuts, tete ? [0.9, 0.95, 1.05, 1] : [0.95, 1, 1.05, 1.08]);
  },
};

// ------------------------------------------------------------------ II-2 Le Parvis et la Grande Cour (ré majeur, festif)

const accMajA = (fin: AccordP[]): AccordP[] => [c(0, 4, 'Dmaj9'), c(4, 4, 'Gmaj9'), c(8, 4, 'Em9'), c(12, 4, 'Em9'), c(16, 4, 'A13'), c(20, 4, 'Gmaj7#11'), c(24, 2, 'Em9'), c(26, 2, 'A13'), ...fin];
const ACC_MAJ: AccordP[] = [
  ...accMajA([c(28, 2, 'Dmaj9'), c(30, 1, 'Em7'), c(31, 1, 'A7')]),
  ...accMajA([c(28, 2, 'Dmaj9'), c(30, 1, 'Am7'), c(31, 1, 'D7')]).map((a) => ({ ...a, t: a.t + 32 })),
  ...[c(0, 4, 'Gmaj7#11'), c(4, 4, 'Em9'), c(8, 4, 'A13'), c(12, 4, 'Dmaj9'), c(16, 4, 'Gmaj9'), c(20, 4, 'A13'), c(24, 4, 'Dmaj9'), c(28, 2, 'Em9'), c(30, 2, 'A13')].map((a) => ({ ...a, t: a.t + 64 })),
  ...accMajA([c(28, 2, 'Dmaj9'), c(30, 1, 'Em7'), c(31, 1, 'A7')]).map((a) => ({ ...a, t: a.t + 96 })),
];
/** La tête en ré majeur : chaque degré garde son rang (la, mi, fa dièse, do dièse), ramenée à l'harmonie majeure. */
export const MEL_MAJ: NoteP[] = consonner(changerMode(TETE.mel, D4, 'eolien', 'ionien'), ACC_MAJ);

const parvis: DefVersion = {
  id: 'II-2', titre: 'La ville la nuit — Le Parvis et la Grande Cour', tempo: 138, mesure: 4, swing: 0.6, sub: 1, salle: 'club', gain: 0.9,
  mix: { vibra: { g: 0.6 }, guitare: { g: 0.7 } }, instruments: TRIO_VILLE, duree: TETE.total,
  niveaux: { duo: -1.5, trio: -2, vents: -3.3, champion: -3.1 },
  grille: () => ACC_MAJ,
  passe: (p, rng, o) => {
    const f = formation(o.chapitre);
    const { total, debuts } = TETE;
    const acc = ACC_MAJ;
    const tete = p % 2 === 0;
    const m0 = p >= 2 ? orner(MEL_MAJ, rng, 0.25) : MEL_MAJ;
    const ev: Evenement[] = [];
    // la mélodie (tête, chorus, contre-chant) en couche : elle s'efface quand le joueur s'arrête longtemps (la ville respire)
    const melo: Evenement[] = [];
    const [, , b, a3] = debuts as [number, number, number, number];
    const aux = (a: number, z: number) => fenetre(m0, a, z).map((x) => ({ ...x, t: x.t + a }));
    if (f === 'duo') {
      melo.push(...(tete ? mel(m0, 'guitare', 0.62, rng) : chorus(acc, total, rng, { instr: 'guitare', lo: 57, hi: 81, vel: 0.55 })));
      ev.push(...basseMarche(acc, total, rng));
    } else {
      if (f === 'trio') {
        melo.push(...(tete ? mel(transposer(m0, 12), 'vibra', 0.66, rng) : chorus(acc, total, rng, { instr: 'piano', lo: 62, hi: 86, vel: 0.54 })));
      } else if (tete) {
        // les vents : le ténor, la trompette à l'octave au pont ; champion : les cuivres en soli au pont et au dernier A
        melo.push(...vent(transposer(aux(0, b), -12), 'sax', 0.62, rng));
        if (f === 'champion') {
          melo.push(...harmoniser(aux(b, total), acc, { instr: 'cuivres', voix: 4, drop2: true, vel: 0.55 }));
          melo.push(...mel(transposer(aux(b, total), 12), 'vibra', 0.5, rng));
        } else {
          melo.push(...vent(aux(b, a3), 'trompette', 0.6, rng), ...vent(transposer(aux(b, a3), -12), 'sax', 0.5, rng));
          melo.push(...vent(transposer(aux(a3, total), -12), 'sax', 0.62, rng));
        }
      } else {
        melo.push(...ornerVents(chorus(acc, total, rng, p % 4 === 1 ? { instr: 'sax', lo: 48, hi: 74, vel: 0.56 } : { instr: 'trompette', lo: 60, hi: 84, vel: 0.56 }), rng));
      }
      ev.push(...comping(acc, total, rng, { instr: 'piano', densite: 0.55, vel: 0.42, tessiture: { lo: 50, hi: 70 }, melodie: tete ? m0 : undefined }));
      if (f !== 'trio') ev.push(...guitareQuatre(acc, total, rng, { vel: 0.3 }));
      // les coups de cuivres à la fin de chaque section (le contretemps du 4, puis le 1)
      if (f === 'vents' || f === 'champion') ev.push(...coups(acc, debuts.flatMap((d0) => [[d0 + 27.5, 0.45], [d0 + 30, 1.4]] as Array<[number, number]>), { instr: 'cuivres', vel: 0.58, tessiture: { lo: 55, hi: 77 } }));
      ev.push(...basseMarche(acc, total, rng));
      ev.push(...batterieRide(total, rng, { intensite: f === 'champion' ? 0.85 : 0.65, relance: 8 }));
    }
    ev.push(...enCouche(melo, 'melodie'));
    return dynamiques(ev, debuts, tete ? [0.92, 0.97, 1.04, 1.06] : [0.95, 1, 1.05, 1.08]);
  },
};

// ------------------------------------------------------------------ II-3 Les Ruelles et la Ville haute (valse, ré dorien)

const valseA = (fin: AccordP[]): AccordP[] => [c(0, 6, 'Dm9'), c(6, 6, 'Fmaj9'), c(12, 6, 'G9'), c(18, 6, 'Am9'), c(24, 6, 'Dm9'), c(30, 6, 'Fmaj7#11'), c(36, 3, 'Em7'), c(39, 3, 'A7b9'), ...fin];
const ACC_VALSE: AccordP[] = [
  ...valseA([c(42, 3, 'Dm9'), c(45, 3, 'A7b9')]),
  ...valseA([c(42, 3, 'Dm9'), c(45, 3, 'D7b9')]).map((a) => ({ ...a, t: a.t + 48 })),
  ...[c(0, 6, 'G9'), c(6, 6, 'Cmaj9'), c(12, 6, 'Fmaj9'), c(18, 6, 'Am9'), c(24, 6, 'Em7'), c(30, 6, 'A9sus4'), c(36, 6, 'Dm9'), c(42, 3, 'Em7'), c(45, 3, 'A7alt')].map((a) => ({ ...a, t: a.t + 96 })),
  ...valseA([c(42, 3, 'Dm9'), c(45, 3, 'A7b9')]).map((a) => ({ ...a, t: a.t + 144 })),
];
const TOTAL_VALSE = 192;
const DEBUTS_VALSE = [0, 48, 96, 144];
/** La tête en valse, en ré dorien, ramenée à la grille de la valse. */
export const MEL_VALSE: NoteP[] = consonner(enValse(changerMode(TETE.mel, D4, 'eolien', 'dorien')), ACC_VALSE);
/**
 * Le contre-chant : la tête jouée à l'envers phrase par phrase (quatre mesures), à l'octave écrite (une octave sous le
 * vibraphone), sans frotter ; une note sous le do grave de la flûte remonte d'une octave.
 */
export const CONTRE_VALSE: NoteP[] = contreChant(MEL_VALSE, ACC_VALSE, TOTAL_VALSE, { phrase: 12 }).map((x) => (x.m < 60 ? { ...x, m: x.m + 12 } : x));
const ACC_VALSE_CHAMPION = enrichir(ACC_VALSE);

const ruelles: DefVersion = {
  id: 'II-3', titre: 'La ville la nuit — Les Ruelles et la Ville haute (valse)', tempo: 112, mesure: 3, swing: 0.6, sub: 1, salle: 'club', gain: 0.9,
  mix: { vibra: { g: 0.62, rev: 0.36 }, flute: { g: 0.5 }, nylon: { g: 0.85 } }, instruments: TRIO_VILLE, duree: TOTAL_VALSE,
  niveaux: { duo: -2.8, trio: -0.7, vents: -0.8, champion: -2 },
  grille: (_p, o) => (formation(o.chapitre) === 'champion' ? ACC_VALSE_CHAMPION : ACC_VALSE),
  passe: (p, rng, o) => {
    const f = formation(o.chapitre);
    const acc = f === 'champion' ? ACC_VALSE_CHAMPION : ACC_VALSE;
    const tete = p % 2 === 0;
    const m0 = p >= 2 ? orner(MEL_VALSE, rng, 0.2) : MEL_VALSE;
    const ev: Evenement[] = [];
    // la mélodie (tête, chorus, contre-chant) en couche : elle s'efface quand le joueur s'arrête longtemps (la ville respire)
    const melo: Evenement[] = [];
    if (f === 'duo') {
      melo.push(...(tete ? mel(m0, 'nylon', 0.62, rng) : chorus(acc, TOTAL_VALSE, rng, { instr: 'nylon', lo: 55, hi: 79, vel: 0.52, densite: 0.8 })));
      ev.push(...comping(acc, TOTAL_VALSE, rng, { instr: 'nylon', densite: 0.3, vel: 0.3, tessiture: { lo: 45, hi: 60 }, melodie: tete ? m0 : undefined }, 3));
      ev.push(...basseValse(acc, TOTAL_VALSE, rng));
    } else {
      melo.push(...(tete ? mel(transposer(m0, 12), 'vibra', 0.64, rng) : chorus(acc, TOTAL_VALSE, rng, { instr: 'vibra', lo: 65, hi: 89, vel: 0.56, densite: 0.8 })));
      // le contre-chant à l'envers : à la flûte avec les vents, au piano dans le trio (au deuxième A et au dernier)
      if (tete && f !== 'trio') melo.push(...mel(CONTRE_VALSE, 'flute', 0.45, rng, 0.015));
      if (tete && f === 'trio') melo.push(...mel(CONTRE_VALSE.filter((x) => x.t >= 48 && x.t < 96 || x.t >= 144), 'piano', 0.4, rng));
      ev.push(...comping(acc, TOTAL_VALSE, rng, { instr: 'piano', densite: 0.45, vel: 0.38, tessiture: { lo: 48, hi: 66 }, melodie: tete ? transposer(m0, 12) : undefined }, 3));
      ev.push(...basseValse(acc, TOTAL_VALSE, rng, { marche: !tete && f !== 'trio' }));
      ev.push(...batterieValse(TOTAL_VALSE, rng, { intensite: tete ? 0.45 : 0.55, balais: f === 'trio' }));
      if (f === 'champion') ev.push(...accordsTenus(acc, TOTAL_VALSE, rng, { instr: 'cordes', tessiture: { lo: 50, hi: 74 }, vel: 0.4, melodie: tete ? transposer(m0, 12) : undefined }));
    }
    ev.push(...enCouche(melo, 'melodie'));
    return dynamiques(ev, DEBUTS_VALSE, tete ? [0.9, 0.95, 1.05, 1] : [0.95, 1, 1.05, 1.08]);
  },
};

export const VERSIONS_VILLE = { 'II-1': quai, 'II-2': parvis, 'II-3': ruelles } as const;
