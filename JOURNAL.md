# JOURNAL.md — Les Quatre Voies

**Nature :** journal de production du **nouveau projet**, et non journal copié de RPG-ArtByCode.  
**Convention :** passes chronologiques, plus récente en bas ; statut `[OK]`, `[KO]`, `[?]` ; preuves vérifiables.  
**Dernière passe :** 13 — **re-rendu ciblé du plateau** : `renderApp` ne touche plus que les nœuds qui changent, même DOM et même comportement vérifiés rendu par rendu (`renderCheck`, ADR 015). Temps processeur par commande 9,6 → 7,4 ms (Radeon 780M) et 8,2 → 6,4 ms (RTX 4060) en médiane (`docs/RAPPORT_M06_RC.md` §5.6). Règles, composition et secrets inchangés. (Passe 12 : à-coups tracés, deux causes corrigées ; passe 11 : mesures GPU de la RC ; passe 10 : RC locale desktop.) Ce n’est pas la ville RPG finale.

## État initial connu

- `[OK]` Règlement V3.0 consolidé et présent dans `source/CONTRAT_REGLES_V3_0_HISTORIQUE.md` ; contient le duel, 16 variantes, 4 Signatures, 6 Techniques et les raccordements.
- `[OK]` Simulateur de référence V3.2 fourni dans `simulator_ref/simulator` ; moteur JavaScript autonome, UI de test, journal corrigé. **N'est pas le futur jeu.**
- `[OK]` Delta de gameplay à intégrer au nouveau moteur : Amplifier le Rang reçoit +1 par Secondaire de même famille, selon `contracts/02_...` ; états chargement/réserve/active visibles ; chronologie des choix inchangée.
- `[OK]` Référence méthodologique RPG-ArtByCode auditée publiquement (main, commit `d7c439b3b08280d7643d8cfe3f658de6ad49b928`) : Vite/TypeScript/Three.js, procédural, outils de capture, mesure, graine, journal AGENTS.
- `[?]` Aucune implémentation production dans ce nouveau dépôt au moment de la remise de kit ; les commandes, perf, captures et intégrations devront être créées/testées par Claude Code.
- `[?]` Il n'existe aucun contrat validé de caméra, décor urbain, composition d'arène, palette détaillée ou sprites personnage pour Les Quatre Voies.

## À reprendre (prioritaire)

1. **PRIORITÉ OPÉRATEUR M04–M06 (16 octobre) :** vue frontale et proportions du rival **approuvées et figées comme baseline desktop (ADR 013)**. Construire une boucle opérationnelle menu → deck → rencontres → duels → résultat/progression → sauvegarde/reprise (docs/missions/M04_M06_PROGRAMME_JEU_OPERATIONNEL.md), puis stabiliser une release candidate locale. Mobile paysage et polish artistiques secondaires reportés. **M04 (passe 8), M05 (passe 9) et M06 (passe 10, RC 0.6.0-rc.1) livrés**, RC mesurée sur GPU réel (passe 11) ; à faire : revue opérateur de la RC et des arbitrages (`docs/RAPPORT_M06_RC.md` §9, ADR 014), contenu canonique de progression.
2. **Écarts de fidélité restants** (`docs/RAPPORT_M03_2.md` §8) : personnages en plans 2,5D (pas de volume ni de chevelure détaillée), décor moins dense, ni bloom ni profondeur de champ, table encore plus sombre que la preview, typographie système ; paysage = gabarit compact du bureau (textes ≈ 9,5 px à 844×390), pas l’interface simplifiée du panneau 6.
3. **Arbitrages encore proposés** (ADR 004) : ARB-002 (profil du rival public), ARB-001, ARB-005 (+ ARB-005b : carte camouflée remplacée pendant l’engagement, nommée en fin de tour depuis la passe 5), ARB-011 ; ratification éventuelle du delta D-01 (V3.3). Inférences restantes documentées (`docs/RAPPORT_M03_1B.md` §6).
4. **Mesure sur GPU réel** : **faite** sur le portable de l’opérateur (passe 11, Radeon 780M + RTX 4060 : plafond de l’écran 165 Hz en jeu, aucun compromis requis). **À-coups tracés en passe 12** (rapport §5.5) : liaison WebGL des anneaux FX et illustrations au clic corrigées. Restent :
   - ~~re-rendu complet du plateau à chaque commande~~ : **fait en passe 13** (re-rendu ciblé, §5.6, ADR 015) ;
   - génération des illustrations à leur première apparition (≈ 2 ms par commande en moyenne aux premiers tours) → pré-génération hors commande ;
   - shaders Skia de Chrome au premier duel d’un profil, non corrigeable dans le jeu ;
   - temps GPU par image (`EXT_disjoint_timer_query_webgl2` disponible) ;
   - poste de bureau ;
   - budget mobile.
4b. **QA sur le poste de l’opérateur** : deux échecs, **identiques sur la RC intacte**, que le conteneur ne montrait pas.
   - `qa:browser` `mobile-rotation-touch` : scène du Clash encore en fondu (≤ 300 ms) au début du tour suivant. Arbitrer l’arrêt de la scène au tour suivant (coupe la fin du fondu de défausse, ADR 013), ou une vérification tolérante à ce fondu.
   - `qa:rc` contraste : rang « II » des vignettes de l’éditeur de deck à 3,5–3,6:1 (seuil 4,5:1). Vérifier le rendu des textes sous Windows ; renforcer le contour du chiffre si confirmé.
4c. **Arbitrage passe 12** : illustrations tramées par le processeur (écart de pixels moyen ≤ 1,8/255, rendu identique sur toutes les machines) ; rapport §9, point 6.
5. **M03.1B livré** (passe 5) ; **M03.2 livré** (passe 6, `e112765` → `dcebd2a`, preuves sur `99e03e1`).
6. IA : modèle du joueur, niveaux de difficulté ; découpage du bundle Three.js.

## Principes à garder

- La présentation (vues, expressions, séquence, chorégraphies) est pilotée par des modules PURS testés, alimentés par des faits publics ; la 3D et le DOM ne font qu’exécuter.
- Une animation de Clash n’est qu’une COPIE de représentation : elle lit le résultat résolu (rapport public), ne décide jamais du vainqueur et se nettoie entièrement (« Passer », nouvelle phase).
- La caméra s’ancre sur la mise en page (variables CSS) : la composition se règle dans la feuille de style, la 3D suit.
- Pendant une mise en scène, ne jamais recréer les éléments interactifs (patch ciblé) ; en rendu à la demande, fusionner les rendus d’une même image.
- Une seule arithmétique : `computeClash` (pur) sert moteur, IA et prévisualisation ; ne jamais dupliquer une formule de règle dans l’UI.
- Les fenêtres optionnelles s’ouvrent sur information **publique** uniquement ; une vue (`viewFor`) est une copie filtrée, jamais l’état brut.
- Un rapport public l’est par construction, à la source : une valeur camouflée y vaut `null` (affichage `?`) dans l’état, l’événement et la vue ; sa valeur réelle ne voyage que dans l’événement privé de son propriétaire (passe 4).
- Publier par liste blanche à partir d’une origine TYPÉE (Primaire / Secondaire + case), jamais par rapprochement de noms ; une source camouflée ne publie que la conséquence observable d’un succès, et rien pour un échec (passe 5). Un test de non-fuite inspecte récursivement TOUTES les surfaces adverses (événements, vue, journal, séquence, scène, IA, réactions).
- Après tout changement de lumière ou de fond, mesurer la lisibilité sur la capture (contraste texte / fond réel) : éclairer peut faire baisser le contraste des textes clairs (passe 6). Une lumière animée module autour d’une base réglable, jamais une constante écrite à chaque image.
- Aucun re-rendu global pendant une interaction pointeur (cause d’un clic perdu observé en QA, passe 1).
- Un effet différé d’une interaction (`setTimeout` après `pointerup`) ne s’applique qu’à l’état où elle a commencé (jeton) : sinon il frappe l’état que cette interaction vient de créer (passe 2, regard de début de tour).
- Séparer Règles / Présentation / Génération artistique / IA.
- Une enveloppe produit ne touche pas une scène approuvée : le prouver en comparant la scène SEULE (calques DOM masqués) à l’entrée historique, au pixel près (M04).
- Reprendre un duel = rejouer ses commandes sur le moteur pur et retrouver le hash sauvegardé ; sinon refuser avec la raison, jamais d’état inventé (M05, ADR 014).
- Ce qu’une session installe (écouteurs, minuteries, textures GPU) doit être retiré à sa sortie et MESURÉ sur des cycles complets (M06 : bouches du rival).
- Instrumenter avant optimiser ; captures et chiffres doivent venir du même build, seed et machine précisés.
- Sur un portable hybride, Chrome prend le GPU intégré par défaut : relever le moteur de rendu RÉELLEMENT utilisé et mesurer chaque adaptateur. Une cadence calée sur l’écran (165 Hz) plafonne la médiane : lire les percentiles et le temps du fil principal (passe 11).
- Une moyenne glissante relevée par intervalles ne voit pas une pointe. Mesurer les à-coups image par image (rAF, Long Animation Frames), puis les attribuer par une trace, sans le pilote de QA (passe 12).
- Un coût « de première fois » dépend des caches (profil Chrome, pilote GPU) et de la charge : mesurer froid et chaud, en rondes entrelacées, et dire lequel (passe 12).
- Un programme GPU utilisé par intermittence se garde vivant par un témoin et se prépare à la création. Sinon, la libération en fin d’effet le fait recompiler à l’effet suivant (passe 12).
- Un re-rendu ciblé doit reproduire les effets de bord de la recréation : remplacer tout élément dont un attribut change ou qui est animé, `blur` au retrait de l’élément focalisé, entrée du pointeur sur l’élément neuf. On le vérifie contre un rendu complet à chaque rendu (`renderCheck`), y compris « aucune transition CSS sur un élément gardé » (passe 13).
- Un sélecteur qui finit par `*` sous une classe basculée invalide tout le sous-arbre : cibler les éléments concernés (passe 13).
- Sur un poste partagé, comparer deux builds en temps PROCESSEUR des tâches (`tdur`) et commande par commande, pas en temps mural par duel (passe 13).
- Conserver les échecs et leurs causes ; n'inventer ni approbation ni résultat.
- Les choix visuels du projet RPG-ArtByCode sont une référence de **méthode**, jamais un cahier des charges visuel importé.
- Le joueur interagit par des cartes, pas par des sélecteurs HTML comme mécanisme central.

---

## Passe 0 — Kit de production externe (2026-10-15)

**Objet :** préparation des sources de vérité, garde-fous et mission initiale.  
**[OK]** Contrats, prompt et simulateur fournis pour démarrage.  
**[?]** Aucun commit production, aucune validation navigateur sur un nouveau dépôt ; reprise à confier à Claude Code.  
**Pensée :** le prototype sert à prouver les règles ; le produit doit réinventer sa présentation sans réinventer le système de combat.

---

## Modèle obligatoire d'une prochaine passe

### Passe N — [titre] — [date, branche, commit de départ/fin]

- **Mission / contraintes :**
- **Lecture initiale :** journal, contrats, fichiers contrôlés
- **Modifications :** module / comportement / raison
- **[OK] Succès :** preuve, commande, seed, screenshot, commit
- **[KO] Échecs / tentatives abandonnées :** symptômes, cause, prévention
- **[?] Incertitudes / arbitrages :** options, recommandation, blocage
- **Tests :** commandes et résultats exacts (jamais imaginés)
- **Perf / visuels :** appareil, résolution, baseline, diff si applicable
- **Pensée :** leçon technique à retenir
- **À reprendre :** tickets concrets et ordre de priorité

Mettre aussi à jour les sections globales « À reprendre » et « Principes à garder » en début de fichier après chaque passe.

## Passe 0B — Orientation de mission autonome (2026-10-15, mandat opérateur)

- **[OK] Décision de mandat :** initialiser architecture Three.js + Vite + TypeScript stricte dans le dépôt déjà créé, puis développer **autonomement** un MVP de cartes vraiment jouable contre IA, avec clic/drag/drop, moteur normatif, art procédural et QA.
- **[OK] Règle de présentation :** Three.js requis pour la scène de production ; HUD/cartes interactives peuvent être en DOM/SVG/Canvas 2D pour la lisibilité. Aucun asset artistique externe.
- **[OK] Orientation exploratoire HD-2D :** si l'environnement est abordé, évaluer la vue de dessus inclinée (tilted top-down) et/ou la perspective frontale 2.5D ; aucun cadrage, décor ou design final fixé.
- **[?] Implémentation :** ce changement de mandat ne représente **pas** un MVP déjà développé ou testé. Claude Code doit bâtir runtime, tests et captures sur sa branche.
- **Pensée :** fournir d'abord une tranche jouable vérifiable, pas de longues études théoriques ni de monde HD-2D spectaculaire sans duel complet.
- **À reprendre :** exécuter M01 ; mesurer séparément la conformité des règles, l'expérience de manipulation des cartes et le rendement du rendu procédural.

