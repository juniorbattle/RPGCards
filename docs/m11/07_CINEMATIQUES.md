# M11 — Contrat 7 : cinématiques runtime

**Date :** 2026-10-26. **Statut : PROPOSÉ.** La demande vient du responsable, après la session M11 : « ajouter des
cinématiques runtimes pour optimiser certains passages de gameplay ». **Code :**
- `src/aventure/cinematiques.ts` (pur : plans, cartons, réglage) ;
- `src/aventure/cinema.ts` (déroulé : bandes, minuterie, « Passer ») ;
- `Town.cadrer` (`src/ville/ville.ts`) ;
- `CameraRig.update(…, tuning)` (`src/ville/cameras.ts`).

ADR 043. **Première porte faite** (passe 150) : trois passages. **Deuxième lot fait** (passe 151, sur la consigne du
responsable de « faire toutes les autres cinématiques nécessaires ») : les scènes du récit, du prologue au titre.

## 1. Principes

- **Runtime** : les cinématiques sont jouées par le moteur de la ville, dans la scène même. Aucune vidéo, aucune image,
  aucun son ajouté. Ce sont la caméra de l'îlot, les personnages, des bandes et un carton. Le décor, les feuilles et les
  approbations restent tels quels.
- **Mode Aventure seulement.** Le Duel standard, le jeu par défaut au repos (identique au pixel près), la démo et le
  laboratoire ne changent pas.
- **Elles montrent, elles ne décident rien.** Une cinématique ne change jamais l'état de l'aventure. Ses seules
  écritures sont la mémoire des cinématiques déjà vues (`cinematiques`, champ facultatif de la sauvegarde `aventure/2`,
  sans migration : arrivées dans les quartiers et scènes du récit, chacune une fois par aventure) et le réglage du
  navigateur.
- **Toujours passables** : bouton « Passer ▸ », ou Échap, Espace, Entrée. Échap passe la cinématique sans ouvrir le
  menu. Une cinématique passée met tout de suite son état final : le personnage arrivé, la caméra au joueur.
- **Courtes** : 0,5 à 5 s. Pendant ce temps, le monde attend : pas de repérage, pas de Kaï, pas d'entrées du joueur.
  Les rencontres forcées reprennent après.
- **Accessibles** :
  - mouvement réduit : des coupes franches au lieu des mouvements, mais les tenues sont gardées (le temps de lire) ;
  - temps figé (captures) : tout se résout tout de suite.
- **Réglage** : « Cinématiques : oui / non » dans le menu de l'aventure, mémorisé dans le navigateur (`lqv.cine`, à
  part des sauvegardes, lecture et écriture protégées). Elles sont activées par défaut.
- **QA** : coupées avec `?qa=1` sauf `?cine=1`. Les parcours automatisés d'avant restent déterministes, comme pour les
  rencontres en vue. `?cine=0` les coupe partout ; `?cineLent=<facteur>` (QA) multiplie les durées pour les captures
  en rendu logiciel.

## 2. Le langage

Un **plan** donne un point visé, un `zoom` (facteur de la distance de la caméra de l'îlot), une `hauteur` (décalage de
la hauteur visée), un **mouvement** et une **durée**. Les mouvements :

- `coupe` : franche ;
- `glisse` : la caméra suiveuse amortie, avec sa constante ;
- `travelling` : minuté, adouci aux deux bouts.

