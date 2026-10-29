// Relief des plans peints (retour du responsable du 2026-10-29 : escaliers et intérieurs « aplatis ») : des formes en
// données, sur les images réelles du décor, dans leurs bornes ; les plans qu'il vise (la Halle, la maison du Puits, la
// taverne du Quai, l'estrade) en ont un, les autres gardent le nuanceur d'origine.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { encoder, RELIEF_MAX, RELIEF_MIN, reliefDansMorceau, RELIEFS, sommets, sommetsArc } from '../src/ville/reliefs';

type Plan = { file: string; size: [number, number]; uv?: [number, number, number, number]; orient: string };
const plans: Record<string, Plan> = {};
for (const f of ['public/decors/manifest.json', 'public/decors/manifest-profondeur.json']) {
  const m = JSON.parse(readFileSync(f, 'utf8')) as { ilots: Record<string, { plans: Record<string, Plan> }> };
  for (const [ilot, e] of Object.entries(m.ilots)) for (const [id, p] of Object.entries(e.plans)) plans[`${ilot}/${id}`] = p;
}
const taille = (file: string) => Object.values(plans).find((p) => p.file === file)?.size;

describe('relief des plans peints', () => {
  it('chaque image à relief est une image du décor ; chaque forme tient dans l’image, profondeurs dans les bornes', () => {
    for (const [file, formes] of Object.entries(RELIEFS)) {
      const size = taille(file);
      expect(size, file).toBeDefined();
      for (const f of formes) {
        for (const [x, y] of sommets(f)) {
          expect(x, `${file} x`).toBeGreaterThanOrEqual(0);
          expect(x, `${file} x`).toBeLessThanOrEqual(size![0]);
          expect(y, `${file} y`).toBeGreaterThanOrEqual(0);
          expect(y, `${file} y`).toBeLessThanOrEqual(size![1]);
        }
        for (const d of typeof f.prof === 'number' ? [f.prof] : f.prof) {
          expect(d).toBeGreaterThanOrEqual(RELIEF_MIN);
          expect(d).toBeLessThanOrEqual(RELIEF_MAX);
        }
      }
    }
  });

  it('encodage : monotone, le plan de la façade au tiers bas, les bornes aux extrémités', () => {
    expect(encoder(RELIEF_MIN)).toBe(0);
    expect(encoder(RELIEF_MAX)).toBe(255);
    expect(encoder(0)).toBeGreaterThan(encoder(-1));
    expect(encoder(3)).toBeGreaterThan(encoder(0));
  });

  it('une arcade : jambages droits, sommet à la clé', () => {
    const pts = sommetsArc([100, 200, 650, 580, 860]);
    expect(pts[0]).toEqual([100, 860]);
    expect(pts.at(-1)).toEqual([200, 860]);
    expect(Math.min(...pts.map((p) => p[1]))).toBeCloseTo(580, 5);
  });

  it('les plans visés par le retour ont un relief ; un morceau sans forme n’en a pas', () => {
    for (const id of ['quai/fond-place-halle', 'quai/fond-placette-puits', 'quai/facades-ouest', 'cour/estrade', 'cour/monument']) {
      const p = plans[id]!;
      expect(p, id).toBeDefined();
      expect(reliefDansMorceau(p.file, p.size, p.uv), id).toBe(true);
    }
    expect(reliefDansMorceau('rangs-frise-a.png', [3989, 834], [0, 0, 0.2, 1])).toBe(false);
    expect(reliefDansMorceau('quai-ciel.png', [1536, 1024])).toBe(false);
  });
});
