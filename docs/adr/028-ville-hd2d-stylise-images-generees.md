# ADR 028 — Direction artistique de la ville : HD-2D stylisé en images générées (diorama de plans peints, personnages en pixel art) ; la Grande Cour (M09)

Date : 2026-10-19
Statut : **APPROUVÉ par le responsable** (fiche d'arbitrages interactive du 2026-10-19,
<https://claude.ai/artifact/J34iVbgwRjWJVxQwdJQGL3>, onze entrées, choix entre 21:35 et 21:41 UTC) ; **code préalable à
la porte fait** (passe 55 : plans de décor et feuilles en pixel art, voir « Conséquences faites ») ; **essai technique
fait** (passe 56 : 2 images sur 30, direction validée par le responsable) ; **lot de production fait** (passe 57 :
diorama du Quai et feuille complète du joueur, 12 images sur 30, `approved: false`, voir « Porte du Quai : lot de
production ») ; retours du responsable (passe 59) puis **ses décisions appliquées** (passe 60 : cadrage élargi,
profondeur, feuille du joueur en 64 × 96 ; 16 images sur 30, voir « Profondeur, cadrage élargi et feuille du joueur en
64 × 96 ») ; approbation attendue. **Remplace l'ADR 026** comme direction artistique de la
ville ; **amende l'ADR 027** (D2, D3, D4, D10) et l'exception d'AGENTS (décors de la ville) ; s'inscrit dans l'ADR 024
(caméra de face ; la Grande Cour la règle plus haute, dans la plage décidée).

## Contexte

Le 2026-10-19, après la passe 52, le responsable a écrit : « oui bon les décors et personnages ne sont pas qualitatif je
ne valide pas la direction artistique. et j'aimerai vraiment qu'on s'oriente vers du Hd-2D stylized en générant les
images nécessaires et peaufinent le nécessaire avec aseprite. afin de d'obtenir le résultat de notre image référence
initiale. sinon j'ajoute aussi que j'aimerai une zone de la ville où on a un grand espace spacieux au centre comme une
grande cours qui se seraient un lieu de rassemblement. » (JOURNAL passe 53.)

À cette date, les trois îlots de la ville (le Quai, le Parvis, les Ruelles) sont construits par code dans la direction D
(ADR 026 : décor encré, couleurs des quatre familles) et les personnages de la ville sont dessinés par code, provisoires.
Le code préalable aux feuilles externes est prêt (passe 52, ADR 027 « Conséquences faites ») : manifeste vérifié,
approbation, préparation avant l'entrée, recoloration par tons clés. Les décisions nécessaires pour repartir ont été
réunies sur une fiche (passe 53) ; le responsable l'a remplie.

## Décision

1. **Référence (A1)** : la cible visuelle de la ville est **la référence initiale, le Quai la nuit vu de face**
   (`reference/generated/2026-10-19-quai-nuit-cameras/02.png`, première image générée pour la ville, 6 h 26) : pierre
   détaillée, grappes de lanternes, ville haute en arrière-plan, grain fin, petit duelliste à capuche, bannières des
   familles. Elle passe du statut « référence de travail » à **référence approuvée de la ville**.
2. **Style (A2)** : **HD-2D stylisé** : personnages et accessoires en **pixel art net**, finis dans Aseprite ; **décor
   peint au grain fin** comme la référence ; lumières des lanternes, profondeur de champ, halo, reflets et brume ajoutés
   par le moteur. Remplace la décision D2 de l'ADR 027 (« illustration encrée, pas de pixel art »).
3. **Transition (A3)** : décor et personnages par code **gardés en provisoire** et remplacés îlot par îlot ; la démo reste
   jouable ; le plan des îlots (collisions, zones, portes, PNJ) sert de base aux nouvelles images. Note du responsable :
   « je trouve que la direction D est plutôt bonne en soit. mais je sens que nous pouvons améliorer/optimiser davantage
   le rendu ».
4. **Règle des images (B1)** : l'exception d'AGENTS s'étend aux **décors des îlots de la ville** (plans peints,
   accessoires, textures), sous les mêmes garde-fous que les feuilles de personnages (manifeste d'empreintes, fiche de
   provenance, approbation du responsable avant l'entrée dans le jeu, contenu contrôlé, entrées limitées aux images du
   projet, licences notées, clé hors du build, coût annoncé, réversibilité). Le duel (lieux, cartes, interface), les
   polices et les sons restent en code.
