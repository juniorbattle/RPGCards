# M03.1 — P0 Sécurisation des événements + P1 QA des Techniques

**Mandat approuvé, pas un changement de règles.** Objectif : corriger le défaut signalé dans `docs/RAPPORT_M03.md` §9 et verrouiller Rupture/Dissipation côté humain avant les améliorations artistiques.

## P0 — Défaut confirmé (code M03)

- `src/game/model/types.ts` : l'interface `ClashReport` déclare les valeurs brutes `scores` et `multipliers` **en plus** des champs `publicScores` et `publicMultipliers`.
- `src/game/engine/engine.ts`, `buildReport` : le rapport brut est passé à `ctx.emit('public', 'clash', report)`. Même quand Dissimulation masque `publicScores`, l'événement public conserve ses valeurs réelles.
- `src/game/visibility/view.ts` : `publicEvents()` / `visibleEvents()` filtrent la visibilité d'événements, pas leurs champs imbriqués. `redactClash()` remplace aujourd'hui certaines valeurs par `NaN`, ce qui ne doit pas devenir notre barrière de sécurité.
- `GameState.lastClash`, `PlayerView.lastClash`, le séquenceur `src/presentation/beats.ts`, `src/presentation/clashMotion.ts`, les journaux et la QA doivent être audités avec le nouveau contrat de données.

### Solution attendue (design libre, invariants stricts)

1. **Séparer les types** : résultat de calcul interne possédant les scores/multiplicateurs réels ; rapport public sûr par construction, ne contenant **aucun champ brut secret**. Un canal privé par joueur peut donner à chaque propriétaire les informations qui lui sont légitimement accessibles, sans contaminer `public`. Renommer `ClashReport` si nécessaire pour lever l'ambiguïté.
2. Construire l'objet public **explicitement à partir d'une liste de propriétés autorisées**, et pas par `{...internalReport}` suivi de suppressions. Vérifier les objets imbriqués, détails d'effet, chaînes de débogage et sérialisation `JSON.stringify`.
3. Conserver les verdicts réellement publics qui rendent possible la présentation : vainqueur, postures révélées, GuardWin, absorption, dommages appliqués, cibles, effets publics, résultats `?` du Rang/multiplicateur en cas de Dissimulation. **Ne pas retirer les dégâts visibles ni empêcher le ClashStage de classer AA, AG, GG.**
4. Conserver les valeurs de calcul strictement dans le moteur / état privé selon besoin. Interdire tout accès IA et renderer à la structure brute. Les annotations TypeScript seules ne suffisent pas : la propriété doit être absente **au runtime** de la copie publique (tester `Object.hasOwn` et la sérialisation).
5. Examiner les autres chemins de publication, notamment `GameState.lastClash`, `viewFor()`, `publicEvents()`, `visibleEvents()`, journal, QA, replays/export potentiels. Si `lastClash` est exposé dans `PlayerView`, il doit être une **vue propre**, pas la référence de l'état brut. Pas de `NaN` comme pseudo-masquage durable.
6. Préserver l'orientation canonique Dissimulation : famille révélée par défaut, identité/Rang/Puissance masqués lorsque admissible, jamais de « désapprentissage » d'une information déjà publique. Ne pas inventer de nouvelle mécanique de camouflage ni des nombres artificiellement faux.

### Tests P0 obligatoires

- Cas ordinaire non masqué : rapport public complet sur **les champs publics autorisés**, sans champs internes indésirables.
- Dissimulation d'un soutien de Rang : `publicScores[affected] === '?'` ; aucun `scores` brut dans l'événement public, même sérialisé.
- Dissimulation d'un multiplicateur de dégâts : `publicMultipliers[affected] === '?'` ; aucun `multipliers` brut dans le public.
- Spectateur / joueur adverse / propriétaire / IA : pas d'informations plus larges que la vue autorisée ; les événements privés du propriétaire ne se retrouvent pas dans `publicEvents`.
- Aucune fuite via export JSON, log, effet ou chaîne auxiliaire. Tester que les informations **déjà officiellement publiques** restent visibles.
- Identité de résultat : mêmes décisions, mêmes PV, mêmes Insight, mêmes défausses et même résultat de duel avant/après le correctif. Tests de non-omniscience.
- Tous les tests `clashMotion`, beats et six chorégraphies M03 restent verts ; si l'API de rapport change, **adapter explicitement les consommateurs**, jamais réintroduire les scores bruts.

**Porte de sortie P0 :** typecheck + unitaires + build verts, test de fuite reproductible qui échoue avant et passe après, aucune valeur brute présente sur un `GameEvent.vis==='public'` à l'issue des cas masqués. Si P0 échoue, **ne pas commencer M03.2**.

## P1 — Rupture et Dissipation par l'interface

Créer **deux scénarios déterministes** dans `src/app/scenarios.ts`, au même standard que `clash-aa`, `clash-ag`, `doubleko`, identifiés comme **scénarios de démonstration avec rival scripté**. Le script ne crée pas une IA omnisciente en partie normale.

- **Rupture** : joueur doté de Rupture et d'Insight suffisant ; Garde victorieuse contre Assaut, **aucune cible adverse cachée admissible** au Repoussement Basic ; au moins une Secondaire adverse **active non consommée** admissible. Effectuer l'action depuis l'UI, payer le coût, choisir sa cible, valider exactement **un** Repoussement et vérifier le journal/l'état. Prévoir les interactions avec Emprise et l'absence de cumul, sans trancher un effet non ratifié.
- **Dissipation** : adversaire ayant révélé une Secondaire avec effet de préparation **persistant et légalement dissipable**, p.ex. Dissimulation. Le joueur utilise la Technique depuis la fenêtre de préparation `DISSIPATION` ; payer l'Insight, choisir/viser la cible, faire disparaître l'effet pour la durée prévue, mais ne jamais effacer une information déjà acquise et ne pas révéler des informations qui restent secrètes.
- Utiliser les **contrôles réels** et leurs `data-key` actuels après inspection du DOM, pas des appels directs à `applyCommand` pour simuler une interaction utilisateur.
- Étendre `tools/qa-browser.mjs` ou outil dédié avec `?scenario=...`, clics/touches, assertions sur événements publics, coût d'Insight, cible, résultat et journal, absence de fuite, 0 erreur console et 0 interaction perdue.
- Tester le passage vues A/B, menu secondaire, état masqué/actif, interaction au clavier et mouvement réduit si pertinent.

## P2 — Régressions et preuves

`npm run typecheck`, `npm test`, `npm run build`, `npm run qa:browser`, `npm run shots:clash` et les QA ciblées P1 si séparées. Les 4 duels navigateur M03 et les 10 scènes Clash restent valides, avec même logique métier.

Consigner SHA, graines, captures et scénarios, preuve de la disparition des champs bruts et captures Rupture / Dissipation, différences de types et usages, erreurs rencontrées. Ne pas annoncer « zéro fuite » au sens absolu : annoncer **les surfaces inspectées** et les tests exécutés.

**Livrable :** `docs/RAPPORT_M03_1.md`, tests et scénarios, journal, ADR de visibilité si nécessaire. Ne pas modifier `main`.