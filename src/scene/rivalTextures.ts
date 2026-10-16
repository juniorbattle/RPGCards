/**
 * Textures procédurales du rival (Canvas 2D → CanvasTexture), générées UNE fois par
 * (personnalité, artSeed). Aucune image, police ou modèle externe.
 */
import * as THREE from 'three';
import { hashString, makeRng } from '../game/engine/rng';
import { drawEmblem } from '../art/emblems';
import type { RivalPersonality } from '../presentation/personalities';

type Ctx = CanvasRenderingContext2D;

function cv(w: number, h: number): { c: HTMLCanvasElement; ctx: Ctx } {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return { c, ctx: c.getContext('2d')! };
}

function tex(c: HTMLCanvasElement): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export const HEAD_W = 256;
export const HEAD_H = 312;

/** Tête : cou, visage, oreilles, nez, ombrages, cheveux (arrière + mèches avant). Yeux/sourcils/bouche = meshes séparés. */
export function headTexture(p: RivalPersonality, seed: number): THREE.CanvasTexture {
  const { c, ctx } = cv(HEAD_W, HEAD_H);
  const L = p.look;
  const rng = makeRng(hashString(`head|${p.id}|${seed}`));
  const cx = 128;
  const cy = 158;
  // cheveux arrière
  ctx.fillStyle = L.hair;
  if (L.hairStyle === 'braid') {
    ctx.beginPath(); ctx.ellipse(cx, cy - 6, 104, 122, 0, 0, Math.PI * 2); ctx.fill();
    // tresse sur l’épaule
    for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.ellipse(cx + 86 + (i % 2) * 6, cy + 70 + i * 22, 16, 13, 0.3, 0, Math.PI * 2); ctx.fill(); }
  } else if (L.hairStyle === 'bob') {
    ctx.beginPath(); ctx.moveTo(cx - 108, cy + 70); ctx.quadraticCurveTo(cx - 118, cy - 120, cx, cy - 128); ctx.quadraticCurveTo(cx + 118, cy - 120, cx + 108, cy + 70); ctx.lineTo(cx + 70, cy + 76); ctx.lineTo(cx - 70, cy + 76); ctx.closePath(); ctx.fill();
  } else {
    ctx.beginPath(); ctx.ellipse(cx, cy - 20, 98, 108, 0, 0, Math.PI * 2); ctx.fill();
  }
  // cou
  const neck = ctx.createLinearGradient(0, 230, 0, HEAD_H);
  neck.addColorStop(0, L.skinShade);
  neck.addColorStop(1, L.skin);
  ctx.fillStyle = neck;
  ctx.fillRect(cx - 34, 220, 68, HEAD_H - 220);
  // oreilles
  ctx.fillStyle = L.skinShade;
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(cx + s * 84, cy + 4, 13, 24, 0, 0, Math.PI * 2); ctx.fill(); }
  // visage (mâchoire paramétrique)
  const jaw = L.jaw;
  const face = ctx.createRadialGradient(cx - 20, cy - 30, 10, cx, cy, 120);
  face.addColorStop(0, L.skin);
  face.addColorStop(1, L.skinShade);
  ctx.fillStyle = face;
  ctx.beginPath();
  ctx.moveTo(cx - 80, cy - 40);
  ctx.quadraticCurveTo(cx - 84, cy - 120, cx, cy - 122);
  ctx.quadraticCurveTo(cx + 84, cy - 120, cx + 80, cy - 40);
  ctx.quadraticCurveTo(cx + 82 - jaw * 6, cy + 50, cx + 30 + jaw * 14, cy + 92);
  ctx.quadraticCurveTo(cx, cy + 112 - jaw * 8, cx - 30 - jaw * 14, cy + 92);
  ctx.quadraticCurveTo(cx - 82 + jaw * 6, cy + 50, cx - 80, cy - 40);
  ctx.fill();
  // orbites (ombres douces)
  ctx.fillStyle = 'rgba(80,40,30,0.12)';
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(cx + s * 44, cy - 2, 30, 18, 0, 0, Math.PI * 2); ctx.fill(); }
  // nez
  ctx.strokeStyle = 'rgba(90,45,30,0.55)';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(cx + 4, cy + 8); ctx.quadraticCurveTo(cx + 12, cy + 34, cx + 2, cy + 42); ctx.stroke();
  ctx.fillStyle = 'rgba(90,45,30,0.25)';
  ctx.beginPath(); ctx.ellipse(cx - 6, cy + 44, 6, 3, 0, 0, Math.PI * 2); ctx.ellipse(cx + 10, cy + 44, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
  // marques distinctives
  if (L.mark === 'scar') { ctx.strokeStyle = 'rgba(150,60,50,0.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx + 52, cy - 34); ctx.lineTo(cx + 68, cy + 18); ctx.stroke(); }
  if (L.mark === 'freckles') { ctx.fillStyle = 'rgba(120,60,30,0.45)'; for (let i = 0; i < 22; i++) { const s = rng() < 0.5 ? -1 : 1; ctx.beginPath(); ctx.arc(cx + s * (26 + rng() * 34), cy + 18 + rng() * 18, 1.6, 0, Math.PI * 2); ctx.fill(); } }
  if (L.mark === 'beauty') { ctx.fillStyle = '#3a2028'; ctx.beginPath(); ctx.arc(cx + 40, cy + 62, 3, 0, Math.PI * 2); ctx.fill(); }
  // mèches avant
  ctx.fillStyle = L.hair;
  if (L.hairStyle === 'spiky') {
    ctx.beginPath(); ctx.moveTo(cx - 96, cy - 40);
    for (let i = 0; i <= 8; i++) { const x = cx - 96 + i * 24; ctx.lineTo(x + 12, cy - 150 - rng() * 30); ctx.lineTo(x + 24, cy - 70 - rng() * 16); }
    ctx.lineTo(cx + 96, cy - 40); ctx.quadraticCurveTo(cx, cy - 100, cx - 96, cy - 40); ctx.fill();
    ctx.strokeStyle = L.hairHi; ctx.lineWidth = 4; ctx.globalAlpha = 0.7;
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(cx - 60 + i * 28, cy - 80); ctx.lineTo(cx - 52 + i * 28, cy - 136); ctx.stroke(); }
    ctx.globalAlpha = 1;
  } else if (L.hairStyle === 'braid') {
    ctx.beginPath(); ctx.moveTo(cx - 84, cy - 30); ctx.quadraticCurveTo(cx - 70, cy - 132, cx + 8, cy - 128); ctx.quadraticCurveTo(cx + 92, cy - 120, cx + 84, cy - 30); ctx.quadraticCurveTo(cx + 40, cy - 92, cx - 10, cy - 86); ctx.quadraticCurveTo(cx - 60, cy - 84, cx - 84, cy - 30); ctx.fill();
  } else {
    ctx.beginPath(); ctx.moveTo(cx - 92, cy - 10); ctx.quadraticCurveTo(cx - 96, cy - 128, cx, cy - 126); ctx.quadraticCurveTo(cx + 96, cy - 128, cx + 92, cy - 10); ctx.lineTo(cx + 76, cy - 64); ctx.quadraticCurveTo(cx + 20, cy - 70, cx - 20, cy - 58); ctx.quadraticCurveTo(cx - 70, cy - 54, cx - 92, cy - 10); ctx.fill();
    ctx.strokeStyle = L.hairHi; ctx.globalAlpha = 0.5; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx, cy - 40, 92, Math.PI * 1.15, Math.PI * 1.55); ctx.stroke(); ctx.globalAlpha = 1;
  }
  if (L.headband) {
    ctx.fillStyle = L.trim;
    ctx.fillRect(cx - 86, cy - 84, 172, 12);
    ctx.fillStyle = L.cloth;
    drawEmblem(ctx, p.family, cx, cy - 78, 9);
  }
  return tex(c);
}

