# M11 — Feuille de route (M11-A à M11-F)

**Date :** 2026-10-26. **Statut : PROPOSÉ** (session cloud autonome ; une étape par phase du brief). Chaque étape :
`npm run typecheck`, `npm test`, `npm run build`, vérification ciblée au navigateur quand le rendu change ; QA complète au
jalon seulement.

| Étape | Contenu | Contrats | Acceptation |
|---|---|---|---|
| **M11-A** | Rencontres en vue et rival en événements fixes | 1, 2 | `test/m11-vue.test.ts`, `test/m11-rival.test.ts` ; `npm run qa:vue` ; directeur pur (tests existants verts) ; sauvegarde versionnée `aventure/2`, migration de `aventure/1` sans perte |
| **M11-B** | Progression des PNJ (tempéraments par chapitre) | 3 | `test/m11-temperaments.test.ts` ; mesures `tools/m11-temperaments.ts` comparées à l'annexe (valeurs inchangées) |
| **M11-C** | Dialogues : système de répliques, réécriture, narration de bout en bout | 4 | `test/m11-repliques.test.ts` ; parcours complet du prologue au titre ; épicène relu |
| **M11-D** | IA de combat : niveau 2 (nouveaux profils) | 5 | empreintes standard identiques ; `tools/m11-ia.ts` (mesures IA contre IA) |
| **M11-E** | Son synthétisé par code | 6 | `test/m11-son.test.ts` ; jeu par défaut au pixel près ; écoute en local |
| **M11-F** | Fiche d'arbitrages, retour de session, jalon (si le temps le permet) | — | `docs/FICHE_ARBITRAGES_M11.md`, `docs/missions/RETOUR_SESSION_CLOUD_2026-10-26.md` |

Hors champ : règles du duel, annexe de calibrage, images, approbations, mode Duel standard par défaut.
