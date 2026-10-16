# LES QUATRE VOIES

## Règlement définitif du duel et concept RPG — V3.0

**Date de consolidation :** 15 octobre 2026  
**Statut :** règlement de base standard **figé pour l'implémentation**, catalogue initial validé  
**Remplace :** contrat V2.2 et avenants sur les règles devenues contradictoires  
**Périmètre :** 17 cartes et zones, déroulement du duel, Puissances/Rangs, Insight/Techniques, seize variantes, quatre Signatures, cas limites, interface, intégration RPG et matrice QA.  

> **Principe directeur :** le **Rang** gouverne la priorité ; la **Puissance** gouverne blessures et absorption ; les **Secondaires** construisent l'attaque, la défense et les contres ; les **Signatures ∞** changent les styles plutôt que de détruire l'équilibre ; les choix secrets et simultanés font la profondeur tactique.

**Légende :** **DÉFINITIF** = mécanisme ou valeur approuvés pour le catalogue jouable de référence. **REPÈRE RPG** = exemple non imposé à chaque personnage. **CONTENU FUTUR** = enrichissement narratif/collection/IA qui ne bloque pas la complétude du moteur standard. Les tests de combinatoire et scénarios déterministes ne prouvent pas l'équilibre compétitif de toutes les stratégies futures.

---

# 1. Identité et ambition du jeu

## 1.1 Expérience centrale — FIGÉ

**Les Quatre Voies** est un jeu de duel de cartes original, au cœur d'un RPG dans **une seule grande ville vivante**. Le joueur commence comme duelliste inconnu, rencontre des adversaires dans les rues et quartiers, collectionne les variantes de cartes, apprend des Techniques, rejoint des clubs, affronte des rivaux et progresse vers les tournois officiels et le rang de meilleur duelliste. La ville se renouvelle selon les activités, défis, événements et itinéraires des personnages. Le duel doit être intéressant **même hors du cadre narratif**.

Piliers : apprentissage rapide, choix simultanés et secrets, bluff par les Secondaires révélées ou cachées, affrontements actifs à chaque tour, recherche d'ouvertures, attaques normales / renforcées / ultimes, contre-jeu par Garde et Interférence, valeur des cartes Basic, maîtrise plutôt que simple inflation de statistiques, collection à forte identité et rivalités récurrentes.

## 1.2 Ancien concept explicitement écarté — FIGÉ

Sont **absents** du noyau V3.0 : mise/ante/pot financier, Petite/Grosse, Call/Raise/Fold/Commit, famille centrale et double famille centrale, Sang-froid, « Parade d'urgence » depuis la main, Écho et accumulation de bonus sur égalités. Le mot *Commit* éventuellement utilisé par le logiciel désigne uniquement le verrouillage technique d'une décision, **pas** l'ancienne mécanique de mise. Les paris ou monnaies peuvent exister dans la fiction sans gouverner les règles de combat.

---
---

# 2. Matériel, familles, Rangs et Puissances — DÉFINITIF

## 2.1 Constitution du deck

Chaque deck standard équipé possède **exactement 17 cartes physiques/logiques distinctes** : **16 ordinaires** (une par famille × rang I, II, III, IV) et **une Signature ∞**. La possession de plusieurs variantes n'autorise jamais plusieurs copies d'une même identité ordinaire dans le deck. La Signature est une dix-septième identité distincte. Chaque carte ne peut se trouver qu'à un endroit à la fois.

| Famille | I | II | III | IV | Orientation des effets |
|---|---|---|---|---|---|
| Cendre ◆ | Cendre I | Cendre II | Cendre III | Cendre IV | Pression, prise de risque offensive |
| Voile ◈ | Voile I | Voile II | Voile III | Voile IV | Information, camouflage et perturbation |
| Ronce ✿ | Ronce I | Ronce II | Ronce III | Ronce IV | Garde, contrôle et préservation |
| Astre ✦ | Astre I | Astre II | Astre III | Astre IV | Adaptation, recirculation, synergies |

Il n'existe pas de supériorité élémentaire universelle d'une famille sur une autre ; l'affinité de famille n'intervient automatiquement que dans le coefficient d'Amplification des dégâts.

## 2.2 Rang et Puissance sont deux statistiques différentes

- **Rang imprimé** : I=1, II=2, III=3, IV=4, servant à déterminer la priorité et la contribution de l'action « Amplifier le rang ». Les Signatures utilisent la priorité spéciale **∞**, non arithmétique.
- **Puissance imprimée** : dégâts offensifs de base et valeur d'absorption en Garde ; les actions Basic d'Amplification de rang n'augmentent jamais cette Puissance.

| Rang ordinaire Basic | Valeur de Rang | **Puissance officielle de référence** |
|---|---:|---:|
| I | 1 | **3** |
| II | 2 | **6** |
| III | 3 | **9** |
| IV | 4 | **12** |

**Décision V3 :** la progression **3 / 6 / 9 / 12** remplace définitivement le tableau illustratif 3/5/8/12 de la V2.2 dans la base actuellement jouable. Le moteur ne doit pas utiliser les anciens chiffres, y compris dans les tests. Les variantes conservent normalement ces Puissances ; toute modification doit être une exception **imprimée et explicitement chiffrée** dans un futur contenu. La rareté n'applique jamais un bonus de Puissance automatique.

**Notations** : `R` = Rang imprimé ; `C` = score de confrontation (`R_Primaire + Σ R_Secondaires en Rang non annulées`) ; `P` = Puissance imprimée, avec modificateurs individuels explicitement nommés ; `m` = coefficient de dégâts d'une Secondaire ; `M` = multiplicateur total ; `PV` = vie restante, `PV_max` = capacité du personnage. **Aucune statistique Pénétration, Force, Défense ou réserve de dégâts distincte** n'existe dans le noyau.
---

# 3. Main, pioche, défausse et conservation des cartes

## 3.1 Main et pioche — FIGÉ

- Main initiale : **4 cartes**.
- Début de **chaque tour** : compléter la main **jusqu'à 4** (piocher seulement les cartes manquantes, sans remplacer gratuitement des cartes conservées).
- Chaque joueur doit engager **une Primaire par tour** issue de sa main et peut en plus poser **zéro ou une nouvelle Secondaire**, de carte distincte, pendant le même engagement initial.
- Les Primaires sont normalement consommées et envoyées à la défausse à la fin du Clash ; les Secondaires non consommées restent sur le terrain.
- Lorsque la pioche ne suffit pas, **remélanger sa défausse personnelle** pour continuer la pioche. Jamais de duplication : les cartes en main, sur le terrain ou engagées ailleurs ne se trouvent pas simultanément dans la pioche.
- Une Signature consommée suit normalement la défausse et le recyclage : **« unique dans le deck » ne signifie pas « une fois par duel »**. Une exception d'usage unique nécessiterait un texte individuel explicite.
- Les défausses ordinaires sont publiques après révélation ; les cartes encore cachées ne sont pas révélées par leur seule présence en réserve.

**RACCORDEMENT DÉFINITIF :** lorsque le Repoussement ou un effet porte exceptionnellement la main au-delà de quatre, les cartes surnuméraires restent en main jusqu'au **début du prochain tour** du propriétaire. Il choisit alors de défausser l'excédent pour revenir à quatre **avant** toute éventuelle pioche ; aucune carte n'est jetée silencieusement et il n'existe pas de « pioche négative ».

## 3.2 Absence de duplication et responsabilité des cartes — FIGÉ

À chaque instant, une carte appartient à une unique zone logique : pioche, main, Primaire engagée, Secondaire en chargement, Secondaire en réserve inactive, Secondaire active ou défausse. Un Repoussement renvoie la carte **à son propriétaire** ; il ne la transfère pas à l'adversaire. Une carte renvoyée doit être reposée ultérieurement et refaire son chargement.

---
---

# 4. Terrain et cycle d'une Secondaire

## 4.1 Emplacements par joueur — FIGÉ

```text
                     [ PRIMAIRE ]
                 Assaut / Garde, 1 par tour

       [ SECONDAIRE 1 ]       [ SECONDAIRE 2 ]
      cachée ou active       cachée ou active

  [ main ] [ pioche ] [ défausse ]   PV   Insight
```

- **Une Primaire obligatoire**, temporaire ; elle est choisie secrètement puis révélée.
- **Deux emplacements persistants de Secondaires**, ni trois ni une réserve séparée.
- **Au maximum une pose de Secondaire par tour**, facultative et additionnelle à la Primaire obligatoire. Deux Secondaires peuvent être activées/utilisées pendant le même Clash si elles ont été préparées lors de tours antérieurs.
- Une Secondaire nouvellement posée ne peut **jamais** être utilisée pendant son tour de pose, y compris si un effet générique annonce une « activation » ; aucune exception de charge n’existe dans le catalogue initial V3.

## 4.2 Trois états à distinguer — FIGÉ

| État | Apparence | Action de Clash possible ? | Interaction usuelle |
|---|---|---|---|
| **Chargement**, tour T | Face cachée | **Non** | Repoussement d'une Garde victorieuse |
| **Réserve inactive**, à partir de T+1 | Face cachée par choix | **Non** | Repoussement d'une Garde victorieuse |
| **Active / prête** | Face visible, volontairement révélée | **Oui**, après révélation des Primaires | Conserver, Amplifier, Interférer ; cible possible d'une Interférence à l'utilisation |

L'état « engagée pour action » est un **état transitoire de résolution**, pas un quatrième emplacement ni une action de préparation. Une carte peut rester cachée autant de tours que souhaité après chargement ; le propriétaire protège ainsi son identité mais renonce temporairement à ses fonctions. Une carte volontairement révélée reste **face visible** jusqu'à consommation ou retrait ; on ne la recache pas simplement par préférence, sauf capacité individuelle l'indiquant explicitement.

## 4.3 Révélation volontaire — FIGÉ

Au **début d'un tour ultérieur** à sa pose, avant de connaître les Primaires de ce tour, chaque joueur peut révéler zéro, une ou deux Secondaires dont le chargement est achevé. Les choix sont verrouillés, puis appliqués simultanément. Leur famille, rang, Puissance et texte de variante deviennent publics, sauf effet de dissimulation **explicitement** activé au dévoilement. C'est le **premier moment d'activation** des effets de Secondaires adaptés à la préparation.

Révéler une Secondaire **ne compte pas** comme poser une nouvelle Secondaire. Le joueur ne présélectionne pas à cette étape son mode d'utilisation futur : le mode exact (Rang, Dégâts, Interférence, Conserver) est choisi **après** la révélation des Primaires et reste secret jusqu'à validation simultanée.

## 4.4 Remplacement sur terrain plein — DÉFINITIF

