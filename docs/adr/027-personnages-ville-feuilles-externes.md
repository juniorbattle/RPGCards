# ADR 027 — Personnages de la ville en feuilles de sprites produites avec gpt-image-2 et Aseprite (M09)

Date : 2026-10-19
Statut : **APPROUVÉ par le responsable** (fiche d'arbitrages interactive du 2026-10-19,
<https://claude.ai/artifact/5F8xmaBwRCe7RAhQFiSQmH>, 12 entrées, toutes sur l'option recommandée) ; **code préalable
fait** (passe 52 : C1, C2, C3, C5, C7, voir « Conséquences faites ») ; **production pas commencée** : essai É0 et porte
de validation sur le duelliste joueur à venir. Cadrage : `docs/M09_PERSONNAGES_VILLE_CADRAGE.md` (passe 48). Amende la règle « art par code, aucune image externe au runtime » (AGENTS, « Non négociable ») et la règle
« Images générées : références seulement » (AGENTS), pour les seules feuilles de personnages de la ville.

## Contexte

Le 2026-10-19 (passe 47, ADR 026 amendement 1), le responsable a déclaré provisoires les personnages de la ville,
dessinés par code (`src/ville/sprites.ts`), et décidé de les régénérer « avec Aseprite et/ou gpt-image-2 » ; le décor ne
s'en inspire pas. Le chargeur de feuilles externes (`src/ville/spritesExternes.ts`) existe mais reste réservé à la QA, et
AGENTS interdisait toute image externe au runtime. La passe 48 a cadré le chantier (règle, cahier des charges, chaîne de
production) et listé les décisions ; le responsable les a tranchées sur la fiche interactive.

## Décision

1. **Règle amendée (D1, « Adopter tel quel »)** : exception unique pour les feuilles de sprites des personnages qui
   marchent dans la ville (duelliste joueur, rivaux, PNJ et passants des îlots), produites avec gpt-image-2 et/ou
   Aseprite, sous les garde-fous de la section « Feuilles de personnages de la ville » d'AGENTS : provenance (manifeste
   d'empreintes, fiche par feuille), approbation explicite du responsable (sinon le dessin par code reste), contenu (aucun
   texte, pas d'enseignes du jeu de cartes classique, aucune personne réelle ni œuvre tierce), entrées limitées aux images
   du projet, licences notées, clé jamais dans le build, coût annoncé, réversibilité, budget de taille. Le décor, les
   cartes, le duel (vectoriel V2), l'interface, les polices et les sons restent en code.
2. **Nature du dessin (D2)** : illustration encrée haute définition (contour, aplats, une ombre), alignée sur la référence
   D (ADR 026) et les cartes du jeu ; pas de pixel art. Aseprite sert à retoucher, animer et assembler.
3. **Outils (D3)** : chaîne hybride : gpt-image-2 dessine les fiches de conception et les poses (la fiche approuvée en
   image d'entrée) ; Aseprite (mode batch, scripts) et des scripts Node nettoient, alignent, animent et assemblent ; une
   personne retouche dans Aseprite si une pose ne tient pas.
4. **Porte de validation (D4)** : un seul personnage d'abord, **le duelliste joueur** (il éprouve aussi la recoloration
   par famille), feuille complète montrée sur le Quai aux deux définitions, puis généralisation.
5. **PNJ (D5)** : une feuille par gabarit (docker, marchande, commis, joueuse), recolorée par graine dans le nuanceur ;
   au plus 2 ou 3 variantes dessinées de coupe et d'accessoire par gabarit (esprit de l'ADR 023).
6. **Identité (D6)** : les identités V2 du duel (couleurs, coupes, accessoires ; ADR 021, 023) sont reprises, le tracé
   des personnages actuels de la ville ne l'est pas ; le joueur garde son identité V2 (carré argent, bandeau) avec une
   **capuche rabattue sur les épaules**, visage visible.
7. **Résolution (D7)** : grille logique 96 × 160 à l'**échelle 2** (192 × 320 par case, feuille 960 × 960), déclarée
   par un champ `scale` du manifeste (contrat v2).
8. **Directions et poses (D8)** : contrat actuel, 5 × 3 (repos et 4 temps de marche ; face, dos, profil droit, le
   gauche en miroir) ; marche à plus de temps et poses de dialogue plus tard, si la porte les montre utiles.
