/**
 * Enveloppe de jeu (M04) : accueil, deck, rencontres, préparation, duel, résultat, options, aide.
 *
 * - Le flux d’écrans est la machine PURE `product/flow` ; ce module ne fait qu’afficher l’écran
 *   courant et exécuter les effets (sauvegarde, arène, session de duel).
 * - Le duel est la session M03.2 inchangée (`DuelSession`, mode produit) ; l’arène unique est figée
 *   hors duel et montre le rival de la rencontre derrière les écrans.
 * - Chaque changement de profil, de deck, d’options ou de résultat est écrit tout de suite
 *   (écriture vérifiée, copie de secours) ; un échec d’écriture est signalé, jamais caché.
 */
import './shell.css';
import type { AppParams } from '../app/params';
import { DuelSession } from '../app/duelSession';
import type { Controller } from '../app/controller';
import { cardTitle, cardDef } from '../game/catalog/cards';
import { viewFor } from '../game/visibility/view';
import type { ArenaHandle } from '../scene/arena';
import type { RivalPersonality } from '../presentation/personalities';
import { FULL_COLLECTION, STARTER_COLLECTION } from '../product/collection';
import { validateDeck, type Collection, type DeckChoice } from '../product/deck';
import { ENCOUNTERS, encounterById, encounterConfig, personalityOf, type Encounter } from '../product/encounters';
import { INITIAL_FLOW, transition, type DuelOverlay, type FlowContext, type FlowEvent, type FlowState } from '../product/flow';
import { DEFAULT_OPTIONS, HISTORY_MAX, SaveStore, duelSeed, newSave, type DuelSummary, type LoadResult, type SaveData } from '../product/save';
import { summarize } from '../product/stats';
import { confirmDialog, h, shellToast } from './ui';
import { renderBoard, renderHome, renderPrep, renderResult } from './screens';
import { renderDeck } from './deckEditor';
import { renderOptions } from './options';
import { renderHelp } from './help';
import { duelTip } from './tips';

export interface ShellDeps {
  shellHost: HTMLElement;
  app: HTMLElement;
  params: AppParams;
  /** Arène unique (ou `null` sans WebGL) ; `ensure` crée/échange le rival. */
  ensureArena(p: RivalPersonality): ArenaHandle | null;
  /** Recrée l’arène (changement de seed esthétique hors duel). */
  resetArena(): void;
  /** Arène courante (ou `null`). */
  arena(): ArenaHandle | null;
}

/** Duel en cours dans cette page (M04 : non repris après fermeture — voir M05). */
interface LiveDuel {
  id: string;
  encounter: Encounter;
  seed: number;
  session: DuelSession;
}

export class Shell {
  flow: FlowState = { ...INITIAL_FLOW };
  save: SaveData | null = null;
  readonly store: SaveStore;
  load: LoadResult;
  live: LiveDuel | null = null;
  /** Dernier résultat (écran Résultat). */
  lastResult: DuelSummary | null = null;
  /** Brouillon du deck en cours d’édition (null = pas d’édition). */
  deckDraft: DeckChoice | null = null;
  /** Sous-état de l’accueil : menu, ou création d’un profil. */
  homeMode: 'menu' | 'new' = 'menu';
  newDraft: { name: string; deck: DeckChoice } | null = null;
  private explicit: Set<string>;
  private keyHandler = (e: KeyboardEvent) => this.onKey(e);

  constructor(readonly d: ShellDeps) {
    this.store = new SaveStore(SaveStore.browser());
    this.load = this.store.load();
    if (this.load.status === 'ok') this.save = this.load.save;
    // Paramètres d’URL explicitement fournis (QA) : prioritaires sur les options sauvegardées.
    this.explicit = new Set([...new URLSearchParams(window.location.search).keys()]);
    this.applyOptions();
    document.addEventListener('keydown', this.keyHandler);
    this.render();
  }

  get params(): AppParams {
    return this.d.params;
  }

  // ------------------------------------------------------------------------
  // Faits pour la machine de flux

  collection(): Collection {
    if (!this.save) return STARTER_COLLECTION;
    return this.save.options.fullCollection ? FULL_COLLECTION : STARTER_COLLECTION;
  }

