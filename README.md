# RPGCards — Les Quatre Voies

> **Mandat de production actif M04–M06 (16 octobre 2026)** : la **composition actuelle du duel desktop M03.2 est APPROUVÉE** (rival de face en buste expressif, deux vues, HUD et six chorégraphies). La priorité est désormais un **jeu solo opérationnel** avec accueil, deck, rivaux, parcours, résultats et sauvegarde ; mobile paysage et détails d'art secondaires sont différés. Voir `docs/missions/M04_M06_PROGRAMME_JEU_OPERATIONNEL.md` et l'ADR 013. **M04 et M05 livrés** (`docs/RAPPORT_M04.md`, `docs/RAPPORT_M05.md`, ADR 014) : `npm run dev` ouvre le jeu sur un accueil — profil, deck légal, série de trois manches et duels libres (4 rivaux), résultats, déblocages de prototype, collection, aide, options, sauvegarde locale versionnée et reprise exacte d’un duel interrompu.

Duel de cartes tactique (noyau du futur RPG urbain) : **moteur de règles TypeScript pur**, plateau à **manipulation directe** (glisser-déposer, clic-pour-poser, tactile, clavier), **adversaire IA non omniscient**, **art procédural par code** et **arène Three.js** provisoire.

**M02 — confrontation face à face** (branche `claude/m02-confrontation-face-a-face`) : un **rival procédural expressif** se tient de l’autre côté d’une table de duel ; **vue A « confrontation »** frontale par défaut, **vue B « manipulation »** inclinée pour composer (avec portrait vivant du rival), transitions pilotées par les phases ; **résolution séquencée** (Interférences → Rang → absorption/dégâts → conséquences) ; IA à **mémoire autorisée** et 3 profils. Les expressions ne lisent que des faits publics : **aucun tell** ni mécanique psychologique n’est introduit.

**M03 — fidélité à la preview validée et Clash physique** (branche `claude/m03-ui-fidele-et-clash-anime`) : composition fidèle à `reference/REFERENCE_VISUELLE_VALIDEE_M03.jpg` (document de revue, jamais utilisé au runtime) — scène plein cadre, **HUD rival haut-gauche**, **HUD joueur compact bas-gauche avec portrait procédural**, bulle du rival, **main en bas**, commandes et Techniques bas-droite, journal en tiroir ; salle aux bougies et bannières des quatre familles ; **bandeaux ASSAUT (rouge, pointe) / GARDE (bleu, bouclier)** sur chaque Primaire révélée ; **les cartes s’affrontent** : six chorégraphies (Assaut contre Assaut dominé ou égalité, Garde victorieuse, Garde qui cède, victoire au Rang sans blessure, Garde contre Garde) dérivées du résultat résolu par le moteur, puis les deux Primaires rejoignent la défausse.

**M03.1B — confidentialité des effets camouflés et QA des Techniques** (sur `main`) : l’effet d’une Secondaire camouflée par Dissimulation ne publie plus son nom, son motif d’Insight ni son détail ; seules ses conséquences publiques (dégâts fixes, soin, gain d’Insight, destination, neutralisation) sont annoncées avec une origine générique, le propriétaire recevant tout en privé (ADR 011, `docs/RAPPORT_M03_1B.md`) ; Rupture et Dissipation sont jouables et vérifiées par l’interface (scénarios ci-dessous).

**M03.2 — fidélité visuelle du runtime** (sur `main`) : rival en buste rapproché, tête agrandie et visage modelé par code, visible dans les deux vues ; visage, table et cases mieux éclairés ; Clash allégé (verdict + trois conséquences au plus, départ en défausse montré sur les cartes) ; **gabarit mobile paysage** (844×390, 960×540) en plus du portrait, rotation en plein tour sans perte d’état (ADR 012, `docs/RAPPORT_M03_2.md`, comparaisons avant / après / preview dans `screenshots/qa/m03-2/`).

> Règlement appliqué : **V3.0 (`source/CONTRAT_REGLES_V3_0_HISTORIQUE.md`) + avenant mandaté V3.2 (`contracts/02_…`)**. Delta à connaître : en *Amplifier le Rang*, un soutien de **même famille** que la Primaire vaut **Rang imprimé + 1** (D-01). Le texte historique V3.0 n’est pas modifié ; la ratification éventuelle en V3.3 appartient au responsable.

## Démarrage

