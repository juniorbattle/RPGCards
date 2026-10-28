/**
 * M13 (lot MU-A) — la musique synthétisée par code : théorie, partitions, variations, générateurs, catalogue,
 * instruments calculés (accord, niveaux, déclin). Contrat `docs/m13/01_MUSIQUE.md`, §6. La session ne peut pas écouter :
 * ces tests vérifient ce qui se mesure (justesse, registres, harmonie, reproductibilité).
 */
import { describe, expect, it } from 'vitest';
import { makeRng } from '../src/game/engine/rng';
import { calculer, choisir, DEFS, plan } from '../src/son/musique/banque';
import { derouler, JINGLES, passage, VERSIONS, type VersionId } from '../src/son/musique/catalogue';
import { courbeChaleur, reponseImpulsionnelle, vinyle } from '../src/son/musique/effets';
import { basseMarche, batterieRide, chorus, comping, consonant, eviterMelodie, lireAccords, type Evenement } from '../src/son/musique/generateurs';
import * as I from '../src/son/musique/instruments';
import { QUATRE_VOIES } from '../src/son/musique/partitions';
import { accord, degre, depuisDegre, freq, midi, MODES, nomDe, pc, swinguer, transposerSym, voicer } from '../src/son/musique/theorie';
import { augmenter, changerMode, enrichir, fragment, ostinato, renverser, retrograde, substitutionTritonique, unParMesure } from '../src/son/musique/variations';

const SR = 22050;

/** Fréquence fondamentale estimée par autocorrélation sur une fenêtre après l'attaque. */
function f0Estimee(x: Float32Array, sr: number, fmin: number, fmax: number, debut = 0.15, duree = 0.25): number {
  const a = Math.round(debut * sr);
  const n = Math.round(duree * sr);
  let best = 0;
  let bestLag = 0;
  for (let lag = Math.floor(sr / fmax); lag <= Math.ceil(sr / fmin); lag++) {
    let s = 0;
    for (let i = a; i < a + n; i++) s += x[i]! * x[i + lag]!;
    if (s > best) { best = s; bestLag = lag; }
  }
  // affinage parabolique
  const r = (lag: number) => { let s = 0; for (let i = a; i < a + n; i++) s += x[i]! * x[i + lag]!; return s; };
  const y0 = r(bestLag - 1), y1 = r(bestLag), y2 = r(bestLag + 1);
  const dx = (y0 - y2) / (2 * (y0 - 2 * y1 + y2));
  return sr / (bestLag + (Number.isFinite(dx) ? dx : 0));
}
const crete = (x: Float32Array): number => x.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
const rms = (x: Float32Array, a: number, b: number): number => { let s = 0; for (let i = a; i < b; i++) s += x[i]! * x[i]!; return Math.sqrt(s / Math.max(1, b - a)); };
const cents = (f: number, g: number): number => 1200 * Math.log2(f / g);

describe('M13 — théorie', () => {
  it('hauteurs, accords, transposition', () => {
    expect([midi('C4'), midi('A4'), midi('Bb3'), midi('F#5')]).toEqual([60, 69, 58, 78]);
    expect(nomDe(70)).toBe('Bb4');
    expect(freq(69)).toBeCloseTo(440, 6);
    const a = accord('D7b9');
    expect([a.fond, a.qualite, a.gamme.includes(1)]).toEqual([2, '7b9', true]);
    expect(accord('F6/A').basse).toBe(9);
    expect(transposerSym('Bbmaj7', -4)).toBe('F#maj7');
    expect(transposerSym('C7sus4', 6)).toBe('F#7sus4');
    expect(() => accord('H7')).toThrow();
  });

  it('voicings sans fondamentale : dans la tessiture, conduits au plus court, sans fondamentale', () => {
    const grille = ['Gm7', 'C7', 'Fmaj7', 'D7b9', 'Gm7', 'C7sus4', 'Am7', 'Bbmaj7'];
    let prev: number[] | null = null;
    let mouvement = 0;
    for (const s of grille) {
      const a = accord(s);
      const v = voicer(a, prev, { lo: 50, hi: 74 });
      expect(v.length).toBe(4);
      expect(Math.min(...v)).toBeGreaterThanOrEqual(50);
      expect(Math.max(...v)).toBeLessThanOrEqual(74);
      expect(v.some((m) => pc(m) === a.fond), s).toBe(a.qualite === 'dim7' || a.qualite === 'm7b5');
      if (prev) mouvement += v.reduce((t, m, i) => t + Math.abs(m - prev![i]!), 0);
      prev = v;
    }
    // conduite des voix : en moyenne moins de 3 demi-tons par voix et par changement
    expect(mouvement / (grille.length - 1) / 4).toBeLessThan(3);
  });

  it('swing : les croches du temps placées en ternaire, les temps immobiles', () => {
    expect(swinguer(2, 0.66)).toBeCloseTo(2, 9);
    expect(swinguer(2.5, 0.66)).toBeCloseTo(2.66, 9);
    expect(swinguer(1.25, 0.6, 0.5)).toBeCloseTo(1.3, 9);
    expect(swinguer(3, 0.5)).toBe(3);
  });

  it('degrés diatoniques : aller-retour exact dans la gamme', () => {
    const g = MODES.ionien;
    for (let m = 53; m <= 89; m++) if (g.includes(pc(m - 65))) expect(depuisDegre(degre(m, 65, g), 65, g)).toBe(m);
  });
});

