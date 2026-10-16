# ADR 004 — Interprétations de raccordement, écarts au simulateur, points à arbitrer
Date : 2026-10-16
Statut : proposé — **aucune règle canonique modifiée** ; interprétations marquées, testées, à confirmer.

Base : règlement V3.0 + avenant mandaté V3.2 (D-01 affinité de Rang +1 ; D-02 à D-06).

| ID | Situation | Interprétation implémentée | Fondement / test | Arbitrage demandé ? |
|---|---|---|---|---|
| ARB-001 | Sondage (p1) et Recentrage (p2) simultanés en début de tour | Sondage observe un **instantané** de la main adverse pris après régulation et avant Recentrage | principe d’instantané §7.3/§10.3 ; `engine.ts applyStart` | Oui (confirmation) |
| ARB-002 | Visibilité de la Signature et des Techniques équipées du rival | Traitées comme **publiques** (profil du duelliste affiché) ; l’Insight l’est par §13.2 | §13.2 ne les classe ni public ni secret | **Oui** |
| ARB-003 | Emprise (Ronce ∞) + Rupture déclarée, Garde gagnante | **Un seul** Repoussement : Emprise (choix du joueur) ; Rupture « sans objet », coût non remboursé | §12.3 « Rupture n’autorise pas deux Repoussements », §16.2-16 ; **écart corrigé du simulateur V3.2** qui pouvait produire deux Repoussements | Oui (confirmation) |
| ARB-004 | Dissimulation : famille de la carte masquée | Masque identité complète (famille incluse) pour l’adversaire ; si l’identité était **déjà publique avant ce tour**, elle reste affichée (information non « désapprise ») | §11.3 vs §13.2 (famille visible « sauf carte conçue pour masquer davantage ») | **Oui** |
| ARB-005 | Carte masquée consommée pendant le tour | Son identité n’est pas publiée dans l’événement de consommation ; elle devient visible en défausse publique à la fin du tour | §13.2 « jusqu’à la fin du tour » | Oui |
| ARB-006 | Détour : moment de l’observation | Après résolution des dommages, avant le Repoussement | §11.3 « après résolution du Clash » | Non (mineur) |
| ARB-007 | Clairvoyance voilée : « plus ancienne Secondaire cachée » | Inclut une Secondaire en CHARGEMENT ; égalité → case gauche | §8.2 | Non |
| ARB-008 | K.-O. unilatéral et Repoussement gagné | Fin immédiate ; le Repoussement est sans objet | §10.3 étape 7 ; résultat identique | Non |
| ARB-009 | Repoussement facultatif | Le gagnant peut renoncer (« peut renvoyer ») | §6.4 | Non |
| ARB-010 | Secondaire en chargement repoussée par une Garde victorieuse | Admissible (cible « face cachée, chargement ou réserve ») | §4.2, §6.4 ; test G03 | Non |
| ARB-011 | Silence sur Emprise / Entrave | Effet de Signature/Primaire neutralisé ; le Repoussement **Basic** de la Garde gagnante reste disponible | §8.3, §10.2 ; conforme au simulateur | Oui (confirmation) |

**Delta mandaté (rappel).** D-01 est implémenté (`rankSupport`), testé (G05, G06, G07, G08) et signalé dans le README ; le texte historique V3.0 §6.1/§7.1 n’est pas modifié.

**Écarts constatés au simulateur de référence V3.2** : ARB-003 (double Repoussement possible). Aucun autre écart observé sur les scénarios portés ; le simulateur reste un oracle, pas une source normative.
