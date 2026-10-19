/**
 * M09 V3, passe 49 — les Ruelles (quartier du Voile) dans la direction D (ADR 026 et son amendement 1), après la
 * validation du Quai de la passe 47 par le responsable. Même plan pur (`ruelles.ts` : maisons étroites, fontaine, étal de
 * la liseuse, lampadaires, collisions), décor reconstruit avec la grammaire commune (`grammaire.ts`) :
 *   1. premier plan : canal en reflet brisé, barques et fanaux bleu argenté, mur du canal et ses glyphes ;
 *   2. la ruelle : pavés mouillés, flaques le long du canal, fontaine du Voile (vasque, cristal lumineux, filets d'eau),
 *      étal de la liseuse (boule de cristal, cartes, bougies), lampadaires au verre du Voile ;
 *   3. maisons hautes et étroites à pignon sur rue et encorbellement (colombages, enduits bleutés, rives dorées, épis,
 *      rosaces, jardinières, balconnets, enseignes, fanions du Voile), linge tendu aux couleurs des familles ;
 *   4. second rang, ville haute, lune.
 * Bleu argenté du Voile dominant, quelques lanternes chaudes aux portes (contraste chaud et froid). Le décor ne prend pas
 * son style sur les personnages de la ville, provisoires (ADR 026 amendement 1).
 */
import * as THREE from 'three';
import { FAMILIES } from '../game/catalog/cards';
import { hashString, makeRng } from '../game/engine/rng';
import { waterMaterial } from './materiaux';
import { SIGN_CELLS, glassUV, glyphUV } from './quaiMateriaux';
import { FOUNTAIN, NARROW, R_EDGE_Z, R_FACADE_Z, R_LAMPS, R_WATER_Y, SEER } from './ruelles';
import { LAYER_NOREFLECT } from './reflets';
import { FAM, M, S1, box, createKit, plane, type FacadeLike, type MistPlane, type Spec } from './grammaire';
import type { QuaiScene } from './scene';

const FZ = R_FACADE_Z;
/** Face du mur du canal (l'eau commence là). */
const WALL_Z = R_EDGE_Z + 0.5;
const STREET: readonly [number, number, number, number] = [-34, FZ - 0.3, 68, R_EDGE_Z - FZ + 0.6];
/** Flaques le long du canal (vue rasante : les façades, les vitrines et la fontaine s'y reflètent), quelques-unes au milieu. */
const PUDDLES: readonly (readonly [number, number, number, number])[] = [
  [-19, 1.9, 1.5, 0.6], [-14.6, 2.0, 1.4, 0.6], [-10.5, 1.8, 1.6, 0.65], [-6.8, 2.0, 1.2, 0.55], [-1.0, 2.0, 1.5, 0.6],
  [3.8, 1.9, 1.4, 0.6], [7.8, 2.0, 1.6, 0.6], [12.0, 1.8, 1.4, 0.6], [16.4, 2.0, 1.5, 0.6], [20.5, 1.9, 1.4, 0.55],
  [-12.2, 0.2, 0.8, 0.35], [0.6, 0.3, 0.8, 0.35], [10.2, 0.6, 0.9, 0.35], [-3.6, 1.55, 1.4, 0.35],
];
const MISTS: readonly MistPlane[] = [
  [90, 1.4, 0, R_WATER_Y + 0.42, WALL_Z + 2.2, 0.26, 0.012, [6, 1]],
  [220, 22, 0, 9, -27, 0.3, 0.006, [5, 1.4]],
];

/**
 * Maisons du quartier : celles du plan pur et deux de part et d'autre (la caméra voit au-delà des bornes de l'îlot).
 * Hauteurs abaissées pour l'échelle des personnages et le cadrage (les pignons et leurs épis restent dans l'image).
 */
