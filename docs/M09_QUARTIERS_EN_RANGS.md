# M09 — Quartiers en rangs (conception proposée, passe 65)

> Demande du responsable (2026-10-20) : « je veux que les quartiers soient composés de plusieurs ruelles superposées qui
> débordent vers des places marchables, donc plus on s'enfonce dans les ruelles plus on découvre de nouveaux spots. Donc on
> aura 1er rang, 2e rang, 3e rang, voire un 4e rang ; design-moi de manière cohérente et structurée, tout en gardant un décor
> autour (sur les côtés correct) ; avec les images générées cela devrait être pas trop compliqué ni coûteux. »

État : **conception proposée**, preuve jouable au laboratoire (`?ville=1&qa=1&profondeur=1`), faite avec les plans actuels
découpés par script, sans aucune image générée. Le jeu et la démo gardent le Quai en bande. Décisions et historique :
ADR 028 (« Profondeur praticable », « Quartiers en rangs ») ; planche :
`screenshots/qa/m09/v4-profondeur/planche-profondeur.png`.

## 1. Le principe : une grammaire commune à tous les quartiers

Un quartier, vu de face (caméra frontale, ADR 024), est une suite de **rangs** parallèles à la caméra (schéma, du fond en
haut au premier plan en bas ; le plan exact du Quai est sur la planche) :

```
 fond      façade du fond (la ville haute, plus tard le monument du cœur)
 rang 4    flanc │ la cour : le cœur du quartier          │ flanc
 bande 3   ██[recul de la place]█████████│passage│███████████████
 rang 3    flanc │[place]  la ruelle ──────────────────────│ flanc
 bande 2   ███████│passage│███████████████[recul de la place]██████
 rang 2    flanc │ la ruelle ──────────────────────[place]│ flanc
 bande 1   ████│passage│████████████████████████│passage│███████
 rang 1    la rue du premier plan · portes · sorties vers les quartiers voisins
           ═══ l’eau, la balustrade, le bord du canal ═══
              ↑ caméra frontale : elle suit le personnage en profondeur
```

- **Rang 1** : la rue du premier plan, la plus large, avec les portes et les sorties vers les quartiers voisins (le Quai,
  le Parvis et les Ruelles actuels sont des rangs 1).
- **Bande bâtie** entre deux rangs : des maisons de 4 à 12 m de profondeur, dont on ne voit que la façade avant. Elle est
  percée de **passages** (2,4 m au moins). Les passages de deux bandes successives ne sont **jamais alignés** (axes à
  plus de 5 m) : on longe chaque ruelle pour trouver le suivant. C'est ce qui fait la découverte.
- **Rangs 2 à 4** : des **ruelles** de plus en plus courtes (largeur praticable qui diminue), fermées à leurs bouts par
  un mur. Chacune peut **déborder sur une place** : la bande qui suit recule sur une largeur donnée (6 m au moins), et la
  place porte le **spot** du rang (une halle, un puits, une chapelle, un personnage, plus tard une rencontre).