Lors de l'**engagement initial** (et non après la révélation des choix tactiques), un joueur dont les deux emplacements sont occupés peut **défausser une seule** de ses Secondaires pour libérer une place et poser **une seule nouvelle** Secondaire face cachée. L'ancienne carte remplacée ne participe pas au Clash et ne déclenche pas d'effet d'utilisation ; elle est révélée lorsqu'elle rejoint la défausse publique, même si elle était auparavant face cachée. Le remplacement ne donne jamais droit à deux nouvelles poses, n'efface pas le chargement et n'introduit pas de troisième emplacement virtuel. Le choix de remplacement est simultanément verrouillé avec les engagements adverses.
---

# 5. Chronologie définitive d'un tour

Chaque joueur accomplit sa décision obligatoire en parallèle avec l'adversaire. Les étapes de calcul sont des **événements moteur**, non de nouvelles phases proposant chacune un bouton. Les choix secrètement verrouillés sont révélés ensemble.

| Ordre | Phase | Ce qui se produit |
|---:|---|---|
| 1 | Début / main | Réguler à quatre cartes s'il existe un excédent, puis piocher jusqu'à quatre ; Techniques précoces **Sondage** ou **Recentrage**, si équipées et payées |
| 2 | Préparation des Secondaires | Choix secret puis révélation simultanée des Secondaires anciennes chargées ; effets automatiques de révélation ; éventuellement **Dissipation** sur un effet encore actif |
| 3 | Engagement initial | Chaque joueur engage secrètement **une Primaire** Assaut/Garde et, facultativement, **une nouvelle Secondaire** face cachée ; remplacement éventuel d'un emplacement plein ; verrouillage simultané |
| 4 | Lecture | Micro-fenêtre exclusivement réservée à **Lecture** : découverte privée du mode initial et éventuel changement du **mode** de sa Primaire ; si double Lecture, modifications simultanées |
| 5 | Révélation Primaire | Affichage simultané des deux Primaires, famille, rang, Puissance, mode et effet ; les effets de Primaire / Signature sont armés ou appliqués s'ils sont instantanés |
| 6 | Choix tactique | Sur chacune de ses Secondaires **déjà actives**, choisir secrètement **Conserver, Rang, Dégâts** (seulement si Primaire Assaut) ou **Interférer** (+ cible) ; une Technique facultative **Ancrage** ou **Rupture** peut être déclarée/payée ici ; verrouillage simultané |
| 7 | Résolution sans réaction libre | Révéler les modes/cibles ; tester en une passe les Interférences, appliquer leurs annulations ; calculer priorité/Rang, issue, `M`, dégâts et effets conditionnels ; appliquer les dommages simultanés, soins, gains d'Insight et destinations spéciales |
| 8 | Conséquences et nettoyage | Réaliser le Repoussement gagné et les effets de contrôle (choix de cible sans contre-réaction), constater K.-O. ou prolongation ; défausser les Primaires et Secondaires consommées, expirer les effets et commencer le tour suivant |

**Règles de verrouillage :** une nouvelle Secondaire en chargement n'est pas utilisable lors de ce tour. Une ancienne face cachée et non volontairement révélée est inactive. La sélection d'une cible lors de l'application d'un Repoussement **n'est pas une nouvelle fenêtre tactique** : l'effet s'active automatiquement si ses conditions sont réunies, puis son propriétaire sélectionne la cible légale sans réponse adversaire ; faute de cible l'effet n'a pas de conséquence. Le logiciel peut prévoir une sélection anticipée ou un choix lors de la conséquence, mais la disponibilité des informations doit rester identique et aucun effet concurrent ne peut être réactivé à cette occasion.

**Techniques :** au maximum une Technique **par joueur et par tour**, toutes fenêtres cumulées. Le coût en Insight est prélevé au moment de sa **déclaration**, avant la connaissance du résultat ; un effet conditionnel raté ne rembourse rien. Les gains d'Insight issus du Clash n'arrivent qu'après la fenêtre tactique et ne permettent pas de payer une Technique du même tour. Les choix simultanés, dont Lecture contre Lecture, ne divulguent aucune modification finale avant leur verrouillage.
---

# 6. Confrontations, dégâts et Repoussement — DÉFINITIF

## 6.1 Priorité et score

Une Primaire ordinaire a `C = Rang Primaire + somme des Rangs imprimés des Secondaires utilisées pour Amplifier le rang et non annulées`. Deux soutiens en Rang s'additionnent. Le bonus de famille ne s'applique pas à cette action. Le score `C` **n'augmente jamais** la Puissance de la Primaire ou de la Garde. Une Signature ∞ bat tout score ordinaire ; deux ∞ ont la **même** priorité.

## 6.2 Les trois types de Clash

| Modes opposés | Résolution obligatoire |
|---|---|
| **Assaut / Assaut** : priorités différentes | Le plus fort inflige `P_Primaire × M` à l'autre ; le perdant n'inflige aucun dégât Basic |
| **Assaut / Assaut** : priorités égales | Chacun inflige **simultanément** à l'autre **ses propres** `P × M` ; pas de victoire attribuée |
| **Assaut / Garde** : Assaut prioritaire | L'Assaut gagne et inflige `max(0, P_Assaut − P_Garde) × M_Assaut` |
| **Assaut / Garde** : priorité Garde supérieure **ou égale** | La Garde gagne ; zéro dégât ; Repoussement Basic éventuel |
| **Garde / Garde** | Zéro blessure Basic, aucune victoire, aucun Repoussement Basic |

En Assaut/Garde, la comparaison de priorité vient **avant** l'absorption. Une Signature ∞ en Assaut gagne la priorité contre une Garde ordinaire IV même si elle inflige **zéro** blessure, par exemple Puissance 12 contre Garde IV Puissance 12 : la Garde n'obtient pas de Repoussement. Une égalité de deux Signatures ∞ suit les règles habituelles du mode (A/A = dommages croisés ; A/G = Garde gagne).

**Dommage positif** signifie strictement au moins 1 PV retiré par la résolution, et non une victoire de Rang. Les effets « gagne le Clash » sont faux lors d'un A/A à égalité, même si les deux blessent. Un effet fixe tel que Contrecoup peut créer une blessure sans convertir la défaite de Rang en victoire.

## 6.3 Amplifications de dégâts

Une Secondaire active choisie pour **Amplifier les dégâts** n'est utilisable que si sa Primaire est en Assaut. Son coefficient normal est `m = Rang Secondaire +1 si même famille que la Primaire, sinon Rang Secondaire`. Les deux coefficients valides **s'additionnent** : `M=1` sans soutien valide ; `M=m1` avec un soutien ; `M=m1+m2` avec deux soutiens. **Jamais `m1×m2`.** Un texte individuel de variante peut explicitement substituer un coefficient particulier ; il doit rester fini et contrable par Interférence.

| Rang Secondaire | Famille différente | Même famille |
|---|---:|---:|
| I | ×1 | ×2 |
| II | ×2 | ×3 |
| III | ×3 | ×4 |
| IV | ×4 | ×5 |

Un soutien Dégâts contribue à `M` mais jamais au score `C`. Un soutien Rang contribue à `C` mais jamais à `M`. Deux Secondaires peuvent choisir des modes différents. Sans soutien, les dégâts d'une Primaire gagnante contre un Assaut inférieur valent sa Puissance imprimée ; contre Garde, le **différentiel** de Puissance positif.

**Exemple Basic** : Assaut Cendre IV P12 + Cendre III ×4 + Cendre II ×3 = **84 PV** contre un Assaut ordinaire dominé et **21 PV** contre Garde III P9, si l'Assaut domine. Un Assaut IV seul contre Garde III inflige **3 PV** ; contre Garde IV, la Garde gagne au Rang et bloque.

## 6.4 Repoussement Basic

Une Garde **victorieuse contre Assaut** peut renvoyer **une** Secondaire adverse **face cachée** (chargement ou réserve inactive) dans la main de son propriétaire. La carte renvoyée devra être reposée lors d'un futur tour et recommencer son chargement. Le Repoussement Basic n'atteint pas une Secondaire **active face visible**, sauf carte / Technique exceptionnelle explicitement autorisée ; il ne déclenche aucune seconde Interférence. Si aucune cible admissible n'existe, aucune carte n'est renvoyée.

## 6.5 Égalité kamikaze, K.-O. et soins

A/A à égalité : on calcule les deux blessures avec les soutiens encore valides puis on les inflige **simultanément** ; effets fixes de même impact également appliqués dans cette résolution. Les soins automatiques autorisés après impact sont traités avant le bilan terminal de K.-O. Si les deux joueurs sont à 0 PV ou moins **après tous ces effets**, déclencher la prolongation décrite en section 9 ; aucun vainqueur par PV initiaux ou premier ordre d'animation.
---

# 7. Les quatre décisions concernant chaque Secondaire active

Une Secondaire active peut être **Conservée**, ou être **consommée** pour **Amplifier le rang**, **Amplifier les dégâts** ou **Interférer**. Ce sont les seuls choix tactiques universels. Les effets des variantes et des Signatures **n'ajoutent pas un cinquième bouton normal**.

## 7.1 Amplifier le rang — FIGÉ

- Utilisable en **Assaut ou Garde**.
- Bonus = **Rang numérique imprimé** de la Secondaire, ajouté au score `C` de la Primaire.
- Aucun bonus de famille sur cette action Basic.
- Deux Secondaires en rang s'additionnent.
- La Secondaire est engagée, donc **consommée**, même si son bonus est annulé par Interférence ou ne suffit pas à gagner.
- Ne donne **aucun point de Puissance** supplémentaire ; cette distinction est décisive contre Garde et Signature.

## 7.2 Amplifier les dégâts — FIGÉ, formule définitive V3

Seulement si la Primaire joue **Assaut**. Toute Secondaire active peut le faire **quelle que soit sa famille**.

`m_i = Rang numérique de la Secondaire + 1 si elle appartient à la même famille que la Primaire ; sinon Rang numérique`.

| Rang de Secondaire | Autre famille | Même famille |
|---|---:|---:|
| I | ×1 | ×2 |
| II | ×2 | ×3 |
| III | ×3 | ×4 |
| IV | ×4 | ×5 |

**FIGÉ : lorsque deux Secondaires amplifient les dégâts, on ADDITIONNE leurs coefficients, puis on multiplie la Puissance ou le différentiel de Puissances de la Primaire. On ne multiplie plus les coefficients entre eux.**

`M = 1 si aucune Secondaire dégâts n'est valide ; M = m_1 si une seule ; M = m_1 + m_2 si deux`.

**Exemples :**

- Cendre IV (P12), sans soutien : **12 PV** contre Assaut inférieur.
- Cendre IV (P12) + Cendre III en Dégâts (×4) : **48 PV**.
- Cendre IV (P12) + Cendre III (×4) + Cendre II (×3) : **12 × (4+3) = 84 PV** ; **pas** 144.
- Signature Cendre ∞ (P14) + Cendre IV (×5) + Cendre III (×4) : **14 × (5+4) = 126 PV** contre Assaut ordinaire ; **pas** 280.
- Même Signature contre une Garde IV (P12) : **(14−12) × (5+4) = 18 PV**, si l'Assaut domine le Rang et si les soutiens ne sont pas Interférés.

