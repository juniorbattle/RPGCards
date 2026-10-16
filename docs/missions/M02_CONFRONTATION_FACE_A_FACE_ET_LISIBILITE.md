# Mission M02 — Confrontation face à face, mise en scène des tours et première psychologie visuelle

**Projet :** Les Quatre Voies / RPGCards — Three.js + TypeScript + Vite.  
**Responsable :** opérateur du projet.  
**Point de départ :** MVP M01 sur `claude/jolly-keller-w17gmp`, dernier état connu `9eef5ac`.  
**Statut :** **mandat de développement approuvé pour M02**, sans modification des règles du duel.  
**Livraison :** une tranche verticale jouable et testée, avec captures et journal, sur une branche de travail dédiée dérivée du MVP M01. **Ne pas fusionner dans `main` sans autorisation.**

## 0. Lecture obligatoire et état de départ

Avant tout audit ou code : lire `AGENTS.md`, `JOURNAL.md` (notamment la dernière passe, « À reprendre » et « Principes à garder »), `CLAUDE.md`, `contracts/`, `source/CONTRAT_REGLES_V3_0_HISTORIQUE.md`, le delta `contracts/02_CONTRAT_GAMEPLAY_DELTA_V3_2.md`, les ADR 001–005, `docs/RAPPORT_CONFORMITE_M01.md`, la QA M01 et les captures existantes. Vérifier branche, HEAD, statut Git, outils et tests au démarrage. Partir **du code réel du MVP M01**, et non reconstruire depuis le simulateur. Les résultats M01 (60 tests, 4 duels UI, 27 captures) sont l'état **rapporté** ; réexécuter les vérifications nécessaires.

Faire un diagnostic court et un plan, puis **implémenter** avec autonomie. Ne pas terminer sur une simple note d'architecture. Le moteur métier reste indépendant de Three.js et du contrôleur de caméra.

## 1. Intention de jeu nouvelle et approuvée

Le duel n'est plus présenté comme deux plateaux isolés : **le joueur affronte un autre personnage visible, de face, à travers une table ou un espace de duel**. Le visage, le buste et la posture du rival doivent pouvoir être observés aux moments où le joueur choisit ou anticipe. C'est une exigence de l'expérience, pas une illustration décorative.

Deux cadrages complémentaires :

- **A — CONFRONTATION : défaut principal du duel.** Vue frontale / perspective HD-2D ou 2.5D permettant de voir clairement le rival (visage et buste), avec une zone de cartes utilisable, informations essentielles et feedback de Clash.
- **B — MANIPULATION : vue inclinée vers les cartes, tilted top-down.** Accent sur lisibilité, zones de pose, inspection, préparation des Secondaires, choix et ciblages. La présence du rival demeure via cadrage partiel ou **portrait vivant persistant** si le visage sort du champ.

**Le défaut M01 `cam=tilted` est remplacé par A pour le jeu normal** ; B reste une vraie vue de travail, non un gadget. Garder une option de comparaison / contrôle manuel pour QA, sans en faire la mécanique de jeu.

Ne pas construire toute la ville ni verrouiller modèles de personnages, palette, décor, focale et valeurs de caméra définitifs. Réutiliser la scène Three.js procédurale comme base en la simplifiant si elle masque les cartes. Ne pas copier les décors, assets ou caméras de RPG-ArtByCode.

## 2. Orchestration par phase (contrôleur de présentation, non moteur de règles)

Développer un `DuelPresentationDirector` (nom libre) déterministe du point de vue du **déroulement visible**, qui consomme phases et événements autorisés, non l'état secret brut. Les caméras et animations ne modifient jamais score, IA, priorités, deck, RNG gameplay, ni timing du calcul métier.

Chorégraphie cible :
1. Début de tour / attente : A confrontation ; possibilité d'observer le rival.
2. Préparation, révélation volontaire de Secondaires, placement d'une Primaire et d'une nouvelle Secondaire : B inclinée, cartes et slots maximisés.
3. Engagement verrouillé : retour doux vers A pour montrer le rival et l'attente ; aucune donnée de main ou d'intention cachée ne fuit.
4. Révélation simultanée des Primaires : A, les deux Primaires restent nettement visibles ; réaction du rival.
5. Fenêtre tactique **après révélation des Primaires** : A privilégiée pour observer le rival ; Secondaires actives, choix Conserver/Rang/Dégâts/Interférer et ciblage restent **faciles et lisibles**, via overlay stable / cadrage hybride ou transition vers B **demandée par le joueur**. Le joueur garde toujours un accès direct au visage du rival, même si B est nécessaire.
6. Résolution : A, événements montrés en ordre lisible, avec focalisations légères et retour au visage.
7. Fin / tour suivant : A et réaction au résultat.

