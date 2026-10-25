# 07 — Avenant V3.3 : la Garde réduit sans annuler

**Ratification (2026-10-24) :** rédaction canonique **validée par le responsable** dans la session de la règle V3.3 :
« Révision 2 de l'avenant 07 validée telle quelle, à verser et appliquer. » (révision 2, après sa correction du même
jour : option A confirmée, plancher d'un dégât de base ; la révision 1 n'a pas été retenue).

**Statut : FIGÉ / APPROUVÉ.** Avenant au règlement V3.0 + delta V3.2 (D-01 déjà ratifié comme règle V3.3, ADR 004). Il complète
la V3.3 d'une seconde règle, **pour tout le jeu** : mode Duel standard (configuration par défaut, rencontres, rivaux,
duels de la ville), mode Aventure (populace, membres, lieutenants, chefs) et Championnat, **Signatures et cartes neutres
comprises**. C'est un avenant explicitement approuvé (ordre d'autorité, point 2) ; le texte historique V3.0 reste
intact.

**Sources :** décisions du responsable du 2026-10-24 : (1) « la garde réduit les dégâts sans les annuler si son rang
n'est pas supérieur à l'assaut » ; moitié de la Puissance de la Garde **arrondie au supérieur**, pour tout le jeu,
Signatures comprises ; (2) correction de la révision 1 : **option A confirmée** (les soutiens de Rang peuvent faire
vaincre une Garde de Rang imprimé supérieur ; le système de priorité est préservé) et **« tout Assaut victorieux inflige
au minimum 1 dégât de base avant le multiplicateur »** ; objectif : « des duels plus dynamiques et moins longs, sans
sacrifier la profondeur tactique du Rang, des Secondaires et de la Garde ». Décision d'architecture : ADR 035.

## G-00 — Constat

Aujourd'hui (V3.0 §6.2, `src/game/engine/clash.ts`, branche Assaut contre Garde), l'Assaut qui gagne la priorité inflige
`max(0, P_Assaut − P_Garde) × M`. Une Garde de même Puissance ou plus puissante annule donc tout : un Assaut IV P12,
soutenu au Rang, qui domine une Garde IV P12 inflige 0 ; une Signature P12 aussi. Le responsable juge ce résultat
incorrect.

## G-01 — La priorité, inchangée (option A)

- La priorité se décide comme aujourd'hui : **scores de Rang effectifs**, après tous les soutiens et toutes les
  Interférences (V3.0 §6.1, delta D-01) ; une Signature ∞ domine tout score ordinaire ; **la Garde gagne l'égalité**.
- Les soutiens de Rang **peuvent** faire vaincre à un Assaut de Rang imprimé inférieur une Garde de Rang imprimé
  supérieur (ex. Assaut II + soutien en Rang, score 6, contre Garde IV, score 4).
- **Si la Garde gagne** : zéro dégât de l'Assaut, +1 Insight naturel, droit au Repoussement d'une Secondaire adverse
  éligible (face cachée, **en chargement ou en réserve**, V3.0 §6.4 ; Emprise et Rupture selon leur texte). Inchangé.
- **Si l'Assaut gagne** : il inflige des dégâts selon les **Puissances imprimées** (G-02). C'est le seul changement.

## G-02 — La règle : absorption effective et plancher d'un dégât de base

Seulement quand **l'Assaut gagne la priorité** contre une Garde :

```ts
const absorptionEffective = Math.min(Math.ceil(P_Garde / 2), P_Assaut - 1);
const degatsDeBase = (P_Assaut - absorptionEffective) * M;   // M après la soustraction, comme avant
// « Garde absorbée » (rapport, journal, animation, contrat 05) = absorptionEffective
```

- La Garde dominée absorbe **la moitié de sa Puissance imprimée, arrondie au supérieur** (Garde I 2, II 3, III 5, IV 6),
  **sans jamais laisser moins d'un dégât de base** : l'absorption est plafonnée à `P_Assaut − 1`.
