# ADR 011 — Protéger l'origine des effets lorsque leur Secondaire est camouflée
Date : 2026-10-16
Statut : **mandat de sécurité/visibilité approuvé par l'opérateur**, à implémenter et tester ; pas une nouvelle mécanique de carte.

## Constat

Le correctif de la passe 4 sur `main` protège les valeurs brutes des scores/multiplicateurs du Clash. Mais le journal et les événements publics `effect` / `insight` / `ClashReport.effects` peuvent nommer des effets uniques (« Ferveur », « Étincelle ») d'une Secondaire censée rester inconnue pendant Dissimulation, révélant identité et Rang avant le moment légal.

## Règle de publication

Pour une carte **réellement masquée et non connue auparavant**, les événements publics décrivent **uniquement les conséquences publiquement observables** et l'origine générique (Secondaire masquée, famille et case si visibles), sans exposer le nom unique de l'effet, sa définition, sa Puissance, son Rang masqué ni un nombre secret. Le propriétaire conserve son information détaillée par canal privé ; si la carte avait déjà été légalement vue, on ne lui efface pas son identité. La source *Dissimulation* révélée reste publique. Les PV, Insight, destinations devenues publiques et résultats du Clash ne changent pas.

La politique s'applique **aux payloads à la source**, y compris détails/reasons/rapports, pas seulement à l'UI. Les inférences logiquement possibles à partir de dégâts publics restent permises. Toute ambiguïté sur la chronologie de révélation en défausse (ARB-005) doit être explicitement signalée et ne doit pas changer silencieusement le règlement.

## Validation

Tests de non-fuite avant/après sur Ferveur, Étincelle, autres effets pertinents, cas connus avant camouflage, source de Dissimulation, Dissipation, événements publics et privés, JSON/spectateur/IA/journal. Identité des décisions, dommages, Insight, vainqueurs, RNG et destinations préservée ; rapport de sécurité factuel.
## Implémentation M03.1B (2026-10-16)

Statut : **implémenté et testé** sur `main` (voir `docs/RAPPORT_M03_1B.md`). Aucune règle ni issue modifiée.

- **Origine typée** (`src/game/engine/clash.ts`) : chaque `EffectOutcome` porte `source` (`primary` | `secondary` + case), la `consequence` observable d’un succès (`fixed-damage`, `heal`, `insight`, `destination`, `neutralize`, `peek`) et, pour un effet de Primaire neutralisé, `silencedBy` (joueur + case de la Silence). Les motifs d’Insight sont structurés (`insightSources` : Garde victorieuse, Interférence réussie, effet + case) ; les libellés historiques en dérivent.
- **Publication à la source** (`src/game/engine/publication.ts`, appelée par le moteur au moment d’émettre) : payloads publics construits par liste blanche. Carte publique : payload inchangé (`player`, `effect`, `status`, `detail`). Secondaire camouflée : `effect: null`, `masked`, famille et case publiques, et **seule la conséquence observable** d’un succès (« +2 dégâts fixes », « soin de N PV » si N > 0, « +1 Insight » si ce gain est effectif et sans autre motif public, « retour au sommet / sous la pioche », neutralisation d’un effet de Primaire réellement annulé). Un échec, une annulation, une observation privée (Éclaireur, Repère, Détour, Racine) ou un soin nul ne publient **rien**. Le propriétaire reçoit l’effet complet par événement privé (`own`).
- **Insight** : motifs publics seulement ; motif générique « effet de la Secondaire <famille> masquée (case N) » quand c’est l’unique explication d’un gain publié ; gain plafonné sans motif public : aucun événement public ; liste complète en privé.
- **Effet de Primaire neutralisé par une Silence camouflée** : statut ANNULÉ public (effet d’une carte publique), cause générique `by: { joueur, famille, case }`, jamais « Silence ».
- **`ClashReport.effects`** = la liste exacte des payloads publics émis (type `PublicEffect`) ; `state.lastClash`, l’événement public et `viewFor` restent publics par construction (comme la passe 4).
- **Chronologie ARB-005 appliquée sans la changer** : une carte camouflée consommée (ou remplacée pendant l’engagement) rejoint la défausse sans être nommée, et la vue adverse la montre `null` dans la défausse jusqu’à la fin du tour (fenêtre de Repoussement comprise) ; `PlayerState.maskedDiscards` en garde la trace.
- **Inférences laissées publiques** (conséquences des règles, documentées au rapport) : dégâts fixes (+2 ⇒ Étincelle et avance exacte de 1), soin, gain d’Insight seul (⇒ Ferveur), retour sous / sur la pioche, résultats d’Interférence (Rang ≥ cible), neutralisation (⇒ Silence).
