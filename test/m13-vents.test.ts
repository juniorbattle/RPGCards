/**
 * M13 — vents et cordes en temps réel (`src/son/musique/vents.ts`) et phrases des instruments à une voix (`lier`) : ce
 * qui se vérifie sans Web Audio (le façonneur, les profils, l'articulation, le regroupement des notes). La justesse au
 * rendu est mesurée au navigateur (`tools/m13-instruments.mjs`).
 */
import { describe, expect, it } from 'vitest';
import { lier, type Evenement } from '../src/son/musique/generateurs';
import { articuler, courbe, DOMAINE, MONOPHONIQUES, PROFILS, rendement, type InstrVent } from '../src/son/musique/vents';

const IDS = Object.keys(PROFILS) as InstrVent[];

describe('M13 — vents : le façonneur et les profils', () => {
  it('la courbe passe par zéro, monte toujours, vaut 1 à la pression 1 ; le rendement suit la pression', () => {
    for (const id of IDS.filter((x) => PROFILS[x].k > 0)) {
      const c = courbe(PROFILS[id], 2049);
      expect(Math.abs(c[1024]!)).toBeLessThan(1e-6);
      for (let i = 1; i < c.length; i++) expect(c[i]!).toBeGreaterThanOrEqual(c[i - 1]!);
      expect(c[1024 + Math.round(1024 / DOMAINE)]!).toBeCloseTo(1, 2);
      expect(rendement(PROFILS[id], 1)).toBeCloseTo(1, 6);
      expect(rendement(PROFILS[id], 0.8)).toBeGreaterThan(rendement(PROFILS[id], 0.3));
    }
  });
  it('profils : la pression avec l\'éclat reste dans le domaine (aucun écrêtage) ; un passe-haut en tête (le décentrage ne laisse pas de continu) ; sections centrées', () => {
    for (const id of IDS) {
      const p = PROFILS[id];
      expect(p.pression[1] * p.eclat, id).toBeLessThanOrEqual(DOMAINE);
      expect(p.filtres[0]!.type, id).toBe('highpass');
      const v = p.voix ?? [0];
      expect(Math.abs(v.reduce((s, x) => s + x, 0) / v.length), id).toBeLessThan(1);
    }
    expect([...MONOPHONIQUES].sort()).toEqual(['flute', 'sax', 'trompette']);
  });
  it('articulation : liée si la note suit à moins de 30 ms, sinon reprise à la langue', () => {
    const p = articuler([{ t: 0, d: 0.5, m: 60, v: 0.7 }, { t: 0.5, d: 0.25, m: 62, v: 0.7 }, { t: 0.8, d: 0.2, m: 64, v: 0.7 }]);
    expect(p.articulations).toEqual(['premiere', 'liee', 'detachee']);
    expect(p.fin).toBeCloseTo(1, 9);
  });
});

describe('M13 — phrases des instruments à une voix', () => {
  const e = (t: number, d: number, m: number, instr: Evenement['instr'] = 'sax', x: Partial<Evenement> = {}): Evenement => ({ t, d, instr, m, v: 0.7, ...x });
  it('des notes proches forment une phrase ; un silence d\'au moins 0,6 temps ouvre la suivante ; les autres instruments passent', () => {
    const r = lier([e(0, 1, 60), e(0, 1, 40, 'basse'), e(1, 0.5, 62), e(1.6, 1, 64), e(3.4, 1, 65)], MONOPHONIQUES);
    const sax = r.filter((x) => x.instr === 'sax');
    expect(sax.length).toBe(2);
    expect(sax[0]!.phrase!.map((n) => n.m)).toEqual([60, 62, 64]);
    expect(sax[0]!.phrase!.map((n) => n.t)).toEqual([0, 1, 1.6]);
    expect(sax[0]!.d).toBeCloseTo(2.6, 9);
    expect(sax[1]!.phrase!.length).toBe(1);
    expect(r.filter((x) => x.instr === 'basse').length).toBe(1);
  });
  it('deux notes qui se chevauchent : la première s\'arrête où la seconde commence ; couches séparées ; respiration au plus tous les 24 temps', () => {
    const r = lier([e(0, 2, 60), e(1, 1, 62)], MONOPHONIQUES);
    expect(r[0]!.phrase!.map((n) => n.d)).toEqual([1, 1]);
    const c = lier([e(0, 1, 60), e(1, 1, 62, 'sax', { couche: 'melodie' })], MONOPHONIQUES);
    expect(c.length).toBe(2);
    const long = lier(Array.from({ length: 40 }, (_, i) => e(i, 1, 60 + (i % 5))), MONOPHONIQUES);
    expect(long.length).toBe(2);
    expect(long[0]!.phrase!.length).toBe(24);
  });
  it('les ornements suivent la note dans la phrase ; les entrées ne sont pas modifiées', () => {
    const src = [e(0, 1, 60, 'trompette', { orn: 'scoop' }), e(1, 2, 62, 'trompette', { orn: 'chute' })];
    const copie = JSON.parse(JSON.stringify(src));
    const r = lier(src, MONOPHONIQUES);
    expect(r[0]!.phrase!.map((n) => n.orn)).toEqual(['scoop', 'chute']);
    expect(src).toEqual(copie);
  });
});
