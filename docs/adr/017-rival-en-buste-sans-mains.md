# ADR 017 — Rival en buste, sans mains (M07, lot 1)

Date : 2026-10-17
Statut : **APPROUVÉ par le responsable** (demande en séance du 2026-10-17, `docs/missions/M07_MISE_EN_SCENE_ET_LISIBILITE.md`).
**Amende l’ADR 013** (baseline desktop) et l’ADR 007 (rival procédural). **Amendé le 2026-10-18** : éventail planté dans un support posé sur la table (section finale).

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

## Amendement du 2026-10-18 — support de l’éventail (M08)

Statut : **demande du responsable** en séance (2026-10-18, pendant le lot C3) : « ajouter un support pour les cartes de
l’adversaire ». Constat : depuis le lot 1, l’éventail flottait derrière le bord de la table, son pied caché par le
plateau, et reculait ou avançait avec le buste (gestes « recul » et « se pencher »).

### Décision

- **Support posé sur la table** (`src/scene/rival.ts`, `cardStand`) : socle de bois galbé dont la face avant suit l’arc
  de l’éventail (forme tracée en courbes de Bézier, extrudée, arêtes arrondies par un biseau), bois veiné tracé en code
  (graine d’art), filet de laiton courbe sur le bord avant, rainure sombre où les cartes sont plantées. Aucune image
  externe ; même auto-éclairage que les plans du rival.
- **L’éventail et le support restent posés** : le rig sépare le corps (`actor` : recul, se pencher) de ce qui est sur la
  table (support, éventail, carte posée). Le geste « pose une carte » incline toujours l’éventail depuis son pied.
- Aucune règle, aucun secret : l’éventail montre toujours la seule taille publique de la main.

### Conséquences

- Captures avant / après : `screenshots/qa/m08/support/` (Kaï, Maëlle, une marchande ; 1280 et 1920 ; planche).
- **Seule la zone du support change** (vue A complète, même parcours, avant / après) : 2 460 pixels dans une boîte de
  136 × 23 px à 1280×720 (Kaï comme la marchande), 5 304 pixels dans 202 × 34 px à 1920×1080 (Maëlle) ; le reste de
  l’image (visage, buste, éventail visible, décor, HUD) est identique au pixel près. Le support suit le rival (même rig) :
  il apparaît aussi pour les PNJ et entre dans la pré-génération (sa texture est envoyée avec les autres).
