Jalon de QA de la finalisation de la ville (M09, passe 140), sur `main` à `52c44b5` (yeux des PNJ réapprouvés compris), contre le build de la RC `a785f39` pour le pixel près ; `tools/m10f-campagne.sh`, une campagne à la fois, 2026-10-26 de 02:57 à 04:10 UTC : 54 étapes sur 54 à code 0. Performances de la ville mesurées ensuite sur les six îlots (la Place du Fanal et la Ville haute ajoutées à `tools/m10f-perf-ville.mjs`, même build), sur les deux GPU et aux deux tailles : remplacent les mesures à quatre îlots de la campagne.

### Radeon 780M

| Parcours | 1280 × 720 | 1920 × 1080 |
|---|---|---|
| Jeu par défaut au pixel près (`l5-identique`) | IDENTIQUE au pixel près | (même série) |
| Démo (`qa:demo`) | 30/30 | 30/30 |
| Aventure (`qa:aventure`) | 48/48 | 48/48 |
| Maison (`qa:maison`) | 29/29 | 29/29 |
| Voies (`qa:voies`) | 62/62 | 62/62 |
| Ville vivante (`qa:vivante`) | 35/35 | 35/35 |
| Championnat (`qa:championnat`) | 13/13 | 13/13 |
| Annonce V3.3 | 10/10 | 10/10 |
| Révision V3.3 | 8/8 | 8/8 |
| Accessoires (`qa:accessoires`) | OK console : aucune erreur | |
| Ville en rangs, médiane/p95/max entre images | quai 6.1/6.2/6.4 ms, 236 appels ; parvis 6.1/6.2/6.5 ms, 242 appels ; ruelles 6.1/6.2/6.6 ms, 202 appels ; cour 10.1/14.4/15.1 ms, 161 appels ; port 6.1/6.2/6.8 ms, 167 appels ; haute 6.1/6.2/6.4 ms, 175 appels | quai 6.1/12.2/12.6 ms, 236 appels ; parvis 6.1/12.2/12.4 ms, 242 appels ; ruelles 6.1/12.2/18.1 ms, 202 appels ; cour 6.1/6.2/12.3 ms, 161 appels ; port 6.1/12.2/12.6 ms, 167 appels ; haute 6.1/12.2/12.5 ms, 175 appels |
| Duel (`perf:play`) | [["jeu-1280-clic",6.1,6.2],["jeu-1920-clic",6.1,6.2]] | |
| `qa:browser` | QA navigateur M03 OK (5 duels complets) — rapport artifacts/qa/m09/finalisation/jalon/qa-browser-780m.json | |
| `qa:product` | A 11/11, B 4/4, C 5/5, D 6/6, E 18/18, F 10/10, G 4/4, H 3/3, I 6/6 | |
| `qa:rc` (defaut) | QA RC OK (9 campagnes) — artifacts/qa/qa-rc.json | |
| `qa:rc` (bar) | QA RC OK (9 campagnes) — artifacts/qa/qa-rc.json | |
| `qa:rc` (arene) | QA RC OK (9 campagnes) — artifacts/qa/qa-rc.json | |
| `qa:techniques` | 8/8 parcours sans problème | |

### RTX 4060

| Parcours | 1280 × 720 | 1920 × 1080 |
|---|---|---|
| Jeu par défaut au pixel près (`l5-identique`) | IDENTIQUE au pixel près | (même série) |
| Démo (`qa:demo`) | 30/30 | 30/30 |
| Aventure (`qa:aventure`) | 48/48 | 48/48 |
| Maison (`qa:maison`) | 29/29 | 29/29 |
| Voies (`qa:voies`) | 62/62 | 62/62 |
| Ville vivante (`qa:vivante`) | 35/35 | 35/35 |
| Championnat (`qa:championnat`) | 13/13 | 13/13 |
| Annonce V3.3 | 10/10 | 10/10 |
| Révision V3.3 | 8/8 | 8/8 |
| Accessoires (`qa:accessoires`) | OK console : aucune erreur | |
| Ville en rangs, médiane/p95/max entre images | quai 6.1/6.2/6.3 ms, 236 appels ; parvis 6.1/6.2/6.3 ms, 242 appels ; ruelles 6.1/6.2/6.4 ms, 202 appels ; cour 6.1/6.2/6.5 ms, 161 appels ; port 6.1/6.2/6.3 ms, 167 appels ; haute 6.1/6.2/6.3 ms, 175 appels | quai 6.1/6.2/6.3 ms, 236 appels ; parvis 6.1/6.2/6.4 ms, 242 appels ; ruelles 6.1/6.2/6.3 ms, 202 appels ; cour 6.1/6.2/6.4 ms, 161 appels ; port 6.1/6.2/6.3 ms, 167 appels ; haute 6.1/6.2/6.3 ms, 175 appels |
| Duel (`perf:play`) | [["jeu-1280-clic",6.1,6.3],["jeu-1920-clic",6.1,6.3]] | |
| `qa:browser` | QA navigateur M03 OK (5 duels complets) — rapport artifacts/qa/m09/finalisation/jalon/qa-browser-rtx.json | |
| `qa:product` | A 11/11, B 4/4, C 5/5, D 6/6, E 18/18, F 10/10, G 4/4, H 3/3, I 6/6 | |
| `qa:rc` (defaut) | QA RC OK (9 campagnes) — artifacts/qa/qa-rc.json | |
| `qa:rc` (bar) | QA RC OK (9 campagnes) — artifacts/qa/qa-rc.json | |
| `qa:rc` (arene) | QA RC OK (9 campagnes) — artifacts/qa/qa-rc.json | |
| `qa:techniques` | 8/8 parcours sans problème | |

Journaux avec « ÉCHEC » ou « Error: » : aucun.