5. **Montage du décor (B2)** : **diorama de plans peints** : pour chaque îlot, 5 ou 6 plans générés (ciel et ville haute,
   second rang, façades, rue, premier plan, eau), détourés et assemblés par scripts, posés en profondeur devant la caméra
   de face. Le moteur garde le sol où l'on marche, les lumières, les reflets, la profondeur de champ et la brume ;
   personnages et accessoires en sprites.
6. **Retouches (B3)** : **par scripts seulement** (Aseprite en mode batch, Lua, Node : détourage, mise à l'échelle,
   palette, alignement, assemblage, contrôles) ; **aucune retouche à la main** ; une image qui ne tient pas est
   **régénérée**, dans le budget. Remplace la décision D3 de l'ADR 027 (« une personne retouche si besoin »).
7. **Budget (B4)** : **30 images au plus** pour la première porte (essai technique 2, plans de l'îlot et leurs reprises
   ≈ 12, duelliste joueur ≈ 10, marge), annoncées à chaque génération ; remplace les 16 images de D10 ; le budget de la
   suite se décide sur le résultat.
8. **La Grande Cour, place (C1)** : un **nouvel îlot au cœur de la ville**, relié au Quai, au Parvis et aux Ruelles ; le
   lieu où l'on se retrouve et d'où partent les rues.
9. **La Grande Cour, usage (C2)** : une **place vivante** : monument ou fontaine des Quatre Voies au centre, foule de PNJ,
   étals, estrade de duels publics, tableau des annonces du Tournoi ; la guide et des défis de la ville s'y trouvent.
10. **La Grande Cour, cadrage (C3)** : îlot **profond** (≈ 32 × 18 m), **caméra de face plus haute** (15 à 20°, dans la
    plage de l'ADR 024, sans vue inclinée) qui **suit aussi le joueur en profondeur** ; bâtiments au fond et sur les
    côtés, arcade ou balustrade au premier plan.
11. **Ordre (C4)** : la **porte sur le Quai d'abord** (îlot de la référence : comparaison directe, chaîne complète
    éprouvée), puis la Grande Cour dans la direction validée, puis le Parvis et les Ruelles.

## Lecture de la note sur A3

La direction D n'est pas rejetée comme idée : c'est son rendu actuel qui ne suffit pas. La cible reste la référence
initiale (A1) en HD-2D stylisé (A2). Ce qui, de la direction D, est compatible avec cette référence (les couleurs des
quatre familles en accents, déjà sur les bannières de la référence ; les emblèmes du jeu à la place des enseignes du jeu
de cartes classique) est gardé ; le traitement « encré » du décor (contours, hachures, papier) n'est pas dans la cible.
**Question laissée au responsable**, tranchée sur la planche de la porte : la planche montrera côte à côte la référence,
le Quai actuel (direction D) et le Quai de la porte.

## Conséquences

- **ADR 026** : remplacé comme direction de la ville ; sa réalisation en code reste dans le jeu, provisoire, jusqu'à son
  remplacement îlot par îlot ; les validations des passes 47, 49 et 50 portent sur cette réalisation provisoire.
- **ADR 027** : D2 devient « pixel art » (A2) ; D3 « scripts seulement, reprise de génération » (B3) ; D4 « porte du
  Quai, décor et duelliste joueur » (C4) ; D10 « 30 images au plus » (B4). D7 (échelle 2, 192 × 320 par case) et D9
  (proportions) sont **à revoir pour le pixel art** : résolution logique et facteur d'agrandissement entier fixés par
  l'essai technique, sur capture. D1, D5, D6, D8, R1, R2 et tous les garde-fous sont inchangés et valent aussi pour les
  décors.
