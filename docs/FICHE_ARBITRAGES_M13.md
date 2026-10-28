# Fiche d'arbitrages M13 — la musique (fiche d'écoute, lots MU-A à MU-D ; à remplir par le responsable)

**Date :** 2026-10-28. **Statut : à remplir** (à envoyer à la session locale avec les autres fiches, décision du
responsable). Mandat `docs/missions/M13_MUSIQUE.md` ; contrats `docs/m13/01_MUSIQUE.md` et
`02_MUSIQUE_INTERACTIVE.md` ; ADR 047 et son amendement 1 (tous **proposés**). Ordre du responsable du même jour :
« prends le temps qu'il faudra pour obtenir un résultat le plus optimal possible. Je veux une bande son vraiment, mais
vraiment immersive. »

La session cloud ne peut pas écouter. Elle a vérifié ce qui se mesure : justesse de chaque instrument (moins de 3 cents
partout), harmonie note par note (chaque note de chaque tête est une note ou une tension de son accord ; la valse, la
version majeure, le contre-chant et les quatre couleurs des Maisons y compris ; le riff de Kaï dans la gamme de blues de
chaque accord), tessitures, sonie et crêtes de chaque morceau, coût de rendu, et le comportement dans le jeu (journal de
la musique au navigateur). **L'oreille du responsable tranche.**

## Comment écouter

- **Aperçus** (n'importe quel lecteur, sans lancer le jeu) : `artifacts/audio/m13/` (index : son `README.md`) ; les
  instruments seuls : `artifacts/audio/m13/instruments/`. Mesures : `artifacts/qa/m13/mesures.md`.
- **Laboratoire** (le jeu lancé en local, adresse `?musique=1`) : chaque version, la ville selon le chapitre, le
  dialogue, l'entrée en duel, le Fanal qu'on approche (curseur), les couches et les ponctuations du duel, la fin du
  duel, les jingles, chaque instrument seul.
- **Dans le jeu** : la musique joue dès le premier geste ; son volume se règle dans les Options du jeu standard et le
  menu de l'aventure (« Musique », 60 % par défaut). En QA, elle est coupée comme le son (`?son=1` pour l'entendre).

## Réception

| Entrée | Objet | Recommandation | Alternatives |
|---|---|---|---|
| **R1** | Les contrats 1 et 2, l'ADR 047 et son amendement 1 (synthèse par code ; vents en temps réel ; pupitres calculés ; la musique qui suit le jeu sur faits publics) | **Recevoir** | Reprendre un point (lequel) |
| **R2** | Les six thèmes originaux : I « Les Quatre Voies » (le motif de quatre notes en quartes), II « La ville la nuit » (le motif renversé), III « Duel » (riff de blues), IV « Les Maisons » (un thème, quatre couleurs), V « Kaï » (riff sur la blue note), VI « Championnat » (big band) | **Recevoir** | Recevoir avec retours (lesquels) ; recomposer un thème |

## Écoute, version par version

