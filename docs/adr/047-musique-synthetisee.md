# ADR 047 — La musique, synthétisée par code : thèmes, variations, instruments calculés

**Date :** 2026-10-27. **Statut : PROPOSÉ** (décisions du responsable du même jour : version semi-resserrée, synthèse
par code, jazz ; mandat `docs/missions/M13_MUSIQUE.md`, contrat `docs/m13/01_MUSIQUE.md`).

## Contexte
Le jeu a des bruitages et des ambiances synthétisés par code (M11, ADR 042), pas de musique. Le responsable veut du jazz
(Final Fantasy VIII, Breath of Fire III), des thèmes qui se déclinent comme dans Zelda, peu de thèmes au départ, et une
synthèse par code menée en autonomie, pour la qualité.

## Décision
1. **Thèmes et versions** : 6 thèmes originaux écrits en notes (partitions, données pures), 15 versions obtenues par des
   transformations pures (tempo, valeurs, rétrograde, renversement diatonique, mode, réharmonisation, groove,
   orchestration, fragment), 4 jingles tirés du motif principal.
2. **Le jazz est généré à chaque passage** (basse, accompagnement, batterie, ornements) par des générateurs purs à graine :
   rien ne se répète à l'identique, tout se reproduit à graine égale (tests, rendus hors ligne).
3. **Instruments fabriqués par le code et calculés une fois** : chaque note (ou une note sur trois, transposée à la
   lecture) est calculée en JavaScript (FM, additif avec déclin par partiel et inharmonicité, corde pincée modélisée,
   partiels inharmoniques des cymbales, bruit sculpté) **hors du fil principal**, rangée dans des tampons audio, puis
   jouée par la Web Audio API. Plus riche que des oscillateurs en temps réel, et bien moins coûteux à la lecture.
4. **Séquenceur sur l'horloge audio**, changements sur la mesure ou la phrase ; **bus de la musique** avec son volume
   (`lqv.son`), sous le bus général ; jingles à la place de quatre bruitages.
5. **Contrôle sans oreille** : rendus hors ligne mesurés (sonie, crête, raccords, spectrogrammes, coût) et aperçus OGG
   pour l'écoute du responsable, qui reçoit chaque lot.

## Conséquences
- Aucun fichier son ni bibliothèque ; le poids du jeu ne bouge presque pas (du code et des partitions).
- Le calcul des instruments prend un court moment au premier geste (dans un worker) ; la musique attend qu'il soit fait.
- Le moteur de jeu, ses règles et son hasard ne sont pas touchés ; jeu par défaut au repos identique au pixel près.
- Les thèmes à venir (familles, quartiers, figures) s'ajoutent au catalogue sans rien changer au reste.

## Amendement 1 (2026-10-28, lots MU-B à MU-D ; demande du responsable : « une bande son vraiment, mais vraiment immersive ») — PROPOSÉ
1. **Vents et cordes synthétisés en temps réel** (trompette bouchée, trompette ouverte, saxophone ténor, flûte, cordes,
   contrebasse à l'archet, `src/son/musique/vents.ts`) : ce qui fait vivre une ligne mélodique ne se calcule pas d'avance.
   Une voix par phrase : les notes liées glissent (port de voix), les notes détachées sont reprises à la langue ; le
   timbre suit la nuance (façonneur non linéaire, éclat d'attaque) ; vibrato tardif sur les notes tenues ; souffle ;
   coulé par en dessous et chute en fin de phrase.
2. **Pupitres calculés** : les sections de cuivres et de saxophones (soli harmonisés, coups d'orchestre, tenues) sont
   calculées dans le worker avec les mêmes profils, puis jouées comme le piano, avec une boucle de tenue d'un nombre
   entier de périodes et un chorus stéréo sur leur canal (le big band coûte trois fois moins qu'en temps réel).
3. **La musique suit le jeu** (contrat `docs/m13/02_MUSIQUE_INTERACTIVE.md`) : un chef d'orchestre pur
   (`src/son/musique/chef.ts`) traduit l'état public du jeu en consignes (version, contexte, couches) ; l'orchestre
   (`orchestre.ts`, chargé à la demande après un geste) les applique sans rien couper en plein vol (mesure, phrase, temps
   fort). Couches des duels (mélodie au premier Clash, tension sous 30 % de PV ou en prolongation, cuivres à une
   Signature annoncée), ponctuations dans l'accord qui sonne, fin de duel sur le temps fort, ville arrangée selon le
   chapitre, combo du Fanal localisé, focus sous les dialogues. Jamais un fait privé, jamais le hasard du moteur de jeu.
4. **Coût mesuré** sur des rendus hors ligne dans le conteneur (lent) : la plupart des versions de 6 à 35 fois plus vite
   que le temps réel ; le big band au complet environ 6 fois, la Finale environ 4 fois (à mesurer sur le poste du
   responsable). Instruments calculés : environ 2 s dans le worker au premier geste, la musique demandée d'abord.

