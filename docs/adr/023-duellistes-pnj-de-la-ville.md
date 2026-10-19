# ADR 023 — Duellistes PNJ de la ville : gabarits V2 et variations par graine (M08, lot C3)

Date : 2026-10-18
Statut : **APPROUVÉ — quatre gabarits validés par le responsable** le 2026-10-18 sur la planche de 12 PNJ : « Je valide
les quatre gabarits PNJ (docker, marchande, commis, joueuse) tels que sur la planche. » Le nombre de gabarits est figé
à quatre ; retours de finition intégrés en séance (voir « Finition »). Complète
l’ADR 021 (socle « vectoriel V2 ») ; ne change ni les règles (V3.0 + delta V3.2), ni le cadrage (ADR 013), ni les secrets
(ADR 011). Numéro 023 : l’ADR 022 est réservé au chantier C2 (lieux), mené en parallèle.

## Contexte

Mandat M08, direction du responsable : « des combats basiques contre des PNJ de la ville : des designs génériques avec
quelques petits changements subtils pour montrer les différences, comme dans Pokémon, où les dresseurs PNJ basiques sont
souvent des sprites réutilisés et légèrement modifiés (couleur des vêtements, des cheveux, de la peau) mais qui
conservent la même structure de base ». Les PNJ doivent rester nettement moins singuliers que les quatre rivaux
signatures ; un seul modèle pour le duel et le portrait ; l’identifiant d’adversaire était limité aux quatre rivaux.

## Décision

### Identifiant d’adversaire généralisé

- `OpponentId = SignatureRivalId | NpcId` (`src/presentation/personalities.ts`) : `SignatureRivalId` = les quatre
  rivaux, `NpcId` = `` `pnj-${string}` ``. Un PNJ est entièrement dérivé de son identifiant `pnj-<gabarit>-<graine>` :
  apparence, prénom, Signature, Techniques, tempérament et profil de jeu (`npcPersonality`, en cache) ;
  `personalityById` sert les deux ; `?qa=1&rival=pnj-…` impose un PNJ dans l’entrée directe (planche, QA).
- La progression (rivaux rencontrés / vaincus, récompenses de première victoire, série) reste réservée aux rivaux
  signatures : un duel contre un PNJ n’entre que dans l’historique (sauvegarde valide, schéma inchangé).

### Gabarits et variations (données pures, `src/presentation/npcs.ts`)

- Quatre gabarits proposés : **docker** (visage carré ; coupes rase, courte, plaquée en arrière ; tricot à encolure
  ronde et bretelles ; bonnet, boucle d’oreille, barbe de trois jours), **marchande** (ovale ; chignon, queue de cheval,
  mi-longs ; corsage et châle croisé noué ; fichu, fleur, boucles d’oreille), **commis** (doux ; raie, frange, boucles ;
  veste à revers sur chemise ; lunettes rectangulaires, casquette, cravate), **joueuse** (ovale ; carré, ondulée,
  garçonne ; gilet sur chemise ; bandeau, boucles d’oreille, broche).
- Variations par graine : **coupe** (graine mod 3) et **accessoire** (⌊graine / 3⌋ mod 4) parcourent les listes du
  gabarit (toute combinaison en 12 graines consécutives) ; **peau** (6 carnations), **cheveux** (7 couleurs naturelles),
  **vêtement principal** (7 couleurs sourdes), **chemise** (4 neutres) et **iris** (5) sont tirés (RNG d’art dérivée de
  l’identifiant). Ordre de tirage figé (une dimension nouvelle s’ajoute à la fin).
- Moins singuliers que les rivaux : palettes sourdes, aucune couleur de fantaisie (argent, lavande : joueur et Sélène),
  aucun emblème ni marque (cicatrice, grain de beauté, taches de rousseur), accessoires ordinaires ; ni tresse sur
  l’épaule (Maëlle), ni lunettes rondes de laiton (Orin), ni bandeau à plaque (Kaï).

### Dessin (`src/scene/v2/pnj.ts`) et intégration

- Même socle V2 que les rivaux (yeux, paupières découpées, sourcils, bouches, rougeur, humeurs) : expressions héritées.
  Visage commun aux trois formes, modelé plus sobre ; dessus de tête des coupes courtes dessiné dans la tête au-dessus
  de y ≈ 92 (hors des paupières découpées) ; franges et pans sur la couche des mèches ; chignon, queue et longueurs sur
  le plan arrière.
