# ADR 048 — Promenade libre et Récit guidé

**Date :** 2026-11-01. **Statut : PROPOSÉ, APPLIQUÉ** (contrat `docs/m14/01_RECIT_GUIDE.md`, révision 2, passe 183 ; à recevoir au test du responsable).

## Contexte

Le responsable veut deux manières de vivre l'aventure : la promenade libre d'aujourd'hui, où l'on affronte les joueurs de
rue en menant la quête, et un récit assisté centré sur la trame, où des écrans noirs mènent d'événement en événement, le
déplacement libre restreint au profit de la mise en scène, de la narration et des combats, notamment pour le mobile.

## Décision proposée

- **Le mode est un réglage de l'aventure, pas un fait.** Champ facultatif `recit` de la sauvegarde `aventure/2`, sans
  migration ; la machine de l'aventure ne le lit pas. Quêtes, duels et récompenses sont communs.
- **Le trajet est un écran noir** : le fondu de `voyager`, puis le point d'apparition `npc-<id>`, celui du retour d'un duel.
  Une traversée filmée a été écartée par le responsable : ni marche scénarisée, ni recherche de chemin.
- **La marche est coupée** tant que la trame a une suite ; l'écart à la trame passe par la Promenade libre, à tout moment.
- **La suite se déduit des faits** (`suiteRecit`, `etapeRecit`), en parité testée avec `objectif`, et Kaï passe en premier, car ses
  événements ne se rattrapent pas.
- **Rencontres en vue et surgissements au hasard coupés** en Récit guidé : Kaï passe par « Suite du récit ».
- **Aucune compensation d'entraînement d'office** (décision du responsable) ; annexe de calibrage inchangée. Des PV de plus
  à la victoire d'un combat narratif restent le recours si la mesure le demande, sur son ordre.

## Conséquences

- La Promenade libre reste le mode par défaut et le jeu par défaut au repos reste identique au pixel près.
- `objectif` et `etapeRecit` doivent évoluer ensemble, ce que la parité testée impose.

## Fiche M14 (2026-11-01)

Reçu après le test du responsable (R1), statut inchangé d'ici là. Écart : **la Halte**, interface propre au Récit guidé (deck, réglages, duels de rue entre deux étapes), demandée en G1 et G2 ; contrat 1, §4 bis.

## Révision 3 du contrat (2026-11-02, retour du test du responsable)

Le Récit guidé devient une structure théâtrale : la ville n'est plus qu'un décor de scène, deux écrans seulement (la scène et la **Préparation**, plein écran, qui remplace la Halte et le bouton « Suite du récit » posé sur la ville), séparés par le noir. Les scènes s'enchaînent seules ; la Préparation ne s'ouvre qu'avant un duel de la trame (`enchainement`, `src/aventure/guide.ts`). Kaï surgit au début de la séquence suivante, à la place de ce qui est annoncé. Contrat 1, §4 et §4 bis. Promenade libre, duels, récompenses et sauvegarde `aventure/2` inchangés ; aucune image. Statut inchangé jusqu'au test du responsable.
