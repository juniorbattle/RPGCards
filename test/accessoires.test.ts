import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { cheminsCaches, solCache, type AccessoireDebout } from '../src/ville/accessoires';
import { framingFor, RIGS, type RigParams } from '../src/ville/cameras';
import { plateRect } from '../src/ville/decors';
import { farFade, ghostOpacity, nearFade } from '../src/ville/diorama';
import { ILOTS_RANGS } from '../src/ville/ilots';
import { MEUBLES_RANGS } from '../src/ville/quaiProfond';
import { MEUBLES_PARVIS } from '../src/ville/parvisRangs';
import { MEUBLES_RUELLES } from '../src/ville/ruellesRangs';
import { MEUBLES_COUR } from '../src/ville/grandeCour';
import { MEUBLES_PORT } from '../src/ville/placeFanal';
import { MEUBLES_HAUTE } from '../src/ville/villeHaute';
import type { MeubleRang } from '../src/ville/rangs';
import { ombrePortee, ombresDuPlan, profilPied, SILHOUETTE } from '../src/ville/ombres';
import { lirePng, profilColonnes, type PngRgba } from './png';

// M09 — retours R1 du responsable (fiche du lot M10-E) : « le chemin lumineux ne doit pas être caché par ces props ».
const MAN = JSON.parse(readFileSync('public/decors/manifest-profondeur.json', 'utf8'));
const IMAGES = new Map<string, PngRgba>();
const image = (f: string): PngRgba => { if (!IMAGES.has(f)) IMAGES.set(f, lirePng(`public/decors/${f}`)); return IMAGES.get(f)!; };
const MEUBLES: Record<string, readonly MeubleRang[]> = { quai: MEUBLES_RANGS, parvis: MEUBLES_PARVIS, ruelles: MEUBLES_RUELLES, cour: MEUBLES_COUR, port: MEUBLES_PORT, haute: MEUBLES_HAUTE };

function accessoires(id: string): AccessoireDebout[] {
  return MEUBLES[id]!.map((m) => {
    const p = MAN.ilots[id].plans[m.id];
    const r = plateRect(p);
    // silhouette de l'image (hauteur opaque de chaque colonne) : un banc sous un arbre ne cache pas comme un mur
    return { id: m.id, x: p.at[0], z: p.at[2], w: r.w, h: r.h, profil: profilColonnes(image(p.file), p.uv) };
  });
}
function rig(id: string): RigParams {
  const def = ILOTS_RANGS[id as keyof typeof ILOTS_RANGS]!;
  const { minX, maxX, ...tuning } = MAN.ilots[id].camera;
  return { ...RIGS.frontale, minX: minX ?? def.camera.minX, maxX: maxX ?? def.camera.maxX, ...(def.rig ?? {}), ...tuning };
}