## Passe 1 — Socle de production et premier MVP de duel jouable — 2026-10-16, branche `claude/jolly-keller-w17gmp`, départ `e6eab42`

- **Mission / contraintes :** mandat M01 actualisé (autonomie lots 0→3) : Vite + TS strict + Three.js, moteur pur, plateau manipulable, IA non omnisciente, art par code, QA et captures réelles ; `main` intact.
- **Lecture initiale :** AGENTS, JOURNAL, CLAUDE, README_START_HERE, gouvernance 00, contrats 01–05, règlement V3.0 **intégral**, PROMPT M01, docs (plan, architecture, acceptance, ADR template), matrice QA, rapports QA, audit RPG-ArtByCode (non consulté en ligne : la méthode décrite suffisait), simulateur `simulator_ref/` (code moteur lu ; `npm test` → **28/28 OK** comme preuve de départ).
- **Modifications :**
  - `src/game/` : catalogue normatif (16 identités × Basic/variante, 4 Signatures, 6 Techniques) ; moteur à phases `applyCommand` pur (START, PREPARE, DISSIPATION, COMMIT, LECTURE, LECTURE_CHANGE, TACTICS, REPEL, RESOLVED, ENDED), validation avec raisons explicites sans mutation, `computeClash` pur (Interférences en une passe, ∞, M additif, D-01, 16 variantes, Signatures, destinations, Repoussement unique), invariants à chaque transition, RNG xorshift32 dans l’état ; `viewFor` / journal français filtré ; IA heuristique sur `PlayerView` (RNG propre) ; replay + hash ; fixtures.
  - `src/art/` : illustrations Canvas seedées (motifs flammes/voiles/ronces/constellations, emblèmes par chemins, anneau de rang, cadres de rareté, Signatures prismatiques, verso commun) ; palettes **provisoires**.
  - `src/scene/arena.ts` : arène Three.js procédurale (sol rituel CanvasTexture émissif, estrades, piliers à cristaux, bannières, arche, particules), FX par événements (révélation, Clash, dégâts, dôme de Garde, Interférence, Signature, prolongation, victoire), caméras `tilted` / `frontal`.
  - `src/presentation/`, `src/app/` : plateau DOM, glisser-déposer Pointer Events + clic-pour-poser + clavier, menus contextuels, ciblage, prévision provisoire, inspection, scénarios de démonstration (rival **scripté**, signalé dans le titre), paramètres d’URL.
  - `tools/` : `qa-browser.mjs`, `shots.mjs`, `perf.mjs`, `perf-engine.ts` ; `docs/adr/001…005` ; `docs/RAPPORT_CONFORMITE_M01.md` ; README.
- **[OK] Succès :**
  - `npm run typecheck` : 0 erreur ; `npm test` : **60/60** (3 fichiers : Clash pur 29, moteur 27, IA 4) au commit `b3ca579`.
  - Moteur : 200 duels IA/IA (`npm run sim`) tous terminés, 10,83 tours en moyenne, 21 avec prolongation (double K.-O.), 0 violation d’invariant.
  - T2 / D-05 : « Vous dominez au Rang (5 contre 4), mais 0 blessure : la Garde absorbe (Puissance 9 − 12 ≤ 0) » — test moteur + capture `U07b`.
  - QA navigateur au commit `b3ca579` (`npm run build` puis `npm run qa:browser`, rapport `artifacts/qa/qa-browser.json`) : 4 duels complets par l’UI — glisser souris 1280×720 (10 tours), clic 1920×1080 (13 tours), clavier seul (10 tours), glisser tactile CDP 390×844 (8 tours) ; **0 erreur console, 0 fuite** de secret au DOM ; rejets contrôlés (Signature en Secondaire refusée avec raison, verrouillage impossible sans mode).
  - `npm run shots` au commit `b3ca579` : 27 captures déterministes `screenshots/qa/` (manifest avec seed/scénario/viewport), 0 erreur console.
  - `npm run dev` démarre (Vite 7.3.7, port 5199 en test) ; `npm audit` : 0 vulnérabilité.
- **[KO] Échecs / tentatives abandonnées :**
  - Vitest 3.2.6 : avis de sécurité (tinypool, @vitest/mocker) → passage à 4.1.11 ; `npm install` échouait (bug npm 10.9 de pairs optionnels, `edgesOut`) → `.npmrc legacy-peer-deps=true`.
  - QA 1920 intermittente : clic « Tour suivant » perdu car le retrait des nombres flottants **re-rendait tout le DOM** 1,7 s après l’impact. Correctif : retrait ciblé des éléments éphémères + aucun re-rendu tant qu’un pointeur est enfoncé (aussi valable pour le verrouillage asynchrone de l’IA).
  - Captures : le scénario « interférence » demandait une Interférence de Rang 2 contre Rang 4 ; l’UI l’a refusée à raison → scénario corrigé (Astre IV, Interférences mutuelles).
  - Mobile portrait : débordement horizontal (colonne de grille dimensionnée au contenu de la barre d’outils) → `minmax(0,1fr)` + barre compacte ; recapturé.
  - Mesure FPS initiale à 0 (temps cumulé plafonné) → mesure sur temps réel.
  - Pas de `pkill -f` avec un motif présent dans la ligne de commande courante (a tué le shell de travail).
- **[?] Incertitudes / arbitrages :** ADR 004 — ARB-001 (instantané Sondage/Recentrage), **ARB-002** (Signature et Techniques du rival publiques ?), ARB-003 (Emprise + Rupture : un seul Repoussement ; écart du simulateur V3.2 qui en permettait deux), **ARB-004** (famille masquée par Dissimulation), ARB-005, ARB-011 ; ratification du delta D-01. Caméra : `tilted` par défaut, `frontal` plus scénique (ADR 003).
- **Tests :** voir ci-dessus ; commandes exactes : `npm run typecheck`, `npm test`, `npm run build`, `npm run qa:browser`, `npm run shots`, `npm run perf`, `npx tsx tools/perf-engine.ts 200`, `cd simulator_ref/simulator && npm test`.
- **Perf / visuels :** machine Intel Xeon 2,10 GHz, 4 cœurs, 16 Go, Linux, Node 22.22.0, Chromium headless **SwiftShader (CPU, sans GPU)**. Moteur : ≈ 28 ms/duel IA/IA, ≈ 0,42 ms/commande (IA incluse). Scène 1280×720 : 19 draw calls / 784 triangles (`tilted`), 23 / 864 (`frontal`), ≈ 1,2 ms CPU JS par image ; FPS 3,9–6,7 selon les mesures (`artifacts/qa/perf.json` au commit `b3ca579` : 4,8 tilted / 3,9 frontal) en rendu logiciel **non représentatif d’un GPU**. Génération des 37 illustrations (galerie) ≈ 1,4 s sur cette machine (en jeu : à la demande, mise en cache). Bundle JS ≈ 605 kB (163 kB gzip), dominé par Three.js.
- **Pensée :** une seule arithmétique pure (`computeClash`) partagée moteur/IA/UI rend le journal, la prévision et la résolution cohérents par construction ; les bugs de cette passe sont venus de la couche d’interaction (re-rendu, mise en page), pas des règles — la QA navigateur réelle était indispensable.
- **À reprendre :** voir section globale en tête de fichier.

## Passe 2 — M02 : confrontation face à face et lisibilité — 2026-10-16, branche `claude/m02-confrontation-face-a-face`, départ `64aaf8f` (fin M01)

- **Mission / contraintes :** `docs/missions/M02_CONFRONTATION_FACE_A_FACE_ET_LISIBILITE.md` : rival visible et expressif, vue frontale par défaut + vue inclinée pour manipuler, transitions pilotées par les phases, résolution intelligible, IA à mémoire autorisée et personnalités, QA navigateur, captures comparatives, perf. Three.js/TS/Vite, art 100 % code, règles V3.0 + delta V3.2 inchangées ; **aucune mécanique de tells / bluff / Sang-froid** ; pas de ville ni de décor définitif ; `main` intacte, pas de fusion.
- **Lecture initiale :** AGENTS, JOURNAL, CLAUDE, mission M02, contrats maîtres, ADR 001–005, rapport M01, code M01 (moteur, vues, contrôleur, arène, QA).
- **Modifications :**
  - Présentation pure (testée, sans DOM ni Three.js) : `src/presentation/director.ts` (vue A « confrontation » / B « manipulation » selon phase et décision attendue, bascule `V`, gel pendant un glisser, regard vers le rival en début de tour jusqu’à la première interaction) ; `expression.ts` (réactions du rival sur **événements publics uniquement**, humeur de repos) ; `personalities.ts` (Kaï / Cendre / offensif, Maëlle / Ronce / prudent, Sélène / Voile / lecteur — provisoires) ; `beats.ts` (séquence de résolution : choix → Interférences → Rang décomposé → issue/absorption → dégâts → conséquences ; PV mis en scène).
  - Scène : `src/scene/rival.ts` + `rivalTextures.ts` (rival 2.5D en couches, textures Canvas générées **une fois**, yeux/paupières/sourcils/bouche/rougeur/gestes animés par transformations, clignements et saccades seedés, éventail de dos de cartes = taille de main publique) ; `arena.ts` réécrite (table de duel, caméras A/B cadrées sur des bandes DOM via `setViewOffset`, transitions interpolées interruptibles, portrait vivant en B par second rendu « scissor », rendus à la demande fusionnés par image).
  - DOM : gabarits `.view-a` / `.view-b`, bande scène + plaque du rival (légende d’humeur), portrait en B, boutons *Vue plateau / Voir le rival* et *Rythme*, bandeau de séquence à hauteur fixe patché sans recréer les boutons (`patchBeat`), cases mises en évidence par temps, journal regroupé par tour.
  - Règles (conformité, pas de nouvelle règle) : **Dissimulation** — la famille reste visible ; une identité déjà publique n’est jamais masquée (`concealed()` dans le moteur, vue, journal, score public). ARB-004 résolu en ce sens (ADR 004).
  - IA : `src/game/ai/memory.ts` (mémoire construite depuis les seuls événements visibles par l’IA) ; profils `equilibre / offensif / prudent / lecteur` (`policy.ts`) liés aux personnalités.
  - Outils : `qa-browser.mjs` (contrôle de la vue attendue à chaque décision, bascule `V`, séquences regardées, humeurs, clics perdus), `shots.mjs` (captures M02 + manifest), `planche.mjs`, `perf.mjs` (vues A/B, requête de minuterie GPU, chaîne du moteur de rendu).
  - Docs : ADR 006 (vues), 007 (rival & expressions), 008 (séquence) ; ADR 003 marqué remplacé ; ADR 004 mis à jour ; `docs/RAPPORT_M02.md` ; README.
- **[OK] Succès :**
  - Duel jouable face à un rival visible : vue A frontale par défaut, vue B inclinée pour composer avec portrait vivant, retour en A à la révélation et pour la tactique, regard vers le rival à chaque début de tour, bascule `V` / bouton à tout moment.
  - QA navigateur au commit `94f8e05` : **4 duels complets** par l’UI (glisser souris 1280, clic 1920 avec 13 séquences de résolution regardées en entier, clavier seul 1280, glisser tactile CDP 390×844) ; **215 contrôles de vue / 0 écart**, 122 bascules A↔B, 56 regards de début de tour, bascule `V` en tactique OK ×4, **0 erreur console, 0 fuite de secret, 0 clic perdu** ; 9 humeurs distinctes du rival observées en jeu réel.
  - Résolution T2 lisible sans journal : « Vous gagnez au Rang… mais 0 blessure — La Garde absorbe : Puissance 9 contre Garde 12 → (9 − 12) ≤ 0 » (`test/beats.test.ts`, captures `11`, `12`).
  - Non-fuite prouvée par tests : expressions alimentées par les seuls événements publics ; décisions de l’IA identiques quelle que soit la main secrète du joueur (vue, mémoire, engagement, tactiques).
  - `npm run shots` au commit `94f8e05` : **41 captures** `screenshots/qa/m02/` (+ planche `23`), manifest (seed, scénario, viewport, vue, humeur), 0 problème console.
