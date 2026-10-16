# Rapport M03 — Fidélité à la preview validée, HUD et chorégraphies du Clash

Branche `claude/m03-ui-fidele-et-clash-anime`, dérivée de `claude/m03-direction-visuelle-et-clash` (contrat M03 + preview), elle-même issue du livrable M02 `e978d2d`. `main` intacte, aucune fusion.
Règles : **V3.0 + delta V3.2 inchangés** (aucune modification du moteur de règles).
Référence : `reference/REFERENCE_VISUELLE_VALIDEE_M03.jpg` — **document de revue uniquement** (planches de comparaison), jamais chargé par le jeu.
Preuves : <!-- SHA_PREUVES -->

## 1. Ce qui change pour le joueur

- **La composition de la preview** : scène plein cadre ; **HUD du rival en haut à gauche**, **HUD du joueur compact en bas à gauche** (portrait procédural, PV, Insight, Main | Pioche | Déf.) — plus aucune bande HUD traversant l’écran ; **main centrée en bas** (grandes cartes) ; **commandes et Techniques en bas à droite** ; bulle du rival en haut à droite (humeur + réplique) ; **journal dans un tiroir** ; inspection flottante ; le centre appartient au rival, aux Primaires et au Clash.
- **La salle aux bougies** : bannières des quatre familles derrière le rival, arches ouvertes sur un ciel étoilé, bougies vacillantes, plantes, table vernie à incrustations dorées ; le rival (capuche pour Maëlle) tient l’éventail de ses cartes au bord de la table. 100 % code.
- **Deux caméras conservées** : vue A frontale par défaut, vue B inclinée pour poser les cartes — **le visage du rival reste visible en vue B** ; les rangées et la main glissent d’une vue à l’autre.
- **ASSAUT / GARDE lisibles d’un coup d’œil** : bandeau rouge à pointe / bleu à bouclier sur chaque Primaire révélée, sur le plateau comme dans le face-à-face ; avant la révélation, rien du mode adverse n’est affiché.
- **Les cartes s’affrontent** : à la résolution, les deux Primaires viennent se faire face (VS, Rang), puis la chorégraphie du résultat **calculé par le moteur** se joue (charge, collision, bouclier, recul, absorption…), les blessures s’affichent, et **les deux Primaires partent à la défausse**, gagnante comprise.

## 2. Acceptance M03 (§6)

| # | Critère | Statut | Preuve |
|---|---|---|---|
| 1 | HUD rival haut-gauche, HUD joueur bas-gauche, styles comparables, PV / Insight / main / pioche / défausse, portrait / identité ; aucune barre traversant le centre | OK | captures `01`, `02`, `06` ; QA : contrôle automatique de position des HUD et de la bande centrale (x 30–70 %, y 15–62 %) à chaque Engagement / Tactique, 1280, 1920, mobile — <!-- QA_LAYOUT --> |
| 2 | Main et commandes accessibles en A/B ; plateau, visage, cartes lisibles 1280 / 1920 ; mobile sans débordement ni perte de ciblage | OK | QA : aucun chevauchement main / commandes / emplacements / HUD, pas de défilement horizontal ; 4 duels complets dont tactile 390×844 |
| 3 | ASSAUT / GARDE textuels + symboles sur chaque Primaire révélée ; aucune fuite d’une Primaire secrète ni d’une Technique privée | OK | `stance.ts` ; captures `03`, `05` ; QA : <!-- QA_STANCE --> ; audit de secrets 0 fuite |
| 4 | AA priorité différente : charge, impact, sortie du vaincu ; gagnant ensuite défaussé | OK | `clash/aa-gagne-*`, `clash/aa-perd-*`, pellicule `aa-gagne-film-*` ; nettoyage vers la défausse (compteur « Déf. ») |
| 5 | AA égalité : frappe simultanée, aucun faux gagnant, blessures simultanées, prolongation | OK | `clash/aa-egalite-*` (−9 / −9 simultanés), `clash/double-ko-*` (prolongation) ; tests `clashMotion` |
| 6 | AG : Garde gagnante (repoussé) ; Assaut gagnant avec blessure (bouclier franchi) ; Assaut gagnant SANS blessure (absorption, sans victoire défensive) | OK | `clash/ag-garde-tient-*`, `clash/ga-votre-garde-*`, `clash/ag-garde-cede-*`, `clash/ag-absorption-*` (+ pellicule) ; test : jamais « GARDE VICTORIEUSE » en absorption |
| 7 | GG neutre ; ∞ et soutiens conformes ; effets annulés visuellement annulés | OK | `clash/gg-neutre-*`, `clash/ag-garde-cede-*` (Signature ∞, P14 contre Garde 12 → 2), `clash/interferences-*` (ANNULÉ) |
| 8 | Séquenceur synchronisé ; saut / accélération / interruption / changement de vue nettoient les clones sans altérer la simulation ; boutons et focus conservés | OK | scène hors du DOM re-rendu, `stop()` sur « Passer » ; QA : aucune scène fantôme (<!-- QA_GHOSTS -->) ; `clash-shots` : aucune scène après « Passer » ; clics perdus 0 |
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

<!-- CLASH_TABLE -->

## 5. QA navigateur

<!-- QA_RESULTS -->

## 6. Tests unitaires

`npm run typecheck` : 0 erreur ; `npm test` : **91/91** — clash 29, moteur 29, IA 7, présentation 7, séquence 3, **chorégraphies du Clash 12** (six issues par vraies commandes moteur, ∞, double K.-O., Interférences, non-fuite, liste de conséquences, propriété sur 40 duels IA/IA), **bulle du rival 4** (accord, déterminisme, faits publics, aucune réplique de type « tell »).

## 7. Performance (même machine, `artifacts/qa/perf.json`)

<!-- PERF_RESULTS -->

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

