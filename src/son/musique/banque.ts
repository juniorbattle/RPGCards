/**
 * M13 — banque d'échantillons (pur) : quelles notes calculer pour chaque instrument (une zone toutes les deux ou trois
 * demi-tons, transposée à la lecture ; une ou deux couches de vélocité ; des variantes pour la batterie), le calcul de
 * toute la banque (exécuté dans un worker, `banque.worker.ts`), et le choix de l'échantillon pour une note.
 */
import type { InstrId } from './generateurs';
import * as I from './instruments';

export interface Zone {
  /** Hauteur MIDI de la note calculée (batterie : numéro de variante). */
  racine: number;
  /** Vélocité de la couche. */
  couche: number;
  /** Fréquence d'échantillonnage du calcul (les instruments à hauteur : 32 kHz, rien au-dessus de 16 kHz). */
  sr: number;
  data: Float32Array<ArrayBuffer>;
}

export type BanqueBrute = Partial<Record<InstrId, Zone[]>>;

interface DefMelodique { kind: 'notes'; de: number; a: number; pas: number; couches: number[]; sr: number; synth: (sr: number, m: number, v: number) => Float32Array<ArrayBuffer> }
interface DefFrappe { kind: 'frappe'; variantes: number; synth: (sr: number, v: number) => Float32Array<ArrayBuffer> }

export const DEFS: Partial<Record<InstrId, DefMelodique | DefFrappe>> = {
  // une zone toutes les tierces majeures (transposition d'au plus deux demi-tons), calculées à 32 kHz
  piano: { kind: 'notes', de: 36, a: 96, pas: 4, couches: [0.38, 0.85], sr: 32000, synth: I.piano },
  rhodes: { kind: 'notes', de: 37, a: 93, pas: 4, couches: [0.4, 0.85], sr: 32000, synth: I.rhodes },
  vibra: { kind: 'notes', de: 53, a: 93, pas: 4, couches: [0.45, 0.9], sr: 32000, synth: I.vibra },
  basse: { kind: 'notes', de: 26, a: 62, pas: 3, couches: [0.75], sr: 32000, synth: I.basse },
  guitare: { kind: 'notes', de: 40, a: 88, pas: 4, couches: [0.4, 0.85], sr: 32000, synth: I.guitare },
  nylon: { kind: 'notes', de: 40, a: 84, pas: 4, couches: [0.45, 0.85], sr: 32000, synth: I.nylon },
  ride: { kind: 'frappe', variantes: 2, synth: I.ride },
  crash: { kind: 'frappe', variantes: 1, synth: (sr) => I.crash(sr) },
  cloche: { kind: 'frappe', variantes: 1, synth: (sr) => I.cloche(sr) },
  charley: { kind: 'frappe', variantes: 2, synth: I.charley },
  'charley-ferme': { kind: 'frappe', variantes: 3, synth: I.charleyFerme },
  gc: { kind: 'frappe', variantes: 2, synth: I.gc },
  cc: { kind: 'frappe', variantes: 2, synth: I.cc },
  'cc-balai': { kind: 'frappe', variantes: 3, synth: I.ccBalai },
  balai: { kind: 'frappe', variantes: 2, synth: I.balai },
  rim: { kind: 'frappe', variantes: 2, synth: I.rim },
};

/** Les échantillons à calculer pour ces instruments (liste ordonnée, pour un calcul par petits lots). */
export function plan(instrs: readonly InstrId[]): Array<{ instr: InstrId; racine: number; couche: number }> {
  const out: Array<{ instr: InstrId; racine: number; couche: number }> = [];
  for (const instr of instrs) {
    const d = DEFS[instr];
    if (!d) continue;
    if (d.kind === 'notes') for (let m = d.de; m <= d.a; m += d.pas) for (const c of d.couches) out.push({ instr, racine: m, couche: c });
    else for (let v = 0; v < d.variantes; v++) out.push({ instr, racine: v, couche: 1 });
  }
  return out;
}

/** Fréquence d'échantillonnage du calcul d'un instrument (celle du contexte pour la batterie). */
export const srDe = (instr: InstrId, sr: number): number => { const d = DEFS[instr]; return d?.kind === 'notes' ? d.sr : sr; };

/** Calcule un échantillon du plan. */
export function calculer(sr: number, p: { instr: InstrId; racine: number; couche: number }): Float32Array<ArrayBuffer> {
  const d = DEFS[p.instr]!;
  return d.kind === 'notes' ? d.synth(d.sr, p.racine, p.couche) : d.synth(sr, p.racine);
}

/** Toute la banque (tests, rendus hors ligne). */
export function fabriquer(sr: number, instrs: readonly InstrId[]): BanqueBrute {
  const b: BanqueBrute = {};
  for (const p of plan(instrs)) (b[p.instr] ??= []).push({ racine: p.racine, couche: p.couche, sr: srDe(p.instr, sr), data: calculer(sr, p) });
  return b;
}

export interface Choix { zone: number; vitesse: number; gain: number }

/**
 * L'échantillon d'une note : la zone la plus proche (transposée par la vitesse de lecture), la couche juste au-dessus
 * de la vélocité (gain proportionnel) ; batterie : la variante `m` (modulo), un léger écart de vitesse par coup.
 */
export function choisir(zones: readonly { racine: number; couche: number }[], instr: InstrId, m: number, v: number, jitter = 0): Choix | null {
  const d = DEFS[instr];
  if (!d || !zones.length) return null;
  if (d.kind === 'frappe') {
    const i = zones.findIndex((z) => z.racine === ((Math.round(m) % d.variantes) + d.variantes) % d.variantes);
    return { zone: Math.max(0, i), vitesse: 1 + jitter * 0.02, gain: Math.max(0, Math.min(1.2, v)) };
  }
  let best = -1;
  let bd = Infinity;
  const couches = d.couches;
  const couche = couches.find((c) => c >= v - 0.05) ?? couches[couches.length - 1]!;
  zones.forEach((z, i) => {
    if (z.couche !== couche) return;
    const dd = Math.abs(z.racine - m);
    if (dd < bd) { bd = dd; best = i; }
  });
  if (best < 0) return null;
  const z = zones[best]!;
  return { zone: best, vitesse: 2 ** ((m - z.racine) / 12), gain: Math.max(0, Math.min(1.3, (v / couche) ** 0.8)) };
}
