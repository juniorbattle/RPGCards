# 08 — Avenant V3.3 : visibilité des Signatures (annonce immédiate)

**Ratification : EN ATTENTE.** Texte soumis au responsable le 2026-10-24, avec ses points à trancher (S-07). Il ne fait
foi qu'après sa validation explicite de cette rédaction (`contracts/00_GOUVERNANCE_AUTORITE.md`, point 1). **Aucun code
n'est changé avant.**

**Statut : PROPOSÉ.** Avenant au règlement V3.0 + delta V3.2, **distinct de l'avenant 07** (la Garde réduit sans
annuler) : il ne touche ni la formule des dégâts ni la résolution du Clash, seulement **ce qui est public pendant la phase
d'engagement**. Pour tout le jeu (Duel standard, Aventure, rivaux, Championnat).

**Source :** décision du responsable du 2026-10-24, relayée par la session principale : « toute carte Signature engagée
comme Primaire doit exceptionnellement être visible par les deux joueurs dès son verrouillage » ; objectif : « annoncer le
danger, créer une tension dramatique et permettre à l'adversaire d'anticiper l'arrivée d'une carte exceptionnelle » ;
contraintes 1 à 9 et vérifications obligatoires reprises en S-02 et S-08. Décision d'architecture : ADR 036 (proposé).

## S-00 — La phase d'engagement aujourd'hui (relevé dans le code, commit `45f7004`)

- **Une seule commande par joueur** (`commit`) porte ensemble la Primaire, **son mode** (Assaut ou Garde), la nouvelle
  Secondaire facultative et le remplacement éventuel (`src/game/engine/engine.ts`, `validate`, cas `commit`).
- **Verrouillage individuel, application commune.** Chaque commande validée est rangée dans l'état privé
  (`state.pending[joueur]`) et produit un seul événement public, `locked` (joueur et phase, rien d'autre). La phase ne
  s'applique (`applyCommit`) qu'une fois **les deux** joueurs verrouillés : les deux Primaires sont alors posées face
  cachée, l'événement public `committed` ne dit que la case de la Secondaire posée, l'événement privé dit tout à son
  propriétaire. Un joueur verrouillé ne peut plus rien changer (« Décision déjà verrouillée pour cette phase »).
- **L'ordre n'est pas fixé par la règle** : le premier qui envoie sa commande est « premier ». Dans le jeu, le rival
  (`src/app/controller.ts`, `scheduleAi`) décide **≈ 0,65 s après l'ouverture de l'engagement** (`aiDelay`, 650 ms par
  défaut) : il verrouille presque toujours **avant** le joueur, qui prend le temps de glisser sa carte et de choisir son
  mode. Dans les simulations IA contre IA (`Match.stepAi`), p1 verrouille toujours avant p2.
- Après l'engagement : **Lecture** (2 Insight : voir le mode initial adverse, changer son propre mode), puis
  **révélation simultanée** des Primaires (`primariesRevealed`) ; les effets de Primaire et de Signature s'arment à ce
  moment (`effectArmed`, Clairvoyance voilée).
- **Une Signature est aujourd'hui aussi secrète qu'une Primaire ordinaire** jusqu'à la révélation : la vue adverse
  (`viewFor`) ne montre ni la carte ni le mode (`primary.card` et `primary.stance` à `null`). Ce qui est déjà public : la
  famille de la Signature de chaque duelliste (`signatureFamily`, emblème du HUD), sa présence ou non dans la défausse, et
  tout ce qu'une carte révèle légalement (Éclaireur, Sondage, Détour, Clairvoyance voilée : une carte de la main, en
  privé).
- **IA** (`src/game/ai/policy.ts`, `decideCommit`) : elle tire 14 Primaires adverses possibles dans le reste inconnu du
  deck adverse (pondéré par sa mémoire publique) et un mode selon les Assauts déjà vus, puis évalue chaque carte de sa main
  avec `computeClash`. Elle ne lit que sa vue.
- **Replay et reprise** : rejeu des commandes sur le moteur pur, empreinte de l'état et des événements ; étiquette des
  règles `V3.0+delta-V3.3` depuis l'avenant 07.

## S-01 — La règle proposée

> Lorsqu'un joueur **verrouille** un engagement dont la Primaire est une **Signature**, cette Signature est **annoncée
> aux deux joueurs, face visible, immédiatement**, que l'adversaire ait déjà verrouillé ou non. Son **mode** (Assaut ou
> Garde) reste secret jusqu'à la révélation simultanée habituelle.

## S-02 — Ce qui devient public, ce qui reste secret

