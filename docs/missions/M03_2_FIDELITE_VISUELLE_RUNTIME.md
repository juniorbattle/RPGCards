# M03.2 — Fidélité visuelle et fluidité du runtime, sans refonte

**Porte d'entrée obligatoire :** M03.1B P0 (confidentialité des noms d'effets) vérifiée, QA ciblée réussie et non-régression 93 tests de la baseline + nouveaux tests. Le travail se fait directement sur `main`, conformément à `AGENTS.md`. Aucun moteur ni mécanisme du duel à redéfinir.

## Référence intangible

- Prévisualisation approuvée : `reference/REFERENCE_VISUELLE_VALIDEE_M03.jpg`.
- Comparaisons M03 : `screenshots/qa/m03/comparaison-{1-vue-A,2-vue-B,4-resolution,6-mobile}.png` et les captures natives correspondantes.
- La preview n'est **jamais** texture runtime ; tous les dessins restent réalisés par code (Three.js / TS / Canvas / SVG / CSS / GLSL). Les PV, Rang, effets et équipements affichés viennent du vrai moteur, même si l'illustration a des valeurs décoratives incohérentes.
- La structure validée de l'ADR 009 : **HUD rival haut-gauche**, **HUD joueur compact bas-gauche** avec portrait, main et commandes en bas, bulle rival haut-droite, journal à tiroir, centre du plateau dégagé, deux caméras pilotées par les phases.
- ADR 010 accepté comme **base des six chorégraphies de Clash**. Aucune modification de règle, aucune victoire factice ni disparition prématurée de la Primaire gagnante avant la vraie défausse.

## P0 — Le rival est l'acteur central

En vue A **frontale par défaut**, agrandir visuellement le personnage / rapprocher le cadrage pour que **visage et buste** soient clairement perceptibles pendant l'observation, l'engagement, les révélations et les réactions.

En vue B **inclinée pour manipulation**, préserver une représentation suffisamment proche du rival dans le haut du cadre **sans réduire les emplacements ni gêner la pose directe des cartes**. Mettre au point les ancres caméra de `src/scene/arena.ts` et les variables CSS qui pilotent la géométrie de mise en page ; tester bureau 1280×720 et 1920×1080, mobile portrait et paysage. Préserver focus clavier, hit-tests pendant drag et états des cartes pendant transition. Éviter les mouvements caméra à chaque clic.

## P1 — Lecture et mise en scène du Clash

- Les Primaires deviennent **les objets visuels principaux** pendant les confrontations ; ASSAUT rouge et GARDE bleu restent identifiables par **mot et icône**, uniquement après révélation.
- Le verdict principal doit pouvoir se lire **sans ouvrir le journal** : gagnant au Rang, absorption et zéro blessure, dommages réels, égalité/impacts simultanés, Garde victorieuse ou GG neutre. Afficher ensuite **2–3 conséquences essentielles** et garder les détails dans le tiroir.
- Conserver toutes les chorégraphies du `ClashMotionDirector`, ne jamais recalculer le Clash à l'animation. Les deux Primaires vont en défausse selon les événements du moteur, même si gagnantes. Rythmes normal/rapide/instantané et mouvement réduit, interruption propre et aucun clone fantôme.

## P2 — Éclairage, couleurs, personnages procéduraux

- Éclaircir **la table, le visage et les zones de jeu**, pas nécessairement tout le ciel étoilé. Optimiser le contraste des cadres dorés, emblèmes et cartes ; éviter les reflets de bougies disproportionnés.
- Raffiner par code le modelé du visage, les cheveux, la profondeur des silhouettes et les expressions ; garder les seeds et la personnalité cohérentes. Pas de modèles/images/pack d'assets externes.
- Mesurer les coûts des bougies, bannières et post-traitements : baseline rapportée M03 SwiftShader **80 draw calls et 36,45 ms CPU/image en vue A** vs M02 56/28,5. SwiftShader n'est pas une mesure du FPS GPU réel ; si un GPU matériel est disponible, mesurer séparément et consigner modèle/résolution.

## P3 — Mobile paysage en plus du portrait

Conserver le parcours 390×844 fonctionnel, **ajouter un vrai gabarit paysage** (par exemple 844×390 et 960×540), avec rival visible, HUD aux coins, main manipulable, Techniques/ciblages accessibles au doigt et lecture du Clash. Pas de bande centrale obstruée ni de défilement horizontal involontaire. Basculer orientation sans perdre l'état du tour.

## P4 — Vérification mesurable

Capturer **avant M03 / après M03.2 / preview** à mêmes seeds, scénarios, tailles d'écran et phases : vue A frontale, vue B manipulable, phase tactique, choc AA, AG Garde victorieuse, AG absorption 0 blessure, GG et mobile portrait/paysage. Filmstrip ou courte vidéo des mouvements lorsque possible, clairement distinguée d'une vérification temps réel.

Rejouer `npm run typecheck`, `npm test`, `npm run build`, `npm run qa:browser`, `npm run shots:clash` et QA Rupture/Dissipation. Aucun écran n'affiche d'informations secrètes (noms des effets camouflés compris). Mesurer non-chevauchement, taille et contraste des cartes, commandes, stabilité drag et lumière ; documenter les limites.

**Livrer :** `docs/RAPPORT_M03_2.md`, captures vérifiées `screenshots/qa/m03-2/`, éventuellement ADR du cadrage, `JOURNAL.md` et SHA. Ne pas annoncer « fidélité parfaite » si des écarts artistiques subsistent.