  deckIssues(deck: DeckChoice | null = this.save?.deck ?? null) {
    return deck ? validateDeck(deck, this.collection()) : [{ code: 'deck-shape' as const, text: 'Aucun deck.' }];
  }

  playable(): string[] {
    return this.save ? ENCOUNTERS.map((e) => e.id) : [];
  }

  flowContext(): FlowContext {
    return { hasSave: !!this.save, deckLegal: this.deckIssues().length === 0, activeDuel: this.live ? this.live.encounter.id : null, playable: this.playable() };
  }

  /** Transition du flux ; un refus est affiché (jamais un clic sans effet). */
  go(e: FlowEvent): boolean {
    const r = transition(this.flow, e, this.flowContext());
    if (!r.ok) { this.toast(r.reason, 'error'); return false; }
    const from = this.flow.screen;
    this.flow = r.state;
    if (from === 'deck' && this.flow.screen !== 'deck') this.deckDraft = null;
    this.render();
    return true;
  }

  toast(text: string, kind: 'error' | 'info' | 'ok' = 'info'): void {
    shellToast(document.body, text, kind);
  }

  /** Écrit la sauvegarde ; un échec est signalé (la partie continue en mémoire). */
  persist(): boolean {
    if (!this.save) return false;
    const w = this.store.write(this.save);
    if (!w.ok) this.toast(`Sauvegarde non enregistrée : ${w.reason}`, 'error');
    return w.ok;
  }

  // ------------------------------------------------------------------------
  // Options (présentation uniquement) : sauvegardées, appliquées aux paramètres d’exécution.

  applyOptions(): void {
    const o = this.save?.options ?? DEFAULT_OPTIONS;
    const p = this.params;
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    if (!this.explicit.has('pace')) p.pace = o.pace;
    if (!this.explicit.has('reducedMotion')) p.reducedMotion = o.reducedMotion ?? prefersReduced;
    if (!this.explicit.has('scale')) p.scale = o.scale;
    if (!this.explicit.has('artSeed')) p.artSeed = o.artSeed;
    this.applyParams();
  }

  /** Paramètres d’exécution → document et arène (taille du texte, mouvement réduit). */
  applyParams(): void {
    const p = this.params;
    document.documentElement.style.setProperty('--ui-scale', p.scale.toFixed(2));
    document.documentElement.classList.toggle('reduced', p.reducedMotion);
    this.d.arena()?.setReducedMotion(p.reducedMotion);
  }

  /** Reporte dans les options sauvegardées un réglage changé depuis la barre d’outils du duel. */
  captureToolOptions(): void {
    if (!this.save) return;
    const o = this.save.options;
    const p = this.params;
    const next = { ...o, pace: p.pace, scale: Math.round(p.scale * 10) / 10, reducedMotion: p.reducedMotion };
    if (JSON.stringify(next) !== JSON.stringify(o)) { this.save.options = next; this.persist(); }
  }

  // ------------------------------------------------------------------------
  // Profil

  async newGame(name: string, deck: DeckChoice): Promise<void> {
    const seed = (crypto.getRandomValues(new Uint32Array(1))[0] ?? Date.now()) >>> 0;
    const s = newSave(new Date(), name.trim() || 'Duelliste', seed, deck);
    // Les options déjà réglées (accessibilité) survivent à une nouvelle partie.
    if (this.save) s.options = { ...this.save.options };
    if (this.load.status === 'corrupt') this.store.quarantine();
    this.save = s;
    this.load = { status: 'ok', save: s, migratedFrom: null };
    this.persist();
    this.flow = { ...INITIAL_FLOW, screen: 'board' };
    this.render();
  }

  async eraseSave(): Promise<void> {
    const r = await confirmDialog({ title: 'Effacer la sauvegarde ?', text: 'Profil, deck, options et historique seront supprimés de ce navigateur. Cette action est définitive.', confirm: 'Effacer', danger: true });
    if (r !== 'confirm') return;
    this.store.erase();
    this.save = null;
    this.load = this.store.load();
    this.flow = { ...INITIAL_FLOW };
    this.applyOptions();
    this.toast('Sauvegarde effacée.', 'ok');
    this.render();
  }

