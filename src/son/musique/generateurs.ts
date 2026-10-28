/**
 * M13 — générateurs de jazz (pur, à graine) : basse qui marche, deux temps, basse lofi ; accompagnement (comping
 * rythmique à voicings sans fondamentale qui évitent la mélodie, accords tenus, arpèges de ballade) ; batterie (ride,
 * balais, lofi) avec relances ; ornements ; chorus improvisé sur le motif. Contrat `docs/m13/01_MUSIQUE.md`, §4.
 * Toutes les positions sont en temps (noires), droites : le swing est appliqué à la lecture de l'arrangement.
 */
import type { AccordP, NoteP } from './partitions';
import { accord, dansAccord, hauteursAccord, hauteursGamme, pc, voicer, type Accord, type Tessiture } from './theorie';

export type InstrId =
  | 'piano' | 'rhodes' | 'vibra' | 'basse' | 'guitare' | 'nylon' | 'nappe'
  // vents et cordes, synthétisés en temps réel (expressifs : attaque, vibrato, souffle) : `vents.ts`
  | 'trompette' | 'sax' | 'flute' | 'cuivres' | 'cordes'
  | 'ride' | 'cloche' | 'crash' | 'charley' | 'charley-ferme' | 'gc' | 'cc' | 'cc-balai' | 'balai' | 'rim';

/** Des accords plaqués aux positions dites (coups de cuivres, ponctuations d'arrangement), voicés dans la tessiture. */
export function coups(as: readonly AccordP[], positions: ReadonlyArray<readonly [number, number]>, o: { instr: InstrId; tessiture?: Tessiture; vel?: number; melodie?: readonly NoteP[] }): Evenement[] {
  const ac = lireAccords(as);
  const out: Evenement[] = [];
  let prev: number[] | null = null;
  for (const [t, d] of positions) {
    const a = accordA(ac, t).a;
    let v = voicer(a, prev, o.tessiture ?? { lo: 55, hi: 79 });
    prev = v;
    if (o.melodie) v = eviterMelodie(v, melodieA(o.melodie, t + 0.01), a);
    for (const m of v) out.push({ t, d, instr: o.instr, m, v: o.vel ?? 0.6 });
  }
  return out;
}

/** Ornements des vents : coulé par en dessous (scoop), chute en fin de phrase. */
export type Orn = 'scoop' | 'chute';
/** Une note d'une phrase de vent (positions relatives au début de la phrase). */
export interface NoteV { t: number; d: number; m: number; v: number; orn?: Orn }

export interface Evenement {
  t: number;
  d: number;
  instr: InstrId;
  m: number;
  /** Vélocité 0 à 1. */
  v: number;
  /** Pas de swing (déjà placé). */
  droit?: boolean;
  /** Couche du mélange (fond par défaut) : elle entre et sort en fondu sans recommencer le morceau (contrat 2, §2). */
  couche?: string;
  /** Cymbale étouffée à la main au bout de `d` (fin de duel). */
  etouffe?: boolean;
  orn?: Orn;
  /** Phrase d'un instrument à une voix (`lier`) : toutes ses notes, la première comprise, jouées d'un souffle. */
  phrase?: NoteV[];
}

export type Rng = () => number;

const pick = <T>(rng: Rng, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)]!;
const chance = (rng: Rng, p: number): boolean => rng() < p;
/** Bruit à peu près gaussien (somme de trois uniformes), moyenne 0, écart type ≈ s. */
export const gauss = (rng: Rng, s: number): number => (rng() + rng() + rng() - 1.5) * 2 * s;

interface AccordT { t: number; d: number; a: Accord }
export const lireAccords = (as: readonly AccordP[]): AccordT[] => as.map((x) => ({ t: x.t, d: x.d, a: accord(x.sym) }));
function accordA(as: readonly AccordT[], t: number): AccordT {
  let cur = as[0]!;
  for (const x of as) if (x.t <= t + 1e-9) cur = x;
  return cur;
}
const prochainChangement = (as: readonly AccordT[], t: number, total: number): number => as.find((x) => x.t > t + 1e-9)?.t ?? total;
const prochainAccord = (as: readonly AccordT[], t: number): AccordT => as.find((x) => x.t > t + 1e-9) ?? as[0]!;

/** La hauteur de classe `p` la plus proche de `ref` dans [lo, hi]. */
function proche(p: number, ref: number, lo: number, hi: number): number {
  let best = lo;
  let bd = Infinity;
  for (let m = lo; m <= hi; m++) if (pc(m) === pc(p) && Math.abs(m - ref) < bd) { bd = Math.abs(m - ref); best = m; }
  return best;
}

// ------------------------------------------------------------------ basse

export interface OptBasse { lo?: number; hi?: number; depart?: number; fantomes?: number }

/**
 * Basse qui marche, une note par temps : la fondamentale (parfois la tierce ou la quinte) au changement d'accord, des
 * notes de l'accord ou de sa gamme qui cheminent vers l'accord suivant, une approche (chromatique, par la quinte, par
 * la gamme) sur le dernier temps avant le changement ; quelques notes fantômes en croche.
 */
