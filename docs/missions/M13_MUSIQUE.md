# M13 — La musique du jeu : jazz synthétisé par code, des thèmes et leurs variations

**Date :** 2026-10-27. **Statut : MANDAT DE PRODUCTION** (demande du responsable, session cloud, après M12 et
l'avenant 09 ; à mener en parallèle des points à vérifier en local).

## Demande du responsable

> « La prochaine étape, après avoir finalisé les points locaux, sera d'effectuer les musiques du jeu. D'abord
> déterminer le nombre de musiques. Puis, niveau genre, j'aimerais partir sur une inspi plutôt jazzy. »

Après la proposition de la session (resserrée : 8 morceaux ; recommandée : 14 morceaux et 4 jingles ; complète : une
vingtaine) et la question du mode de production :

> « Partons sur la version semi-resserrée, puis nous pourrons intégrer d'autres musiques à des éléments/situations qui
> demandent plus d'identité personnelle, et optons pour du synthétisé par code, car tu es capable de gérer cela de
> manière autonome en prenant le temps qu'il faut pour de la qualité optimale.
> Concernant nos inspirations, Final Fantasy VIII est une très bonne source, qui s'oriente parfois vers du lofi-jazz ;
> Breath of Fire III aussi est bon dans son registre, car il allie détente et sérieux quand il le faut. Mais j'aime
> aussi beaucoup les ambiances Zelda, car les sons sont capables de produire des variantes à partir de leur base et donc
> proposer des rythmes accélérés, ralentis, reverses, etc., ce qui donne l'impression d'écouter une toute nouvelle
> musique. »

## Décisions

1. **Version semi-resserrée** : peu de thèmes originaux, chacun décliné en versions (la leçon de Zelda) ; d'autres
   thèmes viendront plus tard pour les situations qui demandent une identité propre (une famille, un quartier, une
   figure).
2. **Synthétisée par code** (Web Audio), comme les bruitages de M11 : aucun fichier son, aucune bibliothèque.
3. **Jazz**, avec trois inspirations : Final Fantasy VIII (des moments lofi-jazz ; la musique de son jeu de cartes,
   détendue et entraînante sur de longues parties), Breath of Fire III (la détente et le sérieux quand il le faut),
   Zelda (un thème de base qui devient une autre musique : accéléré, ralenti, renversé, à l'envers, dans un autre
   mode, réorchestré).
4. **Des compositions originales** : on reprend des manières (instrumentation, harmonie, rythme, procédés de
   variation), jamais une mélodie, une grille ou un enchaînement reconnaissable d'une œuvre existante.

## Constat (2026-10-27)

- Le son de M11 (`src/son/`, ADR 042) joue des **bruitages** (interface, cartes, Clash, ville, temps forts de M12) et des
  **ambiances** de quartier (bruit filtré modulé, bourdons, ponctuations rares). **Il n'y a aucune musique.**
- Le moteur a déjà ce qu'il faut autour : contexte créé au premier geste, volume général et coupure (`lqv.son`), bus
  séparés (effets, ambiance, interface), limiteur, coupé en QA (`?son=1` pour l'entendre), aucun secret par le son.
- **Limite du cloud** : la session ne peut pas écouter. Elle juge par la théorie (harmonie, conduite des voix,
  registres), par des mesures sur des rendus hors ligne (niveau, crête, spectre, raccords des boucles, coût) et par
  des spectrogrammes ; **l'oreille du responsable tranche**, sur des aperçus écoutables sans lancer le jeu.

## Ce qui est livré

- Un **contrat** (`docs/m13/01_MUSIQUE.md`, proposé) et l'**ADR 047** (proposé).
- Un **moteur musical** synthétisé par code : instruments fabriqués par le code, séquenceur, générateurs jazz (basse
  qui marche, accompagnement, batterie, relances), **variations** à la manière de Zelda.
- **6 thèmes originaux, 15 versions, 4 jingles** (tableau du contrat, §2), branchés aux écrans et aux situations du
  jeu, avec un **volume de la musique** à part.
- Un **laboratoire d'écoute** (`?musique=1`) et des **aperçus** (`artifacts/audio/m13/`, fichiers OGG écoutables
  partout) ; une fiche d'arbitrages par lot.

## Feuille de route

| Lot | Contenu | Livré quand |
|---|---|---|
| **MU-A** (porte) | moteur, instruments du trio (Rhodes, piano, contrebasse, batterie aux balais et à la ride, vibraphone), effets (salle, chaleur, lofi), thème I « Les Quatre Voies » en 3 versions, les 4 jingles, laboratoire, aperçus et mesures | **écouté par le responsable** (fiche) avant la suite |
| **MU-B** | thème II « La ville la nuit » (3 versions), thème III « Duel » (2 versions) ; branchement au jeu : bus et réglage de la musique, transitions sur la mesure, effacement sous les dialogues | idem |
| **MU-C** | thème IV « Les Maisons » (4 couleurs), thème V « Kaï », thème VI « Championnat » (2 versions) ; cinématiques ; instruments à vent (trompette en sourdine, saxophone, section de cuivres), guitare | idem |
| **MU-D** | mixage final, coût mesuré sur les deux GPU du responsable (le son passe par le processeur), campagne de QA, fiche, réception | jalon |

**État au 2026-10-28 (passes 158 à 160) :** MU-A, MU-B, MU-C et le branchement au jeu **livrés** dans la même session
(ordre du responsable : « prends le temps qu'il faudra pour obtenir un résultat le plus optimal possible ; je veux une
bande son vraiment, mais vraiment immersive ») ; contrat 2 (`docs/m13/02_MUSIQUE_INTERACTIVE.md`) et amendement 1 de
l'ADR 047 **proposés**. Les 6 thèmes, les 15 versions et les 4 jingles existent ; la musique suit le jeu standard et
l'aventure. MU-D en cours : mixage mesuré, coût, campagne de QA, fiche d'écoute `docs/FICHE_ARBITRAGES_M13.md`. **À faire
en local : l'écoute (l'oreille du responsable tranche) et la mesure du coût sur son poste.**

Garanties pendant tout le chantier : règles du duel, catalogue, IA, sauvegardes, images et approbations inchangées ;
jeu par défaut au repos identique au pixel près (la musique ne joue qu'après un geste et ne dessine rien) ; son coupé en
QA ; aucune information secrète par la musique (seuls des faits publics la font changer).
