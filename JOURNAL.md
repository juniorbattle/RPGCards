# JOURNAL.md — Les Quatre Voies

**Nature :** journal de production du **nouveau projet**, et non journal copié de RPG-ArtByCode.  
**Convention :** passes chronologiques, plus récente en bas ; statut `[OK]`, `[KO]`, `[?]` ; preuves vérifiables.  
**Dernière passe :** 2 — M02 : confrontation face à face (vues A/B, rival procédural expressif), résolution séquencée, IA à mémoire autorisée (branche `claude/m02-confrontation-face-a-face`).

## État initial connu

- `[OK]` Règlement V3.0 consolidé et présent dans `source/CONTRAT_REGLES_V3_0_HISTORIQUE.md` ; contient le duel, 16 variantes, 4 Signatures, 6 Techniques et les raccordements.
- `[OK]` Simulateur de référence V3.2 fourni dans `simulator_ref/simulator` ; moteur JavaScript autonome, UI de test, journal corrigé. **N'est pas le futur jeu.**
- `[OK]` Delta de gameplay à intégrer au nouveau moteur : Amplifier le Rang reçoit +1 par Secondaire de même famille, selon `contracts/02_...` ; états chargement/réserve/active visibles ; chronologie des choix inchangée.
- `[OK]` Référence méthodologique RPG-ArtByCode auditée publiquement (main, commit `d7c439b3b08280d7643d8cfe3f658de6ad49b928`) : Vite/TypeScript/Three.js, procédural, outils de capture, mesure, graine, journal AGENTS.
- `[?]` Aucune implémentation production dans ce nouveau dépôt au moment de la remise de kit ; les commandes, perf, captures et intégrations devront être créées/testées par Claude Code.
- `[?]` Il n'existe aucun contrat validé de caméra, décor urbain, composition d'arène, palette détaillée ou sprites personnage pour Les Quatre Voies.

## À reprendre (prioritaire)

1. **Revue opérateur M02** : principe A/B et temps d’observation (ADR 006), style et personnalités du rival (ADR 007), granularité de la résolution (ADR 008) ; captures `screenshots/qa/m02/`.
2. **Arbitrages encore proposés** (ADR 004) : ARB-002 (profil du rival public), ARB-001, ARB-005, ARB-011 ; ratification éventuelle du delta D-01 (V3.3).
3. **Mesure sur GPU réel** (hors conteneur) : vues A et B, portrait, FX ; budget mobile.
4. QA : forcer des situations Rupture / Dissipation côté humain (scénarios dédiés) ; accélérer la QA (rendu logiciel lent).
5. Rival : transitions de gabarit DOM adoucies, mains/gestes plus riches, regard vers la carte inspectée, sans jamais lire un secret ; préparer (sans l’activer) le contrat des futurs « tells ».
6. IA : modèle du joueur (tendances publiques par situation), niveaux de difficulté ; découpage du bundle Three.js.

## Principes à garder

- La présentation (vues, expressions, séquence) est pilotée par des modules PURS testés, alimentés par des faits publics ; la 3D et le DOM ne font qu’exécuter.
- Pendant une mise en scène, ne jamais recréer les éléments interactifs (patch ciblé) ; en rendu à la demande, fusionner les rendus d’une même image.
- Une seule arithmétique : `computeClash` (pur) sert moteur, IA et prévisualisation ; ne jamais dupliquer une formule de règle dans l’UI.
- Les fenêtres optionnelles s’ouvrent sur information **publique** uniquement ; une vue (`viewFor`) est une copie filtrée, jamais l’état brut.
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
