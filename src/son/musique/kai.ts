/**
 * M13, lot MU-C — thème V, « Kaï » (pur) : rapide et crâneur (176), un blues de douze mesures en mi sur un riff qui
 * monte par la blue note. Deux chorus par passage : la tête (le riff à la trompette ouverte et au ténor une octave dessous, la
 * réponse par le motif des quatre voies), puis le chorus « arrêté » (la rythmique se tait sur les quatre premières
 * mesures et ne frappe que les accents du riff, la marque du rival qui fanfaronne) ; au passage suivant, les chorus
 * improvisés, le riff passé aux cuivres. Couches du duel comme le thème III.
 */
import { derouler, dynamiques, enCouche, type DefVersion } from './arrangement';
import { ostinatoTension, pulsation } from './duel';
import { basseMarche, batterieRide, chorus, comping, coups, humaniser, orner, ornerVents, versEvenements, type Evenement, type InstrId, type Rng } from './generateurs';
import { KAI, RIFF_KAI, type AccordP } from './partitions';
import { midi } from './theorie';
import { transposer } from './variations';

const T = derouler(KAI);
const CHORUS = T.total;
const ACC: AccordP[] = [...T.acc, ...T.acc.map((a) => ({ ...a, t: a.t + CHORUS }))];
const INSTRUMENTS: InstrId[] = ['piano', 'basse', 'sax', 'trompette-ouverte', 'cuivres', 'ride', 'crash', 'charley', 'charley-ferme', 'gc', 'cc'];
/** Les accents du riff (dans ses deux mesures) : la note longue du sommet, la reprise. */
const ACCENTS = [2, 3.5, 4];

const dans = (ev: readonly Evenement[], dt: number): Evenement[] => ev.map((e) => ({ ...e, t: e.t + dt }));

/** La rythmique « arrêtée » : sur les mesures dites, la contrebasse, la grosse caisse et le crash ne frappent que les accents. */
function arrets(rng: Rng, d0: number): Evenement[] {
  const out: Evenement[] = [];
  for (const m0 of [0, 8]) for (const a of ACCENTS) {
    const t = d0 + m0 + a;
    out.push({ t, d: 0.5, instr: 'basse', m: midi('E2'), v: 0.85, droit: true });
    out.push({ t, d: 0.4, instr: 'gc', m: 0, v: 0.6, droit: true }, { t, d: 1.5, instr: 'crash', m: 0, v: 0.4 + rng() * 0.05, droit: true });
  }
  return out;
}

function passeKai(p: number, rng: Rng, it: number): Evenement[] {
  const total = CHORUS * 2;
  const ev: Evenement[] = [];
  const tete = p % 2 === 0;
  // --- fond : la marche rapide, la ride, des accords piqués ; au deuxième chorus de la tête, les quatre mesures arrêtées
  const basse = basseMarche(ACC, total, rng);
  const ride = batterieRide(total, rng, { intensite: 0.78 + it * 0.2, relance: 4 });
  const arrete = (e: Evenement) => tete && e.t >= CHORUS && e.t < CHORUS + 16;
  ev.push(...basse.filter((e) => !arrete(e)), ...ride.filter((e) => !arrete(e) || e.instr === 'ride' && e.t % 1 === 0 && Math.floor(e.t) % 2 === 1));
  if (tete) ev.push(...arrets(rng, CHORUS));
  ev.push(...comping(ACC, total, rng, { instr: 'piano', densite: 0.35 + it * 0.2, vel: 0.42, tessiture: { lo: 52, hi: 72 } }).filter((e) => !arrete(e)));
  // les coups du riff, toujours
  for (const d0 of [0, 8, 24, CHORUS, CHORUS + 8, CHORUS + 24]) for (const a of ACCENTS.slice(0, 1)) ev.push({ t: d0 + a, d: 0.3, instr: 'gc', m: 0, v: 0.45, droit: true });
  // --- mélodie : le riff à l'octave (ténor, trompette ouverte) sur les deux chorus ; ou les chorus improvisés
  const mel: Evenement[] = [];
  if (tete) {
    const m = p >= 2 ? orner(T.mel, rng, 0.2) : T.mel;
    for (const d0 of [0, CHORUS]) {
      mel.push(...ornerVents(humaniser(versEvenements(transposer(m, -12), 'sax', 0.66, d0), rng, 0.01, 0.05), rng, { scoop: 0.3, chute: 0.3 }));
      mel.push(...ornerVents(humaniser(versEvenements(m, 'trompette-ouverte', 0.6, d0), rng, 0.01, 0.05), rng, { scoop: 0.3, chute: 0.3 }));
    }
  } else {
    mel.push(...ornerVents(chorus(T.acc, CHORUS, rng, { instr: 'sax', lo: 50, hi: 74, vel: 0.6, densite: 1.2 }), rng));
    mel.push(...dans(ornerVents(chorus(T.acc, CHORUS, rng, { instr: 'trompette-ouverte', lo: 62, hi: 84, vel: 0.6, densite: 1.2 }), rng), CHORUS));
  }
  ev.push(...enCouche(mel, 'melodie'));
  // --- tension : l'ostinato du motif (sur si, la dominante), la pulsation
  ev.push(...enCouche([...ostinatoTension(ACC, total, rng, { motif: KAI.motif.map((x) => x.m), ref: 11, octave: 0 }), ...pulsation(total, rng, it)], 'tension'));
  // --- cuivres : les coups du riff, et le riff lui-même aux cuivres pendant les chorus improvisés
  const cu: Evenement[] = coups(ACC, [0, CHORUS].flatMap((d0) => [0, 8, 16, 24, 40].flatMap((m0) => ACCENTS.map((a) => [d0 + m0 + a, a === 2 ? 0.9 : 0.4] as [number, number]))), { instr: 'cuivres', vel: 0.62, tessiture: { lo: 55, hi: 77 } });
  if (!tete) for (const d0 of [0, 8, CHORUS, CHORUS + 8]) cu.push(...versEvenements(transposer(RIFF_KAI, -12), 'cuivres', 0.5, d0));
  ev.push(...enCouche(cu, 'cuivres'));
  return dynamiques(ev, [0, CHORUS], [1, 1.06]);
}

export const VERSIONS_KAI = {
  'V-1': {
    id: 'V-1', titre: 'Kaï', tempo: 176, mesure: 4, swing: 0.58, sub: 1, salle: 'club', gain: 0.72,
    mix: { piano: { g: 0.44 }, sax: { g: 0.55 } }, instruments: INSTRUMENTS, duree: CHORUS * 2,
    couches: { melodie: 0, tension: 0, cuivres: 0 },
    grille: () => ACC,
    passe: (p, rng, o) => passeKai(p, rng, o.intensite ?? 0.55),
  } satisfies DefVersion,
} as const;
