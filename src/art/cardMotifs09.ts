/**
 * Avenant 09 (M12, appliqué à titre provisoire) — motifs des 32 variantes B et C, tracés par code comme ceux de
 * `cardMotifs.ts` : une composition qui raconte l'effet, sur le fond de la famille (`cardArt.ts`). Canvas 2D seulement
 * (page et worker : même tracé) ; aucun texte ; graine d'art seulement.
 */
import type { EffectId } from '../game/catalog/cards';
import { drawEmblem } from './emblems';
import type { FamilyPalette } from './palette';
import { CX, CY, TAU, cardShape, eye, flame, glow, halo, star4, thornBranch, type Ctx, type Rng } from './motifTools';

type Motif = (ctx: Ctx, p: FamilyPalette, rng: Rng) => void;

/** Petites escarbilles qui montent (Cendre). */
function sparks(ctx: Ctx, p: FamilyPalette, rng: Rng, n: number, cx: number, cy: number, spread: number): void {
  for (let i = 0; i < n; i++) {
    const x = cx + (rng() - 0.5) * spread;
    const y = cy - rng() * spread * 0.9;
    ctx.fillStyle = rng() < 0.5 ? p.ink : p.accent;
    ctx.globalAlpha = 0.45 + rng() * 0.5;
    ctx.beginPath();
    ctx.arc(x, y, 0.8 + rng() * 1.8, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** Bouclier (Garde) centré en (x, y), demi-largeur r. */
function shield(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x, y - r * 1.15);
  ctx.quadraticCurveTo(x + r * 0.55, y - r * 0.85, x + r, y - r * 0.9);
  ctx.quadraticCurveTo(x + r * 1.02, y + r * 0.35, x, y + r * 1.25);
  ctx.quadraticCurveTo(x - r * 1.02, y + r * 0.35, x - r, y - r * 0.9);
  ctx.quadraticCurveTo(x - r * 0.55, y - r * 0.85, x, y - r * 1.15);
  ctx.closePath();
}

/** Feuille en cœur (Lierre, Bouture), base en (x, y), orientée `ang`. */
function leaf(ctx: Ctx, p: FamilyPalette, x: number, y: number, s: number, ang: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-s * 0.9, -s * 0.2, -s * 0.7, -s * 1.1, 0, -s * 0.8);
  ctx.bezierCurveTo(s * 0.7, -s * 1.1, s * 0.9, -s * 0.2, 0, 0);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, 0, 0, -s);
  g.addColorStop(0, p.mid);
  g.addColorStop(1, p.light);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = `${p.accent}aa`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, -1);
  ctx.lineTo(0, -s * 0.7);
  ctx.stroke();
  ctx.restore();
}

/** Point d'étoile lumineux. */
function starDot(ctx: Ctx, p: FamilyPalette, x: number, y: number, r: number): void {
  halo(ctx, x, y, r * 4, p.glow, '88');
  ctx.fillStyle = p.ink;
  star4(ctx, x, y, r * 1.8, 0.25);
  ctx.fill();
}

// ---------------------------------------------------------------------------------------------- Cendre

/** Tison : une bûche dont le bout rougeoie, une petite flamme et des escarbilles. */
function tison(ctx: Ctx, p: FamilyPalette, rng: Rng): void {
  halo(ctx, CX + 30, CY - 20, 80, p.glow, '88');
  ctx.save();
  ctx.translate(CX, CY + 10);
  ctx.rotate(-0.55);
  const g = ctx.createLinearGradient(-70, 0, 60, 0);
  g.addColorStop(0, '#3a2414');
  g.addColorStop(0.7, '#6a3a1c');
  g.addColorStop(0.92, p.glow);
  g.addColorStop(1, p.ink);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(-72, -11, 136, 22, 10);
  ctx.fill();
  ctx.strokeStyle = '#1a0e08';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
  flame(ctx, p, CX + 46, CY - 26, 26, 52, 0.2);
  sparks(ctx, p, rng, 22, CX + 46, CY - 40, 60);
}

