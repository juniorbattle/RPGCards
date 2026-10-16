# Delta V3.1 — Affinité de Rang et lisibilité du terrain

**Statut : prototype implémenté et testé dans le simulateur ; en attente de confirmation finale du concepteur pour le contrat maître.**

## 1. Amplification de Rang (changement proposé)

- Secondaire d’une famille différente : `bonus de score = Rang imprimé de la Secondaire`.
- Secondaire de même famille que la Primaire : `bonus de score = Rang imprimé de la Secondaire + 1`.
- Deux Secondaires Rang : somme des deux bonus, chacune éligible au +1 d’affinité.
- Les bonus de Rang n’améliorent jamais la Puissance, les dégâts, la défense par Puissance, ni les coefficients d’Interférence.
- Les Signatures en Primaire restent de priorité ∞, indépendamment de toute somme numérique de Rang.
- Les effets dépendant d’un écart de score exact (notamment Étincelle) utilisent le score **après** bonus d’affinité et Interférences.

Exemple : Garde Ronce II (score imprimé 2) avec Secondaire Ronce I en Amplification de Rang (+2) atteint 4 ; elle bloque Assaut Cendre IV score 4. Avec Secondaire Astre I (+1) elle atteint seulement 3 et subit 12−6 = 6 PV si aucun autre effet n’intervient.

## 2. UX de la Secondaire (amélioration immédiate, aucune règle modifiée)

- **CHARGEMENT** : carte posée dans le tour courant, cachée à l’adversaire, inutilisable.
- **CACHÉE / INACTIVE** : tour de charge achevé, carte non encore dévoilée, inutilisable ; son propriétaire connaît toujours la carte.
- **ACTIVE / PRÊTE** : carte dévoilée et sélectionnable pour Conserver, Rang, Dégâts (sur Assaut) ou Interférer à la fenêtre tactique.
- Les cartes du propriétaire cachées sont grisées et verrouillées visuellement ; l’adversaire voit toujours leur dos.

## 3. Chronologie tactique (conservée)

- Début de tour : choisir quelles Secondaires terminées dévoiler. Effet de dévoilement automatique, le cas échéant.
- Engagement secret : Primaire Assaut/Garde et nouvelle Secondaire facultative.
- Après révélation simultanée des Primaires : les joueurs choisissent secrètement leurs **actions de Secondaires actives**, avec accès aux informations publiques et sans voir les décisions tactiques adverses.
- Interférences résolues simultanément et sans chaîne de contre-réactions.
- **Ne pas verrouiller le mode Rang/Dégâts/Interférence à la révélation volontaire** : ce serait un nouveau système de pré-engagement qui modifie les choix disponibles, la compatibilité avec Assaut/Garde et le contre-jeu.

## 4. Tests à préserver

- Test score avec/sans affinité (+1), double affinité (+2), Garde gagnante sur égalité, Étincelle sur différence de score, signature ∞ inchangée, Interférence comparant les Rangs imprimés, aucun effet sur Puissance.
- Test interface distincte sur les trois états sans fuite de secret ; navigation clavier, mobile et revue visuelle sur navigateurs réels.
