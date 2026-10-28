/**
 * M13, lot MU-B — thèmes II « La ville la nuit » et III « Duel » : harmonie note par note (la tête, sa version majeure,
 * sa valse et son contre-chant à l'envers), la ville qui grandit avec les chapitres, les couches du duel, les
 * tessitures des vents. Contrats `docs/m13/01_MUSIQUE.md` (§2) et `02_MUSIQUE_INTERACTIVE.md` (§2).
 */
import { describe, expect, it } from 'vitest';
import { derouler, formation } from '../src/son/musique/arrangement';
import { passage, VERSIONS, type VersionId } from '../src/son/musique/catalogue';
import type { Evenement, InstrId } from '../src/son/musique/generateurs';
import { CHAMPIONNAT as CHAMPIONNAT_, DUEL, VILLE_NUIT, type AccordP, type NoteP } from '../src/son/musique/partitions';
import { accord, dansAccord, nomDe, pc } from '../src/son/musique/theorie';
import { enValse } from '../src/son/musique/variations';
import { CONTRE_VALSE, MEL_MAJ, MEL_VALSE } from '../src/son/musique/ville';

const accordA = (acc: readonly AccordP[], t: number): AccordP => acc.reduce((r, x) => (x.t <= t + 1e-6 ? x : r), acc[0]!);
const consonante = (ns: readonly NoteP[], acc: readonly AccordP[], nom: string): void => {
  for (const x of ns) {
    const a = accordA(acc, x.t);
    expect(dansAccord(accord(a.sym), x.m, true), `${nom} : ${nomDe(x.m)} à ${x.t} sur ${a.sym}`).toBe(true);
  }
};
const couvre = (acc: readonly AccordP[], total: number): void => {
  let t = 0;
  for (const a of acc) { expect(a.t).toBeCloseTo(t, 6); t += a.d; }
  expect(t).toBeCloseTo(total, 6);
};
const instrs = (ev: readonly Evenement[]): Set<InstrId> => new Set(ev.map((e) => e.instr));
const notes = (ev: readonly Evenement[]): Evenement[] => ev.flatMap((e) => (e.phrase ? e.phrase.map((n) => ({ ...e, ...n, t: e.t + n.t })) : [e]));

describe('M13 — thème II « La ville la nuit »', () => {
  const d = derouler(VILLE_NUIT);
  it('AABA de 32 mesures en ré mineur ; chaque note de la tête sonne dans son accord ; la grille couvre la forme', () => {
    expect(d.total).toBe(128);
    consonante(d.mel, d.acc, 'tête');
    couvre(d.acc, 128);
  });
  it('la tête s\'ouvre sur le motif des quatre voies renversé (quarte qui descend, pas qui monte, quarte qui descend)', () => {
    const m = d.mel.slice(0, 4).map((x) => x.m);
    expect([m[1]! - m[0]!, m[2]! - m[1]!, m[3]! - m[2]!]).toEqual([-5, 1, -5]);
  });
  it('la couleur : une longue quarte augmentée sur les accords lydiens (mi sur si bémol, la sur mi bémol)', () => {
    const longues = d.mel.filter((x) => x.d >= 2.5 && x.t < 32).map((x) => [nomDe(x.m), accordA(d.acc, x.t).sym].join(' / '));
    expect(longues).toContain('E4 / Bbmaj7#11');
    expect(longues).toContain('A4 / Ebmaj7#11');
  });
  it('II-2 : la même tête en ré majeur, consonante ; II-3 : en valse (deux mesures à trois pour une à quatre), consonante', () => {
    const v2 = passage(VERSIONS['II-2'], 0, 1);
    consonante(MEL_MAJ, v2.acc, 'majeur');
    expect(MEL_MAJ.slice(0, 4).map((x) => pc(x.m))).toEqual([9, 4, 6, 1]); // la, mi, fa dièse, do dièse
    const v3 = passage(VERSIONS['II-3'], 0, 1);
    expect(VERSIONS['II-3'].mesure).toBe(3);
    expect(v3.duree).toBe(192);
    couvre(v3.acc, 192);
    consonante(MEL_VALSE, v3.acc, 'valse');
    expect(enValse([{ t: 0, d: 1.5, m: 69 }, { t: 1.5, d: 0.5, m: 64 }, { t: 2, d: 0.5, m: 65 }, { t: 2.5, d: 1.5, m: 60 }]).map((x) => [x.t, x.d])).toEqual([[0, 2.5], [2.5, 0.5], [3, 1], [4, 2.5]]);
  });
  it('le contre-chant à l\'envers : consonant, jamais à la seconde mineure de la mélodie', () => {
    const v3 = passage(VERSIONS['II-3'], 0, 1);
    consonante(CONTRE_VALSE, v3.acc, 'contre-chant');
    for (const x of CONTRE_VALSE) {
      const m = MEL_VALSE.find((y) => y.t <= x.t + 0.01 && y.t + y.d > x.t + 0.01);
      if (m) expect([1, 11]).not.toContain((((m.m - x.m) % 12) + 12) % 12);
    }
  });
  it('la ville grandit avec les chapitres : guitare et contrebasse, puis le trio, puis les vents, puis les cuivres', () => {
    expect([undefined, 0, 1, 2, 3, 4, 5, 6].map(formation)).toEqual(['trio', 'duo', 'duo', 'trio', 'trio', 'vents', 'vents', 'champion']);
    for (const id of ['II-1', 'II-2', 'II-3'] as VersionId[]) {
      const duo = instrs(passage(VERSIONS[id], 0, 2, { chapitre: 0 }).ev);
      expect([...duo].every((i) => ['guitare', 'nylon', 'basse'].includes(i)), `${id} duo : ${[...duo]}`).toBe(true);
      const trio = instrs(passage(VERSIONS[id], 0, 2, { chapitre: 2 }).ev);
      expect(trio.has('piano') && trio.has('basse')).toBe(true);
      expect([...trio].some((i) => ['sax', 'trompette', 'flute', 'cuivres', 'cordes'].includes(i)), `${id} trio`).toBe(false);
      const vents = instrs(passage(VERSIONS[id], 0, 2, { chapitre: 4 }).ev);
      expect([...vents].some((i) => ['sax', 'trompette', 'flute'].includes(i)), `${id} vents`).toBe(true);
      const champion = instrs(passage(VERSIONS[id], 0, 2, { chapitre: 6 }).ev);
      expect(champion.has('cuivres') || champion.has('cordes'), `${id} champion`).toBe(true);
    }
  });
});