/** Escarbille : une carte tirée d'un foyer, des escarbilles qui volent. */
function escarbille(ctx: Ctx, p: FamilyPalette, rng: Rng): void {
  halo(ctx, CX, CY + 30, 90, p.glow, '88');
  for (let i = -2; i <= 2; i++) flame(ctx, p, CX + i * 22, CY + 62, 26, 46 + (2 - Math.abs(i)) * 12, i * 0.1, 0.85);
  ctx.save();
  ctx.translate(CX + 10, CY - 22);
  ctx.rotate(0.18);
  cardShape(ctx, -26, -36, 52, 72, p.mid, p.accent);
  ctx.fillStyle = `${p.accent}cc`;
  drawEmblem(ctx, 'Cendre', 0, 0, 12);
  ctx.restore();
  sparks(ctx, p, rng, 30, CX, CY - 10, 120);
}

/** Percée : une lance qui fend un bouclier. */
function percee(ctx: Ctx, p: FamilyPalette): void {
  halo(ctx, CX, CY, 90, p.glow, '77');
  ctx.fillStyle = '#4a5466';
  shield(ctx, CX, CY + 6, 50);
  ctx.fill();
  ctx.strokeStyle = '#c8d0dc';
  ctx.lineWidth = 3;
  ctx.stroke();
  // fêlure
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(CX - 4, CY - 46); ctx.lineTo(CX + 8, CY - 18); ctx.lineTo(CX - 6, CY + 4); ctx.lineTo(CX + 10, CY + 30);
  ctx.stroke();
  // lance
  glow(ctx, p.glow, 14, () => {
    ctx.fillStyle = p.accent;
    ctx.beginPath();
    ctx.moveTo(CX - 92, CY + 70); ctx.lineTo(CX - 4, CY - 6); ctx.lineTo(CX + 4, CY + 4); ctx.lineTo(CX - 86, CY + 76);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = p.ink;
    ctx.beginPath();
    ctx.moveTo(CX - 10, CY + 2); ctx.lineTo(CX + 24, CY - 26); ctx.lineTo(CX + 4, CY + 12);
    ctx.closePath();
    ctx.fill();
  });
}

/** Bravade : deux flammes croisées devant un bouclier, en défi. */
function bravade(ctx: Ctx, p: FamilyPalette): void {
  halo(ctx, CX, CY, 92, p.glow, '88');
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = '#3a404c';
  shield(ctx, CX, CY + 10, 46);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.save();
  ctx.translate(CX, CY + 44);
  ctx.rotate(-0.5);
  flame(ctx, p, 0, 0, 30, 96, 0.1);
  ctx.restore();
  ctx.save();
  ctx.translate(CX, CY + 44);
  ctx.rotate(0.5);
  flame(ctx, p, 0, 0, 30, 96, -0.1);
  ctx.restore();
}

/** Surenchère : trois flammes en escalier, de plus en plus hautes. */
function surenchere(ctx: Ctx, p: FamilyPalette, rng: Rng): void {
  halo(ctx, CX + 20, CY, 96, p.glow, '88');
  flame(ctx, p, CX - 44, CY + 52, 30, 50, 0.05);
  flame(ctx, p, CX, CY + 52, 34, 80, 0.05);
  flame(ctx, p, CX + 46, CY + 52, 38, 112, 0.05);
  ctx.strokeStyle = `${p.accent}bb`;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(CX - 66, CY + 60); ctx.lineTo(CX + 72, CY + 60);
  ctx.stroke();
  sparks(ctx, p, rng, 18, CX + 46, CY - 50, 50);
}

/** Brûlure : un éclair de flamme. */
function brulure(ctx: Ctx, p: FamilyPalette, rng: Rng): void {
  halo(ctx, CX, CY, 96, p.glow, '99');
  const g = ctx.createLinearGradient(CX, CY - 80, CX, CY + 70);
  g.addColorStop(0, p.ink);
  g.addColorStop(0.5, p.accent);
  g.addColorStop(1, p.glow);
  glow(ctx, p.glow, 18, () => {
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(CX + 18, CY - 82); ctx.lineTo(CX - 30, CY + 6); ctx.lineTo(CX - 2, CY + 6);
    ctx.lineTo(CX - 20, CY + 74); ctx.lineTo(CX + 34, CY - 14); ctx.lineTo(CX + 6, CY - 14);
    ctx.closePath();
    ctx.fill();
  });
  sparks(ctx, p, rng, 26, CX, CY, 140);
}

