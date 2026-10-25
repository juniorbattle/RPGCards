/**
 * Conseils contextuels du duel (M04) — non intrusifs : un seul à la fois, au-dessus des commandes,
 * fermé par « Compris » (mémorisé dans la sauvegarde) ; désactivables dans les options. Ils ne lisent
 * que la vue PUBLIQUE du joueur (phase, ses propres cases, dernier rapport de Clash public).
 */
import type { Controller } from '../app/controller';

export interface Tip { id: string; title: string; text: string }

const TIPS: Record<string, Tip> = {
  start: { id: 'start', title: 'Début de tour', text: 'Votre main se complète à 4 cartes. Sondage et Recentrage (Techniques de début) s’utilisent ici si elles sont équipées et que l’Insight suffit ; sinon, validez.' },
  prepare: { id: 'prepare', title: 'Préparation — révéler une réserve', text: 'Une Secondaire posée face cachée a fini de charger : cliquez-la pour la RÉVÉLER. Révélée, elle devient ACTIVE et pourra soutenir votre Primaire après la révélation des Primaires. Cachée, elle reste un mystère pour le rival.' },
  commit: { id: 'commit', title: 'Engagement — Primaire obligatoire', text: 'Glissez une carte sur PRIMAIRE (ou cliquez-la puis cliquez la case) et choisissez ASSAUT (A) ou GARDE (G). Facultatif : une Secondaire face cachée sur une case libre — elle CHARGE ce tour et ne sert qu’aux tours suivants.' },
  tactics: { id: 'tactics', title: 'Primaires révélées — choix secrets', text: 'Cliquez une Secondaire ACTIVE : RANG (+ priorité), DÉGÂTS (multiplie, Assaut seulement) ou INTERFÉRER (annule un soutien adverse de Rang inférieur ou égal). Le rival choisit en même temps, sans voir vos choix.' },
  resolved: { id: 'resolved', title: 'Lire le Clash', text: 'Le RANG décide qui l’emporte ; la PUISSANCE fait les dégâts. Une Garde victorieuse bloque tout ; dominée, elle absorbe la moitié de sa Puissance, mais au moins 1 dégât passe. Une Garde gagnée contre un Assaut rapporte 1 Insight.' },
  zero: { id: 'zero', title: 'Pourquoi 0 dégât ?', text: 'Victoire au Rang mais Puissance absorbée : la Garde adverse retranche la moitié de sa Puissance à la vôtre, sans jamais tout annuler (avenant 07 : ce cas n’arrive plus). Pour frapper plus fort, amplifiez les DÉGÂTS d’un Assaut.' },
  insight: { id: 'insight', title: 'Insight (0 à 2)', text: 'L’Insight paie vos deux Techniques équipées (coût 1 ou 2, une par tour). On en gagne surtout par une Garde victorieuse contre un Assaut ou une Interférence réussie (+1 par tour au plus).' },
};

/** Conseil à montrer maintenant (le premier non lu pour cette situation), ou `null`. */
export function duelTip(c: Controller, seen: readonly string[]): Tip | null {
  const v = c.view;
  const want = (id: string) => (seen.includes(id) ? null : TIPS[id]!);
  if (v.phase === 'ENDED') return null;
  if (v.phase === 'RESOLVED') {
    const r = v.lastClash;
    if (r?.zeroDamageRankWin) return want('zero') ?? want('resolved');
    return want('resolved') ?? (r?.guardWin ? want('insight') : null);
  }
  if (!v.awaitingMe) return null;
  if (v.phase === 'START') return want('start');
  if (v.phase === 'PREPARE') return want('prepare');
  if (v.phase === 'COMMIT') return want('commit');
  if (v.phase === 'TACTICS') return want('tactics');
  return null;
}

export const TIP_IDS = Object.keys(TIPS);