- **Le dernier rang est le cœur du quartier**. Proposition (C1 de l'ADR 028) : le cœur de chaque quartier s'ouvre sur la
  **Grande Cour**, au centre de la ville. Plus on s'enfonce, plus on monte vers le cœur de la ville.
- **Décor autour (les côtés)** : les façades des bandes continuent au-delà des bouts des ruelles (`decor`, 62 m pour
  le Quai, plus large que la vue). Des **flancs** ferment chaque ruelle : ce sont les maisons des côtés, vues de face sur
  sa ligne avant. Des murs ferment les bouts, avec une brume sombre où la ruelle se perd dans la nuit. Aucun vide sur
  les côtés.
- **Au plus 4 rangs.** Au-delà, la caméra frontale ne lit plus les rangs. Le sol reste plat ; des rangs en terrasses
  (relief, escaliers) sont possibles plus tard, mais demandent de la hauteur dans la logique de marche.

La grammaire est du code pur, commun à tous les quartiers (`src/ville/rangs.ts`) :

- `checkRangs` contrôle un quartier : nombre de rangs, profondeurs, passages dans les deux rues qu'ils relient, passages
  jamais alignés et jamais dans le recul d'une place, et une façade gardée derrière chaque place.
- `planRangs` en tire le plan : rues, places, bandes, façades découpées aux passages et aux places, flancs, murs,
  obstacles et bornes.

Le diorama et la logique de marche lisent ce même plan.

## 2. Lisibilité : caméra, fantôme, fondu

- **Caméra frontale qui suit en profondeur.** Elle suit 90 % du déplacement en z et s'incline de 6° sur le quai à 16°
  dès le rang 2. Le personnage reste lisible : 120 px sur le quai, 98 px au quatrième rang, en 1920 × 1080.
- **Fantôme du rang de devant.** Comme sur l'image jointe par le responsable (passe 63), les façades sont à 12 %. Le bloc
  directement devant le personnage passe en fantôme dès qu'il passe derrière. Quand il dépasse toute la bande, son rang
  de devant entier passe en fantôme : façades, flancs, murs, et le halo des lanternes peintes dessus (champ `coupeZ`,
  passe 65). On voit alors toute la ruelle où l'on est, et non plus une fente.
- **Fondu lointain.** Ce que la caméra dépasse s'efface tout à fait, de 12 à 18 m devant le personnage : les rangs
  dépassés de deux, et leurs halos.
- **Fantôme assourdi** (passe 67) : gris et plus sombre, pour que les détails clairs (emblèmes dorés, vitraux) ne flottent
  pas dans la vue. Le sol et le pied des rangs dépassés restent visibles : ce sont les repères du chemin du retour.
- **Balises des passages** (passe 67, demandées par le responsable) : à chaque bouche d'un passage, une lueur ambrée au
  sol et trois chevrons qui filent lentement vers le rang où il mène, à l'aller comme au retour. Le nom de ce rang
  s'affiche en approchant (« Vers la rue Haute », « Retour vers le Quai »). La grammaire les donne (`balisesRangs`) et le
  moteur les dessine (`balises.ts`).
- **Raccords** (passe 67) : chaque façade est un morceau de frise posé d'un mur mitoyen à un autre (jamais une maison
  coupée) ; les murs des passages restent sous la ligne des toits ; le monument du cœur prend place au milieu d'une
  rangée de maisons.
- **Flou de profondeur.** Il reste net du bord du quai au fond du quartier ; le flou de premier plan reste devant la
  caméra quand elle s'enfonce.

## 3. Le Quai en quatre rangs (la preuve)

| Rang | Nom | z (m) | Étendue (m) | Spot | Vers le rang suivant |
|---|---|---|---|---|---|
| 1 | le Quai | −3 à 3,4 | −19 à 19 | portes de la salle et du Fanal, sorties | passages ouest (x −12) et est (x 12,7) |
| 2 | la rue Haute | −17 à −11 | −17 à 17 | **place de la Halle** (est, recul 6 m) : étal, marchande, commis | passage à x −6,5 |
| 3 | la ruelle des Lanternes | −29 à −25 | −14 à 14 | **placette du Puits** (ouest, recul 5 m) : puits, joueuse | passage à x 7 |
| 4 | la cour de la Chapelle | −43 à −36 | −10 à 10 | le cœur : la ville haute au fond, un docker ; (proposé) vers la Grande Cour | — |

