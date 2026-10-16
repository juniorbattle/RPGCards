# Vérification initiale des références (préparation kit)

- Le code de référence dans `simulator_ref/simulator/` est extrait du ZIP V3.2 antérieur.
- Commande effectivement exécutée par l'assistant de préparation du kit : `cd simulator_ref/simulator && npm test`.
- Résultat : **28 tests réussis, zéro échec** ; comprend bonus Rang affinité, reproduction du journal T2, interférences et 80 seeds d'un parcours moteur limité à 80 tours par essai.
- Ces tests ne certifient ni le futur moteur TypeScript, ni un UI browser jouable, ni un rendu procédural de production. Claude Code doit reproduire et étendre sa propre campagne de tests.
- `RPG-ArtByCode` a été inspecté en **lecture GitHub**, pas cloné ni exécuté sur la machine. Les observations techniques sur son GPU proviennent de son journal, elles ne sont pas des mesures nouvelles.
- Aucun dépôt GitHub, branche ou PR de Les Quatre Voies n'a été créé par ce kit ; cette étape incombe au responsable / agent de développement autorisé.
