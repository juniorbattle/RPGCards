/**
 * Contrôleur d’application : orchestre le Match (moteur pur), l’IA (sur SA vue), l’état d’UI
 * local (brouillons non verrouillés) et la mise en scène dérivée des événements.
 * L’UI ne lit que `PlayerView` de p1 ; seuls le moteur et l’IA (via `viewFor('p2')`) touchent l’état.
 */
import { cardDef, type Family } from '../game/catalog/cards';
import { TECHNIQUES, type TechniqueId } from '../game/catalog/techniques';
import { decide, PROFILES } from '../game/ai/policy';
import { computeClash, damageCoefficient, rankSupport, type ClashUse } from '../game/engine/clash';
import { checkCommand } from '../game/engine/engine';
import { Match } from '../game/match';
import type { GameConfig, GameEvent, PlayerCommand, SlotIndex, Stance, StartTechnique, TacticPlan, TacticsTechnique } from '../game/model/types';
import { buildJournal, type JournalLine } from '../game/visibility/journal';
import { viewFor, visibleEvents, type PlayerView } from '../game/visibility/view';
import type { ArenaHandle } from '../scene/arena';
import type { AppParams } from './params';
import type { Scenario } from './scenarios';

export type DropKey = 'primary' | 'slot0' | 'slot1' | 'hand';

export interface UiState {
  phaseKey: string;
  selected: string | null;
  draft: { primaryId: string | null; stance: Stance | null; secondaryId: string | null; slot: SlotIndex | null };
  reveal: SlotIndex[];
  trim: string[];
  startTech: StartTechnique | null;
  recentrageArmed: boolean;
  dissipTarget: SlotIndex | null;
  lectureStance: Stance | null;
  plans: [TacticPlan | null, TacticPlan | null];
  menuSlot: SlotIndex | null;
  targetingFor: SlotIndex | null;
  tacticsTech: TacticsTechnique | null;
  techTargeting: 'Ancrage' | 'Rupture' | null;
  inspect: string | null;
  toast: { text: string; kind: 'error' | 'info'; id: number } | null;
  floaters: Array<{ side: 'me' | 'opp'; text: string; heal: boolean; id: number }>;
  flipPrimaries: boolean;
  journalOpen: boolean;
}

const freshUi = (phaseKey: string, keep?: Partial<UiState>): UiState => ({
  phaseKey,
  selected: null,
  draft: { primaryId: null, stance: null, secondaryId: null, slot: null },
  reveal: [],
  trim: [],
  startTech: null,
  recentrageArmed: false,
  dissipTarget: null,
  lectureStance: null,
  plans: [null, null],
  menuSlot: null,
  targetingFor: null,
  tacticsTech: null,
  techTargeting: null,
  inspect: keep?.inspect ?? null,
  toast: null,
  floaters: keep?.floaters ?? [],
  flipPrimaries: false,
  journalOpen: keep?.journalOpen ?? false,
});

export interface Preview {
  myScore: string;
  oppScore: string;
  myMult: number;
  dealt: number;
  taken: number;
  outcome: string;
}

export class Controller {
  match: Match;
  view!: PlayerView;
  journal: JournalLine[] = [];
  ui: UiState;
  aiThinking = false;
  private aiTimer = 0;
  private toastSeq = 0;
  private renderFn: () => void = () => {};
  readonly mySignature: Family;

  constructor(public config: GameConfig, public params: AppParams, public arena: ArenaHandle | null, public scenario: Scenario | null = null) {
    this.match = new Match(config);
    if (scenario) {
      this.match.state = scenario.build(config);
      this.match.events = [];
    }
    this.mySignature = config.players.p1.signature;
    this.ui = freshUi('');
    this.arena?.setFamilies(config.players.p1.signature, config.players.p2.signature);
    this.refresh([]);
  }

  onRender(fn: () => void): void {
    this.renderFn = fn;
  }

  get artSeed(): number {
    return this.params.artSeed;
  }

