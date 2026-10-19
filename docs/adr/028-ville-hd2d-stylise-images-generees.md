# ADR 028 — Direction artistique de la ville : HD-2D stylisé en images générées (diorama de plans peints, personnages en pixel art) ; la Grande Cour (M09)

Date : 2026-10-19
Statut : **APPROUVÉ par le responsable** (fiche d'arbitrages interactive du 2026-10-19,
<https://claude.ai/artifact/J34iVbgwRjWJVxQwdJQGL3>, onze entrées, choix entre 21:35 et 21:41 UTC) ; **production pas
commencée** : porte sur le Quai à venir (30 images au plus). **Remplace l'ADR 026** comme direction artistique de la
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
