# M17 — Apprendre le duel : tutoriel de base et leçons des nouveaux éléments (contrat, PROPOSÉ)

> **Statut : APPROUVÉ le 2026-11-09 (fiche remplie, consignée à la passe 214 ; `docs/FICHE_ARBITRAGES_M17.md`).** Treize
> choix sur la recommandation ; **un écart (S1) : développé avant le test complet du responsable** ; clôture repoussée le
> temps de M17 (S2). Règle B6 inscrite à `AGENTS.md`.
> Demande du responsable (2026-11-09) : « il va être nécessaire d'intégrer un tutoriel de combat pour bien cerner les
> concepts, mais aussi lorsque nous aurons de nouveaux éléments de gameplay (les variantes, les Signatures, etc.), afin
> que tout type de profil de joueur puisse bien comprendre le jeu ».

## 1. Ce qui existe aujourd'hui

- **Douze conseils contextuels** (`src/shell/tips.ts`, repris dans l'aventure par `src/aventure/conseils.ts`) : un à la
  fois, en bas à droite, la première fois qu'une situation se présente (début de tour, préparation, engagement, choix
  tactiques, lecture du Clash, 0 dégât, Insight ; puis les cinq signaux de M12 : RÉVÉLER, ARMÉ, pastille, temps forts,
  regard privé), fermés par « Compris ». **Ils disent, ils ne font pas faire** : le joueur lit un paragraphe pendant que
  tout le plateau reste actif, et rien ne vérifie qu'il a compris.
- **Une page d'aide** en texte (`src/shell/help.ts`) : le déroulé d'un tour, Rang et Puissance, les trois états des
  Secondaires, l'Insight et les Techniques, les commandes. Complète, mais dense.
- **Des scénarios scriptés** (`src/app/scenarios.ts`) : une situation de duel posée d'avance (mains, cases, tour,
  phase) et un rival aux commandes fixées. Ils servent aux captures et à la QA ; **c'est la brique d'une leçon jouable**
  (situation exacte, issue connue, aucun hasard).
- **Le prologue de l'aventure** se joue avec les seize cartes grises (sans famille ni effet) contre Kaï : c'est déjà une
  progression naturelle. Les familles arrivent à l'affiliation, les variantes aux premières victoires, la seconde
  Technique au premier cadet, la Technique d'une famille et sa Signature au chef (M16). **Rien n'explique ces éléments
  quand ils arrivent**, sauf les cinq conseils de M12, qui attendent que la situation se produise en duel.
- **Le Duel standard** donne tout d'un coup (familles, variantes A, Signature, deux Techniques), sans autre aide que les
  conseils et la page.

## 2. Principe

Apprendre **en jouant**, par petites leçons : chaque leçon est une situation de duel préparée (un scénario), un à trois
tours, environ une minute ; une phrase dit ce qu'il faut faire, l'élément attendu est mis en lumière, le reste est
assombri et ne répond pas ; le Clash se résout pour de vrai (même moteur, mêmes règles), puis une phrase dit ce qui
vient de se passer et pourquoi. Une leçon se termine par un tour où le joueur choisit seul, pour vérifier.

- **Aucune règle ne change.** Les leçons utilisent le moteur, le catalogue et les règles V3.3 tels quels ; le rival d'une
  leçon est scripté (comme les scénarios), annoncé comme partenaire d'entraînement, jamais présenté comme l'IA.
- **Toujours passable, toujours rejouable** ; rien ne se perd à passer (aucune récompense ni PV liés aux leçons).
- **Deux vitesses** : un profil choisi une fois (§5) règle quelles leçons sont proposées et la longueur des phrases.

## 3. Le tutoriel de base (six leçons)

| # | Leçon | Ce que le joueur fait | Ce qu'il retient |
|---|---|---|---|
| 1 | **Le Clash** | Poser une Primaire en ASSAUT contre une Garde plus faible, puis contre une plus forte | Le Rang décide qui gagne, la Puissance fait les dégâts |
| 2 | **Assaut ou Garde** | Choisir la posture face à une Primaire annoncée forte | Une Garde victorieuse bloque tout et rapporte 1 Insight ; dominée, elle absorbe la moitié de sa Puissance |
| 3 | **Les Secondaires** | Poser une réserve face cachée, la voir charger, la révéler au tour suivant | Charger, réserve cachée, active |
| 4 | **Les choix tactiques** | Amplifier le Rang pour renverser un Clash, puis les Dégâts sur un Assaut gagnant | Rang (priorité), Dégâts (multiplicateur, Assaut seulement) |
| 5 | **Interférer** | Annuler le soutien adverse qui allait gagner le Clash | Rang imprimé inférieur ou égal ; le rival choisit en même temps |
| 6 | **Insight et Technique** | Gagner 1 Insight puis payer sa Technique (Sondage ou Recentrage) | La réserve 0 à 2, une Technique par tour |