describe('M13 — le thème I « Les Quatre Voies »', () => {
  const d = derouler(QUATRE_VOIES);

  it('forme AABA de 32 mesures ; chaque note de la mélodie est une note de son accord ou une tension disponible', () => {
    expect(d.total).toBe(128);
    expect(d.debuts).toEqual([0, 32, 64, 96]);
    const acc = lireAccords(d.acc);
    for (const n of d.mel) {
      const a = [...acc].reverse().find((x) => x.t <= n.t + 1e-9)!;
      expect(consonant(n.m, a.a.sym), `${nomDe(n.m)} à ${n.t} sur ${a.a.sym}`).toBe(true);
    }
  });

  it('la grille couvre chaque temps, sans trou ni chevauchement', () => {
    let t = 0;
    for (const a of d.acc) { expect(a.t).toBeCloseTo(t, 9); t = a.t + a.d; }
    expect(t).toBe(128);
  });

  it('le motif des quatre voies : quarte montante, pas descendant, quarte montante ; il revient en marche sur do, ré, mi', () => {
    const m = QUATRE_VOIES.motif.map((x) => x.m);
    expect([m[1]! - m[0]!, m[2]! - m[1]!, m[3]! - m[2]!]).toEqual([5, -1, 5]);
    const a1 = QUATRE_VOIES.sections.A1!.melodie;
    for (const [t0, depart] of [[0, 'C5'], [8, 'D5'], [16, 'E5']] as const) {
      const f = a1.filter((x) => x.t >= t0 && x.t < t0 + 4).map((x) => x.m);
      expect(f[0]).toBe(midi(depart));
      expect(f[1]! - f[0]!).toBe(5);
    }
  });

  it('tessitures : mélodie au vibraphone (fa 3 à fa 6), ballade transposée au piano', () => {
    const hs = d.mel.map((x) => x.m);
    expect(Math.min(...hs)).toBeGreaterThanOrEqual(midi('F3'));
    expect(Math.max(...hs)).toBeLessThanOrEqual(midi('F6'));
  });
});

describe('M13 — variations à la Zelda', () => {
  const motif = QUATRE_VOIES.motif;
  it('à l\'envers deux fois : le thème revient ; valeurs doublées puis réduites : idem', () => {
    expect(retrograde(retrograde(motif, 4), 4)).toEqual(motif.map((x) => ({ ...x })));
    expect(augmenter(augmenter(motif, 2), 0.5)).toEqual(motif);
    expect(retrograde(motif).map((x) => x.m)).toEqual([...motif].reverse().map((x) => x.m));
  });

  it('renversé dans la gamme : les notes restent en fa majeur, et le premier intervalle s\'inverse', () => {
    const r = renverser(motif, midi('C5'), midi('F4'), 'ionien');
    for (const x of r) expect(MODES.ionien.includes(pc(x.m - 65))).toBe(true);
    expect(r[0]!.m).toBe(midi('C5'));
    expect(r[1]!.m).toBeLessThan(r[0]!.m);
  });

  it('autre mode : fa majeur → fa éolien (la devient la bémol, mi devient mi bémol)', () => {
    const e = changerMode(motif, midi('F4'), 'ionien', 'eolien').map((x) => nomDe(x.m));
    expect(e).toEqual(['C5', 'F5', 'Eb5', 'Ab5']);
  });

  it('fragment, ostinato, réharmonisation', () => {
    expect(fragment(motif, 1, 3).map((x) => x.t)).toEqual([0, 1, 1.5]);
    expect(ostinato(motif, 4, 16)).toHaveLength(16);
    expect(enrichir([{ t: 0, d: 4, sym: 'Gm7' }, { t: 4, d: 4, sym: 'C7' }]).map((a) => a.sym)).toEqual(['Gm9', 'C13']);
    expect(substitutionTritonique([{ t: 0, d: 4, sym: 'C7' }])[0]!.sym).toBe('F#7#11');
    expect(unParMesure([{ t: 0, d: 2, sym: 'Gm7' }, { t: 2, d: 2, sym: 'C7' }, { t: 4, d: 4, sym: 'F6' }], 4).map((a) => a.sym)).toEqual(['Gm7', 'F6']);
  });
});

