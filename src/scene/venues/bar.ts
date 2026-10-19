/**
 * Lieu « bar » — le Fanal, la taverne du port (M08 C2, ADR 022, amendement « bar et arène » ; après la validation de la
 * rue par le responsable le 2026-10-18). Même grammaire de théâtre que la rue, la scène entière plutôt que les petits
 * objets :
 *
 * - Toile de fond : le mur du fond de la taverne, boiseries sombres, étagères de bouteilles rétroéclairées derrière le
 *   comptoir, barre de navire, tableau de bateau, ardoise, filet de pêche et ses flotteurs ; peinte une fois, floutée et
 *   voilée de fumée.
 * - Décor : long comptoir de bois à rampe de laiton derrière le rival, tabourets, habitués en silhouettes (figurants
 *   peints, de dos), poteaux et poutres qui encadrent l’image comme des coulisses, tonneaux ; deux lampes suspendues
 *   au-dessus du comptoir (lumières pratiques) ; deux photophores de verre rouge aux coins lointains de la table.
 * - Plancher de bois, nappes de fumée qui dérivent sous les lampes.
 * - Plan de feux : salle basse et chaude, ombres brun-rouge, lumières ambrées ; brume brune.
 *
 * Gréement, caméra, table, rival : ceux de l’arène (ADR 022). Tout est peint par code, graine d’art.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { hashString, makeRng } from '../../game/engine/rng';
import { TABLE_TOP } from '../world';
import { canvas, disposeTree, flameTexture, haloTexture, lightPoints, texture, tickLightPoints, type LightPoint } from './common';
import type { VenueDef, VenueSet } from './types';

/** Toile de fond (44 × 22 unités, centrée en y 7,2, z −13) : coordonnées monde → canvas. */
const BW = 2048;
const BH = 1024;
const by = (y: number) => ((18.2 - y) * BH) / 22;
const bx = (x: number) => ((x + 22) * BW) / 44;
const U = BW / 44;

const COUNTER_Z = -9.6;
const COUNTER_TOP = 1.12;
const POST_X = 5.6;
const POST_Z = -6.0;