/** Buste : épaules, vêtement, col, emblème de famille, bras. */
export function torsoTexture(p: RivalPersonality, seed: number): THREE.CanvasTexture {
  const W = 384;
  const H = 320;
  const { c, ctx } = cv(W, H);
  const L = p.look;
  const rng = makeRng(hashString(`torso|${p.id}|${seed}`));
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, L.clothHi);
  g.addColorStop(0.5, L.cloth);
  g.addColorStop(1, '#0b0810');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 60, 18);
  ctx.quadraticCurveTo(W / 2 - 170, 30, W / 2 - 180, 120);
  ctx.lineTo(W / 2 - 168, H);
  ctx.lineTo(W / 2 + 168, H);
  ctx.lineTo(W / 2 + 180, 120);
  ctx.quadraticCurveTo(W / 2 + 170, 30, W / 2 + 60, 18);
  ctx.closePath();
  ctx.fill();
  // plis / motifs
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 6; i++) { const x = W / 2 - 120 + rng() * 240; ctx.beginPath(); ctx.moveTo(x, 120 + rng() * 40); ctx.quadraticCurveTo(x + (rng() - 0.5) * 30, 220, x + (rng() - 0.5) * 20, H); ctx.stroke(); }
  // col / capuche / revers
  ctx.fillStyle = L.trim;
  if (p.look.outfit === 'cloak') {
    ctx.globalAlpha = 0.9; ctx.fillStyle = L.clothHi;
    ctx.beginPath(); ctx.ellipse(W / 2, 30, 120, 40, 0, Math.PI, 0); ctx.fill(); ctx.globalAlpha = 1;
    ctx.fillStyle = L.trim; ctx.beginPath(); ctx.arc(W / 2, 64, 12, 0, Math.PI * 2); ctx.fill();
  } else if (p.look.outfit === 'jacket') {
    ctx.beginPath(); ctx.moveTo(W / 2 - 60, 18); ctx.lineTo(W / 2 - 18, 120); ctx.lineTo(W / 2 - 40, 140); ctx.lineTo(W / 2 - 90, 30); ctx.fill();
    ctx.beginPath(); ctx.moveTo(W / 2 + 60, 18); ctx.lineTo(W / 2 + 18, 120); ctx.lineTo(W / 2 + 40, 140); ctx.lineTo(W / 2 + 90, 30); ctx.fill();
  } else {
    ctx.fillRect(W / 2 - 6, 30, 12, H - 30);
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(W / 2 + 20, 70 + i * 44, 5, 0, Math.PI * 2); ctx.fill(); }
  }
  // emblème de famille
  ctx.fillStyle = L.trim;
  drawEmblem(ctx, p.family, W / 2 - 92, 120, 22);
  // contour bras
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 4;
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(W / 2 + s * 118, 110); ctx.quadraticCurveTo(W / 2 + s * 130, 220, W / 2 + s * 116, H); ctx.stroke(); }
  return tex(c);
}

