# Traces et attribution des à-coups — passe 12 (2026-10-17)

Poste de l’opérateur (portable Ryzen 7 8845HS, Radeon 780M + RTX 4060 Laptop, écran 165 Hz, Windows 11), Chrome
155.0.8059.80 headless, ANGLE Direct3D 11. Duel seed 202 (14 tours), 1280×720. « avant » = RC `b6f0c98` (bundle identique à
`d19667e`), « après » = passe 12. Synthèse et lecture : `docs/RAPPORT_M06_RC.md` §5.5.

Chaque JSON contient, par duel :
- le résumé des intervalles d’image (`all`, `byView`) ;
- les à-coups > 50 ms (`hitches.hitches`), avec leur contexte (tour | phase | temps de résolution), les Long Animation Frames
  (scripts ramenés au source) et, si tracé, l’attribution (`trace`) ;
- par build, `summary` regroupe les causes par famille.

Les champs `rawTrace` et `pageRecord` désignent des fichiers bruts de `artifacts/qa/tmp/` (non versionnés, 60 à 90 Mo par
trace) ; ceux des séries intermédiaires ont pu être écrasés par une série suivante. Les fichiers `*-pics.json.gz` sont des
traces réduites aux fenêtres des à-coups (± 150 ms) : fil principal de la page et fils du processus GPU. Ils se chargent dans
DevTools › Performance.

| Fichier | Commande (préfixe commun `LQV_GPU=1 CHROMIUM_PATH=<Chrome>`) | Ce qu’il montre |
|---|---|---|
| `premier-duel-lean-780m.json` | `LQV_TRACE=0 LQV_TRACE_AIDELAY=0 node tools/perf-trace.mjs` (premier essai de la passe, caches froids) | sans le pilote de QA, p95 6,3 ms au lieu de 12,2 ms ; restent 18 images > 50 ms, dont 17 dans les 11 premières secondes |
| `trace-initiale-780m.json` + `-pics.json.gz` | idem avec `LQV_TRACE=1` | première attribution : `toDataURL` 46 ms + `getProgramInfoLog` 20 ms + `renderApp` 16 ms au clic d’engagement ; quatre pointes avec le fil principal libre, le processus GPU en `Program::MainLinkLoadEvent::wait` |
| `gpu-2tours-780m.json` + `-avant-pics` / `-apres-pics` | `LQV_TRACE=1 LQV_TRACE_FRESH=1 LQV_TRACE_TURNS=2 LQV_TRACE_AIDELAY=0 LQV_TRACE_CATS=gpu,skia.gpu,disabled-by-default-skia.gpu,viz LQV_TRACE_BUILDS=avant=…,apres=…` | qui compile au GPU pendant les pointes : avant, 3 liaisons WebGL (25 ms) et 43 Skia (296 ms) ; après, 0 WebGL et 53 Skia (325 ms), toutes sous `RasterDecoderImpl` / `SkiaOutputSurfaceImplOnGpu` |
| `froid-3builds-780m.json` | `LQV_TRACE=0 LQV_TRACE_FRESH=1 LQV_TRACE_ROUNDS=3 LQV_TRACE_AIDELAY=0 LQV_TRACE_BUILDS=avant=…,shaders=…,shaders+canvas=…` | effet séparé des deux correctifs (poste chargé) : 44 → 22 → 19 images > 50 ms ; boucle de l’arène 10 → 0 ; clic « Tour suivant » 6 → 6 → 0 |
| `profil-2tours-780m.json` | `LQV_TRACE=0 LQV_TRACE_USERDATA=<dossier> LQV_TRACE_TURNS=2 LQV_TRACE_ROUNDS=3 LQV_TRACE_AIDELAY=0 …` | profil persistant : les pointes > 100 ms de la première révélation ne reviennent pas une fois le cache de shaders de Chrome rempli |
| `etape-shaders-canvas-780m.json` | `LQV_TRACE=0 LQV_TRACE_USERDATA=… LQV_TRACE_ROUNDS=3 …` (rival à 650 ms ; build intermédiaire sans le dessin du témoin à la première image) | a montré la boucle de l’arène à 38 ms à la première révélation malgré le programme gardé : premier usage synchrone, d’où le dessin du témoin à la première image |
| `final-780m.json`, `final-rtx4060.json` | `LQV_TRACE=0 LQV_TRACE_USERDATA=… LQV_TRACE_ROUNDS=3 LQV_TRACE_BUILDS=avant=…,apres=…` (RTX : `LQV_CHROME_ARGS=--force_high_performance_gpu`) | avant / après final, rival à 650 ms : premier duel froid puis deux duels chauds par build |
| `trace-froide-780m.json` + `-r1-*-pics.json.gz` | `LQV_TRACE=1 LQV_TRACE_FRESH=1 LQV_TRACE_BUILDS=avant=…,apres=…` | un duel complet tracé par build, caches froids, rival à 650 ms |
| `art-canvas.json` | `LQV_BEFORE=<dist avant> node tools/art-canvas-compare.mjs 6` | galerie (37 illustrations) : temps de génération entrelacé, écarts de pixels avant / après, GPU / SwiftShader |
| `qa-browser-passe12-avant.json`, `-apres.json` | `CHROMIUM_PATH=<Chrome> [LQV_DIST=<dist avant>] npm run qa:browser` (SwiftShader, sans `LQV_GPU`) | non-régression sur ce poste : résultats identiques ; `mobile-rotation-touch` échoue dans les deux builds (scène du Clash en fondu au tour suivant), alors que le conteneur passait |
| `qa-rc-passe12-avant.json`, `-apres.json` | `CHROMIUM_PATH=<Chrome> [LQV_DIST=<dist avant>] npm run qa:rc` | 8/9 dans les deux builds : contraste du rang « II » de l’éditeur de deck à 3,5–3,6:1 sur ce poste ; longévité, moteur et coût par écran OK |

