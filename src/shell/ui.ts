/** Petits éléments communs aux écrans de l’enveloppe (M04) — DOM accessible, sans framework. */
import { cls, h } from '../presentation/dom';

export { cls, h };

type Child = Node | string | null | undefined | false | Child[];

export function btn(label: string, onclick: () => void, o: { key?: string; ghost?: boolean; disabled?: boolean; title?: string; primary?: boolean; danger?: boolean } = {}): HTMLButtonElement {
  return h('button', {
    class: cls('btn', o.ghost && 'ghost', o.danger && 'danger'), type: 'button', 'data-key': o.key ?? null, disabled: o.disabled || null,
    title: o.title ?? null, 'data-shell-primary': o.primary ? 'true' : null, onclick,
  }, label) as HTMLButtonElement;
}

/** Panneau d’écran : titre, sous-titre, corps ; `aria-labelledby` pour les lecteurs d’écran. */
export function screen(id: string, title: string, subtitle: Child, ...body: Child[]): HTMLElement {
  return h('section', { class: cls('sh-screen', `sh-${id}`), 'aria-labelledby': `sh-title-${id}`, 'data-screen': id },
    h('header', { class: 'sh-head' },
      h('h1', { id: `sh-title-${id}`, class: 'sh-title' }, title),
      subtitle ? h('p', { class: 'sh-sub' }, subtitle as never) : null),
    ...(body as never[]));
}

export function chip(text: string, tone: 'ok' | 'bad' | 'info' | 'proto' | 'gold' = 'info', title?: string): HTMLElement {
  return h('span', { class: cls('sh-chip', `tone-${tone}`), title: title ?? null }, text);
}

export interface ConfirmOptions {
  title: string;
  text: string;
  confirm: string;
  cancel?: string;
  danger?: boolean;
  /** Troisième choix facultatif (ex. « Sauvegarder et quitter »). */
  alt?: { label: string; key: string };
}

/**
 * Boîte de confirmation modale (focus sur l’action sûre, Échap = annuler). Résout la clé choisie :
 * `confirm`, `cancel` ou la clé de l’alternative.
 */
export function confirmDialog(o: ConfirmOptions): Promise<string> {
  return new Promise((resolve) => {
    const prev = document.activeElement as HTMLElement | null;
    const close = (v: string) => { overlay.remove(); document.removeEventListener('keydown', onKey, true); prev?.focus?.(); resolve(v); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); close('cancel'); } };
    const cancel = btn(o.cancel ?? 'Annuler', () => close('cancel'), { ghost: true, key: 'confirm-cancel' });
    const overlay = h('div', { class: 'overlay sh-confirm', role: 'alertdialog', 'aria-modal': 'true', 'aria-labelledby': 'sh-confirm-t', 'aria-describedby': 'sh-confirm-d' },
      h('div', { class: 'dialog sh-dialog' },
        h('h2', { id: 'sh-confirm-t' }, o.title),
        h('p', { id: 'sh-confirm-d' }, o.text),
        h('div', { class: 'btn-row' },
          cancel,
          o.alt ? btn(o.alt.label, () => close(o.alt!.key), { ghost: true, key: `confirm-${o.alt.key}` }) : null,
          btn(o.confirm, () => close('confirm'), { key: 'confirm-ok', danger: o.danger }))));
    document.addEventListener('keydown', onKey, true);
    document.body.append(overlay);
    cancel.focus();
  });
}

/** Message bref de l’enveloppe (sauvegarde, refus de transition). */
export function shellToast(host: HTMLElement, text: string, kind: 'error' | 'info' | 'ok' = 'info'): void {
  host.querySelector('.sh-toast')?.remove();
  const t = h('div', { class: cls('sh-toast', `tone-${kind}`), role: kind === 'error' ? 'alert' : 'status', 'aria-live': 'polite' }, text);
  host.append(t);
  window.setTimeout(() => t.remove(), kind === 'error' ? 6000 : 3200);
}

export function fmtDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}
