# AGENTS.md — Les Quatre Voies (nouveau dépôt indépendant)

## Règle de branche — décision du responsable (2026-10-16)

Le développement se fait **directement sur `main`** : commit puis push sur `main` après validation (typecheck, tests, build ; vérification ciblée quand le rendu change). **Campagnes de QA complètes** (`qa:browser`, `qa:product`, `qa:rc`, séries GPU sur les deux cartes, comparaisons au pixel près répétées) **aux jalons seulement** : quand un atout majeur est consolidé ou que la conception a réellement avancé (règle du responsable du 2026-10-19, JOURNAL). **Pas de branche provisoire ni de PR**, sauf demande explicite du responsable. Ne jamais réécrire l’historique de `main` (pas de force-push, pas de rebase de commits publiés). Les branches `claude/*` M01–M03 sont de l’historique, déjà intégré.

> **DÉCISION DU RESPONSABLE (2026-10-19, pendant le run) : caméra d'exploration = FRONTALE 2.5D.** « Non, on ne veut pas d'inclinaison, mais frontale. » La vue de dessus inclinée est abandonnée : ne la construis pas (ou retire-la du laboratoire), fais V1 et V2 directement en frontale 2.5D (≈ 10–20°, plans de profondeur), et demande les images de référence en frontale. ADR 024 : statut « approuvé, frontale 2.5D ».

## Mandat SUIVANT — M09 : ville d'exploration HD-2D (préparé le 2026-10-19, démarre après M08 C5)

**LIRE** `docs/missions/M09_VILLE_EXPLORATION_HD2D.md` et, pour la session cloud de 6 heures, `docs/missions/BRIEF_SESSION_CLOUD_2026-10-19.md`. Après la release candidate 0.8 du combat (M08 C5) et seulement si le combat est sain : cadrage de la ville (zones, quartiers, déplacements, entrée en duel), puis laboratoire de caméra comparant vue de dessus inclinée et frontale 2.5D sur un îlot « le Quai la nuit » ; **décision de caméra au responsable**. **Exception d'isolation autorisée par le responsable :** s'inspirer de Cité du Tournoi (`github.com/juniorbattle/RPG-ArtByCode`, même propriétaire), reprendre sa DA et adapter ses techniques (source notée), sans reprendre sa caméra ni développer dans ce dépôt. Personnages génériques (socle V2) ; Aseprite pour les personnages clés plus tard, par amendement de la règle « aucune image externe ».

## Mandat ACTIF — M08 : consolidation du combat (prioritaire, 2026-10-18)

**LIRE EN PREMIER** `docs/missions/M08_CONSOLIDATION_DU_COMBAT.md`. Avant l’extension RPG, le responsable veut « pousser le plus possible notre structure et visuel du gameplay combat » : **C1** pré-génération des personnages (priorité technique suivante ; **livrée** en passe 28, ADR 021 amendement 4 : préparation aux temps morts, jamais pendant un duel, apparition d’un rival ≈ 115–145 → ≈ 7 ms), **C2** environnements de combat variés et déclaratifs (rue, salle de jeu de cartes, bar, arène ; porte de validation sur un premier lieu ; plateau, HUD et cadrage du rival inchangés d’un lieu à l’autre), **C3** duellistes PNJ génériques de la ville sur le socle V2 (gabarits de base et variations subtiles par graine : peau, cheveux, couleurs des vêtements, accessoire, à la manière des dresseurs de Pokémon ; **livré et validé** : passe 29, ADR 023, quatre gabarits validés par le responsable le 2026-10-18, rubrique « Duels de la ville » ; finitions en courbes fluides, sans effet géométrique, à la demande du responsable), **C4** réception de M07. Arbitrage du 2026-10-18 : « vectoriel V2 » conservé comme base graphique, Aseprite non indispensable, quatre rivaux maintenus, portrait du joueur V2 conservé (détails plus tard), V1 retiré seulement après la réception. Règles V3.0/V3.2 et secrets inchangés. **C2, porte de validation livrée** (passe 31, cadrage validé le 2026-10-18, ADR 022) : système de lieux déclaratif (`src/scene/venues/`, gréement de lumières fixe, décors gardés montés et préparés aux temps morts), le décor historique devient **la salle de jeu de cartes** (migrée au pixel près), premier nouveau lieu **la rue (le Quai, la nuit)**, « Duel libre — Kaï » s’y joue ; chaque rencontre déclare son lieu (`Encounter.venue`, défaut salle ; C3 y rattache ses rencontres PNJ). Rue **validée** par le responsable ; **bar (le Fanal, taverne du port) et arène livrés** (passe 33, amendement de l’ADR 022 : « Duel libre — Maëlle » au bar, « Duel libre — Orin » à l’arène, **tous les décors gardés montés**, ≈ 66 Mo de textures, changement de lieu ≈ 3 ms à la première image) ; **bar et arène validés par le responsable le 2026-10-19** sur la planche des quatre lieux (`screenshots/qa/m08/c2/planche-c2-quatre-lieux.png`) : **C2 livré et validé**. **Plateau intégré à la table** (passe 32, amendement 1 de l’ADR 018, option B validée par le responsable) : rangée du rival « au loin » (0,85 fois celle du joueur, plus couchée, descendue), cases incrustées dans le bois avec ombre de contact, cercle de Clash peint recentré entre les rangées (`CLASH_Z`, table commune à tous les lieux), Primaire plus présente que les Secondaires (1,12 fois, double filet doré) ; rangée du joueur, caméra et visage du rival inchangés.

