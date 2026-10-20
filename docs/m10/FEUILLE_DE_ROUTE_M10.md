# M10 — Feuille de route d'implémentation M10-A à M10-F

**Date :** 2026-10-20 (session cloud autonome). **Statut : PROPOSÉ.** **Couvre :** §VII.8 de la mission M10. Reprend les
lots du cadrage (`docs/missions/M10_ORIGINES_ASCENSION_QUATRE_VOIES.md`, « Lots M10 ») et les précise : contenu, tests,
conditions de validation, dépendances. Chaque lot se termine par typecheck, tests, build, jeu par défaut identique au
pixel près (`tools/l5-identique.mjs`), journal ; **QA complète aux jalons** seulement (AGENTS : M10-C, M10-D, M10-F).

| Lot | Dépend de | Change le moteur ? | Jalon QA |
|---|---|---|---|
| M10-A | ratification de l'avenant | **oui** (neutres, deck explicite, Signature optionnelle) derrière le mode Aventure | non (tests ciblés + hashes) |
| M10-B | rien (logique hors moteur) ; neutres en duel si M10-A | non | non |
| M10-C | M10-B ; M10-A pour les duels à deck Aventure | non | **oui** |
| M10-D | M10-C | non | **oui** |
| M10-E | M10-D ; M09 repris pour la Grande Cour (facultatif) | non | non |
| M10-F | tout | non | **oui** (RC Aventure) |

---

## M10-A — Règles du mode Aventure (avenant ratifié → moteur)

**Contenu :** catalogue neutre séparé (`src/game/catalog/neutres.ts`) ; `CardDef.family: Family | null` ; affinité
gardée (`family !== null`) dans `clash.ts` ; `GameConfig` à deck explicite et Signature optionnelle ; construction et
contrôle R-AV dans `engine.ts` ; IA sans hypothèse de Signature ; carte neutre dessinée par code (blanche/grise, Rang
lisible, sans emblème) ; validateur de deck Aventure (`src/aventure/deck.ts`) ; format `lqv-replay/2`.

**Tests :**
- neutres : 4 instances par Rang, 16 au total, identifiants distincts ; aucune famille, aucun effet ;
- affinité : neutre + neutre, neutre + Basic, Basic + neutre ⇒ **aucun +1** (Rang et Dégâts) ; Basic + Basic de même
  famille ⇒ +1 (inchangé) ;
- Interférence d'une neutre selon son Rang ; repoussement d'une neutre ;
- deck de 16 sans Signature : duel complet jusqu'au K.-O. ou à la prolongation (1 000 duels IA contre IA sans exception,
  invariants du moteur) ;
- secrets : projection publique et privée d'un duel neutre ; camouflage d'une neutre par Dissimulation ; IA non
  omnisciente (mêmes tests qu'ADR 011 sur un deck neutre) ;
- **non-régression** : les 281 tests actuels passent **sans modification** ; hashes des replays standard identiques ;
  `l5-identique` 0 écart.

**Validation :** avenant ratifié (fiche ARB-M10-01 à 05) ; tous les tests ci-dessus ; mesure `npm run sim` sur le duel
inaugural (taux de victoire, durée) consignée au journal.

## M10-B — Prologue jouable (`?aventure=1`)

**Contenu :** module pur `src/aventure/` (machine d'états des familles et des scènes, registre des gains, collection et
deck Aventure, directeur des rencontres, sauvegarde `aventure/1`) ; écran « Nouvelle aventure » derrière `?aventure=1` ;
la ville (le Quai, le Parvis, les Ruelles) avec Kaï, la foule, les quatre émissaires ; duel public ; scène du choix
(Accepter, Différer, Chercher) ; confirmation ; remise des quatre Basics ; premier défi de lieutenant ouvert. Avant
M10-A : duel du prologue en **deck de prêt** sous bandeau « provisoire ».

**Tests :**
- machine d'états : les **quatre** affiliations atteignables (par Accepter auprès du premier émissaire, et par visite
  après Différer / Chercher) ; refus de tout ⇒ ville ouverte, invitations valables ; défaite au duel public ⇒ mêmes
  invitations ;
