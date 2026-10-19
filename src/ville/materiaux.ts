/**
 * M09 V1 — matériaux « nuit » de la ville, adaptés de Cité du Tournoi (RPG-ArtByCode, commit 0398c4f, lecture seule) :
 *   - un SEUL jeu d'uniformes partagé par référence (`U`, d'après `src/atmosphere/SceneUniforms.ts` L. 26-79) : brume,
 *     ciel, lune, ambiante hémisphérique, liste de lumières ponctuelles ;
 *   - brume exponentielle en hauteur en forme close, résolue vers la couleur du ciel dans la même direction
 *     (`src/materials/ShaderChunks.ts` L. 143-181) ; atténuation des lanternes `x²/(1+0,22 d²)` coupée au rayon (L. 75) ;
 *   - un shader de surface paramétré par uniformes pour toutes les matières (L. 184-355, simplifié : pas de normal map,
 *     pas d'ombre de lune) ;
 *   - palette en valeurs LINÉAIRES (jamais d'hex pour les lumières : Three convertirait l'hex sRGB).
 * Textures peintes par code sur canvas, graine d'art, aucune image externe (pavés : grammaire de `paintCobble`,
 * `src/materials/TexturePainters.ts` L. 367-450, en canvas 2D et en plus petit).
 */
import * as THREE from 'three';
import { hashString, makeRng } from '../game/engine/rng';

export const MAX_LIGHTS = 16;

/** Uniformes partagés par tous les matériaux de la ville (mêmes objets `{ value }`). */
export const U = {
  uFogColor: { value: new THREE.Color(0.034, 0.055, 0.098) },
  uSkyZenith: { value: new THREE.Color(0.007, 0.012, 0.034) },
  uCityGlow: { value: new THREE.Color(0.034, 0.028, 0.026) },
  uSkyAmb: { value: new THREE.Color(0.07, 0.1, 0.16) },
  uGroundAmb: { value: new THREE.Color(0.03, 0.036, 0.055) },
  uMoonCol: { value: new THREE.Color(0.27, 0.37, 0.58) },
  uMoonDir: { value: new THREE.Vector3(0.62, 0.32, -0.72).normalize() },
  uFogDensity: { value: 0.013 },
  uFogFalloff: { value: 0.06 },
  uFogStart: { value: 16 },
  uMist: { value: 0.35 },
  uLightPos: { value: Array.from({ length: MAX_LIGHTS }, () => new THREE.Vector4(0, -100, 0, 0.001)) },
  uLightCol: { value: Array.from({ length: MAX_LIGHTS }, () => new THREE.Vector3()) },
  uLightCount: { value: 0 },
  uTime: { value: 0 },
  // M09 V3 (passe 47) : reflet plan de la rue (`reflets.ts`), lu par les flaques (`MIRROR`) et l'eau du port (`refl`).
  uReflMap: { value: null as THREE.Texture | null },
  uReflVP: { value: new THREE.Matrix4() },
  uReflReady: { value: 0 },
  /** Plan de façade servant de relais au reflet de l'eau : z du plan, hauteur au-delà de laquelle on vise la ville lointaine. */
  uReflProxy: { value: new THREE.Vector2(-3, 11) },
  /** Direction D (passe 47) : clair de lune « peint » sur les étages et les toits (direction, force ; 0 = rien) et
   *  hauteurs où il apparaît (le rez-de-chaussée reste aux lanternes). Lu par les matières `illu`. */
  uFill: { value: new THREE.Vector4(0, 1, 0, 0) },
  uFillY: { value: new THREE.Vector2(3, 7) },
};

/** Ambre des lanternes (linéaire), seul accent chaud. */
export const LAMP_WARM = new THREE.Color(1.0, 0.6, 0.27);

