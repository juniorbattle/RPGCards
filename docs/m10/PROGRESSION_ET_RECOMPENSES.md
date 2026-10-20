# M10 — Progression, récompenses, Championnat, quêtes et progression persistante

**Date :** 2026-10-20 (session cloud autonome). **Statut : PROPOSÉ**, sauf **[RATIFIÉ]** (ADR 029, 030, 031).
**Couvre :** §VII.3 (parcours de progression et récompenses), §IV (Championnat des Champions), §VII.6 (quêtes et
progression persistante). Règles de deck et registre des gains : `AVENANT_M10A_PROPOSE.md` (A-4 à A-8). Personnages :
`CONTRAT_NARRATIF_M10.md` §2 et §4.

---

## 1. Vue d'ensemble du parcours

```
Prologue ── duel public (Kaï) ── remarqué ×4 ── invité ×4 ── CHOIX LIBRE ── affilié (F1) ── 4 Basics F1
   │
Chapitre I — la maison (F1) : cadet → variante III ; bras droit → variante IV ; chef → Signature F1  ⇒ « duelliste reconnu »
   │
Chapitres II à IV — les trois autres voies, dans l'ordre choisi par le joueur, chacune :
   défi officiel (Salle des Bannières) → 4 Basics Fn ; cadet → variante III ; bras droit → variante IV ; chef → Signature Fn
   │
Chapitre V — le Championnat des Champions (l'arène ; cérémonies dans la Grande Cour) ⇒ « meilleur duelliste de la ville »

En parallèle : ville, Épreuves de quartier (variante I), Joutes de maison (variante II), duels de rue, défis du rival.
```

