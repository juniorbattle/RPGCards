# ADR 032 — Architecture du mode Aventure (prototype `?aventure=1`) (M10)

**Date :** 2026-10-20 (session cloud autonome, brief M10). **Statut : APPROUVÉ par le responsable le 2026-10-20** (fiche M10, S5 : « Garder (ADR 032 approuvé) » ; l’aventure se branche sur le Quai en quatre rangs dès M10-A, ARB-M10-12) ; à l’origine : PROPOSÉ, prototype provisoire ; à confirmer ou
défaire par le responsable (fiche `docs/FICHE_ARBITRAGES_M10.md`).

## Contexte

La mission M10 demande une progression narrative (prologue, recrutement libre, ascension dans les quatre familles,
Championnat) sur le moteur de duel existant, sans changer le mode Duel standard ni le jeu par défaut, et sans toucher au
Clash avant la ratification d'un avenant (M10-A). Le brief du 2026-10-20 demande une version jouable du prologue derrière
`?aventure=1`, logique pure à part du rendu, réutilisant la ville M09, l'écran de duel, les cartes.

## Décision proposée

1. **Un module à part, chargé à la demande** : `src/aventure/` ; `main.ts` n'y entre qu'avec `?aventure=1` (import
   dynamique) : le bundle du jeu par défaut ne contient rien de l'aventure, et son rendu reste identique au pixel près.
2. **Logique pure, sans DOM ni rendu ni stockage** (testée par `test/aventure.test.ts`) :
   - `modele.ts` : données (neutres, maisons, figures structurantes, Kaï du prologue) ;
   - `registre.ts` : **registre des gains** à clés uniques (idempotence, traçabilité) et collection **dérivée** ;
   - `deck.ts` : règle de deck **R-AV** (16 cartes, 4 par Rang, neutres pour compléter, 0 ou 1 Signature), remplacement
     des neutres par les Basics, passage au format standard, **deck de prêt** du prototype ;
   - `aventure.ts` : **machine d'états** (scènes, états des familles `remarqué` / `invité` / `affilié` / `défiée` /
     `chef`, affiliation confirmée, défis structurants, engagement officiel) qui reçoit des **faits** ;
   - `faits.ts` : faits **publics** d'un duel (aucun secret, ADR 011) ;
   - `directeur.ts` : **directeur des rencontres** déterministe à battements narratifs ;
   - `quetes.ts` : quêtes **dérivées** des faits (aucun état de quête stocké) ;
   - `sauvegarde.ts` : sauvegarde **à part** (`lqv.aventure`, `aventure/1`, secours, mise à l'écart, version future
     refusée) ; `lqv.save` n'est jamais lue ni écrite ;
   - `ilots.ts` : îlots M09 **copiés** sans leurs personnages de démo, avec ceux du directeur.
3. **Enveloppe propre à l'aventure** (`app.ts`, `styles.ts`) : écran titre, création, ville, dialogues, confirmation,
   préparation, résultat, récompenses, deck et collection, journal. Elle réutilise sans les modifier : `createTown`
   (ville, caméra frontale, dioramas et feuilles sous leurs politiques d'approbation), `promptBubble`, `DuelSession` (duel
   inchangé), `cardEl`, `ensureArena` (lieux de duel), `verifyActiveCore` (reprise exacte par rejeu et hash).
   L'enveloppe du jeu standard (`src/shell/`) n'est pas utilisée : elle reste liée à `lqv.save` et à la progression de
   prototype M05, que l'aventure ne doit pas toucher.
4. **Points de contact minimes avec le code existant** (sans effet hors aventure) : `AppParams.aventure` ; une branche
   de `main.ts` ; l'option `ilotDefOf` de `createTown` (îlots par îlot, lue à chaque montage ; absente : comportement
   inchangé) ; l'apparence `player-gris` des marcheurs (tenue grise du duelliste sans famille ; aucun autre identifiant
   touché).