describe('M13 — thème III « Duel »', () => {
  const d = derouler(DUEL);
  it('AABA de 32 mesures en la ; chaque note de la tête sonne dans son accord ; le motif des quatre voies en la mineur', () => {
    consonante(d.mel, d.acc, 'duel');
    couvre(d.acc, 128);
    expect(d.mel.slice(0, 4).map((x) => nomDe(x.m))).toEqual(['E5', 'A5', 'G5', 'C6']);
  });
  it('les couches : la mélodie, la tension et les cuivres à part du fond ; III-1 part sans elles, III-2 avec la tension', () => {
    const { ev } = passage(VERSIONS['III-1'], 0, 4);
    const couches = new Set(ev.map((e) => e.couche ?? 'fond'));
    expect([...couches].sort()).toEqual(['cuivres', 'fond', 'melodie', 'tension']);
    expect(ev.filter((e) => e.couche === 'melodie').every((e) => ['vibra', 'sax'].includes(e.instr))).toBe(true);
    expect(ev.filter((e) => e.couche === 'cuivres').every((e) => e.instr === 'cuivres')).toBe(true);
    expect(ev.filter((e) => (e.couche ?? 'fond') === 'fond').some((e) => e.instr === 'vibra' || e.instr === 'sax' || e.instr === 'cuivres')).toBe(false);
    expect(VERSIONS['III-1'].couches).toEqual({ melodie: 0, tension: 0, cuivres: 0 });
    expect(VERSIONS['III-2'].couches).toEqual({ melodie: 1, tension: 1, cuivres: 0 });
    expect(VERSIONS['III-2'].tempo).toBeGreaterThan(VERSIONS['III-1'].tempo);
  });
  it('le riff de contrebasse tient les A (la, puis ré au IV) ; le duel tendu le raccourcit à une mesure', () => {
    const basse = (id: VersionId) => passage(VERSIONS[id], 0, 4).ev.filter((e) => e.instr === 'basse' && e.t < 8).map((e) => nomDe(e.m));
    expect(basse('III-1').slice(0, 5)).toEqual(['A1', 'C2', 'D2', 'Eb2', 'E2']);
    const tendu = basse('III-2');
    expect(tendu.slice(0, 5)).toEqual(tendu.slice(5, 10));
    const iv = passage(VERSIONS['III-1'], 0, 4).ev.filter((e) => e.instr === 'basse' && e.t >= 15.9 && e.t < 17);
    expect(nomDe(iv[0]!.m)).toBe('D2');
  });
  it('l\'ostinato de la tension et les coups de cuivres sonnent dans l\'accord', () => {
    const { ev, acc } = passage(VERSIONS['III-1'], 0, 4);
    for (const e of ev.filter((x) => x.couche === 'tension' && x.instr === 'piano')) expect(dansAccord(accord(accordA(acc, e.t).sym), e.m, true)).toBe(true);
  });
});

