# ADR 039 — Tempéraments des PNJ par chapitre

**Date :** 2026-10-26. **Statut : PROPOSÉ.** Contrat : `docs/m11/03_PROGRESSION_DES_PNJ.md`.

## Contexte
« Tout le monde progresse avec le joueur » (décision 3 du responsable), par les mécanismes existants (paliers, decks,
profils d'IA, chapitres), sans toucher aux valeurs de l'annexe de calibrage validée.

## Décision
1. Un module pur `src/aventure/temperaments.ts` : six tempéraments, chacun lié à un profil d'IA (existant ou de niveau
   2, ADR 041) et à un ton de répliques ; une trajectoire par chapitre pour chaque PNJ récurrent ; un cran de plus après
   deux défaites contre le joueur.
2. Appliqué **au jeu** aux PNJ facultatifs récurrents (duels de rue, membres) ; au chapitre I, ils jouent le profil de
   l'annexe (`novice`). Les figures structurantes et Kaï gardent le profil de l'annexe ; leurs répliques suivent un
   tempérament. L'extension au jeu des figures et de Kaï est une proposition de la fiche (constante désactivée).
3. Les decks et les PV restent ceux des paliers (annexe) ; seule l'IA et la parole changent.

## Conséquences
Les duels facultatifs des chapitres II à V deviennent plus durs que le profil `novice` de l'annexe (mesuré, fiche) ; la
voie principale (figures) ne change pas.