describe('accessoires de la ville en rangs', () => {
  it('solCache : le sol juste derrière un étal est caché, celui de devant et celui d’à côté ne le sont pas', () => {
    const etal = { id: 'etal', x: 0, z: -10, w: 4, h: 2.4 };
    const cam = { x: 0, y: 7.4, z: 15 };
    expect(solCache({ x: 0, z: -11 }, etal, cam)).toBe(true);
    expect(solCache({ x: 0, z: -9 }, etal, cam)).toBe(false);
    expect(solCache({ x: 5, z: -11 }, etal, cam)).toBe(false);
    // au-delà de la profondeur cachée (c.z − a.z) · h / (c.y − h) ≈ 12 m : de nouveau visible
    expect(solCache({ x: 0, z: -23 }, etal, cam)).toBe(false);
  });

  for (const id of ['quai', 'parvis', 'ruelles', 'cour', 'port', 'haute']) {
    it(`${id} : aucun accessoire ne cache le chemin lumineux quand le personnage le suit`, () => {
      const caches = cheminsCaches(ILOTS_RANGS[id as keyof typeof ILOTS_RANGS]!.chemins ?? [], accessoires(id), rig(id), { opacite: (a, p, c) => ghostOpacity(0, farFade({ center: [a.x, a.h / 2, a.z], w: a.w, h: a.h, orient: 'face' }, p), nearFade(a.z, c.z)).o });
      const parAccessoire = [...new Set(caches.map((c) => c.accessoire))].map((a) => `${a} (${caches.filter((c) => c.accessoire === a).length} points)`);
      expect(parAccessoire).toEqual([]);
    }, 60000);

    it(`${id} : aucun accessoire ne cache un personnage ni un repère (monument, estrade, tableau) quand on s'en approche`, () => {
      const ilot = ILOTS_RANGS[id as keyof typeof ILOTS_RANGS]!.ilot;
      const R = rig(id);
      const acc = accessoires(id);
      const op = (a: AccessoireDebout, p: { x: number; z: number }, c: { z: number }) => ghostOpacity(0, farFade({ center: [a.x, a.h / 2, a.z], w: a.w, h: a.h, orient: 'face' }, p), nearFade(a.z, c.z)).o;
      const reperes = ilot.zones.filter((z) => z.kind === 'parler' || (z.kind === 'info' && !z.target)).map((z) => {
        const a = z.area as { x?: number; z?: number; r?: number; x0?: number; z0?: number; x1?: number; z1?: number };
        // l'objet que le repère entoure (le monument, la fontaine) ne compte pas : sa zone l'entoure
        const dans = (m: AccessoireDebout) => (a.x0 !== undefined ? m.x >= a.x0 - 0.5 && m.x <= a.x1! + 0.5 && m.z >= a.z0! - 0.5 && m.z <= a.z1! + 0.5 : z.kind === 'info' && Math.hypot(m.x - a.x!, m.z - a.z!) <= a.r! + 0.5);
        return { id: z.id, x: a.x ?? (a.x0! + a.x1!) / 2, z: a.z ?? (a.z0! + a.z1!) / 2, dans };
      });
      expect(reperes.length).toBeGreaterThan(0);
      const caches: string[] = [];
      for (const r of reperes) {
        const c = framingFor(R, r).pos;
        for (const a of acc) if (!r.dans(a) && solCache(r, a, c) && op(a, r, c) >= 0.5) caches.push(`${r.id} par ${a.id}`);
      }
      expect(caches).toEqual([]);
    }, 60000);
  }

  it('ombres : contact de la silhouette (pieds d’un étal), lissé ; sans profil, l’ellipse d’avant', () => {
    // 10 colonnes, 2 lignes : deux pieds (colonnes 1 et 8) touchent le sol
    const rgba = new Uint8Array(10 * 2 * 4);
    for (const x of [1, 8]) rgba[(10 + x) * 4 + 3] = 255;
    const p = profilPied(rgba, 10, 2, 10);
    expect(p[1]).toBeGreaterThan(0.4); expect(p[8]).toBeGreaterThan(0.4); expect(p[4]).toBe(0);
    const r = { center: [7.4, 1.83, -20.8] as [number, number, number], w: 4.4, h: 3.66, orient: 'face' as const };
    const [sil] = ombresDuPlan(r, [7.4, 0, -20.8], undefined, { profil: p });
    expect(sil).toMatchObject({ kind: 'silhouette', x: 7.4, w: 4.4 + 2 * SILHOUETTE.bord, bord: SILHOUETTE.bord });
    // de l'ombre devant le pied (vers la caméra) et un peu derrière
    expect(sil!.z + sil!.d / 2).toBeCloseTo(-20.8 + SILHOUETTE.avant(3.66), 6);
    expect(sil!.z - sil!.d / 2).toBeCloseTo(-20.8 - SILHOUETTE.recul, 6);
    // une bande d'accessoires (48 m) a sa silhouette ; sans profil, rien (comme avant)
    const bande = { center: [0, 1.2, 2.9] as [number, number, number], w: 48, h: 2.4, orient: 'face' as const };
    expect(ombresDuPlan(bande, [0, 0, 2.9], undefined, { profil: [0, 1, 1, 0] }).map((o) => o.kind)).toEqual(['silhouette']);
    expect(ombresDuPlan(bande, [0, 0, 2.9])).toEqual([]);
  });

  it('ombres : portée à l’opposé de la lanterne la plus proche, vers la caméra ; jamais par sa propre lanterne ni vers le fond', () => {
    const r = { center: [0, 1.0, -10] as [number, number, number], w: 1.2, h: 2.0, orient: 'face' as const };
    const lampe = (x: number, z: number) => ({ at: [x, 3.2, z] as [number, number, number], color: 'ambre' as const, intensity: 2, radius: 6 });
    // lanterne derrière à gauche : l'ombre tombe devant à droite (vers la caméra)
    const o = ombrePortee(r, [0, 0, -10], [lampe(-2, -12)])!;
    expect(o.kind).toBe('portee');
    expect(o.x).toBeGreaterThan(0); expect(o.z).toBeGreaterThan(-10);
    expect(o.d).toBeGreaterThanOrEqual(0.6); expect(o.d).toBeLessThanOrEqual(2.6);
    // lanterne devant : l'ombre tomberait derrière l'objet, cachée par lui
    expect(ombrePortee(r, [0, 0, -10], [lampe(0, -7)])).toBeNull();
    // sa propre lanterne (peinte sur lui) ne compte pas ; trop loin non plus
    expect(ombrePortee(r, [0, 0, -10], [lampe(0.2, -10.1)])).toBeNull();
    expect(ombrePortee(r, [0, 0, -10], [lampe(-9, -14)])).toBeNull();
  });
});
