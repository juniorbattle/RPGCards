# Fiche d'arbitrages M12 — les cartes et leurs effets (à remplir par le responsable)

**Date :** 2026-10-27 (mandat du responsable du même jour, `docs/missions/M12_CARTES_ET_EFFETS.md`). **Statut : à
remplir.** La session locale en fera une fiche interactive (décision du responsable : « nous enverrons toutes les fiches
d'arbitrages à notre session locale ») ; chaque entrée donne le contexte, la recommandation (première option) et les
alternatives. Tout ce qui est marqué « fait » est sur `main` et réversible. Lots A et B : les règles du duel, le
catalogue, l'IA, l'annexe de calibrage, les images de la ville et les approbations n'ont pas changé ; avenant 09
(passes 156 et 157) : 32 variantes de plus au catalogue, appliquées à titre provisoire sur ordre du responsable (V1 à
V8), Duel standard par défaut inchangé (empreintes identiques).

Preuves : `screenshots/qa/m12/galerie/` (toutes les cartes, avant et après), `screenshots/qa/m12/activations/` (temps
forts réels figés à mi-course, de vrais duels au navigateur, réglages), `screenshots/qa/m12/variantes/` (éditeur Basic,
A, B, C ; écran du choix de l'aventure), `screenshots/qa/m12/nouveau-joueur-1280/` (parcours d'un nouveau joueur),
`artifacts/qa/m12/` (rapports, mesure des variantes), tests `test/m12-cartes.test.ts`, `test/m12-activations.test.ts`,
`test/concealment.test.ts` (surface des temps forts), `test/variantes09.test.ts`, `test/m12-aventure-variantes.test.ts`,
`test/m12-conseils.test.ts`.

## Réception

| Entrée | Objet | Recommandation | Alternatives |
|---|---|---|---|
| **R1** | Les contrats M12 (`docs/m12/01` et `02`, ADR 044 et 045), proposés | **Recevoir** (les ADR passent « approuvé ») | Recevoir avec retours ; reprendre tel contrat |
| **R2** | Les faces des cartes (lot A) : une illustration par variante et par Signature, pastille de déclenchement, gemme et cadres de rareté, inspecteur avec résumé et mots-clés, sceaux des Techniques | **Recevoir** | Recevoir avec retours (par carte : motif, couleur, lisibilité) ; revenir au dessin d'avant (`?cartes=v1`, gardé) |
| **R3** | Les temps forts des activations (lot B) : premier plan au centre (carte agrandie, impulsions de la famille, bannière, conséquence en grand), un temps par effet dans la résolution | **Recevoir** | Recevoir avec retours (par genre) ; plus discret (sans voile) |
| **R4** | Les sons des temps forts (« activation », « annulé », « sceau », « regard »), synthétisés par code | **À écouter d'abord** (coupés en QA, jamais écoutés) | Recevoir ; reprendre (timbres, niveaux) |

## Les cartes (contrat 1)

| Entrée | Objet | Recommandation | Alternatives |
|---|---|---|---|
| **C1** | Le résumé d'une ligne n'est pas imprimé sur la petite carte (illisible à 90-130 px) : inspecteur, grandes cartes, temps forts, bulle d'aide | **Garder** | L'imprimer sur la carte du plateau en petits caractères |
| **C2** | Le cadre Légendaire miroite (animé ; figé en mouvement réduit et en gel) | **Garder** | Un cadre prismatique fixe |
| **C3** | Les Basics et les neutres gardent l'emblème de leur famille (même dessin qu'avant) | **Garder** (le « portrait » de la famille, du Rang I au IV) | Un motif propre à chaque Basic (16 dessins de plus) |
| **C4** | Le nom de l'effet n'est écrit sur la plaque que pour les Signatures (les variantes le portent sous le nom de famille, comme avant) | **Garder** | Écrire aussi le nom de l'effet en tête des variantes |

## Les temps forts (contrat 2)

