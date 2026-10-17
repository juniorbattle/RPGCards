# Rapport M06 — Release candidate locale desktop (0.6.0-rc.1)

Mission : `docs/missions/M06_FIABILISATION_ET_ACCEPTANCE_DESKTOP.md` (programme M04–M06, ADR 013, ADR 014).
Développement **directement sur `main`**. Build de la RC : **`d19667e`** (version `0.6.0-rc.1`) ; toutes les
preuves du §3 ont été produites sur ce build, dans ce conteneur (Chromium headless, **WebGL logiciel
SwiftShader — jamais une mesure de GPU**). Mesures sur **GPU réel** (poste de l’opérateur, passe 11) : §5.4.
Règles : **V3.0 + delta V3.2 inchangées** — `git diff 4bfb585..d19667e -- src/game` est **vide**.

> **Ce n’est pas la ville RPG finale.** C’est un jeu solo local jouable de bout en bout autour du duel
> approuvé : accueil, deck, rivaux, série, résultats, progression de prototype, sauvegarde et reprise.
> Ville explorable, économie, quêtes, narration, tells et Sang-froid restent hors périmètre.

## 1. Définition « opérationnel » (programme M04–M06) — vérifiée

| Exigence | Statut | Preuve |
|---|---|---|
| Démarrer sans URL de QA | OK | `npm run dev` / `preview` ouvrent l’accueil ; parcours A–H, I–S partent de `/` |
| Créer / reprendre une partie locale | OK | A (création → rechargement → Continuer), F (reprise d’un duel), G (migration) |
| Voir ses cartes et son deck légal | OK | éditeur + collection ; C et L (deck illégal refusé, mode démo) ; 60 combinaisons Signature × Techniques testées |
| Choisir un rival | OK | 4 rivaux, série + duels libres (E) |
| Terminer plusieurs duels avec les bonnes règles et les six animations M03 | OK | E (8 duels), `qa:browser`, `shots:clash` ; moteur inchangé ; K (même hash avec animations) |
| Voir les résultats, revenir au hub, progresser | OK | E (résultats, manche suivante, récapitulatif, déblocages, Orin) |
| Fermer / rouvrir et récupérer un état valide et cohérent | OK | A, E (rechargement final), F (au hash près en plein engagement et en pleine résolution) |
| Erreurs de sauvegarde, états corrompus, reprises : jamais de destruction silencieuse | OK | D, H, M, N ; tests unitaires (quota, incohérence, schéma futur) |

## 2. Fonctions livrées (checklist)

| Domaine | Livré | Où |
|---|---|---|
| Accueil | Nouvelle partie, Continuer (reprise du duel en cours), Deck, Collection, Options, Aide, Recommencer confirmé ; état de la sauvegarde ; diagnostic d’une sauvegarde illisible | `src/shell/screens.ts` |
| Profil | nom, Signature de départ, deux Techniques ; seed de profil (seeds de duel reproductibles) | idem |
| Deck | 16 identités × Basic / variante possédée, Signature, 2 Techniques, inspection (Rang = priorité, Puissance = dégâts), validation en direct, enregistrement refusé si illégal, confirmation en quittant avec des changements | `src/shell/deckEditor.ts`, `src/product/deck.ts` |
| Collection | 36 définitions + 6 Techniques, filtre par famille, possédé / non possédé / dans le deck, « comment l’obtenir » | idem |
| Rencontres | série de 3 manches, 4 duels libres, verrous motivés, bilans, historique, journal de progression, « Rejouer la série » | `src/shell/screens.ts`, `src/product/encounters.ts`, `progression.ts` |
| Préparation | dossier public du rival, votre deck, conditions du duel | idem |
| Duel | M03.2 inchangé (vues A/B, HUD, six chorégraphies, clic / glisser / clavier / tactile) + Menu (pause, options, aide, Sauvegarder et quitter, abandon confirmé) + conseils contextuels | `src/app/duelSession.ts`, `src/presentation/*` |
| Résultat | victoire / défaite / abandon, PV, dégâts, tours, prolongations, bilan, seed, déblocages, manche suivante, revanche, récapitulatif de série | `src/shell/screens.ts` |
| Sauvegarde | locale, versionnée (schéma 2), écrite à chaque étape et relue, copie de secours, migration 1 → 2, illisible mise à l’écart seulement sur choix, schéma futur refusé, stockage refusé toléré, export / import, effacement confirmé | `src/product/save.ts` |
| Reprise | exacte en plein duel par rejeu vérifié au hash ; refus motivé et choix sinon ; abandon depuis le tableau | `src/product/resume.ts`, `src/shell/shell.ts` |
| Options | rythme, mouvement réduit (système / oui / non), taille du texte, conseils (réafficher), mode démo « tout le catalogue », seed esthétique | `src/shell/options.ts` |
| Aide | déroulé d’un tour, Rang ≠ Puissance, « pourquoi 0 dégât », états des Secondaires, Insight et Techniques, lecture du rival, vues et raccourcis | `src/shell/help.ts` |
| Sans WebGL | jeu complet avec repli CSS de l’arène | I |
| Entrées QA historiques | `?autostart`, `?scenario`, `?gallery`, `?setup=1`, `?qa=1` (lecture seule) | `src/main.ts` |