**Catégories narratives :** 0 Secondaire de dégâts = **attaque normale** ; 1 = **attaque renforcée / compétence** ; 2 = **attaque ultime**. Une attaque mixte Rang + Dégâts est possible et souvent moins explosive mais plus fiable. Deux Secondaires en Rang sont possibles ; deux en Interférence également si les cibles sont admissibles.

Les coefficients restent finis, sans plafond arbitraire. L'absence de plafond **n'est pas** une permission d'ignorer le contre-jeu ou l'équilibrage des effets individuels.

## 7.3 Interférer — FIGÉ

- Dans la **seule fenêtre tactique normale**, une Secondaire active peut cibler une **Secondaire adverse active et visible** (sauf camouflage de données précisément autorisé).
- Son Rang doit être **≥** Rang de la cible.
- Le joueur choisit secrètement la cible, puis valide avec ses autres décisions. Le mode d'utilisation de la cible n'est **pas** connu avant la validation simultanée.
- Si la cible est **effectivement engagée** dans ce Clash (Rang, Dégâts ou Interférence), son **action et ses effets individuels liés à cette utilisation** sont annulés ; les deux cartes engagées sont consommées.
- Si la cible est **Conservée**, l'Interférence échoue, l'interférente est consommée, la cible reste active.
- **Pas de distinction par mode ciblé** : une Interférence peut viser une autre Interférence, et non uniquement un amplificateur.
- Le Rang insuffisant contre une carte **normalement visible** interdit le ciblage dans l'interface. Face à un Rang **légalement masqué par un effet**, la tentative de cible à l'aveugle est permise ; le moteur vérifie au dévoilement, et une tentative insuffisante échoue en consommant la carte d'Interférence.

**RÈGLE DÉFINITIVE pour Interférences simultanées :** on évalue **toutes** les cibles et tous les usages initialement verrouillés en parallèle, puis on applique les annulations **une seule fois**. Deux Interférences valides qui se ciblent mutuellement sont toutes deux annulées et consommées ; il n'y a pas de chaîne récursive, pas de « contre du contre » et pas de réactivation rétrospective d'un effet annulé. Un moteur déterministe conservera les drapeaux d'annulation et les ressources consommées indépendamment du rendu des animations.

## 7.4 Conserver — FIGÉ

Une Secondaire active dont le propriétaire ne sélectionne aucun usage reste **visible, active, sur son emplacement et utilisable lors d'un tour ultérieur**. Elle peut disposer d'un effet de préparation encore persistant, si sa durée le prévoit. **Conserver** n'active pas un effet « à l'utilisation » et ne dépense pas la carte.

## 7.5 Comptabilité des Secondaires après le Clash — FIGÉ

- **Toutes les Secondaires engagées** vont normalement en défausse, **même** en cas de défaite de la Primaire, d'échec de condition, d'Interférence reçue ou d'Interférence inutile.
- Les Secondaires **Conservées** restent sur table.
- Une Secondaire nouvellement posée pendant le tour n'était pas activable et reste cachée, sauf Repoussement valide.
- Les effets individuels de récupération ou de sauvegarde peuvent modifier explicitement la zone finale sans ressusciter rétroactivement un effet annulé.

---
---

# 8. Les quatre Signatures fondatrices ∞ — DÉFINITIF pour le catalogue initial

## 8.1 Statut exceptionnel, règles ordinaires conservées

Le deck standard équipe **une seule Signature**, dix-septième carte unique. Elle ne peut **jamais** être Secondaire : uniquement **Primaire Assaut ou Garde**. Sa priorité **∞** bat toute Primaire ordinaire, même fortement amplifiée en Rang ; une autre Signature ∞ crée une **égalité de priorité**, sans comparaison de Puissance. Sa Puissance imprimée est **finie** ; elle reste absorbable par la Puissance d'une Garde. Aucune règle ne limite les Signatures à un seul amplificateur de dégâts : deux Secondaires autorisées, `M` additif normal.

Chaque Signature s'arme automatiquement lors de sa **révélation en Primaire** ; ses effets conditionnels sont appliqués seulement à leur instant valide. Plusieurs Signatures différentes peuvent exister par famille dans le contenu futur, mais une seule est équipée par deck.

## 8.2 Fiches des quatre Signatures initiales validées

| Nom et famille | Puissance | Effet unique automatique et conditions |
|---|---:|---|
| **Brasier Originel — Cendre ∞** | **14** | **Flamme conquérante** : si elle gagne en Assaut, inflige au moins 1 PV et a bénéficié d'au moins **une** Secondaire Dégâts **non annulée**, elle peut **Repousser une** Secondaire adverse **cachée** (chargement ou réserve). Si aucune cible n'est cachée, pas d'effet supplémentaire. |
| **Miroir du Voile — Voile ∞** | **12** | **Clairvoyance voilée** : à la révélation de la Primaire, révèle **privément** au propriétaire une carte aléatoire encore en main adverse, puis l'identité de la **plus ancienne** Secondaire adverse cachée s'il en existe ; égalité d'ancienneté départagée par l'emplacement de gauche. Aucune décision tactique future n'est révélée. |
| **Couronne de Ronce — Ronce ∞** | **12** | **Emprise** : si elle remporte une Garde contre Assaut, peut **Repousser une** Secondaire adverse restée sur le terrain, cachée **ou** active non consommée ; une seule cible totale, pas de Repoussement Basic supplémentaire. |
| **Convergence Astrale — Astre ∞** | **13** | **Cycle astral** : si elle remporte le Clash et qu'**exactement une** de ses Secondaires engagées reste **non annulée**, ayant servi à **Amplifier les dégâts** ou à **Interférer avec succès**, place cette Secondaire au **sommet** de sa pioche personnelle au lieu de la défausse. Une Secondaire Rang seule ne satisfait pas la condition ; deux soutiens valides ne la satisfont pas. |

## 8.3 Décisions de raccordement propres aux Signatures

- **Flamme conquérante** : l'effet est déclaré à la révélation mais n'est appliqué qu'après confirmation de la victoire, de la blessure positive et du soutien Dégâts non annulé. Le Repoussement vise une cible encore cachée au moment de la conséquence ; si le joueur en a plusieurs, il en désigne une sans ouverture de réaction. Il **ne** fonctionne pas contre une Garde ∞ gagnante, ni sur une égalité A/A entre Signatures.
- **Clairvoyance voilée** : l'information est instantanée et **ne peut pas être « retirée » de la mémoire** par Silence ou Dissipation après résolution. Le propriétaire voit les identités, l'autre joueur voit qu'un effet a révélé des informations, pas les valeurs apprises. Si la main ou le terrain caché est vide, la partie correspondante ne fait rien.
- **Emprise** : une Secondaire déjà consommée lors de ce Clash n'est plus sur le terrain et ne peut être la cible du Repoussement ; les Secondaires nouvelles en chargement sont admissibles. Repousser une carte active renvoie la carte à la main, sans lui garder son état prêt. Une **Garde contre Garde** ne déclenche pas Emprise.
- **Cycle astral** : le retour en pioche intervient **au nettoyage**, sans conserver son état actif ni créer de copie. Si la défausse devait être remélangée, la carte déjà placée au sommet ne rejoint pas la défausse ; elle sera piochée selon l'ordre normal. Une Interférence annulée n'est pas une Interférence réussie pour l'effet individuel de Cycle. Si deux Secondaires étaient engagées mais qu'une seule a survécu à l'annulation, la condition « exactement une non annulée » peut être satisfaite.
- **Voile IV « Silence »** peut arrêter la **conséquence non encore appliquée** d'une Signature selon ses conditions, mais ne supprime pas sa priorité ∞, la Puissance imprimée, le mode de la Primaire, ni une information déjà révélée.

## 8.4 Exemples numériques

Brasier P14 avec Cendre IV ×5 et Cendre III ×4 : `M=9`, soit **126 PV** contre un Assaut ordinaire dominé ; contre Garde IV P12, **(14−12)×9 = 18 PV**. Sans soutien, Brasier contre Garde IV ne cause que **2 PV**, et Flamme conquérante n'est pas satisfaite. Voile ou Ronce P12 face à Garde IV P12 dominent la priorité ordinaire mais n'infligent **aucun** dégât. Deux Signatures en Assaut ont même priorité ∞ et s'échangent leur Puissance propre × M.

**Décision d'équilibrage :** les valeurs initiales sont donc **Cendre 14 / Voile 12 / Ronce 12 / Astre 13**. Il ne s'agit **pas** d'une fourchette réglementaire imposée aux futures Signatures ; chacune devra être validée individuellement.
---

# 9. Points de vie, durée des duels et mort subite — DÉFINITIF

## 9.1 PV propres aux personnages

Les duellistes n'ont **pas** de réserve PV universelle ni nécessairement les mêmes PV maximums. Leur évolution dépend du personnage et de la progression RPG. Un tournoi **n'égalise jamais automatiquement** les PV, sauf règle d'événement explicitement annoncée à tous avant l'inscription.

| Profil illustratif de calibration | PV de référence |
|---|---:|
| Débutant | ~60 |
| Quartier | ~90 |
| Compétiteur | ~125 |
| Champion | ~170 |
| Maître | ~200 |

Ces chiffres sont des **repères de tests**, **pas** des classes, plafonds, seuils obligatoires ni une courbe réglementaire. Un champion de 120 PV et un champion de 180 PV sont tous deux possibles. Le niveau doit aussi résulter des variantes, Signatures, Techniques et stratégies, non d'une multiplication de PV.

## 9.2 Rythme adaptatif, pas de durée imposée

**Règle validée :** la durée varie **naturellement** selon les décisions, la stratégie, l'adversaire et l'événement. Aucune réduction secrète de dégâts, aucun ajustement artificiel des PV et aucun nombre de tours imposé pour un type de combat. Les rencontres ordinaires peuvent être rapides ; les confrontations de champions peuvent être longues. Mesurer la durée des duels et surveiller les boucles défensives est un objectif de qualité, pas une limite mécanique.

## 9.3 K.-O. et prolongation

- À la fin de la résolution **simultanée** des impacts et effets applicables, si un seul joueur est à zéro PV ou moins, il perd ; l'autre gagne.
- Si les deux joueurs sont à zéro PV ou moins **dans la même résolution**, aucun n'est favorisé par l'ordre d'animation ou ses PV initiaux : **mort subite / prolongation**. Tous deux repartent à **1 PV**, mais les mains, les pioches, les défausses, les Secondaires non dépensées, les Techniques déjà utilisées et l'Insight conservent leurs états normaux après nettoyage. Le tour suivant recommence normalement.
- Toute nouvelle mort simultanée renvoie à **1 PV chacun**, sans remonter toute la bataille à l'état initial. Le premier K.-O. **unilatéral** termine le duel.
- Il n'y a **pas** de limite arbitraire de répétitions ni de victoire automatique attribuée à celui qui avait davantage de PV. Les duels restent terminables par l'action des joueurs ; en cas d'inactivité volontaire répétée (deux Gardes permanentes), aucun résultat n'est fabriqué par le moteur. Un abandon explicite hors Clash peut terminer une session.

