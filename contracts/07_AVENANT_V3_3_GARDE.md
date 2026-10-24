# 07 — Avenant V3.3 : la Garde réduit sans annuler

**Ratification : EN ATTENTE.** Texte canonique soumis au responsable le 2026-10-24 ; il ne fait foi qu'après sa
validation explicite de cette rédaction (`contracts/00_GOUVERNANCE_AUTORITE.md`, point 1). Aucun code n'est changé avant.

**Statut : PROPOSÉ.** Avenant au règlement V3.0 + delta V3.2 (D-01 déjà ratifié comme règle V3.3, ADR 004). Il complète
la V3.3 d'une seconde règle, **pour tout le jeu** : mode Duel standard (configuration par défaut, rencontres, rivaux,
duels de la ville), mode Aventure (populace, membres, lieutenants, chefs) et Championnat, **Signatures et cartes neutres
comprises**. Une fois validé, c'est un avenant explicitement approuvé (ordre d'autorité, point 2) ; le texte historique
V3.0 reste intact.

**Sources :** décision du responsable du 2026-10-24 : « la garde réduit les dégâts sans les annuler si son rang n'est pas
supérieur à l'assaut » ; ses choix : formule `max(0, P_Assaut − ⌈P_Garde / 2⌉) × M`, moitié **arrondie au supérieur**,
pour tout le jeu, Signatures comprises, appliquée maintenant. Décision d'architecture : ADR 035.

## G-00 — Constat

Aujourd'hui (V3.0 §6.2, `src/game/engine/clash.ts`, branche Assaut contre Garde), l'Assaut qui gagne la priorité inflige
`max(0, P_Assaut − P_Garde) × M`. Une Garde de même Puissance annule donc tout : un Assaut IV P12, soutenu au Rang, qui
domine une Garde IV P12 inflige 0 ; une Signature P12 aussi. Le responsable juge ce résultat incorrect.

## G-01 — La règle

Quand **l'Assaut gagne la priorité** contre une Garde (score strictement supérieur, ou Signature ∞ contre une Garde
ordinaire), la Garde n'absorbe plus que **la moitié de sa Puissance imprimée, arrondie au supérieur** :

```ts
const absorption = Math.ceil(P_Garde / 2);                     // Garde I 2, II 3, III 5, IV 6
const degatsDeBase = Math.max(0, P_Assaut - absorption) * M;   // M après la soustraction, comme avant
// « Garde absorbée » (journal, contrat 05) = Math.min(P_Assaut, absorption)
```

| Garde | Puissance | Absorbe (avant) | **Absorbe (V3.3)** |
|---|---:|---:|---:|
| Rang I (familiale ou neutre) | 3 | 3 | **2** |
| Rang II | 6 | 6 | **3** |
| Rang III | 9 | 9 | **5** |
| Rang IV | 12 | 12 | **6** |
| Signature Voile ou Ronce | 12 | 12 | **6** |
| Signature Astre | 13 | 13 | **7** |
| Signature Cendre | 14 | 14 | **7** |

