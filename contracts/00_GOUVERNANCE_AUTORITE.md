# 00 — Gouvernance / autorité normative et changements

## Délimitation de la mission

Projet autonome **Les Quatre Voies**, jeu RPG de cartes. `RPG-ArtByCode` est la référence de **processus** et d'outillage art procédural, non une base de code obligatoire, un asset pack, un scénario de carte ni un contrat artistique. Les anciens documents de Cité du Tournoi ne s'appliquent pas par défaut.

## Ordre d'autorité

1. Instruction expresse et actuelle du responsable, dans les limites explicites de sa portée ; pour un changement de règles, demander validation explicite de la nouvelle rédaction canonique.
2. Contrat maître / avenants explicitement approuvés dans ce nouveau dépôt.
3. Pour le gameplay : `contracts/02_CONTRAT_GAMEPLAY_DELTA_V3_2.md` **prime sur les seuls passages qu'il modifie** ; puis `source/CONTRAT_REGLES_V3_0_HISTORIQUE.md` fait autorité pour tout le reste.
4. Pour la production : contrats 01, 03, 04, 05 (aucun ne peut déroger silencieusement au gameplay).
5. Le simulateur V3.2 est un **oracle de référence testable**, pas une source autonome de vérité ; un bug du prototype n'est pas une règle.
6. README, JOURNAL, anciens prompts et inspirations sont informatifs.

## Gestion du delta V3.2

Le contrat V3.0 indiquait qu'un soutien Rang n'a pas d'affinité. Un simulateur V3.1 puis V3.2 ont éprouvé le **+1 d'affinité de famille au Rang** ; la mission de production le reprend explicitement. La source historique reste intacte. L'agent doit signaler ce delta dans README et QA ; la ratification formelle d'une éventuelle V3.3 est l'affaire du responsable, pas une mutation cachée d'un ancien contrat.

## Gestion des conflits

- Si deux textes divergent hors delta explicite, consigner `CONFLICT-YYYY-NNN` et exemples chiffrés dans JOURNAL/ADR.
- Implémenter les portions non ambiguës ; ne pas choisir en silence l'interprétation la plus commode.
- Proposer un correctif minimal avec test de régression et mention de l'impact UX ; attendre validation si le comportement de jeu change.
- Aucun auteur automatique ne « valide » une règle à la place du responsable.

## Statuts documentaires

- `FIGÉ / APPROUVÉ` : l'agent ne change pas sans arbitrage.
- `MANDAT DE PRODUCTION` : instructions de mise en œuvre requises pour cette mission, pas nécessairement nouvelle version du règlement.
- `PROPOSÉ` : libre d'être discuté, jamais source définitive.
- `RÉFÉRENCE / PREUVE` : constate un fait du simulateur/dépôt ; ne remplace pas un contrat.

## Gouvernance git

Nouveau repo, branche de travail, `main` non modifiée sans accord ; demandes de PR documentées. Journal et ADR font partie des commits de travail. Si l'environnement ne permet pas les branches/commits, fournir patchs et blocage exact.
