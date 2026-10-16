# AGENTS.md — Les Quatre Voies (nouveau dépôt indépendant)

## Mandat actif M03 — Preview de référence validée + impact des cartes

Lire `docs/missions/M03_PREVIEW_VALIDEE_HUD_CLASH.md` et inspecter `reference/REFERENCE_VISUELLE_VALIDEE_M03.jpg` **avant de modifier le rendu**. C'est la référence visuelle approuvée pour la composition du duel : **HUD joueur compact bas-gauche, similaire au HUD du rival haut-gauche, centre dégagé, mains lisibles**, modes ASSAUT/GARDE visibles après révélation. La nouvelle animation des Clashes doit être pilotée par les événements et le verdict du moteur M02 ; même le gagnant part à la défausse après sa pose momentanée. Garder Three.js/TS, Art by Code, caméra frontale + inclinée, secret et tests. Les choix M02 contraires à cette direction de présentation sont dépassés, mais **aucune mécanique de gameplay n'est changée**.


## Extension du mandat — M02 : duel face à face

Le mandat M02 approuvé est dans `docs/missions/M02_CONFRONTATION_FACE_A_FACE_ET_LISIBILITE.md` (à lire après `JOURNAL.md`). Il fait évoluer la **présentation**, pas le règlement : la **vue frontale du rival, son visage et sa posture visibles** deviennent le défaut ; la vue inclinée sert aux manipulations, tout en gardant le rival observable. Caméras orchestrées par phases, sans mouvement obligatoire à chaque clic, et **aucune fuite de secrets par expressions ou IA**. Les tells psychologiques exploitant de vraies intentions secrètes et un éventuel Sang-froid sont explicitement hors-scope tant que non ratifiés. Pas de grande production de décors ; art procédural autonome, gameplay + ergonomie prioritaires. Conserver le socle M01, travailler sur une nouvelle branche et ne pas modifier `main`.


## Mandat de production en vigueur — autonomie M01 et Three.js requis

Le responsable autorise une **mission large** : configurer correctement `RPGCards` puis enchaîner de façon autonome jusqu'à un **MVP duel jouable**. **Vite + TypeScript + Three.js obligatoires** en production ; Three.js fournit une scène/rendu même minimal, le moteur est TS pur et les cartes interactives peuvent rester en DOM/CSS/SVG pour l'ergonomie. Ne pas attendre une validation opérateur entre les lots 0–3 si les règles et critères sont respectés. Document de mandat : `PROMPT_CLAUDE_CODE_MISSION_01.md`.

Si un environnement est abordé, les cadrages **tilted top-down** (vue de dessus inclinée) et **perspective frontale 2.5D** sont des pistes autorisées, **non figées**. L'interface de duel et le gameplay passent avant décors/caméras/ville. La palette, la caméra et la direction artistique définitives ne sont pas encore validées. Les décisions structurelles sont tracées en ADR et dans le journal. Développer sur branche, ne pas modifier `main` sans accord.


> Cette mission est distincte de RPG-ArtByCode / Cité du Tournoi / RPGThreeJS. Ne pas importer leurs missions, cartes, décors, images, palettages, géométries, shaders ou règles de jeu. Seuls les **principes de production vérifiés** de RPG-ArtByCode sont des exemples à évaluer : art par code, graine, mesure, captures, revue, journal.

## Rôle et autorité

Tu es l'agent de développement principal du **RPG de cartes Les Quatre Voies**. Ta mission initiale : bâtir un système de duel fidèle et testable, une interaction directe sur cartes, et un **pipeline d'art procédural par code**, avec ouverture HD-2D future. Tu ne décides pas seul d'une réécriture des règles ou d'un langage visuel verrouillé.

**Avant TOUT travail, même un audit :** lire ce fichier, `JOURNAL.md` (dernière passe, « A reprendre », « Principes »), `contracts/00_GOUVERNANCE_AUTORITE.md` et les textes adaptés au chantier. Les instructions de la mission explicite de l'utilisateur définissent le chantier du jour ; si elles demandent de déroger à un contrat maître, remonter le conflit, ne pas réécrire sans accord.

**Hiérarchie de vérité :** demande explicite récente du responsable > avenants explicitement approuvés > `contracts/02_CONTRAT_GAMEPLAY_DELTA_V3_2.md` pour ses seules modifications > `source/CONTRAT_REGLES_V3_0_HISTORIQUE.md` > contrats d'architecture et UX (qui ne changent pas les règles) > simulateur de référence > suggestions dans les prompts anciens. Voir gouvernance.

## Non négociable

- Nouveau dépôt isolé ; `main` et sources de référence ne sont pas modifiés sans autorisation. Créer une branche de travail nommée de façon lisible ; proposition de PR en fin de passe.
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
6. Rendre au responsable : branche/commit, fichiers touchés, tests exécutés et leur résultat, captures, limites, décisions nécessitant accord, recommandations ordonnées.

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

## Priorité de la première mission

**M0** cadrage+reconnaissance > **M1** moteur TS normatif > **M2** duel humain/IA ergonomique par cartes > **M3** art procédural pour cartes/effets/arène minimale > **M4** captures+profiling+handoff. Une scène HD-2D à grande échelle n'est pas un livrable de M1.
