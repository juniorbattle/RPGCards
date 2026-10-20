/**
 * M09 V4 — ombres d'un diorama en rangs (passe 68 ; le responsable : « je remarque des assets mal intégrés qui donnent
 * cette sensation d'image posée sur la scène ; éventuellement il faudrait mettre des ombres pour optimiser cette
 * immersion ») : tirées des plans eux-mêmes, au sol, sous les personnages : ombre de contact sous chaque objet debout
 * (étal, puits, fontaine, charrette, lampadaire…), ombre portée au pied de chaque façade, ombre au pied des murs des
 * passages (le passage est dans l'ombre). Chacune suit l'opacité de son plan (fantôme, fondu). Dessinées par le moteur.
 */
import * as THREE from 'three';
import type { PlateRect } from './decors';
import { LAYER_NOREFLECT } from './reflets';

export type OmbreKind = 'contact' | 'pied' | 'mur';
export interface Ombre { kind: OmbreKind; x: number; z: number; w: number; d: number; alpha: number; flip?: boolean }

/**
 * Ombres d'un plan posé au sol (pur) : un objet (6,5 m de large et 6 m de haut au plus) a son ombre de contact ; un
 * bâtiment (6 m de haut au moins) son ombre au pied, sur 1,6 m devant lui ; un mur de côté la sienne, sur 1,3 m du côté
 * peint. Les bandes d'accessoires (larges et basses) et les plans hors du sol n'en ont pas.
 */
export function ombresDuPlan(r: PlateRect, at: readonly [number, number, number], vers?: 'est' | 'ouest'): Ombre[] {
  if (Math.abs(at[1]) > 0.25) return [];
  if (r.orient === 'cote') {
    const d = 1.3;
    return [{ kind: 'mur', x: vers === 'ouest' ? at[0] - d / 2 : at[0] + d / 2, z: at[2], w: d, d: r.w, alpha: 0.5, flip: vers === 'ouest' }];
  }
  if (r.orient !== 'face') return [];
  if (r.h >= 6) return [{ kind: 'pied', x: r.center[0], z: at[2] + 0.8, w: r.w, d: 1.6, alpha: 0.42 }];
  if (r.w <= 6.5) return [{ kind: 'contact', x: r.center[0], z: at[2] - 0.12, w: r.w * 0.92, d: 0.9 + 0.16 * r.w, alpha: 0.58 }];
  return [];
}

const FRAG = /* glsl */ `
uniform float uAlpha; uniform float uKind; uniform float uFlip;
varying vec2 vUv;
void main(){
  float a;
  if (uKind < 0.5) {
    // contact : ellipse douce, plus sombre au cœur
    float d = length((vUv - 0.5) * 2.0);
    a = 1.0 - smoothstep(0.25, 1.0, d);
  } else if (uKind < 1.5) {
    // pied d'une façade : sombre contre le mur (uv.y = 1, vers le fond), fondu vers la rue ; bords fondus
    a = pow(vUv.y, 1.7) * smoothstep(0.0, 0.03, vUv.x) * (1.0 - smoothstep(0.97, 1.0, vUv.x));
  } else {
    // pied d'un mur de côté : sombre contre le mur, fondu vers le milieu du passage
    float u = uFlip > 0.5 ? vUv.x : 1.0 - vUv.x;
    a = pow(u, 1.4) * smoothstep(0.0, 0.08, vUv.y) * (1.0 - smoothstep(0.92, 1.0, vUv.y));
  }
  gl_FragColor = vec4(0.0, 0.0, 0.0, a * uAlpha);
}`;

export function ombreMesh(o: Ombre): { mesh: THREE.Mesh; mat: THREE.ShaderMaterial } {
  const mat = new THREE.ShaderMaterial({
    name: 'VilleOmbre',
    uniforms: { uAlpha: { value: o.alpha }, uKind: { value: o.kind === 'contact' ? 0 : o.kind === 'pied' ? 1 : 2 }, uFlip: { value: o.flip ? 1 : 0 } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
  });
  const g = new THREE.PlaneGeometry(o.w, o.d);
  g.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(g, mat);
  mesh.name = `ombre:${o.kind}`;
  mesh.position.set(o.x, 0.015, o.z);
  mesh.renderOrder = 1;
  mesh.layers.set(LAYER_NOREFLECT);
  return { mesh, mat };
}