/** Fournaise : la gueule d'un four, grille et feu blanc. */
function fournaise(ctx: Ctx, p: FamilyPalette): void {
  ctx.fillStyle = '#2a1a14';
  ctx.beginPath();
  ctx.roundRect(CX - 78, CY - 70, 156, 140, 18);
  ctx.fill();
  const g = ctx.createRadialGradient(CX, CY + 12, 4, CX, CY + 12, 70);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.35, p.ink);
  g.addColorStop(0.7, p.glow);
  g.addColorStop(1, p.mid);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(CX - 54, CY + 56);
  ctx.lineTo(CX - 54, CY - 10);
  ctx.arc(CX, CY - 10, 54, Math.PI, 0);
  ctx.lineTo(CX + 54, CY + 56);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#1a100c';
  ctx.lineWidth = 5;
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(CX + i * 15, CY - 50 + Math.abs(i) * 4);
    ctx.lineTo(CX + i * 15, CY + 56);
    ctx.stroke();
  }
  ctx.strokeStyle = p.accent;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(CX - 78, CY - 70, 156, 140, 18);
  ctx.stroke();
}

/** Phénix : un oiseau de feu qui renaît, ailes déployées. */
function phenix(ctx: Ctx, p: FamilyPalette, rng: Rng): void {
  halo(ctx, CX, CY, 104, p.glow, 'aa');
  for (const side of [-1, 1]) {
    for (let k = 0; k < 4; k++) {
      ctx.save();
      ctx.translate(CX + side * 8, CY + 4);
      ctx.rotate(side * (0.9 + k * 0.28));
      flame(ctx, p, 0, 0, 22 - k * 3, 84 - k * 10, side * 0.25, 0.9 - k * 0.12);
      ctx.restore();
    }
  }
  flame(ctx, p, CX, CY + 50, 30, 120, 0);
  ctx.fillStyle = p.ink;
  ctx.beginPath();
  ctx.arc(CX, CY - 58, 7, 0, TAU);
  ctx.fill();
  sparks(ctx, p, rng, 24, CX, CY + 40, 110);
}

// ---------------------------------------------------------------------------------------------- Voile

/** Leurre : un loup de bal masqué, qui détourne les regards. */
function leurre(ctx: Ctx, p: FamilyPalette): void {
  halo(ctx, CX, CY, 92, p.glow, '88');
  const g = ctx.createLinearGradient(CX - 80, CY, CX + 80, CY);
  g.addColorStop(0, p.mid);
  g.addColorStop(0.5, p.light);
  g.addColorStop(1, p.mid);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(CX - 84, CY - 6);
  ctx.bezierCurveTo(CX - 70, CY - 46, CX - 20, CY - 40, CX, CY - 20);
  ctx.bezierCurveTo(CX + 20, CY - 40, CX + 70, CY - 46, CX + 84, CY - 6);
  ctx.bezierCurveTo(CX + 70, CY + 34, CX + 22, CY + 34, CX, CY + 12);
  ctx.bezierCurveTo(CX - 22, CY + 34, CX - 70, CY + 34, CX - 84, CY - 6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = p.accent;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = p.deep;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(CX + s * 38, CY - 6, 20, 11, s * -0.2, 0, TAU);
    ctx.fill();
  }
  ctx.strokeStyle = `${p.accent}cc`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(CX + 84, CY - 6); ctx.quadraticCurveTo(CX + 100, CY + 30, CX + 88, CY + 70);
  ctx.stroke();
}

/** Murmure : des ondes qui s'échappent vers une carte retournée. */
function murmure(ctx: Ctx, p: FamilyPalette): void {
  halo(ctx, CX - 30, CY, 80, p.glow, '77');
  ctx.lineCap = 'round';
  for (let i = 0; i < 5; i++) {
    ctx.strokeStyle = `${p.accent}${['ee', 'cc', 'aa', '88', '66'][i]}`;
    ctx.lineWidth = 3 - i * 0.3;
    ctx.beginPath();
    ctx.arc(CX - 60, CY, 18 + i * 16, -0.7, 0.7);
    ctx.stroke();
  }
  ctx.save();
  ctx.translate(CX + 50, CY - 4);
  cardShape(ctx, -24, -34, 48, 68, p.deep, p.light);
  ctx.fillStyle = `${p.accent}88`;
  drawEmblem(ctx, 'Voile', 0, 0, 12);
  ctx.restore();
}

/** Écho : des anneaux qui s'élargissent autour d'un œil. */
function echo(ctx: Ctx, p: FamilyPalette): void {
  halo(ctx, CX, CY, 96, p.glow, '77');
  for (let i = 4; i >= 1; i--) {
    ctx.strokeStyle = `${p.light}${['', 'cc', '99', '66', '44'][i]}`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(CX, CY, 28 + i * 16, 16 + i * 10, 0, 0, TAU);
    ctx.stroke();
  }
  eye(ctx, p, CX, CY, 30);
}

