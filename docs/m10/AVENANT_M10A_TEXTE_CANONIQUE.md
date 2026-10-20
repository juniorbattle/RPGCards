# 06 — Avenant M10-A : mode Aventure, cartes neutres et deck d'aventure

> **VALIDÉ PAR LE RESPONSABLE LE 2026-10-20 (fiche du lot M10-A, C1 à C3) ET VERSÉ DANS
> `contracts/06_AVENANT_M10A_MODE_AVENTURE.md`, QUI FAIT FOI.** Ce document garde la version soumise et ses différences
> avec l'avenant proposé. Historique : Rédigé à partir de ses décisions sur la fiche
> d'arbitrages M10 (<https://claude.ai/artifact/P6QSq7ACy25pkB6581Cvg7> ; tableau : `docs/FICHE_ARBITRAGES_M10.md`,
> « Décisions du responsable »). Il n'entrera dans `contracts/` (sous le nom `contracts/06_AVENANT_M10A_MODE_AVENTURE.md`)
> qu'après sa validation explicite de cette rédaction (gouvernance, `contracts/00_GOUVERNANCE_AUTORITE.md`, point 1).
> Différences avec l'avenant proposé : fin de ce document. Validation demandée sur la fiche d'arbitrages du lot M10-A
> (entrées C1 à C3) : <https://claude.ai/artifact/B6y9Qow8gbuNhk8ragTvni>.

**Statut (après validation) :** avenant **APPROUVÉ** au règlement V3.0 + delta V3.2 (D-01 ratifié V3.3), pour le **seul
mode Aventure**. Il remplace, pour ce mode, l'avenant proposé `docs/m10/AVENANT_M10A_PROPOSE.md`, qui reste comme
historique de conception avec ses options écartées.

**Sources :** ADR 029 (choix libre), ADR 030 (seize neutres), ADR 031 et son amendement 1 (récompenses), ADR 032
(architecture) ; décisions du responsable du 2026-10-20 (ARB-M10-01 à 12, S1 à S5) ; preuve hors dépôt et mesures
`docs/m10/MESURES_M10A.md`.

## AV-00 — Portée et frontière

- **Le mode Duel standard ne change pas** : règles V3.0 + delta V3.2, deck de 17 cartes (16 identités + 1 Signature),
  catalogue, calculs du Clash, conditions d'Amplification, secrets (ADR 011), IA, format de replay `lqv-replay/1` et
  ses empreintes, sauvegarde `lqv.save`. Le jeu par défaut reste identique au pixel près.
- **Une seule modification touche le moteur du Clash** : la garde d'affinité d'AV-02. Elle ne change aucun résultat d'une
  carte à famille ; ses preuves sont exigées (AV-13).
- Le mode Aventure vit à part (`?aventure=1`, ADR 032) ; il réutilise le moteur de duel, la ville et les cartes.

## AV-01 — Les cartes neutres

- Quatre définitions : `neutre-1` à `neutre-4`, **Neutre I à IV**, Rang 1 à 4, **Puissance 3 / 6 / 9 / 12**, **aucune
  famille** (`family: null`), **aucun effet**, aucun bonus, rareté de base.
- Le lot de départ compte **seize instances physiques, quatre de chaque Rang**, chacune avec son identifiant d'instance
  (pioche, main, défausse sans collision) ; les copies d'un même Rang sont interchangeables.
- **Neutre n'est pas une cinquième famille** : absente de la liste des Quatre Voies ; aucun emblème ; carte blanche et
  grise dessinée par code, Rang immédiatement lisible.
- Une neutre n'a **aucune famille publique** : le journal, les projections publique et privée et l'IA disent « neutre »,
  jamais une famille.

## AV-02 — Les neutres en duel ; l'affinité exige une famille

