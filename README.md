# RPGCards — Les Quatre Voies

Dépôt de production : https://github.com/juniorbattle/RPGCards

## Démarrage pour Claude Code

Lire dans cet ordre : `CLAUDE.md`, `AGENTS.md`, `JOURNAL.md`, `contracts/00_GOUVERNANCE_AUTORITE.md`, puis `README_START_HERE.md` et `PROMPT_CLAUDE_CODE_MISSION_01.md`. Lire ensuite tous les autres contrats avant de modifier le code.

**Ne pas copier l’architecture du simulateur comme architecture de production.** Le code situé dans `simulator_ref/` sert de référence fonctionnelle et de banc de vérification.

## Référence normative

Le contrat V3.0 `source/CONTRAT_REGLES_V3_0_HISTORIQUE.md` est complété par `contracts/02_CONTRAT_GAMEPLAY_DELTA_V3_2.md`, notamment pour le bonus de famille (+1) en amplification de Rang.

## Principes

- Génération procédurale d'art par code : Canvas, SVG, CSS, Three.js, GLSL selon utilité.
- Le rendu HD-2D est une direction future, sans caméra, décor ni design final imposés à ce stade.
- Premier chantier : moteur de duel fiable, plateau manipulable à la souris et au tactile, tests et QA.
- Les choix secrets de l'IA et du joueur doivent rester privés.
- Journal et documents de production mis à jour à chaque passe.

## Référence méthodologique

https://github.com/juniorbattle/RPG-ArtByCode (principes et outils uniquement, pas d'import de décors ni de shaders).

## Simulateur de référence

```sh
cd simulator_ref/simulator
npm test
npm run build
npm run dev
```

Ce dépôt est initialement un package documentaire et une référence de simulateur. Claude Code doit créer le runtime de production dans le cadre de la mission M01.
