/**
 * Contrôleur d’application : orchestre le Match (moteur pur), l’IA (sur SA vue), l’état d’UI
 * local (brouillons non verrouillés) et la mise en scène dérivée des événements.
 * L’UI ne lit que `PlayerView` de p1 ; seuls le moteur et l’IA (via `viewFor('p2')`) touchent l’état.
 */
import { cardDef, type Family } from '../game/catalog/cards';
import { son } from '../son/moteur';
import { sonsDuDuel } from '../son/evenements';
import type { PvPublics } from '../son/musique/chef';
import { TECHNIQUES, type TechniqueId } from '../game/catalog/techniques';
import { decide, PROFILES } from '../game/ai/policy';
import { buildMemory } from '../game/ai/memory';
import { computeClash, damageCoefficient, interferenceReaches, rankSupport, type ClashUse } from '../game/engine/clash';
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
import { buildActivations, type Activation } from '../presentation/activations';
import type { AppParams } from './params';
import type { Scenario } from './scenarios';

export type DropKey = 'primary' | 'slot0' | 'slot1' | 'hand';

/** Intentions de mise en scène du Clash (consommées par la scène DOM, jamais par le moteur). */
export type MotionEvent =
  | { type: 'begin'; script: ClashScript | null }
  | { type: 'step'; step: MotionStep }
  | { type: 'end' }
  | { type: 'stop' };

/** M12 (contrat 2) : la scène des temps forts. `play` rend la durée restante de sa file (ms, rythme compris). */
export interface ActivationSink {
  /** Rend la durée restante de la file (ms) ; infinie si un temps fort y attend le clic du joueur. */
  play(list: Activation[]): number;
  stop(): void;
}

/**
 * M17 : un geste du joueur soumis à la garde d'une leçon (le maître de table n'accepte que le geste attendu ; le reste
 * est inactif). Hors leçon, aucune garde : rien ne change.
 */
export type GesteJoueur =
  | { k: 'carte'; id: string }
  | { k: 'case'; cle: DropKey | 'opp0' | 'opp1' }
  | { k: 'posture'; st: Stance }
  | { k: 'mode'; slot: SlotIndex; mode: TacticPlan['mode'] }
  | { k: 'tech'; t: TechniqueId }
  | { k: 'commande'; cmd: PlayerCommand | { type: 'nextTurn' } }
  /** M18 (tour assisté) : « Non » à une question facultative (garder une réserve cachée, ne pas utiliser une Technique). */
  | { k: 'refus'; quoi: 'reserve'; slot: SlotIndex }
  | { k: 'refus'; quoi: 'tech'; t: TechniqueId };

/** M18 : le bilan du dernier Clash, résumé sur une ligne jusqu'au Clash suivant (faits publics). */
export interface Bilan { turn: number; me: number; opp: number; prolongation: boolean }

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
  /** M18 (tour assisté) : questions facultatives déjà répondues par « Non » (`tech:<id>`, `reserve:<case>`). */
  repondu: string[];
  /** M18 (tour assisté) : Secondaires dont le menu tactique a été ouvert d'office puis répondu ou refermé. */
  menusFaits: SlotIndex[];
  /** Fiche de clôture (contrat 05) : deux cases pleines, la carte choisie attend que le joueur désigne la case à remplacer. */
  choixCase: boolean;
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
  repondu: [],
  menusFaits: [],
  choixCase: false,
});

export interface Preview {
  myScore: string;
  oppScore: string;
  myMult: number;
  dealt: number;
  taken: number;
  outcome: string;
  /** M18 : qui l'emporte dans cette hypothèse (`null` : égalité d'Assauts ou deux Gardes). */
  gagne: 'me' | 'opp' | null;
}

