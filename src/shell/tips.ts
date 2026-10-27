/**
 * Conseils contextuels du duel (M04) — non intrusifs : un seul à la fois, au-dessus des commandes,
 * fermé par « Compris » (mémorisé dans la sauvegarde) ; désactivables dans les options. Ils ne lisent
 * que ce que le joueur voit (sa vue : phase, ses propres cases, dernier rapport de Clash public ; les évènements
 * qui lui sont visibles, pour ses regards privés). M12 : cinq conseils apprennent les nouveaux signaux (RÉVÉLER,
 * ARMÉ, pastille de déclenchement, temps forts, regard privé), chacun la première fois qu'il paraît.
 */
import type { Controller } from '../app/controller';
import { cardDef, EFFECTS, INSTANT_PRIMARY_EFFECTS } from '../game/catalog/cards';
import { visibleEvents } from '../game/visibility/view';

export interface Tip { id: string; title: string; text: string }

const TIPS: Record<string, Tip> = {
  start: { id: 'start', title: 'Début de tour', text: 'Votre main se complète à 4 cartes. Sondage et Recentrage (Techniques de début) s’utilisent ici si elles sont équipées et que l’Insight suffit ; sinon, validez.' },
  prepare: { id: 'prepare', title: 'Préparation — révéler une réserve', text: 'Une Secondaire posée face cachée a fini de charger : cliquez-la pour la RÉVÉLER. Révélée, elle devient ACTIVE et pourra soutenir votre Primaire après la révélation des Primaires. Cachée, elle reste un mystère pour le rival.' },
  commit: { id: 'commit', title: 'Engagement — Primaire obligatoire', text: 'Glissez une carte sur PRIMAIRE (ou cliquez-la puis cliquez la case) et choisissez ASSAUT (A) ou GARDE (G). Facultatif : une Secondaire face cachée sur une case libre — elle CHARGE ce tour et ne sert qu’aux tours suivants.' },
  tactics: { id: 'tactics', title: 'Primaires révélées — choix secrets', text: 'Cliquez une Secondaire ACTIVE : RANG (+ priorité), DÉGÂTS (multiplie, Assaut seulement) ou INTERFÉRER (annule un soutien adverse de Rang inférieur ou égal). Le rival choisit en même temps, sans voir vos choix.' },
  resolved: { id: 'resolved', title: 'Lire le Clash', text: 'Le RANG décide qui l’emporte ; la PUISSANCE fait les dégâts. Une Garde victorieuse bloque tout ; dominée, elle absorbe la moitié de sa Puissance, mais au moins 1 dégât passe. Une Garde gagnée contre un Assaut rapporte 1 Insight.' },
  zero: { id: 'zero', title: 'Pourquoi 0 dégât ?', text: 'Victoire au Rang mais Puissance absorbée : la Garde adverse retranche la moitié de sa Puissance à la vôtre, sans jamais tout annuler (avenant 07 : ce cas n’arrive plus). Pour frapper plus fort, amplifiez les DÉGÂTS d’un Assaut.' },
  insight: { id: 'insight', title: 'Insight (0 à 2)', text: 'L’Insight paie vos deux Techniques équipées (coût 1 ou 2, une par tour). On en gagne surtout par une Garde victorieuse contre un Assaut ou une Interférence réussie (+1 par tour au plus).' },
  // M12 : les nouveaux signaux du plateau et des temps forts
  reveler: { id: 'reveler', title: 'RÉVÉLER : un effet à la révélation', text: 'Le bandeau « RÉVÉLER : … » signale une réserve dont l’effet joue au moment où vous la révélez (un regard, une pioche, un soin…). La révéler reste un choix : cachée, elle garde son mystère.' },
  arme: { id: 'arme', title: 'ARMÉ : un effet en attente', text: 'Une Primaire marquée ARMÉ porte un effet qui attend sa condition (gagner le Clash, le perdre, blesser…) : il jouera après le Clash, sauf s’il est neutralisé d’ici là. Survolez le badge pour lire l’effet.' },
  pastille: { id: 'pastille', title: 'La pastille de déclenchement', text: 'Sous la gemme de chaque carte, une pastille dit quand son effet joue : à la révélation, en Rang, en Dégâts, en Interférence… Dans le menu tactique, le mode qui déclenche l’effet porte son icône et son nom ; choisi, la pastille s’illumine.' },
  temps: { id: 'temps', title: 'Les temps forts', text: 'Au centre de l’écran, chaque effet qui s’active est montré un instant : réussi, annulé, ou de dos s’il vient d’une carte camouflée (le rival ne sait pas laquelle). « Passer » fait défiler la file d’un coup.' },
  prive: { id: 'prive', title: 'Regard privé', text: 'Une carte montrée avec la mention « PRIVÉ » n’est vue que par vous : le rival sait que vous avez regardé, pas ce que vous avez vu. Le journal du duel la garde en mémoire.' },
};

