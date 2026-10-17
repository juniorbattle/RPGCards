# M04 — Enveloppe de jeu, configuration du deck et transition de duel

## État d'entrée

Le runtime M03.2 est déjà jouable via l'écran de configuration duel actuel. Ne pas remplacer le moteur ; le point d'entrée Vite, le contrôleur d'app, l'IA, les personnalités, les règles de visibilité et le replay déterministe existent. Commencer par inventorier ce qui est réutilisable et les lacunes réelles ; ne pas générer un second moteur ni recopier les règles dans l'UI.

## Parcours M04 à créer

1. **Menu d'accueil fonctionnel** : Jouer / Continuer (uniquement si sauvegarde valide) / Galerie / Options / Aide ou règles / Recommencer avec confirmation. L'accueil doit guider un nouvel utilisateur sans connaître ?autostart ni ?scenario.
2. **Configuration complète du duelliste** : voir les 16 identités ordinaires des quatre familles et la Signature équipée. Choisir une variante légalement disponible par identité seulement si elle existe dans le catalogue et respecte l'unicité ; garder les Basic et variantes documentées, jamais de duplication d'identité dans le deck. Équiper **une Signature et deux Techniques** conformément au contrat. Mettre en évidence les prérequis, les effets, les rangs/pouvoirs, l'état du deck et les erreurs.
3. **Intégration de l'interface actuelle** : ne pas couper les fonctionnalités M03.2 — clic et drag & drop de cartes, vue A et B, rival en buste, HUD positionnés, ASSAUT/GARDE révélés au moment légal, séquence Clash et 6 chorégraphies. Le visage rival est une référence constante, non un panneau à réduire au profit du menu.
4. **Duel complet avec sortie cohérente** : entrée depuis le menu, préparation, phases de tous les tours, victoire/défaite/double KO avec prolongation, résultat et stats publiques du match, retour au menu ou nouvelle rencontre. Si le joueur abandonne, confirmation claire et classification distincte d'un KO. Choix de rythme normal/rapide/instantané et mouvement réduit conservés.
5. **Aide intégrée et lisibilité** : tutoriel contextuel non intrusif (poser Primaire, posture, Secondaire en chargement/réserve/active, choix tactique après Primaires, contre-jeu et Insight) ; « pourquoi 0 dégâts » ; inspection accessible depuis chaque zone ; première partie possible sans lire 80 pages de contrat.

## Architecture exigée

- Définir un state machine du **flux produit** (HOME → PROFILE/DECK → ENCOUNTER → DUEL → RESULT → HOME/ENCOUNTER) distincte de la state machine des phases de combat. Ne jamais faire dépendre le moteur des transitions de menu.
- Catalogue et validation de deck **single source of truth** via les définitions canoniques existantes ; un deck illégal ne lance pas de partie. Au chargement de configuration ancienne ou périmée, migration ou refus explicite.
- Conserver les hooks QA existants (seed, scenarios, artSeed et modes de capture), sans les faire apparaître comme actions de jeu normal. Prévoir le retour au jeu après un écran Options sans perdre les choix en cours.
- Ergonomie desktop prioritaire, souris+clavier ; ne pas dégrader le mobile existant, mais pas de chantier paysage.

## Acceptance M04

- Nouveau joueur ouvre localhost sans paramètre, personnalise Signature + Techniques et, si permis par données, variantes ; duel contre un des rivaux existants ; termine et voit un écran Résultat ; revient à l'accueil ou relance.
- Aucun cumul de cartes physiques, aucun leak d'adversaire, aucun affichage prématuré de la posture. Toutes les configurations Signature/Techniques déjà valides fonctionnent.
- Pas de déformation HUD/vues/cadrage. Captures en 1280×720 et 1920×1080 ; contrôles souris/clavier ; QA traversant un duel et résultat sans sélecteur de formulaire pour jouer.
- Typecheck + tests + build ; rapport de tests M04, journal, commit sur main. Les scénarios QA historiques restent exécutables.
- Conserver la possibilité d'entrer directement en duel (raccourci QA), mais ne pas l'utiliser pour contourner le parcours produit.

**Ne pas déclarer M04 terminé si le retour du duel au menu et la configuration de 17 cartes ne fonctionnent pas.**