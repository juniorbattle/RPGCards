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
import { FAM, mistPlane } from './grammaire';
import type { IlotDef } from './ilots';
import { COMMON_GLSL, LAMP_WARM, MAX_LIGHTS, U, surface } from './materiaux';
import { cobbleRelief, mistTexture, puddleMask } from './quaiMateriaux';
import { LAYER_NOREFLECT } from './reflets';
import { finish, type LightDef, type QuaiScene } from './scene';
import { plateRect, type DecorLight, type PreparedDiorama, type PreparedPlate } from './decors';
import { cheminMesh } from './chemins';
import { ombreMesh, ombresDuPlan, ombresRampe, profilPied, type Ombre, type PiedRampe } from './ombres';
import { BIAIS_MAX, encoder, RELIEF_MAX, RELIEF_MIN, reliefDansMorceau, RELIEFS, sommets } from './reliefs';
import { dansPoly, emprisesRampes, flancsRampe, formesVolume, metresParPixel, PENTE_MAX, RAMPES, rampeDansMorceau, REGLAGES, sommetRampe, texelsVolume, TROU, volumeActif, type MorceauPlan, type Rampe } from './volumes';

/** Réglages de l'essai de profondeur, écrits dans le nuanceur. */
const VOLUME_GLSL = Object.fromEntries(Object.entries(REGLAGES).map(([k, v]) => [k, v.toFixed(3)])) as Record<keyof typeof REGLAGES, string>;

