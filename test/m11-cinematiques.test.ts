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
    // retour du 2026-10-29 : des personnages cadrés (gros plan sur Kaï, puis les deux)
    expect(point!.sujets).toEqual([{ x: 4, z: 0 }]);
    expect(point!.serre!).toBeGreaterThan(1);
    expect(duo!.sujets).toEqual([{ x: 1.2, z: 0 }, { x: 0, z: 0 }]);
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
    const c = new Cinema(town, { fige: false, reduit: false, bandes: null });
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
    const c = new Cinema(town, { fige: false, reduit: false, bandes: null, garder: true });
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
    await new Cinema(a.town, { fige: true, reduit: false, bandes: null }).jouer([
      { at: { x: 1, z: 0 }, mouvement: 'glisse', ms: 60000, action: async () => { n++; }, finir: () => { n++; } },
    ]);
    expect(n).toBe(2);
    expect(a.appels).toEqual([{ c: null, coupe: true }]);
    const b = ville();
    await new Cinema(b.town, { fige: false, reduit: true, bandes: null }).jouer([{ at: { x: 3, z: 0 }, mouvement: 'glisse', ms: 1 }]);
    expect(b.appels.map((x) => x.coupe)).toEqual([true, true]);
  });
});

describe('M11 — cinématiques du récit (deuxième lot)', () => {
  it('cartons de chapitre : II à V, une ligne chacun ; le I et le titre ont leur propre scène', async () => {
    const { CARTONS_CHAPITRE, estChapitreCarton } = await import('../src/aventure/cinematiques');
    expect(Object.keys(CARTONS_CHAPITRE)).toEqual(['II', 'III', 'IV', 'V']);
    for (const c of ['II', 'III', 'IV', 'V']) expect(estChapitreCarton(c)).toBe(true);
    for (const c of ['prologue', 'I', 'titre']) expect(estChapitreCarton(c)).toBe(false);
  });

  it('chapitre : depuis le côté où il y a de la place, vers le joueur, sans sortir des bornes', async () => {
    const { plansChapitre } = await import('../src/aventure/cinematiques');
    const b = { minX: -10, maxX: 10 };
    const g = plansChapitre({ x: -8, z: 1 }, b);
    expect(g[0]!.at.x).toBe(-4);
    expect(g[1]!.at.x).toBe(-8);
    expect(g.map((p) => p.mouvement)).toEqual(['coupe', 'travelling', 'glisse']);
    expect(plansChapitre({ x: 9.5, z: 0 }, b)[0]!.at.x).toBe(5.5);
    // joueur au-delà des bornes : borné
    expect(plansChapitre({ x: 30, z: 0 }, b)[1]!.at.x).toBe(10);
  });

  it('chef vaincu : gros plan sur lui, puis les deux ; affiliation : gros plan sur le joueur puis recul', async () => {
    const { plansChef, plansAffiliation } = await import('../src/aventure/cinematiques');
    const [point, duo] = plansChef({ x: 3, z: -2 }, { x: 3, z: -1 });
    expect(point!.at).toEqual({ x: 3, z: -2 });
    expect(point!.sujets).toHaveLength(1);
    expect(point!.serre!).toBeGreaterThan(duo!.serre ?? 1);
    expect(duo!.sujets).toHaveLength(2);
    const [pres, recul] = plansAffiliation({ x: 1, z: 1 });
    expect(pres!.mouvement).toBe('coupe');
    expect(recul!.mouvement).toBe('travelling');
    expect(pres!.serre!).toBeGreaterThan(1);
    expect(recul!.zoom!).toBeGreaterThan(1);
  });

  it('titre : plan large depuis le bord opposé, jusqu’au héraut et au joueur (ou au joueur seul)', async () => {
    const { plansTitre } = await import('../src/aventure/cinematiques');
    const b = { minX: -8, maxX: 8 };
    const [large, fin] = plansTitre({ x: -7.5, z: -6.9 }, { x: -7.5, z: -5.9 }, b);
    expect(large!.at.x).toBe(8);
    expect(large!.zoom).toBeGreaterThan(1.2);
    expect(fin!.at).toEqual({ x: -7.5, z: -6.4 });
    expect(plansTitre(null, { x: 5, z: 0 }, b)[1]!.at).toEqual({ x: 5, z: 0 });
  });

  it('cadres de dialogue : un personnage en gros plan, deux ensemble, un groupe plus large', async () => {
    const { cadreDialogue, cadreGroupe } = await import('../src/aventure/cinematiques');
    expect(cadreDialogue({ x: 1, z: 0 }).sujets).toEqual([{ x: 1, z: 0 }]);
    expect(cadreDialogue({ x: 1, z: 0 }).serre!).toBeGreaterThan(1);
    expect(cadreDialogue({ x: 0, z: 0 }, { x: 2, z: 0 }).at).toEqual({ x: 1, z: 0 });
    expect(cadreDialogue({ x: 0, z: 0 }, null, false).bandes).toBe(false);
    const g = cadreGroupe([{ x: 10, z: 2 }, { x: 16, z: 2 }, { x: 12, z: -1 }, { x: 15, z: -1 }, { x: 12.4, z: 1.3 }]);
    expect(g.at.x).toBeCloseTo(13.08, 5);
    expect(g.sujets).toHaveLength(5);
  });

  it('personnages cadrés (retour du 2026-10-29) : pieds au-dessus de la boîte de dialogue, tous dans la largeur', async () => {
    const THREE = await import('three');
    const { cadrageSujets, SUJETS } = await import('../src/ville/cameras');
    const p = { ...RIGS.frontale, pitch: 6, distance: 25, fov: 42, aimY: 4.8, followZ: 0.9, aimZ: 0.3, minX: -30, maxX: 30 };
    const ecran = (cam: InstanceType<typeof THREE.PerspectiveCamera>, x: number, y: number, z: number) => {
      const v = new THREE.Vector3(x, y, z).project(cam);
      return { x: v.x, haut: (1 - v.y) / 2 };
    };
    for (const sujets of [[{ x: 4, z: -1 }], [{ x: -3, z: 0.5 }, { x: 3.5, z: 1 }], [{ x: 10, z: 2 }, { x: 16, z: 2 }, { x: 12, z: -1 }]]) {
      const h = 2.2;
      const s = cadrageSujets(sujets, { h, fov: p.fov, aspect: 16 / 9 });
      const cam = new THREE.PerspectiveCamera(p.fov, 16 / 9, 0.5, 400);
      const f = framingFor({ ...p, distance: s.distance, aimY: s.aimY, followZ: 1 }, s.at);
      cam.position.copy(f.pos);
      cam.lookAt(f.aim);
      cam.updateMatrixWorld();
      for (const q of sujets) {
        const pieds = ecran(cam, q.x, 0, q.z);
        const tete = ecran(cam, q.x, h, q.z);
        // pieds au-dessus de la boîte de dialogue (78 % de la hauteur) et sous la bande du haut ; tous dans la largeur
        expect(pieds.haut).toBeLessThan(0.76);
        expect(pieds.haut).toBeGreaterThan(0.55);
        expect(tete.haut).toBeGreaterThan(0.12);
        expect(Math.abs(pieds.x)).toBeLessThan(0.92);
      }
      if (sujets.length === 1) expect(ecran(cam, sujets[0]!.x, 0, sujets[0]!.z).haut).toBeCloseTo(SUJETS.pieds, 1);
    }
  });

  it('l’émissaire : la foule et le joueur, puis les deux quand il arrive', async () => {
    const { plansEmissaire } = await import('../src/aventure/cinematiques');
    const [groupe, duo] = plansEmissaire([{ x: 10.6, z: 1.8 }, { x: 16.4, z: 1.6 }], { x: 13.6, z: 0.9 }, { x: 12.4, z: 1.3 });
    expect(groupe!.at.x).toBeGreaterThan(12);
    expect(duo!.at).toEqual({ x: 13, z: 1.1 });
    expect(duo!.ms).toBe(0);
  });

  it('une scène du récit une fois par aventure', async () => {
    const { aJouer } = await import('../src/aventure/cinematiques');
    expect(aJouer('chef-Ronce', ['chef-Voile'])).toBe(true);
    expect(aJouer('chef-Ronce', ['chef-Ronce'])).toBe(false);
    expect(aJouer('chapitre-II', undefined)).toBe(true);
  });
});

