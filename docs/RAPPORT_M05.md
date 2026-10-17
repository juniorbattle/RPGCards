# Rapport M05 — Boucle RPG compacte : rencontres, collection, progression et sauvegarde

Mission : `docs/missions/M05_RENCONTRES_COLLECTION_ET_SAUVEGARDE.md` (programme M04–M06, ADR 013, ADR 014).
Développement **directement sur `main`**, départ `9491570` (M04 livré).
Règles : **V3.0 + delta V3.2 inchangées** — `git diff 4bfb585..HEAD -- src/game` reste **vide**.
SHA : code M05 `e6e54c1` ; preuves produites sur ce build (QA lancée sur l’arbre de travail au-dessus de `9491570`, commité ensuite tel quel en `e6e54c1` — d’où le champ `commit` des rapports JSON).

## 1. Résumé

- **Une boucle solo de plusieurs duels avec progression observable** : un tableau de rencontres avec la
  **série « Tournoi du Quai »** (trois manches dans l’ordre : Kaï, Maëlle, Sélène — difficulté croissante
  déclarative), des **duels libres** (Kaï d’emblée ; Maëlle et Sélène une fois rencontrées ; **Orin**, nouveau
  rival Astre, après la série), revanches, choix du prochain rival, **récapitulatif** de série, journal de
  progression et historique.
- **Progression sans règles nouvelles** : la première victoire contre un rival rend équipables ses
  **variantes de famille (Rangs II–IV)** et sa **Technique distinctive** (Rupture pour Maëlle, Dissipation
  pour Sélène). Aucune monnaie, aucun rang de joueur, aucune rareté, aucun bonus de Puissance ou de PV : les
  déblocages ne sont que des cartes et Techniques **existantes** ; tout est donnée réglable, marqué
  « prototype ».
- **Sauvegarde schéma 2** (collection, progression, duel en cours) avec **migration 1 → 2 testée sur une
  vraie sauvegarde écrite par le build M04** (`test/fixtures/save-v1-m04.json`).
- **Reprise EXACTE en plein duel** : fermer l’onglet, recharger, ou « Sauvegarder et quitter » puis revenir ⇒
  même état au hash près (zones, RNG, phase, engagements verrouillés, visibilités, journal). Reprise
  **refusée avec sa raison** si le rejeu ne retrouve pas l’état (données altérées, autre catalogue) ;
  le joueur recommence alors ce duel depuis le début ou le retire (non compté).

## 2. Rivaux (personnalités perceptibles, mêmes règles)

| Rival | Famille / Signature | Profil d’IA (existant) | Techniques | PV (prototype) | Deck (prototype) | Où |
|---|---|---|---|---|---|---|
| Kaï, la Braise du quai | Cendre | offensif | Sondage, Lecture | 80 | Cendre I–IV + Astre I en variantes | manche 1, libre d’emblée |
| Maëlle, gardienne des Ronces | Ronce | prudent | Ancrage, Rupture | 95 | Ronce I–IV + Cendre I, Voile I, Astre I–II | manche 2, libre une fois rencontrée |
| Sélène, liseuse du Voile | Voile | lecteur / interférent | Lecture, Dissipation | 100 | 16 variantes | manche 3, libre une fois rencontrée |
| **Orin, l’arpenteur des Astres** (nouveau) | Astre | équilibré | Recentrage, Ancrage | 110 | 16 variantes | libre après la série |

- Orin est un **habillage de données** : apparence procédurale générée par les mêmes couches que les autres
  (peau, cheveux, tenue, yeux, aucune image), répliques propres, profil `equilibre` déjà présent dans l’IA.
  Il est ajouté **en fin de liste** : les seeds des entrées QA historiques tirent toujours les trois rivaux M02–M03.
- PV propres au personnage, repères de calibration §9.1 (« quartier ~90 », « compétiteur ~125 ») ; le joueur
  garde **90 PV** (aucune progression de PV ratifiée). La difficulté vient du deck, des Techniques et du
  profil ; **l’IA ne voit que sa vue** (inchangé).