- **AGENTS** : exception étendue aux décors de la ville (section « Images de la ville : feuilles de personnages et
  décors ») ; cible de style de la ville = la référence A1 (section « Images générées ») ; retouches par scripts
  seulement. `demandes-images/README.md` : bible de style de la ville sur la référence A1.
- **Code à venir (non fait ici)** : plans de décor (manifeste des plans : fichier, empreinte, profondeur, position,
  échelle, provenance, statut ; chargement préparé derrière le fondu comme les feuilles de la passe 52) ; feuilles en
  pixel art (filtrage au plus proche, agrandissement entier : extension du contrat v2 ; la recoloration par tons clés y
  devient exacte, sans liseré de filtrage) ; îlot de la Grande Cour (plan pur, liaisons aux trois îlots, caméra qui suit
  en profondeur). Le jeu par défaut reste identique au pixel près ; sans image approuvée, la ville reste celle d'aujourd'hui.
- **Production** : essai technique (2 images, annoncées : fond transparent de gpt-image-2 ; cohérence d'un plan avec la
  référence et entre plans), puis plans du Quai, duelliste joueur en pixel art, assemblage par scripts, vérifications
  automatiques, planche *in situ* (référence | Quai actuel | Quai de la porte) soumise au responsable, approbation ;
  puis la Grande Cour.

## Conséquences faites (passe 55, 2026-10-19)

Code préalable à la porte V4, sans aucune image générée ni plan réel ; preuves faites avec nos propres images dessinées
par code (`tools/m09-decors-externes.mjs`, `tools/m09-feuilles-pixel.mjs` ; JOURNAL passe 55). Le jeu par défaut et la
ville sans manifeste sont identiques au pixel près au build de départ (`245a661`).

- **Plans de décor (B2), contrat v1** (`src/ville/decors.ts`) : manifeste `public/decors/manifest.json` (`{ "version": 1,
  "ilots": {} }`, copié dans `dist/decors/`). Par îlot : `plans` (1 à 8), chacun avec `file`, `sha256`, `size` (px),
  `at` (m ; plan de face : [x du milieu, y du bas, z] ; plan couché : [x, y, z du milieu]), `width` (m ; la hauteur suit
  le rapport de l'image), `orient` (`face` | `sol`), `order` (entier unique, d'arrière en avant, contrôlé contre la
  profondeur des plans de face ; départage les plans à même profondeur), `blend` (`decoupe` : bords détourés, écrit la
  profondeur, donc flou de profondeur juste et personnages devant ou derrière ; `fondu` : ciel, lueurs), `lit` (part de
  la lumière des lanternes du moteur ajoutée à la lumière peinte, défaut 0), `fog` (part de la brume du moteur, défaut 1),
  `source`, `fiche` (`art-src/decors/<id>/fiche.json`), `approved` ; `lumieres` (lumières du moteur posées sur les
  lanternes peintes : famille, ambre ou couleur linéaire, intensité, rayon, halo, scintillement ; 16 au plus) ; `sol`
  (défaut vrai : pavés mouillés, flaques et reflet plan du moteur sous le diorama). Budgets du contrat v1, à revoir après
  l'essai technique : PNG ≤ 8 Mo et ≤ 4096 px de côté, 8 plans, 32 Mo de fichiers et 160 Mo de mémoire GPU (mipmaps
  comprises) par îlot. Test Node `test/decorsManifeste.test.ts` (empreinte, dimensions, poids, fiche, îlot connu, aucune
  image hors manifeste, budgets), comme celui des feuilles.
- **Tout ou rien par îlot** : le diorama remplace le décor par code seulement si tous ses plans sont conformes (forme,
  ordre, empreinte, poids, dimensions) et admis (hors QA : tous approuvés) ; sinon l'îlot garde son décor par code, les
  raisons sont rapportées (`Town.decorReport().issues`), jamais de mélange des deux. Politique : celle des feuilles,
  `?qa=1&decors=code|approuvees` (`decorPolicy`).
