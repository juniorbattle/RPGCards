/**
 * M09 V4 — diorama de plans peints (ADR 028, B2) : l'îlot vu de face fait de plans générés posés en profondeur devant la
 * caméra (`decors.ts` : contrat, contrôle, préparation), le moteur gardant le sol où l'on marche (pavés mouillés, reflet
 * plan, reflets des lanternes), les lumières (posées sur les lanternes peintes : personnages éclairés, halos), la brume
 * (dans la matière des plans), la profondeur de champ et le halo (post-traitement de `ville.ts`). Le plan pur de l'îlot
 * (collisions, zones, portes, PNJ) est celui du décor par code : seules les images changent.
 *
 * Plans en panneaux texturés, prémultipliés, triés d'arrière en avant (profondeur, puis `order` à profondeur égale) :
 * `decoupe` écrit la profondeur (flou de profondeur juste, personnages devant ou derrière), `fondu` non (ciel, lueurs).
 */
import * as THREE from 'three';
import { hashString, makeRng } from '../game/engine/rng';
import { FAM } from './grammaire';
import type { IlotDef } from './ilots';
import { COMMON_GLSL, LAMP_WARM, U, surface } from './materiaux';
import { cobbleRelief, puddleMask } from './quaiMateriaux';
import { LAYER_NOREFLECT } from './reflets';
import { finish, type LightDef, type QuaiScene } from './scene';
import { plateRect, type DecorLight, type PreparedDiorama, type PreparedPlate } from './decors';

const PLATE_VERT = /* glsl */ `
varying vec2 vUv; varying vec3 vWorld; varying vec3 vN;
void main(){
  vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; vN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

/**
 * Plan peint : la couleur de l'image (sa lumière peinte), plus, selon `uLit`, la lumière des lanternes du moteur
 * (elle vacille avec elles) ; brume du moteur selon `uFog` ; sortie prémultipliée.
 */
const PLATE_FRAG = /* glsl */ `
${COMMON_GLSL}
uniform sampler2D tPlate; uniform float uLit; uniform float uFog; uniform float uCut;
varying vec2 vUv; varying vec3 vWorld; varying vec3 vN;
void main(){
  vec4 A = texture2D(tPlate, vUv);
  if (A.a < uCut) discard;
  vec3 c = A.rgb / max(A.a, 1e-4);
  if (uLit > 0.0) {
    vec3 N = normalize(vN); if (!gl_FrontFacing) N = -N;
    vec3 diff, spec; lightSum(vWorld, N, normalize(cameraPosition - vWorld), 0.6, 12.0, diff, spec);
    c += c * diff * uLit;
  }
  c = mix(c, applyFog(c, vWorld), uFog);
  gl_FragColor = vec4(c * A.a, A.a);
}`;

/** Matière d'un plan (une par plan : chacun a sa texture). */
function plateMaterial(p: PreparedPlate): THREE.ShaderMaterial {
  const cut = p.entry.blend === 'decoupe';
  return new THREE.ShaderMaterial({
    name: 'VillePlan',
    uniforms: { ...U, tPlate: { value: p.texture }, uLit: { value: p.entry.lit ?? 0 }, uFog: { value: p.entry.fog ?? 1 }, uCut: { value: cut ? 0.02 : 0.004 } },
    vertexShader: PLATE_VERT,
    fragmentShader: PLATE_FRAG,
    transparent: true,
    premultipliedAlpha: true,
    depthWrite: cut,
    side: THREE.FrontSide,
  });
}

/** Couleur linéaire d'une lumière du diorama : une famille (direction D, `FAM`), l'ambre des lanternes, ou donnée. */
export function lightColor(c: DecorLight['color']): THREE.Color {
  if (Array.isArray(c)) return new THREE.Color(c[0], c[1], c[2]);
  return c === 'ambre' ? LAMP_WARM.clone() : FAM[c].clone();
}

/** Sol du moteur sous le diorama : la bande jouable de l'îlot élargie, pavés mouillés, flaques, reflets (passe 47). */
function engineGround(def: IlotDef, artSeed: number, textures: THREE.Texture[]): THREE.Mesh {
  const b = def.ilot.bounds;
  const x0 = b.x0 - 14;
  const z0 = b.z0 - 0.3;
  const W = b.x1 - b.x0 + 28;
  const D = b.z1 - b.z0 + 0.6;
  const rect: [number, number, number, number] = [x0, z0, W, D];
  // flaques d'eau dormante surtout le long du bord avant (vue rasante : c'est là que se reflètent les plans), tirées de
  // la graine d'art et de l'îlot (déterministes)
  const rng = makeRng(hashString(`ville|diorama|flaques|${def.id}|${artSeed}`));
  const puddles: [number, number, number, number][] = [];
  for (let x = x0 + 1.5; x < x0 + W - 1.5; x += 2.6 + rng() * 1.4) puddles.push([x, b.z1 - 0.7 - rng() * 0.3, 1.0 + rng() * 0.8, 0.55 + rng() * 0.3]);
  for (let i = 0; i < 6; i++) puddles.push([b.x0 + rng() * (b.x1 - b.x0), b.z0 + 1.2 + rng() * (b.z1 - b.z0 - 2.4), 0.7 + rng() * 0.5, 0.35 + rng() * 0.2]);
  const cobble = cobbleRelief(artSeed);
  const mask = puddleMask(artSeed, rect, puddles);
  textures.push(cobble, mask);
  const mat = surface({ map: cobble, tile: [1, 1], wet: 0.9, spec: 0.22, shin: 36, contact: 0, breakup: 0.35, mirror: true, puddles: { map: mask, rect } });
  const g = new THREE.PlaneGeometry(W, D, 32, 4);
  g.rotateX(-Math.PI / 2);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * W / 3.0, uv.getY(i) * D / 3.0);
  const mesh = new THREE.Mesh(g, mat);
  mesh.position.set(x0 + W / 2, 0, z0 + D / 2);
  // le sol lit le reflet : la caméra miroir ne le dessine pas
  mesh.layers.set(LAYER_NOREFLECT);
  return mesh;
}

/** Scène d'un îlot en diorama : sol du moteur, plans peints dans l'ordre, lumières et halos, ciel du moteur au fond. */
export function buildDiorama(def: IlotDef, d: PreparedDiorama, artSeed: number): QuaiScene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x04060c);
  const textures: THREE.Texture[] = [];
  const meshes: THREE.Object3D[] = [];
  if (d.ground) meshes.push(engineGround(def, artSeed, textures));
  // créés dans l'ordre de dessin : à profondeur égale, three.js départage les transparents par ordre de création
  for (const p of d.plates) {
    const r = plateRect(p.entry);
    const g = new THREE.PlaneGeometry(r.w, r.h);
    const mesh = new THREE.Mesh(g, plateMaterial(p));
    mesh.name = `plan:${d.ilot}/${p.id}`;
    mesh.position.set(...r.center);
    if (r.orient === 'sol') {
      mesh.rotation.x = -Math.PI / 2;
      mesh.layers.set(LAYER_NOREFLECT);
    }
    meshes.push(mesh);
  }
  const lights: LightDef[] = d.lights.map((l) => ({
    x: l.at[0], y: l.at[1], z: l.at[2], intensity: l.intensity, radius: l.radius, halo: l.halo ?? 0, flicker: l.flicker ?? 'lantern', color: lightColor(l.color),
  }));
  const base = finish(scene, { build: (into) => { for (const m of meshes) into.add(m); return meshes.length; } }, lights, [], textures);
  return base;
}
