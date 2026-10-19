/**
 * Rival 2.5D procédural (esthétique HD-2D : éléments peints par code, en couches dans la 3D).
 * L’animation n’utilise que : l’expression demandée (issue de l’ExpressionDirector, faits publics),
 * la taille publique de la main adverse et une RNG d’animation seedée. Aucun accès au moteur.
 * M08 C1 : les rivaux qui peuvent apparaître sont préparés aux temps morts (`prepareRivals`, fin de module).
 */
import * as THREE from 'three';
import { hashString, makeRng } from '../game/engine/rng';
import type { Expression, Gaze, Gesture } from '../presentation/expression';
import type { Mood, RivalPersonality } from '../presentation/personalities';
import {
  browTexture, headTexture, hoodTexture, irisTexture, lidTexture, MOUTHS, mouthTexture, scleraTexture, torsoTexture,
  type MouthShape,
} from './rivalTextures';
import { usesV2 } from './figureStyle';
import { figureV2Art, figureV2ArtSteps, RIG_V2, runSteps, type BrowShape, type FigureV2Art } from './figureV2';
import { IdleWork } from './idleWork';
import { kitV2 } from './v2';

interface FaceParams {
  browL: number; // haussement −1..1
  browR: number;
  browAngle: number; // + = froncé (intérieur bas), − = triste
  lid: number; // 0 ouvert … 1 fermé ; < 0 = écarquillé
  tilt: number;
  flush: number;
  mouth: MouthShape;
}

const MOODS: Record<Mood, FaceParams> = {
  neutral: { browL: 0, browR: 0, browAngle: 0, lid: 0.12, tilt: 0, flush: 0, mouth: 'neutral' },
  focused: { browL: -0.3, browR: -0.3, browAngle: 0.35, lid: 0.32, tilt: 0, flush: 0, mouth: 'tight' },
  confident: { browL: 0.15, browR: 0.05, browAngle: 0.1, lid: 0.22, tilt: 0.04, flush: 0, mouth: 'smirk' },
  smug: { browL: 0.45, browR: -0.15, browAngle: 0.05, lid: 0.38, tilt: 0.07, flush: 0, mouth: 'smirk' },
  pleased: { browL: 0.25, browR: 0.25, browAngle: -0.05, lid: 0.25, tilt: 0.03, flush: 0.1, mouth: 'smile' },
  triumphant: { browL: 0.4, browR: 0.4, browAngle: -0.1, lid: 0.15, tilt: -0.03, flush: 0.2, mouth: 'grin' },
  surprised: { browL: 0.85, browR: 0.85, browAngle: -0.3, lid: -0.3, tilt: 0, flush: 0, mouth: 'open' },
  pained: { browL: -0.1, browR: -0.1, browAngle: -0.65, lid: 0.55, tilt: -0.06, flush: 0.55, mouth: 'grimace' },
  annoyed: { browL: -0.35, browR: -0.35, browAngle: 0.55, lid: 0.35, tilt: 0, flush: 0.15, mouth: 'frown' },
  angry: { browL: -0.55, browR: -0.55, browAngle: 0.95, lid: 0.28, tilt: 0, flush: 0.45, mouth: 'grimace' },
  relieved: { browL: 0.3, browR: 0.3, browAngle: -0.45, lid: 0.45, tilt: 0.03, flush: 0, mouth: 'smile' },
  defeated: { browL: -0.2, browR: -0.2, browAngle: -0.8, lid: 0.62, tilt: -0.08, flush: 0.2, mouth: 'frown' },
  thinking: { browL: 0.35, browR: -0.2, browAngle: 0.15, lid: 0.3, tilt: 0.08, flush: 0, mouth: 'tight' },
  shocked: { browL: 1, browR: 1, browAngle: -0.4, lid: -0.35, tilt: 0, flush: 0.1, mouth: 'open' },
};

const GAZE: Record<Gaze, [number, number]> = {
  player: [0, 0.05],
  table: [0, -0.75],
  'own-cards': [-0.35, -0.8],
  'player-cards': [0.1, -0.55],
  away: [0.75, 0.15],
};

