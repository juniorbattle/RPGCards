/**
 * Passe 200 : la fluidité. L'amorti de la caméra part et s'arrête en douceur sans jamais dépasser sa cible ; le rideau et
 * les fondus gardent des durées qui se lisent. La continuité à l'écran se mesure au navigateur (`tools/m14-fluidite.mjs`).
 */
import { describe, expect, it } from 'vitest';
import { FONDUS, resteTenue } from '../src/aventure/rideau';
import { amortir } from '../src/ville/cameras';

const parcours = (tau: number, dt: number, duree: number, depart = 0, cible = 10): number[] => {
  const xs = [depart];
  let x = depart;
  let v = 0;
  for (let t = 0; t < duree; t += dt) { [x, v] = amortir(x, cible, v, tau, dt); xs.push(x); }
  return xs;
};

describe('amorti de la caméra', () => {
  it('part en douceur : la vitesse monte, là où l’amorti exponentiel partait à plein régime', () => {
    const xs = parcours(0.55, 1 / 60, 1);
    const premier = xs[1]! - xs[0]!;
    const dixieme = xs[10]! - xs[9]!;
    const expo = 10 * (1 - Math.exp(-(1 / 60) / 0.55));
    expect(premier).toBeLessThan(expo / 3);
    expect(dixieme).toBeGreaterThan(premier * 3);
  });

  it('s’arrête en douceur, sans jamais dépasser sa cible', () => {
    const xs = parcours(0.55, 1 / 60, 4);
    for (const x of xs) expect(x).toBeLessThanOrEqual(10);
    for (let i = 1; i < xs.length; i++) expect(xs[i]!).toBeGreaterThanOrEqual(xs[i - 1]!);
    expect(xs.at(-1)!).toBeCloseTo(10, 3);
    const n = xs.length;
    expect(xs[n - 1]! - xs[n - 2]!).toBeLessThan(0.001);
  });

  it('ne s’emballe sur aucune image longue', () => {
    for (const dt of [1 / 144, 1 / 60, 1 / 20, 0.25, 1]) for (const x of parcours(0.32, dt, 6)) expect(Math.abs(x)).toBeLessThanOrEqual(10);
  });

  it('suit une cible en mouvement avec le retard de l’amorti d’avant (tau × vitesse)', () => {
    let x = 0;
    let v = 0;
    const dt = 1 / 60;
    const vitesse = 3;
    let cible = 0;
    for (let i = 0; i < 600; i++) { cible += vitesse * dt; [x, v] = amortir(x, cible, v, 0.32, dt); }
    expect(cible - x).toBeCloseTo(0.32 * vitesse, 1);
  });

  it('une cible atteinte reste immobile', () => {
    expect(amortir(4, 4, 0, 0.32, 1 / 60)).toEqual([4, 0]);
  });
});

describe('fondus', () => {
  it('fermer est plus court qu’ouvrir, marcher plus court que le récit', () => {
    expect(FONDUS.fermer).toBeLessThan(FONDUS.ouvrir);
    expect(FONDUS.voyage).toBeLessThan(FONDUS.fermer);
    expect(FONDUS.voyageOuvrir).toBeLessThan(FONDUS.ouvrir);
    expect(FONDUS.passer).toBeLessThan(FONDUS.voyage);
  });

  it('aucun fondu ne se réduit à un clignement, aucun ne fait attendre', () => {
    for (const d of Object.values(FONDUS)) { expect(d).toBeGreaterThanOrEqual(180); expect(d).toBeLessThanOrEqual(1000); }
  });

  it('le noir se tient un souffle, une seule fois', () => {
    expect(resteTenue(1000, 1000)).toBe(FONDUS.tenue);
    expect(resteTenue(1000, 1100)).toBe(FONDUS.tenue - 100);
    expect(resteTenue(1000, 1000 + FONDUS.tenue + 500)).toBe(0);
  });
});