  // ------------------------------------------------------------------------
  // Duel

  startDuel(): void {
    if (!this.save || !this.flow.encounterId) return;
    const enc = encounterById(this.flow.encounterId);
    if (!enc) return;
    const issues = this.deckIssues();
    if (issues.length) { this.toast(issues[0]!.text, 'error'); return; }
    if (!this.go({ type: 'startDuel' })) return;
    const n = this.save.duelCounter;
    const seed = this.explicit.has('seed') ? this.params.seed : duelSeed(this.save.profile.seed, n);
    this.save.duelCounter = n + 1;
    this.persist();
    const config = encounterConfig(enc, this.save.deck, seed);
    this.launch({ id: `d${n + 1}`, encounter: enc, seed }, config);
  }

  private launch(meta: Omit<LiveDuel, 'session'>, config: ReturnType<typeof encounterConfig>): void {
    const personality = personalityOf(meta.encounter.rival);
    const arena = this.d.ensureArena(personality);
    arena?.setPaused(false);
    this.d.app.hidden = false;
    const session = new DuelSession({
      app: this.d.app, arena, config, params: this.params, scenario: null, personality, product: { menu: true },
      tip: (c) => this.tipFor(c),
      onTool: (t) => this.duelTool(t),
      onEnded: (c) => this.duelEnded(c, false),
    });
    this.live = { ...meta, session };
    this.render();
  }

  private tipFor(c: Controller) {
    if (!this.save?.options.tips) return null;
    return duelTip(c, this.save.tipsSeen);
  }

  /** Outils du duel propres à l’enveloppe ; `false` = comportement par défaut de la session. */
  private duelTool(t: string): boolean {
    if (t === 'menu') { this.setOverlay('menu'); return true; }
    if (t === 'help') { this.setOverlay('help'); return true; }
    if (t.startsWith('tip:')) {
      if (this.save) {
        const seen = new Set(this.save.tipsSeen);
        seen.add(t.slice(4));
        this.save.tipsSeen = [...seen];
        this.persist();
      }
      this.live?.session.render();
      return true;
    }
    if (['pace', 'motion', 'smaller', 'bigger'].includes(t)) queueMicrotask(() => this.captureToolOptions());
    return false;
  }

  setOverlay(o: DuelOverlay): void {
    if (this.flow.screen !== 'duel') return;
    this.flow = { ...this.flow, overlay: o };
    if (this.live) this.live.session.suspended = o !== null;
    this.render();
  }

  async abandon(): Promise<void> {
    const live = this.live;
    if (!live) return;
    const r = await confirmDialog({ title: 'Abandonner le duel ?', text: `Le duel contre ${personalityOf(live.encounter.rival).name} sera compté comme un ABANDON (distinct d’une défaite par K.-O.).`, confirm: 'Abandonner', danger: true });
    if (r !== 'confirm') return;
    this.duelEnded(live.session.controller, true);
  }

  /** Fin de duel (K.-O. ou abandon) : résumé public enregistré AVANT tout affichage. */
  private duelEnded(c: Controller, abandoned: boolean): void {
    const live = this.live;
    if (!live || !this.save) return;
    const sum = summarize({ id: live.id, encounterId: live.encounter.id, rival: live.encounter.rival, seed: live.seed, signature: this.save.deck.signature, view: viewFor(c.match.state, 'p1'), events: c.match.events, abandoned, at: new Date() });
    this.save.history = [...this.save.history, sum].slice(-HISTORY_MAX);
    this.persist();
    this.lastResult = sum;
    live.session.dispose();
    this.live = null;
    this.d.app.hidden = true;
    this.flow = { ...this.flow, screen: 'result', overlay: null, back: [] };
    this.render();
  }

  // ------------------------------------------------------------------------
  // Rendu

  /** Rival montré dans l’arène derrière les écrans (rencontre courante, sinon dernier rival affronté). */
  private backdropRival(): RivalPersonality {
    const enc = this.flow.encounterId ? encounterById(this.flow.encounterId) : null;
    if (enc) return personalityOf(enc.rival);
    const last = this.save?.history.at(-1);
    return personalityOf((last?.rival as RivalPersonality['id'] | undefined) ?? 'braise');
  }

