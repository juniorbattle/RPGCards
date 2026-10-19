# M09 — La ville d'exploration HD-2D : cadrage, caméra et première zone

**Décision du responsable — 19 octobre 2026**, en séance, après la réception de M07 et la consolidation du combat
(M08). M09 démarre **après la release candidate du combat (M08, lot C5)** et seulement si le combat est sain (critères
plus bas). Elle ne change **aucune règle** du duel (V3.0, delta V3.2, D-01 ratifié en V3.3) ni la confidentialité des
secrets (ADR 011).

**DÉCISION DU RESPONSABLE (2026-10-19, pendant le run) : caméra d'exploration = FRONTALE 2.5D.** « Non, on ne veut pas d'inclinaison, mais frontale. » La vue de dessus inclinée est abandonnée : ne la construis pas (ou retire-la du laboratoire), fais V1 et V2 directement en frontale 2.5D (≈ 10–20°, plans de profondeur), et demande les images de référence en frontale. ADR 024 : statut « approuvé, frontale 2.5D ».

## Direction du responsable

- « Maintenant que nous avons une base solide, je veux optimiser le plus possible notre structure actuelle et
  m'approcher le plus d'une version démo. »
- « Si tout est bon sur le gameplay combat, on commencera avec la conception de l'environnement et donc du décor, en
  respectant notre narration : une ville d'exploration HD-2D RPG avec plusieurs zones (ville, quartiers, déplacements).
  Nous avions évoqué une caméra tilted top-down ou une perspective frontale 2.5D. »
- « Nous nous inspirons de l'autre projet sur lequel nous travaillons, Cité du Tournoi (dépôt RPG-ArtByCode), qui a créé
  un design procédural par code de qualité : on reprendra la même DA, sauf la caméra, qui est plus sophistiquée et qui
  diffère de ce que nous voulons. »
- « Un enjeu sera aussi d'utiliser des outils comme Aseprite pour les PNJ et personnages clés, mais pour le moment on
  va les générer génériquement pour avoir une base solide. »

## Autorisation de référence (exception à l'isolation des projets)

Le responsable **autorise explicitement** M09 à s'inspirer de **Cité du Tournoi** (`github.com/juniorbattle/RPG-ArtByCode`,
même propriétaire) :

- **Autorisé :** lire son code, ses outils et sa documentation ; reprendre sa **direction artistique** ; **adapter** ses
  techniques procédurales (matériaux, ciel et brume, post-traitement, génération guidée par la visibilité, révélation
  des occultations, outils de mesure) dans l'architecture de RPGCards, en notant la source (fichier et commit) dans le
  code ou l'ADR.
- **Interdit :** développer dans ce dépôt ou y pousser quoi que ce soit ; reprendre sa **caméra** (graphe de cadrages
  semi-fixes, A/B/C/D) ; importer ses contrats, ses décisions de gameplay ou ses personnages ; ajouter une dépendance
  vers lui (copie adaptée seulement).

### Direction artistique reprise (résumé de son `AGENTS.md`, « Art direction (locked) »)

- Nuit à dominante presque monochrome : **indigo / ardoise** dominants, **pierre froide** en secondaire, **lumière
  ambrée comme seul accent chaud**, **ivoire désaturé** pour les toiles et les rehauts.
- Accessoires **concentrés aux points focaux** (étal principal, grappes de lanternes, bord du quai, pont, quelques
  bannières) ; jamais de fouillis uniforme.
- Principe de production : **maximiser la complexité perçue en minimisant la complexité au runtime** ; le détail peut
  être procédural, cuit (baked) ou ponctuellement dessiné, selon la qualité finale, le coût, la reproductibilité et
  l'approbation du responsable.
- Post-traitement de référence : diffusion atmosphérique, profondeur de champ, halo, étalonnage de palette
  (`src/atmosphere/PostFX.ts` là-bas) ; brume et ciel partagés (`src/materials/ShaderChunks.ts`).

Cette DA est cohérente avec nos lieux de duel (la rue « le Quai, la nuit », le bar « le Fanal », ADR 022) : la ville
doit prolonger ces lieux, pas les contredire.

## Ce qui reste acquis

- Le combat et toute sa présentation (ADR 013 à 023) : le duel garde sa caméra, son plateau, ses HUD et ses lieux.
  La ville **mène** aux duels ; elle ne modifie pas l'écran de duel.
- Art par code, Three.js + TypeScript ; aucune image ni police externe au runtime (les sprites Aseprite des personnages
  clés viendront plus tard, par un amendement explicite de cette règle, avec manifestes de provenance comme dans Cité du
  Tournoi).