- **Préparation** : manifeste et plans de l'îlot de départ lus et décodés avant la création de la ville
  (`preloadDecors` : le laboratoire l'attend avant `createTown`, la démo le lance dès son chargement) : décision
  immédiate, diorama construit directement ; plans décodés hors du fil principal (`createImageBitmap` prémultipliée,
  retournée, sans conversion de couleur), vérifiés, puis envoyés au GPU (`initTexture`) pendant le fondu de la démo
  (`Town.prepare`). Sans préparation, le décor par code est construit, l'image retenue (au plus 1,5 s) et le diorama
  substitué avant la première image ; prêt trop tard, l'îlot garde son décor par code pour la visite (`late`). Les plans
  de l'îlot quitté sont libérés (textures et images) ; un retour les prépare de nouveau.
- **Rendu du diorama** (`src/ville/diorama.ts`) : plans en panneaux prémultipliés triés d'arrière en avant, brume du
  moteur dans leur matière, lumière des lanternes ajoutée selon `lit`, lumières et halos du manifeste, ciel du moteur au
  fond ; la passe d'encre, à force nulle, ne fait que porter la profondeur au flou (ni contour ni papier) ; profondeur de
  champ, halo et reflet plan de l'îlot (`IlotDef.dof`, `reflets`) et plan pur (collisions, zones, portes, PNJ) inchangés.
  Exposition 1,05 (celle du rendu non encré) : une couleur peinte en demi-teinte sort à sa valeur (façade peinte
  100, 106, 130 rendue 107, 113, 140 avec les lanternes) ; réglage fin à faire sur l'essai technique.
- **Feuilles en pixel art (A2), contrat v3** (`spritesExternes.ts`) : le contrat v2 plus des entrées `pixel: true` qui
  déclarent leur grille d'art `cell` (16 × 24 à 96 × 160 px d'art par case), un agrandissement entier `scale` (1 à 8)
  et leur ancrage et leur figure en px d'art ; v1 et v2 toujours acceptés (un manifeste v2 refuse le pixel art).
  Nuanceur `SPRITE_FRAG`, variante `PIXEL` (programme à part : celui de l'atlas par code et des feuilles lisses est
  inchangé) : feuille gardée en octets sRGB, chaque pixel d'art lu au centre de son bloc, reconnu à l'octet près s'il est
  un ton clé et remplacé par la rampe du personnage, sinon converti en linéaire, puis mêlé à ses voisins par un pas net
  d'un pixel d'écran (« pixel épais » : aplats exacts, pas de scintillement à un agrandissement non entier) ; liserés de
  lumière d'un pixel d'art (C6 pour le pixel art). Le panneau suit la grille déclarée (`walkerPanel`).
- **Mesures** (Radeon 780M, 1920 × 1080, Chrome 155 sans fenêtre ; diorama de preuve de six plans, 48 Mo de mémoire
  GPU) : plan lu en 9 à 19 ms, décodé en 10 à 22 ms, envoyé au GPU en 1 à 10 ms ; première entrée sur le Quai
  (médianes de 5 rondes alternées) : 517 ms sans manifeste, 524 ms en `decors=code`, 243 ms en diorama (scène plus
  légère : 48 appels de dessin et 4,8 k triangles contre 137 et 101 k) ; passage au Parvis en diorama : plans prêts en
  16 ms, changement d'îlot 385 ms après le départ (fondu de 300 ms), 0 image en attente. Pixel art : feuille en tons
  clés recolorée identique au pixel près à la même feuille déjà peinte (joueur et docker, 1280 × 720 et 1920 × 1080),
  feuille ×1 et ×3 identiques (≤ 1/255 sur 6 pixels) ; le joueur est agrandi 2,39 fois à l'écran en 1920 × 1080 et
  1,59 fois en 1280 × 720 pour une figure de 74 px d'art (`walkerH` actuel) : le facteur entier visé (par exemple 3 et 2)
  se règle par la grille d'art et `walkerH` sur l'essai technique.
- **Non fait** : l'essai technique (2 images, à annoncer au responsable avant de générer), les plans réels du Quai et
  la feuille du duelliste joueur ; selon l'essai : exposition des plans peints, brume en nappes devant les plans,
  accessoires en sprites, recherche d'une clé dans `dist/` à la première image réelle ; la Grande Cour (V5).