export const COMMON_GLSL = /* glsl */ `
uniform vec3 uFogColor; uniform vec3 uSkyZenith; uniform vec3 uCityGlow; uniform vec3 uSkyAmb; uniform vec3 uGroundAmb;
uniform vec3 uMoonCol; uniform vec3 uMoonDir; uniform float uFogDensity; uniform float uFogFalloff; uniform float uFogStart;
uniform float uMist; uniform vec4 uLightPos[${MAX_LIGHTS}]; uniform vec3 uLightCol[${MAX_LIGHTS}]; uniform int uLightCount;
uniform float uTime;
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vn2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), f.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), f.x), f.y); }
vec3 skyHaze(vec3 rd){
  float low = 1.0 - smoothstep(-0.04, 0.3, rd.y);
  vec3 c = uFogColor * (0.84 + 0.16 * low);
  c += uCityGlow * low * low * 0.6;
  float mu = max(dot(rd, uMoonDir), 0.0);
  c += uMoonCol * (0.016 * pow(mu, 6.0) + 0.04 * pow(mu, 56.0));
  return c;
}
vec3 skyColor(vec3 rd){ return mix(skyHaze(rd), uSkyZenith, smoothstep(-0.01, 0.27, rd.y)); }
float fogDepth(float y0, float y1, float len, float b){
  float a0 = -b * max(y0, -2.0), a1 = -b * max(y1, -2.0); float da = a1 - a0;
  float avg = abs(da) > 1e-4 ? (exp(a1) - exp(a0)) / da : exp(a0);
  return len * avg;
}
vec3 applyFog(vec3 c, vec3 P){
  vec3 dv = P - cameraPosition; float L = length(dv); vec3 rd = dv / max(L, 1e-4);
  float s = min(uFogStart, L); float y0 = max(cameraPosition.y, 0.0) + rd.y * s;
  float od = uFogDensity * (fogDepth(y0, P.y, L - s, uFogFalloff) + uMist * fogDepth(y0, P.y, L - s, 0.32));
  return mix(c, skyColor(rd), clamp(1.0 - exp(-od), 0.0, 0.985));
}
void lightSum(vec3 P, vec3 N, vec3 V, float wrap, float shin, out vec3 diff, out vec3 spec){
  diff = vec3(0.0); spec = vec3(0.0);
  for (int i = 0; i < ${MAX_LIGHTS}; i++) {
    if (i >= uLightCount) break;
    vec3 Lv = uLightPos[i].xyz - P; float d2 = dot(Lv, Lv); float r = uLightPos[i].w;
    float x = max(1.0 - d2 / (r * r), 0.0); float att = x * x / (1.0 + 0.22 * d2);
    if (att <= 0.0) continue;
    vec3 l = Lv * inversesqrt(max(d2, 1e-4));
    float nl = max((dot(N, l) + wrap) / (1.0 + wrap), 0.0);
    diff += uLightCol[i] * att * nl;
    vec3 h = normalize(l + V);
    spec += uLightCol[i] * att * pow(max(dot(N, h), 0.0), shin) * step(0.0, dot(N, l));
  }
}
`;

