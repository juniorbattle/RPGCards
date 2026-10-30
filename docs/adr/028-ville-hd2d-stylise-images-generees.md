# ADR 028 — Direction artistique de la ville : HD-2D stylisé en images générées (diorama de plans peints, personnages en pixel art) ; la Grande Cour (M09)

Date : 2026-10-19
Statut : **APPROUVÉ par le responsable** (fiche d'arbitrages interactive du 2026-10-19,
<https://claude.ai/artifact/J34iVbgwRjWJVxQwdJQGL3>, onze entrées, choix entre 21:35 et 21:41 UTC) ; **code préalable à
la porte fait** (passe 55 : plans de décor et feuilles en pixel art, voir « Conséquences faites ») ; **essai technique
fait** (passe 56 : 2 images sur 30, direction validée par le responsable) ; **lot de production fait** (passe 57 :
diorama du Quai et feuille complète du joueur, 12 images sur 30, `approved: false`, voir « Porte du Quai : lot de
production ») ; retours du responsable (passe 59) puis **ses décisions appliquées** (passe 60 : cadrage élargi,
profondeur, feuille du joueur en 64 × 96 ; 16 images sur 30, voir « Profondeur, cadrage élargi et feuille du joueur en
64 × 96 ») ; **fiche d'arbitrages de la porte remplie** (passe 61 : emblèmes brodés, cadrage élargi, lumières
ambrées, sans ruelles peintes ; **profondeur praticable demandée**, voir « Fiche d'arbitrages de la porte ») ;
**conception de la profondeur praticable proposée** (passe 62, preuve jouable au laboratoire, voir « Profondeur
praticable : conception proposée ») et **retenue par le responsable** (passe 63 : décor des zones arrière à
améliorer, principe à porter dans divers quartiers) ; approbation en bloc sur la
prochaine planche. **Remplace l'ADR 026** comme direction artistique de la
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

## Fiche d'arbitrages de la porte (passe 61, 2026-10-20)

Le responsable a rempli la fiche <https://claude.ai/artifact/5n2Qgx6ahcxsRwhxz7aaMQ> (planche 2 ; choix entre 02:50 et
02:56 UTC), relayée par la session principale. Ses choix, et ses notes mot pour mot :

- **E1, emblèmes** : « Relief brodé par script (0 image) ».
- **E2, cadrage** : « Élargi ». Note : « il y a pas vraiment la profondeur voulu de la scene on doit pouvoir s'enfoncer
  au loin dans la scene actuellement on a plus tendance d'etre sur un semi-platformer premier prend ».
- **E3, lumières** : « Lumières ambrées ». La note A3 est close : les couleurs des familles restent sur les bannières ;
  contours à l'encre, hachures et papier ne sont pas repris.
- **E4, profondeur** : « Moteur, troisième rang et ville haute (1 ou 2 images) ». Note : « On doit pouvoir se deplacer en
  profondeur de la ville et non avoir l'impression que seul le premier plan est pratiquable ».
- **J1, feuille du joueur** : « Refaire, cases plus grandes (≈ 2 images) ».
- **J2, image d'entrée** : « Ne pas autoriser : style décrit dans le prompt ». Note : « donner plutot les prompt, feuille
  des pnjs du district merchant du projet Cite du tournoi ».