- Tout Assaut victorieux contre une Garde inflige donc **au moins 1 × M** ; il n'existe plus de victoire au Rang sans
  blessure (`max(0, …)` devient inutile : `P_Assaut ≥ 3`, donc `P_Assaut − 1 ≥ 2`).
- **Signatures en Garde** : la moitié vaudrait 6 (P12), 7 (P13) et 7 (P14). Mais une Signature en Garde ne perd jamais la
  priorité (∞ domine tout score ordinaire, l'égalité ∞ contre ∞ va à la Garde) : dans le catalogue actuel elle gagne
  toujours et bloque tout. Ces valeurs ne servent dans aucun Clash d'aujourd'hui ; elles fixent la règle pour une carte
  future.
- **Signatures en Assaut** : leur Puissance (12, 13, 14) subit l'absorption effective de la Garde ordinaire qu'elles
  dominent.
- Les **dégâts fixes** (Étincelle) s'ajoutent après la formule, comme avant (V3.0 §10.3, point 5).

| Garde dominée | Puissance | Absorbe (V3.2) | **Absorbe (V3.3)**, plafonnée à `P_Assaut − 1` |
|---|---:|---:|---|
| Rang I (familiale ou neutre) | 3 | 3 | **2** |
| Rang II | 6 | 6 | **3** (2 contre un Assaut I) |
| Rang III | 9 | 9 | **5** (2 contre un Assaut I) |
| Rang IV | 12 | 12 | **6** (2 contre un Assaut I, 5 contre un Assaut II) |
| Signature Voile ou Ronce, Astre, Cendre | 12, 13, 14 | — | 6, 7, 7 (jamais dominée aujourd'hui) |

## G-03 — Dégâts de base, avant et après (M = 1)

Chaque case suppose que **l'Assaut gagne la priorité** ; quand la Garde la gagne, 0 dégât, comme avant. Avec des
soutiens Dégâts, multiplier par M. Entre crochets, l'absorption effective quand le plancher la plafonne.

| Assaut ↓ \ Garde → | I (P3) | II (P6) | III (P9) | IV (P12) |
|---|---:|---:|---:|---:|
| **I** (P3) | 0 → **1** | 0 → **1** [2] | 0 → **1** [2] | 0 → **1** [2] |
| **II** (P6) | 3 → **4** | 0 → **3** | 0 → **1** | 0 → **1** [5] |
| **III** (P9) | 6 → **7** | 3 → **6** | 0 → **4** | 0 → **3** |
| **IV** (P12) | 9 → **10** | 6 → **9** | 3 → **7** | 0 → **6** |
| **Signature Voile ou Ronce** (P12) | 9 → **10** | 6 → **9** | 3 → **7** | 0 → **6** |
| **Signature Astre** (P13) | 10 → **11** | 7 → **10** | 4 → **8** | 1 → **7** |
| **Signature Cendre** (P14) | 11 → **12** | 8 → **11** | 5 → **9** | 2 → **8** |

- **Aucune case à 0** : la plus faible victoire vaut 1 × M (Assaut I contre toute Garde dominée, sauf la Garde I qui
  absorbe 2 ; Assaut II contre Garde III ou IV).
- Le plancher ne joue que dans **quatre cases** (crochets) : Assaut I contre Garde II, III, IV ; Assaut II contre
  Garde IV. Ailleurs, la moitié arrondie au supérieur s'applique telle quelle.
- Exemples avec M : Assaut II (score 6) + Dégâts ×5 contre Garde IV : 0 → **5** ; ultime Cendre IV ×7 contre Garde III :
  21 → **49** ; Brasier ×9 contre Garde IV : 18 → **72**.

## G-04 — Ce qui ne change pas

- La priorité (G-01) : **la Garde gagne l'égalité**, la comparaison de priorité vient **avant** l'absorption ; Garde
  victorieuse : 0 dégât, +1 Insight, Repoussement.
- **Assaut contre Assaut** (priorités différentes ou égales) et **Garde contre Garde** : inchangés.
- **Le score de Rang ne devient jamais de la Puissance d'absorption** : l'absorption se calcule sur la Puissance
  **imprimée** de la Garde ; ses soutiens en Rang ne l'augmentent pas (V3.0 §6.1, invariant 11). Le plafond dépend de la
  Puissance **imprimée** de l'Assaut, jamais de son score.
- **M s'applique après la soustraction** : `(P_A − absorptionEffective) × M`, jamais `P_A × M − absorption` ;
  coefficients additifs, jamais multipliés entre eux.
- Puissances 3 / 6 / 9 / 12 et Signatures 14 / 12 / 12 / 13 ; catalogue, effets, Techniques, Insight, Interférences,
  chronologie, secrets (ADR 011) ; règle R-AV et neutres (avenant 06) ; PV et valeurs de l'annexe de calibrage.

## G-05 — « Blesser » et les effets qui en dépendent (relevé dans le code)

La définition de **Blesser** (V3.0 §10.4 : « infliger un nombre strictement positif de PV ») ne change pas. Ce qui
change : **un Assaut qui gagne contre une Garde blesse toujours**. Relevé dans `src/game/engine/clash.ts` (commit
`f7339ad`) :

| Effet | Condition dans le code | Effet de la V3.3 |
|---|---|---|
| **Étincelle** (Cendre I, Rang d'un Assaut) | victoire, `baseDamage[o] > 0`, avance de score exacte de 1 (l. 238) | contre une Garde, la blessure de base est toujours acquise : **reste la seule avance exacte de 1**. Cendre III + Étincelle en Rang (3 + 2 = 5) contre Garde Cendre IV (4) : avant 0 et échec ; après 3 + 2 = **5** |
| **Ferveur** (Cendre III, Dégâts) | victoire d'une Primaire Cendre, `damage[o] > 0` (l. 268) | **toute victoire d'une Primaire Cendre la satisfait**, contre un Assaut comme contre une Garde. Cendre II + Cendre IV en Rang (2 + 5 = 7) + Ferveur en Dégâts (×4) contre Garde Ronce III : avant 0, échec ; après (6 − 5) × 4 = **4**, +1 Insight |
| **Flamme conquérante** (Brasier P14) | victoire en Assaut, `damage > 0`, soutien Dégâts valide (l. 314) | **aucune issue ne change** : Brasier blessait déjà toute Garde ordinaire dominée (14 − 12 = 2) ; seul le montant change (sans soutien 2 → 8 ; ×5 + ×4 : 18 → 72) |
| **Repoussement** (Basic, Entrave, Emprise, Racine, Rupture) | Garde victorieuse (`guardWin`, l. 310) | inchangé : la Garde qui perd n'a toujours aucun Repoussement |
| **Insight naturel de Garde** | Garde victorieuse (l. 256) | inchangé ; la phrase du §12 « même en absorbant tous ses dégâts » (Garde dominée par une Signature) n'a plus de cas |
| Écaille (Garde gagnante), Ténacité (Garde perdante), Cycle astral (victoire), Braise et Contrecoup (Assaut contre Assaut seulement), Silence, Détour, Relance | sans rapport avec la blessure | inchangés |
| **`zeroDamageRankWin`** (contrat 05 : « gagne au Rang, 0 blessure : absorbé par Garde ») | `winner && !guardWin && damage[perdant] === 0` (l. 245) | **n'a plus aucun cas** : un vainqueur en Assaut contre Assaut inflige `P × M ≥ 3`, contre une Garde au moins `1 × M`. Le champ reste dans le rapport (même forme), calculé par la même expression : il vaut toujours `false`, et un test le vérifie comme invariant ; la chorégraphie et le message de ce cas ne s'affichent plus |
| **« Garde absorbée »** (rapport `absorbed`, journal, temps forts, animation « ABSORBE n », contrat 05 §13.3) | `min(P_A, P_G)` (l. 202) | **`absorptionEffective`**, la même valeur partout |

## G-06 — Cas du contrat V3.0, du delta V3.2, du contrat 05 et de l'avenant 06 qui changent

Les textes historiques restent intacts ; pour ces passages, cet avenant fait foi.

| Passage | Avant | V3.3 |
|---|---|---|
| V3.0 §6.2, tableau, ligne « Assaut prioritaire » | `max(0, P_Assaut − P_Garde) × M_Assaut` | `(P_Assaut − min(⌈P_Garde / 2⌉, P_Assaut − 1)) × M_Assaut` |
| V3.0 §6.2, paragraphe : Signature P12 contre Garde IV P12 | priorité de la Signature, 0 blessure, pas de Repoussement | priorité de la Signature, **6 PV**, pas de Repoussement |
| V3.0 §6.3, dernier paragraphe : « contre Garde, le différentiel de Puissance positif » | `P_A − P_G` | `P_A − absorptionEffective`, au moins 1 |
| V3.0 §6.3, exemple Basic : ×7 contre Garde III ; Assaut IV seul contre Garde III ; contre Garde IV | 21 ; 3 ; la Garde gagne au Rang | **49** ; **7** ; la Garde gagne au Rang (inchangé : égalité) |
| V3.0 §7.1 : l'Amplification de Rang « ne donne aucun point de Puissance ; cette distinction est décisive contre Garde et Signature » | vrai | vrai (la Puissance imprimée fixe toujours les dégâts) ; elle ne peut plus produire une victoire sans blessure |
| V3.0 §7.2 et §8.4 : Signature P14 ×(5 + 4) contre Garde IV | 18 | **72** |
| V3.0 §8.4 : Brasier sans soutien contre Garde IV ; Voile ou Ronce P12 contre Garde IV | 2 ; « aucun dégât » | **8** ; **6** |
| V3.0 §12 : Garde dominée par une Signature « même en absorbant tous ses dégâts » | cas possible | plus de cas (la règle d'Insight ne change pas) |
| V3.0 §13.3 : « Résultat Basic provisoire : (12 − 9) × 1 = 3 » ; « dégâts provisoires 21 contre cette Garde » | 3 ; 21 | `(12 − 5) × 1 = 7` ; **49** |
| V3.0 §13.3 : « Signature ∞ domine la Garde, mais la blessure est absorbée : 0 PV » | message possible | **supprimé** (plus de cas) ; exemple de remplacement : « Assaut II domine la Garde IV : la Garde absorbe 5, 1 PV » |
| V3.0 §14.2 : Cendre IV contre Garde Ronce III ; « les blessures restent 3 » | 3 | **7** |
| V3.0 §14.3 : ×7 / ×3 / ×1 contre Garde III | 21 / 9 / 3 | **49 / 21 / 7** |
| V3.0 §14.5 : Brasier contre Garde IV, sans soutien / ×9 / soutien interféré | 2 / 18 / « blesse de 2 PV » | **8 / 72 / 8 PV** (Flamme échoue toujours sans soutien Dégâts valide) |
| V3.0 §14.7 : Convergence ×9 contre Garde III | 27 | **63** |
| V3.0 §16.2, invariant 11 | dégâts `max(0, P_A − P_G) × M` | `(P_A − min(⌈P_G/2⌉, P_A − 1)) × M` ; la phrase sur le score de Rang est gardée |
| V3.0 §16.4 : « A/G P12 contre Garde III P9 » | 3 dégâts | **7** (0 si la Garde remporte son Rang : inchangé) |
| V3.0 §16.4 : « Signature P14 avec ×5 + ×4 contre Garde IV P12 » | 18 | **72** (contre Assaut ordinaire : 126, inchangé) |
| V3.0 §16.4 : « Signature P12 contre Garde IV P12 » | priorité de la Signature, dégâts 0, pas de Repoussement | priorité de la Signature, **dégâts 6**, pas de Repoussement |
| V3.0 §18 (fiche d'une page) | « l'Assaut prioritaire inflige `max(0,P_A−P_G)×M` » | `(P_A − min(⌈P_G/2⌉, P_A − 1)) × M` |
| Delta V3.2 D-01, exemple : Garde Ronce II + Astre I (score 3) contre Cendre IV | subit 12 − 6 = 6 | subit **12 − 3 = 9** |
| Delta V3.2 D-04 : le journal distingue « Assaut domine au Rang, **mais 0 dégâts car Garde absorbe** » de « Garde victorieuse » et de « Clash sans vainqueur » | trois cas | **plus que deux cas autour de la Garde** : « Garde victorieuse » et « Assaut domine au Rang, la Garde absorbe a » (avec a et les PV perdus), plus « Clash sans vainqueur » |
| Delta V3.2 **D-05** (référence de non-régression) : Cendre III P9 + Cendre I en Rang (5 contre 4) contre Garde Cendre IV P12 | victoire au Rang, **0** | victoire au Rang, **3** (9 − 6) ; sans soutien, la Garde gagne (inchangé) |
| Contrat 05, état `zeroDamageRankWin` (« gagne au Rang, 0 blessure : absorbé par Garde ») | état à tester | **sans cas** en V3.3 ; remplacé par l'invariant « jamais vrai » |
| Avenant 06, AV-02 : « avec les Cendre de D-05, l'Assaut aurait 5 contre 4 (et infligerait 0) » | 0 | **3** (la référence neutre, où la Garde gagne, ne change pas) |

## G-07 — Cas de test prioritaires (non-régression de la V3.3)

Demandés par le responsable ; la colonne « Cartes » donne une main qui les produit.

| # | Situation | Cartes | Attendu |
|---|---|---|---|
| 1 | Assaut II P6, score 6, contre Garde IV P12, score 4 | Cendre II + Cendre III en Rang (2 + 4) contre Garde Cendre IV | victoire de l'Assaut, absorption effective 5, **1 dégât de base**, pas de Repoussement ni d'Insight de Garde |
| 2 | Même situation, multiplicateur ×5 | + Cendre IV en Dégâts (×5) | **5 dégâts** |
| 3 | Assaut III P9, score 5, contre Garde IV P12, score 4 (D-05) | Cendre III + Cendre I en Rang (3 + 2) contre Garde Cendre IV | absorption 6, **3 dégâts** |
| 4 | Garde IV, score 4, contre Assaut IV, score 4 | Cendre IV contre Garde Ronce IV | **Garde victorieuse** (égalité), 0 dégât, +1 Insight, droit de Repoussement |
| 5 | Garde renforcée au-dessus de l'Assaut | Garde Ronce III + Ronce I en Rang (3 + 2 = 5) contre Assaut Cendre IV (4), une Secondaire adverse en chargement | **blocage**, 0 dégât, +1 Insight, **Repoussement de la Secondaire en chargement** |
| 6 | Signature en Garde contre Signature en Assaut | Couronne de Ronce ∞ en Garde contre Brasier ∞ en Assaut | égalité ∞, **Garde victorieuse**, 0 dégât, Emprise possible |
| 7a | Le tableau G-03 | les 28 cases (7 Assauts × 4 Gardes) | valeurs du tableau, avec M = 1 et M = 3 |
| 7b | Étincelle, Ferveur, Flamme conquérante | exemples de G-05 | réussite ou échec comme en G-05 |
| 7c | Insight, Repoussement | cas 1 à 6 | Insight et Repoussement seulement pour une Garde victorieuse |
| 7d | `zeroDamageRankWin` | tous les duels IA contre IA des tests et du corpus d'empreintes | jamais vrai |
| 7e | Sauvegardes et replays | duel standard et duel d'aventure sauvegardés sous `V3.0+delta-V3.2` ; replay `lqv-replay/1` rejoué | reprise refusée avec sa raison (G-08), progression gardée ; un replay V3.3 rejoue à l'identique |
| 7f | Assaut contre Assaut, Garde contre Garde | tests existants | inchangés |

## G-08 — Versions, replays et sauvegardes

- **Étiquette des règles** : `V3.0+delta-V3.2` devient **`V3.0+delta-V3.3`** (état du moteur, `RULES` de la reprise).
  Le format `lqv-replay/1` et l'identifiant de catalogue ne changent pas.
- **Empreintes** : l'étiquette est dans l'état, donc toutes les empreintes changent. La preuve se fait en deux temps :
  formule seule d'abord (étiquette inchangée) : seuls changent les duels qui contiennent au moins un Clash où l'Assaut
  domine une Garde (les 28 cases de G-03 changent toutes) ; un duel sans un tel Clash garde son empreinte ; puis
  l'étiquette. On ne régénère que ce que la règle explique.
- **Duel en cours d'une sauvegarde d'avant la V3.3** (standard `lqv.save` ou aventure `lqv.aventure`) : sa reprise est
  **refusée avec sa raison** (« Règles différentes »), comme pour toute version différente, avec les choix qui existent
  déjà : en mode standard, recommencer ce duel depuis le début (même rival, même graine) ou le retirer sans qu'il compte ;
  dans l'aventure, le duel est retiré sans compter. La collection, la progression et l'état de l'aventure sont gardés. On
  ne garde pas deux formules dans le moteur.

## G-09 — Effet attendu sur l'IA, le calibrage et le simulateur de référence

- **IA des rivaux** : elle estime les dégâts avec `computeClash` (`src/game/ai/policy.ts`, l. 107 : une seule
  arithmétique pour le moteur, l'IA et la prévisualisation) ; elle suit donc la règle sans formule à reprendre. Ses
  profils (part d'Assauts, Techniques) et l'heuristique de Lecture (l. 170-171) restent tels quels. Attendu : la Garde qui
  perd la priorité rapporte moins ; les profils prudents (Maëlle, PNJ « timide ») et la Ronce s'affaiblissent, les
  profils offensifs et la Cendre se renforcent ; les duels raccourcissent (objectif du responsable). **À mesurer sur les
  mêmes graines, sans recalibrer.**
- **Calibrage de l'aventure** (`docs/m10/CALIBRAGE_M10A.md`, validé) : aucune valeur ne change avec cet avenant. Les taux
  de victoire mesurés (§3) vont bouger : ils sont remesurés avec le même outil et les mêmes graines
  (`tools/m10a-paliers.ts`, référence « avant » : `artifacts/qa/v33/avant/`), et tout écart est remonté au responsable,
  qui décide d'un recalibrage éventuel (nouvel amendement de l'annexe).
- **Championnat** : mêmes mesures (lignes « Championnat » de l'outil) ; ses formats ne changent pas.
- **Simulateur de référence** (`simulator_ref/simulator/SIMULATEUR_LES_QUATRE_VOIES_V3_2.html`, l. 162 et 218-220) :
  oracle V3.2, non modifié sans autorisation ; il garde l'ancienne formule et **diverge** sur l'Assaut contre Garde. Aucun
  test ne l'utilise. Il reste tel quel, comme trace historique ; la divergence est notée dans l'ADR 035.

## G-10 — Preuves exigées

- Les **cas de G-07**, chacun en test ; **chaque test existant modifié listé avec sa raison** ; aucun autre attendu changé.
- **Empreintes** : la preuve en deux temps de G-08, sur le corpus de `tools/m10a-empreintes.ts`.
- **Jeu par défaut au repos identique au pixel près** (`tools/l5-identique.mjs` contre le build du `main` de départ) ;
  textes du duel, de l'aide, des conseils, du tour guidé et du journal à jour ; absorption effective identique dans le
  rapport, le journal, les temps forts et l'animation.
- **Mesures d'équilibre avant et après, sur les mêmes graines** (Duel standard, rivaux, Championnat, aventure) : taux de
  victoire, longueur des duels, part des Gardes jouées ; jalon de QA sur les deux GPU.
