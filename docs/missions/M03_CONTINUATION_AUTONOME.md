# Mission autonome M03.1 → M03.2 — Stabilisation puis fidélité visuelle

**Mandat opérateur : approuvé le 16 octobre 2026.**  
**Branche de préparation :** `claude/m03-1-securite-m03-2-fidelite`, créée à partir de `claude/m03-ui-fidele-et-clash-anime` (livraison M03 `6338311`).  
**Source visuelle impérative :** `reference/REFERENCE_VISUELLE_VALIDEE_M03.jpg`.  
**Rapport de baseline :** `docs/RAPPORT_M03.md`, ADR 009–010 et captures `screenshots/qa/m03/`.  
**Hiérarchie :** demande opérateur récente > contrat V3.0 + delta V3.2 > cette mission (sur la présentation et les tests seulement) > prompts M03/M02 précédents. Aucune nouvelle règle.

## Mission

Poursuivre **de manière autonome** le vrai jeu de duel RPGCards. La livraison M03 est la base : **ne pas repartir du simulateur, ne pas réécrire l'arène ni la galerie, ne pas utiliser la preview comme texture**.

Enchaîner **dans cet ordre obligatoire** :

1. **M03.1 — P0 sécurité des données, P1 QA Rupture/Dissipation et régressions.** Lire intégralement `docs/missions/M03_1_SECURITE_ET_COUVERTURE_QA.md`. Fournir un commit et des preuves distinguant P0 de P1.
2. **M03.2 — fidélité runtime à la preview M03 validée.** Lire intégralement `docs/missions/M03_2_FIDELITE_RUNTIME_ET_FLUIDITE.md`. Commencer cette partie **uniquement après** les tests de M03.1 réussis et l'absence de fuite publique connue. Fournir captures réelles et comparaison objective avant/après.

Tu peux enchaîner les deux parties **sans demander un feu vert intermédiaire** tant que les règles restent intactes et les tests d'entrée sont verts. Tu n'as pas autorité pour changer une règle, un effet de carte, la fenêtre des Techniques ni ratifier ARB-002 à la place du responsable. Si le temps est limité, finir M03.1 proprement et documenter précisément le reliquat M03.2 : un correctif de sécurité incomplet n'est jamais acceptable sous prétexte de visuel.

## Discipline de démarrage et de développement

- Relire `AGENTS.md`, `CLAUDE.md`, `JOURNAL.md` (dernier état et dernières leçons), le contrat `contracts/00_GOUVERNANCE_AUTORITE.md`, les règles `source/CONTRAT_REGLES_V3_0_HISTORIQUE.md` et `contracts/02_CONTRAT_GAMEPLAY_DELTA_V3_2.md`, ADR 004 / 006–010 et `docs/RAPPORT_M03.md`.
- Vérifier `git status`, HEAD, historique et branche. **Développer sur une branche enfant** (p. ex. `claude/m03-continuation-implementation`) issue de cette branche documentaire ; conserver `main`, la branche M03 et ses preuves intactes. Pas de fusion ni PR sans demande.
- Partir des suites npm existantes. Les données internes du moteur et les valeurs d'événements destinés à un spectateur ne sont **pas** la même chose. La vue AI ne doit jamais lire les engagements secrets du joueur.
- Tout art reste **procédural par code** : Three.js / TypeScript, Canvas, CSS, SVG, géométries/GLSL adaptés ; aucune image/téléchargement de ressources externes. La preview GitHub sert **uniquement de comparatif**, jamais d'asset runtime.
- Un diagnostic initial concis et plan court, puis coder/tester/capturer. Documenter les corrections, les échecs et les comparaisons dans `JOURNAL.md`, plus ADR s'il y a choix architectural durable.
- Tous les tests et captures doivent correspondre au **même SHA final** ou expliquer exactement quelles modifications, seulement documentaires, sont survenues après le SHA testé. Rapports factuels ; ne pas présenter des FPS SwiftShader comme GPU réel.

## Invariants absolus

- Aucune modification du gameplay V3.0 + delta V3.2 : duel à 17 cartes uniques, deux Secondaires persistantes, choix tactiques secrets et simultanés après Primaires, Insight max 2, 4 Signatures, Rang +1 même famille. Toutes les zones et destinations des cartes sont gouvernées par le moteur.
- Les informations cachées (Dissimulation, main, engagements et intentions secrètes) ne sortent jamais par les objets publics, journaux, UI, replay, IA ou expressions.
- M03 reste la base esthétique : confrontation frontale rival visible, vue B inclinée, HUD rival haut gauche / HUD joueur bas gauche, centre dégagé, ASSAUT rouge / GARDE bleu, main basse, Six chorégraphies du Clash. Les deux Primaires rejoignent la défausse après leur animation.
- Aucun nouveau Sang-froid, tell fondé sur un secret, bonus, technique, nouveau décor de ville ou refonte complète des personnages.
- La plateforme de test ne valide pas automatiquement une correspondance artistique : toute réserve de fidélité doit être exposée, même si la QA mécanique passe.

## Livrable final souhaité

Une branche d'implémentation, deux comptes rendus distincts **M03.1 sécurité/QA** et **M03.2 visuel/performance**, nouveaux tests, captures comparatives et planches de Clash, mesure de performance honnête, `JOURNAL.md` mis à jour et propositions restantes. Fournir des liens GitHub et **ne pas déclarer un résultat qui n'a pas été exécuté**.

**Priorité :** intégrité du duel → couverture navigateur → lisibilité/runtime fidèle → raffinement sans perte de performance.