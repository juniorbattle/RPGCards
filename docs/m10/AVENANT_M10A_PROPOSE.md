# Avenant M10-A — Règles du mode Aventure et cartes neutres (PROPOSÉ)

**Date :** 2026-10-20 (session cloud autonome). **Statut : PROPOSÉ — rien de ce document n'est en vigueur.** Il entrera
dans `contracts/` seulement après ratification par le responsable (gouvernance, `contracts/00_GOUVERNANCE_AUTORITE.md` :
« pour un changement de règles, demander validation explicite de la nouvelle rédaction canonique »).
**Couvre :** §VI de la mission M10 (dix points) et §VII.7.
**Ne change rien** au mode Duel standard : règles V3.0 + delta V3.2 + D-01 (V3.3), deck de 17 cartes, calculs du
Clash, conditions d'Amplification, secrets (ADR 011), IA, replays et sauvegardes existants.

Chaque point : **ce qui est ratifié**, **options**, **recommandation** et **raison**, **impact moteur**, **tests**. Les
identifiants **A-1 … A-10** suivent l'ordre du §VI ; **A-0** (frontière et prototype) et **A-11** (impact technique
d'ensemble) encadrent.

---

## A-0. Frontière d'autorité et régime du prototype

- **Ratifié** (ADR 029, 030, 031) : choix libre de la famille ; 16 neutres = 4 × I, 4 × II, 4 × III, 4 × IV, sans
  famille, effet ni bonus ; neutre n'est pas une cinquième famille ; Basics I–IV ensemble à la confirmation de
  l'affiliation et à l'engagement officiel du défi de chaque autre famille ; variantes aux victoires contre les
  lieutenants ; Signature ∞ à la victoire contre le chef ; possession ≠ équipement (une seule Signature équipée) ; gains
  uniques et idempotents ; aucune Signature au prologue, au recrutement ni par un lieutenant.
- **Proposé ici** : tout le reste.
- **Régime du prototype `?aventure=1` (lot M10-B, avant ratification)** : la machine d'états, le registre des gains, la
  collection et le deck Aventure (neutres compris) sont implémentés **hors du moteur** (`src/aventure/`). **Les neutres
  n'entrent pas en duel** tant que A-2 n'est pas ratifié, car les y faire entrer exige de toucher au fichier du Clash
  (A-11). Le duel du prologue se joue alors avec un **deck de prêt** identique pour les deux duellistes (16 Basics + la
  Signature de la Cendre, celle de Kaï), sous un bandeau « provisoire » ; le duel de lieutenant du prototype se joue
  avec le deck standard que la collection Aventure permet, complété par des Basics de prêt (même bandeau). Point
  bloquant consigné dans la fiche (ARB-M10-02).

---

## A-1. Puissance des neutres I–IV

**Ratifié :** quatre définitions, sans famille, effet ni bonus. **Non ratifié :** la Puissance (ADR 030 point 1).

| Option | Neutre I | II | III | IV | Effet |
|---|---:|---:|---:|---:|---|
| **a. Même table que les Basics (recommandée)** | 3 | 6 | 9 | 12 | une neutre vaut une Basic **sans** l'affinité de famille |
| b. Un cran en dessous | 2 | 5 | 8 | 11 | la neutre est toujours pire qu'une Basic, même seule |
| c. Puissance unique | 6 | 6 | 6 | 6 | le Rang ne joue plus que sur le score |

**Recommandation : a (3 / 6 / 9 / 12).** **Raison :** continuité avec §2.2 (« progression définitive 3/6/9/12 ») et
avec la proposition d'ADR 030 ; aucune nouvelle table à apprendre ; l'écart entre une neutre et une Basic vient
**seulement** de l'affinité (+1 au soutien Rang, +1 au coefficient de dégâts, D-01 et §7.2) : exactement ce qu'est « une
carte ordinaire sans famille ». L'option b ajoute une règle chiffrée sans gain de lisibilité ; c casse la lecture
Puissance ↔ Rang.

