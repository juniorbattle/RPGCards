# ADR 042 — Son synthétisé par code (Web Audio)

**Date :** 2026-10-26. **Statut : PROPOSÉ.** Contrat : `docs/m11/06_SON.md`.

## Contexte
Le responsable veut des effets sonores et des ambiances. AGENTS : aucun son externe au runtime ; art « code-first ».

## Décision
1. Module `src/son/` : `reglages.ts` (volume, coupure, stockage protégé, coupure en QA), `catalogue.ts` (recettes de
   synthèse), `evenements.ts` (pur : événements du moteur → sons), `moteur.ts` (contexte Web Audio créé au premier geste,
   bus effets, ambiance, interface, limiteur).
2. Branchements : duel (événements publics et privés du joueur), ville (pas, repère, rival, voyage, ambiance par îlot),
   interface (boutons) ; réglages dans les Options du jeu standard et le menu de l'aventure.
3. Coupé en QA (`?qa=1`, sauf `?son=1`) ; `?son=0` coupe.

## Conséquences
Aucune dépendance, aucun fichier ; le rendu ne change pas (jeu par défaut au pixel près). L'écoute se fait en local.
