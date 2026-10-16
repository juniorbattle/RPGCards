# Rapport de conformité — Mission M01 (passe 1)

Branche `claude/jolly-keller-w17gmp`. Règlement : **V3.0 + avenant mandaté V3.2**. Les preuves renvoient à des tests (`test/*.test.ts`), à la QA navigateur (`artifacts/qa/qa-browser.json`) ou aux captures (`screenshots/qa/`, `manifest.json`). Les commandes et résultats exacts sont consignés dans `JOURNAL.md` (passe 1).

Légende : **OK** implémenté et testé · **PARTIEL** implémenté, test incomplet ou interprétation à arbitrer · **ABSENT** non livré.

## 1. Trois niveaux à ne pas confondre

| Niveau | Statut |
|---|---|
| **MVP de duel jouable** (humain vs IA, de la préparation à l’issue) | **OK** — duels complets joués par l’UI en glisser souris, clic, clavier seul et glisser tactile |
| **Conformité gameplay intégrale** (catalogue, Techniques, raccordements) | **OK pour le périmètre testé**, interprétations de raccordement à confirmer (ADR 004) |
| **RPG complet** (ville, collection, progression, HD-2D) | **ABSENT** — hors M01 |

## 2. Matrice QA prioritaire (qa/MATRICE_REGRESSION_PRIORITAIRE.md)

| ID | Statut | Preuve |
|---|---|---|
| G01 Puissances 3/6/9/12, Rang ≠ Puissance | OK | `catalog/cards.ts`, `clash.test` « coefficients », §14.1 |
| G02 deck 17 uniques | OK | `engine.test` G02, invariant `assertInvariants` à chaque transition |
| G03 chargement T → T+1 | OK | `engine.test` G03/G03b, invariant « révélation pendant le tour de pose » |
| G04 cachée inactive | OK | `engine.test` G04, vue adverse sans identité |
| G05 Rang même famille +1 par soutien | OK | `clash.test` G05 |
| G06 famille différente, Garde gagne l’égalité | OK | `clash.test` G06 (exemples D-01) |
| G07 Interférence sur Rang imprimé | OK | `clash.test` G07 |
| G08 Cendre III + Cendre I Rang vs Garde IV : 5/4, 0 dégât | OK | `clash.test` G08, `engine.test` T2 + journal ; capture U07b |
| G09 sans soutien, Garde gagne | OK | `clash.test` G09, `engine.test` T2 |
| G10 M additif, Signature 18 / 126 | OK | `clash.test` G10 ; capture U10 ; QA rejet `signatureClash` |
| G11 A/A égalité simultanée | OK | `clash.test` G11 |
| G12 ∞ vs score renforcé, absorption | OK | `clash.test` G12 |
| G13 ∞/∞ | OK | `clash.test` G13 |
| G14 Interférence vs Conserver | OK | `clash.test` G14 |
| G15 Interférences mutuelles | OK | `clash.test` G15 |
| G16 Insight / Techniques | OK | `engine.test` G16, G16b |
| G17 Lecture double | OK | `engine.test` G17 |
| G18 Ancrage | OK | `clash.test`, `engine.test` G18 |
| G19 Rupture | OK | `engine.test` G19 + Rupture réussie |
| G20 Silence / Miroir | OK | `clash.test` Silence, `engine.test` G20 |
| G21 Brasier / Couronne / Convergence Astrale | OK | `clash.test` Flamme, Cycle ; `engine.test` Emprise, Brasier |
| G22 Contrecoup, double K.-O. | OK | `engine.test` G22 ; capture U11 |
| G23 Repoussement / main > 4 | OK | `engine.test` G23 |
| G24 journal T2 et camouflage Voile | OK | `engine.test` T2 + Dissimulation (aucune fuite JSON) |
| G25 observation IA | OK | `ai.test` (3 tests d’invariance aux secrets) |
| G26 animation accélérée / sautée | OK (structurel) | le moteur ne dépend d’aucun timer ; FX consomment les événements ; `engine.test` replay hash ; QA avec `reducedMotion=1` |
| G27 20+ seeds | OK | `engine.test` 40 seeds, `ai.test` 30 seeds, `npm run sim` 200 seeds |
| G28 UI réelle | OK | `npm run qa:browser` (4 duels complets), captures U01–U12 |

## 3. Parcours opérateur (docs/MISSION_01_ACCEPTANCE.md)

| ID | Statut | Capture(s) |
|---|---|---|
| U01 main 4, sélection, placement, Assaut/Garde | OK | U01a, U01b, U01c |
| U02 CHARGEMENT verrouillé | OK | U02 ; rejet testé (`engine.test` G03b) |
| U03 garder cachée / révéler | OK | U03a, U03b, U03c |
| U04 menu contextuel sans fuite | OK | U04, U04b, U04c |
| U05 drag/drop + clic | OK | U05 + QA (glisser souris et tactile CDP) |
| U06 reveal sans fuite (+ Lecture) | OK | U06 ; Lecture : `engine.test` G17 |
| U07 T2 | OK | U07a, U07b |
| U08 Garde victorieuse, Repoussement | OK (tests + QA) | `engine.test` G04/G23 ; repoussements joués en QA |
| U09 Interférence | OK | U09 |
| U10 Signature ∞ vs Garde P12 | OK | U10 |
| U11 double K.-O. | OK | U11 |
| U12 mobile, clavier, mouvement réduit | OK | U12a, U12b, U12c |

## 4. Art procédural et scène

| Exigence | Statut | Preuve |
|---|---|---|
| 4 familles distinctes sans dépendre de la couleur (emblème + motif) | OK | galeries `art-galerie-seed7/99` |
| Rangs I–IV / ∞, rareté (cadre), verso commun secret | OK | galeries |
| 3 états de Secondaire distincts (motif + libellé + couleur) | OK | U02, U03a, U03c |
| Seeds art / gameplay séparées | OK | `artSeed` n’intervient que dans `src/art` et `src/scene` ; galeries seed 7 vs 99 |
| Scène Three.js réelle reliée au duel | OK | `src/scene/arena.ts`, FX sur événements ; captures `cam-*` |
| Repli sans WebGL | PARTIEL | code de repli (fond CSS, jeu jouable) non testé sur un navigateur sans WebGL |
| Aucune ressource externe | OK | aucun fichier image/modèle/police/son dans le dépôt de production |

## 5. Écarts et limites

- ADR 004 : 11 interprétations de raccordement, dont 4 à confirmer explicitement (ARB-002 visibilité du profil rival, ARB-004 famille sous Dissimulation, ARB-003/ARB-011 confirmations).
- IA : heuristique d’un niveau « quartier » (évaluation par `computeClash` sur hypothèses publiques) ; pas de mémoire des cartes vues, pas de personnalités narratives.
- Performances GPU **non mesurées** (conteneur sans GPU : SwiftShader) ; seules les mesures CPU/moteur sont significatives.
- Dissipation et Lecture côté humain sont testées au moteur ; leurs fenêtres UI sont implémentées mais ne sont pas exercées par la QA automatisée (les duels QA n’équipent pas ces Techniques chez l’humain au-delà de Lecture passée).