const BASE: Omit<Spec, 'eave' | 'upper' | 'jetty' | 'roofH' | 'tint' | 'litChance'> = { ground: 3.0, roof: 'z', dormers: 0 };
const VARIANTS: readonly Partial<Spec>[] = [
  { eave: 6.2, upper: 'colombage', jetty: 0.45, roofH: 3.0, tint: 0x8c96b0, litChance: 0.55, flowers: true },
  { eave: 6.7, upper: 'enduit', jetty: 0.3, roofH: 3.2, tint: 0x96a0ba, litChance: 0.5, balconets: true, quoins: true },
  { eave: 5.8, upper: 'colombage', jetty: 0.45, roofH: 2.9, tint: 0xa4a6b4, litChance: 0.6, flowers: true },
  { eave: 6.9, upper: 'enduit', jetty: 0.3, roofH: 3.1, tint: 0x8892ac, litChance: 0.55, pediments: true, quoins: true },
  { eave: 6.0, upper: 'colombage', jetty: 0.45, roofH: 3.2, tint: 0x9ca4b8, litChance: 0.6, flowers: true },
  { eave: 6.5, upper: 'enduit', jetty: 0.3, roofH: 3.0, tint: 0x8e9ab4, litChance: 0.5, balconets: true },
  { eave: 6.1, upper: 'colombage', jetty: 0.45, roofH: 3.1, tint: 0x969cae, litChance: 0.55, flowers: true },
];
/** Particularités des maisons du plan (index de `NARROW`) : vitrines, enseignes, fanions du Voile, portes cintrées. */
const EXTRA: Readonly<Record<number, Partial<Spec>>> = {
  0: { sign: { cell: SIGN_CELLS.lanterne, x: -12.2 } },
  1: { pennant: { x: -7.5, fam: 1 }, arch: true },
  2: { sign: { cell: SIGN_CELLS.cartes, x: -2.6 } },
  3: { shop: { x: 2.35, awning: 'ivoire' }, pennant: { x: -1.1, fam: 1 } },
  4: { arch: true, sign: { cell: SIGN_CELLS.lanterne, x: 4.4 } },
  5: { pennant: { x: 12.6, fam: 1 } },
  6: { shop: { x: 17.2, awning: 'ardoise' } },
};

