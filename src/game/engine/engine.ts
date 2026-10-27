/**
 * Moteur de duel — transitions pures `applyCommand(state, cmd) → { state, events }`.
 * Aucune dépendance DOM/rendu/timer. La RNG gameplay vit dans l’état (champ `rng`).
 * Règlement V3.0 + avenant mandaté V3.2 (affinité de Rang +1).
 */
import { buildDeck, cardDef, EFFECTS, INSTANT_PRIMARY_EFFECTS, type CardDef, type Family } from '../catalog/cards';
import { INSIGHT_MAX, INSIGHT_START, TECHNIQUES, type TechniqueId } from '../catalog/techniques';
import {
  other, PLAYERS, RuleError, SLOTS,
  type ClashReport, type Command, type CommitChoice, type GameConfig, type GameEvent, type GameState, type Phase, type PublicEffect,
  type PlayerCommand, type PlayerId, type PlayerState, type SecondarySlot, type SecondaryState,
  type SlotIndex, type Stance, type TacticPlan, type Visibility,
} from '../model/types';
import { computeClash, damageBonus, rankBonus, rankSupport, damageCoefficient, type ClashInput, type ClashUse } from './clash';
import { hiddenSource, maskedOrigin, ownerEffect, publicEffect, publishInsight, type Concealment, type Observed } from './publication';
import { nextInt, seedToState, shuffleInPlace } from './rng';
import { assertInvariants } from './invariants';

export const DEFAULT_CONFIG: GameConfig = {
  seed: 20261016,
  players: {
    p1: { name: 'Vous', hp: 90, signature: 'Cendre', variants: 'all', techniques: ['Lecture', 'Ancrage'] },
    p2: { name: 'Rival', hp: 90, signature: 'Ronce', variants: 'all', techniques: ['Sondage', 'Rupture'] },
  },
};

// ---------------------------------------------------------------------------
// Contexte de transition (copie mutable + émission d’événements)

class Ctx {
  events: GameEvent[] = [];
  constructor(public s: GameState) {}
  emit(vis: Visibility, kind: GameEvent['kind'], data: Record<string, unknown> = {}): void {
    this.s.eventSeq += 1;
    this.events.push({ seq: this.s.eventSeq, turn: this.s.turn, phase: this.s.phase, vis, kind, data });
  }
  def(cardId: string): CardDef {
    const inst = this.s.cards[cardId];
    if (!inst) throw new RuleError(`Instance inconnue : ${cardId}`);
    return cardDef(inst.defId);
  }
}

const clone = <T>(x: T): T => structuredClone(x);

export function defOf(state: GameState, cardId: string): CardDef {
  const inst = state.cards[cardId];
  if (!inst) throw new RuleError(`Instance inconnue : ${cardId}`);
  return cardDef(inst.defId);
}

/**
 * Camouflage effectif (Dissimulation) : la carte ciblée n’est masquée que si son identité n’était
 * pas déjà publique avant ce tour (§11.3 : une information vue n’est jamais « désapprise »).
 * La FAMILLE reste visible (§13.2, instruction opérateur M02 §6).
 */
export function concealed(state: GameState, pid: PlayerId, slot: SlotIndex): boolean {
  const p = state.players[pid];
  const sl = p.slots[slot];
  return !!sl && p.mask?.target === slot && sl.revealedTurn === state.turn;
}

export function secondaryState(state: GameState, slot: SecondarySlot): SecondaryState {
  if (slot.active) return 'active';
  return slot.placedTurn >= state.turn ? 'charging' : 'hidden';
}

// ---------------------------------------------------------------------------
// Création

export function createGame(config: GameConfig = DEFAULT_CONFIG): { state: GameState; events: GameEvent[] } {
  const state: GameState = {
    schema: 1,
    rules: 'V3.0+delta-V3.3.2',
    seed: config.seed,
    rng: seedToState(config.seed),
    turn: 0,
    phase: 'START',
    cards: {},
    players: {} as Record<PlayerId, PlayerState>,
    pending: {},
    awaiting: [],
    lectureUsers: [],
    commitOrder: [],
    commitHeld: null,
    revision: null,
    repel: null,
    lastClash: null,
    reveal: { primaries: null, tactics: null, signatures: { p1: null, p2: null } },
    winner: null,
    overtime: 0,
    eventSeq: 0,
  };
  for (const pid of PLAYERS) {
    const pc = config.players[pid];
    const techniques = [...new Set(pc.techniques)];
    if (techniques.length > 2) throw new RuleError('Deux Techniques équipées au maximum.');
    // Avenant M10-A (AV-03) : deck explicite (mode Aventure), contrôlé à la forme R-AV ; sinon le deck standard, inchangé.
    if (!pc.deck && pc.signature === null) throw new RuleError('Le deck standard exige une Signature.');
    const defs = pc.deck ? checkedExplicitDeck(pc.deck, pc.signature) : buildDeck({ signature: pc.signature!, variants: pc.variants });
    const ids: string[] = [];
    defs.forEach((defId, i) => {
      const id = `${pid}#${String(i).padStart(2, '0')}`;
      state.cards[id] = { id, owner: pid, defId };
      ids.push(id);
    });
    state.players[pid] = {
      id: pid, name: pc.name, hp: pc.hp, maxHp: pc.hp,
      insight: Math.max(0, Math.min(INSIGHT_MAX, pc.insightStart ?? INSIGHT_START)),
      insightGained: 0, techniqueUsed: null, techniques, signatureFamily: pc.signature,
      deck: ids, hand: [], discard: [], slots: [null, null], primary: null, mask: null, maskedDiscards: [],
    };
  }
  const ctx = new Ctx(state);
  for (const pid of PLAYERS) shuffleInPlace(state, state.players[pid].deck);
  beginTurn(ctx);
  assertInvariants(state);
  return { state, events: ctx.events };
}

/**
 * Avenant M10-A (AV-03, règle R-AV) : forme d'un deck explicite du mode Aventure : 16 cartes ordinaires, exactement
 * quatre de chaque Rang ; chaque identité familiale au plus une fois (les neutres se répètent, ADR 030) ; zéro ou une
 * Signature, celle annoncée par `signature`. La possession des cartes relève de l'aventure, pas du moteur.
 */
function checkedExplicitDeck(deck: readonly string[], signature: Family | null): string[] {
  const defs = deck.map((id) => cardDef(id));
  const sigs = defs.filter((d) => d.signature);
  if (sigs.length > 1) throw new RuleError('Une seule Signature par deck.');
  if ((sigs[0]?.family ?? null) !== signature) throw new RuleError('La Signature du deck ne correspond pas à celle annoncée.');
  const ordinary = defs.filter((d) => !d.signature);
  if (ordinary.length !== 16) throw new RuleError(`Le deck compte ${ordinary.length} cartes ordinaires au lieu de 16.`);
  for (const r of [1, 2, 3, 4]) if (ordinary.filter((d) => d.rank === r).length !== 4) throw new RuleError(`Il faut exactement quatre cartes de Rang ${r}.`);
  const familial = ordinary.filter((d) => d.family !== null).map((d) => d.identity);
  if (new Set(familial).size !== familial.length) throw new RuleError('Une identité familiale en double dans le deck.');
  return [...deck];
}

