# Rapport M03.2 — Fidélité visuelle et fluidité du runtime, sans refonte

Mission : `docs/missions/M03_2_FIDELITE_VISUELLE_RUNTIME.md` (cadre `M03_CONTINUATION_DEPUIS_MAIN.md`), ADR 009 et 010 conservés, **ADR 012** (nouveau).
Développement **directement sur `main`** (règle de branche), départ `0ab0584` (fin de M03.1B). Référence artistique : `reference/REFERENCE_VISUELLE_VALIDEE_M03.jpg`, **document de revue uniquement** (jamais chargé au runtime).
Règles : **V3.0 + delta V3.2 inchangés** — `git diff 0ab0584..HEAD -- src/game` est **vide** (moteur, visibilité, IA intacts) ; aucune mécanique nouvelle, aucun tell / bluff / Sang-froid.
SHA : code `e112765` → `dcebd2a` (détail §3), outillage QA jusqu’à `99e03e1` ; **toutes les preuves (captures, QA, perf) sont produites sur le build de `99e03e1`** (même code runtime que `dcebd2a`).

## 1. Résumé — ce qui change pour le joueur

- **Le rival est l’acteur central, dans les deux vues.** Buste derrière la table aux proportions de la preview (tête ×1,34, épaules près du bord, assis plus près) : hauteur du visage (yeux → menton) **45 → 83 px** à 1280×720 (11,5 % de la hauteur, la proportion de la preview), **67 → 125 px** à 1920×1080, 27 → 50 px en portrait 390×844 ; tête entière en vue B. Visage peint par code en 2× (modelé, contour, nez, lèvre, iris), paupières fondues, mains posées sur la table. Les six humeurs testées restent lisibles à la nouvelle échelle (planche `13-expressions.png`).
- **Arène mieux éclairée, textes lisibles.** Luminance relative du visage **≈ ×4,6** en vue A (0,037 → 0,172) et ×4,5 en vue B ; table +55 % en vue A, +92 % en vue B, ×2,7 en portrait ; reflets de bougies réduits — **sans aucune lumière ajoutée au total** (lumière peinte, après mesure du coût). Le contraste réel de chaque texte mesuré (étiquettes et aides de case, commandes, noms des cartes, verdict et conséquences du Clash) est **≥ 4,5:1 dans les 13 cas capturés** (le runtime M03 avait 3 cas sous ce seuil).
- **Clash plus clair, sans surcharge centrale.** Les Primaires restent les objets principaux, plus bas pour laisser le visage du rival visible ; verdict + **1 à 3 conséquences essentielles** sur une seule pilule (le détail reste dans le journal) ; le départ des deux Primaires en défausse est montré **sur les cartes** (« → DÉFAUSSE »). Les six chorégraphies du `ClashMotionDirector` sont inchangées.
- **HUD conservés** : rival haut-gauche, joueur compact bas-gauche avec portrait (ADR 009).
- **Mobile paysage** (844×390, 960×540) en plus du portrait : même grammaire que le bureau, aucun chevauchement, menu tactique atteignable au doigt (impossible dans le runtime M03 à 844×390) ; rotation en plein tour sans perte d’état ; libellés courts « S1 · PRIMAIRE · S2 » comme la preview mobile.

## 2. Porte d’entrée et méthode

- **Porte M03.1B franchie** avant tout travail visuel : `987ff27` (P0), `c9e32fe` (P1), `0ab0584` (preuves) — 20/20 tests de non-fuite, 117/117, `qa:browser` 4/4, `qa:techniques` 8/8 (voir `docs/RAPPORT_M03_1B.md`).
- **Avant / après / preview** : `tools/shots-m03-2.mjs` (`npm run shots:m03-2`) sert le build M03 (`0ab0584`, parent direct de M03.2) et le build courant **en même temps**, mêmes seeds, scénarios, tailles et phases ; les recadrages de la preview sont posés à côté (panneaux 1 à 6). Mesures prises **sur les captures** : hauteur du visage (projection exacte du cadrage ancré), luminance relative moyenne (visage, table, image), **contraste WCAG texte / fond réel** (fond = pixel médian sous la boîte du texte, couleur semi-transparente composée), taille des cartes de main et des libellés, chevauchements, parcours tactile.
- Rendu : Chromium headless + **SwiftShader (rasterisation CPU, sans GPU)**, `freeze=1` pour les poses figées.

