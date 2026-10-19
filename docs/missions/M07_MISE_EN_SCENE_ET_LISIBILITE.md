# M07 — Mise en scène du duel et lisibilité au premier coup d’œil

**Décision du responsable — 17 octobre 2026**, en séance, après le bilan visuel de la passe 15 (référence
`reference/REFERENCE_VISUELLE_VALIDEE_M03.jpg` comparée au runtime : composition atteinte, finition artistique en deçà).
Ce mandat **amende l’ADR 013** (baseline desktop) sur la représentation du rival, du plateau et de la scène. Il ne change
**aucune règle** du duel (V3.0 + delta V3.2) ni la confidentialité des secrets.

## Direction du responsable

1. **Rival.** « Tu peux retirer les mains pour le moment, car elles sont mal intégrées et pas belles visuellement ; voir
   les cartes suffit. On veut surtout le haut du corps, avec surtout le visage de l’adversaire. »
2. **Cartes posées et plateau.** Il faut les améliorer : les cartes ne sont pas similaires pour le joueur et
   l’adversaire, et la **symétrie** manque, alors qu’elle est importante dans le design. **Maximiser la lisibilité en un
   coup d’œil.** Le jeu doit être **très intuitif** : on ne doit surtout pas se perdre dans les actions à faire pendant les
   phases du tour.
3. **Décor, lumière, ambiance.** Le jeu est en HD-2D : il doit être bien conçu et orchestré, « comme une véritable mise en
   scène visuelle, comme une pièce de théâtre ». Ne pas se focaliser sur les petits éléments (bougies, etc.), mais sur la
   **scène générale** : les cartes, la table, les joueurs, le décor et les lumières qui les entourent. C’est essentiel.
4. **Écrans hors duel** (rencontres, deck, collection…) : plus tard, mais leur visuel devra être qualitatif et dynamique ;
   on doit apprécier d’y naviguer.
5. **Référence d’ergonomie : Yu-Gi-Oh! Duel Links** (captures fournies en séance) : peu de texte, tout se comprend à
   l’image. **Le rival reste de face et visible** : « perso je veux garder notre adversaire visible comme c'est le cas
   actuel car cela donne un aspect intéressant à notre jeu ». Pas de mise en page avec portraits dans les coins (ADR 018).

## Ce qui reste acquis

- Vue A frontale permanente, vue B à la demande (ADR 016) ; HUD rival haut-gauche, HUD joueur bas-gauche, bulle
  haut-droite, commandes à droite, main en bas (ADR 013).
- Présence du rival : le visage ne doit pas rapetisser (repère ADR 013 : ≈ 83 px yeux → menton à 1280×720).
- Six chorégraphies du Clash, défausse des deux Primaires, séquence de résolution (ADR 008, 010).
- Secrets : une carte cachée du rival ne montre que son dos ; la symétrie ne publie rien de plus (ADR 011).
- Art par code, Three.js + TypeScript, aucune image ni police externe.

## Lots

