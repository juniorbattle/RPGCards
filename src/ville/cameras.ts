/**
 * M09 — caméra d'exploration derrière une interface commune (`CameraRig`) : la scène, le personnage et la logique ne
 * dépendent que de cette interface. **Décision du responsable (2026-10-19, passe 39) : frontale 2.5D** (« Non, on ne
 * veut pas d'inclinaison, mais frontale. ») ; la vue de dessus inclinée, essayée une fois dans le laboratoire, est
 * retirée (ADR 024). La frontale regarde les façades depuis l'eau, ≈ 12° sous l'horizontale, plans de profondeur.
 * Aucune reprise du graphe de cadrages semi-fixes de Cité du Tournoi (interdit par M09) : une caméra suiveuse unique,
 * amortie, bornée aux limites de l'îlot. Fonction de cadrage PURE (testée) + application Three.
 */
import * as THREE from 'three';

export type CameraId = 'frontale';
export const CAMERA_IDS: readonly CameraId[] = ['frontale'];

export interface RigParams {
  id: CameraId;
  label: string;
  /** Inclinaison sous l'horizontale (degrés). */
  pitch: number;
  /** Distance de la caméra au point visé (m). */
  distance: number;
  fov: number;
  /** Hauteur du point visé au-dessus du sol (m). */
  aimY: number;
  /** Part du déplacement en profondeur (z) du personnage que suit le point visé (0 = fixe, 1 = suit tout). */
  followZ: number;
  /** z du point visé quand le personnage est au milieu de la rue. */
  aimZ: number;
  /** Bornes du point visé en x (l'îlot ne sort pas du cadre). */
  minX: number;
  maxX: number;
  /** Constante de temps de l'amorti (s). */
  tau: number;
  /** Inclinaison des personnages vers la caméra (radians, autour des pieds), pour corriger le raccourci. */
  spriteTilt: number;
  /**
   * Profondeur praticable (passe 62, facultatif) : inclinaison atteinte quand le personnage est en `zFond` (interpolée
   * depuis `aimZ`) : la caméra s'élève pour regarder dans la rue du fond.
   */
  pitchFond?: number;
  zFond?: number;
}

export const RIGS: Record<CameraId, RigParams> = {
  frontale: {
    id: 'frontale', label: 'Frontale 2.5D (8°)', pitch: 8, distance: 19, fov: 33, aimY: 3.6, followZ: 0.15, aimZ: 0,
    minX: -12.5, maxX: 12.5, tau: 0.32, spriteTilt: 0,
  },
};

/** Réglages de cadrage qu'un îlot ou l'URL peut remplacer (fiche B1 : « gardés, ajustés à l'œil »). */
export type RigTuning = Partial<Pick<RigParams, 'pitch' | 'distance' | 'fov' | 'aimY' | 'followZ' | 'aimZ' | 'pitchFond' | 'zFond'>>;

/**
 * Réglage par l'URL, pour ajuster le cadrage à l'œil sans reconstruire (laboratoire et démo) :
 * `rig=inclinaison,distance,focale,hauteur visée` (degrés, mètres, degrés, mètres), par exemple `rig=6.5,18.5,37,3`.
 * Valeurs hors des bornes raisonnables ignorées ; null si absent ou illisible.
 */
export function parseRig(s: string | null | undefined): RigTuning | null {
  if (!s) return null;
  const [pitch, distance, fov, aimY] = s.split(',').map((v) => Number(v));
  const t: RigTuning = {};
  if (pitch !== undefined && Number.isFinite(pitch) && pitch >= 0 && pitch <= 30) t.pitch = pitch;
  if (distance !== undefined && Number.isFinite(distance) && distance >= 6 && distance <= 60) t.distance = distance;
  if (fov !== undefined && Number.isFinite(fov) && fov >= 15 && fov <= 60) t.fov = fov;
  if (aimY !== undefined && Number.isFinite(aimY) && aimY >= 0 && aimY <= 12) t.aimY = aimY;
  return Object.keys(t).length ? t : null;
}