// ---------------------------------------------------------------------------
// Pioche

function drawOne(ctx: Ctx, pid: PlayerId): boolean {
  const p = ctx.s.players[pid];
  if (!p.deck.length) {
    if (!p.discard.length) return false;
    p.deck = p.discard.splice(0);
    shuffleInPlace(ctx.s, p.deck);
    ctx.emit('public', 'shuffle', { player: pid, count: p.deck.length });
  }
  const id = p.deck.pop()!;
  p.hand.push(id);
  ctx.emit(pid, 'draw', { player: pid, cardId: id, defId: ctx.def(id).defId });
  return true;
}

function drawTo4(ctx: Ctx, pid: PlayerId): void {
  const p = ctx.s.players[pid];
  let n = 0;
  while (p.hand.length < 4 && drawOne(ctx, pid)) n++;
  if (n) ctx.emit('public', 'draw', { player: pid, count: n });
}

// ---------------------------------------------------------------------------
// Phases et décisions triviales (déterminées par information publique uniquement)

function canUseTechnique(p: PlayerState, t: TechniqueId): boolean {
  return p.techniques.includes(t) && p.techniqueUsed === null && p.insight >= TECHNIQUES[t].cost;
}

export function eligibleReveals(state: GameState, pid: PlayerId): SlotIndex[] {
  const p = state.players[pid];
  return SLOTS.filter((i) => {
    const s = p.slots[i];
    return !!s && !s.active && s.placedTurn < state.turn;
  });
}

function needs(state: GameState, phase: Phase, pid: PlayerId): boolean {
  const p = state.players[pid];
  const o = state.players[other(pid)];
  switch (phase) {
    case 'START':
      return p.hand.length > 4 || canUseTechnique(p, 'Sondage') || canUseTechnique(p, 'Recentrage');
    case 'PREPARE':
      return eligibleReveals(state, pid).length > 0;
    case 'DISSIPATION':
      return !!o.mask && canUseTechnique(p, 'Dissipation');
    case 'COMMIT':
      return true;
    case 'REVISION':
      return state.revision === pid;
    case 'LECTURE':
      return canUseTechnique(p, 'Lecture');
    case 'LECTURE_CHANGE':
      return state.lectureUsers.includes(pid);
    case 'TACTICS': {
      const hasActive = p.slots.some((s) => s?.active);
      const rupture = canUseTechnique(p, 'Rupture') && p.primary?.stance === 'guard' && o.slots.some((s) => s?.active);
      return hasActive || rupture;
    }
    case 'REPEL':
      return state.repel?.owner === pid;
    default:
      return false;
  }
}

function openPhase(ctx: Ctx, phase: Phase): void {
  ctx.s.phase = phase;
  ctx.s.pending = {};
  ctx.s.awaiting = PLAYERS.filter((pid) => needs(ctx.s, phase, pid));
}

function beginTurn(ctx: Ctx): void {
  const s = ctx.s;
  s.turn += 1;
  s.lastClash = null;
  s.reveal = { primaries: null, tactics: null, signatures: { p1: null, p2: null } };
  s.repel = null;
  s.lectureUsers = [];
  s.commitOrder = [];
  s.commitHeld = null;
  s.revision = null;
  ctx.s.phase = 'START';
  ctx.emit('public', 'turnStart', { turn: s.turn });
  for (const pid of PLAYERS) {
    const p = s.players[pid];
    p.insightGained = 0;
    p.techniqueUsed = null;
    p.mask = null;
    p.maskedDiscards = [];
    p.primary = null;
    if (p.hand.length <= 4) drawTo4(ctx, pid);
  }
  openPhase(ctx, 'START');
  advanceIfReady(ctx);
}

// ---------------------------------------------------------------------------
// Validation des commandes

function inHand(p: PlayerState, id: string): boolean {
  return p.hand.includes(id);
}

/** Contrôles d’un engagement : commande `commit`, ou nouvel engagement d’une révision (avenant 08, amendement 1). */
function validateCommit(state: GameState, p: PlayerState, c: CommitChoice): void {
  if (!inHand(p, c.primaryId)) throw new RuleError('La Primaire doit venir de votre main.');
  if (c.stance !== 'assault' && c.stance !== 'guard') throw new RuleError('Mode Assaut ou Garde requis.');
  if (c.secondaryId !== null) {
    if (c.secondaryId === c.primaryId) throw new RuleError('Primaire et Secondaire doivent être distinctes.');
    if (!inHand(p, c.secondaryId)) throw new RuleError('La Secondaire doit venir de votre main.');
    if (defOf(state, c.secondaryId).signature) throw new RuleError('Une Signature ne peut jamais être Secondaire.');
    const full = p.slots.every((x) => x !== null);
    if (full && c.replaceSlot === null) throw new RuleError('Deux emplacements occupés : choisissez la Secondaire à remplacer.');
    if (!full && c.replaceSlot !== null) throw new RuleError('Remplacement possible uniquement si les deux emplacements sont occupés.');
    if (c.slot !== undefined && c.replaceSlot === null && p.slots[c.slot] !== null) throw new RuleError('Emplacement occupé : utilisez l’emplacement libre.');
  } else if (c.replaceSlot !== null) throw new RuleError('Remplacement sans nouvelle Secondaire.');
}

