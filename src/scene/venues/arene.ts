/**
 * Lieu « arène » — l’Arène, le grand duel en public (M08 C2, ADR 022, amendement « bar et arène » ; après la validation
 * de la rue par le responsable le 2026-10-18). Le lieu-spectacle : même grammaire de théâtre, la scène entière plutôt que
 * les petits objets :
 *
 * - Toile de fond : gradins pleins d’une foule en silhouettes et de torches, porte d’honneur dans l’ombre derrière le
 *   rival, grandes bannières des quatre familles au sommet, nuit et faisceaux de projecteurs ; peinte une fois, floutée.
 * - Décor : parapet de pierre en arc de cercle derrière le rival, deux braseros (lumières pratiques) aux flammes hautes et
 *   aux étincelles qui montent, bannières des familles suspendues sur les côtés, coupes de feu aux coins lointains de la
 *   table ; faisceaux de lumière blanche dans la poussière de part et d’autre ; petites lumières qui scintillent dans les
 *   gradins ; sol de sable.
 * - Plan de feux : lumière blanche venue d’en haut sur le visage et la table (les projecteurs de l’arène), feu orange des
 *   braseros, nuit bleu-violet ; la plus forte opposition chaud / froid des quatre lieux.
 *
 * Gréement, caméra, table, rival : ceux de l’arène de duel (ADR 022). Tout est peint par code, graine d’art.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { FAMILIES, type Family } from '../../game/catalog/cards';
import { hashString, makeRng } from '../../game/engine/rng';
import { FAMILY_PALETTE } from '../../art/palette';
import { drawEmblem } from '../../art/emblems';
import { TABLE_TOP } from '../world';
import { bannerTexture, canvas, disposeTree, flameTexture, haloTexture, lightPoints, texture, tickLightPoints, type LightPoint } from './common';
import type { VenueDef, VenueSet } from './types';

const BW = 2048;
const BH = 1024;
const by = (y: number) => ((18.2 - y) * BH) / 22;
const bx = (x: number) => ((x + 22) * BW) / 44;
const U = BW / 44;

const BRAZIER_X = 4.7;
const BRAZIER_Z = -7.0;
const BRAZIER_TOP = 1.45;

function areneBackdropTexture(seed: number): THREE.CanvasTexture {
  const { c, ctx } = canvas(BW, BH);
  const rng = makeRng(hashString(`arene-backdrop|${seed}`));
  // Nuit au-dessus de l’arène.
  const sky = ctx.createLinearGradient(0, 0, 0, by(5));
  sky.addColorStop(0, '#05040c');
  sky.addColorStop(1, '#161430');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, BW, BH);
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = `rgba(220,225,255,${0.2 + rng() * 0.5})`;
    ctx.fillRect(rng() * BW, rng() * by(8), 1.5, 1.5);
  }
  // Faisceaux de projecteurs dans le ciel (de part et d’autre, jamais derrière la tête du rival).
  for (const [x, a] of [[-9, 0.32], [-6.5, 0.12], [6.5, -0.12], [9, -0.32]] as const) {
    ctx.save();
    ctx.translate(bx(x), by(6.2));
    ctx.rotate(a);
    const g = ctx.createLinearGradient(0, 0, 0, -9 * U);
    g.addColorStop(0, 'rgba(200,215,255,0.22)');
    g.addColorStop(1, 'rgba(200,215,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(-0.15 * U, 0); ctx.lineTo(-1.1 * U, -9 * U); ctx.lineTo(1.1 * U, -9 * U); ctx.lineTo(0.15 * U, 0); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  // Gradins : rangées de pierre, foule en silhouettes, torches.
  const rows = 9;
  const y0 = 0.6;
  const y1 = 6.4;
  for (let r = 0; r < rows; r++) {
    const ya = y0 + ((y1 - y0) * r) / rows;
    const yb = y0 + ((y1 - y0) * (r + 1)) / rows;
    const l = 40 + r * 3;
    ctx.fillStyle = `rgb(${l + 10},${l + 5},${l + 12})`;
    ctx.fillRect(0, by(yb), BW, by(ya) - by(yb));
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, by(ya) - 4, BW, 4);
    // spectateurs : têtes et épaules, plus sombres au centre (porte d’honneur)
    let x = rng() * 8;
    while (x < BW) {
      const w = 0.22 * U * (0.8 + rng() * 0.4);
      const cx = x + w / 2;
      const wx = (cx / BW) * 44 - 22;
      if (Math.abs(wx) > 2.6 || ya > 4.6) {
        const shade = 8 + Math.floor(rng() * 14);
        ctx.fillStyle = `rgb(${shade + 6},${shade + 2},${shade + 8})`;
        const top = by(yb) + 4 + rng() * 6;
        ctx.beginPath(); ctx.ellipse(cx, top + w * 0.35, w * 0.28, w * 0.33, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx, top + w * 1.05, w * 0.5, w * 0.42, 0, Math.PI, 0); ctx.fill();
        ctx.fillRect(cx - w * 0.5, top + w * 1.05, w, by(ya) - top - w * 1.05);
        if (rng() < 0.12) {
          // couleur d’une famille (écharpe ou fanion) dans la foule
          const f = FAMILIES[Math.floor(rng() * 4)]!;
          ctx.fillStyle = `${FAMILY_PALETTE[f].accent}88`;
          ctx.fillRect(cx - w * 0.4, top + w * 1.1, w * 0.8, w * 0.18);
        }
      }
      x += w * (0.85 + rng() * 0.3);
    }
  }
  // Porte d’honneur derrière le rival : arche sombre, herse.
  {
    const hw = 2.4 * U;
    const cx = bx(0);
    const top = by(4.8);
    const bot = by(0.6);
    ctx.fillStyle = '#2a2430';
    ctx.beginPath(); ctx.moveTo(cx - hw - 18, bot); ctx.lineTo(cx - hw - 18, top + hw); ctx.arc(cx, top + hw, hw + 18, Math.PI, 0); ctx.lineTo(cx + hw + 18, bot); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#07060a';
    ctx.beginPath(); ctx.moveTo(cx - hw, bot); ctx.lineTo(cx - hw, top + hw); ctx.arc(cx, top + hw, hw, Math.PI, 0); ctx.lineTo(cx + hw, bot); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(60,54,66,0.8)';
    ctx.lineWidth = 4;
    for (let k = -4; k <= 4; k++) { ctx.beginPath(); ctx.moveTo(cx + (k * hw) / 5, top + 30); ctx.lineTo(cx + (k * hw) / 5, bot); ctx.stroke(); }
    for (let k = 1; k < 6; k++) { ctx.beginPath(); ctx.moveTo(cx - hw, top + hw + ((bot - top - hw) * k) / 6); ctx.lineTo(cx + hw, top + hw + ((bot - top - hw) * k) / 6); ctx.stroke(); }
  }
  // Torches dans les gradins (lueurs chaudes, hors de la zone de repère du fond à gauche de la tête).
  for (let i = 0; i < 30; i++) {
    const x = (rng() < 0.5 ? -1 : 1) * (6.2 + rng() * 9.5);
    const y = 1.6 + rng() * 4.2;
    const g = ctx.createRadialGradient(bx(x), by(y), 1, bx(x), by(y), 0.7 * U);
    g.addColorStop(0, 'rgba(255,200,120,0.85)');
    g.addColorStop(0.2, 'rgba(255,150,70,0.3)');
    g.addColorStop(1, 'rgba(255,120,50,0)');
    ctx.fillStyle = g;
    ctx.fillRect(bx(x) - 0.7 * U, by(y) - 0.7 * U, 1.4 * U, 1.4 * U);
  }
  // Grandes bannières des familles au sommet des gradins.
  for (const [i, x] of [-11.5, -8.5, 8.5, 11.5].entries()) {
    const f = FAMILIES[i]!;
    const X = bx(x - 0.7);
    const W = 1.4 * U;
    const T = by(8.2);
    const B = by(5.0);
    const base: Record<Family, string> = { Cendre: '#7a1c12', Ronce: '#1d5228', Astre: '#7a5814', Voile: '#2346a0' };
    ctx.fillStyle = base[f];
    ctx.beginPath(); ctx.moveTo(X, T); ctx.lineTo(X + W, T); ctx.lineTo(X + W, B); ctx.lineTo(X + W / 2, B - 0.35 * U); ctx.lineTo(X, B); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#c9a25e';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = FAMILY_PALETTE[f].accent;
    drawEmblem(ctx, f, X + W / 2, by(6.9), 0.35 * U);
  }
  // Perspective atmosphérique : flou, poussière lumineuse au ras de l’arène, côtés dans l’ombre.
  const sharp = canvas(BW, BH);
  sharp.ctx.drawImage(c, 0, 0);
  ctx.clearRect(0, 0, BW, BH);
  ctx.filter = 'blur(2.5px)';
  ctx.drawImage(sharp.c, 0, 0);
  ctx.filter = 'none';
  const haze = ctx.createLinearGradient(0, by(7), 0, by(0));
  haze.addColorStop(0, 'rgba(10,8,20,0.5)');
  haze.addColorStop(0.5, 'rgba(40,34,60,0.12)');
  haze.addColorStop(1, 'rgba(60,46,40,0.2)');
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, BW, BH);
  const sides = ctx.createLinearGradient(0, 0, BW, 0);
  sides.addColorStop(0, 'rgba(3,2,6,0.55)');
  sides.addColorStop(0.3, 'rgba(3,2,6,0)');
  sides.addColorStop(0.7, 'rgba(3,2,6,0)');
  sides.addColorStop(1, 'rgba(3,2,6,0.55)');
  ctx.fillStyle = sides;
  ctx.fillRect(0, 0, BW, BH);
  return texture(c, 2);
}

/** Pierre du parapet : assises de blocs, joints, usure. */
function stoneTexture(seed: number): THREE.CanvasTexture {
  const { c, ctx } = canvas(1024, 128);
  const rng = makeRng(hashString(`arene-pierre|${seed}`));
  ctx.fillStyle = '#3a3438';
  ctx.fillRect(0, 0, 1024, 128);
  for (let row = 0; row < 2; row++) {
    let x = row ? -40 : 0;
    while (x < 1024) {
      const w = 90 + rng() * 70;
      const l = 48 + Math.floor(rng() * 18);
      ctx.fillStyle = `rgb(${l + 4},${l},${l + 6})`;
      ctx.fillRect(x + 2, row * 64 + 2, w - 4, 60);
      ctx.fillStyle = 'rgba(255,240,220,0.05)';
      ctx.fillRect(x + 4, row * 64 + 4, w - 8, 6);
      x += w;
    }
  }
  const t = texture(c, 4);
  t.wrapS = THREE.RepeatWrapping;
  t.repeat.set(6, 1);
  return t;
}