## 3. Campagne de validation (build `d19667e`)

Porte de démarrage, sur un **clone propre du commit final `382ad1f`** (code applicatif identique à `d19667e`) : `npm ci` (57 paquets, 2 s) · `npm run typecheck` 0 erreur · `npm test` **146/146** · `npm run build` OK · `npm run preview` sert le jeu (titre, bundle 200) · `npm run dev` sert `main.ts` et `shell.ts` (200). (Même résultat plus tôt sur un clone de `347af3c`.)

| Campagne (build `d19667e`) | Résultat |
|---|---|
| `npm run qa:product` — 8 parcours de joueur depuis l’accueil | **8/8, 64/64 contrôles, 0 erreur console** — A nouveau joueur 1280 au clic (duel complet, victoire au tour 8, rechargement, Continuer) ; B 1920 au glisser (14 tours) + clavier + abandon annulé puis confirmé ; C deck illégal refusé ; D sauvegarde illisible restaurée, schéma futur refusé ; **E série complète** jouée par l’interface (22/22, 12 min 15 s) ; **F reprise exacte** (même hash et même vue après rechargement en plein engagement et en pleine résolution ; Sauvegarder et quitter ; abandon depuis le tableau) ; G migration d’une vraie sauvegarde v1 ; H reprise altérée refusée. Duels audités : vues 0 écart, composition 0, postures 0, **fuites 0**, clics perdus 0 |
| `npm run qa:rc` — porte RC | **9/9, 45/45 contrôles** — I **sans WebGL** (repli CSS, duel complet, résultat) ; J **longévité** : 12 duels, 4 rivaux échangés dans la même scène : textures **20** à chaque passage, géométries constantes par rival (45 avant la 1re image en vue B, puis 51 / 52), aucune scène / plateau / crochet résiduel, nœuds DOM 154 → 169 (historique du tableau plafonné à 6 lignes), tas JS après GC 10,0 → 13,5 Mo (+0,3 Mo par duel au début, puis plat) ; K **moteur indépendant des animations** : duel joué avec séquences et chorégraphies réelles (6 tours), enregistrement rejoué **hors navigateur** ⇒ même hash (`bdd000d52e9af80c`, 41 commandes) = duel en cours sauvegardé ; L **mode démo** (Signature Astre + Rupture + Dissipation + 8 variantes reçues telles quelles par le moteur ; retour en progression ⇒ deck signalé et refusé ; historique intact) ; M **stockage refusé** (jouable, signalé, ≤ 1 message) ; N **Recommencer / Effacer** (annuler conserve, confirmer agit, ancien profil en copie de secours) ; S **contraste** (ci-dessous) ; T **clavier seul** de l’accueil au duel (focus initial sur l’action principale, Tab, Entrée, Échap sans perte, 2 tours au clavier) ; P coût par écran (§5) |
| `npm run qa:browser` (duels M03, entrées historiques) | **5/5 duels** jusqu’au K.-O. (glisser 1280, clic 1920 avec séquences vues, clavier, tactile 390, rotation portrait ↔ paysage ↔ 960×540 en plein tour) ; 267 contrôles de vue / 0 écart ; 128 contrôles de posture / 0 écart ; composition 0 ; **fuites 0** ; console 0 ; clics perdus 0 ; 4 rotations, état conservé (smoke mobile paysage : pas de régression) ; 12 humeurs du rival |
| `npm run qa:techniques` (Rupture, Dissipation, effet camouflé) | **8/8** parcours (souris 1280 et tactile 390), captures `screenshots/qa/m06/techniques/` |
| `shots:clash` (six chorégraphies, poses, mouvement réduit, pellicules) | **10/10 cas, 0 problème** — `screenshots/qa/m06/clash/` (les pellicules sont des positions exactes de l’animation, pas un enregistrement temps réel) |
| `shots:m04` sur la RC (écrans + preuve de cadrage) | **33 captures, 0 problème** (`screenshots/qa/m06/ecrans/`, 1280×720, 1920×1080, smoke portrait 390×844) ; scène 3D d’un duel lancé depuis le jeu = entrée historique **au pixel près (0/255)** ; ancres 0,205 / 0,455 ; visage yeux→menton **83 px** (720 p) et **125 px** (1080 p) — repères ADR 013 respectés |
| Vidéo du parcours complet (`npm run video`) | `screenshots/qa/m06/parcours-1280.mp4` — 3 min 30 s, **temps réel** de ce conteneur (460 images en 209 s ≈ 2,2 images/s sous SwiftShader : la fluidité n’est pas celle d’un GPU) : accueil → création → deck → rencontres → préparation → duel complet au glisser (6 tours, Clash joués en entier) → résultat → tableau → collection. Capture par le screencast de Chromium et encodage par le ffmpeg du système (l’enregistreur intégré de Playwright exige un binaire non installé ici) |

