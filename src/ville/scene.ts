/**
 * M09 V1 — construction de l'îlot « le Quai, la nuit » à partir du plan pur (`quai.ts`), dans la DA de Cité du Tournoi :
 * nuit indigo / ardoise, pierre froide, ambre seul accent chaud, ivoire désaturé, accessoires aux points focaux
 * (étal à toile ivoire, grappes de lanternes, bord du quai, bannières des familles sur la salle de jeu de cartes).
 * Échelle de Cité du Tournoi (1 unité = 1 m, rez-de-chaussée 3,15 m, eau 1,15 m sous le pavé, lampadaires tous les
 * 9 m d'intensité 4,4 et de rayon 11,5 m ; `MerchantDistrictGenerator.ts` L. 263-272). Géométries statiques fusionnées
 * par matériau (un appel de dessin par matière), graine d'art, aucune image externe.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { FAMILIES } from '../game/catalog/cards';
import { hashString, makeRng } from '../game/engine/rng';
import { bannerTexture } from '../scene/venues/common';
import {
  LAMP_WARM, MAX_LIGHTS, U, ashlarTexture, canvasCloth, cobbleTexture, fanalSignTexture, haloTexture, plasterTexture, skyDome, slateTexture,
  surface, waterMaterial, windowTexture, woodTexture,
} from './materiaux';
import { BOLLARDS, FACADES, FACADE_Z, LAMPS, PROPS, QUAY_Z, STALL, WATER_Y, type Facade } from './quai';
import { BOOTH, BRAZIERS, GATE, P_FACADE_Z, P_FRONT_Z, P_LAMPS, P_PROPS, P_X_MAX, P_X_MIN } from './parvis';

export interface LightDef { x: number; y: number; z: number; intensity: number; radius: number; halo: number; flicker: 'lantern' | 'candle' | 'window' | 'none'; color?: THREE.Color }

export interface QuaiScene {
  scene: THREE.Scene;
  lights: LightDef[];
  /** Avance l'animation (scintillement des lanternes, eau, ciel). */
  update(time: number): void;
  stats(): { meshes: number; textures: number; lights: number };
  dispose(): void;
}

const GROUND_FLOOR = 3.15;
const DEPTH = 7;
const ROOF_H = 3.3;

/** Rassemble des géométries par matériau puis les fusionne : un maillage (un appel de dessin) par matière. */
class Batcher {
  private parts = new Map<THREE.Material, THREE.BufferGeometry[]>();
  add(geo: THREE.BufferGeometry, mat: THREE.Material, m?: THREE.Matrix4): void {
    const g = geo.index ? geo.toNonIndexed() : geo;
    if (m) g.applyMatrix4(m);
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    (this.parts.get(mat) ?? this.parts.set(mat, []).get(mat)!).push(g);
  }
  build(into: THREE.Object3D): number {
    let n = 0;
    for (const [mat, geos] of this.parts) {
      const merged = mergeGeometries(geos, false);
      for (const g of geos) g.dispose();
      if (!merged) continue;
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, mat);
      mesh.matrixAutoUpdate = false;
      into.add(mesh);
      n++;
    }
    this.parts.clear();
    return n;
  }
}

const M4 = (x: number, y: number, z: number, ry = 0, sx = 1, sy = 1, sz = 1) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(sx, sy, sz));

/** Boîte dont les UV suivent les mètres (une répétition de texture tous les `tile` mètres sur chaque face). */
function boxM(w: number, h: number, d: number, tile = 3): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  const pos = g.attributes.position as THREE.BufferAttribute;
  const nor = g.attributes.normal as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) {
    const nx = Math.abs(nor.getX(i));
    const ny = Math.abs(nor.getY(i));
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    if (ny > 0.5) uv.setXY(i, x / tile, z / tile);
    else if (nx > 0.5) uv.setXY(i, z / tile, y / tile);
    else uv.setXY(i, x / tile, y / tile);
  }
  return g;
}

/** Toit à deux pans : faîtage parallèle à la rue (`x`) ou perpendiculaire (`z`, pignon sur rue). Pans + pignons. */
function gableRoof(w: number, d: number, h: number, ridge: 'x' | 'z', over = 0.35): { slopes: THREE.BufferGeometry; gables: THREE.BufferGeometry } {
  const sp: number[] = [];
  const su: number[] = [];
  const gp: number[] = [];
  const gu: number[] = [];
  const quad = (a: number[], b: number[], c: number[], d2: number[], uvs: number[][]) => {
    sp.push(...a, ...b, ...c, ...a, ...c, ...d2);
    su.push(...uvs[0]!, ...uvs[1]!, ...uvs[2]!, ...uvs[0]!, ...uvs[2]!, ...uvs[3]!);
  };
  const tri = (a: number[], b: number[], c: number[]) => {
    gp.push(...a, ...b, ...c);
    gu.push(a[0]! / 3 + a[2]! / 3, a[1]! / 3, b[0]! / 3 + b[2]! / 3, b[1]! / 3, c[0]! / 3 + c[2]! / 3, c[1]! / 3);
  };
  const W = w / 2 + over;
  const D = d / 2 + over;
  if (ridge === 'x') {
    const L = Math.hypot(D, h) / 2;
    quad([-W, 0, D], [W, 0, D], [W, h, 0], [-W, h, 0], [[0, 0], [w / 2, 0], [w / 2, L], [0, L]]);
    quad([W, 0, -D], [-W, 0, -D], [-W, h, 0], [W, h, 0], [[0, 0], [w / 2, 0], [w / 2, L], [0, L]]);
    tri([-w / 2, 0, d / 2], [-w / 2, h, 0], [-w / 2, 0, -d / 2]);
    tri([w / 2, 0, -d / 2], [w / 2, h, 0], [w / 2, 0, d / 2]);
  } else {
    const L = Math.hypot(W, h) / 2;
    quad([-W, 0, -D], [-W, 0, D], [0, h, D], [0, h, -D], [[0, 0], [d / 2, 0], [d / 2, L], [0, L]]);
    quad([W, 0, D], [W, 0, -D], [0, h, -D], [0, h, D], [[0, 0], [d / 2, 0], [d / 2, L], [0, L]]);
    tri([-w / 2, 0, d / 2], [w / 2, 0, d / 2], [0, h, d / 2]);
    tri([w / 2, 0, -d / 2], [-w / 2, 0, -d / 2], [0, h, -d / 2]);
  }
  const mk = (p: number[], u: number[]) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(u, 2));
    g.computeVertexNormals();
    return g;
  };
  return { slopes: mk(sp, su), gables: mk(gp, gu) };
}