/**
 * Une scène cadrée sur des personnages (retour du responsable du 2026-10-29 : la première scène avec le rival, dont
 * l'angle « donne l'impression de manquer le cadre de vue ») : les pieds aux sept dixièmes de la hauteur de l'écran,
 * au-dessus de la boîte de dialogue et de la bande du bas, les personnages sur trois dixièmes de cette hauteur, tous dans
 * la largeur avec une marge ; la caméra suit leur profondeur. Le cadre se calcule sur la hauteur réelle des personnages
 * de l'îlot, la focale et le format de l'écran, au lieu de réglages relatifs à ceux de l'îlot.
 */
export const SUJETS = { pieds: 0.7, part: 0.3, marge: 1.1 } as const;

export function cadrageSujets(sujets: readonly { x: number; z: number }[], o: { h: number; fov: number; aspect: number; serre?: number }): { at: { x: number; z: number }; distance: number; aimY: number } {
  const xs = sujets.map((s) => s.x);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const z = sujets.reduce((t, s) => t + s.z, 0) / Math.max(1, sujets.length);
  // hauteur de champ (m) à la distance des personnages : leur part de l'écran, ou ce qu'il faut pour tous les voir
  const champ = Math.max(o.h / SUJETS.part, (x1 - x0 + 2 * SUJETS.marge * o.h) / o.aspect) / (o.serre ?? 1);
  return { at: { x: (x0 + x1) / 2, z }, distance: champ / 2 / Math.tan(THREE.MathUtils.degToRad(o.fov / 2)), aimY: (SUJETS.pieds - 0.5) * champ };
}

export interface Framing { pos: THREE.Vector3; aim: THREE.Vector3 }

/** Cadrage visé pour une position du personnage (pur : mêmes entrées, même cadrage). */
export function framingFor(p: RigParams, target: { x: number; z: number }): Framing {
  const ax = Math.min(p.maxX, Math.max(p.minX, target.x));
  const az = p.aimZ + (target.z - p.aimZ) * p.followZ;
  const aim = new THREE.Vector3(ax, p.aimY, az);
  // inclinaison selon la profondeur du personnage (passe 62) : `pitch` en `aimZ`, `pitchFond` en `zFond`
  const deep = p.pitchFond !== undefined && p.zFond !== undefined && p.zFond < p.aimZ ? THREE.MathUtils.clamp((p.aimZ - target.z) / (p.aimZ - p.zFond), 0, 1) : 0;
  const a = THREE.MathUtils.degToRad(p.pitch + (deep > 0 ? (p.pitchFond! - p.pitch) * deep : 0));
  const pos = new THREE.Vector3(ax, p.aimY + Math.sin(a) * p.distance, az + Math.cos(a) * p.distance);
  return { pos, aim };
}

export interface CameraRig {
  readonly params: RigParams;
  /**
   * Place la caméra (amortie vers le cadrage visé ; `snap` = immédiat) ; `tuning` : réglages pour cette image seulement,
   * par-dessus ceux de l'îlot (cinématiques, M11), `tau` et bornes compris.
   */
  update(camera: THREE.PerspectiveCamera, target: { x: number; z: number }, dt: number, snap?: boolean, tuning?: Partial<RigParams>): void;
  resize(camera: THREE.PerspectiveCamera, aspect: number): void;
}

/** Caméra suiveuse ; `bounds` remplace les bornes du point visé (propres à chaque îlot), `tuning` les réglages de
 *  cadrage (ceux de l'îlot, puis ceux de l'URL). */
export function createRig(id: CameraId, bounds?: { minX: number; maxX: number }, ...tuning: (RigTuning | null | undefined)[]): CameraRig {
  const params: RigParams = { ...RIGS[id], ...(bounds ?? {}) };
  for (const t of tuning) if (t) Object.assign(params, t);
  const aim = new THREE.Vector3();
  const pos = new THREE.Vector3();
  let primed = false;
  return {
    params,
    update(camera, target, dt, snap = false, tuning) {
      const p = tuning ? { ...params, ...tuning } : params;
      const f = framingFor(p, target);
      if (snap || !primed) { aim.copy(f.aim); pos.copy(f.pos); primed = true; } else {
        const k = 1 - Math.exp(-dt / p.tau);
        aim.lerp(f.aim, k);
        pos.lerp(f.pos, k);
      }
      camera.position.copy(pos);
      camera.lookAt(aim);
    },
    resize(camera, aspect) {
      camera.fov = params.fov;
      camera.aspect = aspect;
      camera.near = 0.5;
      camera.far = 400;
      camera.updateProjectionMatrix();
    },
  };
}