const SURFACE_VERT = /* glsl */ `
varying vec3 vWorld; varying vec3 vN; varying vec2 vUv;
uniform vec2 uTile;
#ifdef VAO
attribute float ao; varying float vAO;
#endif
void main(){
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vUv = uv * uTile;
#ifdef VAO
  vAO = ao;
#endif
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const SURFACE_FRAG = /* glsl */ `
${COMMON_GLSL}
uniform sampler2D tAlbedo; uniform vec3 uTint; uniform float uWrap; uniform float uSpec; uniform float uShin;
uniform float uContact; uniform float uEmissive; uniform float uBreakup; uniform float uWet;
varying vec3 vWorld; varying vec3 vN; varying vec2 vUv;
#ifdef ILLU
uniform vec4 uFill; uniform vec2 uFillY;
#endif
#ifdef VAO
varying float vAO;
#endif
#ifdef MIRROR
uniform sampler2D uReflMap; uniform mat4 uReflVP; uniform float uReflReady;
#endif
#ifdef PUDDLES
uniform sampler2D tPuddle; uniform vec4 uPuddleRect;
#endif
#ifdef MIRROR
// M09 V3 : reflets des lanternes sur le pavé mouillé, sans cible de rendu (« lightMirror » de Cité du Tournoi,
// ShaderChunks.ts L. 110-127) : pour chaque lumière, distance de la source au rayon réfléchi, halo exp(-d²/s²) dont la
// largeur croît avec la rugosité et la distance parcourue : traînées étirées vers le spectateur.
vec3 lightMirror(vec3 P, vec3 R, float rough){
  vec3 acc = vec3(0.0);
  for (int i = 0; i < ${MAX_LIGHTS}; i++) {
    if (i >= uLightCount) break;
    vec3 L = uLightPos[i].xyz - P; float t = max(dot(L, R), 0.0);
    vec3 d = L - R * t; float s = 0.12 + 0.9 * rough + (0.018 + 0.18 * rough) * t;
    acc += uLightCol[i] * exp(-dot(d, d) / (s * s)) / (1.0 + 0.08 * t * t);
  }
  return acc;
}
#endif
void main(){
  vec4 A = texture2D(tAlbedo, vUv);
  vec3 albedo = A.rgb * uTint;
  albedo *= 1.0 + (vn2(vWorld.xz * 0.42 + vWorld.y * 0.3) - 0.5) * uBreakup;
  vec3 N = normalize(vN); if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(cameraPosition - vWorld);
  float gc = 1.0 - smoothstep(0.0, 1.15, vWorld.y);
  float ao = mix(1.0, 0.6 + 0.4 * smoothstep(0.0, 0.9, vWorld.y), uContact);
#ifdef VAO
  ao *= vAO;
#endif
  albedo = mix(albedo, albedo * 0.55, gc * uContact * 0.6);
  // Sol mouillé : flaques en bruit basse fréquence, plus sombres et plus brillantes (reflets des lanternes).
  float puddle = uWet * smoothstep(0.55, 0.72, vn2(vWorld.xz * 0.23 + 3.7) * 0.75 + (1.0 - A.a) * 0.4);
  float damp = puddle;
#ifdef PUDDLES
  // M09 V3 (passe 47) : flaques d'eau dormante peintes par code (masque de l'îlot) ; l'eau gagne d'abord les joints,
  // puis noie les pavés (Cité du Tournoi, GroundShaders.ts L. 83-90) ; le bruit ne fait plus que le pavé humide.
  {
    vec2 pu = (vWorld.xz - uPuddleRect.xy) / uPuddleRect.zw;
    float fill = texture2D(tPuddle, pu).r * 1.2 + (1.0 - A.a) * 0.3 - 0.16;
    puddle = smoothstep(0.42, 0.52, fill) * step(0.0, pu.x) * step(pu.x, 1.0) * step(0.0, pu.y) * step(pu.y, 1.0);
    damp = max(damp * 0.6, puddle);
    albedo *= mix(1.0, 0.72, damp);
  }
#endif
  albedo *= mix(1.0, 0.55, puddle);
  vec3 hemi = mix(uGroundAmb, uSkyAmb, N.y * 0.5 + 0.5);
  float mw = clamp((dot(N, uMoonDir) + 0.14) / 1.14, 0.0, 1.0);
  vec3 diff, spec; lightSum(vWorld, N, V, uWrap, mix(uShin, 220.0, puddle), diff, spec);
#ifdef ILLU
  // Direction D (ADR 026) : la lumière des lanternes en aplats à bords doux, comme une illustration (paliers 0,05 /
  // 0,2 / 0,55 / 1,35 ; sous 0,03, la pénombre reste continue).
  {
    float l = dot(diff, vec3(0.3, 0.5, 0.2));
    float s0 = smoothstep(0.03, 0.045, l);
    float q = mix(l, 0.05 + 0.15 * smoothstep(0.12, 0.16, l) + 0.35 * smoothstep(0.38, 0.48, l) + 0.8 * smoothstep(0.95, 1.2, l), s0);
    diff *= mix(1.0, q / max(l, 1e-4), 0.85);
  }
#endif
  vec3 col = albedo * (hemi * ao + uMoonCol * mw * 0.85 + diff * mix(1.0, ao, 0.65));
  col += spec * (uSpec + puddle * 1.6) * ao;
#ifdef ILLU
  // clair de lune peint : les étages et les toits tournés vers la rue lisent leur matière en bleu froid, au-dessus
  // des lanternes (contraste chaud en bas, froid en haut, comme la référence approuvée)
  col += albedo * uMoonCol * uFill.w * max(dot(N, uFill.xyz), 0.0) * smoothstep(uFillY.x, uFillY.y, vWorld.y) * ao;
#endif
#ifdef ILLU
  // Hachures de gravure dans les demi-teintes et les ombres, tracées dans le monde (elles ne glissent pas quand la caméra
  // suit le joueur) : un réseau diagonal, croisé dans les ombres profondes ; effacées quand elles deviennent trop serrées.
  {
    vec3 an = abs(N);
    vec2 hp = an.y > 0.6 ? vWorld.xz : (an.x > an.z ? vWorld.zy : vWorld.xy);
    float k1 = (hp.x + hp.y) / 0.14;
    float k2 = (hp.x - hp.y) / 0.14;
    float a1 = fwidth(k1);
    float a2 = fwidth(k2);
    float l1 = (1.0 - smoothstep(0.1 - a1, 0.1 + a1, abs(fract(k1) - 0.5))) * (1.0 - smoothstep(0.25, 0.5, a1));
    float l2 = (1.0 - smoothstep(0.1 - a2, 0.1 + a2, abs(fract(k2) - 0.5))) * (1.0 - smoothstep(0.25, 0.5, a2));
    float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
    float h = (1.0 - smoothstep(0.015, 0.07, lum)) * l1 * 0.85 + (1.0 - smoothstep(0.004, 0.014, lum)) * l2 * 0.5;
    col *= 1.0 - clamp(h, 0.0, 1.0) * 0.45 * (1.0 - smoothstep(26.0, 44.0, length(cameraPosition - vWorld)));
  }
#endif
#ifdef MIRROR
  {
    float rough = mix(0.55, 0.06, puddle);
    vec2 rp6 = vWorld.xz * 6.0;
    vec3 Nm = normalize(mix(N, vec3(0.0, 1.0, 0.0), puddle * 0.9) + vec3(vn2(rp6 + uTime * 0.4) - 0.5, 0.0, vn2(rp6.yx + 2.0 - uTime * 0.37) - 0.5) * mix(0.06, 0.035, puddle));
    float fr = 0.05 + 0.95 * pow(1.0 - max(dot(Nm, V), 0.0), 4.0);
    col += lightMirror(vWorld, reflect(-V, Nm), rough) * fr * mix(0.35, 1.0, puddle) * uWet * 0.55;
    // reflet plan de la scène (flaques nettes, pavé humide flou ; Cité du Tournoi, GroundShaders.ts L. 126-133)
    if (uReflReady > 0.5) {
      vec4 rq = uReflVP * vec4(vWorld, 1.0);
      vec2 ruv = rq.xy / rq.w * 0.5 + 0.5 + Nm.xz * mix(0.05, 0.012, puddle);
      vec3 rc = texture2D(uReflMap, ruv, mix(3.5, 0.4, puddle)).rgb;
      float rAmt = (puddle * 1.1 + damp * 0.3) * (0.5 + 0.7 * fr) * uWet;
      col = col * (1.0 - puddle * 0.6) + rc * rAmt;
    }
  }
#endif
  col += A.rgb * uTint * uEmissive;
  gl_FragColor = vec4(applyFog(col, vWorld), 1.0);
}`;

export interface SurfaceOpts {
  map: THREE.Texture;
  tile?: [number, number];
  tint?: THREE.ColorRepresentation;
  wrap?: number;
  spec?: number;
  shin?: number;
  contact?: number;
  emissive?: number;
  breakup?: number;
  wet?: number;
  side?: THREE.Side;
  /** M09 V3 : occlusion par sommet (attribut `ao` des géométries fusionnées). */
  vertexAO?: boolean;
  /** M09 V3 : reflets analytiques des lumières sur un sol mouillé (`lightMirror`). */
  mirror?: boolean;
  /** M09 V3, direction D (ADR 026) : lumière en aplats et hachures de gravure. */
  illu?: boolean;
  /** M09 V3 (passe 47) : masque des flaques d'eau dormante (canal rouge) sur le rectangle (x0, z0, largeur, profondeur). */
  puddles?: { map: THREE.Texture; rect: readonly [number, number, number, number] };
}

/** Matériau de surface « nuit » : un programme partagé par toutes les matières (seuls les uniformes changent). */
export function surface(o: SurfaceOpts): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    name: 'VilleSurface',
    uniforms: {
      ...U,
      tAlbedo: { value: o.map },
      uTile: { value: new THREE.Vector2(...(o.tile ?? [1, 1])) },
      uTint: { value: new THREE.Color(o.tint ?? 0xffffff) },
      uWrap: { value: o.wrap ?? 0.3 },
      uSpec: { value: o.spec ?? 0.15 },
      uShin: { value: o.shin ?? 24 },
      uContact: { value: o.contact ?? 1 },
      uEmissive: { value: o.emissive ?? 0 },
      uBreakup: { value: o.breakup ?? 0.35 },
      uWet: { value: o.wet ?? 0 },
      ...(o.puddles ? { tPuddle: { value: o.puddles.map }, uPuddleRect: { value: new THREE.Vector4(...o.puddles.rect) } } : {}),
    },
    vertexShader: SURFACE_VERT,
    fragmentShader: SURFACE_FRAG,
    side: o.side ?? THREE.FrontSide,
    defines: { ...(o.vertexAO ? { VAO: '' } : {}), ...(o.mirror ? { MIRROR: '' } : {}), ...(o.illu ? { ILLU: '' } : {}), ...(o.puddles ? { PUDDLES: '' } : {}) },
  });
}

/** Eau du port : profonde, rides anisotropes, ciel en Fresnel, reflets des lanternes en traînées verticales.
 *  M09 V3 (Quai) : `streak` règle la force des traînées (défaut d'origine 0,12), `spillZ` ajoute la lueur chaude du quai
 *  sur l'eau le long du mur (Cité du Tournoi, `GroundShaders.ts` L. 141-201) ; `refl` (passe 47) remplace le ciel en
 *  Fresnel par le reflet plan de la rue, revisé comme s'il était pris au niveau de l'eau (relais : le plan des façades,
 *  `GroundShaders.ts` L. 176-188) ; sans option, l'eau d'origine. */
export function waterMaterial(o: { streak?: number; spillZ?: number; refl?: number } = {}): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    name: 'VilleEau',
    uniforms: { ...U, uStreak: { value: o.streak ?? 0.12 }, uSpillZ: { value: o.spillZ ?? 1e4 }, uSpill: { value: o.spillZ === undefined ? 0 : 1 }, uReflK: { value: o.refl ?? 0 } },
    defines: o.refl ? { REFL: '' } : {},
    vertexShader: /* glsl */ `varying vec3 vWorld; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `
${COMMON_GLSL}
uniform float uStreak; uniform float uSpillZ; uniform float uSpill;
#ifdef REFL
uniform sampler2D uReflMap; uniform mat4 uReflVP; uniform float uReflReady; uniform vec2 uReflProxy; uniform float uReflK;
#endif
varying vec3 vWorld;
void main(){
  vec3 P = vWorld; float t = uTime;
  vec2 q = vec2(P.x, P.z * 0.38);
  vec2 g = vec2(vn2(q * 1.1 + vec2(t * 0.11, 0.0)) - vn2(q * 1.1 + vec2(0.07 + t * 0.11, 0.0)), vn2(q * 2.3 + vec2(0.0, t * 0.07)) - vn2(q * 2.3 + vec2(0.0, 0.07 + t * 0.07)));
  g *= 1.8 / (1.0 + length(P - cameraPosition) * 0.02);
  vec3 N = normalize(vec3(-g.x, 1.0, -g.y * 0.38));
  vec3 V = normalize(cameraPosition - P); vec3 R = reflect(-V, N);
  float fr = 0.02 + 0.98 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
  vec3 col = vec3(0.003, 0.007, 0.015) + skyColor(normalize(vec3(R.x, abs(R.y), R.z))) * fr * 0.9;
#ifdef REFL
  if (uReflReady > 0.5) {
    // caméra symétrique par rapport à l'eau ; profondeur du contenu reflété prise sur un relais : le plan des façades
    // tant que le rayon le rencontre sous les toits, sinon la ville lointaine
    vec3 Cw = vec3(cameraPosition.x, 2.0 * P.y - cameraPosition.y, cameraPosition.z);
    vec3 dw = normalize(P - Cw);
    float sw = 140.0;
    if (dw.z < -0.02) { float sf = (uReflProxy.x - Cw.z) / dw.z; if (sf > 0.0 && Cw.y + dw.y * sf < uReflProxy.y) sw = sf; }
    vec4 rq = uReflVP * vec4(Cw + dw * sw, 1.0);
    vec2 ruv = rq.xy / rq.w * 0.5 + 0.5;
    vec2 fw = normalize(-V.xz + 1e-5), rt = vec2(fw.y, -fw.x);
    // les rides étirent l'image vers le spectateur et la font onduler de côté : lumières et façades se brisent en
    // traînées verticales (retour du responsable : l'eau ne doit pas avoir l'air d'une vitre)
    float wob = sin(P.z * 7.0 + vn2(vec2(P.x * 0.8, P.z * 3.0) + t * 0.3) * 6.0 + t * 1.3);
    ruv += vec2(dot(N.xz, rt) * 0.03 + g.x * 0.01 + wob * 0.007, dot(N.xz, fw) * 0.22);
    vec3 refl = texture2D(uReflMap, clamp(ruv, 0.001, 0.999), 1.6).rgb;
    // le mur du quai cache ce qui est derrière lui : au pied du mur, l'eau reflète la pierre sombre
    vec3 dv0 = normalize(P - cameraPosition);
    float yHit = P.y - dv0.y * max((uSpillZ - P.z) / min(dv0.z, -1e-3), 0.0);
    float wall = (1.0 - smoothstep(-0.15, 0.3, yHit)) * step(uSpillZ, P.z);
    refl = mix(refl, vec3(0.01, 0.013, 0.024), wall * 0.75);
    // crêtes et creux des rides : l'image tient sur les crêtes, l'eau profonde se montre dans les creux
    float crest = smoothstep(0.3, 0.75, vn2(vec2(P.x * 0.9 + t * 0.15, P.z * 6.5 - t * 0.4)));
    col = vec3(0.003, 0.007, 0.015) + refl * (0.3 + 0.7 * fr) * uReflK * mix(0.25, 1.2, crest);
    // lisérés froids du ciel sur les crêtes : la surface se lit comme de l'eau qui bouge
    float lip = smoothstep(0.62, 0.8, vn2(vec2(P.x * 1.6 - t * 0.2, P.z * 11.0 + t * 0.5)));
    col += vec3(0.045, 0.065, 0.11) * lip * (0.5 + fr);
  }
#endif
  // Reflets des lumières : image miroir de chaque source, étirée verticalement à l'écran par les rides.
  vec3 vd = normalize(P - cameraPosition);
  vec3 right = normalize(vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]));
  vec3 up = normalize(vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]));
  for (int i = 0; i < ${MAX_LIGHTS}; i++) {
    if (i >= uLightCount) break;
    vec3 Lm = vec3(uLightPos[i].x, 2.0 * P.y - uLightPos[i].y, uLightPos[i].z);
    vec3 ld = normalize(Lm - cameraPosition) + N * 0.0;
    vec3 dv = vd - ld;
    float ax = dot(dv, right) + g.x * 0.012; float ay = dot(dv, up);
    float s = exp(-ax * ax / 0.00012) * exp(-ay * ay / 0.006);
    float br = 0.55 + 0.45 * vn2(vec2(P.x * 3.0, P.z * 9.0 - t * 0.6));
    col += uLightCol[i] * s * br * uStreak;
  }
  col += vec3(0.5, 0.3, 0.14) * exp(-max(P.z - uSpillZ, 0.0) / 1.8) * 0.02 * uSpill * (0.7 + 0.3 * vn2(vec2(P.x * 0.7, t * 0.3)));
  float mu = max(dot(R, uMoonDir), 0.0);
  col += uMoonCol * pow(mu, 300.0) * 1.4;
  gl_FragColor = vec4(applyFog(col, P), 1.0);
}`,
  });
}