**Contraste des nouveaux écrans** (mesuré sur la capture : fond = pixel de luminance médiane sous chaque texte, couleur composée avec l’opacité héritée ; seuil 4,5:1, 3:1 pour les grands textes) — **tous les textes actifs ≥ 4,5:1** sur les 11 écrans : accueil 7,5:1 (min), création 7,1, rencontres 7,3, deck 7,3, collection 8,4, préparation 7,3, menu du duel 9,1, options 9,1, résultat 7,4, accueil avec sauvegarde 7,6, aide 11,0. Contrôles désactivés (exemptés WCAG, mesurés quand même) : deck 6,7:1, options 4,4:1 (boutons A−/A+ grisés en butée). Le duel lui-même est la scène M03.2 (contrastes M03.2 ≥ 4,5:1 dans les 13 scènes mesurées) — inchangée au pixel près.

## 4. Secrets et équité

- Moteur, IA, visibilité : **inchangés** depuis M03.1B (non-fuite des effets camouflés, ADR 011) ; l’IA décide sur
  sa seule vue (`viewFor('p2')`) avec la mémoire de ses événements visibles.
- Chaque duel joué par l’interface pendant la campagne passe `secretAudit` à chaque décision : aucune identité
  adverse cachée, aucun identifiant d’instance adverse, aucune carte camouflée nommée, aucun choix tactique
  adverse avant le verrou commun.
- Préparation : seulement Signature, Techniques, PV et style du rival (ARB-002 tel qu’implémenté, non ratifié).
- Résultats et historique : événements visibles du joueur uniquement ; le duel en cours sauvegardé (qui contient
  les commandes de l’IA) n’est jamais affiché ni résumé.
- Équité des sièges : la logique d’IA n’a pas évolué en M04–M06 (aucune nouvelle mesure de sièges nécessaire) ;
  la difficulté des rivaux vient de leurs données (PV, deck, Techniques, profil), jamais d’une IA qui tricherait.

## 5. Performance (SwiftShader §5.1–5.2 · protocole GPU §5.3 · mesures sur GPU réel §5.4)

### 5.1 Le duel : même scène, même coût

Comparaison **entrelacée** M03.2 (`110525d`, avant) ↔ RC (`d19667e`, après), même machine, même session, entrée
`?scenario=signature` (scène du duel identique au pixel près à un duel lancé depuis le jeu, §3), 1280×720, temps du
**fil principal** par image (médianes) et images/s — WebGL logiciel :

