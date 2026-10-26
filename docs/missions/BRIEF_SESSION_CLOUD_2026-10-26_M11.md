# Brief — session cloud RPGCards : M11, un monde qui réagit (rencontres en vue, rival, progression des PNJ, dialogues, IA, son) (2026-10-26)

**Statut :** **validé par le responsable le 2026-10-26** (« Je valide le brief M11 : pousse-le sur main et lance la
session cloud dès que la fiche de finalisation est consignée. »).
**Départ :** le dernier `main` au lancement (au moins `dae60f1`, journal passe 140).
**Durée prévue :** un run long, de l'ordre de 8 à 10 heures. **Mode autonome** (ci-dessous).

Le jeu est complet de bout en bout dans ses grandes lignes : le mode Duel standard (RC 0.8), les règles V3.3 (avenants
07 et 08, reçus), le mode Aventure du prologue au titre (`?aventure=1`, RC `0.10.0-rc.1` reçue, M10 clos) et la ville
en rangs avec ses six îlots, ses PNJ et ses images approuvées (M09 finalisé, jalon vert sur les deux GPU). **M11 rend ce
monde vivant et réactif**, sur tous les fronts qui avancent le jeu vers sa version finale : narration, gameplay, IA et
son. Texte du responsable : annexe A (il fait foi).

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
  d'Aseprite, pas de GPU réel ni de Windows, pas d'écoute réelle du son. Les mesures de fluidité, l'écoute des sons et
  toute production d'images vont dans « à faire en local » du retour, sans les inventer.

## Ce qui est déjà décidé (ne le rediscute pas)

- **Décisions de principe du responsable pour M11 (2026-10-26, annexe A) :**
  1. **Rencontres « en vue », à la manière de Pokémon :** un PNJ joueur de cartes qui a le joueur **dans son champ de
     vision** vient vers lui et **force le duel**. Les PNJ joueurs de cartes sont des rencontres **répétées** de
     l'aventure : on peut les affronter de nouveau.
  2. **Le rival est un événement fixe et déterminé**, comme dans Pokémon : il **apparaît d'un coup** à des moments
     écrits de la trame pour défier le joueur (et non plus seulement au hasard du directeur).
  3. **Tout le monde progresse avec le joueur**, dans les dialogues comme au jeu de cartes, avec de **meilleures
     stratégies** : un PNJ passif peut devenir agressif ou plus vicieux, et ainsi de suite.
  4. **Les dialogues sont à optimiser** : ceux des PNJ pendant le parcours et ceux de la narration.
  5. **L'IA de combat est à améliorer** si elle peut mieux jouer.
  6. **Le son entre dans le jeu** : effets sonores (sfx) et ambiance.
- **Combat :** règles V3.0, delta V3.2, V3.3 (avenants 07 et 08 et amendement 1, étiquette `V3.0+delta-V3.3.2`),
  moteur et secrets (ADR 011). Avenant de l'aventure `contracts/06_AVENANT_M10A_MODE_AVENTURE.md` et son annexe de
  calibrage `docs/m10/CALIBRAGE_M10A.md` (validée, amendée).
- **Narration et progression :** ADR 029 à 032 et 034, contrats de `docs/m10/` (contrat narratif, progression et
  récompenses, ville et rencontres), M10 clos et reçu.
- **Ville :** caméra frontale 2.5D (ADR 024), îlots (ADR 025), HD-2D stylisé et quartiers en rangs (ADR 028 et ses
  amendements), feuilles de personnages (ADR 027), registre des approbations `art-src/approbations.json`.
- **Décisions de la fiche de finalisation de la ville** (<https://claude.ai/artifact/WtuBiKyjVKVrkNEXb1rFpX>, remplie le
  2026-10-26, consignée dans le journal avant le lancement) : la vie des deux quartiers et le jalon reçus ; l'heure de
  ville « non intrusive : garder » ; les 4 images gardées en réserve ; **M09 clos** ; **les deux Observatoires à
  trancher dans la structure narrative** ; suite : **la structure narrative de bout en bout, contrat d'abord, puis
  lots**. M11 porte cette suite : le contrat 4 de la phase 1 en est le contrat, et il tranche (en proposition) la
  question des deux Observatoires.

## Limites dures du run

