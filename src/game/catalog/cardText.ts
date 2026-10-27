/**
 * M12 (contrat 1, ADR 044) — textes de lecture des cartes, données pures : le **résumé d'une ligne** de chaque effet
 * (pour comprendre d'un coup d'œil : inspecteur, grandes cartes, mises en avant), le libellé de chaque moment de
 * déclenchement et les mots-clés du duel. Ce sont des RÉSUMÉS : le texte canonique reste `EFFECTS[...].text`
 * (catalogue, inchangé), seul à faire foi.
 */
import type { EffectId, EffectTrigger } from './cards';

/** Résumé d'une ligne de chaque effet (fidèle au texte canonique, sans le remplacer). */
export const EFFECT_SUMMARY: Readonly<Record<EffectId, string>> = {
  etincelle: 'Victoire d’un seul point qui blesse : +2 dégâts',
  braise: 'Bat un Assaut (sans soutien Dégâts) : +2 dégâts',
  ferveur: 'Victoire Cendre qui blesse : +1 Insight',
  contrecoup: 'Perd contre un Assaut : inflige quand même 3 dégâts',
  eclaireur: 'Révélée : voyez une carte de la main adverse',
  detour: 'Interférence réussie : voyez une carte adverse',
  dissimulation: 'Révélée : masque votre autre Secondaire',
  silence: 'Interfère un Rang IV : éteint l’effet de la Primaire adverse',
  racine: 'Garde qui Repousse une carte cachée : vous voyez laquelle',
  ecaille: 'Garde victorieuse contre un Assaut : soin 2 PV',
  entrave: 'Garde qui Repousse une Basic : sous la pioche adverse',
  tenacite: 'Garde vaincue : revient sous votre pioche',
  repere: 'Révélée : voyez le sommet de votre pioche',
  prisme: 'Affinité +1 avec une Primaire de toute famille',
  relance: 'Interfère un Rang III : revient au sommet de votre pioche',
  convergence: 'Primaire d’une autre famille : ×6 au lieu de ×4',
  flamme: 'Assaut soutenu qui blesse : Repousse une Secondaire cachée',
  clairvoyance: 'Révélée : voyez une carte adverse et sa plus ancienne Secondaire cachée',
  emprise: 'Garde victorieuse : Repousse une Secondaire adverse',
  cycle: 'Victoire avec un seul soutien valide : il revient au sommet de la pioche',
  // avenant 09 (appliqué à titre provisoire)
  tison: 'Assaut : coefficient +1 ; Primaire battue : 2 dégâts pour vous',
  escarbille: 'Révélée : 2 dégâts pour vous, piochez une carte',
  percee: 'Contre une Garde : elle absorbe 2 de moins',
  bravade: 'Battue par une Garde : ni Repoussement ni Insight pour elle',
  surenchere: 'Rang +2 ; Primaire battue : 3 dégâts pour vous',
  brulure: 'Interférence réussie : 2 dégâts fixes à l’adversaire',
  fournaise: 'Contre une Garde : absorption au quart',
  phenix: 'Battue : revient dans votre main',
  leurre: 'Engagée en Rang : les Interférences contre elle échouent',
  murmure: 'Interférence réussie : voyez le sommet de la pioche adverse',
  echo: 'Battue : voyez une carte de la main adverse',
  filombre: 'Victoire : voyez une carte de la main adverse',
  ombre: 'Révélée : voyez la plus ancienne Secondaire adverse cachée',
  contrejour: 'Interfère aussi un Rang de plus que le sien',
  eclipse: 'Victoire qui blesse : l’adversaire perd 1 Insight',
  miroirbrise: 'Révélée : voyez les Secondaires adverses cachées',
  epine: 'Garde victorieuse : 1 dégât fixe à l’adversaire',
  bouture: 'Interférence réussie : soin 2 PV',
  seve: 'Révélée, si vous êtes derrière : soin 2 PV',
  lierre: 'Interférence réussie : reste en jeu',
  mur: 'En Garde : Rang +2',
  profondes: 'Garde victorieuse : revient dans votre main',
  rempart: 'Garde dominée : absorbe les trois quarts',
  herse: 'Garde victorieuse : 3 dégâts fixes à l’adversaire',
  boussole: 'Rang : affinité +1 avec toute famille',
  comete: 'Victoire : revient au sommet de votre pioche',
  constellation: 'Avec un soutien d’une autre famille : coefficient +1',
  sextant: 'Révélée : voyez les deux cartes du sommet de votre pioche',
  equinoxe: 'Égalité entre deux Assauts : elle l’emporte',
  harmonie: 'Avec un soutien d’une autre famille : Rang +2',
  zenith: 'Rang +1 hors famille ; victoire : revient au sommet',
  solstice: 'Victoire : +1 Insight',
};

/** Le moment où l'effet joue (icône de déclenchement, contrat 1, §3). */
export const TRIGGER_LABEL: Readonly<Record<EffectTrigger | 'signature', string>> = {
  'primary-reveal': 'À la révélation de la Primaire',
  'secondary-reveal': 'Révélation volontaire de la Secondaire',
  'use-rank': 'Engagée en Amplifier le Rang',
  'use-damage': 'Engagée en Amplifier les dégâts',
  'use-interfere': 'Engagée en Interférer',
  signature: 'Signature : Primaire seulement, priorité ∞',
};

/** Libellé court du déclenchement (pastille, mises en avant). */
export const TRIGGER_SHORT: Readonly<Record<EffectTrigger | 'signature', string>> = {
  'primary-reveal': 'Révélation',
  'secondary-reveal': 'Révélation volontaire',
  'use-rank': 'Rang',
  'use-damage': 'Dégâts',
  'use-interfere': 'Interférence',
  signature: 'Signature',
};

/** Mots-clés du duel, expliqués dans l'inspecteur quand le texte d'une carte les emploie. */
export const KEYWORDS: ReadonlyArray<{ mot: string; motif: RegExp; texte: string }> = [
  { mot: 'Repousser', motif: /repouss/i, texte: 'renvoyer une Secondaire adverse (en main, ou sous la pioche) : elle devra être reposée et rechargée.' },
  { mot: 'Interférer', motif: /interf/i, texte: 'une Secondaire engagée vise une Secondaire adverse : si elle réussit, le soutien visé ne compte pas.' },
  { mot: 'Insight', motif: /insight/i, texte: 'la ressource des Techniques, de 0 à 2 (au plus +1 par tour).' },
  { mot: 'Affinité', motif: /affinit|même famille|autre famille/i, texte: 'un soutien de la famille de la Primaire gagne +1 (au Rang comme au coefficient de dégâts).' },
  { mot: 'Dégâts fixes', motif: /dégâts fixes|dégâts\b/i, texte: 'des dégâts ajoutés après la multiplication et l’absorption de la Garde.' },
  { mot: 'Garde', motif: /garde/i, texte: 'posture défensive : gagne l’égalité de Rang ; dominée, elle absorbe encore la moitié de sa Puissance.' },
  { mot: 'Révélation volontaire', motif: /révél/i, texte: 'au début du tour, retourner une Secondaire de sa réserve cachée pour l’activer (et déclencher son effet).' },
];

/** Les mots-clés qu'un texte emploie (au plus quatre), dans l'ordre de la liste. */
export function keywordsIn(text: string): Array<{ mot: string; texte: string }> {
  return KEYWORDS.filter((k) => k.motif.test(text)).slice(0, 4).map(({ mot, texte }) => ({ mot, texte }));
}