const PLATE_VERT = /* glsl */ `
varying vec2 vUv; varying vec3 vWorld; varying vec3 vN;
void main(){
  vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; vN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

/**
 * Plan peint : la couleur de l'image (sa lumière peinte), plus, selon `uLit`, la lumière des lanternes du moteur
 * (elle vacille avec elles) ; voile atmosphérique selon `uVoile` ; brume du moteur selon `uFog` ; sortie prémultipliée.
 */
const PLATE_FRAG = /* glsl */ `
${COMMON_GLSL}
uniform sampler2D tPlate; uniform float uLit; uniform float uFog; uniform float uCut; uniform float uVoile; uniform float uFade; uniform float uCutY; uniform float uCoupe; uniform float uAO; uniform float uBase; uniform vec2 uAOk; uniform float uSpill;
varying vec2 vUv; varying vec3 vWorld; varying vec3 vN;
#ifdef RELIEF
// relief du plan (retour du responsable du 2026-10-29, \`reliefs.ts\`) : le rayon de la caméra traverse la carte des
// profondeurs, de la saillie la plus forte au retrait le plus profond ; l'image se lit là où il la rencontre ; une paroi
// révélée par le biais (le jambage d'une arcade, le dessous d'un balcon, le flanc d'un escalier) reste dans l'ombre
uniform sampler2D tRelief; uniform vec2 uUvM; uniform vec4 uCrop;
float rProf(vec2 uv){ return mix(${RELIEF_MIN.toFixed(2)}, ${RELIEF_MAX.toFixed(2)}, texture2D(tRelief, clamp(uv, uCrop.xy, uCrop.zw)).r); }
vec3 relief(vec2 uv0){
  vec3 V = normalize(cameraPosition - vWorld);
  // biais borné : cadrée de près ou de côté, une image peinte s'étire au lieu de gagner en relief
  vec2 biais = -V.xy / max(V.z, 0.3);
  vec2 dir = biais * min(1.0, ${BIAIS_MAX.toFixed(2)} / max(length(biais), 1e-4)) * uUvM;
  float pas = (${RELIEF_MAX.toFixed(2)} - (${RELIEF_MIN.toFixed(2)})) / 24.0;
  float d0 = ${RELIEF_MIN.toFixed(2)};
  float s0 = rProf(uv0 + dir * d0);
  for (int i = 1; i <= 24; i++) {
    float d1 = d0 + pas;
    float s1 = rProf(uv0 + dir * d1);
    if (d1 >= s1) {
      float a = s0 - d0; float b = s1 - d1;
      // paroi : la surface change plus vite que le rayon n'avance (marche, jambage, dessous)
      float paroi = clamp((abs(s1 - s0) - pas) / 0.8, 0.0, 1.0);
#ifdef VOLUME
      // essai de profondeur : la paroi révélée est dans l'ombre de ce qui avance
      return vec3(clamp(uv0 + dir * mix(d0, d1, a / max(a - b, 1e-4)), uCrop.xy, uCrop.zw), 1.0 - 0.75 * paroi);
#else
      return vec3(clamp(uv0 + dir * mix(d0, d1, a / max(a - b, 1e-4)), uCrop.xy, uCrop.zw), 1.0 - 0.5 * paroi);
#endif
    }
    d0 = d1; s0 = s1;
  }
  return vec3(clamp(uv0 + dir * ${RELIEF_MAX.toFixed(2)}, uCrop.xy, uCrop.zw), 1.0);
}
#endif
#if defined(VOLUME) || defined(RAMPE)
// essai de profondeur (retour du 2026-11-14, \`volumes.ts\`) : halo chaud autour du protagoniste ; il éclaire surtout les
// arêtes tournées vers lui (là où la normale du relief le regarde plus que le mur), à peine le mur plat
uniform vec4 uHero; uniform vec3 uHeroCol;
vec3 haloHeros(vec3 P, vec3 N, vec3 Nf){
  vec3 L = uHero.xyz - P; float d2 = dot(L, L);
  float x = max(1.0 - d2 / (uHero.w * uHero.w), 0.0);
  vec3 l = L * inversesqrt(max(d2, 1e-4));
  float nl = max(dot(N, l), 0.0); float nf = max(dot(Nf, l), 0.0);
  return uHeroCol * (x * x) * (${VOLUME_GLSL.haloPlat} * nf + ${VOLUME_GLSL.haloArete} * max(nl - nf, 0.0));
}
#endif
#ifdef VOLUME
uniform float uMpt;
// lanternes sur le relief : la lumière du plan (normale plate, comme avant) et celle de la normale du relief ; l'écart des
// deux est amplifié (les arêtes tournées vers une lanterne s'allument, celles qui s'en détournent s'éteignent)
void lumieresRelief(vec3 P, vec3 N, out vec3 dN, out vec3 dF){
  dN = vec3(0.0); dF = vec3(0.0);
  for (int i = 0; i < ${MAX_LIGHTS}; i++) {
    if (i >= uLightCount) break;
    vec3 Lv = uLightPos[i].xyz - P; float d2 = dot(Lv, Lv); float r = uLightPos[i].w;
    float x = max(1.0 - d2 / (r * r), 0.0); float att = x * x / (1.0 + 0.22 * d2);
    if (att <= 0.0) continue;
    vec3 l = Lv * inversesqrt(max(d2, 1e-4));
    dN += uLightCol[i] * att * max((dot(N, l) + 0.6) / 1.6, 0.0);
    dF += uLightCol[i] * att * max((l.z + 0.6) / 1.6, 0.0);
  }
}
#endif
#ifdef FLANC
uniform vec4 uStrip; uniform vec2 uStripM; uniform float uSombre;
#endif
void main(){
#ifdef RELIEF
  vec3 R = relief(vUv);
  vec4 A = texture2D(tPlate, R.xy);
  A.rgb *= R.z;
#elif defined(FLANC)
  // flanc d'une rampe : une bande de l'image (maçonnerie, planches) répétée en mètres
  vec4 A = texture2D(tPlate, mix(uStrip.xy, uStrip.zw, fract(vUv / uStripM)));
#else
  vec4 A = texture2D(tPlate, vUv);
#endif
  if (A.a < uCut) discard;
  vec3 c = A.rgb / max(A.a, 1e-4);
#if defined(VOLUME) || defined(RAMPE)
  vec3 N = normalize(vN); if (!gl_FrontFacing) N = -N;
  vec3 P = vWorld;
#ifdef VOLUME
  // normale tirée des pentes de la carte, point à sa vraie profondeur (un intérieur est plus loin des lanternes)
  vec4 T = texture2D(tRelief, R.xy);
  float prof = mix(${RELIEF_MIN.toFixed(2)}, ${RELIEF_MAX.toFixed(2)}, T.r);
  N = normalize(vec3((T.gb - 128.0 / 255.0) * (255.0 / 127.0) * ${PENTE_MAX.toFixed(2)}, uMpt));
  P = vec3(vWorld.xy + (R.xy - vUv) / uUvM, vWorld.z - prof);
  // recoins assombris selon leur profondeur, ombre sous les saillies (T.a) ; les lumières peintes restent (tons chauds
  // d'un intérieur éclairé, flammes, vitres allumées : linéaire, rouge au-dessus du bleu)
  float chaud = smoothstep(0.05, 0.28, c.r) * smoothstep(0.01, 0.07, c.r - c.b);
  float peint = max(chaud, smoothstep(0.35, 0.7, max(c.r, max(c.g, c.b)))) * step(${(TROU + 0.05).toFixed(2)}, T.a);
  c *= mix(T.a * (1.0 - ${VOLUME_GLSL.creux} * smoothstep(0.1, 3.0, prof)), 1.0, peint * ${VOLUME_GLSL.garde});
#endif
#ifdef FLANC
  c *= uSombre;
#else
  // ciel et lune d'en haut : ce qui regarde le ciel s'éclaircit, les dessous et les côtés s'assombrissent
  c *= 1.0 + ${VOLUME_GLSL.ciel} * N.y - ${VOLUME_GLSL.cotes} * (1.0 - abs(N.z)) * (1.0 - max(N.y, 0.0));
#endif
  // la pierre peinte de nuit est très sombre : la lumière ajoutée s'appuie sur un albédo plancher (une arête sombre
  // accroche quand même la lanterne ou le halo)
  vec3 alb = max(c, vec3(${VOLUME_GLSL.albedo}));
#ifdef VOLUME
  if (uLit > 0.0) {
    vec3 dN, dF; lumieresRelief(P, N, dN, dF);
    // écart borné : une lanterne collée au mur n'allume pas une traînée
    c = max(c + c * dF * uLit + alb * clamp(dN - dF, vec3(-0.8), vec3(${VOLUME_GLSL.areteMax})) * ${VOLUME_GLSL.arete}, c * 0.3);
  }
#else
  if (uLit > 0.0) {
    vec3 diff, spec; lightSum(P, N, normalize(cameraPosition - P), 0.6, 12.0, diff, spec);
    c += c * diff * uLit;
  }
#endif
  c += alb * haloHeros(P, N, vec3(0.0, 0.0, 1.0));
#ifdef VOLUME_VUE
  // vue de contrôle (\`?volume=normales\` ou \`?volume=ombres\`, QA)
  gl_FragColor = VOLUME_VUE > 1 ? vec4(vec3(T.a), 1.0) : vec4(N * 0.5 + 0.5, 1.0);
  return;
#endif
#else
  if (uLit > 0.0) {
    vec3 N = normalize(vN); if (!gl_FrontFacing) N = -N;
    vec3 diff, spec; lightSum(vWorld, N, normalize(cameraPosition - vWorld), 0.6, 12.0, diff, spec);
    c += c * diff * uLit;
  }
#endif
  // voile atmosphérique (passe 60) : vers le bleu de nuit clair de l'air, les rangs lointains s'éclaircissent
  c = mix(c, uFogColor * 2.2 + uMoonCol * 0.05, uVoile);
  c = mix(c, applyFog(c, vWorld), uFog);
  // plans en coupe seulement (passe 62) : les autres gardent exactement le nuanceur d'origine (rendu identique au pixel près)
#ifdef COUPE
  // passe 116 (retours R1) : liseré du fond magenta de la génération au pied d'un objet (teinte violette, frange verte
  // dessous) ramené à la nuit, sur ses 45 derniers centimètres seulement (les violets peints plus haut restent)
  float sp = uSpill * (1.0 - smoothstep(uBase + 0.2, uBase + 0.45, vWorld.y));
  if (sp > 0.0) {
    float m = min(c.r, c.b);
    vec3 d = c;
    if (m > d.g) { float e = m - d.g; d.r -= e; d.b -= e * 0.6; }
    d.g = min(d.g, max(d.r, d.b));
    c = mix(c, d, sp);
  }
  // pied assombri (passe 68, diorama en rangs) : le bas d'un objet ou d'un mur posé au sol prend l'ombre du sol ;
  // passe 116 (retours R1) : plus marqué au pied d'un objet (uAOk : assombrissement au sol, hauteur du fondu)
  c *= mix(1.0, mix(uAOk.x, 1.0, smoothstep(uBase, uBase + uAOk.y, vWorld.y)), uAO);
  // vue en section (passe 64) : uFade de 0 (entier) à 1 (coupé) ; sous uCutY, le rez-de-chaussée reste
  float k = uFade * smoothstep(uCutY - 0.3, uCutY + 0.3, vWorld.y);
  // fantôme assourdi (passe 67) : gris et plus sombre, les détails clairs (emblèmes dorés, vitraux) ne flottent plus
  c = mix(c, vec3(dot(c, vec3(0.3, 0.59, 0.11)) * 0.55), k * 0.8);
  gl_FragColor = vec4(c * A.a, A.a) * mix(1.0, uCoupe, k);
#else
  gl_FragColor = vec4(c * A.a, A.a);
#endif
}`;

/**
 * Pied assombri d'un plan posé au sol (passe 68) : 0,62 au sol, fondu sur 0,9 m ; passe 116 (retours R1 : « pas de
 * sensation d'image collée ») : un objet debout (moins de 6 m, de face) plus marqué, 0,5 au sol, fondu sur 0,7 m.
 */
export function aoDuPlan(e: Pick<PreparedPlate['entry'], 'at' | 'width' | 'size' | 'orient' | 'uv'>): [number, number] {
  return e.orient === 'face' && plateRect(e).h < 6 ? [0.5, 0.7] : [0.62, 0.9];
}

/**
 * Halo chaud autour du protagoniste (essai de profondeur, `volumes.ts`) : position (m) et rayon, couleur linéaire ; partagé
 * par référence par les plans de l'essai, déplacé avec le personnage (`focus`) ; il ne vacille pas (mouvement réduit).
 */
export const HALO = { rayon: 8, hauteur: 1.4, couleur: new THREE.Color(1.0, 0.6, 0.27).multiplyScalar(0.62) } as const;
const haloUniforms = () => ({ uHero: { value: new THREE.Vector4(0, -100, 0, HALO.rayon) }, uHeroCol: { value: HALO.couleur.clone() } });

/** Options de matière de l'essai de profondeur : volumes éclairés (`mpt` : mètres par texel de la carte), rampe, flanc. */
interface OptionsVolume {
  volume?: { mpt: number };
  rampe?: boolean;
  flanc?: { strip: readonly [number, number, number, number]; metres: readonly [number, number]; sombre: number };
  halo?: ReturnType<typeof haloUniforms>;
  /** vue de contrôle (QA) : 1 les normales, 2 l'ombre des saillies */
  vue?: 1 | 2;
}

/** Matière d'un plan (une par plan : chacun a sa texture). `profond` : diorama en rangs (passe 65), chaque plan peut
 *  s'effacer (fondu lointain) ; sinon seuls les plans `coupe` ont le nuanceur d'effacement. */
function plateMaterial(p: PreparedPlate, profond = false, relief: THREE.Texture | null = null, ov: OptionsVolume = {}): THREE.ShaderMaterial {
  const cut = p.entry.blend === 'decoupe';
  const r = plateRect(p.entry);
  const [u0, v0, u1, v1] = p.entry.uv ?? [0, 0, 1, 1];
  const avecRelief = !!relief && r.orient === 'face' && !ov.rampe && !ov.flanc;
  const volume = avecRelief && !!ov.volume;
  const essai = volume || !!ov.rampe || !!ov.flanc;
  const m = new THREE.ShaderMaterial({
    name: ov.flanc ? 'VilleFlanc' : ov.rampe ? 'VilleRampe' : 'VillePlan',
    uniforms: { ...U, tPlate: { value: p.texture }, uLit: { value: p.entry.lit ?? 0 }, uFog: { value: p.entry.fog ?? 1 }, uCut: { value: cut ? 0.02 : 0.004 }, uVoile: { value: p.entry.voile ?? 0 }, uFade: { value: 0 }, uCutY: { value: p.entry.coupeY ?? -1000 }, uCoupe: { value: COUPE_ALPHA }, uAO: { value: profond && p.entry.orient !== 'sol' && Math.abs(p.entry.at[1]) <= 0.25 ? 1 : 0 }, uBase: { value: p.entry.at[1] }, uAOk: { value: new THREE.Vector2(...aoDuPlan(p.entry)) }, uSpill: { value: profond && p.entry.orient === 'face' && Math.abs(p.entry.at[1]) <= 0.25 && plateRect(p.entry).h < 6 ? 1 : 0 }, ...(essai ? ov.halo ?? haloUniforms() : {}) },
    defines: { ...(p.entry.coupe || profond ? { COUPE: 1 } : {}), ...(avecRelief ? { RELIEF: 1 } : {}), ...(volume ? { VOLUME: 1 } : {}), ...(ov.rampe || ov.flanc ? { RAMPE: 1 } : {}), ...(ov.flanc ? { FLANC: 1 } : {}), ...(volume && ov.vue ? { VOLUME_VUE: ov.vue } : {}) },
    vertexShader: PLATE_VERT,
    fragmentShader: PLATE_FRAG,
    transparent: true,
    premultipliedAlpha: true,
    depthWrite: cut,
    side: ov.rampe || ov.flanc ? THREE.DoubleSide : THREE.FrontSide,
  });
  if (avecRelief) {
    // uv par mètre du plan, et le morceau de l'image (image retournée : v vers le haut)
    m.uniforms.tRelief = { value: relief };
    m.uniforms.uUvM = { value: new THREE.Vector2((u1 - u0) / r.w, (v1 - v0) / r.h) };
    m.uniforms.uCrop = { value: new THREE.Vector4(u0, 1 - v1, u1, 1 - v0) };
  }
  if (volume) m.uniforms.uMpt = { value: ov.volume!.mpt };
  if (ov.flanc) {
    m.uniforms.uStrip = { value: new THREE.Vector4(...ov.flanc.strip) };
    m.uniforms.uStripM = { value: new THREE.Vector2(...ov.flanc.metres) };
    m.uniforms.uSombre = { value: ov.flanc.sombre };
  }
  return m;
}

/**
 * Carte des profondeurs d'une image du décor (`reliefs.ts`), tracée au chargement à mi-résolution : le plan de la façade
 * en fond, puis chaque forme (profondeur constante, ou dégradé vertical). null sans relief déclaré, ou sans canevas.
 */
/** Cartes de l'essai de profondeur déjà calculées (par image) : un retour dans l'îlot ne refait que l'envoi au GPU. */
const CARTES_VOLUME = new Map<string, { data: Uint8Array; w: number; h: number }>();
function textureVolume(v: { data: Uint8Array; w: number; h: number }): THREE.DataTexture {
  const t = new THREE.DataTexture(v.data, v.w, v.h, THREE.RGBAFormat);
  t.colorSpace = THREE.NoColorSpace;
  t.generateMipmaps = false;
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}
function reliefTexture(file: string, size: readonly [number, number], volume?: { mpp: number }): THREE.Texture | null {
  const formes = volume ? formesVolume(file) : RELIEFS[file];
  if (!formes?.length || typeof document === 'undefined') return null;
  const cle = `${file}|${size[0]}x${size[1]}`;
  if (volume && CARTES_VOLUME.has(cle)) return textureVolume(CARTES_VOLUME.get(cle)!);
  const k = 0.5;
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(size[0] * k));
  c.height = Math.max(1, Math.round(size[1] * k));
  const g = c.getContext('2d', volume ? { willReadFrequently: true } : undefined);
  if (!g) return null;
  const gris = (prof: number) => { const v = encoder(prof); return `rgb(${v},${v},${v})`; };
  g.fillStyle = gris(0);
  g.fillRect(0, 0, c.width, c.height);
  for (const f of formes) {
    const pts = sommets(f);
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(x * k, y * k) : g.moveTo(x * k, y * k)));
    g.closePath();
    if (typeof f.prof === 'number') g.fillStyle = gris(f.prof);
    else {
      const ys = pts.map((q) => q[1]);
      const gr = g.createLinearGradient(0, Math.min(...ys) * k, 0, Math.max(...ys) * k);
      gr.addColorStop(0, gris(f.prof[0]));
      gr.addColorStop(1, gris(f.prof[1]));
      g.fillStyle = gr;
    }
    g.fill();
  }
  if (volume) {
    // essai de profondeur : la carte relue, ses pentes et l'ombre des saillies calculées (`texelsVolume`), en RGBA
    const { width: w, height: h } = c;
    const px = g.getImageData(0, 0, w, h).data;
    const profR = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) profR[i] = px[i * 4]!;
    const rampes = RAMPES[file] ?? [];
    let trou: Uint8Array | undefined;
    if (rampes.length) {
      trou = new Uint8Array(w * h);
      for (const r of rampes) {
        const xs = r.poly.map((q) => q[0] * k); const ys = r.poly.map((q) => q[1] * k);
        for (let y = Math.max(0, Math.floor(Math.min(...ys))); y < Math.min(h, Math.ceil(Math.max(...ys))); y++)
          for (let x = Math.max(0, Math.floor(Math.min(...xs))); x < Math.min(w, Math.ceil(Math.max(...xs))); x++)
            if (dansPoly((x + 0.5) / k, (y + 0.5) / k, r.poly)) trou[y * w + x] = 1;
      }
    }
    const v = { data: texelsVolume(profR, w, h, volume.mpp / k, trou), w, h };
    CARTES_VOLUME.set(cle, v);
    return textureVolume(v);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  t.generateMipmaps = false;
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  return t;
}

/**
 * Opacité d'un plan `coupe` quand le personnage est derrière lui (passe 62 : 22 %, puis 12 %, 8 %). Passe 64 : la vue en
 * section (étages effacés, `coupeY`) a été essayée ; le responsable garde le bâtiment transparent, comme sur la capture
 * qu'il a jointe (passe 63) : 12 %.
 */
export const COUPE_ALPHA = 0.12;
/**
 * Le personnage est « derrière » un plan `coupe` : plus loin en z, dans sa largeur (marge de 0,6 m). Plan de côté (passe
 * 65, `vers` donné) : plus loin que son bout avant, du côté non peint (le mur cache alors le personnage à la caméra).
 */
export function behindPlate(r: { center: [number, number, number]; w: number }, p: { x: number; z: number }, vers?: 'est' | 'ouest', coupeZ?: number): boolean {
  // rang dépassé (passe 65) : tout le plan, quelle que soit sa largeur
  if (coupeZ !== undefined && p.z < coupeZ) return true;
  if (vers) return p.z < r.center[2] + r.w / 2 - 0.35 && (vers === 'est' ? p.x < r.center[0] - 0.2 : p.x > r.center[0] + 0.2);
  return p.z < r.center[2] - 0.35 && Math.abs(p.x - r.center[0]) < r.w / 2 + 0.6;
}

/**
 * Fondu lointain (passe 65, quartiers en rangs) : un plan de `LOIN[0]` à `LOIN[1]` m devant le personnage (z de son bord
 * avant) passe à l'opacité `FANTOME_LOIN` ; les plans tout près de la caméra s'effacent (`PRES`). Passe 68 : gardés un
 * temps en fantôme léger (7 %, « garder un petit visuel du rang précédemment traversé »), puis effacés de nouveau à la
 * demande du responsable : « plus besoin d'intégrer un fantôme visible car les chemins pavés sont à présent bien
 * intégrés » ; seul le rang juste devant le personnage reste en fantôme (`COUPE_ALPHA`, décision de la passe 64).
 */
export const LOIN: readonly [number, number] = [12, 18];
export const FANTOME_LOIN = 0;
/** Distance à la caméra (m, en z) en deçà de laquelle un plan s'efface tout à fait (de `PRES[1]` à `PRES[0]`). */
export const PRES: readonly [number, number] = [3, 7];
export function nearFade(front: number, camZ: number): number {
  const t = THREE.MathUtils.clamp((camZ - front - PRES[0]) / (PRES[1] - PRES[0]), 0, 1);
  return 1 - t * t * (3 - 2 * t);
}
/**
 * Opacité d'un plan d'un diorama en rangs : fantôme (`cut` de 0 à 1 : vers `COUPE_ALPHA`), puis rangs dépassés (`far` :
 * vers `FANTOME_LOIN`), puis tout près de la caméra (`near` : vers 0). Renvoie aussi les uniformes du nuanceur (`fade` :
 * part assourdie, `coupe` : opacité visée), tels que mix(1, coupe, fade) = opacité.
 */
export function ghostOpacity(cut: number, far: number, near: number): { o: number; fade: number; coupe: number } {
  let o = 1 + (COUPE_ALPHA - 1) * cut;
  if (o > FANTOME_LOIN) o += (FANTOME_LOIN - o) * far;
  o *= 1 - near;
  const fade = Math.min(1, (1 - o) / (1 - COUPE_ALPHA));
  return { o, fade, coupe: fade >= 1 ? o : COUPE_ALPHA };
}
type RectZ = { center: [number, number, number]; w: number; h: number; orient: 'face' | 'sol' | 'cote' };
const frontOf = (r: RectZ) => r.center[2] + (r.orient === 'cote' ? r.w / 2 : r.orient === 'sol' ? r.h / 2 : 0);
export function farFade(r: RectZ, p: { z: number }): number {
  const front = frontOf(r);
  const t = THREE.MathUtils.clamp((front - p.z - LOIN[0]) / (LOIN[1] - LOIN[0]), 0, 1);
  return t * t * (3 - 2 * t);
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

/**
 * Contact au sol de la silhouette d'un plan (passe 116, retours R1) : les lignes du bas de son morceau d'image, lues une
 * fois (canevas 2D) ; null hors du navigateur ou si l'image n'est pas lisible (l'ombre garde alors son ellipse).
 */
function piedDuPlan(p: PreparedPlate, cache: Map<string, number[] | null>): number[] | null {
  const [u0, v0, u1, v1] = p.entry.uv ?? [0, 0, 1, 1];
  const key = `${p.entry.file}|${u0}|${v0}|${u1}|${v1}`;
  if (cache.has(key)) return cache.get(key)!;
  let out: number[] | null = null;
  const img = p.texture.image as CanvasImageSource & { width: number; height: number } | undefined;
  if (img && typeof document !== 'undefined' && img.width > 0 && img.height > 0) {
    try {
      const W = img.width; const H = img.height;
      const sx = Math.round(u0 * W); const sw = Math.max(1, Math.round((u1 - u0) * W));
      const k = Math.max(3, Math.round((v1 - v0) * H * 0.05));
      // image retournée à la création : le bas du morceau (v1, compté depuis le haut) est à la ligne (1 − v1) · H
      const sy = Math.round((1 - v1) * H);
      const cw = Math.min(sw, 1024);
      const c = document.createElement('canvas'); c.width = cw; c.height = k;
      const g = c.getContext('2d', { willReadFrequently: true });
      if (g) {
        g.drawImage(img, sx, sy, sw, k, 0, 0, cw, k);
        out = profilPied(g.getImageData(0, 0, cw, k).data, cw, k, THREE.MathUtils.clamp(Math.round(p.entry.width * 24), 16, 512));
      }
    } catch { out = null; }
  }
  cache.set(key, out);
  return out;
}

/** Morceau d'image d'un plan de face, pour passer des pixels de l'image au monde (`volumes.ts`). */
function morceauDe(p: PreparedPlate): MorceauPlan {
  const r = plateRect(p.entry);
  return { size: p.entry.size, uv: p.entry.uv ?? [0, 0, 1, 1], x: r.center[0], y: p.entry.at[1], z: r.center[2], w: r.w, h: r.h };
}

/**
 * Escalier en vrai 3D (essai de profondeur, levier 3) : la volée découpée (polygone de `RAMPES`) posée sur une rampe qui
 * avance vers la rue (`sommetRampe` : un plan incliné), ses deux flancs en rideaux verticaux jusqu'au sol, habillés d'une
 * bande de l'image répétée et assombrie. Les maillages sont posés à leur centre (tri des transparents) ; `pied` : l'emprise
 * au sol de la rampe, pour son ombre.
 */
function rampeMeshes(p: PreparedPlate, rp: Rampe, profond: boolean, halo: ReturnType<typeof haloUniforms>): { meshes: THREE.Mesh[]; mats: THREE.ShaderMaterial[]; pied: PiedRampe } {
  const m = morceauDe(p);
  const [W, H] = p.entry.size;
  const pts = rp.poly.map(([x, y]) => sommetRampe(m, rp, x, y));
  const tris = THREE.ShapeUtils.triangulateShape(rp.poly.map(([x, y]) => new THREE.Vector2(x, y)), []);
  const centre = new THREE.Vector3();
  for (const q of pts) centre.add(new THREE.Vector3(...q));
  centre.divideScalar(pts.length);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts.flatMap((q) => [q[0] - centre.x, q[1] - centre.y, q[2] - centre.z]), 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(rp.poly.flatMap(([x, y]) => [x / W, 1 - y / H]), 2));
  g.setIndex(tris.flat());
  g.computeVertexNormals();
  // normales tournées vers la caméra (la rampe regarde la rue et le ciel)
  const n = g.getAttribute('normal') as THREE.BufferAttribute;
  if (n.count && n.getZ(0) + n.getY(0) < 0) for (let i = 0; i < n.count; i++) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i));
  const matR = plateMaterial(p, profond, null, { rampe: true, halo });
  const rampe = new THREE.Mesh(g, matR);
  rampe.name = `rampe:${p.id}`;
  rampe.position.copy(centre);
  const mpp = metresParPixel(m);
  const [fx0, fy0, fx1, fy1] = rp.flanc;
  const matF = plateMaterial(p, profond, null, { flanc: { strip: [fx0 / W, 1 - fy1 / H, fx1 / W, 1 - fy0 / H], metres: [(fx1 - fx0) * mpp, (fy1 - fy0) * mpp], sombre: 0.68 }, halo });
  const meshes: THREE.Mesh[] = [rampe];
  for (const f of flancsRampe(m, rp)) {
    if (!f.quads.length) continue;
    const pos: number[] = []; const uv: number[] = []; const nor: number[] = [];
    const nx = f.cote === 'gauche' ? -1 : 1;
    const c = new THREE.Vector3();
    for (const [a] of f.quads) c.add(new THREE.Vector3(...a.haut)).add(new THREE.Vector3(...a.sol));
    c.divideScalar(f.quads.length * 2);
    for (const [a, b] of f.quads) {
      const quad = [a.haut, b.haut, b.sol, a.haut, b.sol, a.sol];
      const quv: (readonly [number, number])[] = [a.uv, b.uv, [b.uv[0], 0], a.uv, [b.uv[0], 0], [a.uv[0], 0]];
      for (let i = 0; i < 6; i++) { const q = quad[i]!; pos.push(q[0] - c.x, q[1] - c.y, q[2] - c.z); uv.push(quv[i]![0], quv[i]![1]); nor.push(nx, 0, 0); }
    }
    const gf = new THREE.BufferGeometry();
    gf.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    gf.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    gf.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    const flanc = new THREE.Mesh(gf, matF);
    flanc.name = `flanc-${f.cote}:${p.id}`;
    flanc.position.copy(c);
    meshes.push(flanc);
  }
  const bas = rp.poly.filter(([, y]) => y >= rp.bas - 2).map(([x]) => x);
  const x0 = sommetRampe(m, rp, Math.min(...bas), rp.bas)[0];
  const x1 = sommetRampe(m, rp, Math.max(...bas), rp.bas)[0];
  return { meshes, mats: [matR, matF], pied: { x0, x1, z0: m.z, z1: m.z + rp.saillie, h: (rp.bas - rp.haut) * mpp } };
}

/** Scène d'un îlot en diorama : sol du moteur, plans peints dans l'ordre, lumières et halos, ciel du moteur au fond. */
export function buildDiorama(def: IlotDef, d: PreparedDiorama, artSeed: number): QuaiScene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x04060c);
  const textures: THREE.Texture[] = [];
  const meshes: THREE.Object3D[] = [];
  /** Plans `coupe` (passe 62) : opacité courante, profondeur écrite d'origine ; diorama en rangs (passe 65) : tous les
   *  plans, pour le fondu lointain. */
  const profond = d.plates.some((p) => p.entry.coupe);
  /** Plans de face et leur profondeur, pour l'avant-plan d'une scène du Récit guidé (M14). */
  const faces: { mesh: THREE.Mesh; z: number }[] = [];
  const cutaways: { rect: ReturnType<typeof plateRect>; mat: THREE.ShaderMaterial; cut: number; writes: boolean; ghost: boolean; vers: 'est' | 'ouest' | undefined; coupeZ: number | undefined; ombres: { mat: THREE.ShaderMaterial; alpha: number }[]; extras: THREE.ShaderMaterial[] }[] = [];
  /** Ombres au sol (passe 68), créées avant les plans : sous eux dans l'ordre de dessin. */
  const ombreMeshes: THREE.Mesh[] = [];
  const pieds = new Map<string, number[] | null>();
  const ground = d.ground ? engineGround(def, artSeed, textures) : null;
  if (ground) meshes.push(ground);
  // relief des plans (retour du 2026-10-29) : une carte par image, partagée par ses plans ; `?relief=0` le coupe (comparaison)
  const sansRelief = typeof location !== 'undefined' && new URLSearchParams(location.search).get('relief') === '0';
  // essai de profondeur (retour du 2026-11-14, `volumes.ts`) : îlots de l'essai seulement ; `?volume=0` le coupe
  const volume = typeof location !== 'undefined' && volumeActif(def.id, location.search);
  const halo = haloUniforms();
  // `?halo=0` (QA) : sans le halo du protagoniste, pour le comparer
  const sansHalo = typeof location !== 'undefined' && new URLSearchParams(location.search).get('halo') === '0';
  // mesures de l'écrasement des rangs profonds (QA seulement) : `?brume=0` sans les nappes de brume, `?voile=0` sans le
  // voile atmosphérique des plans, `?brouillard=0` sans la brume du moteur dans la matière des plans
  const qaQ = typeof location !== 'undefined' ? new URLSearchParams(location.search) : null;
  const qaSans = (k: string) => qaQ?.get('qa') === '1' && qaQ.get(k) === '0';
  const vueQa = typeof location === 'undefined' ? undefined : ({ normales: 1, ombres: 2 } as const)[new URLSearchParams(location.search).get('volume') ?? ''];
  const reliefs = new Map<string, THREE.Texture | null>();
  const reliefDe = (p: PreparedPlate): THREE.Texture | null => {
    if (sansRelief || !reliefDansMorceau(p.entry.file, p.entry.size, p.entry.uv, volume ? formesVolume(p.entry.file) : RELIEFS[p.entry.file])) return null;
    if (!reliefs.has(p.entry.file)) {
      const t = reliefTexture(p.entry.file, p.entry.size, volume ? { mpp: metresParPixel(morceauDe(p)) } : undefined);
      if (t) textures.push(t);
      reliefs.set(p.entry.file, t);
    }
    return reliefs.get(p.entry.file) ?? null;
  };
  // créés dans l'ordre de dessin : à profondeur égale, three.js départage les transparents par ordre de création
  for (const p of d.plates) {
    const r = plateRect(p.entry);
    const g = new THREE.PlaneGeometry(r.w, r.h);
    // sous-rectangle de l'image (passe 62) : uv du plan ramenés au morceau (image retournée à la création : v vers le haut)
    if (p.entry.uv) {
      const [u0, v0, u1, v1] = p.entry.uv;
      const uv = g.attributes.uv as THREE.BufferAttribute;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), 1 - v1 + uv.getY(i) * (v1 - v0));
    }
    // plan de côté tourné vers l'ouest : image retournée, son bord gauche reste vers la caméra
    if (r.orient === 'cote' && p.entry.vers === 'ouest') {
      const uv = g.attributes.uv as THREE.BufferAttribute;
      const [u0, , u1] = p.entry.uv ?? [0, 0, 1, 1];
      for (let i = 0; i < uv.count; i++) uv.setX(i, u0 + u1 - uv.getX(i));
    }
    const mpt = metresParPixel(morceauDe(p)) / 0.5;
    const mat = plateMaterial(p, profond, reliefDe(p), volume ? { volume: { mpt }, halo, vue: vueQa } : {});
    if (qaSans('voile')) mat.uniforms.uVoile!.value = 0;
    if (qaSans('brouillard')) mat.uniforms.uFog!.value = 0;
    const mesh = new THREE.Mesh(g, mat);
    mesh.name = `plan:${d.ilot}/${p.id}`;
    mesh.position.set(...r.center);
    if (r.orient === 'sol') {
      mesh.rotation.x = -Math.PI / 2;
      mesh.layers.set(LAYER_NOREFLECT);
    }
    // de côté : normale vers +x (est) ou −x (ouest) ; le bord gauche de l'image vers la caméra (z le plus grand)
    if (r.orient === 'cote') mesh.rotation.y = p.entry.vers === 'ouest' ? -Math.PI / 2 : Math.PI / 2;
    // escaliers en vrai 3D (essai de profondeur) : chaque volée découpée dans ce morceau d'image, posée sur sa rampe
    const rampes = volume && r.orient === 'face' ? (RAMPES[p.entry.file] ?? []).filter((q) => rampeDansMorceau(q, p.entry.size, p.entry.uv ?? [0, 0, 1, 1])) : [];
    const extras: THREE.ShaderMaterial[] = [];
    const ombresRampes: Ombre[] = [];
    for (const rp of rampes) {
      const built = rampeMeshes(p, rp, profond, halo);
      for (const m of built.meshes) { meshes.push(m); faces.push({ mesh: m, z: r.center[2] }); }
      extras.push(...built.mats);
      ombresRampes.push(...ombresRampe(built.pied, d.lights));
    }
    if (profond) {
      // ombres du plan (passe 68) : contact sous un objet, pied d'une façade, pied d'un mur de passage
      // passe 116 (retours R1) : contact de la silhouette au sol et ombre portée par la lanterne la plus proche
      const sol = r.orient === 'face' && r.h < 6 && Math.abs(p.entry.at[1]) <= 0.25;
      const ombres = [...ombresDuPlan(r, p.entry.at, p.entry.vers, { profil: sol ? piedDuPlan(p, pieds) ?? undefined : undefined, lumieres: d.lights }), ...ombresRampes].map((o) => {
        const { mesh: m, mat: om } = ombreMesh(o);
        ombreMeshes.push(m);
        const t = om.uniforms.tProfil!.value as THREE.Texture | null;
        if (t) textures.push(t);
        return { mat: om, alpha: o.alpha };
      });
      cutaways.push({ rect: r, mat, cut: 0, writes: mat.depthWrite, ghost: !!p.entry.coupe, vers: r.orient === 'cote' ? p.entry.vers ?? 'est' : undefined, coupeZ: p.entry.coupeZ, ombres, extras });
    }
    if (r.orient === 'face') faces.push({ mesh, z: r.center[2] });
    meshes.push(mesh);
  }
  const lights: LightDef[] = d.lights.map((l) => ({
    x: l.at[0], y: l.at[1], z: l.at[2], intensity: l.intensity, radius: l.radius, halo: l.halo ?? 0, flicker: l.flicker ?? 'lantern', color: lightColor(l.color),
  }));
  // brume entre les plans (passe 60) : nappes du moteur, comme celles du décor par code
  const mistMats: THREE.ShaderMaterial[] = [];
  if (d.mists.length && !qaSans('brume')) {
    const tex = mistTexture(artSeed);
    textures.push(tex);
    for (const m of d.mists) { const { mesh, mat } = mistPlane(tex, m); meshes.push(mesh); mistMats.push(mat); }
  }
  // ombres au sol (passe 68), puis chemins lumineux d'un quartier en rangs (passe 68 : sans flèche, pavés qui luisent)
  meshes.unshift(...ombreMeshes);
  // le chemin épouse les pavés du sol du moteur : même texture, même pose (x de début, z de fin, 3 m par répétition)
  const b = def.ilot.bounds;
  const cobbleTex = ground ? ((ground.material as THREE.ShaderMaterial).uniforms.tAlbedo?.value as THREE.Texture | undefined) : undefined;
  const chemin = cheminMesh(def.chemins ?? [], b, cobbleTex ? { tex: cobbleTex, x0: b.x0 - 14, zMax: b.z1 + 0.3, tile: 3 } : undefined);
  const cheminMats = chemin ? [chemin.mat] : [];
  if (chemin) meshes.push(chemin.mesh);
  const base = finish(scene, { build: (into) => { for (const m of meshes) into.add(m); return meshes.length; } }, lights, [], textures);
  // halos des lumières (diorama en rangs, passe 65) : ceux d'un rang dépassé s'atténuent avec leur plan fantôme, ceux
  // loin devant le personnage s'effacent avec le fondu lointain (le maillage des halos est fusionné : couleurs par sommet)
  const haloMesh = profond ? [...scene.children].reverse().find((o): o is THREE.Mesh => o instanceof THREE.Mesh && !!o.geometry.getAttribute('color') && (o.material as THREE.Material).blending === THREE.AdditiveBlending) : undefined;
  const haloCol = haloMesh?.geometry.getAttribute('color') as THREE.BufferAttribute | undefined;
  const haloBase = haloCol ? Float32Array.from(haloCol.array as Float32Array) : null;
  const haloLights = d.lights.filter((l) => l.halo).map((l) => ({ z: l.at[2], coupeZ: l.coupeZ, k: 1 }));
  let lastFocus = performance.now();
  // vue en coupe (passe 62) : le plan derrière lequel passe le personnage devient un fantôme (et n'écrit plus la
  // profondeur) ; passe 65 : les plans loin devant lui s'effacent tout à fait (fondu lointain, continu avec la position)
  const focus = (p: { x: number; z: number }, snap: boolean, cam?: { z: number }) => {
    const now = performance.now();
    const k = snap ? 1 : Math.min(1, ((now - lastFocus) / 1000) * 7);
    lastFocus = now;
    for (const c of cutaways) {
      const want = c.ghost && behindPlate(c.rect, p, c.vers, c.coupeZ) ? 1 : 0;
      c.cut += (want - c.cut) * k;
      if (Math.abs(c.cut - want) < 0.005) c.cut = want;
      // passe 68 : les rangs dépassés restent en fantôme léger ; seuls les plans tout près de la caméra s'effacent
      const g = ghostOpacity(c.cut, farFade(c.rect, p), cam ? nearFade(frontOf(c.rect), cam.z) : 0);
      c.mat.uniforms.uFade!.value = g.fade;
      c.mat.uniforms.uCoupe!.value = g.coupe;
      c.mat.depthWrite = c.writes && g.o > 0.98;
      // rampes et flancs (essai de profondeur) : le même fantôme que leur plan
      for (const e of c.extras) { e.uniforms.uFade!.value = g.fade; e.uniforms.uCoupe!.value = g.coupe; e.depthWrite = c.writes && g.o > 0.98; }
      for (const o of c.ombres) o.mat.uniforms.uAlpha!.value = o.alpha * g.o;
    }
    // halo chaud du protagoniste (essai de profondeur) : il le suit, sans vaciller
    if (volume) (halo.uHero.value as THREE.Vector4).set(p.x, HALO.hauteur, p.z, sansHalo ? 0.001 : HALO.rayon);
    // le chemin se révèle autour du personnage
    for (const cm of cheminMats) (cm.uniforms.uPlayer!.value as THREE.Vector2).set(p.x, p.z);
    if (haloCol && haloBase) {
      const per = haloBase.length / Math.max(1, haloLights.length);
      haloLights.forEach((h, i) => {
        const front: RectZ = { center: [0, 0, h.z], w: 0, h: 0, orient: 'face' };
        const want = ghostOpacity(h.coupeZ !== undefined && p.z < h.coupeZ ? 1 : 0, farFade(front, p), cam ? nearFade(h.z, cam.z) : 0).o;
        h.k += (want - h.k) * k;
        if (Math.abs(h.k - want) < 0.005) h.k = want;
        for (let j = i * per; j < (i + 1) * per; j++) haloCol.array[j] = haloBase[j]! * h.k;
      });
      haloCol.needsUpdate = true;
    }
  };
  const avantPlan = (z: number | null) => { for (const f of faces) f.mesh.visible = z === null || f.z <= z + 2; };
  // escaliers en vrai 3D : leurs emprises au sol, obstacles de l'îlot monté (`ville.ts`)
  const obstacles = volume ? emprisesRampes(d.plates.map((p) => p.entry)) : [];
  if (!mistMats.length && !cutaways.length && !cheminMats.length && !volume) return { ...base, avantPlan };
  return { ...base, avantPlan, obstacles, focus: cutaways.length || volume ? focus : undefined, update: (time: number) => { base.update(time); for (const mm of [...mistMats, ...cheminMats]) mm.uniforms.uT!.value = time; } };
}
