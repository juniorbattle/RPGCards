# Rapport M02 — Confrontation face à face et lisibilité

Branche `claude/m02-confrontation-face-a-face` (dérivée du MVP M01 `64aaf8f`, `main` intacte).
Règles : **V3.0 + delta mandaté V3.2 inchangés** (seule correction de conformité : Dissimulation, §6).
Preuves (toutes au commit **`94f8e05`**, les commits suivants n’ajoutent que la documentation et ces preuves) : `test/*.test.ts`, `artifacts/qa/qa-browser.json`, `artifacts/qa/perf.json`, `screenshots/qa/m02/` (+ `manifest.json`).

## 1. Ce qui change pour le joueur

- On **fait face à un rival** : une personne procédurale (visage, buste, mains, éventail de cartes) se tient derrière une table de duel. Elle observe, réfléchit, pose sa carte, réagit aux révélations, aux Gardes, aux dégâts, aux Interférences, à la victoire ou à la défaite.
- **Vue A « confrontation »** (frontale) par défaut ; **vue B « manipulation »** (inclinée vers la table) quand on compose ; le rival reste visible en **portrait vivant**. Chaque tour commence par un regard vers le rival, puis la caméra descend vers la table dès qu’on touche une carte. `V` bascule à tout moment.
- La **résolution** se lit étape par étape : choix révélés → Interférences → Rang (décomposé) → issue / absorption (« victoire au Rang… mais 0 blessure ») → dégâts → conséquences. Un enseignement à la fois ; « Passer » et « Tour suivant » toujours disponibles.
- Journal aéré, regroupé par tour ; PV mis en scène au bon moment ; cases concernées mises en évidence.

## 2. Acceptance M02 (§8)

| # | Critère | Statut | Preuve |
|---|---|---|---|
| 1 | typecheck, test, build ; duel entier souris, clavier, tactile | OK | `npm run typecheck` 0 erreur ; `npm test` 75/75 ; `npm run build` ; `qa:browser` au commit `94f8e05` : 4 duels complets (glisser souris 1280, clic 1920, clavier seul 1280, glisser tactile CDP 390×844) — voir §3 |
| 2 | Entrée du duel : vue A, visage + buste du rival, plateau lisible | OK | capture `01-frontale-entree-duel-1280` ; temps d’observation en début de tour (ADR 006) |
| 3 | Préparation / manipulation en B, rival consultable | OK | `02-inclinee-engagement-1280`, `21-mobile-inclinee-pose-tactile` (portrait vivant) |
| 4 | Retour en A à la révélation et à la tactique, sans perte d’inspection / cibles / boutons | OK | `04`, `05`, `06` ; QA : vue attendue contrôlée à chaque décision, 0 écart |
| 5 | Transitions A↔B sur plusieurs tours, aucun clic/drag/focus perdu | OK | QA : bascules comptées par duel, contrôle « verrouillage pris en compte » à chaque engagement, bascule `V` en pleine tactique ; gel de vue pendant un glisser (test unitaire) |
| 6 | ≥ 3 profils visuels, ≥ 5 réactions sur événements publics | OK | 3 personnalités (`16-personnalite-*`, planche `23`) ; réactions réelles `03, 04, 08–15` ; QA : humeurs distinctes observées en jeu réel (§3) |
| 7 | Clash séquencé ; T2 (5/4, 0 dégât) lisible sans journal | OK | `test/beats.test.ts` ; captures `11-T2-rang-5-contre-4`, `12-T2-zero-blessure` |
| 8 | Secrets du joueur sans effet sur expressions et décisions de l’IA | OK | `test/presentation.test.ts` (expressions), `test/ai.test.ts` (décision avec mémoire, vue, engagement, tactiques) |
| 9 | Captures frontale / inclinée / tactique / résolution / réactions / 1280 / 1920 / mobile / mouvement réduit | OK | `screenshots/qa/m02/01…23` (seed, scénario, viewport, vue, humeur dans le manifest) |
| 10 | Perf : CPU séparé, pas de FPS « représentatif » sur SwiftShader, pas de génération d’art par image | OK (avec limites) | `artifacts/qa/perf.json` ; textures du rival générées une fois ; GPU non mesurable ici (§4) |
| 11 | JOURNAL, ADR, rapport, SHA, tests exacts, limites ; pas de fusion `main` | OK | ADR 006–008 (+ 003 remplacé, 004 mis à jour), `JOURNAL.md` passe 2, ce rapport |

