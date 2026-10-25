#!/usr/bin/env bash
# Avenant 07 (règle V3.3) — jalon de QA sur GPU réel, en série (une campagne navigateur à la fois) : pour la Radeon 780M
# (adaptateur par défaut) et la RTX 4060 (`--force_high_performance_gpu`), le jeu par défaut au pixel près contre le build
# du `main` de départ, puis la démo, l'aventure, la maison, les voies et le Championnat en 1280 × 720 et 1920 × 1080.
# Usage : npm run build && LQV_BEFORE=<dist de départ> LQV_BEFORE_SHA=<sha> CHROMIUM_PATH=<Chrome> bash tools/v33-jalon.sh [sortie]
set -u
export LQV_GPU=1
OUT=${1:-artifacts/qa/v33/jalon}
SHOTS=screenshots/qa/v33/jalon
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
for gpu in 780m rtx; do
  if [ "$gpu" = rtx ]; then export LQV_CHROME_ARGS=--force_high_performance_gpu; else export LQV_CHROME_ARGS=; fi
  run "l5-identique-$gpu" node tools/l5-identique.mjs "$OUT/l5-identique-$gpu.json"
  for vp in 1280x720 1920x1080; do
    w=${vp%x*}
    export LQV_VP=$vp
    run "demo-$gpu-$w" node tools/m09-demo.mjs "$SHOTS/demo-$gpu-$w" "$OUT/demo-$gpu-$w.json"
    run "aventure-$gpu-$w" node tools/m10-aventure.mjs "$SHOTS/aventure-$gpu-$w" "$OUT/aventure-$gpu-$w.json"
    run "maison-$gpu-$w" node tools/m10c-parcours.mjs "$SHOTS/maison-$gpu-$w" "$OUT/maison-$gpu-$w.json"
    run "voies-$gpu-$w" node tools/m10d-voies.mjs "$SHOTS/voies-$gpu-$w" "$OUT/voies-$gpu-$w.json"
    run "championnat-$gpu-$w" node tools/m10-championnat.mjs "$SHOTS/championnat-$gpu-$w" "$OUT/championnat-$gpu-$w.json"
  done
  unset LQV_VP
done
echo "=== jalon terminé $(date -u +%H:%M:%S)"
