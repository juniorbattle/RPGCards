/**
 * M11 — cinématiques runtime (`docs/m11/07_CINEMATIQUES.md`, ADR 043) : choix des plans (arrivée dans un quartier, Kaï,
 * guetteur), interpolation des travellings, réglage et permission par l'adresse, mémoire des arrivées ; réglages de
 * caméra pour une image (`CameraRig.update`, `tuning`), sans toucher ceux de l'îlot.
 */
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { adoucir, arriveeAJouer, cadrageDuo, cinePermise, CLE_CINE, DUREES, ecrireCine, entre, LIGNES_LIEU, lireCine, plansArrivee, plansGuetteur, plansRival } from '../src/aventure/cinematiques';
import { createRig, framingFor, RIGS } from '../src/ville/cameras';
import { ILOTS_RANGS } from '../src/ville/ilots';

describe('M11 — cinématiques : les plans', () => {
  it('arrivée : part du côté de la rue opposé au joueur, traverse jusqu’à lui, revient au cadrage ordinaire', () => {
    const b = { minX: -12, maxX: 12 };
    const g = plansArrivee({ x: -9, z: 1 }, b);
    expect(g.map((p) => p.mouvement)).toEqual(['coupe', 'travelling', 'glisse']);
    expect(g[0]!.at).toEqual({ x: 12, z: 1 });
    expect(g[1]!.at).toEqual({ x: -9, z: 1 });
    expect(g[0]!.zoom).toBeGreaterThan(1);
    expect(g[2]!.zoom ?? 1).toBe(1);
    expect(plansArrivee({ x: 7, z: 0 }, b)[0]!.at.x).toBe(-12);
    // joueur au-delà des bornes de la caméra (bout du Quai) : le travelling s'arrête à la borne
    const loin = plansArrivee({ x: -17.4, z: 1.2 }, b);
    expect(loin[0]!.at.x).toBe(12);
    expect(loin[1]!.at).toEqual({ x: -12, z: 1.2 });
    expect(loin[2]!.at).toEqual({ x: -17.4, z: 1.2 });
    expect(g.reduce((s, p) => s + p.ms, 0)).toBe(DUREES.arriveeTenue + DUREES.arriveeTravelling + DUREES.arriveeRetour);
  });

  it('deux personnages : le milieu, plus près quand ils sont proches, jamais plus loin que le cadrage ordinaire', () => {
    const d = cadrageDuo({ x: 0, z: 0 }, { x: 2, z: 0 });
    expect(d.at).toEqual({ x: 1, z: 0 });
    expect(d.zoom).toBeLessThan(1);
    expect(cadrageDuo({ x: 0, z: 0 }, { x: 30, z: 0 }).zoom).toBe(1);
    expect(cadrageDuo({ x: 0, z: 0 }, { x: 0, z: 0 }).zoom).toBeGreaterThanOrEqual(0.66);
  });

  it('Kaï : la caméra se porte sur lui tout près pendant la bulle, puis prend les deux ; le guetteur : un plan court', () => {
    const [point, duo] = plansRival({ x: 4, z: 0 }, { x: 1.2, z: 0 }, { x: 0, z: 0 }, 800);
    expect(point!.at).toEqual({ x: 4, z: 0 });
    expect(point!.ms).toBe(800);
    expect(point!.zoom).toBeLessThan(duo!.zoom!);
    expect(duo!.at).toEqual({ x: 0.6, z: 0 });
    expect(duo!.mouvement).toBe('glisse');
    const g = plansGuetteur({ x: 1, z: 0 }, { x: 0, z: 0 });
    expect(g).toHaveLength(1);
    expect(g[0]!.ms).toBe(0);
  });

  it('travelling : adouci aux deux bouts, exact aux extrémités', () => {
    expect(adoucir(0)).toBe(0);
    expect(adoucir(1)).toBe(1);
    expect(adoucir(0.5)).toBeCloseTo(0.5, 10);
    expect(adoucir(0.1)).toBeLessThan(0.1);
    expect(adoucir(2)).toBe(1);
    const a = { at: { x: -10, z: 0 }, zoom: 1.2, hauteur: 0.6, mouvement: 'coupe' as const, ms: 0 };
    const b = { at: { x: 6, z: 2 }, mouvement: 'travelling' as const, ms: 1000 };
    expect(entre(a, b, 0)).toEqual({ at: { x: -10, z: 0 }, zoom: 1.2, hauteur: 0.6 });
    expect(entre(a, b, 1)).toEqual({ at: { x: 6, z: 2 }, zoom: 1, hauteur: 0 });
  });

  it('un carton pour chaque quartier de la ville en rangs', () => {
    expect(Object.keys(LIGNES_LIEU).sort()).toEqual(Object.keys(ILOTS_RANGS).sort());
    for (const l of Object.values(LIGNES_LIEU)) expect(l.length).toBeGreaterThan(5);
  });
});

