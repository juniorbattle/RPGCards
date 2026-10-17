# ADR 015 — Re-rendu ciblé du plateau : arbre complet construit, seuls les nœuds changés touchés

Date : 2026-10-17
Statut : proposé (passe 13 ; complète ADR 002 sans le remplacer ; respecte ADR 013 sans le modifier)

**Contexte.** Chaque commande acceptée et chaque réponse du rival appelaient `renderApp`, qui recréait
tout `#app` (`replaceChildren`) : le navigateur recalculait style et mise en page de tout le plateau
(≈ 230 éléments restylés, ≈ 340 objets remis en page même sans aucun changement d’état). La passe 12
en a fait la dernière cause d’à-coups du jeu lui-même (35–60 ms par commande sous charge et trace).
Contraintes :
- même DOM, même composition (ADR 013), mêmes règles (`src/game` inchangé), mêmes secrets ;
- même comportement, y compris les effets de bord du re-rendu complet ;
- ne jamais recréer d’élément interactif pendant une interaction pointeur ;
- pas de framework d’UI (ADR 002).

**Décision.**
- **On garde les constructeurs existants** (`h()`, `board.ts`) : chaque rendu construit l’arbre complet,
  hors document, comme avant. `patchChildren` (`src/presentation/dom.ts`) rend ensuite les enfants de
  `#app` identiques à cet arbre en réutilisant les nœuds en place :
  - appariement par `data-key`, sinon par le premier nœud compatible (même balise, mêmes classes) ;
  - un sous-arbre identique sans écouteur ni élément marqué est gardé d’un bloc (`isEqualNode`, natif).
- **Écouteurs transférables** : `h()` / `listen()` posent un répartiteur partagé qui lit une table par
  élément ; un élément gardé reçoit la table du nouvel élément (aucune fermeture périmée).
- **Équivalence de comportement**, chaque règle reproduisant un effet du re-rendu complet :
  - un élément dont un attribut change est **remplacé** par sa version neuve, pas modifié sur place :
    aucune transition CSS ne démarre là où le re-rendu n’en démarrait pas ;
  - un élément en place qui porte une animation en cours (CSS, transition, Web Animations, dont le
    glissement FLIP A ↔ B) est remplacé : l’animation s’arrête comme avant ;
  - `fresh()` marque les éléments à toujours recréer : animation relancée (`beat-hit`, points
    « Réfléchit », chiffres flottants des PV), focus donné par micro-tâche (menu tactique), régions
    `aria-live` ;
  - une carte sous la souris avec des écouteurs de survol est remplacée : le navigateur annonce
    l’entrée du pointeur sur l’élément neuf (inspection), comme avant ;
  - l’élément focalisé reçoit `blur` au même moment qu’avant, après la construction du nouvel arbre :
    Chrome l’envoie, élément encore attaché, quand on le retire du DOM. Le focus est ensuite rendu par
    `data-key`, comme avant.
  - Passage de vue A ↔ B : les variables CSS de la vue changent l’inclinaison et la taille des cartes
    posées. Pendant ce rendu seulement, `#app.view-switch` coupe les transitions de `.card`, `.zone`
    et `.zone-floor` dans `.side`. Les sélecteurs sont ciblés : un `*` ferait restyler tout `#app`.
- **Vérification intégrée** (`?qa=1&renderCheck=1`, `LQV_RENDER_CHECK=1` pour `qa:browser` et
  `qa:product`). Chaque rendu ciblé est comparé à un rendu complet du même état : structure,
  attributs dans l’ordre, textes, types d’écouteurs. Aucune transition CSS ne doit démarrer sur un
  élément gardé. Tout écart est une erreur console, donc un échec de QA.
- **Hors périmètre, inchangés** : les mises à jour ciblées déjà existantes (`patchBeat`,
  `patchInspector`, `patchRivalBubble`, inspection au survol), ClashStage, l’arène.

**Conséquences.**
- Rendu sans changement d’état : ≈ 27 éléments restylés et ≈ 50 objets remis en page au lieu de
  ≈ 233 et ≈ 339. Les mesures par commande sont au rapport RC §5.6.
- Le coût restant d’une commande vient de ce qui change réellement, de la construction de l’arbre
  complet (gardée volontairement : un seul code de rendu, vérifiable) et de la génération des
  illustrations à leur première apparition.
- Un nouveau composant du plateau doit respecter trois règles :
  - poser ses écouteurs par `h()` / `listen()` ;
  - marquer `fresh()` tout élément dont l’animation CSS doit repartir à chaque rendu ;
  - ne capturer dans un écouteur que des valeurs visibles dans le DOM ou constantes de la session.
  `renderCheck` signale un oubli des écouteurs ou une transition imprévue.
- Les identités des nœuds sont désormais stables d’un rendu à l’autre. Un outil qui attendait le
  remplacement des enfants de `#app` doit observer le sous-arbre (`waitLean` : `subtree: true`).
