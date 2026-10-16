# ADR 003 — Caméra PROVISOIRE : vue de dessus inclinée par défaut, frontale 2.5D comparative
Date : 2026-10-16
Statut : **remplacé par ADR 006 (M02)** — conservé pour l’historique des captures comparatives M01

**Contexte.** Le mandat autorise deux pistes HD-2D : *tilted top-down* ou *frontale 2.5D*. Le plateau de cartes doit rester lisible et prioritaire.

**Options.**
- `tilted` : caméra (0, 14.5, 8.4) → (0, 0, −0.4), fov 42. Le sol (cercle rituel, estrades) se lit comme une table de jeu sous le plateau DOM ; l’opposition joueur (proche) / rival (lointain) correspond à la disposition des rangées de cartes.
- `frontal` : caméra (0, 2.6, 13.5) → (0, 2.2, −1), fov 40. Couches de profondeur (estrades, piliers, bannières, arche) ; plus scénique, mais l’arène passe derrière les cartes et les FX au sol sont moins lisibles.

**Décision provisoire.** `tilted` par défaut : meilleure cohérence spatiale avec la disposition des zones de cartes et lisibilité des FX au sol (onde de Clash, dôme de Garde) ; `frontal` reste accessible (bouton « Vue », paramètre `?cam=frontal`) pour comparaison par captures (`screenshots/qa/cam-*.png`).

**Conséquences.** La scène est isolée (`src/scene/arena.ts`) : changer de caméra ou de décor n’affecte ni moteur ni UI. Aucune caméra, palette ou décor de RPG-ArtByCode n’a été repris.

**Question nécessitant approbation.** Choix de piste pour la suite HD-2D (après revue des captures comparatives).
