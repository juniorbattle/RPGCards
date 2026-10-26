/**
 * Contrôleur d’application : orchestre le Match (moteur pur), l’IA (sur SA vue), l’état d’UI
 * local (brouillons non verrouillés) et la mise en scène dérivée des événements.
 * L’UI ne lit que `PlayerView` de p1 ; seuls le moteur et l’IA (via `viewFor('p2')`) touchent l’état.
 */
import { cardDef, type Family } from '../game/catalog/cards';
import { son } from '../son/moteur';
import { sonsDuDuel } from '../son/evenements';
import { TECHNIQUES, type TechniqueId } from '../game/catalog/techniques';
import { decide, PROFILES } from '../game/ai/policy';
import { buildMemory } from '../game/ai/memory';
import { computeClash, damageCoefficient, rankSupport, type ClashUse } from '../game/engine/clash';
import { checkCommand } from '../game/engine/engine';
import { Match } from '../game/match';
import type { Command, GameConfig, GameEvent, PlayerCommand, PlayerId, SlotIndex, Stance, StartTechnique, TacticPlan, TacticsTechnique } from '../game/model/types';
import { buildJournal, type JournalLine } from '../game/visibility/journal';
import { viewFor, visibleEvents, type PlayerView } from '../game/visibility/view';
import type { ArenaHandle } from '../scene/arena';
import { PresentationDirector, type DirectorInput, type ViewMode } from '../presentation/director';
import { ExpressionDirector, type Expression } from '../presentation/expression';
import type { RivalPersonality } from '../presentation/personalities';
import { buildClashScript, stepForBeat, type ClashScript, type MotionStep } from '../presentation/clashMotion';
import { BEAT_ORDER, buildResolutionBeats, hpAfterBeat, hpBeforeSequence, resolutionStart, type Beat, type BeatKind } from '../presentation/beats';
import type { AppParams } from './params';
import type { Scenario } from './scenarios';

export type DropKey = 'primary' | 'slot0' | 'slot1' | 'hand';