/** Plan vertical tourné vers la rue (+z), centré en (x, y), à la profondeur z. */
const facePlane = (w: number, h: number) => new THREE.PlaneGeometry(w, h);

/** Matières communes des îlots (un programme partagé, des uniformes propres) et registre des textures à libérer. */
function kit(artSeed: number) {
  const textures: THREE.Texture[] = [];
  const T = <X extends THREE.Texture>(t: X) => { textures.push(t); return t; };
  const m = {
    cobble: surface({ map: T(cobbleTexture(artSeed)), tile: [1, 1], wet: 0.85, spec: 0.22, shin: 36, contact: 0, breakup: 0.35 }),
    stone: surface({ map: T(ashlarTexture(artSeed)), tint: 0xa8b0c4, spec: 0.18, shin: 18, contact: 1, breakup: 0.4 }),
    stoneDark: surface({ map: T(ashlarTexture(artSeed + 1, [[92, 98, 110], [80, 86, 98], [100, 102, 110]])), spec: 0.3, shin: 30, contact: 0, breakup: 0.45, wet: 0.5 }),
    plasterTex: T(plasterTexture(artSeed, false)),
    timberTex: T(plasterTexture(artSeed, true)),
    slate: surface({ map: T(slateTexture(artSeed)), spec: 0.5, shin: 40, contact: 0, breakup: 0.3, wrap: 0.1 }),
    wood: surface({ map: T(woodTexture(artSeed)), tint: 0xa49c96, spec: 0.12, shin: 16, contact: 0.5, breakup: 0.3 }),
    cloth: surface({ map: T(canvasCloth(artSeed)), tint: 0xf0ebe0, spec: 0.02, contact: 0, wrap: 0.9, side: THREE.DoubleSide }),
    iron: surface({ map: T(woodTexture(artSeed + 9)), tint: 0x3a3f4c, spec: 0.9, shin: 60, contact: 0, breakup: 0.1 }),
    winLit: [0, 1, 2].map((i) => new THREE.MeshBasicMaterial({ map: T(windowTexture(true, artSeed + i)), color: new THREE.Color(1, 1, 1).multiplyScalar(2.0) })),
    winDark: new THREE.MeshBasicMaterial({ map: T(windowTexture(false, artSeed)), color: new THREE.Color(0.55, 0.6, 0.7) }),
    lampGlass: new THREE.MeshBasicMaterial({ color: new THREE.Color(LAMP_WARM).multiplyScalar(3.2) }),
  };
  return { textures, T, m };
}

/** Lampadaire de fer (≈ 3,6 m), lanterne ambrée en tête : lumière de quai de Cité du Tournoi (4,4 → 3,4 ici, rayon 11,5 m). */
function lampPost(batch: Batcher, m: ReturnType<typeof kit>['m'], lights: LightDef[], x: number, z: number): void {
  batch.add(new THREE.CylinderGeometry(0.06, 0.09, 3.6, 8), m.iron, M4(x, 1.8, z));
  batch.add(new THREE.CylinderGeometry(0.16, 0.2, 0.3, 8), m.iron, M4(x, 0.15, z));
  batch.add(boxM(0.3, 0.42, 0.3, 1), m.lampGlass, M4(x, 3.62, z));
  batch.add(new THREE.CylinderGeometry(0, 0.28, 0.25, 4), m.iron, M4(x, 3.95, z, Math.PI / 4));
  lights.push({ x, y: 3.6, z, intensity: 3.0, radius: 9.5, halo: 2.0, flicker: 'lantern' });
}

/** Ville haute au loin : silhouettes de façades, fenêtres rares, noyées dans la brume ; beffroi (point focal lointain). */
function farCity(batch: Batcher, k: ReturnType<typeof kit>, rng: () => number, artSeed: number, z0 = -18): void {
  const { m, T } = k;
  const farMat = surface({ map: T(farTexture(artSeed)), tint: 0x9aa4bc, emissive: 0.9, contact: 0, spec: 0, breakup: 0.2 });
  for (let i = 0; i < 26; i++) {
    const w = 5 + rng() * 6;
    const h = 9 + rng() * 14;
    const x = -60 + i * 4.8 + rng() * 2;
    const z = z0 - rng() * 22;
    batch.add(boxM(w, h, 6, 8), farMat, M4(x, h / 2 + (z < z0 - 12 ? 3 : 0), z));
    const roof = gableRoof(w, 6, 2.5 + rng() * 2, rng() < 0.5 ? 'x' : 'z', 0.2);
    batch.add(roof.slopes, m.slate, M4(x, h + (z < z0 - 12 ? 3 : 0), z));
  }
  batch.add(boxM(4, 30, 4, 6), m.stone, M4(6, 15, z0 - 16));
  batch.add(new THREE.CylinderGeometry(0, 3.2, 9, 4), m.slate, M4(6, 34.5, z0 - 16, Math.PI / 4));
  batch.add(facePlane(1.2, 1.8), m.winLit[0]!, M4(6, 24, z0 - 13.98));
}

