# 05 — Contrat maître UX : plateau manipulable, secrets et phases

## Expérience cible

Le duel se joue **en prenant les cartes**, pas en remplissant des formulaires. Sélection par clic + clic de destination **et** glisser-déposer natif pointer/tactile ; raccourcis clavier et navigation accessible, zoom/inspection. Les listes HTML et menus `select` peuvent apparaître en debug ou accessibilité, **jamais** en interaction normale principale.

## Zone et gestes

- Main de 4 cartes lisibles, inspectables, et déplacer vers **Primaire** (toujours obligatoire) ou **Secondaire** (au plus 1 nouvelle, terrain 2 slots).
- Lorsqu'une Primaire est déposée, la carte montre deux positions/modes **Assaut / Garde**, avec confirmation explicite avant verrouillage et possibilité d'annuler tant que non verrouillé.
- Pose en Secondaire : face propriétaire identifiable, dos adverse, overlay « CHARGEMENT — non utilisable ce tour ».
- Début d'un tour suivant : le propriétaire peut cliquer les réserves chargées pour les **révéler** ou les maintenir cachées ; le joueur ne les confond jamais avec la main ou les cartes déjà prêtes.
- Secondaire ACTIVE : clic ouvre les actions contextuelles autorisées **après révélation des Primaires** : CONSERVER, AMPLIFIER LE RANG, AMPLIFIER LES DÉGÂTS (si sa Primaire est en Assaut), INTERFÉRER (sélectionner cible active adverse légale ou à l'aveugle si masquée).
- Techniques apprises/équipées : maximum deux visibles dans UI, fenêtres explicitement disponibles, coût et explication de l'échec conditionnel ; un seul usage par tour.
- Pause sur carte, zoom lisible, explication de mot-clé ou effet ; les informations cachées restent cachées. Le joueur peut consulter à tout moment la défausse publique.

## Chronologie UX et transitions

`DEBUT TOUR → RÉVÉLATION VOLONTAIRE RESERVES → ENGAGEMENT PRIMAIRE + NOUVELLE SECONDAIRE → (LECTURE si utilisée) → REVELATION PRIMAIRES → CHOIX TACTIQUES SECRETS → RESOLUTION / IMPACT → NETTOYAGE → TOUR SUIVANT`.

Pas de nouveau « contre » ou micro-tour proposé au joueur ; la résolution calcule ses événements hors animation. Si l'IA met du temps à réfléchir, ne pas faire croire que le joueur voit une décision secrète.

## États minimaux à tester

- `selected` : carte choisie, slots légaux surlignés ; `dragging` avec fantôme et snap sur case, retour en main si annulé.
- `charging` : non jouable, verrou plein ; `hiddenReady` : face cachée inactive ; `activeReady` : disponible. Contraste et libellé **non dépendants uniquement de la couleur**.
- `committedPrivate` : silhouette/verso et possibilité d'annuler avant verrouillage ; `revealedPrimary` : face visible avec P/Rang/mode ; `tacticalLocked` : choix secret affiché uniquement au propriétaire jusqu'au reveal.
- `interfered` et `preserved` : feedback non ambigu (l'action annulée ne réussit pas même si Ancrage préserve la carte).
- `signature` : ∞ = priorité, P imprimée finie ; pas d'animation suggérant des dégâts infinis.
- `zeroDamageRankWin` : message spécifique « gagne au Rang, 0 blessure : absorbé par Garde ».
- `doubleKoOvertime` : PV à 1 chacun après nettoyage, pas de remise à zéro des cartes.

## Lisibilité et prévisualisation

- Toujours montrer **ce qui est connu** : Rang imprimé, bonus Rang survivant, score de confrontation connu, Puissance imprimée, absorption, dégâts prévisibles conditionnels.
- Ne jamais dévoiler une option IA à partir de la prévisualisation ou d'un taux de victoire calculé avec informations cachées.
- Journal structuré : ordre réel, public/privé, soutien et bonus, résultat de Rang **différent** du résultat PV. Ordre d'affichage choisi mais clairement horodaté par tour et phase.
- IA visible comme adversaire : personnalité comportementale et décisions construites de sa vue, jamais omniscience.

## Critères ergonomiques

- Cliquer-déposer **et** drag/drop doivent tous deux être jouables à la souris ; tactile sans hover ; clavier au minimum Tab, Entrée/Espace, Échap et commandes d'annulation avant verrouillage.
- Grandes zones tactiles, possibilité de zoom, infobulles accessibles, focus visible, mouvement réduit.
- Tester textes longs et densité maximale : 4 cartes en main, deux soutiens de chaque côté, une paire de Primaires révélées, journal ouvert.
- Chaque action illégale donne une raison précise (« Secondaire en chargement », « Dégâts exige Assaut », « coût Insight insuffisant ») plutôt que silencieusement ignorer le drop.
