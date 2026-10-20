/**
 * M09 V4 — quartiers en rangs (passe 65, `src/ville/rangs.ts`, `docs/M09_QUARTIERS_EN_RANGS.md`) : contrôle de la
 * grammaire, plan (façades découpées aux passages et aux places, murs, obstacles), le Quai en quatre rangs (chaque rang et
 * chaque place atteints depuis l'arrivée ; parcours du quai à la cour par des passages jamais alignés), fantôme et fondu
 * lointain des plans du diorama.
 */
import { describe, expect, it } from 'vitest';
import { behindPlate, FANTOME_LOIN, farFade, ghostOpacity, LOIN, nearFade } from '../src/ville/diorama';
import { ombresDuPlan } from '../src/ville/ombres';
import { blocked, newWalker, stepWalker, type Vec2, type Walker } from '../src/ville/monde';
import { BALISES_QUAI, CHEMINS_QUAI, PLAN_QUAI, QUAI_PROFOND, QUAI_RANGS } from '../src/ville/quaiProfond';
import { checkRangs, minus, planRangs, rangAt, type QuartierRangs } from '../src/ville/rangs';

const STEP = 1 / 60;
function walkTo(w: Walker, target: Vec2, s = 25): Walker {
  for (let i = 0; i < s / STEP; i++) {
    w = stepWalker(QUAI_PROFOND, w, { dir: { x: 0, z: 0 }, target }, STEP);
    if (Math.hypot(w.pos.x - target.x, w.pos.z - target.z) < 0.1) break;
  }
  return w;
}

describe('quartiers en rangs : la grammaire', () => {
  it('intervalle privé de trous', () => {
    expect(minus(-10, 10, [[-2, 1], [4, 12]])).toEqual([[-10, -2], [1, 4]]);
    expect(minus(0, 5, [[-1, 6]])).toEqual([]);
  });

  it('le Quai en rangs est conforme ; les écarts sont nommés', () => {
    expect(checkRangs(QUAI_RANGS)).toEqual([]);
    const bad = (patch: (q: QuartierRangs) => QuartierRangs) => checkRangs(patch(QUAI_RANGS)).join(' | ');
    // passages alignés d'une bande à la suivante : vue traversante, plus de découverte
    expect(bad((q) => ({ ...q, bandes: [q.bandes[0]!, { profondeur: 8, passages: [[-13, -10]] }, q.bandes[2]!] }))).toMatch(/alignés/);
    // passage hors de la ruelle qui suit, dans le recul d'une place, bande sans passage
    expect(bad((q) => ({ ...q, bandes: [q.bandes[0]!, q.bandes[1]!, { profondeur: 7, passages: [[9, 12]] }] }))).toMatch(/hors de cour-chapelle/);
    expect(bad((q) => ({ ...q, bandes: [q.bandes[0]!, { profondeur: 8, passages: [[2, 5]] }, q.bandes[2]!] }))).toMatch(/recul de place-halle/);
    expect(bad((q) => ({ ...q, bandes: [q.bandes[0]!, { profondeur: 8, passages: [] }, q.bandes[2]!] }))).toMatch(/aucun passage/);
    // place qui mange toute la bande suivante, plus de quatre rangs, ruelles et bandes en nombre différent
    expect(bad((q) => ({ ...q, ruelles: [{ ...q.ruelles[0]!, place: { ...q.ruelles[0]!.place!, recul: 8 } }, ...q.ruelles.slice(1)] }))).toMatch(/recul de 8 m/);
    expect(bad((q) => ({ ...q, bandes: [...q.bandes, { profondeur: 6, passages: [[-2, 1]] }], ruelles: [...q.ruelles, { id: 'r5', nom: 'r5', x0: -8, x1: 8, profondeur: 4 }] }))).toMatch(/5 rangs/);
    expect(bad((q) => ({ ...q, bandes: q.bandes.slice(0, 2) }))).toMatch(/2 bandes pour 3 ruelles/);
  });

  it('plan : façades coupées aux passages, place en recul avec ses deux murs, bouts des ruelles fermés', () => {
    const plan = planRangs(QUAI_RANGS);
    expect(plan.rangs.map((r) => [r.n, r.z0, r.z1])).toEqual([[1, -3, 3.4], [2, -17, -11], [3, -29, -25], [4, -43, -36]]);
    // fond du rang 2 : décor de −31 à 31 moins le passage [−8, −5] et la place [1, 13], qui recule de 6 m
    expect(plan.facades.filter((f) => f.rang === 2 && !f.flanc).map((f) => [f.x0, f.x1, f.z, f.place ?? ''])).toEqual([[-31, -8, -17, ''], [-5, 1, -17, ''], [13, 31, -17, ''], [1, 13, -23, 'place-halle']]);
    // flancs : les maisons des côtés, au-delà des bouts de chaque ruelle, sur sa ligne avant
    expect(plan.facades.filter((f) => f.flanc).map((f) => [f.rang, f.x0, f.x1, f.z])).toEqual([[2, -31, -17, -11], [2, 17, 31, -11], [3, -31, -14, -25], [3, 14, 31, -25], [4, -31, -10, -36], [4, 10, 31, -36]]);
    expect(plan.murs.filter((m) => m.rang === 2).map((m) => [m.role, m.x, m.vers])).toEqual([['place', 1, 'est'], ['place', 13, 'ouest'], ['bout', -17, 'est'], ['bout', 17, 'ouest'], ['passage', -8, 'est'], ['passage', -5, 'ouest']]);
    expect(plan.bounds).toEqual({ x0: -19, z0: -43, x1: 19, z1: 3.4 });
    // chaque passage a ses deux murs ; chaque ruelle ses deux bouts
    const nPassages = QUAI_RANGS.bandes.reduce((s, b) => s + b.passages.length, 0);
    expect(plan.murs.filter((m) => m.role === 'passage')).toHaveLength(2 * nPassages);
    expect(plan.murs.filter((m) => m.role === 'bout')).toHaveLength(2 * QUAI_RANGS.ruelles.length);
  });

  it('rang d’un point : rues et places ; 0 dans un passage ou un bloc', () => {
    expect(rangAt(PLAN_QUAI, { x: 0, z: 0 })).toBe(1);
    expect(rangAt(PLAN_QUAI, { x: 7, z: -20 })).toBe(2);
    expect(rangAt(PLAN_QUAI, { x: -11, z: -31 })).toBe(3);
    expect(rangAt(PLAN_QUAI, { x: 0, z: -40 })).toBe(4);
    expect(rangAt(PLAN_QUAI, { x: -12.1, z: -7 })).toBe(0);
  });
});

