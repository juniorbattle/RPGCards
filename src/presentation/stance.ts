/**
 * Identité de posture (M03 §3) : ASSAUT = bandeau rouge-orangé + pointe (élan) ;
 * GARDE = bandeau bleu + bouclier (ancrage). Forme + texte + couleur : lisible sans la couleur.
 * N’est rendu que pour une Primaire RÉVÉLÉE (ou pour le choix du joueur lui-même).
 */
import type { Stance } from '../game/model/types';
import { cls, h } from './dom';

export const STANCE_ICON: Record<Stance, string> = {
  assault: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 10h11V5.5L22 12l-9 6.5V14H2z" fill="currentColor"/></svg>',
  guard: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l8 3v6c0 5.4-3.4 9.4-8 11-4.6-1.6-8-5.6-8-11V5z" fill="currentColor"/><path d="M12 5.2l5 1.9v4c0 3.6-2.1 6.4-5 7.7z" fill="rgba(255,255,255,.35)"/></svg>',
};

export function stanceBanner(st: Stance, extra?: string): HTMLElement {
  const label = st === 'assault' ? 'ASSAUT' : 'GARDE';
  return h('span', { class: cls('stance-banner', st), role: 'img', 'aria-label': `Mode ${label}${extra ? ` (${extra})` : ''}` },
    h('span', { class: 'sb-icon', html: STANCE_ICON[st] }),
    h('span', { class: 'sb-text' }, label),
    extra ? h('span', { class: 'sb-extra' }, extra) : null,
  );
}
