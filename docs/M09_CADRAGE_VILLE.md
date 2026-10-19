# M09 V0 — Cadrage de la ville d'exploration HD-2D

**Statut : proposé** (session cloud autonome du 2026-10-19, sans le responsable). Rien ici n'est décidé : chaque choix
structurant est repris dans `docs/FICHE_ARBITRAGES_M09.md` avec son option recommandée et ses alternatives. Aucune
règle du duel ne change (V3.0, delta V3.2, D-01 en V3.3), aucune fuite de secret (ADR 011).

Sources : `docs/missions/M09_VILLE_EXPLORATION_HD2D.md`, ADR 021 (V2), 022 (lieux de duel), 023 (PNJ), `src/product/`
(rencontres, progression, sauvegarde), références de travail `reference/generated/2026-10-19-quai-nuit-cameras/`,
Cité du Tournoi (`github.com/juniorbattle/RPG-ArtByCode`, commit `0398c4f`, lecture seule : DA, brume, lanternes,
échelle ; **pas** sa caméra).

## 1. Intention

La ville est le **liant** du jeu : on y marche, on y rencontre des duellistes, on y entre dans les lieux de duel. Elle
**mène** aux duels, elle ne modifie pas l'écran de duel (plateau, HUD, cadrage du rival, ADR 013 à 023). Elle prolonge
les décors déjà validés : la rue (« le Quai, la nuit »), le Fanal, la salle de jeu de cartes, l'arène.

Direction du responsable : « une ville d'exploration HD-2D RPG avec plusieurs zones (ville, quartiers, déplacements) »,
DA de Cité du Tournoi (nuit indigo / ardoise, pierre froide, ambre seul accent chaud, ivoire désaturé, accessoires aux
points focaux), sans sa caméra ; personnages génériques sur le socle V2 en attendant Aseprite pour les personnages clés ;
et, pour la démo : « de l'écran du début du jeu avec nouvelle partie […] aux tutoriels nécessaires, déplacement en
ville, et combat ».

## 2. Structure : ville → quartiers → îlots

| Niveau | Définition | Exemple |
|---|---|---|
| **Ville** | la cité portuaire des Quatre Voies, une carte de quartiers reliés | (carte, plus tard) |
| **Quartier** | un ensemble d'îlots d'une même ambiance, une famille dominante | le Port (Cendre et Ronce), la Ville haute (Astre), les Ruelles (Voile) |
| **Îlot** | une scène jouable chargée d'un bloc (≈ 40 × 14 m), avec ses sorties | le Quai, la Place du Fanal, le Parvis de l'arène |
| **Lieu** | un intérieur ou une scène de duel existante (ADR 022), atteint par une porte | salle de jeu de cartes, le Fanal, l'arène, la rue |

Proposition de démo (un seul quartier, **le Port**) :

- **Îlot 1 — le Quai** (prototype V1/V2) : quai pavé le long de l'eau, bateaux amarrés, étal à toile ivoire, grappes de
  lanternes, façade du Fanal et entrée de la salle de jeu de cartes. Point d'arrivée de la démo.
- **Îlot 2 — la Place du Fanal** (plus tard) : terrasse, enseigne, PNJ attablés ; entrée du bar.
- **Îlot 3 — le Parvis de l'arène** (plus tard) : grande porte, gradins devinés, foule en silhouettes ; entrée de l'arène.

Liaisons : une **sortie** est une zone de bord d'îlot (passage, escalier, pont) qui charge l'îlot voisin par un fondu
au noir court (≈ 300 ms), le personnage réapparaît au point d'entrée correspondant. Pas de monde continu : un îlot à la
fois en mémoire (budget mémoire maîtrisé, préparation du voisin aux temps morts comme les lieux de duel, C1/C2).

## 3. Déplacements

- **Clavier** : ZQSD / WASD et flèches ; Maj = marcher (par défaut on court doucement) ; **E / Entrée / Espace** =
  interagir ; Échap = menu. **Souris** : clic au sol = aller vers ce point (ligne droite, arrêt sur obstacle) ; clic sur
  un PNJ ou une porte = y aller puis interagir. Manette : plus tard.
