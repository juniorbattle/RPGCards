/**
 * Scénarios de démonstration/QA déterministes (captures U07…U11). Le rival y est SCRIPTÉ
 * (commandes fixées à l’avance, indépendantes des choix du joueur) — clairement identifié
 * comme mode démonstration, jamais présenté comme comportement de l’IA.
 */
import { DEFAULT_CONFIG } from '../game/engine/engine';
import { d, fixture, idOf } from '../game/fixtures/fixture';
import type { GameConfig, GameState, PlayerCommand } from '../game/model/types';

export interface Scenario {
  id: string;
  title: string;
  description: string;
  config: GameConfig;
  build: (cfg: GameConfig) => GameState;
  /** Commandes du rival indexées par `tour:phase`. */
  rival: Record<string, (s: GameState) => PlayerCommand>;
}

const base = (over: Partial<GameConfig['players']['p1']> = {}, over2: Partial<GameConfig['players']['p2']> = {}): GameConfig => ({
  seed: 5150,
  players: {
    p1: { ...DEFAULT_CONFIG.players.p1, variants: 'none', techniques: [], ...over },
    p2: { ...DEFAULT_CONFIG.players.p2, variants: 'none', techniques: [], ...over2 },
  },
});

export const SCENARIOS: Record<string, Scenario> = {
  t2: {
    id: 't2',
    title: 'T2 — victoire au Rang sans dégât',
    description: 'Cendre III Assaut + Cendre I (réserve à révéler, puis Rang) contre Garde Cendre IV.',
    config: base(),
    build: (cfg) => fixture(cfg,
      { hand: ['Cendre-3', 'Voile-4', 'Astre-2', 'Ronce-1'], slots: [{ def: 'Cendre-1' }, null] },
      { hand: ['Cendre-4', 'Ronce-2', 'Astre-1', 'Voile-1'] }, { turn: 2, phase: 'PREPARE' }),
    rival: {
      '2:COMMIT': (s) => ({ type: 'commit', player: 'p2', primaryId: idOf(s, 'p2', d('Cendre-4')), stance: 'guard', secondaryId: null, replaceSlot: null }),
    },
  },
  interference: {
    id: 'interference',
    title: 'Interférence et soutiens',
    description: 'Vos deux Secondaires actives contre un rival qui Interfère sur un soutien engagé (Interférences mutuelles possibles).',
    config: base({ variants: ['Voile-3'] }),
    build: (cfg) => fixture(cfg,
      { hand: ['Cendre-4', 'Ronce-2', 'Astre-1', 'Voile-2'], slots: [{ def: 'Cendre-3', active: true }, { def: 'Astre-4', active: true }] },
      { hand: ['Ronce-3', 'Astre-2', 'Voile-1', 'Ronce-1'], slots: [{ def: 'Voile-4', active: true }, null] }),
    rival: {
      '5:COMMIT': (s) => ({ type: 'commit', player: 'p2', primaryId: idOf(s, 'p2', d('Ronce-3')), stance: 'guard', secondaryId: null, replaceSlot: null }),
      '5:TACTICS': () => ({ type: 'tactics', player: 'p2', plans: [{ mode: 'interfere', target: 0 }, null], technique: null }),
    },
  },
  signature: {
    id: 'signature',
    title: 'Signature ∞ contre Garde IV',
    description: 'Brasier Originel (∞, P14) contre une Garde Ronce IV renforcée : priorité ∞, absorption selon Puissance.',
    config: base({ signature: 'Cendre' }),
    build: (cfg) => fixture(cfg,
      { hand: ['sig-Cendre', 'Voile-2', 'Astre-1', 'Ronce-1'], slots: [{ def: 'Cendre-4', active: true }, { def: 'Cendre-3', active: true }] },
      { hand: ['Ronce-4', 'Astre-2', 'Voile-1', 'Cendre-1'], slots: [{ def: 'Ronce-3', active: true }, null] }),
    rival: {
      '5:COMMIT': (s) => ({ type: 'commit', player: 'p2', primaryId: idOf(s, 'p2', d('Ronce-4')), stance: 'guard', secondaryId: null, replaceSlot: null }),
      '5:TACTICS': () => ({ type: 'tactics', player: 'p2', plans: [{ mode: 'rank' }, null], technique: null }),
    },
  },
  'clash-aa': {
    id: 'clash-aa',
    title: 'Clash — le rival attaque (ASSAUT)',
    description: 'Le rival engage Ronce III en ASSAUT. Votre choix décide de la chorégraphie : Cendre IV en Assaut (vous dominez), Cendre III en Assaut (égalité : impacts simultanés), Astre II en Assaut (le rival domine), ou une Garde (Assaut contre Garde).',
    config: base(),
    build: (cfg) => fixture(cfg,
      { hand: ['Cendre-4', 'Cendre-3', 'Astre-2', 'Voile-1'] },
      { hand: ['Ronce-3', 'Astre-2', 'Voile-1', 'Cendre-1'] }),
    rival: {
      '5:COMMIT': (s) => ({ type: 'commit', player: 'p2', primaryId: idOf(s, 'p2', d('Ronce-3')), stance: 'assault', secondaryId: null, replaceSlot: null }),
    },
  },
  'clash-ag': {
    id: 'clash-ag',
    title: 'Clash — le rival se met en GARDE',
    description: 'Le rival engage Cendre IV en GARDE (Puissance 12). Cendre III + Cendre I en Rang : victoire au Rang SANS blessure (absorption) ; Cendre III seule : la Garde tient ; Brasier Originel ∞ : la Garde cède ; votre propre Garde : Garde contre Garde.',
    config: base({ signature: 'Cendre' }),
    build: (cfg) => fixture(cfg,
      { hand: ['Cendre-3', 'sig-Cendre', 'Ronce-4', 'Astre-2'], slots: [{ def: 'Cendre-1', active: true }, null] },
      { hand: ['Cendre-4', 'Ronce-2', 'Astre-1', 'Voile-1'] }),
    rival: {
      '5:COMMIT': (s) => ({ type: 'commit', player: 'p2', primaryId: idOf(s, 'p2', d('Cendre-4')), stance: 'guard', secondaryId: null, replaceSlot: null }),
    },
  },
  rupture: {
    id: 'rupture',
    title: 'Technique — Rupture (Garde gagnante, aucune cible cachée)',
    description: 'Vous avez Rupture (2 Insight sur 2). Le rival attaque en ASSAUT avec Cendre II et CONSERVE Astre III active ; il n’a aucune Secondaire cachée. Jouez Ronce IV en GARDE, activez Rupture et visez Astre III, puis verrouillez : la Garde gagne, Rupture renvoie Astre III dans la main du rival (un seul Repoussement).',
    config: base({ techniques: ['Rupture'] }),
    build: (cfg) => fixture(cfg,
      { hand: ['Ronce-4', 'Cendre-1', 'Astre-2', 'Voile-2'], insight: 2 },
      { hand: ['Cendre-2', 'Ronce-1', 'Voile-1', 'Astre-1'], slots: [{ def: 'Astre-3', active: true }, null] }),
    rival: {
      '5:COMMIT': (s) => ({ type: 'commit', player: 'p2', primaryId: idOf(s, 'p2', d('Cendre-2')), stance: 'assault', secondaryId: null, replaceSlot: null }),
      '5:TACTICS': () => ({ type: 'tactics', player: 'p2', plans: [{ mode: 'keep' }, null], technique: null }),
    },
  },
  'rupture-cachee': {
    id: 'rupture-cachee',
    title: 'Technique — Rupture sans objet (une cible cachée existe)',
    description: 'Même duel, mais le rival garde aussi une Secondaire CACHÉE en case 2 : la Garde victorieuse donne le Repoussement Basic (cible cachée uniquement) ; Rupture, déclarée et payée, échoue sans remboursement. Un seul Repoussement.',
    config: base({ techniques: ['Rupture'] }),
    build: (cfg) => fixture(cfg,
      { hand: ['Ronce-4', 'Cendre-1', 'Astre-2', 'Voile-2'], insight: 2 },
      { hand: ['Cendre-2', 'Ronce-1', 'Voile-1', 'Astre-1'], slots: [{ def: 'Astre-3', active: true }, { def: 'Voile-4' }] }),
    rival: {
      '5:COMMIT': (s) => ({ type: 'commit', player: 'p2', primaryId: idOf(s, 'p2', d('Cendre-2')), stance: 'assault', secondaryId: null, replaceSlot: null }),
      '5:TACTICS': () => ({ type: 'tactics', player: 'p2', plans: [{ mode: 'keep' }, null], technique: null }),
    },
  },
  dissipation: {
    id: 'dissipation',
    title: 'Technique — Dissipation contre un camouflage',
    description: 'Le rival révèle Voile III — Dissimulation et une autre Secondaire Voile, aussitôt masquée (famille visible, identité cachée). Vous avez Dissipation (1 Insight) : visez la Dissimulation pendant la fenêtre de Dissipation pour lever le camouflage avant l’engagement. Ce que le rival a déjà observé n’est pas effacé.',
    config: base({ techniques: ['Dissipation'] }, { variants: ['Voile-3', 'Voile-1'] }),
    build: (cfg) => fixture(cfg,
      { hand: ['Cendre-4', 'Ronce-2', 'Astre-1', 'Voile-2'] },
      { hand: ['Ronce-3', 'Cendre-2', 'Astre-2', 'Ronce-1'], slots: [{ def: 'Voile-3-dissimulation' }, { def: 'Voile-1-eclaireur' }] }, { turn: 5, phase: 'PREPARE' }),
    rival: {
      '5:PREPARE': () => ({ type: 'prepare', player: 'p2', reveal: [0, 1] }),
      '5:COMMIT': (s) => ({ type: 'commit', player: 'p2', primaryId: idOf(s, 'p2', d('Ronce-3')), stance: 'guard', secondaryId: null, replaceSlot: null }),
      '5:TACTICS': () => ({ type: 'tactics', player: 'p2', plans: [{ mode: 'keep' }, { mode: 'keep' }], technique: null }),
    },
  },
  masque: {
    id: 'masque',
    title: 'Camouflage — effet d’une Secondaire masquée (ADR 011)',
    description: 'Le rival révèle Dissimulation et Cendre III — Ferveur, aussitôt masquée ; il engage Cendre IV en ASSAUT et la Secondaire masquée en Dégâts. Gardez avec Ronce II : vous voyez les dégâts et le gain d’Insight du rival, jamais le nom de l’effet ni la carte avant la fin du tour.',
    config: base({}, { variants: ['Voile-3', 'Cendre-3'] }),
    build: (cfg) => fixture(cfg,
      { hand: ['Ronce-2', 'Astre-3', 'Voile-1', 'Cendre-1'] },
      { hand: ['Cendre-4', 'Astre-1', 'Ronce-4', 'Voile-2'], slots: [{ def: 'Voile-3-dissimulation' }, { def: 'Cendre-3-ferveur' }] }, { turn: 5, phase: 'PREPARE' }),
    rival: {
      '5:PREPARE': () => ({ type: 'prepare', player: 'p2', reveal: [0, 1] }),
      '5:COMMIT': (s) => ({ type: 'commit', player: 'p2', primaryId: idOf(s, 'p2', d('Cendre-4')), stance: 'assault', secondaryId: null, replaceSlot: null }),
      '5:TACTICS': () => ({ type: 'tactics', player: 'p2', plans: [{ mode: 'keep' }, { mode: 'damage' }], technique: null }),
    },
  },
  doubleko: {
    id: 'doubleko',
    title: 'Double K.-O. — prolongation',
    description: 'Contrecoup perdant contre un Assaut supérieur, les deux duellistes à 3 PV.',
    config: base({ variants: ['Cendre-4'] }),
    build: (cfg) => fixture(cfg,
      { hand: ['Cendre-4-contrecoup', 'Voile-2', 'Astre-1', 'Ronce-1'], hp: 3 },
      { hand: ['sig-Ronce', 'Astre-2', 'Voile-1', 'Cendre-1'], hp: 3 }),
    rival: {
      '5:COMMIT': (s) => ({ type: 'commit', player: 'p2', primaryId: idOf(s, 'p2', 'sig-Ronce'), stance: 'assault', secondaryId: null, replaceSlot: null }),
    },
  },
};
