# ADR 008 — Résolution présentée par temps successifs, l’état moteur restant l’autorité
Date : 2026-10-16
Statut : proposé

**Contexte.** M02 §4 : rendre intelligibles Interférences, Rang, Garde/absorption et dégâts, un enseignement à la fois, sans recalcul graphique ni blocage des commandes.

**Décision.**
- `buildResolutionBeats` (pur, `src/presentation/beats.ts`) transforme les événements **déjà résolus** en temps ordonnés : choix révélés → Interférences → Rang (décomposé : Primaire + soutiens, affinité, ∞, annulations) → issue (dont « victoire au Rang… mais 0 blessure : la Garde absorbe ») → dégâts (simultanés) → soins, effets, Insight → destinations, Repoussement → prolongation / fin.
- Le contrôleur joue chaque temps : FX Three.js, réactions du rival, PV affichés (reconstitués depuis `before` des événements de dégâts), lignes de journal, mise en évidence des cases/PV concernés.
- Rythmes `normal` / `rapide` / `instantané` (+ mouvement réduit) : **présentation uniquement**. « Passer » et « Tour suivant » sont toujours actifs ; toute commande valide achève d’abord la séquence ; l’IA attend la fin de la séquence pour décider (ex. Repoussement).
- Journal regroupé par tour (tour courant ouvert, verdict en résumé pour les précédents) ; les lignes de la résolution n’apparaissent qu’au temps correspondant.

**Tests.** `test/beats.test.ts` (T2 : « Rang : Vous 5 contre 4 » puis « 0 blessure », ordre pédagogique avec Interférences mutuelles, PV mis en scène jusqu’à la prolongation) ; captures `screenshots/qa/m02/08…12`.
