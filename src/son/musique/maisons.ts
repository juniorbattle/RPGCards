/**
 * M13, lot MU-C — thème IV, « Les Maisons » (pur) : un seul thème que chaque famille colore à sa manière (la leçon de
 * Zelda : autre mode, autre harmonie, autre groove, autre orchestration), pour les défis de la famille (cadet, bras droit,
 * chef) et la Joute de la maison. Couches du duel comme le thème III (mélodie au premier Clash, tension sous 30 % de PV,
 * cuivres à une Signature annoncée). Un passage : la forme deux fois (la tête, puis un chorus ; l'inverse au passage
 * suivant).
 * - IV-1 Cendre : hard bop ardent en ré mixolydien, trompette ouverte et ténor à l'octave, ride (168).
 * - IV-2 Voile : la tête en ré dorien, cool et feutrée, flûte et trompette bouchée à l'octave, balais, voicings en
 *   quartes (110).
 * - IV-3 Ronce : swing lent et terrien, la tête bluesée au ténor (notes bleues en appoggiature), contrebasse à l'archet
 *   aux A, guitare (92).
 * - IV-4 Astre : la tête en ré lydien, vibraphone et Rhodes, basse en pédale, grande salle (120).
 */
import { derouler, dynamiques, enCouche, type DefVersion } from './arrangement';
import { ostinatoTension, pulsation } from './duel';
import {
  accordsTenus, basseDeux, basseMarche, batterieBalais, batterieRide, chorus, comping, coups, humaniser, orner, ornerVents, versEvenements,
  type Evenement, type InstrId, type Rng,
} from './generateurs';
import { MAISONS, type AccordP, type NoteP } from './partitions';
import { midi } from './theorie';
import { changerMode, consonner, transposer } from './variations';

export type Couleur = 'Cendre' | 'Voile' | 'Ronce' | 'Astre';
const c = (t: number, d: number, sym: string): AccordP => ({ t, d, sym });
const BASE = derouler(MAISONS);
const D4 = midi('D4');
const FORME = BASE.total;
const DEUX = [0, 32, 64, 96];

/** Les grilles des quatre couleurs (16 mesures). */
export const GRILLES: Record<Couleur, AccordP[]> = {
  Cendre: BASE.acc,
  Voile: [c(0, 8, 'Dm9'), c(8, 8, 'C/D'), c(16, 8, 'Dm9'), c(24, 4, 'G13'), c(28, 4, 'A7sus4'), c(32, 8, 'G9'), c(40, 4, 'Em7'), c(44, 4, 'A7'), c(48, 4, 'Dm9'), c(52, 4, 'C/D'), c(56, 4, 'Bbmaj7'), c(60, 4, 'A7sus4')],
  Ronce: [c(0, 8, 'D7'), c(8, 8, 'G7'), c(16, 8, 'D7'), c(24, 4, 'A7'), c(28, 2, 'G7'), c(30, 2, 'D7'), c(32, 8, 'G7'), c(40, 8, 'D7'), c(48, 4, 'A7'), c(52, 4, 'G7'), c(56, 4, 'D7'), c(60, 4, 'A7alt')],
  Astre: [c(0, 8, 'Dmaj7#11'), c(8, 8, 'C#m7'), c(16, 8, 'Dmaj7#11'), c(24, 4, 'E9'), c(28, 4, 'E7sus4'), c(32, 8, 'Bm7'), c(40, 4, 'E9'), c(44, 4, 'Amaj7'), c(48, 4, 'Dmaj7#11'), c(52, 4, 'C#m7'), c(56, 4, 'Bbmaj7#11'), c(60, 4, 'E7sus4')],
};

/** La tête dans chaque couleur : le mode de la famille, ramenée à sa grille. */
export const MELODIES: Record<Couleur, NoteP[]> = {
  Cendre: BASE.mel,
  Voile: consonner(changerMode(BASE.mel, D4, 'mixolydien', 'dorien'), GRILLES.Voile),
  Ronce: consonner(BASE.mel, GRILLES.Ronce),
  Astre: consonner(changerMode(BASE.mel, D4, 'mixolydien', 'lydien'), GRILLES.Astre),
};

