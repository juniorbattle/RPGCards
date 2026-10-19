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
 * Passe 47 (retour du responsable sur la direction D : décors plus impressionnants, flou, flaques qui reflètent) : flaques
 * peintes le long du bord du quai, eau du port en reflet brisé, fronton doré et pinacles de la salle de jeu, frise des
 * familles, pignon à oculus de l'armateur, balconnets, crêtes et épis des toits, clair de lune peint sur les étages,
 * atelier rougeoyant du chantier, lampadaires ouvragés, étal garni, jardinières, fumées du second rang.
 * Passe 48 : la grammaire de façade et le décor commun sont dans `grammaire.ts` (partagés avec le Parvis et les Ruelles) ;
 * ce fichier ne garde que le Quai (ses façades, la salle de jeu, le bord du quai, les bateaux, l'étal, les accessoires).
 */
import * as THREE from 'three';
import { FAMILIES } from '../game/catalog/cards';
import { hashString, makeRng } from '../game/engine/rng';
import { bannerTexture } from '../scene/venues/common';
import { surface, waterMaterial } from './materiaux';
import { SIGN_CELLS, glyphUV, signUV } from './quaiMateriaux';
import { BOLLARDS, FACADES, FACADE_Z, LAMPS, PROPS, QUAY_Z, STALL, WATER_Y, type Facade } from './quai';
import { LAYER_NOREFLECT } from './reflets';
import { DEPTH, FAM, M, S1, box, beamGeo, createKit, plane, type FacadeHooks, type MistPlane, type Spec } from './grammaire';
import { gableRoof, type QuaiScene } from './scene';

const FZ = FACADE_Z;
/** Rectangle de la rue (x0, z0, largeur, profondeur) et flaques d'eau dormante (centre x, z ; demi-axes), surtout le
 *  long du bord du quai : en frontale rasante, une façade se reflète d'autant plus haut que la flaque est près du bord. */
const STREET: readonly [number, number, number, number] = [-32, FACADE_Z - 0.3, 64, QUAY_Z - FACADE_Z + 0.6];
const PUDDLES: readonly (readonly [number, number, number, number])[] = [
  // bande avant (vue rasante : c'est là que se reflètent les vitraux, les portes, les lanternes et les passants)
  [-20.5, 2.6, 1.5, 0.75], [-16.0, 2.7, 1.3, 0.65], [-13.2, 2.45, 1.6, 0.85], [-9.6, 2.7, 1.7, 0.7], [-6.6, 2.55, 2.0, 0.85],
  [-3.9, 2.75, 1.0, 0.6], [-1.4, 2.5, 1.3, 0.75], [2.0, 2.7, 1.4, 0.7], [5.2, 2.5, 1.2, 0.8], [8.2, 2.6, 1.9, 0.85],
  [11.4, 2.75, 1.2, 0.6], [14.2, 2.5, 1.6, 0.8], [17.6, 2.7, 1.4, 0.7], [21.0, 2.55, 1.3, 0.7],
  // milieu de la rue (pieds des personnages, bas des façades, portes et vitrines allumées)
  [-7.3, 0.55, 1.2, 0.55], [7.6, 0.9, 1.3, 0.6], [1.0, 0.1, 0.9, 0.45], [-17.5, 0.45, 0.9, 0.45], [14.5, 1.0, 1.0, 0.5],
  [-12.2, 0.9, 0.8, 0.4], [-2.2, 0.6, 0.7, 0.35], [11.0, 0.3, 0.8, 0.4],
];
/** Face du mur du quai (le pavé s'arrête à la margelle). */
const WALL_Z = QUAY_Z + 0.5;
/** Brumes du Quai : nappe basse sur l'eau, voile entre le quai et la ville haute. */
const QUAI_MISTS: readonly MistPlane[] = [
  [90, 1.5, 0, WATER_Y + 0.45, WALL_Z + 2.6, 0.24, 0.012, [6, 1]],
  [220, 22, 0, 9, -27, 0.32, 0.006, [5, 1.4]],
];

/**
 * Façades du Quai, une par identifiant du plan pur : hauteurs alternées pour la ligne des toits (les plus basses laissent
 * voir la ville haute), une matière d'enduit par maison dans la bande froide. Rez-de-chaussée 3 m, étages ≈ 2,55 m
 * (`BuildingGenerator.ts` L. 74-88) ; personnages de 1,95 m (proportions « chibi », plus grands que l'échelle réelle).
 */
const SPECS: Record<string, Spec> = {
  chantier: { eave: 5.6, ground: 3.0, upper: 'colombage', jetty: 0, roof: 'x', roofH: 2.8, tint: 0x8e98b0, litChance: 0.4, dormers: 2, quoins: true, arch: true, doorW: 2.3, doorH: 2.85, doorKind: 'atelier', hoist: true, sign: { cell: SIGN_CELLS.poulie, x: -12.4 } },
  salle: { eave: 6.9, ground: 3.4, upper: 'pierre', jetty: 0, roof: 'x', roofH: 2.2, tint: 0xa8b0c4, litChance: 0.7, dormers: 0, quoins: true, arch: true, doorW: 1.9, doorH: 3.05, doorKind: 'tournoi', groundGlass: true, noUpperWindows: true },
  etroite: { eave: 5.5, ground: 3.0, upper: 'colombage', jetty: 0.38, roof: 'z', roofH: 3.0, tint: 0xa9a49e, litChance: 0.55, dormers: 0, shop: { x: -1.45, awning: 'ivoire' }, flowers: true },
  fanal: { eave: 5.8, ground: 3.0, upper: 'colombage', doorKind: 'taverne', jetty: 0.3, roof: 'x', roofH: 2.6, tint: 0x9aa0b0, litChance: 0.85, dormers: 2, balcony: true, sign: { cell: SIGN_CELLS.lanterne, x: 9.9 }, pennant: { x: 4.2, fam: 0 }, flowers: true },
  armateur: { eave: 8.1, ground: 3.2, upper: 'enduit', jetty: 0, roof: 'x', roofH: 2.3, tint: 0x8892ac, litChance: 0.55, dormers: 2, dormerAt: [0.12, 0.88], quoins: true, sign: { cell: SIGN_CELLS.ancre, x: 13.0 }, shop: { x: 18.1, awning: 'ardoise' }, pennant: { x: 17.0, fam: 1 }, crossGable: { w: 3.6, h: 2.8, fam: 1 }, balconets: true, pediments: true },
};

export function buildQuai(artSeed: number): QuaiScene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x04060c);
  const rng = makeRng(hashString(`ville|quai-v3|${artSeed}`));
  const k = createKit({ artSeed, rng, scene, fz: FZ, front: QUAY_Z, street: STREET, puddles: PUDDLES });
  const { T, lights, halos, batch, m, famCloth, lampGlassOf, plasterOf } = k;
  const { facade, windowUnit, archStones, wallLantern, lanternCage, lampPost, oculus, triPrism, flowerBox, secondRow, hillCity, mists, smokes, dustMotes } = k;
  /** Particularités des façades du Quai : la salle de jeu (bannières, fronton…), l'atelier du chantier, l'armateur. */
  const hooks = (f: Facade): FacadeHooks => {
    if (f.id === 'salle') return { mid: (cx, w) => salle(f, SPECS.salle!, cx, w) };
    if (f.id === 'chantier') return { end: () => chantierDressing(f, SPECS.chantier!) };
    if (f.id === 'armateur') return { end: () => wallLantern(f.door! + 1.05, 2.55, FZ, true, FAM.Voile) };
    return {};
  };

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
  for (const f of FACADES) facade(f, SPECS[f.id]!, hooks(f));
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
  LAMPS.forEach((l, i) => lampPost(l.x, l.z, i % 4));
  garland();
  for (const b of BOLLARDS) {
    batch.add(new THREE.CylinderGeometry(0.17, 0.22, 0.56, 12), m.stoneDark, M(b.x, 0.28, b.z), 0.85);
    batch.add(new THREE.CylinderGeometry(0.24, 0.2, 0.09, 12), m.stoneDark, M(b.x, 0.6, b.z), 1);
    batch.add(new THREE.TorusGeometry(0.2, 0.025, 6, 16), m.iron, M(b.x, 0.36, b.z, Math.PI / 2));
  }
  stall();
  props();
  boats();
  const mist = [...mists(QUAI_MISTS), ...smokes()];
  const motes = dustMotes();

  return k.finishIlot(mist, motes);

  /** Chantier naval : lanterne de braise à la porte, avirons croisés cerclés d'or et cordage lové sur l'étage. */
  function chantierDressing(f: Facade, s: Spec): void {
    wallLantern(f.door! + 1.75, 2.75, FZ, true, FAM.Cendre);
    // passe 47 : avirons croisés cerclés d'or et cordage lové sur l'étage du chantier naval
    const ox = f.x0 + (f.x1 - f.x0) / 4;
    const oy = s.ground + 1.35;
    for (const a of [0.75, -0.75]) {
      batch.add(box(0.06, 2.0, 0.05, 1), m.timber, M(ox, oy, FZ + 0.1, 0, 0, a), 0.85);
      batch.add(box(0.2, 0.5, 0.04, 1), m.planks, M(ox + Math.sin(-a) * 0.85, oy + Math.cos(a) * 0.85, FZ + 0.12, 0, 0, a), 0.85);
    }
    batch.add(new THREE.TorusGeometry(0.14, 0.03, 6, 16), m.gold, M(ox, oy, FZ + 0.15));
    for (let i = 0; i < 4; i++) batch.add(new THREE.TorusGeometry(0.3 - i * 0.05, 0.035, 5, 18), m.timber, M(f.x1 - 1.0, s.ground + 0.9 + i * 0.02, FZ + 0.08 + i * 0.01), 0.85);
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
    // passe 47 : frise sculptée et dorée au-dessus du cordon (un médaillon de famille sous chaque bannière), denticules
    // sous la corniche
    {
      const g = plane(w - 0.1, 0.42);
      batch.add(g, m.frieze, M(cx, s.ground + 0.33, FZ + 0.03));
      batch.add(box(w + 0.06, 0.07, 0.2, 1), m.stoneLight, M(cx, s.ground + 0.58, FZ + 0.07), 0.9);
      for (let x = f.x0 + 0.12; x < f.x1 - 0.05; x += 0.22) batch.add(box(0.11, 0.13, 0.14, 1), m.stoneLight, M(x, s.eave - 0.43, FZ + 0.1), 0.7);
    }
    // passe 47 : pilastres à chapiteaux dorés entre les travées (les médaillons y sont accrochés)
    for (const k of [1, 3]) {
      const x = f.x0 + (w * k) / 4;
      const y0 = 0.9;
      const y1 = s.eave - 0.36;
      batch.add(box(0.38, y1 - y0, 0.12, 3), m.stoneLight, M(x, (y0 + y1) / 2, FZ + 0.06), (p) => 0.78 + 0.18 * THREE.MathUtils.smoothstep(p.y, y0, y0 + 2));
      batch.add(box(0.52, 0.32, 0.2, 1), m.stoneLight, M(x, y0 + 0.16, FZ + 0.1), 0.8);
      batch.add(box(0.54, 0.2, 0.22, 1), m.stoneLight, M(x, y1 - 0.1, FZ + 0.11), 0.85);
      batch.add(box(0.56, 0.045, 0.24, 1), m.gold, M(x, y1 - 0.22, FZ + 0.12));
    }
    // fronton : tympan de pierre, rampants moulurés filetés d'or, oculus au soleil d'Astre, acrotères dorés
    {
      const pw = 4.6;
      const ph = 2.3;
      const y = s.eave + 0.02;
      const z = FZ + 0.18;
      batch.add(triPrism(pw, ph, 0.55), m.stone, M(cx, y, z), (p) => 0.85 + 0.12 * THREE.MathUtils.smoothstep(p.y, y, y + 1));
      const half = pw / 2 + 0.12;
      const len = Math.hypot(half, ph + 0.1);
      const a = Math.atan2(ph + 0.1, half);
      for (const sx of [-1, 1]) {
        batch.add(box(len + 0.1, 0.22, 0.4, 1), m.stoneLight, M(cx + (sx * half) / 2, y + (ph + 0.1) / 2 + 0.06, z - 0.08, 0, 0, -sx * a), 0.85);
        batch.add(box(len, 0.045, 0.05, 1), m.gold, M(cx + (sx * half) / 2, y + (ph + 0.1) / 2 - 0.08, z + 0.14, 0, 0, -sx * a));
        // acrotères des angles : socle et boule dorée
        batch.add(box(0.3, 0.26, 0.3, 1), m.stoneLight, M(cx + sx * (half - 0.05), y + 0.33, z - 0.08), 0.85);
        batch.add(new THREE.SphereGeometry(0.13, 10, 8), m.gold, M(cx + sx * (half - 0.05), y + 0.58, z - 0.08));
      }
      batch.add(box(pw + 0.3, 0.16, 0.42, 1), m.stoneLight, M(cx, y + 0.08, z - 0.1), 0.85);
      oculus(cx, y + ph * 0.38, z, 0.52, 3);
      // acrotère du sommet : soleil d'Astre doré (étoile à quatre branches)
      batch.add(box(0.34, 0.24, 0.34, 1), m.stoneLight, M(cx, y + ph + 0.2, z - 0.1), 0.85);
      batch.add(new THREE.OctahedronGeometry(0.34, 0), m.gold, M(cx, y + ph + 0.68, z - 0.1, 0, 0, 0, 0.55, 1, 0.25));
      batch.add(new THREE.OctahedronGeometry(0.34, 0), m.gold, M(cx, y + ph + 0.68, z - 0.1, 0, 0, Math.PI / 2, 0.55, 1, 0.25));
      halos.push({ p: new THREE.Vector3(cx, y + ph + 0.68, z), size: 1.2, k: 0.18, color: FAM.Astre });
    }
    // pinacles d'angle : fût de pierre, gâble, flèche d'ardoise, boule dorée
    for (const px of [f.x0 + 0.28, f.x1 - 0.28]) {
      const y0 = s.eave - 0.3;
      batch.add(box(0.56, 2.0, 0.56, 1.5), m.stoneLight, M(px, y0 + 1.0, FZ - 0.05), (p) => 0.8 + 0.15 * THREE.MathUtils.smoothstep(p.y, y0, y0 + 2));
      batch.add(box(0.66, 0.14, 0.66, 1), m.stoneLight, M(px, y0 + 2.05, FZ - 0.05), 0.9);
      batch.add(new THREE.ConeGeometry(0.44, 1.3, 4), m.slate, M(px, y0 + 2.75, FZ - 0.05, 0, Math.PI / 4), 0.8);
      batch.add(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 8), m.gold, M(px, y0 + 3.42, FZ - 0.05));
      batch.add(new THREE.SphereGeometry(0.09, 10, 8), m.gold, M(px, y0 + 3.52, FZ - 0.05));
    }
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
      // liston clair sous le plat-bord ; passe 47 : filet doré et volutes à la proue
      batch.add(box(len * 0.86, 0.06, beam * 0.96, 1), m.stoneLight, M(x, top + 0.16, z), 0.7);
      batch.add(box(len * 0.8, 0.035, 0.03, 1), m.gold, M(x, top + 0.07, z + beam * 0.47));
      if (len > 4) for (const t of [0.34, 0.4]) batch.add(new THREE.TorusGeometry(0.16, 0.025, 5, 14, Math.PI * 1.5), m.gold, M(x + len * t, top + 0.12, z + beam * 0.3, 0, 0, t * 6));
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
      if (!lantern && fam !== null) {
        // passe 47 : fanal de poupe aux couleurs de la famille du fanion (verre et halo, sans lumière)
        const lx2 = x + len * 0.4;
        batch.add(box(0.04, 1.0, 0.04, 1), m.iron, M(lx2, top + 0.5, z));
        lanternCage(lx2, top + 1.12, z, 0.16, 0.24, true, FAM[FAMILIES[fam]!]);
        halos.push({ p: new THREE.Vector3(lx2, top + 1.12, z + 0.1), size: 1.4, k: 0.5, color: FAM[FAMILIES[fam]!] });
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
    const water = new THREE.Mesh(new THREE.PlaneGeometry(240, 120), waterMaterial({ streak: 0.35, spillZ: WALL_Z, refl: 0.95 }));
    water.layers.set(LAYER_NOREFLECT);
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, WATER_Y, WALL_Z + 60);
    scene.add(water);
  }

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
    // passe 47 : fond de toile, étagère de fioles vertes (Ronce) qui luisent, paquets de cartes aux couleurs des familles,
    // bottes d'herbes séchées pendues à la poutre, fanion de la famille au poteau
    batch.add(plane(w - 0.2, 1.35), m.slateCloth, M(cx, 1.72, STALL.z0 + 0.1));
    batch.add(box(w - 0.3, 0.05, 0.22, 1), m.planks, M(cx, 1.62, STALL.z0 + 0.2), 0.9);
    for (let k = 0; k < 9; k++) {
      const jx = STALL.x0 + 0.35 + k * 0.29;
      const jh = 0.16 + rng() * 0.1;
      batch.add(new THREE.CylinderGeometry(0.05, 0.06, jh, 8), k % 3 === 1 ? m.gold : lampGlassOf(k % 2 ? FAM.Ronce : new THREE.Color(0.55, 0.85, 0.4)), M(jx, 1.65 + jh / 2, STALL.z0 + 0.2));
      batch.add(new THREE.CylinderGeometry(0.025, 0.025, 0.05, 6), m.timber, M(jx, 1.65 + jh + 0.025, STALL.z0 + 0.2));
    }
    for (let k = 0; k < 8; k++) {
      const px = STALL.x0 + 0.3 + k * 0.34;
      const n = 2 + Math.floor(rng() * 3);
      for (let j = 0; j < n; j++) batch.add(box(0.16, 0.05, 0.22, 1), famCloth[(k + j) % 4]!, M(px + (rng() - 0.5) * 0.03, 1.03 + j * 0.052, STALL.z1 - 0.32, 0, (rng() - 0.5) * 0.3, 0), 0.9);
    }
    for (let k = 0; k < 5; k++) {
      const hx = STALL.x0 + 0.45 + k * 0.52;
      batch.add(box(0.01, 0.2, 0.01, 1), m.iron, M(hx, 2.33, STALL.z1 - 0.14));
      batch.add(new THREE.ConeGeometry(0.09, 0.34, 6), m.leaf, M(hx, 2.08, STALL.z1 - 0.14, Math.PI), 0.85);
    }
    {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 1.0), surface({ map: T(bannerTexture('Ronce', artSeed + 31)), contact: 0, spec: 0.05, emissive: 0.12, wrap: 0.8, side: THREE.DoubleSide }));
      mesh.position.set(STALL.x0 + 0.08, 1.95, STALL.z1 + 0.02);
      scene.add(mesh);
    }
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
    // passe 47 : arbustes en pots de part et d'autre des portes de la salle de jeu et du Fanal
    const pot = (x: number, z: number, h: number) => {
      batch.add(new THREE.CylinderGeometry(0.26, 0.19, 0.42, 12), m.planks, M(x, 0.21, z), (q) => 0.6 + 0.4 * THREE.MathUtils.smoothstep(q.y, 0, 0.42));
      batch.add(new THREE.TorusGeometry(0.26, 0.03, 5, 14), m.gold, M(x, 0.42, z, Math.PI / 2));
      for (let i = 0; i < 5; i++) batch.add(new THREE.SphereGeometry(0.2 + rng() * 0.08, 8, 6), m.leaf, M(x + (rng() - 0.5) * 0.22, 0.5 + (i / 5) * h + rng() * 0.1, z + (rng() - 0.5) * 0.18, 0, 0, 0, 1, 1.15, 1), 0.85);
    };
    for (const sx of [-1, 1]) pot(-6.75 + sx * 2.15, FZ + 0.42, 0.75);
    pot(4.25, FZ + 0.4, 0.55);
    // chevalet de l'étal : planche peinte à l'éventail de cartes (sans texte)
    {
      const ex = STALL.x0 - 0.45;
      const ez = STALL.z1 + 0.25;
      batch.add(signUV(plane(0.62, 0.78), SIGN_CELLS.cartes), m.sign, M(ex, 0.72, ez + 0.06, -0.18));
      for (const sx of [-1, 1]) batch.add(box(0.05, 1.12, 0.05, 1), m.timber, M(ex + sx * 0.3, 0.55, ez + 0.02, -0.18, 0, sx * 0.06), 0.85);
      batch.add(box(0.05, 1.05, 0.05, 1), m.timber, M(ex, 0.5, ez - 0.28, 0.32, 0, 0), 0.8);
    }
  }

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
}
