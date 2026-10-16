# Les Quatre Voies — Simulateur de duel V3.2 — proposition soumise à validation

**Statut : prototype de validation jouable, distinct du futur jeu RPG de production.**

## Ouvrir immédiatement

- **Sans installation** : ouvrir `SIMULATEUR_LES_QUATRE_VOIES_V3_1.html` dans un navigateur récent.
- **Avec les sources** : installer Node.js >=20, exécuter `npm run dev`, ouvrir `http://localhost:4173`.
- **Tester le moteur** : `npm test`.
- **Générer le HTML autonome** : `npm run build`.
- **Simuler des lots de parties** : `npm run simulate -- --count=1000 --hp=90 --strategy=mixed --seed=123 --csv=mes-resultats.csv`.

Aucune dépendance npm à installer, aucun modèle, image, police ou son externe. Le HTML autonome embarque la feuille de style, l'interface et le moteur.

## Ce que permet le simulateur

- Jouer **contre un adversaire heuristique**, avec decks de 16 identités + 1 Signature, modes Basic ou variantes.
- Choisir les Signatures des deux joueurs, les PV de départ, deux Techniques équipées pour le joueur et une graine pseudo-aléatoire.
- Préparer et révéler volontairement les Secondaires (charge d'un tour), en poser une par tour et remplacer une case pleine.
- Déclarer la Primaire en Assaut/Garde et engager jusqu'à deux Secondaires actives au moment prévu (Conserver, Rang, Dégâts, Interférer).
- Utiliser les fenêtres de Techniques éligibles, en particulier Lecture, Ancrage et Dissipation.
- Résoudre l'Interférence en une passe, l'égalité d'Assauts, l'absorption de Garde, le Repoussement et la prolongation après double K.-O.
- Voir le calcul de Clash et un journal lisible ; exporter le journal public et les résultats JSON.
- Observer les quatre Signatures et les seize variantes initiales selon le contrat source V3.0.

## Structure

```text
SIMULATEUR_LES_QUATRE_VOIES_V3_1.html  → ouverture directe
index.html                         → mode développement
src/engine.mjs                     → moteur déterministe et sans DOM
src/ui.mjs                         → interface / navigation du duel
src/style.css                      → art procédural CSS
src/ui.mjs:proceduralBackdrop      → ambiance Canvas 2D, particules et anneaux
src/engine.mjs:makeDeck            → catalogue / stats des cartes
test/engine.test.mjs               → tests déterministes et parcours de duels
tools/batch.mjs                    → simulations heuristiques paramétrables
tools/build.mjs                    → assemblage HTML autonome
tools/server.mjs                   → serveur local Node sans dépendance
docs/CONTRAT_V3_0_SOURCE.md        → source normative reçue de la Bibliothèque
CLAUDE.md                          → consignes pour l'agent de développement
docs/PROMPT_CLAUDE_CODE.md         → brief de production prêt à transmettre
```

## Garanties et limites

- La règle **3 / 6 / 9 / 12** est utilisée pour les cartes ordinaires ; les signatures P14/P12/P12/P13 restent finies.
- La confrontation et les décisions secrètes sont séparées : l'adversaire heuristique choisit des tactiques à partir des Primaires dévoilées et des Secondaires publiques, sans lire le choix secret tactique du joueur.
- La conservation des 17 cartes, le plafond Insight **2**, le gain **+1/tour** et le maximum **2 emplacements** sont contrôlés par invariant.
- **Les tests sont ceux d'un prototype**, pas une certification compétitive. Les simulations de lots utilisent des politiques simplifiées ; leurs statistiques dépendent beaucoup de leur comportement.
- Les animations sont volontairement sobres. Il ne s'agit **pas** du rendu de production, du jeu urbain, de la progression RPG, d'un multijoueur ni d'une IA entraînée.
- Pas d'éditeur complet de variantes, d'économie, de sauvegarde persistante, de tutoriel intégré ou de replay exhaustif des décisions. L'export JSON correspond à un **journal** et non à une relecture intégrale.
- L'interface a été vérifiée au niveau de l'assemblage et de la syntaxe ; **un contrôle ergonomique interactif en navigateur reste requis** avant production. Le navigateur headless disponible pendant la génération n'a pas abouti à une capture vérifiable.
- L'agent de production doit conserver le contrat V3.0 comme référence et **réimplémenter proprement** la logique lorsque nécessaire ; le moteur prototype fournit des cas d'essai et exemples, pas une architecture imposée.

## Note de sécurité et confidentialité

Simulateur **100 % local**. Les données ne sont envoyées à aucun serveur. Ne pas coller l'état moteur complet dans l'interface adverse lors d'une future version multijoueur : séparer explicitement l'état privé de chaque joueur des vues publiques.

## Modifications expérimentales V3.1 maintenues (à valider)

- Lors de **Amplifier le Rang**, une Secondaire de même famille que la Primaire fournit `Rang imprimé + 1` au score de confrontation, sinon `Rang imprimé`. Deux Secondaires de même famille donnent chacune +1. Le Rang imprimé ne change pas : la portée d’Interférence se compare toujours sur les Rangs imprimés. Une Signature conserve sa priorité ∞ ; le bonus numérique de Rang ne la surclasse jamais et ne s’ajoute pas à ∞.
- Pour les cartes du propriétaire, les Secondaires en chargement et les réserves non dévoilées restent identifiables mais sont **visuellement désactivées** ; leurs statuts et limitations sont explicites. L’adversaire voit le dos de la carte.
- **Chronologie inchangée :** révélation volontaire au début de tour, engagement Primaire, révélation simultanée des Primaires, puis choix simultanés secrets des modes de Secondaires actives. Le mode n’est pas verrouillé dès leur activation.
- Cette version est un **prototype de vérification** de deux améliorations ; le contrat V3.0 annexé est historique/normatif avant approbation du delta. Ne pas interpréter ce delta comme une réécriture silencieuse du contrat maître.

## Correctif V3.2 — Journal explicatif du Clash

- Affiche les Secondaires révélées/activées, avec leur case ; n'expose pas publiquement l'identité d'une carte immédiatement masquée par **Dissimulation**.
- Après verrouillage simultané, affiche chaque choix de Secondaire (**Conserver / Rang / Dégâts / Interférer**) et le bonus d'affinité de Rang lorsqu'il est public.
- Affiche les **scores de confrontation**, leur origine et une justification précise : Garde victorieuse, Assaut dominant et infligeant des dégâts, ou **Assaut dominant en Rang mais dont les dégâts sont entièrement absorbés par la Garde**.
- Corrige les formulations « Vous gagne », « Vous révèle », « Vous prépare » ; distingue victoire au Rang et impact PV. Le résultat du moteur n'a pas été modifié.
- Quatre tests de régression V3.2 reproduisent le cas Cendre III/Assaut contre Cendre IV/Garde avec et sans soutien, et protègent les révélations privées.

**Exemple** : au tour 2, Cendre III (Rang 3, Puissance 9) sans soutien perd contre Garde Cendre IV (Rang 4, Puissance 12). Avec Cendre I active en Amplifier le Rang (+1 Rang imprimé, +1 affinité), Cendre III gagne au score 5 contre 4, mais inflige 0 PV contre la Garde Puissance 12. Le nouveau journal explique ce résultat. Les cartes préparées au tour 2 restent en chargement et ne peuvent pas contribuer au Clash du tour 2.