- **[KO] Échecs / tentatives abandonnées :**
  - Refactor Dissimulation : l’événement de destination évaluait le camouflage **après** avoir retiré la carte → identité masquée publiée ; détecté par le test G24 avant tout commit, corrigé (évaluer avant de retirer).
  - Gabarit A : `--card-h` calculé sur `:root` ne suivait pas `--card-w` redéfini → cartes déformées ; redéfini dans `.view-a, .view-b`. Main coupée et liseré de table traversant les rangées en A → table agrandie et recadrée.
  - Mode figé (captures) : l’humeur de repos écrasait la réaction → repos seulement en l’absence de réaction.
  - Faux positif d’audit de secrets en QA après le regroupement du journal par tour → audit du dernier tour seulement.
  - Résolution : re-rendu complet à chaque temps → boutons recréés sous le pointeur (clics perdus en QA) ; puis hauteur du bandeau variable (boutons qui sautent) → patch ciblé + hauteur fixe.
  - Rendus synchrones en rafale (mode figé / mouvement réduit) : famine de `requestAnimationFrame` (2 images en 3 s sous SwiftShader) → `requestRender()` fusionné par image (11 images / 3 s).
  - Temps d’observation par **minuterie** (`fea2c8f`) : la bascule de gabarit en plein geste déplaçait les cibles (clic manqué en QA) → fin du regard à la première interaction, sans minuterie (`b395c5b`).
  - QA tactile en échec au tour 9 (`b395c5b`, seed 404, glisser CDP qui n’aboutit pas). **Première hypothèse fausse** : l’appui long (450 ms) annulant un glisser aux mouvements tardifs ; le correctif `a3c3ef5` ouvrait en plus l’inspection, dont le panneau recouvrait la main (échec au tour 1). Une trace pointeur (`QA_DEBUG=1`) a montré la **vraie cause** : la fin du regard de début de tour était programmée au `pointerup` du clic « Tour suivant » et s’exécutait **après** ce clic, achevant aussitôt le regard du tour qu’il lançait ; le gabarit basculait A→B de façon asynchrone pendant que le doigt visait une case. Le regard de début de tour n’avait donc presque jamais lieu (2 regards observés sur un duel QA entier). Correctif `94f8e05` : jeton de regard lu au début de l’interaction (19 regards sur le duel mobile, duel complet) ; l’inspection par appui long n’est appliquée qu’au relâchement sans glisser ; la QA vise sur une mise en page stable.
  - Outillage : attente du serveur `vite preview` trop courte sous charge ; attente d’un ancien journal de perf (fin détectée à tort) → drapeau de fin dédié.
- **[?] Incertitudes / arbitrages :** principe A/B et durée du regard initial (ADR 006) ; style 2.5D et personnalités provisoires (ADR 007) ; granularité et rythmes de la séquence (ADR 008) ; ARB-001, ARB-002 (profil du rival affiché : en M02 il découle de la personnalité), ARB-005, ARB-011 ; ratification D-01.
- **Tests :** `npm run typecheck` 0 erreur ; `npm test` **75/75** (clash 29, moteur 29, IA 7, présentation 7, séquence 3) ; `npm run build` OK ; `npm run qa:browser` (4/4 duels, détail `artifacts/qa/qa-browser.json` et `docs/RAPPORT_M02.md` §3) ; `npm run shots` + `node tools/planche.mjs` ; `npm run perf` — tous au commit `94f8e05`. Diagnostic : `QA_ONLY=mobile QA_DEBUG=1 node tools/qa-browser.mjs` (trace pointeur en cas d’échec).
- **Perf / visuels :** même machine que la passe 1 (Xeon 2,10 GHz, 4 cœurs, 16 Go, Node 22.22.0), Chromium headless **SwiftShader (CPU)**. Moteur : 200 duels IA/IA en 4 684 ms, **23,42 ms/duel**, **384,3 µs/commande**, 9,84 tours en moyenne, 18 prolongations. Scène 1280×720 : vue A 56 draw calls / 694 triangles, 28,48 ms CPU par image ; vue B 36 draw calls / 534 triangles (+ portrait), 17,2 ms ; FPS 2–3,3 **non représentatifs d’un GPU**. Art : 37 illustrations en 1 165,7 ms (une fois, en cache) ; textures du rival générées une fois. Bundle JS 649,58 kB (177,48 kB gzip). Détails : `artifacts/qa/perf.json`, `docs/RAPPORT_M02.md` §4.
- **Pensée :** la vie du duel vient de la mise en scène de faits **publics** ; garder vues, expressions et séquence dans des modules purs a permis de prouver la non-fuite par tests, tandis que tous les défauts de cette passe sont venus du temps réel (gabarit qui bouge sous le doigt, rendus en rafale, minuteries tactiles) — d’où la règle : rien ne bouge sous un pointeur enfoncé.
- **À reprendre :** voir section globale en tête de fichier.

## Cadrage de mission M03 — Décision opérateur (2026-10-16)

- **[OK] Mandat de présentation :** composition du duel fidèle à la preview validée (fichier `reference/REFERENCE_VISUELLE_VALIDEE_M03.jpg`, original PNG transmis dans le kit), HUD rival haut-gauche, HUD joueur compact bas-gauche, zone centrale libre, cartes reconnaissables, badge ASSAUT/GARDE après révélation.
- **[OK] Nouveau contrat de motion design :** AA collision et impact simultané en égalité, AG défense victorieuse / absorption totale sans blessure / blessure positive, GG neutralité, perdant visuellement réduit puis nettoyé ; Primaires gagnantes aussi défaussées comme exigé par les règles.
- **[?] État :** directives M03 documentaires publiées ; **aucune implémentation M03 ni QA M03 n'est revendiquée**. M02 est le point de départ ; lancer les lots P0–P5 et mettre à jour cette section après tests/captures réels.

## Passe 3 — M03 : fidélité à la preview validée, HUD et chorégraphies du Clash — 2026-10-16, branche `claude/m03-ui-fidele-et-clash-anime`, départ `61e2510` (contrat M03 sur M02 `e978d2d`)

- **Mission / contraintes :** `docs/missions/M03_PREVIEW_VALIDEE_HUD_CLASH.md` + preview `reference/REFERENCE_VISUELLE_VALIDEE_M03.jpg` (référence de composition approuvée, document de revue uniquement) ; HUD joueur compact bas-gauche symétrique du HUD rival, centre libre, main en bas, commandes et Techniques en périphérie, journal rétractable ; bandeaux ASSAUT/GARDE après révélation ; Clashes physiques dérivés du moteur ; Primaires toutes défaussées ; rythmes normal/rapide/instantané/mouvement réduit ; aucune règle modifiée ; pas de tells ni de Sang-froid ; `main` intacte.
- **Lecture initiale :** AGENTS, CLAUDE, JOURNAL, contrat M03, preview (inspectée panneau par panneau, recadrages agrandis), rapport M02, ADR 006–008, code du plateau, de l’arène, du rival, du séquenceur et de la QA.
- **Modifications :**
  - Composition (ADR 009) : `board.ts` réécrit en calques (frise de phase, outils, HUD rival, bulle, plateau, main, HUD joueur, commandes, inspection, tiroir) ; `styles.css` réécrit (modules fins à liseré doré, coins ornés, emplacements en perspective, mobile dédié) ; portrait procédural du joueur (`art/portrait.ts`, mêmes couches que le rival) ; bulle du rival (`rivalLines.ts`, pur) ; caméra ancrée sur la mise en page (`setLayout`) ; vue B qui garde le rival visible ; passage A↔B en FLIP.
  - Arène : salle aux bougies (fond peint arches + ciel, piliers, balustrade, bannières des quatre familles, plantes, table vernie à incrustations, bougies instanciées + flammes/halos en points animés par shader) ; rival : mains jointes et éventail, yeux plus grands (cils, reflets), modelé, mèches, capuche.
  - Postures : `stance.ts` (bandeaux ASSAUT pointe / GARDE bouclier), sur les Primaires révélées et dans le face-à-face ; avant révélation, votre mode marqué « secret », rien côté rival.
  - Clash (ADR 010) : `clashMotion.ts` (pur, six chorégraphies + liste de conséquences), `clashStage.ts` (scène DOM, WAAPI, hôte `#stage` hors du plateau re-rendu), intégration au séquenceur M02 (rang → face-à-face, issue → impact, blessures → chiffres, destinations → nettoyage vers la défausse) ; plateau « d’avant résolution » pendant la séquence ; compteurs de défausse mis en scène.
  - Scénarios `clash-aa`, `clash-ag` ; outils `clash-shots.mjs`, `shots-m03.mjs`, `snap.mjs` ; QA M03 (composition, postures, scènes fantômes) ; crochets QA `pauseSequence` / `stageSeek`.
- **[OK] Succès :** 
  - Composition de la preview en jeu réel (planches `screenshots/qa/m03/comparaison-*.png`) ; 13 captures + 6 planches au commit `0a95929` ; problèmes : 0.
  - QA navigateur au commit `0a95929` : **4 duels complets** par l’UI (glisser souris 1280, clic 1920 en mouvement réel, clavier seul 1280, tactile 390×844) ; 211 contrôles de vue / 0 écart ; **101 contrôles de posture / 0 écart** ; **composition 0 écart** ; **0 scène fantôme** (scène observée 10 fois) ; 0 erreur console, 0 fuite, 0 clic perdu.
  - Chaque type de Clash démontré par l’UI au commit `0a95929` (10 cas, 0 problème) : AA dominé / subi, AA égalité (−9 / −9 simultanés), Garde victorieuse (rival et joueur), Garde qui cède (∞ P14 contre Garde 12 → 2), victoire au Rang sans blessure (T2, absorption), GG neutre, double K.-O. (prolongation), Interférences mutuelles (ANNULÉ) ; poses figées, mouvement réduit, pellicules exactes.
- **[KO] Échecs / tentatives abandonnées :**
  - Captures figées de Clash d’abord sans déplacement : le gel empruntait la branche « mouvement réduit » → distinction mouvement réduit (aucun déplacement) / gel (pose finale de la chorégraphie).
  - Pellicule en temps réel impossible sous SwiftShader : une capture d’écran dure plus que la séquence entière (la scène avait disparu dès la 3e image) → crochets QA `pauseSequence` + `stageSeek` (positionnement exact des animations).
  - Propriétés CSS enregistrées (`@property`) pour animer la géométrie des emplacements : sans effet, `renderApp` recrée les rangées → animation FLIP des rangées et de la main.
  - Mobile vue B : emplacements latéraux hors écran (une règle bureau plus spécifique écrasait la largeur mobile) ; bulle du rival sur les libellés ; pastille de phase sur les commandes → valeurs mobiles explicites par vue, bulle déplacée, frise masquée.
  - Coche « victoire au Rang » visible avant l’impact (classe posée au début de l’étape) → animation calée sur l’impact.
  - Dôme filaire de l’arène (FX M02 « Garde ») en concurrence avec le bouclier de la scène → anneau discret sur la table.
  - Appui long tactile : ouvrait encore le tiroir du journal (héritage M02) → inspection flottante. Premier correctif (`6f1b9c7`, panneau rendu interactif au tactile pour se fermer d’un toucher) : **échec QA mobile au tour 4** — un simple toucher sur une carte déclenchait l’inspection (événements souris émulés + focus) et le panneau interceptait le toucher destiné au menu tactique. Correctif : inspection au survol d’une VRAIE souris et au focus CLAVIER seulement ; au tactile, appui long uniquement ; panneau jamais interactif, refermé au toucher suivant.
