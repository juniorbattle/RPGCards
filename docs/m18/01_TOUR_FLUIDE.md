# M18 — Le tour fluide : l'action au centre (contrat, PROPOSÉ)

> **Statut : PROPOSÉ le 2026-11-11 (passe 216).** Fiche d'arbitrages publiée (`docs/FICHE_ARBITRAGES_M18.md`) ; rien n'est
> codé avant qu'elle soit remplie et consignée.
> Retour du test complet du responsable (2026-11-11) : « le jeu manque de clarté au niveau de la manipulation lors du
> système de combat ; les joueurs ne savent pas ce qu'il faut faire lors des étapes du combat et perdent le fil ; être
> obligé de cliquer sur le bouton à droite pour la phase suivante n'est pas intuitif… peut-être que nous devrions annoncer
> via des pop-ups automatiques et donner la main uniquement lorsqu'il y a un choix à faire (sélectionner une Primaire,
> une Secondaire, charger la Secondaire, activer une compétence), de manière intuitive, afin que le joueur ne perde jamais
> l'action centrale […] alors qu'il s'agit de choisir les cartes qui vont gagner la manche et d'utiliser ses compétences
> pour maximiser ses choix ».

## 1. Ce qui se passe aujourd'hui (captures du 2026-11-11, Duel standard contre Kaï, 1280 × 720)

- **Le moteur saute déjà les étapes sans choix** (`needs`, `engine.ts:178`) : on n'attend le joueur au Début que s'il peut
  utiliser Sondage ou Recentrage ou doit défausser, à la Préparation que s'il a une réserve prête, aux choix tactiques
  que s'il a une Secondaire active (ou Rupture), etc.
- **Mais chaque étape où l'on a la main se ferme par un bouton du panneau en bas à droite**, loin des cartes :
  « Valider » (Début : dans l'aventure, presque à chaque tour, puisque l'Insight de départ paie Sondage ou Recentrage),
  « Garder cachées et valider » ou « Révéler et valider » (Préparation), « Verrouiller l'engagement », « Verrouiller les
  choix », et **« Tour suivant » à chaque tour**, même quand il n'y a rien à décider.
- **Les choix facultatifs ressemblent à des obligations** : rien ne dit qu'on peut simplement continuer ; le joueur lit le
  panneau pour comprendre s'il doit faire quelque chose.
- **Quatre boîtes de texte se disputent l'écran** : la fiche de la carte à gauche, le conseil et le panneau de commande à
  droite, la bulle du rival en haut ; la consigne du moment est dans le panneau, pas à l'endroit de l'action.
- **Ce qui marche déjà** : choisir une carte de la main fait apparaître sur elle ASSAUT, GARDE, SECONDAIRE (pose en un
  geste) ; les cases légales s'allument ; les étapes de l'engagement sont en pastilles.

## 2. Principe

**Le joueur ne fait que des choix ; le jeu annonce et enchaîne le reste.** Une seule question à la fois, posée à
l'endroit de l'action (sur la carte, sur la case, sur la Technique), avec ses réponses. Rien n'avance à la place du joueur
quand il y a un choix ; tout avance seul quand il n'y en a pas. Aucune minuterie.

## 3. Ce qui change

1. **Annonces d'étape** : au début du tour et à chaque étape où le joueur a la main, un bandeau bref au centre de la table
   (« Tour 3 », « Engagement : choisis ta Primaire », « Tes Secondaires peuvent agir »), qui s'efface seul (environ une
   seconde) ; jamais bloquant.
2. **Fin du tour sans bouton** : après la Résolution (Clash et temps forts), le tour suivant commence seul après une
   courte pause ; le résultat reste résumé dans une ligne (« Tour 2 : vous −0, Kaï −12 ») jusqu'au Clash suivant. Un clic
   ou Espace abrège la pause ; le journal garde tout.
3. **Choix facultatifs posés sur place** : la réserve prête porte « Révéler » et « Garder cachée » ; la Technique
   utilisable s'allume au-dessus de la main avec « Utiliser » et « Non » (Sondage, Recentrage, Lecture, Dissipation, Rupture) ;
   répondre fait avancer, sans autre bouton.
4. **Le geste qui conclut, au centre** : la Primaire et sa posture posées, un grand bouton « Engager » apparaît au-dessus
   de la case Primaire (« ou ajoute une Secondaire ») ; aux choix tactiques, « Valider » au même endroit.
5. **Choix tactiques guidés** : les Secondaires actives s'allument et leur menu s'ouvre de lui-même, l'une après l'autre ;
   chaque option dit ce qu'elle change au Clash (« Rang : tu gagnes 6 contre 4 ») ; « Conserver » reste la réponse par
   défaut.
6. **Écran désencombré** : une seule consigne, à l'endroit de l'action ; le panneau de droite ne garde que l'étape,
   l'Insight et les Techniques ; la fiche de la carte n'apparaît qu'au survol (ou à l'appui long) ; les conseils
   contextuels cèdent la place à la consigne (les leçons M17 restent).
7. **Réglage** : « Tour assisté » (par défaut) et « Tour classique » (l'affichage d'aujourd'hui) dans les options du
   jeu standard et le menu de l'aventure.

## 4. Ce qui ne change pas

Règles V3.3, phases et commandes du moteur, IA, annexe de calibrage, secret (ADR 011 : une question ne montre jamais ce
que le joueur ne verrait pas), empreintes et replays standard. Clavier et manette suivent les mêmes questions (A répond,
B revient). Les outils de QA qui cliquent les boutons d'aujourd'hui jouent en « Tour classique » ou sont accordés.

## 5. Leçons (règle B6)

Les six leçons de base et les onze leçons des éléments (`src/lecons/`) sont accordées au tour assisté dans la même
livraison (mêmes consignes, nouveaux gestes).

## 6. Vérification

`tsc`, tests, build ; un parcours au navigateur (souris, clavier, manette ; 1280 et 1920 ; avec et sans mouvement réduit)
qui compte les clics par tour et vérifie qu'aucun bouton ne reste à cliquer quand il n'y a pas de choix ; planche avant /
après de chaque étape ; parcours existants verts ; leçons M17 rejouées.
