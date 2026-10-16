# M03.2 — Rapprocher le runtime de la preview visuelle approuvée

**Condition d'entrée :** M03.1 P0 terminé et vérifié ; ne pas camoufler de fuite par le rendu. Aucun changement de règles.

## Source de vérité et contraintes

Comparer la véritable exécution M03 et **la preview validée** stockée dans `reference/REFERENCE_VISUELLE_VALIDEE_M03.jpg`. S'appuyer sur `screenshots/qa/m03/comparaison-1-vue-A.png`, `comparaison-2-vue-B.png`, `comparaison-4-resolution.png`, `comparaison-6-mobile.png`. Garder un répertoire `screenshots/qa/m03-2/` pour les nouvelles captures. Référence visuelle **document de revue seulement**, interdiction de l'utiliser comme texture/asset runtime ou comme substitut d'une capture réelle.

La structure de l'ADR 009 est **retenue** : HUD rival compact haut gauche, HUD joueur compact et apparenté en bas gauche, cartes lisibles au bas, commandes périphériques, bulle du rival, journal en tiroir et **centre libre**. Les six chorégraphies ADR 010 sont **retenues comme base**, sous réserve du peaufinage de tempo, fluidité et hiérarchie. On ne refait ni le moteur, ni l'UI en sélecteurs, ni le pipeline art by code. La preview contient des valeurs de gameplay décoratives qui ne doivent jamais être copiées au détriment des vrais PV/Rangs.

## P0 — Lisibilité de la confrontation : personnage et caméra

**Priorité la plus élevée.** Dans le runtime actuel, le visage et le buste de Maëlle sont trop petits/distant par rapport à la preview ; l'espace de la table est surdominant. Ajuster géométrie/framing, distance apparente, focales, ancres `--a-head/--a-edge/--b-head/--b-edge` et le rendu du rival pour :
- vue A : rival de taille suffisante pour lire yeux/sourcils/bouche et ses réactions **sans loupe**, visage/buste au centre supérieur, silhouette incarnée ;
- vue B : rival encore significatif et lisible en haut du cadre, tout en laissant les zones de pose/drag accessibles et dégagées ;
- aucun HUD, bulle, bannière, bougie, main, effet Clash ou zone de ciblage ne doit obstruer le visage ou les cartes centrales ;
- aucune transition déclenchée sur un clic ne doit changer les hit boxes pendant un drag ; aucune perte du focus clavier.
Préférer des mesures normalisées (taille relative du visage/personnage en % du viewport, position de tête, espace utile des cartes) **calculées à partir des captures réellement produites**, avec justification des cibles. Ne pas fabriquer un pourcentage « officiel » depuis la preview si les surfaces ne sont pas comparables.

## P1 — Hiérarchie UI et finition des éléments utiles

- Garder le HUD joueur bas gauche et rival haut gauche dans la **même grammaire** visuelle ; rendre PV, Insight, pioche/défausse lisibles et accessibles. Pas de grande barre traversant l'écran.
- Augmenter tailles utiles de cartes/typographie sur le plateau et dans la main aux étapes de choix, sans forcer de chevauchement. Garder ASSAUT rouge / GARDE bleu avec **mot + pictogramme** dès la révélation, jamais avant.
- Dans les animations de Clash, favoriser les deux cartes, le visage du rival et le verdict. Limiter à **une annonce principale**, puis 2–3 conséquences compréhensibles ; envoyer les détails au tiroir journal (ou panneau de détail). Éviter la minuscule liste de puces sous les cartes vue dans les captures M03.
- Maintenir les six classifications de Clash exactes : AA vainqueur, AA égalité double impact, AG Garde victorieuse, AG Garde cédant avec blessure, AG Assaut prioritaire mais **0 blessure absorbée**, GG neutre. Le gagnant reste mis en scène un instant mais est défaussé comme le perdant, selon les règles.
- Expressions du rival cohérentes uniquement avec les faits publics. **Pas de vrais tells**, bluff ou Sang-froid dans cette passe. Éviter les phrases qui divulgueraient une intention cachée.

## P2 — Éclairage et art par code, sans explosion GPU

La preview est plus lumineuse et chaleureuse ; le runtime M03 rend la table trop sombre. Ajuster lumière, couleurs, contraste local, matière bois, température des sources et présence des bougies pour augmenter **la lisibilité** sans laver les couleurs Cendre/Voile/Ronce/Astre ni perdre le ciel nocturne.

Raffiner la profondeur du visage (formes/ombres/expressivité par couches Canvas), les cheveux et la silhouette sans introduire de modèle externe. Garder des générateurs et graines stables. Pas de rendu « peint » téléchargé. Pas de bloom/DOF coûteux par principe ; ne l'ajouter qu'avec mesure réelle et option de repli.

Ne pas augmenter massivement le nombre de bougies/draw calls pour égaler une image fixe. M03 représente environ **80 draw calls / 36,45 ms CPU par image sous SwiftShader en vue A**, à comparer avant/après sur même machine. Le GPU matériel devra être mesuré sur appareil compatible ; si indisponible, le noter sans prétendre 60 FPS.

## P3 — Mobile : portrait ET paysage

Conserver le parcours portrait 390×844 existant. Ajouter un **gabarit paysage** (p.ex. 844×390 et 960×540) réellement utilisable : rival/plateau au centre, HUD compacts périphériques, main et commandes accessibles au doigt, cibles tactiques et inspection lisibles, aucune zone invisible derrière un outil. Le mobile paysage de la preview est **une référence de composition**, pas un jeu de proportions figées.

Critères : pas de défilement horizontal involontaire, zones tactiles suffisamment confortables, clic/toucher/drag-and-drop/tap-to-place, séquence Clash et mouvement réduit, changement orientation conservant l'état. Test au clavier si le parcours le requiert.

## P4 — QA visuelle comparative et non-régression

Exécuter sur un SHA identifié (normal + rapide + mouvement réduit) :

- Comparaisons **avant (M03) / après (M03.2) / preview validée**, à **même résolution et même seed/scénario** : vue A confrontation, vue B manipulation, tactique post-révélation, AA/AG/GG, absorption 0 dégât, HUD joueur et mobile portrait/paysage.
- Captures/vidéo réelle des **transitions A↔B** et d'au moins deux impacts (AA et AG), avec une durée et une courbe de mouvement documentées. Un filmstrip QA n'est pas à lui seul preuve de fluidité humaine réelle.
- Contrôles automatiques de non-chevauchement HUD/cartes/commandes, positions/hit boxes après bascule, absence de fantômes de Clash, accessibilité basique, diversité de seeds/portraits et aucune fuite secrète.
- Tests `npm run typecheck`, `npm test`, `npm run build`, `npm run qa:browser`, scénarios Rupture/Dissipation de M03.1, `npm run shots:clash` ; mesures performance avec devise/renderer exacts. Si aucune carte graphique réelle n'est disponible, demander une vérification opérateur ultérieure et documenter.
- Au besoin scénarios `?scenario=...` pour reproduire sans hasard les événements majeurs. Le script rival ne s'applique qu'aux démos QA.

**Critère de décision de la revue :** le visage du rival est lisible, la manipulation de cartes ne souffre pas, la résolution est comprise **sans devoir lire le journal complet**, le HUD laisse le centre libre et les performances ne se dégradent pas silencieusement.

**Livrable :** `docs/RAPPORT_M03_2.md`, planches de comparaison et captures/filmstrip/vidéo si disponible, ADR de cadrage ou performance au besoin, `JOURNAL.md` mis à jour, matrice des écarts résiduels. Pas de fusion `main`.