Bandes de 8, 8 et 7 m. On ne traverse pas tout droit : par l'ouest, on passe le passage ouest, la rue Haute, le passage
du rang 2, la ruelle des Lanternes (vers l'est), puis le passage du rang 3 et la cour. C'est 56 plans découpés dans
10 images, pour 87,4 Mo de mémoire GPU, avec 16 lumières et 10 brumes.

## 4. Les autres quartiers (même grammaire)

Propositions, à valider ; chaque quartier garde son rang 1 actuel.

| Quartier | Rang 2 et sa place | Rang 3 et sa place | Rang 4 (le cœur) |
|---|---|---|---|
| **Parvis de l'arène** | la rue des Gradins ; place des Paris (bookmakers, tableau des duels) | l'escalier des Champions (rampe vue de face) ; placette des Armes | la cour des Champions, au pied de l'arène |
| **Ruelles** | la ruelle des Tanneurs ; la fontaine du Voile (déjà dans l'îlot) | le passage couvert ; placette des Joueurs (tables de cartes) | la cour de la Guilde des joueurs |
| **Grande Cour (V5)** | elle-même est le cœur commun ; ses côtés ouvrent sur le rang 4 de chaque quartier | — | — |

## 5. Les images : un kit, pas des décors (5 images, 21 sur 30)

Le coût reste bas parce que chaque image est un **kit** : découpée par script (`uv`), recalée et reposée à plusieurs
rangs et dans plusieurs quartiers. La preuve fait déjà tout le Quai en quatre rangs avec les images de la porte. Le kit
(`tools/m09-lot-quai-3.mjs`) a été **généré après l'accord du responsable (passe 66)**. Il est traité par script
(`tools/m09-kit-rangs.mjs` : cinq planches, découpes dans `art-src/decors/kit-rangs.json`) et posé dans le Quai en
quatre rangs. Il remplace les plans approximatifs, et reprend aussi les deux images annoncées à la passe 63 :

| Image | Contenu | Usage (découpes) |
|---|---|---|
| K1 `rangs-ruelle-a` | rangée de 5 maisons de ruelle à l'échelle des personnages (boutiques, portes, lanternes) | fonds et flancs des rangs 2 et 3, recalés |
| K2 `rangs-ruelle-b` | rangée de 4 maisons d'artisans (atelier ouvert, escalier extérieur, porche couvert, tripot) | idem, en alternance avec K1 ; le porche marque un passage |
| K3 `rangs-murs` | 3 murs de côté (colombages et lanterne ; pierre et plâtre ; pignon avec porte cochère fermée) | murs des passages, des places et des bouts des ruelles |
| K4 `rangs-monuments` | 3 monuments (halle à arcades ; maison des joueurs ; chapelle des marins) | fonds des places et du cœur |
| K5 `rangs-mobilier` | 6 objets (puits, fontaine, étal, banc et olivier, charrette, niche votive) | mobilier des places et des ruelles, obstacles |

Après le kit, chaque quartier ne demande qu'une ou deux images propres, par exemple son monument. La teinte, les
lumières et les bannières se règlent par script.

## 6. Contrat technique (passe 65)

- **Plans par îlot** : 64 au plus (au lieu de 24). Les plans découpent quelques images partagées ; le budget de 160 Mo
  de mémoire GPU reste la vraie borne.
- **Brumes** : 10 au plus (au lieu de 6).
- **Fichiers par îlot** : 48 Mo au plus depuis la passe 66 (au lieu de 32 Mo) ; le Quai en rangs habillé du kit pèse
  38 Mo, le Quai actuel 23 Mo.
- **Nouveaux champs** :
  - `coupeZ` sur un plan `coupe` et sur une lumière : le rang dépassé passe en fantôme ;
  - fondu lointain de tous les plans d'un diorama en rangs (réglé par `LOIN`).
- **Plans actuels inchangés.** Le nuanceur d'effacement reste réservé aux dioramas qui ont des plans `coupe` : le Quai
  actuel est identique au pixel près.

## 7. Ce qui reste provisoire

Depuis la passe 66, le Quai en quatre rangs est habillé du kit. Restent provisoires :

- le fond de la cour, la ville haute peinte pour être vue de loin, devant laquelle se dresse la chapelle du kit ;
- les emblèmes brodés des rangs passés en fantôme, qui restent visibles à 12 % parce qu'ils sont clairs ;
- le sol des blocs passés en fantôme, qui montre les pavés comme sur l'image jointe par le responsable.

Rien n'est approuvé (`approved: false`) ; l'approbation en bloc vient après la vérification des conditions d'OpenAI.
