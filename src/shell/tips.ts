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

export interface Tip { id: string; title: string; text: string; /** M17 (B3) : la leçon qui l'explique (« Revoir en leçon »). */ lecon?: string }

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

/**
 * M17 (fiche, B3) : la première fois qu'un effet adverse change le Clash, « Ce qui vient de se passer », avec la leçon
 * qui l'explique. Faits publics de ce tour seulement (ADR 011) : une Interférence réussie du rival, sa Signature
 * annoncée, sa Dissipation, sa Rupture, un effet de ses cartes, une prolongation.
 */
const ADVERSES: Record<string, Tip> = {
  'adv-interference': { id: 'adv-interference', title: 'Ce qui vient de se passer', text: 'Le rival a Interféré : une de ses Secondaires, de Rang imprimé égal ou supérieur, a annulé un de tes soutiens. Ton Clash s’est joué sans lui.', lecon: 'interferer' },
  'adv-signature': { id: 'adv-signature', title: 'Ce qui vient de se passer', text: 'Le rival a engagé sa Signature, de Rang ∞ : elle bat toute Primaire ordinaire. Elle est annoncée dès son verrouillage ; si tu avais déjà verrouillé, tu pouvais réviser une fois.', lecon: 'signature' },
  'adv-dissipation': { id: 'adv-dissipation', title: 'Ce qui vient de se passer', text: 'Le rival a joué Dissipation : ton camouflage est levé jusqu’à la fin du tour.', lecon: 'tech-Dissipation' },
  'adv-rupture': { id: 'adv-rupture', title: 'Ce qui vient de se passer', text: 'Le rival a joué Rupture : sa Garde a gagné, et ta Secondaire active est retournée dans ta main.', lecon: 'tech-Rupture' },
  'adv-effet': { id: 'adv-effet', title: 'Ce qui vient de se passer', text: 'Un effet d’une carte du rival a joué : il est montré au centre de l’écran, et le journal du duel le garde.', lecon: 'effets' },
  'adv-prolongation': { id: 'adv-prolongation', title: 'Ce qui vient de se passer', text: 'Double K.-O. : vous êtes tombés ensemble. Personne ne perd : prolongation, 1 PV chacun.', lecon: 'prolongation' },
};

function adverse(c: Controller, seen: readonly string[]): Tip | null {
  const turn = c.view.turn;
  const evs = visibleEvents(c.match.events, 'p1').filter((e) => e.turn === turn);
  const lui = (e: { data: Record<string, unknown> }) => e.data.player === 'p2';
  const ids: string[] = [];
  if (evs.some((e) => e.kind === 'overtime')) ids.push('adv-prolongation');
  if (evs.some((e) => e.kind === 'signatureAnnounced' && lui(e))) ids.push('adv-signature');
  if (evs.some((e) => e.kind === 'interference' && lui(e) && e.data.success === true)) ids.push('adv-interference');
  if (evs.some((e) => e.kind === 'dissipation' && lui(e))) ids.push('adv-dissipation');
  if (evs.some((e) => e.kind === 'effect' && lui(e) && e.data.effect === 'rupture' && e.data.status === 'success')) ids.push('adv-rupture');
  if (evs.some((e) => e.kind === 'effect' && lui(e) && e.data.status === 'success' && e.data.effect !== 'rupture' && !e.data.technique)) ids.push('adv-effet');
  const id = ids.find((x) => !seen.includes(x));
  return id ? ADVERSES[id]! : null;
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
    const adv = adverse(c, seen);
    if (adv) return adv;
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

export const TIP_IDS = [...Object.keys(TIPS), ...Object.keys(ADVERSES)];
