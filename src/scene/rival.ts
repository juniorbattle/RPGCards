/**
 * Rival 2.5D procédural (esthétique HD-2D : éléments peints par code, en couches dans la 3D).
 * L’animation n’utilise que : l’expression demandée (issue de l’ExpressionDirector, faits publics),
 * la taille publique de la main adverse et une RNG d’animation seedée. Aucun accès au moteur.
 */
import * as THREE from 'three';
import { hashString, makeRng } from '../game/engine/rng';
import type { Expression, Gaze, Gesture } from '../presentation/expression';
import type { Mood, RivalPersonality } from '../presentation/personalities';
import {
  browTexture, handTexture, headTexture, irisTexture, lidTexture, MOUTHS, mouthTexture, scleraTexture, torsoTexture,
  type MouthShape,
} from './rivalTextures';

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

export const RIVAL_Z = -2.9;
export const HEAD_WORLD = new THREE.Vector3(0, 3.1, RIVAL_Z);

function plane(w: number, h: number, map: THREE.Texture, order: number, opts: { lit?: boolean } = {}): THREE.Mesh {
  const mat = opts.lit === false
    ? new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, side: THREE.DoubleSide })
    : new THREE.MeshLambertMaterial({ map, transparent: true, depthWrite: false, side: THREE.DoubleSide });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.renderOrder = order;
  return m;
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

