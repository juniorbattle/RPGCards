# Protocole AGENTS / JOURNAL — cadre multiconversation et non-intrusion

`AGENTS.md` impose la discipline ; `JOURNAL.md` consigne l'état réel ; les `contracts/` portent les règles et frontières. Aucun de ces niveaux ne peut tenir lieu d'une preuve d'implémentation.

## Démarrage mission

- L'agent reçoit le prompt courant ; lit AGENTS, JOURNAL, gouvernance et contrats concernés.
- Il **ne ramène aucun contexte d'un autre projet** sans demande explicite de ce prompt ou contrat. Le dépôt RPG-ArtByCode est mentionné précisément comme **référence procédurale** dans la mission présente ; il peut être audité à ce titre seulement.
- Avant modifications : git status, base SHA, branches, risques, diagnostic, plan bref et critères de sortie.
- Si la mission ne contient pas de phase d'implémentation autorisée, livrer une analyse et s'arrêter. **Ici, l'implémentation du premier lot est expressément autorisée** sous les contraintes de branche et réception.

## Pendant

- Décisions locales réversibles : implémenter et documenter. Décisions structurant règles, narration, esthétique finale : proposer, ne pas figer.
- Chaque problème découvert reçoit `OK/KO/?`, seed/repro et leçon ; pas de « tout passe » fondé sur des tests qui n'ont pas tourné.
- Garder les sorties utiles et captures de référence, nettoyer les screenshots temporaires non reproductibles.

## Fin

- Mise à jour JOURNAL avec Passe N, « À reprendre », « Principes à garder ».
- Tests exacts et preuves au commit SHA. Si navigateur ou GPU indisponible, signaler limitation et chemin reproductible pour revue opérateur.
- Pas de merge automatique vers `main`. Un rapport opérateur est obligatoire.

## Interprétation du journal

Une ligne `[OK]` historique rapporte une vérification alors disponible, pas une garantie de non-régression. Une ligne `[KO]` ne doit pas être effacée si l'approche a échoué ; ajouter la correction et les preuves, conserver la cause pour éviter la répétition. Ne pas transférer tel quel le journal de l'autre jeu.