/** Ciel : dôme au plan lointain, lune, étoiles, voile de nuages (d'après `src/atmosphere/Sky.ts` L. 10-53). */
export function skyDome(): THREE.Mesh {
  const mat = new THREE.ShaderMaterial({
    name: 'VilleCiel',
    uniforms: { ...U },
    vertexShader: /* glsl */ `varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0); gl_Position = vec4(p.xy, p.w * 0.99999, p.w); }`,
    fragmentShader: /* glsl */ `
${COMMON_GLSL}
varying vec3 vDir;
float hash13(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
void main(){
  vec3 rd = normalize(vDir);
  vec3 col = skyColor(rd);
  float mu = max(dot(rd, uMoonDir), 0.0);
  float hz = max(rd.y, 0.0); vec2 sp = rd.xz / (hz + 0.16);
  float n = vn2(sp * 0.8 + vec2(uTime * 0.003, 0.0)) * 0.62 + vn2(sp * 2.1 + 3.7) * 0.38;
  float cl = smoothstep(0.56, 0.8, n) * smoothstep(0.02, 0.14, rd.y) * (1.0 - smoothstep(0.3, 0.62, rd.y));
  col = mix(col, uFogColor * 0.62 + uMoonCol * 0.32 * pow(mu, 10.0), cl * 0.42);
  float disc = smoothstep(0.99984, 0.99991, mu);
  col += vec3(1.2, 1.26, 1.36) * disc * 1.45 * (1.0 - cl * 0.7);
  col += uMoonCol * (pow(mu, 2600.0) * 0.45 + pow(mu, 220.0) * 0.05);
  vec3 sd = rd * 240.0, cell = floor(sd); float h = hash13(cell);
  float star = step(0.994, h) * smoothstep(0.24, 0.0, length(fract(sd) - 0.5));
  star *= smoothstep(0.2, 0.5, rd.y) * (1.0 - pow(mu, 30.0)) * (1.0 - cl);
  col += vec3(0.62, 0.68, 0.85) * star * (0.08 + 0.22 * hash13(cell + 7.0));
  gl_FragColor = vec4(col, 1.0);
}`,
    side: THREE.BackSide,
    depthWrite: false,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), mat);
  m.frustumCulled = false;
  m.renderOrder = 1000;
  return m;
}