/**
 * M03.2 — le rival « en buste derrière la table », aux proportions de la preview : tête agrandie
 * (`HEAD_SCALE`), épaules proches du bord (`NECK_Y`), assis plus près de la table. La caméra cadre
 * `HEAD_WORLD` : abaisser la tête resserre donc le cadrage et grandit tout le personnage à l’écran.
 */
export const RIVAL_Z = -2.7;
const NECK_Y = 1.72;
const HEAD_SCALE = 1.34;
export const HEAD_WORLD = new THREE.Vector3(0, NECK_Y + 0.6 * HEAD_SCALE, RIVAL_Z);
/** Poitrine du rival (origine des effets qui le visent). */
export const CHEST_WORLD = new THREE.Vector3(0, NECK_Y - 0.35, RIVAL_Z + 0.4);

/** Lumière « peinte » des couches du rival (M03.2) : une part de la texture est auto-éclairée, au lieu
 *  d’une lumière d’appoint qui coûtait à chaque fragment de la scène. */
const SELF_LIGHT = 0.26;

function plane(w: number, h: number, map: THREE.Texture, order: number, opts: { lit?: boolean } = {}): THREE.Mesh {
  // alphaTest : les texels transparents des grands plans (buste, capuche) sont rejetés avant l’éclairage.
  const mat = opts.lit === false
    ? new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, side: THREE.DoubleSide, alphaTest: 0.01 })
    : new THREE.MeshLambertMaterial({ map, transparent: true, depthWrite: false, side: THREE.DoubleSide, alphaTest: 0.01, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: SELF_LIGHT });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.renderOrder = order;
  return m;
}

/** Texture d’un canvas de couche (mêmes réglages que `rivalTextures`). */
function canvasTexture(c: HTMLCanvasElement): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export interface RivalRig {
  group: THREE.Group;
  setExpression(e: Expression): void;
  setHandCount(n: number): void;
  update(dt: number, t: number, reduced: boolean): void;
  /** Expression courante (QA / captures). */
  current(): { mood: Mood; gesture: Gesture | null; cause: string };
  dispose(): void;
}

/**
 * Rig du rival à la table. M08 C1 : pris tout prêt s’il a été préparé aux temps morts (`prepareRivals` : couches
 * générées, rig construit, textures envoyées au GPU), sinon construit sur place comme avant (mêmes couches, même rendu).
 */
export function createRival(p: RivalPersonality, artSeed: number, backTexture: THREE.Texture): RivalRig {
  adoptBack(backTexture);
  const key = prepKey(p.id, artSeed);
  if (shown) work.cancel(`shown|${shown.key}`);
  if (work.has(key)) work.finish(key); // préparation en cours : achevée sur place
  const r = ready.get(key);
  ready.delete(key);
  let built: BuiltRig;
  if (r?.rig && r.back === backTexture) { prepCounters.taken++; built = r.rig; } else {
    r?.rig?.dispose();
    prepCounters.built++;
    built = buildRival(p, artSeed, backTexture, r?.art ?? undefined);
  }
  shown = { key, built };
  return built.rig;
}

interface BuiltRig {
  rig: RivalRig;
  /** Textures propres au rig (toutes les formes de bouche et de sourcils comprises), pour l’envoi anticipé au GPU. */
  textures: THREE.Texture[];
  /** Toutes ses textures sont déjà envoyées au GPU. */
  uploaded: boolean;
  dispose(): void;
  /** La même libération, en étapes (étalée aux temps morts). */
  disposeSteps(): Generator<void, void, void>;
}

