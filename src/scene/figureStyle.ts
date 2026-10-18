/**
 * M07 L5 — modèle artistique des personnages.
 * `v2` (défaut depuis la passe 25, décision du responsable) : « vectoriel V2 » (tracés écrits à la main, aplats
 * d’illustration), une identité par rival dans `src/scene/v2/`, et le duelliste joueur (portrait du HUD, passe 26).
 * `v1` : ancien rendu, gardé pour la comparaison QA (`?qa=1&figure=v1`). Le style est fixé une fois au chargement (main.ts).
 */
import { kitV2 } from './v2';
export type FigureStyle = 'v1' | 'v2';

let style: FigureStyle = 'v2';

export function setFigureStyle(s: FigureStyle): void {
  style = s;
}

export function figureStyle(): FigureStyle {
  return style;
}

/** Vrai si cette figure (id de personnalité, ou `player-<Famille>` pour le duelliste joueur) est dessinée par le modèle V2. */
export function usesV2(id: string): boolean {
  return style === 'v2' && kitV2(id) !== null;
}