// --- Textures peintes par code ------------------------------------------------------------------------------

type Ctx = CanvasRenderingContext2D;
function cnv(w: number, h: number): { c: HTMLCanvasElement; ctx: Ctx } {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return { c, ctx: c.getContext('2d')! };
}
function tex(c: HTMLCanvasElement, repeat = true, srgb = true): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}
const rgb = (c: readonly number[], k = 1) => `rgb(${Math.round(c[0]! * k)},${Math.round(c[1]! * k)},${Math.round(c[2]! * k)})`;

/** Pavés gris-bleu (palette de Cité du Tournoi, deux tons chauds rares) ; alpha = relief (joints bas → flaques). */
export function cobbleTexture(seed: number): THREE.CanvasTexture {
  const S = 512;
  const { c, ctx } = cnv(S, S);
  const rng = makeRng(hashString(`ville|paves|${seed}`));
  // Bande froide plus étroite que Cité du Tournoi (un seul ton chaud, rare) : l'ambre doit rester l'accent des lanternes.
  const pal = [[78, 84, 98], [70, 76, 90], [88, 90, 100], [96, 92, 94], [62, 68, 84], [84, 86, 92], [74, 74, 84], [92, 90, 100]];
  ctx.fillStyle = 'rgba(22,22,28,1)';
  ctx.fillRect(0, 0, S, S);
  const rows = 8;
  const rh = S / rows;
  for (let r = 0; r < rows; r++) {
    let x = -rng() * 40;
    while (x < S) {
      const w = 44 + rng() * 34;
      const tone = pal[Math.floor(rng() * pal.length)]!;
      const k = 0.82 + rng() * 0.22;
      const g = 3 + rng() * 1.5;
      const draw = (ox: number) => {
        const x0 = x + g + ox;
        const y0 = r * rh + g;
        const ww = w - 2 * g;
        const hh = rh - 2 * g;
        const grd = ctx.createRadialGradient(x0 + ww * 0.42, y0 + hh * 0.38, 2, x0 + ww / 2, y0 + hh / 2, Math.max(ww, hh) * 0.7);
        grd.addColorStop(0, rgb(tone, k * 1.12));
        grd.addColorStop(1, rgb(tone, k * 0.72));
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.roundRect(x0, y0, ww, hh, Math.min(ww, hh) * 0.28);
        ctx.fill();
      };
      draw(0);
      if (x + w > S) draw(-S);
      x += w;
    }
  }
  // grain fin
  const img = ctx.getImageData(0, 0, S, S);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rng() - 0.5) * 10;
    const lum = img.data[i]! + img.data[i + 1]! + img.data[i + 2]!;
    img.data[i] = img.data[i]! + n;
    img.data[i + 1] = img.data[i + 1]! + n;
    img.data[i + 2] = img.data[i + 2]! + n;
    img.data[i + 3] = lum < 100 ? 60 : 255; // joints bas : l'eau s'y rassemble d'abord
  }
  ctx.putImageData(img, 0, 0);
  return tex(c);
}