## Mandat M07 : mise en scène du duel et lisibilité (livré L1 à L5, **reçu le 2026-10-19**, clos)

**LIRE EN PREMIER** `docs/missions/M07_MISE_EN_SCENE_ET_LISIBILITE.md`. Le responsable veut : le rival en buste **sans mains** (fait, ADR 017), un **plateau symétrique** entre les deux camps, lisible d’un coup d’œil, avec un tour **guidé** où l’on ne se perd pas dans les actions (fait, ADR 018 : ergonomie de *Duel Links*, mais **rival gardé de face et visible**, pas de portraits dans les coins) ; puis une **mise en scène HD-2D** de la scène entière (table, cartes, personnages, décor, lumière), « comme une pièce de théâtre », sans s’attarder sur les petits éléments (lot 3 fait, ADR 019 : plan de feux, contre-jour, brume, post-traitement mesuré sur les deux GPU). Les écrans hors duel, qualitatifs et dynamiques, forment le lot 4 (cadrage validé le 2026-10-18, ADR 020 : la scène reste le décor, l’image avant le texte, entrées animées). **Lot 5 (décision du 2026-10-18)** : refonte qualitative des personnages et portraits, une vraie identité graphique par adversaire ; porte de validation sur Maëlle en « vectoriel V2 » tracé en code, **direction validée par le responsable le 2026-10-18** puis **étendue aux quatre rivaux** (socle commun `src/scene/figureV2.ts`, une identité par rival dans `src/scene/v2/`, ADR 021) ; passe de finition puis **V2 rendu par défaut** (passe 25 ; V1 retiré dans la RC 0.8, ADR 021 amendement 5) ; **portrait du joueur (HUD bas-gauche) en V2** sur le même socle (passe 26, `src/scene/v2/joueur.ts`, amendement 3 de l’ADR 021). Règles V3.0/V3.2 et secrets inchangés ; composition des HUD et présence du visage du rival conservées (ADR 013, 016). Captures avant / après sur GPU réel à chaque lot, montrées au responsable.

## Mandat M04 → M06 : jeu solo desktop opérationnel (livré, RC 0.6.0-rc.1)

**LIRE EN PREMIER** `docs/missions/M04_M06_PROGRAMME_JEU_OPERATIONNEL.md`, puis les trois contrats M04/M05/M06, l'ADR 013 et l'ADR 016 qui l'amende. Le responsable a **approuvé** le cadrage M03.2 du rival et la composition HUD du duel : vue frontale, visage/buste grand et expressif, vue B inclinée **seulement à la demande** (ADR 016 : la vue frontale reste pendant la pose, cases au format des cartes), centre libre, lumière utile et animations de Clash. **Ne plus refaire cette composition**, optimiser sans sacrifier la présence du rival. **Mobile paysage repoussé, pas prioritaire**. Nouvelle priorité : menu → deck légal → rival → duel → résultats → collection/progression → sauvegarde/reprise → nouvelle rencontre ; puis release candidate desktop testée. Enchaîner autonomement les lots si les tests passent ; aucun nouveau système canonique de monnaie, effets, Sang-froid, Pv normalisés ou ville complète. Développer directement sur `main` suivant la règle ci-dessus, tenir le journal, ne pas masquer les lacunes produit par des effets graphiques.