/**
 * Finition commune d'un îlot : géométries fusionnées, ciel, halos additifs (un appel de dessin), lumières dans les
 * uniformes partagés, scintillement, libération.
 */
function finish(scene: THREE.Scene, batch: Batcher, lights: LightDef[], extraHalos: readonly { p: THREE.Vector3; size: number; k: number }[], textures: THREE.Texture[]): QuaiScene {
  const meshes = batch.build(scene);
  scene.add(skyDome());
  const haloMat = new THREE.MeshBasicMaterial({ map: haloTexture(), vertexColors: true, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
  const haloGeos: THREE.BufferGeometry[] = [];
  const haloQuad = (x: number, y: number, z: number, size: number, k: number, color: THREE.Color) => {
    const g = new THREE.PlaneGeometry(size, size).toNonIndexed();
    g.translate(x, y, z);
    const c = color.clone().multiplyScalar(k);
    g.setAttribute('color', new THREE.Float32BufferAttribute(Array.from({ length: g.attributes.position!.count }, () => [c.r, c.g, c.b]).flat(), 3));
    haloGeos.push(g);
  };
  for (const l of lights) if (l.halo) haloQuad(l.x, l.y, l.z + 0.12, l.halo, 0.55, l.color ?? LAMP_WARM);
  for (const h of extraHalos) haloQuad(h.p.x, h.p.y, h.p.z + 0.05, h.size, h.k, LAMP_WARM);
  if (haloGeos.length) {
    const halos = new THREE.Mesh(mergeGeometries(haloGeos, false)!, haloMat);
    halos.renderOrder = 2;
    scene.add(halos);
    for (const g of haloGeos) g.dispose();
  }
  if (lights.length > MAX_LIGHTS) throw new Error(`ville : ${lights.length} lumières (max ${MAX_LIGHTS})`);
  U.uLightCount.value = lights.length;
  lights.forEach((l, i) => U.uLightPos.value[i]!.set(l.x, l.y, l.z, l.radius));
  const base = lights.map((l) => (l.color ?? LAMP_WARM).clone().multiplyScalar(l.intensity));
  const flick = (kind: LightDef['flicker'], t: number, i: number) => {
    const n = (f: number) => Math.sin(t * f + i * 1.7) * 0.5 + Math.sin(t * f * 2.3 + i) * 0.5;
    if (kind === 'lantern') return 0.95 + 0.06 * n(2.2) + 0.03 * Math.sin(9.1 * t + i);
    if (kind === 'candle') return 0.86 + 0.12 * n(11) + 0.05 * n(27);
    return 1;
  };
  return {
    scene,
    lights,
    update(time) {
      U.uTime.value = time;
      lights.forEach((l, i) => {
        const k = flick(l.flicker, time, i);
        U.uLightCol.value[i]!.set(base[i]!.r * k, base[i]!.g * k, base[i]!.b * k);
      });
    },
    stats: () => ({ meshes: meshes + 1, textures: textures.length, lights: lights.length }),
    dispose() {
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        mesh.geometry?.dispose();
        const mats = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
        for (const x of mats) x.dispose();
      });
      for (const t of textures) t.dispose();
    },
  };
}

