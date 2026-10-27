# ADR 044 — Une illustration et une lecture d'effet par carte

**Date :** 2026-10-27. **Statut : PROPOSÉ.** Contrat : `docs/m12/01_CONCEPTION_DES_CARTES.md`.

## Contexte
Les 36 cartes standard partagent le dessin de leur famille ; une variante ne se distingue d'une Basic que par une ligne
de texte ; rien ne dit quand un effet joue ; la rareté ne se voit que pour les Signatures (audit M12).

## Décision
1. Un motif propre à chaque variante et à chaque Signature (`src/art/cardMotifs.ts`), tracé par code sur le fond et le
   motif de la famille ; les Basics gardent l'emblème de la famille. Préparé hors du fil principal, comme avant.
2. Sur la face : une pastille de déclenchement (icône SVG par code, cinq déclenchements et la Signature), le nom entier,
   un cadre par rareté. Les résumés d'une ligne (`cardText.ts`, données pures) dans l'inspecteur, les grandes cartes et
   les mises en avant ; le texte canonique reste celui du catalogue.
3. Un sceau par Technique. L'ancien dessin reste disponible avec `?cartes=v1`.

## Conséquences
Aucune règle ni donnée du catalogue changée ; le rendu des cartes change partout (duel, collection, aventure) : la
garantie de rendu identique au pixel près ne vaut plus pour les cartes, remplacée par les planches avant / après.
