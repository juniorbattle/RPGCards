# M10 — Contrat narratif : prologue, recrutement, familles, rival

**Date :** 2026-10-20 (session cloud autonome, brief `docs/missions/BRIEF_SESSION_CLOUD_2026-10-20_M10.md`).
**Statut : PROPOSÉ**, sauf les points marqués **[RATIFIÉ]** (ADR 029, 030, 031), qui sont repris tels quels.
**Couvre :** §VII.1 (scénario du prologue et du recrutement), §VII.2 (hiérarchie des quatre familles), §VII.4 (rôle et
évolution du rival) de la mission M10 (annexe A du brief).
**Ne couvre pas :** les règles de duel du mode Aventure (`AVENANT_M10A_PROPOSE.md`), les récompenses et le Championnat
(`PROGRESSION_ET_RECOMPENSES.md`), la ville (`VILLE_RENCONTRES_EVENEMENTS.md`).

> **DÉCISIONS DU RESPONSABLE (2026-10-20, fiche M10 <https://claude.ai/artifact/P6QSq7ACy25pkB6581Cvg7>) :** Distribution des rôles (ARB-M10-07), noms de travail (S1), maisons par quartier (S2), première émissaire par un fait public (S3) et permanence de l’affiliation (ARB-M10-08) : gardés. **ARB-M10-11 : écriture neutre partout** (aucun accord de genre pour le duelliste) : le §6 et les textes du prototype (« ce duelliste gris »…) sont à reprendre en écriture neutre. Tableau complet : `docs/FICHE_ARBITRAGES_M10.md`, « Décisions du responsable ».

Convention : **[RATIFIÉ]** = décision du responsable ; **[PROPOSÉ]** = proposition de la session, à arbitrer (fiche
`docs/FICHE_ARBITRAGES_M10.md`) ; **[EXISTANT]** = ce qui est déjà dans le dépôt et que M10 réutilise. Les noms des
personnages nouveaux sont des noms de travail.

---

## 0. Principes narratifs

1. **Le joueur part de rien.** Duelliste de la populace, sans famille, avec seize cartes grises (**[RATIFIÉ]** ADR 030).
2. **La reconnaissance se gagne, l'appartenance se choisit** (**[RATIFIÉ]** ADR 029, option B). Les familles remarquent,
   proposent, insistent parfois ; elles ne décident jamais. Aucune mauvaise réponse cachée, aucun cul-de-sac.
3. **Chaque victoire structurante laisse une trace visible** dans la collection (**[RATIFIÉ]** ADR 031) : Basics à
   l'affiliation ou à l'engagement, variantes aux lieutenants, Signature au chef. Pas d'XP, pas de monnaie, pas de
   hausse de statistiques.
4. **La ville est le théâtre** : chaque scène se joue dans un lieu qui existe (îlots M09, lieux de duel M08). M10 ne
   commande aucun nouveau décor ; il place des personnages et des événements dans ceux qui existent ou sont déjà
   prévus (la Grande Cour, ADR 028).
5. **Le rival grandit en même temps que le joueur**, selon les mêmes règles de cartes, jamais par des statistiques
   gonflées.
6. **Le combat ne change pas** : la narration lit des faits publics du duel (vainqueur, postures publiques, Gardes
   gagnées) et jamais un secret (ADR 011 ; ADR 029 §5).

---

## 1. Le monde à l'ouverture (ancrage dans l'existant)

### 1.1 La ville **[EXISTANT]**

| Lieu | Où il existe | Rôle M10 proposé |
|---|---|---|
| **Le Quai** (la nuit, vu de face) | îlot `quai` (`src/ville/quai.ts`), diorama non approuvé (ADR 028) ; version en quatre rangs au laboratoire (`quaiProfond.ts`) : la rue Haute, la place de la Halle, la ruelle des Lanternes, la placette du Puits, la cour de la Chapelle | **Prologue** ; quartier de la **Cendre** (dockers, braseros, chantier) |
| **La salle de jeu de cartes** (porte voûtée aux quatre bannières) | façade `salle` du Quai ; lieu de duel `salle` (ADR 022) | **Salle des Bannières** : on y engage officiellement les défis familiaux (§3.4) |
| **Le Fanal** (taverne du port) | façade `fanal` du Quai ; lieu de duel `bar` | maison de la **Ronce** (« ceux qui gardent le feu du port ») |
| **Le Parvis de l'arène** et **l'arène** | îlot `parvis` ; lieu de duel `arene` | maison de l'**Astre** (le Parvis) ; **Championnat des Champions** (l'arène) |
| **Les Ruelles du Voile** (fontaine, linge tendu, canal) | îlot `ruelles` | maison du **Voile** |
| **La Grande Cour** (monument des Quatre Voies, foule, étals, estrade) | prévue (ADR 028, lot V5 de M09, non construite) | cérémonies : proclamation des affiliations, ouverture et clôture du Championnat |
| Rangs du Quai (rue Haute, place de la Halle…) | laboratoire `?ville=1&qa=1&profondeur=1` (passes 62 à 68) | rencontres de quartier quand les rangs entreront dans le jeu (§ ville) |

