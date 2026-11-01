# ADR 049 — L'interface hors combat de l'aventure

**Date :** 2026-11-01. **Statut : APPLIQUÉ, À RECEVOIR** (passe 184 ; demande du responsable : « peaufine moi le UI/HUD du
jeu [...] il faut que nous soyons tres qualitatif »).

## Constat

Captures de tous les écrans hors combat (`tools/m14-ui-audit.mjs`) : des boîtes arrondies d'application web sur un décor de
JRPG, deux polices mélangées, six éléments de HUD dispersés aux quatre coins, un menu en boutons jetés dans la boîte de
dialogue. Trois défauts francs : la nouvelle aventure débordait de 254 px en 1280 × 720, « Commencer » hors de l'écran ; le
« Fermer » du journal était coupé ; le titre recouvrait le buste du personnage.

## Décision

- **Un langage commun** (`src/ville/ui.ts`, `src/aventure/styles.ts`) : variables `--lqv-*`, cadre à filet double et losanges
  des coins dessiné par code en SVG (`--lqv-cadre`), coins carrés, Georgia pour ce qui se lit et se clique, police système
  pour les petites données. Aucune police ni image externe.
- **HUD :** un seul cartouche en haut à gauche (lieu, chapitre, voie, objectif), sur un voile qui laisse le décor visible ;
  les outils groupés à droite ; plus rien en bas, sauf « Suite du récit ». Il grandit avec l'écran.
- **Dialogues :** bandeau cadré, nom sur une plaque, texte en Georgia, choix à droite.
- **Menu :** un panneau à droite, une entrée par ligne, sa valeur au bout.
- **Écrans :** titre et résultat sous le buste ; nouvelle aventure en deux colonnes, sans défilement ; journal en deux
  colonnes, quêtes finies repliées, étape courante marquée ; boutons d'une fenêtre toujours visibles.

## Périmètre

Mode Aventure et ville. Le jeu par défaut ne charge pas ces styles : son accueil et son jeu au repos ne changent pas. Le
duel, les cartes et l'enveloppe du Duel standard n'ont pas été touchés.