## Mandat actif depuis 2026-10-16 — M03.1B confidentialité des effets, puis M03.2 fidélité

Lire **`docs/missions/M03_CONTINUATION_DEPUIS_MAIN.md`**, puis `M03_1B_CONFIDENTIALITE_EFFETS_ET_QA.md`, `M03_2_FIDELITE_VISUELLE_RUNTIME.md` et l'ADR 011. **Priorité à la fuite indirecte des noms d'effets de Secondaires camouflées** signalée au JOURNAL passe 4. Les valeurs brutes de score/multiplicateur ont **déjà été protégées sur main** ; ne pas refaire cette passe. Après tests de confidentialité, couvrir Rupture/Dissipation par l'UI, puis peaufiner la fidélité visuelle à la preview M03. **Respecter la règle de branche ci-dessus : développement sur main**, pas sur une ancienne branche. Aucun changement de règle V3.0/V3.2, aucun secret exposé par le journal ou les expressions du rival. Le cadrage visuel M03 reste structurellement approuvé, pas artistiquement finalisé.

## Mandat actif M03 — Preview de référence validée + impact des cartes

Lire `docs/missions/M03_PREVIEW_VALIDEE_HUD_CLASH.md` et inspecter `reference/REFERENCE_VISUELLE_VALIDEE_M03.jpg` **avant de modifier le rendu**. C'est la référence visuelle approuvée pour la composition du duel : **HUD joueur compact bas-gauche, similaire au HUD du rival haut-gauche, centre dégagé, mains lisibles**, modes ASSAUT/GARDE visibles après révélation. La nouvelle animation des Clashes doit être pilotée par les événements et le verdict du moteur M02 ; même le gagnant part à la défausse après sa pose momentanée. Garder Three.js/TS, Art by Code, caméra frontale + inclinée, secret et tests. Les choix M02 contraires à cette direction de présentation sont dépassés, mais **aucune mécanique de gameplay n'est changée**.


## Extension du mandat — M02 : duel face à face

Le mandat M02 approuvé est dans `docs/missions/M02_CONFRONTATION_FACE_A_FACE_ET_LISIBILITE.md` (à lire après `JOURNAL.md`). Il fait évoluer la **présentation**, pas le règlement : la **vue frontale du rival, son visage et sa posture visibles** deviennent le défaut ; la vue inclinée sert aux manipulations, tout en gardant le rival observable. Caméras orchestrées par phases, sans mouvement obligatoire à chaque clic, et **aucune fuite de secrets par expressions ou IA**. Les tells psychologiques exploitant de vraies intentions secrètes et un éventuel Sang-froid sont explicitement hors-scope tant que non ratifiés. Pas de grande production de décors ; art procédural autonome, gameplay + ergonomie prioritaires. Conserver le socle M01 ; travailler sur `main` (voir « Règle de branche »).


## Mandat de production en vigueur — autonomie M01 et Three.js requis

Le responsable autorise une **mission large** : configurer correctement `RPGCards` puis enchaîner de façon autonome jusqu'à un **MVP duel jouable**. **Vite + TypeScript + Three.js obligatoires** en production ; Three.js fournit une scène/rendu même minimal, le moteur est TS pur et les cartes interactives peuvent rester en DOM/CSS/SVG pour l'ergonomie. Ne pas attendre une validation opérateur entre les lots 0–3 si les règles et critères sont respectés. Document de mandat : `PROMPT_CLAUDE_CODE_MISSION_01.md`.

Si un environnement est abordé, les cadrages **tilted top-down** (vue de dessus inclinée) et **perspective frontale 2.5D** sont des pistes autorisées, **non figées**. L'interface de duel et le gameplay passent avant décors/caméras/ville. La palette, la caméra et la direction artistique définitives ne sont pas encore validées. Les décisions structurelles sont tracées en ADR et dans le journal. Développer sur `main` (commits validés, voir « Règle de branche »).


> Cette mission est distincte de RPG-ArtByCode / Cité du Tournoi / RPGThreeJS. Ne pas importer leurs missions, cartes, décors, images, palettages, géométries, shaders ou règles de jeu. Seuls les **principes de production vérifiés** de RPG-ArtByCode sont des exemples à évaluer : art par code, graine, mesure, captures, revue, journal.

## Rôle et autorité

Tu es l'agent de développement principal du **RPG de cartes Les Quatre Voies**. Ta mission initiale : bâtir un système de duel fidèle et testable, une interaction directe sur cartes, et un **pipeline d'art procédural par code**, avec ouverture HD-2D future. Tu ne décides pas seul d'une réécriture des règles ou d'un langage visuel verrouillé.