- **A1, approbation** : « En bloc sur la prochaine planche ».
- **A2, conditions d'OpenAI** : « Je les vérifie avant l'approbation » (bloque l'entrée en jeu, pas la production).

**Chronologie et écarts.** La fiche a été remplie pendant la génération du lot de la passe 60 (02:48 à 02:54 UTC), lancé
sur la décision précédente du responsable dans la session de la porte. Les choix de la fiche sont les plus récents : ils
priment. Trois écarts en découlent :

- la ruelle et l'escalier de l'arène (2 images de la passe 60) sont hors du choix E4 : retirés du diorama ;
- la feuille du joueur en 64 × 96 compte comme la première des ≈ 2 images de J1 ;
- budget : 16 images sur 30 (la fiche, écrite avant la passe 60, en comptait 12).

Les bruts restent dans `art-gen/` du dossier principal, et l'historique git garde les plans retirés (`58bf16b`).

**Appliqué (passe 61)** :

- **E1** : `fixBanners` brode les emblèmes par script (option `brode`). Fil d'or en points lancés obliques, bourrelet
  sombre autour, modelé éclairé du haut à gauche (gradient du masque adouci), reflet sur les crêtes, emblème 12 % plus
  grand. Les formes restent les tracés de `src/art/emblems.ts`. Bannières concernées : salle de jeu, second rang, mât du
  premier plan, troisième rang.
- **E2** : déjà porté dans le diorama (passe 60).
- **E3** : lumières ambrées, celles du diorama par défaut ; variante A3 retirée de l'outil de planche.
- **E4** : le moteur (brume, échelle réelle, voile) et le troisième rang sont gardés. La ruelle et le passage sont
  retirés, l'arche ouest et le portail est refermés (tels que peints). Le diorama du Quai compte huit plans.

**Le point majeur : la profondeur praticable** (notes E2 et E4). Le responsable veut marcher en profondeur dans le
quartier, s'enfoncer au loin, et ne plus avoir l'impression d'un jeu de plateforme dont seul le premier plan est
praticable. Cela vaut pour le Quai et les autres quartiers, pas seulement pour la Grande Cour. C'est un changement de
conception :

- sol praticable profond ;
- caméra qui suit en profondeur ;
- plans du diorama posés entre des zones où l'on marche ;
- personnages à l'échelle de leur distance.

Prochaine étape, **avant toute image** : proposer une conception (plan de l'îlot, caméra, place des plans) avec une
preuve par code, la consigner ici ou dans l'ADR 024, et attendre la réponse du responsable.

**J2, lecture à faire confirmer** : la référence de style serait les PNJ du Merchant District de Cité du Tournoi et leurs
prompts (`art-lab/characters/briefs/`, manifestes et provenance des PNJ), lus en lecture seule, rien de copié dans ce
dépôt. Aucune de leurs feuilles ne sera donnée en image d'entrée sans un accord explicite demandé dans l'annonce.

**Suite** : après l'accord sur la conception, les images seront annoncées : troisième rang et ville haute (1 ou 2, si la
conception les change) et feuille du joueur refaite (le reste de J1). Puis viendra la planche d'approbation en bloc (A1),
après la vérification des conditions d'OpenAI par le responsable (A2). Rien n'est approuvé.

## Profondeur praticable : conception proposée (passe 62, 2026-10-20) — à décider par le responsable

Demande : notes E2 et E4 de la fiche (citées plus haut), « on doit pouvoir s'enfoncer au loin dans la scene » et
« se deplacer en profondeur de la ville et non avoir l'impression que seul le premier plan est pratiquable ». La
conception ci-dessous est prouvée dans le laboratoire (`?ville=1&qa=1&profondeur=1`). Le jeu et la démo gardent le
Quai en bande.

- **Plan de l'îlot (le Quai)** :
  - le quai reste la rue du premier plan (z de −3 à 3,4 m) ;
  - les façades deviennent trois blocs de 8 m de profondeur (z de −11 à −3 m) ;
  - deux passages de 3 m les séparent, aux raccords des trois images de façades (x de −13,6 à −10,6 m et de 11,2 à
    14,2 m) ;
  - ils mènent à la **rue haute** (z de −17 à −11 m, x de −15 à 15 m), bordée au fond par le second rang, devenu une
    façade où l'on marche ;
  - la ville haute et le ciel restent au loin.

  Plan pur : `src/ville/quaiProfond.ts` (collisions, zones, points d'apparition).
- **Caméra** : frontale (ADR 024), cadrage élargi. Elle suit 60 % de la profondeur (`followZ`) et s'incline de 6° au
  quai à 16° dans la rue haute (`pitchFond`, `zFond`). Le personnage rapetisse en s'éloignant ; en 1920 × 1080 :
  120 px sur le quai, 113 à l'entrée du passage, 104 dans le passage, 93 dans la rue haute.
- **Place des plans** :
  - chaque bloc garde sa façade peinte : les morceaux de l'image actuelle, découpés par `uv` ;
  - les passages ont leurs murs (`orient: 'cote'`, côté peint `vers` l'intérieur du passage), ici dessinés par code
    pour la preuve ;
  - le bloc derrière lequel passe le personnage s'efface à 12 % (`coupe`, vue en coupe) ;
  - la brume et le voile de l'air restent entre les rangs.
- **Contrat des plans** (champs facultatifs ; le Quai actuel ne les emploie pas, et son rendu est inchangé au pixel
  près) : `uv`, `orient: 'cote'` et `vers`, `coupe`, caméra `followZ`, `aimZ`, `pitchFond`, `zFond`, manifeste
  nommé du même dossier, 16 plans au plus (les morceaux d'une image partagent sa texture, comptée une fois).
- **Preuve** :
  - outil `tools/m09-profondeur-preuve.mjs` : le manifeste `public/decors/manifest-profondeur.json` est tiré des plans
    actuels du Quai ; les murs `preuve-joue.png` sont dessinés par code ; **aucune image générée** ;
  - planche : `screenshots/qa/m09/v4-profondeur/planche-profondeur.png` (plan vu de dessus, cinq vues de plus en plus
    profondes, référence) ;
  - tests : `test/profondeur.test.ts`.
- **Limites vues sur la preuve** :
  - les blocs n'ont pas de toit : vu en coupe, leur emprise se lit comme du sol ;
  - la rue haute est peinte pour être vue de loin (pied sombre) ;
  - les murs des passages sont des plans de preuve ;
  - la marchande est écartée de l'entrée du passage ouest ;
  - le décor par code ne suit pas ce plan.
- **Si la conception est retenue**, dans l'ordre :
  1. images annoncées : murs de passage et rue haute peints à l'échelle des personnages, troisième rang et ville haute
     (E4), puis feuille du joueur (J1) ;
  2. le même principe pour le Parvis, les Ruelles et la Grande Cour ;
  3. le plan profond dans la démo et le jeu, après l'approbation.
- **À décider** :
  - la conception elle-même (blocs, passages, rue haute) ;
  - la caméra (part du suivi, élévation au fond) ;
  - la vue en coupe : bloc effacé, ou trouée ronde autour du personnage ;
  - ou une autre forme : terrasses étagées, passages plus larges, caméra plus haute.

### Décision du responsable (passe 63, 2026-10-20)

Dans la session de la porte : « j'aime beaucoup ton idee de la profondeur praticable mais il faut optimiser et ameliorer
le decors dde zone arriere car elle sont encore trop approximatif selon tes images reviews mais l'idee est excellente
surtout avec notre vue frontale cela donne de la complexite a nos quartiers de ville et on pourrait l;integrer a divers
quartiers ».

- **Retenu** : la profondeur praticable (blocs, passages, rue haute, caméra qui suit et s'élève, vue en coupe), avec la
  vue frontale ; le principe sera porté dans divers quartiers.
- **À améliorer** : le décor des zones arrière (rue haute, passages, emprise des blocs), encore approximatif ; d'abord
  par script, puis par des images peintes à l'échelle des personnages, annoncées avant la génération.
- **Fait par script (passe 63)** : emprise sombre des blocs, murs aux bouts de la rue haute, pied de sa façade recadré et
  éclairé, lanternes au milieu des passages, bloc effacé à 8 % ; 24 plans au plus par îlot (19 au Quai profond).
- **Annoncé, à générer après accord** (`tools/m09-lot-quai-3.mjs`, 2 images, 18 sur 30 après le lot) : la façade de la
  rue haute peinte à l'échelle des personnages (elle est aujourd'hui le second rang, peint pour être vu de loin) ; les
  murs des passages, deux variantes dans une image (aujourd'hui dessinés par code).
- Rien n'est approuvé (`approved: false`) ; approbation en bloc sur la prochaine planche (A1).

### Quartier continu (passe 64, 2026-10-20)

Retour du responsable sur la rue haute : « je veux que tu ameliores le decor caar cela ressemble a un decor isole ». Fait par script : façade de la rue haute sur toute la largeur vue,
bouts de la rue perdus dans la brume (au lieu de murs nus), rue meublée (caisses, tonneaux, lampadaires allumés) et
habitée (un passant), murs des passages redessinés (toit, colombages, fenêtres, gouttière, lanterne). Une vue en section
(étages du bloc effacés, rez-de-chaussée gardé, champ `coupeY`) a été essayée ; le responsable l'a écartée : « non conserve le cote transparent du batiment de premier dont nous allons derriere ».
Puis, sur la capture de la passe 63 qu'il a jointe : « non je veux que le batiment en premier plan soient transparent comme l'image joint ». Le bloc du premier rang est donc transparent à 12 % quand
on passe derrière, façade entière (étages et rez-de-chaussée), et l'emprise sombre de la passe 63 est retirée (les pavés
se voient sous le fantôme) ; `coupeY` reste au contrat, inutilisé.
Les 2 images annoncées en passe 63 restent à décider.

### Quartiers en rangs (passe 65, 2026-10-20) — conception proposée

Demande du responsable : « Okay dans ce cas je veux que les quartiers soient composés de plusieurs ruelles superposées qui débordent vers des places marchables, donc plus on s'enfonce dans les ruelles plus on découvre de nouveaux spots. Donc on aura 1er rang, 2e rang, 3e rang, voire un 4e rang ; design-moi de manière cohérente et structurée tout en gardant un décor autour (sur les côtés correct) ; avec les images générées cela devrait être pas trop compliqué ni coûteux ». Conception détaillée : `docs/M09_QUARTIERS_EN_RANGS.md` ; grammaire pure commune à tous
les quartiers : `src/ville/rangs.ts`.

- **Grammaire** : rang 1 = la rue du premier plan ; entre deux rangs, une bande bâtie percée de passages **jamais alignés**
  d'une bande à l'autre (on longe chaque ruelle pour trouver le suivant) ; rangs 2 à 4 = des ruelles de plus en plus
  courtes, fermées par un mur à leurs bouts, qui **débordent chacune sur une place** (le recul de la bande suivante : le
  spot du rang) ; le dernier rang est le cœur du quartier ; **côtés** : façades plus larges que la vue, flancs (les
  maisons des côtés de chaque ruelle), murs et brume aux bouts ; au plus 4 rangs, sol plat.
- **Lisibilité** : caméra frontale qui suit 90 % de la profondeur (6° au quai, 16° dès le rang 2 ; 120 px au quai, 98 px
  au quatrième rang) ; fantôme à 12 % (décision de la passe 64) du bloc devant le personnage, puis de **tout le rang de
  devant** dès qu'il a dépassé sa bande (`coupeZ`, halos compris) ; fondu lointain des rangs dépassés de deux.
- **Preuve** : le Quai en quatre rangs au laboratoire (rue Haute et place de la Halle, ruelle des Lanternes et placette
  du Puits, cour de la Chapelle), avec les plans actuels découpés par script (56 plans, 10 images, 87,4 Mo) ; Quai actuel,
  jeu et démo inchangés.
- **Images : un kit, non des décors** : 5 images annoncées (`tools/m09-lot-quai-3.mjs`, remplace les 2 de la passe 63) :
  deux rangées de maisons de ruelle, trois murs de côté, trois monuments de places, six objets ; chacune découpée et
  reposée à plusieurs rangs et dans plusieurs quartiers ; 21 images sur 30 après le lot ; **générées après accord**.
- **Proposé** : la même grammaire pour le Parvis et les Ruelles ; le cœur de chaque quartier s'ouvre sur la Grande Cour
  (C1). Rien n'est approuvé (`approved: false`).

### Kit des quartiers en rangs généré et posé (passe 66, 2026-10-20)

Accord du responsable : « Oui, génère les 5 images du kit des rangs (tools/m09-lot-quai-3.mjs), traite-les par script et pose-les dans le Quai en quatre rangs. ». Les 5 images ont été annoncées avec leurs prompts complets avant le lancement, et
générées : 21 images sur 30. Le traitement est fait par script (`tools/m09-kit-rangs.mjs`). Il produit cinq planches,
avec leurs découpes dans `art-src/decors/kit-rangs.json` :

- deux frises de ruelle d'environ 64 m (les deux rangées ramenées à la même hauteur de porte, assemblées dans deux ordres) ;
- un atlas de trois murs ;
- trois monuments (l'emblème Ronce du jeu est brodé sur les bannières de la halle, à la place de l'emblème inventé par
  le modèle) ;
- six objets.

Le Quai en quatre rangs est habillé du kit au laboratoire : 60 plans dans 12 images, 125,4 Mo de mémoire GPU. Les plans
de preuve dessinés par code sont retirés. Rien n'est approuvé (`approved: false`). L'approbation en bloc (A1) suit la
vérification des conditions d'OpenAI (A2).

### Cohérence du quartier et balises des passages (passe 67, 2026-10-20)

Retours du responsable sur la passe 66 : « ils semblent avec des bugs visuels et des incoherences de structure comme des morceaux de decors coupe/rogne ou un monument isole au centre avec des decors flou ( meme si on veut le flou ) mais dans aucun decor coherent pour peaufiner le visuel et la direction artistique, on doit a tout compris conserver une coherence et immersion car notre idee est genial mais mal integre » ; puis : « j'aimais bien aussi le fond au sol des decors precedent rang que nous avons depasse car cela nous permet de retrouver le chemin du retour pour revenir en arriere OU TOUT SIMPLEMENT je veux que tu iintegres des effets visuels indicatifs pour les chemins ruelles qui permet d'aller et revenir vers chaque rangs ».

Corrigé par script et par le moteur, sans nouvelle image :

- façades posées d'un mur mitoyen à l'autre (limites des maisons des frises) ;
- murs des passages sous la ligne des toits et dans l'ombre ;
- chapelle au milieu d'une rangée de maisons, ville haute au loin ;
- fantômes assourdis (gris, plus sombres) ;
- sol et pied des rangs dépassés gardés : ce sont les repères du retour.

**Balises des passages** : à chaque bouche, une lueur ambrée au sol et des chevrons vers le rang où le passage mène, à
l'aller comme au retour ; le nom de ce rang s'affiche en approchant. Elles sont dessinées par le moteur, et données par la
grammaire (`balisesRangs`) : tout quartier en rangs les a.

### Chemins lumineux et ombres (passe 68, 2026-10-20)

Retours du responsable sur la passe 67 : « non pas des fleches de direction soyons plus optimiste des chemin subtilement lumineux afin de connaitre notre chemin par contre les assets decors dans les rangs supperieur doivent etre bien integre toujours avvec ce cote diorama je remarque des assets mal integre qui donne cette sesnation de image pose sur la scene, eventuellement il faudrait mettre des ombres pour optimiser cette immersion, et je veux que tu conserves les fantomes des rangs precedents pour garder un petit visuelle du rang precedemment traverse » ; puis : « excellent les chemins sont presque bien mais un peu plus fluides et dissimules il faut qu'ils se fondent a la scene de maniere saine et coherente » ; enfin : « excellent plus besoin d'integrer un fantome visble car les chemins paves sont a present bien integres ».

- Les chevrons de la passe 67 sont retirés. À leur place, des **chemins lumineux** relient les rangs au travers des
  passages jusqu'au cœur : une lueur ambrée très douce, posée sur le dessus des pavés (les joints restent sombres). Le
  tracé est ondulé, les coudes arrondis, sans sens marqué, et la lueur se révèle autour du personnage. La grammaire les
  donne (`cheminsRangs`) et le moteur les dessine (`chemins.ts`).
- **Ombres** tirées des plans eux-mêmes (`ombres.ts`) : ombre de contact sous chaque objet, pied des façades et des murs
  des passages dans l'ombre, pied de chaque plan assombri.
- **Fantômes** : seul le rang juste devant le personnage reste en fantôme (12 %, passe 64). Les rangs déjà traversés ont
  d'abord été gardés à 7 %, puis effacés sur la dernière décision : ce sont les chemins qui guident le retour.

### Reprise de M09 : le Parvis et les Ruelles en rangs, la Grande Cour (passe 93, 2026-10-21) — RATIFIÉ (fiche de la reprise, R5, passe 97)

Décision S1 du responsable (fiche du lot M10-D) : reprendre M09 dans l'ordre (1) le Parvis et les Ruelles en rangs,
(2) la Grande Cour (V5), (3) la feuille du joueur (J1), (4) A2 puis A1.

- **Même grammaire, même principe** que le Quai en quatre rangs (`rangs.ts`) : le **rang 1 de chaque quartier est
  l'îlot d'aujourd'hui, inchangé** (bornes, portes, sorties, points d'apparition, obstacles ; test) ; le quartier
  s'enfonce derrière lui. Le Parvis : rue des Gradins et **place des Paris**, rue des Lices et **placette du Tableau**,
  **cour des Champions** au pied du grand mur de l'arène (`parvisRangs.ts`). Les Ruelles : ruelle des Tanneurs et
  **placette de l'Olivier**, ruelle du Voile, **cour de la Guilde** devant la halle de la Guilde des joueurs
  (`ruellesRangs.ts`).
- **La Grande Cour (C1 à C3)** suit la même grammaire : son rang 1 est la place elle-même, profonde (32 × 16 m :
  monument des Quatre Voies, estrade de duels, tableau des annonces, étals, foule), fermée au fond par la Maison du
  Tournoi, percée de deux passages vers le **Belvédère** (rang 2), d'où l'on voit la ville haute ; caméra de face plus
  haute (15° à 18°) qui suit en profondeur (`grandeCour.ts`).
- **Le cœur de chaque quartier s'ouvre sur la Grande Cour** (la proposition C1 de la passe 65) : par la porte cochère
  d'un bout de son dernier rang (le Quai et les Ruelles à l'est, le Parvis à l'ouest) ; dans la Grande Cour, les Ruelles à
  l'ouest, le Parvis à l'est, le Quai par l'escalier du premier plan. La ville d'aujourd'hui n'y mène pas.
- **La ville en rangs est un tout** (`ILOTS_RANGS`, manifeste `manifest-profondeur.json`) : elle s'affiche si les
  dioramas de ses quatre îlots sont admis (en QA ; hors QA après A2 puis A1), sinon la ville d'aujourd'hui (jamais de
  mélange d'un îlot à l'autre). La Grande Cour n'existe qu'en rangs.
- **Images** : les rangs 2 à 4 gardent le kit des rangs (frises posées d'un mur mitoyen à un autre, en prenant d'abord
  les maisons que le Quai n'a pas) ; l'identité de chaque îlot vient d'un **lot de 6 images annoncé** (pavillon de la
  porte du Tournoi, mur de l'arène, maisons du canal, halle de la Guilde, six objets, Maison du Tournoi ;
  `tools/m09-lot-villes-4.mjs`, 27 sur 30 après le lot), **à générer après l'accord du responsable**. En attendant, des
  pièces du kit tiennent leur place, nommées « provisoire » dans le rapport de l'assemblage
  (`tools/m09-quartiers-rangs.mjs`). Rien n'est approuvé.
- **Lot des villes généré (passe 94)**, après l'accord du responsable : 6 images (27 sur 30), traitées par script
  (`tools/m09-kit-villes.mjs` : détourage, emblèmes du jeu brodés sur les bannières unies, balustrade recadrée sur son mur,
  découpes dans `art-src/decors/kit-villes.json`) et posées : plus aucune pièce provisoire. Parvis 64 plans dans 11 images
  (101 Mo de mémoire GPU), Ruelles 51 dans 12 (117 Mo), Grande Cour 42 dans 8 (73 Mo). `approved: false`.
- **Feuille du joueur refaite (J1, passe 95)** : 1 image (28 sur 30 ; la réserve n'a pas servi), redessinée depuis notre
  feuille de la passe 60 (seule entrée), le style des PNJ de Cité du Tournoi décrit en mots (J2) ; écharpe sous le menton ;
  traitée par script (`tools/m09-joueur-j1.mjs`, contrat v3) ; `approved: false`.

### Décisions du responsable sur la reprise de M09 (fiche du 2026-10-21, passe 97)

Décisions (collection `decisions` de la fiche <https://claude.ai/artifact/MBMoN6uKqegRnai5Lo3LV1>, 11 documents, choix entre 06:15 et 06:20 UTC le 2026-10-21, aucune note) : **R1** « Reçu » (le Parvis en rangs) ; **R2** « Reçu » (les Ruelles en rangs) ; **R3** « Reçue » (la Grande Cour) ; **R4** « Reçue » (la feuille du joueur J1) ; **R5** « Ratifier tels quels » (la ville en rangs d'un seul tenant : ADR 028 « Reprise de M09 », ADR 032 amendement 5) ; **A2** « Vérifié : usage en jeu permis » (conditions d'OpenAI) ; **A1** « Approuver en bloc » (les 20 planches du jeu) ; **B1** « Garder en réserve pour A1 » (les 2 images restantes) ; **P1** « Passer la démo à la ville en rangs » (contre la recommandation, qui était de la laisser) ; **P2** « Après M10-E » (feuilles des PNJ de la ville) ; **S1** « M10-E : la ville vivante ».

- **Reçus** : le Parvis et les Ruelles en quatre rangs, la Grande Cour (V5 : C1 à C3 réalisés), la feuille du joueur J1.
  La section « Reprise de M09 » ci-dessus est **ratifiée** telle quelle.
- **A2 fait** : le responsable a vérifié les conditions d'OpenAI ; l'usage en jeu des images générées est permis.
- **A1 décidé** : **approbation en bloc des 20 planches du jeu** (liste : `docs/M09_IMAGES_A1_A2.md`, planche
  `screenshots/qa/m09/a1/planche-a1.png`). C'est la décision explicite que demande AGENTS (« Images de la ville ») ; elle
  est citée au JOURNAL (passe 97). **Les drapeaux des manifestes ne sont pas changés dans cette passe** : la consigne de la
  session de reprise interdit à l'agent de changer un drapeau `approved`, et la fiche annonçait le passage à
  `approved: true` sur ordre explicite du responsable, dans une passe à part.
- **A1 fait (passe 104, ordre explicite du responsable, fiche du lot M10-E, A1 : « Passer les 20 planches à « approved:
  true » »)** : les 20 planches sont `approved: true` (228 entrées des trois manifestes, 20 fiches de provenance). Le
  registre `art-src/approbations.json` (image et empreinte, décision citée) fait foi ; `tools/m09-approbations.mjs` l'applique et les scripts
  qui écrivent les manifestes le lisent ; `test/approbations.test.ts` vérifie qu'aucun drapeau ne s'en écarte. Une image
  retraitée (empreinte nouvelle) perd son approbation et ne s'affiche plus qu'en QA. Hors QA, l'aventure et la démo se
  jouent désormais dans la ville en rangs, avec la feuille du joueur ; la ville d'aujourd'hui reste le secours.
- **B1** : les 2 images restantes sur 30 restent en réserve pour d'éventuelles retouches après A1.
- **P1** : la démo `?demo=1` passe à la ville en rangs (**fait en passe 98** : décision commune `villeEnRangs`, la ville
  d'aujourd'hui en secours).
- **P2, S1** : les feuilles des PNJ de la ville viendront après M10-E ; le lot suivant est M10-E (la ville vivante).

### Retours R1 du responsable : accessoires intégrés, chemin jamais caché (passe 116, 2026-10-25)

Fiche du lot M10-E (<https://claude.ai/artifact/RF1NNces82oGupjz9WXE3w>), R1 « reçu avec retours » : « ajouter des ombres aux props décoratifs comme les stands »,
« pas de sensation d'image collée sur la scène mais bien des props intégrés », « le chemin lumineux ne doit pas être
caché par ces props ». Aucune image ne change (les 20 planches restent approuvées : registre `art-src/approbations.json`) ;
tout se fait dans le moteur et dans le plan des îlots :

- **Ombre de contact de la silhouette** (`ombres.ts`) : sous chaque objet debout et chaque bande d'accessoires, l'ombre
  suit les colonnes de l'image qui touchent le sol (pieds d'un étal, roues d'une charrette), lues une fois dans les lignes
  du bas de l'image ; sombre contre le pied, floutée vers les côtés, fondue sur 1 à 2 m vers l'avant (la caméra rasante
  raccourcit le sol : une ombre de 75 cm ne faisait que quelques pixels). À défaut d'image lisible, l'ellipse de la passe 68.
- **Ombre portée** : chaque objet (6,5 m de large au plus) porte au sol une ombre douce à l'opposé de la lanterne du moteur
  la plus forte qui l'éclaire (jamais la sienne, jamais vers le fond, où l'objet la cache) ; 0,6 à 2,6 m.
- **Pied des objets** : le bas d'un objet debout est plus assombri (0,5 au sol, fondu sur 0,7 m ; 0,62 sur 0,9 m pour les
  façades et les murs, comme avant), et le **liseré du fond magenta** de la génération (teinte violette au pied, frange verte
  dessous, relevée dans les lignes du bas des images du kit et du lot des villes) est ramené à la nuit au rendu, sur les
  45 derniers centimètres seulement : c'était lui, le trait violet sous chaque accessoire.
- **Chemin jamais caché** (`accessoires.ts`, `test/accessoires.test.ts`) : vu de la caméra de l'îlot, un objet debout
  cache le sol derrière lui sur (c.z − a.z) · h / (c.y − h) ; le test suit chaque chemin lumineux pas à pas (la caméra suit
  le personnage, les plans effacés comptent comme tels, silhouette de chaque image) et refuse tout point caché à moins de
  8 m du personnage ; il refuse aussi un personnage ou un repère (monument, estrade, tableau, fontaine) caché quand on
  s'en approche. Accessoires déplacés en conséquence : au Quai, l'étal de la Halle (7,4 → 9,4) et ses caisses ; au Parvis,
  la table des inscriptions (−0,4 m) et les tonneaux (+0,6 m) du rang 1, **dans les deux villes** (le rang 1 reste identique),
  le banc des Lices (3,2 → −1,6, hors de l'ombre d'un lampadaire) ; dans la Grande Cour, l'estrade ramenée de 6,3 à 4,6 m de haut (échelle 0,9 → 0,66, elle
  cachait le Belvédère), ses braseros resserrés, les deux étals avancés de part et d'autre du monument (z −1,0), la marchande
  de l'étal est devant lui.
- Vérification : `npx tsx tools/m09-accessoires.mjs` (chaque accessoire vu de près, planche par îlot,
  `screenshots/qa/m09/accessoires/`).

### Deuxième reprise de M09 : la Place du Fanal et la Ville haute, quartiers ajoutés (passe 129, 2026-10-25) — RATIFIÉ (passe 131)

Décision du responsable du 2026-10-25 (« Fanal et Ville haute », 4 images au plus ; « attaque la Place du Fanal et la Ville
haute ») ; les figures de l'aventure ne bougent pas sans sa décision.

- **Deux îlots de plus dans la ville en rangs**, même grammaire (`rangs.ts`) : `port`, la **Place du Fanal** (quartier du
  Port ; `placeFanal.ts`), au bord de l'eau, au pied du vieux phare, avec la maison de la Ronce en son cœur ; `haute`, la
  **Ville haute** (`villeHaute.ts`), une esplanade en terrasse au-dessus de la ville, avec l'Observatoire de l'Astre en son
  cœur. Identifiants `port` et `haute` (`fanal` est déjà le nom du lieu de duel du bar).
- **Liaisons** : la Place du Fanal par le bout ouest de la cour de la Chapelle (le cœur du Quai), la Ville haute par le bout
  ouest du Belvédère (Grande Cour). Ces bouts de ruelle portent déjà, dans le décor approuvé, un pignon à porte cochère :
  aucune planche approuvée n'est touchée.
- **Quartiers facultatifs** : la ville en rangs reste décidée sur ses quatre îlots d'origine (`ILOTS_COEUR`) ; un quartier
  ajouté n'est **ouvert** que si son diorama est admis par la politique (hors QA : ses images approuvées). Fermé, ses
  sorties sont retirées des îlots qui y mènent (le pignon reste un mur) et une sauvegarde qui s'y trouverait revient au
  Quai. Ainsi les quartiers se construisent et se montrent en QA sans jamais retirer au jeu la ville en rangs approuvée.
- **Images** : deux façades d'identité par quartier (le vieux phare et ses entrepôts, la maison de la Ronce ; les hôtels
  à arcades de la Ville haute, l'Observatoire), générées et traitées par script comme le lot des villes ; le reste vient
  du kit des rangs et du lot des villes.

**Ratification (2026-10-25, passe 131).** Ordre du responsable : « Ratifie l’amendement de l’ADR 028 (« Deuxième reprise » : quartiers ajoutés et facultatifs) tel quel, et consigne-le. » L'amendement vaut tel quel : deux quartiers ajoutés (`port`, `haute`) dans la ville en rangs, liés par les bouts ouest du cœur du Quai et du Belvédère ; la ville en rangs décidée sur ses quatre îlots d'origine (`ILOTS_COEUR`) ; un quartier ajouté ouvert seulement si son diorama est admis (hors QA : ses images approuvées), fermé sinon (sorties retirées, sauvegarde ramenée au Quai). Les 4 façades ont été approuvées en passe 130 : les deux quartiers sont ouverts dans le jeu.

**Bannières de l'Observatoire (passe 134, 2026-10-25).** Décision du responsable (finalisation de la ville, passe 133 :
« Broder l'Astre ») : l'emblème de l'Astre est brodé par script (`fixBanners`, `tools/m09-kit-quartiers.mjs`) sur les deux
bannières de l'Observatoire, comme sur les hôtels à arcades ; les étoiles peintes par le modèle disparaissent avec le
tissu refait ; aucune image générée. Les trois autres façades ressortent à l'octet près ; seule la Ville haute change
dans le manifeste (les deux lanternes murales de la porte sont désormais repérées comme lumières, au lieu de reflets
dorés des bannières). La planche retraitée a une empreinte nouvelle : son approbation de la passe 130 est **caduque**
(registre : `caduques`), la Ville haute est **fermée hors QA** jusqu'à une nouvelle approbation, sur ordre explicite du
responsable, dans une passe à part. Planche avant / après : `screenshots/qa/m09/finalisation/bannieres/avant-apres.png`.

**Yeux des feuilles des PNJ (passe 138, 2026-10-25).** Retour du responsable (capture du docker en jeu) : « les yeux ne sont
pas pareils ». Cause, dans notre traitement et non dans la source (les bruts dessinent deux yeux semblables) : la grille d'art
mesure un pas par axe (docker : 3,58 × 3,92 px) mais échantillonne avec leur moyenne et une phase unique pour toute l'image ;
le cœur des blocs tombe à cheval sur deux pixels du dessin, et les deux yeux (détails d'un pixel) sont lus à deux phases
différentes ; en plus, des pixels de l'iris pris pour des tons clés de la tenue ou de la chemise étaient recolorés en jeu (le
bleu dans un œil). Audit des 13 feuilles : yeux dissemblables chez les quatre gabarits, Kaï, Bran et Ilse ; les cinq autres
et le joueur corrects. Correctif **par script** (`processSheet`, option `yeux`, `tools/m09-traitement-images.mjs`), appliqué à
ces 7 feuilles seulement (aucune image générée) : les yeux sont repérés dans le brut par leur blanc entouré de peau, l'œil
entier par les pixels qui ne sont pas de la peau ; de face, les deux yeux du brut, recalés tels quels ou en miroir (selon la
feuille), sont moyennés en un seul dessin, échantillonné à la phase qui le rend le mieux et posé aux deux places après la
palette ; dans les yeux, les sourcils et les joues, aucun ton clé de vêtement ni d'accent, et les ombres orange des sourcils
rattachées aux cheveux. Palette et niveaux des tons clés calculés comme avant : **150 à 275 pixels d'art changés par feuille,
tous dans les visages** (rien de dos, rien sous la tête) ; feuille du joueur retraitée identique à son empreinte. Planches :
`screenshots/qa/m09/finalisation/yeux/` (`tools/m09-pnj-yeux.ts`, avant / après recolorés ; en jeu : `en-jeu/`). Les 7
approbations de la passe 128 sont **caduques** (registre : `caduques`, 29 images) ; hors QA, ces 7 personnages reviennent au
dessin par code jusqu'à une nouvelle approbation, sur ordre explicite du responsable, dans une passe à part.

### Chemins lumineux des premiers rangs (passe 149, 2026-10-26)

Demande du responsable (après la session M11) : « on devrait aussi ajouter des chemins lumineux pour les premiers rangs de
scènes afin qu'ils soient cohérents à nos autres rangs ». Le premier rang de chacun des six îlots en rangs reçoit son
chemin, dans la même lueur et le même nuanceur (`chemins.ts`, 24 segments au plus par quartier au lieu de 16) :

- **Tracé commun** (`cheminsRang1`, `rangs.ts`) : il relie, de gauche à droite, les sorties, les portes, l'arrivée et la
  bouche de chaque passage vers le rang 2 ; il garde la rue droite quand c'est possible, prend un coude du côté de la
  caméra sinon, et contourne les obstacles permanents du rang (fontaine, étals, bancs) par un détour pris d'abord devant
  eux ; les personnages posés ne sont pas contournés (ils bougent avec l'aventure).
- **La Grande Cour** a un tracé à la main (`CHEMINS_RANG1_COUR`) : l'allée entre la balustrade et le monument, reliée au
  pied de l'escalier du Quai, qui remonte le long des bords jusqu'à la hauteur des étals. Le tracé commun passait derrière
  les étals, qui le cachaient (règle de la passe 116) ; entre les étals et les passages vers le Belvédère, le chemin des
  passages reprend plus loin. Si le responsable veut un chemin continu jusqu'aux passages, il faudra reculer les étals.
- **Aucune image** ni approbation touchée ; tests : `test/rangs.test.ts` (chemin du premier rang sur le pavé praticable,
  près de l'arrivée, dans la limite du nuanceur) et `test/accessoires.test.ts` (jamais caché par un accessoire, inchangé) ;
  vérification au navigateur `tools/m11-chemins-rang1.mjs` (planches `screenshots/qa/m11/chemins-rang1/`).

### Marche de profil du protagoniste : passages redessinés par code (passe 163, 2026-10-29)

Retour du responsable après la passe 162 : les PNJ marchent mieux de côté, mais la marche de profil du protagoniste
« demande encore du peaufinage ». Relevé sur la feuille approuvée (`public/sprites/player.png`, J1) : les quatre temps de
profil sont quatre foulées ouvertes, **la même jambe devant** (pieds arrière et avant à 27 à 31 px d'art) ; les bras, eux,
alternent (besace en arrière aux temps 1 et 3, en avant aux temps 2 et 4) ; sans pose fermée, la passe 162 prenait le
**repos** pour passage : à chaque pas, bras, besace et manteau sautaient d'une silhouette à l'autre (la course à 3,2 m/s,
environ dix temps par seconde, et la caméra qui suit le rendaient bien plus visible que chez les PNJ, qui flânent).

- **Plan de marche** (champ facultatif `profil` d'une entrée v3 du manifeste, contrôlé par `checkManifestEntry`) : pour
  le joueur, contacts aux temps 1 et 2 (bras opposés), passages tirés des temps 3 et 4 (mêmes bras que le contact qui les
  précède) ; cycle contact, passage, contact, passage.
- **Passage redessiné par code au chargement** (`src/ville/passage.ts`, pur) : sur une copie en pixels d'art de la feuille
  chargée, le haut du corps et tout le manteau restent tels quels ; les pixels des jambes (sous le pixel de manteau le plus
  bas de leur colonne) glissent vers le milieu des pieds, de 0 à la hanche jusqu'au sol, et passent derrière le manteau.
  **L'image approuvée et son empreinte ne changent pas** ; aucune approbation touchée ; les PNJ gardent le cycle de la
  passe 162.
- **Foulée mesurée** : la phase du joueur avance selon l'écart des pieds de ses contacts à la hauteur de l'îlot (1,38 m
  pour deux pas à 2,2 m de haut, au lieu de 1,5 m) : les pieds glissent moins.
- Limite : la même jambe reste devant aux deux contacts (le dessin n'en a pas d'autre). Une rangée de profil redessinée
  (vraie alternance des jambes) demanderait une image, dans la génération de la version homme du protagoniste, sur
  l'accord du responsable.

### Protagoniste personnalisable : deux silhouettes, couleurs par code (passes 164 et 165, 2026-10-29)

Demande du responsable : une version homme du protagoniste (même structure et même tenue, cheveux argentés plus courts,
peau mate), puis « un système personnalisable de personne avec genre, type cheveu et couleur de cheveux, couleur de
peau, et type de visage », à la « nouvelle aventure » et dans le menu. Décisions dans la session : « 4 images, couleurs
par code » ; le choix nommé **« Silhouette »**, avec deux vignettes, jamais un mot genré ; le portrait du duel suit
l'apparence, par code.

- **Silhouette B** : une feuille générée (`player-b`, passe 164, réserve non utilisée ; 17 images sur 20), `approved: false`
  jusqu'à l'ordre du responsable ; hors QA, elle n'est pas proposée.
- **Apparence** (`src/ville/apparence.ts`) : silhouette, peau (6), cheveux (10 : l'argent, sept couleurs naturelles, roux
  vif, bleu nuit), yeux (6) ; elle voyage dans l'identifiant du personnage (`player-<tenue>` pour l'apparence d'origine,
  rendu inchangé ; `player-<tenue>@b431` sinon) ; chaque silhouette a sa feuille (`sheetKeys`).
- **Couleurs par code** (`src/ville/teintes.ts`) : les deux feuilles peignent la peau et les cheveux au naturel, la peau
  partageant ses tons avec le liseré doré du manteau ; au chargement, sur une copie en pixels d'art, les cheveux (gris
  clairs du haut de la figure, en grandes plages), la peau (visage ; plus bas, mains compactes qui ne touchent pas le
  manteau, la boucle de ceinture écartée) et l'iris (bleus du visage) sont reconnus puis repeints sur quatre niveaux. Les
  images ne changent pas.
- **Coupe et visage** : un par silhouette pour l'instant ; d'autres coupes ou visages demanderont des images, dans un lot
  à part avec son budget.
- **Sauvegarde** : `profil.apparence`, facultative (absente : l'apparence d'origine), schéma `aventure/2` inchangé.
- **Portrait du duel** (`scene/v2/joueur.ts`) : couleurs de l'apparence ; silhouette B en coupe courte (ni pans du carré
  ni arrière long) ; l'apparence d'origine garde le portrait historique.

### Coupes de plus pour le protagoniste (passe 167, 2026-10-29)

Ordre du responsable : « fait donc » (d'autres coupes, avec les 3 dernières images de la deuxième reprise). Une coupe de
plus par silhouette, chacune sa feuille (2 images, la réserve non utilisée ; **19 images sur 20**) : **A, queue de
cheval** (`player-a2`) et **B, mi-longue** (`player-b2`, case de 64 × 100 px d'art : ses cheveux plus hauts, au vrai pas
des pixels, rien de rogné) ; `approved: false` jusqu'à l'ordre du responsable. L'apparence gagne une **coupe** (`COUPES`,
`coupeDe`, `feuilleApparence` ; code de cinq signes quand la coupe n'est pas la première, les codes de quatre signes
restent valables) ; l'éditeur montre une ligne « Coupe » en vignettes ; le portrait du duel prend la coupe courte pour la
queue de cheval et le carré pour la coupe mi-longue. Le type de visage reste un par feuille : un visage choisi à part
demanderait des images, hors du budget de la deuxième reprise.

### Types de visage du protagoniste : une feuille par coupe et par visage (passes 169 et 170, 2026-10-29)

Demande du responsable : « tu peux ajouter du budget pour effectuer les types de visages » ; trois types : yeux en amande,
visage rond, visage anguleux. Essai de la méthode des **calques** (passe 169 : un visage généré sur la silhouette A, posé
par script sur les autres feuilles) : **ne tient pas** (têtes de tailles, d'écartements des yeux et de mèches différents :
traits effacés sans être repeints en entier). Décision du responsable : **« Feuilles complètes »** : chaque visage
redessiné par le modèle sur chacune des quatre feuilles (seule entrée : la feuille approuvée ; 12 feuilles, dont l'essai :
**12 images en tout**, réserve non utilisée), traitées par script (pas borné à la fenêtre des pixels carrés et de la
hauteur de figure de la feuille de base), `<feuille>-v<k>`, `approved: false` jusqu'à l'ordre du responsable.
L'apparence gagne un **visage** (`VISAGES`, code de six signes, `feuilleApparence`) ; une autre silhouette ou coupe garde
le visage choisi ; l'éditeur montre une ligne « Visage » en vignettes de la tête. Le portrait V2 du duel ne change pas
avec le visage (dessiné par code ; à reprendre si le responsable le demande). `src/ville/teintes.ts` compte aussi les
ombres du visage comme peau (sur une peau repeinte foncée, une ombre laissée au naturel faisait une tache claire).

### Deuxième lot de coupes du protagoniste (passe 172, 2026-10-29)

Demande du responsable : « tu peux proposer d'autres variantes de coupes cheveux » ; choix dans la session : A « Chignon
bas » et « Courte effilée », B « Côtés rasés, dessus en brosse » et « Bouclée courte », chacune avec les trois visages
(« Oui, 4 images par coupe ») : **16 images** (4 coupes depuis la feuille approuvée de leur silhouette, puis 12 visages
depuis la feuille de chaque coupe posée), réserves non utilisées ; `player-a3`, `player-a4`, `player-b3`, `player-b4` et
leurs `-v1` à `-v3`, `approved: false` jusqu'à l'ordre du responsable. `COUPES` passe à quatre coupes par silhouette (le
portrait du duel les dessine en coupe courte). `src/ville/teintes.ts` repeint aussi les petites plages de cheveux qui ne
touchent pas un iris et le gris beige d'une nuque rasée.
