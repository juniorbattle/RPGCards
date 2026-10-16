/** Paramètres d’URL réellement implémentés (documentés dans README). */
import { FAMILIES, type Family } from '../game/catalog/cards';
import { TECHNIQUE_IDS, type TechniqueId } from '../game/catalog/techniques';
import type { CameraPreset } from '../scene/arena';

export interface AppParams {
  seed: number;
  artSeed: number;
  sig: Family | null;
  techs: TechniqueId[] | null;
  autostart: boolean;
  reducedMotion: boolean;
  freeze: boolean;
  cam: CameraPreset;
  qa: boolean;
  scenario: string | null;
  scale: number;
  hp: number;
  aiDelay: number;
  gallery: boolean;
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
    cam: q.get('cam') === 'frontal' ? 'frontal' : 'tilted',
    qa: q.get('qa') === '1',
    scenario: q.get('scenario'),
    scale: Math.min(1.5, Math.max(0.8, num('scale', 1))),
    hp: Math.max(1, Math.floor(num('hp', 90))),
    aiDelay: Math.max(0, num('aiDelay', 650)),
    gallery: q.get('gallery') === '1',
  };
}
