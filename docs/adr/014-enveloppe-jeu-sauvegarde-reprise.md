# ADR 014 — Enveloppe de jeu : flux produit, sauvegarde versionnée et reprise exacte par rejeu (M04–M05)
Date : 2026-10-17
Statut : proposé (mandat `docs/missions/M04_M06_PROGRAMME_JEU_OPERATIONNEL.md` ; respecte ADR 013 sans le modifier)

**Contexte.** Le runtime M03.2 était un duel isolé : entrée par paramètres d’URL, fin de duel par
rechargement de la page, aucune persistance. Le programme M04–M06 demande un jeu solo local : accueil,
deck légal, rivaux, résultats, progression, fermeture et reprise « dans un état valide et cohérent »,
sans toucher au duel approuvé ni aux règles.

**Décision.**
- **Deux machines d’états séparées.** Les phases du duel restent celles du moteur pur ; le flux produit
  (`src/product/flow.ts`) est une machine pure distincte (écrans, gardes : deck légal, rencontre
  disponible, duel en cours exclusif). Le moteur ignore les menus ; l’enveloppe ignore les règles
  (elle consomme des faits résumés : deck légal ?, duel en cours ?, rencontres jouables).
- **Le duel est une session démontable** (`DuelSession`) : tout ce qu’il installe (écouteurs, minuteries,
  scène du Clash, crochets QA) est retiré à la sortie ; l’arène Three.js est unique (`setRival`,
  `setPaused`) : un seul contexte WebGL pour toute la partie. La présentation M03.2 n’est pas modifiée
  (scène 3D identique au pixel près à l’entrée historique, mesuré).
- **Sauvegarde locale versionnée** (`src/product/save.ts`, `localStorage`) : document unique
  `{ schemaVersion, gameVersion, profil, deck, options, historique public, collection, progression,
  duel en cours }`, validé structurellement à la lecture ET avant chaque écriture, écrit puis relu ;
  la version précédente valide devient la copie de secours. Une sauvegarde illisible n’est jamais
  effacée sans trace (mise à l’écart sous `lqv.save.corrupt` seulement sur choix du joueur) ; un schéma
  futur est refusé ; les migrations sont des fonctions pures `v → v+1` (1 → 2 testée sur une sauvegarde
  réelle écrite par le build M04).
- **Reprise EXACTE d’un duel par rejeu**, plutôt qu’un point de contrôle hors duel : le moteur est pur
  et déterministe (seed dans l’état, IA déterministe sur sa vue), donc `config + commandes` suffit à
  reconstruire état, zones, RNG, phase, engagements verrouillés, visibilités et ordre des événements.
  Les commandes sont sauvegardées après **chaque** commande acceptée (joueur ou rival) avec le hash
  état + journal ; à la reprise, le rejeu doit retrouver ce hash, sinon la reprise est **refusée** avec
  sa raison (catalogue ou règles différents, données altérées) et le joueur choisit : recommencer ce
  duel depuis le début ou le retirer (non compté). Rien n’est inventé. Les brouillons non verrouillés
  (carte posée mais pas validée) ne sont pas conservés, et c’est dit au joueur ; une résolution de
  Clash interrompue reprend à l’état résolu, sans rejouer l’animation.
- **Données de prototype séparées et signalées** (`src/product/encounters.ts`, `progression.ts`) :
  PV et decks des rivaux, série de trois manches, déblocages à la première victoire (variantes de
  famille, Technique distinctive) ; aucune monnaie, aucun rang de joueur, aucune rareté ni Puissance
  nouvelle ; tout est réglable par donnée et marqué « prototype » dans l’interface.

**Conséquences.**
- Le duel en cours sauvegardé contient des informations privées **des deux sièges** (commandes de
  l’IA) : il reste local, n’est jamais affiché ; l’historique et les résultats ne contiennent que des
  faits publics (`summarize` lit les événements visibles du joueur).
- Les règles d’inscription ne sont pas un système de règles du duel : le moteur, l’IA, la visibilité
  et le catalogue ne sont pas modifiés (`src/game` inchangé).
- Une évolution du catalogue (`CATALOG_VERSION`) ou des règles rend la reprise d’un duel en cours
  impossible — par construction, plutôt qu’une reprise silencieusement fausse.

**Alternatives écartées.** Sérialiser l’état moteur brut (contourne la validation et casse à chaque
évolution du schéma d’état) ; point de contrôle uniquement hors duel (perte du duel à chaque fermeture
alors que le rejeu exact est sûr) ; IndexedDB (inutile pour quelques dizaines de Ko, plus fragile à
tester) ; un framework d’UI pour les menus (le DOM par code suffit, ADR 002).

**Question d’approbation.** Valider : (1) la reprise exacte par rejeu vérifié ; (2) la forme des données
de prototype (PV des rivaux, série du Quai, déblocages à la première victoire, collection de départ) ;
(3) l’affichage public de la Signature et des Techniques du rival avant le duel (ARB-002, inchangé).
