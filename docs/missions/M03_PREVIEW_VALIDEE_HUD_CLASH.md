# RPGCards — Les Quatre Voies
## M03 — Fidélité à la preview validée, HUD joueur et chorégraphies du Clash

**Type : mission de production et de raffinement, développement concret attendu.**  
**Source :** `juniorbattle/RPGCards`, branche de référence `claude/m02-confrontation-face-a-face` (dernier commit livré dans le rapport M02 : `e978d2d`; vérifier le HEAD réel).  
**Référence graphique OBLIGATOIRE :** `reference/REFERENCE_VISUELLE_VALIDEE_M03.jpg` **présente sur cette branche GitHub** (version haute qualité de revue) et, dans le kit joint, `reference/REFERENCE_VISUELLE_VALIDEE_M03.png` (**original PNG exact validé par le responsable**). L'image a été explicitement approuvée. La décrire à nouveau ou l'approximer de mémoire n'est pas un substitut à son inspection visuelle.

### 0 — Priorité des instructions

Avant toute intervention, lis `AGENTS.md`, `CLAUDE.md`, `JOURNAL.md` (dernière passe et priorités), les contrats, `source/CONTRAT_REGLES_V3_0_HISTORIQUE.md`, le delta `contracts/02_CONTRAT_GAMEPLAY_DELTA_V3_2.md`, le rapport M02, les ADR 006–008, et le code actuel du plateau, des caméras, des cartes, du séquenceur et de la QA.

**La présente directive visuelle est une décision explicite et récente du responsable.** Elle remplace les choix **provisoires** de composition/HUD du MVP M02 lorsqu'ils contredisent l'image validée. Elle n'autorise aucune modification silencieuse des règles du duel. Toutes les décisions métier restent régies par V3.0 + delta V3.2. Les arbitrages ADR 004 non ratifiés restent à part.

Fais un **diagnostic initial concis** confrontant captures réelles M02 et image validée ; puis **implémente**, teste, capture et corrige de façon autonome. Ne livre pas seulement une proposition graphique ou des mockups.

Crée une branche issue de la branche M02, par exemple `claude/m03-ui-fidele-et-clash-anime`. Ne touche pas `main` ni le simulateur ou les contrats historiques. Mets à jour les ADR et le journal.

### 1 — Contrat de fidélité visuelle : nouveau point de référence

**Reproduis fidèlement par code la composition et la hiérarchie visuelle de l'image** :

- **Vue A, confrontation frontale** : adversaire expressif présent en face, au-delà d'une table de duel lisible ; arrière-plan HD-2D/2.5D stylisé, éclairage chaud, motifs des quatre familles, profondeur. Le **centre de l'écran demeure la zone d'intérêt** (rival, Primaires, choc et verdict), jamais masquée durablement par le HUD.
- **Vue B, manipulation inclinée** : table et cases exploitables, main et carte déplacée au premier plan, rival toujours perceptible (ou portrait vivant), continuité artistique avec A.
- **Plateau clair** : zone Primaire et deux Secondaires de chaque camp identifiables, volumes de cartes et cibles suffisamment grands. Ne surcharge pas le sol, les runes, bannières ou particules au détriment des choix.
- **Cartes** : conserver et raffiner la galerie procédurale existante, silhouettes et couleurs des quatre familles, emblèmes, rangs/∞, Puissance, rareté. Ne pas redessiner toutes les cartes sans nécessité ; améliorer contraste, typographie et taille.
- **Style d'interface** : modules fins sombres et bordures dorées, PV colorés, labels et actions hiérarchisés, éléments lisibles ; des icônes/motifs permettent de distinguer les informations indépendamment de la couleur.
- **Rendu 100 % Art by Code** : la référence PNG est une **cible de revue, un document**, jamais une image de fond affichée dans le runtime. Génère géométrie, textures, lumières, matériaux, sprites et animations par Three.js, Canvas, SVG, CSS/GLSL. Aucune copie d'asset externe ; graines art/gameplay indépendantes.
- **Ne reproduis pas les chiffres ou légendes incohérents que peut contenir la preview** : l'état réel du duel, ses valeurs, le Rang, les noms de cartes et les résultats proviennent exclusivement du moteur. Reproduire la composition, pas des erreurs textuelles illustratives.

**Exigence de réception :** présenter côte à côte pour chaque vue un extrait recadré de la preview validée et une capture **réelle du build**, avec une liste factuelle des écarts restants. Une image IA décorative ou une reconstruction Photoshop ne vaut pas capture runtime.

### 2 — HUD joueur : correction prioritaire, symétrique au rival

Le HUD joueur M02, en bande longue à travers l'écran, est **rejeté**. Remplacer par un **module compact de même famille visuelle que celui du rival** :

