# Mode Aventure — prologue jouable (M10-B, PROVISOIRE)

Préparé par la session cloud du 2026-10-20 (brief `docs/missions/BRIEF_SESSION_CLOUD_2026-10-20_M10.md`). **Prototype** :
derrière un paramètre d'URL ; le jeu par défaut (duels, Tournoi du Quai) et la démo `?demo=1` ne changent pas.
Contrats : `docs/m10/` (avenant M10-A approuvé : `contracts/06_AVENANT_M10A_MODE_AVENTURE.md`) ; décisions du responsable : `docs/FICHE_ARBITRAGES_M10.md` ; architecture : ADR 032 (approuvé), ADR 033 (neutres dans le moteur).

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
chefs par des faits rejoués dans la machine d'états, 13 contrôles) : `npm run qa:championnat`. La maison d'une famille par
l'interface (M10-C) : `npm run qa:maison`. **Les trois autres voies jusqu'aux quatre chefs** par l'interface (M10-D :
changement d'affiliation, Salle des Bannières, Basics déjà reçues, format standard, Épreuve et Joute, un duel joué
jusqu'au bout) : `npm run qa:voies`.

**Le Quai en quatre rangs (ARB-M10-12)** : le Quai de l'aventure est celui du laboratoire M09 (le Quai, la rue Haute et la
place de la Halle, la ruelle des Lanternes et la placette du Puits, la cour de la Chapelle ; on passe d'un rang à l'autre
par les passages, en suivant les chemins lumineux). Il n'existe qu'en images générées : **il s'affiche en QA** (`&qa=1`,
signalé à l'image par un badge rouge « décor en images NON APPROUVÉES »), **et hors QA seulement quand le responsable aura
approuvé ses images (A2 puis A1)** ; d'ici là, hors QA (et avec `&decors=code`), l'aventure se joue dans **l'ancien Quai**,
dessiné par code, en secours, avec les mêmes personnages à des places adaptées. Le Parvis et les Ruelles sont dessinés par
code (images non approuvées, ADR 027 et 028).

| Personnage (Quai en rangs) | Rang | Secours (ancien Quai) |
|---|---|---|
| Kaï (prologue), la foule, les émissaires, Tessa, Gaspard, Maëlle | 1 : le Quai | mêmes places |
| Kaï, bras droit de la Cendre ; un duel de rue ; Kaï, défi facultatif | 2 : la rue Haute | Quai, ouest / centre / est |
| L'Épreuve de la Cendre | 2 : la place de la Halle | Quai, ouest |
| Mère Aubépine, cheffe de la Ronce | 3 : la ruelle des Lanternes | devant le Fanal |
| La Joute de la Ronce | 3 : la placette du Puits | devant le Fanal |
| Bran, chef de la Cendre ; la Joute de la Cendre | 4 : la cour de la Chapelle | devant le Chantier ; Quai, ouest |

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
   adversaire a un deck de son palier, selon le nombre de familles que vous avez rejointes ou dont vous avez engagé le
   défi (valeurs validées par le responsable le 2026-10-20 : `docs/m10/CALIBRAGE_M10A.md`, amendement 1 compris : une
   affiliation quittée ne compte qu'à l'engagement de son défi).
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
10. **La maison (M10-C)** : bras droit (Kaï, Maëlle, Sélène, Orin : variante IV), chef (Bran, Mère Aubépine, Ilse,
    Halvard, avec leurs identités V2 : la Signature, équipée à son gain) ;
    revanches sans récompense ; duels de rue et défi de Kaï facultatifs, posés par le directeur des rencontres (au plus
    deux par îlot, jamais d'embuscade).
11. **Les trois autres voies (M10-D)** : une fois le chef de votre famille vaincu, la **Salle des Bannières** (porte de la
    salle de jeu de cartes, sur le Quai) montre les quatre bannières (votre famille, les défis à engager, engagés,
    conquis) ; c'est le seul lieu qui engage un défi (entrer dans un quartier, parler à un membre ou battre l'un d'eux
    dans la rue n'engagent rien). L'écran de confirmation dit ce qui est remis (quatre Basics et la Technique de la
    famille ; **rien si elles sont déjà à vous**, après un changement d'affiliation), ce que devient le deck (une carte
    grise de chaque Rang cède sa place ; au quatrième lot, le **format standard** de 17 cartes) et la suite. Puis le
    cadet, le bras droit et le chef de la famille, dans son quartier, avec des decks de leur palier ; l'ordre des trois
    familles est libre, plusieurs défis peuvent être engagés en parallèle ; jusqu'à quatre Signatures possédées, une
    seule équipée (à changer dans le deck entre deux duels).
12. **Compétitions facultatives** (M10-D, option a d’ARB-M10-06) : dans le quartier de chaque famille dont
    vous avez les Basics, l'**Épreuve du quartier** (trois membres en série ; une défaite fait repartir la série ; la
    première série gagnée donne la variante de Rang I) ; après le bras droit, la **Joute de la maison** (un duel sous une
    contrainte de construction propre à la famille, vérifiée avant le duel ; variante de Rang II). Les seize variantes
    sont ainsi atteignables, chacune une seule fois.
13. **Le Championnat des Champions** (M10-E en avance), à la porte de l'arène (Parvis) quand les quatre chefs sont
    vaincus : les Quatre Bannières (trois chefs à battre, une Signature différente à chaque victoire : changez-la dans le
    deck), le Miroir (Kaï), la Finale contre Ysolde, la Tenante du titre (deux manches gagnantes, une Signature
    différente à chaque manche) ; aucune carte en jeu, un titre ; champions à 110 PV (120 en finale).
14. **Deck et collection** (bouton « Deck », M10-C) : trois onglets. **Deck** : les seize cartes rangées par Rang ;
    choisir une case montre ce qui peut y entrer sans rompre la règle R-AV (une neutre, la Basic ou une variante possédée
    d'une identité absente des autres cases) ; une seule Signature ; deux Techniques ; « Enregistrer et fermer » ou
    « Annuler les changements ». **Collection** : les neutres, puis par famille ses quatre Basics, ses quatre variantes
    et sa Signature, possédées (avec l'origine du gain) ou grisées avec la manière de les gagner. **Registre des gains** :
    chaque gain une fois, avec son origine. **Journal** : quêtes dérivées des faits, états des familles.
15. **Fermer la page et revenir** : « Continuer l'aventure » ramène au même îlot et au même endroit, ou reprend
    exactement le duel en cours (rejeu et hash).

## Ce que le prototype ne fait pas encore

- Les chefs ont leurs identités V2 (ADR 034, validées par le responsable) ; les cadets n'ont pas d'accent de
  couleur familial ; les bras droits gardent leurs identités V2. Aucune image nouvelle.
- Championnat, Épreuves et Joutes en squelette (textes et adversaires provisoires, apparences de PNJ) ; pas de Grande
  Cour (M09 en pause) : la proclamation se fait au Parvis ; foule figurée par quelques PNJ.
- Textes de prototype ; aucun son.
- Sans WebGL : pas de ville (le prototype suppose WebGL).
