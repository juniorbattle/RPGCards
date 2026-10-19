# ADR 026 — Direction artistique du décor de la ville : illustration de carte encrée, couleurs des quatre familles (M09)

Date : 2026-10-19
Statut : **APPROUVÉ pour la direction** par le responsable (« Je retiens la direction D : décor encré comme une
illustration de carte, avec les couleurs des quatre familles. Applique-la au Quai. ») ; **première réalisation sur le
Quai proposée**, en attente de son retour sur la planche (`screenshots/qa/m09/v3/planche-v3-encre.png`) avant le Parvis
et les Ruelles. Retour du responsable : amélioration nette, pousser plus loin (profondeur de champ, flaques, décors) :
**amendement 1 (passe 47) proposé**, planche `screenshots/qa/m09/v3/planche-v3-relief.png`.

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

Le décor de la ville parle la même langue graphique que les cartes du jeu et la référence D approuvée (correction du
responsable, amendement 1 : les personnages actuels de la ville sont provisoires et ne servent pas de référence au décor) :

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

## Amendement 1 — profondeur de champ, reflets, décors du centre (passe 47, 2026-10-19) — proposé

Retour du responsable sur la planche de la direction D : « Oui il y a clairement une amélioration mais je pense encore
que nous pouvons pousser l'effort […] les bâtiments et les décors doivent être optimisés et devenir encore plus
impressionnants visuellement, et j'aime beaucoup le jeu de lumière, il nous manque le blur et aussi les flaques d'eau
réfléchissantes (que Cité du Tournoi intègre et qui donnent vraiment bien). » Puis, sur une capture intermédiaire :
« cette partie avec l'eau ressemble à un miroir, une vitre plutôt que de l'eau ; sinon j'aime bien les flaques d'eau
posées sur la rue ; le renforcement de la ville haute est aussi intéressant ; moi je veux optimiser la qualité graphique
et design des décors centraux. »

Ajouts à la direction D (le Quai seulement, réglages par îlot) :

1. **Profondeur de champ** (`IlotDef.dof`, passe `VilleFlou` après l'encre) à la place du flou de bascule : la rue
   jouable et le premier rang de façades restent nets (du mur du quai au fond des maisons) ; l'eau et les bateaux du
   premier plan se brouillent, la ville haute s'adoucit. La passe d'encre transmet la profondeur dans l'alpha. Technique
   de Cité du Tournoi (`src/atmosphere/PostFX.ts` L. 35-80).
2. **Reflet plan de la rue** (`IlotDef.reflets`, `src/ville/reflets.ts`) : la scène vue par une caméra miroir sous les
   pavés, à demi-définition ; les **flaques** peintes par code (surtout le long du bord du quai, où la vue rasante
   reflète les vitraux, les portes et les passants) y montrent la scène nette, le pavé humide un reflet flou ; l'**eau du
   port** en montre une image brisée par les rides (traînées verticales, crêtes et creux, pied du mur du quai sombre),
   jamais une vitre. Technique de Cité du Tournoi (`src/atmosphere/ShadowAndReflection.ts` L. 42-106,
   `src/materials/GroundShaders.ts` L. 83-188).
3. **Clair de lune peint** sur les étages et les toits (matières `illu`) : la matière des toits et des étages se lit en
   bleu froid au-dessus des lanternes (chaud en bas, froid en haut).
4. **Décors du centre** : salle de jeu (fronton à oculus au soleil d'Astre, acrotères et pinacles, pilastres, frise
   sculptée des quatre familles, denticules, porte cloutée d'or), maison de l'armateur (pignon sur rue à oculus du Voile,
   balconnets de fer forgé, frontons de fenêtres), maison à pignon (rives dorées, lambrequin, rosace, épi), chantier
   (atelier rougeoyant derrière la grande porte, avirons croisés), toits (crêtes de fer, épis, pots de cheminée),
   lampadaires ouvragés (plaque émaillée d'une famille, consoles à volutes), étal garni (fioles vertes, paquets de
   cartes aux couleurs des familles, herbes, fanion de Ronce), jardinières et arbustes en pots, fumées du second rang,
   ville haute plus présente.

**Correction du responsable (même jour)** : « le décor d'environnement sur nos PNJ, personnages actuels qui ont un design
temporaire : on va régénérer cela avec Aseprite et/ou gpt-image-2 ; j'ai l'impression que ton design s'inspire de nos PNJ
intégrés, si c'est le cas c'est une erreur. » Constat : la langue graphique du décor (encre, aplats, couleurs des familles,
architecture) vient de la référence D ; mais la décision ci-dessus la justifiait aussi par les personnages (« même langue
que les personnages vectoriel V2 », JOURNAL passe 46), et l'échelle du Quai (personnages de 2,2 m, portes de 2,65 m,
façades abaissées, passe 45) a été réglée sur la hauteur des personnages. Règle désormais : **les personnages de la ville
(`src/ville/sprites.ts`) sont provisoires ; le décor ne s'en inspire pas** ; les futurs personnages (Aseprite et/ou
gpt-image-2) seront ajustés au décor, et seule leur hauteur dans le monde (`IlotDef.walkerH`, portes) sera recalée. Utiliser
des images de gpt-image-2 dans le jeu demandera d'amender la règle « images générées : références seulement » (AGENTS) au
moment de cette tâche.

Le Parvis et les Ruelles, le combat et le jeu par défaut ne changent pas. Coût et preuves : JOURNAL passe 47.
