/**
 * M09 V4 — ombres d'un diorama en rangs (passe 68 ; le responsable : « je remarque des assets mal intégrés qui donnent
 * cette sensation d'image posée sur la scène ; éventuellement il faudrait mettre des ombres pour optimiser cette
 * immersion ») : tirées des plans eux-mêmes, au sol, sous les personnages : ombre de contact sous chaque objet debout
 * (étal, puits, fontaine, charrette, lampadaire…), ombre portée au pied de chaque façade, ombre au pied des murs des
 * passages (le passage est dans l'ombre). Chacune suit l'opacité de son plan (fantôme, fondu). Dessinées par le moteur.
 *
 * Passe 114 (retours R1 du responsable, fiche du lot M10-E : « il faudra ajouter des ombres aux props décoratifs comme les
 * stands… pas de sensation d'image collée sur la scène mais bien des props intégrés ») : l'ombre de contact suit la
 * SILHOUETTE de l'image là où elle touche le sol (pieds d'un étal, roues d'une charrette, base d'un puits ; chaque objet
 * d'une bande d'accessoires), sombre contre le pied et fondue vers l'avant ; et chaque objet porte au sol une ombre douce
 * à l'opposé de la lanterne du moteur la plus proche (sauf la sienne), quand elle tombe vers la caméra.
 */
import * as THREE from 'three';
import type { DecorLight, PlateRect } from './decors';
import { LAYER_NOREFLECT } from './reflets';

export type OmbreKind = 'contact' | 'pied' | 'mur' | 'silhouette' | 'portee';
export interface Ombre {
  kind: OmbreKind; x: number; z: number; w: number; d: number; alpha: number; flip?: boolean;
  /** silhouette : contact au sol de chaque colonne de l'image (0 à 1, de gauche à droite) ; part de `w` de chaque bord
   *  hors de l'objet (`bord`, m) ; part de `d` devant le pied (`avant`, m). */
  profil?: readonly number[]; bord?: number; avant?: number;
  /** portée : rotation autour de la verticale (radians ; 0 = vers le fond), le pied au bout `v = 0`. */
  angle?: number;
}

/**
 * Ombre de contact d'une silhouette : débord de chaque côté (m), recul derrière le pied et avancée devant lui (m). La caméra
 * est rasante (6 à 18°) : le sol devant un objet est très raccourci à l'écran, l'ombre s'avance donc d'un à deux mètres.
 */
export const SILHOUETTE = { bord: 0.5, recul: 0.3, avant: (h: number) => 1.0 + 0.3 * Math.min(h, 3), alpha: 0.82 } as const;

/**
 * Contact au sol de chaque colonne d'un plan (pur) : `rgba`, les `lignes` du bas de l'image (n'importe quel ordre),
 * `largeur` colonnes ; `n` colonnes en sortie, part des colonnes du morceau qui touchent le sol (alpha ≥ 128 dans l'une
 * des lignes), lissée sur trois colonnes.
 */
export function profilPied(rgba: ArrayLike<number>, largeur: number, lignes: number, n: number): number[] {
  const touche = new Uint8Array(largeur);
  for (let y = 0; y < lignes; y++) for (let x = 0; x < largeur; x++) if (rgba[(y * largeur + x) * 4 + 3]! >= 128) touche[x] = 1;
  const brut = new Array<number>(n).fill(0);
  const compte = new Array<number>(n).fill(0);
  for (let x = 0; x < largeur; x++) { const i = Math.min(n - 1, Math.floor((x / largeur) * n)); brut[i]! += touche[x]!; compte[i]! += 1; }
  const p = brut.map((v, i) => (compte[i] ? v / compte[i]! : 0));
  return p.map((v, i) => Math.round(((p[i - 1] ?? v) * 0.25 + v * 0.5 + (p[i + 1] ?? v) * 0.25) * 1000) / 1000);
}

/**
 * Ombres d'un plan posé au sol (pur) : un bâtiment (6 m de haut au moins) a son ombre au pied, sur 1,6 m devant lui ; un
 * mur de côté la sienne, sur 1,3 m du côté peint ; un objet ou une bande d'accessoires (moins de 6 m) l'ombre de contact
 * de sa silhouette (`profil`, passe 116), à défaut, pour un objet de 6,5 m de large au plus, une ellipse de contact ; un
 * objet de 6,5 m au plus, en plus, son ombre portée par la lanterne la plus proche (`lumieres`, `ombrePortee`). Les plans
 * hors du sol n'en ont pas.
 */
