# ADR 019 — Mise en scène HD-2D du face-à-face (M07, lot 3)

Date : 2026-10-17
Statut : **APPROUVÉ par le responsable** pour la direction (« comme une véritable mise en scène visuelle, comme une
pièce de théâtre », mandat M07 point 3) et pour le lancement du lot (« Oui, lance le lot 3 : mise en scène HD-2D
autour du face-à-face, comme proposé ») ; le rendu lui est présenté en captures avant / après. **Amende l’ADR 012**
(cadrage, éclairage) et l’**ADR 013** (baseline desktop) sur la lumière, le décor et le rendu ; cadrage, ancrage
caméra, HUD et présence du visage inchangés. **Amendé le 2026-10-18** : repli automatique du post-traitement quand le
rendu décroche durablement (section « Amendement » en fin de document).

## Contexte

Après le lot 2, la composition est bonne mais la scène est plate : une lumière directionnelle et une ambiance forte
éclairent également le rival, la table, les piliers et le fond ; le fond est presque aussi lumineux que le visage
(rapport visage / fond ≈ 3,2) ; les bougies blanches attirent l’œil ; rien ne sépare les plans du décor. Le
responsable veut une scène orchestrée « comme une pièce de théâtre » : cartes, table, joueurs, décor et lumière, sans
s’attarder sur les petits éléments.

## Décision

### Plan de feux

- **Salle baissée** : ambiance (hémisphère) de 1,0 à 0,62.
- **Deux projecteurs** sans atténuation (comme l’ancienne lumière directionnelle) : l’un découpe le buste et le visage
  du rival (même position que l’ancienne clé), l’autre tombe sur la table et le cercle de Clash. Une lumière de plus
  qu’avant au total.
- **Contre-jour** : les plans 2,5D du rival ne reçoivent pas de lumière par l’arrière ; un plan additif ovale derrière
  le buste, de la couleur de sa famille mêlée de blanc chaud, le détache du décor (un appel de dessin, caché en bas par
  la table, resserré pour ne pas délaver les bannières voisines).
- **Bougies** à leur place d’accessoires : cire moins blanche et moins lumineuse, halos plus discrets, lumières des
  bougies de table de 2,8 à 2,2.
- **Noir salle** pendant la révélation et le Clash : l’ambiance baisse de 40 %, les bougies de 35 %, le projecteur de
  table monte de 30 %, puis tout revient en 2,6 s. Jamais en mouvement réduit ni en rendu figé.

### Profondeur et table

- **Perspective atmosphérique** : brume bleu ardoise à partir de 12,5 (derrière le rival et le bord de la table, qui
  restent nets) ; piliers, balustrade et plantes deviennent des silhouettes froides au lieu de disparaître dans le noir.
- **Fond peint repoussé**, une fois dans sa texture (aucun coût par image) : léger flou de profondeur, voile froid plus
  dense en haut, côtés dans l’ombre.
- **La table comme une scène** : la lumière tombe sur le cercle et les deux rangées ; les bouts de la table et le bord
  proche s’enfoncent dans l’ombre (peint dans la texture).

### Rendu

- Scène rendue dans une cible HDR, puis **halo lumineux** (bloom : force 0,3, rayon 0,4, seuil 1,0 : flammes,
  emblèmes, contre-jour et effets, pas le visage), **passe de finition** unique (ombres tirées vers le bleu froid,
  hautes lumières vers l’ambre, saturation +10 %, vignettage ovale qui laisse intacts le visage et le cercle, puis
  tonemapping ACES et sortie sRGB), puis **FXAA** compact sans boucle (celui de three.js fait émettre au compilateur
  Direct3D d’ANGLE un avertissement que la console relaie).
- L’anticrénelage multi-échantillonné ×4 de la cible HDR coûtait à lui seul ≈ 3,5 ms GPU par image sur la Radeon
  780M à 1280×720 ; il est remplacé par FXAA (≈ 0,2 ms). Contrepartie : bords des bougies un peu plus crénelés ; le
  visage reste net (gros plans comparés).