- **Règles du duel inchangées.** Aucun calcul du Clash, aucune condition d'effet, aucune règle d'engagement ne change
  sans avenant ratifié. Améliorer l'IA, c'est mieux choisir parmi les coups permis, **jamais** lire les choix secrets de
  l'adversaire : l'IA ne voit que sa vue publique (`PlayerView`), comme aujourd'hui.
- **Mode Duel standard inchangé par défaut.** Les profils d'IA actuels gardent leur comportement par défaut : les
  replays et empreintes standard restent identiques, les tests existants du moteur passent sans modification. Une IA
  plus forte entre comme **nouveau niveau ou nouvelle option** (utilisée par l'aventure et ses paliers) ; son extension
  au Duel standard est une **proposition** de la fiche, avec ses mesures.
- **Jeu par défaut au repos identique au pixel près** (`tools/l5-identique.mjs`). Le réglage du son vit dans un menu ou
  un panneau existant, pas sur l'écran d'accueil au repos.
- **Annexe de calibrage validée :** ne change pas ses valeurs de toi-même. La progression des PNJ (décision 3) se fait
  par les mécanismes existants (paliers, decks, profils d'IA, chapitres) ; si elle demande d'autres valeurs, mesure-les
  et propose-les dans la fiche, avec la valeur en vigueur laissée par défaut.
- **Images :** aucune image générée (le cloud n'a pas de clé) ; **aucun drapeau d'approbation changé** (registre et
  manifestes). Les 4 images de réserve de M09 restent en réserve. Pour un nouveau besoin visuel (une bulle « ! » au-dessus
  d'un PNJ qui repère le joueur, par exemple), dessine-le **par code**, dans le style du jeu.
- **Son : synthétisé par code** (Web Audio, procédural), comme l'art est « code-first » : **aucun fichier son externe**,
  aucune bibliothèque audio ajoutée sans nécessité (préfère l'API du navigateur). Le son démarre après un geste du
  joueur (règles des navigateurs), il a un volume général et une coupure, mémorisés ; il est **coupé en QA** (paramètre
  d'URL ou option des outils) pour que les parcours restent déterministes.
- **Sauvegardes :** les profils de la RC 0.8, les parties du Duel standard et les aventures de la RC `0.10.0-rc.1`
  doivent toujours se charger ; versionne l'emplacement de l'aventure et migre sans rien détruire.
- **Sources de référence en lecture seule :** `source/`, `contracts/`, `simulator_ref/`. Un avenant proposé va dans
  `docs/m11/`, pas dans `contracts/`.
- **Écriture épicène, sans point médian** (ARB-M10-11), dans tous les textes du jeu et des documents.
- Aucun secret commité ; aucune image, police ou son externe au runtime.

## Lecture obligatoire (phase 0, environ 20 min)

`AGENTS.md` (entier), puis l'état courant de `JOURNAL.md` (passes 119 à 140 surtout), `CLAUDE.md`, ce brief, puis :
`docs/m10/CONTRAT_NARRATIF_M10.md`, `docs/m10/VILLE_RENCONTRES_EVENEMENTS.md`, `docs/m10/PROGRESSION_ET_RECOMPENSES.md`,
`docs/m10/CALIBRAGE_M10A.md`, l'avenant 06, les avenants 07 et 08, les ADR 011, 032 (et ses amendements), 035 et 036 ;
le rapport `docs/RAPPORT_RC_AVENTURE.md` ; le code : `src/aventure/` (surtout `directeur.ts`, `rencontres.ts`,
`paliers.ts`, `faits.ts`, `modele.ts`, `aventure.ts`), `src/ville/` (marche, rangs, îlots), `src/game/ai/policy.ts` et
`memory.ts`, `src/presentation/rivalLines.ts`, `src/presentation/personalities.ts`, `src/product/encounters.ts`.

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
  documents du dépôt font foi. Tu ne peux pas publier de fiche interactive : écris la fiche en Markdown (phase 7), la
  session principale la publiera.

## Phase 1 (environ 1 h) — Cadrage M11, proposé

Sous `docs/m11/` (avec un `README.md` d'index), des contrats **proposés**, courts et testables :

1. **Rencontres en vue** : champ de vision d'un PNJ dans la ville en rangs (direction du regard, portée, rangs et
   obstacles qui le coupent), ce qui déclenche l'approche (bulle « ! », le PNJ vient au joueur par un chemin praticable,
   la marche du joueur est suspendue), dialogue d'ouverture, duel forcé ; ce qui se passe après une victoire ou une
   défaite ; revanches (quand un PNJ battu peut redéfier : chapitre suivant, temps de repos en battements) ; aucun
   déclenchement pendant une scène, un dialogue ou une transition ; un moyen d'éviter un PNJ en restant hors de sa vue.
   Lien avec le directeur des rencontres (il pose les PNJ, la vue déclenche le duel) et avec les rencontres facultatives
   existantes (ADR 032).
2. **Le rival en événements fixes** : les moments écrits où Kaï apparaît d'un coup (par chapitre et par lieu, après
   quels faits), sa mise en scène (entrée, réplique, duel), ce que devient « l'ombre de Kaï » actuelle, les défaites et
   les reprises.
3. **Progression des PNJ** : chaque PNJ récurrent a un **tempérament par chapitre** (passif, franc, agressif, vicieux,
   etc.), qui règle son profil d'IA, son deck (paliers) et ses répliques ; ce qui le fait évoluer (chapitre, faits,
   victoires ou défaites contre le joueur) ; tableau des PNJ et de leur trajectoire.
4. **Dialogues** : un système de répliques par personnage et par état (chapitre, faits, relation, résultat du dernier
   duel), sans répétition immédiate, avec des variantes ; règles d'écriture (voix de chaque famille, épicène, longueur
   d'une bulle) ; la narration de bout en bout (du prologue au titre : chaque scène a son texte, ses transitions et ses
   rappels).
5. **IA de combat** : audit de `policy.ts` (ce qu'elle évalue, où elle se trompe, ce qu'elle ignore), puis les
   améliorations prévues, leurs niveaux et la façon de les mesurer.
6. **Son** : liste des sons (interface, cartes, Clash et dégâts, annonce de Signature, victoire et défaite, pas,
   bulle « ! », entrée du rival, ambiance de chaque îlot et du duel), principes de synthèse, mixage, réglages.

Puis une feuille de route M11-A à M11-F (une étape par phase ci-dessous) et une ADR « proposé » pour chaque choix
structurant. Commit et push à la fin de la phase.

## Phase 2 (environ 2 h) — Rencontres en vue et rival en événements fixes

Implémente les contrats 1 et 2 dans l'aventure : calcul pur et déterministe du champ de vision (testé en unitaire),
approche du PNJ, bulle « ! » dessinée par code, dialogue d'ouverture, duel forcé, état après le duel, revanches ; le
rival aux moments écrits. Garde le directeur pur et déterministe (ses tests existants passent ; ajoute les nouveaux).
Un parcours au navigateur (ajouté à `qa:aventure` ou nouveau `qa:vue`) : un PNJ repère le joueur, vient, le duel
s'ouvre ; le joueur qui passe hors de la vue n'est pas arrêté ; Kaï surgit au moment écrit.

## Phase 3 (environ 1 h 30) — Progression des PNJ

Les tempéraments par chapitre (contrat 3) branchés sur les profils d'IA, les paliers de decks et les répliques ; un PNJ
battu au chapitre I qui revient plus fort et plus vicieux au chapitre III, par exemple. Tests : la trajectoire de chaque
PNJ récurrent, de chapitre en chapitre ; mesures de difficulté par palier (`npm run sim`, `tools/m10a-paliers.ts`)
comparées à l'annexe de calibrage, sans changer ses valeurs.

## Phase 4 (environ 1 h 30) — Dialogues

Le système de répliques (contrat 4) et la réécriture des dialogues : PNJ de la ville, membres des familles, lieutenants,
chefs, rival, héraut, rumeurs, scènes de la trame. Vérifie l'enchaînement de bout en bout du prologue au titre (le
parcours complet automatisé de M10-F) et qu'aucune réplique ne se répète deux fois de suite. Relis tout en écriture
épicène sans point médian.

## Phase 5 (environ 1 h 30) — IA de combat

Les améliorations du contrat 5, comme nouveaux niveaux ou options (par exemple : meilleure évaluation de la Garde sous
la V3.3, usage de l'annonce et de la révision, gestion des Techniques et de l'Insight, mémoire des habitudes du
joueur, anticipation d'un tour). Elles ne lisent que la vue publique. Mesures IA contre IA sur les mêmes graines (nouveau
niveau contre profils actuels ; taux de victoire, longueur des duels) ; branchement sur les tempéraments « agressif » et
« vicieux » de l'aventure. **Le Duel standard garde ses profils actuels** (empreintes identiques) : l'extension est une
proposition de la fiche, chiffrée.

## Phase 6 (environ 1 h 30) — Son

Un module audio synthétisé par code (contrat 6) : les effets de l'interface, du duel (pose, révélation, Clash, dégâts,
Garde qui absorbe, annonce de Signature, victoire, défaite), de la ville (pas, bulle « ! », entrée du rival) et une
ambiance par îlot et pour le duel ; volume général, coupure, mémorisés ; coupé en QA. Tests unitaires de ce qui se teste
sans écouter (déclenchement des bons sons sur les bons événements, coupure, réglages). L'écoute réelle va dans « à faire
en local ».

