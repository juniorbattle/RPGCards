# ADR 033 — Cartes neutres et deck explicite dans le moteur (avenant M10-A)

**Date :** 2026-10-20 (lot M10-A, étape 2). **Statut : APPLIQUÉ** sur décision du responsable (fiche M10, ARB-M10-02 et 03 :
garde `family !== null` autorisée dans `clash.ts`, neutres 3 / 6 / 9 / 12). Texte de règle : avenant M10-A
(`docs/m10/AVENANT_M10A_TEXTE_CANONIQUE.md`, AV-01 à AV-03, soumis au responsable).

## Contexte

Les seize cartes grises de la populace (ADR 030) doivent jouer en duel dans le mode Aventure, sans rien changer au mode
Duel standard ni au jeu par défaut. La preuve hors dépôt (`docs/m10/MESURES_M10A.md`, patch
`docs/m10/patch-m10a-neutres.diff`) mettait les neutres dans `CATALOG` et laissait 20 erreurs de typage d'interface.

## Décision

1. **Garde d'affinité** (seule modification du Clash, ARB-M10-02) : `sec.family !== null && sec.family === primary.family`
   dans `rankSupport` et `damageCoefficient` (et l'affinité publique du journal dans `engine.ts`). Prisme et Convergence
   gardent leur texte.
2. **Catalogue neutre à part** : `NEUTRAL_CATALOG` (`neutre-1` à `neutre-4`, `family: null`) ; `cardDef` connaît les deux
   catalogues. `CATALOG` reste le catalogue du mode standard, **36 définitions** (typé `StandardCardDef`, famille non
   nulle) : la galerie, les illustrations préparées par le worker, la validation du deck et des sauvegardes standard ne
   voient jamais une neutre. (Écart avec le patch de la preuve, qui ajoutait les neutres à `CATALOG` : le worker aurait
   préparé quatre illustrations de plus dans le jeu par défaut.)
3. **Deck explicite** : `GameConfig.players[*].deck?: string[]` et `signature: Family | null`. Avec une liste, le moteur
   en contrôle la **forme R-AV** (16 ordinaires, 4 par Rang, identités familiales uniques, 0 ou 1 Signature, celle
   annoncée ; `RuleError` sinon) ; sans liste, il construit le deck standard comme avant (une Signature est alors
   exigée). Invariants : 17 cartes avec une Signature, 16 sans ; seules les identités familiales sont uniques.
4. **Publication et journal** : une neutre n'a pas de famille publique ; les origines masquées disent « neutre »
   (`maskedOrigin`, journal, temps forts), jamais `null`.
5. **Présentation** (additive, rien ne change pour une carte à famille) : illustration de la carte neutre par code
   (pierre claire au grain fin, anneau de Rang, chiffre romain gravé, sans emblème) ; classe `fam-neutre` ; HUD sans
   Signature sans emblème ; portrait du joueur en **tenue grise** sans emblème (`player-gris`, kit V2 du joueur) ;
   palette `NEUTRE_PALETTE` ; aperçu des soutiens (« affinité +1 ») avec la même garde.
6. **IA** : sans hypothèse de Signature adverse quand `signatureFamily` est nul ; pas d'autre changement.
7. **Fixtures de test** : `d('neutre-3')` et la prise de la première instance libre d'une définition (les neutres en
   ont quatre) ; comportement identique pour les cartes à famille.

## Preuves (étape 2)

- Tests existants **inchangés** et verts (310) ; 15 tests neutres (`test/neutres.test.ts`, AV-13) : 325/325.
- **Empreintes des replays standard identiques** : 241 (240 duels IA contre IA variés et l'enregistrement
  `lqv-replay/1` du dépôt), `tools/m10a-empreintes.ts`, `artifacts/qa/m10a/empreintes-{avant,apres}.json`.
- **Jeu par défaut identique au pixel près** contre le build du `main` de départ `72c2eeb`, construit hors du dépôt :
  `tools/l5-identique.mjs` sur GPU réel (Radeon 780M), 12 captures, 0 pixel différent, témoins détectés
  (`artifacts/qa/m10a/etape2/l5-identique-780m.json`).

## Conséquences

- Le mode Aventure peut jouer son deck tel quel (étape 3 : `siegeAventure`) ; le deck de prêt disparaît.
- Une évolution du catalogue standard ne touche pas les neutres, et inversement.
- Le format `lqv-replay/1` et ses empreintes sont inchangés ; les duels de l'aventure portent l'identifiant de catalogue
  `…+4n` (AV-09).
