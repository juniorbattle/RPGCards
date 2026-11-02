# M15 — Vers un son 16 bits (cadrage proposé, à valider avant tout code)

**Date :** 2026-11-01. **Statut : DIRECTION CHOISIE (page d'écoute remplie le 2026-11-01), contrat `docs/m15/01_SON_16_BITS.md` proposé.** **Origine :** fiche M13, entrée R3 : « aller vers un son 16 bits (une mission à cadrer) »,
après la question du responsable (« on est sur du 16Bit ? »). **Lot 1 fait** (2026-11-01, ordre du responsable : « Oui, lance-le ») : **page d'écoute <https://claude.ai/artifact/XgP1XMMfaCyb8hjrq5fJpf>**, à remplir. Le jeu n'a pas changé.

## 1. Ce que la fiche a déjà tranché

Le responsable a reçu les thèmes, les versions et le comportement de la musique (M13 : R2, E1 à E12, J1 à J10), et laissé les
instruments « à écouter d'abord » (S1 à S5). **Lecture proposée, à confirmer :** on garde l'écriture et la musique qui suit le jeu ;
on change la palette et le mélange.

| Reste | Change |
|---|---|
| Six thèmes, 15 versions, jingles, harmonie | Timbres de tous les instruments |
| Synthèse par code (aucun fichier audio dans le jeu, ADR 047) | Résolution et largeur de bande du son rendu |
| `chef.ts` : couches, ponctuations, pause entre les morceaux, ville qui grandit | Nombre de voix simultanées, donc réduction des arrangements denses |
| Volume, faits publics seulement (ADR 011), son coupé en QA | Salles et acoustique des lieux (J8, M2), à refaire en écho de console |

**Conséquence à accepter :** les vents en temps réel (M13, amendement 1), le point le plus travaillé pour le réalisme, n'ont plus de
raison d'être. Un pupitre 16 bits est un timbre échantillonné et bouclé. Le coût de calcul devrait baisser, à mesurer (M3).

## 2. La question qui décide de tout : quel « 16 bits » ?

**Point à savoir :** Final Fantasy VIII et Breath of Fire III, les inspirations du mandat de M13, sont des jeux **PlayStation**, pas des
jeux 16 bits. Leur son est plus riche que celui d'une console 16 bits. Trois directions sont donc possibles :

| Option | Contrainte | Effet attendu |
|---|---|---|
| **A. Super Nintendo stricte** | 8 voix au total, échantillons courts à 32 kHz environ, filtre sourd, écho court | Le plus typé, le plus nostalgique ; big band et Finale fortement réduits |
| **B. Couleur 16 bits, sans la limite stricte** | Mêmes timbres et même écho, jusqu'à 12 ou 16 voix | Le son de l'époque, les arrangements gardés presque entiers |
| **C. Époque PlayStation** | 24 voix, meilleure bande passante, réverbération | Le plus proche de FF VIII et Breath of Fire III ; le moins « 16 bits » |

**Recommandation : décider à l'oreille, pas sur ce tableau.** Le même extrait de 30 secondes (la ville, chapitre II, plus un duel) rendu
dans les trois options, avec la version actuelle en référence, en OGG à écouter sans lancer le jeu.

## 3. Lots proposés

1. **Essai d'écoute** : un petit moteur d'essai hors du jeu, trois OGG par extrait. Aucun changement du jeu. Le responsable choisit.
2. **Contrat et ADR** : la contrainte retenue, chiffrée (voix, fréquence, écho), amendement de l'ADR 047.
3. **Palette** : instruments refaits sous la contrainte, sous un réglage désactivé par défaut.
4. **Arrangements** : réduction aux voix permises, thème par thème, avec règles de priorité (mélodie, basse, batterie d'abord).
5. **Salles et mélange** : écho par lieu, niveaux, reprise des mesures de M13.
6. **Bascule** : la nouvelle palette par défaut, après écoute complète ; l'ancienne retirée sur ordre seulement.

## 4. Questions au responsable (page d'écoute)

- **Q1.** Tranchée : essai lancé. **D1 de la page :** la direction. Recommandation par les chiffres seulement, B : aucune note perdue, même au Championnat (A y perd 239 notes sur 1 067 et en coupe 376).
- **Q2.** Les bruitages et les ambiances (M11, S1 à S3) passent-ils aussi en 16 bits ? **Recommandation :** oui, pour un jeu cohérent, en dernier.
- **Q3.** La lecture du §1 (on garde l'écriture, on change la palette) est-elle la bonne ?

## 4 bis. Décisions du responsable (page d'écoute, 3 choix, consignés à la passe 195)

| Entrée | Choix | Note |
|---|---|---|
| **D1** Direction | B, couleur 16 bits | « j'hesite avec la musique actuelle et la B, couleur 16 Bits » |
| **D2** Bruitages et ambiances | Oui, en dernier | |
| **D3** Ce qu'on garde | **Non, certains thèmes sont à réécrire** (écart à la recommandation) | « je pense que nous devons refaire le theme championnat qui est encore brouillon dans son intonation » |

| **D4** Le nouveau Championnat (passe 197) | Il me va | |

**Effets :** D1 : porte d'écoute avant toute bascule, la musique actuelle reste le défaut (contrat 1, §2). D3 : le thème VI est réécrit ; cela retire pour lui la réception de la fiche M13 (R2, E10).

## 5. Garanties

Règles du duel, IA et images inchangées. La musique actuelle reste en place jusqu'à la bascule. Le responsable reste
seul juge à l'écoute : une session ne peut pas écouter, elle mesure seulement.