| Information | Avant | Avec l'avenant 08 |
|---|---|---|
| Identité, famille, Puissance, Rang ∞ d'une **Signature** engagée | secrète jusqu'à la révélation | **publique dès son verrouillage** (contrainte 3) |
| Primaire **ordinaire** engagée | secrète jusqu'à la révélation | inchangé : secrète (contrainte 1) |
| **Mode** de la Signature (Assaut ou Garde) | secret | inchangé : secret jusqu'à la révélation, ou la Lecture (contrainte 4) |
| Nouvelle Secondaire, remplacement, Secondaires cachées, usages tactiques, main | secrets | inchangé (contrainte 5) ; l'événement `committed` garde sa forme |
| Le fait d'avoir verrouillé | public (`locked`) | inchangé |

## S-03 — Ce qui ne change pas

- Un joueur verrouillé ne modifie jamais son engagement (contrainte 6) : déjà vrai dans le moteur.
- **Effets de Signature, priorité ∞, égalités, Clash** (contrainte 8) : inchangés ; les effets de Signature s'arment
  toujours **à la révélation** des Primaires, pas à l'annonce. Silence, Dissipation, Clairvoyance voilée : inchangés.
- Lecture : inchangée (elle reste le seul moyen de connaître le mode avant la révélation).
- Formule de l'avenant 07, règles A/A et G/G, Insight, Repoussement : inchangés.

## S-04 — Ce que le texte V3.0, le delta et les contrats disent aujourd'hui (passages qui changent)

| Passage | Aujourd'hui | Avec l'avenant 08 |
|---|---|---|
| V3.0 §5, phase 3 « Engagement initial » | « Chaque joueur engage **secrètement** une Primaire… ; **verrouillage simultané** » | secrètement, **sauf l'identité d'une Signature**, annoncée à son verrouillage ; le verrouillage reste individuel dans le moteur (S-00) |
| V3.0 §5, phase 5 « Révélation Primaire » | « Affichage simultané des deux Primaires, famille, rang, Puissance, **mode** et effet » | inchangé pour les ordinaires ; pour une Signature annoncée, la révélation n'ajoute que **le mode** (et arme son effet) |
| V3.0 §13.2, « Secret jusqu'au bon moment » | « identité et mode des Primaires avant révélation » | identité **d'une Primaire ordinaire** et mode **de toute Primaire** |
| Delta V3.2 D-04 | « Ne jamais publier les décisions secrètes **avant** le verrouillage simultané » | exception unique : l'identité d'une Signature, publiée au verrouillage **de son propriétaire** |
| Contrat 05, état `committedPrivate` | « silhouette/verso » de la Primaire engagée | verso pour une ordinaire ; **face visible, mode masqué** pour une Signature annoncée (nouvel état `signatureAnnounced`) |
| ADR 011 (secrets) | aucune identité de Primaire avant la révélation | l'annonce est une publication **par liste blanche** (identité de la seule Signature) |

## S-05 — Effets attendus

- **IA** (contrainte 7) : quand la vue montre une Signature adverse annoncée, `decideCommit` remplace ses 14 Primaires
  adverses tirées au hasard par **cette Signature** (le mode reste tiré selon la mémoire publique). Elle ne lit toujours
  que sa vue. Aucune autre heuristique n'est ajoutée sans décision.
- **Partie** : face à une Signature annoncée, une Primaire ordinaire perd toujours la priorité ; répondre par sa propre
  Signature (égalité ∞ : échange en Assaut, la Garde gagne en Garde) ou limiter la casse (carte de faible coût, Garde
  dominée qui réduit de moitié, avenant 07) devient un choix éclairé. Le joueur qui annonce perd l'effet de surprise.
- **Aventure et Championnat** : le joueur n'a pas de Signature avant son premier chef (AV-06) ; les chefs et les champions
  en ont une. Comme le rival verrouille presque toujours le premier (S-00), **le joueur verra presque toujours la
  Signature adverse avant de choisir**, et le rival ne verra presque jamais celle du joueur. Effet attendu : chefs et
  Championnat un peu plus faciles. À mesurer.
- **Replays et empreintes** : un nouvel événement public d'annonce change l'empreinte de tout duel où une Signature est
  engagée ; les duels sans Signature engagée gardent la leur, sauf choix de l'IA changés par une annonce. Preuve comme
  pour l'avenant 07 (commandes d'avant rejouées).

## S-06 — Présentation (contrainte 9)

- **Plateau** : la case Primaire adverse montre la Signature **face visible**, avec un bandeau « SIGNATURE ANNONCÉE » et
  le mode marqué « ? » ; la mienne, déjà visible pour moi, porte le même bandeau (« annoncée au rival »).
- **Journal** : « Le rival engage sa Signature : Brasier Originel (∞, Puissance 14) ; mode secret. » / « Vous engagez
  votre Signature : … ; le rival la voit, pas votre mode. »
