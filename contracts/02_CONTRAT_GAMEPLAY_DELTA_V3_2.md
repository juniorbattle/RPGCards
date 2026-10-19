# 02 — Avenant opérationnel V3.2 au règlement V3.0

**Ratification (2026-10-19) :** le responsable a **ratifié D-01 comme règle V3.3** (ADR 004, dernière section) ; le texte historique V3.0 reste intact et ce delta fait foi pour D-01.

**Statut :** baseline **mandatée pour le démarrage de production** à partir des échanges de conception. Cette pièce **n'efface pas le V3.0**, elle lui apporte les seules précisions ci-dessous. À intégrer explicitement dans une prochaine version canonique après revue par le responsable.

## D-01 — Affinité lors de « Amplifier le Rang »

Ancien V3.0 : bonus = `rang imprimé Secondaire` seulement.  
**Règle de production :** pour chaque Secondaire active dont l'usage `Amplifier le Rang` **survit à l'Interférence**, bonus de score :

```ts
const rankSupport = secondary.printedRank +
  (secondary.family === primary.family ? 1 : 0);
// score ordinaire = primary.printedRank + somme(rankSupport survivants)
```

- Applicable en Assaut ou Garde ; cumulable pour **deux** Secondaires Rang.
- Ne change ni les Puissances ni les coefficients de dégâts.
- L'Interférence vérifie toujours le **Rang imprimé de la Secondaire**, sans bonus d'affinité.
- Les Signatures ∞ ne reçoivent pas un nombre ajouté à ∞ ; toute Primaire ordinaire reste dominée quel que soit son score final. Deux ∞ restent ex aequo en priorité.
- Effets à écart de Rang exact (ex. Étincelle) se calculent **sur le score final après Interférences et affinités**.
- Exemple : Garde Ronce II P6 + soutien Ronce I (rang 1 + 1) = score 4 contre Assaut Cendre IV score 4 : Garde gagne, 0 blessure. Avec Astre I = score 3, la Garde perd et subit `12 − 6 = 6`.

## D-02 — Trois états visuels obligatoires, déjà présents dans la règle de base

1. `CHARGEMENT` : posée pendant ce tour, cachée de l'adversaire, **inutilisable**.
2. `RÉSERVE CACHÉE / INACTIVE` : chargée, non volontairement révélée, **inutilisable**, le propriétaire sait ce qu'il possède.
3. `ACTIVE / PRÊTE` : révélée, utilisable **après les Primaires** ou conservable ; une carte masquée par effet reste active même si son identité publique est inconnue.

L'UI doit distinguer ces états dans le dessin de la carte, et pas uniquement par un petit badge ambigu. Aucune fuite de face cachée du rival.

## D-03 — Chronologie non modifiée

- Révélation volontaire des anciennes Secondaires chargées au début du tour.
- Engagement simultané des Primaires Assaut/Garde et nouvelle Secondaire facultative.
- Les Primaires apparaissent simultanément, puis **seulement** les modes tactiques des Secondaires **actives** se choisissent secrètement (Conserver / Rang / Dégâts si Assaut / Interférer).
- Il n'existe **pas** de mode Rang/Dégâts/Interférence prédécidé à la révélation volontaire ; ne pas inventer ce changement.

## D-04 — Journal d'actions V3.2

- Événement au moment légal de révélation des Secondaires ; identités masquées quand un pouvoir valide les dissimule.
- Une fois les décisions tactiques **toutes deux verrouillées**, actions, cibles visibles autorisées et résultat des Interférences peuvent être journalisés.
- Détails de confrontation : rang imprimé, contributions des Secondaires, bonus famille, priorité ∞, issue de Rang, Puissance attaque et absorption garde, PV réellement perdus, effets, destinations.
- Le journal distingue « Assaut domine au Rang, **mais 0 dégâts car Garde absorbe** » de « Garde victorieuse » et de « Clash sans vainqueur ».
- Ne jamais publier les décisions secrètes **avant** le verrouillage simultané (même via infobulle, DOM invisible, export JSON public, debug exposé, capture de screenshot).
- Les formulations affichées sont grammaticalement correctes : « Vous gagnez », « Vous révélez », « Vous préparez ».

## D-05 — Référence de non-régression

Tester systématiquement Cendre III Assaut P9 contre Cendre IV Garde P12 : sans soutien la Garde gagne ; avec Cendre I active en Rang l'Assaut a score 5 contre 4 **mais inflige 0**. Une Secondaire posée durant le tour du Clash ne peut jamais contribuer.

## D-06 — Historique et approbation

- `simulator_ref/simulator/docs/DELTA_V3_1_A_VALIDER.md` : prototype source de cet avenant.
- `simulator_ref/simulator/docs/DIAGNOSTIC_JOURNAL_T2_V3_2.md` : reproduction du bug de journal.
- Le responsable peut ultérieurement confirmer l'intégration dans V3.3 ; tant qu'aucune révision historique n'est signée, rapporter « V3.0 + delta mandaté V3.2 », pas « V3.0 original disait +1 ».