**Définition proposée** (catalogue séparé, voir A-11) :
`neutre-1` … `neutre-4` : `identity: 'Neutre-<r>'`, `family: null`, `rank: r`, `power: 3r`, `rarity: 'Basic'`,
`name: 'Neutre <I..IV>'`, `effect: null`, `signature: false`. **Instances** : `p1#00` … `p1#15` comme aujourd'hui
(ADR 030 : « chacune possède son identifiant d'instance »).

---

## A-2. Assaut, Garde et usage en Secondaire des neutres

**Ratifié :** pas d'effet ni de bonus ; « aucun effet bonus intrinsèque ne signifie pas aucun Assaut / aucune Garde »
(M10 §A).

**Recommandation : une neutre fait tout ce que fait une Basic, sans jamais d'affinité.**

| Usage | Règle V3.x | Pour une neutre |
|---|---|---|
| Primaire en Assaut ou en Garde | §6 | identique (score = Rang + soutiens ; dégâts = Puissance × multiplicateur) |
| Secondaire posée, 3 états (en charge, cachée, active) | §4 | identique |
| Soutien **Rang** | Rang imprimé + 1 si même famille que la Primaire (D-01) | **Rang imprimé, jamais +1** (ni avec une Primaire neutre, ni avec une familiale) |
| Soutien **Dégâts** | coefficient = Rang + 1 si affinité (§7.2) | **coefficient = Rang, jamais +1** |
| **Interférence** | Rang imprimé ≥ Rang de la cible | identique (le Rang suffit) |
| Repoussement (Garde gagnante contre une Secondaire cachée) | §8 | identique ; une neutre repoussée retourne en main comme une Basic |
| Famille publique sous camouflage (§13.2) | la famille d'une Secondaire reste publique | « neutre » est public (aucune famille) |

**Raison :** c'est la lecture la plus littérale d'ADR 030 (« sans famille » interdit un bonus *de famille*, pas les
actions générales) ; aucune règle nouvelle n'est inventée, une seule est précisée : **l'affinité exige une famille**.

**Deux cas révélés par la preuve hors dépôt** (`MESURES_M10A.md` §2) : **Prisme** garde son +1 avec une Primaire
neutre (il ignore la famille par nature) ; **Convergence** traite une Primaire neutre comme « d'une autre famille »
(×6). Recommandé : garder les deux textes tels quels ; alternative pour Convergence : ×4.

**Le point délicat** : dans le moteur, l'affinité se teste par `sec.family === primary.family`
(`src/game/engine/clash.ts`, `rankSupport` et `damageCoefficient`). Avec `family: null` des deux côtés, ce test
donnerait **+1 entre deux neutres** : faux. Il faut donc écrire `sec.family !== null && sec.family === primary.family`.
**C'est une modification du fichier du Clash**, sans changement de résultat pour le mode standard (aucune carte
standard n'a `family: null`), mais le brief et AGENTS interdisent d'y toucher sans validation : **ARB-M10-02**.
Alternative sans toucher au Clash : représenter le neutre par une famille factice — **refusée** (ADR 030 : « pas une
cinquième famille »).

---

## A-3. Accès aux Techniques pendant le prologue

Rappel (§12) : six Techniques, deux équipées, Insight 0..2 (départ 1). Les Techniques sont des **actions générales**,
pas des effets de cartes.

| Option | Prologue | Ensuite |
|---|---|---|
| a. Aucune Technique au prologue | Insight inutile ; duel le plus simple | apprises avec les familles |
| **b. Deux « Techniques de la rue » (recommandée)** | **Sondage + Recentrage** connues et équipées | chaque famille **enseigne sa Technique** à la remise de ses Basics : Cendre → Lecture, Ronce → Rupture, Voile → Dissipation, Astre → Ancrage |
| c. Les six dès le départ | choix complet | rien à apprendre |

**Recommandation : b.** **Raison :** le duel inaugural garde une vraie décision de début de tour (fenêtre « start » :
les deux Techniques les plus simples, qui ne demandent aucune lecture des Secondaires adverses) ; les quatre autres
arrivent avec les familles, en reprenant les Techniques de prédilection de leurs figures existantes (Kaï : Lecture ;
Maëlle : Rupture ; Sélène : Dissipation ; Orin : Ancrage). Les six sont connues après les quatre familles, sans monnaie
ni XP. **À noter :** l'enseignement d'une Technique est une récompense de plus que l'ADR 031 ne liste pas ; il
accompagne la remise des Basics (même clé de registre) et doit être ratifié comme tel (ARB-M10-05). Option a si le
responsable préfère ne rien ajouter.

---

## A-4. Format du deck avant l'obtention de la première Signature

**Ratifié :** aucune Signature avant la victoire contre un chef (ADR 031). **Conséquence :** jusqu'au premier chef, le
deck n'a **pas** de Signature.

**Recommandation : le deck Aventure sans Signature compte 16 cartes ordinaires, exactement 4 par Rang ; aucune ∞.**
- Main de 4, deux Secondaires, phases et Interférences **inchangées** ; une Primaire n'est jamais ∞ (aucune carte ne
  l'est) : chaque Clash se décide au score.
- Avec 16 cartes au lieu de 17, la pioche s'épuise un tour plus tôt ; le traitement de pioche vide et de prolongation
  (§ prolongation, `overtime`) s'applique **tel quel**.
- L'adversaire peut avoir une Signature (un chef) alors que le joueur n'en a pas : c'est voulu (A-10), et visible avant
  le duel (« Bran joue le Brasier Originel »).

**Alternatives :** (b) un « 17e emplacement vide » rempli d'une neutre supplémentaire (casse les 16 ratifiées) ;
(c) une Signature de prêt (contredit ADR 031). **Impact moteur :** `GameConfig` doit accepter un deck sans Signature
(`signature: Family | null`), voir A-11.

---

## A-5. Remplacement progressif des neutres par les Basics

**Ratifié :** 16 neutres au départ ; quatre Basics à chaque affiliation ou défi officiel. **Non ratifié :** comment elles
entrent dans le deck (ADR 031 cite une piste : « remplacement d'une copie de chaque Rang neutre par la Basic du même
Rang »).

**Recommandation : règle unique de deck Aventure + remplacement automatique proposé.**

**Règle de deck Aventure (R-AV) :**
1. **16 cartes ordinaires**, **exactement quatre de chaque Rang** (I, II, III, IV) ;
2. chaque **identité familiale** au plus une fois (Basic **ou** une variante possédée, jamais les deux : §11.1) ;
3. les places restantes de chaque Rang sont tenues par des **neutres de ce Rang** (au plus quatre par Rang, celles
   possédées) ;
4. **au plus une Signature** équipée, possédée (A-7) ; 0 avant le premier chef ;
5. deux Techniques connues distinctes.

La règle 1 est **déjà vraie du deck standard** (4 familles × 1 carte par Rang = 4 cartes par Rang) : R-AV le
généralise, et le deck standard en est le cas particulier « 0 neutre + 1 Signature ».

**Remplacement automatique :** à la remise des quatre Basics d'une famille, **une neutre de chaque Rang** sort du deck
et la Basic du même Rang y entre (le deck reste légal, 4 par Rang). Les neutres sortantes **restent en collection**
(rien ne se perd) ; l'éditeur de deck permet de revenir en arrière tant que R-AV est respectée (une neutre n'est
jamais meilleure qu'une Basic : A-1, A-2 ; c'est un choix de style, pas une optimisation).

