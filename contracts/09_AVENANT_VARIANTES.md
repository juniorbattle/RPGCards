# 09 — Avenant V3.4 : trois variantes par identité (48 variantes), soins et K.-O. d'un seul tenant

**Ratification (2026-11-11) :** fiche d'arbitrages de clôture remplie par le responsable (passe 223, tableau
`docs/FICHE_ARBITRAGES_CLOTURE.md`) : **A3** « verser l'avenant 09 sous `contracts/` après le lot de correction, nouvelle
étiquette (V3.0+delta-V3.4), A1 et A2 dedans » ; **A1** « suivre V3.0 §9.3 : dégâts et soins ensemble, puis le K.-O. » ;
**A2** « ratifier les trois lectures actuelles ». Texte d'origine : `docs/m12/04_AVENANT_09_VARIANTES.md` (2026-10-27,
décisions du responsable du même jour : « chaque rang de chaque famille [a] 3 variants. Donc 48 variants », « intégrer au
jeu », « choix à la victoire », « oui, dans l'éditeur »), appliqué à titre provisoire depuis la passe 156, versé ici tel
quel avec A1, A2, la règle unique de légalité de l'Interférence (Contre-jour, défaut corrigé à la passe 224) et les mesures
de clôture (B1, B2 : aucun ajustement).

**Statut : FIGÉ / APPROUVÉ.** Avenant au règlement V3.0 + delta V3.2, après les avenants 07 (la Garde réduit sans annuler)
et 08 (Signatures annoncées, révision). Pour tout le jeu (Duel standard, Aventure, rivaux, Championnat). **Étiquette des
règles : `V3.0+delta-V3.4`** (une seule constante, `RULES_LABEL`, `src/game/model/types.ts`) ; catalogue
`catalogue-V3.0+48v+4s+6t` (`CATALOG_VERSION`). Un duel sauvegardé sous une autre étiquette ou un autre catalogue n'est
jamais rejoué : il recommence au tour 1, raison affichée.

## 1. Ce qui change

- Chaque identité ordinaire (4 familles × Rangs I à IV) existe en **Basic** et en **trois variantes** : A (le catalogue
  d'avant), B et C. Même Rang et même Puissance que la Basic ; seuls la rareté et l'effet changent. **Règle de deck
  inchangée** : une carte par identité (Basic, A, B ou C) et une Signature.
- **Duel standard** : le deck par défaut garde les variantes A (empreintes, replays et calibrage d'avant inchangés tant
  qu'aucun deck ne prend une variante B ou C) ; l'éditeur propose Basic, A, B ou C pour chaque identité possédée ;
  une récompense de variantes d'une famille donne ses trois variantes par identité.
- **Aventure** : la première victoire qui donne une variante (Épreuve du quartier, Joute de la maison, cadet ou bras droit)
  laisse **choisir** A, B ou C ; chaque nouvelle victoire au même endroit (série d'Épreuve regagnée, Joute regagnée,
  revanche gagnée contre le même lieutenant) donne la suivante pas encore possédée, puis plus rien ; le **titre du
  Championnat** donne toutes celles qui manquent encore (familles dont on a les cartes de base). Une variante gagnée
  remplace la Basic de son identité dans le deck ; une variante déjà équipée reste en place. Le même fait rejoué (reprise)
  ne donne jamais rien (registre, idempotence).
- Aucune nouvelle phase ni ressource. Le Clash (V3.3), la Garde, l'Insight (+1 par tour, réserve 2), le secret
  (ADR 011 : un effet d'une carte camouflée ne publie que sa conséquence observable ; un regard est privé) et les
  Signatures ne changent pas. Une Silence neutralise l'effet encore en attente d'une Primaire, comme aujourd'hui ;
  les regards donnés à la révélation (Ombre portée, Miroir brisé, comme Clairvoyance voilée) sont immédiats.
- **Décision de clôture (A1)** : les soins de cet avenant (Bouture, Écaille, Sève hors du Clash) suivent V3.0 §9.3 : PV,
  dégâts et soins d'un seul tenant, puis le K.-O. (§4.1).
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
- **Escarbille** (Cendre I). *Secondaire · révélation volontaire.* « Révélation volontaire : le propriétaire subit 1 dégât
  fixe et pioche une carte. Sans effet s'il a 1 PV. » (Ajustée après mesure, §5.)
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

## 4. Règles du Clash précisées par cet avenant

### 4.1 Soins et K.-O. d'un seul tenant (A1, V3.0 §9.3)

À la fin de la résolution simultanée, les PV de chaque joueur se calculent d'un seul tenant : **PV − dégâts (de base et
fixes) + soins**, plafonné à PV_max ; puis le K.-O. est jugé. Un soin ne sauve donc pas d'un coup mortel (à 3 PV, 12
dégâts et un soin de 2 : K.-O.) ; si les deux joueurs sont à 0 PV ou moins, c'est la mort subite (prolongation, 1 PV
chacun), quel que soit le soin de l'un d'eux. Hors d'un coup mortel, rien ne change (à 1 PV, 2 dégâts fixes et un soin
de 2 laissent 1 PV). Le journal montre les PV après les dégâts (jamais sous 0), puis le soin réellement rendu.