  // ------------------------------------------------------------------------
  refresh(newEvents: GameEvent[]): void {
    this.view = viewFor(this.match.state, 'p1');
    this.journal = buildJournal(visibleEvents(this.match.events, 'p1'), 'p1');
    const key = `${this.view.turn}:${this.view.phase}`;
    if (key !== this.ui.phaseKey) {
      this.ui = freshUi(key, this.ui);
      // Préremplissages ergonomiques (jamais de choix caché imposé) :
      if (this.view.phase === 'LECTURE_CHANGE') this.ui.lectureStance = this.view.me.primary?.stance ?? null;
    }
    this.playFx(newEvents);
    this.renderFn();
    this.scheduleAi();
  }

  private playFx(events: GameEvent[]): void {
    const vis = visibleEvents(events, 'p1');
    const rel = (pid: unknown) => (pid === 'p1' ? 'me' : 'opp') as 'me' | 'opp';
    for (const e of vis) {
      const d = e.data as Record<string, any>;
      switch (e.kind) {
        case 'primariesRevealed': {
          this.ui.flipPrimaries = true;
          this.arena?.fx({ type: 'reveal' });
          for (const pid of ['p1', 'p2']) {
            const def = cardDef(d[pid].defId);
            if (def.signature) this.arena?.fx({ type: 'signature', family: def.family, side: rel(pid) });
          }
          break;
        }
        case 'interference':
          if (d.success) this.arena?.fx({ type: 'interfere', side: rel(d.player) === 'me' ? 'opp' : 'me' });
          break;
        case 'clash': {
          if (d.own) break;
          const w = d.winner as string | null;
          const prim = this.match.state.reveal.primaries;
          const fam = w && prim ? cardDef(prim[w as 'p1' | 'p2'].defId).family : null;
          this.arena?.fx({ type: 'clash', winner: w ? rel(w) : null, family: fam });
          if (d.guardWin && w) this.arena?.fx({ type: 'guard', side: rel(w) });
          break;
        }
        case 'damage':
          this.arena?.fx({ type: 'damage', side: rel(d.player), amount: d.amount });
          this.floater(rel(d.player), `−${d.amount}`, false);
          break;
        case 'heal':
          this.floater(rel(d.player), `+${d.amount}`, true);
          break;
        case 'overtime':
          this.arena?.fx({ type: 'overtime' });
          break;
        case 'victory':
          this.arena?.fx({ type: 'victory', side: rel(d.winner) });
          break;
      }
    }
  }

  private floater(side: 'me' | 'opp', text: string, heal: boolean): void {
    const id = ++this.toastSeq;
    this.ui.floaters.push({ side, text, heal, id });
    // Retrait ciblé (pas de re-rendu global : un re-rendu pourrait avaler un clic en cours).
    if (!this.params.freeze) window.setTimeout(() => { this.ui.floaters = this.ui.floaters.filter((f) => f.id !== id); document.querySelector(`[data-floater="${id}"]`)?.remove(); }, 1700);
  }

  toast(text: string, kind: 'error' | 'info' = 'error'): void {
    const id = ++this.toastSeq;
    this.ui.toast = { text, kind, id };
    this.renderFn();
    window.setTimeout(() => { if (this.ui.toast?.id === id) { this.ui.toast = null; document.querySelector('.toast')?.remove(); } }, 2600);
  }

  // ------------------------------------------------------------------------
  // IA : décide uniquement sur viewFor('p2') (ou script de scénario identifié).

  private scheduleAi(): void {
    const v2 = viewFor(this.match.state, 'p2');
    if (!v2.awaitingMe || this.aiTimer) return;
    this.aiThinking = true;
    const run = () => {
      this.aiTimer = 0;
      const view = viewFor(this.match.state, 'p2');
      if (!view.awaitingMe) { this.aiThinking = false; return; }
      const key = `${view.turn}:${view.phase}`;
      const script = this.scenario?.rival[key];
      const cmd = script ? script(this.match.state) : decide(view, PROFILES.equilibre, this.config.seed ^ 0xa7);
      this.aiThinking = false;
      if (cmd) this.apply(cmd);
    };
    if (this.params.aiDelay <= 0) run();
    else this.aiTimer = window.setTimeout(run, this.params.aiDelay);
  }

  /** Point d’entrée unique vers le moteur ; refus explicite sans mutation. */
  apply(cmd: PlayerCommand | { type: 'nextTurn' }): boolean {
    if (cmd.type !== 'nextTurn') {
      const reason = checkCommand(this.match.state, cmd);
      if (reason) {
        if (cmd.player === 'p1') this.toast(reason);
        return false;
      }
    }
    const evs = this.match.submit(cmd);
    this.refresh(evs);
    return true;
  }