  render(): void {
    const host = this.d.shellHost;
    const s = this.flow;
    const inDuel = s.screen === 'duel';
    if (!inDuel) {
      const arena = this.d.ensureArena(this.backdropRival());
      // L’écran Résultat garde le rival vivant (sa réaction finale) ; les menus figent la scène.
      arena?.setPaused(s.screen !== 'result');
      arena?.setView('A');
      this.d.app.hidden = true;
    }
    const scr = s.screen === 'home' && this.homeMode === 'new' ? 'new' : s.screen;
    host.className = `shell scr-${scr}${inDuel && !s.overlay ? ' passive' : ''}`;
    host.hidden = inDuel && !s.overlay;
    const content = this.screenEl();
    host.replaceChildren(...(content ? [content] : []));
    // Focus : action principale de l’écran (navigation clavier sans souris).
    const primary = host.querySelector<HTMLElement>('[data-shell-primary]:not(:disabled)') ?? host.querySelector<HTMLElement>('.sh-title');
    if (primary && !host.hidden) primary.focus({ preventScroll: true });
  }

  private screenEl(): HTMLElement | null {
    const s = this.flow;
    switch (s.screen) {
      case 'home': return renderHome(this);
      case 'board': return renderBoard(this);
      case 'prep': return renderPrep(this);
      case 'result': return renderResult(this);
      case 'deck': return renderDeck(this);
      case 'options': return renderOptions(this, false);
      case 'help': return renderHelp(this, false);
      case 'collection': return renderDeck(this, true);
      case 'duel': {
        if (s.overlay === 'menu') return this.duelMenu();
        if (s.overlay === 'options') return renderOptions(this, true);
        if (s.overlay === 'help') return renderHelp(this, true);
        return null;
      }
    }
  }

  private duelMenu(): HTMLElement {
    const live = this.live;
    const name = live ? personalityOf(live.encounter.rival).name : 'le rival';
    return h('div', { class: 'sh-modal', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'sh-menu-t' },
      h('div', { class: 'sh-menu-box' },
        h('h2', { id: 'sh-menu-t', class: 'sh-title' }, 'Duel en pause'),
        h('p', { class: 'sh-sub' }, `Contre ${name}. Rien n’est décidé à votre place pendant la pause.`),
        h('div', { class: 'sh-menu-list' },
          menuBtn('Reprendre le duel', () => this.setOverlay(null), 'menu-resume', true),
          menuBtn('Options', () => this.setOverlay('options'), 'menu-options'),
          menuBtn('Aide et règles', () => this.setOverlay('help'), 'menu-help'),
          menuBtn('Abandonner le duel…', () => void this.abandon(), 'menu-abandon', false, true))));
  }

  private onKey(e: KeyboardEvent): void {
    if (document.querySelector('.sh-confirm')) return;
    if (e.key !== 'Escape') return;
    if (this.flow.screen === 'duel') {
      if (this.flow.overlay === 'menu') this.setOverlay(null);
      else if (this.flow.overlay) this.setOverlay('menu');
      return;
    }
    if (['deck', 'collection', 'options', 'help'].includes(this.flow.screen)) void this.leaveConsult();
  }

  /** Quitter un écran consultatif (le deck demande confirmation s’il reste des changements). */
  async leaveConsult(): Promise<void> {
    if (this.flow.screen === 'deck' && this.deckDraft && this.save && JSON.stringify(this.deckDraft) !== JSON.stringify(this.save.deck)) {
      const r = await confirmDialog({ title: 'Modifications non enregistrées', text: 'Quitter l’éditeur sans enregistrer ce deck ?', confirm: 'Quitter sans enregistrer' });
      if (r !== 'confirm') return;
    }
    this.go({ type: 'back' });
  }

  cardName(defId: string): string {
    return cardTitle(cardDef(defId));
  }
}

function menuBtn(label: string, onclick: () => void, key: string, primary = false, danger = false): HTMLElement {
  return h('button', { class: `sh-menu-item${danger ? ' danger' : ''}`, type: 'button', 'data-key': key, 'data-shell-primary': primary ? 'true' : null, onclick }, label);
}

export type { SaveData };
