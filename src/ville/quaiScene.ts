/**
 * M09 V3 — passe de qualité du Quai (« le Quai, la nuit »), décidée par le responsable le 2026-10-19 (fiche Q1) :
 * le même plan pur (`quai.ts` : façades, portes, étal, lampadaires, bornes, collisions), un décor reconstruit en plans
 * de profondeur pour la caméra frontale 2.5D :
 *   1. premier plan : eau du port (reflets étirés, brume basse), mur du quai (gros appareil, anneaux, échelle, escalier
 *      d'eau, ducs-d'albe), bateaux amarrés le long du quai (mâts, haubans, voiles ferlées, fanal de poupe) ;
 *   2. la rue jouable : pavés mouillés (reflets analytiques des lanternes), bornes, lampadaires, étal (point focal) ;
 *   3. les façades : variées et détaillées par la géométrie (colombages en relief, encorbellements, fenêtres à
 *      encadrement, appui, meneau et volets, portes cintrées à claveaux, chaînages d'angle, soubassements, vitrine et
 *      auvent, balcon du Fanal, enseignes suspendues sans texte, potence de levage, lucarnes, cheminées, bordures de toit) ;
 *   4. un second rang de toits, puis la ville haute sur sa colline (fenêtres rares, cathédrale) noyée dans la brume, le ciel.
 * DA de Cité du Tournoi (RPG-ArtByCode, commit 7eba83b, lecture seule) : nuit indigo / ardoise, pierre froide, ambre
 * seul accent chaud, ivoire désaturé, accessoires aux points focaux ; techniques adaptées (source notée sur place) :
 * grammaire de façade (`src/architecture/FacadeGrammar.ts`, `BuildingGenerator.ts`, `RoofGenerator.ts`), occlusion par
 * sommet, reflets « lightMirror », couches de la ville lointaine (`src/district/DistantCity.ts`). Pas sa caméra.
 * Géométries statiques fusionnées par matière (un appel de dessin par matière), graine d'art, aucune image externe.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { FAMILIES } from '../game/catalog/cards';
import { hashString, makeRng } from '../game/engine/rng';
import { bannerTexture } from '../scene/venues/common';
import { LAMP_WARM, U, canvasCloth, surface, waterMaterial } from './materiaux';
import {
  SIGN_CELLS, ashlarRelief, cobbleRelief, farFacadeTexture, glassUV, glyphAtlas, glyphUV, mistTexture, planksRelief, plasterRelief, shopInterior,
  signAtlas, signUV, slateRelief, stainedGlassAtlas, tavernInterior, timberRelief, windowAtlas, windowUV, type WindowCell,
} from './quaiMateriaux';
import { BOLLARDS, FACADES, FACADE_Z, LAMPS, PROPS, QUAY_Z, STALL, WATER_Y, type Facade } from './quai';
import { finish, gableRoof, type LightDef, type QuaiScene } from './scene';

const FZ = FACADE_Z;

/**
 * Direction D (ADR 026, décision du responsable du 2026-10-19) : les quatre familles donnent leur couleur aux lumières du
 * décor (valeurs linéaires) ; l'ambre n'est plus le seul accent chaud. Cendre : braises du Fanal et du chantier ;
 * Voile : bleu argenté (l'armateur, le passage vers les Ruelles, la ville haute) ; Ronce : vert de l'étal ;
 * Astre : or des lampadaires du quai et de la salle de jeu.
 */
const FAM = {
  Cendre: new THREE.Color(1.0, 0.4, 0.12),
  Voile: new THREE.Color(0.42, 0.6, 1.0),
  Ronce: new THREE.Color(0.36, 0.95, 0.34),
  Astre: new THREE.Color(1.0, 0.72, 0.3),
} as const;
const DEPTH = 7;
/** Face du mur du quai (le pavé s'arrête à la margelle). */
const WALL_Z = QUAY_Z + 0.5;

type AO = number | ((p: THREE.Vector3) => number);

/**
 * Fusion par matière, avec une occlusion par sommet (`ao`, lue par les matières `vertexAO`) : creux sous les avant-toits,
 * pied du mur du quai, revers des encadrements ; elle sert aussi de variation de ton bon marché (dalles, pavés de rive).
 * Technique de Cité du Tournoi (occlusion stockée par sommet, `FacadeGrammar.ts` L. 51-69).
 */
class Batch {
  private parts = new Map<THREE.Material, THREE.BufferGeometry[]>();
  private readonly v = new THREE.Vector3();
  add(geo: THREE.BufferGeometry, mat: THREE.Material, m?: THREE.Matrix4, ao: AO = 1): void {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (m) g.applyMatrix4(m);
    if (!g.attributes.normal) g.computeVertexNormals();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    const n = g.attributes.position!.count;
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n * 2), 2));
    const a = new Float32Array(n);
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < n; i++) a[i] = typeof ao === 'number' ? ao : ao(this.v.fromBufferAttribute(pos, i));
    g.setAttribute('ao', new THREE.Float32BufferAttribute(a, 1));
    (this.parts.get(mat) ?? this.parts.set(mat, []).get(mat)!).push(g);
  }
  build(into: THREE.Object3D): number {
    let n = 0;
    for (const [mat, geos] of this.parts) {
      const merged = mergeGeometries(geos, false);
      for (const g of geos) g.dispose();
      if (!merged) continue;
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, mat);
      mesh.matrixAutoUpdate = false;
      into.add(mesh);
      n++;
    }
    this.parts.clear();
    return n;
  }
}

const Q = new THREE.Quaternion();
const E = new THREE.Euler();
const S1 = new THREE.Vector3(1, 1, 1);
/** Matrice : translation, rotations (x, y, z), échelle. */
const M = (x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), Q.setFromEuler(E.set(rx, ry, rz)), sx === 1 && sy === 1 && sz === 1 ? S1 : new THREE.Vector3(sx, sy, sz));

/** Boîte dont les UV suivent les mètres (une répétition de texture tous les `tile` mètres). */
function box(w: number, h: number, d: number, tile = 1): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  const pos = g.attributes.position as THREE.BufferAttribute;
  const nor = g.attributes.normal as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) {
    const nx = Math.abs(nor.getX(i));
    const ny = Math.abs(nor.getY(i));
    if (ny > 0.5) uv.setXY(i, pos.getX(i) / tile, pos.getZ(i) / tile);
    else if (nx > 0.5) uv.setXY(i, pos.getZ(i) / tile, pos.getY(i) / tile);
    else uv.setXY(i, pos.getX(i) / tile, pos.getY(i) / tile);
  }
  return g;
}
/** Pièce de bois (UV le long de la pièce, une pièce de la texture de colombage en travers). */
function beamGeo(len: number, t: number, d: number): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(len, t, d);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * len / 1.6, uv.getY(i) * 0.24);
  return g;
}
const plane = (w: number, h: number) => new THREE.PlaneGeometry(w, h);

interface Spec {
  /** Hauteur à l'égout et du rez-de-chaussée (m). */
  eave: number;
  ground: number;
  upper: 'colombage' | 'pierre' | 'enduit';
  /** Encorbellement des étages sur la rue (m). */
  jetty: number;
  roof: 'x' | 'z';
  roofH: number;
  tint: number;
  litChance: number;
  dormers: number;
  quoins?: boolean;
  /** Porte cintrée à claveaux (sinon linteau de bois). */
  arch?: boolean;
  sign?: { cell: number; x: number };
  /** Vitrine au rez-de-chaussée (centre x) et son auvent. */
  shop?: { x: number; awning: 'ivoire' | 'ardoise' };
  balcony?: boolean;
  hoist?: boolean;
  /** Fanion de famille sur hampe (couleur de la voie). */
  pennant?: { x: number; fam: number };
}

/**
 * Façades du Quai, une par identifiant du plan pur : hauteurs alternées pour la ligne des toits (les plus basses laissent
 * voir la ville haute), une matière d'enduit par maison dans la bande froide. Rez-de-chaussée 3 m, étages ≈ 2,55 m
 * (`BuildingGenerator.ts` L. 74-88) ; personnages de 1,95 m (proportions « chibi », plus grands que l'échelle réelle).
 */
const SPECS: Record<string, Spec> = {
  chantier: { eave: 5.6, ground: 3.0, upper: 'colombage', jetty: 0, roof: 'x', roofH: 2.8, tint: 0x8e98b0, litChance: 0.4, dormers: 2, quoins: true, arch: true, hoist: true, sign: { cell: SIGN_CELLS.poulie, x: -12.4 } },
  salle: { eave: 6.9, ground: 3.4, upper: 'pierre', jetty: 0, roof: 'x', roofH: 2.2, tint: 0xa8b0c4, litChance: 0.7, dormers: 0, quoins: true, arch: true },
  etroite: { eave: 5.5, ground: 3.0, upper: 'colombage', jetty: 0.38, roof: 'z', roofH: 3.0, tint: 0xa9a49e, litChance: 0.55, dormers: 0, shop: { x: -1.45, awning: 'ivoire' } },
  fanal: { eave: 5.8, ground: 3.0, upper: 'colombage', jetty: 0.3, roof: 'x', roofH: 2.6, tint: 0x9aa0b0, litChance: 0.85, dormers: 2, balcony: true, sign: { cell: SIGN_CELLS.lanterne, x: 9.9 }, pennant: { x: 4.2, fam: 0 } },
  armateur: { eave: 8.1, ground: 3.2, upper: 'enduit', jetty: 0, roof: 'x', roofH: 2.3, tint: 0x8892ac, litChance: 0.45, dormers: 2, quoins: true, sign: { cell: SIGN_CELLS.ancre, x: 13.0 }, shop: { x: 18.1, awning: 'ardoise' }, pennant: { x: 17.0, fam: 1 } },
};

