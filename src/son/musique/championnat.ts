/**
 * M13, lot MU-C — thème VI, « Championnat » (pur) : big band en si bémol majeur, pour la poule et le Miroir (VI-1, 150)
 * et la Finale (VI-2 : un ton plus haut, plus rapide, plus ample : les cordes, l'orchestre entier à chaque section, 160).
 * La tête passe d'un pupitre à l'autre : les saxophones en soli au premier A, la trompette ouverte et les cuivres au
 * deuxième, les cuivres en soli au pont, tout l'orchestre au dernier A ; la guitare en quatre et la marche dessous. Un
 * passage sur deux, un chorus de trompette sur des fonds de saxophones. Couches du duel comme le thème III.
 */
import { derouler, dynamiques, enCouche, fenetre, type DefVersion } from './arrangement';
import { ostinatoTension, pulsation } from './duel';
import {
  accordsTenus, basseMarche, batterieRide, chorus, comping, coups, guitareQuatre, harmoniser, humaniser, orner, ornerVents, versEvenements,
  type Evenement, type InstrId, type Rng,
} from './generateurs';
import { CHAMPIONNAT, type NoteP } from './partitions';
import { transposer } from './variations';

const INSTRUMENTS: InstrId[] = ['piano', 'basse', 'guitare', 'sax', 'saxes', 'trompette-ouverte', 'cuivres', 'cordes', 'ride', 'crash', 'charley', 'charley-ferme', 'gc', 'cc'];
const dans = (ev: readonly Evenement[], dt: number): Evenement[] => ev.map((e) => ({ ...e, t: e.t + dt }));
const morceau = (ns: readonly NoteP[], a: number, z: number): NoteP[] => ns.filter((x) => x.t >= a && x.t < z);