- Mouvement continu sur le plan du sol (x, z), vitesse ≈ 3,2 m/s (marche 1,6 m/s), accélération courte, pas de saut.
- **Collisions simples** : le personnage est un disque (rayon 0,3 m) ; obstacles = rectangles alignés (façades, étal,
  caisses, bord du quai) et disques (lampadaires, bornes) ; glissement le long des murs (résolution axe par axe).
- **Zones** : rectangles nommés au sol (déclencheurs) : `porte` (entrée d'un lieu), `sortie` (îlot voisin), `parler`
  (rayon autour d'un PNJ), `info` (panneau, bannière). Une bulle « E — Entrer au Fanal » apparaît quand on est dedans.
- Toute la logique (déplacement, collisions, zones, déclencheurs) est **pure et testée** (`src/ville/monde.ts`), sans
  Three.js ni DOM, comme le moteur du duel.

## 4. Entrée en duel depuis la ville

Trois chemins, tous vers l'écran de **préparation existant** (deck, Techniques, rival, lieu), puis le duel inchangé :

1. **PNJ de la ville** (ADR 023) : on s'approche, E → bulle de défi (réplique générique du gabarit), « Défier » / « Plus
   tard ». Le duel se joue **dans le lieu de l'îlot** : sur le Quai, la rue (`venue: 'rue'`, déjà le lieu des « Duels
   de la ville » depuis la RC 0.8).
2. **Rivaux signatures** : Kaï attend sur le Quai (duel libre dans la rue) ; le **Tournoi du Quai** s'inscrit à
   l'entrée de la salle de jeu de cartes (manches dans la salle, ordre et déblocages actuels inchangés).
3. **Lieux** : entrer dans le Fanal ou l'arène ouvre leurs duels (Maëlle au bar, Orin à l'arène) ; dans la démo, la
   porte mène à la préparation du duel de ce lieu (pas d'intérieur explorable).

Retour : à la fin du duel, l'écran de résultat (inchangé) propose **« Retour au Quai »** ; on réapparaît devant le PNJ
ou la porte, le PNJ vaincu change de réplique. La sauvegarde garde l'îlot et la position (champ facultatif, voir §8).

## 5. Les quatre lieux existants dans la ville

| Lieu (ADR 022) | Où dans la ville | Rencontres |
|---|---|---|
| la rue (« le Quai, la nuit ») | **c'est le Quai lui-même** : un duel sur le Quai se joue dans ce décor | Kaï (libre), les quatre PNJ |
| la salle de jeu de cartes | porte voûtée sur le Quai (îlot 1) | Tournoi du Quai (3 manches), Sélène |
| le Fanal (bar) | façade éclairée sur le Quai (îlot 1), puis sa place (îlot 2) | Maëlle |
| l'arène | Parvis de l'arène (îlot 3) ; dans la démo, accessible par une sortie qui mène directement à la préparation | Orin |

## 6. Fil narratif : le Tournoi du Quai

Arrivée au port un soir de tournoi. Une marchande (PNJ, tutoriel) explique qu'on se défie aux cartes partout sur le
Quai et que le Tournoi se tient dans la salle de jeu. Kaï, docker et favori du Quai, provoque le joueur. Boucle : défier
un ou deux PNJ pour se faire la main → s'inscrire au Tournoi (Kaï, puis Maëlle, puis Sélène) → les lieux voisins (le
Fanal, l'arène) ouvrent les duels libres. Données de prototype, non canoniques (comme `encounters.ts`).

## 7. Boucle de démo cible

1. **Accueil** (existant) → **Nouvelle partie** : nom, voie, Techniques (existant).
2. **Arrivée au Quai** : fondu sur l'îlot, **tutoriel de déplacement** en trois bulles non bloquantes (se déplacer,
   interagir, menu) ; marchande-guide à quelques pas.
3. **Premier défi** : un PNJ docker propose un duel d'apprentissage → préparation → **duel avec son tour guidé**
   (existant, ADR 018) → résultat → **retour au Quai**.
