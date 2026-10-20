# Brief — session cloud RPGCards : M10, structuration narrative et version jouable du mode Aventure (2026-10-20)

**Commanditaire :** le responsable, brief validé en séance le 2026-10-20. **Exécutant :** une session cloud, seule et sans
interlocuteur pendant tout le run (environ 6 heures, comme le précédent) : ne pose pas de question, personne ne
répondra. Décide dans les limites de ce brief ; ce qui les dépasse va dans la fiche d'arbitrages (phase 3) et tu
continues le reste.

**Objectif, dans les mots du responsable :** « structurer et finaliser une version jouable en respectant la structure
narrative suivante en plus de la structure artistique récemment validée et intégrée (même si le cloud n'a pas accès aux
API et autres outils externes, donc il fera uniquement ce qu'il peut) ». La structure narrative est la mission M10 du
responsable, reproduite telle quelle en **annexe A** : elle fait foi pour le contenu attendu.

**Comment ce brief concilie les deux demandes.** La mission M10 demande d'abord des contrats (« Avant toute
modification du moteur, prépare un avenant technique M10-A ») ; le responsable veut aussi une version jouable. D'où
deux phases, dans cet ordre :

1. **Phase 1 : les contrats M10** (les huit livrables de l'annexe A, §VII). Obligatoire, en premier, poussée avant
   tout code.
2. **Phase 2 : une version jouable du prologue en mode Aventure**, derrière `?aventure=1`, construite sur les
   paramètres **proposés** de la phase 1 (provisoires jusqu'à l'arbitrage du responsable), **sans rien changer au mode
   Duel standard ni au jeu par défaut**.

## Mode autonome (prioritaire sur tout le reste du brief)

- **Ne t'arrête jamais pour attendre une validation** et ne pose aucune question.
- **Face à une décision**, prends l'option la plus réversible et la plus conforme aux contrats ; consigne-la (journal,
  ADR « proposé » si elle est structurante, fiche d'arbitrages) et continue. Une décision prise seule reste
  **provisoire** jusqu'à la fiche.
- **Face à un blocage** (outil indisponible dans le cloud, test instable, accès refusé) : contourne s'il existe un
  contournement sûr, sinon consigne en `[KO]` avec la raison exacte et passe à l'étape suivante.
- **Ne laisse jamais le temps inoccupé** : phase finie plus tôt, passe à la suivante ; temps restant à la fin, prends
  « Si le temps le permet ».
- **Décisions pendant le run :** le responsable peut en pousser sur `main` (en tête de ce brief, de `CLAUDE.md` ou
  d'`AGENTS.md`). Relis ces trois en-têtes après chaque `git pull` et applique ce qui y arrive.
- **Ce que le cloud ne peut pas faire, et que tu ne remplaces pas :** pas de génération d'images (pas de clé), pas
  d'Aseprite, pas de GPU réel ni de Windows. Les mesures de fluidité, les contrastes sous Windows et toute production
  d'images vont dans « à faire en local » du retour, sans les inventer.

## Ce qui est déjà décidé (ne le rediscute pas)

- **Narratif et progression :** ADR 029 (option B : le joueur choisit librement sa famille ; Accepter, Différer,
  Chercher une autre voie ; aucune affiliation imposée), ADR 030 (16 cartes neutres : quatre exemplaires de chaque
  Rang I à IV, sans famille, bonus ni effet), ADR 031 (Basics I–IV à la confirmation de l'affiliation, puis à
  l'engagement officiel du défi de chaque autre famille ; variantes aux victoires contre les lieutenants ; Signature ∞
  à la victoire contre le chef ; possession ≠ équipement : une seule Signature équipée).
- **Combat :** règles V3.0, delta V3.2, D-01 ratifié en V3.3 (`source/`, `contracts/`), moteur et secrets (ADR 011).
- **Ville (M09, en pause) :** caméra frontale 2.5D (ADR 024), architecture en îlots (ADR 025), direction artistique
  HD-2D stylisée en images générées, diorama de plans peints et personnages en pixel art, la Grande Cour (ADR 028),
  quartiers en rangs (`docs/M09_QUARTIERS_EN_RANGS.md`, `src/ville/rangs.ts`), feuilles de personnages (ADR 027).

## Limites dures du run

- **Mode Duel standard et jeu par défaut inchangés.** Ne modifie pas les calculs du Clash, les conditions
  d'Amplification, l'IA ni les secrets du moteur. Tout ce qui est propre à l'Aventure vit à part (module dédié,
  paramètre d'URL) ; le jeu par défaut reste identique au pixel près et les tests existants du moteur passent sans
  modification.
- **Approbations des images :** les manifestes `public/decors/` et `public/sprites/` restent `approved: false`. Seul le
  responsable approuve, après sa vérification des conditions d'OpenAI. Hors QA, le jeu garde donc les décors et
  personnages dessinés par code : c'est attendu, ne le contourne pas.
- **M09 en pause :** ne refais pas, ne réoriente pas et ne remplace pas les décors, îlots, rangs ou feuilles de M09 ;
  réutilise-les. Pas de « production massive de décors » (annexe A).
- **Sources de référence en lecture seule :** `source/`, `contracts/`, `simulator_ref/`. L'avenant M10-A proposé va dans
  `docs/m10/`, pas dans `contracts/` (il y entrera après ratification).
- **Sauvegardes :** les profils et parties de la RC 0.8 doivent toujours se charger ; aucune migration destructive.
  L'Aventure a son propre emplacement de sauvegarde, versionné.
- Aucune image, police ou son externe au runtime ; aucun secret commité.

## Lecture obligatoire (phase 0, environ 20 min)

`CLAUDE.md`, `AGENTS.md` en entier, `JOURNAL.md` (en-tête, « À reprendre », passes 61 à 69 et les entrées M10),
`README_START_HERE.md`, `contracts/00_GOUVERNANCE_AUTORITE.md`, `docs/missions/M10_ORIGINES_ASCENSION_QUATRE_VOIES.md`,
ADR 029, 030, 031, puis 011, 021, 022, 023, 024, 025, 028 ; `docs/missions/M09_VILLE_EXPLORATION_HD2D.md` (« Pause du
2026-10-20 »), `docs/M09_QUARTIERS_EN_RANGS.md`, `docs/DEMO_JOUABLE.md`. Code à examiner : `src/game/catalog/`
(cartes, variantes, Signatures, Techniques), `src/game/` (moteur), `src/product/` (deck, collection, progression,
rencontres, sauvegarde, reprise), `src/ville/` (îlots, rangs, démo).

**Mise en route :** `npm ci` ; Chromium pour les outils de QA (`npx playwright-core install chromium`, puis
`CHROMIUM_PATH=<chemin>`). **Construis tout de suite le `main` de départ dans un dossier hors du dépôt** : c'est le
« avant » des comparaisons au pixel près (`tools/l5-identique.mjs`, `LQV_BEFORE=<dossier>`). Si un outil de
navigateur ne tourne pas, consigne-le en `[KO]` et continue avec typecheck, tests et build.

## Contraintes de l'environnement cloud

- **Garde ton tour actif jusqu'à la fin du run** : une session inactive se met en pause et sa machine peut être
  récupérée (commandes de fond et sous-agents perdus).
- **Commandes longues :** 2 minutes par défaut au premier plan (10 au maximum, paramètre `timeout`) ; au-delà, en
  arrière-plan, surveillées jusqu'à la fin.
- **Pousse souvent** : ce qui n'est pas poussé peut être perdu.
- Rendu logiciel (SwiftShader) : environ 1 image par seconde ; les comparaisons au pixel près sont fiables, les mesures
  de fluidité non. Délais de QA à donner d'emblée : `LQV_QA_NAV_TIMEOUT=90000 LQV_QA_TIMEOUT=60000`. Une campagne de QA
  complète prend environ 2 heures et doit tourner **seule**.
- Ni les règles globales du responsable ni ses compétences personnelles ne sont disponibles ici : ce brief et les
  documents du dépôt font foi.

## Phase 1 (environ 2 h 30) — Contrats M10

Produis les huit livrables du §VII de l'annexe A, en un ensemble cohérent sous `docs/m10/`, avec un index
`docs/m10/README.md`. Découpage suggéré :

| Fichier | Contenu (numéros du §VII) |
|---|---|
| `CONTRAT_NARRATIF_M10.md` | 1 scénario du prologue et du recrutement ; 2 hiérarchie des quatre familles ; 4 rôle et évolution du rival |
| `PROGRESSION_ET_RECOMPENSES.md` | 3 parcours et récompenses ; Championnat des Champions (§IV) ; 6 quêtes et progression persistante |
| `VILLE_RENCONTRES_EVENEMENTS.md` | 5 rencontres et événements de ville (§V) |
| `AVENANT_M10A_PROPOSE.md` | 7 avenant du mode Aventure : chaque point du §VI, avec options, recommandation et raison ; statut **proposé** |
| `FEUILLE_DE_ROUTE_M10.md` | 8 lots M10-A à M10-F, tests et conditions de validation de chacun |

Exigences :

- **Ancre-toi dans l'existant.** Lieux réels de la ville (le Quai, le Parvis de l'arène, les Ruelles du Voile, la Grande
  Cour, les rangs du Quai), lieux de duel (salle, rue, le Fanal, arène), rivaux V2 (Kaï, Maëlle, Sélène, Orin, ADR 021),
  gabarits PNJ (ADR 023), Tournoi du Quai. Tire la « philosophie de jeu » de chaque famille de ses vraies cartes et
  Techniques du catalogue, pas d'une invention. Si tu proposes de réaffecter un personnage existant (un rival devenu
  chef, par exemple), présente-le comme une proposition à arbitrer.
