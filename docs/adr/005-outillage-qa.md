# ADR 005 — Outillage de tests et de QA navigateur
Date : 2026-10-16
Statut : proposé

- **Tests moteur** : Vitest 4.1.11 (version corrigée des avis de sécurité tinypool/@vitest/mocker signalés par `npm audit` sur 3.x ; `npm audit` = 0 vulnérabilité). `.npmrc` `legacy-peer-deps=true` contourne un bug de résolution de pairs optionnels de npm 10.9.
- **Navigateur** : `playwright-core` 1.56.1 + Chromium préinstallé (`/opt/pw-browsers/chromium`, surcharge `CHROMIUM_PATH`), WebGL logiciel **SwiftShader** (pas de GPU dans le conteneur). Aucun téléchargement de navigateur.
- `npm run qa:browser` : duels complets pilotés par l’UI (glisser souris, clic, clavier, glisser tactile CDP), audit de secrets dans le DOM, erreurs console.
- `npm run shots` : captures déterministes (`freeze=1`, seed, artSeed) des parcours U01–U12 et comparatif de caméras.
- `npm run perf` : mesures de la scène Three.js et du moteur sur la machine courante (SwiftShader : chiffres **non représentatifs d’un GPU réel**).
- Crochet `window.__lqv` actif **uniquement** avec `?qa=1` ; il expose l’état complet pour piloter les captures et n’est jamais utilisé par l’UI de jeu ni par l’IA.