function passeChampionnat(p: number, rng: Rng, it: number, finale: boolean): Evenement[] {
  const T = finale ? derouler(CHAMPIONNAT, { transposer: 2 }) : derouler(CHAMPIONNAT);
  const { acc, total, debuts } = T;
  const [, a2, b, a3] = debuts as [number, number, number, number];
  const ev: Evenement[] = [];
  const tete = p % 2 === 0;
  // --- fond : la marche, la ride, la guitare en quatre, le piano clairsemé (à la manière des grands orchestres de swing)
  ev.push(...basseMarche(acc, total, rng));
  ev.push(...batterieRide(total, rng, { intensite: (finale ? 0.82 : 0.7) + it * 0.15, relance: 8 }));
  ev.push(...guitareQuatre(acc, total, rng, { vel: 0.3 }));
  // en Finale, les cordes tiennent les accords à la place du piano
  if (!finale) ev.push(...comping(acc, total, rng, { instr: 'piano', densite: 0.3, vel: 0.4, tessiture: { lo: 55, hi: 74 } }));
  for (const d0 of debuts) ev.push({ t: d0, d: 3, instr: 'crash', m: 0, v: finale ? 0.5 : 0.4 });
  if (finale) ev.push(...accordsTenus(acc, total, rng, { instr: 'cordes', tessiture: { lo: 55, hi: 79 }, vel: 0.3 }));
  // --- mélodie : la tête de pupitre en pupitre, ou le chorus de trompette sur des fonds de saxophones
  const m = p >= 2 ? orner(T.mel, rng, 0.2) : T.mel;
  const mel: Evenement[] = [];
  if (tete) {
    // premier A : les saxophones en soli (quatre voix, la mélodie en haut, une octave sous l'écrit)
    mel.push(...harmoniser(transposer(morceau(m, 0, a2), -12), acc, { instr: 'saxes', voix: 4, vel: 0.62 }));
    // deuxième A : la trompette ouverte, les cuivres harmonisés sous elle
    mel.push(...ornerVents(humaniser(versEvenements(morceau(m, a2, b), 'trompette-ouverte', 0.66), rng, 0.008, 0.04), rng));
    mel.push(...harmoniser(morceau(m, a2, b), acc, { instr: 'cuivres', voix: 4, drop2: true, sansMelodie: true, vel: 0.5 }));
    // pont : les cuivres en soli, les saxophones en tenues
    mel.push(...harmoniser(morceau(m, b, a3), acc, { instr: 'cuivres', voix: 4, drop2: true, vel: 0.56 }));
    mel.push(...accordsTenus(fenetre(acc, b, a3), a3 - b, rng, { instr: 'saxes', tessiture: { lo: 50, hi: 68 }, vel: 0.34 }).map((e) => ({ ...e, t: e.t + b })));
    // dernier A : tout l'orchestre (trompette en tête, cuivres et saxophones harmonisés ; les cordes à l'octave en Finale)
    const fin = morceau(m, a3, total);
    mel.push(...ornerVents(humaniser(versEvenements(fin, 'trompette-ouverte', 0.7), rng, 0.008, 0.04), rng));
    mel.push(...harmoniser(fin, acc, { instr: 'cuivres', voix: 4, drop2: true, sansMelodie: true, vel: 0.54 }));
    mel.push(...harmoniser(transposer(fin, -12), acc, { instr: 'saxes', voix: 4, vel: 0.5 }));
    if (finale) mel.push(...versEvenements(transposer(fin, 12), 'cordes', 0.45));
  } else {
    mel.push(...ornerVents(chorus(acc, total, rng, { instr: 'trompette-ouverte', lo: 62, hi: 86, vel: 0.62 }), rng));
    // les fonds : tenues de saxophones aux A, riffs de cuivres au dernier A
    mel.push(...accordsTenus(acc, total, rng, { instr: 'saxes', tessiture: { lo: 50, hi: 68 }, vel: 0.3 }));
  }
  ev.push(...enCouche(mel, 'melodie'));
  // --- tension : l'ostinato du motif (sur la tonique), la pulsation
  ev.push(...enCouche([...ostinatoTension(acc, total, rng, { motif: transposer(CHAMPIONNAT.motif, finale ? 14 : 12).map((x) => x.m), ref: finale ? 0 : 10, octave: 0 }), ...pulsation(total, rng, it)], 'tension'));
  // --- cuivres : les coups d'orchestre en fin de phrase (le contretemps du 4, puis le 1 tenu), le grand accord final
  ev.push(...enCouche(coups(acc, debuts.flatMap((d0) => [[d0 + 7.5, 0.45], [d0 + 15.5, 0.45], [d0 + 23.5, 0.45], [d0 + 27.5, 0.45], [d0 + 28, 1.8]] as Array<[number, number]>), { instr: 'cuivres', vel: 0.64, tessiture: { lo: 55, hi: 79 } }), 'cuivres'));
  return dynamiques(ev, debuts, tete ? [0.92, 0.98, 1.04, 1.1] : [0.95, 1, 1.05, 1.1]);
}

const version = (id: 'VI-1' | 'VI-2', titre: string, tempo: number, finale: boolean): DefVersion => ({
  id, titre, tempo, mesure: 4, swing: finale ? 0.58 : 0.6, sub: 1, salle: finale ? 'grande' : 'club', gain: 0.62,
  mix: { piano: { g: 0.4 }, guitare: { g: 0.55 }, cordes: { g: 1.3 } }, instruments: INSTRUMENTS, duree: 128,
  couches: { melodie: 0, tension: 0, cuivres: 0 },
  grille: () => (finale ? derouler(CHAMPIONNAT, { transposer: 2 }) : derouler(CHAMPIONNAT)).acc,
  passe: (p, rng, o) => passeChampionnat(p, rng, o.intensite ?? (finale ? 0.7 : 0.55), finale),
});

export const VERSIONS_CHAMPIONNAT = {
  'VI-1': version('VI-1', 'Championnat', 150, false),
  'VI-2': version('VI-2', 'Championnat — la Finale', 160, true),
} as const;