/** Sable de l’arène : grain, traces ratissées, taches sombres. */
function sandTexture(seed: number): THREE.CanvasTexture {
  const S = 512;
  const { c, ctx } = canvas(S, S);
  const rng = makeRng(hashString(`arene-sable|${seed}`));
  ctx.fillStyle = '#5a4a3a';
  ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 9000; i++) {
    const l = rng();
    ctx.fillStyle = l < 0.5 ? `rgba(30,22,16,${0.1 + rng() * 0.15})` : `rgba(200,170,130,${0.06 + rng() * 0.1})`;
    ctx.fillRect(rng() * S, rng() * S, 1.5, 1.5);
  }
  ctx.strokeStyle = 'rgba(30,22,16,0.18)';
  ctx.lineWidth = 2;
  for (let y = 8; y < S; y += 16) {
    ctx.beginPath(); ctx.moveTo(0, y); for (let x = 0; x <= S; x += 32) ctx.lineTo(x, y + Math.sin(x * 0.03 + y) * 2); ctx.stroke();
  }
  const t = texture(c, 8);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(10, 7);
  return t;
}

/** Faisceau de lumière : dégradé vertical (vif en haut, fondu en bas), transparent sur les bords. */
function shaftTexture(): THREE.CanvasTexture {
  const { c, ctx } = canvas(64, 256);
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.6, 'rgba(255,255,255,0.35)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 256);
  const side = ctx.createLinearGradient(0, 0, 64, 0);
  side.addColorStop(0, 'rgba(0,0,0,1)');
  side.addColorStop(0.3, 'rgba(0,0,0,0)');
  side.addColorStop(0.7, 'rgba(0,0,0,0)');
  side.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = side;
  ctx.fillRect(0, 0, 64, 256);
  return texture(c, 1);
}