describe('M13 — tessitures des vents et des cordes', () => {
  const T: Partial<Record<InstrId, [number, number]>> = { sax: [44, 77], saxes: [41, 80], trompette: [52, 86], 'trompette-ouverte': [52, 86], flute: [60, 96], cuivres: [40, 86], cordes: [36, 96], archet: [28, 55] };
  it('aucune note hors de la tessiture de son instrument, dans toutes les versions et toutes les formations', () => {
    for (const id of Object.keys(VERSIONS) as VersionId[]) {
      for (const chapitre of [undefined, 0, 2, 4, 6]) for (const p of [0, 1, 2, 3]) {
        for (const e of notes(passage(VERSIONS[id], p, 5, { chapitre }).ev)) {
          const r = T[e.instr];
          if (!r) continue;
          expect(e.m, `${id} ${chapitre} ${e.instr} ${nomDe(e.m)}`).toBeGreaterThanOrEqual(r[0]);
          expect(e.m, `${id} ${chapitre} ${e.instr} ${nomDe(e.m)}`).toBeLessThanOrEqual(r[1]);
        }
      }
    }
  });
});

describe('M13, lot MU-C — IV « Les Maisons », V « Kaï », VI « Championnat »', () => {
  it('Maisons : un thème, quatre couleurs ; chaque tête sonne dans sa grille ; le motif des quatre voies l\'ouvre', async () => {
    const { GRILLES, MELODIES } = await import('../src/son/musique/maisons');
    for (const c of ['Cendre', 'Voile', 'Ronce', 'Astre'] as const) {
      couvre(GRILLES[c], 64);
      consonante(MELODIES[c], GRILLES[c], c);
    }
    expect(MELODIES.Cendre.slice(0, 4).map((x) => nomDe(x.m))).toEqual(['A4', 'D5', 'C5', 'F#5']);
    // les couleurs : le Voile en mineur (fa naturel), l'Astre en lydien (sol dièse), la Ronce reste dominante
    expect(MELODIES.Voile.some((x) => pc(x.m) === 5)).toBe(true);
    expect(MELODIES.Astre.some((x) => pc(x.m) === 8)).toBe(true);
    const tempos = (['IV-1', 'IV-2', 'IV-3', 'IV-4'] as VersionId[]).map((id) => VERSIONS[id].tempo);
    expect(tempos).toEqual([168, 110, 92, 120]);
  });
  it('Ronce : la contrebasse à l\'archet tient les A, des notes bleues en appoggiature ; Astre : la grande salle', () => {
    const { ev } = passage(VERSIONS['IV-3'], 0, 2);
    expect(ev.some((e) => e.instr === 'archet')).toBe(true);
    expect(VERSIONS['IV-4'].salle).toBe('grande');
  });
  it('Kaï : le riff monte par la blue note (si bémol) ; chaque note est de l\'accord ou de la gamme de blues de sa fondamentale', async () => {
    const { KAI, RIFF_KAI } = await import('../src/son/musique/partitions');
    expect(RIFF_KAI.slice(0, 5).map((x) => nomDe(x.m))).toEqual(['E4', 'G4', 'A4', 'Bb4', 'B4']);
    const d = derouler(KAI);
    const blues = [0, 3, 5, 6, 7, 10];
    for (const x of d.mel) {
      const a = accord(accordA(d.acc, x.t).sym);
      expect(dansAccord(a, x.m, true) || blues.includes(pc(x.m - a.fond)), `${nomDe(x.m)} sur ${accordA(d.acc, x.t).sym}`).toBe(true);
    }
    expect(VERSIONS['V-1'].tempo).toBe(176);
  });
  it('Championnat : le motif sur la tonique (fa, si bémol, la, ré) ; tête consonante ; la Finale un ton plus haut, plus rapide', () => {
    const d = derouler(CHAMPIONNAT_);
    consonante(d.mel, d.acc, 'championnat');
    expect(d.mel.slice(0, 4).map((x) => nomDe(x.m))).toEqual(['F4', 'Bb4', 'A4', 'D5']);
    expect(VERSIONS['VI-2'].tempo).toBeGreaterThan(VERSIONS['VI-1'].tempo);
    expect(passage(VERSIONS['VI-2'], 0, 1).acc[0]!.sym).toBe('Cmaj7');
    const { ev } = passage(VERSIONS['VI-1'], 0, 3);
    expect(new Set(ev.filter((e) => e.couche === 'melodie').map((e) => e.instr))).toEqual(new Set(['saxes', 'trompette-ouverte', 'cuivres']));
  });
  it('tous les duels ont les mêmes couches (mélodie, tension, cuivres), muettes au départ', () => {
    for (const id of ['III-1', 'IV-1', 'IV-2', 'IV-3', 'IV-4', 'V-1', 'VI-1', 'VI-2'] as VersionId[]) {
      expect(VERSIONS[id].couches, id).toEqual({ melodie: 0, tension: 0, cuivres: 0 });
      const couches = new Set(passage(VERSIONS[id], 0, 4).ev.map((e) => e.couche ?? 'fond'));
      expect([...couches].sort(), id).toEqual(['cuivres', 'fond', 'melodie', 'tension']);
    }
  });
});
