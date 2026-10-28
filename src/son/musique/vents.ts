/**
 * M13 — vents et cordes synthétisés en temps réel (Web Audio) : trompette bouchée (sourdine Harmon), saxophone ténor,
 * flûte, section de cuivres, cordes. Un instrument à vent joue des phrases d'une seule voix : les notes liées glissent de
 * l'une à l'autre sans nouvelle attaque, les notes détachées sont reprises à la langue (l'amplitude retombe dans le
 * silence entre elles) ; le timbre s'éclaircit avec la nuance (un façonneur non linéaire après la source, comme le cuivre
 * qui « cuivre » quand on souffle fort, avec un éclat à l'attaque) ; le vibrato vient tard, sur les notes tenues ; le
 * souffle accompagne la note (plus présent en nuance douce) ; ornements : coulé par en dessous, chute en fin de phrase.
 * Les cuivres et les cordes sont des sections : plusieurs voix légèrement désaccordées par note. Contrat
 * `docs/m13/01_MUSIQUE.md`, §4 ; aucune ressource extérieure, hasard à graine fixe.
 */
import { makeRng } from '../../game/engine/rng';
import type { InstrId, NoteV } from './generateurs';
import { freq } from './theorie';

export type InstrVent = 'trompette' | 'sax' | 'flute' | 'cuivres' | 'cordes';
export const VENTS: ReadonlySet<InstrId> = new Set<InstrId>(['trompette', 'sax', 'flute', 'cuivres', 'cordes']);
/** Une seule voix : les notes se lient en phrases (`lier`). */
export const MONOPHONIQUES: ReadonlySet<InstrId> = new Set<InstrId>(['trompette', 'sax', 'flute']);

interface Filtre { type: BiquadFilterType; f: number; q: number; g?: number }
export interface Profil {
  /** Spectre de la source, avant le façonneur (amplitudes des harmoniques 1, 2, 3…). */
  harmoniques: readonly number[];
  /** Raideur du façonneur (0 : pas de façonneur) et asymétrie (harmoniques paires). */
  k: number;
  b: number;
  surech: OverSampleType;
  /** Entrée du façonneur à la nuance la plus douce et la plus forte (le timbre suit la nuance). */
  pression: readonly [number, number];
  attaque: number;
  /** Surpression à l'attaque (le timbre plus vif au début de la note). */
  eclat: number;
  relache: number;
  /** Constante de temps du port de voix entre deux notes liées. */
  glisse: number;
  /** Évolution d'une note tenue (−0,1 : elle décroît de 10 % ; positif : elle enfle). */
  tenue: number;
  vibrato: { cents: number; hz: number; delai: number };
  /** Souffle : niveau relatif, bande (fixe `f`, ou `rel` fois la note), éclat de l'attaque. */
  souffle: { niveau: number; f?: number; rel?: number; q: number; chiff: number };
  /** Demi-tons du coulé par en dessous. */
  scoop: number;
  niveau: number;
  /** Corps de l'instrument (filtres du canal, partagés par toutes ses notes). */
  filtres: readonly Filtre[];
  /** Les voix d'une section, en cents autour de la note (centrées : la section reste juste). */
  voix?: readonly number[];
  /** Ensemble : un chorus stéréo sur le canal (le pupitre qui s'élargit). */
  ensemble?: boolean;
}

