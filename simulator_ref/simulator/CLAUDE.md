# Agent de développement — Les Quatre Voies

## Autorité des documents
1. `docs/CONTRAT_V3_0_SOURCE.md` : règles **normatives**. Ne pas réinterpréter les points chiffrés ou les phases.
2. `test/engine.test.mjs` : scénarios de conformité, à préserver et étendre.
3. `src/engine.mjs` : simulateur de référence, **non architecture de production obligatoire**.
4. `docs/PROMPT_CLAUDE_CODE.md` : périmètre du premier chantier de production.

## Mission
Créer progressivement le **jeu concret**, en commençant par un vertical slice de duel jouable. Préférer une **génération visuelle et de gameplay par code**, sans ressources graphiques externes pour le premier lot. Ne pas porter le simulateur intégralement par copier-coller.

## Contraintes fermes
- Deck 17 cartes uniques : 16 identités + une Signature exclusivement Primaire ∞ ; Main à 4 ; deux Secondaires persistantes avec charge d'un tour.
- Rang séparé de Puissance (Basic 3/6/9/12), deux soutiens additifs (pas de multiplication croisée) ; interférences simultanées en une passe ; AA à égalité = deux frappes simultanées ; AG = différentiel de Puissance si Assaut prioritaire.
- Deux fenêtres d'effets des Secondaires : révélation volontaire, utilisation après révélation des Primaires ; aucun nouveau bouton universel.
- Insight max 2, départ 1, gain max +1/tour, une Technique par tour, 2 équipées ; coûts 1/2 du contrat.
- 16 variantes et 4 Signatures fondatrices inchangées, sauf anomalie reproductible documentée soumise à arbitrage utilisateur.
- Les choix cachés et la visibilité de cartes **ne sont jamais implémentés par des astuces d'affichage** : distinguer les vues privées/publiques au niveau du modèle.
- Tests déterministes, journal des événements, export de graine, contrôle des zones sans cartes fantômes.

## Art procédural — priorité initiale
- Cartes : silhouettes, ornements, sceaux, typographie de rang, effets de rareté et matériaux via Canvas/SVG/GLSL générés en code. Pas de banque d'images ni de dépendance à des fichiers Photoshop.
- Arène : décor de duel évolutif, profondeur, ombres, lumière, effets de révélation, garde, impact, interférence, Signature via shaders/meshes/Canvas ou tout autre rendu code-first mesurable.
- Quatre familles reconnaissables par des langages visuels distincts et lisibles, sans sacrifier l'accessibilité et la lisibilité des valeurs.
- Les shaders doivent être isolés du moteur de règles et dégradables pour les machines moins puissantes ; éviter que les effets VFX bloquent la résolution déterministe.
- Gérer desktop et mobile, GPU économique, préférences réduites de mouvement, animations interruptibles.

## Méthode
- Commencer par auditer règles, tests et prototype. Rendre un diagnostic synthétique des risques techniques, sans attendre un nouveau contrat.
- Mettre en place un mono-repo ou packages `rules/`, `content/`, `client/`, `tests/`, `tools/` si pertinent.
- Fournir dès le premier lot une partie jouable en navigateur avec `npm install && npm run dev` et `npm test`, sans backend requis.
- Garder des identifiants d'événements reproductibles et une gestion cohérente de la RNG.
- Livrer un rapport en français : composants créés, écarts au contrat, tests, captures réellement produites, performance observée, tâches suivantes.
- Si règle ambiguë dans le contrat, isoler une proposition et demander un arbitrage plutôt qu'introduire silencieusement une mécanique.

## Exclusions du premier lot
- Ville complète, économie, boutique, quêtes étendues, réseau classé, assets tiers, animations cinématiques non nécessaires à la lisibilité du Clash.
- Aucune valeur Pv universelle ; aucun cap de tours obligatoire ; aucun retour de l'Écho, de la Pénétration ou du système de mises abandonné.

NOTE : étudier `docs/DELTA_V3_1_A_VALIDER.md` avant de coder. Il ne faut pas considérer un ajustement expérimental comme une validation définitive du contrat V3.0 sans arbitrage.
