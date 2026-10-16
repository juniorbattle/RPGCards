# Diagnostic — Journal d’actions T2, V3.2

Le fragment de journal ne contient **pas** la révélation de la Secondaire posée au tour 1, ni l'action choisie pour cette Secondaire au tour 2, ni les scores finaux. Il ne permet donc pas de dire si le Clash rapporté est faux.

## Cas A — Sans soutien actif
- Vous : Cendre III, Assaut, score 3, Puissance 9.
- Rival : Cendre IV, Garde, score 4, Puissance 12.
- **Garde victorieuse**, aucun dégât. Si le journal dit « Vous gagne », c'est une erreur de résolution dans cet état.

## Cas B — Soutien possible du tour 1
- Cendre I, posée tour 1, peut être révélée au début du tour 2 et choisie pour **Amplifier le Rang** après la révélation des Primaires.
- Le bonus V3.1 est de **+2** (rang imprimé I + affinité Cendre +1).
- Score Assaut Cendre III = **5** contre score Garde Cendre IV = **4**.
- L'Assaut **domine le Clash** mais la Garde absorbe entièrement : `max(0,9−12)×1 = 0`.
- Cette situation est conforme à la règle « Rang = priorité ; Puissance = blessure / absorption ».
- La Secondaire nouvellement préparée au tour 2 est **indisponible au tour 2** et ne peut expliquer la victoire.

## Correctif
- Journaliser les révélations volontaires au moment où elles ont lieu, en préservant la dissimulation.
- Journaliser les choix tactiques **après le verrouillage simultané**.
- Journaliser les scores avec leurs contributions, la dominance du Rang et l'absorption de la Puissance.
- Conserver un historique sans révélation anticipée des décisions adverses.
- Ne pas modifier silencieusement le contrat : l'affinité de Rang demeure un delta V3.1 en attente de validation formelle.

## Tests ciblés
- Avec zéro soutien, la Garde Cendre IV gagne ; zéro blessure.
- Avec Cendre I active en Amplifier le Rang, Assaut Cendre III gagne au score 5, mais ne blesse pas.
- Une révélation volontaire s'affiche dans le journal.
- Une révélation simultanément masquée n'expose pas le nom de la carte dans le journal public.