- `kitV2('pnj-…')` ; portraits des affiches et du HUD par le même modèle ; pré-génération C1 commune : le tableau prépare
  aussi les PNJ des duels de la ville (au plus 6 figures préparées ; l’affiche survolée ou focalisée passe en tête).
- Profils de jeu génériques (`src/game/ai/policy.ts`) : `novice` (franc : Assauts, peu de Techniques) et `timide`
  (Gardes, Secondaires gardées) : mêmes règles, même vue autorisée, moins de Techniques et de mémoire. Fiche générique
  (`sheetOf`) : 60 PV (repère bas de calibration), deck tout en Basic, deux Techniques ordinaires (jamais Rupture ni
  Dissipation), une étoile ; style public affiché. Répliques génériques en deux registres (tutoiement : docker,
  joueuse ; vouvoiement : marchande, commis).
- Rencontres de prototype : rubrique **« Duels de la ville »** de l’écran Rencontres (un PNJ par gabarit :
  `TOWN_DUELS`), ouverte d’emblée, « Entraînement » sans récompense.

### Finition (retours du responsable en séance, 2026-10-18)

- « La frange des cheveux semble à l’envers » → mèches pointées vers le bas, qui retombent sur le front.
- « Être rigoureux sur les détails et finitions, ne pas avoir des éléments trop géométriques comme l’effet dent de scie
  pour les mèches, mais des courbes fluides » → plus aucun bord en zigzag : mèches du docker en **coups de pinceau**
  (cubiques à largeur variable, corps en fuseau, reflets et ombres qui naissent en fondu), frange du commis en masse au
  bord **ondulé doux** (spline de Catmull-Rom, tangentes continues) parcourue de fines mèches, boucles en volume au
  contour bosselé lisse et touches irrégulières, coupe rase en velours ; plan d’ombre des cheveux à **terminateur courbe
  adouci** (plus de coupure verticale au milieu du crâne), calotte posée sur les pans du carré (plus de haut plat).

## Conséquences

- **Planche** (`tools/c3-planche.mjs`, Radeon 780M, `screenshots/qa/m08/c3/`) : 12 PNJ (graines 1, 5, 9 de chaque
  gabarit : les trois coupes et trois accessoires) en vue A du duel recadrée et en portrait, quatre rivaux en référence,
  1280×720 et 1920×1080 ; vue A complète d’un PNJ par gabarit ; écran Rencontres avant / après (rubrique « Duels de la
  ville »).
- **Déterminisme** : couches V2 des 12 PNJ et des 4 rivaux générées dans deux pages neuves, empreintes FNV-1a identiques ;
  tests unitaires (`test/npcs.test.ts`, 11 tests) : même identifiant → même apparence et même identité de jeu, valeurs
  figées d’un PNJ, structure de gabarit respectée, couverture des coupes et accessoires en 12 graines, couleurs variées,
  personnalité, profils, duels de la ville sans progression et sauvegarde valide.
- **Coût de génération** (`__lqvFigureCost`, médiane de 15, même série, 780M) : PNJ 38 à 65 ms, rivaux 47 à 68 ms ; même
  rig (24 textures, 1,85 M texels). Couvert par C1 : apparition d’un PNJ depuis le tableau 125 → 10,9 ms (médiane,
  préparation désactivée contre active ; `artifacts/qa/m08/c3-apparition-pnj-780m.json`).
- **Rivaux inchangés** : parcours réel contre le build C1 (`1e7ef20`), 0 pixel différent (scènes de préparation des
  quatre rivaux, duel complet, 1280 et 1920 ; `artifacts/qa/m08/c3-rivaux-identiques.json`).
- QA : `qa:browser` 5/5 (rivaux) et 5/5 contre un PNJ imposé (`LQV_QA_QUERY=rival=pnj-docker-1`) ; `qa:product` 9/9
  (71/71, nouveau parcours I : duel de la ville jusqu’au K.-O., aucun déblocage, sauvegarde valide) ; `qa:rc` 9/9
  (47/47 : contraste de l’écran Rencontres min 7,8:1, 6 adversaires préparés au tableau, textures 49 par rival, tas
  19 → 19,8 Mo) ; 0 fuite de secret.
- Mémoire au tableau : jusqu’à 6 figures préparées (≈ 10 Mo de textures et autant de canvas chacune).

**Cette décision n’introduit aucune règle métier nouvelle ; aucune information secrète n’est exposée.**
