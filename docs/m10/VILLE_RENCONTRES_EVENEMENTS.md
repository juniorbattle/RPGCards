# M10 — Ville : rencontres et événements (directeur des rencontres)

**Date :** 2026-10-20 (session cloud autonome). **Statut : PROPOSÉ.** **Couvre :** §V et §VII.5 de la mission M10.
**Préserve** (mission §V ; M09 en pause) : îlots, déplacements, caméra frontale 2.5D (ADR 024), architecture en îlots
(ADR 025), dioramas et feuilles de personnages et leurs approbations (ADR 027, 028), quartiers en rangs
(`docs/M09_QUARTIERS_EN_RANGS.md`). Le directeur **ne construit aucun décor** et ne touche ni au moteur de marche ni
au moteur de combat.

---

## 1. Ce que la ville sait déjà faire **[EXISTANT]**

- **Îlots** (`src/ville/ilots.ts`) : `quai`, `parvis`, `ruelles` ; un seul en mémoire ; sorties avec fondu ; points
  d'apparition nommés ; mémoire de l'îlot et de la position (`src/ville/demo.ts`).
- **Zones** (`src/ville/monde.ts`) : `porte`, `sortie`, `parler`, `info` ; la ville **signale** une interaction
  (`onInteract`), l'appelant décide.
- **Personnages d'îlot** (`IlotNpc` : identifiant de personnalité, position, regard, rôle `guide` / `duel` / `rival`,
  rencontre liée) ; **passants** (`ambient`) ; **repères** « ! » (un défi) et « ? » (quelqu'un à écouter)
  (`Town.setMarkers`).
- **Entrée en duel** : la ville ouvre la préparation d'une rencontre déjà définie ; retour au même îlot devant le
  personnage (`returnTo`).
- **Quartiers en rangs** (laboratoire) : rangs reliés par des passages, chemins lumineux, places (place de la Halle,
  placette du Puits, cour de la Chapelle).

**Ce qui manque pour M10** : des personnages qui **apparaissent selon la progression** (émissaires, lieutenants, chefs,
membres, Kaï), des **rencontres facultatives** qui varient sans devenir aléatoires à chaque pas, et une **mémoire** de
ce qui a été proposé, refusé, joué. C'est le rôle du directeur.

## 2. Principes **[PROPOSÉ] P-V1**

1. **Visibles avant d'agir** : toute rencontre est un **personnage présent** dans l'îlot, avec un repère ; le joueur
   va vers lui. **Jamais d'embuscade**, jamais de téléportation devant le joueur, jamais de duel lancé sans son accord.
2. **Peu, et au bon moment** : le directeur ne décide qu'aux **points de décision** (entrée dans un îlot, retour d'un
   duel, scène narrative terminée), **jamais à chaque pas** ni à intervalle de temps.
3. **Déterministe et sauvegardable** : mêmes faits + même graine ⇒ mêmes rencontres ; l'état du directeur est dans la
   sauvegarde Aventure ; un rechargement ne fait pas « re-tirer » les rencontres.
4. **Dépend des personnages, des lieux et de la progression** (mission §V) : chaque rencontre déclare son personnage,
   son lieu possible, ses prérequis.
5. **Séparé** : module pur `src/aventure/directeur.ts` (aucun Three.js, aucun DOM) ; la ville reçoit seulement une
   liste de personnages à poser et de repères.

## 3. Le battement narratif (horloge du directeur)

Le temps du directeur n'est **ni le temps réel ni la distance** : c'est un compteur de **battements**, incrémenté par
des faits significatifs :