**Raison :** une seule règle, lisible, qui contient le standard ; le joueur voit sa main « se colorer » famille par
famille ; aucune nouvelle quantité à apprendre. Alternatives : remplacement manuel seulement (plus de clics, aucun
intérêt stratégique) ; ajout sans retrait (deck de 20 cartes : casse 4 par Rang et la taille de main/pioche calibrée).

---

## A-6. Transition vers le deck familial complet de 17 cartes

Avec A-4 et A-5, la transition **se fait d'elle-même** :

| Moment | Deck (recommandé) | Taille |
|---|---|---:|
| Prologue | 16 neutres | 16 |
| Affiliation (famille 1) | 12 neutres + 4 Basics F1 | 16 |
| Lieutenants de F1 | idem, variantes F1 équipables à la place de leurs Basics | 16 |
| **Chef de F1 battu** | + **Signature F1** équipée | **17** |
| Défi officiel F2, F3, F4 | 8 → 4 → 0 neutres ; + Basics F2, F3, F4 | 17 |
| **Après le 4e défi officiel** | **16 identités familiales + 1 Signature** = format **standard** | **17** |

Le deck devient un deck du mode Duel standard **exactement** quand les quatre familles ont remis leurs Basics. À partir
de là, le validateur standard (`src/product/deck.ts`, `validateDeck`) accepte le deck tel quel, ce que les tests
vérifient (A-11). Avant ce moment, le validateur Aventure (R-AV) s'applique.

