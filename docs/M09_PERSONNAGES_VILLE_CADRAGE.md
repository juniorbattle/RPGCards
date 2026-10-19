# Cadrage — régénération des personnages de la ville (Aseprite et/ou gpt-image-2), M09

Date : 2026-10-19 · Statut : **DÉCIDÉ par le responsable le 2026-10-19** (fiche interactive : les douze entrées sur
l'option recommandée, §8 ; ADR 027 ; amendement d'AGENTS appliqué) ; production pas commencée · Rédaction : worktree
local lancé par la session principale · Départ `d2b266a` (après la passe 47) · JOURNAL passes 48 et 51.

> **Amendé par l'ADR 028 (2026-10-19, passe 54).** Personnages en **pixel art net** (D2), cible de style = la
> référence initiale, le Quai la nuit vu de face (`reference/generated/2026-10-19-quai-nuit-cameras/02.png`), et non
> plus la référence D : le §3.4 (style aligné sur la direction D) et l'encre de 2,5 px ne valent plus ; traitement
> **par scripts seulement**, sans retouche à la main, une image qui ne tient pas est régénérée (D3) ; porte du Quai,
> décor et duelliste joueur, **30 images au plus** (D4, D10) ; résolution logique et agrandissement entier du pixel art
> fixés par l'essai technique (D7, D9). Le reste (grille 5 × 3, ancrage, alpha binaire, recoloration par tons clés,
> provenance, approbation) est inchangé.

Décision du responsable à l'origine (2026-10-19, JOURNAL passe 47, ADR 026 amendement 1) : « le décor d'environnement sur
nos PNJ, personnages actuels qui ont un design temporaire : on va régénérer cela avec Aseprite et/ou gpt-image-2 ». Ce
document prépare ce chantier : la règle à amender (§2), le cahier des charges des feuilles (§3), la chaîne de production
et de vérification (§4), les risques (§5) et **les décisions à demander au responsable (§6)**. Il ne produit aucun
personnage définitif.

---

## 0. En bref

- Les personnages de la ville seront des **feuilles de sprites** (5 × 3 cases : repos + 4 temps de marche ; face, dos,
  profil) chargées par `src/ville/spritesExternes.ts`, à la place des atlas dessinés par code de `src/ville/sprites.ts`.
  Le chargeur existe et est éprouvé (QA 3/3) mais il est **réservé à la QA** et son contrat a quatre manques à combler
  avant la production (§1.3) : résolution trop basse, statut d'approbation ignoré, apparition différée (« pop-in »),
  échelle et foulée figées.
- Il faut **amender deux règles** d'AGENTS (« images générées : références seulement », « aucune image externe au
  runtime ») pour la seule catégorie « feuilles de personnages de la ville », avec des garde-fous de provenance,
  d'approbation, de contenu, de licence, de secret et de coût. Texte prêt à adopter : §2.
- Le style se règle sur **la référence D** (`reference/generated/2026-10-19-quai-direction-d/01.png`) et sur les cartes
  du jeu : illustration encrée, aplats, couleurs des familles. **Jamais** sur les personnages actuels (`sprites.ts`) ni
  sur la planche « marcheur » du matin (`reference/generated/2026-10-19-0805-quai-marcheur-facades/`, ancienne bible
  « ambre seul accent chaud », non approuvée). Seules les **données d'identité** validées (couleurs, coupes, accessoires
  des rivaux V2, ADR 021, et des gabarits PNJ, ADR 023) sont reprises, pour qu'un personnage reste reconnaissable du
  Quai à la table de duel.