## Phase 7 (environ 30 min) — Fiche d'arbitrages et passation

- `docs/FICHE_ARBITRAGES_M11.md` : chaque décision prise seule, chaque proposition (IA plus forte en Duel standard,
  valeurs de calibrage, tempéraments, rival), avec contexte, recommandation et alternatives ; la session principale en
  fera une fiche interactive.
- `docs/missions/RETOUR_SESSION_CLOUD_2026-10-26.md` sur le modèle du retour du 2026-10-20 : où en est le projet ; à
  faire en local (écoute du son, jalon GPU, mesures de fluidité) ; ce que tu as choisi seul ; retour sur ce brief et
  sur l'environnement cloud ; suite proposée.
- `JOURNAL.md` : une passe par phase, honnête (`[OK]`, `[KO]`, `[?]`), « À reprendre » à jour ; `CLAUDE.md` et
  `AGENTS.md` : encadré « M11 — état au 2026-10-26 ».
- Arrête tout serveur ou processus lancé ; termine par un résumé : fait, non fait, non vérifiable dans le cloud.

## Si le temps le permet (dans cet ordre)

1. Une campagne de QA complète, **seule**, en rendu logiciel : jeu par défaut au pixel près, `qa:demo`, `qa:aventure`,
   `qa:maison`, `qa:voies`, `qa:vivante`, `qa:championnat`, le parcours complet de l'aventure, puis `qa:browser`,
   `qa:product`, `qa:rc`, `qa:techniques` (et les nouveaux parcours de M11).