/** Pierre de taille froide (assises, blocs, mortier, coulures). */
export function ashlarTexture(seed: number, base: readonly (readonly number[])[] = [[128, 132, 142], [110, 116, 128], [136, 136, 140], [98, 104, 118], [120, 122, 128]]): THREE.CanvasTexture {
  const S = 512;
  const { c, ctx } = cnv(S, S);
  const rng = makeRng(hashString(`ville|pierre|${seed}`));
  ctx.fillStyle = 'rgb(58,60,66)';
  ctx.fillRect(0, 0, S, S);
  const rows = 6;
  const rh = S / rows;
  for (let r = 0; r < rows; r++) {
    let x = r % 2 ? -rh * 0.8 : 0;
    while (x < S) {
      const w = rh * (1.3 + rng() * 0.9);
      const tone = base[Math.floor(rng() * base.length)]!;
      const k = 0.82 + rng() * 0.26;
      const g = 3;
      const blk = (ox: number) => {
        ctx.fillStyle = rgb(tone, k);
        ctx.fillRect(x + g + ox, r * rh + g, w - 2 * g, rh - 2 * g);
        const sh = ctx.createLinearGradient(0, r * rh, 0, (r + 1) * rh);
        sh.addColorStop(0, 'rgba(255,255,255,0.06)');
        sh.addColorStop(1, 'rgba(0,0,0,0.18)');
        ctx.fillStyle = sh;
        ctx.fillRect(x + g + ox, r * rh + g, w - 2 * g, rh - 2 * g);
      };
      blk(0);
      if (x + w > S) blk(-S);
      x += w;
    }
  }
  // coulures verticales et taches
  for (let i = 0; i < 40; i++) {
    const x = rng() * S;
    const y = rng() * S;
    const g = ctx.createLinearGradient(x, y, x, y + 60 + rng() * 120);
    g.addColorStop(0, 'rgba(20,24,34,0.22)');
    g.addColorStop(1, 'rgba(20,24,34,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, 3 + rng() * 6, 180);
  }
  return tex(c);
}

/** Enduit ivoire désaturé, usé, laissant voir la pierre par endroits ; colombages sombres optionnels. */
export function plasterTexture(seed: number, timber: boolean): THREE.CanvasTexture {
  const S = 512;
  const { c, ctx } = cnv(S, S);
  const rng = makeRng(hashString(`ville|enduit|${seed}|${timber}`));
  ctx.fillStyle = 'rgb(170,168,164)';
  ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 260; i++) {
    const x = rng() * S;
    const y = rng() * S;
    const r = 6 + rng() * 40;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const d = rng() < 0.5;
    g.addColorStop(0, d ? 'rgba(120,122,130,0.22)' : 'rgba(196,194,188,0.18)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  if (timber) {
    ctx.fillStyle = 'rgb(58,52,50)';
    const t = 22;
    ctx.fillRect(0, 0, S, t);
    ctx.fillRect(0, S / 2 - t / 2, S, t);
    for (const x of [0, S / 2 - t / 2, S - t]) ctx.fillRect(x, 0, t, S);
    ctx.lineWidth = t * 0.8;
    ctx.strokeStyle = 'rgb(66,58,54)';
    ctx.beginPath();
    ctx.moveTo(t, S / 2); ctx.lineTo(S / 2 - t, t);
    ctx.moveTo(S / 2 + t, t); ctx.lineTo(S - t, S / 2);
    ctx.stroke();
  }
  return tex(c);
}

/** Ardoise des toits : rangs d'écailles décalés. */
export function slateTexture(seed: number): THREE.CanvasTexture {
  const S = 256;
  const { c, ctx } = cnv(S, S);
  const rng = makeRng(hashString(`ville|ardoise|${seed}`));
  const pal = [[84, 88, 98], [70, 74, 86], [96, 98, 106], [90, 92, 100], [78, 80, 92]];
  ctx.fillStyle = 'rgb(40,42,50)';
  ctx.fillRect(0, 0, S, S);
  const rows = 12;
  const rh = S / rows;
  for (let r = 0; r < rows; r++) {
    for (let i = -1; i < 10; i++) {
      const w = S / 9;
      const x = i * w + (r % 2) * w * 0.5;
      ctx.fillStyle = rgb(pal[Math.floor(rng() * pal.length)]!, 0.85 + rng() * 0.25);
      ctx.beginPath();
      ctx.roundRect(x + 1, r * rh + 1, w - 2, rh * 1.15, [0, 0, 5, 5]);
      ctx.fill();
    }
  }
  return tex(c);
}

/** Planches de bois sombre (étal, caisses, coques, portes). */
export function woodTexture(seed: number): THREE.CanvasTexture {
  const S = 256;
  const { c, ctx } = cnv(S, S);
  const rng = makeRng(hashString(`ville|bois|${seed}`));
  for (let i = 0; i < 8; i++) {
    const k = 0.8 + rng() * 0.35;
    ctx.fillStyle = rgb([84, 72, 62], k);
    ctx.fillRect(0, i * 32, S, 32);
    ctx.fillStyle = 'rgba(20,16,14,0.7)';
    ctx.fillRect(0, i * 32, S, 2);
    for (let j = 0; j < 6; j++) {
      ctx.strokeStyle = `rgba(30,24,20,${0.15 + rng() * 0.2})`;
      ctx.beginPath();
      const y = i * 32 + 4 + rng() * 24;
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(S * 0.3, y + rng() * 6 - 3, S * 0.7, y + rng() * 6 - 3, S, y);
      ctx.stroke();
    }
  }
  return tex(c);
}

/** Toile ivoire désaturée (étal) ; bande de famille facultative. */
export function canvasCloth(seed: number): THREE.CanvasTexture {
  const S = 256;
  const { c, ctx } = cnv(S, S);
  const rng = makeRng(hashString(`ville|toile|${seed}`));
  ctx.fillStyle = 'rgb(188,182,166)';
  ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 12; i++) {
    ctx.fillStyle = i % 2 ? 'rgba(150,146,134,0.5)' : 'rgba(210,204,190,0.35)';
    ctx.fillRect((i * S) / 12, 0, S / 12, S);
  }
  for (let i = 0; i < 80; i++) {
    ctx.fillStyle = `rgba(90,86,80,${rng() * 0.08})`;
    ctx.fillRect(rng() * S, rng() * S, 2 + rng() * 20, 1 + rng() * 3);
  }
  return tex(c);
}

