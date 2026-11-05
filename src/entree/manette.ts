/**
 * Manette de console (Xbox, PlayStation, et toute manette que le navigateur lit en « standard »).
 *
 * Rien ne change tant qu'aucune manette ne sert : le module n'écoute que `gamepadconnected`, et la classe
 * `lqv-manette` (anneau de focus visible partout) ne se pose qu'au premier appui. Le jeu ne connaît pas la manette :
 * elle se traduit en ce que le clavier fait déjà.
 * - Dans la ville, quand on marche : le stick gauche (analogique) ou la croix fait marcher, A parle ou entre.
 * - Partout ailleurs : stick ou croix déplacent le focus vers l'élément voisin à l'écran (navigation spatiale,
 *   restreinte à la fenêtre ouverte, jamais vers un élément caché sous une autre couche) ; A valide (Entrée, puis
 *   clic sur un bouton) ; B et Start font Échap (retour, menu) ; au duel, Y l'action principale (N) et X la vue (V).
 * - Stick droit : défile la liste ou le panneau sous le focus.
 * Les touches de déplacement ne sont jamais simulées (une touche restée enfoncée ferait marcher sans fin).
 */

export type Dir = 'haut' | 'bas' | 'gauche' | 'droite';
export interface Boite { x: number; y: number; w: number; h: number }

/** Disposition « standard » de l'API Gamepad (A = Croix, B = Rond, X = Carré, Y = Triangle). */
export const BOUTON = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, SELECT: 8, START: 9, HAUT: 12, BAS: 13, GAUCHE: 14, DROITE: 15 } as const;

/** Zone morte radiale, puis remise à l'échelle (une poussée légère marche lentement, à fond on court). */
export function zoneMorte(x: number, y: number, seuil = 0.22): { x: number; y: number } {
  const n = Math.hypot(x, y);
  if (n <= seuil) return { x: 0, y: 0 };
  const k = Math.min(1, (n - seuil) / (1 - seuil)) / n;
  return { x: x * k, y: y * k };
}

/** Direction franche d'un stick (pour la navigation), ou null sous le seuil. */
export function directionDe(x: number, y: number, seuil = 0.5): Dir | null {
  if (Math.hypot(x, y) < seuil) return null;
  if (Math.abs(x) > Math.abs(y)) return x > 0 ? 'droite' : 'gauche';
  return y > 0 ? 'bas' : 'haut';
}

/**
 * L'élément voisin dans une direction : le plus proche dont le centre est au-delà de celui de l'origine, en
 * pénalisant l'écart sur l'autre axe (une case alignée l'emporte sur une case plus proche mais décalée).
 * Rend l'indice dans `candidats`, ou -1.
 */
export function voisin(o: Boite, candidats: readonly Boite[], dir: Dir): number {
  const ocx = o.x + o.w / 2;
  const ocy = o.y + o.h / 2;
  const horiz = dir === 'gauche' || dir === 'droite';
  const signe = dir === 'droite' || dir === 'bas' ? 1 : -1;
  let best = -1;
  let bestScore = Infinity;
  candidats.forEach((c, i) => {
    const ccx = c.x + c.w / 2;
    const ccy = c.y + c.h / 2;
    const avance = horiz ? (ccx - ocx) * signe : (ccy - ocy) * signe;
    if (avance <= 1) return;
    // distance entre les bords dans la direction (0 si les boîtes se chevauchent sur cet axe)
    const bord = horiz
      ? Math.max(0, signe > 0 ? c.x - (o.x + o.w) : o.x - (c.x + c.w))
      : Math.max(0, signe > 0 ? c.y - (o.y + o.h) : o.y - (c.y + c.h));
    // écart sur l'autre axe : 0 si les boîtes se recouvrent, sinon l'espace qui les sépare
    const ecart = horiz
      ? Math.max(0, c.y - (o.y + o.h), o.y - (c.y + c.h))
      : Math.max(0, c.x - (o.x + o.w), o.x - (c.x + c.w));
    // un cône : « gauche » ne saute pas sur un élément bien plus bas que loin à gauche
    if (ecart > avance * 2 + 40) return;
    const alignement = horiz ? Math.abs(ccy - ocy) : Math.abs(ccx - ocx);
    const score = bord + avance * 0.1 + ecart * 3 + alignement * 0.2;
    if (score < bestScore) { bestScore = score; best = i; }
  });
  return best;
}

/** Répétition d'une direction tenue : un pas tout de suite, puis après `delai`, puis tous les `pas` (ms). */
export class Repetition {
  private dir: Dir | null = null;
  private prochain = 0;
  constructor(private readonly delai = 380, private readonly pas = 130) {}
  suivre(dir: Dir | null, t: number): Dir | null {
    if (dir !== this.dir) { this.dir = dir; this.prochain = t + this.delai; return dir; }
    if (dir && t >= this.prochain) { this.prochain = t + this.pas; return dir; }
    return null;
  }
}

// ------------------------------------------------------------------ état partagé

const MARQUE = Symbol('lqvManette');
let marche: { actif: () => boolean } | null = null;
let vecteur = { x: 0, z: 0 };
let focusManette: Element | null = null;
let actif = false;