## 3. Modifications (commits sur `main`)

| Commit | Priorité | Contenu |
|---|---|---|
| `e112765` | P0 + P2 | `rival.ts` : `RIVAL_Z` −2,9 → −2,7, `NECK_Y` 1,72, `HEAD_SCALE` 1,34, `HEAD_WORLD` / `CHEST_WORLD` dérivés ; buste 2,7 × 2,1 ; iris agrandis ; mains. `rivalTextures.ts` : tête en 2×, modelé (ombre propre, ligne des cheveux, rebond chaud), contour, nez, lèvre ; paupières fondues ; mains dessinées ; emblème remonté. `arena.ts` : exposition 1,3, hémisphère 1,0, clé 1,35 sur la tête, fill frontal et lampe de table (remplacés ensuite, `b2fe6f1`), bannières 1:2, bois et mur plus clairs, halos réduits ; ancres vue B 0,148 / 0,305. Cases : liseré et libellés plus contrastés |
| `d28d340` | P1 | `clashMotion.ts` : conséquences essentielles (≤ 3), blessures fusionnées, « Assaut repoussé : aucune blessure » ; `clashStage.ts` : étiquette « → DÉFAUSSE » sur les deux cartes au temps nettoyage ; scène plus basse (51 %, 25 vh) ; test de propriété 1 ≤ conséquences ≤ 3 |
| `63ae329` | P3 | gabarit `@media (orientation: landscape) and (max-height: 560px)` ; scène du Clash paysage ; `qa:browser` : 5e duel tourné en plein engagement |
| `8130d6c` | P4 | `tools/shots-m03-2.mjs`, planche d’expressions, `clash-shots` paramétrable avec planches de pellicule explicites, perf du Clash en temps réel |
| `7576d31` | P2 | **correctif** : le vacillement réécrivait toutes les lumières de bougie à 3,6 à chaque image — l’atténuation des bougies de table de `e112765` était sans effet ; base par lumière (table 2,8, fond 3,4) |
| `19d3461` | P2 / P4 | `?qa=1&ablate=…` (mesure de coût, inerte en jeu) ; contraste réel des textes dans les captures |
| `1b38b4b`, `84f0e28` | P2 | **correctifs de lisibilité trouvés par la mesure** : aides de case sur pastille sombre (une aide tombait à 4,4:1 à 1920), libellés sur voile sombre diffus ajusté au texte (3,6:1 en portrait, 3,9:1 à 960×540 avant correctif) |
| `3da33dc` | P3 | libellés courts « S1 · PRIMAIRE · S2 » sur petit écran (7,5 → 9,4 px en portrait, 7,8 → 9,6 px en paysage) ; racine paysage 12 px |
| `b2fe6f1` | P2 | **correctif de performance trouvé par la mesure** : le fill et la lampe de table coûtaient ≈ 6–7 ms CPU par image (SwiftShader) → remplacés par de la lumière peinte (auto-éclairage des couches du rival, flaque chaude dans la texture de la table) ; `alphaTest` sur les couches du rival ; vue A +52 % → +23 % de coût CPU par image face au runtime M03 (§7) |
| `dcebd2a` | P2 / P3 | **correctif de lisibilité trouvé par la mesure par libellé** : le bandeau de posture du rival débordait sur le libellé « PRIMAIRE » de votre rangée en phase tactique (déjà 4,0:1 en M03) → bandeau remonté ; en portrait, le libellé « PRIMAIRE » du rival chevauchait ses mains → rangées abaissées ; voile des libellés plus dense ; flaque de table adoucie |
| `4faa470`, `26dbbc2`, `89e599d`, `832231b`, `045f1c1`, `ff7c8d3`, `2e833e0`, `99e03e1` | P4 | outillage : contraste composé avec l’opacité, mesure du verdict pendant un Clash ; perf d’un autre build ; planche d’expressions réparée ; dossier de captures `qa:techniques` ; taille du libellé court ; comparaison de rendu en rondes entrelacées ; ablation en médianes ; sous-ensemble de cas pour vérification rapide |

## 4. Mesures avant (M03, `0ab0584`) / après (M03.2, `99e03e1`)

