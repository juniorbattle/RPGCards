# Brief — session cloud RPGCards, 6 heures en autonomie (2026-10-19)

**Commanditaire :** le responsable, validé en séance le 2026-10-19. **Exécutant :** une session cloud, seule et sans
interlocuteur pendant 6 heures : ne pose pas de question (personne ne répondra). Décide dans les limites de ce brief ;
ce qui les dépasse va dans la fiche d'arbitrages (phase 3) et tu continues le reste.

**Objectif :** optimiser la structure actuelle et s'approcher d'une version démo (release candidate du combat), puis,
si le combat est sain, ouvrir la conception de la ville d'exploration HD-2D (cadrage et laboratoire de caméra).

## Mode autonome (prioritaire sur tout le reste du brief)

Le responsable a précisé : « je ne validerai rien durant ces 6 prochaines heures, donc il faut que la session soit la
plus autonome possible ». En conséquence :

- **Ne t'arrête jamais pour attendre une validation** et ne pose aucune question : personne ne répondra pendant 6 heures.
- **Face à une décision**, prends l'option la plus réversible et la plus conforme aux contrats ; consigne-la (journal,
  ADR « proposé » si elle est structurante, fiche d'arbitrages) et continue. Une décision prise seule reste
  **provisoire** jusqu'à la fiche.
- **Face à un blocage** (outil indisponible dans le cloud, test instable, accès refusé) : contourne s'il existe un
  contournement sûr, sinon consigne en `[KO]` avec la raison exacte et passe à l'étape suivante. Un blocage ne doit
  jamais immobiliser le run.
- **Ne laisse jamais le temps inoccupé** : si une phase finit plus tôt, passe à la suivante ; s'il reste du temps à la
  fin, prends la liste « Si le temps le permet » plus bas.
- Les seules limites dures sont celles des « Règles du run » (règles du duel, secrets, branche, dépôt de référence en
  lecture seule, aucune image externe au runtime). Le reste se décide.
- Pas de génération d'images dans le cloud (la clé OpenAI n'existe qu'en local) : les références visuelles se font par
  code et par captures.

## Lecture obligatoire (phase 0, ≈ 15 min)

`CLAUDE.md`, `AGENTS.md` en entier, `JOURNAL.md` (en-tête, « À reprendre », passes 28 à 35), `README_START_HERE.md`,
`contracts/00_GOUVERNANCE_AUTORITE.md`, `docs/missions/M08_CONSOLIDATION_DU_COMBAT.md` (lot **C5**),
`docs/missions/M09_VILLE_EXPLORATION_HD2D.md`, ADR 004, 014, 021, 022, 023.

Mise en route : `npm ci` ; Chromium pour les outils de QA (`npx playwright-core install chromium`, puis
`CHROMIUM_PATH=<chemin>`). Si un outil de navigateur ne peut pas tourner dans le cloud, consigne-le en `[KO]` avec la
raison exacte et continue avec typecheck, tests et build.

## Contraintes de l'environnement cloud (documentation officielle, vérifiée le 2026-10-19)

- **Garde ton tour actif jusqu'à la fin du run.** Une session cloud inactive se met en pause au bout de quelques
  minutes et sa machine peut être récupérée : les commandes de fond et les sous-agents en cours sont alors perdus.
  Ne termine pas ton tour pour « attendre » quelque chose.
- **Commandes longues :** une commande au premier plan s'arrête au bout de 2 minutes par défaut (10 minutes au
  maximum, paramètre `timeout`). Pour les campagnes de QA plus longues, lance-les en arrière-plan et surveille-les
  activement jusqu'à leur fin, ou découpe-les.
- **Pousse souvent** : tout ce qui n'est pas poussé peut être perdu si la machine est récupérée.
- **Réseau :** npm est accessible ; le téléchargement de Chromium par Playwright et le clonage d'un autre dépôt
  dépendent du niveau d'accès réseau de l'environnement. En cas de refus, consigne le message exact et applique les
  replis prévus.
