# ADR 021 — Personnages « vectoriel V2 » : porte de validation sur Maëlle (M07, lot 5)

Date : 2026-10-18
Statut : **APPROUVÉ — rendu par défaut des rivaux** (passe 25) **et du portrait du joueur** (passe 26, amendement 3). Direction validée par le responsable le 2026-10-18 sur la
planche de Maëlle ; arbitrage relayé par la session principale : « Je valide la direction V2. Fais d’abord une passe de
finition sur Maëlle (plan d’ombre du visage moins tranché, cheveux avec mèches et reflets, yeux lisibles en prudence à
83 px), puis généralise à Kaï, Sélène et Orin », la V2 devenant le rendu par défaut une fois les quatre rivaux faits.
Généralisation (amendement 1), finition et bascule (amendement 2), portrait du joueur (amendement 3) en fin de document ; l’ancien rendu V1 reste disponible
pour la comparaison QA (`?qa=1&figure=v1`). Porte de validation d’origine : sections suivantes. Complète l’ADR 007 (rival procédural), l’ADR 012 (proportions) et l’ADR 017 (buste sans mains) ;
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

## Amendement du 2026-10-18 — généralisation aux quatre rivaux

Statut : **décision du responsable** sur la planche de Maëlle : « Je valide la direction V2 de Maëlle : généralise-la à
Kaï, Sélène et Orin sur le même modèle ». Puis, sur la première galerie : « c'est beaucoup mieux visuellement par contre
les 2 cols au niveau du cou sont mal integre et je pense meme que ce details n'est pas necessaire » → cols montants de
Kaï et col châle d’Orin retirés.

### Décision

- **Socle commun** `src/scene/figureV2.ts` : espace H, rig, humeurs communes (`MOODS_V2`), outils de tracé, sclère,
  iris, paupières découpées dans la tête, sourcils, bouches, rougeur, assemblage (`figureV2Art`) et portrait
  (`drawFigureV2Portrait`). Chaque rival apporte une **identité** (`FigureV2Kit`, `src/scene/v2/`) : tête, mèches avant,
  plan arrière, buste, couleurs (peau, iris, lèvres, sourcils, cils), formes de sourcils et **tempérament** (retouches
  d’humeurs ; le repos des paupières reste commun, les paupières étant découpées dans la tête au repos). Registre :
  `src/scene/v2/index.ts` ; l’interrupteur vaut pour tout rival qui a une identité.
- Extraction vérifiée : les 24 couches de Maëlle produites par le socle sont **identiques bit à bit** à celles de la
  porte (empreintes FNV-1a des pixels, avant / après).
- Trait des cils réglable par identité (épaisseur, départ externe, cils détachés) : plus sobre pour Kaï et Orin.
- Identités :
  - **Kaï, la Braise du quai** : mèches-flammes rejetées en arrière, dont les bouts virent à la braise (bandes de
    couleur vers la pointe), bandeau noué à plaque de laiton frappée de la Cendre et queues flottantes, cicatrice
    cousue sur la pommette, mâchoire carrée, oreilles dégagées et anneau d’or, veste de docker ouverte sur un maillot
    sombre, baudrier, écusson ; tempérament : sourire en coin un sourcil haussé, triomphe à pleines dents.
  - **Sélène, liseuse du Voile** : carré argent-lavande à frange nette et reflet lustré, diadème au croissant du Voile
    et pendeloque de cristal, voile translucide semé d’étoiles sur les épaules, visage ovale, grain de beauté, longs
    cils, manteau indigo à col officier, brandebourgs d’argent, constellation brodée ; tempérament : paupières
    mi-closes, sourire en coin.
  - **Orin, l’arpenteur des Astres** : locks rassemblés en chignon lié d’or (étoile de l’Astre), locks qui tombent
    dans le dos et devant la tempe, côtés courts à texture crépue, barbe taillée, lunettes rondes cerclées de laiton
    (couche des mèches, au-dessus des yeux), manteau ocre aux revers brodés d’une carte du ciel, gilet bleu nuit,
    astrolabe en pendentif ; tempérament : pensif, un sourcil levé.
- Outillage : `tools/l5-galerie.mjs` (planche par rival, écran Rencontres, vidéo des réactions des quatre rivaux),
  `tools/l5-cout.mjs` (par rival), `LQV_QA_QUERY` (`qa:browser`, `qa:product`, `qa:rc`), `LQV_PERF_ENTRY`
  (`perf-compare`), `window.__lqvFigureCost(essais, id)`.

### Conséquences

