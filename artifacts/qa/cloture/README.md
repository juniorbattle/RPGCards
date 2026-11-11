# Lot de correction de clôture — preuves (passes 224 et suivantes)

Source : fiche de clôture (`docs/FICHE_ARBITRAGES_CLOTURE.md`) et audit de fin de projet (`docs/AUDIT_FIN_DE_PROJET_2026-11-11.md`).

## Étape 1 — règles et moteur (passe 224)

Empreintes du Duel standard : corpus de `tools/m10a-empreintes.ts` (240 duels IA contre IA, quatre Signatures, variantes
toutes / aucune / quelques-unes en A, paires de Techniques, six profils historiques ; plus l'enregistrement de la RC s'il
existe), état complet et journal public et privé.

| Fichier | Moteur | Étiquette | Résultat contre `empreintes-avant.json` |
|---|---|---|---|
| `empreintes-avant.json` | `d72e97b` (avant le lot) | `V3.0+delta-V3.3.2` | référence |
| `empreintes-apres-regles.json` | corrections de l'étape 1 | `V3.0+delta-V3.3.2` (remise le temps de la mesure) | **241 identiques** |
| `empreintes-apres-v34.json` | corrections de l'étape 1 | `V3.0+delta-V3.4` | 241 écarts, **tous dus à l'étiquette seule** (champ `rules` de l'état haché) |

Lecture : aucune des corrections (Contre-jour, A1, raison de l'Interférence masquée, Escarbille et Sève sur un instantané)
ne touche ce corpus : il ne joue que des variantes A et des Basics (pas de Contre-jour, de Bouture, d'Écaille sous coup
mortel, de Leurre, d'Escarbille ni de Sève). Elles changent seulement les duels où ces cas se présentent (variantes B et C :
aventure, éditeur du Duel standard). Le nouveau numéro d'étiquette (`RULES_LABEL`, une seule constante) et le nouveau
catalogue (`catalogue-V3.0+48v+4s+6t`) font recommencer au tour 1 un duel sauvegardé en cours, comme à chaque avenant
(mécanisme existant : « Règles différentes » au Duel standard, « Version des règles ou du catalogue différente » dans
l'aventure).

Commandes : `npx tsx tools/m10a-empreintes.ts <sortie.json> [référence.json]` ; simulation `npm run sim` (200 duels :
8,68 tours en moyenne, 20 prolongations, aucune erreur).

## Étape 2 — IA de niveau 1 et mesures d'équilibre (passe 225)

IA de niveau 1 (Duel standard et profils historiques) : elle joue **Recentrage** (une carte de Rang I quand la main n'a ni
Rang III, ni Rang IV, ni Signature, selon le goût du profil pour les Techniques ; pas si le sommet connu de sa pioche est
aussi faible) et **retient tous ses regards privés** (`src/game/ai/memory.ts` : Murmure, Racine, Repoussement public,
Ombre portée, Miroir brisé, Clairvoyance, Repère, Sextant, retours au sommet). Mesures faites sur `6f5a2fa` et ces
changements d'IA (arbre de travail ; l'en-tête des fichiers ne donne que le commit de départ).

**Empreintes standard** (`tools/m10a-empreintes.ts`, contre l'étape 1) : 65 écarts sur 241, tous par les choix de l'IA (le
moteur n'a pas changé) : 61 duels où une Technique Recentrage est équipée (sur 160), 4 par la mémoire des regards.

### B1 — le Brasier Originel par paires de Signatures (`tools/cloture-signatures.ts`)

Deck standard en variantes A des deux côtés (seule la Signature diffère), sièges alternés, mêmes Techniques, IA
« équilibré » des deux côtés.

| Paire | 1er lot (1 200) | Confirmation (2 400, autres graines) | Total (3 600) |
|---|---:|---:|---:|
| Cendre contre Voile | 55,1 % | 53,2 % | 53,8 % |
| Cendre contre Ronce | 54,6 % | 55,2 % | 55,0 % (54,97) |
| Cendre contre Astre | 53,8 % | 53,7 % | 53,8 % |
| **Brasier contre les trois autres** | 54,5 % | 54,0 % | **54,2 % (10 800 duels)** |

Contexte (profils historiques tournants, 1 200 par paire) : Brasier 53,7 %. Les trois autres Signatures entre eux : 49,4
à 50,5 % (« équilibré »). **Décision (fiche B1) : sous le seuil de 55 %, Puissance 14 inchangée.** Fichiers :
`b1-signatures-p14.json`, `b1-signatures-p14-confirmation.json`.

### B2 — variantes à risque, 1 600 duels par variante (`tools/m12-variantes-mesure.ts`)

| Variante | Victoires | Écart |
|---|---:|---:|
| Cendre I B Tison | 48,9 % | −1,1 |
| Cendre I C Escarbille | 47,7 % | −2,3 |
| Cendre III B Surenchère | 50,3 % | +0,3 |
| Cendre IV C Phénix | 50,7 % | +0,7 |
| Astre I B Boussole | 53,6 % | +3,6 |

**Décision (fiche B2) : aucune sous −4 points, aucun ajustement.** Fichiers : `b2-variantes.md`, `b2-variantes.json`.

### Voie directe de l'aventure au calendrier M16 (garde-fou G3)

`LQV_TECHNIQUE=Sondage|Recentrage npx tsx tools/m10a-paliers.ts 150` (étapes de la trame, 150 duels par famille d'accueil
et par étape ; l'adversaire n'équipe pas plus de Techniques que le joueur n'en a apprises, comme en jeu). Colonne
« direct » : aucun duel facultatif.

| Étape (direct) | Départ Sondage | Départ Recentrage |
|---|---:|---:|
| Chefs (familles 1 à 4) | 53,0 / 48,5 / 45,5 / 47,7 % | 53,0 / 48,5 / 45,5 / 47,7 % |
| Championnat : poule, Miroir, Finale | 47,0 / 47,3 / 52,3 % | 47,0 / 47,3 / 52,3 % |
| Minimum de la trame | 45,5 % (chef de la famille 3) | 45,5 % |

Les deux départs ne diffèrent qu'au prologue et au premier cadet (ensuite, le joueur a les deux Techniques de la rue).
**G3 : toutes les étapes au-dessus de 40 %, aucune compensation à proposer.** Fichiers : `voie-directe-m16-sondage.*`,
`voie-directe-m16-recentrage.*`.

## Étape 6 — avenant 09 versé, campagne de vérification (passe 229)

Campagne sur le build de `4b02654` (étapes 1 à 5 sur `main`), un outil à la fois, Chrome sur la Radeon 780M (`LQV_GPU=1`),
1280 × 720 ; résumé `campagne/resume.txt`, rapports JSON `campagne/rapports/` (journaux `*.log` gardés hors de git ; les rapports
suivis du dépôt et les captures régénérées sont remis à leur version de `main`, fiche E5).

| Vérification | Résultat |
|---|---|
| `tsc --noEmit` | vert |
| `vitest` | **939 / 939** (73 fichiers) |
| `npm run build` | vert ; `three` 547 kB et code du jeu 715 kB, sans sourcemap |
| Simulation (`npm run sim`, 200 duels) | 8,69 tours en moyenne, 20 prolongations, aucune erreur |
| `qa:product` | 9 parcours |
| `qa:rc` (salle, bar, arène) | 9 campagnes |
| `qa:browser` | 3 duels de bureau (mobile hors de la porte, E2) |
| `qa:techniques` | 4 / 4 (souris 1280 ; tactile hors de la porte) |
| `qa:aventure` | 48 contrôles, aucun échec |
| `qa:maison` | 29 / 29 |
| `qa:voies` | 62 / 62 |
| `qa:vivante` | 35 / 35 |
| `qa:championnat` | 13 contrôles, aucun échec |
| `qa:vue` | 29 / 29 |
| `m14-recit-guide` | 45 / 45 |
| **`m14-recit-guide` aux réglages par défaut d'un joueur** (`LQV_M14_DEFAUTS=1` : cinématiques, conseils, tour assisté, choix de la variante) | **45 / 45**, du prologue au titre (premier passage arrêté par un sélecteur périmé de l'outil, `[data-key="av-choix"]` au lieu de `[data-screen="av-choix"]` ; corrigé, relancé) |
| `m14-preparation` | 25 / 25 |
| `m16-chasse` | 27 / 27 |
| `m17-lecons` (tour assisté) | **131 / 131** (dix-neuf leçons, souris, clavier, manette, aucun ancien vocabulaire) |
| `m18-tour` | **35 / 35** (révision, `tenir=1` compris) |
| `m18-tour`, mouvement réduit du jeu (`LQV_REDUIT=1`) | **38 / 38** |
| `m18-tour`, mouvement réduit du système émulé (`LQV_SYSTEME_REDUIT=1`, §6 bis) | **35 / 35** |
| `manette` | 34 / 34 |

Planches de preuve (`screenshots/qa/cloture/`) : la révision au tour assisté, avant et après la modification
(`planche-revision-avant.png`, `planche-revision-apres.png`) ; l'aperçu tactique sur deux lignes
(`planche-apercu-deux-lignes.png` : « si le rival conserve : ta Garde tient 4 contre 4 » / « s'il amplifie : tu perds 4
contre 7 : −6 PV », le cas relevé par l'audit).
