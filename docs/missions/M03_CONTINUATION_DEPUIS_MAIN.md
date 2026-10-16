# Mandat actif — M03.1B puis M03.2 (continuation sur main)
Date : 2026-10-16 — Autorisation opérateur : « Go »

## Sources et état de départ

- **Dépôt actif :** `juniorbattle/RPGCards`, branche **`main`**. La règle récente dans `AGENTS.md` / `CLAUDE.md` prime sur les anciennes consignes de branches provisoires : Claude Code travaille **directement sur main**, commit/push après validation. **Ni nouvelle branche ni PR**, sauf autorisation explicite ultérieure ; jamais de force-push ou réécriture d'historique.
- M03 est déjà livré et intégré à `main` ; la composition générale de l'ADR 009 est approuvée, mais pas encore sa fidélité de proportions/éclairage ; les six chorégraphies ADR 010 sont acceptées comme base.
- La **passe 4** déjà fusionnée dans `main` a corrigé la fuite des `scores` et `multipliers` bruts du rapport public : `null` en cas de camouflage, valeur privée fournie au propriétaire. Le journal rapporte 93/93 tests et comparaison à 900 duels IA/IA ; **ne pas refaire ce correctif** ni annuler ses tests.
- **Nouveau défaut reproduit et consigné dans JOURNAL passe 4 :** noms des effets individuels de Secondaires camouflées, raisons d'Insight et `ClashReport.effects` peuvent encore révéler une identité cachée. C'est le premier vrai chantier restant.
- Référence artistique obligatoire : `reference/REFERENCE_VISUELLE_VALIDEE_M03.jpg`, **utilisée pour comparer seulement**, jamais chargée comme asset dans le runtime.

## Autonomie approuvée

Lis d'abord `AGENTS.md`, `CLAUDE.md`, `JOURNAL.md` dans leur **état actuel sur main**, puis les règlements `source/CONTRAT_REGLES_V3_0_HISTORIQUE.md`, `contracts/02_CONTRAT_GAMEPLAY_DELTA_V3_2.md`, les ADR 004/006/009/010 et `docs/RAPPORT_M03.md`. Ensuite enchaîne sans interruption inutile :

**Étape A — M03.1B :** `docs/missions/M03_1B_CONFIDENTIALITE_EFFETS_ET_QA.md`. Corriger d'abord les fuites indirectes des effets camouflés, puis rendre Rupture et Dissipation testables depuis l'interface. S'assurer de la non-régression des scores déjà protégés. **Porte bloquante** : typecheck, tests, build et tests ciblés de confidentialité.
  
**Étape B — M03.2 :** `docs/missions/M03_2_FIDELITE_VISUELLE_RUNTIME.md`. Après la porte sécurité seulement, améliorer la visibilité du rival en vue frontale et inclinée, plateau/Clash, lumière, personnage, mobile paysage et fluidité par comparaison réelle à la preview.

**Aucune nouvelle mécanique du duel n'est autorisée.** Les effets gardent leurs coûts/déclenchements, le Rang, l'Insight et les issue de Clash restent identiques. La priorité est confidentialité → QA fonctionnelle → lisibilité/qualité visuelle. Le besoin d'un arbitrage gameplay bloquant doit être signalé séparément, sans valider silencieusement ARB-001/002/005/011.

### Discipline

Faire un bref diagnostic du dernier `main` et de ses commits (nouveau travail concurrent éventuel), puis implémenter effectivement. Produire des commits atomiques et conserver `JOURNAL.md` à jour, avec preuves reproductibles. Prévoir `docs/RAPPORT_M03_1B.md` et `docs/RAPPORT_M03_2.md` ; ne pas déclarer M03.2 livré à la place d'un plan. Les captures de M03 restent un référentiel et non une preuve du nouveau runtime. Ne pas représenter SwiftShader comme un GPU matériel.

**Résultat attendu :** duel M03 conservé, confidentialité garantie aux endroits effectivement audités/testés, Rupture et Dissipation réellement validées en QA navigateur, rendu davantage conforme à la preview, UI fluide desktop/mobile et rapports factuels.