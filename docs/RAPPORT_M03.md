# Rapport M03 — Fidélité à la preview validée, HUD et chorégraphies du Clash

Branche `claude/m03-ui-fidele-et-clash-anime`, dérivée de `claude/m03-direction-visuelle-et-clash` (contrat M03 + preview), elle-même issue du livrable M02 `e978d2d`. `main` intacte, aucune fusion.
Règles : **V3.0 + delta V3.2 inchangés** (aucune modification du moteur de règles).
Référence : `reference/REFERENCE_VISUELLE_VALIDEE_M03.jpg` — **document de revue uniquement** (planches de comparaison), jamais chargé par le jeu.
Preuves : toutes au commit **`0a95929`** (les commits suivants n’ajoutent que la documentation et ces preuves) — `test/*.test.ts`, `artifacts/qa/qa-browser.json`, `artifacts/qa/perf.json`, `screenshots/qa/m03/` (+ `manifest.json`), `screenshots/qa/m03/clash/` (+ `clash-manifest.json`).

## 1. Ce qui change pour le joueur

- **La composition de la preview** : scène plein cadre ; **HUD du rival en haut à gauche**, **HUD du joueur compact en bas à gauche** (portrait procédural, PV, Insight, Main | Pioche | Déf.) — plus aucune bande HUD traversant l’écran ; **main centrée en bas** (grandes cartes) ; **commandes et Techniques en bas à droite** ; bulle du rival en haut à droite (humeur + réplique) ; **journal dans un tiroir** ; inspection flottante ; le centre appartient au rival, aux Primaires et au Clash.
- **La salle aux bougies** : bannières des quatre familles derrière le rival, arches ouvertes sur un ciel étoilé, bougies vacillantes, plantes, table vernie à incrustations dorées ; le rival (capuche pour Maëlle) tient l’éventail de ses cartes au bord de la table. 100 % code.
- **Deux caméras conservées** : vue A frontale par défaut, vue B inclinée pour poser les cartes — **le visage du rival reste visible en vue B** ; les rangées et la main glissent d’une vue à l’autre.
- **ASSAUT / GARDE lisibles d’un coup d’œil** : bandeau rouge à pointe / bleu à bouclier sur chaque Primaire révélée, sur le plateau comme dans le face-à-face ; avant la révélation, rien du mode adverse n’est affiché.
- **Les cartes s’affrontent** : à la résolution, les deux Primaires viennent se faire face (VS, Rang), puis la chorégraphie du résultat **calculé par le moteur** se joue (charge, collision, bouclier, recul, absorption…), les blessures s’affichent, et **les deux Primaires partent à la défausse**, gagnante comprise.

## 2. Acceptance M03 (§6)

