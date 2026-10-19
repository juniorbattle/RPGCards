# ADR 024 — Caméra d'exploration de la ville : frontale 2.5D (M09)

Date : 2026-10-19
Statut : **APPROUVÉ — frontale 2.5D**, décision du responsable pendant le run cloud (« Non, on ne veut pas
d'inclinaison, mais frontale. », JOURNAL passe 39, `demandes-images/README.md`). La vue de dessus inclinée est
abandonnée. Les réglages chiffrés ci-dessous (angle, distance, focale) sont des **choix provisoires de la session
cloud**, à revoir sur GPU réel et à l'œil du responsable ; seul le principe « frontale » est décidé. **2026-10-19, fiche B1 :** réglages gardés pour la démo, à ajuster à l’œil sur GPU réel (pendant la passe de qualité du Quai).

## Contexte

M09 demandait un laboratoire comparant deux caméras d'exploration sur un îlot « le Quai, la nuit » : vue de dessus
inclinée (≈ 40–55°) et frontale 2.5D (≈ 10–20°), décision au responsable. La DA vient de Cité du Tournoi
(RPG-ArtByCode, commit `0398c4f`, lecture seule), **sans sa caméra** (graphe de cadrages semi-fixes A/B/C/D, interdit
par M09). Références de travail : `reference/generated/2026-10-19-quai-nuit-cameras/` (01 inclinée, 02 frontale).

Le laboratoire a d'abord été construit avec les deux caméras derrière la même interface ; une paire de captures
comparables a été faite (même position devant l'étal, 1280×720, temps figé : `screenshots/qa/m09/v1/essai-vue-inclinee-45-etal-1280x720.png`
et `essai-frontale-12-etal-1280x720.png`) avant que la décision n'arrive par le dépôt. La vue inclinée a ensuite été
retirée du code, comme demandé.

## Décision

- **Caméra suiveuse frontale unique** (`src/ville/cameras.ts`, `RIGS.frontale`) : depuis l'eau (ou le contrebas de la
  balustrade) vers les façades, inclinaison **8°** sous l'horizontale, distance **19 m** au point visé, focale verticale
  **33°**, point visé à **3,6 m** du sol, suivi du personnage en x (amorti, constante 0,32 s), presque fixe en profondeur
  (15 % du déplacement en z), bornée aux limites de chaque îlot (Quai : x ∈ [−11, 11] ; Parvis : [−8, 8]). Les
  personnages restent verticaux (aucune inclinaison des panneaux) et mesurent ≈ 85 px de haut en 1280×720.
- **Historique des réglages pendant le run** (captures `screenshots/qa/m09/`) : 14° à 16 m puis 13° à 14 m (personnages
  plus grands, façades coupées au premier étage, pas d'eau visible) ; retenu **8° à 19 m**, plus proche de la référence
  frontale de travail (`reference/generated/2026-10-19-quai-nuit-cameras/02.png`) : bannières et deux niveaux de
  façades dans le cadre, bord du quai en premier plan, éclairage plus local (lanternes 3,0, rayon 9,5 m ; façades plus
  sombres).
- **Interface `CameraRig`** (`params`, `update(caméra, cible, dt, immédiat)`, `resize`) : la scène, le personnage, les
  bulles et la démo ne dépendent que d'elle ; une variante de cadrage (autre angle, cadrage par zone d'îlot) se branche
  sans réécriture. Fonction de cadrage `framingFor` pure (testée).
- **Plans de profondeur** de la frontale : premier plan (bord du quai, bornes, lampadaires, mâts des bateaux), rue
  jouable, façades, ville haute et beffroi noyés dans la brume (brume exponentielle en hauteur de Cité du Tournoi,
  forme close, résolue vers le ciel). Flou de bascule discret au-dessus et au-dessous de la bande du personnage
  (passe de finition), halo des lanternes à demi-définition.
- **Pas de rotation de caméra** par le joueur ; déplacement en x et z sur le plan de la rue (clavier, clic au sol).

## Conséquences

- Les personnages sont vus de face et en pied, à une échelle proche de celle du duel : continuité visuelle avec les
  lieux de duel (ADR 022) et lisibilité des visages V2 en dialogue (portraits de la boîte de dialogue).
- La profondeur de la rue (≈ 6,4 m) se lit moins qu'en vue inclinée : la rue reste étroite, les zones d'interaction
  ont des bulles, et la caméra suit peu en z pour garder les façades stables.