export function basseMarche(as: readonly AccordP[], total: number, rng: Rng, o: OptBasse = {}): Evenement[] {
  const ac = lireAccords(as);
  const lo = o.lo ?? 28;
  const hi = o.hi ?? 55;
  const out: Evenement[] = [];
  let prev = o.depart ?? 41;
  let dir = 1;
  for (let b = 0; b < total; b++) {
    const cur = accordA(ac, b);
    const chg = prochainChangement(ac, b, total);
    const nxt = prochainAccord(ac, b);
    const cibleP = nxt.a.basse;
    let m: number;
    if (Math.abs(cur.t - b) < 1e-9) {
      const p = cur.a.basse !== cur.a.fond || chance(rng, 0.85) || cur.d < 2 ? cur.a.basse : cur.a.fond + pick(rng, [cur.a.tons[1]!, cur.a.tons[2]!]);
      m = proche(p, prev + dir * 2, lo, hi);
    } else if (Math.abs(chg - (b + 1)) < 1e-9) {
      const cible = proche(cibleP, prev, lo, hi);
      const cands = [cible - 1, cible + 1, cible + 7 <= hi ? cible + 7 : cible - 5, cible - 2].filter((x) => x >= lo && x <= hi && x !== prev);
      const r = rng();
      const [c0, c1] = [cands[0] ?? cible, cands[1] ?? cands[0] ?? cible];
      m = r < 0.5 ? (Math.abs(c0 - prev) <= Math.abs(c1 - prev) ? c0 : c1) : r < 0.75 ? cands[2] ?? c0 : cands[3] ?? c0;
    } else {
      const cible = proche(cibleP, prev + dir * 4, lo, hi);
      dir = cible >= prev ? 1 : -1;
      if (prev > hi - 4) dir = -1;
      if (prev < lo + 4) dir = 1;
      const tons = hauteursAccord(cur.a, lo, hi);
      const gamme = hauteursGamme(cur.a, lo, hi);
      const pool = (chance(rng, 0.55) ? tons : gamme).filter((x) => (dir > 0 ? x > prev : x < prev) && Math.abs(x - prev) <= 5);
      m = pool.length ? (dir > 0 ? pool[0]! : pool[pool.length - 1]!) : prev + dir * 2;
      if (pool.length > 1 && chance(rng, 0.3)) m = dir > 0 ? pool[1]! : pool[pool.length - 2]!;
    }
    m = Math.max(lo, Math.min(hi, m));
    const accent = b % 2 === 1 ? 0.06 : 0;
    out.push({ t: b, d: 0.95, instr: 'basse', m, v: 0.72 + accent + gauss(rng, 0.04) });
    if (b < total - 1 && chance(rng, o.fantomes ?? 0.1) && Math.abs(chg - (b + 1)) > 1e-9) {
      out.push({ t: b + 0.5, d: 0.3, instr: 'basse', m: m + pick(rng, [-1, 1, 0]), v: 0.32 });
      out[out.length - 2]!.d = 0.45;
    }
    prev = m;
  }
  return out;
}

/** Deux temps (ballade, premier A) : fondamentale sur le 1, quinte ou approche sur le 3, une croche fantôme parfois. */
export function basseDeux(as: readonly AccordP[], total: number, rng: Rng, mesure = 4, o: OptBasse = {}): Evenement[] {
  const ac = lireAccords(as);
  const lo = o.lo ?? 28;
  const hi = o.hi ?? 52;
  const out: Evenement[] = [];
  let prev = o.depart ?? 41;
  for (let b = 0; b < total; b += 2) {
    const cur = accordA(ac, b);
    const chg = prochainChangement(ac, b, total);
    let m: number;
    if (Math.abs(cur.t - b) < 1e-9 || b % mesure === 0) m = proche(cur.a.basse, prev, lo, hi);
    else if (chg <= b + 2) m = proche(prochainAccord(ac, b).a.basse, prev, lo, hi) + pick(rng, [-1, 1, 7 - 12]);
    else m = proche(cur.a.fond + 7, prev, lo, hi);
    m = Math.max(lo, Math.min(hi, m));
    out.push({ t: b, d: 1.85, instr: 'basse', m, v: 0.74 + gauss(rng, 0.04) });
    if (chance(rng, o.fantomes ?? 0.15)) out.push({ t: b + 1.5, d: 0.4, instr: 'basse', m: m + pick(rng, [2, -2, 7 - 12]), v: 0.35 });
    prev = m;
  }
  return out;
}

