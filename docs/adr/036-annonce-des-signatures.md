# ADR 036 — Annonce immédiate des Signatures engagées (avenant 08)

**Date :** 2026-10-24. **Statut : APPLIQUÉ** (passe 111). Texte de règle : `contracts/08_AVENANT_V3_3_SIGNATURES_ANNONCEES.md`,
**validé par le responsable** le 2026-10-24 avec les quatre recommandations de S-07.

## Contexte

Décision du responsable du 2026-10-24 : une Signature engagée en Primaire est visible des deux joueurs dès son
verrouillage, son mode restant secret. Le moteur verrouille chaque joueur séparément (`state.pending`) et n'applique
l'engagement qu'une fois les deux verrouillés ; le rival du jeu verrouille ≈ 0,65 s après l'ouverture de la phase.

## Décision

1. **Au verrouillage** d'un engagement dont la Primaire est une Signature, le moteur émet un événement public
   `signatureAnnounced` `{ player, defId }`, construit par liste blanche (ni mode, ni Secondaire), et garde l'annonce dans
   l'état public du tour (`reveal.signatures[joueur]`), remise à zéro au début du tour suivant ; l'événement public
   `committed` porte alors `signature: true` (le journal ne dit plus « face cachée »).
2. **Vue** : `PlayerView.reveal.signatures` (`me`, `opp`) porte l'identité annoncée ; `SideView.primary` ne change pas ;
   rien de `pending` n'est lu.
3. **IA** : `decideCommit` prend la Signature annoncée comme seule Primaire adverse possible.
4. **Présentation** : état `signatureAnnounced` du plateau, lignes du journal, animation sobre (une fois, mouvement
   réduit respecté).
5. **Étiquette des règles** `V3.0+delta-V3.3.1` ; preuve par rejeu des commandes d'avant (`tools/v33-annonce-preuve.ts`).
6. **Ordre des IA** réglable dans `Match` et `autoplay` (par défaut p1 puis p2, empreintes inchangées) ; les mesures de
   l'avenant font verrouiller l'adversaire en premier (`LQV_ORDRE=adversaire`).
7. **Main du joueur** : pendant l'attente du rival, les cartes engagées et verrouillées ne reviennent plus dans la main
   (la Signature annoncée est déjà sur le plateau).

## Conséquences

- L'engagement n'est plus entièrement secret : l'identité d'une Signature devient une information publique et
  stratégique ; l'ordre de verrouillage compte (qui voit qui), d'où le point S-07.2.
- Aucune règle de résolution ne change ; les mesures d'équilibre (rivaux, aventure, Championnat) diront l'effet réel.

## Amendement 1 (APPLIQUÉ, passe 114 ; validé par le responsable le 2026-10-24, pour les deux camps) — révision après une Signature annoncée

Demande du responsable : que le rival, qui verrouille presque toujours en premier, puisse réagir à la Signature du
joueur. Proposition : avenant 08, « Amendement 1 » (A1-1 à A1-5) : fenêtre de révision unique et définitive pour le
joueur déjà verrouillé quand l'adversaire verrouille ensuite une Signature ; phase moteur `REVISION`, commande `revise`
(garder ou nouvel engagement complet), ordre des verrouillages retenu dans l'état ; étiquette `V3.0+delta-V3.3.2`.
Tranché : la règle vaut pour les deux camps. Mise en œuvre : `closeCommit` (fenêtre si le SECOND engagement verrouillé porte une Signature), `applyRevision` (garder, ou nouvel engagement : annonce d'une Signature nouvellement engagée, `signatureWithdrawn` si le réviseur renonce à la sienne), `validateCommit` partagé, `commitOrder` / `commitHeld` / `revision` dans l'état ; vue `revision` (`held` pour le seul réviseur) ; IA : `decideCommit` rejoué avec le tirage de l'engagement, garde si son choix ne change pas ; plateau : « Le rival réagit à votre Signature… », fenêtre « Garder mon engagement / Verrouiller la révision » avec brouillon prérempli ; journal ; scénario `?scenario=signature-revision`.

**Jalon et mesures de l'amendement 1 (passe 117, build de `f5de4dc`) :** jalon de QA vert sur la Radeon 780M et la RTX 4060, en 1280 et en 1920, révision comprise (`artifacts/qa/v33/a1/jalon/`) ; mesures avant / après, l'adversaire verrouillant en premier (`artifacts/qa/v33/a1/comparaison.md`) : 1 à 1,9 fenêtre par duel dès que le joueur a une Signature, le rival révise environ 90 % du temps ; voie directe : chefs 48 / 54 / 53 / 51 → 48 / 48 / 45 / 46 %, Championnat 54 / 54 / 57 → 48 / 49 / 48 % ; Duel standard dans la marge. Fiche d'arbitrages : <https://claude.ai/artifact/CBP1sg6GMTABwg7FyatS7r>.