- **Animation sobre** : un retournement et une lueur à la couleur de la famille, une fois, sans son ni secousse ; en
  mouvement réduit, apparition sans animation. Le rival peut réagir (expression) à une annonce publique, jamais à une
  information secrète.

## S-07 — Points à trancher par le responsable

1. **Moment de l'annonce.** (a) **Au verrouillage de son propriétaire**, même si l'adversaire n'a pas encore verrouillé :
   l'adversaire peut alors **changer sa propre Primaire avant de verrouiller** (lecture littérale de la règle et de la
   contrainte 6) ; (b) à la **clôture de l'engagement** (les deux verrouillés), avant la Lecture et la révélation :
   personne ne peut plus changer de Primaire ; l'annonce ne sert qu'à la tension et à la Lecture. *Recommandé : (a).*
2. **Ordre de verrouillage**, qui décide qui profite de l'annonce en (a) : (i) **garder le rythme actuel** (le rival
   verrouille ≈ 0,65 s après l'ouverture, presque toujours en premier : le joueur voit la Signature du rival, l'inverse
   presque jamais) ; (ii) le rival **attend le verrouillage du joueur** (il voit toujours la Signature du joueur) ;
   (iii) ordre **tiré par la graine** à chaque tour. *Recommandé : (i), écrit dans la règle comme le comportement du
   rival.*
3. **Mesures** : dans les simulations IA contre IA, faire verrouiller **l'adversaire en premier** (comme dans le jeu) pour
   les mesures d'équilibre de cet avenant ; les tests et le corpus d'empreintes gardent l'ordre actuel. *Recommandé.*
4. **Étiquette des règles** : `V3.0+delta-V3.3` devient `V3.0+delta-V3.3.1` (un duel sauvegardé sous la règle de
   l'avenant 07 seul est refusé avec sa raison, comme en G-08). *Recommandé.*

## S-08 — Tests prévus (aucun n'est écrit avant la validation)

| # | Vérification | Attendu |
|---|---|---|
| 1 | Signature verrouillée **en premier** (p1 puis p2 ordinaire) | dans la même transition que le `locked` de p1 : événement public d'annonce (joueur, carte) ; vue de p2 : carte annoncée (identité, famille, Puissance, Rang ∞), **mode à `null`** ; p2 toujours attendu et libre de son choix |
| 2 | Signature verrouillée **en second** (p2 ordinaire puis p1) | annonce au verrouillage de p1, avant l'application commune de l'engagement ; p2 ne peut plus rien changer |
| 3 | **Deux Signatures** le même tour | deux annonces, chacune au verrouillage de son propriétaire ; résolution ∞ contre ∞ inchangée |
| 4 | Primaire **ordinaire** | aucune annonce ; vue adverse sans Primaire jusqu'à la révélation (test G25 inchangé pour les ordinaires) |
| 5 | **Aucune fuite** | recherche récursive dans tous les événements publics et la vue adverse avant la révélation : ni le mode, ni la nouvelle Secondaire, ni le remplacement, ni la main ; tests de non-fuite d'ADR 011 rejoués |
| 6 | Contrainte 6 | un joueur verrouillé ne peut plus engager (refus, raison) ; le joueur non verrouillé peut choisir n'importe quelle carte après l'annonce |
| 7 | **IA sur la projection publique** | avec une Signature annoncée, la décision de l'IA est **identique quel que soit le mode secret** de cette Signature ; elle diffère du cas sans annonce dans une main construite pour cela ; l'IA ne reçoit jamais l'état |
| 8 | Lecture après une annonce | mode initial vu par la seule Lecture, changement de mode inchangé |
| 9 | Résolution inchangée | mêmes commandes, même Clash, mêmes PV, avec ou sans annonce ; corpus d'empreintes : les commandes d'avant rejouées redonnent état et résultats identiques, seuls les événements d'annonce s'ajoutent |
| 10 | Replay et reprise | replay déterministe ; reprise d'un duel sauvegardé **pendant** l'engagement après une annonce (annonce retrouvée) ; duel d'une étiquette antérieure refusé avec sa raison |
| 11 | Présentation | plateau (face visible, mode « ? »), journal public et privé, animation sobre et mouvement réduit ; test d'expressions du rival : engagements secrets **ordinaires** différents → mêmes expressions |
| 12 | Navigateur | scénario de QA `?scenario=signature-annonce` (Signature du rival annoncée, réponse du joueur) capturé en 1280 et 1920 sur les deux GPU ; parcours du jalon (aventure, Championnat) |
| 13 | Équilibre | mesures avant et après, mêmes graines (rivaux, aventure, Championnat), ordre de verrouillage selon le point 3 |
