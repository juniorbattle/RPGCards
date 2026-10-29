# Retours du test du responsable (2026-10-29) : ce qui a été corrigé

Le responsable a joué et rapporté cinq points (« globalement satisfait », « ce sont les gros points sur lesquels on doit
travailler et peaufiner »). Chacun est corrigé par le code seul : aucune image créée ni modifiée, aucune approbation
changée, règles du duel inchangées, jeu par défaut au repos identique au pixel près.

## 1. Musique : une pause entre deux morceaux

> « je trouve les changements de musiques trop brutal, je pense que la transition devrait se faire avec une pause sans
> musique avant d'enchaîner vers la nouvelle »

- Plus de fondu enchaîné où deux morceaux se chevauchent. Le morceau qui joue s'efface à partir du temps suivant
  (1,8 s), puis **un silence de 1,5 s**, puis le nouveau commence par sa levée (`src/son/musique/enchainement.ts`,
  `Lecteur.enchainer`, `Orchestre`).
- Le duel qui se tend (même thème) passe par un **break** : l'orchestre s'arrête net sur la phrase, sur la cymbale
  étouffée, une mesure de silence, puis le duel tendu repart.
- Après le jingle de fin d'un duel, le même silence avant la ville ; la carte gagnée suit le jingle de victoire, et le
  silence se déplace après elle.