/** Basse lofi : la fondamentale longue sur le 1, la quinte ou l'octave en syncope, une approche à la fin de la mesure. */
export function basseLofi(as: readonly AccordP[], total: number, rng: Rng, mesure = 4): Evenement[] {
  const ac = lireAccords(as);
  const out: Evenement[] = [];
  for (let b = 0; b < total; b += mesure) {
    const cur = accordA(ac, b);
    const r = proche(cur.a.basse, 36, 31, 43);
    out.push({ t: b, d: 1.6, instr: 'basse', m: r, v: 0.8 });
    out.push({ t: b + pick(rng, [2.5, 2.75, 2]), d: 0.7, instr: 'basse', m: chance(rng, 0.5) ? r + 7 : r + 12, v: 0.6, droit: true });
    if (chance(rng, 0.5)) {
      const nx = proche(prochainAccord(ac, b + mesure - 0.01).a.basse, r, 31, 45);
      out.push({ t: b + 3.5, d: 0.4, instr: 'basse', m: nx + pick(rng, [-1, 1]), v: 0.5, droit: true });
    }
  }
  return out;
}

// ------------------------------------------------------------------ accompagnement

/**
 * Voicing sous la mélodie : toutes ses notes restent sous la note chantée ; une note qui frotte contre elle (seconde ou
 * septième majeure, c'est-à-dire neuvième mineure ou seconde mineure à l'octave près) prend la note de l'accord la plus
 * proche qui ne frotte ni avec la mélodie ni avec ses voisines, ou disparaît.
 */
export function eviterMelodie(v: readonly number[], mel: number | null, a: Accord): number[] {
  if (mel === null) return [...v];
  const tolere = a.qualite === '7b9' || a.qualite === '7alt';
  const frotte = (x: number): boolean => { const iv = (((mel - x) % 12) + 12) % 12; return !tolere && (iv === 1 || iv === 11); };
  const out: number[] = [];
  for (let x of v) {
    while (x >= mel - 1) x -= 12;
    if (frotte(x)) {
      const y = [x - 1, x + 1, x - 2, x + 2, x - 3, x + 3].find((c) => c < mel - 1 && dansAccord(a, c, true) && !frotte(c) && !out.includes(c) && !out.some((o) => Math.abs(o - c) === 1));
      if (y === undefined) continue;
      x = y;
    }
    if (!out.includes(x)) out.push(x);
  }
  return out.sort((p, q) => p - q);
}

/** La note de mélodie qui sonne à l'instant `t` (la dernière commencée et pas encore finie), ou null. */
export function melodieA(mel: readonly NoteP[], t: number): number | null {
  let r: number | null = null;
  for (const x of mel) if (x.t <= t + 1e-6 && x.t + x.d > t + 1e-6) r = x.m;
  return r;
}

/** Rythmes d'accompagnement d'une mesure de 4 : [position, durée]. Du plus dense au plus clairsemé. */
const RYTHMES: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = [
  [[0, 0.8], [1.5, 0.5]], // Charleston
  [[1.5, 0.5], [3.5, 0.5]],
  [[0, 1.6], [2.5, 0.4]],
  [[2, 1], [3.5, 0.5]],
  [[1, 0.5], [2.5, 0.5]],
  [[0, 0.4], [1.5, 0.4], [3, 0.8]],
  [[3.5, 0.5]],
  [[0, 2]],
  [[0.5, 0.4], [2, 0.9]],
];

/** Rythmes d'accompagnement d'une mesure de valse (3 temps) : sur 2 et 3, en contretemps, notes tenues. */
const RYTHMES3: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = [
  [[1, 0.6], [2, 0.6]],
  [[0, 1.4], [2, 0.6]],
  [[1.5, 0.5]],
  [[1, 0.5], [2.5, 0.4]],
  [[0, 0.8], [1.5, 0.4]],
  [[2, 0.8]],
  [[0, 2.5]],
];

export interface OptComping {
  instr: InstrId;
  tessiture?: Tessiture;
  densite?: number;
  quartes?: boolean;
  vel?: number;
  /** Mélodie à éviter (la tête). */
  melodie?: readonly NoteP[];
}

/** Comping rythmique (trio de jazz) : voicings sans fondamentale, conduite des voix, anticipations du prochain accord. */
export function comping(as: readonly AccordP[], total: number, rng: Rng, o: OptComping, mesure = 4): Evenement[] {
  const ac = lireAccords(as);
  const t = o.tessiture ?? { lo: 50, hi: 74 };
  const dens = o.densite ?? 0.6;
  const out: Evenement[] = [];
  let prev: number[] | null = null;
  for (let b = 0; b < total; b += mesure) {
    const choix = mesure === 3 ? RYTHMES3.filter((_, i) => (dens > 0.7 ? i < 5 : dens > 0.4 ? i < 6 : i >= 2)) : RYTHMES.filter((_, i) => (dens > 0.7 ? i < 6 : dens > 0.4 ? i < 8 : i >= 3));
    let r = [...pick(rng, choix)];
    // chaque accord de la mesure reçoit au moins un coup
    for (const x of ac.filter((y) => y.t >= b && y.t < b + mesure && y.t > b)) {
      if (!r.some(([p]) => b + p >= x.t - 0.5 && b + p < x.t + x.d)) r.push([x.t - b - (chance(rng, 0.4) ? 0.5 : 0), 0.6]);
    }
    if (!r.some(([p]) => p < 1.6) && Math.abs(accordA(ac, b).t - b) < 1e-9 && chance(rng, 0.35)) r = [[0, 0.6], ...r];
    r.sort((p, q) => p[0] - q[0]);
    for (const [p, d] of r) {
      const tt = b + p;
      if (tt >= total) continue;
      // un coup sur la dernière croche de la mesure anticipe l'accord suivant
      const cible = p >= mesure - 0.5 ? prochainAccord(ac, tt) : accordA(ac, tt);
      let v = voicer(cible.a, prev, t, { quartes: o.quartes ?? false });
      prev = v;
      if (o.melodie) v = eviterMelodie(v, melodieA(o.melodie, tt + 0.01), cible.a);
      const vel = (o.vel ?? 0.55) + gauss(rng, 0.05) + (p % 1 !== 0 ? 0.04 : 0);
      for (const m of v) out.push({ t: tt, d, instr: o.instr, m, v: vel });
    }
  }
  return out;
}

