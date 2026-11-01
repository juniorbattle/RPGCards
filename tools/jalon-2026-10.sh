#!/usr/bin/env bash
# Jalon de QA du 2026-10, tout le jeu sur GPU réel, en série (une campagne navigateur à la fois) : suite de
# `tools/m10f-campagne.sh`, avec ce qui est arrivé depuis la passe 140 (M11, M12, avenant 09, M13, retours du 2026-10-29,
# protagoniste). Radeon 780M (adaptateur par défaut) et RTX 4060 (`--force_high_performance_gpu`).
# `LQV_PARTIES` : pixel (au pixel près contre `LQV_REF_140` en `?cartes=v1` et contre `LQV_REF_162` tel quel), parcours (deux
# tailles, puis une fois par GPU), couts (fluidité avec et sans relief, plafonnée et sans plafond, vue, son, musique,
# démarrage), campagne (`qa:browser`, `qa:product`, `qa:rc` salle, bar, arène, `qa:techniques`, contre-épreuve des secrets).
# Les fichiers suivis réécrits par les outils sont copiés dans la sortie puis restaurés.
# Usage : npm run build && LQV_REF_140=<dist> LQV_REF_162=<dist> CHROMIUM_PATH=<Chrome> bash tools/jalon-2026-10.sh [sortie] [captures]
set -u
export LQV_GPU=1
export LQV_QA_NAV_TIMEOUT=${LQV_QA_NAV_TIMEOUT:-90000}
export LQV_QA_TIMEOUT=${LQV_QA_TIMEOUT:-60000}
OUT=${1:-artifacts/qa/jalon-2026-10}
SHOTS=${2:-artifacts/qa/tmp/jalon-2026-10}
GPUS=${LQV_GPUS:-780m rtx}
PARTIES=${LQV_PARTIES:-pixel parcours couts campagne}
SANS_PLAFOND="--disable-gpu-vsync --disable-frame-rate-limit"
mkdir -p "$OUT/pixel" "$OUT/parcours" "$OUT/cout" "$OUT/campagne" "$SHOTS"
run() { # nom (relatif à la sortie), commande…
  local name=$1; shift
  local t0=$(date +%s)
  echo "=== $name : début $(date -u +%H:%M:%S)"
  "$@" > "$OUT/$name.log" 2>&1
  local rc=$?
  echo "=== $name : fin $(date -u +%H:%M:%S) (code $rc, $(( $(date +%s) - t0 )) s)"
  tail -1 "$OUT/$name.log" | cut -c1-200
}
restaure() { # copie un fichier suivi dans la sortie, puis restaure les chemins suivis réécrits
  local src=$1 dst=$2; shift 2
  cp "$src" "$dst" 2>/dev/null
  git checkout -- "$src" "$@" 2>/dev/null
}
partie() { case " $PARTIES " in *" $1 "*) return 0;; esac; return 1; }
for gpu in $GPUS; do
  if [ "$gpu" = rtx ]; then ARG=--force_high_performance_gpu; else ARG=; fi
  export LQV_CHROME_ARGS=$ARG
  if partie pixel; then
    LQV_BEFORE="$LQV_REF_162" LQV_BEFORE_SHA=40dfe36 run "pixel/ref162-$gpu" node tools/l5-identique.mjs "$OUT/pixel/ref162-$gpu.json"
    LQV_BEFORE="$LQV_REF_140" LQV_BEFORE_SHA=52c44b5 LQV_APRES_QUERY='&cartes=v1' run "pixel/ref140-cartesv1-$gpu" node tools/l5-identique.mjs "$OUT/pixel/ref140-cartesv1-$gpu.json"
  fi
  if partie parcours; then
    P="$OUT/parcours"
    for vp in 1280x720 1920x1080; do
      w=${vp%x*}
      export LQV_VP=$vp
      run "parcours/demo-$gpu-$w" node tools/m09-demo.mjs "$SHOTS/demo-$gpu-$w" "$P/demo-$gpu-$w.json"
      run "parcours/aventure-$gpu-$w" node tools/m10-aventure.mjs "$SHOTS/aventure-$gpu-$w" "$P/aventure-$gpu-$w.json"
      run "parcours/maison-$gpu-$w" node tools/m10c-parcours.mjs "$SHOTS/maison-$gpu-$w" "$P/maison-$gpu-$w.json"
      run "parcours/voies-$gpu-$w" node tools/m10d-voies.mjs "$SHOTS/voies-$gpu-$w" "$P/voies-$gpu-$w.json"
      run "parcours/vivante-$gpu-$w" node tools/m10e-ville.mjs "$SHOTS/vivante-$gpu-$w" "$P/vivante-$gpu-$w.json"
      run "parcours/vue-$gpu-$w" node tools/m11-vue.mjs "$SHOTS/vue-$gpu-$w" "$P/vue-$gpu-$w.json"
      LQV_VUE_MOUVEMENT=1 run "parcours/vue-marche-$gpu-$w" node tools/m11-vue.mjs "$SHOTS/vue-marche-$gpu-$w" "$P/vue-marche-$gpu-$w.json"
      run "parcours/championnat-$gpu-$w" node tools/m10-championnat.mjs "$SHOTS/championnat-$gpu-$w" "$P/championnat-$gpu-$w.json"
      run "parcours/annonce-$gpu-$w" node tools/v33-annonce.mjs "$SHOTS/annonce-$gpu-$w" "$P/annonce-$gpu-$w.json"
      run "parcours/revision-$gpu-$w" node tools/v33-revision.mjs "$SHOTS/revision-$gpu-$w" "$P/revision-$gpu-$w.json"
      run "parcours/cinematiques-$gpu-$w" node tools/m11-cinematiques.mjs "$SHOTS/cinematiques-$gpu-$w" "$P/cinematiques-$gpu-$w.json"
      run "parcours/nouveau-joueur-$gpu-$w" node tools/m12-nouveau-joueur.mjs "$SHOTS/nouveau-joueur-$gpu-$w" "$P/nouveau-joueur-$gpu-$w.json"
    done
    unset LQV_VP
    run "parcours/accessoires-$gpu" npx tsx tools/m09-accessoires.mjs "$SHOTS/accessoires-$gpu" "$P/accessoires-$gpu.json"
    run "parcours/activations-$gpu" node tools/m12-activations.mjs
    restaure artifacts/qa/m12/activations.json "$P/activations-$gpu.json" screenshots/qa/m12/activations
    run "parcours/marche-profil-$gpu" node tools/marche-profil.mjs
    run "parcours/apparence-$gpu" node tools/protagoniste-aventure.mjs "$SHOTS/apparence-$gpu"
    cp "$SHOTS/apparence-$gpu/rapport.json" "$P/apparence-$gpu.json" 2>/dev/null
    run "parcours/musique-labo-$gpu" node tools/m13-labo.mjs
    git checkout -- screenshots/qa/m13/labo.png screenshots/qa/m13/labo-apres.png 2>/dev/null
    run "parcours/musique-jeu-$gpu" node tools/m13-jeu.mjs
    restaure artifacts/qa/m13/jeu.json "$P/musique-jeu-$gpu.json" screenshots/qa/m13/jeu
  fi
  if partie couts; then
    C="$OUT/cout"
    for vp in 1280x720 1920x1080; do
      w=${vp%x*}
      export LQV_VP=$vp
      # à la fréquence de l'écran (ce que voit le joueur), puis sans plafond (la marge)
      LQV_PERF_QUERY= run "cout/ville-relief-$gpu-$w" node tools/m10f-perf-ville.mjs "$C/ville-relief-$gpu-$w.json"
      LQV_PERF_QUERY='&relief=0' run "cout/ville-sansrelief-$gpu-$w" node tools/m10f-perf-ville.mjs "$C/ville-sansrelief-$gpu-$w.json"
      export LQV_CHROME_ARGS="$ARG $SANS_PLAFOND"
      LQV_PERF_QUERY= run "cout/marge-relief-$gpu-$w" node tools/m10f-perf-ville.mjs "$C/marge-relief-$gpu-$w.json"
      LQV_PERF_QUERY='&relief=0' run "cout/marge-sansrelief-$gpu-$w" node tools/m10f-perf-ville.mjs "$C/marge-sansrelief-$gpu-$w.json"
      # la vue à chaque image : chapitre III, guetteurs dans la ville, avec et sans les rencontres forcées
      LQV_PERF_DEPART=1 LQV_PERF_QUERY= run "cout/marge-sansvue-$gpu-$w" node tools/m10f-perf-ville.mjs "$C/marge-sansvue-$gpu-$w.json"
      LQV_PERF_DEPART=1 LQV_PERF_QUERY='&vue=1&vuePause=1' run "cout/marge-vue-$gpu-$w" node tools/m10f-perf-ville.mjs "$C/marge-vue-$gpu-$w.json"
      export LQV_CHROME_ARGS=$ARG
    done
    unset LQV_VP
    # la ville avec sa musique (temps réel, à la fréquence de l'écran)
    LQV_VP=1920x1080 LQV_PERF_QUERY='&son=1' run "cout/ville-musique-$gpu-1920" node tools/m10f-perf-ville.mjs "$C/ville-musique-$gpu-1920.json"
    run "cout/musique-$gpu" node tools/jalon-musique-cout.mjs "$C/musique-$gpu.json"
    run "cout/duel-$gpu" env LQV_PERF_PLAY_OUT="$C/duel-$gpu.json" node tools/perf-play.mjs
    run "cout/demarrage-$gpu" node tools/rc08-demarrage.mjs "$C/demarrage-$gpu.json"
    LQV_DIST="$LQV_REF_140" run "cout/demarrage-ref140-$gpu" node tools/rc08-demarrage.mjs "$C/demarrage-ref140-$gpu.json"
  fi
  if partie campagne; then
    Q="$OUT/campagne"
    run "campagne/qa-browser-$gpu" env LQV_QA_OUT="$Q/qa-browser-$gpu.json" node tools/qa-browser.mjs
    run "campagne/qa-product-$gpu" env LQV_QA_OUT="$Q/qa-product-$gpu.json" node tools/qa-product.mjs
    run "campagne/qa-rc-salle-$gpu" node tools/qa-rc.mjs; cp artifacts/qa/qa-rc.json "$Q/qa-rc-salle-$gpu.json" 2>/dev/null
    run "campagne/qa-rc-bar-$gpu" env LQV_QA_QUERY=venue=bar node tools/qa-rc.mjs; cp artifacts/qa/qa-rc.json "$Q/qa-rc-bar-$gpu.json" 2>/dev/null
    run "campagne/qa-rc-arene-$gpu" env LQV_QA_QUERY=venue=arene node tools/qa-rc.mjs; cp artifacts/qa/qa-rc.json "$Q/qa-rc-arene-$gpu.json" 2>/dev/null
    run "campagne/qa-techniques-$gpu" node tools/qa-techniques.mjs; cp artifacts/qa/qa-techniques.json "$Q/qa-techniques-$gpu.json" 2>/dev/null
    run "campagne/audits-negatifs-$gpu" node tools/v33-audits-negatifs.mjs "$Q/audits-negatifs-$gpu.json"
    git checkout -- artifacts/qa/qa-rc.json artifacts/qa/qa-techniques.json screenshots/qa/m03-1b/ 2>/dev/null
  fi
done
echo "=== jalon terminé $(date -u +%H:%M:%S)"
