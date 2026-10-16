# JOURNAL.md — Les Quatre Voies

**Nature :** journal de production du **nouveau projet**, et non journal copié de RPG-ArtByCode.  
**Convention :** passes chronologiques, plus récente en bas ; statut `[OK]`, `[KO]`, `[?]` ; preuves vérifiables.  
**Dernière passe :** 1 — M01 : socle Vite/TS/Three.js, moteur de duel V3.0 + delta V3.2, MVP jouable contre IA, art procédural, QA navigateur (branche `claude/jolly-keller-w17gmp`).

## État initial connu

- `[OK]` Règlement V3.0 consolidé et présent dans `source/CONTRAT_REGLES_V3_0_HISTORIQUE.md` ; contient le duel, 16 variantes, 4 Signatures, 6 Techniques et les raccordements.
- `[OK]` Simulateur de référence V3.2 fourni dans `simulator_ref/simulator` ; moteur JavaScript autonome, UI de test, journal corrigé. **N'est pas le futur jeu.**
- `[OK]` Delta de gameplay à intégrer au nouveau moteur : Amplifier le Rang reçoit +1 par Secondaire de même famille, selon `contracts/02_...` ; états chargement/réserve/active visibles ; chronologie des choix inchangée.
- `[OK]` Référence méthodologique RPG-ArtByCode auditée publiquement (main, commit `d7c439b3b08280d7643d8cfe3f658de6ad49b928`) : Vite/TypeScript/Three.js, procédural, outils de capture, mesure, graine, journal AGENTS.
- `[?]` Aucune implémentation production dans ce nouveau dépôt au moment de la remise de kit ; les commandes, perf, captures et intégrations devront être créées/testées par Claude Code.
- `[?]` Il n'existe aucun contrat validé de caméra, décor urbain, composition d'arène, palette détaillée ou sprites personnage pour Les Quatre Voies.

## À reprendre (prioritaire)

1. **Arbitrages responsable** (ADR 004) : ARB-002 (profil rival public ?), ARB-004 (famille sous Dissimulation), confirmations ARB-001/003/005/011 ; ratification ou non du delta D-01 en V3.3.
2. Revue des captures et choix de piste caméra (ADR 003 : `tilted` par défaut, `frontal` comparatif) avant tout investissement HD-2D.
3. QA navigateur : exercer Dissipation/Recentrage/Sondage côté humain dans `qa:browser` ; test explicite du repli sans WebGL.
4. IA : mémoire des cartes vues (événements privés), personnalités (bluff, spécialiste Interférence), niveau de difficulté.
5. Lisibilité : animation de résolution séquencée (révélation → interférences → impact) consommant les événements ; prévisualisation des dégâts en Engagement.
6. Mesures GPU réelles (hors conteneur) ; découpage du bundle (Three.js ≈ 600 kB non compressé).

## Principes à garder

- Une seule arithmétique : `computeClash` (pur) sert moteur, IA et prévisualisation ; ne jamais dupliquer une formule de règle dans l’UI.
- Les fenêtres optionnelles s’ouvrent sur information **publique** uniquement ; une vue (`viewFor`) est une copie filtrée, jamais l’état brut.
- Aucun re-rendu global pendant une interaction pointeur (cause d’un clic perdu observé en QA, passe 1).
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