/** Un événement clavier simulé par la manette (pour qu'un écouteur s'en distingue au besoin). */
export function estManette(e: Event): boolean { return (e as unknown as Record<symbol, unknown>)[MARQUE] === true; }

/** La ville déclare quand on y marche ; rend de quoi se retirer. */
export function definirMarche(actifFn: () => boolean): () => void {
  const m = { actif: actifFn };
  marche = m;
  return () => { if (marche === m) { marche = null; vecteur = { x: 0, z: 0 }; } };
}

/** Direction de marche donnée par la manette (x à droite, z vers le bas de l'écran), longueur 0 à 1. */
export function marcheManette(): { x: number; z: number } { return marche?.actif() ? vecteur : { x: 0, z: 0 }; }

/** Focus « visible » : posé au clavier, ou par la manette (infobulles, inspection des cartes). */
export function focusVisible(el: Element): boolean {
  return el.matches(':focus-visible') || (actif && el === focusManette);
}

// ------------------------------------------------------------------ navigation dans la page

const FOCUSABLES = 'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"]), [role="button"]';
const FENETRES = '[role="dialog"], [role="alertdialog"], [aria-modal="true"], dialog[open], .overlay';

function boite(el: Element): Boite { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; }

function dansDefilement(el: Element): boolean {
  for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
    const s = getComputedStyle(p);
    if (/(auto|scroll)/.test(s.overflowY + s.overflowX) && (p.scrollHeight > p.clientHeight + 1 || p.scrollWidth > p.clientWidth + 1)) return true;
  }
  return false;
}

/** Visible, et pas recouvert par une autre couche (rideau, fenêtre, panneau) ; hors champ seulement dans une liste. */
function atteignable(el: HTMLElement): boolean {
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return false;
  const s = getComputedStyle(el);
  if (s.visibility === 'hidden' || Number(s.opacity) === 0) return false;
  const x0 = Math.max(0, r.left);
  const x1 = Math.min(innerWidth, r.right);
  const y0 = Math.max(0, r.top);
  const y1 = Math.min(innerHeight, r.bottom);
  if (x1 - x0 < 2 || y1 - y0 < 2) return dansDefilement(el);
  const top = document.elementFromPoint((x0 + x1) / 2, (y0 + y1) / 2);
  return !!top && (top === el || el.contains(top));
}

function conteneur(): Element | null {
  const act = document.activeElement;
  const ici = act && act !== document.body ? act.closest(FENETRES) : null;
  if (ici) return ici;
  const ouvertes = [...document.querySelectorAll(FENETRES)].filter((f) => f.getClientRects().length > 0);
  for (let i = ouvertes.length - 1; i >= 0; i--) { const f = ouvertes[i]!; if ([...f.querySelectorAll<HTMLElement>(FOCUSABLES)].some(atteignable)) return f; }
  return null;
}

function candidats(): HTMLElement[] {
  const racine = conteneur() ?? document;
  return [...racine.querySelectorAll<HTMLElement>(FOCUSABLES)].filter((el) => !el.closest('[inert], [hidden]') && atteignable(el));
}