function validate(state: GameState, cmd: PlayerCommand): void {
  const pid = cmd.player;
  const p = state.players[pid];
  const o = state.players[other(pid)];
  if (state.phase === 'ENDED') throw new RuleError('Le duel est terminé.');
  if (!state.awaiting.includes(pid)) throw new RuleError('Aucune décision attendue de ce joueur dans cette phase.');
  if (state.pending[pid]) throw new RuleError('Décision déjà verrouillée pour cette phase.');
  const expect: Record<PlayerCommand['type'], Phase> = {
    start: 'START', prepare: 'PREPARE', dissipate: 'DISSIPATION', commit: 'COMMIT', revise: 'REVISION', lecture: 'LECTURE',
    lectureStance: 'LECTURE_CHANGE', tactics: 'TACTICS', repel: 'REPEL',
  };
  if (expect[cmd.type] !== state.phase) throw new RuleError(`Commande « ${cmd.type} » invalide en phase ${state.phase}.`);

  switch (cmd.type) {
    case 'start': {
      const excess = Math.max(0, p.hand.length - 4);
      if (cmd.discard.length !== excess || new Set(cmd.discard).size !== excess) throw new RuleError(`Défaussez exactement ${excess} carte(s) pour revenir à 4.`);
      for (const id of cmd.discard) if (!inHand(p, id)) throw new RuleError('Carte de défausse absente de la main.');
      if (cmd.technique) {
        const t = cmd.technique.id;
        if (!p.techniques.includes(t)) throw new RuleError(`${t} n’est pas équipée.`);
        if (p.techniqueUsed) throw new RuleError('Une seule Technique par tour.');
        if (p.insight < TECHNIQUES[t].cost) throw new RuleError('Coût Insight insuffisant.');
        if (cmd.technique.id === 'Recentrage') {
          const id = cmd.technique.cardId;
          if (!inHand(p, id) || cmd.discard.includes(id)) throw new RuleError('Recentrage : choisissez une carte de votre main.');
        }
      }
      return;
    }
    case 'prepare': {
      const eligible = eligibleReveals(state, pid);
      if (new Set(cmd.reveal).size !== cmd.reveal.length) throw new RuleError('Révélation en double.');
      for (const i of cmd.reveal) {
        const sl = p.slots[i];
        if (!sl) throw new RuleError('Emplacement vide.');
        if (sl.active) throw new RuleError('Secondaire déjà active.');
        if (!eligible.includes(i)) throw new RuleError('Secondaire en chargement : révélation impossible ce tour.');
      }
      return;
    }
    case 'dissipate': {
      if (cmd.targetSlot === null) return;
      if (!canUseTechnique(p, 'Dissipation')) throw new RuleError('Dissipation indisponible (équipement, Insight ou Technique déjà utilisée).');
      if (!o.mask || o.mask.source !== cmd.targetSlot) throw new RuleError('Dissipation : la cible doit maintenir un effet de préparation actif.');
      return;
    }
    case 'commit':
      validateCommit(state, p, cmd);
      return;
    case 'revise':
      // Avenant 08, amendement 1 : garder, ou un nouvel engagement complet soumis aux mêmes contrôles.
      if (cmd.commit) validateCommit(state, p, cmd.commit);
      return;
    case 'lecture':
      if (cmd.use && !canUseTechnique(p, 'Lecture')) throw new RuleError('Lecture indisponible.');
      return;
    case 'lectureStance':
      if (cmd.stance !== 'assault' && cmd.stance !== 'guard') throw new RuleError('Mode invalide.');
      return;
    case 'tactics': {
      for (const i of SLOTS) {
        const plan = cmd.plans[i];
        const sl = p.slots[i];
        if (!sl?.active) {
          if (plan && plan.mode !== 'keep') {
            throw new RuleError(sl ? (sl.placedTurn >= state.turn ? 'Secondaire en chargement : inutilisable ce tour.' : 'Secondaire cachée inactive : révélez-la en début de tour pour l’utiliser.') : 'Emplacement vide.');
          }
          continue;
        }
        if (!plan) continue;
        if (plan.mode === 'damage' && p.primary?.stance !== 'assault') throw new RuleError('Amplifier les dégâts exige une Primaire en Assaut.');
        if (plan.mode === 'interfere') {
          if (plan.target === undefined) throw new RuleError('Interférence : cible requise.');
          const t = o.slots[plan.target];
          if (!t?.active) throw new RuleError('Interférence : la cible doit être une Secondaire adverse active.');
          const masked = o.mask?.target === plan.target;
          if (!masked && (defOf(state, sl.cardId).rank ?? 0) < (defOf(state, t.cardId).rank ?? 0)) {
            throw new RuleError('Interférence : Rang imprimé insuffisant contre cette cible.');
          }
        }
      }
      const tech = cmd.technique;
      if (tech) {
        if (!canUseTechnique(p, tech.id)) throw new RuleError(`${tech.id} indisponible (équipement, Insight ou Technique déjà utilisée).`);
        if (tech.id === 'Ancrage') {
          const plan = cmd.plans[tech.slot];
          if (!plan || plan.mode === 'keep' || !p.slots[tech.slot]?.active) throw new RuleError('Ancrage : désignez une Secondaire que vous engagez.');
        } else {
          if (p.primary?.stance !== 'guard') throw new RuleError('Rupture exige une Primaire en Garde.');
          if (!o.slots[tech.targetSlot]?.active) throw new RuleError('Rupture : la cible doit être une Secondaire adverse active.');
        }
      }
      return;
    }
    case 'repel': {
      if (cmd.targetSlot === null) return;
      if (!state.repel?.choices.includes(cmd.targetSlot)) throw new RuleError('Cible de Repoussement non admissible.');
      return;
    }
  }
}

// ---------------------------------------------------------------------------
// API

export interface TransitionResult {
  state: GameState;
  events: GameEvent[];
}

export function applyCommand(state: GameState, cmd: Command): TransitionResult {
  const s = clone(state);
  const ctx = new Ctx(s);
  if (cmd.type === 'nextTurn') {
    if (s.phase !== 'RESOLVED') throw new RuleError('Le Clash doit être résolu avant le tour suivant.');
    beginTurn(ctx);
  } else {
    validate(s, cmd);
    s.pending[cmd.player] = clone(cmd);
    ctx.emit('public', 'locked', { player: cmd.player, phase: s.phase });
    if (cmd.type === 'commit') s.commitOrder.push(cmd.player);
    // Avenant 08 : une Signature engagée en Primaire est annoncée aux deux joueurs dès le verrouillage de son propriétaire,
    // par liste blanche (identité seule : ni mode, ni Secondaire, ni remplacement).
    if (cmd.type === 'commit' && defOf(s, cmd.primaryId).signature) {
      const defId = s.cards[cmd.primaryId]!.defId;
      s.reveal.signatures[cmd.player] = defId;
      ctx.emit('public', 'signatureAnnounced', { player: cmd.player, defId });
    }
    advanceIfReady(ctx);
  }
  assertInvariants(s);
  return { state: s, events: ctx.events };
}

