# Rapport RC 0.8 — Release candidate du combat (M08, lot C5) : 0.8.0-rc.1

Mission : `docs/missions/M08_CONSOLIDATION_DU_COMBAT.md` (lot C5) et `docs/missions/BRIEF_SESSION_CLOUD_2026-10-19.md`
(phase 1). Exécution : **session cloud autonome du 2026-10-19**, sans le responsable, développement directement sur
`main`. Version `0.8.0-rc.1` posée en `42f4562` ; **campagne de QA sur le build `6b67271`** (dernier commit de code du
jeu de la session ; le build final `e934f7a` n'ajoute que du code de la ville, reprouvé sans effet sur le rendu par
défaut, §3.2), qui contient aussi la ville (M09), **inactive** dans le jeu par défaut (chargée seulement avec `?ville=1` ou
`?demo=1`), et la piste `?qa=1&compileAsync=1` (inactive sans le paramètre). Toutes les preuves ont été
produites dans ce conteneur : Chromium headless, **WebGL logiciel SwiftShader, jamais une mesure de GPU**.

Règles : **V3.0 + delta V3.2 (+ D-01 ratifié en V3.3) inchangées** : `git diff d19667e..66b7997 -- src/game/engine
src/game/catalog src/game/model src/game/visibility src/game/replay` est **vide** ; seul `src/game/ai/policy.ts` a reçu
les deux profils génériques des PNJ (M08 C3, passe 29). Secrets : aucun changement des surfaces publiques (ADR 011).

## 1. Le lot C5 — fait