- Personnages : socle « vectoriel V2 » (ADR 021) et gabarits PNJ génériques (ADR 023) comme base.
- Règle des QA aux jalons (AGENTS) ; développement sur `main`.

## Lots

| Lot | Objet | Critères d'acceptation |
|---|---|---|
| **V0** | **Cadrage écrit** de la ville : zones (ville, quartiers, liaisons), déplacements, entrée en duel (rivaux, PNJ, lieux de duel ADR 022), place des quatre lieux existants, fil narratif (Tournoi du Quai), boucle de démo cible ; budget de performance | document `docs/M09_CADRAGE_VILLE.md` ; questions ouvertes listées pour la fiche d'arbitrages |
| **V1** | **Laboratoire de caméra** sur un seul îlot (le Quai la nuit) : deux caméras comparables, **vue de dessus inclinée** (perspective, ≈ 40–55°) et **frontale 2.5D** (≈ 10–20°, plans de profondeur), basculables par paramètre d'URL ; un personnage générique qui marche ; DA de Cité du Tournoi | captures comparables des deux caméras (1280×720, 1920×1080) ; lisibilité du personnage et des accessoires ; coût mesuré (SwiftShader dans le cloud, GPU réel plus tard) ; recommandation argumentée, **décision au responsable** |
| **V2** | **Première zone jouable** avec la caméra retenue : déplacement, collisions, un ou deux PNJ génériques à défier, entrée dans un lieu de duel existant puis retour à la ville | après décision sur V1 ; **en run autonome sans le responsable** (brief du 2026-10-19), V2 peut commencer à titre **provisoire** sur la caméra recommandée, caméra isolée derrière une interface, à part du jeu |

Le prototype vit **à part** du jeu actuel (entrée ou paramètre dédié, par exemple `?ville=1` ou une page `ville.html`) :
le jeu par défaut reste identique au pixel près tant que le responsable n'a pas validé l'intégration.

## Porte d'entrée : « le combat est sain »

M09 ne démarre que si la release candidate du combat (M08 C5) est livrée avec : typecheck, tests et build verts ;
`qa:browser`, `qa:product` et `qa:rc` verts ; aucun défaut bloquant connu dans le duel ; rapport de la RC écrit. Sinon,
la session corrige le combat et s'arrête là.

## Procédure

Captures réelles, tests, build, journal, ADR pour toute décision structurante (caméra, architecture de la ville),
commit et push sur `main`. Les décisions ouvertes sont réunies dans une **fiche d'arbitrages** (`docs/FICHE_ARBITRAGES_M09.md` :
pour chaque décision, contexte, sources, captures, option recommandée et alternatives), que la session principale
transformera en fiche interactive pour le responsable.

## Décisions du responsable — 2026-10-19 (fiche « RC 0.8 et ville »)

- **Q1 :** **passe de qualité visuelle du Quai d’abord**, avant d’ajouter des îlots : lot **V3** ci-dessous.
- **B1** réglages de la caméra frontale gardés, ajustés à l’œil sur GPU réel ; **B2** îlots chargés un à un ; **B3**
  préparation systématique avant le duel ; **B4** la ville devient le hub par défaut **après validation de la démo** ;
  **B6** tutoriel en bulles non bloquantes ; **B7** textes gardés « prototype ».
- **B5 :** Aseprite pour les personnages clés **après la démo**, par un amendement de la règle « aucune image externe ».
  Note du responsable : « L'API OpenAI sera aussi disponible pour optimiser la tâche et le rendu » (images générées en
  local comme aide à la production des feuilles, sous l’amendement à venir).

| Lot | Objet | Critères d'acceptation |
|---|---|---|
| **V3** | **Passe de qualité visuelle du Quai** (passe 45 : livrée pour validation ; planche `screenshots/qa/m09/v3/planche-v3-quai.png` ; **validation du responsable attendue avant le Parvis et les Ruelles**) : plans de profondeur (eau et bord du quai au premier plan, rue, façades, silhouettes lointaines), façades variées et détaillées par code dans la DA de Cité du Tournoi, éclairage de nuit, taille et dessin des personnages, cadrage ajusté à l’œil | comparaison côte à côte avec les références de DA (`reference/generated/`) ; captures avant / après sur GPU réel ; coût par image mesuré sur la 780M et la RTX 4060 ; démo `qa:demo` et jeu par défaut sans régression ; validation du responsable avant d’étendre aux autres îlots |