describe('M13 — générateurs', () => {
  const d = derouler(QUATRE_VOIES);

  it('basse qui marche : une note par temps, dans la tessiture, la basse de l\'accord à chaque changement', () => {
    const rng = makeRng(5);
    const ev = basseMarche(d.acc, d.total, rng).filter((e) => e.d > 0.4);
    const acc = lireAccords(d.acc);
    expect(ev.filter((e) => Number.isInteger(e.t))).toHaveLength(128);
    for (const e of ev) { expect(e.m).toBeGreaterThanOrEqual(28); expect(e.m).toBeLessThanOrEqual(55); }
    let alaBasse = 0;
    for (const a of acc) {
      const e = ev.find((x) => Math.abs(x.t - a.t) < 1e-9)!;
      if (pc(e.m) === a.a.basse) alaBasse++;
    }
    expect(alaBasse / acc.length).toBeGreaterThan(0.8);
    // pas de grands sauts
    const sauts = ev.slice(1).map((e, i) => Math.abs(e.m - ev[i]!.m));
    expect(Math.max(...sauts)).toBeLessThanOrEqual(12);
  });

  it('comping : sous la mélodie, aucun frottement de seconde mineure avec elle (sauf sur 7b9)', () => {
    const rng = makeRng(9);
    const ev = comping(d.acc, d.total, rng, { instr: 'piano', melodie: d.mel });
    const acc = lireAccords(d.acc);
    for (const e of ev) {
      const mel = d.mel.find((x) => x.t <= e.t + 0.01 && x.t + x.d > e.t + 0.01);
      if (!mel) continue;
      const a = [...acc].reverse().find((x) => x.t <= e.t + 1e-9 + (e.t % 4 >= 3.5 ? 0.5 : 0))!;
      expect(e.m).toBeLessThan(mel.m);
      if (a.a.qualite !== '7b9') expect([1, 11]).not.toContain((((mel.m - e.m) % 12) + 12) % 12);
    }
    expect(eviterMelodie([61, 64, 67, 71], 72, accord('Cmaj7'))).toEqual([57, 60, 64, 67]);
    expect(eviterMelodie([64, 67, 71, 74], 72, accord('Cmaj7'))).toEqual([60, 62, 64, 67]);
  });

  it('batterie : ride sur les temps, charleston sur 2 et 4, relance toutes les 8 mesures', () => {
    const ev = batterieRide(64, makeRng(3), { relance: 8 });
    const charley = ev.filter((e) => e.instr === 'charley').map((e) => e.t % 4);
    expect(new Set(charley)).toEqual(new Set([1, 3]));
    expect(ev.filter((e) => e.instr === 'cc' && e.t >= 30 && e.t < 32).length).toBeGreaterThanOrEqual(3);
    expect(ev.some((e) => e.instr === 'crash' && e.t === 32)).toBe(true);
  });

  it('chorus : dans sa tessiture, des respirations, des notes de l\'accord sur les temps', () => {
    const ev = chorus(d.acc, d.total, makeRng(21), { instr: 'piano', lo: 63, hi: 86 });
    expect(ev.length).toBeGreaterThan(60);
    for (const e of ev) { expect(e.m).toBeGreaterThanOrEqual(63); expect(e.m).toBeLessThanOrEqual(86); }
    const acc = lireAccords(d.acc);
    const surTemps = ev.filter((e) => Number.isInteger(e.t));
    const bons = surTemps.filter((e) => consonant(e.m, [...acc].reverse().find((x) => x.t <= e.t + 1e-9)!.a.sym));
    expect(bons.length / surTemps.length).toBeGreaterThan(0.75);
    // au moins 15 % du temps sans note (respirations)
    const couvert = ev.reduce((s, e) => s + e.d, 0);
    expect(couvert / d.total).toBeLessThan(0.85);
  });
});