/** Accords tenus (lounge, nappe) : un voicing par accord, sur toute sa durée, attaque légèrement anticipée en option. */
export function accordsTenus(as: readonly AccordP[], total: number, rng: Rng, o: OptComping & { antic?: number; arpege?: number }): Evenement[] {
  const ac = lireAccords(as);
  const t = o.tessiture ?? { lo: 52, hi: 76 };
  const out: Evenement[] = [];
  let prev: number[] | null = null;
  for (const x of ac) {
    if (x.t >= total) continue;
    let v = voicer(x.a, prev, t, { quartes: o.quartes ?? false });
    prev = v;
    if (o.melodie) v = eviterMelodie(v, melodieA(o.melodie, x.t + 0.01), x.a);
    const t0 = Math.max(0, x.t - (o.antic ?? 0));
    v.forEach((m, i) => out.push({ t: t0 + i * (o.arpege ?? 0), d: x.d - i * (o.arpege ?? 0) + (o.antic ?? 0) - 0.05, instr: o.instr, m, v: (o.vel ?? 0.45) + gauss(rng, 0.03) }));
  }
  return out;
}

/** Arpèges de ballade (main gauche du piano) : basse, quinte, puis tierce et septième à l'octave, comme une main qui s'ouvre. */
export function arpegesBallade(as: readonly AccordP[], total: number, rng: Rng, o: { instr: InstrId; vel?: number }): Evenement[] {
  const ac = lireAccords(as);
  const out: Evenement[] = [];
  for (const x of ac) {
    if (x.t >= total) continue;
    const b = proche(x.a.basse, 41, 36, 48);
    const notes = [b, proche(x.a.fond + 7, b + 7, b + 3, b + 11), proche(x.a.fond + x.a.tons[1]!, b + 15, b + 10, b + 21), proche(x.a.fond + x.a.tons[3]!, b + 22, b + 16, b + 27)];
    const pas = x.d >= 2 ? 0.5 : 0.25;
    const ordre = [0, 1, 2, 3, 2, 1, 2, 3];
    let k = 0;
    for (let tt = x.t; tt < x.t + x.d - 1e-6 && tt < total; tt += pas) {
      out.push({ t: tt, d: x.t + x.d - tt, instr: o.instr, m: notes[ordre[k % ordre.length]!]!, v: (o.vel ?? 0.36) * (k === 0 ? 1.1 : 1) + gauss(rng, 0.03) });
      k++;
    }
  }
  return out;
}

// ------------------------------------------------------------------ batterie

export interface OptBatterie { relance?: number; intensite?: number; mesure?: number; depart?: number }

/** Ride (« ding, ding-ga, ding, ding-ga »), charleston sur 2 et 4, grosse caisse feutrée, caisse claire qui commente, relances. */
export function batterieRide(total: number, rng: Rng, o: OptBatterie = {}): Evenement[] {
  const mes = o.mesure ?? 4;
  const rel = o.relance ?? 8;
  const it = o.intensite ?? 0.6;
  const out: Evenement[] = [];
  const v = (x: number) => Math.max(0.05, Math.min(1, x * (0.7 + it * 0.5) + gauss(rng, 0.04)));
  for (let b = 0; b < total; b++) {
    const dans = b % mes;
    const mesureN = Math.floor(b / mes);
    const relance = rel > 0 && (mesureN + 1) % rel === 0 && dans >= mes - 2 && b + (mes - dans) <= total;
    if (relance && dans === mes - 2) {
      // relance de deux temps : caisse claire en triolets, grosse caisse, puis la cymbale au temps 1
      const fig = pick(rng, [[0, 0.333, 0.667, 1, 1.333, 1.667], [0, 0.667, 1, 1.333, 1.667], [0, 0.5, 1, 1.5]]);
      fig.forEach((p, i) => out.push({ t: b + p, d: 0.2, instr: i === fig.length - 1 && chance(rng, 0.5) ? 'gc' : 'cc', m: 0, v: v(0.35 + i * 0.08), droit: true }));
      continue;
    }
    if (relance) continue;
    out.push({ t: b, d: 1, instr: 'ride', m: dans % 2, v: v(dans % 2 === 1 ? 0.62 : 0.52) });
    if (dans % 2 === 1) out.push({ t: b + 0.5, d: 0.5, instr: 'ride', m: 2, v: v(0.38) });
    if (dans % 2 === 1) out.push({ t: b, d: 0.2, instr: 'charley', m: 0, v: v(0.5) });
    out.push({ t: b, d: 0.3, instr: 'gc', m: 0, v: v(0.12) });
    if (chance(rng, 0.11 * it)) out.push({ t: b + 0.5, d: 0.2, instr: 'cc', m: 1, v: v(0.18 + rng() * 0.16) });
    if (chance(rng, 0.03 * it)) out.push({ t: b + pick(rng, [0.5, 1.5 - 1]), d: 0.3, instr: 'gc', m: 0, v: v(0.45) });
    if (dans === 0 && mesureN > 0 && rel > 0 && mesureN % rel === 0) out.push({ t: b, d: 2, instr: 'crash', m: 0, v: v(0.42) });
  }
  return out;
}