**[RATIFIÉ]** : la séquence Basics → lieutenants (variantes) → chef (Signature), identique pour les quatre familles ;
Basics à la **confirmation** (famille d'accueil) ou à l'**engagement officiel** (autres familles) ; jusqu'à quatre
Signatures possédées, une seule équipée.
**[PROPOSÉ]** : deux lieutenants par famille, l'attribution des variantes (A-8), l'ordre « chef d'accueil d'abord »
(A-6), les compétitions facultatives, le format du Championnat.

---

## 2. Chapitre I — la maison (famille d'accueil F1)

| Étape | Prérequis | Lieu | Duel | Récompense (clé du registre) |
|---|---|---|---|---|
| Affiliation | invitation de F1 **confirmée** | maison de F1 | — | **4 Basics F1** (`basics:F1`) + Technique de F1 (A-3, proposée ; même clé) |
| Défi du **cadet** | `basics:F1` | maison de F1 | cadet de F1 | **variante de Rang III de F1** (`variante:<defId>`) |
| Défi du **bras droit** | cadet battu | maison de F1 | bras droit de F1 | **variante de Rang IV de F1** |
| Défi du **chef** | bras droit battu | maison de F1 (lieu de duel de la famille) | chef de F1 | **Signature ∞ de F1** (`signature:F1`) ; état `chef` vaincu ; titre « duelliste reconnu » |

**Défaite** : aucune perte ; le défi reste ouvert ; le personnage a une réplique de revanche. **Victoire répétée**
(revanche) : aucune récompense (registre). **Abandon** : compté comme une défaite pour la progression (comme dans le
mode standard, distinct d'un K.-O. dans l'historique).

**État `chef`** (ADR 029 §4). Le mot désigne, dans la liste des états de l'ADR, l'étape « le chef de cette famille est
vaincu » (`chef`), qui n'est pas « devenir chef ». **Proposition de lecture à confirmer (ARB-M10-01)** : pour chaque
famille, l'état suit `inconnue → remarqué → invité → affilié (famille d'accueil seulement) | défiée (autres familles)
→ chef (chef vaincu)`. Les états sont **monotones** (on ne redescend jamais) et **distincts de « visité »** (avoir
marché dans le quartier) et de **« rencontré »** (avoir parlé à un membre), qui sont notés à part.

## 3. Chapitres II à IV — les trois autres voies (Fn)

| Étape | Prérequis | Lieu | Récompense |
|---|---|---|---|
| **Défi officiel** de Fn | `signature:F1` (A-6, proposé) | **Salle des Bannières** (salle de jeu de cartes) : scène explicite « Engager le défi de Fn » avec confirmation | **4 Basics Fn** (`basics:Fn`) + Technique de Fn ; état `défiée` |
| Cadet de Fn | `basics:Fn` | maison de Fn | variante III de Fn |
| Bras droit de Fn | cadet battu | maison de Fn | variante IV de Fn |
| Chef de Fn | bras droit battu | lieu de duel de Fn | **Signature de Fn** ; état `chef` |

- **Ordre libre** entre les trois familles ; plusieurs défis officiels peuvent être engagés en parallèle.
- Entrer dans un quartier, parler à un membre, gagner un duel de rue contre un membre : **n'engage pas** le défi (ADR 031
  §4) et ne remet pas les Basics.
- **Cohérence d'accès** : la même table s'applique à toute famille, y compris si le joueur a changé d'affiliation avant
  son premier lieutenant (P-N6) : la clé `basics:F` empêche toute double remise.

**Fin des chapitres II à IV** : 16 identités familiales (Basics), 8 variantes structurantes (III et IV de chaque
famille), 4 Signatures possédées, 0 neutre dans le deck ; le deck est au **format standard** (A-6).

## 4. Chapitre V — le Championnat des Champions (§IV)

**Accès :** les quatre chefs vaincus (`chef` ×4). **Lieu :** l'arène (lieu de duel existant) ; ouverture et clôture dans
la Grande Cour (îlot prévu par M09 ; dans le prototype, une scène au Parvis).

**Principe :** intéresser **sans hausse systématique des statistiques** : chaque manche change **une contrainte de
format** ou **un enjeu narratif**, jamais les PV ni la Puissance. Les adversaires ont des **decks d'auteur** (une
identité tactique lisible), les meilleurs profils d'IA existants, et leurs PV de personnage (repères 90 à 125, §9.1).

| Manche | Format (contrainte) | Adversaire(s) | Ce que la manche teste | Enjeu narratif |
|---|---|---|---|---|
| **1. Les Quatre Bannières** (poule) | quatre duels dans l'ordre choisi ; **la Signature équipée doit changer à chaque duel** (quatre duels, quatre Signatures) | les **quatre chefs**, revanche, chacun avec son deck d'auteur complet | maîtrise des quatre Signatures (A-7) | les chefs reconnaissent le joueur ; 3 victoires sur 4 qualifient |
| **2. Le Miroir** (demi-finale) | l'adversaire joue **un deck construit avec les mêmes familles dominantes que le joueur** (règle déclarative : ses deux familles les plus jouées sur les 5 derniers duels, données publiques) | **Kaï** (le rival, deck Cendre complet + Signature Cendre) — ou, si le joueur est de la Cendre, un bras droit d'une autre famille | adaptation à son propre style | climax du rival (§4 du contrat narratif) |
| **3. La Finale** | **deux manches gagnantes sur trois** ; entre deux manches, le joueur **change sa Signature équipée** et peut changer deux Secondaires de deck (variante ↔ Basic) ; le tenant fait de même selon un plan public annoncé | **le Tenant du titre** (personnage nouveau, maître du mélange des voies : deck Astre de Convergence + Prisme) | lecture, préparation entre manches | titre « meilleur duelliste de la ville », proclamation dans la Grande Cour |

**Pourquoi c'est intéressant sans statistiques** : la manche 1 oblige à jouer chacune des Signatures gagnées (la
collection devient du jeu) ; la manche 2 fait affronter au joueur son propre style ; la finale introduit la **gestion
entre manches** (choix d'équipement), qui n'existe nulle part ailleurs. Aucune règle de Clash n'est touchée : toutes
les contraintes portent sur la **construction du deck** et sur l'**ordre des duels**.

**Défaite au Championnat** : on peut le retenter (nouvelle inscription à la Salle des Bannières), sans perte ; la poule
garde ses victoires acquises (proposition : manche 1 au meilleur des quatre résultats obtenus ; à arbitrer avec le
réglage de difficulté).

**Récompense** : **aucune carte** (tout est déjà possédé) ; un **titre** et la scène finale. Après le titre : revanches
libres contre tous les personnages (sans récompense), compétitions de la ville, et un **Championnat rejouable** sous
contraintes tirées par graine (déterministes, sans récompense matérielle). Proposition à arbitrer : une variante
**cosmétique** (illustration dorée) pour le champion — **hors catalogue de règles**, à n'ajouter que sur décision.

## 5. Compétitions et défis facultatifs (variantes I et II, §V)

Proposés avec A-8 (option a). Toutes **facultatives**, **uniques** (registre), **refusables**, déclaratives.

| Compétition | Ouverte quand | Où | Format | Récompense unique |
|---|---|---|---|---|
| **Épreuve du quartier** de F | `basics:F` | quartier de F | trois membres de F en série (PNJ, gabarits ADR 023), PV pleins à chaque duel (aucune règle nouvelle) ; une défaite arrête la série, on la reprend au début | **variante de Rang I de F** |
| **Joute de la maison** de F | bras droit de F battu | maison de F | un duel contre un membre d'élite, avec une contrainte de **construction** propre à la famille (Cendre : variante Cendre IV équipée ; Ronce : au moins trois cartes Ronce ; Voile : Lecture ou Dissipation équipée ; Astre : au moins trois familles représentées dans le deck) | **variante de Rang II de F** |
| **Duels de rue** | toujours (selon le directeur des rencontres) | rues, places | un duel contre un PNJ de passage | **aucune carte** (historique, répliques) |
| **Défis du rival** | une fois par chapitre au plus | là où est le joueur | duel contre Kaï | **aucune carte** |

Les contraintes de « Joute » sont des **contraintes de construction** (comme au Championnat) vérifiées avant le duel ;
aucune ne modifie le duel lui-même.

## 6. Quêtes et progression persistante (§VII.6)

### 6.1 Modèle de quête **[PROPOSÉ] P-Q1**

Une quête est une **donnée déclarative** (pas de code par quête), lue par une machine pure :

```ts
interface QueteDef {
  id: string;                          // 'prologue', 'maison:Ronce', 'voie:Voile', 'epreuve:Astre', 'championnat', 'rival:2'
  type: 'principale' | 'famille' | 'facultative' | 'rival';
  titre: string;
  etapes: EtapeDef[];                  // ordonnées
  ouverture: Condition;                // quand la quête apparaît au journal
}
interface EtapeDef {
  id: string;                          // 'cadet', 'bras-droit', 'chef'
  objectif: string;                    // texte affiché (« Battez Tessa, cadette de la Cendre, à la Maison du Chantier »)
  lieu?: { ilot: string; spawn?: string };
  terminee: Condition;                 // fait qui la termine (registre, état de famille, duel gagné…)
}
type Condition =
  | { fait: 'gain'; cle: string }                       // clé présente au registre des gains
  | { fait: 'etat'; famille: Family; au_moins: EtatFamille }
  | { fait: 'scene'; id: string }                        // scène narrative jouée
  | { fait: 'victoire'; adversaire: string }             // au moins une victoire publique contre lui
  | { tous: Condition[] } | { un: Condition[] };
