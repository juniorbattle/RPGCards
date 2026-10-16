/**
 * Calcul pur d’un Clash (§6, §7, §10.3) — sans état de partie, sans RNG.
 * Utilisé par le moteur (données réelles), l’IA et la prévisualisation UI (hypothèses
 * construites uniquement à partir d’informations autorisées).
 */
import type { CardDef, EffectId } from '../catalog/cards';
import type { PlayerId, SlotIndex, Stance, TacticMode } from '../model/types';

export interface ClashUse {
  slot: SlotIndex;
  def: CardDef;
  mode: Exclude<TacticMode, 'keep'>;
  target?: SlotIndex;
}

export interface ClashSideInput {
  primary: CardDef;
  stance: Stance;
  /** Secondaires actives au verrouillage (instantané), y compris conservées. */
  active: Array<{ slot: SlotIndex; def: CardDef }>;
  uses: ClashUse[];
  ancrageSlot?: SlotIndex | null;
  ruptureTarget?: SlotIndex | null;
}

export type ClashInput = Record<PlayerId, ClashSideInput>;

export interface UseResult extends ClashUse {
  /** Interférence : cible active, engagée et Rang imprimé suffisant (instantané). */
  success: boolean;
  /** Usage annulé par une Interférence adverse réussie. */
  cancelled: boolean;
  targetRank: number | null;
  targetEngaged: boolean;
}

export interface EffectOutcome {
  player: PlayerId;
  effect: EffectId;
  status: 'success' | 'failed' | 'cancelled';
  detail: string;
}

export interface ClashOutcome {
  uses: Record<PlayerId, UseResult[]>;
  silenced: Record<PlayerId, boolean>;
  scores: Record<PlayerId, number>; // Infinity pour une Signature
  multipliers: Record<PlayerId, number>;
  outcome: 'win' | 'tie-assault' | 'double-guard';
  winner: PlayerId | null;
  guardWin: boolean;
  /** Dégâts reçus par chaque joueur (formule de base). */
  baseDamage: Record<PlayerId, number>;
  /** Dégâts fixes reçus (Braise, Étincelle, Contrecoup). */
  fixedDamage: Record<PlayerId, number>;
  damage: Record<PlayerId, number>;
  /** Puissance absorbée par la Garde perdante (A/G), sinon 0. */
  absorbed: number;
  zeroDamageRankWin: boolean;
  heal: Record<PlayerId, number>;
  insightReasons: Record<PlayerId, string[]>;
  destinations: Record<PlayerId, Partial<Record<SlotIndex, 'discard' | 'top' | 'bottom' | 'stay'>>>;
  effects: EffectOutcome[];
  /** Repoussement potentiel du vainqueur (cibles calculées par le moteur après consommation). */
  repelRight: null | { owner: PlayerId; kind: 'basic' | 'emprise' | 'flamme'; toBottom: boolean; racine: boolean };
  /** Rupture déclarée et réclamable si aucun autre Repoussement n’est disponible. */
  ruptureClaim: null | { owner: PlayerId; target: SlotIndex };
  detourPeek: Record<PlayerId, boolean>;
}

const OPP: Record<PlayerId, PlayerId> = { p1: 'p2', p2: 'p1' };
const IDS: PlayerId[] = ['p1', 'p2'];

/** Delta V3.2 D-01 : soutien Rang = Rang imprimé + 1 si même famille que la Primaire. */
export function rankSupport(sec: CardDef, primary: CardDef): number {
  const r = sec.rank ?? 0;
  return r + (sec.family === primary.family ? 1 : 0);
}

/** §7.2 + variantes Prisme / Convergence : coefficient de dégâts d’une Secondaire. */
export function damageCoefficient(sec: CardDef, primary: CardDef): number {
  const r = sec.rank ?? 0;
  if (sec.effect === 'convergence' && sec.family !== primary.family) return 6;
  const affinity = sec.family === primary.family || sec.effect === 'prisme';
  return r + (affinity ? 1 : 0);
}

export function primaryScore(primary: CardDef, rankSupports: number[]): number {
  if (primary.signature) return Infinity;
  return (primary.rank ?? 0) + rankSupports.reduce((a, b) => a + b, 0);
}

