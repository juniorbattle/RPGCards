/**
 * IA adverse « Duelliste de quartier » — politique heuristique NON omnisciente.
 * Entrée : uniquement la `PlayerView` projetée pour son siège (aucun accès à GameState).
 * RNG propre (seed IA dérivée) : n’altère jamais la RNG gameplay ni le tirage des cartes.
 */
import { BASIC_POWER, cardDef, FAMILIES, SIGNATURES, type CardDef, type Family, type OrdinaryRank } from '../catalog/cards';
import { TECHNIQUES, type TechniqueId } from '../catalog/techniques';
import { computeClash, type ClashInput, type ClashSideInput, type ClashUse } from '../engine/clash';
import { hashString, makeRng } from '../engine/rng';
import type { PlayerCommand, SlotIndex, Stance, TacticPlan, TacticsTechnique } from '../model/types';
import type { PlayerView, SlotView } from '../visibility/view';
import { assaultPrior, type AiMemory } from './memory';

export interface AiProfile {
  name: string;
  /** Poids des dégâts infligés vs subis. */
  aggression: number;
  caution: number;
  /** Probabilité de garder une Secondaire cachée par bluff. */
  bluff: number;
  /** Probabilité d’utiliser une Technique quand elle est pertinente. */
  techniqueRate: number;
  /** Préférence de mode à l’engagement (+ = Assaut). */
  stanceBias: number;
  /** Valeur d’option d’une Secondaire conservée. */
  keepValue: number;
  /** Bonus par Interférence planifiée (profil lecteur/interférent). */
  interfereBonus: number;
  /** Poids donné aux cartes adverses observées légalement (mémoire). */
  memoryWeight: number;
}

export const PROFILES: Record<string, AiProfile> = {
  equilibre: { name: 'Équilibré', aggression: 1, caution: 0.9, bluff: 0.12, techniqueRate: 0.55, stanceBias: 0, keepValue: 1.2, interfereBonus: 0, memoryWeight: 0.4 },
  offensif: { name: 'Offensif', aggression: 1.35, caution: 0.55, bluff: 0.05, techniqueRate: 0.4, stanceBias: 4, keepValue: 0.6, interfereBonus: 0, memoryWeight: 0.3 },
  prudent: { name: 'Prudent', aggression: 0.8, caution: 1.4, bluff: 0.2, techniqueRate: 0.7, stanceBias: -3, keepValue: 2.2, interfereBonus: 0.5, memoryWeight: 0.4 },
  lecteur: { name: 'Lecteur / interférent', aggression: 1, caution: 1, bluff: 0.3, techniqueRate: 0.8, stanceBias: 0, keepValue: 1.4, interfereBonus: 3, memoryWeight: 0.75 },
  // M08 C3 — profils génériques des duellistes PNJ de la ville (difficulté basse) : mêmes règles et même vue que les
  // rivaux, mais peu de Techniques, presque pas de mémoire des cartes vues et des Secondaires moins bien gérées.
  novice: { name: 'Novice franc', aggression: 1.15, caution: 0.6, bluff: 0.03, techniqueRate: 0.2, stanceBias: 2, keepValue: 0.5, interfereBonus: 0, memoryWeight: 0.1 },
  timide: { name: 'Novice prudent', aggression: 0.85, caution: 1.15, bluff: 0.08, techniqueRate: 0.25, stanceBias: -2, keepValue: 1.6, interfereBonus: 0, memoryWeight: 0.1 },
};

const RANKS: OrdinaryRank[] = [1, 2, 3, 4];
const GENERIC_MASKED: CardDef = { defId: 'masked', identity: 'masked', family: 'Voile', rank: 2, power: 6, rarity: 'Basic', name: 'Masquée', effect: null, signature: false };

function basicDef(family: Family, rank: OrdinaryRank): CardDef {
  return cardDef(`${family}-${rank}-basic`);
}

/** Pool d’identités adverses non localisées publiquement (main + pioche + cachées), en version Basic. */
function unknownOpponentPool(view: PlayerView): CardDef[] {
  const seen = new Set<string>();
  const add = (defId: string | null | undefined) => { if (defId) seen.add(cardDef(defId).identity); };
  view.opp.discard.forEach(add);
  view.opp.slots.forEach((s) => add(s?.card?.defId));
  if (view.reveal.primaries) add(view.reveal.primaries.opp.defId);
  const pool: CardDef[] = [];
  for (const f of FAMILIES) for (const r of RANKS) if (!seen.has(`${f}-${r}`)) pool.push(basicDef(f, r));
  if (!seen.has('Signature') && view.opp.signatureFamily && SIGNATURES[view.opp.signatureFamily]) pool.push(cardDef(`sig-${view.opp.signatureFamily}`));
  return pool;
}

