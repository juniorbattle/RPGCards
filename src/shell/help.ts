/**
 * Aide intégrée (M04) : prise en main en une page — déroulé d’un tour, Rang ≠ Puissance, états des
 * Secondaires, choix tactiques, Insight et Techniques, « pourquoi 0 dégât », vues et raccourcis.
 * Texte fidèle au règlement V3.0 + avenant V3.2 (aucune règle nouvelle).
 */
import type { Shell } from './shell';
import { btn, h, screen } from './ui';

const SECTIONS: Array<[string, string[]]> = [
  ['Le but', [
    'Réduire les PV du rival à 0. Chaque duelliste a ses propres PV (affichés avant le duel) : ils ne sont jamais égalisés.',
    'Votre deck : 17 cartes uniques — une version de chacune des 16 identités (4 familles × Rangs I à IV) et une Signature ∞. Deux Techniques équipées.',
  ]],
  ['Un tour', [
    '1. Début : la main se complète à 4 cartes (Techniques Sondage, Recentrage possibles).',
    '2. Préparation : cliquez vos Secondaires cachées et chargées pour les révéler — elles deviennent ACTIVES.',
    '3. Engagement : une Primaire obligatoire (glisser ou clic puis clic sur la case) en ASSAUT ou en GARDE ; une nouvelle Secondaire facultative, face cachée, qui CHARGE ce tour.',
    '4. Révélation simultanée des Primaires (bandeau rouge ASSAUT, bleu GARDE).',
    '5. Choix tactiques secrets et simultanés pour chaque Secondaire ACTIVE : Conserver, Amplifier le Rang, Amplifier les dégâts (Assaut seulement) ou Interférer.',
    '6. Résolution du Clash, puis les deux Primaires partent à la défausse ; « Tour suivant ».',
  ]],
  ['Rang et Puissance : deux mesures distinctes', [
    'RANG = priorité : le plus haut score de Rang gagne le Clash. Une Signature ∞ bat toute Primaire ordinaire ; deux Signatures sont à égalité.',
    'PUISSANCE = dégâts et absorption. Assaut gagnant contre Assaut : Puissance × multiplicateur. Assaut gagnant contre Garde : (Puissance − Puissance de la Garde) × multiplicateur.',
    'Garde gagnante contre Assaut (elle l’emporte à égalité de Rang) : l’Assaut est bloqué (0 blessure) et la Garde gagne 1 Insight. Deux Gardes : aucune blessure.',
    'Égalité de Rang entre deux Assauts : impacts simultanés. Double K.-O. : prolongation, 1 PV chacun.',
  ]],
  ['Pourquoi 0 dégât ?', [
    'Vous avez gagné au Rang, mais la Garde adverse absorbe : si votre Puissance ne dépasse pas la sienne, il ne reste rien. Une Garde victorieuse, elle, bloque tout. Pour percer : un Assaut plus puissant, ou une Secondaire en Amplifier les dégâts (multiplicateurs additionnés, jamais multipliés entre eux).',
  ]],
  ['Secondaires : trois états', [
    'CHARGEMENT : posée ce tour, inutilisable. RÉSERVE CACHÉE : prête mais inactive, invisible pour le rival. ACTIVE : révélée, utilisable après la révélation des Primaires.',
    'Interférer annule le soutien d’une Secondaire adverse ACTIVE de Rang imprimé inférieur ou égal (à l’aveugle si elle est camouflée) ; l’Interférence elle-même est consommée.',
  ]],
  ['Insight et Techniques', [
    'Insight : réserve de 0 à 2 (départ 1), +1 par tour au plus (Garde victorieuse contre Assaut, Interférence réussie, certains effets).',
    'Une Technique par tour, payée à la déclaration : Sondage (1), Recentrage (1), Lecture (2), Ancrage (1), Rupture (2), Dissipation (1). Leur fenêtre s’affiche dans les commandes.',
  ]],
  ['Lire le rival', [
    'Le rival est une IA qui ne voit que ce que vous verriez à sa place. Ses expressions et répliques réagissent aux seuls faits publics : ce ne sont pas des indices sur ses choix secrets.',
  ]],
  ['Vues, commandes et raccourcis', [
    'La caméra reste face au rival pendant tout le duel, pose des cartes comprise ; V ou le bouton de vue l’incline vers la table à la demande.',
    'Clavier : Tab / Maj+Tab pour naviguer, Entrée ou Espace pour sélectionner et poser, 1 à 4 cartes de main, A / G posture, V vue, N action principale, Échap annuler. Tactile : glisser, ou toucher puis toucher la case ; appui long = inspection.',
    'Menu (haut-droite) : pause, options, aide, abandon (compté à part, ce n’est pas un K.-O.). « Passer » saute la mise en scène sans rien changer au résultat.',
  ]],
];

export function renderHelp(sh: Shell, inDuel: boolean): HTMLElement {
  return screen('help', 'Aide et règles', 'Règlement V3.0 + avenant V3.2. Mise en scène, rivaux et progression sont des prototypes.',
    h('div', { class: 'sh-help' }, SECTIONS.map(([t, ps]) => h('section', null, h('h2', null, t), ps.map((p) => h('p', null, p))))),
    h('div', { class: 'sh-actions' }, inDuel
      ? btn('Retour au menu du duel', () => sh.setOverlay('menu'), { key: 'help-back', primary: true })
      : btn('Retour', () => void sh.leaveConsult(), { key: 'help-back', primary: true })));
}