| Série | Vue | Avant (M03.2) | Après (RC) | Draw calls |
|---|---|---|---|---|
| 1 (5 rondes) | A | 50,0 ms [44,1–77,0] · 2,65 img/s | 52,4 ms [46,7–52,5] · 2,62 img/s | 73 / 73 |
| 1 (5 rondes) | B | 41,0 ms [37,2–44,9] · 3,03 img/s | 46,0 ms [41,4–48,7] · 2,93 img/s | 75 / 75 |
| 2 (7 rondes) | A | 47,4 ms [42,5–71,8] · 2,67 img/s | 46,8 ms [41,5–55,1] · 2,60 img/s | 73 / 73 |
| 2 (7 rondes) | B | 40,4 ms [37,8–44,7] · 3,03 img/s | 40,0 ms [36,2–44,7] · 2,83 img/s | 75 / 75 |

La première série suggérait +12 % en vue B ; la seconde, plus longue, ne le confirme pas (−1 %). Lecture : **aucun
écart attribuable** à la RC, la variance du conteneur dominant (plages de 37 à 77 ms pour un même build). Aucune
optimisation n’a donc été engagée sur le duel (ADR 013 : pas de compromis sur la présence du rival sans mesure GPU
et approbation). Ablation (`artifacts/qa/perf-m06.json`, vue A) : scène complète 53,5 ms ; sans bougies 26,7 ;
sans bannières 47,6 ; sans poussières 49,3 ; sans les trois 24,2 — les bougies restent le premier poste, comme en M03.2.

### 5.2 L’enveloppe ne coûte rien pendant les menus

| Écran | Fil principal (ms de tâches / s) | Images 3D calculées |
|---|---|---|
| Accueil | 0 | **0 en 4 s** (scène figée, une image à l’entrée) |
| Rencontres | 0 | 0 |
| Préparation | 0 | 0 (une image au changement de rival) |
| Duel (vue A, tour 1) | 8 | 9 en 4 s (≈ 1,3–3 img/s SwiftShader) |

Accueil interactif ≈ 3,4 s après la navigation sous SwiftShader (initialisation WebGL logicielle comprise). Bundle :
un fichier JS de 768 Ko (214 Ko gzip), Three.js compris. Moteur : 35,5 ms par duel IA/IA complet (200 duels, 9,8 tours
en moyenne), comme en M03.2 (34–35 ms la nuit). Longévité : voir J (§3) — ni textures, ni géométries, ni nœuds DOM,
ni tas JS ne croissent sur 12 duels.

### 5.3 Protocole de mesure sur GPU réel (à faire par l’opérateur)

1. `npm install && npm run build`.
2. Avec un Chrome / Chromium à GPU : `LQV_GPU=1 CHROMIUM_PATH=<chemin de Chrome> npm run perf` (aucun forçage SwiftShader ;
   le rapport nomme le moteur de rendu réellement utilisé ; `LQV_PERF_OUT=…` pour ne pas écraser `artifacts/qa/perf.json`), puis
   `LQV_GPU=1 CHROMIUM_PATH=… LQV_BEFORE=<build M03.2> LQV_BEFORE_SHA=110525d node tools/perf-compare.mjs 7`.
   Portable hybride : Chrome prend le GPU intégré par défaut ; `LQV_CHROME_ARGS=--force_high_performance_gpu` pour le GPU discret.
3. En jeu : `npm run perf:play` (duel complet joué au clic, mouvement réel, intervalles d’image par vue A / B / Clash et
   `arenaStats()`), ou à la main : `npm run preview`, ouvrir `http://localhost:4173/?qa=1`, jouer, et lire `__lqv.arenaStats()`
   dans la console (images/s, ms par image, draw calls) en vue A et B, sur ordinateur de bureau et portable.
4. Aucun seuil de 60 images/s n’est promis ; tout compromis de rendu passe par une comparaison visuelle (ADR 013).

### 5.4 Mesures sur GPU réel — portable de l’opérateur (passe 11, 2026-10-17)

