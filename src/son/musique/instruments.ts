/**
 * M13 — instruments fabriqués par le code (pur, numérique) : chaque fonction calcule une note (ou un coup) en échantillons
 * mono `Float32Array`, sans Web Audio, pour être exécutée une fois dans un worker et rangée en mémoire (ADR 047).
 * Techniques : oscillateurs amortis par rotation complexe (déclin exponentiel exact, peu coûteux), synthèse additive avec
 * inharmonicité et déclin par partiel (piano, contrebasse, vibraphone), FM (Rhodes), partiels inharmoniques et bruit
 * sculpté par des filtres (cymbales, balais, caisse claire), balayage de pitch (grosse caisse). Hasard à graine fixe.
 */
import { makeRng } from '../../game/engine/rng';
import { freq } from './theorie';

const TAU = Math.PI * 2;
const clamp = (x: number, a: number, b: number): number => Math.max(a, Math.min(b, x));

// table de sinus (cycles), interpolée
const N_LUT = 8192;
const LUT = new Float32Array(N_LUT + 1);
for (let i = 0; i <= N_LUT; i++) LUT[i] = Math.sin((TAU * i) / N_LUT);
function sinc(ph: number): number {
  const x = (ph - Math.floor(ph)) * N_LUT;
  const i = x | 0;
  return LUT[i]! + (LUT[i + 1]! - LUT[i]!) * (x - i);
}

/** Ajoute un partiel amorti (fréquence `f`, amplitude `a`, constante de temps `tau` en s) à partir de l'échantillon `de`. */
export function amorti(out: Float32Array, sr: number, f: number, a: number, tau: number, phase = 0, de = 0): void {
  if (f <= 0 || f >= sr * 0.46 || a === 0) return;
  const w = (TAU * f) / sr;
  const r = Math.exp(-1 / (tau * sr));
  const c = Math.cos(w) * r;
  const s = Math.sin(w) * r;
  let x = Math.cos(phase) * a;
  let y = Math.sin(phase) * a;
  const seuil = Math.abs(a) * 1e-4;
  for (let i = de; i < out.length; i++) {
    out[i]! += y;
    const nx = x * c - y * s;
    y = x * s + y * c;
    x = nx;
    if ((i & 511) === 0 && Math.abs(x) + Math.abs(y) < seuil) break;
  }
}

/** Biquad (RBJ) appliqué en place : passe-bas, passe-haut, passe-bande, crête. */
export function biquad(buf: Float32Array, sr: number, type: 'lp' | 'hp' | 'bp' | 'pk', f: number, q: number, gainDb = 0): void {
  const w = (TAU * clamp(f, 10, sr * 0.45)) / sr;
  const cw = Math.cos(w);
  const al = Math.sin(w) / (2 * q);
  const A = 10 ** (gainDb / 40);
  let b0: number, b1: number, b2: number, a0: number, a1: number, a2: number;
  if (type === 'lp') { b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = b0; a0 = 1 + al; a1 = -2 * cw; a2 = 1 - al; }
  else if (type === 'hp') { b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = b0; a0 = 1 + al; a1 = -2 * cw; a2 = 1 - al; }
  else if (type === 'bp') { b0 = al; b1 = 0; b2 = -al; a0 = 1 + al; a1 = -2 * cw; a2 = 1 - al; }
  else { b0 = 1 + al * A; b1 = -2 * cw; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * cw; a2 = 1 - al / A; }
  b0 /= a0; b1 /= a0; b2 /= a0; a1 /= a0; a2 /= a0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < buf.length; i++) {
    const x0 = buf[i]!;
    const y0 = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x0; y2 = y1; y1 = y0;
    buf[i] = y0;
  }
}

/** Bruit blanc à graine, enveloppe exponentielle (attaque `att` s, déclin `tau` s), dans un nouveau tampon de `n` échantillons. */
function bruit(n: number, sr: number, rng: () => number, tau: number, att = 0.0005): Float32Array<ArrayBuffer> {
  const b = new Float32Array(n);
  const k = Math.exp(-1 / (tau * sr));
  const na = Math.max(1, Math.round(att * sr));
  let e = 1;
  for (let i = 0; i < n; i++) {
    const a = i < na ? i / na : 1;
    b[i] = (rng() * 2 - 1) * e * a;
    e *= k;
  }
  return b;
}

