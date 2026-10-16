# Plan de développement — Tranches verticales et portes de validation

Le projet entier est un RPG ; le mandat 01 se concentre sur le noyau jouable. Chaque lot a son propre test et **gate** ; aucune implémentation massive hors-scope ou rendu spectaculaire servant à masquer un moteur incomplet.

| Lot | Produit attendu | Conditions de sortie |
|---|---|---|
| **0 — Reconnaissance** | audit de sources V3 + delta, inventaire prototype, architecture proposée, risques, repo TS/Vite vierge | ADR initiaux, journal, scripts npm réalistes, zéro conflit silencieux |
| **1 — Duel canonique** | moteur TS pur : deck, phases, Secret/Public, stats/effets, IA baseline, replay déterministe | tests 100% sur matrice QA prioritaire, invariants, 10+ seed E2E non-UI |
| **2 — Plateau jouable** | cartes direct-manipulation, action sur Secondaires, HUD PV/Insight, journal fiable, IA, plein cycle | navigation clic+drag+clavier et mobile ; captures réelles ; pas de fuite des secrets |
| **3 — Art procédural v1** | générateurs cartes, iconographie quatre familles, dos, arène abstraite, FX liés aux événements | 100% code, seeds séparées, lisibilité et perf vérifiées |
| **4 — Durcissement** | tests navigateur, correction bugs UX, comparative visuelle, replay partageable, instrumentation | rapport avant/après, aucun bug bloquant, validations opérateur |
| **5+ — Expansion RPG** | structure de ville, PNJ, progression, boutiques, compétitions, événements, HD-2D | **hors mission 01**, soumis à un contrat de contenu/visuel futur |

## Stratégie premier passage Claude Code

Une première tâche peut aller jusqu'à **Lot 1 complet et Lot 2 slice minimal** si faisable dans le temps donné. Le responsable attend un vrai livrable exécutable et des preuves, pas une architecture théorique de 100 fichiers. Claude peut proposer le Lot 3 après validation du prototype interactif ; des éléments visuels procéduraux minimaux accompagnent déjà les premiers lots pour éviter l'UX vide.

### Priorités P0 / P1

1. Jouer une partie déterministe complète, calculs V3.0 + delta V3.2 fidèles.
2. Jouer avec cartes visibles et manipulations directes sans sélecteurs.
3. Lisibilité des phases et secrets.
4. Art par code utile, discret, mesurable.
5. Art HD-2D avancé et exploration : reportés.

### Définition de « fini » pour un lot

Code + tests + doc + journal + capture navigateur + description des limites + preuve des scripts. Un lot sans captures demandées est « partiel » ; un lot sans tests du moteur n'est pas réceptionnable.
