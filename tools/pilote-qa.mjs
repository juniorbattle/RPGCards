// Décisions du pilote de QA (T1 de la fiche de l'avenant 08, M10-F ; outil de QA seulement : ni règle, ni IA du rival, ni
// calibrage ne changent). Depuis les avenants 07 et 08, l'ancien pilote (la plus forte carte, donc la Signature, annoncée
// au rival qui révise ; Garde un tour sur trois ; toutes les Secondaires engagées) ne gagnait plus la série du Tournoi du
// Quai. Pour l'engagement, la révision et les choix tactiques, le pilote demande désormais l'IA « équilibré » du jeu
// (`decide`, profil `equilibre`) sur la vue AUTORISÉE du joueur : sa projection `viewFor(state, 'p1')` et sa mémoire tirée
// des seuls événements que son siège peut voir (`visibleEvents`). Elle garde la Signature tant qu'elle ne vaut pas son
// coût et tire son mode avec sa graine propre, fixée par la graine du duel : le pilote reste rejouable. La décision est
// prise ici, dans Node, puis jouée par l'interface (`duel-driver.mjs`) ; la page n'expose rien de plus.
// Mesure : `npx tsx tools/t1-pilote.ts` (moteur pur, mêmes décisions).
import { tsImport } from 'tsx/esm/api';

export const isSig = (defId) => defId.startsWith('sig-');
export const rankOf = (defId) => (isSig(defId) ? 5 : Number(defId.split('-')[1]));

/** Graine de l'IA du joueur : celle que `autoplay` donne à p1 (`seed ^ 0x51`). */
export const graineIa = (v) => v.seed ^ 0x51;

/** Cartes de la main à défausser au début du tour : les plus faibles (jamais la Signature tant qu'il en reste d'autres). */
export function aDefausser(v) {
  const hand = v.me.hand ?? [];
  const excess = Math.max(0, hand.length - 4);
  return [...hand].sort((a, b) => rankOf(a.defId) - rankOf(b.defId)).slice(0, excess).map((c) => c.cardId);
}

/** Carte placée sous la pioche par Recentrage : la plus faible de la main. */
export function aRecentrer(v) {
  return [...(v.me.hand ?? [])].sort((a, b) => rankOf(a.defId) - rankOf(b.defId))[0]?.cardId ?? null;
}

let ia = null;
async function chargerIa() {
  ia ??= Promise.all([
    tsImport('../src/game/ai/policy.ts', import.meta.url),
    tsImport('../src/game/ai/memory.ts', import.meta.url),
    tsImport('../src/game/visibility/view.ts', import.meta.url),
  ]).then(([policy, memory, vis]) => ({ decide: policy.decide, profil: policy.PROFILES.equilibre, buildMemory: memory.buildMemory, visibleEvents: vis.visibleEvents }));
  return ia;
}

/**
 * Commande de l'IA du joueur pour la décision en cours (`v` : vue de p1 ; `events` : journal complet du duel, filtré ici
 * sur ce que p1 a le droit de voir avant d'en tirer la mémoire).
 */
export async function decisionIa(v, events) {
  const { decide, profil, buildMemory, visibleEvents } = await chargerIa();
  // Build d'avant l'avenant 08 (contrôles de migration) : sa vue n'a ni annonce ni révision.
  const vue = v.reveal?.signatures ? v : { ...v, reveal: { ...v.reveal, signatures: { me: null, opp: null } }, revision: v.revision ?? null };
  return decide(vue, profil, graineIa(v), buildMemory(visibleEvents(events, 'p1'), 'p1'));
}