- Basics **seulement après confirmation** (une offre affichée, un retour arrière, un « Différer » n'en donnent pas) ;
- états `remarqué`, `invité`, `affilié` distincts et monotones ; « visité » et « rencontré » notés à part ;
- idempotence : confirmer deux fois, recharger entre l'écran de confirmation et la remise, reprendre après fermeture ;
- sauvegarde : aller-retour JSON exact ; sauvegarde corrompue mise à l'écart ; version future refusée ; **la sauvegarde
  standard `lqv.save` n'est jamais lue ni écrite** ;
- navigateur : parcours complet (nouvelle aventure → duel → foule → choix → Basics → défi du cadet ouvert) en
  1280 × 720 et 1920 × 1080, 0 erreur de console ; `qa:demo` toujours vert ; jeu par défaut identique au pixel près.

**Validation :** le responsable joue le prologue (GPU réel) ; fiche d'arbitrages à jour.

## M10-C — La maison (famille d'accueil)

**Contenu :** cadet, bras droit, chef de chaque famille (données : decks d'auteur au format miroir, Techniques, profils,
PV, lieux de duel) ; défis structurants et revanches ; variantes III et IV ; Signature ; changement d'affiliation avant
le premier lieutenant (P-N6, si ratifié) ; éditeur de deck Aventure (R-AV) ; écran Collection Aventure ; journal des
quêtes.

**Tests :** variantes **seulement** aux victoires contre les lieutenants et pour des identités possédées ; Signature
**seulement** à la victoire contre le chef ; revanche gagnée ⇒ registre inchangé ; défaite ⇒ défi toujours ouvert ;
une seule Signature équipée ; deck toujours légal après chaque gain ; reprise d'un duel de lieutenant fermé en cours ;
même séquence vérifiée pour les **quatre** familles prises comme famille d'accueil (test paramétré).

**Validation :** parcours complet d'une famille au navigateur ; **campagne de QA complète** (jalon) ; planche des
écrans de récompense.

## M10-D — Les trois autres voies

**Contenu :** Salle des Bannières (engagement officiel avec confirmation) ; Basics à l'engagement ; cadets, bras droits,
chefs des trois autres familles (déjà des données de M10-C) ; transition du deck jusqu'au format standard (A-6) ;
Épreuves de quartier et Joutes de maison (si l'option a d'A-8 est ratifiée).

**Tests :** entrer dans un quartier ou battre un membre n'engage pas le défi ; engagement ⇒ Basics une seule fois,
jamais si déjà reçues (changement d'affiliation) ; ordre libre des trois familles (toutes les permutations) ; après les
quatre `basics:*` : `validateDeck` du standard accepte le deck ; jusqu'à quatre Signatures possédées, une équipée ;
collection reconstruite depuis le registre identique à la collection stockée.

**Validation :** parcours complet jusqu'aux quatre chefs ; **campagne de QA complète** (jalon).

## M10-E — Ville vivante, rival, Championnat

**Contenu :** directeur des rencontres branché sur les îlots (et les rangs à la reprise de M09) ; duels de rue ; défis
de Kaï (un par chapitre) ; Championnat (Quatre Bannières, Miroir, Finale en deux manches gagnantes avec changement de
Signature entre les manches) ; scènes de la Grande Cour si elle existe (sinon, Parvis).

**Tests :** directeur déterministe (graine, battement) et sérialisable ; jamais plus de deux facultatives par îlot ;
rival au plus une fois par chapitre ; aucun tirage hors point de décision ; refus sans conséquence ; Championnat :
contraintes vérifiées avant chaque duel (Signature différente à chaque duel de poule), pas de statistique modifiée
(PV et Puissances lus de la fiche du personnage) ; titre à la victoire finale.

**Validation :** le responsable joue une heure de ville (GPU réel) : rencontres jugées « non intrusives ».

## M10-F — QA d'ensemble, équilibrage, migration, RC Aventure

**Contenu :** équilibrage mesuré (`npm run sim` par palier ; objectifs d'A-10) ; textes relus ; aide du mode Aventure ;
release candidate (`0.10.0-rc.1` proposé) ; rapport `docs/RAPPORT_RC_AVENTURE.md`.

**Tests :** parcours complet prologue → titre (automatisé avec IA du joueur pilotée, graine fixe) ; reprise à chaque
scène ; performances de la ville et du duel sur GPU réel (local) ; secrets (ADR 011) ; mode standard intact (QA
complète, comparaisons au pixel près) ; profils RC 0.8 chargés.

**Validation :** réception par le responsable.

---

## Où en est-on (2026-10-20, fin de la session cloud)

Voir `docs/missions/RETOUR_SESSION_CLOUD_2026-10-20.md` : phase 1 (ces documents) livrée ; phase 2 (M10-B en prototype
derrière `?aventure=1`) livrée avec le deck de prêt (M10-A non ratifié) ; avancées de M10-C décrites dans le retour.