describe('M13 — catalogue', () => {
  it('les versions et quatre jingles ; passages reproductibles à graine égale, différents d\'un passage à l\'autre', () => {
    expect(Object.keys(VERSIONS)).toEqual(['I-1', 'I-2', 'I-3', 'II-1', 'II-2', 'II-3', 'III-1', 'III-2', 'IV-1', 'IV-2', 'IV-3', 'IV-4', 'V-1', 'VI-1', 'VI-2']);
    expect(Object.keys(JINGLES)).toEqual(['victoire', 'defaite', 'carte', 'chapitre']);
    for (const id of Object.keys(VERSIONS) as VersionId[]) {
      const v = VERSIONS[id];
      const a = passage(v, 0, 7);
      const b = passage(v, 0, 7);
      const c = passage(v, 1, 7);
      expect(a).toEqual(b);
      expect(JSON.stringify(a.ev)).not.toBe(JSON.stringify(c.ev));
      expect(a.ev.length).toBeGreaterThan(100);
      for (const e of a.ev) {
        expect(e.t).toBeGreaterThanOrEqual(0);
        expect(e.t).toBeLessThan(a.duree);
        expect(Number.isFinite(e.v) && e.v > 0 && e.v <= 1).toBe(true);
        expect(v.instruments.includes(e.instr) || e.instr === 'nappe', `${id} ${e.instr}`).toBe(true);
      }
    }
  });

  it('chaque note jouée tient dans les zones calculées de son instrument (pas de transposition de plus de deux demi-tons)', () => {
    const tout: Evenement[] = [];
    for (const id of Object.keys(VERSIONS) as VersionId[]) for (let p = -1; p < 4; p++) for (const chapitre of [undefined, 0, 4, 6]) tout.push(...passage(VERSIONS[id], p, 3, { chapitre }).ev);
    for (const j of Object.values(JINGLES)) tout.push(...j.ev());
    for (const e of tout) {
      const d = DEFS[e.instr];
      if (!d || d.kind !== 'notes') continue;
      expect(e.m, `${e.instr} ${nomDe(e.m)}`).toBeGreaterThanOrEqual(d.de - 2);
      expect(e.m, `${e.instr} ${nomDe(e.m)}`).toBeLessThanOrEqual(d.a + 2);
    }
  });

  it('polyphonie bornée : jamais plus de 24 notes du fond (48 toutes couches, le tutti du big band) qui commencent dans la même demi-seconde', () => {
    for (const id of Object.keys(VERSIONS) as VersionId[]) {
      const v = VERSIONS[id];
      for (const chapitre of [undefined, 0, 4, 6]) {
        const { ev } = passage(v, 1, 11, { chapitre });
        const fond = ev.filter((e) => !e.couche || e.couche === 'fond');
        const spb = 60 / v.tempo;
        // fenêtre glissante d'une demi-seconde sur les attaques triées
        const pic = (xs: readonly Evenement[]): number => {
          const ts = xs.map((x) => x.t * spb).sort((a, b) => a - b);
          let max = 0;
          for (let i = 0, j = 0; i < ts.length; i++) { while (ts[j]! < ts[i]! - 0.5 + 1e-9) j++; max = Math.max(max, i - j + 1); }
          return max;
        };
        expect(pic(fond), `${id} ${chapitre}`).toBeLessThanOrEqual(24);
        expect(pic(ev), `${id} ${chapitre}`).toBeLessThanOrEqual(48);
      }
    }
  });

  it('les variations à la volée changent la mélodie du titre sans toucher à la grille', () => {
    const v = VERSIONS['I-1'];
    const a = passage(v, 0, 1).ev.filter((e) => e.instr === 'vibra').map((e) => e.m);
    const b = passage(v, 0, 1, { melodie: 'envers' }).ev.filter((e) => e.instr === 'vibra').map((e) => e.m);
    const c = passage(v, 0, 1, { melodie: 'mineur' }).ev.filter((e) => e.instr === 'vibra').map((e) => e.m);
    expect(b).not.toEqual(a);
    expect(c).not.toEqual(a);
    expect(passage(v, 0, 1, { melodie: 'envers' }).ev.filter((e) => e.instr === 'basse')).toEqual(passage(v, 0, 1).ev.filter((e) => e.instr === 'basse'));
  });
});

