// M15, lot 1 — essai d'écoute (`docs/missions/M15_SON_16_BITS.md`), HORS DU JEU : les notes réelles des versions (`passage`,
// pur) rejouées par un petit lecteur d'échantillons logiciel, sous trois contraintes (voix, fréquence, résolution, écho).
// Timbres bâtis sur les instruments calculés du jeu, réduits, bouclés et dégradés ; une APPROXIMATION pour juger une direction,
// ni une émulation, ni la palette finale. Ornements et placement des musiciens ne sont pas repris.
// Sortie : WAV dans `artifacts/qa/tmp/m15/`, mesures `artifacts/qa/m15/essai.json`.
// Usage : npx tsx tools/m15-essai.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { mixDe, passage, VERSIONS, type VersionId } from '../src/son/musique/catalogue';
import type { Evenement, InstrId } from '../src/son/musique/generateurs';
import * as I from '../src/son/musique/instruments';

const DUREE = 30;
const WAV = 'artifacts/qa/tmp/m15';
const OUT = 'artifacts/qa/m15';
mkdirSync(WAV, { recursive: true });
mkdirSync(OUT, { recursive: true });

export const EXTRAITS = [
  { id: 'ville', titre: 'La ville la nuit, avec les vents', version: 'II-1' as VersionId, options: { chapitre: 4 }, couches: {} as Record<string, number> },
  { id: 'duel', titre: 'Duel', version: 'III-1' as VersionId, options: {}, couches: { melodie: 1, tension: 0, cuivres: 0 } },
  { id: 'championnat', titre: 'Championnat, big band', version: 'VI-1' as VersionId, options: {}, couches: { melodie: 1, tension: 0, cuivres: 1 } },
];

interface Contrainte { id: string; sr: number; voix: number; srEch: number; brr: boolean; pasZone: number; tenue: number; coupure: number; salle: 'echo' | 'reverb' }
const OPTIONS: Contrainte[] = [
  { id: 'A', sr: 32000, voix: 8, srEch: 16000, brr: true, pasZone: 12, tenue: 0.32, coupure: 9000, salle: 'echo' },
  { id: 'B', sr: 32000, voix: 16, srEch: 16000, brr: true, pasZone: 12, tenue: 0.32, coupure: 9000, salle: 'echo' },
  { id: 'C', sr: 44100, voix: 24, srEch: 22050, brr: false, pasZone: 6, tenue: 0.8, coupure: 16000, salle: 'reverb' },
];

// ------------------------------------------------------------------ les échantillons

interface Ech { data: Float32Array; sr: number; racine: number; boucle: number | null }
const hz = (m: number): number => 440 * 2 ** ((m - 69) / 12);

/** Compression à la manière du BRR de la console : blocs de 16 échantillons, résidu sur 4 bits, prédiction du premier ordre. */
function brr(x: Float32Array): Float32Array {
  const out = new Float32Array(x.length);
  let p = 0;
  for (let i = 0; i < x.length; i += 16) {
    let max = 0;
    let q = p;
    for (let j = i; j < Math.min(i + 16, x.length); j++) { max = Math.max(max, Math.abs(x[j]! - q * 0.9375)); q = x[j]!; }
    const pas = Math.max(1 / 32768, max / 7);
    const s = 2 ** Math.ceil(Math.log2(pas));
    for (let j = i; j < Math.min(i + 16, x.length); j++) {
      const r = Math.max(-8, Math.min(7, Math.round((x[j]! - p * 0.9375) / s)));
      p = Math.max(-1, Math.min(1, p * 0.9375 + r * s));
      out[j] = p;
    }
  }
  return out;
}

/** Une boucle d'un nombre entier de périodes à la fin de la tenue, fondue sur son début. */
function boucler(x: Float32Array, sr: number, m: number, tenue: number): { data: Float32Array; boucle: number } {
  const per = sr / hz(m);
  const lg = Math.max(1, Math.round(240 / per)) * per;
  const n = Math.min(x.length, Math.ceil(tenue * sr + lg));
  const debut = Math.max(0, Math.round(n - lg));
  const data = x.slice(0, n);
  const f = Math.min(64, Math.floor((n - debut) / 3));
  for (let i = 0; i < f; i++) { const k = i / f; data[n - f + i] = data[n - f + i]! * (1 - k) + (data[debut - f + i] ?? 0) * k; }
  return { data, boucle: debut };
}

/** Une forme d'onde d'un seul cycle, comme les pupitres d'une console : la tenue, c'est la boucle. */
function cycle(sr: number, m: number, h: readonly number[]): Float32Array {
  const per = sr / hz(m);
  // assez de périodes pour que l'arrondi de la longueur ne désaccorde pas la boucle (moins de 3 cents)
  const k = Math.max(1, Math.ceil(300 / per));
  const lg = Math.round(k * per);
  const out = new Float32Array(lg);
  for (let i = 0; i < lg; i++) for (let j = 0; j < h.length; j++) out[i]! += h[j]! * Math.sin((2 * Math.PI * (j + 1) * k * i) / lg);
  let max = 0;
  for (const v of out) max = Math.max(max, Math.abs(v));
  return out.map((v) => (v / (max || 1)) * 0.7);
}