/** Rejet explicite sans mutation : renvoie la raison ou null. */
export function checkCommand(state: GameState, cmd: PlayerCommand): string | null {
  try {
    validate(state, cmd);
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

function advanceIfReady(ctx: Ctx): void {
  // Boucle : applique les phases dont toutes les décisions sont verrouillées (ou triviales).
  for (let guard = 0; guard < 32; guard++) {
    const s = ctx.s;
    if (s.phase === 'RESOLVED' || s.phase === 'ENDED') return;
    if (!s.awaiting.every((pid) => s.pending[pid])) return;
    applyPhase(ctx);
  }
  throw new Error('Boucle de phases inattendue');
}

function applyPhase(ctx: Ctx): void {
  switch (ctx.s.phase) {
    case 'START': return applyStart(ctx);
    case 'PREPARE': return applyPrepare(ctx);
    case 'DISSIPATION': return applyDissipation(ctx);
    case 'COMMIT': return closeCommit(ctx);
    case 'REVISION': return applyRevision(ctx);
    case 'LECTURE': return applyLecture(ctx);
    case 'LECTURE_CHANGE': return applyLectureChange(ctx);
    case 'TACTICS': return resolveClash(ctx);
    case 'REPEL': return applyRepel(ctx);
    default: return;
  }
}

function pend<T extends PlayerCommand['type']>(ctx: Ctx, pid: PlayerId, type: T): Extract<PlayerCommand, { type: T }> | null {
  const c = ctx.s.pending[pid];
  return c && c.type === type ? (c as Extract<PlayerCommand, { type: T }>) : null;
}

function payTechnique(ctx: Ctx, pid: PlayerId, t: TechniqueId, extra: Record<string, unknown> = {}): void {
  const p = ctx.s.players[pid];
  p.insight -= TECHNIQUES[t].cost;
  p.techniqueUsed = t;
  ctx.emit('public', 'technique', { player: pid, technique: t, cost: TECHNIQUES[t].cost, ...extra });
}

function randomHandCard(ctx: Ctx, pid: PlayerId, snapshot?: string[]): string | null {
  const hand = snapshot ?? ctx.s.players[pid].hand;
  if (!hand.length) return null;
  return hand[nextInt(ctx.s, hand.length)] ?? null;
}

// --- START : régulation de main + Sondage/Recentrage -----------------------
function applyStart(ctx: Ctx): void {
  const s = ctx.s;
  for (const pid of PLAYERS) {
    const c = pend(ctx, pid, 'start');
    if (!c || !c.discard.length) continue;
    const p = s.players[pid];
    for (const id of c.discard) {
      p.hand.splice(p.hand.indexOf(id), 1);
      p.discard.push(id);
    }
    ctx.emit('public', 'trim', { player: pid, defIds: c.discard.map((id) => ctx.def(id).defId) });
  }
  // Instantané des mains pour Sondage (simultané avec Recentrage) — cf. ADR/arbitrage ARB-001.
  const handSnapshot: Record<PlayerId, string[]> = { p1: [...s.players.p1.hand], p2: [...s.players.p2.hand] };
  for (const pid of PLAYERS) {
    const c = pend(ctx, pid, 'start');
    if (c?.technique?.id !== 'Sondage') continue;
    payTechnique(ctx, pid, 'Sondage');
    const seen = randomHandCard(ctx, other(pid), handSnapshot[other(pid)]);
    ctx.emit(pid, 'peek', { player: pid, source: 'Sondage', defIds: seen ? [ctx.def(seen).defId] : [] });
  }
  for (const pid of PLAYERS) {
    const c = pend(ctx, pid, 'start');
    if (c?.technique?.id !== 'Recentrage') continue;
    const p = s.players[pid];
    payTechnique(ctx, pid, 'Recentrage');
    const id = c.technique.cardId;
    p.hand.splice(p.hand.indexOf(id), 1);
    p.deck.unshift(id);
    ctx.emit(pid, 'recentrage', { player: pid, defId: ctx.def(id).defId });
    drawOne(ctx, pid);
  }
  openPhase(ctx, 'PREPARE');
}

// --- PREPARE : révélation volontaire simultanée -----------------------------
function applyPrepare(ctx: Ctx): void {
  const s = ctx.s;
  const revealed: Record<PlayerId, SlotIndex[]> = { p1: [], p2: [] };
  for (const pid of PLAYERS) {
    const c = pend(ctx, pid, 'prepare');
    for (const i of c?.reveal ?? []) {
      const sl = s.players[pid].slots[i]!;
      sl.active = true;
      sl.revealedTurn = s.turn;
      revealed[pid].push(i);
    }
  }
  // Camouflage atomique AVANT toute publication (§13.2).
  for (const pid of PLAYERS) {
    const p = s.players[pid];
    for (const i of revealed[pid]) {
      if (ctx.def(p.slots[i]!.cardId).effect !== 'dissimulation') continue;
      const otherSlot: SlotIndex = i === 0 ? 1 : 0;
      if (p.slots[otherSlot]?.active) p.mask = { source: i, target: otherSlot };
    }
  }
  for (const pid of PLAYERS) {
    const p = s.players[pid];
    for (const i of revealed[pid]) {
      const masked = concealed(s, pid, i);
      const defId = ctx.def(p.slots[i]!.cardId).defId;
      ctx.emit('public', 'secondaryRevealed', { player: pid, slot: i, defId: masked ? null : defId, masked, family: ctx.def(p.slots[i]!.cardId).family });
      if (masked) ctx.emit(pid, 'secondaryRevealed', { player: pid, slot: i, defId, masked: true, own: true });
    }
    if (p.mask) ctx.emit('public', 'masking', { player: pid, source: p.mask.source, target: p.mask.target });
  }
  // Effets de révélation (ordre déterministe p1 puis p2). Celui d’une carte camouflée n’a aucune
  // conséquence publique (observation privée) : il n’est annoncé qu’à son propriétaire (ADR 011).
  for (const pid of PLAYERS) {
    const p = s.players[pid];
    for (const i of revealed[pid]) {
      const def = ctx.def(p.slots[i]!.cardId);
      const announce = (data: Record<string, unknown>) => (concealed(s, pid, i) ? ctx.emit(pid, 'effect', { ...data, own: true, slot: i }) : ctx.emit('public', 'effect', data));
      if (def.effect === 'eclaireur') {
        const seen = randomHandCard(ctx, other(pid));
        announce({ player: pid, effect: 'eclaireur', status: 'success', detail: 'une carte de main adverse observée' });
        ctx.emit(pid, 'peek', { player: pid, source: 'Éclaireur', defIds: seen ? [ctx.def(seen).defId] : [] });
      } else if (def.effect === 'repere') {
        const top = p.deck[p.deck.length - 1];
        announce({ player: pid, effect: 'repere', status: 'success', detail: 'sommet de pioche observé' });
        ctx.emit(pid, 'peek', { player: pid, source: 'Repère', defIds: top ? [ctx.def(top).defId] : [], own: true });
      } else if (def.effect === 'dissimulation') {
        ctx.emit('public', 'effect', { player: pid, effect: 'dissimulation', status: p.mask ? 'success' : 'failed', detail: p.mask ? 'l’autre Secondaire est masquée jusqu’à la fin du tour' : 'aucune autre Secondaire active' });
      } else if (def.effect === 'sextant') {
        announce({ player: pid, effect: 'sextant', status: 'success', detail: 'deux cartes du sommet de pioche observées' });
        ctx.emit(pid, 'peek', { player: pid, source: 'Sextant', defIds: p.deck.slice(-2).reverse().map((c) => ctx.def(c).defId), own: true });
      } else if (def.effect === 'escarbille' || def.effect === 'seve') {
        // Conséquences publiques (PV, pioche) : une carte camouflée les annonce sous une origine générique (ADR 011).
        const o = s.players[other(pid)];
        const ok = def.effect === 'escarbille' ? p.hp > 1 : p.hp < o.hp && p.hp < p.maxHp;
        const masked = concealed(s, pid, i);
        const data = { player: pid, effect: def.effect, status: ok ? 'success' : 'failed', detail: '' };
        if (ok && def.effect === 'escarbille') {
          const before = p.hp;
          p.hp -= 1;
          ctx.emit('public', 'damage', { player: pid, amount: 1, base: 0, fixed: 1, before, hp: p.hp });
          if (drawOne(ctx, pid)) ctx.emit('public', 'draw', { player: pid, count: 1 });
          data.detail = '1 dégât fixe subi, une carte piochée';
        } else if (ok) {
          const before = p.hp;
          p.hp = Math.min(p.maxHp, p.hp + 2);
          ctx.emit('public', 'heal', { player: pid, amount: p.hp - before, hp: p.hp });
          data.detail = `soin de ${p.hp - before} PV`;
        } else data.detail = def.effect === 'escarbille' ? '1 PV seulement' : 'pas moins de PV que l’adversaire';
        if (!masked) ctx.emit('public', 'effect', data);
        else {
          ctx.emit(pid, 'effect', { ...data, own: true, slot: i });
          if (ok) ctx.emit('public', 'effect', { player: pid, effect: null, masked: true, family: def.family, slot: i, status: 'success', detail: def.effect === 'escarbille' ? '1 dégât fixe subi par son propriétaire, une carte piochée' : data.detail });
        }
      }
    }
  }
  openPhase(ctx, s.players.p1.mask || s.players.p2.mask ? 'DISSIPATION' : 'COMMIT');
}

// --- DISSIPATION ------------------------------------------------------------
function applyDissipation(ctx: Ctx): void {
  const s = ctx.s;
  const targets: Array<{ pid: PlayerId; slot: SlotIndex }> = [];
  for (const pid of PLAYERS) {
    const c = pend(ctx, pid, 'dissipate');
    if (c && c.targetSlot !== null) {
      payTechnique(ctx, pid, 'Dissipation', { targetSlot: c.targetSlot });
      targets.push({ pid, slot: c.targetSlot });
    }
  }
  for (const t of targets) {
    const o = s.players[other(t.pid)];
    if (!o.mask) continue;
    const unmasked = o.mask.target;
    o.mask = null;
    ctx.emit('public', 'dissipation', { player: t.pid, target: other(t.pid), slot: unmasked, defId: ctx.def(o.slots[unmasked]!.cardId).defId });
  }
  openPhase(ctx, 'COMMIT');
}

// --- COMMIT : Primaire + nouvelle Secondaire facultative ---------------------
/** Fin du verrouillage de l’engagement : révision unique (avenant 08, amendement 1) si le SECOND engagement verrouillé
 *  porte une Signature (annoncée) ; sinon, application immédiate. */
function closeCommit(ctx: Ctx): void {
  const s = ctx.s;
  const choices = { p1: choiceOf(pend(ctx, 'p1', 'commit')!), p2: choiceOf(pend(ctx, 'p2', 'commit')!) };
  const [first, second] = s.commitOrder;
  if (s.revision === null && first && second && ctx.def(choices[second].primaryId).signature) {
    s.commitHeld = choices;
    s.revision = first;
    ctx.emit('public', 'revisionOpened', { player: first });
    openPhase(ctx, 'REVISION');
    return;
  }
  applyCommit(ctx, choices);
}

const choiceOf = (c: Extract<PlayerCommand, { type: 'commit' }>): CommitChoice => {
  const { type: _t, player: _p, ...choice } = c;
  return choice;
};

/** Avenant 08, amendement 1 : le premier verrouillé garde son engagement ou le remplace, une seule fois ; une Signature
 *  nouvellement engagée est annoncée, une Signature abandonnée est dite (son identité était déjà publique). */
function applyRevision(ctx: Ctx): void {
  const s = ctx.s;
  const pid = s.revision!;
  const r = pend(ctx, pid, 'revise')!;
  const choices = s.commitHeld as Record<PlayerId, CommitChoice>;
  s.commitHeld = null;
  if (r.commit) {
    choices[pid] = r.commit;
    ctx.emit('public', 'revised', { player: pid, kept: false });
    const before = s.reveal.signatures[pid];
    const def = ctx.def(r.commit.primaryId);
    if (def.signature && before !== def.defId) {
      s.reveal.signatures[pid] = def.defId;
      ctx.emit('public', 'signatureAnnounced', { player: pid, defId: def.defId });
    } else if (!def.signature && before) {
      s.reveal.signatures[pid] = null;
      ctx.emit('public', 'signatureWithdrawn', { player: pid, defId: before });
    }
  } else ctx.emit('public', 'revised', { player: pid, kept: true });
  applyCommit(ctx, choices);
}

function applyCommit(ctx: Ctx, choices: Record<PlayerId, CommitChoice>): void {
  const s = ctx.s;
  for (const pid of PLAYERS) {
    const c = choices[pid];
    const p = s.players[pid];
    p.hand.splice(p.hand.indexOf(c.primaryId), 1);
    p.primary = { cardId: c.primaryId, stance: c.stance, initialStance: c.stance };
    let placedSlot: SlotIndex | null = null;
    if (c.secondaryId) {
      if (c.replaceSlot !== null) {
        const old = p.slots[c.replaceSlot]!;
        // Camouflage évalué AVANT de retirer la carte : remplacée ce tour, elle n’est nommée publiquement
        // qu’à la fin du tour, comme une carte camouflée consommée (ARB-005).
        const hidden = concealed(s, pid, c.replaceSlot);
        p.slots[c.replaceSlot] = null;
        p.discard.push(old.cardId);
        if (hidden) p.maskedDiscards.push(old.cardId);
        if (p.mask && (p.mask.source === c.replaceSlot || p.mask.target === c.replaceSlot)) p.mask = null;
        if (hidden) {
          ctx.emit('public', 'replaced', { player: pid, slot: c.replaceSlot, defId: null, masked: true, family: ctx.def(old.cardId).family });
          ctx.emit(pid, 'replaced', { player: pid, slot: c.replaceSlot, defId: ctx.def(old.cardId).defId, own: true });
        } else ctx.emit('public', 'replaced', { player: pid, slot: c.replaceSlot, defId: ctx.def(old.cardId).defId });
        placedSlot = c.replaceSlot;
      } else placedSlot = c.slot !== undefined && p.slots[c.slot] === null ? c.slot : p.slots[0] === null ? 0 : 1;
      p.hand.splice(p.hand.indexOf(c.secondaryId), 1);
      p.slots[placedSlot] = { cardId: c.secondaryId, placedTurn: s.turn, active: false, revealedTurn: null };
    }
    // Avenant 08 : une Signature annoncée n’est pas « face cachée » ; le drapeau public ne dit que ce qui est déjà annoncé.
    ctx.emit('public', 'committed', { player: pid, placedSlot, ...(s.reveal.signatures[pid] ? { signature: true } : {}) });
    ctx.emit(pid, 'committed', { player: pid, own: true, primaryDefId: ctx.def(c.primaryId).defId, stance: c.stance, secondaryDefId: c.secondaryId ? ctx.def(c.secondaryId).defId : null, placedSlot });
  }
  openPhase(ctx, 'LECTURE');
}

// --- LECTURE ----------------------------------------------------------------
function applyLecture(ctx: Ctx): void {
  const s = ctx.s;
  s.lectureUsers = PLAYERS.filter((pid) => pend(ctx, pid, 'lecture')?.use);
  for (const pid of s.lectureUsers) {
    payTechnique(ctx, pid, 'Lecture');
    ctx.emit(pid, 'lecture', { player: pid, opponentInitialStance: s.players[other(pid)].primary!.initialStance });
  }
  if (s.lectureUsers.length) openPhase(ctx, 'LECTURE_CHANGE');
  else revealPrimaries(ctx);
}

function applyLectureChange(ctx: Ctx): void {
  for (const pid of ctx.s.lectureUsers) {
    const c = pend(ctx, pid, 'lectureStance');
    if (c) ctx.s.players[pid].primary!.stance = c.stance;
  }
  revealPrimaries(ctx);
}

// --- Révélation simultanée des Primaires ------------------------------------
function revealPrimaries(ctx: Ctx): void {
  const s = ctx.s;
  const data: Record<string, unknown> = {};
  for (const pid of PLAYERS) {
    const pr = s.players[pid].primary!;
    data[pid] = { defId: ctx.def(pr.cardId).defId, stance: pr.stance };
  }
  s.phase = 'TACTICS';
  s.reveal.primaries = data as NonNullable<GameState['reveal']['primaries']>;
  ctx.emit('public', 'primariesRevealed', data);
  for (const pid of PLAYERS) {
    const def = ctx.def(s.players[pid].primary!.cardId);
    // avenant 09 : Ombre portée et Miroir brisé sont immédiats (jamais armés) ; Clairvoyance voilée garde son événement
    // historique (replays et empreintes du Duel standard inchangés)
    if (def.effect && EFFECTS[def.effect].trigger === 'primary-reveal' && (def.effect === 'clairvoyance' || !INSTANT_PRIMARY_EFFECTS.has(def.effect))) ctx.emit('public', 'effectArmed', { player: pid, effect: def.effect });
  }
  // Clairvoyance voilée : information instantanée privée.
  for (const pid of PLAYERS) {
    const def = ctx.def(s.players[pid].primary!.cardId);
    if (def.effect !== 'clairvoyance') continue;
    const o = s.players[other(pid)];
    const seen: string[] = [];
    const h = randomHandCard(ctx, other(pid));
    if (h) seen.push(ctx.def(h).defId);
    const hidden = SLOTS.map((i) => ({ i, sl: o.slots[i] })).filter((x) => x.sl && !x.sl.active)
      .sort((a, b) => a.sl!.placedTurn - b.sl!.placedTurn || a.i - b.i)[0];
    ctx.emit('public', 'effect', { player: pid, effect: 'clairvoyance', status: 'success', detail: 'des informations adverses ont été révélées au propriétaire' });
    ctx.emit(pid, 'peek', { player: pid, source: 'Clairvoyance voilée', defIds: seen, hiddenSlot: hidden ? { slot: hidden.i, defId: ctx.def(hidden.sl!.cardId).defId } : null });
  }
  // Avenant 09 : Ombre portée (la plus ancienne Secondaire adverse cachée) et Miroir brisé (toutes, deux au plus), immédiats.
  for (const pid of PLAYERS) {
    const def = ctx.def(s.players[pid].primary!.cardId);
    if (def.effect !== 'ombre' && def.effect !== 'miroirbrise') continue;
    const o = s.players[other(pid)];
    const hidden = SLOTS.map((i) => ({ i, sl: o.slots[i] })).filter((x) => x.sl && !x.sl.active)
      .sort((a, b) => a.sl!.placedTurn - b.sl!.placedTurn || a.i - b.i);
    const seen = (def.effect === 'ombre' ? hidden.slice(0, 1) : hidden).map((x) => ({ slot: x.i, defId: ctx.def(x.sl!.cardId).defId }));
    ctx.emit('public', 'effect', { player: pid, effect: def.effect, status: 'success', detail: seen.length ? 'des Secondaires adverses cachées ont été révélées au propriétaire' : 'aucune Secondaire adverse cachée' });
    ctx.emit(pid, 'peek', { player: pid, source: EFFECTS[def.effect].name, defIds: [], hiddenSlots: seen });
  }
  openPhase(ctx, 'TACTICS');
}

// --- Résolution du Clash -----------------------------------------------------
function resolveClash(ctx: Ctx): void {
  const s = ctx.s;
  const input = {} as ClashInput;
  const plansOf: Record<PlayerId, [TacticPlan | null, TacticPlan | null]> = { p1: [null, null], p2: [null, null] };
  for (const pid of PLAYERS) {
    const p = s.players[pid];
    const c = pend(ctx, pid, 'tactics');
    const active = SLOTS.filter((i) => p.slots[i]?.active).map((i) => ({ slot: i, def: ctx.def(p.slots[i]!.cardId) }));
    const uses: ClashUse[] = [];
    for (const a of active) {
      const plan = c?.plans[a.slot] ?? { mode: 'keep' as const };
      plansOf[pid][a.slot] = plan;
      if (plan.mode === 'keep') continue;
      uses.push(plan.mode === 'interfere' ? { slot: a.slot, def: a.def, mode: 'interfere', target: plan.target! } : { slot: a.slot, def: a.def, mode: plan.mode });
    }
    const tech = c?.technique ?? null;
    if (tech) payTechnique(ctx, pid, tech.id, tech.id === 'Ancrage' ? { slot: tech.slot } : { targetSlot: tech.targetSlot });
    input[pid] = {
      primary: ctx.def(p.primary!.cardId), stance: p.primary!.stance, active, uses,
      ancrageSlot: tech?.id === 'Ancrage' ? tech.slot : null,
      ruptureTarget: tech?.id === 'Rupture' ? tech.targetSlot : null,
    };
  }

  // Révélation commune des usages (après verrouillage simultané), camouflage respecté.
  const tacticsData: Record<string, unknown> = {};
  for (const pid of PLAYERS) {
    const p = s.players[pid];
    tacticsData[pid] = SLOTS.map((i) => {
      const plan = plansOf[pid][i];
      if (!plan || !p.slots[i]?.active) return null;
      const masked = concealed(s, pid, i);
      const def = ctx.def(p.slots[i]!.cardId);
      const prim = input[pid].primary;
      // avenant 09 : bonus sans condition compris (Boussole, Surenchère, Mur de ronces, Zénith, Tison) ; Harmonie et
      // Constellation dépendent des annulations : leur bonus se lit sur le score et le multiplicateur du Clash
      const use: ClashUse = { slot: i, def, mode: plan.mode === 'interfere' ? 'interfere' : plan.mode === 'damage' ? 'damage' : 'rank' };
      const value = plan.mode === 'rank' ? rankSupport(def, prim) + rankBonus(use, input[pid], []) : plan.mode === 'damage' ? damageCoefficient(def, prim) + damageBonus(use, input[pid], []) : null;
      return { slot: i, mode: plan.mode, target: plan.target ?? null, defId: masked ? null : def.defId, family: def.family, masked, value: masked ? null : value, affinity: masked ? null : def.family !== null && def.family === prim.family };
    });
  }
  s.reveal.tactics = tacticsData as NonNullable<GameState['reveal']['tactics']>;
  ctx.emit('public', 'tacticsRevealed', tacticsData);

  const out = computeClash(input);

  for (const pid of PLAYERS) {
    for (const u of out.uses[pid]) {
      if (u.mode !== 'interfere') continue;
      const o = s.players[other(pid)];
      const tMasked = u.target !== undefined && concealed(s, other(pid), u.target);
      ctx.emit('public', 'interference', {
        player: pid, slot: u.slot, target: u.target, success: u.success, cancelled: u.cancelled,
        reason: u.success ? 'cible engagée annulée' : !u.targetEngaged ? 'cible Conservée' : u.targetProtected ? 'cible protégée par son effet' : 'Rang imprimé insuffisant',
        targetDefId: tMasked ? null : u.targetRank !== null ? ctx.def(o.slots[u.target!]!.cardId).defId : null,
        targetFamily: u.targetRank !== null ? ctx.def(o.slots[u.target!]!.cardId).family : null,
      });
    }
  }

  // Dommages simultanés.
  const maskedRank: Record<PlayerId, boolean> = { p1: false, p2: false };
  const maskedMult: Record<PlayerId, boolean> = { p1: false, p2: false };
  for (const pid of PLAYERS) {
    const m = s.players[pid].mask;
    if (!m || !concealed(s, pid, m.target)) continue;
    const u = out.uses[pid].find((x) => x.slot === m.target && !x.cancelled);
    if (u?.mode === 'rank') maskedRank[pid] = true;
    if (u?.mode === 'damage') maskedMult[pid] = true;
  }
  for (const pid of PLAYERS) {
    const p = s.players[pid];
    const d = out.damage[pid];
    if (d > 0) {
      const before = p.hp;
      p.hp = Math.max(0, p.hp - d);
      ctx.emit('public', 'damage', { player: pid, amount: d, base: out.baseDamage[pid], fixed: out.fixedDamage[pid], before, hp: p.hp });
    }
  }
  // Publication (ADR 011) : camouflage évalué au verrouillage, les cases sont encore occupées.
  const conceal: Concealment = {
    hidden: (pid, slot) => concealed(s, pid, slot),
    family: (pid, slot) => ctx.def(s.players[pid].slots[slot]!.cardId).family,
  };
  const seen: Observed = { healed: { p1: 0, p2: 0 }, insightOnlyHidden: { p1: false, p2: false } };
  for (const pid of PLAYERS) {
    const h = out.heal[pid];
    if (h > 0) {
      const p = s.players[pid];
      const before = p.hp;
      p.hp = Math.min(p.maxHp, p.hp + h);
      seen.healed[pid] = p.hp - before;
      const data = { player: pid, amount: p.hp - before, hp: p.hp };
      // Un soin nul venu d’une source camouflée n’a aucune conséquence publique.
      const fromHidden = out.effects.some((e) => e.player === pid && e.consequence?.kind === 'heal' && hiddenSource(e, conceal));
      if (fromHidden && seen.healed[pid] === 0) ctx.emit(pid, 'heal', { ...data, own: true });
      else ctx.emit('public', 'heal', data);
    }
  }
  // Insight : +1 maximum par tour, réserve ≤ 2.
  for (const pid of PLAYERS) {
    const p = s.players[pid];
    if (!out.insightSources[pid].length) continue;
    const gained = p.insightGained === 0 && p.insight < INSIGHT_MAX;
    if (gained) {
      p.insight += 1;
      p.insightGained = 1;
    }
    const pub = publishInsight(pid, out.insightSources[pid], gained, p.insight, conceal);
    seen.insightOnlyHidden[pid] = pub.onlyHidden;
    if (pub.public) ctx.emit('public', 'insight', pub.public);
    if (pub.own) ctx.emit(pid, 'insight', pub.own);
  }
  // Avenant 09 — Éclipse : 1 Insight retiré de la réserve de l'adversaire touché (public ; origine générique si camouflée).
  for (const pid of PLAYERS) {
    if (!out.insightDrain[pid]) continue;
    const p = s.players[pid];
    const lost = Math.min(p.insight, out.insightDrain[pid]);
    p.insight -= lost;
    const src = out.effects.find((e) => e.effect === 'eclipse' && e.status === 'success' && e.player === other(pid));
    const reason = src && hiddenSource(src, conceal) && src.source.kind === 'secondary' ? `effet de la ${maskedOrigin(conceal.family(src.player, src.source.slot), src.source.slot)}` : EFFECTS.eclipse.name;
    ctx.emit('public', 'insight', { player: pid, gain: 0, drain: lost, reasons: [reason], insight: p.insight });
  }
  const publicEffects: PublicEffect[] = [];
  for (const e of out.effects) {
    const pub = publicEffect(e, out.effects, conceal, seen);
    if (pub) {
      publicEffects.push(pub);
      ctx.emit('public', 'effect', { ...pub });
    }
    if (hiddenSource(e, conceal)) ctx.emit(e.player, 'effect', ownerEffect(e));
  }
  for (const pid of PLAYERS) {
    if (!out.detourPeek[pid]) continue;
    const seen = randomHandCard(ctx, other(pid));
    ctx.emit(pid, 'peek', { player: pid, source: 'Détour', defIds: seen ? [ctx.def(seen).defId] : [] });
  }
  // Avenant 09 : regards privés (Écho, Fil d'ombre : main adverse ; Murmure : sommet de la pioche adverse).
  for (const pid of PLAYERS) {
    for (const pk of out.peeks[pid]) {
      const o = s.players[other(pid)];
      const seen = pk.what === 'hand' ? randomHandCard(ctx, other(pid)) : o.deck[o.deck.length - 1] ?? null;
      ctx.emit(pid, 'peek', { player: pid, source: EFFECTS[pk.effect].name, defIds: seen ? [ctx.def(seen).defId] : [], ...(pk.what === 'deck-top' ? { deckTop: true } : {}) });
    }
  }

  // Rapport public.
  const report = buildReport(ctx, input, out, maskedRank, maskedMult, publicEffects);
  s.lastClash = report;
  ctx.emit('public', 'clash', report as unknown as Record<string, unknown>);
  for (const pid of PLAYERS) {
    if (maskedRank[pid] || maskedMult[pid]) ctx.emit(pid, 'clash', { own: true, player: pid, score: out.scores[pid], multiplier: out.multipliers[pid] });
  }

  // Racine camouflée : son effet éventuel, résolu au Repoussement, restera privé (case notée avant consommation).
  const racineUse = out.repelRight?.racine ? out.uses[out.repelRight.owner].find((u) => u.def.effect === 'racine' && u.mode === 'rank' && !u.cancelled) : undefined;
  const racineHiddenSlot = racineUse && concealed(s, out.repelRight!.owner, racineUse.slot) ? racineUse.slot : undefined;

  // Consommation des Secondaires engagées (avant le choix de Repoussement).
  for (const pid of PLAYERS) {
    const p = s.players[pid];
    for (const u of out.uses[pid]) {
      const dest = out.destinations[pid][u.slot] ?? 'discard';
      const sl = p.slots[u.slot]!;
      if (dest === 'stay') {
        ctx.emit('public', 'destination', { player: pid, slot: u.slot, dest, reason: u.cancelled ? 'Ancrage' : 'Lierre' });
        continue;
      }
      // Une carte masquée ce tour n’est pas nommée publiquement avant la fin du tour
      // (évalué AVANT de retirer la carte de son emplacement).
      const masked = concealed(s, pid, u.slot);
      p.slots[u.slot] = null;
      if (dest === 'top') p.deck.push(sl.cardId);
      else if (dest === 'bottom') p.deck.unshift(sl.cardId);
      else {
        p.discard.push(sl.cardId);
        if (masked) p.maskedDiscards.push(sl.cardId);
      }
      ctx.emit('public', 'destination', { player: pid, slot: u.slot, dest, defId: masked ? null : ctx.def(sl.cardId).defId });
    }
  }

  // K.-O. unilatéral : fin immédiate (le Repoussement n’a plus d’objet).
  const dead = PLAYERS.filter((pid) => s.players[pid].hp <= 0);
  if (dead.length === 1) {
    finishPrimaries(ctx, out.primaryToHand);
    s.winner = other(dead[0]!);
    s.phase = 'ENDED';
    s.awaiting = [];
    s.pending = {};
    ctx.emit('public', 'victory', { winner: s.winner, loser: dead[0] });
    return;
  }

  // Repoussement unique.
  s.repel = null;
  if (out.repelRight) {
    const r = out.repelRight;
    const o = s.players[other(r.owner)];
    let choices: SlotIndex[] = [];
    if (r.kind === 'emprise') choices = SLOTS.filter((i) => !!o.slots[i]);
    else choices = SLOTS.filter((i) => o.slots[i] && !o.slots[i]!.active);
    if (choices.length) s.repel = { owner: r.owner, kind: r.kind, choices, toBottom: r.toBottom, racine: r.racine, ...(racineHiddenSlot !== undefined ? { racineHiddenSlot } : {}) };
    else if (r.kind !== 'emprise' && out.ruptureClaim) {
      const t = out.ruptureClaim.target;
      if (o.slots[t]?.active) s.repel = { owner: r.owner, kind: 'rupture', choices: [t], toBottom: false, racine: false };
    }
  }
  for (const pid of PLAYERS) {
    if (input[pid].ruptureTarget === null || input[pid].ruptureTarget === undefined) continue;
    if (s.repel?.kind === 'rupture' && s.repel.owner === pid) continue;
    const detail = !(out.guardWin && out.winner === pid) ? 'la Garde ne gagne pas contre un Assaut' : 'une autre cible de Repoussement existe ou la cible n’est plus active';
    ctx.emit('public', 'effect', { player: pid, effect: 'rupture', status: 'failed', detail, technique: true });
  }
  finishPrimaries(ctx, out.primaryToHand);
  if (s.repel) {
    openPhase(ctx, 'REPEL');
    return;
  }
  endTurn(ctx);
}

function buildReport(ctx: Ctx, input: ClashInput, out: ReturnType<typeof computeClash>, maskedRank: Record<PlayerId, boolean>, maskedMult: Record<PlayerId, boolean>, effects: PublicEffect[]): ClashReport {
  const s = ctx.s;
  const fmt = (n: number) => (Number.isFinite(n) ? String(n) : '∞');
  const publicScores = { p1: maskedRank.p1 ? '?' : fmt(out.scores.p1), p2: maskedRank.p2 ? '?' : fmt(out.scores.p2) };
  const publicMultipliers = { p1: maskedMult.p1 ? '?' : String(out.multipliers.p1), p2: maskedMult.p2 ? '?' : String(out.multipliers.p2) };
  // Public par construction : une valeur camouflée est remplacée par '?' à l’affichage ET par null
  // dans le champ brut ; son propriétaire la reçoit par l’événement privé `clash` (`own`).
  const score = (p: PlayerId) => (maskedRank[p] ? null : Number.isFinite(out.scores[p]) ? out.scores[p] : 'inf' as const);
  const mult = (p: PlayerId) => (maskedMult[p] ? null : out.multipliers[p]);
  return {
    turn: s.turn, outcome: out.outcome, winner: out.winner, guardWin: out.guardWin,
    scores: { p1: score('p1'), p2: score('p2') },
    publicScores, multipliers: { p1: mult('p1'), p2: mult('p2') }, publicMultipliers,
    baseDamage: out.baseDamage, fixedDamage: out.fixedDamage, damage: out.damage, absorbed: out.absorbed,
    powers: { p1: input.p1.primary.power, p2: input.p2.primary.power },
    stances: { p1: input.p1.stance, p2: input.p2.stance },
    cancelled: { p1: out.uses.p1.filter((u) => u.cancelled).map((u) => u.slot), p2: out.uses.p2.filter((u) => u.cancelled).map((u) => u.slot) },
    zeroDamageRankWin: out.zeroDamageRankWin, effects: effects.map((e) => ({ ...e })),
  };
}

function finishPrimaries(ctx: Ctx, toHand?: Record<PlayerId, boolean>): void {
  for (const pid of PLAYERS) {
    const p = ctx.s.players[pid];
    if (p.primary) {
      // avenant 09 : Phénix (battue) et Racines profondes (Garde victorieuse) retournent dans la main
      if (toHand?.[pid]) {
        p.hand.push(p.primary.cardId);
        ctx.emit('public', 'primaryReturned', { player: pid, defId: ctx.def(p.primary.cardId).defId });
      } else p.discard.push(p.primary.cardId);
      p.primary = null;
    }
  }
}

// --- REPEL ------------------------------------------------------------------
function applyRepel(ctx: Ctx): void {
  const s = ctx.s;
  const r = s.repel!;
  const c = pend(ctx, r.owner, 'repel');
  const slot = c?.targetSlot ?? null;
  if (slot === null) {
    ctx.emit('public', 'repelSkipped', { player: r.owner, kind: r.kind });
  } else {
    const o = s.players[other(r.owner)];
    const sl = o.slots[slot]!;
    const wasMasked = concealed(s, other(r.owner), slot);
    o.slots[slot] = null;
    if (o.mask && (o.mask.source === slot || o.mask.target === slot)) o.mask = null;
    const wasHidden = !sl.active;
    if (r.toBottom && wasHidden) o.deck.unshift(sl.cardId);
    else o.hand.push(sl.cardId);
    ctx.emit('public', 'repel', {
      player: r.owner, target: other(r.owner), slot, kind: r.kind,
      dest: r.toBottom && wasHidden ? 'bottom' : 'hand',
      // Une carte cachée repoussée n’est pas révélée publiquement ; une active l’était déjà.
      defId: wasHidden || wasMasked ? null : ctx.def(sl.cardId).defId,
    });
    if (r.kind === 'rupture') ctx.emit('public', 'effect', { player: r.owner, effect: 'rupture', status: 'success', detail: 'Secondaire active renvoyée en main adverse', technique: true });
    if (r.toBottom && wasHidden) ctx.emit('public', 'effect', { player: r.owner, effect: 'entrave', status: 'success', detail: 'carte repoussée placée sous la pioche adverse' });
    if (r.racine && wasHidden) {
      const data = { player: r.owner, effect: 'racine', status: 'success', detail: 'identité de la carte repoussée observée' };
      // Observation privée d’une Racine camouflée : aucune conséquence publique (ADR 011).
      if (r.racineHiddenSlot !== undefined) ctx.emit(r.owner, 'effect', { ...data, own: true, slot: r.racineHiddenSlot });
      else ctx.emit('public', 'effect', data);
      ctx.emit(r.owner, 'peek', { player: r.owner, source: 'Racine', defIds: [ctx.def(sl.cardId).defId] });
    }
  }
  s.repel = null;
  endTurn(ctx);
}

// --- Fin de tour : prolongation, nettoyage ----------------------------------
function endTurn(ctx: Ctx): void {
  const s = ctx.s;
  const dead = PLAYERS.filter((pid) => s.players[pid].hp <= 0);
  if (dead.length === 2) {
    s.overtime += 1;
    for (const pid of PLAYERS) s.players[pid].hp = 1;
    ctx.emit('public', 'overtime', { overtime: s.overtime });
  }
  // Fin du tour : les camouflages expirent ; les cartes camouflées défaussées deviennent publiques (ARB-005).
  for (const pid of PLAYERS) {
    s.players[pid].mask = null;
    s.players[pid].maskedDiscards = [];
  }
  s.phase = 'RESOLVED';
  s.awaiting = [];
  s.pending = {};
  ctx.emit('public', 'turnEnd', { turn: s.turn });
}

export function isOver(state: GameState): boolean {
  return state.phase === 'ENDED';
}

export type { Stance };