- **[?] Incertitudes / arbitrages :** face-à-face rival à gauche / joueur à droite (comme la preview) ; durée des chorégraphies ; mobile portrait vs paysage ; le rapport public du Clash contient encore les scores bruts (non lus par l’UI ni l’IA ; tâche de correction proposée) ; ARB-002 inchangé.
- **Tests :** `npm run typecheck` 0 erreur ; `npm test` **91/91** (clash 29, moteur 29, IA 7, présentation 7, séquence 3, chorégraphies 12, bulle 4) ; `npm run build` ; `npm run qa:browser` (4/4) ; `npm run shots:clash` ; `npm run shots` ; `npm run perf` — tous au commit `0a95929`.
- **Perf / visuels :** même machine (Xeon 2,10 GHz, 4 cœurs, 16 Go, Node 22.22.0), Chromium headless **SwiftShader (CPU)**. Moteur : 22.41 ms/duel, 367.6 µs/commande (inchangé). Scène 1280×720 : vue A 80 draw calls / 1650 triangles, 36.45 ms CPU par image ; vue B 78 / 1634, 31.69 ms ; FPS 4.1–4.1 **non représentatifs d’un GPU**. Bundle JS ≈ 688 kB (190 kB gzip). Détails : `artifacts/qa/perf.json`, `docs/RAPPORT_M03.md` §7.
- **Pensée :** une animation fidèle et honnête se construit en aval du moteur : classer le résultat résolu (pur, testé sur de vrais duels), puis le projeter sur des copies jetables ; les écarts de cette passe sont venus, encore, du temps réel et du tactile (gel confondu avec mouvement réduit, panneau qui intercepte un toucher), d’où l’intérêt de la QA de composition automatisée et des pellicules exactes.
- **À reprendre :** voir section globale en tête de fichier.

## Intégration dans `main` — décision opérateur (2026-10-16)

- **[OK]** Sur demande explicite du responsable (« commit/push vers main, ne pas s’éterniser sur les branches provisoires ; projet au début, sans enjeu »), `main` avance en avance rapide (fast-forward, aucun conflit, aucune réécriture) jusqu’au livrable M03 : M01 → M02 → contrat M03 → M03.
- **Suite :** développer directement sur `main` (commits validés : typecheck, tests, build, QA) ; les branches `claude/*` M01–M03 restent en historique.
- **[OK]** `CLAUDE.md` et `AGENTS.md` mis à jour sur demande du responsable : section « Règle de branche » (développement direct sur `main`, pas de branche provisoire ni de PR sauf demande, pas de réécriture d’historique) ; anciennes consignes « branche séparée / `main` inchangée » retirées, y compris dans `contracts/00_GOUVERNANCE_AUTORITE.md` (§ dépôt) et `docs/PROTOCOLE_AGENTS_JOURNAL.md`.

## Passe 4 — Visibilité : aucune valeur camouflée dans le rapport public du Clash — 2026-10-16, branche `claude/practical-cannon-5io9n5` (dérivée de `claude/m03-ui-fidele-et-clash-anime`), départ `6338311`, correctif `ca2e635`

- **Mission / contraintes :** demande opérateur : sous Dissimulation, l’événement public `clash` (construit par `buildReport`, `src/game/engine/engine.ts`) portait encore `scores` / `multipliers` bruts alors que `publicScores` / `publicMultipliers` affichaient `?`. Remplacer ces valeurs par leur équivalent masqué pour le camp concerné ; garder l’événement privé `clash` (`own`) comme source de vérité du propriétaire ; typage `ClashReport` cohérent ; `state.lastClash` utilisable par `viewFor` ; **aucune règle ni issue modifiée** ; test moteur à côté des tests Dissimulation ; `main` intacte.
- **Lecture initiale :** AGENTS, JOURNAL (« À reprendre » n° 5), CLAUDE, README_START_HERE, gouvernance 00 ; règlement V3.0 §11.3, §13.2, §14.10 ; delta V3.2 D-04 (« export JSON public ») ; contrat 03 (visibilité) ; ADR 001 et 004 ; `engine.ts`, `clash.ts`, `types.ts`, `view.ts`, `journal.ts` ; consommateurs `ai/*`, `presentation/*`, `app/controller.ts` ; `test/engine.test.ts`.
- **Constat au départ (`6338311`) :** le rapport, qui est le même objet dans `state.lastClash` et dans l’événement public, contenait la valeur réelle ; `viewFor` la remplaçait par `NaN` côté adverse (un `NaN` caché dans un type `number`), mais l’événement public restait brut. Aucun lecteur dans `src/` (UI, IA, `clashMotion.ts`, `beats.ts`, journal : champs `public*` seulement) ; seuls deux tests moteur lisaient ces champs du rapport (T2, G18), sur des cas non masqués. Aucun test existant ne vérifiait un score ou multiplicateur camouflé : dans G24, le soutien masqué est interféré, donc annulé.
- **Décision :** `ClashReport` redevient ce que son commentaire annonçait, un rapport **public par construction**. `buildReport` écrit `null` dans `scores[p]` / `multipliers[p]` exactement quand `maskedRank[p]` / `maskedMult[p]` produisent `?` (mêmes drapeaux) ; ce même rapport sert `state.lastClash`, l’événement public et `viewFor` (copie). C’est la convention déjà suivie par `reveal.tactics` (`value: null` si masqué). Alternative écartée : garder la valeur réelle dans `state.lastClash` et publier une copie masquée, ce qui donne deux objets de même type mais de visibilité différente, et un état qui contredit le commentaire du type.
- **Modifications :** `src/game/model/types.ts` (`scores: number | 'inf' | null`, `multipliers: number | null`, documentation) ; `src/game/engine/engine.ts` (`buildReport`) ; `src/game/visibility/view.ts` (suppression de `redactClash` et du `NaN`, copie du rapport) ; `test/engine.test.ts` (bloc « Dissimulation — le rapport public du Clash ne publie aucune valeur masquée », 2 tests : soutien Rang camouflé, score réel 7 ; soutien Dégâts camouflé, ×3 ; aucun nombre du rapport public ne vaut la valeur réelle).
- **Effet de bord assumé :** `viewFor(propriétaire).lastClash` ne contient plus la valeur réelle du propriétaire (elle y figurait jusque-là). Aucun module ne la lisait ; le journal la tient de l’événement privé `own` (« [Privé] Votre score réel : … »), comme avant.
- **[OK] Succès :**
  - Test écrit d’abord : les 2 nouveaux tests **échouent** sur le moteur non corrigé (`expected { p1: 7, p2: 2 } to deeply equal { p1: null, p2: 2 }`, puis `{ p1: 3, p2: 1 }` pour le multiplicateur), et passent après le correctif.
  - Règles et issues inchangées : 900 duels IA/IA (2 configurations : défaut, et Voile contre Voile avec Dissipation ; × 3 paires de profils ; × seeds 1–150) joués sur le moteur de `6338311` et sur celui de `ca2e635`. Sur 10 538 rapports publics, 51 valeurs étaient camouflées (19 scores, 32 multiplicateurs). Avant : le chiffre réel figurait derrière chacun des 51 `?`. Après : 0. Commandes, vainqueurs, nombres de tours, événements et états finaux sont **identiques** une fois ces 51 valeurs, et les 14 `state.lastClash` finaux concernés, mis à `null` : 0 écart. Méthode : `autoplay` des deux arbres (worktree de `6338311`), comparaison JSON ; script tenu hors dépôt dans le bloc-notes de session, non versionné.
- **[KO] Échecs / tentatives abandonnées :** le premier décompte du script de comparaison était faux (65 « fuites » : il additionnait les rapports d’état final à ceux des événements) ; compteurs séparés, d’où 51 + 14.
- **[?] Incertitudes / arbitrages :**
  - **Constat hors périmètre, non corrigé, à arbitrer.** Les effets d’utilisation d’une Secondaire camouflée sont annoncés **par leur nom** dans les événements publics `effect`, `insight` (`reasons`) et dans le champ `effects` du rapport public. Reproduit sur `ca2e635` (code des effets inchangé depuis `6338311`) : Dissimulation et Cendre III Ferveur révélées ensemble, Ferveur engagée en Dégâts sous une Cendre IV gagnante. Le journal du rival affiche « Le rival gagne 1 Insight (Ferveur) » et « Ferveur (rival) : RÉUSSI », alors que la même carte est « carte masquée » à sa consommation. Ferveur est une variante unique : son identité (donc son Rang) fuit avant la fin du tour (§11.3). Étincelle (« avance exacte de 1 ») révèle même l’écart de score. Écaille, Ténacité, Relance, Détour, Silence et Racine sont aussi concernées. Il y a tension entre §10.1 / D-04 (annoncer et journaliser les effets) et §11.3 (identité masquée jusqu’à la fin du tour) ; aucune interprétation n’a été choisie en silence, une tâche séparée est proposée.
  - Inférences inhérentes aux règles, laissées telles quelles : les PV perdus sont publics, donc le multiplicateur masqué s’en déduit (ex. `(12 − 6) × ? = 24`) ; une carte masquée consommée rejoint la défausse publique (ARB-005).
- **Tests :** au commit `ca2e635` : `npm run typecheck` 0 erreur ; `npm test` **93/93** (clash 29, moteur 31, IA 7, présentation 7, séquence 3, chorégraphies 12, bulle 4) ; `npm run build` OK. Au départ (`6338311`) : typecheck 0 erreur, `npm test` 91/91. Non relancés, faute de changement de rendu ou de consommateur : `qa:browser`, `shots`, `perf`.
- **Perf / visuels :** sans objet (aucun changement de rendu).
- **Pensée :** un champ public se garantit à la source. Masquer tard, dans une seule projection (le `NaN` de `viewFor`), laissait l’événement public brut ; écrire `null` dans le rapport lui-même rend l’état, l’événement et la vue publics par construction, et un test qui énumère les nombres du rapport rend la non-fuite vérifiable.
- **À reprendre :** voir section globale en tête de fichier ; en priorité pour ce chantier, l’arbitrage sur l’annonce publique des effets d’une Secondaire camouflée.
- **Intégration :** passe réalisée sur branche avant la décision « Règle de branche » ; fusionnée dans `main` par un commit de fusion (sans réécriture), ce qui garde valides les hashs cités (`ca2e635`). Revalidée après fusion : voir le message du commit de fusion.

## Mandat documentaire 4B — Reprise M03.1B → M03.2 sur main (2026-10-16)

- **[OK] Autorisation opérateur :** poursuivre autonomement après la passe 4 déjà fusionnée sur `main`. Nouvelle priorité M03.1B : empêcher que les noms d'effets uniques (Ferveur, Étincelle, etc.), leurs motifs d'Insight et `ClashReport.effects` dévoilent une Secondaire actuellement camouflée ; publier les conséquences publiques mais non l'identité encore secrète. Document : `docs/missions/M03_CONTINUATION_DEPUIS_MAIN.md`, ADR 011.
- **[OK] Discipline des branches :** la règle actuelle du responsable exige un développement **sur main**, avec commits testés, sans branche/PR provisoire. La précédente préparation M03.1/M03.2 sur une branche obsolète n'est plus le point de départ.
- **[OK] Travaux consécutifs autorisés :** tests Rupture/Dissipation via UI, puis cadrages A/B, présence rival, éclairage, hiérarchie de résolution et mobile paysage, tout en préservant les règles et six chorégraphies du Clash.
- **[?] État de ce commit :** mandat **documentaire seulement** ; aucun correctif de noms d'effets, scénario QA ou art M03.2 n'est encore implémenté ni testé. La baseline de passe 4 est 93/93 selon journal et doit être revalidée avant modification.
- **À reprendre :** diagnostic du HEAD main, test reproduisant fuite d'effet, redaction sûre à la source et non-régression ; QA Techniques ; raffinement visuel avec comparatifs, `docs/RAPPORT_M03_1B.md` et `docs/RAPPORT_M03_2.md`.

## Passe 5 — M03.1B : confidentialité des effets camouflés + QA des Techniques — 2026-10-16, sur `main`, départ `55a57f3`, commits `987ff27` (P0) et `c9e32fe` (P1)

