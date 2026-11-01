# ADR 048 — Promenade libre et Récit guidé

**Date :** 2026-11-01. **Statut : PROPOSÉ** (contrat `docs/m14/01_RECIT_GUIDE.md`, à valider par le responsable).

## Contexte

Le responsable veut deux manières de vivre l'aventure : la promenade libre d'aujourd'hui, où l'on affronte les joueurs de
rue en menant la quête, et un récit assisté centré sur la trame, où le joueur est mené d'objectif en objectif par les
cinématiques runtime, la ville restant visible pour la cohérence et l'immersion.

## Décision proposée

- **Le mode est un réglage de l'aventure, pas un fait.** Champ facultatif `recit` de la sauvegarde `aventure/2`, sans
  migration ; la machine de l'aventure ne le lit pas. Quêtes, duels et récompenses sont communs.
- **Le trajet est une suite de cinématiques ordinaires** (`Cinema`), avec une marche scénarisée du joueur et un itinéraire
  pur calculé sur les obstacles. Il n'y a ni vidéo, ni image, ni son ajouté.
- **La cible se déduit des faits** (`cibleRecit`), en parité testée avec `objectif`, et Kaï passe en premier, car ses
  événements ne se rattrapent pas.
- **Rencontres en vue coupées** en Récit guidé, par `peutForcer`.
- **Aucune compensation d'entraînement d'office** (décision du responsable) ; annexe de calibrage inchangée. Des PV de plus
  à la victoire d'un combat narratif restent le recours si la mesure le demande, sur son ordre.

## Conséquences

- Le contrat 7 des cinématiques est amendé pour ce seul usage : une traversée peut durer 12 s, en plans de 5 s au plus.
- La Promenade libre reste le mode par défaut et le jeu par défaut au repos reste identique au pixel près.
- `objectif` et `cibleRecit` doivent évoluer ensemble, ce que la parité testée impose.