Mêmes seeds, mêmes tailles, mêmes phases ; `screenshots/qa/m03-2/manifest.json`.

| Cas | Écran | Visage (px) | Lum. visage | Lum. table | Contraste min. (textes ≥ 4,5:1) | Chevauchements / parcours |
|---|---|---|---|---|---|---|
| 01 Vue A, début de tour | 1280×720 | 45 → **83** | 0,037 → **0,172** | 0,032 → 0,050 | 4,6 (17/17) → 10,3 (17/17) | 0 → 0 |
| 01 Vue A | 1920×1080 | 67 → **125** | 0,038 → **0,173** | 0,029 → 0,045 | **3,6 (16/17)** → 9,2 (17/17) | 0 → 0 |
| 02 Vue B, Primaire posée | 1280×720 | (tête entière) | 0,023 → **0,104** | 0,031 → 0,060 | 6,0 (15/15) → 10,6 (15/15) | 0 → 0 |
| 03 Tactique | 1280×720 | 45 → **83** | 0,063 → **0,225** | 0,082 → 0,118 | **4,0 (10/11)** → 4,9 (11/11) | 0 → 0 |
| 04 Clash AA | 1280×720 | 45 → **83** | 0,048 → **0,085** | 0,066 → 0,092 | 14,4 (8/8) → 14,7 (7/7) | 0 → 0 |
| 05 AG, Garde victorieuse | 1280×720 | 45 → **83** | 0,036 → **0,086** | 0,068 → 0,103 | 11,0 (9/9) → 11,3 (7/7) | 0 → 0 |
| 06 AG, absorption 0 blessure | 1280×720 | 45 → **83** | 0,036 → **0,086** | 0,076 → 0,097 | 12,7 (9/9) → 12,7 (8/8) | 0 → 0 |
| 07 GG | 1280×720 | 45 → **83** | 0,045 → **0,102** | 0,079 → 0,135 | 13,7 (8/8) → 14,0 (7/7) | 0 → 0 |
| 08 Mobile portrait | 390×844 | 27 → **50** | 0,037 → **0,172** | 0,015 → 0,040 | 6,2 (17/17) → 10,0 (17/17) | 0 → 0 |
| 09 Mobile paysage | 844×390 | 24 → **35** | 0,043 → **0,116** | (cadrages différents) | 4,5 (17/17) → 8,4 (17/17) | **2 (main / case, main / .hud.me)** → 0 |
| 10 Petite tablette paysage | 960×540 | 34 → **49** | 0,037 → **0,135** | 0,037 → 0,046 | 5,2 (17/17) → 7,9 (17/17) | 0 → 0 |
| 11 Clash, mobile paysage | 844×390 | 24 → **35** | 0,055 → **0,067** | (cadrages différents) | **3,5 (11/13)** → 13,2 (8/8) | **1 (main / case)** + **menu tactique inaccessible au doigt** → 0, parcours complet |
| 12 Clash, mobile portrait | 390×844 | 27 → **50** | 0,047 → **0,137** | 0,146 → 0,155 | 13,3 (9/9) → 13,2 (8/8) | 0 → 0 |

Lecture : *luminance relative* (0 = noir, 1 = blanc) moyenne d’une région définie par les ancres de la vue ; en paysage les deux runtimes n’ont pas le même cadrage, la luminance de table n’y est pas comparable. Pendant un Clash, les textes mesurés sont le verdict et les conséquences (les cases sont sous la scène). Tailles : carte de main 158 px (1280) et 238 px (1920) inchangées ; paysage 844×390 : **118 → 98 px** (la main ne recouvre plus les cases ni le HUD) ; 960×540 : 119 → 135 px ; libellés de case 7,5 → 9,4 px (portrait), 9,9 (chevauchant) → 9,6 px (paysage).

## 5. Captures du runtime réel

Toutes dans `screenshots/qa/m03-2/` (build `99e03e1`, sauf colonne « avant » : build `0ab0584`).