/** Fenêtre : vitre chaude allumée (dégradé ambre, croisillons) ou sombre (reflet de ciel). Émissive si allumée. */
export function windowTexture(lit: boolean, seed: number): THREE.CanvasTexture {
  const W = 64;
  const H = 96;
  const { c, ctx } = cnv(W, H);
  const rng = makeRng(hashString(`ville|fenetre|${lit}|${seed}`));
  ctx.fillStyle = '#1a1716';
  ctx.fillRect(0, 0, W, H);
  if (lit) {
    const g = ctx.createLinearGradient(0, 6, 0, H - 6);
    g.addColorStop(0, '#ffd890');
    g.addColorStop(1, '#c8631a');
    ctx.fillStyle = g;
  } else {
    const g = ctx.createLinearGradient(0, 6, 0, H - 6);
    g.addColorStop(0, '#16233a');
    g.addColorStop(1, '#0c1424');
    ctx.fillStyle = g;
  }
  ctx.fillRect(6, 6, W - 12, H - 12);
  if (lit && rng() < 0.6) {
    // silhouette d'un rideau à demi tiré
    ctx.fillStyle = 'rgba(120,52,20,0.55)';
    ctx.fillRect(6, 6, (W - 12) * (0.25 + rng() * 0.2), H - 12);
  }
  ctx.fillStyle = '#1a1716';
  ctx.fillRect(W / 2 - 2, 6, 4, H - 12);
  ctx.fillRect(6, H / 2 - 2, W - 12, 4);
  return tex(c, false);
}

