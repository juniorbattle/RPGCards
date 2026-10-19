/**
 * M08 C2 — contrat d’un lieu de duel (ADR 022).
 *
 * Un lieu = des DONNÉES (couleur de fond, brume, réglages du gréement de lumières, halo) + un MONTAGE (géométrie du
 * décor, textures peintes en code, éléments animés). Il ne touche jamais à la caméra, à la table, au rival, aux FX
 * du duel, aux HUD ni au plateau : la composition du duel est le contrat, le décor est la variable.
 *
 * Gréement fixe : tous les lieux règlent les MÊMES lumières (une ambiance, le projecteur du visage, celui de la
 * table, quatre lumières pratiques), dans le même ordre. Le nombre et le type des lumières entrent dans la clé des
 * programmes GPU de three.js : les garder fixes évite de recompiler tous les matériaux (rival et table compris) à
 * chaque changement de lieu. Position et cône des deux projecteurs restent ceux de l’arène (contrat du visage et de
 * la table) ; un lieu n’en choisit que la couleur et l’intensité.
 */
import type * as THREE from 'three';
import type { VenueId } from '../../presentation/venues';
import type { Staging, StagingMul } from '../staging';

/** Vacillement d’une lumière pratique : flamme nue, lanterne vitrée, ou fixe. */
export type Flicker = 'candle' | 'lantern' | 'none';

export interface PracticalLight {
  pos: readonly [number, number, number];
  color: number;
  intensity: number;
  distance: number;
  decay: number;
  flicker: Flicker;
}

export interface VenueLights {
  background: number;
  /** Toujours une brume linéaire (`THREE.Fog`) : même programme d’un lieu à l’autre. */
  fog: { color: number; near: number; far: number };
  house: { sky: number; ground: number; intensity: number };
  key: { color: number; intensity: number };
  stage: { color: number; intensity: number };
  practicals: readonly [PracticalLight, PracticalLight, PracticalLight, PracticalLight];
  /** Halo du post-traitement (uniformes : aucun programme nouveau). */
  bloom: { strength: number; radius: number; threshold: number };
}

export interface VenueContext {
  artSeed: number;
}

/** Décor monté dans la scène. */
export interface VenueSet {
  group: THREE.Group;
  /** Animation du décor (temps de la scène) ; `still` : mouvement réduit, rendu figé ou menus. */
  update(dt: number, clock: number, still: boolean): void;
  /** Avant chaque rendu : taille des points lumineux (flammes, halos) selon la projection courante. */
  prerender(pointScale: number): void;
  /** Mesure de coût (QA, `?qa=1&ablate=…`) : nom d’ablation → objets retirés du rendu. */
  ablatable: Partial<Record<string, THREE.Object3D[]>>;
  /** Libère géométries, matériaux et textures du décor (changement de lieu). */
  dispose(): void;
}

export interface VenueDef extends VenueLights {
  id: VenueId;
  /** Surcharge éventuelle des plans de feux hors duel (ADR 020), seulement si une mesure de contraste l’exige. */
  staging?: Partial<Record<Staging, Partial<StagingMul>>>;
  mount(ctx: VenueContext): VenueSet;
}