/** M12 : ce que le joueur a vu se produire ce tour (un effet ou une Technique activés, un regard privé pour lui). */
function ceTour(c: Controller): { effet: boolean; regard: boolean } {
  const turn = c.view.turn;
  const evs = visibleEvents(c.match.events, 'p1').filter((e) => e.turn === turn);
  return { effet: evs.some((e) => e.kind === 'effect' || e.kind === 'technique'), regard: evs.some((e) => e.kind === 'peek' && e.vis === 'p1') };
}

/** Conseil à montrer maintenant (le premier non lu pour cette situation), ou `null`. */
export function duelTip(c: Controller, seen: readonly string[]): Tip | null {
  const v = c.view;
  const want = (id: string) => (seen.includes(id) ? null : TIPS[id]!);
  if (v.phase === 'ENDED') return null;
  // les signaux M12 ne se cherchent qu'une fois tous lus ou non (coût : un filtre du journal par rendu)
  const m12 = M12.some((id) => !seen.includes(id)) ? ceTour(c) : { effet: false, regard: false };
  const regard = m12.regard ? want('prive') : null;
  if (v.phase === 'RESOLVED') {
    const r = v.lastClash;
    if (r?.zeroDamageRankWin) return want('zero') ?? want('resolved');
    return want('resolved') ?? (m12.effet ? want('temps') : null) ?? regard ?? (r?.guardWin ? want('insight') : null);
  }
  if (!v.awaitingMe) return null;
  if (v.phase === 'START') return want('start') ?? regard;
  if (v.phase === 'PREPARE') {
    const revele = v.me.slots.some((x) => x?.state === 'hidden' && !!x.card && triggerDe(x.card.defId) === 'secondary-reveal');
    return want('prepare') ?? (revele ? want('reveler') : null) ?? regard;
  }
  if (v.phase === 'COMMIT') return want('commit') ?? regard;
  if (v.phase === 'TACTICS') {
    const p = v.reveal.primaries;
    const arme = !!p && [p.me.defId, p.opp.defId].some((d) => { const def = cardDef(d); return !!def.effect && !INSTANT_PRIMARY_EFFECTS.has(def.effect) && EFFECTS[def.effect].trigger === 'primary-reveal'; });
    const pastille = v.me.slots.some((x) => x?.state === 'active' && !!x.card && /^use-/.test(triggerDe(x.card.defId) ?? ''));
    return want('tactics') ?? (arme ? want('arme') : null) ?? (pastille ? want('pastille') : null) ?? regard;
  }
  return regard;
}

const M12 = ['reveler', 'arme', 'pastille', 'temps', 'prive'];
const triggerDe = (defId: string): string | null => { const d = cardDef(defId); return d.effect && !d.signature ? EFFECTS[d.effect].trigger : null; };

export const TIP_IDS = Object.keys(TIPS);
