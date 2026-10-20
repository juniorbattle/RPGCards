# ADR 029 — Recrutement par les Quatre Voies avec choix explicite du joueur (M10)

**Date : 2026-10-20 — Statut : APPROUVÉ pour l'affiliation option B. L'ADR 030 ratifie séparément la composition de 16 cartes neutres, mais PAS encore leurs Puissances / Signature / Techniques ni l'implémentation.**

## Décision du responsable

Le responsable a choisi **l'option B** : « les familles remarquent le joueur, mais il conserve le choix de son affiliation ».

Cette décision s'inscrit dans l'arc proposé : duel public inattendu depuis un deck de cartes neutres de la populace, intérêt des Quatre Voies, recrutement, ascension dans une famille, conquête des cartes des autres voies, Championnat des Champions. Elle ne modifie **aucune règle V3.0/V3.2/V3.3** à elle seule.

## Conséquences normatives dans l'écriture M10

1. Le premier contact peut provenir d'une seule famille selon des faits observables du duel initial, une présence en ville ou une scène scénarisée ; **l'approche initiale n'est ni un engagement ni une attribution forcée**.
2. Le joueur choisit explicitement sa voie. Il doit pouvoir **accepter, différer ou chercher à rejoindre une autre famille**, avec un itinéraire effectif vers chacune des quatre et sans pénalité cachée ni impasse s'il refuse une offre.
3. Une confirmation explicite précède l'enregistrement de l'affiliation. L'UI communique clairement la famille, son identité et les conséquences immédiates connues avant acceptation.
4. Les étapes `remarqué`, `invité`, `affilié` et `chef` sont distinctes dans le journal/sauvegarde ; seules les deux dernières supposent une progression acceptée. Les offres non acceptées ne doivent pas faire gagner les cartes d'affiliation.
5. La décision d'affiliation ne doit pas recalculer rétroactivement le duel du prologue ni changer les informations secrètes du rival. Si le jeu interprète le style du joueur, utiliser uniquement des faits autorisés et ne pas enfermer le joueur dans la voie suggérée.
6. La **permanence** de l'affiliation après confirmation, le premier lot de cartes, les Signatures et la construction des decks neutres restent **en arbitrage**. La liberté de choisir ne tranche pas automatiquement le droit de changer plus tard.

## Frontière d'autorité

- **Ratifié :** agence du joueur lors de l'affiliation, possibilité d'examiner/refuser/différer/rechercher une autre voie, quatre affiliations atteignables.
- **Concept narratif à détailler :** duel inattendu, reconnaissance publique, recruteurs, progression familiale et championnat.
- **Ratifié séparément (ADR 030) :** exactement seize cartes neutres, quatre copies des Rangs I, II, III et IV, sans famille, effet ni bonus propre.
- **Non ratifié :** Puissances chiffrées des neutres, Signature, Techniques au prologue, remplacement des copies, répartition des récompenses, timing/règles des défis aléatoires, changements d'affiliation postérieurs.
- **Chantier actif :** M09 ville frontale 2.5D, cadrage et kit du Quai encore en revue. L'ADR 024/025/028 et les limites des assets approuvés restent en vigueur.

## Tests d'acceptation futurs

Depuis le prologue, une invitation n'engage pas automatiquement le joueur ; refuser/différer permet de continuer l'aventure ; chacun des quatre choix conduit à une affiliation enregistrée sans incohérence ni duplications ; sauvegarde/reprise ne confond pas `invité` avec `affilié`; les duels historiques à 17 cartes et leurs tests restent inchangés jusqu'à ratification d'un avenant distinct.

Voir `docs/missions/M10_ORIGINES_ASCENSION_QUATRE_VOIES.md`. 