Les leçons 1 à 6 se jouent avec les cartes grises (aucun effet, aucune famille), comme le prologue : un seul concept à
la fois.

## 4. Les leçons des nouveaux éléments

Une leçon par élément, proposée **au moment où le joueur l'obtient** (« Essayer maintenant », une minute, ou « Plus
tard »), puis rangée dans la bibliothèque :

| Élément | Quand il arrive dans l'aventure | Leçon |
|---|---|---|
| **Familles et affinité** | Affiliation ou engagement (cartes de base) | Amplifier le Rang avec une Secondaire de la même famille (+1) |
| **Variantes : effets** | Première variante (Épreuve, choix, ville) | La pastille de déclenchement, RÉVÉLER, ARMÉ, les temps forts |
| **Regard privé et camouflage** | Première variante qui en a un | Ce que l'on voit, ce que le rival sait |
| **Chaque Technique** (Lecture, Rupture, Dissipation, Ancrage, et la Technique de rue reçue au cadet) | À son gain (M16) | Sa fenêtre, son coût, un cas où elle renverse le Clash |
| **La Signature** | Victoire sur le chef | Le Rang ∞, l'annonce face visible, la révision du rival |
| **La prolongation** | Premier double K.-O. (rare) | Les deux joueurs à 1 PV |

**Effets de l'adversaire** : la première fois qu'un effet adverse change le Clash (une Interférence qui annule un soutien,
une Dissipation, une Signature annoncée), le résultat du Clash porte une ligne « Ce qui vient de se passer » et un lien
vers la leçon.

**Règle pour la suite du projet** : tout nouvel élément de jeu (carte, effet, Technique, règle) est livré avec sa leçon
(inscrite à `AGENTS.md` si la fiche le retient).

## 5. Profil du joueur

À la première ouverture du duel (aventure ou jeu standard), une seule question :

- **« Je découvre les jeux de cartes »** : les six leçons proposées dans l'ordre, phrases complètes, un tour de
  vérification à la fin de chacune ;
- **« J'ai l'habitude des jeux de cartes »** : les leçons 1, 3 et 4 (le cœur qui diffère des autres jeux), phrases
  courtes ;
- **« Je connais Les Quatre Voies »** : rien d'imposé, la bibliothèque reste ouverte.

Le profil se change dans le menu ; il ne touche ni au duel, ni à l'IA, ni à la difficulté.

## 6. Où l'on trouve les leçons

- **Aventure** : avant le duel du prologue, le **maître de table** (personnage déjà présent, neutre, sans famille)
  propose « une partie d'entraînement » ; la refuser mène au duel contre Kaï comme aujourd'hui. Les leçons des nouveaux
  éléments sont proposées à l'écran où l'élément est gagné (récompense, choix de la variante, affiliation, chef vaincu).
- **Duel standard** : « Apprendre » à l'accueil, proposé au premier lancement.
- **Bibliothèque « Leçons »** dans le menu (aventure et jeu standard) : chaque leçon, faite ou non, rejouable.
- **Conseils existants** : gardés comme rappels ; une leçon faite éteint les conseils qu'elle couvre.

## 7. Garanties et vérification

- Règles, moteur, catalogue, IA, annexe de calibrage, empreintes et replays standard **inchangés** ; secret (ADR 011) :
  une leçon ne montre jamais au joueur ce qu'il ne verrait pas en duel, sauf la phrase qui annonce ce que le partenaire
  d'entraînement va jouer (annoncée comme telle).
- Sauvegarde : leçons faites et profil dans un champ facultatif (aucune migration) ; jeu standard : `lqv.lecons`.
- QA : les parcours existants coupent les leçons sans `?lecons=1` (comme les conseils et les cinématiques) ;
  `node tools/m17-lecons.mjs` joue chaque leçon au clavier, à la souris et à la manette, en 1280 et 1920, avec et sans
  mouvement réduit ; planche des leçons.
- Duel lui-même, plateau et jeu par défaut au repos inchangés quand aucune leçon n'est ouverte.

## 8. Ce qui reste à trancher (fiche)

Format des leçons, style de guidage, personnage, place dans l'aventure et le jeu standard, profil ; moment et portée
des leçons des nouveaux éléments, effets adverses, bibliothèque, sort des conseils, règle pour la suite ; calendrier.

## 9. Livraison (passe 215)

Livré tel que ci-dessus. Choix d'exécution : les leçons faites et le profil sont gardés par navigateur (`lqv.lecons`), pour le
jeu standard comme pour l'aventure, plutôt que dans la sauvegarde de l'aventure (§7) : ce que le joueur sait du duel ne dépend
pas d'une aventure. La leçon « Insight et Technique » enseigne Sondage ; Recentrage a sa propre leçon. Détail et preuves :
`JOURNAL.md`, passe 215 ; `node tools/m17-lecons.mjs`, planche `screenshots/qa/m17/`.
