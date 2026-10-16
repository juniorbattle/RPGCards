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
