# ADR 041 — IA de combat : un niveau 2 en nouveaux profils

**Date :** 2026-10-26. **Statut : PROPOSÉ.** Contrat : `docs/m11/05_IA_DE_COMBAT.md`.

## Contexte
L'IA heuristique (`policy.ts`) ignore les cartes grises, évalue mal sa propre Signature annoncée, joue certaines
Techniques au hasard et a une mémoire courte. Le Duel standard doit rester identique (empreintes, replays, tests).

## Décision
1. Champ facultatif `niveau` des profils ; les profils existants n'en ont pas et passent par l'ancien code, **même suite
   de tirages** ; les nouveaux profils (`tacticien`, `agressif`, `vicieux`) ont `niveau: 2`.
2. Les améliorations du niveau 2 ne lisent que la vue publique et la mémoire tirée des événements visibles (ADR 011).
3. `RivalPersonality.aiProfile` accepte les nouveaux profils ; seule l'aventure les choisit (tempéraments, ADR 039).

## Conséquences
Le Duel standard ne change pas ; l'extension au jeu standard est une proposition chiffrée de la fiche.
