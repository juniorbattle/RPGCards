# Rapport M04 — Enveloppe de jeu, configuration du deck et transition de duel

Mission : `docs/missions/M04_INTERFACE_DECK_ET_DUEL.md` (programme `M04_M06_PROGRAMME_JEU_OPERATIONNEL.md`, ADR 013).
Développement **directement sur `main`**, départ `4bfb585` (mandat documentaire M04–M06).
Règles : **V3.0 + delta V3.2 inchangées** — `git diff 4bfb585..80bd858 -- src/game` est **vide** (moteur, IA, visibilité, catalogue non modifiés).
SHA : session démontable `74085cc`, modules purs `e05af56`, écrans `80bd858` ; preuves produites sur le build de `80bd858` (§6).

## 1. Résumé

- **Le jeu s’ouvre sans paramètre** sur un accueil : Nouvelle partie / Continuer / Deck / Collection / Options / Aide / Recommencer (confirmé). Un nouveau joueur crée un profil (nom, **Signature** = voie de départ, **deux Techniques**), ajuste son deck, choisit un rival, joue le duel M03.2, voit un **écran Résultat** et revient au tableau ou à l’accueil — **sans scénario d’URL ni rechargement**.
- **Le duel est la présentation M03.2 approuvée, inchangée** : la scène 3D d’un duel lancé depuis le jeu est **identique au pixel près** à celle de l’entrée QA historique (écart moyen 0/255 à 1280×720 et à 1920×1080 ; mêmes ancres de cadrage 0,205 / 0,455 ; visage yeux→menton **83 px** à 720 p, **125 px** à 1080 p, comme en M03.2).
- **Deck légal par construction et par contrôle** : 16 identités (Basic ou variante possédée) + 1 Signature + 2 Techniques, validées par le catalogue canonique (`buildDeck` du moteur). Un deck illégal ne lance **jamais** de duel (bouton désactivé, flux qui refuse, raison affichée).
- **Sauvegarde locale versionnée** (schéma 1) : écrite à chaque étape, vérifiée par relecture, copie de secours ; une sauvegarde illisible est **diagnostiquée et conservée**, jamais effacée en silence ; un schéma futur est refusé explicitement.
- **Abandon confirmé et classé à part** (ni victoire ni défaite par K.-O.).

## 2. Inventaire initial (audit du runtime `4bfb585`)

| Réutilisé tel quel | Lacune réelle constatée |
|---|---|
| Moteur pur, `Match`, replay + hash, IA non omnisciente (4 profils), 3 rivaux procéduraux, duel M03.2 (vues A/B, HUD, six chorégraphies), `buildDeck` (variantes par identité) | Le duel ne pouvait pas être **quitté** : écouteurs `window` et minuteries (IA, séquence, expressions) jamais retirés ; fin de duel = **rechargement** de la page (seed suivante) |
| Écran de configuration (Signature, Techniques) | L’arène était **recréée** à chaque rival sans libérer ses textures (fuite au fil des duels) |
| Crochets QA (`?autostart`, `?scenario`, `?gallery`, `?qa=1`) | Aucune sauvegarde, aucun écran produit, aucune configuration des variantes |

## 3. Architecture