/** La Ronce : une note bleue (la tierce mineure de l'accord, en appoggiature brève) avant certaines tierces majeures tenues. */
export function bluesee(ns: readonly NoteP[], acc: readonly AccordP[], rng: Rng): NoteP[] {
  const out: NoteP[] = [];
  for (const x of ns) {
    const a = acc.reduce((r, y) => (y.t <= x.t + 1e-6 ? y : r), acc[0]!);
    const fond = ({ D: 2, G: 7, A: 9 } as Record<string, number>)[a.sym[0]!] ?? 2;
    const tierce = (((x.m - fond) % 12) + 12) % 12 === 4;
    if (tierce && x.d >= 1 && x.t >= 0.125 && rng() < 0.7) out.push({ t: x.t - 0.125, d: 0.125, m: x.m - 1, v: 0.7 });
    out.push({ ...x });
  }
  return out;
}

const deux = (acc: readonly AccordP[]): AccordP[] => [...acc, ...acc.map((a) => ({ ...a, t: a.t + FORME }))];
const fenetreAcc = (acc: readonly AccordP[], a: number, z: number): AccordP[] => acc.filter((x) => x.t >= a && x.t < z).map((x) => ({ ...x, t: x.t - a }));
const dans = (ev: readonly Evenement[], dt: number): Evenement[] => ev.map((e) => ({ ...e, t: e.t + dt }));
const melEv = (ns: readonly NoteP[], instr: InstrId, v: number, rng: Rng, vent = false, dt = 0): Evenement[] => {
  const e = humaniser(versEvenements(ns, instr, v, dt), rng, vent ? 0.014 : 0.01, 0.05);
  return vent ? ornerVents(e, rng) : e;
};
const INSTRUMENTS: InstrId[] = ['piano', 'rhodes', 'vibra', 'basse', 'guitare', 'archet', 'sax', 'trompette', 'trompette-ouverte', 'flute', 'cuivres', 'cordes', 'ride', 'crash', 'charley', 'charley-ferme', 'gc', 'cc', 'cc-balai', 'balai'];

interface Plan {
  couleur: Couleur;
  /** La tête : ses voix (instrument, transposition, nuance, vent ?). */
  tete: Array<{ instr: InstrId; k: number; v: number; vent: boolean; sections?: 'A' | 'B' }>;
  solos: [{ instr: InstrId; lo: number; hi: number }, { instr: InstrId; lo: number; hi: number }];
  fond: (acc: AccordP[], rng: Rng, it: number) => Evenement[];
  tension: { instr: InstrId; octave: number };
  cuivres: (acc: AccordP[], rng: Rng) => Evenement[];
}

function passeMaison(pl: Plan, p: number, rng: Rng, it: number): Evenement[] {
  const g = GRILLES[pl.couleur];
  const acc = deux(g);
  const total = FORME * 2;
  const ev: Evenement[] = [];
  ev.push(...pl.fond(acc, rng, it));
  // la tête sur une forme, un chorus sur l'autre
  const teteEn = p % 2 === 0 ? 0 : FORME;
  const soloEn = p % 2 === 0 ? FORME : 0;
  let m = p >= 2 ? orner(MELODIES[pl.couleur], rng, 0.25) : MELODIES[pl.couleur];
  if (pl.couleur === 'Ronce') m = bluesee(m, g, rng);
  const mel: Evenement[] = [];
  for (const v of pl.tete) {
    const part = v.sections === 'B' ? m.filter((x) => x.t >= 32) : v.sections === 'A' ? m.filter((x) => x.t < 32) : m;
    mel.push(...melEv(transposer(part, v.k), v.instr, v.v, rng, v.vent, teteEn));
  }
  const s = pl.solos[p % 2]!;
  const sol = chorus(g, FORME, rng, { instr: s.instr, lo: s.lo, hi: s.hi, vel: 0.56 });
  mel.push(...dans(['sax', 'trompette', 'trompette-ouverte', 'flute'].includes(s.instr) ? ornerVents(sol, rng) : sol, soloEn));
  ev.push(...enCouche(mel, 'melodie'));
  ev.push(...enCouche([...ostinatoTension(acc, total, rng, { motif: MAISONS.motif.map((x) => x.m), ref: 2, instr: pl.tension.instr, octave: pl.tension.octave }), ...pulsation(total, rng, it)], 'tension'));
  ev.push(...enCouche(pl.cuivres(acc, rng), 'cuivres'));
  return dynamiques(ev, DEUX, [0.94, 1.02, 0.97, 1.06]);
}

