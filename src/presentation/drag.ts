/**
 * Glisser-déposer par Pointer Events (souris, stylet, tactile) — sans API HTML5 DnD
 * (inutilisable au tactile). Un mouvement < 6 px est un clic ; un appui long (> 450 ms)
 * relâché sans glisser ouvre l’inspection. Les cibles déclarent `data-drop`.
 */
import type { Controller, DropKey } from '../app/controller';

export class DragManager {
  dragging = false;
  private start: { x: number; y: number; id: string; el: HTMLElement; pointerId: number } | null = null;
  private ghost: HTMLElement | null = null;
  private hoverZone: HTMLElement | null = null;
  private longPress = 0;
  private suppressClick = false;
  private longPressed = false;

  /** `signal` : retire tous les écouteurs à la fin de la session de duel (M04). */
  constructor(private root: HTMLElement, private c: Controller, private onDone: () => void, signal?: AbortSignal) {
    root.addEventListener('pointerdown', this.down, { passive: false, signal });
    window.addEventListener('pointermove', this.move, { passive: false, signal });
    window.addEventListener('pointerup', this.up, { signal });
    window.addEventListener('pointercancel', this.cancel, { signal });
    // Clic de carte (main / brouillon) : géré ici pour distinguer clic et glisser.
    root.addEventListener('click', (e) => {
      if (this.suppressClick) { e.stopPropagation(); e.preventDefault(); this.suppressClick = false; }
    }, { capture: true, signal });
  }

  /** Fin de session : minuterie d’appui long et fantôme éventuel retirés. */
  dispose(): void {
    window.clearTimeout(this.longPress);
    this.ghost?.remove();
    this.ghost = null;
    this.start = null;
    this.dragging = false;
  }

  private down = (e: PointerEvent): void => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-drag-card]');
    if (!el || e.button > 0) return;
    this.start = { x: e.clientX, y: e.clientY, id: el.dataset.dragCard!, el, pointerId: e.pointerId };
    this.longPressed = false;
    window.clearTimeout(this.longPress);
    if (e.pointerType !== 'mouse') {
      this.longPress = window.setTimeout(() => {
        // Appui long = inspection, appliquée au relâchement s’il n’y a pas eu de glisser : des
        // mouvements peuvent arriver après la minuterie si le fil principal est chargé, et le
        // glisser doit alors l’emporter (ni annulé, ni recouvert par le panneau d’inspection).
        if (this.start && !this.dragging) this.longPressed = true;
      }, 450);
    }
  };

  private move = (e: PointerEvent): void => {
    if (!this.start || e.pointerId !== this.start.pointerId) return;
    const dx = e.clientX - this.start.x;
    const dy = e.clientY - this.start.y;
    if (!this.dragging) {
      if (Math.hypot(dx, dy) < 6) return;
      window.clearTimeout(this.longPress);
      if (!this.c.editingCommit()) {
        this.c.toast('Les cartes se posent pendant la phase d’Engagement.');
        this.start = null;
        return;
      }
      this.begin();
    }
    e.preventDefault();
    if (this.ghost) {
      this.ghost.style.left = `${e.clientX - this.ghost.offsetWidth / 2}px`;
      this.ghost.style.top = `${e.clientY - this.ghost.offsetHeight * 0.6}px`;
    }
    const zone = this.zoneAt(e.clientX, e.clientY);
    if (zone !== this.hoverZone) {
      this.hoverZone?.classList.remove('hover-legal', 'hover-illegal');
      this.hoverZone = zone;
      if (zone) {
        const reason = this.c.dropCheck(this.start.id, zone.dataset.drop as DropKey);
        zone.classList.add(reason ? 'hover-illegal' : 'hover-legal');
        zone.title = reason ?? '';
      }
    }
  };

  private begin(): void {
    if (!this.start) return;
    this.dragging = true;
    this.c.setDragging(true); // aucune transition de vue sous le pointeur
    const src = this.start.el;
    const rect = src.getBoundingClientRect();
    const g = src.cloneNode(true) as HTMLElement;
    g.classList.add('drag-ghost');
    g.classList.remove('selected');
    g.removeAttribute('data-key');
    g.style.width = `${rect.width}px`;
    g.style.height = `${rect.height}px`;
    g.style.left = `${rect.left}px`;
    g.style.top = `${rect.top}px`;
    document.body.append(g);
    this.ghost = g;
    src.classList.add('dragging-source');
    // Surligner toutes les destinations, légales ou non (avec raison au survol).
    this.root.querySelectorAll<HTMLElement>('[data-drop]').forEach((z) => {
      const k = z.dataset.drop as DropKey;
      if (k === 'hand') return;
      z.classList.add(this.c.dropCheck(this.start!.id, k) ? 'illegal' : 'legal');
    });
  }

  private zoneAt(x: number, y: number): HTMLElement | null {
    for (const el of document.elementsFromPoint(x, y)) {
      const z = (el as HTMLElement).closest?.<HTMLElement>('[data-drop]');
      if (z && this.root.contains(z)) return z;
    }
    return null;
  }

  private up = (e: PointerEvent): void => {
    window.clearTimeout(this.longPress);
    if (!this.start || e.pointerId !== this.start.pointerId) return;
    const st = this.start;
    this.start = null;
    if (!this.dragging) {
      // Appui long sans déplacement : inspection seulement (pas de sélection).
      if (this.longPressed) {
        this.longPressed = false;
        this.suppressClick = true;
        window.setTimeout(() => { this.suppressClick = false; }, 0);
        const def = st.el.dataset.def;
        // M03 : inspection flottante (le journal n’est plus ouvert pour l’afficher).
        if (def) { this.c.ui.inspect = def; this.onDone(); }
        return;
      }
      // Clic simple sur carte de main / brouillon.
      if (this.suppressClick) return;
      this.suppressClick = true;
      const inHand = !!st.el.closest('.hand');
      if (inHand) this.c.clickHandCard(st.id);
      else this.c.dropCard(st.id, 'hand');
      window.setTimeout(() => { this.suppressClick = false; }, 0);
      return;
    }
    const zone = this.zoneAt(e.clientX, e.clientY);
    this.finish();
    this.suppressClick = true;
    window.setTimeout(() => { this.suppressClick = false; }, 0);
    if (zone) this.c.dropCard(st.id, zone.dataset.drop as DropKey);
    else this.onDone();
  };

  private cancel = (): void => {
    window.clearTimeout(this.longPress);
    this.start = null;
    if (this.dragging) { this.finish(); this.onDone(); }
  };

  private finish(): void {
    this.dragging = false;
    this.ghost?.remove();
    this.ghost = null;
    this.hoverZone = null;
    this.c.setDragging(false);
  }
}