- Préparation : seules les informations **publiques** du rival (PV, Signature, Techniques — ARB-002 tel
  qu’implémenté, non ratifié —, style comportemental) ; jamais son deck exact, sa main ni ses intentions.

## 3. Collection et progression (`src/product/progression.ts`, données de prototype)

| Élément | Règle |
|---|---|
| Départ | 16 Basic, 4 Signatures, 4 Techniques (Sondage, Recentrage, Lecture, Ancrage), variantes de Rang I des 4 familles |
| Première victoire contre un rival | ses variantes de famille de Rangs II–IV ; Maëlle : + Rupture ; Sélène : + Dissipation |
| Victoires suivantes | rien de plus (pas d’accumulation) |
| Défaite, abandon | rien ; la revanche reste ouverte ; le rival compte comme « rencontré » |
| Série | manche k ouverte quand la manche k−1 est gagnée ; série remportée ⇒ récapitulatif, Orin débloqué ; « Rejouer la série » repart de la manche 1 (collection conservée) |
| Mode démo (options) | tout le catalogue équipable, réversible, sans toucher à l’historique ni aux déblocages |

Une variante remplace la version Basic de son identité : **jamais une 18e carte**, jamais une Puissance différente
(test : chaque récompense a la Puissance de sa Basic). La collection affiche, pour chaque carte non possédée,
**comment l’obtenir** (« Première victoire contre Maëlle (prototype) »).

## 4. Persistance et reprise (ADR 014)

- Schéma 2 = schéma 1 + `collection`, `progress` (manche, rivaux rencontrés / vaincus, journal des
  déblocages), `activeDuel` (`config`, `commands`, `hash`, `turn`, versions du catalogue et des règles).
- **Migration 1 → 2** : collection et progression **reconstituées depuis l’historique** (premières victoires),
  série à la manche 1, pas de duel en cours ; réécrite aussitôt au schéma 2 (l’original v1 devient la copie
  de secours). Testée sur une sauvegarde réelle du build M04 (une victoire contre Kaï, un abandon).
- **Point de sauvegarde après chaque commande acceptée** (joueur ET rival) : commandes + hash. Reprise :
  contrôle des versions, **rejeu sur le moteur pur, comparaison du hash**, puis ouverture du duel ; la vue du
  joueur est identique (test). Ce qui n’est pas conservé, et le menu le dit : les choix **non verrouillés** du
  moment ; une résolution interrompue reprend **à l’état résolu** sans rejouer l’animation.
- Le duel en cours contient des informations privées des deux sièges : il reste local, n’est ni affiché ni
  résumé ; les résultats et l’historique sont calculés des seuls événements visibles du joueur.

## 5. Tests et QA