| Entrée | Objet | Recommandation | Alternatives |
|---|---|---|---|
| **A1** | Durées au rythme normal : effet 1,25 s, annulé 1 s, effet masqué 1,05 s, échecs 0,7 s, regard 1,5 s, Technique 1,05 s, camouflage et Dissipation 0,95 s, Signature 1,45 s, Interférence 1,05 s, Insight et soin 0,75 s, Repoussement 1,05 s, révélation 0,6 s (rapide : × 0,45 ; instantané : aucun) | **Garder** | Plus courtes (× 0,75) ; plus longues (× 1,25) |
| **A2** | Un temps de résolution par effet (au lieu d'un temps groupé) ; le panneau « Résolution » compte plus de temps | **Garder** | Revenir au temps groupé (les temps forts s'enchaînent dans le même temps) |
| **A3** | Le rival attend la fin de la file avant d'agir (le joueur garde la main ; « Passer » vide la file) | **Garder** | Le rival n'attend pas (les temps forts se superposent à sa décision) |
| **A4** | Un voile assombrit la table pendant un grand temps fort ; la scène du Clash s'efface derrière | **Garder** | Un voile plus léger ; aucun voile (la carte seule) |
| **A5** | Les petits temps forts (échecs regroupés, Insight, soin) restent discrets : un bandeau ou une pastille près du HUD | **Garder** | Leur donner aussi le premier plan |
| **A6** | Le regard privé montre la carte vue avec « PRIVÉ — vous seul voyez » ; l'adversaire ne voit que la Technique publique | **Garder** (ADR 011) | — |
| **A7** | Les impulsions du plateau : étiquette « ARMÉ » qui pulse sur une Primaire dont l'effet attend sa condition ; « RÉVÉLER : <effet> » sur une réserve dont l'effet joue à la révélation ; pastille de déclenchement allumée et mode marqué dans le menu tactique quand le mode choisi déclenche l'effet | **Garder** | Retirer l'une d'elles (laquelle) |

## Les 48 variantes (avenant 09, appliqué à titre provisoire)

Décision du responsable du 2026-10-27 : « chaque rang de chaque famille [a] 3 variants. Donc 48 variants » ; puis, aux
questions de la session cloud, « intégrer au jeu », « choix à la victoire » (aventure) et « oui, dans l'éditeur » (Duel
standard). L'avenant `docs/m12/04_AVENANT_09_VARIANTES.md` remplace la proposition des 16 variantes B
(`03_VARIANTES_PROPOSEES.md`) ; il reste sous `docs/m12/` jusqu'à sa relecture (passes 156 et 157 ; tests
`test/variantes09.test.ts`, `test/m12-aventure-variantes.test.ts`).

