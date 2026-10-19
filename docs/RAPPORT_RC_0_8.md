# Rapport RC 0.8 — Release candidate du combat (M08, lot C5) : 0.8.0-rc.1

Mission : `docs/missions/M08_CONSOLIDATION_DU_COMBAT.md` (lot C5) et `docs/missions/BRIEF_SESSION_CLOUD_2026-10-19.md`
(phase 1). Exécution : **session cloud autonome du 2026-10-19**, sans le responsable, développement directement sur
`main`. Build de la RC : **`66b7997`** (version `0.8.0-rc.1`), qui contient aussi le prototype de la ville (M09),
**inactif** dans le jeu par défaut (chargé seulement avec `?ville=1` ou `?demo=1`). Toutes les preuves ont été
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
| 6. Campagne de QA complète | voir §3 | |
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

## 3. Campagne de validation (build `66b7997`, `tools/rc08-campagne.sh`)

[À COMPLÉTER APRÈS LA CAMPAGNE]

### 3.1 Porte de démarrage
`npm run typecheck` 0 erreur · `npm test` **235/235** · `npm run build` OK.

### 3.2 Rendu par défaut identique au pixel près

| Contrôle (SwiftShader) | Avant → après | Résultat |
|---|---|---|
| `l5-identique` : scène 3D seule des quatre rivaux, duel complet contre Maëlle (HUD, portrait du joueur), écran Rencontres ; 1280×720 et 1920×1080 | `4a30504` → `0f8c20a` (retrait du V1) | **0 pixel** sur 12 captures ; témoin `pose=surprised` 53 463 / 118 001 pixels (`artifacts/qa/rc08/v1-retire-l5-identique.json`) |
| `c1-identique` : parcours produit (préparation des quatre rivaux pris tout prêts, scène du duel, duel complet) | `4a30504` → build de l'arbre de travail (V1 retiré + préchauffage étalé) | **0 pixel** sur la scène et les préparations aux deux tailles ; duel complet 1920 : 0 ; duel complet 1280 : **un passage à 11 263 pixels (max 18/255, zone de la main)**, puis **0 pixel** au passage de contrôle (bruit avant/avant compris) sur machine moins chargée (`v1-retire-c1-identique.log`) |
| `l5-identique` | `4a30504` → `66b7997` (avec la ville, inactive) | **0 pixel** partout sauf Rencontres 1280 : 37 pixels (max 17/255) **par intermittence** (voir ci-dessous) |

**Écart intermittent de l'écran Rencontres (1280×720), analysé** : bande de 223 × 15 px en haut de la première affiche
(Kaï). Captures répétées : ancien build 11/11 identiques ; nouveau build identique dans 7 cas sur 13 tant qu'un
autre parcours SwiftShader saturait le processeur, puis **6/6 identiques** sur machine calme (3,5 s comme 1,2 s
d'attente). Cause la plus probable : le préchauffage des portraits, désormais un par temps mort, se termine plus tard
quand les temps morts manquent (rendu logiciel saturé) ; l'affiche est alors dans un état intermédiaire au moment de
la capture. **État final identique** ; état transitoire possible seulement sous forte charge. À revérifier sur le
poste du responsable (GPU réel, temps morts abondants).

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
non-fuite inclus dans `npm test` (235/235).

## 5. Performance (SwiftShader : ordres de grandeur entre builds, jamais une mesure de GPU)

### 5.1 Bundle
| Build | `index-*.js` brut | gzip |
|---|---|---|
| `4a30504` (départ) | 1 009 852 o | 297,4 Ko |
| `0f8c20a` (V1 retiré) | 993 217 o | 292,4 Ko |
| `66b7997` (RC, ville incluse mais chargée à la demande) | 997 750 o | 294,6 Ko |

La ville vit dans des fichiers séparés (`ville-*.js` 53 Ko, `demo-*.js` 9,6 Ko, `labo-*.js` 2,3 Ko), jamais chargés par le
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
Voir `docs/FICHE_ARBITRAGES_M09.md`, section C.
