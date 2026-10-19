/**
 * Lieu « salle » — le Cercle, salle de jeu de cartes (M08 C2, ADR 022) : décor historique du duel (M03 « salle aux
 * bougies », M07 L3 mise en scène HD-2D), migré tel quel depuis `arena.ts`, au pixel près.
 *
 * - Fond peint (arches, ciel nocturne étoilé, pierre chaude), piliers, piédestaux, balustrade, bannières des quatre
 *   familles derrière le rival, plantes, bougies vacillantes (corps instanciés + flammes / halos en points animés par
 *   shader, 2 appels de dessin), poussières dorées.
 * - Plan de feux : salle baissée (ambiance 0,62), projecteur du visage, projecteur de table, deux bougies de table et
 *   deux bougies de salle ; brume bleu ardoise (M07 L3).
 */
import * as THREE from 'three';
import type { Family } from '../../game/catalog/cards';
import { hashString, makeRng } from '../../game/engine/rng';
import { drawEmblem } from '../../art/emblems';
import { FAMILY_PALETTE } from '../../art/palette';
import { TABLE_TOP } from '../world';
import { canvas, disposeTree, flameTexture, haloTexture, lightPoints, texture, tickLightPoints, type Ctx2, type LightPoint } from './common';
import type { VenueDef, VenueSet } from './types';

