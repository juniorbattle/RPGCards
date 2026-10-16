# ADR 002 — Surface de jeu en DOM vanilla TS + Pointer Events (pas de framework UI)
Date : 2026-10-16
Statut : proposé

**Contexte.** Contrat 05 : manipulation directe (clic-pour-poser **et** glisser-déposer, tactile sans survol, clavier), lisibilité, aucun `<select>` comme mécanique. Three.js requis pour la scène, pas pour la surface des cartes.

**Options.**
- A. Cartes en 3D (raycasting) : lisibilité, accessibilité et zoom médiocres ; contraire au mandat.
- B. Framework (React/Svelte/Solid) : utile pour de gros formulaires ; ajoute dépendance, rendu concurrent à synchroniser avec le drag pointeur.
- C. DOM vanilla TS + mini-helper `h()` + re-rendu complet depuis `PlayerView` + gestionnaire Pointer Events dédié. (retenu)

**Décision.** C. Le DOM est reconstruit à chaque changement d’état (≈ 40 nœuds de cartes) ; le focus clavier est restauré par clé `data-key` ; aucun re-rendu pendant un glisser. Le HTML5 DnD natif est écarté (inopérant au tactile). Les cartes cachées adverses sont des versos **sans** `data-def` ni identifiant d’instance (audit automatique dans `qa:browser`).

**Conséquences.** Zéro dépendance UI ; le gestionnaire `DragManager` distingue clic (< 6 px), glisser et appui long (inspection). Si l’UI s’étoffe (ville, collection), réévaluer B.

**Tests.** `npm run qa:browser` : duels complets en glisser souris, clic, clavier seul et glisser tactile CDP (390×844).
