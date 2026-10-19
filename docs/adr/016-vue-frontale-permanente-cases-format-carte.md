# ADR 016 — Vue frontale permanente et cases au format des cartes

Date : 2026-10-17
Statut : **APPROUVÉ par le responsable** (retours en séance du 2026-10-17 ; choix explicite « Toujours la vue de
face » parmi trois options proposées). **Amende l'ADR 013** sur la caméra pendant la pose et sur le dessin des cases.
**Amendé par l’ADR 018** (M07 lot 2, 2026-10-17) : rangées en miroir de 16 vh à 30° en vue A bureau, main à 19 vh,
cases en contour plein avec libellé gravé dedans ; le principe « cases au format des cartes » est conservé.
**Amendé par l’amendement 1 de l’ADR 018** (M08, 2026-10-18) : rangée du rival à 0,85 fois celle du joueur, plus loin
sur la table, Primaire 1,12 fois plus grande que les Secondaires ; les cadres restent le contour de leur carte.

## Contexte

Retours du responsable sur le duel desktop :
1. le cadre qui indique où poser une carte paraît trop gros par rapport aux cartes, et les cadres n'ont pas les mêmes
   dimensions entre eux ;
2. quand une carte est posée, son cadre devrait disparaître ;
3. les cartes du joueur et du rival doivent être bien alignées et posées sur la table, de façon précise et cadrée ;
4. la caméra qui s'éloigne (vue B inclinée, automatique pendant la préparation et l'engagement) casse l'immersion : il
   faut privilégier la vue proche, face au rival, où l'on voit bien son visage.

État avant cette décision (`main` `68ebe4b`) :
- le cadre était un « sol » en trapèze, de proportions paysage (largeur 1,42 à 1,62 fois la hauteur de case), alors que
  les cartes sont en portrait ; la carte posée dépassait du cadre vers le haut et le cadre restait visible autour d'elle ;
- en vue B, les cases du joueur (≈ 206 px de large à 1280×720) et du rival (≈ 120 px) n'avaient ni la même taille ni
  les mêmes colonnes (pas de 240 px contre 143 px) ;
- en vue A, les deux rangées avaient des colonnes presque parallèles mais des inclinaisons différentes (26° et 32°).

## Décision

1. **Caméra** : la vue A (frontale, proche, visage du rival) est la vue de **toutes les phases**, pose des cartes
   comprise. La vue B inclinée ne s'ouvre **qu'à la demande** (bouton « Vue plateau » ou touche V) et vaut jusqu'au
   changement de phase. Plus aucune bascule automatique : la chorégraphie par phases de M02 §2 (« B pour composer ») est
   remplacée. Le temps d'observation du rival en début de tour devient sans effet (il retardait le passage en B).
2. **Cases** : le cadre est le **contour de la carte** — rectangle de la carte élargi de 6 %, même inclinaison, même
   perspective, même axe de rotation. Une carte posée le recouvre donc exactement. Le cadre **s'efface** quand une carte
   occupe la case ; il ne reparaît, en liseré autour de la carte, que pour signaler une cible (pose légale, survol,
   Dissipation, interférence, Rupture, temps de résolution).
3. **Vue A sur bureau** :
   - les deux rangées ont la **même taille de carte et la même inclinaison** (36°) : six cadres identiques ;
   - **colonnes communes** aux deux rangées (pas de 2,48 largeurs de carte) ;
   - une seule ligne d'étiquettes, entre les rangées : celles du rival chevauchaient ses mains ;
   - ASSAUT / GARDE de part et d'autre de la Primaire, au-dessus de la main et non dessous, la main étant dessinée par-dessus
     le plateau ;
   - rangées posées sur la table, entre son bord lointain et la main.
4. **Pourquoi pas une perspective exacte.** La projection de la caméra A (même calcul que `frame()` de `arena.ts`)
   montre une table vue presque rasante : à 1280×720, une rangée du rival posée à sa vraie profondeur serait 0,64 fois
   plus petite que celle du joueur. Ses cartes tomberaient vers 45 px de large, un recul de lisibilité que l'ADR 013
   interdit sans comparaison et approbation. Des cases identiques, en colonnes alignées, répondent mieux à la demande
   (« précis et cadré », mêmes dimensions).

## Conséquences

- `src/presentation/director.ts` : `naturalView` renvoie toujours `A`.
- La QA attend la vue A dans toutes les phases (`expectedView` de `tools/duel-driver.mjs`). Le contrôle de la bascule
  manuelle par V est inchangé.
- Textes d'aide mis à jour : aide du duel, aide de l'enveloppe, info-bulle du bouton de vue.
- Aide de case : « Nouvelle Secondaire (facultative) » devient « Facultative », car l'étiquette de la case dit déjà
  « Secondaire ».
- Le conseil contextuel (`.tip`, au-dessus du panneau de commande) passe **sous** le plateau. Le menu tactique de la
  Secondaire droite débordait déjà en partie sous lui. Avec les colonnes plus espacées, il le recouvrait au point de
  rendre « Amplifier » et « Interférer » inaccessibles, d'où trois parcours `qa:product` en échec avant ce correctif.
- Mobile (différé, ADR 013) : mêmes cadres au format carte et même vue A permanente ; positions, tailles et étiquettes
  mobiles inchangées. Les parcours mobiles de `qa:browser` restent la référence de non-régression.
- Inchangés : la composition HUD, la présence et le cadrage du rival (vue A identique), le Clash, les règles V3.0/V3.2
  (`src/game` intact) et les secrets. La vue B reste disponible, avec ses positions de M03.2 et les nouveaux cadres.

**Cette décision n'introduit aucune règle métier nouvelle.**