function mountArene({ artSeed }: { artSeed: number }): VenueSet {
  const group = new THREE.Group();
  const rng = makeRng(hashString(`arene|${artSeed}`));

  // --- Toile de fond et sable
  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(44, 22), new THREE.MeshBasicMaterial({ map: areneBackdropTexture(artSeed), fog: false }));
  backdrop.position.set(0, 7.2, -13);
  group.add(backdrop);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), new THREE.MeshStandardMaterial({ map: sandTexture(artSeed), roughness: 0.95 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, -2);
  group.add(floor);

  // --- Parapet de pierre en arc derrière le rival (on en voit l’intérieur), couvert d’une margelle. Cylindres ouverts :
  // un secteur fermé aurait des fonds en part de tarte qui couvriraient le sol devant le mur.
  const stone = new THREE.MeshStandardMaterial({ map: stoneTexture(artSeed), roughness: 0.9, side: THREE.BackSide });
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(9.2, 9.2, 1.5, 48, 1, true, Math.PI * 0.62, Math.PI * 0.76), stone);
  wall.position.set(0, 0.75, -1.4);
  const capMat = new THREE.MeshStandardMaterial({ color: 0x2c272c, roughness: 0.8 });
  capMat.side = THREE.BackSide;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(9.12, 9.12, 0.16, 48, 1, true, Math.PI * 0.62, Math.PI * 0.76), capMat);
  cap.position.set(0, 1.55, -1.4);
  group.add(wall, cap);

  // --- Braseros (colonnes et vasques) et coupes de feu de la table, bronze fusionné
  const bronze = new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 0.45, metalness: 0.75 });
  const parts: THREE.BufferGeometry[] = [];
  for (const s of [-1, 1]) {
    const x = s * BRAZIER_X;
    parts.push(new THREE.CylinderGeometry(0.16, 0.24, BRAZIER_TOP - 0.2, 10).translate(x, (BRAZIER_TOP - 0.2) / 2, BRAZIER_Z));
    parts.push(new THREE.CylinderGeometry(0.34, 0.36, 0.08, 14).translate(x, 0.04, BRAZIER_Z));
    parts.push(new THREE.CylinderGeometry(0.55, 0.28, 0.32, 16, 1, true).translate(x, BRAZIER_TOP - 0.06, BRAZIER_Z));
    parts.push(new THREE.TorusGeometry(0.55, 0.04, 6, 20).rotateX(Math.PI / 2).translate(x, BRAZIER_TOP + 0.1, BRAZIER_Z));
  }
  const bowls = [{ x: -3.7, z: -1.75 }, { x: 3.7, z: -1.75 }];
  for (const b of bowls) {
    parts.push(new THREE.CylinderGeometry(0.15, 0.09, 0.09, 12, 1, true).translate(b.x, TABLE_TOP + 0.05, b.z));
    parts.push(new THREE.CylinderGeometry(0.1, 0.1, 0.02, 12).translate(b.x, TABLE_TOP + 0.01, b.z));
  }
  const bronzeMesh = new THREE.Mesh(mergeGeometries(parts.map((g) => g.toNonIndexed()))!, bronze);
  (bronzeMesh.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
  group.add(bronzeMesh);

  // Flammes : plusieurs langues par brasero, une par coupe ; halos ; étincelles qui montent des braseros.
  const fireSrc: LightPoint[] = [];
  for (const s of [-1, 1]) {
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + rng();
      fireSrc.push({ x: s * BRAZIER_X + Math.cos(a) * 0.22, y: BRAZIER_TOP + 0.02, z: BRAZIER_Z + Math.sin(a) * 0.22, r: 0.16 + rng() * 0.1 });
    }
  }
  for (const b of bowls) fireSrc.push({ x: b.x, y: TABLE_TOP + 0.08, z: b.z, r: 0.06 });
  const flames = lightPoints(fireSrc, 0.32, 0.05, flameTexture(), 0.5, [1, 0.74, 0.5], rng);
  const halos = lightPoints([...[-1, 1].map((s) => ({ x: s * BRAZIER_X, y: BRAZIER_TOP + 0.25, z: BRAZIER_Z, r: 0.5 })), ...bowls.map((b) => ({ x: b.x, y: TABLE_TOP + 0.12, z: b.z, r: 0.04 }))], 0.6, 0, haloTexture(), 0.2, [0.95, 0.55, 0.32], rng);
  group.add(flames, halos);
  const SPARKS = 70;
  const spark = Array.from({ length: SPARKS }, (_, i) => ({ s: i % 2 ? 1 : -1, p: rng(), v: 0.6 + rng() * 0.9, dx: (rng() - 0.5) * 0.5, dz: (rng() - 0.5) * 0.4, w: 2 + rng() * 3 }));
  const sparkPos = new Float32Array(SPARKS * 3);
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
  const sparks = new THREE.Points(sparkGeo, new THREE.PointsMaterial({ color: 0xffb060, size: 0.05, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
  sparks.frustumCulled = false;
  group.add(sparks);
  const placeSparks = (clock: number) => {
    spark.forEach((sp, i) => {
      const t = (sp.p + clock * sp.v * 0.25) % 1;
      sparkPos[i * 3] = sp.s * BRAZIER_X + sp.dx * t + Math.sin(clock * sp.w + i) * 0.06 * t;
      sparkPos[i * 3 + 1] = BRAZIER_TOP + 0.3 + t * 3.2;
      sparkPos[i * 3 + 2] = BRAZIER_Z + sp.dz * t;
    });
    sparkGeo.attributes.position!.needsUpdate = true;
  };
  placeSparks(1.234);

  // --- Tentures des quatre familles accrochées au parapet, de part et d’autre des épaules du rival (ondulent un peu)
  const banners: THREE.Mesh[] = [];
  ([['Cendre', -4.4], ['Ronce', -2.6], ['Astre', 2.6], ['Voile', 4.4]] as const).forEach(([f, x]) => {
    const mat = new THREE.MeshStandardMaterial({ map: bannerTexture(f, artSeed), transparent: true, side: THREE.DoubleSide, roughness: 0.85, emissive: new THREE.Color(0xffffff), emissiveIntensity: 0 });
    mat.emissiveMap = mat.map;
    mat.emissiveIntensity = 0.22;
    const b = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.4), mat);
    const z = -1.4 - Math.sqrt(9.05 * 9.05 - x * x);
    b.position.set(x, 0.85, z);
    b.rotation.y = Math.atan2(-x, -1.4 - z);
    group.add(b);
    banners.push(b);
  });

  // --- Faisceaux de projecteurs dans la poussière, de part et d’autre du rival (un seul appel de dessin)
  const shaftGeo = mergeGeometries([-1, 1].map((s) => new THREE.CylinderGeometry(0.2, 1.0, 8, 18, 1, true).translate(0, -4, 0).rotateZ(s * 0.32).translate(s * 3.6, 8.6, -7.6).toNonIndexed()))!;
  const shafts = new THREE.Mesh(shaftGeo, new THREE.MeshBasicMaterial({ map: shaftTexture(), color: 0xdfe6ff, transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  group.add(shafts);

  // --- Lumières qui scintillent dans les gradins (lanternes, éclats), juste devant la toile de fond
  const crowdSrc: LightPoint[] = [];
  for (let i = 0; i < 70; i++) {
    const x = (rng() < 0.5 ? -1 : 1) * (5.4 + rng() * 9);
    crowdSrc.push({ x, y: 0.9 + rng() * 5.2, z: -12.8, r: 0.02 + rng() * 0.04 });
  }
  const crowd = lightPoints(crowdSrc, 0.22, 0, haloTexture(), 0.6, [1, 0.78, 0.55], rng);
  group.add(crowd);
  const pointMats = [flames.material, halos.material, crowd.material];

  return {
    group,
    update(_dt, clock, still) {
      tickLightPoints(pointMats, clock, still);
      banners.forEach((b, i) => { b.rotation.x = still ? 0 : Math.sin(clock * 0.6 + i * 1.1) * 0.04; });
      shafts.rotation.y = still ? 0 : Math.sin(clock * 0.15) * 0.04;
      if (!still) placeSparks(clock);
    },
    prerender(scale) {
      for (const m of pointMats) m.uniforms.uScale!.value = scale;
    },
    ablatable: { candles: [flames, halos, sparks], banners, dust: [shafts, crowd] },
    dispose() { disposeTree(group); },
  };
}

const FIRE = { decay: 1.6, flicker: 'candle' } as const;

export const ARENE: VenueDef = {
  id: 'arene',
  background: 0x06050c,
  // Nuit bleu-violet : gradins et parapet s’y enfoncent, le rival et la table restent nets.
  fog: { color: 0x1c1830, near: 12, far: 28 },
  // Ambiance froide de nuit ; projecteurs de l’arène blancs sur le visage et la table ; feu orange des braseros.
  house: { sky: 0xa8b0dc, ground: 0x1a1210, intensity: 0.5 },
  key: { color: 0xfff0dc, intensity: 1.85 },
  stage: { color: 0xfff1e0, intensity: 1.6 },
  practicals: [
    { pos: [-3.7, TABLE_TOP + 0.5, -1.8], color: 0xff9a4a, intensity: 1.9, distance: 6, ...FIRE },
    { pos: [3.7, TABLE_TOP + 0.5, -1.8], color: 0xff9a4a, intensity: 1.9, distance: 6, ...FIRE },
    { pos: [-BRAZIER_X, BRAZIER_TOP + 0.7, BRAZIER_Z], color: 0xff8636, intensity: 5.5, distance: 11, ...FIRE },
    { pos: [BRAZIER_X, BRAZIER_TOP + 0.7, BRAZIER_Z], color: 0xff8636, intensity: 5.5, distance: 11, ...FIRE },
  ],
  bloom: { strength: 0.34, radius: 0.4, threshold: 1.0 },
  mount: mountArene,
};