  // ------------------------------------------------------------------------
  // Engagement : placement direct (clic → case, ou glisser-déposer)

  handIds(): string[] {
    return (this.view.me.hand ?? []).map((c) => c.cardId);
  }

  defIdOf(cardId: string): string {
    const c = (this.view.me.hand ?? []).find((x) => x.cardId === cardId);
    if (c) return c.defId;
    for (const s of this.view.me.slots) if (s?.card?.cardId === cardId) return s.card.defId;
    throw new Error('carte inconnue côté joueur');
  }

  /** Légalité d’un dépôt (pré-contrôle UI ; le moteur reste l’arbitre au verrouillage). */
  dropCheck(cardId: string, key: DropKey): string | null {
    const v = this.view;
    if (key === 'hand') return null;
    if (v.phase !== 'COMMIT' || !v.awaitingMe) return 'Les cartes se posent pendant la phase d’Engagement.';
    if (key === 'primary') return null;
    const def = cardDef(this.defIdOf(cardId));
    if (def.signature) return 'Une Signature ne peut jamais être Secondaire (Primaire uniquement).';
    const slot: SlotIndex = key === 'slot0' ? 0 : 1;
    const full = v.me.slots.every((s) => s !== null);
    if (v.me.slots[slot] && !full) return 'Emplacement occupé : utilisez l’emplacement libre.';
    return null;
  }

  dropCard(cardId: string, key: DropKey): void {
    const reason = this.dropCheck(cardId, key);
    if (reason) { this.toast(reason); return; }
    const dr = this.ui.draft;
    if (key === 'hand') {
      if (dr.primaryId === cardId) { dr.primaryId = null; dr.stance = null; }
      if (dr.secondaryId === cardId) { dr.secondaryId = null; dr.slot = null; }
    } else if (key === 'primary') {
      if (dr.secondaryId === cardId) { dr.secondaryId = null; dr.slot = null; }
      if (dr.primaryId !== cardId) dr.stance = null;
      dr.primaryId = cardId;
    } else {
      if (dr.primaryId === cardId) { dr.primaryId = null; dr.stance = null; }
      dr.secondaryId = cardId;
      dr.slot = key === 'slot0' ? 0 : 1;
    }
    this.ui.selected = null;
    this.renderFn();
  }

  clickHandCard(cardId: string): void {
    const v = this.view;
    if (v.phase === 'START' && v.awaitingMe) {
      if (this.ui.recentrageArmed) {
        this.ui.startTech = { id: 'Recentrage', cardId };
        this.ui.recentrageArmed = false;
        this.ui.trim = this.ui.trim.filter((x) => x !== cardId);
      } else if (v.me.handCount > 4) {
        this.ui.trim = this.ui.trim.includes(cardId) ? this.ui.trim.filter((x) => x !== cardId) : [...this.ui.trim, cardId];
      }
      this.renderFn();
      return;
    }
    if (v.phase !== 'COMMIT' || !v.awaitingMe) { this.ui.inspect = this.defIdOf(cardId); this.renderFn(); return; }
    this.ui.selected = this.ui.selected === cardId ? null : cardId;
    this.ui.inspect = this.defIdOf(cardId);
    this.renderFn();
  }

  clickZone(key: DropKey | 'opp0' | 'opp1'): void {
    const v = this.view;
    if (key === 'opp0' || key === 'opp1') return this.clickOppSlot(key === 'opp0' ? 0 : 1);
    if (v.phase === 'COMMIT' && v.awaitingMe) {
      if (this.ui.selected) return this.dropCard(this.ui.selected, key);
      // Clic sur une carte de brouillon : retour en main.
      const dr = this.ui.draft;
      if (key === 'primary' && dr.primaryId) return this.dropCard(dr.primaryId, 'hand');
      if ((key === 'slot0' || key === 'slot1') && dr.secondaryId && dr.slot === (key === 'slot0' ? 0 : 1)) return this.dropCard(dr.secondaryId, 'hand');
      return;
    }
    if (key === 'slot0' || key === 'slot1') this.clickMySlot(key === 'slot0' ? 0 : 1);
  }

