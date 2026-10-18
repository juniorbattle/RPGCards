/**
 * Repli automatique du post-traitement (amendement de l’ADR 019) : règles pures, nourries d’intervalles
 * requestAnimationFrame synthétiques (écran à 165, 120 et 60 Hz ; rendu sain, ralenti, saccadé, à-coups isolés).
 */
import { describe, expect, it } from 'vitest';
import { PostFallback, type PostLevel } from '../src/scene/postFallback';

const HZ165 = 1000 / 165;
const HZ120 = 1000 / 120;
const HZ60 = 1000 / 60;

/** Donne à `gov` des intervalles `ms(i)` pendant `durationMs` d’images ; rend les crans franchis (instant en ms). */
function feed(gov: PostFallback, ms: (i: number) => number, durationMs: number, t0 = 0): Array<{ t: number; to: PostLevel }> {
  const out: Array<{ t: number; to: PostLevel }> = [];
  let t = t0;
  for (let i = 0; t < t0 + durationMs; i++) {
    const d = ms(i);
    t += d;
    const to = gov.frame(d);
    if (to) out.push({ t, to });
  }
  return out;
}

/** Une image sur `every` prend `k` fois l’intervalle de l’écran (images manquées), les autres arrivent à l’heure. */
const jank = (period: number, every: number, k: number) => (i: number) => (i % every === every - 1 ? k * period : period);

