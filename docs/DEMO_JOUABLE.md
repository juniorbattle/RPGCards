# Démo jouable — le Quai (M09 V2, provisoire)

Préparée par la session cloud du 2026-10-19 pour valider la démo : de l'écran d'accueil à la ville, aux tutoriels et
aux duels. **Prototype** : la ville est derrière un paramètre d'URL, le jeu par défaut ne change pas.

## Lancer

```bash
npm ci
npm run dev            # puis ouvrir http://localhost:5173/?demo=1
# ou, build de production :
npm run build && npm run preview   # http://localhost:4173/?demo=1
```

Parcours automatique (navigateur headless, 30 contrôles, captures `screenshots/qa/m09/v2-demo/`) : `npm run build && npm run
qa:demo` (sur GPU réel : `LQV_GPU=1 CHROMIUM_PATH=<Chrome> npm run qa:demo`) ; vues de la ville : `npm run qa:ville`.

`?demo=1` seul suffit. Sans le paramètre : le jeu habituel (tableau des rencontres). `?ville=1` : la ville seule
(laboratoire, sans le reste du jeu).

**Cadrage réglable à l'œil (fiche B1, M09 V3)** : `&rig=inclinaison,distance,focale,hauteur visée` (degrés, mètres,
degrés, mètres) remplace le cadrage de l'îlot, par exemple `/?demo=1&rig=7,18.5,39,3.05` (cadrage du Quai retravaillé)
ou `/?ville=1&ilot=quai&rig=6.5,18.5,37,3.2` (plus serré, personnages un peu plus grands, moins d'eau). Les valeurs hors
des bornes sont ignorées. Le Quai a été retravaillé (passe de qualité V3, JOURNAL passe 45), puis rendu dans la
**direction D** retenue par le responsable (décor encré comme une illustration de carte, couleurs des quatre familles ;
ADR 026, passe 46), enrichie en passe 47 (profondeur de champ, flaques et port en reflet, décors du centre ; ADR 026
amendement 1), **validée par le responsable** ; le Parvis de l'arène et les Ruelles ont été reconstruits dans la même
direction en passe 49 (même cadrage, mêmes personnages, grammaire de façade commune ; ADR 026 amendement 2),
**validés par le responsable** : les trois îlots de la démo sont dans la direction D. **2026-10-19 (ADR 028)** : le
responsable ne valide plus cette direction ; la ville passera en HD-2D stylisé (images générées, diorama de plans
peints, personnages en pixel art), le Quai d'abord, puis la Grande Cour ; d'ici là, ce rendu reste en provisoire.

## Commandes

| Action | Clavier | Souris |
|---|---|---|
| Marcher | ZQSD, WASD ou flèches (Maj : pas lent) | clic au sol |
| Parler, entrer, sortir | E, Entrée ou Espace | clic sur la bulle |
| Menu (deck, collection, options, aide, accueil) | Échap | bouton « Menu » |

L'aide (menu → Aide) commence, en démo seulement, par ces commandes de la ville.

## Parcours à valider (≈ 10 minutes)

1. **Accueil** → « Nouvelle partie » → nom, voie, Techniques → « Créer ».
2. **Arrivée au Quai** : carton « Le Quai, soir de tournoi », puis tutoriel en bulle (« Déplacez-vous… »). Marcher deux
   mètres : la bulle passe à « Approchez quelqu'un… ».
3. **La guide** (marchande, près des tonneaux, repère « ? ») : quatre pages d'explication. L'objectif passe à « Défiez … le
   docker ».
4. **Le docker** (repère « ! », milieu du quai) : « Défier » → préparation (lieu : la rue) → **duel** (tour guidé du
   duel inchangé) → résultat → **« Retour au Quai »** : on réapparaît devant lui ; après une victoire, sa réplique change
   et son repère disparaît.
5. **La salle de jeu de cartes** (porte voûtée aux quatre bannières) : manche suivante du Tournoi du Quai (Kaï, puis
   Maëlle, puis Sélène ; après le Tournoi, duel libre contre Sélène).
6. **Le Fanal** (porte éclairée, enseigne) : Maëlle, ouverte après l'avoir rencontrée au Tournoi (sinon, la raison
   s'affiche).
7. **Kaï** au bout est du quai : duel libre dans la rue.
8. **Le Parvis de l'arène** (sortie est du Quai) : fondu, place dallée, grande porte embrasée, braseros ; une joueuse à
   défier ; **Orin** et la porte de l'arène, ouverts après le Tournoi. Sortie ouest : retour au Quai.
9. **Les Ruelles** (sortie ouest du Quai) : quartier du Voile, linge tendu, fontaine (information), **Sélène**,
   ouverte après l'avoir rencontrée au Tournoi. Sortie est : retour au Quai.
10. **Fermer la page et revenir** : « Continuer » ramène au même îlot et au même endroit ; une nouvelle partie repart du
   tutoriel.

## Ce que la démo ne fait pas encore

- Une seule caméra (frontale 2.5D, décidée) ; réglages fins à revoir à l'œil sur GPU réel.
- Trois îlots (le Quai, le Parvis, les Ruelles) ; pas encore de carte de la ville ni de Place du Fanal.
- Personnages de la ville dessinés par code (provisoires, en attendant Aseprite pour les personnages clés).
- Textes de prototype ; aucun son.
- Sans WebGL (navigateur ou poste qui le refuse), pas de ville : la démo reste le jeu habituel.
- Le tableau des rencontres classique reste accessible par le menu de la ville (« Toutes les rencontres »).

Décisions à prendre : `docs/FICHE_ARBITRAGES_M09.md`.