**Ne jamais imposer un mouvement à chaque clic / survol.** Les grands mouvements sont liés aux phases ; micro-focalisations pendant l'inspection seulement si elles n'altèrent ni précision du pointeur ni orientation. Un drag commencé ne doit pas subir de caméra ou reflow inattendu. Garder le DOM interactif stable, sans faire perdre le focus clavier. Autoriser un retour ponctuel vers le visage avant validation d'un choix sans abandonner la sélection en cours.

Transitions fluides, interpolées et interruptibles avec nouvelles phases, pas de flashes / occultations ; privilégier des durées calibrées par QA plutôt qu'un chiffre dogmatique. Avec `reducedMotion=1`, passer d'une vue à l'autre immédiatement ou avec un fondu discret accessible. Réduire la fréquence des mouvements sur mobile si besoin.

## 3. Rival procédural expressif — fondation psychologique, pas nouvelle règle

Créer **un système génératif paramétrique réutilisable** pour représenter un adversaire de face (au moins tête et buste) dans l'arène Three.js. Ressources exclusivement **art by code** : Canvas / sprites générés / primitives Three.js / shaders ciblés, sans textures externes, modèles, banques de visages ou polices téléchargées.

Minimum : silhouette, tête, traits lisibles (yeux/sourcils/bouche), posture, animation idle, clignement, orientation du regard, engagement d'une carte, réactions distinctes au Clash (Garde victorieuse, perte de PV, Interférence, victoire/défaite). Support d'une graine artistique et d'au moins **trois personnalités visuellement comparables**, sans promesse d'une grande population de PNJ dans M02.

**Important — règle de secret :** les réactions expressives de base sont déterminées par personnalité, événements **déjà publics**, PV publics et animation seedée. Elles n'accèdent pas aux choix secrets de main/Primaire/Secondaire de l'IA. Ne pas coder en douce un sourire signifiant « Assaut » ou une grimace signifiant « Garde » avec fiabilité prévisible. **Les vrais tells psychologiques, le bluff et une éventuelle nouvelle mécanique de Sang-froid sont explicitement différés.** On peut préparer des interfaces/types documentés et un prototype isolé non canonique, mais aucun effet mécanique ni information secrète supplémentaire en jeu standard sans contrat approuvé.

La présence du personnage est **prioritaire aux détails de décor**. Priorité à une silhouette lisible, animation stable, contraste, distance, regard et expression ; pas à une prouesse d'ombrage.

## 4. Mise en scène claire du Clash et lisibilité du plateau

Implémenter un séquenceur visuel **piloté par les événements métier résolus** (jamais par recalcul graphique) :
- révélation des choix tactiques réellement autorisés ;
- Interférences et annulations, sans confondre soutien annulé et soutien efficace ;
- score de Rang avec bonus d'affinité, priorité `∞` et issue de confrontation ;
- différence Puissance Assaut/Garde et absorption, explication explicite des **0 dégâts malgré victoire de Rang** ;
- blessures, soins, Insight, Repoussement et destinations des cartes ;
- fin de tour / prolongation 1 PV après double K.-O.

Afficher **un enseignement principal à la fois**, avec détails accessibles à la demande. Conserver le journal complet filtré public/privé mais l'aérer, réduire les badges concurrents, mieux hiérarchiser les PV/Insight/scores. Éviter qu'un effet GPU masque les textes, une carte ou le rival.

Les cartes doivent rester manipulables par **clic, drag/drop souris/tactile et clavier** pendant toutes les fenêtres légales ; préserver inspection agrandie, actions contextuelles, choix de cibles, annulation avant verrouillage, et rappel visuel CHARGEMENT / RÉSERVE CACHÉE / ACTIVE. Les zones du rival et du joueur doivent être reconnaissables en vue A et B, même en 1280×720 et mobile.

Proposer rythme normal, rythme rapide, et mouvement réduit / raccourci d'animation **sans changer aucune issue métier**. Ne pas laisser une animation bloquer une commande valide ; si une interaction doit attendre la fin d'un feedback, afficher cette attente clairement.

## 5. IA tactique (secondaire à la caméra et la lisibilité)

Après le noyau visuel : augmenter progressivement l'IA avec **mémoire des seules informations qu'elle a légalement observées**, et 2–3 profils de décision réellement différenciés (agressif, prudent, lecteur/interférent). La personnalité tactique et la personnalité visuelle doivent être cohérentes, mais sans mettre dans la vue publique les secrets utilisés par l'IA.

Écrire un test de non-omniscience étendu : changer **uniquement** la main ou l'engagement privé du joueur ne doit pas changer la décision de l'IA ou la réaction faciale visible à informations publiques identiques (avant révélation). La dimension « tell » restera future.

## 6. Correctifs de conformité issus de M01 (sans refonte des règles)

Conserver le **contrat V3.0 + delta V3.2**, y compris le bonus +1 de Rang même famille et toutes les limites Insight/Secondaires/Signatures. ARB-003 (Emprise + Rupture = un seul Repoussement) découle du contrat et doit rester respecté.