/** Fil d'ombre : un fil qui s'enroule depuis une aiguille jusqu'à un œil. */
function filombre(ctx: Ctx, p: FamilyPalette): void {
  halo(ctx, CX, CY, 90, p.glow, '77');
  ctx.strokeStyle = p.accent;
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(CX - 76, CY + 66);
  for (let t = 0; t <= 1; t += 0.02) {
    const a = t * TAU * 2.2;
    const r = 34 * (1 - t) + 6;
    ctx.lineTo(CX - 76 + t * 120 + Math.cos(a) * r * 0.5, CY + 66 - t * 110 + Math.sin(a) * r * 0.4);
  }
  ctx.stroke();
  ctx.strokeStyle = '#dfe4ee';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(CX - 88, CY + 80); ctx.lineTo(CX - 64, CY + 52);
  ctx.stroke();
  eye(ctx, p, CX + 48, CY - 46, 24, 0.8);
}

/** Ombre portée : une carte qui projette une longue ombre. */
function ombre(ctx: Ctx, p: FamilyPalette): void {
  halo(ctx, CX - 50, CY - 50, 70, p.glow, '99');
  ctx.fillStyle = 'rgba(6,6,18,0.7)';
  ctx.beginPath();
  ctx.moveTo(CX - 20, CY + 38); ctx.lineTo(CX + 30, CY + 38); ctx.lineTo(CX + 96, CY + 84); ctx.lineTo(CX + 30, CY + 84);
  ctx.closePath();
  ctx.fill();
  ctx.save();
  ctx.translate(CX + 4, CY - 2);
  cardShape(ctx, -24, -40, 48, 80, p.mid, p.accent);
  ctx.restore();
  eye(ctx, p, CX + 64, CY + 66, 14, 0.7);
}

/** Contre-jour : une silhouette de carte devant un disque lumineux et ses rayons. */
function contrejour(ctx: Ctx, p: FamilyPalette): void {
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * TAU;
    ctx.strokeStyle = `${p.accent}55`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(CX + Math.cos(a) * 52, CY + Math.sin(a) * 52);
    ctx.lineTo(CX + Math.cos(a) * 96, CY + Math.sin(a) * 96);
    ctx.stroke();
  }
  const g = ctx.createRadialGradient(CX, CY, 4, CX, CY, 60);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.5, p.accent);
  g.addColorStop(1, `${p.light}00`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(CX, CY, 60, 0, TAU);
  ctx.fill();
  cardShape(ctx, CX - 22, CY - 34, 44, 68, '#0a0a18', `${p.accent}ee`);
}

/** Éclipse : un disque noir et sa couronne. */
function eclipse(ctx: Ctx, p: FamilyPalette): void {
  halo(ctx, CX, CY, 100, p.accent, '66');
  glow(ctx, p.accent, 26, () => {
    ctx.strokeStyle = p.ink;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(CX, CY, 52, 0, TAU);
    ctx.stroke();
  });
  ctx.fillStyle = '#05050c';
  ctx.beginPath();
  ctx.arc(CX + 4, CY - 2, 52, 0, TAU);
  ctx.fill();
  ctx.fillStyle = `${p.ink}`;
  ctx.beginPath();
  ctx.arc(CX - 44, CY - 22, 4, 0, TAU);
  ctx.fill();
}

/** Miroir brisé : un miroir ovale fendu, éclats qui tombent. */
function miroirbrise(ctx: Ctx, p: FamilyPalette, rng: Rng): void {
  halo(ctx, CX, CY, 96, p.glow, '77');
  const g = ctx.createLinearGradient(CX - 50, CY - 70, CX + 50, CY + 70);
  g.addColorStop(0, p.light);
  g.addColorStop(0.5, p.ink);
  g.addColorStop(1, p.mid);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(CX, CY, 50, 70, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = p.accent;
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.strokeStyle = p.deep;
  ctx.lineWidth = 2;
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU + rng() * 0.3;
    ctx.beginPath();
    ctx.moveTo(CX + 6, CY - 8);
    ctx.lineTo(CX + 6 + Math.cos(a) * 30, CY - 8 + Math.sin(a) * 40);
    ctx.lineTo(CX + Math.cos(a + 0.2) * 50, CY + Math.sin(a + 0.2) * 70);
    ctx.stroke();
  }
  for (let i = 0; i < 6; i++) {
    const x = CX + (rng() - 0.5) * 90;
    const y = CY + 74 + rng() * 14;
    ctx.fillStyle = `${p.ink}cc`;
    ctx.beginPath();
    ctx.moveTo(x, y - 6); ctx.lineTo(x + 5, y + 3); ctx.lineTo(x - 4, y + 4);
    ctx.closePath();
    ctx.fill();
  }
}

