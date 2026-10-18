# ADR 018 — Plateau symétrique et tour guidé (M07, lot 2)

Date : 2026-10-17
Statut : **APPROUVÉ par le responsable** pour la direction (séance du 2026-10-17 : symétrie, lisibilité d’un coup d’œil,
tour intuitif ; référence donnée : Yu-Gi-Oh! Duel Links) et pour le **maintien du rival de face**. Le rendu de ce lot
lui est présenté en captures avant / après. **Amende l’ADR 013** (baseline desktop) et l’**ADR 016** (géométrie des cases
en vue A).

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