## Essai technique (passe 56, 2026-10-19)

Feu vert du responsable, relayé par la session principale : « Lance l'essai technique de 2 images (porte du Quai,
ADR 028) […] annonce-moi les 2 images avant de générer ». Deux images annoncées avec leurs prompts complets, puis
générées par `tools/m09-generer-images.mjs` (gpt-image-2, `/v1/images/edits`, qualité `high`, la référence `02.png`
en image d'entrée), traitées par `tools/m09-essai-v4.mjs`, vérifiées en QA dans une copie temporaire du build
(`approved: false`) ; fiches `art-src/decors/quai-facades-essai/fiche.json` et `art-src/sprites/player-essai/fiche.json` ;
planche `screenshots/qa/m09/v4-essai/planche-essai-v4.png` ; JOURNAL passe 56. **Budget : 2 images sur 30.**

- **Fond transparent refusé** par l'API pour gpt-image-2 (« HTTP 400 Transparent background is not supported for this
  model », aucune image produite). Repli annoncé et retenu pour la production : **fond uni demandé dans le prompt**,
  magenta pour les décors, cyan pour les personnages (couleurs absentes du sujet), **détouré par script**. Plan : alpha
  tiré de l'écart au magenta, bords démêlés du fond, 21 % de pixels transparents, 980 pixels opaques encore teintés sur
  1,46 million. Feuille : alpha binaire après retrait du liseré teinté de cyan.
- **Plan de décor** (façades du centre du Quai : salle de jeu, maison étroite, le Fanal) : élévation de face respectée,
  cohérente avec la référence (pierre détaillée, colombages, grappes de lanternes, bannières des quatre familles avec
  leurs emblèmes, aucun texte) ; posé sur le plan pur (x de −10,6 à 11,2 m), 1 477 px pour 21,8 m, soit la densité de
  l'écran en 1920 × 1080 à cette profondeur (≈ 70 px/m) : net, sans agrandissement visible ; portes peintes à moins
  d'un mètre environ des portes du plan pur (estimé sur l'image) ; huit lanternes peintes repérées par script, une
  lumière du moteur posée sur chacune ; 55 Mo de mémoire GPU pour le diorama de l'essai (plan généré et plans de
  preuve). **Le plan généré fait 1 536 px de large : la rue entière (≈ 39 m) demande deux ou trois images par plan,
  assemblées par script.** La cohérence entre plans n'est pas éprouvée (un seul plan généré).
- **Feuille du duelliste joueur** : grille 5 × 3 respectée, même personnage dans les quinze cases, marche lisible ; le
  « pixel art » du modèle a une grille irrégulière (pas de 3,98 × 3,93 px, faible régularité) : les scripts reconstruisent
  la grille d'art (52 × 86 px d'art par case), alignent les pieds, réduisent la palette (32 couleurs naturelles et les
  tons clés, 40 couleurs) et ramènent exactement la tenue (magenta) et l'accent (vert) sur les tons clés ; contrat v3
  accepté sans refus, recoloration par famille vérifiée (Cendre, Voile). À l'écran, **×3,0 en 1920 × 1080** (figure de
  59 px d'art pour 177 px) avec la hauteur actuelle des personnages du Quai (`walkerH` 2,2 m), donc ≈ ×2 en
  1280 × 720 : la grille d'art de 52 × 86 et `walkerH` conviennent à un agrandissement entier.
- **Non tranché, pour le responsable** : la direction de ces deux images (planche : référence | Quai actuel | essai) ;
  le lancement de la production des plans du Quai (ciel et ville haute, second rang, façades en deux ou trois images,
  rue et accessoires, premier plan, eau) et de la feuille complète du joueur, dans les 28 images restantes.

## Porte du Quai : lot de production (passe 57, 2026-10-20)