function barBackdropTexture(seed: number): THREE.CanvasTexture {
  const { c, ctx } = canvas(BW, BH);
  const rng = makeRng(hashString(`bar-backdrop|${seed}`));
  // Boiseries : planches verticales sombres, plus claires à hauteur des lampes.
  const wall = ctx.createLinearGradient(0, by(6.5), 0, by(0));
  wall.addColorStop(0, '#120a07');
  wall.addColorStop(0.45, '#2b1810');
  wall.addColorStop(1, '#170d08');
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, BW, BH);
  for (let x = 0; x < BW; x += 0.42 * U) {
    const l = rng();
    ctx.fillStyle = `rgba(${l < 0.5 ? '0,0,0' : '255,190,130'},${0.03 + rng() * 0.05})`;
    ctx.fillRect(x, 0, 0.42 * U, BH);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(x, 0, 2, BH);
  }
  // Lambris bas et cimaise.
  ctx.fillStyle = '#1b0f0a';
  ctx.fillRect(0, by(1.5), BW, by(0) - by(1.5));
  ctx.fillStyle = '#3a2416';
  ctx.fillRect(0, by(1.55), BW, 6);
  // Meuble du bar : étagères rétroéclairées et bouteilles (centre, derrière le comptoir).
  // Trois étagères sous les lampes ; au-dessus, le mur reste dans l’ombre (le visage reste le point le plus lumineux).
  const shelves = [1.75, 2.55, 3.35];
  const x0 = -6.6;
  const x1 = 6.6;
  ctx.fillStyle = '#0f0806';
  ctx.fillRect(bx(x0) - 10, by(4.05), bx(x1) - bx(x0) + 20, by(1.55) - by(4.05));
  for (const y of shelves) {
    // lueur chaude sous chaque étagère (bandeau de lumière)
    const g = ctx.createLinearGradient(0, by(y + 0.78), 0, by(y));
    g.addColorStop(0, 'rgba(255,170,90,0)');
    g.addColorStop(1, 'rgba(255,170,90,0.13)');
    ctx.fillStyle = g;
    ctx.fillRect(bx(x0), by(y + 0.78), bx(x1) - bx(x0), by(y) - by(y + 0.78));
    // bouteilles
    let x = x0 + 0.1 + rng() * 0.15;
    while (x < x1 - 0.3) {
      const w = 0.16 + rng() * 0.14;
      const h = 0.42 + rng() * 0.32;
      const hue = rng();
      const col: readonly [number, number, number] = hue < 0.3 ? [46, 120, 62] : hue < 0.55 ? [196, 122, 44] : hue < 0.75 ? [150, 30, 40] : hue < 0.88 ? [150, 175, 190] : [70, 50, 110];
      const X = bx(x);
      const W = w * U;
      const T = by(y + h);
      const B = by(y + 0.02);
      const neck = W * 0.32;
      ctx.fillStyle = `rgba(${Math.round(col[0] * 0.5)},${Math.round(col[1] * 0.5)},${Math.round(col[2] * 0.5)},0.8)`;
      ctx.beginPath();
      ctx.moveTo(X, B);
      ctx.lineTo(X, T + (B - T) * 0.42);
      ctx.quadraticCurveTo(X, T + (B - T) * 0.28, X + (W - neck) / 2, T + (B - T) * 0.22);
      ctx.lineTo(X + (W - neck) / 2, T);
      ctx.lineTo(X + (W + neck) / 2, T);
      ctx.lineTo(X + (W + neck) / 2, T + (B - T) * 0.22);
      ctx.quadraticCurveTo(X + W, T + (B - T) * 0.28, X + W, T + (B - T) * 0.42);
      ctx.lineTo(X + W, B);
      ctx.closePath();
      ctx.fill();
      // contre-jour : liseré clair et reflet vertical
      ctx.strokeStyle = `rgba(${Math.min(255, col[0] + 90)},${Math.min(255, col[1] + 70)},${Math.min(255, col[2] + 50)},0.42)`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,235,200,0.28)';
      ctx.fillRect(X + W * 0.2, T + (B - T) * 0.45, Math.max(1.5, W * 0.12), (B - T) * 0.45);
      if (rng() < 0.4) {
        ctx.fillStyle = 'rgba(200,180,150,0.4)';
        ctx.fillRect(X + W * 0.1, T + (B - T) * 0.58, W * 0.8, (B - T) * 0.18);
      }
      x += w + 0.04 + rng() * 0.08;
    }
    // planche de l’étagère
    ctx.fillStyle = '#4a2c18';
    ctx.fillRect(bx(x0), by(y), bx(x1) - bx(x0), 5);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(bx(x0), by(y) + 5, bx(x1) - bx(x0), 3);
  }
  // Montants du meuble.
  ctx.fillStyle = '#2e1a10';
  for (const x of [x0 - 0.12, -2.25, 2.25, x1]) ctx.fillRect(bx(x), by(4.05), 0.12 * U, by(1.55) - by(4.05));
  ctx.fillStyle = '#3d2414';
  ctx.fillRect(bx(x0) - 14, by(4.15), bx(x1) - bx(x0) + 28, 0.14 * U);
  // Barre de navire (à gauche, entre le bord et le poteau).
  {
    const cx = bx(-10.2);
    const cy = by(3.3);
    const r = 0.75 * U;
    ctx.strokeStyle = '#5a3820';
    ctx.lineWidth = 9;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 5;
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * r * 1.35, cy + Math.sin(a) * r * 1.35); ctx.stroke();
    }
    ctx.fillStyle = '#6a4426';
    ctx.beginPath(); ctx.arc(cx, cy, 0.16 * U, 0, Math.PI * 2); ctx.fill();
  }
  // Tableau d’un trois-mâts (à gauche du meuble).
  {
    const X = bx(-8.1);
    const Y = by(4.1);
    const W = 1.15 * U;
    const H = 0.85 * U;
    ctx.fillStyle = '#6b4a24';
    ctx.fillRect(X - 6, Y - 6, W + 12, H + 12);
    const sea = ctx.createLinearGradient(0, Y, 0, Y + H);
    sea.addColorStop(0, '#3a4a5c');
    sea.addColorStop(0.6, '#2a3a48');
    sea.addColorStop(1, '#1a2632');
    ctx.fillStyle = sea;
    ctx.fillRect(X, Y, W, H);
    ctx.fillStyle = '#d9cfb4';
    for (const [dx, h] of [[0.3, 0.55], [0.5, 0.65], [0.7, 0.5]] as const) {
      ctx.beginPath(); ctx.moveTo(X + W * dx, Y + H * 0.75); ctx.lineTo(X + W * dx, Y + H * (0.75 - h)); ctx.lineTo(X + W * (dx + 0.12), Y + H * 0.7); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#2a1a10';
    ctx.fillRect(X + W * 0.2, Y + H * 0.74, W * 0.62, H * 0.08);
  }
  // Ardoise (à droite du meuble) : traits de craie et un pique de cartes, sans texte.
  {
    const X = bx(7.2);
    const Y = by(4.2);
    const W = 1.5 * U;
    const H = 1.05 * U;
    ctx.fillStyle = '#5a3a20';
    ctx.fillRect(X - 7, Y - 7, W + 14, H + 14);
    ctx.fillStyle = '#1c2420';
    ctx.fillRect(X, Y, W, H);
    ctx.strokeStyle = 'rgba(230,230,220,0.55)';
    ctx.lineWidth = 2;
    for (let k = 0; k < 5; k++) {
      const yy = Y + 12 + k * (H - 24) / 5;
      ctx.beginPath(); ctx.moveTo(X + 10, yy); for (let x = X + 10; x < X + W * (0.55 + rng() * 0.3); x += 8) ctx.lineTo(x, yy + (rng() - 0.5) * 3); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(230,230,220,0.6)';
    ctx.beginPath(); ctx.moveTo(X + W * 0.82, Y + H * 0.3); ctx.bezierCurveTo(X + W * 0.95, Y + H * 0.45, X + W * 0.86, Y + H * 0.6, X + W * 0.82, Y + H * 0.52); ctx.bezierCurveTo(X + W * 0.78, Y + H * 0.6, X + W * 0.69, Y + H * 0.45, X + W * 0.82, Y + H * 0.3); ctx.fill();
  }
  // Filet de pêche drapé en haut à droite, flotteurs de verre.
  {
    ctx.strokeStyle = 'rgba(150,120,80,0.45)';
    ctx.lineWidth = 1.5;
    for (let k = 0; k < 14; k++) {
      ctx.beginPath(); ctx.moveTo(bx(8 + k * 0.28), by(5.6)); ctx.quadraticCurveTo(bx(9 + k * 0.2), by(4.6), bx(10.6 + k * 0.1), by(4.9 - k * 0.05)); ctx.stroke();
    }
    for (const [x, y, col] of [[8.6, 5.1, '#2f7a6a'], [9.7, 4.75, '#3a6aa0'], [10.8, 4.9, '#5a8a3a']] as const) {
      const g = ctx.createRadialGradient(bx(x) - 4, by(y) - 4, 1, bx(x), by(y), 0.2 * U);
      g.addColorStop(0, '#d8f0e8');
      g.addColorStop(0.35, col);
      g.addColorStop(1, '#0c1a18');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(bx(x), by(y), 0.2 * U, 0, Math.PI * 2); ctx.fill();
    }
  }
  // Lueurs des lampes suspendues sur le mur du fond.
  for (const x of [-2.1, 2.1]) {
    const g = ctx.createRadialGradient(bx(x), by(3.0), 6, bx(x), by(3.0), 2.2 * U);
    g.addColorStop(0, 'rgba(255,180,100,0.26)');
    g.addColorStop(1, 'rgba(255,150,70,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, BW, BH);
  }
  // Fumée plus dense derrière la tête du rival : le visage reste le point le plus lumineux (rapport visage / fond ≥ 6).
  {
    const g = ctx.createRadialGradient(bx(0), by(3.6), 0.4 * U, bx(0), by(3.6), 4.6 * U);
    g.addColorStop(0, 'rgba(14,8,6,0.5)');
    g.addColorStop(0.6, 'rgba(14,8,6,0.22)');
    g.addColorStop(1, 'rgba(14,8,6,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, BW, BH);
  }
  // Perspective atmosphérique (flou, voile de fumée chaude, côtés et plafond dans l’ombre), une fois dans la texture.
  const sharp = canvas(BW, BH);
  sharp.ctx.drawImage(c, 0, 0);
  ctx.clearRect(0, 0, BW, BH);
  ctx.filter = 'blur(2.5px)';
  ctx.drawImage(sharp.c, 0, 0);
  ctx.filter = 'none';
  const smoke = ctx.createLinearGradient(0, by(6), 0, by(0));
  smoke.addColorStop(0, 'rgba(8,4,3,0.86)');
  smoke.addColorStop(0.28, 'rgba(10,6,4,0.6)');
  smoke.addColorStop(0.42, 'rgba(60,38,28,0.12)');
  smoke.addColorStop(0.75, 'rgba(60,38,28,0.1)');
  smoke.addColorStop(1, 'rgba(10,6,4,0.3)');
  ctx.fillStyle = smoke;
  ctx.fillRect(0, 0, BW, BH);
  const sides = ctx.createLinearGradient(0, 0, BW, 0);
  sides.addColorStop(0, 'rgba(4,2,2,0.6)');
  sides.addColorStop(0.3, 'rgba(4,2,2,0)');
  sides.addColorStop(0.7, 'rgba(4,2,2,0)');
  sides.addColorStop(1, 'rgba(4,2,2,0.6)');
  ctx.fillStyle = sides;
  ctx.fillRect(0, 0, BW, BH);
  return texture(c, 2);
}

/** Plancher : lames de bois le long de la profondeur, joints sombres, nœuds, patine. */
function floorTexture(seed: number): THREE.CanvasTexture {
  const S = 512;
  const { c, ctx } = canvas(S, S);
  const rng = makeRng(hashString(`bar-plancher|${seed}`));
  const lames = 8;
  const w = S / lames;
  for (let i = 0; i < lames; i++) {
    const l = 38 + Math.floor(rng() * 16);
    ctx.fillStyle = `rgb(${l + 12},${l},${Math.floor(l * 0.7)})`;
    ctx.fillRect(i * w, 0, w, S);
    for (let k = 0; k < 10; k++) {
      ctx.strokeStyle = `rgba(0,0,0,${0.06 + rng() * 0.08})`;
      ctx.lineWidth = 1 + rng() * 2;
      const x = i * w + rng() * w;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.bezierCurveTo(x + (rng() - 0.5) * 8, S * 0.33, x + (rng() - 0.5) * 8, S * 0.66, x, S); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(i * w, 0, 2, S);
    const cut = rng() * S;
    ctx.fillRect(i * w, cut, w, 2);
  }
  const t = texture(c, 8);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(14, 9);
  return t;
}

/** Habitué assis au comptoir, de dos (figurant peint) : trois silhouettes (chapeau, casquette, chope levée). */
function patronTexture(kind: 0 | 1 | 2): THREE.CanvasTexture {
  const W = 256;
  const H = 384;
  const { c, ctx } = canvas(W, H);
  ctx.fillStyle = '#140b08';
  ctx.beginPath();
  // dos et épaules
  ctx.moveTo(48, H);
  ctx.lineTo(56, 230);
  ctx.quadraticCurveTo(64, 172, 128, 166);
  ctx.quadraticCurveTo(192, 172, 200, 230);
  ctx.lineTo(208, H);
  ctx.closePath();
  ctx.fill();
  // tête
  ctx.beginPath(); ctx.ellipse(128, 130, 34, 40, 0, 0, Math.PI * 2); ctx.fill();
  if (kind === 0) {
    // chapeau à bord
    ctx.beginPath(); ctx.ellipse(128, 104, 66, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(96, 104); ctx.lineTo(102, 62); ctx.quadraticCurveTo(128, 52, 154, 62); ctx.lineTo(160, 104); ctx.closePath(); ctx.fill();
  } else if (kind === 1) {
    // casquette et écharpe
    ctx.beginPath(); ctx.ellipse(124, 100, 40, 22, -0.1, Math.PI, 0); ctx.fill();
    ctx.fillRect(84, 98, 50, 8);
    ctx.fillStyle = '#2a120e';
    ctx.fillRect(92, 168, 72, 22);
  } else {
    // bras levé, chope
    ctx.beginPath(); ctx.moveTo(190, 210); ctx.quadraticCurveTo(232, 160, 220, 108); ctx.lineTo(204, 104); ctx.quadraticCurveTo(208, 156, 176, 196); ctx.closePath(); ctx.fill();
    ctx.fillRect(196, 70, 34, 40);
    ctx.fillStyle = 'rgba(230,200,150,0.5)';
    ctx.fillRect(198, 64, 30, 8);
  }
  // liseré de lumière chaude (lampes du comptoir) sur le haut de la silhouette
  ctx.globalCompositeOperation = 'source-atop';
  const rim = ctx.createLinearGradient(0, 40, 0, 230);
  rim.addColorStop(0, 'rgba(255,170,90,0.35)');
  rim.addColorStop(0.5, 'rgba(255,150,80,0.08)');
  rim.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = rim;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';
  return texture(c, 2);
}

/** Nappe de fumée : volutes chaudes, raccordables en x (dérive par décalage de texture). */
function smokeTexture(seed: number): THREE.CanvasTexture {
  const { c, ctx } = canvas(512, 128);
  const rng = makeRng(hashString(`bar-fumee|${seed}`));
  for (let i = 0; i < 40; i++) {
    const x = rng() * 512;
    const y = 30 + rng() * 70;
    const r = 26 + rng() * 64;
    for (const dx of [-512, 0, 512]) {
      const g = ctx.createRadialGradient(x + dx, y, 0, x + dx, y, r);
      g.addColorStop(0, 'rgba(150,120,98,0.14)');
      g.addColorStop(1, 'rgba(150,120,98,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x + dx - r, y - r, 2 * r, 2 * r);
    }
  }
  const t = texture(c, 1);
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

function mountBar({ artSeed }: { artSeed: number }): VenueSet {
  const group = new THREE.Group();
  const rng = makeRng(hashString(`bar|${artSeed}`));

  // --- Toile de fond et plancher
  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(44, 22), new THREE.MeshBasicMaterial({ map: barBackdropTexture(artSeed), fog: false }));
  backdrop.position.set(0, 7.2, -13);
  group.add(backdrop);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), new THREE.MeshStandardMaterial({ map: floorTexture(artSeed), roughness: 0.55, metalness: 0.05 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, -2);
  group.add(floor);

  // --- Comptoir (corps, plateau verni, rampe de laiton), tabourets, poteaux, poutres, tonneaux
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a170d, roughness: 0.75 });
  const varnish = new THREE.MeshStandardMaterial({ color: 0x5a3219, roughness: 0.32, metalness: 0.08 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xc8954e, roughness: 0.3, metalness: 0.85 });
  const counterBody = new THREE.Mesh(new THREE.BoxGeometry(18, COUNTER_TOP - 0.06, 0.8), dark);
  counterBody.position.set(0, (COUNTER_TOP - 0.06) / 2, COUNTER_Z);
  const counterTop = new THREE.Mesh(new THREE.BoxGeometry(18.4, 0.08, 1.0), varnish);
  counterTop.position.set(0, COUNTER_TOP - 0.02, COUNTER_Z + 0.05);
  const railGeo = mergeGeometries([
    new THREE.CylinderGeometry(0.035, 0.035, 18, 8).rotateZ(Math.PI / 2).translate(0, 0.28, COUNTER_Z + 0.62),
    ...[-8, -4, 0, 4, 8].map((x) => new THREE.CylinderGeometry(0.02, 0.02, 0.24, 6).translate(x, 0.16, COUNTER_Z + 0.55)),
  ].map((g) => g.toNonIndexed()))!;
  const rail = new THREE.Mesh(railGeo, brass);
  group.add(counterBody, counterTop, rail);
  const woodParts: THREE.BufferGeometry[] = [];
  // tabourets (assise et pieds)
  for (const x of [-6.4, -4.4, -2.3, 2.3, 4.0, 6.2]) {
    woodParts.push(new THREE.CylinderGeometry(0.26, 0.24, 0.08, 14).translate(x, 0.86, COUNTER_Z + 1.1));
    for (let k = 0; k < 3; k++) {
      const a = (k * Math.PI * 2) / 3 + 0.4;
      woodParts.push(new THREE.CylinderGeometry(0.025, 0.03, 0.84, 5).translate(x + Math.cos(a) * 0.17, 0.42, COUNTER_Z + 1.1 + Math.sin(a) * 0.17));
    }
  }
  // poteaux et poutres (coulisses de la taverne)
  for (const s of [-1, 1]) woodParts.push(new THREE.BoxGeometry(0.36, 5.6, 0.36).translate(s * POST_X, 2.8, POST_Z));
  woodParts.push(new THREE.BoxGeometry(14, 0.32, 0.4).translate(0, 4.82, POST_Z));
  woodParts.push(new THREE.BoxGeometry(18, 0.3, 0.36).translate(0, 4.95, -9.2));
  for (const s of [-1, 1]) woodParts.push(new THREE.BoxGeometry(0.5, 0.22, 0.6).rotateZ(s * 0.6).translate(s * (POST_X - 0.32), 4.52, POST_Z));
  group.add(new THREE.Mesh(mergeGeometries(woodParts.map((g) => g.toNonIndexed()))!, dark));
  // tonneaux (à droite, entre le poteau et le comptoir)
  const barrelMat = new THREE.MeshStandardMaterial({ color: 0x4a2c16, roughness: 0.7 });
  const hoopMat = new THREE.MeshStandardMaterial({ color: 0x2a2622, roughness: 0.5, metalness: 0.6 });
  const barrels: THREE.BufferGeometry[] = [];
  const hoops: THREE.BufferGeometry[] = [];
  for (const [x, y, z, lying] of [[4.6, 0.42, -7.2, true], [4.6, 0.42, -8.15, true], [4.6, 1.22, -7.68, true], [-4.9, 0.5, -7.4, false]] as const) {
    const b = new THREE.CylinderGeometry(0.4, 0.4, 1.0, 14);
    const h = mergeGeometries([0.36, -0.36].map((dy) => new THREE.TorusGeometry(0.41, 0.025, 4, 18).rotateX(Math.PI / 2).translate(0, dy, 0)))!;
    for (const [g, list] of [[b, barrels], [h, hoops]] as const) {
      const gg = g.clone();
      if (lying) gg.rotateZ(Math.PI / 2);
      list.push(gg.translate(x, y, z).toNonIndexed());
    }
  }
  group.add(new THREE.Mesh(mergeGeometries(barrels)!, barrelMat), new THREE.Mesh(mergeGeometries(hoops)!, hoopMat));

  // --- Habitués au comptoir (figurants peints, de dos)
  const patrons: THREE.Mesh[] = [];
  ([[-4.4, 0, 0.0], [4.0, 1, 0.08], [6.2, 2, -0.05]] as const).forEach(([x, k, lean]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 1.72), new THREE.MeshLambertMaterial({ map: patronTexture(k), alphaTest: 0.5 }));
    m.position.set(x, 0.9 + 0.86 - 0.1, COUNTER_Z + 1.12);
    m.rotation.z = lean;
    group.add(m);
    patrons.push(m);
  });

  // --- Lampes suspendues au-dessus du comptoir (abat-jour émaillé, ampoule, cordon), qui se balancent
  const lampPivots: THREE.Group[] = [];
  const shadeMat = new THREE.MeshStandardMaterial({ color: 0x1f3b2c, roughness: 0.35, metalness: 0.5, side: THREE.DoubleSide });
  const bulbMat = new THREE.MeshStandardMaterial({ color: 0x302010, emissive: 0xffd9a0, emissiveIntensity: 2.2 });
  // Deux lampes de part et d’autre de la tête du rival (hors de la zone de repère du fond, M07 L3).
  const lamps = [-2.1, 2.1];
  for (const x of lamps) {
    const pivot = new THREE.Group();
    pivot.position.set(x, 4.95, -8.8);
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.3, 4).translate(0, -0.65, 0), hoopMat);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.3, 18, 1, true).translate(0, -1.42, 0), shadeMat);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8).translate(0, -1.6, 0), bulbMat);
    pivot.add(cord, shade, bulb);
    group.add(pivot);
    lampPivots.push(pivot);
  }

  // --- Photophores de verre rouge aux coins lointains de la table
  const jars = [{ x: -3.7, z: -1.75 }, { x: 3.7, z: -1.75 }];
  const jarGeo = new THREE.CylinderGeometry(0.1, 0.09, 0.2, 14, 1, true).translate(0, 0.1, 0);
  const jarMat = new THREE.MeshStandardMaterial({ color: 0x3a0806, emissive: 0xff6a40, emissiveIntensity: 0.35, roughness: 0.2, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide });
  const jarMeshes = jars.map((j) => {
    const m = new THREE.Mesh(jarGeo, jarMat);
    m.position.set(j.x, TABLE_TOP, j.z);
    group.add(m);
    return m;
  });
  const wicks: LightPoint[] = [
    ...jars.map((j) => ({ x: j.x, y: TABLE_TOP + 0.09, z: j.z, r: 0.04 })),
    ...lamps.map((x) => ({ x, y: 4.95 - 1.66, z: -8.8, r: 0.06 })),
  ];
  const halos = lightPoints(wicks.slice(2), 0.6, 0.03, haloTexture(), 0.1, [1, 0.66, 0.44], rng);
  const jarHalos = lightPoints(wicks.slice(0, 2), 0.36, 0.03, haloTexture(), 0.14, [0.95, 0.5, 0.34], rng);
  const flames = lightPoints(wicks.slice(0, 2), 0.16, 0.03, flameTexture(), 0.35, [1, 0.9, 0.8], rng);
  group.add(halos, jarHalos, flames);
  const pointMats = [halos.material, jarHalos.material, flames.material];

  // --- Nappes de fumée sous les lampes
  const smokeTex = smokeTexture(artSeed);
  const smokes: THREE.Mesh[] = [];
  for (const [y, z, w, h, o] of [[3.0, -7.6, 13, 2.0, 0.3], [2.3, -11.2, 16, 2.4, 0.32]] as const) {
    const tex = smokeTex.clone();
    tex.repeat.set(w / 9, 1);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: o, depthWrite: false }));
    m.position.set(0, y, z);
    group.add(m);
    smokes.push(m);
  }

  return {
    group,
    update(dt, clock, still) {
      tickLightPoints(pointMats, clock, still);
      // Les lampes se balancent à peine (porte qui s’ouvre, courant d’air du port) ; leurs halos suivent.
      const hp = halos.geometry.attributes.position!;
      lampPivots.forEach((p, i) => {
        const a = still ? 0 : Math.sin(clock * 0.9 + i * 1.7) * 0.035;
        p.rotation.z = a;
        hp.setX(i, lamps[i]! + Math.sin(a) * 1.66);
        hp.setY(i, 4.95 - Math.cos(a) * 1.66 + 0.03);
      });
      hp.needsUpdate = true;
      smokes.forEach((m, i) => { const t = (m.material as THREE.MeshBasicMaterial).map!; t.offset.x = still ? i * 0.37 : (t.offset.x + dt * (0.005 + i * 0.002) * (i ? -1 : 1) + 1) % 1; });
    },
    prerender(scale) {
      for (const m of pointMats) m.uniforms.uScale!.value = scale;
    },
    ablatable: { candles: [...jarMeshes, ...lampPivots, halos, jarHalos, flames], banners: patrons, dust: smokes },
    dispose() { disposeTree(group); },
  };
}

