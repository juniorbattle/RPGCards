/**
 * Session de duel DÉMONTABLE (M04) : relie un Controller au DOM du plateau, à la scène du Clash et à
 * l’arène, puis se retire entièrement (`dispose`) — écouteurs, minuteries, scène — pour enchaîner
 * des duels sans recharger la page. Le contenu du duel (plateau, vues A/B, chorégraphies) est celui
 * de M03.2, inchangé ; seule l’enveloppe change.
 */
import { cardDef, cardTitle, EFFECTS } from '../game/catalog/cards';
import { son } from '../son/moteur';
import { sonDuTempsFort } from '../son/evenements';
import { roleDuelStandard, type RoleDuel } from '../son/musique/chef';
import type { Command, GameConfig } from '../game/model/types';
import { artCacheSize } from '../art/cardArt';
import { artWarmStats, warmCardArt } from '../art/artWarmup';
import { buildMemory } from '../game/ai/memory';
import { viewFor, visibleEvents } from '../game/visibility/view';
import { patchBeat, patchInspector, patchRivalBubble, renderApp, renderCheckStats, type BoardHooks } from '../presentation/board';
import { ClashStage } from '../presentation/clashStage';
import { ActivationStage } from '../presentation/activationStage';
import { DragManager } from '../presentation/drag';
import type { RivalPersonality } from '../presentation/personalities';
import type { ArenaHandle, ArenaLayout } from '../scene/arena';
import { Controller } from './controller';
import type { AppParams } from './params';
import type { Scenario } from './scenarios';

export interface DuelSessionOptions {
  app: HTMLElement;
  arena: ArenaHandle | null;
  config: GameConfig;
  params: AppParams;
  scenario: Scenario | null;
  personality: RivalPersonality;
  /** Commandes déjà jouées (reprise exacte) ; vide pour un nouveau duel. */
  resume?: readonly Command[];
  /** Outils propres à l’enveloppe (aide, menu, options persistées) ; sinon comportement historique. */
  onTool?: (tool: string) => boolean;
  /** Mode produit : pas d’écran de fin historique (l’enveloppe présente le résultat). */
  product?: BoardHooks['product'];
  /** Conseil contextuel du moment (mode produit). */
  tip?: (c: Controller) => ReturnType<NonNullable<BoardHooks['tip']>>;
  /** Après chaque commande acceptée (sauvegarde). */
  onCommand?: (c: Controller) => void;
  /** Fin de duel (phase ENDED) et mise en scène terminée. */
  onEnded?: (c: Controller) => void;
  /** M13 : le rôle musical du duel (aventure) ; par défaut, celui du rival du jeu standard (Kaï, ou le duel ordinaire). */
  musique?: RoleDuel;
  /** M13 : le lieu du duel (rue, bar, salle, arène) : la musique y prend son acoustique. */
  lieu?: string;
}

export class DuelSession {
  readonly controller: Controller;
  private readonly abort = new AbortController();
  private readonly stage: ClashStage;
  private readonly acts: ActivationStage;
  private readonly drag: DragManager;
  /** Vrai pendant qu’un écran de l’enveloppe (menu, confirmation) recouvre le plateau. */
  suspended = false;
  private endedNotified = false;

