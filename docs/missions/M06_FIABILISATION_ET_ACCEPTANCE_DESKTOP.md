# M06 — Stabilisation et release candidate locale desktop

## Objectif

Livrer une **release candidate locale réellement jouable sur desktop** à partir de M04/M05 : la qualité de la boucle de jeu doit être mesurée par des parcours de joueur ordinaires, pas par des démonstrations QA scénarisées.

## P0 — Qualité et non-régression

- Auditer lancement de jeu vierge, sauvegarde valide, sauvegarde obsolète/corrompue, édition du deck, répétition de matchs, début/fin/abandon/retour, double KO / prolongation, interruption/résolution de Clash, diverses Signatures et Techniques, interactions clavier et souris.
- Jouer une mini-série entière avec un joueur humain piloté via vrais contrôles navigateur et au moins deux stratégies IA. Mesurer la différence d'équité des sièges si la logique d'IA évolue, par permutations seed/profil ; pas de changement de règles sous prétexte de statistiques.
- Vérifier : zéro fuite d'informations sous Dissimulation, l'IA ne consulte jamais la main adverse, events public-safe (noms d'effets et scores), résultats du moteur identiques avec/sans animation, économie non inventée, persistance versionnée, pas de duplication d'instances.
- Garder toutes les suites M03.2, Rupture/Dissipation, six chorégraphies, galerie art, deux vues.
- Diagnostics UX : erreurs console, commandes perdues, clics interrompus, focus et drag, clarté des états chargement/cachée/active, écran de fin cliquable et sortie sans reload forcé.

## P1 — Performance sans détricoter la vue approuvée

La composition validée est **inviolable par défaut** : vue frontale du rival, buste et visage lisibles, HUD, table, position des cartes, vue B et réactions. Ne pas réduire arbitrairement l'avatar, supprimer son visage ou remplacer le rendu Three.js par une image figée afin d'atteindre un nombre FPS.

- Distinguer **coût CPU et GPU réels** ; SwiftShader mesure un rendu logiciel du conteneur. Exiger mesure réelle si matériel disponible, sinon lister le protocole, l'appareil requis et les limites. Ne pas inventer un seuil de FPS validé.
- Utiliser les ablations existantes (bougies, bannières, poussières), profiler allocations, draw calls, surcharge des plans transparents, génération Canvas/GLSL, rerenders DOM et gestion WAAPI. Qualité adaptative possible si **réversible, visible en options, et sans changement des règles ni de la lisibilité**.
- L'optimisation ne doit pas créer de scintillement, de décalage des zones d'interaction, de texte sous contraste 4,5:1 dans nos scènes de contrôle ou de caméra instable. Comparer avant/après même seed, même phase, même résolution. Préserver la lumière du visage et les proportions acquises M03.2.
- Mobile paysage : **pas de nouveau lot**. Faire seulement un smoke-test des parcours déjà existants pour éviter leur régression.

## P2 — UX de version jouable

- Écran d'aide, options, sauvegarde, retour, raccourcis, messages d'échec clairs ; chargement et absence de WebGL sans crash (dégradation documentée).
- Lecture du Clash sans journal obligatoire (verdict et 1–3 conséquences), HUD joueur bas-gauche, rival haut-gauche, aucune zone centrale bouchée, modes ASSAUT et GARDE reconnaissables.
- Les nouvelles interfaces menu/hub/collection suivent la grammaire Art by Code, sans copier la preview comme background. Ne pas multiplier les écrans décoratifs peu utiles.

## P3 — Porte de release candidate

Commande de démarrage `npm install && npm run dev`, `npm run typecheck`, `npm test`, `npm run build`, `npm run preview` testées. QA navigateur complète pour menu → 3 rencontres → progression → réouverture ; clavier+souris, puis smoke mobile. Enregistrer sha/seed/test/device/screenshots/échecs.

Créer `docs/RAPPORT_M06_RC.md`, une checklist des fonctions réellement livrées, un tableau connu/à faire, historique des commits et `JOURNAL.md` à jour. Une version « RC » n'est pas « ville RPG finale » : le dire explicitement.

**Ne pas substituer des wireframes ou documents à une version jouable.**