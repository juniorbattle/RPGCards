# Dépôt cible

**GitHub :** https://github.com/juniorbattle/RPGCards

Les fichiers de ce kit sont destinés à la racine du dépôt. Ne pas ajouter un sous-dossier `KIT_*` autour d’eux.

## Intégration manuelle si le connecteur n’autorise pas les écritures

1. `git clone https://github.com/juniorbattle/RPGCards.git`
2. `cd RPGCards`
3. Extraire le contenu de cette archive **dans la racine** du dépôt.
4. `git switch -c bootstrap/les-quatre-voies-m01`
5. `git add . && git commit -m "chore: import Les Quatre Voies production M01"`
6. `git push -u origin bootstrap/les-quatre-voies-m01`
7. Ouvrir une pull request de cette branche vers `main`, puis faire valider l’import.

**Note** : commandes données pour une branche existante ou vide selon état local ; si `git switch -c` échoue car la branche existe, utiliser `git switch bootstrap/les-quatre-voies-m01`. Sur un dépôt totalement vide, `git clone` peut créer un répertoire sans historique ; `git switch -c` et premier commit restent applicables.