- **ADR 031 à la lettre :** la même séquence pour les quatre familles ; récompenses uniques, idempotentes et traçables
  (un registre des gains) ; une revanche ne duplique rien ; posséder plusieurs Signatures n'en équipe qu'une.
- **États du joueur :** `remarqué`, `invité`, `affilié`, `chef` (ADR 029, M10), jamais confondus avec visite ou
  rencontre ; les quatre voies atteignables ; un refus ou une défaite au prologue ne bloque jamais la suite.
- **Rencontres de ville :** un directeur déterministe et sauvegardable (graine, disponibilité, délai narratif,
  prérequis), qui dépend des personnages, des lieux et de la progression ; pas d'interruption aléatoire à chaque pas ;
  séparé du moteur de déplacement et du moteur de combat.
- **Championnat :** une progression intéressante sans hausse systématique des statistiques (formats, adversaires,
  contraintes de deck, enjeux narratifs).
- **Aucun chiffre présenté comme décidé** hors ADR 029 à 031 : Puissances des neutres, nombre de lieutenants,
  attribution des variantes, etc. sont des **propositions**, chacune avec sa recommandation.
- **Fiche d'arbitrages** `docs/FICHE_ARBITRAGES_M10.md` : seulement les décisions **réellement indispensables** avant
  l'implémentation, chacune avec contexte, sources, option recommandée et raison, alternatives. La session principale
  en fera une fiche interactive pour le responsable.
