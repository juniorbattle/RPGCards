# ADR 035 — La Garde réduit sans annuler (règle V3.3, avenant 07)

**Date :** 2026-10-24. **Statut : APPLIQUÉ** (passe 107). Texte de règle : `contracts/07_AVENANT_V3_3_GARDE.md`, révision 2
**validée par le responsable** le 2026-10-24 (« Révision 2 de l'avenant 07 validée telle quelle, à verser et appliquer. »).

## Contexte

Le responsable a décidé le 2026-10-24 de changer la règle Assaut contre Garde : « la garde réduit les dégâts sans les
annuler si son rang n'est pas supérieur à l'assaut ». Aujourd'hui, l'Assaut qui gagne la priorité inflige
`max(0, P_Assaut − P_Garde) × M` (`src/game/engine/clash.ts`, branche A/G) : une Garde de même Puissance ou plus
puissante annule tout, même dominée au Rang, même par une Signature P12. Révision 1 : `max(0, P_A − ⌈P_G / 2⌉) × M`.
Correction du responsable : la priorité actuelle est préservée (option A : les soutiens de Rang peuvent faire vaincre une
Garde de Rang imprimé supérieur ; la Garde gagne l'égalité) et « tout Assaut victorieux inflige au minimum 1 dégât de
base avant le multiplicateur ». Objectif : des duels plus dynamiques et moins longs, sans sacrifier la profondeur
tactique du Rang, des Secondaires et de la Garde.

## Décision proposée

1. **Règle** : seulement quand l'Assaut gagne la priorité, `absorptionEffective = min(⌈P_Garde / 2⌉, P_Assaut − 1)` et
   `dégâts de base = (P_Assaut − absorptionEffective) × M`. Plus de victoire au Rang sans blessure.
2. **Une seule arithmétique** : `guardAbsorption(pAssaut, pGarde)` et `guardHalf(pGarde)` exportées de `clash.ts` ; `guardAbsorption` est utilisée par `computeClash`
   (dégâts de base et champ `absorbed`) ; le rapport, le journal, les temps forts et l'animation lisent `absorbed`, jamais
   une formule recopiée (principe « une seule arithmétique », JOURNAL). L'aide du tour guidé, qui annonce l'absorption
   avant de connaître l'Assaut adverse, appelle la même fonction pour la moitié (« absorbe jusqu'à ⌈P/2⌉, au moins 1
   dégât passe »). L'IA et la prévisualisation passent déjà par `computeClash`.
3. **`zeroDamageRankWin` garde sa place dans le rapport** (même forme, même expression) mais n'a plus de cas : un test
   d'invariant vérifie qu'il ne devient jamais vrai ; la chorégraphie « la Garde absorbe tout » et son message ne
   s'affichent plus.
4. **Étiquette des règles** `V3.0+delta-V3.3` (état du moteur, `RULES` de la reprise) ; format `lqv-replay/1` et
   identifiant de catalogue inchangés. Un duel en cours sauvegardé sous l'ancienne règle est refusé à la reprise avec sa
   raison ; le reste de la sauvegarde est gardé. Pas de double formule dans le moteur.
5. **Preuve des empreintes en deux temps** (formule seule, puis étiquette) : on ne régénère que ce que la règle explique.
6. **Textes** : journal du Clash, temps forts, mise en scène (`clashMotion`, « ABSORBE n »), tour guidé et boutons du
   plateau, aide, conseils (le conseil « Pourquoi 0 dégât ? » n'a plus de cas), scénario de QA `clash-ag` (main gardée : sa
   démonstration « victoire au Rang, 0 blessure » devient « la Garde absorbe 6, 3 blessures » ; les outils de captures
   `clash-shots`, `shots-m03-2` et `perf` le disent ; le cas plafonné, « absorbe 5, 1 blessure », est couvert par
   `test/v33.test.ts`). Les outils de captures historiques de M02 et M03 (`shots-m02`, `shots-m03`) gardent leurs
   libellés d'époque.
7. **Simulateur de référence** (`simulator_ref/`, V3.2) : laissé tel quel (source de référence, non modifiée sans
   autorisation) ; il diverge désormais sur l'Assaut contre Garde (l. 162 et 218-220 de
   `SIMULATEUR_LES_QUATRE_VOIES_V3_2.html`). Aucun test ne l'utilise.

## Conséquences

- La Garde reste le seul moyen de **bloquer**, en gagnant l'égalité ou la priorité ; dominée, elle ne fait plus que
  réduire, et au moins un dégât de base passe toujours.
- Étincelle et Ferveur réussissent plus souvent contre une Garde ; Flamme conquérante, le Repoussement et l'Insight de
  Garde ne changent pas d'issue.
- L'équilibre bouge (profils prudents et Ronce affaiblis, duels plus courts, attendu) : mesuré avant et après sur les
  mêmes graines (`tools/v33-equilibre.ts`, `tools/m10a-paliers.ts`) ; tout recalibrage reste une décision du responsable.