| # | Critère | Statut | Preuve |
|---|---|---|---|
| 1 | HUD rival haut-gauche, HUD joueur bas-gauche, styles comparables, PV / Insight / main / pioche / défausse, portrait / identité ; aucune barre traversant le centre | OK | captures `01`, `02`, `06` ; QA : contrôle automatique de position des HUD et de la bande centrale (x 30–70 %, y 15–62 %) à chaque Engagement / Tactique, 1280, 1920, mobile — 0 écart sur 4 duels |
| 2 | Main et commandes accessibles en A/B ; plateau, visage, cartes lisibles 1280 / 1920 ; mobile sans débordement ni perte de ciblage | OK | QA : aucun chevauchement main / commandes / emplacements / HUD, pas de défilement horizontal ; 4 duels complets dont tactile 390×844 |
| 3 | ASSAUT / GARDE textuels + symboles sur chaque Primaire révélée ; aucune fuite d’une Primaire secrète ni d’une Technique privée | OK | `stance.ts` ; captures `03`, `05` ; QA : 101 contrôles / 0 écart ; audit de secrets 0 fuite |
| 4 | AA priorité différente : charge, impact, sortie du vaincu ; gagnant ensuite défaussé | OK | `clash/aa-gagne-*`, `clash/aa-perd-*`, pellicule `aa-gagne-film-*` ; nettoyage vers la défausse (compteur « Déf. ») |
| 5 | AA égalité : frappe simultanée, aucun faux gagnant, blessures simultanées, prolongation | OK | `clash/aa-egalite-*` (−9 / −9 simultanés), `clash/double-ko-*` (prolongation) ; tests `clashMotion` |
| 6 | AG : Garde gagnante (repoussé) ; Assaut gagnant avec blessure (bouclier franchi) ; Assaut gagnant SANS blessure (absorption, sans victoire défensive) | OK | `clash/ag-garde-tient-*`, `clash/ga-votre-garde-*`, `clash/ag-garde-cede-*`, `clash/ag-absorption-*` (+ pellicule) ; test : jamais « GARDE VICTORIEUSE » en absorption |
| 7 | GG neutre ; ∞ et soutiens conformes ; effets annulés visuellement annulés | OK | `clash/gg-neutre-*`, `clash/ag-garde-cede-*` (Signature ∞, P14 contre Garde 12 → 2), `clash/interferences-*` (ANNULÉ) |
| 8 | Séquenceur synchronisé ; saut / accélération / interruption / changement de vue nettoient les clones sans altérer la simulation ; boutons et focus conservés | OK | scène hors du DOM re-rendu, `stop()` sur « Passer » ; QA : aucune scène fantôme (0 sur 4 duels, scène observée 10 fois en mouvement réel) ; `clash-shots` : aucune scène après « Passer » ; clics perdus 0 |
| 9 | Duels complets souris, clic, clavier, tactile ; console propre ; absence de fuite ; scénarios déterministes de chaque Clash | OK | §4 et §5 |
| 10 | typecheck, test, build, QA sur un SHA donné ; SwiftShader distingué du GPU ; tactile et mouvement réduit testés | OK | §5, §6, §7 |
| 11 | Captures avant / après / preview en A et B, résolutions AA et AG, Secondaires, HUD compact, mobile ; rapport d’écarts | OK | §3 (planches), §8 (écarts) ; « avant » = `screenshots/qa/m02/` |
| 12 | JOURNAL, ADR, diff/commit, recommandations ; aucune fusion `main` | OK | `JOURNAL.md` passe 3, ADR 009–010 (+ 006 amendé), ce rapport |

## 3. Captures comparées à la preview (planches réelles)

Générées par `node tools/shots-m03.mjs` : à gauche le recadrage de la preview (document de revue), à droite la capture **réelle** du build.

| Planche | Preview | Capture runtime |
|---|---|---|
| `screenshots/qa/m03/comparaison-1-vue-A.png` | 1. Vue frontale | `01-vue-A-confrontation-1280.png` (+ `-1920`) |
| `screenshots/qa/m03/comparaison-2-vue-B.png` | 2. Manipulation | `02-vue-B-placement-1280.png` (+ `-1920`) |
| `screenshots/qa/m03/comparaison-3-revelation.png` | 3. Révélation | `clash/ag-absorption-01-presentation.png` |
| `screenshots/qa/m03/comparaison-4-resolution.png` | 4. Résolution | `clash/ag-absorption-02-impact.png` |
| `screenshots/qa/m03/comparaison-5-cartes-postures.png` | 5. Cartes et états | `03-tactique-postures-revelees-1280.png` |
| `screenshots/qa/m03/comparaison-6-mobile.png` | 6. Mobile | `06-mobile-vue-A.png` |

Autres captures : `04-tactique-menu`, `05-avant-revelation-secret`, `07-mobile-vue-B-pose-tactile`, `08-mobile-clash-absorption`, `09-journal-tiroir`, `10-inspection-flottante`, `11-mouvement-reduit` (manifest : `screenshots/qa/m03/manifest.json`). Captures **avant** (M02) : `screenshots/qa/m02/01`, `02`, `12`, `20`, `21`.

## 4. Démonstrations de chaque type de Clash

`node tools/clash-shots.mjs` joue chaque cas **par l’interface** dans un scénario déterministe (rival scripté, identifié comme démonstration) et capture la pose finale des temps « Rang » (face-à-face), « Issue » (impact) et « Blessures », une variante **mouvement réduit**, et trois **pellicules** du mouvement réel (`*-film-*`, instants 0 / 200 / 380 / 470 / 620 / 1000 ms). Chorégraphie lue sur la scène = classement du `ClashMotionDirector` à partir du rapport du moteur.

Commit **`0a95929`** — `npm run shots:clash` ; manifest `screenshots/qa/m03/clash/clash-manifest.json` ; problèmes : 0.