- Un commit poussé par livrable (ou par paire), journal à jour.

**Porte vers la phase 2 :** les cinq documents et la fiche sont poussés, cohérents entre eux et avec les ADR 029 à 031.

## Phase 2 (environ 3 h) — Version jouable du prologue (mode Aventure, provisoire)

Construis le lot **M10-B** de ta feuille de route sur les paramètres **proposés** de ton avenant, en version
provisoire, derrière `?aventure=1` (l'entrée « Nouvelle aventure » n'apparaît qu'avec ce paramètre) :

- **Parcours :** Nouvelle aventure → la ville (le Quai) avec le deck de 16 neutres → duel public imprévu contre le
  rival → la foule, l'attention des familles → les invitations → **le choix libre** (Accepter, Différer, Chercher une
  autre voie ; les quatre voies atteignables) → affiliation confirmée → les quatre Basics de la famille → le premier
  défi de lieutenant disponible. Sauvegarde et reprise à chaque étape.
- **Architecture :** logique pure à part du rendu (`src/aventure/` : machine d'états de l'affiliation, registre des
  récompenses, directeur des rencontres, sauvegarde) ; réutilise la ville (îlots, rangs, bulles, entrée en duel),
  l'écran de duel, l'éditeur de deck et la collection. ADR 032 au statut **proposé** pour l'architecture du mode.
- **Cartes neutres dans le duel :** branche-les seulement si c'est possible **sans changer** les calculs du Clash, les
  conditions d'Amplification ni les secrets du mode standard (preuve : tests existants inchangés et verts, jeu par
  défaut identique au pixel près). Sinon, garde le parcours complet, fais jouer le duel du prologue avec un deck
  standard existant sous un bandeau « provisoire », et consigne le point bloquant dans la fiche.
- **Visuel :** la structure artistique validée s'applique d'elle-même par la ville existante. Hors QA, décors et
  personnages dessinés par code (images non approuvées) ; pour les captures, montre aussi la vue QA avec le diorama
  généré, marquée « non approuvé ». Aucune nouvelle image.
- **Vérifications :** tests unitaires de la logique (quatre voies atteignables ; refus et défaite sans blocage ; Basics
  seulement après confirmation ; variantes seulement aux victoires contre les lieutenants et pour des identités
  possédées ; Signature seulement à la victoire du chef ; idempotence au rechargement, à la reprise et en revanche ;
  une seule Signature équipée ; sauvegarde et reprise) ; jeu par défaut identique au pixel près contre le build de
  départ ; `qa:demo` vert ; typecheck, tests, build ; captures du parcours (1280 × 720 et 1920 × 1080). Campagne de QA
  complète seulement si du code du mode standard a changé (alors seule, environ 2 h).
