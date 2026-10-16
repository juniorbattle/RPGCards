# Décisions ouvertes, non à décider silencieusement

## Arbitrages restés OUVERTS

- Nom exact du **nouveau dépôt** GitHub et sa visibilité ; ne pas mélanger avec `RPG-ArtByCode`.
- Framework UI ou vanilla TS ; découpage renderer Canvas/DOM/Three.js ; proposer alternatives et justifier.
- Caméra et cadre HD-2D, composition de l'arène et nature du décor urbain : **hors premier lot**.
- Direction artistique précise : palettes, typographies, proportions, dégradés, illustration des cartes, personnages et effets Signature.
- Profil(s) de l'IA initiale : niveau de jeu à implémenter ; spécifier hypothèses, distinguer comportement réel d'une IA tactique avancée.
- Formats évolués de sauvegarde RPG (collection durable, monnaie, ville, événements) ; absence de design détaillé pour ces modules ne doit pas bloquer le duel.
- Ratification formelle de l'affinité de Rang dans un futur contrat numéroté V3.3 : le mandat 01 indique la version à tester mais **n'affirme pas que le V3.0 historique est réécrit**.

## Template ADR (Architecture Decision Record)

Créer `docs/adr/NNN-slug.md` :

```md
# ADR NNN — [titre]
Date : YYYY-MM-DD
Statut : proposé / accepté par responsable / rejeté
Contexte et preuves : ...
Contraintes invariantes : ...
Options considérées : A, B, C (avantages / risques / dette)
Décision recommandée : ...
Justification + conséquences / migrations : ...
Tests + captures : ...
Question nécessitant approbation : ...
```

**Ne pas étiqueter « accepté » sans acceptation claire**. L'agent peut retenir un défaut technique localement réversible si le responsable ne l'a pas encore statué, en le marquant `proposé`.
