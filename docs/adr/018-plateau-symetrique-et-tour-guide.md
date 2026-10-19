# ADR 018 — Plateau symétrique et tour guidé (M07, lot 2)

Date : 2026-10-17
Statut : **APPROUVÉ par le responsable** pour la direction (séance du 2026-10-17 : symétrie, lisibilité d’un coup d’œil,
tour intuitif ; référence donnée : Yu-Gi-Oh! Duel Links) et pour le **maintien du rival de face**. Le rendu de ce lot
lui est présenté en captures avant / après. **Amende l’ADR 013** (baseline desktop) et l’**ADR 016** (géométrie des cases
en vue A). **Amendement 1** (M08, 2026-10-18, option B validée par le responsable, Primaire plus présente à sa
demande) : rangée du rival « au loin » sur la table, Primaire plus grande que les Secondaires, cases incrustées dans le
bois, cercle de Clash peint recentré sur l’axe du plateau (voir en fin de document).

## Contexte

Retours du responsable après la passe 15 :
1. les cartes posées ne se ressemblent pas d’un camp à l’autre et la **symétrie** manque, alors qu’elle compte dans le
   design : il faut **maximiser la lisibilité en un coup d’œil** ;
2. le jeu doit être **très intuitif** : on ne doit pas se perdre dans les actions à faire pendant les phases du tour ;
3. référence d’ergonomie : *Duel Links* (captures fournies), peu de texte, tout se comprend à l’image ;
4. sur l’idée d’un HUD avec les portraits des deux joueurs dans les coins (comme *Duel Links*), sa décision :
   « perso je veux garder notre adversaire visible comme c'est le cas actuel car cela donne un aspect intéressant à
   notre jeu ».

Avant ce lot (vue A bureau, 1280×720) : rangées de 12,8 vh inclinées à 36°, cartes posées d’environ 76 px de large ;
libellés des cases du rival masqués et ceux du joueur au-dessus des cases ; cases vides en pointillés avec « Vide » ;
nom, variante et un bandeau d’état sur deux lignes (« POSE CACHÉE · NON VERROUILLÉE ») sur chaque carte posée ; consigne
de l’engagement en une phrase longue.

## Décision

### Le rival reste de face

- Le rival reste **frontal et visible** au centre de la scène (ADR 013, 016, 017). On n’adopte **pas** la mise en page de
  *Duel Links* avec portraits dans les coins, ni une vue de plateau sans le rival. On reprend seulement son ergonomie
  du terrain et des actions.

### Plateau en miroir

- Vue A bureau : les deux rangées ont la même hauteur (16 vh) et la même inclinaison (30°), en miroir autour de la ligne
  médiane de la table. Les cartes posées passent d’environ 76 px à 89 px de large à 1280×720 (115 px à 134 px à
  1920×1080). La main passe de 22 vh à 19 vh pour leur laisser la place.
- Mêmes cases pour les deux camps : contour fin et plein ; libellé gravé dans la case (« SECONDAIRE 1 · PRIMAIRE ·
  SECONDAIRE 2 », libellés courts S1 / S2 sur petit écran et pour la rangée lointaine du rival en vue B), visible
  seulement quand la case est vide.
- Aide d’une ligne sous le libellé : « Obligatoire » (Primaire) et « Facultative » (Secondaires) pendant l’engagement,
  « Le rival engage… », « En Clash… », « Défaussée » ; plus de « Vide ».

### Cartes posées lisibles d’un coup d’œil

- Sur la table, une carte montre son **Rang** (grand chiffre romain) et sa **Puissance** en gros, comme l’ATK / DEF de
  *Duel Links* ; son nom et sa variante sont dans le panneau d’infos de gauche (survol, focus).
- **État en un mot**, au même endroit (40 % de la hauteur) pour les deux camps : CHARGEMENT, RÉSERVE, ACTIVE, MASQUÉE,
  CACHÉE, REMPLACE, À RÉVÉLER, VERROUILLÉE, SECRÈTE (Primaire du rival face cachée). Le texte complet reste dans le nom
  accessible de la carte. La Primaire en cours de pose n’a pas de bandeau : son mode se lit sur les puces
  ASSAUT / GARDE.

### Tour guidé

- **Phase en filigrane** sur la ligne médiane de la table (décor, `aria-hidden`) ; la frise de phase et le panneau de
  commandes portent l’information accessible. Ce filigrane est volontairement pâle et exclu des mesures de contraste.
- **Une consigne** par phase, celle de l’étape en cours. L’engagement montre ses **étapes en pictogrammes** (Primaire,
  Mode, Secondaire facultative, Verrouiller) : faites (✓), en cours (dorée, nommée), facultative (pointillés).
