/** Paramètres d’URL réellement implémentés (documentés dans README). */
import { FAMILIES, type Family } from '../game/catalog/cards';
import { TECHNIQUE_IDS, type TechniqueId } from '../game/catalog/techniques';
import { isVenueId, type VenueId } from '../presentation/venues';

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
  /** QA (`qa=1`) : éléments de la scène retirés pour mesurer leur coût (voir ArenaOptions.ablate). */
  ablate: string[];
  /** QA (`qa=1&fallback=off|nobloom|direct`) : repli automatique du post-traitement désactivé, ou niveau imposé
   *  (voir ArenaOptions.fallback). Null en jeu : repli actif. */
  fallback: 'off' | 'nobloom' | 'direct' | null;
  /** QA (`qa=1&renderCheck=1`) : chaque rendu ciblé du plateau est comparé à un rendu complet (passe 13). */
  renderCheck: boolean;
  /** QA (`qa=1&artCheck=1`) : chaque illustration pré-générée par le worker est comparée à une génération synchrone (passe 14). */
  artCheck: boolean;
  /** M08 C2 (QA, `qa=1&venue=salle|rue`) : lieu imposé à tous les duels et écrans (captures, mesures). Null en jeu : lieu de la rencontre. */
  venue: VenueId | null;
  /** M09 V2 (provisoire, `demo=1`) : démo jouable, le Quai remplace le tableau des rencontres. Faux en jeu par défaut. */
  demo: boolean;
  /** M08 C2 (QA, `qa=1&venueCache=1`) : nombre de décors gardés montés (mesure du changement de lieu). Null en jeu : défaut de l’arène. */
  venueCache: number | null;
  /** M08 C1 : préparation des rivaux aux temps morts ; `qa=1&prep=art|off` = couches seules, ou rien (mesure). */
  prep: 'full' | 'art' | 'off';
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
    ablate: q.get('qa') === '1' ? (q.get('ablate') ?? '').split(',').filter(Boolean) : [],
    fallback: q.get('qa') === '1' && ['off', 'nobloom', 'direct'].includes(q.get('fallback') ?? '') ? (q.get('fallback') as 'off' | 'nobloom' | 'direct') : null,
    beat: q.has('beat') ? Math.max(0, Math.floor(Number(q.get('beat')) || 0)) : null,
    renderCheck: q.get('qa') === '1' && q.get('renderCheck') === '1',
    artCheck: q.get('qa') === '1' && q.get('artCheck') === '1',
    venue: q.get('qa') === '1' && isVenueId(q.get('venue')) ? (q.get('venue') as VenueId) : null,
    demo: q.get('demo') === '1',
    venueCache: q.get('qa') === '1' && q.has('venueCache') ? Math.max(1, Math.floor(Number(q.get('venueCache')) || 1)) : null,
    prep: q.get('qa') === '1' && (q.get('prep') === 'art' || q.get('prep') === 'off') ? (q.get('prep') as 'art' | 'off') : 'full',
  };
}