- Une neutre fait tout ce que fait une Basic : Primaire en Assaut ou en Garde (score = Rang imprimé + soutiens ; dégâts
  = Puissance × multiplicateur) ; Secondaire dans ses trois états (D-02) ; soutien Rang ; soutien Dégâts ; Interférence
  (son Rang imprimé contre le Rang imprimé de la cible) ; Repoussement. Aucune règle de duel n'est ajoutée.
- **Règle précisée : l'affinité de famille exige une famille.** Le +1 d'affinité (D-01 au soutien Rang, §7.2 au
  coefficient de Dégâts) s'applique seulement si la Secondaire **a une famille** et que c'est celle de la Primaire :

```ts
const affinite = secondary.family !== null && secondary.family === primary.family;
// soutien Rang = Rang imprimé + (affinite ? 1 : 0)        (D-01)
// coefficient Dégâts = Rang + (affinite ? 1 : 0)          (§7.2)
```

- Donc **jamais d'affinité** pour une neutre en Secondaire, ni pour une Secondaire familiale qui soutient une Primaire
  neutre.
- **Prisme** garde son texte : +1 au coefficient même avec une Primaire neutre (Prisme II avec Neutre IV : 3).
  **Convergence** garde son texte : une Primaire neutre compte comme « d'une autre famille » (Convergence avec Neutre IV :
  ×6).
- **Référence de non-régression** (à côté de D-05) : Assaut Neutre III P9 contre Garde Neutre IV P12 ; avec Neutre I
  active en Rang, l'Assaut a un score de **4 (et non 5)** contre 4 : la Garde gagne. Avec les Cendre de D-05, l'Assaut
  aurait 5 contre 4 (et infligerait 0).

## AV-03 — Le deck d'aventure : règle R-AV

Tout deck d'un duel de l'aventure, **celui du joueur comme ceux des adversaires**, suit la règle R-AV :

1. **16 cartes ordinaires, exactement quatre de chaque Rang** (I, II, III, IV) ;
2. chaque **identité familiale** au plus une fois (sa Basic **ou** une de ses variantes, jamais les deux) ;
3. les places restantes de chaque Rang sont tenues par des **neutres de ce Rang** ;
4. **zéro ou une Signature** ; le deck compte alors 16 ou 17 cartes ;
5. **deux Techniques** distinctes équipées.

Pour le joueur, chaque carte, Signature et Technique doit en plus être **possédée** (registre des gains, AV-08), et les
neutres d'un Rang ne dépassent pas celles possédées (quatre).

- Le deck standard (16 identités + 1 Signature) **est le cas particulier « zéro neutre + une Signature »** de R-AV.
- Main de 4, deux Secondaires, phases, Interférences : inchangées. **Sans Signature**, aucune Primaire n'est ∞ et
  chaque Clash se décide au score. Avec 16 cartes, la pioche s'épuise un tour plus tôt : pioche vide et prolongation
  s'appliquent telles quelles.
- Le moteur reçoit le deck **explicitement** (liste des définitions) pour un duel de l'aventure ; sans liste, il
  construit le deck standard comme aujourd'hui.

## AV-04 — Le deck du prologue et le remplacement des neutres

- **Prologue** : les seize neutres, **sans Signature** (ADR 031 : aucune Signature avant un chef), avec les deux
  Techniques de la rue (AV-05).
- **À chaque lot de quatre Basics** (affiliation confirmée ou défi officiel engagé, ADR 031) : **une neutre de chaque
  Rang sort du deck et la Basic du même Rang y entre** ; le deck reste à quatre cartes par Rang. Les neutres sorties
  restent dans la collection ; l'éditeur de deck permet de revenir en arrière tant que R-AV est respectée.
- Après **les quatre lots**, le deck n'a plus de neutre ; **dès qu'il porte une Signature**, il est au format standard
  (17 cartes) et le validateur du mode Duel standard l'accepte tel quel.

