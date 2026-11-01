# M14 — Contrat 1 : Promenade libre et Récit guidé

**Date :** 2026-11-01. **Statut : PROPOSÉ, à valider par le responsable avant tout code.**
**Mandat :** `docs/missions/M14_DEUX_MANIERES_DE_VIVRE_LE_RECIT.md`. **ADR :** 048 (proposé).
**S'appuie sur :** `docs/m11/07_CINEMATIQUES.md` (dont il amende la durée, §4), `docs/m11/01_*` et `02_*` (rencontres en
vue, Kaï), `docs/m10/CALIBRAGE_M10A.md` (inchangée).

## 1. Principes

- **Une seule aventure.** Mêmes faits, mêmes quêtes, mêmes duels, mêmes récompenses, même sauvegarde. Le mode change le
  chemin du joueur, jamais l'histoire. Il ne s'inscrit dans aucun fait (`appliquer` ne le lit pas).
- **Promenade libre = le jeu d'aujourd'hui**, à l'identique. C'est le mode par défaut, celui de toute sauvegarde existante.
- **Le Récit guidé montre la ville.** Le trajet passe par des plans joués dans la scène : le joueur marche, les rues
  défilent, les passants vivent. Aucune vidéo, aucune image, aucun son ajouté.
- **Mode Aventure seulement.** Duel standard, démo, laboratoire et jeu par défaut au repos ne changent pas.

## 2. Ce qui diffère

| | Promenade libre | Récit guidé |
|---|---|---|
| Aller à l'objectif | À pied | **« Suite du récit »** : traversée en cinématique, puis la scène démarre |
| Rencontres en vue | Forcées | **Coupées** : les joueurs de rue restent visibles et ne forcent rien |
| Défier un joueur de rue | En lui parlant, ou forcé | En lui parlant (facultatif) |
| Marche libre | Oui | **Oui**, à tout moment |
| Kaï K1 à K6, cinématiques du récit | Oui | **Oui**, la traversée passe par lui (§5) |
| Épreuves, Joutes, revanches | Ouvertes | Ouvertes, à pied, **jamais sur la route** |

## 3. Choisir et changer de mode

- **Choix** à la nouvelle aventure, sur l'écran du nom : deux cartes, Promenade libre présélectionnée.
- **Changement** à tout moment dans le menu (« Récit : promenade libre » ou « guidé »), sans perte : le mode n'est qu'un
  réglage de cette aventure.
- **Sauvegarde :** champ facultatif `recit: 'guide'`, absent en Promenade libre, sur le modèle de `cinematiques`. Le format
  reste `aventure/2`, sans migration.
- **QA :** `?recit=guide` force le mode ; sans lui, en QA, la Promenade libre.

## 4. La traversée

**Geste.** Dans la ville, le bandeau d'objectif porte un bouton **« Suite du récit ▸ »** (et sa touche). Il n'y a pas
d'enchaînement automatique : entre deux étapes, le joueur garde la main pour son deck, son journal ou une balade.

**Déroulé**, en trois temps au plus, chacun une cinématique ordinaire (`Cinema`, bandes, « Passer ») :
1. **Départ :** le joueur marche vers la sortie du quartier ou vers son but, caméra un peu élargie.
2. **Traversée :** à chaque changement de quartier, un plan d'établissement par un travelling sur le rang où il arrive
   (le plan de `plansArrivee`), le fondu de `voyager` entre les deux.
3. **Arrivée :** il marche jusqu'à son but, la caméra cadre les deux personnages (`cadrageDuo`), la scène s'ouvre.

**Durées.** Amendement du contrat 7 (« 0,5 à 5 s ») pour ce seul usage : chaque plan **au plus 5 s**, une traversée
entière **au plus 12 s**. Un trajet long n'est pas filmé en entier : le montage coupe. Dans le même quartier, seuls les
temps 1 et 3 existent.

**Toujours passable.** « Passer » (ou Échap, Espace, Entrée) met le joueur à son but et ouvre la scène.

**Cas particuliers :**
- **Première arrivée dans un quartier :** sa cinématique de lieu et son carton **remplacent** le temps 2, sans double
  plan ; elle se joue une fois par aventure, comme aujourd'hui.
- **Cinématiques coupées** (`lqv.cine`, ou en QA sans `?cine=1`) : le fondu de `voyager`, puis la scène.
- **Mouvement réduit :** des coupes franches, tenues gardées. **Temps figé :** tout se résout tout de suite.
- **Pendant la traversée,** comme pour toute cinématique, le monde attend : ni repérage, ni entrées du joueur.
- **Interruption** (sortie, retour au menu) : la sauvegarde garde le dernier point de voyage, comme aujourd'hui. La
  traversée n'écrit rien tant qu'elle n'est pas arrivée, à part la `visite` ordinaire de chaque quartier.

## 5. La prochaine étape

`cibleRecit(e)` (nouveau module pur `src/aventure/guide.ts`) répond à la même question que `objectif(e)`, mais en lieu et
en personne : `{ ilot, sujet, action }`. Il est écrit à côté de `objectif` et **une parité testée** vérifie que tout
objectif affiché a sa cible, pour les quatre familles et tous les ordres de voies.