export function buildQuai(artSeed: number): QuaiScene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x04060c);
  const rng = makeRng(hashString(`ville|quai-v3|${artSeed}`));
  const textures: THREE.Texture[] = [];
  const T = <X extends THREE.Texture>(t: X) => { textures.push(t); return t; };
  const lights: LightDef[] = [];
  const halos: { p: THREE.Vector3; size: number; k: number; color?: THREE.Color }[] = [];
  const batch = new Batch();

  // --- matières (un programme de surface partagé ; variantes VAO et MIRROR) ---
  const stoneTex = T(ashlarRelief(artSeed));
  const winAtlas = T(windowAtlas(artSeed));
  const clothTex = T(canvasCloth(artSeed));
  const m = {
    cobble: surface({ map: T(cobbleRelief(artSeed)), tile: [1, 1], wet: 0.9, spec: 0.22, shin: 36, contact: 0, breakup: 0.35, mirror: true, vertexAO: true, illu: true }),
    stone: surface({ map: stoneTex, tint: 0xa6aec2, spec: 0.16, shin: 18, contact: 1, breakup: 0.35, vertexAO: true, illu: true }),
    stoneLight: surface({ map: stoneTex, tint: 0xc4c8d4, spec: 0.16, shin: 18, contact: 0.6, breakup: 0.25, vertexAO: true, illu: true }),
    stoneDark: surface({ map: T(ashlarRelief(artSeed + 1, { rows: 4, pal: [[92, 98, 110], [80, 86, 98], [100, 102, 110], [86, 90, 100]], mortar: [36, 38, 46] })), spec: 0.32, shin: 30, contact: 0, breakup: 0.45, wet: 0.5, vertexAO: true, illu: true }),
    timber: surface({ map: T(timberRelief(artSeed)), tint: 0x9a908c, spec: 0.08, shin: 14, contact: 0.4, breakup: 0.25, vertexAO: true, illu: true }),
    planks: surface({ map: T(planksRelief(artSeed)), tint: 0xa49c96, spec: 0.1, shin: 16, contact: 0.5, breakup: 0.3, vertexAO: true, illu: true }),
    shutter: surface({ map: T(planksRelief(artSeed + 3, [70, 82, 98])), spec: 0.08, contact: 0.2, breakup: 0.25, vertexAO: true, illu: true }),
    slate: surface({ map: T(slateRelief(artSeed)), spec: 0.55, shin: 40, contact: 0, breakup: 0.3, wrap: 0.1, vertexAO: true, illu: true }),
    iron: surface({ map: T(planksRelief(artSeed + 9, [40, 44, 54])), tint: 0x6a7080, spec: 0.9, shin: 60, contact: 0, breakup: 0.1 }),
    cloth: surface({ map: clothTex, tint: 0xeee8dc, spec: 0.02, contact: 0, wrap: 0.9, side: THREE.DoubleSide }),
    slateCloth: surface({ map: T(canvasCloth(artSeed + 5)), tint: 0x5a647e, spec: 0.02, contact: 0, wrap: 0.9, side: THREE.DoubleSide }),
    sail: surface({ map: clothTex, tint: 0x8e8a82, spec: 0.02, contact: 0, wrap: 0.4 }),
    winLit: new THREE.MeshBasicMaterial({ map: winAtlas, color: new THREE.Color(1, 1, 1).multiplyScalar(1.9) }),
    winDark: new THREE.MeshBasicMaterial({ map: winAtlas, color: new THREE.Color(0.62, 0.66, 0.78) }),
    shop: new THREE.MeshBasicMaterial({ map: T(shopInterior(artSeed)), color: new THREE.Color(1, 1, 1).multiplyScalar(1.5) }),
    glow: new THREE.MeshBasicMaterial({ map: T(tavernInterior(artSeed)), color: new THREE.Color(1, 1, 1).multiplyScalar(1.1) }),
    lampGlass: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.56, 0.22).multiplyScalar(2.5) }),
    // mur du quai : face tournée vers l'eau, que ni la lune (dans le dos des façades) ni les lanternes n'éclairent ;
    // une faible émission froide le garde lisible (gros appareil, anneaux, barbacanes), comme la référence frontale
    quayWall: surface({ map: T(ashlarRelief(artSeed + 2, { rows: 4, pal: [[104, 110, 124], [92, 98, 112], [112, 114, 122], [98, 102, 114]], mortar: [40, 42, 52] })), tint: 0xb4bccc, spec: 0.35, shin: 30, contact: 0, breakup: 0.45, wet: 0.4, emissive: 0.07, vertexAO: true, illu: true }),
    dark: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.01, 0.012, 0.02) }),
    sign: surface({ map: T(signAtlas()), spec: 0.2, shin: 30, contact: 0, emissive: 0.1, wrap: 0.6, side: THREE.DoubleSide }),
    // dorures (tringles, bagues et pommeaux, médaillons) : reflets francs sous les lanternes
    gold: surface({ map: T(planksRelief(artSeed + 13, [150, 118, 52])), tint: 0xffe0a0, spec: 1.4, shin: 70, contact: 0, breakup: 0.1, emissive: 0.05 }),
    glass: new THREE.MeshBasicMaterial({ map: T(stainedGlassAtlas(artSeed)), color: new THREE.Color(1, 1, 1).multiplyScalar(1.5) }),
    glyph: new THREE.MeshBasicMaterial({ map: T(glyphAtlas()), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color(1, 1, 1).multiplyScalar(1.3) }),
  };
  const glassOf = new Map<number, THREE.MeshBasicMaterial>();
  /** Verre de lanterne dans la couleur de sa lumière (une matière par couleur). */
  const lampGlassOf = (c: THREE.Color) => glassOf.get(c.getHex()) ?? glassOf.set(c.getHex(), new THREE.MeshBasicMaterial({ color: c.clone().multiplyScalar(2.5) })).get(c.getHex())!;
  const plaster = new Map<number, THREE.ShaderMaterial>();
  const plasterTex = T(plasterRelief(artSeed));
  const plasterOf = (tint: number) => plaster.get(tint) ?? plaster.set(tint, surface({ map: plasterTex, tint, spec: 0.05, contact: 0.6, breakup: 0.3, vertexAO: true, illu: true, tile: [1 / 2.4, 1 / 2.4] })).get(tint)!;

  // --- la rue : pavés mouillés ; dalles de rive (margelle) ; mur du quai ---
  {
    const W = 64;
    const D = QUAY_Z - FZ + 0.6;
    const g = new THREE.PlaneGeometry(W, D, 32, 4);
    g.rotateX(-Math.PI / 2);
    const uv = g.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * W / 3.0, uv.getY(i) * D / 3.0);
    // pied des façades plus sombre (eau, crasse), rive du quai usée et claire
    batch.add(g, m.cobble, M(0, 0, (QUAY_Z + FZ) / 2 - 0.3), (p) => 0.72 + 0.28 * THREE.MathUtils.smoothstep(p.z, FZ, FZ + 1.4));
  }
  for (let x = -32; x < 32;) {
    const len = 1.15 + rng() * 0.35;
    const tone = 0.86 + rng() * 0.14;
    batch.add(box(len - 0.02, 0.14, 0.62, 1.6), m.stoneLight, M(x + len / 2, 0.06, QUAY_Z + 0.2), tone);
    x += len;
  }
  {
    const h = -WATER_Y + 0.5;
    const g = box(64, h, 0.4, 3);
    batch.add(g, m.quayWall, M(0, -h / 2 + 0.0, WALL_Z - 0.2), (p) => 0.35 + 0.65 * THREE.MathUtils.smoothstep(p.y, WATER_Y - 0.3, 0.0));
  }
  quayEdge();

  // --- façades ---
  for (const f of FACADES) facade(f, SPECS[f.id]!);
  // ruelles entre deux façades : fond sombre en retrait (le ciel ne passe pas par la fente)
  for (let i = 0; i + 1 < FACADES.length; i++) {
    const a = FACADES[i]!;
    const b = FACADES[i + 1]!;
    const w = b.x0 - a.x1;
    if (w <= 0.05) continue;
    const h = Math.min(SPECS[a.id]!.eave, SPECS[b.id]!.eave) + 1.2;
    batch.add(box(w + 0.2, h, 0.4, 3), m.stoneDark, M((a.x1 + b.x0) / 2, h / 2, FZ - 2.6), 0.35);
    batch.add(box(w, 0.04, 2.6, 1), m.stoneDark, M((a.x1 + b.x0) / 2, 0.01, FZ - 1.3), 0.4);
  }
  // au-delà des maisons d'extrémité : à l'ouest le passage voûté vers les Ruelles, à l'est l'entrepôt et la rampe
  endBlocks();
  secondRow();
  hillCity();

  // --- lampadaires, guirlande, bornes ---
  for (const l of LAMPS) lampPost(l.x, l.z);
  garland();
  for (const b of BOLLARDS) {
    batch.add(new THREE.CylinderGeometry(0.17, 0.22, 0.56, 12), m.stoneDark, M(b.x, 0.28, b.z), 0.85);
    batch.add(new THREE.CylinderGeometry(0.24, 0.2, 0.09, 12), m.stoneDark, M(b.x, 0.6, b.z), 1);
    batch.add(new THREE.TorusGeometry(0.2, 0.025, 6, 16), m.iron, M(b.x, 0.36, b.z, Math.PI / 2));
  }
  stall();
  props();
  boats();
  const mist = mists();
  const motes = dustMotes();

  const base = finish(scene, batch, lights, halos, textures);
  // Lune basse au-dessus de la ville haute, dans la bande de ciel du cadrage (point focal lointain, contre-jour des
  // façades conservé : elle reste derrière elles). Réglage propre au Quai, rendu à la sortie de l'îlot.
  const moonWas = U.uMoonDir.value.clone();
  U.uMoonDir.value.set(0.33, 0.18, -0.93).normalize();
  const fx = { ...base };
  fx.dispose = () => { base.dispose(); U.uMoonDir.value.copy(moonWas); };
  fx.update = (time: number) => { base.update(time); for (const mm of mist) mm.uniforms.uT!.value = time; motes.uniforms.uT!.value = time; };
  fx.stats = () => ({ ...base.stats(), meshes: base.stats().meshes + mist.length + 1 });
  return fx;

  // ======================================================================================================== façade

  function facade(f: Facade, s: Spec): void {
    const w = f.x1 - f.x0;
    const cx = (f.x0 + f.x1) / 2;
    const r = makeRng(hashString(`ville|v3|facade|${f.id}|${artSeed}`));
    const up = s.upper === 'pierre' ? m.stone : plasterOf(s.tint);
    const zU = FZ + s.jetty;
    const eaveAO = (p: THREE.Vector3) => 1 - 0.38 * THREE.MathUtils.smoothstep(p.y, s.eave - 0.9, s.eave);
    // corps : rez-de-chaussée de pierre, étages (avancés de l'encorbellement)
    batch.add(box(w, s.ground, DEPTH, 3), m.stone, M(cx, s.ground / 2, FZ - DEPTH / 2), 1);
    batch.add(box(w, s.eave - s.ground, DEPTH, s.upper === 'pierre' ? 3 : 2.4), up, M(cx, (s.ground + s.eave) / 2, zU - DEPTH / 2), eaveAO);
    // soubassement plus sombre et cordon entre les niveaux
    batch.add(box(w + 0.02, 0.85, 0.1, 1.5), m.stoneDark, M(cx, 0.42, FZ + 0.04), (p) => 0.6 + 0.4 * (p.y / 0.85));
    batch.add(box(w + 0.04, 0.09, 0.16, 1.5), m.stoneLight, M(cx, 0.88, FZ + 0.06), 0.95);
    if (s.jetty > 0) jetty(f, s, cx, w);
    else batch.add(box(w + 0.1, 0.18, 0.24, 2), m.stoneLight, M(cx, s.ground, FZ + 0.08), 0.9);
    if (s.quoins) quoins(f, s);
    // rez-de-chaussée : porte, vitrine, fenêtres basses
    // Portes à l'échelle des personnages de 2,2 m (proportions « chibi ») : 2,65 m, la salle et le chantier plus haut.
    const doorW = f.id === 'chantier' ? 2.3 : f.id === 'salle' ? 1.9 : 1.3;
    const doorH = f.id === 'chantier' ? 2.85 : f.id === 'salle' ? 3.05 : 2.65;
    if (f.door !== null) door(f, s, f.door, doorW, doorH);
    if (s.shop) shopfront(s.shop.x, s.shop.awning);
    const groundBays = Math.max(2, Math.round(w / 1.9));
    for (let k = 0; k < groundBays; k++) {
      const x = f.x0 + (w / groundBays) * (k + 0.5);
      if (f.door !== null && Math.abs(x - f.door) < doorW / 2 + 0.75) continue;
      if (s.shop && Math.abs(x - s.shop.x) < 1.5) continue;
      if (f.id === 'salle') { archedWindow(x, 1.75, 0.95, 1.75, Math.min(3, Math.floor(((x - f.x0) / w) * 4))); continue; }
      const lit = r() < s.litChance * 0.6;
      windowUnit(x, 1.75, 0.85, 1.0, FZ, lit ? (r() < 0.5 ? 'leaded' : 'warm') : r() < 0.5 ? 'slit' : 'dark', 'stone', !lit && r() < 0.3);
    }
    // étages
    const floors = s.upper === 'pierre' ? 1 : Math.max(1, Math.round((s.eave - s.ground) / 2.5));
    const fh = (s.eave - s.ground) / floors;
    const bays = Math.max(2, Math.round(w / 1.95));
    // Ouverture particulière du premier étage (porte-fenêtre du balcon, porte de chargement), centrée sur la porte :
    // les travées qu'elle recouvre n'ont ni fenêtre ni pièces de fenêtre, et le poteau entre elles disparaît.
    const special = (s.balcony || s.hoist) && f.door !== null ? f.door : null;
    const skip = (k: number, fl: number) => special !== null && fl === 0 && Math.abs(f.x0 + (w / bays) * (k + 0.5) - special) < 1.25;
    if (s.upper === 'colombage') {
      for (let fl = 0; fl < floors; fl++) halfTimber(f, s, s.ground + fl * fh, s.ground + (fl + 1) * fh, bays, r, (k) => skip(k, fl));
    }
    if (special !== null && s.balcony) balconyDoor(special, s.ground + fh * 0.52, zU);
    if (special !== null && s.hoist) loadingDoor(special, s.ground + 0.25, zU);
    for (let fl = 0; fl < floors; fl++) {
      const y = s.ground + fl * fh + fh * 0.52;
      for (let k = 0; k < bays; k++) {
        const x = f.x0 + (w / bays) * (k + 0.5);
        if (f.id === 'salle' || skip(k, fl)) continue;
        const lit = r() < s.litChance;
        const cell: WindowCell = lit ? (['warm', 'curtain', 'leaded', 'dim', 'candle'] as const)[Math.floor(r() * 5)]! : r() < 0.25 ? 'slit' : r() < 0.5 ? 'darkLeaded' : 'dark';
        windowUnit(x, y, 0.8, Math.min(1.25, fh * 0.52), zU, cell, s.upper === 'colombage' ? 'bois' : 'stone', r() < 0.45);
      }
    }
    if (f.id === 'salle') salle(f, s, cx, w);
    // pignon sur rue (faîtage perpendiculaire) ou toit long (faîtage parallèle à la rue)
    roof(f, s, cx, w, zU, r);
    if (s.sign) hangingSign(s.sign.x, s.ground + 0.25, FZ, s.sign.cell);
    if (s.balcony) balcony(f.door!, s.ground, zU);
    if (s.hoist) hoist(f.door!, s.eave, zU);
    if (s.pennant) pennant(s.pennant.x, s.eave - 0.6, zU, s.pennant.fam);
    // lanternes murales aux portes (points focaux)
    if (f.id === 'chantier') wallLantern(f.door! + 1.75, 2.75, FZ, true, FAM.Cendre);
    if (f.id === 'armateur') wallLantern(f.door! + 1.05, 2.55, FZ, true, FAM.Voile);
  }

  /** Encorbellement : solives en about sous l'étage, sous-face sombre, sablière (d'après `BuildingGenerator.ts` L. 265-285). */
  function jetty(f: Facade, s: Spec, cx: number, w: number): void {
    batch.add(beamGeo(w + 0.05, 0.24, 0.16), m.timber, M(cx, s.ground + 0.12, FZ + s.jetty + 0.02), 0.85);
    for (let x = f.x0 + 0.25; x < f.x1 - 0.1; x += 0.55) batch.add(box(0.1, 0.17, s.jetty + 0.12, 1), m.timber, M(x, s.ground - 0.08, FZ + (s.jetty + 0.12) / 2), 0.7);
    batch.add(box(w, 0.02, s.jetty, 1), m.dark, M(cx, s.ground - 0.17, FZ + s.jetty / 2), 1);
    // deux consoles en quart de cercle aux extrémités
    for (const sx of [f.x0 + 0.22, f.x1 - 0.22]) batch.add(beamGeo(0.62, 0.12, 0.12), m.timber, M(sx, s.ground - 0.45, FZ + s.jetty * 0.55, Math.PI / 4.2, 0, Math.PI / 2), 0.7);
  }

  /** Chaînage d'angle : blocs alternés 0,46 / 0,26 m (`BuildingGenerator.ts` L. 291-302). */
  function quoins(f: Facade, s: Spec): void {
    const top = s.upper === 'colombage' ? s.ground : s.eave - 0.1;
    let i = 0;
    for (let y = 0.95; y + 0.3 < top; y += 0.36, i++) {
      const bw = i % 2 ? 0.26 : 0.46;
      const tone = 0.88 + ((i * 37) % 10) / 80;
      for (const [x, sx] of [[f.x0, 1], [f.x1, -1]] as const) batch.add(box(bw, 0.32, 0.12, 1), m.stoneLight, M(x + (sx * bw) / 2, y + 0.16, FZ + (y > s.ground ? s.jetty : 0) + 0.05), tone);
    }
  }

  /** Pans de bois en relief : sablières, poteaux, potelets, écharpes en croix (`FacadeGrammar.ts` L. 312-328). */
  function halfTimber(f: Facade, s: Spec, y0: number, y1: number, bays: number, r: () => number, skip: (k: number) => boolean): void {
    const z = FZ + s.jetty + 0.03;
    const w = f.x1 - f.x0;
    const cx = (f.x0 + f.x1) / 2;
    batch.add(beamGeo(w, 0.2, 0.14), m.timber, M(cx, y0 + 0.1, z), 0.85);
    batch.add(beamGeo(w, 0.16, 0.14), m.timber, M(cx, y1 - 0.08, z), 0.75);
    const bw = w / bays;
    for (let k = 0; k <= bays; k++) {
      if (k > 0 && k < bays && skip(k - 1) && skip(k)) continue;
      const x = f.x0 + k * bw;
      const t = k === 0 || k === bays ? 0.22 : 0.15;
      batch.add(beamGeo(y1 - y0, t, 0.14), m.timber, M(Math.min(f.x1 - t / 2, Math.max(f.x0 + t / 2, x)), (y0 + y1) / 2, z, 0, 0, Math.PI / 2), 0.85);
    }
    // dans chaque travée : appui et linteau de la fenêtre, potelets, écharpes dans les allèges
    const wy = y0 + (y1 - y0) * 0.52;
    const wh = Math.min(1.25, (y1 - y0) * 0.52);
    for (let k = 0; k < bays; k++) {
      if (skip(k)) continue;
      const x0 = f.x0 + k * bw;
      const xc = x0 + bw / 2;
      batch.add(beamGeo(bw, 0.1, 0.12), m.timber, M(xc, wy - wh / 2 - 0.16, z - 0.01), 0.85);
      batch.add(beamGeo(bw, 0.1, 0.12), m.timber, M(xc, wy + wh / 2 + 0.14, z - 0.01), 0.85);
      // écharpes en croix de Saint-André sous l'appui (allège), une travée sur deux, ou en V
      const ay0 = y0 + 0.2;
      const ay1 = wy - wh / 2 - 0.21;
      if (ay1 - ay0 > 0.25) {
        const cross = r() < 0.55;
        const dx = bw / 2 - 0.1;
        const diag = (xa: number, ya: number, xb: number, yb: number) => {
          const len = Math.hypot(xb - xa, yb - ya);
          batch.add(beamGeo(len, 0.1, 0.1), m.timber, M((xa + xb) / 2, (ya + yb) / 2, z - 0.015, 0, 0, Math.atan2(yb - ya, xb - xa)), 0.8);
        };
        if (cross) { diag(xc - dx, ay0, xc + dx, ay1); diag(xc - dx, ay1, xc + dx, ay0); } else { diag(xc - dx, ay0, xc, ay1); diag(xc, ay1, xc + dx, ay0); }
      }
    }
  }

  /**
   * Fenêtre : vitre (case de l'atlas), encadrement en saillie (le mur paraît creusé), appui saillant, linteau, meneau
   * et traverse, volets ouverts rabattus contre le mur (d'après `FacadeGrammar.ts` L. 88-138).
   */
  function windowUnit(x: number, y: number, w: number, h: number, zs: number, cell: WindowCell, frame: 'bois' | 'stone', shutters: boolean): void {
    const lit = cell === 'warm' || cell === 'dim' || cell === 'curtain' || cell === 'candle' || cell === 'leaded' || cell === 'slit';
    batch.add(windowUV(plane(w, h), cell), lit ? m.winLit : m.winDark, M(x, y, zs + 0.012));
    const fm = frame === 'bois' ? m.timber : m.stoneLight;
    const c = frame === 'bois' ? 0.07 : 0.11;
    batch.add(box(w + 2 * c, c, 0.12, 1), fm, M(x, y + h / 2 + c / 2, zs + 0.06), 0.75);
    batch.add(box(c, h, 0.12, 1), fm, M(x - w / 2 - c / 2, y, zs + 0.06), 0.8);
    batch.add(box(c, h, 0.12, 1), fm, M(x + w / 2 + c / 2, y, zs + 0.06), 0.8);
    // appui saillant et larmier
    batch.add(box(w + 2 * c + 0.12, 0.08, 0.2, 1), m.stoneLight, M(x, y - h / 2 - 0.04, zs + 0.1), 0.95);
    // meneau et traverse (bois sombre)
    if (w > 0.55) batch.add(box(0.045, h, 0.04, 1), m.timber, M(x, y, zs + 0.03), 0.7);
    if (h > 0.8) batch.add(box(w, 0.045, 0.04, 1), m.timber, M(x, y + h * 0.04, zs + 0.03), 0.7);
    if (shutters) {
      for (const sx of [-1, 1]) {
        const g = box(w / 2, h + 0.04, 0.04, 0.9);
        batch.add(g, m.shutter, M(x + sx * (w / 2 + c + w / 4 + 0.02), y, zs + 0.04), 0.9);
        // barres et écharpe du volet
        for (const yy of [0.32, -0.32]) batch.add(box(w / 2 - 0.04, 0.05, 0.03, 1), m.shutter, M(x + sx * (w / 2 + c + w / 4 + 0.02), y + yy * h, zs + 0.065), 0.7);
      }
    }
  }

  /** Fenêtre haute cintrée de la salle de jeu : vitrail de la famille dont la bannière est au-dessus (direction D),
   *  encadrement de pierre et clé. */
  function archedWindow(x: number, y: number, w: number, h: number, fam: number): void {
    const zs = FZ;
    // un seul vitrail : la partie droite et le cintre se partagent la case (UV en hauteur)
    const rect = plane(w, h - w / 2);
    const ru = rect.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < ru.count; i++) ru.setY(i, ru.getY(i) * ((h - w / 2) / h));
    batch.add(glassUV(rect, fam), m.glass, M(x, y - w / 4, zs + 0.012));
    const half = new THREE.CircleGeometry(w / 2, 14, 0, Math.PI);
    const hu = half.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < hu.count; i++) hu.setY(i, (h - w / 2) / h + (hu.getY(i) - 0.5) * 2 * (w / 2 / h));
    batch.add(glassUV(half, fam), m.glass, M(x, y + h / 2 - w / 2, zs + 0.012));
    halos.push({ p: new THREE.Vector3(x, y, zs + 0.1), size: 1.6, k: 0.16, color: FAM[FAMILIES[fam]!] });
    archStones(x, y + h / 2 - w / 2, w / 2, 0.16, zs, 9);
    for (const sx of [-1, 1]) batch.add(box(0.16, h - w / 2, 0.14, 1), m.stoneLight, M(x + sx * (w / 2 + 0.08), y - w / 4, zs + 0.07), 0.85);
    batch.add(box(w + 0.42, 0.1, 0.22, 1), m.stoneLight, M(x, y - h / 2 - 0.05, zs + 0.1), 0.95);
  }

  /** Claveaux d'un arc en plein cintre (centre, rayon intérieur, épaisseur). */
  function archStones(x: number, y: number, r0: number, t: number, zs: number, n: number): void {
    for (let i = 0; i < n; i++) {
      const a = Math.PI * ((i + 0.5) / n);
      const rr = r0 + t / 2;
      const key = i === (n - 1) / 2;
      batch.add(box(t * (key ? 1.25 : 1), (Math.PI * rr) / n - 0.025, 0.16, 1), m.stoneLight, M(x + Math.cos(a) * rr, y + Math.sin(a) * rr, zs + 0.08 + (key ? 0.02 : 0), 0, 0, a), 0.82 + (i % 2) * 0.1);
    }
  }

  function door(f: Facade, s: Spec, x: number, dw: number, dh: number): void {
    const zs = FZ;
    if (f.id === 'fanal') {
      // porte ouverte : lumière chaude de la salle commune ; vantail rabattu, encadrement de bois
      batch.add(plane(dw, dh), m.glow, M(x, dh / 2, zs + 0.01));
      batch.add(box(0.55, dh, 0.06, 0.9), m.planks, M(x - dw / 2 - 0.02, dh / 2, zs + 0.3, 0, -1.15), 0.9);
      lights.push({ x, y: 1.5, z: zs + 0.9, intensity: 2.6, radius: 7, halo: 0, flicker: 'candle', color: new THREE.Color(1.0, 0.5, 0.2) });
    } else if (s.arch) {
      // vantaux de planches sous un arc à claveaux ; pentures de fer
      const rect = dh - dw / 2;
      batch.add(box(dw, rect, 0.06, 0.9), m.planks, M(x, rect / 2, zs + 0.02), 0.75);
      if (f.id === 'salle') {
        // tympan en rose de vitrail à quatre quartiers : les quatre familles au-dessus de la porte du Tournoi
        batch.add(glassUV(new THREE.CircleGeometry(dw / 2, 24, 0, Math.PI), 4), m.glass, M(x, rect, zs + 0.05));
        batch.add(box(dw + 0.04, 0.07, 0.08, 1), m.gold, M(x, rect + 0.02, zs + 0.08));
        halos.push({ p: new THREE.Vector3(x, rect + dw * 0.22, zs + 0.12), size: 2.0, k: 0.2, color: FAM.Astre });
      } else batch.add(new THREE.CircleGeometry(dw / 2, 18, 0, Math.PI), m.planks, M(x, rect, zs + 0.05), 0.7);
      archStones(x, rect, dw / 2, f.id === 'salle' ? 0.26 : 0.22, zs, f.id === 'salle' ? 11 : 9);
      for (const sx of [-1, 1]) batch.add(box(0.22, rect, 0.2, 1), m.stoneLight, M(x + sx * (dw / 2 + 0.11), rect / 2, zs + 0.1), 0.85);
      for (const yy of [0.22, 0.7]) batch.add(box(dw * 0.9, 0.06, 0.03, 1), m.iron, M(x, rect * yy, zs + 0.07));
      if (dw > 1.6) batch.add(box(0.05, rect, 0.04, 1), m.timber, M(x, rect / 2, zs + 0.06), 0.6);
    } else {
      batch.add(box(dw, dh, 0.06, 0.9), m.planks, M(x, dh / 2, zs + 0.02), 0.75);
      batch.add(beamGeo(dw + 0.5, 0.22, 0.18), m.timber, M(x, dh + 0.11, zs + 0.09), 0.85);
      for (const sx of [-1, 1]) batch.add(box(0.16, dh, 0.18, 1), m.stoneLight, M(x + sx * (dw / 2 + 0.08), dh / 2, zs + 0.09), 0.85);
      for (const yy of [0.22, 0.72]) batch.add(box(dw * 0.85, 0.05, 0.03, 1), m.iron, M(x, dh * yy, zs + 0.065));
      // judas vitré allumé
      batch.add(windowUV(plane(0.28, 0.36), 'warm'), m.winLit, M(x, dh * 0.74, zs + 0.055));
    }
    // seuil et marche
    batch.add(box(dw + 0.6, 0.13, 0.5, 1), m.stoneLight, M(x, 0.065, zs + 0.25), 0.9);
  }

  /** Vitrine d'échoppe : intérieur éclairé, cadre de bois, comptoir, auvent de toile (`FacadeGrammar.ts` L. 177-241). */
  function shopfront(x: number, awning: 'ivoire' | 'ardoise'): void {
    const zs = FZ;
    const w = 1.6;
    const h = 1.55;
    const y = 1.55;
    batch.add(plane(w, h), m.shop, M(x, y, zs + 0.01));
    batch.add(beamGeo(w + 0.4, 0.26, 0.2), m.timber, M(x, y + h / 2 + 0.13, zs + 0.1), 0.8);
    for (const sx of [-1, 1]) batch.add(beamGeo(h + 0.78, 0.17, 0.18), m.timber, M(x + sx * (w / 2 + 0.085), (y + h / 2) / 2 + 0.02, zs + 0.09, 0, 0, Math.PI / 2), 0.8);
    batch.add(box(w, 0.07, 0.36, 1), m.planks, M(x, y - h / 2 - 0.03, zs + 0.18), 0.95);
    batch.add(box(w, y - h / 2, 0.12, 1), m.planks, M(x, (y - h / 2) / 2, zs + 0.06), 0.7);
    // auvent : bandes de toile tendues du mur vers la rue, creux, lambrequin festonné ; tons de la même teinte
    const aw = w + 0.6;
    const g = new THREE.PlaneGeometry(aw, 1.05, 8, 4);
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const u = p.getX(i) / aw + 0.5;
      const v = p.getY(i) / 1.05 + 0.5; // 1 au mur
      p.setXYZ(i, p.getX(i), 2.42 + v * 0.48 - 0.05 * Math.sin(Math.PI * v) * Math.sin(Math.PI * u), (1 - v) * 1.0);
    }
    g.computeVertexNormals();
    const mat = awning === 'ivoire' ? m.cloth : m.slateCloth;
    batch.add(g, mat, M(x, 0, zs + 0.02));
    // lambrequin : dents de toile pendantes
    const teeth: number[] = [];
    const n = 9;
    for (let i = 0; i < n; i++) {
      const x0 = -aw / 2 + (aw * i) / n;
      const x1 = x0 + aw / n;
      teeth.push(x0, 2.42, 0, x1, 2.42, 0, (x0 + x1) / 2, 2.25, 0);
    }
    const tg = new THREE.BufferGeometry();
    tg.setAttribute('position', new THREE.Float32BufferAttribute(teeth, 3));
    tg.setAttribute('uv', new THREE.Float32BufferAttribute(teeth.map((_, i) => (i % 3 === 2 ? 0 : teeth[i]! * 0.5)).filter((_, i) => i % 3 !== 2), 2));
    tg.computeVertexNormals();
    batch.add(tg, mat, M(x, 0, zs + 1.04));
    batch.add(box(0.04, 0.04, 1.1, 1), m.iron, M(x - aw / 2, 2.7, zs + 0.55, 0.45, 0, 0));
    batch.add(box(0.04, 0.04, 1.1, 1), m.iron, M(x + aw / 2, 2.7, zs + 0.55, 0.45, 0, 0));
    lights.push({ x, y: 1.6, z: zs + 1.0, intensity: 1.7, radius: 5.5, halo: 0, flicker: 'window', color: new THREE.Color(1.0, 0.64, 0.32) });
  }

  /** Salle de jeu de cartes : quatre bannières des familles, oculi entre elles, corniche, deux lanternes. */
  function salle(f: Facade, s: Spec, cx: number, w: number): void {
    FAMILIES.forEach((fam, k) => {
      const bx = f.x0 + w * ((k + 0.5) / 4);
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 2.15), surface({ map: T(bannerTexture(fam, artSeed)), contact: 0, spec: 0.05, emissive: 0.12, wrap: 0.8 }));
      mesh.position.set(bx, 5.05, FZ + 0.09);
      scene.add(mesh);
      batch.add(box(1.3, 0.06, 0.06, 1), m.gold, M(bx, 6.16, FZ + 0.12));
      for (const sx of [-1, 1]) batch.add(new THREE.SphereGeometry(0.05, 8, 6), m.gold, M(bx + sx * 0.68, 6.16, FZ + 0.12));
    });
    for (let k = 1; k < 4; k++) {
      const x = f.x0 + (w * k) / 4;
      // médaillons dorés entre les bannières
      batch.add(new THREE.CircleGeometry(0.24, 16), m.stoneDark, M(x, 5.9, FZ + 0.012), 0.6);
      batch.add(new THREE.TorusGeometry(0.26, 0.05, 6, 18), m.gold, M(x, 5.9, FZ + 0.05));
      batch.add(new THREE.OctahedronGeometry(0.11, 0), m.gold, M(x, 5.9, FZ + 0.06, 0, 0, Math.PI / 4, 1, 1, 0.4));
    }
    // corniche à deux ressauts sous l'égout
    batch.add(box(w + 0.3, 0.16, 0.34, 2), m.stoneLight, M(cx, s.eave - 0.08, FZ + 0.12), 0.75);
    batch.add(box(w + 0.18, 0.12, 0.22, 2), m.stoneLight, M(cx, s.eave - 0.26, FZ + 0.08), 0.65);
    for (const sx of [-1, 1]) wallLantern(f.door! + sx * 1.6, 2.8, FZ, true, FAM.Astre);
    batch.add(box(w + 0.32, 0.05, 0.36, 2), m.gold, M(cx, s.eave - 0.02, FZ + 0.13));
  }

  function roof(f: Facade, s: Spec, cx: number, w: number, zU: number, r: () => number): void {
    const d = DEPTH;
    const cz = zU - d / 2;
    const over = 0.45;
    const rf = gableRoof(w, d, s.roofH, s.roof, over);
    batch.add(rf.slopes, m.slate, M(cx, s.eave, cz), (p) => 0.62 + 0.38 * THREE.MathUtils.smoothstep(p.y, s.eave - 0.2, s.eave + 0.7));
    batch.add(rf.gables, s.upper === 'pierre' ? m.stone : plasterOf(s.tint), M(cx, s.eave, cz), 0.85);
    if (s.roof === 'x') {
      // planche de rive, abouts de chevrons, faîtière
      batch.add(beamGeo(w + 2 * over, 0.13, 0.06), m.timber, M(cx, s.eave - 0.02, zU + over - 0.02), 0.8);
      for (let x = f.x0 + 0.2; x < f.x1; x += 0.55) batch.add(box(0.08, 0.12, over, 1), m.timber, M(x, s.eave - 0.12, zU + over / 2), 0.55);
      batch.add(box(w + 2 * over, 0.14, 0.22, 1), m.slate, M(cx, s.eave + s.roofH, cz), 0.8);
      for (let k = 0; k < s.dormers; k++) dormer(f.x0 + w * (0.28 + 0.44 * k), s.eave, zU, s.roofH, r() < 0.6);
    } else {
      // pignon sur rue : rives inclinées, poinçon et entrait (pans de bois du pignon), lucarne du grenier
      const half = w / 2 + over;
      const len = Math.hypot(half, s.roofH);
      const a = Math.atan2(s.roofH, half);
      for (const sx of [-1, 1]) batch.add(beamGeo(len, 0.16, 0.08), m.timber, M(cx + (sx * half) / 2, s.eave + s.roofH / 2 - 0.02, zU + over + 0.02, 0, 0, -sx * a), 0.85);
      const gz = zU + 0.03;
      batch.add(beamGeo(w, 0.16, 0.12), m.timber, M(cx, s.eave + s.roofH * 0.38, gz), 0.8);
      batch.add(beamGeo(s.roofH * 0.95, 0.15, 0.12), m.timber, M(cx, s.eave + s.roofH * 0.47, gz, 0, 0, Math.PI / 2), 0.8);
      for (const sx of [-1, 1]) {
        const x0 = cx + sx * 0.12;
        const x1 = cx + sx * (w / 2 - 0.25);
        const y0 = s.eave + s.roofH * 0.9;
        const y1 = s.eave + 0.1;
        batch.add(beamGeo(Math.hypot(x1 - x0, y1 - y0), 0.1, 0.1), m.timber, M((x0 + x1) / 2, (y0 + y1) / 2, gz - 0.005, 0, 0, Math.atan2(y1 - y0, x1 - x0)), 0.8);
      }
      windowUnit(cx, s.eave + s.roofH * 0.2, 0.62, 0.62, zU, r() < 0.7 ? 'candle' : 'dark', 'bois', false);
      batch.add(beamGeo(w, 0.18, 0.14), m.timber, M(cx, s.eave + 0.02, gz), 0.8);
    }
    // cheminées : souche de pierre, chapeau à deux ressauts, conduit sombre (`RoofGenerator.ts` L. 110-124)
    const nCh = w > 7 ? 2 : 1;
    for (let k = 0; k < nCh; k++) {
      const x = f.x0 + w * (nCh === 1 ? 0.7 : 0.22 + 0.56 * k) + (r() - 0.5) * 0.4;
      const zc = s.roof === 'x' ? cz - 1.0 : cz - d * 0.2;
      const yb = s.eave + s.roofH * 0.55;
      batch.add(box(0.62, 1.9, 0.62, 1.5), m.stone, M(x, yb + 0.95, zc), 0.9);
      batch.add(box(0.74, 0.1, 0.74, 1), m.stoneLight, M(x, yb + 1.9, zc), 0.85);
      batch.add(box(0.68, 0.1, 0.68, 1), m.stoneLight, M(x, yb + 2.0, zc), 0.9);
      batch.add(plane(0.4, 0.4), m.dark, M(x, yb + 2.06, zc, -Math.PI / 2));
    }
  }

  function dormer(x: number, eave: number, zU: number, roofH: number, lit: boolean): void {
    const z = zU - 1.25;
    const y = eave + roofH * 0.32;
    batch.add(box(1.05, 1.1, 1.3, 1.5), plasterOf(0x9aa2b6), M(x, y + 0.35, z), 0.85);
    const dr = gableRoof(1.05, 1.3, 0.62, 'z', 0.14);
    batch.add(dr.slopes, m.slate, M(x, y + 0.9, z), 0.85);
    batch.add(dr.gables, plasterOf(0x9aa2b6), M(x, y + 0.9, z), 0.8);
    batch.add(windowUV(plane(0.56, 0.68), lit ? 'warm' : 'dark'), lit ? m.winLit : m.winDark, M(x, y + 0.38, z + 0.66));
    batch.add(box(0.7, 0.06, 0.08, 1), m.timber, M(x, y + 0.75, z + 0.67), 0.8);
    batch.add(box(0.7, 0.06, 0.12, 1), m.timber, M(x, y + 0.02, z + 0.69), 0.9);
  }

  /** Balcon de bois du Fanal au-dessus de sa porte : plancher, consoles, balustres, lisse ; porte-fenêtre allumée. */
  function balcony(x: number, y: number, zU: number): void {
    const w = 2.5;
    const d = 0.75;
    const z = zU + d / 2;
    batch.add(box(w, 0.1, d, 1), m.planks, M(x, y + 0.08, z), 0.8);
    for (const sx of [-1, 1]) batch.add(beamGeo(0.9, 0.1, 0.1), m.timber, M(x + sx * (w / 2 - 0.15), y - 0.25, zU + 0.3, 0, 0, sx > 0 ? -0.75 : 0.75), 0.7);
    for (let bx = x - w / 2 + 0.1; bx <= x + w / 2 - 0.05; bx += 0.21) batch.add(box(0.05, 0.85, 0.05, 1), m.timber, M(bx, y + 0.55, zU + d - 0.04), 0.85);
    batch.add(beamGeo(w + 0.1, 0.09, 0.1), m.timber, M(x, y + 1.0, zU + d - 0.04), 0.9);
    for (const sx of [-1, 1]) batch.add(beamGeo(d, 0.08, 0.08), m.timber, M(x + sx * (w / 2), y + 1.0, zU + d / 2, 0, Math.PI / 2, 0), 0.9);
  }
  function balconyDoor(x: number, y: number, zU: number): void {
    batch.add(windowUV(plane(0.95, 1.85), 'curtain'), m.winLit, M(x, y - 0.25, zU + 0.012));
    batch.add(box(1.15, 0.1, 0.12, 1), m.timber, M(x, y + 0.72, zU + 0.06), 0.8);
    for (const sx of [-1, 1]) batch.add(box(0.1, 1.9, 0.12, 1), m.timber, M(x + sx * 0.52, y - 0.25, zU + 0.06), 0.8);
    batch.add(box(0.04, 1.85, 0.04, 1), m.timber, M(x, y - 0.25, zU + 0.03), 0.7);
  }
  /** Porte de chargement de l'étage (chantier) et potence de levage avec poulie et cordage. */
  function loadingDoor(x: number, y: number, zU: number): void {
    batch.add(box(1.25, 1.75, 0.06, 0.9), m.planks, M(x, y + 0.9, zU + 0.03), 0.8);
    batch.add(beamGeo(1.6, 0.16, 0.14), m.timber, M(x, y + 1.86, zU + 0.07), 0.8);
    batch.add(box(1.5, 0.12, 0.3, 1), m.timber, M(x, y - 0.02, zU + 0.15), 0.85);
  }
  function hoist(x: number, eave: number, zU: number): void {
    batch.add(beamGeo(1.5, 0.18, 0.18), m.timber, M(x, eave - 0.3, zU + 0.75, 0, Math.PI / 2, 0), 0.85);
    batch.add(beamGeo(1.2, 0.1, 0.1), m.timber, M(x, eave - 0.75, zU + 0.42, -0.85, Math.PI / 2, 0), 0.8);
    batch.add(new THREE.CylinderGeometry(0.15, 0.15, 0.08, 14), m.iron, M(x, eave - 0.52, zU + 1.38, 0, 0, Math.PI / 2));
    batch.add(box(0.025, 2.0, 0.025, 1), m.timber, M(x - 0.13, eave - 1.55, zU + 1.38), 0.9);
    batch.add(box(0.025, 1.3, 0.025, 1), m.timber, M(x + 0.13, eave - 1.2, zU + 1.38), 0.9);
    batch.add(new THREE.TorusGeometry(0.08, 0.02, 6, 12, Math.PI * 1.4), m.iron, M(x + 0.13, eave - 1.9, zU + 1.38, 0, 0, Math.PI));
  }

  /** Enseigne suspendue parallèle à la façade (lisible de face) : potence de fer, écusson double face sans texte. */
  function hangingSign(x: number, y: number, zs: number, cell: number): void {
    batch.add(box(0.05, 0.05, 0.85, 1), m.iron, M(x, y + 0.95, zs + 0.42));
    batch.add(box(0.04, 0.04, 0.62, 1), m.iron, M(x, y + 0.72, zs + 0.24, 0.62, 0, 0));
    batch.add(new THREE.TorusGeometry(0.1, 0.018, 5, 12), m.iron, M(x, y + 1.04, zs + 0.06, 0, Math.PI / 2, 0));
    for (const sx of [-1, 1]) batch.add(box(0.012, 0.16, 0.012, 1), m.iron, M(x + sx * 0.26, y + 0.86, zs + 0.78));
    batch.add(signUV(plane(0.66, 0.82), cell), m.sign, M(x, y + 0.36, zs + 0.78));
  }

  /** Fanion de famille sur une hampe en console (couleurs de la voie, emblème). */
  function pennant(x: number, y: number, zs: number, fam: number): void {
    const f = FAMILIES[fam]!;
    batch.add(box(0.05, 0.05, 0.9, 1), m.iron, M(x, y + 0.2, zs + 0.45));
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 1.4), surface({ map: T(bannerTexture(f, artSeed + 11 + fam)), contact: 0, spec: 0.05, emissive: 0.1, wrap: 0.8, side: THREE.DoubleSide }));
    mesh.position.set(x, y - 0.5, zs + 0.85);
    scene.add(mesh);
  }

  /** Lanterne murale : potence, cage de fer à quatre montants, verre ambré, chapeau. */
  function wallLantern(x: number, y: number, zs: number, lit: boolean, color: THREE.Color = FAM.Astre): void {
    batch.add(box(0.05, 0.05, 0.5, 1), m.iron, M(x, y + 0.36, zs + 0.25));
    batch.add(box(0.04, 0.04, 0.36, 1), m.iron, M(x, y + 0.2, zs + 0.12, -0.8, 0, 0));
    lanternCage(x, y, zs + 0.5, 0.2, 0.3, lit, color);
    if (lit) lights.push({ x, y, z: zs + 0.62, intensity: 2.3, radius: 8, halo: 1.4, flicker: 'lantern', color });
  }
  function lanternCage(x: number, y: number, z: number, w: number, h: number, lit: boolean, color: THREE.Color = FAM.Astre): void {
    batch.add(box(w * 0.78, h * 0.85, w * 0.78, 1), lit ? lampGlassOf(color) : m.dark, M(x, y, z));
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) batch.add(box(0.022, h, 0.022, 1), m.iron, M(x + (sx * w) / 2, y, z + (sz * w) / 2));
    batch.add(box(w + 0.04, 0.04, w + 0.04, 1), m.iron, M(x, y - h / 2, z));
    batch.add(new THREE.CylinderGeometry(0.02, w * 0.78, h * 0.4, 4), m.iron, M(x, y + h / 2 + h * 0.2, z, 0, Math.PI / 4));
    batch.add(new THREE.SphereGeometry(0.03, 6, 4), m.gold, M(x, y + h * 0.78, z));
  }

  /** Lampadaire du quai (≈ 4 m) : socle, fût, bague, lanterne en cage ; lumière de quai de Cité du Tournoi. */
  function lampPost(x: number, z: number): void {
    batch.add(new THREE.CylinderGeometry(0.17, 0.22, 0.32, 10), m.iron, M(x, 0.16, z));
    batch.add(new THREE.CylinderGeometry(0.1, 0.13, 0.2, 10), m.iron, M(x, 0.42, z));
    batch.add(new THREE.CylinderGeometry(0.055, 0.08, 3.4, 8), m.iron, M(x, 2.1, z));
    batch.add(new THREE.CylinderGeometry(0.09, 0.07, 0.12, 8), m.gold, M(x, 1.2, z));
    batch.add(new THREE.CylinderGeometry(0.12, 0.06, 0.14, 8), m.gold, M(x, 3.78, z));
    lanternCage(x, 4.05, z, 0.3, 0.44, true, FAM.Astre);
    lights.push({ x, y: 4.0, z, intensity: 3.2, radius: 10, halo: 2.0, flicker: 'lantern', color: FAM.Astre });
  }

  /** Guirlande de lanternes entre deux lampadaires, au-dessus de l'étal et du Fanal (halos seuls, sans lumière). */
  function garland(): void {
    const a = LAMPS[2]!;
    const b = LAMPS[3]!;
    const pts: THREE.Vector3[] = [new THREE.Vector3(a.x, 3.8, a.z)];
    for (let k = 1; k < 12; k++) {
      const t = k / 12;
      pts.push(new THREE.Vector3(a.x + (b.x - a.x) * t, 3.8 - Math.sin(t * Math.PI) * 0.75, a.z));
    }
    pts.push(new THREE.Vector3(b.x, 3.8, b.z));
    const bulb = new THREE.SphereGeometry(0.075, 8, 6);
    for (const p of pts.slice(1, -1)) { batch.add(bulb, lampGlassOf(FAM.Cendre), M(p.x, p.y - 0.06, p.z)); halos.push({ p: new THREE.Vector3(p.x, p.y - 0.06, p.z), size: 0.55, k: 0.4, color: FAM.Cendre }); }
    for (let k = 0; k + 1 < pts.length; k++) {
      const p0 = pts[k]!;
      const p1 = pts[k + 1]!;
      batch.add(box(p0.distanceTo(p1), 0.02, 0.02, 1), m.iron, M((p0.x + p1.x) / 2, (p0.y + p1.y) / 2, p0.z, 0, 0, Math.atan2(p1.y - p0.y, p1.x - p0.x)));
    }
  }

  // ===================================================================================================== quai, eau

  /** Bord du quai : anneaux d'amarrage, échelle de fer, escalier d'eau, barbacanes, ducs-d'albe contre le mur ;
   *  glyphes des quatre familles gravés dans le mur, doucement lumineux (direction D). */
  function quayEdge(): void {
    [-10.4, -4.6, 1.6, 6.9, 10.2, 18.2].forEach((x, i) => {
      const k = i % 4;
      batch.add(glyphUV(plane(0.62, 0.62), k), m.glyph, M(x, -0.48, WALL_Z + 0.02));
      halos.push({ p: new THREE.Vector3(x, -0.48, WALL_Z + 0.06), size: 1.5, k: 0.28, color: FAM[FAMILIES[k]!] });
    });
    for (const b of BOLLARDS) batch.add(new THREE.TorusGeometry(0.14, 0.028, 6, 14), m.iron, M(b.x + 0.9, -0.42, WALL_Z + 0.04));
    // échelle de fer
    const lx = -2.9;
    for (const sx of [-1, 1]) batch.add(box(0.04, 1.6, 0.04, 1), m.iron, M(lx + sx * 0.22, -0.55, WALL_Z + 0.1));
    for (let y = -1.2; y < 0.1; y += 0.28) batch.add(box(0.44, 0.03, 0.03, 1), m.iron, M(lx, y, WALL_Z + 0.1));
    // escalier d'eau le long du mur (point focal près de la barque)
    // marches pleines jusqu'à l'eau (un massif accolé au mur), même appareil que le mur
    for (let i = 0; i < 6; i++) {
      const top = -0.12 - i * 0.2;
      const h = top - (WATER_Y - 0.3);
      batch.add(box(0.42, h, 0.95, 1.2), m.quayWall, M(-12.0 - i * 0.42, top - h / 2, WALL_Z + 0.47), (p) => 0.4 + 0.6 * THREE.MathUtils.smoothstep(p.y, WATER_Y - 0.3, 0));
    }
    // barbacanes : arcs sombres d'écoulement
    for (const x of [-6.2, 3.6, 12.3]) {
      batch.add(new THREE.CircleGeometry(0.26, 12, 0, Math.PI), m.dark, M(x, -0.72, WALL_Z + 0.012));
      batch.add(plane(0.52, 0.2), m.dark, M(x, -0.82, WALL_Z + 0.012));
      for (let i = 0; i < 5; i++) {
        const a = Math.PI * ((i + 0.5) / 5);
        batch.add(box(0.12, 0.17, 0.08, 1), m.stoneDark, M(x + Math.cos(a) * 0.33, -0.72 + Math.sin(a) * 0.33, WALL_Z + 0.04, 0, 0, a), 0.7);
      }
    }
    // ducs-d'albe : pieux de bois contre le mur, liés par un cerclage
    for (const x of [-16.5, -7.4, 15.0]) {
      for (const dx of [-0.2, 0.0, 0.2]) batch.add(new THREE.CylinderGeometry(0.11, 0.13, 2.0, 8), m.planks, M(x + dx, WATER_Y + 0.75 + (dx === 0 ? 0.15 : 0), WALL_Z + 0.25 + Math.abs(dx) * 0.4), (p) => 0.35 + 0.6 * THREE.MathUtils.smoothstep(p.y, WATER_Y, 0.5));
      batch.add(new THREE.TorusGeometry(0.32, 0.03, 5, 14), m.iron, M(x, 0.1, WALL_Z + 0.33, Math.PI / 2));
    }
  }

  /** Bateaux amarrés le long du quai : coque effilée à tonture, pont, mât, vergue et voile ferlée, haubans, fanal. */
  function boats(): void {
    const boat = (x: number, z: number, len: number, mast: number, lantern: boolean, fam: number | null) => {
      const beam = 2.0;
      const g = new THREE.BoxGeometry(len, 1.1, beam, 16, 2, 4);
      const p = g.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) {
        const u = p.getX(i) / (len / 2);
        const yy = p.getY(i);
        const taper = 1 - Math.pow(Math.abs(u), 2.2);
        p.setZ(i, p.getZ(i) * Math.max(0.04, taper) * (yy < 0 ? 0.55 : 1));
        p.setY(i, yy + Math.pow(Math.abs(u), 2) * 0.42);
      }
      g.computeVertexNormals();
      const uv = g.attributes.uv as THREE.BufferAttribute;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * len / 1.2, uv.getY(i) * 0.6);
      const top = WATER_Y + 0.62;
      batch.add(g, m.planks, M(x, top - 0.3, z), (q) => 0.35 + 0.55 * THREE.MathUtils.smoothstep(q.y, WATER_Y, top));
      // liston clair sous le plat-bord
      batch.add(box(len * 0.86, 0.06, beam * 0.96, 1), m.stoneLight, M(x, top + 0.16, z), 0.7);
      batch.add(box(len * 0.8, 0.05, beam * 0.8, 1), m.planks, M(x, top + 0.05, z), 0.8);
      if (mast > 0) {
        const mx = x - len * 0.08;
        batch.add(new THREE.CylinderGeometry(0.06, 0.09, mast, 8), m.timber, M(mx, top + mast / 2, z), 0.9);
        // bôme basse et voile ferlée ivoire (au ras du plat-bord : la vergue haute barrait les façades)
        batch.add(new THREE.CylinderGeometry(0.04, 0.05, len * 0.55, 6), m.timber, M(mx + len * 0.27, top + 1.15, z, 0, 0, Math.PI / 2), 0.9);
        const furled = new THREE.CylinderGeometry(0.15, 0.12, len * 0.5, 10);
        batch.add(furled, m.sail, M(mx + len * 0.27, top + 1.32, z, 0, 0, Math.PI / 2));
        // étai, pataras et haubans : segments droits
        const rope = (a: THREE.Vector3, b: THREE.Vector3) => {
          const len2 = a.distanceTo(b);
          const mid = a.clone().add(b).multiplyScalar(0.5);
          const dir = b.clone().sub(a).normalize();
          const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
          batch.add(box(0.018, len2, 0.018, 1), m.iron, new THREE.Matrix4().compose(mid, q, S1));
        };
        const head = new THREE.Vector3(mx, top + mast - 0.1, z);
        rope(head, new THREE.Vector3(x + len / 2 - 0.1, top + 0.4, z));
        rope(head, new THREE.Vector3(x - len / 2 + 0.2, top + 0.3, z));
        rope(head, new THREE.Vector3(mx + 0.2, top + 0.2, z + beam * 0.48));
        rope(head, new THREE.Vector3(mx - 0.2, top + 0.2, z + beam * 0.48));
        if (fam !== null) {
          const pen = new THREE.BufferGeometry();
          pen.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, -0.36, 0, 0.9, -0.18, 0], 3));
          pen.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0.5], 2));
          pen.computeVertexNormals();
          const col = ['#b04a26', '#3a4f9a', '#3e6a3e', '#b89432'][fam]!;
          const pm = new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(0.3), side: THREE.DoubleSide });
          batch.add(pen, pm, M(mx, top + mast + 0.05, z));
        }
      }
      if (lantern) {
        // fanal de proue, loin de la voile ferlée (qu'il brûlait à l'image)
        const lx2 = x - len * 0.42;
        batch.add(box(0.05, 1.3, 0.05, 1), m.iron, M(lx2, top + 0.65, z));
        lanternCage(lx2, top + 1.42, z, 0.18, 0.26, true, FAM.Cendre);
        lights.push({ x: lx2, y: top + 1.42, z, intensity: 2.4, radius: 7.5, halo: 1.3, flicker: 'lantern', color: FAM.Cendre });
      }
      // amarre de la proue à la borne la plus proche (chaînette affaissée)
      const bol = BOLLARDS.reduce((a, b) => (Math.abs(b.x - x) < Math.abs(a.x - x) ? b : a));
      const a0 = new THREE.Vector3(bol.x, 0.45, bol.z);
      const a1 = new THREE.Vector3(x + len * 0.42, top + 0.2, z - beam * 0.35);
      const N = 8;
      for (let i = 0; i < N; i++) {
        const t0 = i / N;
        const t1 = (i + 1) / N;
        const P = (t: number) => a0.clone().lerp(a1, t).add(new THREE.Vector3(0, -Math.sin(Math.PI * t) * 0.45, 0));
        const p0 = P(t0);
        const p1 = P(t1);
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), p1.clone().sub(p0).normalize());
        batch.add(box(0.03, p0.distanceTo(p1), 0.03, 1), m.timber, new THREE.Matrix4().compose(p0.clone().add(p1).multiplyScalar(0.5), q, S1), 0.8);
      }
    };
    boat(-18.0, WALL_Z + 1.25, 6.6, 7.2, true, 0);
    boat(5.45, WALL_Z + 1.3, 5.4, 6.4, false, 2);
    boat(-26, WALL_Z + 1.5, 7.2, 7.6, false, 1);
    boat(23, WALL_Z + 1.4, 6.0, 0, false, null);
    // barque à l'échelle
    boat(-2.0, WALL_Z + 0.95, 3.2, 0, false, null);
    const water = new THREE.Mesh(new THREE.PlaneGeometry(240, 120), waterMaterial({ streak: 0.5, spillZ: WALL_Z }));
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, WATER_Y, WALL_Z + 60);
    scene.add(water);
  }

  // ================================================================================================= rue, accessoires

  /** Étal principal (point focal) : table, devant de planches, toile ivoire festonnée, grappe de trois lanternes. */
  function stall(): void {
    const cx = (STALL.x0 + STALL.x1) / 2;
    const cz = (STALL.z0 + STALL.z1) / 2;
    const w = STALL.x1 - STALL.x0;
    const d = STALL.z1 - STALL.z0;
    batch.add(box(w, 0.1, d * 0.8, 1), m.planks, M(cx, 0.95, cz + d * 0.08), 0.9);
    batch.add(box(w - 0.1, 0.9, 0.06, 1), m.planks, M(cx, 0.47, STALL.z1 - 0.1), 0.85);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) batch.add(box(0.1, sz < 0 ? 2.95 : 2.55, 0.1, 1), m.timber, M(cx + sx * (w / 2 - 0.08), sz < 0 ? 1.47 : 1.27, cz + sz * (d / 2 - 0.08)), 0.9);
    batch.add(beamGeo(w, 0.1, 0.1), m.timber, M(cx, 2.5, STALL.z1 - 0.08), 0.9);
    // marchandises : caisses, paniers, ballots de toile (tons froids et ivoire ; l'ambre reste aux lanternes)
    const goods = [m.planks, m.slateCloth, m.cloth, m.planks, m.slateCloth, m.cloth];
    for (let k = 0; k < 6; k++) {
      const s = 0.3 + rng() * 0.16;
      const x = STALL.x0 + 0.3 + k * 0.48;
      if (k % 3 === 1) batch.add(new THREE.CylinderGeometry(s * 0.45, s * 0.45, s * 1.4, 10), goods[k]!, M(x, 1.0 + s * 0.45, cz + 0.1, 0, 0, Math.PI / 2), 0.9);
      else batch.add(box(s, s * 0.6, s * 0.8, 1), goods[k]!, M(x, 1.0 + s * 0.3, cz + 0.15, 0, rng() * 0.3, 0), 0.9);
    }
    for (let k = 0; k < 3; k++) batch.add(box(0.55, 0.45, 0.45, 1), m.planks, M(STALL.x1 + 0.1 - k * 0.5, 0.23, STALL.z0 + 0.3, 0, rng() * 0.4, 0), 0.85);
    // toile : surface tendue de l'arrière (haut) vers l'avant (bas), creux, lambrequin
    const g = new THREE.PlaneGeometry(w + 0.5, d + 0.7, 10, 6);
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const t = (p.getY(i) + (d + 0.7) / 2) / (d + 0.7);
      const sag = Math.sin((x / (w + 0.5) + 0.5) * Math.PI) * 0.12 * Math.sin(t * Math.PI);
      p.setXYZ(i, x, 2.55 + t * 0.55 - sag, (0.5 - t) * (d + 0.7));
    }
    g.computeVertexNormals();
    batch.add(g, m.cloth, M(cx, 0, cz));
    const teeth: number[] = [];
    const n = 12;
    const zf = cz + (d + 0.7) / 2;
    for (let i = 0; i < n; i++) {
      const x0 = -(w + 0.5) / 2 + ((w + 0.5) * i) / n;
      const x1 = x0 + (w + 0.5) / n;
      teeth.push(x0, 2.55, 0, x1, 2.55, 0, (x0 + x1) / 2, 2.36, 0);
    }
    const tg = new THREE.BufferGeometry();
    tg.setAttribute('position', new THREE.Float32BufferAttribute(teeth, 3));
    tg.computeVertexNormals();
    batch.add(tg, m.cloth, M(cx, 0, zf));
    // grappe de lanternes en V sous la poutre avant (`MarketGenerator.ts` L. 102-103) : une lumière, deux halos
    for (const [dx, drop] of [[-0.95, 0.42], [0, 0.18], [0.95, 0.38]] as const) {
      const y = 2.45 - drop;
      batch.add(box(0.012, drop, 0.012, 1), m.iron, M(cx + dx, 2.45 - drop / 2 + 0.06, STALL.z1 - 0.08));
      lanternCage(cx + dx, y - 0.1, STALL.z1 - 0.08, 0.16, 0.24, true, FAM.Ronce);
      if (dx !== 0) halos.push({ p: new THREE.Vector3(cx + dx, y - 0.1, STALL.z1 - 0.08), size: 0.9, k: 0.5, color: FAM.Ronce });
    }
    lights.push({ x: cx, y: 2.1, z: STALL.z1 + 0.15, intensity: 3.0, radius: 8.5, halo: 1.3, flicker: 'lantern', color: FAM.Ronce });
  }

  /** Groupes d'accessoires : tonneaux cerclés, caisses, filets et cordages lovés ; bancs du Fanal. */
  function props(): void {
    const barrel = (x: number, z: number, h = 0.85) => {
      const g = new THREE.CylinderGeometry(0.3, 0.3, h, 14, 4);
      const p = g.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) { const k = 1 + 0.12 * Math.cos((p.getY(i) / h) * Math.PI); p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); }
      g.computeVertexNormals();
      batch.add(g, m.planks, M(x, h / 2, z), (q) => 0.55 + 0.45 * THREE.MathUtils.smoothstep(q.y, 0, h));
      for (const yy of [0.18, 0.82]) batch.add(new THREE.TorusGeometry(0.31 + 0.02, 0.018, 4, 18), m.iron, M(x, h * yy, z, Math.PI / 2));
    };
    const crate = (x: number, y: number, z: number, s: number, ry: number) => {
      batch.add(box(s, s, s, 0.9), m.planks, M(x, y + s / 2, z, 0, ry, 0), 0.85);
      batch.add(box(s + 0.02, 0.06, s + 0.02, 1), m.timber, M(x, y + s - 0.03, z, 0, ry, 0), 0.8);
    };
    for (const pr of PROPS) {
      const cx = (pr.x0 + pr.x1) / 2;
      const cz = (pr.z0 + pr.z1) / 2;
      if (pr.kind === 'tonneaux') { barrel(pr.x0 + 0.3, pr.z0 + 0.32); barrel(pr.x0 + 0.78, pr.z0 + 0.36); barrel(pr.x0 + 0.52, pr.z0 + 0.7, 0.75); }
      else if (pr.kind === 'filets') {
        for (let k = 0; k < 5; k++) batch.add(new THREE.SphereGeometry(0.32 + rng() * 0.14, 8, 6), m.slateCloth, M(pr.x0 + 0.25 + rng() * (pr.x1 - pr.x0 - 0.5), 0.12, pr.z0 + 0.2 + rng() * (pr.z1 - pr.z0 - 0.4), 0, 0, 0, 1, 0.42, 1), 0.7);
        batch.add(new THREE.TorusGeometry(0.28, 0.06, 6, 16), m.timber, M(cx + 0.3, 0.07, cz, Math.PI / 2), 0.8);
        batch.add(new THREE.TorusGeometry(0.18, 0.05, 6, 14), m.timber, M(cx + 0.3, 0.15, cz, Math.PI / 2), 0.85);
      } else {
        crate(pr.x0 + 0.32, 0, cz, 0.6, rng() * 0.3);
        crate(pr.x0 + 0.95, 0, cz - 0.05, 0.55, rng() * 0.3);
        crate(pr.x0 + 0.6, 0.6, cz, 0.5, rng() * 0.5);
      }
    }
    // bancs et tonneau du Fanal (sous les fenêtres, de part et d'autre de la porte)
    for (const x of [5.0, 9.5]) {
      batch.add(box(1.4, 0.08, 0.38, 1), m.planks, M(x, 0.46, FZ + 0.32), 0.9);
      for (const sx of [-1, 1]) batch.add(box(0.08, 0.44, 0.32, 1), m.planks, M(x + sx * 0.6, 0.22, FZ + 0.32), 0.7);
    }
    barrel(10.65, FZ + 0.4, 0.8);
    // sacs près du chantier
    for (let k = 0; k < 3; k++) batch.add(new THREE.SphereGeometry(0.28, 8, 6), m.cloth, M(-13.9 + k * 0.5, 0.2, FZ + 0.42, 0, 0, 0, 1, 0.75, 0.8), 0.75);
  }

  // ======================================================================================================== au loin

  /** Au-delà des maisons d'extrémité : passage voûté vers les Ruelles (ouest), entrepôt et rampe vers le Parvis (est). */
  function endBlocks(): void {
    const tint = 0x7e889e;
    // ouest : haute maison de pierre percée d'un passage voûté éclairé
    const wx0 = -30;
    const wx1 = -19.5;
    const cw = (wx0 + wx1) / 2;
    batch.add(box(wx1 - wx0, 8.2, DEPTH, 3), m.stone, M(cw, 4.1, FZ - DEPTH / 2), 0.8);
    const rf = gableRoof(wx1 - wx0, DEPTH, 2.4, 'x', 0.4);
    batch.add(rf.slopes, m.slate, M(cw, 8.2, FZ - DEPTH / 2), 0.8);
    batch.add(rf.gables, m.stone, M(cw, 8.2, FZ - DEPTH / 2), 0.7);
    const ax = -21.6;
    batch.add(plane(2.4, 2.4), m.dark, M(ax, 1.2, FZ + 0.01));
    batch.add(new THREE.CircleGeometry(1.2, 16, 0, Math.PI), m.dark, M(ax, 2.4, FZ + 0.01));
    archStones(ax, 2.4, 1.2, 0.26, FZ, 11);
    for (const sx of [-1, 1]) batch.add(box(0.26, 2.4, 0.2, 1), m.stoneLight, M(ax + sx * 1.33, 1.2, FZ + 0.1), 0.85);
    wallLantern(ax + 1.9, 2.7, FZ, true, FAM.Voile);
    for (let k = 0; k < 4; k++) windowUnit(-28.6 + k * 1.9 + (k > 1 ? 2.2 : 0), 5.4, 0.8, 1.1, FZ, k === 1 ? 'warm' : 'dark', 'stone', k === 3);
    batch.add(box(wx1 - wx0, 0.18, 0.24, 2), m.stoneLight, M(cw, 3.2, FZ + 0.08), 0.9);
    // est : entrepôt d'armement bas, portes de planches, rampe qui monte vers le Parvis
    const ex0 = 19.5;
    const ex1 = 34;
    const ce = (ex0 + ex1) / 2;
    batch.add(box(ex1 - ex0, 5.2, DEPTH, 3), m.stoneDark, M(ce, 2.6, FZ - DEPTH / 2), 0.85);
    const er = gableRoof(ex1 - ex0, DEPTH, 2.2, 'x', 0.4);
    batch.add(er.slopes, m.slate, M(ce, 5.2, FZ - DEPTH / 2), 0.8);
    batch.add(er.gables, plasterOf(tint), M(ce, 5.2, FZ - DEPTH / 2), 0.7);
    for (const x of [22.4, 26.6]) {
      batch.add(box(2.2, 2.6, 0.06, 0.9), m.planks, M(x, 1.3, FZ + 0.02), 0.7);
      batch.add(beamGeo(2.6, 0.2, 0.16), m.timber, M(x, 2.7, FZ + 0.08), 0.8);
    }
    for (let k = 0; k < 4; k++) windowUnit(21 + k * 3.2, 4.0, 0.7, 0.6, FZ, k === 2 ? 'dim' : 'dark', 'stone', false);
  }

  /** Second rang de maisons derrière le quai : toits, pignons et fenêtres hautes entre les toits du premier rang. */
  function secondRow(): void {
    const far = surface({ map: T(farFacadeTexture(artSeed, 0.16)), tint: 0x8890a8, emissive: 0.85, contact: 0, spec: 0.1, breakup: 0.3, tile: [1 / 12.8, 1 / 13] });
    let x = -40;
    while (x < 40) {
      const w = 5 + rng() * 3.5;
      const h = 5.4 + rng() * 2.0;
      const z = -15.5 - rng() * 3;
      batch.add(box(w, h, 6, 1), far, M(x + w / 2, h / 2, z), 1);
      const ridge = rng() < 0.55 ? 'z' : 'x';
      const rf = gableRoof(w, 6, 1.8 + rng() * 0.9, ridge, 0.3);
      batch.add(rf.slopes, m.slate, M(x + w / 2, h, z), 0.7);
      batch.add(rf.gables, far, M(x + w / 2, h, z), 1);
      if (rng() < 0.7) {
        const cxh = x + w * (0.25 + rng() * 0.5);
        batch.add(box(0.6, 1.6, 0.6, 1.5), m.stone, M(cxh, h + 1.6, z - 1), 0.6);
      }
      x += w + 0.2;
    }
  }

  /**
   * La ville haute sur sa colline, en rangs étagés de plus en plus hauts et lointains (couches C et D de
   * `DistantCity.ts` L. 233-421) : façades sombres aux fenêtres rares, toits en silhouette, cathédrale à deux tours et
   * rose allumée, remparts ; la brume en hauteur sépare les rangs.
   */
  function hillCity(): void {
    const far = surface({ map: T(farFacadeTexture(artSeed + 1, 0.16, true, 0.6)), tint: 0x7c84a0, emissive: 1.6, contact: 0, spec: 0, breakup: 0.2, tile: [1 / 12.8, 1 / 13] });
    const rock = surface({ map: stoneTex, tint: 0x3a4052, spec: 0, contact: 0, breakup: 0.5, tile: [1 / 8, 1 / 8] });
    // colline : talus sombre sous les rangs
    {
      const g = new THREE.PlaneGeometry(260, 80, 1, 1);
      g.rotateX(-Math.PI / 2 + Math.atan2(19, 70));
      batch.add(g, rock, M(0, 8.5, -62), 0.6);
    }
    const rows = [
      { z: -34, base: 2.5, n: 30, h: [6, 10], spread: 150 },
      { z: -46, base: 7.0, n: 28, h: [5, 9], spread: 170 },
      { z: -60, base: 11.5, n: 26, h: [5, 8], spread: 190 },
      { z: -76, base: 15.5, n: 22, h: [4, 7.5], spread: 210 },
    ];
    for (const row of rows) {
      let x = -row.spread / 2;
      for (let i = 0; i < row.n && x < row.spread / 2; i++) {
        const w = 4 + rng() * 5;
        const h = row.h[0]! + rng() * (row.h[1]! - row.h[0]!);
        const z = row.z - rng() * 5;
        const y0 = row.base - 4;
        batch.add(box(w, h + 4, 6, 1), far, M(x + w / 2, y0 + (h + 4) / 2, z), 1);
        const rf = gableRoof(w, 6, 1.8 + rng() * 2.2, rng() < 0.5 ? 'x' : 'z', 0.25);
        batch.add(rf.slopes, m.slate, M(x + w / 2, y0 + h + 4, z), 0.55);
        batch.add(rf.gables, far, M(x + w / 2, y0 + h + 4, z), 1);
        x += w + rng() * 1.5;
      }
    }
    // cathédrale de la ville haute (point focal lointain) : nef, deux tours, flèches, rose allumée
    const cx = 9;
    const cz = -84;
    const base = 12.5;
    batch.add(box(9, 12, 16, 1), far, M(cx, base + 3, cz - 6), 1);
    const nr = gableRoof(9, 16, 4.2, 'z', 0.2);
    batch.add(nr.slopes, m.slate, M(cx, base + 9, cz - 6), 0.6);
    for (const sx of [-1, 1]) {
      batch.add(box(3.2, 13, 3.2, 1), far, M(cx + sx * 3.4, base + 3.5, cz + 1.2), 1);
      batch.add(new THREE.ConeGeometry(2.1, 5.2, 4), m.slate, M(cx + sx * 3.4, base + 12.6, cz + 1.2, 0, Math.PI / 4, 0), 0.6);
    }
    batch.add(new THREE.CircleGeometry(1.25, 18), m.winLit, M(cx, base + 7.2, cz + 2.81));
    batch.add(windowUV(plane(1.0, 2.4), 'warm'), m.winLit, M(cx, base + 3.4, cz + 2.81));
    // remparts et tour ronde à l'ouest
    batch.add(box(40, 4, 2, 1), far, M(-34, base - 1, cz + 8), 1);
    batch.add(new THREE.CylinderGeometry(2.4, 2.6, 11, 12), far, M(-22, base + 3.5, cz + 8), 1);
    batch.add(new THREE.ConeGeometry(2.9, 4, 12), m.slate, M(-22, base + 11, cz + 8), 0.6);
    // lueurs de la ville haute : lanternes de rues et de places devinées dans la brume (halos seuls, sans lumière)
    for (const row of rows) {
      for (let i = 0; i < 7; i++) {
        const x = -row.spread / 2.4 + rng() * (row.spread / 1.2);
        halos.push({ p: new THREE.Vector3(x, row.base + 0.5 + rng() * 2.5, row.z + 3.2), size: 2.2 + rng() * 1.6, k: 0.18 + rng() * 0.12, color: rng() < 0.65 ? FAM.Voile : FAM.Astre });
      }
    }
  }

  /**
   * Poussières en suspension visibles seulement dans la lumière des lanternes (Cité du Tournoi, `Particles.ts`
   * L. 36-56 et 114-126) : le nuanceur de sommets somme les lumières à la position de chaque grain ; hors des flaques
   * de lumière, rien ne se voit. 140 points, un appel de dessin.
   */
  function dustMotes(): THREE.ShaderMaterial {
    const n = 140;
    const pos = new Float32Array(n * 3);
    const seed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = -24 + rng() * 48;
      pos[i * 3 + 1] = 0.4 + rng() * 4.2;
      pos[i * 3 + 2] = FZ + 0.3 + rng() * (QUAY_Z - FZ + 0.2);
      seed[i] = rng();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('seed', new THREE.Float32BufferAttribute(seed, 1));
    const mat = new THREE.ShaderMaterial({
      name: 'VillePoussieres',
      uniforms: { ...U, uT: { value: 0 } },
      vertexShader: /* glsl */ `
uniform vec4 uLightPos[16]; uniform vec3 uLightCol[16]; uniform int uLightCount; uniform float uT;
attribute float seed; varying vec3 vCol;
void main(){
  vec3 p = position;
  p.x += sin(uT * (0.2 + seed * 0.3) + seed * 40.0) * 0.35;
  p.y += sin(uT * (0.15 + seed * 0.2) + seed * 17.0) * 0.25;
  p.z += cos(uT * (0.18 + seed * 0.25) + seed * 29.0) * 0.2;
  vec3 lit = vec3(0.0);
  for (int i = 0; i < 16; i++) { if (i >= uLightCount) break; vec3 L = uLightPos[i].xyz - p; float d2 = dot(L, L); float r = uLightPos[i].w * 0.55; float x = max(1.0 - d2 / (r * r), 0.0); lit += uLightCol[i] * x * x; }
  vCol = lit * (0.55 + 0.45 * sin(uT * 2.0 + seed * 60.0)) * 0.22;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = (1.5 + seed * 1.5) * (720.0 / 1000.0) * (30.0 / max(-mv.z, 1.0)) * 1.4;
}`,
      fragmentShader: /* glsl */ `
varying vec3 vCol;
void main(){ vec2 d = gl_PointCoord - 0.5; float a = smoothstep(0.5, 0.0, length(d)); gl_FragColor = vec4(vCol * a, 1.0); }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const pts = new THREE.Points(g, mat);
    pts.frustumCulled = false;
    pts.renderOrder = 3;
    scene.add(pts);
    return mat;
  }

  /** Brumes animées (nappe basse sur l'eau, voile entre le quai et la ville haute) : bruit doux qui dérive, teinte de la
   *  brume, éclairée par les lanternes proches. Transparentes, sans écriture de profondeur. */
  function mists(): THREE.ShaderMaterial[] {
    const tex = T(mistTexture(artSeed));
    const make = (w: number, h: number, x: number, y: number, z: number, alpha: number, speed: number, scale: [number, number]) => {
      const mat = new THREE.ShaderMaterial({
        name: 'VilleBrume',
        uniforms: { ...U, tMist: { value: tex }, uT: { value: 0 }, uAlpha: { value: alpha }, uSpeed: { value: speed }, uScale: { value: new THREE.Vector2(...scale) } },
        vertexShader: /* glsl */ `varying vec2 vUv; varying vec3 vWorld; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
        fragmentShader: /* glsl */ `
uniform vec3 uFogColor; uniform vec3 uMoonCol; uniform vec4 uLightPos[16]; uniform vec3 uLightCol[16]; uniform int uLightCount;
uniform sampler2D tMist; uniform float uT; uniform float uAlpha; uniform float uSpeed; uniform vec2 uScale;
varying vec2 vUv; varying vec3 vWorld;
void main(){
  vec2 q = vUv * uScale;
  float a = texture2D(tMist, q + vec2(uT * uSpeed, 0.0)).a * 0.6 + texture2D(tMist, q * 1.7 + vec2(-uT * uSpeed * 0.6, 0.31)).a * 0.4;
  a *= smoothstep(0.0, 0.35, vUv.y) * (1.0 - smoothstep(0.55, 1.0, vUv.y)) * smoothstep(0.0, 0.08, vUv.x) * (1.0 - smoothstep(0.92, 1.0, vUv.x));
  vec3 lit = vec3(0.0);
  for (int i = 0; i < 16; i++) { if (i >= uLightCount) break; vec3 L = uLightPos[i].xyz - vWorld; float d2 = dot(L, L); float r = uLightPos[i].w; float x = max(1.0 - d2 / (r * r), 0.0); lit += uLightCol[i] * x * x * 0.08; }
  vec3 col = uFogColor * 1.25 + uMoonCol * 0.05 + lit;
  gl_FragColor = vec4(col, a * uAlpha);
}`,
        transparent: true,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
      mesh.position.set(x, y, z);
      mesh.renderOrder = 1;
      scene.add(mesh);
      return mat;
    };
    return [
      make(90, 1.5, 0, WATER_Y + 0.45, WALL_Z + 2.6, 0.24, 0.012, [6, 1]),
      make(220, 22, 0, 9, -27, 0.32, 0.006, [5, 1.4]),
    ];
  }
}