function buildRival(p: RivalPersonality, artSeed: number, backTexture: THREE.Texture, art?: FigureV2Art | null): BuiltRig {
  const group = new THREE.Group();
  group.position.set(0, 0, RIVAL_Z);
  const rng = makeRng(hashString(`anim|${p.id}|${artSeed}`));

  // M07 L5 : modèle « vectoriel V2 » (défaut) ; null = ancien rendu V1 (`?qa=1&figure=v1`), inchangé.
  const kit = usesV2(p.id) ? kitV2(p.id) : null;
  const v2 = kit ? art ?? figureV2Art(kit, artSeed) : null;
  if (kit) prepCounters.generated += art ? 0 : 1;

  const body = new THREE.Group(); // respiration, inclinaison
  group.add(body);
  const torso = plane(2.7, 2.1, v2 ? canvasTexture(v2.torso) : torsoTexture(p, artSeed), 1);
  torso.position.set(0, NECK_Y - 0.8, 0);
  body.add(torso);

  const neckPivot = new THREE.Group();
  neckPivot.position.set(0, NECK_Y, 0.02);
  neckPivot.scale.setScalar(HEAD_SCALE);
  body.add(neckPivot);
  if (v2) {
    // V2 : capuche et pèlerine sur un plan plus grand, DEVANT le buste (ordre 1,5) et derrière la tête.
    const hood = plane(RIG_V2.hood.w, RIG_V2.hood.h, canvasTexture(v2.hood), 1.5);
    hood.position.set(0, RIG_V2.hood.y, -0.02);
    neckPivot.add(hood);
  } else if (p.look.outfit === 'cloak') {
    // Capuche derrière la tête (suit l’inclinaison du cou).
    const hood = plane(1.62, 1.82, hoodTexture(p), 1);
    hood.position.set(0, 0.5, -0.02);
    neckPivot.add(hood);
  }
  const head = plane(1.15, 1.4, v2 ? canvasTexture(v2.head) : headTexture(p, artSeed), 2);
  head.position.set(0, 0.6, 0);
  head.onBeforeRender = captureRenderer;
  neckPivot.add(head);
  if (v2) {
    // V2 : mèches avant et frange sur une couche au-dessus des yeux et des sourcils.
    const front = plane(1.15, 1.4, canvasTexture(v2.front), 7);
    front.position.set(0, 0.6, 0.012);
    neckPivot.add(front);
  }

  // Repère visage (coordonnées locales de la tête : centre du plan)
  const face = new THREE.Group();
  face.position.set(0, 0.6, 0.01);
  neckPivot.add(face);

  const eyes: Array<{ iris: THREE.Mesh; lid: THREE.Mesh; brow: THREE.Mesh; side: number; low?: THREE.Mesh; shut?: THREE.Mesh }> = [];
  let browTex: Record<BrowShape, THREE.CanvasTexture> | null = null;
  if (v2) {
    // V2 : paupières découpées dans la tête, qui glissent (cils d’épaisseur constante) ; paupière inférieure pour le
    // plissement ; paupière close pour le clignement ; sclère et sourcils en miroir pour l’œil droit.
    const sclera = canvasTexture(v2.sclera);
    const iris = canvasTexture(v2.iris);
    browTex = { rest: canvasTexture(v2.brows.rest), arch: canvasTexture(v2.brows.arch), knit: canvasTexture(v2.brows.knit) };
    for (const side of [-1, 1]) {
      const i = side < 0 ? 0 : 1;
      const e = new THREE.Group();
      e.position.set(side * 0.21, 0.02, 0);
      face.add(e);
      const sc = plane(RIG_V2.sclera.w, RIG_V2.sclera.h, sclera, 3);
      if (side > 0) sc.scale.x = -1;
      e.add(sc);
      const ir = plane(RIG_V2.iris, RIG_V2.iris, iris, 4);
      ir.position.z = 0.002;
      e.add(ir);
      const low = plane(RIG_V2.low.w, RIG_V2.low.h, canvasTexture(v2.lidLow[i]), 5);
      low.position.set(0, RIG_V2.low.y, 0.003);
      e.add(low);
      const lid = plane(RIG_V2.up.w, RIG_V2.up.h, canvasTexture(v2.lidUp[i]), 5.1);
      lid.position.set(0, RIG_V2.up.y, 0.004);
      e.add(lid);
      const shut = plane(RIG_V2.shut.w, RIG_V2.shut.h, canvasTexture(v2.lidShut[i]), 5.2);
      shut.position.set(0, RIG_V2.shut.y, 0.005);
      shut.visible = false;
      e.add(shut);
      const brow = plane(RIG_V2.brow.w, RIG_V2.brow.h, browTex.rest, 6);
      brow.position.set(side * 0.21, RIG_V2.brow.y, 0.006);
      if (side > 0) brow.scale.x = -1;
      face.add(brow);
      eyes.push({ iris: ir, lid, brow, side, low, shut });
    }
  } else {
    const sclera = scleraTexture();
    const iris = irisTexture(p.look.eyes);
    const lidT = lidTexture(p);
    const browT = browTexture(p);
    for (const side of [-1, 1]) {
      const e = new THREE.Group();
      e.position.set(side * 0.21, 0.02, 0);
      face.add(e);
      const sc = plane(0.27, 0.17, sclera, 3);
      e.add(sc);
      const ir = plane(0.14, 0.14, iris, 4);
      ir.position.z = 0.002;
      e.add(ir);
      const lidGeo = new THREE.PlaneGeometry(0.29, 0.19);
      lidGeo.translate(0, -0.095, 0); // pivot sur le bord supérieur
      const lid = new THREE.Mesh(lidGeo, new THREE.MeshLambertMaterial({ map: lidT, transparent: true, depthWrite: false }));
      lid.renderOrder = 5;
      lid.position.set(0, 0.095, 0.004);
      e.add(lid);
      const brow = plane(0.32, 0.08, browT, 6);
      brow.position.set(side * 0.21, 0.2, 0.006);
      if (side > 0) brow.scale.x = -1;
      face.add(brow);
      eyes.push({ iris: ir, lid, brow, side });
    }
  }
  const mouthTex = (v2
    ? Object.fromEntries(MOUTHS.map((m) => [m, canvasTexture(v2.mouths[m])]))
    : Object.fromEntries(MOUTHS.map((m) => [m, mouthTexture(m)]))) as Record<MouthShape, THREE.CanvasTexture>;
  const mouth = plane(0.36, 0.18, mouthTex.neutral, 6);
  mouth.position.set(0, -0.3, 0.006);
  face.add(mouth);
  // V2 : rougeur peinte sur les pommettes (texture), au-dessus des paupières découpées ; V1 : bandeau uni.
  const flushMat = v2
    ? new THREE.MeshBasicMaterial({ map: canvasTexture(v2.flush), transparent: true, opacity: 0, depthWrite: false })
    : new THREE.MeshBasicMaterial({ color: 0xff4a4a, transparent: true, opacity: 0, depthWrite: false });
  const flush = new THREE.Mesh(new THREE.PlaneGeometry(v2 ? RIG_V2.flush.w : 0.75, v2 ? RIG_V2.flush.h : 0.16), flushMat);
  flush.renderOrder = v2 ? 6.5 : 4;
  flush.position.set(0, -0.12, v2 ? 0.007 : 0.003);
  face.add(flush);

  // Éventail de cartes tenu derrière le bord de la table : taille publique de la main. M07 : plus de mains
  // peintes (décision du responsable, ADR 017) ; le pied de l’éventail passe sous le plateau, que la table cache.
  const FAN_REST = new THREE.Vector3(0, 0.98, 0.7);
  const fan = new THREE.Group();
  fan.position.copy(FAN_REST);
  group.add(fan);
  const fanCards: THREE.Mesh[] = [];
  for (let i = 0; i < 6; i++) {
    const geo = new THREE.PlaneGeometry(0.42, 0.6);
    geo.translate(0, 0.3, 0); // pivot au bas de la carte : vrai éventail
    const c = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: backTexture, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    c.renderOrder = 6;
    c.position.set(0, 0, 0.002 * i);
    fan.add(c);
    fanCards.push(c);
  }
  // Carte posée (geste « engage une carte »)
  const placed = plane(0.42, 0.6, backTexture, 2);
  placed.rotation.x = -Math.PI / 2;
  placed.position.set(0.25, 1.07, 1.35);
  (placed.material as THREE.Material).opacity = 0;
  group.add(placed);

  // État d’animation
  let target: Expression = { mood: p.restMood, intensity: 0.4, gaze: 'player', gesture: null, hold: 0, cause: 'repos' };
  const cur: FaceParams & { gx: number; gy: number; squint: number } = { ...(v2 ? v2.moods.neutral : MOODS.neutral), gx: 0, gy: 0, squint: 0 };
  let browShape: BrowShape = 'rest';
  let gestureT = -1;
  let gesture: Gesture | null = null;
  let nextBlink = 1.5 + rng() * 3;
  let blinkT = -1;
  let saccade: [number, number] = [0, 0];
  let nextSaccade = 0.8 + rng() * 2;
  let handCount = 4;
  let placedAlpha = 0;

  function setHandCount(n: number): void {
    handCount = Math.max(0, Math.min(6, n));
    fanCards.forEach((c, i) => {
      c.visible = i < handCount;
      const a = handCount <= 1 ? 0 : (i - (handCount - 1) / 2) * 0.24;
      c.rotation.z = -a;
      c.position.x = a * 0.2;
    });
  }
  setHandCount(4);

  const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

  const rig: RivalRig = {
    group,
    setExpression(e: Expression) {
      target = e;
      if (e.gesture) {
        gesture = e.gesture;
        gestureT = 0;
      }
    },
    setHandCount,
    current() {
      return { mood: target.mood, gesture, cause: target.cause };
    },
    update(dt: number, t: number, reduced: boolean) {
      const moods: Record<Mood, FaceParams> = v2 ? v2.moods : MOODS;
      const base = moods[target.mood];
      const k = target.intensity;
      const want: FaceParams = {
        browL: base.browL * k,
        browR: base.browR * k,
        browAngle: base.browAngle * k,
        lid: moods.neutral.lid + (base.lid - moods.neutral.lid) * k,
        tilt: base.tilt * k,
        flush: base.flush * k,
        mouth: k > 0.2 ? base.mouth : 'neutral',
      };
      const s = reduced ? 1 : 1 - Math.exp(-dt * 9);
      cur.browL = lerp(cur.browL, want.browL, s);
      cur.browR = lerp(cur.browR, want.browR, s);
      cur.browAngle = lerp(cur.browAngle, want.browAngle, s);
      cur.lid = lerp(cur.lid, want.lid, s);
      cur.tilt = lerp(cur.tilt, want.tilt, s);
      cur.flush = lerp(cur.flush, want.flush, s);
      if (cur.mouth !== want.mouth) {
        cur.mouth = want.mouth;
        (mouth.material as THREE.MeshLambertMaterial).map = mouthTex[cur.mouth];
        // V2 : l’auto-éclairage suit la forme affichée (V1 garde celui de la bouche neutre, défaut relevé en L5).
        if (v2) (mouth.material as THREE.MeshLambertMaterial).emissiveMap = mouthTex[cur.mouth];
        (mouth.material as THREE.MeshLambertMaterial).needsUpdate = true;
      }
      if (v2 && browTex) {
        cur.squint = lerp(cur.squint, v2.moods[target.mood].squint * k, s);
        const shape: BrowShape = k > 0.2 ? v2.moods[target.mood].brow : 'rest';
        if (shape !== browShape) {
          browShape = shape;
          for (const e of eyes) {
            (e.brow.material as THREE.MeshLambertMaterial).map = browTex[shape];
            (e.brow.material as THREE.MeshLambertMaterial).emissiveMap = browTex[shape];
            (e.brow.material as THREE.MeshLambertMaterial).needsUpdate = true;
          }
        }
      }
      // Regard + micro-saccades seedées
      if (!reduced && t > nextSaccade) {
        saccade = [(rng() - 0.5) * 0.25, (rng() - 0.5) * 0.15];
        nextSaccade = t + 0.6 + rng() * 2.2;
      }
      const [gx, gy] = GAZE[target.gaze];
      cur.gx = lerp(cur.gx, gx + saccade[0], reduced ? 1 : 1 - Math.exp(-dt * 14));
      cur.gy = lerp(cur.gy, gy + saccade[1], reduced ? 1 : 1 - Math.exp(-dt * 14));
      // Clignement
      let blink = 0;
      if (!reduced) {
        if (blinkT < 0 && t > nextBlink) blinkT = 0;
        if (blinkT >= 0) {
          blinkT += dt;
          blink = Math.sin(Math.min(1, blinkT / 0.16) * Math.PI);
          if (blinkT > 0.16) { blinkT = -1; nextBlink = t + 1.8 + rng() * 4; }
        }
      }
      const lidVal = Math.max(cur.lid, blink);
      for (const e of eyes) {
        const raise = e.side < 0 ? cur.browL : cur.browR;
        const wide = Math.max(0, -cur.lid) * 0.05;
        if (e.low && e.shut) {
          // V2 : la paupière glisse (cils d’épaisseur constante) ; au-delà de 0,8, paupière close dessinée.
          e.iris.position.x = cur.gx * RIG_V2.gaze.x;
          e.iris.position.y = cur.gy * RIG_V2.gaze.y;
          e.lid.position.y = RIG_V2.up.y - RIG_V2.lidShift(lidVal);
          e.shut.visible = lidVal > 0.8;
          e.low.position.y = RIG_V2.low.y + RIG_V2.squintShift(cur.squint);
          e.brow.position.y = RIG_V2.brow.y + raise * 0.06 + wide;
          // Sens corrigé en V2 : browAngle > 0 abaisse la tête du sourcil (côté nez).
          e.brow.rotation.z = e.side * cur.browAngle * 0.35;
          continue;
        }
        e.iris.position.x = cur.gx * 0.055;
        e.iris.position.y = cur.gy * 0.03;
        e.lid.scale.y = Math.max(0.001, lidVal);
        e.lid.visible = lidVal > 0.01;
        e.brow.position.y = 0.2 + raise * 0.06 + wide;
        e.brow.rotation.z = e.side * -cur.browAngle * 0.35;
      }
      flushMat.opacity = cur.flush * 0.35;
      flush.visible = flushMat.opacity > 0.002; // invisible = aucun fragment à mélanger

      // Corps : respiration, tilt, gestes
      const breath = reduced ? 0 : Math.sin(t * 1.6) * 0.012;
      body.scale.y = 1 + breath;
      neckPivot.rotation.z = cur.tilt + (reduced ? 0 : Math.sin(t * 0.7) * 0.012);
      neckPivot.rotation.x = cur.gy * -0.06;
      neckPivot.position.y = NECK_Y;
      group.position.z = RIVAL_Z;
      body.position.y = 0;
      fan.position.copy(FAN_REST);
      fan.rotation.x = 0;
      fan.position.y += reduced ? 0 : Math.sin(t * 1.3) * 0.01;
      if (gesture && gestureT >= 0) {
        gestureT += dt;
        const g = gesture;
        const dur = g === 'laugh' ? 1.2 : g === 'slump' ? 1.4 : 0.9;
        const u = Math.min(1, gestureT / dur);
        const env = Math.sin(u * Math.PI);
        if (!reduced) {
          if (g === 'nod') neckPivot.rotation.x += Math.sin(u * Math.PI * 4) * 0.08 * (1 - u);
          if (g === 'shake-head') neckPivot.rotation.y = Math.sin(u * Math.PI * 4) * 0.1 * (1 - u);
          if (g === 'tilt') neckPivot.rotation.z += env * 0.08;
          if (g === 'recoil') { group.position.z = RIVAL_Z - env * 0.25; neckPivot.rotation.x -= env * 0.12; }
          if (g === 'laugh') { neckPivot.position.y = NECK_Y + Math.abs(Math.sin(u * Math.PI * 6)) * 0.035; neckPivot.rotation.x -= env * 0.1; }
          if (g === 'lean-in') group.position.z = RIVAL_Z + env * 0.3;
        }
        if (g === 'slump') { body.position.y = -0.12 * (reduced ? 1 : Math.min(1, u * 2)); neckPivot.rotation.x += 0.12; }
        if (g === 'place-card' || g === 'flip-card') {
          // L’éventail s’incline vers la table pendant que la carte se pose.
          if (!reduced) { fan.rotation.x = env * 0.32; fan.position.z += env * 0.12; }
          if (g === 'place-card' && u > 0.45) placedAlpha = 1;
        }
        if (u >= 1 && g !== 'slump') { gesture = null; gestureT = -1; }
      }
      placedAlpha = Math.max(0, placedAlpha - dt * (gesture === 'place-card' ? 0 : 0.6));
      (placed.material as THREE.MeshLambertMaterial).opacity = placedAlpha;
      placed.visible = placedAlpha > 0.01;
    },
    dispose() {
      // M08 C1 : rig retiré de la scène, libéré après la première image de son remplaçant (programmes GPU gardés).
      if (mode === 'off') disposeNow(); else retired.push(built);
    },
  };
  /** Libération en étapes (une couche par étape) : `disposeNow` les enchaîne, les temps morts les étalent (M08 C1). */
  function* disposeSteps(): Generator<void, void, void> {
    const meshes: THREE.Mesh[] = [];
    group.traverse((o) => meshes.push(o as THREE.Mesh));
    for (const m of meshes) {
      m.geometry?.dispose();
      const mat = m.material as THREE.MeshLambertMaterial | undefined;
      // Le verso des cartes est partagé avec l’arène (qui le libère elle-même).
      if (mat?.map && mat.map !== backTexture) mat.map.dispose();
      mat?.dispose();
      yield;
    }
    // Formes de bouche non affichées à cet instant (déjà envoyées au GPU si elles ont été montrées) :
    // sans cela, chaque duel laissait en mémoire les bouches de ses expressions passées (QA M06 J).
    for (const t of [...Object.values(mouthTex), ...Object.values(browTex ?? {})]) { t.dispose(); yield; }
  }
  function disposeNow(): void {
    runSteps(disposeSteps());
  }
  const textures = new Set<THREE.Texture>([...Object.values(mouthTex), ...Object.values(browTex ?? {})]);
  group.traverse((o) => {
    const map = ((o as THREE.Mesh).material as THREE.MeshLambertMaterial | undefined)?.map;
    if (map && map !== backTexture) textures.add(map);
  });
  const built: BuiltRig = { rig, textures: [...textures], uploaded: false, dispose: disposeNow, disposeSteps };
  return built;
}