describe('repli automatique du post-traitement', () => {
  it('rendu sain à 165 Hz : aucun cran, rythme nominal retrouvé', () => {
    const gov = new PostFallback('full', true);
    expect(feed(gov, () => HZ165, 120_000)).toEqual([]);
    const st = gov.state();
    expect(st.level).toBe('full');
    expect(st.nominalMs).toBeCloseTo(HZ165, 1);
    expect(st.slice?.bad).toBeNull();
    expect(st.steps).toEqual([]);
  });

  it('rendu sain avec des à-coups rares (1 image sur 100 manquée) : aucun cran', () => {
    const gov = new PostFallback('full', true);
    expect(feed(gov, jank(HZ165, 100, 3), 120_000)).toEqual([]);
  });

  it('rendu durablement deux fois plus lent que l’écran : halo coupé après 3 s, puis rendu direct (raison : médiane)', () => {
    const gov = new PostFallback('full', true);
    expect(feed(gov, () => HZ165, 5000)).toEqual([]);
    const steps = feed(gov, () => 2 * HZ165, 20_000, 5000);
    expect(steps.map((s) => s.to)).toEqual(['nobloom', 'direct']);
    // Trois tranches d’une seconde mauvaises, puis une tranche d’observation et trois nouvelles tranches.
    expect(steps[0]!.t).toBeGreaterThan(7900);
    expect(steps[0]!.t).toBeLessThan(8100);
    expect(steps[1]!.t - steps[0]!.t).toBeGreaterThan(3900);
    expect(steps[1]!.t - steps[0]!.t).toBeLessThan(4100);
    const st = gov.state();
    expect(st.steps.map((s) => [s.from, s.to, s.reason])).toEqual([['full', 'nobloom', 'median'], ['nobloom', 'direct', 'median']]);
    expect(st.steps[0]!.nominalMs).toBeCloseTo(HZ165, 1);
    expect(st.steps[0]!.medianMs).toBeCloseTo(2 * HZ165, 1);
  });

  it('GPU intégré ralenti (passe 18) : médiane au rythme de l’écran, une image sur dix à 18,2 ms → crans (raison : retards)', () => {
    const gov = new PostFallback('full', true);
    const steps = feed(gov, jank(HZ165, 10, 3), 20_000);
    expect(steps.map((s) => s.to)).toEqual(['nobloom', 'direct']);
    const st = gov.state();
    expect(st.steps.every((s) => s.reason === 'late')).toBe(true);
    expect(st.steps[0]!.medianMs).toBeCloseTo(HZ165, 1);
    expect(st.steps[0]!.lateShare).toBeGreaterThanOrEqual(0.05);
  });

  it('le repli suffit : après le premier cran, un rendu redevenu sain ne descend pas plus bas', () => {
    const gov = new PostFallback('full', true);
    feed(gov, () => HZ165, 5000);
    const first = feed(gov, () => 2 * HZ165, 4000, 5000);
    expect(first.map((s) => s.to)).toEqual(['nobloom']);
    expect(feed(gov, () => HZ165, 60_000, 9000)).toEqual([]);
    expect(gov.current).toBe('nobloom');
  });

  it('jamais de remontée pendant un duel, même après une minute de rendu sain', () => {
    const gov = new PostFallback('full', true);
    feed(gov, () => HZ165, 5000);
    feed(gov, () => 2 * HZ165, 15_000, 5000);
    expect(gov.current).toBe('direct');
    expect(feed(gov, () => HZ165, 60_000, 20_000)).toEqual([]);
    expect(gov.current).toBe('direct');
    expect(gov.state().steps).toHaveLength(2);
  });

  it('des à-coups isolés (une seconde très saccadée toutes les cinq) ne suffisent pas : trois tranches mauvaises consécutives', () => {
    const gov = new PostFallback('full', true);
    feed(gov, () => HZ165, 5000);
    // Une seconde où une image sur trois manque trois intervalles d’écran, puis quatre secondes saines, dix fois :
    // la seconde saccadée touche au plus deux tranches.
    let t = 5000;
    for (let k = 0; k < 10; k++) {
      expect(feed(gov, jank(HZ165, 3, 4), 1000, t)).toEqual([]);
      t += 1000;
      expect(feed(gov, () => HZ165, 4000, t)).toEqual([]);
      t += 4000;
    }
    expect(gov.current).toBe('full');
  });

  it('saccades durables par intermittence (deux secondes sur trois) : crans', () => {
    const gov = new PostFallback('full', true);
    feed(gov, () => HZ165, 5000);
    let t = 5000;
    const steps: PostLevel[] = [];
    for (let k = 0; k < 10; k++) {
      steps.push(...feed(gov, jank(HZ165, 3, 4), 2000, t).map((s) => s.to));
      t += 2000;
      steps.push(...feed(gov, () => HZ165, 1000, t).map((s) => s.to));
      t += 1000;
    }
    expect(steps[0]).toBe('nobloom');
  });

  it('mise en place du duel (deux premières secondes saccadées) : non jugée', () => {
    const gov = new PostFallback('full', true);
    expect(feed(gov, jank(HZ165, 2, 6), 2000)).toEqual([]);
    expect(feed(gov, () => HZ165, 30_000, 2000)).toEqual([]);
    expect(gov.current).toBe('full');
  });

  it('écran à 60 Hz : 60 images/s tenues sans cran ; images manquées (33 ms) répétées → crans', () => {
    const ok = new PostFallback('full', true);
    expect(feed(ok, () => HZ60, 60_000)).toEqual([]);
    expect(ok.state().nominalMs).toBeCloseTo(HZ60, 1);
    const slow = new PostFallback('full', true);
    expect(feed(slow, jank(HZ60, 8, 2), 20_000).map((s) => s.to)).toEqual(['nobloom', 'direct']);
  });

  it('écran à 120 Hz : deux intervalles d’écran (16,7 ms) de temps en temps ne sont pas des retards ; tout le temps, si', () => {
    const occasional = new PostFallback('full', true);
    expect(feed(occasional, jank(HZ120, 8, 2), 30_000)).toEqual([]);
    const always = new PostFallback('full', true);
    feed(always, () => HZ120, 5000);
    expect(feed(always, () => 2 * HZ120, 20_000, 5000).map((s) => s.to)).toEqual(['nobloom', 'direct']);
  });

  it('un poste régulier mais plus lent que l’écran dès le début n’est pas pris pour un décrochage (nominal mesuré)', () => {
    const gov = new PostFallback('full', true);
    expect(feed(gov, () => 2 * HZ165, 30_000)).toEqual([]);
    expect(gov.state().nominalMs).toBeCloseTo(2 * HZ165, 1);
  });

  it('trous (onglet masqué, boucle arrêtée) ignorés', () => {
    const gov = new PostFallback('full', true);
    feed(gov, () => HZ165, 3000);
    for (let i = 0; i < 20; i++) expect(gov.frame(5000)).toBeNull();
    expect(feed(gov, () => HZ165, 30_000, 3000)).toEqual([]);
    expect(gov.current).toBe('full');
  });

  it('nouveau duel (menus) : niveau de départ, nominal remesuré (autre écran), historique remis à zéro', () => {
    const gov = new PostFallback('full', true);
    feed(gov, () => HZ165, 3000);
    feed(gov, () => HZ60, 15_000, 3000); // fenêtre glissée sur un écran à 60 Hz pendant le duel : faux décrochage
    expect(gov.current).toBe('direct');
    gov.reset();
    let st = gov.state();
    expect(st).toMatchObject({ level: 'full', nominalMs: null, slice: null, steps: [], runs: 2 });
    expect(feed(gov, () => HZ60, 60_000)).toEqual([]);
    st = gov.state();
    expect(st.level).toBe('full');
    expect(st.nominalMs).toBeCloseTo(HZ60, 1);
  });

  it('halo déjà retiré (ablation QA) : le premier cran est le rendu direct', () => {
    const gov = new PostFallback('nobloom', true);
    feed(gov, () => HZ165, 5000);
    expect(feed(gov, () => 2 * HZ165, 15_000, 5000).map((s) => s.to)).toEqual(['direct']);
  });

  it('repli désactivé ou niveau imposé : rien n’est décidé, l’état le dit', () => {
    const off = new PostFallback('full', false);
    expect(feed(off, () => 3 * HZ165, 30_000)).toEqual([]);
    expect(off.state()).toMatchObject({ level: 'full', auto: false, nominalMs: null, steps: [] });
    const forced = new PostFallback('direct', false);
    forced.reset();
    expect(forced.current).toBe('direct');
  });
});