const ajouter = (out: Float32Array, b: Float32Array, g: number): void => { for (let i = 0; i < Math.min(out.length, b.length); i++) out[i]! += b[i]! * g; };

function attaque(out: Float32Array, sr: number, s: number): void {
  const n = Math.min(out.length, Math.round(s * sr));
  for (let i = 0; i < n; i++) out[i]! *= i / n;
}

/** Fin adoucie : une note jouée jusqu'au bout de l'échantillon s'éteint en douceur (courbe en cosinus sur `s` secondes). */
function queue(out: Float32Array, sr: number, s = 0.05): void {
  const n = Math.min(out.length, Math.round(s * sr));
  for (let i = 0; i < n; i++) out[out.length - 1 - i]! *= 0.5 - 0.5 * Math.cos((Math.PI * i) / n);
}

/** Crête ramenée à `crete` (les couches de vélocité gardent leur écart par ce niveau). */
function normaliser(out: Float32Array<ArrayBuffer>, crete: number): Float32Array<ArrayBuffer> {
  let m = 0;
  for (let i = 0; i < out.length; i++) m = Math.max(m, Math.abs(out[i]!));
  if (m > 0) { const g = crete / m; for (let i = 0; i < out.length; i++) out[i]! *= g; }
  return out;
}

const nombre = (sr: number, s: number): number => Math.max(1, Math.round(sr * s));

// ------------------------------------------------------------------ instruments à hauteur

/** Piano : additif inharmonique (cordes raides), son immédiat et rémanent, trois cordes légèrement désaccordées, marteau. */
export function piano(sr: number, m: number, vel: number): Float32Array<ArrayBuffer> {
  const f0 = freq(m);
  const dur = clamp(3.8 - (m - 36) * 0.036, 1.6, 3.8);
  const out = new Float32Array(nombre(sr, dur));
  const rng = makeRng(0x91a0 + m * 7 + Math.round(vel * 10));
  const B = 0.00006 * 2 ** ((m - 40) / 15);
  const tauB = clamp(3.4 * 2 ** (-(m - 36) / 21), 0.4, 3.4);
  const pente = 1.8 - 0.85 * vel;
  const fc = 1800 + 5200 * vel;
  for (let k = 1; k <= 32; k++) {
    const fk = k * f0 * Math.sqrt(1 + B * k * k);
    if (fk > sr * 0.44) break;
    const marteau = Math.abs(Math.sin(Math.PI * k * 0.122)) + 0.08;
    const a = (marteau / k ** pente) / (1 + (fk / fc) ** 2);
    const tk = tauB / (1 + 0.16 * (k - 1));
    const det = (0.5 + rng() * 0.7) * 1e-3;
    amorti(out, sr, fk, a * 0.5, tk * 0.25, rng() * TAU);
    amorti(out, sr, fk * (1 + det), a * 0.32, tk * 1.15, rng() * TAU);
    amorti(out, sr, fk * (1 - det * 0.6), a * 0.18, tk * 0.95, rng() * TAU);
  }
  const h = bruit(nombre(sr, 0.03), sr, rng, 0.004);
  biquad(h, sr, 'lp', 900 + 2600 * vel, 0.7);
  ajouter(out, h, 0.05 * vel + 0.01);
  // caisse de résonance : un peu de corps vers 250 Hz, un peu moins de dureté vers 3 kHz
  biquad(out, sr, 'pk', 220, 1, 1);
  biquad(out, sr, 'pk', 3200, 1.2, -2);
  attaque(out, sr, 0.0015);
  queue(out, sr, dur * 0.3);
  return normaliser(out, 0.42 + 0.5 * vel);
}