export const PROFILS: Record<InstrVent, Profil> = {
  // la trompette bouchée (sourdine Harmon, sans la tige) : nasale, bourdonnante, sans grave ; deux bosses de formant
  trompette: {
    harmoniques: [1, 0.8, 0.7, 0.55, 0.45, 0.35, 0.28, 0.22, 0.18, 0.14, 0.1, 0.08],
    k: 2.2, b: 0.12, surech: '2x', pression: [0.3, 0.85], attaque: 0.022, eclat: 1.45, relache: 0.035, glisse: 0.012, tenue: -0.12,
    vibrato: { cents: 10, hz: 5.6, delai: 0.28 }, souffle: { niveau: 0.03, f: 5200, q: 0.8, chiff: 0.08 }, scoop: 1, niveau: 0.5,
    filtres: [{ type: 'highpass', f: 650, q: 0.7 }, { type: 'peaking', f: 1700, q: 1.8, g: 10 }, { type: 'peaking', f: 3800, q: 2.5, g: 5 }, { type: 'lowpass', f: 7000, q: 0.7 }],
  },
  // le saxophone ténor : chaud, anche, deuxième harmonique fort ; souffle présent dans la nuance douce (subtone)
  sax: {
    harmoniques: [1, 0.85, 0.55, 0.5, 0.38, 0.32, 0.25, 0.2, 0.16, 0.13, 0.1, 0.08, 0.06, 0.05],
    k: 1.8, b: 0.2, surech: '2x', pression: [0.26, 0.8], attaque: 0.035, eclat: 1.25, relache: 0.05, glisse: 0.014, tenue: -0.08,
    vibrato: { cents: 16, hz: 5.2, delai: 0.35 }, souffle: { niveau: 0.06, f: 2800, q: 0.7, chiff: 0.12 }, scoop: 1, niveau: 0.5,
    filtres: [{ type: 'highpass', f: 80, q: 0.7 }, { type: 'peaking', f: 450, q: 1.2, g: 4 }, { type: 'peaking', f: 1500, q: 1.5, g: 4 }, { type: 'peaking', f: 2600, q: 2, g: 2 }, { type: 'lowpass', f: 5500, q: 0.7 }],
  },
  // la flûte : presque pure, beaucoup de souffle (dans la bande de la note), vibrato tôt
  flute: {
    harmoniques: [1, 0.22, 0.1, 0.045, 0.02],
    k: 1.2, b: 0.05, surech: 'none', pression: [0.22, 0.6], attaque: 0.05, eclat: 1.1, relache: 0.07, glisse: 0.012, tenue: 0,
    vibrato: { cents: 14, hz: 5.1, delai: 0.12 }, souffle: { niveau: 0.1, rel: 2, q: 1.2, chiff: 0.3 }, scoop: 0, niveau: 0.55,
    filtres: [{ type: 'highpass', f: 220, q: 0.7 }, { type: 'peaking', f: 900, q: 1, g: 2 }, { type: 'lowpass', f: 7000, q: 0.7 }],
  },
  // la section de cuivres (trompettes et trombones ouverts) : trois voix par note, éclat d'attaque
  cuivres: {
    harmoniques: [1, 0.75, 0.6, 0.5, 0.4, 0.32, 0.25, 0.2, 0.15, 0.12],
    k: 2.4, b: 0.15, surech: 'none', pression: [0.3, 0.95], attaque: 0.05, eclat: 1.4, relache: 0.08, glisse: 0.02, tenue: -0.05,
    vibrato: { cents: 6, hz: 5.4, delai: 0.5 }, souffle: { niveau: 0, q: 0.8, chiff: 0 }, scoop: 0, niveau: 0.4,
    filtres: [{ type: 'highpass', f: 70, q: 0.7 }, { type: 'peaking', f: 1100, q: 1, g: 4 }, { type: 'peaking', f: 2700, q: 2, g: 2 }, { type: 'lowpass', f: 7500, q: 0.7 }],
    voix: [-4, 4],
  },
  // les cordes : trois voix en dents de scie par note, attaque lente, vibrato doux, le corps du pupitre
  cordes: {
    harmoniques: Array.from({ length: 24 }, (_, i) => 1 / (i + 1)),
    k: 0, b: 0, surech: 'none', pression: [1, 1], attaque: 0.3, eclat: 1, relache: 0.25, glisse: 0.05, tenue: 0.05,
    vibrato: { cents: 7, hz: 5.5, delai: 0.15 }, souffle: { niveau: 0, q: 0.8, chiff: 0 }, scoop: 0, niveau: 0.22,
    filtres: [{ type: 'highpass', f: 60, q: 0.7 }, { type: 'peaking', f: 280, q: 1, g: 3 }, { type: 'peaking', f: 1100, q: 1, g: 1.5 }, { type: 'peaking', f: 3200, q: 1.5, g: -3 }, { type: 'lowpass', f: 5200, q: 0.7 }],
    voix: [-6, 6], ensemble: true,
  },
};

