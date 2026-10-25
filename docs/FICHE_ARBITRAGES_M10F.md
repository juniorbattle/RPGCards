# Fiche d'arbitrages de la RC du mode Aventure (M10-F) — décisions du responsable

Fiche interactive privée <https://claude.ai/artifact/UfZ5K4GnfarDa1vhLFUua5>, remplie par le responsable le 2026-10-25 (choix
entre 07:55 et 07:58 UTC, aucune note), relue dans sa collection `decisions` (9 documents). **Les 9 choix suivent l'option
recommandée.**

| Entrée | Objet | Choix du responsable |
|---|---|---|
| R1 | Réception de la release candidate du mode Aventure | **Reçue** |
| R2 | T1 : le pilote de QA joue l'engagement et la tactique avec l'IA du jeu, sur la vue du joueur | **Reçu** |
| V1 | Numéro de la release candidate | **0.10.0-rc.1** |
| E1 | Voie directe plus dure que l'annexe à partir de la deuxième famille | **Garder l'annexe telle quelle** (aucun recalibrage) |
| X1 | « Votre chef est vaincu » quand la cheffe est Mère Aubépine ou Ilse | **Accorder** (« Votre cheffe est vaincue ») |
| X2 | « la Braise du quai », en minuscule | **Garder** |
| X3 | Textes et aide relus | **Reçus** |
| T1 | Un duel d'aventure non vérifiable est retiré sans proposer de le recommencer | **Proposer de recommencer, comme le jeu standard** |
| S1 | Suite | **Clore M10, reprendre M09** (feuilles des personnages de la ville, autres quartiers) |

## À appliquer (passe 124)

- **V1** : `package.json` et `src/product/version.ts` à `0.10.0-rc.1` (test de version ; aucun schéma ni migration).
- **X1** : les phrases génériques sur le chef d'une famille s'accordent au genre de la personne (« cheffe », « vaincue ») ;
  le rôle reste « chef » quand il ne désigne personne en particulier.
- **T1** : dans l'aventure, un duel en cours qui ne peut pas être repris exactement est refusé avec sa raison et le joueur
  choisit : le recommencer depuis le début (même rencontre, même configuration), le retirer sans qu'il compte, ou plus tard.
- **S1** : M10 clos ; la suite est la reprise de M09 (personnages de la ville, autres quartiers), sur ordre du responsable.