const FORMES: Partial<Record<InstrId, readonly number[]>> = {
  trompette: [1, 0.55, 0.3, 0.42, 0.34, 0.12, 0.2, 0.08],
  'trompette-ouverte': [1, 0.9, 0.8, 0.7, 0.55, 0.42, 0.3, 0.22, 0.15, 0.1],
  sax: [1, 0.7, 0.5, 0.42, 0.2, 0.26, 0.12, 0.1],
  flute: [1, 0.26, 0.09, 0.03],
  cuivres: [1, 0.85, 0.72, 0.6, 0.45, 0.34, 0.25, 0.16, 0.1],
  saxes: [1, 0.72, 0.56, 0.4, 0.28, 0.2, 0.12],
  cordes: [1, 0.5, 0.33, 0.25, 0.2, 0.16, 0.13, 0.1, 0.08],
  archet: [1, 0.6, 0.4, 0.28, 0.2, 0.12],
  nappe: [1, 0.35, 0.12],
};
const SYNTH: Partial<Record<InstrId, (sr: number, m: number, v: number) => Float32Array>> = { piano: I.piano, rhodes: I.rhodes, vibra: I.vibra, basse: I.basse, guitare: I.guitare, nylon: I.nylon };
const FRAPPES: Partial<Record<InstrId, [(sr: number) => Float32Array, number]>> = {
  ride: [(s) => I.ride(s, 0), 0.5], crash: [(s) => I.crash(s), 1], cloche: [(s) => I.cloche(s), 0.4], charley: [(s) => I.charley(s, 0), 0.16], 'charley-ferme': [(s) => I.charleyFerme(s, 0), 0.09],
  gc: [(s) => I.gc(s, 0), 0.3], cc: [(s) => I.cc(s, 0), 0.26], 'cc-balai': [(s) => I.ccBalai(s, 0), 0.26], balai: [(s) => I.balai(s, 0), 0.26], rim: [(s) => I.rim(s, 0), 0.1],
};
/** Déclin après l'attaque (s) : un échantillon court n'en a plus assez ; 0 : tenu. */
const DECLIN: Partial<Record<InstrId, number>> = { piano: 1.3, rhodes: 1.5, vibra: 1.6, basse: 0.9, guitare: 0.7, nylon: 0.7 };
const ATTAQUE: Partial<Record<InstrId, number>> = { trompette: 0.025, 'trompette-ouverte': 0.02, sax: 0.03, flute: 0.04, cuivres: 0.03, saxes: 0.035, cordes: 0.12, archet: 0.09, nappe: 0.2 };
const VIBRATO: ReadonlySet<InstrId> = new Set(['trompette', 'trompette-ouverte', 'sax', 'flute', 'cordes', 'archet']);

function banque(c: Contrainte): (instr: InstrId, m: number) => Ech | null {
  const cache = new Map<string, Ech>();
  return (instr, m) => {
    const fr = FRAPPES[instr];
    if (fr) {
      const k = instr;
      if (!cache.has(k)) { const d = fr[0](c.srEch).slice(0, Math.round(fr[1] * c.srEch)); cache.set(k, { data: c.brr ? brr(d) : d, sr: c.srEch, racine: 60, boucle: null }); }
      return cache.get(k)!;
    }
    const racine = Math.round(m / c.pasZone) * c.pasZone;
    const k = `${instr}:${racine}`;
    if (cache.has(k)) return cache.get(k)!;
    const forme = FORMES[instr];
    const s = SYNTH[instr];
    let e: Ech;
    if (forme) {
      const d = cycle(c.srEch, racine, forme);
      e = { data: c.brr ? brr(d) : d, sr: c.srEch, racine, boucle: 0 };
    } else if (s) {
      const b = boucler(s(c.srEch, racine, 0.7), c.srEch, racine, c.tenue);
      e = { data: c.brr ? brr(b.data) : b.data, sr: c.srEch, racine, boucle: b.boucle };
    } else return null;
    cache.set(k, e);
    return e;
  };
}

// ------------------------------------------------------------------ le lecteur

interface Note { debut: number; fin: number; instr: InstrId; m: number; v: number; prio: number; pan: number; g: number; rev: number }

