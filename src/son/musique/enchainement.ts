/**
 * M13 — les enchaînements entre deux morceaux (retour du responsable du 2026-10-29 : « je trouve les changements de
 * musiques trop brutal, je pense que la transition devrait se faire avec une pause sans musique avant d'enchaîner vers
 * la nouvelle »). Pur, vérifié sans Web Audio (`test/m13-chef.test.ts`).
 *
 * - Un autre morceau : celui qui joue s'efface à partir du temps suivant (`FONDU_SORTIE_S`), un silence (`SILENCE_S`),
 *   puis le nouveau commence par sa levée. Plus de fondu enchaîné où deux morceaux se chevauchent.
 * - Le duel qui se tend (même thème, III-1 vers III-2) : un break. L'orchestre s'arrête net sur la phrase, sur la
 *   cymbale étouffée, une mesure de silence, puis le duel tendu repart.
 * - Un morceau prévu qui n'a pas encore commencé (on change encore d'avis pendant le silence) est remplacé sans
 *   allonger le silence.
 * - Vers le silence : le morceau s'efface, et rien ne reprend avant la fin du silence qui suit.
 */
import type { VersionId } from './catalogue';

/** Durée de l'effacement du morceau qui s'en va (s). */
export const FONDU_SORTIE_S = 1.8;
/** Le silence entre deux morceaux, après l'effacement (s) ; aussi après le jingle de fin d'un duel. */
export const SILENCE_S = 1.5;

export interface EtatEnchainement {
  now: number;
  /** La version de fond en cours, ou prévue ; null dans le silence. */
  de: VersionId | null;
  /** Son premier temps (levée comprise) ; dans le futur, elle est prévue et n'a pas commencé. */
  debutDe: number | null;
  /** Les débuts du temps et de la phrase suivants de la version en cours. */
  prochainTemps: number;
  prochainePhrase: number;
  /** Rien ne reprend avant (fin du silence qui suit un arrêt ou le jingle de fin d'un duel). */
  libre: number;
}

export interface PlanEnchainement {
  /** La sortie du morceau en cours : à partir de `a`, en `duree` s ; `coupe` : arrêt net, cymbale étouffée (le break). */
  sortie: { a: number; duree: number; coupe: boolean } | null;
  /** Le premier temps du nouveau morceau, et s'il commence par sa levée. */
  debut: number;
  intro: boolean;
}

/** Le plan d'un enchaînement vers `vers` (dont une mesure dure `mesureVers` s). */
export function planEnchainement(e: EtatEnchainement, vers: VersionId, mesureVers: number): PlanEnchainement {
  const tot = Math.max(e.libre, e.now + 0.1);
  if (!e.de) return { sortie: null, debut: tot, intro: true };
  if (e.debutDe !== null && e.debutDe > e.now) return { sortie: { a: e.now, duree: 0, coupe: false }, debut: Math.max(e.debutDe, tot), intro: true };
  if (e.de === 'III-1' && vers === 'III-2') return { sortie: { a: e.prochainePhrase, duree: 0.08, coupe: true }, debut: e.prochainePhrase + mesureVers, intro: false };
  return { sortie: { a: e.prochainTemps, duree: FONDU_SORTIE_S, coupe: false }, debut: Math.max(e.prochainTemps + FONDU_SORTIE_S + SILENCE_S, e.libre), intro: true };
}

/** La fin du silence qui suit un arrêt (vers le silence) décidé à `now`. */
export const finArret = (now: number, libre: number): number => Math.max(libre, now + 0.02 + FONDU_SORTIE_S + SILENCE_S);
