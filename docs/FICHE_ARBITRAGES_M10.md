# Fiche d'arbitrages — M10 (origines et ascension des Quatre Voies)

Session cloud autonome du 2026-10-20 (brief `docs/missions/BRIEF_SESSION_CLOUD_2026-10-20_M10.md`). **Seulement les
décisions réellement indispensables avant l'implémentation**, chacune avec contexte, sources, **option recommandée et
raison**, alternatives. Rien ici n'est décidé par la session ; les ADR 029, 030 et 031 sont repris comme acquis. La
session principale en fera une fiche interactive. **Fiche interactive publiée le 2026-10-20** (privée, 17 entrées : les 11
arbitrages, ARB-M10-12 ajoutée le même jour et les 5 décisions prises seules ; choix enregistrés dans sa collection `decisions`) : <https://claude.ai/artifact/P6QSq7ACy25pkB6581Cvg7>.

## Lot M10-C — décisions du responsable (2026-10-20, fiche du lot <https://claude.ai/artifact/VzdgB2W2wmUw1Bp9MNE5ux>)

Cinq entrées, toutes sur l'option recommandée, sans note (choix entre 20:23 et 20:24 UTC, relus par la session M10-C) :
**C1** identités « vectoriel V2 » des quatre chefs **validées** (ADR 034 approuvé) ; **E1** écran Deck et collection
**reçu** (ADR 032 amendement 3) ; **E2** cartes à gagner **grisées et lisibles** dans la Collection (P-N4 : rien n'est
caché) ; **R1** lot M10-C **reçu** ; **S1** lot suivant : **M10-D** (les trois autres voies).

## Lot M10-A — décisions du responsable (2026-10-20, fiche du lot <https://claude.ai/artifact/B6y9Qow8gbuNhk8ragTvni>)

Neuf entrées, toutes sur l'option recommandée, sans note (choix entre 18:40 et 18:49 UTC, relus par la session M10-A) :
**C1** texte canonique de l'avenant **validé** et versé dans `contracts/06_AVENANT_M10A_MODE_AVENTURE.md` ; **C2** écriture
épicène, sans point médian ; **C3** l'ancien Quai en secours hors QA jusqu'à A2 puis A1 ; **K1** « cartes basiques » =
cartes grises (confirmé) ; **K2** PV du joueur 50, +3 par combat ; **K3** composition selon le niveau ; **K4** PV et IA
des adversaires ; **K5** premier chef gardé ; **R1** lot M10-A **reçu**. Détail : `docs/m10/CALIBRAGE_M10A.md` §4.

## Décisions du responsable — 2026-10-20

Relues depuis la fiche d'arbitrages M10 interactive du 2026-10-20 (<https://claude.ai/artifact/P6QSq7ACy25pkB6581Cvg7>, 17 entrées, choix entre 14:48 et 15:25 UTC, relus par la session principale). **Quinze choix sur dix-sept suivent l'option recommandée** ; ARB-M10-09 et ARB-M10-11 suivent une
autre option. ARB-M10-12 a été ajoutée à la fiche interactive sur la remarque du responsable (« n'oublions pas que nous
devons intégrer notre nouvelle direction artistique avec les multi-rangs traversables dans un quartier et un décor visuel
basé sur des images générées ») ; ARB-M10-09 y a été réécrite d'après sa note.

