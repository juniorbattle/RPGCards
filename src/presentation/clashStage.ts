/**
 * Scène du Clash (M03 §4) — projection DOM des intentions du ClashMotionDirector.
 *
 * Les Primaires sont des COPIES de représentation (clones de cartes) animées par la Web
 * Animations API (transformations, opacité, filtres : aucune texture régénérée par image).
 * Les vraies cartes du moteur ne bougent pas ; la scène ne lit que le script public.
 * Rythmes : normal / rapide (durées × facteur), instantané (pas de scène), mouvement réduit
 * (aucun déplacement : fondus et poses statiques), gel (pose finale immédiate, captures).
 * `stop()` nettoie tout immédiatement (Passer, nouvelle séquence) : aucun élément fantôme.
 */
import { cardEl } from './cardView';
import type { ClashScript, MotionStep, Side } from './clashMotion';
import { cls, h } from './dom';
import { STANCE_ICON, stanceBanner } from './stance';

export interface StageDeps {
  artSeed: number;
  rivalName: string;
  /** Mouvement réduit : aucun déplacement imposé, fondus et états statiques. */
  reduced(): boolean;
  /** Gel (captures) : chaque étape est posée dans son état final immédiatement. */
  freeze(): boolean;
  /** Facteur de durée (normal 1, rapide 0,45). */
  pace(): number;
}

type Step = Exclude<MotionStep, null>;
const ORDER: Step[] = ['present', 'impact', 'damage', 'cleanup'];
const SIDES: Side[] = ['opp', 'me'];

interface Parts {
  slot: HTMLElement;
  body: HTMLElement;
  wrap: HTMLElement;
  hit: HTMLElement;
  score: HTMLElement;
  shield: HTMLElement | null;
  dmg: HTMLElement;
}

export class ClashStage {
  private root: HTMLElement | null = null;
  private script: ClashScript | null = null;
  private done = new Set<Step>();
  private anims: Animation[] = [];
  private stepAnims: Animation[] = [];
  private parts: Record<Side, Parts> | null = null;
  private fx: { vs: HTMLElement; flash: HTMLElement; ring: HTMLElement; ring2: HTMLElement; verdict: HTMLElement; backdrop: HTMLElement } | null = null;
  private removeTimer = 0;

  constructor(private host: HTMLElement, private deps: StageDeps) {}

  get active(): boolean {
    return !!this.root;
  }

  /** Nouvelle séquence : mémorise le script (rien n’est affiché avant l’étape « present »). */
  begin(script: ClashScript | null): void {
    this.stop();
    this.script = script;
  }

  /** Joue une étape ; les étapes sautées (gel, rythme) sont posées instantanément, dans l’ordre. */
  step(step: MotionStep): void {
    if (!this.script || !step) return;
    const idx = ORDER.indexOf(step);
    for (let i = 0; i <= idx; i++) {
      const s = ORDER[i]!;
      if (this.done.has(s)) continue;
      this.finishRunning();
      this.done.add(s);
      this.stepAnims = [];
      this.run(s, i < idx);
    }
  }

  /** Fin normale de la séquence : nettoyage animé si la scène est encore là. */
  end(): void {
    if (this.root && !this.done.has('cleanup')) this.step('cleanup');
    this.script = null;
  }

  /** Arrêt immédiat (Passer, saut, nouvelle phase) : aucun clone ne subsiste. */
  stop(): void {
    window.clearTimeout(this.removeTimer);
    for (const a of this.anims) a.cancel();
    this.anims = [];
    this.root?.remove();
    this.root = null;
    this.parts = null;
    this.fx = null;
    this.script = null;
    this.done.clear();
  }

  // ---------------------------------------------------------------------------

  private finishRunning(): void {
    for (const a of this.anims) if (a.playState === 'running' || a.pending) a.finish();
  }

  /** Mouvement réduit : aucun déplacement (le gel, lui, pose la chorégraphie à sa fin). */
  private still(): boolean {
    return this.deps.reduced();
  }

  /** QA : place les animations de l’étape en cours à l’instant `ms` (pellicule déterministe). */
  seek(ms: number): void {
    for (const a of this.stepAnims) { a.pause(); a.currentTime = ms; }
  }

