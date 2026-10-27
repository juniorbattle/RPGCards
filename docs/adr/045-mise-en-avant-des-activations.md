# ADR 045 — Les activations mises en avant au premier plan

**Date :** 2026-10-27. **Statut : PROPOSÉ.** Contrat : `docs/m12/02_MISE_EN_AVANT_DES_ACTIVATIONS.md`.

## Contexte
En combat, les effets de cartes, les Techniques, les regards privés, l'Insight, le camouflage et le Repoussement ne sont
que du texte (panneau « Résolution », journal) ; le responsable demande de vraies mises en avant (impulsions, animation
au centre de l'écran, au premier plan), à la manière de *Duel Links*.

## Décision
1. `activations.ts` (pur) : des événements visibles du spectateur aux temps forts (sans recalcul ; secret par
   construction : effet masqué générique, regard privé à son seul propriétaire).
2. `activationStage.ts` : un premier plan DOM animé par la Web Animations API (carte agrandie, impulsions, bannière,
   conséquence en grand), comme la scène du Clash (M03) ; rythmes normal, rapide, instantané ; mouvement réduit ; gel ;
   « Passer » nettoie tout.
3. Un temps de résolution par effet ; hors résolution, une file que le rival attend ; impulsions du plateau pour ce qui
   est possible (Secondaire activable, Technique utilisable, effet armé).

## Conséquences
Aucune règle changée ; le rythme d'un tour s'allonge d'environ une seconde par activation au rythme normal (rapide :
× 0,45 ; instantané : rien). Les captures de QA du duel changent ; les parcours de QA en rythme instantané ne voient
aucun temps fort.
