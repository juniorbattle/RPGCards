# JOURNAL.md — Les Quatre Voies

**Nature :** journal de production du **nouveau projet**, et non journal copié de RPG-ArtByCode.  
**Convention :** passes chronologiques, plus récente en bas ; statut `[OK]`, `[KO]`, `[?]` ; preuves vérifiables.  
**Dernière passe :** 0 — kit de cadrage externe (aucun code de production créé par Claude Code encore).

## État initial connu

- `[OK]` Règlement V3.0 consolidé et présent dans `source/CONTRAT_REGLES_V3_0_HISTORIQUE.md` ; contient le duel, 16 variantes, 4 Signatures, 6 Techniques et les raccordements.
- `[OK]` Simulateur de référence V3.2 fourni dans `simulator_ref/simulator` ; moteur JavaScript autonome, UI de test, journal corrigé. **N'est pas le futur jeu.**
- `[OK]` Delta de gameplay à intégrer au nouveau moteur : Amplifier le Rang reçoit +1 par Secondaire de même famille, selon `contracts/02_...` ; états chargement/réserve/active visibles ; chronologie des choix inchangée.
- `[OK]` Référence méthodologique RPG-ArtByCode auditée publiquement (main, commit `d7c439b3b08280d7643d8cfe3f658de6ad49b928`) : Vite/TypeScript/Three.js, procédural, outils de capture, mesure, graine, journal AGENTS.
- `[?]` Aucune implémentation production dans ce nouveau dépôt au moment de la remise de kit ; les commandes, perf, captures et intégrations devront être créées/testées par Claude Code.
- `[?]` Il n'existe aucun contrat validé de caméra, décor urbain, composition d'arène, palette détaillée ou sprites personnage pour Les Quatre Voies.

## À reprendre (prioritaire)

1. Lire le kit entier, inventorier les contradictions et qualifier chaque élément historique / expérimental / normatif.
2. Initialiser architecture production TypeScript/Vite ; planifier les modules du duel sans copier l'UI de test.
3. Porter et vérifier le moteur avec la nouvelle affinité de Rang ; tests des secrets, interactions exceptionnelles et invariants.
4. Construire une première expérience duel jouable à la souris/tactile/clavier, drag & drop et états explicites.
5. Déployer un générateur procédural minimal de cartes/plateau/effets indépendants du moteur ; seed et preuves visuelles.
6. Capturer les écrans, faire un rapport QA et obtenir validation sur la base M1-M3 avant environnement HD-2D étendu.

## Principes à garder

- Séparer Règles / Présentation / Génération artistique / IA.
- Instrumenter avant optimiser ; captures et chiffres doivent venir du même build, seed et machine précisés.
- Conserver les échecs et leurs causes ; n'inventer ni approbation ni résultat.
- Les choix visuels du projet RPG-ArtByCode sont une référence de **méthode**, jamais un cahier des charges visuel importé.
- Le joueur interagit par des cartes, pas par des sélecteurs HTML comme mécanisme central.

---

## Passe 0 — Kit de production externe (2026-10-15)

**Objet :** préparation des sources de vérité, garde-fous et mission initiale.  
**[OK]** Contrats, prompt et simulateur fournis pour démarrage.  
**[?]** Aucun commit production, aucune validation navigateur sur un nouveau dépôt ; reprise à confier à Claude Code.  
**Pensée :** le prototype sert à prouver les règles ; le produit doit réinventer sa présentation sans réinventer le système de combat.

---

## Modèle obligatoire d'une prochaine passe

### Passe N — [titre] — [date, branche, commit de départ/fin]

- **Mission / contraintes :**
- **Lecture initiale :** journal, contrats, fichiers contrôlés
- **Modifications :** module / comportement / raison
- **[OK] Succès :** preuve, commande, seed, screenshot, commit
- **[KO] Échecs / tentatives abandonnées :** symptômes, cause, prévention
- **[?] Incertitudes / arbitrages :** options, recommandation, blocage
- **Tests :** commandes et résultats exacts (jamais imaginés)
- **Perf / visuels :** appareil, résolution, baseline, diff si applicable
- **Pensée :** leçon technique à retenir
- **À reprendre :** tickets concrets et ordre de priorité

Mettre aussi à jour les sections globales « À reprendre » et « Principes à garder » en début de fichier après chaque passe.
