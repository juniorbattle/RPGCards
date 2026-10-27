# M12 — Les cartes et leurs effets : conception, lisibilité et mise en avant des activations

**Date :** 2026-10-27. **Statut : MANDAT DE PRODUCTION** (demande du responsable, session cloud, après M11).

## Demande du responsable

> « Il est temps de porter un focus sur les cartes et leur effet. Par ailleurs j'aimerai aussi en combat optimiser le
> visuel des effets et moments d'activation que ce se soit les cartes les compétences et etc... je trouve que ces
> éléments sont encore trop discret et pas toujours compréhensible. Pourtant je pense que nous devrions favoriser de
> véritables mises en avant et effets de captation afin de comprendre ce qui est possible et donc qui se passe. Yugi oh
> duels links le représente bien, des effets de pulse, des animations au centre de l'écran premier plan ou animé un
> effet ou une situation. C'est ce qui captive et donne du rythme. Donc ça sera l'objectif de la tâche avec la
> conception de toutes nos cartes avec variantes afin d'avancer toujours plus vers notre but. Donc prend le temps
> nécessaire pour mener à bien cette tâche. »
> Les fiches d'arbitrages iront à la session locale ; pour l'instant, on continue d'optimiser le jeu.

## Constat (audit du 2026-10-27)

- **Les cartes d'une même famille se ressemblent toutes.** Les 36 définitions standard (16 Basics, 16 variantes,
  4 Signatures) partagent le même dessin : fond, motif et emblème central de la famille ; seule l'intensité suit le
  Rang. Une variante ne se distingue d'une Basic que par une ligne de texte sur la plaque. Les noms longs des
  Signatures sont tronqués. Rien sur la carte ne dit **quand** son effet joue (révélation, Rang, Dégâts,
  Interférence) ; la rareté n'est visible que pour les Signatures.
- **Les activations sont du texte.** En combat, la mise en scène existe pour la révélation des Primaires, la
  Signature, l'Interférence réussie, le Clash, la Garde, les dégâts, la prolongation et la victoire. Mais **aucun
  effet de carte** (Étincelle, Braise, Écaille, Silence, Flamme conquérante…), **aucune Technique**, aucun regard
  privé, aucun gain d'Insight, aucun camouflage ni Repoussement n'a de moment à lui : ils passent en une ligne du
  panneau « Résolution » (« Écaille (vous) : RÉUSSI », plusieurs effets regroupés en « (+2) ») ou du journal.
- **Ce qui est possible ne se voit pas.** Une Secondaire en réserve qui peut être révélée pour un effet, une Technique
  utilisable, une carte dont l'effet attend sa condition n'ont aucun signal propre.

## Ce que la mission change

1. **La conception de toutes les cartes** (contrat `docs/m12/01_CONCEPTION_DES_CARTES.md`, ADR 044) : une
   illustration propre à chaque définition (toujours par code), la lecture de l'effet sur la carte même (icône de
   déclenchement, résumé d'une ligne), les cadres de rareté, les noms entiers, l'inspecteur avec les mots-clés
   expliqués. Les Techniques reçoivent un sceau chacune.
2. **La mise en avant des activations** (contrat `docs/m12/02_MISE_EN_AVANT_DES_ACTIVATIONS.md`, ADR 045) : chaque
   activation a son temps fort au premier plan, au centre de l'écran (la carte agrandie, des impulsions, le nom de
   l'effet, sa conséquence en grand) ; les effets armés, les cartes activables et les Techniques utilisables pulsent
   sur le plateau ; les regards privés montrent la carte vue ; le camouflage, l'Insight, le Repoussement, l'Interférence
   et la Signature annoncée ont leur animation.
3. **Des variantes nouvelles, en proposition seulement** (`docs/m12/03_VARIANTES_PROPOSEES.md`) : un changement de
   règles ; rien n'est appliqué sans la validation du texte canonique par le responsable (gouvernance, §« Ordre
   d'autorité »).

## Limites

- **Règles du duel inchangées** : catalogue, effets, Techniques, Clash, IA, empreintes et replays standard identiques.
  Les résumés d'effet imprimés sur les cartes sont des **résumés** du texte canonique, qui reste celui de l'inspecteur.
- **Secret** : une mise en avant ne naît que d'un événement visible du spectateur (public, ou privé à lui) ; une carte
  camouflée reste générique (famille et case) ; un regard privé n'est montré qu'à son propriétaire (ADR 011).
- **Art par code** : aucune image externe pour les cartes, les effets ni l'interface (AGENTS).
- **Composition du duel inchangée** (ADR 013, 016) : HUD, cadrage du rival, plateau ; les mises en avant passent au
  premier plan puis s'effacent.
- **Accessibilité et QA** : rythme normal, rapide (durées × 0,45), instantané (aucune mise en avant) ; mouvement réduit
  (fondus, aucun déplacement) ; gel pour les captures ; « Passer » arrête tout ; aucun élément fantôme.
- **Ce qui change exprès** : le rendu du duel et des cartes. La garantie « jeu par défaut au repos identique au pixel
  près » des missions précédentes ne vaut plus pour les cartes et le duel ; les comparaisons avant / après la
  remplacent, et l'ancien dessin des cartes reste visible avec `?cartes=v1`.

## Lots

| Lot | Contenu | Preuves |
|---|---|---|
| Cadrage | cette mission, contrats 01 et 02, ADR 044 et 045 | — |
| A | faces des cartes : illustrations, icônes, cadres, noms, inspecteur, sceaux des Techniques | galerie avant / après, tests |
| B | mise en avant des activations et impulsions du plateau | captures par scénario, tests du secret |
| C | variantes proposées (document), fiche d'arbitrages M12 | — |
| QA | tests, empreintes et replays, `qa:browser`, `qa:product`, `qa:rc`, journal | rapports |
