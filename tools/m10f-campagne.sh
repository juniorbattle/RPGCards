#!/usr/bin/env bash
# M10-F — campagne de QA complète de la RC de l'aventure, en série (une campagne navigateur à la fois), sur GPU réel : pour la
# Radeon 780M (adaptateur par défaut) et la RTX 4060 (`--force_high_performance_gpu`) :
#   1. le jeu par défaut au pixel près contre le build du `main` de départ (`LQV_BEFORE`) ; la démo, l'aventure, la maison,
#      les voies, la ville vivante, le Championnat, l'annonce et la révision V3.3, les performances de la ville, en 1280 × 720
#      et 1920 × 1080 ; les accessoires et la fluidité du duel (`perf:play`, les deux tailles) une fois par GPU ;
#   2. `qa:browser`, `qa:product`, `qa:rc` (salle, bar, arène) et `qa:techniques`.
# Les fichiers suivis réécrits par `qa:rc` et `qa:techniques` sont copiés dans la sortie puis restaurés.
# Usage : npm run build && LQV_BEFORE=<dist de départ> LQV_BEFORE_SHA=<sha> CHROMIUM_PATH=<Chrome> bash tools/m10f-campagne.sh [sortie] [captures]
set -u
export LQV_GPU=1
export LQV_QA_NAV_TIMEOUT=${LQV_QA_NAV_TIMEOUT:-90000}
export LQV_QA_TIMEOUT=${LQV_QA_TIMEOUT:-60000}
OUT=${1:-artifacts/qa/m10f/campagne}
SHOTS=${2:-screenshots/qa/m10f/campagne}
GPUS=${LQV_GPUS:-780m rtx}
PARTIES=${LQV_PARTIES:-1 2}
mkdir -p "$OUT" "$SHOTS"
run() { # nom, commande…
  local name=$1; shift
  local t0=$(date +%s)
  echo "=== $name : début $(date -u +%H:%M:%S)"
  "$@" > "$OUT/$name.log" 2>&1
  local rc=$?
  echo "=== $name : fin $(date -u +%H:%M:%S) (code $rc, $(( $(date +%s) - t0 )) s)"
  tail -2 "$OUT/$name.log"
}
for gpu in $GPUS; do
  if [ "$gpu" = rtx ]; then export LQV_CHROME_ARGS=--force_high_performance_gpu; else export LQV_CHROME_ARGS=; fi
  case " $PARTIES " in *" 1 "*)
    run "l5-identique-$gpu" node tools/l5-identique.mjs "$OUT/l5-identique-$gpu.json"
    for vp in 1280x720 1920x1080; do
      w=${vp%x*}
      export LQV_VP=$vp
      run "demo-$gpu-$w" node tools/m09-demo.mjs "$SHOTS/demo-$gpu-$w" "$OUT/demo-$gpu-$w.json"
      run "aventure-$gpu-$w" node tools/m10-aventure.mjs "$SHOTS/aventure-$gpu-$w" "$OUT/aventure-$gpu-$w.json"
      run "maison-$gpu-$w" node tools/m10c-parcours.mjs "$SHOTS/maison-$gpu-$w" "$OUT/maison-$gpu-$w.json"
      run "voies-$gpu-$w" node tools/m10d-voies.mjs "$SHOTS/voies-$gpu-$w" "$OUT/voies-$gpu-$w.json"
      run "vivante-$gpu-$w" node tools/m10e-ville.mjs "$SHOTS/vivante-$gpu-$w" "$OUT/vivante-$gpu-$w.json"
      run "championnat-$gpu-$w" node tools/m10-championnat.mjs "$SHOTS/championnat-$gpu-$w" "$OUT/championnat-$gpu-$w.json"
      run "annonce-$gpu-$w" node tools/v33-annonce.mjs "$SHOTS/annonce-$gpu-$w" "$OUT/annonce-$gpu-$w.json"
      run "revision-$gpu-$w" node tools/v33-revision.mjs "$SHOTS/revision-$gpu-$w" "$OUT/revision-$gpu-$w.json"
      run "perf-ville-$gpu-$w" node tools/m10f-perf-ville.mjs "$OUT/perf-ville-$gpu-$w.json"
    done
    unset LQV_VP
    run "accessoires-$gpu" npx tsx tools/m09-accessoires.mjs "$SHOTS/accessoires-$gpu" "$OUT/accessoires-$gpu.json"
    run "perf-play-$gpu" env LQV_PERF_PLAY_OUT="$OUT/perf-play-$gpu.json" node tools/perf-play.mjs
  ;; esac
  case " $PARTIES " in *" 2 "*)
    run "qa-browser-$gpu" env LQV_QA_OUT="$OUT/qa-browser-$gpu.json" node tools/qa-browser.mjs
    run "qa-product-$gpu" env LQV_QA_OUT="$OUT/qa-product-$gpu.json" node tools/qa-product.mjs
    run "qa-rc-defaut-$gpu" node tools/qa-rc.mjs; cp artifacts/qa/qa-rc.json "$OUT/qa-rc-defaut-$gpu.json" 2>/dev/null
    run "qa-rc-bar-$gpu" env LQV_QA_QUERY=venue=bar node tools/qa-rc.mjs; cp artifacts/qa/qa-rc.json "$OUT/qa-rc-bar-$gpu.json" 2>/dev/null
    run "qa-rc-arene-$gpu" env LQV_QA_QUERY=venue=arene node tools/qa-rc.mjs; cp artifacts/qa/qa-rc.json "$OUT/qa-rc-arene-$gpu.json" 2>/dev/null
    run "qa-techniques-$gpu" node tools/qa-techniques.mjs; cp artifacts/qa/qa-techniques.json "$OUT/qa-techniques-$gpu.json" 2>/dev/null
    git checkout -- artifacts/qa/qa-rc.json artifacts/qa/qa-techniques.json screenshots/qa/m03-1b/ 2>/dev/null
  ;; esac
done
echo "=== campagne terminée $(date -u +%H:%M:%S)"
