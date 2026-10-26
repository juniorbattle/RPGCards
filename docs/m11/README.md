# M11 — Un monde qui réagit : contrats (index)

**Statut : PROPOSÉ** (session cloud autonome du 2026-10-26, brief validé
`docs/missions/BRIEF_SESSION_CLOUD_2026-10-26_M11.md`). Les décisions de principe sont celles du responsable (annexe A du
brief) ; les valeurs et les choix de détail sont **provisoires jusqu'à la fiche** `docs/FICHE_ARBITRAGES_M11.md`.
Aucun de ces documents ne change les règles du duel, le mode Duel standard par défaut ni l'annexe de calibrage.

| Contrat | Document | ADR |
|---|---|---|
| 1. Rencontres « en vue » (champ de vision, approche, duel forcé, revanches) | [`01_RENCONTRES_EN_VUE.md`](01_RENCONTRES_EN_VUE.md) | 037 |
| 2. Kaï, le rival en événements fixes | [`02_RIVAL_EVENEMENTS_FIXES.md`](02_RIVAL_EVENEMENTS_FIXES.md) | 038 |
| 3. Progression des PNJ (tempéraments par chapitre) | [`03_PROGRESSION_DES_PNJ.md`](03_PROGRESSION_DES_PNJ.md) | 039 |
| 4. Dialogues et narration de bout en bout (dont les deux Observatoires) | [`04_DIALOGUES_ET_NARRATION.md`](04_DIALOGUES_ET_NARRATION.md) | 040 |
| 5. IA de combat : audit et niveau 2 | [`05_IA_DE_COMBAT.md`](05_IA_DE_COMBAT.md) | 041 |
| 6. Le son, synthétisé par code | [`06_SON.md`](06_SON.md) | 042 |
| 7. Cinématiques runtime (après la session, passe 150) | [`07_CINEMATIQUES.md`](07_CINEMATIQUES.md) | 043 |
| Feuille de route M11-A à M11-F | [`FEUILLE_DE_ROUTE_M11.md`](FEUILLE_DE_ROUTE_M11.md) | — |

## En une page

- **Vue** : les joueurs de cartes de la ville (duels de rue, membres des familles) regardent dans une direction ; qui
  entre dans leur cône (4,5 m, 32°, sans obstacle) est repéré : « ! », ils viennent, le duel est forcé ; battus, ils
  reviennent plus forts au chapitre suivant ; on les évite en restant hors de leur vue.
- **Rival** : Kaï surgit à six moments écrits (K1 à K6, du chapitre I au titre) au lieu d'être tiré au hasard.
- **Progression** : chaque PNJ récurrent a un tempérament par chapitre (passif, franc, rusé, agressif, calculateur,
  vicieux) qui règle son IA et ses répliques ; au chapitre I, la rue reste au profil de l'annexe.
- **Dialogues** : répliques par personnage et par état, plus spécifique d'abord, jamais deux fois de suite ; voix des
  familles ; trame du prologue au titre ; un seul Observatoire, dans la Ville haute (proposé).
- **IA** : audit ; un niveau 2 en nouveaux profils (`tacticien`, `agressif`, `vicieux`) ; Duel standard inchangé.
- **Son** : Web Audio, effets et ambiances, volume et coupure mémorisés, coupé en QA.
- **Cinématiques** (demande d'après la session) : plans joués par la caméra de la ville (arrivée dans un quartier, Kaï,
  guetteur), bandes et carton, toujours passables, réglables, coupées en QA sans `?cine=1`.