Les effets de soins après blessure, s'ils sont décrits explicitement, sont appliqués dans leur fenêtre autorisée avant l'arbitrage de fin de duel, sans dépasser `PV_max`. À l'entrée d'une nouvelle mort subite, l'Insight **n'est pas automatiquement remis à zéro** et les Secondaires restantes ne sont pas retournées gratuitement en main.
---

# 10. Architecture unique des effets — DÉFINITIF

## 10.1 Deux moments pour les Secondaires, aucun menu supplémentaire

1. **Révélation volontaire** d'une Secondaire chargée au début d'un tour ultérieur à sa pose : son effet de préparation se **déclenche automatiquement**, par exemple information ou dissimulation temporaire. Une carte déjà visible et simplement **Conservée** ne se « révèle » pas une deuxième fois.
2. **Utilisation tactique** d'une Secondaire **déjà active**, après révélation des Primaires : lorsque le joueur choisit Rang / Dégâts / Interférer, l'effet associé à ce mode est **armé automatiquement**. Sa conséquence n'arrive que si ses conditions finales sont remplies (victoire réelle, dégâts positifs, Interférence réussie...). Si l'utilisation est Interférée, l'effet individuel correspondant échoue.

**Primaire et Signature** : leur effet propre est déclenché au moment **existant** de la révélation des Primaires, puis éventuellement appliqué plus tard après vérification du résultat. Ce n'est pas une nouvelle action, une nouvelle statistique ou une troisième phase de choix de Secondaire.

Le vocabulaire de statut est **ARMÉ → RÉUSSI / CONDITION NON REMPLIE / ANNULÉ**. Une capacité conditionnelle peut être annoncée avant de savoir si elle réussira ; elle ne doit jamais annoncer un succès anticipé. Une capacité de préparation persistante peut rester active plusieurs tours, **uniquement** si le texte le précise, et cesse à sa date d'expiration, à la consommation ou au retrait de sa source.

## 10.2 Contrer au bon instant

- **Interférence Basic** : action de Secondaire dans l'unique fenêtre tactique après révélation des Primaires. Elle vise une Secondaire adverse **active** avec `Rang cible ≤ Rang Interférente` ; elle **annule son usage et son effet individuel d'utilisation** si la cible était effectivement engagée. Elle ne frappe pas une cible **Conservée**, ni une carte encore cachée. Les deux cartes engagées sont normalement consommées.
- Les Interférences réciproques sont testées sur un **instantané unique** des intentions. Elles peuvent être toutes deux valides et s'annuler **en parallèle**, sans chaîne ni récupération rétroactive d'une action. Leur succès de ciblage compte pour le gain **naturel** d'Insight, mais pas pour le pouvoir individuel d'une carte dont **l'utilisation** a elle-même été annulée.
- **Dissipation**, Technique Insight de préparation, peut neutraliser un **effet de révélation persistant encore actif** sur une Secondaire adverse, sans mettre la carte en défausse ni empêcher ses actions de Clash. Il n'existe pas de deuxième fenêtre générale d'Interférence en préparation. Une information déjà vue ou un acte instantané déjà résolu ne peut pas être « désappris ».
- Les exceptions explicites de catalogue, comme **Silence** qui supprime un effet individuel de Primaire encore **en attente**, sont strictement limitées par leur texte. Silence ne révoque ni Rang ∞ ni révélation d'information déjà exécutée.

## 10.3 Ordre moteur obligatoire, sans chaîne récursive

1. Conserver la **photographie immuable** des choix et cibles secrètement verrouillés ; appliquer les effets instantanés antérieurs de révélation.
2. Révéler les usages des Secondaires ensemble ; tester toutes les cibles d'Interférence selon les Rangs imprimés (y compris ciblage aveugle autorisé par camouflage), modes et états au verrouillage ; marquer les actions annulées en **une seule passe**.
3. Déterminer les effets d'utilisation survivants et les exceptions telles que Silence, sans effacer des effets déjà appliqués.
4. Construire le score de confrontation, comparer les priorités ordinaires ou ∞ et déterminer **victoire / défaite / égalité A/A / double Garde**.
5. Appliquer les modificateurs de dégâts autorisés **après** détermination de l'issue et **avant** ou **après** multiplication seulement si leur texte le définit ; calculer `M`, dégâts d'Assaut et de Garde. Les variantes approuvées Braise / Étincelle ajoutent des **dégâts fixes après** multiplication et absorption ; Contrecoup suit le même principe dans l'impact simultané.
6. Appliquer simultanément les dommages du Clash et les effets fixes du même impact ; traiter les effets « a blessé », les soins, Insight et destinations au moment autorisé.
7. Appliquer les Repoussements gagnés et les exceptions de destination de carte (sommet / dessous de pioche) ; établir K.-O. ou prolongation, puis nettoyer.

Un effet « si je gagne le Clash » n'a pas le droit de modifier rétroactivement la priorité qui a déjà défini sa propre réussite. Une modification **avant comparaison de rang** exigerait un texte spécifique indiquant cet instant ; **aucune** des vingt cartes du catalogue initial ne le requiert. Les effets qui modifient la destination d'une même carte sont mutuellement ordonnés : si plusieurs prétendent replacer une carte à la fois, appliquer son **effet individuel valide**, puis l'éventuel effet de la Signature ; une carte ne peut rejoindre qu'une seule zone finale. À défaut de conflit, toutes les cartes engagées rejoignent leur défausse respective.

## 10.4 Conditions, PV et visibilité

- **Gagner** = issue de Clash explicitement victorieuse ; une égalité Assaut/Assaut n'est pas une victoire.
- **Blesser** = infliger un nombre strictement positif de PV, même si la frappe a été modifiée par une capacité ; une Garde qui absorbe tout n'a pas été blessée.
- **Interférence réussie** = cible légalement atteinte et **engagée**, vérifiée sur la photographie commune ; l'effet individuel d'utilisation n'est appliqué que si sa propre Secondaire n'est pas annulée.
- **Carte active** = révélée et prête ; un camouflage autorisé peut cacher ses informations, pas son existence ni son emplacement.
- Une carte cachée n'émet aucun passif. Une variante Basic n'a **aucun** effet individuel additionnel. Une nouvelle Secondaire ne produit aucun effet de révélation / utilisation durant son tour de pose.
- Le nom de l'effet est visible sur la carte révélée et en alerte **au moment autorisé**, sans divulguer le choix secret d'utilisation avant la révélation tactique commune.
---

# 11. Raretés et catalogue des 16 variantes ordinaires — DÉFINITIF pour la sélection initiale

## 11.1 Un deck se spécialise, il ne multiplie pas les identités

Chaque identité famille × Rang possède une version **Basic** avec Rang/Puissance et les actions Basic, **sans** effet spécial. La collection peut offrir des variantes **Uncommon, Rare, Epic, Legendary** qui remplacent la version équipée d'une même identité ; **jamais une carte supplémentaire**. Les raretés désignent surtout la spécialisation et l'originalité, **pas** des augmentations automatiques du Rang ou de la Puissance. Il n'est pas prétendu qu'une Basic et une variante autrement identique munie d'un bonus positif possèdent une puissance compétitive strictement équivalente : la collection et les formats d'initiation créent une progression voulue, sans autoriser un pouvoir incontrable.

Une variante ordinaire peut légalement être jouée en Primaire ou Secondaire ; son **effet individuel** ne se déclenche que dans le rôle et au moment **imprimés**, mais ses fonctions Basic restent disponibles dans tous les cas. Les effets ci-dessous ont été approuvés comme **premier catalogue de seize variantes jouables**. D'autres variantes par identité pourront être ajoutées après tests de contenu, sans modifier le moteur.

## 11.2 Cendre ◆ — Pression offensive

| Rang, nom, rareté | Rôle et déclenchement | Effet définitif |
|---|---|---|
| **I — Étincelle**, Uncommon | Secondaire **Amplifier le rang** d'un Assaut | Si la Primaire gagne avec **exactement 1 point** de score d'avance et **blesse**, **+2 dégâts fixes après** multiplication/absorption. Ne marche pas si la Secondaire est Interférée. |
| **II — Braise**, Uncommon | Primaire **Assaut**, révélation | Si elle **gagne contre un Assaut** sans Amplification de dégâts valide, **+2 dégâts fixes après** le calcul normal. L'égalité A/A n'est pas une victoire. |
| **III — Ferveur**, Rare | Secondaire **Amplifier les dégâts** | Si la Primaire **Cendre** gagne et inflige des blessures positives, **+1 Insight** après le Clash, sous limite générale de **+1 gagné par tour** et réserve de 2. |
| **IV — Contrecoup**, Epic | Primaire **Assaut**, révélation | Si elle **perd contre un Assaut**, inflige malgré tout **3 dégâts fixes non multipliables**, simultanément à l'impact. N'inverse pas la victoire au Rang ; peut créer un double K.-O. |

## 11.3 Voile ◈ — Information et dissimulation

| Rang, nom, rareté | Rôle et déclenchement | Effet définitif |
|---|---|---|
| **I — Éclaireur**, Uncommon | Secondaire, **révélation volontaire** | Révèle **privément** une carte aléatoire encore en main adverse. Pas d'observation des décisions secrètes futures. |
| **II — Détour**, Rare | Secondaire **Interférer** | Si son Interférence d'utilisation réussit **et n'est pas annulée**, révèle privément une carte aléatoire de la main adverse après résolution du Clash. |
| **III — Dissimulation**, Epic | Secondaire, **révélation volontaire** | Masque à l'adversaire l'**identité, Rang et Puissance** de **l'autre** Secondaire du propriétaire déjà active ou révélée au **même début de tour**, jusqu'à la fin du tour. L'emplacement, l'état prêt et le nom « Dissimulation » restent publics ; les informations déjà vues ne sont jamais effacées de la mémoire. Si aucune autre Secondaire active n'existe, pas de camouflage. |
| **IV — Silence**, Legendary | Secondaire **Interférer** | Si elle Interfère avec succès contre une Secondaire ennemie **de Rang IV**, et que sa propre utilisation n'a pas été annulée, neutralise aussi **l'effet individuel encore en attente** de la Primaire adverse pour ce Clash. Ne neutralise ni Rang, ni Puissance, ni priorité ∞, ni révélation déjà appliquée. |

La carte masquée par Dissimulation reste ciblable par Interférence **à l'aveugle** : le moteur vérifie le Rang réel, sans afficher une statistique inventée. Dissipation peut neutraliser l'effet de préparation persistant ; elle ne retire pas de la mémoire humaine une carte observée avant camouflage.

## 11.4 Ronce ✿ — Garde et contrôle