describe('quartiers en rangs : le Quai en quatre rangs', () => {
  it('depuis l’arrivée, chaque rang et chaque place sont atteints (parcours du plan à 25 cm)', () => {
    const b = QUAI_PROFOND.bounds;
    const h = 0.25;
    const nx = Math.round((b.x1 - b.x0) / h); const nz = Math.round((b.z1 - b.z0) / h);
    const seen = new Uint8Array(nx * nz);
    const cell = (p: Vec2) => [Math.round((p.x - b.x0) / h), Math.round((p.z - b.z0) / h)] as const;
    const at = (i: number, k: number): Vec2 => ({ x: b.x0 + i * h, z: b.z0 + k * h });
    const start = cell(QUAI_PROFOND.spawns.arrivee!);
    const todo: [number, number][] = [[start[0], start[1]]];
    seen[start[1] * nx + start[0]] = 1;
    while (todo.length) {
      const [i, k] = todo.pop()!;
      for (const [di, dk] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const a = i + di; const c = k + dk;
        if (a < 0 || c < 0 || a >= nx || c >= nz || seen[c * nx + a]) continue;
        if (blocked(QUAI_PROFOND, at(a, c))) continue;
        seen[c * nx + a] = 1;
        todo.push([a, c]);
      }
    }
    const reached = (p: Vec2) => { const [i, k] = cell(p); return seen[k * nx + i] === 1; };
    for (const r of PLAN_QUAI.rangs) {
      expect(reached({ x: (r.x0 + r.x1) / 2 + 0.6, z: (r.z0 + r.z1) / 2 + 0.3 }), r.id).toBe(true);
    }
    // le fond de chaque place (entre le mobilier)
    expect(reached({ x: 3.5, z: -22.4 }), 'place-halle').toBe(true);
    expect(reached({ x: -9, z: -33.4 }), 'placette-puits').toBe(true);
    // les blocs ne sont pas praticables
    expect(reached({ x: 0, z: -7 })).toBe(false);
    expect(reached({ x: -2, z: -33 })).toBe(false);
  });

  it('parcours du quai à la cour : passage ouest, rue Haute, passage du rang 2, ruelle des Lanternes, passage du rang 3', () => {
    let w = newWalker({ x: -12.1, z: 0.5 });
    for (const t of [{ x: -12.1, z: -14 }, { x: -6.5, z: -14 }, { x: -6.5, z: -27 }, { x: 7, z: -27 }, { x: 7, z: -38.5 }, { x: 4, z: -40 }]) {
      w = walkTo(w, t);
      expect(Math.hypot(w.pos.x - t.x, w.pos.z - t.z), `${t.x}, ${t.z}`).toBeLessThan(0.15);
    }
    expect(rangAt(PLAN_QUAI, w.pos)).toBe(4);
    // tout droit depuis la rue Haute, le bloc du rang 2 arrête : il faut trouver le passage
    let v = newWalker({ x: 0, z: -14 });
    for (let i = 0; i < 6 / STEP; i++) v = stepWalker(QUAI_PROFOND, v, { dir: { x: 0, z: -1 } }, STEP);
    expect(v.pos.z).toBeGreaterThan(-17.01);
  });
});

