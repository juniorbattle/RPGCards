/**
 * Mémoire de l’IA — construite UNIQUEMENT à partir des événements que son siège a le droit de voir
 * (publics + ses propres événements privés : Sondage, Éclaireur, Clairvoyance, Détour, Racine…).
 * Aucune lecture d’état brut ; le filtrage est refait ici par sécurité.
 */
import { cardDef } from '../catalog/cards';
import type { GameEvent, PlayerId, Stance } from '../model/types';

export interface AiMemory {
  /** Identités observées dans la main adverse et non encore vues la quitter. */
  knownOppHand: string[];
  /** Historique des modes de Primaire adverses révélés (public). */
  oppStances: Stance[];
  /** Nombre d’Interférences adverses observées (public). */
  oppInterferences: number;
  /** Nombre d’événements lus (QA). */
  observed: number;
}

export function emptyMemory(): AiMemory {
  return { knownOppHand: [], oppStances: [], oppInterferences: 0, observed: 0 };
}

export function buildMemory(events: readonly GameEvent[], viewer: PlayerId): AiMemory {
  const opp: PlayerId = viewer === 'p1' ? 'p2' : 'p1';
  const m = emptyMemory();
  const known = new Map<string, number>();
  const add = (defId: string) => { const id = cardDef(defId).identity; known.set(id, (known.get(id) ?? 0) + 1); };
  const remove = (defId: string | null | undefined) => {
    if (!defId) return;
    const id = cardDef(defId).identity;
    if (known.has(id)) known.delete(id);
  };
  for (const e of events) {
    if (e.vis !== 'public' && e.vis !== viewer) continue; // jamais d’information privée adverse
    m.observed++;
    const d = e.data as Record<string, any>;
    switch (e.kind) {
      case 'peek':
        // Seules les observations de la MAIN adverse (Sondage, Éclaireur, Clairvoyance, Détour).
        if (d.player === viewer && !d.own && ['Sondage', 'Éclaireur', 'Clairvoyance voilée', 'Détour'].includes(d.source)) (d.defIds as string[]).forEach(add);
        break;
      case 'primariesRevealed':
        remove(d[opp]?.defId);
        if (d[opp]?.stance) m.oppStances.push(d[opp].stance);
        break;
      case 'secondaryRevealed':
      case 'replaced':
      case 'destination':
        if (d.player === opp) remove(d.defId);
        break;
      case 'trim':
        if (d.player === opp) (d.defIds as string[]).forEach(remove);
        break;
      case 'interference':
        if (d.player === opp) m.oppInterferences++;
        break;
    }
  }
  m.knownOppHand = [...known.keys()];
  return m;
}

/** Probabilité a priori d’un Assaut adverse (lissage de Laplace sur l’historique public). */
export function assaultPrior(m: AiMemory | null): number {
  if (!m || !m.oppStances.length) return 0.6;
  const a = m.oppStances.filter((s) => s === 'assault').length;
  return (a + 1.2) / (m.oppStances.length + 2);
}