| Rang, nom, rareté | Rôle et déclenchement | Effet définitif |
|---|---|---|
| **I — Racine**, Uncommon | Secondaire **Amplifier le rang** d'une Garde | Si la Garde gagne contre Assaut et effectue effectivement un **Repoussement**, le propriétaire de Racine voit **privément** l'identité de la Secondaire cachée renvoyée. Ne s'applique pas si la carte utilisée est Interférée. |
| **II — Écaille**, Rare | Secondaire **Amplifier le rang** d'une Garde | Si la Garde gagne contre Assaut, **soigne 2 PV après le Clash**, sans dépasser `PV_max`. Ne se déclenche pas sur double Garde ou si utilisée puis annulée. |
| **III — Entrave**, Rare | Primaire **Garde**, révélation | Si elle gagne contre Assaut et réalise un **Repoussement Basic** d'une carte cachée, place la cible **sous la pioche adverse** plutôt que dans la main. La carte n'est pas révélée publiquement. |
| **IV — Ténacité**, Epic | Secondaire **Amplifier le rang** d'une Garde | Si la Garde **perd** malgré l'Amplification et que Ténacité n'est **pas Interférée**, replace **Ténacité** sous la pioche personnelle au nettoyage au lieu de la défausse. Pas de bonus de Rang conservé ni d'effet rétroactif. |

## 11.5 Astre ✦ — Adaptation et récupération

| Rang, nom, rareté | Rôle et déclenchement | Effet définitif |
|---|---|---|
| **I — Repère**, Uncommon | Secondaire, **révélation volontaire** | Montre **privément** au propriétaire la carte actuellement au sommet de sa pioche. Cette information demeure mémorisable ; toute pioche ou mélange peut la rendre périmée. Si la pioche est vide, aucune identité de carte n'est inventée. |
| **II — Prisme**, Rare | Secondaire **Amplifier les dégâts** | Même avec une Primaire **d'une autre famille**, obtient **+1 d'affinité au coefficient**, comme si la famille correspondait. Contre Primaire Astre, le coefficient normal de même famille s'applique, **sans double +1**. |
| **III — Relance**, Epic | Secondaire **Interférer** | Si son Interférence de même usage réussit contre une **Secondaire adverse de Rang III**, et n'est pas annulée elle-même, place **Relance** au **sommet de sa pioche** au lieu de la défausse. Contre I, II, IV, aucun recyclage spécial. |
| **IV — Convergence**, Legendary | Secondaire **Amplifier les dégâts** | Si la Primaire est **d'une famille différente**, le coefficient de cette Secondaire est **×6 au lieu de ×4**. Avec une Primaire Astre, coefficient normal **×5**. Ne multiplie pas ce ×6 par un autre coefficient ; il s'additionne au second soutien. |

## 11.6 Verrous anti-abus

- **Effets non cumulables sur un même exemplaire** : une carte n'est jamais simultanément dans la pioche et sur le plateau. Repère, Relance, Ténacité et Cycle astral n'autorisent pas de copie ni d'utilisation immédiate sans respecter la charge des Secondaires.
- **Effet d'utilisation annulé** : aucune récupération personnelle liée à une Interférence ne survit si sa **propre** utilisation a été annulée, sauf exception expressément écrite ; Ancrage sauve uniquement la carte ciblée et non son bonus.
- **Silence** contre Signature **Voile** ne peut annuler sa révélation d'informations déjà exécutée ; contre Brasier, Ronce ou Astre, la conséquence conditionnelle encore pendante est supprimable.
- **Braise** et **Étincelle** sont des **bonus fixes après** formule de dégâts ; un futur effet multiplicateur ne peut les exploiter rétroactivement.
- **Ronce III Entrave** nécessite **un Repoussement Basic effectivement réussi**, pas l'absence de cible. La rareté n'autorise aucun cinquième mode de Secondaire.

Le catalogue initial représente 16 **variantes** distinctes auxquelles s'ajoutent les 16 Basic ordinaires. Tous les effets sont spécifiques à un rôle d'utilisation, pas des bonus permanents cachés dans la main.
---

# 12. Insight et les six Techniques — DÉFINITIF

## 12.1 Réserve, départ, gains, dépenses

| Élément | Valeur retenue |
|---|---|
| **Insight maximum simultané** | **2** (et non 3) |
| **Départ d'un duel standard** | **1** pour chaque joueur |
| **Duel d'initiation** | 0 peut être annoncé explicitement par le format pédagogique |
| **Gain naturel Basic** | **+1** après une **Garde gagnante contre Assaut**, ou une **Interférence légalement réussie** |
| **Effet d'une variante** | Peut donner +1 selon texte, mais **ne cumule pas** au-delà du gain maximal |
| **Gain maximal par joueur et tour** | **+1 au total**, toutes sources confondues, et jamais au-dessus de **2 en réserve** |
| **Dépense** | **Une seule Technique déclarée par tour**, payée immédiatement selon sa fenêtre ; perte du coût même en cas d'échec de condition |
| **Équipement** | **Deux Techniques équipées** au maximum, choisies avant le duel ; nombre de Techniques **connues** évolutif dans le RPG |
| **Changement de duel** | Insight réinitialisé à la valeur annoncée par le format ; connaissances / équipements ne sont pas automatiquement effacés |

Une Garde contre Garde ne donne pas d'Insight Basic. Une Garde ordinaire qui perd la priorité face à une Signature ∞, même en absorbant tous ses dégâts, ne donne pas de gain naturel de Garde. L'Interférence qui manque une cible **Conservée**, cachée ou hors Rang ne donne pas de gain naturel. **Interférences réciproques** : si les deux ciblages étaient valides et les deux cibles engagées, **les deux joueurs gagnent l'Insight naturel** malgré l'annulation réciproque ; en revanche leurs effets de cartes déclenchés par l'utilisation annulée ne réussissent pas. Cette précision est explicite et ne crée aucune action supplémentaire.

**Aucun gain futur ne finance un coût passé dans le tour en cours.** Une Technique à coût 2 vide la jauge si elle était pleine. Insight n'augmente jamais automatiquement `C`, `P` ou `M`.

## 12.2 Catalogue complet de Techniques apprenables

| Technique | Coût | Instant d'utilisation | Effet précis |
|---|---:|---|---|
| **Sondage** | **1** | Début / avant engagement | Observe **privément** une carte **aléatoire** actuellement en main adverse ; ne garantit pas qu'elle sera jouée en Primaire. |
| **Recentrage** | **1** | Début / avant engagement | Choisit une carte de sa **main**, la place **sous sa pioche**, puis **pioche une carte** selon la règle habituelle de recyclage ; n'augmente pas le nombre de cartes en main. |
| **Lecture** | **2** | Après engagement des Primaires mais **avant leur révélation** | Observe le **mode initial** Assaut/Garde adverse puis peut **changer uniquement le mode** de sa propre Primaire engagée ; ne peut échanger la carte ni modifier la pose secondaire. |
| **Ancrage** | **1** | Pendant la fenêtre tactique, avec une Secondaire active que l'on engage | Désigne **une** de ses Secondaires utilisées. **Si** l'Interférence adverse annule son utilisation, la carte reste **sur son emplacement, active**, plutôt que défaussée ; son action et son effet d'utilisation restent annulés. Sans Interférence reçue, elle est consommée normalement. |
| **Rupture** | **2** | Pendant la fenêtre tactique lorsque sa Primaire est **Garde** | Désigne en secret **une** Secondaire adverse **déjà active**. **Si** sa Garde gagne contre Assaut, s'il **n'existe aucune** Secondaire adverse cachée repoussable, et si la cible est **restée active non consommée**, renvoie cette cible dans la main adverse ; sinon échoue, coût non remboursé. |
| **Dissipation** | **1** | Après révélation volontaire, avant engagement initial | Désigne une Secondaire adverse active qui maintient **un effet persistant de préparation** ; neutralise cet effet jusqu'à la fin du tour, **pas la carte**, son Rang, sa Puissance, son futur usage ni une information antérieure déjà vue. |

## 12.3 Discipline du secret et des fenêtres

- Le moteur présente les Techniques **uniquement** quand elles sont équipées, finançables, valides dans la fenêtre courante, et qu'aucune autre Technique n'a été consommée ce tour. Le joueur conserve toujours ses actions ordinaires de carte indépendamment de ses Techniques.
- **Lecture vs Lecture** : chacun observe le mode **initial** adverse ; les deux éventuelles modifications de mode sont verrouillées secrètement et révélées simultanément. Une Lecture ne donne accès ni à l'identité de la carte adverse, ni au mode **final** modifié de façon future, ni aux choix tactiques de Secondaires.
- **Ancrage / Rupture** sont **déclarées et payées lors du choix tactique**, non proposées gratuitement en réaction après dévoilement des intentions ennemies. Ancrage ne rejoue pas une amplification annulée ; Rupture n'autorise pas deux Repoussements.
- **Dissipation** ne vise que des effets **actifs et persistants**, jamais des événements passés ou une Primaire, et reste réservée à la préparation. Ne pas ajouter une deuxième fenêtre universelle d'Interférence pour dupliquer cette fonction.
- Une carte **revenue en main** grâce à un Repoussement devra être posée et chargée de nouveau si son propriétaire souhaite l'utiliser comme Secondaire ; la carte ne conserve pas un bonus d'Ancrage ou un état actif.

## 12.4 Intégration au RPG

Les mentors et clubs enseignent les Techniques selon la progression du joueur ; deux seules sont équipées pour une confrontation standard. Un PNJ utilise les **mêmes coûts et informations visibles**, sans espionnage des choix secrets par l'IA. Les six Techniques sont le **catalogue initial complet**, extensible par contenu après la version de base seulement si toutes les nouvelles capacités respectent ces invariants.
---

# 13. Lisibilité, information et ergonomie du combat — FIGÉ

## 13.1 Ce que la carte affiche toujours

Le joueur doit reconnaître **sans consulter un journal externe** : nom de la carte, **famille et symbole**, **Rang**, **Puissance**, rareté / variante, **nom et texte de son effet individuel**, coût ou condition de ce dernier et **statut de disponibilité**. Sur une Signature, le Rang **∞** remplace I–IV ; sa **Puissance finie** reste parfaitement visible. Aucune statistique Pénétration n'apparaît dans l'interface.

La mise en page doit éviter toute confusion : Rang = **priorité de Clash** ; Puissance = **dégâts de base / absorption**. Les écrans de tutoriel présentent systématiquement les deux mesures côte à côte. Les écarts de PV des duellistes sont affichés publiquement, y compris contre un rival beaucoup plus fort.

## 13.2 Le terrain adverse : public, privé et masqué

**Public par défaut :** PV actuels/maximaux, Insight, tailles de main/pioche/défausse, cases occupées, ancienneté des Secondaires chargées, **identité complète des Secondaires volontaires révélées**, Primaires à partir de leur révélation, effets publics et leur durée, cartes réellement défaussées, historique des événements révélés.

**Secret jusqu'au bon moment :** contenu de la main adverse, identité des Secondaires chargées/réserve inactive, identité et mode des Primaires avant révélation, carte nouvellement posée facultativement pendant l'engagement, usages précis des Secondaires actives pendant la fenêtre tactique, cible d'Interférence secrète avant verrouillage simultané.

