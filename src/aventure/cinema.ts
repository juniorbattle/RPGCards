/**
 * M11 — déroulé d'une cinématique runtime (`docs/m11/07_CINEMATIQUES.md`, PROPOSÉ ; ADR 043) : les plans choisis par
 * `cinematiques.ts` joués sur la caméra de la ville (`Town.cadrer`), les actions de l'application (marche d'un
 * personnage) en même temps ; bandes et carton de lieu, bouton « Passer » (et Échap, Espace, Entrée).
 *
 * Temps figé (captures) : tout se résout tout de suite et la caméra revient au joueur (ou garde le dernier cadre) ;
 * mouvement réduit : coupes franches au lieu des mouvements, tenues gardées (le temps de lire). Une cinématique ne
 * touche jamais l'état de l'aventure : elle ne fait que montrer.
 */
import { h } from '../shell/ui';
import type { Cadrage, Town } from '../ville/ville';
import { entre, type Plan } from './cinematiques';

/** Un plan joué : `action` démarre avec lui ; `finir` met tout de suite son état final (cinématique passée). */
export interface PlanJoue extends Plan { action?: () => Promise<void>; finir?: () => void }

export interface OptionsCinema {
  /** Temps figé (captures) : aucun délai, aucun mouvement. */
  fige: boolean;
  /** Mouvement réduit : des coupes au lieu des mouvements de caméra. */
  reduit: boolean;
  /** Bandes du haut et du bas, partagées avec les dialogues cadrés (et bouton « Passer ») ; `null` : un plan court, sans bandes, qu'on ne passe pas. */
  bandes: Bandes | null;
  carton?: { lieu: string; ligne: string };
  /** Garder le dernier cadre à la fin (un dialogue s'ouvre dessus) ; sinon la caméra revient au joueur. */
  garder?: boolean;
  /** QA (`?cineLent=<facteur>`) : durées multipliées, pour capturer un travelling en rendu logiciel. */
  lent?: number;
}

const cadre = (p: { at: Plan['at']; zoom?: number; hauteur?: number; tau?: number; sujets?: Plan['sujets']; serre?: number }): Cadrage => ({
  at: { ...p.at }, ...(p.zoom !== undefined ? { zoom: p.zoom } : {}), ...(p.hauteur !== undefined ? { hauteur: p.hauteur } : {}), ...(p.tau !== undefined ? { tau: p.tau } : {}),
  ...(p.sujets ? { sujets: p.sujets.map((s) => ({ ...s })) } : {}), ...(p.serre !== undefined ? { serre: p.serre } : {}),
});