describe('quartiers en rangs : fantôme et fondu lointain', () => {
  it('mur de côté : fantôme quand le personnage est derrière son bout avant, du côté non peint', () => {
    const mur = { center: [-13.6, 4.5, -7] as [number, number, number], w: 8 };
    expect(behindPlate(mur, { x: -16, z: -13 }, 'est')).toBe(true);
    expect(behindPlate(mur, { x: -12.1, z: -13 }, 'est')).toBe(false);
    expect(behindPlate(mur, { x: -16, z: 0 }, 'est')).toBe(false);
    expect(behindPlate({ ...mur, center: [-10.6, 4.5, -7] }, { x: -8, z: -13 }, 'ouest')).toBe(true);
  });

  it('fondu lointain : rien à moins de LOIN[0] m devant, effacé au-delà de LOIN[1] m', () => {
    const facade = { center: [0, 5, -3] as [number, number, number], w: 21.8, h: 10, orient: 'face' as const };
    expect(farFade(facade, { z: -3 - LOIN[0] + 0.1 })).toBe(0);
    expect(farFade(facade, { z: -3 - LOIN[1] })).toBe(1);
    expect(farFade(facade, { z: -14 })).toBe(0); // rang 2 : le bloc du rang 1 reste (fantôme s'il est devant)
    expect(farFade(facade, { z: -27 })).toBe(1); // rang 3 : le rang 1, dépassé de deux rangs, s'efface
    // mur de côté : son bout avant compte
    const mur = { center: [-13.6, 4.5, -7] as [number, number, number], w: 8, h: 9, orient: 'cote' as const };
    expect(farFade(mur, { z: -3 - LOIN[1] })).toBe(1);
    expect(farFade(mur, { z: -14 })).toBe(0);
  });
});

describe('quartiers en rangs : balises des passages (passe 67)', () => {
  it('chaque passage a une balise à chaque bouche : vers le rang suivant, retour au précédent, sur le pavé praticable', () => {
    const n = QUAI_RANGS.bandes.reduce((s, b) => s + b.passages.length, 0);
    expect(BALISES_QUAI).toHaveLength(2 * n);
    expect(BALISES_QUAI.map((b) => b.label)).toEqual([
      'Vers la rue Haute', 'Retour vers le Quai', 'Vers la rue Haute', 'Retour vers le Quai',
      'Vers la ruelle des Lanternes', 'Retour vers la rue Haute',
      'Vers la cour de la Chapelle', 'Retour vers la ruelle des Lanternes',
    ]);
    for (const b of BALISES_QUAI) {
      // la balise « aller » file vers le fond (z négatif), la balise « retour » vers l'avant ; toutes deux sur une rue
      expect(b.sens).toBe(b.id.endsWith('avant') ? -1 : 1);
      expect(rangAt(PLAN_QUAI, b)).toBe(b.sens < 0 ? b.vers - 1 : b.vers + 1);
      expect(blocked(QUAI_PROFOND, b), b.id).toBe(false);
      // sa zone « info » nomme le rang où l'on va
      expect(QUAI_PROFOND.zones.find((z) => z.id === b.id)?.label).toBe(b.label);
    }
  });
});

