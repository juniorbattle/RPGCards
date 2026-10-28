/**
 * M13 — thème III, « Duel » (pur) : un groove de swing sur un riff, détendu et entraînant, qui ne fatigue pas sur de
 * longues parties (la leçon de Final Fantasy VIII), en couches (contrat 2, §2) :
 * - « fond » : le riff de contrebasse doublé à la main gauche du piano, les accords piqués, la ride ;
 * - « melodie » : la tête au vibraphone et au ténor à l'octave (un passage sur deux, un chorus) ; elle entre au premier
 *   Clash ;
 * - « tension » : un ostinato du motif au piano, la charleston en croches, la grosse caisse qui marque les temps ; elle
 *   entre quand les PV d'un camp passent sous 30 % ;
 * - « cuivres » : des coups de cuivres sur les accents du riff, des tenues au pont ; ils entrent à une Signature annoncée.
 * III-1 « Duel » (144) ; III-2 « Duel tendu » (156) : le riff raccourci à une mesure, la tension d'office, la tête
 * renversée au dernier A (la leçon de Zelda). L'intensité (0 à 1, faits publics) règle la batterie et l'accompagnement.
 */
import { derouler, dynamiques, enCouche, fenetre, varier, type DefVersion } from './arrangement';
import {
  accordsTenus, basseMarche, batterieRide, chorus, comping, coups, humaniser, orner, ornerVents, versEvenements, type Evenement, type InstrId, type Rng,
} from './generateurs';
import { DUEL, RIFF_DUEL, type AccordP, type NoteP } from './partitions';
import { accord, midi, pc } from './theorie';
import { deplacer, fragment, transposer } from './variations';

const TETE = derouler(DUEL);
const INSTRUMENTS: InstrId[] = ['piano', 'vibra', 'basse', 'sax', 'cuivres', 'ride', 'crash', 'charley', 'charley-ferme', 'gc', 'cc'];

/** Le riff transposé sur la fondamentale de l'accord (relatif à la). */
const riffSur = (sym: string, notes: readonly NoteP[]): NoteP[] => {
  const k = ((pc(accord(sym).fond) - 9 + 18) % 12) - 6;
  return transposer(notes, k);
};

/**
 * La contrebasse d'un A : le riff sur les quatre premières mesures, au IV sur les mesures 5 et 6, la cadence (fa, mi)
 * à la mesure 7, la première mesure du riff à la 8. `court` : le riff réduit à sa première mesure, répétée.
 */
function riffA(acc: readonly AccordP[], court: boolean): NoteP[] {
  const out: NoteP[] = [];
  const m1 = fragment(RIFF_DUEL, 0, 4);
  const motif = court ? [...m1, ...deplacer(m1, 4)] : RIFF_DUEL;
  for (const t0 of [0, 8, 16]) {
    const sym = acc.find((a) => a.t <= t0 && a.t + a.d > t0)!.sym;
    out.push(...deplacer(riffSur(sym, motif), t0));
  }
  out.push({ t: 24, d: 1.5, m: midi('F1') }, { t: 25.5, d: 0.5, m: midi('C2') }, { t: 26, d: 1.5, m: midi('E2') }, { t: 27.5, d: 0.5, m: midi('B1') });
  out.push(...deplacer(m1, 28));
  return out;
}

/** L'ostinato de la tension : le motif en croches piquées, transposé sur chaque accord, une mesure sur deux en miroir. */
function ostinatoTension(acc: readonly AccordP[], total: number, rng: Rng): Evenement[] {
  const motif = [midi('E5'), midi('A5'), midi('G5'), midi('C6')];
  const out: Evenement[] = [];
  for (let t = 0; t < total; t += 0.5) {
    const a = acc.reduce((r, x) => (x.t <= t + 1e-6 ? x : r), acc[0]!);
    const k = ((pc(accord(a.sym).fond) - 9 + 18) % 12) - 6;
    const i = Math.round(t * 2) % 4;
    const mes = Math.floor(t / 4);
    const m = motif[mes % 2 === 0 ? i : 3 - i]! + k;
    const ok = [...accord(a.sym).tons, ...accord(a.sym).tensions].some((iv) => pc(m - accord(a.sym).fond) === iv % 12);
    if (!ok) continue;
    out.push({ t, d: 0.3, instr: 'piano', m: m - 12, v: 0.3 + (i === 0 ? 0.06 : 0) + rng() * 0.04 });
  }
  return out;
}

/** La pulsation de la tension : charleston en croches, grosse caisse feutrée sur les temps. */
function pulsation(total: number, rng: Rng, it: number): Evenement[] {
  const out: Evenement[] = [];
  for (let t = 0; t < total; t += 0.5) {
    out.push({ t, d: 0.2, instr: 'charley-ferme', m: Math.round(t * 2) % 3, v: (t % 1 === 0 ? 0.3 : 0.2) * (0.8 + it * 0.4) + rng() * 0.03 });
    if (t % 1 === 0) out.push({ t, d: 0.3, instr: 'gc', m: 0, v: 0.22 + it * 0.1 });
  }
  return out;
}

