# Avenant M10-A — preuve hors dépôt et mesures d'équilibrage (2026-10-20)

> **Appliqué sur `main` le 2026-10-20 (passe 77, ADR 033)**, après la décision du responsable sur l'ARB-M10-02, avec deux écarts : catalogue neutre à part (`CATALOG` inchangé) et forme R-AV contrôlée par le moteur ; les 20 erreurs de typage du §1 sont corrigées (carte neutre et portrait gris dessinés par code).

**Statut : RÉFÉRENCE / PREUVE** (gouvernance : « constate un fait »). Rien de ce qui suit n'est appliqué au moteur de
`main` : le patch a été appliqué **dans un worktree temporaire détaché**, hors du dépôt poussé, pour répondre par des
faits à l'arbitrage bloquant **ARB-M10-02** (faut-il toucher au fichier du Clash pour faire jouer les neutres ?) et
chiffrer l'équilibrage proposé (A-10). Le patch est conservé ici : [`patch-m10a-neutres.diff`](patch-m10a-neutres.diff)
(`git apply docs/m10/patch-m10a-neutres.diff` sur `b622fa7` ou suivant, **seulement après ratification**).

## 1. Le patch (133 lignes ajoutées, 13 retirées, 7 fichiers)

| Fichier | Changement |
|---|---|
| `src/game/catalog/cards.ts` | `CardDef.family: Family \| null` ; quatre définitions `neutre-1` à `neutre-4` (Puissance 3/6/9/12, sans famille ni effet) ajoutées au catalogue |
| `src/game/engine/clash.ts` | **deux gardes** `sec.family !== null &&` (soutien Rang, coefficient de Dégâts) |
| `src/game/engine/engine.ts` | deck explicite `pc.deck ?? buildDeck(...)` ; affinité publique gardée de même |
| `src/game/engine/invariants.ts` | taille du deck = celle de la création (17 ou 16) ; unicité des seules identités familiales |
| `src/game/model/types.ts` | `signature: Family \| null`, `deck?: string[]`, `signatureFamily` et `RevealedTactic.family` nullables |
| `test/neutres.test.ts` | 5 tests (composition, affinité, 300 duels sans Signature, vue adverse, mixte contre un chef) |
| `tools/m10a-sim.ts` | simulation IA contre IA par palier |

**Effet sur le standard** : avec le patch, **les 305 tests du dépôt passent sans modification** (dont les hashes de
replay des fixtures, les tests de secrets ADR 011 et de l'IA) ; les 5 tests neutres passent (commande :
`npx vitest run`, worktree de `b622fa7` + patch, 310/310). Aucun résultat de Clash d'une carte standard ne peut
changer : la garde ne s'active que pour `family === null`.