- **Flux produit distinct des phases du duel** — `src/product/flow.ts` : machine d’états pure `HOME → DECK | BOARD | COLLECTION | OPTIONS | HELP`, `BOARD → PREP → DUEL → RESULT → BOARD | PREP | HOME`. Gardes : deck illégal ⇒ pas de duel ; rencontre indisponible ⇒ refus motivé ; **pendant un duel**, seules les fenêtres superposées (menu, options, aide) et la sortie confirmée sont possibles. Le moteur ne connaît pas les menus.
- **Session de duel démontable** — `src/app/duelSession.ts` : tous les écouteurs sous `AbortController`, `Controller.dispose()` (minuteries IA / séquence / expressions), `DragManager.dispose()`, scène du Clash arrêtée, crochets QA retirés. Contrôlé en QA : après le résultat, ni `__lqv`, ni plateau, ni scène de Clash résiduels.
- **Arène unique** — `setRival()` change le rival dans le même contexte WebGL (verso partagé conservé), `setPaused()` fige la scène hors duel (une image, aucune boucle) ; l’écran Résultat la laisse vivre pour montrer la réaction finale du rival.
- **Deck** — `src/product/deck.ts` : `validateDeck(choix, collection)` (Signature possédée, variantes connues/possédées/une par identité, deux Techniques distinctes apprises, forme du deck physique 17 = 16 + 1 vérifiée sur le deck **construit par le moteur**).
- **Sauvegarde** — `src/product/save.ts` : schéma 1 (`schemaVersion`, `gameVersion`, profil + seed de profil, deck, options, historique public, compteur de duels, conseils lus) ; `SaveStore` : écriture validée → ancienne version valide en secours → écriture → relecture ; `quarantine`, `restoreBackup`, `erase` ; stockage indisponible ⇒ jeu possible, signalé.
- **Seeds** — seed de duel = dérivée (profil, n-ième duel) : reproductible, affichée sur le résultat ; seed esthétique séparée (options).
- **Rivaux (données de prototype)** — `src/product/encounters.ts` : PV propres au personnage (Kaï 80, Maëlle 95, Sélène 100), variantes équipées, Techniques, style public, difficulté déclarative. **Aucune tricherie d’IA** : la difficulté vient du deck et du profil.
- **Résumé public** — `src/product/stats.ts` : issue, tours, prolongations, dégâts infligés/subis, PV finaux — calculés sur les **seuls événements visibles du joueur**.
- **Entrées QA conservées** : `?autostart=1`, `?scenario=…`, `?gallery=1`, et l’ancien écran `?setup=1` ; `?qa=1` n’expose que des crochets de lecture (`__lqv`, `__lqvShell`).

## 4. Écrans (captures `screenshots/qa/m04/`, 1280×720 et 1920×1080)

| Écran | Contenu | Capture |
|---|---|---|
| Accueil | menu, état de la sauvegarde, rival vivant derrière (scène figée) | `01-accueil-vide-*`, `13-accueil-sauvegarde-*` |
| Nouveau duelliste | nom, 4 Signatures (texte de famille), Techniques possédées | `02-nouveau-duelliste-*` |
| Rencontres | 3 rivaux : portrait, titre, difficulté, PV, Signature, style, bilan ; historique | `03-rencontres-*`, `15-retour-rencontres-*` |
| Deck | Signature, 6 Techniques (non apprises grisées, raison), 16 identités × Basic / variante (cadenas + raison), inspection (Rang = priorité, Puissance = dégâts), état légal | `04-deck-*` |
| Collection | 36 définitions par famille (filtre), possédées / non possédées / dans le deck, inspection, Techniques | `05-collection-*` |
| Préparation | panneau latéral : informations **publiques** du rival (PV, Signature, Techniques — ARB-002 tel qu’implémenté), votre deck, conditions, rival visible à la table | `06-preparation-*` |
| Duel | M03.2 inchangé + bouton **Menu** et **conseil contextuel** au-dessus des commandes | `07-duel-vue-A-*`, `08-duel-vue-B-*` |
| Menu du duel | reprendre, options, aide, abandon (confirmé) | `09-menu-pause-*` |
| Résultat | issue, PV finaux, dégâts, tours, bilan contre ce rival, seed ; rival visible (réaction finale) | `14-resultat-*` |
| Aide / Options | aide en sections ; rythme, mouvement, texte, conseils, mode démo, seed esthétique, export / import / effacement | `11-aide-*`, `12-options-*` |
| Smoke portrait 390×844 | accueil, rencontres, duel lancé depuis le jeu (gabarit M03.2) | `16`–`18-mobile-*` |

**Aide intégrée et conseils.** Conseils non intrusifs (un à la fois, au-dessus des commandes, bord droit — le centre reste libre), fermés par « Compris » (mémorisé), désactivables : début de tour, préparation (révéler une réserve), engagement (Primaire + posture, Secondaire en chargement), tactique (Rang / Dégâts / Interférer, choix secrets simultanés), lecture du Clash, **« Pourquoi 0 dégât ? »** (déclenché par une victoire au Rang absorbée), Insight. Masqués sur mobile (gabarit M03.2 préservé).

## 5. Ce que le joueur ne voit pas (non-fuite)