function passeDuel(p: number, rng: Rng, it: number, court: boolean): Evenement[] {
  const { total, debuts, acc } = TETE;
  const [a1, a2, b, a3] = debuts as [number, number, number, number];
  const tete = p % 2 === 0;
  const ev: Evenement[] = [];
  // --- fond : le riff (contrebasse et main gauche du piano) aux A, la marche au pont ; accords piqués ; ride
  for (const d0 of [a1, a2, a3]) {
    const r = riffA(fenetre(acc, d0, d0 + 32), court);
    ev.push(...humaniser(versEvenements(r, 'basse', 0.8, d0), rng, 0.006, 0.04));
    ev.push(...humaniser(versEvenements(transposer(r, 24), 'piano', 0.36, d0), rng, 0.008, 0.04));
    ev.push(...comping(fenetre(acc, d0, d0 + 32), 32, rng, { instr: 'piano', densite: 0.3 + it * 0.25, vel: 0.36 + it * 0.08, tessiture: { lo: 57, hi: 74 } }).map((e) => ({ ...e, t: e.t + d0 })));
  }
  ev.push(...basseMarche(fenetre(acc, b, a3), a3 - b, rng).map((e) => ({ ...e, t: e.t + b })));
  ev.push(...comping(fenetre(acc, b, a3), a3 - b, rng, { instr: 'piano', densite: 0.55, vel: 0.42, tessiture: { lo: 52, hi: 72 } }).map((e) => ({ ...e, t: e.t + b })));
  ev.push(...batterieRide(total, rng, { intensite: 0.55 + it * 0.35, relance: court ? 4 : 8 }));
  // --- mélodie : la tête (vibraphone et ténor à l'octave) ou un chorus
  const mel: Evenement[] = [];
  if (tete) {
    let m = p >= 2 ? orner(TETE.mel, rng, 0.25) : TETE.mel;
    if (court) m = [...m.filter((x) => x.t < a3), ...deplacer(varier(fragment(TETE.mel, a3, total), 'renversee', DUEL, 32, midi('E5')), a3)];
    mel.push(...humaniser(versEvenements(m, 'vibra', 0.68), rng, 0.01, 0.05));
    mel.push(...ornerVents(humaniser(versEvenements(transposer(m, -12), 'sax', 0.58), rng, 0.014, 0.05), rng));
  } else {
    mel.push(...(p % 4 === 1 ? chorus(acc, total, rng, { instr: 'vibra', lo: 65, hi: 89, vel: 0.58 }) : ornerVents(chorus(acc, total, rng, { instr: 'sax', lo: 50, hi: 74, vel: 0.58 }), rng)));
  }
  ev.push(...enCouche(mel, 'melodie'));
  // --- tension : ostinato du motif, pulsation
  ev.push(...enCouche([...ostinatoTension(acc, total, rng), ...pulsation(total, rng, it)], 'tension'));
  // --- cuivres : coups sur les accents du riff aux A, tenues au pont
  const accents: Array<[number, number]> = [];
  for (const d0 of [a1, a2, a3]) for (const t of [0, 1.5, 3.5, 8, 9.5, 11.5, 16, 17.5, 19.5]) accents.push([d0 + t, t % 8 === 0 ? 0.9 : 0.4]);
  for (const d0 of [a1, a2, a3]) accents.push([d0 + 24, 1.8], [d0 + 26, 1.8], [d0 + 28, 0.6]);
  const cuivres = [
    ...coups(acc, accents, { instr: 'cuivres', vel: 0.6, tessiture: { lo: 55, hi: 77 } }),
    ...accordsTenus(fenetre(acc, b, a3), a3 - b, rng, { instr: 'cuivres', tessiture: { lo: 53, hi: 74 }, vel: 0.42 }).map((e) => ({ ...e, t: e.t + b })),
  ];
  ev.push(...enCouche(cuivres, 'cuivres'));
  return dynamiques(ev, debuts, [0.94, 1, 1.04, 1.06]);
}

const duel: DefVersion = {
  id: 'III-1', titre: 'Duel', tempo: 144, mesure: 4, swing: 0.62, sub: 1, salle: 'club', gain: 0.75,
  mix: { piano: { g: 0.46 }, vibra: { g: 0.56 }, sax: { g: 0.5 } }, instruments: INSTRUMENTS, duree: TETE.total,
  couches: { melodie: 0, tension: 0, cuivres: 0 },
  grille: () => TETE.acc,
  passe: (p, rng, o) => passeDuel(p, rng, o.intensite ?? 0.4, false),
};

const duelTendu: DefVersion = {
  id: 'III-2', titre: 'Duel tendu', tempo: 156, mesure: 4, swing: 0.6, sub: 1, salle: 'club', gain: 0.75,
  mix: { piano: { g: 0.46 }, vibra: { g: 0.56 }, sax: { g: 0.5 } }, instruments: INSTRUMENTS, duree: TETE.total,
  couches: { melodie: 1, tension: 1, cuivres: 0 },
  grille: () => TETE.acc,
  passe: (p, rng, o) => passeDuel(p, rng, o.intensite ?? 0.85, true),
};

export const VERSIONS_DUEL = { 'III-1': duel, 'III-2': duelTendu } as const;