- **Mission / contraintes :** `docs/missions/M03_CONTINUATION_DEPUIS_MAIN.md` → `M03_1B_CONFIDENTIALITE_EFFETS_ET_QA.md`, ADR 011 ; développement direct sur `main` ; ne pas refaire la passe 4 ; aucune règle, issue, coût ni RNG modifiés ; porte bloquante avant M03.2.
- **Lecture initiale :** AGENTS, CLAUDE, JOURNAL (passe 4, mandat 4B), missions M03.1B/M03.2, ADR 004 et 011, règlement V3.0 §10, §11.3, §12, §13, §14.10, delta V3.2 D-04 ; `engine.ts`, `clash.ts`, `types.ts`, `view.ts`, `journal.ts`, `beats.ts`, `clashMotion.ts`, `expression.ts`, `rivalLines.ts`, `ai/memory.ts`, `ai/policy.ts`, `replay.ts`, `board.ts`, `controller.ts`, `scenarios.ts`, outils QA.
- **Diagnostic :** baseline `55a57f3` : typecheck 0, 93/93, build OK. Surfaces fautives : événements publics `effect` (nom + motif), `insight.reasons`, `ClashReport.effects` (état, événement, vue), effets de révélation (Éclaireur, Repère), effet de Racine (fenêtre de Repoussement), détail « neutralisée par Silence » d’une Primaire, défausse de la vue adverse pendant le Repoussement, événement `replaced` d’une carte camouflée.
- **Modifications :**
  - P0 `987ff27` : `clash.ts` (origine typée `source`, conséquence observable, `silencedBy`, `insightSources`) ; `publication.ts` (nouveau : payloads publics par liste blanche, événements privés `own` du propriétaire) ; `engine.ts` (Insight, soins, effets, rapport, Racine, révélation, remplacement ; `PlayerState.maskedDiscards`) ; `view.ts` (défausse adverse `null` jusqu’à la fin du tour) ; `journal.ts`, `beats.ts` (formes génériques / privées) ; `board.ts` (infobulle de défausse = plateau mis en scène) ; `rivalLines.ts` (réplique sans nom de carte) ; `test/concealment.test.ts` (20 tests) ; ADR 011 (implémentation), ADR 004 (note ARB-005/005b).
  - P1 `c9e32fe` : scénarios `rupture`, `rupture-cachee`, `dissipation`, `masque` ; `test/scenarios.test.ts` (4) ; `tools/qa-techniques.mjs` (`npm run qa:techniques`) ; audit de secrets élargi (`tools/browser.mjs`) ; crochets QA `rivalView`, `rivalMemory`, `events`, `cardInfo`.
- **[OK] Succès :**
  - Reproduction d’abord : 17/20 tests de non-fuite échouent sur `55a57f3` (fuites citées au rapport §2), 20/20 après correctif.
  - Règles inchangées : 900 duels IA/IA (3 configurations × 3 paires de profils × 100 seeds) et 480 tours forcés (15 variantes camouflées × 4 modes × 4 graines × 2 propriétaires) rejoués sur les deux moteurs : **0 écart** de commandes, d’états après chaque commande, de vainqueurs (900/900), de durées et de vérité des effets.
  - `npm test` **117/117** ; `qa:browser` 4/4 duels, 0 fuite, 0 erreur ; `qa:techniques` 8/8 parcours (souris + tactile).
- **[KO] Échecs / tentatives abandonnées :**
  - Premier script de comparaison : un seul écart signalé, le compteur `eventSeq` (un événement privé de plus) → exclu de la comparaison d’états (compteur, pas une règle).
  - Test de propriété IA/IA trop pauvre (16 cartes camouflées en 120 duels) → ajout d’une propriété « forcée » (toutes les variantes, tous les modes, face à l’IA).
  - Faux positifs du test de fuite : nom d’effet présent chez l’AUTRE camp (Détour adverse public), réplique générique « Chaque racine compte. » → filtrage des champs décrivant l’autre camp ; réplique reformulée.
  - QA : chaîne `&&` lancée en arrière-plan en entier (sorties perdues) ; échantillonnage temporel de la séquence raté sous SwiftShader (`masque` souris) → séquence avancée temps par temps par le crochet QA.
- **[?] Incertitudes / arbitrages :** ARB-005b (carte camouflée remplacée : nommée en fin de tour, comme une consommée) — appliqué de façon cohérente et signalé, non tranché ; inférences restantes par les conséquences publiques (rapport §6) ; l’archive de replay complète n’est pas un export public.
- **Tests :** voir rapport §8 (commandes et résultats exacts).
- **Perf / visuels :** sans changement de rendu hors textes du journal / de la séquence et infobulle de défausse.
- **Pensée :** une fuite d’information se corrige là où la donnée naît ; tant que l’origine d’un effet n’était qu’un nom, impossible de savoir s’il venait de la carte camouflée — l’origine typée rend la décision de publication triviale et testable.
- **À reprendre :** M03.2 (fidélité visuelle) ; arbitrages ARB-005/005b.

## Passe 6 — M03.2 : fidélité visuelle du runtime (rival, lumière, Clash, paysage) — 2026-10-16/17, sur `main`, départ `0ab0584`, code `e112765` → `dcebd2a`, preuves sur le build de `99e03e1`

- **Mission / contraintes :** `docs/missions/M03_2_FIDELITE_VISUELLE_RUNTIME.md` après la porte M03.1B ; rival plus proche et expressif dans les deux vues, arène mieux éclairée, cartes et commandes lisibles, Clash plus clair sans surcharge, HUD conservés (rival haut-gauche, joueur bas-gauche), mobile paysage en plus du portrait, six chorégraphies conservées ; Three.js + TypeScript, Art by Code, aucune image externe ; preview = document de revue ; règles intactes ; développement direct sur `main`.
- **Lecture initiale :** AGENTS, CLAUDE, JOURNAL (passe 5), missions M03_CONTINUATION / M03_2, ADR 009 / 010 / 011, rapports M03 et M03.1B (écarts §8), `rival.ts`, `rivalTextures.ts`, `arena.ts`, `styles.css`, `clashMotion.ts`, `clashStage.ts`, `board.ts`, outils QA (`browser`, `qa-browser`, `shots-m03`, `clash-shots`, `perf`).
- **Diagnostic (captures du runtime M03, build `0ab0584`) :** visage du rival 45 px à 1280×720, luminance relative du visage ≈ 0,04 ; table et cases sombres ; scène du Clash sur le visage ; à 844×390 la main recouvrait les cases et le HUD joueur et le menu tactique était inaccessible au doigt ; 3 cas avec un texte sous 4,5:1 (mesure ajoutée en cours de passe).
- **Modifications :** voir `docs/RAPPORT_M03_2.md` §3 — rival agrandi par ses proportions (le cadrage ancré re-normalise toute avance de caméra), visage / paupières / mains peints en 2× ; lumière (clé sur la tête, bougies réglées ; fill et lampe de table remplacés après mesure par de la lumière peinte : auto-éclairage du rival, flaque chaude dans la texture de la table), bois et mur plus clairs, bannières 1:2 ; Clash : face-à-face plus bas, 1 à 3 conséquences, « → DÉFAUSSE » sur les cartes ; gabarit paysage ; libellés courts « S1 · PRIMAIRE · S2 » ; pastilles / voiles sombres sous les textes de case ; bandeau de posture remonté, rangées du portrait abaissées ; `?qa=1&ablate=` ; outils `shots-m03-2` (contraste réel, sous-ensembles), pellicules explicites, `perf-compare` (rondes entrelacées), perf d’un build « avant ». ADR 012.
- **[OK] Succès :**
  - Rival : visage (yeux → menton) 45 → 83 px à 1280×720 (11,5 % de la hauteur, la proportion de la preview), 67 → 125 px à 1920, 27 → 50 px en portrait ; tête entière en vue B ; planche `13-expressions.png` (3 rivaux × 6 humeurs, avant / après).
  - Lumière : luminance du visage ×4,6 en vue A (0,037 → 0,172), table +55 % (A), +92 % (B), ×2,7 (portrait), sans aucune lumière ajoutée au total.
  - Lisibilité : contraste réel de chaque texte mesuré ≥ 4,5:1 dans les 13 cas capturés (3 cas sous le seuil dans le runtime M03) ; 0 chevauchement (2 à 844×390 en M03) ; menu tactique atteignable au doigt en paysage (impossible en M03).
  - Clash : verdict + 1 à 3 conséquences, « → DÉFAUSSE » sur les cartes ; 10/10 démonstrations conformes aux six chorégraphies.
  - QA finale sur le build de `99e03e1` : `qa:browser` 5/5 (dont la rotation en plein tour), `qa:techniques` 8/8, `shots:clash` 10/10, `shots:m03-2` 13 cas / 14 planches, 0 erreur console, 0 fuite.
- **[KO] Échecs / tentatives abandonnées :**
  - Le vacillement des bougies réécrivait toutes les lumières à 3,6 à chaque image : l’atténuation annoncée par `e112765` n’avait aucun effet (vu en relisant la boucle d’animation) → base par lumière (`7576d31`).
  - Éclaircir la table a FAIT BAISSER le contraste des textes clairs posés dessus (aide de case 4,4:1 à 1920, libellé 3,6:1 en portrait) : visible seulement grâce à la mesure sur capture → pastille et voile sombres (`1b38b4b`, `84f0e28`). La première mesure ignorait l’opacité du texte (surestimation) → composition sur le fond (`4faa470`).
  - Planche d’expressions : constantes déclarées après leur usage (zone morte) → campagne arrêtée avant les planches (`89e599d`).
  - `pkill -f <motif>` lancé depuis une commande qui contient ce motif tue son propre shell (code 144) → motif à crochets (`qa-browse[r]`).
  - Régression de performance trouvée par la comparaison entrelacée (et non par un relevé isolé, trop bruité : moteur identique mesuré à 22 puis 37 ms/duel le même jour) : vue A 36,9 → 55,9 ms CPU par image sous SwiftShader. Le fill et la lampe de table ajoutés coûtaient ≈ 6–7 ms → remplacés par de la lumière peinte (`b2fe6f1`).
  - La flaque de lumière peinte a fait retomber un libellé « PRIMAIRE » sous 4,5:1 ; la mesure par libellé a montré deux chevauchements (bandeau de posture du rival sur le libellé de la rangée suivante — défaut déjà présent en M03 — et libellé du rival sur ses mains en portrait) → `dcebd2a`.
  - `pkill -f` sur un motif présent dans la ligne de commande de la campagne a arrêté toute la campagne ; plusieurs campagnes relancées après correctifs : chaque modification du rendu invalide les preuves ; code gelé à `dcebd2a` avant la campagne finale.
- **[?] Incertitudes / arbitrages :** proportions et lumière (ADR 012, à valider) ; gabarit paysage « compact du bureau » vs interface paysage simplifiée du panneau 6 ; pilule de conséquences sous la scène vs panneau latéral ; mesures SwiftShader seulement (pas de GPU).
- **Tests :** `npm run typecheck` 0 erreur ; `npm test` 117/117 à chaque commit de code (intermédiaires revérifiés dans un arbre détaché) ; `npm run build` OK ; `qa:browser` 5/5 (267 contrôles de vue / 0 écart, 128 de posture / 0, 0 fuite, 0 clic perdu, 4 rotations avec état conservé) ; `qa:techniques` 8/8 ; `shots:clash` 10/10, 0 problème ; `shots:m03-2` 0 problème console. Détail : `docs/RAPPORT_M03_2.md` §6.
- **Perf / visuels :** SwiftShader (CPU, sans GPU), 1280×720, rondes entrelacées avant / après (`tools/perf-compare.mjs`) : vue A 36,4 → 44,6 ms CPU par image (+23 %, médianes ; +52 % avant le passage à la lumière peinte), vue B 38,4 → 38,1 ms ; draw calls 80 → 73 (A). Ablation (vue A) : bougies ≈ la moitié du temps (49,6 → 25,4 ms sans elles), bannières ≈ 2 ms, poussières ≈ 0. Charge du conteneur très variable (moteur identique : 22,4 ms/duel le matin, 34–37 la nuit) : aucun relevé isolé n’est comparable. Captures : `screenshots/qa/m03-2/` (planches preview | avant `0ab0584` | après `99e03e1`).
- **Pensée :** une amélioration visuelle se vérifie sur la capture, pas dans le code : la lumière ajoutée a dégradé la lisibilité qu’elle devait servir, et une lumière animée a annulé silencieusement un réglage — deux défauts qu’aucun test unitaire ne voyait, révélés par des mesures prises sur le rendu réel.
- **À reprendre :** revue opérateur M03.2 (ADR 012, planches `screenshots/qa/m03-2/`) ; mesure sur GPU réel ; éventuelle interface paysage simplifiée ; densité du décor et post-traitement si le budget GPU le permet.

## Mandat documentaire 7 — Validation du duel M03.2 et programme M04–M06 (2026-10-16)