| Cas | Situation jouée (UI) | Chorégraphie (moteur → ClashMotionDirector) | Verdict affiché | Temps de la séquence | Captures |
|---|---|---|---|---|---|
| `aa-gagne` | `clash-aa` : Cendre-4 en ASSAUT | AA, priorité différente | VOUS DOMINEZ AU RANG | tactics, rank, outcome, damage | `aa-gagne-01-presentation.png`, `aa-gagne-02-impact.png`, `aa-gagne-03-blessures.png`, `aa-gagne-mvt-reduit.png` ; pellicule `aa-gagne-film-*` (6 images) |
| `aa-perd` | `clash-aa` : Astre-2 en ASSAUT | AA, priorité différente | LE RIVAL DOMINE AU RANG | tactics, rank, outcome, damage | `aa-perd-01-presentation.png`, `aa-perd-02-impact.png`, `aa-perd-03-blessures.png`, `aa-perd-mvt-reduit.png` |
| `aa-egalite` | `clash-aa` : Cendre-3 en ASSAUT | AA, égalité | ÉGALITÉ — IMPACTS SIMULTANÉS | tactics, rank, outcome, damage | `aa-egalite-01-presentation.png`, `aa-egalite-02-impact.png`, `aa-egalite-03-blessures.png`, `aa-egalite-mvt-reduit.png` |
| `ag-garde-tient` | `clash-ag` : Cendre-3 en ASSAUT | AG, Garde victorieuse | GARDE VICTORIEUSE | tactics, rank, outcome, insight | `ag-garde-tient-01-presentation.png`, `ag-garde-tient-02-impact.png`, `ag-garde-tient-mvt-reduit.png` ; pellicule `ag-garde-tient-film-*` (6 images) |
| `ag-absorption` | `clash-ag` : Cendre-3 en ASSAUT + soutien Rang | AG, victoire au Rang sans blessure | VICTOIRE AU RANG · 0 BLESSURE · ABSORPTION | tactics, rank, outcome, destination | `ag-absorption-01-presentation.png`, `ag-absorption-02-impact.png`, `ag-absorption-mvt-reduit.png` ; pellicule `ag-absorption-film-*` (6 images) |
| `ag-garde-cede` | `clash-ag` : sig-Cendre en ASSAUT | AG, la Garde cède | LA GARDE CÈDE | tactics, rank, outcome, damage, effect | `ag-garde-cede-01-presentation.png`, `ag-garde-cede-02-impact.png`, `ag-garde-cede-03-blessures.png`, `ag-garde-cede-mvt-reduit.png` |
| `gg-neutre` | `clash-ag` : Ronce-4 en GARDE | GG, neutre | DEUX GARDES — AUCUN CLASH | tactics, rank, outcome | `gg-neutre-01-presentation.png`, `gg-neutre-02-impact.png`, `gg-neutre-mvt-reduit.png` |
| `ga-votre-garde` | `clash-aa` : Cendre-4 en GARDE | AG, Garde victorieuse | GARDE VICTORIEUSE | tactics, rank, outcome, insight | `ga-votre-garde-01-presentation.png`, `ga-votre-garde-02-impact.png`, `ga-votre-garde-mvt-reduit.png` |
| `double-ko` | `doubleko` : Cendre-4-contrecoup en ASSAUT | AA, priorité différente | LE RIVAL DOMINE AU RANG | tactics, rank, outcome, damage, effect, overtime | `double-ko-01-presentation.png`, `double-ko-02-impact.png`, `double-ko-03-blessures.png`, `double-ko-05-prolongation.png`, `double-ko-mvt-reduit.png` |
| `interferences` | `interference` : Cendre-4 en ASSAUT + Interférence | AG, la Garde cède | LA GARDE CÈDE | tactics, interference, interference, rank, outcome, damage, insight, destination | `interferences-03-presentation.png`, `interferences-01-interference.png`, `interferences-04-impact.png`, `interferences-05-blessures.png`, `interferences-mvt-reduit.png` |

## 5. QA navigateur

Commit **`0a95929`**, `npm run build` puis `npm run qa:browser` (Chromium 141.0.7390.37 headless, WebGL logiciel SwiftShader). Rapport : `artifacts/qa/qa-browser.json`. Chaque duel est joué **entièrement par l’interface** contre l’IA.

