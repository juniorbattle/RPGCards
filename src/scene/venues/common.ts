/**
 * Outils communs des lieux (M08 C2, ADR 022) : canvas et textures peintes en code, flammes et halos en points
 * animés par shader (bougies de la salle, lanternes de la rue…), libération d’un décor.
 * Aucun asset externe ; chaque peinture a sa propre graine (graine d’art + nom de l’élément).
 */
import * as THREE from 'three';
import type { Family } from '../../game/catalog/cards';
import { hashString, makeRng } from '../../game/engine/rng';
import { drawEmblem } from '../../art/emblems';
import { FAMILY_PALETTE } from '../../art/palette';

export type Ctx2 = CanvasRenderingContext2D;

export function canvas(w: number, h: number): { c: HTMLCanvasElement; ctx: Ctx2 } {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return { c, ctx: c.getContext('2d')! };
}

export function texture(c: HTMLCanvasElement, aniso = 4): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  return t;
}

/** Bannière d’une famille : étoffe, liseré doré, grand emblème lumineux, pointe (M03.2 : plus courte,
 *  1:2, pour rester entière au-dessus du rival agrandi). */
export function bannerTexture(family: Family, seed: number): THREE.CanvasTexture {
  const W = 256;
  const H = 512;
  const { c, ctx } = canvas(W, H);
  const p = FAMILY_PALETTE[family];
  const rng = makeRng(hashString(`banner|${family}|${seed}`));
  const base: Record<Family, [string, string]> = { Cendre: ['#8a1e12', '#3a0906'], Ronce: ['#1f5a2a', '#0b2410'], Astre: ['#16224f', '#070b22'], Voile: ['#244bb0', '#0c1a4e'] };
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, base[family][0]);
  g.addColorStop(1, base[family][1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // plis verticaux
  for (let i = 0; i < 7; i++) {
    const x = 18 + i * 36 + rng() * 8;
    const fold = ctx.createLinearGradient(x - 14, 0, x + 14, 0);
    fold.addColorStop(0, 'rgba(0,0,0,0)');
    fold.addColorStop(0.5, 'rgba(0,0,0,0.22)');
    fold.addColorStop(1, 'rgba(255,255,255,0.03)');
    ctx.fillStyle = fold;
    ctx.fillRect(x - 14, 0, 28, H);
  }
  // liseré doré
  ctx.strokeStyle = '#d9b26a';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(14, 0); ctx.lineTo(14, H - 100); ctx.lineTo(W / 2, H - 34); ctx.lineTo(W - 14, H - 100); ctx.lineTo(W - 14, 0);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,220,150,0.6)';
  ctx.beginPath();
  ctx.moveTo(26, 0); ctx.lineTo(26, H - 112); ctx.lineTo(W / 2, H - 52); ctx.lineTo(W - 26, H - 112); ctx.lineTo(W - 26, 0);
  ctx.stroke();
  // losange décoratif + emblème lumineux
  const ey = 170;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.moveTo(W / 2, ey - 112); ctx.lineTo(W / 2 + 86, ey); ctx.lineTo(W / 2, ey + 112); ctx.lineTo(W / 2 - 86, ey); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#d9b26a';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.shadowColor = p.glow;
  ctx.shadowBlur = 28;
  ctx.fillStyle = family === 'Astre' ? p.accent : family === 'Cendre' ? '#ffd9a0' : p.accent;
  drawEmblem(ctx, family, W / 2, ey, 60);
  ctx.shadowBlur = 0;
  // petits motifs
  for (let i = 0; i < 2; i++) {
    ctx.fillStyle = `${p.accent}${i % 2 ? '55' : '88'}`;
    drawEmblem(ctx, family, W / 2, 330 + i * 44, 10 + (i % 2) * 4);
  }
  // pointe
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.moveTo(0, H); ctx.lineTo(0, H - 98); ctx.lineTo(W / 2, H - 28); ctx.lineTo(W, H - 98); ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();
  return texture(c);
}