// ------------------------------------------------------------------ pur : façonneur, rendement, phrases

const S = 1.3;
/**
 * Domaine du façonneur : la pression `a` (éclat compris) va jusqu'à `DOMAINE` ; l'entrée du nœud est `a / DOMAINE`,
 * toujours dans [−1, 1] (au-delà, le nœud écrêterait net et replierait des aigus).
 */
export const DOMAINE = 2;
const fa = (p: Pick<Profil, 'k' | 'b'>, x: number): number => Math.tanh(p.k * (x * S + p.b)) - Math.tanh(p.k * p.b);
/** Le façonneur : tangente hyperbolique décentrée (harmoniques paires), normalisée à la pression 1. */
export function courbe(p: Pick<Profil, 'k' | 'b'>, n = 2048): Float32Array<ArrayBuffer> {
  const c = new Float32Array(n);
  const norm = Math.abs(fa(p, 1));
  for (let i = 0; i < n; i++) c[i] = fa(p, ((i / (n - 1)) * 2 - 1) * DOMAINE) / norm;
  return c;
}
/** Amplitude de sortie (crête positive) du façonneur pour une pression `a` (entrée sinusoïdale). */
export function rendement(p: Pick<Profil, 'k' | 'b'>, a: number): number {
  if (p.k <= 0) return Math.max(0.05, a);
  return Math.max(0.05, fa(p, Math.min(DOMAINE, a)) / Math.abs(fa(p, 1)));
}

export interface PlanVoix {
  /** Pour chaque note : liée à la précédente, reprise à la langue, ou première de la phrase. */
  articulations: Array<'premiere' | 'liee' | 'detachee'>;
  fin: number;
}
/** Comment une phrase se joue : une note qui commence moins de 30 ms après la fin de la précédente lui est liée. */
export function articuler(notes: readonly NoteV[]): PlanVoix {
  const articulations = notes.map((n, i) => (i === 0 ? 'premiere' : n.t - (notes[i - 1]!.t + notes[i - 1]!.d) < 0.03 ? 'liee' : 'detachee') as PlanVoix['articulations'][number]);
  const der = notes[notes.length - 1]!;
  return { articulations, fin: der.t + der.d };
}

// ------------------------------------------------------------------ Web Audio

interface Ressources { ondes: Map<InstrVent, PeriodicWave>; bruit: AudioBuffer; courbes: Map<InstrVent, Float32Array<ArrayBuffer>> }
const RESSOURCES = new WeakMap<BaseAudioContext, Ressources>();
function ressources(ctx: BaseAudioContext): Ressources {
  let r = RESSOURCES.get(ctx);
  if (r) return r;
  const rng = makeRng(0x50ff1e);
  const bruit = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = bruit.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = rng() * 2 - 1;
  r = { ondes: new Map(), bruit, courbes: new Map() };
  RESSOURCES.set(ctx, r);
  return r;
}
function onde(ctx: BaseAudioContext, instr: InstrVent): PeriodicWave {
  const r = ressources(ctx);
  let w = r.ondes.get(instr);
  if (w) return w;
  const h = PROFILS[instr].harmoniques;
  const reel = new Float32Array(h.length + 1);
  const imag = new Float32Array(h.length + 1);
  h.forEach((a, i) => { imag[i + 1] = a; });
  w = ctx.createPeriodicWave(reel, imag);
  r.ondes.set(instr, w);
  return w;
}
function courbeDe(ctx: BaseAudioContext, instr: InstrVent): Float32Array<ArrayBuffer> {
  const r = ressources(ctx);
  let c = r.courbes.get(instr);
  if (!c) { c = courbe(PROFILS[instr]); r.courbes.set(instr, c); }
  return c;
}

/**
 * Le corps de l'instrument : les filtres du canal, et pour un pupitre (cordes) un chorus stéréo (deux lignes à retard
 * modulées lentement, une à gauche, une à droite, avec le son direct) ; `arreter` coupe ses oscillateurs.
 */