**[PROPOSÉ] P-N1 — Correspondance famille ↔ quartier.** Elle reprend les placements déjà faits par le produit (Kaï
dans la rue du Quai, Maëlle au Fanal, Orin à l'arène, Sélène dans les Ruelles, `FREE_VENUE` de
`src/product/encounters.ts`) : **Cendre = le Quai**, **Ronce = le Fanal**, **Voile = les Ruelles**, **Astre = le Parvis
et l'arène**. Aucune construction n'est nécessaire pour le prototype ; à terme, chaque maison peut recevoir son îlot
« en rangs » quand M09 reprendra.

### 1.2 Les Quatre Voies : philosophie tirée du catalogue **[EXISTANT]**

La philosophie de chaque famille est **lue dans ses cartes réelles** (`src/game/catalog/cards.ts`, `FAMILY_THEME`,
`VARIANTS`, `SIGNATURES`) et dans les Techniques de prédilection de ses figures (`src/presentation/personalities.ts`).

| Famille | Emblème | Thème du catalogue | Variantes (I → IV) | Signature ∞ | Ce que la famille *croit* (texte narratif proposé) |
|---|---|---|---|---|---|
| **Cendre** | ◆ braise | Pression, prise de risque offensive | Étincelle (gagner d'un point et blesser), Braise (+2 fixes contre un Assaut), Ferveur (Insight sur un coup porté), Contrecoup (3 dégâts même en perdant) | **Brasier Originel** (P14, Flamme conquérante : repousse une Secondaire après un Assaut soutenu) | « Le feu ne recule pas. » On gagne en prenant l'initiative ; même un coup perdu doit coûter à l'adversaire. |
| **Voile** | ◈ | Information, camouflage et perturbation | Éclaireur (voir une carte adverse), Détour (voir après une Interférence), Dissimulation (masquer sa Secondaire), Silence (neutraliser une Primaire) | **Miroir du Voile** (P12, Clairvoyance voilée : voir la main et une Secondaire cachée) | « Celui qui voit choisit. » On gagne avant le Clash, en sachant et en cachant. |
| **Ronce** | ✿ | Garde, contrôle et préservation | Racine (voir la carte repoussée), Écaille (soin sur Garde victorieuse), Entrave (renvoyer sous la pioche), Ténacité (la Garde perdue revient) | **Couronne de Ronce** (P12, Emprise : repousse une Secondaire, même active) | « Ce qui tient, dure. » On gagne en tenant, en usant l'élan adverse, en ne perdant rien. |
| **Astre** | ✦ | Adaptation, recirculation, synergies | Repère (voir le sommet de sa pioche), Prisme (affinité avec toute famille), Relance (l'Interférence revient en main), Convergence (×6 avec une autre famille) | **Convergence Astrale** (P13, Cycle astral : le soutien revient au sommet) | « Tout revient, tout s'assemble. » On gagne en combinant les voies, en faisant revenir ses meilleures cartes. |

Techniques de prédilection (figures existantes) : Kaï (Cendre) Sondage + Lecture ; Maëlle (Ronce) Ancrage + Rupture ;
Sélène (Voile) Lecture + Dissipation ; Orin (Astre) Recentrage + Ancrage. Elles nourrissent la proposition
d'apprentissage des Techniques de l'avenant (A-3).

Point narratif fort, **issu des cartes** : l'Astre est la seule voie dont les meilleures cartes (Prisme, Convergence)
**récompensent le mélange des familles**. Elle est la voie naturelle de celui qui veut, plus tard, conquérir les trois
autres ; la Cendre est la plus directe ; la Ronce la plus indulgente pour un débutant (soin, Gardes) ; le Voile la plus
exigeante en lecture. Le recrutement l'expose au joueur **avant** son choix (ADR 029 §3).

---

## 2. Hiérarchie des quatre familles (§VII.2)

### 2.1 Structure commune **[PROPOSÉ] P-N2**

La même structure pour les quatre familles (ADR 031 : « règle identique pour les quatre familles ») :

| Rang dans la famille | Nombre | Rôle narratif | Rôle de progression | Duel ? |
|---|---:|---|---|---|
| **Chef** (titre propre à la famille) | 1 | Tient la maison et sa Signature ; juge les prétendants | Sa défaite donne **sa Signature ∞** **[RATIFIÉ]** | oui, une fois les deux lieutenants battus |
| **Bras droit** (lieutenant aîné) | 1 | Le meilleur duelliste après le chef ; garde la porte du chef | Victoire → **une variante** **[RATIFIÉ]** (laquelle : A-8) | oui |
| **Cadet** (lieutenant cadet), aussi **émissaire** | 1 | C'est lui qui **remarque** le joueur au prologue et porte l'invitation ; puis il l'éprouve | Victoire → **une variante** **[RATIFIÉ]** | oui |
| Membres | quelques PNJ (gabarits ADR 023) | Vie de la maison, rumeurs, défis facultatifs | Duels facultatifs de quartier (pas de récompense structurante, voir progression §5) | facultatif |

**Pourquoi deux lieutenants et pas quatre :** le catalogue compte exactement **une variante par identité**, soit quatre
par famille ; deux lieutenants donnent deux variantes structurantes, les deux autres restent à gagner dans la ville
(compétitions spéciales, mission §V : « obtenir des variantes grâce à des compétitions spéciales »). Cela fait **12
duels structurants** avant le Championnat (4 × [2 lieutenants + 1 chef]), une longueur de campagne raisonnable, et
ne demande que **4 chefs nouveaux** à produire (voir 2.3). Alternatives (4 lieutenants par famille, ou 3) et leur coût :
`AVENANT_M10A_PROPOSE.md`, point A-8, et fiche, ARB-M10-06.

**Émissaire = cadet** : une seule figure porte l'invitation au prologue et le premier défi de lieutenant. Le joueur
retrouve la personne qui l'a remarqué : continuité dramatique, moins de personnages à produire.

### 2.2 Les quatre maisons **[PROPOSÉ] P-N3** (noms de travail)

| Famille | Maison (lieu) | Chef (titre) | Bras droit | Cadet / émissaire | Duel du chef |
|---|---|---|---|---|---|
| **Cendre** | la Maison du Chantier, au Quai (façade `chantier`, braseros) | **Bran**, « le Premier Feu » | **Kaï**, la Braise du quai (*le rival*, une fois monté en grade, §4) | **Tessa**, docker et pilier de la rue | la rue (le Quai, la nuit) |
| **Ronce** | le Fanal | **Mère Aubépine**, « la Gardienne du Fanal » | **Maëlle**, gardienne des Ronces | **Gaspard**, tavernier du Fanal | le bar (le Fanal) |
| **Voile** | la maison de la Fontaine, dans les Ruelles | **Ilse**, « la Dame aux Voiles » | **Sélène**, liseuse du Voile | **Lior**, colporteur des Ruelles | la salle de jeu de cartes (à huis clos) |
| **Astre** | l'Observatoire du Parvis | **Halvard**, « le Cartographe » | **Orin**, l'arpenteur des Astres | **Mira**, joueuse du Parvis | l'arène |

- **Réaffectation de personnages existants (à arbitrer, ARB-M10-07)** : les quatre rivaux V2 (ADR 021) deviennent les
  **bras droits** de leur famille ; ils gardent leur identité graphique, leur Signature de famille, leur profil d'IA et
  leurs Techniques. Ce choix économise la production (chaque bras droit est déjà dessiné en V2 pour le duel et en
  marcheur pour la ville) et donne aux rivaux connus une place dans l'histoire. Alternative : les rivaux deviennent les
  **chefs** (encore moins de production : seuls les lieutenants seraient nouveaux, et ils peuvent sortir des gabarits
  PNJ) mais les chefs seraient alors des visages déjà vus au Tournoi du Quai, sans gravité ; et Kaï, rival récurrent,
  ne peut pas être à la fois le rival et le chef de la Cendre.
- **Cadets** : duellistes de la ville sur les gabarits PNJ (ADR 023 : docker, marchande, commis, joueuse) avec une
  graine fixe et **un accent de couleur familial** (écharpe, brassard). L'ADR 023 dit des PNJ « aucune marque ni
  emblème » : un cadet porterait donc une **extension** du gabarit (accessoire familial), à valider avec la production
  (liste des images au retour de session).
- **Chefs** : quatre identités V2 nouvelles (duel) et quatre marcheurs (ville). C'est la principale demande de production
  de M10 (budget estimé au retour de session ; **non demandé**).

### 2.3 Règles de comportement des familles **[PROPOSÉ] P-N4**

- Une famille **n'impose rien** : ses membres peuvent insister (une réplique), jamais bloquer un passage ni retirer une
  offre par punition (ADR 029 §2).
- **Après affiliation**, les trois autres familles restent courtoises ; elles se montrent rivales dans le discours,
  jamais dans les accès : leurs quartiers restent ouverts.
- **Défi officiel d'une autre famille** (ADR 031 §4) : il s'engage **à la Salle des Bannières** (salle de jeu de cartes),
  par une scène explicite (« Engager le défi de la Ronce ») ; entrer au Fanal ou parler à un membre ne l'engage pas.
- Le chef n'accepte le duel qu'après la victoire contre ses deux lieutenants (dans l'ordre cadet → bras droit,
  P-N5). Ce prérequis est affiché (« Battez d'abord Maëlle »), jamais caché.

---

## 3. Le prologue et le recrutement (§VII.1)

Découpé en **scènes** (identifiants stables : ils servent de clés de sauvegarde et de quête). Chaque scène indique le
lieu, ce qui se passe, ce que le joueur peut faire, et les **états** qu'elle écrit (ADR 029 §4 : `remarqué`, `invité`,
`affilié`, `chef`, distincts de « visité » et « rencontré »).

### Acte 0 — « La populace » (le Quai, soir de tournoi)

**Scène P0 — Nouvelle aventure.** Écran d'accueil (`?aventure=1`) : « Nouvelle aventure ». Le joueur donne un nom. Il
**ne choisit pas de famille** (contrairement au mode standard, où la création du profil choisit une Signature). Il
reçoit **les seize cartes grises** (**[RATIFIÉ]** : 4 × I, 4 × II, 4 × III, 4 × IV, sans famille, effet ni bonus).
Carton : « Le Quai, soir de tournoi ». Écrit : `chapitre = prologue`, registre des gains : `neutres:depart` (16).

**Scène P1 — Le Quai.** Le joueur marche sur le Quai (îlot existant). Le tournoi officiel se joue dans la salle aux
quatre bannières ; la porte est gardée (« Le tournoi est réservé aux duellistes des familles »). Les PNJ du Quai
parlent des Quatre Voies (une réplique par famille, pour présenter les quatre avant tout choix). Kaï est au bout est
du Quai, près des braseros, cartes grises en main lui aussi.
- Objectif affiché : « Le Quai bruisse du tournoi. Approchez-vous des braseros. »
- Rien ne presse : le joueur peut se promener ; le prologue n'avance qu'à l'interaction avec Kaï.

**Scène P2 — Le défi imprévu.** Kaï, dépité d'avoir été refoulé du tournoi, interpelle le joueur : « Toi aussi, ils
t'ont fermé la porte ? Alors jouons ici. Qu'ils voient ce qu'ils ratent. » Choix : **« Relever le défi »** (lance le
duel) ou **« Pas maintenant »** (Kaï attend ; l'objectif reste affiché). Pas de duel forcé.

**Scène P3 — Le duel public.** Duel dans **la rue (le Quai, la nuit)**, lieu de duel existant. Deck du joueur : ses
seize neutres ; deck de Kaï : seize neutres aussi (le duel inaugural est **à armes égales**, A-10). PV et Techniques :
avenant A-3 et A-10. Une foule se forme (dans le duel : rien de nouveau ; la foule est mise en scène **après**, en
ville, pour ne pas toucher au rendu du duel).
- **Prototype M10-B** : tant que l'avenant n'est pas ratifié, ce duel se joue avec un **deck standard de prêt** sous
  un bandeau « provisoire » (`AVENANT_M10A_PROPOSE.md`, A-0 ; fiche ARB-M10-02).

**Scène P4 — La foule (quelle que soit l'issue).** Retour au Quai : la foule s'est rassemblée (passants qui se tournent,
répliques). **Victoire comme défaite mènent à la même suite** (ADR 029 : aucun blocage) ; seules les répliques
changent :
- victoire : « Un inconnu a battu la Braise du quai ! » ; Kaï : « La prochaine fois, je ne te ferai pas de cadeau. »
- défaite : « Il a tenu tête à Kaï jusqu'au bout, avec des cartes de rien. » ; Kaï : « Pas mal. Pour un gris. »

**Scène P5 — Les Quatre Voies remarquent.** Les quatre émissaires (cadets) sont dans la foule. **Tous les quatre**
remarquent le joueur : état `remarqué` pour les quatre familles. **Un** d'entre eux s'avance le premier (ADR 029 §1 :
premier contact selon des **faits publics** du duel) :

| Fait public du duel (journal public, aucun secret) | Premier émissaire |
|---|---|
| le joueur a gagné le plus de Clashes en **Assaut** | Tessa (Cendre) |
| le joueur a gagné le plus de Clashes en **Garde** | Gaspard (Ronce) |
| le joueur a réussi au moins deux **Interférences** | Lior (Voile) |
| sinon (jeu équilibré, ou égalité) | Mira (Astre) |

Le premier émissaire présente sa famille (philosophie §1.2, ce qu'il offre : « Rejoins-nous et tu recevras nos quatre
cartes de base »), puis dit que **les autres familles l'ont vu aussi**. Les trois autres se montrent (une réplique
chacune, depuis la foule) : le joueur sait qu'il a **quatre invitations**. État : `invité` pour les quatre familles.
- *Pourquoi les quatre invitent* : c'est la lecture la plus simple de « Les Quatre Voies découvrent son talent et
  manifestent leur intérêt » (mission §I) et la seule qui garantit sans détour « les quatre voies atteignables »
  (ADR 029). Alternative : seul le premier invite, les autres attendent que le joueur vienne à elles (plus de marche,
  même liberté). Fiche ARB-M10-07 (variante b).

**Scène P6 — Le choix (Accepter, Différer, Chercher une autre voie).** Dialogue du premier émissaire, trois réponses
**[RATIFIÉ]** :
- **Accepter** → écran de **confirmation** (ADR 029 §3) : nom et emblème de la famille, sa philosophie (§1.2), ce qui
  sera reçu tout de suite (« les quatre cartes de base : Cendre I, II, III, IV ») et ce qui suivra (« vous pourrez défier
  Tessa, puis Kaï, puis Bran »), et ce qui **ne change pas** (« les autres familles restent ouvertes ; vous pourrez
  plus tard engager leur défi »). Boutons **« Confirmer l'affiliation »** / **« Revenir »**. Seule la confirmation écrit
  `affilié`.
- **Différer** → « Prends ton temps. Tu me trouveras à la Maison du Chantier. » L'émissaire retourne à sa maison ;
  l'invitation reste valable (`invité`) ; aucune pénalité.
- **Chercher une autre voie** → liste des trois autres familles avec le lieu de leur émissaire (« Gaspard vous attend au
  Fanal ; Lior dans les Ruelles, près de la fontaine ; Mira sur le Parvis »). L'invitation du premier reste valable.

Après « Différer » ou « Chercher », l'objectif devient : « Quatre familles vous ont invité. Rendez visite à leurs
émissaires et choisissez votre voie. » Chaque émissaire, dans sa maison, rejoue la scène P6 pour sa famille (même
trois réponses). **Aucune limite de temps, aucun refus définitif** : refuser toutes les familles laisse le joueur
libre de se promener et de revenir (ADR 029 §2).

**Scène P7 — L'affiliation.** Après confirmation : **les quatre Basics I–IV de la famille sont remises ensemble**
(**[RATIFIÉ]** ADR 031 §1), le joueur les voit arriver (écran de récompense : quatre cartes qui se retournent), le
registre des gains note `basics:<famille>`. Le deck Aventure est mis à jour selon l'avenant (A-5 : une copie
neutre de chaque Rang remplacée par la Basic du même Rang, proposé). États : `affilié` (cette famille) ; les trois
autres restent `invité`. Proclamation (à terme dans la Grande Cour ; dans le prototype, une réplique de l'émissaire).

**Scène P8 — La porte s'ouvre.** L'émissaire, devenu le **cadet** du joueur, lui propose le premier défi de
lieutenant (« Montre-moi ce que valent tes nouvelles cartes ») : **fin du prologue** (lot M10-B). Le chapitre suivant
(ascension dans la famille) est le lot M10-C.

### 3.1 Ce que le prologue garantit (tests M10-B, voir feuille de route)

- Les quatre familles atteignables depuis la scène P5, par **Accepter** (premier émissaire) ou par une visite
  (**Différer**, **Chercher**) ;
- une défaite au duel P3 mène aux mêmes invitations ; un refus de tout mène à une ville ouverte, sans impasse ;
- aucune carte familiale avant la confirmation ; les états `remarqué`, `invité`, `affilié` distincts dans la
  sauvegarde ;
- sauvegarde et reprise à chaque scène (la scène courante est une clé de la sauvegarde Aventure).

### 3.2 Permanence de l'affiliation **[PROPOSÉ] P-N6**

ADR 029 §6 : non tranché ; « ne pas coder d'interdiction irréversible par défaut ». Proposition :
- l'affiliation est **unique à la fois** (on n'est membre que d'une famille) ;
- **changer d'affiliation** est possible **jusqu'au premier défi de lieutenant engagé** (une conversation avec
  l'émissaire de sa famille : « Je me suis trompé de voie »), sans perte : les Basics reçues restent (ADR 031 : gains
  uniques et définitifs), et les Basics de la nouvelle famille arrivent à la nouvelle confirmation ;
- **après** le premier défi de lieutenant, le changement n'est plus offert dans M10 (l'histoire suppose une maison
  d'origine), mais rien n'est perdu : les trois autres familles restent accessibles par leurs défis officiels, avec les
  mêmes récompenses. Fiche ARB-M10-08.

---

## 4. Le rival : Kaï, « la Braise du quai » (§VII.4)

**[PROPOSÉ] P-N7 — Kaï est le rival récurrent.** Raisons : il est déjà la figure du Quai (docker, duel libre dans la
rue, première manche du Tournoi du Quai, `src/product/encounters.ts`), son tempérament (profil offensif,
expressivité 1, humeur de repos « sûr de lui ») est celui d'un rival qui provoque, et son identité V2 existe pour le duel
et pour la ville. Alternative : un rival nouveau, sans famille au départ (production d'un personnage complet).

### 4.1 Arc en cinq temps

| Temps | Où | Ce qui se passe | Deck de Kaï (mêmes règles que le joueur) |
|---|---|---|---|
| **1. Le gris** (prologue) | le Quai, la rue | Refoulé du tournoi comme le joueur, il le provoque ; le duel public les fait remarquer tous les deux | 16 neutres (comme le joueur) |
| **2. La Braise** (après l'affiliation du joueur) | le Quai | Kaï a rejoint la **Cendre**, quelle que soit la voie du joueur ; si le joueur a choisi la Cendre, ils sont **co-recrues** (rivalité interne), sinon rivaux de maisons | 12 neutres + 4 Basics Cendre |
| **3. Le bras droit** (au défi des lieutenants de la Cendre) | Maison du Chantier, la rue | Kaï est monté en grade ; c'est **lui** que le joueur doit battre pour approcher Bran ; le battre donne une variante Cendre (A-8) | format miroir (A-10) : 4 cartes Cendre dont 2 variantes (III, IV), sans Signature |
| **4. L'ombre** (défis ponctuels, chapitre par chapitre) | là où se trouve le joueur, une fois par chapitre au plus | Kaï interpelle : revanche, pari, provocation ; **duel facultatif**, refusable | grandit avec son rang dans la Cendre |
| **5. Le finaliste** (Championnat) | l'arène | Kaï a gagné sa place ; demi-finale ou finale selon le parcours (Progression §4) ; après le Championnat, réconciliation (il reconnaît le joueur comme meilleur duelliste de la ville) | deck Cendre au complet, avec la Signature de la Cendre (que Bran lui a confiée) |

### 4.2 Règles du rival **[PROPOSÉ] P-N8**

- **Pas d'interruption** : les défis du rival passent par le directeur des rencontres (fichier ville), au plus **un par
  chapitre**, jamais pendant une scène principale, toujours refusable (sauf le duel du bras droit, qui est un défi de
  progression engagé par le joueur).
- **Pas de statistiques gonflées** : Kaï progresse par son deck (neutres → Basics → variantes → Signature) et par ses
  Techniques ; ses PV restent ceux de sa fiche (80 aujourd'hui, `RIVALS.braise`, réglable par donnée, A-10).
- **Mémoire publique** : ses répliques se souviennent des résultats publics des duels précédents (victoires, défaites,
  nombre de revanches), jamais d'un secret (ADR 011).
- **Revanches sans duplication** : un duel facultatif contre Kaï ne donne **aucune** récompense structurante ; le seul
  duel de Kaï qui donne une carte est celui du **bras droit de la Cendre**, et une seule fois (registre des gains).

---

## 5. Après le prologue : la trame (renvois)

| Chapitre | Contenu | Document |
|---|---|---|
| **Prologue** (M10-B) | scènes P0 à P8 | ce document §3 |
| **I. La maison** (M10-C) | cadet → bras droit → chef de la famille d'accueil ; Signature ∞ | `PROGRESSION_ET_RECOMPENSES.md` §2 |
| **II à IV. Les trois autres voies** (M10-D) | défi officiel à la Salle des Bannières (4 Basics) → cadet → bras droit → chef ; ordre libre | `PROGRESSION_ET_RECOMPENSES.md` §3 |
| **V. Le Championnat des Champions** (M10-E) | après les quatre chefs | `PROGRESSION_ET_RECOMPENSES.md` §4 |
| En continu | ville, rencontres, compétitions, rival | `VILLE_RENCONTRES_EVENEMENTS.md` |

**Titre final** : « le meilleur duelliste de la ville » (objectif du responsable, mission §VII, dernière phrase) : décerné
dans la Grande Cour à la victoire du Championnat ; le jeu continue ensuite (rencontres, compétitions, revanches).

---

## 6. Ton, textes et accessibilité **[PROPOSÉ]**

- Phrases courtes, vouvoiement de l'interface, tutoiement possible entre personnages ; aucune information de règle
  donnée seulement par un dialogue (l'aide et l'écran de confirmation la répètent).
- Toute scène se rejoue depuis la sauvegarde ; tout dialogue se ferme par Échap sans rien décider (rien n'est choisi
  à la place du joueur, comme le menu de pause du duel).
- Les textes du prototype restent des **textes de prototype** (signalés) jusqu'à une passe d'écriture.
- **Écriture neutre partout (décision du responsable, ARB-M10-11 ; avenant M10-A, AV-11)** : aucun accord de genre pour
  le duelliste joueur, dans tous les textes du mode Aventure (dialogues, foule, journal, quêtes, écrans, aide,
  récompenses). Moyens : tournures épicènes (« quelqu'un », « la recrue », « personne en ville ne joue mieux que vous »),
  adresse directe (« tu », « vous »), verbes plutôt que participes accordés (« Kaï vous lance un défi » plutôt que « Kaï
  vous a défié »), le jeu ou les cartes plutôt que la personne (« des cartes grises ont battu la Braise du quai » plutôt
  que « un duelliste gris ») ; **ni point médian ni doublets**. Le titre final (« le meilleur duelliste de la ville »,
  §5) s'écrit à l'écran « personne en ville ne joue mieux que vous ». Les personnages non joueurs gardent leur genre.
  Contrôle : `test/aventure.test.ts` (aucune forme genrée du joueur dans les textes du mode Aventure).