**Kaï passe en premier.** Un événement K se perd s'il n'a pas lieu dans son chapitre, et n'a lieu que dans certains
quartiers (`evenementRival`). Si un événement est dû et que le joueur n'est pas dans un de ses quartiers, la cible est le
plus proche de ces quartiers. Il surgit au point de décision de l'arrivée, par le code d'aujourd'hui ; le Récit guidé
reprend ensuite vers l'objectif.

**Là où le joueur décide**, la traversée attend son choix, elle ne décide jamais pour lui :
- **Affiliation :** liste des émissaires ; choisir transporte vers celui-ci. Refuser, différer, en voir un autre restent
  possibles.
- **Prochaine famille :** elle mène à la Salle des Bannières, dont l'écran reste celui d'aujourd'hui.
- **Plusieurs défis ouverts :** liste des figures, la plus proche en premier.
- **Championnat :** le héraut de la Grande Cour.
- **Après le titre** (`champion`) : le bouton disparaît, la ville reste à parcourir.

## 6. La marche du joueur

Il n'existe aujourd'hui ni marche scénarisée du joueur ni recherche de chemin : `walkNpc` va en ligne droite, le clic au
sol aussi (`stepWalker`), et les rangs ne communiquent que par leurs passages.

- **`Town.walkPlayer(to, vitesse, face)`** : symétrique de `walkNpc`, entrée du joueur verrouillée, résolue tout de suite
  en temps figé.
- **`itineraire(ilot, de, vers)`** (pur, `guide.ts`) : parcours d'une grille sur `blocked`, simplifié en quelques points.
  Le chemin entre quartiers vient du graphe des `exits`, limité aux quartiers ouverts.

## 7. L'entraînement

**Décision du responsable : aucune compensation d'office.** L'annexe de calibrage ne change pas. Dans les deux modes, un
combat mené à son terme donne +3 PV, défaite comprise.

**Dernière mesure** (`artifacts/qa/v33/a1/comparaison.md`, IA contre IA, avant les 48 variantes) : sans entraînement,
chefs 45 à 48 %, Championnat 48 à 49 % ; avec, chefs 64 à 90 %, Championnat 87 à 88 %.

**Garde-fou.** La mesure de la voie directe est refaite au lot M14-C, sur les règles et le catalogue actuels.
- Si **toutes les figures et le Championnat restent à 40 % ou plus** : rien ne change.
- **En dessous de 40 %** à une étape : proposition au responsable de **PV de plus à la victoire d'un combat narratif**,
  réservés au Récit guidé, valeurs mesurées à l'appui. Rien n'est posé sans son ordre, qui amenderait l'annexe.

**Variantes I et II :** elles viennent des Épreuves et des Joutes, facultatives, donc le Récit guidé ne les donne pas sur
sa route. Le journal des quêtes les signale, comme aujourd'hui. Les duels de rue ne donnent pas de carte.

## 8. Garanties et preuves

- **Promenade libre inchangée :** jeu par défaut au repos identique au pixel près ; `qa:vue`, `qa:aventure`, `qa:voies`
  verts sans changement.
- **Tests purs (`test/m14.test.ts`) :** parité `cibleRecit` / `objectif` sur tous les parcours ; itinéraires valides dans
  les six quartiers (aucun point bloqué, tout objectif atteignable depuis chaque point d'apparition) ; Kaï jamais manqué en
  Récit guidé ; sauvegarde relue sans le champ et avec ; `peutForcer` faux en Récit guidé.
- **Navigateur (`tools/m14-recit-guide.mjs`) :** parcours complet du prologue au titre en Récit guidé, pour une famille au
  moins, avec K1 à K6 ; même parcours avec « Passer » à chaque traversée ; changement de mode en cours d'aventure, dans
  les deux sens ; captures de traversée en 1280 et 1920.
- **Coût :** les traversées mesurées sur les deux GPU au prochain jalon (Radeon libre).

## 9. Lots

| Lot | Contenu | Preuve |
|---|---|---|
| **M14-A** | `guide.ts` (`cibleRecit`, `itineraire`), champ `recit`, `peutForcer` | Tests purs, aucun rendu changé |
| **M14-B** | `walkPlayer`, traversée, bouton, listes de choix, écran du nom, menu | Parcours navigateur, pixel près |
| **M14-C** | Mesure de la voie directe, réglages de durée, fiche d'arbitrages | Mesures, fiche publiée |

## 10. À valider par le responsable

| Entrée | Point | Proposition |
|---|---|---|
| **G1** | Rythme | Un clic sur « Suite du récit » entre deux étapes, pas d'enchaînement automatique |
| **G2** | Marche en Récit guidé | Toujours permise, défis de rue seulement à la demande du joueur |
| **G3** | Durée d'une traversée | 12 s au plus, plans de 5 s au plus |
| **G4** | Garde-fou de l'entraînement | Seuil de 40 % de victoires à la mesure, avant toute proposition de PV |
| **G5** | Noms | « Promenade libre » et « Récit guidé » |
