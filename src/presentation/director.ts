/**
 * DuelPresentationDirector — choisit la vue (A confrontation frontale / B manipulation inclinée)
 * à partir de la phase VISIBLE et de ce que le joueur doit faire. Module pur (aucun DOM/Three) :
 * il ne lit ni l’état brut ni un secret, et ne modifie jamais le moteur.
 *
 * Chorégraphie (ADR 016, qui remplace la bascule par phase de M02 §2) :
 *  - toutes les phases → A : la caméra reste proche, sur le visage du rival, y compris pendant la
 *    pose des cartes (s’éloigner vers la table cassait l’immersion) ;
 *  - le joueur peut demander la vue B ; ce choix vaut jusqu’au prochain changement de phase ;
 *  - aucune transition pendant un glisser en cours (la vue est gelée puis rattrapée).
 */
import type { Phase } from '../game/model/types';

export type ViewMode = 'A' | 'B';

export interface DirectorInput {
  phase: Phase;
  turn: number;
  awaitingMe: boolean;
  repelMine: boolean;
}

/** Vue « naturelle » d’une situation, sans préférence manuelle : toujours la vue frontale (ADR 016). */
export function naturalView(_i: DirectorInput): ViewMode {
  return 'A';
}

export class PresentationDirector {
  private override: ViewMode | null = null;
  private phaseKey = '';
  private frozen = false;
  private hold = false;
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
    // Début de tour : temps d’observation du rival en A avant la manipulation (chorégraphie §2.1).
    // Sans effet depuis l’ADR 016 (la vue naturelle est toujours A) ; gardé si une vue B revenait.
    const natural = naturalView(i);
    const want = this.override ?? (this.hold && natural === 'B' ? 'A' : natural);
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

  /** Démarre / arrête le temps d’observation du rival (la minuterie appartient à l’appelant). */
  startHold(): void {
    this.hold = true;
  }

  releaseHold(i: DirectorInput): ViewMode {
    this.hold = false;
    return this.update(i);
  }

  get holding(): boolean {
    return this.hold;
  }

  get view(): ViewMode {
    return this.current;
  }

  get manual(): boolean {
    return this.override !== null;
  }
}