**Avant TOUT travail, même un audit :** lire ce fichier, `JOURNAL.md` (dernière passe, « A reprendre », « Principes »), `contracts/00_GOUVERNANCE_AUTORITE.md` et les textes adaptés au chantier. Les instructions de la mission explicite de l'utilisateur définissent le chantier du jour ; si elles demandent de déroger à un contrat maître, remonter le conflit, ne pas réécrire sans accord.

**Hiérarchie de vérité :** demande explicite récente du responsable > avenants explicitement approuvés > `contracts/02_CONTRAT_GAMEPLAY_DELTA_V3_2.md` pour ses seules modifications > `source/CONTRAT_REGLES_V3_0_HISTORIQUE.md` > contrats d'architecture et UX (qui ne changent pas les règles) > simulateur de référence > suggestions dans les prompts anciens. Voir gouvernance.

## Non négociable

- Nouveau dépôt isolé ; le développement se fait directement sur `main` (commit + push après typecheck, tests, build). Les sources de référence (`source/`, `contracts/`, `simulator_ref/`) ne sont pas modifiées sans autorisation. Pas de branche provisoire ni de PR, sauf demande explicite.
- TypeScript strict ; moteur de combat pur et déterministe sans DOM, renderer ni timers. Distinguer états privé / public / par joueur, notamment pour les choix tactiques secrets et l'IA.
- Les **17 cartes** (16 identités ordinaires + 1 Signature Primaire seulement), main 4, deux Secondaires persistantes, leurs 3 états, Interférences en une passe, Insight 0..2, règles V3.0 + delta : tests obligatoires.
- Choix des actions de Secondaires **après révélation des Primaires**, secrètement et simultanément. Ne pas inventer une phase d'Interférence réactive supplémentaire.
- UI de duel **clic, glisser-déposer, inspection de cartes, choix contextuels sur le plateau** ; aucun formulaire de sélection comme mécanique centrale.
- Art procédural en code à génération reproductible. Pas de PNG d'ambiance, de modèles 3D, de fonts ou sons externes téléchargés pour contourner la contrainte. Texture Canvas / SVG généré / géométrie / shaders / typographie système autorisés. Toute dépendance importante est justifiée et traçable.
- HD-2D est une **intention d'intégration**, pas une caméra/palette/décor à reproduire depuis l'autre jeu. Ne pas faire le quartier marchand, l'économie de la ville, l'exploration, la construction de monde ou des cinématiques complètes avant validation du slice duel.
- Ne jamais masquer un bug avec du texte ou une animation. Journaliser score, soutien, affinité, raison des 0 dégâts ; respect strict des secrets et de l'ordre de révélation.
- Aucun chiffre inventé présenté comme mesuré, aucune capture fabriquée ; les résultats sont référencés à la commande et au commit exact.

## Workflow de chaque passe

1. Lire les contrats et le dernier journal ; inspecter le dépôt ; `git status`, relever le commit initial ; résumer ce qui existe / manque / est contradictoire.
2. Si le travail est substantiel, proposer un plan découpé (P0-P1...), dépendances, risques, acceptation. Ne pas écrire un énorme « jeu complet » monolithique.
3. Implémenter une tranche verticale **exécutable** et testable, puis tests unitaires / invariants / QA navigateur. Si un outil de capture ou GPU est indisponible, déclarer la limite.
4. Fournir screenshots reproductibles (seed et état public), logs, diff et compte rendu de performance de la machine utilisée quand pertinents. Conserver les preuves utiles dans `artifacts/qa/` ou `screenshots/qa/` après création de ces répertoires.
5. **Avant de terminer la passe, mettre à jour `JOURNAL.md`** : `[OK]`, `[KO]`, `[?]`, preuves, les causes, « Pensée », prochaines actions. Écrire un ADR dans `docs/adr/` pour toute décision d'architecture structurante.
6. Rendre au responsable : commit(s) poussé(s) sur `main`, fichiers touchés, tests exécutés et leur résultat, captures, limites, décisions nécessitant accord, recommandations ordonnées.

## Garde-fous de technique