- **Planches preview | avant | après** : `comparaison-01-vue-A-1280.png`, `comparaison-01-vue-A-1920.png`, `comparaison-02-vue-B-1280.png`, `comparaison-03-tactique-1280.png`, `comparaison-04-clash-aa.png`, `comparaison-05-clash-ag-garde.png`, `comparaison-06-clash-ag-absorption.png`, `comparaison-07-clash-gg.png`, `comparaison-08-mobile-portrait.png`, `comparaison-09-mobile-paysage.png`, `comparaison-10-paysage-960.png`, `comparaison-11-mobile-paysage-clash.png`, `comparaison-12-mobile-portrait-clash.png` ; captures natives `NN-*-avant.png` / `NN-*-apres.png`.
- **Expressions** : `13-expressions.png` — Kaï, Maëlle, Sélène × six humeurs, même recadrage avant / après (humeur imposée par le paramètre QA `pose=`, revue seulement : en duel, le rival ne réagit qu’à des faits publics).
- **Clash** (`clash/`, `npm run shots:clash`) : pour chaque cas, poses figées des temps Rang / Issue / Blessures, variante mouvement réduit ; **pellicules** `pellicule-aa-gagne.png`, `pellicule-ag-absorption.png`, `pellicule-ag-garde-tient.png` = l’animation réelle **échantillonnée à des instants exacts** (0, 200, 380, 470, 620, 1000 ms ; séquence en pause + `stageSeek`) — **ce n’est pas un enregistrement en temps réel**. La fluidité en temps réel est mesurée à part (§7).
- **Techniques** (`techniques/`, `qa:techniques` rejoué sur ce build) : Rupture, Rupture sur cible cachée, Dissipation, effet camouflé — souris 1280×720 et tactile 390×844.

## 6. QA — commandes exécutées et résultats

Machine : Intel Xeon 2,10 GHz, 4 cœurs, 16 Go, Linux, Node 22.22.0 ; Chromium headless, rendu **SwiftShader (CPU)**.

| Étape | Commande | Résultat |
|---|---|---|
| Chaque commit de code | `tsc --noEmit`, `vitest run`, `vite build` — les commits intermédiaires `e112765`, `d28d340`, `63ae329` revérifiés dans un arbre détaché, les suivants sur `main` | 0 erreur ; **117/117** ; build OK à chaque commit |
| Tests (HEAD `99e03e1`) | `npm run typecheck`, `npm test` | 0 erreur ; **117/117** (9 fichiers) : propriété « 1 ≤ conséquences ≤ 3 » et classification des six chorégraphies sur les duels aléatoires, 20 tests de non-fuite M03.1B, 4 scénarios Techniques |
| Build | `npm run build` | OK — bundle 700,1 kB (gzip 193,4 kB) |
| QA navigateur | `npm run qa:browser` | **5/5 duels complets** : souris + glisser 1280 (13 tours, 26 glisser-déposer), clic 1920 en mouvement réel (14 tours, 13 séquences regardées, 10 scènes de Clash, 0 fantôme), clavier 1280 (10 tours), tactile 390×844 (19 tours), **tactile tourné en plein engagement** 390×844 → 844×390 → 390×844 → 844×390 → 960×540 (16 tours ; moteur et brouillon identiques avant / après chaque rotation, puis audit de composition) ; vues 267 contrôles / 0 écart, 156 bascules de caméra pour 67 tours (≈ 2,3 par tour, liées aux phases, pas aux clics) ; postures 128 contrôles / 0 écart ; composition 0 écart ; **0 fuite** ; 0 erreur console ; 0 clic perdu ; 12 humeurs distinctes du rival — `artifacts/qa/qa-browser.json` |
| QA des Techniques | `TECH_OUT=screenshots/qa/m03-2/techniques npm run qa:techniques` | **8/8 parcours** (Rupture, Rupture sur cible cachée, Dissipation, effet camouflé anonyme à chaque temps ; souris 1280×720 et tactile 390×844), 0 erreur console — `artifacts/qa/qa-techniques.json`, 22 captures |
| Démonstrations du Clash | `npm run shots:clash` | **10/10 cas** classés comme attendu — AA (domine ×2, égalité), AG (Garde tient ×2, absorption, Garde cède ×2), GG, double K.-O. ; « Passer » sans scène fantôme ; 0 problème — `screenshots/qa/m03-2/clash/` (60 fichiers) |
| Captures comparatives | `LQV_BEFORE=<build 0ab0584> LQV_BEFORE_SHA=0ab0584 npm run shots:m03-2` | 13 cas × 2 builds, 36 poses d’expressions, 14 planches ; 0 problème console |
| Performance | `npm run perf` ; le même outil sur le build `0ab0584` ; `node tools/perf-compare.mjs 5` | §7 |

