/**
 * M13 — ponctuations (pur) : des accents musicaux courts, calés sur le temps suivant et voicés dans l'accord qui sonne
 * (contrat `docs/m13/02_MUSIQUE_INTERACTIVE.md`, §2) : Clash gagné (une gerbe claire au vibraphone et la cloche de la
 * ride), Clash perdu (un accord sourd dans le grave), Signature annoncée (tout l'orchestre, crash), prolongation (roulement
 * de caisse claire puis crash), fin de duel (cymbale étouffée, fondamentale, accord bref). Positions en temps depuis
 * l'instant de la ponctuation, sans swing.
 */
import type { Evenement } from './generateurs';
import { accord, pc, voicer, type Accord } from './theorie';

export type PonctuationId = 'gagne' | 'perdu' | 'signature' | 'prolongation' | 'fin';

/** La basse de l'accord, dans le grave de la contrebasse. */
const grave = (a: Accord, lo = 33, hi = 44): number => {
  for (let m = lo; m <= hi; m++) if (pc(m) === a.basse) return m;
  return lo;
};

/** Notes de l'accord voicées dans une tessiture, à la même attaque. */
const plaque = (a: Accord, t: number, d: number, instr: Evenement['instr'], v: number, lo: number, hi: number, gerbe = 0): Evenement[] =>
  voicer(a, null, { lo, hi }).map((m, i) => ({ t: t + i * gerbe, d: d - i * gerbe, instr, m, v, droit: true, couche: 'ponct' }));

export function ponctuation(id: PonctuationId, sym: string): { ev: Evenement[]; duree: number } {
  const a = accord(sym);
  const f = (t: number, d: number, instr: Evenement['instr'], m: number, v: number, x: Partial<Evenement> = {}): Evenement => ({ t, d, instr, m, v, droit: true, couche: 'ponct', ...x });
  switch (id) {
    case 'gagne':
      // une gerbe montante au vibraphone, dans l'aigu de l'accord, et la cloche de la ride
      return { ev: [...plaque(a, 0, 1.6, 'vibra', 0.55, 72, 89, 0.06), f(0, 1.5, 'cloche', 0, 0.3)], duree: 2 };
    case 'perdu':
      // un accord sourd dans le grave, la fondamentale, un coup feutré
      return { ev: [...plaque(a, 0, 2, 'piano', 0.4, 45, 60), f(0, 2, 'basse', grave(a), 0.55), f(0, 0.3, 'gc', 0, 0.3)], duree: 2.5 };
    case 'signature':
      // tout l'orchestre sur le temps : crash, grosse caisse, accord plein au piano, gerbe du vibraphone, la fondamentale
      return {
        ev: [
          f(0, 3, 'crash', 0, 0.62), f(0, 0.4, 'gc', 0, 0.6),
          ...plaque(a, 0, 2, 'piano', 0.72, 50, 76), ...plaque(a, 0, 2.5, 'vibra', 0.6, 72, 89, 0.04),
          f(0, 2, 'basse', grave(a), 0.8),
        ],
        duree: 3,
      };
    case 'prolongation':
      // un roulement de caisse claire qui monte, puis crash et fondamentale sur le temps suivant
      return {
        ev: [
          ...[0, 0.25, 0.5, 0.75].map((t, i) => f(t, 0.2, 'cc', i % 2, 0.25 + i * 0.1)),
          f(1, 3, 'crash', 0, 0.58), f(1, 0.4, 'gc', 0, 0.55), f(1, 2, 'basse', grave(a), 0.75),
        ],
        duree: 4,
      };
    case 'fin':
      // la fin de la musique : cymbale étouffée à la main, la fondamentale, un accord bref
      return {
        ev: [f(0, 0.55, 'crash', 0, 0.6, { etouffe: true }), f(0, 0.4, 'gc', 0, 0.5), f(0, 1.2, 'basse', grave(a), 0.75), ...plaque(a, 0, 0.6, 'piano', 0.6, 50, 74)],
        duree: 2,
      };
  }
}
