# L'heure de ville : la jouer et la juger

**But** (V1 de la fiche M10-E, feuille de route M10-E, « Validation ») : jouer une heure dans la ville de l'aventure, sur
GPU réel, et dire si les rencontres sont **non intrusives**. Préparée en passe 137 (finalisation de la ville, décision du
responsable « Tout préparer ») ; le verdict va dans la fiche d'arbitrages de la finalisation.

> **Verdict du responsable (2026-10-26, passe 141 ; fiche <https://claude.ai/artifact/WtuBiKyjVKVrkNEXb1rFpX>, V1) :**
> rencontres **non intrusives : garder**. Le directeur garde sa densité ; la page reste le mode d'emploi
> pour rejouer une heure (points de départ, heure simulée).

## Lancer le jeu, hors QA (comme un joueur)

Construire puis servir le jeu :

```bash
npm run build
```

```bash
npm run preview
```

Puis ouvrir <http://localhost:4173/?aventure=1>. Sans `qa=1`, le jeu n'affiche que les images approuvées (registre :
36 images) : c'est la ville que verra un joueur, avec la Place du Fanal et la Ville haute.

- **Avec votre aventure** : « Continuer l'aventure ».
- **À un chapitre donné**, sans tout rejouer : ajouter `&depart=` suivi du chapitre (`I` à `V`) et, si l'on veut,
  `&famille=` (`Cendre`, `Ronce`, `Voile` ou `Astre` ; `Cendre` par défaut), par exemple
  <http://localhost:4173/?aventure=1&depart=III&famille=Ronce>. L'écran titre propose alors « Commencer au chapitre III
  (heure de ville) » : une aventure d'essai, au début du chapitre (prologue gagné, famille rejointe, chefs vaincus
  jusque-là, chaque duel compté). **Elle remplace l'aventure en cours** (une confirmation le demande) ; le jeu standard
  n'est pas touché.
- Sur la RTX 4060 : Chrome lancé avec `--force_high_performance_gpu` (ou le réglage « hautes performances » de Windows
  pour Chrome) ; la Radeon 780M est le GPU par défaut.

## Parcours proposé (environ une heure)

1. **Chapitre I** (15 min) : la famille d'accueil, le Quai et ses rangs, le Parvis, les Ruelles ; parler, accepter un duel
   de rue, en refuser un.
2. **Chapitre III** (20 min) : la Salle des Bannières, la Grande Cour, la Place du Fanal (par le bout ouest de la cour de
   la Chapelle), la Ville haute (par le bout ouest du Belvédère) ; écouter les rumeurs ; l'ombre de Kaï.
3. **Chapitre V** (25 min) : le Championnat (le héraut dans la Grande Cour), quelques allers et retours entre les îlots.

## Ce qu'il faut juger (contrat `docs/m10/VILLE_RENCONTRES_EVENEMENTS.md`, §2)

- **Visibles avant d'agir** : chaque rencontre est quelqu'un qui se tient là, avec un repère (« ! » un défi, « ? »
  quelqu'un à écouter) ; jamais d'embuscade, jamais de duel lancé sans votre accord.
- **Peu, et au bon moment** : rien n'apparaît en marchant ; les rencontres changent seulement en entrant dans un îlot,
  après un duel ou une scène ; **deux rencontres facultatives au plus** par îlot, en plus des figures de la trame.
- **Un refus sans conséquence** : le personnage reste jusqu'à votre prochain passage, sans redemander, puis repart.
- **Kaï** : son ombre au plus une fois par chapitre.
- **Le rythme** : trop de monde, juste ce qu'il faut, ou pas assez ? Les rumeurs, les duels de rue, les membres des
  familles, chacun à part.

## Ce que disent les chiffres (heure simulée)

`npm run sim:heure` (`tools/m09-heure-ville.ts`) fait jouer au directeur des rencontres du jeu une heure type (40 arrivées
dans un îlot, un duel toutes les quatre arrivées) au début de chaque chapitre, pour 200 profils. Tableau complet :
`artifacts/qa/m09/finalisation/heure-simulee.md`. En bref (passe 137) : **jamais plus de deux rencontres facultatives**,
**aucune relance après un refus**, **l'ombre de Kaï une fois par chapitre** ; mais la ville est **dense** : 2 à 3 % des
arrivées seulement sont sans rencontre facultative, 31 à 34 rencontres nouvelles par heure, dont 14 à 20 rumeurs
écoutées. Ces chiffres disent combien la ville propose ; **si c'est intrusif** reste votre jugement.

## Rendre le verdict

Dans la fiche d'arbitrages de la finalisation de la ville (question V1) : « non intrusives », « à ajuster : trop de
rencontres » (et lesquelles), ou une note libre. Aucun réglage du directeur ne change avant votre verdict.
