# M03.1B — Confidentialité des effets de Secondaires camouflées + QA

**Mandat approuvé.** Exécuter sur le **main actuel** de RPGCards, conformément à la Règle de branche. Le correctif des scores bruts a été fusionné (passe 4, 93 tests rapportés) : **ne pas le réimplémenter**, s'en servir comme baseline.

## P0 — Fuite indirecte établie

Lorsque **Voile III — Dissimulation** masque une autre Secondaire active, ses **identité, Rang et Puissance** sont secrets jusqu'à la fin du tour selon l'application légale du camouflage ; sa **famille reste visible** (contrat §13.2 et delta V3.2). Les données déjà vues avant le camouflage ne peuvent pas être effacées de la mémoire adverse.

La passe 4 reproduit un cas : Dissimulation protège **Cendre III — Ferveur**, engagée en amplification de Dégâts ; l'adversaire voit pourtant dans le journal public « Ferveur : RÉUSSI » et « gain d'Insight (Ferveur) ». Le nom d'un effet unique suffit à retrouver l'identité. La même surface existe pour Étincelle, Écaille, Ténacité, Relance, Détour, Silence, Racine et d'autres effets. La mention d'une variation numérique d'effet peut aussi trahir des statistiques ; ne jamais inventer ou afficher un nombre secret.

**Surfaces à inspecter :**
- `src/game/engine/engine.ts` : `out.effects` → `ctx.emit('public','effect',...)`, `out.insightReasons` dans les événements publics `insight`, `buildReport().effects` et `state.lastClash` ;
- `src/game/engine/clash.ts` : origine/slot/identité de chaque effet et contribution pour établir **si sa source est la Secondaire camouflée**. Ne pas censurer des effets d'une Primaire ou d'une autre carte non camouflée par simple rapprochement de noms ;
- `src/game/model/types.ts`, `src/game/visibility/view.ts`, `src/game/visibility/journal.ts`, `src/presentation/...`, IA, QA, export/replay/JSON et éventuels strings `detail`/motifs d'Insight.

## Politique de visibilité approuvée (sans nouveau gameplay)

- **Un effet public reste observable dans ses conséquences**, conformément aux règles : dégâts effectivement reçus, PV/Insight, Garde/Assaut, réussite d'une Interférence, carte déplacée vers une zone devenue publique, annulation, victoire, etc. **Ne cacher ni modifier les résultats**, et ne prétendre que rien ne s'est produit.
- **L'origine exacte** (identifiant de carte, nom de variante/effet unique, rang, puissance, nombre calculé masqué) d'une **Secondaire encore légalement camouflée** est réservée à son propriétaire, lorsqu'elle n'était pas déjà connue publiquement. Le public reçoit un événement descriptif générique du type « un effet de la Secondaire [famille visible] masquée en case N s'applique », associé aux conséquences légalement visibles, sans nom identifiant ni texte auxiliaire trahissant l'identité.
- **La carte Dissimulation elle-même reste publiquement identifiée** quand révélée ; ne pas cacher le nom de l'effet **Dissimulation** ou une autre source déjà publique. Ne pas « désapprendre » une carte révélée au tour précédent : maintenir les informations déjà connues.
- Appliquer le filtrage **au point de création de la donnée publique**, en construisant des payloads sûrs par liste de propriétés autorisées plutôt qu'en diffusant l'objet privé puis en masquant l'UI. Événements privés du propriétaire possibles, strictement réservés ; `publicEvents()`/exports/replays/historique `GameState.lastClash` ne doivent pas contenir les noms cachés.
- Les identifiants internes d'effets et `detail` peuvent contenir la même fuite que `effect` ou `reasons`. **Les chaînes et tableaux imbriqués doivent être inspectés récursivement au runtime**. Éviter une substitution globale naïve de « Ferveur » dans des chaînes ; représenter l'effet de façon structurée avec une origine typée et une présentation publique ou privée dérivée du contexte légal.
- Si des **conséquences publiques** permettent logiquement de déduire une valeur secrète (p. ex. PV perdus), cette inférence n'est pas une fuite de données brutes, mais une conséquence des règles actuelles. La documenter ; ne pas altérer PV/dégâts/résolution pour la supprimer.
- Ne pas fixer silencieusement l'arbitrage ARB-005 (publication de l'identité à la fin du tour/défausse) : appliquer la chronologie autorisée par les règles actuelles, et documenter tout conflit résiduel. Aucune annonce prématurée de l'identité ; aucune réécriture rétroactive de l'historique public.

