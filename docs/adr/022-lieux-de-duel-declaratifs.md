# ADR 022 — Lieux de duel déclaratifs (M08, lot C2)

Date : 2026-10-18
Statut : **cadrage APPROUVÉ par le responsable** (« Cadrage C2 validé tel quel : salle actuelle = salle de jeu de cartes,
porte = la rue (le Quai, la nuit), même table partout pour la porte, Duel libre — Kaï dans la rue. Lance la porte. »,
séance du 2026-10-18). **Porte de validation livrée** (système de lieux, salle migrée, rue) et **rue validée par le
responsable** (« Je valide la rue (le Quai, la nuit) : lance le bar et l'arène sur le même système de lieux. »,
2026-10-18) ; **bar et arène validés par le responsable** (« Je valide le bar et l'arène tels que sur la planche des quatre lieux. », 2026-10-19) : amendement en fin de document. Complète l’ADR 019 (mise en scène HD-2D) et l’ADR 020
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

- `src/presentation/venues.ts` (pur) : identifiants des lieux construits (`salle`, `rue` ; `bar`, `arene` depuis l’amendement), lieu par défaut (`salle`),
  nom et intention. Le produit le lit comme `personalities.ts`.
- `src/scene/venues/` : `types.ts` (contrat), `common.ts` (peinture, flammes et halos en points animés, libération),
  `salle.ts`, `rue.ts` (`bar.ts`, `arene.ts` depuis l’amendement), `index.ts` (registre). Un `VenueDef` déclare la couleur de fond, la brume (toujours linéaire),
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
  résident pour la mesure. **Amendé** à quatre lieux : tous les décors gardés montés (voir l’amendement « bar et arène »).

## Conséquences

### Mesures de la porte (journal, passe 31 ; `artifacts/qa/m08/`)

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

## Amendement « bar et arène » (2026-10-18/19, passe 33)

Statut : rue **validée** par le responsable (« Je valide la rue (le Quai, la nuit) : lance le bar et l'arène sur le même
système de lieux. ») ; **bar et arène livrés** sur le même système, présentés au responsable sur la planche des quatre
lieux (`screenshots/qa/m08/c2/planche-c2-quatre-lieux.png`, build fusionné avec les cadres de cartes de la passe 32), et
**validés** : « Je valide le bar et l'arène tels que sur la planche des quatre lieux. » (2026-10-19).
Aucun changement du contrat du duel : gréement fixe, projecteurs à ±15 % de la salle, caméra, table, rival, HUD et
plateau DOM communs aux quatre lieux.

### Le bar — le Fanal, taverne du port (`venues/bar.ts`)

Même grammaire de théâtre que la rue. Toile de fond : le mur de la taverne, boiseries sombres, trois étagères de
bouteilles rétroéclairées derrière le comptoir (tenues sourdes : le fond reste sombre derrière la tête), barre de navire,
tableau de bateau, ardoise, filet et flotteurs, ombre haute. Décor : long comptoir à rampe de laiton derrière le rival,
tabourets, trois habitués en silhouettes de dos, poteaux et poutres en coulisses, tonneaux ; deux lampes suspendues de
part et d’autre de la tête du rival ; deux photophores de verre rouge aux coins lointains de la table ; plancher, nappes
de fumée sous les lampes. Plan de feux : salle basse et chaude (ambiance 0,48 contre 0,62), ombres brun-rouge, brume
brune.

### L’Arène — le grand duel en public (`venues/arene.ts`)

Le lieu-spectacle. Toile de fond : nuit bleu-violet, gradins pleins d’une foule en silhouettes et de torches, porte
d’honneur dans l’ombre derrière le rival, bannières des quatre familles au sommet. Décor : parapet de pierre en arc
derrière le rival (cylindres ouverts, sans faces de section) et tentures des quatre familles, deux braseros aux flammes
hautes et aux étincelles qui montent, coupes de feu aux coins lointains de la table, faisceaux de lumière blanche dans la
poussière, petites lumières qui scintillent dans les gradins, sable. Plan de feux : lumière blanche venue d’en haut sur
le visage et la table (projecteurs +6 % et +7 %), feu orange des braseros, ambiance froide : la plus forte opposition
chaud / froid des quatre lieux. La bannière peinte de la salle est partagée (`bannerTexture`, `common.ts`).

### Rencontres

« Duel libre — Maëlle » se joue au bar (le Fanal, la taverne du port) et « Duel libre — Orin » à l’arène (le défi
final, 110 points de vie, ouvert après le Tournoi du Quai : la grande scène) ; Kaï reste dans la rue, Sélène et le
Tournoi du Quai dans la salle (placement proposé, modifiable dans `FREE_VENUE`, `product/encounters.ts`). Les « Duels
de la ville » (C3) restent à la session des personnages (sa carte les place dans la rue). Test : chaque lieu construit
est joué par au moins une rencontre.

### Cache des décors : tous les lieux gardés montés (amende « Changement de lieu »)

Avec quatre lieux, deux décors montés ne suffisent plus : un lieu quitté depuis deux changements est repeint et ses
programmes recompilés. Mesuré (`c2-lieux.mjs cycle`, quatre tours des quatre lieux appelés directement, préparation des
personnages coupée, Radeon 780M ; `c2-cycle-4lieux-*.json`) :

| Décors montés | Première image d’un changement (médiane / max) | Textures des décors |
|---|---|---|
| 4, préparés aux temps morts (défaut) | **3,2 / 5,1 ms** (RTX 4060 : 1,9 / 3,0 ms) | 65,8 Mo |
| 2 (porte) | 92 / 123 ms | 32,2 Mo |
| 1 (`venueCache=1`) | 108 / 146 ms | 15,9 Mo |

Décision : **tous les lieux gardés montés** (`VENUE_CACHE = VENUE_IDS.length`), les décors des rencontres ouvertes
préparés aux temps morts, jamais pendant un duel (peinture, envoi des textures, programmes compilés pour la cible HDR
et l’écran ; 330 à 380 ms par lieu sur la 780M, 205 à 265 ms sur la RTX 4060) ; l’arène ne l’est qu’une fois Orin
débloqué. Coût : ≈ 66 Mo de textures de décor au GPU (mipmaps comprises) et 68 textures, 108 géométries, 74 programmes
stables d’un tour à l’autre (38 / 54 / 52 avec un seul décor) ; un montage coûte 16 à 32 ms quand il n’est pas préparé.
`?qa=1&venueCache=n` borne le cache pour la mesure. Un cinquième lieu demandera de remesurer ce choix (éviction du lieu
le plus ancien, déjà en place). Les géométries du décor préparé sont envoyées au GPU par un dessin hors écran (voir les
mesures, correctif `1aa9872`).

### Mesures (journal, passe 33 ; builds gelés `21a53a2` puis `1aa9872` après fusion ; `artifacts/qa/m08/`)

- **Salle et rue identiques au pixel près** au build `d018915` (28 cas, 0 pixel ; témoin 921 011 et 2 072 134 pixels) :
  ajouter le bar et l’arène ne change rien aux deux lieux déjà livrés.
- **Invariance des quatre lieux** (salle contre chacun des trois autres) : calques DOM 0 pixel en vues A et B à 1280 et
  1920, écran Préparation 0 pixel ; projection, vue de la caméra, transformation du rival et ancres `.205 / .455`
  identiques.
- **Contraste** : par lieu, 56 captures et 4 056 textes, 0 sous 4,5:1 ; minimum identique à la salle (5,1:1 vue A,
  4,8:1 vue B et contre Kaï, 5,1:1 au niveau « direct »).
- **Lumière** (scène seule, début de tour, 1280) : visage 0,311 (bar) et 0,350 (arène) contre 0,331 (salle) ; rapport
  visage / fond **10,0** et **35** (≥ 6 au cadrage ; salle 13,2, rue 14,6).
- **GPU par image** (`perf-compare`, temps GPU médian, rondes entrelacées salle / lieu sur le même build, vue A ;
  `perf-compare-c2-salle-{bar,arene}-*.json`) : bar — Radeon 780M 2,27 → 2,23 ms (1280×720) et 2,77 → **3,08 ms**
  (1920×1080, p95 4,12 → 4,48) ; RTX 4060 1,18 → 1,18 ms (1920), 0,6 à 1,0 ms à 1280 selon l’état d’horloge. Arène —
  780M 2,23 → 2,09 ms (1280) et 3,40 → 3,45 ms (1920, poste ralenti des deux côtés : 140 et 154 FPS) ; RTX 4060
  1,19 → 1,21 ms (1920 ; images à 125–155 FPS dans les rondes de l’arène, alors au même temps GPU : remesuré en cinq
  rondes, 1,11 → 1,09 ms et 165 FPS partout, `…-rtx4060-1920-bis.json`). Budget du cadrage (salle + 0,3 ms à 1280,
  + 0,4 ms à 1920) tenu partout. Appels de dessin (vue A) : salle 96, bar 90, arène 83.
- **Parties complètes** (`perf-play`, 780M, 1920×1080, en alternance arène, salle, bar, salle, arène, bar ;
  `perf-play-c2-alt-*.json`) : images au-delà de 16,7 ms sur ≈ 16 600 : salle 111 et 164, bar 165 et 167, arène 177
  et 179 ; processeur par image identique (2,1 à 2,4 ms) ; 165 Hz en médiane, aucun cran du repli, 0 fuite. Jouées
  l’une après l’autre, elles semblaient bien plus coûteuses (93, 239 et 315 images, un cran dans l’arène) : le poste
  dérivait pendant la série.
- **Repli du post-traitement** (`qa-fallback`, lieu imposé, charge GPU injectée) : **10/10** au bar et à l’arène sur la
  780M, à l’arène sur la RTX 4060 ; halo coupé puis rendu direct, aucun programme compilé par les changements de niveau.
- **Préparation des géométries** (correctif `1aa9872`) : le premier `qa:rc` de ce lot échouait sur le contrôle J
  (géométries 71 → 94 → 108 au premier tour, à la première visite du bar puis de l’arène, puis stables) : three.js ne
  crée les tampons de géométrie qu’au premier dessin, que `prepareVenue` ne faisait pas. Un dessin du décor préparé dans
  une cible de 1 × 1 pixel (élagage par le champ coupé, programmes déjà compilés pour une cible) les envoie aux temps
  morts : première visite de la rue, du bar et de l’arène **3,0 à 4,7 ms** au lieu de 10,3 à 12,7 (780M), géométries
  108 dès le premier duel, programmes 74 inchangés (une texture de plus : la cible).
- **Après fusion des cadres de cartes** (passe 32, `be9ca98`, table commune) et du correctif (build `1aa9872`) : salle et
  rue identiques au pixel près au build `be9ca98` (28 cas, 0 pixel) ; invariance des quatre lieux ; contraste
  **72 captures, 5 246 textes, 0 sous 4,5:1** (état « plein » compris) ; `qa:rc` **9/9, 47/47** par défaut, bar imposé et
  arène imposée (J : géométries et textures stables, tas ≈ 21 → 22 Mo sur 12 duels) ; `qa:browser` **5/5** ;
  `qa:product` **9/9, 71/71** ; `npm test` 213/213.

**Cet amendement n’introduit aucune règle métier nouvelle.**