**Décision du responsable (2026-10-20) : direction de l'essai validée, production lancée.** Ses mots, à la session V4 :
« Je valide la direction de l'essai. Prépare le lot suivant (plans du Quai et feuille complète du joueur) et annonce-moi
ses images et leurs prompts avant de générer. » ; et, relayés par la session principale : « La direction de l'essai me
convient : lance la production des plans du Quai et de la feuille complète du joueur dans la session V4, en m'annonçant
chaque génération avant de la lancer. » **Cette décision ne vaut pas approbation des images** : les 2 images de l'essai
et celles de la production restent en `approved: false` jusqu'à une décision explicite du responsable sur la planche
finale. Dix images annoncées avec leurs prompts
(`tools/m09-lot-quai.mjs`), générées (gpt-image-2, qualité `high`, fond uni détouré), la façade centrale de l'essai
reprise : **12 images sur 30** depuis le début de la porte. Traitement et assemblage par scripts
(`tools/m09-traitement-images.mjs`, `tools/m09-porte-quai.mjs`) ; **manifestes réels** `public/decors/manifest.json`
(le Quai, sept plans, 15 lumières) et `public/sprites/manifest.json` (contrat v3, feuille `player`), **`approved:
false`** : refusés par le jeu, montrés en QA (`?qa=1`) ; fiches `art-src/decors/quai-*/fiche.json`,
`art-src/sprites/player/fiche.json` ; planches `screenshots/qa/m09/v4-porte/` (cadrage actuel) et
`screenshots/qa/m09/v4-porte-large/` (cadrage élargi) ; JOURNAL passe 57.

