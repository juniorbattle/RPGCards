# Jalon de QA 2026-10 : tout le jeu sur GPU réel

Sur `main` au code de `fbb41a2` (passe 175 ; depuis, seuls les outils de QA et les documents ont changé), 2026-11-01. Radeon 780M
(adaptateur par défaut) et RTX 4060 (`--force_high_performance_gpu`), poste Ryzen 7 8845HS, 31 Go, Chrome 156, sur secteur, écran
165 Hz. Outil : `tools/jalon-2026-10.sh`, une campagne à la fois, ports de `vite preview` vérifiés libres avant chaque série.

**Bilan : tout est vert sur les deux GPU, aux deux tailles. Aucun défaut du jeu bloquant, aucune correction du jeu : seuls des
outils de QA ont été corrigés. Une régression légère est mesurée sur la fluidité du duel (§ 3.5).** Le son, la musique et le rendu
des scènes restent à juger à l'oreille et à l'œil par le responsable.

## 1. Rendu réel

Chaque journal de `rendu/` et 36 rapports de `parcours/` nomment **ANGLE AMD Radeon 780M** ou **ANGLE NVIDIA RTX 4060 Laptop**.
Dans la série principale, 22 rapports de parcours, `qa-browser`, `qa-product`, `qa-techniques` et `m12-activations` ne notaient pas
leur rendu : chacun de ces outils a été relancé une fois par GPU en 1280 × 720 (`rendu/`, code 0, mêmes résultats), et
`launch()` écrit désormais le rendu réel dans chaque journal et refuse le repli logiciel quand `LQV_GPU=1`. `qa-rc` affichait
« SwiftShader » : libellé figé et faux, corrigé ; il tournait bien sur le GPU, sauf son contrôle J de longévité, qui lance exprès
un navigateur logiciel à part pour accéder au ramasse-miettes.

## 2. Résultats

| Parcours | Radeon 780M, 1280 · 1920 | RTX 4060, 1280 · 1920 |
|---|---|---|
| Démo (`qa:demo`) | 30/30 · 30/30 | 30/30 · 30/30 |
| Aventure (`qa:aventure`) | 48/48 · 48/48 | 48/48 · 48/48 |
| Maison (`qa:maison`) | 29/29 · 29/29 | 29/29 · 29/29 |
| Voies (`qa:voies`) | 62/62 · 62/62 | 62/62 · 62/62 |
| Ville vivante (`qa:vivante`) | 35/35 · 35/35 | 35/35 · 35/35 |
| Rencontres en vue (`qa:vue`) | 29/29 · 29/29 | 29/29 · 29/29 |
| `qa:vue` **sans mouvement réduit** (marche réelle des guetteurs et de Kaï) | 29/29 · 29/29 | 29/29 · 29/29 |
| Championnat (`qa:championnat`) | 13/13 · 13/13 | 13/13 · 13/13 |
| Annonce V3.3 | 10/10 · 10/10 | 10/10 · 10/10 |
| Révision V3.3 | 8/8 · 8/8 | 8/8 · 8/8 |
| Cinématiques | 42/42 · 42/42 | 42/42 · 42/42 |
| Nouveau joueur | 0 échec · 0 échec | 0 échec · 0 échec |
| **Prologue au titre, une seule aventure dans une seule page** | 66/66 (1280) | 66/66 (1280) |
| Accessoires (`qa:accessoires`) | console vide | console vide |
| Temps forts (`m12-activations`) | 30/30 | 30/30 |
| Marche de profil | 34 personnages, 34 cycles | 34 personnages, 34 cycles |
| Apparence | 9/9 | 9/9 |
| Laboratoire de musique | 14/14 | 14/14 |
| Musique dans le jeu | 21/21 | 21/21 |
| `qa:browser` | 5 duels complets, 0 fuite | 5 duels complets, 0 fuite |
| `qa:product` | 9 parcours, 67/67 | 9 parcours, 67/67 |
| `qa:rc` salle, bar, arène | 9/9 · 9/9 · 9/9 | 9/9 · 9/9 · 9/9 |
| `qa:techniques` | 8/8 | 8/8 |
| Contre-épreuve des secrets | 4/4 | 4/4 |

Consoles vides partout. `npm test` : 760/760, dont `test/m10f.test.ts` (prologue au titre dans Node, quatre familles, K1 à K6).