| Contrôle | Résultat |
|---|---|
| `npm run typecheck` · `npm test` · `npm run build` | OK · **146/146** (dont `test/progression.test.ts` : disponibilité motivée des rencontres, série complète avec défaite / abandon / victoires, récompenses = cartes existantes à Puissance de leur Basic, toutes les rencontres jouables jusqu’au K.-O. y compris Orin, dérivation depuis l’historique, schéma 2, **migration d’une vraie sauvegarde v1 du build M04**, collection / progression incohérentes refusées, **reprise par rejeu = même hash et même vue joueur** à 3 instants d’un duel et après aller-retour JSON, reprise refusée si données altérées / autre catalogue / commande corrompue, résumé identique après rejeu) · OK |
| `npm run qa:product` — A à D (M04, adaptés : Kaï seul ouvert au départ) | 10/10, 4/4, 5/5, 6/6 contrôles ; duels A (clic) et B (glisser 1920 + clavier) audités : vues 56 / 0 écart, 0 fuite, 0 clic perdu |
| **E — série complète par l’interface** (1280, clic et glisser, profil `profileSeed=20261017`) | **22/22** : 8 duels — manche 1 Kaï **victoire** (7 tours), manche 2 Maëlle **victoire** (20 tours), manche 3 Sélène 5 défaites puis **victoire** (17 tours, 3 prolongations) ; la série n’avance que sur victoire ; déblocages (9 variantes + Rupture + Dissipation) ; récapitulatif ; Orin débloqué ; deck enrichi (Ferveur + Rupture) ; rechargement : tout intact. Chaque duel audité (vues, composition, postures, secrets) : 0 écart, 0 fuite. 12 min 12 s sous SwiftShader |
| **F — reprise en plein duel** | **10/10** : sauvegarde à chaque commande ; rechargement pendant l’engagement (Primaire posée, non verrouillée) ⇒ « Reprendre le duel contre Kaï » ⇒ **même hash et même vue joueur**, brouillon non conservé (annoncé) ; Sauvegarder et quitter ⇒ tableau (duel en cours signalé, autres rencontres bloquées) ⇒ Reprendre ⇒ même état ; duel terminé compté **une fois** ; rechargement **pendant la résolution d’un Clash** ⇒ état résolu retrouvé ; abandon depuis le tableau ⇒ classé « abandon » |
| **G — migration v1 réelle** | **4/4** : la sauvegarde du build M04 est lue, annoncée « mise à jour depuis le schéma 1 », profil / deck / historique conservés, Kaï (vaincu en M04) reconnu vaincu, réécrite au schéma 2 |
| **H — reprise altérée** | 1er passage 2/3 : refus correct mais **assertion de test trop étroite** (l’altération faisait échouer le rejeu lui-même — « Le rejeu du duel a échoué (Le Clash doit être résolu avant le tour suivant.) » — au lieu d’aboutir à un hash différent) ; assertion élargie aux deux motifs légitimes, H relancé : **3/3** (aucun duel ouvert sur un état non vérifié ; « Recommencer depuis le début » repart au tour 1 avec la configuration enregistrée) |

Preuves : `artifacts/qa/m05-qa-product-premier-passage.json`, `artifacts/qa/m05-qa-product-H-relance.json`, journal `artifacts/qa/logs/m05-qa-product-premier-passage.txt` ; captures du runtime réel pendant ces parcours : `screenshots/qa/m05/` (résultats de chaque manche, récapitulatif, tableau et collection après la série, préparation contre Orin, accueil « Reprendre », tableau avec duel en cours, accueil après migration, refus de reprise).

## 6. Écarts et limites

- Les choix de progression (récompenses à la première victoire, ordre de la série, PV et decks des rivaux,
  collection de départ) sont des **prototypes** : ils ne constituent ni une économie ni une courbe validée.
- Pas de hub de ville : le tableau de rencontres est un **prototype de navigation**. Pas de narration au-delà
  d’une ligne de style par rival et du récapitulatif.
- Un duel en cours bloque les autres rencontres (un seul duel à la fois, par conception).
- Les captures et la QA tournent sous SwiftShader (rendu logiciel) : durée des duels joués par l’interface
  ≈ 1 à 3 minutes chacun, sans valeur de mesure de fluidité.

## 7. Commits

- `e6e54c1` — code M05 (rencontres, Orin, progression, sauvegarde v2, reprise, tests, QA produit E–H).
- Ce rapport, l’ADR 014 et les preuves : commit documentaire suivant.

## 8. Arbitrages demandés

1. Forme de la progression de prototype (première victoire → variantes de famille + Technique distinctive ;
   collection de départ) — à remplacer par un contenu validé.
2. PV et decks des rivaux, ordre de la série, déblocage d’Orin après la série.
3. Orin, quatrième rival (Astre, profil équilibré) : à valider comme personnage.
4. ARB-002 (Signature et Techniques du rival publiques avant le duel) : toujours non ratifié.
