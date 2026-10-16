# ADR 006 — Deux vues complémentaires pilotées par les phases : A « confrontation », B « manipulation »
Date : 2026-10-16
Statut : proposé (mandat M02 §1–2 ; valeurs de caméra NON définitives)

**Contexte.** M02 remplace le défaut M01 `cam=tilted` : le joueur doit **faire face** au rival (visage, buste) tout en manipulant ses cartes sans gêne. ADR 003 (caméra exploratoire M01) est **remplacé** par celui-ci.

**Décision.**
- `PresentationDirector` (module pur, `src/presentation/director.ts`) choisit la vue d’après la phase **visible** : A par défaut (attente, verrouillé, révélation, Lecture, tactique, résolution, fin) ; B quand le joueur compose (début de tour avec régulation/Technique, préparation, Dissipation, engagement). Un **temps d’observation du rival en A** ouvre chaque tour ; il dure **jusqu’à la première interaction** du joueur (clic, toucher, dépôt, touche) et la vue passe en B **après** cette interaction. Une première version à minuterie (1,4 s) a été abandonnée : la réorganisation déclenchée par le temps déviait des clics (QA, passe 2). Seule une interaction **commencée pendant** le regard l’achève (jeton lu au `pointerdown` / `keydown`) : sans ce jeton, le clic « Tour suivant » qui lance le tour l’annulait aussitôt après coup, et le gabarit basculait de façon asynchrone sous un geste tactile (corrigé en `94f8e05`).
- Bascule manuelle (bouton / touche **V**) valable jusqu’au prochain changement de phase ; **aucune transition pendant un glisser** (gel, rattrapage au lâcher) ; aucun rendu DOM pendant qu’un pointeur est enfoncé (M01).
- Arène : table de duel, rival debout derrière. Vue A : caméra frontale à hauteur de regard ; le point visé est projeté au centre de la bande DOM `.stage-window` via `setViewOffset` (pas de déformation, quel que soit l’écran : 1280, 1920, mobile portrait). Vue B : caméra inclinée centrée sur le plateau DOM ; le visage du rival reste visible dans un **portrait vivant** (second rendu du même renderer, scissor) dont le cadre est un élément DOM.
- Transitions interpolées (≈ 0,85 s, cubique), interruptibles ; instantanées en mouvement réduit / gel.
- Paramètres QA : `view=A|B` (vue figée), `cam=frontal|tilted` (compatibilité M01), `intro=1`, `pace=`.

**Conséquences.** Le DOM change de gabarit avec la vue (cartes plus compactes en A pour libérer la bande du rival). Les rectangles DOM sont transmis à l’arène après chaque rendu ; ni le moteur ni l’IA ne connaissent la caméra.

**Tests.** `test/presentation.test.ts` (chorégraphie, bascule, gel, temps d’observation) ; `qa:browser` contrôle la vue attendue à chaque décision et la bascule V en pleine tactique ; captures `screenshots/qa/m02/`.

**Question d’approbation.** Valider le principe A/B et la chorégraphie ; focales, décor et proportions restent ouverts.