/** M18 : ce qu'une hypothèse change au Clash, en quelques mots (« tu gagnes 6 contre 4 : 5 dégâts »). */
export function resumeApercu(p: Preview): string {
  const score = `${p.myScore} contre ${p.oppScore}`;
  // gagner sans blesser, c'est la Garde qui l'emporte (un Assaut victorieux inflige toujours au moins 1, avenant 07)
  if (p.gagne === 'me') return p.dealt > 0 ? `tu gagnes ${score} : ${p.dealt} dégât${p.dealt > 1 ? 's' : ''}` : `ta Garde tient ${score} : aucun dégât`;
  if (p.gagne === 'opp') return p.taken > 0 ? `tu perds ${score} : −${p.taken} PV` : `sa Garde tient ${score} : aucun dégât`;
  return `${p.outcome.toLowerCase()} (${score})`;
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
  private activationSink: ActivationSink | null = null;
  /** Fin estimée de la file des temps forts (horloge `performance.now()`) : le rival attend jusque-là. */
  private activationsUntil = 0;
  /**
   * Fiche de clôture (audit, M18) : un temps fort occupe le centre de l'écran (posé par la session) : le panneau de décision
   * attend qu'il soit passé, comme le bandeau d'étape ; `panneauRetenu` : il a attendu, la file vidée le fait paraître.
   */
  centreOccupe: () => boolean = () => false;
  panneauRetenu = false;
  /** Un temps fort attend le clic du joueur : la résolution et le rival attendent `activationsDrained`. */
  private seqWaiting = false;
  private aiWaiting = false;
  private beatAt = 0;
  private seqTimer = 0;
  private exprQueue: Expression[] = [];
  private exprTimer = 0;
  private dragging = false;
  private lastTurn = 0;
  private holdSeq = 0;
  private commandFn: (() => void) | null = null;
  /** Vrai après `dispose()` : plus aucune minuterie, commande ni rendu (sortie du duel sans rechargement). */
  disposed = false;
  /** M17 : garde d'une leçon ; renvoie la raison d'un refus (montrée au joueur), ou `null`. */
  garde: ((g: GesteJoueur) => string | null) | null = null;
  /** M18 : le dernier Clash résumé (ligne du tour assisté), effacé quand le Clash suivant commence. */
  bilan: Bilan | null = null;

  /** M18 (P1) : tour assisté (questions sur place, enchaînement) ou classique (l'affichage d'avant). Lu à chaque usage. */
  get assiste(): boolean {
    return this.params.tour === 'assiste';
  }

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
    this.noterBilan();
  }

  /** M18 : retient le bilan du Clash du tour (s'il y en a un) pour la ligne du tour assisté. */
  private noterBilan(): void {
    const r = this.view.lastClash;
    if (!r) return;
    this.bilan = { turn: r.turn, me: r.damage.p1, opp: r.damage.p2, prolongation: !!this.view.overtime && this.view.me.hp === 1 && this.view.opp.hp === 1 };
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

  /** M12 : temps forts des activations (premier plan), joués hors du plateau. */
  onActivations(sink: ActivationSink): void {
    this.activationSink = sink;
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
    this.activationSink = null;
  }

  get artSeed(): number {
    return this.params.artSeed;
  }

  // ------------------------------------------------------------------------
  refresh(newEvents: GameEvent[]): void {
    const before = (this.view as PlayerView | undefined) ?? null;
    this.view = viewFor(this.match.state, 'p1');
    // Une résolution de Clash est présentée par temps successifs ; le reste est immédiat.
    const start = resolutionStart(newEvents);
    const immediate = start >= 0 ? newEvents.slice(0, start) : newEvents;
    // M11-E : sons des événements publics et des événements privés du joueur (jamais ceux de l'adversaire) : tout de suite
    // pour ce qui est immédiat, au temps de la chorégraphie pour la résolution (`advanceBeat`) ; aucun son pour un rejeu
    // en bloc (reprise d'un duel) ; sans geste ni en QA, le moteur du son ne joue rien.
    // M13 : la musique compte les PV d'avant la résolution tant que celle-ci n'est pas présentée
    if (newEvents.length < 60) this.jouerSons(immediate, start >= 0 ? hpBeforeSequence(newEvents.slice(start), { p1: this.view.me.hp, p2: this.view.opp.hp }) : undefined);
    // M12 : temps forts de ce qui est immédiat (Techniques, regards, révélations, Signature annoncée) ; aucun pour un
    // rejeu en bloc ni en gel (captures : seuls ceux de la résolution, au temps demandé)
    if (newEvents.length < 60 && !this.params.freeze) this.playActivations(buildActivations(immediate, this.activationContext()));
    if (start >= 0) this.startSequence(newEvents.slice(start), before);
    this.rebuildJournal();
    const key = `${this.view.turn}:${this.view.phase}`;
    if (key !== this.ui.phaseKey) {
      const draftBefore = this.ui.draft;
      this.ui = freshUi(key, this.ui);
      // M18 (G3) : au tour assisté, la fiche d'une carte ne survit pas à l'étape (elle ne vient qu'au survol)
      if (this.assiste) this.ui.inspect = null;
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
      // M18 (G2) : aux choix tactiques, le menu de la première Secondaire active s'ouvre de lui-même
      this.ouvrirMenuSuivant();
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
    this.bilan = null;
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
    let wait = 0;
    for (;;) {
      q.index++;
      const b = q.beats[q.index];
      if (!b) return this.finishSequence();
      q.hp = hpAfterBeat(q.hp, b);
      for (const e of b.events) q.hidden.delete(e.seq);
      this.playFx(b.events);
      this.jouerSons(b.events, q.hp);
      this.pushReactions(this.expr.observe(b.events));
      // Chorégraphie du Clash : émise AVANT la mise à jour du plateau (les cartes quittent leurs cases).
      const step = stepForBeat(b.kind);
      if (step) this.motionFn?.({ type: 'step', step });
      // Captures (freeze) : arrêt sur le temps demandé, son temps fort posé ; rythme instantané : enchaînement immédiat.
      if (stopAt !== null && q.index >= stopAt) { this.playActivations(buildActivations(b.events, this.activationContext())); break; }
      if (this.params.freeze || this.params.pace === 'instant') continue;
      // M12 : les temps forts du temps (un effet, une Interférence, un Repoussement…) ; le temps dure au moins autant
      wait = this.playActivations(buildActivations(b.events, this.activationContext()));
      break;
    }
    this.rebuildJournal();
    // Premier temps : rendu complet (le bandeau passe en mode résolution) ; ensuite, patch ciblé.
    if (!q.rendered || !this.beatFn) { q.rendered = true; this.renderFn(); }
    else this.beatFn();
    if (this.params.freeze || this.params.pace === 'instant') return;
    this.beatAt = performance.now();
    // un temps fort qui attend le clic du joueur : la résolution reprend quand la file se vide (`activationsDrained`)
    if (wait === Infinity) this.seqWaiting = true;
    else this.seqTimer = window.setTimeout(() => this.advanceBeat(), Math.max(this.beatDelay(q.beats[q.index]!), wait));
  }

  /** M12 : la file des temps forts s'est vidée après un clic du joueur : la résolution reprend, le rival peut jouer. */
  activationsDrained(): void {
    if (this.disposed) return;
    if (this.activationsUntil === Infinity) this.activationsUntil = 0;
    if (this.panneauRetenu) { this.panneauRetenu = false; this.renderFn(); }
    if (this.seqWaiting) {
      this.seqWaiting = false;
      const q = this.seq;
      const b = q && !q.done ? q.beats[q.index] : undefined;
      const rest = b ? this.beatDelay(b) - (performance.now() - this.beatAt) : 0;
      this.seqTimer = window.setTimeout(() => this.advanceBeat(), Math.max(250, rest));
    }
    if (this.aiWaiting) { this.aiWaiting = false; this.scheduleAi(); }
  }

  /** M12 : contexte public des temps forts (Primaires révélées). */
  private activationContext(): { viewer: PlayerId; primaries: Record<PlayerId, { defId: string; stance: Stance }> | null } {
    const prim = this.view.reveal.primaries;
    return { viewer: 'p1', primaries: prim ? { p1: prim.me, p2: prim.opp } : null };
  }

  /** M12 : confie des temps forts à la scène ; rend la durée restante de sa file (ms), 0 sans scène. */
  private playActivations(list: Activation[]): number {
    if (!list.length || !this.activationSink) return 0;
    const ms = this.activationSink.play(list);
    this.activationsUntil = Math.max(this.activationsUntil, performance.now() + ms);
    return ms;
  }

  /**
   * M11-E : les sons de ces événements (publics, ou privés du joueur). M13 : la musique les suit aussi (Clash gagné ou
   * perdu, Signature annoncée, prolongation, PV publics après ce temps, fin du duel ; faits publics seulement).
   */
  private jouerSons(events: readonly GameEvent[], hp?: Record<PlayerId, number>): void {
    for (const x of sonsDuDuel(events, 'p1')) son().jouer(x);
    son().musique.duel(events, this.pvPublics(hp));
  }

  /** M13 : les PV publics des deux camps (ceux du temps présenté pendant une résolution). */
  pvPublics(hp?: Record<PlayerId, number>): PvPublics | null {
    const v = this.view as PlayerView | undefined;
    if (!v) return null;
    return { me: hp?.p1 ?? v.me.hp, meMax: v.me.maxHp, opp: hp?.p2 ?? v.opp.hp, oppMax: v.opp.maxHp };
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
    // M11-E : « Passer » ne rejoue pas les sons sautés, sauf la fin du duel
    if (last) this.jouerSons(last.events.filter((e) => e.kind === 'victory'), q.hp);
    this.motionFn?.({ type: 'stop' });
    // M12 : « Passer » vide aussi la file des temps forts
    this.activationSink?.stop();
    this.activationsUntil = 0;
    this.seqWaiting = this.aiWaiting = false;
    this.finishSequence();
  }

  private finishSequence(): void {
    if (!this.seq) return;
    window.clearTimeout(this.seqTimer);
    this.seqTimer = 0;
    this.seq.done = true;
    this.seq.index = this.seq.beats.length;
    this.noterBilan();
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
    // un temps fort attend le clic du joueur : le rival attend aussi (relancé par `activationsDrained`)
    if (this.params.aiDelay > 0 && this.activationsUntil === Infinity) { this.aiWaiting = true; return; }
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
    // M12 : le rival attend la fin de la file des temps forts (sauf le pilotage instantané des outils, `aiDelay=0`)
    if (this.params.aiDelay <= 0) run();
    else this.aiTimer = window.setTimeout(run, Math.max(this.params.aiDelay, this.activationsUntil - performance.now()));
  }

  /** M17 : geste refusé par la garde d'une leçon (raison montrée) ? */
  private refuse(g: GesteJoueur): boolean {
    const r = this.garde?.(g) ?? null;
    if (r) this.toast(r, 'info');
    return !!r;
  }

  /** Point d’entrée unique vers le moteur ; refus explicite sans mutation. */
  apply(cmd: PlayerCommand | { type: 'nextTurn' }): boolean {
    if (this.disposed) return false;
    if ((cmd.type === 'nextTurn' || cmd.player === 'p1') && this.refuse({ k: 'commande', cmd })) return false;
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
    if (key !== 'hand' && (this.refuse({ k: 'carte', id: cardId }) || this.refuse({ k: 'case', cle: key }))) return;
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
    this.ui.choixCase = false;
    if (key !== 'hand' && this.suiteEngagement()) return;
    this.renderFn();
  }

  clickHandCard(cardId: string): void {
    const v = this.view;
    if (v.awaitingMe && (v.phase === 'START' || this.editingCommit()) && this.refuse({ k: 'carte', id: cardId })) return;
    if (v.phase === 'START' && v.awaitingMe) {
      // M18 (un clic) : la question du Recentrage se répond en cliquant la carte à glisser sous la pioche
      if (this.assiste && !this.ui.recentrageArmed && this.questionTech() === 'Recentrage') {
        this.toggleStartTech('Recentrage');
        if (!this.ui.recentrageArmed) return;
      }
      if (this.ui.recentrageArmed) {
        this.ui.startTech = { id: 'Recentrage', cardId };
        this.ui.recentrageArmed = false;
        this.ui.trim = this.ui.trim.filter((x) => x !== cardId);
      } else if (v.me.handCount > 4) {
        this.ui.trim = this.ui.trim.includes(cardId) ? this.ui.trim.filter((x) => x !== cardId) : [...this.ui.trim, cardId];
      }
      // M18 : au tour assisté, le Début se valide seul dès que tout est répondu
      if (this.assiste && this.suiteDebut()) return;
      this.renderFn();
      return;
    }
    // M18 (G3) : au tour assisté, la fiche de la carte ne vient qu'au survol (ou à l'appui long), jamais au clic
    if (!this.editingCommit()) { if (!this.assiste) { this.ui.inspect = this.defIdOf(cardId); this.renderFn(); } return; }
    this.ui.selected = this.ui.selected === cardId ? null : cardId;
    this.ui.choixCase = false;
    if (!this.assiste) this.ui.inspect = this.defIdOf(cardId);
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
      // deux cases pleines (contrat 05) : jamais la case 1 d'office ; le joueur désigne la Secondaire à remplacer (REMPLACE)
      if (free < 0) { this.ui.choixCase = true; this.renderFn(); return; }
      this.dropCard(id, free === 1 ? 'slot1' : 'slot0');
      return;
    }
    this.dropCard(id, 'primary');
    if (this.ui.draft.primaryId === id) this.setStance(choice);
  }

  setStance(st: Stance): void {
    if (this.refuse({ k: 'posture', st })) return;
    if (this.view.phase === 'LECTURE_CHANGE') {
      this.ui.lectureStance = st;
      // M18 : au tour assisté, choisir son mode le valide (répondre fait avancer)
      if (this.assiste && this.view.awaitingMe) return this.lockLectureStance();
      this.renderFn();
      return;
    }
    if (!this.editingCommit() || !this.ui.draft.primaryId) { this.toast('Posez d’abord une Primaire.'); return; }
    this.ui.draft.stance = st;
    if (this.suiteEngagement()) return;
    this.renderFn();
  }

  /** M18 : une Secondaire peut encore s'ajouter au brouillon (une autre carte de la main, hors Signature). */
  peutAjouterSecondaire(): boolean {
    const dr = this.ui.draft;
    return this.editingCommit() && !dr.secondaryId && (this.view.me.hand ?? []).some((x) => x.cardId !== dr.primaryId && !cardDef(x.defId).signature);
  }

  /**
   * Règle du responsable (2026-11-11) : chaque étape en un clic si possible, sans valider. À l'Engagement du tour assisté,
   * le geste qui complète tout engage : la posture si la Secondaire est déjà posée (ou impossible), la Secondaire si la
   * Primaire et sa posture le sont. Seul l'engagement sans Secondaire demande « Engager sans Secondaire » (le « Non » de
   * la Secondaire facultative). La révision (avenant 08) garde ses deux réponses.
   */
  private suiteEngagement(): boolean {
    const v = this.view;
    const dr = this.ui.draft;
    if (!this.assiste || v.phase !== 'COMMIT' || !v.awaitingMe || !dr.primaryId || !dr.stance) return false;
    if (!dr.secondaryId && this.peutAjouterSecondaire()) return false;
    this.lockCommit();
    return true;
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

  /** Avenant 08, amendement 1 : le brouillon de ma révision diffère-t-il de l'engagement verrouillé (carte, mode, Secondaire, case) ? */
  revisionModifiee(): boolean {
    const held = this.view.phase === 'REVISION' ? this.view.revision?.held : null;
    if (!held) return false;
    const dr = this.ui.draft;
    const caseHeld = held.secondaryId ? (held.replaceSlot ?? held.slot ?? null) : null;
    return dr.primaryId !== held.primaryId || dr.stance !== held.stance || dr.secondaryId !== held.secondaryId || (dr.secondaryId ? dr.slot : null) !== caseHeld;
  }

  /** Avenant 08, amendement 1 : garder l’engagement verrouillé. */
  keepRevision(): void {
    this.apply({ type: 'revise', player: 'p1', commit: null });
  }

  // ------------------------------------------------------------------------
  // Début de tour / préparation / Dissipation / Lecture

  toggleStartTech(t: TechniqueId): void {
    if (this.refuse({ k: 'tech', t })) return;
    if (t === 'Sondage') this.ui.startTech = this.ui.startTech?.id === 'Sondage' ? null : { id: 'Sondage' };
    if (t === 'Recentrage') {
      if (this.ui.startTech?.id === 'Recentrage') this.ui.startTech = null;
      else { this.ui.recentrageArmed = !this.ui.recentrageArmed; if (this.ui.recentrageArmed && !this.assiste) this.toast('Recentrage : cliquez la carte de main à placer sous la pioche.', 'info'); }
    }
    this.renderFn();
  }

  lockStart(): boolean {
    return this.apply({ type: 'start', player: 'p1', discard: this.ui.trim, technique: this.ui.startTech });
  }

  toggleReveal(slot: SlotIndex): void {
    const s = this.view.me.slots[slot];
    if (!s) return;
    if (s.state === 'charging') return this.toast('Secondaire en chargement : révélation possible au tour suivant seulement.');
    if (s.state === 'active') return this.toast('Cette Secondaire est déjà active.');
    if (this.refuse({ k: 'case', cle: slot === 0 ? 'slot0' : 'slot1' })) return;
    this.ui.reveal = this.ui.reveal.includes(slot) ? this.ui.reveal.filter((x) => x !== slot) : [...this.ui.reveal, slot];
    this.renderFn();
  }

  lockPrepare(): boolean {
    return this.apply({ type: 'prepare', player: 'p1', reveal: this.ui.reveal });
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
    // M18 : au tour assisté, cliquer une réserve prête, c'est répondre « Révéler » (ou revenir sur sa réponse)
    if (v.phase === 'PREPARE' && v.awaitingMe) return this.assiste && s?.state === 'hidden' ? this.repondreReserve(slot, !this.ui.reveal.includes(slot)) : this.toggleReveal(slot);
    if (v.phase === 'TACTICS' && v.awaitingMe) {
      if (this.refuse({ k: 'case', cle: slot === 0 ? 'slot0' : 'slot1' })) return;
      if (this.ui.techTargeting === 'Ancrage') {
        const plan = this.ui.plans[slot];
        if (!s || s.state !== 'active' || !plan || plan.mode === 'keep') return this.toast('Ancrage : désignez une de vos Secondaires engagées (Rang, Dégâts ou Interférer).');
        this.ui.tacticsTech = { id: 'Ancrage', slot };
        this.ui.techTargeting = null;
        if (this.suiteTactique()) return;
        return this.renderFn();
      }
      if (!s) return;
      if (s.state === 'charging') return this.toast('Secondaire en chargement : inutilisable ce tour.');
      if (s.state === 'hidden') return this.toast('Réserve cachée inactive : révélez-la au début d’un tour pour l’utiliser.');
      // M18 : refermer un menu ouvert d'office, c'est garder « Conserver » (le menu suivant s'ouvre)
      if (this.assiste && this.ui.menuSlot === slot) return this.cancel();
      this.ui.menuSlot = this.ui.menuSlot === slot ? null : slot;
      this.ui.targetingFor = null;
      return this.renderFn();
    }
    if (s?.card && !this.assiste) { this.ui.inspect = s.card.defId; this.renderFn(); }
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
    const src = cardDef(mine.card.defId);
    const out: SlotIndex[] = [];
    for (const t of v.opp.slots) {
      if (!t || t.state !== 'active') continue;
      if (!t.card || t.masked) { out.push(t.slot); continue; } // cible masquée : à l’aveugle (§7.3)
      if (interferenceReaches(src, cardDef(t.card.defId))) out.push(t.slot); // règle unique du moteur (Contre-jour compris)
    }
    return out;
  }

  choosePlan(slot: SlotIndex, mode: TacticPlan['mode']): void {
    if (this.refuse({ k: 'mode', slot, mode })) return;
    const blocked = this.modeBlocked(slot, mode);
    if (blocked) return this.toast(blocked);
    if (mode === 'interfere') {
      // M18 (un clic si possible) : une seule cible permise, elle est prise d'office
      const cibles = this.legalTargets(slot);
      if (this.assiste && cibles.length === 1) {
        this.ui.menuSlot = null;
        this.ui.targetingFor = slot;
        return this.clickOppSlot(cibles[0]!);
      }
      this.ui.targetingFor = slot;
      this.ui.menuSlot = null;
      if (!this.assiste) this.toast('Interférer : cliquez une Secondaire adverse active (surlignée).', 'info');
      return this.renderFn();
    }
    this.ui.plans[slot] = { mode };
    if (this.ui.tacticsTech?.id === 'Ancrage' && this.ui.tacticsTech.slot === slot && mode === 'keep') this.ui.tacticsTech = null;
    this.ui.menuSlot = null;
    this.menuFait(slot);
    this.renderFn();
  }

  clickOppSlot(slot: SlotIndex): void {
    const v = this.view;
    const s = v.opp.slots[slot];
    if (['DISSIPATION', 'REPEL', 'TACTICS'].includes(v.phase) && this.refuse({ k: 'case', cle: slot === 0 ? 'opp0' : 'opp1' })) return;
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
        if (this.suiteTactique()) return;
        return this.renderFn();
      }
      if (this.ui.targetingFor !== null) {
        const from = this.ui.targetingFor;
        if (!s || s.state !== 'active') return this.toast('Interférence : la cible doit être une Secondaire adverse ACTIVE (pas cachée ni en chargement).');
        if (!this.legalTargets(from).includes(slot)) return this.toast('Interférence : Rang imprimé insuffisant contre cette cible.');
        this.ui.plans[from] = { mode: 'interfere', target: slot };
        this.ui.targetingFor = null;
        this.menuFait(from);
        return this.renderFn();
      }
    }
    if (s?.card && !this.assiste) { this.ui.inspect = s.card.defId; this.renderFn(); }
  }

  toggleTacticsTech(t: 'Ancrage' | 'Rupture'): void {
    if (this.refuse({ k: 'tech', t })) return;
    if (this.ui.tacticsTech?.id === t || this.ui.techTargeting === t) {
      this.ui.tacticsTech = null;
      this.ui.techTargeting = null;
    } else {
      if (t === 'Rupture' && this.view.me.primary?.stance !== 'guard') return this.toast('Rupture exige une Primaire en Garde.');
      this.ui.techTargeting = t;
      this.ui.tacticsTech = null;
      if (!this.assiste) this.toast(t === 'Ancrage' ? 'Ancrage : cliquez une de vos Secondaires engagées.' : 'Rupture : cliquez une Secondaire adverse active.', 'info');
    }
    this.renderFn();
  }

  lockTactics(): boolean {
    return this.apply({ type: 'tactics', player: 'p1', plans: this.ui.plans, technique: this.ui.tacticsTech });
  }

  skipRepel(): void {
    this.apply({ type: 'repel', player: 'p1', targetSlot: null });
  }

  nextTurn(): void {
    if (this.view.phase === 'RESOLVED') this.apply({ type: 'nextTurn' });
  }

  cancel(): void {
    const menu = this.ui.menuSlot;
    const cible = this.ui.targetingFor;
    this.ui.selected = null;
    this.ui.choixCase = false;
    this.ui.menuSlot = null;
    this.ui.targetingFor = null;
    this.ui.techTargeting = null;
    this.ui.recentrageArmed = false;
    // M18 : refermer un menu ouvert d'office (ou renoncer à une cible), c'est garder « Conserver » ; le suivant s'ouvre
    if (this.assiste && this.view.phase === 'TACTICS') {
      if (menu !== null) this.menuFait(menu);
      if (cible !== null) this.menuFait(cible);
    }
    this.renderFn();
  }

  // ------------------------------------------------------------------------
  // M18 — le tour assisté : questions facultatives posées sur place, menus ouverts d'eux-mêmes, étapes validées
  // dès que tout est répondu. Aucune règle ne change : chaque réponse passe par les mêmes commandes et la même garde.

  /** Une Secondaire répondue (ou refermée) aux choix tactiques : le menu de la suivante s'ouvre. */
  private menuFait(slot: SlotIndex): void {
    if (!this.assiste) return;
    if (!this.ui.menusFaits.includes(slot)) this.ui.menusFaits.push(slot);
    this.ouvrirMenuSuivant();
    this.suiteTactique();
  }

  /**
   * Retour du responsable (2026-11-11) : pas de bouton « Valider » aux choix tactiques. Dès que chaque Secondaire active
   * a son choix (Conserver compris) et que la Technique éventuelle est répondue (cible comprise), les choix partent.
   * Rend vrai si la commande est partie (ou a été refusée, puis remise à zéro).
   */
  private suiteTactique(): boolean {
    const v = this.view;
    if (!this.assiste || v.phase !== 'TACTICS' || !v.awaitingMe) return false;
    if (this.menusEnAttente().length || this.ui.menuSlot !== null || this.ui.targetingFor !== null || this.ui.techTargeting || this.questionTech()) return false;
    if (this.lockTactics()) return true;
    // refusée (garde d'une leçon) : les menus se rouvrent
    this.ui.plans = [null, null];
    this.ui.menusFaits = [];
    this.ui.tacticsTech = null;
    this.ui.repondu = this.ui.repondu.filter((x) => !x.startsWith('tech:'));
    this.ouvrirMenuSuivant();
    this.renderFn();
    return true;
  }

  /** Secondaires actives dont le menu reste à ouvrir (ni choix, ni menu refermé). */
  menusEnAttente(): SlotIndex[] {
    const v = this.view;
    if (!this.assiste || v.phase !== 'TACTICS' || !v.awaitingMe) return [];
    return ([0, 1] as const).filter((i) => v.me.slots[i]?.state === 'active' && !this.ui.plans[i] && !this.ui.menusFaits.includes(i));
  }

  /** G2 : ouvre d'office le menu de la première Secondaire active sans réponse (rien si un ciblage est en cours). */
  private ouvrirMenuSuivant(): void {
    if (!this.assiste || this.ui.menuSlot !== null || this.ui.targetingFor !== null || this.ui.techTargeting) return;
    const next = this.menusEnAttente()[0];
    if (next !== undefined) this.ui.menuSlot = next;
  }

  /** La Technique utilisable sur laquelle le joueur est interrogé maintenant (une à la fois), ou null. */
  questionTech(): TechniqueId | null {
    const v = this.view;
    if (!this.assiste || !v.awaitingMe || this.sequencing) return null;
    const libre = (t: TechniqueId) => this.canUseTech(t) && !this.ui.repondu.includes(`tech:${t}`);
    switch (v.phase) {
      case 'START': {
        if (this.ui.trim.length !== Math.max(0, v.me.handCount - 4) || this.ui.startTech || this.ui.recentrageArmed) return null;
        return (['Sondage', 'Recentrage'] as const).find(libre) ?? null;
      }
      case 'DISSIPATION': return libre('Dissipation') ? 'Dissipation' : null;
      case 'LECTURE': return libre('Lecture') ? 'Lecture' : null;
      case 'TACTICS': {
        if (this.menusEnAttente().length || this.ui.menuSlot !== null || this.ui.targetingFor !== null || this.ui.techTargeting || this.ui.tacticsTech) return null;
        if (libre('Rupture') && v.me.primary?.stance === 'guard' && v.opp.slots.some((s) => s?.state === 'active')) return 'Rupture';
        if (libre('Ancrage') && this.ui.plans.some((p) => p && p.mode !== 'keep')) return 'Ancrage';
        return null;
      }
      default: return null;
    }
  }

  /** Réserves prêtes encore sans réponse (Préparation du tour assisté). */
  reservesEnAttente(): SlotIndex[] {
    const v = this.view;
    if (!this.assiste || v.phase !== 'PREPARE' || !v.awaitingMe) return [];
    return ([0, 1] as const).filter((i) => v.me.slots[i]?.state === 'hidden' && !this.ui.reveal.includes(i) && !this.ui.repondu.includes(`reserve:${i}`));
  }

  /** R3 : « Révéler » ou « Garder cachée » sur une réserve prête ; la dernière réponse valide la Préparation. */
  repondreReserve(slot: SlotIndex, oui: boolean): void {
    if (this.view.phase !== 'PREPARE' || !this.view.awaitingMe) return;
    if (oui) {
      if (!this.ui.reveal.includes(slot)) this.toggleReveal(slot);
      if (!this.ui.reveal.includes(slot)) return;
    } else {
      if (this.refuse({ k: 'refus', quoi: 'reserve', slot })) return;
      this.ui.reveal = this.ui.reveal.filter((x) => x !== slot);
      if (!this.ui.repondu.includes(`reserve:${slot}`)) this.ui.repondu.push(`reserve:${slot}`);
    }
    if (this.reservesEnAttente().length) return this.renderFn();
    if (!this.lockPrepare()) {
      // refusée (garde d'une leçon) : les questions reviennent
      this.ui.reveal = [];
      this.ui.repondu = this.ui.repondu.filter((x) => !x.startsWith('reserve:'));
      this.renderFn();
    }
  }

  /** R3 : « Utiliser » ou « Non » sur la Technique utilisable ; répondre fait avancer, sans autre bouton. */
  repondreTech(t: TechniqueId, oui: boolean): void {
    const v = this.view;
    if (!v.awaitingMe) return;
    if (!oui) {
      if (this.refuse({ k: 'refus', quoi: 'tech', t })) return;
      if (!this.ui.repondu.includes(`tech:${t}`)) this.ui.repondu.push(`tech:${t}`);
      if (v.phase === 'START' && this.ui.startTech?.id === t) this.ui.startTech = null;
      if (v.phase === 'START') { if (!this.suiteDebut()) this.renderFn(); return; }
      if (v.phase === 'DISSIPATION') return this.lockDissipation(false);
      if (v.phase === 'LECTURE') return this.lecture(false);
      if (v.phase === 'TACTICS' && (this.ui.tacticsTech?.id === t || this.ui.techTargeting === t)) { this.ui.tacticsTech = null; this.ui.techTargeting = null; }
      if (v.phase === 'TACTICS' && this.suiteTactique()) return;
      return this.renderFn();
    }
    switch (v.phase) {
      case 'START':
        if (t === 'Sondage' && this.ui.startTech?.id !== 'Sondage') this.toggleStartTech('Sondage');
        if (t === 'Recentrage' && !this.ui.recentrageArmed && this.ui.startTech?.id !== 'Recentrage') this.toggleStartTech('Recentrage');
        if (this.ui.startTech || this.ui.recentrageArmed) this.suiteDebut();
        return;
      case 'DISSIPATION': {
        const cible = v.opp.slots.findIndex((s) => !!s?.maskSource);
        if (cible < 0) return this.toast('Dissipation : aucune Dissimulation adverse à viser.');
        if (this.ui.dissipTarget !== cible) this.clickOppSlot(cible as SlotIndex);
        if (this.ui.dissipTarget === cible) this.lockDissipation(true);
        return;
      }
      case 'LECTURE': return this.lecture(true);
      case 'TACTICS': {
        if (t !== 'Ancrage' && t !== 'Rupture') return;
        if (this.ui.techTargeting !== t && this.ui.tacticsTech?.id !== t) this.toggleTacticsTech(t);
        if (this.ui.techTargeting !== t) return;
        // un clic si possible : une seule cible, prise d'office
        if (t === 'Rupture') {
          const c = v.opp.slots.filter((s) => s?.state === 'active').map((s) => s!.slot);
          if (c.length === 1) this.clickOppSlot(c[0]!);
        } else {
          const c = ([0, 1] as const).filter((i) => v.me.slots[i]?.state === 'active' && this.ui.plans[i] && this.ui.plans[i]!.mode !== 'keep');
          if (c.length === 1) this.clickMySlot(c[0]!);
        }
        return;
      }
      default: return;
    }
  }

  /**
   * Début du tour assisté : valide dès que les défausses sont faites et la Technique répondue (ou sa carte de
   * Recentrage choisie). Rend vrai si la commande est partie (ou a été refusée et remise à zéro).
   */
  private suiteDebut(): boolean {
    const v = this.view;
    if (!this.assiste || v.phase !== 'START' || !v.awaitingMe) return false;
    if (this.ui.trim.length !== Math.max(0, v.me.handCount - 4) || this.ui.recentrageArmed) return false;
    if (!this.ui.startTech && this.questionTech()) return false;
    if (this.lockStart()) return true;
    this.ui.startTech = null;
    this.ui.repondu = this.ui.repondu.filter((x) => !x.startsWith('tech:'));
    this.renderFn();
    return true;
  }

  /** Engagement prêt à conclure (Primaire et posture posées) : le bouton « Engager » paraît au-dessus de la case. */
  engagementPret(): boolean {
    return this.editingCommit() && !!this.ui.draft.primaryId && !!this.ui.draft.stance;
  }

  /** G2 : ce qu'un mode change au Clash, dans l'hypothèse où le rival conserve tout (faits connus du joueur seulement). */
  apercuMode(slot: SlotIndex, mode: 'keep' | 'rank' | 'damage'): string {
    const plans: [TacticPlan | null, TacticPlan | null] = [this.ui.plans[0], this.ui.plans[1]];
    plans[slot] = { mode };
    const p = this.preview(plans);
    return p ? resumeApercu(p) : '';
  }

  /**
   * D3 (fiche de clôture) : le même mode si le rival amplifie : il engage ses Secondaires actives VISIBLES en soutien (Rang ;
   * Dégâts aussi s'il est en Assaut), la combinaison la plus coûteuse pour le joueur. Information visible seulement
   * (ADR 011) : une Secondaire masquée n'est jamais estimée, seulement signalée. Null : le rival n'a rien à amplifier.
   */
  apercuAmplifie(slot: SlotIndex, mode: 'keep' | 'rank' | 'damage'): string | null {
    const v = this.view;
    const prim = v.reveal.primaries;
    if (!prim || v.phase !== 'TACTICS') return null;
    const visibles = v.opp.slots.filter((x) => x?.state === 'active' && x.card && !x.masked).map((x) => ({ slot: x!.slot, def: cardDef(x!.card!.defId) }));
    const masquee = v.opp.slots.some((x) => x?.state === 'active' && (!x.card || x.masked));
    if (!visibles.length) return masquee ? 'sa Secondaire masquée peut changer l’issue' : null;
    const modes: Array<'rank' | 'damage'> = prim.opp.stance === 'assault' ? ['rank', 'damage'] : ['rank'];
    let combos: ClashUse[][] = [[]];
    for (const a of visibles) combos = combos.flatMap((u) => modes.map((m) => [...u, { slot: a.slot, def: a.def, mode: m }]));
    const plans: [TacticPlan | null, TacticPlan | null] = [this.ui.plans[0], this.ui.plans[1]];
    plans[slot] = { mode };
    let pire: Preview | null = null;
    for (const uses of combos) {
      const p = this.preview(plans, uses);
      if (p && (!pire || p.taken - p.dealt > pire.taken - pire.dealt)) pire = p;
    }
    return pire ? `${resumeApercu(pire)}${masquee ? ' (sans sa Secondaire masquée)' : ''}` : null;
  }

  canUseTech(t: TechniqueId): boolean {
    const me = this.view.me;
    return me.techniques.includes(t) && me.techniqueUsed === null && me.insight >= TECHNIQUES[t].cost;
  }

  // ------------------------------------------------------------------------
  /** Prévision PROVISOIRE (§13.3) : hypothèse « l’adversaire conserve tout » (`oppUses` : ses soutiens VISIBLES supposés,
   *  aperçu « s'il amplifie », D3) — aucune info cachée. */
  preview(plans: readonly [TacticPlan | null, TacticPlan | null] = this.ui.plans, oppUses: ClashUse[] = []): Preview | null {
    const v = this.view;
    const prim = v.reveal.primaries;
    if (!prim || v.phase !== 'TACTICS') return null;
    const myPrim = cardDef(prim.me.defId);
    const oppPrim = cardDef(prim.opp.defId);
    const myActive = v.me.slots.filter((s) => s?.state === 'active' && s.card).map((s) => ({ slot: s!.slot, def: cardDef(s!.card!.defId) }));
    const uses: ClashUse[] = [];
    for (const a of myActive) {
      const p = plans[a.slot];
      if (!p || p.mode === 'keep') continue;
      if (p.mode === 'interfere') uses.push({ slot: a.slot, def: a.def, mode: 'interfere', target: p.target! });
      else uses.push({ slot: a.slot, def: a.def, mode: p.mode });
    }
    const oppActive = v.opp.slots.filter((s) => s?.state === 'active' && s.card && !s.masked).map((s) => ({ slot: s!.slot, def: cardDef(s!.card!.defId) }));
    const out = computeClash({
      p1: { primary: myPrim, stance: prim.me.stance, active: myActive, uses },
      p2: { primary: oppPrim, stance: prim.opp.stance, active: oppActive, uses: oppUses },
    });
    const fmt = (n: number) => (Number.isFinite(n) ? String(n) : '∞');
    let outcome = '';
    if (out.outcome === 'double-guard') outcome = 'Deux Gardes : aucune blessure';
    else if (out.outcome === 'tie-assault') outcome = 'Égalité d’Assauts : impacts simultanés';
    else if (out.guardWin) outcome = out.winner === 'p1' ? 'Votre Garde l’emporte' : 'La Garde adverse l’emporte';
    else outcome = out.winner === 'p1' ? (out.zeroDamageRankWin ? 'Vous dominez au Rang mais la Garde absorbe tout (0)' : 'Vous dominez au Rang') : 'Le rival domine au Rang';
    return { myScore: fmt(out.scores.p1), oppScore: fmt(out.scores.p2), myMult: out.multipliers.p1, dealt: out.damage.p2, taken: out.damage.p1, outcome, gagne: out.winner === 'p1' ? 'me' : out.winner === 'p2' ? 'opp' : null };
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
