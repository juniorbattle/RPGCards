# RPGCards — Les Quatre Voies

## Mission active — Three.js + MVP autonome

Le kit est déjà publié sur `main`. Claude Code prend en charge la **mise en place du runtime Three.js + Vite + TypeScript**, le moteur de duel normatif et une UI de manipulation directe des cartes. La mission est volontairement **large et autonome** : produire rapidement une première version jouable contre IA, puis durcir avec tests et captures. Le mandat détaillé et prioritaire est `PROMPT_CLAUDE_CODE_MISSION_01.md`.

Le HD-2D futur peut explorer deux caméras provisoires : **vue de dessus inclinée (tilted top-down)** ou **perspective frontale 2.5D**. Aucun décor urbain, cadrage exact ou langage visuel définitif n'est fixé ; priorité au duel jouable. Claude Code effectue le développement sur sa propre branche, sans fusion automatique.


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