- **HUD rival** : en haut à gauche, affichant identité, famille/symbole, PV actuels/max, Insight (0–2), tailles main/pioche/défausse, statut et accès aux informations autorisées.
- **HUD joueur** : **en bas à gauche**, sous forme d'une carte/panneau autonome de proportions et de design semblables, **avec portrait ou emblème du joueur**, « Vous », PV, Insight, tailles main/pioche/défausse, et accès discret aux Techniques équipées. Il ne doit **pas traverser horizontalement** la scène ni recouvrir le centre du plateau.
- **Main du joueur** : centrée au bas de l'interface, distincte du HUD, cartes bien dimensionnées, inspection/zoom et glisser-déposer, gestion d'une main pouvant dépasser 4 temporairement selon règles.
- **Commandes du tour** : panneau compact en marge droite ou en périphérie basse, séparé du HUD et des cibles ; ne doit pas masquer une carte, un visage, le centre de confrontation ni une zone de dépôt.
- **Journal** : accessible via panneau latéral rétractable ou contrôle contextuel, et non colonnes permanentes occupant une part excessive de la scène. Préserver le texte intégral vérifiable et les aspects public/privé ; pendant la résolution, un bandeau local bref explique l'étape courante.
- **Mobile 390×844** : présentation adaptée, panneaux compacts, overlays repliables, portrait rival toujours accessible, gestes sûrs. Aucun chevauchement de la main, des boutons et des slots. Ne pas simplement réduire tous les éléments de desktop jusqu'à l'illisibilité.
- **Variantes 1280×720, 1920×1080** : le centre reste libre, l'interface résiste au zoom A-/A+, longues traductions et état de 2 Secondaires actives.

**Interdiction fonctionnelle :** aucun re-render global au milieu d'un glisser ou d'un pointerdown ; conserver la sélection et le focus clavier lors des transitions A/B. Priorité à une mise en page réactive qui n'altère pas les hitboxes sous le curseur.

### 3 — Identité de posture : ASSAUT / GARDE dans toutes les scènes de Clash

Un joueur doit identifier d'un coup d'œil le mode **de chaque Primaire déjà révélée**, **sans dépendre de la couleur de famille** :

- **ASSAUT** : bandeau/étendard **rouge-orangé** textuel « ASSAUT » + signe de pointe/élan ; impulsion lumineuse directionnelle, silhouette d'attaque.
- **GARDE** : bandeau/étendard **bleu** textuel « GARDE » + signe de bouclier/ancrage ; maintien stable et halo défensif.
- Afficher ces marqueurs sur les cartes de Clash, en vue A comme B, dans les gros plans et pendant toutes les étapes de résolution. Prévoir tailles et contrastes adaptatifs et un texte accessible.
- **Secret canonique** : le mode de la Primaire adverse NE DOIT PAS devenir visible avant sa révélation officielle ; dans la micro-fenêtre Lecture, ne dévoiler qu'aux joueurs concernés **l'information autorisée**, pas le résultat final ni l'identité d'une Primaire encore secrète. Ne jamais inférer le mode par un tell de l'avatar.

### 4 — Nouveau contrat de motion design : les cartes S'AFFRONTENT

Ajouter une **chorégraphie d'impact procédurale** à la résolution existante. Le Clash doit se lire visuellement et physiquement : lancement, collision ou défense, résultat. Les cartes peuvent être animées comme copies de représentation (overlay DOM/CardSprite Three.js), sans détacher les cartes réelles du moteur ni modifier la logique de leurs zones.

**Séquence publique canonique** : révélations des Primaires → choix tactiques des Secondaires révélés → Interférences résolues → Rang/priorité/issue → action cinétique appropriée → dégâts/absorption/effets/Insight/Repoussement/destinations → nettoyage. **La chronologie métier n'est pas modifiée par cette scénographie.** Pour les actions simultanées, ne pas créer un ordre de dégâts apparent qui en change le sens.

#### A. ASSAUT contre ASSAUT

- Les deux Primaires s'inclinent légèrement vers l'avant, chargent l'une vers l'autre, **collision centrale** avec flash bref, onde choc localisée et rebond/inertie. L'écran n'est jamais secoué au point de rendre les cartes illisibles.
- **Priorité différente** : celle qui domine tient le centre quelques instants, l'autre recule/vacille, rétrécit et s'efface vers sa destination visuelle. Montrer les dégâts autorisés. Le gagnant n'est visible en héros **que temporairement** avant son propre nettoyage.
- **Égalité de Rang** : les deux frappent et infligent leurs dégâts **simultanément** ; aucun gagnant fictif, impact symétrique, possible double K.-O. avec prolongation 1 PV. Aucune disparition « carte perdante » puisqu'il n'y en a pas.

#### B. ASSAUT contre GARDE

