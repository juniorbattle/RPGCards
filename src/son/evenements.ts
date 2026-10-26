/**
 * M11-E — correspondance PURE « événements du moteur → sons » (`docs/m11/06_SON.md`, §2) : un son ne joue que sur un
 * événement public ou privé du joueur (`viewer`) ; jamais sur un événement privé de l'adversaire (ADR 011).
 */
import type { GameEvent, PlayerId } from '../game/model/types';

export type SonId =
  | 'ui' | 'ui-retour' | 'carte-pose' | 'revelation' | 'clash' | 'degats' | 'degats-adverse' | 'garde' | 'interference'
  | 'signature' | 'victoire' | 'defaite' | 'pas' | 'repere' | 'rival' | 'voyage' | 'gain' | 'titre';
export type AmbianceId = 'amb-quai' | 'amb-ruelles' | 'amb-parvis' | 'amb-cour' | 'amb-port' | 'amb-haute' | 'amb-duel';

export function sonsDuDuel(events: readonly GameEvent[], viewer: PlayerId = 'p1'): SonId[] {
  const out: SonId[] = [];
  for (const e of events) {
    if (e.vis !== 'public' && e.vis !== viewer) continue;
    const d = e.data as Record<string, unknown>;
    switch (e.kind) {
      case 'committed':
        if (e.vis === 'public' && d.player === viewer) out.push('carte-pose');
        break;
      case 'signatureAnnounced':
        if (e.vis === 'public') out.push('signature');
        break;
      case 'primariesRevealed':
        if (e.vis === 'public') out.push('revelation');
        break;
      case 'interference':
        if (e.vis === 'public' && d.success) out.push('interference');
        break;
      case 'clash':
        if (e.vis === 'public') {
          out.push('clash');
          if (d.guardWin || (typeof d.absorbed === 'number' && d.absorbed > 0)) out.push('garde');
        }
        break;
      case 'damage':
        if (e.vis === 'public' && typeof d.amount === 'number' && d.amount > 0) out.push(d.player === viewer ? 'degats' : 'degats-adverse');
        break;
      case 'victory':
        if (e.vis === 'public') out.push(d.winner === viewer ? 'victoire' : 'defaite');
        break;
    }
  }
  return out;
}

/** Ambiance d'un îlot de la ville. */
export const ambianceIlot = (ilot: string): AmbianceId => (({ quai: 'amb-quai', ruelles: 'amb-ruelles', parvis: 'amb-parvis', cour: 'amb-cour', port: 'amb-port', haute: 'amb-haute' } as Record<string, AmbianceId>)[ilot] ?? 'amb-quai');