// ---------------------------------------------------------------------------------------------------------------
// M08 C1 — préparation des rivaux aux temps morts

/**
 * Mode de préparation : `full` (défaut : couches, rig et textures envoyées au GPU, programmes gardés), `art` (couches
 * seules, programmes gardés) ou `off` (rien, comme avant C1) ; les deux derniers ne servent qu’à la mesure (`?qa=1&prep=…`).
 */
export type PrepMode = 'full' | 'art' | 'off';
let mode: PrepMode = 'full';
export function setPrepMode(m: PrepMode): void {
  mode = m;
}

/** Préparation prête : couches seules (`art`) ou rig complet, construit avec le verso de cartes de l’arène `back`. */
interface Ready { art?: FigureV2Art | null; rig?: BuiltRig; back?: THREE.Texture }

/** Au plus autant de rivaux préparés à la fois (mémoire GPU bornée : ≈ 10 Mo de textures par rival V2). */
export const MAX_PREPARED = 6;
const work = new IdleWork();
const ready = new Map<string, Ready>();
/** Rival assis à la table : le sien n’est jamais préparé une seconde fois, mais ses textures pas encore montrées le sont. */
let shown: { key: string; built: BuiltRig } | null = null;
/** Moteur de rendu et verso de cartes de l’arène, captés au passage (l’arène n’a pas à connaître la préparation). */
let renderer: THREE.WebGLRenderer | null = null;
let lastBack: THREE.Texture | null = null;
const watchedBacks = new WeakSet<THREE.Texture>();
/** Compteurs (QA) : couches générées (préparation comprise), rigs construits sur place, rigs pris tout prêts. */
const prepCounters = { generated: 0, built: 0, taken: 0, prepared: 0, uploaded: 0 };
/**
 * Rigs retirés de la scène, libérés après la première image de leur remplaçant. Libérés avant, ils emportaient les
 * programmes GPU qu’ils partagent avec lui (45 → 36 programmes à `setRival`), recompilés à sa première image : ≈ 40 ms
 * d’à-coup même avec des textures prêtes (principe de la passe 12 : garder vivant un programme utilisé par intermittence).
 * La libération elle-même est étalée aux temps morts (une couche par étape), comme celle des préparations devenues
 * inutiles : d’un bloc, elle retardait d’une image (≈ 12 ms à 165 Hz) la seconde qui suit. File jamais suspendue
 * (libérer n’est pas générer).
 */
