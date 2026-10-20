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

## Alternatives écartées

- **Réutiliser l'enveloppe standard (`Shell`)** en lui donnant une autre source de données : refonte du code du mode
  standard, campagne de QA complète requise, risque pour `lqv.save` ; écarté pour le prototype.
- **Neutres dans le moteur dès maintenant** : demande de toucher au fichier du Clash (A-2) ; interdit sans ratification.
