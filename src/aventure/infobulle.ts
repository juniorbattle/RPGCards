/**
 * Infobulle de l'aventure (passe 209 ; retour du test : « trop de texte descriptif visible […] les épurer avec des
 * tooltips si on a besoin d'infos supplémentaires »). Une seule bulle, posée sur `body` (jamais rognée par un cadre qui
 * défile), pour tout élément qui porte `data-info` : au survol après un court délai, ou au focus clavier. L'écran ne garde
 * que l'essentiel ; le détail (règle, origine d'une carte, conséquence d'un choix) se lit à la demande.
 */
import { h } from '../presentation/dom';
import { focusVisible } from '../entree/manette';

const DELAI = 220;
let bulle: HTMLElement | null = null;
let cible: Element | null = null;
let minuterie = 0;

function cacher(): void {
  window.clearTimeout(minuterie);
  cible = null;
  if (bulle) { bulle.classList.remove('visible'); bulle.hidden = true; }
}

function montrer(el: Element): void {
  const texte = el.getAttribute('data-info');
  if (!bulle || !texte || !el.isConnected) return;
  bulle.textContent = texte;
  bulle.hidden = false;
  const r = el.getBoundingClientRect();
  const b = bulle.getBoundingClientRect();
  const marge = 8;
  const x = Math.min(Math.max(marge, r.left + r.width / 2 - b.width / 2), innerWidth - b.width - marge);
  const dessus = r.top - b.height - 10;
  const y = dessus >= marge ? dessus : Math.min(r.bottom + 10, innerHeight - b.height - marge);
  bulle.style.left = `${Math.round(x)}px`;
  bulle.style.top = `${Math.round(y)}px`;
  bulle.classList.toggle('dessous', dessus < marge);
  requestAnimationFrame(() => bulle?.classList.add('visible'));
}

/** Pose la bulle et ses écouteurs, une fois pour toute l'aventure. */
export function installerInfobulles(): void {
  if (bulle) return;
  bulle = h('div', { class: 'lqv-infobulle', role: 'tooltip', hidden: true });
  document.body.append(bulle);
  document.addEventListener('pointerover', (e) => {
    const el = (e.target as Element | null)?.closest?.('[data-info]') ?? null;
    if (el === cible) return;
    cacher();
    if (!el) return;
    cible = el;
    minuterie = window.setTimeout(() => montrer(el), DELAI);
  });
  // au clavier seulement : un focus posé par le code à l'ouverture d'une fenêtre n'ouvre pas de bulle
  document.addEventListener('focusin', (e) => {
    const el = (e.target as Element | null)?.closest?.('[data-info]') ?? null;
    if (!el || !focusVisible(e.target as Element)) return;
    cacher();
    cible = el;
    montrer(el);
  });
  document.addEventListener('focusout', cacher);
  document.addEventListener('pointerdown', cacher, true);
  document.addEventListener('scroll', cacher, true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cacher(); });
}

/** Donne un détail à lire au survol ; le texte reste lu par les lecteurs d'écran (`aria-description`). */
export function info<T extends HTMLElement>(el: T, texte: string | null | undefined): T {
  if (texte) { el.setAttribute('data-info', texte); el.setAttribute('aria-description', texte); }
  return el;
}

/** Une pastille « i » à côté d'un titre : le détail qui n'a plus sa phrase à l'écran. */
export function pastille(texte: string, key?: string): HTMLElement {
  return h('button', { class: 'av-info', type: 'button', 'aria-label': texte, 'data-info': texte, 'data-key': key ?? null }, 'i');
}