/** Balais : un cercle sur chaque demi-mesure, frappés sur 2 et 4, grosse caisse effleurée ; une ponctuation parfois. */
export function batterieBalais(total: number, rng: Rng, o: OptBatterie = {}): Evenement[] {
  const mes = o.mesure ?? 4;
  const out: Evenement[] = [];
  const it = o.intensite ?? 0.5;
  for (let b = 0; b < total; b++) {
    const dans = b % mes;
    if (dans % 2 === 0) out.push({ t: b, d: 2, instr: 'balai', m: (b / 2) % 2, v: 0.32 + it * 0.2 + gauss(rng, 0.03) });
    if (mes === 3 ? dans !== 0 : dans % 2 === 1) out.push({ t: b, d: 0.4, instr: 'cc-balai', m: dans % 3, v: 0.36 + it * 0.25 + gauss(rng, 0.04) });
    if (dans % 2 === 1 && chance(rng, 0.22)) out.push({ t: b + 0.5, d: 0.3, instr: 'cc-balai', m: 2, v: 0.2 + gauss(rng, 0.03) });
    if (dans === 0) out.push({ t: b, d: 0.3, instr: 'gc', m: 0, v: 0.1 + it * 0.05 });
    if (mes === 4 && dans % 2 === 1) out.push({ t: b, d: 0.2, instr: 'charley', m: 1, v: 0.22 });
  }
  return out;
}

/** Lofi : grosse caisse et caisse claire posées (ou baguette sur le cercle), charleston en doubles croches nuancées. */
export function batterieLofi(total: number, rng: Rng, o: OptBatterie = {}): Evenement[] {
  const mes = o.mesure ?? 4;
  const out: Evenement[] = [];
  for (let b = 0; b < total; b += mes) {
    const kicks = pick(rng, [[0, 1.75, 2.5], [0, 2.5], [0, 0.75, 2.5, 3.25], [0, 1.5, 2.75]]);
    for (const k of kicks) out.push({ t: b + k, d: 0.4, instr: 'gc', m: 1, v: k === 0 ? 0.62 : 0.48 + gauss(rng, 0.04) });
    for (const s of [1, 3]) out.push({ t: b + s, d: 0.4, instr: chance(rng, 0.35) ? 'rim' : 'cc-balai', m: s === 1 ? 0 : 1, v: 0.5 + gauss(rng, 0.04) });
    for (let i = 0; i < mes * 4; i++) {
      const p = i / 4;
      if (chance(rng, 0.08)) continue;
      const fort = i % 2 === 0 ? (i % 4 === 0 ? 0.36 : 0.28) : 0.16;
      out.push({ t: b + p, d: 0.2, instr: 'charley-ferme', m: i % 3, v: fort + gauss(rng, 0.03) });
    }
    if (chance(rng, 0.3)) out.push({ t: b + 3.75, d: 0.2, instr: 'cc-balai', m: 2, v: 0.22 });
  }
  return out;
}

// ------------------------------------------------------------------ mélodie, ornements, chorus

/** Humanisation : un peu d'avance ou de retard, des nuances ; la première note d'une phrase un peu plus appuyée. */
export function humaniser(ev: readonly Evenement[], rng: Rng, s = 0.012, sv = 0.05): Evenement[] {
  return ev.map((e) => ({ ...e, t: Math.max(0, e.t + gauss(rng, s)), v: Math.max(0.03, Math.min(1, e.v + gauss(rng, sv))) }));
}

/** Ornements d'un deuxième passage : appoggiatures chromatiques sur les notes longues, quelques anticipations. */
export function orner(ns: readonly NoteP[], rng: Rng, p = 0.3): NoteP[] {
  const out: NoteP[] = [];
  let finPrec = -1;
  for (const x of ns) {
    if (x.d >= 1.5 && chance(rng, p)) out.push({ t: Math.max(0, x.t - 0.125), d: 0.125, m: x.m - 1, v: 0.6 });
    if (x.d <= 1 && x.t - finPrec >= 0.5 && x.t % 1 === 0 && chance(rng, p * 0.4)) out.push({ ...x, t: x.t - 0.5, d: x.d + 0.5 });
    else out.push({ ...x });
    finPrec = x.t + x.d;
  }
  return out;
}

