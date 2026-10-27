# M12 — Contrat 1 : la conception des cartes

**Date :** 2026-10-27. **Statut : PROPOSÉ** (présentation seulement ; aucune règle changée). ADR 044.
**Code :** `src/art/cardArt.ts` (illustrations), `src/art/cardMotifs.ts` (motifs propres à chaque carte),
`src/presentation/cardView.ts` (face), `src/presentation/effectIcons.ts` (icônes de déclenchement),
`src/game/catalog/cardText.ts` (résumés d'une ligne, données pures), `src/styles.css` (cadres de rareté).

## 1. Principes

- **Une illustration par définition** : les 36 cartes standard, les 4 neutres et le dos ont chacune leur dessin. Les
  Basics gardent l'emblème de leur famille (le « portrait » de la famille, du Rang I au Rang IV) ; chaque variante et
  chaque Signature reçoit une composition qui raconte son effet (une étincelle pour Étincelle, un voile pour
  Dissimulation, des écailles pour Écaille, un prisme pour Prisme…).
- **Toujours par code** (Canvas 2D, graine d'art, aucune image) ; les illustrations sont préparées hors du fil
  principal (`artWarmup.ts`) comme aujourd'hui : un motif ne lit que l'API commune au canvas et à l'`OffscreenCanvas`.
- **Lisible à la taille du plateau** (≈ 90 à 130 px de large) : une forme principale, un contraste fort, le motif de
  la famille en fond ; aucun détail qui ne se lit qu'à la loupe.
- **Le Rang reste l'information principale** (coin haut gauche), la Puissance sur la plaque, l'emblème de famille en
  haut à droite (ADR 018 : Rang ≠ Puissance).

## 2. Anatomie de la face

| Élément | Où | Ce qu'il dit |
|---|---|---|
| Rang (I à IV, ∞) | haut gauche | la priorité du Clash |
| Emblème de famille | haut droite | la famille (affinité) ; absent sur une neutre |
| **Pastille de déclenchement** | sous l'emblème | **quand** l'effet joue : une icône (§3) ; absente sur une Basic |
| Illustration | toute la carte | la carte elle-même |
| Plaque : nom | bas | le nom entier (deux lignes si besoin, taille ajustée) |
| Plaque : effet | bas | le nom de l'effet ; Basic : « Basic » ; neutre : « Sans famille » |
| Plaque : R et P | bas | Rang et Puissance |
| **Cadre de rareté** | bord | Peu commune (filet argent), Rare (filet or), Épique (double filet or et gemme), Légendaire (filet prismatique qui miroite), Signature (couronne d'or, ∞) |

Le **résumé d'une ligne** (§4) n'est pas imprimé sur la petite carte (illisible) : il apparaît dans l'inspecteur, sur
les grandes cartes (collection, préparation, mises en avant) et dans la bulle d'aide d'une carte activable.

## 3. Icônes de déclenchement

Dessinées en SVG par code (`effectIcons.ts`), de la couleur de la famille, avec un nom accessible.

| Déclenchement (`EffectTrigger`) | Icône | Libellé |
|---|---|---|
| `primary-reveal` | un œil ouvert sur une carte | « À la révélation de la Primaire » |
| `secondary-reveal` | une carte qui se retourne (flèche courbe) | « Révélation volontaire de la Secondaire » |
| `use-rank` | un chevron montant | « Engagée en Amplifier le Rang » |
| `use-damage` | un multiplicateur (×) | « Engagée en Amplifier les dégâts » |
| `use-interfere` | un éclair qui barre | « Engagée en Interférer » |
| Signature | ∞ dans une couronne | « Signature : Primaire seulement » |

Les mêmes icônes servent dans l'inspecteur, l'aide et les mises en avant (contrat 2).

## 4. Les 36 cartes standard

Résumés : des **résumés** fidèles du texte canonique (`EFFECTS[...].text`, inchangé), pour comprendre d'un coup d'œil.

### Cendre — pression, prise de risque (flammes, braises, forge ; orange)

| Carte | Déclenchement | Résumé | Illustration |
|---|---|---|---|
| Cendre I à IV (Basic) | — | aucun effet | l'emblème du feu, flammes de plus en plus hautes du Rang I au Rang IV |
| **Étincelle** (I, Peu commune) | Rang | Victoire d'un seul point qui blesse : +2 dégâts | une étincelle qui éclate, rayons fins et escarbilles |
| **Braise** (II, Peu commune) | Révélation | Bat un Assaut (sans soutien Dégâts) : +2 dégâts | une braise rougeoyante, fendue de lumière, sur un lit de cendres |
| **Ferveur** (III, Rare) | Dégâts | Victoire Cendre qui blesse : +1 Insight | une flamme dressée dans des ondes de chaleur, un losange d'Insight au cœur |
| **Contrecoup** (IV, Épique) | Révélation | Perd contre un Assaut : inflige quand même 3 dégâts | deux flammes qui se heurtent, onde de choc en arcs |
| **Brasier Originel** (Signature, ∞) | Révélation | Assaut soutenu qui blesse : Repousse une Secondaire cachée | un brasier en ailes de feu autour de l'emblème, couronne de flammes |

### Voile — information, camouflage (voiles, regards, brume ; bleu)

| Carte | Déclenchement | Résumé | Illustration |
|---|---|---|---|
| Voile I à IV (Basic) | — | aucun effet | l'emblème du voile, anneaux de plus en plus nombreux |
| **Éclaireur** (I, Peu commune) | Révélation volontaire | Révélée : voyez une carte de la main adverse | une lanterne dont le faisceau fend la brume |
| **Détour** (II, Rare) | Interférence | Interférence réussie : voyez une carte adverse | un ruban qui serpente et contourne un obstacle |
| **Dissimulation** (III, Épique) | Révélation volontaire | Révélée : masque votre autre Secondaire | un voile qui tombe sur une forme |
| **Silence** (IV, Légendaire) | Interférence | Interfère un Rang IV : éteint l'effet de la Primaire adverse | un croissant de lune, un œil clos, des ondes coupées |
| **Miroir du Voile** (Signature, ∞) | Révélation | À la révélation : voyez une carte adverse et sa plus ancienne Secondaire cachée | un miroir ovale où s'ouvre un œil, rideaux de voile |

### Ronce — garde, contrôle (épines, racines, écailles ; vert)

| Carte | Déclenchement | Résumé | Illustration |
|---|---|---|---|
| Ronce I à IV (Basic) | — | aucun effet | l'emblème de la fleur, de plus en plus épanouie |
| **Racine** (I, Peu commune) | Rang (Garde) | Garde qui Repousse une carte cachée : vous voyez laquelle | des racines qui plongent et enserrent une pierre |
| **Écaille** (II, Rare) | Rang (Garde) | Garde victorieuse contre un Assaut : soin 2 PV | des écailles en bouclier, un cœur de sève lumineux |
| **Entrave** (III, Rare) | Révélation (Garde) | Garde qui Repousse une Basic : sous la pioche adverse | des lianes d'épines nouées en entrave |
| **Ténacité** (IV, Épique) | Rang (Garde) | Garde vaincue : revient sous votre pioche | un tronc à cernes, une pousse neuve qui repart |
| **Couronne de Ronce** (Signature, ∞) | Révélation (Garde) | Garde victorieuse : Repousse une Secondaire adverse | une couronne d'épines fleurie de roses |

### Astre — adaptation, synergies (étoiles, orbites ; bleu nuit et or)

| Carte | Déclenchement | Résumé | Illustration |
|---|---|---|---|
| Astre I à IV (Basic) | — | aucun effet | l'emblème de l'étoile, constellations de plus en plus riches |
| **Repère** (I, Peu commune) | Révélation volontaire | Révélée : voyez le sommet de votre pioche | une étoile guide au-dessus d'une pile de cartes |
| **Prisme** (II, Rare) | Dégâts | Affinité +1 avec une Primaire de toute famille | un prisme qui décompose la lumière en quatre couleurs |
| **Relance** (III, Épique) | Interférence | Interfère un Rang III : revient au sommet de votre pioche | une orbite qui revient sur elle-même, flèche courbe |
| **Convergence** (IV, Légendaire) | Dégâts | Primaire d'une autre famille : ×6 au lieu de ×4 | des rayons qui convergent en un point |
| **Convergence Astrale** (Signature, ∞) | Révélation | Victoire avec un seul soutien valide : il revient au sommet de la pioche | une spirale de constellations autour d'un astrolabe |

## 5. Neutres, dos, Techniques

- **Neutres I à IV** (mode Aventure) : dessin gris sans emblème (`neutreArt`, inchangé dans l'esprit), cadre gris,
  « Sans famille ».
- **Dos commun** : inchangé (aucune information d'identité).
- **Techniques** : un **sceau** chacune, gravé par code, utilisé sur les boutons, dans l'aide et les mises en avant :
  Sondage (œil dans un cercle), Recentrage (flèche qui plonge sous une pile), Lecture (deux postures face à face),
  Ancrage (ancre), Rupture (chaîne brisée), Dissipation (voile déchiré). Coût en Insight : losanges.

## 6. Ce qui ne change pas

Le catalogue (identités, Rangs, Puissances, raretés, effets et leurs textes), les règles, l'IA, la visibilité (une
carte camouflée reste un dos, le DOM ne porte jamais l'identité d'une carte cachée), la taille des cartes et leur place
sur le plateau. L'ancien dessin reste disponible avec `?cartes=v1` (comparaison, réversibilité).

## 7. Vérifications

- Tests : chaque définition a un motif ; résumés présents et courts pour les 20 effets ; icônes pour les 5 déclenchements ;
  aucun identifiant de carte cachée dans le DOM d'un dos (test existant) ; dessin déterministe (même graine, même image).
- Galerie avant / après (`?gallery=1`), à la taille du plateau et en grand ; temps de préparation des 36 illustrations
  (worker) mesuré avant / après.
