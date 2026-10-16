# CLAUDE.md — Point d'entrée Claude Code

**Mandat M01 actualisé :** projet `RPGCards` déjà initialisé sur `main` ; configure **Three.js + Vite + TypeScript**, puis poursuis **de manière autonome jusqu'au premier MVP de duel jouable**. Lire en priorité le chapitre « MANDAT ACTUALISÉ » de `PROMPT_CLAUDE_CODE_MISSION_01.md` ; les consignes plus anciennes « Three.js optionnel », « attendre validation après chaque lot » ne s'appliquent plus. Si un environnement est prototypé, choisir provisoirement entre **tilted top-down** et **frontale 2.5D** ; aucun décor/cadrage/design définitif à ce stade.


**Avant toute réponse ou action**, lire **entièrement** `AGENTS.md`, puis `JOURNAL.md`, puis `README_START_HERE.md` et `contracts/00_GOUVERNANCE_AUTORITE.md`. Pour le mandat initial, suivre `PROMPT_CLAUDE_CODE_MISSION_01.md` et les contrats référencés.

`AGENTS.md` est le contrat permanent ; `JOURNAL.md` décrit l'état actuel et doit être mis à jour **avant la fin de chaque passe**. Ne pas utiliser un journal d'un autre projet.

**Distinction capitale :** `source/CONTRAT_REGLES_V3_0_HISTORIQUE.md` = règlement canonique initial ; `contracts/02_CONTRAT_GAMEPLAY_DELTA_V3_2.md` = **seul** delta opérationnel de cette mission, +1 affinité Rang, phases conservées et détails UI/log. `simulator_ref/` = référence QA, pas base architecturale à dupliquer.

Ne pas développer dans le dépôt GitHub RPG-ArtByCode ; ne pas verrouiller caméra/décor/design HD-2D pour le moment. Priorité : vrai moteur indépendant du rendu, plateau de cartes interactif par clic et drag-drop, procedural art code-first, tests, screenshots réels et journal honnête.
