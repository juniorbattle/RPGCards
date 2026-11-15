/**
 * Passe 240 — le repère d'objectif à l'écran (Promenade libre ; la logique, pure, est dans `aventure/repereObjectif.ts`).
 * Un losange d'or, dessiné par code (CSS), posé au-dessus de la cible quand elle est dans le cadre ; hors du cadre, il se
 * range au bord de l'écran, une flèche tournée vers la cible, avec le nom du lieu. Le losange répond à celui de la ligne
 * « Objectif » du cartouche. Jamais cliquable ni focalisable (la souris, le clavier et la manette passent au travers).
 *
 * Mouvement : il apparaît et s'efface en fondu et flotte doucement, sous `.lqv-fondus` (le réglage « Mouvement réduit » du
 * jeu, §6 bis) ; sans mouvement, il paraît et disparaît d'un coup, immobile.
 */
import type { Vec2 } from './monde';
import type { Town } from './ville';

/** Le côté où se range un repère : dans le cadre (au-dessus de sa cible) ou contre un bord de l'écran. */
export type CoteRepere = 'dessus' | 'haut' | 'bas' | 'gauche' | 'droite';

export interface PlaceRepere { x: number; y: number; dedans: boolean; cote: CoteRepere; /** direction de la cible (radians, y vers le bas) */ angle: number }

/**
 * Où dessiner un repère : au point projeté s'il tombe dans le cadre utile (l'écran moins ses marges : le cartouche en
 * haut, un bord ailleurs), sinon à l'intersection du bord de ce cadre et de la droite qui va du centre du cadre vers la
 * cible. `devant` faux : la cible est derrière la caméra (direction inversée). Pur.
 */
export function placerRepere(p: { x: number; y: number; devant: boolean }, vue: { w: number; h: number }, m: { haut: number; bas: number; gauche: number; droite: number }): PlaceRepere {
  const x0 = m.gauche, x1 = Math.max(x0 + 1, vue.w - m.droite), y0 = m.haut, y1 = Math.max(y0 + 1, vue.h - m.bas);
  if (p.devant && p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1) return { x: p.x, y: p.y, dedans: true, cote: 'dessus', angle: Math.PI / 2 };
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  let dx = p.x - cx, dy = p.y - cy;
  if (!p.devant) { dx = -dx; dy = -dy; }
  if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) dy = 1;
  const tx = dx > 0 ? (x1 - cx) / dx : dx < 0 ? (x0 - cx) / dx : Infinity;
  const ty = dy > 0 ? (y1 - cy) / dy : dy < 0 ? (y0 - cy) / dy : Infinity;
  const t = Math.min(tx, ty);
  const cote: CoteRepere = tx < ty ? (dx > 0 ? 'droite' : 'gauche') : (dy > 0 ? 'bas' : 'haut');
  return { x: cx + dx * t, y: cy + dy * t, dedans: false, cote, angle: Math.atan2(dy, dx) };
}

/** Un repère à dessiner : sa position au sol, sa hauteur (m), ce qu'il nomme ; `apparence` : un personnage suivi. */
export interface RepereAffiche { id: string; at: Vec2; hauteur: 'tete' | 'porte' | 'passage'; nom: string; detail: string | null; apparence?: string }

/** Distance (m) sous laquelle un repère s'efface : la bulle « E — … » prend le relais. */
export const PRES_CIBLE = 2.2;

