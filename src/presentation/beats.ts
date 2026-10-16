/**
 * Séquenceur de résolution (mission M02 §4) — module PUR.
 * Transforme les événements DÉJÀ RÉSOLUS par le moteur (filtrés pour le spectateur) en une suite
 * de « temps » lisibles : choix révélés → Interférences → Rang → issue / absorption → dégâts →
 * conséquences (soins, effets, Insight, destinations, Repoussement) → prolongation / fin.
 * Aucun recalcul de règle : les nombres viennent des événements et du rapport public du Clash.
 */
import { cardDef, cardTitle, EFFECTS, type EffectId } from '../game/catalog/cards';
import type { ClashReport, GameEvent, PlayerId, RevealedTactic, Stance } from '../game/model/types';
import { verdictText } from '../game/visibility/journal';

export type BeatKind = 'tactics' | 'interference' | 'rank' | 'outcome' | 'damage' | 'heal' | 'effect' | 'insight' | 'destination' | 'repel' | 'overtime' | 'victory';

export interface Beat {
  kind: BeatKind;
  title: string;
  detail: string;
  tone: 'neutral' | 'good' | 'bad' | 'warn';
  /** Éléments à mettre en avant : 'me-primary', 'opp-slot-0', 'me-hp'… */
  focus: string[];
  /** Événements portés par ce temps (FX, réactions, journal au bon moment). */
  events: GameEvent[];
}

/** Ordre pédagogique des temps (le moteur reste l’ordre de vérité ; ici on présente). */
export const BEAT_ORDER: BeatKind[] = ['tactics', 'interference', 'rank', 'outcome', 'damage', 'heal', 'effect', 'insight', 'destination', 'repel', 'overtime', 'victory'];
const ORDER = BEAT_ORDER;
const MODE: Record<string, string> = { keep: 'conserve', rank: 'Rang', damage: 'Dégâts', interfere: 'Interférence' };

export interface BeatContext {
  viewer: PlayerId;
  primaries: Record<PlayerId, { defId: string; stance: Stance }> | null;
}

const otherOf = (p: PlayerId): PlayerId => (p === 'p1' ? 'p2' : 'p1');

/** Indice de début de la séquence de résolution dans un lot (événement `tacticsRevealed`), ou -1. */
export function resolutionStart(events: readonly GameEvent[]): number {
  return events.findIndex((e) => e.kind === 'tacticsRevealed' && e.vis === 'public');
}