/** Intentions de mise en scène du Clash (consommées par la scène DOM, jamais par le moteur). */
export type MotionEvent =
  | { type: 'begin'; script: ClashScript | null }
  | { type: 'step'; step: MotionStep }
  | { type: 'end' }
  | { type: 'stop' };

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
  private beatFn: (() => void) | null = null;
  /** Famille de la Signature du joueur (tenue du portrait du HUD) ; `null` : sans Signature (avenant M10-A, AV-04). */
  readonly mySignature: Family | null;
  readonly director = new PresentationDirector();
  viewMode: ViewMode = 'A';
  readonly expr: ExpressionDirector;
  /** Dernière expression visible du rival (affichage d’une légende, QA). */
  rivalExpression: Expression | null = null;
  /**
   * Séquence de résolution en cours (présentation pure ; l’état moteur est déjà final).
   * `before` = vue du joueur juste avant la résolution : le plateau la montre jusqu’au temps des
   * destinations (les Secondaires engagées restent visibles pendant le Clash, puis partent).
   */
  seq: { beats: Beat[]; index: number; hp: Record<PlayerId, number>; hidden: Set<number>; done: boolean; rendered: boolean; before: PlayerView | null; events: GameEvent[]; script: ClashScript | null } | null = null;
  private exprFn: (() => void) | null = null;
  private motionFn: ((m: MotionEvent) => void) | null = null;
  private seqTimer = 0;
  private exprQueue: Expression[] = [];
  private exprTimer = 0;
  private dragging = false;
  private lastTurn = 0;
  private holdSeq = 0;
  private commandFn: (() => void) | null = null;
  /** Vrai après `dispose()` : plus aucune minuterie, commande ni rendu (sortie du duel sans rechargement). */
  disposed = false;

  /**
   * `resume` : commandes déjà jouées de ce duel (reprise après fermeture). Elles sont rejouées sur le
   * moteur pur avant le premier affichage, sans mise en scène : même état, même journal, mêmes secrets.
   */
  constructor(public config: GameConfig, public params: AppParams, public arena: ArenaHandle | null, public scenario: Scenario | null = null, public rival: RivalPersonality, resume: readonly Command[] = []) {
    this.expr = new ExpressionDirector('p2', rival, params.artSeed ^ config.seed);
    this.match = new Match(config);
    if (scenario) {
      this.match.state = scenario.build(config);
      this.match.events = [];
    }
    for (const cmd of resume) this.match.submit(cmd);
    this.mySignature = config.players.p1.signature;
    this.ui = freshUi('');
    this.arena?.setFamilies(config.players.p1.signature, config.players.p2.signature);
    this.refresh([]);
  }

  onRender(fn: () => void): void {
    this.renderFn = fn;
  }

  /** Mise à jour ciblée d’un temps de résolution (sans recréer les boutons). */
  onBeat(fn: () => void): void {
    this.beatFn = fn;
  }

  /** Mise à jour ciblée de la bulle du rival (nouvelle expression publique). */
  onExpression(fn: () => void): void {
    this.exprFn = fn;
  }

  /** Mise en scène du Clash (M03) : intentions dérivées du résultat résolu. */
  onMotion(fn: (m: MotionEvent) => void): void {
    this.motionFn = fn;
  }

  /** Après chaque commande acceptée par le moteur (joueur OU rival) : point de sauvegarde. */
  onCommand(fn: () => void): void {
    this.commandFn = fn;
  }

  /** Arrête toutes les minuteries (IA, séquence, expressions) : le contrôleur devient inerte. */
  dispose(): void {
    this.disposed = true;
    window.clearTimeout(this.aiTimer);
    window.clearTimeout(this.seqTimer);
    window.clearTimeout(this.exprTimer);
    this.aiTimer = this.seqTimer = this.exprTimer = 0;
    this.renderFn = () => {};
    this.beatFn = this.exprFn = this.motionFn = this.commandFn = null;
  }

  get artSeed(): number {
    return this.params.artSeed;
  }

  // ------------------------------------------------------------------------
  refresh(newEvents: GameEvent[]): void {
    const before = (this.view as PlayerView | undefined) ?? null;
    // M11-E : sons des événements publics et des événements privés du joueur (jamais ceux de l'adversaire) ; aucun son
    // pour un rejeu en bloc (reprise d'un duel) ; sans geste ni en QA, le moteur du son ne joue rien.
    if (newEvents.length < 60) for (const x of sonsDuDuel(newEvents, 'p1')) son().jouer(x);
    this.view = viewFor(this.match.state, 'p1');
    // Une résolution de Clash est présentée par temps successifs ; le reste est immédiat.
    const start = resolutionStart(newEvents);
    const immediate = start >= 0 ? newEvents.slice(0, start) : newEvents;
    if (start >= 0) this.startSequence(newEvents.slice(start), before);
    this.rebuildJournal();
    const key = `${this.view.turn}:${this.view.phase}`;
    if (key !== this.ui.phaseKey) {
      const draftBefore = this.ui.draft;
      this.ui = freshUi(key, this.ui);
      // Préremplissages ergonomiques (jamais de choix caché imposé) :
      if (this.view.phase === 'LECTURE_CHANGE') this.ui.lectureStance = this.view.me.primary?.stance ?? null;
      // Avenant 08, amendement 1 : pendant la révision du rival, mon engagement verrouillé reste affiché ; pour la mienne,
      // le brouillon reprend mon engagement verrouillé (je le garde ou je le modifie).
      const rev = this.view.revision;
      if (this.view.phase === 'REVISION' && rev?.player === 'opp') this.ui.draft = draftBefore;
      if (this.view.phase === 'REVISION' && rev?.player === 'me' && rev.held) {
        const held = rev.held;
        this.ui.draft = { primaryId: held.primaryId, stance: held.stance, secondaryId: held.secondaryId, slot: held.secondaryId ? (held.replaceSlot ?? held.slot ?? null) : null };
      }
    }
    this.playFx(immediate);
    this.updateView();
    this.arena?.setRivalHand(this.view.opp.handCount);
    // Réactions du rival : uniquement des faits PUBLICS (filtrage interne de l’ExpressionDirector).
    this.pushReactions(this.expr.observe(immediate));
    if (start >= 0) this.advanceBeat();
    else this.renderFn();
    this.scheduleAi();
  }

  private rebuildJournal(): void {
    const hidden = this.seq && !this.seq.done ? this.seq.hidden : null;
    const evs = visibleEvents(this.match.events, 'p1').filter((e) => !hidden || !hidden.has(e.seq));
    this.journal = buildJournal(evs, 'p1');
  }

  // ------------------------------------------------------------------------
  // Séquence de résolution (M02 §4)

  private startSequence(events: GameEvent[], before: PlayerView | null): void {
    window.clearTimeout(this.seqTimer);
    const beats = buildResolutionBeats(events, { viewer: 'p1', primaries: this.view.reveal.primaries ? { p1: this.view.reveal.primaries.me, p2: this.view.reveal.primaries.opp } : null });
    const finalHp = { p1: this.view.me.hp, p2: this.view.opp.hp };
    const vis = visibleEvents(events, 'p1');
    const prim = this.view.reveal.primaries;
    const script = buildClashScript(vis, 'p1', prim ? { p1: prim.me, p2: prim.opp } : null);
    this.seq = { beats, index: -1, hp: hpBeforeSequence(events, finalHp), hidden: new Set(vis.map((e) => e.seq)), done: false, rendered: false, before, events: vis, script };
    this.motionFn?.({ type: 'begin', script });
  }

  /** Vrai si la séquence a atteint (ou dépassé) l’étape `kind` — ou s’il n’y a pas de séquence. */
  reached(kind: BeatKind): boolean {
    const q = this.seq;
    if (!q || q.done) return true;
    const cur = q.beats[q.index];
    if (!cur) return false;
    return BEAT_ORDER.indexOf(cur.kind) >= BEAT_ORDER.indexOf(kind);
  }

  /** Vue du plateau : instantané d’avant la résolution tant que les cartes engagées n’ont pas « quitté » la table. */
  boardView(): PlayerView {
    const q = this.seq;
    if (q && !q.done && q.before && !this.reached('destination')) return q.before;
    return this.view;
  }

  /** Main / pioche / défausse affichées (mises en scène avec le départ des cartes vers la défausse). */
  displayCounts(who: 'me' | 'opp'): { hand: number; deck: number; discard: number } {
    const s = who === 'me' ? this.boardView().me : this.boardView().opp;
    return { hand: s.handCount, deck: s.deckCount, discard: s.discard.length };
  }

  /** Où montrer une Primaire révélée : sur sa case, sur la scène du Clash, ou nulle part (défaussée). */
  primaryOnBoard(): 'card' | 'stage' | 'gone' {
    const ph = this.view.phase;
    if (this.sequencing) {
      if (!this.reached('rank')) return 'card';
      if (!this.reached('destination')) return 'stage';
      return 'gone';
    }
    return ph === 'LECTURE' || ph === 'LECTURE_CHANGE' || ph === 'TACTICS' ? 'card' : 'gone';
  }

  /** Badge de tactique révélée : visible sur une carte encore présente sur la case. */
  tacticShown(who: 'me' | 'opp', slot: SlotIndex): boolean {
    if (this.sequencing && !this.reached('tactics')) return false;
    const s = who === 'me' ? this.boardView().me.slots[slot] : this.boardView().opp.slots[slot];
    return !!s;
  }

  /** ANNULÉ (Interférence) : affiché une fois le temps des Interférences joué. */
  cancelShown(): boolean {
    return this.reached('interference');
  }

  private beatDelay(b: Beat): number {
    const base = b.kind === 'rank' || b.kind === 'outcome' ? 1700 : b.kind === 'damage' || b.kind === 'overtime' || b.kind === 'victory' ? 1500 : 1150;
    return base * this.paceFactor();
  }

  /** Joue le temps suivant (FX, réactions, PV, journal) puis programme le suivant. */
  advanceBeat(): void {
    const q = this.seq;
    if (!q || q.done || this.disposed) return;
    window.clearTimeout(this.seqTimer);
    this.seqTimer = 0;
    const stopAt = this.params.freeze && this.params.beat !== null ? this.params.beat : null;
    for (;;) {
      q.index++;
      const b = q.beats[q.index];
      if (!b) return this.finishSequence();
      q.hp = hpAfterBeat(q.hp, b);
      for (const e of b.events) q.hidden.delete(e.seq);
      this.playFx(b.events);
      this.pushReactions(this.expr.observe(b.events));
      // Chorégraphie du Clash : émise AVANT la mise à jour du plateau (les cartes quittent leurs cases).
      const step = stepForBeat(b.kind);
      if (step) this.motionFn?.({ type: 'step', step });
      // Captures (freeze) : arrêt sur le temps demandé ; rythme instantané : enchaînement immédiat.
      if (stopAt !== null && q.index >= stopAt) break;
      if (this.params.freeze || this.params.pace === 'instant') continue;
      break;
    }
    this.rebuildJournal();
    // Premier temps : rendu complet (le bandeau passe en mode résolution) ; ensuite, patch ciblé.
    if (!q.rendered || !this.beatFn) { q.rendered = true; this.renderFn(); }
    else this.beatFn();
    if (!this.params.freeze && this.params.pace !== 'instant') this.seqTimer = window.setTimeout(() => this.advanceBeat(), this.beatDelay(q.beats[q.index]!));
  }

  /** QA uniquement (`?qa=1`) : fige la séquence sur le temps courant (pellicules déterministes). */
  pauseSequence(): void {
    window.clearTimeout(this.seqTimer);
    this.seqTimer = 0;
  }

  /** Termine immédiatement la séquence (bouton Passer, ou nouvelle commande valide). */
  skipSequence(): void {
    const q = this.seq;
    if (!q || q.done) return;
    window.clearTimeout(this.seqTimer);
    let last: Beat | null = null;
    for (q.index++; q.index < q.beats.length; q.index++) {
      const b = q.beats[q.index]!;
      q.hp = hpAfterBeat(q.hp, b);
      last = b;
    }
    if (last) this.pushReactions(this.expr.observe(last.events));
    this.motionFn?.({ type: 'stop' });
    this.finishSequence();
  }

  private finishSequence(): void {
    if (!this.seq) return;
    window.clearTimeout(this.seqTimer);
    this.seqTimer = 0;
    this.seq.done = true;
    this.seq.index = this.seq.beats.length;
    this.motionFn?.({ type: 'end' });
    this.rebuildJournal();
    this.renderFn();
    this.scheduleAi();
  }

  get sequencing(): boolean {
    return !!this.seq && !this.seq.done;
  }

  currentBeat(): Beat | null {
    const q = this.seq;
    return q && !q.done ? q.beats[q.index] ?? null : null;
  }

  /** PV affichés : mis en scène pendant la séquence, sinon PV réels publics. */
  displayHp(who: 'me' | 'opp'): number {
    const pid: PlayerId = who === 'me' ? 'p1' : 'p2';
    if (this.sequencing) return this.seq!.hp[pid];
    return who === 'me' ? this.view.me.hp : this.view.opp.hp;
  }

  // ------------------------------------------------------------------------
  // Vues A/B (présentation uniquement)

  directorInput(): DirectorInput {
    const v = this.view;
    return { phase: v.phase, turn: v.turn, awaitingMe: v.awaitingMe, repelMine: !!v.repel?.mine };
  }

  private updateView(): void {
    // Nouveau tour : on regarde d’abord le rival (vue A), puis la caméra descend vers la table.
    if (this.view.turn !== this.lastTurn) {
      this.lastTurn = this.view.turn;
      const instant = this.params.pace === 'instant' || (this.params.freeze && !this.params.intro);
      // Pas de minuterie : une réorganisation déclenchée par le temps pourrait dévier un clic en
      // cours. Le regard vers le rival dure jusqu’à la première interaction du joueur (voir main.ts).
      if (!instant) { this.director.startHold(); this.holdSeq++; }
    }
    const forced = this.params.view;
    this.viewMode = forced === 'A' || forced === 'B' ? forced : this.director.update(this.directorInput());
    this.arena?.setView(this.viewMode);
  }

  /** Jeton du temps d’observation en cours (change à chaque nouveau tour observé). */
  get holdToken(): number {
    return this.holdSeq;
  }

  /**
   * Fin du temps d’observation : le joueur commence à manipuler. `token` = jeton lu au DÉBUT de
   * l’interaction ; une interaction commencée avant ce tour (le clic « Tour suivant » lui-même)
   * ne l’achève donc pas.
   */
  endHold(token?: number): void {
    if (!this.director.holding) return;
    if (token !== undefined && token !== this.holdSeq) return;
    const before = this.viewMode;
    this.director.releaseHold(this.directorInput());
    this.updateView();
    if (this.viewMode !== before) this.renderFn();
  }

  toggleView(): void {
    if (this.params.view !== 'auto') this.params.view = 'auto';
    this.viewMode = this.director.toggle(this.directorInput());
    this.arena?.setView(this.viewMode);
    this.renderFn();
  }

  setDragging(v: boolean): void {
    if (v === this.dragging) return;
    this.dragging = v;
    const before = this.viewMode;
    this.director.setFrozen(v, this.directorInput());
    if (!v) {
      this.updateView();
      if (this.viewMode !== before) this.renderFn();
    }
  }

  // ------------------------------------------------------------------------
  // Expressions du rival

  baselineExpression(): Expression {
    const v = this.view;
    return this.expr.baseline({
      phase: v.phase,
      rivalDeciding: v.awaitingOpponent,
      playerDeciding: v.awaitingMe,
      rivalHpRatio: v.opp.hp / v.opp.maxHp,
      playerHpRatio: v.me.hp / v.me.maxHp,
    });
  }

  private pushReactions(list: Expression[]): void {
    if (this.params.freeze) {
      // Captures : on fige la dernière réaction ; l’expression de base n’écrase pas une réaction.
      if (list.length) this.showExpression(list[list.length - 1]!);
      else if (!this.rivalExpression || this.rivalExpression.hold === 0) this.showExpression(this.baselineExpression());
      return;
    }
    if (list.length) {
      this.exprQueue.push(...list);
      if (this.exprQueue.length > 4) this.exprQueue = this.exprQueue.slice(-4);
    }
    if (!this.exprTimer) this.pumpExpression();
  }

  private pumpExpression(): void {
    if (this.disposed) return;
    const next = this.exprQueue.shift();
    if (!next) {
      this.exprTimer = 0;
      this.showExpression(this.baselineExpression());
      return;
    }
    this.showExpression(next);
    this.exprTimer = window.setTimeout(() => this.pumpExpression(), next.hold * 1000 * this.paceFactor());
  }

  private showExpression(e: Expression): void {
    if (this.params.pose) e = { mood: this.params.pose as Expression['mood'], intensity: 1, gaze: 'player', gesture: null, hold: 0, cause: 'pose de revue (QA)' };
    this.rivalExpression = e;
    this.arena?.expression(e);
    this.exprFn?.();
  }

  /** Facteur de rythme des animations (présentation seulement, jamais le moteur). */
  paceFactor(): number {
    return this.params.pace === 'fast' ? 0.45 : this.params.pace === 'instant' ? 0.15 : 1;
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
            if (def.signature && def.family) this.arena?.fx({ type: 'signature', family: def.family, side: rel(pid) });
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
    if (this.disposed) return;
    const v2 = viewFor(this.match.state, 'p2');
    if (!v2.awaitingMe || this.aiTimer) return;
    if (this.sequencing) return; // le rival attend la fin de la mise en scène (relancé à la fin)
    this.aiThinking = true;
    const run = () => {
      this.aiTimer = 0;
      if (this.disposed) return;
      const view = viewFor(this.match.state, 'p2');
      if (!view.awaitingMe) { this.aiThinking = false; return; }
      const key = `${view.turn}:${view.phase}`;
      const script = this.scenario?.rival[key];
      // Mémoire : uniquement les événements visibles du siège du rival (p2).
      const memory = buildMemory(visibleEvents(this.match.events, 'p2'), 'p2');
      const cmd = script ? script(this.match.state) : decide(view, PROFILES[this.rival.aiProfile] ?? PROFILES.equilibre!, this.config.seed ^ 0xa7, memory);
      this.aiThinking = false;
      if (cmd) this.apply(cmd);
    };
    if (this.params.aiDelay <= 0) run();
    else this.aiTimer = window.setTimeout(run, this.params.aiDelay);
  }

  /** Point d’entrée unique vers le moteur ; refus explicite sans mutation. */
  apply(cmd: PlayerCommand | { type: 'nextTurn' }): boolean {
    if (this.disposed) return false;
    // Une animation ne bloque jamais une commande valide : la séquence est achevée d’abord.
    if (this.sequencing && (cmd.type === 'nextTurn' || checkCommand(this.match.state, cmd) === null)) this.skipSequence();
    if (cmd.type !== 'nextTurn') {
      const reason = checkCommand(this.match.state, cmd);
      if (reason) {
        if (cmd.player === 'p1') this.toast(reason);
        return false;
      }
    }
    const evs = this.match.submit(cmd);
    this.refresh(evs);
    this.commandFn?.();
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
    if (!this.editingCommit()) return 'Les cartes se posent pendant la phase d’Engagement.';
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
    if (!this.editingCommit()) { this.ui.inspect = this.defIdOf(cardId); this.renderFn(); return; }
    this.ui.selected = this.ui.selected === cardId ? null : cardId;
    this.ui.inspect = this.defIdOf(cardId);
    this.renderFn();
  }

  clickZone(key: DropKey | 'opp0' | 'opp1'): void {
    const v = this.view;
    if (key === 'opp0' || key === 'opp1') return this.clickOppSlot(key === 'opp0' ? 0 : 1);
    if (this.editingCommit()) {
      if (this.ui.selected) return this.dropCard(this.ui.selected, key);
      // Clic sur une carte de brouillon : retour en main.
      const dr = this.ui.draft;
      if (key === 'primary' && dr.primaryId) return this.dropCard(dr.primaryId, 'hand');
      if ((key === 'slot0' || key === 'slot1') && dr.secondaryId && dr.slot === (key === 'slot0' ? 0 : 1)) return this.dropCard(dr.secondaryId, 'hand');
      return;
    }
    if (key === 'slot0' || key === 'slot1') this.clickMySlot(key === 'slot0' ? 0 : 1);
  }

  /**
   * M07 — pose en un geste depuis les boutons de la carte choisie (comme « Invoquer / Poser ») : Primaire en
   * ASSAUT ou en GARDE, ou Secondaire cachée dans la première case libre (la case 1 si les deux sont pleines,
   * ce qui la remplace). Mêmes contrôles que le glisser-déposer : `dropCard` reste l’unique chemin.
   */
  placeSelected(choice: 'assault' | 'guard' | 'secondary'): void {
    const id = this.ui.selected;
    if (!id) return;
    if (choice === 'secondary') {
      const free = this.view.me.slots.findIndex((s) => s === null);
      this.dropCard(id, free === 1 ? 'slot1' : 'slot0');
      return;
    }
    this.dropCard(id, 'primary');
    if (this.ui.draft.primaryId === id) this.setStance(choice);
  }

  setStance(st: Stance): void {
    if (this.view.phase === 'LECTURE_CHANGE') { this.ui.lectureStance = st; this.renderFn(); return; }
    if (!this.editingCommit() || !this.ui.draft.primaryId) { this.toast('Posez d’abord une Primaire.'); return; }
    this.ui.draft.stance = st;
    this.renderFn();
  }

  /** Engagement en cours d’édition : phase d’engagement, ou ma révision (avenant 08, amendement 1). */
  editingCommit(): boolean {
    const v = this.view;
    return v.awaitingMe && (v.phase === 'COMMIT' || v.phase === 'REVISION');
  }

  lockCommit(): void {
    const dr = this.ui.draft;
    if (!dr.primaryId) return this.toast('Une Primaire est obligatoire.');
    if (!dr.stance) return this.toast('Choisissez le mode de la Primaire : ASSAUT ou GARDE.');
    const full = this.view.me.slots.every((s) => s !== null);
    const choice = {
      primaryId: dr.primaryId, stance: dr.stance,
      secondaryId: dr.secondaryId, replaceSlot: dr.secondaryId && full ? dr.slot : null,
      ...(dr.secondaryId && !full && dr.slot !== null ? { slot: dr.slot } : {}),
    };
    if (this.view.phase === 'REVISION') {
      const held = this.view.revision?.held;
      const same = !!held && held.primaryId === choice.primaryId && held.stance === choice.stance && held.secondaryId === choice.secondaryId && (held.replaceSlot ?? held.slot ?? null) === (choice.replaceSlot ?? choice.slot ?? null);
      this.apply({ type: 'revise', player: 'p1', commit: same ? null : choice });
      return;
    }
    const cmd: PlayerCommand = { type: 'commit', player: 'p1', ...choice };
    this.apply(cmd);
  }

  /** Avenant 08, amendement 1 : garder l’engagement verrouillé. */
  keepRevision(): void {
    this.apply({ type: 'revise', player: 'p1', commit: null });
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
    // avenant M10-A (AV-02) : l'affinité exige une famille (jamais pour une carte neutre)
    const affinite = sd.family !== null && sd.family === pd.family;
    if (mode === 'rank') return `+${rankSupport(sd, pd)}${affinite ? ' (affinité +1)' : ''}`;
    return `×${damageCoefficient(sd, pd)}${affinite ? ' (même famille)' : sd.effect === 'prisme' ? ' (Prisme)' : sd.effect === 'convergence' ? ' (Convergence)' : ''}`;
  }
}

const MOOD_LABEL: Record<string, string> = {
  neutral: 'impassible', focused: 'concentré·e', confident: 'sûr·e de soi', smug: 'narquois·e', pleased: 'satisfait·e',
  triumphant: 'triomphant·e', surprised: 'surpris·e', pained: 'touché·e', annoyed: 'contrarié·e', angry: 'furieux·se',
  relieved: 'soulagé·e', defeated: 'abattu·e', thinking: 'réfléchit', shocked: 'stupéfait·e',
};

/** Légende lisible de l’expression du rival (faits publics uniquement). */
export function rivalCaption(e: Expression): string {
  return `${MOOD_LABEL[e.mood] ?? e.mood} — ${e.cause}`;
}