- Chaîne recommandée : **gpt-image-2 dessine** (fiches de conception, puis poses avec la fiche approuvée en image
  d'entrée), **Aseprite et des scripts nettoient, alignent, animent et assemblent**, un vérificateur automatique et une
  planche *in situ* contrôlent, **le responsable approuve** chaque feuille. Une porte de validation sur **un seul
  personnage** (le duelliste joueur) avant de généraliser, comme pour Maëlle en V2.
- Dix décisions à demander (§6), dont trois bloquantes pour démarrer la porte : D1 amendement, D2 nature du dessin
  (illustration encrée ou pixel art), D10 budget d'images.

---

## 1. Point de départ

### 1.1 Sources lues

AGENTS (règle de branche, « Non négociable », « Images générées : références seulement », mandat M09), JOURNAL (passes
42 à 47, « À reprendre », « Principes »), ADR 026 et son amendement 1 (correction du responsable), ADR 021 (vectoriel V2,
arbitrage « Aseprite non indispensable » pour le duel), ADR 023 (gabarits PNJ), `docs/missions/M09_VILLE_EXPLORATION_HD2D.md`
(B5 : Aseprite par amendement), `docs/FICHE_ARBITRAGES_M09.md` (B5, tableau des pistes), `src/ville/sprites.ts`,
`src/ville/spritesExternes.ts`, `src/ville/ville.ts` (câblage), `src/ville/ilots.ts` (`walkerH`), `src/ville/monde.ts`
(foulée), `tools/m09-sprites-externes.mjs`, `tools/m09-marcheurs.mjs`, `demandes-images/README.md`, fiches des images de
référence. Référence D regardée à l'image.

### 1.2 Ce qui sert de référence, et ce qui n'en sert pas

| Source | Rôle pour les nouveaux personnages |
|---|---|
| Référence D (`reference/generated/2026-10-19-quai-direction-d/01.png`), ADR 026 | **Style** : contour à l'encre, aplats à une ou deux ombres, hachures rares, nuit bleu d'encre, couleurs des familles ; proportions du duelliste à capuche de l'image (tête ≈ 1/3 de la hauteur). |
| Cartes du jeu, emblèmes (`src/art/emblems.ts`), palette des familles (`src/art/palette.ts`) | Couleurs et motifs autorisés (jamais les enseignes du jeu de cartes classique). |
| Identités V2 des rivaux (`src/scene/v2/kai.ts`, `maelle.ts`, `selene.ts`, `orin.ts`, `joueur.ts`) et gabarits PNJ (`src/presentation/npcs.ts`, `npcLook`) | **Données d'identité** seulement : teintes, coupe, accessoire signature, tempérament. Pas leur tracé. |
| Personnages actuels de la ville (`src/ville/sprites.ts`) | **Aucun.** Provisoires (ADR 026 amendement 1). Seul leur **contrat technique** (grille, ancrage) est repris. |
| Planche « marcheur » du 2026-10-19 08:05 (`reference/generated/2026-10-19-0805-quai-marcheur-facades/01.png`, `02.png`) | **Aucun.** Ancienne bible (ambre seul accent chaud), non approuvée ; les marcheurs actuels en dérivent. |
| Cité du Tournoi (`src/characters/BakedCast.ts`) | Méthode du manifeste de provenance et d'empreinte, déjà adaptée dans `spritesExternes.ts` (lecture seule, source notée). |

### 1.3 État technique (constaté dans le code)

- **Atlas par code** (`sprites.ts`) : grille logique de **96 × 160 px par case**, 5 colonnes (repos, puis 4 temps de
  marche) × 3 rangées (face, dos, profil droit ; le profil gauche est le **miroir** du droit, `uFlip`). Figure de
  **148 px logiques** de la semelle au sommet de la tête, pieds à 8 px du bas de la case (ligne de base y = 152),
  centrée en x = 48. Dessiné 1,5 fois plus fin (`ATLAS_SCALE`) : 144 × 240 par case, feuille 720 × 720.
- **Taille au monde** : la figure de 148 px vaut `walkerH` (Quai : **2,2 m** ; Parvis et Ruelles : 1,62 m, `WALKER_H`).
  À l'écran au centre de la rue du Quai : **118 px en 1280 × 720, 177 px en 1920 × 1080** (passe 45).
- **Rendu** (`SPRITE_FRAG`) : panneau à alpha testé (**`discard` sous 0,5** : silhouette binaire, aucune
  semi-transparence), éclairé par l'ambiance, la lune et les lanternes proches, dégradé vertical, **liserés de lumière
  ajoutés par le nuanceur** (côté de la lanterne dominante, haut de la silhouette), ombre de contact posée au sol par le
  moteur. La passe d'encre du Quai (`VilleEncre`) trace en plus un contour aux sauts de profondeur, donc autour de la
  silhouette du panneau.
- **Marche** (`monde.ts`) : `STRIDE = 1,5 m` par cycle complet (deux pas), 4 images par cycle : une image tous les
  0,375 m. Course 3,2 m/s → ≈ 8,5 images/s ; marche 1,6 m/s → ≈ 4,3 images/s ; passants 0,8 à 1,1 m/s → **2 à 3
  images/s** (saccadé). La foulée ne dépend pas de `walkerH`.
- **Chargeur externe** (`spritesExternes.ts`, `ville.ts`) : actif seulement avec `?qa=1&sprites=externes` et un
  `sprites/manifest.json` à côté de la page (le dépôt n'en contient aucun ; pas de dossier `public/`). Vérifie la forme
  de l'entrée, la grille, l'empreinte SHA-256 et les dimensions ; refus motivés dans `externalReport().issues` ; sinon
  l'atlas par code reste. Éprouvé par `tools/m09-sprites-externes.mjs` (3/3, avec nos propres atlas teintés).
- **Manques à combler avant la production** (aucun n'est corrigé ici, voir §4.3) :
  1. **Résolution** : le contrat exige exactement 96 × 160 par case (feuille 480 × 480), **moins fin que l'atlas
     actuel** (1,5×) : une figure de 148 texels étirée sur 177 px en 1080p serait floue.
  2. **Approbation ignorée** : le champ `approved` est contrôlé mais jamais exigé ; une feuille non approuvée se charge.
  3. **Apparition différée** : la feuille est appliquée quand elle arrive ; l'atlas par code s'affiche d'abord (bascule
     visible) et rien n'est préparé avant l'entrée dans l'îlot.
  4. **Échelle et foulée figées** : ligne de base, hauteur de figure et foulée sont des constantes du code ; une
     feuille ne peut pas déclarer les siennes. La largeur des liserés (2,5 texels, `uTexel`) change avec la résolution.
- **Distribution actuelle** : duelliste joueur `player-<Famille>` (4 variantes de couleur), rivaux présents en ville
  Kaï (`braise`, Quai), Orin (`astre`, Parvis), Sélène (`voile`, Ruelles) (Maëlle, `ronce`, n'est pas en ville), PNJ des
  quatre gabarits avec variations par graine (Quai : `pnj-marchande-9` guide, `pnj-docker-1`, `pnj-commis-5`, passants
  `pnj-joueuse-1`, `pnj-docker-9` ; Parvis : `pnj-joueuse-5`, passant `pnj-commis-2` ; Ruelles : passant
  `pnj-marchande-4`).
- **Outils sur le poste** : Aseprite **1.3.18** installé (`C:\Program Files\Aseprite\Aseprite.exe`, hors PATH ; mode
  batch `-b`, `--sheet`, `--data`, scripts Lua `--script`) ; clé OpenAI dans le `.env.local` du dossier principal
  (jamais lue ni affichée par cette session).

---

## 2. Proposition d'amendement des règles (texte prêt à adopter)

### 2.1 Règles concernées

- AGENTS, « Non négociable » : « Art procédural en code à génération reproductible. Pas de PNG d'ambiance, de modèles 3D,
  de fonts ou sons externes téléchargés pour contourner la contrainte. »
- AGENTS, « Images générées : références seulement » : les images générées « n'entrent **jamais** dans le jeu ni dans le
  build : la règle « art par code, aucune image externe au runtime » est inchangée ».
- AGENTS, mandat M09 et `docs/missions/M09_VILLE_EXPLORATION_HD2D.md` : « Aseprite pour les personnages clés plus tard,
  par amendement de la règle « aucune image externe » ».

### 2.2 Texte proposé (à insérer dans AGENTS si D1 est accepté, avec un ADR 027)

Dans « Non négociable », à la fin du point sur l'art procédural :

> Exception unique : les feuilles de personnages de la ville (section « Feuilles de personnages de la ville »).

Nouvelle section, après « Images générées » (dont le titre devient « Images générées : références, sauf feuilles de
personnages de la ville ») :

> ## Feuilles de personnages de la ville (amendement du responsable, AAAA-MM-JJ, ADR 027)
>
> - **Périmètre** : seules les feuilles de sprites des personnages qui marchent dans la ville (duelliste joueur, rivaux,
>   PNJ et passants des îlots) peuvent être des images produites avec gpt-image-2 et/ou Aseprite. Le décor, les cartes et
>   leurs illustrations, les lieux de duel, les personnages du duel (vectoriel V2), l'interface, les polices et les sons
>   restent en code. Toute autre exception demande une nouvelle décision du responsable.
> - **Provenance** : chaque feuille figure dans `public/sprites/manifest.json` (fichier, empreinte SHA-256, grille,
>   provenance, statut) et a une fiche `art-src/sprites/<id>/fiche.json` : outils et versions (modèle gpt-image-2 et sa
>   date, Aseprite 1.3.x), prompts complets, images d'entrée (chemin et empreinte), paramètres (taille, qualité, fond),
>   date, retouches humaines, auteur, et la chaîne des empreintes du brut à la feuille finale.
> - **Approbation** : `approved: true` seulement après une décision explicite du responsable, citée au JOURNAL. Hors QA,
>   le jeu refuse une feuille non approuvée et garde le personnage dessiné par code.
> - **Contenu** : aucun texte lisible, lettre, chiffre, signature, filigrane ni logo ; pas d'enseignes du jeu de cartes
>   classique (pique, cœur, carreau, trèfle) : seuls les emblèmes des familles du jeu ; aucun personnage d'une autre
>   œuvre, aucune ressemblance avec une personne réelle, aucun nom d'artiste vivant ni de franchise dans les prompts ;
>   style conforme à la direction D (ADR 026) et à l'univers des Quatre Voies.
> - **Entrées autorisées** : seulement des images du projet (références approuvées de `reference/generated/`, captures du
>   jeu, nos propres feuilles) ; aucune image trouvée en ligne, aucun pack d'assets tiers.
> - **Licences** : la fiche note les conditions en vigueur à la date de production (conditions d'OpenAI pour les sorties
>   de l'API, licence d'Aseprite) ; un point juridique douteux est remonté au responsable, jamais tranché par un agent.
> - **Secret** : la clé reste dans `.env.local` du dossier principal ; les scripts de génération la lisent à l'exécution,
>   ne l'affichent jamais, ne sont pas dans le build ; aucune variable `VITE_` ; la QA des feuilles vérifie que `dist/`
>   ne contient aucune clé.
> - **Coût** : annoncer le nombre d'images avant chaque génération ; budget par lot fixé par le responsable ; usage
>   relevé dans la fiche.
> - **Réversible et sûr** : sans manifeste ou sur une feuille refusée (forme, grille, empreinte, dimensions, statut), le
>   moteur garde l'atlas dessiné par code et la QA rapporte la raison ; le jeu par défaut (duel) reste identique au
>   pixel près.
> - **Reproductibilité** : la génération n'est pas reproductible ; la feuille commitée et son empreinte font foi. Les
>   variations des PNJ par graine (recoloration) restent déterministes.
> - **Budget** : une feuille PNG ≤ 1 Mo ; mémoire GPU des feuilles d'un îlot mesurée et notée au JOURNAL.

La section « Images générées » garde le reste de ses règles (références de conception, bible D, `art-gen/` ignoré,
fiches) ; seule la phrase « elles n'entrent jamais dans le jeu » reçoit le renvoi vers l'exception.

---

## 3. Cahier des charges des feuilles

### 3.1 Distribution à produire

| Personnage | Identifiants | Feuilles | Variations |
|---|---|---|---|
| Duelliste joueur (identité V2 : carré argent, bandeau ; besace ; capuche selon D6) | `player-Cendre`, `-Voile`, `-Ronce`, `-Astre` | 1 dessin | recoloration par famille (palette `FAMILY_PALETTE`) |
| Kaï (Cendre) | `braise` | 1 | aucune |
| Orin (Astre) | `astre` | 1 | aucune |
| Sélène (Voile) | `voile` | 1 | aucune |
| Maëlle (Ronce), si elle entre en ville | `ronce` | 1 (plus tard) | aucune |
| Gabarits PNJ : docker, marchande, commis, joueuse | `pnj-<gabarit>-<graine>` | 1 par gabarit (4) | recoloration par graine (peau, cheveux, tenue, chemise) ; coupes et accessoires selon D5 |

Soit **8 dessins** pour la ville actuelle (9 avec Maëlle), au lieu d'une feuille par identifiant.

### 3.2 Grille, format, ancrage

- **Disposition conservée** (contrat actuel, interchangeable sans toucher au moteur de la ville) : 5 colonnes × 3
  rangées, rangée du haut = **face** (vers la caméra), milieu = **dos**, bas = **profil droit** (tourné vers la droite de
  l'écran) ; le profil gauche est le miroir. Colonne 0 = repos, colonnes 1 à 4 = marche.
- **Résolution recommandée** : grille logique 96 × 160 **à l'échelle 2** : **192 × 320 px par case, feuille 960 × 960**.
  La figure fait alors 296 px de haut : 2,5 texels par pixel d'écran en 1280 × 720, 1,7 en 1920 × 1080, 1,25 en
  2560 × 1440 (marge pour les mipmaps, pas de flou d'agrandissement). Exige le champ `scale` du contrat v2 (§4.3, C1).
- **Ancrage** (en unités logiques, à multiplier par l'échelle) : pieds sur la **ligne de base y = 152** (8 px au-dessus
  du bas de la case), point milieu entre les deux pieds en **x = 48** au repos et en face / dos ; en profil, le bassin à
  x = 48. **Hauteur de figure : 148** de la semelle au sommet de la tête, cheveux compris. Ce qui dépasse (chignon, pics,
  bonnet, capuche relevée) doit tenir dans la case : si la marge du haut (4 px) ne suffit pas, déclarer une autre
  hauteur de figure et ligne de base dans le contrat v2 (C1) plutôt que de tasser le personnage.
- **Alpha binaire** : opaque (255) dans la figure, transparent (0) dehors ; pas de demi-teinte, de voile, de lueur ni
  d'ombre portée (le nuanceur coupe sous 0,5 et le moteur pose l'ombre de contact). Les pixels transparents portent la
  couleur de l'encre (**fond d'encre sous l'alpha**) pour que les mipmaps ne fassent pas de liseré clair.
- PNG RGBA 8 bits, sRGB, sans profil exotique ; ≤ 1 Mo ; nommé `<id>.png`.

### 3.3 Directions, poses, marche

- **Point de vue** : à hauteur d'œil, très légère plongée tolérée (≤ 10° ; la caméra du Quai plonge de 7°) ; jamais de
  vue de dessus ni d'isométrie. Face et dos strictement frontaux ; profil strict (un seul œil visible).
- **Repos** (colonne 0) : debout, poids réparti, bras relâchés, silhouette caractéristique du personnage. La respiration
  est ajoutée par le moteur (± 0,8 % de hauteur) : ne pas la dessiner.
- **Marche** (colonnes 1 à 4), dans cet ordre : **passage** (jambe d'appui droite verticale, l'autre croise), **contact**
  (pied gauche devant, talon posé), **passage** (appui gauche), **contact** (pied droit devant). Bras opposés aux jambes.
  Corps au plus haut aux passages, au plus bas aux contacts (2 à 3 px logiques d'écart). Les quatre images bouclent sans
  saut.
- **Foulée dessinée = foulée du monde** : sinon les pieds glissent. Pour un chibi (jambes ≈ 1/3 de la hauteur), un pas
  naturel vaut ≈ 0,25 fois la hauteur de figure, soit un cycle ≈ 0,5 hauteur (≈ 1,1 m sur le Quai), alors que
  `STRIDE` vaut 1,5 m quelle que soit la taille. À régler par la feuille (champ `stride` du contrat v2, C4) et à mesurer
  en QA (glissement des pieds).
- **Miroir** : les détails asymétriques (besace, nœud de bandeau, mèche, accessoire d'un côté) changent de côté en
  profil gauche ; c'est accepté (usage courant). Sinon, une quatrième rangée « profil gauche » (D8).
- **Évolutions possibles, hors porte** : marche à 6 ou 8 images (passants moins saccadés), poses « parler », « saluer »,
  « défier » pour les dialogues et l'entrée en duel (D8).

### 3.4 Style, aligné sur le décor de la direction D

- **Encre** : contour extérieur continu, fermé, ≈ **2,5 px logiques** (5 px à l'échelle 2), soit ≈ 2 px d'écran en
  1280 × 720 et 3 px en 1920 × 1080, l'épaisseur de l'encre du décor ; traits intérieurs ≈ 1 à 1,5 px logiques
  (plis, coutures, visage). Couleur de l'encre : bleu-noir du jeu (`#15111c` dans `sprites.ts`, à confirmer sur la
  passe `VilleEncre`). Vérifier sur capture que le contour de la feuille et celui de la passe d'encre ne s'additionnent
  pas en un trait trop épais.
- **Aplats** : une couleur de base par matière, **une** bande d'ombre (deux au plus), un rehaut rare ; pas de dégradé,
  pas de flou, pas de lueur. **Hachures** seulement dans les grandes zones d'ombre (manteau, dessous des bras), traits
  ≥ 1 px logique espacés d'au moins 3 px logiques, ou aucune : à 118 px de haut, une trame plus fine moire.
- **Albédo, pas lumière** : peindre les couleurs sous une lumière neutre. Pas de nuit, de liseré orange ni de reflet de
  lanterne cuits dans la feuille : le nuanceur ajoute ambiance, lune, lanternes et liserés. Ombre de forme venue du
  **haut et de face** (sous le menton, sous les bras, intérieur de l'ourlet), pas d'un côté (le profil gauche est un
  miroir).
- **Valeurs** : tons moyens à clairs pour les matières principales (la nuit assombrit tout ; un manteau presque noir
  disparaît devant les façades) ; noir réservé à l'encre ; ivoire désaturé pour les toiles et le linge ; peau des teintes
  de `NPC_SKINS` et des identités V2.
- **Couleurs des familles** : un accent par personnage, tiré de `FAMILY_PALETTE` (Cendre braise, Voile bleu argenté,
  Ronce vert, Astre or) ; dorures sobres (boucles, broches, fermoirs) comme le décor D.
- **Proportions** : chibi modéré, **tête ≈ 1/3 à 1/3,4 de la hauteur** (comme le duelliste de la référence D), mains et
  pieds simplifiés, visage lisible à 118 px : yeux ≥ 5 px d'écran, sourcils et bouche nets.
- **Silhouette d'abord** : chaque rôle se reconnaît en noir plein (test de la silhouette). Identités tirées des modules
  V2 du duel (`src/scene/v2/`) : duelliste joueur, carré argent, bandeau à médaillon de l'emblème, manteau de la
  famille, besace d'étui à cartes (capuche : voir D6) ; Kaï, cheveux en pointes aux bouts de braise, bandeau à plaque de
  laiton, veste de docker ouverte, baudrier ; Sélène, carré argent-lavande, diadème au croissant du Voile, manteau indigo
  à col officier et brandebourgs d'argent, voile semé d'étoiles (**opaque** en ville : l'alpha est binaire) ; Orin, peau
  sombre, locks en chignon haut (à loger dans la case, §3.2), lunettes rondes de laiton, manteau ocre, gilet bleu nuit ;
  Maëlle, capuche à revers de ronces, pèlerine à ourlet de feuilles, tresse. Métiers des PNJ (ADR 023) : docker
  (bretelles, casquette), marchande (châle, fichu), commis (veste à revers), joueuse (manteau long).
- **Interdits** : texte, lettres, chiffres, logos, filigranes, signatures ; enseignes du jeu de cartes classique (pique,
  trèfle… : l'image D en montre, le jeu les remplace par les emblèmes) ; armes ; objets modernes ; fond peint (la case
  est vide autour de la figure).

### 3.5 Taille au monde et lisibilité en frontale 2.5D

- La figure entière (148 px logiques) vaut `IlotDef.walkerH`. Seule cette hauteur (et, au besoin, celle des portes) est
  recalée sur les nouveaux dessins : **le décor ne bouge pas** pour eux.
- Critère de recalage, mesuré sur capture : le rapport « hauteur du personnage au centre de la rue / hauteur d'une porte
  du premier rang » à l'écran se rapproche de celui de la référence D (≈ 1,1 à 1,25, relevé à l'œil sur l'image : le
  duelliste est un peu plus grand qu'un vantail de la salle, parce qu'il est devant la façade). La valeur actuelle
  (2,2 m) est le point de départ.
- Lisibilité à vérifier en 1280 × 720 et 1920 × 1080 sur les cinq positions du Quai (`tools/m09-v3.mjs shots`) : visage
  lisible, silhouette détachée des façades éclairées et sombres, contour net après profondeur de champ (la rue est dans
  la bande nette), reflets dans les flaques cohérents (le personnage s'y reflète déjà : la feuille y passe aussi).

---

## 4. Chaîne de production et de vérification proposée

### 4.1 Étapes (portes du responsable en gras)

| Étape | Quoi | Outil | Images | Sortie |
|---|---|---|---|---|
| É0 Essai technique | (a) gpt-image-2 accepte-t-il `background: transparent` ? (sources contradictoires : la référence de l'API le refuse pour gpt-image-2, des notes tierces d'août 2026 l'annoncent en préversion) ; (b) une rangée de 5 poses tient-elle la cohérence avec une fiche en image d'entrée ? | API Images (génération, puis édition avec images d'entrée, jusqu'à 16 par requête) | **2**, annoncées | décision « fond transparent » ou « fond uni à détourer » ; constat de cohérence |
| É1 Fiche de conception | tour du personnage : face, dos, profil, à plat sur fond uni, style D, données d'identité injectées dans le prompt | gpt-image-2 | 2 à 4 variantes | **choix du responsable** ; la fiche retenue va dans `reference/generated/<demande>/` avec `fiche.json` |
| É2 Poses | une image par rangée (5 poses côte à côte, grille tracée dans le prompt) ou par pose, la fiche approuvée en image d'entrée | gpt-image-2 (édition) | 3 à 9 (reprises comprises) | bruts dans `art-gen/` (ignoré) |
| É3 Nettoyage et animation | détourage, mise à l'échelle, alignement sur la ligne de base, contour fermé, alpha binaire, fond d'encre sous l'alpha, palette consolidée, retouches des membres, contrôle en pelure d'oignon et en boucle | Aseprite (retouche à la main par une personne) et scripts (Aseprite en mode batch, Lua, Node) | 0 | `art-src/sprites/<id>/<id>.aseprite` (calques, étiquettes de rangées) |
| É4 Assemblage | export de la feuille 5 × 3, empreinte, entrée de manifeste (`approved: false`), fiche de provenance | `Aseprite.exe -b <id>.aseprite --sheet … --sheet-type rows --data …` ou `tools/sprites-assembler.mjs` (à écrire) | 0 | `public/sprites/<id>.png`, `manifest.json`, `fiche.json` |
| É5 Vérification automatique | contrôles du §4.2 | `tools/sprites-verifier.mjs` (à écrire) + test unitaire | 0 | rapport `artifacts/qa/m09/sprites/` |
| É6 Vérification *in situ* | Quai, Parvis, Ruelles avec la feuille ; planche référence D, personnage par code, nouvelle feuille ; vidéo de marche dans les quatre directions | `tools/m09-sprites-externes.mjs` (étendu au vrai manifeste), `tools/m09-v3.mjs shots` avec `sprites=externes`, `tools/m09-marcheurs.mjs` | 0 | planche `screenshots/qa/m09/sprites/` |
| É7 Approbation | **décision du responsable** sur la planche ; `approved: true`, JOURNAL, ADR | — | 0 | feuille active hors QA |

Qui dessine dans Aseprite : une session peut piloter Aseprite **en mode batch** (export, recoloration, assemblage,
contrôles) mais pas retoucher à la main des membres mal dessinés. Si les poses générées ne suffisent pas, il faut une
personne dans Aseprite (le responsable ou un illustrateur), ou des reprises de génération (D3).

### 4.2 Contrôles automatiques d'une feuille (É5)

- Manifeste : forme, grille, empreinte, dimensions (contrôles existants de `checkManifestEntry`), plus `scale`,
  ancrage, foulée, statut, chemin de la fiche (contrat v2).
- Test unitaire (Node, sans navigateur) : chaque entrée de `public/sprites/manifest.json` pointe vers un fichier présent
  dont l'empreinte correspond ; le build ne peut donc pas embarquer une feuille modifiée sans mise à jour du manifeste.
- Par case : alpha binaire (aucune valeur entre 1 et 254, ou moins de 0,5 % de pixels) ; rien à moins de 2 px du bord ;
  pieds sur la ligne de base (± 2 px logiques) ; hauteur de figure dans la tolérance (± 3 %) ; centre des pieds au repos
  en x = 48 (± 2 px).
- Animation : dérive du centre de masse d'une image de marche à l'autre ≤ 2 px logiques ; hauteur qui varie de 1 à
  4 px (rebond) ; les quatre images toutes différentes et la colonne 0 distincte.
- Couleur : pixels transparents à la couleur de l'encre ; part de noir pur hors contour faible ; luminance moyenne de
  la figure au-dessus d'un seuil (lisibilité de nuit, à calibrer sur la porte).
- Contrôles à l'œil, consignés : aucun texte ni enseigne de cartes classiques (zoom sur la planche), silhouette en noir,
  cohérence d'une image à l'autre.
- Secret : aucune chaîne ressemblant à une clé OpenAI dans `dist/`.

### 4.3 Évolutions du code à faire avant la production (non faites ici)

| Réf. | Changement | Fichiers |
|---|---|---|
| C1 | **Contrat v2** du manifeste : `scale` (1, 1,5 ou 2), `anchor` (pieds en px de case), `figureH` ; taille du panneau tirée de la feuille ; v1 toujours acceptée | `spritesExternes.ts`, `sprites.ts` (`createWalkerSprite`), tests |
| C2 | **Approbation exigée** hors QA (`approved: true`) ; en QA, une feuille non approuvée s'affiche et le rapport le dit | `spritesExternes.ts`, `ville.ts` |
| C3 | **Feuilles préparées avant l'entrée dans l'îlot** (décodage et envoi au GPU aux temps morts, derrière le fondu), plus de bascule visible ; mesurer la première entrée (aujourd'hui 662 ms sur le Quai, passe 45) | `ville.ts`, `demo.ts` |
| C4 | **Foulée par feuille** (`stride` en hauteurs de figure) et `STRIDE` proportionnel à `walkerH` ; mesure du glissement des pieds | `monde.ts`, `ville.ts`, `spritesExternes.ts` |
| C5 | **Recoloration** (joueur par famille, PNJ par graine) : la feuille porte des tons clés réservés (rampes peau, cheveux, tenue, chemise, accent) remplacés dans le nuanceur par ceux de `npcLook` / `FAMILY_PALETTE` | `sprites.ts` (`SPRITE_FRAG`), `npcs.ts` (lecture seule des tons), Aseprite en mode indexé |
| C6 | Largeur des liserés en unités logiques (pas en texels) | `sprites.ts` |
| C7 | Dossier `public/sprites/` (copié par Vite dans `dist/`), manifeste réel ; `?sprites=code` pour revenir à l'atlas par code en QA | `public/`, `ville.ts`, outils |

Chaque changement garde le jeu par défaut identique au pixel près (`tools/l5-identique.mjs`) et la démo verte
(`qa:demo`) ; la campagne complète reste réservée aux jalons.

**Fait en passe 52 (2026-10-19) : C1, C2, C3, C5, C7** (détail : ADR 027, « Conséquences faites »). Restent C4 et C6,
selon la porte. Pour la production des feuilles, retenir du contrat v2 : entrée de manifeste `version: 2` avec
`scale: 2`, `anchor` et `figureH` déclarés (défaut [48, 152] et 148), `fiche` ; feuille commune `player` (les quatre
familles) et `pnj-<gabarit>` ; zones recolorables peintes en **tons clés réservés** à quatre niveaux sRGB 64, 128, 191,
255 (ombre profonde, ombre, aplat, rehaut) : peau rouge `#bf0000`, cheveux jaune `#bfbf00`, tenue magenta `#bf00bf`,
chemise cyan `#00bfbf`, accent vert `#00bf00` (valeurs de l'aplat), déclarées dans `recolor` ; **un trait d'encre
sépare toute zone en ton clé d'une autre couleur** (sinon un liseré de la teinte clé reste après filtrage) ; aucune
autre couleur de la feuille proche de ces teintes.

### 4.4 Rangement

- `art-gen/` (ignoré) : bruts de génération, essais, reprises.
- `reference/generated/<demande>/` : fiches de conception **approuvées** et leur `fiche.json` (règle actuelle).
- `art-src/sprites/<id>/` (nouveau, commité) : source Aseprite, fiche de provenance complète, éventuels masques de
  recoloration.
- `public/sprites/` (nouveau, dans le build) : feuilles finales et `manifest.json`.

---

## 5. Risques

- **Cohérence d'une image à l'autre** : point faible connu des modèles d'images (tenue, proportions, couleurs qui
  dérivent entre les poses). Parades : fiche approuvée en image d'entrée, une rangée par image, recoloration par tons
  clés après coup, retouche dans Aseprite ; l'essai É0 le mesure avant d'engager le budget.
- **Fond** : si le fond transparent n'est pas disponible, détourage d'un fond uni (couleur absente du personnage) :
  risque de franges, traité par l'alpha binaire et le fond d'encre.
- **Écart de style** avec le décor : pixel art dans un décor encré (D2), contour doublé par la passe d'encre, hachures
  qui moirent. Parade : planche *in situ* aux deux définitions avant toute approbation.
- **Artefacts** : enseignes de cartes classiques, pseudo-lettres sur les vêtements ou les cartes tenues en main (déjà vus
  sur l'image D). Parade : interdits dans le prompt, contrôle à l'œil obligatoire.
- **Glissement des pieds et saccade** des passants lents (2 à 3 images/s) : C4, et peut-être 6 à 8 images de marche.
- **Mémoire** : une feuille 960 × 960 ≈ 3,7 Mo au GPU (≈ 4,9 Mo avec mipmaps), contre 2 Mo pour l'atlas actuel ; la
  recoloration limite le nombre de feuilles à 8 ; à mesurer.
- **Licences** : la protection par le droit d'auteur d'une image générée sans apport humain est incertaine selon les
  pays ; les retouches humaines et la fiche de provenance documentent l'apport. Pas un avis juridique : à faire vérifier
  si le jeu est diffusé.
- **Coût et durée** : ≈ 10 à 16 images pour la porte, ≈ 80 à 120 pour la distribution actuelle (8 dessins), selon les
  reprises ; chaque image 1536 × 1024 en qualité moyenne a consommé 1 372 jetons d'image en sortie (fiches du
  2026-10-19), coût à relever sur le compte OpenAI.

---

## 6. Décisions à demander au responsable

Les trois premières bloquent le démarrage de la porte. **Fiche d'arbitrages interactive** publiée le 2026-10-19
(privée, choix enregistrés dans sa collection `decisions`) : <https://claude.ai/artifact/5F8xmaBwRCe7RAhQFiSQmH> ; elle
reprend D1 à D10 et deux points à confirmer, R1 (rangement, §4.4) et R2 (Maëlle en ville).

| Réf. | Question | Recommandation (raison) | Alternatives |
|---|---|---|---|
| **D1** | Adopter l'amendement du §2 (feuilles de personnages de la ville seulement, garde-fous) ? | **Oui, tel quel**, ADR 027 à l'adoption (c'est la condition pour mettre ces images dans le jeu ; le périmètre étroit protège le reste de l'art par code) | (b) Aseprite seul dans le jeu, gpt-image-2 réservé aux références ; (c) garder les personnages par code |
| **D2** | Nature du dessin | **Illustration encrée haute définition** (contour, aplats, une ombre), cohérente avec le décor D et les cartes ; Aseprite comme outil de retouche et d'assemblage | (b) **pixel art** Aseprite (tradition HD-2D) à basse définition, agrandi d'un facteur entier : plus « HD-2D » mais en rupture avec un décor encré non pixelisé, et scintillant à 118 / 177 px (facteurs non entiers) |
| **D3** | Répartition des outils | **gpt-image-2 dessine** (fiches et poses), **Aseprite et scripts** nettoient, animent, assemblent, une personne retouche au besoin | (b) gpt-image-2 seul + scripts (plus rapide, cohérence moindre) ; (c) Aseprite seul, dessiné à la main (cohérence parfaite, demande un dessinateur) |
| D4 | Porte de validation | **Un personnage d'abord : le duelliste joueur** (le plus vu, et il teste la recoloration par famille), feuille complète, planche *in situ*, puis généralisation | Kaï d'abord (personnage signature) ; tous d'un coup |
| D5 | Variations des PNJ | **Une feuille par gabarit, recolorée par graine** (peau, cheveux, tenue, chemise ; garde l'esprit de l'ADR 023) ; coupes et accessoires : 2 ou 3 variantes dessinées par gabarit au plus | (b) une feuille par PNJ (distribution fixe, plus d'images) ; (c) aucune variation |
| D6 | Identité commune avec le duel | **Oui** : mêmes couleurs, coupes et accessoires que les personnages V2 du duel (un même identifiant = la même personne en ville et à la table). Cas du joueur : son portrait V2 n'a pas de capuche (carré argent, bandeau) ; la capuche vient du duelliste de la référence D (et de la planche « marcheur », non approuvée) : **identité V2 plus capuche rabattue sur les épaules**, tête visible | Identités de ville nouvelles (le duel s'alignerait plus tard) ; joueur capuche relevée comme dans D (visage moins lisible, écart avec le portrait du HUD) |
| D7 | Résolution | **Échelle 2** (192 × 320 par case, feuille 960 × 960 ; contrat v2) | Échelle 1,5 (comme l'atlas actuel, un peu juste en 1440p) ; échelle 1 (contrat actuel : flou en 1080p) |
| D8 | Directions et poses | **Contrat actuel pour la porte** : face, dos, profil droit (gauche en miroir), repos + 4 temps | Rangée « profil gauche » ; marche à 6 ou 8 temps ; poses de dialogue et de défi (plus tard) |
| D9 | Proportions et échelle | **Chibi modéré, tête ≈ 1/3** comme la référence D ; `walkerH` recalé sur capture (rapport personnage / porte), décor inchangé | Proportions plus élancées (tête ≈ 1/4,5) : portes et `walkerH` à revoir davantage |
| **D10** | Budget d'images | **Porte : 16 images au plus** (2 pour l'essai É0, 4 pour la fiche, 10 pour les poses et reprises), puis budget de la distribution décidé sur le résultat | Budget global d'emblée (≈ 100 à 120) |

Points à confirmer en passant : rangement (`art-src/sprites/` commité, `public/sprites/` dans le build, §4.4) ; Maëlle
en ville ou non ; le duel (V2 en code) hors du périmètre.

---

## 7. Après les décisions

1. Consigner les décisions (JOURNAL, ADR 027, AGENTS si D1).
2. Code C1, C2, C3, C7 (contrat v2, approbation, préparation, dossier) avec leurs tests, jeu par défaut identique au
   pixel près ; C4 à C6 au besoin de la porte.
3. Essai É0 (2 images annoncées), puis fiche de conception du duelliste joueur (É1), présentée au responsable.
4. Poses, nettoyage, assemblage, vérifications (É2 à É6), planche *in situ* ; approbation (É7) ; puis généralisation.

---

## 8. Décisions du responsable (2026-10-19)

Relues dans la fiche interactive (collection `decisions`, 12 documents, 19:50 à 19:54 UTC) et consignées dans
l'ADR 027 :

| Réf. | Choix | Note du responsable |
|---|---|---|
| D1 | Adopter tel quel (amendement appliqué à AGENTS) | « Il fautdrait determiner si on a un avantage concret de l'utilisation des images gtp-image-2 pour nos prersonnages et decors afin d'avoir une veritable valeur ajoute, et donc on pourrait modifier la restriction et regles du AGENTS.md » |
| D2 | Illustration encrée HD | « Utilisons les outils externe ( mene si la regle dans AGENTS.md ) le refusait initialement » |
| D3 | Hybride gpt-image-2 + Aseprite | — |
| D4 | Le duelliste joueur | — |
| D5 | Feuille par gabarit, recolorée | — |
| D6 | Identités V2, capuche rabattue | — |
| D7 | Échelle 2 | — |
| D8 | Contrat actuel, 5 × 3 | — |
| D9 | Chibi modéré, tête ≈ 1/3 | — |
| D10 | 16 au plus pour la porte | — |
| R1 | Rangement proposé (§4.4) | — |
| R2 | Maëlle plus tard | — |

Lecture de la note sur D1 (ADR 027) : l'amendement vaut tel quel pour les personnages ; l'apport concret de gpt-image-2
est à démontrer, par la porte pour les personnages (feuille du duelliste joueur comparée au dessin par code sur le
Quai), par une évaluation à cadrer à part pour les décors. Toute ouverture au-delà des personnages demandera une
nouvelle décision du responsable.