| Moment | Deck du joueur | Cartes |
|---|---|---:|
| Prologue | 16 neutres | 16 |
| Affiliation (famille 1) | 12 neutres + 4 Basics de la famille 1 | 16 |
| Lieutenants de la famille 1 | idem ; variantes gagnées équipées à la place de leur Basic | 16 |
| Chef de la famille 1 vaincu | + Signature de la famille 1 | 17 |
| Défis officiels des familles 2, 3, 4 | 8, puis 4, puis 0 neutre ; + leurs Basics | 17 |

## AV-05 — Les Techniques

- **Prologue** : Sondage et Recentrage, connues et équipées (les « Techniques de la rue »).
- **Chaque famille enseigne sa Technique avec ses Basics** (affiliation ou défi officiel) : Cendre → Lecture ; Ronce →
  Rupture ; Voile → Dissipation ; Astre → Ancrage. C'est une récompense (ADR 031, amendement 1), inscrite au registre en
  même temps que les Basics (clé `technique:<Technique>`, même source).
- Deux Techniques équipées, distinctes, choisies entre deux duels ; Insight 0..2 (départ 1) inchangé.

## AV-06 — Les Signatures

- **Aucune Signature avant la victoire contre un chef** (prologue, recrutement, lieutenants : jamais).
- Le joueur peut **posséder jusqu'à quatre Signatures** ; son deck en **équipe zéro ou une**. On en change **entre deux
  duels**, dans l'éditeur, jamais pendant un duel. Une Signature possédée peut être équipée même sans la Basic de sa
  famille dans le deck.
- Un adversaire peut jouer une Signature quand le joueur n'en a pas ; c'est annoncé avant le duel.

## AV-07 — Progression : états des familles, lieutenants, compétitions, affiliation

- **États par famille**, monotones : `inconnue → remarqué → invité → affilié` (famille d'accueil) ou `défiée` (défi
  officiel d'une autre famille) `→ chef` = **le chef de cette famille est vaincu** (sa Signature est reçue). « Visité »
  et « rencontré » sont notés à part et n'engagent rien.
- **Deux lieutenants par famille** : le **cadet** met en jeu la **variante de Rang III** de sa famille, le **bras droit**
  la **variante de Rang IV** ; fixes, annoncées avant le duel et jouées par le lieutenant. Le **chef** met en jeu sa
  **Signature ∞**. Ordre : cadet, puis bras droit, puis chef.
- **Les variantes de Rang I et II viennent des compétitions facultatives** de chaque famille dont le joueur a les
  Basics : l'**Épreuve du quartier** (trois membres en série ; une défaite fait repartir la série) donne la variante I ;
  la **Joute de la maison** (après le bras droit ; une contrainte de construction propre à la famille, vérifiée avant le
  duel) donne la variante II. Les seize variantes sont atteignables, chacune une seule fois.
- **Défaite ou abandon** : rien n'est perdu, le défi reste ouvert. **Revanche gagnée** : aucune récompense (registre).
- **Affiliation** : le joueur peut changer de famille d'accueil **jusqu'au lancement de son premier défi de lieutenant**,
  sans perte (les Basics reçues restent, la clé `basics:<Famille>` empêche toute double remise) ; ensuite non, les autres
  familles restant accessibles par leurs défis officiels. Le **chef de la famille d'accueil** se bat **avant** les défis
  officiels des trois autres familles.
- **Registre des gains** : chaque récompense est un gain à **clé unique** (`neutres:depart`, `basics:<F>`,
  `technique:<T>`, `variante:<defId>`, `signature:<F>`) ; accorder une clé existante ne fait rien (rechargement, reprise,
  revanche, double clic) ; une variante exige les Basics de sa famille ; la collection se **dérive** du registre seul.

## AV-08 — Équilibrage : paliers de decks et PV du joueur qui montent

Remplace l'équilibrage par le format miroir et les PV égaux de l'avenant proposé (ARB-M10-09) : **pas de format miroir,
pas de PV égaux**.

- **Les PV du joueur montent à chaque combat de l'aventure, sans plafond** (« comme dans un RPG » : l'entraînement
  augmente les PV et les chances de victoire). Le gain s'inscrit dans la sauvegarde de l'aventure ; il ne change aucune
  règle du duel.
