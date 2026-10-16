# RPGCards — Les Quatre Voies

Duel de cartes tactique (noyau du futur RPG urbain) : **moteur de règles TypeScript pur**, plateau à **manipulation directe** (glisser-déposer, clic-pour-poser, tactile, clavier), **adversaire IA non omniscient**, **art procédural par code** et **arène Three.js** provisoire.

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
6. **Résolution** : journal détaillé (scores, soutiens, affinité, absorption, raison des 0 dégâts), FX Three.js dérivés des événements, *Tour suivant*.

Clavier : `Tab`, `Entrée/Espace`, `1–4` (main), `A`/`G` (mode), `Échap` (annuler), `N` (action principale). Tactile : glisser, ou toucher-toucher ; appui long = inspection. Boutons `A−/A+` (taille du texte), *Mvt réduit*, *Vue* (caméra exploratoire), *Journal* (mobile).

### Paramètres d’URL (implémentés)

| Paramètre | Effet |
|---|---|
| `seed=N` | seed **gameplay** (pioches, effets aléatoires) ; rival dérivé de la seed |
| `artSeed=N` | seed **art** (motifs des cartes, sol, particules) — n’affecte jamais le tirage |
| `sig=Cendre\|Voile\|Ronce\|Astre`, `tech=Lecture,Ancrage` | configuration du joueur |
| `autostart=1` | passe l’écran de préparation |
| `scenario=t2\|interference\|signature\|doubleko` | **démonstrations** avec rival **scripté** (identifié comme tel dans la barre de titre) |
| `cam=tilted\|frontal` | caméra exploratoire (provisoire, ADR 003) |
| `reducedMotion=1`, `freeze=1` | mouvement réduit ; arène et animations figées (captures) |
| `scale=1.2`, `hp=90`, `aiDelay=650` | taille du texte, PV de départ, délai de l’IA (ms) |
| `gallery=1` | galerie de revue art (toutes les définitions + verso) |
| `qa=1` | crochet `window.__lqv` pour la QA automatisée (jamais actif par défaut) |

## Architecture

```
src/game/      moteur pur (aucun DOM) : catalog/ model/ engine/ (phases, clash.ts pur, invariants, rng)
               visibility/ (viewFor, journal filtré) ai/ replay/ fixtures/ match.ts
src/art/       générateurs Canvas/SVG seedés (illustrations, emblèmes, verso, palettes provisoires)
src/scene/     arène Three.js procédurale + FX déclenchés par événements, 2 caméras exploratoires
src/presentation/  DOM : plateau, cartes, glisser-déposer Pointer Events
src/app/       contrôleur (humain + IA sur sa vue), paramètres, scénarios de démonstration
test/          Vitest ; tools/ QA navigateur, captures, perf
docs/adr/      décisions (001 stack, 002 UI, 003 caméra, 004 arbitrages de règles, 005 outillage)
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