Le décor ne sort jamais du cadre. Les bornes du point visé suivent le zoom (passe 151) : plus près, le champ est plus
étroit, donc la caméra peut aller plus loin vers le bord sans montrer plus loin que d'habitude ; plus loin, les bornes
se resserrent. Des **actions** (la marche d'un personnage, `walkNpc`) démarrent avec un plan, et le plan dure jusqu'à
la fin de son action. À la fin de la cinématique, la caméra revient au joueur ou garde le dernier cadre si un dialogue
s'ouvre dessus. Elle revient au joueur à la fermeture du dialogue, au départ en duel ou au changement d'îlot.

**Dialogue de scène** (passe 151) : un dialogue peut être **cadré**. La caméra glisse sur le personnage qui parle (gros
plan), sur les deux personnages ou sur un groupe ; les bandes restent si la scène les tient. Une réplique qui enchaîne
garde la scène (caméra et bandes) sans retour au joueur entre les deux. À la fermeture du dernier dialogue, la caméra
revient au joueur et les bandes se replient.

**Bandes partagées** (passe 151) : les bandes sont tenues par la cinématique et par les dialogues de scène qui la
suivent. Elles se replient quand plus personne ne les tient, une tâche plus tard : une scène qui enchaîne une
cinématique et son dialogue garde ses bandes sans les replier entre les deux.

## 3. Les passages de la première porte

| Passage | Plans | Bandes |
|---|---|---|
| **Première arrivée dans un quartier** (une fois par aventure et par quartier, dont le Quai au début de l'aventure, à la place du carton plein écran ; jamais pour un quartier déjà visité dans une sauvegarde d'avant les cinématiques) | la caméra, un peu plus loin et plus haut, part du bout de la rue opposé au joueur. Elle traverse le premier rang jusqu'à lui ; le chemin lumineux s'y révèle (passe 149). Puis elle revient au cadrage ordinaire. Carton du lieu (nom de l'îlot et une ligne). 4,7 s | oui, avec le carton |
| **Kaï surgit** (K1 à K6) | la caméra se porte sur Kaï, tout près, pendant la bulle « ! ». Elle prend ensuite les deux personnages pendant qu'il court au joueur, et le dialogue s'ouvre sur ce cadre | oui |
| **Un guetteur repère le joueur** | un plan court sur les deux personnages pendant qu'il vient ; le dialogue s'ouvre sur ce cadre | non (le passage revient souvent) |

Lignes des cartons (provisoires, à la fiche) :
- le Quai : « soir de tournoi » ;
- le Parvis : « devant l'arène, sous les bannières des quatre familles » ;
- les Ruelles : « linge tendu, fontaine et canal » ;
- la Grande Cour : « le cœur de la ville, au pied du Belvédère » ;
- la Place du Fanal : « au pied du vieux phare » ;
- la Ville haute : « l'esplanade des Hôtels, en terrasse ».

## 3 bis. Les scènes du récit (deuxième lot, passe 151)

Chacune se joue une fois par aventure ; sans cinématiques (réglage, QA sans `?cine=1`), le jeu se déroule comme avant
(mêmes dialogues, mêmes faits, même ordre).

| Scène | Plans | Bandes |
|---|---|---|
| **Kaï au prologue** (première conversation, aux braseros du Quai) | la caméra se porte sur Kaï (gros plan), puis son dialogue s'ouvre cadré sur les deux | oui |
| **Retour du duel du prologue** | « La foule » cadrée avec le joueur ; la réplique de Kaï cadrée sur lui s'il est là ; **l'émissaire fend la foule** (coupe sur la foule ; il part du bord de la rue et s'avance jusqu'au joueur) ; son dialogue cadré sur les deux | oui |
| **L'affiliation confirmée** | gros plan sur le joueur dans ses nouvelles couleurs, puis la caméra recule ; carton « Voie de la … » et la devise de la maison ; le cadet parle ensuite, cadré avec le joueur s'il est là | oui |
| **Un chef vaincu** (Signature gagnée, une fois par famille) | la caméra se porte sur le chef (il s'incline), puis prend les deux ; carton « … s'incline · Signature de la … gagnée » | oui |
| **Carton de chapitre** (II à V, à l'entrée en ville qui suit le changement) | glissé lent vers le joueur ; « Chapitre II · les trois voies, trois maisons à défier », jusqu'à « Chapitre V · le Championnat des Champions ». Le chapitre I s'ouvre avec l'affiliation, le titre avec sa propre scène | oui |
| **L'ouverture du Championnat** (le héraut, dans la Grande Cour, la première fois) | plan large de la place, depuis un bord, jusqu'au héraut et au joueur ; carton ; le dialogue d'ouverture cadré sur les deux | oui |
| **Le titre** (finale gagnée) | plan large de la place jusqu'au héraut et au joueur ; carton « Le titre de la ville · personne ne joue mieux » ; la proclamation cadrée sur les deux (sur le joueur seul hors de la Grande Cour) | oui |

L'ordre à l'entrée en ville : d'abord la scène en attente (chef vaincu, titre), puis le carton du chapitre ; un
événement de Kaï dû se joue ensuite (le monde attend pendant les cinématiques).

## 4. Candidats pour la suite (non faits)

- **Une entrée dans un rang du fond** (vue d'ensemble d'une place) : elle demande que les façades du devant passent en
  fantôme selon la caméra et non plus selon le joueur. C'est un changement du diorama, à décider à part.
- **Les Épreuves et les Joutes remportées**, **l'engagement d'une famille** à la Salle des Bannières : des écrans plus
  que des scènes ; à ajouter si le responsable le souhaite.
- **Les répliques de Kaï K2 à K5** pourraient avoir leur propre mise en scène (aujourd'hui la même que K1).

## 5. Vérifications

- Tests : `test/m11-cinematiques.test.ts` (plans, interpolation, réglage, adresse, mémoire, réglages de caméra pour une
  image, bornes ; déroulé sur une ville factice ; scènes du récit ; bandes partagées).
- Navigateur : `tools/m11-cinematiques.mjs` (`?aventure=1&qa=1&cine=1`), qui vérifie :
  - l'arrivée sur le Quai (bandes, carton, travelling, retour) ;
  - l'arrivée sur la Place du Fanal passée par Échap, et pas de seconde arrivée au retour au Quai ;
  - le guetteur ; Kaï (point sur lui, dialogue sur les deux, caméra rendue au retour du duel) ;
  - le réglage du menu ;
  - QA sans `?cine=1` (le carton d'avant) ;
  - deuxième partie, les scènes du récit : Kaï au prologue, la foule et l'émissaire, l'affiliation, un chef vaincu et le
    chapitre II, le chapitre V, l'ouverture du Championnat, le titre (`LQV_CINE_PARTIE=1` ou `2` : une seule partie).
- Parcours d'avant, sans `?cine=1` : `qa:aventure`, `qa:championnat` (inchangés).
- Jeu par défaut au repos identique au pixel près.
