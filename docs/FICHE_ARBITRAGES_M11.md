# Fiche d'arbitrages M11 — un monde qui réagit (à remplir par le responsable)

**Date :** 2026-10-26 (session cloud autonome, brief `docs/missions/BRIEF_SESSION_CLOUD_2026-10-26_M11.md`). **Statut : à
remplir.** La session principale en fera une fiche interactive ; chaque entrée donne le contexte, la recommandation
(première option) et les alternatives. Tout ce qui est marqué « fait » est sur `main` et réversible ; rien n'a changé
les règles du duel, l'annexe de calibrage, les images ou les approbations.

Preuves : `artifacts/qa/m11/` (mesures, `qa:vue`, comparaison au pixel près), `screenshots/qa/m11/vue-1280/`.

## Réception

| Entrée | Objet | Recommandation | Alternatives |
|---|---|---|---|
| **R1** | Les six contrats M11 (`docs/m11/`, ADR 037 à 042), proposés | **Recevoir** (les ADR passent « approuvé ») | Recevoir avec retours ; reprendre tel contrat |
| **R2** | Les rencontres « en vue » telles que livrées (`qa:vue` 25/25, captures 01 à 06) | **Recevoir** | Garder le code, mais désactiver les duels forcés (comportement de M10) ; reprendre |
| **R3** | Kaï en événements fixes K1 à K6 (captures 07 à 11) | **Recevoir** | Garder aussi l'ombre de Kaï entre les événements ; reprendre |
| **R4** | Le son synthétisé (à écouter en local : Options du jeu standard, menu « Son » de l'aventure) | **À écouter d'abord** (« pas encore écouté ») | Recevoir ; reprendre (timbres, niveaux) |

## Rencontres en vue (contrat 1)

| Entrée | Objet | Recommandation | Alternatives |
|---|---|---|---|
| **V1** | Valeurs du champ de vision : 4,5 m, demi-angle 32°, arrêt à 0,95 m | **Garder** | Vue plus longue (6 m) ; plus étroite (20°, une « ligne » à la Pokémon) |
| **V2** | Qui guette : les duels de rue et les membres des familles (pas les figures, compétitions, rumeurs, Kaï) | **Garder** | Aussi les organisateurs d'Épreuve ; seulement les duels de rue |
| **V3** | Duel forcé : un seul choix « Relever le défi », préparation sans « Plus tard », Échap et menu sans effet ; abandon possible dans le duel, sans perte | **Garder** (décision de principe : « forcer le combat ») | Ajouter « Pas maintenant » (le PNJ repart, comme un refus) |
| **V4** | Repos : battu, un PNJ ne force plus avant le chapitre suivant ; vainqueur, 2 battements | **Garder** | Chapitre suivant dans les deux cas ; un délai en battements dans les deux cas |
| **V5** | Pas de duel forcé avant l'affiliation (scène P7) | **Garder** | Dès la fin du duel public (P4) |
| **V6** | En QA, rencontres forcées seulement avec `?vue=1` (les parcours d'avant M11 restent déterministes) | **Garder** (outil) | Les activer partout et adapter les parcours |
| **V7** | Les guetteurs regardent dans une direction fixe (celle de leur place) | **Garder** | Des guetteurs qui tournent la tête de temps en temps (plus « Pokémon », plus difficile à lire) |

## Le rival (contrat 2)

| Entrée | Objet | Recommandation | Alternatives |
|---|---|---|---|
| **K1** | Les six moments écrits (K1 : premier lieutenant de la maison ; K2 : Signature de la maison ; K3, K4 : un, puis deux chefs d'autres familles ; K5 : Championnat ouvert ; K6 : la main tendue après le titre) et leurs îlots | **Garder** | Ajouter un moment (après la Joute de la maison) ; en retirer (K4) |
| **K2** | Un événement manqué dans son chapitre ne se rattrape pas | **Garder** (simple, jamais deux Kaï de suite) | Le rattraper au chapitre suivant, avant le sien |
| **K3** | Une défaite contre Kaï accomplit l'événement (l'histoire continue) ; un abandon le laisse dû | **Garder** | Le faire rejouer jusqu'à la victoire |
| **K4** | Kaï joue le profil `offensif` de l'annexe à tous les événements | **Garder l'annexe** | Proposition : profil de tempérament (agressif au chapitre II et III, tacticien au IV, vicieux au V), avec les mesures de l'IA (entrée I2) |
| **K5** | L'ombre de Kaï (M10-E) n'est plus tirée ; sa quête est remplacée par « Kaï, la Braise du quai » (gardée seulement pour une aventure qui en a relevé) | **Garder** | Garder aussi l'ombre, une fois par chapitre, entre deux événements |

## Progression des PNJ (contrat 3)

| Entrée | Objet | Recommandation | Alternatives |
|---|---|---|---|
| **P1** | Tempéraments au jeu pour les PNJ facultatifs récurrents (duels de rue, membres), chapitre I au profil `novice` de l'annexe ; mesures (`artifacts/qa/m11/temperaments.md`) : le joueur « équilibré » gagne 69 à 89 % contre « franc » ; à partir du chapitre II, chaque autre tempérament est plus dur (« vicieux » 62 à 68 %) ; les figures, Épreuves, Joutes et le Championnat ne changent pas (paliers identiques au chiffre près) | **Garder** | Garder `novice` partout (répliques seules) ; durcir encore les chapitres IV et V |
| **P2** | Les trajectoires (tableau du contrat 3, §3) | **Garder** | Reprendre tel PNJ |
| **P3** | Un cran de plus après deux défaites contre le joueur | **Garder** | Après trois ; jamais |
| **P4** | Les figures structurantes gardent le profil de l'annexe ; seules leurs répliques suivent un tempérament | **Garder l'annexe** (`TEMPERAMENTS_AU_JEU_FIGURES = false`) | Tempéraments au jeu aussi pour les revanches des figures (pas pour la première rencontre) |

## Dialogues et narration (contrat 4)

| Entrée | Objet | Recommandation | Alternatives |
|---|---|---|---|
| **D1** | Le système de répliques (plus spécifique d'abord, jamais deux fois de suite) et la réécriture (rue, membres, Kaï, rumeurs, revanches, héraut) | **Recevoir** | Recevoir avec retours de texte |
| **D2** | **Les deux Observatoires (O1 de la fiche de la ville)** : un seul Observatoire, dans la Ville haute, maison et registre de l'Astre ; ses figures reçoivent les défis au Parvis ; le nom de la maison devient « l'Observatoire de la Ville haute ». **Aucun texte changé** (contrat d'abord) | **Un seul Observatoire, dans la Ville haute** (textes à changer en un lot) | Déplacer les figures de l'Astre sur le parvis de l'Observatoire ; deux lieux distincts, celui du Parvis renommé « la Loge des Astres » |
| **D3** | La trame de bout en bout (tableau du contrat 4, §3) | **Recevoir** comme contrat de la structure narrative | Reprendre tel acte |

## IA de combat (contrat 5)

| Entrée | Objet | Recommandation | Alternatives |
|---|---|---|---|
| **I1** | Le niveau 2 en nouveaux profils (`tacticien`, `agressif`, `ruse`, `vicieux`), utilisés seulement par l'aventure ; mesures (`artifacts/qa/m11/ia.md`) : contre « équilibré », tacticien 76 %, agressif 60,5 %, rusé 77,5 %, vicieux 84 % (bases : 46,5 %, 32 %, 61 %) ; Duel standard inchangé (240 empreintes et mesure d'équilibre identiques) | **Recevoir** | Reprendre |
| **I2** | **Extension au Duel standard** (proposition) : un réglage « Duelliste aguerri » qui donnerait aux rivaux le niveau 2 de leur profil (+14 à +30 points de victoires contre le même adversaire) | **Pas maintenant** (le Duel standard est équilibré et reçu ; le niveau 2 gagne nettement plus) | Le proposer en option dans les Options (désactivé par défaut) ; l'activer pour le Tournoi du Quai seulement |

## Son (contrat 6)

| Entrée | Objet | Recommandation | Alternatives |
|---|---|---|---|
| **S1** | Volume par défaut 70 %, son activé par défaut (après un geste) | **Garder** | Coupé par défaut, activé dans les Options |
| **S2** | Sons du duel calés sur les temps de la chorégraphie du Clash (Interférence, issue, dégâts, fin) ; « Passer » ne rejoue que la fin | **Garder**, à juger à l'écoute | Sons plus courts ; seulement l'issue et la fin |
| **S3** | Les ambiances (une par îlot, bourdon du duel) | **À écouter** | Ambiances plus discrètes ; seulement les effets |

## Après la session : chemins des premiers rangs et cinématiques (passes 149 et 150, contrat 7)

| Entrée | Objet | Recommandation | Alternatives |
|---|---|---|---|
| **L1** | Chemins lumineux des premiers rangs, même lueur que les rangs du fond (planches `screenshots/qa/m11/chemins-rang1/`) ; dans la Grande Cour, l'allée s'arrête à la hauteur des étals, et le chemin reprend aux passages | **Recevoir** | Reculer les étals de la Cour pour un chemin continu jusqu'aux passages ; lueur plus marquée au premier rang |
| **C1** | Les cinématiques runtime (contrat 7, ADR 043) : première arrivée dans chaque quartier, Kaï qui surgit, guetteur qui repère ; passables, réglables dans le menu (captures `screenshots/qa/m11/cinematiques-1280/`) | **À juger en jeu d'abord** (rendu logiciel ici : les captures n'en montrent que des instants) | Recevoir ; reprendre (durées, cadrages) |
| **C2** | La première arrivée remplace le carton plein écran du Quai (même texte, dans la bande du bas) ; une fois par quartier et par aventure | **Garder** | Le carton plein écran gardé en plus ; l'arrivée à chaque visite ; seulement le Quai |
| **C3** | Guetteur : un plan court, sans bandes (le passage revient souvent) ; Kaï : en bandes | **Garder** | Bandes aussi pour le guetteur ; aucun plan pour le guetteur |
| **C4** | Passages suivants (contrat 7, §4) : affiliation, Signature d'un chef, titre du Championnat, prologue | **Affiliation et titre d'abord** | Tous ; aucun pour l'instant ; la vue d'ensemble d'un rang du fond (fantômes pilotés par la caméra, à décider à part) |
| **C5** | Lignes des cartons de lieu (contrat 7, §3) | **Garder**, à relire | Les réécrire ; sans ligne |

## Suite

| Entrée | Objet | Recommandation | Alternatives |
|---|---|---|---|
| **N1** | Suite de M11 | **Écoute et jalon en local** (son, marche des guetteurs à pied, GPU), puis un lot de textes de la structure narrative (D2, D3) | Un lot de contenu (nouveaux PNJ guetteurs, répliques du premier défi des figures) ; le niveau 2 en Duel standard (I2) |