- L'Assaut prend de la vitesse en direction d'une Garde déjà **ancrée** ; au contact, effet bouclier procédural, petit recul, vibration visible de la Garde.
- **Garde gagne au Rang (égalité incluse)** : la Garde **s'agrandit légèrement**, se raffermit et projette une onde de recul qui repousse l'Assaut ; dégâts 0 et Repoussement éventuel d'une Secondaire cachée **uniquement si autorisé**. Montrer « GARDE VICTORIEUSE ».
- **Assaut gagne au Rang ET inflige des dégâts positifs** : le bouclier cède visiblement (sans confondre avec l'annulation d'une Interférence), la Garde s'affaiblit ; impact de PV ensuite. Mettre la carte gagnante momentanément en valeur.
- **Assaut gagne au Rang MAIS inflige 0 dégât** parce que la Puissance de Garde absorbe : l'Assaut **gagne bien au Rang** mais bute sur le bouclier qui absorbe complètement ; la Garde peut trembler et rester intacte. Afficher clairement « VICTOIRE AU RANG / 0 BLESSURE / ABSORPTION », **ne jamais animer une victoire de Garde ni un Repoussement Basic dans cette situation**.
- **Signature ∞** : priorité de rang inchangée ; Puissance d'absorption de la Garde toujours applicable. La spectacularisation de ∞ n'ajoute aucun dégât ni aucune priorité.

#### C. GARDE contre GARDE

- Brève tension/maintien, deux halos contenus puis retrait neutre : **aucun gagnant, aucun dégât, aucun Repoussement**.

#### D. Sort des cartes et règles de nettoyage

- **Carte perdante** lorsqu'il existe une priorité gagnante : recul, légère contraction et fondu, avec persistance assez longue pour lire sa valeur et son état ; carte victorieuse légèrement mise en avant **avant le nettoyage**.
- **IMPORTANT : les deux Primaires sont consommées et rejoignent leur destination canonique après le Clash, même la gagnante.** L'image d'un « vainqueur qui reste seul » n'est qu'une **pose de victoire transitoire**, pas une permanence de carte sur le plateau. Les Secondaires suivent strictement les destinations du moteur (Conserver, consommation, retour en main, dessus/dessous de pioche, etc.).
- Les cartes affectées par une Interférence affichent **ANNULÉ** et cessent de produire leur soutien ; ne pas animer un multiplicateur qui a été contré. Un changement de Rang avec affinité doit être montré comme bonus, sans modifier la Puissance.
- En double K.-O., appliquer la prolongation simultanée à 1 PV chacun, pas un faux écran de victoire. En cas de Garde contre Garde, aucun trophée de victoire.

#### E. Architecture des animations

- **Réutilise le séquenceur M02** `src/presentation/beats.ts` : ajouter des intentions de motion **dérivées des événements publics**, de `ClashReport` et des modes révélés. Un `ClashMotionDirector` (nom libre), découplé du moteur, projette ces intentions sur clones/sprites DOM/Three.js.
- Ne duplique jamais `computeClash` pour savoir qui gagne. La **source de vérité** est le résultat résolu du moteur ; l'animation ne change ni PV, ni RNG, ni cartes, ni temps d'un vrai tour.
- Prévoir **normal / rapide / instantané / mouvement réduit**. Le mouvement réduit conserve l'ordre et la lisibilité des résultats avec étapes statiques ou fondus discrets ; les commandes « Passer » / « Tour suivant » ne doivent pas être bloquées par une animation.
- Nettoyage des copies temporaires après passage/saut/retour de phase, aucun élément fantôme ou WebGL resource leak. Éviter de régénérer des textures à chaque frame ; animer par transforms/uniforms. Maintenir la continuité des caméras et des HUD. Prévoir un feedback de dégâts localisé sur le HUD concerné.

### 5 — Ordre de production recommandé (autonomie M03)

**P0 / lecture et baseline** : noter branche/HEAD, comparer la capture M02 et la preview validée à échelle réelle, relever les écarts de composition ; relancer les tests existants. Remonter uniquement les conflits normatifs qui bloquent réellement.

**P1 / composition et HUD (première priorité)** : remplacer bande HUD joueur par module bas-gauche proche du rival, déplacer main/commandes/journal sans perdre les interactions. Produire des captures desktop et mobile. Contrôler l'espace central libre et l'accessibilité.

**P2 / posture de cartes** : bandeaux ASSAUT/GARDE, légende, symboles, états visibles uniquement après révélation ; tests de non-fuite.

**P3 / motions de Clash** : AA, AG (3 issues), GG, Signatures, égalité, double K.-O., Interférences et départs à la défausse ; séquenceur piloté par les événements, avec interruption et trois modes de vitesse + mouvement réduit.

