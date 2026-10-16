# ADR 009 — Composition fidèle à la preview validée : HUD compacts, centre libre, caméra ancrée
Date : 2026-10-16
Statut : proposé (mandat M03 §1–2 ; preview `reference/REFERENCE_VISUELLE_VALIDEE_M03.jpg` approuvée par le responsable)

**Contexte.** La preview M03 devient la référence de composition. Elle rejette la bande HUD joueur
M02 qui traversait l’écran et la colonne permanente journal/inspection. Les choix M02 contraires à la
preview sont dépassés ; ADR 006 (vues A/B pilotées par les phases) reste valable sur le principe.

**Décision.**
- **Scène plein cadre** : plus de grille à colonne latérale ; tous les modules sont des calques absolus
  sur l’arène Three.js. Modules « fins sombres à liseré doré, coins ornés » (même famille visuelle).
- **HUD rival haut-gauche** (nom + emblème, PV, Insight, Main | Pioche | Déf., statut, Techniques du
  profil public) ; **HUD joueur bas-gauche**, même structure, **avec portrait procédural**
  (`src/art/portrait.ts`, composé à partir des mêmes couches que le rival 3D — `rivalTextures`).
- **Bulle du rival haut-droite** : nom, humeur accordée, réplique courte (`src/presentation/rivalLines.ts`,
  pur, alimenté par l’Expression publique ; aucune réplique n’affirme connaître un secret).
- **Main centrée en bas** (grandes cartes ≈ 22 % de la hauteur), **commandes + Techniques du joueur en bas
  à droite** (hauteur fixe : boutons immobiles), **journal en tiroir rétractable**, **inspection
  flottante** à gauche (survol / focus / appui long), frise de phase compacte en haut.
- **Emplacements posés sur la table** : sols en pointillés dorés en perspective (`rotateX`), cartes
  légèrement inclinées ; la boîte d’interaction (cible de dépôt) reste droite → hit-tests fiables.
- **Caméra ancrée sur la mise en page** : pour chaque vue, la feuille de style fixe la hauteur d’écran de
  la tête du rival et du bord lointain de la table (`--a-head/--a-edge/--b-head/--b-edge`, lues par
  `main.ts` → `arena.setLayout`). L’arène choisit focale et décalage (`setViewOffset`) pour tenir ces
  deux ancres, sur toute taille d’écran. **La vue B garde le visage du rival visible** (le portrait
  incrusté M02 est retiré).
- **Salle aux bougies** (décor provisoire, 100 % code) : fond peint (arches, ciel étoilé), piliers,
  bannières des quatre familles derrière le rival, plantes, table vernie à incrustations dorées,
  bougies (corps instanciés + flammes/halos en points animés par shader : 3 draw calls).
- Passage A ↔ B : caméra interpolée (ADR 006) **et** rangées/main qui glissent de leur ancienne place
  (FLIP 0,45 s ; instantané en mouvement réduit / gel).

**Conséquences.** Le centre de l’écran appartient au rival, aux Primaires et au Clash. La preview reste
un **document de revue** (planches de comparaison `tools/shots-m03.mjs`), jamais un asset runtime.
Les textes illustratifs incohérents de la preview ne sont pas reproduits : valeurs et libellés viennent
du moteur. Mobile 390×844 : mini-HUD (portrait) en haut, deux rangées, consigne + action, main,
mini-HUD joueur en bas, tiroir en feuille basse.

**Tests.** `qa:browser` (M03) : position des HUD, bande centrale libre, aucun chevauchement main /
commandes / emplacements / HUD, pas de défilement horizontal, sur 1280, 1920 et mobile.

**Question d’approbation.** Valider la composition, les proportions et le décor (provisoire) ; les
répliques du rival (couleur, sans information cachée) ; le portrait procédural du joueur.