// ---------------------------------------------------------------------------------------------- Ronce

/** Épine : une grande épine, des épines plus petites, la pointe qui luit. */
function epine(ctx: Ctx, p: FamilyPalette, rng: Rng): void {
  halo(ctx, CX, CY - 40, 80, p.glow, '88');
  thornBranch(ctx, rng, CX - 70, CY + 70, -0.9, 40, 4, `${p.light}cc`, p.accent, 1.1);
  thornBranch(ctx, rng, CX + 70, CY + 70, -2.2, 40, 4, `${p.light}cc`, p.accent, 1.1);
  const g = ctx.createLinearGradient(CX, CY + 60, CX, CY - 84);
  g.addColorStop(0, p.mid);
  g.addColorStop(0.7, p.light);
  g.addColorStop(1, p.ink);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(CX - 22, CY + 64); ctx.quadraticCurveTo(CX - 6, CY - 10, CX + 2, CY - 86); ctx.quadraticCurveTo(CX + 8, CY - 10, CX + 22, CY + 64);
  ctx.closePath();
  ctx.fill();
  halo(ctx, CX + 2, CY - 82, 14, '#ffffff', 'cc');
}

/** Bouture : une jeune pousse qui sort de la terre, deux feuilles. */
function bouture(ctx: Ctx, p: FamilyPalette): void {
  halo(ctx, CX, CY, 90, p.glow, '77');
  ctx.fillStyle = '#3a2a1c';
  ctx.beginPath();
  ctx.ellipse(CX, CY + 60, 70, 16, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = p.light;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(CX, CY + 56); ctx.bezierCurveTo(CX - 8, CY + 10, CX + 10, CY - 20, CX, CY - 52);
  ctx.stroke();
  leaf(ctx, p, CX - 2, CY - 6, 46, -1.1);
  leaf(ctx, p, CX + 2, CY - 30, 40, 1.0);
  leaf(ctx, p, CX, CY - 50, 26, 0);
  halo(ctx, CX + 34, CY - 54, 22, p.accent, 'aa');
}

/** Sève : une goutte de sève qui perle, lumineuse. */
function seve(ctx: Ctx, p: FamilyPalette): void {
  halo(ctx, CX, CY, 96, p.glow, '88');
  const g = ctx.createRadialGradient(CX - 14, CY - 6, 4, CX, CY + 10, 62);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.3, p.accent);
  g.addColorStop(0.75, p.light);
  g.addColorStop(1, p.mid);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(CX, CY - 80);
  ctx.bezierCurveTo(CX + 30, CY - 30, CX + 56, CY, CX + 56, CY + 30);
  ctx.arc(CX, CY + 30, 56, 0, Math.PI);
  ctx.bezierCurveTo(CX - 56, CY, CX - 30, CY - 30, CX, CY - 80);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = `${p.ink}aa`;
  ctx.lineWidth = 2;
  ctx.stroke();
}

/** Lierre : une liane qui s'enroule, feuilles en cœur. */
function lierre(ctx: Ctx, p: FamilyPalette): void {
  halo(ctx, CX, CY, 90, p.glow, '66');
  ctx.strokeStyle = p.mid;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let t = 0; t <= 1; t += 0.02) {
    const x = CX + Math.sin(t * TAU * 1.6) * 46;
    const y = CY + 80 - t * 170;
    if (t === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  for (let k = 0; k < 7; k++) {
    const t = 0.08 + k * 0.13;
    const x = CX + Math.sin(t * TAU * 1.6) * 46;
    const y = CY + 80 - t * 170;
    leaf(ctx, p, x, y, 26, (k % 2 ? 1 : -1) * 1.2);
  }
}

/** Mur de ronces : un mur de pierres envahi d'épines. */
function mur(ctx: Ctx, p: FamilyPalette, rng: Rng): void {
  halo(ctx, CX, CY, 92, p.glow, '66');
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      const x = CX - 80 + col * 32 + (row % 2 ? 16 : 0);
      const y = CY - 50 + row * 24;
      if (x > CX + 70) continue;
      ctx.fillStyle = `rgba(${90 + ((row * 7 + col * 13) % 20)},${92 + ((row * 3 + col * 5) % 18)},${96},0.95)`;
      ctx.fillRect(x, y, 29, 21);
    }
  }
  thornBranch(ctx, rng, CX - 84, CY + 70, -0.6, 44, 5, `${p.light}ee`, p.accent, 1.2);
  thornBranch(ctx, rng, CX + 84, CY + 70, -2.5, 44, 5, `${p.light}ee`, p.accent, 1.2);
}