export function buildQuai(artSeed: number): QuaiScene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x04060c);
  const rng = makeRng(hashString(`ville|quai|${artSeed}`));
  const k = kit(artSeed);
  const { textures, T } = k;
  const { cobble, stone, stoneDark, plasterTex, timberTex, slate, wood, cloth, iron, winLit, winDark, lampGlass } = k.m;
  const lights: LightDef[] = [];
  const batch = new Batcher();

  // --- sol : pavés de la rue, et sous les façades (jamais vu, mais ferme le cadre de la vue de dessus) ---
  {
    const g = new THREE.PlaneGeometry(52, QUAY_Z - FACADE_Z + 0.4);
    g.rotateX(-Math.PI / 2);
    const uv = g.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 52 / 3.2, uv.getY(i) * (QUAY_Z - FACADE_Z + 0.4) / 3.2);
    batch.add(g, cobble, M4(0, 0, (QUAY_Z + FACADE_Z) / 2 - 0.2));
  }
  // --- bord du quai : margelle, mur du quai, eau ---
  batch.add(boxM(52, 0.16, 0.5, 1.6), stone, M4(0, 0.05, QUAY_Z + 0.25));
  {
    const g = facePlane(52, -WATER_Y + 0.1);
    const uv = g.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 52 / 2.4, uv.getY(i) * 1.25 / 2.4);
    batch.add(g, stoneDark, M4(0, WATER_Y / 2 - 0.02, QUAY_Z + 0.5));
  }
  const water = new THREE.Mesh(new THREE.PlaneGeometry(220, 120), waterMaterial());
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, WATER_Y, QUAY_Z + 0.5 + 60);
  scene.add(water);

  // --- façades ---
  // Teintes froides et assez sombres (bande « slate / ash / mist / ivory / dusk » de Cité du Tournoi).
  const tints = [0x8e98ae, 0x9ca2b0, 0x8a96ae, 0xaaa6a0, 0x8590aa];
  for (const [i, f] of FACADES.entries()) buildFacade(f, i);
  // Entrepôts sombres au-delà des deux maisons d'extrémité : le décor ne s'arrête pas dans le champ de la caméra.
  for (const [x0, x1] of [[-34, -19.5], [19.5, 34]] as const) {
    const w = x1 - x0;
    batch.add(boxM(w, 9, DEPTH, 4), stoneDark, M4((x0 + x1) / 2, 4.5, FACADE_Z - DEPTH / 2 - 0.4));
    const roof = gableRoof(w, DEPTH, 2.6, 'x');
    batch.add(roof.slopes, slate, M4((x0 + x1) / 2, 9, FACADE_Z - DEPTH / 2 - 0.4));
    for (let x = x0 + 2; x < x1 - 1; x += 3.2) batch.add(facePlane(2.2, 3.0), winDark, M4(x, 1.6, FACADE_Z - 0.39));
  }
  // Ruelles entre deux façades : fond de pierre sombre en retrait et pavé, pour que le ciel ne passe pas par la fente.
  for (let i = 0; i + 1 < FACADES.length; i++) {
    const a = FACADES[i]!;
    const b = FACADES[i + 1]!;
    const w = b.x0 - a.x1;
    if (w <= 0.05) continue;
    const h = Math.min(a.h, b.h) + 1.5;
    batch.add(boxM(w + 0.2, h, 0.4, 3), stoneDark, M4((a.x1 + b.x0) / 2, h / 2, FACADE_Z - 2.6));
    batch.add(boxM(w, 0.04, 2.6, 1), stoneDark, M4((a.x1 + b.x0) / 2, 0.01, FACADE_Z - 1.3));
  }

  function buildFacade(f: Facade, i: number): void {
    const w = f.x1 - f.x0;
    const cx = (f.x0 + f.x1) / 2;
    const cz = FACADE_Z - DEPTH / 2;
    const r = makeRng(hashString(`ville|facade|${f.id}|${artSeed}`));
    const allStone = f.kind === 'salle';
    // rez-de-chaussée en pierre, étages enduits (colombages pour une maison sur deux)
    batch.add(boxM(w, GROUND_FLOOR, DEPTH), stone, M4(cx, GROUND_FLOOR / 2, cz));
    // Une matière par façade (teinte propre dans la bande froide étroite de Cité du Tournoi) : 5 appels de dessin.
    const upperMat = allStone ? stone : surface({ map: f.seed % 2 ? timberTex : plasterTex, tint: tints[i % tints.length], spec: 0.05, contact: 0.6, breakup: 0.35 });
    batch.add(boxM(w, f.h - GROUND_FLOOR, DEPTH, allStone ? 3 : 4), upperMat, M4(cx, GROUND_FLOOR + (f.h - GROUND_FLOOR) / 2, cz));
    // cordon de pierre entre les niveaux
    batch.add(boxM(w + 0.1, 0.18, 0.22, 2), stone, M4(cx, GROUND_FLOOR, FACADE_Z + 0.05));
    // toit
    const ridge: 'x' | 'z' = f.kind === 'fanal' || f.id === 'chantier' ? 'x' : 'z';
    const roof = gableRoof(w, DEPTH, ROOF_H + (ridge === 'z' ? 0.6 : 0), ridge);
    batch.add(roof.slopes, slate, M4(cx, f.h, cz));
    batch.add(roof.gables, upperMat, M4(cx, f.h, cz));
    // cheminées
    for (let k = 0; k < (w > 7 ? 2 : 1); k++) batch.add(boxM(0.7, 1.8, 0.7, 1.5), stone, M4(f.x0 + w * (0.25 + 0.5 * k) + (r() - 0.5), f.h + ROOF_H * 0.7, cz - 1.2));
    // lucarnes sur les toits à faîtage parallèle
    if (ridge === 'x') {
      for (let k = 0; k < 2; k++) {
        const dx = f.x0 + w * (0.3 + 0.4 * k);
        batch.add(boxM(1.1, 1.3, 1.2, 1.5), upperMat, M4(dx, f.h + 0.9, FACADE_Z - 1.2));
        const dr = gableRoof(1.1, 1.2, 0.6, 'z', 0.12);
        batch.add(dr.slopes, slate, M4(dx, f.h + 1.55, FACADE_Z - 1.2));
        batch.add(facePlane(0.6, 0.8), (r() < 0.6 ? winLit[k % 3] : winDark)!, M4(dx, f.h + 0.95, FACADE_Z - 0.58));
      }
    }
    // fenêtres des étages et du rez-de-chaussée
    const levels = [4.45, 6.85, 9.1].filter((y) => y + 0.8 < f.h);
    const cols = Math.max(2, Math.floor(w / 1.9));
    for (let c = 0; c < cols; c++) {
      const wx = f.x0 + (w / cols) * (c + 0.5);
      for (const y of levels) {
        const lit = r() < 0.42;
        batch.add(facePlane(0.82, 1.25), (lit ? winLit[c % 3] : winDark)!, M4(wx, y, FACADE_Z + 0.015));
        batch.add(boxM(1.0, 0.1, 0.18, 1), stone, M4(wx, y - 0.68, FACADE_Z + 0.06));
        if (lit && r() < 0.35) batch.add(boxM(0.9, 0.22, 0.25, 1), wood, M4(wx, y - 0.55, FACADE_Z + 0.16)); // jardinière
      }
      if (f.door !== null && Math.abs(wx - f.door) < 1.3) continue;
      if (f.kind !== 'salle') batch.add(facePlane(1.0, 1.15), (r() < 0.5 ? winLit[(c + 1) % 3] : winDark)!, M4(wx, 1.65, FACADE_Z + 0.015));
    }
    // porte
    if (f.door !== null) {
      const dw = f.kind === 'salle' ? 1.7 : 1.25;
      const dh = f.kind === 'salle' ? 2.75 : 2.3;
      if (f.kind === 'fanal') {
        // porte ouverte : lumière chaude de la salle commune
        const glow = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.62, 0.3).multiplyScalar(1.6) });
        batch.add(facePlane(dw, dh), glow, M4(f.door, dh / 2, FACADE_Z + 0.01));
        batch.add(facePlane(0.5, dh), wood, M4(f.door - dw / 2 - 0.05, dh / 2, FACADE_Z + 0.35, -1.2));
        lights.push({ x: f.door, y: 1.5, z: FACADE_Z + 0.9, intensity: 2.4, radius: 6.5, halo: 0, flicker: 'candle', color: new THREE.Color(1.0, 0.62, 0.3) });
        // enseigne sans texte au-dessus de la porte
        const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.9), surface({ map: T(fanalSignTexture()), spec: 0.1, contact: 0, emissive: 0.15 }));
        sign.position.set(f.door, dh + 0.85, FACADE_Z + 0.06);
        scene.add(sign);
      } else {
        batch.add(facePlane(dw, dh), wood, M4(f.door, dh / 2, FACADE_Z + 0.012));
        batch.add(boxM(dw + 0.36, 0.3, 0.24, 1), stone, M4(f.door, dh + 0.15, FACADE_Z + 0.08));
        for (const s of [-1, 1]) batch.add(boxM(0.18, dh, 0.22, 1), stone, M4(f.door + s * (dw / 2 + 0.09), dh / 2, FACADE_Z + 0.08));
      }
      // marche devant la porte
      batch.add(boxM(dw + 0.6, 0.14, 0.5, 1), stone, M4(f.door, 0.07, FACADE_Z + 0.25));
    }
    if (f.kind === 'salle') {
      // salle de jeu de cartes : les quatre bannières des familles, deux lanternes murales
      FAMILIES.forEach((fam, k) => {
        const bx = f.x0 + w * ((k + 0.5) / 4);
        const m = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 2.1), surface({ map: T(bannerTexture(fam, artSeed)), contact: 0, spec: 0.05, emissive: 0.12, wrap: 0.8 }));
        m.position.set(bx, 5.8, FACADE_Z + 0.08);
        scene.add(m);
        batch.add(boxM(1.3, 0.06, 0.06, 1), iron, M4(bx, 6.88, FACADE_Z + 0.1));
      });
      for (const s of [-1, 1]) wallLantern(f.door! + s * 1.45, 2.85);
    }
    if (f.id === 'armateur' || f.id === 'chantier') wallLantern(f.door! + 1.0, 2.6);
  }

  function wallLantern(x: number, y: number): void {
    batch.add(boxM(0.06, 0.06, 0.45, 1), iron, M4(x, y + 0.3, FACADE_Z + 0.22));
    batch.add(boxM(0.22, 0.32, 0.22, 1), lampGlass, M4(x, y, FACADE_Z + 0.42));
    lights.push({ x, y, z: FACADE_Z + 0.55, intensity: 2.3, radius: 8, halo: 1.4, flicker: 'lantern' });
  }

  // --- lampadaires du quai (rythme de 9 m) ---
  for (const l of LAMPS) lampPost(batch, k.m, lights, l.x, l.z);
  // guirlande de lanternes entre deux lampadaires (point focal de l'étal) : sans lumière, halos seuls
  const garland: THREE.Vector3[] = [];
  {
    const a = LAMPS[2]!;
    const b = LAMPS[3]!;
    for (let k = 1; k < 10; k++) {
      const t = k / 10;
      garland.push(new THREE.Vector3(a.x + (b.x - a.x) * t, 3.75 - Math.sin(t * Math.PI) * 0.7, a.z));
    }
    const bulb = new THREE.SphereGeometry(0.075, 8, 6);
    for (const p of garland) batch.add(bulb.clone(), lampGlass, M4(p.x, p.y, p.z));
    // Fil : segments droits entre les ampoules (pas de courbe ni de tube : classes que le jeu n'embarque pas).
    const pts = [new THREE.Vector3(a.x, 3.75, a.z), ...garland, new THREE.Vector3(b.x, 3.75, b.z)];
    for (let k = 0; k + 1 < pts.length; k++) {
      const p0 = pts[k]!;
      const p1 = pts[k + 1]!;
      const len = p0.distanceTo(p1);
      const seg = boxM(len, 0.02, 0.02, 1);
      const m = new THREE.Matrix4().compose(p0.clone().add(p1).multiplyScalar(0.5), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.atan2(p1.y - p0.y, p1.x - p0.x))), new THREE.Vector3(1, 1, 1));
      batch.add(seg, iron, m);
    }
  }
  // bornes d'amarrage
  for (const b of BOLLARDS) {
    // Borne de pierre trapue à chapeau plat (une sphère de fer brillante se lisait comme une silhouette d'animal).
    batch.add(new THREE.CylinderGeometry(0.16, 0.2, 0.5, 10), stoneDark, M4(b.x, 0.25, b.z));
    batch.add(new THREE.CylinderGeometry(0.21, 0.19, 0.08, 10), stoneDark, M4(b.x, 0.53, b.z));
  }

  // --- étal principal : table, caisses, toile ivoire, lanterne ---
  {
    const cx = (STALL.x0 + STALL.x1) / 2;
    const cz = (STALL.z0 + STALL.z1) / 2;
    const w = STALL.x1 - STALL.x0;
    const d = STALL.z1 - STALL.z0;
    batch.add(boxM(w, 0.1, d * 0.75, 1), wood, M4(cx, 0.9, cz + d * 0.1));
    batch.add(boxM(w - 0.1, 0.85, 0.06, 1), wood, M4(cx, 0.45, STALL.z1 - 0.12));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) batch.add(boxM(0.09, sz < 0 ? 2.65 : 2.2, 0.09, 1), wood, M4(cx + sx * (w / 2 - 0.08), sz < 0 ? 1.32 : 1.1, cz + sz * (d / 2 - 0.08)));
    // marchandises : caisses et paniers sur la table
    for (let k = 0; k < 5; k++) {
      const s = 0.32 + rng() * 0.18;
      batch.add(boxM(s, s * 0.6, s * 0.8, 1), wood, M4(STALL.x0 + 0.35 + k * 0.6, 0.95 + s * 0.3, cz + 0.15, rng() * 0.3));
    }
    for (let k = 0; k < 3; k++) batch.add(boxM(0.55, 0.45, 0.45, 1), wood, M4(STALL.x1 + 0.1 - k * 0.5, 0.23, STALL.z0 + 0.3, rng() * 0.4));
    // toile : surface courbe tendue de l'arrière (haut) vers l'avant (bas), avec un creux
    const g = new THREE.PlaneGeometry(w + 0.5, d + 0.6, 10, 6);
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i); // le long de la profondeur
      const t = (y + (d + 0.6) / 2) / (d + 0.6); // 0 avant, 1 arrière
      const sag = Math.sin((x / (w + 0.5) + 0.5) * Math.PI) * 0.12 * Math.sin(t * Math.PI);
      p.setXYZ(i, x, 2.2 + t * 0.55 - sag, (0.5 - t) * (d + 0.6));
    }
    g.computeVertexNormals();
    batch.add(g, cloth, M4(cx, 0, cz));
    // lanterne de l'étal (point focal le plus chaud)
    batch.add(boxM(0.2, 0.28, 0.2, 1), lampGlass, M4(cx, 1.95, STALL.z1 + 0.15));
    lights.push({ x: cx, y: 1.95, z: STALL.z1 + 0.25, intensity: 3.4, radius: 8.5, halo: 1.5, flicker: 'lantern' });
  }
  // --- groupes d'accessoires ---
  for (const pr of PROPS) {
    const cx = (pr.x0 + pr.x1) / 2;
    const cz = (pr.z0 + pr.z1) / 2;
    if (pr.kind === 'tonneaux') {
      for (let k = 0; k < 3; k++) batch.add(new THREE.CylinderGeometry(0.3, 0.33, 0.85, 12), wood, M4(pr.x0 + 0.3 + (k % 2) * 0.45, 0.43, pr.z0 + 0.3 + Math.floor(k / 2) * 0.4));
    } else if (pr.kind === 'filets') {
      batch.add(boxM(pr.x1 - pr.x0, 0.35, pr.z1 - pr.z0, 1), surface({ map: T(woodTexture(artSeed + 4)), tint: 0x6a7080, contact: 0, spec: 0.05 }), M4(cx, 0.17, cz));
    } else {
      for (let k = 0; k < 4; k++) {
        const s = 0.5 + rng() * 0.2;
        batch.add(boxM(s, s, s, 1), wood, M4(pr.x0 + 0.3 + (k % 2) * 0.6, s / 2 + (k > 1 ? 0.6 : 0), cz + (rng() - 0.5) * 0.2, rng() * 0.5));
      }
    }
  }

  // --- bateaux amarrés (coque effilée, mât, voile ferlée ivoire) ---
  const boat = (x: number, z: number, len: number, lantern: boolean) => {
    const g = new THREE.BoxGeometry(len, 1.0, 2.0, 12, 1, 2);
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const u = p.getX(i) / (len / 2);
      const taper = 1 - Math.pow(Math.abs(u), 2.4);
      const y = p.getY(i);
      p.setZ(i, p.getZ(i) * Math.max(0.05, taper) * (y < 0 ? 0.6 : 1));
      p.setY(i, y + Math.pow(Math.abs(u), 2) * 0.35);
    }
    g.computeVertexNormals();
    const top = WATER_Y + 0.55;
    batch.add(g, wood, M4(x, top - 0.25, z));
    batch.add(new THREE.CylinderGeometry(0.06, 0.08, 7, 6), wood, M4(x - len * 0.08, top + 3.4, z));
    const furled = new THREE.CylinderGeometry(0.13, 0.13, len * 0.55, 8);
    furled.rotateZ(Math.PI / 2);
    batch.add(furled, cloth, M4(x + len * 0.12, top + 1.4, z));
    if (lantern) {
      batch.add(boxM(0.18, 0.24, 0.18, 1), lampGlass, M4(x + len * 0.42, top + 0.9, z));
      lights.push({ x: x + len * 0.42, y: top + 0.9, z, intensity: 2.4, radius: 7.5, halo: 1.3, flicker: 'lantern' });
    }
  };
  boat(-9.5, QUAY_Z + 2.6, 6.2, true);
  boat(9.5, QUAY_Z + 3.2, 5.0, false);
  boat(-21, QUAY_Z + 4.5, 7.0, false);

  farCity(batch, k, rng, artSeed);
  return finish(scene, batch, lights, garland.map((p) => ({ p, size: 0.55, k: 0.35 })), textures);
}

