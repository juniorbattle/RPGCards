/**
 * M09 — outils communs des îlots de la ville : toits à deux pans, finition d'un îlot (géométries fusionnées, ciel, halos,
 * lumières dans les uniformes partagés, scintillement, libération). Depuis la passe 49, les trois îlots sont construits
 * dans la direction D (ADR 026) avec la grammaire commune (`grammaire.ts`) : le Quai (`quaiScene.ts`), le Parvis
 * (`parvisScene.ts`), les Ruelles (`ruellesScene.ts`) ; les constructeurs d'origine du Parvis et des Ruelles (M09 V1/V2)
 * sont retirés (historique : `git show b853e5b:src/ville/scene.ts`).
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { LAMP_WARM, MAX_LIGHTS, U, haloTexture, skyDome } from './materiaux';

export interface LightDef { x: number; y: number; z: number; intensity: number; radius: number; halo: number; flicker: 'lantern' | 'candle' | 'window' | 'none'; color?: THREE.Color }

export interface QuaiScene {
  scene: THREE.Scene;
  lights: LightDef[];
  /** Avance l'animation (scintillement des lanternes, eau, ciel). */
  update(time: number): void;
  /**
   * Position du personnage (passe 62, diorama) : les plans `coupe` derrière lesquels il passe s'effacent ; `snap` :
   * immédiatement (captures figées), sinon en douceur.
   */
  focus?(p: { x: number; z: number }, snap: boolean): void;
  stats(): { meshes: number; textures: number; lights: number };
  dispose(): void;
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

/**
 * Finition commune d'un îlot : géométries fusionnées, ciel, halos additifs (un appel de dessin), lumières dans les
 * uniformes partagés, scintillement, libération.
 */
export function finish(scene: THREE.Scene, batch: { build(into: THREE.Object3D): number }, lights: LightDef[], extraHalos: readonly { p: THREE.Vector3; size: number; k: number; color?: THREE.Color }[], textures: THREE.Texture[]): QuaiScene {
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
  for (const h of extraHalos) haloQuad(h.p.x, h.p.y, h.p.z + 0.05, h.size, h.k, h.color ?? LAMP_WARM);
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
