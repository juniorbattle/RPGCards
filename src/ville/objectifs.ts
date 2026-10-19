/**
 * M09 V2 (provisoire) — logique PURE de la démo du Quai : objectif affiché, rencontre ouverte par chaque porte. Lit
 * seulement la progression et l'historique du produit (aucune règle de duel). Textes de prototype, non canoniques.
 */
import { SERIES, personalityOf } from '../product/encounters';
import type { Progress } from '../product/progression';
import type { DuelSummary } from '../product/save';
import { NPCS } from './quai';

export interface DemoFacts {
  progress: Progress;
  history: readonly Pick<DuelSummary, 'encounterId' | 'outcome'>[];
  /** La guide a été écoutée jusqu'au bout. */
  guide: boolean;
}

const won = (f: DemoFacts, id: string) => f.history.some((h) => h.encounterId === id && h.outcome === 'victory');

/** Objectif courant de la démo (une phrase). */
export function demoObjective(f: DemoFacts): string {
  const guide = personalityOf(NPCS.find((n) => n.role === 'guide')!.id).name;
  const docker = personalityOf('pnj-docker-1').name;
  const step = f.progress.series.step;
  if (!f.guide) return `Parlez à ${guide}, la marchande, près des tonneaux.`;
  if (!won(f, 'ville-pnj-docker-1') && step === 0) return `Défiez ${docker}, le docker, au milieu du quai.`;
  if (step < SERIES.steps.length) {
    const next = personalityOf(SERIES.steps[step]!).name;
    return `${SERIES.title}, manche ${step + 1} : ${next} vous attend dans la salle de jeu de cartes (porte aux quatre bannières).`;
  }
  return 'Le Quai est à vous : Kaï au bout du quai, Maëlle au Fanal, Sélène dans les Ruelles, Orin vers l’arène.';
}

/** Rencontre proposée par une porte ou une sortie de l'îlot (la disponibilité reste celle du produit). */
export function doorEncounter(target: string, p: Progress): string | null {
  if (target === 'salle') return p.series.step < SERIES.steps.length ? `quai-${p.series.step + 1}` : 'libre-voile';
  if (target === 'fanal') return 'libre-ronce';
  if (target === 'arene') return 'libre-astre';
  return null;
}
