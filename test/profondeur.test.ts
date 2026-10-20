/**
 * M09 V4 — preuve de la profondeur praticable (passe 62, ADR 028 « Profondeur praticable ») : fonctions pures du Quai
 * profond du laboratoire : plan (on marche du quai à la rue haute par un passage, les blocs arrêtent), caméra qui
 * s'élève avec la profondeur, plans découpés (`uv`) et de côté (`cote`), contrôle du contrat, mémoire d'une image
 * partagée comptée une fois, effacement d'un plan quand le personnage passe derrière (`coupe`).
 */
import { describe, expect, it } from 'vitest';
import { framingFor, RIGS } from '../src/ville/cameras';
import { checkPlate, plateRect, uniqueImageBytes, plateGpuBytes } from '../src/ville/decors';
import { behindPlate } from '../src/ville/diorama';
import { newWalker, stepWalker, type Vec2, type Walker } from '../src/ville/monde';
import { BLOCK_BACK_Z, LANE_BACK_Z, PASSAGES, QUAI_PROFOND } from '../src/ville/quaiProfond';
import { FACADE_Z } from '../src/ville/quai';

const STEP = 1 / 60;
/** Marche vers une destination (clic au sol) pendant au plus `s` secondes. */
function walkTo(w: Walker, target: Vec2, s = 20): Walker {
  for (let i = 0; i < s / STEP; i++) {
    w = stepWalker(QUAI_PROFOND, w, { dir: { x: 0, z: 0 }, target }, STEP);
    if (Math.hypot(w.pos.x - target.x, w.pos.z - target.z) < 0.1) break;
  }
  return w;
}

describe('profondeur praticable : le Quai profond (preuve, passe 62)', () => {
  it('on marche du quai à la rue haute par le passage ouest ; tout droit, le bloc du centre arrête', () => {
    const [p0, p1] = PASSAGES[0]!;
    const mid = (p0 + p1) / 2;
    let w = newWalker({ x: mid, z: 0.5 });
    w = walkTo(w, { x: mid, z: FACADE_Z - 4 });
    expect(w.pos.z).toBeLessThan(FACADE_Z - 3.9);
    w = walkTo(w, { x: mid, z: BLOCK_BACK_Z - 2 });
    expect(w.pos.z).toBeLessThan(BLOCK_BACK_Z - 1.9);
    w = walkTo(w, { x: 0, z: BLOCK_BACK_Z - 3 });
    expect(Math.abs(w.pos.x)).toBeLessThan(0.15);
    expect(w.pos.z).toBeGreaterThan(LANE_BACK_Z);
    // depuis le quai, tout droit vers le fond : arrêté au pied du bloc du centre
    let v = newWalker({ x: 0, z: 0.5 });
    for (let i = 0; i < 6 / STEP; i++) v = stepWalker(QUAI_PROFOND, v, { dir: { x: 0, z: -1 } }, STEP);
    expect(v.pos.z).toBeGreaterThan(FACADE_Z - 0.01);
  });

  it('caméra : inclinaison du quai en aimZ, celle du fond en zFond (bornée) ; sans réglage de fond, inchangée', () => {
    const p = { ...RIGS.frontale, pitch: 6, distance: 25, aimY: 4.8, followZ: 0.6, aimZ: 0.3, pitchFond: 16, zFond: -14 };
    const pitchAt = (z: number) => { const f = framingFor(p, { x: 0, z }); return Math.atan2(f.pos.y - f.aim.y, f.pos.z - f.aim.z) * (180 / Math.PI); };
    expect(pitchAt(0.3)).toBeCloseTo(6, 5);
    expect(pitchAt(-14)).toBeCloseTo(16, 5);
    expect(pitchAt(-30)).toBeCloseTo(16, 5);
    expect(pitchAt(-6.85)).toBeCloseTo(11, 4);
    const q = { ...RIGS.frontale };
    expect(framingFor(q, { x: 0, z: -10 }).pos.toArray()).toEqual(framingFor({ ...q, pitchFond: undefined, zFond: undefined }, { x: 0, z: -10 }).pos.toArray());
    // suivi en profondeur : le point visé suit 60 % du déplacement en z
    expect(framingFor(p, { x: 0, z: -14 }).aim.z).toBeCloseTo(0.3 + (-14 - 0.3) * 0.6, 5);
  });

  it('pose d’un plan découpé (uv) et d’un plan de côté ; contrôle du contrat', () => {
    // morceau de 1000 × 500 px d'une image de 4000 × 1000, posé sur 10 m : 5 m de haut
    expect(plateRect({ at: [2, 0, -3], width: 10, size: [4000, 1000], orient: 'face', uv: [0.25, 0.5, 0.5, 1] })).toEqual({ center: [2, 2.5, -3], w: 10, h: 5, orient: 'face' });
    expect(plateRect({ at: [-10.6, 0, -7], width: 8, size: [512, 576], orient: 'cote' })).toEqual({ center: [-10.6, 4.5, -7], w: 8, h: 9, orient: 'cote' });
    const base = { file: 'a.png', sha256: 'a'.repeat(64), size: [512, 576], at: [0, 0, -7], width: 8, orient: 'cote', order: 1, blend: 'decoupe', source: 'QA', fiche: 'art-src/decors/a/fiche.json', approved: false };
    expect(checkPlate('x', { ...base, vers: 'ouest', coupe: true })).toEqual([]);
    expect(checkPlate('x', { ...base, orient: 'face', vers: 'est' }).join()).toMatch(/vers/);
    expect(checkPlate('x', { ...base, coupe: 'oui' }).join()).toMatch(/coupe/);
    expect(checkPlate('x', { ...base, uv: [0.5, 0, 0.4, 1] }).join()).toMatch(/uv/);
    expect(checkPlate('x', { ...base, uv: [0, 0, 1.2, 1] }).join()).toMatch(/uv/);
    expect(checkPlate('x', { ...base, orient: 'biais' }).join()).toMatch(/orientation/);
  });

  it('mémoire GPU : une image découpée par plusieurs plans compte une fois', () => {
    const a = { file: 'f.png', sha256: 'f'.repeat(64), size: [3263, 993] as [number, number] };
    const b = { file: 'g.png', sha256: 'e'.repeat(64), size: [512, 576] as [number, number] };
    expect(uniqueImageBytes([a, a, a, b, b])).toBe(plateGpuBytes(a.size) + plateGpuBytes(b.size));
  });

  it('vue en coupe : effacé quand le personnage est derrière le plan, dans sa largeur ; pas dans le passage', () => {
    const centre = { center: [0.3, 5, FACADE_Z] as [number, number, number], w: 21.8 };
    expect(behindPlate(centre, { x: 0, z: -13 })).toBe(true);
    expect(behindPlate(centre, { x: 0, z: 0.5 })).toBe(false);
    expect(behindPlate(centre, { x: -12.1, z: -7 })).toBe(false);
  });
});
