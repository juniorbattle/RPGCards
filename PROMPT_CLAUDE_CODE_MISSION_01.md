# PROMPT DE DÉMARRAGE — CLAUDE CODE — LES QUATRE VOIES / MISSION 01

## MANDAT ACTUALISÉ — M01 AUTONOME / THREE.JS / MVP (15 octobre 2026)

**Ce mandat récent complète et prévaut sur les anciennes formulations de mission relatives à la stack, au rythme de livraison et aux explorations visuelles. Il ne change aucune règle de gameplay.** Le dépôt **`juniorbattle/RPGCards` existe déjà** ; le kit M01 a été importé sur `main`. Il ne faut pas recréer le dépôt ni attendre un autre ZIP.

### Résultat attendu : produire rapidement un vrai MVP

Tu disposes d'une **large autonomie de réalisation** : inspecte, organise le dépôt, configure le runtime de production, implémente une première boucle jouable complète, améliore le rendu, teste et corrige sans demander une autorisation à chaque sous-lot. Fournis une **brève analyse initiale**, puis **implémente effectivement**. Ne termine pas la mission après un plan, une pile de fichiers vides ou un simple prototype statique. Enchaîne Lot 0 → moteur → UI → art procédural → QA tant que les critères sont atteints. Produis un MVP jouable au plus vite et améliore ensuite, plutôt que d'attendre une infrastructure parfaite.

**Stack de production obligatoire : Vite + TypeScript strict + Three.js.** Three.js porte la **scène et la mise en scène du jeu** (au minimum plateau/arène procédurale, caméra, géométrie/lumières/FX rudimentaires). Le moteur du duel est une bibliothèque **TS pure et indépendante du rendu**. Le HUD et les cartes, qui nécessitent clic, survol, drag & drop, tactile, navigation clavier et forte lisibilité, peuvent et devraient employer **DOM/CSS/SVG/Canvas 2D superposé** au canvas Three.js. N'impose jamais un raycasting 3D compliqué si une interaction HTML accessible est meilleure. Pas d'art externe : créer motifs, textures, géométrie, emblèmes et animations par code et par graines reproductibles.

### Liberté de réalisation et limites

- Autonomie pour architecture, découpage de modules, outils QA, patterns Three.js, UI, styles procéduraux provisoires et priorisation des corrections. Consigner les choix importants dans `docs/adr/` et `JOURNAL.md`.
- **Aucun changement silencieux** aux règles V3.0 + delta V3.2 : 17 cartes, phases, secret, Insight 0–2, 16 variantes, 4 Signatures et Interférences. Toute ambiguïté bloquante est isolée, testée, puis soumise à arbitrage ; ne suspendre tout le travail que si elle empêche vraiment la tranche suivante.
- Le MVP doit démontrer la **boucle humaine contre IA de bout en bout** : préparation, placement direct des Primaires/Secondaires, révélation, choix contextuels simultanés, Clash, PV, journal et fin de partie. L'IA n'observe pas les choix secrets. Des raccourcis de contenu temporaires peuvent être utilisés **uniquement s'ils sont identifiés comme tels** et ne falsifient pas les tests de conformité. Les capacités non finies sont des écarts, jamais des fonctionnalités annoncées.
- Toute nouvelle capacité visuelle est produite par code : générateurs de cartes des quatre familles, raretés, états chargement/caché/actif, Signatures, plateau simple et animations de résolution. Seeds gameplay/art indépendantes ; UI sans `select` pour jouer.
- La production initiale se déroule sur **une branche de développement** ; `main` contient les documents de départ et n'est pas modifiée par Claude Code sans nouvel accord explicite. Ce mandat **ne demande aucune fusion automatique**.

### Orientation HD-2D de l'environnement — seulement si tu l'abordes

Tu peux esquisser un environnement minimal procédural pour soutenir le duel, **sans bâtir la ville complète ni verrouiller la direction artistique**. Deux familles de caméra/lecture sont autorisées comme pistes exploratoires :