### 4.2 Trois lectures ratifiées (A2)

- **Fournaise et Rempart s'annulent** : la Garde dominée absorbe la moitié de sa Puissance (règle de l'avenant 07).
- **Percée s'applique après Rempart ou Fournaise** : la part absorbée (trois quarts, quart ou moitié, plafonnée à
  P_Assaut − 1) perd encore 2, minimum 0.
- **Quand Équinoxe gagne l'égalité, les effets du perdant se déclenchent** : sa Primaire est battue (Tison,
  Surenchère, Contrecoup, Phénix…).

### 4.3 Une seule règle de légalité de l'Interférence (Contre-jour)

Le Rang imprimé de la Secondaire qui interfère doit atteindre celui de la cible ; **Contre-jour** atteint aussi un cran de
plus. Cette règle est la même pour le Clash, la validation des commandes, l'interface (cibles permises) et l'IA
(`interferenceReaches`, `src/game/engine/clash.ts`). Une cible masquée se vise toujours à l'aveugle (§7.3) ; si
l'Interférence échoue contre elle, la raison publique reste générique (ADR 011 : ni son Rang ni son effet, Leurre
comprise, ne se déduisent).

### 4.4 Révélations volontaires simultanées

Escarbille et Sève, révélées le même tour par les deux joueurs, sont évaluées sur les PV d'avant toute révélation : l'issue
ne dépend pas du siège.

## 5. Mesures et calibrage

Mesures IA contre IA (`tools/m12-variantes-mesure.ts`, rapport `artifacts/qa/m12/variantes/mesure.md`) : chaque
variante B ou C à la place de la variante A de son identité, dans un deck standard, contre le deck standard ; 400 duels par
ligne, IA « équilibré » des deux côtés, sièges alternés, Signatures et Techniques tirées par graine ; écart de taux de
victoire et durée des duels ; marge ±6 points (l'écart type d'une ligne est d'environ 2,5 points). Un texte hors marge est
ajusté et l'ajustement noté ici (§5).

**Résultats (commit `0d681dc`, 657 s) :** témoin A contre A 50,5 % ; **31 variantes sur 32 dans la marge** ; une hors
marge : **Escarbille à 42,8 % (−7,3)**. Les plus fortes : Boussole 54,8 %, Phénix 54,3 %, Leurre et Solstice 53,8 %,
Miroir brisé 53,5 % ; les plus faibles : Tison 45,0 %, Surenchère 45,5 %, Comète et Harmonie 47,0 %. Deck tout B contre
deck tout A 53,0 % ; tout C contre tout A 51,8 % ; tout B contre tout C 55,8 %. Durée des duels inchangée (9,4 à 10,3 tours
contre 9,7 au témoin).

## 6. Ajustements après mesure

- **Escarbille** : 2 dégâts fixes → **1 dégât fixe** (seuil : sans effet à 1 PV au lieu de 2 PV ou moins). Remesurée sur
  800 duels (`artifacts/qa/m12/variantes/mesure-Escarbille.md`) : **45,9 % (−4,1), dans la marge**.
- Aucun autre ajustement : les écarts restants sont dans la marge. Tison et Surenchère (le risque de la Cendre, −5,0 et
  −4,5) et Boussole (+4,8) sont les plus proches du bord : à surveiller au test complet du responsable.

## 7. Mesures de clôture (passe 225, `artifacts/qa/cloture/README.md`)

IA de niveau 1 qui joue Recentrage et retient ses regards privés (fiche de clôture, B2).

- **B1, Brasier Originel** (Signature Cendre) contre les trois autres Signatures, IA « équilibré » des deux côtés, sièges
  alternés, 10 800 duels : **54,2 %** (Voile 53,8 %, Ronce 55,0 %, Astre 53,8 %). Sous le seuil de 55 % : **Puissance 14
  inchangée**.
- **B2, variantes à risque**, 1 600 duels chacune : Tison −1,1 ; Escarbille −2,3 ; Surenchère +0,3 ; Phénix +0,7 ;
  Boussole +3,6 points. Aucune sous −4 : **aucun ajustement**.