export function buildRuellesD(artSeed: number): QuaiScene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x04060c);
  const rng = makeRng(hashString(`ville|ruelles-d|${artSeed}`));
  const k = createKit({ artSeed, rng, scene, fz: FZ, front: R_EDGE_Z, street: STREET, puddles: PUDDLES });
  const { T, lights, halos, batch, m, famCloth, lampGlassOf } = k;
  const { facade, wallLantern, lanternCage, lampPost, oculus, finial, secondRow, hillCity, mists, smokes, dustMotes } = k;
  const water = (refl: number, streak: number) => waterMaterial({ streak, spillZ: WALL_Z, refl });
  const spray = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.55, 0.75, 1.0).multiplyScalar(0.9), transparent: true, opacity: 0.38, blending: THREE.AdditiveBlending, depthWrite: false });
  const crystal = new THREE.MeshBasicMaterial({ color: FAM.Voile.clone().multiplyScalar(2.2) });

  // =========================================================================================== la ruelle et le canal
  {
    const [x0, z0, w, d] = STREET;
    const g = new THREE.PlaneGeometry(w, d, 34, 4);
    g.rotateX(-Math.PI / 2);
    const uv = g.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / 3.0, uv.getY(i) * d / 3.0);
    batch.add(g, m.cobble, M(x0 + w / 2, 0, z0 + d / 2), (p) => 0.72 + 0.28 * THREE.MathUtils.smoothstep(p.z, FZ, FZ + 1.4));
  }
  // margelle, mur du canal, glyphes, anneaux, pieux
  for (let x = -34; x < 34;) {
    const len = 1.1 + rng() * 0.35;
    batch.add(box(len - 0.02, 0.14, 0.6, 1.6), m.stoneLight, M(x + len / 2, 0.06, R_EDGE_Z + 0.2), 0.86 + rng() * 0.14);
    x += len;
  }
  {
    const h = -R_WATER_Y + 0.5;
    batch.add(box(68, h, 0.4, 3), m.quayWall, M(0, -h / 2, WALL_Z - 0.2), (p) => 0.35 + 0.65 * THREE.MathUtils.smoothstep(p.y, R_WATER_Y - 0.3, 0));
  }
  [-15.5, -8.2, 1.6, 9.4, 17.0].forEach((x, i) => {
    const f = i % 2 ? 1 : (i / 2) % 4 === 1 ? 3 : i === 4 ? 2 : 0;
    batch.add(glyphUV(plane(0.56, 0.56), f), m.glyph, M(x, -0.42, WALL_Z + 0.02));
    halos.push({ p: new THREE.Vector3(x, -0.42, WALL_Z + 0.06), size: 1.4, k: 0.26, color: FAM[FAMILIES[f]!] });
  });
  for (const x of [-12.5, -4.8, 5.2, 13.6]) batch.add(new THREE.TorusGeometry(0.13, 0.026, 6, 14), m.iron, M(x, -0.36, WALL_Z + 0.04));
  {
    const wtr = new THREE.Mesh(new THREE.PlaneGeometry(200, 80), water(0.95, 0.35));
    wtr.layers.set(LAYER_NOREFLECT);
    wtr.rotation.x = -Math.PI / 2;
    wtr.position.set(0, R_WATER_Y, WALL_Z + 40);
    scene.add(wtr);
  }
  // barques amarrées, fanaux du Voile sur perches (verre et halo ; une lumière)
  const barque = (x: number, z: number, len: number, lantern: boolean) => {
    const g = new THREE.BoxGeometry(len, 0.7, 1.3, 10, 1, 2);
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) { const u = p.getX(i) / (len / 2); p.setZ(i, p.getZ(i) * Math.max(0.06, 1 - Math.pow(Math.abs(u), 2.2)) * (p.getY(i) < 0 ? 0.6 : 1)); p.setY(i, p.getY(i) + u * u * 0.26); }
    g.computeVertexNormals();
    const top = R_WATER_Y + 0.42;
    batch.add(g, m.planks, M(x, top - 0.25, z), (q) => 0.35 + 0.55 * THREE.MathUtils.smoothstep(q.y, R_WATER_Y, top));
    batch.add(box(len * 0.82, 0.03, 0.03, 1), m.gold, M(x, top + 0.08, z + 0.6));
    batch.add(box(len * 0.7, 0.04, 1.0, 1), m.planks, M(x, top - 0.02, z), 0.8);
    if (lantern) {
      const lx = x + len * 0.38;
      batch.add(box(0.04, 1.3, 0.04, 1), m.iron, M(lx, top + 0.65, z));
      lanternCage(lx, top + 1.4, z, 0.17, 0.24, true, FAM.Voile);
      halos.push({ p: new THREE.Vector3(lx, top + 1.4, z + 0.1), size: 1.5, k: 0.5, color: FAM.Voile });
    }
  };
  barque(-12.0, WALL_Z + 1.0, 3.8, true);
  barque(6.6, WALL_Z + 1.1, 4.2, true);
  barque(-1.8, WALL_Z + 2.2, 3.4, false);
  barque(18.5, WALL_Z + 1.2, 4.0, true);
  lights.push({ x: 6.6 + 4.2 * 0.38, y: R_WATER_Y + 1.82, z: WALL_Z + 1.2, intensity: 2.2, radius: 7, halo: 0, flicker: 'lantern', color: FAM.Voile });
  for (const x of [-16.5, -7.6, 2.4, 11.2, 22.0]) {
    for (const dx of [-0.16, 0.16]) batch.add(new THREE.CylinderGeometry(0.1, 0.12, 2.0, 8), m.planks, M(x + dx, R_WATER_Y + 0.7 + (dx > 0 ? 0.15 : 0), WALL_Z + 0.25), (p) => 0.35 + 0.6 * THREE.MathUtils.smoothstep(p.y, R_WATER_Y, 0.5));
    batch.add(new THREE.TorusGeometry(0.26, 0.03, 5, 14), m.iron, M(x, 0.12, WALL_Z + 0.27, Math.PI / 2));
  }

  // ======================================================================================================= maisons
  const houses: { f: FacadeLike; s: Spec }[] = [];
  const spec = (i: number, extra: Partial<Spec> = {}): Spec => ({ ...BASE, ...VARIANTS[((i % VARIANTS.length) + VARIANTS.length) % VARIANTS.length]!, ...extra } as Spec);
  houses.push({ f: { id: 'r-o2', x0: -25.2, x1: -20.8, door: -23.4, seed: 101 }, s: spec(5) });
  houses.push({ f: { id: 'r-o1', x0: -20.4, x1: -16.4, door: -18.0, seed: 103 }, s: spec(3, { sign: { cell: SIGN_CELLS.poulie, x: -19.4 } }) });
  NARROW.forEach((n, i) => houses.push({ f: { id: `r${i}`, x0: n.x0, x1: n.x1, door: n.door, seed: n.seed }, s: spec(i, EXTRA[i]) }));
  houses.push({ f: { id: 'r-e1', x0: 18.4, x1: 22.8, door: 20.2, seed: 107 }, s: spec(2) });
  houses.push({ f: { id: 'r-e2', x0: 23.2, x1: 27.6, door: 25.6, seed: 109 }, s: spec(4, { arch: true }) });
  for (const { f, s } of houses) facade(f, s);
  // passages entre deux maisons : fond sombre en retrait ; au-delà, des blocs sombres ferment la vue
  for (let i = 0; i + 1 < houses.length; i++) {
    const a = houses[i]!;
    const b = houses[i + 1]!;
    const w = b.f.x0 - a.f.x1;
    if (w <= 0.05) continue;
    const h = Math.min(a.s.eave, b.s.eave) + 1.4;
    batch.add(box(w + 0.2, h, 0.4, 3), m.stoneDark, M((a.f.x1 + b.f.x0) / 2, h / 2, FZ - 2.6), 0.35);
    batch.add(box(w, 0.04, 2.6, 1), m.stoneDark, M((a.f.x1 + b.f.x0) / 2, 0.01, FZ - 1.3), 0.4);
  }
  for (const [x0, x1] of [[-40, -25.6], [28, 44]] as const) batch.add(box(x1 - x0, 9, 7, 3), m.stoneDark, M((x0 + x1) / 2, 4.5, FZ - 3.5), 0.5);
  // lanternes murales aux portes : chaudes (Astre, Cendre) pour le contraste avec le bleu du Voile
  const warm = [FAM.Astre, FAM.Cendre, FAM.Astre];
  [NARROW[0]!, NARROW[3]!, NARROW[5]!].forEach((n, i) => wallLantern(n.door + (i === 1 ? -0.95 : 0.95), 2.55, FZ, true, warm[i]!));
  // rosace dorée au pignon d'une maison sur deux (le Voile au centre)
  houses.forEach(({ f, s }, i) => {
    if (i % 2 === 0) return;
    const cx = (f.x0 + f.x1) / 2;
    oculus(cx, s.eave + s.roofH * 0.55, FZ + s.jetty + 0.04, 0.26, 1);
  });
  // linge tendu entre les étages, toiles aux couleurs des familles et ivoire
  for (const [x0, x1, y] of [[-15.4, -11.0, 5.3], [-6.2, -2.2, 5.0], [3.9, 8.0, 5.25], [13.6, 18.0, 5.1], [-24.6, -20.6, 5.2]] as const) {
    const n = 7;
    const zz = FZ + 1.05;
    for (let j = 0; j < n; j++) {
      const t0 = j / n;
      const t1 = (j + 1) / n;
      const P = (t: number) => new THREE.Vector3(x0 + (x1 - x0) * t, y - Math.sin(t * Math.PI) * 0.4, zz);
      const p0 = P(t0);
      const p1 = P(t1);
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), p1.clone().sub(p0).normalize());
      batch.add(box(p0.distanceTo(p1), 0.015, 0.015, 1), m.iron, new THREE.Matrix4().compose(p0.clone().add(p1).multiplyScalar(0.5), q, S1));
      if (j > 0 && rng() < 0.85) {
        const cw = 0.32 + rng() * 0.28;
        const ch = 0.4 + rng() * 0.34;
        const mat = rng() < 0.4 ? m.cloth : rng() < 0.5 ? m.slateCloth : famCloth[Math.floor(rng() * 4)]!;
        batch.add(plane(cw, ch), mat, M(p0.x, p0.y - ch / 2, zz));
      }
    }
  }

  // ======================================================================================== fontaine du Voile
  {
    const { x, z, r } = FOUNTAIN;
    batch.add(new THREE.CylinderGeometry(r, r + 0.1, 0.55, 8), m.stoneLight, M(x, 0.27, z, 0, Math.PI / 8), (p) => 0.7 + 0.3 * THREE.MathUtils.smoothstep(p.y, 0, 0.55));
    batch.add(new THREE.TorusGeometry(r - 0.02, 0.05, 6, 8), m.gold, M(x, 0.56, z, Math.PI / 2, 0, Math.PI / 8));
    const pool = new THREE.Mesh(new THREE.CircleGeometry(r - 0.1, 24), water(0.7, 0.2));
    pool.layers.set(LAYER_NOREFLECT);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(x, 0.47, z);
    scene.add(pool);
    batch.add(new THREE.CylinderGeometry(0.16, 0.24, 1.6, 10), m.stoneLight, M(x, 1.05, z), 0.85);
    batch.add(new THREE.TorusGeometry(0.2, 0.035, 5, 14), m.gold, M(x, 1.3, z, Math.PI / 2));
    batch.add(new THREE.CylinderGeometry(0.58, 0.2, 0.24, 14), m.stoneLight, M(x, 1.9, z), 0.9);
    batch.add(new THREE.TorusGeometry(0.58, 0.035, 5, 18), m.gold, M(x, 2.02, z, Math.PI / 2));
    // filets d'eau de la vasque au bassin
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      batch.add(new THREE.CylinderGeometry(0.02, 0.05, 1.35, 5, 1, true), spray, M(x + Math.cos(a) * 0.5, 1.2, z + Math.sin(a) * 0.5, Math.sin(a) * 0.12, 0, -Math.cos(a) * 0.12));
    }
    // cristal du Voile au sommet : emblème de verre double face cerclé d'or, lumière bleu argenté
    batch.add(new THREE.CylinderGeometry(0.07, 0.1, 0.5, 8), m.gold, M(x, 2.25, z));
    for (const ry of [0, Math.PI]) {
      const disc = new THREE.CircleGeometry(0.32, 24);
      const du = disc.attributes.uv as THREE.BufferAttribute;
      for (let i = 0; i < du.count; i++) du.setY(i, 0.5 + (du.getY(i) - 0.5) * (128 / 192));
      batch.add(glassUV(disc, 1), m.glass, M(x, 2.85, z + (ry ? -0.03 : 0.03), 0, ry, 0));
    }
    batch.add(new THREE.TorusGeometry(0.34, 0.045, 6, 28), m.gold, M(x, 2.85, z));
    finial(x, 3.19, z, 0.4);
    halos.push({ p: new THREE.Vector3(x, 2.85, z + 0.2), size: 2.4, k: 0.45, color: FAM.Voile });
    lights.push({ x, y: 2.6, z: z + 0.5, intensity: 2.4, radius: 7, halo: 0, flicker: 'lantern', color: FAM.Voile });
  }

  // ===================================================================================== étal de la liseuse
  {
    const cx = (SEER.x0 + SEER.x1) / 2;
    const cz = (SEER.z0 + SEER.z1) / 2;
    const w = SEER.x1 - SEER.x0;
    const d = SEER.z1 - SEER.z0;
    batch.add(box(w, 0.08, d - 0.1, 1), m.planks, M(cx, 0.86, cz), 0.9);
    batch.add(box(w + 0.04, 0.78, 0.03, 1), famCloth[1]!, M(cx, 0.46, SEER.z1 - 0.06));
    batch.add(box(w + 0.06, 0.05, 0.05, 1), m.gold, M(cx, 0.86, SEER.z1 - 0.05));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) batch.add(box(0.08, sz < 0 ? 2.6 : 2.35, 0.08, 1), m.timber, M(cx + sx * (w / 2 - 0.05), sz < 0 ? 1.3 : 1.17, cz + sz * (d / 2 - 0.05)), 0.85);
    // dais d'étoffe du Voile, frangé d'or, guirlande de lunes et d'étoiles
    const g = new THREE.PlaneGeometry(w + 0.4, d + 0.6, 8, 4);
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) { const t = (p.getY(i) + (d + 0.6) / 2) / (d + 0.6); p.setXYZ(i, p.getX(i), 2.35 + t * 0.4 - 0.1 * Math.sin(t * Math.PI), (0.5 - t) * (d + 0.6)); }
    g.computeVertexNormals();
    batch.add(g, famCloth[1]!, M(cx, 0, cz));
    batch.add(box(w + 0.42, 0.04, 0.04, 1), m.gold, M(cx, 2.33, cz + (d + 0.6) / 2));
    for (let i = 0; i < 7; i++) {
      const sx = SEER.x0 - 0.1 + (i + 0.5) * ((w + 0.2) / 7);
      batch.add(box(0.008, 0.22, 0.008, 1), m.gold, M(sx, 2.2, cz + (d + 0.6) / 2 - 0.02));
      batch.add(new THREE.OctahedronGeometry(0.06, 0), i % 2 ? m.gold : crystal, M(sx, 2.06, cz + (d + 0.6) / 2 - 0.02, 0, 0, Math.PI / 4, 0.7, 1, 0.4));
    }
    // boule de cristal sur son pied d'or, cartes étalées, bougies, chandelier
    batch.add(new THREE.CylinderGeometry(0.09, 0.14, 0.12, 10), m.gold, M(cx, 0.96, cz));
    batch.add(new THREE.SphereGeometry(0.2, 18, 12), crystal, M(cx, 1.2, cz));
    halos.push({ p: new THREE.Vector3(cx, 1.2, cz + 0.25), size: 1.8, k: 0.6, color: FAM.Voile });
    lights.push({ x: cx, y: 1.3, z: cz + 0.6, intensity: 2.0, radius: 6, halo: 0, flicker: 'lantern', color: FAM.Voile });
    for (let i = 0; i < 5; i++) batch.add(box(0.12, 0.01, 0.17, 1), famCloth[i % 4]!, M(cx - 0.75 + i * 0.16, 0.91, cz + 0.2, 0, (i - 2) * 0.18, 0));
    for (const sx of [0.7, 0.86]) {
      batch.add(new THREE.CylinderGeometry(0.03, 0.03, 0.16 + sx * 0.1, 8), m.cloth, M(cx + sx, 0.98, cz - 0.1));
      batch.add(new THREE.SphereGeometry(0.03, 6, 4), lampGlassOf(FAM.Astre), M(cx + sx, 1.1 + sx * 0.05, cz - 0.1));
    }
    halos.push({ p: new THREE.Vector3(cx + 0.78, 1.12, cz), size: 0.7, k: 0.5, color: FAM.Astre });
  }

  // lampadaires au verre du Voile (plaques des familles)
  R_LAMPS.forEach((l, i) => lampPost(l.x, l.z, i === 0 ? 1 : 3, FAM.Voile));
  secondRow();
  hillCity();
  const mist = [...mists(MISTS), ...smokes()];
  const motes = dustMotes();
  void T;
  return k.finishIlot(mist, motes);
}