/** Racines profondes : un arbuste au-dessus du sol, des racines qui plongent. */
function profondes(ctx: Ctx, p: FamilyPalette, rng: Rng): void {
  ctx.fillStyle = 'rgba(40,28,18,0.75)';
  ctx.fillRect(CX - 96, CY + 2, 192, 96);
  ctx.strokeStyle = '#d8c7a4';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(CX - 96, CY + 2); ctx.lineTo(CX + 96, CY + 2);
  ctx.stroke();
  for (let i = 0; i < 7; i++) thornBranch(ctx, rng, CX, CY + 4, Math.PI / 2 + (i - 3) * 0.32, 26, 4, `${p.accent}cc`, `${p.accent}00`, 0.9);
  ctx.strokeStyle = '#5a3a20';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(CX, CY + 2); ctx.lineTo(CX, CY - 40);
  ctx.stroke();
  halo(ctx, CX, CY - 56, 50, p.glow, '88');
  for (let k = 0; k < 6; k++) leaf(ctx, p, CX, CY - 40, 34, -1.4 + k * 0.56);
}

/** Rempart : une tour crénelée et un bouclier. */
function rempart(ctx: Ctx, p: FamilyPalette): void {
  halo(ctx, CX, CY, 96, p.glow, '66');
  ctx.fillStyle = '#5a5e68';
  ctx.beginPath();
  ctx.moveTo(CX - 70, CY + 76); ctx.lineTo(CX - 70, CY - 40);
  for (let i = 0; i < 5; i++) {
    const x = CX - 70 + i * 28;
    ctx.lineTo(x, CY - 60); ctx.lineTo(x + 16, CY - 60); ctx.lineTo(x + 16, CY - 40); ctx.lineTo(x + 28, CY - 40);
  }
  ctx.lineTo(CX + 70, CY + 76);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#2a2c34';
  ctx.lineWidth = 2;
  ctx.stroke();
  const g = ctx.createLinearGradient(CX, CY - 30, CX, CY + 60);
  g.addColorStop(0, p.light);
  g.addColorStop(1, p.mid);
  ctx.fillStyle = g;
  shield(ctx, CX, CY + 12, 36);
  ctx.fill();
  ctx.strokeStyle = p.accent;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = `${p.ink}`;
  drawEmblem(ctx, 'Ronce', CX, CY + 10, 14);
}

/** Herse : une herse de fer, pointes en bas. */
function herse(ctx: Ctx, p: FamilyPalette): void {
  halo(ctx, CX, CY + 10, 96, p.glow, '66');
  ctx.strokeStyle = '#7a808c';
  ctx.lineWidth = 7;
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(CX + i * 22, CY - 74);
    ctx.lineTo(CX + i * 22, CY + 52);
    ctx.stroke();
    ctx.fillStyle = p.accent;
    ctx.beginPath();
    ctx.moveTo(CX + i * 22 - 7, CY + 50); ctx.lineTo(CX + i * 22, CY + 74); ctx.lineTo(CX + i * 22 + 7, CY + 50);
    ctx.closePath();
    ctx.fill();
  }
  ctx.lineWidth = 6;
  for (let j = 0; j < 4; j++) {
    ctx.beginPath();
    ctx.moveTo(CX - 76, CY - 56 + j * 32);
    ctx.lineTo(CX + 76, CY - 56 + j * 32);
    ctx.stroke();
  }
  ctx.strokeStyle = `${p.light}cc`;
  ctx.lineWidth = 2;
  ctx.strokeRect(CX - 80, CY - 80, 160, 132);
}

// ---------------------------------------------------------------------------------------------- Astre