const priorite = (e: Evenement): number => {
  if (e.couche === 'melodie' || e.instr === 'trompette' || e.instr === 'trompette-ouverte' || e.instr === 'sax' || e.instr === 'flute') return 5;
  if (e.instr === 'basse') return 4;
  if (e.instr === 'gc' || e.instr === 'cc' || e.instr === 'cc-balai' || e.instr === 'crash') return 3;
  if (e.instr === 'cuivres' || e.instr === 'saxes') return 2.5;
  if (e.instr === 'ride' || e.instr === 'charley' || e.instr === 'charley-ferme' || e.instr === 'balai' || e.instr === 'rim') return 2;
  return 1;
};

function notes(x: (typeof EXTRAITS)[number]): Note[] {
  const v = VERSIONS[x.version];
  const spb = 60 / v.tempo;
  const out: Note[] = [];
  let t0 = 0;
  for (let p = 0; t0 < DUREE; p++) {
    const { ev, duree } = passage(v, p, 1, x.options);
    for (const e of ev) {
      const niveau = x.couches[e.couche ?? 'fond'] ?? v.couches?.[e.couche ?? 'fond'] ?? 1;
      if (!niveau) continue;
      const mix = mixDe(e.instr, v.mix);
      for (const n of e.phrase ?? [{ t: 0, d: e.d, m: e.m, v: e.v }]) {
        out.push({ debut: t0 + (e.t + n.t) * spb, fin: t0 + (e.t + n.t + n.d) * spb, instr: e.instr, m: n.m, v: n.v, prio: priorite(e), pan: mix.pan, g: mix.g * niveau * v.gain, rev: mix.rev });
      }
    }
    t0 += duree * spb;
  }
  return out.filter((n) => n.debut < DUREE).sort((a, b) => a.debut - b.debut);
}

interface Voix { n: Note; e: Ech; pos: number; inc: number; on: number; off: number; relache: number }

function salle(c: Contrainte, l: Float32Array, r: Float32Array, sl: Float32Array, sr: Float32Array): void {
  if (c.salle === 'echo') {
    // l'écho d'une console : un retard réinjecté, assourdi
    const d = Math.round(0.21 * c.sr);
    const bl = new Float32Array(d);
    const br = new Float32Array(d);
    let i = 0;
    let fl = 0;
    let fr = 0;
    for (let n = 0; n < l.length; n++) {
      const yl = bl[i]!;
      const yr = br[i]!;
      fl += 0.45 * (yl - fl);
      fr += 0.45 * (yr - fr);
      bl[i] = sl[n]! + fr * 0.42;
      br[i] = sr[n]! + fl * 0.42;
      l[n]! += yl * 0.5;
      r[n]! += yr * 0.5;
      i = (i + 1) % d;
    }
    return;
  }
  // une réverbération courte de l'époque : quatre peignes, un passe-tout
  for (const [src, dst, dec] of [[sl, l, 0], [sr, r, 7]] as const) {
    const sortie = new Float32Array(l.length);
    for (const [ms, g] of [[29.7, 0.74], [37.1, 0.72], [41.1, 0.7], [43.7, 0.68]] as const) {
      const lg = Math.round(((ms + dec) / 1000) * c.sr);
      const b = new Float32Array(lg);
      let i = 0;
      let f = 0;
      for (let n = 0; n < l.length; n++) { const y = b[i]!; f += 0.5 * (y - f); b[i] = src[n]! + f * g; sortie[n]! += y * 0.25; i = (i + 1) % lg; }
    }
    for (let n = 0; n < l.length; n++) dst[n]! += sortie[n]! * 0.6;
  }
}