export function ombresDuPlan(r: PlateRect, at: readonly [number, number, number], vers?: 'est' | 'ouest', opts: { profil?: readonly number[]; lumieres?: readonly DecorLight[] } = {}): Ombre[] {
  if (Math.abs(at[1]) > 0.25) return [];
  if (r.orient === 'cote') {
    const d = 1.3;
    return [{ kind: 'mur', x: vers === 'ouest' ? at[0] - d / 2 : at[0] + d / 2, z: at[2], w: d, d: r.w, alpha: 0.5, flip: vers === 'ouest' }];
  }
  if (r.orient !== 'face') return [];
  if (r.h >= 6) return [{ kind: 'pied', x: r.center[0], z: at[2] + 0.8, w: r.w, d: 1.6, alpha: 0.42 }];
  const out: Ombre[] = [];
  const profil = opts.profil;
  if (profil?.length && profil.some((v) => v > 0)) {
    const avant = SILHOUETTE.avant(r.h);
    const d = avant + SILHOUETTE.recul;
    out.push({ kind: 'silhouette', x: r.center[0], z: at[2] + avant - d / 2, w: r.w + 2 * SILHOUETTE.bord, d, alpha: SILHOUETTE.alpha, profil, bord: SILHOUETTE.bord, avant });
  } else if (r.w <= 6.5) out.push({ kind: 'contact', x: r.center[0], z: at[2] - 0.12, w: r.w * 0.92, d: 0.9 + 0.16 * r.w, alpha: 0.58 });
  if (r.w <= 6.5 && opts.lumieres?.length) {
    const p = ombrePortee(r, at, opts.lumieres, profil);
    if (p) out.push(p);
  }
  return out;
}

/**
 * Ombre portée d'un objet debout par la lanterne la plus forte qui l'éclaire (pur) : lanterne à moins de 1,2 fois son rayon
 * du pied, hors de l'objet lui-même (une lanterne peinte sur l'étal ne le fait pas ombrer) ; rien si l'ombre tombe vers le
 * fond (cachée par l'objet). Longueur selon la hauteur de la lanterne et celle de l'objet (0,6 à 2,6 m), largeur celle
 * de la silhouette au sol, opacité qui baisse avec la distance à la lanterne.
 */
export function ombrePortee(r: PlateRect, at: readonly [number, number, number], lumieres: readonly DecorLight[], profil?: readonly number[]): Ombre | null {
  const px = r.center[0]; const pz = at[2];
  let best: { l: DecorLight; dist: number; s: number } | null = null;
  for (const l of lumieres) {
    const [lx, ly, lz] = l.at;
    if (Math.abs(lx - px) < r.w / 2 + 0.3 && Math.abs(lz - pz) < 1.2) continue;
    if (ly <= 0.8) continue;
    const dist = Math.hypot(lx - px, lz - pz);
    if (dist < 0.3 || dist > l.radius * 1.2) continue;
    const s = l.intensity / (1 + dist * dist);
    if (!best || s > best.s) best = { l, dist, s };
  }
  if (!best) return null;
  const dx = (px - best.l.at[0]) / best.dist; const dz = (pz - best.l.at[2]) / best.dist;
  if (dz < -0.35) return null;
  const hEff = Math.min(r.h, 2.4) * 0.7;
  const len = THREE.MathUtils.clamp((hEff * best.dist) / Math.max(best.l.at[1] - hEff, 0.4), 0.6, 2.6);
  // largeur : celle de ce qui touche le sol (silhouette), vue de la lanterne (de travers, elle s'amincit)
  let ext = 1;
  if (profil?.length) {
    const on = profil.map((v, i) => (v > 0.2 ? i : -1)).filter((i) => i >= 0);
    ext = on.length ? (on[on.length - 1]! - on[0]! + 1) / profil.length : 0;
  }
  const w = Math.max(0.25, r.w * ext * 0.85 * (0.45 + 0.55 * Math.abs(dz)));
  const alpha = THREE.MathUtils.clamp(0.48 * (1 - best.dist / (best.l.radius * 1.2)), 0.14, 0.48);
  return { kind: 'portee', x: px + dx * (len / 2 - 0.1), z: pz + dz * (len / 2 - 0.1), w, d: len, alpha, angle: Math.atan2(-dx, -dz) };
}

