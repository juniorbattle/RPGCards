/**
 * M13 — effets : réponses impulsionnelles calculées (salles), courbe de chaleur, souffle de vinyle (pur, numérique) ;
 * chaîne lofi et bus de la musique (Web Audio). Contrat `docs/m13/01_MUSIQUE.md`, §4.
 */
import { makeRng } from '../../game/engine/rng';

export type SalleId = 'club' | 'grande' | 'rue' | 'studio';

interface DefSalle { rt60: number; predelai: number; claire: number; sombre: number; precoces: number }
export const SALLES: Record<SalleId, DefSalle> = {
  club: { rt60: 1.3, predelai: 0.012, claire: 9000, sombre: 2200, precoces: 0.5 },
  grande: { rt60: 2.4, predelai: 0.025, claire: 8000, sombre: 1800, precoces: 0.35 },
  rue: { rt60: 0.9, predelai: 0.03, claire: 6000, sombre: 2500, precoces: 0.8 },
  studio: { rt60: 0.8, predelai: 0.006, claire: 10000, sombre: 3500, precoces: 0.3 },
};

/**
 * Réponse impulsionnelle stéréo : bruit décorrélé à gauche et à droite, déclin exponentiel (RT60), aigus qui
 * s'éteignent plus vite (passe-bas dont la coupure descend de `claire` à `sombre`), quelques réflexions précoces.
 */
export function reponseImpulsionnelle(sr: number, salle: SalleId, graine = 47): [Float32Array<ArrayBuffer>, Float32Array<ArrayBuffer>] {
  const d = SALLES[salle];
  const n = Math.round(sr * (d.rt60 * 1.2 + d.predelai));
  const out: [Float32Array<ArrayBuffer>, Float32Array<ArrayBuffer>] = [new Float32Array(n), new Float32Array(n)];
  const p0 = Math.round(d.predelai * sr);
  for (let c = 0; c < 2; c++) {
    const rng = makeRng(graine * 7 + c);
    const b = out[c]!;
    let lp = 0;
    for (let i = p0; i < n; i++) {
      const t = (i - p0) / sr;
      const env = Math.exp((-6.91 * t) / d.rt60);
      const fc = d.sombre + (d.claire - d.sombre) * Math.exp(-t / (d.rt60 * 0.35));
      const a = 1 - Math.exp((-2 * Math.PI * fc) / sr);
      lp += a * ((rng() * 2 - 1) - lp);
      const att = Math.min(1, (i - p0) / (0.004 * sr));
      b[i] = lp * env * att;
    }
    // réflexions précoces
    for (let k = 0; k < 7; k++) {
      const i = p0 + Math.round((0.004 + rng() * 0.06) * sr);
      if (i < n) b[i]! += (rng() < 0.5 ? -1 : 1) * d.precoces * (1 - k / 8) * 0.6;
    }
  }
  // niveau : énergie ramenée pour qu'un envoi de 0,3 donne une salle présente sans noyer
  let e = 0;
  for (const b of out) for (let i = 0; i < n; i++) e += b[i]! * b[i]!;
  const g = 1 / Math.sqrt(e / 2 + 1e-9) * 0.9;
  for (const b of out) for (let i = 0; i < n; i++) b[i]! *= g;
  return out;
}

/** Courbe de chaleur (saturation douce, symétrique), pour un WaveShaper. */
export function courbeChaleur(k = 1.6, n = 2048): Float32Array<ArrayBuffer> {
  const c = new Float32Array(n);
  const t = Math.tanh(k);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    c[i] = Math.tanh(k * x) / t;
  }
  return c;
}

/** Souffle de vinyle : bruissement très bas et craquements épars (environ 9 par seconde), en boucle de `s` secondes. */
export function vinyle(sr: number, s = 3.1, graine = 0x71a7): Float32Array<ArrayBuffer> {
  const rng = makeRng(graine);
  const n = Math.round(sr * s);
  const b = new Float32Array(n);
  let lp = 0;
  for (let i = 0; i < n; i++) {
    lp += 0.08 * ((rng() * 2 - 1) - lp);
    b[i] = lp * 0.25;
  }
  const nb = Math.round(9 * s);
  for (let k = 0; k < nb; k++) {
    const i = Math.floor(rng() * (n - 40));
    const a = (0.15 + rng() ** 3 * 0.85) * (rng() < 0.5 ? -1 : 1);
    for (let j = 0; j < 30; j++) b[i + j]! += a * Math.exp(-j / 4) * (j % 2 ? -0.6 : 1);
  }
  // raccord de boucle sans clic
  for (let j = 0; j < 200; j++) { const g = j / 200; b[j]! *= g; b[n - 1 - j]! *= g; }
  return b;
}

// ------------------------------------------------------------------ Web Audio

const cacheIR = new WeakMap<BaseAudioContext, Map<SalleId, AudioBuffer>>();
export function tamponSalle(ctx: BaseAudioContext, salle: SalleId): AudioBuffer {
  let m = cacheIR.get(ctx);
  if (!m) { m = new Map(); cacheIR.set(ctx, m); }
  let b = m.get(salle);
  if (!b) {
    const [l, r] = reponseImpulsionnelle(ctx.sampleRate, salle);
    b = ctx.createBuffer(2, l.length, ctx.sampleRate);
    b.copyToChannel(l, 0);
    b.copyToChannel(r, 1);
    m.set(salle, b);
  }
  return b;
}

/**
 * Chaîne lofi : bande passante réduite (passe-haut 90 Hz, passe-bas 7,2 kHz), chaleur, pleurage et scintillement de
 * bande (retard modulé), souffle de vinyle. Renvoie l'entrée et la sortie, et un arrêt.
 */
export function chaineLofi(ctx: BaseAudioContext, o: { vinyle?: number } = {}): { entree: AudioNode; sortie: AudioNode; arreter: () => void } {
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 90; hp.Q.value = 0.6;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 7200; lp.Q.value = 0.6;
  const ws = ctx.createWaveShaper(); ws.curve = courbeChaleur(1.4); ws.oversample = '2x';
  const pre = ctx.createGain(); pre.gain.value = 0.8;
  const retard = ctx.createDelay(0.05); retard.delayTime.value = 0.012;
  const pleurage = ctx.createOscillator(); pleurage.frequency.value = 0.42;
  const gP = ctx.createGain(); gP.gain.value = 0.0011;
  const flutter = ctx.createOscillator(); flutter.frequency.value = 5.3;
  const gF = ctx.createGain(); gF.gain.value = 0.00012;
  pleurage.connect(gP).connect(retard.delayTime);
  flutter.connect(gF).connect(retard.delayTime);
  const sortie = ctx.createGain();
  hp.connect(lp).connect(pre).connect(ws).connect(retard).connect(sortie);
  const src = ctx.createBufferSource();
  const v = vinyle(ctx.sampleRate);
  const vb = ctx.createBuffer(1, v.length, ctx.sampleRate);
  vb.copyToChannel(v, 0);
  src.buffer = vb; src.loop = true;
  const gV = ctx.createGain(); gV.gain.value = o.vinyle ?? 0.05;
  src.connect(gV).connect(sortie);
  pleurage.start(); flutter.start(); src.start();
  return { entree: hp, sortie, arreter: () => { try { pleurage.stop(); flutter.stop(); src.stop(); } catch { /* déjà arrêtés */ } } };
}