**Masqué par effet individuel :** une information publiquement accessible d'ordinaire peut être temporairement occultée si une carte indique expressément le **périmètre** et la **durée** du camouflage. L'UI affiche alors `?` / « rang masqué », **jamais une valeur fictive présentée comme vraie**. Le nom de l'effet de dissimulation et la famille restent visibles, sauf carte conçue et approuvée pour masquer davantage. L'application du camouflage est **atomique au dévoilement** : on n'affiche pas le Rang réel une fraction de seconde avant de le masquer.

## 13.3 Prévisualisation des dégâts, obligatoire

**Avant sélection d'une Primaire :** afficher sa Puissance, ses dégâts de base potentiels, ses fonctions Assaut/Garde et les particularités déjà connues ; les choix de l'adversaire ne sont pas inventés.

**Après révélation des Primaires :** calculer la **confrontation Basic provisoire** à informations présentes, avec score actuel, Puissance et dégâts attendus **si aucune utilisation adverse cachée ne modifie le résultat**. Indiquer « provisoire », « sous réserve des actions secrètes » ; permettre au joueur de tester visuellement ce que ses propres choix de Secondaires feraient au score, au multiplicateur ou aux blessures.

**Pendant la préparation de l'utilisation :** afficher pour chaque Secondaire son coefficient de dégâts (`R` ou `R+1 même famille`), le multiplicateur **additionné** s'il y en a deux, le nouveau score de confrontation pour Rang et les cibles d'Interférence admissibles ; les choix adverses **non verrouillés ou cachés** ne doivent pas influencer le calcul présenté.

**Après résolution :** montrer le résultat définitif et ses étapes, avec **dégâts de base / Garde absorbée / multiplicateur final / PV perdus / carte Interférée / nom d'effet déclenché**. Les révélations simultanées et les dommages kamikazes doivent être indiqués comme **simultanés**, pas comme un premier et un second attaquant.

### Exemples de messages UI

- `Cendre IV · Assaut · Rang IV (4) · Puissance 12`.
- `Ronce III · Garde · Rang III (3) · Puissance 9`.
- `Résultat Basic provisoire : (12 − 9) × 1 = 3 dégâts, sous réserve des Secondaires adverses`.
- `Cendre III · Amplifier les dégâts · même famille : ×4`.
- `Cendre II · Amplifier les dégâts · même famille : ×3`.
- `Ultime préparé : multiplicateur TOTAL ×(4+3)=×7 ; dégâts provisoires 21 contre cette Garde`.
- `Voile III — Dissimulation : rang et Puissance masqués jusqu'à la fin du tour`.
- `Interférence réussie : soutien Cendre II annulé ; multiplicateur restant ×4`.
- `Ferveur : effet ARMÉ → condition vérifiée → +1 Insight`.
- `Assauts à égalité : dégâts croisés A→B 48 / B→A 12`.
- `Signature ∞ domine la Garde, mais la blessure est absorbée : 0 PV`.
- `DOUBLE K.-O. — PROLONGATION : 1 PV chacun`.

## 13.4 Les trois états visuels d'un effet

1. **ARMÉ / ACTIVÉ** : nom de l'effet et condition en attente affichés au moment autorisé, **sans prétendre que l'effet est réussi**.
2. **RÉUSSI** : la condition est remplie, conséquence chiffrée ou tactique affichée.
3. **ÉCHOUÉ / ANNULÉ** : condition non remplie ou contre par Interférence/Dissipation, avec motif explicite.

Ne jamais montrer publiquement « Ferveur activée » pendant que l'usage de la Secondaire est encore une **décision secrète**. L'alerte publique apparaît **après** verrouillage / révélation simultanée. Le propriétaire peut voir une prévisualisation privée pendant sa programmation. Une capacité de révélation volontaire, elle, est publique à l'instant du dévoilement, sous réserve d'éventuelles données masquées.

## 13.5 Une interface rapide, pas une succession de boîtes de dialogue

Une décision normale de tour doit rester lisible en une vue : main, Primaire, deux emplacements Secondaires, PV, Insight, nombres de cartes. Les trois actions de Secondaire sont présentées par un menu simple et **Conserver** par absence d'engagement ou une option explicite. Interférer ouvre le ciblage seulement lorsque l'action est choisie. Les alertes d'effets sont courtes et conservées dans un journal consultable, sans imposer de cliquer « OK » pour chacun des déclencheurs.

Les montées dramatiques des Signatures et les ultimes peuvent mériter une animation exceptionnelle, mais **l'animation n'est jamais la source de vérité du moteur** : l'ordre déterministe et les résultats doivent rester identiques même si l'animation est sautée.

---
---

# 14. Exemples de calculs normatifs — DÉFINITIF

Les exemples ci-dessous emploient exclusivement la progression **3 / 6 / 9 / 12**, les Signatures **14 / 12 / 12 / 13** et le multiplicateur **additif**. Sauf mention, aucune variante n'ajoute d'effet particulier.

## 14.1 Assaut III contre Assaut IV : renversement par le Rang

Primaire Astre III `R3 P9` + Secondaire Voile II en Rang `+2` : score **5**. Face à Cendre IV `R4 P12` sans soutien, Astre III **gagne la priorité et inflige 9 PV**, et non 11 ni 12 ; l'Amplification de Rang n'augmente pas la Puissance.

## 14.2 Assaut IV contre Garde III : absorption et garde renforcée

Primaire Cendre IV `P12, C4` contre Garde Ronce III `P9, C3` : **3 PV**. Si la Garde utilise Secondaire I pour Rang, score de Garde **4** ; la Garde remporte l'égalité (0 PV) et peut repousser une Secondaire ennemie cachée. Si la Garde ne monte qu'à `C<4`, ses points de Rang supplémentaires n'augmentent pas sa Puissance 9 ; les blessures restent 3.

## 14.3 Ultime additif et défense

Cendre IV en Assaut `P12`, soutiens Cendre III ×4 et Cendre II ×3, `M=4+3=7` : contre Assaut dominé, **84 PV** ; contre Garde III `P9` dominée en priorité, **(12−9)×7 = 21 PV**. Si Cendre III est Interférée et Cendre II reste valide, `M=3` : **36 PV** contre Assaut inférieur et **9 PV** contre Garde III. Si les deux soutiens sont annulés, `M=1`.

## 14.4 Risque kamikaze et Contrecoup

Deux Primaires Assaut IV `C4 P12` sans Rang : égalité ; chacune inflige **12** à l'autre. L'un des joueurs possède deux soutiens de dégâts valides ×4+×3 : il inflige **84**, mais reçoit toujours **12**. Les dégâts ne sont jamais additionnés dans une cagnotte ni divisés entre joueurs. Si une Cendre IV « Contrecoup » **perd** en Rang contre un autre Assaut et descend tout de même à 0 PV, ses **3 dégâts fixes** sont infligés au même impact et peuvent provoquer **un double K.-O.** ; ce n'est pas une victoire de Clash.

## 14.5 Signature Cendre et Garde IV

Brasier Originel ∞ `P14` domine une Garde ordinaire IV `P12` quelle que soit l'Amplification de Rang de cette Garde. Sans soutien, **2 PV** ; avec deux soutiens Cendre IV ×5 et Cendre III ×4, **(14−12)×9 = 18 PV** ; contre Assaut ordinaire, **14×9 = 126 PV**. Si son unique soutien dégâts valide est Interféré, l'effet Flamme conquérante **échoue** même si Brasier reste victorieux et blesse de 2 PV. Sans cible cachée, aucun Repoussement spécial.

## 14.6 Signature contre Signature

Brasier ∞ `P14 Assaut` contre Miroir ∞ `P12 Assaut` : **priorités égales**, Brasier subit **12**, Miroir subit **14** sans soutiens ; aucun ne « gagne ». Brasier ∞ Assaut contre Couronne ∞ Garde : la Garde ∞ **gagne à égalité**, absorbe le choc sans blessure Basic, puis peut appliquer Emprise si une cible subsiste. Le plus grand chiffre de Puissance n'est pas une priorité supplémentaire.

## 14.7 Variante Astre IV et coefficients exceptionnels

Astre IV « Convergence » utilisée en Dégâts pour une Primaire Cendre IV apporte **×6** au lieu de ×4 ; associée à une Cendre II en dégâts de même famille (×3), `M=6+3=9`. L'Assaut Cendre IV victorieux inflige **12×9 = 108 PV** contre un Assaut dominé, ou **(12−9)×9 = 27 PV** contre Garde III. Convergence n'est pas « ×6 × ×3 » et reste Interférable.

## 14.8 Insight et effet redondant

Un joueur commence à **1/2 Insight**, gagne une Garde contre Assaut et possède une variante donnant elle aussi +1 Insight pendant ce Clash : **gain final +1 au total**, réserve **2/2**, jamais 3/2. Il peut dépenser 2 à un tour suivant pour Lecture ou Rupture, mais pas emprunter le point gagné pour utiliser la Technique **pendant le même tour**.

## 14.9 Repoussement, Ancrage et Cycle astral

- Garde victorieuse : le propriétaire repousse une seule Secondary **cachée** ; la carte retourne à la main adverse, puis devra être reposée/chargée.
- Ancrage payé **avant** les révélations tactiques : une Secondaire ciblée par Interférence est **préservée active**, son action échoue quand même ; si elle n'est pas ciblée, Ancrage est dépensé et la Secondaire consommée normalement.
- Cycle astral d'Astre ∞ : une seule Secondaire Dégâts valide dans un Clash gagné retourne au sommet de la pioche et devra être **piochée puis reposée et chargée** avant un nouvel usage en Secondaire. Avec deux soutiens non annulés, Cycle astral ne récupère personne.

## 14.10 Voile : information et contre-jeu temporel

Une Voile III Dissimulation et une autre Secondaire sont révélées simultanément au début d'un tour : Dissimulation masque l'identité et les chiffres de l'autre Secondaire jusqu'à fin du tour. **Dissipation** peut lever le camouflage avant engagement ; une Interférence de Clash peut cibler cette carte à l'aveugle, mais si son Rang réel est trop élevé, elle échoue et dépense la carte interférente. Une Signature Voile ∞ qui a déjà révélé une carte adverse à son propriétaire ne peut pas se voir « effacer » cette information par Silence après coup.
---

# 15. Le RPG urbain : monde, progression, collection et adversaires

## 15.1 Une ville unique et évolutive — FIGÉ pour la vision

L'aventure se déroule principalement dans **une grande ville unique** et suffisamment variée pour accompagner toute la carrière du joueur. Les quartiers, rues et lieux de rencontre possèdent des styles de duel et des communautés distincts. Le joueur peut croiser des duellistes anonymes, des habitués, des rivaux, des figures locales, des membres de clubs et des champions ; les règles de combat restent les mêmes, hormis les formats explicitement annoncés.

