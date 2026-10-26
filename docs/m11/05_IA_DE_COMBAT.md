# M11 — Contrat 5 : l'IA de combat (audit et niveau 2)

**Date :** 2026-10-26. **Statut : PROPOSÉ.** **Code :** `src/game/ai/policy.ts` (nouvelle branche activée par le profil),
`src/game/ai/memory.ts` (mémoire étendue, vue publique). ADR 041.

## 1. Audit de `policy.ts` (état au départ, `bd93beb`)

**Ce qu'elle évalue.** Une IA heuristique non omnisciente (vue `PlayerView` seulement, mémoire tirée des événements
visibles) :
- **Engagement** : pour chaque carte de la main et chaque mode, moyenne sur 14 Primaires adverses tirées au hasard dans
  les identités non localisées (Basics), mode adverse tiré selon la fréquence publique de ses Assauts, usage adverse
  des Secondaires actives tiré au hasard ; pour chaque cas, le meilleur plan tactique (`enumeratePlans`) évalué par
  `computeClash` (la même arithmétique que le moteur, V3.3 comprise) ; score = dégâts infligés × agressivité − subis ×
  prudence, bonus létal, bonus Garde gagnante, valeur des Secondaires gardées ; moins le coût de la carte, plus un
  bruit et un biais de mode.
- **Annonce (avenant 08)** : une Signature adverse annoncée est la seule Primaire adverse possible.
- **Révision** : rejoue l'engagement avec le même tirage.
- **Tactique** : tous les plans, trois scénarios adverses à poids fixes (garder 35 %, Rang 30 %, Dégâts 35 %).
- **Techniques** : Sondage au hasard, Lecture au hasard, Ancrage et Rupture au hasard sous conditions, Dissipation si
  une source de camouflage existe.

**Où elle se trompe ou ce qu'elle ignore.**
1. **Les cartes grises** : le tirage des Primaires adverses ne connaît que les Basics des quatre familles ; contre le deck
   d'aventure du joueur (neutres), elle croit à des affinités et des effets qui n'existent pas.
2. **Sa propre Signature annoncée** : elle l'évalue contre des Primaires adverses moyennes, alors que l'adversaire la
   voit (annonce) et peut répondre au mieux (et réviser).
3. **Variance** : 14 tirages avec remise et un bruit de ±1,5 font changer d'avis sur des choix proches.
4. **Recentrage** n'est jamais utilisé ; le Sondage et la Lecture sont joués au hasard, sans regarder la main ni le coût
   d'opportunité de l'Insight.
5. **Mémoire courte** : seule la fréquence globale des Assauts adverses ; pas le mode selon le Rang joué (habitude
   publique), pas les Interférences adverses dans la tactique.
6. **Course aux PV** : prudence et agressivité fixes, quel que soit l'écart de PV.
7. **Révélation des Secondaires** (préparation) : au hasard, selon le bluff.

## 2. Le niveau 2 (nouveaux profils, options)

Profils **nouveaux** (`PROFILES`), utilisés par l'aventure (tempéraments, contrat 3) ; les profils existants
(`equilibre`, `offensif`, `prudent`, `lecteur`, `novice`, `timide`) passent **exactement** par l'ancien chemin (même
suite de tirages) : empreintes et replays standard identiques, tests du moteur inchangés.

| Profil | Base | Particularités |
|---|---|---|
| `tacticien` | équilibré | niveau 2 |
| `agressif` | offensif | niveau 2, presse quand il mène |
| `ruse` | prudent | niveau 2, mémoire et Techniques plus fortes |
| `vicieux` | prudent | niveau 2, bluff 0,1, Interférences favorisées, Techniques presque toujours, mémoire 0,9 |

Premier réglage écarté sur mesure (passe 144) : un « vicieux » tiré du profil `lecteur` avec un bluff de 0,35 jouait
**plus mal** que le `novice` contre le deck d'aventure (Secondaires gardées cachées, donc sans soutien).

Améliorations du niveau 2 (toutes sur la vue publique) :
- **N2-1 cartes grises** : quand l'adversaire a montré une carte grise (défausse, Primaire révélée, Secondaire active),
  les neutres entrent dans le tirage de ses Primaires possibles.
- **N2-2 tirage stratifié** : chaque identité possible une fois (jusqu'à 20), pondérée par la mémoire, au lieu de 14
  tirages avec remise ; bruit réduit (±0,5).
- **N2-3 Signature annoncée** : une Primaire Signature est évaluée à moitié contre la moyenne, à moitié contre la
  **meilleure réponse** adverse (l'adversaire la verra).
- **N2-4 habitudes publiques** : fréquence des Assauts adverses selon le Rang de la Primaire révélée (lissée), et
  Interférences adverses observées dans les scénarios tactiques.
- **N2-5 course aux PV** : prudence +20 % quand il mène de 15 PV ou plus (garder l'avance), agressivité +20 % quand il est mené d'autant (revenir).
- **N2-6 Techniques** : Recentrage d'une carte de Rang I quand la main n'a aucune carte de Rang III ou IV ; Sondage
  seulement si l'Insight ne manque pas à la Lecture ou à la Rupture du tour.

## 3. Mesures (`tools/m11-ia.ts`, mêmes graines)

- IA contre IA, 400 duels par appariement, moteur réel, l'adversaire verrouille en premier comme le rival :
  chaque profil de niveau 2 contre `equilibre`, `offensif`, `prudent`, `lecteur` (taux de victoire, tours par duel) ;
- contre le deck d'aventure (neutres) : `tacticien` et `novice` comme adversaires d'un joueur « équilibré » à cartes
  grises ;
- **contrôle** : les empreintes standard (`tools/replay-hash.ts`, `test/`) identiques avant / après.

## 4. Extension au Duel standard

**Proposition de la fiche seulement**, chiffrée par les mesures : un niveau de difficulté « Duelliste aguerri » qui
donnerait aux rivaux du jeu standard le niveau 2 de leur profil. Rien ne change par défaut.
