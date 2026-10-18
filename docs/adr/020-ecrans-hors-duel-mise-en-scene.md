# ADR 020 — Écrans hors duel : la scène comme décor, l’image avant le texte (M07, lot 4)

Date : 2026-10-18
Statut : **cadrage APPROUVÉ par le responsable** (« Oui, cadrage validé : lance L4 (L4a puis L4b puis L4c) comme
proposé », séance du 2026-10-18) ; le rendu lui est présenté en captures avant / après. Complète l’**ADR 014**
(enveloppe de jeu) sur la présentation ; ne modifie ni le duel (ADR 013, 016–019) ni les règles.

## Contexte

Mandat M07, point 4 : les écrans hors duel (rencontres, deck, collection…) doivent être « qualitatifs et dynamiques ;
on doit apprécier d’y naviguer ». Référence d’ergonomie : *Duel Links*, peu de texte, tout se comprend à l’image.

Audit avant le lot (captures GPU réel, `screenshots/qa/m07/l4-avant/`) : écrans fonctionnels et contrastés (≥ 7:1),
mais lus comme des formulaires (sept lignes de prose par fiche de rival, paragraphes de règles sur la préparation, une
ligne d’explication sous chaque entrée de l’accueil), aucun mouvement (changement d’écran sec, aucun retour au survol,
résultat sans mise en scène), deck en vignettes de 58 px commandées par des boutons texte.

## Décision

### La scène reste le décor, avec un plan de feux par écran

- L’arène 3D unique (ADR 014) reste derrière tous les écrans. Chaque écran a un **plan de feux** (`Staging` :
  multiplicateurs de la salle, du projecteur du visage, du projecteur de table, des bougies et du contre-jour) :
  accueil `title` (salle noire, rival seul dans son projecteur), rencontres `board`, préparation et résultat
  `portrait`, deck / collection / création / options / aide `gallery` (la scène s’efface derrière les cartes).
- `duel` vaut 1 partout et est reposé au lancement de chaque duel : **le duel est inchangé** (comparaison au pixel
  de `shots:m04` avec l’entrée historique).
- Hors duel, la scène reste **figée** : une seule image 3D par changement d’écran (porte RC « aucune image 3D sur
  l’accueil pendant 4 s » conservée). Un **voile** sombre se lève en 0,45 s à chaque nouvel écran, sous le contenu,
  et masque le saut de lumière.

### L’image avant le texte

- **Accueil** : grand titre, emblèmes des quatre familles, une grande action (Continuer / Nouvelle partie, avec sa
  ligne d’état), Deck et Collection en tuiles, Options / Aide / Recommencer en pastilles ; le profil se lit en
  pictogrammes (duels, rivaux vaincus, variantes, Techniques).
- **Rencontres** : **affiches** de rivaux (grand portrait, nom, emblème, difficulté en étoiles, PV, récompense de
  première victoire, bilan) ; le tournoi est un chemin en trois étapes numérotées ; une manche verrouillée montre la
  silhouette et un cadenas. Le style de jeu du rival apparaît au survol ou au focus.
- **Préparation** : face-à-face « Vous / VS / rival » (Signatures, PV, Techniques en pastilles, détail au survol),
  une citation du style du rival, une seule grande action **Duel !** (nom accessible « Commencer le duel »). Les
  conditions du duel standard restent dans l’Aide.
- **Résultat** : verdict en grand, barres de PV qui se vident, chiffres (infligés, subis, tours, bilan), cartes
  débloquées qui se retournent une à une.
- **Deck** : chaque identité montre ses **deux cartes** (Basic et variante) ; on choisit en cliquant la carte (radio),
  la carte choisie se lève et se retourne, l’autre s’assombrit ; variante verrouillée en silhouette avec cadenas.
  Les quatre familles restent visibles ensemble (pas d’onglets : le deck entier se lit d’un coup d’œil).
- **Collection** : jauge par famille, coche « dans le deck », silhouettes à débloquer ; le « comment l’obtenir » est
  au survol et dans le nom accessible.
- Le texte retiré de l’écran reste dans le **nom accessible** et l’info-bulle (lecteurs d’écran, survol).

### Mouvement

- Entrées en cascade (fondu et glissement, 0,4 à 0,5 s), panneau latéral qui glisse, « VS » qui apparaît, verdict,
  barres de PV, retournement des récompenses ; soulèvement au survol et au focus.
- **Seuls `transform` et `opacity` sont animés** ; aucune boucle permanente ; animations limitées aux entrées
  d’écran (un re-rendu du même écran, par exemple un choix de carte, ne rejoue pas la cascade).
- Tout est coupé en mouvement réduit et en rendu figé (`.reduced *`, `.freeze *`) : l’état final est l’état par
  défaut de chaque élément (les animations ne font que « venir de »).

## Conséquences

- Moteur, règles V3.0 / V3.2, visibilité et sauvegarde inchangés ; aucun nouveau secret affiché (préparation :
  mêmes faits publics qu’avant, ARB-002 inchangé).
- `ArenaHandle.setStaging` (nouvelle méthode) ; pictogrammes SVG écrits en code (`src/shell/icons.ts`) : aucune image
  ni police externe.
- Les clés `data-key` des parcours de QA sont conservées.
- Mesures, captures et contraste : journal, passe 20.

**Cette décision n’introduit aucune règle métier nouvelle.**
