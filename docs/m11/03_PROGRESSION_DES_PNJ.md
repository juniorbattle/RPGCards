# M11 — Contrat 3 : tout le monde progresse (tempéraments par chapitre)

**Date :** 2026-10-26. **Statut : PROPOSÉ** (décision de principe du responsable : « tout le monde autour progresse aussi
bien dans les dialogues que dans le jeu de cartes avec de meilleures stratégies, un npc passif par le passé peut devenir
agressif ou plus vicieux »). **Code :** `src/aventure/temperaments.ts` (pur). ADR 039.

## 1. Les tempéraments

| Tempérament | Au jeu (profil d'IA) | Dans les dialogues |
|---|---|---|
| **passif** | `timide` (existant) | hésite, propose plus qu'il ne provoque |
| **franc** | `novice` (existant ; valeur de l'annexe pour la rue) | direct, bon joueur |
| **rusé** | `ruse` (**nouveau** : prudent, niveau 2) | sous-entendus, observe |
| **agressif** | `agressif` (**nouveau**, contrat 5 : offensif, niveau 2) | provoque, presse |
| **calculateur** | `tacticien` (**nouveau** : équilibré, niveau 2) | compte, analyse |
| **vicieux** | `vicieux` (**nouveau** : Garde patiente, interfère, lit les habitudes, niveau 2) | piques, menaces voilées |

Les nouveaux profils ne lisent que la vue publique de l'IA (ADR 011) et ne changent rien au Duel standard (contrat 5).

Réglage mesuré (passe 144, `artifacts/qa/m11/temperaments.md`) : chaque tempérament d'après le chapitre I est plus dur
que « franc » (le `novice` de l'annexe) ; un premier essai (« rusé » sur le profil `lecteur`, « vicieux » qui bluffait
beaucoup) était **plus facile** que « franc » : un bluff élevé garde les Secondaires cachées, donc sans soutien.

## 2. Ce qui fait évoluer un PNJ

1. **Le chapitre** (I à V, `chapitreDetaille`) : chaque PNJ récurrent a une **trajectoire** (tableau §3). Au chapitre I,
   tous les PNJ de la rue sont **francs** (le profil `novice` de l'annexe de calibrage).
2. **Ses défaites contre vous** : battu **deux fois ou plus**, il « apprend » et monte d'un cran (passif → franc →
   agressif → vicieux ; rusé → vicieux ; calculateur et vicieux restent).
3. **Ses victoires contre vous** : il ne change pas de jeu, mais ses répliques le disent (assurance).

Le **deck** suit toujours les paliers de l'annexe (niveau du joueur) ; les **PV** aussi. La progression « au jeu de
cartes » passe par le profil d'IA, mécanisme existant (brief, limites dures) ; aucune valeur de l'annexe n'est touchée.

## 3. Trajectoires des PNJ récurrents (guetteurs, contrat 1)

| PNJ | I | II | III | IV | V |
|---|---|---|---|---|---|
| le docker du Quai (`rue-docker`) | franc | franc | agressif | agressif | vicieux |
| la joueuse du Parvis (`rue-joueuse`) | franc | passif | calculateur | calculateur | calculateur |
| le commis des Ruelles (`rue-commis`) | franc | passif | rusé | vicieux | vicieux |
| la joueuse de la Grande Cour (`rue-cour`) | franc | agressif | agressif | vicieux | vicieux |
| le docker du Port (`rue-port`) | franc | franc | franc | agressif | agressif |
| la joueuse de la Ville haute (`rue-haute`) | franc | calculateur | calculateur | calculateur | vicieux |
| un membre de la Cendre | franc | agressif | agressif | agressif | vicieux |
| un membre de la Ronce | franc | passif | franc | calculateur | calculateur |
| un membre du Voile | franc | rusé | rusé | vicieux | vicieux |
| un membre de l'Astre | franc | calculateur | calculateur | calculateur | calculateur |

« Un passif peut devenir agressif » : la joueuse de la Grande Cour (franche, puis agressive, puis vicieuse) ; le commis
des Ruelles (passif au chapitre II, rusé au III, vicieux au IV). Un PNJ battu au chapitre I qui revient au III (le docker
du Quai) joue plus fort (deck du palier du niveau III, profil agressif) et le dit.

## 4. Figures et rival

- **Cadets, bras droits, chefs, Épreuves, Joutes, Championnat** : leur profil d'IA est celui de l'annexe (`PROFIL_ROLE`),
  inchangé par défaut ; leurs **répliques** suivent un tempérament par chapitre (le défi se rejoue en revanche plus tard
  dans l'aventure : un cadet de la Cendre revu au chapitre IV parle comme quelqu'un qui a progressé).
- **Kaï** : tempérament franc (I), agressif (II, III), calculateur (IV), vicieux puis apaisé (V, titre) dans ses
  répliques ; au jeu, profil offensif de l'annexe. **Proposition** (fiche, désactivée par défaut) : les profils de
  tempérament aussi pour Kaï et les revanches des figures, avec les mesures du contrat 5.

## 5. Garanties testées (`test/m11-temperaments.test.ts`)

- la trajectoire de chaque PNJ récurrent, chapitre par chapitre (tableau §3, au chiffre près) ;
- au chapitre I, tout PNJ de la rue joue `novice` (annexe) ;
- deux défaites du PNJ le font monter d'un cran ; ses victoires ne changent pas son profil ;
- les figures gardent le profil de l'annexe ;
- le profil du duel préparé (`DuelPrevu.personnalite.aiProfile`) est celui du tempérament ;
- mesures (`tools/m11-temperaments.ts`) : taux de victoire du joueur « équilibré » contre chaque tempérament, par
  niveau, comparé au profil `novice` de l'annexe.
