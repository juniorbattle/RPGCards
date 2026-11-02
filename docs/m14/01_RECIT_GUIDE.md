# M14 — Contrat 1 : Promenade libre et Récit guidé

**Date :** 2026-11-01, révision 3 du 2026-11-02, fondus du même jour (§4 ter). **Statut : RÉVISION 3, APPLIQUÉE À TITRE PROVISOIRE.** Révision 2, demandée le
2026-11-01 : « plus simple, des transitions d'ecrans noir », « resteindre le deplacement libre et favoriser la mise en scene et
l'enchainement narrative et donc combat ». **Révision 3, retour du test du responsable (2026-11-02) :** « une structure
theatral/cinematiographique donc afficher principalement nos cutscenes runtime et non avoir une visiblite sur la ville dans son mode
promenade », avec, entre les cutscenes, chapitres et combats, « notre interface de preparation pour la suite » ; structure proposée, puis
« Oui, lance ». Fiche de M14 remplie le 2026-11-01 : §7 ; le contrat attend le test du responsable (R1). **Mandat :** `docs/missions/M14_DEUX_MANIERES_DE_VIVRE_LE_RECIT.md`. **ADR :** 048 (proposé).
**Code :** `src/aventure/guide.ts` (pur), `src/aventure/app.ts`.

## 1. Principes

- **Une seule aventure.** Mêmes faits, mêmes quêtes, mêmes duels, mêmes récompenses, même sauvegarde. Le mode change le
  chemin du joueur, jamais l'histoire. La machine de l'aventure (`appliquer`) ne le lit pas.
- **Promenade libre = le jeu d'aujourd'hui**, à l'identique : mode par défaut, celui de toute sauvegarde existante.
- **Récit guidé = un film en séquences.** La ville n'y est qu'un décor de scène : deux écrans seulement, la **scène** et la
  **Préparation**, séparés par le noir (§4). Ni marche, ni HUD, ni ville au repos tant que la trame a une suite.
- **Mode Aventure seulement.** Duel standard, démo et laboratoire ne changent pas. Depuis le 2026-11-01, l'adresse nue ouvre l'aventure (ADR 049, amendement 2).

## 2. Ce qui diffère

| | Promenade libre | Récit guidé |
|---|---|---|
| Entre deux événements | La ville, à pied | **Le noir, puis la Préparation** en plein écran, sans la ville (§4 bis) |
| Aller à l'objectif | À pied | **Une scène s'ouvre** près de l'événement, sortie du noir |
| Marche, HUD | Libres | **Coupés** tant que la trame a une suite |
| Rencontres en vue | Forcées | **Coupées** : les joueurs de rue restent visibles dans les scènes, sans duel |
| Kaï K1 à K6 | Au hasard du chemin, dans leur chapitre | **Passent avant l'objectif**, jamais manqués (§4) |
| Cinématiques du récit | Oui | **Oui**, les mêmes, et tout dialogue de personnage est cadré comme une scène |
| Duels de rue | À pied | **Par la Préparation** (§4 bis) |
| Épreuves, Joutes, revanches | À pied | **Par la Promenade libre**, en changeant de mode (§3) |
| Deck, journal, menu | Oui | Oui, réunis dans la Préparation ; le menu reste à Échap pendant une scène |

Après le titre et la main tendue de Kaï (K6), la trame n'a plus de suite : le HUD et la marche reviennent, même en Récit guidé.

## 3. Choisir et changer de mode

- **Choix** à la nouvelle aventure, sur l'écran du nom : deux boutons, Promenade libre présélectionnée.
- **Changement** à tout moment dans le menu (« Récit : promenade libre » ou « guidé »), sans perte. Pour aller chercher
  une Épreuve ou un duel de rue, le joueur repasse en Promenade libre le temps qu'il veut.
- **Sauvegarde :** champ facultatif `recit: 'guide'`, absent en Promenade libre, sur le modèle de `cinematiques`. Le format
  reste `aventure/2`, sans migration.
- **QA :** `?recit=guide` force le mode à la nouvelle aventure (avec `?qa=1`) ; sans lui, en QA, la Promenade libre.

## 4. Les séquences

**Une séquence** va d'une Préparation à la suivante :

```
Préparation → noir → scène(s) → duel → récompense → scène(s) de suite → noir → Préparation
```

**La règle de découpage.** Les scènes s'enchaînent seules tant que rien ne demande de se préparer ; la Préparation ne s'ouvre
qu'avant un duel de la trame (`enchainement`, pur).