function canTech(view: PlayerView, t: TechniqueId): boolean {
  return view.me.techniques.includes(t) && view.me.techniqueUsed === null && view.me.insight >= TECHNIQUES[t].cost;
}

function activeDefs(slots: [SlotView | null, SlotView | null], fallbackMasked: boolean): Array<{ slot: SlotIndex; def: CardDef }> {
  const out: Array<{ slot: SlotIndex; def: CardDef }> = [];
  for (const s of slots) {
    if (!s || s.state !== 'active') continue;
    if (s.card) out.push({ slot: s.slot, def: cardDef(s.card.defId) });
    else if (fallbackMasked) out.push({ slot: s.slot, def: GENERIC_MASKED });
  }
  return out;
}

type PlanCombo = { plans: [TacticPlan | null, TacticPlan | null]; uses: ClashUse[] };

function enumeratePlans(actives: Array<{ slot: SlotIndex; def: CardDef }>, stance: Stance, oppActive: Array<{ slot: SlotIndex; def: CardDef; masked: boolean }>): PlanCombo[] {
  const perSlot = actives.map((a) => {
    const opts: Array<{ plan: TacticPlan; use: ClashUse | null }> = [{ plan: { mode: 'keep' }, use: null }];
    opts.push({ plan: { mode: 'rank' }, use: { slot: a.slot, def: a.def, mode: 'rank' } });
    if (stance === 'assault') opts.push({ plan: { mode: 'damage' }, use: { slot: a.slot, def: a.def, mode: 'damage' } });
    for (const t of oppActive) {
      if (t.masked || (a.def.rank ?? 0) >= (t.def.rank ?? 99)) opts.push({ plan: { mode: 'interfere', target: t.slot }, use: { slot: a.slot, def: a.def, mode: 'interfere', target: t.slot } });
    }
    return { slot: a.slot, opts };
  });
  let combos: PlanCombo[] = [{ plans: [null, null], uses: [] }];
  for (const ps of perSlot) {
    const next: PlanCombo[] = [];
    for (const c of combos) for (const o of ps.opts) {
      const plans: [TacticPlan | null, TacticPlan | null] = [c.plans[0], c.plans[1]];
      plans[ps.slot] = o.plan;
      next.push({ plans, uses: o.use ? [...c.uses, o.use] : c.uses });
    }
    combos = next;
  }
  return combos;
}

interface Eval { dealt: number; taken: number; guardWin: boolean; kept: number; won: boolean }

function evaluate(view: PlayerView, me: ClashSideInput, opp: ClashSideInput): Eval {
  const input: ClashInput = { p1: me, p2: opp };
  const out = computeClash(input);
  return {
    dealt: out.damage.p2,
    taken: out.damage.p1,
    guardWin: out.guardWin && out.winner === 'p1',
    won: out.winner === 'p1',
    kept: me.active.length - me.uses.length,
  };
}

function score(view: PlayerView, e: Eval, prof: AiProfile): number {
  let v = e.dealt * prof.aggression - e.taken * prof.caution;
  if (e.dealt >= view.opp.hp) v += 400;
  if (e.taken >= view.me.hp) v -= 300;
  if (e.guardWin) v += 4;
  if (e.won) v += 1.5;
  v += e.kept * prof.keepValue; // valeur d’option des Secondaires conservées
  return v;
}

function oppScenarios(oppActive: Array<{ slot: SlotIndex; def: CardDef; masked: boolean }>, oppStance: Stance): Array<{ w: number; uses: ClashUse[] }> {
  const keep = { w: 0.35, uses: [] as ClashUse[] };
  const rank = { w: 0.3, uses: oppActive.map((a) => ({ slot: a.slot, def: a.def, mode: 'rank' as const })) };
  const dmg = { w: 0.35, uses: oppActive.map((a) => ({ slot: a.slot, def: a.def, mode: oppStance === 'assault' ? ('damage' as const) : ('rank' as const) })) };
  return oppActive.length ? [keep, rank, dmg] : [{ w: 1, uses: [] }];
}

// ---------------------------------------------------------------------------

