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
