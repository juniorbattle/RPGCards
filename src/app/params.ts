/** Paramètres d’URL réellement implémentés (documentés dans README). */
import { FAMILIES, type Family } from '../game/catalog/cards';
import { TECHNIQUE_IDS, type TechniqueId } from '../game/catalog/techniques';

export interface AppParams {
  seed: number;
  artSeed: number;
  sig: Family | null;
  techs: TechniqueId[] | null;
  autostart: boolean;
  reducedMotion: boolean;
  freeze: boolean;
  qa: boolean;
  scenario: string | null;
  scale: number;
  hp: number;
  aiDelay: number;
  gallery: boolean;
  /** Vue : `auto` (pilotée par les phases), ou figée `A` (confrontation) / `B` (manipulation) pour la QA. */
  view: 'auto' | 'A' | 'B';
  /** Rythme de présentation (n’affecte jamais le moteur). */
  pace: 'normal' | 'fast' | 'instant';
  /** Personnalité de rival forcée (braise | ronce | voile). */
  rival: string | null;
  /** Captures : temps de résolution sur lequel figer (avec freeze=1). */
  beat: number | null;
  /** Captures : conserver le temps d’observation du rival en début de tour malgré freeze=1. */
  intro: boolean;
  /** Revue visuelle uniquement : humeur imposée au rival (planche de comparaison), jamais en jeu normal. */
  pose: string | null;
}

export function readParams(search = window.location.search): AppParams {
  const q = new URLSearchParams(search);
  const num = (k: string, def: number) => {
    const v = Number(q.get(k));
    return q.has(k) && Number.isFinite(v) ? v : def;
  };
  const sig = q.get('sig');
  const techs = q.get('tech');
  const prefersReduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  return {
    seed: Math.floor(num('seed', 20261016)),
    artSeed: Math.floor(num('artSeed', 7)),
    sig: sig && (FAMILIES as readonly string[]).includes(sig) ? (sig as Family) : null,
    techs: techs ? (techs.split(',').filter((t) => (TECHNIQUE_IDS as readonly string[]).includes(t)).slice(0, 2) as TechniqueId[]) : null,
    autostart: q.get('autostart') === '1' || q.has('scenario'),
    reducedMotion: q.has('reducedMotion') ? q.get('reducedMotion') === '1' : !!prefersReduced,
    freeze: q.get('freeze') === '1',
    qa: q.get('qa') === '1',
    scenario: q.get('scenario'),
    scale: Math.min(1.5, Math.max(0.8, num('scale', 1))),
    hp: Math.max(1, Math.floor(num('hp', 90))),
    aiDelay: Math.max(0, num('aiDelay', 650)),
    gallery: q.get('gallery') === '1',
    view: q.get('view') === 'A' || q.get('cam') === 'frontal' ? 'A' : q.get('view') === 'B' || q.get('cam') === 'tilted' ? 'B' : 'auto',
    pace: q.get('pace') === 'fast' ? 'fast' : q.get('pace') === 'instant' ? 'instant' : 'normal',
    rival: q.get('rival'),
    intro: q.get('intro') === '1',
    pose: q.get('qa') === '1' ? q.get('pose') : null,
    beat: q.has('beat') ? Math.max(0, Math.floor(Number(q.get('beat')) || 0)) : null,
  };
}