```sh
npm install          # Node ≥ 20 ; .npmrc legacy-peer-deps (voir ADR 005)
npm run dev          # http://localhost:5173
npm run typecheck    # tsc --noEmit, TypeScript strict
npm test             # Vitest : moteur, Clash, visibilité, IA
npm run build        # typecheck + build Vite → dist/
npm run qa:browser   # duels complets pilotés par l’UI (Chromium headless) → artifacts/qa/ (LQV_RENDER_CHECK=1 : chaque rendu ciblé comparé à un rendu complet, et chaque illustration du worker à la génération synchrone ; LQV_QA_OUT=fichier ; LQV_QA_STAGE_FAULT=opaque|stuck : cas négatif, une scène du Clash jamais nettoyée ou bloquée après son fondu, la QA doit échouer)
npm run qa:techniques # Rupture / Dissipation / effet camouflé par l’UI (souris + tactile) → screenshots/qa/m03-1b/
npm run shots        # captures M03 + planches preview ↔ runtime → screenshots/qa/m03/
npm run shots:clash  # chaque type de Clash : poses, mouvement réduit, pellicules → screenshots/qa/m03-2/clash/ (CLASH_OUT=…)
npm run shots:m03-2  # avant / après / preview M03.2 + mesures (LQV_BEFORE=<build M03> LQV_BEFORE_SHA=<sha>) → screenshots/qa/m03-2/
node tools/perf-compare.mjs 5  # rendu avant / après en rondes entrelacées (LQV_BEFORE=<build> LQV_BEFORE_SHA=<sha>) → artifacts/qa/perf-compare-m03-2.json
npm run perf         # mesures moteur + scène (machine courante) → artifacts/qa/perf.json
npm run perf:play    # duel complet joué au clic, intervalles d’image par vue A / B / Clash → artifacts/qa/perf-play.json
npm run perf:trace   # même duel SANS sondage ni audit (pilote `lean`) : à-coups > 50 ms attribués (LoAF ; trace Chrome si LQV_TRACE=1 ; caches froids si LQV_TRACE_FRESH=1 ; builds entrelacés LQV_TRACE_BUILDS=avant=…,apres=…) + coût de chaque commande par famille (passe 13), écart apparié séparé pour les commandes qui génèrent une illustration (passe 14) → artifacts/qa/trace/
npm run sim          # (optionnel) 200 duels IA/IA headless
npm run qa:product   # JEU (M04–M05) : 8 parcours de joueur depuis l’accueil (série complète, reprise, migration…) → artifacts/qa/qa-product.json (QA_SHOTS=dossier pour des captures ; LQV_RENDER_CHECK=1, LQV_QA_OUT comme qa:browser)
npm run qa:rc        # porte RC (M06) : sans WebGL, longévité, moteur indépendant des animations, mode démo, stockage refusé, réinitialisations, contraste, coût par écran → artifacts/qa/qa-rc.json
npm run shots:m04    # captures des écrans du jeu 1280×720 / 1920×1080 + preuve de cadrage du duel (SHOTS_OUT=…)
npm run video        # vidéo du parcours complet (Playwright) → screenshots/qa/m06/parcours-1280.mp4
npm run preview      # sert le build (dist/) sur http://localhost:4173
```

Mesures sur **GPU réel** (poste de l’opérateur, le conteneur n’en a pas) : `LQV_GPU=1 CHROMIUM_PATH=<Chrome> npm run perf` (sans forçage SwiftShader ; `LQV_HEADED=1` pour une fenêtre visible ; `LQV_CHROME_ARGS=--force_high_performance_gpu` pour le GPU discret d’un portable hybride, Chrome prenant l’intégré par défaut), de même `perf:play` et `tools/perf-compare.mjs` — chaque rapport indique le moteur de rendu réellement utilisé. Résultats sur le portable de l’opérateur : `docs/RAPPORT_M06_RC.md` §5.4.

`qa:browser`, `qa:techniques`, `shots`, `shots:clash`, `shots:m03-2` et `perf` exigent un build (`npm run build`) et un Chromium local (`/opt/pw-browsers/chromium` par défaut, sinon `CHROMIUM_PATH=…`). Aucun navigateur n’est téléchargé.

Deux QA lancées en même temps depuis deux arbres de travail ne doivent pas partager un port : `LQV_PREVIEW_PORT=<port>` remplace le port par défaut (4179) de `qa:browser`, `qa:product`, `qa:rc`, `shots:m04` et `video`. Un port déjà pris est refusé : le serveur de prévisualisation doit être le sien, sinon on testerait le build de l’autre arbre.