- **Diorama du Quai** : ciel et ville haute (z −60), second rang (z −14), façades de la rue entière assemblées (ouest,
  centre de l'essai, est ; 3 263 × 993 px pour 48 m, 68 px/m), pied des façades (étal, caisses, tonneaux) et rue
  (lampadaires, bornes, filets) faits d'objets découpés et posés aux emplacements du plan pur, premier plan assemblé
  (mur du quai à fleur de rue, bateaux et mâts aux extrémités), eau couchée ; 18 Mo de fichiers, 66 Mo de mémoire GPU.
  Lumières du moteur posées par script sur les lanternes peintes repérées (lampadaires, étal, façades).
- **Coût** (rondes alternées, Quai décor par code de `245a661` contre diorama) : Radeon 780M ≈ 3,6–3,8 ms contre
  3,8–4,0 ms par image en 1280 × 720 et ≈ 5,6–5,8 ms contre 5,3–5,7 ms en 1920 × 1080 ; RTX 4060 ≈ 1,5 ms et 1,6 ms
  des deux côtés : coût égal ; 54 appels de dessin et 5 k triangles contre 145 et 101 k.
- **Feuille du joueur** : grille d'art 48 × 70, figure de 62 px d'art, 39 couleurs, tenue et accent en tons clés exacts ;
  à l'écran ≈ ×2,9 en 1920 × 1080 avec le cadrage actuel.
- **À trancher par le responsable** (planches) : (1) la direction de la porte, donc l'approbation des plans et de la
  feuille ; (2) le **cadrage** : les façades générées sont plus hautes, par rapport aux personnages, que celles du décor
  par code ; avec le cadrage actuel elles remplissent l'écran ; un cadrage élargi (`rig=6,25,42,4.8`) montre la rue
  entière, le second rang et la profondeur comme la référence, mais rend le joueur ≈ ×1,9 (non entier) ; (3) le sort de
  l'essai (`art-src/*-essai/`, gardé comme historique).

## Retours du responsable sur la planche de décision (passe 59, 2026-10-20)

Relayés par la session principale ; **rien n'est approuvé**. Ses mots : « presque bon mais les emblemes des familles ne
sont pas bons car ils derivent des emblemes de cartes deja integre qui etaient ceux de la dirrection B, cela marquera une
incoherence, sinon l'environnement integre tout en conservant la base sol code genere donne vraimemnt bien j'amerai
ajouter plus de profondeur aux quartierss de la ville meme si nous appliquons un diorama, la feuille du joueur en pixel
art est interessante mais je pense que nous devons optimiser le visage/tete qui manque encore des qualites, par ailleurs
j'aime bien le style de ppersonnage piixel art que propose le projet cite du tournoi local, on pourrait le reprendre en y
integrant notre logique visuel du projet pour rester coherent ».

- **Emblèmes** : les bannières générées portaient des emblèmes inventés par le modèle (flamme, croissant, arbre, étoile à
  huit branches), étrangers à ceux du jeu (`src/art/emblems.ts` : Cendre, losange à flamme évidée ; Voile, losanges
  imbriqués ; Ronce, fleur à cinq pétales ; Astre, étoile à quatre branches ; ceux des cartes, de l'interface et de
  l'arène). **Corrigé par script** (`fixBanners`, `tools/m09-traitement-images.mjs`) sur les bruts, avant le traitement :
  tissu de chaque bannière refait à partir du sien (couleur, plis, grain), emblème exact du jeu posé (mêmes tracés que
  `emblemSvg`, or, ombre portée) ; quatre bannières de la salle de jeu, quatre du second rang, celle du mât du premier
  plan ; la bannière posée sur le mur du quai, dont seul le bas se voit, rendue unie. Aucune image générée. Si le tissu
  refait ne convient pas : régénérer ces bannières sans motif (2 ou 3 images) et y poser les emblèmes de la même façon.
- **Gardé** : le diorama sur le sol du moteur (pavés, flaques, reflets) « donne vraiment bien ».
- **Profondeur des quartiers**, à choisir avant de produire, pour le Quai et les îlots à venir : (a) brume entre les plans
  (nappes du moteur, comme le décor par code ; 0 image, champ `brumes` du diorama à ajouter) ; (b) plans plus espacés en z,
  parallaxe plus marquée quand la caméra suit (0 image) ; (c) troisième rang de toits et ville haute étagée sur sa
  colline (1 ou 2 images) ; (d) ruelles et passages qui s'enfoncent derrière des trouées des façades, avec leur lumière
  (2 images) ; (e) la Grande Cour : marche et caméra en profondeur (ADR 028, C3). Recommandation : (a) et (b) d'abord
  (sans image), puis (c) et (d) sur le Quai, le cadrage élargi les montrant mieux.
- **Feuille du joueur** : gardée dans l'esprit ; tête et visage à améliorer.
- **Référence de style, Cité du Tournoi** (`C:\Users\miche\Documents\Projects\HD-2D`, dépôt RPG-ArtByCode) : le
  responsable autorise à prendre le **pixel art de ses personnages comme référence de style** (par exemple
  `art-lab/characters/exports/hero-x2-v3.png`, `src/characters/PixelPainter.ts`), adapté à la logique visuelle du jeu
  (identités V2, familles, tons clés recolorables, contrat v3). Le projet est lu en lecture seule ; ni ses images ni son
  code ne sont copiés dans ce dépôt (AGENTS). Constat de lecture : cases de 64 × 96 px d'art, tête lisible (yeux, mèches),
  rampes de couleur à cinq tons (ombres froides et saturées, lumières chaudes). Proposition : feuille du joueur refaite
  sur une grille d'art de 64 × 96 (au lieu de 48 × 70), tête et visage plus détaillés, rampes à la manière de
  `PixelPainter.ramp` pour la recoloration (code du jeu, réécrit) ; **donner `hero-x2-v3.png` en image d'entrée à
  gpt-image-2 demande l'autorisation explicite du responsable** (AGENTS limite les entrées aux images du projet).
- **Toujours ouverts** : cadrage (actuel ou élargi) ; lumières aux couleurs des familles (note A3). Planche
  `screenshots/qa/m09/v4-decision-2/planche-decision-quai.png`. Budget : 12 images sur 30, 18 restantes.

## Profondeur, cadrage élargi et feuille du joueur en 64 × 96 (passe 60, 2026-10-20)

Décision du responsable, dans la session de la porte : « Je retiens tes recommandations : emblèmes posés par script,
cadrage élargi, profondeur (brume entre les plans et plans espacés d'abord, puis troisième rang et ruelles), feuille du
joueur refaite en 64 × 96 sans image d'entrée de Cité du Tournoi ; annonce les images avant de générer. » **Rien n'est
approuvé** : `approved: false` sur tous les plans et sur la feuille.

- **Images** : 4, annoncées avec leurs prompts avant la génération (`tools/m09-lot-quai-2.mjs` ; bruts dans
  `art-gen/2026-10-20-v4-quai-2/` du dossier principal) : troisième rang de toits et ville haute ; ruelle qui s'enfonce ;
  escalier vers l'arène (passage du Parvis) ; feuille du joueur en 64 × 96 (entrée : notre feuille du lot 1, aucune
  image de Cité du Tournoi). **16 images sur 30, 14 restantes.**
- **Emblèmes** : le modèle en a de nouveau inventé (cinq bannières du troisième rang, deux de la ruelle) ; ceux du jeu y
  sont posés par script (`fixBanners`, boîtes mesurées sur les bruts).
- **Cadrage élargi** (`6,25,42,4.8`) porté dans le diorama : champ `camera` du manifeste, point visé borné à ±5 m pour
  que la vue ne dépasse pas les façades ; le décor par code garde son cadrage. Joueur ≈ 120 px de haut en 1920 × 1080
  (figure de 86 px d'art : ×1,40, non entier, net grâce au contrat v3) et ≈ 80 px en 1280 × 720 (×0,93 : légèrement
  réduit).
- **Profondeur** :
  - plans espacés : ciel à −90 m, troisième rang à −40 m, second rang à −18 m, façades à −3 m ;
  - **rangs du fond à leur échelle réelle**. Un premier essai élargissait chaque plan à proportion de son recul ; les
    rangs gardaient ainsi leur taille à l'écran et se lisaient comme un seul mur de maisons, sans profondeur. Essai
    abandonné. Désormais, les fenêtres du fond ont la taille de celles des façades, donc paraissent plus petites au loin.
    Pour couvrir la largeur vue, chaque rang est posé en deux copies côte à côte, la seconde en miroir : second rang
    2 × 31 m, troisième rang 2 × 44 m relevé de 4 m ;
  - **voile atmosphérique** : nouveau champ `voile` des plans (0 à 1), qui tire la couleur vers le bleu de nuit clair de
    l'air ; ciel 0,12, second rang 0,28, troisième rang 0,5 ;
  - **brume entre les plans** : champ `brumes` du manifeste, nappes du moteur, d'un ton plus clair que celles du décor
    par code (9e valeur facultative, `ton` 2,2). Trois nappes : entre les façades et le second rang, entre le second et
    le troisième rang, devant le ciel ; plus celle de l'eau ;
  - **ruelle et escalier vus par des ouvertures** : l'arche ouest et le portail de l'entrepôt (est) sont découpés dans
    les bruts (rectangle et arc mesurés, peints en magenta puis détourés). Derrière, la ruelle (recadrée sur son
    centre) et l'escalier de l'arène sont centrés sur la ligne de vue de la caméra arrêtée à sa borne (parallaxe), le
    bas sous le sol. L'arche ouest reste en partie cachée par la bannière du mât du premier plan.
- **Contrat des plans** :
  - 12 plans au plus par îlot, au lieu de 8 (dix plans au Quai) ;
  - champs `voile`, `camera` et `brumes` contrôlés (6 nappes au plus, ton facultatif) ;
  - le diorama dessine les nappes du moteur et applique son cadrage ;
  - le décor par code est inchangé ;
  - budget du Quai : 26,7 Mo de fichiers (32 au plus), 93,8 Mo de mémoire GPU (160 au plus).
- **Feuille du joueur** : 64 × 96 px d'art par case, grille imposée au traitement. Tête plus grande, mèches et yeux
  lisibles. **Défaut** : l'écharpe (ton clé vert) remonte sur le bas du visage et couvre la bouche, comme un masque.
  Proposition : 1 image ciblée, annoncée avant la génération (la feuille redessinée à partir de celle-ci, écharpe nouée
  sous le menton, bouche visible).
- **Ouverts** :
  - lecture de la profondeur et force du voile ;
  - ouvertures ;
  - écharpe du joueur ;
  - note A3 ;
  - approbation.

  Planche : `screenshots/qa/m09/v4-decision-3/planche-decision-quai.png`.
