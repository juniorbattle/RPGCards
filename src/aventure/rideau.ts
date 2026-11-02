/**
 * Fondus de l'aventure (passe 200, retour du test du responsable : « trop brutales », « rendre le jeu smooth ») : un seul
 * rideau noir pour tout le jeu, qui se ferme et s'ouvre sur la même courbe et repart de là où il en est, et un seul
 * tableau de durées. Un écran ne se change que sous le noir, ou en fondu enchaîné (`effacer`, `fantomeEcran`).
 *
 * Mouvement réduit et temps figé : aucun fondu, tout se résout tout de suite (captures et parcours de QA inchangés).
 */

/** Durées des fondus (ms). */
export const FONDUS = {
  /** Vers le noir, puis depuis le noir, d'un écran à l'autre ; `tenue` : le noir tenu entre les deux, le temps d'un souffle. */
  fermer: 620, ouvrir: 900, tenue: 180,
  /** D'un quartier à l'autre, en marchant : plus court, on le fait souvent. */
  voyage: 420, voyageOuvrir: 560,
  /** Une coupe à l'intérieur d'une cinématique, et une cinématique passée. */
  coupe: 300, coupeOuvrir: 420, passer: 240,
  /** Le dernier cadre tenu après une scène, avant le noir ; après le dernier coup d'un duel, avant son résultat. */
  respiration: 420, finDuel: 650,
  /** Un dialogue ou une fenêtre qui s'efface ; deux écrans de l'enveloppe en fondu enchaîné. */
  sortie: 220, ecran: 300,
} as const;

/** Combien de temps le noir se fait attendre à l'ouverture : la tenue, moins ce qu'on a déjà tenu. */
export const resteTenue = (noirDepuis: number, maintenant: number, tenue: number = FONDUS.tenue): number => Math.max(0, tenue - (maintenant - noirDepuis));

type EtatRideau = 'ouvert' | 'fermeture' | 'noir' | 'ouverture';

export class Rideau {
  private el: HTMLElement | null = null;
  private etat: EtatRideau = 'ouvert';
  private minuterie: ReturnType<typeof setTimeout> | null = null;
  private noirDepuis = 0;

  /** `net` : pas de fondu (mouvement réduit, temps figé). */
  constructor(private readonly net: () => boolean) {}

  get noir(): boolean { return this.etat === 'noir'; }
  get enCours(): boolean { return this.etat === 'fermeture'; }

  private voile(): HTMLElement {
    if (!this.el) {
      this.el = document.createElement('div');
      this.el.className = 'ville-fade';
      document.body.append(this.el);
    }
    return this.el;
  }

  private arreter(): void {
    if (this.minuterie !== null) clearTimeout(this.minuterie);
    this.minuterie = null;
  }

  /** Le noir, d'un coup : seulement sur ce qui est déjà noir, ou sans mouvement ; un fondu en cours va à son terme (et à sa suite). */
  poser(): void {
    if (this.etat === 'fermeture') return;
    this.arreter();
    const v = this.voile();
    v.style.transitionDelay = '0ms';
    v.classList.add('in', 'plein');
    if (this.etat !== 'noir') this.noirDepuis = performance.now();
    this.etat = 'noir';
  }

  /** Fondu au noir, puis `puis` ; tout de suite si le noir est déjà là, ou sans mouvement. Un fondu en cours n'est pas repris. */
  fermer(puis: () => void, ms: number = FONDUS.fermer): void {
    if (this.etat === 'fermeture') return;
    if (this.etat === 'noir' || this.net()) { this.poser(); puis(); return; }
    this.arreter();
    const v = this.voile();
    this.etat = 'fermeture';
    v.style.transitionDelay = '0ms';
    v.style.transitionDuration = `${ms}ms`;
    void v.offsetWidth; // la transition part de l'opacité du moment, pas d'une valeur par défaut
    v.classList.add('in');
    this.minuterie = setTimeout(() => {
      this.minuterie = null;
      this.etat = 'noir';
      this.noirDepuis = performance.now();
      v.classList.add('plein');
      puis();
    }, ms);
  }

  /** Lève le noir (la tenue d'abord) ; rien s'il n'est pas tout à fait fermé. */
  ouvrir(ms: number = FONDUS.ouvrir): void {
    const v = this.el;
    if (!v || this.etat !== 'noir') return;
    if (this.net()) { this.retirer(); return; }
    const delai = resteTenue(this.noirDepuis, performance.now());
    this.etat = 'ouverture';
    v.style.transitionDelay = `${delai}ms`;
    v.style.transitionDuration = `${ms}ms`;
    v.classList.remove('in', 'plein');
    this.minuterie = setTimeout(() => this.retirer(), delai + ms + 30);
  }

  /** Plus de noir, d'un coup : un autre noir prend le relais (une fenêtre sur fond noir), ou l'écran a changé. */
  retirer(): void {
    this.arreter();
    this.el?.remove();
    this.el = null;
    this.etat = 'ouvert';
  }
}

/** Retire de l'élément tout ce qui le désigne : son image reste à l'écran le temps de s'effacer, plus rien ne le trouve. */
function anonymiser(racine: HTMLElement): void {
  for (const n of [racine, ...racine.querySelectorAll<HTMLElement>('[data-key], [data-screen], [id]')]) {
    n.removeAttribute('data-key');
    n.removeAttribute('data-screen');
    n.removeAttribute('data-shell-primary');
    n.removeAttribute('id');
  }
  racine.setAttribute('aria-hidden', 'true');
  racine.inert = true;
}

/** Efface un dialogue ou une fenêtre : `classe` remplace `avant` (l'état de l'écran ne le voit plus), son image s'efface en `ms`. */
export function effacer(el: HTMLElement, avant: string, classe: string, net: boolean, ms: number = FONDUS.sortie): void {
  if (net) { el.remove(); return; }
  anonymiser(el);
  el.classList.remove(avant);
  el.classList.add(classe, 'sortie');
  el.style.animationDuration = `${ms}ms`;
  setTimeout(() => el.remove(), ms + 30);
}

/** L'écran de l'enveloppe qui s'en va : ses éléments passent dans un fantôme qui s'efface par-dessus le suivant (fondu enchaîné). */
export function fantomeEcran(hote: HTMLElement, ms: number = FONDUS.ecran): void {
  const f = document.createElement('div');
  f.className = `${hote.className} shell-fantome sortie`;
  f.style.animationDuration = `${ms}ms`;
  f.append(...hote.childNodes);
  anonymiser(f);
  hote.after(f);
  setTimeout(() => f.remove(), ms + 30);
}