## Jouer

`npm run dev` (ou `npm run build && npm run preview`) ouvre le **jeu** :

- **Accueil** : Nouvelle partie (nom, Signature = voie de départ, deux Techniques), Continuer (reprend le duel en cours s’il y en a un, sinon le tableau), Deck, Collection, Options, Aide, Recommencer (confirmé).
- **Rencontres** : la série *Tournoi du Quai* (Kaï, Maëlle, Sélène, dans l’ordre) et des duels libres (Orin après la série) ; PV, decks et déblocages sont des **données de prototype** signalées comme telles.
- **Deck** : une version par identité (Basic ou variante possédée), une Signature, deux Techniques ; un deck illégal ne lance jamais de duel.
- **Duel** : la présentation M03.2 approuvée ; bouton **Menu** (pause, options, aide, Sauvegarder et quitter, abandon confirmé) ; conseils de jeu discrets, désactivables.
- **Résultat** : issue, PV, dégâts, tours, déblocages, manche suivante / revanche.
- **Sauvegarde** automatique et locale (aucun compte, aucun réseau), copie de secours, export / import ; un duel interrompu reprend **exactement** où il en était.

Déroulé d’un tour de duel :

1. (Entrée QA historique `?setup=1` : ancien écran de préparation ; `?autostart=1` / `?scenario=…` : duel direct.)
2. **Début de tour** : main complétée à 4 ; Sondage/Recentrage si équipés.
3. **Préparation** : cliquer ses Secondaires en *RÉSERVE CACHÉE* pour les révéler (→ *ACTIVE · PRÊTE*) ou les garder cachées.
4. **Engagement** : glisser une carte sur **Primaire** (ou cliquer la carte puis la case), choisir **ASSAUT / GARDE** ; nouvelle Secondaire facultative posée face cachée (*CHARGEMENT · INUTILISABLE*). Annulable jusqu’au verrouillage.
5. **Révélation simultanée** des Primaires, puis **choix tactiques secrets** : cliquer une Secondaire active → *Conserver / Amplifier le Rang (+affinité) / Amplifier les dégâts (×) / Interférer* (puis cliquer la cible). Prévision provisoire affichée, sans information cachée.
6. **Résolution séquencée** (M02) et **Clash physique** (M03 : les deux Primaires se font face, chargent, se percutent ou butent sur la Garde, puis partent à la défausse) : choix révélés → Interférences → Rang décomposé → issue / absorption (raison des 0 dégâts) → dégâts → conséquences, un temps à la fois, le rival réagissant ; *Passer* et *Tour suivant* toujours disponibles ; journal regroupé par tour.

Clavier : `Tab`, `Entrée/Espace`, `1–4` (main), `A`/`G` (mode), `Échap` (annuler), `N` (action principale), `V` (vue rival ↔ vue plateau). Tactile : glisser, ou toucher-toucher ; appui long = inspection. Boutons `A−/A+` (taille du texte), *Mvt réduit*, *Vue plateau ⤓ / Voir le rival ⤒* (bascule A↔B, comme `V`), *Rythme* (normal / rapide / instantané), *Journal* (tiroir rétractable). Inspection : survol / focus / appui long d’une carte (panneau flottant à gauche).

### Paramètres d’URL (implémentés)

