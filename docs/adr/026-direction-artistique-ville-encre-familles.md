# ADR 026 — Direction artistique du décor de la ville : illustration de carte encrée, couleurs des quatre familles (M09)

Date : 2026-10-19
Statut : **APPROUVÉ pour la direction** par le responsable (« Je retiens la direction D : décor encré comme une
illustration de carte, avec les couleurs des quatre familles. Applique-la au Quai. ») ; **première réalisation sur le
Quai proposée**, en attente de son retour sur la planche (`screenshots/qa/m09/v3/planche-v3-encre.png`) avant le Parvis
et les Ruelles.

## Contexte

Retour du responsable sur la première passe de qualité du Quai (JOURNAL passe 45) : « Il y a du bon […] mais je trouve
que nous sommes dans un résultat trop similaire et générique que l'autre projet qui utilise la même technique : il faut
qu'on se démarque dans la touche artistique de l'environnement. » La DA de M09 reprenait celle de Cité du Tournoi
(nuit presque monochrome indigo et ardoise, ambre comme seul accent chaud) et plusieurs de ses techniques : le rendu se
lisait comme une variante de cet autre jeu.

Quatre pistes ont été proposées sur une planche, avec quatre images de référence générées en local (frontale 2.5D, même
composition du Quai ; références seulement, jamais dans le jeu) : A encre et feuille d'or, B théâtre de papier, C la ville
des Quatre Voies (lumières des familles), **D = A + C** (recommandée). Le responsable a retenu **D**. Référence approuvée :
`reference/generated/2026-10-19-quai-direction-d/` (les enseignes du jeu de cartes classique de l'image y sont remplacées
par les emblèmes des familles du jeu).

## Décision

Le décor de la ville parle la même langue graphique que les cartes et les personnages « vectoriel V2 » :

1. **Encre** : contours tracés à l'encre sur toutes les arêtes du décor (silhouettes et plis, tirés de la profondeur,
   épaisseur réglée sur la définition), plus légers au loin ; passe `VilleEncre` avant le halo et le flou de bascule.
2. **Aplats et gravure** : la lumière des lanternes en paliers à bords doux (variante `illu` du nuanceur de surface) ;
   hachures de gravure dans les demi-teintes et les ombres, tracées dans le monde (elles ne glissent pas quand la caméra
   suit le joueur), effacées quand elles deviennent trop serrées ; grain de papier fixe à l'écran (le support de la
   carte), couleurs un peu plus franches, exposition relevée.
3. **Les quatre familles donnent leurs couleurs à la ville** (amendement de la règle « ambre comme seul accent chaud ») :
   Cendre (braise : le Fanal, sa guirlande, le chantier, les fanaux des bateaux), Voile (bleu argenté : l'armateur, le
   passage vers les Ruelles, la lueur de la ville haute), Ronce (vert : l'étal), Astre (or : les lampadaires du quai, la
   salle de jeu) ; vitraux des familles à la salle de jeu (fenêtres sous les bannières, rose à quatre quartiers au tympan
   de la porte du Tournoi) ; glyphes des familles gravés dans le mur du quai et doucement lumineux ; dorures (tringles,
   médaillons, bagues et pommeaux des lampadaires, frise de la corniche). Emblèmes : ceux du jeu (`src/art/emblems.ts`).
4. La nuit reste bleu d'encre ; l'ivoire désaturé reste celui des toiles ; les intérieurs éclairés restent chauds.
5. **Portée** : un style par îlot (`IlotDef.style: 'encre'`) ; le Quai d'abord, le Parvis et les Ruelles après la
   validation de la planche. Le combat (lieux de duel ADR 022) n'est pas touché.

## Conséquences

- Une passe plein écran de plus (encre), une texture de profondeur sur la cible du compositeur de la ville ; coût mesuré
  sur les deux GPU (JOURNAL passe 46).
- Les images de référence et les demandes d'images suivent désormais cette direction (`demandes-images/README.md`,
  AGENTS, « Images générées »).
- Cité du Tournoi reste une source de techniques (notées sur place) ; sa direction artistique n'est plus reprise telle
  quelle pour la ville.
- À étudier ensuite : appliquer la même direction aux trois îlots, puis décider si les lieux de duel (rue, bar) suivent.