| Étape du brief | Statut | Preuve |
|---|---|---|
| 1. « Duels de la ville » dans la rue | **OK** (`21632b8`) | `venue: 'rue'` pour `TOWN_DUELS` ; test `venues.test.ts` ; parcours réel `tools/rc08-ville-rue.mjs` : les quatre PNJ → rue, Tournoi → salle, Kaï → rue, duel PNJ lancé dans la rue (`artifacts/qa/rc08/ville-rue.json`, `screenshots/qa/rc08/duel-ville-rue.png`) |
| 2. Retrait du rendu V1 | **OK** (`0f8c20a`) | ADR 021 amendement 5 ; −1 176 lignes ; bundle −16,6 Ko ; rendu par défaut **identique au pixel près** au build `4a30504` (§3.2) |
| 3. Contraste du « II » | **OK** (`38b32a8`) | pastille sombre propre au chiffre (vignettes de l'éditeur de deck seulement) ; ≥ 18,6:1 même boîte élargie (§3.3) |
| 4. Optimisations vers la démo | **OK en partie** | démarrage mesuré et profilé ; préchauffage des portraits étalé (§5) ; code mort du V1 retiré ; parcours nouveau joueur sans erreur console (§6) ; découpage du bundle **non fait** (aucun gain mesurable ici, §5.3) |
| 5. Version `0.8.0-rc.1` | **OK** (`42f4562`) | `package.json`, `src/product/version.ts` (test) ; schéma de sauvegarde inchangé (2), pas de migration |
| 6. Campagne de QA complète | **OK** (verte au premier passage) | §3 : `qa:browser` 5/5, `qa:product` 9/9, `qa:rc` 9/9 dans trois lieux, `qa:techniques` 8/8 |
| 7. Rapport | ce document | |

## 2. Ce que contient la RC 0.8 (depuis la RC 0.6)

| Domaine | Livré depuis 0.6.0-rc.1 | Référence |
|---|---|---|
| Mise en scène du duel | rival en buste sans mains, plateau symétrique et tour guidé, mise en scène HD-2D (plan de feux, brume, halo, repli automatique du post-traitement), écrans hors duel animés | M07, ADR 017 à 020 |
| Personnages | « vectoriel V2 » pour les quatre rivaux et le portrait du joueur, **V1 retiré** ; pré-génération aux temps morts | ADR 021 (amendements 1 à 5) |
| Lieux de duel | salle de jeu de cartes, la rue (le Quai, la nuit), le Fanal (bar), l'arène ; décors gardés montés | ADR 022 |
| Duellistes PNJ | quatre gabarits à variations par graine ; « Duels de la ville » **dans la rue** | ADR 023 |
| Plateau | intégré à la table, rangée du rival au loin, Primaire plus présente | ADR 018 amendement 1 |
| Éditeur de deck | rang des vignettes lisible (pastille) | ce lot |
| Démarrage | accueil peint plus tôt (portraits préchauffés un par temps mort) | ce lot, §5 |

## 3. Campagne de validation (build `6b67271`, `tools/rc08-campagne.sh`)

Campagne complète du jalon, **en série et seule sur la machine** (aucune autre activité navigateur), sur le build figé
`6b67271`, du 2026-10-19 09:18 au 11:10 UTC (1 h 52) : `tools/rc08-campagne.sh` avec `LQV_QA_NAV_TIMEOUT=90000` et
`LQV_QA_TIMEOUT=60000` (délais d'attente adaptés au chargement à froid de ce conteneur ; **aucun critère de réussite
modifié**). Rapports : `artifacts/qa/rc08/campagne/` ; tableau produit par `python3 tools/rc08-synthese.py
artifacts/qa/rc08/campagne`. **Tout est vert au premier passage, 0 erreur console.**

| Campagne | Résultat | Détail |
|---|---|---|
| qa:browser (duels par l’interface) | **5/5** | desktop-1280-drag : ended tour 13, vues 54/0 écarts, console 0 ; desktop-1920-click : ended tour 14, vues 57/0 écarts, console 0 ; desktop-1280-keyboard : ended tour 10, vues 37/0 écarts, console 0 ; mobile-390-touch : ended tour 19, vues 68/0 écarts, console 0 ; mobile-rotation-touch : ended tour 16, vues 56/0 écarts, console 0 |
| qa:product (parcours de joueur) | **9/9 parcours, 71/71 contrôles, console 0** | A-nouveau-joueur-1280-clic : 11/11 ; B-1920-glisser-abandon : 4/4 ; C-deck-illegal-refuse : 5/5 ; D-sauvegarde-illisible : 6/6 ; E-serie-complete-1280 : 22/22 ; F-reprise-en-plein-duel : 10/10 ; G-migration-v1-reelle : 4/4 ; H-reprise-alteree-refusee : 3/3 ; I-duel-de-la-ville-1280 : 6/6 |
| qa:rc (lieu par défaut) | **9/9 campagnes, 47/47 contrôles** | I-sans-webgl : 5/5 ; J-longevite-12-duels : 7/7 ; K-moteur-independant-des-animations : 3/3 ; L-mode-demo-reversible : 5/5 ; M-stockage-refuse : 3/3 ; N-recommencer-effacer-confirmes : 5/5 ; S-contraste-ecrans : 11/11 ; T-clavier-seul : 6/6 ; P-cout-cpu-ecrans : 2/2 — contraste (minimum par écran) : accueil vide 9.6:1, nouveau duelliste 7.1:1, rencontres 7.6:1, deck 7.4:1, collection 9.2:1, préparation 7.4:1, menu du duel 9.1:1, options (duel) 9.1:1, résultat 7.1:1, accueil avec sauvegarde 9.7:1, aide 11:1 |
| qa:rc (venue=bar) | **9/9 campagnes, 47/47 contrôles** | I-sans-webgl : 5/5 ; J-longevite-12-duels : 7/7 ; K-moteur-independant-des-animations : 3/3 ; L-mode-demo-reversible : 5/5 ; M-stockage-refuse : 3/3 ; N-recommencer-effacer-confirmes : 5/5 ; S-contraste-ecrans : 11/11 ; T-clavier-seul : 6/6 ; P-cout-cpu-ecrans : 2/2 — contraste (minimum par écran) : accueil vide 9.6:1, nouveau duelliste 7.1:1, rencontres 7.6:1, deck 7.4:1, collection 9:1, préparation 7.4:1, menu du duel 9.1:1, options (duel) 9.1:1, résultat 7.1:1, accueil avec sauvegarde 9.8:1, aide 11:1 |
| qa:rc (venue=arene) | **9/9 campagnes, 47/47 contrôles** | I-sans-webgl : 5/5 ; J-longevite-12-duels : 7/7 ; K-moteur-independant-des-animations : 3/3 ; L-mode-demo-reversible : 5/5 ; M-stockage-refuse : 3/3 ; N-recommencer-effacer-confirmes : 5/5 ; S-contraste-ecrans : 11/11 ; T-clavier-seul : 6/6 ; P-cout-cpu-ecrans : 2/2 — contraste (minimum par écran) : accueil vide 9.6:1, nouveau duelliste 7.1:1, rencontres 7.6:1, deck 7.3:1, collection 9.4:1, préparation 7.4:1, menu du duel 9.1:1, options (duel) 9.1:1, résultat 7.1:1, accueil avec sauvegarde 9.8:1, aide 11:1 |
| qa:techniques (Rupture, Dissipation, effet camouflé) | **8/8** | rupture souris-1280 : OK ; rupture tactile-390 : OK ; rupture-cachee souris-1280 : OK ; rupture-cachee tactile-390 : OK ; dissipation souris-1280 : OK ; dissipation tactile-390 : OK ; masque souris-1280 : OK ; masque tactile-390 : OK |

Durées (SwiftShader) : `qa:browser` 21 min 41 s, `qa:product` 43 min 6 s, `qa:rc` 14 min 23 s / 13 min 8 s / 13 min 55 s
(salle, bar, arène), `qa:techniques` 5 min 20 s. Contraste : minimum de chaque écran ≥ 7,1:1 (seuil 4,5:1), dans les
trois lieux. Les campagnes `qa:rc` du bar et de l'arène (`LQV_QA_QUERY=venue=…`) couvrent les décors de C2 avec les mêmes
contrôles que la salle. Après la campagne, le seul code ajouté (`e934f7a` : troisième îlot de la ville, aide de la ville
en démo, raccourcis de la ville en pause) ne touche que `?demo=1` et `?ville=1` ; le rendu par défaut du build final
est reprouvé identique au pixel près au départ (§3.2).

### 3.1 Porte de démarrage
`npm run typecheck` 0 erreur · `npm test` **240/240** au build de la campagne (`6b67271`), **241/241** au build final (`e934f7a`, trois passages ; un premier passage isolé à 240/241 juste après un parcours navigateur, test en échec non relevé : les longs tests de propriété du moteur dépassent le délai de vitest sous charge, constat de la passe 41) · `npm run build` OK.

### 3.2 Rendu par défaut identique au pixel près

| Contrôle (SwiftShader) | Avant → après | Résultat |
|---|---|---|
| `l5-identique` : scène 3D seule des quatre rivaux, duel complet contre Maëlle (HUD, portrait du joueur), écran Rencontres ; 1280×720 et 1920×1080 | `4a30504` → `0f8c20a` (retrait du V1) | **0 pixel** sur 12 captures ; témoin `pose=surprised` 53 463 / 118 001 pixels (`artifacts/qa/rc08/v1-retire-l5-identique.json`) |
| `c1-identique` : parcours produit (préparation des quatre rivaux pris tout prêts, scène du duel, duel complet) | `4a30504` → build de l'arbre de travail (V1 retiré + préchauffage étalé) | **0 pixel** sur la scène et les préparations aux deux tailles ; duel complet 1920 : 0 ; duel complet 1280 : **un passage à 11 263 pixels (max 18/255, zone de la main)**, puis **0 pixel** au passage de contrôle (bruit avant/avant compris) sur machine moins chargée (`v1-retire-c1-identique.log`) |
| `l5-identique` | `4a30504` → `66b7997` (avec la ville, inactive) | **0 pixel** partout sauf Rencontres 1280 : 37 pixels (max 17/255) **par intermittence** (voir ci-dessous) |
| `l5-identique` (**build final**, après la campagne) | `4a30504` → `e934f7a` (trois îlots, démo, aide de la ville en démo) | **0 pixel** sur 11 captures sur 12 ; témoins 53 463 / 118 001 pixels ; Rencontres 1920 : **157 pixels (max 18/255) au passage unique** (`artifacts/qa/rc08/final-l5-identique.json`) |
| `c1-identique` 1280×720 (**build final**) : préparations des quatre rivaux pris tout prêts, scène du duel, duel complet | `4a30504` → `e934f7a` | **0 pixel** partout ; bruit avant/avant du duel complet 20 187 pixels (max 6/255, zone de la main) ; témoin 25 440 pixels (`artifacts/qa/rc08/final-c1-identique.json`) |
| `rc08-rencontres-transitoire` (nouvel outil) : écran Rencontres 1920×1080 répété, avant/après et après/après (A/A), attente 1,2 s et 5 s | `4a30504` → `e934f7a`, machine calme | **0 pixel sur 6 comparaisons avant/après et 6 A/A** (`artifacts/qa/rc08/final-rencontres-transitoire.json`) |

**Écart intermittent de l'écran Rencontres (1280×720 puis 1920×1080), analysé** : bande de 223 × 15 px en haut de la première affiche
(Kaï). Captures répétées : ancien build 11/11 identiques ; nouveau build identique dans 7 cas sur 13 tant qu'un
autre parcours SwiftShader saturait le processeur, puis **6/6 identiques** sur machine calme (3,5 s comme 1,2 s
d'attente). Cause **non établie** ; deux hypothèses : (a) le préchauffage des portraits, désormais un par temps mort,
se termine plus tard quand les temps morts manquent (rendu logiciel saturé) ; (b) une transition d'affiche (survol,
`transform` 0,35 s) prise en cours d'image quand les images sont rares. **État final identique** ; état transitoire
observé seulement sous forte charge. Au build final, machine calme, il est réapparu **une fois** en 1920 (157 pixels, `l5-identique` exécuté seul) puis **jamais** en six captures répétées de chaque build, à 1,2 s comme à 5 s d'attente : état transitoire, **état final identique**. À revérifier sur le poste du responsable (GPU réel, temps morts abondants).

### 3.3 Contraste du rang « II » (`tools/rc08-contraste-rang.mjs`)
Quatre mesures, 1280×720 et 1920×1080, 32 chiffres de rang : méthode `qa-rc` (médiane de la boîte, glyphe compris) ;
**fond seul** (glyphe masqué : pire cas indépendant de l'épaisseur du glyphe) ; **boîte élargie de 3 px** (marge pour
les métriques de la vraie police Georgia sous Windows, où la boîte du chiffre chevauchait le liseré orange de la
carte : 3,5:1 mesuré sur le poste du responsable) ; glyphe réel (95e centile).

| Mesure (minimum sur les vignettes actives) | Avant | Après |
|---|---|---|
| « II », fond seul | 14,3:1 | **19,2:1** |
| « II », boîte élargie | 13,1:1 | **18,6:1** |
| tous rangs, méthode `qa-rc` | 12,4:1 | **18,9:1** |

Les vignettes **verrouillées** (désactivées, volontairement éteintes) restent à 2,6:1, hors seuil comme dans `qa-rc`.
Sous Windows : **à vérifier sur le poste du responsable** (non faisable ici). Captures : `screenshots/qa/rc08/deck-rang-avant-apres.png`.

## 4. Secrets et équité
Aucune modification des surfaces publiques, de l'IA (hors profils PNJ déjà livrés) ni de la visibilité ; tests de
non-fuite inclus dans `npm test` (241/241 au build final).

## 5. Performance (SwiftShader : ordres de grandeur entre builds, jamais une mesure de GPU)

### 5.1 Bundle
| Build | `index-*.js` brut | gzip |
|---|---|---|
| `4a30504` (départ) | 1 009 852 o | 297,4 Ko |
| `0f8c20a` (V1 retiré) | 993 217 o | 292,4 Ko |
| `66b7997` (ville incluse, chargée à la demande) | 997 750 o | 294,6 Ko |
| `6b67271` (build de la campagne : deux îlots, démo, préparations) | 998 831 o | 294,8 Ko |
| `e934f7a` (build final : trois îlots, aide de la ville en démo) | 999 378 o | 295,1 Ko |

La ville vit dans des fichiers séparés (au build final `e934f7a` : `ville-*.js` 70 Ko, `demo-*.js` 12,8 Ko, `labo-*.js` 2,5 Ko), jamais chargés par le
jeu par défaut ; le bundle principal ne prend que les classes de Three.js partagées (+3,6 Ko, ramené de +12,3 Ko en
retirant de la ville le tube, la courbe, le cône, les sprites et le lanceur de rayons).

### 5.2 Démarrage à froid (`tools/rc08-demarrage.mjs`, `tools/rc08-profil-demarrage.mjs`)
Profil processeur jusqu'à l'accueil interactif (`artifacts/qa/rc08/profil-demarrage.json`, build `38b32a8`, ≈ 22 s
d'échantillons) :
- **≈ 9,4 s** : liaison des **51 programmes WebGL** au premier rendu de l'arène (`getUniforms` → `onFirstUse`), propre
  au rendu logiciel (pas de compilation parallèle : `KHR_parallel_shader_compile` absent ici) ;
- **≈ 7,7 s** : préchauffage des neuf portraits d'affiches, une seule tâche **forcée** par le délai de 2 s de
  `requestIdleCallback` pendant le démarrage : l'accueil n'était peint qu'après ;
- ≈ 2,3 s : couches V2 du premier rival (création de l'arène) ; ≈ 1,2 s : redimensionnement initial.

**Correctif** (`42f4562`) : préchauffage **un portrait par temps mort, à partir de la première image peinte**. Écart
DOMContentLoaded → accueil peint : **≈ 6,2 s → ≈ 0,15 à 1,1 s** (trois rondes de chaque côté, SwiftShader). Les valeurs
absolues (DOMContentLoaded 11 à 19 s) dépendent de la charge du conteneur. Sur GPU réel, l'effet attendu est la
disparition d'une tâche longue de l'ordre de 9 × 20 ms au démarrage : **à mesurer sur le poste du responsable**.

### 5.3 Découpage du bundle : non fait
L'accueil montre la scène 3D (ADR 020) : Three.js est nécessaire avant la première image, un fichier séparé ne la
rapproche pas. L'analyse et l'exécution du script ne pèsent presque rien dans le profil (la liaison des programmes et
la peinture des portraits dominent). Aucun gain mesurable ici, donc pas de découpage (règle du brief). Proposition
pour le GPU réel : compiler les programmes de l'arène avec `renderer.compileAsync` (Three r180) quand
`KHR_parallel_shader_compile` est présent, pour peindre l'accueil DOM pendant la compilation. **À mesurer en local
avant décision** (ADR 019 : rien ne change à l'image une fois compilé).

### 5.4 Mesures GPU réelles et contraste sous Windows
**Non faisables dans le cloud.** À faire sur le poste du responsable (Radeon 780M et RTX 4060) :
`LQV_GPU=1 CHROMIUM_PATH=<Chrome> node tools/rc08-demarrage.mjs`, `npm run perf:play`, `qa:rc` (S, contraste),
`node tools/rc08-contraste-rang.mjs`, et `node tools/m09-labo.mjs` pour la ville.

## 6. Parcours « nouveau joueur » (`tools/rc08-parcours.mjs`)
Accueil → nouvelle partie → rencontres → deck → collection → préparation → duel (tour guidé) → menu → abandon confirmé
→ résultat → accueil : **aucune erreur console** ; captures `screenshots/qa/rc08/parcours/`. Constat : sous SwiftShader,
la page ne produit qu'≈ 0,5 image/s derrière les menus pendant qu'un autre parcours tourne : les entrées animées
n'ont pas démarré à 1,5 s, d'où des captures sombres. C'est un artefact du rendu logiciel (165 Hz mesurés sur GPU réel,
passe 11), pas une friction du jeu. Aucune petite friction de texte ou d'ordre relevée ; la grosse friction pour une
démo est l'absence de ville entre les duels : c'est l'objet de M09 (démo `?demo=1`, voir `docs/M09_CADRAGE_VILLE.md`).

## 7. Défauts trouvés et corrigés pendant C5

| Défaut | Trouvé par | Correctif |
|---|---|---|
| Accueil peint après le préchauffage forcé des neuf portraits | profil du démarrage | un portrait par temps mort après la première image (`42f4562`) |
| Rang « II » à 3,5:1 sous Windows | poste du responsable (4b) | pastille sombre du chiffre (`38b32a8`) |
| Outils de QA : délai de navigation de 10 à 20 s trop court pour un chargement à froid de ce conteneur | campagne C5 | `LQV_QA_NAV_TIMEOUT` (défaut inchangé) |

## 8. Connu / à faire

| Sujet | État | Suite |
|---|---|---|
| Mesures GPU (780M, RTX 4060), contraste sous Windows | non faisables dans le cloud | poste du responsable (§5.4) |
| Liaison des programmes WebGL au premier rendu | ≈ 9 s en SwiftShader ; inconnu sur GPU (cache de shaders de Chrome) | `compileAsync` si gain mesuré en local |
| État transitoire de l'écran Rencontres sous forte charge | analysé (§3.2) | revérifier sur GPU réel |
| Ville et démo | prototype derrière `?demo=1` | fiche d'arbitrages M09 |

## 9. Arbitrages restants
Voir `docs/FICHE_ARBITRAGES_M09.md`, sections C (RC), D (préparé derrière un paramètre) et E (à relancer en local).

## Annexe — la ville (M09) dans le même build
Démo `?demo=1` : `tools/m09-demo.mjs` **24/24** au build de la campagne, **30/30** au build final `e934f7a` (trois îlots : le Quai, le Parvis, les Ruelles), 0 erreur console ; laboratoire : 45 appels de dessin, 6,9 k triangles,
36 textures, 18 programmes, 11 lumières, construction de l'îlot ≈ 0,25 s (SwiftShader) ; détails dans le journal
(passe 42), `docs/DEMO_JOUABLE.md`, `docs/M09_CADRAGE_VILLE.md`, ADR 024 et 025.
