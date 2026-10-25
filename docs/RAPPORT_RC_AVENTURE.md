# Rapport de la release candidate du mode Aventure (M10-F) : `0.10.0-rc.1` proposée

Mission : `docs/m10/FEUILLE_DE_ROUTE_M10.md`, section M10-F (QA d'ensemble, équilibrage, migration, RC Aventure), lancée
par le responsable le 2026-10-25 (fiche de la Garde, S1), en commençant par T1 (fiche de l'avenant 08). Exécution : session
locale du 2026-10-25, développement directement sur `main`, mesures sur le poste du responsable (Windows, Chrome,
**Radeon 780M** et **RTX 4060** avec `--force_high_performance_gpu`).

Règles : **V3.0 + delta V3.2 + avenants 07 et 08 et amendement 1 (`V3.0+delta-V3.3.2`), inchangées pendant M10-F** :
aucun fichier de `src/game/` n'a changé (`git diff 377f7cc -- src/game` vide) ; l'annexe de calibrage n'a pas changé
(`src/aventure/paliers.ts` : seul un libellé d'affichage, « champions »). Secrets : aucune surface publique modifiée (ADR 011).
Version : **`0.10.0-rc.1` proposée, pas posée** : `package.json` et `src/product/version.ts` portent encore `0.8.0-rc.1` ;
le numéro est une décision du responsable (fiche, V1). Le poser change deux lignes et l'étiquette `gameVersion` des
sauvegardes ; aucune migration (schémas inchangés : `lqv.save` 2, `aventure/1`).

## 1. Le lot M10-F — fait

| Étape | Statut | Preuve |
|---|---|---|
| T1 : pilote de QA moins naïf (outil seulement) | **OK** (`890c1f1`, passe 119) | parcours E de `qa:product` vert (série en 6 duels) ; §2 |
| Textes relus, aide du mode Aventure | **OK** (`43a62d9`, passe 120) | §3 |
| Parcours complet du prologue au titre, reprise à chaque scène | **OK** (`43a62d9`) | `test/m10f.test.ts`, §4 |
| Équilibrage mesuré par palier (objectifs de l'annexe, ex-A-10) | **OK, écarts signalés, rien recalibré** | §5, `artifacts/qa/m10f/equilibre/` |
| Contrôles : migration, secrets, pixel près, performances | à compléter | §6 |
| Campagne de QA complète sur les deux GPU | à compléter | §7 |
| Version `0.10.0-rc.1` | **préparée, décision au responsable** | ci-dessus |

## 2. T1 — le pilote de QA

Depuis les avenants 07 et 08, le pilote de QA (`tools/duel-driver.mjs`) ne gagnait plus la série du Tournoi du Quai
(`qa:product`, parcours E : 12 défaites de suite contre Maëlle, plafond de 16 duels). Mesure sur le moteur pur
(`tools/t1-pilote.ts`, 300 duels par manche) : l'ancien pilote gagnait 37 % contre Kaï, **6 %** contre Maëlle, 22 % contre
Sélène (série en 16 duels : **43 %**). Garder seulement la Signature faisait pire (série 9 %) : le handicap venait aussi
d'un engagement prévisible et de choix tactiques naïfs.

**Le pilote demande désormais l'IA « équilibré » du jeu pour l'engagement, la révision et les choix tactiques**, sur la
**vue autorisée du joueur** (sa projection et sa mémoire tirée des seuls événements visibles par lui), dans Node, puis joue
le choix **par l'interface** (gestes et audits inchangés) : la Signature gardée tant qu'elle ne vaut pas son coût, le mode
tiré avec la graine du duel (rejouable). Il gère aussi la fenêtre de révision du joueur (avenant 08, amendement 1), où
l'ancien restait bloqué. Mesure : Kaï 70,7 %, Maëlle 43,0 %, Sélène 57,7 % ; série en 16 duels : **99,88 %**. Le jeu ne
change pas ; le plafond de 16 duels est gardé.

## 3. Textes et aide

Relecture de tous les textes affichés du mode Aventure (écriture épicène sans point médian ; règles à jour ; textes
périmés) ; aucune contradiction avec les avenants 07 et 08, aucun point médian. Corrigé : les mentions « prototype »
encore affichées (onglet, écran titre, bandeau du duel, HUD) ; le chapitre affiché brut à l'écran titre (« Champion »,
masculin, après le titre) ; « Nom du duelliste » ; les rôles non accordés (« Tessa (cadet) », « Mère Aubépine (chef) ») ;
« Parler à le héraut » ; « Le Couronne de Ronce » ; des identifiants bruts (« Cendre affilie », « brasDroit-Cendre ·
defaite ») ; « Rang 3 » ; « Deck légal (règle R-AV, avenant M10-A) ». **Aide** complétée (deck et Collection, PV qui
montent, défaite sans perte, Salle des Bannières, Championnat, sauvegarde). Détail : journal, passe 120. **Laissé au
responsable** (fiche, X1) : « le chef de la Ronce », « Votre chef est vaincu » quand la cheffe est Mère Aubépine ou Ilse.

## 4. Parcours complet du prologue au titre

`test/m10f.test.ts` (dans `npm test`) : pour **chacune des quatre familles d'accueil**, le prologue, la maison, les trois
autres voies, puis le Championnat jusqu'au **titre** ; chaque duel joué jusqu'au bout sur le moteur réel par l'IA
« équilibré » du joueur contre le profil de l'adversaire, avec la logique de l'application autour des duels
(`src/aventure/fin.ts`) ; **après chaque scène, la sauvegarde est écrite, relue et le parcours continue sur la copie
relue** ; **chaque duel est sauvegardé au milieu, contrôlé et repris par rejeu** (même empreinte) ; déterminisme vérifié
(même graine, même sauvegarde octet pour octet).

| Famille d'accueil | Duels | Défaites | Scènes relues | Duels repris au milieu | Tours par duel | PV finaux |
|---|---:|---:|---:|---:|---:|---:|
| Cendre | 27 | 8 | 97 | 27 | 9,7 | 131 |
| Voile | 26 | 7 | 91 | 26 | 9,7 | 128 |
| Ronce | 31 | 12 | 111 | 31 | 10,2 | 143 |
| Astre | 32 | 13 | 113 | 31 | 11,4 | 146 |

Au navigateur, les parcours de l'aventure (`qa:aventure`, `qa:maison`, `qa:voies`, `qa:vivante`, `qa:championnat`)
couvrent l'interface des mêmes étapes (§7).

## 5. Équilibrage mesuré

Tableau complet : `artifacts/qa/m10f/equilibre/ecarts-annexe.md`. Mesure reproductible : identique, au chiffre près, à
celle de l'amendement 1 (même moteur). Contre l'annexe validée (mesurée sous V3.2) :
- **voie directe** : plus dure à partir de la deuxième famille (cadets et bras droits −6 à −10 points ; chefs 45 à 48 % ;
  Championnat 48 à 49 %) ; le premier chef plus facile (+6) ; aucun duel principal sous 45 % ;
- **voie entraînée** : égale ou plus favorable (chefs 64 à 90 %, Championnat 87 à 88 %) ;
- **Duel standard** : inchangé depuis l'amendement 1.

Ces écarts sont ceux que le responsable a gardés (fiches V3.3, E3 et E1) ; ils reviennent dans la fiche de la RC (E1) pour
confirmation. **Aucune valeur n'a été changée.**

## 6. Contrôles

À compléter.

## 7. Campagne de validation

À compléter.

## 8. Connu / à faire

À compléter.