- **Signatures en Garde** : la moitié vaut 6, 7 et 7. Mais une Signature en Garde ne perd jamais la priorité (∞ domine
  tout score ordinaire, l'égalité ∞ contre ∞ va à la Garde) : dans le catalogue actuel, elle gagne toujours et bloque
  tout. Ces trois valeurs ne servent donc dans aucun Clash d'aujourd'hui ; elles fixent la règle pour une carte future.
- **Signatures en Assaut** : leur Puissance (12, 13, 14) subit la moitié de la Garde ordinaire qu'elles dominent.
- Les **dégâts fixes** (Étincelle) s'ajoutent après la formule, comme avant (§10.3, point 5).

## G-02 — Dégâts de base, avant et après (M = 1)

Chaque case suppose que **l'Assaut gagne la priorité** ; quand la Garde la gagne, 0 dégât, comme avant. Avec des
soutiens Dégâts, multiplier par M (l'ultime Cendre IV ×7 contre Garde III passe de 21 à 49).

| Assaut ↓ \ Garde → | I (P3, absorbe 2) | II (P6, absorbe 3) | III (P9, absorbe 5) | IV (P12, absorbe 6) |
|---|---:|---:|---:|---:|
| **I** (P3) | 0 → **1** | 0 → **0** | 0 → **0** | 0 → **0** |
| **II** (P6) | 3 → **4** | 0 → **3** | 0 → **1** | 0 → **0** |
| **III** (P9) | 6 → **7** | 3 → **6** | 0 → **4** | 0 → **3** |
| **IV** (P12) | 9 → **10** | 6 → **9** | 3 → **7** | 0 → **6** |
| **Signature Voile ou Ronce** (P12) | 9 → **10** | 6 → **9** | 3 → **7** | 0 → **6** |
| **Signature Astre** (P13) | 10 → **11** | 7 → **10** | 4 → **8** | 1 → **7** |
| **Signature Cendre** (P14) | 11 → **12** | 8 → **11** | 5 → **9** | 2 → **8** |

Une case qui blessait déjà gagne exactement `⌊P_Garde / 2⌋ × M` (1, 3, 4 ou 6 par point de M) ; une case à 0 devient
positive dès que `P_Assaut > ⌈P_Garde / 2⌉`.

## G-03 — Les cas où la Garde absorbe encore tout

La Garde dominée absorbe tout quand `⌈P_Garde / 2⌉ ≥ P_Assaut`, c'est-à-dire quand **sa Puissance vaut au moins le
double de celle de l'Assaut** (avec les Puissances 3 / 6 / 9 / 12, les deux conditions sont les mêmes) :

| Assaut | Gardes qui absorbent tout |
|---|---|
| Rang I (P3) | Rang II (absorbe 3), III, IV |
| Rang II (P6) | Rang IV (absorbe 6) |
| Rang III, IV, Signatures | aucune |

Ce sont les **quatre seules cases** où l'Assaut gagne au Rang sans blesser : le message `zeroDamageRankWin` (« gagne au
Rang, 0 blessure : absorbé par Garde », contrat 05) ne s'affiche plus que pour elles. Il ne s'affiche **plus jamais pour
une Signature** en Assaut (au moins 12 − 6 = 6).

## G-04 — Ce qui ne change pas

- **La Garde gagne l'égalité** : priorité de la Garde supérieure **ou égale** → elle gagne, 0 dégât, Repoussement Basic
  éventuel, +1 Insight naturel. La comparaison de priorité vient toujours **avant** l'absorption.
- **Assaut contre Assaut** (priorités différentes ou égales) et **Garde contre Garde** : inchangés.
- **Le score de Rang ne devient jamais de la Puissance d'absorption** : la moitié se calcule sur la Puissance
  **imprimée** de la Garde, seule ; ses soutiens en Rang ne l'augmentent pas (V3.0 §6.1, invariant 11).
- **M s'applique après la soustraction** : `(P_A − ⌈P_G/2⌉) × M`, jamais `P_A × M − ⌈P_G/2⌉` ; coefficients additifs,
  jamais multipliés entre eux.
- Puissances 3 / 6 / 9 / 12 et Signatures 14 / 12 / 12 / 13 ; catalogue, effets, Techniques, Insight, Interférences,
  chronologie, secrets (ADR 011) ; règle R-AV et neutres (avenant 06) ; PV et valeurs de l'annexe de calibrage.

## G-05 — « Blesser » et les effets qui en dépendent (relevé dans le code)

La définition de **Blesser** (V3.0 §10.4 : « infliger un nombre strictement positif de PV ») ne change pas. Ce qui change :
une Garde dominée est désormais blessée, sauf dans les quatre cases de G-03. Relevé dans `src/game/engine/clash.ts`
(commit `f7339ad`) :

| Effet | Condition dans le code | Effet de la V3.3 |
|---|---|---|
| **Étincelle** (Cendre I, Rang d'un Assaut) | victoire, `baseDamage[o] > 0` et avance de score exacte de 1 (l. 238) | **réussit plus souvent contre une Garde** : Cendre III + Étincelle en Rang (3 + 2 = 5) contre Garde Cendre IV (4) : avant 0 et échec ; après 3 + 2 = **5** |
| **Ferveur** (Cendre III, Dégâts) | victoire d'une Primaire Cendre, `damage[o] > 0` (l. 268) | **réussit plus souvent contre une Garde** : Cendre II + Cendre IV en Rang (2 + 5 = 7) + Ferveur en Dégâts (×4) contre Garde Ronce III : avant 0, échec ; après (6 − 5) × 4 = **4**, +1 Insight |
| **Flamme conquérante** (Brasier P14) | victoire en Assaut, `damage > 0`, soutien Dégâts valide (l. 314) | **aucune issue ne change** : Brasier blessait déjà toute Garde ordinaire dominée (14 − 12 = 2) ; seul le montant change (sans soutien 2 → 8 ; ×5 + ×4 : 18 → 72) |
| **Repoussement** (Basic, Entrave, Emprise, Racine, Rupture) | Garde victorieuse (`guardWin`, l. 310) | inchangé : la Garde qui perd n'a toujours aucun Repoussement |
| **Insight naturel de Garde** | Garde victorieuse (l. 256) | inchangé ; la phrase du §12 « même en absorbant tous ses dégâts » (Garde dominée par une Signature) n'a plus de cas |
| Écaille (Garde gagnante), Ténacité (Garde perdante), Cycle astral (victoire), Braise et Contrecoup (Assaut contre Assaut seulement), Silence, Détour, Relance | sans rapport avec la blessure | inchangés |
| **`zeroDamageRankWin`** | `winner && !guardWin && damage[perdant] === 0` (l. 245) | vrai seulement dans les quatre cases de G-03 (Étincelle exige une blessure de base : elle ne peut pas rendre positive une case à 0) |
| **« Garde absorbée »** (journal, contrat 05 §13.3) | `absorbed = min(P_A, P_G)` (l. 202) | `min(P_A, ⌈P_G/2⌉)` |

## G-06 — Cas du contrat V3.0, du delta V3.2 et de l'avenant 06 qui changent

Les textes historiques restent intacts ; pour ces passages, cet avenant fait foi.

| Passage | Avant | V3.3 |
|---|---|---|
| V3.0 §6.2, tableau, ligne « Assaut prioritaire » | `max(0, P_Assaut − P_Garde) × M_Assaut` | `max(0, P_Assaut − ⌈P_Garde / 2⌉) × M_Assaut` |
| V3.0 §6.2, paragraphe : Signature P12 contre Garde IV P12 | 0 blessure, pas de Repoussement | **6 PV**, toujours pas de Repoussement |
| V3.0 §6.3, dernier paragraphe : « contre Garde, le différentiel de Puissance positif » | `P_A − P_G` | `P_A − ⌈P_G/2⌉` |
| V3.0 §6.3, exemple Basic : ×7 contre Garde III ; Assaut IV seul contre Garde III ; contre Garde IV | 21 ; 3 ; la Garde gagne au Rang | **49** ; **7** ; la Garde gagne au Rang (inchangé : égalité) |
| V3.0 §7.2 et §8.4 : Signature P14 ×(5 + 4) contre Garde IV | 18 | **72** |
| V3.0 §8.4 : Brasier sans soutien contre Garde IV ; Voile ou Ronce P12 contre Garde IV | 2 ; 0 | **8** ; **6** |
| V3.0 §12 : Garde dominée par une Signature « même en absorbant tous ses dégâts » | cas possible | plus de cas (la règle d'Insight ne change pas) |
| V3.0 §13.3 : « Résultat Basic provisoire : (12 − 9) × 1 = 3 » ; « dégâts provisoires 21 contre cette Garde » | 3 ; 21 | `(12 − 5) × 1 = 7` ; **49** |
| V3.0 §13.3 : « Signature ∞ domine la Garde, mais la blessure est absorbée : 0 PV » | message possible | impossible ; exemple remplacé par « Assaut I domine la Garde III, mais la blessure est absorbée : 0 PV » |
| V3.0 §14.2 : Cendre IV contre Garde Ronce III ; « les blessures restent 3 » | 3 | **7** |
| V3.0 §14.3 : ×7 / ×3 / ×1 contre Garde III | 21 / 9 / 3 | **49 / 21 / 7** |
| V3.0 §14.5 : Brasier contre Garde IV, sans soutien / ×9 / soutien interféré | 2 / 18 / « blesse de 2 PV » | **8 / 72 / 8 PV** (Flamme échoue toujours sans soutien Dégâts valide) |
| V3.0 §14.7 : Convergence ×9 contre Garde III | 27 | **63** |
| V3.0 §16.2, invariant 11 | dégâts `max(0, P_A − P_G) × M` | `max(0, P_A − ⌈P_G/2⌉) × M` ; la phrase sur le score de Rang est gardée |
| V3.0 §16.4 : « A/G P12 contre Garde III P9 » | 3 dégâts | **7** (0 si la Garde remporte son Rang : inchangé) |
| V3.0 §16.4 : « Signature P14 avec ×5 + ×4 contre Garde IV P12 » | 18 | **72** (contre Assaut ordinaire : 126, inchangé) |
| V3.0 §16.4 : « Signature P12 contre Garde IV P12 » | priorité de la Signature, dégâts 0, pas de Repoussement | priorité de la Signature, **dégâts 6**, pas de Repoussement |
| V3.0 §18 (fiche d'une page) | « l'Assaut prioritaire inflige `max(0,P_A−P_G)×M` » | `max(0, P_A − ⌈P_G/2⌉) × M` |
| Delta V3.2 D-01, exemple : Garde Ronce II + Astre I (score 3) contre Cendre IV | subit 12 − 6 = 6 | subit **12 − 3 = 9** |
| Delta V3.2 **D-05** (référence de non-régression) : Cendre III P9 + Cendre I en Rang (5 contre 4) contre Garde Cendre IV P12 | victoire au Rang, **0** | victoire au Rang, **3** (9 − 6) ; sans soutien, la Garde gagne (inchangé) |
| Avenant 06, AV-02 : « avec les Cendre de D-05, l'Assaut aurait 5 contre 4 (et infligerait 0) » | 0 | **3** (la référence neutre, où la Garde gagne, ne change pas) |

**Nouvelle référence de non-régression de l'absorption totale** (remplace celle de D-05) : Cendre II P6 + Cendre III en
Rang (2 + 4 = 6) contre Garde Cendre IV P12 (score 4) : victoire au Rang, **0 blessure** (6 − 6), pas de Repoussement.

## G-07 — Versions, replays et sauvegardes

- **Étiquette des règles** : `V3.0+delta-V3.2` devient **`V3.0+delta-V3.3`** (état du moteur, `RULES` de la reprise).
  Le format `lqv-replay/1` et l'identifiant de catalogue ne changent pas.
- **Empreintes** : l'étiquette est dans l'état, donc toutes les empreintes changent. La preuve se fait en deux temps :
  formule seule d'abord (étiquette inchangée) : seuls changent les duels qui contiennent un Clash où l'Assaut domine une
  Garde avec `P_A > ⌈P_G/2⌉` ; puis l'étiquette. On ne régénère que ce que la règle explique.
- **Duel en cours d'une sauvegarde d'avant la V3.3** (standard `lqv.save` ou aventure `lqv.aventure`) : sa reprise est
  **refusée avec sa raison** (« Règles différentes »), comme pour toute version différente, avec les choix qui existent
  déjà : en mode standard, recommencer ce duel depuis le début (même rival, même graine) ou le retirer sans qu'il compte ;
  dans l'aventure, le duel est retiré sans compter. La collection, la progression et l'état de l'aventure sont gardés. On
  ne garde pas deux formules dans le moteur.

## G-08 — Effet attendu sur l'IA, le calibrage et le simulateur de référence

- **IA des rivaux** : elle estime les dégâts avec `computeClash` (`src/game/ai/policy.ts`, l. 107 : une seule
  arithmétique pour le moteur, l'IA et la prévisualisation) ; elle suit donc la règle sans formule à reprendre. Ses
  profils (part d'Assauts, Techniques) et l'heuristique de Lecture (l. 170-171) restent tels quels. Attendu : la Garde qui
  perd la priorité rapporte moins ; les profils prudents (Maëlle, PNJ « timide ») et la Ronce s'affaiblissent, les
  profils offensifs et la Cendre se renforcent ; les duels raccourcissent. **À mesurer, sans recalibrer.**
- **Calibrage de l'aventure** (`docs/m10/CALIBRAGE_M10A.md`, validé) : aucune valeur ne change avec cet avenant. Les taux
  de victoire mesurés (§3) vont bouger : ils sont remesurés avec le même outil (`tools/m10a-paliers.ts`), avant et après,
  et tout écart est remonté au responsable, qui décide d'un recalibrage éventuel (nouvel amendement de l'annexe).
- **Championnat** : mêmes mesures (lignes « Championnat » de l'outil) ; ses formats ne changent pas.
- **Simulateur de référence** (`simulator_ref/simulator/SIMULATEUR_LES_QUATRE_VOIES_V3_2.html`, l. 162 et 218-220) :
  oracle V3.2, non modifié sans autorisation ; il garde l'ancienne formule et **diverge** sur l'Assaut contre Garde. Aucun
  test ne l'utilise. Il reste tel quel, comme trace historique ; la divergence est notée dans l'ADR 035.

## G-09 — Preuves exigées

- **Tests du tableau G-02** (les 28 cases, Signatures comprises), des quatre cases de G-03, de M après la soustraction, des
  effets de G-05 (Étincelle, Ferveur, Flamme, Repoussement, Insight) et d'une Signature en Garde qui bloque toujours.
- **Chaque test modifié listé avec sa raison** ; aucun autre attendu changé.
- **Empreintes** : la preuve en deux temps de G-07, sur le corpus de `tools/m10a-empreintes.ts`.
- **Jeu par défaut au repos identique au pixel près** (`tools/l5-identique.mjs` contre le build du `main` de départ) ;
  textes du duel, de l'aide, des conseils, du tour guidé et du journal à jour.
- **Mesures d'équilibre avant et après** (Duel standard, rivaux, Championnat, aventure) : taux de victoire, longueur des
  duels, part des Gardes jouées ; jalon de QA sur les deux GPU.