/** Intérieur de l'arène deviné par la grande porte : gradins sombres en bandes, feux, piste éclairée en bas. */
function gateTexture(seed: number): THREE.CanvasTexture {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  const rng = makeRng(hashString(`ville|porte-arene|${seed}`));
  const grad = g.createLinearGradient(0, 0, 0, S);
  grad.addColorStop(0, '#1a0c06');
  grad.addColorStop(0.55, '#5a2a10');
  grad.addColorStop(1, '#d07a34');
  g.fillStyle = grad;
  g.fillRect(0, 0, S, S);
  for (let i = 0; i < 5; i++) {
    const y = 30 + i * 30;
    g.fillStyle = `rgba(10,6,4,${0.55 - i * 0.07})`;
    g.fillRect(0, y, S, 12);
    for (let k = 0; k < 18; k++) {
      g.fillStyle = `rgba(255,${150 + rng() * 60},${60 + rng() * 40},${0.25 + rng() * 0.35})`;
      g.fillRect(rng() * S, y - 4 + rng() * 3, 2, 2);
    }
  }
  for (const x of [40, 128, 216]) {
    const f = g.createRadialGradient(x, 175, 0, x, 175, 26);
    f.addColorStop(0, 'rgba(255,200,120,0.9)');
    f.addColorStop(1, 'rgba(255,140,60,0)');
    g.fillStyle = f;
    g.fillRect(x - 26, 149, 52, 52);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Façades lointaines : ardoise sombre, quelques fenêtres chaudes (émissives par l'albédo). */
function farTexture(seed: number): THREE.CanvasTexture {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d')!;
  const rng = makeRng(hashString(`ville|loin|${seed}`));
  ctx.fillStyle = 'rgb(10,12,18)';
  ctx.fillRect(0, 0, S, S);
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const lit = rng() < 0.16;
      ctx.fillStyle = lit ? `rgb(${200 + rng() * 55},${120 + rng() * 40},${50 + rng() * 20})` : 'rgb(16,20,30)';
      ctx.fillRect(x * 32 + 10, y * 32 + 8, 12, 16);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/**
 * M09 — le Parvis de l'arène : place dallée, façade monumentale (arcades sombres, grande porte embrasée, frise, quatre
 * bannières des familles), deux braseros (feu : l'ambre le plus fort de la ville), balustrade sur la ville basse.
 */
export function buildParvis(artSeed: number): QuaiScene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x04060c);
  const rng = makeRng(hashString(`ville|parvis|${artSeed}`));
  const k = kit(artSeed);
  const { textures, T } = k;
  const { cobble, stone, stoneDark, wood, iron, lampGlass } = k.m;
  const lights: LightDef[] = [];
  const batch = new Batcher();
  const W = P_X_MAX - P_X_MIN + 8;
  // sol dallé (pavés plus secs que sur le quai)
  const paving = surface({ map: cobble.uniforms.tAlbedo!.value as THREE.Texture, wet: 0.35, spec: 0.16, shin: 30, contact: 0, breakup: 0.3, tint: 0xd8dce6 });
  {
    const d = P_FRONT_Z - P_FACADE_Z + 1.2;
    const g = new THREE.PlaneGeometry(W, d);
    g.rotateX(-Math.PI / 2);
    const uv = g.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * W / 4.2, uv.getY(i) * d / 4.2);
    batch.add(g, paving, M4(0, 0, (P_FRONT_Z + P_FACADE_Z) / 2));
  }
  // balustrade sur la ville basse : muret, piliers, main courante
  batch.add(boxM(W, 0.75, 0.35, 1.6), stone, M4(0, 0.37, P_FRONT_Z + 0.35));
  batch.add(boxM(W, 0.12, 0.5, 1.6), stone, M4(0, 0.8, P_FRONT_Z + 0.35));
  for (let x = P_X_MIN - 3; x <= P_X_MAX + 3; x += 2.4) batch.add(boxM(0.42, 1.05, 0.5, 1), stone, M4(x, 0.52, P_FRONT_Z + 0.35));
  // contrebas : la ville basse (toits) au-delà de la balustrade
  for (let i = 0; i < 14; i++) {
    const w = 5 + rng() * 4;
    const x = -34 + i * 5 + rng() * 2;
    const z = P_FRONT_Z + 6 + rng() * 5;
    const roof = gableRoof(w, 5, 2.2 + rng(), rng() < 0.5 ? 'x' : 'z', 0.2);
    batch.add(boxM(w, 3, 5, 4), stoneDark, M4(x, -4.5, z));
    batch.add(roof.slopes, k.m.slate, M4(x, -3, z));
  }
  // façade monumentale de l'arène
  const FW = P_X_MAX - P_X_MIN + 6;
  const FH = 11;
  batch.add(boxM(FW, FH, 2.4, 3.2), stone, M4(0, FH / 2, P_FACADE_Z - 1.2));
  const dark = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.012, 0.014, 0.024) });
  // arcades sombres (rez-de-chaussée) et arcades hautes, pilastres entre elles
  for (let x = P_X_MIN - 1.5; x <= P_X_MAX + 1.5; x += 3.4) {
    if (Math.abs(x - GATE.x) < GATE.half + 1.4) continue;
    batch.add(facePlane(1.9, 3.4), dark, M4(x, 1.7, P_FACADE_Z + 0.012));
    const arch = new THREE.CircleGeometry(0.95, 16, 0, Math.PI);
    batch.add(arch, dark, M4(x, 3.4, P_FACADE_Z + 0.012));
    batch.add(boxM(0.5, 4.8, 0.3, 1.5), stone, M4(x + 1.7, 2.4, P_FACADE_Z + 0.15));
  }
  for (let x = P_X_MIN; x <= P_X_MAX; x += 2.8) batch.add(facePlane(1.2, 1.8), dark, M4(x, 7.6, P_FACADE_Z + 0.012));
  // frise et corniche
  batch.add(boxM(FW, 0.4, 0.5, 2), stone, M4(0, 5.3, P_FACADE_Z + 0.2));
  batch.add(boxM(FW, 0.5, 0.7, 2), stone, M4(0, FH - 0.2, P_FACADE_Z + 0.25));
  // grande porte embrasée : ouverture chaude, herse relevée, encadrement, marches
  // Ouverture chaude mais pas brûlée : l'ambre reste un accent (le halo vient du post-traitement).
  const glow = new THREE.MeshBasicMaterial({ map: T(gateTexture(artSeed)), color: new THREE.Color(1, 1, 1).multiplyScalar(1.15) });
  batch.add(facePlane(GATE.half * 2, GATE.h - GATE.half), glow, M4(GATE.x, (GATE.h - GATE.half) / 2, P_FACADE_Z + 0.01));
  batch.add(new THREE.CircleGeometry(GATE.half, 24, 0, Math.PI), glow, M4(GATE.x, GATE.h - GATE.half, P_FACADE_Z + 0.01));
  for (let i = 0; i < 7; i++) batch.add(boxM(0.07, 1.2, 0.07, 1), iron, M4(GATE.x - GATE.half + 0.35 + i * ((GATE.half * 2 - 0.7) / 6), GATE.h - 0.9, P_FACADE_Z + 0.05));
  for (const s of [-1, 1]) batch.add(boxM(0.6, GATE.h + 0.4, 0.5, 1.5), stone, M4(GATE.x + s * (GATE.half + 0.3), (GATE.h + 0.4) / 2, P_FACADE_Z + 0.25));
  batch.add(boxM(GATE.half * 2 + 1.8, 0.16, 1.2, 1), stone, M4(GATE.x, 0.08, P_FACADE_Z + 0.6));
  batch.add(boxM(GATE.half * 2 + 1.2, 0.16, 0.7, 1), stone, M4(GATE.x, 0.24, P_FACADE_Z + 0.35));
  lights.push({ x: GATE.x, y: 2.0, z: P_FACADE_Z + 1.0, intensity: 2.2, radius: 9, halo: 0, flicker: 'candle', color: new THREE.Color(1.0, 0.58, 0.26) });
  // bannières des familles au-dessus des arcades
  FAMILIES.forEach((fam, i) => {
    const bx = [-9.5, -5.6, 5.6, 9.5][i]!;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 3.0), surface({ map: T(bannerTexture(fam, artSeed + 3)), contact: 0, spec: 0.05, emissive: 0.12, wrap: 0.8 }));
    m.position.set(bx, 7.4, P_FACADE_Z + 0.1);
    scene.add(m);
    batch.add(boxM(1.8, 0.07, 0.07, 1), iron, M4(bx, 8.95, P_FACADE_Z + 0.12));
  });
  // braseros : socle de pierre, vasque de fer, flamme émissive ; lumière de feu
  const fire = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.3, 0.06).multiplyScalar(1.25) });
  const fireCore = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.62, 0.22).multiplyScalar(1.6) });
  for (const b of BRAZIERS) {
    batch.add(new THREE.CylinderGeometry(0.42, 0.55, 1.0, 12), stone, M4(b.x, 0.5, b.z));
    batch.add(new THREE.CylinderGeometry(0.6, 0.32, 0.35, 12), iron, M4(b.x, 1.18, b.z));
    batch.add(new THREE.CylinderGeometry(0, 0.42, 0.85, 7), fire, M4(b.x, 1.75, b.z));
    batch.add(new THREE.CylinderGeometry(0, 0.22, 0.5, 6), fireCore, M4(b.x, 1.62, b.z + 0.18));
    lights.push({ x: b.x, y: 1.9, z: b.z + 0.2, intensity: 4.5, radius: 10, halo: 2.4, flicker: 'candle', color: new THREE.Color(1.0, 0.5, 0.2) });
  }
  // lampadaires le long de la balustrade
  for (const l of P_LAMPS) lampPost(batch, k.m, lights, l.x, l.z);
  // table des inscriptions et tonneaux
  {
    const cx = (BOOTH.x0 + BOOTH.x1) / 2;
    const cz = (BOOTH.z0 + BOOTH.z1) / 2;
    batch.add(boxM(BOOTH.x1 - BOOTH.x0, 0.1, BOOTH.z1 - BOOTH.z0 - 0.2, 1), wood, M4(cx, 0.88, cz));
    for (const sx of [-1, 1]) batch.add(boxM(0.1, 0.88, 0.8, 1), wood, M4(cx + sx * ((BOOTH.x1 - BOOTH.x0) / 2 - 0.15), 0.44, cz));
    batch.add(boxM(0.5, 0.3, 0.35, 1), wood, M4(cx - 0.5, 1.08, cz));
    batch.add(boxM(0.18, 0.24, 0.18, 1), lampGlass, M4(cx + 0.6, 1.05, cz));
    lights.push({ x: cx + 0.6, y: 1.1, z: cz + 0.3, intensity: 1.8, radius: 5, halo: 1.0, flicker: 'lantern' });
  }
  for (const pr of P_PROPS) for (let i = 0; i < 3; i++) batch.add(new THREE.CylinderGeometry(0.3, 0.33, 0.85, 12), wood, M4(pr.x0 + 0.3 + (i % 2) * 0.45, 0.43, pr.z0 + 0.3 + Math.floor(i / 2) * 0.4));
  return finish(scene, batch, lights, [], textures);
}