**P4 / polishing mesuré** : fluidité A/B, présence du rival, contre-jeu visuel des cartes, performance navigateur. Éventuellement compléter la **QA UI Rupture/Dissipation** proposée après M02 par deux scénarios déterministes, si elle n'est pas déjà faite, sans repousser le livrable principal.

**P5 / QA et réception** : tests, navigateur, screenshots de comparaison, ADR, journal, rapport honnête, livraison en branche sans fusion.

L'agent peut répartir le travail en passes autonomes, mais **la correction du HUD et la fidélité de la composition sont prioritaires sur les FX spectaculaires**. Ne termine pas sur une documentation non implémentée.

### 6 — Matrice d'acceptation : à prouver avec de vrais builds

1. Visuellement, HUD adverse **haut-gauche** et HUD joueur **bas-gauche**, de styles comparables, avec PV/Insight/main/pioche/défausse et portrait/identité ; **aucune large barre HUD traversant la zone centrale**.
2. Main du joueur et commandes accessibles en A/B ; plateau, visage rival, cartes et issue lisibles, notamment à 1280×720 et 1920×1080. Mobile 390×844 sans débordement critique ni perte de ciblage.
3. **ASSAUT/GARDE** textuels + formes/symboles contrastés sur **chaque Primaire révélée**, simultanément aux informations autorisées. Aucun leak d'une Primaire encore secrète ou d'une Technique privée.
4. AA priorité différente : animation de charge, impact, perte et sortie temporaire du vaincu ; gagnant ensuite défaussé selon moteur.
5. AA égalité : frappe **simultanée**, aucun faux gagnant, blessures simultanées et éventuelle prolongation correctement indiquée.
6. AG Garde gagnante : Assaut repoussé ; AG Assaut gagnant avec blessure : absorption franchie, PV diminués ; AG Assaut gagnant **sans blessure** : bouclier absorbe entièrement, victoire de Rang expliquée **sans montrer une victoire défensive**.
7. GG : neutralité sans gagnant ni blessure ; ∞ et deux soutiens valides conformes ; effets annulés visuellement annulés.
8. Le séquenceur reste synchronisé aux événements. Tout saut, accélération, interruption ou changement de vue nettoie les clones et n'altère ni la simulation ni la main. Boutons et focus non perdus durant les transitions.
9. Duels complets en QA navigateur **desktop souris drag, desktop clic, clavier, mobile tactile**, avec console propre, invariants et absence de fuite d'informations. Inclure scénarios déterministes d'animation pour AA gagnant, AA égalité, AG absorption totale, AG Garde gagnante, AG blessure positive, GG, double K.-O., Interférences.
10. `npm run typecheck`, `npm test`, `npm run build` et QA exécutés ; produire preuves sur un **SHA source donné**. Mesures GPU réel seulement si disponible ; distinguer SwiftShader/CPU de performances GPU. Tester absence de régression touch/drag et le mode mouvement réduit.
11. Captures runtime **avant / après / preview cible** en vue A et vue B, résolution AA et AG dans toutes les issues, états des secondaires, HUD compact et mobile ; joindre un rapport d'écarts résiduels visibles et un verdict honnête.
12. `JOURNAL.md` actualisé (succès, corrections, échecs, causes et suites), ADR de mise en scène/motion, diff/commit de la branche et recommandations limitées pour le prochain lot. **Aucune fusion dans main sans accord.**

### 7 — Garde-fous et différés

- Conserver règles **V3.0 + delta V3.2** : 17 cartes, 16 variantes, 4 Signatures, +1 affinité Rang, Insight 0–2, effet d'Interférence et chronologie. Le rendu ne détermine jamais le gagnant et ne révèle pas de secret.
- La galerie procédurale actuelle est un acquis : la préserver et la raffiner, pas la remplacer par une image fixe ou une bibliothèque de sprites téléchargés.
- Pas de nouvelle mécanique de Sang-froid, de tells fiables, de bluff informatif, de tours ou statistiques ; pas de ville complète ; pas de refonte du moteur IA sauf correctif critique révélé par les tests.
- La preview est la **référence de présentation approuvée** et non un asset runtime ; la fidélité est jugée sur **hiérarchie, placement, contrastes, cadrages, proportions et identité des actions**, adaptés au vrai gameplay.

### 8 — Retour attendu

Commence par un diagnostic court indiquant **ce qui ne respecte pas encore l'image**, puis engage immédiatement la correction du HUD et du plateau. Produis ensuite les animations de Clash en code. Livre un build jouable, des captures comparées, la preuve des modes ASSAUT/GARDE, les tests et le rapport M03. Demande un arbitrage uniquement si une contradiction de règle empêche le travail. Le résultat doit ressembler fidèlement à notre preview validée **et raconter le choc des cartes**, tout en conservant une expérience fluide, accessible et honnête.