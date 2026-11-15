# ADR 050 — La profondeur du décor peint : volumes éclairés, ombres au sol, escaliers en vrai 3D

**Date :** 2026-11-15. **Statut : APPROUVÉ ET GÉNÉRALISÉ** (essai validé par le responsable, « Oui c'est mieux on
valide », sur la Grande Cour et le Quai en quatre rangs, passes 236 à 238 ; généralisé aux six quartiers en rangs sur son
ordre, « Oui, généralise », passe 239). Complète l'ADR 028 (décor en diorama de plans peints) et le relief de la passe 162.

## Constat

Retour du responsable (2026-11-14) : bâtiments et accessoires « collés/écrasés », « une image générée de bâtiment avec un
escalier mais il n'y a pas de profondeur », puis « ce sont surtout les batiments dans les zones profondes ». Le relief de
la passe 162 (`reliefs.ts`) ne décale l'image que vue de biais : de face, le cadrage de référence, il ne change presque
rien. Mesure sur les rangs profonds (`tools/relief-cour-ecrase.mjs`) : la cause principale est géométrique (chaque rangée
du fond est une frise posée en un seul plan, les maisons de flanc sont des plans de face empilés) ; le voile et la brume
des plans comptent un peu (noir −5 niveaux, détail +11 % sans eux), les nappes de brume, l'échelle et la profondeur de
champ presque rien.

## Décision

Trois leviers, choisis par le responsable, tous par code (`src/ville/volumes.ts`, pur ; nuanceur des plans de
`diorama.ts`) :

1. **Volumes éclairés** : la carte des profondeurs (formes en données, `FORMES_ESSAI`) donne une carte RGBA calculée au
   chargement (`texelsVolume` : profondeur, pentes lissées, ombre des saillies) ; dans le nuanceur (branche `VOLUME`),
   normales du relief, point à sa vraie profondeur, recoins assombris, ombre sous les saillies, lumières peintes gardées,
   ciel d'en haut, lanternes du moteur sur les arêtes (écart amplifié et borné), **halo chaud autour du protagoniste**
   (8 m, sans vaciller). Réglages d'un seul endroit : `REGLAGES`, `OMBRAGE`.
2. **Ombres au sol** des rampes : emprise et lanterne la plus proche (`ombresRampe`, `ombres.ts`).
3. **Escaliers en vrai 3D** : volées et perrons découpés par un polygone en pixels (`RAMPES`), triangulés et posés sur un
   plan incliné qui avance vers la rue (`sommetRampe`), deux flancs en rideaux verticaux habillés d'une bande de l'image
   (`flancsRampe`), trou derrière la rampe assombri ; **leurs emprises sont des obstacles de l'îlot monté**
   (`emprisesRampes`, `QuaiScene.obstacles`, `avecObstacles` dans `ville.ts`) : on n'entre pas dans un escalier.

Périmètre : `ILOTS_ESSAI`, les six quartiers en rangs (dioramas en rangs seulement ; la ville d'avant les rangs reste
identique). Volumes ronds (tours, phare, rotonde) : forme `cyl` du relief (`profCyl`). Une volée peinte paraît dans
plusieurs rangs ; là où un chemin lumineux ou un point d'apparition est devant elle, son avancée est réduite
(`SAILLIES_PLAN`). `?volume=0` redonne le rendu de la passe 162 et `?relief=0` le
rendu sans relief, au pixel près (`tools/relief-cour-identique.mjs`).

## Garanties

Aucune image générée ni modifiée sur le disque (formes, découpes et cartes tracées au chargement) ; aucun drapeau
`approved` touché ; caméra frontale inchangée ; la ville d'avant les rangs identique au pixel près. Une rampe ne recouvre
ni point d'apparition, ni personnage, ni chemin lumineux, et chaque zone reste atteignable (`test/volumes.test.ts`).

## Coût

Grande Cour : Radeon 780M +0,08 ms (1280) et +0,67 ms (1920) ; RTX 4060 +0,1 ms. Rangs profonds du Quai : 780M +0,29 ms et
+0,58 ms (9,7 ms par image en 1920, p95 15,1 ms) ; RTX +0,12 et +0,27 ms. Quatre autres quartiers (passe 239) : RTX +0,03 à +0,25 ms ; 780M +0,4 à +0,8 ms
(au Parvis, dans le bruit de la mesure). Calcul des cartes optimisé (flou vertical ligne par ligne) : 75 à 85 ms par frise. Première entrée dans un îlot de l'essai : +160 à
310 ms (cartes calculées au processeur, sous le rideau ; gardées en mémoire ensuite, environ 6 Mo).

## Suites ouvertes

Alléger le voile et la brume des rangs profonds ; le quatrième levier non retenu, « épaisseur des façades » ; passer le
calcul des cartes dans un travailleur si la première entrée dans un quartier se sent.