let styled = false;
function installer(): void {
  if (styled) return;
  styled = true;
  const s = document.createElement('style');
  s.textContent = `
.lqv-reperes { position: fixed; inset: 0; z-index: 2590; pointer-events: none; overflow: hidden; }
.lqv-repere { position: absolute; left: 0; top: 0; width: 0; height: 0; opacity: 1; --t: clamp(18px, 1.3vw, 26px); }
.lqv-repere.cache { opacity: 0; }
.lqv-repere[hidden] { display: none; }
.lqv-fondus .lqv-repere { transition: opacity 0.35s ease; }
.lqv-repere-pin { position: absolute; left: 0; top: 0; }
.lqv-fondus .lqv-repere.dedans .lqv-repere-pin { animation: lqv-repere-flotte 2.6s ease-in-out infinite; }
@keyframes lqv-repere-flotte { 0%, 100% { translate: 0 0; } 50% { translate: 0 -4px; } }
.lqv-repere-losange { position: absolute; left: calc(var(--t) * -0.5); top: calc(var(--t) * -0.5); width: var(--t); height: var(--t); box-sizing: border-box; transform: rotate(45deg); background: linear-gradient(135deg, #fff2cf 0%, #f2dcab 30%, #d6b26e 70%, #a77e3c 100%); border: 1px solid rgba(40, 28, 8, 0.85); box-shadow: 0 0 0 1px rgba(255, 231, 176, 0.35), 0 0 14px rgba(255, 196, 110, 0.6), 0 2px 6px rgba(0, 0, 0, 0.6); }
.lqv-repere-losange::after { content: ""; position: absolute; inset: 28%; background: rgba(26, 20, 8, 0.78); box-shadow: inset 0 0 0 1px rgba(255, 231, 176, 0.25); }
.lqv-repere-tige { position: absolute; left: -1px; top: calc(var(--t) * 0.62); width: 2px; height: calc(var(--t) * 0.9); background: linear-gradient(180deg, rgba(242, 220, 171, 0.9), rgba(242, 220, 171, 0)); }
.lqv-repere:not(.dedans) .lqv-repere-tige { display: none; }
.lqv-repere-fleche { position: absolute; left: 0; top: 0; width: 0; height: 0; transform: rotate(var(--angle, 0rad)); }
.lqv-repere-fleche::before { content: ""; position: absolute; left: calc(var(--t) * 0.78); top: calc(var(--t) * -0.42); border-style: solid; border-width: calc(var(--t) * 0.42) 0 calc(var(--t) * 0.42) calc(var(--t) * 0.62); border-color: transparent transparent transparent #f2dcab; filter: drop-shadow(0 0 5px rgba(255, 196, 110, 0.65)) drop-shadow(0 1px 2px rgba(0, 0, 0, 0.8)); }
.lqv-repere.dedans .lqv-repere-fleche { display: none; }
.lqv-repere-texte { position: absolute; display: flex; flex-direction: column; align-items: center; gap: 1px; padding: 3px 11px 4px; white-space: nowrap; background: rgba(8, 9, 16, 0.76); border: 1px solid rgba(226, 196, 138, 0.42); box-shadow: 0 3px 12px rgba(0, 0, 0, 0.5); color: var(--lqv-ivoire, #f3ead8); text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9); }
.lqv-repere-texte b { font: 600 calc(var(--t) * 0.86)/1.2 Georgia, serif; color: #ffe7b0; letter-spacing: 0.01em; }
.lqv-repere-texte small { font: italic calc(var(--t) * 0.7)/1.2 Georgia, serif; color: #d8ccb4; }
.lqv-repere-texte small:empty { display: none; }
.lqv-repere[data-cote="dessus"] .lqv-repere-texte { left: 0; bottom: calc(var(--t) * 0.95); transform: translateX(-50%); }
.lqv-repere[data-cote="haut"] .lqv-repere-texte { left: 0; top: calc(var(--t) * 0.95); transform: translateX(-50%); }
.lqv-repere[data-cote="bas"] .lqv-repere-texte { left: 0; bottom: calc(var(--t) * 0.95); transform: translateX(-50%); }
.lqv-repere[data-cote="droite"] .lqv-repere-texte { right: calc(var(--t) * 0.95); top: 0; transform: translateY(-50%); align-items: flex-end; }
.lqv-repere[data-cote="gauche"] .lqv-repere-texte { left: calc(var(--t) * 0.95); top: 0; transform: translateY(-50%); align-items: flex-start; }
.lqv-repere[data-cote="droite"] .lqv-repere-fleche, .lqv-repere[data-cote="gauche"] .lqv-repere-fleche, .lqv-repere[data-cote="haut"] .lqv-repere-fleche, .lqv-repere[data-cote="bas"] .lqv-repere-fleche { z-index: 1; }
`;
  document.head.append(s);
}

/** Hauteur du losange au-dessus du sol (m) : au-dessus du repère « ! » d'une tête, d'un linteau, d'un passage. */
function hauteurDe(r: RepereAffiche, walkerH: number): number {
  if (r.hauteur === 'tete') return walkerH + 1.05;
  if (r.hauteur === 'porte') return Math.max(3.0, walkerH + 0.9);
  return walkerH + 0.7;
}

export interface RepereEcran {
  /** Les repères à montrer (null ou vide : tout s'efface). */
  montrer(reperes: readonly RepereAffiche[] | null): void;
  /** Replace les repères (à chaque image de la ville). */
  maj(): void;
  /** État de QA : chaque repère, sa place à l'écran, s'il est dans le cadre. */
  etat(): Array<{ id: string; nom: string; detail: string | null; x: number; y: number; dedans: boolean; cote: CoteRepere; visible: boolean }>;
  detruire(): void;
}

