/**
 * Calcul pur d’un Clash (§6, §7, §10.3) — sans état de partie, sans RNG.
 * Utilisé par le moteur (données réelles), l’IA et la prévisualisation UI (hypothèses
 * construites uniquement à partir d’informations autorisées).
 */
import { EFFECTS, type CardDef, type EffectId } from '../catalog/cards';
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
  /** Avenant 09 : la cible était protégée (Leurre engagée en Rang). */
  targetProtected?: boolean;
}

/**
 * Origine typée d’un effet (ADR 011) : l’effet propre de la Primaire (publique après révélation) ou
 * l’effet d’utilisation d’une Secondaire engagée, repérée par sa case. Sert à décider, au moment de
 * la publication, si la source était camouflée — jamais par rapprochement de noms.
 */
export type EffectSource = { kind: 'primary' } | { kind: 'secondary'; slot: SlotIndex };

/**
 * Conséquence d’un effet RÉUSSI, telle qu’elle s’observe dans l’état public : dégâts fixes, soin,
 * Insight, destination de la carte, neutralisation d’un effet de Primaire, ou rien de public (`peek`).
 */
export type EffectConsequence =
  | { kind: 'fixed-damage'; amount: number; self?: boolean }
  | { kind: 'heal' }
  | { kind: 'insight' }
  | { kind: 'destination'; dest: 'top' | 'bottom' | 'stay' }
  | { kind: 'neutralize' }
  | { kind: 'peek' }
  // avenant 09 : absorption de la Garde modifiée (Percée, Fournaise), Insight retiré à l'adversaire (Éclipse), bonus
  // caché dans un score déjà masqué (Harmonie, Constellation)
  | { kind: 'absorption' }
  | { kind: 'insight-drain' }
  | { kind: 'none' };

export interface EffectOutcome {
  player: PlayerId;
  effect: EffectId;
  status: 'success' | 'failed' | 'cancelled';
  detail: string;
  source: EffectSource;
  consequence?: EffectConsequence;
  /** Effet de Primaire neutralisé par Silence : case de la Secondaire adverse qui l’a neutralisé. */
  silencedBy?: { player: PlayerId; slot: SlotIndex };
}

/** Motif d’un gain d’Insight : naturel (Garde victorieuse, Interférence réussie) ou effet de carte. */
export type InsightSource =
  | { kind: 'guard-win' }
  | { kind: 'interference' }
  /** `slot` : Secondaire engagée ; `null` : effet de la Primaire (Solstice, avenant 09). */
  | { kind: 'effect'; effect: EffectId; slot: SlotIndex | null };

/** Libellé public ou privé d’un motif d’Insight (« Garde victorieuse », « Ferveur »…). */
export function insightLabel(x: InsightSource): string {
  return x.kind === 'guard-win' ? 'Garde victorieuse' : x.kind === 'interference' ? 'Interférence réussie' : EFFECTS[x.effect].name;
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
  /** Absorption effective de la Garde perdante (A/G, avenant 07 : `guardAbsorption`), sinon 0. */
  absorbed: number;
  zeroDamageRankWin: boolean;
  heal: Record<PlayerId, number>;
  /** Libellés des motifs d’Insight (dérivés de `insightSources`). */
  insightReasons: Record<PlayerId, string[]>;
  insightSources: Record<PlayerId, InsightSource[]>;
  destinations: Record<PlayerId, Partial<Record<SlotIndex, 'discard' | 'top' | 'bottom' | 'stay'>>>;
  effects: EffectOutcome[];
  /** Repoussement potentiel du vainqueur (cibles calculées par le moteur après consommation). */
  repelRight: null | { owner: PlayerId; kind: 'basic' | 'emprise' | 'flamme'; toBottom: boolean; racine: boolean };
  /** Rupture déclarée et réclamable si aucun autre Repoussement n’est disponible. */
  ruptureClaim: null | { owner: PlayerId; target: SlotIndex };
  detourPeek: Record<PlayerId, boolean>;
  /** Avenant 09 : regards privés après le Clash (Écho, Fil d'ombre : main adverse ; Murmure : sommet de la pioche adverse). */
  peeks: Record<PlayerId, Array<{ effect: EffectId; what: 'hand' | 'deck-top' }>>;
  /** Avenant 09 : Insight retiré de la réserve (Éclipse adverse). */
  insightDrain: Record<PlayerId, number>;
  /** Avenant 09 : la Primaire retourne en main au lieu de la défausse (Phénix, Racines profondes). */
  primaryToHand: Record<PlayerId, boolean>;
}

