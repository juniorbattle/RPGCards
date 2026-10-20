/**
 * Portraits 2D des HUD et des affiches (M03) — composés par code à partir des MÊMES couches que le rival 3D (modèle
 * « vectoriel V2 », `scene/figureV2` et `scene/v2`). Générés une fois par (figure, artSeed, humeur), mis en cache en
 * dataURL. Aucune image externe.
 */
import type { Family } from '../game/catalog/cards';
import { paletteOf } from './palette';
import { drawFigureV2Portrait, figureV2PortraitArt, type MouthShape } from '../scene/figureV2';
import { figureKitV2 } from '../scene/v2';

/** Figure dessinable (rival, PNJ ou duelliste joueur) : son identité V2 est retrouvée par `id` (`figureKitV2`). */
export interface Figure { id: string; family: Family | null }

const cache = new Map<string, string>();

/**
 * Duelliste joueur (cheveux argent, bandeau ; tenue aux couleurs de sa Signature), dessiné par `scene/v2/joueur.ts`
 * (id `player-<Famille>`).
 */
export function playerFigure(family: Family | null): Figure {
  // sans Signature (deck d'aventure, avenant M10-A) : tenue grise, sans emblème (`player-gris`)
  return { id: `player-${family ?? 'gris'}`, family };
}

/** Portrait carré (buste + visage), à double définition (affiches ≈ 280 px CSS) : au moins 384 px. */
export function portraitUrl(f: Figure, artSeed: number, mouth: MouthShape = 'neutral', requested = 192): string {
  const size = Math.max(requested, 384);
  const key = `${f.id}|${artSeed}|${mouth}|${size}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const c = portraitCanvas(f, artSeed, mouth, size);
  if (!c) return '';
  const url = c.toDataURL('image/png');
  cache.set(key, url);
  return url;
}

/** Dessine un portrait sans cache (modèle V2 de la figure) ; mesure QA comprise. */
export function portraitCanvas(f: Figure, artSeed: number, mouth: MouthShape, size: number): HTMLCanvasElement | null {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  const pal = paletteOf(f.family);
  // Fond : halo de la famille, vignette chaude.
  const g = ctx.createRadialGradient(size * 0.5, size * 0.42, size * 0.05, size * 0.5, size * 0.5, size * 0.72);
  g.addColorStop(0, `${pal.light}cc`);
  g.addColorStop(0.55, pal.mid);
  g.addColorStop(1, pal.deep);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = 'rgba(255, 196, 120, 0.12)';
  ctx.beginPath();
  ctx.arc(size * 0.78, size * 0.18, size * 0.32, 0, Math.PI * 2);
  ctx.fill();

  drawFigureV2Portrait(ctx, size, figureV2PortraitArt(figureKitV2(f), artSeed, mouth), mouth);
  // Lumière de bougie (côté gauche) + ombre basse.
  const light = ctx.createLinearGradient(0, 0, size, 0);
  light.addColorStop(0, 'rgba(255, 190, 110, 0.16)');
  light.addColorStop(0.5, 'rgba(255, 190, 110, 0)');
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, size, size);
  const shade = ctx.createLinearGradient(0, size * 0.6, 0, size);
  shade.addColorStop(0, 'rgba(0,0,0,0)');
  shade.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, size, size);
  return c;
}
