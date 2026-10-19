/**
 * M09 V3, passe 49 — le Parvis de l'arène dans la direction D (ADR 026 et son amendement 1), après la validation du Quai
 * de la passe 47 par le responsable (« Je valide le Quai de la passe 47 tel que sur la planche. Étends-le au Parvis et
 * aux Ruelles. »). Même plan pur (`parvis.ts` : place, grande porte, braseros, lampadaires, table des inscriptions,
 * collisions), décor reconstruit avec la grammaire commune (`grammaire.ts`) en plans de profondeur pour la frontale 2.5D :
 *   1. premier plan : toits de la ville basse (flous), mur de la terrasse et ses glyphes, balustrade ;
 *   2. la place : dallage mouillé, flaques, « rose des Quatre Voies » incrustée devant la porte, braseros, lampadaires ;
 *   3. l'arène : façade en amphithéâtre (elle fuit sur les côtés), deux rangs d'arcades (couloirs à la torche en bas,
 *      vitraux des familles en haut), colonnes engagées, frise des familles, corniche à denticules, merlons et fanions ;
 *      au centre, la porte du Tournoi en arc de triomphe (intérieur embrasé, archivolte dorée, colonnes, rose à quatre
 *      quartiers, bannières des familles, soleil d'Astre) ;
 *   4. la ville haute sur sa colline, la lune.
 * Le décor ne prend pas son style sur les personnages de la ville, provisoires (ADR 026 amendement 1).
 */
import * as THREE from 'three';
import { FAMILIES } from '../game/catalog/cards';
import { hashString, makeRng } from '../game/engine/rng';
import { bannerTexture } from '../scene/venues/common';
import { surface } from './materiaux';
import { arcadeGlow, arenaInterior, friezeTexture, glassUV, glyphUV, roseDesVoies, SIGN_CELLS, signUV, windowUV } from './quaiMateriaux';
import { BOOTH, BRAZIERS, GATE, P_FACADE_Z, P_FRONT_Z, P_LAMPS, P_PROPS } from './parvis';
import { FAM, M, box, beamGeo, createKit, plane, type MistPlane } from './grammaire';
import { gableRoof, type QuaiScene } from './scene';

const FZ = P_FACADE_Z;
/** Rayon de l'amphithéâtre (la façade fuit sur les côtés) et centre de la courbe. */
const R = 40;
const CZ = FZ - R;
/** Largeur d'une travée d'arcades, demi-largeur de l'avant-corps de la porte, nombre de travées de chaque côté. */
const BW = 3.4;
const AV = 4.6;
const NB = 8;
/** Hauteurs de la façade : entablement, corniche haute, parapet. */
const H_ENT = 4.55;
const H_TOP = 8.45;
const STREET: readonly [number, number, number, number] = [-40, FZ - 8, 80, P_FRONT_Z - FZ + 8.3];
/** Flaques : devant la porte et les braseros (vue rasante : la porte embrasée s'y reflète), le long de la balustrade. */
const PUDDLES: readonly (readonly [number, number, number, number])[] = [
  [0, 2.4, 2.4, 0.8], [-4.6, 1.2, 1.3, 0.6], [4.8, 1.5, 1.4, 0.65], [-9.6, 2.6, 1.7, 0.65], [9.9, 2.5, 1.6, 0.65],
  [-13.2, 1.3, 1.1, 0.5], [13.6, 1.7, 1.2, 0.5], [-6.9, 2.9, 1.0, 0.4], [6.9, 2.95, 1.0, 0.4], [-17.2, 2.4, 1.5, 0.6],
  [17.2, 2.3, 1.5, 0.6], [-2.6, 0.9, 0.7, 0.35], [2.4, 0.4, 0.8, 0.35],
];
const MISTS: readonly MistPlane[] = [
  [140, 3, 0, -1.2, P_FRONT_Z + 4.5, 0.3, 0.01, [7, 1]],
  [220, 22, 0, 10, -34, 0.3, 0.006, [5, 1.4]],
];

