# Retour de la session cloud du 2026-10-20 (M10) à la session principale

De : session cloud autonome M10, brief `docs/missions/BRIEF_SESSION_CLOUD_2026-10-20_M10.md` (validé par le responsable),
départ `255820c`, tout sur `main`, sans force-push ni rebase, sans branche. Une session cloud ne peut pas écrire à une
session locale : ce retour passe par git. **À lire avant de reprendre le projet en local.** Aucune décision du
responsable n'est arrivée par git pendant le run (en-têtes du brief, de `CLAUDE.md` et d'`AGENTS.md` relus à chaque
`git pull`).

## 1. Où en est le projet

| Sujet | État | À lire |
|---|---|---|
| **Phase 1 — contrats M10** | **livrée** : les huit livrables du §VII (prologue et recrutement, hiérarchie des familles, progression et récompenses, rival, ville et rencontres, quêtes et persistance, avenant M10-A, feuille de route M10-A à M10-F) ; tout est **PROPOSÉ** sauf ADR 029 à 031 | `docs/m10/README.md` |
| **Fiche d'arbitrages M10** | 11 entrées indispensables (ARB-M10-01 à 11), dont **ARB-M10-02, bloquante** : faire entrer les neutres en duel touche deux lignes de `clash.ts` | `docs/FICHE_ARBITRAGES_M10.md` |
| **Preuve hors dépôt du patch M10-A** | patch complet des neutres appliqué dans un worktree temporaire : **305 tests du dépôt inchangés et verts**, 5 tests neutres ; **mesures d'équilibrage** IA contre IA (inaugural 51,7 %, cadet 57,3 %, bras droit 46,3 %, chef 36,7 % à 90 PV) ; patch prêt à appliquer **après ratification** | `docs/m10/MESURES_M10A.md`, `docs/m10/patch-m10a-neutres.diff` |
| **Phase 2 — prototype `?aventure=1`** (M10-B, et M10-C, D, E en avance) | **livré, provisoire** : Nouvelle aventure → 16 cartes grises → le Quai → Kaï → duel public (deck de prêt) → foule → quatre émissaires → choix libre et confirmation → quatre Basics → défis de lieutenants (variantes), du chef (Signature), revanches sans duplication → Salle des Bannières (défi officiel d'une autre famille) ; **Épreuves et Joutes** (variantes I et II : les seize variantes atteignables) ; **squelette du Championnat** (Quatre Bannières, Miroir, Finale) ; rencontres facultatives (rue, Kaï) ; deck R-AV et registre ; journal ; sauvegarde à part et reprise exacte | `docs/AVENTURE_PROVISOIRE.md`, ADR 032 (proposé) |
| Vérifications (rendu logiciel) | `npm test` **310/310** (281 d'origine inchangés) ; `qa:championnat` **13/13** (Joute, poule à Signatures distinctes, Miroir, Finale, titre) ; `qa:aventure` **40/40** en 1280 × 720 au build final `011bf38`, et vert en 1920 × 1080 et décor par code au build `aa79398` (0 erreur console) | `artifacts/qa/m10/`, `screenshots/qa/m10/` |
| Mode Duel standard, jeu par défaut, démo `?demo=1` | **inchangés** : jeu par défaut **identique au pixel près** au départ `255820c` (`l5-identique` aux builds `aa79398` et final `0d858a5`, 0 pixel différent, témoins détectés) ; `qa:demo` vert en 1280 et 1920 (30/30 au build final) ; campagne complète **verte** : §1 bis | `artifacts/qa/m10/` |
| M09 | **en pause**, rien de refait ; îlots, dioramas et feuilles réutilisés tels quels ; aucune approbation changée ; aucune image générée | `docs/missions/M09_VILLE_EXPLORATION_HD2D.md` |
| Journal | passes 71 (contrats), 72 (prototype), 73 (preuve M10-A, passation) | `JOURNAL.md` |

### 1 bis. Campagne de QA complète (jalon, lancée seule en fin de run)

Build `011bf38` (les commits suivants ne touchent que la documentation et les preuves), rendu logiciel SwiftShader,
`LQV_QA_NAV_TIMEOUT=90000 LQV_QA_TIMEOUT=60000`, de 09:09 à 10:06 UTC, **verte au premier passage** :
`qa:browser` **5/5** duels complets (0 écart de vue, 0 fuite, 0 clic perdu, 0 erreur console) ; `qa:product` **9/9**
parcours (dont la série complète du Tournoi, la reprise en plein duel, la migration réelle d'une sauvegarde v1, la
reprise altérée refusée) ; `qa:rc` **9/9** (sans WebGL, longévité 12 duels, moteur indépendant des animations, stockage
refusé, contraste, clavier seul, coût processeur) ; `qa:techniques` **8/8**. Rapports et journal :
`artifacts/qa/m10/campagne/` (les rapports de la RC 0.8 sous `artifacts/qa/` sont laissés intacts).

## 2. À faire en local (impossible dans le cloud : pas de GPU, pas de Windows, pas de clé)

1. `npm ci && npm run build && npm run preview`, puis jouer **`/?aventure=1`** quinze minutes (parcours de
   `docs/AVENTURE_PROVISOIRE.md`) : lisibilité des dialogues et de l'écran de confirmation, place des personnages dans
   le Quai, le Parvis et les Ruelles, rythme du prologue. Le rendu logiciel du cloud ne dit rien de la fluidité.
2. Sur GPU réel : `LQV_GPU=1 CHROMIUM_PATH=<Chrome> npm run qa:aventure` (1280 et `LQV_VP=1920x1080`) ; regarder les
   captures `screenshots/qa/m10/`.
3. Décor par code (comme le jeu hors QA) : `LQV_AV_QS='&decors=code&sprites=code' npm run qa:aventure`.
4. Présenter la **fiche M10** au responsable (fiche interactive, comme pour M09) ; ARB-M10-02 d'abord.
5. Si ARB-M10-02 est accepté : `git apply docs/m10/patch-m10a-neutres.diff`, puis les 20 erreurs de typage d'interface
   (inventaire `MESURES_M10A.md` §1 : carte neutre dessinée par code, siège sans Signature), puis remplacer le deck de
   prêt du prototype (`siegePret`) par le deck Aventure réel (lot M10-A, `FEUILLE_DE_ROUTE_M10.md`).

## 3. Ce que la session cloud a choisi seule (à confirmer ou défaire)

Tous consignés au journal et dans la fiche (« Décisions prises seules par la session ») :
- **contenu narratif** : noms de travail des chefs (Bran, Mère Aubépine, Ilse, Halvard) et des cadets (Tessa, Gaspard,
  Lior, Mira) ; maisons (Cendre au Quai, Ronce au Fanal, Voile dans les Ruelles, Astre au Parvis) ; les rivaux V2 en bras
  droits ; Kaï rival récurrent qui rejoint la Cendre ; les quatre émissaires invitent ; premier émissaire par un fait
  public du duel ; deux lieutenants par famille (variantes III et IV), variantes I et II par des compétitions ;
- **régime du prototype** : deck de prêt identique pour les deux duellistes au prologue (16 Basics + Brasier Originel),
  deck de prêt complété par des Basics ensuite ; PV 60/60 au prologue ; chefs à 90 PV (mesuré) ;
- **architecture** : enveloppe propre à l'aventure plutôt que l'enveloppe standard (ADR 032) ; sauvegarde
  `lqv.aventure` à part ; deux ajouts sans effet hors aventure dans le code de M09 : l'option `ilotDefOf` de
  `createTown` et l'apparence `player-gris` des marcheurs (tenue grise du duelliste sans famille) ;
- **QA** : un crochet `qaTerminer(issue)` (seulement avec `?qa=1`) termine un duel avec une issue imposée, pour
  parcourir les récompenses des lieutenants et du chef sans jouer chaque duel ; le duel lui-même est inchangé.

## 4. Retour sur le brief et l'environnement cloud (pour le prochain brief)

- **Le découpage contrats puis prototype a bien marché** : les contrats ont fixé les identifiants (scènes, clés du
  registre, figures) que le code a repris tels quels ; aucun retour en arrière.
- **La limite « ne pas toucher au Clash » était la bonne** : la preuve hors dépôt (worktree détaché, rien poussé dans le
  moteur) a permis de chiffrer son coût réel et de proposer des PV mesurés au lieu de chiffres inventés. À refaire pour
  toute décision de règle : un patch prêt, des tests, des mesures, et la décision au responsable.
- **Rendu logiciel** : `l5-identique` ≈ 6 min, `qa:demo` ≈ 4 min, `qa:aventure` ≈ 4 à 8 min par définition d'écran
  (40 contrôles). Le code du mode standard n'a presque pas changé (une branche dans `main.ts`, un paramètre d'URL) ;
  la campagne complète a tout de même été lancée en fin de run, seule, pour preuve (résultat en §1).
- **Le brief pourrait préciser** si « chef » (ADR 029) veut dire « chef vaincu » ou « devenir chef » (ARB-M10-01), et
  si les variantes peuvent venir de compétitions malgré la phrase des tests d'ADR 031 (ARB-M10-06).

## 5. Images et portraits dont M10 aura besoin (liste, **non demandée**)

Les personnages du duel restent en « vectoriel V2 » tracé par code (ADR 021) et les portraits en dérivent : **aucune
image** pour eux. Les images ne concernent que la ville (feuilles de marcheurs en pixel art et décors, ADR 027 et 028).

| Besoin | Où | Nature | Estimation |
|---|---|---|---:|
| Quatre chefs (Bran, Mère Aubépine, Ilse, Halvard) | ville (marcheurs) ; duel (identités V2 par code) | feuilles pixel art 64 × 96, recolorables | 4 × 2 = **8** images |
| Bras droits (Kaï, Maëlle, Sélène, Orin) | ville | feuilles pixel art (prévues aussi pour M09) | 4 × 2 = **8** |
| Cadets (Tessa, Gaspard, Lior, Mira) | ville | gabarits PNJ + accent familial **par code** (extension de l'ADR 023), ou feuilles | **0** par code, ou 4 × 2 = 8 |
| Foule du prologue et du Championnat | ville | gabarits PNJ en pixel art recolorés par graine (une feuille par gabarit) | 4 à **8** |
| Tenant du titre (Championnat) | ville ; duel (V2 par code) | feuille pixel art | **2** |
| La Grande Cour (cérémonies) | ville | diorama de plans peints (lot V5 de M09, à son budget) | (M09) |
| Cartes neutres | duel, collection | **code** (carte blanche/grise dessinée par code, AGENTS) | **0** |

**Total estimé pour M10 hors M09 : ≈ 18 à 34 images** (dans le budget et le calendrier que le responsable fixera ;
générées en local, approuvées par lui seulement).

## 6. Suite proposée (après les décisions du responsable)

1. Fiche M10 interactive → décisions (ARB-M10-02 d'abord).
2. **M10-A** : appliquer le patch, carte neutre par code, deck Aventure réel dans le prototype ; tests de la porte.
3. **M10-C** à compléter : decks d'auteur des lieutenants au format miroir réel, identités V2 des chefs, Épreuves et
   Joutes (variantes I et II) si l'option a d'ARB-M10-06 est retenue ; campagne de QA (jalon).
4. Reprise de M09 (feuille du joueur J1, le Parvis et les Ruelles en rangs, la Grande Cour) : le mode Aventure s'y
   branchera par `ilotDefOf` et le directeur, sans changement de la ville.
