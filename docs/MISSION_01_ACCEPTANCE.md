# MISSION 01 — critères d'acceptation opérateur

## Critères ajoutés par le mandat M01 autonome

- Une **scène Three.js réelle** est montée et reliée au rythme du duel (au minimum arène/plateau procédural et feedback du Clash) ; la seule présence de `three` dans `package.json` n'est pas suffisante.
- Une **tranche verticale complète jouable contre une IA** doit être livrée rapidement, pas un projet « bien architecturé » mais sans boucle de duel finissable. Les lots de réalisation s'enchaînent de manière autonome tant qu'aucun arbitrage canonique n'est bloquant.
- HUD et cartes peuvent être en DOM/CSS/SVG/Canvas, avec **clic ET drag/drop**, parce que la lisibilité et l'accessibilité priment sur la 3D pour l'interaction.
- Si l'agent aborde l'environnement, un **cadrage HD-2D exploratoire** de dessus inclinée ou frontal 2.5D est autorisé. Aucun décor, caméra ou design final ne peut être présenté comme déjà approuvé.
- Distinguer clairement « MVP de duel jouable », « conformité complète au catalogue/Techniques » et « RPG de ville achevé » ; fournir la matrice des fonctions présentes, incomplètes et testées.


## Objet

Première tranche exécutable de Les Quatre Voies : moteur canonique + UI de manipulation directe + art procédural minimum. **Pas d'objectif de décor/caméra HD-2D final.**

## Critères éliminatoires

- `npm install`, `npm run dev`, `npm run typecheck`, `npm test`, `npm run build` réellement réussis sur le commit soumis.
- Un duel complet peut démarrer, se poursuivre et se terminer (dont double K.-O.) contre une IA qui n'a pas accès aux décisions secrètes du joueur.
- Décks de 17 cartes uniques, 4 familles, les 16 variantes et 4 Signatures prévues, 6 Techniques et Insight 0..2 fonctionnels ou limites explicitement signalées ; pas de placeholder non déclaré.
- Jouer sans `select` HTML : click-to-place ET drag/drop cartes, Assaut/Garde, Secondaires, actions contextuelles, validation/annulation précommit.
- 3 états des Secondaires visuellement distincts, séquences de phases explicites, secret des faces adverses vérifié.
- Zéro erreur de console de navigateur sur scénarios de base ; UI réactive sur souris, tactile, clavier.
- Rang affinité V3.2 +1 testé ; M dégâts additif testé ; Rang/Puissance affichés séparément ; résultat de 0 PV expliqué, journal de T2 fixé.
- Génération de quelques styles et textures par code reproductibles : 4 familles et Signature distinctes, pas d'asset externe ; seed art séparée.
- README de lancement + AGENTS/JOURNAL actualisés + ADR structurants + captures réelles + liste d'écarts contractuels.

## Parcours opérateur à capturer (seed enregistrée)

| ID | État/interaction | Preuve |
|---|---|---|
| U01 | main 4, sélection puis placement Primaire, option Assaut/Garde | capture avant/après, pas de menus select |
| U02 | poser Secondaire : CHARGEMENT bien verrouillé | capture + rejet d'utilisation |
| U03 | tour suivant : garder cachée / révéler | deux captures, état et info adverse |
| U04 | choisir après Primaires révélées : conserver/Rang/Dégâts/Interférer | capture du menu contextuel sans fuite de choix adverses |
| U05 | pointer drag/drop et alternative clic validées | screencast si possible + test automatisé |
| U06 | Lecture simultanée éventuelle, puis reveal sans fuite | replay hash + capture |
| U07 | T2 : Cendre III en Assaut + Cendre I Rang contre Garde IV | score 5/4, 0 dégâts, raison affichée |
| U08 | Garde victorieuse, Repoussement valide / absent | journal, case/tour inspectable |
| U09 | Interférence contre support engagé vs Conservé | effet annulé vs échec, consommation vérifiée |
| U10 | Signature ∞ contre Garde P12 : absorbé ; Signature vs Signature | capture priorité ∞, Puissance finie |
| U11 | double KO et reprise 1 PV sans reset | journal et état après nettoyage |
| U12 | mobile portrait, keyboard-only, reduced motion | captures/QA multi viewport |

## Rendu requis en réponse Claude Code

1. **Etat du lot** OK / partiel / KO et pourquoi.
2. Branche + SHA, commandes réellement exécutées et console/lignes de sortie.
3. Liste des fonctionnalités réellement jouables ; manques/dettes hiérarchisés.
4. Une capture pour la main/plateau, une pour phase de Clash, une pour la Secondaire active/inactive, une pour le jeu mobile.
5. Résultat tests QA avec seeds de reproduction.
6. Décisions ADR, impacts performance mesurés, questions de validation.
7. JOURNAL mis à jour avec « À reprendre » honnête.