| Fait | Battements |
|---|---:|
| duel terminé (quel qu'il soit) | +1 |
| scène narrative principale terminée | +1 |
| changement d'îlot | +0 (un point de décision, mais pas un battement : marcher ne fait pas « passer le temps ») |

Les **délais narratifs** (« cooldowns ») s'expriment en battements : « Kaï ne revient pas avant 4 battements » =
quatre duels ou scènes plus tard, quel que soit le temps passé à marcher.

## 4. Déclaration d'une rencontre **[PROPOSÉ] P-V2**

```ts
interface RencontreDef {
  id: string;                        // 'rue:docker-quai', 'rival:ombre-2', 'epreuve:Ronce', 'emissaire:Voile'
  genre: 'structurante' | 'facultative' | 'rival' | 'competition' | 'ambiance';
  personnage: string;                // identifiant de personnalité (rival, PNJ `pnj-<gabarit>-<graine>`, figure M10)
  lieux: Array<{ ilot: IlotId; place: { x: number; z: number }; regard: Facing }>;   // où il peut se tenir
  prerequis: Condition;              // mêmes conditions que les quêtes (PROGRESSION §6.1)
  fenetre?: { depuis?: Condition; jusqua?: Condition };   // disponibilité (ex. jusqu'à l'affiliation)
  delai: number;                     // battements entre deux apparitions (0 = permanente)
  maxParChapitre?: number;           // rival : 1
  poids: number;                     // tirage entre candidates du même îlot
  repetable: boolean;                // un duel de rue peut revenir ; une Épreuve gagnée, non
  duel?: { rencontre: string };      // la rencontre de duel ouverte en cas d'accord
  refusable: true;                   // toujours vrai sauf structurante engagée par le joueur
}
```

- **Structurantes** (émissaires, cadets, bras droits, chefs) : **permanentes** dès que leurs prérequis sont vrais,
  à leur place fixe (maison de la famille) ; le directeur ne les tire pas, il les **pose**.
- **Facultatives** (duels de rue, membres des familles, compétitions, Kaï) : **tirées** aux points de décision, au plus
  **une nouvelle par îlot et par point de décision**, et au plus **deux facultatives présentes** à la fois dans un îlot
  (en plus des structurantes) : la ville reste lisible.

## 5. Algorithme (pur, déterministe)

À chaque **point de décision** dans l'îlot `I` :

1. **Poser les structurantes** de `I` dont les prérequis sont vrais.
2. **Retirer** les facultatives de `I` dont la fenêtre est close, ou déjà jouées et non répétables.
3. Si moins de deux facultatives sont présentes dans `I` : former les **candidates** de `I` (prérequis vrais, fenêtre
   ouverte, délai écoulé `battement ≥ dernière + délai`, quota par chapitre non atteint, pas déjà présente).
4. Tirer **au plus une** candidate, pondérée par `poids`, avec un générateur **dérivé de** `(graine du profil, battement,
   I)` (même méthode que `src/game/engine/rng.ts` : `hashString` + `makeRng`) ; aucune `Math.random`.
5. Enregistrer : `actives[I]` (identifiant, place), `derniere[id] = battement`.
6. La ville reçoit la liste (personnage, place, regard, repère « ! » si duel proposé, « ? » sinon).

À l'**issue** d'une rencontre : accord → duel (rencontre de duel existante ou d'aventure) ; refus → le personnage reste
jusqu'au prochain point de décision, sans redemander (pas de harcèlement), puis peut partir ; duel joué → `joues[id]++`.

**Garanties testées** : même état + même graine ⇒ même résultat ; aucune facultative tirée hors d'un point de
décision ; jamais plus de deux facultatives par îlot ; le rival au plus une fois par chapitre ; un refus n'a aucune
conséquence de progression ; l'état sérialisé puis rechargé redonne exactement les mêmes rencontres.

## 6. État sauvegardé du directeur

```ts
interface EtatDirecteur {
  graine: number;                                   // dérivée de la graine du profil
  battement: number;
  actives: Partial<Record<IlotId, Array<{ id: string; place: number }>>>;   // place = indice dans `lieux`
  derniere: Record<string, number>;                 // battement de la dernière apparition
  joues: Record<string, number>;                    // duels joués par rencontre
  refuses: Record<string, number>;                  // refus (répliques seulement)
}
```

## 7. Catalogue initial des rencontres (première aventure)

| Rencontre | Genre | Personnage | Où | Prérequis / fenêtre | Délai | Duel |
|---|---|---|---|---|---:|---|
| Kaï, au prologue | structurante | Kaï | le Quai, est (braseros) | scène P1 jouée, jusqu'au duel P3 | 0 | duel inaugural |
| Émissaire de F (×4) | structurante | cadet de F | maison de F | `invité` F, jusqu'à `affilié` ou `défiée` F | 0 | — (dialogue P6) |
| Cadet / bras droit / chef de F | structurante | figures de F | maison de F | PROGRESSION §2–3 | 0 | défis de progression |
| Docker du Quai | facultative | `pnj-docker-1` (existant) | le Quai | toujours | 3 | duel de rue |
| Commis du Quai | facultative | `pnj-commis-5` (existant) | le Quai | après le prologue | 3 | duel de rue |
| Joueuse du Parvis | facultative | `pnj-joueuse-5` (existante) | le Parvis | après le prologue | 3 | duel de rue |
| Membre de F (×4) | facultative | PNJ à accent familial | quartier de F | `basics:F` | 2 | duel de rue (répliques de la maison) |
| Épreuve du quartier de F | compétition | membre organisateur | quartier de F | `basics:F`, non gagnée | 0 | série de trois |
| Joute de la maison de F | compétition | membre d'élite | maison de F | bras droit de F battu, non gagnée | 0 | duel sous contrainte |
| L'ombre de Kaï (×5) | rival | Kaï | îlot où entre le joueur | une par chapitre, après la première scène du chapitre | 4 | défi facultatif |
| Rumeurs | ambiance | passants existants | tous | — | 1 | — (réplique « ? ») |

**Rangs du Quai** (quand ils entreront dans le jeu, après reprise de M09) : les places (place de la Halle, placette du
Puits, cour de la Chapelle) sont des **lieux candidats** naturels pour les facultatives (un étal, un puits, une
chapelle : le joueur y va de lui-même) ; le directeur n'a besoin que de leurs coordonnées. Aucun changement de la
grammaire des rangs.

## 8. Mise en scène dans la ville (sans nouveau décor)

- **La foule du prologue** (scène P4) : les passants existants de l'îlot (`ambient`) **s'arrêtent et se tournent** vers
  le joueur, plus trois ou quatre PNJ statiques posés autour du lieu du duel (gabarits ADR 023) ; aucune image nouvelle
  (personnages dessinés par code hors QA ; feuilles non approuvées seulement en QA).
- **Émissaires** : un repère « ? » puis « ! » ; leur maison est un point du quartier (une porte existante : salle,
  Fanal, porte de l'arène ; la fontaine des Ruelles ; la façade `chantier` du Quai).
- **Retour de duel** : même règle que la démo (retour au même îlot devant le personnage).
- **Pas de dialogue bloquant** : les bulles d'interaction de la démo (`promptBubble`) et une boîte de dialogue qui se
  ferme par Échap sans rien décider.

## 9. Ce que M10 demandera à M09 (à la reprise, non commandé)

- La **Grande Cour** (V5) pour les cérémonies (affiliation, Championnat) ; d'ici là, scènes au Parvis.
- Des **marcheurs** pour les quatre chefs et les quatre cadets (accent familial), et une **foule** (variations de PNJ par
  graine, déjà possibles par code).
- À terme, une **maison par famille** en rangs (le Fanal en intérieur ? la Maison du Chantier ? l'Observatoire du
  Parvis ?) : **proposition pour plus tard**, rien n'est demandé dans M10.