| Duel | Seed / rival | Entrée | Fin | Vues (contrôles / écarts) | Postures (contrôles / écarts) | Composition (écarts) | Séquences | Scènes fantômes | Console / fuites / clics perdus |
|---|---|---|---|---|---|---|---|---|---|
| `desktop-1280-drag` 1280×720 | 101 / Sélène (voile) | glisser souris | K.-O. du joueur, tour 13 | 50 / 0 | 24 / 0 | 0 | 9 passées | 0 | 0 / 0 / 0 |
| `desktop-1920-click` 1920×1080 | 202 / Maëlle (ronce) | clic-pour-poser, mouvement réel, rythme rapide | victoire du joueur, tour 14 | 57 / 0 | 25 / 0 | 0 | 13 regardées (scène vue 10 fois) | 0 | 0 / 0 / 0 |
| `desktop-1280-keyboard` 1280×720 | 303 / Kaï (braise) | clavier seul | K.-O. du joueur après 2 prolongation(s), tour 10 | 36 / 0 | 18 / 0 | 0 | 8 passées | 0 | 0 / 0 / 0 |
| `mobile-390-touch` 390×844 | 404 / Sélène (voile) | glisser tactile CDP + toucher-toucher | victoire du joueur, tour 19 | 68 / 0 | 34 / 0 | 0 | 16 passées | 0 | 0 / 0 / 0 |

- **Totaux** : 4 duels complets ; 211 contrôles de vue / 0 écart ; **101 contrôles de posture / 0 écart** (bandeau ASSAUT/GARDE présent, cohérent, avec texte et symbole sur chaque Primaire révélée ; aucun mode adverse affiché avant révélation) ; **composition : 0 écart** (HUD aux coins, bande centrale libre, aucun chevauchement main / commandes / emplacements / HUD, pas de défilement horizontal) ; **0 scène de Clash fantôme** ; 0 erreur console ; 0 fuite ; 0 clic perdu.
- Le duel 1920 joue la résolution en **mouvement réel** (rythme rapide, `reducedMotion=0`) : la scène du Clash a été observée 10 fois et toujours nettoyée ; les trois autres duels passent la séquence (« Tour suivant ») en mouvement réduit.
- Humeurs distinctes du rival observées en jeu : 9 — focused, smug, surprised, triumphant, neutral, confident, defeated, pained, pleased.
- Historique honnête : à `6f1b9c7`, le duel tactile échouait au tour 4 (le panneau d’inspection, ouvert par un simple toucher, interceptait le menu tactique) ; corrigé en `0a95929` (voir JOURNAL passe 3).

## 6. Tests unitaires

`npm run typecheck` : 0 erreur ; `npm test` : **91/91** — clash 29, moteur 29, IA 7, présentation 7, séquence 3, **chorégraphies du Clash 12** (six issues par vraies commandes moteur, ∞, double K.-O., Interférences, non-fuite, liste de conséquences, propriété sur 40 duels IA/IA), **bulle du rival 4** (accord, déterminisme, faits publics, aucune réplique de type « tell »).

## 7. Performance (même machine, `artifacts/qa/perf.json`)

Commit **`0a95929`**, `npm run perf` ; machine : Intel(R) Xeon(R) Processor @ 2.10GHz, 4 cœurs, 16 Go, Node v22.22.0 ; moteur de rendu `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)` = **rasterisation CPU, sans GPU**.

| Mesure | Résultat |
|---|---|
| Moteur, 200 duels IA/IA (sans rendu) | 4481 ms ; **22.41 ms/duel** ; **367.6 µs/commande** ; 9.84 tours en moyenne ; 18 prolongations — inchangé par M03 (présentation seule) |
| Scène vue A (1280×720, animée, bougies + rival) | 80 draw calls, 1650 triangles, 21 textures, 51 géométries ; **36.45 ms CPU/image** ; 4.1 FPS |
| Scène vue B | 78 draw calls, 1634 triangles ; **31.69 ms CPU/image** ; 4.1 FPS ; plus de second rendu de portrait |
| Galerie (37 illustrations) | 1156.2 ms (une fois, en cache) |
| Bougies | corps instanciés (1 draw call) + flammes et halos en points animés par shader (2 draw calls) : aucune géométrie ni texture régénérée par image |
| Scène du Clash | DOM + Web Animations API (transformations, opacité, filtres) : aucune texture régénérée ; clones retirés à la fin |

- Comparaison M02 (même machine) : vue A 56 draw calls / 28,5 ms CPU par image → M03 80 / 36,5 ms. Le surcoût vient de la salle plus riche (piliers, piédestaux, balustrade, bannières et tringles, plantes, capuche) ; pistes si nécessaire sur GPU réel : fusionner les géométries statiques du décor, atlas des bannières.
- Les FPS ne sont **pas représentatifs** d’un GPU réel (SwiftShader rasterise sur le CPU du conteneur) ; à mesurer sur bureau et mobile réels avant tout budget.

