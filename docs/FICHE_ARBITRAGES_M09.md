# Fiche d'arbitrages — RC 0.8 du combat et M09 (ville d'exploration)

Session cloud autonome du 2026-10-19 (≈ 6 h, sans le responsable). Chaque entrée : contexte, sources, captures,
**option recommandée et raison**, alternatives. Rien ici n'est décidé par la session, sauf mention « décidé par le
responsable ». La session principale en fera une fiche interactive.

Comment voir le travail :
- jeu par défaut (inchangé) : `npm run dev` puis `/` ;
- **démo jouable de la ville** : `/?demo=1` (accueil → Nouvelle partie → le Quai → duels → retour au Quai) ;
- laboratoire de la ville seul : `/?ville=1` (`&qa=1` pour les mesures).

---

## 0. Bilan de la séance (fin du run, 2026-10-19 ≈ 12:15 UTC)

**Fusionné dans `main`** (de `4a30504` à `d76651f`, sans réécriture d'historique) :
- **RC 0.8.0-rc.1 du combat (M08 C5)** : « Duels de la ville » dans la rue (`21632b8`), rang « II » lisible (`38b32a8`),
  rendu V1 retiré (`0f8c20a`), version et démarrage plus rapide (`42f4562`), piste `compileAsync` derrière un paramètre
  (`6b67271`), rapport `docs/RAPPORT_RC_0_8.md`.
- **M09, ville d'exploration** : cadrage V0 (`296ee71`), le Quai en frontale 2.5D, laboratoire `?ville=1` et démo
  `?demo=1` (`66b7997`), le Parvis de l'arène (`9b420b6`), les Ruelles du Voile, aide de la ville, Échap fiable
  (`e934f7a`), démo sans WebGL rendue sûre (`b128bd9`) ; ADR 024 (frontale, approuvé) et 025 (architecture, proposé).

**Mesures (SwiftShader, jamais un GPU)** : campagne complète du jalon **verte au premier passage** (`qa:browser` 5/5,
`qa:product` 9/9, `qa:rc` 9/9 dans la salle, au bar et à l'arène, `qa:techniques` 8/8, 0 erreur console) ; rendu par
défaut identique au pixel près au départ (scènes des quatre rivaux, duel complet, préparations ; seule une bande
transitoire de 37 pixels sur l'écran Rencontres, état final identique) ; accueil interactif ≈ 6 s plus tôt ; bundle
principal 1 009 852 → 999 384 octets (la ville est chargée à la demande) ; `npm test` 241/241 ; démo 30/30 contrôles.

**À vérifier sur ta machine** : section E ci-dessous (GPU 780M et RTX 4060, contraste sous Windows, `compileAsync`,
cadrage de la ville à l'œil, écran Rencontres).

**Décisions à te demander** : C1 réception de la RC ; B4 démo comme hub par défaut ; B5 et D Aseprite et feuilles de
sprites externes (amendement de la règle « aucune image externe ») ; C3 `compileAsync` ; B1 réglages de la caméra
frontale ; B2 structure en îlots ; C2 pastille du rang ; B3, B6, B7 (préparation systématique, tutoriels, textes).

---

## A. Décisions déjà prises par le responsable pendant le run (pour mémoire)

| Sujet | Décision | Source |
|---|---|---|
| Caméra d'exploration | **Frontale 2.5D** ; vue de dessus inclinée abandonnée | JOURNAL passe 39, ADR 024 |
| Canal d'images | Fermé (poste éteint) ; 6 images livrées sur 24 | JOURNAL passe 40 |

---

## B. Décisions ouvertes — ville (M09)

### B1. Réglages fins de la caméra frontale
- **Contexte** : le principe frontal est décidé ; les chiffres sont des choix de la session (8° sous l'horizontale,
  19 m, focale 33°, point visé à 3,6 m, suivi en x amorti, presque fixe en z), après deux essais plus serrés (14° à
  16 m, 13° à 14 m : personnages plus grands, façades coupées, pas d'eau).
- **Sources** : ADR 024 ; `src/ville/cameras.ts` (`RIGS.frontale`) ; captures `screenshots/qa/m09/v1/`.
- **Recommandation** : garder ces réglages pour la démo et les ajuster à l'œil sur GPU réel (le flou de bascule et le
  halo se jugent mal en SwiftShader). **Raison** : personnages à ≈ 85 px de haut en 720p (lisibles), bord du quai en
  premier plan, bannières et deux niveaux de façades dans le cadre, plus proche de la référence frontale de travail.
- **Alternatives** : (a) plus haute et plus loin (toits et ciel visibles comme sur la référence, personnages ≈ 60 px) ;
  (a bis) plus serrée (13° à 14 m : personnages ≈ 110 px, décor coupé) ;
  (b) cadrages fixes par portion d'îlot (à éviter : proche du graphe A/B/C/D de Cité du Tournoi, interdit par M09).

### B2. Structure des zones
- **Contexte** : `docs/M09_CADRAGE_VILLE.md` §2 propose ville → quartiers → îlots chargés un à un, reliés par des
  sorties avec fondu court.
- **Fait à titre provisoire** : trois îlots (le Quai au centre, le Parvis de l'arène à l'est, les Ruelles du Voile à
  l'ouest) reliés par des sorties avec fondu, un seul en mémoire (`src/ville/ilots.ts`) ; captures `screenshots/qa/m09/`.
- **Recommandation** : garder les îlots chargés un à un (préparer le voisin aux temps morts si le changement d'îlot se
  voit sur GPU réel). **Raison** : budget mémoire et GPU maîtrisé (les quatre lieux de duel occupent déjà ≈ 66 Mo de
  textures), même principe que C1/C2.
- **Alternatives** : monde continu en tuiles (plus ambitieux, coût mémoire et de génération supérieurs).

### B3. Entrée en duel depuis la ville
- **Contexte** : la démo passe toujours par l'écran de préparation existant (deck, Techniques, rival, lieu), puis le
  duel inchangé ; « Retour au Quai » ramène devant le personnage ou la porte.
- **Recommandation** : garder la préparation systématique. **Raison** : aucune règle ni écran du duel ne change ; le
  joueur voit le lieu et l'adversaire avant de s'engager ; un refus (deck illégal) reste expliqué.
- **Alternatives** : lancement direct depuis la bulle de défi (plus rapide, mais saute la vérification du deck).

### B4. Intégration de la démo au jeu par défaut
- **Contexte** : derrière `?demo=1`, l'écran « tableau des rencontres » est rendu par la ville ; le jeu par défaut
  reste identique au pixel près (preuves dans le rapport RC). En démo, le tableau classique reste accessible par le
  menu de la ville (« Toutes les rencontres », bouton « Retour au Quai »).
- **Recommandation** : valider d'abord la démo telle quelle, puis faire de la ville le hub par défaut, en gardant cet
  accès « Toutes les rencontres » dans son menu. **Raison** : la ville devient le liant du jeu (direction du responsable),
  le tableau reste utile pour rejouer vite un rival précis.
- **Alternatives** : (a) garder le tableau par défaut et ajouter une entrée « Explorer le Quai » ; (b) ville seule.

### B5. Personnages de la ville et échéance d'Aseprite
- **Contexte** : marcheurs dessinés par code dans l'esprit du V2 (aplats, contour, tête ≈ 1/3), couleurs et coupes des
  gabarits PNJ (ADR 023) ; joueur à capuche et besace d'après la référence de travail du 2026-10-19 (non approuvée).
  Planche : `screenshots/qa/m09/marcheurs.png` (avec Sélène). Point connu : à cette échelle, un joueur de la voie du Voile
  (manteau bleu, capuche claire) ressemble à Sélène (cheveux argentés, bandeau) ; à corriger avec les personnages clés.
- **Recommandation** : garder ces marcheurs pour la démo ; ouvrir Aseprite pour les **personnages clés** (joueur, quatre
  rivaux) seulement après validation de la démo, par un amendement de la règle « aucune image externe » avec manifeste
  de provenance (comme Cité du Tournoi, `src/characters/BakedCast.ts`). **Raison** : la démo n'en dépend pas ; un
  amendement de règle est une décision d'assets réservée au responsable.
- **Alternatives** : marcheurs V2 complets (couches V2 du duel réutilisées en pied : plus cohérent, beaucoup plus de
  travail) ; Aseprite tout de suite.

### B6. Tutoriels
- **Contexte** : tutoriel de déplacement en bulles non bloquantes (se déplacer, puis parler), guide en quatre pages,
  tour guidé du duel existant (ADR 018).
- **Recommandation** : garder des bulles non bloquantes. **Raison** : on ne bloque jamais un joueur qui sait déjà ; le
  duel a déjà son tour guidé.
- **Alternatives** : séquence guidée obligatoire à la première partie.

### B7. Textes et fil narratif de la démo
- **Contexte** : répliques et textes de prototype (guide, docker, commis, Kaï, portes), Tournoi du Quai inchangé.
- **Recommandation** : relecture des textes par le responsable ; les garder signalés « prototype ».
- **Alternatives** : —

---

## C. Décisions ouvertes — release candidate 0.8 du combat

### C1. Réception de la RC 0.8.0-rc.1 (décision réservée au responsable)
- **Contexte** : C5 livré (`docs/RAPPORT_RC_0_8.md`) ; campagne complète en SwiftShader **verte au premier passage**
  (`qa:browser` 5/5, `qa:product` 9/9, `qa:rc` 9/9 dans la salle, au bar et à l'arène, `qa:techniques` 8/8, 0 erreur
  console) ; rendu par défaut du build final identique au pixel près au départ ; mesures GPU et contraste sous Windows
  impossibles dans le cloud.
- **Recommandation** : recevoir la RC après les trois vérifications locales (§5.4 du rapport : `rc08-demarrage` et
  `perf:play` sur la 780M et la RTX 4060, `qa:rc` S et `rc08-contraste-rang` sous Windows). **Raison** : ce sont les
  seuls critères de C5 non vérifiables ici.
- **Alternatives** : recevoir sur la seule campagne SwiftShader.

### C2. Pastille du chiffre de rang (changement visible de l'éditeur de deck)
- **Contexte** : chiffre de rang des vignettes posé sur une pastille sombre arrondie (vignettes de l'éditeur seulement ;
  collection et duel inchangés). Captures avant / après : `screenshots/qa/rc08/deck-rang-avant-apres.png`.
- **Recommandation** : garder. **Raison** : ≥ 18,6:1 même avec les métriques de Georgia sous Windows, sans toucher
  l'illustration ni la carte.
- **Alternatives** : contour du chiffre seul (plus discret, contraste dépendant de la police) ; même pastille aussi
  dans la collection et le duel (cohérence, mais change le duel validé).

### C3. Compilation non bloquante du premier rendu (`?qa=1&compileAsync=1`, préparée, non activée)
- **Contexte** : au démarrage, la liaison des 51 programmes WebGL bloque le fil principal (≈ 9,4 s en SwiftShader ;
  inconnu sur GPU, où le cache de shaders de Chrome joue). Code prêt derrière le paramètre : `compileAsync` si
  `KHR_parallel_shader_compile` est présent, première image ensuite.
- **Recommandation** : mesurer en local (`LQV_GPU=1 … LQV_DEMARRAGE_QUERY=compileAsync=1 node tools/rc08-demarrage.mjs`,
  profil neuf, avec et sans) ; activer par défaut seulement si l'accueil devient interactif nettement plus tôt.
- **Alternatives** : ne rien changer.

### C4. Découpage du bundle
- **Contexte** : aucun gain mesurable ici (Three.js est nécessaire avant la première image de l'accueil).
- **Recommandation** : ne pas découper ; la ville est déjà chargée à la demande. **Alternatives** : Three.js à part
  (meilleur cache entre deux versions, pas de gain au premier chargement).

### C5. État transitoire de l'écran Rencontres sous forte charge
- **Contexte** : `docs/RAPPORT_RC_0_8.md` §3.2 (37 pixels en 1280 sous charge, 157 pixels une fois en 1920 au build final ;
  jamais en six captures répétées de chaque build, `tools/rc08-rencontres-transitoire.mjs` ; état final identique).
- **Recommandation** : revérifier sur le poste du responsable ; ne rien changer si absent sur GPU réel.

---

## D. Préparé derrière un paramètre d'URL (décisions réservées, non prises)

| Sujet | Paramètre | État | Ce qu'il faut décider |
|---|---|---|---|
| Feuilles de sprites externes (Aseprite) pour les personnages clés | `?qa=1&sprites=externes` (+ `sprites/manifest.json` à côté de la page) | code prêt, éprouvé avec nos propres atlas exportés (`tools/m09-sprites-externes.mjs`, 3/3) ; aucune image dans le dépôt | amendement de la règle « aucune image externe au runtime », approbation des assets, échéance |
| Compilation non bloquante du premier rendu | `?qa=1&compileAsync=1` | code prêt, sans effet dans le cloud (extension absente en SwiftShader) | activer par défaut si la mesure locale le justifie (C3) |
| Ville comme hub du jeu | `?demo=1` | démo complète, trois îlots | intégration par défaut (B4) |

## E. À relancer sur la machine du responsable (GPU réel, Windows)

1. Démarrage : `LQV_GPU=1 CHROMIUM_PATH=<Chrome> node tools/rc08-demarrage.mjs`, puis avec
   `LQV_DEMARRAGE_QUERY=compileAsync=1` (profil neuf à chaque ronde : c'est déjà le cas).
2. Fluidité du duel (RC) : `LQV_GPU=1 … npm run perf:play` sur la Radeon 780M et la RTX 4060 (procédure de la passe 11).
3. Contraste sous Windows : `npm run qa:rc` (campagne S) et `node tools/rc08-contraste-rang.mjs` (police Georgia réelle).
4. Ville : `LQV_GPU=1 … npm run qa:ville` (coût par image sur les deux GPU) et `npm run qa:demo` (parcours de la démo, 30 contrôles) ; jouer `/?demo=1` et juger à l'œil
   le cadrage frontal (B1), le flou de bascule et le halo.
5. Écran Rencontres : vérifier l'absence de l'état transitoire relevé sous forte charge (C5) :
   `LQV_BEFORE=<build 4a30504> node tools/l5-identique.mjs`, et `LQV_BEFORE=<build 4a30504> LQV_GPU=1 … node
   tools/rc08-rencontres-transitoire.mjs` (captures répétées avec contrôle A/A).