/** Piano électrique (Rhodes) : FM 1:1 dont l'indice décroît (le corps), lame aiguë 14:1 très brève (l'attaque), grognement fort. */
export function rhodes(sr: number, m: number, vel: number): Float32Array<ArrayBuffer> {
  const f0 = freq(m);
  const dur = clamp(3.8 - (m - 40) * 0.03, 1.8, 3.8);
  const n = nombre(sr, dur);
  const out = new Float32Array(n);
  const I0 = 0.35 + 2.1 * vel;
  const kI = Math.exp(-1 / (clamp(0.9 * 2 ** (-(m - 48) / 30), 0.25, 1.2) * sr));
  const kA = Math.exp(-1 / (clamp(2.6 * 2 ** (-(m - 48) / 28), 0.7, 3) * sr));
  const kT = Math.exp(-1 / (0.06 * sr));
  const kTi = Math.exp(-1 / (0.012 * sr));
  const tineA = 0.08 + 0.26 * vel;
  const tineI0 = 0.6 + 2.4 * vel;
  const dphi = f0 / sr;
  let I = I0, A = 1, T = tineA, Ti = tineI0;
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const corps = sinc(ph + ((I + 0.22) / TAU) * sinc(ph * 1.0007)) * A;
    const lame = sinc(ph + (Ti / TAU) * sinc(ph * 14)) * T;
    out[i] = corps + lame + sinc(ph * 2) * 0.05 * A * vel;
    ph += dphi;
    if (ph > 1e6) ph -= 1e6;
    I *= kI; A *= kA; T *= kT; Ti *= kTi;
  }
  if (vel > 0.55) {
    const g = 1 + (vel - 0.55) * 3;
    const t = Math.tanh(g);
    for (let i = 0; i < n; i++) out[i] = Math.tanh(out[i]! * g) / t;
  }
  attaque(out, sr, 0.002);
  queue(out, sr, dur * 0.35);
  return normaliser(out, 0.4 + 0.5 * vel);
}

/** Vibraphone : lames accordées 1:4:10 (le fondamental dure, les autres s'éteignent vite), mailloche ; le moteur est à la lecture. */
export function vibra(sr: number, m: number, vel: number): Float32Array<ArrayBuffer> {
  const f0 = freq(m);
  const dur = clamp(3.4 - (m - 53) * 0.04, 2, 3.4);
  const out = new Float32Array(nombre(sr, dur));
  const rng = makeRng(0x71b0 + m);
  const tf = clamp(3.4 * 2 ** (-(m - 60) / 30), 1.3, 3.6);
  amorti(out, sr, f0, 1, tf, rng() * TAU);
  amorti(out, sr, f0 * 1.0011, 0.06, tf * 0.8, rng() * TAU);
  amorti(out, sr, f0 * 3.99, 0.18 + 0.26 * vel, 0.42, rng() * TAU);
  amorti(out, sr, f0 * 9.94, 0.05 + 0.14 * vel, 0.1, rng() * TAU);
  const c = bruit(nombre(sr, 0.02), sr, rng, 0.003);
  biquad(c, sr, 'lp', 2500 + 3000 * vel, 0.7);
  ajouter(out, c, 0.05 * vel);
  attaque(out, sr, 0.0008);
  queue(out, sr);
  return normaliser(out, 0.4 + 0.5 * vel);
}

/** Contrebasse pincée : additif d'une corde pincée près du chevalet (déclin plus rapide des aigus), coup de doigt et bois. */
export function basse(sr: number, m: number, vel: number): Float32Array<ArrayBuffer> {
  const f0 = freq(m);
  const dur = clamp(2.2 - (m - 28) * 0.02, 1.3, 2.2);
  const out = new Float32Array(nombre(sr, dur));
  const rng = makeRng(0xba55 + m);
  const tau0 = clamp(1.7 * 2 ** (-(m - 28) / 34), 0.75, 1.7);
  const fc = 650 + 1500 * vel;
  for (let k = 1; k <= 18; k++) {
    const fk = k * f0 * (1 + 0.00015 * k * k);
    if (fk > sr * 0.4) break;
    let a = Math.abs(Math.sin(Math.PI * k * 0.17)) / k ** 1.1 / (1 + (fk / fc) ** 2);
    if (k === 1) a *= 1.35;
    const tk = tau0 / (1 + 0.32 * (k - 1));
    amorti(out, sr, fk, a * 0.45, tk * 0.12, rng() * TAU);
    amorti(out, sr, fk, a * 0.55, tk, rng() * TAU);
  }
  const doigt = bruit(nombre(sr, 0.05), sr, rng, 0.012);
  biquad(doigt, sr, 'lp', 450, 0.8);
  ajouter(out, doigt, 0.12 * vel);
  const clic = bruit(nombre(sr, 0.01), sr, rng, 0.0015);
  biquad(clic, sr, 'hp', 2000, 0.7);
  ajouter(out, clic, 0.015);
  biquad(out, sr, 'pk', 105, 1.4, 3);
  attaque(out, sr, 0.002);
  queue(out, sr);
  return normaliser(out, 0.55 + 0.35 * vel);
}

