# ADR 013 — Baseline visuelle desktop verrouillée par le responsable

Date : 2026-10-16
Statut : **APPROUVÉ — référence de production visuelle du duel**. **Amendé par l'ADR 016** (2026-10-17) : vue A
pendant toute la partie, pose comprise, vue B seulement à la demande ; cases au format des cartes. **Amendé par le
mandat M07** (2026-10-17, `docs/missions/M07_MISE_EN_SCENE_ET_LISIBILITE.md`) : rival sans mains (ADR 017), plateau
symétrique et lisible avec tour guidé (ADR 018), mise en scène HD-2D du décor et de la lumière ; composition des HUD et
présence du visage conservées, **rival de face confirmé par le responsable** (pas de portraits dans les coins, ADR 018).

## Décision

Le responsable **valide entièrement le nouveau cadrage M03.2** : le rival est clairement visible de face, de la tête au haut du corps, avec yeux et expressions perceptibles ; la vue A frontale constitue le défaut du duel, la vue B inclinée sert à manipuler les cartes sans faire disparaître le rival. **Ne pas revenir au cadrage distant de M02/M03**.

Structure approuvée et à préserver : rival au centre-haut, HUD rival compact haut-gauche, HUD joueur compact et apparenté bas-gauche, bulle haut-droite, main basse, commandes périphériques, centre libéré pour la confrontation ; postures ASSAUT rouge / GARDE bleu, six animations physiques de Clash, défausse correcte des deux Primaires et 1–3 conséquences lisibles.

Base technique : ADR 009, 010, 012 ; `reference/REFERENCE_VISUELLE_VALIDEE_M03.jpg` reste référence de comparaison uniquement. Les proportions M03.2 (visage ≈ 83 px yeux→menton à 1280×720, ≈ 11,5 % hauteur, 125 px à 1920×1080) sont **des repères QA approuvés**, non un verrou de pixels absolus lorsqu'on change résolution ou zoom d'accessibilité. L'éclairage et les contrastes acquis (≥4,5:1 dans les 13 scènes mesurées M03.2) doivent être préservés ou améliorés. Les costumes, shaders supplémentaires, caméra d'exploration urbaine restent non définis.

## Conséquences

- **Les prochaines tâches privilégient le jeu opérationnel** plutôt que des démonstrations de shaders ou une refonte graphique.
- Les optimisations de performance sont autorisées, mais **pas au prix d'un recul significatif de la présence du rival, de la luminosité utile ou de la lisibilité des cartes**. Toute proposition de compromis majeur exige une comparaison visuelle et approbation.
- La vue B reste disponible et la chorégraphie par phases est conservée. Les vrais tells et le Sang-froid ne sont pas autorisés à ce stade.
- **Mobile paysage repoussé** à un chantier ultérieur : conserver les fonctionnalités déjà livrées, ne pas créer de nouveau design mobile maintenant.
- Ce verrou s'applique à la **présentation du duel desktop**, pas au design non encore arrêté du hub de ville HD-2D ou d'une exploration future.

**Cette décision n'introduit aucune règle métier nouvelle.**