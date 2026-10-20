# ADR 030 — Lot de départ : seize cartes neutres sans famille (M10)

Date : 2026-10-20  
**Statut : APPROUVÉ pour la COMPOSITION du lot neutre initial et ses propriétés intrinsèques ; avenant moteur encore requis.**

## Décision explicite du responsable

> « les 16 cartes neutres sont 4 cartes de 4 rang dubliques qui n'offre aucun bonus ou effect juste un set de cartes basiques a jouer »

Interprétation opérationnelle : **4 exemplaires de chaque Rang I, II, III et IV**, soit **16 cartes physiques**. Elles sont **sans famille** et ne portent **aucun effet, bonus ou aptitude individuelle**. L'illustration est blanche/grise, sans emblème des Quatre Voies. Aucun des seize exemplaires ne représente une appartenance Cendre, Voile, Ronce ou Astre.

| Définition neutre | Nombre d'exemplaires | Propriété |
|---|---:|---|
| Neutre I | 4 | Rang I, sans famille, sans effet propre |
| Neutre II | 4 | Rang II, sans famille, sans effet propre |
| Neutre III | 4 | Rang III, sans famille, sans effet propre |
| Neutre IV | 4 | Rang IV, sans famille, sans effet propre |
| **Total** | **16** | **4 définitions / 16 instances physiques** |

**Rangs dupliqués voulus :** ne pas inventer seize pouvoirs distincts ou seize identités familiales factices pour contourner l'unicité de l'ancien deck. Les copies sont interchangeables pour les caractéristiques imprimées, mais chacune possède son identifiant d'instance dans le moteur pour les zones pioche/main/défausse.

**Neutre n'est PAS une cinquième famille** : aucune affinité familiale, aucun bonus de famille, aucun effet imprimé. Le moteur normal des duels familiaux (16 identités ordinaires uniques + Signature = 17 cartes) doit rester intact.

## Points NON ratifiés à soumettre avant modification du gameplay

1. **Puissance par Rang** : la proposition la plus conservatrice reprendrait I=3, II=6, III=9, IV=12 des Basics ordinaires du catalogue ; cela **n'est pas encore explicitement ratifié** pour les cartes neutres.
2. **Signature initiale** : le responsable a spécifié un **set de 16 cartes neutres**, sans trancher séparément s'il existe un emplacement Signature ou un autre mode de construction du deck avant affiliation. Ne pas déduire ni ajouter une Signature familiale automatique.
3. **Techniques / tactiques générales** : absence d'effet propre à la carte n'interdit pas les actions normales Assaut/Garde ; leurs règles de disponibilité dans la phase neutre doivent être rédigées et validées.
4. **Passage des neutres aux cartes familiales** : le remplacement 1-pour-1 des cartes, le passage éventuel à 17 cartes, les Signature/Techniques obtenues à l'affiliation/au chef et les limites de copies sont encore à arbitrer.
5. **Compatibilité** avec replay déterministe, sauvegardes historiques, IA non omnisciente, visibilité des cartes neutres et modes Duel standard / Aventure.

**L'ADR 029 reste approuvé :** une famille remarque d'abord le joueur, mais celui-ci conserve le choix de l'affiliation. **M09 reste actif** et aucun moteur ne doit être changé tant qu'un avenant M10-A de règle n'est pas ratifié.

## Tests futurs attendus

- Exactement 4 instances par Rang, 16 au total ; pas d'effet et pas de famille, même dans le rendu, le journal, les projections public/privé et l'IA.
- Pas de bonus d'affinité applicable à une carte neutre ; aucune famille « Neutre » dans la liste des Quatre Voies.
- Pioche/main/défausse sans collision d'identifiants malgré les copies identiques.
- Deck standard à 17 cartes inchangé, anciennes sauvegardes intactes.