5. **Duels du prototype** (avenant A-0) : `GameConfig` ordinaires du moteur, avec decks de prêt et bandeau
   « provisoire », tant que l'ARB-M10-02 (neutres en duel) n'est pas tranché.

## Conséquences

- Le prototype est jouable du prologue au premier défi de lieutenant, et au-delà (bras droit, chef, défi officiel des
  autres familles, Épreuves et Joutes, Championnat en squelette, rival et duels de rue facultatifs : `competitions.ts`) ;
  tout est provisoire.
- Quand l'avenant M10-A sera ratifié, seuls `deck.ts` (`siegePret` → deck explicite), `rencontres.ts` et le moteur
  (A-11) changent ; la machine, le registre, le directeur et la sauvegarde restent.
- Coût : un second jeu d'écrans (l'enveloppe de l'aventure) à entretenir ; acceptable tant que le mode Aventure n'est
  pas le jeu par défaut. Une fusion avec l'enveloppe standard est à décider avec M10-F.

## Amendement 1 (2026-10-20, lot M10-A, passes 78 et 79)

- Les duels jouent le **deck d'aventure tel quel** (deck explicite, ADR 033) : le deck de prêt disparaît ; un duel de
  l'aventure porte le catalogue `…+4n` et se reprend par `verifierDuel` (rejeu et empreinte), le contrôle du mode
  standard n'acceptant que son catalogue.
- **Paliers et PV** (avenant M10-A, AV-08) : `paliers.ts` (pur) donne l'adversaire de chaque duel selon son rôle et le
  **niveau** du joueur (familles reçues) ; l'état de l'aventure compte les **combats** menés à terme (`combats`, champ
  ajouté au schéma `aventure/1`, retrouvé dans l'historique pour une sauvegarde plus ancienne) ; les PV du joueur en
  dérivent (`pvJoueur`). Valeurs proposées, à valider (`docs/m10/CALIBRAGE_M10A.md`) ; la simulation
  (`tools/m10a-paliers.ts`) lit le même module que le jeu.

## Amendement 2 (2026-10-20, lot M10-A, passe 81) : le Quai en quatre rangs (ARB-M10-12)

- Le Quai de l'aventure est **le Quai en quatre rangs** du laboratoire (`QUAI_PROFOND_DEF`, manifeste
  `manifest-profondeur.json`), réutilisé tel quel (M09 en pause) : `ilotAventure(id, poses, quaiRangs)` en retire les
  personnages du laboratoire et y pose ceux du directeur.
- Il n'existe qu'en diorama : l'aventure **décide avant de construire la ville** (`quaiEnRangs` : tous les plans admis par
  la politique et lisibles) ; sinon, l'ancien Quai en bande, dessiné par code, **en secours** (jamais de mélange). Hors QA,
  le secours vaut tant que les images ne sont pas approuvées (A2 puis A1) ; aucun statut `approved` n'est changé.
- Chaque place du Quai a sa position dans les rangs et, quand elle diffère, sa position de secours (`bande`) ; les
  balises des passages sont des repères (aucun dialogue) ; la place de la Halle, la placette du Puits et la cour de la
  Chapelle ont leur texte.

## Amendement 3 (2026-10-20, lot M10-C, passes 84 et 85) : éditeur de deck, Collection, chefs

**Reçu par le responsable le 2026-10-20** (fiche du lot M10-C : E1 « Reçu » ; E2 : les cartes à gagner restent grisées et
lisibles dans la Collection).

- **Éditeur case par case** (`deck.ts` : `choixPourCase`, `remplacerCase`, `basculerTechnique`) : une case n'accepte que
  ce qui garde la forme R-AV (même Rang, identité absente des autres cases et possédée, neutres dans la limite de celles
  possédées) ; le deck reste légal par construction, `validerDeckAv` reste le contrôle final avant l'enregistrement.
