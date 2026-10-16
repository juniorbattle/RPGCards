# Rapport M03.1B — Confidentialité des effets de Secondaires camouflées et QA des Techniques

Mission : `docs/missions/M03_1B_CONFIDENTIALITE_EFFETS_ET_QA.md` (cadre : `M03_CONTINUATION_DEPUIS_MAIN.md`, ADR 011).
Développement **directement sur `main`** (règle de branche), départ `55a57f3` (mandat documentaire 4B ; la passe 4 — scores bruts masqués, `ca2e635` — y est déjà intégrée et n’a **pas** été refaite).
Règles : **V3.0 + delta V3.2 inchangés** — aucune règle, issue, coût, déclenchement, Rang, Insight ni destination modifié ; seules la **projection publique** et des **événements privés du propriétaire** changent.
SHA : correctif P0 `987ff27`, scénarios et outillage P1 `c9e32fe` ; preuves (QA, captures) produites sur le build de `c9e32fe` (voir §8).

## 1. Résumé

- **P0 (bloquant) — corrigé et prouvé.** Les noms d’effets, motifs d’Insight, détails et le champ `ClashReport.effects` révélaient l’identité d’une Secondaire camouflée par Dissimulation (Ferveur, Étincelle, Écaille, Ténacité, Relance, Détour, Silence, Racine, Éclaireur, Repère). Le moteur construit désormais ses payloads publics **à la source, par liste blanche** : l’origine typée de chaque effet (Primaire / Secondaire + case) décide de la publication ; une Secondaire camouflée ne publie que la **conséquence publiquement observable** d’un succès, avec une origine générique (« Secondaire Cendre masquée (case 2) »), et son propriétaire reçoit l’effet complet en privé.
- **Deux défauts voisins corrigés** (même chronologie ARB-005, déjà implémentée, appliquée partout) : pendant la fenêtre de Repoussement, la vue adverse nommait dans la défausse la carte camouflée qui venait d’être consommée ; une carte camouflée **remplacée** pendant l’engagement était nommée par l’événement public `replaced`.
- **P1 — Rupture et Dissipation jouables et vérifiées depuis l’interface** : scénarios déterministes `?scenario=rupture`, `rupture-cachee`, `dissipation` (+ `masque` pour l’effet camouflé), joués par les vrais contrôles (souris 1280×720 et toucher 390×844) avec assertions sur résultat, coût / Insight, cibles légales et refusées, zones, journal (sans doublon) et informations cachées.
- **Non-régression** : 900 duels IA/IA et 480 scénarios forcés rejoués sur le moteur d’avant (`55a57f3`) et d’après : **0 écart** de commandes, d’états (après chaque commande), de vainqueurs, de durées et de « vérité » des effets.

## 2. Reproduction AVANT correctif (moteur `55a57f3`)

Tests écrits d’abord (`test/concealment.test.ts`), exécutés sur le moteur non corrigé : **17 échecs sur 20** ; les 3 réussites sont les tests qui exigent un comportement **inchangé** (carte déjà publique avant le tour, Dissipation légale, partie sans camouflage). Extraits des fuites relevées par l’inspection récursive des surfaces adverses :

| Cas (Secondaire camouflée) | Fuite observée avant correctif |
|---|---|
| Ferveur (cas du JOURNAL passe 4) | `effect: "ferveur"` dans les événements publics, `state.lastClash.effects`, la vue ; journal « Le rival gagne 1 Insight (Ferveur) → 2/2. », « Ferveur (rival) : RÉUSSI — +1 Insight (sous limite). » ; séquence « Le rival (Ferveur) » |
| Ferveur, réserve pleine | « Le rival : gain d’Insight plafonné (Ferveur). » alors que rien d’observable n’a changé |
| Étincelle | « Étincelle (rival) : RÉUSSI — +2 dégâts fixes (avance exacte de 1) » : nom **et** écart de score exact |
| Étincelle échouée / Interférée | « CONDITION NON REMPLIE — victoire blessante avec exactement 1 point d’avance requise », « ANNULÉ — Interférée » |
| Écaille, Ténacité, Relance, Détour | nom de l’effet dans l’événement public, le rapport et le journal |
| Silence | « Braise (vous) : ANNULÉ — neutralisée par Silence » + « Silence (rival) : RÉUSSI » (même sans Primaire à neutraliser) |
| Racine | défausse de la vue adverse pendant le Repoussement : `["Ronce-1-racine", …]` |
| Éclaireur / Repère | « Éclaireur (rival) : RÉUSSI — une carte de main adverse observée » dès la Préparation |
| Remplacement | `replaced { defId: "Cendre-3-ferveur" }` publié pendant l’engagement |
| Propriété IA/IA | `effect {"player":"p1","effect":"repere",…}` sur un tour camouflé |