1. **Vue de dessus inclinée — tilted top-down** : perspective oblique, lecture des surfaces et personnages par le dessus, profondeur maîtrisée.
2. **Perspective frontale 2.5D** : présentation plus frontale, couches de profondeur, sprites/objets procéduraux dans un espace 3D.

Choisis une **caméra provisoire** adaptée à la lisibilité du duel et consigne en ADR pourquoi ; éventuellement compare deux vues par captures. N'importe ni les caméras A/B/C/D, ni le décor du quartier marchand, ni les shaders ou la palette de `RPG-ArtByCode`. Le plateau de cartes reste lisible et prioritaire quel que soit l'angle. Le design définitif, l'exploration de la ville et les décors ambitieux restent hors du premier MVP.

### Définition de sortie du premier MVP

- `npm install`, `npm run dev`, `npm run typecheck`, `npm test`, `npm run build` réellement utilisables et résultats consignés ;
- première partie de duel jouée **jusqu'à une issue**, avec UI click-to-place et drag/drop, actions directement sur les Secondaires, état des cartes évident, informations cachées protégées et adversaire IA ;
- scène Three.js réellement affichée, avec au moins plateau/arène élémentaire et visuels procéduraux **sans téléchargement d'assets** ;
- journal et règles compréhensibles, tests critiques (dont Cendre III P9 + Cendre I Rang contre Garde IV P12 → victoire au Rang 5/4 mais 0 dégât), captures navigateur sur plusieurs tailles, seeds reproductibles ;
- `JOURNAL.md` mis à jour, ADR, rapport d'écarts honnête, commit et captures ; distinction explicite entre **MVP jouable**, **conformité gameplay intégrale** et **RPG complet**.

**Conduite attendue :** un bref diagnostic initial, puis du code, des tests et des captures. Aucun jalon de validation intermédiaire n'est exigé tant que tu restes dans ces contrats. Arrête-toi uniquement devant un arbitrage de gameplay nécessaire, une limite d'accès, ou au terme d'une passe démontrable et vérifiée.

---


Tu es l'**agent maître de production** chargé de développer **Les Quatre Voies** dans le dépôt GitHub **RPGCards**, déjà initialisé, un RPG de cartes dans une ville évolutive, dont le noyau est un jeu de duel tactique original déjà défini dans nos contrats. Tu dois maintenant commencer **l'implémentation concrète** du futur jeu : architecture de production, moteur fiable, interface directe/manipulable et première grammaire visuelle procédurale. Ce n'est pas un exercice d'idéation ou un simple prototype statique.

## 0 — Contrôle initial et protocole de lecture (OBLIGATOIRE)

Le package M01 est déjà intégré **à la racine du dépôt RPGCards sur `main`**. Lis, dans cet ordre :

1. `AGENTS.md` et `JOURNAL.md` (en particulier « À reprendre » et « Principes à garder ») ;
2. `contracts/00_GOUVERNANCE_AUTORITE.md` ;
3. `contracts/01_CONTRAT_MAITRE_PRODUCTION.md` ;
4. `contracts/02_CONTRAT_GAMEPLAY_DELTA_V3_2.md` ;
5. `source/CONTRAT_REGLES_V3_0_HISTORIQUE.md` **intégralement** ;
6. `contracts/03_CONTRAT_ARCHITECTURE_ET_QUALITE.md`, `contracts/04_CONTRAT_ART_PROCEDURAL.md`, `contracts/05_CONTRAT_UX_DUEL.md` ;
7. `docs/PLAN_DEVELOPPEMENT_LOTS.md`, `docs/ARCHITECTURE_CIBLE_PROPOSEE.md`, `docs/MISSION_01_ACCEPTANCE.md` et `qa/MATRICE_REGRESSION_PRIORITAIRE.md` ;
8. Inspecte le simulateur de référence `simulator_ref/simulator/` et lance ses tests comme preuve de départ, **sans considérer son interface actuelle comme référence UX ni son architecture comme architecture de production**.

