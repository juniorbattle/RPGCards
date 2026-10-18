# ADR 007 — Rival procédural 2.5D et expressions fondées sur les seuls faits publics
Date : 2026-10-16
Statut : proposé (fondation psychologique ; **aucun tell, bluff ni Sang-froid**). **Amendé par l’ADR 017** (2026-10-17) : plus de mains, le rival est en buste derrière son éventail de cartes.

**Contexte.** M02 §3 : un adversaire visible et expressif, généré par code, qui prépare la dimension psychologique sans créer de mécanique ni fuite d’information.

**Options.** (A) personnage 3D en primitives — peu expressif ; (B) sprites 2D peints par Canvas assemblés en couches dans la scène 3D (esthétique HD-2D) — expressif, léger, contrôlable. Retenu : **B**.

**Décision.**
- `src/scene/rivalTextures.ts` : tête (mâchoire paramétrique, coiffures, marques), buste (tenue, emblème de famille), mains, sclère, iris, paupière, sourcils, 8 bouches — Canvas générés **une fois** par (personnalité, artSeed). Aucune régénération par image : l’animation n’utilise que des transformations et un échange de texture de bouche.
- `src/scene/rival.ts` : paramètres lissés (sourcils, paupières, regard + micro-saccades, rougeur, inclinaison, respiration), clignements seedés, gestes (acquiescer, recul, rire, secouer la tête, poser une carte, s’affaisser…), éventail de cartes = **taille publique** de la main du rival.
- `src/presentation/expression.ts` (`ExpressionDirector`, pur) : **ignore tout événement non public** ; réactions par (personnalité, événement public, seed) ; expression de repos selon phase publique, attente publique, PV publics. Les décisions et la mémoire de l’IA ne lui sont jamais transmises.
- `src/presentation/personalities.ts` : 3 personnalités PROVISOIRES (Kaï la Braise / offensif, Maëlle des Ronces / prudente, Sélène du Voile / lectrice) reliant apparence, tempérament et profil IA.

**Garde-fous.** Test : deux mains / engagements secrets différents → mêmes événements publics → mêmes réactions et même expression de repos. Les réactions ne sont pas corrélées à un mode secret (aucun accès). Le paramètre `pose=` (QA uniquement, `qa=1`) fige une humeur pour une planche de revue et n’est jamais utilisé en jeu.

**Question d’approbation.** Style visuel, noms et personnalités : provisoires. Toute future mécanique de lecture du rival (tells) exigera un contrat ratifié.