/** Deux temps aux A, la marche au pont (sur les deux formes). */
const basseAB = (acc: readonly AccordP[], rng: Rng, marcheA: boolean): Evenement[] => {
  const out: Evenement[] = [];
  for (const d0 of [0, FORME]) {
    const a = fenetreAcc(acc, d0, d0 + 32);
    out.push(...dans(marcheA ? basseMarche(a, 32, rng) : basseDeux(a, 32, rng), d0));
    out.push(...dans(basseMarche(fenetreAcc(acc, d0 + 32, d0 + 64), 32, rng), d0 + 32));
  }
  return out;
};

/** L'archet de la Ronce aux A : la fondamentale puis la quinte, en blanches liées, comme un souffle de la maison. */
const archetA = (acc: readonly AccordP[], rng: Rng): Evenement[] => {
  const out: Evenement[] = [];
  for (const d0 of [0, FORME]) {
    for (let t = 0; t < 32; t += 2) {
      const a = acc.reduce((r, x) => (x.t <= d0 + t + 1e-6 ? x : r), acc[0]!);
      const f = ({ D: 38, G: 31, A: 33 } as Record<string, number>)[a.sym[0]!] ?? 38;
      out.push({ t: d0 + t, d: 2, instr: 'archet', m: t % 4 === 0 ? f : f + 7, v: 0.62 + rng() * 0.06 });
    }
  }
  return out;
};

const coupsHardBop = (acc: AccordP[]): Evenement[] => coups(acc, [0, FORME].flatMap((d0) => [3.5, 11.5, 19.5, 27.5, 35.5, 43.5, 51.5, 59.5].map((t) => [d0 + t, 0.45] as [number, number])), { instr: 'cuivres', vel: 0.6, tessiture: { lo: 55, hi: 77 } });
const pads = (acc: AccordP[], rng: Rng, vel: number, instr: InstrId = 'cuivres', lo = 53, hi = 74): Evenement[] => accordsTenus(acc, FORME * 2, rng, { instr, tessiture: { lo, hi }, vel });

