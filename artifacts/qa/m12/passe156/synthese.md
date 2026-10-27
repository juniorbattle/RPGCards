# Campagne de QA — passes 156 et 157 (avenant 09, conseils, nouveau joueur)

Conteneur cloud, Chromium en rendu logiciel (SwiftShader), son coupé (QA). Journaux bruts : ce dossier
(`resume.txt` : première série ; `reprise.txt` : reprises, machine au repos).

| Contrôle | Résultat |
|---|---|
| `tsc`, build | verts |
| Tests (`vitest`) | **597/597** au repos (une exécution pendant la campagne au navigateur : `v33` 7d au-delà de 5 s sous charge, vert seul et au repos) |
| Empreintes standard (moteur seul, `tools/m10a-empreintes.ts`) | **240 identiques** à M11 (l'écart unique est l'enregistrement non suivi `artifacts/qa/tmp/rc-record.json`) |
| Mesure des variantes (`tools/m12-variantes-mesure.ts`) | 31/32 dans la marge ; Escarbille ajustée, remesurée dans la marge |
| `qa:maison` | vert |
| `qa:voies` | vert |
| `qa:championnat` | vert |
| `qa:vue` | vert |
| `qa:vivante` | vert |
| `qa:rc` | **9/9** |
| `qa:techniques` | **8/8** |
| `qa:browser` | **5/5** (0 fuite, 0 clic perdu) |
| `qa:product` | A, C à H verts (E : série complète 18/18, 39 variantes débloquées) ; **B** : clic hors délai sous charge dans la première série, **vert seul** (`product-B.log`) ; **I** : coupé par le délai de 25 min de la série (E seul dure 12,5 min), **vert seul** (`product-I.log`) |
| `qa:aventure` | un échec reproductible : « marche au clavier au travers du passage ouest » (z −2,2 au lieu de < −11 en 4,2 s). Cause : le rendu logiciel du Quai en rangs tombe sous 1 image par seconde dans le conteneur et le pas du marcheur est borné par image (0,1 s) ; le passage n'est pas bloqué (le marcheur avance, `dbg`). Le contrôle tient désormais la touche jusqu'à l'arrivée (150 s au plus) : **48/48** (`aventure-3.log` : rue Haute atteinte en 61 s) |
| `tools/m12-editeur-variantes.mjs` | **12/12** (éditeur Basic, A, B, C ; écran du choix de l'aventure ; revanche) |
| `tools/m12-nouveau-joueur.mjs` | **15/15**, console vide (navigateur neuf, cinématiques, conseils, choix de la variante, rencontre en vue, Collection, menu, rechargement) |
| `tools/m12-galerie.mjs` | **3/3** ; planche des 68 cartes (outil élargi : 17 cartes par famille) |