| Lot | Objet | Critères d’acceptation |
|---|---|---|
| **L1** | Rival en buste, **sans mains** ; l’éventail de dos de cartes reste (taille publique de la main) | mains absentes dans toutes les vues ; visage inchangé ; aucune erreur console ; `qa:browser` sans régression |
| **L2** | **Plateau symétrique et lisible, tour guidé** : mêmes cadres, mêmes tailles et mêmes positions en miroir pour les deux camps ; même dos pour une carte cachée, même face pour une carte révélée ; cartes posées nettement plus grandes ; états (chargement, réserve, active, cachée, verrouillée) lisibles d’un coup d’œil (pictogrammes, Rang et Puissance en gros) ; une seule consigne « à faire maintenant » par phase, cibles légales signalées, action principale toujours au même endroit | tailles et contrastes mesurés sur capture (≥ 4,5:1) ; parcours QA (`qa:browser`, `qa:product`) sans régression ; 0 fuite de secret ; captures avant / après 1280×720 et 1920×1080 |
| **L3** | **Mise en scène HD-2D** : éclairage de scène (lumière principale sur la table, contre-jour sur le rival, découpe et vignettage), profondeur des plans du décor, étalonnage des couleurs, table traitée comme une scène ; post-traitement (halo, profondeur de champ) seulement si le budget le permet | captures avant / après ; mesure avant / après sur la Radeon 780M (adaptateur par défaut) et la RTX 4060 ; lisibilité des textes préservée (≥ 4,5:1) |
| **L4** | Écrans hors duel qualitatifs et dynamiques | **cadré et validé le 2026-10-18** (ADR 020) : la scène reste le décor avec un plan de feux par écran (une image 3D par changement d’écran), l’image avant le texte (−50 % de mots visibles sur rencontres, préparation, résultat), entrées animées en `transform` / `opacity` seulement, coupées en mouvement réduit ; contraste ≥ 4,5:1, clavier seul, `qa:product` / `qa:rc` / `qa:browser` sans régression, duel inchangé au pixel près, mesures sur les deux GPU |
| **L5** | **Refonte qualitative des personnages et de leurs portraits** (décision du responsable du 2026-10-18) : maintenant que le rival est grand, frontal et bien éclairé, ce sont les personnages qui limitent la qualité perçue. Créer une **vraie identité graphique pour chaque adversaire**, pas seulement des visages moins ronds. **Porte de validation sur une seule rivale, Maëlle (Ronce)** : visage mieux structuré, cheveux et capuche travaillés, expressions de prudence et de surprise plus naturelles ; « vectoriel V2 » tracé en code (courbes de Bézier écrites à la main, ombrage en aplats d’illustration, proportions plus anguleuses), toujours en Art by Code. Le personnage du duel et son portrait de rencontre proviennent du **même modèle artistique**. Kaï, Sélène et Orin seulement après validation. Les images de référence évoquées en séance n’expriment qu’une intention : rien n’en est copié. Pas d’option « sprites illustrés » (elle exigerait d’amender la règle « aucune image externe au runtime » et des illustrations fournies par le responsable) | V2 derrière un interrupteur opt-in (`?qa=1&figure=v2`) : **rendu par défaut identique au pixel près** ; même architecture en couches animées (yeux, paupières, sourcils, bouche, rougeur), buste sans mains (ADR 017), cadrage inchangé (≈ 83 px des yeux au menton à 1280×720, 125 px à 1920×1080) ; planche comparative « actuelle contre V2 » à l’échelle 1:1 (6 humeurs, vue A sous l’éclairage HD-2D, affiche de rencontre, réaction animée en vidéo) ; mesure GPU avant / après sur la Radeon 780M et la RTX 4060 (`perf-compare`) et coût de génération des textures ; contraste ≥ 4,5:1 préservé ; `typecheck`, `test`, `build`, QA navigateur ; **décision du responsable avant de généraliser**. **Porte validée le 2026-10-18** (« Je valide la direction V2 de Maëlle : généralise-la à Kaï, Sélène et Orin sur le même modèle ») ; **généralisation livrée** (passe 24, amendement 1 de l’ADR 021) : socle commun et une identité par rival ; **passe de finition** (ombre du visage adoucie, cheveux à mèches et reflets, yeux lisibles en prudence à 83 px) puis **V2 rendu par défaut** (passe 25, amendement 2 ; `?qa=1&figure=v1` pour comparer) ; **portrait du joueur** (HUD bas-gauche) passé au même modèle V2, même apparence (passe 26, amendement 3) |

## Procédure

Pour chaque lot : captures avant / après sur GPU réel (1280×720 et 1920×1080), `npm run typecheck`, `npm test`,
`npm run build`, QA navigateur, journal, ADR pour toute décision structurante, commit et push sur `main`. Les captures
sont montrées au responsable à la fin de chaque lot ; ses retours priment sur ce document.

## Réception — 2026-10-19

Le responsable a **reçu L1 à L5** sur la fiche d’arbitrages du 2026-10-19 (artefact privé du responsable, choix enregistrés et relus par la session principale), à partir des captures de l’état de `main` (duel dans la salle et la
rue, écrans hors duel, écran Rencontres avec les personnages V2), sans retour. Il a décidé le **retrait de l’ancien rendu
V1** des personnages (`?qa=1&figure=v1`) dans la release candidate 0.8. **M07 est clos.**