## 8. Écarts visuels encore présents (honnête)

| Zone | Preview validée | Build M03 | Écart restant |
|---|---|---|---|
| Personnages | Illustration peinte (style anime), visages modelés, éclairage peint | Rival 2.5D en couches Canvas animées (yeux à cils et reflets, modelé, capuche) ; portrait joueur composé des mêmes couches | Moins de finesse picturale (traits, ombres, chevelure) ; pas de squelette |
| Décor | Salle dense : nombreuses bougies, plantes, profondeur, halos | Mêmes éléments en version plus sobre (≈ 30 bougies, 4 plantes, fond peint) | Moins de densité ; ni bloom ni profondeur de champ (coût SwiftShader / choix provisoire) |
| Plateau en vue A | Une seule rangée visible (celle du rival) | Deux rangées (rival + joueur) : le jeu exige de voir ses propres Secondaires | Emplacements un peu plus petits que sur la preview |
| Cartes | Grandes cartes à cadre lumineux de famille | Cadre de famille lumineux, emblème, Rang / Puissance ; illustrations procédurales M01 conservées | Illustrations plus simples ; typographie système (pas de police dédiée) |
| Résolution | Panneau « Résolution 2/4 » avec liste à puces | Verdict + liste à puces sous le face-à-face ; titre et détail dans le panneau de commandes | Disposition un peu différente (liste sous la scène, pas à côté) |
| Bulle | Humeur double et longue réplique | Humeur accordée + réplique courte, liées aux faits publics | Répliques plus courtes, banque limitée (provisoire) |
| Mobile | Mobile **paysage** compact | Mobile **portrait** 390×844 (cible QA de la mission) : mini-HUD à portraits, rangées, consigne, main, mini-HUD joueur | Le gabarit paysage n’est pas spécifiquement traité |
| Bouton principal | « Fin de tour » unique | Bouton contextuel selon la phase (Valider, Verrouiller l’engagement, Tour suivant…) | Libellé différent : la règle impose des décisions par phase |
| Lumière | Salle chaude et lumineuse, table brun clair | Ambiance plus sombre (table brun foncé, halos plus localisés) | Exposition globale plus basse que la preview |
| Vue B | Rival grand et proche en haut | Rival visible en haut, plus petit (caméra plus haute) ; grappes de bougies au premier plan des coins | Cadrage B à resserrer sur le rival |
| Chiffres / textes | Valeurs illustratives (parfois incohérentes) | Valeurs du moteur uniquement | Volontaire (contrat §1) |

## 9. Conformité règles et secrets

- Aucune règle modifiée ; aucune ligne du moteur de règles changée en M03.
- Les chorégraphies lisent le rapport public du Clash (vainqueur, Garde victorieuse, absorption, blessures) : **aucun recalcul** ; le test de propriété vérifie sur 40 duels IA/IA que chaque Clash est classé conformément au moteur.
- Bandeaux de posture : seulement après la révélation officielle ; avant, votre propre mode est marqué « secret » et rien n’est affiché côté rival (QA : contrôlé à chaque Engagement / Lecture / Tactique).
- Répliques et humeurs du rival : faits publics uniquement ; aucun système de tells, bluff ni Sang-froid.
- Observation : le rapport public du Clash transporte encore les scores bruts (champ non lu par l’UI ni l’IA) — correction proposée en tâche séparée, aucun affichage concerné.

## 10. Limites et dettes

- **GPU réel non mesuré** (SwiftShader) ; QA navigateur lente (≈ 1–7 min par duel).
- Rupture et Dissipation côté humain : toujours couvertes par les tests moteur, pas par la QA navigateur (tâche proposée).
- Mobile paysage non spécifiquement mis en page ; bundle JS ≈ 0,69 Mo (Three.js, découpage non fait).

## 11. Décisions à valider

1. Composition, proportions et décor provisoire (ADR 009) ; portrait procédural du joueur ; répliques du rival.
2. Les six chorégraphies, leur durée, le face-à-face rival à gauche / joueur à droite (ADR 010).
3. Mobile : portrait seul ou ajout d’un gabarit paysage proche du panneau 6.
4. ARB-002 (profil du rival public) toujours ouvert.

