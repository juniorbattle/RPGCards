# Les Quatre Voies V3.0 — Rapport de vérification croisée

**Date :** 15 octobre 2026  
**Référence normative :** `LES_QUATRE_VOIES_CONTRAT_DEFINITIF_V3_0.md`.

## Ce qui a été réellement testé

1. **24 scénarios déterministes** documentés dans `qa_scenarios.json` et implémentés dans `validate_duel.py`, notamment Assaut/Assaut, Assaut/Garde, égalité kamikaze, ultimes additifs, quatre Signatures, Interférences réciproques, Silence, Ferveur, Braise, Étincelle, Contrecoup, Écaille, Ténacité, Prisme, Convergence, Relance et Cycle astral.
2. **31 024 configurations de Clash** dans `audit_properties.py` : 1 024 combinaisons exhaustives de familles/rangs/modes ordinaires et 30 000 configurations aléatoires de Primaires/Secondaires/Interférences/Signatures, à graine fixe. Invariants contrôlés : dégâts non négatifs, absence de multiplicateurs incohérents, gain et réserve Insight bornés, destinations uniques, un Repoussement maximum, absence de boucle de résolution.
3. **5 familles de tests de Techniques** dans `validate_techniques.py` : coûts, fenêtres, impossibilité de double utilisation, impossible d'emprunter un Insight futur, deux emplacements de Techniques, impossibilité de révoquer rétroactivement une information déjà vue.

**Tous ces tests ont terminé sans échec** à la date indiquée. Le code et les résultats sont joints au kit ZIP ; une exécution peut les reproduire. Les simulations de rythme précédentes V2.2 utilisaient une politique probabiliste Basic. Elles ne sont **pas** une validation statistique du deck V3 complet.

## Résultats de calcul contrôlés

| Scénario | Résultat correct |
|---|---|
| Assaut IV P12 vs Garde III P9, priorité Assaut | 3 PV |
| Assaut IV ×4+×3 vs Assaut inférieur | 84 PV |
| Assaut IV ×4+×3 vs Garde III | 21 PV si Assaut prioritaire |
| Assauts IV égaux, ×7 contre ×1 | 84 PV et 12 PV, infligés simultanément |
| Signature Cendre P14, ×5+×4, contre Garde IV P12 | 18 PV |
| Signature P12 vs Garde IV P12 | 0 PV ; la Signature conserve la priorité |
| Signatures Cendre P14 vs Voile P12, A/A | 14 et 12 PV échangés |
| Interférences valides réciproques | Annulation des deux usages, gains Basic d'Insight applicables des deux côtés |
| Cendre IV Contrecoup perd et les deux joueurs descendent à 0 | Prolongation à 1 PV chacun |
| Astre IV Convergence, soutien hors famille | Coefficient individuel ×6, ajoutable aux autres coefficients |
| Silence vs effet de Signature encore en attente | Effet en attente annulé, priorité ∞ inchangée |

## Limites et points de contrôle d'intégration

Le moteur de vérification teste la **résolution isolée** des Clashes et les contraintes de Techniques ; ce **n'est pas** un jeu complet qui simule la gestion multi-tours de la pioche, les remplacements de cartes en interface, les profils humains, la lecture d'informations déjà vues et la collection RPG. Il ne prouve **pas** une absence générale de bugs ni un équilibre compétitif universel.

Les raccordements suivants sont figés par le texte du contrat mais demandent encore des tests E2E dans la future implémentation : gestion de la main à plus de 4 cartes, masquage atomique de Dissimulation lors de révélations simultanées, cible de Repoussement avec cartes cachées récemment posées, actualisation du sommet de pioche, rotation du deck, plusieurs tours de mort subite, choix des deux Techniques et lecture simultanée Lecture/Lecture. Les futurs duels réels devront vérifier le rythme et les taux de victoires par stratégie.

**Conclusion :** le règlement V3 possède une base arithmétique et temporelle testable, avec un premier catalogue de 16 variantes, 4 Signatures et 6 Techniques. Les tests couvrent des combinaisons représentatives ; la validation du ressenti ludique restera un travail normal de peaufinage, non une condition pour comprendre ou implémenter les règles de base.