- `docs/DEMO_JOUABLE.md` (ou un `docs/AVENTURE_PROVISOIRE.md`) : comment lancer et parcourir le prologue.

## Si le temps le permet (dans cet ordre)

1. Avancer le lot M10-C dans le prototype : défis des lieutenants (variantes), défi du chef (Signature), revanches sans
   duplication.
2. Le squelette du défi officiel d'une autre famille (Basics à l'engagement, ADR 031 §4).
3. Le directeur de rencontres de ville branché sur les îlots existants (deux ou trois rencontres non intrusives).
4. La liste des images et portraits dont M10 aura besoin (chefs, lieutenants, foule du prologue, Championnat), avec le
   budget estimé, dans le retour : **ne les demande pas**, le responsable décidera.

## Phase 3 (environ 30 min) — Fiche d'arbitrages et passation

- `docs/FICHE_ARBITRAGES_M10.md` à jour (phase 1, plus ce que la phase 2 a révélé).
- `docs/missions/RETOUR_SESSION_CLOUD_2026-10-20.md` sur le modèle du retour du 2026-10-19 : où en est le projet ; à
  faire en local ; ce que tu as choisi seul (à confirmer ou défaire) ; retour sur ce brief et sur l'environnement cloud ;
  suite proposée.
- `JOURNAL.md` : une passe par phase, honnête (`[OK]`, `[KO]`, `[?]`), « À reprendre » à jour ; `CLAUDE.md` et
  `AGENTS.md` : état de M10 (contrats proposés, prototype `?aventure=1`), M09 toujours en pause.
- Arrête tout serveur ou processus lancé ; termine par un résumé : fait, non fait, non vérifiable dans le cloud.

## Règles du run

- **Branche :** directement sur `main`. Avant chaque push : `git pull` (fusion, jamais de rebase de commits publiés),
  puis `git push origin HEAD:main`. Jamais de force-push. Si le push sur `main` est refusé, pousse ta branche, continue
  et signale-le en tête du résumé.
- **D'autres sessions poussent sur `main`** (des documents M10 y sont arrivés pendant la préparation de ce brief) :
  tire souvent ; si ton numéro de passe du journal est déjà pris, prends le suivant.
- **QA aux jalons seulement** (AGENTS) : ailleurs, typecheck, tests, build et vérifications ciblées.
- Si le temps manque, termine proprement la phase en cours (journal, commit, push) plutôt que d'en commencer une autre.

---

## Annexe A — Mission M10 du responsable (texte d'origine, fait foi)

RPGCards — M10 : structuration narrative et progression des Quatre Voies

Nous ouvrons maintenant le chantier M10 — Origines et ascension des Quatre Voies.

Le but est de construire le contrat narratif et la structure complète de progression de notre RPG de cartes, en
cohérence avec la ville développée dans M09 et le moteur de duel existant.

Travaille à partir du dernier `main` du dépôt `juniorbattle/RPGCards`.

Lis impérativement `AGENTS.md`, `CLAUDE.md`, `JOURNAL.md`, puis :

* `docs/missions/M10_ORIGINES_ASCENSION_QUATRE_VOIES.md`
* `docs/adr/029-recrutement-libre-des-quatre-voies.md`
* `docs/adr/030-cartes-neutres-quatre-copies-par-rang.md`
* `docs/adr/031-recompenses-ascension-familiale.md`

Examine également les contrats V3.0/V3.2/V3.3, la collection existante, le moteur de duel, les sauvegardes et
l'architecture urbaine M09.

**I — Notre nouvelle narration fondatrice**

Le joueur commence son aventure comme un simple duelliste de la populace.

Il possède exactement 16 cartes neutres, réparties en quatre exemplaires de chaque Rang I, II, III et IV.

Ces cartes sont blanches/grises, sans famille, bonus ni effet individuel. Elles représentent les cartes ordinaires
auxquelles un habitant de la ville peut avoir accès.

Un duel imprévu contre son rival attire une foule. Les Quatre Voies découvrent son talent et manifestent leur intérêt.

Le joueur conserve le choix définitif de sa famille d'accueil.

Il peut accepter une proposition, différer sa décision ou rechercher une autre famille. Aucune affiliation ne lui est
imposée.

**II — Progression dans la famille choisie**

