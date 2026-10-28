# M13 — Contrat 2 : une bande son immersive, la musique qui suit le jeu

**Date :** 2026-10-28. **Statut : PROPOSÉ** (demande du responsable du même jour : « prends le temps qu'il faudra pour
obtenir un résultat le plus optimal possible. Je veux une bande son vraiment, mais vraiment immersive »). Complète le
contrat 1 (`01_MUSIQUE.md`) ; ADR 047.

## 1. Principes

- **La musique écoute le jeu, jamais l'inverse** : seuls des faits publics la font changer (écran, quartier, chapitre,
  adversaire, PV publics, prolongation, Signature annoncée, issue du duel) ; aucun secret par la musique (ADR 011) ;
  aucun hasard tiré du moteur de jeu.
- **Rien ne se coupe en plein vol** : un changement de morceau attend la mesure (une transition urgente, le temps), une
  couche entre ou sort sur la phrase, une ponctuation tombe sur le temps et dans l'accord qui sonne.
- **Une ville qui vit et qui grandit** : le même thème de la ville change de quartier en quartier (versions du contrat 1)
  et s'étoffe au fil de l'histoire.

## 2. Les mécanismes

| Mécanisme | Ce que fait la musique | Quand |
|---|---|---|
| **Couches** | chaque version a des couches (fond, mélodie, tension, cuivres) qui entrent ou sortent en fondu, sans recommencer le morceau | duel : la mélodie entre au premier Clash ; la tension en dessous de 30 % de PV d'un camp ; les cuivres à une Signature annoncée |
| **Ponctuations** | un accent musical court (accord dans la tonalité du moment, couleur majeure ou mineure), calé sur le temps suivant | issue d'un Clash gagné ou perdu par le joueur ; Signature annoncée ; prolongation |
| **Fin de duel** | la musique s'arrête sur le temps fort suivant (cymbale étouffée), puis le jingle | victoire, défaite |
| **Transitions** | fondu enchaîné sur la mesure ; levée (une ou deux mesures) quand la version en a une ; la ville s'assourdit (passe-bas) quand un duel commence | changement d'écran, de quartier, entrée en duel |
| **La ville qui grandit** | l'arrangement du thème de la ville s'étoffe avec les chapitres : au prologue et au chapitre I, une guitare et une contrebasse ; aux chapitres II et III, le trio ; IV et V, avec les vents ; champion, une réharmonisation triomphante | aventure, chapitre en cours (fait public) |
| **Sources dans la ville** | un lieu joue sa propre musique, localisée : on l'entend de loin, étouffée, plus fort et plus clair en s'approchant, et la musique de fond s'efface d'autant | le Fanal (un combo de bar, sur la Place du Fanal et le Quai) ; d'autres lieux plus tard |
| **Focus** | sous un dialogue, la musique baisse (−5 dB) et s'adoucit (passe-bas léger) ; pendant une cinématique, la musique du récit est la seule | dialogues, cinématiques |
| **Jeu ensemble** | chaque musicien a sa place dans le temps (la ride légèrement devant, la basse sur le temps, le piano et la mélodie un peu derrière) ; dynamique par section (le pont et le dernier A plus intenses) | toujours |

## 3. Les moments (aventure et jeu standard)

| Écran ou situation | Musique |
|---|---|
| Écran titre (jeu standard, aventure) | I-1 Titre |
| Deck, collection, rencontres, préparation, options, aide ; écran de résultat après le jingle | I-2 Menus |
| Ville de l'aventure | II, la version du quartier, arrangée selon le chapitre ; sources de la ville |
| Duel ordinaire (jeu standard ; rue, guetteurs, membres, Épreuves) | III Duel, couches et ponctuations |
| Défis d'une famille (cadet, bras droit, chef), Joute | IV, la couleur de la famille (MU-C ; d'ici là, III) |
| Kaï (prologue, événements du rival, bras droit de la Cendre ; jeu standard) | V (MU-C ; d'ici là, III) |
| Championnat, Finale | VI (MU-C ; d'ici là, III) |
| Cinématiques (prologue, émissaire, affiliation, chef vaincu, ouverture du Championnat, titre) | I-3 Récit (Kaï qui surgit : V) |
| Carton de chapitre ; carte gagnée ; fin de duel | jingles |

## 4. Mesure de la réussite

- Aucune coupure audible : changements sur la mesure, fondus, raccords de boucle (rendus hors ligne vérifiés).
- Les déclencheurs suivent les faits publics (tests purs de la correspondance « état du jeu → musique »).
- Le jeu par défaut au repos ne change pas (la musique ne dessine rien et ne joue qu'après un geste) ; coupée en QA.
- L'oreille du responsable : fiche d'écoute par lot.

## 5. Mise en œuvre (2026-10-28, passes 159 et 160)

| Mécanisme | Où | Ce qui est fait |
|---|---|---|
| Chef d'orchestre (pur) | `src/son/musique/chef.ts` | écran du jeu standard → version ; rôle d'un duel (jeu standard : Kaï ou duel ordinaire ; aventure : Kaï, Championnat, Finale, Maison, duel) → version ; suivi d'un duel sur faits publics (Clashes, Signature annoncée, prolongation, PV publics sous 30 %, issue) → couches, accents, fin ; quartier et chapitre → version de la ville ; distance au Fanal → proximité |
| Orchestre | `src/son/musique/orchestre.ts` | chargé après un geste (`import()`), instruments de la musique demandée d'abord (worker), consignes appliquées sans coupure : nouvelle version sur la mesure (duel tendu : sur la phrase), arrangement (chapitre) repris sur la mesure, intensité au passage suivant, couches sur la mesure, ponctuations sur le temps, fin sur le temps fort puis jingle (la musique suivante attend sa fin), jingle par-dessus la musique (le fond s'efface de 9 dB) |
| Bus et réglages | `src/son/moteur.ts`, `reglages.ts` | bus de la musique (60 % par défaut, `lqv.son`), Options du jeu standard et menu de l'aventure ; à 0 %, plus aucune note planifiée ; ambiances baissées d'un tiers pendant la musique ; les sons `victoire`, `defaite`, `gain`, `titre` deviennent la fin du duel et des jingles quand la musique joue |
| Jeu standard | `src/shell/shell.ts`, `src/app/duelSession.ts`, `controller.ts` | accueil : I-1 ; autres écrans : I-2 ; duel : sa version (Kaï : V-1), suivi temps par temps de la présentation (PV d'avant la résolution tant qu'elle n'est pas montrée) ; « Passer » rejoue la fin |
| Aventure | `src/aventure/app.ts` | écran titre : I-1 ; ville : la version du quartier arrangée selon le chapitre ; scènes du récit : I-3 (jusqu'à une seconde et demie après leur dernier plan ou dialogue) ; carton de chapitre : jingle ; Kaï qui surgit : V-1, qui continue dans le duel ; dialogues et écrans : focus ; combo du Fanal (I-2, à seize mètres de sa porte sur le Quai) ; écran de résultat : I-2 |
| Contrôle | `test/m13-chef.test.ts`, `tools/m13-jeu.mjs` | correspondances pures (dont le secret : un événement privé ne change rien) ; au navigateur, le journal de la musique et l'état de l'orchestre suivent un duel complet et la ville |

**Limites connues :** le combo du Fanal n'existe que sur le Quai (la Place du Fanal n'a pas de porte du bar) ; un
changement de chapitre se fait entendre au retour en ville (la version reprend avec son nouvel arrangement) ; le coût
du big band et de la Finale est à mesurer sur le poste du responsable.

