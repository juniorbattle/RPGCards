# ADR 025 — Architecture de la ville d'exploration (M09 V1 et V2)

Date : 2026-10-19
Statut : **PROPOSÉ** (choix de la session cloud autonome, sans le responsable ; réversible). La caméra est décidée à
part (ADR 024, frontale 2.5D, approuvée). L'intégration de la démo au jeu par défaut reste une décision du responsable
(`docs/FICHE_ARBITRAGES_M09.md`, B4).

## Contexte

M09 demande un prototype de ville « à part du jeu » (le jeu par défaut identique au pixel près tant que l'intégration
n'est pas validée), puis une première zone jouable qui mène aux lieux de duel existants et en revient. La consigne de
l'opérateur pendant le run : approcher une démo jouable de l'accueil à la ville et au combat.

## Décision

1. **Module isolé `src/ville/`**, chargé à la demande (import dynamique) par `?ville=1` (laboratoire) et `?demo=1`
   (démo) : rien n'est exécuté ni téléchargé dans le jeu par défaut (fichiers `ville-*.js`, `demo-*.js`, `labo-*.js`).
2. **Logique pure séparée du rendu**, comme le moteur du duel : plan des îlots (`quai.ts`, `parvis.ts`), déplacement et
   collisions (`monde.ts` : disque contre rectangles et disques, glissement axe par axe, sous-pas de 5 cm), cadrage
   (`cameras.ts`), objectifs et portes de la démo (`objectifs.ts`), registre des îlots et liaisons (`ilots.ts`) ;
   tests `test/ville.test.ts`. Le rendu (`scene.ts`, `sprites.ts`, `ville.ts`) ne fait qu'exécuter.
3. **Îlots chargés un à un** : un seul îlot en mémoire ; une sortie démonte l'îlot (scène, personnages, passants) et
   monte le voisin (fondu court côté démo) ; le renderer et le post-traitement restent.
4. **La démo branche la ville sur le hub existant sans toucher la machine de flux** (`src/product/flow.ts`) : avec
   `?demo=1`, l'écran « tableau des rencontres » est rendu par la ville (`DemoHub`, interface `ShellDeps.hub`) ; toutes
   les transitions existantes (retour de préparation, fin de duel, deck, options, aide) y ramènent ; le résultat
   affiche « Retour au Quai ». La ville n'ouvre que des rencontres déjà définies, selon `encounterStatus`.
5. **Deux contextes WebGL** pendant la démo : l'arène du duel (inchangée, mise en pause sous la ville) et la ville
   (mise en pause et masquée pendant un duel). Choix de prudence : aucune modification de l'arène validée ; une scène
   unique pour les deux est possible plus tard (même renderer, deux scènes) si la mémoire le demande.
6. **Uniformes partagés** (brume, ciel, lune, lumières) et **un programme de surface** paramétré pour toutes les
   matières, adaptés de Cité du Tournoi (`SceneUniforms.ts`, `ShaderChunks.ts`, commit `0398c4f`), au plus 16 lumières
   par îlot ; géométries statiques fusionnées par matière.
7. **État propre à la démo hors de la sauvegarde** (`localStorage` `lqv.demo` : tutoriel, guide, îlot, position, lié au
   profil par sa date de création) : le schéma de sauvegarde (2) ne change pas ; perdre cet état ne casse rien.

## Conséquences

- Le jeu par défaut ne change pas (preuves au pixel près, `docs/RAPPORT_RC_0_8.md` §3.2) ; le bundle principal prend
  ≈ 3,6 Ko (classes de Three.js partagées).
- Intégrer la ville au jeu par défaut = faire de `?demo=1` le comportement par défaut (une ligne) après validation.
- À revoir : préparation de l'îlot voisin aux temps morts si le changement d'îlot se voit sur GPU réel ; scène unique
  si la mémoire GPU le demande ; état de la démo dans la sauvegarde (avec migration) si la ville devient le hub.