const retired: BuiltRig[] = [];
// Une étape par tranche : plusieurs suppressions de textures dans la même tranche retardaient encore une image.
const release = new IdleWork(1);
let released = 0;

const prepKey = (id: string, artSeed: number) => `${id}|${artSeed}`;

/**
 * Appelé au rendu de la tête du rig affiché : capte le moteur de rendu, puis confie les rigs retirés à la file de
 * libération (ses étapes ne s’exécutent qu’aux temps morts, donc après cette image).
 */
function captureRenderer(r: THREE.WebGLRenderer): void {
  renderer = r;
  for (const b of retired.splice(0)) release.add(`release|${released++}`, b.disposeSteps());
}

/** Libère sur-le-champ tout rig retiré (fin de l’arène). */
function flushRetired(): void {
  for (const k of release.keys()) release.finish(k);
  for (const b of retired.splice(0)) b.dispose();
}

/** Verso de l’arène courante ; sa libération signale la fin de l’arène : tout ce qui a été préparé pour elle est libéré. */
function adoptBack(back: THREE.Texture): void {
  lastBack = back;
  if (watchedBacks.has(back)) return;
  watchedBacks.add(back);
  back.addEventListener('dispose', () => {
    flushRetired();
    for (const k of work.keys()) work.cancel(k);
    for (const [k, r] of ready) if (r.back === back) { r.rig?.dispose(); ready.delete(k); }
    if (lastBack === back) { lastBack = null; renderer = null; shown = null; }
  });
}

