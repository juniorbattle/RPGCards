# Brief initial à transmettre à Claude Code

Tu reçois le projet **Les Quatre Voies**, un RPG urbain centré sur un duel de cartes original. Le dossier joint contient `docs/CONTRAT_V3_0_SOURCE.md` (normatif), un **simulateur jouable** (`SIMULATEUR_LES_QUATRE_VOIES_V3_1.html`), `src/engine.mjs` (moteur expérimental), ses tests et un outil de simulations de lots.

**Objectif immédiat : produire un véritable vertical slice de duel, avec un art et des interactions produits procéduralement par code.** Le simulateur n'est pas le jeu final. Il sert de banc de validation des règles et des cas limites. Tu dois comprendre les sources, puis créer une architecture de production nette, plutôt que copier les fichiers UI du simulateur.

## Premier lot de développement concret

1. **Audit normatif bref.** Lire tout le contrat V3.0 et les tests, signaler les éventuelles contradictions observables, sans inventer de règle pour les masquer.
2. **Architecture production.** Vite + TypeScript (ES modules), moteur de résolution pur, RNG reproductible, catalogue de cartes en données structurées, vue filtrée par joueur, orchestrateur de phases, moteur d'animation indépendant. Le jeu démarre via `npm install && npm run dev`.
3. **Premier duel complet.** Joueur contre IA heuristique avec les 17 cartes, les 16 variantes, quatre Signatures, les 6 Techniques, les Secondaires persistantes, leurs phases, Interférences, Repoussements et mort subite, selon V3.0. Le moteur n'expose jamais une décision cachée de l'adversaire.
4. **Art code-first ambitieux et soigné.** Définir une direction visuelle des quatre familles, construire procéduralement les faces de cartes, les ornements, la table/arène, les lumières et les VFX de duel (reveal, Garde, Assaut, combo, Interférence, Signature). Préférer Canvas 2D / WebGL2 / shaders GLSL ou géométries au runtime selon leur utilité réelle. Aucun pack de textures, photo ou modèle téléchargé pour ce lot. Qualité et lisibilité sont prioritaires sur la quantité d'effets.
5. **Ergonomie.** Rang et Puissance distincts ; coefficients et dégâts provisoires annoncés comme tels ; phase actuelle clairement visible ; choix secrets protégés ; nom/état des effets armé, réussi, contré ; mobile accessible ; option réduction des animations.
6. **Vérification.** Porter les invariants et scénarios tests du simulateur, ajouter tests de propriété et E2E en navigateur, produire des captures réelles et un rapport QA. Pas de métriques inventées.

## Contraintes de projet

- Ne pas ajouter de cinquième mode Basic de Secondaire, d'autre statistique, de phases arbitraires ou d'inflation de Rang des Signatures.
- **Puissances Basic 3/6/9/12** ; Signatures P14/P12/P12/P13 ; Insight 2 maximum ; trois types de Clash du contrat ; multiplicateurs additifs.
- Garder le duel viable **sans art externe** et sans besoin de backend, puis prévoir une évolution propre vers le RPG urbain à ville unique.
- Le monde narratif/ville n'est **pas** à implémenter intégralement durant ce premier lot : priorité à la qualité visuelle et fonctionnelle du duel.
- Si le prototype paraît trop simple visuellement, améliorer le système de rendu code-first (matériaux, lumière, symboles, VFX) plutôt que masquer le problème avec des images stock.

## Livrables de la première étape

- Sources TypeScript organisées, README, scripts npm, tests, duel jouable directement dans le navigateur.
- Démonstration des quatre Signatures et de plusieurs combos, avec captures de vrai runtime.
- Rapport des écarts et limites, backlog ordonné par impact sur la qualité du duel.

**Commence l'implémentation après ton audit court. La V3.0 est le contrat maître et `docs/DELTA_V3_1_A_VALIDER.md` expose une évolution à confirmer explicitement avant la production ; le simulateur est une référence de comportement et non un modèle artistique à reproduire littéralement.**