- Mesures (journal, passe 24 ; `artifacts/qa/m07/perf-compare-l5-{braise,voile,astre}-*.json`, `l5-cout-rivaux-*.json`) :
  temps GPU médian par image, V1 → V2, vue A, 1280×720 : Radeon 780M 2,52 → 2,53 ms (Kaï), 2,48 → 2,56 ms (Sélène),
  2,50 → 2,52 ms (Orin) ; RTX 4060 0,5 à 1,1 ms des deux côtés (horloge bimodale) ; 165 FPS ; 83 → 93 appels de dessin
  (Kaï, Sélène et Orin n’avaient pas de capuche en V1) ; génération des couches 12–15 → 29–39 ms (780M), 11–15 →
  23–32 ms (RTX) ; première image après l’apparition du rival 40–42 → 74–109 ms (780M), 45–49 → 83–89 ms (RTX), une fois
  par changement de rival ; aucun nouveau programme GPU (40) ; 1,85 M texels par rival (0,50–0,57 M en V1).
- Rendu par défaut toujours identique au pixel près à `6fdd27b` (12 cas) ; contraste des textes du duel inchangé
  (min 5,3:1, 0 texte sous le seuil, 24 captures des trois nouveaux rivaux) ; bundle +32 ko (873 ko).

Suite : amendement 2.

## Amendement 2 du 2026-10-18 — passe de finition, puis V2 par défaut

Statut : **décision du responsable** (arbitrage relayé, voir le statut). Constat de la relecture des planches : le plan
d’ombre du côté droit du visage formait une coupure verticale nette (effet de masque, surtout à 1920), les cheveux de
Maëlle un casque sombre uni, et en prudence à 1280×720 les yeux devenaient deux traits fins.

### Décision

- **Ombre propre adoucie** (`softShade`, socle) : le terminateur suit la pommette (plan d’ombre resserré sur le côté du
  visage, creux sous la pommette), bordé d’une demi-teinte décalée vers la lumière ; bords légèrement fondus (flou de
  canvas, 1,4 et 2,6 px de texture), contour du visage net. Appliqué aux quatre rivaux.
- **Cheveux de Maëlle** : mèches marquées (demi-teinte au cœur de chaque mèche, séparations plus nettes), reflets en
  tirets sur deux bandes lustrées, chevelure arrière éclaircie (occlusion réduite, mèches et reflet en couronne), quelques
  cheveux libres sur le bord des pans ; reflets plus clairs.
- **Yeux en prudence** : humeurs communes moins fermées (`focused` paupière 0,34 → 0,28, plissement 0,3 → 0,16 ;
  `thinking` 0,3 → 0,27 / 0,15 → 0,1 ; `annoyed`, `pained`, `smug` desserrés), retouches de tempérament ajustées
  (Kaï, Sélène, Orin) : l’ouverture de l’œil reste ≥ 16 unités H en prudence (≈ 11 px à 1280×720), iris visible.
- **V2 par défaut** pour les quatre rivaux (duel, affiches, HUD) ; `?qa=1&figure=v1` rend l’ancien V1 (comparaison et
  preuve que son chemin reste intact) ; le duelliste joueur reste dessiné en V1 (hors périmètre).

### Conséquences

- Planche avant / après : `screenshots/qa/m07/l5-finition/planche-finition-ronce.png` ; galerie finale : `screenshots/qa/m07/l5-rivaux/`.
- Chemin V1 (`?qa=1&figure=v1`) identique au pixel près au rendu par défaut de `6fdd27b` (12 cas). Temps GPU par image,
  V1 contre V2 par défaut (Maëlle, vue A, 1280×720) : Radeon 780M 2,52 → 2,52 ms, RTX 4060 1,08 → 1,08 ms ; 165 FPS ;
  85 → 93 appels de dessin. Génération des couches 10–18 → 27–39 ms selon le rival et le GPU ; première image après
  l’apparition d’un rival 41–54 → 76–112 ms (une fois par changement de rival) ; aucun nouveau programme GPU.
- QA avec la V2 par défaut : `qa:browser` 5/5, `qa:product` 8/8 (64/64), `qa:rc` 9/9 (46/46 ; contraste des écrans min
  5,4:1, longévité 37 textures par rival) ; contraste du duel 32 captures, 0 texte sous le seuil ; 0 fuite de secret.

Restent proposés : retrait du V1 (et de ses deux défauts relevés) quand la comparaison n’est plus utile ; pré-génération
des couches aux temps morts (à-coup d’apparition) ; portrait du joueur.

## Amendement 3 du 2026-10-18 — portrait du duelliste joueur en V2 (passe 26)

Statut : suite proposée en fin de passe 25 (« Restent proposés »), confiée par la session principale ; même direction que
les rivaux, validée par le responsable. Constat : le portrait du HUD bas-gauche gardait le rendu V1 (visage rond en
dégradés radiaux, frange d’un bloc, bandeau rectangulaire) à côté de rivaux en V2.