- Le premier plan peut masquer le personnage (lampadaires, mâts) : à surveiller ; la révélation par découpe de Cité
  du Tournoi (`src/app/Occlusion.ts`, ellipse tramée sur un petit ensemble d'occulteurs mesurés) est la technique à
  adapter si besoin.
- Les références d'images demandées pendant le run (façades en vue inclinée) restent des références d'ambiance ; les
  prochaines doivent être cadrées en frontale.

## Mesures (SwiftShader, processeur, non représentatives d'un GPU)

Voir `artifacts/qa/m09/v1-labo.json` et `docs/RAPPORT_RC_0_8.md` (annexe M09) : appels de dessin, triangles,
textures, programmes, temps de construction de l'îlot. Mesure GPU réelle (Radeon 780M, RTX 4060) **à faire sur le
poste du responsable** (`LQV_GPU=1 CHROMIUM_PATH=… node tools/m09-labo.mjs`).

## Amendement 1 — cadrage du Quai retravaillé (M09 V3, passe 45) — **APPROUVÉ avec la planche du Quai validée (passe 47), étendu au Parvis et aux Ruelles (passe 49)**

Fiche B1 : « réglages gardés, ajustés à l'œil sur GPU réel, pendant la passe de qualité du Quai ». Constat de départ
(session principale, validé par le responsable) : peu de profondeur, eau à peine visible, personnages petits.

- **Le cadrage devient une donnée de l'îlot** (`IlotDef.rig`, `ilots.ts`) par-dessus `RIGS.frontale`, et **réglable par
  l'URL** pour l'ajuster à l'œil sans reconstruire : `rig=inclinaison,distance,focale,hauteur visée` (`parseRig`, pur et
  testé ; valeurs hors bornes ignorées), dans le laboratoire et la démo. Le Parvis et les Ruelles gardaient le cadrage
  d'origine (8°, 19 m, 33°, 3,6 m) jusqu'à validation ; depuis la passe 49 (« Je valide le Quai de la passe 47 tel que
  sur la planche. Étends-le au Parvis et aux Ruelles. »), les trois îlots ont le cadrage et les personnages du Quai.
- **Quai : 7° sous l'horizontale, 18,5 m, focale verticale 39°, point visé à 3,05 m**, et **personnages de 2,2 m**
  (`IlotDef.walkerH` ; proportions « chibi », portes portées à 2,65 m) : 118 px en 1280 × 720 (99 px avant) et
  177 px en 1920 × 1080 par projection au centre de la rue, l'ordre de grandeur de la frontale approuvée de Cité du
  Tournoi (≈ 150 à 170 px en 1080p).
- **Arbitrage de composition (mesuré par projection, script de session)** : avec une seule caméra perspective, on ne
  peut pas avoir à la fois une large bande d'eau, les toits, la ville haute, le ciel ET de grands personnages ; la
  taille des personnages à l'écran est fixée par le rapport personnage / hauteur des façades. D'où trois choix :
  façades plus basses (égout 5,5 à 6,9 m, l'armateur 8,1 m), personnages plus grands dans le monde, et **ville haute
  sur une colline** (rangs de plus en plus hauts et lointains) pour qu'elle apparaisse au-dessus des toits malgré une
  caméra qui regarde vers le bas, comme dans la référence frontale de travail. Bandes de l'image par projection
  (avant → après) : eau et reflets 0 → 6,8 % (l'eau sortait du cadre), mur du quai 13,3 → 11,6 %, rue 19,1 → 14,5 % ;
  le faîtage des façades du premier rang (9 m) à 11 % du haut de l'image, la ville haute, la lune et le ciel au-dessus.
- **Variantes proposées au responsable** (même build, paramètre d'URL) : plus serrée `rig=6.5,18.5,37,3.2`
  (personnages 125 px, eau 3 %, moins de ciel) ; plus large `rig=7.5,20,38,3` (eau 9,8 % et ses reflets, personnages
  112 px).
- Lune basse propre au Quai (au-dessus de la ville haute, derrière les façades : le contre-jour est gardé), rendue à
  la sortie de l'îlot.

Statut : **proposé** ; le responsable valide ou demande une reprise sur la planche avant / après
(`screenshots/qa/m09/v3/planche-v3-quai.png`). Coût mesuré : JOURNAL passe 45.
