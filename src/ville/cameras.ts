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
}

export const RIGS: Record<CameraId, RigParams> = {
  frontale: {
    id: 'frontale', label: 'Frontale 2.5D (13°)', pitch: 13, distance: 14, fov: 30, aimY: 1.9, followZ: 0.15, aimZ: 0,
    minX: -12.5, maxX: 12.5, tau: 0.32, spriteTilt: 0,
  },
};

export interface Framing { pos: THREE.Vector3; aim: THREE.Vector3 }

/** Cadrage visé pour une position du personnage (pur : mêmes entrées, même cadrage). */
export function framingFor(p: RigParams, target: { x: number; z: number }): Framing {
  const ax = Math.min(p.maxX, Math.max(p.minX, target.x));
  const az = p.aimZ + (target.z - p.aimZ) * p.followZ;
  const aim = new THREE.Vector3(ax, p.aimY, az);
  const a = THREE.MathUtils.degToRad(p.pitch);
  const pos = new THREE.Vector3(ax, p.aimY + Math.sin(a) * p.distance, az + Math.cos(a) * p.distance);
  return { pos, aim };
}

export interface CameraRig {
  readonly params: RigParams;
  /** Place la caméra (amortie vers le cadrage visé ; `snap` = immédiat). */
  update(camera: THREE.PerspectiveCamera, target: { x: number; z: number }, dt: number, snap?: boolean): void;
  resize(camera: THREE.PerspectiveCamera, aspect: number): void;
}

export function createRig(id: CameraId): CameraRig {
  const params = RIGS[id];
  const aim = new THREE.Vector3();
  const pos = new THREE.Vector3();
  let primed = false;
  return {
    params,
    update(camera, target, dt, snap = false) {
      const f = framingFor(params, target);
      if (snap || !primed) { aim.copy(f.aim); pos.copy(f.pos); primed = true; } else {
        const k = 1 - Math.exp(-dt / params.tau);
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
