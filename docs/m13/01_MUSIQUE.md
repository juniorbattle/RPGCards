# M13 — Contrat 1 : la musique, jazz synthétisé par code

**Date :** 2026-10-27 (état au 2026-10-28 : tout le tableau du §2 est composé et branché ; contrat 2 pour la musique
qui suit le jeu). **Statut : PROPOSÉ** (mandat `docs/missions/M13_MUSIQUE.md` ; décisions du responsable :
version semi-resserrée, synthèse par code, jazz, inspirations Final Fantasy VIII, Breath of Fire III et Zelda). ADR 047.

## 1. Principes

- **Synthétisée par code** (Web Audio) : aucun fichier son, aucune bibliothèque. Les instruments sont **fabriqués par
  le code** : chaque note est calculée une fois (modèles physiques, synthèse additive ou FM, enveloppes par partiel),
  rangée en mémoire, puis jouée à la demande ; les effets (salle, chaleur, lofi) sont des nœuds Web Audio.
- **Des thèmes et leurs versions** (la leçon de Zelda) : un thème est écrit une fois (mélodie, grille, motif) ; une
  version le transforme (tempo, valeurs allongées ou raccourcies, à l'envers, renversé, autre mode, autre harmonie,
  autre groove, autre orchestration). Six thèmes suffisent à quinze versions qui sonnent comme des musiques
  différentes, et tout reste reconnaissable.
- **Jamais deux fois la même boucle** : comme un trio de jazz, chaque passage regénère la basse, l'accompagnement, la
  batterie et les relances (au hasard réglé par une graine : rendus reproductibles, aucun `Math.random`) ; la mélodie
  écrite revient, ornée ou déplacée au deuxième passage, avec parfois un court chorus improvisé sur le motif.
- **Compositions originales** : aucune mélodie, grille ou formule reconnaissable d'une œuvre existante ; on reprend des
  manières (§3).
- **Comme le son de M11** : contexte créé au premier geste ; coupé en QA (`?son=1` pour l'entendre) ; aucune
  information secrète (seuls des faits publics font changer la musique : écran, quartier, adversaire, PV publics) ;
  jamais de hasard tiré du moteur de jeu.

## 2. Les thèmes, leurs versions, leurs moments (version semi-resserrée)

**6 thèmes originaux, 15 versions, 4 jingles.** D'autres thèmes viendront pour les situations qui demandent une identité
propre (une famille, un quartier, une figure) : ils s'ajoutent au catalogue sans rien changer au reste.

| Thème | Version | Où, quand | Couleur (tempo indicatif) |
|---|---|---|---|
| **I. « Les Quatre Voies »** (thème principal ; le **motif des quatre voies**, quatre notes en quartes, revient partout) | I-1 **Titre** | écrans titre du jeu standard et de l'aventure | swing modéré, trio et vibraphone (≈ 126) |
| | I-2 **Menus** | deck, collection, rencontres, préparation, options, aide ; écran de résultat après le jingle | le thème en lounge lofi : ralenti, demi-temps, Rhodes, souffle de vinyle (≈ 80) |
| | I-3 **Récit** | cinématiques (prologue, émissaire, affiliation, chef vaincu, ouverture du Championnat, titre) | ballade au piano, valeurs allongées, nappe (≈ 64) |
| **II. « La ville la nuit »** | II-1 **Le Quai et la Place du Fanal** | ces quartiers de l'aventure | cool jazz de film noir, balais, mélodie feutrée (≈ 96) |
| | II-2 **Le Parvis et la Grande Cour** | ces quartiers | swing festif, ride, mode majeur (≈ 138) |
| | II-3 **Les Ruelles et la Ville haute** | ces quartiers | valse jazz modale, vibraphone, contre-chant joué à l'envers (≈ 112, à trois temps) |
| **III. « Duel »** | III-1 **Duel** | duels ordinaires (jeu standard, rue, guetteurs, membres, Épreuves de quartier) | groove de swing sur un riff, détendu et entraînant sur de longues parties (≈ 144) |
| | III-2 **Duel tendu** | quand les PV d'un camp passent sous 30 % de leur maximum, ou en prolongation (faits publics) | le même, accéléré (≈ 156), riff raccourci, une couche de plus |
| **IV. « Les Maisons »** (un thème, une couleur par famille) | IV-1 **Cendre** | défis de la famille (cadet, bras droit, chef), Joute de la maison | hard bop ardent, mixolydien (≈ 168) |
| | IV-2 **Voile** | idem | cool, mineur, feutré (≈ 110) |
| | IV-3 **Ronce** | idem | swing lent et terrien, blues, contrebasse à l'archet (≈ 92) |
| | IV-4 **Astre** | idem | modal lydien, vibraphone et Rhodes, grande salle (≈ 120) |
| **V. « Kaï »** | V-1 **Kaï** | duels contre Kaï (prologue, événements du rival, bras droit de la Cendre ; Kaï au jeu standard) | rapide et crâneur, riff sur la blue note (≈ 176) |
| **VI. « Championnat »** | VI-1 **Championnat** | poule et Miroir | big band swing (≈ 150) |
| | VI-2 **Finale** | la Finale | modulée un ton plus haut, plus rapide, plus ample (≈ 160) |
| **Jingles** (tirés du motif) | **Victoire**, **Défaite**, **Carte gagnée**, **Nouveau chapitre** | fin du duel ; gain au registre ou déblocage ; carton de chapitre | 1,5 à 4 s ; ils remplacent les sons `victoire`, `defaite`, `gain` et `titre` (musique à 0 % : les sons d'avant) |

Priorités quand plusieurs règles s'appliquent : Kaï, puis Championnat, puis Maison, puis Duel. Les écrans de deck, de
collection et le journal de l'aventure ne changent pas la musique : elle s'efface de 5 dB.

## 3. Les inspirations, ce qu'on en prend

- **Final Fantasy VIII** : la musique d'un jeu de cartes détendue, groovy, qui ne fatigue pas sur de longues parties
  (thème III) ; des pièces calmes au piano (I-3) ; une teinte lofi-jazz (I-2) : Rhodes, souffle, légère usure.
- **Breath of Fire III** : l'alternance de la détente (la ville, les menus) et du sérieux (les Maisons, Kaï, le
  Championnat), sans changer de langage musical.
- **Zelda** : une base qui devient une autre musique. Procédés retenus (§4), tous appliqués à la mélodie écrite, à sa
  grille ou à son groove : **accéléré** et **ralenti**, **valeurs allongées** et **raccourcies**, **à l'envers**
  (rétrograde), **renversé** (miroir des intervalles, dans la gamme), **autre mode**, **autre harmonie**, **autre groove**
  (swing, ballade, lounge, bossa, valse, demi-temps), **autre orchestration**, **fragment** (le motif seul, en ostinato).

## 4. Le moteur

- **Théorie** (pur) : notes, gammes et modes, chiffrages d'accords, voicings sans fondamentale (formes A et B), voicings
  en quartes, conduite des voix au plus court, swing (rapport des croches selon le tempo).
- **Partitions** (pur, données) : chaque thème est écrit en notes (mélodie, grille par demi-mesure, motif, forme).
- **Variations** (pur) : les procédés du §3 comme fonctions sur la partition ; composables ; une version = un thème +
  une suite de transformations + un groove + une orchestration + une salle.
- **Générateurs** (pur, graine) : basse qui marche (fondamentales et notes de l'accord sur les temps forts, notes de
  passage, approches chromatiques vers l'accord suivant), deux temps (ballade), bossa ; accompagnement (rythmes de
  comping, anticipations, densité réglable) ; batterie (ride, charleston sur 2 et 4, grosse caisse feutrée, balais en
  cercles et frappés, relances en fin de phrase) ; ornements et courts chorus sur le motif. Légère humanisation
  (décalages et vélocités) au hasard réglé.
- **Instruments** (fabriqués par le code, calculés hors du fil principal) : Rhodes (FM), piano (additif, inharmonicité,
  déclin par partiel, marteau), contrebasse (corde pincée modélisée, archet en MU-C), vibraphone (partiels de lame,
  moteur), batterie (ride et charleston en partiels inharmoniques, balais en bruit sculpté, caisse claire, grosse
  caisse), guitare jazz et guitare à cordes de nylon ; pupitres de cuivres et de saxophones (calculés, bouclés) ; en
  temps réel : trompette bouchée et ouverte, saxophone ténor, flûte, cordes, contrebasse à l'archet (ADR 047,
  amendement 1).