## 3. Politique implémentée (ADR 011, section « Implémentation M03.1B »)

| Surface | Carte publique (inchangé) | Secondaire camouflée (identité jamais publique avant ce tour) |
|---|---|---|
| Événement public `effect` | `{player, effect, status, detail}` | succès **avec conséquence observable** : `{player, effect: null, masked, family, slot, status, detail}` où `detail` ∈ « +2 dégâts fixes », « soin de N PV » (N > 0), « +1 Insight » (gain effectif sans autre motif public), « retour au sommet / sous la pioche », « effet en attente de la Primaire adverse neutralisé » (si une Primaire est réellement annulée) ; **sinon rien** (échec, annulation, observation privée, soin nul) |
| Effet de Primaire neutralisé par Silence | `detail: "neutralisée par Silence"` | Silence camouflée : statut ANNULÉ conservé, `detail` générique + `by: {player, family, slot}` ; le journal écrit « … par l’effet de la Secondaire Voile masquée du rival (case 2) » |
| Événement public `insight` | motifs nommés | motifs publics seulement ; motif générique si l’effet camouflé est l’unique explication du gain publié ; gain plafonné sans motif public : pas d’événement |
| `heal` | public | public si des PV sont rendus ; soin nul d’une source camouflée : privé |
| `ClashReport.effects` (état, événement, vue) | liste publique | **exactement** les payloads publics émis (type `PublicEffect`) |
| Défausse (`viewFor().opp.discard`) | identités | carte camouflée consommée ou remplacée : `null` jusqu’à la fin du tour (ARB-005), puis nommée |
| `replaced` | `defId` | `defId: null, masked, family` (+ privé du propriétaire) |
| Propriétaire | — | événements privés `own` : effet complet (nom, statut, motif, case), motifs d’Insight complets, soin nul, remplacement |

Les cas **sans camouflage** produisent des événements publics **identiques** à l’avant (test dédié + comparaison §5). Une carte déjà publique avant le tour, puis visée par Dissimulation, reste nommée (aucun « oubli »). Dissipation lève légalement le camouflage : les effets suivants sont nommés, l’historique masqué n’est pas réécrit, et le journal précise « ce qui a déjà été observé reste acquis ».

Présentation : `journal.ts` et `beats.ts` rendent les formes génériques et privées (« Effet de la Secondaire Cendre masquée du rival (case 2) : RÉUSSI — +1 Insight. », « [Privé] Ferveur (votre Secondaire masquée, case 2) : RÉUSSI — … ») ; la séquence affiche la forme privée au propriétaire au lieu de la forme publique ; l’infobulle de défausse du HUD suit le plateau mis en scène ; une réplique générique du rival contenant le mot « racine » a été reformulée (« Chaque appui compte. ») pour ne jamais ressembler à un indice.

## 4. Surfaces auditées et tests

`test/concealment.test.ts` (20 tests) inspecte **récursivement** (clés et valeurs, au runtime) tout ce que l’adversaire peut lire : événements publics (export spectateur, JSON), événements qui lui sont visibles, sa vue `viewFor` (rapport du Clash compris), `state.lastClash`, son journal, la séquence de résolution, la chorégraphie du Clash, la mémoire de l’IA, les réactions et répliques du rival ; marqueurs interdits : définition, identité de deck, nom, instance, nom et identifiant d’effet.

- Cas unitaires : Ferveur (seule / réserve pleine / avec Interférence réussie), Étincelle (réussie, échouée, Interférée), Écaille (soin, PV pleins), Ténacité, Relance, Détour, Silence (avec et sans Primaire à neutraliser), Racine (fenêtre de Repoussement, fin de tour), Éclaireur, Repère, carte connue avant le tour, Dissipation, camouflages des deux côtés le même tour (score caché d’un côté, multiplicateur caché de l’autre), remplacement pendant l’engagement, partie sans camouflage.
- Propriété « forcée » : chaque variante ordinaire camouflée, engagée en Rang / Dégâts / Interférence / Conservée, face à l’IA, 2 graines, propriétaire p1 puis p2 : > 200 tours camouflés, > 100 engagements, aucune fuite, jamais d’échec générique publié.
- Propriété IA/IA : 80 duels rejoués **commande par commande** ; à chaque état d’un tour camouflé, le camp du propriétaire dans la vue adverse ne contient ni l’instance ni la définition.
- Conservés : les 2 tests de la passe 4 (scores / multiplicateurs camouflés), `clashMotion`, présentation, IA non omnisciente (93 tests de la baseline, tous verts).
- QA navigateur : l’audit de secrets (`tools/browser.mjs`) vérifie en plus, à chaque décision des 4 duels, qu’une Secondaire du rival camouflée n’est nommée ni sur son terrain, ni dans son HUD, sa bulle, la scène du Clash, ni dans les lignes de journal / de séquence qui le concernent.