/**
 * Le calque des repères, au-dessus de la ville et sous le HUD (le cartouche reste lisible) ; `marges` : le cadre utile,
 * relu à chaque image (le bas du cartouche, qui varie avec l'objectif).
 */
export function repereEcran(town: Town, marges: () => { haut: number; bas: number; gauche: number; droite: number }): RepereEcran {
  installer();
  const hote = document.createElement('div');
  hote.className = 'lqv-reperes';
  hote.setAttribute('aria-hidden', 'true');
  hote.dataset.key = 'av-reperes';
  document.body.append(hote);
  // `age` : images depuis l'apparition (le fondu d'entrée part de l'opacité nulle, déjà rendue)
  const els = new Map<string, { el: HTMLElement; r: RepereAffiche; place: PlaceRepere | null; visible: boolean; age: number }>();
  let voulus: readonly RepereAffiche[] = [];

  const creer = (r: RepereAffiche): HTMLElement => {
    const el = document.createElement('div');
    el.className = 'lqv-repere cache';
    el.dataset.key = 'av-repere';
    el.dataset.repere = r.id;
    const pin = document.createElement('div');
    pin.className = 'lqv-repere-pin';
    const fleche = document.createElement('span');
    fleche.className = 'lqv-repere-fleche';
    const losange = document.createElement('span');
    losange.className = 'lqv-repere-losange';
    const tige = document.createElement('span');
    tige.className = 'lqv-repere-tige';
    const texte = document.createElement('span');
    texte.className = 'lqv-repere-texte';
    texte.append(document.createElement('b'), document.createElement('small'));
    pin.append(tige, fleche, losange, texte);
    el.append(pin);
    hote.append(el);
    return el;
  };
  const ecrire = (el: HTMLElement, r: RepereAffiche) => {
    const b = el.querySelector('b')!;
    const sm = el.querySelector('small')!;
    if (b.textContent !== r.nom) b.textContent = r.nom;
    const d = r.detail ?? '';
    if (sm.textContent !== d) sm.textContent = d;
  };
  // un repère qui s'en va s'efface en fondu, puis quitte le calque (sans mouvement, tout de suite)
  const retirer = (id: string) => {
    const e = els.get(id);
    if (!e) return;
    els.delete(id);
    e.el.classList.add('cache');
    const fondu = document.documentElement.classList.contains('lqv-fondus');
    if (fondu) setTimeout(() => e.el.remove(), 400); else e.el.remove();
  };

  return {
    montrer(reperes) {
      voulus = reperes ?? [];
      const ids = new Set(voulus.map((r) => r.id));
      for (const id of [...els.keys()]) if (!ids.has(id)) retirer(id);
      for (const r of voulus) {
        const e = els.get(r.id);
        if (e) { e.r = r; ecrire(e.el, r); continue; }
        const el = creer(r);
        ecrire(el, r);
        els.set(r.id, { el, r, place: null, visible: false, age: 0 });
      }
    },
    maj() {
      if (!els.size) return;
      const vue = { w: window.innerWidth, h: window.innerHeight };
      const m = marges();
      const joueur = town.walker().pos;
      const wh = town.walkerH();
      for (const e of els.values()) {
        const r = e.r;
        const at = (r.apparence ? town.npcAt(r.apparence) : null) ?? r.at;
        const p = town.project({ x: at.x, y: hauteurDe(r, wh), z: at.z });
        const place = placerRepere({ x: p.x, y: p.y, devant: p.devant ?? true }, vue, m);
        // tout près de la cible, la bulle d'action (« E — Parler à… », « E — Monter vers… ») prend le relais
        const pres = Math.hypot(at.x - joueur.x, at.z - joueur.z) < PRES_CIBLE;
        e.place = place;
        e.visible = !pres;
        const el = e.el;
        el.style.transform = `translate(${Math.round(place.x)}px, ${Math.round(place.y)}px)`;
        if (el.dataset.cote !== place.cote) el.dataset.cote = place.cote;
        el.classList.toggle('dedans', place.dedans);
        el.style.setProperty('--angle', `${place.angle.toFixed(3)}rad`);
        el.classList.toggle('cache', pres || e.age < 1);
        e.age++;
      }
    },
    etat() {
      return [...els.values()].map((e) => ({ id: e.r.id, nom: e.r.nom, detail: e.r.detail, x: Math.round(e.place?.x ?? 0), y: Math.round(e.place?.y ?? 0), dedans: !!e.place?.dedans, cote: e.place?.cote ?? 'dessus', visible: e.visible && !!e.place }));
    },
    detruire() {
      hote.remove();
      els.clear();
    },
  };
}