const PLANS: Record<Couleur, Plan> = {
  Cendre: {
    couleur: 'Cendre',
    tete: [{ instr: 'trompette-ouverte', k: 0, v: 0.62, vent: true }, { instr: 'sax', k: -12, v: 0.6, vent: true }],
    solos: [{ instr: 'trompette-ouverte', lo: 62, hi: 84 }, { instr: 'sax', lo: 50, hi: 74 }],
    fond: (acc, rng, it) => [
      ...basseMarche(acc, FORME * 2, rng),
      ...batterieRide(FORME * 2, rng, { intensite: 0.72 + it * 0.2, relance: 8 }),
      ...comping(acc, FORME * 2, rng, { instr: 'piano', densite: 0.5 + it * 0.2, vel: 0.42, tessiture: { lo: 50, hi: 70 } }),
    ],
    tension: { instr: 'piano', octave: 0 },
    cuivres: (acc, rng) => [...coupsHardBop(acc), ...pads(fenetreAcc(acc, 32, 64), rng, 0.4).map((e) => ({ ...e, t: e.t + 32 })), ...pads(fenetreAcc(acc, 96, 128), rng, 0.4).map((e) => ({ ...e, t: e.t + 96 }))],
  },
  Voile: {
    couleur: 'Voile',
    tete: [{ instr: 'flute', k: 12, v: 0.55, vent: true }, { instr: 'trompette', k: 0, v: 0.5, vent: true }],
    solos: [{ instr: 'vibra', lo: 65, hi: 89 }, { instr: 'flute', lo: 72, hi: 93 }],
    fond: (acc, rng, it) => [
      ...basseAB(acc, rng, false),
      ...batterieBalais(FORME * 2, rng, { intensite: 0.42 + it * 0.25 }),
      ...comping(acc, FORME * 2, rng, { instr: 'piano', densite: 0.35, vel: 0.38, quartes: true, tessiture: { lo: 50, hi: 68 } }),
    ],
    tension: { instr: 'vibra', octave: 0 },
    cuivres: (acc, rng) => pads(acc, rng, 0.3),
  },
  Ronce: {
    couleur: 'Ronce',
    tete: [{ instr: 'sax', k: -12, v: 0.62, vent: true }],
    solos: [{ instr: 'guitare', lo: 55, hi: 77 }, { instr: 'sax', lo: 48, hi: 72 }],
    fond: (acc, rng, it) => {
      const out: Evenement[] = [...archetA(acc, rng)];
      for (const d0 of [0, FORME]) out.push(...dans(basseMarche(fenetreAcc(acc, d0 + 32, d0 + 64), 32, rng), d0 + 32));
      out.push(...batterieBalais(FORME * 2, rng, { intensite: 0.38 + it * 0.25 }));
      out.push(...comping(acc, FORME * 2, rng, { instr: 'piano', densite: 0.4, vel: 0.38, tessiture: { lo: 48, hi: 64 } }));
      out.push(...comping(acc, FORME * 2, rng, { instr: 'guitare', densite: 0.25, vel: 0.3, tessiture: { lo: 45, hi: 60 } }));
      return out;
    },
    tension: { instr: 'guitare', octave: -12 },
    cuivres: (acc, rng) => [...pads(fenetreAcc(acc, 32, 64), rng, 0.38).map((e) => ({ ...e, t: e.t + 32 })), ...pads(fenetreAcc(acc, 96, 128), rng, 0.38).map((e) => ({ ...e, t: e.t + 96 })), ...coups(acc, [28, 92].map((t) => [t, 1.8] as [number, number]), { instr: 'cuivres', vel: 0.55 })],
  },
  Astre: {
    couleur: 'Astre',
    tete: [{ instr: 'vibra', k: 0, v: 0.66, vent: false }, { instr: 'rhodes', k: -12, v: 0.4, vent: false, sections: 'B' }],
    solos: [{ instr: 'vibra', lo: 65, hi: 89 }, { instr: 'rhodes', lo: 60, hi: 84 }],
    fond: (acc, rng, it) => {
      const out: Evenement[] = [...basseDeux(acc, FORME * 2, rng, 4, { fantomes: 0.05 })];
      out.push(...batterieRide(FORME * 2, rng, { intensite: 0.42 + it * 0.3, relance: 8 }));
      out.push(...accordsTenus(acc, FORME * 2, rng, { instr: 'rhodes', quartes: true, tessiture: { lo: 52, hi: 74 }, vel: 0.36, antic: 0.25 }));
      out.push(...[0, 32, 64, 96].map((t) => ({ t, d: 3, instr: 'crash' as InstrId, m: 0, v: 0.22 })));
      return out;
    },
    tension: { instr: 'vibra', octave: 0 },
    cuivres: (acc, rng) => [...pads(acc, rng, 0.34, 'cordes', 50, 76), ...pads(acc, rng, 0.26)],
  },
};

const version = (id: DefVersion['id'], couleur: Couleur, titre: string, tempo: number, swing: number, salle: DefVersion['salle'], gain: number, mix: DefVersion['mix']): DefVersion => ({
  id, titre, tempo, mesure: 4, swing, sub: 1, salle, gain, mix, instruments: INSTRUMENTS, duree: FORME * 2,
  couches: { melodie: 0, tension: 0, cuivres: 0 },
  grille: () => deux(GRILLES[couleur]),
  passe: (p, rng, o) => passeMaison(PLANS[couleur], p, rng, o.intensite ?? 0.45),
});

export const VERSIONS_MAISONS = {
  'IV-1': version('IV-1', 'Cendre', 'Les Maisons — la Cendre (hard bop)', 168, 0.6, 'club', 0.75, { piano: { g: 0.46 } }),
  'IV-2': version('IV-2', 'Voile', 'Les Maisons — le Voile (cool)', 110, 0.64, 'club', 0.8, { piano: { g: 0.42 }, vibra: { g: 0.55 } }),
  'IV-3': version('IV-3', 'Ronce', 'Les Maisons — la Ronce (blues lent)', 92, 0.66, 'club', 0.8, { piano: { g: 0.42 }, guitare: { g: 0.6 } }),
  'IV-4': version('IV-4', 'Astre', 'Les Maisons — l\'Astre (lydien)', 120, 0.58, 'grande', 0.8, { vibra: { g: 0.6, rev: 0.4 }, rhodes: { g: 0.42, rev: 0.35 } }),
} as const;