| Paramètre | Effet |
|---|---|
| `seed=N` | seed **gameplay** (pioches, effets aléatoires) ; rival dérivé de la seed |
| `artSeed=N` | seed **art** (motifs des cartes, sol, particules) — n’affecte jamais le tirage |
| `sig=Cendre\|Voile\|Ronce\|Astre`, `tech=Lecture,Ancrage` | configuration du joueur |
| `autostart=1` | passe l’écran de préparation |
| `scenario=t2\|interference\|signature\|doubleko\|clash-aa\|clash-ag` | **démonstrations** avec rival **scripté** (identifié comme tel) ; `clash-aa` : le rival attaque (votre carte décide : vous dominez, égalité, il domine, ou votre Garde) ; `clash-ag` : le rival se met en Garde (absorption, Garde qui tient, Garde qui cède ∞, Garde contre Garde) |
| `scenario=rupture\|rupture-cachee\|dissipation\|masque` | **QA des Techniques** (rival scripté) : `rupture` — Garde Ronce IV gagnante, Rupture (2 Insight) renvoie la Secondaire active visée ; `rupture-cachee` — une cible cachée existe : Repoussement Basic, Rupture échoue sans remboursement ; `dissipation` — levez le camouflage de Dissimulation (1 Insight) ; `masque` — l’effet d’une Secondaire camouflée du rival reste anonyme |
| `view=A\|B` | vue figée (QA) : A confrontation, B manipulation ; défaut `auto` piloté par les phases (ADR 006). `cam=frontal\|tilted` = alias M01 |
| `rival=braise\|ronce\|voile\|astre` | personnalité du rival (sinon dérivée de la seed) ; M08 C3 : `rival=pnj-<gabarit>-<graine>` (`pnj-docker-1`, `pnj-marchande-9`…) impose un duelliste PNJ de la ville (gabarits `docker`, `marchande`, `commis`, `joueuse` ; apparence, prénom, Signature et Techniques dérivés de l’identifiant, ADR 023) ; couches V2 d’une figure générées à neuf : `window.__lqvFigureLayers(id)` (avec `qa=1`) ; outil `tools/c3-planche.mjs` (planche, déterminisme, coût) |
| `pace=normal\|fast\|instant` | rythme de présentation de la résolution (n’affecte jamais les règles) |
| `beat=N`, `intro=1`, `pose=<humeur>` | captures : temps de résolution figé, temps d’observation conservé, humeur imposée (revue QA, avec `qa=1` uniquement) |
| `reducedMotion=1`, `freeze=1` | mouvement réduit ; arène et animations figées (captures) |
| `scale=1.2`, `hp=90`, `aiDelay=650` | taille du texte, PV de départ, délai de l’IA (ms) |
| `gallery=1` | galerie de revue art (toutes les définitions + verso) |
| `qa=1` | crochets `window.__lqv` (duel) et `window.__lqvShell` (jeu) pour la QA automatisée (jamais actifs par défaut) |
| `setup=1` | ancien écran de configuration du duel (avant M04) |
| `profileSeed=N` | avec `qa=1` : seed du profil créé (parcours de QA reproductibles) |
| `ablate=candles,banners,dust,bloom,post` | mesure de coût (avec `qa=1` uniquement) : retire du rendu les bougies, les bannières, les poussières, le halo lumineux ou tout le post-traitement (rendu direct à la densité 1,5 d’avant le lot 3) |
| `fallback=off\|nobloom\|direct` | avec `qa=1` uniquement : `off` désactive le repli automatique du post-traitement (mesure du rendu complet) ; `nobloom` / `direct` imposent ce niveau (même densité que le post-traitement). État du repli : `window.__lqv.arenaStats().post` (amendement ADR 019) |
| `figure=v1` | avec `qa=1` uniquement (M07 L5) : ancien rendu V1 des rivaux et du portrait du joueur, pour comparaison ; par défaut, les quatre rivaux (duel, affiches, HUD) et le portrait du duelliste joueur (HUD bas-gauche, depuis la passe 26) sont dessinés par le modèle « vectoriel V2 » (ADR 021). `figure=v2` force le V2. Coût de génération des couches V1 / V2 d’un rival : `window.__lqvFigureCost(essais, id)` ; coût d’un portrait V1 / V2 : `window.__lqvPortraitCost(essais, id)` (id de rival ou `player-<Famille>`) (ADR 021). Outils : `LQV_QA_QUERY=figure=v1|v2` pour `qa:browser`, `qa:product`, `qa:rc` ; `LQV_PERF_ENTRY=…` pour l’entrée de `perf-compare` |
| `venue=salle\|rue\|bar\|arene` | avec `qa=1` uniquement (M08 C2, ADR 022) : impose le lieu du décor à tous les duels et écrans (sinon, lieu de la rencontre : salle de jeu de cartes par défaut, la rue pour « Duel libre — Kaï », le bar pour « Duel libre — Maëlle », l’arène pour « Duel libre — Orin »). Lieu courant, durée du dernier changement, décors montés et leur mémoire, cadrage : `window.__lqv.arenaStats()` (`venue`, `venueMs`, `venuesMounted`, `venueMB`, `framing`). `venueCache=n` : au plus n décors gardés montés (mesure du changement de lieu ; défaut : tous). Outils : `LQV_QA_QUERY=venue=bar` pour `qa:browser`, `qa:product`, `qa:rc`, `qa-fallback` ; `tools/c2-lieux.mjs` (`identique`, `invariance`, `planche`, `cycle`, `bascule`) |
| `prep=art\|off` | avec `qa=1` uniquement (M08 C1, ADR 021 amendement 4) : témoins de mesure de la pré-génération des personnages ; par défaut, les adversaires qu’un clic peut asseoir à la table depuis l’écran courant sont préparés aux temps morts (couches, rig, textures envoyées au GPU ; au plus 6 ; l’affiche survolée ou focalisée en priorité, M08 C3), jamais pendant un duel ; `art` = couches seules, `off` = aucune préparation (comme avant C1). État : `window.__lqvPrep()` ; outils `tools/c1-apparition.mjs`, `tools/c1-identique.mjs` |
| `renderCheck=1` | avec `qa=1` uniquement : chaque rendu ciblé du plateau est comparé à un rendu complet du même état (DOM, attributs, écouteurs) et aucune transition CSS ne doit démarrer sur un élément gardé ; écart = erreur console, bilan `window.__lqvRenderCheck()` (passe 13) |
| `artCheck=1` | avec `qa=1` uniquement : chaque illustration pré-générée par le worker est comparée à une génération synchrone dans la page (même data URL attendue) ; bilan `window.__lqv.artWarm()` (passe 14) |