- **Ce qu’il faut faire maintenant pulse** en doré : bouton principal de la phase, case Primaire vide, puces de mode
  tant qu’il reste à choisir. Un choix possible mais facultatif (réserve à révéler, Secondaire active sans action)
  porte un liseré vert fixe. Pulsations coupées par `Mvt réduit` et par le rendu figé.
- **Actions sur la carte choisie** (comme « Invoquer / Poser ») : une colonne ASSAUT / GARDE / SECONDAIRE posée sur le
  haut de la carte de main choisie, qui laisse lire sa plaque et ne recouvre aucune case du plateau (ancrage CSS ;
  sans ancrage, en haut de la main). SECONDAIRE est grisé pour une Signature. `Controller.placeSelected` enchaîne les
  actions existantes (`dropCard`, `setStance`) : aucune règle nouvelle. Le glisser-déposer et le clic carte → case
  restent possibles.
- L’action principale reste au même endroit : le panneau de commandes en bas à droite.

## Conséquences

- Moteur (`src/game`), règles V3.0 / V3.2 et visibilité inchangés : aucun texte ne publie plus que la vue du joueur
  (dos et « SECRÈTE » pour la Primaire adverse, « CHARGEMENT » / « MASQUÉE » pour ses Secondaires, comme avant).
- Outil `tools/shots-m07.mjs` : captures avant / après de M07 (vues A et B, tailles au choix) et mesure du contraste de
  chaque texte visible sur la capture (`CONTRAST=…`).
- Les captures antérieures (M03.2, ADR 016, M07 lot 1) montrent l’ancien plateau ; elles restent valables comme
  historique.
- Mobile portrait : mêmes libellés courts et même colonne d’actions (un peu plus bas, sous le panneau de commandes) ;
  puces ASSAUT / GARDE sous la case pour ne pas couvrir les chiffres de la carte. La mise en page mobile reste
  différée (ADR 013).
- Contraste mesuré sur capture après ce lot : vues A et B sans texte sous 4,5:1 (minimum 5,1:1) ; seul reste, sur
  mobile, le chiffre de rang d’une carte de main sur son illustration (même défaut que l’échec « rang II » de
  `qa:rc`, en arbitrage). Rapports `artifacts/qa/m07/contraste-l2-*.json`.

**Cette décision n’introduit aucune règle métier nouvelle.**

## Amendement 1 — M08 : cases intégrées à la table, Primaire plus présente (2026-10-18)

Statut : **APPROUVÉ par le responsable** : « Je valide l’option B (rangée du rival au loin, 0,85×, table recentrée,
cases incrustées et ombre de contact). Implémente-la. », puis, en séance : « parmi les 3 cartes donc primaire et 2
secondaires, la primaire est censée montrer plus de présence que les secondaires sur la table car c’est la carte qui
ira au clash ».

### Contexte

Retour du responsable sur une capture de la vue A à 1280×720 : les cadres de cartes du rival « ne sont pas bien intégrés
à la table et semblent flotter », ceux du joueur « ont l’air d’être bien configurés ». Audit (caméra A inchangée,
projection identique à `frame()` d’`arena.ts`, `screenshots/qa/m08/cadres/proposition/analyse-actuel-1280.png`) :

- entre le bord lointain de la table (y 328) et le centre du cercle de Clash (y 400, z 0,1), le rival n’a que **72 px**
  de table ; sa rangée en faisait 105 (y 341 → 446) : elle couvrait l’étoile du cercle et débordait sur la moitié du
  joueur ; axe de symétrie du plateau à y 455, milieu peint de la table à y 400 ;
- même taille et même inclinaison que la rangée du joueur alors qu’elle est plus loin : une vraie carte couchée ferait
  31 px de haut côté rival, 42 px côté joueur, contre 97 px pour les deux rangées (3,1 fois « debout » contre 2,3) ;
- fuyantes de la table aux colonnes latérales : 31° (rival), 24° (joueur) ; cases : 2,7° (perspective propre à chacune) ;
- haut des cases à 13 px du bord lointain, contre le support de l’éventail ; aucune ombre de contact, voile sombre
  translucide lu comme une vitre.

Quatre options maquettées et présentées (`screenshots/qa/m08/cadres/proposition/planche-options-1280.png`) : A
(ancrage seul), **B** (A + rangée du rival au loin), C (B + fuite douce des cases latérales, joueur compris, texte
cisaillé), témoin B sans table recentrée (l’étoile restait sous la Primaire du rival). Écartée : une perspective commune
exacte qui garde la rangée du joueur, car elle allonge la rangée du rival au lieu de la coucher.

