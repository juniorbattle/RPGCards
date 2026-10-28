# Fiche d'arbitrages M13 — la musique, lot MU-A (fiche d'écoute, à remplir par le responsable)

**Date :** 2026-10-28. **Statut : à remplir.** Mandat `docs/missions/M13_MUSIQUE.md`, contrat `docs/m13/01_MUSIQUE.md`
(proposé), ADR 047 (proposé). La session cloud ne peut pas écouter : elle a vérifié ce qui se mesure (justesse des
instruments à moins de 6 cents, harmonie note par note, sonie, crêtes, coût) ; **l'oreille du responsable tranche**. Rien
n'est encore branché au jeu (lot MU-B) : la musique s'écoute dans les aperçus ou au laboratoire.

**Écouter :**
- **Aperçus** (n'importe quel lecteur, sans lancer le jeu) : `artifacts/audio/m13/` (index : `README.md` du dossier).
- **Laboratoire** (le jeu lancé en local, puis l'adresse `?musique=1`) : chaque version, les variations à la volée, les
  jingles, les transitions sur la mesure ; chaque passage est regénéré (jamais deux fois la même boucle).
- Mesures : `artifacts/qa/m13/mesures.md` ; spectrogrammes et formes d'onde : `screenshots/qa/m13/`.

## Réception du lot

| Entrée | Objet | Recommandation | Alternatives |
|---|---|---|---|
| **R1** | Le contrat et l'ADR 047 (synthèse par code, thèmes et versions, instruments calculés, contrôle par mesures) | **Recevoir** | Reprendre un point (lequel) |
| **R2** | Le thème « Les Quatre Voies » : motif de quatre notes en quartes (do, fa, mi, la) qui revient trois fois en montant, pont vers le IV ; compositions originales | **Recevoir** | Recevoir avec retours (mélodie, harmonie) ; recomposer |

## Écoute, version par version

| Entrée | Aperçu | Ce qu'on entend | Recommandation | Alternatives |
|---|---|---|---|---|
| **E1** | `I-1.ogg` (titre) | levée de deux mesures ; la tête au vibraphone, premier A aux balais en deux temps, puis contrebasse qui marche et ride ; deuxième passage : chorus du piano, le vibraphone rappelle le motif renversé au pont, à l'envers au dernier A (126 à la noire) | **Recevoir** | Avec retours : tempo, instrument de la mélodie (piano, Rhodes ; trompette en MU-C), densité de la batterie |
| **E2** | `I-2.ogg` (menus) | le thème en lounge lofi : Rhodes en accords poussés, le motif deux fois plus lent au piano, puis à l'envers, puis renversé, puis le groove seul ; batterie posée, souffle de vinyle, légère usure de bande (80) | **Recevoir** | Plus ou moins lofi (vinyle, bande passante) ; tempo |
| **E3** | `I-3.ogg` (récit) | ballade en ré bémol : le chant au piano, arpèges de la main gauche, nappe ; au deuxième passage, la contrebasse et des balais discrets entrent (64) | **Recevoir** | Plus lent, plus nu (sans nappe) ; une autre tonalité |
| **E4** | `victoire.ogg`, `defaite.ogg`, `carte.ogg`, `chapitre.ogg` | le motif en croches qui s'ouvre sur fa majeur 9 (victoire) ; le motif à l'envers qui tombe en fa mineur (défaite) ; le motif éclair au vibraphone (carte gagnée) ; le motif lent au Rhodes sur une nappe (nouveau chapitre) | **Recevoir** | Plus courts ; plus éclatants ; autre couleur pour la défaite |
| **E5** | `I-1-envers.ogg`, `I-1-renversee.ogg`, `I-1-mineur.ogg`, `I-1-lente.ogg` | la leçon de Zelda : la même tête jouée à l'envers, renversée (miroir dans la gamme), en mineur, en valeurs doublées, sur la même grille | **Garder le procédé** pour les versions à venir (la ville, le duel tendu, les Maisons) | En faire aussi des variations de jeu (par exemple, la tête à l'envers quand le rival mène) |

## Les instruments

| Entrée | Instrument | Comment il est fait | Recommandation | Alternatives |
|---|---|---|---|---|
| **S1** | Piano | additif inharmonique (cordes raides), son immédiat et rémanent, trois cordes désaccordées, marteau | **Écouter d'abord** (le plus difficile à synthétiser) | Plus brillant, plus mat, plus de corps |
| **S2** | Rhodes | FM 1:1 dont l'indice décroît, lame 14:1 très brève, grognement à forte nuance | **Écouter d'abord** | Plus de cloche ; plus doux |
| **S3** | Vibraphone | lames 1:4:10, mailloche, moteur (trémolo commun) | **Écouter d'abord** | Moteur plus lent, plus profond ou coupé |
| **S4** | Contrebasse | corde pincée près du chevalet (déclin plus rapide des aigus), doigt et bois | **Écouter d'abord** | Plus ronde ; plus de doigt |
| **S5** | Batterie | ride et crash en partiels inharmoniques et bruit en bandes, charleston, balais en cercle, caisse claire, grosse caisse feutrée | **Écouter d'abord** | Ride plus présente ou plus discrète ; balais plus marqués |

## Mélange et coût

| Entrée | Objet | Recommandation | Alternatives |
|---|---|---|---|
| **M1** | L'équilibre (mesuré piste par piste, `tools/m13-pistes.mjs`) : la mélodie devant, la contrebasse environ 4 LU dessous, l'accompagnement 5, la ride 10, la charleston 15 ; sonie des morceaux −17 à −19 LUFS, crêtes ≤ −3,8 dBTP | **Recevoir** | Contrebasse plus forte (jazz plus « boisé ») ; mélodie plus en retrait |
| **M2** | Les salles : club (1,3 s) pour le titre et les jingles, studio sec pour le lounge, grande salle (2,4 s) pour le récit | **Garder** | Plus ou moins de réverbération |
| **M3** | Le coût : instruments calculés en environ 1 s dans un worker au premier geste, 33 Mo en mémoire ; lecture 13 à 27 fois plus rapide que le temps réel dans le conteneur cloud (soit 4 à 8 % d'un cœur lent) | **Recevoir**, à mesurer sur le poste du responsable au lot MU-D | Calculer seulement les instruments de la version jouée (moins de mémoire au démarrage) |

## Suite

| Entrée | Objet | Recommandation | Alternatives |
|---|---|---|---|
| **N1** | Prochain lot | **MU-B** après cette écoute : « La ville la nuit » (3 versions), « Duel » (2 versions), branchement au jeu (bus et volume de la musique, transitions sur la mesure, effacement sous les dialogues) | Reprendre d'abord le thème I selon les retours |