| Réf. | Décision | Option |
|---|---|---|
| ARB-M10-01 | États : « chef » = **chef de cette famille vaincu** | recommandée |
| ARB-M10-02 | **Garde `family !== null` autorisée dans `clash.ts`**, Prisme (+1) et Convergence (×6) tels que proposés ; preuves à l’application : tests existants inchangés et verts, empreintes des replays standard identiques, jeu par défaut identique au pixel près, tests neutres | recommandée |
| ARB-M10-03 | Neutres **3 / 6 / 9 / 12**, Assaut et Garde, Secondaire selon le Rang, jamais d’affinité | recommandée |
| ARB-M10-04 | **Règle R-AV**, remplacement automatique d’une neutre par Rang à chaque lot de Basics ; deck standard de 17 après les quatre lots | recommandée |
| ARB-M10-05 | **Sondage et Recentrage** au prologue, puis la Technique de chaque famille avec ses Basics (récompense ajoutée à l’ADR 031) | recommandée |
| ARB-M10-06 | **Deux lieutenants** (cadet : variante III ; bras droit : variante IV) ; **variantes I et II par des compétitions** (Épreuve du quartier, Joute de la maison) | recommandée |
| ARB-M10-07 | Distribution gardée : Kaï rival qui rejoint la Cendre (bras droit), Maëlle, Sélène, Orin bras droits, quatre chefs nouveaux, cadets sur gabarits PNJ, les quatre émissaires invitent | recommandée |
| ARB-M10-08 | Changement d’affiliation **jusqu’au premier défi de lieutenant** ; chef d’accueil avant les défis des autres familles | recommandée |
| ARB-M10-09 | **Paliers de decks adverses + PV du joueur qui montent à chaque combat, sans plafond** (pas de format miroir ni de PV égaux) | **autre que la recommandée** (plafond recommandé) ; note ci-dessous |
| ARB-M10-10 | **Sauvegarde d’aventure à part** (`lqv.aventure`), sauvegarde standard jamais lue ni écrite | recommandée |
| ARB-M10-11 | **Écriture neutre partout** (aucun accord de genre pour le duelliste) | **autre que la recommandée** (choix il, elle, neutre recommandé) |
| ARB-M10-12 | **Brancher le Quai en quatre rangs dès M10-A** (le Quai du laboratoire devient l’îlot de l’aventure, l’ancien en secours) ; le Parvis et les Ruelles en rangs à la reprise de M09 ; A2 puis A1 pour le décor généré hors QA | recommandée |
| S1 | Noms de travail gardés (Bran, Mère Aubépine, Ilse, Halvard ; Tessa, Gaspard, Lior, Mira) | recommandée |
| S2 | Maisons gardées : Cendre au Quai, Ronce au Fanal, Voile dans les Ruelles, Astre au Parvis | recommandée |
| S3 | Première émissaire choisie par un fait public du duel : gardé | recommandée |
| S4 | Deck de prêt du prologue gardé **jusqu’à l’application de l’avenant** | recommandée |
| S5 | Module à part derrière `?aventure=1` gardé ; **ADR 032 approuvé** | recommandée |

**Note du responsable sur ARB-M10-09 :** « Selon les pourcentages évoqués, il faut que le format permette des adversaires semi-complets : la plupart des cartes de famille remplacent certaines cartes basiques, voire toutes, selon le niveau du joueur. Les joueurs basiques n’auront que des cartes basiques ; ceux qui font partie d’une famille auront leurs cartes de famille au complet, plus quelques cartes d’autres familles (ce qui signifie qu’ils ont vaincu d’autres membres de familles) ; les joueurs avancés auront les quatre familles, avec ou sans variantes ; et enfin l’élite et les champions. Le joueur gagnera des PV à chaque combat, ce qui permet aussi de monter ses probabilités comme dans un RPG : donc pas de format miroir ni de PV égaux. L’entraînement augmente les PV et les chances de victoire ; par rapport à la simulation établie par l’IA, ce serait plus favorable de manière générale (à consolider). » (orthographe corrigée)

**Lecture consignée :** « cartes basiques » est lu ici comme les cartes grises (neutres) de la populace, « Basics » restant les cartes I à IV d’une famille ; à confirmer en passant. Restent à proposer dans M10-A, mesurés par simulation IA contre IA avant adoption : les PV de départ et le gain par combat (sans plafond, décision du responsable), les PV des adversaires par palier (non tranchés), la composition des decks de chaque palier, et des taux de victoire « plus favorables au joueur de manière générale ». Cette décision précise la mission M10 §IV : la difficulté des adversaires vient de leur palier de deck et des formats du Championnat ; les PV qui montent sont ceux du joueur.

Le texte canonique de l’avenant M10-A (à verser dans `contracts/`) sera rédigé à partir de ces décisions au début du lot M10-A et soumis au responsable avant d’y entrer (gouvernance : validation explicite de la rédaction canonique) ; le code M10-A peut avancer en parallèle derrière `?aventure=1`.

