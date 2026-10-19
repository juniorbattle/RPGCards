# Fiche d'arbitrages — RC 0.8 du combat et M09 (ville d'exploration)

Session cloud autonome du 2026-10-19 (≈ 6 h, sans le responsable). Chaque entrée : contexte, sources, captures,
**option recommandée et raison**, alternatives. Rien ici n'est décidé par la session, sauf mention « décidé par le
responsable ». La session principale en fera une fiche interactive.

Comment voir le travail :
- jeu par défaut (inchangé) : `npm run dev` puis `/` ;
- **démo jouable de la ville** : `/?demo=1` (accueil → Nouvelle partie → le Quai → duels → retour au Quai) ;
- laboratoire de la ville seul : `/?ville=1` (`&qa=1` pour les mesures).

---

## A. Décisions déjà prises par le responsable pendant le run (pour mémoire)

| Sujet | Décision | Source |
|---|---|---|
| Caméra d'exploration | **Frontale 2.5D** ; vue de dessus inclinée abandonnée | JOURNAL passe 39, ADR 024 |
| Canal d'images | Fermé (poste éteint) ; 6 images livrées sur 24 | JOURNAL passe 40 |

---

## B. Décisions ouvertes — ville (M09)

### B1. Réglages fins de la caméra frontale
- **Contexte** : le principe frontal est décidé ; les chiffres sont des choix de la session (13° sous l'horizontale,
  14 m, focale 30°, point visé à 1,9 m, suivi en x amorti, presque fixe en z).
- **Sources** : ADR 024 ; `src/ville/cameras.ts` (`RIGS.frontale`) ; captures `screenshots/qa/m09/v1/`.
- **Recommandation** : garder ces réglages pour la démo et les ajuster à l'œil sur GPU réel (le flou de bascule et le
  halo se jugent mal en SwiftShader). **Raison** : personnages à ≈ 75 px de haut en 720p (lisibles), premier plan du
  quai visible, façades sur deux niveaux.
- **Alternatives** : (a) caméra plus haute et plus loin (plus de façades et de toits, personnages plus petits) ;
  (b) cadrages fixes par portion d'îlot (à éviter : proche du graphe A/B/C/D de Cité du Tournoi, interdit par M09).

### B2. Structure des zones
- **Contexte** : `docs/M09_CADRAGE_VILLE.md` §2 propose ville → quartiers → îlots chargés un à un, reliés par des
  sorties avec fondu court.
- **Recommandation** : îlots chargés un à un (un seul en mémoire, voisin préparé aux temps morts). **Raison** : budget
  mémoire et GPU maîtrisé (les quatre lieux de duel occupent déjà ≈ 66 Mo de textures), même principe que C1/C2.
- **Alternatives** : monde continu en tuiles (plus ambitieux, coût mémoire et de génération supérieurs).

### B3. Entrée en duel depuis la ville
- **Contexte** : la démo passe toujours par l'écran de préparation existant (deck, Techniques, rival, lieu), puis le
  duel inchangé ; « Retour au Quai » ramène devant le personnage ou la porte.
- **Recommandation** : garder la préparation systématique. **Raison** : aucune règle ni écran du duel ne change ; le
  joueur voit le lieu et l'adversaire avant de s'engager ; un refus (deck illégal) reste expliqué.
- **Alternatives** : lancement direct depuis la bulle de défi (plus rapide, mais saute la vérification du deck).

### B4. Intégration de la démo au jeu par défaut
- **Contexte** : derrière `?demo=1`, l'écran « tableau des rencontres » est rendu par la ville ; le jeu par défaut
  reste identique au pixel près (preuves dans le rapport RC). En démo, le tableau classique n'est plus accessible.
- **Recommandation** : valider d'abord la démo telle quelle, puis faire de la ville le hub par défaut **avec** un accès
  « Toutes les rencontres » dans son menu. **Raison** : la ville devient le liant du jeu (direction du responsable),
  le tableau reste utile pour rejouer vite un rival précis.
- **Alternatives** : (a) garder le tableau par défaut et ajouter une entrée « Explorer le Quai » ; (b) ville seule.

### B5. Personnages de la ville et échéance d'Aseprite
- **Contexte** : marcheurs dessinés par code dans l'esprit du V2 (aplats, contour, tête ≈ 1/3), couleurs et coupes des
  gabarits PNJ (ADR 023) ; joueur à capuche et besace d'après la référence de travail du 2026-10-19 (non approuvée).
  Planche : `screenshots/qa/m09/marcheurs.png`.
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

(complétées après la campagne de QA : voir `docs/RAPPORT_RC_0_8.md` §9)
