# RPGCards — Les Quatre Voies

Duel de cartes tactique (noyau du futur RPG urbain) : **moteur de règles TypeScript pur**, plateau à **manipulation directe** (glisser-déposer, clic-pour-poser, tactile, clavier), **adversaire IA non omniscient**, **art procédural par code** et **arène Three.js** provisoire.

**M02 — confrontation face à face** (branche `claude/m02-confrontation-face-a-face`) : un **rival procédural expressif** se tient de l’autre côté d’une table de duel ; **vue A « confrontation »** frontale par défaut, **vue B « manipulation »** inclinée pour composer (avec portrait vivant du rival), transitions pilotées par les phases ; **résolution séquencée** (Interférences → Rang → absorption/dégâts → conséquences) ; IA à **mémoire autorisée** et 3 profils. Les expressions ne lisent que des faits publics : **aucun tell** ni mécanique psychologique n’est introduit.

**M03 — fidélité à la preview validée et Clash physique** (branche `claude/m03-ui-fidele-et-clash-anime`) : composition fidèle à `reference/REFERENCE_VISUELLE_VALIDEE_M03.jpg` (document de revue, jamais utilisé au runtime) — scène plein cadre, **HUD rival haut-gauche**, **HUD joueur compact bas-gauche avec portrait procédural**, bulle du rival, **main en bas**, commandes et Techniques bas-droite, journal en tiroir ; salle aux bougies et bannières des quatre familles ; **bandeaux ASSAUT (rouge, pointe) / GARDE (bleu, bouclier)** sur chaque Primaire révélée ; **les cartes s’affrontent** : six chorégraphies (Assaut contre Assaut dominé ou égalité, Garde victorieuse, Garde qui cède, victoire au Rang sans blessure, Garde contre Garde) dérivées du résultat résolu par le moteur, puis les deux Primaires rejoignent la défausse.

> Règlement appliqué : **V3.0 (`source/CONTRAT_REGLES_V3_0_HISTORIQUE.md`) + avenant mandaté V3.2 (`contracts/02_…`)**. Delta à connaître : en *Amplifier le Rang*, un soutien de **même famille** que la Primaire vaut **Rang imprimé + 1** (D-01). Le texte historique V3.0 n’est pas modifié ; la ratification éventuelle en V3.3 appartient au responsable.

## Démarrage

```sh
npm install          # Node ≥ 20 ; .npmrc legacy-peer-deps (voir ADR 005)
npm run dev          # http://localhost:5173
npm run typecheck    # tsc --noEmit, TypeScript strict
npm test             # Vitest : moteur, Clash, visibilité, IA
npm run build        # typecheck + build Vite → dist/
npm run qa:browser   # duels complets pilotés par l’UI (Chromium headless) → artifacts/qa/
npm run shots        # captures déterministes U00–U12 + caméras + galerie → screenshots/qa/
node tools/shots-m03.mjs    # captures M03 + planches preview ↔ runtime → screenshots/qa/m03/
node tools/clash-shots.mjs  # chaque type de Clash : poses, mouvement réduit, pellicules → screenshots/qa/m03/clash/
npm run perf         # mesures moteur + scène (machine courante) → artifacts/qa/perf.json
npm run sim          # (optionnel) 200 duels IA/IA headless
```

`qa:browser`, `shots` et `perf` exigent un build (`npm run build`) et un Chromium local (`/opt/pw-browsers/chromium` par défaut, sinon `CHROMIUM_PATH=…`). Aucun navigateur n’est téléchargé.

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
| `view=A\|B` | vue figée (QA) : A confrontation, B manipulation ; défaut `auto` piloté par les phases (ADR 006). `cam=frontal\|tilted` = alias M01 |
| `rival=braise\|ronce\|voile` | personnalité du rival (sinon dérivée de la seed) |
| `pace=normal\|fast\|instant` | rythme de présentation de la résolution (n’affecte jamais les règles) |
| `beat=N`, `intro=1`, `pose=<humeur>` | captures : temps de résolution figé, temps d’observation conservé, humeur imposée (revue QA, avec `qa=1` uniquement) |
| `reducedMotion=1`, `freeze=1` | mouvement réduit ; arène et animations figées (captures) |
| `scale=1.2`, `hp=90`, `aiDelay=650` | taille du texte, PV de départ, délai de l’IA (ms) |
| `gallery=1` | galerie de revue art (toutes les définitions + verso) |
| `qa=1` | crochet `window.__lqv` pour la QA automatisée (jamais actif par défaut) |

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
- Direction artistique, palette, caméra HD-2D : **provisoires, non validées**.

`simulator_ref/` reste l’oracle de référence (non importé au runtime) :

```sh
cd simulator_ref/simulator && npm test
```