La **Dissimulation** ne doit pas effacer rétroactivement une information connue, et **la famille reste visible par défaut** au titre du §13.2, tant qu'un camouflage de famille n'est pas explicitement ratifié. Ajouter les tests correspondants.

L'ADR 004 liste d'autres arbitrages **encore proposés** : visibilité des Techniques/Signature du rival, instantané Sondage/Recentrage, interactions Silence/Repoussement. Les isoler, documenter leur statut et proposer les solutions ; **ne pas transformer automatiquement les propositions de la revue M01 en règles définitivement ratifiées**. Remonter seulement les vrais arbitrages bloquants ; poursuivre le chantier visuel et UX autrement.

## 7. Ordre d'exécution, autonomie et portes de réception

**P0 :** audit de l'état de la branche, baseline de tests, corrections de conformité non ambiguës, ADR caméra/vues.  
**P1 :** cadrages A et B + présentation dirigée par les phases + UI stable et observable ; premier screenshot front avec personnage.  
**P2 :** génération d'un rival expressif paramétrique + au moins trois variations de personnalité + états de réaction.  
**P3 :** séquenceur Clash + refonte hiérarchie carte/effets/journal + mobile et réduction des mouvements.  
**P4 :** QA navigateur approfondie (dont Techniques non exercées M01), IA à mémoire limitée/profils si la base reste stable, optimisation fondée sur mesures.  
**P5 :** revue visuelle réelle et finalisation d'un MVP M02 démontrable.  

**Autonomie autorisée :** enchaîner P0–P5 sans validation intermédiaire pour les décisions de programmation et les essais visuels temporaires, dans la limite des contrats. Stopper pour une modification de mécanique ou une nouvelle norme de tells ; ne pas finir par un plan non exécuté. Gérer temps et ressources : mieux vaut une tranche frontale/expressive/Clash complète et solide qu'un monde décoratif incomplet.

## 8. Acceptance mesurable

1. `npm run typecheck`, `npm test`, `npm run build` passent après changements ; scénario navigateur de **duel entier** vérifié (souris, clavier, tactile).
2. Dès l'entrée du duel, la caméra A montre clairement **le visage et le haut du corps du rival** ; le plateau, PV et carte Primaires restent lisibles.
3. La préparation et les manipulations affichent B, avec placement direct et révélation volontaire ; le rival reste consultable par portrait/insert ou changement contrôlé non perturbateur.
4. Après révélation des Primaires et au choix tactique des Secondaires, retour à A **sans perdre** inspectabilité, cibles, boutons et retour visuel des interactions.
5. Les transitions A↔B sont reproduites au cours de **plusieurs tours complets** ; aucun clic/drag/focus perdu par changement de caméra ou re-render.
6. Au moins **trois profils visuels** (seeds/personnalités) du rival et au moins **cinq réactions** distinctes, déclenchées sur événements publics ; démonstration vidéo courte ou série de captures.
7. Clash séquencé : Interférences → Rang → absorption/dégâts → conséquences ; cas Cendre III + Cendre I Rang vs Cendre IV Garde (5/4 et 0 dégât) lisible sans ouvrir le journal complet.
8. Les secrets du joueur ne changent ni la réaction faciale pré-révélation de l'IA, ni ses décisions tant qu'ils ne sont pas légalement visibles ; test automatisé.
9. Captures **frontale début**, **inclinée préparation**, **frontale tactique**, **résolution**, **réactions du rival**, **desktop 1280×720/1920×1080**, **mobile 390×844**, et état mouvement réduit. Seed et commit consignés ; aucun débordement textuel critique.
10. Performances : mesures séparées CPU JS et GPU si disponible ; pas de chiffre FPS représentatif prétendu sur SwiftShader seul, aucune regénération art coûteuse par frame, vérifier stabilité UI et géométrie d'interaction.
11. Mise à jour de `JOURNAL.md` (succès, échecs, leçons, à reprendre), ADR et rapport M02 ; SHA, captures, tests exacts, limites. Ne pas fusionner `main`.

## 9. Hors périmètre

Pas de construction de la ville, progression et économie RPG, personnages entièrement produits à grande échelle, cinématiques ambitieuses, caméra finale verrouillée, nouvelle ressource Sang-froid, nouveau système de tells informatifs, modification du Rang / Insight / Interférences ni assets importés d'autres projets.

## 10. Premier retour attendu

Fournis **un diagnostic bref** de M01 et des risques M02, une architecture de présentation (deux vues + avatar + séquenceur), puis **commence immédiatement l'implémentation**. À la fin, fournis un MVP M02 vérifiable, les captures comparatives, les tests/rapports, l'ADR et le journal mis à jour. Le résultat doit donner l'impression de **faire face à un rival qui joue avec nous**, pas de regarder deux rangées de cartes.