```

- **Aucune quête n'est un état stocké à part** : l'état d'une quête se **dérive** des faits sauvegardés (registre des
  gains, états des familles, scènes jouées, historique public des duels). Conséquence : pas de désynchronisation
  possible entre quête et progression, et une sauvegarde se vérifie en recalculant.
- **Objectif courant** (HUD de la ville) = première étape non terminée de la quête principale ouverte ; le **journal des
  quêtes** (menu) liste toutes les quêtes ouvertes, terminées, et les étapes facultatives.
- **Pas de quête « échouée »** : rien ne se ferme par une défaite ou un refus (ADR 029).

### 6.2 Quêtes de la première aventure

| Quête | Type | Étapes |
|---|---|---|
| **Prologue — Le gris du Quai** | principale | parler à Kaï ; duel public ; écouter les émissaires ; choisir sa voie (confirmer une affiliation) |
| **La maison** (F1) | principale | cadet ; bras droit ; chef |
| **Les trois voies** | principale | engager et conquérir chacune des trois autres familles (sous-quêtes « La voie de Fn ») |
| **La voie de Fn** (×3) | famille | défi officiel ; cadet ; bras droit ; chef |
| **Le Championnat des Champions** | principale | les Quatre Bannières ; le Miroir ; la Finale |
| **Épreuve du quartier de F** (×4) | facultative | trois duels en série |
| **Joute de la maison de F** (×4) | facultative | un duel sous contrainte |
| **L'ombre de Kaï** (×5, une par chapitre) | rival | un défi facultatif de Kaï |

### 6.3 Ce qui persiste (sauvegarde `aventure/1`) **[PROPOSÉ] P-Q2**

| Donnée | Rôle | Dérivable ? |
|---|---|---|
| profil (nom, graine) | identité, graines de duels | non |
| **scènes jouées** (liste d'identifiants) | narration, quêtes | non (faits primaires) |
| **états des familles** (`remarqué`, `invité`, `affilié` / `défiée`, `chef`) | progression | partiellement (aussi vérifiables par le registre) |
| **registre des gains** | collection, idempotence | non (faits primaires) |
| **collection Aventure** | équipement | **oui** (dérivée du registre ; stockée pour lecture rapide, vérifiée au chargement) |
| **deck Aventure** | duel | non (choix du joueur), validé (R-AV) au chargement |
| **historique public des duels** | répliques, rival, Championnat | non |
| **directeur des rencontres** (graine, battement, délais, rencontres actives) | ville | non |
| îlot et position | reprise en ville | non |
| duel en cours (config, commandes, hash) | reprise exacte | non |

**Ce qui ne persiste pas** : rien de privé du rival hors du duel en cours (comme `ActiveDuel` du standard) ; aucune
monnaie, aucune XP, aucun niveau.

### 6.4 Invariants de la progression (tests)

1. Les quatre familles sont atteignables depuis toute sauvegarde du prologue (exploration de la machine d'états).
2. Aucune carte familiale avant `affilié` ou `défiée` de sa famille ; aucune variante sans la Basic de son identité ;
   aucune Signature sans `chef` de sa famille.
3. Toute clé du registre est unique ; rejouer n'importe quelle suite d'événements deux fois ne change pas le registre.
4. La collection reconstruite depuis le registre est égale à la collection stockée.
5. Le deck Aventure reste légal (R-AV) après chaque gain ; après les quatre `basics:*` et au moins une Signature, il
   passe le validateur standard.
6. Une défaite ou un refus ne ferme jamais une quête et ne rend jamais une famille inatteignable.
