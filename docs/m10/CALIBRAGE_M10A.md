# Annexe de calibrage de l'avenant M10-A — paliers de decks adverses et PV du joueur (PROPOSÉ, à valider)

**Date :** 2026-10-20 (lot M10-A, étape 4). **Statut : PROPOSÉ, à valider par le responsable avant d'être figé.**
Règle (AV-08 du texte canonique) : décision du responsable sur l'ARB-M10-09 : **paliers de decks adverses** et **PV du
joueur qui montent à chaque combat, sans plafond** ; **pas de format miroir ni de PV égaux** ; simulation « plus favorable
au joueur de manière générale » que celle de la fiche (inaugural 52 %, cadet 57 %, bras droit 46 %, chef 37 %).
Code : `src/aventure/paliers.ts` (valeurs) ; mesure : `tools/m10a-paliers.ts` ; résultats bruts :
`artifacts/qa/m10a/etape4/paliers.json` et `paliers.md`.

## 1. Lecture de la note du responsable

- **« cartes basiques »** = les **cartes grises** (neutres) de la populace ; « Basics » reste le nom des cartes I à IV
  d'une famille. *(Lecture à confirmer.)*
- « la plupart des cartes de famille remplacent certaines cartes basiques, voire toutes, **selon le niveau du joueur** » :
  la composition d'un adversaire suit le **niveau du joueur**, c'est-à-dire **le nombre de familles dont il a reçu les
  Basics** (1 à 4). Un membre rencontré tôt a encore beaucoup de cartes grises ; tard, il a les quatre familles.
- Paliers : **populace** (seize cartes grises) ; **membre de famille** (ses quatre cartes et des cartes d'autres familles,
  « ce qui signifie qu'ils ont vaincu d'autres membres ») ; **duelliste avancé** (les quatre familles, avec ou sans
  variantes) ; **élite** (les chefs : leurs variantes et leur Signature) ; **champions** (le Championnat).

## 2. Valeurs proposées

### PV du joueur

**50 au départ, +3 par combat mené à son terme** (victoire **ou** défaite ; un abandon ne compte pas ; une revanche, un
duel de rue, une compétition comptent : c'est l'entraînement). Sans plafond. L'écran de résultat l'annonce (« vos PV
passent de 53 à 56 »).

### Adversaires (rôle → palier et deck selon le niveau du joueur ; PV ; IA)

| Rôle | Niveau 1 | Niveau 2 | Niveau 3 | Niveau 4 | PV (niv. 1 → 4) | IA |
|---|---|---|---|---|---|---|
| Kaï au prologue | populace : 16 grises | — | — | — | 40 | offensif |
| Duel de rue | populace | membre : 4 + 2 autres | membre : 4 + 4 | membre : 4 + 8 | 40 / 50 / 60 / 70 | novice |
| Épreuve du quartier (×3) | membre : ses 4 Basics, 12 grises | 4 + 2 | 4 + 4 | 4 + 8 | 35 / 45 / 55 / 65 | novice |
| Cadet | membre : 4 (variante III) + 2 autres, 10 grises | 4 + 4 | 4 (III, IV) + 8 | **avancé** : 4 (III, IV) + 12 | 50 / 65 / 75 / 85 | novice |
| Bras droit | membre : 4 (variante IV) + 2 autres | 4 (III, IV, 2 autres en variante) + 8 | **avancé** (III, IV) | **avancé** (4 variantes + 2 autres) | 55 / 75 / 85 / 95 | celle du personnage (Kaï offensif, Maëlle prudente, Sélène lectrice, Orin équilibré) |
| Joute de la maison | membre : 4 (III, IV) + 4 | 4 + 8 (2 autres en variante) | avancé (2 autres en variante) | avancé (4 variantes + 4 autres) | 60 / 75 / 85 / 90 | équilibré |
| **Chef** | **élite** : ses 4 cartes (III, IV en variante), 12 grises, **sa Signature** | 4 variantes + 8 autres + Signature | 4 variantes + 12 (2 en variante) + Signature | 4 variantes + 12 (4 en variante) + Signature | 55 / 80 / 95 / 105 | lecteur |
| Kaï, défi facultatif | comme un bras droit de la Cendre | | | | 60 / 70 / 80 / 90 | offensif |
| Championnat (poule, Miroir) | **champions** : 16 variantes et leur Signature | | | | 110 | lecteur |
| Finale (Ysolde) | champion | | | | 120 | lecteur |

« 4 + k » : les quatre cartes de sa famille et k cartes d'autres familles (Basics, prises de façon à garder quatre cartes
par Rang) ; le reste en cartes grises. Tous les decks suivent R-AV (AV-03). Les PV adverses ne dépendent jamais de ceux
du joueur.

## 3. Mesures

Commande : `npx tsx tools/m10a-paliers.ts 150 artifacts/qa/m10a/etape4/paliers.json` (moteur réel, neutres compris ;
commit de départ `b0f004f` et l'arbre de travail de l'étape 4 ; 150 duels par famille d'accueil et par étape, soit 600
par ligne ; 642 s). Le joueur suit la trame principale avec le deck que la machine d'états de l'aventure lui donne à chaque
étape, pour chacune des quatre familles d'accueil. **Voie directe** : aucun duel facultatif, chaque duel principal gagné du
premier coup (PV au plus bas). **Voie entraînée** : par famille, l'Épreuve (3 duels, variante I) et deux duels de rue avant
le cadet, la Joute (variante II) avant le chef, soit 6 combats de plus par famille. Le joueur est joué par l'IA
« équilibré » : **un ordre de grandeur, pas une mesure du plaisir de jeu** ; marge d'erreur d'environ ±4 points par
ligne.

