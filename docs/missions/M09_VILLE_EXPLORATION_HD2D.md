# M09 — La ville d'exploration HD-2D : cadrage, caméra et première zone

**Décision du responsable — 19 octobre 2026**, en séance, après la réception de M07 et la consolidation du combat
(M08). M09 démarre **après la release candidate du combat (M08, lot C5)** et seulement si le combat est sain (critères
plus bas). Elle ne change **aucune règle** du duel (V3.0, delta V3.2, D-01 ratifié en V3.3) ni la confidentialité des
secrets (ADR 011).

**DÉCISION DU RESPONSABLE (2026-10-19, pendant le run) : caméra d'exploration = FRONTALE 2.5D.** « Non, on ne veut pas d'inclinaison, mais frontale. » La vue de dessus inclinée est abandonnée : ne la construis pas (ou retire-la du laboratoire), fais V1 et V2 directement en frontale 2.5D (≈ 10–20°, plans de profondeur), et demande les images de référence en frontale. ADR 024 : statut « approuvé, frontale 2.5D ».

## Direction du responsable

- « Maintenant que nous avons une base solide, je veux optimiser le plus possible notre structure actuelle et
  m'approcher le plus d'une version démo. »
- « Si tout est bon sur le gameplay combat, on commencera avec la conception de l'environnement et donc du décor, en
  respectant notre narration : une ville d'exploration HD-2D RPG avec plusieurs zones (ville, quartiers, déplacements).
  Nous avions évoqué une caméra tilted top-down ou une perspective frontale 2.5D. »
- « Nous nous inspirons de l'autre projet sur lequel nous travaillons, Cité du Tournoi (dépôt RPG-ArtByCode), qui a créé
  un design procédural par code de qualité : on reprendra la même DA, sauf la caméra, qui est plus sophistiquée et qui
  diffère de ce que nous voulons. »
- « Un enjeu sera aussi d'utiliser des outils comme Aseprite pour les PNJ et personnages clés, mais pour le moment on
  va les générer génériquement pour avoir une base solide. »

## Autorisation de référence (exception à l'isolation des projets)

Le responsable **autorise explicitement** M09 à s'inspirer de **Cité du Tournoi** (`github.com/juniorbattle/RPG-ArtByCode`,
même propriétaire) :

- **Autorisé :** lire son code, ses outils et sa documentation ; reprendre sa **direction artistique** ; **adapter** ses
  techniques procédurales (matériaux, ciel et brume, post-traitement, génération guidée par la visibilité, révélation
  des occultations, outils de mesure) dans l'architecture de RPGCards, en notant la source (fichier et commit) dans le
  code ou l'ADR.
- **Interdit :** développer dans ce dépôt ou y pousser quoi que ce soit ; reprendre sa **caméra** (graphe de cadrages
  semi-fixes, A/B/C/D) ; importer ses contrats, ses décisions de gameplay ou ses personnages ; ajouter une dépendance
  vers lui (copie adaptée seulement).

### Direction artistique reprise (résumé de son `AGENTS.md`, « Art direction (locked) »)

- Nuit à dominante presque monochrome : **indigo / ardoise** dominants, **pierre froide** en secondaire, **lumière
  ambrée comme seul accent chaud**, **ivoire désaturé** pour les toiles et les rehauts.
- Accessoires **concentrés aux points focaux** (étal principal, grappes de lanternes, bord du quai, pont, quelques
  bannières) ; jamais de fouillis uniforme.
- Principe de production : **maximiser la complexité perçue en minimisant la complexité au runtime** ; le détail peut
  être procédural, cuit (baked) ou ponctuellement dessiné, selon la qualité finale, le coût, la reproductibilité et
  l'approbation du responsable.
- Post-traitement de référence : diffusion atmosphérique, profondeur de champ, halo, étalonnage de palette
  (`src/atmosphere/PostFX.ts` là-bas) ; brume et ciel partagés (`src/materials/ShaderChunks.ts`).

**Amendement du responsable (2026-10-19, ADR 026) : direction D.** Après la première passe de qualité du Quai, jugée
trop proche de Cité du Tournoi (« il faut qu'on se démarque dans la touche artistique de l'environnement »), le décor de
la ville devient une **illustration de carte encrée** (contours, aplats, hachures, papier) **aux couleurs des quatre
familles** (Cendre, Voile, Ronce, Astre : lumières, vitraux, glyphes, dorures). L'ambre n'y est plus le seul accent
chaud ; la nuit bleu d'encre, la pierre froide et l'ivoire désaturé restent.

