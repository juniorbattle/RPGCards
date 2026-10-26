/**
 * M11-B — tout le monde progresse (`docs/m11/03_PROGRESSION_DES_PNJ.md`, PROPOSÉ ; ADR 039). Données et logique PURES :
 * six tempéraments, chacun lié à un profil d'IA (existant ou de niveau 2) et à un ton de répliques ; une trajectoire par
 * chapitre (I à V) pour chaque PNJ récurrent (guetteurs) ; un cran de plus après deux défaites contre le joueur. Les decks
 * et les PV restent ceux des paliers (annexe de calibrage) : seule l'IA et la parole changent. Au chapitre I, toute la
 * rue est « franche » (profil `novice` de l'annexe).
 */
import type { RivalPersonality } from '../presentation/personalities';
import { chapitreDetaille, type AventureEtat, type Issue } from './aventure';

export type Temperament = 'passif' | 'franc' | 'ruse' | 'agressif' | 'calculateur' | 'vicieux';
export const TEMPERAMENTS: readonly Temperament[] = ['passif', 'franc', 'ruse', 'agressif', 'calculateur', 'vicieux'];
export const NOM_TEMPERAMENT: Record<Temperament, string> = { passif: 'passif', franc: 'franc', ruse: 'rusé', agressif: 'agressif', calculateur: 'calculateur', vicieux: 'vicieux' };

/** Le jeu d'un tempérament : un profil d'IA (`PROFILES`) ; `ruse`, `agressif`, `tacticien` et `vicieux` sont de niveau 2 (ADR 041). */
export const PROFIL_TEMPERAMENT: Record<Temperament, RivalPersonality['aiProfile']> = {
  passif: 'timide', franc: 'novice', ruse: 'ruse', agressif: 'agressif', calculateur: 'tacticien', vicieux: 'vicieux',
};

/** Un cran de plus (« il a appris ») : passif → franc → agressif → vicieux ; rusé → vicieux ; calculateur et vicieux restent. */
export const CRAN: Record<Temperament, Temperament> = { passif: 'franc', franc: 'agressif', agressif: 'vicieux', ruse: 'vicieux', calculateur: 'calculateur', vicieux: 'vicieux' };

type T5 = readonly [Temperament, Temperament, Temperament, Temperament, Temperament];
/** Trajectoires des PNJ récurrents, chapitres I à V (contrat 3, §3). */
export const TRAJECTOIRES: Readonly<Record<string, T5>> = {
  'rue-docker': ['franc', 'franc', 'agressif', 'agressif', 'vicieux'],
  'rue-joueuse': ['franc', 'passif', 'calculateur', 'calculateur', 'calculateur'],
  'rue-commis': ['franc', 'passif', 'ruse', 'vicieux', 'vicieux'],
  'rue-cour': ['franc', 'agressif', 'agressif', 'vicieux', 'vicieux'],
  'rue-port': ['franc', 'franc', 'franc', 'agressif', 'agressif'],
  'rue-haute': ['franc', 'calculateur', 'calculateur', 'calculateur', 'vicieux'],
  'membre-Cendre': ['franc', 'agressif', 'agressif', 'agressif', 'vicieux'],
  'membre-Ronce': ['franc', 'passif', 'franc', 'calculateur', 'calculateur'],
  'membre-Voile': ['franc', 'ruse', 'ruse', 'vicieux', 'vicieux'],
  'membre-Astre': ['franc', 'calculateur', 'calculateur', 'calculateur', 'calculateur'],
};

/**
 * Tempéraments des figures et de Kaï, dans leurs répliques seulement (leur profil d'IA est celui de l'annexe) : les cadets
 * gagnent en assurance, les bras droits et les chefs restent dans leur voix ; Kaï franc, agressif, calculateur, vicieux
 * puis apaisé.
 */
const FIG: Record<'cadet' | 'brasDroit' | 'chef', T5> = {
  cadet: ['franc', 'franc', 'agressif', 'agressif', 'calculateur'],
  brasDroit: ['franc', 'ruse', 'calculateur', 'calculateur', 'calculateur'],
  chef: ['calculateur', 'calculateur', 'calculateur', 'calculateur', 'calculateur'],
};
const KAI: T5 = ['franc', 'agressif', 'agressif', 'calculateur', 'vicieux'];

/**
 * Proposition de la fiche (désactivée) : les profils de tempérament aussi au jeu pour Kaï et les revanches des figures.
 * Faux : leur profil d'IA est celui de l'annexe de calibrage (`PROFIL_ROLE`, rôle `rival` : offensif).
 */
export const TEMPERAMENTS_AU_JEU_FIGURES = false;

/** Index 0 à 4 du chapitre de la trame (le prologue compte comme I, le titre comme V). */
export function indexChapitre(e: AventureEtat): number {
  const ch = chapitreDetaille(e);
  return ch === 'prologue' || ch === 'I' ? 0 : ch === 'II' ? 1 : ch === 'III' ? 2 : ch === 'IV' ? 3 : 4;
}

/** Défaites d'un PNJ contre le joueur (victoires du joueur), d'après l'historique public des duels. */
export const defaitesDe = (id: string, historique: readonly { rencontre: string; issue: Issue }[]): number => historique.filter((h) => h.rencontre === id && h.issue === 'victoire').length;

/** Tempérament d'un PNJ récurrent (null si ce n'en est pas un). */
export function temperamentDe(id: string, e: AventureEtat, historique: readonly { rencontre: string; issue: Issue }[] = []): Temperament | null {
  const t = TRAJECTOIRES[id];
  if (!t) return null;
  const base = t[indexChapitre(e)]!;
  return defaitesDe(id, historique) >= 2 ? CRAN[base] : base;
}

/** Profil d'IA d'un PNJ récurrent selon son tempérament (null : pas de tempérament au jeu, profil du rôle). */
export function profilTemperament(id: string, e: AventureEtat, historique: readonly { rencontre: string; issue: Issue }[] = []): RivalPersonality['aiProfile'] | null {
  const t = temperamentDe(id, e, historique);
  return t ? PROFIL_TEMPERAMENT[t] : null;
}

/** Tempérament d'une figure structurante ou de Kaï, pour ses répliques. */
export function temperamentParole(id: string, e: AventureEtat, historique: readonly { rencontre: string; issue: Issue }[] = []): Temperament {
  const r = temperamentDe(id, e, historique);
  if (r) return r;
  const i = indexChapitre(e);
  if (id === 'kai' || id.startsWith('rival') || id === 'brasDroit-Cendre') return KAI[i]!;
  const role = id.split('-')[0] as keyof typeof FIG;
  return (FIG[role] ?? FIG.chef)[i]!;
}
