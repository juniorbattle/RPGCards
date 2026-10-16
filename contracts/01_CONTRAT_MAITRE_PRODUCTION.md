# 01 — Contrat maître de production : Les Quatre Voies

**État :** mandat initial, priorités à respecter jusqu'à révision. **But :** livrer un RPG de cartes techniquement et visuellement cohérent via génération procédurale *by code*, en commençant par un duel autonome réellement jouable et inspectable.

## 1. Vision produit

- RPG solo dans une ville unique évolutive (exploration, duellistes, collection, rivalités, progression) ; le moteur de duel en est le noyau.
- Quatre familles **Cendre ◆, Voile ◈, Ronce ✿, Astre ✦** ; collection de variantes, Signatures, Techniques, PV individuels et stratégie d'anticipation.
- L'art et les interactions sont générés par code pour offrir une identité adaptable sans pipeline de fichiers d'art téléchargés.
- Une présentation **HD-2D** pourra structurer les scènes du RPG, mais le choix de caméra, du décor, du style de personnages et de la direction artistique ne sont **pas** arrêtés au premier lot.

## 2. Périmètre prioritaire / non prioritaire

**P0 :** extraction des contrats + du simulateur V3.2 ; moteur indépendant du rendu (types, RNG seedé, historique d'événements, invariants, UI views sans secrets).  
**P1 :** boucle de duel local contre IA explicable ; clic/drag/drop directement sur cartes, zones compatibles, préparation/phase tactique, progression à 0 PV, replay d'événements.  
**P2 :** première présentation procédurale crédible : gabarits de cartes, symboles, textures/décors abstraits minimaux, silhouettes/effets de combat, animations sobres et lisibles, générateurs pilotés par paramètres.  
**P3 :** QA visuelle automatisée, ergonomie desktop/tactile, performance, reconstruction seedée et preuves.  
**Hors mission initiale :** ville finie, zones 3D, caméra RPG, topographie HD-2D définitive, éditeur complet, narration, économie, multijoueur réseau, sauvegardes historiques universelles, effets shader démonstratifs sans bénéfice lisible.

## 3. Exigences « jeu »

- Démarrer et terminer un duel complet avec les quatre Signatures et variantes du premier catalogue ; les règles complexes ne sont pas remplacées par des effets approximatifs.
- Mode Assaut/Garde **visible clairement** ; apparition des décisions adverses à la phase autorisée, pas avant.
- Clic / glisser-déposer / clavier et tactile : interactions de cartes comme premier langage du jeu. Prévisualisation de conséquences fiables, jamais un faux pourcentage de victoire.
- Animation dépendant de l'état résolu : anticipation → verrouillage → reveal → action → impact → nettoyage, sans allonger artificiellement les tours.
- Journal humain compréhensible et traçable : qui, quoi, pourquoi, scores et absorption, informations masquées respectées.

## 4. Exigences « art by code »

- Procédural = modules / grammaires / motifs / effets / palettes / RNG par code, non pas un écran rempli aléatoirement à chaque frame.
- Traits visuels distinctifs des familles paramétrables, mais **aucune palette ou géométrie définitive imposée**.
- La typographie de règle (rang, Puissance, valeur) passe avant l'effet cosmétique. Aucun shader ne doit masquer l'état des cartes.
- Génération déterministe offline ou boot ; cache / pooling et budget GPU estimés, mesurés au besoin.
- Fallback Canvas/CSS 2D si WebGL/Three.js n'est pas accessible : les règles restent jouables.

## 5. Critères de livraison

- Code source et dépendances explicites, `npm install` puis `npm run dev`, `npm run typecheck`, `npm test`, `npm run build` fonctionnent.
- Couverture des scénarios obligatoires de `qa/MATRICE_REGRESSION_PRIORITAIRE.md` et UI browser de `docs/MISSION_01_ACCEPTANCE.md`.
- Captures d'écran **réelles** des phases, seed et résolution ; aucune fuite d'informations adverses.
- Rapport de conformité (écarts V3 vs delta), responsabilités de modules, perf indicative **mesurée**, liste de dettes, mise à jour JOURNAL.
- Premier lot est une **tranche verticale** sérieuse ; ne pas revendiquer « RPG complet » avant système de ville/collection/progression.

## 6. Réception humaine

À la fin d'un lot, l'agent recommande une approbation basée sur preuves. Il ne s'auto-autorise ni merge ni fixation de caméra/décor/visuel. Le responsable peut demander une itération UI avant P2 étendu.