Comment voir le travail : contrats `docs/m10/` (index `docs/m10/README.md`) ; prototype du prologue `/?aventure=1`
(mode d'emploi : `docs/AVENTURE_PROVISOIRE.md`). Le jeu par défaut et `?demo=1` sont inchangés.

**Ordre conseillé** : ARB-M10-02 (le seul qui bloque des neutres en duel), puis 01, 03, 04, 05 (l'avenant M10-A
complet), puis 06 et 07 (contenu des familles, nécessaires à M10-C), puis 08 à 11.

---

## ARB-M10-01 — Lecture des états `remarqué` / `invité` / `affilié` / `chef`

- **Contexte :** l'ADR 029 §4 impose ces quatre états, distincts de « visite » et « rencontre ». « Chef » est ambigu :
  « devenu chef » ou « chef vaincu » ?
- **Sources :** ADR 029 §4 ; `docs/m10/PROGRESSION_ET_RECOMPENSES.md` §2.
- **Recommandé :** états **par famille**, monotones : `inconnue → remarqué → invité → affilié` (famille d'accueil) ou
  `défiée` (défi officiel d'une autre famille) `→ chef` (**chef de cette famille vaincu**, Signature reçue).
  « Visité » et « rencontré » notés à part. **Raison :** c'est la seule lecture où les quatre états s'appliquent aux
  quatre familles avec la même séquence (ADR 031) ; « devenir chef » n'apparaît nulle part ailleurs dans M10.
- **Alternative :** `chef` = le joueur devient chef de sa famille d'accueil (fin de l'arc de la maison) ; ajouter alors
  un état `vaincue` pour les autres familles.

## ARB-M10-02 — Faire entrer les neutres en duel (bloquant)

- **Contexte :** une carte neutre a `family: null`. Le moteur teste l'affinité par `sec.family === primary.family`
  (`src/game/engine/clash.ts`, `rankSupport`, `damageCoefficient`) : deux neutres auraient **+1 d'affinité**, ce que
  l'ADR 030 exclut. Corriger demande `family !== null &&` dans ces deux fonctions : **aucun résultat du mode standard
  ne change** (aucune carte standard n'a `family: null`), mais c'est le fichier du Clash, que le brief et AGENTS
  interdisent de toucher sans validation.
- **Sources :** ADR 030 ; `docs/m10/AVENANT_M10A_PROPOSE.md` A-2 et A-11.
- **Preuve faite (hors dépôt, `docs/m10/MESURES_M10A.md`)** : le patch complet (catalogue neutre, deux gardes dans
  `clash.ts`, deck explicite, Signature optionnelle, invariants) laisse **les 305 tests du dépôt inchangés et verts** ;
  5 tests neutres passent ; il est prêt à appliquer (`docs/m10/patch-m10a-neutres.diff`). Deux cas à confirmer en même
  temps : Prisme (+1) et Convergence (×6) avec une Primaire neutre.
- **Recommandé :** **autoriser** cette garde (deux lignes), avec en preuve les 281 tests actuels inchangés et verts,
  les hashes de replay standard identiques et le jeu par défaut identique au pixel près ; plus les tests neutres d'A-11.
  **Raison :** c'est le seul moyen de faire jouer les 16 neutres ratifiées sans inventer une cinquième famille.
- **Alternatives :** (b) neutre = famille factice « Populace » exclue de l'affinité par une liste : interdit par
  l'ADR 030 ; (c) garder le **deck de prêt** du prototype jusqu'à M10-F : le prologue ne fait alors jamais jouer les
  cartes grises (contraire à l'intention du responsable).
- **En attendant (fait par la session) :** le prototype `?aventure=1` joue le duel du prologue avec un **deck de prêt
  identique pour les deux duellistes** (16 Basics + Signature de la Cendre), sous un bandeau « provisoire ».

## ARB-M10-03 — Puissance et usage des neutres

- **Contexte :** ADR 030 point 1 et 3 (non ratifiés).
- **Recommandé :** **3 / 6 / 9 / 12** (comme les Basics) ; Primaire en Assaut et Garde, Secondaire en soutien Rang
  (= Rang), Dégâts (coefficient = Rang), Interférence (selon le Rang) ; **jamais d'affinité**. **Raison :** aucune
  table nouvelle ; l'écart neutre ↔ Basic est exactement l'affinité de famille.
- **Alternatives :** 2 / 5 / 8 / 11 ; Puissance unique 6.

## ARB-M10-04 — Format du deck Aventure et transition vers 17 cartes

- **Contexte :** le standard exige 16 identités uniques + 1 Signature ; l'Aventure commence à 16 neutres sans Signature
  (ADR 031 : aucune Signature avant un chef).
- **Recommandé :** règle **R-AV** : 16 cartes ordinaires, **4 par Rang**, chaque identité familiale au plus une fois,
  neutres pour compléter, **0 ou 1 Signature** ; à chaque lot de Basics, **une neutre de chaque Rang** est remplacée par
  la Basic du même Rang (les neutres restent en collection) ; le deck devient **standard (17)** exactement après les
  quatre lots. **Raison :** R-AV contient le deck standard comme cas particulier ; la transition se fait sans règle
  supplémentaire.
- **Alternatives :** remplacement manuel seulement ; ajout sans retrait (deck à 20 cartes).

## ARB-M10-05 — Techniques au prologue et apprentissages

- **Recommandé :** **Sondage + Recentrage** au prologue ; chaque famille enseigne sa Technique avec ses Basics (Cendre
  Lecture, Ronce Rupture, Voile Dissipation, Astre Ancrage, d'après les Techniques de leurs figures). **Raison :** une
  vraie décision dès le premier duel, les six Techniques apprises sans XP. **Attention :** c'est une récompense que
  l'ADR 031 ne liste pas (à ratifier comme telle).
- **Alternatives :** aucune Technique au prologue ; les six dès le départ.

## ARB-M10-06 — Lieutenants et attribution des variantes

- **Contexte :** le catalogue a **une** variante par identité (4 par famille). L'ADR 031 ne fixe pas le nombre de
  lieutenants ; ses tests disent « variantes aux seules victoires des lieutenants », la mission §V dit « obtenir des
  variantes grâce à des compétitions spéciales ».
- **Recommandé :** **2 lieutenants** (cadet, bras droit) ; cadet → **variante III**, bras droit → **variante IV**
  (fixes, annoncées avant le duel, jouées par le lieutenant) ; variantes **I** (Épreuve du quartier) et **II** (Joute
  de la maison) par des compétitions facultatives. **Raison :** enjeu visible, valeur croissante jusqu'à la Signature,
  compétitions utiles, 12 duels structurants, 8 lieutenants seulement.
- **Alternatives :** (b) **4 lieutenants**, un par Rang (lettre des tests d'ADR 031 ; 16 lieutenants à produire ; les
  compétitions ne donnent rien) ; (c) 2 lieutenants, variante au choix du joueur.

## ARB-M10-07 — Distribution des rôles (personnages existants et nouveaux)

- **Recommandé :** **Kaï = rival récurrent**, il rejoint la Cendre et en devient le bras droit ; **Maëlle, Sélène,
  Orin = bras droits** de la Ronce, du Voile, de l'Astre ; **4 chefs nouveaux** (noms de travail : Bran, Mère
  Aubépine, Ilse, Halvard) ; **4 cadets** sur les gabarits PNJ avec un accent familial (extension de l'ADR 023) ; les
  **quatre émissaires invitent** au prologue (le premier s'avance selon un fait public du duel) ; maisons : Cendre au
  Quai, Ronce au Fanal, Voile dans les Ruelles, Astre au Parvis. **Raison :** réemploi maximal (rivaux V2 et marcheurs
  existants), production limitée aux chefs.
- **Alternatives :** rivaux = chefs (moins de production, chefs sans gravité, Kaï ne peut pas être chef) ; un seul
  émissaire invite, les trois autres attendent dans leur maison ; un rival nouveau.

## ARB-M10-08 — Permanence de l'affiliation et ordre des chapitres

- **Recommandé :** changement d'affiliation possible **jusqu'au premier défi de lieutenant**, sans perte (Basics
  gardées, clé unique) ; ensuite non (les autres familles restent accessibles par leurs défis) ; **chef d'accueil
  avant** les défis officiels des autres familles. **Raison :** liberté réelle au moment où le joueur découvre sa
  famille, histoire lisible ensuite (ADR 029 §6 : pas d'interdiction irréversible par défaut).
- **Alternatives :** affiliation définitive dès la confirmation ; changement toujours possible ; défis des autres
  familles ouverts dès l'affiliation.

## ARB-M10-09 — Équilibrage par le format, pas par les statistiques

- **Recommandé :** joueur à **90 PV** toute l'aventure (**50** pour le seul duel inaugural, contre Kaï à 50 : ≈ 9 tours mesurés, `MESURES_M10A.md` §3 bis) ; adversaires
  structurants au **format miroir** (même nombre de neutres que le joueur ; variantes et Signature selon leur rang) ;
  **chefs à 90 PV** comme le joueur. **Mesuré** (IA contre IA, 300 duels, moteur patché hors dépôt) : inaugural 51,7 %,
  cadet 57,3 %, bras droit 46,3 %, chef 36,7 % à 90 PV (23,3 % à 110 PV) : la difficulté monte par le deck seul.
- **Alternatives :** decks adverses complets dès le cadet (difficulté forte, deck gris impuissant) ; PV croissants par
  chapitre (contraire à la mission §IV).

## ARB-M10-10 — Sauvegarde et coexistence avec le mode standard

- **Recommandé :** sauvegarde Aventure **à part** (`lqv.aventure`, schéma `aventure/1`), la sauvegarde standard
  `lqv.save` jamais lue ni écrite ; aucun import de profil ; mode standard (Tournoi du Quai, duels libres, démo) inchangé.
  **Raison :** aucune migration, aucun risque pour les profils RC 0.8.
- **Alternatives :** un profil unique avec deux progressions ; importer la collection standard dans l'Aventure.

## ARB-M10-11 — Accord des textes avec le duelliste joueur (révélé par le prototype)

- **Contexte :** le joueur n'a pas de genre déclaré ; les dialogues du prototype ont dû contourner les accords (« ton
  jeu » plutôt que « t'avoir vu·e », « ce duelliste gris »). Une passe d'écriture du mode Aventure en dépend.
- **Recommandé :** demander à la création **comment s'adresser au duelliste** (il, elle, neutre), choix modifiable,
  sans effet de jeu ; les textes portent les trois formes. **Raison :** des dialogues naturels sans deviner.
- **Alternatives :** écriture neutre partout (contraignante, plus pauvre) ; tutoiement et tournures sans accord.

## Ce que la phase 2 a révélé (pour mémoire, détails dans le retour)

1. **Le coût réel d'ARB-M10-02 est connu** : deux gardes dans `clash.ts` ; 305 tests inchangés ; 20 erreurs de typage
   d'interface à traiter (`docs/m10/MESURES_M10A.md`).
2. **Prisme et Convergence avec une Primaire neutre** : deux cas de règle à confirmer avec l'avenant (A-2).
3. **PV des chefs** : 110 rendait le chef trop dur (23 %) ; 90 donne 37 % (mesuré) : proposé à 90.
4. **Duels Aventure plus longs** (16 à 18 tours contre 10 en standard, moins de dégâts sans affinité ni Signature) :
   surveiller la fatigue ; levier sans règle nouvelle : PV des personnages.
5. **L'enveloppe du jeu standard n'est pas réutilisable telle quelle** pour l'aventure (liée à `lqv.save` et à la
   progression de prototype M05) : une seconde enveloppe existe (ADR 032) ; la fusion est à décider avec M10-F.
6. **Apparences provisoires** : chefs et membres en gabarits PNJ, cadets sans accent familial, tenue grise du joueur
   sans famille (`player-gris`) : à confirmer avec la production (liste des images au retour, non demandée).

---

## Décisions prises seules par la session (provisoires, à confirmer ou défaire)

Voir aussi le retour `docs/missions/RETOUR_SESSION_CLOUD_2026-10-20.md`.

1. Noms de travail des chefs et cadets (Bran, Mère Aubépine, Ilse, Halvard ; Tessa, Gaspard, Lior, Mira).
2. Correspondance famille ↔ quartier (Cendre au Quai, Ronce au Fanal, Voile dans les Ruelles, Astre au Parvis).
3. Premier émissaire choisi par un fait public du duel (Assauts gagnés → Cendre ; Gardes gagnées → Ronce ;
   Interférences réussies → Voile ; sinon Astre).
4. Deck de prêt du prototype : 16 Basics + Signature de la Cendre **pour les deux duellistes** (miroir).
5. Prototype dans un module à part chargé à la demande (`src/aventure/`), entrée `?aventure=1` (ADR 032 proposé).
