/**
 * M09 V1/V2 — construction des îlots du Parvis de l'arène et des Ruelles, et outils communs des îlots (fusion par
 * matière, toits, finition : ciel, halos, lumières). Le Quai est reconstruit à part depuis la passe de qualité V3
 * (`quaiScene.ts`) ; ce qui suit décrit la DA d'origine, gardée pour le Parvis et les Ruelles jusqu'à validation :
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
  LAMP_WARM, MAX_LIGHTS, U, ashlarTexture, canvasCloth, cobbleTexture, haloTexture, plasterTexture, skyDome, slateTexture,
  surface, waterMaterial, windowTexture, woodTexture,
} from './materiaux';
import { BOOTH, BRAZIERS, GATE, P_FACADE_Z, P_FRONT_Z, P_LAMPS, P_PROPS, P_X_MAX, P_X_MIN } from './parvis';
import { FOUNTAIN, NARROW, R_EDGE_Z, R_FACADE_Z, R_LAMPS, R_WATER_Y, SEER } from './ruelles';

export interface LightDef { x: number; y: number; z: number; intensity: number; radius: number; halo: number; flicker: 'lantern' | 'candle' | 'window' | 'none'; color?: THREE.Color }

export interface QuaiScene {
  scene: THREE.Scene;
  lights: LightDef[];
  /** Avance l'animation (scintillement des lanternes, eau, ciel). */
  update(time: number): void;
  stats(): { meshes: number; textures: number; lights: number };
  dispose(): void;
}

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

export const M4 = (x: number, y: number, z: number, ry = 0, sx = 1, sy = 1, sz = 1) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(sx, sy, sz));

