/**
 * M09 V4 — chemins lumineux d'un quartier en rangs (passe 68, `rangs.ts` : `cheminsRangs`). Le responsable : « non pas
 * des flèches de direction, soyons plus optimistes : des chemins subtilement lumineux afin de connaître notre chemin »,
 * puis « un peu plus fluides et dissimulés, il faut qu'ils se fondent à la scène de manière saine et cohérente ».
 *
 * Un seul plan au sol couvre le quartier ; son nuanceur tire un champ de distance aux segments du chemin, unis en douceur
 * (coudes arrondis) et légèrement ondulés (pas de tracé à la règle). La lumière se pose sur les pavés eux-mêmes : le relief
 * de la texture du sol du moteur (son alpha) fait briller le dessus des pierres et laisse les joints dans l'ombre, comme
 * un reflet ambré sur la pierre mouillée ; elle respire lentement, sans aucun sens marqué, et se révèle surtout autour du
 * personnage. Dessiné par le moteur (aucune image), additif, caché par les façades pleines, hors du reflet.
 */
import * as THREE from 'three';
import type { Rect } from './monde';
import type { CheminSegment } from './rangs';
import { LAYER_NOREFLECT } from './reflets';

export const CHEMIN_MAX_SEGMENTS = 16;

const FRAG = /* glsl */ `
uniform vec4 uSeg[${CHEMIN_MAX_SEGMENTS}]; uniform int uCount; uniform float uT; uniform vec2 uPlayer; uniform vec3 uCol;
uniform sampler2D tCobble; uniform vec3 uCobble; uniform float uHasCobble;
varying vec3 vWorld;
float sdSeg(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a; vec2 ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }
float smin(float a, float b, float k){ float h = max(k - abs(a - b), 0.0) / k; return min(a, b) - h * h * k * 0.25; }
void main(){
  vec2 p = vWorld.xz;
  // tracé ondulé (un chemin usé, pas une règle) ; segments unis en douceur : coudes arrondis
  vec2 w = p + vec2(sin(p.y * 0.45 + 1.7), sin(p.x * 0.38 + 0.6)) * 0.35;
  float d = 1e3;
  for (int i = 0; i < ${CHEMIN_MAX_SEGMENTS}; i++) { if (i >= uCount) break; d = smin(d, sdSeg(w, uSeg[i].xy, uSeg[i].zw), 1.8); }
  float core = exp(-d * d * 0.9);
  // lumière qui respire et coule lentement, en deux nappes croisées (aucun sens marqué)
  float flow = 0.62 + 0.38 * sin(p.x * 0.7 + p.y * 0.5 + uT * 0.33) * sin(p.x * 0.41 - p.y * 0.77 - uT * 0.26);
  // sur les pavés : le dessus des pierres prend la lumière, les joints restent sombres (relief du sol du moteur)
  vec2 cuv = vec2((vWorld.x - uCobble.x) / uCobble.z, (uCobble.y - vWorld.z) / uCobble.z);
  float sheen = mix(0.7, smoothstep(0.3, 0.95, texture2D(tCobble, cuv).a), uHasCobble);
  // révélé autour du personnage, à peine visible au loin
  float near = mix(0.3, 1.0, 1.0 - smoothstep(5.0, 15.0, distance(p, uPlayer)));
  float a = core * (0.03 + 0.11 * sheen * flow) * near;
  gl_FragColor = vec4(uCol, a);
}`;

/**
 * Plan des chemins : couvre `bounds` (marge de 3 m) ; `cobble` : texture et pose du sol du moteur (x de début, z de fin,
 * taille d'une répétition en m), pour que la lumière épouse les mêmes pavés.
 */
export function cheminMesh(segments: readonly CheminSegment[], bounds: Rect, cobble?: { tex: THREE.Texture; x0: number; zMax: number; tile: number }): { mesh: THREE.Mesh; mat: THREE.ShaderMaterial } | null {
  if (!segments.length) return null;
  if (segments.length > CHEMIN_MAX_SEGMENTS) throw new Error(`chemins : ${segments.length} segments (${CHEMIN_MAX_SEGMENTS} au plus)`);
  const seg = Array.from({ length: CHEMIN_MAX_SEGMENTS }, (_, i) => { const s = segments[i]; return s ? new THREE.Vector4(s.x0, s.z0, s.x1, s.z1) : new THREE.Vector4(); });
  const mat = new THREE.ShaderMaterial({
    name: 'VilleChemin',
    uniforms: {
      uSeg: { value: seg }, uCount: { value: segments.length }, uT: { value: 0 }, uPlayer: { value: new THREE.Vector2(0, 0) }, uCol: { value: new THREE.Color(1.0, 0.76, 0.44) },
      tCobble: { value: cobble?.tex ?? null }, uCobble: { value: new THREE.Vector3(cobble?.x0 ?? 0, cobble?.zMax ?? 0, cobble?.tile ?? 3) }, uHasCobble: { value: cobble ? 1 : 0 },
    },
    vertexShader: /* glsl */ `varying vec3 vWorld; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const W = bounds.x1 - bounds.x0 + 6; const D = bounds.z1 - bounds.z0 + 6;
  const g = new THREE.PlaneGeometry(W, D);
  g.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(g, mat);
  mesh.name = 'chemins';
  mesh.position.set((bounds.x0 + bounds.x1) / 2, 0.025, (bounds.z0 + bounds.z1) / 2);
  mesh.renderOrder = 2;
  mesh.layers.set(LAYER_NOREFLECT);
  return { mesh, mat };
}
