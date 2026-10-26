# ADR 040 — Système de répliques et trame de bout en bout

**Date :** 2026-10-26. **Statut : PROPOSÉ.** Contrat : `docs/m11/04_DIALOGUES_ET_NARRATION.md`.

## Contexte
Les répliques de l'aventure étaient dispersées dans `app.ts` (constantes, ternaires par chapitre) et se répétaient.

## Décision
1. Un catalogue pur `src/aventure/repliques.ts` : répliques par locuteur avec un prédicat sur un contexte de faits
   publics (chapitre, voie, tempérament, relation, moment) ; choix le plus spécifique puis tirage déterministe ; jamais la
   même réplique deux fois de suite pour un même locuteur (mémoire `dialogues` dans la sauvegarde).
2. `app.ts` demande une réplique au catalogue au lieu de l'écrire.
3. Tests de forme sur tout le catalogue : longueur d'une bulle, épicène, aucun point médian.

## Conséquences
L'écriture devient une donnée relisible et testable ; le responsable peut relire toutes les voix en un fichier.