**Ordre recommandé des chapitres** (narratif, P-N4) : le chef de la famille d'accueil **avant** les défis des trois
autres familles (« devenu un duelliste reconnu », mission §III) ; les trois autres dans l'ordre que le joueur veut.
Alternative : ouvrir les défis officiels dès l'affiliation (plus libre ; le joueur pourrait affronter un chef étranger
sans Signature).

---

## A-7. Plusieurs Signatures possédées, une seule équipée

**Ratifié :** possession ≠ équipement ; une seule Signature équipée.

**Recommandation :**
- La collection Aventure garde la liste des **Signatures possédées** (0 à 4) ; le deck en équipe **0 ou 1** (R-AV.4) ;
  le changement se fait **entre deux duels**, dans l'éditeur de deck, jamais pendant un duel.
- Une Signature équipée peut être de n'importe quelle famille possédée, **même sans la Basic de sa famille dans le
  deck** (comme dans le mode standard, où la Signature est indépendante des 16 identités).
- Valeur de la collection de Signatures **sans hausse de statistiques** : (1) le choix entre duels (contre un
  adversaire lecteur, préférer Miroir du Voile…) ; (2) le **Championnat** demande d'en changer entre les manches de la
  finale (`PROGRESSION_ET_RECOMPENSES.md` §4) ; (3) certaines compétitions imposent une Signature d'une famille
  vaincue.
- Le moteur reste à **une** Signature par deck (inchangé) ; seule la collection et la validation changent.

---

## A-8. Attribution exacte des variantes et des récompenses

**Ratifié :** variante d'une carte familiale **déjà possédée** à chaque victoire de progression contre un lieutenant ;
Signature au chef ; récompenses uniques, traçables, idempotentes ; une revanche ne duplique rien. **Non ratifié :**
nombre de lieutenants, quelle variante.

**État du catalogue** : **une** variante par identité (`VARIANTS`, `src/game/catalog/cards.ts`), soit **4 par famille,
16 en tout**.

| Option | Lieutenants par famille | Variantes des lieutenants | Les autres variantes |
|---|---:|---|---|
| **a. Deux lieutenants, variantes fixes hautes (recommandée)** | 2 | cadet → **variante de Rang III** ; bras droit → **variante de Rang IV** | Rang I : **Épreuve du quartier** (3 membres en série) ; Rang II : **Joute de la maison** (après le bras droit) ; facultatives, uniques |
| b. Quatre lieutenants, un par Rang | 4 | I, II, III, IV dans l'ordre | aucune (les compétitions ne donnent pas de variantes) |
| c. Deux lieutenants, variante au choix | 2 | le joueur choisit parmi les variantes non possédées de la famille | compétitions pour les deux restantes |

**Recommandation : a.** **Raison :** l'enjeu est **annoncé avant le duel** (« Tessa met en jeu Cendre III —
Ferveur » ; elle la joue elle-même : l'enjeu se voit sur le plateau), la valeur monte cadet → bras droit → chef (Rare
ou Épique → Épique ou Légendaire → Signature), les compétitions spéciales de la mission §V ont une vraie récompense, et
la production reste à 2 lieutenants par famille. **Conflit à trancher :** les tests d'ADR 031 disent « variantes aux
seules victoires des lieutenants » ; la mission §V dit « obtenir des variantes grâce à des compétitions spéciales ».
L'option a suit §V ; l'option b suit la lettre des tests d'ADR 031 (et double les lieutenants). **ARB-M10-06.**

**Registre des gains (ledger)** — contrat de données proposé :

```ts
interface Gain {
  key: string;        // clé UNIQUE : 'neutres:depart' | 'basics:Ronce' | 'variante:Ronce-3-entrave' | 'signature:Ronce' | 'technique:Rupture'
  kind: 'neutres' | 'basics' | 'variante' | 'signature' | 'technique';
  family: Family | null;
  items: string[];    // définitions remises (defId, Signature, Technique)
  source: string;     // scène ou duel : 'P7:affiliation', 'duel:a12', 'engagement:Voile'
  at: string;         // date ISO
}
```