9. **Proportions et échelle (D9)** : chibi modéré, tête ≈ 1/3 de la hauteur (référence D) ; seule `IlotDef.walkerH`
   (et, au besoin, la hauteur des portes) est recalée sur capture ; le décor ne bouge pas pour les personnages.
10. **Budget (D10)** : **16 images au plus pour la porte**, annoncées à chaque étape (essai technique 2, fiche de
    conception ≈ 4, poses et reprises ≈ 10) ; le budget de la distribution se décide sur le résultat de la porte.
11. **Rangement (R1)** : `art-gen/` (ignoré) pour les bruts ; `reference/generated/<demande>/` pour les fiches de
    conception approuvées ; `art-src/sprites/<id>/` (commité) pour les sources Aseprite et la provenance ;
    `public/sprites/` (dans le build) pour les feuilles finales et `manifest.json`.
12. **Maëlle (R2)** : sa feuille plus tard, quand elle entrera en ville.

## Notes du responsable sur la fiche

- Sur D1 : « Il fautdrait determiner si on a un avantage concret de l'utilisation des images gtp-image-2 pour nos
  prersonnages et decors afin d'avoir une veritable valeur ajoute, et donc on pourrait modifier la restriction et regles
  du AGENTS.md ». Lecture retenue : l'amendement s'applique tel quel aux personnages ; l'apport concret de gpt-image-2
  est à **démontrer** : pour les personnages, par la porte (feuille du duelliste joueur comparée au dessin par code, sur
  le Quai) ; pour les décors, par une évaluation à cadrer à part. Toute ouverture au-delà des personnages (décors
  compris) demandera une nouvelle décision du responsable, fondée sur cette évaluation.
- Sur D2 : « Utilisons les outils externe ( mene si la regle dans AGENTS.md ) le refusait initialement » : confirme le
  recours aux outils externes (D1).

## Conséquences

- AGENTS : exception ajoutée dans « Non négociable », section « Feuilles de personnages de la ville », renvoi depuis
  « Images générées » ; mandat M09 et mission M09 mis à jour ; `demandes-images/README.md` renvoie à l'exception.
- Avant toute feuille en production, évolutions du code (cadrage §4.3), avec le jeu par défaut identique au pixel près :
  C1 contrat v2 (`scale`, ancrage, hauteur de figure), C2 approbation exigée hors QA, C3 feuilles préparées avant
  l'entrée dans l'îlot (plus de bascule visible), C7 `public/sprites/` et manifeste réel ; pour la porte du joueur, C5
  (recoloration par famille) ; C4 (foulée par feuille) et C6 (liserés en unités logiques) selon ce que montre la porte.
- Production : essai technique É0 (2 images, annoncées : fond transparent de gpt-image-2, cohérence d'une rangée de
  poses), fiche de conception du duelliste joueur (É1) soumise au responsable, puis poses, nettoyage, assemblage,
  vérifications automatiques et *in situ*, approbation (É2 à É7).
- Les fiches de conception approuvées restent des références dans `reference/generated/` ; seules les feuilles finales
  approuvées entrent dans le build.

## Conséquences faites (passe 52, 2026-10-19)

Code préalable à la porte, sans aucune image générée ni feuille réelle ; preuves faites avec nos propres atlas dessinés
par code, exportés et teintés ou peints en tons clés (`tools/m09-sprites-externes.mjs`, JOURNAL passe 52).

- **C1 contrat v2** (`src/ville/spritesExternes.ts`) : manifeste `version: 2` ; chaque entrée déclare `file`, `sha256`,
  `cell: [96, 160]`, `cols: 5`, `rows: 3`, `scale` (1, 1,5 ou 2 ; feuille de 480, 720 ou 960 px de côté), `anchor`
  (pieds, px logiques de la case, défaut [48, 152]), `figureH` (semelle → sommet de la tête, px logiques, de 80 à la
  ligne des pieds ; défaut 148), `recolor` (facultatif, tons clés), `source`, `fiche`
  (`art-src/sprites/<id>/fiche.json`) et `approved`. Le panneau du personnage est tiré de la feuille (`walkerPanel`,
  `src/ville/sprites.ts` : la figure vaut `walkerH`, les pieds à l'origine, décalage horizontal si l'ancrage n'est pas
  centré, renversé en profil gauche) ; l'atlas par code se déclare lui-même au contrat (`CODE_SPEC` : échelle 1,5). Le
  contrat v1 (`version: 1`) reste accepté (échelle 1, ancrage et figure par défaut). Clés du manifeste : l'identifiant,
  puis la feuille commune du dessin (`player` pour les quatre `player-<Famille>`, `pnj-<gabarit>` pour les PNJ).