## 5. Comparaison moteur avant / après (règles inchangées)

Scripts hors dépôt (bloc-notes de session) ; arbre `55a57f3` en worktree détaché.

| Banc | Volume | Écarts |
|---|---|---|
| Duels IA/IA (défaut ; Voile/Voile avec Dissipation ; Voile/Voile sans) × 3 paires de profils × seeds 1–100 | 900 duels, 67 598 commandes, 67 598 états, 11 130 tours | **0** : mêmes commandes, mêmes états après chaque commande (hors `maskedDiscards`, `racineHiddenSlot`, `lastClash.effects` et compteur `eventSeq`), mêmes vainqueurs (900/900), même flux d’événements hors kinds republiés, même « vérité » des effets / Insight / soins / remplacements / rapports |
| Scénarios forcés (15 variantes ordinaires camouflées × 4 modes × 4 graines × 2 propriétaires), commandes produites sur le nouveau moteur et rejouées sur l’ancien | 480 tours, 2 831 commandes | **0** |

Effets camouflés effectivement rencontrés (événements privés du propriétaire) — duels IA/IA : Éclaireur 30, Repère 14, Ferveur échouée 5, Détour réussi 4 / échoué 2, Étincelle réussie 1 ; scénarios forcés : Éclaireur 32, Repère 32, Étincelle 2 réussies / 9 échouées, Ferveur 2 / 8, Détour 6, Silence échouée 8, Relance 2. Formes génériques publiées : « +2 dégâts fixes », « +1 Insight », « retour au sommet de la pioche ». Les cas rares (Écaille, Ténacité, Racine, Silence réussie) sont couverts par les tests unitaires, qui vérifient aussi les PV, l’Insight et les zones attendus.

## 6. Inférences restantes (conséquences des règles, non masquées)

Aucune donnée brute ni nom n’est publié, mais certaines **conséquences publiques** permettent, par raisonnement, de retrouver une carte camouflée. Elles découlent des règles V3.0 (PV, Insight, zones et résultats d’Interférence sont publics) et n’ont pas été altérées :

- dégâts fixes inexpliqués (+2) ⇒ Étincelle, donc victoire d’exactement 1 point ⇒ score camouflé ;
- PV perdus ⇒ multiplicateur camouflé (`(12 − 6) × ? = 24`, déjà noté passe 4) ;
- soin observé ⇒ Écaille ; gain d’Insight sans motif public ⇒ Ferveur ;
- retour au sommet / sous la pioche ⇒ Relance / Ténacité ;
- succès ou échec d’une Interférence ⇒ Rang imprimé ≥ / < Rang de la cible ;
- effet de Primaire annulé par une Secondaire masquée ⇒ Silence ;
- fin du tour : la carte réellement défaussée devient publique (ARB-005).

La sécurité n’est donc **pas « totale »** : elle couvre les surfaces listées au §4 ; les inférences ci-dessus restent possibles par construction des règles.

## 7. P1 — QA des Techniques par l’interface

Scénarios (`src/app/scenarios.ts`, rival **scripté**, identifié comme démonstration, jamais présenté comme l’IA) et tests moteur (`test/scenarios.test.ts`, 4 tests) :

| Scénario | Situation | Vérifié |
|---|---|---|
| `rupture` | Rupture équipée, 2 Insight ; Ronce IV en GARDE contre l’ASSAUT Cendre II du rival qui CONSERVE Astre III ; aucune cible cachée | rival verrouillé avant le joueur, déclaration invisible avant la révélation commune ; cible proposée (case active), armement, fenêtre `REPEL` `rupture` à cible unique, **un seul** Repoussement, Astre III en main du rival, Insight 2 − 2 + 1 = 1, journal (3 lignes) |
| `rupture-cachee` | même duel, le rival garde une Secondaire **cachée** | Repoussement Basic proposé sur la cachée seulement ; clic sur la case active **refusé** (message) ; Rupture « CONDITION NON REMPLIE », coût non remboursé ; carte cachée jamais nommée |
| `dissipation` | le rival révèle Dissimulation + Éclaireur (masqué) ; Dissipation équipée, 1 Insight | avant : case masquée, famille visible, aucune identité dans le DOM ni l’export public ; cible illégale (la carte masquée) refusée ; Dissimulation visée ; coût 1 ; carte restaurée (plateau + journal) ; ligne masquée de l’historique conservée ; mémoire du rival (observation déjà faite) **intacte** |
| `masque` | le rival camoufle Ferveur et l’engage en Dégâts | à chaque temps de la séquence (avancée temps par temps), aucune mention de la carte (DOM, scène du Clash, infobulles) ; gain d’Insight et dégâts du rival visibles ; seule la défausse de fin de tour la nomme |

