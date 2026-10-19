# ADR 022 — Lieux de duel déclaratifs (M08, lot C2)

Date : 2026-10-18
Statut : **cadrage APPROUVÉ par le responsable** (« Cadrage C2 validé tel quel : salle actuelle = salle de jeu de cartes,
porte = la rue (le Quai, la nuit), même table partout pour la porte, Duel libre — Kaï dans la rue. Lance la porte. »,
séance du 2026-10-18). **Porte de validation livrée** (système de lieux, salle migrée, rue) ; rendu de la rue présenté au
responsable en captures, **bar et arène après son retour**. Complète l’ADR 019 (mise en scène HD-2D) et l’ADR 020
(écrans hors duel) ; ne modifie ni la composition du duel (ADR 013, 016, 018), ni les personnages (ADR 021), ni les
règles.

## Contexte

Mandat M08, direction 1 du responsable : « Nous aurons divers environnements de combat de cartes (dans la rue, dans une
salle de jeu de cartes, dans un bar, dans une arène), donc on doit avoir des décors variés et adaptés à la situation. »
Critère du mandat : un changement de décor ne déplace ni le plateau, ni les HUD, ni le cadrage du rival ; contraste
≥ 4,5:1 dans chaque lieu ; coût GPU mesuré sur les deux GPU ; repli du post-traitement opérant partout.

Avant ce lot, le décor était écrit en dur dans `src/scene/arena.ts` (1 393 lignes) avec la caméra, la table, le rival,
les FX et le post-traitement : fond peint, piliers, balustrade, bannières, plantes, bougies, poussières, plan de feux.

## Décision

### Un lieu = des données + un montage

- `src/presentation/venues.ts` (pur) : identifiants des lieux construits (`salle`, `rue`), lieu par défaut (`salle`),
  nom et intention. Le produit le lit comme `personalities.ts`.
- `src/scene/venues/` : `types.ts` (contrat), `common.ts` (peinture, flammes et halos en points animés, libération),
  `salle.ts`, `rue.ts`, `index.ts` (registre). Un `VenueDef` déclare la couleur de fond, la brume (toujours linéaire),
  le réglage du gréement de lumières, le halo, une éventuelle surcharge des plans de feux hors duel, et `mount` (géométrie,
  textures peintes en code à la graine d’art, animation, ablations QA, libération).
- `arena.ts` garde les invariants : caméra ancrée, table (son bord lointain ancre le cadrage), rival, contre-jour, FX du
  duel, post-traitement et repli. `setVenue(id)` change de lieu ; `prepareVenue(id)` prépare un décor aux temps morts.
- `src/scene/staging.ts` : plans de feux par écran (ADR 020), multiplicateurs appliqués aux réglages du lieu courant.

### Règles qui protègent le duel

1. **Gréement fixe** : ambiance, projecteur du visage, projecteur de table, contour du rival, quatre lumières pratiques,
   lumière du Clash, dans cet ordre, pour tous les lieux. Le nombre et le type des lumières font partie de la clé des
   programmes GPU : les garder fixes évite de recompiler tous les matériaux (rival et table compris) à chaque lieu.
2. **Projecteurs du visage et de la table** : position et cône communs ; un lieu n’en règle que la couleur et
   l’intensité, à ±15 % de la salle (test). Exposition fixe.
3. Caméra, ancres, table, rival, contre-jour, FX, HUD et plateau DOM ne sont jamais paramétrés par le lieu.
4. Étalonnage de la finition inchangé (ses ombres froides et hautes lumières ambrées font déjà la palette « nuit de
   port ») ; halo par uniformes. Chaque lieu reste lisible au niveau « direct » du repli.

### Salle migrée au pixel près

Le décor historique est déplacé tel quel dans `venues/salle.ts`. Un seul écart est apparu à la première comparaison :
6 × 3 pixels (max 12/255) au bord lointain de la table, à 1920×1080 seulement. three.js trie les objets opaques par
identifiant de matériau : la table et son liseré, créés après le décor, étaient dessinés après lui, et quelques égalités
de profondeur changeaient de gagnant. Les matériaux de la table sont donc créés **avant** le décor (ordre historique).

### La rue — le Quai, la nuit