export function handTexture(p: RivalPersonality): THREE.CanvasTexture {
  const { c, ctx } = cv(128, 128);
  const L = p.look;
  ctx.fillStyle = L.cloth;
  ctx.fillRect(28, 0, 72, 40);
  ctx.fillStyle = L.trim;
  ctx.fillRect(28, 34, 72, 8);
  ctx.fillStyle = L.skin;
  ctx.beginPath(); ctx.ellipse(64, 76, 34, 30, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = L.skinShade;
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(40 + i * 16, 104, 7, 12, 0, 0, Math.PI * 2); ctx.fill(); }
  return tex(c);
}

/** Œil : sclère + liseré (fixe), iris mobile séparé, paupière séparée. */
export function scleraTexture(): THREE.CanvasTexture {
  const { c, ctx } = cv(64, 40);
  ctx.fillStyle = '#f6f1ea';
  ctx.beginPath(); ctx.ellipse(32, 20, 30, 17, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#2a1a16';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(32, 20, 30, 17, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
  return tex(c);
}

export function irisTexture(color: string): THREE.CanvasTexture {
  const { c, ctx } = cv(64, 64);
  const g = ctx.createRadialGradient(32, 32, 4, 32, 32, 30);
  g.addColorStop(0, '#000');
  g.addColorStop(0.3, '#111');
  g.addColorStop(0.35, color);
  g.addColorStop(1, '#1a1010');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(32, 32, 30, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath(); ctx.arc(22, 22, 6, 0, Math.PI * 2); ctx.fill();
  return tex(c);
}

export function lidTexture(p: RivalPersonality): THREE.CanvasTexture {
  const { c, ctx } = cv(64, 40);
  ctx.fillStyle = p.look.skinShade;
  ctx.fillRect(0, 0, 64, 40);
  ctx.strokeStyle = '#1a0f0c';
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(0, 38); ctx.quadraticCurveTo(32, 42, 64, 38); ctx.stroke();
  return tex(c);
}

export function browTexture(p: RivalPersonality): THREE.CanvasTexture {
  const { c, ctx } = cv(64, 16);
  ctx.fillStyle = p.look.hairStyle === 'bob' ? '#8a8aa8' : p.look.hair;
  ctx.beginPath(); ctx.moveTo(2, 12); ctx.quadraticCurveTo(30, 0, 62, 6); ctx.lineTo(60, 12); ctx.quadraticCurveTo(30, 8, 4, 15); ctx.closePath(); ctx.fill();
  return tex(c);
}

export type MouthShape = 'neutral' | 'smile' | 'grin' | 'frown' | 'grimace' | 'open' | 'smirk' | 'tight';
export const MOUTHS: MouthShape[] = ['neutral', 'smile', 'grin', 'frown', 'grimace', 'open', 'smirk', 'tight'];

export function mouthTexture(shape: MouthShape): THREE.CanvasTexture {
  const { c, ctx } = cv(96, 48);
  const lip = '#7a3030';
  ctx.lineCap = 'round';
  ctx.strokeStyle = lip;
  ctx.lineWidth = 5;
  const W = 96;
  switch (shape) {
    case 'neutral': ctx.beginPath(); ctx.moveTo(26, 24); ctx.quadraticCurveTo(48, 27, 70, 24); ctx.stroke(); break;
    case 'tight': ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(32, 24); ctx.lineTo(64, 24); ctx.stroke(); break;
    case 'smile': ctx.beginPath(); ctx.moveTo(20, 18); ctx.quadraticCurveTo(48, 38, 76, 18); ctx.stroke(); break;
    case 'smirk': ctx.beginPath(); ctx.moveTo(26, 26); ctx.quadraticCurveTo(52, 30, 74, 16); ctx.stroke(); break;
    case 'frown': ctx.beginPath(); ctx.moveTo(24, 32); ctx.quadraticCurveTo(48, 16, 72, 32); ctx.stroke(); break;
    case 'grin':
      ctx.fillStyle = '#3a1414'; ctx.beginPath(); ctx.moveTo(16, 14); ctx.quadraticCurveTo(48, 46, 80, 14); ctx.quadraticCurveTo(48, 22, 16, 14); ctx.fill();
      ctx.fillStyle = '#f4efe6'; ctx.beginPath(); ctx.moveTo(22, 17); ctx.quadraticCurveTo(48, 26, 74, 17); ctx.lineTo(70, 22); ctx.quadraticCurveTo(48, 28, 26, 22); ctx.fill();
      ctx.stroke(); break;
    case 'grimace':
      ctx.fillStyle = '#f4efe6'; ctx.fillRect(24, 16, W - 48, 16);
      ctx.strokeStyle = '#3a1414'; ctx.lineWidth = 2;
      for (let x = 30; x < W - 24; x += 8) { ctx.beginPath(); ctx.moveTo(x, 16); ctx.lineTo(x, 32); ctx.stroke(); }
      ctx.strokeStyle = lip; ctx.lineWidth = 4; ctx.strokeRect(24, 16, W - 48, 16); break;
    case 'open':
      ctx.fillStyle = '#2a0e0e'; ctx.beginPath(); ctx.ellipse(48, 25, 13, 16, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); break;
  }
  return tex(c);
}
