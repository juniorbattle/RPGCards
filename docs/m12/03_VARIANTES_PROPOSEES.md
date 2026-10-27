# M12 — Contrat 3 : variantes proposées (avenant à valider)

**Date :** 2026-10-27. **Statut : PROPOSÉ, NON APPLIQUÉ.** C'est un changement de règles : rien n'entre dans le code, le
catalogue ni l'IA tant que le responsable n'a pas validé le **texte canonique** (gouvernance,
`contracts/00_GOUVERNANCE_AUTORITE.md`, § « Ordre d'autorité ») ; une fois validé, ce texte deviendrait l'avenant 09
sous `contracts/`. Les faces des cartes (contrat 1) et les temps forts (contrat 2) sont prêts à recevoir ces cartes sans
autre conception : un motif par effet, une icône de déclenchement, un résumé d'une ligne, une conséquence en grand.

## 1. L'idée

Aujourd'hui, chacune des 16 identités ordinaires (4 familles × Rangs I à IV) existe en **Basic** et en **une
variante**. La demande du responsable (« la conception de toutes nos cartes avec variantes ») appelle une collection
plus large. Proposition : **une seconde variante par identité** (la « variante B »), soit 16 cartes de plus, sur les
mêmes principes que les 16 d'aujourd'hui :

- même Rang et même Puissance que la Basic de l'identité (3 / 6 / 9 / 12) ; seule la rareté et l'effet changent ;
- un effet court, lisible en une ligne, **sur les mécanismes qui existent déjà** (soutien de Rang, coefficient,
  Interférence, révélation volontaire, effet de Primaire armé, Insight, soin, regard privé, camouflage, Repoussement,
  pioche) : aucune nouvelle phase, aucune nouvelle ressource ;
- le thème de la famille (`FAMILY_THEME`) : Cendre la pression et le risque, Voile l'information et la perturbation,
  Ronce la garde et la préservation, Astre l'adaptation et la recirculation ;
- un **déclenchement différent** de la variante A de la même identité quand c'est possible, pour que le choix entre A
  et B soit un vrai choix de jeu, pas une amélioration.

**Règle de deck inchangée** : une carte par identité. Pour chaque identité, le deck prend la Basic, la variante A
**ou** la variante B. Le deck standard actuel (`variants: 'all'`) garde les variantes A : les empreintes, les replays et
le calibrage du Duel standard ne bougent pas tant qu'aucun deck ne prend une variante B.

## 2. Les 16 variantes B

| Identité | Variante A (aujourd'hui) | **Variante B proposée** | Rareté | Déclenchement | Résumé (sur la carte, ≤ 80 signes) |
|---|---|---|---|---|---|
| Cendre I | Étincelle (Rang) | **Tison** | Peu commune | révélation volontaire | Révélée : −2 PV, +1 Insight |
| Cendre II | Braise (Primaire) | **Percée** | Peu commune | Amplifier le Rang | Contre une Garde : elle absorbe 2 de moins |
| Cendre III | Ferveur (Dégâts) | **Surenchère** | Rare | Amplifier les dégâts | Gagne : coefficient +1 ; perd : −2 PV |
| Cendre IV | Contrecoup (Primaire) | **Fournaise** | Épique | révélation de la Primaire | Contre une Garde : absorption au quart |
| Voile I | Éclaireur (révélation) | **Leurre** | Peu commune | révélation volontaire | Révélée : se masque elle-même jusqu'à la fin du tour |
| Voile II | Détour (Interférer) | **Écho** | Peu commune | révélation de la Primaire | Perd : regard privé sur la main adverse |
| Voile III | Dissimulation (révélation) | **Ombre portée** | Rare | Interférer | Interférence réussie : regard sur une Secondaire cachée |
| Voile IV | Silence (Interférer) | **Nuit sans lune** | Légendaire | révélation volontaire | Révélée : vos deux Secondaires actives masquées |
| Ronce I | Racine (Rang) | **Épine** | Peu commune | Amplifier le Rang | Garde victorieuse : 1 dégât fixe |
| Ronce II | Écaille (Rang) | **Sève** | Peu commune | révélation volontaire | Révélée, si vous êtes derrière : soin 2 PV |
| Ronce III | Entrave (Primaire) | **Lierre** | Rare | Interférer | Interférence réussie : reste en jeu |
| Ronce IV | Ténacité (Rang) | **Rempart** | Épique | révélation de la Primaire | Garde dominée : absorbe les trois quarts |
| Astre I | Repère (révélation) | **Boussole** | Peu commune | Amplifier le Rang | Rang : affinité +1 avec toute famille |
| Astre II | Prisme (Dégâts) | **Constellation** | Rare | Amplifier les dégâts | Avec un soutien d'une autre famille : coefficient +1 |
| Astre III | Relance (Interférer) | **Équinoxe** | Épique | révélation de la Primaire | Égalité A/A : elle l'emporte |
| Astre IV | Convergence (Dégâts) | **Zénith** | Légendaire | Amplifier le Rang | Rang +1 hors famille ; victoire : retour au sommet |

## 3. Textes canoniques proposés

Chaque texte suit la forme des effets d'aujourd'hui (`EFFECTS` dans `src/game/catalog/cards.ts`) : rôle imprimé, puis
texte. « Perdre des PV » n'est pas subir des dégâts : rien ne le réduit, ne le multiplie ni ne le déclenche.

### Cendre — la pression et le risque

- **Tison** (Cendre I, Peu commune). *Secondaire · révélation volontaire.* « Révélation volontaire : le propriétaire
  perd 2 PV et gagne +1 Insight (limite +1 par tour, réserve 2). Sans effet si le propriétaire a 2 PV ou moins. »
  Pourquoi : la Cendre paie pour agir ; Tison nourrit les Techniques au prix de la vie. Vigilance : partage la limite
  d'Insight de Ferveur (une seule source par tour).
- **Percée** (Cendre II, Peu commune). *Secondaire · Amplifier le Rang d'un Assaut.* « Si la Primaire gagne contre une
  Garde : la Garde dominée absorbe 2 de moins (minimum 0). » Pourquoi : la Cendre force les Gardes ; la règle V3.3
  (`P_Assaut − min(⌈P_Garde / 2⌉, P_Assaut − 1)`) garde son plancher d'1 dégât de base.
- **Surenchère** (Cendre III, Rare). *Secondaire · Amplifier les dégâts.* « Si la Primaire gagne et blesse : +1 au
  coefficient de Surenchère. Si elle perd : le propriétaire perd 2 PV après le Clash. » Pourquoi : la mise qui double ;
  Ferveur rend de l'Insight, Surenchère frappe plus fort et coûte en cas d'échec.
- **Fournaise** (Cendre IV, Épique). *Primaire · Assaut.* « Si elle gagne en Assaut contre une Garde : la Garde
  dominée absorbe le quart de sa Puissance imprimée (arrondi au supérieur) au lieu de la moitié. » Pourquoi : Contrecoup
  punit la défaite contre un Assaut ; Fournaise brise une Garde. Les deux IV de la Cendre couvrent les deux postures
  adverses.

### Voile — l'information et la perturbation

- **Leurre** (Voile I, Peu commune). *Secondaire · révélation volontaire.* « Révélation volontaire : Leurre est
  masquée à l'adversaire jusqu'à la fin du tour (famille visible ; identité, Rang et Puissance cachés), comme par
  Dissimulation. Sans effet si une carte du propriétaire est déjà masquée ce tour. » Pourquoi : une Interférence
  adverse ne réussit que si son Rang imprimé atteint celui de sa cible ; un Rang I masqué fait douter d'un Rang IV.
  Vigilance : un seul camouflage par joueur et par tour, comme aujourd'hui.
- **Écho** (Voile II, Peu commune). *Primaire.* « Si elle perd le Clash : le propriétaire voit privément une carte
  aléatoire de la main adverse. » Pourquoi : le Voile apprend même en perdant ; regard privé (ADR 011).
- **Ombre portée** (Voile III, Rare). *Secondaire · Interférer.* « Si son Interférence réussit et n'est pas annulée :
  le propriétaire voit privément la plus ancienne Secondaire adverse encore cachée, après le Clash. » Pourquoi : Détour
  regarde la main, Ombre portée regarde la table ; la moitié de Clairvoyance voilée, sans la Signature.
- **Nuit sans lune** (Voile IV, Légendaire). *Secondaire · révélation volontaire.* « Révélation volontaire : jusqu'à
  la fin du tour, Nuit sans lune et l'autre Secondaire active du propriétaire sont masquées à l'adversaire (famille
  visible ; identité, Rang et Puissance cachés). Si une Dissimulation du propriétaire est révélée le même tour, Nuit
  sans lune la remplace. » Pourquoi : le sommet du camouflage. Vigilance : la seule carte qui masque deux cartes ; le
  moteur doit tenir deux cibles masquées (aujourd'hui une seule, `PlayerState.mask`).

### Ronce — la garde et la préservation

- **Épine** (Ronce I, Peu commune). *Secondaire · Amplifier le Rang d'une Garde.* « Si la Garde gagne contre un
  Assaut : l'adversaire subit 1 dégât fixe, non multipliable, après le Clash. » Pourquoi : la Garde qui pique ; une
  Garde victorieuse n'inflige rien aujourd'hui.
- **Sève** (Ronce II, Peu commune). *Secondaire · révélation volontaire.* « Révélation volontaire : si le propriétaire
  a moins de PV que l'adversaire, il soigne 2 PV (sans dépasser ses PV max) ; sinon, sans effet. » Pourquoi : la
  préservation de celle ou celui qui est derrière ; Écaille soigne après une Garde, Sève avant le Clash.
- **Lierre** (Ronce III, Rare). *Secondaire · Interférer.* « Si son Interférence réussit et n'est pas annulée : Lierre
  reste active dans sa case au lieu d'aller à la défausse. » Pourquoi : la Ronce s'accroche. Vigilance : voisinage
  avec la Technique Ancrage (même résultat, sans condition) : Lierre ne coûte pas d'Insight mais exige une
  Interférence réussie.
- **Rempart** (Ronce IV, Épique). *Primaire · Garde.* « En Garde, si elle est dominée par un Assaut : elle absorbe les
  trois quarts de sa Puissance imprimée (arrondi au supérieur) au lieu de la moitié, toujours dans la limite de
  `P_Assaut − 1`. » Pourquoi : la Garde de Rang IV qui tient même dominée ; l'inverse exact de Fournaise.

### Astre — l'adaptation et la recirculation

- **Boussole** (Astre I, Peu commune). *Secondaire · Amplifier le Rang.* « Compte l'affinité (+1) avec une Primaire de
  toute famille (sans double +1). » Pourquoi : le Prisme du Rang ; l'Astre se joint à toutes les familles.
- **Constellation** (Astre II, Rare). *Secondaire · Amplifier les dégâts.* « +1 au coefficient si l'autre soutien
  engagé du propriétaire, non annulé, est d'une autre famille que Constellation. » Pourquoi : la synergie entre
  familles ; un deck mêlé y gagne.
- **Équinoxe** (Astre III, Épique). *Primaire · Assaut.* « En Assaut, à égalité de score contre un Assaut : Équinoxe
  gagne l'égalité (elle inflige ses dégâts ; ceux de l'adversaire ne s'appliquent pas). Sans effet contre une
  Signature. » Pourquoi : l'adaptation au moment juste ; l'égalité A/A est aujourd'hui un double impact.
- **Zénith** (Astre IV, Légendaire). *Secondaire · Amplifier le Rang.* « +1 au score supplémentaire si la Primaire est
  d'une autre famille. Si la Primaire gagne et que Zénith n'est pas Interférée : Zénith retourne au sommet de la pioche
  du propriétaire au lieu de la défausse. » Pourquoi : la recirculation au plus haut ; Relance revient après une
  Interférence, Zénith après une victoire.

## 4. Ce que chaque carte demanderait (si les textes sont validés)

| Chantier | Détail |
|---|---|
| Catalogue | 16 `EffectId` de plus ; `VARIANTS` passe à deux variantes par identité ; `buildDeck` choisit A, B ou Basic par identité ; le deck standard garde A |
| Moteur | les crochets existent pour 13 cartes sur 16 (révélation volontaire, soutiens, Interférence, effets armés, Insight, soin, regard, retour en pioche) ; **à créer** : la perte de PV hors dégâts (Tison, Surenchère), deux cibles masquées (Nuit sans lune), le vainqueur d'une égalité A/A (Équinoxe) |
| IA | `decide` doit savoir valoriser chaque variante B (profils historiques et niveau 2) ; tests de non-régression des profils sur le deck standard |
| Présentation | 16 motifs dessinés par code (`cardMotifs.ts`), résumés et conséquences (`cardText.ts`, `activations.ts`) ; tout le reste (pastille, cadre, inspecteur, temps forts, sons) existe déjà |
| Calibrage | simulations IA contre IA (outils V3.3) : chaque variante B contre sa variante A, puis des decks mêlés ; écarts de victoire tenus dans la marge de l'annexe ; mesure de la durée des duels |
| Aventure | où se gagnent les variantes B (proposition : Joutes, revanches et Championnat, quand les variantes A viennent des lieutenants) ; les rivaux des chapitres IV et V pourraient en jouer |
| Secret | regards privés et camouflages sous les règles d'ADR 011 ; tests du secret étendus aux nouvelles formes |

## 5. Ce qui reste à trancher (fiche M12)

1. Le **principe** : une seconde variante par identité, ou pas maintenant.
2. Les **textes** : tels quels, à reprendre (par carte), ou à écarter (par carte).
3. Le **Duel standard** : reste sur les variantes A (recommandé), ou un deck standard qui choisit ses variantes.
4. L'**Aventure** : où se gagnent les variantes B.

Aucune de ces cartes n'existe dans le jeu tant que ce contrat n'est pas validé et versé en avenant.