| Entrée | Aperçu | Ce qu'on entend | Recommandation | Alternatives |
|---|---|---|---|---|
| **E1** | `I-1.ogg` | Titre : levée, la tête au vibraphone (balais puis ride), puis un chorus de piano ; le pont et le dernier A plus intenses (126) | **Recevoir** | Tempo ; instrument de la mélodie |
| **E2** | `I-2.ogg` | Menus : le thème en lounge lofi, Rhodes, souffle de vinyle (80) | **Recevoir** | Plus ou moins lofi |
| **E3** | `I-3.ogg` | Récit : ballade au piano, nappe, contrebasse et balais au deuxième passage (64) | **Recevoir** | Plus nu ; autre tonalité |
| **E4** | `II-1.ogg`, `II-1-duo.ogg`, `II-1-vents.ogg`, `II-1-champion.ogg` | Le Quai et la Place du Fanal : cool jazz de film noir en ré mineur (96) ; la tête s'ouvre sur le motif renversé (la, mi, fa, do) ; sa couleur : une longue quarte augmentée sur les accords lydiens ; au prologue une guitare et une contrebasse, puis le trio (piano), puis le ténor et la trompette bouchée, puis les cuivres et la tierce picarde en champion | **Recevoir** | Plus lent ; une autre formation par chapitre |
| **E5** | `II-2.ogg` (et `-duo`, `-vents`, `-champion`) | Le Parvis et la Grande Cour : la même tête en ré majeur, swing festif (138) ; guitare en quatre, coups de cuivres, soli de cuivres en champion | **Recevoir** | Moins rapide ; sans cuivres |
| **E6** | `II-3.ogg` (et `-duo`, `-vents`, `-champion`) | Les Ruelles et la Ville haute : la tête en valse (une mesure à quatre devient deux à trois), ré dorien, vibraphone ; le contre-chant joué à l'envers (flûte avec les vents, piano dans le trio), guitare nylon au prologue, cordes en champion (112, à trois temps) | **Recevoir** | Contre-chant plus discret ; sans valse |
| **E7** | `III-1.ogg`, `III-2.ogg`, `S-couche-*.ogg` | Duel : un riff de contrebasse doublé au piano, la tête au vibraphone et au ténor (144) ; duel tendu : riff raccourci, la tension d'office, la tête renversée au dernier A (156) ; chaque couche seule | **Recevoir** | Riff plus discret ; tempo |
| **E8** | `IV-1.ogg` … `IV-4.ogg`, `S-plein-IV-*.ogg` | Les Maisons, un thème, quatre couleurs : Cendre en hard bop (trompette ouverte et ténor, 168) ; Voile cool en dorien (flûte et trompette bouchée, balais, 110) ; Ronce en blues lent (ténor aux notes bleues, contrebasse à l'archet, guitare, 92) ; Astre en lydien (vibraphone, Rhodes, cordes, grande salle, 120) | **Recevoir** | Une couleur à reprendre (laquelle) |
| **E9** | `V-1.ogg`, `S-plein-V-1.ogg` | Kaï : blues rapide en mi (176), le riff monte par la blue note (si bémol), la réponse par le motif des quatre voies ; au deuxième chorus, la rythmique s'arrête et ne frappe que les accents (il fanfaronne) ; son thème entre dès qu'il surgit en ville et continue dans le duel | **Recevoir** | Moins rapide ; sans le chorus arrêté |
| **E10** | `VI-1.ogg`, `VI-2.ogg`, `S-plein-VI-*.ogg` | Championnat : big band en si bémol (150) ; la tête passe des saxophones (soli) à la trompette et aux cuivres, aux cuivres en soli au pont, à tout l'orchestre au dernier A ; Finale un ton plus haut, plus rapide, avec les cordes (160) | **Recevoir** | Moins dense ; Finale encore plus ample |
| **E11** | `victoire.ogg`, `defaite.ogg`, `carte.ogg`, `chapitre.ogg` | Les jingles tirés du motif ; au jeu, la fin du duel s'arrête sur le temps fort (cymbale étouffée) puis le jingle ; la carte gagnée attend la fin du jingle de victoire ; le titre de champion prend le jingle de victoire | **Recevoir** | Plus courts ; plus éclatants |
| **E12** | `I-1-envers.ogg`, `-renversee`, `-mineur`, `-lente` | La leçon de Zelda sur la tête du titre (à l'envers, renversée, autre mode, valeurs doublées) ; le procédé fait la ville (mode majeur, valse), le contre-chant à l'envers, le duel tendu (tête renversée) et les Maisons (quatre modes) | **Garder le procédé** | En faire aussi des variations de jeu |

## La musique qui suit le jeu

| Entrée | Ce qui se passe | Aperçu | Recommandation | Alternatives |
|---|---|---|---|---|
| **J1** | Les couches du duel : la mélodie entre au premier Clash (sur la mesure), la tension quand les PV d'un camp passent sous 30 % ou en prolongation (le thème III passe au duel tendu, sur la phrase), les cuivres à une Signature annoncée | `S-duel.ogg` | **Recevoir** | La mélodie d'emblée ; seuil de tension à 25 % ou 40 % |
| **J2** | Les ponctuations, sur le temps et dans l'accord qui sonne : Clash gagné (une gerbe au vibraphone et la cloche), perdu (un accord sourd dans le grave), Signature annoncée (tout l'orchestre), prolongation (roulement et crash) ; rien sur une égalité | `S-ponctuations.ogg` | **Recevoir** | Plus discrètes ; seulement Signature et prolongation |
| **J3** | La ville qui grandit avec l'histoire (prologue et I : guitare et contrebasse ; II-III : le trio ; IV-V : les vents ; champion : cuivres, cordes) | `II-*-duo/vents/champion.ogg` | **Recevoir** | Une autre répartition |
| **J4** | Le combo du Fanal : une source localisée devant la porte du bar sur le Quai (le lounge, étouffé de loin, clair tout près ; la ville s'efface d'autant) | `S-ville.ogg` | **Recevoir** | Une autre musique pour le combo ; une source sur la Place du Fanal |
| **J5** | Le focus : sous un dialogue, un écran de l'aventure ou une préparation, la musique baisse de 5 dB et s'adoucit ; la ville s'assourdit à l'entrée en duel jusqu'au premier temps du duel | `S-ville.ogg`, `S-transitions.ogg` | **Recevoir** | Plus ou moins d'effacement |
| **J6** | Les scènes du récit (prologue, émissaire, affiliation, chef vaincu, cartons, Championnat, titre) prennent la ballade (I-3) ; un carton de chapitre a son jingle ; les arrivées de quartier gardent la musique du quartier | — | **Recevoir** | La ballade aussi aux arrivées |
| **J7** | Rôle musical des duels : Kaï (prologue, ses événements, son défi, le bras droit de la Cendre, le Miroir quand c'est lui ; au jeu standard, la Braise) ; Championnat (poule, Miroir) ; Finale ; Maison (cadet, bras droit, chef, Joute) ; le reste : le duel | — | **Recevoir** | Les Épreuves de quartier dans la couleur de la famille |

## Les instruments

| Entrée | Instrument | Comment il est fait | Recommandation | Alternatives |
|---|---|---|---|---|
| **S1** | Piano, Rhodes, vibraphone, contrebasse, batterie | calculés une fois (additif inharmonique, FM, lames, corde pincée, cymbales en partiels et bruit) | **Écouter d'abord** (`instruments/piano.ogg`, `rhodes.ogg`, `vibra.ogg`) | Plus brillant, plus mat |
| **S2** | Guitare jazz, guitare nylon | corde pincée en additif, peigne du micro (jazz), caisse (nylon) | **Écouter d'abord** (`guitare.ogg`, `nylon.ogg`) | Plus de médiator ; plus sombre |
| **S3** | Trompette bouchée (Harmon), trompette ouverte, saxophone ténor, flûte | synthétisés en temps réel : une voix par phrase, port de voix entre notes liées, attaque à la langue entre notes détachées, timbre qui suit la nuance, vibrato tardif, souffle, coulé par en dessous et chute | **Écouter d'abord** (`trompette.ogg`, `trompette-ouverte.ogg`, `sax.ogg`, `flute.ogg`) — le plus délicat | Moins de vibrato ; plus de souffle |
| **S4** | Pupitres de cuivres et de saxophones | calculés avec les profils des vents, bouclés sur leur tenue, élargis par un chorus | **Écouter d'abord** (`cuivres.ogg`, `saxes.ogg`) | Plus brillants ; plus doux |
| **S5** | Cordes, contrebasse à l'archet | temps réel : dents de scie désaccordées, chorus (cordes) ; bruit d'archet et corps (archet) | **Écouter d'abord** (`cordes.ogg`, `archet.ogg`) | Plus de vibrato ; moins de cordes |

## Mélange, coût, réglages

| Entrée | Objet | Recommandation | Alternatives |
|---|---|---|---|
| **M1** | Les niveaux (mesurés, `artifacts/qa/m13/mesures.md`) : titre et menus vers −18 LUFS ; la ville vers −20 (elle grandit en instruments, pas en volume : une correction par formation) ; un duel complet vers −18 ; crêtes sous −3 dBTP | **Recevoir** | Ville plus présente ; duel plus discret |
| **M2** | Les salles : club pour le jazz, studio pour le lounge, grande salle pour le récit, l'Astre et la Finale | **Garder** | Plus ou moins de réverbération |
| **M3** | Le coût, mesuré dans le conteneur cloud (lent) en rendus hors ligne : la plupart des versions de 6 à 35 fois plus vite que le temps réel ; le big band au complet environ 6 fois, la Finale environ 4 fois ; instruments calculés environ 2 s dans un worker au premier geste (la musique demandée d'abord) ; environ 50 Mo en mémoire | **Mesurer sur le poste du responsable** (en local) | Alléger la Finale (moins de cordes) ; ne calculer que les instruments du moment |
| **M4** | Le volume de la musique : 60 % par défaut, sous le volume général ; à 0 %, rien n'est calculé ni joué et les anciens sons reviennent | **Recevoir** | Autre défaut |

## Suite

| Entrée | Objet | Recommandation | Alternatives |
|---|---|---|---|
| **N1** | D'autres thèmes pour les situations qui demandent une identité propre (une figure, un quartier, les cinématiques de Kaï) : ils s'ajoutent au catalogue sans rien changer au reste | **Après l'écoute**, selon les retours | Tout de suite |
| **N2** | Le combo du Fanal sur la Place du Fanal (une source au pied du phare) | **Après l'écoute** | Non |
