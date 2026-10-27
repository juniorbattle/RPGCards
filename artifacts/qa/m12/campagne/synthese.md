# Campagne de QA M12 (passe 153) — SwiftShader, outils lancés seuls

| Étape | Résultat |
|---|---|
| `tools/l5-identique.mjs` avec `?cartes=v1` contre le build d'avant M12 (`b4e57e3`) | **identique au pixel près** : 12 comparaisons (scènes des quatre rivaux, duel complet HUD compris, écran Rencontres ; 1280 et 1920), témoin détecté |
| `qa:techniques` (audit du secret étendu à `#activations`) | **8/8** |
| `qa:browser` (`LQV_QA_NAV_TIMEOUT=60000`, audit du secret étendu aux temps forts du rival) | **5/5**, 0 fuite, 0 clic perdu, 0 fantôme ; premier passage sans la variable : arrêt au chargement (événement `load` > 10 s en SwiftShader, délai connu, documenté dans l'outil) |
| `qa:product` | **9/9** (série E en 18/18) |
| `qa:rc` | **9/9** |
| `node tools/m12-activations.mjs` (build final) | **25/25** : planche des 13 genres réels trouvés, 10 genres figés dans de vrais duels, secret, « Passer », rien ne subsiste, mouvement réduit, instantané, gel, paysage 844 × 390, portrait 390 × 844 |
| Empreintes standard (moteur seul, `tools/m10a-empreintes.ts` contre `artifacts/qa/m11/empreintes.json`) | **240/240 identiques** (un enregistrement temporaire non suivi en plus, `artifacts/qa/tmp/rc-record.json`) |
| Tests | **568 verts** |

Note : `qa:product` et `qa:rc` ont tourné sur le build d'avant le correctif du portrait 390 px (feuille de style des temps
forts sous 600 px de large seulement) ; `qa:browser` et la capture des temps forts sur le build final.
Rapports : `qa-*.json` de cette campagne (les fichiers suivis `artifacts/qa/qa-*.json` sont restaurés).
