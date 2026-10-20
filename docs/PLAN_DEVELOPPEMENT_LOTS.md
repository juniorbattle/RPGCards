# Plan de développement — Tranches verticales et portes de validation

## Extension de production approuvée — M04 à M06 (16 octobre 2026)

Le MVP de duel M03.2 est réceptionné comme baseline visuelle desktop (ADR 013). **Ne pas le reconstruire**. La suite autorisée en autonomie est : M04 accueil/deck et navigation complète, M05 rivaux/rencontres/collection/progression/sauvegarde locale, M06 fiabilisation et release candidate solo desktop. Détails dans `docs/missions/M04_M06_PROGRAMME_JEU_OPERATIONNEL.md`. Mobile paysage et art décoratif secondaire reportés. Ces nouveaux lots étendent le périmètre du kit initial et ne modifient pas les règles V3.0/V3.2 ni l'économie non encore ratifiée.


## Préparation future M10 — origines et ascension (2026-10-20)

**Décision narrative ratifiée :** le joueur commence sans affiliation, son duel inaugural attire l'attention des familles, puis **il choisit lui-même sa voie** après une invitation, sans affiliation imposée (option B, ADR 029). Cadrage : `docs/missions/M10_ORIGINES_ASCENSION_QUATRE_VOIES.md`. **Composition des cartes neutres ratifiée (ADR 030) :** 16 cartes physiques, quatre copies pour chacun des Rangs I–IV, aucune famille, effet ou bonus propre. Puissances exactes, Signature, Techniques, remplacement progressif et récompenses demandent toujours **un avenant gameplay séparé et validé** ; aucune implémentation n'est lancée. **M09 demeure l'étape d'exécution active** : priorité aux quartiers et aux validations d'assets déjà en cours.

## Mode d'exécution autonome — mandat mis à jour

La mission M01 peut **enchaîner Lot 0, Lot 1, Lot 2, Lot 3 et QA initiale sans arrêt d'approbation** si chaque lot conserve les contrats et satisfait ses tests. Claude Code doit viser le **premier MVP jouable rapidement**, puis renforcer la couverture : pas d'arrêt artificiel après l'architecture ou un simulateur non interactif. `Three.js` est requis dans le runtime visuel ; l'interface des cartes peut exploiter des éléments DOM/SVG superposés. Le tout reste un jeu **HD-2D par code**, mais sans investissement initial dans des décors urbains complets.

Un environnement minimal peut choisir **une vue de dessus inclinée** ou **une perspective frontale 2.5D** ; ce n'est pas un choix final de mise en scène. Le lot est déclaré **partiel** si son fonctionnement n'a pas été démontré. Une règle ambiguë ne donne pas licence d'inventer une mécanique canonique.


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
