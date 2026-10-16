# Architecture cible indicative — A faire confirmer par audit Claude Code

La structure ci-dessous exprime les responsabilités, **pas** une obligation de copier cette arborescence littéralement. Claude Code doit justifier les écarts par un ADR.

```text
/ AGENTS.md
/ JOURNAL.md
/ README.md
/ package.json / tsconfig.json / vite.config.ts
/ contracts/                    # autorité métier et production
/ docs/adr/                      # décisions justifiées
/ src/
    /app/                        # injection, orchestration, lifecycle
    /game/catalog/               # cartes, familles, effets, signatures, techniques
    /game/model/                 # types, zones, vue, phase, commandes
    /game/engine/                # commandes -> événements -> état ; pur, seedé
    /game/visibility/            # projection joueur/IA/public ; secret par construction
    /game/ai/                    # politique explicable sans lecture d'état secret
    /game/replay/                # replay/version/seed/hash et sauvegarde
    /presentation/board/         # slots, positionnement, interaction carte
    /presentation/cards/         # représentation et inspection de cartes
    /presentation/hud/           # PV, Insight, phases, log
    /presentation/animation/     # playback non autoritaire des événements
    /art/generators/             # seeds, motifs, atlas, emblèmes, procédés Canvas/SVG
    /art/renderers/              # 2D/Three.js optionnel sans dépendance gameplay
/ test/                          # unitaires, propriétés, invariants, simulation
/ tools/                         # screenshot, inspect, perf, reprise seed
/ screenshots/qa/                # captures annotées aux seeds/commits
/ simulator_ref/                 # référence d'évaluation, pas code importé au runtime
```

## Proposition de modèle de commandes

```ts
type PlayerId = 'p1' | 'p2';
type Phase = 'REFILL' | 'REVEAL_SECONDARIES' | 'COMMIT' |
  'LECTURE' | 'REVEAL_PRIMARIES' | 'TACTICS' | 'RESOLVE' | 'CLEANUP' | 'ENDED';
type Command = {
  player: PlayerId;
  phase: Phase;
  kind: string;
  payload: unknown;
};
// Commandes phase-validées + `viewFor` décident ce que chaque acteur peut consulter.
```

## Arbitres essentiels

- **Deck/Zone** : chaque carte physique a `instanceId`, `identity`, `variantId`, `ownerId`, `zone`. Un déplacement est atomique.
- **Phases** : simultanéité gérée par engagements cachés (« submitted » de chaque côté), puis application ; les hooks UI ne déclenchent jamais des dégâts.
- **RNG** : pioches/IA utilisent generator stable seedé ; le générateur d'art possède une seed indépendante.
- **Effets** : table de capacités typées, contraintes de déclenchement (reveal/use/primary), exceptions explicites contrôlées.
- **Journal** : événements métier avec visibilité déclarée ; renderer public n'interprète pas les objets privés.
- **Tests** : construit l'état depuis fixture/version, réapplique les événements, vérifie invariants des zones et secrets.

## Stack conseillée

Node moderne stable, Vite, TypeScript strict, Three.js **seulement pour la couche HD-2D/FX où sa valeur est démontrée**. Un render DOM/SVG/Canvas peut être plus adapté aux cartes manipulables. Choisir l'UI (vanilla TS ou framework léger) à partir du besoin de Pointer Events, maintenance et tests, pas par mimétisme du dépôt de référence.
