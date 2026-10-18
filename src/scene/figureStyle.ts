/**
 * M07 L5 — interrupteur du modèle artistique des personnages (porte de validation).
 * `v1` : rendu approuvé, inchangé (défaut). `v2` : « vectoriel V2 » (tracés écrits à la main, aplats d’illustration),
 * réalisé pour Maëlle seulement tant que le responsable ne l’a pas validé ; activé par `?qa=1&figure=v2`.
 * Le style est fixé une fois au chargement de la page (main.ts), avant toute scène ou portrait.
 */
export type FigureStyle = 'v1' | 'v2';

let style: FigureStyle = 'v1';

export function setFigureStyle(s: FigureStyle): void {
  style = s;
}

export function figureStyle(): FigureStyle {
  return style;
}

/** Vrai si cette figure (id de personnalité) est dessinée par le modèle V2. */
export function usesV2(id: string): boolean {
  return style === 'v2' && id === 'ronce';
}
