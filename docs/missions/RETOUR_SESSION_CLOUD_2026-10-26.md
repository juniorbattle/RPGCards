# Retour de la session cloud du 2026-10-26 (M11, un monde qui réagit) à la session principale

**Brief :** `docs/missions/BRIEF_SESSION_CLOUD_2026-10-26_M11.md` (validé par le responsable). **Départ :** `bd93beb`.
**Mode :** autonome ; toutes les décisions prises seules sont provisoires et listées dans la fiche
`docs/FICHE_ARBITRAGES_M11.md` (à publier en fiche interactive). **Journal :** passes 142 à 148.

## 1. Où en est le projet

| Phase | Étape | État | Preuves |
|---|---|---|---|
| 1 | Cadrage : six contrats proposés, feuille de route, ADR 037 à 042 | **fait** | `docs/m11/` |
| 2 | M11-A : rencontres « en vue » et Kaï en événements fixes ; sauvegarde `aventure/2` | **fait** | `test/m11-vue.test.ts`, `test/m11-rival.test.ts`, `npm run qa:vue` (25/25, puis 29/29 avec les contrôles du son) |
| 3 | M11-B : tempéraments des PNJ par chapitre (IA et répliques) | **fait** | `test/m11-temperaments.test.ts`, `artifacts/qa/m11/temperaments.md` |
| 4 | M11-C : système de répliques, réécriture, parcours complet avec le rival | **fait** | `test/m11-repliques.test.ts`, `test/m10f.test.ts` (K1 à K6) |
| 5 | M11-D : IA de niveau 2 en nouveaux profils | **fait** | `test/m11-ia.test.ts`, `artifacts/qa/m11/ia.md` |
| 6 | M11-E : son synthétisé par code | **fait** (sans écoute) | `test/m11-son.test.ts`, contrôles du son dans `qa:vue` |
| 7 | Fiche, retour, journal, encadrés | **fait** | ce document |

Garanties tenues : règles du duel inchangées (aucun fichier du moteur touché hors de l'IA, dont les profils historiques
suivent l'ancien chemin) ; **jeu par défaut au repos identique au pixel près** au build de `bd93beb`
(`tools/l5-identique.mjs`, 12 comparaisons à 1280 et 1920, `artifacts/qa/m11/identique.json`) ; annexe de calibrage
inchangée (paliers remesurés : `artifacts/qa/m11/paliers.json`, voir §1 bis) ; aucune image générée, aucun drapeau
d'approbation changé ; son coupé en QA ; sauvegardes : `aventure/1` migrée sans perte (original gardé une fois sous
`lqv.aventure.v1`), profils et parties du jeu standard jamais lus ni écrits par l'aventure.

### 1 bis. Mesures

(complété en fin de run, voir la passe 148 du journal)

## 2. À faire en local (impossible dans le cloud)

- **Écouter le son** : Options du jeu standard (Son, Volume), menu « Son » de l'aventure ; un duel (pose, révélation,
  Clash, Garde, dégâts, Signature annoncée, victoire, défaite), la ville (pas, bulle « ! », Kaï qui surgit, changement
  d'îlot, ambiance de chaque îlot), le bourdon du duel ; juger timbres, niveaux, fatigue, et le calage des sons sur la
  chorégraphie du Clash (fiche S2).
- **La marche des guetteurs et de Kaï à pied** (sans mouvement réduit, à la fréquence de l'écran) : en rendu logiciel,
  `qa:vue` place l'approche directement (`reducedMotion=1`).
- **Jalon GPU** sur la Radeon 780M et la RTX 4060 : `qa:vue` aux deux tailles, puis la campagne habituelle
  (`tools/m10f-campagne.sh`) ; mesures de fluidité de la ville avec la vérification de la vue à chaque image (coût
  attendu négligeable : quelques segments échantillonnés par image).
- Lire la fiche et y répondre.

## 3. Ce que la session a choisi seule (à confirmer ou défaire)

Voir la fiche. En bref : valeurs de la vue (4,5 m, 32°, 0,95 m, repos) ; liste des guetteurs ; duel forcé sans « Pas
maintenant » ; rencontres forcées désactivées en QA sans `?vue=1` ; six moments du rival, événement manqué non rattrapé,
défaite qui accomplit ; ombre de Kaï retirée ; tempéraments au jeu pour les seuls PNJ facultatifs (chapitre I = annexe),
figures et Kaï au profil de l'annexe ; « rusé » et « vicieux » réglés sur une base prudente de niveau 2 après mesure ;
schéma `aventure/2` ; son activé par défaut à 70 % ; sons du Clash calés sur les temps de sa chorégraphie ; Observatoire unique
proposé, aucun texte changé.

## 4. Retour sur le brief et l'environnement cloud

- Le brief était complet et ordonné ; la consigne « contrat d'abord » de la fiche de la ville et la phase 4
  (« réécriture des dialogues ») se croisaient : la session a réécrit les répliques (données) et laissé la structure
  (renommages, figures, Observatoires) en proposition.
- Les phases 3 et 5 se tiennent : mesurer les tempéraments exige l'IA de niveau 2 ; elles ont été menées ensemble.
- Rendu logiciel : `qa:vue` passe en ≈ 3 minutes ; les mesures IA contre IA (moteur seul) prennent 10 à 30 minutes
  chacune ; quatre processus lourds en même temps font dépasser des délais de tests (un test V3.3 à 5 s, repassé seul).
- Aucun accès réseau nécessaire ; aucun blocage d'outil.

## 5. Suite proposée

1. Décisions de la fiche ; écoute du son et jalon GPU en local.
2. Un lot de textes de la structure narrative (D2 les Observatoires, D3 la trame), avec sa fiche.
3. Selon la fiche : le niveau 2 en option du Duel standard (I2), les tempéraments au jeu pour les revanches des figures (P4).