/**
 * Prépare aux temps morts les rivaux qui peuvent apparaître depuis l’écran courant (par ordre de probabilité) et
 * libère les préparations devenues inutiles. Sans effet pendant un duel (`holdPreparation`).
 */
export function prepareRivals(ps: readonly RivalPersonality[], artSeed: number): void {
  const want = mode === 'off' ? [] : ps.map((p) => ({ p, key: prepKey(p.id, artSeed) }))
    .filter((x, i, all) => x.key !== shown?.key && all.findIndex((y) => y.key === x.key) === i).slice(0, MAX_PREPARED);
  const keys = new Set(want.map((x) => x.key));
  // Rival affiché : ses textures pas encore montrées (bouches, sourcils, paupière close, rougeur) sont envoyées avant
  // le duel, pas à leur première apparition pendant une commande.
  const showing = shown && mode === 'full' && !shown.built.uploaded ? `shown|${shown.key}` : null;
  if (showing) keys.add(showing);
  for (const k of work.keys()) if (!keys.has(k)) work.cancel(k);
  // Préparations devenues inutiles : libérées aux temps morts, elles aussi (d’un bloc, les ≈ 70 textures de trois rigs
  // retardaient d’une image la seconde suivante).
  for (const [k, r] of ready) if (!keys.has(k)) { if (r.rig) release.add(`release|${released++}`, r.rig.disposeSteps()); ready.delete(k); }
  if (showing && !work.has(showing)) work.add(showing, uploadSteps(shown!.built));
  for (const { p, key } of want) if (!ready.has(key) && !work.has(key)) work.add(key, prepSteps(p, artSeed, key));
}