**Poste :** portable, AMD Ryzen 7 8845HS (8 cœurs / 16 fils), 31 Go, Windows 11 (10.0.26200), sur secteur, mode
« Utilisation normale », écran interne 2560×1600 à 165 Hz ; Chrome 155.0.8059.80 headless, ANGLE Direct3D 11 ; Node 22.14.0.
Deux adaptateurs : **AMD Radeon 780M** (intégré, celui que Chrome choisit par défaut) et **NVIDIA GeForce RTX 4060 Laptop**
(forcé par `--force_high_performance_gpu`). Build mesuré : `64863ac` (code applicatif de la RC `d19667e`) ; « avant » :
M03.2 `110525d`. Fichiers : `artifacts/qa/perf-gpu-{780m,rtx4060}.json`, `perf-compare-gpu-{780m,rtx4060}.json`,
`perf-play-gpu-{780m,rtx4060}.json`.

**Limites de la mesure.**
- `requestAnimationFrame` suit l’écran : 165 img/s est un **plafond**, pas un débit maximal. Chrome 155 headless sans
  synchro verticale (`--disable-gpu-vsync --disable-frame-rate-limit`) retombe à ≈ 57 rAF/s même sur une page vide :
  ce mode n’est pas utilisé.
- `frameMs` mesure le fil principal (mise à jour + soumission du rendu), pas le temps GPU. L’extension
  `EXT_disjoint_timer_query_webgl2` est disponible sur les deux GPU mais n’est pas encore exploitée.
- Le poste n’est pas dédié : d’autres sessions et navigateurs tournaient, et la charge processeur totale variait de 26 à 68 %.
  Le banc moteur, sur 200 duels identiques, a mesuré 31,6 puis 71,6 ms par duel à 3 minutes d’intervalle.

**Duel à l’arrêt** (scénario `signature`, 1280×720, 7 rondes entrelacées ; fil principal en médiane et images/s en médiane
[min–max des rondes]) :

| GPU | Vue | M03.2 (`110525d`) | RC | Draw calls |
|---|---|---|---|---|
| RTX 4060 | A | 2,46 ms · 161 img/s [154–165] | 2,49 ms · 156 img/s [148–165] | 73 / 73 |
| RTX 4060 | B | 2,70 ms · 156 img/s [146–165] | 2,66 ms · 157 img/s [149–165] | 75 / 75 |
| Radeon 780M | A | 2,93 ms · 95 img/s [73–123] | 2,29 ms · 128 img/s [81–152] | 73 / 73 |
| Radeon 780M | B | 1,95 ms · 143 img/s [117–163] | 1,73 ms · 142 img/s [79–163] | 75 / 75 |

Lecture :
- Sur la RTX 4060, les deux vues atteignent le plafond de l’écran, sans écart entre M03.2 et la RC.
- Sur la 780M, un même build varie de 73 à 163 img/s : le GPU intégré compose aussi le bureau et l’écran 165 Hz. Aucune ronde ne descend sous 72 img/s.
- L’écart de médiane en vue A (95 → 128 img/s) reste dans cette dispersion : il n’est pas attribuable à la RC.
- Le fil principal tourne autour de 2–3 ms par image, contre 40–53 ms sous SwiftShader (§5.1).

**Duel joué** (`perf:play` : seed 202, joué au clic jusqu’au K.-O. en 14 tours, 13 séquences regardées, 10 scènes de Clash,
rythme normal, mouvement réel, ≈ 110 s par duel). Les 4 duels se terminent avec **0 erreur console, 0 fuite et 0 écart de vue** :