| Entrée | Objet | Recommandation | Alternatives |
|---|---|---|---|
| **V1** | Le principe : Basic et trois variantes (A, B, C) par identité, même Rang et même Puissance ; règle de deck inchangée (une carte par identité) | **Fait : recevoir** | — |
| **V2** | Les 32 textes B et C (avenant 09, §3) : la Cendre (pression et risque), le Voile (information), la Ronce (garde et préservation), l'Astre (adaptation et recirculation) ; illustrations dessinées par code (`src/art/cardMotifs09.ts`) | **Relire carte par carte pendant le test complet** (tel quel, à reprendre, à écarter) | Les valider en bloc |
| **V3** | La mesure IA contre IA (`artifacts/qa/m12/variantes/mesure.md`, 400 duels par ligne, marge ±6 points) : 31 variantes sur 32 dans la marge ; **Escarbille** hors marge (42,8 %) **ramenée à 1 dégât fixe** (45,9 % sur 800 duels) ; durée des duels inchangée | **Recevoir** (et l'ajustement d'Escarbille) | Resserrer la marge (±4) et ajuster Tison, Surenchère (−5,0 et −4,5) et Boussole (+4,8) |
| **V4** | **Leurre** : la première version (Leurre se masque elle-même) écartée, la seule carte qui se masque seule aurait été reconnue aussitôt ; remplacée par « une Interférence adverse dirigée contre Leurre échoue, quel que soit son Rang » | **Recevoir** | Un autre effet pour Voile I B |
| **V5** | Duel standard : le deck par défaut garde les variantes A (empreintes et replays standard identiques) ; l'éditeur propose Basic, A, B ou C pour chaque identité possédée ; la collection de départ a les trois variantes de Rang I (12), une récompense de famille donne les trois variantes de ses identités | **Recevoir** | Collection de départ en A seulement (4) |
| **V6** | Aventure : la première victoire qui donne une variante (Épreuve, Joute, cadet, bras droit) ouvre l'écran du choix (A, B ou C, rien n'est écrit avant) ; chaque nouvelle victoire au même endroit donne la suivante qui manque (la revanche l'annonce : « en jeu, … ») ; le titre du Championnat donne toutes celles qui manquent ; une variante déjà équipée reste en place | **Recevoir** | Les variantes manquantes aussi chez les membres et les guetteurs des familles |
| **V7** | Répliques de revanche des lieutenants récrites sans « sans enjeu » (il y a de nouveau un enjeu tant qu'une variante manque) | **Recevoir** | — |
| **V8** | Après la relecture : l'avenant 09 versé tel quel sous `contracts/` (gouvernance) | **Dans cet ordre** | — |

## Apprendre les nouveaux signaux (demande du responsable du 2026-10-27)

| Entrée | Objet | Recommandation | Alternatives |
|---|---|---|---|
| **T1** | Cinq conseils de plus (`src/shell/tips.ts`), un à la fois, la première fois que le signal paraît : **RÉVÉLER**, **ARMÉ**, la **pastille de déclenchement**, les **temps forts**, le **regard privé** ; dans le Duel standard (Options : conseils) et dans l'aventure | **Recevoir** (textes à relire pendant le test) | Une page d'aide illustrée à la place |
| **T2** | Aventure : les conseils du duel sont désormais affichés (aucun conseil avant M12), mémorisés dans la sauvegarde de l'aventure ; « Conseils du duel » dans le menu (masquer, tout réafficher) ; coupés en QA sans `?conseils=1` | **Recevoir** | Conseils seulement pendant le prologue |

## Lancer l'aventure comme un nouveau joueur (demande du responsable du 2026-10-27)

| Entrée | Objet | Recommandation | Alternatives |
|---|---|---|---|
| **N1** | Parcours d'un nouveau joueur, navigateur neuf, tout activé (cinématiques, rencontres en vue, conseils, choix de la variante) : `node tools/m12-nouveau-joueur.mjs` (captures `screenshots/qa/m12/nouveau-joueur-1280/`) | **Recevoir** | — |
| **N2** | L'aventure s'ouvre toujours par l'adresse `?aventure=1` (l'accueil du jeu standard n'y mène pas ; l'écran titre de l'aventure mène au jeu standard) | **Ajouter « Aventure » à l'accueil du jeu standard**, dans une passe à part sur ordre (l'image du jeu par défaut au repos changera, ce qui rompt la garantie « identique au pixel près ») | Garder l'adresse seule jusqu'à la fin du test complet |

## Couleurs des familles (ADR 046, demande du responsable du 2026-10-27)

| Entrée | Objet | Recommandation | Alternatives |
|---|---|---|---|
| **H1** | L'Astre en ocre, ambre et or partout (cartes, étendards de la salle et de l'arène, ville dessinée par code, tenues), le Voile en marine et indigo ; Halvard en manteau ocre (portrait de combat) | **Recevoir** (fait, verrouillé par `test/couleurs-familles.test.ts`) | Retouches de teinte (laquelle) |
| **H2** | La feuille de ville de Halvard recolorée par script (manteau marine → ocre, planche `screenshots/qa/m12/couleurs/halvard-avant-apres.png`) : son approbation de la passe 128 est caduque ; hors QA, Halvard est dessiné par code (en ocre) jusqu'à un nouvel ordre | **Fait : approuvée** (ordre du responsable du 2026-10-27, « j'approuve la feuille recolorée de Halvard » ; passe 155, par le registre) | La reprendre (teinte, tons) ; revenir à la feuille marine (Halvard se confond de nouveau avec Ilse) |
| **H3** | Constat de la passe 157 (cinématique d'arrivée sur le Quai) : sur la façade de la **Salle des Bannières du Quai** (`public/decors/quai-facades.png`, image approuvée), la bannière de l'Astre est peinte en **marine**, comme celle du Voile (seul l'emblème d'or les distingue). Proposition par script, **non posée** : le drap recoloré en ocre sombre, à la clarté de ses voisines (`tools/m12-banniere-astre.mjs`, `art-src/decors/quai-facades/propose-adr046.png`, planche `screenshots/qa/m12/couleurs/banniere-astre-quai-avant-apres.png`) | **Approuver la proposition** : elle remplace alors la façade du jeu et l'approbation passe à la nouvelle empreinte, dans une passe à part, par le registre (sans ordre, la poser rendrait l'ancienne approbation caduque et le Quai reviendrait à son secours hors QA) | La reprendre (teinte, clarté) ; garder la façade telle quelle (l'emblème suffit) |

## Suite

| Entrée | Objet | Recommandation | Alternatives |
|---|---|---|---|
| **S1** | Prochain chantier | **Le test complet du jeu par le responsable** (sa décision : « après cette passe, nous sommes bons pour un test complet »), puis le jalon de QA sur les deux GPU | La structure narrative (lots suivants) ; les autres quartiers |
| **S2** | L'allègement du chargement du jeu | **Plus tard**, lors d'une optimisation quasi finale (décision du responsable du 2026-10-27) | — |