## Validation P0 reproductible

1. Reproduire le bug **avant** fix : Cendre III Ferveur + Dissimulation, primaire Cendre IV gagnante, soutien Dégâts ; vérifier `publicEvents`, `visibleEvents(..., adverse)`, `viewFor(..., adverse).lastClash.effects`, journal, export `JSON.stringify`. Le nom Ferveur ne doit pas être inféré par un `effect` public.
2. Même scénario **après** fix : pas d'identité/nom unique/rang/puissance/raison de gain identifiante dans **aucune** surface publique, y compris rapports et chaînes secondaires. L'effet, son résultat public et le gain réel d'Insight restent corrects.
3. Tests supplémentaires : Étincelle (valeur exacte), Écaille/Ténacité/Relance/Racine, Détour/Silence, effets échoués/annulés, rang et dégâts masqués simultanément si légalement réalisable. Tester une carte déjà connue avant le tour et Dissipation qui annule légalement le camouflage (pas d'oubli rétroactif).
4. Comparer moteurs avant/après avec seeds et commandes identiques : PV, Garde, Insight, rang, multiplicateurs internes, effets réels, defausses, vainqueur, RNG et durée **inchangés**. Ne modifier que la projection publique ou les événements privés explicitement autorisés.
5. Conserver les deux tests P4 des scores camouflés + les tests `clashMotion`, UI et IA non omnisciente. Les payloads publics doivent être sûrs **au runtime**, pas seulement selon TypeScript. Cas sans camouflage : information publique inchangée.
6. **Porte :** `npm run typecheck`, `npm test`, `npm run build` + tests de non-fuite ciblés verts. Tant qu'une fuite de carte camouflée subsiste, ne pas ouvrir M03.2.

## P1 — QA navigateur des Techniques encore non couvertes

Créer scénarios déterministes `?scenario=...` dans `src/app/scenarios.ts`, puis les jouer **par vrais contrôles UI** (inspecter les `data-key` actuels, ne pas supposer que les anciens noms existent).

- **Rupture :** joue une Garde gagnante avec Rupture équipée et Insight disponible ; aucune cible cachée valide pour le Repoussement Basic ; Secondaire adverse active non consommée valide, cible explicite choisie. Vérifier coût, action, Repoussement **unique**, état des zones et journal, sans modifier Emprise/Rupture.
- **Dissipation :** effet persistant d'une Secondaire adverse (Dissimulation, si valable) après révélation volontaire, Technique équipée et Insight disponible ; choisir une cible pendant la fenêtre légale et vérifier coût, restauration des informations désormais publiables, absence d'oubli de connaissance préexistante.
- Assurer `npm run qa:browser` + scénarios ciblés sous Chromium : clic/tactile si possible, aucune erreur console, aucune perte d'interaction, aucun doublon/secret dans journal et export. Les rivalités scriptées n'existent que pour la démo QA, pas dans l'IA de production.

## Livrables et limite

Écrire `docs/RAPPORT_M03_1B.md`, captures et manifest des scénarios, tests et commandes réellement exécutés ; mettre à jour `JOURNAL.md` avec statut, erreurs, SHA et prochaine étape. Les règles V3.0 + V3.2, le moteur arithmétique et la grammaire visuelle M03 ne changent pas. **Ne pas déclarer la sécurité « totale » : rendre explicite la liste des surfaces testées et les inférences restantes.**