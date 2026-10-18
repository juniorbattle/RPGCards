# ADR 017 — Rival en buste, sans mains (M07, lot 1)

Date : 2026-10-17
Statut : **APPROUVÉ par le responsable** (demande en séance du 2026-10-17, `docs/missions/M07_MISE_EN_SCENE_ET_LISIBILITE.md`).
**Amende l’ADR 013** (baseline desktop) et l’ADR 007 (rival procédural).

## Contexte

Depuis M03.2, le rival tenait son éventail de cartes avec deux mains peintes : un même plan Canvas (manche, revers, dos
de la main, doigts repliés, pouce), dont l’une en miroir. À l’écran, ces mains faisaient environ 40 px à 1280×720 et se
lisaient comme deux taches de peau au bord de la table. Le responsable les juge mal intégrées et peu belles. Il veut le
haut du corps et surtout le visage ; voir les cartes suffit.

## Décision

- Les deux plans de mains et leur texture (`handTexture`) sont supprimés.
- L’éventail de dos de cartes reste : il donne la **taille publique** de la main du rival. Son pied descend de 0,10
  sous le bord de la table, que la table cache : les cartes semblent tenues derrière ce bord.
- Le geste « pose une carte » ne déplace plus de main : l’éventail s’incline vers la table pendant que la carte apparaît
  sur le plateau. Le léger mouvement de repos passe de la main gauche à l’éventail.
- Inchangés : tête, visage, expressions, capuche, buste, proportions et cadrage (visage ≈ 83 px yeux → menton à 1280×720).

## Conséquences

- Une texture et deux plans de moins par rival : l’arène compte une texture GPU de moins pendant un duel.
- Les planches d’expressions et captures antérieures montrent encore les mains ; elles restent valables comme historique.
- Une figure plus complète (bras, mains réellement intégrés à la pose) pourra revenir avec la direction artistique des
  personnages, sur nouvelle décision.

**Cette décision n’introduit aucune règle métier nouvelle.**