- Le halo est calculé à **demi-définition** (flou par nature, il n’y perd rien de visible).
- **Densité de rendu de la scène 3D plafonnée à 1** pixel par pixel CSS quand le post-traitement est actif (1,5 sans,
  comme avant) : sur l’écran du poste (2560×1600 à 150 %), le temps GPU du 780M était de 6,4 ms par image à 1,5
  (au-delà des 6,06 ms d’une image à 165 Hz), 4,4 ms à 1,25, 2,9 ms à 1 (2,6 ms avant le lot). L’interface DOM reste à
  la pleine définition ; sur un écran à 100 %, rien ne change. Contrepartie : scène 3D un peu plus douce sur un écran
  haute densité (gros plans comparés à 1, 1,25 et 1,5).
- Mesure de coût (QA, `?qa=1&ablate=…`) : `bloom` et `post` (rendu direct, sans post-traitement) s’ajoutent aux
  ablations existantes. `stats().frame` compte les images de l’arène (et non les passes).

## Conséquences

- Mesures (détail : journal, passe 18 ; `artifacts/qa/m07/perf-*-l3-*.json`, `lum-l3-*.json`) : luminance du visage
  +24 %, du centre de la table +60 %, du fond −57 %, des bouts de la table −44 % (rapport visage / fond 3,2 → 9,3).
  Temps GPU médian par image, avant → après : 780M 1280×720 1,69 → 2,82 ms ; 780M 1920×1080 1,98 → 3,81 ms ; 780M sur
  l’écran du poste 2,63 → 2,86 ms (165 FPS avant comme après) ; RTX 4060 0,70 → 1,11 ms (1280) et 1,33 → 1,30 ms
  (écran). En partie complète, intervalle médian de 6,1 ms (165 Hz) sur les deux GPU ; quand le GPU intégré ralentit
  (état du poste), le rendu décroche plus tôt qu’avant à 1280×720, faute de marge : un repli automatique du
  post-traitement est proposé en suivi.
- Bundle +22 ko (passes de post-traitement de three.js) ; 16 appels de dessin de plus par image (passes).
- Interface DOM inchangée ; contraste des textes remesuré sur capture.
- Non retenus pour ce lot : profondeur de champ (coût), rideaux d’avant-scène (trop littéraux pour la salle aux
  bougies), éclairage différent à chaque phase du tour au-delà du noir salle.

**Cette décision n’introduit aucune règle métier nouvelle.**

## Amendement du 2026-10-18 — repli automatique du post-traitement

Statut : suivi technique proposé au lot 3 (« repli automatique du post-traitement quand l’intervalle des images
dépasse durablement le budget »), réalisé sans changer le rendu approuvé tant que le poste tient la cadence.

### Contexte

Le post-traitement laisse moins de marge au GPU intégré (Radeon 780M, 1280×720 : ≈ 2,9 ms contre 2,0 ms par image en
rendu direct). Quand le poste ralentit le GPU intégré, les parties complètes du lot 3 montraient 639 à 1 160 images
au-delà de 16,7 ms à 1280 (240 pour le build d’avant le lot), alors que l’intervalle médian restait à 6,1 ms : ce
sont des images isolées qui manquent deux intervalles d’écran (18,2 ms), pas un rendu uniformément plus lent.

### Décision

- **Observation** (`src/scene/postFallback.ts`, module pur testé) : intervalles requestAnimationFrame de la boucle de
  l’arène seulement — jamais en rendu figé, en mouvement réduit ni pendant la pause des menus ; l’intervalle qui suit
  une reprise de la boucle n’est pas compté, un intervalle de plus d’une seconde est un trou (onglet masqué).
- **Tranches d’une seconde.** Rythme nominal de l’écran : premier quartile des intervalles, le plus bas vu depuis le
  début du duel (moins sensible qu’un centile bas aux intervalles plus courts que la période qui suivent une image en
  retard, observés sous charge : 5,4 ms au 10e centile pour un écran à 6,06 ms). Une tranche est **mauvaise** si sa médiane dépasse
  1,6 nominal (rendu durablement plus lent que l’écran) ou si au moins 5 % de ses images dépassent max(1,6 nominal,
  17,3 ms) (sous 60 images/s, marge de gigue : deux intervalles d’un écran à 120 Hz ne comptent pas).