**Jeu par défaut au repos, pixel près** (`tools/l5-identique.mjs`, scène des quatre rivaux, duel complet, Rencontres, deux tailles) :
**référence retenue `40dfe36`** (passe 161, celle de la passe 162 : dernière du jeu tel qu'il est, cartes de M12 et couleurs de
l'ADR 046 comprises) : **identique** sur la 780M ; sur la RTX, 1 pixel d'un niveau au premier passage, non reproduit en trois
relances (0 pixel). Témoin vu partout. **Contre la passe 140 (`52c44b5`), `?cartes=v1` :** environ 13 000 pixels d'écart, voulus et
expliqués : `f392d90` (M12 en `?cartes=v1`, juste avant l'ADR 046) est identique à la passe 140, donc l'écart vient des couleurs de
l'Astre (ADR 046) ; de `43a4ef5` à aujourd'hui, seul l'écran Rencontres diffère (120 pixels, entre `43a4ef5` et `40dfe36`, après
lequel plus rien ne bouge).

## 3. Coûts mesurés

### 3.1 Ville à la fréquence de l'écran, relief et vue compris

Six îlots, 4 s de marche, médiane / p95 / max entre images. Aucune image au-delà de 33 ms.

| | 1280 × 720 | 1920 × 1080 |
|---|---|---|
| 780M | 6,1 / 6,1 à 6,2 / 8,6 ms au plus | 6,1 / 6,2 à 12,2 / 18,2 ms au plus |
| RTX | 6,1 / 6,2 / 7,1 ms au plus | 6,1 / 6,2 / 6,7 ms au plus |

Comme à la passe 140 (161 à 242 appels de dessin, inchangés) : les six îlots tiennent la fréquence de l'écran sur la RTX ; en 1920
sur la 780M, une image sautée par moments à 165 Hz, avec ou sans relief, toujours au-delà de 60 images par seconde.

### 3.2 Coût du relief (`?relief=1` contre `?relief=0`)

Sans plafond d'images, trois passages alternés par configuration, temps moyen entre images (médiane des trois), écart du relief :

| Îlot | 780M 1280 | 780M 1920 | RTX 1280 | RTX 1920 |
|---|---|---|---|---|
| Quai | +0,54 ms (4,68) | +2,10 ms (9,98) | −0,05 ms (1,08) | +0,13 ms (1,87) |
| Parvis | +0,37 ms (4,46) | +2,15 ms (9,90) | +0,01 ms (1,14) | +0,09 ms (1,78) |
| Ruelles | +0,45 ms (4,49) | +2,43 ms (10,23) | −0,02 ms (0,96) | +0,14 ms (1,80) |
| Grande Cour | +0,21 ms (3,69) | +1,35 ms (7,80) | 0,00 ms (0,75) | +0,05 ms (1,40) |
| Place du Fanal | +0,45 ms (4,21) | +1,16 ms (8,32) | −0,02 ms (0,80) | +0,09 ms (1,56) |
| Ville haute | +0,02 ms (4,07) | +0,71 ms (8,00) | −0,04 ms (0,85) | +0,09 ms (1,63) |

Le relief ne coûte rien de sensible sur la RTX. Sur la 780M en 1920, il prend jusqu'à 2,4 ms (environ 30 %) et laisse encore 98 à
125 images par seconde ; p95 de 15,5 ms au pire, sous les 16,7 ms de 60 images par seconde.

### 3.3 Vérification de la vue à chaque image

`detecter` seul, huit guetteurs, processeur (`tools/jalon-vue-cout.ts`) : **0,7 à 1,3 µs par appel**. En jeu, chapitre III, sans
plafond, sur le Quai où elle tourne bien (780M 1280 : 4,7 ms avec et sans ; RTX 1920 : 1,3 ms avec et sans) : **aucun écart
mesurable**. Limite : dans les cinq autres îlots de cette mesure, l'événement de Kaï était dû et suspend la vérification ; ils ne
prouvent rien, le coût pur en tient lieu.

### 3.4 Musique et chargement

Musique, poste en temps réel, laboratoire, 20 s par version, toutes couches entrées pour les duels (`cout/musique-*.json`, 100 % = un
cœur ; sortie audio coupée, comme toujours en navigateur sans fenêtre) :

| Version | Page, 780M · RTX | Service audio | Trous de lecture | Banque |
|---|---|---|---|---|
| Titre (I-1) | 6,8 · 6,5 % | 0,6 % | 0 | 2,0 s |
| La ville (II-1) | 5,9 · 5,9 % | 0,5 % | 0 | 1,7 s |
| Duel, tension et cuivres (III-1) | 13,3 · 11,5 % | 0,6 % | 0 | 1,8 s |
| Kaï (V-1) | 13,6 · 11,9 % | 0,6 % | 0 | 1,8 s |
| Championnat (VI-1) | 12,5 · 11,4 % | 0,5 % | 0 | 1,8 s |
| **Finale (VI-2), la plus lourde** | **22,2 · 19,3 %** | 0,6 % | **0** | 1,8 s |

La banque est calculée dans le worker, sans bloquer l'image. Rendu hors ligne : ×23 à ×43 pour le titre et la ville, ×12 à ×14 pour
les duels, **×5,7 à ×6,8 pour la Finale**. Avec la musique de la ville jouée (II-1, II-2, II-3 vérifiées) : images inchangées, à la
fréquence de l'écran comme sans plafond. La Finale n'a été mesurée qu'au laboratoire, pas pendant un duel à l'écran.

Chargement, 16 rondes à froid, build de `main` contre passe 140 :

| | 780M | RTX |
|---|---|---|
| Accueil affiché et interactif | 457 ms (450) | 523 ms (517) |
| Première image 3D | 495 ms (504) | 554 ms (540) |
| Clic « Duel ! » jusqu'à la décision | 71 ms (67) | 64 ms (60) |

Fichiers du jeu : 1,88 Mo (1,50 Mo à la passe 140) ; 1,30 Mo transférés (1,13 Mo). Mise en place d'un îlot : 0,8 à 1,2 s, comme à la
passe 140. Mémoire du parcours continu (23 duels) : tas JS de 20 à 135 Mo sans dérive, 65 à 71 textures.

### 3.5 Duel : légère régression, confirmée

`perf:play` (deux duels, 1280 et 1920), le même jour, en alternance, deux passages : **médiane 6,1 ms, inchangée**, mais plus
d'images lentes qu'à la passe 140 (au-delà de 16,7 ms · de 33 ms · maximum) :

| | Passe 140 | `main` |
|---|---|---|
| 780M 1280 | 54 à 62 · 9 à 10 · 97 ms | 111 à 118 · 14 à 18 · 152 ms |
| 780M 1920 | 84 à 109 · 1 à 3 · 48 ms | 150 à 157 · 5 à 6 · 48 ms |
| RTX 1280 | 71 à 78 · 10 à 11 · 97 ms | 112 à 117 · 17 à 18 · 139 ms |
| RTX 1920 | 76 à 82 · 1 à 2 · 43 ms | 119 à 132 · 10 à 13 · 55 ms |

Sur 14 000 images environ, soit 1 % au plus. Trace (`cout/trace-duel-rtx.json`) : l'excès est dans la vue du plateau (27 à 39 images
lentes, 77 à 83 maintenant), **pas sur le fil principal** (0 à 6 longues images d'animation) ; le coût d'une commande passe de
5,6 à 6,6 ms environ sur le fil principal (+0,7 à 0,9 ms en médiane) ; les plus gros à-coups viennent du GPU (Skia, compositeur) ; avec le pilote
léger de la trace, le pic de 139 ms n'apparaît pas (85 ms au plus), il dépend en partie du sondage du pilote de QA. Cause exacte
non isolée : à regarder avec l'allègement prévu à la fin, pas de correction évidente et petite.

## 4. Outils corrigés (aucun code du jeu)

- `m11-cinematiques.mjs` : deux contrôles comptés en images, faux à 165 Hz (3 images = 18 ms) : le travelling est attendu, la marche
  dure 300 ms de plus.
- `qa-rc.mjs`, contraste : sous Windows, les étiquettes R et P de l'éditeur de deck (7,7 px, poids 800) couvrent plus de la moitié
  de leur cadre et la médiane tombait sur la lettre (3,2:1 relevé, **12 à 16:1 réels** contre le fond, `campagne/contraste-deck-diagnostic.json`).
  Pour un cadre de 10 px de haut au plus, le fond se lit désormais dans les 40 % de pixels les plus loin de la couleur du texte.
  Libellé « SwiftShader » corrigé.
- `browser.mjs` : `launch()` écrit le rendu réel et refuse le repli logiciel en `LQV_GPU=1`.
- Ajouts : `jalon-2026-10.sh`, `jalon-musique-cout.mjs`, `jalon-vue-cout.ts` ; `LQV_VUE_MOUVEMENT` (`m11-vue`), `LQV_VOIES_TITRE`
  (`m10d-voies`), `LQV_PERF_QUERY`, `LQV_PERF_DEPART` (`m10f-perf-ville`), `LQV_AVANT_QUERY` (`l5-identique`).

## 5. Limites

- Le parcours continu du prologue au titre tourne sans `?vue=1` ni cinématiques (les parcours automatisés en seraient interrompus) :
  ces deux systèmes sont couverts à part, K1 à K6 dans Node. Il ne tourne qu'en 1280, et ses duels sont conclus par issue imposée,
  sauf celui de Lior joué jusqu'au bout.
- 7,7 px est une très petite taille de texte : le contraste est bon, la lisibilité de ces étiquettes dans l'éditeur se juge à l'œil.
- Les captures sont hors du dépôt (`artifacts/qa/tmp/`), les journaux bruts aussi (`*.log` ignoré par git) ; les rapports JSON sont
  suivis.