## 7. Performance (même machine, même session ; `artifacts/qa/perf.json`, `artifacts/qa/perf-avant-m03-2.json`)

Machine : Intel(R) Xeon(R) Processor @ 2.10GHz, 4 cœurs, 16 Go, Node v22.22.0 ; rendu `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)` = **rasterisation CPU, sans GPU** : aucun chiffre ci-dessous n’est un FPS de GPU.

**Comparaison entrelacée** (`node tools/perf-compare.mjs 5`, `artifacts/qa/perf-compare-m03-2.json`) — 5 rondes entrelacées par vue, 1280×720, scénario signature, 5 s de mise en régime, moyenne de 6 relevés ; avant = `0ab0584`, après = `99e03e1` :

| Vue | Build | ms CPU / image (médiane, min–max) | FPS (médiane) | Draw calls | Triangles |
|---|---|---|---|---|---|
| A | M03 (`0ab0584`) | **36,4** (30,9–56,9) | 3,03 | 80 | 1650 |
| A | M03.2 (`99e03e1`) | **44,6** (40,1–56,1) | 2,57 | 73 | 1560 |
| B | M03 (`0ab0584`) | **38,4** (33,2–40,8) | 3,03 | 78 | 1634 |
| B | M03.2 (`99e03e1`) | **38,1** (33,6–38,5) | 3,02 | 75 | 1608 |

Écart des médianes : vue A **+23 %**, vue B **−1 %** de temps CPU par image.

**Coût des éléments du décor** (vue A, `npm run perf`, `artifacts/qa/perf.json` ; 3 rondes entrelacées, médianes ; paramètre QA `ablate`) :

| Variante | ms CPU / image (médiane) | Relevés | FPS (médiane) | Draw calls | Triangles |
|---|---|---|---|---|---|
| scène complète | **49,6** | 48,5, 49,6, 57,2 | 3,05 | 73 | 1560 |
| sans bougies (corps, flammes, halos, 4 lumières) | **25,4** | 26,1, 22,3, 25,4 | 3,63 | 70 | 520 |
| sans bannières ni tringles | **47,5** | 47,5, 49,3, 44,1 | 2,80 | 61 | 1448 |
| sans poussières | **50,4** | 52,1, 49,4, 50,4 | 2,70 | 72 | 1560 |
| sans bougies, bannières ni poussières | **24,2** | 21,9, 24,8, 24,2 | 3,75 | 57 | 408 |

**Clash joué en temps réel** (non figé, `clash-ag` absorption, intervalles `requestAnimationFrame` sur 2,5 s depuis l’apparition de la scène de Clash) : avant 6 images, médiane 417 ms ; après 5 images, médiane 417 ms. Sous SwiftShader, la scène 3D entière est rasterisée par le CPU pendant l’animation : ces chiffres disent seulement que le conteneur ne peut pas juger de la fluidité ; les chorégraphies sont vérifiées par leurs poses (§5) et leurs tests, la fluidité reste à mesurer sur GPU réel.

**Moteur** (200 duels IA/IA, code identique dans les deux builds) : 34,16 puis 35,33 ms/duel pendant cette campagne, contre 22,41 ms/duel au matin du 16 (M03) : la charge du conteneur varie de plus de 50 % d’une heure à l’autre, d’où les rondes entrelacées. Relevés isolés de `npm run perf` (méthode M03, un relevé après 6 s) : vue A 71 draw calls, 70,84 ms ; vue B 75 draw calls, 40,72 ms (M03 au matin : 80 / 36,45 ms et 78 / 31,69 ms) — non comparables entre eux pour la raison ci-dessus.

Lecture : la vue A coûte **+23 %** de temps CPU par image sous SwiftShader (médianes entrelacées), avec 7 draw calls de moins (cadrage resserré : moins d’objets du décor dans le champ ; plan de rougeur non dessiné quand il est invisible). Le surcoût vient de la surface éclairée et superposée du rival agrandi (≈ 3,4 fois plus de pixels pour le visage) ; la première version de M03.2 coûtait **+52 %** (36,9 → 55,9 ms) à cause d’un fill et d’une lampe de table, remplacés par de la lumière peinte (`b2fe6f1`). La vue B est inchangée. Les bougies restent le premier poste (≈ la moitié du temps CPU de la vue A) : pistes sur GPU réel si nécessaire — moins de lumières ponctuelles (halo peint), fusion des géométries statiques. Aucune extrapolation GPU : à mesurer sur bureau et mobile réels.