- `grant(gain)` **n'ajoute rien si la clé existe** (idempotence : rechargement, reprise, revanche, double clic) ;
- les **Basics** d'une famille ont **une seule clé** `basics:<F>`, qu'elles viennent de l'affiliation ou d'un défi
  officiel : une famille ne peut jamais les remettre deux fois (cas : affiliation à F, puis changement d'affiliation,
  P-N6) ;
- une **variante** n'est remise que si la Basic de son identité est possédée (`basics:<F>` présent) ; sinon le gain est
  refusé avec sa raison (ne doit pas arriver : le cadet n'est défiable qu'après les Basics) ;
- une **Signature** n'est remise que par la victoire contre le chef de sa famille (`signature:<F>`) ;
- la collection Aventure est **dérivée** du registre (on peut la reconstruire du registre seul : test).

---

## A-9. Sauvegarde, reprise, profils existants et replays

**Recommandation :**
- **Emplacement à part** : `localStorage['lqv.aventure']`, schéma `aventure/1`, avec copie de secours
  `lqv.aventure.backup`, sur le modèle de `src/product/save.ts` (écriture vérifiée, version plus récente refusée,
  sauvegarde illisible mise à l'écart, jamais effacée en silence). **La sauvegarde standard `lqv.save` n'est ni lue ni
  écrite par l'Aventure** : les profils et parties de la RC 0.8 restent intacts et se chargent comme avant.
- **Contenu** : profil (nom, graine), scène et chapitre courants, états des familles, registre des gains, deck Aventure,
  directeur des rencontres (graine, compteur, délais), îlot et position, duel en cours (config + commandes + hash, comme
  `ActiveDuel`), historique public des duels de l'aventure.
- **Reprise d'un duel** : même mécanisme que le mode standard (rejeu des commandes sur le moteur pur, contrôle par hash).
- **Replays** : le format `lqv-replay/1` et `CATALOG_VERSION` du standard ne changent pas. Les duels Aventure avec
  neutres (après ratification) portent `catalog: 'catalogue-initial-V3.0+16v+4s+6t+4n'` et un `format: 'lqv-replay/2'`
  (deck explicite dans la config) ; un replay `/1` se rejoue exactement comme aujourd'hui (test de non-régression des
  hashes).
- **Migration** : aucune n'est nécessaire (deux emplacements indépendants). Option non recommandée : « créer une aventure
  depuis un profil standard » (mélangerait deux progressions).

---

## A-10. Équilibrage du duel inaugural, des lieutenants, des chefs et du Championnat

Principe (ADR 031, mission §IV) : **la difficulté vient des decks, des Techniques et du profil d'IA, pas des
statistiques**. Les PV restent **propres à chaque personnage**, dans les repères de calibration existants (§9.1 :
60 / 90 / 125) ; le joueur garde **90 PV** (`PLAYER_HP`) pendant toute l'aventure.

**Règle du miroir de format (recommandée) :** un adversaire **structurant** (cadet, bras droit, chef) joue un deck
**au format R-AV** avec **autant de neutres que le deck du joueur au moment du défi** ; sa famille y est représentée
selon son rang ; il n'a de Signature que s'il est chef (ou, au Championnat, toujours). Ainsi le joueur n'affronte jamais
un deck « complet » avec un deck gris : l'écart vient de ce que l'adversaire **maîtrise** (variantes, Signature,
Techniques), ce qui est l'enjeu.

| Duel | Deck adversaire (proposé) | Techniques | IA | PV |
|---|---|---|---|---:|
| **Inaugural** (Kaï) | 16 neutres | Sondage + Recentrage | offensif | **50** (joueur : 50 pour ce duel seulement ; mesuré : ≈ 9 tours, 49 % à profil égal ; 60 PV : ≈ 11 tours) |
| **Cadet** de F | neutres du joueur + 4 cartes F dont **la variante mise en jeu** (III) | rue + Technique de F | profil de gabarit (novice / timide) relevé d'un cran | 80 |
| **Bras droit** de F | idem + **2 variantes F** (III, IV) | celles de la figure (Kaï, Maëlle, Sélène, Orin) | profil de la figure | fiche actuelle (80 / 95 / 100 / 110) |
| **Chef** de F | idem + **4 variantes F** + **sa Signature** | deux, choisies pour la famille | profil propre (à créer : « maître ») ou le plus fort existant | **90** (mesuré : 110 rend le chef trop dur, 23 % ; 90 donne 37 %, `MESURES_M10A.md`) |
| **Championnat** | decks standard complets, identités soignées | libres | meilleurs profils | `PROGRESSION_ET_RECOMPENSES.md` §4 |

