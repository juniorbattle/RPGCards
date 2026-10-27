/**
 * M12 (contrat 2, ADR 045) — la scène des activations : projection DOM, au premier plan, des temps forts construits par
 * `activations.ts`. Au centre de l'écran : la carte agrandie, des impulsions de la couleur de sa famille, la bannière du
 * nom (avec l'icône du déclenchement ou le sceau de la Technique), la conséquence en grand ; un tampon pour une
 * annulation, une carte vue pour un regard privé, deux cartes et un éclair pour une Interférence, un sceau pour une
 * Technique, l'emblème immense pour une Signature annoncée.
 *
 * Comme la scène du Clash (M03) : des COPIES de représentation (cartes clonées), la Web Animations API (transformations,
 * opacité, filtres), un hôte hors du plateau (ses re-rendus n'interrompent rien) et hors de celui de la scène du Clash
 * (qui remplace son contenu à chaque Clash), posé au-dessus. Rythmes : normal, rapide (durées ×
 * facteur), instantané (rien) ; mouvement réduit : aucun déplacement ni zoom, des fondus ; gel (captures) : le dernier
 * temps fort posé dans son état tenu ; `stop()` retire tout, tout de suite. Le premier plan ne capte aucun clic.
 */
import type { Family } from '../game/catalog/cards';
import { emblemSvg } from '../art/emblems';
import type { Activation } from './activations';
import { ACTIVATION_MS } from './activations';
import { backEl, cardEl } from './cardView';
import { cls, h } from './dom';
import { techniqueSeal, triggerIcon } from './effectIcons';

export interface ActivationStageDeps {
  artSeed: number;
  reduced(): boolean;
  freeze(): boolean;
  /** Facteur de durée (normal 1, rapide 0,45) ; `instant` : la scène ne joue rien. */
  pace(): number;
  instant(): boolean;
  /** Début d'un temps fort (son, QA). */
  onStart?(a: Activation): void;
  /** Un grand temps fort assourdit la scène du Clash (`true`), puis la rend (`false`). */
  dim?(on: boolean): void;
}

type Frames = Keyframe[];

/** Temps forts discrets : un bandeau ou une pastille, sans voile ni carte agrandie. */
const SMALL: ReadonlySet<string> = new Set(['echec', 'insight', 'soin']);

export class ActivationStage {
  private root: HTMLElement;
  private queue: Activation[] = [];
  private current: { a: Activation; el: HTMLElement; anims: Animation[]; timer: number; end: number } | null = null;
  /** QA : temps forts joués (genre et titre), dans l'ordre. */
  readonly played: Array<{ kind: string; title: string; side: string }> = [];
  /** QA (`?qa=1`) : genres à figer à leur premier passage (captures), fraction de la durée, temps fort figé. */
  private holdKinds: Set<string> | null = null;
  private holdAt = 0.5;
  held: Activation | null = null;

  constructor(host: HTMLElement, private readonly deps: ActivationStageDeps) {
    this.root = h('div', { class: 'act-stage', 'aria-live': 'polite' });
    host.append(this.root);
  }

  /** Vrai tant qu'un temps fort joue ou attend. */
  get busy(): boolean {
    return !!this.current || this.queue.length > 0;
  }

  /** Durée restante de la file (ms, rythme compris). */
  get remaining(): number {
    const now = performance.now();
    return this.queue.reduce((s, a) => s + this.duration(a), 0) + (this.current ? Math.max(0, this.current.end - now) : 0);
  }

  private duration(a: Activation): number {
    return Math.max(120, ACTIVATION_MS[a.kind] * this.deps.pace());
  }

  /** Ajoute des temps forts à la file (joués l'un après l'autre) ; rend la durée restante de la file (ms). */
  play(list: readonly Activation[]): number {
    if (!list.length || this.deps.instant()) return 0;
    if (this.deps.freeze()) {
      // gel : seul le dernier temps fort, posé dans son état tenu (captures déterministes) ; rien n'attend
      this.stop();
      const a = list.at(-1)!;
      this.played.push({ kind: a.kind, title: a.title, side: a.side });
      const el = this.build(a);
      el.classList.add('held');
      this.root.append(el);
      this.dim(a);
      return 0;
    }
    this.queue.push(...list);
    if (!this.current) this.next();
    return this.remaining;
  }

  /** Retire tout, tout de suite (Passer, nouvelle séquence, sortie du duel) : aucun élément ne subsiste. */
  stop(): void {
    this.queue = [];
    this.held = null;
    if (this.current) {
      window.clearTimeout(this.current.timer);
      for (const an of this.current.anims) an.cancel();
      this.current.el.remove();
      this.current = null;
    }
    this.root.replaceChildren();
    this.deps.dim?.(false);
  }