function rendre(x: (typeof EXTRAITS)[number], c: Contrainte): { l: Float32Array; r: Float32Array; total: number; perdues: number; volees: number; maxi: number } {
  const ns = notes(x);
  const ech = banque(c);
  const N = Math.round(DUREE * c.sr);
  const l = new Float32Array(N);
  const r = new Float32Array(N);
  const sl = new Float32Array(N);
  const sr = new Float32Array(N);
  let voix: Voix[] = [];
  let i = 0;
  let perdues = 0;
  let volees = 0;
  let maxi = 0;
  const rel = Math.round(0.05 * c.sr);
  for (let f = 0; f < N; f++) {
    while (i < ns.length && ns[i]!.debut * c.sr <= f) {
      const n = ns[i++]!;
      const e = ech(n.instr, n.m);
      if (!e) { perdues++; continue; }
      const libres = c.voix - voix.length;
      if (libres <= 0) {
        // la voix la moins utile : déjà relâchée d'abord, puis la priorité la plus basse, la plus ancienne
        const cible = [...voix].sort((a, b) => Number(b.relache >= 0) - Number(a.relache >= 0) || a.n.prio - b.n.prio || a.on - b.on)[0]!;
        if (cible.relache < 0 && cible.n.prio > n.prio) { perdues++; continue; }
        if (cible.relache < 0) volees++;
        voix = voix.filter((v) => v !== cible);
      }
      const pas = (2 ** ((n.m - e.racine) / 12) * e.sr) / c.sr;
      voix.push({ n, e, pos: 0, inc: e.racine === 60 && e.boucle === null ? e.sr / c.sr : pas, on: f, off: Math.round(n.fin * c.sr), relache: -1 });
      maxi = Math.max(maxi, voix.length);
    }
    let dl = 0;
    let dr = 0;
    let el = 0;
    let er = 0;
    const reste: Voix[] = [];
    for (const v of voix) {
      if (v.relache < 0 && f >= v.off && v.e.boucle !== null) v.relache = f;
      const t = (f - v.on) / c.sr;
      const a = ATTAQUE[v.n.instr] ?? 0;
      let env = a ? Math.min(1, t / a) : 1;
      const dec = DECLIN[v.n.instr];
      if (dec) env *= Math.exp(-t / dec);
      if (v.relache >= 0) env *= Math.max(0, 1 - (f - v.relache) / rel);
      const k = v.pos | 0;
      const fr = v.pos - k;
      const d = v.e.data;
      const s = (d[k] ?? 0) * (1 - fr) + (d[k + 1 < d.length ? k + 1 : (v.e.boucle ?? k)] ?? 0) * fr;
      const g = s * env * v.n.g * v.n.v ** 1.3 * 0.42;
      const pl = Math.cos(((v.n.pan + 1) * Math.PI) / 4);
      const pr = Math.sin(((v.n.pan + 1) * Math.PI) / 4);
      dl += g * pl;
      dr += g * pr;
      el += g * pl * v.n.rev;
      er += g * pr * v.n.rev;
      const vib = VIBRATO.has(v.n.instr) && t > 0.25 ? 1 + 0.0035 * Math.min(1, (t - 0.25) / 0.4) * Math.sin(2 * Math.PI * 5.4 * t) : 1;
      v.pos += v.inc * vib;
      if (v.pos >= d.length) {
        if (v.e.boucle === null) continue;
        v.pos = v.e.boucle + (v.pos - d.length);
      }
      if (v.relache >= 0 && f - v.relache >= rel) continue;
      reste.push(v);
    }
    voix = reste;
    l[f] = dl;
    r[f] = dr;
    sl[f] = el;
    sr[f] = er;
  }
  salle(c, l, r, sl, sr);
  // la sortie de la console : un passe-bas d'ordre deux
  const w = Math.exp((-2 * Math.PI * c.coupure) / c.sr);
  for (const b of [l, r]) for (let pass = 0; pass < 2; pass++) { let y = 0; for (let n = 0; n < N; n++) { y += (1 - w) * (b[n]! - y); b[n] = y; } }
  return { l, r, total: ns.length, perdues, volees, maxi };
}

/** Tous au même niveau (efficace, −20 dB), crête sous −1 dB, fondu de sortie : on juge le son, pas la force. */
export function egaliser(l: Float32Array, r: Float32Array, sr: number): void {
  let e = 0;
  let c = 0;
  for (let i = 0; i < l.length; i++) { e += l[i]! ** 2 + r[i]! ** 2; c = Math.max(c, Math.abs(l[i]!), Math.abs(r[i]!)); }
  const rms = Math.sqrt(e / (2 * l.length)) || 1;
  const g = Math.min(0.1 / rms, 0.89 / (c || 1));
  const f = Math.round(1.5 * sr);
  for (let i = 0; i < l.length; i++) { const k = Math.min(1, (l.length - i) / f); l[i]! *= g * k; r[i]! *= g * k; }
}

export function ecrireWav(chemin: string, l: Float32Array, r: Float32Array, sr: number): void {
  const b = Buffer.alloc(44 + l.length * 4);
  b.write('RIFF', 0); b.writeUInt32LE(36 + l.length * 4, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(2, 22);
  b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 4, 28); b.writeUInt16LE(4, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(l.length * 4, 40);
  for (let i = 0; i < l.length; i++) {
    b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, l[i]!)) * 32767), 44 + i * 4);
    b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, r[i]!)) * 32767), 46 + i * 4);
  }
  writeFileSync(chemin, b);
}

const rapport: unknown[] = [];
for (const x of EXTRAITS) {
  for (const c of OPTIONS) {
    const t0 = performance.now();
    const o = rendre(x, c);
    egaliser(o.l, o.r, c.sr);
    ecrireWav(`${WAV}/${x.id}-${c.id}.wav`, o.l, o.r, c.sr);
    const ligne = { extrait: x.id, option: c.id, notes: o.total, perdues: o.perdues, volees: o.volees, voixMax: o.maxi, voixPermises: c.voix, ms: Math.round(performance.now() - t0) };
    rapport.push(ligne);
    console.log(JSON.stringify(ligne));
  }
}
writeFileSync(`${OUT}/essai.json`, JSON.stringify(rapport, null, 1));