### Décision

1. **Rangée du rival au loin** (vue A bureau) : `top` 45,6 % → 48,25 %, 16 vh → 13 vh, 30° → 34° ; cartes posées à
   0,85 fois celles du joueur (76 px au lieu de 89 à 1280×720, 114 au lieu de 134 à 1920×1080) ; colonnes au même pas
   relatif, donc resserrées (222 → 189 px à 1280) ; ≈ 30 px de bois visibles entre le bord lointain et ses Secondaires.
   Rangée du joueur inchangée. Les deux rangées restent en miroir (mêmes cases, mêmes libellés, même ordre) ; c’est la
   perspective qui réduit la rangée lointaine. Le principe de l’ADR 016 « le cadre est le contour de la carte » est
   gardé.
2. **Primaire plus présente** que les Secondaires dans les deux rangées : 1,12 fois plus grande en vue A bureau (même
   colonne, même bas de case ; joueur 100 px, rival 85 px de large à 1280×720), double filet doré autour du cadre et
   lueur chaude sur le bois, sous la carte posée aussi. Les deux Primaires forment l’axe du Clash au centre de la table.
   Les « six cadres identiques » de l’ADR 016 deviennent deux familles : Primaire et Secondaire.
3. **Cases incrustées dans le bois**, dans la langue de la table : filet doré intérieur, creux sombre au bord lointain,
   lèvre claire au bord proche (au lieu du voile sombre translucide), et **ombre de contact** floue sous chaque case et
   chaque carte posée (`.zone::before`, même perspective que le cadre). Toutes vues. Les états de la case (pose légale,
   cible, temps de résolution, pulsation de l’étape en cours) gardent leurs liserés.
4. **Libellé de case** masqué sous une carte posée (il dépassait d’une carte plus petite) : visible seulement case vide,
   comme l’ADR 018 le voulait.
5. **Table recentrée sur le plateau** : `CLASH_Z` (`src/scene/world.ts`) 0,1 → 1,38 : le cercle de Clash peint, son
   étoile, la flaque de lumière peinte (`CLASH_Z` + 0,5), le vignettage peint de la table, la lumière du Clash (éteinte au
   repos) et les anneaux et gerbes du Clash passent sur l’axe du plateau de la vue A (y ≈ 456 à 1280×720), entre les deux
   rangées. Losanges des zones des duellistes au-delà des rangées (z −1,6 / 3,4 → −2,1 / 4,4). La table elle-même (bord
   lointain, ancrage de la caméra), le gréement de lumières des lieux (ADR 022), la caméra et les décors ne bougent pas.
   La table est commune à tous les lieux : ils reçoivent tous cette peinture.

### Conséquences

- Visage du rival inchangé : matrices de projection, de vue et du rival identiques entre `d018915` et ce lot, région du
  visage de la scène 3D identique au pixel près (`artifacts/qa/m08/cadres/cadrage-visage.json`) ; visage à 83 px à
  1280×720 comme avant.
- Vue B : géométrie des rangées inchangée ; le centre du cercle peint, qui tombait déjà sous le haut de la rangée du
  joueur (y 344 à 1280×720), passe sous son milieu (y 429).
- Textes plus petits sur les cartes du rival (−15 %) et plus grands sur les Primaires (+12 %). Contraste mesuré sur
  capture (`tools/shots-m07.mjs`, 40 captures, 1 470 textes : vues A et B, 1280×720 et 1920×1080, cinq états dont le
  nouvel état « plein ») : **0 sous 4,5:1**, minimum 4,9:1 (A) et 4,8:1 (B) ; `artifacts/qa/m08/cadres/`. L’état « plein »
  a révélé des défauts antérieurs (build `d018915` : bandeaux ASSAUT / GARDE à 3,2–3,6:1, Rang et Puissance de la Primaire
  du rival sous son bandeau à 2,5–2,8:1) : bandeaux assombris (dégradés des boutons de pose), plaque de la Primaire révélée
  remontée au-dessus de son bandeau.
- Le filigrane de phase reste sur l’axe ; les Primaires plus grandes en recouvrent le milieu (décor, `aria-hidden`).
- `tools/shots-m07.mjs` : état `plein` (scénario « interférence », Primaires révélées et Secondaires actives des deux
  côtés). Mobile et paysage : positions inchangées ; seuls l’incrustation, l’ombre de contact et le double filet de la
  Primaire s’y appliquent.

**Cet amendement n’introduit aucune règle métier nouvelle.**
