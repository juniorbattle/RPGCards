# Correspondance des commits après la réécriture de l'historique (2026-11-12, passe 231)

> Ordre du responsable (2026-11-12) : réécrire l'historique pour en retirer les captures déjà sorties du dépôt à la passe
> 230 (1 719 chemins sous `screenshots/`, environ 2,1 Go). Hors de ces captures, le contenu de chaque commit est inchangé,
> et l'arbre de `main` est identique (`7dd43d3dbd0c`) ; seuls les identifiants changent. Le journal, les ADR, les rapports
> et les fiches citent les **anciens** identifiants : cette table donne le **nouveau** commit de chacun, dans l'ordre
> chronologique. Les anciens identifiants n'existent plus dans le dépôt.

| # | Ancien | Nouveau | Date | Message |
|---|---|---|---|---|
| 1 | `04ebd48` | `04ebd48` | 2026-10-15 | chore: initialiser le dépôt RPGCards |
| 2 | `4689056` | `4689056` | 2026-10-15 | chore: import complete Les Quatre Voies production M01 package |
| 3 | `a4d8247` | `a4d8247` | 2026-10-15 | docs: launch autonomous Three.js MVP mission and HD-2D camera options |
| 4 | `e6eab42` | `e6eab42` | 2026-10-15 | docs: refresh SHA256 manifest after updated M01 mission |
| 5 | `83f9384` | `81a9671` | 2026-10-16 | feat(engine): socle Vite+TS strict et moteur de duel pur V3.0 + delta V3.2 |
| 6 | `b3ca579` | `d05aff3` | 2026-10-16 | feat(duel): MVP jouable — plateau DOM manipulable, IA, art procédural, arène Three.js, QA |
| 7 | `9eef5ac` | `d34ef6a` | 2026-10-16 | docs(journal): passe 1 — résultats QA, captures et mesures au commit b3ca579 |
| 8 | `1b9416e` | `0b28d6c` | 2026-10-16 | docs: specify M02 face-to-face duel, phase cameras and procedural rival |
| 9 | `be3dac4` | `80bebdf` | 2026-10-16 | docs: point Claude agents to active M02 confrontation mission |
| 10 | `64aaf8f` | `9d491d7` | 2026-10-16 | docs: point Claude agents to active M02 confrontation mission |
| 11 | `142b437` | `7ec3ae3` | 2026-10-16 | feat(m02): vues A confrontation / B manipulation, rival procédural expressif, conformité Dissimulation |
| 12 | `d4a4baf` | `27efd0c` | 2026-10-16 | feat(m02): séquence de résolution par temps, PV mis en scène, journal par tour, IA à mémoire autorisée et p… |
| 13 | `fea2c8f` | `d335a06` | 2026-10-16 | feat(m02): temps d'observation du rival en début de tour, outils captures/perf M02, ADR 006-008 |
| 14 | `aca18a8` | `6bd303b` | 2026-10-16 | fix(m02): DOM stable pendant la résolution et rendus à la demande fusionnés |
| 15 | `b395c5b` | `2569246` | 2026-10-16 | fix(m02): le regard vers le rival en début de tour s'achève après la première interaction (plus de minuterie) |
| 16 | `a3c3ef5` | `d64298f` | 2026-10-16 | fix(m02): un appui long tactile ouvre l'inspection sans annuler un glisser qui démarre ensuite |
| 17 | `94f8e05` | `478fd5e` | 2026-10-16 | fix(m02): le clic « Tour suivant » n'annule plus le regard vers le rival du tour qu'il lance |
| 18 | `e978d2d` | `059282c` | 2026-10-16 | docs(m02): rapport M02 (QA 4/4 duels, perf), journal passe 2, ADR 006 ; preuves au commit 94f8e05 |
| 19 | `ab61d8a` | `7eb4b59` | 2026-10-16 | docs(m03): approve visual composition, HUD symmetry and clash motion contract |
| 20 | `ac153dc` | `1176711` | 2026-10-16 | docs(m03): add approved visual reference for runtime comparison |
| 21 | `7e5b8b2` | `1ae6760` | 2026-10-16 | docs(m03): activate approved HUD and Clash visual contract |
| 22 | `ca3d1a2` | `26bdb18` | 2026-10-16 | docs(m03): activate approved HUD and Clash visual contract |
| 23 | `54754d7` | `d330c1c` | 2026-10-16 | docs(m03): activate approved HUD and Clash visual contract |
| 24 | `61e2510` | `741b52d` | 2026-10-16 | docs(m03): activate approved HUD and Clash visual contract |
| 25 | `6bac3a8` | `70c2e3c` | 2026-10-16 | feat(m03): composition fidèle à la preview — HUD compacts (rival haut-gauche, joueur bas-gauche avec portra… |
| 26 | `cd7c7c8` | `68dc5e5` | 2026-10-16 | feat(m03): chorégraphies physiques du Clash pilotées par le moteur, bandeaux ASSAUT/GARDE, scénarios de dém… |
| 27 | `6f1b9c7` | `33097ce` | 2026-10-16 | feat(m03): liste des conséquences du Clash (preview « Résolution »), inspection tactile flottante, panneau … |
| 28 | `0a95929` | `1f46bd0` | 2026-10-16 | fix(m03): l'inspection ne s'ouvre plus sur un simple toucher et n'intercepte jamais une cible tactile |
| 29 | `6338311` | `aa82abe` | 2026-10-16 | docs(m03): rapport M03 (QA 4/4, 10 démonstrations de Clash, planches preview/runtime, perf), journal passe … |
| 30 | `ca2e635` | `b104f2d` | 2026-10-16 | fix(engine): le rapport public du Clash ne publie plus la valeur brute d'un soutien camouflé |
| 31 | `2e0f30b` | `4b82daf` | 2026-10-16 | docs(journal): passe 4 — rapport public du Clash sans valeur camouflée ; preuves au commit ca2e635 |
| 32 | `3d09f2c` | `8e48f71` | 2026-10-16 | docs: intégration de M01–M03 dans main sur décision du responsable |
| 33 | `1be9948` | `5a2f74a` | 2026-10-16 | docs: règle de branche — développement direct sur main (CLAUDE.md, AGENTS.md, gouvernance, protocole) |
| 34 | `f2bc6f6` | `d2d2b10` | 2026-10-16 | merge: passe 4 dans main — rapport public du Clash sans valeur camouflée |
| 35 | `55a57f3` | `018100d` | 2026-10-16 | docs: mandate M03.1B concealed-effect safety and M03.2 visual polish on main |
| 36 | `987ff27` | `2f3ccfd` | 2026-10-16 | fix(visibilité): l’origine d’un effet de Secondaire camouflée n’est plus publiée (ADR 011) |
| 37 | `c9e32fe` | `cdb8604` | 2026-10-16 | test(qa): scénarios Rupture / Dissipation / effet camouflé joués par l’interface |
| 38 | `0ab0584` | `1ebc6be` | 2026-10-16 | docs(m03.1b): rapport, journal passe 5, preuves QA (build de c9e32fe) |
| 39 | `e112765` | `9062c2e` | 2026-10-16 | feat(scène): rival rapproché et expressif, arène mieux éclairée, cases lisibles (M03.2) |
| 40 | `d28d340` | `21a0c9f` | 2026-10-16 | feat(clash): présentation allégée — verdict + trois conséquences au plus, défausse montrée sur les cartes (… |
| 41 | `63ae329` | `ccbb8ca` | 2026-10-16 | feat(mobile): interface paysage pour téléphone et petite tablette + QA de rotation en plein tour (M03.2) |
| 42 | `8130d6c` | `5416470` | 2026-10-16 | test(qa): captures comparatives M03.2, planche d'expressions, pellicules explicites, perf du Clash en temps… |
| 43 | `7576d31` | `34903f6` | 2026-10-16 | fix(scène): le vacillement des bougies module autour d'une intensité de base par lumière |
| 44 | `19d3461` | `8326e26` | 2026-10-16 | test(qa): coût mesuré des éléments du décor (ablate, QA seulement) et contraste réel des textes |
| 45 | `1b38b4b` | `c84be05` | 2026-10-16 | fix(lisibilité): aides de case sur pastille sombre translucide (contraste réel ≥ 4,5:1) |
| 46 | `4faa470` | `d9d871b` | 2026-10-16 | test(qa): contraste composé avec l'opacité du texte ; pendant un Clash, mesure du verdict et des conséquences |
| 47 | `26dbbc2` | `38121c1` | 2026-10-16 | test(perf): mesurer un autre build (LQV_DIST + LQV_BUILD_SHA → LQV_PERF_OUT) pour comparer avant / après su… |
| 48 | `84f0e28` | `b327a67` | 2026-10-16 | fix(lisibilité): étiquettes de case sur un voile sombre diffus ajusté au texte |
| 49 | `89e599d` | `7bd5970` | 2026-10-16 | fix(qa): planche d'expressions — constantes déclarées avant la boucle de captures |
| 50 | `3da33dc` | `a6ab9f8` | 2026-10-16 | feat(mobile): libellés de case courts « S1 · PRIMAIRE · S2 » sur petit écran, texte paysage agrandi |
| 51 | `832231b` | `dcc7cf7` | 2026-10-16 | test(qa): qa:techniques — dossier de captures paramétrable (TECH_OUT), preuves M03.1B intactes |
| 52 | `045f1c1` | `fe3a6bf` | 2026-10-16 | test(qa): taille des libellés de case mesurée sur le libellé court (::after) des petits écrans |
| 53 | `ff7c8d3` | `be8b679` | 2026-10-17 | test(perf): comparaison avant / après en rondes entrelacées (médianes), la charge du conteneur variant fort… |
| 54 | `b2fe6f1` | `6fabf40` | 2026-10-17 | perf(scène): lumière peinte au lieu du fill et de la lampe de table ; texels transparents du rival rejetés |
| 55 | `2e833e0` | `6dae796` | 2026-10-17 | test(perf): ablation du décor en rondes entrelacées (médianes) ; variante `fill` retirée avec ces lumières |
| 56 | `dcebd2a` | `55d5a94` | 2026-10-17 | fix(lisibilité): libellé « PRIMAIRE » dégagé — bandeau de posture remonté, rangées portrait abaissées, voil… |
| 57 | `99e03e1` | `d99f0f6` | 2026-10-17 | test(qa): shots-m03-2 — sous-ensemble de cas (M032_ONLY) écrit hors des preuves (M032_OUT) |
| 58 | `110525d` | `0b3627d` | 2026-10-17 | docs(m03.2): rapport, ADR 012, journal passe 6, preuves QA (build de 99e03e1) |
| 59 | `4bfb585` | `7bd4f9e` | 2026-10-16 | docs: lock approved desktop duel composition and mandate autonomous M04-M06 playable RPG |
| 60 | `74085cc` | `c6579fe` | 2026-10-17 | refactor(duel): session de duel démontable, arène unique (setRival/setPaused) |
| 61 | `e05af56` | `75027d9` | 2026-10-17 | feat(produit): flux d’écrans pur, deck légal, sauvegarde versionnée v1, rivaux de prototype |
| 62 | `80bd858` | `24a322c` | 2026-10-17 | feat(jeu): enveloppe M04 — accueil, profil, deck, rencontres, préparation, duel, résultat, aide, options |
| 63 | `9491570` | `8ebd12f` | 2026-10-17 | docs(m04): rapport M04, journal passe 8, preuves QA et captures (build 80bd858) |
| 64 | `e6e54c1` | `586ad4c` | 2026-10-17 | feat(rpg): M05 — série du Quai, duels libres, Orin, déblocages de prototype, sauvegarde v2, reprise exacte |
| 65 | `347af3c` | `c15229f` | 2026-10-17 | docs(m05): rapport M05, ADR 014 (enveloppe, sauvegarde, reprise), journal passe 9, preuves |
| 66 | `d19667e` | `750f1da` | 2026-10-17 | fix(rc): fuite de textures du rival, effets figés en pause, ergonomie de l’enveloppe ; outils QA M06 |
| 67 | `382ad1f` | `202058f` | 2026-10-17 | docs(m06): rapport de release candidate 0.6.0-rc.1, journal passe 10, preuves de la campagne |
| 68 | `64863ac` | `5f97e87` | 2026-10-17 | docs(m06): porte de démarrage revérifiée sur un clone propre du commit final |
| 69 | `b6f0c98` | `1c487a7` | 2026-10-17 | perf(gpu): mesures de la RC sur GPU réel (Radeon 780M, RTX 4060) ; journal passe 11 |
| 70 | `90a7798` | `0dd911a` | 2026-10-17 | perf(fluidité): à-coups du duel tracés sur GPU réel ; programmes FX gardés, illustrations sur canvas proces… |
| 71 | `4ccce89` | `486d888` | 2026-10-17 | docs(passe12): gain de génération des illustrations chiffré comme mesuré (1,3× poste calme, 1,9× sous charge) |
| 72 | `68ebe4b` | `1a7df5d` | 2026-10-17 | perf(rendu): re-rendu ciblé du plateau — seuls les nœuds changés sont touchés ; journal passe 13 |
| 73 | `62f0232` | `986c83c` | 2026-10-17 | feat(duel): vue frontale pendant la pose, cases au format des cartes (ADR 016) ; journal passe 14 |
| 74 | `56efb70` | `8c9509a` | 2026-10-17 | docs(agents): règle des serveurs de dev et processus de fond ; launch.json commun |
| 75 | `2c2e014` | `9cf2e68` | 2026-10-17 | perf(illustrations): catalogue pré-généré dans un worker, hors du fil principal ; journal passe 15 |
| 76 | `8630446` | `326dd81` | 2026-10-17 | feat(rival): M07 lot 1 — rival en buste sans mains (ADR 017) ; mandat M07 ; journal passe 16 |
| 77 | `4a72a76` | `f4f0830` | 2026-10-17 | fix(ui): panneau d'infos de carte à gauche, entre les deux HUD (retour du responsable) |
| 78 | `fc72f28` | `ee90e22` | 2026-10-17 | feat(plateau): M07 lot 2 — plateau symétrique et tour guidé (ADR 018) ; journal passe 17 |
| 79 | `af501a9` | `0ed4d1a` | 2026-10-18 | feat(scene): M07 lot 3 — mise en scène HD-2D du face-à-face (ADR 019) ; journal passe 18 |
| 80 | `e5b75de` | `6c03381` | 2026-10-18 | feat(scene): repli automatique du post-traitement quand le rendu décroche (amendement ADR 019) |
| 81 | `224e27e` | `155afc9` | 2026-10-18 | fix(outils): chronométrage GPU de perf-compare sur le canvas de l'arène ; charge GPU et intervalles |
| 82 | `5743df9` | `eb3091d` | 2026-10-18 | docs(adr019): amendement — repli automatique du post-traitement ; journal passe 19 ; preuves |
| 83 | `c4041da` | `5927049` | 2026-10-18 | feat(ecrans): M07 lot 4 — écrans hors duel qualitatifs et dynamiques (ADR 020) ; journal passe 20 |
| 84 | `bde9f81` | `bc5530d` | 2026-10-18 | docs(adr020): arbitrage du responsable — cartes débloquées gardées en images sur le résultat |
| 85 | `6fdd27b` | `a040f80` | 2026-10-18 | fix(qa-rc): J longévité — relevé après l'image du nouveau rival ; journal passe 21 |
| 86 | `2932ac4` | `5515371` | 2026-10-18 | fix(qa-browser): 4b — fondu de défausse de la scène du Clash toléré, borné par son délai réel ; journal pas… |
| 87 | `049baab` | `342f7ad` | 2026-10-18 | feat(personnages): M07 lot 5 — porte de validation, Maëlle en « vectoriel V2 » derrière ?qa=1&figure=v2 (AD… |
| 88 | `6e60f38` | `e4a4403` | 2026-10-18 | Merge remote-tracking branch 'origin/main' into claude/distracted-nash-795348 |
| 89 | `5ae6b88` | `7e009fc` | 2026-10-18 | docs(journal): passe 23 — M07 L5, porte de validation Maëlle V2 ; qa:browser 5/5 sur le build fusionné |
| 90 | `7f31a50` | `ea48c58` | 2026-10-18 | feat(personnages): M07 L5 — « vectoriel V2 » généralisé à Kaï, Sélène et Orin (socle commun + une identité … |
| 91 | `89b17a2` | `c0332c0` | 2026-10-18 | feat(personnages): M07 L5 — passe de finition V2 et V2 rendu par défaut des quatre rivaux (ADR 021, amendem… |
| 92 | `b1e5ecc` | `e926882` | 2026-10-18 | feat(personnages): M07 L5 — portrait du duelliste joueur en « vectoriel V2 » (ADR 021, amendement 3) ; jour… |
| 93 | `bb0535b` | `3c4bd3a` | 2026-10-18 | docs(m08): mandat « consolidation du combat » — arbitrage de la suite de L5, décors variés, duellistes PNJ … |
| 94 | `96d6b6c` | `3e7424c` | 2026-10-18 | feat(personnages): M08 C1 — pré-génération des rivaux aux temps morts (couches, rig, textures au GPU), prog… |
| 95 | `ceadc0f` | `c0d87a1` | 2026-10-18 | feat(lieux): M08 C2 — système de lieux déclaratif, salle migrée au pixel près, rue « le Quai, la nuit » |
| 96 | `9d5774b` | `de54a33` | 2026-10-18 | fix(personnages): M08 C1 — libération de l’ancien rig étalée aux temps morts (plus d’image retardée après l… |
| 97 | `90ad697` | `25d16d6` | 2026-10-18 | fix(personnages): M08 C1 — préparations devenues inutiles libérées aux temps morts |
| 98 | `1e7ef20` | `e3c6ef8` | 2026-10-18 | fix(personnages): M08 C1 — file de libération à une étape par tranche d’inactivité |
| 99 | `1a5d94b` | `ffd47e2` | 2026-10-18 | fix(lieux): préparation des programmes sans compilation parallèle — compile synchrone quand KHR_parallel_sh… |
| 100 | `ba39a43` | `784b9d2` | 2026-10-18 | docs(m08): C1 livré — pré-génération des personnages mesurée sur les deux GPU ; ADR 021 amendement 4 ; jour… |
| 101 | `055b9e3` | `eb79f62` | 2026-10-18 | docs(m08): C2 porte de validation — ADR 022 (lieux déclaratifs), planche salle / rue, preuves et mesures ; … |
| 102 | `3c1144b` | `3f0dff8` | 2026-10-18 | Merge remote-tracking branch 'origin/main' into claude/upbeat-wiles-7cf2ec |
| 103 | `ec9fa4b` | `65870d0` | 2026-10-18 | feat(pnj): M08 C3 — duellistes PNJ de la ville sur le socle V2 (porte de validation, ADR 023) ; journal pas… |
| 104 | `6b55bd8` | `00d7214` | 2026-10-18 | docs(m08): C2 — vérifications après fusion de C1 (identité au pixel près contre ba39a43, qa:rc 9/9, qa:brow… |
| 105 | `ec1c9d2` | `a13807f` | 2026-10-18 | Merge remote-tracking branch 'origin/main' into claude/upbeat-wiles-7cf2ec |
| 106 | `34747e2` | `0f58a10` | 2026-10-18 | feat(rival): support de l’éventail de cartes posé sur la table (demande du responsable) ; ADR 017 amendé ; … |
| 107 | `8f9b9ba` | `d027941` | 2026-10-18 | docs(m08): C3 validé — quatre gabarits PNJ approuvés par le responsable (ADR 023 approuvé) ; journal |
| 108 | `3d8cc66` | `e790e4b` | 2026-10-18 | Merge remote-tracking branch 'origin/main' into claude/upbeat-wiles-7cf2ec |
| 109 | `d018915` | `18b242a` | 2026-10-18 | docs(m08): C2 — vérifications après fusion de C3 et de la passe 30 (identité au pixel près contre ec9fa4b p… |
| 110 | `21a53a2` | `aca9e48` | 2026-10-18 | feat(lieux): M08 C2 — le bar (le Fanal, taverne du port) et l'arène, quatre décors gardés montés |
| 111 | `be9ca98` | `22b1d6e` | 2026-10-19 | feat(plateau): cases intégrées à la table, rangée du rival au loin, Primaire plus présente (option B validé… |
| 112 | `146e181` | `f084b24` | 2026-10-19 | Merge remote-tracking branch 'origin/main' into claude/upbeat-wiles-7cf2ec |
| 113 | `1aa9872` | `c4d4fe5` | 2026-10-19 | fix(lieux): M08 C2 — décor préparé aux temps morts : géométries envoyées au GPU |
| 114 | `26a8c53` | `6e24aae` | 2026-10-19 | docs(m08): C2 — bar et arène livrés (amendement de l'ADR 022), planche des quatre lieux ; règle des campagn… |
| 115 | `de25754` | `646a33a` | 2026-10-19 | docs(m08): C2 validé — bar et arène approuvés par le responsable (ADR 022, mission M08, journal passe 33) |
| 116 | `c40bed4` | `a8ef34d` | 2026-10-19 | docs(m08): « Duels de la ville » dans la rue reporté par le responsable ; audit de situation ; journal pass… |
| 117 | `bbf890e` | `c1414c8` | 2026-10-19 | docs(arbitrages): décisions du responsable du 19 octobre — M07 reçu, ARB-001/002/005/005b/011 et D-01 (V3.3… |
| 118 | `9203e53` | `7751cd7` | 2026-10-19 | docs(m09): mission « ville d'exploration HD-2D » et brief de la session cloud de 6 heures (validés par le r… |
| 119 | `18dc610` | `f61b4ca` | 2026-10-19 | docs: images générées en références seulement (AGENTS) ; brief cloud en mode autonome, V2 provisoire ; .env… |
| 120 | `32620c2` | `60dc414` | 2026-10-19 | docs(brief cloud): contraintes de l'environnement cloud — tour actif, commandes longues, push fréquent, réseau |
| 121 | `4a30504` | `304aa21` | 2026-10-19 | docs(images): canal de demandes d'images par git (demandes-images/) ; références « le Quai la nuit » pour l… |
| 122 | `21632b8` | `a4c9570` | 2026-10-19 | feat(c5): « Duels de la ville » joués dans la rue (venue 'rue' pour TOWN_DUELS) ; test et vérification cibl… |
| 123 | `38b32a8` | `05f4adc` | 2026-10-19 | fix(c5): contraste du chiffre de rang des vignettes de l’éditeur de deck (pastille sombre propre au chiffre) |
| 124 | `401fb47` | `ed06eb1` | 2026-10-19 | docs(images): demande « marcheur et façades du Quai » (M09 V1/V2, 4 images de référence) |
| 125 | `296ee71` | `b750238` | 2026-10-19 | docs(m09): V0 — cadrage de la ville d'exploration (zones, déplacements, entrée en duel, lieux, fil du Tourn… |
| 126 | `8572569` | `b46acd7` | 2026-10-19 | docs(images): livraison « marcheur et façades du Quai » (4 références, gpt-image-2) |
| 127 | `c959b4e` | `25d0348` | 2026-10-19 | docs(m09): décision du responsable — caméra d'exploration frontale 2.5D (vue inclinée abandonnée) ; journal… |
| 128 | `f25659c` | `8aa9dc0` | 2026-10-19 | docs: canal d'images fermé (poste du responsable éteint) — session cloud en autonomie complète ; journal pa… |
| 129 | `0f8c20a` | `923ea8d` | 2026-10-19 | refactor(c5): retrait du rendu V1 des personnages (paramètre figure, textures V1, branches du rig et des po… |
| 130 | `f25aa0b` | `f825fbd` | 2026-10-19 | Merge branch 'main' of https://github.com/juniorbattle/RPGCards |
| 131 | `42f4562` | `e1873ee` | 2026-10-19 | chore(c5): version 0.8.0-rc.1 ; portraits des affiches préchauffés un par temps mort après la première imag… |
| 132 | `66b7997` | `2a6337a` | 2026-10-19 | feat(m09): ville d'exploration — îlot « le Quai, la nuit » en frontale 2.5D (ADR 024), laboratoire ?ville=1… |
| 133 | `9b420b6` | `6621310` | 2026-10-19 | feat(m09): démo de la ville — second îlot (le Parvis de l'arène), liaisons avec fondu, repères « ! » / « ? … |
| 134 | `6b67271` | `b986263` | 2026-10-19 | feat(rc08): piste ?qa=1&compileAsync=1 (premier rendu après compilation non bloquante, à mesurer sur GPU) ;… |
| 135 | `e934f7a` | `f50b832` | 2026-10-19 | feat(m09): troisième îlot de la démo — les Ruelles du Voile (Sélène, fontaine, linge tendu, canal), reliées… |
| 136 | `cc7de58` | `9ae2361` | 2026-10-19 | docs(rc08): campagne de QA complète du jalon verte au premier passage (qa:browser 5/5, qa:product 9/9, qa:r… |
| 137 | `ed6dfdf` | `eef125a` | 2026-10-19 | docs(rc08,m09): démarrage du build final mesuré en rondes alternées (accueil interactif ≈ 6 s plus tôt en S… |
| 138 | `b128bd9` | `05f330b` | 2026-10-19 | fix(m09): sans WebGL, la démo ?demo=1 reste le jeu habituel (le tableau des rencontres n'apparaissait jamai… |
| 139 | `d76651f` | `2dd03b7` | 2026-10-19 | docs(rc08): preuve au pixel près reprise sur le dernier build (b128bd9) ; bande transitoire de l'écran Renc… |
| 140 | `14548ac` | `59607da` | 2026-10-19 | docs(m09): bilan de la séance cloud en tête de la fiche d'arbitrages ; en-tête du journal |
| 141 | `8559539` | `e92c9ad` | 2026-10-19 | fix(m09): Sélène en marcheuse coiffée de son diadème d'argent (identité V2) et non du bandeau du joueur ; p… |
| 142 | `e74189c` | `87d5a89` | 2026-10-19 | docs(readme): démo à trois îlots, npm run qa:demo et qa:ville, laboratoire ?ville=1&ilot=… |
| 143 | `93cdd59` | `e2be47f` | 2026-10-19 | test(m09): parcours de la démo réglable en taille (LQV_VP) ; 30/30 en 1920×1080 |
| 144 | `c9c3b86` | `687b4d0` | 2026-10-19 | docs: retour de la session cloud du 2026-10-19 à la session principale (état, à faire en local, choix de la… |
| 145 | `421a9b6` | `2c6d867` | 2026-10-19 | qa(rc08): mesures locales sur GPU réel et Windows (démarrage, fluidité, contraste, ville, Rencontres) ; jou… |
| 146 | `dd7b3b9` | `f2015b8` | 2026-10-19 | docs(journal): passe 43 réécrite (texte corrompu par le shell au commit précédent) |
| 147 | `7796e8b` | `f4ed476` | 2026-10-19 | feat(rc08): compilation non bloquante du premier rendu par défaut (décision C3) ; délais propres des longs … |
| 148 | `e99770f` | `44ca42b` | 2026-10-19 | feat(m09-v3): passe de qualité visuelle du Quai (plans de profondeur, façades détaillées, nuit plus riche, … |
| 149 | `b853e5b` | `f3851c1` | 2026-10-19 | feat(m09-v3): direction artistique D sur le Quai (décor encré comme une illustration de carte, couleurs des… |
| 150 | `cdd1a6f` | `3077cd6` | 2026-10-19 | feat(m09-v3): Quai, profondeur de champ, flaques et port en reflet, décors du centre (ADR 026 amendement 1)… |
| 151 | `d2b266a` | `e85a109` | 2026-10-19 | refactor(m09-v3): grammaire de façade de la direction D en module commun (grammaire.ts), extraite du Quai |
| 152 | `da45dd3` | `bc35bba` | 2026-10-19 | docs(m09): cadrage de la régénération des personnages de la ville (Aseprite et/ou gpt-image-2) ; journal pa… |
| 153 | `e1ba9e3` | `c66d0f3` | 2026-10-19 | feat(m09-v3): le Parvis et les Ruelles dans la direction D, grammaire du Quai (ADR 026 amendement 2) ; jour… |
| 154 | `130e5fa` | `4b0ba7b` | 2026-10-19 | docs(m09-v3): le Parvis et les Ruelles validés par le responsable, les trois îlots validés dans la directio… |
| 155 | `1b3433c` | `4d8afa7` | 2026-10-19 | docs(m09): fiche d'arbitrages interactive des personnages de la ville publiée (D1 à D10, R1, R2) ; lien con… |
| 156 | `6a37aea` | `34f8888` | 2026-10-19 | docs(m09): personnages de la ville, décisions du responsable consignées (ADR 027 approuvé, AGENTS amendé) ;… |
| 157 | `809bad3` | `1b7e012` | 2026-10-19 | feat(m09-personnages): code préalable à la porte du duelliste joueur (ADR 027) ; journal passe 52 |
| 158 | `da30fd6` | `4763824` | 2026-10-19 | docs(m09): direction artistique de la ville non validée par le responsable ; orientation HD-2D stylisé et g… |
| 159 | `245a661` | `59839c9` | 2026-10-19 | docs(m09): nouvelle direction de la ville consignée — HD-2D stylisé en images générées, la Grande Cour (ADR… |
| 160 | `77beaf7` | `f56bca0` | 2026-10-19 | feat(m09-v4): code préalable à la porte du Quai — plans de décor (diorama tout ou rien) et feuilles en pixe… |
| 161 | `2ae4c81` | `abb88b0` | 2026-10-19 | feat(m09-v4): essai technique de la porte du Quai — 2 images gpt-image-2 traitées par scripts, vérifiées en… |
| 162 | `caaae7e` | `f4a3142` | 2026-10-19 | feat(m09-v4): porte du Quai — diorama de sept plans et feuille du joueur en pixel art (10 images gpt-image-… |
| 163 | `76280a4` | `5c646c2` | 2026-10-19 | docs(m09-v4): décision du responsable consignée (production lancée, images non approuvées) ; planche de déc… |
| 164 | `b35a83a` | `f986fd4` | 2026-10-19 | feat(m09-v4): emblèmes du jeu posés par script sur les bannières générées ; retours du responsable consigné… |
| 165 | `58bf16b` | `be6050e` | 2026-10-19 | feat(m09-v4): profondeur du Quai, cadrage élargi dans le diorama, feuille du joueur en 64 × 96 (4 images gp… |
| 166 | `30f5b28` | `d4b0743` | 2026-10-19 | feat(m09-v4): fiche d'arbitrages du responsable consignée et appliquée : emblèmes brodés par script, lumièr… |
| 167 | `85d20ab` | `51b42c5` | 2026-10-20 | feat(m09-v4): profondeur praticable : conception proposée au responsable, preuve jouable au laboratoire (Qu… |
| 168 | `8a22f5f` | `c47476f` | 2026-10-20 | feat(m09-v4): profondeur praticable retenue par le responsable ; zones arrière du Quai profond améliorées p… |
| 169 | `f588425` | `716acb6` | 2026-10-20 | feat(m09-v4): Quai profond : quartier continu au lieu d'un décor isolé (rue haute pleine largeur, meublée, … |
| 170 | `f2f9348` | `b8bc862` | 2026-10-20 | fix(m09-v4): bâtiment du premier rang transparent à 12 % comme l'image jointe par le responsable ; emprise … |
| 171 | `3a7492e` | `2a73b75` | 2026-10-20 | feat(m09-v4): quartiers en rangs : grammaire commune, le Quai en quatre rangs au laboratoire (ruelles qui d… |
| 172 | `9a773a9` | `7cd46f2` | 2026-10-20 | feat(m09-v4): kit des quartiers en rangs : 5 images générées (21 sur 30), traitées par script et posées dan… |
| 173 | `0701e59` | `bb83c5d` | 2026-10-20 | fix(m09-v4): Quai en rangs cohérent (façades entières, murs sous les toits, cœur intégré, fantômes assourdi… |
| 174 | `6fc3492` | `f7167c4` | 2026-10-20 | docs(m10): ratify player-chosen family recruitment option B; frame neutral prologue as pending rules |
| 175 | `7da61b6` | `431a688` | 2026-10-20 | docs: reconcile concurrent M09 pass 67 journal and Claude entry with M10 framing |
| 176 | `1ff51c9` | `15bf365` | 2026-10-20 | docs(m10): ratify 16 neutral starter cards as four copies of each rank I-IV |
| 177 | `71614c0` | `d8ed12f` | 2026-10-20 | feat(m09-v4): Quai en rangs : chemins lumineux posés sur les pavés (sans flèche), ombres au sol ; rangs tra… |
| 178 | `d4e379b` | `99333c8` | 2026-10-20 | Merge remote-tracking branch 'origin/main' into claude/sharp-leakey-981504 |
| 179 | `cf2e3c7` | `2650978` | 2026-10-20 | docs: la tâche narrative passe en premier, sur le cloud ; M09 en pause après la passe 68 (décision du respo… |
| 180 | `23bda2c` | `fa7a7f5` | 2026-10-20 | docs(m10): ratify family Basic grants, lieutenant variants and chief Signatures |
| 181 | `508b8e7` | `6a07939` | 2026-10-20 | docs(m10): align narrative, agents and journal with family reward ADR 031 |
| 182 | `255820c` | `0cf977e` | 2026-10-20 | docs(m10): brief de la session cloud validé par le responsable (contrats M10 d'abord, puis prologue jouable… |
| 183 | `a80340e` | `e34f52e` | 2026-10-20 | docs(m10): contrat narratif (prologue, recrutement, hiérarchie des familles, rival) et avenant M10-A proposés |
| 184 | `7ae6f32` | `16c6243` | 2026-10-20 | docs(m10): progression et Championnat, ville et directeur des rencontres, feuille de route M10-A à M10-F, i… |
| 185 | `29976e7` | `ab5bc3b` | 2026-10-20 | feat(m10-b): logique pure du mode Aventure (prototype) — machine d'états des familles, registre des gains i… |
| 186 | `b622fa7` | `f18d168` | 2026-10-20 | feat(m10-b): prototype jouable du prologue derrière ?aventure=1 — écran titre, ville M09 réutilisée, Kaï et… |
| 187 | `870038c` | `c9a4b4a` | 2026-10-20 | docs(m10): preuve hors dépôt du patch M10-A (neutres dans le moteur : 305 tests inchangés et verts, 5 tests… |
| 188 | `aa79398` | `231db9a` | 2026-10-20 | feat(m10): compétitions facultatives (Épreuves du quartier, Joutes de la maison : variantes I et II) et squ… |
| 189 | `8401c7c` | `c734991` | 2026-10-20 | feat(m10): une variante gagnée est équipée à la place de sa Basic (cadrage M10) ; journal passes 72 et 73 |
| 190 | `dc364ba` | `f2b1449` | 2026-10-20 | feat(m10): répliques propres aux douze figures ; textes sans présumer le genre du joueur |
| 191 | `d465145` | `83c3ca7` | 2026-10-20 | docs(m10): fiche d'arbitrages complétée (ARB-M10-11 accord des textes ; ce que la phase 2 a révélé) ; retou… |
| 192 | `011bf38` | `7d601f1` | 2026-10-20 | fix(m10): accord des organisateurs d'Épreuve et champions de Joute selon leur gabarit |
| 193 | `3d45678` | `9fca33f` | 2026-10-20 | qa(m10): captures du parcours ?aventure=1 (1280 × 720 avec et sans images de la ville, sélection en 1920 × … |
| 194 | `2826fd1` | `c845aa6` | 2026-10-20 | docs(m10): PV du Championnat alignés sur la mesure ; retour à jour des vérifications |
| 195 | `96d6f5d` | `fc07d34` | 2026-10-20 | qa(m10): campagne de QA complète au build 011bf38, verte au premier passage (qa:browser 5/5, qa:product 9/9… |
| 196 | `2741dc2` | `3c316a8` | 2026-10-20 | qa(m10): parcours navigateur de la Joute et du Championnat (qa:championnat, 13/13) avec le crochet QA qaFai… |
| 197 | `fc28822` | `e71d6dd` | 2026-10-20 | docs(m10): mesure de la durée du duel inaugural selon les PV (60, 50, 40) ; 50 PV recommandés |
| 198 | `0d858a5` | `adad0b9` | 2026-10-20 | feat(m10): préparation avec le deck d'aventure réel face au deck de prêt, répliques de Kaï selon son arc, h… |
| 199 | `e234a2f` | `00c09d3` | 2026-10-20 | qa(m10): vérifications finales au build 0d858a5 (jeu par défaut identique au pixel près, qa:demo 30/30) ; r… |
| 200 | `e361fa2` | `0eed1ce` | 2026-10-20 | qa(m10): prototype ?aventure=1 vérifié sur GPU réel (780M et RTX 4060, 1280 et 1920, décor par code : 5 × 4… |
| 201 | `63b49c0` | `26cd10d` | 2026-10-20 | qa(m10): moteur de rendu réel de chaque parcours qa:aventure local (rendus.json) ; journal passe 74 précisé |
| 202 | `72c2eeb` | `b62f85d` | 2026-10-20 | docs(m10): décisions du responsable consignées (fiche M10 : garde du Clash autorisée pour les neutres, aven… |
| 203 | `6468a71` | `e7dd8e5` | 2026-10-20 | docs(m10): texte canonique de l'avenant M10-A soumis au responsable (AV-00 à AV-13, différences avec l'aven… |
| 204 | `a3c6614` | `11675b9` | 2026-10-20 | docs(m10): journal passe 76 (texte canonique de l'avenant M10-A soumis) |
| 205 | `904d14f` | `a157472` | 2026-10-20 | feat(m10a): les cartes neutres jouent en duel (garde family !== null dans clash.ts autorisée par l'ARB-M10-… |
| 206 | `b0f004f` | `85ff6db` | 2026-10-20 | feat(m10a): le deck R-AV réel remplace le deck de prêt (prologue en cartes grises des deux côtés, deck d'av… |
| 207 | `9a7f041` | `ea0f6e0` | 2026-10-20 | feat(m10a): paliers de decks adverses selon le niveau du joueur et PV du joueur qui montent à chaque combat… |
| 208 | `8a965fc` | `8de96b9` | 2026-10-20 | feat(m10a): écriture neutre partout dans le mode Aventure (aucun accord de genre pour le duelliste joueur, … |
| 209 | `362153a` | `f5da8ac` | 2026-10-20 | feat(m10a): l'aventure se joue dans le Quai en quatre rangs (ARB-M10-12) : figures, directeur et prologue p… |
| 210 | `3e5a39a` | `a5a7d87` | 2026-10-20 | qa(m10a): jalon vert sur GPU réel (780M et RTX 4060, 1280 et 1920 : jeu par défaut identique au pixel près,… |
| 211 | `69d2c01` | `27aa452` | 2026-10-20 | docs(m10a): décisions du responsable consignées (fiche du lot M10-A, 9 choix sur l'option recommandée) ; av… |
| 212 | `5306392` | `0afcf3a` | 2026-10-20 | feat(m10c): identités « vectoriel V2 » des quatre chefs de famille (Bran, Mère Aubépine, Ilse, Halvard ; AD… |
| 213 | `a3c7d76` | `37e7c79` | 2026-10-20 | feat(m10c): écran Deck et collection de l'aventure (éditeur case par case en deux colonnes, Collection avec… |
| 214 | `a110ff9` | `03c3ce6` | 2026-10-20 | qa(m10c): jalon vert sur GPU réel (780M et RTX 4060, 1280 et 1920 : jeu par défaut identique au pixel près,… |
| 215 | `94bd977` | `b08e377` | 2026-10-20 | docs(m10c): décisions du responsable consignées (fiche du lot M10-C, 5 choix sur l'option recommandée) : id… |
| 216 | `7ef4f82` | `ea19f61` | 2026-10-20 | feat(m10d): engagement officiel consolidé dans la machine de l'aventure (bannières de la Salle, aperçu de l… |
| 217 | `eef4c3a` | `294eb20` | 2026-10-20 | feat(m10d): la Salle des Bannières en quatre bannières et l'écran de confirmation de l'engagement (Basics d… |
| 218 | `f48f258` | `1048909` | 2026-10-20 | qa(m10d): jalon vert sur GPU réel (Radeon 780M et RTX 4060, 1280 et 1920 : jeu par défaut identique au pixe… |
| 219 | `7f27591` | `e643322` | 2026-10-20 | docs(m10d): décisions du responsable consignées (fiche du lot M10-D, 5 choix sur l'option recommandée) : éc… |
| 220 | `d6acb36` | `cd082e1` | 2026-10-20 | feat(m10d): décision D1 appliquée : le niveau du joueur, qui règle les decks adverses, ne compte que les fa… |
| 221 | `9f6f452` | `67897ee` | 2026-10-21 | feat(m09): reprise de M09, étape 1 : le Parvis et les Ruelles en quatre rangs et la Grande Cour (V5) en pla… |
| 222 | `cfcb6fb` | `ef9748e` | 2026-10-21 | feat(m09): lot des villes généré (6 images, 27 sur 30, après l'accord du responsable), traité par script (d… |
| 223 | `a2a2892` | `d7e9dcf` | 2026-10-21 | feat(m09): feuille du joueur refaite (J1, 1 image, 28 sur 30, réserve non générée), traitée par script (con… |
| 224 | `0790b6c` | `958ec2d` | 2026-10-21 | qa(m09): jalon de la reprise vert sur GPU réel (Radeon 780M et RTX 4060, 1280 et 1920 : jeu par défaut iden… |
| 225 | `0f2ef8d` | `c6914b6` | 2026-10-21 | docs(m09): décisions du responsable consignées (fiche de la reprise, 11 choix) : Parvis, Ruelles, Grande Co… |
| 226 | `2cc5757` | `967114a` | 2026-10-21 | feat(m09): la démo ?demo=1 dans la ville en rangs (décision P1 du responsable) : décision commune à l'avent… |
| 227 | `7af3eab` | `967b7d5` | 2026-10-21 | feat(m10e): étape 1, le directeur des rencontres dans la ville en rangs : places des rangs du fond et de la… |
| 228 | `0ef9015` | `c8eb169` | 2026-10-21 | feat(m10e): étape 2, le Championnat des Champions : contraintes vérifiées dans la logique pure (manche, Sig… |
| 229 | `ce75011` | `e753fd1` | 2026-10-21 | feat(m10e): étape 3, la ville vivante : un membre de chaque famille dans les rangs de son quartier (duel de… |
| 230 | `b1dc0c5` | `63f0ce0` | 2026-10-21 | test(m10e): étape 4, la ville vivante au navigateur (npm run qa:vivante : la Grande Cour par la cour de la … |
| 231 | `119399b` | `8f1d127` | 2026-10-21 | docs(m10e): décisions du responsable consignées (fiche du lot M10-E, 12 choix) : ville vivante reçue avec r… |
| 232 | `d399b48` | `19838bc` | 2026-10-21 | feat(m09): A1 fait, les 20 planches à approved: true sur ordre explicite du responsable (fiche du lot M10-E… |
| 233 | `f7339ad` | `1accc86` | 2026-10-21 | docs(journal): passe 104, retrait d'une affirmation non vérifiée (le laboratoire hors QA) |
| 234 | `55ab7eb` | `cf359f7` | 2026-10-24 | docs(v33): étape 1, avenant 07 « la Garde réduit sans annuler » PROPOSÉ et soumis au responsable (contracts… |
| 235 | `bb048f9` | `bc38898` | 2026-10-24 | test(v33): mesures « avant » de l'aventure et du Championnat (tools/m10a-paliers.ts 150 : taux de victoire … |
| 236 | `c1b5c9a` | `ee6f8dc` | 2026-10-24 | docs(v33): avenant 07 révisé après la correction du responsable (option A confirmée, priorité inchangée ; p… |
| 237 | `0680cc5` | `d7098ae` | 2026-10-24 | feat(v33): règle V3.3 appliquée, la Garde réduit sans annuler (avenant 07 validé par le responsable et vers… |
| 238 | `afaa995` | `71ee5ee` | 2026-10-24 | test(v33): étape 3, mesures d'équilibre avant / après sur les mêmes graines (artifacts/qa/v33/comparaison.m… |
| 239 | `45f7004` | `9ef52b5` | 2026-10-24 | test(v33): jalon de QA vert sur la Radeon 780M et la RTX 4060 en 1280 et 1920 (jeu par défaut identique au … |
| 240 | `6415609` | `8141be7` | 2026-10-24 | docs(v33): avenant 08 « visibilité des Signatures » PROPOSÉ et soumis au responsable (annonce face visible … |
| 241 | `e987d45` | `88aad3c` | 2026-10-24 | feat(v33): avenant 08 versé (validé par le responsable avec les quatre recommandations de S-07) ; ordre de … |
| 242 | `79b7638` | `e483183` | 2026-10-24 | feat(v33): avenant 08 appliqué, une Signature engagée est annoncée face visible dès son verrouillage, mode … |
| 243 | `646139e` | `f9fa2d9` | 2026-10-24 | test(v33): parcours navigateur de l'annonce des Signatures (tools/v33-annonce.mjs, 10 contrôles) ajouté au … |
| 244 | `9e459cc` | `0bc6b30` | 2026-10-24 | test(v33): avenant 08, mesures avant / après (adversaire en premier, mêmes graines) : chefs et Championnat … |
| 245 | `12537a6` | `16e785d` | 2026-10-24 | docs(v33): avenant 08, amendement 1 PROPOSÉ et soumis au responsable : révision unique et définitive du jou… |
| 246 | `916639d` | `683d319` | 2026-10-24 | feat(v33): avenant 08, amendement 1 appliqué (validé par le responsable, pour les deux camps) : révision un… |
| 247 | `5e31c23` | `b1f7f53` | 2026-10-24 | docs(v33): clôture de la session de la règle V3.3 : jalon de l'avenant 08 arrêté après 21 parcours sur 24, … |
| 248 | `64a3cdc` | `23cc5bb` | 2026-10-24 | docs(v33): jalon de l'avenant 08 complet et vert (24 parcours sur les deux GPU, la boucle a fini malgré l'a… |
| 249 | `f5de4dc` | `b1ba06a` | 2026-10-24 | test(v33): parcours de la révision après une Signature annoncée (tools/v33-revision.mjs) ajouté au jalon |
| 250 | `76b20f2` | `d9644ce` | 2026-10-25 | feat(m09): retours R1 sur la ville en rangs : ombres de contact tirées de la silhouette des images et ombre… |
| 251 | `f38c628` | `cde9065` | 2026-10-25 | test(v33): avenant 08, amendement 1 : jalon vert sur les deux GPU (révision comprise), mesures avant / aprè… |
| 252 | `ee9c6a5` | `cd51a34` | 2026-10-25 | Merge branch 'main' of https://github.com/juniorbattle/RPGCards into claude/distracted-pike-6ed4e9 |
| 253 | `b1a76a7` | `67b0bee` | 2026-10-25 | test(v33): campagne complète de l'amendement 1 : audits de secret mis à jour pour l'annonce publique de l'a… |
| 254 | `377f7cc` | `fc1580c` | 2026-10-25 | docs(v33): décisions du responsable consignées (fiches de la Garde et de l'avenant 08, 14 choix sur l'optio… |
| 255 | `890c1f1` | `e18c83b` | 2026-10-25 | test(m10f): T1, un pilote de QA moins naïf (outil seulement) : engagement, révision et choix tactiques suiv… |
| 256 | `43a62d9` | `e10335c` | 2026-10-25 | feat(m10f): textes et aide du mode Aventure relus (mentions « prototype » retirées, chapitre en clair à l'é… |
| 257 | `d05e525` | `cc13c7a` | 2026-10-25 | test(m10f): équilibrage mesuré par palier (identique à la mesure de l'amendement 1 ; écarts contre l'annexe… |
| 258 | `2b5532f` | `98a04f3` | 2026-10-25 | docs(m10f): campagne de QA de la RC de l'aventure verte au premier passage sur la Radeon 780M et la RTX 406… |
| 259 | `bc3234f` | `df6041a` | 2026-10-25 | docs(m10f): décisions du responsable consignées (fiche de la RC de l'aventure, 9 choix sur l'option recomma… |
| 260 | `a785f39` | `4e351df` | 2026-10-25 | feat(m10f): décisions de la fiche de la RC appliquées : version 0.10.0-rc.1 ; « cheffe » accordée dans les … |
| 261 | `a2675b2` | `396c56e` | 2026-10-25 | feat(m09): deuxième reprise de M09 ; choix du responsable consignés (feuilles des PNJ : 16 images au plus a… |
| 262 | `df96638` | `6e3775a` | 2026-10-25 | fix(m09): plus de contour clair autour des personnages de la ville (retour du responsable sur la porte des … |
| 263 | `52fd065` | `b4db7eb` | 2026-10-25 | feat(m09): les 10 autres feuilles des PNJ de la ville générées (10 images, 12 sur 16), traitées par script … |
| 264 | `2917690` | `d5e67ea` | 2026-10-25 | chore(m09): les 12 feuilles des PNJ approuvées par le registre (ordre explicite du responsable, passe à par… |
| 265 | `e952efe` | `dc53945` | 2026-10-25 | feat(m09): la Place du Fanal et la Ville haute en rangs, quartiers ajoutés et facultatifs (ADR 028, deuxièm… |
| 266 | `2cd3327` | `b48a325` | 2026-10-25 | chore(m09): les 4 façades des quartiers ajoutés approuvées par le registre (ordre explicite du responsable,… |
| 267 | `22741ec` | `29b2718` | 2026-10-25 | docs(m09): amendement de l'ADR 028 (« Deuxième reprise » : quartiers ajoutés et facultatifs) ratifié tel qu… |
| 268 | `68a8ff3` | `aff46e3` | 2026-10-25 | docs(m09): finalisation de la ville : encadré en tête de CLAUDE et d'AGENTS, cadrage des quatre points ouve… |
| 269 | `c9ebfcd` | `6855243` | 2026-10-25 | docs(m09): finalisation de la ville : décisions du responsable consignées (vie facultative des deux quartie… |
| 270 | `3453cba` | `51a2e34` | 2026-10-25 | feat(m09): emblème de l'Astre brodé par script sur les bannières de l'Observatoire (décision du responsable… |
| 271 | `ca25dc4` | `0794d4a` | 2026-10-25 | chore(m09): la planche retraitée de l'Observatoire (Astre brodé) approuvée par le registre, sur ordre expli… |
| 272 | `8085266` | `b015074` | 2026-10-25 | feat(m09): la vie facultative de la Place du Fanal et de la Ville haute dans l'aventure (décision du respon… |
| 273 | `d7c41f0` | `5132f33` | 2026-10-25 | feat(m09): l'heure de ville préparée (décision du responsable « Tout préparer ») : points de départ par cha… |
| 274 | `ffb3731` | `60a08bb` | 2026-10-25 | fix(m09): yeux dissemblables des PNJ (retour du responsable) : option yeux de processSheet (yeux repérés da… |
| 275 | `e3075f9` | `c770e73` | 2026-10-25 | chore(m09): les 7 feuilles des PNJ retraitées (yeux) approuvées par le registre, sur ordre explicite du res… |
| 276 | `52c44b5` | `1880170` | 2026-10-25 | docs(m09): encadrés de CLAUDE et d'AGENTS à jour (finalisation de la ville, passes 134 à 139) |
| 277 | `dae60f1` | `61df16c` | 2026-10-26 | qa(m09): jalon de QA complet vert sur la Radeon 780M et la RTX 4060 (54 étapes sur 54, jeu par défaut ident… |
| 278 | `74da2b0` | `a74a7c9` | 2026-10-26 | docs(m09): fiche d'arbitrages de la finalisation remplie et consignée (7 choix, aucune note) : vie des quar… |
| 279 | `bd93beb` | `926be32` | 2026-10-26 | docs(m11): brief de la session cloud M11 validé par le responsable (rencontres en vue à la Pokémon, rival e… |
| 280 | `1e07b53` | `e2976d3` | 2026-10-26 | docs(m11): phase 1, cadrage proposé : six contrats (rencontres en vue, rival en événements fixes, progressi… |
| 281 | `08d3b6d` | `531d844` | 2026-10-26 | feat(m11-a): rencontres en vue (cône, ligne de vue, front montant, approche, duel forcé, repos) et Kaï en é… |
| 282 | `be4e941` | `8d21302` | 2026-10-26 | feat(m11-a): rencontres en vue et rival fixe branchés dans l'aventure (approche, bulle « ! », duel forcé, K… |
| 283 | `8f8184b` | `4f496cb` | 2026-10-26 | feat(m11): répliques du catalogue branchées (guetteurs, membres, Kaï, rumeurs, revanches, héraut) ; module … |
| 284 | `3cf00c7` | `f7d945a` | 2026-10-26 | feat(m11-b/d): tempéraments réglés sur mesure (« rusé » et « vicieux » sur une base prudente de niveau 2 ; … |
| 285 | `4d2dc4e` | `c1ad6e8` | 2026-10-26 | qa(m11): jeu par défaut au repos identique au pixel près au build de bd93beb (12 comparaisons) ; qa:vue 29/… |
| 286 | `c6822ba` | `a2c3cb7` | 2026-10-26 | feat(m11): le tempérament du PNJ dit dans la préparation du duel ; réplique de K6 distincte de la proclamat… |
| 287 | `6a6aab7` | `0bedcd9` | 2026-10-26 | docs(m11): journal passes 144 (tempéraments, mesures) et 145 (répliques) ; mesures des tempéraments |
| 288 | `7ab74d9` | `15c2ba3` | 2026-10-26 | feat(m11): sons du Clash calés sur les temps de sa chorégraphie (« Passer » ne rejoue que la fin) ; répliqu… |
| 289 | `decbf1d` | `bc959ab` | 2026-10-26 | docs(m11): journal passes 146 (IA de niveau 2, mesures) et 147 (son) ; mesures IA contre IA |
| 290 | `0edbe62` | `4014d40` | 2026-10-26 | docs(m11): encadrés « M11 — état au 2026-10-26 » en tête de CLAUDE et d'AGENTS |
| 291 | `2685336` | `92331b4` | 2026-10-26 | feat(m11): les PNJ de passage (organisateurs d'Épreuve, champions de Joute) se souviennent de votre dernièr… |
| 292 | `94bf117` | `c292bfa` | 2026-10-26 | feat(m11-e): sons « gain » (carte au registre) et « titre » (fanfare du titre de la ville) |
| 293 | `912bf6a` | `0e82349` | 2026-10-26 | fix(m11-d): les outils de mesure et d'empreintes parcourent les six profils historiques (PROFILS_HISTORIQUE… |
| 294 | `702f4da` | `86285b6` | 2026-10-26 | docs(m11): fiche et retour complétés avec les mesures (tempéraments, IA, Duel standard et paliers identiques) |
| 295 | `19763e9` | `f2384e0` | 2026-10-26 | fix(m11-a): une rencontre forcée est remise à zéro quand sa ville est détruite |
| 296 | `3a52eab` | `70c6f6b` | 2026-10-26 | docs(m11): mode d'emploi pour essayer M11 en local ; QA : ?vuePause pour capturer la bulle « ! » |
| 297 | `2f42afe` | `354df50` | 2026-10-26 | qa(m11): campagne en rendu logiciel (qa:vue 29/29 aux deux tailles, aventure d'avant M11, jeu standard : br… |
| 298 | `4762707` | `cd8067b` | 2026-10-26 | docs(m11): retour de session : résultats de la campagne de QA |
| 299 | `dced0d2` | `ffa6dcb` | 2026-10-26 | feat(ville): chemins lumineux des premiers rangs (six îlots en rangs ; tracé à la main dans la Grande Cour,… |
| 300 | `23ddcab` | `100935a` | 2026-10-26 | feat(aventure): cinématiques runtime, première porte (contrat 7 et ADR 043 proposés) ; journal passe 150 |
| 301 | `bf5682e` | `dad888b` | 2026-10-26 | qa(m11): qa:vue 29/29 avec les cinématiques dans le code (coupées en QA sans ?cine=1 : rencontres et Kaï in… |
| 302 | `6e4be0c` | `976fd3d` | 2026-10-26 | qa(m11): cinématiques 25/25 sur le build final (planche), jeu par défaut identique au pixel près ; journal … |
| 303 | `f53aba8` | `b3e0cf4` | 2026-10-26 | feat(aventure): cinématiques, deuxième lot — les scènes du récit, du prologue au titre ; journal passe 151 |
| 304 | `40a5632` | `8341d4f` | 2026-10-26 | qa(m11): captures des cinématiques, deux parties (26 vues, planche) ; 41/42, seul écart : le seuil du trave… |
| 305 | `e95b9bf` | `73afa92` | 2026-10-26 | qa(m11): qa:aventure 47/48 sans ?cine=1 après les scènes du récit (seul échec : la marche au clavier, connu… |
| 306 | `b4e57e3` | `e55dafa` | 2026-10-26 | qa(m11): cinématiques 25/25 et 17/17 sur le build final, qa:championnat 13/13, qa:aventure 47/48 (échec con… |
| 307 | `373e42d` | `1148e8a` | 2026-10-27 | feat(cartes): M12 cadrage et lot A — une illustration par carte, lecture de l'effet, rareté ; journal passe… |
| 308 | `335ab9d` | `0474e5c` | 2026-10-27 | feat(combat): M12 lots B et C — temps forts des activations au premier plan, impulsions du plateau, sons ; … |
| 309 | `f392d90` | `51730f6` | 2026-10-27 | qa(m12): temps forts au téléphone en portrait ; campagne verte (cartes=v1 identique au pixel près, qa:techn… |
| 310 | `43a4ef5` | `17e2b0a` | 2026-10-27 | feat(couleurs): ADR 046 — l'Astre en ocre et or partout, distinct du Voile (cartes, étendards, ville, Halva… |
| 311 | `299be4c` | `345bb5a` | 2026-10-27 | art(m09): feuille recolorée de Halvard approuvée par le registre sur ordre du responsable (36 images) ; jou… |
| 312 | `0d681dc` | `3705979` | 2026-10-27 | feat(cartes): avenant 09 (provisoire) — trois variantes par identité, 48 au total : 32 effets nouveaux au m… |
| 313 | `ca77405` | `8a23391` | 2026-10-27 | Avenant 09 : récompenses de l'aventure par choix, mesure des 32 variantes, Escarbille ajustée |
| 314 | `11298d3` | `3e65eea` | 2026-10-27 | Avenant 09 : écran du choix de la variante (aventure) et éditeur Basic, A, B, C (Duel standard) |
| 315 | `5ee230c` | `6ce48e8` | 2026-10-27 | M12 : conseils des nouveaux signaux, dans le duel standard et dans l'aventure |
| 316 | `fa6e8b7` | `c3f17af` | 2026-10-27 | Avenant 09 : enjeu des variantes annoncé partout ; parcours d'un nouveau joueur ; bannière de l'Astre proposée |
| 317 | `f3652ba` | `820dfcf` | 2026-10-27 | Journal passes 156 et 157 : avenant 09, conseils, nouveau joueur ; campagne de QA |
| 318 | `6b97af6` | `d410541` | 2026-10-27 | M13 : cadrage de la musique (mandat, contrat proposé, ADR 047 proposé) |
| 319 | `910e92e` | `7321048` | 2026-10-28 | M13, lot MU-A : moteur musical synthétisé par code, thème « Les Quatre Voies », jingles, laboratoire |
| 320 | `008c7ba` | `5c834b0` | 2026-10-28 | M13, lot MU-A : aperçus OGG, mesures, fiche d'écoute ; journal passe 158 |
| 321 | `af8e2d1` | `22eb8e4` | 2026-10-28 | M13 : contrat 2 proposé, une bande son immersive (la musique qui suit le jeu) |
| 322 | `59e32be` | `f82083e` | 2026-10-28 | M13 : moteur de la musique interactive (couches, ponctuations dans l'accord qui sonne, fin de duel sur le t… |
| 323 | `c72c91c` | `ae561a1` | 2026-10-28 | M13 : nouveaux instruments (guitare jazz et guitare nylon calculées ; trompette bouchée, saxophone ténor, f… |
| 324 | `3baeeee` | `56656a6` | 2026-10-28 | M13, lot MU-B : thème II « La ville la nuit » (le Quai et la Place du Fanal en noir, le Parvis et la Grande… |
| 325 | `d95864d` | `d74c917` | 2026-10-28 | M13 : la musique branchée au jeu (bus et volume de la musique, 60 % par défaut, mémorisé ; chef d'orchestre… |
| 326 | `c593437` | `30e8be5` | 2026-10-28 | M13, lot MU-C : thème IV « Les Maisons » (un thème, quatre couleurs : la Cendre en hard bop, le Voile cool … |
| 327 | `df4cd7d` | `156bb93` | 2026-10-28 | M13, lot MU-D : fiche d'écoute refaite (lots MU-A à MU-D), contrat 2 mis en œuvre, amendement 1 de l'ADR 04… |
| 328 | `999dec3` | `e812c88` | 2026-10-28 | M13 : l'acoustique du lieu du duel (la rue en plein air, le bar au club, la salle de jeu feutrée, l'arène e… |
| 329 | `d5ed25e` | `fd77860` | 2026-10-28 | M13, lot MU-D : aperçus et images des rendus complets (en cours : versions, jingles, variations, formations… |
| 330 | `58bbee2` | `6007a90` | 2026-10-28 | M13, lot MU-D : aperçus des rendus complets (suite) |
| 331 | `6057bc7` | `bad4be0` | 2026-10-28 | M13, lot MU-D : aperçus des rendus complets (formations de la ville) |
| 332 | `7434641` | `e46b2b7` | 2026-10-28 | M13, lot MU-D : aperçus des scénarios (couches, thèmes de duel complets, ponctuations, duel) |
| 333 | `557c425` | `ff63563` | 2026-10-28 | M13, lot MU-D : rendus complets terminés (48 morceaux et scénarios : sonie de −16,8 à −21,5 LUFS selon le r… |
| 334 | `55348ca` | `a8bc8d5` | 2026-10-28 | M13, lot MU-D : campagne (instruments seuls et justesse refaits, laboratoire et musique dans le jeu verts, … |
| 335 | `cf99032` | `a8bcf8b` | 2026-10-28 | M13, lot MU-D : fiche (acoustique du lieu, ville qui respire, coût mesuré), contrat 2, journal passe 160 (c… |
| 336 | `5c542c1` | `25c7e1a` | 2026-10-28 | M13, lot MU-D : campagne de QA complète verte (qa:browser, qa:product, qa:aventure, laboratoire, musique da… |
| 337 | `40dfe36` | `f4d501a` | 2026-10-28 | docs: fiches interactives M11, M12 et M13 publiées (39, 32 et 34 entrées), liens en tête des fiches ; récep… |
| 338 | `3498af1` | `d212c18` | 2026-10-29 | Retours du test du responsable (2026-10-29) : marche de profil, pause entre les morceaux, temps forts tenus… |
| 339 | `b3a8ba1` | `476482b` | 2026-10-29 | Relief des décors peints (retour du 2026-10-29 : escaliers et intérieurs « aplatis ») ; journal passe 162, … |
| 340 | `a7c7fe6` | `2739c4a` | 2026-10-29 | Marche de profil : la mesure des pieds lit la bonne rangée sur les feuilles retournées à la création |
| 341 | `fe919d5` | `2c1e3dd` | 2026-10-29 | Retours du 2026-10-29 : sorties de la QA ciblée (temps forts 30/30 avec la tenue au clic visible ; rendus d… |
| 342 | `4a97ea3` | `d71584f` | 2026-10-29 | Protagoniste : marche de profil, passages redessinés par code (image approuvée inchangée) ; lot de la versi… |
| 343 | `92827a5` | `3d11361` | 2026-10-29 | Protagoniste : silhouette B (version homme) générée (1 image, 17 sur 20), traitée par script et posée, non … |
| 344 | `eec3726` | `d3e411f` | 2026-10-29 | Protagoniste personnalisable : silhouette, peau, cheveux et yeux par code ; Nouvelle aventure, menu « Appar… |
| 345 | `13e2dec` | `2bed789` | 2026-10-29 | Protagoniste : la feuille de la silhouette B approuvée par le registre (passe à part) ; journal passe 166 |
| 346 | `aef8c87` | `7544421` | 2026-10-29 | Protagoniste : une coupe de plus par silhouette (A2 queue de cheval, B2 mi-longue ; 2 images, 19 sur 20), n… |
| 347 | `657756b` | `9891fee` | 2026-10-29 | Protagoniste : les feuilles A2 et B2 approuvées par le registre (passe à part) ; journal passe 168 |
| 348 | `5e28c4f` | `ba5d301` | 2026-10-29 | Protagoniste : types de visage, essai du calque (1 image, visage en amande sur la silhouette A) ; le calque… |
| 349 | `246b500` | `daa6393` | 2026-10-29 | Protagoniste : types de visage en feuilles complètes (11 images, 12 feuilles), non approuvées ; « Visage » … |
| 350 | `b02c7e1` | `257506b` | 2026-10-29 | Protagoniste : les 12 feuilles de visage approuvées par le registre (passe à part) ; journal passe 171 |
| 351 | `e7854d4` | `228c3fa` | 2026-10-29 | Protagoniste : quatre coupes de plus avec leurs trois visages (16 images), non approuvées ; journal passe 172 |
| 352 | `e50d008` | `1a96a7d` | 2026-10-29 | Protagoniste : les 16 feuilles du deuxième lot de coupes approuvées par le registre (passe à part) ; journa… |
| 353 | `3033f23` | `0a4fd08` | 2026-10-29 | Protagoniste : le portrait du duel suit les coupes et les visages, par code ; journal passe 174 |
| 354 | `c996fce` | `a721d94` | 2026-10-29 | Protagoniste : la frange de la coupe bouclée du portrait refaite en boucles (retour du responsable) ; journ… |
| 355 | `fbb41a2` | `ee488c3` | 2026-10-29 | Journal passe 175 : frange bouclée du portrait reçue par le responable (« Oui, elle convient ») |
| 356 | `0c9ab70` | `e543c74` | 2026-11-01 | Jalon de QA 2026-10 : outils de campagne et comparaison au pixel près sur les deux GPU ; journal passe 176 |
| 357 | `60fdad3` | `64d2a56` | 2026-11-01 | Jalon de QA 2026-10 sur GPU réel : vert sur la Radeon 780M et la RTX 4060 ; coûts mesurés ; outils corrigés… |
| 358 | `a81e83e` | `1a95c62` | 2026-11-01 | Images lentes du duel : cause isolée (effets de M12 à leur première apparition, profil Chrome neuf), aucun … |
| 359 | `5b7535e` | `bbe58f8` | 2026-11-01 | Relecture de la passe 179 : bisection hors repos signalée, charge sur la Radeon dite probable, 36 ms au plu… |
| 360 | `24b1272` | `d439f56` | 2026-11-01 | Tests : délai porté à 30 s, plus de faux échecs au parallélisme maximal ; journal passe 181 |
| 361 | `22973e5` | `174445a` | 2026-11-01 | M14 : contrat Promenade libre et Récit guidé proposé, ADR 048 ; journal passe 182 |
| 362 | `625db53` | `1d3e078` | 2026-11-01 | M14 : le Récit guidé (écrans noirs, marche coupée, Kaï jamais manqué), choix du mode, mesure de la voie dir… |
| 363 | `891ad3a` | `8e8195a` | 2026-11-01 | Interface hors combat de l'aventure refaite : cadre dessiné par code, HUD en cartouche, dialogues, menu, jo… |
| 364 | `b5e9522` | `cbe3f52` | 2026-11-01 | Fiches M11, M12 et M13 remises à jour, fiche M14 ; pause entre les morceaux dans les contrats M13 (amendeme… |
| 365 | `ee20a5c` | `94871e8` | 2026-11-01 | Fiches M11 à M14 remplies et consignées (120 choix) : ADR approuvés, contrats amendés ; journal passe 186 |
| 366 | `8a0cdfc` | `82fe01e` | 2026-11-01 | Guetteurs et Kaï selon la fiche M11 (V2, V4, V7, K3) ; la Halte du Récit guidé (G1, G2) ; journal passes 18… |
| 367 | `55786b3` | `984ce34` | 2026-11-01 | Façade du Quai : bannière de l'Astre en ocre, approuvée par le registre (fiche M12, H3) ; journal passe 189 |
| 368 | `2caa0ed` | `be485e4` | 2026-11-01 | « Aventure » à l'accueil du jeu standard (fiche M12, N2) ; journal passe 190 |
| 369 | `4542459` | `2369923` | 2026-11-01 | Enveloppe du Duel standard accordée à la nouvelle interface (fiche M14, S2, ADR 049 amendement 1) ; journal… |
| 370 | `f6a901b` | `b6b953b` | 2026-11-01 | Menu tactique sous le panneau de commande corrigé ; mission M15 (son 16 bits) cadrée ; journal passe 192 |
| 371 | `c8e989d` | `4bdeaac` | 2026-11-01 | Le jeu s'ouvre sur l'aventure (adresse nue), le jeu standard par ?standard=1 ; titre de l'aventure sorti du… |
| 372 | `c92147f` | `95d1771` | 2026-11-01 | M15, lot 1 : essai d'écoute 16 bits hors du jeu (trois extraits en A, B, C et version actuelle), page d'éco… |
| 373 | `be3081f` | `a63e56b` | 2026-11-01 | Page d'écoute M15 consignée : direction B avec porte d'écoute, thème Championnat à réécrire ; contrat 16 bi… |
| 374 | `64ab3a2` | `ab42072` | 2026-11-01 | Thème du Championnat réécrit : fanfare sur le motif, unissons, écriture allégée (fiche d'écoute M15, D3) ; … |
| 375 | `e75a938` | `76e8c48` | 2026-11-01 | Nouveau thème du Championnat reçu (fiche d'écoute M15, D4) ; journal passe 197 |
| 376 | `d879f4f` | `6f0d026` | 2026-11-01 | Version finale vérifiée depuis main, sans paramètre d'adresse ; journal passe 198 |
| 377 | `96bf634` | `7c059f0` | 2026-11-01 | Pastille « Aventure » retirée du duel : elle recouvrait la barre de phase ; journal passe 198 |
| 378 | `7ad1749` | `1f9fd4d` | 2026-11-02 | Récit guidé en séquences : la ville en décor de scène, la Préparation en plein écran ; journal passe 199 |
| 379 | `b21393f` | `19edbf9` | 2026-11-02 | Fluidité de l'aventure : un seul rideau, fondus partout, caméra amortie ; journal passe 200 |
| 380 | `3dc8780` | `3004701` | 2026-11-02 | Récit guidé : mise en scène sans promenade, aucun refus, portail redressé, musiques séparées ; journal pass… |
| 381 | `ee87fe1` | `c271a0c` | 2026-11-03 | Écran « Nouvelle aventure » épuré : personnage en grand, apparence, récit en deux cartes ; journal passe 202 |
| 382 | `12ab9ba` | `2f0a93b` | 2026-11-03 | Nouvelle aventure en deux étapes : le personnage, puis le récit à part ; journal passe 203 |
| 383 | `315a658` | `a76f06e` | 2026-11-03 | Fondus rendus au joueur : mouvement réduit propre à l'aventure ; portrait accordé à l'apparence ; journal p… |
| 384 | `9f669b0` | `9ebdaa9` | 2026-11-03 | Retours du test : Kaï reste après le prologue, l'émissaire entre en scène ; bruitages accordés sous la musi… |
| 385 | `3b93438` | `f49cb78` | 2026-11-04 | Panneau de commande du duel à la hauteur de son contenu : plus de texte rogné ; conseil ancré dessus ; jour… |
| 386 | `823cbe1` | `4e4272f` | 2026-11-04 | launch.json : se rattacher au preview déjà lancé dans le terminal (port 4173) |
| 387 | `085a078` | `2de463c` | 2026-11-04 | Textes mis en valeur : résultat du duel en bilan structuré, fenêtres en lignes titrées et étapes ; journal … |
| 388 | `8dfc6a6` | `b42425d` | 2026-11-04 | Cartes de l'aventure au rapport 1,4 (--card-h héritée de :root) ; fenêtre du défi au minimum ; journal pass… |
| 389 | `a10770e` | `17229b6` | 2026-11-04 | Textes épurés : le détail passe en infobulles (survol, clavier) et pastilles « i » ; journal passe 209 |
| 390 | `e8a2740` | `54359da` | 2026-11-05 | Manette de console : marche au stick, navigation spatiale des écrans, A valide, B et Start reviennent, Y et… |
| 391 | `6b8cf45` | `e06a8c5` | 2026-11-05 | M16 proposé : chasse aux cartes en ville et Techniques gagnées ; contrat et fiche d'arbitrages publiée ; jo… |
| 392 | `dee738f` | `3287939` | 2026-11-05 | M16 : Techniques gagnées (une au départ, l'autre au premier cadet, celle d'une famille au chef ; deck à une… |
| 393 | `0385190` | `0c4333d` | 2026-11-09 | M17 proposé : apprendre le duel (tutoriel jouable et leçons des nouveaux éléments) ; contrat et fiche d'arb… |
| 394 | `291f1bc` | `c48c8e1` | 2026-11-09 | Fiche M17 remplie et consignée : treize choix recommandés, écart S1 (avant le test complet), clôture repous… |
| 395 | `0ce21ec` | `75c9f9f` | 2026-11-09 | M17 : apprendre le duel — dix-sept leçons jouables (six de base, onze des éléments), le maître de table, mi… |
| 396 | `f0ee83b` | `ee27e6c` | 2026-11-11 | M18 proposé : le tour fluide, l'action au centre (retour du test complet) ; contrat et fiche d'arbitrages p… |
| 397 | `677af51` | `e3e4e8d` | 2026-11-11 | Fiche M18 remplie et consignée : les huit choix recommandés (tour assisté par défaut, classique en option) … |
| 398 | `a870c52` | `d4470e8` | 2026-11-11 | M18 en cours : tour assisté (bandeau, enchaînement, questions sur place, Engager, menus tactiques, panneau … |
| 399 | `a194f4d` | `71c5af4` | 2026-11-11 | M18 livré : le tour fluide, l'action au centre — tour assisté par défaut (bandeau d'étape, tour suivant enc… |
| 400 | `4d26290` | `6982ab9` | 2026-11-11 | M18 : chaque étape en un clic, sans valider (retours du responsable) — plus de « Valider » aux choix tactiq… |
| 401 | `8a947eb` | `08b01aa` | 2026-11-11 | M18 : un seul panneau de décision au centre de la table (Engager, réserves, Techniques, révision, mode aprè… |
| 402 | `7135d62` | `7a4f3e2` | 2026-11-11 | Audit de fin de projet : jeu complet et sain, pas encore validable comme version finale (deux défauts de rè… |
| 403 | `608b153` | `ebfe741` | 2026-11-11 | Fiche d'arbitrages de clôture publiée : 21 décisions issues de l'audit (règles, équilibre, aventure, appren… |
| 404 | `d72e97b` | `e4d298b` | 2026-11-11 | Fiche de clôture remplie et consignée : les 21 choix recommandés (note E5 : prévoir un nettoyage des captur… |
| 405 | `6f5a2fa` | `a6ee69e` | 2026-11-11 | Lot de correction de clôture, étape 1 (règles et moteur) : Contre-jour opérant (une seule règle de légalité… |
| 406 | `156a217` | `2de58cf` | 2026-11-11 | Lot de correction de clôture, étape 2 (IA et équilibre) : l'IA de niveau 1 joue Recentrage et retient tous … |
| 407 | `c5fd82b` | `51c2341` | 2026-11-11 | Lot de correction de clôture, étape 3 (duel et apprentissage) : leçons accordées au tour assisté (plus de «… |
| 408 | `7775946` | `2e0f176` | 2026-11-11 | Lot de correction de clôture, étape 4 (aventure) : sauvegarde contrôlée champ par champ sans exception, « R… |
| 409 | `4b02654` | `420256a` | 2026-11-11 | Lot de correction de clôture, étape 5 (livraison) : version 0.18.0 d'une seule source (package.json) ; mobi… |
| 410 | `01e89da` | `55b93c0` | 2026-11-11 | Lot de correction de clôture, étape 6 : avenant 09 versé sous contracts/09_AVENANT_VARIANTES.md (V3.0+delta… |
| 411 | `8b727a7` | `59f7a46` | 2026-11-11 | Nettoyage du dépôt : captures non citées retirées (1 705 fichiers, 1,2 Go ; planches et captures citées gar… |
