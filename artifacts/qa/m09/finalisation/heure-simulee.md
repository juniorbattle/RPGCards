# Heure de ville simulée (finalisation de la ville, passe 137)

Commit `8085266`, 2026-10-26 ; `npx tsx tools/m09-heure-ville.ts 200`. Directeur des rencontres du jeu
(`src/aventure/directeur.ts`), ville en rangs avec la Place du Fanal et la Ville haute ouvertes, **200 profils** par
chapitre (graines différentes, familles d'accueil en alternance), chacun au début du chapitre (`src/aventure/departs.ts`).

**Heure type (modèle déclaré, pas une mesure de joueur)** : 40 arrivées dans un îlot (marche au hasard sur les sorties
réelles) et un duel toutes les 4 arrivées ; une rumeur présente est écoutée ; au moment d'un duel, une rencontre
facultative présente est acceptée 6 fois sur 10 ; hors duel, elle est refusée 3 fois sur 10.

Rencontres **facultatives** comptées : duels de rue, membres des familles, l'ombre de Kaï, rumeurs (les figures de la
trame, posées en permanence, ne sont pas comptées). Garanties du contrat : jamais plus de 2 à la fois ;
aucun tirage hors d'un point de décision ; un refusé ne redemande pas (« relances » : un refusé encore là à l'arrivée
suivante dans le même îlot) ; Kaï au plus une fois par chapitre.

| Chapitre | arrivées sans rencontre | avec 1 | avec 2 | plus de 2 | nouvelles rencontres / heure | rumeurs écoutées / heure | duels de rue joués / heure | ombre de Kaï / heure | refus / heure | relances | rencontres présentes par arrivée (Quai / Parvis / Ruelles / Cour / Port / Haute) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| I | 3 % | 56 % | 40 % | 0 | 34.1 | 19.9 | 4.4 | 1.0 (max 1) | 6.5 | 0 | 1.48 / 1.37 / 1.36 / 1.29 / 1.31 / 1.26 |
| II | 3 % | 57 % | 40 % | 0 | 34.4 | 20.1 | 4.5 | 1.0 (max 1) | 6.7 | 0 | 1.44 / 1.38 / 1.34 / 1.33 / 1.29 / 1.29 |
| III | 2 % | 52 % | 46 % | 0 | 33.4 | 17.8 | 4.7 | 1.0 (max 1) | 7.1 | 0 | 1.64 / 1.41 / 1.39 / 1.35 / 1.30 / 1.29 |
| IV | 2 % | 48 % | 50 % | 0 | 32.3 | 15.7 | 4.8 | 1.0 (max 1) | 7.5 | 0 | 1.70 / 1.41 / 1.53 / 1.35 / 1.36 / 1.28 |
| V | 2 % | 45 % | 53 % | 0 | 31.5 | 14.0 | 5.0 | 1.0 (max 1) | 7.4 | 0 | 1.73 / 1.57 / 1.51 / 1.34 / 1.41 / 1.35 |

Lecture : ces chiffres disent **combien** la ville propose ; **si c'est intrusif** reste le jugement du responsable
(heure jouée, V1 de la fiche M10-E ; page `docs/HEURE_DE_VILLE.md`).