- **Écran Collection** (`collection.ts`, module pur) : vue **dérivée** du registre et de l'état, sans autre source ;
  chaque carte possédée porte l'origine de son gain, chaque carte manquante la manière de la gagner (rien n'est caché).
- L'écran « Deck et collection » (`app.ts`) a trois onglets : Deck, Collection, Registre des gains ; « Enregistrer et
  fermer » écrit la sauvegarde comme avant.
- Les chefs portent leurs identités V2 (ADR 034).

## Amendement 4 (2026-10-20, lot M10-D, passes 88 et 89) : la Salle des Bannières et l'engagement officiel

**Reçu par le responsable le 2026-10-20** (fiche du lot M10-D <https://claude.ai/artifact/X2z6EuQJDLHdNGe1Cvps4g> : E1 « Reçu » ; D2 : engager une famille dont on a déjà les Basics ne change pas le deck).

- **Salle des Bannières** (porte de la salle de jeu de cartes, sur le Quai, en rangs comme en secours) : un écran à quatre
  bannières, une par famille, chacune avec son état lu dans la machine (`bannieres` : famille d'accueil, défi à engager,
  défi engagé avec le prochain défi, chef vaincu, ou fermé avec sa raison). C'est le seul lieu qui engage un défi : entrer
  dans un quartier, parler à un membre ou battre l'un d'eux dans la rue n'engage rien (ADR 031 §4).
- **Écran de confirmation de l'engagement**, sur le modèle de celui de l'affiliation (ADR 029 §3) : ce qui est remis ou
  **déjà possédé**, ce que devient le deck (cartes grises avant et après, format standard atteint), la suite (lieutenants
  et leurs enjeux, Épreuve, Joute), ce qui ne change pas. Son contenu vient de `apercuEngagement`, qui applique le fait **à
  blanc** dans la machine : l'écran ne peut pas annoncer autre chose que ce qui sera fait.
- **Basics déjà reçues** (affiliation quittée avant le premier lieutenant, AV-07) : l'engagement passe la famille à
  `défiée` sans rien remettre ni toucher au deck ; l'écran de récompense le dit (aucune carte, la raison).
- Le format standard (17 cartes, aucune carte grise, une Signature : AV-04) est annoncé à l'engagement qui l'atteint et
  dans l'éditeur de deck (`standardLegal`).
- Journal : la quête principale « Les trois voies » (PROGRESSION §6.2), ouverte au chef de la famille d'accueil vaincu ;
  l'étape « défi officiel engagé » d'une voie se lit dans l'état de la famille, plus dans le registre.
- Parcours au navigateur jusqu'aux quatre chefs : `npm run qa:voies` (`tools/m10d-voies.mjs`).

## Amendement 5 (2026-10-21, reprise de M09, passe 93 ; ratifié par le responsable, fiche de la reprise, R5, passe 97) : la ville en rangs

- La décision de l'amendement 2 s'étend à **toute la ville en rangs** (ADR 028, passe 93) : le Quai, le Parvis et les
  Ruelles en quatre rangs, et la Grande Cour. `villeEnRangs` (au lieu de `quaiEnRangs`) : les dioramas des quatre îlots
  admis par la politique (contrôle pur du manifeste `MANIFESTE_RANGS`), ceux du Quai lisibles ; sinon la ville
  d'aujourd'hui, dessinée par code, **en secours, d'un seul tenant** (jamais un îlot en rangs à côté d'un îlot en bande).
  Le champ public `quaiRangs` garde son nom (crochets de QA).
- Les places des rencontres du Parvis et des Ruelles sont au rang 1, inchangé : elles tiennent dans les deux villes
  (test). Les sorties suivent l'îlot affiché (`ilotBase(...).exits`) : le cœur de chaque quartier mène à la Grande Cour
  (« dans la Grande Cour, au cœur de la ville »), où le directeur ne pose encore personne (M10-E).

