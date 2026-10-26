# M11 — Contrat 4 : dialogues et narration de bout en bout

**Date :** 2026-10-26. **Statut : PROPOSÉ.** C'est aussi le **contrat de la structure narrative de bout en bout** décidée
par la fiche de finalisation de la ville (S1 : « contrat d'abord, puis lots ») ; il tranche **en proposition** la question
des deux Observatoires (O1). **Code :** `src/aventure/repliques.ts` (pur : catalogue et choix), `src/aventure/scenes.ts`
(textes de la trame). ADR 040.

## 1. Le système de répliques

- **Locuteur** : un identifiant stable (`rue-docker`, `membre-Voile`, `cadet-Ronce`, `kai`, `heraut`, `rumeur-quai`,
  `foule`…).
- **Réplique** : `{ id, texte, quand? }` ; `quand` est un prédicat sur le **contexte de dialogue**, construit à partir de
  faits publics seulement :
  - le chapitre (prologue, I à V, titre) et la voie du joueur ;
  - le **tempérament** du locuteur (contrat 3) ;
  - la **relation** : duels joués contre lui, victoires et défaites du joueur, issue du dernier duel ;
  - le **moment** : ouverture d'un duel forcé (« vue »), dialogue à l'initiative du joueur, après un duel, événement du
    rival ;
  - quelques faits de l'aventure (chefs vaincus, Championnat ouvert, titre).
- **Choix** : parmi les répliques éligibles, la plus **spécifique** l'emporte (nombre de conditions), puis un tirage
  déterministe (graine du profil, locuteur, nombre de fois où il a parlé) ; **jamais la même réplique deux fois de
  suite** pour un même locuteur quand il en a une autre d'éligible (mémoire `dialogues.dernier` dans la sauvegarde).
- **Variantes** : chaque situation fréquente (duel de rue, rumeur, revanche) a au moins trois répliques par locuteur.
- Aucune réplique n'affirme connaître une information secrète (ADR 011) ; aucune ne remplace l'aide pour une règle.

## 2. Règles d'écriture

- **Épicène, sans point médian ni doublet** (ARB-M10-11) : aucun accord de genre pour le joueur ; les personnages gardent
  le leur.
- **Une bulle tient en 240 caractères** (guillemets compris) ; deux phrases en général, trois au plus.
- **Voix des familles** :
  - **Cendre** : tutoie, phrases courtes, verbes d'action, images de feu et de chantier (« Ça brûle ou ça casse. »).
  - **Ronce** : posée, souvent le vous, images de racines, de patience, de ce qui tient (« On ne gagne rien à courir. »).
  - **Voile** : vouvoie, énigmatique, regarder, lire, cacher (« Vous croyez cacher votre jeu. »).
  - **Astre** : ample, étoiles, cartes du ciel, ce qui revient et s'assemble (« Tout revient. Même vous. »).
  - **La rue** (populace, dockers, joueuses) : familière, tutoie, humour.
  - **Kaï** : provocateur au début, respect grandissant, jamais méprisant après le chapitre III.
- Tempérament dans le ton : passif (hésitant), franc (direct), rusé (sous-entendu), agressif (pressant), calculateur
  (chiffré), vicieux (piques).
- Tests : longueur, absence de point médian, liste de formes genrées interdites pour le joueur, aucune répétition
  immédiate sur 200 tirages.

## 3. La narration de bout en bout (du prologue au titre)

Chaque scène a son texte, sa transition (carton, fondu ou retour en ville) et son **rappel** (l'objectif affiché et le
journal la redisent).

| Acte | Scène | Lieu | Texte (où) | Transition | Rappel |
|---|---|---|---|---|---|
| Prologue | P0 Nouvelle aventure | écran | « De la populace » | carton « Le Quai — soir de tournoi » | objectif : les braseros |
| | P1 Le Quai | le Quai | foule, PNJ de démo | — | objectif |
| | P2 Le défi imprévu | braseros | Kaï, le gris du Quai | préparation | objectif : relever le défi |
| | P3 Duel public | la rue | — | résultat | — |
| | P4 La foule | le Quai | la foule, Kaï (selon l'issue) | dialogue enchaîné | — |
| | P5 Les Quatre Voies remarquent | le Quai | le premier émissaire, les trois autres | dialogue | objectif : les émissaires |
| | P6 Le choix | le Quai / maisons | émissaire (Accepter, Différer, Chercher) | écran de confirmation | journal |
| | P7 L'affiliation | — | écran de récompense | retour en ville (couleurs) | journal |
| | P8 La porte s'ouvre | maison | cadet : premier défi | préparation | objectif : le cadet |
| I. La maison | cadet, **K1**, bras droit, chef | maison et Quai | figures (§1), Kaï K1 | résultat → ville | objectif, journal |
| II à IV. Les trois voies | Salle des Bannières ; **K2** ; cadet, bras droit, chef de chaque voie ; **K3**, **K4** | Quai, quartiers | maître de table, figures, Kaï | confirmation d'engagement, résultat | objectif « n voies sur 3 » |
| V. Le Championnat | ouverture par le héraut ; **K5** ; poule, Miroir, Finale | Grande Cour, arène | héraut, chefs, Kaï, Ysolde | préparation, résultat | objectif de manche |
| Titre | proclamation ; **K6** la main tendue | Grande Cour | héraut, Kaï | dialogue | objectif final |

En continu : guetteurs (contrat 1, répliques selon le tempérament), rumeurs (répliques par chapitre et par îlot),
membres des familles, Épreuves et Joutes.

## 4. Les deux Observatoires (question O1, PROPOSÉ)

Constat : la maison de l'Astre s'appelle « l'Observatoire du Parvis » (`MAISONS.Astre`), alors que la Ville haute a un
bâtiment « l'Observatoire » avec son parvis (approuvé en image, passe 135) et que les figures de l'Astre reçoivent sur le
Parvis de l'arène.

**Proposition (la plus réversible, aucune figure déplacée, aucune image) : un seul Observatoire, dans la Ville haute.**
C'est la maison et le registre de l'Astre ; Halvard, Orin et Mira **reçoivent les défis au Parvis**, devant l'arène, où se
mesurent les duellistes. Le nom de la maison devient « l'Observatoire de la Ville haute » et les textes le disent
(« leur maison : l'Observatoire, dans la Ville haute ; ils reçoivent les défis au Parvis »).
Alternatives (fiche) : (b) déplacer les figures de l'Astre sur le parvis de l'Observatoire (une décision de placement,
ADR 028 amendement 8 : « aucune figure déplacée sans décision ») ; (c) garder deux lieux distincts et renommer celui du
Parvis (« la Loge des Astres »).

## 5. Garanties testées (`test/m11-repliques.test.ts`, parcours complet `test/m10f.test.ts`)

- choix déterministe, plus spécifique d'abord, pas de répétition immédiate ;
- chaque locuteur récurrent a au moins trois répliques pour ses situations fréquentes ;
- toutes les répliques : ≤ 240 caractères, sans point médian, sans forme genrée pour le joueur ;
- le parcours complet du prologue au titre traverse chaque événement du rival et chaque scène sans texte vide.
