/**
 * M10-B — faits PUBLICS d'un duel, lus dans le journal visible du joueur (`visibleEvents(…, 'p1')`) : Clashes gagnés en
 * Assaut ou en Garde, Interférences réussies (usages adverses annulés, publics après verrouillage). Aucun secret : la
 * narration (premier émissaire, répliques) ne lit que cela (ADR 011, ADR 029 §5). Pur.
 */
import type { ClashReport, GameEvent } from '../game/model/types';
import { visibleEvents } from '../game/visibility/view';
import type { FaitsPublics } from './aventure';

export function faitsPublics(events: readonly GameEvent[]): FaitsPublics {
  const f: FaitsPublics = { assautsGagnes: 0, gardesGagnees: 0, interferencesReussies: 0 };
  for (const e of visibleEvents([...events], 'p1')) {
    if (e.kind !== 'clash' || e.vis !== 'public') continue;
    const r = e.data as unknown as ClashReport;
    if (r.winner === 'p1') {
      if (r.stances.p1 === 'assault') f.assautsGagnes += 1;
      else f.gardesGagnees += 1;
    }
    f.interferencesReussies += r.cancelled?.p2?.length ?? 0;
  }
  return f;
}