describe('M13 — instruments calculés', () => {
  it('justes : la fondamentale mesurée à moins de 6 cents de la note (piano, Rhodes, vibraphone, contrebasse, guitares)', () => {
    for (const [nom, synth, notes] of [
      ['piano', I.piano, [48, 60, 72]],
      ['rhodes', I.rhodes, [52, 64, 76]],
      ['vibra', I.vibra, [60, 72, 84]],
      ['basse', I.basse, [33, 40, 48]],
      ['guitare', I.guitare, [43, 55, 67, 79]],
      ['nylon', I.nylon, [45, 57, 69, 81]],
    ] as const) {
      for (const m of notes) {
        const x = synth(SR, m, 0.6);
        const f = f0Estimee(x, SR, freq(m) * 0.8, freq(m) * 1.25);
        expect(Math.abs(cents(f, freq(m))), `${nom} ${nomDe(m)} : ${f.toFixed(2)} Hz`).toBeLessThan(6);
      }
    }
  });

  it('niveaux : crête bornée, aucune valeur non finie, une note qui s\'éteint, une couche forte plus forte', () => {
    for (const p of plan(['piano', 'rhodes', 'vibra', 'basse', 'guitare', 'nylon']).filter((_, i) => i % 5 === 0)) {
      const x = calculer(SR, p);
      expect(x.every(Number.isFinite)).toBe(true);
      expect(crete(x)).toBeLessThanOrEqual(0.95);
      expect(rms(x, x.length - 2000, x.length)).toBeLessThan(rms(x, 0, Math.round(0.2 * SR)) * 0.5);
    }
    const doux = I.piano(SR, 60, 0.38);
    const fort = I.piano(SR, 60, 0.85);
    expect(crete(fort)).toBeGreaterThan(crete(doux) * 1.3);
  });

  it('batterie : chaque coup est borné et fini, la ride dure, la charleston au pied est brève', () => {
    for (const [f, v] of [[I.ride, 0], [I.ride, 1], [I.charley, 0], [I.charleyFerme, 1], [I.gc, 0], [I.gc, 1], [I.cc, 0], [I.cc, 1], [I.ccBalai, 0], [I.balai, 1], [I.rim, 0]] as const) {
      const x = f(SR, v);
      expect(x.every(Number.isFinite)).toBe(true);
      expect(crete(x)).toBeLessThanOrEqual(0.9);
    }
    expect(I.ride(SR, 0).length / SR).toBeGreaterThan(3);
    expect(I.charley(SR, 0).length / SR).toBeLessThan(0.2);
  });

  it('choix d\'échantillon : la zone la plus proche, la couche au-dessus, la batterie par variante', () => {
    const zones = plan(['piano']).map((p) => ({ racine: p.racine, couche: p.couche }));
    const c = choisir(zones, 'piano', 61, 0.5)!;
    expect(zones[c.zone]!.couche).toBe(0.85);
    expect(Math.abs(zones[c.zone]!.racine - 61)).toBeLessThanOrEqual(2);
    expect(c.vitesse).toBeCloseTo(2 ** ((61 - zones[c.zone]!.racine) / 12), 9);
    const ride = plan(['ride']).map((p) => ({ racine: p.racine, couche: p.couche }));
    expect(choisir(ride, 'ride', 3, 0.5)!.zone).toBe(1);
  });

  it('salles, chaleur, vinyle : finis et bornés ; la réponse de la grande salle dure plus que celle du club', () => {
    const [l, r] = reponseImpulsionnelle(SR, 'club');
    expect(l.every(Number.isFinite) && r.every(Number.isFinite)).toBe(true);
    expect(reponseImpulsionnelle(SR, 'grande')[0].length).toBeGreaterThan(l.length);
    const c = courbeChaleur();
    expect(c[0]).toBeCloseTo(-1, 6);
    expect(c[c.length - 1]).toBeCloseTo(1, 6);
    expect(crete(vinyle(SR))).toBeLessThan(1.2);
  });
});
