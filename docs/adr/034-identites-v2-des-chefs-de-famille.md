# ADR 034 — Identités « vectoriel V2 » des quatre chefs de famille (M10-C)

**Date :** 2026-10-20 (lot M10-C, étape 1). **Statut : APPROUVÉ** par le responsable le 2026-10-20 sur la planche (fiche
du lot M10-C, C1 : « Validées », sans retouche), comme les quatre rivaux (ADR 021) et les gabarits PNJ (ADR 023). Complète l'ADR 021 (socle V2) et l'ADR 032 (mode Aventure) ;
ne change ni les règles (V3.0 + delta V3.2, avenant M10-A), ni le cadrage (ADR 013), ni les secrets (ADR 011).

## Contexte

Les chefs des quatre familles (Bran, Mère Aubépine, Ilse, Halvard) portaient une apparence PROVISOIRE : un gabarit PNJ
(ADR 023) à graine choisie. Le lot M10-C (feuille de route, « La maison ») leur donne une identité propre : ce sont les
figures les plus marquées de leur famille, au-dessus des bras droits (les rivaux signatures). Pas d'image générée : le
socle V2 dessine tout par code, comme les rivaux.

## Décision

1. **Quatre kits V2 à part** (`src/scene/v2/chefs.ts`, `CHEF_KITS`), mêmes couches et mêmes humeurs que les rivaux
   (tête, plan arrière, buste, yeux, paupières, sourcils, bouche, plan avant), même espace H, aides partagées (visage,
   oreilles, cou, modelé de l'âge, barbes texturées). Identifiants `chef-cendre`, `chef-ronce`, `chef-voile`,
   `chef-astre`, servis par `kitV2` après les rivaux.
   - **Bran, le Premier Feu (Cendre)** : visage carré, crâne rasé, couronne grise ras, brûlure ancienne à la tempe,
     barbe carrée gris de fer où restent des braises, moustache épaisse ; col haut riveté doublé de rouge, manteau
     brûlé, tablier de cuir, médaillon de fer à l'emblème.
   - **Mère Aubépine, la Gardienne du Fanal (Ronce)** : visage rond et doux, rides marquées, cheveux blancs en couronne
     tressée piquée de fleurs et de baies d'aubépine ; châle vert croisé, broche d'épine d'argent.
   - **Ilse, la Dame aux Voiles (Voile)** : visage ovale fin, cheveux noirs à mèche blanche, voile de dentelle indigo à
     festons et yeux brodés, fronteau d'argent à goutte de lune ; robe à col haut, pendentif miroir.
   - **Halvard, le Cartographe (Astre)** : visage long et creusé, front haut, longs cheveux blancs, bouc et moustache,
     monocle d'or à chaînette ; manteau marine à rose des vents, étui à cartes en bandoulière.
2. **Personnalités à part** (`CHEF_PERSONALITIES`, `src/presentation/personalities.ts`) : hors de `PERSONALITIES`, donc
   jamais tirées par le jeu standard (rencontres, `personalityFor`) ; `personalityById` les trouve ; type `ChefId` dans
   `OpponentId`. Profil de jeu `lecteur` ; le deck réel du chef reste celui des paliers de l'aventure (`paliers.ts`).
3. **Figures de l'aventure** (`src/aventure/modele.ts`) : `apparence` des chefs = leur identifiant V2.
4. **Silhouettes de la ville** (`walkerLook`, `src/ville/sprites.ts`) : tons par code des quatre chefs, et de Maëlle
   (rival `ronce`, qui n'en avait pas), pour leur présence dans les îlots de l'aventure.

## Preuves (étape 1)

- Planche `tools/m10c-chefs.mjs` (buste, portrait du HUD, trois humeurs imposées, vue A complète, gros plans), sur GPU
  réel (Radeon 780M) et en rendu logiciel.
- **Déterminisme** : couches générées deux fois dans deux pages neuves. En rendu logiciel (SwiftShader, le régime de la
  planche C3), les 4 × 24 couches sont identiques. Sur la 780M, la tête de Bran (la couche la plus chargée : ≈ 450 traits
  de barbe) diffère d'**un pixel sur 319 488, d'un cran sur 255** : arrondi du tramage des canvas par le GPU, pas une
  dérive du dessin (l'outil le mesure et le classe ; au-delà de 2 crans ou de 0,01 % des pixels, c'est un problème).
- **Coût de génération** (`__lqvFigureCost`, médiane de 9) sur la 780M : 45 à 62 ms par chef, 24 textures, 1,85 M
  texels, du même ordre que les rivaux (47 ms, L5).
- **Jeu par défaut identique au pixel près** (`tools/l5-identique.mjs`, GPU réel) contre le `main` de départ `72c2eeb`.

## Conséquences

- Les chefs s'affichent dans les duels, les portraits, les fiches de défi et la ville de l'aventure ; rien ne change
  dans le mode Duel standard, la démo ou le jeu par défaut.
- Si le responsable demande des retouches, elles se font dans `chefs.ts` sans toucher au socle.

## Ratification (2026-10-20)

Fiche d'arbitrages du lot M10-C (<https://claude.ai/artifact/VzdgB2W2wmUw1Bp9MNE5ux>), entrée C1 : « Validées », sans
note. Les quatre identités sont figées telles que sur la planche `screenshots/qa/m10c/chefs/planche-chefs-1280.png`.
