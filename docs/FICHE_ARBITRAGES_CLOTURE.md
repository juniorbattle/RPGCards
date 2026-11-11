# Fiche d'arbitrages de clôture — conclure et valider

> **Publiée le 2026-11-11 (passe 222) : <https://claude.ai/artifact/9MYJByuhqm7tVJpVNuU9RV>** (page privée, choix
> enregistrés et relus ; deux captures). Source : `docs/AUDIT_FIN_DE_PROJET_2026-11-11.md` (audit de fin de projet,
> passe 221). État audité : `main` à `8a947eb`. Rien n'est corrigé avant que la fiche soit remplie et consignée.

## Entrées (recommandation en premier)

| Id | Question | Recommandé | Autres options |
|---|---|---|---|
| A1 | Un soin peut-il sauver d'un coup mortel ? | Suivre V3.0 §9.3 : dégâts et soins ensemble, puis le K.-O. | Ratifier l'actuel (le soin sauve) |
| A2 | Interactions de l'avenant 09 (Fournaise et Rempart, Percée, Équinoxe) | Ratifier les trois lectures actuelles | Les revoir une par une |
| A3 | Verser l'avenant 09 sous `contracts/` | Après le lot de correction, nouvelle étiquette (V3.0+delta-V3.4) | Relire d'abord les 32 effets ; le laisser provisoire |
| B1 | Brasier Originel à 57,3 % | Mesurer par paires de Signatures, ajuster seulement au-dessus de 55 % | Puissance 13 maintenant ; inchangé |
| B2 | Variantes à risque (Tison, Surenchère, Escarbille) | Remesurer d'abord (IA qui joue Recentrage et les regards privés, 1 600 duels), ajuster ce qui reste sous −4 points | Inchangé ; les renforcer maintenant |
| B3 | PV gonflés en rejouant | +3 PV seulement pour une victoire qui apporte quelque chose | Inchangé ; plafond par chapitre |
| C1 | Contraintes des Joutes | Cendre : une variante IV ; Voile : deux variantes Voile ; Astre : deux familles | Joutes après le chef ; inchangé |
| C2 | Lot de textes de la structure narrative (G5, prototypes, Kaï rejoué, D2) | Dans le lot de correction, relus au test | Après la version finale |
| D1 | Leçons manquantes (révision, Repoussement, remplacement, défausse) | Les quatre (deux leçons et un ajout) | Révision et Repoussement ; aucune |
| D2 | « Utiliser » et « Non » | Même poids pour les deux réponses | Inchangé |
| D3 | Aperçu tactique | Deux lignes : si le rival conserve, si le rival amplifie | Cas le plus défavorable ; calcul corrigé seulement |
| D4 | Leçons des éléments au Duel standard | Proposées à la première apparition, une fois | « Apprendre » seulement |
| E1 | Numéro de version | 0.18.0 maintenant, 1.0.0 à la version finale | 1.0.0-rc.1 ; inchangé |
| E2 | Mobile | Hors de la 1.0, parcours sortis des portes | Corriger avant la version finale |
| E3 | Restes de développement | Démo et `?cartes=v1` retirées, crochets sous `?qa=1`, ville de secours gardée | Tout retirer ; tout garder |
| E4 | Poids de la version livrée | Sans sourcemaps, Three.js à part, décors inchangés | Décors en WebP (réapprobation) ; inchangé |
| E5 | Captures suivies par git | Nouvelles captures ignorées, planches de preuve seulement ; historique inchangé | Sortir l'historique (réécriture, accord explicite) ; inchangé |
| E6 | Documents d'entrée | Tout remettre en ordre, rien de supprimé | README et CLAUDE.md seulement ; inchangé |
| F1 | Lot de correction sans décision | Reçu | Reçu avec retours ; à reprendre |
| F2 | Ordre de clôture | Lot, test du responsable, QA finale, nettoyage, 1.0.0 | Test d'abord |
| F3 | Points qui attendent l'œil et l'oreille | À ton test, en une fiche de réception finale | Reçus dès maintenant |

## Décisions du responsable

Fiche remplie le 2026-11-11 (19 h 49 à 19 h 52, heure UTC), consignée à la passe 223. **Les 21 choix sur la recommandation** ; une note (E5).

| Id | Choix |
|---|---|
| A1 | Suivre V3.0 §9.3 : dégâts et soins ensemble, puis le K.-O. |
| A2 | Ratifier les trois lectures actuelles (Fournaise et Rempart s'annulent ; Percée après Rempart ou Fournaise ; les effets du perdant se déclenchent quand Équinoxe gagne l'égalité) |
| A3 | Verser l'avenant 09 sous `contracts/` après le lot de correction, nouvelle étiquette (V3.0+delta-V3.4), A1 et A2 dedans |
| B1 | Brasier : mesurer par paires de Signatures (au moins 1 000 duels chacune), ajuster d'un cran seulement au-dessus de 55 % |
| B2 | Variantes à risque : remesurer d'abord (IA de niveau 1 qui joue Recentrage et retient les regards privés, 1 600 duels), ajuster d'un cran ce qui reste sous −4 points |
| B3 | +3 PV seulement pour une victoire qui apporte quelque chose (première victoire de chaque rencontre, duels de la trame) ; toujours sans plafond |
| C1 | Joutes : Cendre, une variante Cendre IV équipée ; Voile, au moins deux variantes Voile équipées ; Astre, au moins deux familles |
| C2 | Lot de textes de la structure narrative (G5, répliques et offres de prototype, répliques propres à chaque événement de Kaï, D2) dans le lot de correction, relu au test |
| D1 | Les quatre : leçons « Réviser face à une Signature » et « Repousser et remplacer », défausse ajoutée à la leçon du début du tour |
| D2 | Même poids pour les deux réponses d'une question facultative (la lumière sur la carte ou la Technique ; focus sur « Utiliser ») |
| D3 | Aperçu tactique sur deux lignes : si le rival conserve, si le rival amplifie (information visible seulement) |
| D4 | Leçon d'un élément proposée à sa première apparition au Duel standard, une fois, refusable |
| E1 | 0.18.0 dès le lot de correction, 1.0.0 à la version finale |
| E2 | Mobile hors de la 1.0 : ses parcours sortent des portes de QA (gardés comme outils) |
| E3 | Démo (`?demo=1`) et `?cartes=v1` retirées ; crochets de test réservés à `?qa=1` ; ville de secours gardée |
| E4 | Build livré sans sourcemaps, Three.js dans son propre fichier ; décors inchangés |
| E5 | Nouvelles captures ignorées, planches de preuve seulement ; historique inchangé. **Note du responsable : « il faudra prévoir de faire un nettoyage »** (au nettoyage de clôture : retirer du suivi les captures anciennes non citées comme preuve, sans réécrire l'historique ; toute réécriture reste soumise à un accord explicite) |
| E6 | Documents d'entrée remis en ordre, rien de supprimé, tout rangé |
| F1 | Lot de correction sans décision reçu |
| F2 | Ordre de clôture : lot de correction, test complet du responsable, QA finale (aussi aux réglages par défaut d'un joueur), nettoyage, 1.0.0 |
| F3 | Points à l'œil et à l'oreille tranchés au test complet, en une fiche de réception finale |
