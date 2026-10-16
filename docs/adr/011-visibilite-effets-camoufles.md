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