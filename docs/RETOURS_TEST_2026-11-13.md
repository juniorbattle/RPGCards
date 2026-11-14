# Retours du test du 2026-11-13 (version 0.18.0) — constats et décisions

> Test du responsable sur la version 0.18.0 : « il y a clairement du mieux, mais le combat est encore imparfait ».
> Constats de la session principale (passe 232), puis les décisions du responsable du même jour (quatre réponses,
> chacune sur l'option recommandée).

## Constats

1. **Techniques au comportement inégal.** Au tour assisté, Sondage, Lecture, Dissipation, Rupture et Ancrage posent
   la question « Utiliser / Non ». Recentrage, lui, part dès qu'on clique une carte de sa main au début du tour
   (`src/app/controller.ts`, `clickHandCard` : « la question du Recentrage se répond en cliquant la carte ») : l'Insight
   est dépensé sans réponse explicite.
2. **Engagement qui part seul, selon l'ordre de pose.** `suiteEngagement` engage dès que la Primaire, sa posture et la
   Secondaire sont posées (règle « un clic par étape » de la passe 219). Selon l'ordre des gestes, le joueur doit
   cliquer « Engager » ou voit l'engagement partir sans pouvoir le modifier. Le dernier choix tactique envoie aussi le
   tour (`suiteTactique`).
3. **Barre ASSAUT / GARDE / SECONDAIRE ambiguë.** Ces trois boutons sont au même niveau sur la carte choisie, alors
   que les deux premiers posent la carte en Primaire et le troisième en Secondaire.
4. **Marche de côté du protagoniste incomplète** (déjà évoquée les 2026-10-29 et 2026-11-01). Les quatre temps de la
   rangée de profil de toutes les feuilles sont des foulées ouvertes ; aucune vraie pose de passage, jambes
   rapprochées. Le cycle (contact, « passage », contact, « passage ») ne montre donc que des foulées, et la marche
   paraît glissée. Planche : `screenshots/qa/retours-2026-11-13/planche-profil-avant.png` (feuilles `player`,
   `player-a3`, `player-b`, `player-a2`, `player-b3`, rangée 2, colonnes 0 à 4).

## Décisions du responsable (2026-11-13)

| Id | Question | Décision |
|---|---|---|
| T1 | Règle pour conclure une étape | **Un bouton si plusieurs choix.** L'engagement (Primaire, posture, Secondaire) et les choix tactiques se concluent toujours par un bouton au centre (« Engager », « Valider ») ; tout reste modifiable jusque-là, quel que soit l'ordre des gestes. Une simple question oui/non (« Révéler » / « Garder cachée », « Utiliser » / « Non ») avance dès qu'on répond. Remplace la règle « un clic par étape » de la passe 219 ; le bouton reste grand, au même endroit (panneau central), avec le focus. |
| T2 | Activation des Techniques | **Toujours « Utiliser / Non ».** Chaque Technique utilisable pose la même question ; la carte (Recentrage) ou la cible ne se choisit qu'après « Utiliser ». Jamais d'Insight dépensé par un clic sur une carte. |
| T3 | Poses d'une carte choisie | **Deux groupes titrés** : « Primaire » (Assaut, Garde), puis, séparé, « Secondaire » (Poser cachée). |
| T4 | Marche de côté | **Par code d'abord.** Jambes et bras redessinés par code sur un cycle complet de 8 temps, pour les 32 feuilles, aucune image générée ; une planche animée à l'œil du responsable ; de nouvelles images seulement si ça ne tient pas, avec son accord. |

Les leçons (règle B6) suivent la même règle. Le tour classique garde ses boutons (« Valider », « Verrouiller ») ; seule la
décision T3 vaut aussi pour lui (la barre de pose est commune aux deux tours).

## Application (passes 233 et 234, session de développement)

- **T1 à T3 (passe 233)** : `src/app/controller.ts` (plus d'engagement ni d'envoi automatique ; « Défausser »,
  « Valider » ; Recentrage après « Utiliser » ; `annulerTech`), `src/presentation/board.ts` (panneau central : défausse,
  « Engager » avec le brouillon et ce qui le modifie, « Valider » avec les choix et l'aperçu ; barre de pose en deux groupes
  titrés ; « Utiliser » ne répond jamais à la touche de l'action principale), scénario de QA `tour-t1`, leçons accordées
  (`src/lecons/`), `test/retours-2026-11-13.test.ts`, `tools/m18-tour.mjs` (section 6), `tools/m17-lecons.mjs`.
- **T4 (passe 234)** : `src/ville/marcheProfil.ts` (cycle de huit temps redessiné par code, au chargement, en mémoire),
  `src/ville/sprites.ts` (feuille dérivée 8 × 4, temps choisi selon la phase), `test/marche-huit.test.ts` (32 feuilles) ;
  planches `screenshots/qa/retours-2026-11-13/planche-profil-huit.png` et `planche-marche-huit-jeu.png`, capture animée
  `marche-huit-1280.webm` (non suivie par git ; `node tools/marche-huit-video.mjs` la refait). **À l'œil du responsable** ;
  de nouvelles images seulement avec son accord.
