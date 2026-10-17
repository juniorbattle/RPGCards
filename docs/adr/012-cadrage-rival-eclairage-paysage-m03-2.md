# ADR 012 — Rival rapproché, plateau éclairé, Clash allégé et gabarit paysage (M03.2)
Date : 2026-10-16
Statut : proposé (mandat `docs/missions/M03_2_FIDELITE_VISUELLE_RUNTIME.md` ; complète ADR 009 et 010 sans les remplacer)

**Contexte.** Les captures M03 (`screenshots/qa/m03/comparaison-*`) montraient, face à la preview
validée, un rival petit et sombre (visage ≈ 45 px de haut à 1280×720, luminance relative du visage
≈ 0,04), une table et des cases sombres, une scène de Clash qui recouvrait le visage du rival, et aucun
gabarit pour un téléphone en paysage (à 844×390, la main recouvrait les cases et le HUD joueur ; le
menu tactique n’était pas atteignable au doigt). ADR 009 (composition, caméra ancrée) et ADR 010
(six chorégraphies) restent la base.

**Décision.**
- **Le rival grandit par ses proportions, pas par la caméra.** La caméra ancrée d’ADR 009 place
  `HEAD_WORLD` (tête) et le bord lointain de la table aux hauteurs d’écran `--a-head / --a-edge`. Rapprocher
  la caméra ne changerait rien (le cadrage re-normalise) ; on change donc le personnage, comme dans la
  preview (buste derrière la table, grosse tête) : `RIVAL_Z` −2,9 → −2,7, cou `NECK_Y` 2,5 → 1,72,
  tête ×1,34 (`HEAD_SCALE`). La tête étant plus proche du bord de table en monde, le même couple
  d’ancres grossit toute la scène du fond : le rival occupe le haut-centre de l’écran dans les deux vues.
  Ancres vue A inchangées (0,205 / 0,455) ; **vue B 0,11 / 0,29 → 0,148 / 0,305** pour garder la tête
  entière au-dessus des rangées, sans réduire les emplacements.
- **Visage et mains peints par code en 2×** : modelé (ombre propre, ligne des cheveux, rebond chaud de
  bougie), contour, nez, lèvre, iris agrandis ; paupières fondues (haut et côtés transparents, plus de
  bandeau rectangulaire sur le modelé) ; mains dessinées posées sur le bord de table (doigts visibles) ;
  emblème de famille en haut de poitrine (la cape garde son fermoir). `CHEST_WORLD` remplace la position
  de poitrine codée en dur (origine des effets visant le rival).
- **Lumière : éclairer le visage, la table et les cases, pas le ciel — sans lumière supplémentaire.**
  Exposition 1,22 → 1,3, hémisphère 0,85 → 1,0, clé 1,05 → 1,35 visant la tête ; bougies de table
  3,6 → 2,8, bougies du fond 3,6 → 3,4, vacillement exprimé en rapport de l’intensité de base (il
  réécrivait auparavant toutes les lumières à 3,6) ; halos de flamme réduits (1,15 → 0,62) ; bois
  verni plus clair ; mur plus chaud ; bannières ramenées à 1:2 pour rester entières au-dessus du rival
  agrandi. Un fill frontal et une lampe de table ont d’abord été ajoutés, puis **remplacés par de la
  lumière peinte** après mesure (≈ 6–7 ms CPU par image sous SwiftShader, chaque lumière entrant dans
  la boucle d’éclairage de chaque fragment) : auto-éclairage des couches du rival (`emissiveMap` = la
  texture, 0,26) et flaque chaude peinte dans la texture de la table ; `alphaTest` sur les couches du
  rival pour ne pas éclairer leurs texels transparents.
- **Lisibilité mesurée, pas supposée.** Éclaircir la table fait baisser le contraste des textes clairs
  posés dessus : contraste WCAG mesuré sur les captures (fond réel sous chaque texte). Étiquettes de
  case en boîte ajustée au texte sur un voile sombre diffus, aides de case sur pastille sombre
  translucide, texte opaque ; bandeau de posture remonté pour ne plus couvrir le libellé de la rangée
  suivante ; rangées du portrait abaissées pour dégager le libellé du rival de ses mains ; objectif
  ≥ 4,5:1 pour chaque texte mesuré, dans chaque cas capturé.
- **Libellés courts sur petit écran** : « S1 · PRIMAIRE · S2 » (comme la preview mobile) en portrait
  et en paysage, plus grands que les libellés longs ; la case garde son nom accessible (aria-label).
- **Clash : les Primaires au centre, le verdict lisible sans journal, trois conséquences au plus.**
  Face-à-face plus bas (51 % de la hauteur, 25 vh) pour laisser le visage visible ; une pilule de 1 à 3
  conséquences essentielles (vainqueur au Rang, absorption, blessures fusionnées) ; le départ des deux
  Primaires en défausse est montré **sur les cartes** (étiquette « → DÉFAUSSE » au temps nettoyage),
  plus par une ligne de texte. Chorégraphies, rapport moteur et non-fuite inchangés.
- **Gabarit petit écran paysage** : `@media (orientation: landscape) and (max-height: 560px)` (844×390,
  960×540). Même grammaire que le bureau (HUD rival haut-gauche, HUD joueur compact bas-gauche, main
  centre-bas, commandes + Techniques bas-droite, bulle haut-droite), frise de phase masquée, rangées
  compactes entre la tête du rival et la main, ancres A 0,19 / 0,385 et B 0,13 / 0,275, racine de
  texte 12 px, scène de Clash redimensionnée. Le portrait 390×844 (`max-width: 820px`) est conservé.
- **Mesure de coût par ablation (QA seulement)** : `?qa=1&ablate=candles,banners,dust` retire un
  élément du rendu ; inerte en jeu.

**Conséquences.** Aucune lumière ajoutée au total. Le rival, plus grand, couvre davantage de pixels
éclairés et superposés : coût CPU par image mesuré en rondes entrelacées avant / après sous
SwiftShader (`tools/perf-compare.mjs`, `artifacts/qa/perf-compare-m03-2.json`), jamais extrapolé à
un GPU. Les bougies restent le poste le plus coûteux (ablation `artifacts/qa/perf.json`). La preview
reste un document de revue. Les textures du rival restent générées à partir des seeds et de la
personnalité (aucune image externe). Les ancres paysage sont des réglages de feuille de style, comme
celles du bureau : un futur décor définitif devra les reprendre.

**Alternatives écartées.** Agrandir tout le groupe du rival (le buste aurait recouvert la table et les
cases du rival) ; rapprocher la caméra (sans effet sous le cadrage ancré) ; réinsérer un portrait du
rival en vue B (retiré par ADR 009) ; un gabarit paysage distinct du bureau (deux grammaires à
maintenir).

**Tests.** `test/clashMotion.test.ts` : 1 ≤ conséquences ≤ 3 sur les duels aléatoires, textes T2 et
égalité. `qa:browser` : 5e duel tourné en plein engagement (portrait ↔ paysage ↔ 960×540) avec état et
brouillon identiques avant / après et audit de composition. `tools/shots-m03-2.mjs` : avant / après /
preview aux mêmes seeds, tailles et phases, avec hauteur projetée du visage, luminances, contraste réel
des textes, chevauchements et parcours tactile.

**Question d’approbation.** Valider les proportions du rival (tête ×1,34, buste près du bord), le
niveau d’éclairage, la pilule de conséquences du Clash et le gabarit paysage.