/** Boîte dont les UV suivent les mètres (une répétition de texture tous les `tile` mètres sur chaque face). */
export function boxM(w: number, h: number, d: number, tile = 3): THREE.BufferGeometry {
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
export function gableRoof(w: number, d: number, h: number, ridge: 'x' | 'z', over = 0.35): { slopes: THREE.BufferGeometry; gables: THREE.BufferGeometry } {
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
export const facePlane = (w: number, h: number) => new THREE.PlaneGeometry(w, h);

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
export function lampPost(batch: Batcher, m: ReturnType<typeof kit>['m'], lights: LightDef[], x: number, z: number): void {
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
export function finish(scene: THREE.Scene, batch: { build(into: THREE.Object3D): number }, lights: LightDef[], extraHalos: readonly { p: THREE.Vector3; size: number; k: number }[], textures: THREE.Texture[]): QuaiScene {
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

/**
 * M09 — les Ruelles (quartier du Voile) : maisons hautes et étroites à pignon sur rue et encorbellement, bannières du
 * Voile, linge tendu entre les étages, fontaine (point focal), étal de la liseuse ; canal au premier plan.
 */
export function buildRuelles(artSeed: number): QuaiScene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x04060c);
  const rng = makeRng(hashString(`ville|ruelles|${artSeed}`));
  const k = kit(artSeed);
  const { textures, T } = k;
  const { cobble, stone, stoneDark, plasterTex, timberTex, slate, wood, cloth, iron, winLit, winDark, lampGlass } = k.m;
  const lights: LightDef[] = [];
  const batch = new Batcher();
  const D = 6;
  // sol, margelle du canal, mur, eau
  {
    const d = R_EDGE_Z - R_FACADE_Z + 0.4;
    const g = new THREE.PlaneGeometry(44, d);
    g.rotateX(-Math.PI / 2);
    const uv = g.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 44 / 3.2, uv.getY(i) * d / 3.2);
    batch.add(g, cobble, M4(0, 0, (R_EDGE_Z + R_FACADE_Z) / 2 - 0.2));
  }
  batch.add(boxM(44, 0.16, 0.4, 1.6), stone, M4(0, 0.05, R_EDGE_Z + 0.2));
  batch.add(facePlane(44, -R_WATER_Y + 0.1), stoneDark, M4(0, R_WATER_Y / 2 - 0.02, R_EDGE_Z + 0.4));
  const water = new THREE.Mesh(new THREE.PlaneGeometry(160, 60), waterMaterial());
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, R_WATER_Y, R_EDGE_Z + 0.4 + 30);
  scene.add(water);
  // barque amarrée et pieux
  {
    const g = new THREE.BoxGeometry(3.6, 0.6, 1.2, 8, 1, 2);
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) { const u = p.getX(i) / 1.8; p.setZ(i, p.getZ(i) * Math.max(0.08, 1 - Math.pow(Math.abs(u), 2.2))); p.setY(i, p.getY(i) + u * u * 0.2); }
    g.computeVertexNormals();
    batch.add(g, wood, M4(-6.5, R_WATER_Y + 0.25, R_EDGE_Z + 1.6));
    for (const x of [-9, -4.2, 6]) batch.add(new THREE.CylinderGeometry(0.09, 0.11, 1.8, 6), wood, M4(x, R_WATER_Y + 0.7, R_EDGE_Z + 0.75));
  }
  // maisons étroites : rez-de-chaussée de pierre, étages à encorbellement, pignon sur rue
  const tints = [0x8c96b0, 0x9aa2b6, 0x8892aa, 0xa4a6b0, 0x8e9ab4, 0x969cae, 0x8a94ac];
  const banners: number[] = [];
  NARROW.forEach((hse, i) => {
    const w = hse.x1 - hse.x0;
    const cx = (hse.x0 + hse.x1) / 2;
    const r = makeRng(hashString(`ville|ruelle|${hse.seed}|${artSeed}`));
    const upper = surface({ map: i % 2 ? timberTex : plasterTex, tint: tints[i % tints.length], spec: 0.05, contact: 0.6, breakup: 0.35 });
    batch.add(boxM(w, 3.1, D, 3), stone, M4(cx, 1.55, R_FACADE_Z - D / 2));
    // encorbellement : l'étage avance de 0,5 m sur la rue, soutenu par des corbeaux
    batch.add(boxM(w, hse.h - 3.1, D, 4), upper, M4(cx, 3.1 + (hse.h - 3.1) / 2, R_FACADE_Z - D / 2 + 0.5));
    for (let x = hse.x0 + 0.5; x < hse.x1; x += 1.3) batch.add(boxM(0.18, 0.35, 0.5, 1), wood, M4(x, 2.95, R_FACADE_Z + 0.2));
    const roof = gableRoof(w, D, 3.6, 'z', 0.25);
    batch.add(roof.slopes, slate, M4(cx, hse.h, R_FACADE_Z - D / 2 + 0.5));
    batch.add(roof.gables, upper, M4(cx, hse.h, R_FACADE_Z - D / 2 + 0.5));
    // fenêtres (étages) et vitrine (rez-de-chaussée)
    const fz = R_FACADE_Z + 0.515;
    for (const y of [4.3, 6.7, 9.0].filter((v) => v + 0.8 < hse.h)) {
      // Une maison sur deux porte une bannière au centre : ses fenêtres vont de part et d'autre.
      for (const dx of w > 4.4 || i % 2 === 1 ? [-1.1, 1.1] : [0]) {
        const lit = r() < 0.45;
        batch.add(facePlane(0.75, 1.15), (lit ? winLit[(i + y) % 3 | 0] : winDark)!, M4(cx + dx, y, fz));
      }
    }
    batch.add(facePlane(1.1, 2.1), wood, M4(hse.door, 1.05, R_FACADE_Z + 0.012));
    batch.add(boxM(1.4, 0.24, 0.2, 1), stone, M4(hse.door, 2.22, R_FACADE_Z + 0.06));
    const shopX = hse.door + (hse.door > cx ? -1.5 : 1.5);
    if (Math.abs(shopX - cx) < w / 2 - 0.6) batch.add(facePlane(1.1, 1.0), (r() < 0.6 ? winLit[i % 3] : winDark)!, M4(shopX, 1.6, R_FACADE_Z + 0.012));
    if (i % 2 === 1) banners.push(cx);
  });
  // Passages entre deux maisons : fond de pierre sombre en retrait (le ciel ne passe pas par la fente) ; au-delà des
  // maisons extrêmes, un bloc sombre ferme la rue jusqu'au bord du cadre (caméra en butée).
  for (let i = 0; i + 1 < NARROW.length; i++) {
    const a = NARROW[i]!;
    const b = NARROW[i + 1]!;
    const w = b.x0 - a.x1;
    const h = Math.min(a.h, b.h) + 1.5;
    batch.add(boxM(w + 0.2, h, 0.4, 3), stoneDark, M4((a.x1 + b.x0) / 2, h / 2, R_FACADE_Z - 2.4));
    batch.add(boxM(w, 0.04, 2.4, 1), stoneDark, M4((a.x1 + b.x0) / 2, 0.01, R_FACADE_Z - 1.2));
  }
  for (const [x0, x1] of [[-30, NARROW[0]!.x0], [NARROW[NARROW.length - 1]!.x1, 30]] as const) {
    const w = x1 - x0;
    batch.add(boxM(w, 10, D, 4), stoneDark, M4((x0 + x1) / 2, 5, R_FACADE_Z - D / 2 - 0.3));
    const roof = gableRoof(w, D, 2.6, 'x');
    batch.add(roof.slopes, slate, M4((x0 + x1) / 2, 10, R_FACADE_Z - D / 2 - 0.3));
    for (let x = x0 + 1.6; x < x1 - 1; x += 3.0) batch.add(facePlane(1.6, 2.4), winDark, M4(x, 1.4, R_FACADE_Z - 0.29));
  }
  // bannières du Voile aux façades (une maison sur deux)
  banners.forEach((bx, i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.9), surface({ map: T(bannerTexture('Voile', artSeed + 7 + i)), contact: 0, spec: 0.05, emissive: 0.12, wrap: 0.8 }));
    m.position.set(bx, 5.4, R_FACADE_Z + 0.56);
    scene.add(m);
    batch.add(boxM(1.1, 0.06, 0.06, 1), iron, M4(bx, 6.4, R_FACADE_Z + 0.58));
  });
  // linge tendu entre les étages (toile ivoire et toile ardoise), au-dessus de la ruelle
  const slateCloth = surface({ map: T(canvasCloth(artSeed + 5)), tint: 0x56607a, spec: 0.02, contact: 0, wrap: 0.9, side: THREE.DoubleSide });
  for (const [x0, x1, y] of [[-10.5, -5.5, 7.4], [-1.0, 4.4, 8.1], [6.0, 11.5, 7.0]] as const) {
    const n = 7;
    for (let j = 0; j <= n; j++) {
      const t = j / n;
      const x = x0 + (x1 - x0) * t;
      const yy = y - Math.sin(t * Math.PI) * 0.45;
      if (j < n) {
        const xn = x0 + (x1 - x0) * ((j + 1) / n);
        const yn = y - Math.sin(((j + 1) / n) * Math.PI) * 0.45;
        const len = Math.hypot(xn - x, yn - yy);
        batch.add(boxM(len, 0.015, 0.015, 1), iron, new THREE.Matrix4().compose(new THREE.Vector3((x + xn) / 2, (yy + yn) / 2, R_FACADE_Z + 0.9), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.atan2(yn - yy, xn - x))), new THREE.Vector3(1, 1, 1)));
      }
      if (j > 0 && j < n && rng() < 0.8) {
        const cw = 0.35 + rng() * 0.3;
        const ch = 0.45 + rng() * 0.35;
        batch.add(facePlane(cw, ch), rng() < 0.5 ? cloth : slateCloth, M4(x, yy - ch / 2, R_FACADE_Z + 0.9));
      }
    }
  }
  // fontaine du Voile (point focal) : bassin, eau, colonne, vasque
  {
    batch.add(new THREE.CylinderGeometry(FOUNTAIN.r, FOUNTAIN.r + 0.08, 0.55, 20), stone, M4(FOUNTAIN.x, 0.27, FOUNTAIN.z));
    const pool = new THREE.Mesh(new THREE.CircleGeometry(FOUNTAIN.r - 0.1, 24), waterMaterial());
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(FOUNTAIN.x, 0.48, FOUNTAIN.z);
    scene.add(pool);
    batch.add(new THREE.CylinderGeometry(0.14, 0.2, 1.5, 10), stone, M4(FOUNTAIN.x, 1.0, FOUNTAIN.z));
    batch.add(new THREE.CylinderGeometry(0.5, 0.18, 0.2, 14), stone, M4(FOUNTAIN.x, 1.78, FOUNTAIN.z));
    batch.add(new THREE.SphereGeometry(0.13, 10, 8), stone, M4(FOUNTAIN.x, 1.98, FOUNTAIN.z));
  }
  // étal de la liseuse : table, toile ardoise, boule de cristal (seul éclat froid), bougies
  {
    const cx = (SEER.x0 + SEER.x1) / 2;
    const cz = (SEER.z0 + SEER.z1) / 2;
    batch.add(boxM(SEER.x1 - SEER.x0, 0.08, SEER.z1 - SEER.z0 - 0.1, 1), wood, M4(cx, 0.85, cz));
    batch.add(boxM(SEER.x1 - SEER.x0 - 0.1, 0.8, 0.05, 1), slateCloth, M4(cx, 0.43, SEER.z1 - 0.08));
    for (const sx of [-1, 1]) batch.add(boxM(0.08, 2.3, 0.08, 1), wood, M4(cx + sx * ((SEER.x1 - SEER.x0) / 2 - 0.06), 1.15, SEER.z1 - 0.06));
    batch.add(boxM(SEER.x1 - SEER.x0 + 0.4, 0.05, 1.3, 1), slateCloth, M4(cx, 2.3, cz));
    const crystal = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.62, 0.7, 0.85).multiplyScalar(1.4) });
    batch.add(new THREE.SphereGeometry(0.16, 14, 10), crystal, M4(cx, 1.05, cz));
    batch.add(boxM(0.06, 0.14, 0.06, 1), lampGlass, M4(cx + 0.7, 0.96, cz));
    lights.push({ x: cx + 0.7, y: 1.05, z: cz + 0.4, intensity: 1.6, radius: 5, halo: 0.8, flicker: 'candle' });
  }
  // lanternes murales et lampadaires du canal
  for (const x of [-13.6, -4.3, 5.9 - 1.4, 10.7 + 1.2]) {
    batch.add(boxM(0.06, 0.06, 0.4, 1), iron, M4(x, 3.4, R_FACADE_Z + 0.75));
    batch.add(boxM(0.2, 0.3, 0.2, 1), lampGlass, M4(x, 3.1, R_FACADE_Z + 0.92));
    lights.push({ x, y: 3.1, z: R_FACADE_Z + 1.05, intensity: 2.2, radius: 7.5, halo: 1.3, flicker: 'lantern' });
  }
  for (const l of R_LAMPS) lampPost(batch, k.m, lights, l.x, l.z);
  farCity(batch, k, rng, artSeed, -16);
  return finish(scene, batch, lights, [], textures);
}