  setStance(st: Stance): void {
    if (this.view.phase === 'LECTURE_CHANGE') { this.ui.lectureStance = st; this.renderFn(); return; }
    if (this.view.phase !== 'COMMIT' || !this.ui.draft.primaryId) { this.toast('Posez d’abord une Primaire.'); return; }
    this.ui.draft.stance = st;
    this.renderFn();
  }

  lockCommit(): void {
    const dr = this.ui.draft;
    if (!dr.primaryId) return this.toast('Une Primaire est obligatoire.');
    if (!dr.stance) return this.toast('Choisissez le mode de la Primaire : ASSAUT ou GARDE.');
    const full = this.view.me.slots.every((s) => s !== null);
    const cmd: PlayerCommand = {
      type: 'commit', player: 'p1', primaryId: dr.primaryId, stance: dr.stance,
      secondaryId: dr.secondaryId, replaceSlot: dr.secondaryId && full ? dr.slot : null,
      ...(dr.secondaryId && !full && dr.slot !== null ? { slot: dr.slot } : {}),
    };
    this.apply(cmd);
  }

  // ------------------------------------------------------------------------
  // Début de tour / préparation / Dissipation / Lecture

  toggleStartTech(t: TechniqueId): void {
    if (t === 'Sondage') this.ui.startTech = this.ui.startTech?.id === 'Sondage' ? null : { id: 'Sondage' };
    if (t === 'Recentrage') {
      if (this.ui.startTech?.id === 'Recentrage') this.ui.startTech = null;
      else { this.ui.recentrageArmed = !this.ui.recentrageArmed; if (this.ui.recentrageArmed) this.toast('Recentrage : cliquez la carte de main à placer sous la pioche.', 'info'); }
    }
    this.renderFn();
  }

  lockStart(): void {
    this.apply({ type: 'start', player: 'p1', discard: this.ui.trim, technique: this.ui.startTech });
  }

  toggleReveal(slot: SlotIndex): void {
    const s = this.view.me.slots[slot];
    if (!s) return;
    if (s.state === 'charging') return this.toast('Secondaire en chargement : révélation possible au tour suivant seulement.');
    if (s.state === 'active') return this.toast('Cette Secondaire est déjà active.');
    this.ui.reveal = this.ui.reveal.includes(slot) ? this.ui.reveal.filter((x) => x !== slot) : [...this.ui.reveal, slot];
    this.renderFn();
  }

  lockPrepare(): void {
    this.apply({ type: 'prepare', player: 'p1', reveal: this.ui.reveal });
  }

  lockDissipation(use: boolean): void {
    this.apply({ type: 'dissipate', player: 'p1', targetSlot: use ? this.ui.dissipTarget : null });
  }

  lecture(use: boolean): void {
    this.apply({ type: 'lecture', player: 'p1', use });
  }

  lockLectureStance(): void {
    this.apply({ type: 'lectureStance', player: 'p1', stance: this.ui.lectureStance ?? this.view.me.primary?.stance ?? 'assault' });
  }

  // ------------------------------------------------------------------------
  // Tactique : actions contextuelles sur les Secondaires actives

  clickMySlot(slot: SlotIndex): void {
    const v = this.view;
    const s = v.me.slots[slot];
    if (v.phase === 'PREPARE' && v.awaitingMe) return this.toggleReveal(slot);
    if (v.phase === 'TACTICS' && v.awaitingMe) {
      if (this.ui.techTargeting === 'Ancrage') {
        const plan = this.ui.plans[slot];
        if (!s || s.state !== 'active' || !plan || plan.mode === 'keep') return this.toast('Ancrage : désignez une de vos Secondaires engagées (Rang, Dégâts ou Interférer).');
        this.ui.tacticsTech = { id: 'Ancrage', slot };
        this.ui.techTargeting = null;
        return this.renderFn();
      }
      if (!s) return;
      if (s.state === 'charging') return this.toast('Secondaire en chargement : inutilisable ce tour.');
      if (s.state === 'hidden') return this.toast('Réserve cachée inactive : révélez-la au début d’un tour pour l’utiliser.');
      this.ui.menuSlot = this.ui.menuSlot === slot ? null : slot;
      this.ui.targetingFor = null;
      return this.renderFn();
    }
    if (s?.card) { this.ui.inspect = s.card.defId; this.renderFn(); }
  }

