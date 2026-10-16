/**
 * DuelPresentationDirector — choisit la vue (A confrontation frontale / B manipulation inclinée)
 * à partir de la phase VISIBLE et de ce que le joueur doit faire. Module pur (aucun DOM/Three) :
 * il ne lit ni l’état brut ni un secret, et ne modifie jamais le moteur.
 *
 * Chorégraphie (mission M02 §2) :
 *  - attente, début de tour, engagement verrouillé, révélation, tactique, résolution, fin → A
 *  - préparation (révélation volontaire), Dissipation, engagement à composer → B
 *  - le joueur peut demander l’autre vue ; ce choix vaut jusqu’au prochain changement de phase
 *  - aucune transition pendant un glisser en cours (la vue est gelée puis rattrapée)
 */
import type { Phase } from '../game/model/types';

export type ViewMode = 'A' | 'B';

export interface DirectorInput {
  phase: Phase;
  turn: number;
  awaitingMe: boolean;
  repelMine: boolean;
}

/** Vue « naturelle » d’une situation, sans préférence manuelle. */
export function naturalView(i: DirectorInput): ViewMode {
  switch (i.phase) {
    case 'PREPARE':
    case 'DISSIPATION':
    case 'COMMIT':
      return i.awaitingMe ? 'B' : 'A';
    case 'START':
      // Régulation de main / Recentrage : manipulation de cartes de la main.
      return i.awaitingMe ? 'B' : 'A';
    default:
      // LECTURE (lire le rival), TACTICS (observer le rival en choisissant), REPEL, RESOLVED, ENDED
      return 'A';
  }
}

export class PresentationDirector {
  private override: ViewMode | null = null;
  private phaseKey = '';
  private frozen = false;
  private current: ViewMode = 'A';
  /** Nombre de bascules de vue effectives (QA). */
  switches = 0;

  /** Met à jour la situation ; renvoie la vue à afficher. */
  update(i: DirectorInput): ViewMode {
    const key = `${i.turn}:${i.phase}:${i.awaitingMe ? 1 : 0}`;
    if (key !== this.phaseKey) {
      this.phaseKey = key;
      this.override = null; // une préférence manuelle ne survit pas à la phase
    }
    const want = this.override ?? naturalView(i);
    if (!this.frozen && want !== this.current) {
      this.current = want;
      this.switches++;
    }
    return this.current;
  }

  /** Bascule demandée par le joueur (bouton / touche V). */
  toggle(i: DirectorInput): ViewMode {
    const base = this.override ?? naturalView(i);
    this.override = base === 'A' ? 'B' : 'A';
    return this.update(i);
  }

  /** Gel pendant un glisser : aucune transition imposée sous le pointeur. */
  setFrozen(v: boolean, i: DirectorInput): ViewMode {
    this.frozen = v;
    return this.update(i);
  }

  get view(): ViewMode {
    return this.current;
  }

  get manual(): boolean {
    return this.override !== null;
  }
}
