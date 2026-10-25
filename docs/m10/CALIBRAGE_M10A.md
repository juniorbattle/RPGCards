# Annexe de calibrage de l'avenant M10-A — paliers de decks adverses et PV du joueur (VALIDÉE)

**Date :** 2026-10-20 (lot M10-A, étape 4). **Statut : VALIDÉE ET FIGÉE par le responsable le 2026-10-20** (fiche d'arbitrages du lot M10-A, entrées K1 à K5, toutes sur l'option recommandée, sans note : <https://claude.ai/artifact/B6y9Qow8gbuNhk8ragTvni>). Annexe de `contracts/06_AVENANT_M10A_MODE_AVENTURE.md` (AV-08) ; elle ne change que sur une nouvelle décision du responsable. **Amendement 1 (2026-10-20, fiche du lot M10-D, D1) : le niveau ne compte que les familles rejointes ou engagées** (§1 et §5).
Règle (AV-08 du texte canonique) : décision du responsable sur l'ARB-M10-09 : **paliers de decks adverses** et **PV du
joueur qui montent à chaque combat, sans plafond** ; **pas de format miroir ni de PV égaux** ; simulation « plus favorable
au joueur de manière générale » que celle de la fiche (inaugural 52 %, cadet 57 %, bras droit 46 %, chef 37 %).
Code : `src/aventure/paliers.ts` (valeurs) ; mesure : `tools/m10a-paliers.ts` ; résultats bruts :
`artifacts/qa/m10a/etape4/paliers.json` et `paliers.md`.

## 1. Lecture de la note du responsable

- **« cartes basiques »** = les **cartes grises** (neutres) de la populace ; « Basics » reste le nom des cartes I à IV
  d'une famille. *(Lecture confirmée par le responsable, K1.)*
- « la plupart des cartes de famille remplacent certaines cartes basiques, voire toutes, **selon le niveau du joueur** » :
  la composition d'un adversaire suit le **niveau du joueur**, c'est-à-dire **le nombre de familles qu'il a rejointes ou
  dont il a engagé le défi** (1 à 4 ; amendement 1, §5 ; d'abord : les familles dont il a reçu les Basics). Un membre rencontré tôt a encore beaucoup de cartes grises ; tard, il a les quatre familles.
- Paliers : **populace** (seize cartes grises) ; **membre de famille** (ses quatre cartes et des cartes d'autres familles,
  « ce qui signifie qu'ils ont vaincu d'autres membres ») ; **duelliste avancé** (les quatre familles, avec ou sans
  variantes) ; **élite** (les chefs : leurs variantes et leur Signature) ; **champions** (le Championnat).

## 2. Valeurs (validées le 2026-10-20)

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

## 4. Décisions du responsable (2026-10-20)

Relues dans la collection `decisions` de la fiche du lot M10-A (choix entre 18:45 et 18:49 UTC) :

1. **K1** « cartes basiques » = les cartes grises de la populace : **confirmé**.
2. **K2** PV du joueur : **50 au départ, +3 par combat** (défaites comptées, abandon non) : **validé**.
3. **K3** composition des adversaires **selon le niveau du joueur** : **validée** (un même cadet est plus fort si on le
   défie tard).
4. **K4** PV et IA des adversaires (§2) : **validés**.
5. **K5** le premier chef, défi le plus dur du début (42 % sans entraînement, 52 % entraîné) : **gardé**.

## 5. Amendement 1 — le niveau après un changement d'affiliation (décision du responsable, 2026-10-20)

Fiche d'arbitrages du lot M10-D, entrée **D1** (<https://claude.ai/artifact/X2z6EuQJDLHdNGe1Cvps4g>, choix du 2026-10-20 à 22:02 UTC, sans note) : « Niveau : familles
rejointes ou engagées », l'option recommandée.

- **Constat (lot M10-D, passe 88)** : l'avenant permet de changer de famille d'accueil jusqu'au premier défi de
  lieutenant, Basics gardées (AV-07) ; avec le niveau compté sur les familles dont le joueur a les Basics, un changement
  faisait passer toute la maison au niveau 2, trois changements au niveau 4. Mesure (`npx tsx tools/m10d-changements.ts
  150`, 150 duels par ligne, IA « équilibré » pour le joueur) : chefs de la maison à 37–46 % de victoires par la voie
  directe ; 23–33 % après un changement ; 13–23 % après trois.
- **Règle** : le niveau du joueur est le nombre de familles dans l'état `affilié`, `défiée` ou `chef` : la famille
  d'accueil et celles dont le défi officiel est engagé. Une affiliation quittée (état `invité`) ne compte qu'à
  l'engagement de son défi. Dans la trame sans changement, le niveau est le même qu'avant (chaque lot de Basics vient
  d'une affiliation ou d'un engagement) : les mesures du §3 restent valables.
- **Mesure de la règle** : chefs de la maison à 41–49 % après un changement, 45–50 % après trois (cadets 59 à 65 %) ; ni
  piège ni avantage excessif.
- Code : `niveauDe` (`src/aventure/rencontres.ts`) ; aucune règle de duel, aucune autre valeur changée.
- Mesure reproductible : `artifacts/qa/m10d/changements.json` (lignes `directe`, `un-changement`, `collection` : la règle
  en vigueur ; lignes `-regle-initiale` : le niveau d'avant l'amendement) ; appliqué à la passe 92 (`test/m10d.test.ts`,
  `qa:voies` 62/62 sur Radeon 780M).

## 6. Règles V3.3 — annexe gardée (décision du responsable, 2026-10-25)

Après les avenants 07 (la Garde réduit sans annuler) et 08 (annonce des Signatures, révision), la voie directe sans
entraînement passe sous 50 % aux chefs et au Championnat (`artifacts/qa/v33/apres/paliers.md`,
`artifacts/qa/v33/a1/comparaison.md`), la voie entraînée reste nettement favorable. Le responsable **garde l'annexe
telle quelle** (fiche de la Garde, E3 ; fiche de l'avenant 08, E1 ; tableau `docs/FICHE_ARBITRAGES_V33.md`) : aucune valeur ne change.

**Confirmé à la RC de l'aventure (2026-10-25, fiche M10-F, E1 « Garder l'annexe telle quelle »)** : mesure de la RC
`artifacts/qa/m10f/equilibre/ecarts-annexe.md` (voie directe : cadets et bras droits des familles 2 à 4 −6 à −10 points,
chefs 45 à 48 %, Championnat 48 à 49 % ; voie entraînée égale ou plus favorable) ; tableau `docs/FICHE_ARBITRAGES_M10F.md`.
