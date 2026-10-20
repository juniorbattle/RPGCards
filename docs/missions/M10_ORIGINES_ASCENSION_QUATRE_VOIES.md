# M10 — Origines et ascension des Quatre Voies : cadrage narratif et produit

**Date : 2026-10-20. Statut : CADRAGE / conception, PAS une autorisation de modifier le moteur.**  
**Décisions ratifiées :** (1) **OPTION B** : le joueur choisit sa famille après avoir été remarqué ; (2) **deck neutre initial de 16 cartes physiques** : quatre copies de chaque Rang I, II, III, IV, sans famille, bonus intrinsèque ni effet de carte. Voir ADR 029 et ADR 030. Ces décisions de conception ne valent pas autorisation de modifier le moteur.

> **DÉCISIONS DU RESPONSABLE (2026-10-20, fiche M10 <https://claude.ai/artifact/P6QSq7ACy25pkB6581Cvg7>) :** Les décisions ouvertes de ce cadrage sont tranchées (avenant M10-A, familles, sauvegarde, textes, ville). Divergences avec les recommandations : **PV du joueur qui montent à chaque combat, sans plafond, et paliers de decks adverses** (ARB-M10-09, précise le §IV de la mission du responsable) ; **écriture neutre partout** (ARB-M10-11). Lot suivant : **M10-A**, avec l’aventure branchée sur le Quai en quatre rangs (ARB-M10-12). Tableau complet : `docs/FICHE_ARBITRAGES_M10.md`, « Décisions du responsable ».

> **2026-10-20, décision du responsable :** la prochaine grosse tâche est la **structuration et la configuration narratives**, menée sur le cloud ; M09 est en pause après la passe 68. Son périmètre est fixé par le brief de la session cloud, validé le 2026-10-20 (`docs/missions/BRIEF_SESSION_CLOUD_2026-10-20_M10.md` : contrats d'abord, puis prologue jouable provisoire derrière `?aventure=1`) ; tant qu'un avenant n'est pas ratifié, les règles de combat restent intouchées et les « Décisions ouvertes » ci-dessous restent au responsable.


## DÉCISION PRIORITAIRE — Récompenses familiales ratifiées (ADR 031, 2026-10-20)

**Cette section prime sur toute formulation ancienne du présent cadrage indiquant que les quatre Basics se gagnent progressivement auprès des membres ou lieutenants.**

- **Famille choisie :** après choix libre B et **confirmation explicite** d'affiliation, remise **immédiate et groupée des quatre Basics I, II, III, IV**. Les lieutenants sont ensuite défiés **pour des variantes** ; le **chef vaincu donne la Signature ∞**.
- **Trois autres familles :** chaque **défi familial officiellement engagé** remet **le lot complet des quatre Basics I–IV** de la famille concernée (la simple visite du quartier n'est pas un défi officiel) ; ses lieutenants donnent des **variantes**, son chef donne **sa Signature ∞**.
- Les récompenses des **victoires structurantes** sont uniques, garanties à la première victoire et de valeur stratégique croissante, **sans hausse numérique automatique**. Une variante remplace une Basic de même identité dans le deck et ne crée aucune nouvelle identité ; jusqu'à quatre Signatures peuvent être possédées, **une seule équipée** dans le format Duel standard.
- Les **16 neutres sans famille ni effet** restent le départ ratifié (ADR 030). **Non tranché techniquement** : remplacement des neutres par quatre lots de Basics, duel sans Signature avant premier chef, Puissances neutres, Techniques, et validation/migration du deck Aventure. Proposer un avenant M10-A, **ne pas inventer une règle moteur**.
- **Nouvel ordre du travail :** M09 est **en pause après la passe 69** ; la prochaine grosse tâche sur le cloud est **la structuration et configuration narratives**. Cet ajout documentaire n'autorise pas la modification du moteur, des assets ou des cartes.

## Vision narrative

Le joueur est un duelliste de la populace, **sans appartenance familiale initiale**. Il commence avec **16 cartes neutres, blanches/grises, sans famille, composées de 4 exemplaires de chaque Rang I, II, III et IV**, sans bonus intrinsèque ni effet de carte. Un duel **imprévu et public** face à un rival récurrent attire une foule ; les Quatre Voies perçoivent son talent. Une famille peut être la première à manifester son intérêt, mais elle **ne peut pas décider de son affiliation à sa place**. Le joueur peut accepter l'invitation, la différer ou rechercher une autre voie. Toutes les quatre doivent pouvoir être choisies par des parcours jouables et compréhensibles, sans prédiction obligatoire de son style et sans mauvaise réponse cachée.

L'accueil confirmé d'une famille remet **immédiatement ses quatre cartes Basic I–IV**. Le joueur affronte ses **lieutenants pour les variantes**, puis le **chef pour sa Signature** ; pour chacune des trois autres familles, l'engagement officiel du défi remet **ses quatre Basics I–IV**, suivi des lieutenants (variantes) et du chef (Signature), avant le Championnat des Champions. En parallèle : ville vivante, déplacements libres, duellistes PNJ rencontrés dans les ruelles ou places, défis ponctuels du rival et duels spéciaux permettant de débloquer des **variantes d'identités déjà possédées**.

**Progression visée :** neutralité → duel public fondateur → offres de recrutement → **choix explicite de la voie** → 4 cartes de la voie d'accueil → chef de la voie → trois autres familles → Championnat des Champions. Cette progression n'impose PAS une exploration linéaire : l'accès aux défis majeurs peut suivre des prérequis narratifs alors que les quartiers restent explorables.

## Décision fermement ratifiée — Affiliation : option B

1. **La reconnaissance est gagnée ; l'appartenance est choisie.** Le premier recruteur et la scène d'approche peuvent varier avec des faits publics du prologue, l'endroit où le joueur se trouve ou la narration, mais **aucune attribution de famille automatique ni sans consentement**.
2. Au recrutement, le joueur voit l'identité, la philosophie de jeu et les conséquences immédiates de l'affiliation **avant confirmation**. Il peut **Accepter**, **Différer** ou **Chercher une autre voie** ; les quatre itinéraires doivent être atteignables. Refuser la première invitation ne provoque pas de blocage narratif ni de punition dissimulée.
3. Une affiliation ne devient active qu'après **confirmation explicite**. Le monde, les dialogues et le journal doivent distinguer `remarqué`, `invité`, `affilié`, `chef`, sans confondre visite, rencontre et adhésion.
4. Le choix est **narratif / de progression** ; il ne modifie pas les calculs canoniques du Clash, l'IA ou les familles existantes sans avenant gameplay distinct et ratifié.
5. Le degré de permanence de l'affiliation après engagement (changement possible ou non, conséquences, seconde chance) **reste ouvert**, tout comme le nombre/ordre exact des interlocuteurs. Ne pas coder d'interdiction irréversible par défaut.

## Ce qui existe et doit être préservé — état main au cadrage

- **Combat canonique :** V3.0 + V3.2, D-01 ratifié V3.3 ; `src/game/catalog/cards.ts` contient exactement quatre familles (Cendre, Voile, Ronce, Astre), 16 identités ordinaires (rangs I–IV, puissances 3/6/9/12), une **Signature** par deck et des variantes, soit un deck légal **17 cartes** dans `src/product/deck.ts`. Ce système ne sait PAS encore représenter un deck neutre de prologue sans famille ou sans Signature.
- **Produit actuel :** `src/product/progression.ts` accorde des variantes de famille aux premières victoires et la mini-série `Tournoi du Quai` (`src/product/encounters.ts`) est encore une progression **provisoire**. Aucun de ces déblocages ne doit être requalifié silencieusement en progression canonique M10.
- **Ville M09 en cours :** caméra frontale 2.5D (ADR 024), quartier → rangs → ruelles / places et liaisons (ADR 025, 028, `docs/M09_QUARTIERS_EN_RANGS.md`) ; actuellement démo derrière `?demo=1`, laboratoire de profondeur `?ville=1&qa=1&profondeur=1`. La porte visuelle du Quai n'est pas définitivement approuvée (manifestes `approved: false`). M10 doit **réutiliser ces espaces**, pas refaire le moteur de marche, la caméra, le diorama ni le rendu du duel.
- **Secrets, IA, sauvegardes, QA et art :** respecter ADR 011, 013–025, 027–028, le journal et la règle de branche sur `main`. Les personnages de la ville et les décors soumis à approbation M09 ne deviennent pas approuvés du fait de ce contrat narratif.

## Conception à instruire AVANT de coder le mode Aventure

### A. Neutres du prologue — composition RATIFIÉE ; paramètres moteur à arbitrer

**Règle de conception expressément ratifiée (ADR 030) :** le lot initial comprend **exactement 16 cartes physiques ordinaires**, réparties ainsi :

| Rang | Copies physiques | Famille | Bonus / effet propre |
|---|---:|---|---|
| I | 4 | aucune | aucun |
| II | 4 | aucune | aucun |
| III | 4 | aucune | aucun |
| IV | 4 | aucune | aucun |
| **Total** | **16** | **aucune** | **aucun** |

- Quatre copies de **la même définition neutre de Rang I**, et idem pour II, III et IV ; **quatre définitions neutres de rang**, **16 instances physiques distinctes**. Aucun nom de famille, symbole familial ou affinité de famille. Aucune capacité individuelle, rareté spéciale ni multiplicateur propre aux neutres.
- **Pas une cinquième famille :** « sans famille » ne constitue pas une nouvelle voie. L'absence de famille interdit un bonus *lié à la famille* ; les actions générales du combat restent soumises au futur avenant.
- Ce deck initial **délibérément répétitif** constitue l'exception de prologue à l'unicité des 16 identités familiales du mode duel standard. Ne pas résoudre la duplication en créant 16 identités neutres artificiellement différentes.
- **Identité graphique :** cartes blanches/grises sobres, rang immédiatement lisible, sans emblème de Cendre, Voile, Ronce ou Astre.
- **Aucun effet bonus intrinsèque** ne signifie pas « aucun Assaut / aucune Garde » : la capacité à jouer le combat normal doit être spécifiée dans l'avenant ; ne pas inventer un gameplay simplifié non demandé.

**Paramètres encore ouverts avant implémentation :**
1. **Puissance imprimée** des neutres : suggestion à valider = même table de Puissances ordinaires que les familières I→IV (3/6/9/12) ; le responsable n'a pas ratifié ces nombres pour les neutres.
2. **Signature et Techniques au prologue** : absence ou présence d'une Signature, choix et accès aux Techniques, taille du deck si une Signature existe. Le jeu standard exige aujourd'hui 17 cartes, Signature incluse. Le lot neutre de **16 cartes ne tranche pas à lui seul** le format complet du deck en toutes phases.
3. **Transitions du deck** après obtention d'une carte familiale : emplacement remplacé, règle de duplication éventuelle, mélange neutres/familiales, moment où se termine l'exception.
4. **Calcul et interfaces** : `family: null` ou représentation typée équivalente, validation du deck mode Aventure distincte, posture Assaut/Garde/Secondaires et absence d'affinité ; sécurité des secrets / IA / replay / sauvegardes.
5. **Équilibrage** du duel fondateur contre un rival familial, du rythme de gain des cartes et des scénarios de défaite/revanche.

**Porte obligatoire :** avenant gameplay chiffré, tests du deck neutre et non-régression du deck canonique **avant modification de `src/game` ou `src/product/deck.ts`**.
- Frontière entre **mode Aventure** et **duels libres historiques** : le deck standard à 17 cartes doit continuer à fonctionner et à produire les mêmes hashes de replay ; proposer une version des sauvegardes avec migration **non destructive**.

### B. Progression et récompenses — design à ratifier

- **Décision ADR 031 :** les Basics I–IV sont remises ensemble lors de l'affiliation (pas après chaque combat) ; lieutenants = variantes à victoire ; chef = Signature à victoire. Le nombre des lieutenants et leurs variantes restent à concevoir.
- **Décision ADR 031 :** à l'engagement officiel du défi d'une famille rivale, ses quatre Basics I–IV sont remises ensemble ; chaque lieutenant vaincu donne une variante ; le chef vaincu donne la Signature. Les 16 identités uniques doivent être collectables **sans doublons**.
- Définir la **Signature** de l'affiliation et les trois autres Signatures, les Techniques, la propriété des variantes, sans les confondre avec les cartes ordinaires. Une variante **remplace** la version Basic de la même identité dans le deck, elle ne crée pas une identité supplémentaire.
- Conditions de défaite, revanche, blocage, sauvegarde, reprise, changement d'affiliation après acceptation ; existence éventuelle de défis facultatifs hors prérequis. Ne pas créer de monnaie, XP, raretés ou multiplications de Puissance sans décision.
- **Rival récurrent** : arc dramatique du prologue au Championnat ; ses défis ne doivent pas devenir fréquents ou aléatoires au point de nuire à l'exploration.

### C. Ville / rencontres dynamiques — politique à concevoir

- Les défis de PNJ s'insèrent dans les ruelles et places M09, avec visibilité du personnage, déclencheur intelligible, possibilité de refuser/différer pour les duels facultatifs et absence de boucle d'interruption systématique.
- Construire un directeur déterministe et sauvegardable des rencontres (graine, disponibilité, cooldown narratif **à définir**, progression), séparé du moteur de déplacement et du moteur de combat. Pas de random à chaque pas ni de téléportation arbitraire devant le joueur.
- Les chefs, lieutenants, salles de défi et Championnat suivent des lieux et accès déclaratifs, sans corridors artificiels. Retour après duel au même îlot/position sûre, persistance des visites et des étapes.
- Le prologue doit mettre en scène un public attiré par le combat et les recruteurs sans exiger que les images/lieux M09 non encore approuvés soient intégrés à la distribution.

## Lots M10 — proposés, séquentiels (PAS autorisés à coder par ce cadrage seul)

| Lot | Production envisagée | Porte |
|---|---|---|
| **M10-A** | Contrat de règle Aventure + carte(s) neutre(s) + deck/transitions + architecture de sauvegarde | Avenant explicite ratifié ; duel standard inchangé |
| **M10-B** | Prologue jouable au Quai : deck gris → duel public imprévu → foule → invitations → **choix libre B** | 4 affiliations atteignables, refus sans softlock, QA navigateur |
| **M10-C** | Famille d'accueil : 4 Basics à l'affiliation, lieutenants → variantes, chef → Signature | Parcours intégral, défaites/revanche, sauvegardes |
| **M10-D** | Trois autres voies : 4 Basics à l'engagement officiel de chaque défi, lieutenants → variantes, chef → Signature | Récompenses uniques, cohérence des accès |
| **M10-E** | Duellistes rencontrés en exploration, rival récurrent, championnat | Liberté de déplacement, événements non intrusifs |
| **M10-F** | QA d'ensemble, équilibrage, migration, release candidate Aventure | Prologue → titre final, reprise, secrets et perf validés |

**Première démo verticale cible :** depuis « Nouvelle aventure », un joueur non affilié peut entrer dans la ville avec un deck neutre légal dans son mode, gagner/perdre le duel public sans blocage narratif, découvrir une première invitation, **choisir librement parmi les quatre voies**, enregistrer cette affiliation et obtenir un début de progression. L'implémentation attend les règles A ratifiées.

## Décisions ouvertes à présenter au responsable

1. Deck neutre : **composition 4 × I + 4 × II + 4 × III + 4 × IV RATIFIÉE**, sans famille/bonus/effet ; **à décider** : Puissances exactes, Signature et Techniques au prologue, transitions et validation du mode Aventure.
2. Première acquisition : **RATIFIÉ : quatre Basics offertes ensemble à l'adhésion confirmée (ADR 031)** ; seul le remplacement de neutres dans le deck reste à arbitrer.
3. Recrutement : chemin exact pour rencontrer les trois autres familles et modalité de confirmation / éventuel changement après adhésion.
4. Échelle **RATIFIÉE** : quatre Basics lors de chaque affiliation/défi officiel ; victoires de lieutenants → variantes ; victoire de chef → Signature. À concevoir : nombre de lieutenants, variante exacte et disponibilité des Techniques.
5. Effet d'une défaite au duel du prologue et des refus de recruteurs.
6. Séquençage des rencontres dynamiques et du rival, et verrouillage des grands défis.
7. Migration des sauvegardes RC ; place des duels libres et du Tournoi du Quai existants.

**Statut explicite :** sont ratifiés **l'option B** et **les 16 cartes neutres (quatre copies par Rang I–IV, sans famille/bonus/effet)**. Les autres choix de gameplay et valeurs chiffrées (Puissances, Signature, Techniques, conversion du deck) restent **non ratifiés**. **M09 est en pause (passe 69) et la structuration narrative cloud est la tâche suivante**, jusqu'à son jalon visuel/technique. Aucune règle de combat ni élément de ville en production n'est modifié par ce document.
