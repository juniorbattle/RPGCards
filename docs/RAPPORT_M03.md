# Rapport M03 — Fidélité à la preview validée, HUD et chorégraphies du Clash

Branche `claude/m03-ui-fidele-et-clash-anime`, dérivée de `claude/m03-direction-visuelle-et-clash` (contrat M03 + preview), elle-même issue du livrable M02 `e978d2d`. `main` intacte, aucune fusion.
Règles : **V3.0 + delta V3.2 inchangés** (aucune modification du moteur de règles).
Référence : `reference/REFERENCE_VISUELLE_VALIDEE_M03.jpg` — **document de revue uniquement** (planches de comparaison), jamais chargé par le jeu.
Preuves : <!-- SHA_PREUVES -->

## 1. Ce qui change pour le joueur

- **La composition de la preview** : scène plein cadre ; **HUD du rival en haut à gauche**, **HUD du joueur compact en bas à gauche** (portrait procédural, PV, Insight, Main | Pioche | Déf.) — plus aucune bande HUD traversant l’écran ; **main centrée en bas** (grandes cartes) ; **commandes et Techniques en bas à droite** ; bulle du rival en haut à droite (humeur + réplique) ; **journal dans un tiroir** ; inspection flottante ; le centre appartient au rival, aux Primaires et au Clash.
- **La salle aux bougies** : bannières des quatre familles derrière le rival, arches ouvertes sur un ciel étoilé, bougies vacillantes, plantes, table vernie à incrustations dorées ; le rival (capuche pour Maëlle) tient l’éventail de ses cartes au bord de la table. 100 % code.
- **Deux caméras conservées** : vue A frontale par défaut, vue B inclinée pour poser les cartes — **le visage du rival reste visible en vue B** ; les rangées et la main glissent d’une vue à l’autre.
- **ASSAUT / GARDE lisibles d’un coup d’œil** : bandeau rouge à pointe / bleu à bouclier sur chaque Primaire révélée, sur le plateau comme dans le face-à-face ; avant la révélation, rien du mode adverse n’est affiché.
- **Les cartes s’affrontent** : à la résolution, les deux Primaires viennent se faire face (VS, Rang), puis la chorégraphie du résultat **calculé par le moteur** se joue (charge, collision, bouclier, recul, absorption…), les blessures s’affichent, et **les deux Primaires partent à la défausse**, gagnante comprise.

<!-- CORPS -->
