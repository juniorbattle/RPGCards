# M10-F — équilibrage mesuré de la RC de l'aventure, comparé à l'annexe de calibrage validée

Mesure : `LQV_ORDRE=adversaire npx tsx tools/m10a-paliers.ts 150 artifacts/qa/m10f/equilibre/paliers.json` (150 duels par
famille d'accueil et par étape, ×4 ; l'adversaire verrouille en premier comme le rival du jeu ; 762 s ; code du duel de
`43a62d9`). Le joueur est joué par l'IA « équilibré » : un ordre de grandeur, pas le plaisir de jeu ; marge d'environ ±4
points par ligne. **Contrôle :** les 30 lignes de l'aventure et les 14 du Duel standard sont **identiques, au chiffre près**,
à la mesure de l'amendement 1 (`artifacts/qa/v33/a1/apres/`, code de `916639d`) : le moteur du duel n'a pas changé depuis.

Objectifs : l'annexe de calibrage validée (`docs/m10/CALIBRAGE_M10A.md`, §3, mesurée sous V3.2 ; cible « plus favorable au
joueur de manière générale » que la fiche : inaugural 52 %, cadet 57 %, bras droit 46 %, chef 37 %). L'annexe est gardée
telle quelle par le responsable après les règles V3.3 (fiche de la Garde, E3 ; fiche de l'avenant 08, E1).

| Étape | Annexe directe | RC directe | Écart | Annexe entraînée | RC entraînée | Écart |
|---|---:|---:|---:|---:|---:|---:|
| Prologue — Kaï | 69 % | 66,0 % | −3 | 67 % | 62,7 % | −4 |
| Famille 1 — cadet | 62 % | 57,8 % | −4 | 76 % | 71,7 % | −4 |
| Famille 1 — bras droit | 53 % | 51,5 % | −2 | 64 % | 66,2 % | +2 |
| Famille 1 — chef | 42 % | 47,8 % | **+6** | 52 % | 64,5 % | **+12** |
| Famille 2 — cadet | 75 % | 65,7 % | **−9** | 94 % | 90,5 % | −4 |
| Famille 2 — bras droit | 68 % | 58,2 % | **−10** | 89 % | 87,3 % | −2 |
| Famille 2 — chef | 49 % | 47,8 % | −1 | 68 % | 72,7 % | **+5** |
| Famille 3 — cadet | 75 % | 69,5 % | **−6** | 95 % | 95,3 % | 0 |
| Famille 3 — bras droit | 59 % | 52,5 % | **−6** | 79 % | 86,7 % | **+8** |
| Famille 3 — chef | 53 % | 45,0 % | **−8** | 80 % | 86,0 % | **+6** |
| Famille 4 — cadet | 79 % | 69,3 % | **−10** | 96 % | 95,2 % | −1 |
| Famille 4 — bras droit | 63 % | 53,3 % | **−10** | 91 % | 94,2 % | +3 |
| Famille 4 — chef | 48 % | 45,5 % | −2 | 88 % | 89,5 % | +2 |
| Championnat — poule | 53 % | 47,8 % | **−5** | 89 % | 88,3 % | −1 |
| Championnat — Miroir | 53 % | 49,3 % | −4 | 89 % | 86,7 % | −2 |
| Championnat — Finale | 54 % | 48,3 % | **−6** | 88 % | 88,3 % | 0 |

## Lecture

- **Voie directe (aucun duel facultatif)** : plus dure que l'annexe à partir de la deuxième famille (cadets et bras droits
  −6 à −10 points, chefs 45 à 48 %, Championnat 48 à 49 %) ; le premier chef, lui, est plus facile (+6) : sous V3.3, une
  Signature en Assaut ne passe plus une Garde sans dégât, et l'annonce de la Signature du chef aide le joueur. **Aucun duel
  principal ne descend sous 45 %** ; chaque défaite compte comme un combat (+3 PV) et ne fait rien perdre.
- **Voie entraînée** (6 combats de plus par famille) : égale ou plus favorable que l'annexe (chefs 64 à 90 %, Championnat
  87 à 88 %) : « l'entraînement paie » tient.
- **Parcours complet** (`test/m10f.test.ts`, IA du joueur, voie directe sans facultatif, défaites rejouées) : 26 à 32 duels
  du prologue au titre selon la famille d'accueil, dont 7 à 13 défaites.
- **Duel standard** (`standard.md`) : inchangé depuis l'amendement 1 (corpus 50,0 %, Kaï 64 %, Maëlle 35 %, Sélène 50 %,
  Orin 34 %).
- Ces écarts sont ceux que le responsable a déjà vus et gardés (fiche de la Garde E3, fiche de l'avenant 08 E1) ; ils sont
  remis dans la fiche de la RC pour confirmation, **aucune valeur n'est changée** ici.
