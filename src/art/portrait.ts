/**
 * Portraits 2D des HUD (M03) — composés par code à partir des MÊMES couches que le rival 3D
 * (tête, buste, yeux, sourcils, bouche : `scene/rivalTextures`). Générés une fois par
 * (figure, artSeed, humeur), mis en cache en dataURL. Aucune image externe.
 */
import type { Family } from '../game/catalog/cards';
import { FAMILY_PALETTE } from './palette';
import {
  browCanvas, headCanvas, hoodCanvas, irisCanvas, lidCanvas, mouthCanvas, scleraCanvas, torsoCanvas,
  type Figure, type Look, type MouthShape,
} from '../scene/rivalTextures';
import { usesV2 } from '../scene/figureStyle';
import { drawMaelleV2Portrait, maelleV2Art } from '../scene/maelleV2';

const cache = new Map<string, string>();

/** Apparence provisoire du duelliste joueur (cheveux argent, bandeau ; tenue aux couleurs de sa Signature). */
export function playerFigure(family: Family): Figure {
  const p = FAMILY_PALETTE[family];
  const look: Look = {
    skin: '#f2cdb4', skinShade: '#c99c84', hair: '#dfe2ef', hairHi: '#ffffff', hairStyle: 'bob', outfit: 'coat',
    cloth: p.mid, clothHi: p.light, trim: p.accent, eyes: '#4a6fd6', jaw: 0.4, mark: null, headband: true,
  };
  return { id: `player-${family}`, family, look };
}

/**
 * Compose un portrait carré (buste + visage) : fenêtre monde x ∈ [−0.85, 0.85], y ∈ [2.15, 3.85]
 * dans le repère du rig 3D (tête centrée en y = 3.1, buste centré en y = 1.75).
 */
export function portraitUrl(f: Figure, artSeed: number, mouth: MouthShape = 'neutral', requested = 192): string {
  // M07 L5 : le portrait V2 est composé des couches du rig V2, à double définition (affiches ≈ 280 px CSS).
  const v2 = usesV2(f.id);
  const size = v2 ? Math.max(requested, 384) : requested;
  const key = `${f.id}|${artSeed}|${mouth}|${size}|${v2 ? 'v2' : 'v1'}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (!ctx) return '';
  const pal = FAMILY_PALETTE[f.family];
  const x0 = -0.85;
  const y1 = 3.85;
  const k = size / 1.7; // px par unité monde
  const put = (img: HTMLCanvasElement, cx: number, cy: number, w: number, h: number, mirror = false) => {
    const px = (cx - w / 2 - x0) * k;
    const py = (y1 - (cy + h / 2)) * k;
    if (mirror) {
      ctx.save();
      ctx.translate(px + w * k, py);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0, w * k, h * k);
      ctx.restore();
    } else ctx.drawImage(img, px, py, w * k, h * k);
  };
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

  if (v2) drawMaelleV2Portrait(ctx, size, maelleV2Art(artSeed), mouth);
  else {
    put(torsoCanvas(f, artSeed), 0, 1.75, 2.4, 2.0);
    if (f.look.outfit === 'cloak') put(hoodCanvas(f), 0, 3.0, 1.62, 1.82);
    put(headCanvas(f, artSeed), 0, 3.1, 1.15, 1.4);
    const sclera = scleraCanvas();
    const iris = irisCanvas(f.look.eyes);
    const lid = lidCanvas(f);
    const brow = browCanvas(f);
    for (const side of [-1, 1]) {
      const ex = side * 0.21;
      const ey = 3.12;
      put(sclera, ex, ey, 0.27, 0.17);
      put(iris, ex, ey + 0.0015, 0.125, 0.125);
      // Paupière au repos : comprimée à 16 % de sa hauteur depuis son bord supérieur (comme le rig 3D).
      const lh = 0.19 * 0.16;
      ctx.drawImage(lid, 0, 0, lid.width, lid.height, (ex - 0.145 - x0) * k, (y1 - (ey + 0.095)) * k, 0.29 * k, lh * k);
      put(brow, ex, ey + 0.18, 0.32, 0.08, side > 0);
    }
    put(mouthCanvas(mouth), 0, 2.8, 0.36, 0.18);
  }
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
  const url = c.toDataURL('image/png');
  cache.set(key, url);
  return url;
}