- Si un framework d'UI est envisagé, argumenter en fonction de la manipulation directe et des flux d'état, sans refondre le moteur.
- Aucun `Math.random()` non contrôlé dans la simulation ni dans la génération visuelle devant être reproductible. Seeds séparées « gameplay » et « art » ; changements de visuel ne modifient pas le tirage de cartes.
- Ne jamais donner à l'IA un accès au plan secret courant du joueur ; elle observe seulement sa vue autorisée.
- L'état gameplay fait autorité ; les animations consomment des événements, ne gouvernent pas les dégâts.
- Qualité : tests de types, unitaires, intégration, et capture navigateur sur 1280×720 / 1920×1080 et un écran tactile étroit. Zoom et police ajustables ; clavier et clic alternatifs au drag.
- Reporter les demandes hors-scope au backlog ; refuser les ajouts « gratuits » qui multiplient fenêtres, états ou ressources.

## Commandes (à rendre réelles, non présupposer existantes)

`npm install` · `npm run dev` · `npm run typecheck` · `npm test` · `npm run build` · `npm run qa:browser` · `npm run shots` · `npm run perf`

Au démarrage, seules les commandes **du simulateur existant** sont avérées, dans `simulator_ref/simulator/` : `npm test`, `npm run dev`, `npm run build`. Les commandes production ci-dessus sont un contrat de livraison pour Claude Code, pas un rapport d'outils déjà opérationnels.

## Serveurs de dev et processus de fond (règle du responsable, 2026-10-17)
- Lancer les serveurs de dev avec l'outil de session `preview_start` et une entrée de `.claude/launch.json` (`dev` sur 5173, `preview` sur 4173) ; pour un nouveau port, ajouter une entrée plutôt que de le lancer à la main. Les arrêter avec `preview_stop`.
- Lancer les scripts longs (`npm run qa:rc`, `qa:browser`, `qa:product`, `perf`, `perf:trace`, `shots*`, `video`…) avec `run_in_background` de l'outil Bash, et les arrêter avec `TaskStop` sur leur identifiant de tâche.
- Ne jamais utiliser `taskkill`, `Stop-Process` ni un balayage des processus du système (`Get-CimInstance Win32_Process`, listes de processus filtrées par ligne de commande) pour retrouver ou arrêter des restes : chaque usage exige l'accord du responsable et peut toucher des programmes sans rapport. Si un processus échappe aux outils (un orphelin qui occupe un port), signaler le port et le PID propriétaire (`Get-NetTCPConnection -LocalPort <port>`) et laisser le responsable décider.
- Avant de terminer une session, arrêter tous les serveurs et tâches de fond qu'elle a lancés.

## Images générées : références seulement (décision du responsable, 2026-10-19)

- Une clé OpenAI est disponible **en local seulement** (`.env.local` du dossier principal, ignoré par git, jamais commité, jamais injecté dans le build : pas de préfixe `VITE_`). Les sessions cloud n'y ont pas accès.
- Les images générées sont des **références de conception** (ville et quartiers, ambiance, essais de caméra, fiches de personnages pour guider le dessin par code ou un futur Aseprite). Elles n'entrent **jamais** dans le jeu ni dans le build : la règle « art par code, aucune image externe au runtime » est inchangée.
- Elles doivent rester **cohérentes avec le thème et l'atmosphère du jeu** : HD-2D théâtral ; nuit à dominante indigo / ardoise, pierre froide, ambre comme seul accent chaud, ivoire désaturé (DA reprise de Cité du Tournoi, M09) ; l'univers des Quatre Voies (familles Cendre, Voile, Ronce, Astre ; le Quai, le Fanal, la salle de jeu de cartes, l'arène ; personnages en « vectoriel V2 »). Pas de style étranger au jeu.
- **Demandes depuis une session sans clé (cloud)** : par git, selon `demandes-images/README.md` ; la session principale génère et commite les images dans `reference/generated/<demande>/` avec leur fiche, au statut « référence de travail, non approuvée » (exception validée par le responsable le 2026-10-19).
- Traçabilité : brouillons dans `art-gen/` (ignoré par git) ; une image approuvée par le responsable est copiée dans `reference/generated/` avec une fiche (prompt, modèle, date, usage).
- Coût : générer seulement pour une tâche en cours, en annonçant le nombre d'images.

## Priorité de la première mission

**M0** cadrage+reconnaissance > **M1** moteur TS normatif > **M2** duel humain/IA ergonomique par cartes > **M3** art procédural pour cartes/effets/arène minimale > **M4** captures+profiling+handoff. Une scène HD-2D à grande échelle n'est pas un livrable de M1.