## Passe 13 — re-rendu ciblé du plateau (2026-10-17)

« avant » = `main` `4ccce89` (bundle identique à la passe 12), « après » = passe 13 (arbre de travail sur `4ccce89`,
code identique au commit de la passe). Les deux builds ont été construits par `npm run build` et servis depuis un
dossier hors du dépôt. Synthèse : `docs/RAPPORT_M06_RC.md` §5.6, ADR 015.

Nouveaux champs de `perf:trace` :
- `commands` (par duel) et `commandSummary` (par build) : coût de chaque commande par famille, mesuré dans la page.
- `commandPairs` : écart apparié, même commande, même ronde.
- `commandPairsCpu` (avec `LQV_TRACE=1`) : idem en temps processeur de la tâche.
- `hitches.trace.commandTasks` et `hitches.trace.commands` : temps processeur par commande et catégories.
- `node tools/trace-analyze.mjs --resume <rapport>` recalcule ces résumés depuis les relevés de page.

| Fichier | Commande (préfixe commun `LQV_GPU=1 CHROMIUM_PATH=<Chrome> LQV_TRACE_AIDELAY=650 LQV_TRACE_BUILDS=avant=<dist 4ccce89>,apres=<dist passe 13>`) | Ce qu’il montre |
|---|---|---|
| `passe13-cpu-780m.json` | `LQV_TRACE=1 LQV_TRACE_LIGHT=1 LQV_TRACE_ROUNDS=3 LQV_TRACE_USERDATA=<dossier neuf>` | temps processeur par commande 9,6 → 7,4 ms (médiane) ; apparié −2,0 ms, 214 / 264 plus rapides |
| `passe13-cpu-rtx4060.json` | idem + `LQV_CHROME_ARGS=--force_high_performance_gpu` | 8,2 → 6,4 ms ; apparié −1,5 ms, 158 / 265 ; deux inversions d’engagement (rondes 1 et 2) |
| `passe13-commandes-780m.json` | `LQV_TRACE_ROUNDS=4 LQV_TRACE_USERDATA=<dossier neuf>` (sans trace) | temps mural seul : médiane 6,8 → 6,0 ms, mais écarts par ronde incohérents (+0,7 à −1,8 ms) selon la charge du poste (images > 16,7 ms par duel : 25 à 409). D’où la mesure en temps processeur |
| `qa-browser-passe13-{avant,apres,apres-rendercheck}.json` | `CHROMIUM_PATH=<Chrome> LQV_DIST=<dist> LQV_QA_OUT=… [LQV_RENDER_CHECK=1] npm run qa:browser` (SwiftShader) | non-régression sur ce poste ; rendus comparés à un rendu complet |
| `qa-product-passe13-{avant,apres,apres-rendercheck}.json` | idem avec `npm run qa:product` | non-régression des parcours du jeu ; rendus comparés |

Les traces légères (`LQV_TRACE_LIGHT=1` : tâches de premier niveau et repères) restent dans `artifacts/qa/tmp/` ;
leurs extraits « pics » n’ont pas été versionnés (sans intérêt dans DevTools).
