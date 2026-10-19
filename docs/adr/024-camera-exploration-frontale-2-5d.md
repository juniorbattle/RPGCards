# ADR 024 — Caméra d'exploration de la ville : frontale 2.5D (M09)

Date : 2026-10-19
Statut : **APPROUVÉ — frontale 2.5D**, décision du responsable pendant le run cloud (« Non, on ne veut pas
d'inclinaison, mais frontale. », JOURNAL passe 39, `demandes-images/README.md`). La vue de dessus inclinée est
abandonnée. Les réglages chiffrés ci-dessous (angle, distance, focale) sont des **choix provisoires de la session
cloud**, à revoir sur GPU réel et à l'œil du responsable ; seul le principe « frontale » est décidé.

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

- **Caméra suiveuse frontale unique** (`src/ville/cameras.ts`, `RIGS.frontale`) : depuis l'eau vers les façades,
  inclinaison **13°** sous l'horizontale, distance **14 m** au point visé, focale verticale **30°**, point visé à
  **1,9 m** du sol (le bord du quai et l'eau restent en premier plan), suivi du personnage en x (amorti, constante 0,32 s), presque fixe en profondeur (15 % du
  déplacement en z), bornée aux limites de l'îlot (x ∈ [−12,5, 12,5]). Les personnages restent verticaux (aucune
  inclinaison des panneaux).
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
