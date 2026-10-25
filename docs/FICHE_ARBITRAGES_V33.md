# Fiches d'arbitrages du chantier des règles V3.3 — décisions du responsable

Deux fiches interactives privées, remplies par le responsable le 2026-10-25 (choix entre 05:03 et 05:06 UTC, aucune note),
relues dans leur collection `decisions` par la session principale. **Les 14 choix suivent l'option recommandée.**

## Fiche de la règle de la Garde (avenant 07) — <https://claude.ai/artifact/5tm8aNVPVKzg9NYFr3m5Xs>

| Entrée | Objet | Choix du responsable |
|---|---|---|
| R1 | La Garde réduit sans annuler (avenant 07, passe 107) | **Reçue** |
| E1 | Des duels nettement plus courts (Duel standard 12,6 → 10,2 tours ; aventure −15 à −23 %) | **Garder** |
| E2 | Kaï en Duel standard : 73 % → 61 % de victoires du joueur | **Garder** (pas de recalibrage des rivaux ni des PNJ) |
| E3 | Aventure, voie directe : chefs et Championnat un peu plus durs | **Garder l'annexe telle quelle** (`docs/m10/CALIBRAGE_M10A.md` inchangée) |
| T1 | Le simulateur de référence V3.2 garde l'ancienne formule | **Laisser tel quel** (trace historique ; le moteur et ses tests font foi) |
| T2 | Le cas « victoire au Rang, 0 blessure » n'a plus de cas | **Garder comme invariant** testé |
| S1 | Prochaine tâche | **Lancer M10-F** (RC de l'aventure) |

## Fiche de l'avenant 08 et de son amendement 1 — <https://claude.ai/artifact/CBP1sg6GMTABwg7FyatS7r>

| Entrée | Objet | Choix du responsable |
|---|---|---|
| R1 | L'annonce des Signatures (avenant 08, passe 111) | **Reçue** |
| R2 | La révision après une Signature annoncée (amendement 1, passe 114) | **Reçue** |
| E1 | Voie directe : chefs et Championnat repassent sous 50 % | **Pas de recalibrage ; trancher avec E3 de la fiche de la Garde**, tranché « garder l'annexe telle quelle » : aucun recalibrage |
| E2 | Duel standard : peu d'effet | **Aucun recalibrage** |
| E3 | Le rival révise presque toujours (≈ 90 % des fenêtres) | **Garder ce comportement** |
| T1 | Le pilote de QA ne gagne plus la série du Tournoi du Quai (`qa:product` E) | **Pilote moins naïf, côté outil de QA seulement** (`tools/duel-driver.mjs` : garder sa Signature pour le moment où elle compte) ; le jeu ne change pas |
| S1 | Clore le chantier des règles V3.3 | **Clore après consignation des deux fiches** |

## Lecture

- Le chantier des règles V3.3 est **clos** (passe 118) : avenants 07 et 08 et amendement 1 **reçus**, sans recalibrage ;
  étiquette des règles `V3.0+delta-V3.3.2`.
- **Reste une action, sans effet sur le jeu :** T1 de la fiche de l'avenant 08, un pilote de QA moins naïf pour que le
  parcours E de `qa:product` repasse. Il est rattaché au lot **M10-F** (la RC de l'aventure rejoue `qa:product`), à faire
  en premier.
- **Suite : M10-F** (S1 de la fiche de la Garde), lancé sur ordre du responsable.