4. **Le Tournoi** : porte de la salle de jeu de cartes → manche 1 contre Kaï → retour.
5. Accès aux écrans existants depuis la ville (menu : deck, collection, options, aide, sauvegarder et quitter).

Ce qui existe déjà : 1, la préparation, le duel, le résultat, la sauvegarde et la reprise. À construire : 2, 3 (bulles,
défi, retour), 4 (porte), le menu de ville, et la reprise « dans la ville ».

## 8. Intégration au produit (proposée, réversible)

- Le prototype vit dans `src/ville/` et s'ouvre par `?ville=1` (laboratoire) ; le jeu par défaut reste **identique au
  pixel près** tant que le responsable n'a pas validé l'intégration (règle M09).
- Pour la démo, une entrée **« Explorer le Quai (démo) »** sur l'accueil et le tableau des rencontres, seulement avec
  `?demo=1` dans un premier temps (même règle d'identité), puis par défaut après validation.
- Écran `ville` dans le flux du produit (`src/product/flow.ts`) : la ville devient le **hub** à la place du tableau des
  rencontres ; le tableau reste accessible depuis le menu (« Toutes les rencontres »).
- Sauvegarde : champ facultatif `ville: { ilot, x, z }` ; absent = début au point d'arrivée (pas de migration de schéma
  obligatoire : lecture tolérante).
- Une seule scène WebGL pour toute la session (règle M04) : la ville est une **scène Three.js** distincte de l'arène,
  rendue par le même renderer ; on bascule de scène sans recréer le contexte.

## 9. Caméra (décision au responsable)

Deux options comparées dans le laboratoire V1 (`?ville=1&cam=dessus|frontale`), derrière une interface commune
(`CameraRig` : `update(cible, dt)`, `resize`, `params`) pour que l'autre reste branchable :

- **Vue de dessus inclinée** (perspective, ≈ 45°) : lit le plan du quai, les portes et les PNJ autour ; proche de la
  référence 01 et d'Octopath Traveler ; les façades sont vues de haut (toits, ardoise), le personnage plus petit.
- **Frontale 2.5D** (≈ 15°) : plans de profondeur, façades de face, personnages plus grands et proches du cadrage du
  duel ; déplacement surtout latéral, la profondeur se lit moins.

Recommandation et mesures : ADR 024 (proposé).

## 10. Budget de performance (cibles, à confirmer sur GPU réel)

| Poste | Cible | Mesure dans le cloud |
|---|---|---|
| Image (Radeon 780M, 1080p) | ≤ 8 ms GPU en ville (60 i/s avec marge ; le duel tient le plafond 165 Hz) | SwiftShader seulement, non représentatif |
| Appels de dessin | ≤ 150 par image (Cité du Tournoi : 108 à 114 pour un îlot plus riche) | relevé par `renderer.info` |
| Triangles | ≤ 150 k | relevé |
| Textures d'un îlot | ≤ 40 Mo (les quatre lieux de duel : ≈ 66 Mo gardés montés) | relevé |
| Entrée dans un îlot | ≤ 300 ms (fondu) ; préparation du voisin aux temps morts | relevé |
| Passage ville → duel | ≤ 1 image d'à-coup, préparation du lieu et du rival aux temps morts (C1, C2) | relevé |
| Programmes GPU | partagés : un matériau « nuit » paramétré (Cité du Tournoi) plutôt qu'un par objet | relevé |

## 11. Questions ouvertes (fiche d'arbitrages)

1. Caméra d'exploration : dessus inclinée ou frontale 2.5D (ADR 024).
2. Structure des zones : îlots chargés un à un (proposé) ou monde continu.
3. Entrée en duel : préparation systématique (proposé) ou lancement direct depuis la bulle de défi.
4. Intégration : la ville comme hub par défaut, ou une entrée « Explorer » à côté du tableau des rencontres.
5. Personnages de la ville : silhouettes V2 en pied dessinées par code (proposé pour la démo) ; échéance d'Aseprite pour
   les personnages clés (amendement de la règle « aucune image externe »).
6. Tutoriels : bulles non bloquantes (proposé) ou séquence guidée obligatoire.
7. Contenu narratif du Tournoi du Quai : textes de prototype à valider.
