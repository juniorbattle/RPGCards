# Fiche d'arbitrages — M10 (origines et ascension des Quatre Voies)

Session cloud autonome du 2026-10-20 (brief `docs/missions/BRIEF_SESSION_CLOUD_2026-10-20_M10.md`). **Seulement les
décisions réellement indispensables avant l'implémentation**, chacune avec contexte, sources, **option recommandée et
raison**, alternatives. Rien ici n'est décidé par la session ; les ADR 029, 030 et 031 sont repris comme acquis. La
session principale en fera une fiche interactive. **Fiche interactive publiée le 2026-10-20** (privée, 16 entrées : les 11
arbitrages et les 5 décisions prises seules ; choix enregistrés dans sa collection `decisions`) : <https://claude.ai/artifact/P6QSq7ACy25pkB6581Cvg7>.

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