export function decide(view: PlayerView, profile: AiProfile = PROFILES.equilibre!, aiSeed = 1, memory: AiMemory | null = null): PlayerCommand | null {
  if (!view.awaitingMe) return null;
  const rng = makeRng(hashString(`${aiSeed}|${view.seed}|${view.turn}|${view.phase}|${view.me.handCount}|${view.me.insight}`));
  const pid = view.viewer;
  const hand = view.me.hand ?? [];
  const defs = hand.map((c) => ({ ...c, def: cardDef(c.defId) }));

  switch (view.phase) {
    case 'START': {
      const excess = Math.max(0, hand.length - 4);
      const sorted = [...defs].sort((a, b) => (a.def.signature ? 99 : a.def.rank!) - (b.def.signature ? 99 : b.def.rank!));
      const discard = sorted.slice(0, excess).map((c) => c.cardId);
      let technique: { id: 'Sondage' } | null = null;
      if (canTech(view, 'Sondage') && rng() < profile.techniqueRate * 0.7) technique = { id: 'Sondage' };
      return { type: 'start', player: pid, discard, technique };
    }
    case 'PREPARE': {
      const eligible = view.me.slots.filter((s): s is SlotView => !!s && s.state === 'hidden');
      const reveal = eligible.filter(() => rng() >= profile.bluff).map((s) => s.slot);
      return { type: 'prepare', player: pid, reveal };
    }
    case 'DISSIPATION': {
      const src = view.opp.slots.find((s) => s?.maskSource);
      const use = !!src && canTech(view, 'Dissipation') && rng() < profile.techniqueRate;
      return { type: 'dissipate', player: pid, targetSlot: use && src ? src.slot : null };
    }
    case 'COMMIT':
      return decideCommit(view, profile, rng, memory);
    case 'LECTURE':
      return { type: 'lecture', player: pid, use: canTech(view, 'Lecture') && rng() < profile.techniqueRate * 0.6 };
    case 'LECTURE_CHANGE': {
      const cur = view.me.primary?.stance ?? 'assault';
      const prim = view.me.primary?.card ? cardDef(view.me.primary.card.defId) : null;
      let stance: Stance = cur;
      if (view.lectureSeen === 'guard') stance = 'assault';
      else if (view.lectureSeen === 'assault' && prim && !prim.signature && (prim.rank ?? 0) <= 2) stance = 'guard';
      return { type: 'lectureStance', player: pid, stance };
    }
    case 'TACTICS':
      return decideTactics(view, profile, rng);
    case 'REPEL': {
      const choices = view.repel?.choices ?? [];
      if (!choices.length) return { type: 'repel', player: pid, targetSlot: null };
      // Préférence : carte active (Emprise) de Rang élevé, sinon la plus ancienne cachée.
      const scored = choices.map((i) => {
        const s = view.opp.slots[i]!;
        const r = s.card ? cardDef(s.card.defId).rank ?? 0 : 0;
        return { i, v: (s.state === 'active' ? 10 + r : 5) - s.placedTurn * 0.01 };
      }).sort((a, b) => b.v - a.v);
      return { type: 'repel', player: pid, targetSlot: scored[0]!.i };
    }
    default:
      return null;
  }
}

/** Valeur heuristique de conservation d’une carte en main (coût d’opportunité de la jouer). */
function cardCost(def: CardDef): number {
  if (def.signature) return 5;
  return (def.rank ?? 0) * 0.9 + (def.effect ? 0.5 : 0);
}

