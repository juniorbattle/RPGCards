# M18 — Le tour fluide : l'action au centre (contrat, APPROUVÉ ; LIVRÉ à la passe 218, à jouer)

> **Livraison (passe 218, JOURNAL) :** `src/presentation/annonce.ts` (bandeau), `src/app/controller.ts` (questions,
> menus ouverts d'office, aperçu des modes), `src/presentation/board.ts` (consigne sur place, « Engager », « Valider »,
> panneau réduit, ligne du dernier Clash), `src/app/duelSession.ts` (enchaînement du tour suivant), `src/app/params.ts`
> (`?tour=assiste|classique`, `lqv.tour`) ; leçons accordées (`src/lecons/seance.ts`) ; `tools/m18-tour.mjs`,
> `test/m18.test.ts`. Choix d'exécution : en QA (`qa=1`) sans `tour=`, le tour classique (parcours d'avant inchangés) ;
> pendant la présentation du Clash, le panneau garde le récit des temps et « Passer » ; aux choix tactiques, « Valider »
> se pose à côté de la case Primaire (la Primaire adverse révélée reste visible) ; la révision (avenant 08) se pose
> au-dessus de la main.
>
> **Amendement du responsable (2026-11-11, passe 219, après avoir vu la livraison) :** « de manière générale il faut que
> nos actions pour chaque étape se fassent en 1 clic si possible sans besoin de valider ». Le geste qui complète une étape
> l'envoie ; un bouton ne reste que pour refuser un élément facultatif. Aux choix tactiques, **pas de bouton « Valider »** :
> le dernier choix (« Conserver » compris) envoie les choix. À l'Engagement, poser la Secondaire (ou la posture, si la
> Secondaire est posée ou impossible) engage ; seul l'engagement sans Secondaire garde « Engager sans Secondaire ». Une cible
> unique (Interférer, Rupture, Ancrage, Dissipation) est prise d'office ; le Recentrage se répond en cliquant la carte. Le
> point 4 du §3 ne garde que ce bouton ; le point 5 vaut avec cette règle.
>
> **Amendement du responsable (2026-11-11, passe 220) :** « le bouton engager n'est pas assez mis en avant… cela force le
> joueur à chercher où valider son action ». Toutes les décisions du tour (l'engagement, les réserves, les Techniques, la
> révision, le mode après la Lecture) se posent **dans un seul panneau, au centre de la table**, sur la rangée du rival (son visage dégagé), juste
> au-dessus de la rangée du joueur : la question en clair, ce qu'elle engage, la réponse en grand ; la carte concernée
> s'éclaire. Les points 3 et 4 du §3 valent avec ce panneau (au lieu de « sur la carte » et « au-dessus de la case »).

> **Décisions du responsable (2026-11-13, T1 à T3 de `docs/RETOURS_TEST_2026-11-13.md` ; appliquées à la passe 233) :
> elles remplacent la règle « un clic par étape » de la passe 219.** T1 : **un bouton dès qu'il y a plusieurs choix**.
> L'engagement (Primaire, posture, Secondaire) se conclut toujours par « Engager », au centre, avec le focus ; le brouillon
> reste modifiable jusque-là, quel que soit l'ordre des gestes. Les choix tactiques gardent leurs menus ouverts d'office
> (« Conserver » par défaut) et se concluent par « Valider » au même endroit ; un menu répondu se rouvre. La défausse du
> début du tour se conclut par « Défausser ». Les questions oui/non (« Révéler » / « Garder cachée », « Utiliser » /
> « Non », « Garder » / « Engager la révision », le mode après la Lecture) avancent toujours à la réponse ; sans Secondaire
> active, la seule question de Rupture avance aussi à la réponse. T2 : **toutes les Techniques passent par « Utiliser /
> Non »** ; la carte du Recentrage se choisit après « Utiliser » (« Annuler » ramène la question), jamais d'Insight dépensé
> par un clic sur une carte ; « Utiliser » prend le focus sans être l'action principale (N, Y) ; la pastille d'une Technique
> ne répond que si elle est la question posée. T3 : **la barre de pose en deux groupes titrés**, « Primaire » (ASSAUT,
> GARDE) et « Secondaire » (Poser cachée), aux deux tours.
>
> **Statut : APPROUVÉ le 2026-11-11 (fiche remplie, consignée à la passe 217 ; `docs/FICHE_ARBITRAGES_M18.md`).** Les huit
> choix sur la recommandation ; développement maintenant (P2), le responsable poursuit son test hors combat en attendant.
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