  dispose(): void {
    this.stop();
    this.root.remove();
  }

  // ---------------------------------------------------------------------------------------------

  private next(): void {
    const a = this.queue.shift();
    if (!a) { this.current = null; this.deps.dim?.(false); return; }
    const ms = this.duration(a);
    const el = this.build(a);
    this.root.append(el);
    this.played.push({ kind: a.kind, title: a.title, side: a.side });
    this.dim(a);
    this.deps.onStart?.(a);
    const anims = this.animate(el, a, ms);
    const timer = window.setTimeout(() => {
      for (const an of anims) an.cancel();
      el.remove();
      this.current = null;
      this.next();
    }, ms);
    this.current = { a, el, anims, timer, end: performance.now() + ms };
    if (this.holdKinds?.delete(a.kind)) {
      window.clearTimeout(timer);
      for (const an of anims) { an.currentTime = ms * this.holdAt; an.pause(); }
      this.held = a;
    }
  }

  /** QA : fige le premier temps fort de chacun de ces genres à la fraction `at` de sa durée (jusqu'à `release`). */
  holdOn(kinds: readonly string[], at = 0.5): void {
    this.holdKinds = new Set(kinds);
    this.holdAt = at;
  }

  /** QA : reprend la file après un temps fort figé. */
  release(): void {
    if (!this.held || !this.current) { this.held = null; return; }
    for (const an of this.current.anims) an.cancel();
    this.current.el.remove();
    this.current = null;
    this.held = null;
    this.next();
  }

  /** Un grand temps fort assourdit la scène du Clash ; les petits (bandeau, pastille) la laissent. */
  private dim(a: Activation): void {
    this.deps.dim?.(!SMALL.has(a.kind));
  }

  /** Une carte (copie) ou un dos aux couleurs de la famille. */
  private card(defId: string | null, family: Family | null, cls2: string[] = []): HTMLElement {
    const el = defId
      ? cardEl(defId, { artSeed: this.deps.artSeed, tag: 'div', banner: false, classes: ['act-copy', ...cls2] })
      : backEl(this.deps.artSeed, { classes: ['act-copy', ...cls2, family ? `fam-${family}` : 'fam-neutre'], label: 'Carte masquée' });
    el.setAttribute('aria-hidden', 'true');
    el.removeAttribute('tabindex');
    return el;
  }

  private build(a: Activation): HTMLElement {
    const who = a.side === 'me' ? 'Vous' : 'Rival';
    const icon = a.technique ? techniqueSeal(a.technique, 22) : a.trigger ? triggerIcon(a.trigger, 22) : '';
    const banner = h('div', { class: 'act-banner' },
      icon ? h('span', { class: 'act-ico', html: icon }) : null,
      h('b', { class: 'act-title' }, a.title),
      h('span', { class: 'act-who' }, a.private ? `${who} · privé` : who));
    const cons = a.consequence ? h('div', { class: 'act-cons' }, a.consequence) : null;
    const detail = a.detail ? h('div', { class: 'act-detail' }, a.detail) : null;
    const root = h('div', {
      class: cls('act', `act-${a.kind}`, `tone-${a.tone}`, `side-${a.side}`, a.family ? `fam-${a.family}` : 'fam-neutre'),
      'data-key': `act-${a.kind}`, role: 'status', 'aria-label': `${a.title} : ${a.consequence}. ${a.detail}`,
    });
    // l'échec et les petits temps forts (Insight, soin) : un bandeau ou une pastille, sans voile ni carte agrandie
    if (a.kind === 'echec') {
      root.append(h('div', { class: 'act-strip' }, h('b', null, a.title), h('span', null, a.detail)));
      return root;
    }
    if (SMALL.has(a.kind)) {
      root.append(h('div', { class: 'act-chip' }, h('b', null, a.consequence), h('span', null, a.side === 'me' ? 'vous' : 'rival')));
      this.placeNear(root, a.to);
      return root;
    }
    root.append(h('div', { class: 'act-veil' }), h('div', { class: 'act-rings' }, h('i'), h('i'), h('i')));
    const center = h('div', { class: 'act-center' });
    switch (a.kind) {
      case 'technique':
        center.append(h('div', { class: 'act-seal' }, h('span', { class: 'act-seal-ring' }), h('span', { class: 'act-seal-ico', html: techniqueSeal(a.technique!, 120) })));
        break;
      case 'signature':
        center.append(h('div', { class: 'act-emblem', html: a.family ? emblemSvg(a.family, 360) : '' }), this.card(a.defId, a.family, ['act-main']));
        break;
      case 'regard': {
        const seen = a.seen ?? [];
        if (seen.length) for (const id of seen) center.append(this.card(id, null, ['act-main', seen.length > 1 ? 'act-pair' : '']));
        else center.append(h('div', { class: 'act-seal' }, h('span', { class: 'act-seal-ring' }), h('span', { class: 'act-seal-ico', html: techniqueSeal(a.technique ?? 'Sondage', 120) })));
        root.append(h('div', { class: 'act-private' }, 'PRIVÉ — vous seul voyez'));
        break;
      }
      case 'interference':
        center.append(
          this.card(a.defId, a.family, ['act-src']),
          h('div', { class: 'act-bolt', html: triggerIcon('use-interfere', 90) }),
          this.card(a.targetDefId ?? null, null, ['act-tgt', a.tone !== 'neutral' ? 'is-cancelled' : '']),
        );
        break;
      case 'camouflage':
        center.append(this.card(null, 'Voile', ['act-main']), h('div', { class: 'act-veil-drop' }));
        break;
      case 'dissipation':
        center.append(this.card(a.defId, a.family, ['act-main']), h('div', { class: 'act-tear l' }), h('div', { class: 'act-tear r' }));
        break;
      default:
        center.append(this.card(a.kind === 'masque' ? null : a.defId, a.family, ['act-main']));
    }
    if (a.kind === 'annule' || (a.kind === 'masque' && a.consequence === 'ANNULÉ')) center.append(h('div', { class: 'act-stamp' }, 'ANNULÉ'));
    if (a.kind === 'interference' && a.tone !== 'neutral') center.append(h('div', { class: 'act-stamp act-stamp-tgt' }, 'ANNULÉ'));
    root.append(center, banner);
    if (cons) root.append(cons);
    if (detail) root.append(detail);
    return root;
  }

