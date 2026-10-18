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
| **L4** | Écrans hors duel qualitatifs et dynamiques | à cadrer après L2–L3 |

## Procédure

Pour chaque lot : captures avant / après sur GPU réel (1280×720 et 1920×1080), `npm run typecheck`, `npm test`,
`npm run build`, QA navigateur, journal, ADR pour toute décision structurante, commit et push sur `main`. Les captures
sont montrées au responsable à la fin de chaque lot ; ses retours priment sur ce document.
