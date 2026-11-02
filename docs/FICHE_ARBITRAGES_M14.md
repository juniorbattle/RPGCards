# Fiche d'arbitrages M14 — les deux récits, l'interface et les retours (à remplir par le responsable)

**Date :** 2026-11-01. **Statut : remplie le 2026-11-01** (décisions en fin de fiche). Elle couvre ce que les fiches M11, M12 et M13 ne couvrent pas : le travail
fait depuis leur publication (passes 162 à 184). Tout est sur `main` et réversible.

**Fiche interactive publiée le 2026-11-01** par la session principale (privée, 12 entrées, choix enregistrés dans sa collection `decisions`) : <https://claude.ai/artifact/249L7Q8Lp6QuUZPGtAfaVs>.

Preuves : `docs/m14/01_RECIT_GUIDE.md`, `docs/adr/048-promenade-libre-et-recit-guide.md`, `docs/adr/049-interface-hors-combat.md`,
`docs/RETOURS_TEST_2026-10-29.md`, `artifacts/qa/m14/voie-directe.md`, `screenshots/qa/m14/ui-1280/`, `artifacts/qa/jalon-2026-10/synthese.md`.

## Réception

| Entrée | Objet | Recommandation | Alternatives |
|---|---|---|---|
| **R1** | Le Récit guidé : marche coupée, « Suite du récit », écran noir, le joueur devant l'événement, la scène s'ouvre ; Kaï passe avant l'objectif ; les choix restent au joueur | **Recevoir après le test** | Recevoir ; reprendre (dire quoi en note) |
| **R2** | L'interface hors combat refaite : cadre dessiné par code, HUD en cartouche, dialogues à plaque de nom, menu en panneau, titre sous le buste, nouvelle aventure sans défilement, journal replié | **Recevoir après le test** | Recevoir ; reprendre (dire quoi en note) |
| **R3** | Le protagoniste : silhouettes A et B, coupes, visages, peau, cheveux, yeux, portrait du duel qui suit, marche de profil (feuilles approuvées par tes ordres) | **Recevoir après le test** | Recevoir ; reprendre (dire quoi en note) |

## Le Récit guidé (mes choix provisoires)

| Entrée | Objet | Recommandation | Alternatives |
|---|---|---|---|
| **G1** | Rythme : un clic sur « Suite du récit » entre deux étapes, pour garder la main sur le deck avant un duel | **Garder** | Enchaîner seul après les dialogues, le clic seulement après un duel ; tout enchaîner seul |
| **G2** | S'écarter de la trame : en repassant en Promenade libre dans le menu ; pas de duel de rue en Récit guidé | **Garder** | Proposer des duels de rue entre deux étapes ; proposer Épreuves et Joutes, qui donnent des variantes |
| **G3** | Garde-fou de la difficulté : des PV de plus à la victoire d'un combat narratif seulement si une étape tombe sous 40 % à la mesure ; aujourd'hui, chefs 45 à 48 %, Championnat 48 à 49 %, aucune compensation | **Garder** | Un autre seuil (dire lequel en note) ; des PV de plus d'office |
| **G4** | Les noms : « Promenade libre » et « Récit guidé » | **Garder** | D'autres noms (en note) |
| **G5** | Les phrases d'objectif parlent de marcher (« Approchez-vous des braseros »), même en Récit guidé | **Les reprendre avec les textes de la structure narrative** | Les reprendre maintenant ; les laisser |

## Tes retours du 2026-10-29, à rejouer

| Entrée | Objet | Recommandation | Alternatives |
|---|---|---|---|
| **T1** | La marche de côté : foulées et pose de passage, figure soulevée d'un pixel | **À juger en jeu** | Recevoir ; reprendre |
| **T2** | Le relief des décors peints : intérieurs, arcades, escaliers en profondeur (`?relief=0` pour comparer) ; coût mesuré au jalon, nul sur la RTX 4060, jusqu'à +2,4 ms sur la Radeon 780M en 1920 × 1080 | **À juger en jeu** | Recevoir ; reprendre |

Les trois autres retours sont aux fiches : cadrage des cinématiques (M11, C1 et C6), temps forts (M12, A1 et A8), pause entre
les morceaux (M13, J10).

## Suite

| Entrée | Objet | Recommandation | Alternatives |
|---|---|---|---|
| **S1** | Le jeu mobile paysage, différé depuis M04 : le Récit guidé vise aussi ces joueurs, mais le duel n'est pas adapté au téléphone | **Après la version bureau** | L'inclure dans la version finale ; l'abandonner |
| **S2** | L'enveloppe du Duel standard (accueil, Options, éditeur) garde son style, l'interface refaite ne couvre que l'aventure | **L'accorder à la nouvelle interface**, dans une passe à part sur ordre (le jeu par défaut au repos changera, ce qui rompt la garantie « identique au pixel près ») | La laisser telle quelle |

## Décisions du responsable (fiche remplie le 2026-11-01, 12 choix, consignés à la passe 186)

Toutes les entrées sont sur l'option recommandée, sauf :

| Entrée | Choix | Note | Effet |
|---|---|---|---|
| **G1** | Garder | « une interface specifique au recit guide poir gerer le deck, les configs, ou faire des duels contre les joueurs de rue » | le clic entre deux étapes reste ; à côté de lui, cette interface : la Halte. Contrat 1, §4 bis |
| **G2** | Proposer des duels de rue entre deux étapes | « on creerait une interface specifique au recit guide qui permet de gerer notre deck ou autres config ou effectuer quelques duels contre joueur du rue visible dans l'interface ( semblable a notre premier interface de selection de combat ) » | la Halte liste les joueurs de rue |

**Ordre donné :** S2 (l'enveloppe du Duel standard accordée à la nouvelle interface, dans une passe à part). **Restent ouverts au test :** R1 à R3, T1, T2. G5 attend les textes de la structure narrative ; S1 : le mobile après la version bureau.