/** Boussole : une rose des vents et son aiguille. */
function boussole(ctx: Ctx, p: FamilyPalette): void {
  halo(ctx, CX, CY, 92, p.glow, '77');
  ctx.strokeStyle = p.accent;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(CX, CY, 66, 0, TAU);
  ctx.stroke();
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU;
    const r0 = i % 4 === 0 ? 50 : 58;
    ctx.beginPath();
    ctx.moveTo(CX + Math.cos(a) * r0, CY + Math.sin(a) * r0);
    ctx.lineTo(CX + Math.cos(a) * 64, CY + Math.sin(a) * 64);
    ctx.stroke();
  }
  ctx.fillStyle = p.ink;
  star4(ctx, CX, CY, 50, 0.16);
  ctx.fill();
  ctx.fillStyle = p.glow;
  ctx.beginPath();
  ctx.moveTo(CX, CY - 52); ctx.lineTo(CX + 9, CY); ctx.lineTo(CX - 9, CY);
  ctx.closePath();
  ctx.fill();
}

/** Comète : une tête lumineuse et sa longue traîne. */
function comete(ctx: Ctx, p: FamilyPalette, rng: Rng): void {
  for (let i = 0; i < 26; i++) {
    const t = i / 26;
    ctx.fillStyle = `${p.accent}${Math.round((1 - t) * 160).toString(16).padStart(2, '0')}`;
    ctx.beginPath();
    ctx.arc(CX + 46 - t * 140, CY - 44 + t * 110, 16 * (1 - t) + 2, 0, TAU);
    ctx.fill();
  }
  for (let i = 0; i < 20; i++) {
    ctx.fillStyle = `${p.ink}aa`;
    ctx.beginPath();
    ctx.arc(CX - 60 + rng() * 120, CY - 70 + rng() * 150, 0.8 + rng() * 1.2, 0, TAU);
    ctx.fill();
  }
  starDot(ctx, p, CX + 46, CY - 44, 10);
}

/** Constellation : des étoiles reliées par des traits. */
function constellation(ctx: Ctx, p: FamilyPalette): void {
  halo(ctx, CX, CY, 96, p.glow, '55');
  const pts: Array<[number, number]> = [[-62, -46], [-24, -62], [14, -30], [56, -52], [38, 14], [-6, 34], [-52, 18]];
  ctx.strokeStyle = `${p.accent}cc`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(CX + x, CY + y) : ctx.moveTo(CX + x, CY + y)));
  ctx.lineTo(CX - 62, CY - 46);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(CX + 14, CY - 30); ctx.lineTo(CX - 6, CY + 34);
  ctx.stroke();
  pts.forEach(([x, y], i) => starDot(ctx, p, CX + x, CY + y, i % 3 === 0 ? 5 : 3.5));
}

/** Sextant : l'arc gradué, le bras et la lunette. */
function sextant(ctx: Ctx, p: FamilyPalette): void {
  halo(ctx, CX, CY, 92, p.glow, '66');
  ctx.strokeStyle = p.accent;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(CX, CY - 60, 120, Math.PI / 2 - 0.5, Math.PI / 2 + 0.5);
  ctx.stroke();
  ctx.lineWidth = 1.5;
  for (let i = 0; i <= 12; i++) {
    const a = Math.PI / 2 - 0.5 + (i / 12);
    ctx.beginPath();
    ctx.moveTo(CX + Math.cos(a) * 112, CY - 60 + Math.sin(a) * 112);
    ctx.lineTo(CX + Math.cos(a) * 120, CY - 60 + Math.sin(a) * 120);
    ctx.stroke();
  }
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(CX, CY - 60); ctx.lineTo(CX + Math.cos(Math.PI / 2 - 0.5) * 120, CY - 60 + Math.sin(Math.PI / 2 - 0.5) * 120);
  ctx.moveTo(CX, CY - 60); ctx.lineTo(CX + Math.cos(Math.PI / 2 + 0.5) * 120, CY - 60 + Math.sin(Math.PI / 2 + 0.5) * 120);
  ctx.moveTo(CX, CY - 60); ctx.lineTo(CX + 18, CY + 58);
  ctx.stroke();
  ctx.fillStyle = p.light;
  ctx.fillRect(CX - 44, CY - 4, 50, 12);
  starDot(ctx, p, CX + 54, CY - 62, 6);
}