**Ce qu'il reste à faire pour l'interface** (inventaire mesuré : `npx tsc --noEmit` sur le worktree patché, 20 erreurs
de typage dans 10 fichiers hors moteur) : `src/art/cardArt.ts` (5 : illustration d'une carte sans famille),
`src/app/controller.ts` (3 : couleurs de la Signature du siège), `src/aventure/deck.ts` (3) et `registre.ts` (1),
`src/presentation/board.ts` (2) et `cardView.ts` (1), `src/shell/shell.ts` (2), `src/product/deck.ts` (1),
`src/game/visibility/view.ts` (1), `src/game/engine/engine.ts` (1 : origine générique publique d'un effet). C'est le
travail de M10-A côté rendu (carte neutre blanche/grise dessinée par code, siège sans Signature).

## 2. Deux cas de règle révélés par la preuve (à ajouter à l'avenant A-2)

- **Prisme** (« +1 d'affinité au coefficient même avec une Primaire d'une autre famille ») : avec une Primaire neutre,
  le patch garde le texte : **+1** (coefficient 3 pour Prisme II). Recommandé : garder (Prisme ignore la famille par
  nature).
- **Convergence** (« avec une Primaire d'une autre famille : ×6 ») : une Primaire neutre est traitée comme « d'une autre
  famille » : **×6**. Recommandé : garder (lecture « pas la même famille ») ; alternative : ×4 (une neutre n'a pas de
  famille, donc pas d'« autre famille »).

## 3. Mesures d'équilibrage (IA contre IA, moteur patché)

Commande : `npx tsx tools/m10a-sim.ts 300` (worktree patché), 300 duels par ligne, graines 1001 à 1300, 200 tours au
plus. **Ce sont des IA, pas des joueurs** : un ordre de grandeur pour régler les paliers, pas une mesure de plaisir.

| Matchup (profils d'IA p1 / p2) | Victoires p1 | Tours (moyenne / médiane) | Prolongations |
|---|---:|---:|---:|
| Inaugural : 16 neutres contre 16 neutres, PV 60/60 (équilibré / offensif) | 67,0 % | 9,1 / 9 | 16,0 % |
| Inaugural, miroir de profil (équilibré / équilibré) | **51,7 %** | 10,7 / 11 | 18,7 % |
| Cadet du Voile : joueur 12 N + 4 Basics Voile, PV 90, contre cadet 12 N + Voile dont III Dissimulation, PV 80 (équilibré / lecteur) | **57,3 %** | 15,9 / 16 | 20,0 % |
| Bras droit du Voile : joueur 12 N + Voile (III) contre Sélène 12 N + Voile (III, IV), PV 100 (équilibré / lecteur) | **46,3 %** | 18,3 / 18 | 22,3 % |
| Chef du Voile : joueur 12 N + Voile (III, IV), **sans Signature**, contre Ilse 12 N + 4 variantes + Miroir du Voile, **PV 110** | 23,3 % | 17,0 / 17 | 12,3 % |
| Chef du Voile, **PV 90** | **36,7 %** | 15,8 / 15 | 10,7 % |
| Référence standard : 17 cartes, toutes variantes, PV 90/90 (équilibré / offensif) | 74,3 % | 9,8 / 10 | 9,7 % |

**Lecture :**
- **Le duel inaugural à armes égales est équilibré** (51,7 % à profil égal) et court (≈ 11 tours ; la cible proposée
  était 6 à 10 : des PV de 50 la rapprocheraient, à mesurer).
- **Les lieutenants tombent dans la cible** proposée (45 à 60 %) **sans aucun avantage de PV** autre que les fiches.
- **Le chef à 110 PV est trop dur** (23 % contre une cible de 35 à 45 %) ; **à PV égaux (90), il revient à 37 %** :
  la Signature et les quatre variantes suffisent à en faire le défi le plus dur. Conclusion proposée : **PV du chef = 90**
  (comme le joueur) ; la difficulté vient du deck, pas des statistiques (ADR 031, mission §IV). Le prototype applique
  désormais 90 aux chefs (`src/aventure/modele.ts`).
- Les duels Aventure sont plus longs que le standard (16 à 18 tours contre 10) : moins de dégâts sans affinité et sans
  Signature. À surveiller (fatigue) ; levier possible sans toucher aux règles : PV des personnages.

### 3 bis. Durée du duel inaugural selon les PV (même méthode, 300 duels par ligne)

| Inaugural, 16 neutres contre 16 neutres (profils p1 / p2) | Victoires p1 | Tours (moyenne / médiane) | Prolongations |
|---|---:|---:|---:|
| PV 60/60 (équilibré / équilibré) | 51,7 % | 10,7 / 11 | 18,7 % |
| PV 60/60 (équilibré / offensif) | 67,0 % | 9,1 / 9 | 16,0 % |
| **PV 50/50 (équilibré / équilibré)** | **49,0 %** | **8,6 / 9** | 22,0 % |
| PV 50/50 (équilibré / offensif) | 61,7 % | 7,6 / 7 | 19,3 % |
| PV 40/40 (équilibré / équilibré) | 53,3 % | 7,0 / 7 | 24,7 % |
| PV 40/40 (équilibré / offensif) | 61,7 % | 6,2 / 6 | 25,3 % |

Les lignes à 60 PV redonnent exactement les chiffres du §3 (simulation déterministe). **Recommandation : 50 PV pour le
duel inaugural à neutres** (≈ 9 tours, dans la cible de 6 à 10, équilibré). Le prototype garde 60 PV tant qu'il joue le
deck de prêt (Basics et Signature : des duels plus courts). Commande : un script de simulation de même forme que
`tools/m10a-sim.ts` (PV 60, 50, 40), sur le même worktree patché.

## 4. Ce que cela change pour la fiche

- **ARB-M10-02** : le coût réel est connu : deux gardes dans `clash.ts`, aucun test existant modifié, aucun résultat
  standard changé. Recommandation maintenue : autoriser.
- **ARB-M10-09** : PV des chefs ramenés à 90 (mesure ci-dessus) ; duel inaugural à **50 PV** (≈ 9 tours, §3 bis).
- **A-2** : Prisme et Convergence avec une Primaire neutre (§2) à confirmer.