**Mesure avant ratification des chiffres :** l'outil `npm run sim` (`tools/perf-engine.ts`, 200 duels IA contre IA)
permet, une fois A-2 implémenté derrière un paramètre, de mesurer pour chaque palier le taux de victoire et la durée
(tours) ; cible proposée : duel inaugural 6 à 10 tours ; lieutenants 45 à 60 % de victoires IA contre IA à deck égal de
profil ; chefs 35 à 45 %. **Mesures faites sur un moteur patché hors dépôt (`MESURES_M10A.md`)** : inaugural 51,7 %
(≈ 11 tours), cadet 57,3 %, bras droit 46,3 %, chef 23,3 % à 110 PV et 36,7 % à 90 PV (IA contre IA, 300 duels par
ligne) : d'où la recommandation **PV du chef = 90**.

---

## A-11. Impact technique d'ensemble (si A-1 à A-7 sont ratifiés)

Audit du code au commit `255820c` : ce qui changerait, et comment garder le standard identique.

| Fichier | Changement proposé | Effet sur le standard |
|---|---|---|
| `src/game/catalog/cards.ts` | `CardDef.family: Family \| null` ; catalogue neutre **séparé** (`src/game/catalog/neutres.ts`) fusionné dans la recherche `cardDef` ; `FAMILIES` inchangé (pas de 5e famille) | aucun (aucune carte standard n'a `null`) |
| `src/game/engine/clash.ts` | affinité : `sec.family !== null && sec.family === primary.family` (deux lignes) | **aucun résultat changé** ; mais fichier du Clash touché → **ratification requise** |
| `src/game/model/types.ts` | `GameConfig.players[*]` : `deck?: string[]` (liste explicite de définitions) ; `signature: Family \| null` ; `PlayerState.signatureFamily: Family \| null` ; `RevealedTactic.family`, `PublicEffect.family` : `Family \| null` | le standard garde `deck` absent ⇒ `buildDeck` comme aujourd'hui |
| `src/game/engine/engine.ts` | construction du deck : `pc.deck ?? buildDeck(...)` ; contrôle de forme R-AV quand `deck` est fourni | hashes standard inchangés (test sur les replays de `test/fixtures`) |
| `src/game/ai/policy.ts` | modèle de la main adverse : ne pas supposer une Signature (`signatureFamily` nul) ; neutres dans le tirage hypothétique | aucun pour le standard (test IA inchangé) |
| `src/game/visibility/*` | « neutre » public ; aucune nouvelle information privée | aucune |
| `src/presentation/*`, `src/art/cardArt.ts` | carte neutre blanche/grise, Rang lisible, sans emblème (ADR 030) | aucun pixel du standard (comparaison `l5-identique`) |
| `src/product/*` | **inchangés** ; l'Aventure a ses propres modules (`src/aventure/`) | aucun |

**Preuve faite (2026-10-20, hors dépôt)** : patch appliqué dans un worktree détaché (`patch-m10a-neutres.diff`, 7
fichiers, +133 / −13 ; `invariants.ts` aussi : taille du deck et unicité des seules identités familiales) : **les 305
tests du dépôt passent sans modification**, 5 tests neutres en plus ; 20 erreurs de typage restent à traiter dans 10
fichiers d'interface (inventaire dans `MESURES_M10A.md` §1).

**Tests de la porte M10-A** (en plus des 281 actuels, qui doivent passer **sans modification**) : 4 instances par Rang,
16 au total ; aucune famille, aucun effet, aucune affinité (neutre + neutre, neutre + Basic, Basic + neutre ; Rang et
Dégâts) ; Interférence d'une neutre selon le Rang ; deck sans Signature jouable jusqu'à la fin (pioche vide,
prolongation) ; projections publique / privée sans fuite ; IA non omnisciente ; mêmes hashes de replay pour les
fixtures standard ; validateur R-AV (légal / illégal) ; le deck Aventure final passe `validateDeck` du standard.
