/**
 * Machine d’états du FLUX PRODUIT (M04) : quels écrans existent et comment on passe de l’un à
 * l’autre. Distincte des phases du duel : le moteur ne connaît pas les menus, et ce module ne connaît
 * pas les règles (il ne lit que des faits résumés dans `FlowContext`). Pure et testée.
 *
 *   HOME → DECK | BOARD | COLLECTION | OPTIONS | HELP | DUEL (reprise)
 *   BOARD → PREP (rencontre) → DUEL → RESULT → BOARD | PREP (revanche, suivant) | HOME
 *   OPTIONS / HELP / DECK / COLLECTION → retour à l’écran d’où l’on vient
 */

export type Screen = 'home' | 'deck' | 'collection' | 'board' | 'prep' | 'duel' | 'result' | 'options' | 'help';

/** Fenêtres qui se superposent au duel sans le quitter (le duel reste en mémoire, figé). */
export type DuelOverlay = 'menu' | 'options' | 'help' | 'confirm-abandon' | 'confirm-leave' | null;

export interface FlowState {
  screen: Screen;
  /** Pile de retour pour les écrans « consultatifs » (deck, collection, options, aide). */
  back: Screen[];
  /** Rencontre sélectionnée (préparation, duel, résultat). */
  encounterId: string | null;
  overlay: DuelOverlay;
}

/** Faits nécessaires aux gardes (résumés par l’enveloppe à partir de la sauvegarde). */
export interface FlowContext {
  /** Une sauvegarde valide existe (bouton Continuer). */
  hasSave: boolean;
  /** Le deck enregistré est légal (un deck illégal ne lance jamais de duel). */
  deckLegal: boolean;
  /** Un duel est en cours (reprise possible). */
  activeDuel: string | null;
  /** Rencontres actuellement jouables (tableau). */
  playable: readonly string[];
}

export type FlowEvent =
  | { type: 'open'; screen: 'deck' | 'collection' | 'options' | 'help' }
  | { type: 'back' }
  | { type: 'home' }
  | { type: 'board' }
  | { type: 'continue' }
  | { type: 'prep'; encounterId: string }
  | { type: 'startDuel' }
  | { type: 'resumeDuel' }
  | { type: 'duelEnded' }
  | { type: 'overlay'; overlay: DuelOverlay }
  | { type: 'leaveDuel' };

export type FlowResult = { ok: true; state: FlowState } | { ok: false; reason: string };

export const INITIAL_FLOW: FlowState = { screen: 'home', back: [], encounterId: null, overlay: null };

const CONSULT: readonly Screen[] = ['deck', 'collection', 'options', 'help'];

function ok(state: FlowState): FlowResult {
  return { ok: true, state };
}

function refuse(reason: string): FlowResult {
  return { ok: false, reason };
}

/** Transition pure ; un refus porte une raison affichable (jamais un échec silencieux). */
export function transition(s: FlowState, e: FlowEvent, ctx: FlowContext): FlowResult {
  // Pendant un duel, seules les fenêtres superposées et la sortie (confirmée) sont possibles.
  if (s.screen === 'duel') {
    if (e.type === 'overlay') return ok({ ...s, overlay: e.overlay });
    if (e.type === 'duelEnded') return ok({ ...s, screen: 'result', overlay: null, back: [] });
    if (e.type === 'leaveDuel') return ok({ ...s, screen: 'board', overlay: null, back: [] });
    return refuse('Un duel est en cours : ouvrez le menu du duel pour le quitter.');
  }
  switch (e.type) {
    case 'open':
      if (s.screen === e.screen) return ok(s);
      // Pas d’empilement infini : rouvrir un écran déjà dans la pile y revient.
      if (s.back.includes(e.screen)) return ok({ ...s, screen: e.screen, back: s.back.slice(0, s.back.indexOf(e.screen)) });
      return ok({ ...s, screen: e.screen, back: [...s.back, s.screen], overlay: null });
    case 'back': {
      const prev = s.back[s.back.length - 1];
      if (!prev) return s.screen === 'home' ? ok(s) : ok({ ...s, screen: 'home', back: [] });
      return ok({ ...s, screen: prev, back: s.back.slice(0, -1) });
    }
    case 'home':
      return ok({ ...INITIAL_FLOW });
    case 'board':
      return ok({ ...s, screen: 'board', back: [], overlay: null });
    case 'continue':
      // Continuer : reprend le duel en cours s’il y en a un, sinon le tableau des rencontres.
      if (!ctx.hasSave) return refuse('Aucune partie sauvegardée.');
      if (ctx.activeDuel) return ok({ ...s, screen: 'duel', encounterId: ctx.activeDuel, back: [], overlay: null });
      return ok({ ...s, screen: 'board', back: [], overlay: null });
    case 'prep':
      if (!ctx.playable.includes(e.encounterId)) return refuse('Cette rencontre n’est pas encore disponible.');
      if (ctx.activeDuel) return refuse('Un duel est déjà en cours : reprenez-le ou abandonnez-le d’abord.');
      return ok({ ...s, screen: 'prep', encounterId: e.encounterId, back: [], overlay: null });
    case 'startDuel':
      if (s.screen !== 'prep' || !s.encounterId) return refuse('Choisissez d’abord une rencontre.');
      if (!ctx.deckLegal) return refuse('Votre deck n’est pas légal : corrigez-le avant de lancer un duel.');
      if (ctx.activeDuel) return refuse('Un duel est déjà en cours.');
      return ok({ ...s, screen: 'duel', back: [], overlay: null });
    case 'resumeDuel':
      if (!ctx.activeDuel) return refuse('Aucun duel en cours à reprendre.');
      return ok({ ...s, screen: 'duel', encounterId: ctx.activeDuel, back: [], overlay: null });
    case 'duelEnded':
    case 'leaveDuel':
    case 'overlay':
      return refuse('Aucun duel en cours.');
  }
}

/** Écrans consultatifs (empilables) — utile aux tests et à l’affichage du bouton Retour. */
export function isConsultative(screen: Screen): boolean {
  return CONSULT.includes(screen);
}