/** Équinoxe : un disque mi-jour mi-nuit. */
function equinoxe(ctx: Ctx, p: FamilyPalette): void {
  halo(ctx, CX, CY, 100, p.glow, '77');
  ctx.fillStyle = p.ink;
  ctx.beginPath();
  ctx.arc(CX, CY, 62, Math.PI / 2, -Math.PI / 2);
  ctx.fill();
  ctx.fillStyle = '#0c0a18';
  ctx.beginPath();
  ctx.arc(CX, CY, 62, -Math.PI / 2, Math.PI / 2);
  ctx.fill();
  ctx.strokeStyle = p.accent;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(CX, CY, 62, 0, TAU);
  ctx.moveTo(CX, CY - 80); ctx.lineTo(CX, CY + 80);
  ctx.stroke();
  starDot(ctx, p, CX + 30, CY - 16, 4);
  ctx.fillStyle = p.glow;
  ctx.beginPath();
  ctx.arc(CX - 30, CY + 6, 12, 0, TAU);
  ctx.fill();
}

/** Harmonie : trois anneaux entrelacés. */
function harmonie(ctx: Ctx, p: FamilyPalette): void {
  halo(ctx, CX, CY, 96, p.glow, '66');
  const rings: Array<[number, number, string]> = [[-26, 16, '#ff7a2e'], [26, 16, '#8fdc6a'], [0, -26, p.accent]];
  for (const [x, y, c] of rings) {
    glow(ctx, c, 10, () => {
      ctx.strokeStyle = c;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(CX + x, CY + y, 38, 0, TAU);
      ctx.stroke();
    });
  }
}

/** Zénith : une étoile au sommet d'un arc, et son rayon qui monte. */
function zenith(ctx: Ctx, p: FamilyPalette): void {
  ctx.strokeStyle = `${p.accent}88`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(CX, CY + 90, 140, Math.PI + 0.3, -0.3);
  ctx.stroke();
  const g = ctx.createLinearGradient(CX, CY + 80, CX, CY - 90);
  g.addColorStop(0, `${p.glow}00`);
  g.addColorStop(1, p.ink);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(CX - 10, CY + 80); ctx.lineTo(CX, CY - 80); ctx.lineTo(CX + 10, CY + 80);
  ctx.closePath();
  ctx.fill();
  halo(ctx, CX, CY - 52, 60, p.glow, 'aa');
  glow(ctx, p.accent, 16, () => {
    ctx.fillStyle = '#ffffff';
    star4(ctx, CX, CY - 52, 30, 0.2);
    ctx.fill();
  });
}

/** Solstice : un soleil au-dessus de l'horizon, longs rayons. */
function solstice(ctx: Ctx, p: FamilyPalette): void {
  for (let i = 0; i < 13; i++) {
    const a = Math.PI + (i / 12) * Math.PI;
    ctx.strokeStyle = `${p.accent}99`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(CX + Math.cos(a) * 54, CY + 30 + Math.sin(a) * 54);
    ctx.lineTo(CX + Math.cos(a) * 100, CY + 30 + Math.sin(a) * 100);
    ctx.stroke();
  }
  const g = ctx.createRadialGradient(CX, CY + 30, 4, CX, CY + 30, 48);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.5, p.ink);
  g.addColorStop(1, p.glow);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(CX, CY + 30, 48, Math.PI, 0);
  ctx.fill();
  ctx.strokeStyle = p.light;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(CX - 96, CY + 32); ctx.lineTo(CX + 96, CY + 32);
  ctx.stroke();
  ctx.fillStyle = `${p.deep}cc`;
  ctx.fillRect(CX - 96, CY + 33, 192, 40);
}

/** Les 32 motifs de l'avenant 09. */
export const MOTIFS_09: Readonly<Record<Extract<EffectId, 'tison' | 'escarbille' | 'percee' | 'bravade' | 'surenchere' | 'brulure' | 'fournaise' | 'phenix' | 'leurre' | 'murmure' | 'echo' | 'filombre' | 'ombre' | 'contrejour' | 'eclipse' | 'miroirbrise' | 'epine' | 'bouture' | 'seve' | 'lierre' | 'mur' | 'profondes' | 'rempart' | 'herse' | 'boussole' | 'comete' | 'constellation' | 'sextant' | 'equinoxe' | 'harmonie' | 'zenith' | 'solstice'>, Motif>> = {
  tison, escarbille, percee, bravade, surenchere, brulure, fournaise, phenix,
  leurre, murmure, echo, filombre, ombre, contrejour, eclipse, miroirbrise,
  epine, bouture, seve, lierre, mur, profondes, rempart, herse,
  boussole, comete, constellation, sextant, equinoxe, harmonie, zenith, solstice,
};