**Lieux / activités envisagés :** duels de rue, places publiques, commerces de cartes, échanges / acquisition de variantes, clubs d'entraînement, maîtres de Techniques, qualifications, arènes et tournois officiels, compétitions de quartier, événements temporaires, défis spéciaux, parcours de collection, rencontres narratives et éventuellement circuit clandestin. Ce sont des **orientations de contenu**, pas une liste exhaustive de lieux déjà dessinés ou placés sur carte.

## 15.2 Progression du joueur — FIGÉ pour la direction

La progression a des dimensions complémentaires :

1. **Maîtrise :** lire les choix adverses, identifier les habitudes, compter les cartes défaussées, reconnaître la charge des Secondaires, savoir quand tenter un ultime ou protéger ses ressources.
2. **Collection :** réunir les **16 identités**, choisir leurs variantes, posséder des raretés aux effets distincts, découvrir des Signatures de chaque famille et adapter son deck sans violer l'unicité des identités.
3. **Techniques :** acquérir / équiper des compétences Insight, comprendre leurs fenêtres et leurs coûts.
4. **Résistance RPG :** évolution possible des `PV_max` du personnage sans uniformiser tous les adversaires ni rendre systématiquement nuls les Assauts Basic.
5. **Statut social :** réputation, rivalités, défis reconnus, épreuves de quartier, entrée en club et qualification vers les compétitions supérieures.

L'élévation du statut dans la ville ne se réduit pas à un buff arithmétique de cartes. Un adversaire à 170 PV peut être plus difficile qu'un joueur à 90 PV **et** plus fin tactiquement, mais une meilleure préparation du joueur doit pouvoir créer un retournement crédible.

## 15.3 Adversaires à identité tactique

Les PNJ doivent disposer de styles compréhensibles et modifiables par progression : attaque fréquente sans soutien, conservation longue de Secondaires pour bluff, recours aux Gardes renforcées, spécialiste de l'Interférence, construction d'ultimes, lecture de l'adversaire, priorité aux dégâts contre Garde, discipline de protection des Secondaires actives, usage mesuré des Signatures. Ils utilisent les **mêmes informations réellement accessibles et les mêmes fenêtres** que le joueur ; éviter une IA omnisciente qui choisit après avoir vu des ordres secrets non révélés.

Un rival peut évoluer : changer ses variantes, sa Signature, ses Techniques équipées, ses habitudes et son plan pour tenir compte des précédentes rencontres. La mémoire des rencontres est une caractéristique de scénario / IA, pas une capacité gratuite qui révèle la main adverse pendant un Clash.

## 15.4 Journées, événements et circulation

Une journée de jeu peut comporter entraînement, duel de rue, rendez-vous avec un rival, inscription à un tournoi limité, boutique, activité de collection et défi annoncé. Les PNJ peuvent changer de lieu selon un calendrier interne au jeu ; le joueur choisit ses déplacements et activités. **Aucune obligation de faire attendre le joueur dans le temps réel** n'est induite par cette simulation de journée.

## 15.5 Compétitions et formats — FIGÉ pour la flexibilité, contenu à équilibrer

- **Duels de rue :** PV individuels, adversaires de force variable ; conditions rendues visibles avant acceptation du défi.
- **Initiation / académies :** restrictions éducatives possibles (deck de **12 cartes I–III**, une seule Secondaire, sans Signature), annoncées par l'événement ; les mêmes concepts de base sont enseignés progressivement.
- **Duels standard :** deck complet de **17 cartes**, deux emplacements Secondaires, une Signature maximum.
- **Tournois officiels :** règles de participation, PV et variantes autorisées définis publiquement par l'épreuve ; **pas d'égalisation automatique** globale des PV.
- **Défis de quartier :** contraintes de collection ou de famille possibles, annoncées avant l'engagement.
- **Rencontres scénarisées :** boss, asymétries et règles spéciales possibles si présentées honnêtement, sans modifier silencieusement les fonctions ordinaires.

Les règles d'inscription, récompenses, économie, disponibilité des Signatures et budget éventuel de variantes dans les tournois constituent un **chantier de contenu/équilibrage**, et ne sont pas inventées ici comme étant déjà validées.

---
---

# 16. Cas limites et critères de conformité du moteur — DÉFINITIF

## 16.1 Invariants de construction et de zones

1. Un deck standard possède 17 cartes **uniques** : 16 identités ordinaires (une par paire famille/rang) et une seule Signature exclusivement Primaire.
2. Une seule Primaire est obligatoire à chaque tour ; son mode Assaut/Garde est secret avant la révélation simultanée ; au plus une nouvelle Secondaire facultative par tour, **différente** de la Primaire.
3. Deux emplacements Secondaires maximum par joueur, un remplacement facultatif s'effectue à l'**engagement initial**, et non après connaissance des utilisations adverses. Aucun troisième emplacement virtuel.
4. Une Secondaire posée au tour `T` ne peut **ni se révéler volontairement, ni agir** pendant `T`; à partir de `T+1`, elle peut rester cachée/inactive indéfiniment ou être révélée volontairement une seule fois.
5. Une Secondaire face cachée ne produit **aucun** effet passif ; la Secondaire active non consommée reste visible/prête jusqu'à retrait ou expiration d'un camouflage temporaire.
6. Une carte existe dans une **zone logique unique** : main, pioche, défausse, Primaire engagée, terrain Secondaire caché/actif ; retour en pioche/sous pioche et Repoussement ne dupliquent pas les cartes.
7. L'Insight est une réserve entière **0–2** ; départ standard **1** ; gain maximum **+1** par tour ; une Technique utilisée par tour ; deux Techniques équipées.

## 16.2 Invariants de combat

8. Score ordinaire = Rang Primaire + Rangs des soutiens Rang non annulés. La Puissance Basic **I/II/III/IV = 3/6/9/12** ne dépend jamais implicitement du score.
9. `M=1` sans Secondaire Dégâts valide ; sinon **somme** des coefficients `rang + 1 si même famille`, avec exceptions imprimées comme Convergence (×6). Aucun produit des coefficients secondaires.
10. A/A de priorité inégale : seul le vainqueur fait ses dégâts standard `P×M`. A/A à égalité : dommages propres **simultanés** et aucune victoire de Rang.
11. A/G : Garde victorieuse si sa priorité est **égale ou supérieure**, sinon dégâts `max(0,P_A−P_G)×M`. Le score de Rang ajouté en Garde ne devient jamais de la Puissance d'absorption.
12. Une Signature ∞ domine toute Primaire ordinaire mais ne domine pas une autre ∞. Deux Signatures en A/A s'échangent les dégâts ; en A/G, la Garde gagne l'égalité ; G/G sans dégâts.
13. Les Signatures peuvent utiliser deux amplificateurs de dégâts comme toute Primaire en Assaut ; le fait d'être ∞ n'autorise ni dommages infinis, ni immunité à l'absorption.
14. L'Interférence vérifie **Rang imprimé** et cible engagée sur un **instantané simultané**, puis annule l'action et son effet d'utilisation ; la carte interférente est consommée même en cas d'échec. Une cible **Conservée** ne peut être annulée par l'Interférence Basic.
15. Interférences mutuelles valides : pas de cascade, les deux sont annulées ; les deux peuvent gagner le +1 d'Insight naturel sur le ciblage valide, les effets individuels d'utilisation annulés ne se déclenchent pas.
16. Une Garde victorieuse contre Assaut peut renvoyer **une carte cachée** adversaire ; Emprise/Rupture sont les seules exceptions du catalogue initial permettant une cible active encore en place ; aucun double Repoussement.
17. Les effets automatiques sont activés aux **deux moments définis** pour les Secondaires, ou à la révélation de Primaire ; un effet d'utilisation contré n'agit pas, un effet antérieur instantané n'est pas annulé rétroactivement.
18. Braise/Étincelle/Contrecoup ajoutent leur bonus **fixe après** la formule de dégâts, non amplifiable ; l'égalité ne suffit pas pour un effet « gagne le Clash ».
19. Retour au sommet / sous la pioche : carte consommée physiquement, un seul propriétaire, pas d'activation immédiate ; tout usage ultérieur comme Secondaire nécessite une **nouvelle pose et charge**.
20. Le double K.-O. renvoie à **1 PV chacun**, avec conservation du reste des ressources après nettoyage normal ; pas de vainqueur déterminé par les PV initiaux.
21. Les traitements sont calculés **avant** les animations ; les PV, états de cartes et secrets de l'IA sont identiques en animation complète ou accélérée.
22. Une carte Basic n'a **pas** d'effet individuel ; il n'existe ni Écho, Pénétration, Sang-froid, mises, multiplicateurs produits, ni action universelle « Amplifier la Puissance ».

## 16.3 Arbitrages définitifs de raccordement

| Situation | Comportement obligatoire |
|---|---|
| Main de plus de 4 cartes par Repoussement/effet | Conserver l'excédent jusqu'au **début du prochain tour** ; son propriétaire défausse alors librement les cartes excédentaires pour revenir à 4 **avant** la pioche éventuelle ; ne jamais jeter silencieusement une carte |
| Deux Secondaires déjà présentes, nouvelle pose souhaitée | Lors de l'engagement initial, le joueur peut **défausser une** des deux pour ouvrir une place et poser **une seule** nouvelle Secondaire ; l'ancienne ne participe pas au Clash et sa défausse devient publique au dévoilement de l'engagement ; une carte remplacée ne déclenche pas un effet d'utilisation |
| Deux Interférences ciblant mutuellement les deux cartes | Vérifier les deux sur l'instantané des ordres, annuler les deux en parallèle, consommer les deux ; pas de contre-contre séquentiel |
| Rang de la cible masqué | Autoriser un ciblage à l'aveugle de la carte **active** ; vérifier le vrai Rang à la résolution, échec et consommation si insuffisant, afficher ensuite seulement les informations autorisées |
| Deux Secondaires en dégâts dont une Interférée | `M` ne compte que les coefficients non annulés ; `M=1` si aucune ne survit |
| Signatures différentes face à face | Priorité ∞ égale, **pas** de départage par Puissance ou rareté |
| Deux Techniques « Lecture » | Voir les modes initiaux, puis les deux changements éventuels sont verrouillés simultanément |
| Ancrage sur une Secondary finalement non Interférée | 1 Insight dépensé, effet sans objet, carte engagée consommée normalement |
| Rupture visant une carte utilisée ou en présence d'une carte cachée repoussable | Échec conditionnel, aucun retour de cible active, coût 2 déjà payé |
| Dissipation après un effet d'information instantané | Ne peut pas retirer une information déjà observée ; vise exclusivement les effets de préparation **encore actifs** |
| Deux effets tentent de changer la zone d'une même carte | La destination finale est unique ; appliquer d'abord l'effet valide propre à la carte, puis celui de sa Signature seulement si aucun effet propre n'a déjà donné une destination explicite |
| Carte posée au sommet alors que la pioche est vide | Elle devient le **sommet réel** de la pioche ; elle sera piochée avant tout remélange éventuel de la défausse |
| Nouvelles variantes après V3 | Leur texte ne change pas silencieusement ces règles ; une exception nouvelle nécessite une révision explicite du contrat |

