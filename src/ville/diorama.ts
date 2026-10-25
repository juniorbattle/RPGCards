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
import { COMMON_GLSL, LAMP_WARM, U, surface } from './materiaux';
import { cobbleRelief, mistTexture, puddleMask } from './quaiMateriaux';
import { LAYER_NOREFLECT } from './reflets';
import { finish, type LightDef, type QuaiScene } from './scene';
import { plateRect, type DecorLight, type PreparedDiorama, type PreparedPlate } from './decors';
import { cheminMesh } from './chemins';
import { ombreMesh, ombresDuPlan, profilPied } from './ombres';

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
void main(){
  vec4 A = texture2D(tPlate, vUv);
  if (A.a < uCut) discard;
  vec3 c = A.rgb / max(A.a, 1e-4);
  if (uLit > 0.0) {
    vec3 N = normalize(vN); if (!gl_FrontFacing) N = -N;
    vec3 diff, spec; lightSum(vWorld, N, normalize(cameraPosition - vWorld), 0.6, 12.0, diff, spec);
    c += c * diff * uLit;
  }
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

/** Matière d'un plan (une par plan : chacun a sa texture). `profond` : diorama en rangs (passe 65), chaque plan peut
 *  s'effacer (fondu lointain) ; sinon seuls les plans `coupe` ont le nuanceur d'effacement. */
function plateMaterial(p: PreparedPlate, profond = false): THREE.ShaderMaterial {
  const cut = p.entry.blend === 'decoupe';
  return new THREE.ShaderMaterial({
    name: 'VillePlan',
    uniforms: { ...U, tPlate: { value: p.texture }, uLit: { value: p.entry.lit ?? 0 }, uFog: { value: p.entry.fog ?? 1 }, uCut: { value: cut ? 0.02 : 0.004 }, uVoile: { value: p.entry.voile ?? 0 }, uFade: { value: 0 }, uCutY: { value: p.entry.coupeY ?? -1000 }, uCoupe: { value: COUPE_ALPHA }, uAO: { value: profond && p.entry.orient !== 'sol' && Math.abs(p.entry.at[1]) <= 0.25 ? 1 : 0 }, uBase: { value: p.entry.at[1] }, uAOk: { value: new THREE.Vector2(...aoDuPlan(p.entry)) }, uSpill: { value: profond && p.entry.orient === 'face' && Math.abs(p.entry.at[1]) <= 0.25 && plateRect(p.entry).h < 6 ? 1 : 0 } },
    defines: p.entry.coupe || profond ? { COUPE: 1 } : {},
    vertexShader: PLATE_VERT,
    fragmentShader: PLATE_FRAG,
    transparent: true,
    premultipliedAlpha: true,
    depthWrite: cut,
    side: THREE.FrontSide,
  });
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

/** Scène d'un îlot en diorama : sol du moteur, plans peints dans l'ordre, lumières et halos, ciel du moteur au fond. */
export function buildDiorama(def: IlotDef, d: PreparedDiorama, artSeed: number): QuaiScene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x04060c);
  const textures: THREE.Texture[] = [];
  const meshes: THREE.Object3D[] = [];
  /** Plans `coupe` (passe 62) : opacité courante, profondeur écrite d'origine ; diorama en rangs (passe 65) : tous les
   *  plans, pour le fondu lointain. */
  const profond = d.plates.some((p) => p.entry.coupe);
  const cutaways: { rect: ReturnType<typeof plateRect>; mat: THREE.ShaderMaterial; cut: number; writes: boolean; ghost: boolean; vers: 'est' | 'ouest' | undefined; coupeZ: number | undefined; ombres: { mat: THREE.ShaderMaterial; alpha: number }[] }[] = [];
  /** Ombres au sol (passe 68), créées avant les plans : sous eux dans l'ordre de dessin. */
  const ombreMeshes: THREE.Mesh[] = [];
  const pieds = new Map<string, number[] | null>();
  const ground = d.ground ? engineGround(def, artSeed, textures) : null;
  if (ground) meshes.push(ground);
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
    const mat = plateMaterial(p, profond);
    const mesh = new THREE.Mesh(g, mat);
    mesh.name = `plan:${d.ilot}/${p.id}`;
    mesh.position.set(...r.center);
    if (r.orient === 'sol') {
      mesh.rotation.x = -Math.PI / 2;
      mesh.layers.set(LAYER_NOREFLECT);
    }
    // de côté : normale vers +x (est) ou −x (ouest) ; le bord gauche de l'image vers la caméra (z le plus grand)
    if (r.orient === 'cote') mesh.rotation.y = p.entry.vers === 'ouest' ? -Math.PI / 2 : Math.PI / 2;
    if (profond) {
      // ombres du plan (passe 68) : contact sous un objet, pied d'une façade, pied d'un mur de passage
      // passe 116 (retours R1) : contact de la silhouette au sol et ombre portée par la lanterne la plus proche
      const sol = r.orient === 'face' && r.h < 6 && Math.abs(p.entry.at[1]) <= 0.25;
      const ombres = ombresDuPlan(r, p.entry.at, p.entry.vers, { profil: sol ? piedDuPlan(p, pieds) ?? undefined : undefined, lumieres: d.lights }).map((o) => {
        const { mesh: m, mat: om } = ombreMesh(o);
        ombreMeshes.push(m);
        const t = om.uniforms.tProfil!.value as THREE.Texture | null;
        if (t) textures.push(t);
        return { mat: om, alpha: o.alpha };
      });
      cutaways.push({ rect: r, mat, cut: 0, writes: mat.depthWrite, ghost: !!p.entry.coupe, vers: r.orient === 'cote' ? p.entry.vers ?? 'est' : undefined, coupeZ: p.entry.coupeZ, ombres });
    }
    meshes.push(mesh);
  }
  const lights: LightDef[] = d.lights.map((l) => ({
    x: l.at[0], y: l.at[1], z: l.at[2], intensity: l.intensity, radius: l.radius, halo: l.halo ?? 0, flicker: l.flicker ?? 'lantern', color: lightColor(l.color),
  }));
  // brume entre les plans (passe 60) : nappes du moteur, comme celles du décor par code
  const mistMats: THREE.ShaderMaterial[] = [];
  if (d.mists.length) {
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
      for (const o of c.ombres) o.mat.uniforms.uAlpha!.value = o.alpha * g.o;
    }
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
  if (!mistMats.length && !cutaways.length && !cheminMats.length) return base;
  return { ...base, focus: cutaways.length ? focus : undefined, update: (time: number) => { base.update(time); for (const mm of [...mistMats, ...cheminMats]) mm.uniforms.uT!.value = time; } };
}