| Étape | Adversaire (deck au niveau du joueur) | PV adv. | Joueur direct : PV → victoires | Joueur entraîné : PV → victoires | Tours |
|---|---|---:|---|---|---:|
| Prologue — Kaï | populace (16 grises) | 40 | 50 → **69 %** | 50 → 67 % | 6,9 |
| Famille 1 — cadet | membre : 4 (III) + 2 autres, 10 grises | 50 | 53 → **62 %** | 68 → 76 % | 8,2 |
| Famille 1 — bras droit | membre : 4 (IV) + 2 autres, 10 grises | 55 | 56 → **53 %** | 71 → 64 % | 10,1 |
| Famille 1 — **chef** | élite : 4 (III, IV), 12 grises, Signature | 55 | 59 → **42 %** | 77 → 52 % | 9,6 |
| Famille 2 — cadet | membre : 4 + 4, 8 grises | 65 | 62 → **75 %** | 95 → 94 % | 9,2 |
| Famille 2 — bras droit | membre : 4 + 8 (4 variantes), 4 grises | 80 | 65 → **68 %** | 98 → 89 % | 10,3 |
| Famille 2 — **chef** | élite : 4 variantes + 8, 4 grises, Signature | 80 | 68 → **49 %** | 104 → 68 % | 11,1 |
| Famille 3 — cadet | membre : 4 + 8, 4 grises | 75 | 71 → **75 %** | 122 → 95 % | 9,9 |
| Famille 3 — bras droit | avancé : 16 identités (2 variantes) | 85 | 74 → **59 %** | 125 → 79 % | 13,4 |
| Famille 3 — **chef** | élite : 16 identités (6 variantes), Signature | 95 | 77 → **53 %** | 131 → 80 % | 12,3 |
| Famille 4 — cadet | avancé : 16 identités (2 variantes) | 85 | 80 → **79 %** | 149 → 96 % | 10,8 |
| Famille 4 — bras droit | avancé : 16 identités (6 variantes) | 95 | 83 → **63 %** | 152 → 91 % | 13,8 |
| Famille 4 — **chef** | élite : 16 identités (8 variantes), Signature | 105 | 86 → **48 %** | 158 → 88 % | 13,4 |
| Championnat — poule | champion : 16 variantes, Signature | 110 | 89 → **53 %** | 161 → 89 % | 13,8 |
| Championnat — Miroir (Kaï) | champion | 110 | 98 → **53 %** | 170 → 89 % | 14,1 |
| Championnat — Finale | champion | 120 | 101 → **54 %** | 173 → 88 % | 15,1 |

Duels facultatifs (voie entraînée ; ils comptent dans les PV, sauf le défi de Kaï, mesuré à part) :

| Duel | Famille 1 | Famille 2 | Famille 3 | Famille 4 |
|---|---:|---:|---:|---:|
| Épreuve du quartier (par duel ; la série en demande trois d'affilée) | 69 % | 92 % | 96 % | 98 % |
| Duel de rue | 76 % | 94 % | 97 % | 98 % |
| Joute de la maison | 62 % | 84 % | 87 % | 95 % |
| Défi facultatif de Kaï | 78 % | — | 97 % | — |

**Lecture.**
- **Plus favorable que la simulation de la fiche**, à chaque étape comparable : prologue 69 % (52 %), cadets 62 à 79 %
  (57 %), bras droits 53 à 68 % (46 %), chefs 42 à 53 % (37 %), Championnat 53 % ; voie directe, sans aucun
  entraînement.
- **L'entraînement paie** : sur la voie entraînée (6 combats de plus par famille), les chefs passent à 52, 68, 80 et
  88 %, le Championnat à 88 %. Chaque défaite compte aussi comme un combat : un chef perdu revient avec 3 PV de plus.
- **Le premier chef reste le défi le plus dur du début** (42 % direct, 52 % entraîné) : le joueur n'a pas encore de
  Signature et affronte la sienne. Les PV aident peu contre une Signature (+18 PV n'y gagnent que 10 points) ; c'est ce
  qui en fait le sommet de la première maison.
- **Durée** : 7 tours au prologue, 8 à 11 chez les lieutenants de la première maison, 12 à 15 en fin d'aventure.
- **Pas de plafond** : en fin de voie entraînée, le joueur a 150 à 175 PV ; les champions en ont 110 et 120.

## 4. Ce qu'il faut valider

1. La lecture de « cartes basiques » (§1).
2. **PV du joueur** : 50 au départ, +3 par combat ; défaites comptées, abandon non.
3. **Composition selon le niveau du joueur** (§2), et ce qui en découle : un même cadet est plus fort si on le défie tard.
4. **PV et IA des adversaires** (§2).
5. Le **premier chef** reste le défi le plus dur du début (sans Signature, le joueur affronte la sienne) : voulu, ou à
   adoucir encore ?
