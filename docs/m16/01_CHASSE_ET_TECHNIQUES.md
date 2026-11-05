# M16 — Chasse aux cartes en ville et Techniques gagnées (contrat, PROPOSÉ)

> **Statut : APPROUVÉ le 2026-11-05 (fiche remplie, consignée à la passe 212 ; `docs/FICHE_ARBITRAGES_M16.md`).** Onze choix sur la
> recommandation ; **un écart (T3) : la Technique d'une famille se gagne à la victoire sur son chef, avec la Signature** (§3.3
> amendé). Développement avant le test complet du responsable (S1). Consigne : « le mode promenade doit permettre
> d'apporter ce côté captivant ».
> Demande du responsable (2026-11-05) : « remplir notre ville de points de collecte [qui] permettent d'avoir des cartes
> variantes, avant d'accentuer la chasse aux cartes et donner de l'intérêt à la promenade en ville ; par ailleurs, il faut
> aussi que les compétences se gagnent : au début du jeu, le joueur choisit et possède une seule compétence, et à travers
> le jeu il gagnera de nouvelles compétences (peut-être lorsqu'il affrontera des chefs ou de grands joueurs) ».

## 1. Ce qui existe aujourd'hui

- **Variantes (avenant 09, 48 cartes : trois par identité, quatre Rangs, quatre familles).** Elles ne se gagnent qu'en
  duel : Épreuve du quartier (Rang I), Joute de la maison (Rang II), cadet (Rang III), bras droit (Rang IV) ; la première
  victoire ouvre l'écran du choix, chaque nouvelle victoire au même endroit donne la suivante ; le titre du Championnat
  donne toutes celles qui manquent (`fin.ts`, `competitions.ts`, `registre.ts`).
- **Techniques (six : Sondage, Recentrage, Lecture, Ancrage, Rupture, Dissipation).** Sondage et Recentrage sont données
  au départ (`TECHNIQUES_RUE`, `aventure.ts:92`) ; la Technique d'une famille l'est avec ses cartes de base, à
  l'affiliation (`P7`) ou à l'engagement (`aventure.ts:252`, `:276`) : Cendre Lecture, Ronce Rupture, Voile Dissipation,
  Astre Ancrage. Le deck de l'aventure exige **exactement deux** Techniques (`deck.ts:55`, règle R-AV, ARB-M10-04).
  Le moteur du duel en accepte **deux au plus** (`engine.ts:97`) : une seule est déjà légale en duel.
- **La ville** offre des duels de rue (guetteurs, `vue.ts`), des rumeurs (`directeur.ts`, `repliques.ts`), des membres
  des familles ; aucune carte ne s'y trouve.

## 2. Points de collecte (Promenade libre)

1. **Récompense :** une variante **qui manque** au joueur, **d'une famille rejointe ou engagée** (jamais une carte d'une
   famille qu'il n'a pas encore approchée : le deck R-AV et la progression restent cohérents). Tirage à graine fixe par
   point (la même aventure retrouve la même carte).
2. **Nombre et lieux :** un point par quartier et par chapitre, une dizaine en tout ; posés sur des cases libres des rangs
   (jamais sur un chemin lumineux, jamais derrière un décor), dans le quartier de la famille quand il y en a une.
3. **Garde :** un mélange : certains libres, certains gardés par un joueur de rue (le duel d'abord), certains annoncés par
   une rumeur. Le duel reste la voie principale de la chasse.
4. **Repère :** une carte qui scintille au sol, dessinée par code (aucune image générée), la bulle d'interaction habituelle
   (E, A à la manette) ; un point ramassé s'éteint et le reste.
5. **Interaction avec les duels :** l'écran du choix d'une victoire ne propose que les variantes qui manquent encore ;
   si l'identité est complète, la victoire ne donne plus de variante (comme aujourd'hui une revanche).
6. **Récit guidé :** pas de marche, donc pas de points : c'est le bonus de la Promenade libre. Rien n'est perdu (le
   Championnat donne toutes les variantes manquantes).
7. **Collection :** chaque variante dit aussi « Trouvée en ville » comme origine possible ; le Journal compte les points
   trouvés par quartier.

## 3. Techniques gagnées

1. **Départ :** une seule Technique, **au choix entre Sondage et Recentrage**, à l'écran « Nouvelle aventure ».
2. **Seconde Technique de rue :** l'autre, à la **première victoire sur un cadet** (deux Techniques équipables dès le
   chapitre I).
3. **Technique d'une famille :** à la **victoire sur son chef, avec sa Signature** (décision T3 du responsable).
   L'affiliation et l'engagement ne donnent plus que les cartes de base.
4. **Deck :** **une ou deux** Techniques (amendement de R-AV et d'ARB-M10-04 ; le duel et le Duel standard ne changent pas).
5. **Adversaires :** les adversaires des premiers paliers (prologue, chapitre I, populace) n'équipent qu'une Technique,
   pour que le premier duel reste à armes égales ; à mesurer (IA contre IA, comme `tools/m12-variantes-mesure.ts`).
6. **Scène :** une Technique gagnée a son carton, comme une Signature (`sceneChef`), et le conseil du duel qui l'explique
   s'affiche la première fois qu'elle sert.

## 4. Ce qui ne change pas

Règles du duel, catalogue des cartes, Duel standard, annexe de calibrage (sauf le point 3.5, mesuré), images et
approbations. **Sauvegardes :** les aventures en cours gardent leurs cartes et leurs Techniques (aucune perte) ; le
nouveau calendrier vaut pour les nouvelles aventures, ou, au choix de la fiche, aussi pour les Techniques encore à venir.

## 5. Vérification prévue

Tests unitaires (tirage des points, garde, calendrier des Techniques, deck à une Technique, migration) ; un parcours
navigateur qui ramasse des points à pied et gagne les Techniques du prologue au premier chef ; mesure IA contre IA des
premiers paliers ; `qa:aventure`, `m14-recit-guide`, `m10d-voies` ; captures regardées en 1280 et 1920.

## 6. Livraison (passe 212)

Livré tel que ci-dessus, avec l'écart T3. Choix d'exécution : dix points (deux par chapitre, quatre libres, trois en
recoin annoncés par rumeur, trois gardés) ; la Technique de départ se choisit sur la page du récit de la nouvelle aventure
(Sondage présélectionnée) ; armes égales = l'adversaire n'équipe pas plus de Techniques que le joueur n'en a apprises.
Mesure (`artifacts/qa/m16/techniques-mesure.json`) : premiers duels dans ±5 points du deux contre deux, sauf le duel de rue
du chapitre I avec Sondage (+11,5 points pour le joueur). Détail : `JOURNAL.md`, passe 212.
