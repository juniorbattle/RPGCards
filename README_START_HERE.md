# LES QUATRE VOIES — KIT DE DEMARRAGE CLAUDE CODE

**Edition :** Handoff production 1.0 · 15 octobre 2026  
**Mission :** nouveau RPG de cartes, moteur V3.0 + delta de production V3.2, direction procédurale by-code et HD-2D **non encore figée**.  
**Dépôt de comparaison (méthode seulement) :** https://github.com/juniorbattle/RPG-ArtByCode (main consulté au commit `d7c439b3b08280d7643d8cfe3f658de6ad49b928`).

## Instructions au responsable humain

1. Créer un **nouveau dépôt Git indépendant** pour Les Quatre Voies. Ne pas développer dans RPG-ArtByCode ni dans RPGThreeJS.
2. Copier **tout le contenu de ce kit à la racine du nouveau dépôt**, sans perdre les sous-dossiers `contracts/`, `docs/`, `qa/`, `source/`, `simulator_ref/`.
3. Ouvrir Claude Code à la racine du nouveau dépôt. Lui transmettre intégralement `PROMPT_CLAUDE_CODE_MISSION_01.md` ou le coller dans sa conversation ; pointer l'agent vers les fichiers qui sont désormais dans son répertoire.
4. La **première mission** n'est pas de livrer une ville ou des décors : architecture reproductible + vrai moteur de duel + plateau direct-manipulation + art procédural des cartes et de l'interface + tests/QA. Toute direction artistique/caméra/HD-2D reste proposée, non imposée.
5. L'agent rend un rapport avant de considérer sa mission achevée : commits, commandes testées, captures, décisions d'architecture, limites, points à arbitrer. Pas de merge sur `main` sans validation.

## Ordre de lecture OBLIGATOIRE pour Claude Code

1. `AGENTS.md` (contrat opérationnel de l'agent)
2. `JOURNAL.md` (état, dernier travail, problèmes et « A reprendre »)
3. `contracts/00_GOUVERNANCE_AUTORITE.md` (sources normatives et conflits)
4. `contracts/01_CONTRAT_MAITRE_PRODUCTION.md` (objectifs, limites, gates)
5. `contracts/02_CONTRAT_GAMEPLAY_DELTA_V3_2.md` (seul avenant modifiant V3.0)
6. `source/CONTRAT_REGLES_V3_0_HISTORIQUE.md` (texte intégral et cas limites)
7. `contracts/03_CONTRAT_ARCHITECTURE_ET_QUALITE.md`
8. `contracts/04_CONTRAT_ART_PROCEDURAL.md`
9. `contracts/05_CONTRAT_UX_DUEL.md`
10. `docs/PLAN_DEVELOPPEMENT_LOTS.md` et `docs/MISSION_01_ACCEPTANCE.md`
11. `qa/MATRICE_REGRESSION_PRIORITAIRE.md`, puis le simulateur dans `simulator_ref/simulator/`.

## Contenu

| Chemin | Rôle |
|---|---|
| `AGENTS.md` | règles permanentes pour l'agent du nouveau projet |
| `JOURNAL.md` | journal initial et modèle des futures passes |
| `PROMPT_CLAUDE_CODE_MISSION_01.md` | prompt de lancement prêt à coller |
| `contracts/00_...` | hiérarchie des textes et procédure d'écart |
| `contracts/01_...` | mandat de production, responsabilités, critères d'entrée/sortie |
| `contracts/02_...` | précision V3.2 (affinité de Rang + journal et états) |
| `contracts/03_...` | architecture, état secret, tests, persistance |
| `contracts/04_...` | pipeline procédural art-by-code, performance, contrôles |
| `contracts/05_...` | manipulation directe, interaction, phases, accessibilité |
| `docs/PLAN_DEVELOPPEMENT_LOTS.md` | lots de livraison et ordre de travail |
| `docs/ARCHITECTURE_CIBLE_PROPOSEE.md` | arborescence de code indicative, types et pipeline |
| `docs/DECISIONS_OUVERTES_ET_ADR.md` | décisions non fixées et template ADR |
| `docs/PROTOCOLE_AGENTS_JOURNAL.md` | protocole précis de journalisation et revue |
| `docs/ETAT_PROJET_ET_LIMITES.md` | état vrai : ce qui existe vs reste à développer |
| `docs/MISSION_01_ACCEPTANCE.md` | critères mesurables du premier lot |
| `qa/MATRICE_REGRESSION_PRIORITAIRE.md` | tests de conformité et cas secrets |
| `qa/RAPPORT_TESTS_ORIGINE_V3_0.md` | preuves du précédent exercice, NON preuve de ce nouveau dépôt |
| `source/CONTRAT_REGLES_V3_0_HISTORIQUE.md` | règlement complet normatif avant delta |
| `simulator_ref/simulator/` | code complet du simulateur V3.2 comme oracle de cas, NON référence d'UI ni architecture imposée |

## Précaution sur les règles

Le contrat V3.0 intégral annonce « pas de +1 d'affinité pour l'Amplification de Rang ». Le delta V3.1 implémenté dans le simulateur V3.2 ajoute explicitement **+1 si même famille**. Le mandat de production adopte ce delta opérationnel ; **ne pas corriger silencieusement le texte historique**. Le fichier `contracts/02_...` prime uniquement sur les phrases contradictoires du texte V3.0. S'il existe une autre contradiction non couverte, consigner le problème, écrire un test de reproduction, demander un arbitrage.

## Ce qui n'est pas promis

Ce kit est un **package de spécification et de référence**. Il ne contient **pas** encore le nouveau code du RPG de production ni des décors HD-2D définitifs. Le simulateur présent est le prototype antérieur. La première tâche de Claude Code est précisément de commencer le véritable projet.
