# M12 — Contrat 2 : la mise en avant des activations

**Date :** 2026-10-27. **Statut : PROPOSÉ** (présentation seulement ; aucune règle changée). ADR 045.
**Code :** `src/presentation/activations.ts` (pur : événements visibles → temps forts), `src/presentation/activationStage.ts`
(premier plan DOM, Web Animations), `src/app/controller.ts` (ordonnancement), `src/presentation/beats.ts` (un temps par
effet), `src/presentation/board.ts` et `src/styles.css` (impulsions du plateau), `src/son/` (sons d'activation).

## 1. Principes

- **Un temps fort par activation**, au premier plan, au centre de l'écran : on doit voir **quelle carte** agit, **quel
  effet**, **ce qu'il fait** (la conséquence en grand), puis la scène reprend. À la manière de *Duel Links* : impulsions,
  carte agrandie au centre, bannière, rythme.
- **Rien n'est recalculé** : tout vient des événements déjà résolus par le moteur et filtrés pour le spectateur
  (`visibleEvents`) ; le temps fort n'invente ni nombre ni cible.
- **Secret** (ADR 011, M03.1B) : un temps fort ne naît que d'un événement public ou privé au spectateur. Effet d'une
  Secondaire camouflée de l'adversaire : un dos aux couleurs de sa famille, « Effet masqué », sa seule conséquence
  publique. Regard privé : la carte vue n'est montrée qu'à son propriétaire ; l'adversaire voit « Le rival observe ».
  Le DOM d'un temps fort ne porte jamais l'identité d'une carte qu'il ne montre pas.
- **Lisible puis discret** : la scène du Clash, le plateau et les HUD restent à leur place (ADR 013, 016) ; le temps
  fort passe devant puis s'efface sans laisser d'élément.

## 2. Les temps forts

| Temps fort | Quand (événement) | Ce qu'on voit | Durée (rythme normal) |
|---|---|---|---|
| **Effet réussi** | `effect` (`success`) | la carte agrandie au centre, trois impulsions de la couleur de la famille, la bannière du nom avec l'icône de déclenchement, la **conséquence en grand** (« +2 DÉGÂTS », « SOIN +2 », « +1 INSIGHT », « REPOUSSE », « RETOUR AU SOMMET », « EFFET ÉTEINT »…), puis la carte rejoint sa place | 1,2 s |
| **Effet annulé** | `effect` (`cancelled`) | la carte au centre, puis un tampon « ANNULÉ » qui frappe (la carte tremble et grise) | 0,9 s |
| **Condition non remplie** | `effect` (`failed`) | l'étiquette « armé » de la carte s'éteint ; les conditions non remplies d'un tour sont **regroupées** en un seul bandeau discret (« Braise : pas de victoire contre un Assaut ») | 0,6 s |
| **Effet masqué** | `effect` masqué (adversaire) | un dos de carte de la famille, « EFFET MASQUÉ », la conséquence publique | 1 s |
| **Effet armé** | `effectArmed` (révélation des Primaires) | une impulsion sur la Primaire et une étiquette « ARMÉ » qui pulse jusqu'à la résolution (le résumé de la condition dans sa bulle d'aide) | sur la carte |
| **Révélation volontaire** | `secondaryRevealed` | la carte se retourne sur sa case avec un éclat ; si elle porte un effet de révélation, son temps fort suit | 0,5 s |
| **Regard privé** | `peek` (privé) | la carte vue, face visible, en grand au centre, « PRIVÉ — vous seul voyez », la source (Sondage, Éclaireur…) | 1,4 s |
| **Technique** | `technique` | le **sceau** de la Technique au centre, son nom, les losanges d'Insight qui se consument ; le résultat suit (regard privé, Lecture, Recentrage) | 1 s |
| **Camouflage** | `masking` | un voile tombe sur la Secondaire ciblée ; bannière « DISSIMULATION » | 0,9 s |
| **Dissipation** | `dissipation` | le voile se déchire sur la carte qui redevient visible | 0,9 s |
| **Signature annoncée** | `signatureAnnounced` | l'emblème de la famille immense, le nom de la Signature, « ∞ », éclat d'or | 1,4 s |
| **Interférence** | `interference` | un trait d'énergie de la carte source vers sa cible ; réussie : « ANNULÉ » sur la cible ; échec : le trait se brise | 1 s |
| **Insight** | `insight` (gain) | un losange qui vole vers le HUD ; le compteur pulse | 0,7 s |
| **Soin** | `heal` | halo vert sur le HUD, « +2 » | 0,7 s |
| **Repoussement** | `repel` | la carte soulevée puis renvoyée vers la main (ou sous la pioche) de son propriétaire ; bannière du nom de l'effet (Repoussement, Emprise, Flamme conquérante, Rupture) | 1 s |

Les dégâts, le Clash, la Garde, la prolongation et la victoire gardent leur chorégraphie (M03) ; les temps forts
s'insèrent **entre** les temps de la résolution, dans leur ordre (Interférences, Clash, dégâts, soins, effets, Insight,
destinations, Repoussement).

## 3. Ordonnancement

- **Pendant la résolution** : un temps de résolution **par effet** (au lieu d'un temps groupé) ; le panneau
  « Résolution » garde son texte (et le journal le sien), le temps fort l'illustre.
- **Hors résolution** (début de tour, révélation volontaire, engagement, Lecture, fenêtre tactique) : les temps forts
  passent en file ; le rival attend la fin de la file avant d'agir ; le joueur garde la main (le premier plan ne
  capte aucun clic, sauf « Passer »).
- **Rythme** : normal ; rapide (durées × 0,45) ; instantané : aucun temps fort (le texte suffit). **Mouvement réduit** :
  aucun déplacement ni zoom, des fondus et des poses statiques, durées gardées (le temps de lire). **Gel** (captures) :
  les temps forts de la résolution sont posés dans leur état final au temps demandé (`?beat=`) ; aucun temps fort hors
  résolution. **Passer** : vide la file et retire tout.

## 4. Ce qui est possible : les impulsions du plateau

- **Secondaire activable** (phase de préparation) : une Secondaire en réserve dont l'effet joue à la révélation
  volontaire pulse ; sa bulle d'aide dit le résumé de l'effet.
- **Technique utilisable** : le sceau du bouton pulse dans la fenêtre où elle peut servir.
- **Effet armé** : la Primaire pulse doucement avec son étiquette « ARMÉ » (§2).
- **Engagement** : la pastille de déclenchement d'une Secondaire de la main dit dans quel mode son effet joue
  (Rang, Dégâts, Interférer) ; elle s'illumine quand on choisit ce mode.

## 5. Sons

Synthétisés par code (`src/son/`), coupés en QA : « activation » (montée brève de la famille), « annulé » (choc sourd),
« sceau » (Technique), « regard » (privé). Un son ne trahit jamais un secret (même règle que les temps forts).

## 6. Vérifications

- Tests purs (`test/m12-activations.test.ts`) : un temps fort par événement visible ; aucun temps fort d'un événement
  privé adverse ; effet masqué sans nom ; regard privé seulement pour son propriétaire ; ordre de la résolution.
- Tests de la scène : nettoyage complet après « Passer », gel, mouvement réduit.
- Captures par scénario (effets réussis, annulés, masqués, Techniques, regard privé, Repoussement, Signature).
- Règles : empreintes et replays standard identiques ; `qa:browser`, `qa:product`, `qa:rc` verts.
