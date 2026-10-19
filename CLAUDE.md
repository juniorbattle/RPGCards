# CLAUDE.md — Point d'entrée Claude Code

## Règle de branche — décision du responsable (2026-10-16)

Le développement se fait **directement sur `main`** : commit puis push sur `main` après validation (typecheck, tests, build ; QA navigateur quand le rendu change). **Pas de branche provisoire ni de PR**, sauf demande explicite du responsable. Ne jamais réécrire l’historique de `main` (pas de force-push, pas de rebase de commits publiés). Les branches `claude/*` M01–M03 sont de l’historique, déjà intégré.

## MANDAT ACTIF — M08 : consolidation du combat (2026-10-18)

Lire `docs/missions/M08_CONSOLIDATION_DU_COMBAT.md` et la section M08 d’`AGENTS.md`. Pousser au maximum la structure et le visuel du combat avant l’extension RPG : C1 pré-génération des personnages (livrée, passe 28), C2 environnements de combat variés (rue, salle de jeu de cartes, bar, arène), C3 duellistes PNJ génériques à variations subtiles sur le socle V2 (porte livrée, passe 29, ADR 023 ; retour du responsable attendu), C4 réception de M07. « Vectoriel V2 » = base graphique ; V1 retiré seulement après réception ; règles et secrets inchangés.

## Mandat M07 : mise en scène du duel et lisibilité (livré L1 à L5, réception en cours ; 2026-10-17)

Lire `docs/missions/M07_MISE_EN_SCENE_ET_LISIBILITE.md` et la section M07 d’`AGENTS.md`. Rival en buste sans mains (ADR 017), plateau symétrique et lisible avec un tour guidé (ADR 018 ; rival gardé de face, pas de portraits dans les coins), puis mise en scène HD-2D de la scène entière (ADR 019), puis écrans hors duel qualitatifs et dynamiques (lot 4, ADR 020), puis refonte des personnages (lot 5 : « vectoriel V2 » validé, une identité par rival, finition faite, **rendu par défaut** depuis la passe 25, portrait du joueur en V2 depuis la passe 26 ; `?qa=1&figure=v1` pour comparer ; ADR 021) ; règles et secrets inchangés. M04–M06 sont livrés (RC 0.6.0-rc.1).

## Mandat M04 à M06 (livré : duel visuel validé, jeu opérationnel)

Le responsable **valide la vue frontale actuelle du rival et la configuration visuelle M03.2**. La composition desktop doit désormais rester stable. **Mission principale :** lire `docs/missions/M04_M06_PROGRAMME_JEU_OPERATIONNEL.md`, ses trois contrats M04/M05/M06, et `docs/adr/013-baseline-visuelle-desktop-approuvee.md`. Après un bref audit, implémenter une boucle complète de RPG de cartes SOLO desktop (accueil, deck, rencontres, multiples duels, résultats, progression, sauvegarde/reprise) et la stabiliser en release candidate locale. Enchaîner de façon autonome sans demandes intermédiaires tant que les règles V3.0/V3.2 sont intactes. Mobile paysage et détails artistiques secondaires **différés**. Ce mandat **remplace les priorités M03.1B/M03.2**, déjà livrées. Respecter la règle de développement sur `main`.


## Mission active — M03.1B + M03.2 depuis main (2026-10-16)

Lire `docs/missions/M03_CONTINUATION_DEPUIS_MAIN.md` et ses deux contrats associés, puis l'ADR 011. **Démarrer sur le dernier main**, où la passe 4 a déjà corrigé les scores bruts. Corriger maintenant les **noms d'effets / raisons Insight / détails de rapport** qui révèlent une Secondaire camouflée, puis tester Rupture et Dissipation dans l'UI, puis rapprocher réellement le runtime de la preview approuvée (rival en A/B, éclairage, lisibilité Clash, mobile paysage). Respecter la règle actuelle « directement sur main » ci-dessus, et ne pas modifier les règles du duel. Le travail n'est pas considéré livré par la seule présence des documents : coder, tester, capturer, mesurer, documenter.

## MANDAT ACTIF — M03 : fidélité visuelle et animation de Clash

**Mission actuellement approuvée** : lire et exécuter `docs/missions/M03_PREVIEW_VALIDEE_HUD_CLASH.md` ainsi que `reference/REFERENCE_VISUELLE_VALIDEE_M03.jpg` (image validée par le responsable). M03 **prévaut sur M02 uniquement pour la direction visuelle, les positions des HUD et le motion design** ; aucune règle V3.0/V3.2 n'est modifiée. Reprendre les modules M02 existants, ne pas repartir de zéro. HUD rival haut-gauche, HUD joueur compact bas-gauche, centre libre, badges ASSAUT/GARDE, Clashes physiques animés via les événements déjà résolus. Développer sur `main` (voir « Règle de branche »).


## MANDAT ACTIF — M02 (nouveau, prioritaire sur le cadrage visuel M01)

**Après la lecture obligatoire de `AGENTS.md` et `JOURNAL.md`**, exécuter la mission `docs/missions/M02_CONFRONTATION_FACE_A_FACE_ET_LISIBILITE.md`. Le moteur M01 constitue la base existante, ne pas recommencer un projet neuf. **Vue frontale de confrontation par défaut avec adversaire visible**, vue inclinée complémentaire pendant manipulation, retour frontal pour révélation/tactique, personnage procédural expressif, résolution séquencée, UX fluide. **Aucune mécanique de tells informatifs ou Sang-froid n'est encore ratifiée.** (Historique : M02 a été développée sur branche puis intégrée à `main` ; on travaille désormais sur `main`.)


**Mandat M01 actualisé :** projet `RPGCards` déjà initialisé sur `main` ; configure **Three.js + Vite + TypeScript**, puis poursuis **de manière autonome jusqu'au premier MVP de duel jouable**. Lire en priorité le chapitre « MANDAT ACTUALISÉ » de `PROMPT_CLAUDE_CODE_MISSION_01.md` ; les consignes plus anciennes « Three.js optionnel », « attendre validation après chaque lot » ne s'appliquent plus. Si un environnement est prototypé, choisir provisoirement entre **tilted top-down** et **frontale 2.5D** ; aucun décor/cadrage/design définitif à ce stade.


**Avant toute réponse ou action**, lire **entièrement** `AGENTS.md`, puis `JOURNAL.md`, puis `README_START_HERE.md` et `contracts/00_GOUVERNANCE_AUTORITE.md`. Pour le mandat initial, suivre `PROMPT_CLAUDE_CODE_MISSION_01.md` et les contrats référencés.

`AGENTS.md` est le contrat permanent ; `JOURNAL.md` décrit l'état actuel et doit être mis à jour **avant la fin de chaque passe**. Ne pas utiliser un journal d'un autre projet.

**Distinction capitale :** `source/CONTRAT_REGLES_V3_0_HISTORIQUE.md` = règlement canonique initial ; `contracts/02_CONTRAT_GAMEPLAY_DELTA_V3_2.md` = **seul** delta opérationnel de cette mission, +1 affinité Rang, phases conservées et détails UI/log. `simulator_ref/` = référence QA, pas base architecturale à dupliquer.

Ne pas développer dans le dépôt GitHub RPG-ArtByCode ; ne pas verrouiller caméra/décor/design HD-2D pour le moment. Priorité : vrai moteur indépendant du rendu, plateau de cartes interactif par clic et drag-drop, procedural art code-first, tests, screenshots réels et journal honnête.