## 3. QA navigateur

Commit **`94f8e05`**, `npm run build` puis `npm run qa:browser` (Chromium 141.0.7390.37 headless, WebGL logiciel SwiftShader). Rapport : `artifacts/qa/qa-browser.json`, journal `artifacts/qa/qa-browser.log`. Chaque duel est joué **entièrement par l’interface** contre l’IA (aucune commande moteur directe), avec `reducedMotion=1`.

| Duel | Seed / rival | Entrée | Fin | Tours | Contrôles de vue / écarts | Bascules A↔B | Regards de début de tour | `V` en tactique | Séquences | Humeurs | Console / fuites / clics perdus |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `desktop-1280-drag` 1280×720 | 101 / Sélène (voile) | glisser souris (26) | K.-O. du joueur, tour 13 | 12 | 54 / 0 | 28 | 13 | OK | 9 passées | 5 | 0 / 0 / 0 |
| `desktop-1920-click` 1920×1080 | 202 / Maëlle (ronce) | clic-pour-poser (14) | victoire du joueur, tour 14 | 13 | 57 / 0 | 30 | 14 | OK | **13 regardées en entier** (rythme rapide) | 5 | 0 / 0 / 0 |
| `desktop-1280-keyboard` 1280×720 | 303 / Kaï (braise) | clavier seul (10) | K.-O. du joueur après 2 prolongations (double K.-O.), tour 10 | 9 | 36 / 0 | 22 | 10 | OK | 8 passées | 5 | 0 / 0 / 0 |
| `mobile-390-touch` 390×844 | 404 / Sélène (voile) | glisser tactile CDP (19) + toucher-toucher (16) | victoire du joueur, tour 19 | 18 | 68 / 0 | 42 | 19 | OK | 16 passées | 6 | 0 / 0 / 0 |

- **Humeurs distinctes observées en jeu réel** (sur faits publics) : 9 — focused, smug, surprised, annoyed, triumphant, neutral, defeated, confident, pleased.
- **Contrôle de vue** : à chaque décision, la vue affichée est comparée à la vue attendue de la phase (A en tactique/résolution, B en engagement…) ; le regard de début de tour (A tant que le joueur n’a pas interagi) est compté à part. **Contrôle « clic perdu »** : après chaque verrouillage d’engagement, la phase doit avoir avancé malgré la bascule B → A.
- **Techniques utilisées par l’UI** : Lecture 1, Ancrage 6, Sondage 6, Recentrage 1 ; Repoussements choisis : 6. Rupture et Dissipation ne se sont pas présentées (voir §6).
- **Historique honnête** : à `b395c5b`, le duel tactile échouait au tour 9 (glisser qui n’aboutit pas). Cause trouvée par trace pointeur : le clic « Tour suivant » achevait après coup le regard du tour qu’il lançait et la mise en page basculait sous le doigt — le regard de début de tour n’avait presque jamais lieu (2 regards sur un duel). Corrigé en `94f8e05` (jeton de regard) ; voir JOURNAL passe 2.
- Tests unitaires au même commit : `npm run typecheck` 0 erreur ; `npm test` **75/75** (clash 29, moteur 29, IA 7, présentation 7, séquence 3).

## 4. Performance (même machine, voir `artifacts/qa/perf.json`)

Commit **`94f8e05`**, `npm run perf` ; machine : Intel Xeon 2,10 GHz, 4 cœurs, 16 Go, Linux, Node 22.22.0 ; Chromium headless, moteur de rendu `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)))` = **rasterisation sur CPU, sans GPU**.

| Mesure | Résultat | Lecture |
|---|---|---|
| Moteur, 200 duels IA/IA (`tools/perf-engine.ts`, sans rendu) | 4 684 ms ; **23,42 ms/duel** ; **384,3 µs/commande** (IA incluse) ; 12 190 commandes ; 9,84 tours en moyenne ; 18 duels avec prolongation ; victoires p1 147 / p2 53 | CPU pur, séparé du rendu. M01 : ≈ 28 ms/duel ; l’IA à mémoire ne coûte rien de mesurable. |
| Scène vue A (1280×720, scénario Signature, animée) | 56 draw calls, 694 triangles, 16 textures, 32 géométries ; **28,48 ms CPU/image** (mise à jour + soumission du rendu) ; 2 FPS | M01 : 19–23 draw calls. La hausse vient du rival en couches (visage, yeux, mains, éventail) et de la table ; non ventilée finement. |
| Scène vue B (idem) | 36 draw calls (+ portrait), 534 triangles, 14 textures, 30 géométries ; **17,2 ms CPU/image** ; 3,3 FPS | Le portrait est un second rendu « scissor » du même renderer. |
| Galerie (37 illustrations générées) | 1 165,7 ms ; `DOMContentLoaded` 1 291 ms | Génération Canvas une fois, puis cache ; jamais par image. |
| Textures du rival | générées **une fois** à la création (visage, iris, paupières, sourcils, 8 bouches) ; animation par transformations et échange de texture | Aucune génération d’art par image. |
| Bundle | JS 649,58 kB (177,48 kB gzip), CSS 23,37 kB | Three.js domine ; découpage non fait. |

