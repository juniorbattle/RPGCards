/**
 * M13 — variations (pur) : les procédés « à la Zelda » appliqués à une partition (contrat `docs/m13/01_MUSIQUE.md`, §3) :
 * accéléré ou ralenti (le tempo, dans la version), valeurs allongées ou raccourcies, à l'envers (rétrograde), renversé
 * (miroir diatonique), autre mode, transposé, déplacé, fragment, ostinato, réharmonisé. Composables ; aucune ne modifie
 * son entrée.
 */
import type { AccordP, NoteP } from './partitions';
import { accord, dansAccord, degre, depuisDegre, MODES, transposerSym, type Mode } from './theorie';

const fin = (ns: readonly NoteP[]): number => ns.reduce((m, x) => Math.max(m, x.t + x.d), 0);

/** Valeurs multipliées par `k` (2 : augmentation, ralenti écrit ; 0,5 : diminution). */
export const augmenter = (ns: readonly NoteP[], k: number): NoteP[] => ns.map((x) => ({ ...x, t: x.t * k, d: x.d * k }));

/** À l'envers : l'ordre des notes et leurs places retournés dans la durée `duree` (par défaut, la fin de la dernière note). */
export function retrograde(ns: readonly NoteP[], duree = fin(ns)): NoteP[] {
  return ns.map((x) => ({ ...x, t: duree - (x.t + x.d) })).sort((a, b) => a.t - b.t);
}

/** Renversé : chaque intervalle pris en miroir autour de `axe` (hauteur MIDI), dans la gamme (reste dans le ton). */
export function renverser(ns: readonly NoteP[], axe: number, tonique: number, mode: Mode): NoteP[] {
  const g = MODES[mode];
  const da = degre(axe, tonique, g);
  return ns.map((x) => {
    const d = degre(x.m, tonique, g);
    return { ...x, m: depuisDegre(2 * da - d, tonique, g) };
  });
}

/** Autre mode, même tonique : chaque degré garde son rang (majeur → dorien, éolien, lydien…). */
export function changerMode(ns: readonly NoteP[], tonique: number, de: Mode, vers: Mode): NoteP[] {
  const g1 = MODES[de];
  const g2 = MODES[vers];
  return ns.map((x) => ({ ...x, m: depuisDegre(degre(x.m, tonique, g1), tonique, g2) }));
}

export const transposer = (ns: readonly NoteP[], k: number): NoteP[] => ns.map((x) => ({ ...x, m: x.m + k }));
export const deplacer = (ns: readonly NoteP[], dt: number): NoteP[] => ns.map((x) => ({ ...x, t: x.t + dt }));

/** Les notes qui commencent dans [a, b[, ramenées au début. */
export const fragment = (ns: readonly NoteP[], a: number, b: number): NoteP[] => ns.filter((x) => x.t >= a && x.t < b).map((x) => ({ ...x, t: x.t - a, d: Math.min(x.d, b - x.t) }));

/** Le motif répété toutes les `periode` temps pendant `duree`. */
export function ostinato(motif: readonly NoteP[], periode: number, duree: number): NoteP[] {
  const out: NoteP[] = [];
  for (let t0 = 0; t0 < duree - 1e-9; t0 += periode) for (const x of motif) if (t0 + x.t < duree) out.push({ ...x, t: t0 + x.t, d: Math.min(x.d, duree - t0 - x.t) });
  return out;
}

/** Octave de la mélodie ramenée pour que sa plus haute note ne dépasse pas `hi` (instrument plus grave). */
export function ramener(ns: readonly NoteP[], hi: number): NoteP[] {
  const top = ns.reduce((m, x) => Math.max(m, x.m), -Infinity);
  let k = 0;
  while (top + k > hi) k -= 12;
  return transposer(ns, k);
}

/**
 * Valse : une mesure à quatre temps devient deux mesures à trois (valeurs multipliées par 1,5), chaque attaque ramenée
 * à la croche la plus proche ; une note dure jusqu'à la suivante au plus.
 */
export function enValse(ns: readonly NoteP[]): NoteP[] {
  const tri = [...ns].sort((a, b) => a.t - b.t);
  const ts = tri.map((x) => Math.round((x.t * 1.5) / 0.5) * 0.5);
  return tri.map((x, i) => {
    const suiv = ts[i + 1];
    const d = Math.max(0.5, Math.round((x.d * 1.5) / 0.5) * 0.5);
    return { ...x, t: ts[i]!, d: suiv !== undefined ? Math.min(d, suiv - ts[i]!) : d };
  }).filter((x) => x.d > 0);
}

