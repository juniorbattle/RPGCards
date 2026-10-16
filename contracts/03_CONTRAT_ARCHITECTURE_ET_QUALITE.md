# 03 — Contrat maître architecture, simulation, QA

## Contrainte centrale

**Le gameplay peut être simulé intégralement sans navigateur ni GPU.** Le rendu lit les événements/états filtrés, jamais l'inverse. L'IA et l'UI ne doivent pas avoir une vue brute d'un état qui contient des secrets adverses.

## Modules et contrats publics (noms indicatifs)

- `game/domain`: identifiants de cartes uniques, imprimés, variantes, signatures, coût Techniques, decks valides.
- `game/rules`: pure `transition(state,command,seededRng): {state,events}` ; validation et anti-duplication des zones.
- `game/visibility`: projections `viewFor(playerId,state)`, `publicLog(events)`, `aiObservation` ; règles de secret et d'information préalablement connue.
- `game/ai`: policy déterministe par observation autorisée, style offensif/défensif ; pas de triche sur choix adverses.
- `game/replay`: log d'événements, seed gameplay, version des règles, commandes rediffusables et contrôle de hash.
- `game/serialization`: format versionné, aucune fonction non sérialisable ; sauvegarde/pause de duel si intégrée.
- `presentation/input`: placement/retour visuel des cartes, drag/drop pointer events, alternative clic/tactile/clavier.
- `presentation/cards`: rendu cartes typographiques + illustration générée + marqueurs état ; jetons interaction.
- `presentation/effects`: animations en réaction aux événements du moteur ; accélération/saut des animations ne change jamais les résultats.
- `art`: générateurs seedés Canvas/SVG/Three.js/GLSL éventuels, cache, fallback, calibrage.
- `app`: orchestration de la phase, de l'IA, des projections de visibilité et de l'UI.

## Invariants absolus

1. `17 identités par deck` et zone unique par carte physique ; Signature seulement Primaire.
2. À l'instant de choix, **une seule Primaire** en Assaut/Garde et **≤ 1** nouvelle Secondaire ; au plus **2** emplacements persistants.
3. Chargement `T`, révélation possible uniquement `T+1` ; réserve cachée inactive ; active peut conserver.
4. Assaut/Assaut égalité : impacts simultanés ; Assaut/Garde égalité : Garde gagne ; Signature ∞ priorité sans Puissance ∞.
5. Dégâts soutenus : somme des coefficients Dégâts (×1 sans soutien), pas produit ; Rang soutenu : somme des rangs avec delta D-01 ; puissance et Rang ne sont pas confondus.
6. Interférence vérifie Rang imprimé ≤ Rang imprimé de l'interférente, cible **engagée** seulement, évaluation simultanée sans cascade ; exceptions écrites uniquement.
7. Insight entier 0..2, départ standard 1, gain total max 1/tour, 1 Technique/tour, 2 équipées ; coût payé avant résolution et jamais financé rétrospectivement.
8. K.-O. simultané renvoie à 1 PV chacun avec nettoyage normal, pas score arbitraire.
9. IA **non omnisciente**. Aucune composante de l'UI accessible au joueur ne divulgue une identité adverse cachée, y compris le journal ou debug.
10. Déterminisme : un même flux commandes + RNG gameplay seedé + version du catalogue produit exactement le même log normatif.

## Cycle d'une commande

Les commandes sont **validées pour la phase courante**. Une commande illégale est rejetée explicitement sans mutation : pose Secondaire en chargement, action Dégâts sous Garde, Technique non équipée, coût insuffisant, cible illégale, double action interdite, prise d'une carte ailleurs. Prévoir journal technique en développement sans fuite dans la vue publique.

## Outils et livraison

- TypeScript strict (`strict: true`), modules ES, `tsc --noEmit`, bundling Vite recommandé ; bibliothèque de tests à sélectionner après audit, et tests property-based ou simulations reproductibles.
- `qa:browser` smoke sur Chromium ou équivalent : écrans phase par phase, viewport desktop et mobile, clavier et Pointer Events, pas d'erreur console. Capture de situations déterministes dont `T2`.
- Tests de rendu : screenshot seedé avec « animations figées » ; contraste lisible, aucun texte important sous shader.
- Mesures GPU seulement lorsque rendu 3D/GLSL le justifie ; ne pas importer de suite les systèmes de culling/caméra spécifiques de RPG-ArtByCode.
- Revue qualité : nomenclature des erreurs, reproduction, sécurité des URL/devtools/public logs, couverture et débits FPS mesurés sans inventer de baseline.

## Politique de migration du simulateur

Importer des **scénarios et comportements** du V3.2 ; ne pas copier l'architecture JS `engine.mjs/ui.mjs` par commodité. Si un algorithme est recopié, consigner sa provenance, les divergences et une vérification indépendante par oracle. Le nouveau code de production doit survivre à la suppression de `simulator_ref/`.
