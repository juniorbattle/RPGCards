# ADR 038 — Le rival en événements fixes (K1 à K6)

**Date :** 2026-10-26. **Statut : PROPOSÉ.** Contrat : `docs/m11/02_RIVAL_EVENEMENTS_FIXES.md`.

## Contexte
« L'ombre de Kaï » (M10-E) était une rencontre facultative tirée par le directeur, une fois par chapitre. Le responsable
veut un rival qui surgit à des moments écrits de la trame.

## Décision
1. Un catalogue pur `src/aventure/rival.ts` : six événements (K1 à K6) avec leurs faits déclencheurs, leurs îlots, leur
   duel (rôle `rival` du palier) ou leur scène ; `evenementRival` renvoie l'événement dû à un point de décision.
2. État `rival` dans la sauvegarde (événements accomplis et leur issue) ; la rencontre de duel s'appelle `rival:K<n>`.
3. L'ancienne rencontre `rival-kai` n'est plus tirée (disponibilité fausse) ; elle reste dans le catalogue pour relire
   et reprendre une sauvegarde qui en a une en cours ; la quête « L'ombre de Kaï » devient « Kaï, la Braise du quai ».
4. Mise en scène : apparition à 3,5 m sur un point praticable en vue, course, réplique, duel forcé.

## Conséquences
Le rival devient prévisible et dramatique ; plus de duel du rival au hasard. Un événement manqué (îlots non visités dans
son chapitre) ne se rattrape pas : choix le plus simple, signalé dans la fiche.