function decideCommit(view: PlayerView, profile: AiProfile, rng: () => number, memory: AiMemory | null): PlayerCommand {
  const pid = view.viewer;
  const hand = (view.me.hand ?? []).map((c) => ({ ...c, def: cardDef(c.defId) }));
  const myActive = activeDefs(view.me.slots, false);
  const oppActiveRaw = activeDefs(view.opp.slots, true);
  const pool = unknownOpponentPool(view);
  const samples: CardDef[] = [];
  // Mémoire autorisée : les cartes vues dans la main adverse (et non vues la quitter) pèsent davantage.
  const known = pool.filter((d) => memory?.knownOppHand.includes(d.identity));
  for (let i = 0; i < 14 && pool.length; i++) {
    const fromMemory = known.length && rng() < profile.memoryWeight;
    samples.push(fromMemory ? known[Math.floor(rng() * known.length)]! : pool[Math.floor(rng() * pool.length)]!);
  }
  const pAssault = assaultPrior(memory);
  if (!samples.length) samples.push(basicDef('Cendre', 2));

  let best: { v: number; cardId: string; stance: Stance } | null = null;
  for (const c of hand) {
    for (const stance of ['assault', 'guard'] as Stance[]) {
      let total = 0;
      for (const oppPrim of samples) {
        const oppStance: Stance = rng() < pAssault ? 'assault' : 'guard';
        const oppActive = oppActiveRaw.map((a) => ({ ...a, masked: a.def === GENERIC_MASKED }));
        // Supposition : l’adversaire engage ses actives au mieux pour lui en Rang/Dégâts.
        const oppUses: ClashUse[] = oppActive.map((a) => ({ slot: a.slot, def: a.def, mode: oppStance === 'assault' && rng() < 0.5 ? 'damage' : 'rank' }));
        const combos = enumeratePlans(myActive, stance, oppActive);
        let bestCombo = -Infinity;
        for (const combo of combos) {
          const e = evaluate(view,
            { primary: c.def, stance, active: myActive, uses: combo.uses },
            { primary: oppPrim, stance: oppStance, active: oppActive, uses: oppUses });
          bestCombo = Math.max(bestCombo, score(view, e, profile));
        }
        total += bestCombo;
      }
      const v = total / samples.length - cardCost(c.def) + rng() * 1.5 + (stance === 'assault' ? profile.stanceBias : 0);
      if (!best || v > best.v) best = { v, cardId: c.cardId, stance };
    }
  }
  const primaryId = best!.cardId;
  // Nouvelle Secondaire : carte ordinaire restante, de préférence à effet de préparation ou utile en soutien.
  const rest = hand.filter((c) => c.cardId !== primaryId && !c.def.signature);
  let secondaryId: string | null = null;
  let replaceSlot: SlotIndex | null = null;
  const free = view.me.slots.some((s) => s === null);
  if (rest.length && rng() < 0.85) {
    const ranked = rest.map((c) => ({ c, v: secondaryValue(c.def) + rng() })).sort((a, b) => b.v - a.v);
    if (free) secondaryId = ranked[0]!.c.cardId;
    else {
      // Remplacement rare : uniquement si une Secondaire cachée de faible valeur occupe la place.
      const weak = view.me.slots.map((s) => s && s.card ? { s, v: secondaryValue(cardDef(s.card.defId)) } : null)
        .filter((x): x is { s: SlotView; v: number } => !!x && x.s.state !== 'active').sort((a, b) => a.v - b.v)[0];
      if (weak && ranked[0]!.v > weak.v + 2.5) { secondaryId = ranked[0]!.c.cardId; replaceSlot = weak.s.slot; }
    }
  }
  return { type: 'commit', player: pid, primaryId, stance: best!.stance, secondaryId, replaceSlot };
}

function secondaryValue(def: CardDef): number {
  const r = def.rank ?? 0;
  const bonus: Partial<Record<string, number>> = { eclaireur: 1.5, repere: 0.8, dissimulation: 1.2, convergence: 2, prisme: 1.2, silence: 1.5, ferveur: 0.8, detour: 0.8, relance: 0.8 };
  // Les rangs moyens sont de bons soutiens ; les IV sont aussi de bonnes Primaires.
  return [0, 2.2, 2.8, 2.6, 2.0][r]! + (def.effect ? bonus[def.effect] ?? 0.3 : 0);
}

function decideTactics(view: PlayerView, profile: AiProfile, rng: () => number): PlayerCommand {
  const pid = view.viewer;
  const myPrim = cardDef(view.reveal.primaries!.me.defId);
  const myStance = view.reveal.primaries!.me.stance;
  const oppPrim = cardDef(view.reveal.primaries!.opp.defId);
  const oppStance = view.reveal.primaries!.opp.stance;
  const myActive = activeDefs(view.me.slots, false);
  const oppActive = activeDefs(view.opp.slots, true).map((a) => ({ ...a, masked: a.def === GENERIC_MASKED }));
  const combos = enumeratePlans(myActive, myStance, oppActive);
  const scen = oppScenarios(oppActive, oppStance);
  let best: { v: number; combo: PlanCombo } | null = null;
  for (const combo of combos) {
    let v = 0;
    for (const sc of scen) {
      const e = evaluate(view,
        { primary: myPrim, stance: myStance, active: myActive, uses: combo.uses },
        { primary: oppPrim, stance: oppStance, active: oppActive, uses: sc.uses });
      v += sc.w * score(view, e, profile);
    }
    v += profile.interfereBonus * combo.uses.filter((u) => u.mode === 'interfere').length;
    v += rng() * 0.6;
    if (!best || v > best.v) best = { v, combo };
  }
  const plans = best!.combo.plans;
  let technique: TacticsTechnique | null = null;
  const engaged = best!.combo.uses;
  if (engaged.length && canTech(view, 'Ancrage') && oppActive.length && rng() < profile.techniqueRate * 0.6) {
    const top = [...engaged].sort((a, b) => (b.def.rank ?? 0) - (a.def.rank ?? 0))[0]!;
    technique = { id: 'Ancrage', slot: top.slot };
  } else if (myStance === 'guard' && canTech(view, 'Rupture') && oppActive.length && rng() < profile.techniqueRate * 0.5) {
    const tgt = [...oppActive].sort((a, b) => (b.def.rank ?? 0) - (a.def.rank ?? 0))[0]!;
    technique = { id: 'Rupture', targetSlot: tgt.slot };
  }
  return { type: 'tactics', player: pid, plans, technique };
}

export { BASIC_POWER };