Inspecte `git status`, branche, HEAD ; n'altère pas `main` ou un dépôt tiers sans autorisation. Crée une branche de mission de type `feature/duel-core-procedural-m01` si c'est possible et nécessaire. Le nouveau projet n'est pas une branche de Cité du Tournoi/RPGThreeJS/RPG-ArtByCode.

**Commence par une synthèse courte avant modification** : état du nouveau dossier, références lues, limites connues, ambiguïtés réelles, architecture recommandée, étapes du lot 01 et points demandant arbitrage. Ne reste pas bloqué sur une longue phase de planification : sauf conflit bloquant, passe ensuite à l'implémentation sur la branche de travail.

## 1 — Référence technique procédurale : RPG-ArtByCode

Tu peux consulter https://github.com/juniorbattle/RPG-ArtByCode (analyse de référence au `main` commit `d7c439b3b08280d7643d8cfe3f658de6ad49b928`). Ce projet établit une **méthode**, pas un transfert de gameplay ou de contenu :

- TypeScript + Vite + Three.js pour la scène de production ; toutes les ressources visuelles (sprites, motifs, géométrie, textures, lumières, shaders) générées par code ;
- génération seedée et reproductible ;
- captures/compare/diff/perf outillées ;
- `AGENTS.md` avec règles techniques, `JOURNAL.md` avec mémoire des essais [OK]/[KO]/[?] et causes ;
- architecture modulaire par responsabilités plutôt qu'un seul générateur monolithique.

**Interdiction de copier mécaniquement** son quartier marchand, ses vues A/B/C/D, ses paramètres de caméra, ses shaders atmosphériques, ses éléments de décor, sa palette nuit indigo/ambre, ses personnages, ses assets ou son code métier. Nous créons un RPG **de cartes différent**. Une esthétique HD-2D est envisagée à terme, mais caméra, décors et direction artistique complète ne doivent **pas** être figés maintenant. Le rendu de duel peut être une arène graphique provisoire suffisamment cohérente pour expérimenter les cartes.

## 2 — Règles : aucune improvisation silencieuse

La référence gameplay est le **contrat V3.0 complet**, modifié **uniquement** sur les points énumérés dans `contracts/02_CONTRAT_GAMEPLAY_DELTA_V3_2.md`.

Rappels incontournables :

- deck **17 cartes physiques uniques**, 16 identités (4 familles × 4 Rangs) + une Signature ∞ exclusivement Primaire ; chaque variante ne crée pas une identité supplémentaire dans un deck ;
- Basic Puissances `3/6/9/12`, Signatures fondatrices : Brasier Originel/Cendre P14, Miroir du Voile P12, Couronne de Ronce P12, Convergence Astrale P13 ;
- main jusqu'à 4 au début de tour ; Primaire Assaut/Garde obligatoire et au plus une nouvelle Secondaire ; **deux emplacements** persistants par joueur ;
- nouvelle Secondaire en **CHARGEMENT** inutilisable au tour de pose ; à T+1 elle peut rester **CACHÉE/INACTIVE** ou être révélée volontairement **ACTIVE/PRÊTE** au début du tour ;
- Primaires dévoilées **simultanément** ; ensuite, et seulement ensuite, choix tactique secret/simultané des Secondaires actives : Conserver / Amplifier le Rang / Amplifier les dégâts (Assaut) / Interférer ;
- **NOUVEAU BONUS RANG :** soutien même famille = rang imprimé +1 pour `Amplifier le Rang` ; le bonus est par soutien non annulé, n'augmente ni sa Puissance ni sa portée d'Interférence ;
- dégâts : sans soutien `M=1`, sinon **somme** des coefficients `rang secondaire +1 si même famille` (exceptions imprimées comme Convergence) ; jamais multiplication des coefficients entre eux ;
- duel A/A égalité = impacts simultanés ; A/G égalité = Garde victorieuse ; Signature ∞ bat rang ordinaire quelle que soit amplification, mais Garde absorbe selon Puissance finie ;
- Interférences en une passe **simultanée**, ciblent des Secondaires **engagées**, comparaison des rangs imprimés ; pas de contre-réaction ajoutée ;
- Insight `0..2`, début `1`, gain max `+1/tour`, 2 Techniques équipées et 1 utilisée par tour, payée avant résultat ; six Techniques conservées ;
- double K.-O. : deux à 1 PV après nettoyage normal, aucun cap artificiel de durée ;
- respect intégral des 16 variantes et de leurs conditions de réussite, des quatre effets de Signatures et de la distribution unique des cartes entre zones ;
- journal détaillant révélations autorisées, scores et soutiens, absorption, modes et impacts réels, sans divulgation prématurée de secrets.

