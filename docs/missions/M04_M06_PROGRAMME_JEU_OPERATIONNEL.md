# Programme M04–M06 — RPGCards opérationnel sur desktop

**Décision opérateur — 16 octobre 2026.** Ce programme remplace les priorités de peaufinage M03.2 ; il ne remplace pas les règles du duel. Référence d'entrée : main au commit 110525d, rapport M03.2, ADR 012. Relire le HEAD réel avant d'agir.

## Cap de production approuvé

L'utilisateur **valide la vue actuelle du duel** : rival visible de face avec visage et buste rapprochés, expressions lisibles, plateau HD-2D, deux caméras pilotées par les phases, HUD rival haut-gauche / HUD joueur bas-gauche, centre libre, esthétique Art by Code et six chorégraphies de Clash. Cette **composition desktop devient notre baseline de production** (voir ADR 013). Elle ne doit pas être refondue pendant les prochains lots. Optimiser les performances **sans réduire significativement la présence, les proportions ou la clarté du rival**.

L'objectif n'est plus une démo du duel mais **un jeu solo local réellement opérationnel de bout en bout** : accueil → préparation du deck/profil → sélection d'un rival / parcours → duel → résultat → progression → nouveau duel → sauvegarde et reprise. Construire une tranche de RPG autonome et répétable, à partir du moteur canonique existant, sans prétendre que la ville complète, l'économie, la narration définitive ou le multijoueur sont terminés.

**Priorité desktop** (1280×720, 1920×1080 ; vérifications d'autres résolutions utiles). Le mobile portrait déjà fonctionnel ne doit pas régresser ; **améliorations mobile paysage explicitement différées**. Pas de nouveau chantier mobile tant que la boucle desktop n'est pas opérationnelle. Les deux vues A/B restent essentielles aux phases du duel ; ne pas redéfinir la caméra.

## Autorité, discipline et autonomie

- Lire AGENTS.md, CLAUDE.md, JOURNAL.md, ce document et les contrats source. En particulier : contrat V3.0 + delta V3.2, contrats d'architecture/UX, ADR 004/009–013, rapports M03.1B/M03.2.
- Suivre la **règle de branche récente** : travailler, tester, puis committer/pousser directement sur main ; pas de branche temporaire, PR, force-push ou rebase des commits publiés sauf instruction ultérieure de l'opérateur. Relire origin/main avant chaque push ; ne pas écraser un travail concurrent.
- Autorisation d'enchaîner M04, M05, M06 de manière **largement autonome** après chaque porte de QA réussie. Fournir un diagnostic court puis coder. Ne pas demander de validation microtechnique à chaque passe. Seuls une règle fondamentale nouvelle, un conflit canonique irréconciliable ou une action externe non autorisée exigent arbitrage.
- Produire un commit par tranche stable avec typecheck + tests + build ; tests navigateur pour toute interaction/présentation. Tenir le journal à jour, avec preuves, échecs et étapes suivantes. Ne pas déclarer fonctionnel un parcours non joué jusqu'à sa fin.
- Par défaut, éviter toute nouvelle mécanique canonique : les 17 identités (16 ordinaires + 1 Signature), les variantes existantes, deux Techniques, Insight 0–2, contraintes de deck, affrontements, secrets, informations adverses et effets sont fixés par le règlement. Un parcours de démonstration, un tableau de rencontres ou des récompenses *de prototype* peuvent être conçus comme données configurables, explicitement NON CANONIQUES ; **pas d'invention d'économie, de monnaies, de raretés, de PV fixes universels ou de nouveaux effets**.
- Tout contenu graphique est procédural par code. Utiliser les modules déjà là ; pas d'importation des décors / cameras / contenus de RPG-ArtByCode. Garder Three.js + TypeScript/Vite ; UI de cartes DOM/CSS/SVG accessible.

## Plan d'exécution autorisé

**M04 — Jeu desktop et boucle de navigation** (contrat docs/missions/M04_INTERFACE_DECK_ET_DUEL.md). Développer une enveloppe de jeu : écran d'accueil, continuer/nouveau parcours, configuration des 17 cartes selon le catalogue réel et deux Techniques, prise en main, gestion des erreurs, sortie d'un duel, résultat et retour. Réutiliser le duel M03.2 tel quel. Une partie complète accessible depuis le menu, rejouable, sans scénario URL. Laisser la configuration legacy QA disponible.

**M05 — Parcours local RPG compact** (contrat docs/missions/M05_RENCONTRES_COLLECTION_ET_SAUVEGARDE.md). Un hub/tableau de rencontres (pas une ville HD-2D définitive), plusieurs rivaux aux personnalités distinctes, succession cohérente de duels, journal de progression, variantes de cartes existantes et système de sauvegarde/reprise versionné. Les choix de récompenses/déblocages doivent rester configurables, provisoires et signalés comme tels, sans perturber les capacités canoniques. Objectif : session de jeu de plusieurs duels avec progression observable.

**M06 — Release candidate locale desktop** (contrat docs/missions/M06_FIABILISATION_ET_ACCEPTANCE_DESKTOP.md). Équilibrer les flux, corriger les blocages, tester les secrets, les sauvegardes, la reprise, la longévité, la performance sur les appareils disponibles, les erreurs, la compatibilité, les transitions et les états de fin. Corriger les régressions et livrer une version démontrable et autonome via npm install/dev/build/preview. Produire une vidéo/captures du parcours complet quand possible.

## Définition précise de « opérationnel »

Le joueur peut démarrer sans URL de QA, créer/reprendre une partie locale, voir ses cartes et son deck légal, choisir un rival, terminer plusieurs duels avec les bonnes règles et les six animations M03, voir les résultats, revenir au hub, progresser dans des rencontres, fermer/réouvrir le navigateur et récupérer **un état valide et cohérent**. Les erreurs de sauvegarde, les états corrompus et les reprises doivent être gérés sans détruire silencieusement les données.

Ce critère est **différent** de « RPG urbain terminé » : la ville explorable, l'économie, les quêtes, le réseau, les véritables tells et le Sang-froid demeurent hors périmètre faute de contrat finalisé. Écrire explicitement les écarts.

## Validation continue et rapports

- Minimum : npm run typecheck, npm test, npm run build, QA navigateur (bout en bout desktop, clavier et aucune fuite de secrets), scénarios Rupture/Dissipation et Clashes non régressés.
- En M06, ajouter au moins un parcours de plusieurs rivaux, fermeture/rechargement, reprise de combat si techniquement supportée ou reprise claire depuis un point de contrôle sûr, nouvelle partie/réinitialisation avec confirmation, mauvaises données de stockage, deck invalide refusé, édition du deck et six Techniques/Signatures accessibles légalement.
- Captures réelles à 1280×720 et 1920×1080 : écran d'accueil, profil/deck, rencontre, préparation, vue A/B, Clash, résultat, retour hub, progression ; HUD/rival restent conformes à l'image validée. Éviter de dégrader le visage à 83 px (yeux→menton à 720) sans examen documenté de comparaison.
- Une campagne de performance doit être faite sur hardware réel si disponible ; sinon fournir des mesures SwiftShader **étiquetées CPU** et une procédure reproductible pour examen opérateur GPU, sans promettre 60 FPS.
- Livrables : docs/RAPPORT_M04.md, docs/RAPPORT_M05.md, docs/RAPPORT_M06_RC.md, ADR nécessaires, captures QA, commits, JOURNAL mis à jour et liste de limitations honnêtes.

**Mandat prioritaire : qualité de jeu et progression opérationnelle > art additionnel > mobile paysage et polish décoratif.**