Théâtre de rue, la scène entière plutôt que les petits objets : toile de fond du port (eau, bateaux à quai et leurs
mâts, rive d’en face et phare, lune voilée, toits lointains) ; deux façades de maisons du quai en châssis, ouvertes de
0,16 rad vers la salle pour qu’on lise leurs devantures, qui occupent les deux zones de décor laissées par les HUD ;
lanternes murales, enseigne qui se balance, guirlandes de lanternes en éventail (tendues d’un mât hors champ jusqu’aux
façades : elles encadrent le haut de l’image et laissent la tête du rival dégagée) ; lanternes-tempête aux coins de la
table à la place des bougies ; caisses, tonneaux, bittes d’amarrage ; pavés mouillés ; bancs de brume froide au bout de
la rue ; papillons de nuit. Plan de feux : clair de lune froid, projecteurs chauds, quatre lanternes.

### Changement de lieu, rencontres, écrans

- `Encounter.venue` (`product/encounters.ts`), défaut `salle` ; « Duel libre — Kaï » se joue dans la rue. C3 y
  rattachera ses rencontres PNJ.
- Hors duel (ADR 020) : la scène montre le lieu de la rencontre courante (Préparation : là où le duel aura lieu), sinon
  celui du dernier duel, sinon la salle ; même règle que le rival montré.
- Le lieu ne change que hors duel (écran Préparation, retour aux menus, lancement d’un duel repris).
- **Écart au cadrage, mesuré** : le cadrage prévoyait un seul décor résident sur le GPU. Mesuré, chaque changement
  coûtait alors 100 à 180 ms à la première image (au-delà du seuil de ≈ 100 ms fixé par le cadrage) : recompilation des
  programmes du décor quitté puis repris et nouvel envoi de ses textures, la peinture n’en étant qu’une petite part.
  Décision : **deux décors gardés montés** (le lieu courant et le précédent, ou le suivant préparé), et le décor des
  rencontres jouables **préparé aux temps morts** (peinture, textures envoyées au GPU, programmes compilés pour les deux
  sorties : la cible HDR du post-traitement et l’écran du rendu direct). `?qa=1&venueCache=1` rétablit un seul décor
  résident pour la mesure.

## Conséquences

### Mesures de la porte (journal, passe 30 ; `artifacts/qa/m08/`)

- **Salle migrée identique au pixel près** au build `bb0535b` : 24 cas (scène 3D seule des quatre rivaux, duel complet,
  écrans Rencontres, Accueil et Préparation, scène seule et capture complète, 1280×720 et 1920×1080), 0 pixel ; témoin
  (la rue) : 921 276 et 2 072 640 pixels différents.
- **Invariance d’un lieu à l’autre** (salle / rue, même duel) : calques DOM seuls (plateau, HUD, main) 0 pixel en vues A
  et B à 1280 et 1920, écran Préparation 0 pixel ; matrices de projection et de vue de la caméra, transformation du rival
  et ancres (.205 / .455) identiques : visage 83 / 125 px dans les deux lieux.
- **Contraste** (56 captures, 4 056 textes) : minimum identique lieu pour lieu (5,1:1 vue A, 4,8:1 vue B et contre Kaï,
  5,1:1 au niveau « direct »), 0 texte sous 4,5:1 ; écrans hors duel `qa:rc` S 11/11 dans la rue imposée.
- **Lumière** : visage 0,322 dans la rue contre 0,331 dans la salle (−3 %) ; rapport visage / fond 14,6 contre 13,2.
- **GPU par image** (`perf-compare`, rondes entrelacées, salle / rue, vue A) : Radeon 780M 2,15 / 2,09 ms (1280×720) et
  2,74 / 2,70 ms (1920×1080) ; RTX 4060 1,18 / 1,20 ms (1920×1080), 0,4 à 1,0 ms à 1280×720 selon l’état d’horloge des deux
  côtés ; 165 FPS ; appels de dessin 93 → 78 ; processeur par image 1,39 → 1,29 ms. Migration de la salle
  (`bb0535b` → nouveau build, 780M, 1280×720) : 2,40 → 2,14 ms, rendu identique : la table, dessinée désormais avant le
  décor, en masque les fragments cachés (explication probable).
- **Changement de lieu** (produit, 780M) : première apparition de la rue préparée aux temps morts 22 à 67 ms à la
  première image selon la série (20 ms sur la RTX 4060), retours 5 à 10 ms (témoin sans changement : 6 à 8 ms) ; avec
  un seul décor résident (`venueCache=1`) : 92 à 183 ms. Textures 47, géométries 68, programmes 54 stables d’un
  aller-retour à l’autre (37 / 51 / 45 avec la salle seule).
- **Mémoire au long cours** (`qa:rc` J, 12 duels, Kaï dans la rue) : textures 47/47/47/47, géométries 68, tas 18 → 18,8 Mo.

**Cette décision n’introduit aucune règle métier nouvelle.**