- **C2 approbation** : politique `approuvees` par défaut (jeu, `?demo=1`, `?ville=1`) : une feuille non approuvée est
  refusée, le dessin par code reste, la raison est rapportée ; `?qa=1` affiche aussi les non approuvées et
  `externalReport().unapproved` les nomme ; `?qa=1&sprites=approuvees` éprouve la politique du jeu avec les crochets de
  QA ; `?qa=1&sprites=code` garde l'atlas par code (`sprites=externes`, ancien interrupteur, vaut désormais `qa`).
- **C3 préparation** : lecture du manifeste et décodage lancés avant la construction de l'îlot ; une feuille est vérifiée
  (empreinte, dimensions), décodée hors du fil principal (`createImageBitmap`, sans prémultiplication ni conversion de
  couleur) puis envoyée au GPU (`renderer.initTexture`) ; tant qu'un personnage attend sa feuille, il est caché et
  l'image n'est pas rendue (au plus 1,5 s) : **plus de bascule visible** de l'atlas par code vers la feuille. La démo
  prépare les feuilles de l'îlot d'arrivée pendant le fondu du passage (`Town.prepare`, `isPrepared`) ; les crochets de
  QA (`__lqvVille`, `__lqvDemo`) sont publiés une fois les feuilles décidées (`Town.ready`). Mesures (Radeon 780M,
  1920 × 1080) : feuille de 960 × 960 lue en 11 à 19 ms, décodée en 8 à 20 ms, envoyée au GPU en 2 à 5 ms ; première
  entrée sur le Quai inchangée (médiane de 5 rondes : 588 ms sans feuille, 597 ms avec trois feuilles, 581 ms en
  `sprites=code`) ; passage au Parvis : feuille d'Orin prête en 22 ms, changement d'îlot à ≈ 500 ms comme avant
  (fondu de 300 ms et construction de l'îlot, mesuré à l'identique sur le build de départ).
- **C5 recoloration** (`SPRITE_FRAG`, inactive pour l'atlas par code) : tons clés réservés, sRGB, quatre niveaux 64,
  128, 191, 255 (ombre profonde, ombre, aplat, rehaut) : peau rouge, cheveux jaune, tenue magenta, chemise cyan, accent
  vert ; remplacés par la rampe du personnage (`recolorTargets` : tons du personnage par code, soit `npcLook` par graine
  pour les PNJ, `FAMILY_PALETTE` pour la tenue et l'accent du duelliste joueur). L'encre est retirée avant le test (un
  bord filtré « ton clé + encre » prend un ton plus sombre de la rampe) ; le test se fait en racine (proche du sRGB).
  Une teinte déclarée sans couleur cible pour le personnage fait refuser la feuille. **Règle de dessin** : un trait
  d'encre sépare toute zone en ton clé d'une autre couleur ; sinon le filtrage mêle les deux et un liseré de la teinte
  clé reste (constaté sur la feuille de preuve, dont les liserés ivoire sont posés sur la tenue sans encre).
- **C7** : `public/sprites/manifest.json` (copié par Vite dans `dist/sprites/`), vide et valable ; test Node
  `test/spritesManifeste.test.ts` : chaque entrée pointe vers un PNG présent, à l'empreinte, aux dimensions (échelle) et
  au poids (≤ 1 Mo) déclarés, avec sa fiche commitée ; aucune image du dossier hors du manifeste.
- **Non fait, selon la porte** : C4 (foulée par feuille), C6 (liserés de lumière en unités logiques : à l'échelle 2 ils
  font 1,25 px logique au lieu de 1,67) ; la QA des feuilles qui cherche une clé dans `dist/` viendra avec la première
  feuille réelle.