- **Effets** : salles par réponse impulsionnelle calculée (club, grande salle, rue), chaleur (saturation douce),
  lofi (bande passante réduite, pleurage, souffle de vinyle) ; compression du bus ; placement stéréo d'un trio.
- **Séquenceur** : planification en avance sur l'horloge audio ; changements de morceau **sur la mesure** (fondu
  enchaîné d'environ 1,2 s, levée quand la version en a une), passage au duel tendu **sur la phrase** ; jingles sur le
  temps.
- **Bus de la musique** : sous le bus général, à côté des effets, de l'ambiance et de l'interface ; volume propre ;
  ambiances un peu baissées pendant la musique ; effacement sous les dialogues (−5 dB).

## 5. Réglages

- **Volume de la musique** (0 à 100 %, défaut 60 %), mémorisé avec le son (`lqv.son`) ; dans les Options du jeu standard
  et le menu de l'aventure. À 0 %, aucune note n'est calculée ni jouée.
- Coupure générale et volume général inchangés (ils coiffent la musique).

## 6. Contrôle de qualité

- **Tests** (purs) : voicings dans leur registre, conduite des voix, basse (fondamentale ou note de l'accord sur le
  premier temps, approche vers l'accord suivant), variations (le rétrograde du rétrograde redonne le thème ; un
  renversement diatonique reste dans la gamme), séquences reproductibles à graine égale, longueurs de boucle exactes,
  polyphonie bornée, aucune note hors de la tessiture de son instrument.
- **Rendus hors ligne** (`tools/m13-musique.mjs`, Chromium) : chaque version rendue sans la jouer, puis
  **aperçu OGG** (`artifacts/audio/m13/`), **mesures** (sonie intégrée EBU R128 visée −18 ± 3 LUFS au volume plein,
  crête vraie ≤ −1 dBTP, aucun écrêtage, raccord de boucle sans saut), **spectrogramme** et vitesse de rendu.
- **Laboratoire d'écoute** (`?musique=1`) : chaque version, ses variations à la volée (tempo, à l'envers, renversé,
  mode, couches), les transitions (ville → duel → duel tendu → victoire).
- **L'oreille du responsable** : chaque lot est reçu par une fiche d'écoute (la session ne peut pas écouter).
