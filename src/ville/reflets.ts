/**
 * M09 V3 (passe 47) — reflet plan de la rue : la scène vue par une caméra symétrique de la caméra principale par rapport
 * au plan des pavés (y = 0), rendue à demi-définition dans une cible à mipmaps, lue par les flaques (`surface`, `MIRROR`)
 * et par l'eau du port (`waterMaterial`, `refl`). Adapté de Cité du Tournoi (RPG-ArtByCode, lecture seule),
 * `src/atmosphere/ShadowAndReflection.ts` L. 42-106 : même caméra miroir (vecteur haut retourné, projection de la caméra
 * principale), plan proche incliné sur le plan du sol (cadre oblique de Lengyel) pour que rien de ce qui est sous les
 * pavés (mur du quai, eau) n'entre dans le reflet, sans `discard` dans les nuanceurs.
 * Le sol et l'eau, qui lisent cette cible, sont sur le calque `LAYER_NOREFLECT` : la caméra miroir ne les dessine pas
 * (sinon la texture lue serait aussi la cible écrite).
 */
import * as THREE from 'three';
import { U } from './materiaux';

/** Calque des objets vus par la caméra principale seulement (sol, eau, brumes, poussières). */
export const LAYER_NOREFLECT = 2;

export class PlanarReflection {
  private rt: THREE.WebGLRenderTarget;
  private readonly cam = new THREE.PerspectiveCamera();
  private readonly plane = new THREE.Plane();
  private readonly v4 = new THREE.Vector4();
  private readonly q = new THREE.Vector4();
  private readonly t = new THREE.Vector3();
  private readonly up = new THREE.Vector3();
  private readonly clear = new THREE.Color();
  private w = 2;
  private h = 2;
  /** Échelle de la cible par rapport à l'image (demi-définition). */
  readonly scale = 0.5;

  constructor() {
    this.rt = this.make(2, 2);
    this.cam.layers.set(0);
  }

  private make(w: number, h: number): THREE.WebGLRenderTarget {
    return new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, depthBuffer: true, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter });
  }

  setSize(w: number, h: number): void {
    const rw = Math.max(2, Math.round(w * this.scale));
    const rh = Math.max(2, Math.round(h * this.scale));
    if (rw === this.w && rh === this.h) return;
    this.w = rw;
    this.h = rh;
    this.rt.dispose();
    this.rt = this.make(rw, rh);
  }

  /** Plan proche incliné sur le plan monde y = 0 (Lengyel, « Oblique View Frustum Depth Projection and Clipping »). */
  private obliqueClip(c: THREE.PerspectiveCamera): void {
    this.plane.set(new THREE.Vector3(0, 1, 0), 0).applyMatrix4(c.matrixWorldInverse);
    const cp = this.v4.set(this.plane.normal.x, this.plane.normal.y, this.plane.normal.z, this.plane.constant);
    const e = c.projectionMatrix.elements;
    const q = this.q.set((Math.sign(cp.x) + e[8]!) / e[0]!, (Math.sign(cp.y) + e[9]!) / e[5]!, -1, (1 + e[10]!) / e[14]!);
    cp.multiplyScalar(2 / cp.dot(q));
    e[2] = cp.x;
    e[6] = cp.y;
    e[10] = cp.z + 1;
    e[14] = cp.w;
    c.projectionMatrixInverse.copy(c.projectionMatrix).invert();
  }

  update(renderer: THREE.WebGLRenderer, scene: THREE.Scene, main: THREE.PerspectiveCamera): void {
    const c = this.cam;
    main.updateMatrixWorld();
    this.t.set(0, 0, -1).applyQuaternion(main.quaternion).add(main.position);
    this.up.set(0, 1, 0).applyQuaternion(main.quaternion);
    c.position.set(main.position.x, -main.position.y, main.position.z);
    c.up.set(this.up.x, -this.up.y, this.up.z);
    c.lookAt(this.t.x, -this.t.y, this.t.z);
    c.updateMatrixWorld(true);
    c.projectionMatrix.copy(main.projectionMatrix);
    this.obliqueClip(c);
    const prev = renderer.getRenderTarget();
    const clearAlpha = renderer.getClearAlpha();
    renderer.getClearColor(this.clear);
    renderer.setRenderTarget(this.rt);
    renderer.setClearColor(0x04060c, 1);
    renderer.clear(true, true, true);
    renderer.render(scene, c);
    renderer.setRenderTarget(prev);
    renderer.setClearColor(this.clear, clearAlpha);
    U.uReflVP.value.multiplyMatrices(c.projectionMatrix, c.matrixWorldInverse);
    U.uReflMap.value = this.rt.texture;
    U.uReflReady.value = 1;
  }

  dispose(): void {
    this.rt.dispose();
    U.uReflReady.value = 0;
    U.uReflMap.value = null;
  }
}
