/**
 * M13 — théorie musicale (pur) : hauteurs MIDI, gammes et modes, chiffrages d'accords, voicings de jazz sans fondamentale
 * (formes A et B), conduite des voix au plus court, swing. Contrat `docs/m13/01_MUSIQUE.md`, §4.
 */

/** Classes de hauteurs, en bémols sauf F#, comme on les lit dans une grille de jazz. */
export const NOMS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'] as const;
const PC: Record<string, number> = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, Fb: 4, F: 5, 'E#': 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11, Cb: 11 };

/** `'C4'` → 60, `'Bb3'` → 58, `'F#5'` → 78. */
export function midi(nom: string): number {
  const m = /^([A-G](?:#|b)?)(-?\d)$/.exec(nom);
  if (!m || PC[m[1]!] === undefined) throw new Error(`hauteur illisible : ${nom}`);
  return 12 * (Number(m[2]) + 1) + PC[m[1]!]!;
}

export const nomDe = (m: number): string => `${NOMS[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`;
export const freq = (m: number): number => 440 * 2 ** ((m - 69) / 12);
export const pc = (m: number): number => ((m % 12) + 12) % 12;

export type Mode = 'ionien' | 'dorien' | 'phrygien' | 'lydien' | 'mixolydien' | 'eolien' | 'locrien' | 'mineurMelodique' | 'mineurHarmonique' | 'lydienDominant' | 'altere' | 'phrygienDominant' | 'diminue' | 'locrien2';
export const MODES: Record<Mode, readonly number[]> = {
  ionien: [0, 2, 4, 5, 7, 9, 11],
  dorien: [0, 2, 3, 5, 7, 9, 10],
  phrygien: [0, 1, 3, 5, 7, 8, 10],
  lydien: [0, 2, 4, 6, 7, 9, 11],
  mixolydien: [0, 2, 4, 5, 7, 9, 10],
  eolien: [0, 2, 3, 5, 7, 8, 10],
  locrien: [0, 1, 3, 5, 6, 8, 10],
  mineurMelodique: [0, 2, 3, 5, 7, 9, 11],
  mineurHarmonique: [0, 2, 3, 5, 7, 8, 11],
  lydienDominant: [0, 2, 4, 6, 7, 9, 10],
  altere: [0, 1, 3, 4, 6, 8, 10],
  phrygienDominant: [0, 1, 4, 5, 7, 8, 10],
  diminue: [0, 2, 3, 5, 6, 8, 9, 11],
  locrien2: [0, 2, 3, 5, 6, 8, 10],
};

export type Qualite = 'maj7' | 'maj9' | 'maj7#11' | '6' | '69' | 'm7' | 'm9' | 'm11' | 'm6' | 'mMaj7' | '7' | '9' | '13' | '7b9' | '7#11' | '7alt' | '7sus4' | '9sus4' | 'm7b5' | 'dim7';

interface DefQualite {
  /** Notes de l'accord (intervalles depuis la fondamentale). */
  tons: readonly number[];
  /** Tensions disponibles (au-delà de l'octave). */
  tensions: readonly number[];
  /** Gamme de l'accord (couleur pour les lignes improvisées et la basse). */
  gamme: Mode;
  /** Voicings sans fondamentale, formes A et B (intervalles croissants depuis la fondamentale). */
  a: readonly number[];
  b: readonly number[];
}

const Q: Record<Qualite, DefQualite> = {
  maj7: { tons: [0, 4, 7, 11], tensions: [14, 21], gamme: 'ionien', a: [4, 7, 11, 14], b: [11, 14, 16, 19] },
  maj9: { tons: [0, 4, 7, 11], tensions: [14, 21], gamme: 'ionien', a: [4, 7, 11, 14], b: [11, 14, 16, 19] },
  'maj7#11': { tons: [0, 4, 7, 11], tensions: [14, 18, 21], gamme: 'lydien', a: [4, 6, 11, 14], b: [11, 14, 16, 18] },
  6: { tons: [0, 4, 7, 9], tensions: [14], gamme: 'ionien', a: [4, 7, 9, 14], b: [9, 14, 16, 19] },
  69: { tons: [0, 4, 7, 9], tensions: [14], gamme: 'ionien', a: [4, 9, 14, 19], b: [9, 14, 16, 19] },
  m7: { tons: [0, 3, 7, 10], tensions: [14, 17], gamme: 'dorien', a: [3, 7, 10, 14], b: [10, 14, 15, 19] },
  m9: { tons: [0, 3, 7, 10], tensions: [14, 17], gamme: 'dorien', a: [3, 7, 10, 14], b: [10, 14, 15, 19] },
  m11: { tons: [0, 3, 7, 10], tensions: [14, 17], gamme: 'dorien', a: [3, 5, 10, 14], b: [10, 14, 15, 17] },
  m6: { tons: [0, 3, 7, 9], tensions: [14, 17], gamme: 'mineurMelodique', a: [3, 7, 9, 14], b: [9, 14, 15, 19] },
  mMaj7: { tons: [0, 3, 7, 11], tensions: [14], gamme: 'mineurMelodique', a: [3, 7, 11, 14], b: [11, 14, 15, 19] },
  7: { tons: [0, 4, 7, 10], tensions: [14, 21], gamme: 'mixolydien', a: [4, 9, 10, 14], b: [10, 14, 16, 21] },
  9: { tons: [0, 4, 7, 10], tensions: [14, 21], gamme: 'mixolydien', a: [4, 9, 10, 14], b: [10, 14, 16, 21] },
  13: { tons: [0, 4, 7, 10], tensions: [14, 21], gamme: 'mixolydien', a: [4, 9, 10, 14], b: [10, 14, 16, 21] },
  '7b9': { tons: [0, 4, 7, 10], tensions: [13, 20], gamme: 'phrygienDominant', a: [4, 8, 10, 13], b: [10, 13, 16, 20] },
  '7#11': { tons: [0, 4, 7, 10], tensions: [14, 18, 21], gamme: 'lydienDominant', a: [4, 6, 10, 14], b: [10, 14, 16, 18] },
  '7alt': { tons: [0, 4, 8, 10], tensions: [13, 15, 20], gamme: 'altere', a: [4, 8, 10, 15], b: [10, 15, 16, 20] },
  '7sus4': { tons: [0, 5, 7, 10], tensions: [14, 21], gamme: 'mixolydien', a: [5, 7, 10, 14], b: [10, 14, 17, 19] },
  '9sus4': { tons: [0, 5, 7, 10], tensions: [14, 21], gamme: 'mixolydien', a: [5, 7, 10, 14], b: [10, 14, 17, 19] },
  m7b5: { tons: [0, 3, 6, 10], tensions: [14, 17], gamme: 'locrien2', a: [3, 6, 10, 14], b: [10, 14, 15, 18] },
  dim7: { tons: [0, 3, 6, 9], tensions: [14, 17], gamme: 'diminue', a: [3, 6, 9, 12], b: [9, 12, 15, 18] },
};

export interface Accord {
  sym: string;
  /** Classe de hauteur de la fondamentale. */
  fond: number;
  /** Classe de hauteur de la basse (accord renversé `F/A`), sinon la fondamentale. */
  basse: number;
  qualite: Qualite;
  tons: readonly number[];
  tensions: readonly number[];
  gamme: readonly number[];
}

const ALIAS: Record<string, Qualite> = {
  maj7: 'maj7', M7: 'maj7', Δ: 'maj7', maj9: 'maj9', 'maj7#11': 'maj7#11', 6: '6', 69: '69', '6/9': '69',
  m7: 'm7', '-7': 'm7', m9: 'm9', m11: 'm11', m6: 'm6', mMaj7: 'mMaj7', m: 'm7', '': 'maj7',
  7: '7', 9: '9', 13: '13', '7b9': '7b9', '7(b9)': '7b9', '7#11': '7#11', '7(#11)': '7#11', '7alt': '7alt', alt: '7alt',
  '7sus4': '7sus4', sus4: '7sus4', '9sus4': '9sus4', m7b5: 'm7b5', ø: 'm7b5', dim7: 'dim7', o7: 'dim7',
};

/** `'Gm7'`, `'Bbmaj7'`, `'D7b9'`, `'C9sus4'`, `'F6/A'`… */
export function accord(sym: string): Accord {
  const m = /^([A-G](?:#|b)?)([^/]*)(?:\/([A-G](?:#|b)?))?$/.exec(sym);
  const fond = m ? PC[m[1]!] : undefined;
  const q = m ? ALIAS[m[2]!] : undefined;
  if (fond === undefined || !q) throw new Error(`accord illisible : ${sym}`);
  const def = Q[q];
  const basse = m![3] ? PC[m![3]] : fond;
  if (basse === undefined) throw new Error(`basse illisible : ${sym}`);
  return { sym, fond, basse, qualite: q, tons: def.tons, tensions: def.tensions, gamme: MODES[def.gamme] };
}

/** L'accord transposé de `n` demi-tons (même qualité), pour les versions transposées. */
export function transposerSym(sym: string, n: number): string {
  const a = accord(sym);
  const r = NOMS[pc(a.fond + n)]!;
  const qual = /^[A-G](?:#|b)?([^/]*)/.exec(sym)![1]!;
  return a.basse !== a.fond ? `${r}${qual}/${NOMS[pc(a.basse + n)]}` : `${r}${qual}`;
}

/** Les hauteurs (MIDI) de la gamme de l'accord dans [lo, hi]. */
export function hauteursGamme(a: Accord, lo: number, hi: number): number[] {
  const out: number[] = [];
  for (let m = lo; m <= hi; m++) if (a.gamme.includes(pc(m - a.fond))) out.push(m);
  return out;
}

/** Les notes de l'accord (MIDI) dans [lo, hi]. */
export function hauteursAccord(a: Accord, lo: number, hi: number, avecTensions = false): number[] {
  const ivs = new Set([...a.tons, ...(avecTensions ? a.tensions : [])].map((i) => i % 12));
  const out: number[] = [];
  for (let m = lo; m <= hi; m++) if (ivs.has(pc(m - a.fond))) out.push(m);
  return out;
}

/** Une note est-elle une note de l'accord (ou une tension disponible) ? */
export const dansAccord = (a: Accord, m: number, avecTensions = true): boolean =>
  [...a.tons, ...(avecTensions ? a.tensions : [])].some((i) => pc(m - a.fond) === i % 12);

export interface Tessiture { lo: number; hi: number }

/**
 * Voicing sans fondamentale le plus proche du précédent (conduite des voix) : formes A et B, à toutes les octaves dont
 * les notes tiennent dans la tessiture ; premier accord : le plus proche du centre de la tessiture. Voicing en quartes
 * (`quartes`) pour les accords mineurs et suspendus : tierce ou quarte, puis empilement de quartes.
 */
export function voicer(a: Accord, prev: readonly number[] | null, t: Tessiture, o: { quartes?: boolean } = {}): number[] {
  const def = Q[a.qualite];
  const formes: number[][] = [[...def.a], [...def.b]];
  if (o.quartes && (a.qualite.startsWith('m') || a.qualite.includes('sus'))) {
    const base = a.qualite.includes('sus') ? 5 : 3;
    formes.push([base, base + 5, base + 10, base + 15].map((x) => (a.qualite === 'm7b5' && x === base + 5 ? 6 : x)));
  }
  const centre = (t.lo + t.hi) / 2;
  let best: number[] | null = null;
  let bestScore = Infinity;
  for (const f of formes) {
    for (let oct = -1; oct <= 8; oct++) {
      const notes = f.map((iv) => 12 * oct + a.fond + iv);
      if (notes[0]! < t.lo || notes[notes.length - 1]! > t.hi) continue;
      let score: number;
      if (prev && prev.length) {
        score = notes.reduce((s, n, i) => s + Math.abs(n - (prev[Math.min(i, prev.length - 1)] ?? n)), 0);
      } else {
        score = Math.abs(notes.reduce((s, n) => s + n, 0) / notes.length - centre) * 2;
      }
      // une voix grave trop serrée sonne boueuse
      if (notes[0]! < 50 && notes[1]! - notes[0]! < 3) score += 6;
      if (score < bestScore) { bestScore = score; best = notes; }
    }
  }
  if (!best) {
    // tessiture trop étroite : la forme A au plus près du centre
    const f = def.a;
    const oct = Math.round((centre - a.fond - f[0]!) / 12);
    best = f.map((iv) => 12 * oct + a.fond + iv);
  }
  return best;
}

/**
 * Swing : déplace les positions (en temps) sur une grille de croches ternaires. `ratio` 0,5 = droit, 0,667 = ternaire.
 * Application continue par morceaux (toute position, pas seulement les croches). `sub` : 1 = croches, 0,5 = doubles
 * croches (swing des doubles, lofi).
 */
export function swinguer(t: number, ratio: number, sub = 1): number {
  const k = Math.floor(t / sub);
  const x = (t - k * sub) / sub;
  const y = x < 0.5 ? x * (ratio / 0.5) : ratio + (x - 0.5) * ((1 - ratio) / 0.5);
  return (k + y) * sub;
}

/** Rapport de swing selon le tempo : plus ternaire lent, plus droit rapide (comme les batteurs). */
export const swingPourTempo = (bpm: number): number => Math.max(0.56, Math.min(0.67, 0.67 - ((bpm - 100) / 100) * 0.09));

/** Degré diatonique (avec octave) d'une hauteur dans une gamme ; une note hors gamme prend le degré inférieur + 0,5. */
export function degre(m: number, tonique: number, gamme: readonly number[]): number {
  const rel = m - tonique;
  const oct = Math.floor(rel / 12);
  const r = rel - oct * 12;
  let i = gamme.findIndex((g) => g === r);
  if (i >= 0) return oct * gamme.length + i;
  i = gamme.findIndex((g) => g > r) - 1;
  if (i < 0) i = gamme.length - 1;
  return oct * gamme.length + i + 0.5;
}

/** Hauteur d'un degré diatonique (inverse de `degre` ; un demi-degré ajoute un demi-ton). */
export function depuisDegre(d: number, tonique: number, gamme: readonly number[]): number {
  const n = gamme.length;
  const entier = Math.floor(d);
  const oct = Math.floor(entier / n);
  const i = entier - oct * n;
  return tonique + oct * 12 + gamme[i]! + (d - entier >= 0.5 ? 1 : 0);
}