  /** Place un petit temps fort près d'un élément du HUD (`me-insight`, `opp-hp`…). */
  private placeNear(el: HTMLElement, key: string | null): void {
    if (!key) return;
    const [side, what] = key.split('-');
    const target = document.querySelector<HTMLElement>(`.hud.${side} ${what === 'insight' ? '.insight' : '.hp, .hpbar, .hp-bar'}`) ?? document.querySelector<HTMLElement>(`.hud.${side}`);
    if (!target) return;
    const r = target.getBoundingClientRect();
    el.style.setProperty('--ax', `${Math.round(r.right + 10)}px`);
    el.style.setProperty('--ay', `${Math.round(r.top + r.height / 2)}px`);
    el.classList.add('anchored');
  }

  /** Les animations d'un temps fort (mouvement réduit : opacité seulement). */
  private animate(el: HTMLElement, a: Activation, ms: number): Animation[] {
    const reduced = this.deps.reduced();
    const out: Animation[] = [];
    // mouvement réduit : ni déplacement, ni zoom, ni rotation (opacité et filtres gardés)
    const still = (frames: Frames): Frames => (reduced ? frames.map(({ transform: _t, translate: _u, scale: _s, rotate: _r, ...rest }) => rest) : frames);
    // l'accélération va sur chaque segment (entre deux images clés) ; l'itération reste linéaire, sinon les poses tenues
    // (de 0,28 à 0,84 de la durée) glisseraient vers le début
    const eased = (frames: Frames, e: string): Frames => frames.map((k, i) => (i < frames.length - 1 && !k.easing ? { ...k, easing: e } : k));
    const run = (sel: string, frames: Frames, o: { dur?: number; easing?: string; all?: boolean; stagger?: number } = {}) => {
      const nodes = o.all ? [...el.querySelectorAll<HTMLElement>(sel)] : [el.querySelector<HTMLElement>(sel)].filter(Boolean) as HTMLElement[];
      nodes.forEach((n, i) => out.push(n.animate(still(eased(frames, o.easing ?? 'ease-out')), { duration: o.dur ?? ms, delay: i * ms * (o.stagger ?? 0), easing: 'linear', fill: 'both' })));
    };
    // apparition et sortie générales
    out.push(el.animate([{ opacity: 0 }, { opacity: 1, offset: 0.1 }, { opacity: 1, offset: 0.86 }, { opacity: 0 }], { duration: ms, easing: 'linear', fill: 'both' }));
    if (SMALL.has(a.kind)) {
      // `translate` et `scale` (propriétés propres) se composent avec la position du bandeau ou de la pastille
      run('.act-strip, .act-chip', [{ translate: '0 10px', scale: '0.9' }, { translate: '0 0', scale: '1.06', offset: 0.2 }, { translate: '0 0', scale: '1', offset: 0.3 }, { translate: '0 -6px', scale: '1' }]);
      return out;
    }
    run('.act-rings i', [{ transform: 'translate(-50%, -50%) scale(0.35)', opacity: 0.95 }, { transform: 'translate(-50%, -50%) scale(2.4)', opacity: 0 }], { all: true, stagger: 0.16, dur: ms * 0.62, easing: 'cubic-bezier(.2,.7,.3,1)' });
    run('.act-center', [
      { transform: 'translate(-50%, -50%) scale(0.55)' },
      { transform: 'translate(-50%, -50%) scale(1.08)', offset: 0.18 },
      { transform: 'translate(-50%, -50%) scale(1)', offset: 0.28 },
      { transform: 'translate(-50%, -50%) scale(1)', offset: 0.84 },
      a.kind === 'repousse'
        ? { transform: `translate(-50%, ${a.side === 'me' ? '-160%' : '60%'}) scale(0.45)` }
        : { transform: 'translate(-50%, -50%) scale(0.92)' },
    ], { easing: 'cubic-bezier(.2,.8,.25,1)' });
    run('.act-banner', [{ transform: 'translate(-50%, 14px)' }, { transform: 'translate(-50%, 0)', offset: 0.22 }, { transform: 'translate(-50%, 0)' }]);
    run('.act-cons', [{ transform: 'translate(-50%, 0) scale(1.7)', filter: 'blur(4px)' }, { transform: 'translate(-50%, 0) scale(1.7)', filter: 'blur(4px)', offset: 0.2 }, { transform: 'translate(-50%, 0) scale(1)', filter: 'blur(0px)', offset: 0.32 }, { transform: 'translate(-50%, 0) scale(1)', filter: 'blur(0px)' }]);
    run('.act-stamp', [{ transform: 'translate(-50%, -50%) rotate(-24deg) scale(2.4)', opacity: 0 }, { transform: 'translate(-50%, -50%) rotate(-24deg) scale(2.4)', opacity: 0, offset: 0.36 }, { transform: 'translate(-50%, -50%) rotate(-14deg) scale(1)', opacity: 1, offset: 0.46 }, { transform: 'translate(-50%, -50%) rotate(-14deg) scale(1)', opacity: 1 }], { all: true, easing: 'cubic-bezier(.3,1.4,.5,1)' });
    if (a.kind === 'annule') run('.act-main', [{ filter: 'grayscale(0)' }, { filter: 'grayscale(0)', offset: 0.44 }, { filter: 'grayscale(0.85) brightness(0.8)', offset: 0.5 }, { filter: 'grayscale(0.85) brightness(0.8)' }]);
    if (a.kind === 'technique' || a.kind === 'regard') run('.act-seal-ring', [{ transform: 'rotate(0deg)' }, { transform: 'rotate(140deg)' }], { easing: 'linear' });
    if (a.kind === 'signature') run('.act-emblem', [{ transform: 'translate(-50%, -50%) scale(0.6) rotate(-8deg)', opacity: 0 }, { transform: 'translate(-50%, -50%) scale(1.05) rotate(0deg)', opacity: 0.5, offset: 0.3 }, { transform: 'translate(-50%, -50%) scale(1.15) rotate(4deg)', opacity: 0 }]);
    if (a.kind === 'interference') {
      run('.act-bolt', [{ transform: 'translate(-50%, -50%) scale(0.2)', opacity: 0 }, { transform: 'translate(-50%, -50%) scale(0.2)', opacity: 0, offset: 0.2 }, { transform: 'translate(-50%, -50%) scale(1.2)', opacity: 1, offset: 0.34 }, { transform: 'translate(-50%, -50%) scale(1)', opacity: a.tone === 'neutral' ? 0.15 : 1 }]);
      if (a.tone !== 'neutral') run('.act-tgt', [{ filter: 'none' }, { filter: 'none', offset: 0.42 }, { filter: 'grayscale(0.85) brightness(0.75)', offset: 0.5 }, { filter: 'grayscale(0.85) brightness(0.75)' }]);
    }
    if (a.kind === 'camouflage') run('.act-veil-drop', [{ transform: 'translateY(-110%)', opacity: 0 }, { transform: 'translateY(-110%)', opacity: 0, offset: 0.2 }, { transform: 'translateY(0)', opacity: 1, offset: 0.5 }, { transform: 'translateY(0)', opacity: 1 }]);
    if (a.kind === 'dissipation') {
      run('.act-tear.l', [{ transform: 'translateX(0)', opacity: 1 }, { transform: 'translateX(0)', opacity: 1, offset: 0.3 }, { transform: 'translateX(-70%) rotate(-8deg)', opacity: 0, offset: 0.6 }, { transform: 'translateX(-70%)', opacity: 0 }]);
      run('.act-tear.r', [{ transform: 'translateX(0)', opacity: 1 }, { transform: 'translateX(0)', opacity: 1, offset: 0.3 }, { transform: 'translateX(70%) rotate(8deg)', opacity: 0, offset: 0.6 }, { transform: 'translateX(70%)', opacity: 0 }]);
    }
    return out;
  }
}