- **[OK] Validation opérateur :** proportions actuelles du rival en vue A/B, lecture du visage/haut du corps, position des HUD, éclairage utile et six chorégraphies ; la composition desktop M03.2 devient la **baseline de production** (ADR 013). Optimiser la performance en la conservant.
- **[OK] Nouvelle priorité :** construire une **version opérationnelle solo locale** du RPG de cartes : menu, config de deck légale, galerie/collection réelle, sélection de rivaux, plusieurs duels, résultats, progression démo non monétaire, persistance/reprise, QA et release candidate (contrats M04–M06).
- **[OK] Report :** mobile paysage et détails visuels secondaires ne sont plus prioritaires ; maintenir les fonctionnalités existantes sans refonte. Ne pas engager de ville complète ni d'économie canonique à ce stade.
- **[?] Exécution :** ce commit **n'implémente pas** ces chantiers : mandat documentaire seulement. La base précédente est le runtime M03.2 ; Claude Code doit coder et tester les lots successifs sur main selon la règle de branche actuelle.
- **À reprendre :** baseline tests/boot ; M04 produit ; M05 progression/persistance ; M06 QA de parcours complet, performance honnête, captures et rapport. Aucun changement silencieux aux règles ou secrets.

## Passe 8 — M04 : enveloppe de jeu, deck légal, transition de duel (2026-10-17)

- **Départ :** `4bfb585` (mandat M04–M06). Audit : moteur, IA, duel M03.2, `buildDeck` réutilisables ; le duel ne pouvait pas être QUITTÉ (écouteurs et minuteries jamais retirés, fin = rechargement de page) ; arène recréée à chaque rival sans libérer ses textures ; ni sauvegarde, ni écran produit, ni choix de variantes.
- **[OK] Session de duel démontable** (`74085cc`) : `DuelSession` (AbortController, `Controller.dispose`, `DragManager.dispose`, scène du Clash arrêtée) ; arène unique (`setRival`, `setPaused`). Entrées QA historiques inchangées.
- **[OK] Modules purs** (`e05af56`) : flux d’écrans `product/flow` (distinct des phases du duel), deck validé par le catalogue (`product/deck`), sauvegarde versionnée avec copie de secours et mise à l’écart des illisibles (`product/save`), rivaux de prototype (`product/encounters`), résumé public (`product/stats`) ; 18 tests.
- **[OK] Écrans** (`80bd858`) : accueil, création de profil (Signature + 2 Techniques), deck (16 identités × Basic/variante, Signature, Techniques, inspection, état légal), collection filtrable, rencontres, préparation (dossier public du rival), duel M03.2 + Menu (pause, options, aide, abandon confirmé) + conseils contextuels (dont « Pourquoi 0 dégât ? »), résultat (rival visible avec sa réaction finale), aide, options (export / import / effacement).
- **Preuves (build `80bd858`) :** typecheck, 135/135, build ; `qa:product` 4/4 parcours, 25/25 contrôles (nouveau joueur → duel complet → résultat = vainqueur moteur → rechargement ; glisser 1920 + clavier + abandon ; deck illégal refusé ; sauvegarde illisible restaurée / schéma futur refusé) ; `qa:browser` M03 5/5 (267 vues / 0 écart, 0 fuite) ; `qa:techniques` 8/8 ; `shots:m04` 33 captures ; **scène 3D d’un duel lancé depuis le jeu = entrée historique au pixel près (0/255)**, visage 83 px (720 p) / 125 px (1080 p).
- **[?] Limites M04 :** pas de reprise d’un duel interrompu (livrée en M05) ; données des rivaux et collection de départ = prototypes signalés ; `src/game` inchangé.
- **Pensée :** pour prouver qu’une enveloppe ne touche pas une scène approuvée, comparer la scène elle-même (calques DOM masqués) plutôt que la page : la première mesure « 4 % de pixels différents » ne venait que des calques (PV du rival, bouton Menu, conseil), la scène était identique.
- **À reprendre :** M05 (série de trois manches, rencontres libres, déblocages de prototype, collection, sauvegarde v2 avec migration testée sur une vraie sauvegarde v1, reprise exacte en plein duel), puis M06.

## Passe 9 — M05 : rencontres, collection, progression, sauvegarde et reprise (2026-10-17)

- **Départ :** `9491570` (M04 livré). Code `e6e54c1`.
- **[OK] Boucle RPG compacte :** série « Tournoi du Quai » (Kaï → Maëlle → Sélène, difficulté déclarative par PV / deck / Techniques / profil d’IA), duels libres ouverts au fil des rencontres, **Orin** (Astre, profil `equilibre` existant, ajouté en fin de liste : les seeds QA historiques ne changent pas), revanche, manche suivante, récapitulatif, journal de progression.
- **[OK] Progression de prototype :** première victoire ⇒ variantes de famille II–IV + Technique distinctive (Rupture, Dissipation) ; rien sur défaite / abandon / victoire répétée ; aucune monnaie, aucun rang, aucun bonus ; collection consultable avec « comment l’obtenir ».
- **[OK] Sauvegarde v2 + migration 1 → 2** reconstituée depuis l’historique, testée sur une **vraie** sauvegarde écrite par le build M04 (`test/fixtures/save-v1-m04.json`, produite en jouant ce build).
- **[OK] Reprise exacte en plein duel** par rejeu des commandes sur le moteur pur, contrôlée par hash ; refus motivé sinon (recommencer depuis le début / retirer) ; Sauvegarder et quitter ; abandon depuis le tableau.
- **Preuves :** 146/146 ; `qa:product` 8 parcours — E : **série entière jouée par l’interface** (8 duels, 5 défaites contre Sélène avant la victoire), F : reprise au hash près après rechargement en plein engagement et en pleine résolution, G : migration réelle, H : reprise altérée refusée ; captures `screenshots/qa/m05/`.
- **[KO → corrigé] Test H :** l’altération faisait échouer le rejeu (commande devenue illégale) au lieu de produire un autre hash ; le jeu refusait correctement, l’assertion ne connaissait qu’un motif. Assertion élargie, H relancé 3/3.
- **Pensée :** une reprise « exacte » se prouve par le hash ET par la vue du joueur, aux instants délicats (brouillon non verrouillé, résolution en cours), pas seulement en début de tour ; et un test de refus doit accepter tous les refus légitimes sans en accepter d’illégitime.
- **À reprendre :** M06 (porte RC) — sans WebGL, longévité, moteur indépendant des animations, stockage refusé, réinitialisations, contraste des nouveaux écrans, coût CPU des écrans, vidéo du parcours, rapport RC.

## Passe 10 — M06 : release candidate locale desktop 0.6.0-rc.1 (2026-10-17)

- **Départ :** `347af3c` (M05 livré). Correctifs et outils `d19667e` ; toutes les preuves sur ce build.
- **[OK] Porte de démarrage :** clone propre → `npm ci`, typecheck, 146/146, build, `preview` et `dev` servent le jeu.
- **[OK] Parcours de joueur (qa:product, 8/8, 64/64)** dont la série entière jouée par l’interface, la reprise exacte, la migration réelle et la reprise altérée refusée.
- **[OK] Porte RC (qa:rc, 9/9, 45/45) :** sans WebGL ; longévité (12 duels, 4 rivaux, textures et géométries stables, tas plat) ; même hash hors navigateur malgré les animations ; mode démo réversible ; stockage refusé ; réinitialisations confirmées ; contraste ≥ 4,5:1 sur 11 écrans ; clavier seul ; aucune image 3D hors duel.
- **[KO → corrigé] Fuite de textures du rival** (formes de bouche des expressions passées laissées au GPU à chaque duel), trouvée par la QA de longévité ; **effets transitoires figés** dans la scène des menus ; **avalanche de messages** quand le stockage est refusé ; **focus** renvoyé sur « Enregistrer » à chaque bascule dans l’éditeur.
- **[KO → corrigé] Mesures :** couleurs `color(srgb …)` lues en 0–255 (faux échecs de contraste) ; textures mesurées en plein duel (bruit) ; 6 géométries fixes de la vue B prises pour une fuite (vérifié : 45 → 51 dès la première image en vue B, puis constant).
- **[OK] Non-régression du duel approuvé :** `qa:browser` 5/5 (267 vues / 0 écart, 0 fuite, rotations conservées), `qa:techniques` 8/8, `shots:clash` 10/10 ; scène 3D d’un duel lancé depuis le jeu identique au pixel près (0/255), visage 83 / 125 px.
- **[OK] Performance (SwiftShader, CPU) :** deux séries entrelacées M03.2 ↔ RC : aucun écart attribuable (série 1 : +5 % A / +12 % B ; série 2, plus longue : −1 % / −1 %) ; 0 image 3D calculée dans les menus ; moteur 35,5 ms / duel ; bundle 768 Ko (214 Ko gzip). Protocole GPU réel documenté (`LQV_GPU=1`).
- **[OK] Vidéo** du parcours complet en temps réel (`screenshots/qa/m06/parcours-1280.mp4`, 3 min 30 s) par screencast Chromium + ffmpeg système (l’enregistreur Playwright exige un binaire absent ; rien installé).
- **[KO → corrigé] Outil de captures M04** périmé par M05 (duel libre contre Maëlle verrouillé au départ) : adapté à la manche 1 contre Kaï.
- **Pensée :** la longévité se mesure sur des cycles complets et à un instant déterministe ; chaque écart doit être expliqué par une expérience dédiée avant d’ajuster un critère (vue B), et un outil de mesure faux (format de couleur) produit des échecs aussi convaincants qu’un vrai défaut.
- **À reprendre :** revue opérateur de la RC (arbitrages `docs/RAPPORT_M06_RC.md` §9, ADR 014) ; mesure sur GPU réel (`LQV_GPU=1`) ; contenu canonique (progression, rivaux) ; ville / hub ; mobile paysage.

## Passe 11 — Mesures de la RC sur GPU réel (poste de l’opérateur) — 2026-10-17, worktree local de l’app avancé en fast-forward sur `main`, départ `64863ac`

- **Mission / contraintes :** demande du responsable : appliquer le protocole GPU du rapport RC §5.3 sur le poste local (premier passage du projet hors conteneur), consigner, committer sur `main`. Aucun changement du code du jeu ; mesure du build de la RC (code applicatif de `d19667e`).
- **Lecture initiale :** AGENTS, JOURNAL (passe 10), README_START_HERE, gouvernance 00, `docs/RAPPORT_M06_RC.md` (§5, §7, §9), outils `browser.mjs`, `perf.mjs`, `perf-compare.mjs`, `duel-driver.mjs`, boucle de rendu de `arena.ts` (`frameMs` = fil principal, mise à jour + soumission du rendu ; FPS = cadence `requestAnimationFrame`).
- **Porte de démarrage locale :** `npm ci` (0 vulnérabilité), `npm run typecheck` 0 erreur, `npm test` **146/146**, `npm run build` OK (JS 768,37 Ko / 214,97 Ko gzip, identique à la RC).
- **Poste :** portable, AMD Ryzen 7 8845HS (8 cœurs / 16 fils), 31 Go, Windows 11 (10.0.26200), sur secteur, mode « Utilisation normale », écran interne 2560×1600 à 165 Hz ; Node 22.14.0 ; Chrome 155.0.8059.80 headless, ANGLE Direct3D 11. Deux adaptateurs : **Radeon 780M** (intégré, choisi par défaut par Chrome) et **RTX 4060 Laptop** (`--force_high_performance_gpu`). Poste NON dédié : autres sessions et navigateurs actifs, charge processeur totale relevée de 26 à 68 %.
- **Modifications (outils seulement) :**
  - `tools/browser.mjs` : `LQV_CHROME_ARGS` (arguments ajoutés : choix de l’adaptateur), `webglRenderer()`, `rendererLabel()`.
  - `tools/perf.mjs`, `tools/perf-compare.mjs` : le rapport écrivait « SwiftShader (CPU) » **en dur, même en mode GPU** → libellé du moteur réellement relevé, champs `gpu` et `chromeArgs`.
  - `tools/perf-play.mjs` (`npm run perf:play`) : étape 3 du protocole automatisée. Un duel complet est joué au clic (pilote de QA partagé, audits compris), avec séquences et chorégraphies en mouvement réel au rythme normal ; chaque intervalle rAF est enregistré par vue A / B / Clash, et `arenaStats()` toutes les 500 ms.
  - README, rapport RC §5.3–§5.4, §7, §9.
