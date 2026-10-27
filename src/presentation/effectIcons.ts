/**
 * M12 (contrat 1, §3 et §5 ; ADR 044) — icônes tracées par code (SVG, 24 × 24, couleur du texte) : le moment de
 * déclenchement d'un effet (pastille des cartes, inspecteur, mises en avant) et le sceau de chaque Technique.
 * Aucune police ni image : des chemins.
 */
import type { EffectTrigger } from '../game/catalog/cards';
import type { TechniqueId } from '../game/catalog/techniques';

export type TriggerIcon = EffectTrigger | 'signature';

const svg = (body: string, size: number): string =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

const TRIGGER_PATHS: Record<TriggerIcon, string> = {
  // un œil ouvert : l'effet joue à la révélation de la Primaire
  'primary-reveal': '<path d="M2.5 12c2.6-4.4 5.8-6.6 9.5-6.6s6.9 2.2 9.5 6.6c-2.6 4.4-5.8 6.6-9.5 6.6S5.1 16.4 2.5 12z"/><circle cx="12" cy="12" r="3" fill="currentColor"/>',
  // une carte qui se retourne : révélation volontaire de la Secondaire
  'secondary-reveal': '<rect x="9.5" y="4" width="10" height="15" rx="1.8"/><path d="M6.5 17.5C3.6 14.2 3.7 9.6 6.9 6.4"/><path d="M4.4 6.4h2.8v2.8"/>',
  // un double chevron montant : Amplifier le Rang
  'use-rank': '<path d="M6 13.5l6-6 6 6"/><path d="M6 19l6-6 6 6"/>',
  // un multiplicateur : Amplifier les dégâts
  'use-damage': '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/><circle cx="12" cy="12" r="10" stroke-width="1.4" opacity="0.6"/>',
  // un éclair : Interférer
  'use-interfere': '<path d="M13.5 2.5L5.5 13.5h5.5l-1 8 8.5-11.5H13l1-7.5z" fill="currentColor" stroke-width="1.4"/>',
  // l'infini : Signature
  signature: '<path d="M12 12c-2.2-3.3-6.8-3.3-6.8 0s4.6 3.3 6.8 0 6.8-3.3 6.8 0-4.6 3.3-6.8 0z" stroke-width="2.2"/>',
};

/** Icône du moment de déclenchement (SVG en chaîne, pour `h(..., { html })`). */
export function triggerIcon(t: TriggerIcon, size = 24): string {
  return svg(TRIGGER_PATHS[t], size);
}

const SEAL_PATHS: Record<TechniqueId, string> = {
  // un œil dans un cercle : observer une carte adverse
  Sondage: '<circle cx="12" cy="12" r="10" stroke-width="1.5"/><path d="M5 12c2-3.2 4.3-4.8 7-4.8s5 1.6 7 4.8c-2 3.2-4.3 4.8-7 4.8S7 15.2 5 12z"/><circle cx="12" cy="12" r="2.2" fill="currentColor"/>',
  // une flèche qui plonge sous une pile
  Recentrage: '<path d="M4 7h11M4 11h11"/><path d="M17.5 4v11.5"/><path d="M14.5 12.5l3 3 3-3"/><path d="M4 18h16"/>',
  // deux postures face à face : lire le mode adverse
  Lecture: '<path d="M3 8h10l-3-3M13 8l-3 3"/><path d="M21 16H11l3-3M11 16l3 3"/>',
  // une ancre : la Secondaire reste en place
  Ancrage: '<circle cx="12" cy="5" r="2.2"/><path d="M12 7.2V20"/><path d="M8 11h8"/><path d="M4.5 13.5c0 4 3.4 6.5 7.5 6.5s7.5-2.5 7.5-6.5"/>',
  // une chaîne brisée : renvoyer une Secondaire active
  Rupture: '<path d="M9.5 14.5l-2 2a3 3 0 0 1-4.2-4.2l2.6-2.6a3 3 0 0 1 4.2 0"/><path d="M14.5 9.5l2-2a3 3 0 0 1 4.2 4.2l-2.6 2.6a3 3 0 0 1-4.2 0"/><path d="M12 4v2.5M12 17.5V20M4 12h2M18 12h2"/>',
  // un voile déchiré : lever un camouflage
  Dissipation: '<path d="M4 5c2.7 1.6 5.3 1.6 8 0s5.3-1.6 8 0"/><path d="M4 5v13c2.7-1.6 4.3-1.6 6 0"/><path d="M20 5v13c-2.7-1.6-4.3-1.6-6 0"/><path d="M12 7l-1.5 5 2.5 1.5-1.5 5"/>',
};

/** Sceau d'une Technique (SVG en chaîne). */
export function techniqueSeal(t: TechniqueId, size = 24): string {
  return svg(SEAL_PATHS[t], size);
}
