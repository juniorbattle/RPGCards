# Audit ciblé du dépôt public RPG-ArtByCode (lecture)

Référence : https://github.com/juniorbattle/RPG-ArtByCode, branche `main`, commit recent relevé `d7c439b3b08280d7643d8cfe3f658de6ad49b928` lors de l'audit ; les fichiers et méthodes peuvent évoluer ensuite. Les constatations ci-dessous proviennent des fichiers réellement lus et de l'arborescence, pas de l'exécution du projet de référence.

## Sources consultées

- [`AGENTS.md`](https://github.com/juniorbattle/RPG-ArtByCode/blob/main/AGENTS.md) : règles d'agent, état des outils de capture, statique / seed, caméra, performance, shaders, occlusion.
- [`JOURNAL.md`](https://github.com/juniorbattle/RPG-ArtByCode/blob/main/JOURNAL.md) : historique des passes, échecs documentés, reprise, chiffres de profiling avec précautions matérielles.
- [`package.json`](https://github.com/juniorbattle/RPG-ArtByCode/blob/main/package.json) : Vite, TypeScript, Three.js, `puppeteer-core`; scripts `dev`, `build`, `typecheck`, `shots`, `compare`.
- [`src/main.ts`](https://github.com/juniorbattle/RPG-ArtByCode/blob/main/src/main.ts) : initialisation application, génération avec progression, paramètres de seed, DebugPanel/HUD, sonde d'état.
- Arborescence `src/app`, `src/architecture`, `src/atmosphere`, `src/characters`, `src/core`, `src/debug`, `src/district`, `src/materials`, `src/props` et outils `tools/{screenshots,compare,diff,eval,perf,zoom,walk,...}.mjs`.

## Pratiques à transférer

- Génération de sprites/textures/géométrie **par code**, avec seeds et réglages reproductibles.
- Contrôle de qualité **visuel mesurable** : captures déterministes, diff A/B, benchmark comparant des conditions équivalentes.
- Séparation par modules et données plutôt que génération monolithique opaque.
- Processus agents : contrat `AGENTS.md`, registre `JOURNAL.md`, entrées [OK]/[KO]/[?], mesure, cause, leçon, tâche suivante.
- Le rendu doit être évalué en contexte de GPU réel, ne pas interpréter sans précaution des nombres en régime vsync.

## Ce qui NE SE TRANSFÈRE PAS

- Le décor marchand, la scène du canal, les règles de culling liées aux vues, les caméras A/B/C/D, les positions, la palette ou la grammaire visuelle verrouillée dans cette référence.
- Les shaders, éclairages, matériaux et modules architecturaux sans lien avec le plateau de cartes (en particulier un clone coûteux de ses effets atmosphériques).
- Les métriques GPU de ce projet appliquées sans nouveau benchmark aux cartes.
- Le journal historique de RPG-ArtByCode en lieu et place de celui du nouveau jeu.

## Conséquence de l'audit

Pour Les Quatre Voies, **le rendu de la carte et du plateau est le produit visuel prioritaire**. Three.js peut servir à la profondeur/FX/HD-2D future, mais la capture de cartes, le placement, le focus, les textes et les états doivent être indépendants du système de caméras. **Aucun choix de design définitif n'est déduit** de l'audit.