- **[OK] Résultats** (détail : rapport RC §5.4 ; fichiers `artifacts/qa/perf-gpu-{780m,rtx4060}.json`, `perf-compare-gpu-*.json`, `perf-play-gpu-*.json`) :
  - **Duel à l’arrêt, 1280×720, 7 rondes entrelacées M03.2 `110525d` ↔ RC :** sur la RTX 4060, A = 161 → 156 img/s et B = 156 → 157 img/s, pour ≈ 2,5 ms de fil principal par image, donc **au plafond de l’écran**. Sur la 780M, médianes A = 95 → 128 img/s et B = 143 → 142 img/s, avec une dispersion de 73 à 163 img/s pour un même build ; **aucune ronde sous 72 img/s**. Draw calls 73 / 75 identiques. **Aucun écart attribuable à la RC** : SwiftShader mesurait 40–53 ms par image.
  - **Duels joués** (seed 202, 14 tours jusqu’au K.-O., 13 séquences, 10 Clashes, ≈ 110 s chacun ; 1280×720 et 1920×1080 sur chaque GPU) : 4/4 terminés, **0 erreur console, 0 fuite, 0 écart de vue**. Médiane de **6,1 ms (164 img/s) partout**, p95 12–18 ms, p99 24–30 ms. Images > 16,7 ms : 4,5–4,6 % (780M) et 9,8–11,3 % (RTX). Images > 33,3 ms : 0,5–0,7 %. Fil principal de l’arène : médiane 1,6–2,4 ms, **jamais plus de 6,2 ms**.
  - **Conclusion ADR 013 :** aucun compromis de rendu n’est nécessaire sur ce poste. Le coût des bougies (la moitié de l’image sous SwiftShader) était un artefact du rendu logiciel : sur GPU, l’ablation reste dans le bruit (1,8–2,4 ms).
- **[KO] Échecs / tentatives abandonnées :**
  - Premier relevé sur la RTX : 1 rAF/s pendant la première seconde, le temps que le GPU discret se réveille. Correctif : mise en régime de 3 s ou plus avant tout relevé.
  - Image non plafonnée (`--disable-gpu-vsync --disable-frame-rate-limit`) : Chrome 155 headless retombe à ≈ 57 rAF/s, même sur une page vide. Mode abandonné : la mesure reste plafonnée à 165 Hz.
  - Ablation du décor non concluante sur GPU (bruit supérieur à l’écart sur 3 rondes).
  - Le banc moteur, sur 200 duels identiques (mêmes vainqueurs, 9,84 tours), a mesuré 31,6 puis 71,6 ms par duel à 3 minutes d’intervalle : poste chargé. Aucun chiffre processeur isolé n’est comparable.
- **[?] Incertitudes :**
  - Les **à-coups** (85 à 230 ms, une poignée par duel) sont identiques sur les deux GPU alors que l’arène ne dépasse jamais 6,2 ms. Ils viennent donc du fil principal hors arène : DOM, mise en page, ramasse-miettes, génération d’illustrations, ou le pilote de QA lui-même, qui interroge la page toutes les 60 ms et audite le DOM à chaque décision. Les percentiles sont donc pessimistes par rapport à un joueur humain. Source non identifiée.
  - Plus d’images lentes sur la RTX que sur la 780M. Hypothèse non vérifiée : copie des images du GPU discret vers l’intégré, qui pilote l’écran.
  - Non mesurés : poste de bureau, campagne complète en fenêtre visible (seule la sonde l’a été : 165 rAF/s), temps GPU par image, mode batterie.
- **Tests :** `npm run typecheck` 0 erreur, `npm test` 146/146, `npm run build` OK au départ et avant commit. Commandes de mesure : `LQV_GPU=1 CHROMIUM_PATH=<Chrome> [LQV_CHROME_ARGS=--force_high_performance_gpu] LQV_PERF_OUT=… node tools/perf.mjs`, puis `… LQV_BEFORE=<dist de 110525d> LQV_BEFORE_SHA=110525d LQV_PERF_COMPARE_OUT=… node tools/perf-compare.mjs 7`, puis `… LQV_PERF_PLAY_OUT=… node tools/perf-play.mjs`. Le build « avant » a été construit depuis `git archive 110525d` hors du dépôt. `artifacts/qa/perf.json` (SwiftShader, RC) n’a pas été écrasé.
- **Pensée :** sur GPU, le rendu 3D approuvé n’est plus le goulot ; la fluidité dépend désormais du fil principal hors arène. La mesure doit nommer l’adaptateur réellement utilisé : un portable hybride en a deux, et un rapport qui écrit « SwiftShader » en dur ment même quand le GPU tourne.
- **À reprendre :** trace de performance Chrome d’un duel joué sans pilote de QA (source des à-coups) ; temps GPU par image via la requête temporelle ; mesure sur un poste de bureau ; revue opérateur de la RC (rapport §9).

## Passe 12 — Trace et attribution des à-coups du fil principal (GPU réel) — 2026-10-17, worktree local, départ `b6f0c98`, commit sur `main`

- **Mission / contraintes :** demande de la session de coordination. Identifier l’origine des à-coups ponctuels d’un duel joué sur le portable de l’opérateur (passe 11 : ≤ 0,7 % d’images > 33 ms, pointes 85–230 ms) avec une trace Chrome, sans le sondage du pilote de QA. Les attribuer, puis corriger ce qui se corrige sans toucher la composition approuvée (ADR 013), les règles (`src/game` inchangé) ni les secrets, avec mesures avant / après entrelacées.
- **Lecture initiale :**
  - AGENTS, JOURNAL (passes 10–11), gouvernance 00, rapport RC §5.4, ADR 013 ;
  - outils `perf-play`, `browser`, `duel-driver` ;
  - `duelSession`, `controller` (rendu, séquence, IA), `board.renderApp`, `clashStage`, `arena` (boucle, FX transitoires, `stats()`), `cardArt`.
- **Modifications :**
  - Jeu :
    - `src/scene/arena.ts` : un témoin garde vivant un matériau par programme de FX transitoire (anneau, gerbe), avec une définition partagée. `renderer.compile(scene, camera)` à la création de l’arène (menus). Le témoin est dessiné à la première image seulement, à opacité nulle en mélange additif (aucun pixel changé).
    - `src/art/cardArt.ts` : canvas des illustrations tramé par le processeur (`willReadFrequently`).
  - Outils :
    - `tools/perf-trace.mjs` (`npm run perf:trace`) : duel joué en mode `lean`, rAF + LoAF dans la page, trace CDP en option, navigateur neuf ou profil persistant, builds entrelacés ABBA, rival à 650 ms par défaut ;
    - `tools/trace-analyze.mjs` : source map VLQ, lecture filtrée en deux passes des traces de plusieurs centaines de Mo, temps propre par catégorie, échantillons V8 par fonction source, fils du processus GPU, familles de causes ;
    - `tools/art-canvas-compare.mjs` : génération et pixels des illustrations, avant / après, GPU / SwiftShader ;
    - `duel-driver.mjs` : `run.lean` et `waitLean` (sans sondage), comportement historique inchangé sinon ;
    - `browser.mjs` : `launchOptions`, `launchPersistent`.
  - Docs : rapport RC §5.4 corrigé et §5.5 (nouveau), §7, §9 point 6 ; README (commande `perf:trace`) ; `artifacts/qa/trace/LISEZMOI.md`.
- **[OK] Attribution** (rapport §5.5 ; Radeon 780M sauf mention) :
  1. Sans le pilote de QA, le p95 tombe de 12,2 à 6,3 ms, mais les pointes > 50 ms restent : le pilote n’en est pas la cause.
  2. `arenaStats().frameMs` est une moyenne glissante (α 0,1) relevée toutes les 500 ms : elle ne pouvait pas voir les pointes. La passe 11 concluait « l’arène jamais > 6,2 ms » : **faux**, la boucle de l’arène a atteint 22–89 ms.
  3. **Programme WebGL des anneaux FX.** Il est compilé à la première révélation, puis libéré quand le dernier anneau disparaît et relié de nouveau à l’effet suivant. On le voit aux temps du Clash pendant tout le duel (`getProgramInfoLog` synchrone, `Program::MainLinkLoadEvent::wait` au GPU). **Corrigé.**
  4. **Illustrations générées à la première apparition.** Dans un canvas accéléré, `toDataURL` relit le GPU : 25–53 ms dans le clic « Tour suivant » ou à la révélation. **Corrigé.**
  5. **Shaders Skia de Chrome** (peinture du DOM) à la première révélation et au premier Clash : 90–224 ms, fil principal libre. Après correctif, 53 liaisons Skia et 0 liaison WebGL au processus GPU. Une seule fois par profil Chrome : absent des duels suivants dans un profil persistant. **Non corrigeable dans le jeu.**
  6. **Re-rendu complet du plateau à chaque commande** (`renderApp` + mise en page forcée) : 35–60 ms, doublé quand le rival répond à 0 ms comme dans toute la QA. **Non corrigé** : prochain chantier.
  7. Ramasse-miettes ≤ 8 ms dans une fenêtre d’à-coup : pas une cause.
- **[OK] Mesures avant / après** (rondes entrelacées, renderer relevé à chaque fois) :
  - **Effet séparé** (poste chargé, navigateur neuf, rival 0 ms, 3 rondes) : images > 50 ms 44 → 22 (programmes gardés) → 19 (+ canvas). Boucle de l’arène 10 → 0 ; clic « Tour suivant » 6 → 0.
  - **Final, poste calme** (profil persistant, rival 650 ms, 3 rondes, 780M et RTX 4060) : les deux builds sont au plafond (p95 6,2 ms, p99 ≤ 6,4 ms), avec ≤ 3 images > 50 ms par duel. Les pointes restantes viennent des shaders Skia du premier duel froid (97–115 ms) ; l’écart entre builds est dans le bruit.
  - Même hash final, 0 erreur console.
  - Illustrations : galerie 183,7 → 139,5 ms ; rendu identique GPU / SwiftShader (37/37, contre 0/37 avant) ; écart moyen ≤ 1,6/255 avec l’ancien rendu, indiscernable (`screenshots/qa/passe12/`).
- **[KO] Échecs / tentatives abandonnées :**
  - Premier enregistrement avec les catégories `gpu` et `timeline.frame` : 1 Go décompressé, illisible en une chaîne. Le repère de synchronisation était absent, car `Tracing.start` rend la main avant que le processus de rendu n’enregistre. Corrigé : délai d’1 s, deux repères, catégories réduites, lecture filtrée en flux.
  - Hypothèse « le canvas processeur reproduit la référence SwiftShader du conteneur » : **fausse**. Le canvas y était aussi accéléré (par SwiftShader) ; l’écart est de 1,8/255 avec cette référence.
  - Comparaison de neuf duels dans UN navigateur : seul le premier duel est froid. Ce mode est inutilisable pour les coûts de première fois, d’où les modes `FRESH` et `USERDATA`.
  - Le build intermédiaire gardait le programme mais pas son premier usage : la boucle de l’arène prenait encore 38 ms à la première révélation. D’où le dessin du témoin à la première image.
  - **`qa:browser` 4/5 sur ce poste** : `mobile-rotation-touch` trouve une scène du Clash encore en fondu au début des tours 2 et 3. **Même échec, identique, sur la RC intacte** avec ses propres outils (`git archive b6f0c98`). La course vient de la vitesse du poste ; le conteneur passe 5/5. Non corrigé ici (le corriger changerait la chorégraphie) : « À reprendre » 4b.
- **[?] Incertitudes / arbitrages :**
  - Le poste n’était pas dédié : Chrome Remote Desktop, autres sessions, charge processeur de 33 à 74 %. Le cache de shaders du pilote AMD s’est réchauffé au fil de la journée, ce qui explique 12–21 pointes le matin contre 0–2 en fin de passe pour le même build. Les tableaux nomment les conditions de chaque série.
  - Une image isolée par duel (55–61 ms, fin de duel) n’occupe ni le fil principal ni celui du GPU : non attribuée.
  - Canvas processeur : arbitrage demandé (rapport §9, point 6).
  - Les résultats « après » viennent du build de l’arbre de travail sur `b6f0c98` (champ `commit` des JSON) ; le commit de la passe contient exactement ce code.
- **Tests :**
  - `npm run typecheck` 0 erreur ; `npm test` 146/146 ; `npm run build` OK (JS 768,64 Ko / 215,08 Ko gzip).
  - `npm run qa:browser` (SwiftShader, poste local) : 4/5, résultats identiques à la RC intacte sur ce poste (`artifacts/qa/trace/qa-browser-passe12-{avant,apres}.json`). `artifacts/qa/qa-browser.json` reste la preuve de la RC (conteneur, 5/5).
  - `npm run qa:rc` (SwiftShader, poste local) : 8/9. Longévité 12 duels, moteur indépendant des animations, sans WebGL, clavier, coût par écran : OK. **Contraste** : le rang « II » des vignettes de l’éditeur de deck mesure 3,5–3,6:1. **Échec identique sur la RC intacte** sur ce poste, alors que le conteneur passait (`artifacts/qa/trace/qa-rc-passe12-{avant,apres}.json`). `artifacts/qa/qa-rc.json` reste la preuve de la RC.
  - Commandes de mesure : `artifacts/qa/trace/LISEZMOI.md`.