- Si l'on change encore de lieu pendant le silence, le morceau prévu est remplacé sans allonger le silence.
- À écouter : `artifacts/audio/m13/S-transitions.ogg` (menus, titre, la ville, un duel, sa fin, la ville),
  `S-duel.ogg` (le break vers le duel tendu), `S-ville.ogg` (l'entrée en duel). Le laboratoire `?musique=1` enchaîne de
  la même façon. Durées réglables en une ligne si la pause semble trop longue ou trop courte (`FONDU_SORTIE_S`,
  `SILENCE_S`).

## 2. Exploration : la marche de côté

> « un problème d'animation de marche sur les côtés de tous les personnages […] on a l'impression que la marche est
> bloquée tandis que marcher vers l'avant et vers l'arrière fonctionnent bien »

- Cause : les quatre temps de profil des feuilles sont quatre foulées ouvertes presque pareilles ; une foulée qui glisse
  se lit comme une figure figée (de face et de dos, les jambes alternent bien).
- Correction : de profil, le cycle alterne **deux foulées et une pose de passage** (jambes rapprochées), choisies en
  mesurant les pieds de chaque feuille au chargement, et la figure se soulève d'un pixel d'art au passage
  (`cycleProfil`, `src/ville/sprites.ts`). Joueur, PNJ qui viennent au joueur et passants : tous en profitent.
- Preuves : `screenshots/qa/retours-2026-10-29/marche-profil-cycle.png` (les cycles avant et après, cinq feuilles),
  `marche-profil-jeu-avant-apres.png` (au navigateur : avant, toujours des foulées ; après, foulées et passages) ;
  `test/marche-profil.test.ts` sur les 13 feuilles.

## 3. Cinématiques : le cadrage

> « il peut parfois y avoir des problèmes d'angle de caméra comme la première scène avec le rival où l'angle n'est pas
> optimal, donne l'impression de manquer le cadre de vue »

- Cause : les plans se réglaient par rapport au cadrage de l'îlot (plus près, plus bas) ; sur le Quai en rangs, visé à
  4,8 m de haut, les personnages restaient en bas du cadre, à moitié sous la boîte de dialogue.
- Correction : une scène **cadre ses personnages** sur leur hauteur réelle : pieds aux sept dixièmes de l'écran,
  au-dessus de la boîte de dialogue, personnages sur trois dixièmes de la hauteur, tous dans la largeur, la caméra à leur
  profondeur (`cadrageSujets`, `src/ville/cameras.ts` ; `sur`, `src/aventure/cinematiques.ts`). Kaï au prologue, Kaï qui
  surgit, les guetteurs, la foule et l'émissaire, les chefs, l'affiliation, les dialogues de scène.
- Preuves : `screenshots/qa/retours-2026-10-29/cinematiques/` (parcours complet, 42 vérifications sur 42 ; à comparer
  avec `screenshots/qa/m11/cinematiques-1280/`, par exemple `13-prologue-kai-dialogue.png`) ; un test vérifie par la
  projection de la caméra que les pieds tombent au-dessus de la boîte de dialogue.

## 4. Duel : les temps forts

> « les éléments s'affichent parfois trop vite surtout pour les annonces d'effets et ou obtention d'infos suite à
> l'usage d'une compétence. […] laisser cela visible tant que le joueur ne clique pas pour passer à la suite quand cela le
> concerne et par défaut augmenter la durée des infos affichées »

- **Durées par défaut allongées d'environ trois quarts** (un effet : 2,2 s au lieu de 1,25 s).
- **Ce qui concerne le joueur reste posé jusqu'à son clic** (ou Espace, Entrée), avec l'invite « Cliquer pour
  continuer » : les effets de ses cartes, ce que ses Techniques lui apprennent (regards privés, Lecture, Recentrage), et
  ce que le rival lui fait (effet qui le frappe, Interférence réussie sur son soutien, camouflage levé, Secondaire
  repoussée, Signature annoncée, qui peut lui faire réviser son engagement). La résolution et le rival attendent ce clic.
  Passent seuls : l'annonce d'une Technique (le regard qui suit porte ce qu'elle apprend), les pastilles (Insight, soin),
  le bandeau des conditions non remplies, les révélations (`attendClic`, `src/presentation/activations.ts`).
- Au rythme normal seulement (le rythme rapide reste minuté, l'instantané ne montre rien) ; « Passer » vide toujours
  tout ; coupé en QA sans `?tenir=1` (les pilotes de QA ne cliquent pas).
- Preuves : `screenshots/qa/m12/activations/tenu-attend-le-clic.jpg`, `tenu-en-duel.jpg` ; `tools/m12-activations.mjs`
  (tenue, clic, Espace, un vrai duel qui avance après les clics).

## 5. Ville : les décors en image plate

> « les décors props qui représentent des images en billboard […] brisent l'immersion […] une image avec un escalier […]
> l'escalier semble aplati ; […] une taverne avec son intérieur […] l'intérieur aplati »

- Cause : chaque image du décor est un plan ; ce qui y est peint en profondeur (intérieurs ouverts, arcades, escaliers,
  balcons) bouge avec la façade quand la caméra suit le joueur, et se lit comme une image collée.
- Correction : **un relief pour les plans peints** (`src/ville/reliefs.ts`, nuanceur des plans `src/ville/diorama.ts`).
  Pour chaque image, les formes qui ne sont pas dans le plan de sa façade sont décrites en données, avec leur profondeur
  en mètres ; le nuanceur lance le rayon de la caméra dans cette carte des profondeurs. Vue de biais, l'intérieur d'une
  arcade glisse derrière ses piliers (et son jambage reste dans l'ombre), un escalier s'avance devant le mur, la colonne
  d'une fontaine recule derrière sa vasque. Vu de face, rien ne change.
- Décrits : la taverne et le passage voûté du Quai, la Salle des Bannières et les échoppes ; la Halle (trois arcades),
  la maison du Puits (perron, balcon, vitrine, auvent), la chapelle ; les remises ouvertes et les escaliers des frises
  des rangs du fond ; la remise des cordiers de la Place du Fanal et la maison de la Ronce ; la grande porte et les
  échoppes de la Grande Cour, le monument des Quatre Voies, l'estrade du héraut et ses marches ; la guilde et le canal
  des Ruelles ; la porte du Tournoi ; les Hôtels et l'Observatoire ; le puits, la fontaine et les étals.
- Les toits restent dans le plan : un dégradé tordait leurs cheminées et leurs flèches (essayé, retiré).
- Un plan sans forme garde le nuanceur d'origine ; `?relief=0` coupe le relief (comparaison).
- Preuves : `screenshots/qa/retours-2026-10-29/relief-avant-apres.jpg` (cinq lieux, sans et avec relief) ; relevés des
  formes sur chaque image : `screenshots/qa/retours-2026-10-29/reliefs/` ; `test/reliefs.test.ts`.

## À faire en local

- **Écouter** les enchaînements (durée du silence) ; les régler au besoin.
- **Jouer** la marche de côté, les cinématiques et les temps forts tenus : l'effet se juge en mouvement.
- **Mesurer le coût du relief sur le poste** (Radeon 780M et RTX 4060) : un lancer de rayon de 24 pas, sur les seuls plans
  qui ont des formes. Le conteneur rend sans GPU (rendu logiciel) : le coût n'y est pas mesurable ; à faire au prochain
  jalon, avec `?relief=0` pour comparer.