export function computeClash(input: ClashInput): ClashOutcome {
  const uses: Record<PlayerId, UseResult[]> = { p1: [], p2: [] };
  for (const p of IDS) {
    uses[p] = input[p].uses.map((u) => ({ ...u, success: false, cancelled: false, targetRank: null, targetEngaged: false }));
  }

  // 1-2. Interférences évaluées en une passe sur l’instantané, annulations appliquées une fois.
  const cancelMarks: Array<{ player: PlayerId; slot: SlotIndex }> = [];
  for (const p of IDS) {
    const o = OPP[p];
    for (const u of uses[p]) {
      if (u.mode !== 'interfere' || u.target === undefined) continue;
      const targetActive = input[o].active.find((a) => a.slot === u.target);
      const targetUse = uses[o].find((x) => x.slot === u.target);
      u.targetRank = targetActive?.def.rank ?? null;
      u.targetEngaged = !!targetUse;
      const rankOk = !!targetActive && (u.def.rank ?? 0) >= (targetActive.def.rank ?? 99);
      u.success = !!targetActive && !!targetUse && rankOk;
      if (u.success) cancelMarks.push({ player: o, slot: u.target });
    }
  }
  for (const m of cancelMarks) {
    const u = uses[m.player].find((x) => x.slot === m.slot);
    if (u) u.cancelled = true;
  }

  // 3. Silence : neutralise l’effet de Primaire adverse encore en attente.
  const silenced: Record<PlayerId, boolean> = { p1: false, p2: false };
  for (const p of IDS) {
    silenced[OPP[p]] = uses[p].some((u) => u.def.effect === 'silence' && u.mode === 'interfere' && u.success && !u.cancelled && u.targetRank === 4);
  }

  // 4. Scores et multiplicateurs.
  const scores = { p1: 0, p2: 0 } as Record<PlayerId, number>;
  const multipliers = { p1: 1, p2: 1 } as Record<PlayerId, number>;
  for (const p of IDS) {
    const prim = input[p].primary;
    scores[p] = primaryScore(prim, uses[p].filter((u) => u.mode === 'rank' && !u.cancelled).map((u) => rankSupport(u.def, prim)));
    const coeffs = uses[p].filter((u) => u.mode === 'damage' && !u.cancelled).map((u) => damageCoefficient(u.def, prim));
    multipliers[p] = coeffs.length ? coeffs.reduce((a, b) => a + b, 0) : 1;
  }

  const s1 = input.p1.stance;
  const s2 = input.p2.stance;
  let outcome: ClashOutcome['outcome'] = 'win';
  let winner: PlayerId | null = null;
  let guardWin = false;
  const baseDamage: Record<PlayerId, number> = { p1: 0, p2: 0 };
  let absorbed = 0;

  if (s1 === 'assault' && s2 === 'assault') {
    if (scores.p1 === scores.p2) {
      outcome = 'tie-assault';
      baseDamage.p2 = input.p1.primary.power * multipliers.p1;
      baseDamage.p1 = input.p2.primary.power * multipliers.p2;
    } else {
      winner = scores.p1 > scores.p2 ? 'p1' : 'p2';
      baseDamage[OPP[winner]] = input[winner].primary.power * multipliers[winner];
    }
  } else if (s1 === 'guard' && s2 === 'guard') {
    outcome = 'double-guard';
  } else {
    const attacker: PlayerId = s1 === 'assault' ? 'p1' : 'p2';
    const defender = OPP[attacker];
    if (scores[attacker] > scores[defender]) {
      winner = attacker;
      const pa = input[attacker].primary.power;
      const pg = input[defender].primary.power;
      absorbed = Math.min(pa, pg);
      baseDamage[defender] = Math.max(0, pa - pg) * multipliers[attacker];
    } else {
      winner = defender;
      guardWin = true;
    }
  }

  // 5-6. Effets fixes après formule (Braise, Étincelle, Contrecoup), simultanés.
  const fixedDamage: Record<PlayerId, number> = { p1: 0, p2: 0 };
  const effects: EffectOutcome[] = [];
  const bothAssault = s1 === 'assault' && s2 === 'assault';
  for (const p of IDS) {
    const o = OPP[p];
    const prim = input[p].primary;
    const eff = prim.effect;
    if (eff === 'braise' && input[p].stance === 'assault') {
      if (silenced[p]) effects.push({ player: p, effect: eff, status: 'cancelled', detail: 'neutralisée par Silence' });
      else if (bothAssault && winner === p && !uses[p].some((u) => u.mode === 'damage' && !u.cancelled)) {
        fixedDamage[o] += 2;
        effects.push({ player: p, effect: eff, status: 'success', detail: '+2 dégâts fixes' });
      } else effects.push({ player: p, effect: eff, status: 'failed', detail: bothAssault && winner === p ? 'soutien Dégâts valide présent' : 'pas de victoire contre un Assaut' });
    }
    if (eff === 'contrecoup' && input[p].stance === 'assault') {
      if (silenced[p]) effects.push({ player: p, effect: eff, status: 'cancelled', detail: 'neutralisé par Silence' });
      else if (bothAssault && winner === o) {
        fixedDamage[o] += 3;
        effects.push({ player: p, effect: eff, status: 'success', detail: '3 dégâts fixes simultanés' });
      } else effects.push({ player: p, effect: eff, status: 'failed', detail: 'pas de défaite contre un Assaut' });
    }
    const etincelle = uses[p].find((u) => u.def.effect === 'etincelle' && u.mode === 'rank');
    if (etincelle && input[p].stance === 'assault') {
      if (etincelle.cancelled) effects.push({ player: p, effect: 'etincelle', status: 'cancelled', detail: 'Interférée' });
      else if (winner === p && baseDamage[o] > 0 && Number.isFinite(scores[p]) && Number.isFinite(scores[o]) && scores[p] - scores[o] === 1) {
        fixedDamage[o] += 2;
        effects.push({ player: p, effect: 'etincelle', status: 'success', detail: '+2 dégâts fixes (avance exacte de 1)' });
      } else effects.push({ player: p, effect: 'etincelle', status: 'failed', detail: 'victoire blessante avec exactement 1 point d’avance requise' });
    }
  }
  const damage: Record<PlayerId, number> = { p1: baseDamage.p1 + fixedDamage.p1, p2: baseDamage.p2 + fixedDamage.p2 };
  const zeroDamageRankWin = winner !== null && !guardWin && damage[OPP[winner]] === 0;

  // Soins, Insight, destinations.
  const heal: Record<PlayerId, number> = { p1: 0, p2: 0 };
  const insightReasons: Record<PlayerId, string[]> = { p1: [], p2: [] };
  const destinations: ClashOutcome['destinations'] = { p1: {}, p2: {} };
  const detourPeek: Record<PlayerId, boolean> = { p1: false, p2: false };

  for (const p of IDS) {
    const o = OPP[p];
    const side = input[p];
    if (guardWin && winner === p) insightReasons[p].push('Garde victorieuse');
    if (uses[p].some((u) => u.mode === 'interfere' && u.success)) insightReasons[p].push('Interférence réussie');

    for (const u of uses[p]) {
      const e = u.def.effect;
      if (e === 'ecaille' && u.mode === 'rank' && side.stance === 'guard') {
        if (u.cancelled) effects.push({ player: p, effect: e, status: 'cancelled', detail: 'Interférée' });
        else if (guardWin && winner === p) { heal[p] += 2; effects.push({ player: p, effect: e, status: 'success', detail: 'soin 2 PV' }); }
        else effects.push({ player: p, effect: e, status: 'failed', detail: 'la Garde ne gagne pas' });
      }
      if (e === 'ferveur' && u.mode === 'damage') {
        if (u.cancelled) effects.push({ player: p, effect: e, status: 'cancelled', detail: 'Interférée' });
        else if (winner === p && side.primary.family === 'Cendre' && damage[o] > 0) { insightReasons[p].push('Ferveur'); effects.push({ player: p, effect: e, status: 'success', detail: '+1 Insight (sous limite)' }); }
        else effects.push({ player: p, effect: e, status: 'failed', detail: 'Primaire Cendre gagnante et blessante requise' });
      }
      if (e === 'detour' && u.mode === 'interfere') {
        if (u.success && !u.cancelled) { detourPeek[p] = true; effects.push({ player: p, effect: e, status: 'success', detail: 'observe une carte de main adverse' }); }
        else effects.push({ player: p, effect: e, status: u.cancelled ? 'cancelled' : 'failed', detail: u.cancelled ? 'annulée' : 'Interférence sans succès' });
      }
      if (e === 'silence' && u.mode === 'interfere') {
        if (silenced[o]) effects.push({ player: p, effect: e, status: 'success', detail: 'effet de Primaire adverse en attente neutralisé' });
        else effects.push({ player: p, effect: e, status: u.cancelled ? 'cancelled' : 'failed', detail: u.cancelled ? 'annulée' : 'succès contre une Secondaire de Rang IV requis' });
      }
    }

    // Destinations : Ancrage (carte annulée) > effet propre > Signature > défausse.
    const valid = uses[p].filter((u) => !u.cancelled);
    const cycleOk = side.primary.effect === 'cycle' && !silenced[p] && winner === p && valid.length === 1 &&
      (valid[0]!.mode === 'damage' || (valid[0]!.mode === 'interfere' && valid[0]!.success));
    if (side.primary.effect === 'cycle') {
      effects.push({ player: p, effect: 'cycle', status: silenced[p] ? 'cancelled' : cycleOk ? 'success' : 'failed', detail: silenced[p] ? 'neutralisé par Silence' : cycleOk ? 'soutien replacé au sommet de la pioche' : 'victoire avec exactement un soutien valide requise' });
    }
    for (const u of uses[p]) {
      let dest: 'discard' | 'top' | 'bottom' | 'stay' = 'discard';
      if (side.ancrageSlot === u.slot && u.cancelled) dest = 'stay';
      else if (u.def.effect === 'tenacite' && u.mode === 'rank' && !u.cancelled && side.stance === 'guard' && winner === o) {
        dest = 'bottom';
        effects.push({ player: p, effect: 'tenacite', status: 'success', detail: 'retour sous la pioche' });
      } else if (u.def.effect === 'relance' && u.mode === 'interfere' && u.success && !u.cancelled && u.targetRank === 3) {
        dest = 'top';
        effects.push({ player: p, effect: 'relance', status: 'success', detail: 'retour au sommet de la pioche' });
      } else if (cycleOk && u === valid[0]) dest = 'top';
      destinations[p][u.slot] = dest;
    }
  }

  // Repoussement (un seul au maximum) : droits calculés ici, cibles après consommation.
  let repelRight: ClashOutcome['repelRight'] = null;
  let ruptureClaim: ClashOutcome['ruptureClaim'] = null;
  if (winner) {
    const w = winner;
    const side = input[w];
    const racine = uses[w].some((u) => u.def.effect === 'racine' && u.mode === 'rank' && !u.cancelled);
    if (guardWin) {
      if (side.primary.effect === 'emprise' && !silenced[w]) repelRight = { owner: w, kind: 'emprise', toBottom: false, racine };
      else repelRight = { owner: w, kind: 'basic', toBottom: side.primary.effect === 'entrave' && !silenced[w], racine };
      if (side.ruptureTarget !== undefined && side.ruptureTarget !== null) ruptureClaim = { owner: w, target: side.ruptureTarget };
    } else if (side.stance === 'assault' && side.primary.effect === 'flamme' && !silenced[w] && damage[OPP[w]] > 0 &&
      uses[w].some((u) => u.mode === 'damage' && !u.cancelled)) {
      repelRight = { owner: w, kind: 'flamme', toBottom: false, racine: false };
    }
  }
  for (const p of IDS) {
    const eff = input[p].primary.effect;
    if (eff === 'flamme' && !(repelRight?.kind === 'flamme' && repelRight.owner === p)) {
      effects.push({ player: p, effect: eff, status: silenced[p] ? 'cancelled' : 'failed', detail: silenced[p] ? 'neutralisée par Silence' : 'victoire en Assaut blessante avec soutien Dégâts valide requise' });
    }
    if (eff === 'emprise' && !(repelRight?.kind === 'emprise' && repelRight.owner === p)) {
      effects.push({ player: p, effect: eff, status: silenced[p] ? 'cancelled' : 'failed', detail: silenced[p] ? 'neutralisée par Silence' : 'Garde victorieuse requise' });
    }
    if (eff === 'entrave' && input[p].stance === 'guard' && silenced[p]) {
      effects.push({ player: p, effect: eff, status: 'cancelled', detail: 'neutralisée par Silence' });
    }
  }

  return {
    uses, silenced, scores, multipliers, outcome, winner, guardWin, baseDamage, fixedDamage, damage,
    absorbed, zeroDamageRankWin, heal, insightReasons, destinations, effects, repelRight, ruptureClaim, detourPeek,
  };
}