export function corps(ctx: BaseAudioContext, instr: InstrVent): { entree: AudioNode; sortie: AudioNode; arreter: () => void } {
  const P = PROFILS[instr];
  const fs = P.filtres.map((f) => {
    const b = ctx.createBiquadFilter();
    b.type = f.type; b.frequency.value = f.f; b.Q.value = f.q;
    if (f.g !== undefined) b.gain.value = f.g;
    return b;
  });
  for (let i = 1; i < fs.length; i++) fs[i - 1]!.connect(fs[i]!);
  if (!P.ensemble) return { entree: fs[0]!, sortie: fs[fs.length - 1]!, arreter: () => {} };
  const fin = fs[fs.length - 1]!;
  const fusion = ctx.createChannelMerger(2);
  const lfos: OscillatorNode[] = [];
  const direct = ctx.createGain();
  direct.gain.value = 0.6;
  fin.connect(direct);
  direct.connect(fusion, 0, 0);
  direct.connect(fusion, 0, 1);
  ([[0.013, 0.0032, 0.53, 0], [0.017, 0.0027, 0.79, 1]] as const).forEach(([base, prof, hz, cote]) => {
    const d = ctx.createDelay(0.05);
    d.delayTime.value = base;
    const l = ctx.createOscillator();
    l.frequency.value = hz;
    const g = ctx.createGain();
    g.gain.value = prof;
    l.connect(g).connect(d.delayTime);
    const n = ctx.createGain();
    n.gain.value = 0.55;
    fin.connect(d).connect(n);
    n.connect(fusion, 0, cote);
    l.start();
    lfos.push(l);
  });
  return { entree: fs[0]!, sortie: fusion, arreter: () => lfos.forEach((l) => { try { l.stop(); } catch { /* arrêté */ } }) };
}

const cible = (ps: readonly AudioParam[], v: number, t: number, tau: number): void => { for (const p of ps) p.setTargetAtTime(v, t, Math.max(0.001, tau)); };

/**
 * Joue une phrase d'une seule voix (ou une note d'une section) : `notes` en secondes absolues sur l'horloge du contexte,
 * dans l'ordre. Une voix, un façonneur par voix de section, un vibrato, un souffle ; toute l'expression est planifiée
 * d'un coup (aucune annulation d'automation).
 */