- **Perf / visuels :** Ryzen 7 8845HS, Radeon 780M et RTX 4060 Laptop (`--force_high_performance_gpu`), Chrome 155.0.8059.80 headless, ANGLE D3D11, 1280×720. Avant = `b6f0c98` (bundle identique à la RC `d19667e`).
- **Pensée :**
  - Une pointe ne se lit pas dans une moyenne : il faut l’image elle-même, puis la trace qui dit qui travaillait (fil principal, GPU, et pour quel client).
  - Les coûts de première fois dépendent des caches : mesurer froid et chaud, et le dire.
  - Un mélange additif à opacité nulle permet de préparer un programme sans changer un pixel.
- **À reprendre :**
  - re-rendu ciblé du plateau (patchs au lieu de `renderApp` complet) ;
  - arbitrage du fondu de la scène du Clash au tour suivant (4b) et du canvas processeur (4c) ;
  - temps GPU par image ;
  - poste de bureau ;
  - revue opérateur de la RC.

## Passe 13 — Re-rendu ciblé du plateau (coût de chaque commande) — 2026-10-17, worktree local avancé sur `main`, départ `4ccce89`, commit sur `main`

- **Mission / contraintes :** demande de la session de coordination. Réduire le coût du fil principal de chaque commande de duel : `renderApp` recréait tout `#app` à chaque commande et chaque réponse du rival (35–60 ms sous charge et trace, passe 12). Ne toucher que ce qui change, avec exactement le même DOM, la même composition (ADR 013) et le même comportement. Garder le principe « jamais d’élément interactif recréé pendant une interaction pointeur ». Règles V3.0/V3.2 (`git diff 4ccce89 -- src/game` vide) et secrets inchangés. Mesure avant / après par `perf:trace` sur le GPU réel, rondes entrelacées, rival à 650 ms.
- **Lecture initiale :**
  - AGENTS, JOURNAL (passe 12), gouvernance 00, ADR 013, rapport RC §5.5 ;
  - note de la passe 12 (dossier partagé) ;
  - `board.ts`, `dom.ts`, `cardView.ts`, `duelSession.ts`, `controller.ts` (déclencheurs de rendu), `drag.ts`, `clashStage.ts` ;
  - outils `perf-trace`, `trace-analyze`, `duel-driver`, `qa-browser`, `qa-product`.
- **Diagnostic** (profil V8 des commandes, 780M, poste calme) :
  - `renderApp` ≈ 92 % du temps d’une commande : construction, `replaceChildren`, style et mise en page forcés par la relecture du défilement du journal et le FLIP ;
  - un rendu sans aucun changement d’état coûtait 4,5–6,5 ms : 233 éléments restylés, 339 objets sur 344 remis en page.
- **Modifications :**
  - `src/presentation/dom.ts` :
    - `patchChildren` : appariement par `data-key`, sinon premier nœud compatible vers l’avant ; sous-arbres identiques gardés d’un bloc par `isEqualNode` (`tracked` relève écouteurs et éléments `fresh`) ;
    - écouteurs transférables : répartiteur partagé et table par élément (`listen`) ;
    - `fresh()`, `animatedIn()` ;
    - `domDifference` (QA).
  - `src/presentation/board.ts`, `renderApp` :
    - arbre complet construit puis patché ;
    - `blur` de l’élément focalisé au même moment qu’avant ;
    - `view-switch` pendant un passage A ↔ B ;
    - vérification `renderCheck` (DOM, écouteurs, aucune transition CSS sur un élément gardé).
    - Marqués `fresh` : PV, bulle du rival, consigne, toast, menu tactique, HUD en impulsion, pastille « Réfléchit », Primaire qui se retourne. Écouteurs des cases par `listen`.
    - `patchBeat` inchangé.
  - `src/presentation/cardView.ts` : face de carte construite une fois, puis clonée.
  - `src/styles.css` : règle `#app.view-switch .side .card, .zone, .zone-floor { transition: none }`.
  - `src/app/params.ts` (`renderCheck=1`, QA seulement) ; `duelSession.ts` (crochet QA `renderCheck`).
  - Outils :
    - `perf-trace` : coût par commande (`commands`, `commandSummary`), comparaison appariée (`commandPairs`), temps processeur par tâche (`commandPairsCpu`), mode `LQV_TRACE_LIGHT=1`, Event Timing des clics ;
    - `trace-analyze` : `commandTasks` (`tdur`), catégories par commande, `--resume` étendu ;
    - `duel-driver` `waitLean` : observe le sous-arbre de `#app` ;
    - `qa-browser` / `qa-product` : `LQV_RENDER_CHECK=1`, `LQV_QA_OUT`.
  - Docs : ADR 015 (nouveau), rapport RC §5.6 et §7, README (paramètre `renderCheck`, options d’outils), `artifacts/qa/trace/LISEZMOI.md`.
- **[OK] Équivalence vérifiée :**
  - 659 rendus comparés à un rendu complet en clic, clavier et glisser : 0 écart DOM, 0 transition CSS démarrée sur un élément gardé ;
  - la vérification détecte une régression : sans la garde `view-switch`, elle signale `transform` et `box-shadow` sur les cartes posées ;
  - focus, `blur` et inspection : même séquence d’événements et même état (`inspect`, `selected`, inspecteur, élément focalisé) que la RC, étape par étape (clics, re-clic, clavier, Échap) ;
  - seule différence relevée : un `pointerenter` sur le conteneur `.hand` gardé, sans écouteur ;
  - QA : voir Tests.
- **[OK] Mesures** (rapport §5.6 ; `artifacts/qa/trace/passe13-*.json`) :
  - **Rendu sans changement d’état** (780M) : 4,5–6,5 → 2,4–3,2 ms ; éléments restylés 233 → 27 ; objets remis en page 339 → 50.
  - **Temps processeur par commande**, 3 rondes ABBA, 90 commandes par duel :
    - 780M : médiane 9,6 → 7,4 ms, moyenne 11,2 → 9,1 ms ; apparié −2,0 ms, plus rapide dans 214 commandes sur 264, les trois rondes négatives ;
    - RTX 4060 : 8,2 → 6,4 ms et 9,3 → 8,3 ms ; apparié −1,5 ms, 158 sur 265.
  - **Mesure dans la page** (médianes, 780M puis RTX) :
    - clic de commande 7,3 → 5,2 et 6,3 → 4,6 ms ;
    - changement de vue 8,3 → 6,2 et 6,9 → 5,2 ms ;
    - rendus hors commande 6,7 → 4,4 et 5,5 → 3,7 ms ;
    - clic jusqu’à l’image (Event Timing) : médiane 40 → 32 ms, moyenne 46,6 → 33,2 et 39,1 → 31,0 ms.
  - À-coups > 50 ms : 7 → 6 (780M) et 11 → 5 (RTX). Causes : shaders Skia du premier duel (§5.5).
- **[KO] Échecs / tentatives abandonnées :**
  - **Première version, `blur` non reproduit.** Chrome 155 envoie `blur` à l’élément focalisé qu’on retire, encore attaché. Son écouteur remplaçait `.inspector` en plein patch : deux inspecteurs, exception, focus perdu. `renderCheck` l’a révélé (28 écarts sur 230 rendus).
  - **Premier appariement en cascade.** Un frère changé faisait remplacer tout le tiroir du journal.
  - **FLIP poursuivi sur des rangées gardées.** Le pilote de QA visait une case encore en mouvement : glisser-déposer raté dans 6 des 9 duels pilotés en glisser. Corrigé en remplaçant tout élément animé, comme le faisait la recréation.
  - **`#app.view-switch .side *`** : le sélecteur universel restylait tout `#app` deux fois par passage de vue. Les commandes avec changement de vue étaient plus lentes qu’avant (7,0 → 7,6 ms). Corrigé par des sélecteurs ciblés.
  - **Comparaison en temps mural seul** (`passe13-commandes-780m.json`, 4 rondes) : non concluante par ronde (+0,7 à −1,8 ms). La charge du poste variait d’un duel à l’autre (25 à 409 images > 16,7 ms). D’où le temps processeur des tâches, qui exclut le temps où le fil attend le processeur.
  - **Mise à jour sur place des attributs** (transitions coupées par une classe temporaire) : envisagée, non faite. Gain attendu faible, car les remplacements restants sont petits, pour un risque de comportement plus élevé.
- **[?] Incertitudes / arbitrages :**
  - **Inversions d’engagement.** Le build plus rapide laisse parfois le pilote verrouiller l’engagement avant la réponse du rival à 650 ms. L’ordre des engagements secrets s’inverse et le hash final change ; vainqueur et nombre de tours restent identiques. Fréquence : 1 duel « après » sur 4 dans la série murale 780M, aucun dans la série processeur 780M, 2 sur 3 en RTX. Ce n’est pas un écart de règle : l’appariement se fait par type et phase.
  - **Écarts de comportement assumés, non observables par le jeu** : le conteneur `.hand` gardé ne reçoit plus `pointerenter` après un rendu ; les régions `aria-live` sont recréées comme avant (aucune amélioration d’accessibilité tentée).
  - **Poste partagé** : charge variable ; les tableaux nomment la mesure (processeur ou murale) et le GPU.
  - **Les résultats « après » viennent du build de l’arbre de travail sur `4ccce89`** (champ `commit` des JSON) ; le commit de la passe contient exactement ce code.
- **Tests :**
  - `npm run typecheck` 0 erreur ; `npm test` 146/146 ; `npm run build` OK (JS 773,7 Ko / 217,0 Ko gzip, contre 768,6 / 215,1).
  - `npm run qa:browser` (SwiftShader, poste local, `artifacts/qa/trace/qa-browser-passe13-*.json`) : **4/5 avant comme après**, résultats identiques duel par duel (issue, tours, vainqueur, vues, postures, composition, secrets, clics perdus). Seul échec : le connu `mobile-rotation-touch`, scène du Clash en fondu aux tours 2 et 3 (4b).
  - `LQV_RENDER_CHECK=1 npm run qa:browser` : 4/5, même échec connu ; **1106 rendus comparés à un rendu complet, 0 écart**, 0 erreur console.
  - `npm run qa:product` (`qa-product-passe13-*.json`) : **8/8 parcours avant comme après**, 0 erreur console. Le duel du parcours B (profil sans `profileSeed`) change d’un lancement à l’autre : 14 tours pour la RC, 8 et 13 aujourd’hui.
  - `LQV_RENDER_CHECK=1 npm run qa:product` : 8/8, 0 erreur console, donc aucun écart. Le bilan chiffré ne couvre que la dernière page de chaque parcours (A et E rechargent) : 172 + 1 + 1 rendus.
  - `npm run qa:rc` non relancé : ni règles, ni enveloppe, ni contraste touchés. Passe 12 : 8/9 sur ce poste, contraste du rang « II ».
  - `artifacts/qa/qa-browser.json` et `qa-product.json` restent les preuves de la RC (conteneur).
- **Perf / visuels :**
  - Ryzen 7 8845HS, Radeon 780M et RTX 4060 Laptop (`--force_high_performance_gpu`), Chrome 155.0.8059.80 headless, ANGLE D3D11, 1280×720.
  - Aucun changement visuel : même DOM, vérifié rendu par rendu.
- **Pensée :**
  - Un re-rendu ciblé n’est équivalent que s’il reproduit aussi les effets de bord de la recréation : transitions qui ne partent pas, animations coupées ou relancées, `blur` au retrait, entrée du pointeur. Le plus sûr est de remplacer tout élément dont l’état visible change, et de le vérifier contre un rendu complet à chaque rendu.
  - Un sélecteur qui finit par `*` sous une classe basculée invalide tout le sous-arbre.
  - Sur un poste partagé, comparer des builds en temps processeur des tâches, pas en temps mural.
- **À reprendre :**
  - pré-générer les illustrations hors commande (≈ 2 ms par commande en moyenne aux premiers tours) ;
  - `patchBeat` : journal recréé à chaque temps de résolution (resté tel quel, hors périmètre) ;
  - arbitrages ouverts 4b / 4c ;
  - temps GPU par image ;
  - poste de bureau ;
  - revue opérateur de la RC.