/** Halo radial (sprite additif des lanternes) ; une texture partagée. */
let haloTex: THREE.CanvasTexture | null = null;
export function haloTexture(): THREE.CanvasTexture {
  if (haloTex) return haloTex;
  const S = 128;
  const { c, ctx } = cnv(S, S);
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.18, 'rgba(255,255,255,0.45)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.08)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  haloTex = tex(c, false);
  return haloTex;
}

/** Ombre de contact (ellipse douce sous un personnage ou un objet). */
let shadowTex: THREE.CanvasTexture | null = null;
export function contactShadowTexture(): THREE.CanvasTexture {
  if (shadowTex) return shadowTex;
  const S = 128;
  const { c, ctx } = cnv(S, S);
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(3,5,12,0.85)');
  g.addColorStop(0.45, 'rgba(3,5,12,0.45)');
  g.addColorStop(1, 'rgba(3,5,12,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  shadowTex = tex(c, false);
  return shadowTex;
}

/** Enseigne du Fanal : planche suspendue, lanterne peinte, aucune lettre (règle : aucun texte lisible). */
export function fanalSignTexture(): THREE.CanvasTexture {
  const { c, ctx } = cnv(256, 128);
  ctx.fillStyle = '#3a2a1e';
  ctx.beginPath();
  ctx.roundRect(4, 4, 248, 120, 18);
  ctx.fill();
  ctx.strokeStyle = '#c9a25a';
  ctx.lineWidth = 5;
  ctx.stroke();
  // lanterne stylisée (le « fanal »)
  ctx.fillStyle = '#ffcf7a';
  ctx.beginPath();
  ctx.moveTo(128, 26); ctx.lineTo(150, 50); ctx.lineTo(144, 96); ctx.lineTo(112, 96); ctx.lineTo(106, 50); ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#c9a25a';
  ctx.fillRect(104, 96, 48, 8);
  ctx.fillRect(118, 16, 20, 10);
  for (const x of [56, 200]) {
    ctx.beginPath();
    ctx.arc(x, 64, 14, 0, Math.PI * 2);
    ctx.fill();
  }
  return tex(c, false);
}