/**
 * Guitare jazz (caisse creuse, micro manche, cordes filées à plat) : corde pincée en additif (position du médiator),
 * peigne du micro (sa place sous la corde donne le timbre de l'instrument électrique), tonalité sombre, aigus qui
 * s'éteignent vite ; deux polarisations légèrement désaccordées (la corde vit), médiator.
 */
export function guitare(sr: number, m: number, vel: number): Float32Array<ArrayBuffer> {
  const f0 = freq(m);
  const dur = clamp(2.8 - (m - 40) * 0.025, 1.6, 2.8);
  const out = new Float32Array(nombre(sr, dur));
  const rng = makeRng(0x9017 + m * 3 + Math.round(vel * 10));
  const tau0 = clamp(2.4 * 2 ** (-(m - 40) / 30), 0.9, 2.4);
  const fc = 1300 + 1600 * vel;
  for (let k = 1; k <= 40; k++) {
    const fk = k * f0 * Math.sqrt(1 + 0.00004 * k * k);
    if (fk > Math.min(sr * 0.44, 9000)) break;
    const a = (Math.abs(Math.sin(Math.PI * k * 0.18)) / k) * (Math.abs(Math.sin(Math.PI * k * 0.27)) ** 0.8 + 0.06) / (1 + (fk / fc) ** 2);
    const tk = tau0 / (1 + 0.45 * (k - 1));
    const det = (0.2 + rng() * 0.3) * 1e-3;
    amorti(out, sr, fk, a * 0.6, tk, rng() * TAU);
    amorti(out, sr, fk * (1 + det), a * 0.4, tk * 0.7, rng() * TAU);
  }
  const pique = bruit(nombre(sr, 0.012), sr, rng, 0.002);
  biquad(pique, sr, 'hp', 1500, 0.7);
  ajouter(out, pique, 0.02 * vel);
  biquad(out, sr, 'pk', 180, 1, 2);
  biquad(out, sr, 'pk', 2500, 1.2, -2);
  attaque(out, sr, 0.001);
  queue(out, sr, dur * 0.3);
  return normaliser(out, 0.45 + 0.45 * vel);
}

/**
 * Guitare à cordes de nylon : pincée au doigt (aigus plus doux), déclin long ; la caisse : résonance de l'air vers
 * 100 Hz, de la table vers 200 Hz, un creux vers 1,5 kHz ; le bruit du doigt.
 */
export function nylon(sr: number, m: number, vel: number): Float32Array<ArrayBuffer> {
  const f0 = freq(m);
  const dur = clamp(3.2 - (m - 40) * 0.03, 1.8, 3.2);
  const out = new Float32Array(nombre(sr, dur));
  const rng = makeRng(0x7110 + m * 3 + Math.round(vel * 10));
  const tau0 = clamp(2.8 * 2 ** (-(m - 40) / 28), 1, 2.8);
  const fc = 2200 + 2600 * vel;
  for (let k = 1; k <= 36; k++) {
    const fk = k * f0 * Math.sqrt(1 + 0.00002 * k * k);
    if (fk > sr * 0.44) break;
    const a = (Math.abs(Math.sin(Math.PI * k * 0.13)) + 0.03) / k ** 1.25 / (1 + (fk / fc) ** 2);
    const tk = tau0 / (1 + 0.3 * (k - 1));
    const det = (0.15 + rng() * 0.25) * 1e-3;
    amorti(out, sr, fk, a * 0.55, tk, rng() * TAU);
    amorti(out, sr, fk * (1 - det), a * 0.45, tk * 0.8, rng() * TAU);
  }
  const doigt = bruit(nombre(sr, 0.02), sr, rng, 0.004);
  biquad(doigt, sr, 'lp', 1200, 0.7);
  ajouter(out, doigt, 0.04 * vel);
  biquad(out, sr, 'pk', 105, 2, 4);
  biquad(out, sr, 'pk', 210, 1.5, 3);
  biquad(out, sr, 'pk', 1500, 1, -2);
  attaque(out, sr, 0.0015);
  queue(out, sr, dur * 0.3);
  return normaliser(out, 0.45 + 0.45 * vel);
}

// ------------------------------------------------------------------ batterie