  private anim(el: Element, kf: Keyframe[], dur: number, o: { delay?: number; easing?: string; instant?: boolean } = {}): Animation {
    const f = this.deps.pace();
    const a = el.animate(kf, { duration: Math.max(1, dur * f), delay: (o.delay ?? 0) * f, easing: o.easing ?? 'cubic-bezier(.2,.7,.2,1)', fill: 'forwards' });
    this.anims.push(a);
    this.stepAnims.push(a);
    if (o.instant || this.deps.freeze()) a.finish();
    return a;
  }

  private run(s: Step, instant: boolean): void {
    if (s === 'present') this.present(instant);
    else if (!this.root) return;
    else if (s === 'impact') this.impact(instant);
    else if (s === 'damage') this.damage(instant);
    else this.cleanup(instant);
  }

  // --- Présentation : les deux Primaires viennent se faire face (VS, Rang, bandeaux) ---------------

  private build(sc: ClashScript): void {
    const mk = (side: Side): Parts => {
      const a = sc.actors[side];
      const hit = h('div', { class: 'cs-hit' });
      const wrap = h('div', { class: 'cs-cardwrap' }, cardEl(a.defId, { artSeed: this.deps.artSeed, tag: 'div', attrs: { 'aria-hidden': 'true', tabindex: '-1' } }), hit);
      const score = h('div', { class: cls('cs-score', a.signature && 'inf'), title: 'Rang (score public)' }, h('small', null, 'Rang'), h('b', null, a.score), h('span', { class: 'cs-check', 'aria-hidden': 'true' }, '✓'));
      const shield = a.stance === 'guard' ? h('div', { class: 'cs-shield', 'aria-hidden': 'true' },
        h('span', { class: 'cs-shield-shape', html: STANCE_ICON.guard }),
        h('span', { class: 'cs-crack', html: '<svg viewBox="0 0 24 24"><path d="M12 3 L10.5 8 L13 10.5 L10 14 L12.5 17 L11 21" fill="none" stroke="#fff" stroke-width="1.2"/><path d="M13 10.5 L17 9 M10 14 L6.5 13" fill="none" stroke="#fff" stroke-width=".9"/></svg>' }),
        h('span', { class: 'cs-absorb' }),
      ) : null;
      const body = h('div', { class: 'cs-body' },
        h('div', { class: cls('cs-owner', side) }, side === 'me' ? 'VOUS' : this.deps.rivalName.toUpperCase()),
        wrap, score, stanceBanner(a.stance), shield);
      const dmg = h('div', { class: 'cs-dmg', 'aria-hidden': 'true' }, a.damageTaken > 0 ? `−${a.damageTaken}` : '');
      const slot = h('div', { class: cls('cs-slot', side, a.stance) }, body, dmg);
      return { slot, body, wrap, hit, score, shield, dmg };
    };
    const opp = mk('opp');
    const me = mk('me');
    const backdrop = h('div', { class: 'cs-backdrop' });
    const vs = h('div', { class: 'cs-vs', 'aria-hidden': 'true' }, h('span', null, 'VS'));
    const flash = h('div', { class: 'cs-flash' });
    const ring = h('div', { class: 'cs-ring' });
    const ring2 = h('div', { class: 'cs-ring alt' });
    const verdict = h('div', { class: cls('cs-verdict', `tone-${sc.tone}`) }, h('b', null, sc.verdict),
      h('ul', { class: 'cs-bullets' }, sc.bullets.map((t) => h('li', null, t))));
    this.root = h('div', {
      class: cls('clash-stage', `cs-${sc.outcome}`, this.deps.reduced() && 'cs-still'),
      role: 'img',
      'aria-label': `Clash : ${sc.actors.opp.stance === 'assault' ? 'Assaut' : 'Garde'} du rival contre votre ${sc.actors.me.stance === 'assault' ? 'Assaut' : 'Garde'} — ${sc.verdict}. ${sc.bullets.join(' ')}`,
    }, backdrop, opp.slot, vs, me.slot, flash, ring, ring2, verdict);
    this.host.replaceChildren(this.root);
    this.parts = { opp, me };
    this.fx = { vs, flash, ring, ring2, verdict, backdrop };
  }