const OPP: Record<PlayerId, PlayerId> = { p1: 'p2', p2: 'p1' };
const IDS: PlayerId[] = ['p1', 'p2'];

/** Delta V3.2 D-01 : soutien Rang = Rang imprimé + 1 si même famille que la Primaire (avenant M10-A, AV-02 : l’affinité
 *  exige une famille ; jamais pour une carte neutre). */
export function rankSupport(sec: CardDef, primary: CardDef): number {
  const r = sec.rank ?? 0;
  return r + (sec.family !== null && sec.family === primary.family ? 1 : 0);
}

/** §7.2 + variantes Prisme / Convergence : coefficient de dégâts d’une Secondaire (AV-02 : Prisme garde son +1 et
 *  Convergence compte une Primaire neutre comme « d’une autre famille »). */
export function damageCoefficient(sec: CardDef, primary: CardDef): number {
  const r = sec.rank ?? 0;
  if (sec.effect === 'convergence' && sec.family !== primary.family) return 6;
  const affinity = (sec.family !== null && sec.family === primary.family) || sec.effect === 'prisme';
  return r + (affinity ? 1 : 0);
}

/** Avenant 09 : l'autre soutien engagé (Rang ou Dégâts), non annulé, est d'une autre famille (Harmonie, Constellation). */
function otherFamilySupport(u: ClashUse, valid: readonly ClashUse[]): boolean {
  return valid.some((x) => x.slot !== u.slot && (x.mode === 'rank' || x.mode === 'damage') && x.def.family !== u.def.family);
}

/** Avenant 09 : bonus d'un soutien Rang au-delà de `rankSupport` (`valid` : usages non annulés du propriétaire). */
export function rankBonus(u: ClashUse, side: Pick<ClashSideInput, 'primary' | 'stance'>, valid: readonly ClashUse[]): number {
  switch (u.def.effect) {
    case 'boussole': return u.def.family !== side.primary.family ? 1 : 0; // affinité avec toute famille, sans double +1
    case 'surenchere': return 2;
    case 'mur': return side.stance === 'guard' ? 2 : 0;
    case 'zenith': return u.def.family !== side.primary.family ? 1 : 0;
    case 'harmonie': return otherFamilySupport(u, valid) ? 2 : 0;
    default: return 0;
  }
}

/** Avenant 09 : bonus d'un soutien Dégâts au-delà de `damageCoefficient` (Tison, Constellation). */
export function damageBonus(u: ClashUse, side: Pick<ClashSideInput, 'primary' | 'stance'>, valid: readonly ClashUse[]): number {
  switch (u.def.effect) {
    case 'tison': return side.stance === 'assault' ? 1 : 0;
    case 'constellation': return otherFamilySupport(u, valid) ? 1 : 0;
    default: return 0;
  }
}

/** Avenant 07 (V3.3) : une Garde dominée absorbe la moitié de sa Puissance imprimée, arrondie au supérieur. */
export function guardHalf(guardPower: number): number {
  return Math.ceil(guardPower / 2);
}

/** Avenant 07 (V3.3, G-02) : absorption effective d’une Garde dominée par un Assaut, plafonnée à `P_Assaut − 1` (tout
 *  Assaut victorieux inflige au moins 1 dégât de base avant le multiplicateur). Puissances imprimées seulement. */
