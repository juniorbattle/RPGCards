/**
 * Emblèmes des familles dessinés par chemins (aucune police) — utilisables en Canvas 2D
 * (cartes, texture d’arène) et en SVG (UI). Forme ≠ couleur : lisible en niveaux de gris.
 */
import type { Family } from '../game/catalog/cards';

type Ctx = CanvasRenderingContext2D;

/** Trace l’emblème centré en (x, y), rayon r. Remplit avec le style courant. */
export function drawEmblem(ctx: Ctx, family: Family, x: number, y: number, r: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  switch (family) {
    case 'Cendre': {
      // ◆ losange plein + flamme intérieure évidée
      ctx.moveTo(0, -r); ctx.lineTo(r * 0.72, 0); ctx.lineTo(0, r); ctx.lineTo(-r * 0.72, 0); ctx.closePath();
      ctx.moveTo(0, -r * 0.5);
      ctx.quadraticCurveTo(r * 0.32, -r * 0.05, r * 0.12, r * 0.42);
      ctx.quadraticCurveTo(0, r * 0.2, -r * 0.12, r * 0.42);
      ctx.quadraticCurveTo(-r * 0.32, -r * 0.05, 0, -r * 0.5);
      ctx.fill('evenodd');
      break;
    }
    case 'Voile': {
      // ◈ losange avec losange intérieur (anneau)
      ctx.moveTo(0, -r); ctx.lineTo(r, 0); ctx.lineTo(0, r); ctx.lineTo(-r, 0); ctx.closePath();
      ctx.moveTo(0, -r * 0.62); ctx.lineTo(-r * 0.62, 0); ctx.lineTo(0, r * 0.62); ctx.lineTo(r * 0.62, 0); ctx.closePath();
      ctx.moveTo(0, -r * 0.3); ctx.lineTo(r * 0.3, 0); ctx.lineTo(0, r * 0.3); ctx.lineTo(-r * 0.3, 0); ctx.closePath();
      ctx.fill('evenodd');
      break;
    }
    case 'Ronce': {
      // ✿ fleur à cinq pétales + cœur évidé
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
        const cx = Math.cos(a) * r * 0.52;
        const cy = Math.sin(a) * r * 0.52;
        ctx.moveTo(cx + r * 0.42, cy);
        ctx.arc(cx, cy, r * 0.42, 0, Math.PI * 2);
      }
      ctx.fill('nonzero');
      // cœur assombri (pas de découpe destructive du fond)
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'Astre': {
      // ✦ étoile à quatre branches concaves
      const k = r * 0.22;
      ctx.moveTo(0, -r);
      ctx.quadraticCurveTo(k, -k, r, 0);
      ctx.quadraticCurveTo(k, k, 0, r);
      ctx.quadraticCurveTo(-k, k, -r, 0);
      ctx.quadraticCurveTo(-k, -k, 0, -r);
      ctx.fill();
      break;
    }
  }
  ctx.restore();
}

/** Équivalent SVG (chemins) pour l’UI DOM. */
export function emblemSvg(family: Family, size = 24, color = 'currentColor'): string {
  const r = 10;
  let d = '';
  switch (family) {
    case 'Cendre':
      d = `M0,-10 L7.2,0 L0,10 L-7.2,0 Z M0,-5 Q3.2,-0.5 1.2,4.2 Q0,2 -1.2,4.2 Q-3.2,-0.5 0,-5 Z`;
      break;
    case 'Voile':
      d = `M0,-10 L10,0 L0,10 L-10,0 Z M0,-6.2 L-6.2,0 L0,6.2 L6.2,0 Z M0,-3 L3,0 L0,3 L-3,0 Z`;
      break;
    case 'Ronce': {
      const parts: string[] = [];
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
        const cx = (Math.cos(a) * r * 0.52).toFixed(2);
        const cy = (Math.sin(a) * r * 0.52).toFixed(2);
        parts.push(`M${(+cx + 4.2).toFixed(2)},${cy} a4.2,4.2 0 1,0 -8.4,0 a4.2,4.2 0 1,0 8.4,0`);
      }
      d = parts.join(' ') + ' M2,0 a2,2 0 1,1 -4,0 a2,2 0 1,1 4,0';
      break;
    }
    case 'Astre':
      d = `M0,-10 Q2.2,-2.2 10,0 Q2.2,2.2 0,10 Q-2.2,2.2 -10,0 Q-2.2,-2.2 0,-10 Z`;
      break;
  }
  const rule = family === 'Ronce' ? 'nonzero' : 'evenodd';
  return `<svg class="emblem" viewBox="-11 -11 22 22" width="${size}" height="${size}" aria-hidden="true"><path d="${d}" fill="${color}" fill-rule="${rule}"/></svg>`;
}