- Ni les règles globales du responsable ni ses compétences personnelles ne sont disponibles ici : ce brief et les
  documents du dépôt font foi.

## Phase 1 (≈ 3 h) — Release candidate 0.8 du combat (M08 C5) et optimisations vers la démo

Dans cet ordre, avec un commit poussé par étape :

1. **« Duels de la ville » dans la rue** : `venue: 'rue'` pour `TOWN_DUELS` (`src/product/encounters.ts`) ; vérification
   ciblée (le duel PNJ s'ouvre dans la rue, rien d'autre ne change).
2. **Retrait du rendu V1 des personnages** (décision du 2026-10-19) : supprimer `?qa=1&figure=v1`, le chemin V1 du rig et
   des portraits, ses tests et ses outils devenus inutiles ; garder ce que le V2 réutilise. Preuve : rendu par défaut
   (V2) **identique au pixel près** avant / après (quatre rivaux, PNJ, portrait du joueur, Rencontres).
3. **Contraste du rang « II »** des vignettes de l'éditeur de deck : renforcer le contour ou le fond du chiffre pour
   viser ≥ 5:1 dans le conteneur (marge pour le rendu des polices sous Windows, mesuré à 3,5:1 sur le poste du
   responsable).
4. **Optimisations vers une démo**, sans nouvelle fonctionnalité de jeu, sans changer les règles ni le rendu validé :
   - mesurer le démarrage à froid (chargement jusqu'à l'accueil interactif, puis jusqu'au premier duel) et la taille du
     bundle (≈ 0,89 Mo en un seul fichier) ; découper (Three.js à part, écran de duel chargé à la demande…) **seulement
     si le gain est mesuré** ;
   - supprimer le code mort, notamment celui libéré par le retrait du V1 ;
   - parcourir la démo comme un nouveau joueur (accueil → deck → rencontre → duel → résultat → retour) : corriger les
     petites frictions (texte, ordre, état vide, erreur console) ; consigner les grosses dans le rapport ;
   - tout changement visible : captures avant / après ; tout ce qui ne doit pas changer : identité au pixel près.
5. **Version `0.8.0-rc.1`** (`package.json`, `src/product/version.ts` et son test ; migration de sauvegarde seulement si
   le schéma change).
6. **Campagne de QA complète (jalon)** sur le build final : `npm run typecheck`, `npm test`, `npm run build`,
   `qa:browser`, `qa:product`, `qa:rc` (lieu par défaut, puis bar et arène imposés comme en passe 33),
   `qa:techniques`, contraste des écrans. Les **mesures GPU réelles (Radeon 780M, RTX 4060)** et le contraste **sous
   Windows** ne sont pas faisables dans le cloud : marque-les « à faire en local » dans le rapport, sans les inventer.
7. **Rapport `docs/RAPPORT_RC_0_8.md`** sur le modèle de `docs/RAPPORT_M06_RC.md` : fonctions, campagne, performance
   (SwiftShader, non représentative d'un GPU), défauts corrigés, connu / à faire, arbitrages restants. Journal, ADR si
   besoin, commit, push.

## Porte : « le combat est sain »

Passe à la phase 2 seulement si l'étape 6 est verte et qu'aucun défaut bloquant connu ne reste dans le duel. Sinon,
corrige le combat, consigne et arrête-toi là : M09 attendra.

## Phase 2 (≈ 2 h 30) — Ville d'exploration : cadrage et laboratoire de caméra (M09 V0 et V1)

1. **Référence Cité du Tournoi** (autorisée par le responsable, voir M09) : clone en lecture seule
   `https://github.com/juniorbattle/RPG-ArtByCode` **hors du dépôt** (par exemple `../ref-rpg-artbycode`). N'y pousse
   rien. S'il n'est pas accessible depuis le cloud, consigne-le et travaille avec le résumé de DA de M09.
2. **V0 — cadrage** `docs/M09_CADRAGE_VILLE.md` : zones (ville, quartiers, liaisons), déplacements, entrée en duel
   (rivaux, PNJ, lieux ADR 022), place des quatre lieux existants, fil du Tournoi du Quai, boucle de démo cible, budget.
3. **V1 — laboratoire de caméra**, à part du jeu (`?ville=1` ou page dédiée ; jeu par défaut inchangé au pixel près) :
   un îlot « le Quai la nuit » construit par code dans la DA de Cité du Tournoi (indigo / ardoise, pierre froide, ambre
   seul accent chaud, ivoire désaturé, accessoires aux points focaux) ; **deux caméras** basculables par paramètre,
   **vue de dessus inclinée** (perspective, ≈ 40–55°) et **frontale 2.5D** (≈ 10–20°, plans de profondeur) ; un
   personnage générique (socle V2 / gabarit PNJ, ADR 021 et 023) qui marche au clavier, avec collisions simples.
   **Ne reprends pas** le graphe de caméras de Cité du Tournoi. Captures comparables des deux caméras (1280×720 et
   1920×1080), coût mesuré (SwiftShader), **ADR 024 au statut « proposé »** avec ta recommandation argumentée.
4. **V2 provisoire si le temps le permet** : après V1, commence la première zone jouable (déplacement, collisions,
   un ou deux PNJ génériques à défier, entrée dans un lieu de duel existant et retour) **sur la caméra que tu
   recommandes**, toujours à part du jeu, avec la caméra isolée derrière une interface pour que l'autre option reste
   branchable sans réécriture. Écris-le clairement : la caméra n'est pas décidée, V2 est provisoire.

## Si le temps le permet (dans cet ordre)

1. Avancer V2 (ci-dessus) jusqu'à une boucle complète : ville → duel → retour.
2. Tests unitaires de la logique pure de la ville (déplacement, collisions, zones, déclencheurs de duel).
3. Mesures de démarrage et de rendu du prototype (SwiftShader) et allègements évidents.
4. Petites dettes du rapport de la RC 0.8 qui ne changent ni les règles ni le rendu validé.

## Phase 3 (≈ 30 min) — Fiche d'arbitrages et passation

- `docs/FICHE_ARBITRAGES_M09.md` : une entrée par décision ouverte (au minimum : caméra d'exploration, structure des
  zones, entrée en duel depuis la ville, intégration du prototype au jeu, échéance d'Aseprite pour les personnages clés,
  et tout ce que la RC a laissé ouvert), chacune avec contexte, sources, captures, **option recommandée et raison**,
  alternatives.
- `JOURNAL.md` : une passe par phase, honnête (`[OK]` / `[KO]` / `[?]`), « À reprendre » à jour ; `AGENTS.md` et
  `CLAUDE.md` si le mandat actif change.
- Arrête tout serveur ou processus lancé ; termine par un résumé : fait, non fait, non vérifiable dans le cloud.

## Règles du run

- **Branche :** développement directement sur `main` (règle du responsable). Avant chaque push : `git pull` (fusion, jamais
  de rebase de commits publiés), puis `git push origin HEAD:main`. Jamais de force-push. Si le push sur `main` est
  refusé, pousse ta branche, continue et signale-le en tête du résumé.
- **QA aux jalons seulement** (AGENTS) : campagne complète à l'étape 6, ailleurs typecheck, tests, build et
  vérifications ciblées.
- Aucune règle du duel ne change (V3.0, delta V3.2, D-01 ratifié en V3.3), aucune fuite de secret (ADR 011), aucune
  image ni police externe au runtime, aucun secret commité.
- Le dépôt RPG-ArtByCode est une référence en lecture seule ; seules la DA et des techniques adaptées (source notée)
  entrent dans RPGCards.
- Si le temps manque, termine proprement la phase en cours (journal, commit, push) plutôt que d'en commencer une autre.