const FRAG = /* glsl */ `
uniform float uAlpha; uniform float uKind; uniform float uFlip;
uniform sampler2D tProfil; uniform vec4 uSil;
varying vec2 vUv;
float profil(float u){ return (u < 0.0 || u > 1.0) ? 0.0 : texture2D(tProfil, vec2(u, 0.5)).r; }
void main(){
  float a;
  if (uKind < 0.5) {
    // contact : ellipse douce, plus sombre au cœur
    float d = length((vUv - 0.5) * 2.0);
    a = 1.0 - smoothstep(0.25, 1.0, d);
  } else if (uKind < 1.5) {
    // pied d'une façade : sombre contre le mur (uv.y = 1, vers le fond), fondu vers la rue ; bords fondus
    a = pow(vUv.y, 1.7) * smoothstep(0.0, 0.03, vUv.x) * (1.0 - smoothstep(0.97, 1.0, vUv.x));
  } else if (uKind < 2.5) {
    // pied d'un mur de côté : sombre contre le mur, fondu vers le milieu du passage
    float u = uFlip > 0.5 ? vUv.x : 1.0 - vUv.x;
    a = pow(u, 1.4) * smoothstep(0.0, 0.08, vUv.y) * (1.0 - smoothstep(0.92, 1.0, vUv.y));
  } else if (uKind < 3.5) {
    // silhouette (passe 116) : uSil = (largeur totale, débord, profondeur, avancée devant le pied), en m ;
    // uv.y = 1 vers le fond : distance devant le pied dz ; le contact de chaque colonne, flouté de plus en plus vers l'avant
    float dz = uSil.w - vUv.y * uSil.z;
    float u = (vUv.x * uSil.x - uSil.y) / (uSil.x - 2.0 * uSil.y);
    // flou latéral (m) : l'ombre déborde un peu sur les côtés dès le pied, puis s'étale vers l'avant
    float s = (0.18 + 0.32 * clamp(dz, 0.0, 2.0)) / max(uSil.x - 2.0 * uSil.y, 0.1);
    float p = 0.0;
    for (int i = -4; i <= 4; i++) p += profil(u + float(i) * s / 4.0);
    p = clamp(p / 9.0 * 1.6, 0.0, 1.0);
    float f = dz >= 0.0 ? 0.45 * exp(-dz * 6.0) + 0.55 * exp(-dz * 1.4) : exp(dz * 10.0);
    a = p * f;
  } else {
    // portée (passe 116) : du pied (v = 0) au bout (v = 1) ; s'amincit et s'efface vers le bout, bords doux
    float v = vUv.y;
    float hw = mix(0.5, 0.36, v);
    float e = 1.0 - smoothstep(hw * 0.55, hw, abs(vUv.x - 0.5));
    a = e * pow(1.0 - v, 1.4) * smoothstep(0.0, 0.08, v);
  }
  gl_FragColor = vec4(0.0, 0.0, 0.0, a * uAlpha);
}`;

const KIND: Record<OmbreKind, number> = { contact: 0, pied: 1, mur: 2, silhouette: 3, portee: 4 };

/** Texture d'un profil de silhouette (une ligne, rouge = contact). */
function profilTexture(p: readonly number[]): THREE.DataTexture {
  const data = new Uint8Array(p.length * 4);
  p.forEach((v, i) => { data[i * 4] = Math.round(THREE.MathUtils.clamp(v, 0, 1) * 255); data[i * 4 + 3] = 255; });
  const t = new THREE.DataTexture(data, p.length, 1, THREE.RGBAFormat);
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearFilter;
  t.wrapS = THREE.ClampToEdgeWrapping; t.wrapT = THREE.ClampToEdgeWrapping;
  t.needsUpdate = true;
  return t;
}

export function ombreMesh(o: Ombre): { mesh: THREE.Mesh; mat: THREE.ShaderMaterial } {
  const tex = o.kind === 'silhouette' && o.profil ? profilTexture(o.profil) : null;
  const mat = new THREE.ShaderMaterial({
    name: 'VilleOmbre',
    uniforms: {
      uAlpha: { value: o.alpha }, uKind: { value: KIND[o.kind] }, uFlip: { value: o.flip ? 1 : 0 },
      tProfil: { value: tex }, uSil: { value: new THREE.Vector4(o.w, o.bord ?? 0, o.d, o.avant ?? 0) },
    },
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
  if (o.angle !== undefined) mesh.rotation.y = o.angle;
  mesh.renderOrder = 1;
  mesh.layers.set(LAYER_NOREFLECT);
  return { mesh, mat };
}
