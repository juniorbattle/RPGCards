# Rapport de la release candidate du mode Aventure (M10-F) : `0.10.0-rc.1` proposée

Mission : `docs/m10/FEUILLE_DE_ROUTE_M10.md`, section M10-F (QA d'ensemble, équilibrage, migration, RC Aventure), lancée
par le responsable le 2026-10-25 (fiche de la Garde, S1), en commençant par T1 (fiche de l'avenant 08). Exécution : session
locale du 2026-10-25, développement directement sur `main`, mesures sur le poste du responsable (Windows, Chrome,
**Radeon 780M** et **RTX 4060** avec `--force_high_performance_gpu`).

Règles : **V3.0 + delta V3.2 + avenants 07 et 08 et amendement 1 (`V3.0+delta-V3.3.2`), inchangées pendant M10-F** :
aucun fichier de `src/game/` n'a changé (`git diff 377f7cc -- src/game` vide) ; l'annexe de calibrage n'a pas changé
(`src/aventure/paliers.ts` : seul un libellé d'affichage, « champions »). Secrets : aucune surface publique modifiée (ADR 011).
Version : **`0.10.0-rc.1` proposée, pas posée** : `package.json` et `src/product/version.ts` portent encore `0.8.0-rc.1` ;
le numéro est une décision du responsable (fiche, V1). Le poser change deux lignes et l'étiquette `gameVersion` des
sauvegardes ; aucune migration (schémas inchangés : `lqv.save` 2, `aventure/1`).

## 1. Le lot M10-F — fait

| Étape | Statut | Preuve |
|---|---|---|
| T1 : pilote de QA moins naïf (outil seulement) | **OK** (`890c1f1`, passe 119) | parcours E de `qa:product` vert (série en 6 duels) ; §2 |
| Textes relus, aide du mode Aventure | **OK** (`43a62d9`, passe 120) | §3 |
| Parcours complet du prologue au titre, reprise à chaque scène | **OK** (`43a62d9`) | `test/m10f.test.ts`, §4 |
| Équilibrage mesuré par palier (objectifs de l'annexe, ex-A-10) | **OK, écarts signalés, rien recalibré** | §5, `artifacts/qa/m10f/equilibre/` |
| Contrôles : migration, secrets, pixel près, performances | **OK** (`d05e525`, passe 121 ; campagne, passe 122) | §6 |
| Campagne de QA complète sur les deux GPU | **OK, verte au premier passage** (passe 122) | §7 |
| Version `0.10.0-rc.1` | **préparée, décision au responsable** | ci-dessus |

## 2. T1 — le pilote de QA

Depuis les avenants 07 et 08, le pilote de QA (`tools/duel-driver.mjs`) ne gagnait plus la série du Tournoi du Quai
(`qa:product`, parcours E : 12 défaites de suite contre Maëlle, plafond de 16 duels). Mesure sur le moteur pur
(`tools/t1-pilote.ts`, 300 duels par manche) : l'ancien pilote gagnait 37 % contre Kaï, **6 %** contre Maëlle, 22 % contre
Sélène (série en 16 duels : **43 %**). Garder seulement la Signature faisait pire (série 9 %) : le handicap venait aussi
d'un engagement prévisible et de choix tactiques naïfs.

**Le pilote demande désormais l'IA « équilibré » du jeu pour l'engagement, la révision et les choix tactiques**, sur la
**vue autorisée du joueur** (sa projection et sa mémoire tirée des seuls événements visibles par lui), dans Node, puis joue
le choix **par l'interface** (gestes et audits inchangés) : la Signature gardée tant qu'elle ne vaut pas son coût, le mode
tiré avec la graine du duel (rejouable). Il gère aussi la fenêtre de révision du joueur (avenant 08, amendement 1), où
l'ancien restait bloqué. Mesure : Kaï 70,7 %, Maëlle 43,0 %, Sélène 57,7 % ; série en 16 duels : **99,88 %**. Le jeu ne
change pas ; le plafond de 16 duels est gardé.

## 3. Textes et aide

Relecture de tous les textes affichés du mode Aventure (écriture épicène sans point médian ; règles à jour ; textes
périmés) ; aucune contradiction avec les avenants 07 et 08, aucun point médian. Corrigé : les mentions « prototype »
encore affichées (onglet, écran titre, bandeau du duel, HUD) ; le chapitre affiché brut à l'écran titre (« Champion »,
masculin, après le titre) ; « Nom du duelliste » ; les rôles non accordés (« Tessa (cadet) », « Mère Aubépine (chef) ») ;
« Parler à le héraut » ; « Le Couronne de Ronce » ; des identifiants bruts (« Cendre affilie », « brasDroit-Cendre ·
defaite ») ; « Rang 3 » ; « Deck légal (règle R-AV, avenant M10-A) ». **Aide** complétée (deck et Collection, PV qui
montent, défaite sans perte, Salle des Bannières, Championnat, sauvegarde). Détail : journal, passe 120. **Laissé au
responsable** (fiche, X1) : « le chef de la Ronce », « Votre chef est vaincu » quand la cheffe est Mère Aubépine ou Ilse.

## 4. Parcours complet du prologue au titre

`test/m10f.test.ts` (dans `npm test`) : pour **chacune des quatre familles d'accueil**, le prologue, la maison, les trois
autres voies, puis le Championnat jusqu'au **titre** ; chaque duel joué jusqu'au bout sur le moteur réel par l'IA
« équilibré » du joueur contre le profil de l'adversaire, avec la logique de l'application autour des duels
(`src/aventure/fin.ts`) ; **après chaque scène, la sauvegarde est écrite, relue et le parcours continue sur la copie
relue** ; **chaque duel est sauvegardé au milieu, contrôlé et repris par rejeu** (même empreinte) ; déterminisme vérifié
(même graine, même sauvegarde octet pour octet).

| Famille d'accueil | Duels | Défaites | Scènes relues | Duels repris au milieu | Tours par duel | PV finaux |
|---|---:|---:|---:|---:|---:|---:|
| Cendre | 27 | 8 | 97 | 27 | 9,7 | 131 |
| Voile | 26 | 7 | 91 | 26 | 9,7 | 128 |
| Ronce | 31 | 12 | 111 | 31 | 10,2 | 143 |
| Astre | 32 | 13 | 113 | 31 | 11,4 | 146 |

Au navigateur, les parcours de l'aventure (`qa:aventure`, `qa:maison`, `qa:voies`, `qa:vivante`, `qa:championnat`)
couvrent l'interface des mêmes étapes (§7).

## 5. Équilibrage mesuré

Tableau complet : `artifacts/qa/m10f/equilibre/ecarts-annexe.md`. Mesure reproductible : identique, au chiffre près, à
celle de l'amendement 1 (même moteur). Contre l'annexe validée (mesurée sous V3.2) :
- **voie directe** : plus dure à partir de la deuxième famille (cadets et bras droits −6 à −10 points ; chefs 45 à 48 % ;
  Championnat 48 à 49 %) ; le premier chef plus facile (+6) ; aucun duel principal sous 45 % ;
- **voie entraînée** : égale ou plus favorable (chefs 64 à 90 %, Championnat 87 à 88 %) ;
- **Duel standard** : inchangé depuis l'amendement 1.

Ces écarts sont ceux que le responsable a gardés (fiches V3.3, E3 et E1) ; ils reviennent dans la fiche de la RC (E1) pour
confirmation. **Aucune valeur n'a été changée.**

## 6. Contrôles

| Contrôle | Résultat | Preuve |
|---|---|---|
| Mode standard intact : jeu par défaut au pixel près contre le build de départ `377f7cc` (scène des quatre rivaux, duel complet contre Maëlle, écran Rencontres ; 1280 et 1920) | **identique au pixel près sur la 780M et sur la RTX 4060** (0 pixel), témoins détectés | `artifacts/qa/m10f/campagne/l5-identique-{780m,rtx}.json` |
| Secrets (ADR 011) | tests de non-fuite dans `npm test` ; `qa:browser` 5/5 sur chaque GPU avec 0 fuite ; contre-épreuve des audits **4/4** (annonce admise, mode du rival et carte cachée injectés détectés) | `artifacts/qa/v33/audits-negatifs.json` |
| Profils de la RC 0.8 et sauvegardes d'avant V3.3 | **13/13** : profil réel de la RC 0.8 (build `b128bd9`) gardé, son duel en cours refusé avec sa raison puis recommencé sous `V3.0+delta-V3.3.2` ; aventure écrite par le code de `f7339ad` gardée, son duel refusé et retiré ; aucun mode ne touche la sauvegarde de l'autre | `tools/m10f-migration.mjs`, `artifacts/qa/m10f/migration.json`, `screenshots/qa/m10f/migration/` |
| Performances de la ville (ville en rangs, images approuvées, chaque îlot parcouru 4 s) | médiane **6,1 ms** partout (165 images/s, plafond de l'écran) ; p95 6,2 ms, sauf la 780M en 1920 : 12,2 ms au Quai, au Parvis et aux Ruelles ; pire image 24,2 ms (780M, Ruelles, 1920) ; 161 à 242 appels de dessin, ≈ 5 k triangles, 54 à 58 textures, îlot prêt en 0,8 à 1 s | `artifacts/qa/m10f/campagne/perf-ville-*.json` |
| Performances du duel (`perf:play`, 1280 et 1920) | médiane **6,1 ms** sur les deux GPU ; p95 6,2 ms (780M), 10,1 et 7,7 ms (RTX) | `artifacts/qa/m10f/campagne/perf-play-*.json` |

## 7. Campagne de validation (build de `d05e525`, `tools/m10f-campagne.sh`)

Campagne complète du jalon, **en série et seule sur la machine**, 2026-10-25 de 06:13 à 07:29 UTC, Chrome avec
`LQV_GPU=1`, Radeon 780M puis RTX 4060 (`--force_high_performance_gpu`), 1280 × 720 et 1920 × 1080. **53 étapes, toutes
vertes au premier passage, console sans erreur.** Synthèse : `artifacts/qa/m10f/campagne/synthese.md`
(`node tools/m10f-synthese.mjs`) ; captures hors du dépôt (comme aux jalons précédents).

| Parcours | Radeon 780M (1280 / 1920) | RTX 4060 (1280 / 1920) |
|---|---|---|
| Jeu par défaut au pixel près | identique | identique |
| `qa:demo` | 30/30 · 30/30 | 30/30 · 30/30 |
| `qa:aventure` | 48/48 · 48/48 | 48/48 · 48/48 |
| `qa:maison` | 29/29 · 29/29 | 29/29 · 29/29 |
| `qa:voies` | 62/62 · 62/62 | 62/62 · 62/62 |
| `qa:vivante` | 15/15 · 15/15 | 15/15 · 15/15 |
| `qa:championnat` | 13/13 · 13/13 | 13/13 · 13/13 |
| Annonce V3.3 (`v33-annonce`) | 10/10 · 10/10 | 10/10 · 10/10 |
| Révision V3.3 (`v33-revision`) | 8/8 · 8/8 | 8/8 · 8/8 |
| `qa:accessoires` | OK | OK |
| `qa:browser` | 5/5 duels, 0 fuite | 5/5 duels, 0 fuite |
| `qa:product` | 9/9 (A 11, B 4, C 5, D 6, **E 18**, F 10, G 4, H 3, I 6) | 9/9 (idem) |
| `qa:rc` salle, bar, arène | 9/9 · 9/9 · 9/9 | 9/9 · 9/9 · 9/9 |
| `qa:techniques` | 8/8 | 8/8 |

Porte de démarrage : `npm run typecheck` 0 erreur · `npm test` **456/456** · `npm run build` OK.

## 8. Connu / à faire

| Sujet | État | Suite |
|---|---|---|
| Numéro de version | `0.10.0-rc.1` proposé, non posé | fiche, V1 |
| Voie directe plus dure que l'annexe (familles 2 à 4) | mesuré, gardé deux fois | fiche, E1 |
| « chef » générique pour les cheffes ; « la Braise du quai » | relevés, non changés | fiche, X1 et X2 |
| Aventure : un duel non vérifiable est retiré sans proposer de le recommencer (le standard le propose) | constaté au contrôle de migration | fiche, T1 |
| Heure de ville (V1 de la fiche M10-E) | pas encore jouée par le responsable | quand il le souhaite, sur ce build |
| Pilote de QA | joue avec l'IA « équilibré » du joueur : mesure de l'interface, pas du plaisir de jeu | — |

## Réception — 2026-10-25

Sur la fiche d'arbitrages de la RC (9 décisions, toutes sur l'option recommandée, sans note ; tableau
`docs/FICHE_ARBITRAGES_M10F.md`) : **RC du mode Aventure reçue** (R1), numérotée **`0.10.0-rc.1`** (V1) ; T1 reçu (R2) ;
**annexe de calibrage gardée telle quelle** (E1) ; textes et aide reçus (X3) ; « cheffe » accordée dans les phrases
génériques (X1) ; « la Braise du quai » gardé (X2) ; un duel d'aventure non vérifiable propose désormais de le recommencer,
comme le jeu standard (T1) ; **M10 clos, suite : reprise de M09** (S1). Version, X1 et T1 appliqués en passe 124.

## 9. Fiche d'arbitrages

<https://claude.ai/artifact/UfZ5K4GnfarDa1vhLFUua5> (privée ; collection `decisions`, vide à la publication, lecture
vérifiée) : R1 réception de la RC, R2 T1, V1 numéro de version, E1 équilibre de la voie directe, X1 à X3 textes, T1
reprise d'un duel refusé dans l'aventure, S1 suite.
