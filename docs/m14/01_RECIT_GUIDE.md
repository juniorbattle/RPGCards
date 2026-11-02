# M14 — Contrat 1 : Promenade libre et Récit guidé

**Date :** 2026-11-01. **Statut : RÉVISION 2, APPLIQUÉE À TITRE PROVISOIRE** (révision demandée par le responsable le même
jour : « plus simple, des transitions d'ecrans noir », « resteindre le deplacement libre et favoriser la mise en scene et
l'enchainement narrative et donc combat », utile notamment sur mobile). Fiche de M14 remplie le 2026-11-01 : §7 ; le contrat attend le test du
responsable (R1). **Mandat :** `docs/missions/M14_DEUX_MANIERES_DE_VIVRE_LE_RECIT.md`. **ADR :** 048 (proposé).
**Code :** `src/aventure/guide.ts` (pur), `src/aventure/app.ts`.

## 1. Principes

- **Une seule aventure.** Mêmes faits, mêmes quêtes, mêmes duels, mêmes récompenses, même sauvegarde. Le mode change le
  chemin du joueur, jamais l'histoire. La machine de l'aventure (`appliquer`) ne le lit pas.
- **Promenade libre = le jeu d'aujourd'hui**, à l'identique : mode par défaut, celui de toute sauvegarde existante.
- **Récit guidé = la trame en enchaînement.** Le déplacement libre y est restreint au profit de la mise en scène, de la
  narration et des combats.
- **Mode Aventure seulement.** Duel standard, démo, laboratoire et jeu par défaut au repos ne changent pas.

## 2. Ce qui diffère

| | Promenade libre | Récit guidé |
|---|---|---|
| Aller à l'objectif | À pied | **« Suite du récit »** : écran noir, puis la scène s'ouvre près de l'événement |
| Marche | Libre | **Coupée** tant que la trame a une suite |
| Rencontres en vue | Forcées | **Coupées** : les joueurs de rue restent visibles, sans duel |
| Kaï K1 à K6 | Au hasard du chemin, dans leur chapitre | **Passent avant l'objectif**, jamais manqués (§4) |
| Cinématiques du récit | Oui | **Oui**, les mêmes |
| Duels de rue | À pied | **Par la Halte**, entre deux étapes (§4 bis) |
| Épreuves, Joutes, revanches | À pied | **Par la Promenade libre**, en changeant de mode (§3) |
| Deck, journal, menu | Oui | Oui, réunis dans la Halte |

Après le titre, la trame n'a plus de suite : le bouton disparaît et la marche revient, même en Récit guidé.

## 3. Choisir et changer de mode

- **Choix** à la nouvelle aventure, sur l'écran du nom : deux boutons, Promenade libre présélectionnée.
- **Changement** à tout moment dans le menu (« Récit : promenade libre » ou « guidé »), sans perte. Pour aller chercher
  une Épreuve ou un duel de rue, le joueur repasse en Promenade libre le temps qu'il veut.
- **Sauvegarde :** champ facultatif `recit: 'guide'`, absent en Promenade libre, sur le modèle de `cinematiques`. Le format
  reste `aventure/2`, sans migration.
- **QA :** `?recit=guide` force le mode à la nouvelle aventure (avec `?qa=1`) ; sans lui, en QA, la Promenade libre.

## 4. La suite du récit

**Geste.** En Récit guidé, un grand bouton **« Suite du récit ▸ »** en bas de l'écran, au doigt comme à la souris, et par
Entrée ou Espace. Entre deux étapes, le joueur garde ainsi la main pour son deck, son journal ou son menu : il n'y a pas
d'enchaînement automatique.

**Transition.** Le fondu au noir de `voyager`, qui existe déjà. Le joueur se retrouve devant le personnage (point
d'apparition `npc-<id>`, celui du retour d'un duel), le nom du quartier s'affiche s'il a changé, et la scène s'ouvre seule.
Dans le même quartier, la transition est la même. La première arrivée dans un quartier joue sa cinématique de lieu, puis la
scène. Mouvement réduit et temps figé : `voyager` les gère déjà. Aucune marche filmée, aucune recherche de chemin.

**Ce qui vient ensuite** (`suiteRecit`, pur) :
1. **Kaï, s'il est dû.** Un événement K se perd après son chapitre et n'a lieu que dans certains quartiers
   (`evenementRival`) : le Récit guidé va dans un de ces quartiers et le fait surgir, par le code d'aujourd'hui. Exception :
   jamais deux duels de suite contre Kaï (contrat 2 de M11).
2. **Sinon, l'étape de la trame** (`etapeRecit`), pendant de `objectif`, en **parité testée** :
   - une personne : Kaï au prologue, l'émissaire, la figure à défier ;
   - **un choix du joueur**, jamais tranché à sa place : l'affiliation (liste des quatre émissaires), plusieurs défis
     ouverts (liste des figures), avec « Plus tard » ;
   - la Salle des Bannières, pour engager la prochaine famille : son écran reste celui d'aujourd'hui ;
   - le Championnat : le héraut de la Grande Cour, ou la porte de l'arène sans Grande Cour.

Refuser une scène (« Pas maintenant », « Différer ») est toujours possible : le bouton la repropose.

## 4 bis. La Halte (fiche M14, G1 et G2)

Demande du responsable : « une interface specifique au recit guide » pour gérer le deck, les réglages et faire des duels contre
les joueurs de rue, « semblable a notre premier interface de selection de combat ».

- **Un écran entre deux étapes**, ouvert par le bouton « Halte » du HUD et réservé au Récit guidé. Il tient en une page :
  ce qui attend (« Suite du récit », le même clic que G1), les **joueurs de rue** en cartes, puis Deck, Journal et Menu.
- **Les joueurs de rue listés** sont ceux de la Promenade libre : mêmes rencontres, mêmes disponibilités par chapitre, même
  tempérament annoncé, mêmes duels (`duelFacultatif`). Choisir l'un d'eux : écran noir, le joueur devant lui, sa scène s'ouvre,
  on peut encore refuser. Le duel gagné ou perdu est compté comme à pied.
- **Une fois par chapitre** : un joueur de rue affronté quitte la liste jusqu'au chapitre suivant (un refus ne compte pas), comme le repos
  de la Promenade libre (contrat 1 de M11, V4). La Halte ne devient pas un lieu d'entraînement sans fin.
- **Hors de la Halte, rien ne change** : la trame ne dépend d'aucun duel de rue, et la Halte ne compense rien.

## 5. L'entraînement

**Décision du responsable : aucune compensation d'office.** L'annexe de calibrage ne change pas. Dans les deux modes, un
combat mené à son terme donne +3 PV, défaite comprise.

**Garde-fou.** Si une figure ou le Championnat tombe sous 40 % à la mesure, proposition au responsable de **PV de plus à la
victoire d'un combat narratif**, réservés au Récit guidé. Rien n'est posé sans son ordre, qui amenderait l'annexe.

**Mesure du 2026-11-01** (`artifacts/qa/m14/voie-directe.md`, règles et catalogue actuels, IA contre IA) : sans
entraînement, chefs 45,0 à 47,8 %, Championnat 48,0 à 49,2 %. **Seuil non atteint : aucune compensation.** Le Récit guidé
fait aussi les duels de Kaï K1 à K5, que la mesure ne compte pas : 15 PV de plus en fin de parcours.

**Variantes I et II :** elles viennent des Épreuves et des Joutes, facultatives, donc le Récit guidé ne les donne pas sur
sa route. Le journal des quêtes les signale. Les duels de rue ne donnent pas de carte.

## 6. Garanties et preuves

- **Promenade libre inchangée :** aucun parcours d'avant M14 ne change ; jeu par défaut au repos identique au pixel près.
- **Tests purs (`test/m14.test.ts`) :** parité `etapeRecit` / `objectif` et personnage trouvé dans un quartier, sur les
  parcours des quatre familles et les ordres des voies ; K1 à K6 jamais manqués ; sauvegarde avec et sans le champ.
- **Navigateur (`tools/m14-recit-guide.mjs`) :** marche coupée, transition, scène ouverte, Kaï, choix, changement de mode.

**Mobile :** le Récit guidé est pensé pour le doigt, mais le jeu mobile paysage reste différé (M04). M14 ne l'ouvre pas.

## 7. Choix provisoires, pour la fiche de M14

| Entrée | Point | Choix appliqué |
|---|---|---|
| **G1** | Rythme | **Tranché, gardé** : un clic sur « Suite du récit » entre deux étapes, et la Halte (§4 bis) |
| **G2** | Écarts à la trame | **Tranché** : duels de rue par la Halte ; Épreuves et Joutes par la Promenade libre |
| **G3** | Garde-fou | **Gardé** : seuil de 40 % de victoires à la mesure, avant toute proposition de PV |
| **G4** | Noms | **Gardés** : « Promenade libre » et « Récit guidé » |