const accordA = (acc: readonly AccordP[], t: number): AccordP => {
  let a = acc[0]!;
  for (const x of acc) if (x.t <= t + 1e-6) a = x;
  return a;
};
const sonneA = (ns: readonly NoteP[], t: number): number | null => {
  let r: number | null = null;
  for (const x of ns) if (x.t <= t + 1e-6 && x.t + x.d > t + 1e-6) r = x.m;
  return r;
};

/**
 * Chaque note ramenée à l'accord qui sonne : une note hors de l'accord et de ses tensions prend la plus proche qui en
 * est (le plus petit pas, vers le bas à égalité) ; `eviter` : une mélodie avec laquelle ne pas frotter (seconde mineure
 * à l'octave près) ; `sous` : rester sous elle.
 */
export function consonner(ns: readonly NoteP[], acc: readonly AccordP[], o: { eviter?: readonly NoteP[]; sous?: boolean } = {}): NoteP[] {
  return ns.map((x) => {
    const a = accord(accordA(acc, x.t).sym);
    const mel = o.eviter ? sonneA(o.eviter, x.t + 0.01) : null;
    const ok = (m: number): boolean => {
      if (!dansAccord(a, m, true)) return false;
      if (mel === null) return true;
      const iv = (((mel - m) % 12) + 12) % 12;
      return iv !== 1 && iv !== 11 && iv !== 0 && (!o.sous || m < mel - 2);
    };
    for (const pas of [0, -1, 1, -2, 2, -3, 3, -4, 4, -5, 5, -7, 7, -12]) if (ok(x.m + pas)) return { ...x, m: x.m + pas };
    return { ...x };
  });
}

/**
 * Contre-chant à l'envers : la mélodie jouée à rebours phrase par phrase (`phrase` temps), à l'octave dite, puis
 * ramenée à l'harmonie sans frotter contre la mélodie.
 */
export function contreChant(mel: readonly NoteP[], acc: readonly AccordP[], total: number, o: { phrase?: number; octave?: number; sous?: boolean } = {}): NoteP[] {
  const ph = o.phrase ?? 8;
  const out: NoteP[] = [];
  for (let t0 = 0; t0 < total - 1e-6; t0 += ph) out.push(...deplacer(retrograde(fragment(mel, t0, t0 + ph), ph), t0));
  return consonner(transposer(out, o.octave ?? 0), acc, { eviter: mel, sous: o.sous ?? false });
}

// --- accords ---

export const transposerAccords = (as: readonly AccordP[], k: number): AccordP[] => as.map((a) => ({ ...a, sym: transposerSym(a.sym, k) }));
export const augmenterAccords = (as: readonly AccordP[], k: number): AccordP[] => as.map((a) => ({ ...a, t: a.t * k, d: a.d * k }));

/** Couleurs plus riches pour une ballade ou un lounge : septièmes en neuvièmes, dominantes en treizièmes. */
export function enrichir(as: readonly AccordP[]): AccordP[] {
  const sub: Record<string, string> = { maj7: 'maj9', m7: 'm9', 7: '13', 6: '69' };
  return as.map((a) => {
    const m = /^([A-G](?:#|b)?)([^/]*)(\/.*)?$/.exec(a.sym)!;
    const q = sub[m[2]!];
    return q ? { ...a, sym: `${m[1]}${q}${m[3] ?? ''}` } : a;
  });
}

/** Une dominante sur deux remplacée par son substitut tritonique (Bb7 au lieu de E7…), pour une autre couleur. */
export function substitutionTritonique(as: readonly AccordP[], toutes = false): AccordP[] {
  let k = 0;
  return as.map((a) => {
    const q = accord(a.sym).qualite;
    if (!['7', '9', '13'].includes(q)) return a;
    k++;
    if (!toutes && k % 2 === 0) return a;
    return { ...a, sym: transposerSym(a.sym, 6).replace(/(13|9)$/, '7').replace(/7$/, '7#11') };
  });
}

/** Une grille par mesure : le premier accord de chaque mesure tient toute la mesure (lounge, demi-temps). */
export function unParMesure(as: readonly AccordP[], mesure: number): AccordP[] {
  const out: AccordP[] = [];
  for (const a of as) {
    const t0 = Math.floor(a.t / mesure) * mesure;
    if (out.length && out[out.length - 1]!.t === t0) continue;
    out.push({ t: t0, d: mesure, sym: a.sym });
  }
  return out;
}
