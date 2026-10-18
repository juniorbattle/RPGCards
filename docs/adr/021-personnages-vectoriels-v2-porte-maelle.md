# ADR 021 — Personnages « vectoriel V2 » : porte de validation sur Maëlle (M07, lot 5)

Date : 2026-10-18
Statut : **PROPOSÉ — porte de validation**. Lot L5 décidé par le responsable le 2026-10-18 (mandat M07) ; le modèle V2
est livré derrière un interrupteur opt-in et **n’est pas généralisé** tant que le responsable ne l’a pas validé sur la
planche comparative. Complète l’ADR 007 (rival procédural), l’ADR 012 (proportions) et l’ADR 017 (buste sans mains) ;
ne change ni le cadrage (ADR 013), ni la scène (ADR 019), ni les règles.

## Contexte

Depuis L1–L4, le rival est grand, frontal et bien éclairé : ce sont maintenant les personnages qui limitent la qualité
perçue. Le modèle V1 (`rivalTextures.ts`) dessine un visage rond en dégradés radiaux, des cheveux et une capuche en
aplats d’un seul ton, une bouche « O » pour la surprise et un bandeau rectangulaire rouge pour la rougeur. Le
responsable veut « une vraie identité graphique pour chaque adversaire, pas seulement des visages moins ronds » et a
choisi une porte sur une seule rivale : Maëlle (Ronce), version actuelle contre « vectoriel V2 » tracé en code, sans
sprites ni Aseprite. Les images de référence évoquées en séance n’expriment qu’une intention : rien n’en est copié.

## Décision

### Interrupteur

- `src/scene/figureStyle.ts` : style `v1` (défaut) ou `v2`, fixé une fois au chargement (`main.ts`) depuis
  `?qa=1&figure=v2`. `usesV2(id)` n’est vrai que pour `ronce` : Kaï, Sélène et Orin restent en V1.
- Le chemin V1 n’est pas modifié : le rendu par défaut est **identique au pixel près** (prouvé par
  `tools/l5-identique.mjs`, build `6fdd27b` contre build L5, quatre rivaux, duel complet et écran Rencontres).

### Un seul modèle pour le duel et les affiches

- `src/scene/maelleV2.ts` dessine toutes les couches dans l’« espace H » (les unités du canvas de tête V1 : 256 × 312,
  yeux en y ≈ 151,5, menton en y ≈ 268) ; capuche, buste et portrait convertissent cet espace vers leur propre plan.
  `drawMaelleV2Portrait` compose le portrait des affiches et des HUD avec **les mêmes canvas**, posés à leur place
  dans le rig (expression de repos), à double définition (384 px : les affiches sont affichées à ≈ 280 px CSS).
- Tracés : données de chemin SVG écrites à la main → `Path2D` (courbes de Bézier cubiques) ; ombrage en **aplats**
  (lumière principale en haut à gauche, plan d’ombre du côté droit du visage, ombres portées des mèches) ; traits
  d’encre **effilés** (largeur variable le long d’une cubique) ; aucun dégradé radial sur le visage, sauf la rougeur
  des joues. Identité de Maëlle : capuche à revers brodé de ronces (tige, feuilles, épines), pèlerine à ourlet en
  feuilles pointues, agrafe de laiton à couronne d’épines autour de l’emblème de la Ronce, tresse posée sur l’épaule,
  frange courte, taches de rousseur, yeux verts à cœur ambré.

### Architecture en couches conservée, mécanique des yeux améliorée

Mêmes couches animées qu’en V1 (sclère, iris, paupières, sourcils, bouche, rougeur), mêmes plans de tête et de buste,
même cadrage. Changements propres au rig V2 (`rival.ts`, branche `v2`, chemin V1 intact) :

- **Paupières découpées dans la tête** : la paupière supérieure est une copie de la région de la tête au-dessus de
  l’œil, avec la ligne de cils et le pli ; elle **glisse** au lieu d’être écrasée (cils d’épaisseur constante).
  Au repos, elle est invisible (mêmes pixels que la tête).