  constructor(private readonly o: DuelSessionOptions) {
    const { app, params } = o;
    const signal = this.abort.signal;
    // Illustrations du catalogue produites hors du fil principal (déjà lancé par l’accueil, sinon ici).
    warmCardArt(params.artSeed, params.artCheck);
    const c = new Controller(o.config, params, o.arena, o.scenario, o.personality, o.resume ?? []);
    this.controller = c;
    // M11-E : le bourdon du duel remplace l'ambiance de la ville
    son().ambiance('amb-duel');
    // M13 : la musique du duel (la ville ou le menu s'assourdit jusqu'à son premier temps) ; un duel repris retrouve ses couches
    son().musique.debutDuel(o.musique ?? roleDuelStandard(o.personality.id), c.match.events, c.pvPublics(), o.lieu);
    let pointerHeld = false;
    let pendingRender = false;
    let drag: DragManager | null = null;
    const hooks: BoardHooks = { onToggleTool: (t) => this.tool(t), product: o.product, tip: o.tip ? () => o.tip!(c) : undefined };
    // Aucun re-rendu pendant qu’un pointeur est enfoncé (glisser OU clic en cours) : un rendu
    // asynchrone (verrouillage de l’IA) ne doit jamais avaler une interaction humaine.
    const render = () => {
      if (c.disposed) return;
      if (drag?.dragging || pointerHeld) { pendingRender = true; return; }
      pendingRender = false;
      renderApp(app, c, hooks);
      this.syncLayout();
      this.checkEnded();
    };
    this.render = render;
    window.addEventListener('resize', () => this.syncLayout(), { signal });
    // Jeton du regard de début de tour lu au DÉBUT de l’interaction (voir endHold).
    let downToken = -1;
    app.addEventListener('pointerdown', (e) => {
      pointerHeld = true;
      downToken = c.holdToken;
      // Tactile : le toucher suivant referme l’inspection ouverte par un appui long (panneau non interactif).
      if (e.pointerType !== 'mouse' && c.ui.inspect) { c.ui.inspect = null; patchInspector(app, c); }
    }, { capture: true, signal });
    const release = () => { pointerHeld = false; if (pendingRender) window.setTimeout(render, 0); };
    window.addEventListener('pointerup', release, { capture: true, signal });
    window.addEventListener('pointercancel', release, { capture: true, signal });
    // Fin du regard de début de tour APRÈS l’interaction (clic, toucher, dépôt) : jamais pendant.
    // Le clic qui lance le tour (« Tour suivant ») ne l’achève pas : son jeton est périmé.
    const afterInteraction = (token: number) => window.setTimeout(() => { if (!c.disposed) c.endHold(token); }, 0);
    app.addEventListener('pointerup', () => afterInteraction(downToken), { signal });
    window.addEventListener('keydown', (e) => {
      if (this.suspended) return;
      if (!['Tab', 'Shift', 'Control', 'Alt', 'Meta', 'v', 'V', 'Escape'].includes(e.key)) afterInteraction(c.holdToken);
    }, { capture: true, signal });
    c.onRender(render);
    c.onExpression(() => patchRivalBubble(app, c));
    // Scène du Clash : hôte HORS de #app (les re-rendus du plateau n’interrompent jamais l’animation).
    let stageHost = document.getElementById('stage');
    if (!stageHost) { stageHost = document.createElement('div'); stageHost.id = 'stage'; document.body.append(stageHost); }
    const stage = new ClashStage(stageHost, { artSeed: params.artSeed, rivalName: o.personality.name, reduced: () => params.reducedMotion, freeze: () => params.freeze, pace: () => c.paceFactor() });
    this.stage = stage;
    c.onMotion((m) => {
      if (m.type === 'begin') stage.begin(m.script);
      else if (m.type === 'step') stage.step(m.step);
      else if (m.type === 'end') stage.end();
      else stage.stop();
    });
    // M12 : temps forts des activations, au premier plan, sur leur propre hôte au-dessus de la scène du Clash (celle-ci
    // remplace le contenu du sien à chaque Clash)
    let actHost = document.getElementById('activations');
    if (!actHost) { actHost = document.createElement('div'); actHost.id = 'activations'; document.body.append(actHost); }
    const clashHost = stageHost;
    const acts = new ActivationStage(actHost, {
      artSeed: params.artSeed, reduced: () => params.reducedMotion, freeze: () => params.freeze, pace: () => c.paceFactor(), instant: () => params.pace === 'instant',
      onStart: (a) => { const x = sonDuTempsFort(a.kind, a.consequence); if (x) son().jouer(x); },
      dim: (on) => clashHost.classList.toggle('act-on', on),
    });
    this.acts = acts;
    c.onActivations({ play: (list) => acts.play(list), stop: () => acts.stop() });
    c.onBeat(() => {
      if (drag?.dragging || pointerHeld) { pendingRender = true; return; }
      patchBeat(app, c);
    });
    c.onCommand(() => o.onCommand?.(c));
    drag = new DragManager(app, c, render, signal);
    this.drag = drag;
    // Clavier sur cartes de main (Entrée/Espace déclenchent un clic natif sans pointeur).
    app.addEventListener('click', (e) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('.hand [data-drag-card]');
      if (el && e.detail === 0) c.clickHandCard(el.dataset.dragCard!);
    }, { signal });
    window.addEventListener('keydown', (e) => this.key(e), { signal });
    render();
    if (params.qa) this.exposeQa();
  }

  /** Re-rendu complet du plateau (fusionné si un pointeur est enfoncé). */
  readonly render: () => void;

  /**
   * Ancrage caméra ↔ mise en page : la feuille de style fixe, par vue et par gabarit (bureau,
   * mobile), les hauteurs d’écran de la tête du rival et du bord lointain de la table.
   */
  syncLayout(): void {
    const cs = getComputedStyle(this.o.app);
    const num = (name: string, fb: number) => { const v = parseFloat(cs.getPropertyValue(name)); return Number.isFinite(v) ? v : fb; };
    const l: ArenaLayout = {
      A: { head: num('--a-head', 0.2), edge: num('--a-edge', 0.42) },
      B: { head: num('--b-head', 0.12), edge: num('--b-edge', 0.3) },
    };
    this.o.arena?.setLayout(l);
  }

  private checkEnded(): void {
    const c = this.controller;
    if (this.endedNotified || c.view.phase !== 'ENDED' || c.sequencing) return;
    this.endedNotified = true;
    // Hors du rendu en cours : l’enveloppe peut remplacer l’écran sans réentrer dans renderApp.
    window.setTimeout(() => { if (!c.disposed) this.o.onEnded?.(c); }, 0);
  }

  private key(e: KeyboardEvent): void {
    if (this.suspended) return;
    const c = this.controller;
    const app = this.o.app;
    if (e.target instanceof HTMLInputElement) return;
    const k = e.key.toLowerCase();
    if (k === 'escape') { c.cancel(); return; }
    if (k === 'v' && !e.ctrlKey && !e.metaKey) { c.toggleView(); return; }
    if (k === 'a' && !e.ctrlKey && !e.metaKey) c.setStance('assault');
    else if (k === 'g' && !e.ctrlKey && !e.metaKey) c.setStance('guard');
    else if (/^[1-6]$/.test(k)) {
      const id = c.handIds()[Number(k) - 1];
      if (id) { c.clickHandCard(id); (app.querySelector(`[data-key="hand-${CSS.escape(id)}"]`) as HTMLElement | null)?.focus(); }
    } else if (k === 'n' || (k === 'enter' && !(document.activeElement instanceof HTMLButtonElement) && !(document.activeElement as HTMLElement | null)?.getAttribute('role'))) {
      (app.querySelector('[data-primary-action]:not(:disabled)') as HTMLButtonElement | null)?.click();
    }
  }

  /** Outils de la barre (haut-droite) : réglages de présentation, jamais le moteur. */
  private tool(t: string): void {
    const c = this.controller;
    const params = this.o.params;
    if (this.o.onTool?.(t)) return;
    if (t === 'smaller' || t === 'bigger') {
      params.scale = Math.min(1.5, Math.max(0.8, params.scale + (t === 'bigger' ? 0.1 : -0.1)));
      document.documentElement.style.setProperty('--ui-scale', params.scale.toFixed(2));
    }
    if (t === 'motion') {
      params.reducedMotion = !params.reducedMotion;
      document.documentElement.classList.toggle('reduced', params.reducedMotion);
      this.o.arena?.setReducedMotion(params.reducedMotion);
    }
    if (t === 'cam') return c.toggleView();
    if (t === 'pace') params.pace = params.pace === 'normal' ? 'fast' : params.pace === 'fast' ? 'instant' : 'normal';
    if (t === 'journal') c.ui.journalOpen = !c.ui.journalOpen;
    this.render();
  }

  private exposeQa(): void {
    const c = this.controller;
    const stage = this.stage;
    const arena = this.o.arena;
    // Crochet QA explicite (?qa=1) : pilotage déterministe des captures. Jamais actif par défaut.
    (window as unknown as Record<string, unknown>).__lqv = {
      controller: c,
      view: () => viewFor(c.match.state, 'p1'),
      state: () => c.match.state,
      apply: (cmd: Parameters<Controller['apply']>[0]) => c.apply(cmd),
      hash: () => c.match.hash(),
      record: () => c.match.record(),
      arenaStats: () => arena?.stats() ?? null,
      // QA M12 : temps forts joués (genre, titre, camp) et file en cours
      activations: () => ({ played: [...this.acts.played], busy: this.acts.busy, held: this.acts.held, shown: [...document.querySelectorAll<HTMLElement>('#activations .act')].map((e) => e.dataset.key ?? '') }),
      actHoldOn: (kinds: string[], at?: number) => this.acts.holdOn(kinds, at),
      actRelease: () => this.acts.release(),
      actPlay: (list: Parameters<ActivationStage['play']>[0]) => this.acts.play(list),
      presentation: () => ({ view: c.viewMode, switches: c.director.switches, manual: c.director.manual, holding: c.director.holding, sequencing: c.sequencing, rival: c.rivalExpression, personality: c.rival.id, stage: stage.active, stageLeaving: stage.leaving, clash: c.seq?.script ? { outcome: c.seq.script.outcome, winner: c.seq.script.winner, verdict: c.seq.script.verdict } : null, beat: c.currentBeat()?.kind ?? null }),
      artCache: () => artCacheSize(),
      // QA passe 14 : pré-génération des illustrations par le worker (`artCheck=1` : comparaison).
      artWarm: () => artWarmStats(),
      pauseSequence: () => c.pauseSequence(),
      stageSeek: (ms: number) => stage.seek(ms),
      // QA M03.1B : ce que le SIÈGE du rival peut voir (vue, mémoire) — jamais affiché, sert aux assertions.
      rivalView: () => viewFor(c.match.state, 'p2'),
      rivalMemory: () => buildMemory(visibleEvents(c.match.events, 'p2'), 'p2'),
      events: () => c.match.events,
      // QA passe 13 (`renderCheck=1`) : rendus ciblés comparés à un rendu complet du même état.
      renderCheck: () => renderCheckStats(),
      cardInfo: (defId: string) => ({ title: cardTitle(cardDef(defId)), name: cardDef(defId).name, effect: cardDef(defId).effect ? EFFECTS[cardDef(defId).effect!].name : null }),
    };
  }

  /** Retire tout : minuteries du contrôleur, écouteurs, scène du Clash, contenu du plateau. */
  dispose(): void {
    son().ambiance(null);
    son().musique.finDuel();
    this.controller.dispose();
    this.abort.abort();
    this.drag.dispose();
    this.stage.stop();
    this.acts.dispose();
    this.o.app.replaceChildren();
    this.o.app.className = '';
    delete this.o.app.dataset.view;
    delete this.o.app.dataset.boardKey;
    const w = window as unknown as Record<string, unknown>;
    if (this.o.params.qa && (w.__lqv as { controller?: unknown } | undefined)?.controller === this.controller) delete w.__lqv;
  }
}