## Amendement 6 (2026-10-21, lot M10-E, passe 99 ; ratifié par le responsable, fiche du lot M10-E, R1, passe 103) : le directeur dans la ville en rangs

- Une place de rencontre peut n'exister que dans la ville en rangs (`PlaceRencontre.rangs` : rangs du fond, Grande Cour) ;
  le directeur ne la tire et ne la pose que si la ville en rangs est affichée. Les places nouvelles s'ajoutent en fin de
  liste (l'indice sauvegardé reste valable).
- Le quota du rival se compte par chapitre de la trame (`chapitreDetaille` : I à V), et l'ombre de Kaï n'est tirée
  qu'après le premier battement du chapitre (`debuts`) ; aucun personnage n'est tiré dans un îlot où il est déjà posé.
- Un refus laisse le personnage jusqu'au point de décision suivant, puis il repart (`partants`) ; « Continuer » n'est
  pas un point de décision (la ville se relit). Champs facultatifs : les sauvegardes antérieures se relisent.

## Amendement 7 (2026-10-21, lot M10-E, passe 100 ; ratifié par le responsable, fiche du lot M10-E, R2, passe 103) : le Championnat dans la logique pure et la Grande Cour

- Les contraintes d'une manche du Championnat (la manche en cours, la Signature changée à chaque duel de poule et
  différente pour chaque victoire, la Signature changée entre deux manches de la Finale) sont vérifiées par
  `appliquer` : un fait qui les enfreint est refusé et l'état ne change pas ; l'écran ne fait que les montrer.
- Le Miroir lit les familles des Primaires révélées par le joueur (publiques, rangées dans l'historique des duels) ; la
  Tenante équipe la Signature de son plan public à chaque manche ; aucun PV ni aucune Puissance ne change.
- Dans la ville en rangs, le héraut du Tournoi (Grande Cour) ouvre le Championnat, en mène les duels et en proclame le
  titre ; la porte de l'arène reste une entrée (et la seule dans la ville d'aujourd'hui).

### Lectures du contrat ratifiées (fiche du lot M10-E, 2026-10-21, passe 103)

Le responsable a retenu l'option recommandée pour chacune (<https://claude.ai/artifact/RF1NNces82oGupjz9WXE3w>) ; le code les suivait déjà, rien ne change :

- **D1, la poule** : « la Signature équipée doit changer à chaque duel » se lit « différente de celle du duel précédent,
  gagné ou perdu, et différente pour chaque victoire » (`statutPoule`).
- **D2, le Miroir** : seize identités au format standard ; les deux familles dominantes du joueur et celle de l'adversaire
  en variantes, les autres en Basics, sa Signature (`deckMiroir`) ; Kaï, ou pour la Cendre le bras droit de la première
  famille dominante d'une autre maison.
- **D3, la Finale** : le plan public de la Tenante est l'Astre, puis le Voile, puis la Cendre (`PLAN_TENANTE`).
- **D4, la Finale** : l'éditeur de deck reste libre entre deux manches (seul le changement de Signature est vérifié).
- **D5, les PV** : les champions gardent 110 (poule et Miroir) et 120 (Finale), selon le calibrage validé.
- **D6, l'ombre de Kaï** : jamais tirée dans l'îlot où Kaï est posé, permise dans un autre (un ou une duelliste de la
  Cendre a donc aussi l'ombre de son rival).
- **D7, la cérémonie** : l'ouverture et la proclamation restent en texte ; les chefs se poseront sur l'estrade avec les
  feuilles des PNJ de la ville (P2).

## Alternatives écartées

- **Réutiliser l'enveloppe standard (`Shell`)** en lui donnant une autre source de données : refonte du code du mode
  standard, campagne de QA complète requise, risque pour `lqv.save` ; écarté pour le prototype.
- **Neutres dans le moteur dès maintenant** : demande de toucher au fichier du Clash (A-2) ; interdit sans ratification.
