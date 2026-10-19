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

`?demo=1` seul suffit. Sans le paramètre : le jeu habituel (tableau des rencontres). `?ville=1` : la ville seule
(laboratoire, sans le reste du jeu).

## Commandes

| Action | Clavier | Souris |
|---|---|---|
| Marcher | ZQSD, WASD ou flèches (Maj : pas lent) | clic au sol |
| Parler, entrer, sortir | E, Entrée ou Espace | clic sur la bulle |
| Menu (deck, collection, options, aide, accueil) | Échap | bouton « Menu » |

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
9. **Fermer la page et revenir** : « Continuer » ramène au même îlot et au même endroit ; une nouvelle partie repart du
   tutoriel.

## Ce que la démo ne fait pas encore

- Une seule caméra (frontale 2.5D, décidée) ; réglages fins à revoir à l'œil sur GPU réel.
- Deux îlots seulement ; les Ruelles sont annoncées « bientôt ».
- Personnages de la ville dessinés par code (provisoires, en attendant Aseprite pour les personnages clés).
- Textes de prototype ; aucun son.
- Le tableau des rencontres classique n'est pas accessible depuis la démo.

Décisions à prendre : `docs/FICHE_ARBITRAGES_M09.md`.
