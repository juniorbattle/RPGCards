# M11 — Contrat 2 : Kaï, le rival en événements fixes

**Date :** 2026-10-26. **Statut : PROPOSÉ** (décision de principe du responsable : « notre rival sera des événements fixes
et déterminés comme dans Pokémon, il apparaît d'un coup pour défier le joueur »). **Code :** `src/aventure/rival.ts`
(pur : catalogue et déclenchement), branché dans `app.ts` et `fin.ts`. ADR 038.

Il remplace « l'ombre de Kaï » de M10-E (défi facultatif tiré par le directeur, une fois par chapitre au hasard des
îlots) : le rival n'est plus tiré, il **surgit à des moments écrits**. Le prologue (P2, P3 : Kaï au bout du Quai, défi
relevé par le joueur), le **bras droit de la Cendre** (défi de progression) et le **Miroir** du Championnat ne changent
pas.

## 1. Les moments écrits

| Événement | Chapitre | Après quels faits | Où (premier point de décision dans l'un de ces îlots) | Duel |
|---|---|---|---|---|
| **K1 — La Braise** | I | famille rejointe et **premier lieutenant de la maison vaincu** (le cadet) | le Quai | oui (rôle « rival » du palier) |
| **K2 — Les Bannières** | II | **Signature de la famille d'accueil** gagnée (son chef vaincu) | le Quai, la Grande Cour | oui |
| **K3 — À mi-chemin** | III | **un chef d'une autre famille** vaincu | les Ruelles, le Parvis, la Place du Fanal, la Ville haute | oui |
| **K4 — La dernière voie** | IV | **deux chefs d'autres familles** vaincus | le Quai, les Ruelles, le Parvis | oui |
| **K5 — Le finaliste** | V | **Championnat ouvert** (les quatre chefs vaincus) | la Grande Cour (le Parvis si la ville en rangs n'est pas affichée) | oui |
| **K6 — La main tendue** | titre | **titre remporté** | la Grande Cour, le Parvis | non : une scène |

Un événement n'a lieu qu'une fois. Ceux dont le chapitre est dépassé sans qu'il ait eu lieu (une aventure reprise d'une
version d'avant M11, ou un joueur qui n'a pas visité les îlots voulus) **ne se rattrapent pas** : on passe au suivant
dont les faits sont vrais. Au plus un événement à la fois.

## 2. Déclenchement

- **Aux points de décision seulement** (entrée dans un îlot après le fondu, retour d'un duel, fermeture de la scène de
  récompense) ; jamais pendant un dialogue, une fenêtre ou une scène principale ; jamais au retour d'un duel contre Kaï.
- Prioritaire sur les guetteurs (contrat 1) : à ce point de décision, la vue est suspendue.
- Pur et déterministe : `evenementRival(etat, rival, ilot, quaiRangs)` renvoie l'événement dû ou rien.

## 3. Mise en scène : il surgit

1. Kaï **apparaît d'un coup** à 3,5 m du joueur, sur le premier point praticable d'une liste fixe (à droite, à gauche,
   derrière, devant), d'où il voit le joueur (ligne dégagée) ; si aucun ne convient, il apparaît au point d'arrivée de
   l'îlot.
2. Bulle « ! » au-dessus de lui, son « entrée du rival » (contrat 6), marche du joueur suspendue.
3. Il **court** jusqu'à 0,95 m du joueur (3,2 m/s), se tourne vers lui.
4. **Réplique** de l'événement (contrat 4 : selon la voie du joueur, vos duels passés contre lui, l'issue du dernier),
   puis **« Relever le défi »** (seul choix) → préparation (sans « Plus tard ») → duel. K6 : réplique et « Fermer ».

## 4. Après le duel

- **Victoire ou défaite** : l'événement est accompli (comme dans Pokémon, l'histoire continue) ; l'issue est notée
  (`rival.faits[K] = issue`) et nourrit ses répliques suivantes. Aucune carte n'est en jeu (inchangé : seul le bras
  droit de la Cendre en donne une, une fois).
- **Abandon** : l'événement reste dû ; il revient au point de décision suivant.
- Le combat compte pour les PV (+3), comme tout combat mené à son terme.
- La quête **« Kaï, la Braise du quai »** (journal) remplace « L'ombre de Kaï » : une étape par événement (K1 à K5),
  faite à l'issue d'un duel mené à son terme ; les chapitres déjà notés dans l'ancienne quête restent dans la sauvegarde
  (`ombres`), sans effet.

## 5. Le deck et le jeu de Kaï

Rôle `rival` du palier (`paliers.ts`, annexe de calibrage : comme un bras droit de la Cendre au niveau du joueur, PV
60 / 70 / 80 / 90), profil d'IA **offensif** (valeur de l'annexe, par défaut). Son tempérament évolue par chapitre
dans ses répliques (contrat 3) ; un profil d'IA plus fort pour les derniers événements est une **proposition** de la
fiche (mesures du contrat 5), désactivée par défaut.

## 6. Garanties testées (`test/m11-rival.test.ts`, `npm run qa:vue`)

- chaque événement se déclenche à son moment écrit, dans ses îlots, une seule fois ; jamais au prologue ;
- un abandon le laisse dû ; une défaite l'accomplit ;
- jamais deux événements au même point de décision ; jamais au retour d'un duel contre Kaï ;
- l'ancienne ombre de Kaï n'est plus tirée par le directeur ;
- au navigateur : Kaï surgit au moment écrit, la préparation s'ouvre.
