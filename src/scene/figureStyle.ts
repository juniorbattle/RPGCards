/**
 * M07 L5 — interrupteur du modèle artistique des personnages.
 * `v1` : rendu approuvé, inchangé (défaut). `v2` : « vectoriel V2 » (tracés écrits à la main, aplats d’illustration),
 * direction validée par le responsable sur Maëlle (2026-10-18), étendue aux rivaux dont l’identité V2 existe
 * (`src/scene/v2/`) ; activé par `?qa=1&figure=v2`. Le style est fixé une fois au chargement (main.ts).
 */
import { V2_IDS } from './v2';
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
  return style === 'v2' && V2_IDS.includes(id);
}