| Ce qui vient ensuite | Enchaînement |
|---|---|
| Kaï au prologue, émissaire | **Scène** : le prologue se joue d'un seul tenant, du premier duel au choix de la voie |
| Salle des Bannières | **Scène** : elle ouvre le chapitre, l'engagement reste le choix du joueur |
| Kaï sans duel (K6) | **Scène** |
| Cadet, bras droit, chef | **Préparation** ; une séquence chacun, soit 12 pour les quatre familles |
| Plusieurs défis ouverts, voie à choisir | **Préparation** : le choix se fait sur l'écran |
| Championnat | **Préparation** avant chaque duel |
| Kaï avec duel (K1 à K5) | **Préparation** : elle annonce l'étape de la trame, et Kaï surgit à sa place au début de la séquence suivante ; retour ensuite à la Préparation. Un duel de Kaï perdu, à rejouer, est annoncé |

La **première Préparation** vient juste après l'affiliation : le dialogue du cadet ne s'ouvre plus à la suite de la cinématique,
il devient la scène de la séquence suivante.

**Pas de refus (2026-11-02, retour du test du responsable : « "pas maintenant" n'est pas necessaire dans le recit guide ») :** remettre
à plus tard sert à repartir en promenade. Le Récit guidé retire ces boutons (« Pas maintenant », « Plus tard », « Différer », « Refuser ») et
Échap ne quitte pas une scène ; un duel de rue choisi à la Préparation non plus. Reste un vrai choix du récit, « Chercher une autre voie »,
qui ramène à la Préparation et à la liste des émissaires. **Pas de fenêtre avant le duel** (« Commencer le duel ») : la Préparation et la scène ont tout dit.

**Le noir.** La scène finie, son dernier cadre reste à l'écran le temps d'une respiration, bandes comprises, puis le noir se ferme ;
aucun quartier ne se voit au repos. Le noir reste fermé au retour d'un duel et sous la reprise. La scène s'ouvre en sortant du noir, le
joueur devant le personnage (point d'apparition `npc-<id>`) ; si le quartier a changé, son nom s'affiche d'abord sur le noir. La première
arrivée dans un quartier joue sa cinématique de lieu, puis la scène. Les fenêtres (récompense, confirmation, Salle des Bannières)
s'ouvrent sur un fond opaque. Mouvement réduit et temps figé : sans fondu.

**Le cadre.** Tout dialogue d'une scène est cadré sur son personnage et le joueur, avec les bandes, premier plan posé sous le
noir. Les bandes restent du premier cadre sorti du noir au retour au noir, sans repli entre deux scènes. Les cinématiques coupées dans le menu coupent aussi ce cadre : le dialogue s'ouvre alors sur la vue ordinaire de la scène.

**La scène (2026-11-02, même retour : « on a encore acces a un visuel de la ville comme si on etait en promenade libre ») :**
- **Un plateau vide :** ni passants, ni repères « ! » et « ? », seulement les personnages de la scène (`Town.plateau`). Le prologue et le
  titre gardent leur foule, sans passants. Le premier plan placé entre la caméra et eux s'efface.
- **Une mise en place :** le joueur à 1,5 m de son vis-à-vis, tous deux face à face, jamais de dos (`enPlace`).
- **Aucun plan large :** la première arrivée dans un quartier est un plan serré sur les façades (`plansArriveeRecit`), sans retour au cadrage
  ordinaire ; le chapitre s'annonce sur le noir ; une scène s'ouvre sur un lent travelling avant. Seule exception : le Championnat et le titre gardent leur grand plan.
- **Une seule musique :** celle du récit, de la Préparation aux scènes, sans changer de morceau à chaque quartier ; jamais le combo du Fanal.

**Ce qui vient ensuite** (`suiteRecit`, pur) :
1. **Kaï, s'il est dû.** Un événement K se perd après son chapitre et n'a lieu que dans certains quartiers
   (`evenementRival`) : le Récit guidé va dans un de ces quartiers et le fait surgir, par le code d'aujourd'hui. Exception :
   jamais deux duels de suite contre Kaï (contrat 2 de M11).
2. **Sinon, l'étape de la trame** (`etapeRecit`), pendant de `objectif`, en **parité testée** :
   - une personne : Kaï au prologue, l'émissaire, la figure à défier ;
   - **un choix du joueur**, jamais tranché à sa place : l'affiliation (liste des quatre émissaires), plusieurs défis
     ouverts (liste des figures) ;
   - la Salle des Bannières, pour engager la prochaine famille : son écran reste celui d'aujourd'hui ;
   - le Championnat : le héraut de la Grande Cour, ou la porte de l'arène sans Grande Cour.

## 4 bis. La Préparation (fiche M14, G1 et G2 ; remplace la Halte)

Demande du responsable : « une interface specifique au recit guide » pour gérer le deck, les réglages et faire des duels contre
les joueurs de rue, « semblable a notre premier interface de selection de combat » ; révision 3 : « notre interface de preparation
pour la suite ».

- **Un écran plein et opaque**, sans la ville derrière, qui s'ouvre seul entre deux séquences et à la reprise (« Continuer »). Il
  tient en une page : le chapitre, la voie, les PV ; **« À suivre »** (portrait, nom, quartier, objectif, PV adverses) et le grand
  bouton **« Suite du récit ▸ »**, au doigt comme à la souris, et par Entrée ou Espace ; ou, pour un choix, une carte par personne ; les
  **joueurs de rue** ; Deck, Journal et Menu (aussi à Échap). Musique du récit, sans ambiance de quartier.
- **Les joueurs de rue listés** sont ceux de la Promenade libre : mêmes rencontres, mêmes disponibilités par chapitre, même
  tempérament annoncé, mêmes duels (`duelFacultatif`). Choisir l'un d'eux : écran noir, le joueur devant lui, sa scène s'ouvre,
  puis le duel. Le duel gagné ou perdu est compté comme à pied.
- **Une fois par chapitre** : un joueur de rue affronté quitte la liste jusqu'au chapitre suivant, comme le repos
  de la Promenade libre (contrat 1 de M11, V4). La Préparation ne devient pas un lieu d'entraînement sans fin.
- **Hors de la Préparation, rien ne change** : la trame ne dépend d'aucun duel de rue, et la Préparation ne compense rien.

## 4 ter. Les fondus (retour du test du responsable, 2026-11-02 : « trop brutales », « rendre le jeu smooth »)

Pour tout le jeu d'aventure, Promenade libre comprise ; le Duel standard et le duel lui-même ne changent pas. Durées : `FONDUS`, `src/aventure/rideau.ts`.

- **Un seul rideau noir** (`Rideau`), une seule courbe, qui repart de là où il en est. On ne change d'écran que sous le noir : titre, ville, Préparation, duel, résultat. Fermeture 620 ms, un souffle de 180 ms, ouverture 900 ms ; d'un quartier à l'autre en marchant, 420 et 560 ms.
- **Le noir se lève sur une image prête :** quartier chargé, plateau peint, premier plan d'une cinématique posé.
- **Autour d'un duel :** le dernier coup respire 650 ms, puis le noir se ferme sur le plateau encore visible ; le résultat est écrit tout de suite et monté derrière lui.
- **Écrans de l'enveloppe, dialogues, fenêtres :** fondu enchaîné (`fantomeEcran`, `effacer`) ; une réplique qui en suit une autre garde son cadre, seul le texte change. La Préparation monte par étages.
- **Caméra :** amorti en ressort critique (`amortir`, `src/ville/cameras.ts`), qui part et s'arrête en douceur. Une coupe dans une image visible passe par le noir, et « Passer » aussi.
- **Sans mouvement** (mouvement réduit, temps figé) : aucun de ces fondus, comme avant.

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
- **Tests purs :** `enchainement` ; sur le parcours complet, la Préparation n'arrive qu'avant un duel ou un choix.
- **Tests purs (`test/fluidite.test.ts`) :** l'amorti part et s'arrête en douceur, ne dépasse jamais sa cible, sur aucune image longue.
- **Navigateur (`tools/m14-fluidite.mjs`) :** une sonde lit chaque image et compte les coupures visibles : écran, dialogue, fenêtre, noir, caméra.
- **Navigateur (`tools/m14-recit-guide.mjs`, `tools/m14-preparation.mjs`) :** ni ville ni HUD entre deux scènes, prologue d'un seul tenant, première Préparation après l'affiliation, Kaï qui interrompt, refus, choix, duel de rue, reprise, changement de mode, retour de la marche après le titre.

**Mobile :** le Récit guidé est pensé pour le doigt, mais le jeu mobile paysage reste différé (M04). M14 ne l'ouvre pas.

## 7. Choix provisoires, pour la fiche de M14

| Entrée | Point | Choix appliqué |
|---|---|---|
| **G1** | Rythme | **Révisé (révision 3)** : les scènes s'enchaînent seules, un clic sur « Suite du récit » à la Préparation, avant chaque duel de la trame (§4, §4 bis) |
| **G2** | Écarts à la trame | **Tranché** : duels de rue par la Préparation ; Épreuves et Joutes par la Promenade libre |
| **G3** | Garde-fou | **Gardé** : seuil de 40 % de victoires à la mesure, avant toute proposition de PV |
| **G4** | Noms | **Gardés** : « Promenade libre » et « Récit guidé » |