const JAR = { color: 0xff7a4c, decay: 1.8, distance: 6, flicker: 'candle' } as const;
const LAMP = { color: 0xffbd78, decay: 1.6, distance: 8, flicker: 'lantern' } as const;

export const BAR: VenueDef = {
  id: 'bar',
  background: 0x0b0605,
  // Fumée brune : le fond de la taverne s’y enfonce, le rival et la table restent nets.
  fog: { color: 0x26150f, near: 11.5, far: 26 },
  // Salle basse et chaude ; projecteurs du visage et de la table un peu plus ambrés que dans la salle de jeu.
  house: { sky: 0xffc08a, ground: 0x1a0c08, intensity: 0.48 },
  key: { color: 0xffdcb2, intensity: 1.75 },
  stage: { color: 0xffc88a, intensity: 1.45 },
  practicals: [
    { pos: [-3.7, TABLE_TOP + 0.45, -1.8], intensity: 1.9, ...JAR },
    { pos: [3.7, TABLE_TOP + 0.45, -1.8], intensity: 1.9, ...JAR },
    { pos: [-2.1, 3.25, -8.8], intensity: 4.2, ...LAMP },
    { pos: [2.1, 3.25, -8.8], intensity: 4.2, ...LAMP },
  ],
  bloom: { strength: 0.32, radius: 0.4, threshold: 1.0 },
  mount: mountBar,
};