## 8. Écarts restants (honnête) — la fidélité n’est pas parfaite

| Zone | Preview validée | Build M03.2 | Écart restant |
|---|---|---|---|
| Personnages | Illustration peinte (anime), volumes, cheveux détaillés, bras et mains en mouvement | Rival en couches Canvas 2,5D plus grand, modelé peint, paupières, mains posées ; portrait joueur des mêmes couches | Toujours des plans plats : pas de volume réel ni de chevelure mèche à mèche ; gestes limités (respiration, tête, mains) |
| Proportions | Visage (yeux → menton) ≈ 11–12 % de la hauteur sur le panneau 1 (mesure manuelle), yeux à ≈ 24 % du haut | 11,5 % (83 px sur 720), yeux à ≈ 20 % du haut | Taille atteinte ; rival un peu plus haut dans le cadre, buste plus large (cape) |
| Décor | Salle dense, nombreuses bougies, halos peints | Mêmes éléments, plus sobres ; bannières raccourcies (1:2) pour rester entières au-dessus du rival agrandi | Moins de densité ; ni bloom ni profondeur de champ ; bannières plus petites que sur la preview |
| Lumière | Table brun clair, ambiance très lumineuse | Visage ×4,5, table +55 à +92 % (sans lumière ajoutée) | Table encore plus sombre que la preview ; pas de post-traitement (choix de coût) |
| Résolution | Panneau « Résolution 2/4 » à côté des cartes, liste à puces | Verdict + pilule de 1 à 3 conséquences sous le face-à-face ; détail dans le panneau de commandes et le journal | Disposition différente (sous la scène, pas à côté) |
| Mobile paysage | Interface simplifiée à gros éléments (mini-HUD, une rangée « S1 / PRIMAIRE / S2 », bouton « Fin de tour ») | Gabarit complet du bureau en compact, libellés courts | Textes encore petits (commandes ≈ 9,4 px, libellés 9,6 px à 844×390 ; le bouton A+ agrandit) ; deux rangées visibles (le jeu exige ses propres Secondaires) ; cartes de main 98 px |
| Cartes posées en paysage | Grandes | ≈ 40 px de haut à 844×390 | Lisibles par inspection (appui long), pas d’un coup d’œil |
| Chiffres / textes | Valeurs illustratives | Valeurs du moteur | Volontaire (contrat) |

## 9. Conformité règles et secrets

- **Aucune ligne de `src/game`** (moteur, visibilité, IA) modifiée ; les chorégraphies lisent le rapport public du moteur (propriété : classification conforme sur les duels aléatoires, 1 ≤ conséquences ≤ 3).
- Les deux Primaires partent toujours en défausse (gagnante comprise), d’après les événements du moteur ; l’étiquette « → DÉFAUSSE » n’apparaît qu’au temps nettoyage.
- Postures ASSAUT / GARDE (mot + icône) seulement après la révélation (contrôles `qa:browser`).
- Aucune information secrète affichée : audit de `qa:browser` (DOM, scène du Clash, export public, y compris les cartes camouflées) et parcours `qa:techniques` (effet camouflé anonyme à chaque temps de la séquence) rejoués sur ce build (§6).
- Le paramètre `ablate` n’agit qu’avec `qa=1` et ne fait que retirer du décor.

## 10. Décisions à valider

1. Proportions du rival (tête ×1,34, buste près du bord) et niveau d’éclairage (ADR 012).
2. Pilule de 1 à 3 conséquences sous le face-à-face (plutôt qu’un panneau latéral) ; étiquette « → DÉFAUSSE ».
3. Gabarit paysage « compact du bureau » + libellés courts, ou interface paysage simplifiée à gros éléments comme le panneau 6 de la preview (refonte plus large de l’UI mobile).
4. Arbitrages hérités toujours ouverts : ARB-002, ARB-005 / 005b (voir `docs/RAPPORT_M03_1B.md` §9).
