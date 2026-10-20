# M10 — Origines et ascension des Quatre Voies : contrats (index)

**Statut : DÉCIDÉ par le responsable le 2026-10-20** (fiche M10, tableau dans `docs/FICHE_ARBITRAGES_M10.md`) ; à l'origine : **PROPOSÉ** (session cloud autonome du 2026-10-20, brief `docs/missions/BRIEF_SESSION_CLOUD_2026-10-20_M10.md`).
Seules les décisions des **ADR 029, 030 et 031** sont ratifiées ; tout le reste attend la fiche
`docs/FICHE_ARBITRAGES_M10.md`. Aucun de ces documents ne modifie les règles du mode Duel standard.

| Livrable de la mission (§VII) | Document |
|---|---|
| 1. Scénario du prologue et du recrutement | [`CONTRAT_NARRATIF_M10.md`](CONTRAT_NARRATIF_M10.md) §3 |
| 2. Organisation hiérarchique des quatre familles | [`CONTRAT_NARRATIF_M10.md`](CONTRAT_NARRATIF_M10.md) §1–2 |
| 3. Parcours de progression et récompenses | [`PROGRESSION_ET_RECOMPENSES.md`](PROGRESSION_ET_RECOMPENSES.md) §1–3, §5 |
| 4. Rôle narratif et évolution du rival | [`CONTRAT_NARRATIF_M10.md`](CONTRAT_NARRATIF_M10.md) §4 |
| 5. Rencontres et événements de ville | [`VILLE_RENCONTRES_EVENEMENTS.md`](VILLE_RENCONTRES_EVENEMENTS.md) |
| 6. Quêtes et progression persistante | [`PROGRESSION_ET_RECOMPENSES.md`](PROGRESSION_ET_RECOMPENSES.md) §6 |
| 7. Avenant cartes neutres et mode Aventure | [`AVENANT_M10A_PROPOSE.md`](AVENANT_M10A_PROPOSE.md) |
| 8. Feuille de route M10-A à M10-F | [`FEUILLE_DE_ROUTE_M10.md`](FEUILLE_DE_ROUTE_M10.md) |
| Championnat des Champions (§IV) | [`PROGRESSION_ET_RECOMPENSES.md`](PROGRESSION_ET_RECOMPENSES.md) §4 |
| Preuve hors dépôt du patch M10-A et mesures d'équilibrage | [`MESURES_M10A.md`](MESURES_M10A.md), [`patch-m10a-neutres.diff`](patch-m10a-neutres.diff) |
| Arbitrages indispensables | [`../FICHE_ARBITRAGES_M10.md`](../FICHE_ARBITRAGES_M10.md) |
| Prototype jouable du prologue (`?aventure=1`) | [`../AVENTURE_PROVISOIRE.md`](../AVENTURE_PROVISOIRE.md), ADR 032 (proposé) |

## Les propositions en une page

- **Prologue** : le joueur, sans famille et avec ses 16 cartes grises, est refoulé du tournoi de la salle aux quatre
  bannières ; Kaï, refoulé lui aussi, le provoque ; duel public dans la rue du Quai ; la foule ; les **quatre**
  émissaires le remarquent et l'invitent ; Accepter (avec confirmation), Différer, Chercher une autre voie ; Basics à la
  confirmation ; premier défi de lieutenant.
- **Familles** : même hiérarchie partout : **chef**, **bras droit** (un rival V2 existant : Kaï, Maëlle, Sélène, Orin),
  **cadet** (qui est aussi l'émissaire du prologue), membres. Maisons : Cendre au Quai, Ronce au Fanal, Voile dans les
  Ruelles, Astre au Parvis et à l'arène.
- **Récompenses** : cadet → variante III, bras droit → variante IV, chef → Signature ; variantes I et II par des
  compétitions facultatives de la ville ; registre des gains à clés uniques (idempotent).
- **Règles Aventure** : neutres 3 / 6 / 9 / 12, jouées comme des Basics **sans affinité** ; deck Aventure = 16 cartes,
  4 par Rang, identités uniques, neutres pour compléter, 0 ou 1 Signature ; une neutre de chaque Rang remplacée à chaque
  lot de Basics ; le deck devient standard (17) exactement après les quatre lots ; Techniques de la rue (Sondage,
  Recentrage), puis une par famille.
- **Rival** : Kaï, du gris du prologue au bras droit de la Cendre, puis finaliste du Championnat ; défis facultatifs,
  un par chapitre au plus.
- **Championnat** : quatre chefs (une Signature différente à chaque duel), le Miroir (Kaï), la Finale en deux manches
  gagnantes avec changement de Signature entre les manches ; aucune statistique gonflée.
- **Ville** : directeur des rencontres déterministe (graine, **battements** narratifs, délais), décisions aux seuls points
  de décision, au plus deux rencontres facultatives par îlot, jamais d'embuscade.
- **Moteur** : rien ne change avant ratification ; l'impact prévu (A-11) touche deux lignes du fichier du Clash
  (l'affinité exige une famille) : c'est l'arbitrage bloquant ARB-M10-02.
