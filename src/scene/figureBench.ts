/**
 * QA M07 L5 (`?qa=1` seulement) : coût de génération des couches d’un rival, V1 contre V2. Chaque essai dessine
 * toutes les couches qu’un rig crée (canvas), puis lit un pixel de chacune pour forcer le tracé différé du navigateur.
 * Le transfert vers le GPU (texImage2D) n’est pas compris : la mémoire des textures est donnée en texels.
 */
import {
  browCanvas, headCanvas, hoodCanvas, irisCanvas, lidCanvas, MOUTHS, mouthCanvas, scleraCanvas, torsoCanvas,
} from './rivalTextures';
import { figureV2Art } from './figureV2';
import { kitV2 } from './v2';
import type { RivalPersonality } from '../presentation/personalities';

export interface FigureCost { medianMs: number; minMs: number; maxMs: number; runs: number; textures: number; texels: number }

function bench(make: () => HTMLCanvasElement[], runs: number): FigureCost {
  const ms: number[] = [];
  let textures = 0;
  let texels = 0;
  for (let i = 0; i < runs; i++) {
    const t0 = performance.now();
    const cs = make();
    for (const c of cs) c.getContext('2d')!.getImageData(0, 0, 1, 1);
    ms.push(performance.now() - t0);
    textures = cs.length;
    texels = cs.reduce((a, c) => a + c.width * c.height, 0);
  }
  ms.sort((a, b) => a - b);
  const r = (x: number) => Math.round(x * 100) / 100;
  return { medianMs: r(ms[Math.floor(ms.length / 2)]!), minMs: r(ms[0]!), maxMs: r(ms[ms.length - 1]!), runs, textures, texels };
}

/** Couches d’un rig V1 (celles que `createRival` génère) et du rig V2 du même rival, pour la même graine d’art. */
export function figureCost(p: RivalPersonality, seed: number, runs = 9): { v1: FigureCost; v2: FigureCost | null } {
  const v1 = () => [
    headCanvas(p, seed), ...(p.look.outfit === 'cloak' ? [hoodCanvas(p)] : []), torsoCanvas(p, seed), scleraCanvas(), irisCanvas(p.look.eyes),
    lidCanvas(p), browCanvas(p), ...MOUTHS.map((m) => mouthCanvas(m)),
  ];
  const kit = kitV2(p.id);
  const v2 = () => {
    const a = figureV2Art(kit!, seed);
    return [a.head, a.front, a.hood, a.torso, a.sclera, a.iris, ...a.lidUp, ...a.lidLow, ...a.lidShut, ...Object.values(a.brows), ...Object.values(a.mouths), a.flush];
  };
  // Entrelacé : une génération de chaque avant les mesures (chauffe des caches du navigateur).
  v1();
  if (kit) v2();
  return { v1: bench(v1, runs), v2: kit ? bench(v2, runs) : null };
}