export class Cinema {
  private passee = false;
  private reveils: (() => void)[] = [];
  private el: HTMLElement | null = null;
  private dernier: Plan | null = null;
  private n = -1;
  private readonly onKey = (e: KeyboardEvent) => {
    if (e.code === 'Escape' || e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); this.passer(); }
  };

  constructor(private readonly town: Town, private readonly o: OptionsCinema) {}

  get passe(): boolean { return this.passee; }
  /** Plan en cours (indice, -1 avant le premier) : crochet de QA. */
  get etape(): number { return this.n; }

  /** Passe la cinématique : les attentes se résolvent, chaque plan met son état final. */
  passer(): void {
    if (this.passee) return;
    this.passee = true;
    for (const r of this.reveils.splice(0)) r();
  }

  /** Joue les plans dans l'ordre ; résolu à la fin (vrai si la cinématique a été passée). */
  async jouer(plans: readonly PlanJoue[]): Promise<boolean> {
    const t = this.town;
    if (this.o.fige) {
      for (const p of plans) { void p.action?.(); p.finir?.(); }
      this.dernier = plans.at(-1) ?? null;
      this.fin();
      return false;
    }
    this.monter();
    let prev: Plan | null = null;
    for (const [i, p] of plans.entries()) {
      this.n = i;
      if (this.passee) { p.finir?.(); this.dernier = p; continue; }
      const act = p.action?.() ?? Promise.resolve();
      if (p.mouvement === 'travelling' && prev && !this.o.reduit) await this.travelling(prev, p);
      else {
        t.cadrer(cadre(p), p.mouvement === 'coupe' || this.o.reduit);
        await this.attendre(p.ms * (this.o.lent ?? 1));
      }
      await Promise.race([act, this.attendrePasse()]);
      if (this.passee) p.finir?.();
      prev = p;
      this.dernier = p;
    }
    const passee = this.passee;
    this.fin();
    return passee;
  }

  /**
   * Fin : carton et bouton retirés, bandes rendues (elles restent si un dialogue cadré les reprend aussitôt) ; la caméra
   * revient au joueur (coupe si la cinématique a été passée), ou garde le dernier cadre.
   */
  private fin(): void {
    const coupe = this.o.fige || this.o.reduit || this.passee;
    if (this.o.garder && this.dernier) this.town.cadrer(cadre(this.dernier), coupe);
    else this.town.cadrer(null, coupe);
    const el = this.el;
    this.el = null;
    if (!el) return;
    window.removeEventListener('keydown', this.onKey, true);
    this.o.bandes?.rendre();
    el.classList.remove('on');
    if (coupe) el.remove(); else setTimeout(() => el.remove(), 450);
  }

  /** Rend la caméra au joueur (après le dialogue ouvert sur le dernier cadre). */
  static rendre(town: Town | null, reduit: boolean): void { town?.cadrer(null, reduit); }

  private monter(): void {
    if (!this.o.bandes) return;
    window.addEventListener('keydown', this.onKey, true);
    this.o.bandes.prendre();
    const c = this.o.carton;
    const el = h('div', { class: 'av-cine', 'data-key': 'av-cine' },
      c ? h('div', { class: 'av-cine-carton', 'data-key': 'av-cine-carton' }, h('div', null, h('b', null, c.lieu), h('span', null, c.ligne))) : null,
      h('button', { class: 'av-cine-passer', type: 'button', 'data-key': 'av-cine-passer', onclick: () => this.passer() }, 'Passer ▸'));
    document.body.append(el);
    this.el = el;
    if (this.o.reduit) el.classList.add('on', 'reduit');
    else requestAnimationFrame(() => el.classList.add('on'));
  }

  private attendre(ms: number): Promise<void> {
    if (ms <= 0 || this.passee) return Promise.resolve();
    return new Promise((res) => {
      const id = setTimeout(() => { this.reveils = this.reveils.filter((r) => r !== fin); res(); }, ms);
      const fin = () => { clearTimeout(id); res(); };
      this.reveils.push(fin);
    });
  }

  private attendrePasse(): Promise<void> {
    return this.passee ? Promise.resolve() : new Promise((res) => this.reveils.push(res));
  }

  /** Travelling minuté de `a` à `b` : la caméra suit le point interpolé, sans amorti (une coupe à chaque image). */
  private travelling(a: Plan, b: Plan): Promise<void> {
    return new Promise((res) => {
      const t0 = performance.now();
      let fini = false;
      const stop = () => { if (fini) return; fini = true; res(); };
      this.reveils.push(stop);
      const pas = (now: number) => {
        if (fini) return;
        const t = Math.min(1, (now - t0) / Math.max(1, b.ms * (this.o.lent ?? 1)));
        this.town.cadrer(cadre(entre(a, b, t)), true);
        if (t >= 1) { this.reveils = this.reveils.filter((r) => r !== stop); stop(); return; }
        requestAnimationFrame(pas);
      };
      requestAnimationFrame(pas);
    });
  }
}

/**
 * Bandes du haut et du bas, partagées par les cinématiques et les dialogues cadrés d'une même scène : chacun les prend et
 * les rend ; elles se replient quand plus personne ne les tient, une tâche plus tard (une scène qui enchaîne une
 * cinématique et son dialogue, ou deux répliques, les garde sans les replier entre les deux). L'interface de la ville
 * s'efface tant qu'elles sont là.
 */
