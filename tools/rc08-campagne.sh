#!/usr/bin/env bash
# RC 0.8 (M08 C5, étape 6) — campagne de QA complète du jalon, en série (une seule campagne navigateur à la fois :
# en parallèle, SwiftShader se dispute les cœurs et les délais d'attente des parcours sautent).
# Usage : LQV_DIST=<build figé> bash tools/rc08-campagne.sh <dossier de sortie>
set -u
# Chargement à froid de ce conteneur : 11 à 17 s jusqu'à load (compilation des programmes WebGL en SwiftShader).
export LQV_QA_NAV_TIMEOUT=${LQV_QA_NAV_TIMEOUT:-90000}
# Actions (clics, attentes) : une image peut coûter plusieurs secondes en 1920×1080 avec animations réelles ici.
export LQV_QA_TIMEOUT=${LQV_QA_TIMEOUT:-60000}
OUT=${1:-artifacts/qa/rc08/campagne}
mkdir -p "$OUT"
run() { # nom, commande…
  local name=$1; shift
  local t0=$(date +%s)
  echo "=== $name : début $(date -u +%H:%M:%S)"
  "$@" > "$OUT/$name.log" 2>&1
  local rc=$?
  echo "=== $name : fin $(date -u +%H:%M:%S) (code $rc, $(( $(date +%s) - t0 )) s)"
  tail -3 "$OUT/$name.log"
}
run qa-browser env LQV_QA_OUT="$OUT/qa-browser.json" node tools/qa-browser.mjs
run qa-product env LQV_QA_OUT="$OUT/qa-product.json" node tools/qa-product.mjs
run qa-rc-defaut node tools/qa-rc.mjs; cp artifacts/qa/qa-rc.json "$OUT/qa-rc-defaut.json" 2>/dev/null
run qa-rc-bar env LQV_QA_QUERY=venue=bar node tools/qa-rc.mjs; cp artifacts/qa/qa-rc.json "$OUT/qa-rc-bar.json" 2>/dev/null
run qa-rc-arene env LQV_QA_QUERY=venue=arene node tools/qa-rc.mjs; cp artifacts/qa/qa-rc.json "$OUT/qa-rc-arene.json" 2>/dev/null
run qa-techniques node tools/qa-techniques.mjs; cp artifacts/qa/qa-techniques.json "$OUT/qa-techniques.json" 2>/dev/null
echo "=== campagne terminée $(date -u +%H:%M:%S)"
