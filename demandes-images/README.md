# Demandes d'images de référence

Canal entre une session qui n'a pas la clé OpenAI (session cloud) et la session principale locale, qui l'a
(décision du responsable, 2026-10-19). Le canal passe **par git** : une session cloud ne peut pas envoyer de message à
une session locale.

Les images produites sont des **références de conception** (AGENTS, « Images générées ») : elles guident le travail
par code et n'entrent pas dans le jeu ni dans le build. Seule exception : les images de la ville (feuilles de
personnages et décors des îlots), produites en local sous les garde-fous d'AGENTS (« Images de la ville », ADR 027 et
028).

> **CANAL D'IMAGES FERMÉ (2026-10-19, en cours de run) :** le poste du responsable est éteint ; la session principale ne répond plus et ne livrera plus d'images. N'envoie plus de demande, ne vérifie plus de livraison : avance en **autonomie complète** avec les références déjà dans `reference/generated/` et le travail par code. Rien ne doit attendre la session principale ni le responsable jusqu'à la fin du run.

**DÉCISION DU RESPONSABLE (2026-10-19, pendant le run) : caméra d'exploration = FRONTALE 2.5D.** « Non, on ne veut pas d'inclinaison, mais frontale. » La vue de dessus inclinée est abandonnée : ne la construis pas (ou retire-la du laboratoire), fais V1 et V2 directement en frontale 2.5D (≈ 10–20°, plans de profondeur), et demande les images de référence en frontale. ADR 024 : statut « approuvé, frontale 2.5D ».

## Demander

1. Crée un fichier `demandes-images/AAAA-MM-JJ-HHMM-<sujet>.md` à partir du modèle ci-dessous, commit, push sur `main`.
2. **Continue ton travail** : n'attends pas la livraison. Fais `git pull` de temps en temps (toutes les 15 à 20 minutes
   environ) et regarde si le statut de ta demande est passé à `livrée`.
3. Groupe tes besoins : 4 images au plus par demande, 24 images au plus pour tout le run du 2026-10-19.
4. La livraison n'est pas garantie (poste du responsable éteint, quota) : ne bloque jamais ton travail dessus.

```markdown
statut: en attente
demandeur: session cloud
usage: à quoi servira l'image (ex. M09 V1, comparaison des deux caméras sur le Quai)
sujet: ce qui doit apparaître, en une ou deux phrases
cadrage: vue de dessus inclinée ≈ 45° | frontale 2.5D ≈ 15° | portrait de face | planche de variantes | autre (préciser)
format: paysage | portrait | carré
nombre: 1 à 4
contraintes: éléments obligatoires ou interdits, éclairage, moment
```

## Livraison (session principale)

La session principale surveille `origin/main`, génère les images, puis :
- les range dans `reference/generated/<nom-de-la-demande>/` (`01.png`, `02.png`…) avec `fiche.json` (prompt complet,
  modèle, date, demande d'origine, statut « référence de travail, non approuvée ») ;
- passe la demande à `statut: livrée` et y ajoute la liste des images (ou `statut: refusée` avec la raison) ;
- commit et push sur `main`.

## Bible de style ajoutée à chaque prompt

> **Cible de la ville (décision du responsable, 2026-10-19, ADR 028 ; remplace la direction D ci-dessous)** : la
> référence initiale, le Quai la nuit vu de face (`reference/generated/2026-10-19-quai-nuit-cameras/02.png`), en HD-2D
> stylisé : décor peint au grain fin (pierre détaillée, grappes de lanternes ambrées, ville haute en arrière-plan),
> personnages et accessoires en pixel art net, bannières et accents aux couleurs des quatre familles, emblèmes du jeu ;
> vue de face (jamais de dessus ni isométrique). Pour un plan de décor : un seul plan de profondeur par image, sans
> personnage, éclairage de nuit peint, aucun texte. **gpt-image-2 refuse le fond transparent** (essai, passe 56) : pour une
> image détourée, demander un fond uni absent du sujet (« a perfectly flat, uniform pure magenta (#FF00FF) background »
> pour un décor, cyan pour un personnage), détouré ensuite par script ; prompts de l'essai dans
> `art-src/decors/quai-facades-essai/fiche.json` et `art-src/sprites/player-essai/fiche.json`.

> *Historique* — **Direction D (décision du responsable, 2026-10-19, ADR 026)** : pour la ville, illustration de carte encrée (contours
> à l'encre, aplats à une ou deux ombres, hachures fines dans les ombres, grain de papier) et couleurs des quatre
> familles en accents lumineux (Cendre braise, Voile bleu argenté, Ronce vert, Astre or) sur une nuit bleu d'encre ;
> vitraux et glyphes des familles, dorures. Cette direction remplace « ambre comme seul accent chaud » ci-dessous pour
> la ville. Référence approuvée : `reference/generated/2026-10-19-quai-direction-d/`.

HD-2D théâtral, rendu illustré et soigné, mise en scène comme une pièce de théâtre ; nuit à dominante presque
monochrome **indigo / ardoise**, **pierre froide** en secondaire, **lumière ambrée comme seul accent chaud**, **ivoire
désaturé** pour les toiles et les rehauts ; accessoires concentrés aux points focaux (lanternes, bord du quai, étals,
quelques bannières), jamais de fouillis uniforme ; univers des Quatre Voies : une cité portuaire où l'on se défie aux
cartes, quatre familles (Cendre : braise et orange ; Voile : bleu et argent ; Ronce : vert et épines ; Astre : or et
étoiles), lieux le Quai, le Fanal (taverne du port), la salle de jeu de cartes, l'arène. Aucun texte lisible, aucun logo,
aucun style étranger au jeu.
