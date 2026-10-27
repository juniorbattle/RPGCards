# M12 — Avenant 09 : trois variantes par identité (48 variantes)

**Date :** 2026-10-27. **Statut : PROPOSÉ, APPLIQUÉ À TITRE PROVISOIRE** sur décision du responsable du même jour :
« j'aime [que] chaque rang de chaque famille ait 3 variants. Donc 48 variants » ; puis, à la question de cette session,
« intégrer au jeu », « choix à la victoire » (aventure) et « oui, dans l'éditeur » (Duel standard). Les textes ci-dessous
sont relus par le responsable pendant son test complet ; validés, ils seront versés tels quels sous `contracts/`
(gouvernance, `contracts/00_GOUVERNANCE_AUTORITE.md`). Ce document remplace la proposition de
`03_VARIANTES_PROPOSEES.md` (16 variantes B), dont les textes sont repris ou ajustés ici pour tenir sur les mécanismes
existants du moteur.

## 1. Ce qui change

- Chaque identité ordinaire (4 familles × Rangs I à IV) existe en **Basic** et en **trois variantes** : A (le catalogue
  d'avant), B et C. Même Rang et même Puissance que la Basic ; seuls la rareté et l'effet changent. **Règle de deck
  inchangée** : une carte par identité (Basic, A, B ou C) et une Signature.
- **Duel standard** : le deck par défaut garde les variantes A (empreintes, replays et calibrage d'avant inchangés tant
  qu'aucun deck ne prend une variante B ou C) ; l'éditeur propose Basic, A, B ou C pour chaque identité possédée ;
  une récompense de variantes d'une famille donne ses trois variantes par identité.
- **Aventure** : chaque victoire qui donne une variante (Épreuve, Joute, lieutenants) laisse **choisir** A, B ou C ; les
  deux autres se gagnent ensuite (revanches contre les membres, guetteurs et lieutenants de la famille, Championnat).
- Aucune nouvelle phase ni ressource. Le Clash (V3.3), la Garde, l'Insight (+1 par tour, réserve 2), le secret
  (ADR 011 : un effet d'une carte camouflée ne publie que sa conséquence observable ; un regard est privé) et les
  Signatures ne changent pas. Une Silence neutralise l'effet encore en attente d'une Primaire, comme aujourd'hui ;
  les regards donnés à la révélation (Ombre portée, Miroir brisé, comme Clairvoyance voilée) sont immédiats.
- « Subir N dégâts fixes » : dégâts non multipliables, après le Clash, comme Braise ou Contrecoup. « Interférée » : un
  soutien annulé par une Interférence adverse réussie.

## 2. Les 48 variantes

| Identité | A (d'avant) | B | C |
|---|---|---|---|
| Cendre I | Étincelle | **Tison** (Peu commune, Dégâts) | **Escarbille** (Peu commune, révélation volontaire) |
| Cendre II | Braise | **Percée** (Peu commune, Rang) | **Bravade** (Rare, Primaire) |
| Cendre III | Ferveur | **Surenchère** (Rare, Rang) | **Brûlure** (Rare, Interférer) |
| Cendre IV | Contrecoup | **Fournaise** (Épique, Dégâts) | **Phénix** (Épique, Primaire) |
| Voile I | Éclaireur | **Leurre** (Peu commune, Rang) | **Murmure** (Peu commune, Interférer) |
| Voile II | Détour | **Écho** (Peu commune, Primaire) | **Fil d'ombre** (Rare, Rang) |
| Voile III | Dissimulation | **Ombre portée** (Rare, Primaire) | **Contre-jour** (Rare, Interférer) |
| Voile IV | Silence | **Éclipse** (Épique, Dégâts) | **Miroir brisé** (Épique, Primaire) |
| Ronce I | Racine | **Épine** (Peu commune, Rang) | **Bouture** (Peu commune, Interférer) |
| Ronce II | Écaille | **Sève** (Peu commune, révélation volontaire) | **Lierre** (Rare, Interférer) |
| Ronce III | Entrave | **Mur de ronces** (Rare, Rang) | **Racines profondes** (Rare, Primaire) |
| Ronce IV | Ténacité | **Rempart** (Épique, Primaire) | **Herse** (Légendaire, Rang) |
| Astre I | Repère | **Boussole** (Peu commune, Rang) | **Comète** (Peu commune, Dégâts) |
| Astre II | Prisme | **Constellation** (Rare, Dégâts) | **Sextant** (Peu commune, révélation volontaire) |
| Astre III | Relance | **Équinoxe** (Épique, Primaire) | **Harmonie** (Rare, Rang) |
| Astre IV | Convergence | **Zénith** (Légendaire, Rang) | **Solstice** (Épique, Primaire) |

## 3. Textes canoniques

### Cendre — la pression et le risque
- **Tison** (Cendre I). *Secondaire · Amplifier les dégâts.* « Coefficient +1 si la Primaire est en Assaut. Si la Primaire
  perd le Clash, le propriétaire subit 2 dégâts fixes. »
- **Escarbille** (Cendre I). *Secondaire · révélation volontaire.* « Révélation volontaire : le propriétaire subit 2 dégâts
  fixes et pioche une carte. Sans effet s'il a 2 PV ou moins. »
- **Percée** (Cendre II). *Secondaire · Amplifier le Rang.* « Si la Primaire gagne en Assaut contre une Garde : la Garde
  dominée absorbe 2 de moins (minimum 0). »
- **Bravade** (Cendre II). *Primaire · Assaut.* « Si elle perd en Assaut contre une Garde : la Garde victorieuse ne
  Repousse pas et son propriétaire ne gagne pas l'Insight de Garde victorieuse. »
- **Surenchère** (Cendre III). *Secondaire · Amplifier le Rang.* « Soutien +2 au score. Si la Primaire perd le Clash, le
  propriétaire subit 3 dégâts fixes. »
- **Brûlure** (Cendre III). *Secondaire · Interférer.* « Si son Interférence réussit et n'est pas annulée : l'adversaire
  subit 2 dégâts fixes. »
- **Fournaise** (Cendre IV). *Secondaire · Amplifier les dégâts.* « Si la Primaire gagne en Assaut contre une Garde : la
  Garde dominée n'absorbe que le quart de sa Puissance imprimée (arrondi au supérieur) au lieu de la moitié. »
- **Phénix** (Cendre IV). *Primaire.* « Si elle perd le Clash : elle retourne dans la main du propriétaire au lieu de la
  défausse. »

### Voile — l'information et la perturbation
- **Leurre** (Voile I). *Secondaire · Amplifier le Rang.* « Une Interférence adverse dirigée contre Leurre échoue, quel que
  soit son Rang. » (Première version proposée : Leurre se masquait elle-même ; écartée, la seule carte qui se masque
  seule aurait été reconnue aussitôt, et son Rang avec.)
- **Murmure** (Voile I). *Secondaire · Interférer.* « Si son Interférence réussit et n'est pas annulée : le propriétaire voit
  privément la carte au sommet de la pioche adverse. »
- **Écho** (Voile II). *Primaire.* « Si elle perd le Clash : le propriétaire voit privément une carte aléatoire de la main
  adverse. »
- **Fil d'ombre** (Voile II). *Secondaire · Amplifier le Rang.* « Si la Primaire gagne et que Fil d'ombre n'est pas
  Interféré : le propriétaire voit privément une carte aléatoire de la main adverse. »
- **Ombre portée** (Voile III). *Primaire.* « À la révélation : le propriétaire voit privément la plus ancienne Secondaire
  adverse encore cachée. »
- **Contre-jour** (Voile III). *Secondaire · Interférer.* « Son Interférence réussit aussi contre une Secondaire d'un Rang
  imprimé supérieur d'un cran au sien. »
- **Éclipse** (Voile IV). *Secondaire · Amplifier les dégâts.* « Si la Primaire gagne et blesse : l'adversaire perd 1
  Insight de sa réserve et n'en gagne aucun ce tour. »
- **Miroir brisé** (Voile IV). *Primaire.* « À la révélation : le propriétaire voit privément les Secondaires adverses
  encore cachées (deux au plus). »

### Ronce — la garde et la préservation
- **Épine** (Ronce I). *Secondaire · Amplifier le Rang d'une Garde.* « Si la Garde gagne contre un Assaut : l'adversaire
  subit 1 dégât fixe. »
- **Bouture** (Ronce I). *Secondaire · Interférer.* « Si son Interférence réussit et n'est pas annulée : le propriétaire
  soigne 2 PV (sans dépasser ses PV max). »
- **Sève** (Ronce II). *Secondaire · révélation volontaire.* « Révélation volontaire : si le propriétaire a moins de PV que
  l'adversaire, il soigne 2 PV (sans dépasser ses PV max). »
- **Lierre** (Ronce II). *Secondaire · Interférer.* « Si son Interférence réussit et n'est pas annulée : Lierre reste active
  dans sa case au lieu d'aller à la défausse. »
- **Mur de ronces** (Ronce III). *Secondaire · Amplifier le Rang.* « Soutien +2 au score si la Primaire est en Garde. »
- **Racines profondes** (Ronce III). *Primaire · Garde.* « Si elle gagne en Garde : elle retourne dans la main du
  propriétaire au lieu de la défausse. »
- **Rempart** (Ronce IV). *Primaire · Garde.* « En Garde, si un Assaut la domine : elle absorbe les trois quarts de sa
  Puissance imprimée (arrondi au supérieur) au lieu de la moitié, toujours dans la limite de P_Assaut − 1. »
- **Herse** (Ronce IV). *Secondaire · Amplifier le Rang d'une Garde.* « Si la Garde gagne contre un Assaut : l'adversaire
  subit 3 dégâts fixes. »

### Astre — l'adaptation et la recirculation
- **Boussole** (Astre I). *Secondaire · Amplifier le Rang.* « Compte l'affinité (+1) avec une Primaire de toute famille
  (sans double +1). »
- **Comète** (Astre I). *Secondaire · Amplifier les dégâts.* « Si la Primaire gagne et que Comète n'est pas Interférée :
  Comète retourne au sommet de la pioche du propriétaire au lieu de la défausse. »
- **Constellation** (Astre II). *Secondaire · Amplifier les dégâts.* « Coefficient +1 si l'autre soutien engagé du
  propriétaire (Rang ou Dégâts), non annulé, est d'une autre famille que Constellation. »
- **Sextant** (Astre II). *Secondaire · révélation volontaire.* « Révélation volontaire : le propriétaire voit privément les
  deux cartes du sommet de sa pioche. »
- **Équinoxe** (Astre III). *Primaire · Assaut.* « En Assaut, à égalité de score contre un Assaut : elle gagne l'égalité
  (elle inflige ses dégâts ; ceux de l'adversaire ne s'appliquent pas). Sans effet contre une autre Équinoxe. »
- **Harmonie** (Astre III). *Secondaire · Amplifier le Rang.* « Soutien +2 au score si l'autre soutien engagé du
  propriétaire (Rang ou Dégâts), non annulé, est d'une autre famille qu'Harmonie. »
- **Zénith** (Astre IV). *Secondaire · Amplifier le Rang.* « Soutien +1 au score si la Primaire est d'une autre famille. Si
  la Primaire gagne et que Zénith n'est pas Interféré : Zénith retourne au sommet de la pioche du propriétaire au lieu de
  la défausse. »
- **Solstice** (Astre IV). *Primaire.* « Si elle gagne le Clash : +1 Insight (limite +1 par tour, réserve 2). »

## 4. Mesures et calibrage

Mesures IA contre IA (`tools/m12-variantes-mesure.ts`, rapport `artifacts/qa/m12/variantes/`) : chaque variante B ou C
à la place de la variante A de son identité, dans un deck standard, contre le deck standard ; écart de taux de victoire et
durée des duels. Un texte hors marge est ajusté et l'ajustement noté ici (§5).

## 5. Ajustements après mesure

(Rempli après la mesure.)
