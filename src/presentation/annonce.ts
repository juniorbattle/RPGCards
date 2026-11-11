/**
 * M18 (R1, contrat `docs/m18/01_TOUR_FLUIDE.md`) — les annonces d'étape du tour assisté : au début du tour et à chaque
 * étape où le joueur a la main, un bandeau bref au centre de la table (« Tour 3 · Engagement : choisis ta Primaire »),
 * qui s'efface seul (environ une seconde) ; jamais bloquant (aucun clic ne lui est destiné). Faits du joueur seulement
 * (sa vue) : une annonce ne dit jamais ce que le joueur ne verrait pas (ADR 011).
 *
 * `annonceDe` est pur (testé) ; `Annonceur` pose le bandeau sur son propre hôte, hors du plateau (les re-rendus du
 * plateau ne l'interrompent jamais). Mouvement réduit (réglage du jeu) : un fondu d'opacité seul, sans glissement.
 */
import type { Phase } from '../game/model/types';

export interface Annonce { cle: string; titre: string; texte: string }

/** Ce que le joueur voit de sa situation (sous-ensemble de sa `PlayerView`). */
export interface SituationAnnonce {
  seed: number;
  turn: number;
  phase: Phase;
  awaitingMe: boolean;
  repelMine: boolean;
  handCount: number;
  activeSlots: number;
  lectureSeen: 'assault' | 'guard' | null;
}

export function annonceDe(s: SituationAnnonce): Annonce | null {
  if (!s.awaitingMe && !(s.phase === 'REPEL' && s.repelMine)) return null;
  const texte = (() => {
    switch (s.phase) {
      case 'START': return s.handCount > 4 ? 'Début du tour : défausse jusqu’à 4 cartes' : 'Début du tour : une Technique est prête';
      case 'PREPARE': return 'Préparation : révèle ou garde tes réserves';
      case 'DISSIPATION': return 'Dissipation possible';
      case 'COMMIT': return 'Engagement : choisis ta Primaire';
      case 'REVISION': return 'Le rival a annoncé sa Signature : tu peux réviser';
      case 'LECTURE': return 'Lecture possible';
      case 'LECTURE_CHANGE': return `Lecture : le rival est en ${s.lectureSeen === 'assault' ? 'ASSAUT' : 'GARDE'}`;
      case 'TACTICS': return s.activeSlots > 0 ? (s.activeSlots > 1 ? 'Choisis l’action de chaque Secondaire' : 'Choisis l’action de ta Secondaire') : 'Rupture possible';
      case 'REPEL': return 'Repoussement : choisis une Secondaire adverse';
      default: return null;
    }
  })();
  return texte ? { cle: `${s.seed}:${s.turn}:${s.phase}`, titre: `Tour ${s.turn}`, texte } : null;
}

/** Durées du bandeau (ms) : entrée, tenue, sortie (environ une seconde en tout). */
export const BANDEAU = { entree: 180, tenue: 720, sortie: 320 } as const;

export class Annonceur {
  private timer = 0;
  /** QA : annonces montrées (titre et texte), dans l'ordre. */
  readonly vues: string[] = [];

  constructor(private readonly host: HTMLElement) {}

  montrer(a: Annonce, opts: { reduit: boolean; fige: boolean }): void {
    window.clearTimeout(this.timer);
    this.vues.push(`${a.titre} · ${a.texte}`);
    const el = document.createElement('div');
    el.className = `annonce${opts.reduit ? ' reduit' : ''}`;
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.dataset.cle = a.cle;
    const t = document.createElement('span');
    t.className = 'annonce-tour';
    t.textContent = a.titre;
    const b = document.createElement('b');
    b.className = 'annonce-texte';
    b.textContent = a.texte;
    el.append(t, b);
    this.host.replaceChildren(el);
    // temps figé (captures) : le bandeau reste posé, sans animation
    if (opts.fige) { el.classList.add('fixe'); return; }
    const total = BANDEAU.entree + BANDEAU.tenue + BANDEAU.sortie;
    const a1 = BANDEAU.entree / total;
    const a2 = (BANDEAU.entree + BANDEAU.tenue) / total;
    // animation par script (la règle `.reduced *` coupe les animations CSS) : en mouvement réduit, l'opacité seule
    const k: Keyframe[] = opts.reduit
      ? [{ opacity: 0 }, { opacity: 1, offset: a1 }, { opacity: 1, offset: a2 }, { opacity: 0 }]
      : [{ opacity: 0, transform: 'translateY(10px) scale(0.97)' }, { opacity: 1, transform: 'none', offset: a1 }, { opacity: 1, transform: 'none', offset: a2 }, { opacity: 0, transform: 'translateY(-6px)' }];
    el.animate?.(k, { duration: total, easing: 'ease-out', fill: 'forwards' });
    this.timer = window.setTimeout(() => { if (el.isConnected) el.remove(); }, total + 40);
  }

  /** QA : une étape annoncée par son panneau de décision plutôt que par le bandeau. */
  noter(a: Annonce): void {
    this.vues.push(`${a.titre} · ${a.texte} (panneau)`);
  }

  effacer(): void {
    window.clearTimeout(this.timer);
    this.host.replaceChildren();
  }
}
