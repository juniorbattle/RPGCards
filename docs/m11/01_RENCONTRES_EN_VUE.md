# M11 — Contrat 1 : les rencontres « en vue »

**Date :** 2026-10-26 (session cloud autonome, brief `docs/missions/BRIEF_SESSION_CLOUD_2026-10-26_M11.md`).
**Statut : PROPOSÉ** (décision de principe du responsable, annexe A du brief : « les npcs peuvent venir vers vous (si dans
votre champ de vision) pour forcer un combat » ; les PNJ joueurs de cartes sont des rencontres répétées). Les valeurs
chiffrées ci-dessous sont des choix de la session, **provisoires jusqu'à la fiche** (`docs/FICHE_ARBITRAGES_M11.md`).
**Code :** `src/aventure/vue.ts` (pur), branché dans `src/aventure/app.ts` ; la ville expose seulement de quoi faire
marcher un personnage et afficher la bulle (`src/ville/ville.ts`). ADR 037.

> Cette décision **remplace**, pour les PNJ guetteurs seulement, le principe P-V1.1 de
> `docs/m10/VILLE_RENCONTRES_EVENEMENTS.md` (« jamais de duel lancé sans son accord ») : décision du responsable plus
> récente (hiérarchie de vérité d'AGENTS). Les figures structurantes, les compétitions et les rumeurs ne changent pas.

## 1. Qui guette

| Rencontre (directeur) | Guetteur ? | Pourquoi |
|---|---|---|
| Duels de rue : `rue-docker`, `rue-joueuse`, `rue-commis`, `rue-cour`, `rue-port`, `rue-haute` | **oui** | les joueurs de cartes de la ville, rencontres répétées |
| Membres des familles : `membre-Cendre`, `membre-Ronce`, `membre-Voile`, `membre-Astre` | **oui** | idem, avec la voix de leur maison |
| Émissaires, cadets, bras droits, chefs, héraut | non | défis de progression, engagés par le joueur (ADR 031) |
| Épreuves et Joutes | non | compétitions, à leur rythme |
| Rumeurs (ambiance) | non | aucun duel |
| Kaï | non (voir le contrat 2) | événements fixes de la trame |

Un guetteur reste un personnage posé par le directeur (mêmes points de décision, mêmes places, même tirage) : **le
directeur pose les PNJ, la vue déclenche le duel**. On peut toujours aller lui parler soi-même (« ! », accepter ou
refuser), comme avant.

## 2. Le champ de vision (pur, déterministe, testé)

- **Direction** : celle du regard de la place (`face` = +z, vers le quai et la caméra ; `dos` = −z ; `gauche` = −x ;
  `droite` = +x).
- **Forme** : un cône de **portée 4,5 m** et de **demi-angle 32°** autour de cette direction, compté depuis le centre du
  personnage. Au-delà de 4,5 m ou hors de l'angle, rien.
- **Obstacles** : la ligne entre le guetteur et le joueur est échantillonnée tous les 10 cm ; elle est **coupée** si un
  point tombe dans un obstacle de l'îlot (rectangles des façades, étals, murs des rangs ; disques des accessoires et des
  autres personnages, sauf le guetteur lui-même). Les rangs de la ville en rangs sont séparés par des façades : un
  guetteur d'un rang ne voit pas le rang voisin, sauf par un passage ouvert dans l'axe.
- **Front montant** : la vue ne se déclenche qu'au moment où le joueur **entre** dans le champ. Un joueur qui apparaît
  déjà dedans (arrivée dans un îlot, retour d'un duel, fermeture d'un dialogue) n'est pas arrêté tant qu'il n'en est pas
  sorti puis rentré.

## 3. Quand la vue est active

Toutes les conditions :
1. l'écran est la ville, aucun dialogue, aucune fenêtre, aucun fondu de changement d'îlot en cours, entrées du joueur
   non verrouillées ;
2. le prologue est terminé (**scène P8 jouée** : le joueur a confirmé une famille) ; avant, rien ne force ;
3. aucun événement du rival (contrat 2) n'est en cours ou en attente à ce point de décision ;
4. le guetteur n'est pas « au repos » (§5) et n'est pas sur le départ (refusé au point de décision précédent).

## 4. Ce qui se passe quand un guetteur repère le joueur

1. **Arrêt** : la marche du joueur est suspendue (entrées verrouillées, destination de clic oubliée).
2. **Bulle « ! »** au-dessus du guetteur, dessinée par code (bulle claire, point d'exclamation rouge sombre, apparition
   en 0,25 s ; immobile avec le mouvement réduit) ; son « repéré » (contrat 6).
3. **Approche** : le guetteur marche vers le joueur en ligne droite (la ligne de vue est dégagée par construction),
   jusqu'à **0,95 m** de lui, à la vitesse de marche (1,6 m/s), puis se tourne vers lui ; le joueur se tourne vers le
   guetteur. En temps figé (QA) ou mouvement réduit : placé directement.
4. **Dialogue d'ouverture** (contrat 4 : répliques selon le personnage, son tempérament, le chapitre et vos duels
   passés), avec un seul choix : **« Relever le défi »**. Échap ne ferme pas ce dialogue.
5. **Préparation** du duel (même écran qu'avant, sans « Plus tard »), puis **le duel**. Le joueur peut toujours
   abandonner depuis le menu du duel (compté comme un abandon : rien n'est perdu).
6. **Retour** : comme tout duel facultatif (devant le personnage) ; le directeur fait partir le guetteur après un duel
   joué (`conclure`), comme aujourd'hui.

## 5. Après le duel, revanches

L'issue est notée par rencontre dans l'état du directeur (`vus[id] = { issue, battement, chapitre }`) :

| Issue du dernier duel forcé | Quand ce PNJ peut-il de nouveau **forcer** un duel ? | En lui parlant |
|---|---|---|
| Victoire du joueur | **au chapitre suivant** (il revient plus fort : contrat 3) | « ! » : revanche à la demande, refusable |
| Défaite du joueur | après **2 battements** de repos (deux duels ou scènes) | idem |
| Abandon | après 2 battements | idem |

Le directeur garde ses délais d'apparition (2 battements pour les duels de rue) : un guetteur battu revient d'abord
« au repos » (repère « ! », il ne force pas), puis guette de nouveau à l'échéance.

## 6. Éviter un guetteur

- Rester **hors de son cône** : passer derrière lui, sur le côté au-delà de 32°, à plus de 4,5 m, ou derrière un étal,
  une façade, un autre personnage.
- Les guetteurs regardent dans une direction fixe (celle de leur place) : on apprend où ils regardent.
- Un guetteur n'agit jamais pendant un dialogue, une scène, un fondu, ni dans un îlot où un événement du rival attend.

## 7. Garanties testées (`test/m11-vue.test.ts`, `npm run qa:vue`)

- le cône : dedans, hors portée, hors angle, derrière un obstacle, derrière un autre personnage ;
- front montant : apparition dans le champ sans déclenchement ; sortie puis entrée : déclenchement ;
- aucun déclenchement avant P8, pendant un dialogue ou une fenêtre, ni par un guetteur au repos ;
- repos : victoire → pas avant le chapitre suivant ; défaite → pas avant 2 battements ;
- le chemin d'approche reste praticable et s'arrête à 0,95 m ;
- au navigateur : un PNJ repère le joueur, vient, la préparation s'ouvre ; un joueur qui passe hors de la vue n'est pas
  arrêté.
