/**
 * M08 C1 — rivaux qui peuvent s’asseoir à la table depuis l’écran courant, en un seul clic : ce sont eux que la scène
 * prépare aux temps morts. Par ordre de probabilité ; pur et testé (aucun accès au DOM ni à la scène).
 */
import type { RivalPersonality } from '../presentation/personalities';
import { ENCOUNTERS, encounterById, type Encounter } from './encounters';
import type { Screen } from './flow';
import type { OutcomeEffect } from './progression';

export interface UpcomingContext {
  /** Rencontre du duel en cours (Continuer, Reprendre), ou null. */
  activeEncounter: string | null;
  /** Rencontres jouables (tableau). */
  playable: readonly string[];
  /** Effet du dernier duel (écran Résultat : manche suivante de la série). */
  lastEffect: OutcomeEffect | null;
}

/** Manche suivante de la série après un résultat (bouton « Manche suivante »), ou null. */
export function nextSeriesEncounter(eff: OutcomeEffect | null): Encounter | null {
  if (!eff?.series || eff.series.completed) return null;
  return ENCOUNTERS.find((x) => x.kind === 'series' && x.step === eff.series!.step + 1) ?? null;
}

export function upcomingRivals(screen: Screen, ctx: UpcomingContext): RivalPersonality['id'][] {
  const rivalOf = (id: string | null | undefined) => (id ? encounterById(id)?.rival ?? null : null);
  const active = rivalOf(ctx.activeEncounter);
  let ids: Array<RivalPersonality['id'] | null> = [];
  switch (screen) {
    // Accueil : « Continuer » reprend le duel en cours.
    case 'home': ids = [active]; break;
    // Tableau : un duel en cours bloque les rencontres (seul « Reprendre » reste) ; sinon, toute rencontre jouable.
    case 'board': ids = active ? [active] : ctx.playable.map(rivalOf); break;
    // Résultat : la revanche garde le même rival ; la manche suivante en amène un autre.
    case 'result': ids = [nextSeriesEncounter(ctx.lastEffect)?.rival ?? null]; break;
    default: ids = [];
  }
  return ids.filter((x, i): x is RivalPersonality['id'] => !!x && ids.indexOf(x) === i);
}