/** Suspend la préparation (pendant un duel : aucune génération pendant une commande) ou la reprend. */
export function holdPreparation(on: boolean): void {
  work.hold(on);
}

function* prepSteps(p: RivalPersonality, artSeed: number, key: string): Generator<void, void, void> {
  const kit = usesV2(p.id) ? kitV2(p.id) : null;
  const art = kit ? yield* figureV2ArtSteps(kit, artSeed) : null;
  if (kit) prepCounters.generated++;
  if (mode === 'art' || !lastBack) { ready.set(key, { art }); return; }
  const back = lastBack;
  yield;
  const built = buildRival(p, artSeed, back, art);
  let kept = false;
  try {
    yield* uploadSteps(built);
    ready.set(key, { art, rig: built, back });
    prepCounters.prepared++;
    kept = true;
  } finally {
    if (!kept) built.dispose();
  }
}

/** Une texture par étape : le tramage des canvas et l’envoi au GPU se font ici, pas à l’apparition du rival. */
function* uploadSteps(built: BuiltRig): Generator<void, void, void> {
  for (const t of built.textures) {
    yield;
    if (!renderer) return;
    renderer.initTexture(t); // sans effet sur une texture déjà envoyée
    prepCounters.uploaded++;
  }
  built.uploaded = true;
}

/** QA : état de la préparation (temps morts, compteurs, rivaux prêts, rival affiché et ses textures). */
export function prepStats() {
  const w = work.stats();
  const rel = release.stats();
  // `pending` compte aussi les libérations en attente : « préparation au repos » = plus rien à faire aux temps morts.
  return { mode, ...w, pending: w.pending + rel.pending + retired.length, releasing: rel.pending + retired.length, ...prepCounters, ready: [...ready.keys()], shown: shown?.key ?? null, shownUploaded: shown?.built.uploaded ?? false };
}