| GPU | Fenêtre | Images | Médiane | p95 | p99 | > 16,7 ms | > 33,3 ms | Max | Arène, fil principal (A / B / Clash) |
|---|---|---|---|---|---|---|---|---|---|
| Radeon 780M | 1280×720 | 15 074 | 6,1 ms (164 img/s) | 12,2 ms | 24,2 ms | 4,5 % | 0,5 % | 230 ms | 1,63 / 1,80 / 1,66 ms |
| Radeon 780M | 1920×1080 | 15 218 | 6,1 ms (164 img/s) | 12,2 ms | 30,3 ms | 4,6 % | 0,7 % | 91 ms | 1,96 / 2,20 / 2,00 ms |
| RTX 4060 | 1280×720 | 11 775 | 6,1 ms (164 img/s) | 18,2 ms | 24,7 ms | 9,8 % | 0,5 % | 230 ms | 1,69 / 1,74 / 2,13 ms |
| RTX 4060 | 1920×1080 | 12 365 | 6,1 ms (164 img/s) | 18,2 ms | 30,3 ms | 11,3 % | 0,6 % | 97 ms | 2,34 / 2,37 / 2,07 ms |

Lecture :
- **La vue B** a un p95 plus élevé (24–36 ms). Elle ne compte qu’environ 700 images par duel, prises surtout pendant les bascules A ↔ B.
- **L’arène** ne dépasse jamais 6,2 ms de fil principal par image.
- **Les à-coups** (85–230 ms, une poignée par duel, identiques sur les deux GPU) viennent donc du fil principal hors arène : DOM, mise en page, ramasse-miettes, génération d’illustrations, ou le pilote de QA lui-même, qui interroge la page toutes les 60 ms et audite le DOM à chaque décision.
- **Les percentiles sont pessimistes** par rapport à un joueur humain. La source des à-coups n’est pas identifiée.
- La RTX produit plus d’images lentes que la 780M. Hypothèse non vérifiée : copie des images du GPU discret vers l’intégré, qui pilote l’écran.

**Autres relevés** (`perf`, un passage par GPU) :
- Scène de Clash en temps réel (2,5 s) : 780M médiane 6,1 ms, p95 24,2 ms, 5 images > 50 ms ; RTX médiane 6,1 ms, p95 6,2 ms, 2 images > 50 ms. Un à-coup se produit à l’apparition de la scène.
- Ablation du décor (vue A, 3 rondes) : toutes les variantes restent entre 1,8 et 2,4 ms, dans le bruit. Le poids des bougies observé sous SwiftShader (la moitié de l’image) était un artefact du rendu logiciel.

**Conclusion (ADR 013) :** aucun compromis de rendu n’est nécessaire sur ce poste. Le duel approuvé tient le plafond de
l’écran en jeu, sur le GPU intégré comme sur le GPU discret, en 1280×720 comme en 1920×1080. Le prochain sujet de fluidité
n’est pas la 3D : ce sont les à-coups ponctuels du fil principal, à étudier avec une trace Chrome d’un duel joué sans pilote
de QA. Non mesurés : poste de bureau, campagne en fenêtre visible (seule une sonde l’a été : 165 rAF/s), temps GPU par image,
mode batterie.

## 6. Défauts trouvés et corrigés pendant M04–M06

| Défaut | Trouvé par | Correctif |
|---|---|---|
| Le duel ne pouvait pas être quitté : écouteurs `window` et minuteries de l’IA jamais retirés (un 2e duel aurait reçu les touches du 1er) | audit M04 | `DuelSession` démontable (`74085cc`) |
| Arène recréée à chaque rival sans libérer ses textures | audit M04 | arène unique, `setRival` (`74085cc`) |
| **Fuite de textures du rival** : chaque duel laissait au GPU les formes de bouche de ses expressions passées | QA de longévité M06 (J) | toutes les bouches libérées (`d19667e`) |
| Effets transitoires figés dans la scène des menus (anneaux, éclats en cours à la mise en pause) | QA de longévité M06 (J) | achevés et libérés à la pause (`d19667e`) |
| Stockage refusé : un message d’erreur à chaque commande | QA M06 (M) | un message par minute au plus (`d19667e`) |
| Focus clavier renvoyé sur « Enregistrer » à chaque bascule de carte dans l’éditeur | revue M06 | focus et défilement conservés sur un même écran (`d19667e`) |
| Le Résultat cadrait le rival en vue B (petit) si le duel finissait pendant la composition | captures M04 | vue A forcée hors duel (`80bd858`) |
| Mesure : capture du canvas incluant les calques DOM (« 4 % de pixels différents ») ; couleurs `color(srgb …)` lues en 0–255 ; textures mesurées en plein duel ; géométries de la vue B comptées comme fuite | outils QA | calques masqués ; analyse des couleurs corrigée ; mesure à la préparation ; première image en vue B exclue, vérifiée à part |
| Test H : assertion trop étroite (un seul motif de refus de reprise) | QA M05 | les deux refus légitimes acceptés |