describe('M11 — bandes partagées', () => {
  it('prises par une cinématique puis par le dialogue qui suit : gardées entre les deux, repliées à la fin', async () => {
    const { Bandes } = await import('../src/aventure/cinema');
    const el: { classes: Set<string>; removed: boolean } = { classes: new Set(), removed: false };
    const body = new Set<string>();
    const g = globalThis as unknown as Record<string, unknown>;
    const avant = { document: g.document, requestAnimationFrame: g.requestAnimationFrame };
    g.document = {
      body: { classList: { add: (c: string) => body.add(c), remove: (c: string) => body.delete(c) }, append: () => undefined },
      createElement: () => ({ classList: { add: (...c: string[]) => c.forEach((x) => el.classes.add(x)), remove: (c: string) => el.classes.delete(c) }, append: () => undefined, setAttribute: () => undefined, remove: () => { el.removed = true; }, set className(v: string) { for (const c of v.split(' ')) el.classes.add(c); } }),
      createTextNode: () => ({}),
    };
    g.requestAnimationFrame = (f: () => void) => { f(); return 0; };
    try {
      const b = new Bandes(true);
      b.prendre();
      expect(b.tenues).toBe(true);
      expect(body.has('av-cine-actif')).toBe(true);
      b.prendre();
      b.rendre();
      await new Promise((r) => setTimeout(r, 5));
      expect(b.tenues).toBe(true);
      expect(el.removed).toBe(false);
      b.rendre();
      await new Promise((r) => setTimeout(r, 5));
      expect(b.tenues).toBe(false);
      expect(body.has('av-cine-actif')).toBe(false);
      expect(el.removed).toBe(true);
    } finally {
      g.document = avant.document;
      g.requestAnimationFrame = avant.requestAnimationFrame;
    }
  });
});
