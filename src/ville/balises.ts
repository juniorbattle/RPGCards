/**
 * M09 V4 — balises des passages d'un quartier en rangs (passe 67, `rangs.ts` : `balisesRangs`) : au sol, à chaque bouche
 * d'un passage, une lueur ambrée et trois chevrons qui filent lentement vers le rang où il mène ; on retrouve ainsi le
 * chemin pour s'enfoncer comme pour revenir. Dessinées par le moteur (aucune image), additives, sous les personnages,
 * cachées par les façades pleines, hors du reflet.
 */
import * as THREE from 'three';
import type { Balise } from './rangs';
import { LAYER_NOREFLECT } from './reflets';

const FRAG = /* glsl */ `
uniform float uT; uniform float uSens; uniform vec3 uCol;
varying vec2 vUv;
void main(){
  // t croît dans le sens de la marche (uv.y = 1 vers le fond, z négatif)
  float t = uSens < 0.0 ? vUv.y : 1.0 - vUv.y;
  vec2 d = (vUv - 0.5) * vec2(1.0, 1.25);
  float glow = 1.0 - smoothstep(0.12, 0.5, length(d));
  float q = fract(t * 3.0 - uT * 0.45);
  float x = abs(vUv.x - 0.5);
  float v = q + x * 1.3;
  float chev = smoothstep(0.50, 0.56, v) * (1.0 - smoothstep(0.64, 0.70, v)) * (1.0 - smoothstep(0.24, 0.3, x));
  // les chevrons s'allument en entrant dans la lueur et s'éteignent à sa sortie
  chev *= smoothstep(0.05, 0.3, t) * (1.0 - smoothstep(0.7, 0.95, t));
  float pulse = 0.8 + 0.2 * sin(uT * 2.1);
  float a = (glow * 0.16 + chev * glow * 0.55) * pulse;
  // mélange additif de three.js (source × alpha + destination)
  gl_FragColor = vec4(uCol, a);
}`;

export function baliseMeshes(balises: readonly Balise[]): { meshes: THREE.Mesh[]; mats: THREE.ShaderMaterial[] } {
  const meshes: THREE.Mesh[] = [];
  const mats: THREE.ShaderMaterial[] = [];
  for (const b of balises) {
    const mat = new THREE.ShaderMaterial({
      name: 'VilleBalise',
      uniforms: { uT: { value: 0 }, uSens: { value: b.sens }, uCol: { value: new THREE.Color(1.0, 0.72, 0.38) } },
      vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const g = new THREE.PlaneGeometry(Math.max(1.6, b.largeur - 0.2), 2.4);
    g.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(g, mat);
    mesh.name = `balise:${b.id}`;
    mesh.position.set(b.x, 0.03, b.z);
    mesh.renderOrder = 2;
    mesh.layers.set(LAYER_NOREFLECT);
    meshes.push(mesh);
    mats.push(mat);
  }
  return { meshes, mats };
}