/**
 * Chorus improvisé (main droite) : des phrases de une à trois mesures séparées de respirations ; chaque phrase s'ouvre
 * sur le motif (forme en quartes) posé sur l'accord, continue en croches dans la gamme de l'accord (notes de l'accord
 * sur les temps, approches chromatiques), et finit sur une tierce, une septième ou une neuvième tenue.
 */
export function chorus(as: readonly AccordP[], total: number, rng: Rng, o: { instr: InstrId; lo?: number; hi?: number; densite?: number; vel?: number }): Evenement[] {
  const ac = lireAccords(as);
  const lo = o.lo ?? 62;
  const hi = o.hi ?? 86;
  const out: Evenement[] = [];
  let t = pick(rng, [0, 0.5, 1]);
  let prev = 72;
  while (t < total - 1) {
    const longueur = pick(rng, [4, 4, 6, 8, 2]) * (o.densite ?? 1);
    const finPhrase = Math.min(total - 0.5, t + longueur);
    let premier = true;
    let dir = chance(rng, 0.6) ? 1 : -1;
    while (t < finPhrase - 0.5) {
      const ca = accordA(ac, t).a;
      let m: number;
      if (premier) {
        // le motif : quarte montante, pas descendant, quarte montante (en degrés de la gamme), depuis une note de l'accord
        // choisie pour que les quatre notes sonnent (aucune note à éviter, comme la onzième sur un accord majeur)
        const g = hauteursGamme(ca, lo - 12, hi + 12);
        const motifDe = (depart: number): number[] => {
          const idx = g.indexOf(depart) >= 0 ? g.indexOf(depart) : g.findIndex((x) => x >= depart);
          return [g[idx]!, g[idx + 3] ?? depart + 5, g[idx + 2] ?? depart + 4, g[idx + 5] ?? depart + 9];
        };
        const departs = [ca.tons[2]!, ca.tons[1]!, ca.tensions[0] ?? ca.tons[0]!, ca.tons[0]!].map((iv) => proche(ca.fond + iv, prev, lo, hi - 10));
        const debut = Math.floor(rng() * departs.length);
        const ordre = departs.map((_, i) => departs[(debut + i) % departs.length]!);
        const motif = motifDe(ordre.find((d) => motifDe(d).every((x) => dansAccord(ca, x, true))) ?? ordre[0]!);
        const rythme = pick(rng, [[0, 1, 2, 2.5], [0, 0.5, 1, 1.5], [0, 1, 1.5, 2]]);
        motif.forEach((x, i) => out.push({ t: t + rythme[i]!, d: i === 3 ? 1 : (rythme[i + 1]! - rythme[i]!), instr: o.instr, m: Math.min(hi, x), v: (o.vel ?? 0.6) + (i === 3 ? 0.06 : 0) }));
        t += rythme[3]! + 1;
        prev = motif[3]!;
        premier = false;
        continue;
      }
      const surTemps = Math.abs(t - Math.round(t)) < 1e-6;
      const gamme = hauteursGamme(ca, lo, hi);
      if (surTemps) {
        const tons = hauteursAccord(ca, lo, hi, true).filter((x) => (dir > 0 ? x > prev : x < prev) && Math.abs(x - prev) <= 4);
        m = tons.length ? (dir > 0 ? tons[0]! : tons[tons.length - 1]!) : prev + dir * 2;
      } else if (chance(rng, 0.25)) {
        // approche chromatique de la prochaine note de l'accord
        const cands = hauteursAccord(accordA(ac, t + 0.5).a, lo, hi);
        const cible = dir > 0 ? cands.find((x) => x > prev + 1) : [...cands].reverse().find((x) => x < prev - 1);
        m = cible !== undefined ? cible - dir : prev + dir;
      } else {
        const pas = gamme.filter((x) => (dir > 0 ? x > prev : x < prev) && Math.abs(x - prev) <= 3);
        m = pas.length ? (dir > 0 ? pas[0]! : pas[pas.length - 1]!) : prev + dir;
      }
      if (m > hi - 2) dir = -1;
      if (m < lo + 2) dir = 1;
      if (chance(rng, 0.12)) dir = -dir;
      m = Math.max(lo, Math.min(hi, m));
      const accent = !surTemps ? 0.05 : 0;
      out.push({ t, d: 0.5, instr: o.instr, m, v: (o.vel ?? 0.55) + accent + gauss(rng, 0.05) });
      prev = m;
      t += 0.5;
    }
    // fin de phrase : une note de couleur tenue
    const ca = accordA(ac, t).a;
    const couleurs = [ca.tons[1]!, ca.tons[3]!, ...(ca.tensions.length ? [ca.tensions[0]!] : [])].map((iv) => proche(ca.fond + iv, prev, lo, hi));
    const mf = couleurs.reduce((b, x) => (Math.abs(x - prev) < Math.abs(b - prev) ? x : b), couleurs[0]!);
    const df = pick(rng, [1, 1.5, 2]);
    if (t < total - 0.25) out.push({ t, d: Math.min(df, total - t), instr: o.instr, m: mf, v: (o.vel ?? 0.55) + 0.04 });
    prev = mf;
    t += df + pick(rng, [1, 1.5, 2, 2.5, 3]);
    // reprendre sur un temps ou un contretemps
    t = Math.round(t * 2) / 2;
  }
  return out.filter((e) => e.t < total);
}