Résultats navigateur : voir §8 (`npm run qa:techniques`, `artifacts/qa/qa-techniques.json`, captures `screenshots/qa/m03-1b/`).

## 8. Commandes exécutées et résultats

Machine : Intel Xeon 2,10 GHz, 4 cœurs, 16 Go, Linux, Node 22.22.0 ; Chromium headless, rendu **SwiftShader (CPU)**.

| Étape | Commande | Résultat |
|---|---|---|
| Baseline au départ (`55a57f3`) | `npx tsc --noEmit`, `npx vitest run`, `npm run build` | 0 erreur ; **93/93** ; build OK |
| Reproduction (tests écrits avant le correctif, moteur `55a57f3`) | `npx vitest run test/concealment.test.ts` | **17 échecs / 20** (les 3 réussites = comportements devant rester inchangés) |
| P0 (`987ff27`) | `npm run typecheck`, `npm test`, `npm run build` | 0 erreur ; **113/113** (93 + 20) ; build OK |
| Comparaison avant / après | scripts hors dépôt (§5) | **0 écart** sur 900 duels / 67 598 commandes et 480 tours forcés / 2 831 commandes |
| P1 (`c9e32fe`) | `npm run typecheck`, `npm test`, `npm run build` | 0 erreur ; **117/117** (+ 4 scénarios) ; build OK |
| QA navigateur (build de `c9e32fe`) | `npm run qa:browser` | **4/4 duels complets** : souris 1280 (13 tours), clic 1920 en mouvement réel (14 tours, 13 séquences regardées, 10 scènes de Clash), clavier 1280 (10 tours), tactile 390×844 (19 tours) ; vues 211 contrôles / 0 écart ; postures 101 / 0 ; composition 0 écart ; 0 scène fantôme ; **0 fuite** (audit élargi aux cartes camouflées du rival) ; 0 erreur console ; 0 clic perdu — `artifacts/qa/qa-browser.json` |
| QA des Techniques (build de `c9e32fe`) | `npm run qa:techniques` | **8/8 parcours** (4 scénarios × souris 1280×720 / toucher 390×844), 0 erreur console — `artifacts/qa/qa-techniques.json`, captures `screenshots/qa/m03-1b/` (22) |

**Échec d’outillage rencontré puis corrigé.** Une première exécution de `qa:techniques` a échoué sur `masque · souris-1280` : « temps effet / Insight non montrés ». Cause : la séquence était échantillonnée en temps réel et une capture d’écran sous SwiftShader dure plus qu’un temps de la séquence ; le temps « Insight » est passé entre deux échantillons. Le produit n’était pas en cause (même parcours vert en tactile et à l’exécution précédente). Correctif : la séquence est mise en pause et avancée **temps par temps** par le crochet QA (`pauseSequence` + `advanceBeat`) — contrôle déterministe ; le rythme réel reste couvert par le duel 1920 de `qa:browser`.

**Captures** (`screenshots/qa/m03-1b/`) : `rupture-*-1-ciblage` (cible Rupture armée), `rupture-*-2-repoussement`, `rupture-cachee-*-1-cible-refusee`, `dissipation-*-1-masquee` / `-2-levee`, `masque-*-effect` / `-insight` (temps de la séquence), `*-journal` (tiroir ouvert) — souris 1280×720 et tactile 390×844.

## 9. Écarts restants et points à arbitrer

- **ARB-005 / ARB-005b** (proposés, non ratifiés) : chronologie « carte camouflée défaussée → nommée à la fin du tour », désormais appliquée aussi au remplacement pendant l’engagement et à la fenêtre de Repoussement ; si l’opérateur préfère publier aussitôt une carte remplacée (sortie du périmètre de Dissimulation), le changement est local (`applyCommit`).
- **Inférences** du §6 : assumées comme conséquences des règles ; les supprimer exigerait de changer ce qui est public (PV, Insight, zones), donc les règles — non fait.
- **Archive de replay** (`record()`, commandes des deux joueurs) : enregistrement complet par nature, exposé seulement par le crochet QA (`?qa=1`) ; ce n’est pas un export public. L’export public est `publicEvents()`, audité.
- Les cas rares d’effets camouflés (Écaille, Ténacité, Racine, Silence réussie) n’apparaissent presque jamais en duel IA/IA ; ils sont couverts par les tests unitaires dédiés, pas par la comparaison de masse.
