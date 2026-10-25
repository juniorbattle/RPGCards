# ADR 036 — Annonce immédiate des Signatures engagées (avenant 08)

**Date :** 2026-10-24. **Statut : PROPOSÉ.** Texte de règle : `contracts/08_AVENANT_V3_3_SIGNATURES_ANNONCEES.md`, soumis
au responsable avec ses points à trancher (S-07) ; rien n'est codé avant sa validation explicite.

## Contexte

Décision du responsable du 2026-10-24 : une Signature engagée en Primaire est visible des deux joueurs dès son
verrouillage, son mode restant secret. Le moteur verrouille chaque joueur séparément (`state.pending`) et n'applique
l'engagement qu'une fois les deux verrouillés ; le rival du jeu verrouille ≈ 0,65 s après l'ouverture de la phase.

## Décision proposée (sous réserve de S-07)

1. **Au verrouillage** d'un engagement dont la Primaire est une Signature, le moteur émet un événement public
   `signatureAnnounced` `{ player, defId }`, construit par liste blanche (ni mode, ni Secondaire), et garde l'annonce dans
   l'état public du tour (`players[p].announced`), remise à zéro au début du tour suivant.
2. **Vue** : `SideView.primary` adverse porte la carte annoncée avec `stance: null` tant que la révélation n'a pas eu lieu,
   y compris pendant l'engagement quand la Primaire n'est encore que dans `pending` ; rien d'autre de `pending` n'est lu.
3. **IA** : `decideCommit` prend la Signature annoncée comme seule Primaire adverse possible.
4. **Présentation** : état `signatureAnnounced` du plateau, lignes du journal, animation sobre (une fois, mouvement
   réduit respecté).
5. **Étiquette des règles** `V3.0+delta-V3.3.1` ; preuve des empreintes par rejeu des commandes d'avant.

## Conséquences

- L'engagement n'est plus entièrement secret : l'identité d'une Signature devient une information publique et
  stratégique ; l'ordre de verrouillage compte (qui voit qui), d'où le point S-07.2.
- Aucune règle de résolution ne change ; les mesures d'équilibre (rivaux, aventure, Championnat) diront l'effet réel.
