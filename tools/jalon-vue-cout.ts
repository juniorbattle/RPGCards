// Jalon 2026-10 — coût pur de la vérification de la vue (`detecter`, `src/aventure/vue.ts`, chaque image de la ville hors
// dialogue) : pour chacun des six îlots, huit guetteurs posés régulièrement dans l'îlot et le joueur le long d'une
// diagonale, `detecter` appelé en boucle (ligne de vue comprise). Le processeur seul, sans rendu.
// Usage : npx tsx tools/jalon-vue-cout.ts [rapport.json]
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { ILOTS_RANGS } from '../src/ville/ilots';
import { detecter } from '../src/aventure/vue';
import type { Pose } from '../src/aventure/directeur';

const OUT = process.argv[2] ?? 'artifacts/qa/jalon-2026-10/cout/vue.json';
const APPELS = 200000;
const FACES = ['face', 'dos', 'gauche', 'droite'] as const;
const rapport: Record<string, { microsecondesParAppel: number; rectangles: number; disques: number }> = {};
for (const { ilot } of Object.values(ILOTS_RANGS)) {
  const { rects, discs, bounds } = ilot;
  const { x0, x1, z0, z1 } = bounds;
  const poses = Array.from({ length: 8 }, (_, i) => ({ id: `g${i}`, at: { x: x0 + ((i + 0.5) / 8) * (x1 - x0), z: z0 + ((i % 3) + 0.5) / 3 * (z1 - z0) }, facing: FACES[i % 4]! })) as unknown as Pose[];
  let vus = 0;
  const t0 = performance.now();
  for (let i = 0; i < APPELS; i++) {
    const k = (i % 997) / 997;
    vus += detecter(ilot, poses, { x: x0 + k * (x1 - x0), z: z0 + k * (z1 - z0) }, new Set()).dedans.size;
  }
  const ms = performance.now() - t0;
  rapport[ilot.id] = { microsecondesParAppel: Math.round((ms / APPELS) * 1e6) / 1000, rectangles: rects.length, disques: discs.length };
  console.log(ilot.id, JSON.stringify(rapport[ilot.id]), `(${vus} vus)`);
}
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify({ date: new Date().toISOString(), appels: APPELS, guetteurs: 8, rapport }, null, 1)}\n`);