- **La difficulté des adversaires vient de leur palier de deck** (puis, au Championnat, des formats) ; chaque palier a
  ses PV. Tous les decks adverses suivent R-AV (AV-03) :

| Palier | Deck |
|---|---|
| **Populace** | les cartes grises : seize neutres, sans Signature |
| **Membre de famille** | les quatre cartes de sa famille au complet, plus quelques cartes d'autres familles (il a vaincu des membres d'autres familles), neutres pour compléter |
| **Duelliste avancé** | des cartes des quatre familles, avec ou sans variantes |
| **Élite**, puis **champions** | decks complets, variantes et Signature |

- **Valeurs chiffrées** (PV de départ du joueur, gain par combat et ce qui compte comme un combat, PV des adversaires par
  palier, composition exacte de chaque palier, rattachement des personnages aux paliers) : **annexe de calibrage**,
  mesurée par simulation IA contre IA (cible : « plus favorable au joueur de manière générale ») et **validée par le
  responsable** avant d'être figée. Elle se règle sans réécrire cet avenant.

## AV-09 — Sauvegarde, reprise et replays

- **Sauvegarde à part** : `localStorage['lqv.aventure']`, schéma `aventure/1`, copie de secours
  `lqv.aventure.backup` ; écriture vérifiée, version plus récente refusée, sauvegarde illisible mise à l'écart (jamais
  effacée en silence). **La sauvegarde standard `lqv.save` n'est ni lue ni écrite** par l'aventure ; aucune migration.
- **Reprise d'un duel** comme en mode standard : rejeu des commandes sur le moteur pur et contrôle par empreinte ; la
  configuration sauvegardée porte le deck explicite et l'identifiant de catalogue `catalogue-initial-V3.0+16v+4s+6t+4n`.
- Le format `lqv-replay/1` ne change pas. Les duels de l'aventure ne sont pas exportés en replay standard ; un export
  futur prendra le format `lqv-replay/2`.

## AV-10 — Distribution, maisons et premier émissaire (décisions de contenu)

Noms de travail (ARB-M10-07, S1, S2, S3) ; aucune règle de duel :

- **Kaï** : rival récurrent ; il rejoint la Cendre et en devient le bras droit. **Maëlle, Sélène, Orin** : bras droits de
  la Ronce, du Voile, de l'Astre. **Chefs** : Bran (Cendre), Mère Aubépine (Ronce), Ilse (Voile), Halvard (Astre).
  **Cadets** : Tessa, Gaspard, Lior, Mira, sur les gabarits de PNJ avec un accent familial.
- **Maisons** : Cendre au Quai (la Maison du Chantier), Ronce au Fanal (le Quai), Voile dans les Ruelles, Astre au
  Parvis.
- **Les quatre émissaires invitent** au prologue ; le **premier** s'avance selon un fait public du duel (Assauts gagnés
  → Cendre ; Gardes gagnées → Ronce ; Interférences réussies → Voile ; sinon Astre). Aucun secret n'est lu (ADR 011).

## AV-11 — Écriture neutre

- **Aucun accord de genre pour le duelliste joueur**, dans tous les textes du mode Aventure : dialogues, foule, journal,
  quêtes, écrans, aide, récompenses.
- Moyens : **tournures épicènes** (« quelqu'un », « une personne », « la recrue », adresse directe « tu » ou « vous »,
  verbes plutôt que participes accordés) ; **ni point médian ni doublets** (« vu·e », « seul ou seule »).
- Les personnages non joueurs gardent leur genre.

## AV-12 — Lieux de l'aventure

- **L'îlot du Quai de l'aventure est le Quai en quatre rangs** du laboratoire (rue Haute et place de la Halle, ruelle des
  Lanternes et placette du Puits, cour de la Chapelle ; chemins lumineux ; ombres), réutilisé tel quel (M09 en pause).
  Les figures, le directeur des rencontres et les scènes du prologue sont posés dans ses rangs.