## Architecture

```
src/game/      moteur pur (aucun DOM) : catalog/ model/ engine/ (phases, clash.ts pur, invariants, rng)
               visibility/ (viewFor, journal filtré) ai/ replay/ fixtures/ match.ts
src/art/       générateurs Canvas/SVG seedés (illustrations, emblèmes, verso, palettes provisoires)
src/scene/     arène Three.js (table, décor en couches), rival 2.5D procédural (rival.ts, rivalTextures.ts),
               caméras A/B interpolées, portrait vivant, FX déclenchés par événements
src/presentation/  DOM : plateau, cartes, glisser-déposer, scène du Clash (clashStage) ; modules purs director (vues),
               expression (rival), beats (séquence), clashMotion (chorégraphies), rivalLines, personalities
src/app/       contrôleur (humain + IA sur sa vue), session de duel démontable, paramètres, scénarios de démonstration
src/product/   enveloppe PURE (M04–M05) : flux d’écrans, deck légal, sauvegarde versionnée, rivaux et rencontres,
               progression de prototype, reprise par rejeu, résumé public
src/shell/     écrans DOM du jeu : accueil, deck, collection, rencontres, préparation, résultat, options, aide, conseils
test/          Vitest ; tools/ QA navigateur, captures, perf
docs/adr/      décisions (001 stack, 002 UI, 003 caméra M01 remplacée, 004 arbitrages, 005 outillage,
               006 vues A/B, 007 rival & expressions, 008 séquence de résolution,
               009 composition fidèle à la preview M03, 010 chorégraphies du Clash)
```

Voir `JOURNAL.md` pour l’état exact, les preuves et les limites ; `docs/adr/004-…` pour les interprétations à arbitrer.

## État (honnête)

- **MVP de duel jouable** contre IA : oui (boucle complète jusqu’à K.-O., prolongation incluse).
- **Conformité gameplay** : 16 variantes, 4 Signatures, 6 Techniques, Insight 0–2, Interférences simultanées, Repoussement, double K.-O. implémentés et testés (matrice G01–G27) ; interprétations de raccordement listées dans l’ADR 004 en attente d’arbitrage.
- **Jeu solo local opérationnel (release candidate 0.6.0-rc.1, M06)** : oui — accueil, deck, 4 rivaux, série de trois manches, résultats, progression de prototype, sauvegarde et reprise (`docs/RAPPORT_M06_RC.md`).
- **RPG complet** : non — ni ville explorable, ni économie, ni quêtes, ni tells / Sang-froid ; progression et données des rivaux = prototypes non canoniques.
- **Composition desktop du duel : approuvée comme référence (ADR 013, M03.2)**. Ville HD-2D, personnages définitifs hors du duel, progression économique et décors finaux : encore ouverts.
- **Parcours RPG M04–M06 : livré en release candidate locale** ; ce n’est pas la ville RPG finale.

`simulator_ref/` reste l’oracle de référence (non importé au runtime) :

```sh
cd simulator_ref/simulator && npm test
```
