# ADR 010 — Chorégraphies du Clash dérivées du résultat résolu (ClashMotionDirector + scène DOM)
Date : 2026-10-16
Statut : proposé (mandat M03 §3–4)

**Contexte.** M03 exige que les cartes s’affrontent à l’écran (Assaut contre Assaut, Assaut contre Garde
dans ses trois issues, Garde contre Garde) sans jamais recalculer ni modifier les règles, avec les
rythmes normal / rapide / instantané / mouvement réduit, et un nettoyage sans fantôme.

**Décision.**
- **Module pur** `src/presentation/clashMotion.ts` : `buildClashScript(événements visibles, spectateur,
  Primaires révélées)` lit le **rapport public du Clash** (`stances`, `outcome`, `winner`, `guardWin`,
  `zeroDamageRankWin`, `damage`, `powers`, `publicScores`, `cancelled`) et classe l’issue en six
  chorégraphies : `aa-win`, `aa-tie`, `guard-holds`, `guard-breaks`, `guard-absorbs`, `gg-neutral`.
  Le vainqueur n’est **jamais** déduit autrement que par le moteur ; seuls les événements publics sont lus.
- **Associé au séquenceur M02** (`beats.ts`) : temps « Rang » → présentation face à face ; « Issue » →
  impact ; « Blessures » → chiffres ; « Destinations / Repoussement / Prolongation / Fin » → nettoyage.
  La chronologie métier n’est pas modifiée ; les blessures simultanées restent simultanées.
- **Scène DOM** `src/presentation/clashStage.ts`, hôte `#stage` **hors** de `#app` (les re-rendus du
  plateau n’interrompent pas l’animation) : copies de représentation des Primaires (cartes clonées),
  VS, badges de Rang, bandeaux ASSAUT/GARDE, bouclier, onde de choc, verdict. Web Animations API
  (transformations / opacité / filtres) : aucune texture régénérée par image.
  - AA : inclinaison, charge, collision centrale (flash + onde), le vainqueur tient le centre puis
    reste mis en valeur, le vaincu recule, rétrécit, s’assombrit. Égalité : impacts symétriques et
    simultanés, aucun faux vainqueur.
  - AG : bouclier sur la Garde ; Garde victorieuse = la Garde grandit et repousse l’Assaut ; Garde qui
    cède = fissure puis éclatement, la Garde est repoussée ; **victoire au Rang sans blessure** =
    l’Assaut bute sur le bouclier qui absorbe (ondulation, « ABSORBE n »), la Garde tremble mais
    **ne grandit pas et ne repousse rien** ; libellé « VICTOIRE AU RANG · 0 BLESSURE · ABSORPTION ».
  - GG : deux boucliers, tension contenue, retrait neutre.
  - **Nettoyage** : les DEUX Primaires volent vers la défausse de leur camp (compteur « Déf. »), même la
    gagnante ; sur le plateau, la case Primaire affiche « Défaussée » ; le compteur de défausse est mis en
    scène avec ce départ.
- **Rythmes** : durées × facteur (normal 1, rapide 0,45) ; instantané = séquence entière appliquée d’un
  coup (aucune scène visible) ; **mouvement réduit = aucun déplacement**, mêmes informations par poses
  statiques et fondus ; gel (captures) = pose finale de l’étape. « Passer » et « Tour suivant » ne sont
  jamais bloqués (scène sans pointeur) et `stop()` retire immédiatement toute copie.
- **Plateau pendant la séquence** : instantané d’avant résolution (Secondaires engagées visibles) jusqu’au
  temps des destinations ; ANNULÉ affiché seulement après le temps des Interférences.

**Conséquences.** Une carte « héroïque » n’est qu’une pose transitoire. Les poses figées et pellicules
(`tools/clash-shots.mjs`, crochets QA `pauseSequence` / `stageSeek`) rendent chaque chorégraphie
vérifiable sur capture réelle. Les FX de l’arène (lumière, anneaux) restent en complément.

**Tests.** `test/clashMotion.test.ts` : six issues produites par de vraies commandes moteur, Signature ∞,
double K.-O., Interférences, non-fuite (événement privé ignoré), propriété sur 40 duels IA/IA (chaque
Clash classé conformément au rapport). `qa:browser` : scènes vues, aucune scène fantôme après la séquence.

**Question d’approbation.** Valider les six chorégraphies, leur durée et l’emplacement du face-à-face
(rival à gauche, joueur à droite, comme la preview).

## Revue opérateur M03 — Mandat M03.2 (2026-10-16)

**Statut de réception : six chorégraphies approuvées comme base de production.** L'impact simultané AA, les trois issues AG, la Garde victorieuse, l'absorption sans blessure et GG doivent conserver exactement leur sémantique. Le peaufinage du tempo/contraste, de l'organisation des légendes et du rendu doit respecter les événements et la défausse des deux Primaires. Aucun recalcul de gameplay.
