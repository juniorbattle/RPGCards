# M11 — Contrat 6 : le son, synthétisé par code

**Date :** 2026-10-26. **Statut : PROPOSÉ** (décision du responsable : « le son entre dans le jeu : effets sonores et
ambiance »). **Code :** `src/son/` (moteur Web Audio, catalogue de sons, correspondances pures événements → sons).
ADR 042.

## 1. Principes

- **Synthétisé par code** (Web Audio : oscillateurs, bruit généré, filtres, enveloppes), comme l'art est « code-first » :
  **aucun fichier son**, aucune bibliothèque ajoutée.
- **Après un geste du joueur** : le contexte audio se crée (ou reprend) au premier clic ou à la première touche ; avant,
  rien ne joue et rien ne s'installe.
- **Volume général** (0 à 100 %, défaut 70 %) et **coupure**, mémorisés dans le navigateur (`lqv.son`, à part des
  sauvegardes, lecture et écriture protégées) ; réglage dans les **Options** du jeu standard et dans le **menu** de
  l'aventure, jamais sur l'écran d'accueil au repos.
- **Coupé en QA** : `?qa=1` coupe le son sauf `?son=1` ; `?son=0` le coupe partout ; les outils de QA passent `?qa=1`
  (parcours déterministes, aucune dépendance à l'audio).
- **Jamais d'information secrète par le son** : un son ne joue que sur un événement public (ou privé de son
  propriétaire, pour le joueur seulement).
- Pur là où ça se teste : la correspondance « événements du moteur → sons » et les réglages sont des fonctions pures ;
  le moteur audio n'exécute que des ordres.

## 2. Les sons

| Famille | Son | Quand (événement) | Synthèse (principe) |
|---|---|---|---|
| Interface | `ui` | clic d'un bouton d'écran ou de dialogue | tic court, sinus 880 Hz, 40 ms |
| | `ui-retour` | fermer, revenir | tic grave 520 Hz |
| Cartes | `carte-pose` | engagement verrouillé, Secondaire posée | bruit filtré court (frottement) + petit choc |
| | `revelation` | Primaires révélées | deux notes montantes (triangle) |
| Clash et dégâts | `clash` | résolution du Clash | choc grave (sinus 70 Hz descendant) + éclat de bruit |
| | `degats` | dégâts reçus par un camp | glissando descendant (dent de scie filtrée) |
| | `garde` | une Garde gagne ou absorbe (V3.3) | tintement métallique (deux sinus inharmoniques) |
| | `interference` | Interférence réussie | pincement aigu (carré filtré) |
| | `signature` | Signature annoncée (avenant 08) | accord qui enfle (trois sinus, quinte) |
| | `victoire` | fin du duel gagnée | arpège majeur ascendant |
| | `defaite` | fin du duel perdue | trois notes mineures descendantes |
| Ville | `pas` | chaque demi-foulée du joueur qui marche | bruit filtré passe-bas très court, hauteur variable |
| | `repere` | un guetteur repère le joueur (« ! ») | deux notes piquées, aiguës |
| | `rival` | Kaï surgit | coup de cuivre (dents de scie désaccordées) + timbale |
| | `voyage` | changement d'îlot (fondu) | souffle (bruit filtré qui monte puis descend) |
| Ambiances | `amb-quai` | dans le Quai | clapot (bruit filtré lent, modulé) + cloche lointaine rare |
| | `amb-ruelles` | dans les Ruelles | filet d'eau (fontaine) |
| | `amb-parvis` | dans le Parvis | rumeur de foule (bruit en bande, modulé) |
| | `amb-cour` | dans la Grande Cour | rumeur de foule plus dense |
| | `amb-port` | sur la Place du Fanal | ressac lent |
| | `amb-haute` | dans la Ville haute | vent léger, carillon rare |
| | `amb-duel` | pendant un duel | bourdon grave, très bas |

## 3. Mixage et calage

Les sons de la résolution d'un Clash (Interférence, issue, Garde, dégâts, fin) suivent les **temps de sa chorégraphie**
(séquenceur `beats.ts`), pas l'arrivée des événements ; « Passer » ne rejoue que la fin du duel.


Un bus général (volume, coupure) → trois bus : **effets** (1,0), **ambiance** (0,35), **interface** (0,6). Les ambiances
se croisent en 0,8 s au changement d'îlot et se coupent pendant un duel (le bourdon du duel les remplace). Un limiteur
(compresseur) en sortie évite la saturation. Au plus 12 voix d'effets en même temps (les plus anciennes coupées).

## 4. Garanties testées (`test/m11-son.test.ts`)

- les événements du moteur donnent les bons sons (Clash, dégâts selon le camp, Garde, Signature annoncée, fin) ;
- un événement privé de l'adversaire ne donne aucun son ;
- les réglages se lisent, s'écrivent, se bornent, et survivent à un stockage indisponible ;
- `?qa=1` coupe, `?qa=1&son=1` réactive, `?son=0` coupe ;
- sans geste du joueur, aucun contexte audio n'est créé ; coupé, aucun son n'est joué ;
- le jeu par défaut au repos reste identique au pixel près (le réglage n'est que dans les Options).
- **Non vérifiable dans le cloud** : l'écoute réelle (timbre, niveaux, fatigue) ; à faire en local (retour de session).