export function souffler(ctx: BaseAudioContext, dest: AudioNode, instr: InstrVent, notes: readonly NoteV[]): void {
  if (!notes.length) return;
  const P = PROFILS[instr];
  const R = ressources(ctx);
  const { articulations, fin } = articuler(notes);
  const t0 = Math.max(0, notes[0]!.t);
  const rng = makeRng((Math.round(t0 * 1000) * 31 + notes[0]!.m * 7 + instr.length) >>> 0);
  const decalages = P.voix ?? [0];
  const norm = 1 / Math.sqrt(decalages.length);
  const amp = ctx.createGain();
  amp.gain.value = 0;
  amp.connect(dest);
  const lfo = ctx.createOscillator();
  lfo.frequency.value = P.vibrato.hz * (0.94 + rng() * 0.12);
  const prof = ctx.createGain();
  prof.gain.value = 0;
  lfo.connect(prof);
  const oscs: OscillatorNode[] = [];
  const pres: GainNode[] = [];
  for (const c of decalages) {
    const o = ctx.createOscillator();
    o.setPeriodicWave(onde(ctx, instr));
    o.detune.value = c + (decalages.length > 1 ? (rng() - 0.5) * 2 : 0);
    prof.connect(o.detune);
    if (P.k > 0) {
      const pre = ctx.createGain();
      pre.gain.value = 0;
      const sh = ctx.createWaveShaper();
      sh.curve = courbeDe(ctx, instr);
      sh.oversample = P.surech;
      o.connect(pre).connect(sh).connect(amp);
      pres.push(pre);
    } else o.connect(amp);
    oscs.push(o);
  }
  // le souffle (absent des sections)
  const souffleur = P.souffle.niveau > 0 ? (() => {
    const src = ctx.createBufferSource();
    src.buffer = R.bruit;
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.Q.value = P.souffle.q; bp.frequency.value = P.souffle.f ?? freq(notes[0]!.m) * (P.souffle.rel ?? 2);
    const g = ctx.createGain();
    g.gain.value = 0;
    src.connect(bp).connect(g).connect(dest);
    return { src, bp, g };
  })() : null;
  const ng = souffleur ? [souffleur.g.gain] : [];

  const freqs = oscs.map((o) => o.frequency);
  const gp = pres.map((p) => p.gain);
  for (const p of [amp.gain, ...ng, ...gp]) p.setValueAtTime(0, t0);
  notes.forEach((n, i) => {
    const t = Math.max(t0, n.t);
    const f = freq(n.m);
    const v = Math.max(0.05, Math.min(1, n.v));
    const a = P.pression[0] + (P.pression[1] - P.pression[0]) * v;
    const niv = (P.niveau * v ** 1.25 * norm) / rendement(P, a);
    const art = articulations[i]!;
    const attaque = art !== 'liee';
    // la hauteur (coulé par en dessous en option, port de voix entre deux notes liées)
    const fs = n.orn === 'scoop' && P.scoop ? f * 2 ** (-P.scoop / 12) : f;
    if (art === 'premiere') for (const p of freqs) p.setValueAtTime(fs, t);
    else cible(freqs, fs, t - 0.004, art === 'liee' ? P.glisse : 0.002);
    if (fs !== f) cible(freqs, f, t + 0.015, 0.03);
    // le timbre (éclat à l'attaque) et l'amplitude
    if (attaque) {
      cible(gp, Math.min(DOMAINE, a * P.eclat) / DOMAINE, t, P.attaque / 3);
      cible(gp, a / DOMAINE, t + P.attaque, 0.06);
      cible([amp.gain], niv, t, P.attaque / 3);
    } else {
      cible(gp, a / DOMAINE, t, 0.03);
      cible([amp.gain], niv, t, 0.02);
    }
    if (n.d > 0.4 && P.tenue) cible([amp.gain], niv * (1 + P.tenue), t + P.attaque + 0.05, n.d * 0.5);
    // le vibrato, tard sur les notes tenues
    cible([prof.gain], 0, t, 0.03);
    if (n.d > 0.45) cible([prof.gain], P.vibrato.cents * (0.75 + 0.4 * rng()) * (0.8 + 0.3 * v), t + P.vibrato.delai, 0.15);
    // le souffle (plus présent dans la nuance douce), avec un éclat à l'attaque
    const souffle = niv * P.souffle.niveau * (1.4 - v);
    if (attaque && P.souffle.chiff) { cible(ng, niv * P.souffle.chiff, t, 0.004); cible(ng, souffle, t + 0.02, 0.03); }
    else cible(ng, souffle, t, 0.03);
    if (P.souffle.rel && souffleur) cible([souffleur.bp.frequency], f * P.souffle.rel, t, 0.01);
    // détachée : l'amplitude retombe dans le silence avant la note suivante
    const suiv = notes[i + 1];
    if (suiv && articulations[i + 1] === 'detachee') {
      cible([amp.gain], 0, n.t + n.d, P.relache * 0.5);
      cible(ng, 0, n.t + n.d, 0.01);
    }
  });
  // la fin de la phrase (chute en option : la note tombe en s'éteignant)
  const der = notes[notes.length - 1]!;
  const chute = der.orn === 'chute';
  const rel = P.relache * (chute ? 3 : 1);
  cible([amp.gain], 0, fin, rel);
  cible(ng, 0, fin, 0.02);
  if (chute) cible(freqs, freq(der.m) * 2 ** (-5 / 12), fin - 0.02, 0.12);
  // arrêt quand l'extinction est passée sous −70 dB environ
  const arret = fin + rel * 8 + 0.05;
  for (const o of [...oscs, lfo]) { o.start(t0); o.stop(arret); }
  if (souffleur) { souffleur.src.start(t0, (t0 * 0.61) % 1.5); souffleur.src.stop(arret); }
}