export class Bandes {
  private el: HTMLElement | null = null;
  private n = 0;
  private retrait: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly reduit: boolean) {}

  get tenues(): boolean { return this.n > 0; }

  prendre(): void {
    this.n++;
    if (this.retrait) { clearTimeout(this.retrait); this.retrait = null; }
    document.body.classList.add('av-cine-actif');
    if (this.el) { this.el.classList.add('on'); return; }
    const el = h('div', { class: 'av-cine-bandes', 'data-key': 'av-cine-bandes', 'aria-hidden': 'true' }, h('div', { class: 'av-cine-bande haut' }), h('div', { class: 'av-cine-bande bas' }));
    document.body.append(el);
    this.el = el;
    if (this.reduit) el.classList.add('on', 'reduit');
    else requestAnimationFrame(() => { if (this.el === el && this.n > 0) el.classList.add('on'); });
  }

  rendre(): void {
    setTimeout(() => { this.n = Math.max(0, this.n - 1); if (!this.n) this.replier(); }, 0);
  }

  /** Repli (tout de suite avec `immediat` : un autre écran s'ouvre). */
  replier(immediat = false): void {
    this.n = 0;
    document.body.classList.remove('av-cine-actif');
    const el = this.el;
    if (!el) return;
    el.classList.remove('on');
    if (immediat || this.reduit) { el.remove(); this.el = null; return; }
    if (this.retrait) clearTimeout(this.retrait);
    this.retrait = setTimeout(() => { el.remove(); if (this.el === el) this.el = null; this.retrait = null; }, 450);
  }
}

/** Styles des bandes, du carton et du bouton (installés avec ceux de l'aventure). */
export const STYLES_CINEMA = `
.av-cine-bandes { position: fixed; inset: 0; z-index: 2610; pointer-events: none; }
.av-cine { position: fixed; inset: 0; z-index: 2620; pointer-events: none; }
.av-cine-bande { position: absolute; left: 0; right: 0; height: 0; background: #020307; transition: height 0.42s ease; }
.av-cine-bande.haut { top: 0; }
.av-cine-bande.bas { bottom: 0; }
.av-cine-bandes.on .av-cine-bande { height: 11.5vh; }
.av-cine-bandes.reduit .av-cine-bande { transition: none; }
.av-cine-carton { position: absolute; left: 0; right: 0; bottom: 0; height: 11.5vh; display: grid; place-items: center; color: #ffe7b0; opacity: 0; transform: translateY(6px); transition: opacity 0.8s ease 0.5s, transform 0.8s ease 0.5s; }
.av-cine-carton > div { display: flex; align-items: baseline; gap: 16px; }
.av-cine.on .av-cine-carton { opacity: 1; transform: none; }
.av-cine.reduit .av-cine-carton { transition: none; }
.av-cine-carton b { font: 700 clamp(24px, 3.2vw, 40px)/1 Georgia, serif; letter-spacing: 0.04em; text-shadow: 0 0 18px rgba(255, 190, 110, 0.3); }
.av-cine-carton span { font: italic clamp(13px, 1.3vw, 17px)/1.2 Georgia, serif; color: #d8ccb4; letter-spacing: 0.14em; text-transform: uppercase; }
.av-cine-passer { position: absolute; right: 18px; bottom: calc(11.5vh + 12px); pointer-events: auto; padding: 6px 12px; border-radius: 8px; border: 1px solid rgba(226, 196, 138, 0.55); background: rgba(10, 10, 18, 0.7); color: #f6eedc; font: 600 13px/1.2 system-ui, sans-serif; cursor: pointer; opacity: 0; transition: opacity 0.4s ease 0.6s; }
.av-cine.on .av-cine-passer { opacity: 1; }
.av-cine.reduit .av-cine-passer { transition: none; }
body.av-cine-actif .ville-hud, body.av-cine-actif .ville-bubble { visibility: hidden; }
`;
