/**
 * M11-A — Kaï, le rival en événements fixes (`docs/m11/02_RIVAL_EVENEMENTS_FIXES.md`, PROPOSÉ ; ADR 038). Catalogue PUR
 * des six moments écrits (K1 à K6) et déclenchement aux points de décision : il remplace « l'ombre de Kaï » (M10-E,
 * tirée par le directeur). Aucun DOM ; l'application met en scène (apparition, course, réplique, duel forcé).
 */
import type { IlotId } from '../ville/ilots';
import { chapitreDetaille, type AventureEtat } from './aventure';

export type KId = 'K1' | 'K2' | 'K3' | 'K4' | 'K5' | 'K6';
export const K_IDS: readonly KId[] = ['K1', 'K2', 'K3', 'K4', 'K5', 'K6'];
export const isKId = (x: string): x is KId => (K_IDS as readonly string[]).includes(x);

export interface EvenementRival {
  id: KId;
  titre: string;
  /** Chapitre de la trame où il est dû (il ne se rattrape pas après). */
  chapitre: ReturnType<typeof chapitreDetaille>;
  /** Îlots où il peut surgir (ville en rangs) ; `secours` : dans la ville d'aujourd'hui (sans Grande Cour ni quartiers ajoutés). */
  ilots: readonly IlotId[];
  secours: readonly IlotId[];
  /** Un duel (rôle `rival`) ou une scène seule. */
  duel: boolean;
  /** Faits supplémentaires (au-delà du chapitre). */
  faits?: (e: AventureEtat) => boolean;
}

export const EVENEMENTS_RIVAL: readonly EvenementRival[] = [
  { id: 'K1', titre: 'La Braise', chapitre: 'I', ilots: ['quai'], secours: ['quai'], duel: true, faits: (e) => !!e.affiliation && e.vaincues.includes(`cadet-${e.affiliation}`) },
  { id: 'K2', titre: 'Les Bannières', chapitre: 'II', ilots: ['quai', 'cour'], secours: ['quai'], duel: true },
  { id: 'K3', titre: 'À mi-chemin', chapitre: 'III', ilots: ['ruelles', 'parvis', 'port', 'haute'], secours: ['ruelles', 'parvis'], duel: true },
  { id: 'K4', titre: 'La dernière voie', chapitre: 'IV', ilots: ['quai', 'ruelles', 'parvis'], secours: ['quai', 'ruelles', 'parvis'], duel: true },
  { id: 'K5', titre: 'Le finaliste', chapitre: 'V', ilots: ['cour'], secours: ['parvis'], duel: true },
  { id: 'K6', titre: 'La main tendue', chapitre: 'titre', ilots: ['cour', 'parvis'], secours: ['parvis'], duel: false },
];
export const evenementDef = (id: KId): EvenementRival => EVENEMENTS_RIVAL.find((k) => k.id === id)!;

/** État du rival dans l'aventure : événements accomplis et leur issue (`scene` pour une scène sans duel). */
export interface EtatRival { faits: Partial<Record<KId, 'victoire' | 'defaite' | 'scene'>> }

export const accompli = (e: AventureEtat, id: KId): boolean => !!e.rival?.faits[id];

/**
 * L'événement du rival dû à ce point de décision dans `ilot`, ou null. `retourKai` : on revient d'un duel contre Kaï
 * (jamais deux de suite). Au plus un ; jamais au prologue ; seulement dans son chapitre.
 */
export function evenementRival(e: AventureEtat, ilot: IlotId, quaiRangs = true, retourKai = false): EvenementRival | null {
  if (retourKai || e.affiliation === null) return null;
  const ch = chapitreDetaille(e);
  for (const k of EVENEMENTS_RIVAL) {
    if (k.chapitre !== ch || accompli(e, k.id)) continue;
    if (k.faits && !k.faits(e)) continue;
    if (!(quaiRangs ? k.ilots : k.secours).includes(ilot)) continue;
    return k;
  }
  return null;
}