  /** Raison d’indisponibilité d’un mode pour un emplacement (null = disponible). */
  modeBlocked(slot: SlotIndex, mode: TacticPlan['mode']): string | null {
    const v = this.view;
    if (mode === 'damage' && v.me.primary?.stance !== 'assault') return 'Dégâts exige une Primaire en Assaut';
    if (mode === 'interfere') {
      const legal = this.legalTargets(slot);
      if (!legal.length) return v.opp.slots.some((s) => s?.state === 'active') ? 'Rang imprimé insuffisant' : 'Aucune Secondaire adverse active';
    }
    return null;
  }

  legalTargets(slot: SlotIndex): SlotIndex[] {
    const v = this.view;
    const mine = v.me.slots[slot];
    if (!mine?.card) return [];
    const r = cardDef(mine.card.defId).rank ?? 0;
    const out: SlotIndex[] = [];
    for (const t of v.opp.slots) {
      if (!t || t.state !== 'active') continue;
      if (!t.card || t.masked) { out.push(t.slot); continue; } // cible masquée : à l’aveugle (§7.3)
      if (r >= (cardDef(t.card.defId).rank ?? 0)) out.push(t.slot);
    }
    return out;
  }

  choosePlan(slot: SlotIndex, mode: TacticPlan['mode']): void {
    const blocked = this.modeBlocked(slot, mode);
    if (blocked) return this.toast(blocked);
    if (mode === 'interfere') {
      this.ui.targetingFor = slot;
      this.ui.menuSlot = null;
      this.toast('Interférer : cliquez une Secondaire adverse active (surlignée).', 'info');
      return this.renderFn();
    }
    this.ui.plans[slot] = { mode };
    if (this.ui.tacticsTech?.id === 'Ancrage' && this.ui.tacticsTech.slot === slot && mode === 'keep') this.ui.tacticsTech = null;
    this.ui.menuSlot = null;
    this.renderFn();
  }

  clickOppSlot(slot: SlotIndex): void {
    const v = this.view;
    const s = v.opp.slots[slot];
    if (v.phase === 'DISSIPATION' && v.awaitingMe) {
      if (!s?.maskSource) return this.toast('Dissipation : visez la Secondaire adverse qui maintient le camouflage (Dissimulation).');
      this.ui.dissipTarget = this.ui.dissipTarget === slot ? null : slot;
      return this.renderFn();
    }
    if (v.phase === 'REPEL' && v.repel?.mine) {
      if (!v.repel.choices.includes(slot)) return this.toast('Cible de Repoussement non admissible (seules les Secondaires cachées, sauf Emprise/Rupture).');
      return void this.apply({ type: 'repel', player: 'p1', targetSlot: slot });
    }
    if (v.phase === 'TACTICS' && v.awaitingMe) {
      if (this.ui.techTargeting === 'Rupture') {
        if (s?.state !== 'active') return this.toast('Rupture : visez une Secondaire adverse active.');
        this.ui.tacticsTech = { id: 'Rupture', targetSlot: slot };
        this.ui.techTargeting = null;
        return this.renderFn();
      }
      if (this.ui.targetingFor !== null) {
        const from = this.ui.targetingFor;
        if (!s || s.state !== 'active') return this.toast('Interférence : la cible doit être une Secondaire adverse ACTIVE (pas cachée ni en chargement).');
        if (!this.legalTargets(from).includes(slot)) return this.toast('Interférence : Rang imprimé insuffisant contre cette cible.');
        this.ui.plans[from] = { mode: 'interfere', target: slot };
        this.ui.targetingFor = null;
        return this.renderFn();
      }
    }
    if (s?.card) { this.ui.inspect = s.card.defId; this.renderFn(); }
  }

  toggleTacticsTech(t: 'Ancrage' | 'Rupture'): void {
    if (this.ui.tacticsTech?.id === t || this.ui.techTargeting === t) {
      this.ui.tacticsTech = null;
      this.ui.techTargeting = null;
    } else {
      if (t === 'Rupture' && this.view.me.primary?.stance !== 'guard') return this.toast('Rupture exige une Primaire en Garde.');
      this.ui.techTargeting = t;
      this.ui.tacticsTech = null;
      this.toast(t === 'Ancrage' ? 'Ancrage : cliquez une de vos Secondaires engagées.' : 'Rupture : cliquez une Secondaire adverse active.', 'info');
    }
    this.renderFn();
  }

