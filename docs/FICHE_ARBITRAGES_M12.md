# Fiche d'arbitrages M12 — les cartes et leurs effets (à remplir par le responsable)

**Date :** 2026-10-27 (mandat du responsable du même jour, `docs/missions/M12_CARTES_ET_EFFETS.md`). **Statut : à
remplir.** La session locale en fera une fiche interactive (décision du responsable : « nous enverrons toutes les fiches
d'arbitrages à notre session locale ») ; chaque entrée donne le contexte, la recommandation (première option) et les
alternatives. Tout ce qui est marqué « fait » est sur `main` et réversible ; les règles du duel, le catalogue, l'IA,
l'annexe de calibrage, les images de la ville et les approbations n'ont pas changé.

Preuves : `screenshots/qa/m12/galerie/` (toutes les cartes, avant et après), `screenshots/qa/m12/activations/` (temps
forts réels figés à mi-course, de vrais duels au navigateur, réglages), `artifacts/qa/m12/` (rapports), tests
`test/m12-cartes.test.ts`, `test/m12-activations.test.ts`, `test/concealment.test.ts` (surface des temps forts).

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

## Les variantes proposées (contrat 3, avenant à valider)

| Entrée | Objet | Recommandation | Alternatives |
|---|---|---|---|
| **V1** | Le principe : une seconde variante par identité (16 cartes de plus, `docs/m12/03_VARIANTES_PROPOSEES.md`) ; la règle de deck reste « une carte par identité » | **Valider le principe**, puis relire les textes (V2) | Pas maintenant ; moins de cartes (seulement les Rangs I et II) |
| **V2** | Les 16 textes (Tison, Percée, Surenchère, Fournaise ; Leurre, Écho, Ombre portée, Nuit sans lune ; Épine, Sève, Lierre, Rempart ; Boussole, Constellation, Équinoxe, Zénith) | **Relire carte par carte** (tel quel, à reprendre, à écarter) | Les valider en bloc |
| **V3** | Le Duel standard garde les variantes A tant qu'aucun choix n'est fait (empreintes et calibrage inchangés) | **Garder** | Un deck standard qui choisit sa variante par identité |
| **V4** | Où se gagnent les variantes B en Aventure | **Joutes, revanches et Championnat** (les variantes A restent aux lieutenants) | Boutique ou échange ; récompenses des rumeurs |
| **V5** | Après validation : avenant 09 sous `contracts/`, puis un lot (moteur, IA, motifs, simulations de calibrage, fiche) | **Dans cet ordre** | — |

## Couleurs des familles (ADR 046, demande du responsable du 2026-10-27)

| Entrée | Objet | Recommandation | Alternatives |
|---|---|---|---|
| **H1** | L'Astre en ocre, ambre et or partout (cartes, étendards de la salle et de l'arène, ville dessinée par code, tenues), le Voile en marine et indigo ; Halvard en manteau ocre (portrait de combat) | **Recevoir** (fait, verrouillé par `test/couleurs-familles.test.ts`) | Retouches de teinte (laquelle) |
| **H2** | La feuille de ville de Halvard recolorée par script (manteau marine → ocre, planche `screenshots/qa/m12/couleurs/halvard-avant-apres.png`) : son approbation de la passe 128 est caduque ; hors QA, Halvard est dessiné par code (en ocre) jusqu'à un nouvel ordre | **Approuver la feuille recolorée** (ordre explicite, appliqué par le registre dans une passe à part) | La reprendre (teinte, tons) ; revenir à la feuille marine (Halvard se confond de nouveau avec Ilse) |

## Suite

| Entrée | Objet | Recommandation | Alternatives |
|---|---|---|---|
| **S1** | Prochain chantier | **Les variantes B si V1 est validé** ; sinon, le jalon de QA sur les deux GPU (rendu du duel et des cartes, fréquence des temps forts) | La structure narrative (lots suivants) ; les autres quartiers |