- **Paupière inférieure** (nouvelle couche, même principe) : plissement des yeux de la prudence, du sourire, de la
  douleur ; elle cache aussi le bas de l’iris quand le regard descend.
- **Paupière close** dessinée, affichée au-delà de 0,8 (clignement) ; sclère et sourcils en miroir pour l’œil droit.
- **Mèches avant** sur une couche au-dessus des yeux et des sourcils ; frange courte, pour que les sourcils restent
  visibles même haussés (surprise).
- **Sourcils** : trois formes (repos, arqué pour la surprise, froncé) échangées comme les bouches ; **sens corrigé** :
  `browAngle > 0` abaisse la tête du sourcil côté nez. En V1, la rotation l’élève (un rival « en colère » a l’air
  inquiet) : défaut relevé, non corrigé en V1 pour garder le rendu par défaut identique.
- **Bouches** redessinées (lèvres supérieure et inférieure, commissures, dents) et agrandies de 25 % ; surprise =
  lèvres entrouvertes au lieu d’un « O » noir ; grimace = dents serrées, coins tirés vers le bas. L’auto-éclairage de
  la bouche suit la forme affichée (en V1, il reste celui de la bouche neutre : défaut relevé, non corrigé en V1).
- **Rougeur** peinte sur les pommettes (texture), au-dessus des paupières, au lieu d’un bandeau uni.
- **Humeurs** (`MOODS_V2`) : mêmes 14 humeurs et mêmes déclencheurs publics, réglages propres au V2 (plissement,
  forme des sourcils). Prudence : regard plissé par en dessous, lèvres pincées ; surprise : sourcils arqués, blanc
  visible au-dessus de l’iris, lèvres entrouvertes.
- **Capuche et pèlerine** sur un plan plus grand (2,01 × 2,10 au lieu de 1,62 × 1,82, unités de la tête) dessiné
  **devant** le buste (ordre de rendu 1,5) : la pèlerine couvre les épaules ; le buste (manteau, tunique, baudrier)
  se voit autour et dans l’ouverture. Buste toujours sans mains (ADR 017).

### Mesures (porte)

Planche, vidéo, coût GPU et coût de génération : journal, passe 23 ; `screenshots/qa/m07/l5/`,
`artifacts/qa/m07/l5-*.json`, `artifacts/qa/m07/perf-compare-l5-*.json`.

## Conséquences

- Le rig V2 compte plus de couches (24 canvas au lieu de 15 ; trois plans de paupières par œil au lieu d’un, la couche
  des mèches) et 3,2 fois plus de texels (1,85 M contre 0,57 M). Mesures (journal, passe 23) : temps GPU par image
  inchangé dans le bruit sur la Radeon 780M (1280×720 : 2,62 → 2,57 ms ; 1920×1080 : 3,44 → 3,35 ms) et la RTX 4060
  (0,5 à 1,15 ms des deux côtés) ; 8 appels de dessin de plus (85 → 93) ; temps processeur par image +0,16 à +0,25 ms ;
  génération des couches 15 → 47 ms (780M) et 17 → 33 ms (RTX) ; première image après l’apparition du rival 63 → 101 ms
  (780M) et 71 → 124 ms (RTX), une fois par changement de rival ; aucun nouveau programme GPU. Bundle : +34 ko.
- Si le responsable valide, la généralisation à Kaï, Sélène et Orin suit le même modèle (un module d’identité par
  rival dans l’espace H, mêmes outils de tracé et même rig), puis le retrait du V1 et de l’interrupteur ; les deux
  défauts V1 relevés (sens des sourcils, auto-éclairage de la bouche) disparaissent avec lui.
- Option « sprites illustrés » : écartée de cette porte ; elle exigerait d’amender la règle « aucune image externe au
  runtime » et des illustrations fournies par le responsable.

**Cette décision n’introduit aucune règle métier nouvelle ; aucune information secrète n’est exposée (les humeurs ne
suivent que des faits publics, comme en V1).**