## 16.4 Matrice de vérification obligatoire

| Contrôle | Attendu |
|---|---|
| Main normale et recyclage | 4 en début de tour, main régulée, défausse mélangée sans duplication |
| Première pose T ; révélation T ou usage T | Refus ; charge jusqu'à au moins T+1 |
| Révélation T+1 puis Conserver | Active, visible, reste sur table ; effet de révélation non répété |
| Deux dégâts ×4 et ×3 | `M=7`, jamais ×12 ; P12 = 84 contre Assaut inférieur |
| A/A égalité P12 contre P12 | 12 de chaque côté ; deux blessures simultanées |
| A/G P12 contre Garde III P9 | 3 dégâts si Assaut prioritaire ; 0 si Garde remporte son Rang |
| Signature P14 avec ×5+×4 contre Garde IV P12 | 18 dégâts ; contre Assaut ordinaire : 126 |
| Signature P12 contre Garde IV P12 | Priorité de la Signature, dégâts 0, pas de Repoussement de la Garde perdante |
| Signature P14 contre Signature P12, les deux en Assaut | Échange 14/12 (avec leurs propres coefficients) |
| Interférence contre cible Conservée | Échec ; cible demeure active, interférente consommée |
| Interférences mutuelles valides | Deux usages annulés, deux consommations, pas de chaîne récursive |
| Ferveur non annulée, Assaut Cendre gagnant et blessant | +1 Insight seulement si la limite le permet |
| Silence contre soutien IV utilisé | Soutien et effet de Primaire **encore en attente** annulés ; priorité ∞ inchangée |
| Miroir du Voile déjà révélé avant Silence | Informations conservées en mémoire, jamais « effacées » |
| Contrecoup sur défaite avec deux joueurs à 3 PV | Peut produire double K.-O. et prolongation |
| Convergence d'Astre IV soutenant Cendre IV | Coefficient ×6, s'additionne au deuxième coefficient |
| Ronce II Écaille en Garde victorieuse | Soin 2 PV après Clash, plafonné à PV_max |
| Relance sur Interférence rang III réussie | Retour sommet de pioche ; pas de copie sur terrain |
| Cycle astral avec un seul soutien non annulé valide | Retour sommet à nettoyage ; deux soutiens valides ne déclenchent pas |
| Garde victorieuse avec Ronce ∞ | Repousse **une seule** Secondaire active ou cachée encore présente |
| Rupture déclarée, Garde perdante | Coût dépensé, aucun Repoussement |
| Deux K.-O. simultanés | 1 PV chacun ; deck/Insight/terrain après nettoyage conservés |

**Limite de preuve :** des tests déterministes valident les exemples calculés et raccordements couverts ; ils ne certifient pas à eux seuls une expérience compétitive équilibrée pour toutes les stratégies humaines ou toutes les variantes futures. Les tests de rythme probabilistes V2.2 étaient heuristiques ; ils ne représentent pas une simulation du **catalogue V3 complet**.
---

# 17. Bilan de validation et frontière du contrat — V3

## 17.1 Ce qui est désormais figé

**Structure** : 16 cartes ordinaires Basic famille × I–IV + une Signature ∞, 17 cartes équipées, deck sans doublons, deux Secondaires persistantes, chargement, activation volontaire, une Primaire obligatoire et nouvelle Secondaire facultative par tour.

**Nombres** : Puissances Basic **3/6/9/12** ; Insight **0–2**, départ standard **1**, gain maximal **+1/tour**, une Technique par tour, **deux équipées**, coûts 1/2 ; quatre Signatures initiales **Cendre 14 / Voile 12 / Ronce 12 / Astre 13**.

**Résolution** : Assaut/Garde/Interférence/Conserver, gain au Rang, Puissance pour blessures/absorption, `M` par somme, égalité kamikaze, mort subite sans réinitialisation des cartes, Interférences simultanées en une passe, contrôle des informations cachées, effets automatiques aux fenêtres prévues.

**Catalogue initial** : seize variantes individuelles (section 11), six Techniques (section 12), quatre Signatures (section 8), et leurs exceptions bornées. Les cartes Basic restent les références non dotées d'effets spéciaux.

**RPG** : une grande ville et une carrière de duelliste ; PV individuels, non uniformisés automatiquement en tournoi ; rythme variable selon adversaire/événement sans chronomètre de tours imposé.

**Cas techniques** : remplacement des deux emplacements complets, excédent de main, changement de mode Lecture, ciblage aveugle de Rang masqué, destin unique des cartes, activation et contre-jeu temporel.

## 17.2 Ce qui relève d'un futur chantier de contenu, sans lacune dans le règlement de duel

- Narration détaillée de la ville, cartes de quartiers, personnages nommés, dialogues, économie précise, boutique, récompenses, rareté d'obtention, niveaux de réputation, tableaux de tournoi et calendriers.
- Variantes **supplémentaires** au-delà des seize fiches initiales, nouvelles Signatures, nouvelles Techniques ou règles propres à un format d'événement ; elles ne sont **pas indispensables** au moteur V3 standard.
- Réglage fin des PV **individuels** de chaque futur PNJ et de son comportement IA ; repères 60/90/125/170/200 = exemples de calibration, non chiffres figés pour le monde entier.
- Tests de parties complètes en situation humaine, mesure de durée avec toutes les capacités, accessibilité UI et QA des interactions imprévues ; ces tests pourront justifier une **V3.1 d'équilibrage** après accord du concepteur, sans faire croire qu'ils ont déjà été réalisés.

## 17.3 Modifications normatives depuis V2.2

1. Remplacement **définitif** des Puissances Basic initialement explorées 3/5/8/12 par **3/6/9/12**.
2. Plafond Insight **2** au lieu de 3 ; coûts et fenêtres finalisés ; Ancrage coûte **1** et se déclare avant la révélation tactique.
3. Premier catalogue **16 variantes + 4 Signatures** doté de valeurs/conditions précises ; l'ancien tableau V2.2 de cartes « illustratives » et ses anciennes valeurs ne sont plus normatifs.
4. Rythme de duel **adaptatif selon l'adversaire et l'événement**, aucune durée fixe ; PV propres aux personnages.
5. Résolution définitive de l'excès de main, remplacement d'une Secondaire, Interférences mutuelles, cibles cachées, effets instantanés vs persistants, destinations de cartes, prolongations.
6. Conservation de l'identité quatre familles et du RPG urbain. **Ancien poker/Ante/Mise/Écho/Sang-froid/Pénétration** définitivement hors contrat.

**Règle de version :** ce document **V3.0** prévaut sur le rapport V2, le contrat V2.2 et les avenants V2.2 en cas de contradiction. Les sources restent archivées à titre historique ; seules les révisions explicites validées ultérieurement peuvent modifier le présent contrat. La qualification « définitif » désigne le **règlement jouable de base**, pas la fin de toute création de contenu ni la preuve de l'équilibre compétitif futur.
---

# 18. Fiche normative d'implémentation — une page

**Deck standard :** 16 ordinaires distinctes (Cendre/Voile/Ronce/Astre × I/II/III/IV) + une Signature ∞ exclusivement Primaire. Choisir une variante par identité ; une seule carte de chaque identité dans le deck. Main **4**, compléter chaque début de tour, recycler seulement la défausse du propriétaire, jamais de duplication. Deux emplacements de Secondaires maximum ; pose **0–1/tour** simultanément à la Primaire obligatoire. Nouvelle Secondaire : charge pendant le tour de pose, pas d'effet ni usage. Révélation volontaire au début d'un tour ultérieur ; garder cachée = inactive ; une Secondaire révélée reste active jusqu'à consommation ou retrait.

**Rang / Puissance :** I–IV valent Rang 1/2/3/4 et **Puissance 3/6/9/12**. Score `C = Rang Primaire + Σ Rang soutiens Rang valides`. Score et Puissance indépendants. Secondaire Dégâts : coefficient `m = Rang +1 si même famille` (sinon Rang) ; `M=1` sans soutien, sinon **somme des m valides**. En A/A, meilleur score inflige `P×M` ; égalité = **échange simultané des P×M respectifs** sans gagnant. En A/G, Garde gagne l'égalité, sinon l'Assaut prioritaire inflige `max(0,P_A−P_G)×M`. G/G = 0 dégât. Garde victorieuse contre Assaut peut repousser **une** Secondaire adverse **cachée**.

**Signatures ∞ :** uniquement Primaires ; ∞ domine tout score ordinaire ; ∞/∞ priorités égales et règles du mode conservées ; Puissance **finie**, garde absorbante, deux amplifications permises. Quatre fondatrices : **Cendre 14 Flamme conquérante**, **Voile 12 Clairvoyance voilée**, **Ronce 12 Emprise**, **Astre 13 Cycle astral**. Voir fiches section 8 pour leurs conditions exactes.

**Usage des Secondaires actives :** après révélation des Primaires, choix simultané secret **Conserver / Amplifier Rang / Amplifier dégâts si Assaut / Interférer**. Interférence par Rang imprimé ≥ cible, atteint seulement une cible active **engagée** ; annule usage + effet associé, consomme l'interférente même sur échec. Interférences simultanées testées en **une passe**, pas de réaction en chaîne. Dégâts additifs, pas de produit de coefficients.

**Insight** : maximum **2**, départ standard **1**, gain **+1/tour maximum** après Garde victorieuse/Interférence réussie/effet de carte, au plus **une Technique/tour**, **deux équipées** ; coût **1** Sondage/Recentrage/Ancrage/Dissipation, coût **2** Lecture/Rupture. Lecture voit le mode initial, pas les futurs choix de Secondaires. Ancrage protège la **carte** mais ne sauve pas l'action ; Rupture vise exceptionnellement une Secondaire active non consommée si aucune cachée n'est repoussable. Les coûts sont payés avant résultat ; pas de dépense d'Insight futur.

**Effets** : un effet principal par variante ; déclenchement automatiquement **à la révélation** d'une Secondaire ou **à son utilisation**, selon texte, et à la révélation pour une Primaire. Résultat conditionnel **armé / réussi / échoué / annulé**, visible au bon moment. **Silence** ne supprime qu'un effet de Primaire en attente, jamais la priorité ∞ ni une information déjà obtenue ; **Dissipation** neutralise la préparation persistante seulement. Catalogue 16 variantes en section 11.

**Fin** : PV individuels non standardisés, combat de durée variable ; K.-O. unilatéral = victoire ; double K.-O. au même impact = **1 PV chacun en prolongation**, ressources/états normaux conservés après nettoyage, répétable. Pas d'Écho, Pénétration, mises, pari tactique universel ou règle de durée fixe.

**Moteur/UI** : préserver secrets des décisions avant verrouillage simultané ; Rang/Puissance séparés visibles sauf effet de camouflage annoncé ; montrer coefficients, multiplicateur total, prévision provisoire et journal de la résolution effective. Tester les invariants et scénarios de la section 16 avant livraison.
