# ADR 035 — La Garde réduit sans annuler (règle V3.3, avenant 07)

**Date :** 2026-10-24. **Statut : PROPOSÉ.** Texte de règle : `contracts/07_AVENANT_V3_3_GARDE.md`, soumis au
responsable le 2026-10-24 ; rien n'est codé avant sa validation explicite.

## Contexte

Le responsable a décidé le 2026-10-24 de changer la règle Assaut contre Garde : « la garde réduit les dégâts sans les
annuler si son rang n'est pas supérieur à l'assaut ». Aujourd'hui, l'Assaut qui gagne la priorité inflige
`max(0, P_Assaut − P_Garde) × M` (`src/game/engine/clash.ts`, branche A/G) : une Garde de même Puissance annule tout,
même dominée au Rang, même par une Signature P12. Ses choix : `max(0, P_Assaut − ⌈P_Garde / 2⌉) × M`, moitié arrondie au
supérieur, pour tout le jeu (Duel standard, Aventure, rivaux, Championnat, Signatures comprises), maintenant.

## Décision proposée

1. **Une seule arithmétique** : la moitié arrondie au supérieur est une fonction exportée de `clash.ts`
   (`guardAbsorption(power)`), utilisée par `computeClash` (dégâts de base et champ `absorbed`) et par l'interface (aide du
   tour guidé, infobulles) ; aucune formule recopiée ailleurs (principe « une seule arithmétique », JOURNAL). L'IA et la
   prévisualisation passent déjà par `computeClash` et suivent la règle sans changement.
2. **Étiquette des règles** `V3.0+delta-V3.3` (état du moteur, `RULES` de la reprise) ; format `lqv-replay/1` et
   identifiant de catalogue inchangés. Un duel en cours sauvegardé sous l'ancienne règle est refusé à la reprise avec sa
   raison ; le reste de la sauvegarde est gardé. Pas de double formule dans le moteur.
3. **Preuve des empreintes en deux temps** (formule seule, puis étiquette) : on ne régénère que ce que la règle explique.
4. **Textes** : journal du Clash (« la Garde absorbe … »), temps forts, mise en scène (`clashMotion`, « ABSORBE n »),
   tour guidé et boutons du plateau, aide, conseils, scénario de QA `clash-ag` (sa démonstration d'absorption totale
   passe à une main qui la produit encore : Cendre II + Cendre III en Rang contre Garde IV) et outils de captures qui
   l'utilisent.
5. **Simulateur de référence** (`simulator_ref/`, V3.2) : laissé tel quel (source de référence, non modifiée sans
   autorisation) ; il diverge désormais sur l'Assaut contre Garde (l. 162 et 218-220 de
   `SIMULATEUR_LES_QUATRE_VOIES_V3_2.html`). Aucun test ne l'utilise.

## Conséquences

- La Garde reste le seul moyen de **bloquer** (en gagnant l'égalité ou la priorité) ; dominée, elle ne fait plus que
  réduire. Absorption totale seulement quand sa Puissance vaut au moins le double de celle de l'Assaut (Assaut I contre
  Garde II à IV, Assaut II contre Garde IV).
- Étincelle et Ferveur réussissent plus souvent contre une Garde ; Flamme conquérante, le Repoussement et l'Insight de
  Garde ne changent pas d'issue.
- L'équilibre bouge (profils prudents et Ronce affaiblis, duels plus courts, attendu) : mesuré avant et après
  (`tools/v33-equilibre.ts`, `tools/m10a-paliers.ts`) ; tout recalibrage reste une décision du responsable.