/** Fond peint : mur de pierre chaude, grandes arches ouvertes sur un ciel nocturne étoilé. */
function backdropTexture(seed: number): THREE.CanvasTexture {
  const W = 2048;
  const H = 1024;
  const { c, ctx } = canvas(W, H);
  const rng = makeRng(hashString(`backdrop|${seed}`));
  // Ciel (peint partout, le mur le recouvre hors des arches)
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#050a1e');
  sky.addColorStop(0.55, '#10204c');
  sky.addColorStop(1, '#22306a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 900; i++) {
    const x = rng() * W;
    const y = rng() * H * 0.85;
    const r = rng() < 0.94 ? 0.6 + rng() * 1.1 : 1.6 + rng() * 1.6;
    ctx.fillStyle = `rgba(255,${235 + Math.floor(rng() * 20)},${210 + Math.floor(rng() * 45)},${0.35 + rng() * 0.65})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const moon = ctx.createRadialGradient(W * 0.83, H * 0.2, 4, W * 0.83, H * 0.2, 160);
  moon.addColorStop(0, 'rgba(220,230,255,0.55)');
  moon.addColorStop(1, 'rgba(120,150,255,0)');
  ctx.fillStyle = moon;
  ctx.fillRect(0, 0, W, H);
  // Mur percé d’arches : on peint le mur dans un calque puis on évide les arches.
  const wall = canvas(W, H);
  const wg = wall.ctx.createLinearGradient(0, 0, 0, H);
  wg.addColorStop(0, '#2a1c15');
  wg.addColorStop(0.6, '#3a2617');
  wg.addColorStop(1, '#1c130e');
  wall.ctx.fillStyle = wg;
  wall.ctx.fillRect(0, 0, W, H);
  // appareillage de pierre
  wall.ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  wall.ctx.lineWidth = 2;
  for (let y = 0; y < H; y += 46) {
    const off = (y / 46) % 2 ? 0 : 60;
    for (let x = -off; x < W; x += 120) {
      wall.ctx.strokeRect(x + rng() * 3, y, 120, 46);
    }
  }
  wall.ctx.fillStyle = 'rgba(255,170,90,0.04)';
  for (let i = 0; i < 160; i++) wall.ctx.fillRect(rng() * W, rng() * H, 40 + rng() * 80, 10 + rng() * 20);
  const arches = [
    { x: 0.1, w: 0.12, top: 0.18, bottom: 0.84 },
    { x: 0.27, w: 0.13, top: 0.12, bottom: 0.84 },
    { x: 0.5, w: 0.2, top: 0.06, bottom: 0.84 },
    { x: 0.73, w: 0.13, top: 0.12, bottom: 0.84 },
    { x: 0.9, w: 0.12, top: 0.18, bottom: 0.84 },
  ];
  const archPath = (g: Ctx2, a: (typeof arches)[number], grow = 0) => {
    const cx = a.x * W;
    const hw = (a.w * W) / 2 + grow;
    const top = a.top * H - grow;
    const bot = a.bottom * H + grow;
    g.beginPath();
    g.moveTo(cx - hw, bot);
    g.lineTo(cx - hw, top + hw);
    g.arc(cx, top + hw, hw, Math.PI, 0);
    g.lineTo(cx + hw, bot);
    g.closePath();
  };
  // moulures
  for (const a of arches) {
    archPath(wall.ctx, a, 22);
    wall.ctx.fillStyle = '#3a271c';
    wall.ctx.fill();
    archPath(wall.ctx, a, 10);
    wall.ctx.strokeStyle = 'rgba(226,186,120,0.45)';
    wall.ctx.lineWidth = 3;
    wall.ctx.stroke();
  }
  wall.ctx.globalCompositeOperation = 'destination-out';
  for (const a of arches) { archPath(wall.ctx, a); wall.ctx.fill(); }
  wall.ctx.globalCompositeOperation = 'source-over';
  // meneaux des fenêtres latérales
  ctx.drawImage(wall.c, 0, 0);
  ctx.strokeStyle = 'rgba(30,20,16,0.9)';
  ctx.lineWidth = 7;
  for (const a of arches) {
    if (a.x === 0.5) continue;
    ctx.beginPath();
    ctx.moveTo(a.x * W, a.top * H + 20);
    ctx.lineTo(a.x * W, a.bottom * H);
    ctx.moveTo(a.x * W - (a.w * W) / 2, (a.top + 0.32) * H);
    ctx.lineTo(a.x * W + (a.w * W) / 2, (a.top + 0.32) * H);
    ctx.stroke();
  }
  // grande arche centrale : tenture sombre (derrière les bannières)
  const drape = ctx.createLinearGradient(0, 0, 0, H);
  drape.addColorStop(0, 'rgba(20,10,12,0.55)');
  drape.addColorStop(1, 'rgba(10,6,8,0.9)');
  archPath(ctx, arches[2]!);
  ctx.fillStyle = drape;
  ctx.fill();
  // halos chauds des bougies peints sur le mur
  for (const [x, y, r] of [[0.19, 0.62, 170], [0.81, 0.62, 170], [0.36, 0.7, 120], [0.64, 0.7, 120]] as const) {
    const g = ctx.createRadialGradient(x * W, y * H, 4, x * W, y * H, r);
    g.addColorStop(0, 'rgba(255,170,80,0.42)');
    g.addColorStop(1, 'rgba(255,140,60,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  // sol / pied du mur
  const foot = ctx.createLinearGradient(0, H * 0.8, 0, H);
  foot.addColorStop(0, 'rgba(14,9,8,0)');
  foot.addColorStop(1, 'rgba(14,9,8,1)');
  ctx.fillStyle = foot;
  ctx.fillRect(0, H * 0.8, W, H * 0.2);
  // M07 L3 : plan du fond repoussé (perspective atmosphérique), peint une fois dans la texture, sans coût
  // par image : léger flou de profondeur, voile froid plus dense en haut, côtés plongés dans l’ombre.
  const sharp = canvas(W, H);
  sharp.ctx.drawImage(c, 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.filter = 'blur(3px)';
  ctx.drawImage(sharp.c, 0, 0);
  ctx.filter = 'none';
  const haze = ctx.createLinearGradient(0, 0, 0, H);
  haze.addColorStop(0, 'rgba(18,22,52,0.38)');
  haze.addColorStop(0.7, 'rgba(18,20,44,0.16)');
  haze.addColorStop(1, 'rgba(10,8,14,0.1)');
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, W, H);
  const sides = ctx.createLinearGradient(0, 0, W, 0);
  sides.addColorStop(0, 'rgba(6,5,10,0.6)');
  sides.addColorStop(0.3, 'rgba(6,5,10,0)');
  sides.addColorStop(0.7, 'rgba(6,5,10,0)');
  sides.addColorStop(1, 'rgba(6,5,10,0.6)');
  ctx.fillStyle = sides;
  ctx.fillRect(0, 0, W, H);
  return texture(c, 2);
}

/** Bannière d’une famille : étoffe, liseré doré, grand emblème lumineux, pointe (M03.2 : plus courte,
 *  1:2, pour rester entière au-dessus du rival agrandi). */
function bannerTexture(family: Family, seed: number): THREE.CanvasTexture {
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

/** Feuillage (plante en pot) en silhouette éclairée, sur fond transparent. */
function plantTexture(seed: number): THREE.CanvasTexture {
  const { c, ctx } = canvas(256, 256);
  const rng = makeRng(hashString(`plant|${seed}`));
  ctx.fillStyle = '#2a1a12';
  ctx.beginPath(); ctx.moveTo(92, 256); ctx.lineTo(100, 196); ctx.lineTo(156, 196); ctx.lineTo(164, 256); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#4a3022';
  ctx.fillRect(94, 192, 68, 10);
  for (let i = 0; i < 46; i++) {
    const a = -Math.PI / 2 + (rng() - 0.5) * 2.6;
    const len = 50 + rng() * 80;
    const x0 = 128 + (rng() - 0.5) * 20;
    const y0 = 196;
    const x1 = x0 + Math.cos(a) * len;
    const y1 = y0 + Math.sin(a) * len;
    const shade = 30 + Math.floor(rng() * 50);
    ctx.fillStyle = `rgb(${shade * 0.5},${shade + 30},${shade * 0.6})`;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo((x0 + x1) / 2 + 14, (y0 + y1) / 2, x1, y1);
    ctx.quadraticCurveTo((x0 + x1) / 2 - 14, (y0 + y1) / 2, x0, y0);
    ctx.fill();
  }
  return texture(c, 1);
}

function floorTexture(seed: number): THREE.CanvasTexture {
  const { c, ctx } = canvas(512, 512);
  const rng = makeRng(hashString(`floor|${seed}`));
  ctx.fillStyle = '#120c0a';
  ctx.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 64) {
    for (let x = 0; x < 512; x += 64) {
      const l = 18 + Math.floor(rng() * 12);
      ctx.fillStyle = `rgb(${l + 8},${l + 3},${l})`;
      ctx.fillRect(x + 2, y + 2, 60, 60);
    }
  }
  const t = texture(c, 4);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(6, 6);
  return t;
}

function mountSalle({ artSeed }: { artSeed: number }): VenueSet {
  const group = new THREE.Group();
  // --- Fond peint, sol, architecture
  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(44, 22), new THREE.MeshBasicMaterial({ map: backdropTexture(artSeed), fog: false }));
  backdrop.position.set(0, 7.2, -13);
  group.add(backdrop);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), new THREE.MeshStandardMaterial({ map: floorTexture(artSeed), roughness: 0.6, metalness: 0.05 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, -2);
  group.add(floor);

  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x3a2a22, roughness: 0.85 });
  const darkStone = new THREE.MeshStandardMaterial({ color: 0x241914, roughness: 0.9 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xc89a52, roughness: 0.35, metalness: 0.8 });
  // piliers hauts (avec chapiteau) + piédestaux bas
  for (const s of [-1, 1]) {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.58, 9, 12), stoneMat);
    pillar.position.set(s * 7.4, 4.5, -8.2);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.35, 1.5), darkStone);
    cap.position.set(s * 7.4, 3.0, -8.2);
    group.add(pillar, cap);
    for (const [x, z, hgt] of [[5.6, -6.8, 1.7], [9.2, -3.8, 1.4]] as const) {
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, hgt, 10), stoneMat);
      ped.position.set(s * x, hgt / 2, z);
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.12, 10), darkStone);
      top.position.set(s * x, hgt + 0.06, z);
      group.add(ped, top);
    }
  }
  // balustrade derrière le rival
  const rail = new THREE.Mesh(new THREE.BoxGeometry(18, 0.18, 0.4), darkStone);
  rail.position.set(0, 2.05, -8.9);
  const railBase = new THREE.Mesh(new THREE.BoxGeometry(18, 1.9, 0.3), new THREE.MeshStandardMaterial({ color: 0x1c130f, roughness: 0.9 }));
  railBase.position.set(0, 1.0, -8.95);
  group.add(rail, railBase);

  // bannières des quatre familles (ordre de la preview : Cendre, Ronce | rival | Astre, Voile)
  const bannerOrder: Family[] = ['Cendre', 'Ronce', 'Astre', 'Voile'];
  const bannerX = [-3.5, -1.85, 1.85, 3.5];
  const banners: THREE.Mesh[] = [];
  const rods: THREE.Mesh[] = [];
  bannerOrder.forEach((f, i) => {
    const mat = new THREE.MeshStandardMaterial({ map: bannerTexture(f, artSeed), transparent: true, side: THREE.DoubleSide, roughness: 0.85, emissive: new THREE.Color(0xffffff), emissiveMap: null, emissiveIntensity: 0 });
    mat.emissiveMap = mat.map;
    mat.emissiveIntensity = 0.32;
    const b = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 1.9), mat);
    b.position.set(bannerX[i]!, 2.6, -7.2);
    group.add(b);
    banners.push(b);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.2, 6), brass);
    rod.rotation.z = Math.PI / 2;
    rod.position.set(bannerX[i]!, 3.57, -7.18);
    group.add(rod);
    rods.push(rod);
  });

  // plantes en pot (silhouettes éclairées)
  const plantTex = plantTexture(artSeed);
  for (const [x, z, s] of [[-6.4, -6.2, 2.2], [6.6, -6.0, 2.4], [-8.6, -3.4, 1.9], [8.8, -3.2, 2.0]] as const) {
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(s, s), new THREE.MeshLambertMaterial({ map: plantTex, transparent: true, alphaTest: 0.08, side: THREE.DoubleSide }));
    pl.position.set(x, s / 2 + (z > -5 ? 1.5 : 0), z);
    group.add(pl);
  }

  // --- Bougies : corps instanciés + flammes/halos en points animés (2 draw calls)
  const candles: Array<{ x: number; y: number; z: number; h: number; r: number }> = [];
  const crng = makeRng(hashString(`candles|${artSeed}`));
  const cluster = (x: number, baseY: number, z: number, n: number, hMax: number) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + crng();
      const d = n > 1 ? 0.16 + crng() * 0.08 : 0;
      candles.push({ x: x + Math.cos(a) * d, y: baseY, z: z + Math.sin(a) * d, h: hMax * (0.45 + 0.55 * (1 - i / n)), r: 0.06 + crng() * 0.03 });
    }
  };
  for (const s of [-1, 1]) {
    cluster(s * 3.7, TABLE_TOP, -1.75, 3, 0.55);
    cluster(s * 5.6, 1.76, -6.8, 3, 0.5);
    cluster(s * 9.2, 1.46, -3.8, 2, 0.45);
    cluster(s * 7.4, 3.18, -8.2, 2, 0.5);
    for (const x of [2.6, 4.6, 6.4]) cluster(s * x, 2.14, -8.85, 1, 0.3 + crng() * 0.15);
  }
  const bodyGeo = new THREE.CylinderGeometry(1, 1, 1, 10);
  // M07 L3 : cire moins blanche et moins lumineuse — les bougies accompagnent la scène sans attirer l’œil.
  const bodies = new THREE.InstancedMesh(bodyGeo, new THREE.MeshStandardMaterial({ color: 0xd8c39e, roughness: 0.6, emissive: 0xffa860, emissiveIntensity: 0.14 }), candles.length);
  const m4 = new THREE.Matrix4();
  candles.forEach((cd, i) => {
    m4.compose(new THREE.Vector3(cd.x, cd.y + cd.h / 2, cd.z), new THREE.Quaternion(), new THREE.Vector3(cd.r, cd.h, cd.r));
    bodies.setMatrixAt(i, m4);
  });
  group.add(bodies);
  const wicks: LightPoint[] = candles.map((cd) => ({ x: cd.x, y: cd.y + cd.h, z: cd.z, r: cd.r }));
  const halos = lightPoints(wicks, 0.5, 0.06, haloTexture(), 0.18, [0.8, 0.66, 0.52], crng); // M07 L3 : halos plus discrets (le bloom s’y ajoute)
  const flames = lightPoints(wicks, 0.2, 0.06, flameTexture(), 0.35, [1, 1, 1], crng);
  group.add(halos, flames);
  const pointMats = [flames.material, halos.material];

  // --- Poussières dorées
  const N = 140;
  const prng = makeRng(hashString(`motes|${artSeed}`));
  const mpos = new Float32Array(N * 3);
  const speed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    mpos[i * 3] = (prng() - 0.5) * 18;
    mpos[i * 3 + 1] = prng() * 7;
    mpos[i * 3 + 2] = -1 - prng() * 9;
    speed[i] = 0.05 + prng() * 0.18;
  }
  const motesGeo = new THREE.BufferGeometry();
  motesGeo.setAttribute('position', new THREE.BufferAttribute(mpos, 3));
  const motes = new THREE.Points(motesGeo, new THREE.PointsMaterial({ color: 0xffcf8a, size: 0.04, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
  group.add(motes);

  return {
    group,
    update(dt, clock, still) {
      const arr = motesGeo.attributes.position!.array as Float32Array;
      for (let i = 0; i < N; i++) {
        arr[i * 3 + 1]! += speed[i]! * dt;
        if (arr[i * 3 + 1]! > 7) arr[i * 3 + 1] = 0;
      }
      motesGeo.attributes.position!.needsUpdate = true;
      tickLightPoints(pointMats, clock, still);
      banners.forEach((b, i) => { b.rotation.y = still ? 0 : Math.sin(clock * 0.6 + i * 1.3) * 0.035; });
    },
    prerender(scale) {
      for (const m of pointMats) m.uniforms.uScale!.value = scale;
    },
    ablatable: { candles: [bodies, halos, flames], banners: [...banners, ...rods], dust: [motes] },
    dispose() { disposeTree(group); },
  };
}

const CANDLE = { color: 0xffa458, distance: 8, decay: 1.8, flicker: 'candle' } as const;

export const SALLE: VenueDef = {
  id: 'salle',
  background: 0x0a0708,
  // M07 L3 : perspective atmosphérique — les plans lointains (piliers, balustrade, plantes, bannières) tirent
  // vers un bleu ardoise (pas vers le noir : ils restent lisibles en silhouettes) ; le voile commence derrière
  // le rival et le bord de la table (≈ 11,4 depuis la caméra), qui restent nets et chauds.
  fog: { color: 0x232a44, near: 12.5, far: 30 },
  // M07 L3 — plan de feux de théâtre : la salle baisse (ambiance), deux projecteurs découpent le visage du rival
  // et la table ; le reste de la salle ne garde que les bougies et le contre-jour.
  house: { sky: 0xffd4a4, ground: 0x2a1a14, intensity: 0.62 },
  key: { color: 0xffe2bc, intensity: 1.75 },
  stage: { color: 0xffd6a6, intensity: 1.5 },
  // M07 L3 : bougies de table plus discrètes (2,2), la table a son projecteur ; bougies de salle à 3,4.
  practicals: [
    { pos: [-3.6, TABLE_TOP + 0.7, -1.9], intensity: 2.2, ...CANDLE },
    { pos: [3.6, TABLE_TOP + 0.7, -1.9], intensity: 2.2, ...CANDLE },
    { pos: [-5.6, 2.4, -6.4], intensity: 3.4, ...CANDLE },
    { pos: [5.6, 2.4, -6.4], intensity: 3.4, ...CANDLE },
  ],
  bloom: { strength: 0.3, radius: 0.4, threshold: 1.0 },
  mount: mountSalle,
};
