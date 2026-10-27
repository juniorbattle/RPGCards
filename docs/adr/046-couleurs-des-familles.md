# ADR 046 — Les couleurs des familles : l'Astre en ocre et or, distinct du Voile

**Date :** 2026-10-27. **Statut : APPROUVÉ** (décision du responsable du même jour : « deux familles de cartes ont des
couleurs presque identiques : Astre et Voile […] Il faudrait donc appliquer définitivement cette distinction pour ne pas
s'en mêler et s'assurer que tout soit cohérent dans un combat, en ville et autre »).

## Contexte
L'Astre avait deux couleurs selon l'endroit. **En ville**, il est ocre, ambre et or : bannières peintes du pavillon du
Parvis et des façades de la Grande Cour (rouille, marine, vert, **ocre doré**), bannières de l'Observatoire (ambre, Astre
brodé en or), manteau d'Orin (ocre et or), lumières ambrées. Les écrans hors duel et l'interface de l'aventure
(`--astre`, `#c9a23a`) l'avaient en or. **Mais** la palette commune (`FAMILY_PALETTE.Astre`) lui donnait des fonds
**bleu nuit** : fond des cartes, cadre des cartes (`#3f6fe8`), étendards de la salle et de l'arène (marine), fanions et vitraux
dessinés par code, tenue d'un joueur de l'Astre. Il y avait aussi le manteau de Halvard, chef de l'Astre (portrait V2 et
feuille de ville), le même marine que celui d'Ilse, cheffe du Voile. L'Astre et le Voile se confondaient.

## Décision
1. **Couleurs canoniques** : Cendre rouille et orange ; **Voile marine et indigo** (reflets cyan) ; Ronce vert ;
   **Astre ocre, ambre et or**. Source unique : `src/art/palette.ts` (dessins par code : cartes, lieux de duel, ville,
   tenues, portraits) et les jetons `--cendre`, `--voile`, `--ronce`, `--astre` de `styles.css` (interface).
2. `FAMILY_PALETTE.Astre` passe en rampe ocre (`#1a1206`, `#6b4c14`, `#b8882c`, or `#ffe08a` et `#ffd36b` gardés) ;
   cadre des cartes de l'Astre `#e3b341` ; étendards de l'Astre ocre dans la salle et à l'arène (la rue prenait déjà
   l'or de la famille, `hex` ; le bar n'a pas d'étendards) ; petites
   cartes dessinées dans les motifs de Repère et de Relance aux couleurs de la palette (plus de bleu fixe).
3. **Halvard** : manteau ocre brodé d'or (portrait V2, `chefs.ts`, et dessin de ville par code, `sprites.ts`) ; sa
   **feuille de ville** (image approuvée, passe 128) recolorée par script, ton par ton (`tools/m12-couleurs-astre.mjs` :
   les 10 tons marine du manteau vers l'ocre, sous la ligne du col ; yeux, cheveux, peau, or et cuir inchangés ;
   original gardé dans `art-src/sprites/chef-astre/avant-adr046.png`). Empreinte nouvelle : **approbation caduque**
   (AGENTS, « Images de la ville ») ; hors QA, Halvard revient au dessin par code, lui aussi en ocre, jusqu'à un nouvel
   ordre d'approbation du responsable, dans une passe à part.
4. Verrou : `test/couleurs-familles.test.ts` (teintes de la palette, cadres des cartes, jetons de l'interface, étendards
   des lieux : l'Astre entre 30 et 55°, le Voile entre 200 et 250°, les quatre familles éloignées deux à deux).

## Conséquences
Le rendu change exprès partout où l'Astre paraît (cartes, duels contre un rival de l'Astre, étendards de la salle et de l'arène,
fanions et vitraux de la ville dessinés par code, joueur de l'Astre). Les images de la ville générées et approuvées ne
changent pas (leur Astre est déjà ocre), sauf la feuille de Halvard (point 3). Les règles, le catalogue et l'IA ne
changent pas. Preuves : `screenshots/qa/m12/couleurs/` (Halvard avant / après à côté d'Ilse et d'Orin ; duels dans la
salle et à l'arène avant / après), `screenshots/qa/m12/galerie/v2-planche.png`.
