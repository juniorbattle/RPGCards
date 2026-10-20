# Mode Aventure — prologue jouable (M10-B, PROVISOIRE)

Préparé par la session cloud du 2026-10-20 (brief `docs/missions/BRIEF_SESSION_CLOUD_2026-10-20_M10.md`). **Prototype** :
derrière un paramètre d'URL ; le jeu par défaut (duels, Tournoi du Quai) et la démo `?demo=1` ne changent pas.
Contrats : `docs/m10/` (avenant M10-A : `docs/m10/AVENANT_M10A_TEXTE_CANONIQUE.md`) ; décisions du responsable : `docs/FICHE_ARBITRAGES_M10.md` ; architecture : ADR 032 (approuvé), ADR 033 (neutres dans le moteur).

## Lancer

```bash
npm ci
npm run dev            # puis ouvrir http://localhost:5173/?aventure=1
# ou, build de production :
npm run build && npm run preview   # http://localhost:4173/?aventure=1
```

Parcours automatique (navigateur headless, 30 contrôles, captures `screenshots/qa/m10/aventure-<largeur>/`) :
`npm run build && npm run qa:aventure` ; en 1920 × 1080 : `LQV_VP=1920x1080 npm run qa:aventure` ; décor et
personnages par code (comme le jeu hors QA) : `LQV_AV_QS='&decors=code&sprites=code' npm run qa:aventure` ; sur GPU
réel : `LQV_GPU=1 CHROMIUM_PATH=<Chrome> npm run qa:aventure`. Joute et Championnat (aventure avancée aux quatre
chefs par des faits rejoués dans la machine d'états, 13 contrôles) : `npm run qa:championnat`.

**Images de la ville** : hors QA, le Quai, le Parvis et les Ruelles sont dessinés par code (images non approuvées, ADR
027 et 028). Avec `&qa=1`, le diorama généré du Quai s'affiche, **signalé à l'image** par un badge rouge « décor en images
NON APPROUVÉES ».

## Commandes

| Action | Clavier | Souris |
|---|---|---|
| Marcher | ZQSD, WASD ou flèches (Maj : pas lent) | clic au sol |
| Parler, entrer, sortir | E, Entrée ou Espace | clic sur la bulle |
| Menu (deck, journal, aide, écran titre) | Échap | bouton « Menu » |
| Deck et collection ; journal des quêtes | — | boutons « Deck », « Journal » |

Repères au-dessus des personnages : « ! » un défi ou une scène à jouer, « ? » quelqu'un à écouter. Pendant un duel :
les commandes du jeu standard ; « Menu » met en pause (reprendre, sauvegarder et quitter, abandonner).

## Parcours (≈ 15 minutes)

1. **Écran titre** (`/?aventure=1`) → « Nouvelle aventure » → un nom → « Commencer ». Vous recevez **les seize cartes
   grises** (quatre de chaque Rang, sans famille ni effet, ADR 030). Votre tenue est grise.
2. **Le Quai, soir de tournoi.** La salle aux quatre bannières est fermée aux sans-famille. **Kaï**, à l'est près des
   braseros, vous provoque : « Relever le défi » ou « Pas maintenant » (rien n'est forcé).
3. **Préparation** : l'adversaire, le lieu (la rue), les PV et les deux decks : depuis l'avenant M10-A (ARB-M10-02),
   **vos seize cartes grises jouent en duel**, contre les seize cartes grises de Kaï (la populace).
4. **Le duel public** (vous : 50 PV ; Kaï : 40). Gagner, perdre ou abandonner mène à la même suite (ADR 029 : aucun
   blocage). **Vos PV montent de 3 à chaque combat mené à son terme** (victoire ou défaite), sans plafond ; chaque
   adversaire a un deck de son palier, selon le nombre de familles dont vous avez les cartes (valeurs proposées, à
   valider : `docs/m10/CALIBRAGE_M10A.md`).
5. **La foule** s'est formée ; Kaï réagit. **Le premier émissaire** fend la foule (choisi par un fait public du duel :
   Assauts gagnés → Cendre, Gardes gagnées → Ronce, Interférences réussies → Voile, sinon Astre) et dit que les trois
   autres familles vous ont remarqué aussi : **les quatre vous invitent**.
6. **Le choix** : « Accepter » (écran de confirmation : la famille, sa devise, sa philosophie tirée de ses cartes, ce
   que vous recevez tout de suite, ce qui suit, ce qui ne change pas ; « Confirmer l'affiliation » ou « Revenir »),
   « Différer » (l'invitation tient), « Chercher une autre voie » (où trouver les autres émissaires).
7. **Les émissaires dans leurs maisons** : Tessa (Cendre) à la Maison du Chantier, à l'ouest du Quai ; Gaspard (Ronce)
   devant le Fanal ; Lior (Voile) dans les Ruelles, près de la fontaine (sortie ouest du Quai) ; Mira (Astre) sur le
   Parvis de l'arène (sortie est). Chacun rejoue le choix pour sa famille.
8. **Affiliation confirmée** : **les quatre Basics** de la famille et sa Technique arrivent ensemble (écran de
   récompense) ; une carte grise de chaque Rang leur cède sa place dans le deck ; votre tenue prend les couleurs de la
   famille.
9. **Le premier défi** : votre cadet (l'émissaire) vous défie ; la préparation annonce **l'enjeu** (la variante de
   Rang III de la famille). Fin du prologue (M10-B).
10. **Au-delà (M10-C et D, en avance)** : bras droit (Kaï, Maëlle, Sélène, Orin : variante IV), chef (Signature ∞) ;
    revanches sans récompense ; une fois le chef vaincu, la **Salle des Bannières** (porte de la salle de jeu de cartes)
    engage le défi officiel d'une autre famille (ses quatre Basics) ; duels de rue et défi de Kaï facultatifs, posés par
    le directeur des rencontres (au plus deux par îlot, jamais d'embuscade).
11. **Compétitions facultatives** (M10-D en avance, option a d'ARB-M10-06) : dans le quartier de chaque famille dont
    vous avez les Basics, l'**Épreuve du quartier** (trois membres en série ; une défaite fait repartir la série ; la
    première série gagnée donne la variante de Rang I) ; après le bras droit, la **Joute de la maison** (un duel sous une
    contrainte de construction propre à la famille, vérifiée avant le duel ; variante de Rang II). Les seize variantes
    sont ainsi atteignables, chacune une seule fois.
12. **Le Championnat des Champions** (M10-E en avance), à la porte de l'arène (Parvis) quand les quatre chefs sont
    vaincus : les Quatre Bannières (trois chefs à battre, une Signature différente à chaque victoire : changez-la dans le
    deck), le Miroir (Kaï), la Finale contre Ysolde, la Tenante du titre (deux manches gagnantes, une Signature
    différente à chaque manche) ; aucune carte en jeu, un titre ; champions à 110 PV (120 en finale).
13. **Deck** : 16 cartes, quatre par Rang, une seule Signature, deux Techniques ; versions Basic ↔ variante ; **registre
    des gains** visible. **Journal** : quêtes dérivées des faits, états des familles.
14. **Fermer la page et revenir** : « Continuer l'aventure » ramène au même îlot et au même endroit, ou reprend
    exactement le duel en cours (rejeu et hash).

## Ce que le prototype ne fait pas encore

- Les chefs ont une apparence **provisoire** (gabarits PNJ) ; les cadets n'ont pas d'accent de couleur familial ; les
  bras droits gardent leurs identités V2. Aucune image nouvelle.
- Championnat, Épreuves et Joutes en squelette (textes et adversaires provisoires, apparences de PNJ) ; pas de Grande
  Cour (M09 en pause) : la proclamation se fait au Parvis ; foule figurée par quelques PNJ.
- Textes de prototype ; aucun son.
- Sans WebGL : pas de ville (le prototype suppose WebGL).