  private present(instant: boolean): void {
    const sc = this.script!;
    // Positions d’origine : les cartes posées sur leurs cases (lues AVANT qu’elles ne quittent la table).
    const src: Record<Side, DOMRect | null> = {
      me: document.querySelector('[data-key="prim-me"]')?.getBoundingClientRect() ?? null,
      opp: document.querySelector('[data-key="prim-opp"]')?.getBoundingClientRect() ?? null,
    };
    this.build(sc);
    const P = this.parts!;
    const F = this.fx!;
    const quick = instant || this.still() || this.deps.freeze();
    this.anim(F.backdrop, [{ opacity: 0 }, { opacity: 1 }], 320, { instant });
    for (const side of SIDES) {
      const p = P[side];
      const r = src[side];
      const rest = p.body.getBoundingClientRect();
      if (!quick && r && rest.width > 0) {
        const dx = r.left + r.width / 2 - (rest.left + rest.width / 2);
        const dy = r.top + r.height / 2 - (rest.top + rest.height / 2);
        const s0 = Math.max(0.2, r.width / rest.width);
        this.anim(p.body, [{ transform: `translate(${dx}px, ${dy}px) scale(${s0})`, opacity: 0.7 }, { transform: 'none', opacity: 1 }], 560, { delay: side === 'me' ? 70 : 0, instant });
      } else this.anim(p.body, [{ opacity: 0 }, { opacity: 1 }], 260, { instant });
      this.anim(p.score, [{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1.25)', opacity: 1, offset: 0.7 }, { transform: 'scale(1)', opacity: 1 }], 380, { delay: 420, instant });
    }
    this.anim(F.vs, quick ? [{ opacity: 0 }, { opacity: 1 }] : [{ transform: 'scale(0) rotate(-40deg)', opacity: 0 }, { transform: 'scale(1.15) rotate(6deg)', opacity: 1, offset: 0.7 }, { transform: 'scale(1) rotate(0)', opacity: 1 }], 420, { delay: 300, instant });
    for (const side of SIDES) {
      const sh = P[side].shield;
      if (sh) this.anim(sh, [{ opacity: 0 }, { opacity: 0 }], 1, { instant: true });
    }
    this.anim(F.verdict, [{ opacity: 0 }, { opacity: 0 }], 1, { instant: true });
  }

  // --- Impact : chorégraphie selon l’issue RÉSOLUE par le moteur -----------------------------------

  private impact(instant: boolean): void {
    const sc = this.script!;
    const P = this.parts!;
    const F = this.fx!;
    const dir = (s: Side) => (s === 'opp' ? 1 : -1); // vers le centre
    const ro = P.opp.body.getBoundingClientRect();
    const rm = P.me.body.getBoundingClientRect();
    const w = ro.width || 120;
    const gap = Math.max(20, rm.left - ro.right);
    const d = gap / 2 + w * 0.1; // jusqu’au point de choc central
    const D = gap - w * 0.18; // jusqu’au bouclier adverse
    const centerX = (ro.right + rm.left) / 2;
    const T = 1000;
    const still = this.still();
    const at = (x: number) => { // place les FX au point d’impact (repère de la scène)
      const host = this.root!.getBoundingClientRect();
      for (const el of [F.flash, F.ring, F.ring2]) el.style.left = `${x - host.left}px`;
    };
    const shieldOn = (s: Side, delay = 0) => {
      const sh = P[s].shield;
      if (sh) this.anim(sh, still ? [{ opacity: 0 }, { opacity: 0.95 }] : [{ opacity: 0, transform: 'scale(0.5)' }, { opacity: 0.95, transform: 'scale(1.08)', offset: 0.7 }, { opacity: 0.95, transform: 'scale(1)' }], 260, { delay, instant });
    };
    const burst = (delayMs: number, color: 'gold' | 'blue' | 'red' | 'white') => {
      F.flash.dataset.c = color;
      F.ring.dataset.c = color;
      this.anim(F.flash, [{ opacity: 0, transform: 'scale(0.3)' }, { opacity: 1, transform: 'scale(1)', offset: 0.25 }, { opacity: 0, transform: 'scale(1.5)' }], still ? 260 : 360, { delay: delayMs, instant });
      if (!still) this.anim(F.ring, [{ opacity: 0.95, transform: 'scale(0.2)' }, { opacity: 0, transform: 'scale(2.6)' }], 620, { delay: delayMs, easing: 'cubic-bezier(.1,.6,.3,1)', instant });
    };
    const verdict = (delayMs: number) => this.anim(F.verdict, [{ opacity: 0, transform: 'translateY(8px) scale(0.92)' }, { opacity: 1, transform: 'none' }], 320, { delay: delayMs, instant });
    const glow = (s: Side, delayMs: number) => this.anim(P[s].wrap, [{ filter: 'none' }, { filter: 'drop-shadow(0 0 14px rgba(255, 220, 140, 0.95)) brightness(1.12)' }], 380, { delay: delayMs, instant });
    const dim = (s: Side, delayMs: number) => this.anim(P[s].wrap, [{ filter: 'none' }, { filter: 'grayscale(0.75) brightness(0.62)' }], 420, { delay: delayMs, instant });
    // Victoire au Rang : coche dorée sur le score, au moment de l’impact (pas avant).
    const rankWin = (s: Side, delayMs: number) => {
      const chk = P[s].score.querySelector('.cs-check')!;
      this.anim(chk, [{ opacity: 0, transform: 'scale(0)' }, { opacity: 1, transform: 'scale(1.3)', offset: 0.6 }, { opacity: 1, transform: 'scale(1)' }], 300, { delay: delayMs, instant });
      this.anim(P[s].score, [{ boxShadow: '0 0 14px rgba(255, 200, 120, 0.45)' }, { boxShadow: '0 0 0 3px rgba(255, 226, 160, 0.55), 0 0 26px rgba(255, 220, 140, 0.9)' }], 300, { delay: delayMs, instant });
    };

    if (still) {
      // Mouvement réduit : mêmes informations, sans déplacement (poses statiques + fondus).
      const imp = sc.outcome === 'aa-win' || sc.outcome === 'aa-tie' ? centerX : centerX + (sc.attacker ? dir(sc.attacker) * gap * 0.32 : 0);
      at(imp);
      if (sc.outcome !== 'aa-win' && sc.outcome !== 'aa-tie') for (const s of SIDES) if (sc.actors[s].stance === 'guard') shieldOn(s);
      burst(0, sc.outcome === 'aa-tie' ? 'red' : sc.outcome.startsWith('guard') ? 'blue' : sc.outcome === 'gg-neutral' ? 'white' : 'gold');
      if (sc.winner && sc.outcome !== 'guard-absorbs') glow(sc.winner, 0);
      if (sc.outcome === 'aa-win' || sc.outcome === 'guard-holds' || sc.outcome === 'guard-breaks') {
        const loser: Side = sc.winner === 'me' ? 'opp' : 'me';
        dim(loser, 0);
        this.anim(P[loser].body, [{ opacity: 1 }, { opacity: 0.82 }], 300, { instant });
      }
      if (sc.outcome === 'guard-breaks') { const g: Side = sc.attacker === 'me' ? 'opp' : 'me'; if (P[g].shield) this.anim(P[g].shield!, [{ opacity: 0.95 }, { opacity: 0.25 }], 300, { instant }); this.root!.classList.add('cs-broken'); }
      if (sc.outcome === 'guard-absorbs') { this.root!.classList.add('cs-absorbed'); rankWin(sc.attacker!, 0); }
      if (sc.outcome === 'aa-win' || sc.outcome === 'guard-breaks') rankWin(sc.winner!, 0);
      verdict(0);
      return;
    }

    switch (sc.outcome) {
      case 'aa-win': {
        const W = sc.winner!;
        const L: Side = W === 'me' ? 'opp' : 'me';
        at(centerX);
        this.anim(P[W].body, [
          { transform: 'none' },
          { transform: `rotate(${6 * dir(W)}deg)`, offset: 0.18 },
          { transform: `translateX(${d * dir(W)}px) rotate(${6 * dir(W)}deg)`, offset: 0.44, easing: 'ease-in' },
          { transform: `translateX(${d * 0.82 * dir(W)}px) scale(1.04)`, offset: 0.52 },
          { transform: `translateX(${d * 0.42 * dir(W)}px) scale(1.1)` },
        ], T, { instant, easing: 'ease-out' });
        this.anim(P[L].body, [
          { transform: 'none', opacity: 1 },
          { transform: `rotate(${6 * dir(L)}deg)`, offset: 0.18 },
          { transform: `translateX(${d * dir(L)}px) rotate(${6 * dir(L)}deg)`, offset: 0.44, easing: 'ease-in' },
          { transform: `translateX(${d * 0.4 * dir(L)}px) rotate(${-5 * dir(L)}deg) scale(0.96)`, offset: 0.55, opacity: 1 },
          { transform: `translateX(${-d * 0.32 * dir(L)}px) rotate(${-11 * dir(L)}deg) scale(0.8)`, opacity: 0.78 },
        ], T, { instant, easing: 'ease-out' });
        burst(440, 'gold');
        glow(W, 520);
        dim(L, 520);
        rankWin(W, 460);
        verdict(560);
        break;
      }
      case 'aa-tie': {
        at(centerX);
        for (const s of SIDES) {
          this.anim(P[s].body, [
            { transform: 'none' },
            { transform: `rotate(${6 * dir(s)}deg)`, offset: 0.18 },
            { transform: `translateX(${d * dir(s)}px) rotate(${6 * dir(s)}deg)`, offset: 0.44, easing: 'ease-in' },
            { transform: `translateX(${d * 0.3 * dir(s)}px) rotate(${-6 * dir(s)}deg)`, offset: 0.6 },
            { transform: `translateX(${-d * 0.12 * dir(s)}px) rotate(${2 * dir(s)}deg)`, offset: 0.78 },
            { transform: `translateX(${-d * 0.06 * dir(s)}px)` },
          ], T, { instant, easing: 'ease-out' });
          this.anim(P[s].hit, [{ opacity: 0 }, { opacity: 0.65, offset: 0.3 }, { opacity: 0 }], 420, { delay: 440, instant });
        }
        burst(440, 'red');
        this.anim(F.ring2, [{ opacity: 0.9, transform: 'scale(0.2)' }, { opacity: 0, transform: 'scale(2.1)' }], 560, { delay: 500, instant });
        verdict(560);
        break;
      }
      case 'guard-holds':
      case 'guard-breaks':
      case 'guard-absorbs': {
        const A = sc.attacker!;
        const G: Side = A === 'me' ? 'opp' : 'me';
        const impactX = centerX + dir(A) * (gap / 2 - w * 0.18);
        at(impactX);
        shieldOn(G);
        const charge: Keyframe[] = [
          { transform: 'none', opacity: 1 },
          { transform: 'none', offset: 0.2 },
          { transform: `rotate(${5 * dir(A)}deg)`, offset: 0.32 },
          { transform: `translateX(${D * dir(A)}px) rotate(${5 * dir(A)}deg)`, offset: 0.6, easing: 'ease-in' },
        ];
        if (sc.outcome === 'guard-holds') {
          // La Garde gagne au Rang : elle s’agrandit, son onde repousse l’Assaut (0 dégât).
          this.anim(P[A].body, [...charge,
            { transform: `translateX(${D * 0.8 * dir(A)}px) rotate(${-4 * dir(A)}deg)`, offset: 0.66, opacity: 1 },
            { transform: `translateX(${-D * 0.3 * dir(A)}px) rotate(${-12 * dir(A)}deg) scale(0.84)`, opacity: 0.8 }], T, { instant, easing: 'ease-out' });
          this.anim(P[G].body, [{ transform: 'none' }, { transform: 'translateY(3px) scale(1.02)', offset: 0.2 }, { transform: 'scale(1.02)', offset: 0.6 }, { transform: 'scale(1.15)', offset: 0.72 }, { transform: 'scale(1.1)' }], T, { instant });
          burst(600, 'blue');
          this.anim(F.ring2, [{ opacity: 0.9, transform: 'scale(0.4)' }, { opacity: 0, transform: 'scale(3)' }], 700, { delay: 640, instant });
          glow(G, 640);
          dim(A, 700);
          verdict(660);
        } else if (sc.outcome === 'guard-breaks') {
          // L’Assaut gagne ET blesse : le bouclier se fissure puis cède ; la Garde faiblit.
          this.anim(P[A].body, [...charge,
            { transform: `translateX(${D * 1.08 * dir(A)}px) rotate(${2 * dir(A)}deg) scale(1.04)`, offset: 0.74 },
            { transform: `translateX(${D * 0.62 * dir(A)}px) scale(1.08)` }], T, { instant, easing: 'ease-out' });
          // La Garde est repoussée vers l’extérieur (sens de la charge adverse), affaiblie.
          this.anim(P[G].body, [{ transform: 'none', opacity: 1 }, { transform: 'translateY(3px) scale(1.02)', offset: 0.2 }, { transform: 'scale(1.02)', offset: 0.6 }, { transform: `translateX(${w * 0.18 * dir(A)}px) rotate(${8 * dir(A)}deg) scale(0.9)`, offset: 0.74, opacity: 0.85 }, { transform: `translateX(${w * 0.12 * dir(A)}px) rotate(${6 * dir(A)}deg) scale(0.88)`, opacity: 0.72 }], T, { instant, easing: 'ease-out' });
          const sh = P[G].shield!;
          const crack = sh.querySelector('.cs-crack')!;
          this.anim(crack, [{ opacity: 0 }, { opacity: 1 }], 120, { delay: 600, instant });
          this.anim(sh, [{ opacity: 0.95, transform: 'scale(1)' }, { opacity: 0.95, transform: 'scale(1.06)', offset: 0.3 }, { opacity: 0, transform: `scale(1.35) rotate(${10 * dir(A)}deg)` }], 420, { delay: 680, instant });
          burst(600, 'red');
          glow(A, 720);
          dim(G, 720);
          rankWin(A, 620);
          verdict(700);
        } else {
          // Victoire au Rang SANS blessure : l’Assaut bute sur le bouclier qui absorbe tout ;
          // la Garde tremble mais ne grandit pas et ne repousse rien (ce n’est PAS une victoire défensive).
          this.anim(P[A].body, [...charge,
            { transform: `translateX(${D * 0.9 * dir(A)}px) rotate(${2 * dir(A)}deg)`, offset: 0.68 },
            { transform: `translateX(${D * 0.86 * dir(A)}px)` }], T, { instant, easing: 'ease-out' });
          this.anim(P[G].body, [{ transform: 'none' }, { transform: 'none', offset: 0.6 }, { transform: 'translateX(3px)', offset: 0.65 }, { transform: 'translateX(-3px)', offset: 0.7 }, { transform: 'translateX(2px)', offset: 0.76 }, { transform: 'translateX(-1px)', offset: 0.82 }, { transform: 'none' }], T, { instant });
          const sh = P[G].shield!;
          this.anim(sh, [{ filter: 'none', transform: 'scale(1)' }, { filter: 'brightness(1.8)', transform: 'scale(1.12)', offset: 0.25 }, { filter: 'brightness(1)', transform: 'scale(1)', offset: 0.5 }, { filter: 'brightness(1.5)', transform: 'scale(1.07)', offset: 0.72 }, { filter: 'none', transform: 'scale(1)' }], 700, { delay: 600, instant });
          const absorb = sh.querySelector<HTMLElement>('.cs-absorb')!;
          absorb.textContent = sc.absorption ? `ABSORBE ${sc.absorption.absorbed}` : 'ABSORBE';
          this.anim(absorb, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], 320, { delay: 700, instant });
          burst(600, 'blue');
          rankWin(A, 620);
          verdict(720);
        }
        break;
      }
      default: {
        // Garde contre Garde : tension contenue, deux halos, retrait neutre.
        at(centerX);
        for (const s of SIDES) {
          shieldOn(s);
          this.anim(P[s].body, [
            { transform: 'none' },
            { transform: 'none', offset: 0.25 },
            { transform: `translateX(${d * 0.22 * dir(s)}px)`, offset: 0.5, easing: 'ease-in-out' },
            { transform: `translateX(${d * 0.22 * dir(s)}px) scale(1.02)`, offset: 0.72 },
            { transform: 'none' },
          ], T, { instant, easing: 'ease-in-out' });
        }
        burst(500, 'white');
        verdict(620);
      }
    }
  }

  // --- Blessures : chiffres sur la carte touchée (simultanés en égalité) -----------------------------

  private damage(instant: boolean): void {
    const sc = this.script!;
    const P = this.parts!;
    for (const s of SIDES) {
      if (sc.actors[s].damageTaken <= 0) continue;
      const p = P[s];
      this.anim(p.dmg, this.still() ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'translateY(14px) scale(0.6)' }, { opacity: 1, transform: 'translateY(-6px) scale(1.2)', offset: 0.45 }, { opacity: 1, transform: 'translateY(-10px) scale(1)' }], 620, { instant });
      this.anim(p.hit, [{ opacity: 0 }, { opacity: 0.7, offset: 0.3 }, { opacity: 0.15 }], 420, { instant });
      if (!this.still()) this.anim(p.wrap, [{ transform: 'none' }, { transform: 'translateX(-6px)', offset: 0.2 }, { transform: 'translateX(5px)', offset: 0.45 }, { transform: 'translateX(-3px)', offset: 0.7 }, { transform: 'none' }], 380, { instant });
    }
  }

  // --- Nettoyage : les DEUX Primaires rejoignent la défausse (même la gagnante) ----------------------

  private cleanup(instant: boolean): void {
    const P = this.parts!;
    const F = this.fx!;
    const quick = instant || this.still();
    for (const s of SIDES) {
      const p = P[s];
      const target = document.querySelector(`[data-discard="${s}"]`)?.getBoundingClientRect();
      const rest = p.slot.getBoundingClientRect();
      if (!quick && target && rest.width > 0) {
        const dx = target.left + target.width / 2 - (rest.left + rest.width / 2);
        const dy = target.top + target.height / 2 - (rest.top + rest.height * 0.4);
        this.anim(p.body, [{ transform: `translate(${dx}px, ${dy}px) scale(0.12)`, opacity: 0 }], 620, { easing: 'cubic-bezier(.5,0,.8,.4)', delay: s === 'me' ? 60 : 0 });
      } else this.anim(p.body, [{ opacity: 0 }], 260, { instant });
      // Les DEUX Primaires partent en défausse, gagnante comprise : dit sur la carte elle-même.
      const tag = h('div', { class: 'cs-discard-tag', 'aria-hidden': 'true' }, '→ DÉFAUSSE');
      p.body.append(tag);
      this.anim(tag, [{ opacity: 0, transform: 'translate(-50%, 6px)' }, { opacity: 1, transform: 'translate(-50%, 0)', offset: 0.25 }, { opacity: 1, transform: 'translate(-50%, 0)' }], 420, { instant });
      this.anim(p.dmg, [{ opacity: 0 }], 260, { instant });
      if (p.shield) this.anim(p.shield, [{ opacity: 0 }], 200, { instant });
    }
    for (const el of [F.vs, F.verdict, F.backdrop]) this.anim(el, [{ opacity: 0 }], 360, { instant });
    const ms = quick ? 300 : 760 * this.deps.pace();
    window.clearTimeout(this.removeTimer);
    const root = this.root;
    if (instant || this.deps.freeze()) { this.removeNow(root); return; }
    this.removeTimer = window.setTimeout(() => this.removeNow(root), ms);
  }

  private removeNow(root: HTMLElement | null): void {
    if (!root || root !== this.root) return;
    for (const a of this.anims) a.cancel();
    this.anims = [];
    root.remove();
    this.root = null;
    this.parts = null;
    this.fx = null;
  }
}