export function buildResolutionBeats(events: readonly GameEvent[], ctx: BeatContext): Beat[] {
  const me = ctx.viewer;
  const opp = otherOf(me);
  const who = (p: unknown) => (p === me ? 'Vous' : 'Le rival');
  const side = (p: unknown) => (p === me ? 'me' : 'opp');
  const beats: Beat[] = [];
  const vis = events.filter((e) => e.vis === 'public' || e.vis === me);
  const clash = vis.find((e) => e.kind === 'clash' && e.vis === 'public');
  const report = clash ? (clash.data as unknown as ClashReport) : null;
  const tactics = vis.find((e) => e.kind === 'tacticsRevealed');

  // 1. Choix tactiques révélés
  if (tactics) {
    const d = tactics.data as Record<PlayerId, Array<RevealedTactic | null>>;
    const fmt = (p: PlayerId) => {
      const list = (d[p] ?? []).filter(Boolean) as RevealedTactic[];
      const used = list.filter((x) => x.mode !== 'keep');
      if (!list.length) return 'aucune Secondaire active';
      if (!used.length) return 'conserve tout';
      return used.map((x) => `${x.masked ? `${x.family} masquée` : cardDef(x.defId!).name} → ${MODE[x.mode]}${x.mode === 'interfere' ? ` (case ${(x.target ?? 0) + 1})` : x.value !== null ? ` ${x.mode === 'rank' ? '+' : '×'}${x.value}` : ''}`).join(', ');
    };
    beats.push({ kind: 'tactics', title: 'Choix secrets révélés', detail: `Vous : ${fmt(me)}. Rival : ${fmt(opp)}.`, tone: 'neutral', focus: ['me-slots', 'opp-slots'], events: [tactics] });
  }

  // 2. Interférences (une passe, simultanées)
  for (const e of vis.filter((x) => x.kind === 'interference')) {
    const d = e.data as Record<string, any>;
    const target = d.targetDefId ? cardDef(d.targetDefId).name : d.targetFamily ? `${d.targetFamily} masquée` : 'carte masquée';
    const ok = !!d.success;
    beats.push({
      kind: 'interference',
      title: `${who(d.player)} ${d.player === me ? 'Interférez' : 'Interfère'} sur ${target} : ${ok ? 'RÉUSSIE' : 'ÉCHEC'}`,
      detail: ok ? `Le soutien visé est ANNULÉ (il ne compte pas).${d.cancelled ? ' Cette Interférence est elle-même annulée en retour (passe simultanée unique).' : ''}` : `Sans effet : ${d.reason}.`,
      tone: ok ? (d.player === me ? 'good' : 'bad') : 'neutral',
      focus: [`${side(otherOf(d.player))}-slot-${d.target}`, `${side(d.player)}-slot-${d.slot}`],
      events: [e],
    });
  }

  if (report) {
    // 3. Rang (score de confrontation, affinité, ∞)
    const scoreParts = (p: PlayerId): string => {
      const prim = ctx.primaries?.[p];
      if (!prim) return report.publicScores[p] ?? '?';
      const def = cardDef(prim.defId);
      if (def.signature) return `∞ (${def.name}, Signature)`;
      const parts = [`${def.name} ${def.rank}`];
      const list = ((tactics?.data as Record<PlayerId, Array<RevealedTactic | null>> | undefined)?.[p] ?? []).filter(Boolean) as RevealedTactic[];
      for (const t of list) {
        if (t.mode !== 'rank') continue;
        const cancelled = report.cancelled?.[p]?.includes(t.slot);
        const name = t.masked ? `${t.family} masquée` : cardDef(t.defId!).name;
        parts.push(cancelled ? `${name} (annulé)` : `${name} +${t.value ?? '?'}${t.affinity ? ' (affinité +1)' : ''}`);
      }
      return `${report.publicScores[p]} = ${parts.join(' + ')}`;
    };
    beats.push({
      kind: 'rank',
      title: `Rang : Vous ${report.publicScores[me]} contre ${report.publicScores[opp]}`,
      detail: `Vous : ${scoreParts(me)}. Rival : ${scoreParts(opp)}. Le Rang décide la priorité ; la Puissance décide les blessures.`,
      tone: 'neutral',
      focus: ['me-primary', 'opp-primary'],
      events: [],
    });

    // 4. Issue et absorption
    const zero = report.zeroDamageRankWin;
    const w = report.winner;
    let title: string;
    if (report.outcome === 'tie-assault') title = 'Égalité de priorité : impacts simultanés';
    else if (report.outcome === 'double-guard') title = 'Deux Gardes : aucun Clash offensif';
    else if (report.guardWin) title = w === me ? 'Votre Garde tient : Assaut bloqué' : 'La Garde du rival tient : Assaut bloqué';
    else if (zero) title = w === me ? 'Vous gagnez au Rang… mais 0 blessure' : 'Le rival gagne au Rang… mais 0 blessure';
    else title = w === me ? 'Vous dominez le Clash' : 'Le rival domine le Clash';
    beats.push({
      kind: 'outcome',
      title,
      detail: zero
        ? `La Garde absorbe : Puissance ${report.powers[w!]} contre Garde ${report.powers[otherOf(w!)]} → (${report.powers[w!]} − ${report.powers[otherOf(w!)]}) ≤ 0. Victoire au Rang, aucune blessure.`
        : verdictText(report, me),
      tone: zero ? 'warn' : w === me ? 'good' : w === null ? 'neutral' : 'bad',
      focus: zero || report.guardWin ? ['me-primary', 'opp-primary'] : [w === me ? 'opp-hp' : 'me-hp'],
      events: [clash!, ...vis.filter((x) => x.kind === 'clash' && x !== clash)],
    });
  }

  // 5. Dégâts (simultanés), soins
  const dmg = vis.filter((x) => x.kind === 'damage');
  if (dmg.length) {
    const parts = dmg.map((e) => {
      const d = e.data as Record<string, any>;
      return `${who(d.player)} ${d.player === me ? 'perdez' : 'perd'} ${d.amount} PV${d.fixed ? ` (dont ${d.fixed} fixes)` : ''}`;
    });
    const mult = report ? `Multiplicateur : vous ×${report.publicMultipliers[me]}, rival ×${report.publicMultipliers[opp]}.` : '';
    beats.push({
      kind: 'damage',
      title: parts.join(' · '),
      detail: `${dmg.length > 1 ? 'Impacts simultanés. ' : ''}${mult}`,
      tone: dmg.some((e) => e.data.player === me) && dmg.length === 1 ? 'bad' : 'good',
      focus: dmg.map((e) => `${side(e.data.player)}-hp`),
      events: dmg,
    });
  }
  for (const e of vis.filter((x) => x.kind === 'heal')) {
    const d = e.data as Record<string, any>;
    beats.push({ kind: 'heal', title: `${who(d.player)} ${d.player === me ? 'récupérez' : 'récupère'} ${d.amount} PV`, detail: 'Soin appliqué après le Clash (sans dépasser le maximum).', tone: d.player === me ? 'good' : 'bad', focus: [`${side(d.player)}-hp`], events: [e] });
  }

  // 6. Effets nommés (ARMÉ → RÉUSSI / CONDITION NON REMPLIE / ANNULÉ). L’effet d’une Secondaire
  // camouflée n’a qu’une forme générique publique (ADR 011) ; son propriétaire lit la forme privée.
  const ownSlot = (x: GameEvent) => `${x.data.player}|${x.data.slot}`;
  const owned = new Set(vis.filter((x) => x.kind === 'effect' && x.data.own).map(ownSlot));
  const effects = vis.filter((x) => x.kind === 'effect' && !(x.data.masked && owned.has(ownSlot(x))));
  if (effects.length) {
    const lines = effects.map((e) => {
      const d = e.data as Record<string, any>;
      const st = d.status === 'success' ? 'RÉUSSI' : d.status === 'cancelled' ? 'ANNULÉ' : 'non rempli';
      if (d.masked) return `Effet masqué (${d.player === me ? 'vous' : 'rival'}, ${d.family}) : ${st}`;
      const name = d.technique ? String(d.effect).replace(/^./, (c: string) => c.toUpperCase()) : EFFECTS[d.effect as EffectId]?.name ?? String(d.effect);
      return `${name} (${d.own ? 'vous, masquée' : d.player === me ? 'vous' : 'rival'}) : ${st}`;
    });
    beats.push({ kind: 'effect', title: lines[0]! + (lines.length > 1 ? ` (+${lines.length - 1})` : ''), detail: lines.join(' · '), tone: 'neutral', focus: [], events: effects });
  }
  // Insight : la forme privée complète (propriétaire d’une carte masquée) remplace la forme publique.
  const insOwn = new Set(vis.filter((x) => x.kind === 'insight' && x.data.own).map((x) => x.data.player));
  const ins = vis.filter((x) => x.kind === 'insight' && x.data.gain && (x.data.own || !insOwn.has(x.data.player)));
  if (ins.length) beats.push({ kind: 'insight', title: ins.map((e) => `${who(e.data.player)} : +1 Insight`).join(' · '), detail: ins.map((e) => `${who(e.data.player)} (${(e.data.reasons as string[]).join(', ')})`).join(' · '), tone: 'neutral', focus: ins.map((e) => `${side(e.data.player)}-insight`), events: ins });

  // 7. Destinations des Secondaires engagées, Repoussement
  const dest = vis.filter((x) => x.kind === 'destination');
  if (dest.length) {
    const special = dest.filter((e) => e.data.dest !== 'discard');
    beats.push({
      kind: 'destination',
      title: `${dest.length} Secondaire(s) engagée(s) consommée(s)`,
      detail: special.length ? special.map((e) => `${e.data.defId ? cardDef(e.data.defId as string).name : 'carte masquée'} → ${e.data.dest === 'top' ? 'sommet de la pioche' : e.data.dest === 'bottom' ? 'sous la pioche' : 'reste active (Ancrage)'}`).join(' · ') : 'Toutes rejoignent leur défausse ; les Secondaires conservées restent en jeu.',
      tone: 'neutral', focus: ['me-slots', 'opp-slots'], events: dest,
    });
  }
  for (const e of vis.filter((x) => x.kind === 'repel' || x.kind === 'repelSkipped')) {
    const d = e.data as Record<string, any>;
    beats.push({ kind: 'repel', title: e.kind === 'repelSkipped' ? `${who(d.player)} renonce au Repoussement` : `Repoussement : ${d.defId ? cardTitle(cardDef(d.defId)) : 'une Secondaire cachée'} renvoyée`, detail: d.dest === 'bottom' ? 'Sous la pioche de son propriétaire.' : 'Dans la main de son propriétaire : elle devra être reposée et rechargée.', tone: 'neutral', focus: [], events: [e] });
  }

  // 8. Prolongation / fin
  for (const e of vis.filter((x) => x.kind === 'overtime')) beats.push({ kind: 'overtime', title: 'DOUBLE K.-O. — prolongation', detail: '1 PV chacun ; cartes, terrain et Insight conservés.', tone: 'warn', focus: ['me-hp', 'opp-hp'], events: [e] });
  for (const e of vis.filter((x) => x.kind === 'victory')) beats.push({ kind: 'victory', title: e.data.winner === me ? 'Victoire !' : 'Défaite', detail: e.data.winner === me ? 'Le rival tombe à 0 PV.' : 'Vous tombez à 0 PV.', tone: e.data.winner === me ? 'good' : 'bad', focus: [], events: [e] });

  // Ordre pédagogique stable (le moteur reste l’ordre de vérité ; ici on présente).
  return beats.map((b, i) => ({ b, i })).sort((x, y) => ORDER.indexOf(x.b.kind) - ORDER.indexOf(y.b.kind) || x.i - y.i).map((x) => x.b);
}

