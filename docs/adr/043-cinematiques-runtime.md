# ADR 043 — Cinématiques runtime dans l'aventure

**Date :** 2026-10-26. **Statut : PROPOSÉ.** Contrat : `docs/m11/07_CINEMATIQUES.md`.

## Contexte
Le responsable demande des « cinématiques runtimes pour optimiser certains passages de gameplay » (après la session
M11). Les rencontres forcées et Kaï jouent déjà des marches de personnages (`walkNpc`), mais la caméra reste celle qui
suit le joueur. AGENTS : aucune ressource externe au runtime ; le jeu par défaut au repos doit rester identique au
pixel près.

## Décision
1. **Caméra de l'îlot** :
   - `CameraRig.update` accepte des réglages pour une image (`tuning`, avec `tau`), sans toucher ceux de l'îlot ;
   - `Town.cadrer(cadrage | null, coupe)` fait viser un autre point que le joueur, avec un `zoom` et une `hauteur`
     relatifs ;
   - `Town.cameraParams()` donne les bornes ;
   - un changement d'îlot annule le cadrage.
2. **Plans purs** (`src/aventure/cinematiques.ts`) : coupe, glissé amorti, travelling minuté et adouci ; les plans de
   l'arrivée, de Kaï et du guetteur ; les cartons ; le réglage `lqv.cine` ; la permission par l'adresse (QA : `?cine=1`).
3. **Déroulé** (`src/aventure/cinema.ts`) : bandes, carton, « Passer » (et Échap, Espace, Entrée) ; actions démarrées
   avec leur plan, état final mis tout de suite si la cinématique est passée ; temps figé : tout de suite ; mouvement
   réduit : des coupes.
4. **Première porte** : première arrivée dans chaque quartier (mémoire `cinematiques` de la sauvegarde, champ
   facultatif), Kaï qui surgit, guetteur qui repère.

## Conséquences
- Mode Aventure seulement ; aucune image, aucun son, aucune approbation ; règles et état de l'aventure inchangés.
- Les parcours de QA d'avant sont inchangés (coupées en QA sans `?cine=1`).
- La suite (affiliation, Signature, titre, prologue) réutilise le même langage. Une vue d'ensemble d'un rang du fond
  demanderait des fantômes pilotés par la caméra (changement du diorama, à décider à part).