  lockTactics(): void {
    this.apply({ type: 'tactics', player: 'p1', plans: this.ui.plans, technique: this.ui.tacticsTech });
  }

  skipRepel(): void {
    this.apply({ type: 'repel', player: 'p1', targetSlot: null });
  }

  nextTurn(): void {
    if (this.view.phase === 'RESOLVED') this.apply({ type: 'nextTurn' });
  }

  cancel(): void {
    this.ui.selected = null;
    this.ui.menuSlot = null;
    this.ui.targetingFor = null;
    this.ui.techTargeting = null;
    this.ui.recentrageArmed = false;
    this.renderFn();
  }

  canUseTech(t: TechniqueId): boolean {
    const me = this.view.me;
    return me.techniques.includes(t) && me.techniqueUsed === null && me.insight >= TECHNIQUES[t].cost;
  }

  // ------------------------------------------------------------------------
  /** Prévision PROVISOIRE (§13.3) : hypothèse « l’adversaire conserve tout » — aucune info cachée. */
  preview(): Preview | null {
    const v = this.view;
    const prim = v.reveal.primaries;
    if (!prim || v.phase !== 'TACTICS') return null;
    const myPrim = cardDef(prim.me.defId);
    const oppPrim = cardDef(prim.opp.defId);
    const myActive = v.me.slots.filter((s) => s?.state === 'active' && s.card).map((s) => ({ slot: s!.slot, def: cardDef(s!.card!.defId) }));
    const uses: ClashUse[] = [];
    for (const a of myActive) {
      const p = this.ui.plans[a.slot];
      if (!p || p.mode === 'keep') continue;
      if (p.mode === 'interfere') uses.push({ slot: a.slot, def: a.def, mode: 'interfere', target: p.target! });
      else uses.push({ slot: a.slot, def: a.def, mode: p.mode });
    }
    const oppActive = v.opp.slots.filter((s) => s?.state === 'active' && s.card && !s.masked).map((s) => ({ slot: s!.slot, def: cardDef(s!.card!.defId) }));
    const out = computeClash({
      p1: { primary: myPrim, stance: prim.me.stance, active: myActive, uses },
      p2: { primary: oppPrim, stance: prim.opp.stance, active: oppActive, uses: [] },
    });
    const fmt = (n: number) => (Number.isFinite(n) ? String(n) : '∞');
    let outcome = '';
    if (out.outcome === 'double-guard') outcome = 'Deux Gardes : aucune blessure';
    else if (out.outcome === 'tie-assault') outcome = 'Égalité d’Assauts : impacts simultanés';
    else if (out.guardWin) outcome = out.winner === 'p1' ? 'Votre Garde l’emporte' : 'La Garde adverse l’emporte';
    else outcome = out.winner === 'p1' ? (out.zeroDamageRankWin ? 'Vous dominez au Rang mais la Garde absorbe tout (0)' : 'Vous dominez au Rang') : 'Le rival domine au Rang';
    return { myScore: fmt(out.scores.p1), oppScore: fmt(out.scores.p2), myMult: out.multipliers.p1, dealt: out.damage.p2, taken: out.damage.p1, outcome };
  }

  supportLabel(slot: SlotIndex, mode: 'rank' | 'damage'): string {
    const v = this.view;
    const s = v.me.slots[slot];
    const prim = v.reveal.primaries?.me.defId ?? v.me.primary?.card?.defId;
    if (!s?.card || !prim) return '';
    const sd = cardDef(s.card.defId);
    const pd = cardDef(prim);
    if (mode === 'rank') return `+${rankSupport(sd, pd)}${sd.family === pd.family ? ' (affinité +1)' : ''}`;
    return `×${damageCoefficient(sd, pd)}${sd.family === pd.family ? ' (même famille)' : sd.effect === 'prisme' ? ' (Prisme)' : sd.effect === 'convergence' ? ' (Convergence)' : ''}`;
  }
}