Exemple non négociable : Cendre III Assaut P9 contre Cendre IV Garde P12 : **sans** soutien de Rang, Garde gagne ; **avec** Cendre I active utilisée en Rang, score Assaut 5 contre 4, Assaut domine au Rang mais inflige **0 PV** (absorption P12). Les deux cas doivent apparaître dans les tests et dans le journal public avec les bonnes raisons.

Si une règle est ambiguë, écris une fixture et une note de conflit ; ne fais pas correspondre l'UI à une interprétation non validée en l'appelant canonique.

## 3 — Architecture technique attendue

Propose et crée une architecture **testable, claire, extensible**, avec moteur **pur TypeScript sans rendu**, système de phases, commandes validées, événements normatifs, catalogue de cartes à effets typés, RNG gameplay seedé, vues par joueur, moteur IA et replay déterministe. Une simulation du même match avec animation normale, accélérée ou désactivée doit donner exactement le même état et journal métier.

Tu peux t'appuyer sur Vite + TS (stack du projet méthodologique). Utilise obligatoirement Three.js pour la scène et les FX procéduraux du jeu, **sans imposer la 3D à la surface interactive des cartes**. Un panneau de cartes en DOM/SVG/Canvas 2D peut être la meilleure solution de lisibilité ; le moteur du jeu n'en dépend pas. Le choix d'un framework UI doit être argumenté en ADR et adapté au drag/drop, pas décidé par mimétisme.

Sépare strictement les informations privées : l'IA ne voit pas la main adverse, les choix tactiques non révélés ni les informations réservées au joueur. Les méthodes d'inspection/debug ne doivent pas transformer l'état secret en journal public.

## 4 — Interaction : priorité absolue à la manipulation directe

Je refuse une UI normale où le joueur doit sélectionner ses cartes/combats à l'aide d'une succession de `<select>` ou de champs de formulaire comme dans l'ancien simulateur. Il doit pouvoir :

1. Cliquer une carte de sa main, consulter ses détails, cliquer un emplacement compatible **ou la glisser-déposer** ;
2. Voir le slot Primaire en Assaut/Garde et choisir son mode avant le verrouillage ;
3. Poser une Secondaire cachée et comprendre immédiatement « CHARGEMENT / INUTILISABLE », puis « RÉSERVE CACHÉE / INACTIVE », puis « ACTIVE / PRÊTE » après révélation volontaire ;
4. Après révélation des Primaires, cliquer une Secondaire active et obtenir des actions **contextuelles** (Conserver / Rang / Dégâts / Interférer) avec ciblage direct sur le terrain ;
5. Lire effets, coûts Insight, Puissance, Rang, bonus famille et le motif d'une victoire sans dégâts ;
6. Annuler un placement ou un choix non verrouillé et disposer d'une voie tactile et clavier équivalente.

Surligner les destinations légales, rendre les destinations illégales non droppables avec un message compréhensible, préserver les choix adverses secrets jusqu'à leur fenêtre d'ouverture. Pas de fuite par DOM, IA, log, tooltips, captures et exports publics.