/** PV affichés AVANT la séquence (évite de « spoiler » les dégâts avant leur temps). */
export function hpBeforeSequence(events: readonly GameEvent[], finalHp: Record<PlayerId, number>): Record<PlayerId, number> {
  const hp = { ...finalHp };
  const pub = events.filter((e) => e.vis === 'public');
  for (const p of ['p1', 'p2'] as PlayerId[]) {
    const firstDmg = pub.find((e) => e.kind === 'damage' && e.data.player === p);
    if (firstDmg) { hp[p] = firstDmg.data.before as number; continue; }
    const heals = pub.filter((e) => e.kind === 'heal' && e.data.player === p).reduce((a, e) => a + (e.data.amount as number), 0);
    hp[p] = finalHp[p] - heals;
  }
  return hp;
}

/** PV affichés APRÈS un temps donné (dégâts, soins, prolongation appliqués dans l’ordre). */
export function hpAfterBeat(hp: Record<PlayerId, number>, beat: Beat): Record<PlayerId, number> {
  const out = { ...hp };
  for (const e of beat.events) {
    if (e.vis !== 'public') continue;
    if (e.kind === 'damage') out[e.data.player as PlayerId] = e.data.hp as number;
    if (e.kind === 'heal') out[e.data.player as PlayerId] = e.data.hp as number;
    if (e.kind === 'overtime') { out.p1 = 1; out.p2 = 1; }
  }
  return out;
}
