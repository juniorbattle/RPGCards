# ADR 037 — Rencontres « en vue » : la vue déclenche, le directeur pose

**Date :** 2026-10-26. **Statut : PROPOSÉ** (session cloud M11 ; décision de principe du responsable, annexe A du brief
M11). Contrat : `docs/m11/01_RENCONTRES_EN_VUE.md`.

## Contexte
Le responsable veut que les PNJ joueurs de cartes viennent au joueur qui entre dans leur champ de vision et forcent le
duel, à la manière de Pokémon. Le directeur des rencontres (ADR 032) est pur et ne décide qu'aux points de décision ; la
ville (ADR 025) ne connaît que des positions.

## Décision
1. Un module pur `src/aventure/vue.ts` : cône (portée, demi-angle, direction de la place), occlusion par les obstacles de
   l'îlot (échantillonnage du segment), **front montant** (entrer dans le champ, pas y apparaître), liste des guetteurs
   actifs selon l'état du directeur (repos après un duel) et de l'aventure (après P8).
2. Le directeur garde son rôle (pose, tirage, départs) ; il note seulement l'issue du dernier duel par rencontre
   (`EtatDirecteur.vus`, champ facultatif : sauvegardes anciennes valides).
3. La ville expose deux primitives sans logique : faire marcher un PNJ jusqu'à un point (`walkNpc`), afficher la bulle
   d'alerte (`setMarkers` avec le repère `vu`) ; l'aventure orchestre (vérification de la vue à chaque image, approche,
   dialogue, préparation forcée).
4. Seuls les duels de rue et les membres des familles guettent ; figures, compétitions, rumeurs et Kaï non.

## Conséquences
- Le principe « jamais de duel sans accord » (VILLE_RENCONTRES P-V1.1) ne vaut plus pour les guetteurs (décision plus
  récente du responsable) ; l'abandon du duel reste possible et sans perte.
- Testable sans rendu ; réversible : vider la liste des guetteurs rend le comportement de M10.