/**
 * Les phrases des instruments à une voix (vents) : des notes séparées de moins de `souffle` temps se jouent d'un seul
 * souffle (la voix glisse de l'une à l'autre, ou les reprend à la langue) ; une respiration au plus tous les `max` temps.
 * Deux notes qui se chevauchent : la première s'arrête où la seconde commence. Événements triés en entrée.
 */
export function lier(ev: readonly Evenement[], mono: ReadonlySet<InstrId>, souffle = 0.6, max = 24): Evenement[] {
  const out: Evenement[] = [];
  const ouvertes = new Map<string, Evenement & { phrase: NoteV[] }>();
  for (const e of ev) {
    if (!mono.has(e.instr)) { out.push(e); continue; }
    const k = `${e.instr}|${e.couche ?? 'fond'}`;
    const ph = ouvertes.get(k);
    const der = ph?.phrase[ph.phrase.length - 1];
    if (ph && der && e.t - (ph.t + der.t + der.d) < souffle && e.t - ph.t < max) {
      if (ph.t + der.t + der.d > e.t) der.d = Math.max(0.05, e.t - ph.t - der.t);
      ph.phrase.push({ t: e.t - ph.t, d: e.d, m: e.m, v: e.v, ...(e.orn ? { orn: e.orn } : {}) });
      ph.d = e.t - ph.t + e.d;
    } else {
      const n = { ...e, phrase: [{ t: 0, d: e.d, m: e.m, v: e.v, ...(e.orn ? { orn: e.orn } : {}) }] };
      ouvertes.set(k, n);
      out.push(n);
    }
  }
  return out;
}

// ------------------------------------------------------------------ valse, guitare en quatre, soli, vents

/**
 * Valse jazz (3 temps) : ride sur chaque temps et sur le contretemps du 2 (« ding, ding-a ding »), charleston sur 2 et 3,
 * grosse caisse effleurée sur le 1, notes fantômes ; balais en option (un cercle par mesure, frappés sur 2 et 3) ;
 * relance au bout de chaque phrase de `relance` mesures.
 */
export function batterieValse(total: number, rng: Rng, o: OptBatterie & { balais?: boolean } = {}): Evenement[] {
  const it = o.intensite ?? 0.5;
  const rel = o.relance ?? 8;
  const out: Evenement[] = [];
  const v = (x: number) => Math.max(0.05, Math.min(1, x * (0.7 + it * 0.5) + gauss(rng, 0.04)));
  for (let b = 0; b < total; b++) {
    const dans = b % 3;
    const mesureN = Math.floor(b / 3);
    if (rel > 0 && (mesureN + 1) % rel === 0 && dans >= 1) {
      if (dans === 1) [0, 0.667, 1, 1.333, 1.667].forEach((p, i) => out.push({ t: b + p, d: 0.2, instr: o.balais ? 'cc-balai' : 'cc', m: i % 2, v: v(0.3 + i * 0.08), droit: true }));
      continue;
    }
    if (o.balais) {
      if (dans === 0) out.push({ t: b, d: 3, instr: 'balai', m: mesureN % 2, v: 0.3 + it * 0.2 + gauss(rng, 0.03) });
      else out.push({ t: b, d: 0.4, instr: 'cc-balai', m: dans, v: v(0.42) });
    } else {
      out.push({ t: b, d: 1, instr: 'ride', m: dans % 2, v: v(dans === 0 ? 0.58 : 0.5) });
      if (dans === 1) out.push({ t: b + 0.5, d: 0.5, instr: 'ride', m: 2, v: v(0.36) });
      if (dans > 0) out.push({ t: b, d: 0.2, instr: 'charley', m: 0, v: v(0.36) });
      if (chance(rng, 0.1 * it)) out.push({ t: b + 0.5, d: 0.2, instr: 'cc', m: 1, v: v(0.16 + rng() * 0.14) });
    }
    if (dans === 0) out.push({ t: b, d: 0.3, instr: 'gc', m: 0, v: v(0.14) });
    if (dans === 0 && mesureN > 0 && rel > 0 && mesureN % rel === 0 && !o.balais) out.push({ t: b, d: 2, instr: 'crash', m: 0, v: v(0.36) });
  }
  return out;
}

