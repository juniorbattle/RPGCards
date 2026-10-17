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
