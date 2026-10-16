# 04 — Contrat maître : ART BY CODE / HD-2D OUVERT

## Principe et référence

Nous recherchons la discipline procédurale utilisée dans [RPG-ArtByCode](https://github.com/juniorbattle/RPG-ArtByCode), observée sur le `main` consulté : `Vite`, `TypeScript`, `Three.js`, géométries/textures/sprites/lumières générés par code, graines reproductibles, outils `shots/compare/diff/perf`, journal factuel. **Ne pas** importer ses façades, canal, caméras A-D, atmosphère, sprites, shaders et zones comme données du nouveau RPG de cartes. HD-2D est un horizon d'intégration, non une obligation d'utiliser Three.js pour la lecture d'une carte 2D.

## Architecture du visuel (3 couches)

1. **Graphismes de règles** : formes des cartes, familles, Rang, Puissance, état, cible, affordances, texte et contraste. Trait prioritaire, stable et accessible ; DOM/SVG/Canvas possible.
2. **Art génératif procédural** : emblèmes, motifs, fonds de cartes, encadrements, illusions de relief, glyphes, particules, microanimations. Paramètres seed/famille/rareté/énergie/moment ; reproductibilité. Pas de ressource externe.
3. **Mise en scène** : plateau, profondeur, environnement à terme HD-2D, lumières, effets Shader/Three.js optionnels, **modulaires**. Le premier slice peut utiliser une arène abstraite.

## Exigences de production

- Séparer seed `duel`, seed `art` et éventuellement `animation`. La génération d'une texture ne change JAMAIS la pioche ou l'IA.
- Chaque générateur documente ses entrées, dimensions, seed, coût mémoire et invalidation du cache. Générer les ressources au démarrage ou en tâche de fond bornée, pas du bruit aléatoire lourd chaque frame.
- Variantes visuelles dérivées d'un **design system paramétrique**, non 16 illustrations entièrement hardcodées. Les quatre familles doivent être reconnaissables sans compter exclusivement sur la couleur (symbole et structure).
- Utiliser palettes sémantiques provisoires et rendre leur remplacement simple ; pas d'obligation d'adopter indigo/ambre du projet jumeau.
- Les Signatures peuvent utiliser des motifs et animations spécifiques, mais pas de cinématique qui retarde l'issue du Clash ou empêche le joueur de lire les dégâts.
- Les effets shader doivent montrer une plus-value visible et mesurer leur coût. Éviter `discard`, trop de post-traitements ou GPU-bound sans preuve et alternatives.
- Prévoir une **voie de repli** : Canvas/CSS/animation réduite si WebGL est indisponible ; debug `reduced-motion`.
- Aucune copie d'assets, de shaders, de fonctions sensibles ou de polices depuis l'autre projet sans autorisation et justification/licence ; la similarité de workflow n'autorise pas la duplication aveugle.
- Captures vérifiables : 1280×720, 1920×1080, mobile portrait ; cartes lisibles, cible claire, aucune superposition illisible.

## Premier slice visuel requis (pas de décor final)

- 4 familles via procédés générés ; rangs I-IV et ∞, badges de raréfaction/pouvoir, verso commun secret.
- 3 états de Secondaires clairement perceptibles : chargement / cachée inactive / active prête.
- Animations lisibles : sélection/pose/retour, engagement secret, flip simultané, résolution conflit, réduction PV, Interférence, Repoussement, prolongation.
- Un terrain simple et fort, produit **sans image téléchargée**, laissant de l'espace pour les cartes / journal et l'adversaire.
- Paramètres debug : `seed`, `artSeed`, `state`, `reducedMotion`, `freeze` seulement si réellement implémentés ; documenter ceux qui fonctionnent.

## Ce qui attend un arbitrage futur

Style exact des cartes (ornementation vs sobriété), dimensions finales, placement de la caméra HD-2D, type d'environnement urbain, pipeline personnages 2.5D, lumière/ambiances, palette, animations Signature. L'agent peut créer 2-3 propositions exploratoires isolées et comparables, mais ne les présente pas comme direction finale sans validation.