- **Un cran après trois tranches mauvaises consécutives** ; la tranche suivante n’est pas jugée (effet du cran) ; les
  deux premières tranches d’un duel non plus (mise en place du plateau). Ordre : complet → **sans halo**
  (`bloom.enabled = false`) → **rendu direct** (`renderer.render`, tonemapping ACES et sortie sRGB du renderer :
  l’étalonnage, le vignettage et le halo disparaissent, l’anticrénelage multi-échantillonné du canvas remplace FXAA).
- **Pas d’oscillation** : un seul sens pendant un duel, jamais de remontée ; le rendu complet revient aux menus
  (`setPaused(true)`), avant le duel suivant, avec un nominal remesuré (autre écran, poste reposé).
- **Densité inchangée** (1 avec le post-traitement), contrairement au chemin de l’ablation `post` (1,5) qui servait
  de modèle au rendu direct : sur l’écran du poste, le rendu direct coûte 3,35 ms GPU par image à 1,5 (vue A), plus
  que le post-traitement complet à 1 (2,82 ms) ; 2,10 ms à 1. Le repli à 1,5 y aurait aggravé la charge.
- **Aucune compilation** au changement de niveau : les programmes du rendu direct sont compilés à la création
  (`renderer.compile` vise l’écran) et gardés par chaque matériau (44 programmes avant comme après les deux crans).
- **QA** : `stats().post` (niveau, repli actif, nominal, dernière tranche, crans du duel avec instant, raison et
  médiane) et `stats().programs` ; `?qa=1&fallback=off|nobloom|direct` désactive le repli ou impose un niveau (mesure
  du coût de chaque niveau) ; `tools/qa-fallback.mjs` (deux duels du produit), charge GPU injectée par les outils
  (`LQV_GPU_STRESS_MS`).

### Conséquences

- Coût de chaque niveau (temps GPU médian par image, Radeon 780M, rondes entrelacées, vue A / B) : 1280×720 complet
  2,86 / 2,99 ms → sans halo 2,39 / 2,53 ms ; complet 2,85 / 2,60 → direct 2,01 / 2,04 ms ; écran du poste complet
  2,82 / 2,83 → direct 2,10 / 2,11 ms. RTX 4060 : 0,5 à 1,1 ms selon l’état d’horloge, pour tous les niveaux.
- Poste en bon état, repli actif : aucun coût GPU ajouté (780M, 1280×720 : 2,50 ms par image avant comme après) et
  aucun cran en partie complète (21 et 13 images au-delà de 16,7 ms sur ≈ 16 600 à 1280 et 1920 sur la 780M, 21 et
  11 sur la RTX 4060).
- Sous charge GPU injectée (un autre contexte WebGL, `gpuStress`) : le repli franchit ses deux crans dans l’ordre,
  chacun après un décrochage mesuré indépendamment par l’outil, sans compilation, et le duel suivant repart au rendu
  complet (`tools/qa-fallback.mjs`, 10/10 sur chaque GPU). Son **gain** n’est pas démontré de façon reproductible
  avec cette charge, qui impose son propre rythme : sur la scène fixe, intervalles appariés identiques quel que soit
  le niveau ; en partie complète, gain net dans une paire sur deux (médiane 6,4 ms en rendu direct contre 12,1 ms
  sans repli) ; à 5,5 ms, régime limite par rafales, aucun cran. Dans l’état réel « GPU intégré ralenti », c’est notre
  propre travail qui ralentit : le repli le réduit de 16 % puis 30 % à 1280, de 25 % sur l’écran du poste ; à mesurer
  quand cet état se reproduira.
- Limites : le repli voit des intervalles, pas leur cause ; un à-coup du fil principal (DOM, tâche longue) ou un
  écran plus lent pendant le duel (fenêtre déplacée, économiseur d’énergie de Chrome à 30 images/s) peut le faire
  descendre pour rien, jusqu’au duel suivant. Un poste régulier mais plus lent que l’écran dès le début (82 images/s
  stables sur un écran à 165 Hz) n’est pas tenu pour décroché. Un régime limite, par rafales d’une à deux secondes
  (≈ 2 à 4 % d’images en retard), ne déclenche pas le repli : le rendu approuvé est gardé. Le changement de niveau se
  voit (halo, puis étalonnage et vignettage) ; il n’est pas fondu.

**L’amendement n’introduit aucune règle métier nouvelle.**