describe('quartiers en rangs : chemins lumineux, fantômes gardés, ombres (passe 68)', () => {
  it('chemins : au travers de chaque passage, d’une arrivée au départ suivant, jusqu’au cœur ; tout sur le pavé praticable', () => {
    const passages = QUAI_RANGS.bandes.reduce((s, b) => s + b.passages.length, 0);
    // 4 passages, puis rue Haute : 2 arrivées × 1 départ, ruelle des Lanternes : 1 × 1, cour : 1 × le cœur
    expect(CHEMINS_QUAI).toHaveLength(passages + 2 + 1 + 1);
    for (const s of CHEMINS_QUAI) {
      for (let t = 0; t <= 1; t += 0.1) {
        const p = { x: s.x0 + (s.x1 - s.x0) * t, z: s.z0 + (s.z1 - s.z0) * t };
        expect(blocked(QUAI_PROFOND, p, 0.05), `${JSON.stringify(s)} à ${t}`).toBe(false);
      }
    }
    // le chemin mène du quai au cœur
    expect(Math.max(...CHEMINS_QUAI.map((s) => Math.max(s.z0, s.z1)))).toBeGreaterThan(-1);
    expect(Math.min(...CHEMINS_QUAI.map((s) => Math.min(s.z0, s.z1)))).toBeLessThan(-38);
  });

  it('fantômes : le rang juste devant à 12 %, les rangs déjà traversés effacés (les chemins guident le retour), le très proche de la caméra effacé', () => {
    expect(ghostOpacity(0, 0, 0).o).toBe(1);
    expect(ghostOpacity(1, 0, 0).o).toBeCloseTo(0.12, 5);
    expect(FANTOME_LOIN).toBe(0);
    expect(ghostOpacity(1, 1, 0).o).toBeCloseTo(FANTOME_LOIN, 5);
    expect(ghostOpacity(0, 1, 0).o).toBeCloseTo(FANTOME_LOIN, 5);
    expect(ghostOpacity(1, 1, 1).o).toBe(0);
    // uniformes du nuanceur : mix(1, coupe, fade) = opacité
    for (const [c, f, n] of [[0.5, 0, 0], [1, 0.3, 0], [1, 1, 0.5], [0, 0.6, 0.2]] as const) {
      const g = ghostOpacity(c, f, n);
      expect(1 + (g.coupe - 1) * g.fade).toBeCloseTo(g.o, 5);
    }
    expect(nearFade(-3, 20)).toBe(0);
    expect(nearFade(-3, -1)).toBe(1);
  });

  it('ombres : contact sous un objet, pied d’une façade, pied d’un mur du côté peint ; rien hors du sol', () => {
    const etal = ombresDuPlan({ center: [7.4, 1.8, -20.8], w: 4.4, h: 3.66, orient: 'face' }, [7.4, 0, -20.8]);
    expect(etal.map((o) => o.kind)).toEqual(['contact']);
    const facade = ombresDuPlan({ center: [0, 6.7, -17], w: 20, h: 13.4, orient: 'face' }, [0, 0, -17]);
    expect(facade).toEqual([{ kind: 'pied', x: 0, z: -16.2, w: 20, d: 1.6, alpha: 0.42 }]);
    const mur = ombresDuPlan({ center: [-8, 4.5, -21], w: 8, h: 9, orient: 'cote' }, [-8, 0, -21], 'est');
    expect(mur[0]!.x).toBeGreaterThan(-8);
    expect(ombresDuPlan({ center: [0, 20, -75], w: 140, h: 30, orient: 'face' }, [0, 2, -75])).toEqual([]);
  });
});