function focaliser(el: HTMLElement): void {
  focusManette = el;
  el.focus({ preventScroll: true, focusVisible: true } as FocusOptions);
  el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

/** Où commencer quand rien n'a le focus : l'action principale, sinon l'élément le plus proche du centre. */
function depart(cs: HTMLElement[]): HTMLElement | null {
  const prim = cs.find((el) => el.matches('[data-primary-action], .primary, [autofocus]'));
  if (prim) return prim;
  let best: HTMLElement | null = null;
  let d = Infinity;
  for (const el of cs) {
    const b = boite(el);
    const dd = Math.hypot(b.x + b.w / 2 - innerWidth / 2, b.y + b.h / 2 - innerHeight / 2);
    if (dd < d) { d = dd; best = el; }
  }
  return best;
}

/** L'élément qui a le focus, point de départ du pas suivant, même recouvert (la carte choisie sous ses boutons de pose). */
function courant(cs: HTMLElement[]): HTMLElement | null {
  const act = document.activeElement as HTMLElement | null;
  if (!act || act === document.body) return null;
  if (cs.includes(act)) return act;
  const ici = conteneur();
  return act.getClientRects().length > 0 && (!ici || ici.contains(act)) ? act : null;
}

function naviguer(dir: Dir): void {
  const cs = candidats();
  if (!cs.length) return;
  const cur = courant(cs);
  if (!cur) { const d = depart(cs); if (d) focaliser(d); return; }
  const autres = cs.filter((el) => el !== cur);
  const i = voisin(boite(cur), autres.map(boite), dir);
  if (i >= 0) focaliser(autres[i]!);
}

function touche(code: string, key: string, cible: EventTarget = document.activeElement ?? document.body): KeyboardEvent {
  const ev = new KeyboardEvent('keydown', { code, key, bubbles: true, cancelable: true });
  Object.defineProperty(ev, MARQUE, { value: true });
  cible.dispatchEvent(ev);
  const up = new KeyboardEvent('keyup', { code, key, bubbles: true, cancelable: true });
  Object.defineProperty(up, MARQUE, { value: true });
  cible.dispatchEvent(up);
  return ev;
}

function activable(el: HTMLElement): boolean {
  return el.matches('button, a[href], [role="button"], [role="menuitem"], [role="tab"], summary, input[type="checkbox"], input[type="radio"]');
}

function valider(): void {
  if (marche?.actif()) { touche('KeyE', 'e', document.body); return; }
  const act = document.activeElement as HTMLElement | null;
  const cible = act && act !== document.body ? act : null;
  const ev = touche('Enter', 'Enter', cible ?? document.body);
  if (ev.defaultPrevented) return;
  if (cible) { if (activable(cible)) cible.click(); else if (cible.matches('input, textarea, select')) cible.focus(); return; }
  const d = depart(candidats());
  if (d) focaliser(d);
}

function defiler(v: number): void {
  if (Math.abs(v) < 0.25) return;
  const pas = Math.sign(v) * (Math.abs(v) - 0.25) * 24;
  const depuis = (document.activeElement && document.activeElement !== document.body ? document.activeElement : document.elementFromPoint(innerWidth / 2, innerHeight / 2)) as Element | null;
  for (let p = depuis; p; p = p.parentElement) {
    const s = getComputedStyle(p);
    if (/(auto|scroll)/.test(s.overflowY) && p.scrollHeight > p.clientHeight + 1) { p.scrollTop += pas; return; }
  }
  document.scrollingElement?.scrollBy(0, pas);
}

// ------------------------------------------------------------------ boucle

const STYLE = `
html.lqv-manette :focus:not(.zone):not(canvas) { outline: 3px solid #ffe7b0 !important; outline-offset: 3px; }
html.lqv-manette .zone:focus .zone-floor { outline: 3px solid #ffe7b0; outline-offset: 2px; }
html.lqv-manette, html.lqv-manette * { cursor: none !important; }
`;

function mode(on: boolean): void {
  if (on === actif) return;
  actif = on;
  if (on && !document.getElementById('lqv-manette-style')) {
    const st = document.createElement('style');
    st.id = 'lqv-manette-style';
    st.textContent = STYLE;
    document.head.append(st);
  }
  document.documentElement.classList.toggle('lqv-manette', on);
  if (!on) focusManette = null;
}

let installe = false;

/** À appeler une fois au démarrage : ne fait rien tant qu'aucune manette ne se signale. */
export function installerManette(): void {
  if (installe || typeof navigator === 'undefined' || !('getGamepads' in navigator)) return;
  installe = true;
  let raf = 0;
  let avant: boolean[] = [];
  const rep = new Repetition();
  const lire = (): Gamepad | null => {
    for (const p of navigator.getGamepads()) if (p && p.connected) return p;
    return null;
  };
  const tour = (t: number) => {
    const p = lire();
    if (!p) { raf = 0; vecteur = { x: 0, z: 0 }; avant = []; return; }
    raf = requestAnimationFrame(tour);
    const bt = p.buttons.map((b) => b.pressed || b.value > 0.5);
    const appui = (i: number) => !!bt[i] && !avant[i];
    const st = zoneMorte(p.axes[0] ?? 0, p.axes[1] ?? 0);
    const croix = { x: (bt[BOUTON.DROITE] ? 1 : 0) - (bt[BOUTON.GAUCHE] ? 1 : 0), y: (bt[BOUTON.BAS] ? 1 : 0) - (bt[BOUTON.HAUT] ? 1 : 0) };
    const droit = p.axes[3] ?? 0;
    if (bt.some(Boolean) || st.x || st.y || Math.abs(droit) > 0.25) mode(true);
    if (!actif) { avant = bt; return; }
    if (marche?.actif()) {
      vecteur = croix.x || croix.y ? { x: croix.x, z: croix.y } : { x: st.x, z: st.y };
      rep.suivre(null, t);
    } else {
      vecteur = { x: 0, z: 0 };
      const d = croix.x || croix.y ? directionDe(croix.x, croix.y) : directionDe(st.x, st.y, 0.45);
      const pas = rep.suivre(d, t);
      if (pas) naviguer(pas);
    }
    if (appui(BOUTON.A)) valider();
    if (appui(BOUTON.B) || appui(BOUTON.START)) touche('Escape', 'Escape');
    if (appui(BOUTON.Y)) touche('KeyN', 'n');
    if (appui(BOUTON.X)) touche('KeyV', 'v');
    defiler(droit);
    avant = bt;
  };
  const lancer = () => { if (!raf) raf = requestAnimationFrame(tour); };
  window.addEventListener('gamepadconnected', lancer);
  if (lire()) lancer();
  // une vraie souris ou un vrai clavier reprend la main : l'anneau de la manette s'efface
  const quitter = (e: Event) => { if (e.isTrusted && !estManette(e)) mode(false); };
  window.addEventListener('pointerdown', quitter, true);
  window.addEventListener('keydown', quitter, true);
  window.addEventListener('mousemove', (e) => { if (actif && (Math.abs(e.movementX) + Math.abs(e.movementY) > 2)) mode(false); }, true);
}
