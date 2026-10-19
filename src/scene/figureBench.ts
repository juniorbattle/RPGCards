/**
 * QA M07 L5 (`?qa=1` seulement) : coût de génération des couches « vectoriel V2 » d’une figure. Chaque essai dessine
 * toutes les couches qu’un rig crée (canvas), puis lit un pixel de chacune pour forcer le tracé différé du navigateur.
 * Le transfert vers le GPU (texImage2D) n’est pas compris : la mémoire des textures est donnée en texels.
 * Depuis le retrait du rendu V1 (M08 C5), il n’y a plus de mesure V1 à comparer.
 */
import { figureV2Art, figureV2PortraitArt, type FigureV2Art } from './figureV2';
import { figureKitV2, kitV2 } from './v2';
import type { RivalPersonality } from '../presentation/personalities';
import { portraitCanvas, type Figure } from '../art/portrait';

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

/** Toutes les couches d’un rig V2 (celles que `createRival` envoie au GPU), dans l’ordre de `FigureV2Art`. */
function layers(a: FigureV2Art): HTMLCanvasElement[] {
  return [a.head, a.front, a.hood, a.torso, a.sclera, a.iris, ...a.lidUp, ...a.lidLow, ...a.lidShut, ...Object.values(a.brows), ...Object.values(a.mouths), a.flush];
}

/** Couches du rig V2 d’un rival (celles que `createRival` génère), pour une graine d’art. */
export function figureCost(p: RivalPersonality, seed: number, runs = 9): FigureCost {
  const kit = figureKitV2(p);
  const make = () => layers(figureV2Art(kit, seed));
  make(); // chauffe des caches du navigateur avant les mesures
  return bench(make, runs);
}

/**
 * Passe 26 : coût d’un portrait (HUD du joueur, affiches des rivaux) : dessin complet et encodage PNG à 384 px, comme
 * `portraitUrl` hors cache (`portrait`). `couches` : génération des couches V2 seules, toutes (`figureV2Art`, ce que
 * faisait le portrait jusqu’à la passe 25) contre celles du portrait (`figureV2PortraitArt`).
 */
export function portraitCost(f: Figure, seed: number, runs = 9): { portrait: FigureCost; couches: { toutes: FigureCost; portrait: FigureCost } } {
  const kit = figureKitV2(f);
  const draw = () => { const c = portraitCanvas(f, seed, 'neutral', 384)!; c.toDataURL('image/png'); return [c]; };
  const all = () => layers(figureV2Art(kit, seed));
  const lean = () => { const a = figureV2PortraitArt(kit, seed); return [a.head, a.front, a.hood, a.torso, a.sclera, a.iris, ...a.lidUp, ...a.lidLow, ...Object.values(a.brows), ...Object.values(a.mouths)] as HTMLCanvasElement[]; };
  draw(); all(); lean();
  return { portrait: bench(draw, runs), couches: { toutes: bench(all, runs), portrait: bench(lean, runs) } };
}

/** M08 C3 : toutes les couches V2 d’une figure (rival, PNJ `pnj-…`, joueur `player-<Famille>`), générées à neuf. */
export function figureLayers(id: string, seed: number): HTMLCanvasElement[] {
  const kit = kitV2(id);
  if (!kit) return [];
  return layers(figureV2Art(kit, seed));
}