/** Cymbale : partiels inharmoniques (le corps), bruit filtré en bandes qui s'éteignent à des vitesses différentes (le souffle), ping de baguette. */
function cymbale(sr: number, o: { graine: number; dur: number; f0: number; partiels: number; tau: number; souffle: number; ping: number; brillance: number }): Float32Array<ArrayBuffer> {
  const out = new Float32Array(nombre(sr, o.dur));
  const rng = makeRng(o.graine);
  for (let i = 0; i < o.partiels; i++) {
    const f = o.f0 * Math.exp(rng() * Math.log(28));
    const a = (0.25 + rng()) * (500 / f) ** (0.5 - o.brillance * 0.3) / o.partiels * 6;
    amorti(out, sr, f, a, clamp(o.tau * (600 / f) ** 0.55, 0.12, o.tau * 1.4), rng() * TAU);
  }
  for (let i = 0; i < 10; i++) amorti(out, sr, 2600 + rng() * 6500, o.ping * 0.08 * (0.5 + rng()), 0.04 + rng() * 0.03, rng() * TAU);
  const bandes: Array<[number, number, number]> = [[3500, 0.9, 0.45], [5500, 1.0, 0.35], [8000, 1.2, 0.28], [11000, 1.4, 0.2]];
  for (const [f, q, part] of bandes) {
    const b = bruit(out.length, sr, rng, o.tau * part * 1.5, 0.002);
    biquad(b, sr, 'bp', f, q);
    ajouter(out, b, o.souffle * (0.6 + o.brillance * 0.6));
  }
  attaque(out, sr, 0.0006);
  queue(out, sr, 0.2);
  return out;
}

export function ride(sr: number, variante: number): Float32Array<ArrayBuffer> {
  return normaliser(cymbale(sr, { graine: 0x41de + variante, dur: 4.2, f0: 420, partiels: 70, tau: 2.6, souffle: 0.35, ping: 1 + variante * 0.5, brillance: 0.35 + variante * 0.15 }), 0.7);
}

export function crash(sr: number): Float32Array<ArrayBuffer> {
  return normaliser(cymbale(sr, { graine: 0xc4a5, dur: 3.6, f0: 360, partiels: 60, tau: 1.9, souffle: 0.9, ping: 0.4, brillance: 0.7 }), 0.75);
}

export function cloche(sr: number): Float32Array<ArrayBuffer> {
  const out = new Float32Array(nombre(sr, 2.6));
  const rng = makeRng(0xc10c);
  for (const [r, a, t] of [[1, 1, 2], [2.32, 0.6, 1.3], [3.92, 0.45, 0.8], [5.24, 0.3, 0.5], [6.71, 0.2, 0.35]] as const) amorti(out, sr, 760 * r, a, t, rng() * TAU);
  attaque(out, sr, 0.0005);
  return normaliser(out, 0.6);
}

/** Charleston au pied (« tchik ») : deux cymbales qui se ferment. */
export function charley(sr: number, variante: number): Float32Array<ArrayBuffer> {
  const rng = makeRng(0xc4a1 + variante);
  const out = bruit(nombre(sr, 0.12), sr, rng, 0.022 + variante * 0.006);
  biquad(out, sr, 'bp', 7800, 1.1);
  const t = bruit(nombre(sr, 0.05), sr, rng, 0.012);
  biquad(t, sr, 'bp', 420, 1.5);
  ajouter(out, t, 0.6);
  queue(out, sr, 0.02);
  return normaliser(out, 0.6 - variante * 0.15);
}

/** Charleston fermé à la baguette (lofi). */
export function charleyFerme(sr: number, variante: number): Float32Array<ArrayBuffer> {
  const rng = makeRng(0xcf00 + variante);
  const out = bruit(nombre(sr, 0.1), sr, rng, [0.028, 0.04, 0.02][variante % 3]!);
  biquad(out, sr, 'hp', 6500, 0.7);
  biquad(out, sr, 'pk', 10000, 1, 4);
  for (let i = 0; i < 5; i++) amorti(out, sr, 4000 + rng() * 5000, 0.04, 0.015, rng() * TAU);
  queue(out, sr, 0.02);
  return normaliser(out, 0.55);
}

