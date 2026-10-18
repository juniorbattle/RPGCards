/**
 * Textures procédurales du rival (Canvas 2D → CanvasTexture), générées UNE fois par
 * (personnalité, artSeed). Aucune image, police ou modèle externe.
 * Les fonctions `*Canvas` dessinent sur un canvas réutilisable (portraits 2D des HUD, M03) ;
 * les fonctions `*Texture` les enveloppent pour Three.js.
 */
import * as THREE from 'three';
import { hashString, makeRng } from '../game/engine/rng';
import { drawEmblem } from '../art/emblems';
import type { Family } from '../game/catalog/cards';
import type { RivalPersonality } from '../presentation/personalities';

/** Apparence dessinable (rival ou joueur). */
export type Look = RivalPersonality['look'];
export interface Figure { id: string; family: Family; look: Look }

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
/** Sur-échantillonnage des textures de tête (M03.2 : le visage occupe ~16 % de la hauteur d’écran). */
const RES = 2;

/** Tête : cou, visage, oreilles, nez, ombrages, cheveux (arrière + mèches avant). Yeux/sourcils/bouche = meshes séparés. */
export function headCanvas(p: Figure, seed: number): HTMLCanvasElement {
  const { c, ctx } = cv(HEAD_W * RES, HEAD_H * RES);
  ctx.scale(RES, RES);
  const L = p.look;
  const rng = makeRng(hashString(`head|${p.id}|${seed}`));
  const cx = 128;
  const cy = 158;
  // cheveux arrière
  ctx.fillStyle = L.hair;
  if (L.hairStyle === 'braid') {
    ctx.beginPath(); ctx.ellipse(cx, cy - 6, 104, 122, 0, 0, Math.PI * 2); ctx.fill();
    // tresse sur l’épaule (maillons alternés, reflets)
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = L.hair;
      ctx.beginPath(); ctx.ellipse(cx + 84 + (i % 2 ? 7 : -3), cy + 66 + i * 21, 15, 12, i % 2 ? -0.5 : 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = L.hairHi;
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(cx + 84 + (i % 2 ? 7 : -3), cy + 63 + i * 21, 9, 5, i % 2 ? -0.5 : 0.5, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = L.hair;
  } else if (L.hairStyle === 'bob') {
    ctx.beginPath(); ctx.moveTo(cx - 108, cy + 70); ctx.quadraticCurveTo(cx - 118, cy - 120, cx, cy - 128); ctx.quadraticCurveTo(cx + 118, cy - 120, cx + 108, cy + 70); ctx.lineTo(cx + 70, cy + 76); ctx.lineTo(cx - 70, cy + 76); ctx.closePath(); ctx.fill();
  } else {
    ctx.beginPath(); ctx.ellipse(cx, cy - 20, 98, 108, 0, 0, Math.PI * 2); ctx.fill();
  }
  // cou court (M03.2 : les épaules montent près du menton) qui se fond dans l’ombre du col
  const neck = ctx.createLinearGradient(0, 226, 0, 292);
  neck.addColorStop(0, L.skinShade);
  neck.addColorStop(0.7, L.skin);
  neck.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = neck;
  ctx.fillRect(cx - 32, 220, 64, 72);
  // ombre portée du menton sur le cou
  ctx.fillStyle = 'rgba(40,18,12,0.35)';
  ctx.beginPath(); ctx.ellipse(cx, cy + 100, 34, 12, 0, 0, Math.PI * 2); ctx.fill();
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
  // modelé (M03) : lumière de bougie sur le front et l’arête du nez, joues rosées, ombre de mâchoire
  ctx.save();
  ctx.clip();
  const hi = ctx.createRadialGradient(cx - 18, cy - 46, 4, cx - 18, cy - 46, 70);
  hi.addColorStop(0, 'rgba(255,240,220,0.32)');
  hi.addColorStop(1, 'rgba(255,240,220,0)');
  ctx.fillStyle = hi;
  ctx.fillRect(0, 0, HEAD_W, HEAD_H);
  for (const s of [-1, 1]) {
    const bl = ctx.createRadialGradient(cx + s * 46, cy + 34, 2, cx + s * 46, cy + 34, 26);
    bl.addColorStop(0, 'rgba(235,110,100,0.26)');
    bl.addColorStop(1, 'rgba(235,110,100,0)');
    ctx.fillStyle = bl;
    ctx.fillRect(0, 0, HEAD_W, HEAD_H);
  }
  const js = ctx.createLinearGradient(0, cy + 40, 0, cy + 112);
  js.addColorStop(0, 'rgba(60,25,15,0)');
  js.addColorStop(1, 'rgba(60,25,15,0.22)');
  ctx.fillStyle = js;
  ctx.fillRect(0, 0, HEAD_W, HEAD_H);
  // M03.2 — modelé peint : ombre propre côté droit, ombre de la ligne des cheveux, rebond chaud de bougie
  const core = ctx.createLinearGradient(cx - 6, 0, cx + 86, 0);
  core.addColorStop(0, 'rgba(70,30,20,0)');
  core.addColorStop(1, 'rgba(70,30,20,0.3)');
  ctx.fillStyle = core;
  ctx.fillRect(0, 0, HEAD_W, HEAD_H);
  const hairline = ctx.createLinearGradient(0, cy - 118, 0, cy - 58);
  hairline.addColorStop(0, 'rgba(45,18,10,0.42)');
  hairline.addColorStop(1, 'rgba(45,18,10,0)');
  ctx.fillStyle = hairline;
  ctx.fillRect(0, 0, HEAD_W, HEAD_H);
  const bounce = ctx.createRadialGradient(cx - 74, cy + 18, 2, cx - 74, cy + 18, 46);
  bounce.addColorStop(0, 'rgba(255,186,110,0.3)');
  bounce.addColorStop(1, 'rgba(255,186,110,0)');
  ctx.fillStyle = bounce;
  ctx.fillRect(0, 0, HEAD_W, HEAD_H);
  ctx.restore();
  ctx.strokeStyle = 'rgba(58,24,16,0.55)';
  ctx.lineWidth = 2.6;
  ctx.stroke();
  // orbites (ombres douces)
  ctx.fillStyle = 'rgba(80,40,30,0.1)';
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(cx + s * 46, cy - 2, 32, 19, 0, 0, Math.PI * 2); ctx.fill(); }
  // nez : ombre douce du côté droit de l’arête, puis trait et narines
  ctx.fillStyle = 'rgba(90,45,30,0.16)';
  ctx.beginPath(); ctx.ellipse(cx + 11, cy + 26, 7, 15, 0.15, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(90,45,30,0.42)';
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(cx + 5, cy + 10); ctx.quadraticCurveTo(cx + 12, cy + 34, cx + 3, cy + 41); ctx.stroke();
  ctx.fillStyle = 'rgba(90,45,30,0.22)';
  ctx.beginPath(); ctx.ellipse(cx - 6, cy + 43, 5, 2.6, 0, 0, Math.PI * 2); ctx.ellipse(cx + 9, cy + 43, 5, 2.6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,240,225,0.25)';
  ctx.beginPath(); ctx.ellipse(cx - 2, cy + 22, 3, 12, 0, 0, Math.PI * 2); ctx.fill();
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
    // raie au milieu, deux pans qui encadrent le visage jusqu’aux épaules (preview M03)
    ctx.beginPath();
    ctx.moveTo(cx, cy - 126);
    ctx.quadraticCurveTo(cx - 70, cy - 128, cx - 90, cy - 40);
    ctx.quadraticCurveTo(cx - 98, cy + 60, cx - 92, cy + 150);
    ctx.lineTo(cx - 74, cy + 150);
    ctx.quadraticCurveTo(cx - 80, cy + 40, cx - 74, cy - 30);
    ctx.quadraticCurveTo(cx - 52, cy - 96, cx - 4, cy - 100);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx, cy - 126);
    ctx.quadraticCurveTo(cx + 70, cy - 128, cx + 90, cy - 40);
    ctx.quadraticCurveTo(cx + 98, cy + 30, cx + 92, cy + 96);
    ctx.lineTo(cx + 76, cy + 96);
    ctx.quadraticCurveTo(cx + 80, cy + 20, cx + 74, cy - 30);
    ctx.quadraticCurveTo(cx + 52, cy - 96, cx + 4, cy - 100);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = L.hairHi;
    ctx.lineWidth = 2.5;
    ctx.globalAlpha = 0.55;
    for (const sgn of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(cx + sgn * (8 + i * 12), cy - 118 + i * 4);
        ctx.quadraticCurveTo(cx + sgn * (62 + i * 6), cy - 100, cx + sgn * (80 + i * 3), cy - 10 + i * 16);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
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
  return c;
}

/** Capuche (tenue « cloak ») : arche d’étoffe derrière la tête, intérieur dans l’ombre (preview M03). */
export function hoodCanvas(p: Figure): HTMLCanvasElement {
  const { c, ctx } = cv(256, 288);
  const L = p.look;
  const g = ctx.createLinearGradient(0, 0, 256, 0);
  g.addColorStop(0, L.cloth);
  g.addColorStop(0.45, L.clothHi);
  g.addColorStop(1, L.cloth);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(14, 288);
  ctx.quadraticCurveTo(0, 40, 128, 8);
  ctx.quadraticCurveTo(256, 40, 242, 288);
  ctx.closePath();
  ctx.fill();
  const inner = ctx.createRadialGradient(128, 150, 20, 128, 150, 120);
  inner.addColorStop(0, 'rgba(10,6,8,0.95)');
  inner.addColorStop(1, 'rgba(10,6,8,0.55)');
  ctx.fillStyle = inner;
  ctx.beginPath();
  ctx.moveTo(40, 288);
  ctx.quadraticCurveTo(30, 60, 128, 36);
  ctx.quadraticCurveTo(226, 60, 216, 288);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = L.trim;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(40, 288); ctx.quadraticCurveTo(30, 60, 128, 36); ctx.quadraticCurveTo(226, 60, 216, 288); ctx.stroke();
  ctx.globalAlpha = 1;
  return c;
}

export function hoodTexture(p: Figure): THREE.CanvasTexture {
  return tex(hoodCanvas(p));
}

export function headTexture(p: Figure, seed: number): THREE.CanvasTexture {
  return tex(headCanvas(p, seed));
}

/** Buste : épaules, vêtement, col, emblème de famille, bras. */
export const TORSO_W = 384;
export const TORSO_H = 320;

export function torsoCanvas(p: Figure, seed: number): HTMLCanvasElement {
  const W = TORSO_W;
  const H = TORSO_H;
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
  // emblème de famille, haut de poitrine (M03.2 : au-dessus de l’éventail de cartes) ; la
  // cape le remplace par son fermoir, la capuche portant déjà la couleur de la famille
  if (p.look.outfit !== 'cloak') {
    ctx.fillStyle = L.trim;
    drawEmblem(ctx, p.family, W / 2 - 92, 84, 22);
  }
  // contour bras
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 4;
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(W / 2 + s * 118, 110); ctx.quadraticCurveTo(W / 2 + s * 130, 220, W / 2 + s * 116, H); ctx.stroke(); }
  return c;
}

export function torsoTexture(p: Figure, seed: number): THREE.CanvasTexture {
  return tex(torsoCanvas(p, seed));
}

/** Œil : sclère + liseré (fixe), iris mobile séparé, paupière séparée. */
export function scleraCanvas(): HTMLCanvasElement {
  const { c, ctx } = cv(64, 40);
  // amande : coins pointus, ombre de paupière sur le haut du blanc
  ctx.fillStyle = '#f8f3ec';
  ctx.beginPath();
  ctx.moveTo(3, 21);
  ctx.quadraticCurveTo(30, -2, 61, 17);
  ctx.quadraticCurveTo(34, 40, 3, 21);
  ctx.fill();
  const sh = ctx.createLinearGradient(0, 4, 0, 22);
  sh.addColorStop(0, 'rgba(120,80,70,0.35)');
  sh.addColorStop(1, 'rgba(120,80,70,0)');
  ctx.fillStyle = sh;
  ctx.fill();
  // trait de cils supérieur épais, avec virgule au coin externe ; cils inférieurs fins
  ctx.strokeStyle = '#1e120e';
  ctx.lineCap = 'round';
  ctx.lineWidth = 4.2;
  ctx.beginPath(); ctx.moveTo(3, 21); ctx.quadraticCurveTo(30, -2, 61, 17); ctx.lineTo(63, 12); ctx.stroke();
  ctx.lineWidth = 1.4;
  ctx.globalAlpha = 0.6;
  ctx.beginPath(); ctx.moveTo(10, 26); ctx.quadraticCurveTo(34, 38, 58, 20); ctx.stroke();
  ctx.globalAlpha = 1;
  return c;
}

export function scleraTexture(): THREE.CanvasTexture {
  return tex(scleraCanvas());
}

export function irisCanvas(color: string): HTMLCanvasElement {
  const { c, ctx } = cv(64, 64);
  const g = ctx.createRadialGradient(32, 34, 3, 32, 32, 30);
  g.addColorStop(0, '#050505');
  g.addColorStop(0.26, '#0d0a0a');
  g.addColorStop(0.32, color);
  g.addColorStop(0.78, color);
  g.addColorStop(1, '#140c0c');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(32, 32, 30, 0, Math.PI * 2); ctx.fill();
  // éclat lumineux du bas de l’iris + deux reflets
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath(); ctx.ellipse(32, 46, 16, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.beginPath(); ctx.arc(22, 21, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.beginPath(); ctx.arc(41, 40, 3, 0, Math.PI * 2); ctx.fill();
  return c;
}

export function irisTexture(color: string): THREE.CanvasTexture {
  return tex(irisCanvas(color));
}

export function lidCanvas(p: Figure): HTMLCanvasElement {
  const { c, ctx } = cv(128, 80);
  // M03.2 : paupière fondue dans le modelé du visage (haut et côtés transparents, plus de bandeau
  // rectangulaire), peau → ombre près du bord ciliaire, puis trait de cils.
  const g = ctx.createLinearGradient(0, 0, 0, 80);
  g.addColorStop(0, p.look.skin);
  g.addColorStop(1, p.look.skinShade);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 80);
  ctx.globalCompositeOperation = 'destination-in';
  const v = ctx.createLinearGradient(0, 0, 0, 80);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(0.45, 'rgba(0,0,0,1)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, 128, 80);
  const hz = ctx.createLinearGradient(0, 0, 128, 0);
  hz.addColorStop(0, 'rgba(0,0,0,0)');
  hz.addColorStop(0.16, 'rgba(0,0,0,1)');
  hz.addColorStop(0.84, 'rgba(0,0,0,1)');
  hz.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = hz;
  ctx.fillRect(0, 0, 128, 80);
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = '#1a0f0c';
  ctx.lineCap = 'round';
  ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(6, 74); ctx.quadraticCurveTo(64, 84, 122, 74); ctx.stroke();
  return c;
}

export function lidTexture(p: Figure): THREE.CanvasTexture {
  return tex(lidCanvas(p));
}

export function browCanvas(p: Figure): HTMLCanvasElement {
  const { c, ctx } = cv(64, 16);
  ctx.fillStyle = p.look.hairStyle === 'bob' ? '#8a8aa8' : p.look.hair;
  ctx.beginPath(); ctx.moveTo(2, 13); ctx.quadraticCurveTo(26, -1, 62, 7); ctx.lineTo(61, 10); ctx.quadraticCurveTo(28, 6, 5, 16); ctx.closePath(); ctx.fill();
  return c;
}

export function browTexture(p: Figure): THREE.CanvasTexture {
  return tex(browCanvas(p));
}

export type MouthShape = 'neutral' | 'smile' | 'grin' | 'frown' | 'grimace' | 'open' | 'smirk' | 'tight';
export const MOUTHS: MouthShape[] = ['neutral', 'smile', 'grin', 'frown', 'grimace', 'open', 'smirk', 'tight'];

export function mouthCanvas(shape: MouthShape): HTMLCanvasElement {
  const { c, ctx } = cv(96, 48);
  const lip = '#7a3030';
  ctx.lineCap = 'round';
  ctx.strokeStyle = lip;
  ctx.lineWidth = 5;
  const W = 96;
  switch (shape) {
    case 'neutral':
      // lèvre inférieure pleine (rosée) sous la ligne de bouche
      ctx.fillStyle = 'rgba(196,110,100,0.85)';
      ctx.beginPath(); ctx.moveTo(30, 25); ctx.quadraticCurveTo(48, 37, 66, 25); ctx.quadraticCurveTo(48, 28, 30, 25); ctx.fill();
      ctx.beginPath(); ctx.moveTo(26, 24); ctx.quadraticCurveTo(48, 27, 70, 24); ctx.stroke(); break;
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
  return c;
}

export function mouthTexture(shape: MouthShape): THREE.CanvasTexture {
  return tex(mouthCanvas(shape));
}
