# JOURNAL.md — Les Quatre Voies

**Nature :** journal de production du **nouveau projet**, et non journal copié de RPG-ArtByCode.  
**Convention :** passes chronologiques, plus récente en bas ; statut `[OK]`, `[KO]`, `[?]` ; preuves vérifiables.  
**Dernière passe :** 6 — M03.2 sur `main` : rival rapproché et expressif dans les deux vues, plateau éclairé avec contraste mesuré, Clash allégé, gabarit mobile paysage (ADR 012, `docs/RAPPORT_M03_2.md`).

## État initial connu

- `[OK]` Règlement V3.0 consolidé et présent dans `source/CONTRAT_REGLES_V3_0_HISTORIQUE.md` ; contient le duel, 16 variantes, 4 Signatures, 6 Techniques et les raccordements.
- `[OK]` Simulateur de référence V3.2 fourni dans `simulator_ref/simulator` ; moteur JavaScript autonome, UI de test, journal corrigé. **N'est pas le futur jeu.**
- `[OK]` Delta de gameplay à intégrer au nouveau moteur : Amplifier le Rang reçoit +1 par Secondaire de même famille, selon `contracts/02_...` ; états chargement/réserve/active visibles ; chronologie des choix inchangée.
- `[OK]` Référence méthodologique RPG-ArtByCode auditée publiquement (main, commit `d7c439b3b08280d7643d8cfe3f658de6ad49b928`) : Vite/TypeScript/Three.js, procédural, outils de capture, mesure, graine, journal AGENTS.
- `[?]` Aucune implémentation production dans ce nouveau dépôt au moment de la remise de kit ; les commandes, perf, captures et intégrations devront être créées/testées par Claude Code.
- `[?]` Il n'existe aucun contrat validé de caméra, décor urbain, composition d'arène, palette détaillée ou sprites personnage pour Les Quatre Voies.

## À reprendre (prioritaire)

1. **Revue opérateur M03.2** : proportions du rival, lumière, pilule de conséquences du Clash, gabarit paysage (ADR 012) ; planches `screenshots/qa/m03-2/comparaison-*.png`, `13-expressions.png`, démonstrations `screenshots/qa/m03-2/clash/` ; ADR 009 / 010 toujours à valider.
2. **Écarts de fidélité restants** (`docs/RAPPORT_M03_2.md` §8) : personnages en plans 2,5D (pas de volume ni de chevelure détaillée), décor moins dense, ni bloom ni profondeur de champ, table encore plus sombre que la preview, typographie système ; paysage = gabarit compact du bureau (textes ≈ 9,5 px à 844×390), pas l’interface simplifiée du panneau 6.
3. **Arbitrages encore proposés** (ADR 004) : ARB-002 (profil du rival public), ARB-001, ARB-005 (+ ARB-005b : carte camouflée remplacée pendant l’engagement, nommée en fin de tour depuis la passe 5), ARB-011 ; ratification éventuelle du delta D-01 (V3.3). Inférences restantes documentées (`docs/RAPPORT_M03_1B.md` §6).
4. **Mesure sur GPU réel** (hors conteneur) : vues A/B, bougies (shader de points), scène du Clash (WAAPI) ; budget mobile.
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
- Instrumenter avant optimiser ; captures et chiffres doivent venir du même build, seed et machine précisés.
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