**Amendement 1 (passe 47, ADR 026)** : sur la demande du responsable (« il nous manque le blur et les flaques d'eau
réfléchissantes », décors du centre plus impressionnants, l'eau du port ne doit pas avoir l'air d'une vitre) : profondeur
de champ (rue et façades nettes, premier plan et ville haute flous), reflet plan de la rue (flaques, port en reflet
brisé), clair de lune peint sur les étages, décors du centre enrichis (fronton doré de la salle de jeu, frise des
familles, pignon à oculus de l'armateur, lampadaires ouvragés, étal garni). **Quai validé par le responsable.**

**Amendement 2 (passe 49, ADR 026)** : « Étends-le au Parvis et aux Ruelles. » Grammaire de façade commune
(`src/ville/grammaire.ts`) ; le Parvis de l'arène (amphithéâtre, porte du Tournoi en arc de triomphe, rose des Quatre
Voies au sol, braseros, tentures) et les Ruelles du Voile (maisons à pignon, fontaine au cristal, étal de la liseuse,
canal) dans la direction D, avec le cadrage et les personnages du Quai. **Validé par le responsable** (« Je valide le Parvis et les Ruelles tels que sur la planche. ») :
les trois îlots sont validés dans la direction D. Les personnages de la ville restent provisoires (Aseprite et/ou
gpt-image-2 plus tard, cadrage `docs/M09_PERSONNAGES_VILLE_CADRAGE.md`) ; le décor ne s'en inspire pas.

**Personnages de la ville — décisions du responsable du 2026-10-19 (fiche interactive, ADR 027)** : feuilles de
sprites produites avec gpt-image-2 (dessin) et Aseprite (retouche, animation, assemblage) **autorisées dans le jeu**
(amendement d'AGENTS, section « Feuilles de personnages de la ville ») ; illustration encrée haute définition, identités
V2 du duel (le joueur avec une capuche rabattue), PNJ par gabarit recolorés par graine, échelle 2, contrat 5 × 3, chibi
modéré ; **porte de validation sur le duelliste joueur, 16 images au plus**. Note du responsable : démontrer l'apport
concret de gpt-image-2 (personnages, puis décors) avant d'ouvrir davantage la règle.

Cette DA est cohérente avec nos lieux de duel (la rue « le Quai, la nuit », le bar « le Fanal », ADR 022) : la ville
doit prolonger ces lieux, pas les contredire.

**Nouvelle direction — décisions du responsable du 2026-10-19 (passes 53 et 54, fiche « HD-2D stylisé et grande cour »,
ADR 028 ; remplace la direction D de l'ADR 026).** « Les décors et personnages ne sont pas qualitatif, je ne valide pas
la direction artistique » ; cible : **la référence initiale, le Quai la nuit vu de face**
(`reference/generated/2026-10-19-quai-nuit-cameras/02.png`) en **HD-2D stylisé** : personnages et accessoires en pixel
art net, décor peint au grain fin, lumière, profondeur de champ, halo, reflets et brume par le moteur. Décor en
**diorama de plans peints** générés (5 ou 6 plans par îlot), exception d'AGENTS étendue aux décors de la ville ;
traitement **par scripts seulement** (Aseprite en mode batch, Node), une image qui ne tient pas est régénérée ; **porte
sur le Quai, 30 images au plus** (décor et duelliste joueur) ; puis **la Grande Cour**, nouvel îlot au cœur de la ville
relié au Quai, au Parvis et aux Ruelles : place vivante (monument ou fontaine des Quatre Voies, foule, étals, estrade de
duels publics, annonces du Tournoi, la guide et des défis), îlot profond (≈ 32 × 18 m), caméra de face plus haute (15 à
20°) qui suit en profondeur ; puis le Parvis et les Ruelles. Décor et personnages par code gardés en provisoire jusqu'à
leur remplacement. Note du responsable : « je trouve que la direction D est plutôt bonne en soit. mais je sens que nous
pouvons améliorer/optimiser davantage le rendu » (lecture : ADR 028).

## Ce qui reste acquis

- Le combat et toute sa présentation (ADR 013 à 023) : le duel garde sa caméra, son plateau, ses HUD et ses lieux.
  La ville **mène** aux duels ; elle ne modifie pas l'écran de duel.
- Art par code, Three.js + TypeScript ; aucune image ni police externe au runtime, sauf les images de la ville
  (feuilles de personnages et décors des îlots, gpt-image-2 et Aseprite, manifestes de provenance comme dans Cité du
  Tournoi), amendements du 2026-10-19 (ADR 027 et 028).
- Personnages : socle « vectoriel V2 » (ADR 021) et gabarits PNJ génériques (ADR 023) comme base.
- Règle des QA aux jalons (AGENTS) ; développement sur `main`.

## Lots

| Lot | Objet | Critères d'acceptation |
|---|---|---|
| **V0** | **Cadrage écrit** de la ville : zones (ville, quartiers, liaisons), déplacements, entrée en duel (rivaux, PNJ, lieux de duel ADR 022), place des quatre lieux existants, fil narratif (Tournoi du Quai), boucle de démo cible ; budget de performance | document `docs/M09_CADRAGE_VILLE.md` ; questions ouvertes listées pour la fiche d'arbitrages |
| **V1** | **Laboratoire de caméra** sur un seul îlot (le Quai la nuit) : deux caméras comparables, **vue de dessus inclinée** (perspective, ≈ 40–55°) et **frontale 2.5D** (≈ 10–20°, plans de profondeur), basculables par paramètre d'URL ; un personnage générique qui marche ; DA de Cité du Tournoi | captures comparables des deux caméras (1280×720, 1920×1080) ; lisibilité du personnage et des accessoires ; coût mesuré (SwiftShader dans le cloud, GPU réel plus tard) ; recommandation argumentée, **décision au responsable** |
| **V2** | **Première zone jouable** avec la caméra retenue : déplacement, collisions, un ou deux PNJ génériques à défier, entrée dans un lieu de duel existant puis retour à la ville | après décision sur V1 ; **en run autonome sans le responsable** (brief du 2026-10-19), V2 peut commencer à titre **provisoire** sur la caméra recommandée, caméra isolée derrière une interface, à part du jeu |

Le prototype vit **à part** du jeu actuel (entrée ou paramètre dédié, par exemple `?ville=1` ou une page `ville.html`) :
le jeu par défaut reste identique au pixel près tant que le responsable n'a pas validé l'intégration.

## Porte d'entrée : « le combat est sain »

M09 ne démarre que si la release candidate du combat (M08 C5) est livrée avec : typecheck, tests et build verts ;
`qa:browser`, `qa:product` et `qa:rc` verts ; aucun défaut bloquant connu dans le duel ; rapport de la RC écrit. Sinon,
la session corrige le combat et s'arrête là.

## Procédure

Captures réelles, tests, build, journal, ADR pour toute décision structurante (caméra, architecture de la ville),
commit et push sur `main`. Les décisions ouvertes sont réunies dans une **fiche d'arbitrages** (`docs/FICHE_ARBITRAGES_M09.md` :
pour chaque décision, contexte, sources, captures, option recommandée et alternatives), que la session principale
transformera en fiche interactive pour le responsable.

## Décisions du responsable — 2026-10-19 (fiche « RC 0.8 et ville »)

- **Q1 :** **passe de qualité visuelle du Quai d’abord**, avant d’ajouter des îlots : lot **V3** ci-dessous.
- **B1** réglages de la caméra frontale gardés, ajustés à l’œil sur GPU réel ; **B2** îlots chargés un à un ; **B3**
  préparation systématique avant le duel ; **B4** la ville devient le hub par défaut **après validation de la démo** ;
  **B6** tutoriel en bulles non bloquantes ; **B7** textes gardés « prototype ».
- **B5 :** Aseprite pour les personnages clés **après la démo**, par un amendement de la règle « aucune image externe ».
  Note du responsable : « L'API OpenAI sera aussi disponible pour optimiser la tâche et le rendu » (images générées en
  local comme aide à la production des feuilles, sous l’amendement à venir). **Amendement adopté le 2026-10-19**
  (ADR 027) : voir « Personnages de la ville » plus haut.

| Lot | Objet | Critères d'acceptation |
|---|---|---|
| **V3** | **Passe de qualité visuelle du Quai** (passe 45 : livrée pour validation ; planche `screenshots/qa/m09/v3/planche-v3-quai.png` ; **validation du responsable attendue avant le Parvis et les Ruelles**) : plans de profondeur (eau et bord du quai au premier plan, rue, façades, silhouettes lointaines), façades variées et détaillées par code dans la DA de Cité du Tournoi, éclairage de nuit, taille et dessin des personnages, cadrage ajusté à l’œil | comparaison côte à côte avec les références de DA (`reference/generated/`) ; captures avant / après sur GPU réel ; coût par image mesuré sur la 780M et la RTX 4060 ; démo `qa:demo` et jeu par défaut sans régression ; validation du responsable avant d’étendre aux autres îlots |
| **V4** | **Porte HD-2D stylisé sur le Quai** (ADR 028) : code préalable **fait en passe 55** (plans de décor : manifeste, diorama tout ou rien, préparation derrière le fondu ; feuilles en pixel art : contrat v3, recoloration exacte) ; essai technique **fait en passe 56** (2 images : plan des façades du centre du Quai et feuille du joueur en pixel art, non approuvées ; fond transparent refusé par gpt-image-2, fond uni détouré par script) ; **lot de production fait en passe 57** (diorama du Quai en sept plans, feuille complète du joueur, 12 images sur 30, `approved: false` en attendant la décision ; planches `screenshots/qa/m09/v4-porte/` et `v4-porte-large/`) ; **passes 58 à 60** : retours du responsable, emblèmes du jeu posés par script, puis ses décisions appliquées (cadrage élargi dans le diorama, profondeur : brume entre les plans, rangs du fond à leur échelle réelle, troisième rang, ruelle et escalier vus par des ouvertures ; feuille du joueur en 64 × 96 ; 16 images sur 30 ; planche `screenshots/qa/m09/v4-decision-3/`) ; **passe 61** : fiche d'arbitrages appliquée (emblèmes brodés, lumières ambrées, sans ruelles peintes) ; **profondeur praticable demandée par le responsable** (marcher en profondeur dans les quartiers) ; **passe 62** : conception proposée, preuve jouable au laboratoire (`?profondeur=1`, planche `screenshots/qa/m09/v4-profondeur/`), **retenue par le responsable en passe 63** (à intégrer à divers quartiers) ; zones arrière améliorées par script ; **passe 65 : quartiers en rangs** (grammaire commune, le Quai en quatre rangs au laboratoire, `docs/M09_QUARTIERS_EN_RANGS.md`), kit de 5 images généré et posé en passe 66 (21 sur 30), plans peints du Quai et duelliste joueur en pixel art, traitement par scripts, **30 images au plus** | planche *in situ* : référence initiale, Quai actuel (direction D) et Quai de la porte, 1280 × 720 et 1920 × 1080 ; coût par image sur les deux GPU ; démo et jeu par défaut sans régression ; images au manifeste (empreintes, fiches) ; **approbation du responsable** avant d’étendre |
| **V5** | **La Grande Cour** (ADR 028) : nouvel îlot au cœur de la ville relié au Quai, au Parvis et aux Ruelles ; place vivante ; îlot profond, caméra de face plus haute qui suit en profondeur ; dans la direction validée par V4 | plan pur testé (collisions, zones, liaisons) ; planche ; démo verte ; budget d’images décidé sur le résultat de V4 |

## Pause du 2026-10-20 (décision du responsable)

« si tout est bon, on peut archiver et passer à la suite : on a une grosse tâche qui arrive, de structuration et de configuration narrative, que nous ferons sur le cloud (on continuera les sprites des personnages par la suite, après cette tâche, ainsi que les autres quartiers) ». M09 s'arrête après la passe 68 (`d4e379b`).

- **État :** le Quai en quatre rangs (rue Haute et place de la Halle, ruelle des Lanternes et placette du Puits, cour de la
  Chapelle), chemins lumineux, ombres au sol, au laboratoire seulement (`?ville=1&qa=1&profondeur=1`) ; démo et jeu par
  défaut inchangés ; manifestes `approved: false` (rien n'est approuvé) ; 21 images sur 30 utilisées.
- **Reprise décidée par le responsable le 2026-10-20** (fiche du lot M10-D, S1 : « Reprendre M09, puis M10-E », <https://claude.ai/artifact/X2z6EuQJDLHdNGe1Cvps4g>) ; M10-E (ville vivante) viendra ensuite, sur les îlots en rangs.
- **Reprise, dans l'ordre que fixera le responsable :** feuille du joueur (J1) ; le Parvis et les Ruelles en rangs ; la Grande Cour (V5) ; planche d’approbation en bloc (A1, après la vérification des conditions d’OpenAI par le responsable, A2) ; 9 images sur 30 restantes.
- **Brouillons d'images** : `art-gen/` du dossier principal (ignoré par git), y compris l'étude des directions du
  2026-10-19 (`art-gen/2026-10-19-quai-directions/`, recopiée depuis le dossier de la session V4 avant son archivage).

## M10 et la ville — décision du responsable du 2026-10-20 (ARB-M10-12)

Fiche d'arbitrages M10 interactive du 2026-10-20 (<https://claude.ai/artifact/P6QSq7ACy25pkB6581Cvg7>, 17 entrées, choix entre 14:48 et 15:25 UTC, relus par la session principale) : « Brancher le Quai en rangs dès M10-A, le reste à la reprise de M09 ».
- Dès le lot M10-A, le mode Aventure se joue dans **le Quai en quatre rangs** du laboratoire (passes 62 à 68), qui devient
  l'îlot du jeu pour l'aventure ; l'ancien Quai reste en secours. M09 reste en pause : ce branchement réutilise l'îlot tel
  quel, sans le refaire.
- **Fait au lot M10-A (passe 81, ADR 032 amendement 2)** : le Quai en quatre rangs est l'îlot du Quai de l'aventure, réutilisé
  tel quel (aucune image, aucun plan, aucune approbation changés) ; l'ancien Quai sert de secours tant que le diorama
  n'est pas admis (hors QA : A2 puis A1).
- **À la reprise de M09** : le Parvis et les Ruelles en rangs, branchés de la même façon ; puis la Grande Cour (V5) et la
  feuille du joueur (J1).
- Le décor en images générées ne s'affiche hors QA qu'après les approbations du responsable : **A2** (vérification des
  conditions d'OpenAI), puis **A1** (approbation en bloc des plans et des feuilles).

## Reprise du 2026-10-21 (décision S1 du responsable)

Ordre fixé : (1) le Parvis et les Ruelles en rangs ; (2) la Grande Cour (V5) ; (3) la feuille du joueur (J1) ; (4) A2 puis
A1, dans une fiche d'arbitrages avec la réception des quartiers et la suite (M10-E).

- **Passe 93** : plans en rangs du Parvis, des Ruelles et de la Grande Cour (même grammaire ; rang 1 de chaque quartier
  inchangé ; cœurs ouverts sur la Grande Cour), habillés du kit des rangs avec des pièces provisoires ; laboratoire
  `?ville=1&qa=1&profondeur=1&ilot=parvis|ruelles|cour` ; dans l'aventure, la ville en rangs d'un seul tenant (ADR 032
  amendement 5). **Lot de 6 images annoncé** au responsable (`tools/m09-lot-villes-4.mjs` : pavillon de la porte du
  Tournoi, mur de l'arène, maisons du canal, halle de la Guilde, six objets, Maison du Tournoi ; 27 sur 30 après le lot),
  généré seulement après son accord.
- **Passe 94** : lot des villes généré après l'accord du responsable (6 images, 27 sur 30), traité par script
  (`tools/m09-kit-villes.mjs`) et posé : plus aucune pièce provisoire dans les trois îlots.
- **Passe 95** : feuille du joueur refaite (J1, 1 image, 28 sur 30 ; réserve non générée), traitée par script
  (`tools/m09-joueur-j1.mjs`) et posée ; 2 images restent sur 30.
- **Passe 96** : jalon de QA vert sur les deux GPU et campagne complète ; A2 (inventaire `docs/M09_IMAGES_A1_A2.md`) et A1
  (planche `screenshots/qa/m09/a1/planche-a1.png`) préparés ; **fiche d'arbitrages** (réception, A2, A1, points ouverts,
  suite) : <https://claude.ai/artifact/MBMoN6uKqegRnai5Lo3LV1>.

## Réception de la reprise (2026-10-21, passe 97)

Décisions du responsable (collection `decisions` de la fiche <https://claude.ai/artifact/MBMoN6uKqegRnai5Lo3LV1>, 11 documents, choix entre 06:15 et 06:20 UTC le 2026-10-21, aucune note) : **R1** « Reçu » (le Parvis en rangs) ; **R2** « Reçu » (les Ruelles en rangs) ; **R3** « Reçue » (la Grande Cour) ; **R4** « Reçue » (la feuille du joueur J1) ; **R5** « Ratifier tels quels » (la ville en rangs d'un seul tenant : ADR 028 « Reprise de M09 », ADR 032 amendement 5) ; **A2** « Vérifié : usage en jeu permis » (conditions d'OpenAI) ; **A1** « Approuver en bloc » (les 20 planches du jeu) ; **B1** « Garder en réserve pour A1 » (les 2 images restantes) ; **P1** « Passer la démo à la ville en rangs » (contre la recommandation, qui était de la laisser) ; **P2** « Après M10-E » (feuilles des PNJ de la ville) ; **S1** « M10-E : la ville vivante ». La reprise de M09 est **reçue** : le Parvis et les Ruelles en rangs, la Grande Cour (V5),
la feuille du joueur J1. **A2** fait, **A1** décidé (approbation en bloc des 20 planches ; drapeaux à passer sur ordre
explicite, dans une passe à part). Suite : la démo dans la ville en rangs (P1), puis M10-E ; les feuilles des PNJ de la
ville après M10-E (P2) ; 2 images restent en réserve (B1).

## Retours du responsable sur la ville en rangs (fiche du lot M10-E, R1, 2026-10-21, passe 103)

Ville vivante « reçue avec retours » (<https://claude.ai/artifact/RF1NNces82oGupjz9WXE3w>) : des **ombres sous les accessoires du décor** (les étals, par exemple) ;
de façon générale, **aucune cassure de l'immersion** (pas d'image collée sur la scène : des accessoires intégrés) ; le
**chemin lumineux jamais caché** par ces accessoires. **A1** : ordre donné de passer les 20 planches à `approved: true`
(passe à part).

**A1 fait (passe 104)** : les 20 planches sont `approved: true` (registre `art-src/approbations.json`, ADR 028) ; hors QA,
la ville en rangs et la feuille du joueur s'affichent. Les retours R1 attendent le signal du responsable (pause demandée).

**Retours R1 faits (passe 116)** : ombres de contact tirées de la silhouette des images, ombres portées par les lanternes,
pied des objets assombri et liseré magenta neutralisé au rendu ; plus aucun accessoire ne cache le chemin lumineux, un
personnage ni un repère (test ; accessoires déplacés au Quai, au Parvis et dans la Grande Cour, estrade réduite) ; aucune
image changée, les approbations tiennent (ADR 028).

## Deuxième reprise (2026-10-25, après M10 ; passe 125)

Ordre du responsable (« go », après la clôture de M10 : « reprise de M09, feuilles des personnages de la ville, autres
quartiers ») et ses deux choix du même jour (questions de la session, passe 125) :

- **Feuilles des PNJ de la ville : « 16, avec une porte ».** Douze feuilles, une image chacune : les quatre gabarits
  recolorés par graine (docker, marchande, commis, joueuse : cadets, membres, passants, héraut, Tenante), les quatre
  rivaux (Kaï, Maëlle, Sélène, Orin) et les quatre chefs (Bran, Mère Aubépine, Ilse, Halvard) ; quatre images pour
  régénérer une feuille qui ne tient pas ; **16 images au plus**. D'abord une **porte de 2 feuilles** (le gabarit docker
  et Kaï) posées in situ sur une planche que le responsable regarde, puis les dix autres.
- **Autres quartiers : « Fanal et Ville haute ».** La Place du Fanal, sur le Port (maison de la Ronce, entrée du bar), et
  la Ville haute (l'Observatoire de l'Astre), au-dessus du Belvédère de la Grande Cour ; en rangs, avec le kit actuel et
  une ou deux images propres chacun, **4 images au plus**. Les figures de l'aventure ne bougent pas sans décision du
  responsable.
- Budget de la deuxième reprise : 20 images au plus (16 + 4), hors des 30 de la porte du Quai (28 utilisées, 2 en
  réserve, B1).
- Contrat des feuilles des PNJ : celui du joueur (v3, pixel art, cases de 64 × 96 px d'art, agrandissement ×3) ; le
  gabarit porte quatre tons clés (peau rouge, cheveux jaune, tenue magenta, chemise cyan) sur un **fond bleu pur** (le
  cyan est pris par la chemise) ; les rivaux et les chefs gardent leurs couleurs propres, sur fond cyan. Entrées : notre
  atlas dessiné par code du personnage et la feuille du joueur approuvée (style, échelle, proportions).
- **Porte (passes 125 et 126)** : le gabarit docker et Kaï (2 images) ; retour du responsable : aucun contour clair
  autour des personnages (liserés de lumière retirés du nuanceur, contour noir du dessin).
- **Suite (passe 127)**, ordre du responsable : « Oui : génère les 10 autres feuilles des PNJ (gabarits marchande, commis,
  joueuse ; Maëlle, Sélène, Orin ; les quatre chefs), traite-les et pose-les. » 10 images (`tools/m09-lot-pnj-suite.mjs`),
  traitées par script (`tools/m09-pnj-feuilles.mjs`) et posées, `approved: false` ; planche des douze feuilles
  `screenshots/qa/m09/pnj/planche-pnj.png` (`tools/m09-pnj-planche.mjs`). **12 images sur 16 pour les PNJ** (aucune
  reprise utilisée) ; restent 4 images de reprise et les 4 images des quartiers (Place du Fanal, Ville haute).
- **Approbation (passe 128)**, ordre du responsable : « J’approuve les 12 feuilles des PNJ : passe-les à approved: true par
  le registre, dans une passe à part ». Registre `art-src/approbations.json` : 32 images (20 planches, 12 feuilles).
- **Quartiers (passe 129)** : la Place du Fanal (`port`) et la Ville haute (`haute`) en rangs, quartiers ajoutés et
  facultatifs (ADR 028, « Deuxième reprise », ratifié en passe 131 ; `docs/M09_QUARTIERS_EN_RANGS.md` §9) ; 4 façades d'identité
  générées et traitées par script, `approved: false` : fermés hors QA jusqu'à leur approbation ; 16 images sur 20.
- **Approbation des façades (passe 130)**, ordre du responsable : « J’approuve les 4 façades des quartiers […] pour ouvrir
  la Place du Fanal et la Ville haute. » Registre : 36 images ; les deux quartiers sont ouverts dans le jeu.
- **Ratification (passe 131)** : « Ratifie l’amendement de l’ADR 028 (« Deuxième reprise » : quartiers ajoutés et facultatifs) tel quel, et consigne-le. » L'amendement de l'ADR 028 (quartiers ajoutés et facultatifs) est ratifié.

## Finalisation de la ville (2026-10-25, passe 132) : cadrage soumis au responsable

Ordre du responsable : finaliser l'intégration de la ville et de ses figures, pour passer ensuite à la structure narrative
de bout en bout. Quatre points ouverts, soumis avant d'agir (rien n'est déplacé, généré ni approuvé avant ses réponses).

**État constaté (passe 132).** Dans l'aventure, la Place du Fanal et la Ville haute se parcourent, mais n'ont que leurs
passants : leurs quatre personnages de démo sont retirés comme partout (`ilotNu`), le directeur des rencontres n'y pose
personne, et leurs places et balises répondent « Rien de plus ici ». Les bannières de l'Observatoire sont peintes d'étoiles
par le modèle (`tools/m09-kit-quartiers.mjs`, aucune broderie). Budget de la deuxième reprise : 16 images sur 20 ; les 4
restantes étaient prévues comme reprises des feuilles des PNJ, aucune n'a servi. L'heure de ville (V1 de la fiche M10-E)
n'a pas été jouée ; elle attend « une heure de ville jouée sur GPU réel, rencontres jugées non intrusives » (feuille de
route M10-E).

1. **Vie des deux quartiers dans l'aventure.** Recommandé, sans déplacer aucune figure : les textes de leurs places ; une
   rumeur par quartier (répliques propres : la Ronce au Port, l'Astre et le Championnat en haut) ; un duel de rue
   facultatif par quartier (gabarits approuvés, graines nouvelles) ; une seconde place pour le membre de la Ronce (cour
   de la Ronce) et celui de l'Astre (parvis de l'Observatoire) ; une place de l'ombre de Kaï dans chacun ; toujours
   deux facultatives au plus par îlot, aux seuls points de décision. Et la suite de la lecture D7 (fiche M10-E) : les
   quatre chefs posés sur l'estrade de la Grande Cour à l'ouverture et à la proclamation du Championnat, avec leurs
   feuilles approuvées. À décider à part : déplacer Mère Aubépine et Halvard (ou les Joutes de la Ronce et de l'Astre)
   vers les deux nouveaux cœurs ; recommandation : laisser ce choix à la structure narrative de bout en bout.
2. **Bannières de l'Observatoire.** Recommandé : l'emblème de l'Astre brodé par script (`fixBanners`, comme les hôtels à
   arcades), sans génération. Conséquence : la planche retraitée change d'empreinte et perd son approbation ; la Ville
   haute se ferme hors QA jusqu'à ce que le responsable l'approuve de nouveau, dans une passe à part. Aperçu montré au
   responsable. Autres options : garder les étoiles ; régénérer l'Observatoire avec des bannières unies (1 image).
3. **Les 4 images restantes.** Recommandé : les garder en réserve (reprises après le jalon ou la fiche). Autres options :
   feuilles propres pour les quatre cadets (4 images) ; un héraut et deux passants de quartier (3 images). Rien n'est
   généré sans accord explicite.
4. **L'heure de ville.** Recommandé : une heure simulée par script (le directeur sur une heure type, chiffres de présence
   des rencontres) ; `qa:vivante` étendu aux deux quartiers ; une page « heure de ville » (lancer le build hors QA,
   parcours, quoi juger) ; des points de départ par chapitre pour juger les chapitres avancés sans tout rejouer ; le
   verdict du responsable dans la fiche finale.

**Décisions du responsable (2026-10-25, passe 133 ; réponses aux quatre questions du cadrage, chacune sur l'option
recommandée) :**

1. **Quartiers : « Vie facultative »** seulement : textes des places, une rumeur, un duel de rue, seconde place des
   membres de la Ronce et de l'Astre, ombre de Kaï ; **aucune figure déplacée**. Non retenus : les quatre chefs sur
   l'estrade au Championnat (la cérémonie reste en texte), le déplacement de Mère Aubépine et Halvard, celui des Joutes.
2. **Bannières : « Broder l'Astre »** par script (`fixBanners`), sans génération ; la planche retraitée perd son
   approbation, la Ville haute se ferme hors QA jusqu'à une nouvelle approbation, sur ordre explicite, dans une passe à part.
3. **Images : « Réserve »** : les 4 images restantes ne sont pas générées (16 sur 20 utilisées).
4. **Heure de ville : « Tout préparer »** : heure simulée chiffrée, `qa:vivante` étendu aux deux quartiers, page de jeu,
   points de départ par chapitre ; le responsable joue, son verdict va dans la fiche finale.

**Fait (passes 134 à 140) :** Astre brodé et Observatoire réapprouvé (134, 135) ; vie facultative des deux quartiers,
ADR 032 amendement 8 (136) ; heure de ville préparée, `docs/HEURE_DE_VILLE.md` (137) ; yeux dissemblables des PNJ
corrigés par script sur 7 feuilles et réapprouvés (138, 139 ; registre : 36 images) ; **jalon de QA complet vert sur la
Radeon 780M et la RTX 4060** (140 : 54 étapes sur 54, jeu par défaut identique au pixel près au build de la RC, les six
îlots de la ville mesurés ; `artifacts/qa/m09/finalisation/jalon/synthese.md`). **Fiche d'arbitrages finale :**
<https://claude.ai/artifact/WtuBiKyjVKVrkNEXb1rFpX> (réception R1 et R2, heure de ville V1, images I1, clôture de M09 C1,
les deux Observatoires O1, suite S1 : la structure narrative de bout en bout, contrat d'abord), en attente du
responsable ; ses choix sont consignés ici avant d'agir.

## Fiche de la finalisation remplie : M09 clos (2026-10-26, passe 141)

Fiche <https://claude.ai/artifact/WtuBiKyjVKVrkNEXb1rFpX>, remplie par le responsable (aucune note ; tableau :
`docs/FICHE_ARBITRAGES_M09_FINALISATION.md`) : **R1** vie des deux quartiers reçue ; **R2** jalon reçu ; **V1** heure de
ville : rencontres **non intrusives : gardées** (densité du directeur inchangée ; V1 de la fiche M10-E clos) ;
**I1** les 4 images restantes **en réserve** pour la structure narrative (16 sur 20 utilisées, rien sans accord
explicite) ; **C1** **M09 clos** ; **O1** les deux Observatoires et la géographie des maisons **à trancher dans la
structure narrative** (rien renommé ni déplacé d'ici là) ; **S1** suite : **la structure narrative de bout en bout,
contrat d'abord** (soumis au responsable avant tout code), puis des lots jouables avec leur fiche.