- Ce Quai n'existe qu'en diorama d'images générées ; **tant que le responsable n'a pas approuvé ces images (A2, puis
  A1), hors QA, l'aventure se joue dans l'ancien Quai, dessiné par code, en secours**, avec des positions adaptées. Aucun
  statut `approved` n'est changé par l'aventure.
- Le Parvis et les Ruelles restent tels quels jusqu'à la reprise de M09. La démo `?demo=1` et le jeu par défaut ne
  changent pas.

## AV-13 — Preuves exigées (porte du lot M10-A)

- **Non-régression** : tous les tests existants passent **sans modification** ; empreintes des replays standard
  identiques ; jeu par défaut identique au pixel près (`tools/l5-identique.mjs` contre le build du `main` de départ,
  construit hors du dépôt).
- **Neutres** : quatre instances par Rang, seize au total, identifiants distincts ; aucune famille, aucun effet ; aucune
  affinité (neutre + neutre, neutre + Basic, Basic + neutre ; Rang et Dégâts) ; Basic + Basic de même famille : +1
  (inchangé) ; Prisme et Convergence avec une Primaire neutre ; Interférence et Repoussement d'une neutre selon son Rang ;
  référence d'AV-02.
- **Deck sans Signature** jouable jusqu'au bout (K.-O., pioche vide, prolongation), invariants du moteur, sur un grand
  nombre de duels IA contre IA ; projections publique et privée sans fuite ; IA non omnisciente.
- **R-AV** : decks légaux et illégaux ; remplacement à chaque lot ; le deck final passe le validateur standard.

---

## Différences avec l'avenant proposé (`docs/m10/AVENANT_M10A_PROPOSE.md`)

| Avenant proposé | Texte canonique | Nature |
|---|---|---|
| Points A-1 à A-10 avec options, recommandations et raisons | Une seule rédaction par point (AV-01 à AV-13), options écartées retirées | forme |
| A-0 : régime du prototype, **deck de prêt**, neutres hors duel | Supprimé : les neutres jouent en duel (ARB-M10-02, S4) | conséquence des décisions |
| A-2 : Prisme et Convergence « à confirmer », alternative ×4 | Tranché : Prisme +1, Convergence ×6 avec une Primaire neutre ; exemple chiffré de non-régression ajouté (AV-02) | décision + précision |
| A-1 : famille publique implicite | « neutre » partout, jamais une famille, journal compris (AV-01) | précision |
| A-4 à A-6 : R-AV pour le joueur | R-AV pour **tous** les decks de l'aventure, adversaires compris (AV-03), ce qu'exigent les paliers | extension |
| A-3 : Technique « même clé » que les Basics | Clé `technique:<T>` à part, même source (comme le code) (AV-05) | précision |
| A-8 : trois options pour les variantes | Option a : cadet III, bras droit IV, compétitions I et II (AV-07) | décision |
| — | États des familles (ARB-M10-01) et changement d'affiliation (ARB-M10-08) écrits dans l'avenant (AV-07) | ajout |
| **A-10 : format miroir, joueur à 90 PV fixes, chefs à 90, inaugural 50/50** | **Paliers de decks adverses ; PV du joueur qui montent à chaque combat, sans plafond ; pas de miroir ni de PV égaux** ; valeurs en annexe de calibrage, validée à part (AV-08) | **remplacement (ARB-M10-09)** |
| A-9 : `lqv-replay/2` pour les duels avec neutres | Pas d'export de replay de l'aventure dans M10-A ; `/2` réservé à un export futur (AV-09) | précision |
| — | Distribution, maisons, premier émissaire (AV-10) ; écriture neutre (AV-11) ; Quai en rangs et son secours (AV-12) | ajouts (ARB-M10-07, 11, 12 ; S1 à S3) |
| A-11 : impact technique fichier par fichier | Preuves exigées (AV-13) ; l'impact par fichier reste dans l'avenant proposé et `MESURES_M10A.md` | forme |