Dès son affiliation confirmée, le joueur reçoit les quatre cartes Basic I–IV de sa famille.

Il peut alors défier les lieutenants de cette famille.

Chaque victoire de progression contre un lieutenant lui permet de gagner une variante d'une carte familiale qu'il
possède déjà.

Lorsqu'il réussit à vaincre le chef de cette famille, il obtient sa carte Signature ∞.

La Signature constitue la récompense majeure de cette étape.

**III — Défis contre les autres familles**

Devenu un duelliste reconnu, le joueur peut engager le défi des trois autres familles.

Pour chacune d'elles :

1. L'engagement officiel du défi donne les quatre cartes Basic I–IV de la famille.
2. Les victoires contre ses lieutenants donnent des variantes.
3. La victoire contre son chef donne sa carte Signature ∞.

Cette progression doit être identique et cohérente pour les quatre familles, indépendamment de celle choisie
initialement.

Les récompenses doivent rester uniques et traçables. Les revanches ne doivent pas permettre de dupliquer une carte déjà
gagnée.

Posséder plusieurs Signatures ne doit pas modifier arbitrairement la limite de Signature équipée dans un duel.

**IV — Le Championnat des Champions**

Après son ascension à travers les quatre familles, le joueur accède au Championnat des Champions.

Ce championnat réunit les meilleurs duellistes et constitue l'objectif narratif majeur de notre première aventure.

Il devra proposer une progression et des confrontations réellement intéressantes, sans s'appuyer artificiellement sur
une augmentation systématique des statistiques.

**V — Vie de la ville et rejouabilité**

Le joueur reste libre d'explorer les quartiers de notre ville HD-2D frontale 2.5D.

En parallèle de son ascension principale, il peut rencontrer des duellistes dans les rues, participer à des défis
facultatifs, obtenir des variantes grâce à des compétitions spéciales et être défié ponctuellement par son rival
récurrent.

Les rencontres doivent dépendre des personnages, des lieux et de la progression. Elles ne doivent pas devenir des
interruptions aléatoires excessives.

Préserve les systèmes d'îlots, de déplacements et les décors M09 déjà réalisés.

**VI — Consolider les règles du mode Aventure**

Notre mode Duel standard fonctionne avec 16 identités ordinaires et une Signature.

Le nouveau mode Aventure commence avec 16 cartes neutres et introduit progressivement les cartes familiales.

Avant toute modification du moteur, prépare un avenant technique M10-A couvrant :

* Puissance des neutres I–IV.
* Assaut, Garde et usage en Secondaire des cartes neutres.
* Accès aux Techniques pendant le prologue.
* Format du deck avant l'obtention de la première Signature.
* Remplacement progressif des cartes neutres par les Basics obtenues.
* Transition vers le deck familial complet de 17 cartes.
* Gestion de plusieurs Signatures possédées et d'une seule équipée.
* Attribution exacte des variantes et des récompenses.
* Sauvegarde, reprise, compatibilité avec les profils existants et replays.
* Équilibrage du duel inaugural, des lieutenants, des chefs et du Championnat.

Ne modifie pas les calculs de Clash, les conditions d'Amplification ou les secrets du moteur sans validation.

**VII — Travail attendu**

Je souhaite une conception narrative et technique suffisamment complète pour servir de base à une future
implémentation autonome.

Produis :

1. Le scénario détaillé du prologue et du recrutement.
2. L'organisation hiérarchique des quatre familles.
3. Le parcours de progression et les récompenses.
4. Le rôle narratif et l'évolution de notre rival.
5. La structure des rencontres et des événements de ville.
6. Le système de quêtes et de progression persistante.
7. L'avenant proposé pour les cartes neutres et le mode Aventure.
8. Une feuille de route d'implémentation M10-A à M10-F avec tests et conditions de validation.

Conserve les décisions déjà ratifiées dans les ADR 029, 030 et 031.

Les autres paramètres devront être présentés comme des propositions à arbitrer, et non comme des règles
automatiquement adoptées.

Tu disposes d'une autonomie importante pour proposer une architecture cohérente, réutiliser notre existant et
optimiser la future production.

Cette première mission concerne la structuration narrative et les contrats. Ne lance pas encore une refonte du moteur
de duel ni une production massive de décors.

Travaille conformément à la gouvernance Git actuelle, mets à jour le journal et fournis les documents complets ainsi
que les arbitrages réellement indispensables.

Notre objectif est de construire un RPG de cartes où le joueur part de rien, choisit sa voie, développe progressivement
sa collection, conquiert les quatre familles et devient le meilleur duelliste de la ville.