export function createRival(p: RivalPersonality, artSeed: number, backTexture: THREE.Texture): RivalRig {
  const group = new THREE.Group();
  group.position.set(0, 0, RIVAL_Z);
  const rng = makeRng(hashString(`anim|${p.id}|${artSeed}`));

  const body = new THREE.Group(); // respiration, inclinaison
  group.add(body);
  const torso = plane(2.4, 2.0, torsoTexture(p, artSeed), 1);
  torso.position.set(0, 1.75, 0);
  body.add(torso);

  const neckPivot = new THREE.Group();
  neckPivot.position.set(0, 2.5, 0.02);
  body.add(neckPivot);
  const head = plane(1.15, 1.4, headTexture(p, artSeed), 2);
  head.position.set(0, 0.6, 0);
  neckPivot.add(head);

  // Repère visage (coordonnées locales de la tête : centre du plan)
  const face = new THREE.Group();
  face.position.set(0, 0.6, 0.01);
  neckPivot.add(face);

  const sclera = scleraTexture();
  const iris = irisTexture(p.look.eyes);
  const lidT = lidTexture(p);
  const browT = browTexture(p);
  const eyes: Array<{ iris: THREE.Mesh; lid: THREE.Mesh; brow: THREE.Mesh; side: number }> = [];
  for (const side of [-1, 1]) {
    const e = new THREE.Group();
    e.position.set(side * 0.2, 0.02, 0);
    face.add(e);
    const sc = plane(0.24, 0.15, sclera, 3);
    e.add(sc);
    const ir = plane(0.105, 0.105, iris, 4);
    ir.position.z = 0.002;
    e.add(ir);
    const lidGeo = new THREE.PlaneGeometry(0.26, 0.17);
    lidGeo.translate(0, -0.085, 0); // pivot sur le bord supérieur
    const lid = new THREE.Mesh(lidGeo, new THREE.MeshLambertMaterial({ map: lidT, transparent: true, depthWrite: false }));
    lid.renderOrder = 5;
    lid.position.set(0, 0.085, 0.004);
    e.add(lid);
    const brow = plane(0.3, 0.075, browT, 6);
    brow.position.set(side * 0.2, 0.19, 0.006);
    if (side > 0) brow.scale.x = -1;
    face.add(brow);
    eyes.push({ iris: ir, lid, brow, side });
  }
  const mouthTex = Object.fromEntries(MOUTHS.map((m) => [m, mouthTexture(m)])) as Record<MouthShape, THREE.CanvasTexture>;
  const mouth = plane(0.36, 0.18, mouthTex.neutral, 6);
  mouth.position.set(0, -0.3, 0.006);
  face.add(mouth);
  const flushMat = new THREE.MeshBasicMaterial({ color: 0xff4a4a, transparent: true, opacity: 0, depthWrite: false });
  const flush = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.16), flushMat);
  flush.renderOrder = 4;
  flush.position.set(0, -0.12, 0.003);
  face.add(flush);

  // Mains + éventail de cartes (taille publique de la main)
  const handT = handTexture(p);
  const handL = plane(0.52, 0.52, handT, 7);
  const handR = plane(0.52, 0.52, handT, 7);
  handR.scale.x = -1;
  const handLRest = new THREE.Vector3(-0.8, 1.2, 0.65);
  const handRRest = new THREE.Vector3(0.8, 1.15, 0.65);
  handL.position.copy(handLRest);
  handR.position.copy(handRRest);
  group.add(handL, handR);
  const fan = new THREE.Group();
  fan.position.set(0.02, 0.2, -0.01);
  handL.add(fan);
  const fanCards: THREE.Mesh[] = [];
  for (let i = 0; i < 6; i++) {
    const c = plane(0.3, 0.42, backTexture, 6, { lit: true });
    c.position.set(0, 0.12, -0.002 * i);
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
  const cur: FaceParams & { gx: number; gy: number } = { ...MOODS.neutral, gx: 0, gy: 0 };
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
      const a = handCount <= 1 ? 0 : (i - (handCount - 1) / 2) * 0.22;
      c.rotation.z = -a;
      c.position.x = Math.sin(a) * -0.18;
    });
  }
  setHandCount(4);

  const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

  return {
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
      const base = MOODS[target.mood];
      const k = target.intensity;
      const want: FaceParams = {
        browL: base.browL * k,
        browR: base.browR * k,
        browAngle: base.browAngle * k,
        lid: MOODS.neutral.lid + (base.lid - MOODS.neutral.lid) * k,
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
        (mouth.material as THREE.MeshLambertMaterial).needsUpdate = true;
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
        e.iris.position.x = cur.gx * 0.055;
        e.iris.position.y = cur.gy * 0.03;
        e.lid.scale.y = Math.max(0.001, lidVal);
        e.lid.visible = lidVal > 0.01;
        const raise = e.side < 0 ? cur.browL : cur.browR;
        const wide = Math.max(0, -cur.lid) * 0.05;
        e.brow.position.y = 0.19 + raise * 0.06 + wide;
        e.brow.rotation.z = e.side * -cur.browAngle * 0.35;
      }
      flushMat.opacity = cur.flush * 0.35;

      // Corps : respiration, tilt, gestes
      const breath = reduced ? 0 : Math.sin(t * 1.6) * 0.012;
      body.scale.y = 1 + breath;
      neckPivot.rotation.z = cur.tilt + (reduced ? 0 : Math.sin(t * 0.7) * 0.012);
      neckPivot.rotation.x = cur.gy * -0.06;
      neckPivot.position.y = 2.5;
      group.position.z = RIVAL_Z;
      body.position.y = 0;
      handL.position.copy(handLRest);
      handR.position.copy(handRRest);
      handL.position.y += reduced ? 0 : Math.sin(t * 1.3) * 0.01;
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
          if (g === 'laugh') { neckPivot.position.y = 2.5 + Math.abs(Math.sin(u * Math.PI * 6)) * 0.035; neckPivot.rotation.x -= env * 0.1; }
          if (g === 'lean-in') group.position.z = RIVAL_Z + env * 0.3;
        }
        if (g === 'slump') { body.position.y = -0.12 * (reduced ? 1 : Math.min(1, u * 2)); neckPivot.rotation.x += 0.12; }
        if (g === 'place-card' || g === 'flip-card') {
          handR.position.lerp(new THREE.Vector3(0.35, 1.1, 1.25), reduced ? 0 : env);
          if (g === 'place-card' && u > 0.45) placedAlpha = 1;
        }
        if (u >= 1 && g !== 'slump') { gesture = null; gestureT = -1; }
      }
      placedAlpha = Math.max(0, placedAlpha - dt * (gesture === 'place-card' ? 0 : 0.6));
      (placed.material as THREE.MeshLambertMaterial).opacity = placedAlpha;
      placed.visible = placedAlpha > 0.01;
    },
    dispose() {
      group.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        const mat = m.material as THREE.MeshLambertMaterial | undefined;
        mat?.map?.dispose();
        mat?.dispose();
      });
    },
  };
}