- Les **FPS ci-dessus ne sont pas représentatifs** d’un appareil réel : SwiftShader rasterise sur le CPU du conteneur. L’extension `EXT_disjoint_timer_query_webgl2` est exposée, mais un chronométrage « GPU » sous SwiftShader mesurerait encore le CPU ; il n’est donc pas publié.
- En mouvement réduit et en mode figé, l’arène ne rend qu’à la demande (rendus fusionnés par image) : la boucle d’animation ne tourne pas en continu.
- À faire hors conteneur : mesurer A, B, portrait et FX sur GPU réel (bureau et mobile) avant tout budget.

## 5. Conformité règles (§6)

- **Dissimulation** : la famille de la carte masquée reste visible (vue, événements, journal) ; une identité publique avant le tour n’est jamais masquée (vue, événements, score public). Correctif d’ordre : le camouflage est évalué avant de retirer la carte (fuite détectée par le test G24 pendant le refactor, jamais livrée).
- **ARB-003** (Emprise + Rupture = un seul Repoussement) maintenu et testé.
- **Toujours proposés, non ratifiés** : ARB-001 (instantané Sondage/Recentrage), ARB-002 (profil du rival public — en M02 la Signature et les Techniques du rival découlent de sa personnalité et sont affichées), ARB-005, ARB-011. Aucun n’est bloquant.
- Aucune mécanique de tells, bluff ou Sang-froid : les expressions ne lisent que des faits publics ; le paramètre `pose=` est un outil de revue QA.

## 5 bis. Détail des modules M02

| Module | Rôle | Pur ? |
|---|---|---|
| `src/presentation/director.ts` | vue A/B par phase, bascule V, gel pendant un glisser, temps d’observation | oui |
| `src/presentation/expression.ts` | réactions du rival sur faits publics, expression de repos | oui |
| `src/presentation/personalities.ts` | 3 personnalités (apparence, tempérament, profil IA) | oui |
| `src/presentation/beats.ts` | séquence de résolution, PV mis en scène | oui |
| `src/game/ai/memory.ts` | mémoire IA depuis ses seuls événements visibles | oui |
| `src/scene/rival.ts`, `rivalTextures.ts` | rival 2.5D procédural animé | non (Three.js/Canvas) |
| `src/scene/arena.ts` | table, décor en couches, caméras A/B, portrait, FX, rendus fusionnés | non |

## 6. Limites et dettes (honnêtes)

- **GPU réel non mesuré** : conteneur sans GPU (SwiftShader). Les FPS mesurés ne valent pas pour un vrai appareil ; la QA navigateur est lente (≈ 1–6 min par duel).
- **Rupture et Dissipation** côté humain ne se sont présentées que si les conditions de jeu étaient réunies (Garde + cible active ; camouflage adverse) ; elles restent couvertes par les tests moteur.
- Rival : personnage en couches 2D (pas de squelette), mains simplifiées, pas de synchronisation labiale ; décor provisoire ; noms et personnalités provisoires.
- IA : mémoire limitée aux cartes vues en main et aux modes révélés ; pas de modélisation du joueur au-delà ; niveau « quartier ».
- Les transitions de gabarit DOM entre A et B sont instantanées (la caméra, elle, est interpolée).
- Bundle JS ≈ 0,64 Mo (Three.js) : découpage non fait.

## 7. Décisions à valider

1. Principe A/B et chorégraphie (ADR 006) ; durée du temps d’observation en début de tour.
2. Style du rival (2.5D peint par code, ADR 007) et les 3 personnalités provisoires.
3. Séquence de résolution (ADR 008) : granularité des temps, rythmes.
4. ARB-002 : profil (Signature, Techniques) du rival public ?