/** Flamme : goutte lumineuse (cœur blanc-jaune → orange → transparent), sur un sprite carré. */
export function flameTexture(): THREE.CanvasTexture {
  const { c, ctx } = canvas(64, 128);
  const g = ctx.createRadialGradient(32, 88, 2, 32, 80, 40);
  g.addColorStop(0, 'rgba(255,255,235,1)');
  g.addColorStop(0.25, 'rgba(255,214,120,0.95)');
  g.addColorStop(0.6, 'rgba(255,130,40,0.55)');
  g.addColorStop(1, 'rgba(255,90,20,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(32, 10);
  ctx.bezierCurveTo(46, 52, 52, 78, 46, 98);
  ctx.quadraticCurveTo(32, 120, 18, 98);
  ctx.bezierCurveTo(12, 78, 18, 52, 32, 10);
  ctx.fill();
  const t = texture(c, 1);
  return t;
}

export function haloTexture(): THREE.CanvasTexture {
  const { c, ctx } = canvas(128, 128);
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,190,110,0.85)');
  g.addColorStop(0.25, 'rgba(255,160,70,0.35)');
  g.addColorStop(1, 'rgba(255,120,40,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return texture(c, 1);
}

const POINT_VERT = `
attribute float size;
attribute float phase;
attribute vec3 tint;
uniform float uTime;
uniform float uScale;
uniform float uStill;
uniform float uFlicker;
varying float vAlpha;
varying vec3 vTint;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float f = uStill > 0.5 ? 1.0 : 1.0 - uFlicker + uFlicker * (0.55 + 0.45 * sin(uTime * 9.0 + phase) * sin(uTime * 5.3 + phase * 1.7));
  gl_PointSize = size * f * uScale / max(0.1, -mv.z);
  vAlpha = 0.75 + 0.25 * f;
  vTint = tint;
  gl_Position = projectionMatrix * mv;
}`;
const POINT_FRAG = `
uniform sampler2D map;
varying float vAlpha;
varying vec3 vTint;
void main() {
  vec4 t = texture2D(map, gl_PointCoord);
  gl_FragColor = vec4(t.rgb * vTint, t.a * vAlpha);
}`;

/** Source lumineuse ponctuelle : base de la flamme (`y`) et rayon de la mèche ou du verre (`r`). */
export interface LightPoint { x: number; y: number; z: number; r: number }

/**
 * Flammes ou halos de plusieurs sources en UN appel de dessin : points additifs dont la taille suit la
 * projection (`uScale`, posé par `prerender`) et vacille par shader (`uFlicker`, phase tirée de `rng`).
 */
export function lightPoints(srcs: readonly LightPoint[], sizeK: number, yOff: number, tex: THREE.Texture, flicker: number, tint: readonly [number, number, number], rng: () => number): THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial> {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(srcs.length * 3);
  const size = new Float32Array(srcs.length);
  const phase = new Float32Array(srcs.length);
  const tints = new Float32Array(srcs.length * 3);
  srcs.forEach((s, i) => {
    pos[i * 3] = s.x;
    pos[i * 3 + 1] = s.y + yOff;
    pos[i * 3 + 2] = s.z;
    size[i] = sizeK * (0.8 + s.r * 3);
    phase[i] = rng() * 20;
    tints[i * 3] = tint[0]; tints[i * 3 + 1] = tint[1]; tints[i * 3 + 2] = tint[2];
  });
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('size', new THREE.BufferAttribute(size, 1));
  geo.setAttribute('phase', new THREE.BufferAttribute(phase, 1));
  geo.setAttribute('tint', new THREE.BufferAttribute(tints, 3));
  const mat = new THREE.ShaderMaterial({
    uniforms: { map: { value: tex }, uTime: { value: 0 }, uScale: { value: 300 }, uStill: { value: 0 }, uFlicker: { value: flicker } },
    vertexShader: POINT_VERT, fragmentShader: POINT_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  return pts;
}

/** Temps et échelle des points lumineux (flammes, halos) d’un décor. */
export function tickLightPoints(mats: readonly THREE.ShaderMaterial[], clock: number, still: boolean): void {
  for (const m of mats) {
    m.uniforms.uTime!.value = clock;
    m.uniforms.uStill!.value = still ? 1 : 0;
  }
}

/** Libère un décor entier : géométries, matériaux et leurs textures (cartes et uniformes de shader). */
export function disposeTree(root: THREE.Object3D): void {
  const textures = new Set<THREE.Texture>();
  const materials = new Set<THREE.Material>();
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    m.geometry?.dispose();
    const mat = m.material as THREE.Material | THREE.Material[] | undefined;
    for (const x of Array.isArray(mat) ? mat : mat ? [mat] : []) materials.add(x);
  });
  for (const m of materials) {
    for (const v of Object.values(m)) if (v instanceof THREE.Texture) textures.add(v);
    const u = (m as THREE.ShaderMaterial).uniforms;
    if (u) for (const x of Object.values(u)) if (x?.value instanceof THREE.Texture) textures.add(x.value);
    m.dispose();
  }
  for (const t of textures) t.dispose();
}