## 7. Connu / à faire

| Sujet | État | Suite proposée |
|---|---|---|
| Ville HD-2D, exploration, économie, quêtes, clubs, tournois | hors périmètre | contrat de contenu à venir |
| Progression (récompenses, collection de départ), PV et decks des rivaux, Orin | **prototypes non canoniques**, réglables par donnée | arbitrage de contenu |
| PV du joueur fixes (90) | aucune progression de PV ratifiée | à décider avec la progression |
| Mesure sur GPU réel | **faite sur un portable** (passe 11, §5.4 : Radeon 780M et RTX 4060, plafond de l’écran en jeu) ; poste de bureau non mesuré | trace des à-coups du fil principal ; temps GPU par image |
| Mobile paysage | pas de nouveau travail (mandat) ; portrait vérifié en smoke-test | chantier dédié |
| Écran Résultat : scène 3D animée (réaction finale du rival) | coût de rendu identique au duel pendant cet écran | figer après quelques secondes si le budget GPU l’exige |
| Brouillon non verrouillé perdu à la reprise ; animation d’une résolution interrompue non rejouée | assumé et annoncé (menu) | — |
| Bouton « précédent » du navigateur | non géré (application d’une page ; il quitte le jeu) | historique de navigation si souhaité |
| Taille du bundle | 1 fichier JS ≈ 0,76 Mo (≈ 0,21 Mo gzip), Three.js compris | découpage si le chargement devient un sujet |
| Polices | typographie système (aucune police téléchargée) | direction artistique |
| Vignettes de cartes (éditeur, collection) | textes de cartiste très petits ; l’information lisible est à côté (libellés, inspection) | — |

## 8. Historique des commits M04–M06

| SHA | Lot | Objet |
|---|---|---|
| `4bfb585` | (opérateur) | mandat M04–M06, ADR 013 |
| `74085cc` | M04 | session de duel démontable, arène unique (`setRival` / `setPaused`) |
| `e05af56` | M04 | modules purs : flux, deck, sauvegarde v1, rivaux de prototype, résumé public (+18 tests) |
| `80bd858` | M04 | écrans du jeu, conseils, aide, options ; outils `qa-product`, `shots-m04`, `duel-driver` |
| `9491570` | M04 | rapport M04, journal passe 8, preuves |
| `e6e54c1` | M05 | série du Quai, Orin, progression de prototype, sauvegarde v2 + migration, reprise exacte (+ tests, QA E–H) |
| `347af3c` | M05 | rapport M05, ADR 014, journal passe 9, preuves |
| `d19667e` | M06 | fuite de textures du rival, effets figés en pause, ergonomie ; outils `qa-rc`, `replay-hash`, vidéo ; 0.6.0-rc.1 |
| (suivant) | M06 | rapport RC, journal passe 10, preuves de la campagne, outils de captures et vidéo adaptés |

## 9. Arbitrages demandés

1. **ADR 014** (proposé) : flux produit, sauvegarde versionnée, **reprise exacte par rejeu vérifié**.
2. **Progression de prototype** : collection de départ (16 Basic, 4 Signatures, 4 Techniques, variantes de Rang I) et récompense « première victoire ⇒ variantes de famille II–IV + Technique distinctive ».
3. **Rivaux** : PV (Kaï 80, Maëlle 95, Sélène 100, Orin 110), decks, ordre de la série, déblocage d’Orin ; **Orin** comme quatrième personnage.
4. **ARB-002** (Signature et Techniques du rival publiques avant le duel) : appliqué, toujours non ratifié ; ARB-001, ARB-005 / 005b, ARB-011 : inchangés, non tranchés.
5. Mesure GPU sur un poste réel avant tout compromis de rendu (ADR 013 : aucune réduction de la présence du rival sans comparaison et approbation). **Faite sur le portable de l’opérateur (§5.4) : aucun compromis requis.**