### Décision

- **Identité du joueur** `src/scene/v2/joueur.ts`, sur le socle commun : **même apparence qu’en V1** (`playerFigure`) —
  carré argent, bandeau aux couleurs de la Signature frappé de l’emblème, manteau de la famille à patte de boutonnage et
  boutons, emblème brodé sur la poitrine, peau claire, yeux bleus (`#4a6fd6`), mâchoire moyenne — redessinée en V2 :
  frange balayée en mèches effilées (une longue entre les sourcils, les autres au-dessus : sourcils toujours visibles),
  raie à droite, reflet en couronne, pans du carré à pointes qui se recourbent sous la mâchoire, bandeau d’étoffe à
  médaillon et pans fourchus qui flottent à gauche (Kaï porte un bandeau large à plaque, pans à droite), encolure ronde
  sans col montant (retour du responsable sur les cols, amendement 1), cils sobres. La tenue (manteau, patte, bandeau)
  dérive de la palette de la famille jouée : une identité par famille, `player-<Famille>` comme l’id de `playerFigure`.
- **Registre** : `kitV2('player-<Famille>')` ; `usesV2` est vrai pour toute figure qui a une identité V2 ;
  `?qa=1&figure=v1` rend aussi le joueur en V1 (comparaison).
- Le joueur n’a pas de rig 3D : seul son portrait est dessiné. **`figureV2PortraitArt`** ne génère que les couches du
  portrait (tête, mèches, plan arrière, buste, sclère, iris, paupières supérieure et inférieure, sourcil et bouche de
  repos), avec les mêmes fonctions de dessin que `figureV2Art` ; il sert à tous les portraits V2, rivaux compris (images
  identiques à la passe 25).
- **Pré-génération** : le portrait du joueur (Signature du deck sauvegardé) rejoint les affiches générées aux temps morts
  du shell (L4), au lieu d’être dessiné au premier affichage du duel.
- Mesure et preuves : `window.__lqvPortraitCost(essais, id)` (`?qa=1`), `tools/l5-joueur.mjs`.

### Conséquences

- Planche avant / après (HUD à l’échelle 1:1 des quatre familles à 1280×720 et 1920×1080, portrait source agrandi, duel
  complet) : `screenshots/qa/m07/l5-joueur/planche-joueur.png` ; captures dans le même dossier.
- **Rien d’autre ne change** (`artifacts/qa/m07/l5-joueur.json`, Radeon 780M, build de départ `89b17a2`) : chemin V1 du
  joueur (`figure=v1`) identique au portrait par défaut d’avant pour les quatre familles ; portraits des quatre rivaux
  identiques ; duel complet, portrait du joueur masqué, **0 pixel différent** à 1280×720 et 1920×1080 (témoin, portrait
  visible : 7 901 et 14 893 pixels).
- Contraste des textes du duel, quatre familles, quatre états, deux tailles : **identique avant / après, min 5,1:1, 0 texte
  sous le seuil** (64 captures ; `artifacts/qa/m07/contraste-l5-joueur-*.json`).
- Coût du portrait du joueur (dessin et PNG, médiane de 25 essais, plusieurs séries) : V1 5 à 8 ms → V2 19 à 25 ms
  (Radeon 780M), 5 à 10 → 13 à 23 ms (RTX 4060), une fois par famille et graine d’art (cache), désormais aux temps morts ;
  couches d’un portrait V2 : 24 → 12 canvas, −18 à −39 % du temps de génération (apparié dans chaque série), rivaux
  compris. Aucune texture GPU de plus (le portrait est une image du DOM) ; bundle +12 ko (885,9 ko).

Restent proposés : retrait du V1 (et de ses deux défauts relevés) ; pré-génération des couches des rivaux aux temps morts
(à-coup d’apparition).

## Arbitrage du responsable du 2026-10-18 — suite de L5 (mandat M08)

Relayé par la session principale après la passe 26 ; consigné dans `docs/missions/M08_CONSOLIDATION_DU_COMBAT.md` :

- « vectoriel V2 » **conservé comme nouvelle base graphique** des personnages, PNJ de la ville compris (M08, lot C3) ;
- Aseprite **n’est plus considéré comme indispensable** pour ce chantier ;
- les quatre rivaux gardent leurs silhouettes et caractéristiques distinctives ;
- portrait du joueur V2 **conservé**, détails à revoir lors d’une future passe artistique ;
- pré-génération des couches des personnages : **priorité technique suivante** (M08, lot C1) ;
- retrait du V1 (`?qa=1&figure=v1`) : **après** la fin des comparaisons et la réception du lot (M08, lot C4).