describe('M11 — cinématiques : réglage, adresse, mémoire', () => {
  it('permises par défaut ; `?cine=0` les coupe ; en QA seulement avec `?cine=1`', () => {
    expect(cinePermise('')).toBe(true);
    expect(cinePermise('?aventure=1')).toBe(true);
    expect(cinePermise('?aventure=1&cine=0')).toBe(false);
    expect(cinePermise('?aventure=1&qa=1')).toBe(false);
    expect(cinePermise('?aventure=1&qa=1&cine=1')).toBe(true);
  });

  it('réglage du navigateur : oui par défaut, mémorisé, un stockage refusé ne casse rien', () => {
    const m = new Map<string, string>();
    const st = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); } };
    expect(lireCine(st)).toBe(true);
    expect(ecrireCine(st, false)).toBe(true);
    expect(m.get(CLE_CINE)).toBe('0');
    expect(lireCine(st)).toBe(false);
    ecrireCine(st, true);
    expect(lireCine(st)).toBe(true);
    const refus = { getItem: () => { throw new Error('refus'); }, setItem: () => { throw new Error('refus'); } };
    expect(lireCine(refus)).toBe(true);
    expect(ecrireCine(refus, false)).toBe(false);
    expect(lireCine(null)).toBe(true);
  });

  it('une arrivée par quartier et par aventure', () => {
    expect(arriveeAJouer('port', undefined)).toBe(true);
    expect(arriveeAJouer('port', ['lieu-quai'])).toBe(true);
    expect(arriveeAJouer('port', ['lieu-quai', 'lieu-port'])).toBe(false);
  });
});

describe('M11 — cinématiques : la caméra de l’îlot', () => {
  it('réglages pour une image : distance et hauteur visée changées, ceux de l’îlot intacts', () => {
    const rig = createRig('frontale', { minX: -10, maxX: 10 });
    const cam = new THREE.PerspectiveCamera();
    rig.update(cam, { x: 2, z: 0 }, 0, true, { distance: RIGS.frontale.distance * 0.6, aimY: RIGS.frontale.aimY - 1 });
    const f = framingFor({ ...rig.params, distance: RIGS.frontale.distance * 0.6, aimY: RIGS.frontale.aimY - 1 }, { x: 2, z: 0 });
    expect(cam.position.distanceTo(f.pos)).toBeLessThan(1e-9);
    expect(rig.params.distance).toBe(RIGS.frontale.distance);
    rig.update(cam, { x: 2, z: 0 }, 0, true);
    expect(cam.position.distanceTo(framingFor(rig.params, { x: 2, z: 0 }).pos)).toBeLessThan(1e-9);
  });

  it('les bornes de l’îlot tiennent pendant une cinématique (le décor ne sort pas du cadre)', () => {
    const rig = createRig('frontale', { minX: -10, maxX: 10 });
    const cam = new THREE.PerspectiveCamera();
    rig.update(cam, { x: 40, z: 0 }, 0, true, { distance: 25 });
    expect(cam.position.x).toBe(10);
  });
});

describe('M11 — cinématiques : le déroulé (sans bandes, ville factice)', () => {
  const ville = () => {
    const appels: Array<{ c: { at: { x: number; z: number }; zoom?: number } | null; coupe: boolean }> = [];
    return { appels, town: { cadrer: (c: never, coupe = false) => { appels.push({ c, coupe }); } } as unknown as import('../src/ville/ville').Town };
  };

  it('les plans dans l’ordre : coupe franche, glissé amorti ; la caméra revient au joueur à la fin', async () => {
    const { Cinema } = await import('../src/aventure/cinema');
    const { appels, town } = ville();
    const c = new Cinema(town, { fige: false, reduit: false, bandes: false });
    let marche = false;
    const passee = await c.jouer([
      { at: { x: 1, z: 0 }, mouvement: 'coupe', ms: 5 },
      { at: { x: 2, z: 0 }, zoom: 0.7, mouvement: 'glisse', ms: 0, action: async () => { marche = true; } },
    ]);
    expect(passee).toBe(false);
    expect(marche).toBe(true);
    expect(appels.map((a) => [a.c?.at.x ?? null, a.coupe])).toEqual([[1, true], [2, false], [null, false]]);
  });

  it('passée en route : les plans restants mettent leur état final ; le dernier cadre gardé est celui de la fin', async () => {
    const { Cinema } = await import('../src/aventure/cinema');
    const { appels, town } = ville();
    const c = new Cinema(town, { fige: false, reduit: false, bandes: false, garder: true });
    const finis: number[] = [];
    const p = c.jouer([
      { at: { x: 1, z: 0 }, mouvement: 'glisse', ms: 60000, finir: () => finis.push(1) },
      { at: { x: 2, z: 0 }, mouvement: 'glisse', ms: 0, action: () => new Promise<void>(() => { /* une marche qui n'arrive pas */ }), finir: () => finis.push(2) },
    ]);
    c.passer();
    expect(await p).toBe(true);
    expect(finis).toEqual([1, 2]);
    expect(appels.at(-1)).toEqual({ c: { at: { x: 2, z: 0 } }, coupe: true });
  });

  it('temps figé : actions et états finaux tout de suite, aucun délai ; mouvement réduit : des coupes', async () => {
    const { Cinema } = await import('../src/aventure/cinema');
    const a = ville();
    let n = 0;
    await new Cinema(a.town, { fige: true, reduit: false, bandes: false }).jouer([
      { at: { x: 1, z: 0 }, mouvement: 'glisse', ms: 60000, action: async () => { n++; }, finir: () => { n++; } },
    ]);
    expect(n).toBe(2);
    expect(a.appels).toEqual([{ c: null, coupe: true }]);
    const b = ville();
    await new Cinema(b.town, { fige: false, reduit: true, bandes: false }).jouer([{ at: { x: 3, z: 0 }, mouvement: 'glisse', ms: 1 }]);
    expect(b.appels.map((x) => x.coupe)).toEqual([true, true]);
  });
});