/** Grosse caisse : jazz (18 pouces, feutrée) ou lofi (plus ronde, plus longue). */
export function gc(sr: number, variante: number): Float32Array<ArrayBuffer> {
  const lofi = variante === 1;
  const n = nombre(sr, lofi ? 0.55 : 0.45);
  const out = new Float32Array(n);
  const rng = makeRng(0x6c00 + variante);
  let ph = 0;
  const kA = Math.exp(-1 / ((lofi ? 0.32 : 0.24) * sr));
  let A = 1;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const f = (lofi ? 48 : 56) + (lofi ? 75 : 55) * Math.exp(-t / (lofi ? 0.04 : 0.03));
    ph += f / sr;
    out[i] = sinc(ph) * A;
    A *= kA;
  }
  if (lofi) for (let i = 0; i < n; i++) out[i] = Math.tanh(out[i]! * 1.6) / Math.tanh(1.6);
  const c = bruit(nombre(sr, 0.01), sr, rng, 0.002);
  biquad(c, sr, 'lp', 2800, 0.7);
  ajouter(out, c, 0.25);
  attaque(out, sr, 0.0008);
  queue(out, sr, 0.03);
  return normaliser(out, lofi ? 0.85 : 0.75);
}

/** Caisse claire à la baguette : peau (deux modes) et timbre (bruit) ; variante 1 : note fantôme. */
export function cc(sr: number, variante: number): Float32Array<ArrayBuffer> {
  const rng = makeRng(0xcc00 + variante);
  const out = new Float32Array(nombre(sr, 0.35));
  amorti(out, sr, 185, 0.5, 0.08, 0);
  amorti(out, sr, 330, 0.3, 0.05, 1);
  const t = bruit(out.length, sr, rng, variante === 1 ? 0.09 : 0.14);
  biquad(t, sr, 'bp', 4200, 0.7);
  biquad(t, sr, 'hp', 1400, 0.7);
  ajouter(out, t, variante === 1 ? 0.5 : 0.9);
  attaque(out, sr, 0.0005);
  queue(out, sr, 0.04);
  return normaliser(out, variante === 1 ? 0.45 : 0.75);
}

/** Balai frappé sur la caisse claire. */
export function ccBalai(sr: number, variante: number): Float32Array<ArrayBuffer> {
  const rng = makeRng(0xcb00 + variante);
  const out = bruit(nombre(sr, 0.3), sr, rng, [0.05, 0.07, 0.04][variante % 3]!, 0.001);
  biquad(out, sr, 'bp', 2600, 0.5);
  const fils = bruit(out.length, sr, rng, 0.15, 0.002);
  biquad(fils, sr, 'hp', 3200, 0.7);
  ajouter(out, fils, 0.3);
  queue(out, sr, 0.04);
  return normaliser(out, 0.6);
}

/** Balai en cercle : un souffle dont la couleur monte puis redescend (le balai qui tourne sur la peau). */
export function balai(sr: number, variante: number): Float32Array<ArrayBuffer> {
  const rng = makeRng(0xba1a + variante);
  const dur = variante === 0 ? 0.95 : 1.35;
  const n = nombre(sr, dur);
  const src = new Float32Array(n);
  for (let i = 0; i < n; i++) src[i] = rng() * 2 - 1;
  const out = new Float32Array(n);
  // passe-bande variable, recalculé tous les 64 échantillons
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i0 = 0; i0 < n; i0 += 64) {
    const u = i0 / n;
    const f = 1100 + 1700 * Math.sin(Math.PI * u) ** 1.5 + 300 * u;
    const w = (TAU * f) / sr;
    const al = Math.sin(w) / (2 * 0.9);
    const a0 = 1 + al;
    const b0 = al / a0, b2 = -al / a0, a1 = (-2 * Math.cos(w)) / a0, a2 = (1 - al) / a0;
    for (let i = i0; i < Math.min(n, i0 + 64); i++) {
      const x0 = src[i]!;
      const y0 = b0 * x0 + b2 * x2 - a1 * y1 - a2 * y2;
      x2 = x1; x1 = x0; y2 = y1; y1 = y0;
      const env = Math.sin(Math.PI * Math.min(1, (i / n) * 1.15)) ** 1.2;
      out[i] = y0 * env;
    }
  }
  return normaliser(out, 0.5);
}

/** Bord de caisse (cross-stick). */
export function rim(sr: number, variante: number): Float32Array<ArrayBuffer> {
  const rng = makeRng(0x7100 + variante);
  const out = new Float32Array(nombre(sr, 0.12));
  amorti(out, sr, 1650 + variante * 120, 1, 0.012, 0);
  amorti(out, sr, 460, 0.5, 0.02, 0);
  const c = bruit(out.length, sr, rng, 0.003);
  biquad(c, sr, 'bp', 3000, 1);
  ajouter(out, c, 0.5);
  queue(out, sr, 0.02);
  return normaliser(out, 0.55);
}