/** Contrebasse de valse : la fondamentale sur le 1 (blanche pointée, ou blanche et quinte sur le 3) ; en marche : trois noires. */
export function basseValse(as: readonly AccordP[], total: number, rng: Rng, o: OptBasse & { marche?: boolean } = {}): Evenement[] {
  if (o.marche) return basseMarche(as, total, rng, o).map((e) => ({ ...e }));
  const ac = lireAccords(as);
  const lo = o.lo ?? 28;
  const hi = o.hi ?? 50;
  const out: Evenement[] = [];
  let prev = o.depart ?? 38;
  for (let b = 0; b < total; b += 3) {
    const cur = accordA(ac, b);
    const r = proche(cur.a.basse, prev, lo, hi);
    if (chance(rng, 0.55)) out.push({ t: b, d: 2.85, instr: 'basse', m: r, v: 0.74 + gauss(rng, 0.04) });
    else {
      out.push({ t: b, d: 1.9, instr: 'basse', m: r, v: 0.74 + gauss(rng, 0.04) });
      const nx = prochainAccord(ac, b + 2.5);
      const cinq = proche(cur.a.fond + 7, r + 5, lo, hi);
      out.push({ t: b + 2, d: 0.95, instr: 'basse', m: nx.t <= b + 3 && nx.t > b ? proche(nx.a.basse, r, lo, hi) - 1 : cinq, v: 0.6 + gauss(rng, 0.04) });
    }
    prev = r;
  }
  return out;
}

/**
 * Guitare en quatre (à la manière des guitaristes d'orchestre de swing) : un accord court sur chaque temps, trois
 * notes (la basse, la tierce, la septième), un peu plus appuyé sur 2 et 4.
 */
export function guitareQuatre(as: readonly AccordP[], total: number, rng: Rng, o: { vel?: number; mesure?: number } = {}): Evenement[] {
  const ac = lireAccords(as);
  const mes = o.mesure ?? 4;
  const out: Evenement[] = [];
  for (let b = 0; b < total; b++) {
    const a = accordA(ac, b).a;
    const r = proche(a.basse, 47, 43, 52);
    const tierce = proche(a.fond + a.tons[1]!, r + 10, r + 7, r + 17);
    const sept = proche(a.fond + a.tons[3]!, tierce + 4, r + 9, r + 22);
    const accent = mes === 4 && b % 2 === 1 ? 0.05 : 0;
    for (const m of [r, Math.min(tierce, sept), Math.max(tierce, sept)]) out.push({ t: b, d: 0.32, instr: 'guitare', m, v: (o.vel ?? 0.38) + accent + gauss(rng, 0.03) });
  }
  return out;
}

/**
 * Soli : la mélodie harmonisée à `voix` voix (la mélodie en haut, les notes de l'accord serrées dessous, la deuxième
 * voix descendue d'une octave en option, « drop 2 ») ; une note de passage reçoit l'accord qui sonne.
 */
export function harmoniser(mel: readonly NoteP[], as: readonly AccordP[], o: { instr: InstrId; voix?: number; drop2?: boolean; vel?: number }): Evenement[] {
  const ac = lireAccords(as);
  const n = (o.voix ?? 4) - 1;
  const out: Evenement[] = [];
  for (const x of mel) {
    const a = accordA(ac, x.t).a;
    const pool = hauteursAccord(a, x.m - 12, x.m - 1, true).filter((m) => (((x.m - m) % 12) + 12) % 12 !== 1).reverse();
    const voix: number[] = [];
    for (const m of pool) {
      if (voix.length >= n) break;
      if (voix.some((v) => Math.abs(v - m) < 2)) continue;
      voix.push(m);
    }
    if (o.drop2 && voix.length) voix[0] = voix[0]! - 12;
    out.push({ t: x.t, d: x.d, instr: o.instr, m: x.m, v: (o.vel ?? 0.6) * (x.v ?? 1) });
    for (const m of voix) out.push({ t: x.t, d: x.d, instr: o.instr, m, v: (o.vel ?? 0.6) * (x.v ?? 1) * 0.85 });
  }
  return out;
}

/** Ornements des vents : coulé par en dessous sur une note longue après un silence, chute sur une fin de phrase longue. */
export function ornerVents(ev: readonly Evenement[], rng: Rng, o: { scoop?: number; chute?: number } = {}): Evenement[] {
  const tri = [...ev].sort((a, b) => a.t - b.t);
  return tri.map((e, i) => {
    const avant = tri[i - 1];
    const apres = tri[i + 1];
    if (e.d >= 1 && (!avant || e.t - (avant.t + avant.d) > 0.5) && chance(rng, o.scoop ?? 0.35)) return { ...e, orn: 'scoop' as const };
    if (e.d >= 1.5 && (!apres || apres.t - (e.t + e.d) >= 1.5) && chance(rng, o.chute ?? 0.12)) return { ...e, orn: 'chute' as const };
    return e;
  });
}

/** Les notes d'une partition en événements d'un instrument (nuance de base `v`). */
export const versEvenements = (ns: readonly NoteP[], instr: InstrId, v = 0.7, dt = 0): Evenement[] => ns.map((x) => ({ t: x.t + dt, d: x.d, instr, m: x.m, v: v * (x.v ?? 1) }));

/** Vérifie qu'une note est consonante avec l'accord (pour les tests de composition). */
export const consonant = (m: number, sym: string): boolean => dansAccord(accord(sym), m, true);
