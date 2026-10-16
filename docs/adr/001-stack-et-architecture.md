# ADR 001 — Stack de production et découpage moteur / présentation
Date : 2026-10-16
Statut : proposé (mis en œuvre sur `claude/jolly-keller-w17gmp`, en attente d’acceptation du responsable)

**Contexte et preuves.** Mandat M01 : Vite + TypeScript strict + Three.js obligatoires ; moteur de duel pur, simulable sans navigateur ; secrets protégés par construction (contrat 03).

**Contraintes invariantes.** Aucune dépendance DOM/rendu/timer dans `src/game/` ; RNG gameplay seedée ; vues filtrées pour l’UI et l’IA ; animations consommatrices d’événements.

**Options considérées.**
- A. Moteur orienté objets mutables + UI qui lit l’état brut (rapide, mais fuite de secrets probable, replay fragile).
- B. Transition pure `applyCommand(state, cmd) → { state, events }` sur état JSON sérialisable, RNG xorshift32 *dans* l’état, événements à visibilité déclarée, projections `viewFor`. (retenu)
- C. ECS / framework de jeu (surdimensionné pour un duel de cartes).

**Décision.** Option B.
- `src/game/catalog` (données normatives), `model` (types), `engine` (phases, validation, `computeClash` pur, invariants, RNG), `visibility` (`viewFor`, journal filtré), `ai` (politique sur `PlayerView`), `replay` (enregistrement + hash), `fixtures` (états de démonstration/QA), `match.ts` (orchestrateur headless).
- `src/art` (générateurs Canvas/SVG seedés), `src/scene` (Three.js), `src/presentation` (DOM), `src/app` (contrôleur, paramètres, scénarios).
- `computeClash` est une fonction pure réutilisée par le moteur, l’IA et la prévisualisation UI → une seule arithmétique.
- Phases optionnelles (Dissipation, Lecture, Repoussement) ouvertes uniquement si une décision non triviale existe **d’après l’information publique** (Insight, Techniques équipées, camouflage visible) : pas de fuite par la seule ouverture d’une fenêtre.

**Conséquences.** Clonage `structuredClone` par transition (coût négligeable : 30 duels IA/IA ≈ 1 s). Le replay rejoue la liste de commandes et compare un hash état+événements. Le code de production ne dépend pas de `simulator_ref/` (oracle uniquement).

**Tests.** `test/clash.test.ts`, `test/engine.test.ts` (matrice G01–G27), `npm run qa:browser`.

**Question nécessitant approbation.** Acceptation du découpage ; aucun impact règle.
