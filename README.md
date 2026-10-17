# RPGCards — Les Quatre Voies

> **Mandat de production actif M04–M06 (16 octobre 2026)** : la **composition actuelle du duel desktop M03.2 est APPROUVÉE** (rival de face en buste expressif, deux vues, HUD et six chorégraphies). La priorité est désormais un **jeu solo opérationnel** avec accueil, deck, rivaux, parcours, résultats et sauvegarde ; mobile paysage et détails d'art secondaires sont différés. Voir `docs/missions/M04_M06_PROGRAMME_JEU_OPERATIONNEL.md` et l'ADR 013. **M04 livré** (`docs/RAPPORT_M04.md`) : `npm run dev` ouvre le jeu sur un accueil — profil, deck légal, rencontres, duel, résultat, aide, options, sauvegarde locale.

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
npm run qa:browser   # duels complets pilotés par l’UI (Chromium headless) → artifacts/qa/
npm run qa:techniques # Rupture / Dissipation / effet camouflé par l’UI (souris + tactile) → screenshots/qa/m03-1b/
npm run shots        # captures M03 + planches preview ↔ runtime → screenshots/qa/m03/
npm run shots:clash  # chaque type de Clash : poses, mouvement réduit, pellicules → screenshots/qa/m03-2/clash/ (CLASH_OUT=…)
npm run shots:m03-2  # avant / après / preview M03.2 + mesures (LQV_BEFORE=<build M03> LQV_BEFORE_SHA=<sha>) → screenshots/qa/m03-2/
node tools/perf-compare.mjs 5  # rendu avant / après en rondes entrelacées (LQV_BEFORE=<build> LQV_BEFORE_SHA=<sha>) → artifacts/qa/perf-compare-m03-2.json
npm run perf         # mesures moteur + scène (machine courante) → artifacts/qa/perf.json
npm run sim          # (optionnel) 200 duels IA/IA headless
```

`qa:browser`, `qa:techniques`, `shots`, `shots:clash`, `shots:m03-2` et `perf` exigent un build (`npm run build`) et un Chromium local (`/opt/pw-browsers/chromium` par défaut, sinon `CHROMIUM_PATH=…`). Aucun navigateur n’est téléchargé.

## Jouer

1. Écran de préparation : choisir sa **Signature** (4 tuiles) et **deux Techniques** (6 tuiles), puis *Commencer le duel*. Le rival (Signature/Techniques dérivées de la seed) est affiché.
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
| `rival=braise\|ronce\|voile` | personnalité du rival (sinon dérivée de la seed) |
| `pace=normal\|fast\|instant` | rythme de présentation de la résolution (n’affecte jamais les règles) |
| `beat=N`, `intro=1`, `pose=<humeur>` | captures : temps de résolution figé, temps d’observation conservé, humeur imposée (revue QA, avec `qa=1` uniquement) |
| `reducedMotion=1`, `freeze=1` | mouvement réduit ; arène et animations figées (captures) |
| `scale=1.2`, `hp=90`, `aiDelay=650` | taille du texte, PV de départ, délai de l’IA (ms) |
| `gallery=1` | galerie de revue art (toutes les définitions + verso) |
| `qa=1` | crochet `window.__lqv` pour la QA automatisée (jamais actif par défaut) |
| `ablate=candles,banners,dust` | mesure de coût (avec `qa=1` uniquement) : retire du rendu les bougies, les bannières ou les poussières |

## Architecture

```
src/game/      moteur pur (aucun DOM) : catalog/ model/ engine/ (phases, clash.ts pur, invariants, rng)
               visibility/ (viewFor, journal filtré) ai/ replay/ fixtures/ match.ts
src/art/       générateurs Canvas/SVG seedés (illustrations, emblèmes, verso, palettes provisoires)
src/scene/     arène Three.js (table, décor en couches), rival 2.5D procédural (rival.ts, rivalTextures.ts),
               caméras A/B interpolées, portrait vivant, FX déclenchés par événements
src/presentation/  DOM : plateau, cartes, glisser-déposer, scène du Clash (clashStage) ; modules purs director (vues),
               expression (rival), beats (séquence), clashMotion (chorégraphies), rivalLines, personalities
src/app/       contrôleur (humain + IA sur sa vue), paramètres, scénarios de démonstration
test/          Vitest ; tools/ QA navigateur, captures, perf
docs/adr/      décisions (001 stack, 002 UI, 003 caméra M01 remplacée, 004 arbitrages, 005 outillage,
               006 vues A/B, 007 rival & expressions, 008 séquence de résolution,
               009 composition fidèle à la preview M03, 010 chorégraphies du Clash)
```

Voir `JOURNAL.md` pour l’état exact, les preuves et les limites ; `docs/adr/004-…` pour les interprétations à arbitrer.

## État (honnête)

- **MVP de duel jouable** contre IA : oui (boucle complète jusqu’à K.-O., prolongation incluse).
- **Conformité gameplay** : 16 variantes, 4 Signatures, 6 Techniques, Insight 0–2, Interférences simultanées, Repoussement, double K.-O. implémentés et testés (matrice G01–G27) ; interprétations de raccordement listées dans l’ADR 004 en attente d’arbitrage.
- **RPG complet** : non (ville, collection, progression hors périmètre M01).
- **Composition desktop du duel : approuvée comme référence (ADR 013, M03.2)**. Ville HD-2D, personnages définitifs hors du duel, progression économique et décors finaux : encore ouverts.
- **Parcours RPG opérationnel M04–M06 : à développer** ; ne pas confondre l'actuel MVP de duel et une version complète.

`simulator_ref/` reste l’oracle de référence (non importé au runtime) :

```sh
cd simulator_ref/simulator && npm test
```
