# Audit de fin de projet — gameplay et structure (2026-11-11, passe 221)

> Demande du responsable (2026-11-11) : « un audit complet du gameplay et de la structure globale du projet pour conclure
> et valider le tout ». État audité : `main` à `8a947eb` (passe 220, M18 compris). Quatre audits en lecture (règles et
> équilibre ; aventure ; duel et apprentissage ; code, livraison et gouvernance), plus une campagne de vérification
> automatique (`artifacts/qa/audit-final/`). Les défauts les plus lourds ont été revérifiés à la main dans le code
> (marqués **revérifié**) ; les autres sont relevés avec leur preuve, sans contre-épreuve.

## Verdict

**Le jeu est complet, jouable de bout en bout et sain dans ses fondations ; il n'est pas encore validable comme version
finale.** Le moteur est conforme aux règles approuvées (V3.0, delta V3.2, avenants 07 et 08), indépendant du rendu,
déterministe et bien testé (890 tests verts). L'aventure va du prologue au titre dans les deux modes sans blocage dur.
M17 et M18 tiennent leur principe dans le code. Restent, avant de dire « fini » :

1. **deux défauts de règles** (Contre-jour inopérant ; un soin qui sauve d'un coup mortel) ;
2. **l'avenant 09 (48 variantes) en jeu sans texte approuvé**, avec des interactions tranchées par les sessions ;
3. une série de **défauts corrigeables sans décision** (textes de leçons et de résultats, sauvegarde mal formée,
   révision au tour assisté, nom de l'Observatoire, mouvement réduit du Duel standard) ;
4. des **décisions** à prendre en une fiche (liste en fin de rapport) ;
5. **l'œil et l'oreille du responsable** sur M18, la musique et les scènes, jamais remplaçables par la QA ;
6. la **remise en ordre de la livraison et des documents** (version, documents d'entrée, outils, poids).

## Vérifications automatiques (campagne de l'audit)

| Vérification | Résultat |
|---|---|
| `tsc --noEmit` | vert |
| `vitest` | **890 / 890**, 66 fichiers |
| `npm run build` | vert (chunk principal 1 252 kB, au-dessus de la limite relevée à 900 kB) |
| Simulation moteur (`npm run sim`, 200 duels) | 38 ms par duel, 8,7 tours en moyenne, 10 % de prolongations, aucune erreur |
| `qa:product`, `qa:rc` (salle, bar, arène), `qa:voies` (62/62), `qa:championnat`, `qa:vue` (29/29) | verts |
| `m14-recit-guide` (45/45), `m14-preparation` (25/25), `m16-chasse` (27/27), `m17-lecons` (68/68), `m18-tour` (30/30), `manette` (34/34) | verts |
| `qa:browser` | bureau 3/3 vert ; **mobile 0/2** (chevauchement case / panneau, connu depuis la passe 206 ; mobile différé, fiche M14 S1) |
| `qa:techniques` | souris 1280 4/4 vert ; **tactile 390 0/4** (même cause mobile) |
| `qa:aventure`, `qa:maison` (27/29), `qa:vivante` (29/35) | **9 contrôles périmés, aucun défaut du jeu** : création d'aventure (passe 203) ; Lecture donnée à l'affiliation (avant M16) ; manière de gagner une carte passée en infobulle (passe 209) ; gardien de la chasse aux cartes (M16) compté comme rencontre du directeur |

Navigateur : Chrome sur la Radeon 780M (`LQV_GPU=1`), en 1280 × 720 sauf mention. Les parcours tournent en `?qa=1`, donc **au tour classique et sans conseils, cinématiques ni son** : ils vérifient le
moteur et les écrans, pas les réglages par défaut d'un joueur. Seuls `m17-lecons` et `m18-tour` jouent le tour assisté.

## 1. Règles et moteur

**Solide (fait).**
- Étiquette `V3.0+delta-V3.3.2` (`engine.ts:74`).
- Garde dominée `min(⌈P_G/2⌉, P_A−1)` avant le multiplicateur (`clash.ts:173-175`, `262`).
- Annonce et révision unique des Signatures conformes à l'avenant 08 et à son amendement (`engine.ts:385-389`, `591-632`).
- `needs()` ne s'appuie que sur de l'information publique.
- Prolongation, K.-O., recyclage, R-AV corrects.
- `src/game` n'importe rien d'autre, ni `Math.random` ni `Date` ; même graine, même empreinte ; l'IA ne lit que la vue du joueur.

**Défauts.**

| Gravité | Défaut | Preuve |
|---|---|---|
| Bloquant | **Contre-jour (Voile III C) inopérant** : le Clash accorde +1 Rang (`clash.ts:199`), mais le moteur (`engine.ts:338`, **revérifié**), l'interface (`controller.ts:1004`) et l'IA (`policy.ts:105`) refusent toujours la cible de Rang supérieur. L'effet ne marche qu'à l'aveugle ; sa mesure (49,3 %) est celle d'une Basic. | test seulement sur `computeClash` (`variantes09.test.ts:79`) |
| Bloquant (règle à trancher) | **Un soin après un coup mortel sauve** : PV ramenés à 0 (`engine.ts:808`, **revérifié**), puis soignés (`823`), K.-O. jugé ensuite. À 3 PV, 12 dégâts et Bouture +2 : le joueur survit à 2 PV ; V3.0 §9.3 dit « zéro PV ou moins à la fin de la résolution simultanée ». Un double K.-O. devient une victoire du porteur de Bouture. | aucun arbitrage (ADR 004) |
| Important | Interactions de l'avenant 09 tranchées sans arbitrage : Fournaise contre Rempart, Percée après Rempart, Équinoxe et les effets du perdant. | `clash.ts:260-283` |
| Mineur | Fuite ADR 011 : une Leurre masquée et engagée se trahit par la raison publique « cible protégée par son effet ». | `engine.ts:786` |
| Mineur | Verdict affiché faux avec Rempart, Fournaise, Percée (« moitié de sa Puissance »). | `journal.ts:196-199` |
| Mineur | Escarbille et Sève révélées p1 puis p2 : l'issue dépend du siège. | `engine.ts:520-563` |
| Mineur | `CATALOG_VERSION` non incrémentée depuis 16 variantes (`replay.ts:9`) ; contrat 06 (AV-03) dit encore « deux Techniques ». | |

## 2. Équilibre

- **Duel standard** (amendement 1, 1 200 duels) : 50,0 % sur le corpus varié ; **Signature Cendre à 57,3 %**, les trois
  autres à 47-49 %. L'avance du Brasier persiste à chaque mesure depuis V3.3 (61,0 → 57,3 %).
- **Variantes** (400 duels par ligne) : toutes dans ±6 points ; près du bord Tison −5,0, Surenchère −4,5, Boussole
  +4,8, Phénix +4,3. Une marge de ±6 sur 400 duels ne détecte pas un écart de moins de 5 points.
- **Profils d'IA** : « offensif » est le plus faible (32 % contre équilibré), le niveau 2 bien plus fort (vicieux 84 %).
- **Aucune stratégie triviale ne gagne** contre l'IA « équilibré » (toujours Assaut 3,7 %, toujours Garde 0 %, au
  hasard 1,3 % ; mesure de l'audit, 300 duels) : les choix pèsent.
- **Mesures non probantes** : l'IA de niveau 1 n'utilise jamais Recentrage (`policy.ts:165-171`), donc « 72,5 % avec
  Recentrage » (M16) mesure un joueur sans Technique ; l'IA ignore la plupart des regards privés (`memory.ts:45`) et
  joue Lecture au hasard. La voie directe de l'aventure (chefs 45-48 %) date d'avant le calendrier M16.

## 3. Duel et apprentissage (M17, M18)

**Solide (fait).** Aucune impasse : chaque étape restante pose sa question, et la dernière réponse envoie l'étape.
Cibles uniques prises d'office, aucun « Valider » quand le choix suffit. Le tour classique reste intact. Aucun secret
dans les questions (`annonce.ts:26-43`). Les 17 leçons se jouent aux gestes du tour assisté (`m18.test.ts:143-166`).

**Défauts.**

| Gravité | Défaut | Preuve |
|---|---|---|
| Important | **Phrases du maître de table à l'ancien vocabulaire** : « puis Valider », « verrouille », « puis valide », « puis Dissiper » alors qu'aucun de ces boutons n'existe au tour assisté (**revérifié**). | `lecons/catalogue.ts:172, 234, 291, 307, 308, 324, 328, 378` |
| Important | **Révision (avenant 08) au tour assisté** : le panneau central couvre la Signature annoncée sans la nommer, ne dit pas comment modifier, et « Garder » garde le focus même après une modification. Aucun parcours ne joue une révision. | `board.ts:1059-1063`, `duelSession.ts:294-295`, `m18-tour.mjs:156` |
| Important | **Deux cases pleines** : SECONDAIRE remplace toujours la case 1 (même active) et engage aussitôt, sans REMPLACE ni annulation (contrat 05 l. 27). | `controller.ts:836-837` |
| Important | **Aperçu tactique sans les Secondaires actives du rival** : « Conserver » annonce « aucun dégât » alors que la Cendre III active de Kaï coûterait 6 PV. | `controller.ts:1304`, capture `screenshots/qa/m18/1920/tactics-apres.png` |
| Important | **Mouvement réduit du Duel standard et des leçons « Apprendre » encore pris au système** (`reducedMotion: null`, **revérifié**) : sur le poste du responsable, sans fondus, contre la règle §6 bis. | `product/save.ts:101`, `params.ts:110` |
| Important | Mesures M18 faites sans les temps forts tenus au clic (`qa=1` sans `tenir=1`) : en jeu réel, un temps fort peut passer au-dessus du panneau de décision (hypothèse). | `m18-tour.mjs:42` |
| Mineur | « Utiliser » et « Révéler » grands, pulsants, avec le focus ; « Non » petit : le facultatif se lit encore comme une obligation. Tutoiement et vouvoiement mêlés. Consigne répétée trois fois en leçon. | `board.ts:1081-1093` |

**Couverture des leçons (règle B6).** Couverts : Clash, postures, Secondaires, choix tactiques, Interférer, Insight,
les six Techniques, familles, signaux des variantes, regard privé et camouflage, Signature, prolongation.
**Sans leçon : la révision du joueur, le Repoussement après une Garde, le remplacement d'une Secondaire, la défausse à
quatre cartes** ; des 52 effets de variantes et de Signatures, environ 8 apparaissent en leçon (les autres : fiche au
survol). Le Duel standard au tour assisté tait les conseils et ne propose d'office que les leçons de base du profil.

## 4. Aventure

**Parcours.** Prologue (duel public contre Kaï, invitations, affiliation libre) ; chapitre I dans la maison choisie
(cadet, K1, bras droit, chef) ; chapitres II à IV pour les trois autres familles (Salle des Bannières, K2 à K4) ;
chapitre V, le Championnat (K5, poule, Miroir, Finale en deux manches, titre, K6). **Au minimum 19 victoires** ; en
Récit guidé, K1 à K5 aussi. Facultatif : Épreuves, Joutes, duels de rue, revanches, chasse aux cartes.

**Solide (fait).** Machine d'états pure, gains à clé unique (jamais deux fois), deck R-AV légal par construction,
sauvegarde à part avec copie de secours, migration `aventure/1` → `aventure/2` sans perte, duel en cours rejoué et
vérifié à la reprise ; parité des deux modes testée ; le Championnat ne peut pas se bloquer ; les décisions des fiches
M11, M14 (G1 à G4) et M16 (T3) sont appliquées.

**Défauts.**

| Gravité | Défaut | Preuve |
|---|---|---|
| Important | **Sauvegarde JSON valide mais mal formée** (deck sans `techniques`, registre avec `null`) : la validation lève une exception non rattrapée au démarrage ; l'adresse nue reste sur un écran vide (lecture du code, non exécuté). `rival`, `collecte`, `vaincues`, `engages` ne sont pas validés. | `sauvegarde.ts:126`, `deck.ts:56`, `main.ts:198` |
| Important | **La copie de secours n'est jamais proposée** au joueur : elle est calculée puis seulement écartée. | `sauvegarde.ts:152-154`, `app.ts:302, 396` |
| Important | **Décision D2 non appliquée** : la maison de l'Astre s'appelle toujours « l'Observatoire du Parvis » (**revérifié**), au lieu de « l'Observatoire de la Ville haute ». | `modele.ts:108` |
| Important | **Note de résultat fausse** après une victoire sans gain (duels de rue, Kaï, revanches, gardiens) : « Revanche : rien de nouveau au registre… les trois variantes sont déjà à vous ». | `app.ts:1983` |
| Important | **Contraintes de Joute périmées depuis l'avenant 09 et M16** : Cendre exige précisément Contrecoup (**revérifié**) ; Voile exige Lecture ou Dissipation, qui ne s'obtiennent plus qu'au chef ; Astre exige trois familles, impossible avant le chef. | `competitions.ts:60-63` |
| Mineur | Épreuve ou Joute rejouée annoncée « sans récompense » alors qu'elle donne la variante suivante ; Kaï rejoué avec les répliques du chapitre en cours ; Cendre en Récit guidé : deux duels contre Kaï d'affilée ; une sauvegarde « plus récente » écrasée sans confirmation ; annexe de calibrage à 75 PV pour le bras droit contre 80 dans le code. | `competitions.ts:71, 78`, `app.ts:1043, 316`, `paliers.ts:42` |

**À valider.** Le lot de textes de la structure narrative n'est pas fait (D2, G5, répliques « de prototype »,
apparence provisoire d'Ysolde). La croissance des PV sans plafond peut se forcer par les Épreuves rejouées.

## 5. Code, livraison et gouvernance

**Solide (fait).** TypeScript strict (`noUncheckedIndexedAccess` compris), aucun `any`, aucun TODO, aucun
`console.log` ; moteur indépendant du rendu ; chargement découpé (aventure, ville, orchestre, workers à la demande) ;
**aucun secret** dans les fichiers suivis, l'historique ni `dist/` ; traçabilité exemplaire (journal, fiches, ADR).

| Gravité | Défaut | Preuve |
|---|---|---|
| Bloquant (livraison) | **Avenant 09 non versé sous `contracts/`** (statut « PROPOSÉ, APPLIQUÉ À TITRE PROVISOIRE ») ; étiquette des règles inchangée et recopiée en 4 endroits. | contrat 00, `engine.ts:74`, `types.ts:127`, `fin.ts:21`, `resume.ts:8` |
| Bloquant (livraison) | **Numéro de version figé à `0.10.0-rc.1`** (`package.json`, `version.ts:2`), écrit dans des sauvegardes de schémas incompatibles. | `sauvegarde.ts:31` |
| Important | Portes de QA rouges pour des causes connues : mobile (chevauchement case / panneau, depuis la passe 206) dans `qa:browser` et `qa:techniques` ; contrôle périmé dans `m10-aventure.mjs:54`. | campagne de l'audit |
| Important | La QA ne joue presque jamais les réglages par défaut (tour assisté, conseils, cinématiques, son) ; aucun duel d'aventure entier au tour assisté. | `params.ts:92`, journal passe 220 |
| Important | Classes géantes sans tests unitaires : `aventure/app.ts` (2 662 lignes, ~136 méthodes, 60 imports), `controller.ts` (1 338), `arena.ts`, `board.ts`, `duelSession.ts`, `shell.ts`. Aucun outil de couverture. | |
| Important | Livraison lourde : chunk principal 1 252 kB, sourcemaps livrées (7,5 Mo), **67 Mo de décors PNG** dans `public/`. Dépôt : 1,43 Go de captures suivies, 2,59 Gio de packs. | `vite.config.ts:9-10` |
| Important | **Documents d'entrée périmés ou contradictoires** : README (« M04–M06 », « RC 0.6 »), `README_START_HERE.md`, `ETAT_PROJET_ET_LIMITES.md`, contrat 01 (« ville et narration hors mission ») ; CLAUDE.md garde des « mandats actifs » M02 et M03 et « M09 en pause » ; CLAUDE.md 68 Ko et AGENTS.md 87 Ko partagent 40 bannières identiques ; la ligne « Dernière passe » du journal fait 45 000 caractères. | |
| Mineur | Quatre paires de modules interdépendantes, quatre cycles de fichiers ; trois `nomCarte` différents ; crochets de test accessibles sans `?qa=1` (`?depart=`, `?seed=`, `?famille=`…) ; `.gitignore` sans `.env` ; aucun linter ; `simulator_ref/` (oracle V3.2) plus utilisé. | |

**Encore ouverts.** ADR « proposé » : 001, 002, 005 à 010, 012, 015 (historiques jamais clos, certains dépassés), 043
(cinématiques), 048 (Récit guidé), 049 (interface, à recevoir) ; ADR 047 amendement 3 (16 bits). Contrats provisoires :
avenant 09, `docs/m12/03` (remplacé de fait), M14 révision 3, M15, M11 contrat 7, quatre documents de `docs/m10/`.
Entrées de fiches en attente : M14 R1 à R3, T1, T2, G5, S1 ; M11 C1, R4, S3 ; M12 relecture des variantes ; M13 et
M15 (écoute, lot 3).

## Défauts à corriger sans décision (lot de correction proposé)

1. **Contre-jour** : une seule fonction de légalité de l'Interférence, partagée par moteur, interface et IA ; test par `applyCommand`.
2. **Leçons** : accorder les huit phrases du maître de table au tour assisté ; contrôle du texte affiché dans `m17-lecons`.
3. **Révision au tour assisté** : nommer la Signature annoncée dans le panneau, dire comment modifier, « Engager la révision » en action principale dès que le brouillon change ; parcours qui révise.
4. **Deux cases pleines** : montrer REMPLACE et laisser choisir la case avant d'engager.
5. **Aperçu tactique** : tenir compte des Secondaires actives visibles du rival.
6. **Sauvegarde** : rattraper toute exception de validation, valider tous les champs, proposer « Restaurer la copie de secours », confirmer avant d'écraser une sauvegarde plus récente.
7. **Textes de l'aventure** : nom de l'Observatoire (D2, décidé) ; notes de résultat par type de rencontre ; « variante suivante » en revanche ; répliques propres à chaque événement de Kaï ; annexe de calibrage (80 PV).
8. **Mouvement réduit du Duel standard** : réglage propre, désactivé par défaut (règle §6 bis).
9. **Hygiène** : les neuf contrôles périmés de `qa:aventure`, `qa:maison` et `qa:vivante` ; fuite de Leurre, verdict de Garde sous l'avenant 09, révélations simultanées d'Escarbille et Sève, `CATALOG_VERSION`, Recentrage et regards privés dans l'IA de niveau 1 pour des mesures probantes.

## Décisions à prendre (fiche d'arbitrages de clôture)

- **Règles** : soin après un coup mortel (calculer PV − dégâts + soin, ou ratifier l'actuel) ; interactions de
  l'avenant 09 (Fournaise et Rempart, Percée, Équinoxe) ; puis verser l'avenant 09 sous `contracts/` avec une nouvelle étiquette.
- **Équilibre** : Signature Cendre (Brasier) à 57 % : garder ou ajuster ; Tison, Surenchère, Escarbille, qui sortent
  toutes négatives ; plafond des PV par les Épreuves rejouées.
- **Aventure** : contraintes de Joute (Cendre, Voile, Astre) au vu de l'avenant 09 et de M16 ; lot de textes de la
  structure narrative (G5, répliques de prototype, Ysolde).
- **Apprentissage** : leçons de la révision, du Repoussement, du remplacement et de la défausse ; même poids pour
  « Utiliser » et « Non » ; aperçu « si le rival amplifie » ; leçons des éléments proposées au premier Duel standard.
- **Livraison** : numéro de la version finale ; mobile différé (sortir ses parcours des portes) ; retirer ou garder
  `?demo=1`, `?cartes=v1`, la ville d'avant « en secours », les laboratoires `?ville=1` et `?musique=1` dans le build livré,
  les crochets de test non gardés, les sourcemaps ; décors compressés (WebP, à mesurer) ; captures hors de git
  (toute réécriture d'historique exige un accord explicite).
- **Documents** : CLAUDE.md réduit à l'état courant (bannières historiques dans un index), README réécrit, documents du
  kit initial marqués historiques, ADR et contrats proposés clos ou marqués remplacés.

## Ce qui reste au responsable

Jouer M18 à l'œil (tour assisté, panneau central, révision, temps forts tenus) ; un duel d'aventure entier au tour
assisté ; l'écoute (musique, son, transitions), la marche, les scènes et le relief ; les entrées de fiches en attente
(M11 C1, R4, S3 ; M12 relecture des variantes ; M14 R1 à R3, T1, T2 ; M13 et M15).

## Plan de clôture proposé

1. Fiche d'arbitrages de clôture (les décisions ci-dessus), remplie par le responsable.
2. Lot de correction (défauts sans décision, puis décisions de la fiche), avec ses tests.
3. Test complet du responsable, combat compris.
4. Campagne de QA finale sur les deux GPU, aux réglages par défaut d'un joueur en plus de `?qa=1`.
5. Nettoyage de livraison et des documents, version finale numérotée.
