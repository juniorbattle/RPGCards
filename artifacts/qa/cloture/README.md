# Lot de correction de clôture — preuves (passes 224 et suivantes)

Source : fiche de clôture (`docs/FICHE_ARBITRAGES_CLOTURE.md`) et audit de fin de projet (`docs/AUDIT_FIN_DE_PROJET_2026-11-11.md`).

## Étape 1 — règles et moteur (passe 224)

Empreintes du Duel standard : corpus de `tools/m10a-empreintes.ts` (240 duels IA contre IA, quatre Signatures, variantes
toutes / aucune / quelques-unes en A, paires de Techniques, six profils historiques ; plus l'enregistrement de la RC s'il
existe), état complet et journal public et privé.

| Fichier | Moteur | Étiquette | Résultat contre `empreintes-avant.json` |
|---|---|---|---|
| `empreintes-avant.json` | `d72e97b` (avant le lot) | `V3.0+delta-V3.3.2` | référence |
| `empreintes-apres-regles.json` | corrections de l'étape 1 | `V3.0+delta-V3.3.2` (remise le temps de la mesure) | **241 identiques** |
| `empreintes-apres-v34.json` | corrections de l'étape 1 | `V3.0+delta-V3.4` | 241 écarts, **tous dus à l'étiquette seule** (champ `rules` de l'état haché) |

Lecture : aucune des corrections (Contre-jour, A1, raison de l'Interférence masquée, Escarbille et Sève sur un instantané)
ne touche ce corpus : il ne joue que des variantes A et des Basics (pas de Contre-jour, de Bouture, d'Écaille sous coup
mortel, de Leurre, d'Escarbille ni de Sève). Elles changent seulement les duels où ces cas se présentent (variantes B et C :
aventure, éditeur du Duel standard). Le nouveau numéro d'étiquette (`RULES_LABEL`, une seule constante) et le nouveau
catalogue (`catalogue-V3.0+48v+4s+6t`) font recommencer au tour 1 un duel sauvegardé en cours, comme à chaque avenant
(mécanisme existant : « Règles différentes » au Duel standard, « Version des règles ou du catalogue différente » dans
l'aventure).

Commandes : `npx tsx tools/m10a-empreintes.ts <sortie.json> [référence.json]` ; simulation `npm run sim` (200 duels :
8,68 tours en moyenne, 20 prolongations, aucune erreur).