export function buildParvisD(artSeed: number): QuaiScene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x04060c);
  const rng = makeRng(hashString(`ville|parvis-d|${artSeed}`));
  const k = createKit({ artSeed, rng, scene, fz: FZ, front: P_FRONT_Z, street: STREET, puddles: PUDDLES });
  const { T, lights, halos, batch, m, famCloth, lampGlassOf, plasterOf } = k;
  const { archStones, lanternCage, lampPost, oculus, triPrism, finial, flowerBox, secondRow, hillCity, mists, dustMotes } = k;
  const arcade = new THREE.MeshBasicMaterial({ map: T(arcadeGlow(artSeed)), color: new THREE.Color(1, 1, 1).multiplyScalar(1.15) });
  const arena = new THREE.MeshBasicMaterial({ map: T(arenaInterior(artSeed)), color: new THREE.Color(1, 1, 1).multiplyScalar(1.12) });
  const fire = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.36, 0.08).multiplyScalar(1.6) });
  const fireCore = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.72, 0.3).multiplyScalar(2.0) });
  const frieze = T(friezeTexture());
  /** Frise des familles : une matière par décalage (une famille par travée, la texture en porte quatre). */
  const friezeMat = surface({ map: frieze, spec: 0.9, shin: 50, contact: 0, breakup: 0.1, emissive: 0.1, illu: true });
  const bannerOf = new Map<number, THREE.ShaderMaterial>();
  const banner = (fam: number) => bannerOf.get(fam) ?? bannerOf.set(fam, surface({ map: T(bannerTexture(FAMILIES[fam]!, artSeed + 3)), contact: 0, spec: 0.05, emissive: 0.12, wrap: 0.8, side: THREE.DoubleSide })).get(fam)!;

  /** Ouverture cintrée (rectangle + demi-cercle) aux UV continus (v de 0 en bas à 1 au sommet de l'arc). */
  const archOpening = (w: number, hr: number): THREE.BufferGeometry[] => {
    const h = hr + w / 2;
    const rect = plane(w, hr);
    rect.translate(0, hr / 2, 0);
    const ru = rect.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < ru.count; i++) ru.setY(i, ru.getY(i) * (hr / h));
    const top = new THREE.CircleGeometry(w / 2, 20, 0, Math.PI);
    top.translate(0, hr, 0);
    const tu = top.attributes.uv as THREE.BufferAttribute;
    const tp = top.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < tu.count; i++) tu.setXY(i, tp.getX(i) / w + 0.5, (hr + (tp.getY(i) - hr)) / h);
    return [rect, top];
  };

  // ============================================================================================== la place et la terrasse
  {
    const [x0, z0, w, d] = STREET;
    const g = new THREE.PlaneGeometry(w, d, 40, 6);
    g.rotateX(-Math.PI / 2);
    const uv = g.attributes.uv as THREE.BufferAttribute;
    // dalles plus grandes que les pavés du Quai (place d'apparat)
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / 4.4, uv.getY(i) * d / 4.4);
    batch.add(g, m.cobble, M(x0 + w / 2, 0, z0 + d / 2), (p) => 0.7 + 0.3 * THREE.MathUtils.smoothstep(p.z, FZ - 1, FZ + 2));
  }
  // rose des Quatre Voies incrustée devant la porte, cerclée d'un liseré de pierre claire
  {
    const rose = surface({ map: T(roseDesVoies()), spec: 0.6, shin: 40, contact: 0, breakup: 0.15, wet: 0.6, illu: true, emissive: 0.04 });
    const g = new THREE.CircleGeometry(2.45, 48);
    g.rotateX(-Math.PI / 2);
    batch.add(g, rose, M(0, 0.012, -1.4));
    const ring = new THREE.RingGeometry(2.45, 2.62, 48);
    ring.rotateX(-Math.PI / 2);
    batch.add(ring, m.stoneLight, M(0, 0.014, -1.4), 0.9);
  }
  // balustrade : socle, balustres tournés, main courante, piliers à boule dorée
  {
    const zb = P_FRONT_Z + 0.18;
    batch.add(box(80, 0.22, 0.56, 1.6), m.stone, M(0, 0.11, zb), 0.8);
    batch.add(box(80, 0.13, 0.5, 1.6), m.stoneLight, M(0, 1.0, zb), 0.95);
    const prof = [[0, 0], [0.09, 0], [0.09, 0.05], [0.05, 0.12], [0.1, 0.32], [0.11, 0.45], [0.05, 0.6], [0.07, 0.66], [0.07, 0.7], [0, 0.7]].map(([r, y]) => new THREE.Vector2(r!, y!));
    const bal = new THREE.LatheGeometry(prof, 8);
    for (let x = -32; x <= 32; x += 0.34) batch.add(bal, m.stoneLight, M(x, 0.22, zb), (p) => 0.75 + 0.25 * THREE.MathUtils.smoothstep(p.y, 0.2, 0.9));
    for (let x = -31.5; x <= 32; x += 4.5) {
      batch.add(box(0.5, 1.12, 0.6, 1), m.stone, M(x, 0.56, zb), 0.85);
      batch.add(box(0.62, 0.12, 0.7, 1), m.stoneLight, M(x, 1.15, zb), 0.95);
      batch.add(new THREE.SphereGeometry(0.15, 12, 8), m.gold, M(x, 1.36, zb));
    }
    // mur de la terrasse (sous la balustrade, vers la ville basse) : gros appareil, glyphes des familles, lanternes
    batch.add(box(80, 4.2, 0.4, 3), m.quayWall, M(0, -2.1, zb + 0.32), (p) => 0.35 + 0.65 * THREE.MathUtils.smoothstep(p.y, -4, 0));
    batch.add(box(80, 0.18, 0.5, 1.6), m.stoneLight, M(0, -0.06, zb + 0.36), 0.85);
    [-15.5, -6.2, 6.2, 15.5].forEach((x, i) => {
      batch.add(glyphUV(plane(0.7, 0.7), i % 4), m.glyph, M(x, -0.85, zb + 0.53));
      halos.push({ p: new THREE.Vector3(x, -0.85, zb + 0.6), size: 1.6, k: 0.26, color: FAM[FAMILIES[i % 4]!] });
    });
    // tentures du Tournoi pendues à la balustrade, aux couleurs des familles (le mur de la terrasse s'habille)
    for (let q = 0; q < 10; q++) {
      const x = -24.75 + q * 5.5;
      if (Math.abs(x) < 1) continue;
      const f = q % 4;
      batch.add(plane(1.25, 2.5), banner(f), M(x, -0.28, zb + 0.56));
      batch.add(box(1.5, 0.06, 0.06, 1), m.gold, M(x, 0.99, zb + 0.56));
      for (const sx of [-1, 1]) batch.add(new THREE.SphereGeometry(0.05, 8, 6), m.gold, M(x + sx * 0.77, 0.99, zb + 0.56));
    }
    // escalier vers le Quai (ouest) : volées qui descendent le long de la terrasse
    for (let i = 0; i < 8; i++) batch.add(box(1.6, 0.26, 0.9, 1.2), m.stoneLight, M(-20.5 - i * 0.55, -0.15 - i * 0.26, zb + 1.0), 0.8 - i * 0.03);
  }
  // Ville basse au premier plan, juste sous la terrasse : faîtages, lucarnes allumées, cheminées (le flou du premier
  // plan les adoucit) ; leurs faîtes restent sous la ligne de la balustrade.
  {
    let x = -38;
    while (x < 38) {
      const w = 3.8 + rng() * 3.2;
      const z = P_FRONT_Z + 1.6 + rng() * 2.2;
      const rh = 1.2 + rng() * 0.6;
      const top = -0.95 - rng() * 0.45 - rh * 0.5;
      const wall = plasterOf([0x7e88a0, 0x8a8ea0, 0x76809a][Math.floor(rng() * 3)]!);
      batch.add(box(w, 4, 4.2, 3), wall, M(x + w / 2, top - 2, z), 0.5);
      const rf = gableRoof(w, 4.2, rh, 'x', 0.3);
      batch.add(rf.slopes, m.slate, M(x + w / 2, top, z), (p) => 0.6 + 0.4 * THREE.MathUtils.smoothstep(p.y, top, top + rh));
      batch.add(rf.gables, wall, M(x + w / 2, top, z), 0.7);
      if (rng() < 0.75) {
        const dx = x + w * (0.3 + rng() * 0.4);
        const dz = z + 1.15;
        const dy = top + rh * 0.3;
        batch.add(box(0.85, 0.8, 0.9, 1.5), wall, M(dx, dy, dz), 0.8);
        const dr = gableRoof(0.85, 0.9, 0.45, 'z', 0.1);
        batch.add(dr.slopes, m.slate, M(dx, dy + 0.4, dz), 0.8);
        batch.add(windowUV(plane(0.46, 0.5), rng() < 0.75 ? 'warm' : 'candle'), m.winLit, M(dx, dy, dz + 0.46));
        halos.push({ p: new THREE.Vector3(dx, dy, dz + 0.6), size: 1.2, k: 0.22, color: FAM.Astre });
      }
      if (rng() < 0.65) {
        const cx = x + w * (0.2 + rng() * 0.6);
        batch.add(box(0.45, 1.3, 0.45, 1.5), m.stone, M(cx, top + rh * 0.5 + 0.4, z - 0.6), 0.75);
      }
      x += w + 0.2;
    }
  }

  // ======================================================================================================== l'arène
  /** Repère d'une travée de l'amphithéâtre (x le long de la façade, z vers la place), côté `side`, rang `i`. */
  const bayFrame = (side: -1 | 1, i: number) => {
    const s = AV + BW * (i + 0.5);
    const th = (side * s) / R;
    return new THREE.Matrix4().compose(new THREE.Vector3(R * Math.sin(th), 0, CZ + R * Math.cos(th)), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, th, 0)), new THREE.Vector3(1, 1, 1));
  };
  const add = (F: THREE.Matrix4, geo: THREE.BufferGeometry, mat: THREE.Material, local: THREE.Matrix4, ao?: number | ((p: THREE.Vector3) => number)) =>
    batch.add(geo, mat, F.clone().multiply(local), ao);
  const at = (F: THREE.Matrix4, x: number, y: number, z: number) => new THREE.Vector3(x, y, z).applyMatrix4(F);

  /** Torche murale de braise : console de fer, coupe, flammes, lumière (Cendre). */
  const torch = (F: THREE.Matrix4, x: number, y: number) => {
    add(F, box(0.05, 0.05, 0.42, 1), m.iron, M(x, y - 0.1, 0.3));
    add(F, new THREE.CylinderGeometry(0.13, 0.07, 0.22, 10), m.iron, M(x, y, 0.5));
    add(F, new THREE.TorusGeometry(0.13, 0.02, 5, 14), m.gold, M(x, y + 0.11, 0.5, Math.PI / 2));
    add(F, new THREE.ConeGeometry(0.12, 0.42, 7), fire, M(x, y + 0.3, 0.5));
    add(F, new THREE.ConeGeometry(0.06, 0.24, 6), fireCore, M(x, y + 0.24, 0.53));
    const p = at(F, x, y + 0.32, 0.62);
    halos.push({ p, size: 1.5, k: 0.5, color: FAM.Cendre });
    lights.push({ x: p.x, y: p.y, z: p.z + 0.2, intensity: 2.2, radius: 7.5, halo: 0, flicker: 'candle', color: FAM.Cendre });
  };

  const bay = (side: -1 | 1, i: number) => {
    const F = bayFrame(side, i);
    const fam = (i + (side > 0 ? 2 : 0)) % 4;
    const ao = (p: THREE.Vector3) => 1 - 0.3 * THREE.MathUtils.smoothstep(p.y, H_TOP - 1.2, H_TOP);
    // mur (une travée) et soubassement
    add(F, box(BW + 0.06, H_TOP + 0.5, 3, 3), m.stone, M(0, (H_TOP + 0.5) / 2, -1.5), ao);
    add(F, box(BW + 0.06, 0.8, 0.14, 1.5), m.stoneDark, M(0, 0.4, 0.07), (p) => 0.6 + 0.4 * THREE.MathUtils.smoothstep(p.y, 0, 0.8));
    // arcade basse : couloir éclairé à la torche une fois sur deux, archivolte, piédroits, impostes
    const [r0, r1] = archOpening(1.9, 2.75);
    const lit = (i + (side > 0 ? 1 : 0)) % 2 === 0;
    add(F, r0!, lit ? arcade : m.dark, M(0, 0.0, 0.012));
    add(F, r1!, lit ? arcade : m.dark, M(0, 0.0, 0.012));
    for (let s = 0; s < 9; s++) {
      const a = Math.PI * ((s + 0.5) / 9);
      add(F, box(0.22, 0.32, 0.18, 1), m.stoneLight, M(Math.cos(a) * 1.07, 2.75 + Math.sin(a) * 1.07, 0.09, 0, 0, a), s === 4 ? 0.95 : 0.82 + (s % 2) * 0.08);
    }
    for (const sx of [-1, 1]) {
      add(F, box(0.2, 2.75, 0.16, 1), m.stoneLight, M(sx * 1.05, 1.375, 0.08), 0.85);
      add(F, box(0.34, 0.12, 0.24, 1), m.stoneLight, M(sx * 1.05, 2.78, 0.12), 0.9);
    }
    // colonnes engagées des piliers (rez-de-chaussée et étage), bases, chapiteaux dorés
    const piers = i === 0 ? [-BW / 2, BW / 2] : [BW / 2];
    for (const px of piers) {
      add(F, new THREE.CylinderGeometry(0.22, 0.25, 3.5, 14), m.stoneLight, M(px, 0.95 + 1.75, 0.1), (p) => 0.8 + 0.15 * THREE.MathUtils.smoothstep(p.y, 1, 4));
      add(F, box(0.62, 0.3, 0.42, 1), m.stoneLight, M(px, 0.95, 0.1), 0.8);
      add(F, box(0.64, 0.24, 0.44, 1), m.stoneLight, M(px, H_ENT - 0.1, 0.12), 0.9);
      add(F, box(0.66, 0.045, 0.46, 1), m.gold, M(px, H_ENT - 0.24, 0.12));
      add(F, new THREE.CylinderGeometry(0.18, 0.2, 2.75, 12), m.stoneLight, M(px, 5.35 + 1.375, 0.1), 0.88);
      add(F, box(0.52, 0.2, 0.36, 1), m.stoneLight, M(px, 8.2, 0.12), 0.85);
      add(F, box(0.54, 0.04, 0.38, 1), m.gold, M(px, 8.08, 0.12));
    }
    // entablement : architrave, frise des familles (un médaillon par travée), corniche
    add(F, box(BW + 0.08, 0.26, 0.34, 1.5), m.stoneLight, M(0, H_ENT + 0.13, 0.12), 0.85);
    {
      const g = plane(BW - 0.08, 0.44);
      const u = g.attributes.uv as THREE.BufferAttribute;
      for (let q = 0; q < u.count; q++) u.setX(q, (fam + u.getX(q)) * 0.25);
      add(F, g, friezeMat, M(0, H_ENT + 0.5, 0.03));
    }
    add(F, box(BW + 0.1, 0.22, 0.48, 1.5), m.stoneLight, M(0, H_ENT + 0.83, 0.18), 0.9);
    add(F, box(BW + 0.1, 0.04, 0.5, 1), m.gold, M(0, H_ENT + 0.95, 0.19));
    // fenêtre haute en vitrail de la famille (lumière de l'intérieur), archivolte, appui
    {
      const w = 1.15;
      const hr = 1.55;
      const [g0, g1] = archOpening(w, hr);
      for (const g of [g0!, g1!]) {
        const u = g.attributes.uv as THREE.BufferAttribute;
        for (let q = 0; q < u.count; q++) u.setX(q, (fam + 0.03 + u.getX(q) * 0.94) / 5);
        add(F, g, m.glass, M(0, 5.75, 0.012));
      }
      for (let s = 0; s < 7; s++) {
        const a = Math.PI * ((s + 0.5) / 7);
        add(F, box(0.16, 0.26, 0.14, 1), m.stoneLight, M(Math.cos(a) * 0.67, 5.75 + hr + Math.sin(a) * 0.67, 0.07, 0, 0, a), 0.85);
      }
      for (const sx of [-1, 1]) add(F, box(0.14, hr, 0.12, 1), m.stoneLight, M(sx * 0.645, 5.75 + hr / 2, 0.06), 0.85);
      add(F, box(w + 0.4, 0.1, 0.24, 1), m.stoneLight, M(0, 5.7, 0.12), 0.95);
      halos.push({ p: at(F, 0, 6.7, 0.15), size: 1.8, k: 0.14, color: FAM[FAMILIES[fam]!] });
    }
    // corniche haute à denticules, filet doré, parapet et merlons
    for (let x = -BW / 2 + 0.1; x < BW / 2; x += 0.22) add(F, box(0.11, 0.13, 0.14, 1), m.stoneLight, M(x, H_TOP - 0.2, 0.1), 0.7);
    add(F, box(BW + 0.12, 0.26, 0.52, 1.5), m.stoneLight, M(0, H_TOP, 0.2), 0.9);
    add(F, box(BW + 0.12, 0.04, 0.54, 1), m.gold, M(0, H_TOP + 0.14, 0.21));
    add(F, box(BW + 0.06, 0.5, 0.4, 1.5), m.stone, M(0, H_TOP + 0.4, 0.0), 0.85);
    for (const mx of [-0.85, 0.85]) add(F, box(0.72, 0.6, 0.42, 1), m.stone, M(mx, H_TOP + 0.95, 0.0), 0.88);
    // fanion de famille sur hampe, une travée sur deux
    if (i % 2 === 1) {
      add(F, new THREE.CylinderGeometry(0.035, 0.045, 2.6, 6), m.iron, M(BW / 2, H_TOP + 1.9, -0.1));
      add(F, new THREE.SphereGeometry(0.07, 8, 6), m.gold, M(BW / 2, H_TOP + 3.22, -0.1));
      add(F, plane(0.7, 1.3), banner(fam), M(BW / 2 + 0.38, H_TOP + 2.45, -0.1));
    }
    // torches de braise aux piliers près de la porte
    if (i === 1) torch(F, -BW / 2, 3.15);
  };
  for (const side of [-1, 1] as const) for (let i = 0; i < NB; i++) bay(side, i);

  // ------------------------------------------------------------------- avant-corps : la porte du Tournoi en arc de triomphe
  {
    const zf = FZ + 0.5;
    const TOPC = 9.35;
    batch.add(box(AV * 2, TOPC + 0.6, 6, 3), m.stone, M(0, (TOPC + 0.6) / 2, zf - 3), (p) => 1 - 0.25 * THREE.MathUtils.smoothstep(p.y, TOPC - 1, TOPC));
    batch.add(box(AV * 2 + 0.04, 0.8, 0.14, 1.5), m.stoneDark, M(0, 0.4, zf + 0.07), (p) => 0.6 + 0.4 * THREE.MathUtils.smoothstep(p.y, 0, 0.8));
    // ouverture embrasée (piste, gradins, bannières) ; marches
    const hr = GATE.h - GATE.half;
    const [g0, g1] = archOpening(GATE.half * 2, hr);
    batch.add(g0!, arena, M(GATE.x, 0, zf + 0.011));
    batch.add(g1!, arena, M(GATE.x, 0, zf + 0.011));
    batch.add(box(GATE.half * 2 + 2.2, 0.16, 1.3, 1), m.stoneLight, M(GATE.x, 0.08, zf + 0.65), 0.9);
    batch.add(box(GATE.half * 2 + 1.4, 0.16, 0.75, 1), m.stoneLight, M(GATE.x, 0.24, zf + 0.38), 0.92);
    lights.push({ x: GATE.x, y: 2.0, z: zf + 1.1, intensity: 2.6, radius: 10, halo: 0, flicker: 'candle', color: new THREE.Color(1.0, 0.56, 0.24) });
    // archivolte à claveaux, bandeau doré, clé au soleil d'Astre
    archStones(GATE.x, hr, GATE.half, 0.46, zf, 15);
    batch.add(new THREE.TorusGeometry(GATE.half + 0.52, 0.055, 6, 48, Math.PI), m.gold, M(GATE.x, hr, zf + 0.2));
    batch.add(new THREE.TorusGeometry(GATE.half + 0.02, 0.04, 6, 48, Math.PI), m.gold, M(GATE.x, hr, zf + 0.15));
    batch.add(box(0.62, 0.78, 0.3, 1), m.stoneLight, M(GATE.x, GATE.h + 0.35, zf + 0.2), 0.95);
    batch.add(new THREE.OctahedronGeometry(0.3, 0), m.gold, M(GATE.x, GATE.h + 0.38, zf + 0.38, 0, 0, 0, 0.6, 1, 0.3));
    batch.add(new THREE.OctahedronGeometry(0.3, 0), m.gold, M(GATE.x, GATE.h + 0.38, zf + 0.38, 0, 0, Math.PI / 2, 0.6, 1, 0.3));
    for (const sx of [-1, 1]) {
      batch.add(box(0.36, hr, 0.24, 1), m.stoneLight, M(GATE.x + sx * (GATE.half + 0.18), hr / 2, zf + 0.12), 0.85);
      // colonnes jumelles sur piédestaux, chapiteaux et bases dorés
      const cx = GATE.x + sx * (GATE.half + 0.95);
      batch.add(box(0.95, 1.0, 0.7, 1), m.stoneLight, M(cx, 0.5, zf + 0.35), 0.8);
      batch.add(new THREE.CylinderGeometry(0.31, 0.34, 5.2, 16), m.stoneLight, M(cx, 1.0 + 2.6, zf + 0.35), (p) => 0.8 + 0.15 * THREE.MathUtils.smoothstep(p.y, 1, 5));
      batch.add(new THREE.TorusGeometry(0.34, 0.05, 6, 18), m.gold, M(cx, 1.08, zf + 0.35, Math.PI / 2));
      batch.add(box(0.86, 0.36, 0.78, 1), m.stoneLight, M(cx, 6.36, zf + 0.35), 0.9);
      batch.add(box(0.9, 0.06, 0.8, 1), m.gold, M(cx, 6.17, zf + 0.35));
    }
    // entablement de l'avant-corps (frise continue), rose à quatre quartiers, bannières des familles
    batch.add(box(AV * 2 + 0.1, 0.3, 0.5, 1.5), m.stoneLight, M(0, 6.7, zf + 0.25), 0.88);
    batch.add(box(AV * 2 + 0.12, 0.05, 0.52, 1), m.gold, M(0, 6.86, zf + 0.26));
    {
      // rose : quatre quartiers de verre des familles, remplages dorés, cœur au soleil
      const rc = 8.0;
      const rr = 1.05;
      for (let q = 0; q < 4; q++) {
        const g = new THREE.CircleGeometry(rr, 12, (q * Math.PI) / 2, Math.PI / 2);
        const u = g.attributes.uv as THREE.BufferAttribute;
        // pièces au plomb seulement (bas de la case, loin du médaillon)
        for (let i = 0; i < u.count; i++) u.setXY(i, 0.5 + (u.getX(i) - 0.5) * 0.9, 0.1 + u.getY(i) * 0.25);
        batch.add(glassUV(g, (q + 1) % 4), m.glass, M(0, rc, zf + 0.012));
      }
      for (let s = 0; s < 8; s++) batch.add(box(rr * 2, 0.05, 0.05, 1), m.gold, M(0, rc, zf + 0.06, 0, 0, (s * Math.PI) / 8));
      for (const r of [0.38, rr + 0.03]) batch.add(new THREE.TorusGeometry(r, 0.05, 6, 36), m.gold, M(0, rc, zf + 0.07));
      batch.add(new THREE.SphereGeometry(0.16, 12, 8), m.gold, M(0, rc, zf + 0.1));
      for (let s = 0; s < 16; s++) {
        const a = (s / 16) * Math.PI * 2;
        batch.add(box(0.24, 0.22, 0.16, 1), m.stoneLight, M(Math.cos(a) * (rr + 0.2), rc + Math.sin(a) * (rr + 0.2), zf + 0.08, 0, 0, a), 0.85 + (s % 2) * 0.08);
      }
      halos.push({ p: new THREE.Vector3(0, rc, zf + 0.15), size: 4.0, k: 0.2, color: FAM.Astre });
    }
    FAMILIES.forEach((_, f) => {
      const bx = [-3.55, -2.2, 2.2, 3.55][f]!;
      batch.add(plane(1.1, 2.2), banner(f), M(bx, 8.05, zf + 0.09));
      batch.add(box(1.32, 0.05, 0.05, 1), m.gold, M(bx, 9.18, zf + 0.12));
      for (const sx of [-1, 1]) batch.add(new THREE.SphereGeometry(0.045, 8, 6), m.gold, M(bx + sx * 0.68, 9.18, zf + 0.12));
    });
    // corniche, attique, acrotères et soleil d'Astre au sommet
    for (let x = -AV + 0.1; x < AV; x += 0.22) batch.add(box(0.11, 0.13, 0.14, 1), m.stoneLight, M(x, TOPC - 0.2, zf + 0.1), 0.7);
    batch.add(box(AV * 2 + 0.3, 0.3, 0.6, 1.5), m.stoneLight, M(0, TOPC, zf + 0.25), 0.9);
    batch.add(box(AV * 2 + 0.32, 0.05, 0.62, 1), m.gold, M(0, TOPC + 0.17, zf + 0.26));
    batch.add(box(AV * 2, 0.7, 0.5, 1.5), m.stone, M(0, TOPC + 0.5, zf), 0.85);
    batch.add(triPrism(3.2, 0.9, 0.5), m.stone, M(0, TOPC + 0.85, zf + 0.05), 0.9);
    for (const sx of [-1, 1]) {
      batch.add(box(0.5, 0.5, 0.5, 1), m.stoneLight, M(sx * (AV - 0.25), TOPC + 1.1, zf), 0.85);
      batch.add(new THREE.SphereGeometry(0.17, 12, 8), m.gold, M(sx * (AV - 0.25), TOPC + 1.5, zf));
    }
    batch.add(new THREE.OctahedronGeometry(0.42, 0), m.gold, M(0, TOPC + 2.05, zf + 0.05, 0, 0, 0, 0.55, 1, 0.25));
    batch.add(new THREE.OctahedronGeometry(0.42, 0), m.gold, M(0, TOPC + 2.05, zf + 0.05, 0, 0, Math.PI / 2, 0.55, 1, 0.25));
    halos.push({ p: new THREE.Vector3(0, TOPC + 2.05, zf + 0.1), size: 1.4, k: 0.2, color: FAM.Astre });
    // torches de part et d'autre de la porte
    const F0 = new THREE.Matrix4().makeTranslation(0, 0, zf);
    torch(F0, -(AV - 0.45), 3.3);
    torch(F0, AV - 0.45, 3.3);
  }
  // lueur de l'arène au-dessus du parapet (feux de l'intérieur)
  for (let i = 0; i < 5; i++) halos.push({ p: new THREE.Vector3(-14 + i * 7, 11.5, FZ - 14), size: 9, k: 0.07, color: i % 2 ? FAM.Cendre : FAM.Astre });

  // ================================================================================================= la place
  // braseros : socle octogonal à bandeau doré, vasque de fer, braises et flammes ; lumière de feu (Cendre)
  for (const b of BRAZIERS) {
    batch.add(new THREE.CylinderGeometry(0.42, 0.56, 0.95, 8), m.stoneLight, M(b.x, 0.47, b.z), (p) => 0.7 + 0.3 * THREE.MathUtils.smoothstep(p.y, 0, 0.95));
    batch.add(new THREE.CylinderGeometry(0.46, 0.46, 0.08, 8), m.gold, M(b.x, 0.8, b.z));
    batch.add(new THREE.CylinderGeometry(0.66, 0.34, 0.38, 14), m.iron, M(b.x, 1.14, b.z));
    batch.add(new THREE.TorusGeometry(0.66, 0.04, 6, 20), m.gold, M(b.x, 1.33, b.z, Math.PI / 2));
    batch.add(new THREE.CircleGeometry(0.6, 14), fireCore, M(b.x, 1.31, b.z, -Math.PI / 2));
    batch.add(new THREE.ConeGeometry(0.45, 0.95, 8), fire, M(b.x, 1.78, b.z));
    batch.add(new THREE.ConeGeometry(0.24, 0.6, 7), fireCore, M(b.x - 0.12, 1.62, b.z + 0.18));
    batch.add(new THREE.ConeGeometry(0.18, 0.5, 6), fire, M(b.x + 0.2, 1.6, b.z + 0.1));
    halos.push({ p: new THREE.Vector3(b.x, 1.8, b.z + 0.3), size: 2.6, k: 0.6, color: FAM.Cendre });
    lights.push({ x: b.x, y: 1.95, z: b.z + 0.25, intensity: 4.2, radius: 10, halo: 0, flicker: 'candle', color: new THREE.Color(1.0, 0.48, 0.16) });
  }
  // lampadaires ouvragés le long de la balustrade (Astre, plaques des familles)
  P_LAMPS.forEach((l, i) => lampPost(l.x, l.z, i === 0 ? 0 : 2));
  // table des inscriptions : nappe d'Astre, registre, plume, lanterne, présentoir des affiches (sans texte), fanion
  {
    const cx = (BOOTH.x0 + BOOTH.x1) / 2;
    const cz = (BOOTH.z0 + BOOTH.z1) / 2;
    const w = BOOTH.x1 - BOOTH.x0;
    batch.add(box(w, 0.08, BOOTH.z1 - BOOTH.z0 - 0.2, 1), m.planks, M(cx, 0.9, cz), 0.9);
    for (const sx of [-1, 1]) batch.add(box(0.1, 0.88, 0.7, 1), m.planks, M(cx + sx * (w / 2 - 0.15), 0.44, cz), 0.8);
    batch.add(box(w + 0.04, 0.5, 0.03, 1), famCloth[3]!, M(cx, 0.7, BOOTH.z1 - 0.08));
    batch.add(box(w + 0.04, 0.05, 0.05, 1), m.gold, M(cx, 0.95, BOOTH.z1 - 0.07));
    batch.add(box(0.62, 0.06, 0.44, 1), m.cloth, M(cx - 0.35, 0.97, cz, 0, 0.2, 0));
    batch.add(box(0.6, 0.04, 0.42, 1), famCloth[1]!, M(cx - 0.35, 1.01, cz, 0, 0.2, 0));
    batch.add(box(0.01, 0.3, 0.01, 1), m.cloth, M(cx + 0.1, 1.08, cz + 0.1, 0.4, 0, 0.3));
    lanternCage(cx + 0.75, 1.1, cz, 0.18, 0.26, true, FAM.Astre);
    lights.push({ x: cx + 0.75, y: 1.2, z: cz + 0.35, intensity: 1.8, radius: 5.5, halo: 1.0, flicker: 'lantern', color: FAM.Astre });
    // présentoir des affiches de duel : panneau de bois, quatre affiches peintes (emblèmes), fronton doré
    const px = BOOTH.x1 + 0.5;
    batch.add(box(1.5, 1.6, 0.08, 1), m.planks, M(px, 1.6, BOOTH.z0 + 0.2), 0.85);
    for (let q = 0; q < 2; q++) batch.add(signUV(plane(0.6, 0.72), [SIGN_CELLS.cartes, SIGN_CELLS.lanterne][q]!), m.sign, M(px - 0.36 + q * 0.72, 1.62, BOOTH.z0 + 0.25));
    for (const sx of [-1, 1]) batch.add(box(0.08, 2.5, 0.08, 1), m.timber, M(px + sx * 0.78, 1.25, BOOTH.z0 + 0.2), 0.85);
    batch.add(triPrism(1.7, 0.35, 0.1), m.timber, M(px, 2.42, BOOTH.z0 + 0.25), 0.9);
    finial(px, 2.77, BOOTH.z0 + 0.2, 0.45);
  }
  // râtelier du Tournoi : lances à fanions, boucliers aux couleurs des familles, tonneaux
  {
    const pr = P_PROPS[0]!;
    const cx = (pr.x0 + pr.x1) / 2;
    batch.add(box(1.4, 0.1, 0.3, 1), m.timber, M(cx, 1.6, pr.z0 + 0.25), 0.85);
    batch.add(box(1.4, 0.1, 0.3, 1), m.timber, M(cx, 0.35, pr.z0 + 0.25), 0.85);
    for (let q = 0; q < 4; q++) {
      const lx = pr.x0 + 0.15 + q * 0.32;
      batch.add(new THREE.CylinderGeometry(0.025, 0.035, 3.0, 6), m.timber, M(lx, 1.5, pr.z0 + 0.32, 0.06), 0.9);
      batch.add(new THREE.ConeGeometry(0.05, 0.24, 6), m.iron, M(lx, 3.1, pr.z0 + 0.4));
      batch.add(plane(0.36, 0.22), banner(q), M(lx + 0.19, 2.85, pr.z0 + 0.4));
    }
    FAMILIES.forEach((_, f) => {
      const sx = pr.x0 - 0.9 + f * 0.62;
      if (f < 2) {
        batch.add(new THREE.CylinderGeometry(0.28, 0.28, 0.05, 18), famCloth[f]!, M(sx, 0.72, pr.z1 + 0.2, Math.PI / 2 - 0.25), 0.9);
        batch.add(new THREE.TorusGeometry(0.28, 0.03, 5, 18), m.gold, M(sx, 0.72, pr.z1 + 0.23, -0.25));
      }
    });
  }
  // arbustes en pots aux piliers des arcades proches de la porte, jardinières sur la balustrade
  for (const x of [-6.1, 6.1]) {
    batch.add(new THREE.CylinderGeometry(0.3, 0.22, 0.5, 12), m.planks, M(x, 0.25, FZ + 0.5), 0.8);
    batch.add(new THREE.TorusGeometry(0.3, 0.03, 5, 14), m.gold, M(x, 0.5, FZ + 0.5, Math.PI / 2));
    for (let q = 0; q < 6; q++) batch.add(new THREE.SphereGeometry(0.22 + rng() * 0.08, 8, 6), m.leaf, M(x + (rng() - 0.5) * 0.24, 0.6 + q * 0.17, FZ + 0.5 + (rng() - 0.5) * 0.2, 0, 0, 0, 1, 1.1, 1), 0.85);
  }
  for (const x of [-22.5, -13.5, 13.5, 22.5]) flowerBox(x, 1.07, P_FRONT_Z + 0.05);

  secondRow();
  hillCity();
  const mist = [...mists(MISTS), ...k.smokes()];
  const motes = dustMotes();
  return k.finishIlot(mist, motes);
}