- Préparation : Signature, Techniques, PV et style **publics** du rival ; **jamais** son deck exact, sa main ni ses intentions (texte explicite).
- Duel : audits M03 inchangés sur chaque duel produit (`secretAudit` : aucune identité adverse cachée dans le DOM, aucun identifiant d’instance adverse, aucune carte camouflée nommée, aucun choix tactique adverse avant le verrou commun).
- Résultat / historique : calculés des événements **visibles du joueur** ; test : aucun champ privé dans le résumé.

## 6. Tests et QA (build `80bd858`, Chromium headless + SwiftShader — rendu logiciel, pas une mesure GPU)

| Contrôle | Résultat |
|---|---|
| `npm run typecheck` · `npm test` · `npm run build` | OK · **135/135** (dont 18 nouveaux `test/product.test.ts` : flux, deck — 4 Signatures × 15 paires de Techniques légales, refus motivés —, sauvegarde — aller-retour, secours, illisible conservée, schéma futur, quota plein, écriture incohérente refusée —, rencontres jouables jusqu’au K.-O., résumé public) · OK |
| `npm run qa:product` (nouveau) | **4/4 parcours, 25/25 contrôles, 0 erreur console** — A : nouveau joueur 1280 au clic (profil → deck modifié → Kaï → duel complet 8 tours → résultat = vainqueur moteur → bilan → **rechargement** : profil, deck, historique intacts → Continuer) ; B : 1920 au **glisser** (Sélène, duel complet) → revanche → 2 tours au **clavier** → abandon annulé puis confirmé (classé « abandon ») ; C : deck illégal injecté ⇒ signalé, « Commencer » désactivé, lancement forcé refusé par le flux, raison dans l’éditeur, correction ⇒ duel possible ; D : sauvegarde illisible ⇒ diagnostic, rien effacé, copie de secours restaurée, illisible mise à l’écart ; schéma futur refusé, nouvelle partie le conserve à part. Duels audités : vues 57 contrôles / 0 écart, composition 0, postures 0, **fuites 0**, clics perdus 0 |
| `npm run shots:m04` (nouveau) | 33 captures + `manifest.json` (dont deux Clash en mouvement réel et deux Résultats après un duel complet joué par l’interface) ; scène 3D jeu = QA historique : **0/255** d’écart ; visage 83 px (1280×720) / 125 px (1920×1080) ; 0 erreur console |
| `npm run qa:browser` (M03, entrées historiques, sur la session démontable) | **5/5 duels** jusqu’au K.-O. (glisser 1280, clic 1920 avec séquences vues, clavier, tactile 390, rotation en plein tour) ; 267 contrôles de vue / 0 écart ; 128 contrôles de posture / 0 écart ; composition 0 ; **fuites 0** ; console 0 ; clics perdus 0 ; 4 rotations, état conservé ; 11 humeurs (`artifacts/qa/qa-browser.json`, journal `artifacts/qa/logs/m04-qa-browser-80bd858.txt`) |
| `npm run qa:techniques` (M03.1B) | **8/8** parcours (Rupture, Rupture avec cible cachée, Dissipation, effet camouflé ; souris 1280 et tactile 390) — `artifacts/qa/logs/m04-qa-techniques-80bd858.txt` (captures M03.1B historiques conservées) |

## 7. Écarts et limites

- **Pas de reprise d’un duel interrompu en M04** (fermer l’onglet en plein duel le perdait, sans le compter) : livré en **M05** (reprise exacte par rejeu vérifié).
- Les données des rivaux (PV, decks, difficultés) et la collection de départ sont des **prototypes non canoniques**, signalés dans l’interface (pastilles « prototype »).
- Typographie système (aucune police téléchargée) ; menus en DOM/CSS par code, pas de décor dédié au hub (la scène du duel figée sert de fond).
- Mobile paysage : **aucun nouveau travail** (mandat) ; le portrait est vérifié en smoke-test.
- L’écran Résultat laisse la scène 3D animée (réaction finale du rival) : coût de rendu identique à celui du duel pendant cet écran.

## 8. Arbitrages

- **ARB-002** (Signature et Techniques du rival publiques) : appliqué tel qu’implémenté depuis M01 et conforme à l’instruction M05 « Signature, Techniques et statut public légal » — **toujours non ratifié**.
- Collection de départ (16 Basic, 4 Signatures, 4 Techniques, variantes de Rang I) : choix de prototype à valider.
