# M05 — Boucle RPG compacte : rencontres, progression et sauvegardes

## Résultat voulu

Transformer une succession de duels isolés en une **expérience solo locale cohérente** sans fabriquer prématurément une ville HD-2D complète. Le joueur joue plusieurs adversaires, suit sa progression, enrichit ou configure son deck dans les limites du catalogue actuel, reprend une session ultérieure.

## P0 — Tableau de rencontres et parcours

- Construire un **hub/tableau de rencontres** lisible à partir de l'interface actuelle : plusieurs rivaux distincts (en priorité Kaï, Maëlle, Sélène s'ils sont bien présents dans le code), caractère, style tactique, Signature, Techniques et statut public légal ; aucun secret de main ou d'intention.
- Proposer au moins **une mini-série rejouable de trois duels** et des rencontres libres de difficulté différenciée. Résultats persistants, revanche, choix du prochain rival, séquences de victoire/défaite claires. Le hub est un **prototype de navigation**, pas la topographie finale de la ville.
- Les PV des personnages restent personnalisés et dépendants de leur profil/scénario ; **pas d'auto-normalisation universelle des PV**, pas de limite dure de tours, pas de chronomètre de victoire inventé.
- Réutiliser le système existant d'IA non omnisciente ; 2–3 profils différenciés et testés (attaque, prudence, lecture/Interférence) selon ce que le code fournit. La courbe de difficulté du parcours doit être déclarative/configurable, pas une tricherie IA.

## P1 — Collection et évolution sans règles nouvelles

- Relier la **galerie procédurale** aux 17 identités et variantes réellement implémentées, filtrer par famille, inspecter carte et effet, consulter le deck courant. Une carte ne doit jamais devenir une 18e identité ordinaire.
- Pour que la progression soit perceptible, on peut enregistrer des victoires, rencontres débloquées et éléments de collection **existants**. Un prototype de déblocage ou de récompense ne doit pas inventer de monnaie, de rang de joueur, de nouveau pouvoir ou de nouvelles raretés : règles de déblocage paramétrables, labels **provisoire/démo**, décisions réversibles par donnée.
- Aucun équilibrage de dégâts par augmentation automatique de la Puissance ; Signature ∞ et amplification respectent le contrat. Ne pas dénaturer la collection en progression linéaire « meilleur chiffre ».
- Aucun dialogue ou choix RPG non canonique ne doit influencer les mécaniques du combat. Un habillage narratif minimal et temporaire est acceptable uniquement pour expliquer la progression entre duels.

## P2 — Persistance sûre et reprise

- Sauvegarde locale **versionnée** (schemaVersion, gameVersion, profile, deck, options, progression, run/encounter). Stockage transactionnel à l'échelle utile avec contrôle de validation/migration. Ne pas perdre les données lors d'une sauvegarde invalide ; proposer diagnostic, sauvegarde de secours ou réinitialisation explicite.
- **Reprise après fermeture/rechargement** à partir d'un point de contrôle sûr. Si une reprise exacte *en plein duel* est implémentée, elle doit conserver état, zones, RNG, phase, engagement verrouillé, visibilités et ordre des événements sans connaître prématurément l'IA. Si ce n'est pas viable, imposer un **checkpoint hors duel** et afficher honnêtement ce qui sera perdu : ne jamais promettre une reprise instantanée qu'on ne sait pas assurer.
- Le stockage peut contenir un replay local complet pour reprise, mais ne doit pas être transmis à un affichage spectateur/public ; exports publics filtrés comme M03.1B.
- Restaurer séparément les préférences d'accessibilité, rythme et seed esthétique si cela est pertinent. Aucun compte, cloud, réseau ou collecte de données sans demande.
- Boutons Nouvelle partie et Effacer la sauvegarde soumis à confirmation ; sauvegarde corrompue testée, ancienne version testée, rafraîchissement entre les phases et après résultat testés.

## Acceptance M05

- Le joueur peut effectuer : accueil → deck légal → rival 1 → victoire/défaite → résultat → progression → rival 2 → rival 3 → récapitulatif ; au moins un parcours complet exécuté en QA navigateur avec les informations cachées intactes.
- Fermer l'onglet, revenir et reprendre sans incohérence ni perte de sa collection/progression/définition du deck. Tous les rivaux ont personnalité perceptible et mêmes règles.
- Pas de progression « cosmétique seulement » revendiquée comme économie finale : l'état de prototype est explicité dans le rapport.
- Historique de parties, statistiques et résultats restitués sans utiliser les champs privés des adversaires ; restaurer un profil ne change pas l'issue d'un duel déterministe donné.
- Tests, build, replays comparés, captures et rapport M05. Ne pas créer de quartiers définitifs, économie monétaire ou systèmes de quêtes sans contrat ultérieur.