export function guardAbsorption(assaultPower: number, guardPower: number): number {
  return Math.min(guardHalf(guardPower), assaultPower - 1);
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
      // avenant 09 : Contre-jour réussit aussi contre un Rang imprimé supérieur d'un cran
      const rankOk = !!targetActive && (u.def.rank ?? 0) + (u.def.effect === 'contrejour' ? 1 : 0) >= (targetActive.def.rank ?? 99);
      // avenant 09 : Leurre engagée en Rang déjoue toute Interférence dirigée contre elle
      u.targetProtected = !!targetUse && targetUse.def.effect === 'leurre' && targetUse.mode === 'rank';
      u.success = !!targetActive && !!targetUse && rankOk && !u.targetProtected;
      if (u.success) cancelMarks.push({ player: o, slot: u.target });
    }
  }
  for (const m of cancelMarks) {
    const u = uses[m.player].find((x) => x.slot === m.slot);
    if (u) u.cancelled = true;
  }

  // 3. Silence : neutralise l’effet de Primaire adverse encore en attente.
  const silenced: Record<PlayerId, boolean> = { p1: false, p2: false };
  const silencer: Record<PlayerId, { player: PlayerId; slot: SlotIndex } | undefined> = { p1: undefined, p2: undefined };
  for (const p of IDS) {
    const s = uses[p].find((u) => u.def.effect === 'silence' && u.mode === 'interfere' && u.success && !u.cancelled && u.targetRank === 4);
    silenced[OPP[p]] = !!s;
    if (s) silencer[OPP[p]] = { player: p, slot: s.slot };
  }

  // 4. Scores et multiplicateurs.
  const scores = { p1: 0, p2: 0 } as Record<PlayerId, number>;
  const multipliers = { p1: 1, p2: 1 } as Record<PlayerId, number>;
  for (const p of IDS) {
    const prim = input[p].primary;
    const valid = uses[p].filter((u) => !u.cancelled);
    scores[p] = primaryScore(prim, valid.filter((u) => u.mode === 'rank').map((u) => rankSupport(u.def, prim) + rankBonus(u, input[p], valid)));
    const coeffs = valid.filter((u) => u.mode === 'damage').map((u) => damageCoefficient(u.def, prim) + damageBonus(u, input[p], valid));
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
      // avenant 09 : Rempart (trois quarts) et Fournaise (quart) modifient la part absorbée ; Percée en retire 2
      const quart = uses[attacker].some((u) => u.def.effect === 'fournaise' && u.mode === 'damage' && !u.cancelled);
      const troisQuarts = input[defender].primary.effect === 'rempart' && !silenced[defender];
      absorbed = quart === troisQuarts ? guardAbsorption(pa, pg) : Math.min(Math.ceil((quart ? 1 : 3) * pg / 4), pa - 1);
      if (uses[attacker].some((u) => u.def.effect === 'percee' && u.mode === 'rank' && !u.cancelled)) absorbed = Math.max(0, absorbed - 2);
      baseDamage[defender] = (pa - absorbed) * multipliers[attacker];
    } else {
      winner = defender;
      guardWin = true;
    }
  }

  const effects: EffectOutcome[] = [];
  const PRIMARY: EffectSource = { kind: 'primary' };
  const sec = (u: ClashUse): EffectSource => ({ kind: 'secondary', slot: u.slot });
  const muted = (p: PlayerId) => (silencer[p] ? { silencedBy: silencer[p] } : {});

  // Avenant 09 : Équinoxe gagne une égalité A/A (sauf contre une autre Équinoxe) ; les dégâts adverses ne s'appliquent pas.
  if (s1 === 'assault' && s2 === 'assault') {
    const eq = IDS.filter((p) => input[p].primary.effect === 'equinoxe');
    for (const p of eq) {
      const solo = eq.length === 1;
      if (silenced[p]) effects.push({ player: p, effect: 'equinoxe', status: 'cancelled', detail: 'neutralisée par Silence', source: PRIMARY, ...muted(p) });
      else if (outcome === 'tie-assault' && solo) {
        outcome = 'win';
        winner = p;
        baseDamage[p] = 0;
        effects.push({ player: p, effect: 'equinoxe', status: 'success', detail: 'gagne l’égalité : les dégâts adverses ne s’appliquent pas', source: PRIMARY });
      } else effects.push({ player: p, effect: 'equinoxe', status: 'failed', detail: outcome === 'tie-assault' ? 'égalité contre une autre Équinoxe' : 'pas d’égalité de score', source: PRIMARY });
    }
  }
  // Avenant 09 : effets sur l'absorption de la Garde (le calcul est fait plus haut), annoncés ici.
  if (s1 !== s2) {
    const attacker: PlayerId = s1 === 'assault' ? 'p1' : 'p2';
    const defender = OPP[attacker];
    const dominated = winner === attacker;
    for (const u of uses[attacker]) {
      const e = u.def.effect;
      if ((e === 'percee' && u.mode === 'rank') || (e === 'fournaise' && u.mode === 'damage')) {
        if (u.cancelled) effects.push({ player: attacker, effect: e, status: 'cancelled', detail: 'Interférée', source: sec(u) });
        else if (dominated) effects.push({ player: attacker, effect: e, status: 'success', detail: e === 'percee' ? 'la Garde absorbe 2 de moins' : 'la Garde n’absorbe que le quart de sa Puissance', source: sec(u), consequence: { kind: 'absorption' } });
        else effects.push({ player: attacker, effect: e, status: 'failed', detail: 'victoire en Assaut contre une Garde requise', source: sec(u) });
      }
    }
    if (input[defender].primary.effect === 'rempart') {
      if (silenced[defender]) effects.push({ player: defender, effect: 'rempart', status: 'cancelled', detail: 'neutralisé par Silence', source: PRIMARY, ...muted(defender) });
      else effects.push({ player: defender, effect: 'rempart', status: dominated ? 'success' : 'failed', detail: dominated ? 'la Garde dominée absorbe les trois quarts de sa Puissance' : 'la Garde n’est pas dominée', source: PRIMARY });
    }
  } else {
    for (const p of IDS) {
      if (input[p].primary.effect === 'rempart' && input[p].stance === 'guard') effects.push({ player: p, effect: 'rempart', status: silenced[p] ? 'cancelled' : 'failed', detail: silenced[p] ? 'neutralisé par Silence' : 'aucun Assaut à absorber', source: PRIMARY, ...(silenced[p] ? muted(p) : {}) });
    }
  }

  // 5-6. Effets fixes après formule (Braise, Étincelle, Contrecoup ; avenant 09 : Tison, Surenchère, Brûlure, Épine,
  // Herse), simultanés.
  const fixedDamage: Record<PlayerId, number> = { p1: 0, p2: 0 };
  const bothAssault = s1 === 'assault' && s2 === 'assault';
  for (const p of IDS) {
    const o = OPP[p];
    const prim = input[p].primary;
    const eff = prim.effect;
    if (eff === 'braise' && input[p].stance === 'assault') {
      if (silenced[p]) effects.push({ player: p, effect: eff, status: 'cancelled', detail: 'neutralisée par Silence', source: PRIMARY, ...muted(p) });
      else if (bothAssault && winner === p && !uses[p].some((u) => u.mode === 'damage' && !u.cancelled)) {
        fixedDamage[o] += 2;
        effects.push({ player: p, effect: eff, status: 'success', detail: '+2 dégâts fixes', source: PRIMARY });
      } else effects.push({ player: p, effect: eff, status: 'failed', detail: bothAssault && winner === p ? 'soutien Dégâts valide présent' : 'pas de victoire contre un Assaut', source: PRIMARY });
    }
    if (eff === 'contrecoup' && input[p].stance === 'assault') {
      if (silenced[p]) effects.push({ player: p, effect: eff, status: 'cancelled', detail: 'neutralisé par Silence', source: PRIMARY, ...muted(p) });
      else if (bothAssault && winner === o) {
        fixedDamage[o] += 3;
        effects.push({ player: p, effect: eff, status: 'success', detail: '3 dégâts fixes simultanés', source: PRIMARY });
      } else effects.push({ player: p, effect: eff, status: 'failed', detail: 'pas de défaite contre un Assaut', source: PRIMARY });
    }
    const etincelle = uses[p].find((u) => u.def.effect === 'etincelle' && u.mode === 'rank');
    if (etincelle && input[p].stance === 'assault') {
      if (etincelle.cancelled) effects.push({ player: p, effect: 'etincelle', status: 'cancelled', detail: 'Interférée', source: sec(etincelle) });
      else if (winner === p && baseDamage[o] > 0 && Number.isFinite(scores[p]) && Number.isFinite(scores[o]) && scores[p] - scores[o] === 1) {
        fixedDamage[o] += 2;
        effects.push({ player: p, effect: 'etincelle', status: 'success', detail: '+2 dégâts fixes (avance exacte de 1)', source: sec(etincelle), consequence: { kind: 'fixed-damage', amount: 2 } });
      } else effects.push({ player: p, effect: 'etincelle', status: 'failed', detail: 'victoire blessante avec exactement 1 point d’avance requise', source: sec(etincelle) });
    }
    // Avenant 09 : le prix d'une défaite (Tison, Surenchère), la brûlure d'une Interférence, les épines d'une Garde.
    for (const u of uses[p]) {
      const e = u.def.effect;
      if ((e === 'tison' && u.mode === 'damage') || (e === 'surenchere' && u.mode === 'rank')) {
        const n = e === 'tison' ? 2 : 3;
        if (u.cancelled) effects.push({ player: p, effect: e, status: 'cancelled', detail: 'Interférée', source: sec(u) });
        else if (winner === o) {
          fixedDamage[p] += n;
          effects.push({ player: p, effect: e, status: 'success', detail: `Primaire battue : ${n} dégâts fixes subis par son propriétaire`, source: sec(u), consequence: { kind: 'fixed-damage', amount: n, self: true } });
        }
      }
      if (e === 'brulure' && u.mode === 'interfere') {
        if (u.success && !u.cancelled) {
          fixedDamage[o] += 2;
          effects.push({ player: p, effect: e, status: 'success', detail: '+2 dégâts fixes à l’adversaire', source: sec(u), consequence: { kind: 'fixed-damage', amount: 2 } });
        } else effects.push({ player: p, effect: e, status: u.cancelled ? 'cancelled' : 'failed', detail: u.cancelled ? 'annulée' : 'Interférence sans succès', source: sec(u) });
      }
      if ((e === 'epine' || e === 'herse') && u.mode === 'rank' && input[p].stance === 'guard') {
        const n = e === 'epine' ? 1 : 3;
        if (u.cancelled) effects.push({ player: p, effect: e, status: 'cancelled', detail: 'Interférée', source: sec(u) });
        else if (guardWin && winner === p) {
          fixedDamage[o] += n;
          effects.push({ player: p, effect: e, status: 'success', detail: `+${n} dégât${n > 1 ? 's' : ''} fixe${n > 1 ? 's' : ''} à l’adversaire`, source: sec(u), consequence: { kind: 'fixed-damage', amount: n } });
        } else effects.push({ player: p, effect: e, status: 'failed', detail: 'la Garde ne gagne pas contre un Assaut', source: sec(u) });
      }
    }
  }
  const damage: Record<PlayerId, number> = { p1: baseDamage.p1 + fixedDamage.p1, p2: baseDamage.p2 + fixedDamage.p2 };
  const zeroDamageRankWin = winner !== null && !guardWin && damage[OPP[winner]] === 0;

  // Soins, Insight, destinations.
  const heal: Record<PlayerId, number> = { p1: 0, p2: 0 };
  const insightSources: Record<PlayerId, InsightSource[]> = { p1: [], p2: [] };
  const destinations: ClashOutcome['destinations'] = { p1: {}, p2: {} };
  const detourPeek: Record<PlayerId, boolean> = { p1: false, p2: false };
  const peeks: ClashOutcome['peeks'] = { p1: [], p2: [] };
  const insightDrain: Record<PlayerId, number> = { p1: 0, p2: 0 };
  const primaryToHand: Record<PlayerId, boolean> = { p1: false, p2: false };
  // Avenant 09 : Bravade (Primaire battue en Assaut par une Garde) prive la Garde de son Insight et de son Repoussement.
  const bravade: Record<PlayerId, boolean> = { p1: false, p2: false };
  for (const p of IDS) {
    const o = OPP[p];
    if (input[o].primary.effect !== 'bravade' || input[o].stance !== 'assault') continue;
    if (silenced[o]) effects.push({ player: o, effect: 'bravade', status: 'cancelled', detail: 'neutralisée par Silence', source: PRIMARY, ...muted(o) });
    else if (guardWin && winner === p) {
      bravade[p] = true;
      effects.push({ player: o, effect: 'bravade', status: 'success', detail: 'la Garde victorieuse ne Repousse pas et ne gagne pas d’Insight', source: PRIMARY });
    } else effects.push({ player: o, effect: 'bravade', status: 'failed', detail: 'pas de défaite contre une Garde', source: PRIMARY });
  }

  for (const p of IDS) {
    const o = OPP[p];
    const side = input[p];
    if (guardWin && winner === p && !bravade[p]) insightSources[p].push({ kind: 'guard-win' });
    if (uses[p].some((u) => u.mode === 'interfere' && u.success)) insightSources[p].push({ kind: 'interference' });

    for (const u of uses[p]) {
      const e = u.def.effect;
      if (e === 'ecaille' && u.mode === 'rank' && side.stance === 'guard') {
        if (u.cancelled) effects.push({ player: p, effect: e, status: 'cancelled', detail: 'Interférée', source: sec(u) });
        else if (guardWin && winner === p) { heal[p] += 2; effects.push({ player: p, effect: e, status: 'success', detail: 'soin 2 PV', source: sec(u), consequence: { kind: 'heal' } }); }
        else effects.push({ player: p, effect: e, status: 'failed', detail: 'la Garde ne gagne pas', source: sec(u) });
      }
      if (e === 'ferveur' && u.mode === 'damage') {
        if (u.cancelled) effects.push({ player: p, effect: e, status: 'cancelled', detail: 'Interférée', source: sec(u) });
        else if (winner === p && side.primary.family === 'Cendre' && damage[o] > 0) { insightSources[p].push({ kind: 'effect', effect: e, slot: u.slot }); effects.push({ player: p, effect: e, status: 'success', detail: '+1 Insight (sous limite)', source: sec(u), consequence: { kind: 'insight' } }); }
        else effects.push({ player: p, effect: e, status: 'failed', detail: 'Primaire Cendre gagnante et blessante requise', source: sec(u) });
      }
      if (e === 'detour' && u.mode === 'interfere') {
        if (u.success && !u.cancelled) { detourPeek[p] = true; effects.push({ player: p, effect: e, status: 'success', detail: 'observe une carte de main adverse', source: sec(u), consequence: { kind: 'peek' } }); }
        else effects.push({ player: p, effect: e, status: u.cancelled ? 'cancelled' : 'failed', detail: u.cancelled ? 'annulée' : 'Interférence sans succès', source: sec(u) });
      }
      if (e === 'silence' && u.mode === 'interfere') {
        if (silencer[o]?.slot === u.slot && silenced[o]) effects.push({ player: p, effect: e, status: 'success', detail: 'effet de Primaire adverse en attente neutralisé', source: sec(u), consequence: { kind: 'neutralize' } });
        else effects.push({ player: p, effect: e, status: u.cancelled ? 'cancelled' : 'failed', detail: u.cancelled ? 'annulée' : 'succès contre une Secondaire de Rang IV requis', source: sec(u) });
      }
      // Avenant 09 — soin d'une Interférence (Bouture), regards (Murmure, Fil d'ombre), Insight retiré (Éclipse), bonus
      // conditionnels annoncés (Harmonie, Constellation).
      if (e === 'leurre' && u.mode === 'rank' && uses[o].some((x) => x.mode === 'interfere' && x.target === u.slot && x.targetProtected)) {
        effects.push({ player: p, effect: e, status: 'success', detail: 'Interférence adverse déjouée', source: sec(u), consequence: { kind: 'none' } });
      }
      if (e === 'bouture' && u.mode === 'interfere') {
        if (u.success && !u.cancelled) { heal[p] += 2; effects.push({ player: p, effect: e, status: 'success', detail: 'soin 2 PV', source: sec(u), consequence: { kind: 'heal' } }); }
        else effects.push({ player: p, effect: e, status: u.cancelled ? 'cancelled' : 'failed', detail: u.cancelled ? 'annulée' : 'Interférence sans succès', source: sec(u) });
      }
      if (e === 'murmure' && u.mode === 'interfere') {
        if (u.success && !u.cancelled) { peeks[p].push({ effect: e, what: 'deck-top' }); effects.push({ player: p, effect: e, status: 'success', detail: 'observe le sommet de la pioche adverse', source: sec(u), consequence: { kind: 'peek' } }); }
        else effects.push({ player: p, effect: e, status: u.cancelled ? 'cancelled' : 'failed', detail: u.cancelled ? 'annulée' : 'Interférence sans succès', source: sec(u) });
      }
      if (e === 'filombre' && u.mode === 'rank') {
        if (u.cancelled) effects.push({ player: p, effect: e, status: 'cancelled', detail: 'Interféré', source: sec(u) });
        else if (winner === p) { peeks[p].push({ effect: e, what: 'hand' }); effects.push({ player: p, effect: e, status: 'success', detail: 'observe une carte de main adverse', source: sec(u), consequence: { kind: 'peek' } }); }
        else effects.push({ player: p, effect: e, status: 'failed', detail: 'victoire de la Primaire requise', source: sec(u) });
      }
      if (e === 'eclipse' && u.mode === 'damage') {
        if (u.cancelled) effects.push({ player: p, effect: e, status: 'cancelled', detail: 'Interférée', source: sec(u) });
        else if (winner === p && damage[o] > 0) { insightDrain[o] = 1; effects.push({ player: p, effect: e, status: 'success', detail: 'l’adversaire perd 1 Insight et n’en gagne aucun ce tour', source: sec(u), consequence: { kind: 'insight-drain' } }); }
        else effects.push({ player: p, effect: e, status: 'failed', detail: 'victoire blessante requise', source: sec(u) });
      }
      if ((e === 'harmonie' && u.mode === 'rank') || (e === 'constellation' && u.mode === 'damage')) {
        if (u.cancelled) effects.push({ player: p, effect: e, status: 'cancelled', detail: 'Interférée', source: sec(u) });
        else if (otherFamilySupport(u, uses[p].filter((x) => !x.cancelled))) effects.push({ player: p, effect: e, status: 'success', detail: e === 'harmonie' ? 'soutien +2 au score' : 'coefficient +1', source: sec(u), consequence: { kind: 'none' } });
        else effects.push({ player: p, effect: e, status: 'failed', detail: 'autre soutien d’une autre famille requis', source: sec(u) });
      }
    }
    // Avenant 09 — effets de la Primaire : Solstice (Insight), Écho (regard), Phénix et Racines profondes (retour en main).
    const pe = side.primary.effect;
    if (pe === 'solstice' || pe === 'echo' || pe === 'phenix' || (pe === 'profondes' && side.stance === 'guard')) {
      const ok = pe === 'solstice' ? winner === p : pe === 'profondes' ? guardWin && winner === p : winner === o;
      if (silenced[p]) effects.push({ player: p, effect: pe, status: 'cancelled', detail: 'neutralisé par Silence', source: PRIMARY, ...muted(p) });
      else if (ok) {
        if (pe === 'solstice') insightSources[p].push({ kind: 'effect', effect: pe, slot: null });
        if (pe === 'echo') peeks[p].push({ effect: pe, what: 'hand' });
        if (pe === 'phenix' || pe === 'profondes') primaryToHand[p] = true;
        const detail = pe === 'solstice' ? '+1 Insight (sous limite)' : pe === 'echo' ? 'observe une carte de main adverse' : 'retourne dans la main de son propriétaire';
        effects.push({ player: p, effect: pe, status: 'success', detail, source: PRIMARY });
      } else effects.push({ player: p, effect: pe, status: 'failed', detail: pe === 'solstice' ? 'victoire requise' : pe === 'profondes' ? 'Garde victorieuse requise' : 'pas de défaite', source: PRIMARY });
    }

    // Destinations : Ancrage (carte annulée) > effet propre > Signature > défausse.
    const valid = uses[p].filter((u) => !u.cancelled);
    const cycleOk = side.primary.effect === 'cycle' && !silenced[p] && winner === p && valid.length === 1 &&
      (valid[0]!.mode === 'damage' || (valid[0]!.mode === 'interfere' && valid[0]!.success));
    if (side.primary.effect === 'cycle') {
      effects.push({ player: p, effect: 'cycle', status: silenced[p] ? 'cancelled' : cycleOk ? 'success' : 'failed', detail: silenced[p] ? 'neutralisé par Silence' : cycleOk ? 'soutien replacé au sommet de la pioche' : 'victoire avec exactement un soutien valide requise', source: PRIMARY, ...(silenced[p] ? muted(p) : {}) });
    }
    for (const u of uses[p]) {
      let dest: 'discard' | 'top' | 'bottom' | 'stay' = 'discard';
      if (side.ancrageSlot === u.slot && u.cancelled) dest = 'stay';
      else if (u.def.effect === 'tenacite' && u.mode === 'rank' && !u.cancelled && side.stance === 'guard' && winner === o) {
        dest = 'bottom';
        effects.push({ player: p, effect: 'tenacite', status: 'success', detail: 'retour sous la pioche', source: sec(u), consequence: { kind: 'destination', dest: 'bottom' } });
      } else if (u.def.effect === 'relance' && u.mode === 'interfere' && u.success && !u.cancelled && u.targetRank === 3) {
        dest = 'top';
        effects.push({ player: p, effect: 'relance', status: 'success', detail: 'retour au sommet de la pioche', source: sec(u), consequence: { kind: 'destination', dest: 'top' } });
      } else if (u.def.effect === 'lierre' && u.mode === 'interfere' && u.success && !u.cancelled) {
        dest = 'stay';
        effects.push({ player: p, effect: 'lierre', status: 'success', detail: 'reste active dans sa case', source: sec(u), consequence: { kind: 'destination', dest: 'stay' } });
      } else if (((u.def.effect === 'comete' && u.mode === 'damage') || (u.def.effect === 'zenith' && u.mode === 'rank')) && !u.cancelled && winner === p) {
        dest = 'top';
        effects.push({ player: p, effect: u.def.effect, status: 'success', detail: 'retour au sommet de la pioche', source: sec(u), consequence: { kind: 'destination', dest: 'top' } });
      } else if (cycleOk && u === valid[0]) dest = 'top';
      destinations[p][u.slot] = dest;
    }
  }
  // Éclipse : l'adversaire touché ne gagne aucun Insight ce tour (le retrait de réserve est appliqué par le moteur).
  for (const p of IDS) if (insightDrain[p]) insightSources[p] = [];
  const insightReasons: Record<PlayerId, string[]> = { p1: insightSources.p1.map(insightLabel), p2: insightSources.p2.map(insightLabel) };

  // Repoussement (un seul au maximum) : droits calculés ici, cibles après consommation.
  let repelRight: ClashOutcome['repelRight'] = null;
  let ruptureClaim: ClashOutcome['ruptureClaim'] = null;
  if (winner && !bravade[winner]) {
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
      effects.push({ player: p, effect: eff, status: silenced[p] ? 'cancelled' : 'failed', detail: silenced[p] ? 'neutralisée par Silence' : 'victoire en Assaut blessante avec soutien Dégâts valide requise', source: PRIMARY, ...(silenced[p] ? muted(p) : {}) });
    }
    if (eff === 'emprise' && !(repelRight?.kind === 'emprise' && repelRight.owner === p)) {
      effects.push({ player: p, effect: eff, status: silenced[p] ? 'cancelled' : 'failed', detail: silenced[p] ? 'neutralisée par Silence' : 'Garde victorieuse requise', source: PRIMARY, ...(silenced[p] ? muted(p) : {}) });
    }
    if (eff === 'entrave' && input[p].stance === 'guard' && silenced[p]) {
      effects.push({ player: p, effect: eff, status: 'cancelled', detail: 'neutralisée par Silence', source: PRIMARY, ...muted(p) });
    }
  }

  return {
    uses, silenced, scores, multipliers, outcome, winner, guardWin, baseDamage, fixedDamage, damage,
    absorbed, zeroDamageRankWin, heal, insightReasons, insightSources, destinations, effects, repelRight, ruptureClaim, detourPeek,
    peeks, insightDrain, primaryToHand,
  };
}