2. Les revanches et les tempéraments étendus aux PNJ de passage (non récurrents).
3. L'aide du jeu et le tour guidé mis à jour pour les rencontres en vue et le son.

## Règles du run

- **Branche :** directement sur `main`. Avant chaque push : `git pull` (fusion, jamais de rebase de commits publiés),
  puis `git push origin HEAD:main`. Jamais de force-push. Si le push sur `main` est refusé, pousse ta branche, continue
  et signale-le en tête du résumé.
- **D'autres sessions peuvent pousser sur `main`** : tire souvent ; si ton numéro de passe du journal est déjà pris,
  prends le suivant.
- **Validation de chaque unité :** `npm run typecheck`, `npm test`, `npm run build`, plus une vérification ciblée au
  navigateur quand le rendu change. **QA complète aux jalons seulement** (AGENTS).
- Si le temps manque, termine proprement la phase en cours (journal, commit, push) plutôt que d'en commencer une autre.

---

## Annexe A — Demande du responsable (2026-10-26, texte d'origine à l'orthographe près, fait foi)

> Nous allons préparer une session cloud afin que l'agent puisse travailler de manière autonome et avancer vers la fin
> de notre jeu complet, tout semble bien en place, il va falloir optimiser nos dialogues durant notre parcours dans le
> jeu avec nos npc et aussi ceux liés à la narration, le npc joueur de cartes seront souvent des interactions
> répétitifs dans l'aventure et donc on pourra les affronter. j'aimerais m'inspirer de pokemon avec cette possibilité
> que les npcs peuvent venir vers vous (si dans votre champ de vision) pour forcer un combat et notre rival sera des
> événements fixes et déterminés comme dans pokemon donc il apparaît d'un coup pour défier le joueur, donc il faut
> s'attendre aussi que durant le jeu tout le monde autour progresse aussi bien dans les dialogues que dans le jeu de
> cartes avec de meilleures stratégies, un npc passif par le passé peut devenir agressif ou plus vicieux et ainsi de
> suite. peut-être faudrait aussi optimiser l'IA dans sa manière de jouer pendant un combat si ce n'est pas fait bref
> une grosse session cloud de plusieurs heures à prévoir, je veux que l'agent travaille sur tous les aspects possibles
> pour avancer sur le jeu narration, gameplay, sons sfx