## 5 — Procedural art by code : produire un système, pas un screenshot

Créer une **grammaire visuelle paramétrique** pour les quatre familles, la rareté, l'identité, l'état et les Signatures. Générer par code motifs, icônes, fonds et encadrements (Canvas/SVG/geometry/shaders), sans PNG/3D model/texture/font externes. Utiliser des graines distinctes pour `gameplay` et `art`. Prévoir cache/régénération, mouvement réduit, contrôle du contraste et du coût GPU. Les effets visuels doivent découler des événements de Clash, pas produire eux-mêmes les dégâts.

**Proposer une interface techniquement et visuellement prometteuse dès le premier slice**, mais ne pas consacrer le lot initial à fabriquer une ville 3D, choisir une caméra HD-2D canonique ou verrouiller un style graphique. Les contrats art et UX décrivent exactement cette frontière.

## 6 — Livraison par portes de validation

**LOT 0 :** rapport de lecture/audit, architecture et ADR initiaux, config reproductible.  
**LOT 1 :** moteur de duel TS conforme, tests ciblés du catalogue et scénarios de `qa/MATRICE_REGRESSION_PRIORITAIRE.md`, IA sans triche, seeds/replay.  
**LOT 2 (slice) :** UI jouable directe, première boucle de duel complète contre IA, gestion des phases/cartes et journal clair.  
**LOT 3 (premier habillage léger, enchaîné de façon autonome après un slice jouable) :** rendu procédural des cartes et états, feedback visuel des Clashes, captures des phases, sans direction artistique finale.

Priorise une **tranche verticale exploitable** : il est préférable d'avoir un vrai duel complet avec quatre familles et les interactions correctes que 100 modules incomplets ou des effets d'éclairage sans gameplay. Si tout ne tient pas dans une passe, arrête-toi à un **gate fonctionnel propre** et propose la tranche suivante. Ne pas déclarer complet ce qui est incomplet.

## 7 — QA, scripts et rendu final

Créer réellement et exécuter (dans le nouveau projet) : `npm install`, `npm run dev`, `npm run typecheck`, `npm test`, `npm run build`, plus un flux automatisé de captures navigateur. Pour chaque scénario pertinent, indiquer seed, commandes, résultat attendu/réel. Vérifier desktop 1280×720 et 1920×1080, mobile et interactions au clavier/tactile. Comparer captures et performances seulement sur la même base et la même machine, en précisant celle-ci.

Le dernier exercice de simulateur V3.2 a fourni des tests, mais **ce n'est pas une preuve des nouveaux modules**. Réexécuter le code, écrire des tests indépendants, et signaler les limites (y compris si navigateur headless inaccessible).

**Avant de terminer :** mettre à jour `JOURNAL.md` avec `[OK]/[KO]/[?]`, succès/échecs/causes/prochaines actions ; créer les ADR nécessaires ; produire un rapport d'opérateur : branche SHA, architecture, état exact du jeu, commandes réellement exécutées, captures vérifiables et liste des écarts. Ne pas merger `main` sans mon accord.

## 8 — Format de ton premier retour attendu

A. **État initial et faisabilité**, 5-12 lignes ; compatibilité entre V3.0, delta et simulateur.  
B. **Architecture de production** (modules + responsabilités + rendu recommandé) et ADR à soumettre.  
C. **Plan de réalisation immédiat** lots 0/1/2 + risque majeur et critères mesurables.  
D. **Démarrage effectif dans le dépôt** sur branche isolée, puis tests et screenshots.  
E. **Compte rendu honnête de fin de passe**, fonctionnalités démontrées, manques, captures, `JOURNAL.md`, prochain arbitrage demandé.

**Objectif :** lancer la production de **Les Quatre Voies** de manière autonome et sérieuse. Le jeu de cartes, son anticipation et son interface manipulable priment. L'art procédural est une **capacité de production structurante**, pas une excuse pour réécrire les règles ou figer prématurément le décor/cadrage.
