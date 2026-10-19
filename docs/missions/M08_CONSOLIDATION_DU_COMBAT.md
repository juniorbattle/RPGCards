# M08 — Consolidation du combat : décors variés et duellistes de la ville

**Décision du responsable — 18 octobre 2026**, en séance, après la livraison du lot 5 de M07 (personnages « vectoriel V2 »
des quatre rivaux et du joueur, ADR 021). M07 est livré (L1 à L5) ; il reste sa **réception** par le responsable (revue des
captures L3, L4 et L5). M08 ne change **aucune règle** du duel (V3.0 + delta V3.2) ni la confidentialité des secrets
(ADR 011).

## Objectif

« L’idée est de pousser le plus possible notre structure et visuel du gameplay combat afin de basculer sur la suite. »
Avant l’extension RPG (ville, exploration), le combat de cartes doit être consolidé : il doit pouvoir se jouer **dans des
lieux variés** et **contre des adversaires variés**, des quatre rivaux signatures aux duellistes ordinaires de la ville.

## Arbitrage du responsable sur la suite de L5 (18 octobre)

| Sujet | Décision |
|---|---|
| Direction « vectoriel V2 » | **Conservée comme nouvelle base graphique** des personnages |
| Aseprite | **N’est plus considéré comme indispensable** pour ce chantier |
| Modèles des quatre rivaux | Silhouettes et caractéristiques distinctives **maintenues** |
| Portrait du joueur | V2 **conservé** ; détails à revoir lors d’une future passe artistique |
| Pré-génération des personnages | **Priorité technique suivante** |
| Suppression du V1 (`?qa=1&figure=v1`) | **Attendre** la fin des comparaisons et la réception du lot |

## Direction du responsable

1. **Environnements de combat variés.** « Nous aurons divers environnements de combat de cartes (dans la rue, dans une
   salle de jeu de cartes, dans un bar, dans une arène), donc on doit avoir des décors variés et adaptés à la situation. »
2. **Duellistes PNJ de la ville.** « Nous aurons aussi des combats basiques contre des PNJ de la ville : des designs
   génériques avec quelques petits changements subtils pour montrer les différences, comme dans Pokémon, où les
   dresseurs PNJ basiques sont souvent des sprites réutilisés et légèrement modifiés (couleur des vêtements, des cheveux,
   de la peau) mais qui conservent la même structure de base. »

## Ce qui reste acquis

- Règles, moteur pur (`src/game`) et secrets : inchangés.
- Composition du duel (ADR 013, 016, 018) : vue A frontale permanente, HUD, plateau symétrique, tour guidé, présence du
  visage du rival (≈ 83 px yeux → menton à 1280×720). **Un changement de décor ne déplace ni le plateau, ni les HUD, ni le
  cadrage du rival**, et la lisibilité des textes reste ≥ 4,5:1 dans chaque lieu.
- Mise en scène HD-2D (ADR 019) et son repli automatique du post-traitement ; écrans hors duel (ADR 020).
- Personnages V2 (ADR 021) : un seul modèle par personnage pour le duel et ses portraits ; les quatre rivaux gardent leur
  identité de personnages signatures, que les PNJ ne doivent pas égaler en singularité.
- Art par code, Three.js + TypeScript, aucune image ni police externe au runtime.

## Lots

| Lot | Objet | Critères d’acceptation |
|---|---|---|
| **C1** (**livré**, passe 28, ADR 021 amendement 4 : première image 115,6 → 7,2 ms sur la 780M, 145,8 → 7,6 ms sur la RTX 4060) | **Pré-génération des personnages** : couches V2 des rivaux (et, plus tard, des PNJ) générées aux temps morts, avant leur apparition, pour supprimer l’à-coup d’apparition d’un rival | première image après l’apparition d’un rival mesurée avant / après sur la Radeon 780M et la RTX 4060 ; aucune génération pendant une commande du duel ; rendu identique au pixel près ; mémoire et textures stables (`qa:rc` J) |
| **C2** | **Environnements de combat** : un système de lieux déclaratif (géométrie du décor, plan de feux, palette, ambiance) ; quatre lieux : rue, salle de jeu de cartes, bar, arène ; chaque rencontre déclare son lieu | porte de validation : architecture et **un nouveau lieu** montrés au responsable avant les autres ; plateau, HUD et cadrage du rival identiques au pixel près d’un lieu à l’autre (hors décor) ; contraste ≥ 4,5:1 dans chaque lieu ; coût GPU par lieu mesuré sur les deux GPU ; repli du post-traitement opérant partout |
| **C3** | **Duellistes PNJ génériques** : quelques gabarits de base sur le socle V2 (silhouette, coiffure, tenue) et des variations subtiles déterministes par graine (peau, couleur et coupe de cheveux, couleurs des vêtements, accessoire) ; même modèle pour le duel et le portrait ; profils de jeu génériques ; rencontres PNJ de prototype rattachées à un lieu | planche de 8 à 12 PNJ distincts mais visiblement de la même famille, et nettement moins singuliers que les quatre rivaux ; déterminisme testé ; QA sans régression ; 0 fuite de secret ; coût de génération mesuré (et couvert par C1) |
| **C4** | **Réception de M07** et arbitrages restants : revue des captures L3, L4 et L5 par le responsable, retrait du V1 sur sa décision, 12 arbitrages du 17 octobre | décisions consignées (journal, ADR) |

**État de C2 (2026-10-18, passe 29, ADR 022)** : cadrage validé par le responsable (« salle actuelle = salle de jeu de
cartes, porte = la rue (le Quai, la nuit), même table partout pour la porte, Duel libre — Kaï dans la rue ») ; porte de
validation livrée et mesurée (système de lieux, salle migrée au pixel près, rue) ; **bar et arène après son retour** sur
les captures `screenshots/qa/m08/c2/`.

**Ordre :** C1 puis C3 touchent le pipeline des personnages (`src/scene/figureV2.ts`, `src/scene/v2/`, `rival.ts`,
`portrait.ts`, pré-génération du shell) : ils se suivent dans le même chantier. C2 touche le décor (`src/scene/arena.ts` et
ce qui en sera extrait) et peut avancer en parallèle. **Point de raccord :** C2 ajoute le lieu aux rencontres
(`src/product/encounters.ts`) ; C3 rattache ses rencontres PNJ à un lieu une fois C2 intégré à `main`.

**Hors périmètre :** la ville et l’exploration RPG (la « suite »), le mobile, les sprites dessinés à la main.

## Procédure

Pour chaque lot : captures avant / après sur GPU réel (1280×720 et 1920×1080), `npm run typecheck`, `npm test`,
`npm run build`, QA navigateur (`qa:browser`, `qa:product`, `qa:rc`) sans régression, journal, ADR pour toute décision
structurante, commit et push sur `main`. Les captures sont montrées au responsable à la fin de chaque lot ; ses retours
priment sur ce document.
