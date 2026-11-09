/**
 * M17 — une séance de leçons : le duel de leçon (une vraie `DuelSession`, situation et partenaire scriptés), le maître
 * de table qui parle (A3), la mise en lumière de l'élément attendu, le reste assombri (A2) et inactif (garde du
 * contrôleur : seul le geste attendu passe, mêmes chemins pour la souris, le clavier et la manette), puis la fin de la
 * leçon (leçon suivante, rejouer, terminer). Le noir entre deux écrans (instructions globales, §6 bis), sans fondu en
 * mouvement réduit.
 *
 * L'hôte (jeu standard ou aventure) prête l'élément du plateau et la scène, cache ses propres écrans pendant la séance,
 * et reprend la main dans `fin`.
 */
import type { AppParams } from '../app/params';
import type { Controller, GesteJoueur } from '../app/controller';
import { DuelSession } from '../app/duelSession';
import type { Scenario } from '../app/scenarios';
import type { GameState, PlayerCommand, SlotIndex } from '../game/model/types';
import { npcPersonality, type RivalPersonality } from '../presentation/personalities';
import type { ArenaHandle } from '../scene/arena';
import type { VenueId } from '../presentation/venues';
import { ecartGeste, gesteDe, leconFinie, LECONS, nomCarte, modeNom, PARTENAIRE, tourDe, type Geste, type Lecon, type LeconId } from './catalogue';
import { ecrireLecons, lireLecons, marquerFaite, stockageLecons, texteCourt } from './progression';
import { installerStylesLecons } from './styles';

export interface HoteSeance {
  app: HTMLElement;
  params: AppParams;
  ensureArena(p: RivalPersonality, venue?: VenueId): ArenaHandle | null;
  /** La séance est finie (sous le noir) : l'hôte remonte ses écrans, puis lève le noir avec `leverNoir`. */
  fin(faites: LeconId[], leverNoir: () => void): void;
}

/** Le maître de table, partenaire d'entraînement : un duelliste de la ville (gabarit « commis »), jamais l'IA d'un rival. */
export function maitreDeTable(): RivalPersonality {
  const base = npcPersonality('pnj-commis-48')!;
  return { ...base, name: PARTENAIRE, title: 'partenaire d’entraînement', aiProfile: 'novice', techniques: [] };
}

const sel = {
  main: (id: string) => `[data-key="hand-${CSS.escape(id)}"]`,
  prim: '.side.me [data-drop="primary"]',
  slot: (i: number) => `[data-drop="slot${i}"]`,
  opp: (i: number) => `[data-focus-key="opp-slot-${i}"]`,
  btn: (k: string) => `[data-key="${k}"]`,
};
const MODE = { assault: 'ASSAUT', guard: 'GARDE' } as const;

/** Ce que le maître de table montre maintenant. */
interface Guide { dire: string; faire: string; cibles: string[]; cle: string }

export class Seance {
  private session: DuelSession | null = null;
  private i = 0;
  private faites: LeconId[] = [];
  private raf = 0;
  private coach: HTMLElement;
  private voile: SVGSVGElement;
  private anneaux: HTMLElement;
  private rideau: HTMLElement;
  private cleAffichee = '';
  private finAffichee = false;
  private pause: HTMLElement | null = null;
  private fini = false;
  private readonly onKey = (e: KeyboardEvent) => this.touche(e);

  constructor(private readonly hote: HoteSeance, private readonly ids: readonly LeconId[]) {
    installerStylesLecons();
    this.coach = el('aside', 'lecon-coach');
    this.coach.setAttribute('aria-live', 'polite');
    this.coach.dataset.key = 'lecon-coach';
    this.voile = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.voile.classList.add('lecon-voile');
    this.voile.setAttribute('aria-hidden', 'true');
    this.anneaux = el('div', 'lecon-anneaux');
    this.rideau = el('div', 'lecon-rideau');
    document.body.append(this.voile, this.anneaux, this.coach, this.rideau);
    window.addEventListener('keydown', this.onKey, true);
    this.noir(true);
    this.demarrer(0);
  }

  get lecon(): Lecon { return LECONS[this.ids[this.i]!]; }
  get controleur(): Controller | null { return this.session?.controller ?? null; }

  private get net(): boolean { return this.hote.params.reducedMotion || this.hote.params.freeze; }

  /** Le noir : posé d'un coup (`tout de suite`) ou en fondu ; `puis` une fois noir. */
  private noir(toutDeSuite = false, puis?: () => void): void {
    const r = this.rideau;
    if (toutDeSuite || this.net) { r.style.transitionDuration = '0ms'; r.classList.add('on'); puis?.(); return; }
    r.style.transitionDuration = '520ms';
    r.classList.add('on');
    window.setTimeout(() => puis?.(), 560);
  }
  private lever(): void {
    const r = this.rideau;
    r.style.transitionDuration = this.net ? '0ms' : '760ms';
    requestAnimationFrame(() => requestAnimationFrame(() => r.classList.remove('on')));
  }

  /** Monte la leçon `i` (sous le noir). */
  private demarrer(i: number): void {
    this.i = i;
    this.session?.dispose();
    this.session = null;
    this.finAffichee = false;
    this.cleAffichee = '';
    const l = this.lecon;
    const scenario: Scenario = { id: `lecon-${l.id}`, title: l.titre, description: l.resume, config: l.config(), build: l.build, rival: l.partenaire };
    const perso = maitreDeTable();
    const arena = this.hote.ensureArena(perso, 'salle');
    arena?.setStaging('duel');
    arena?.setPaused(false);
    this.hote.app.hidden = false;
    this.session = new DuelSession({
      app: this.hote.app, arena, config: scenario.config, params: this.hote.params, scenario, personality: perso, product: { menu: true },
      lieu: 'salle',
      onTool: (t) => {
        if (t === 'menu' || t === 'help') { this.ouvrirPause(); return true; }
        return t.startsWith('tip:');
      },
    });
    this.session.controller.garde = (g) => this.garde(g);
    this.coach.hidden = false;
    this.boucle();
    this.lever();
  }

  // -------------------------------------------------------------------------
  // Le geste attendu

  private gesteCourant(c: Controller): { geste: Geste | null; libre: boolean } {
    const v = c.view;
    const tour = tourDe(this.lecon, v.turn);
    const g = v.awaitingMe || (v.phase === 'REPEL' && v.repel?.mine) ? gesteDe(this.lecon, v.turn, v.phase) : null;
    return { geste: g, libre: !g && (!tour || !!tour.libre) };
  }

  /** La garde : seul le geste attendu passe (raison montrée sinon) ; tout passe dans un tour libre. */
  private garde(g: GesteJoueur): string | null {
    const c = this.controleur;
    if (!c) return null;
    const s = c.match.state;
    if (leconFinie(this.lecon, s)) return g.k === 'commande' && g.cmd.type === 'nextTurn' ? 'La leçon est finie.' : null;
    if (g.k === 'commande' && g.cmd.type === 'nextTurn') return null;
    const { geste, libre } = this.gesteCourant(c);
    if (libre) return null;
    if (!geste) return g.k === 'commande' ? 'Attends le maître de table.' : null;
    const a = geste.attendu(s);
    switch (g.k) {
      case 'commande':
        if (geste.apresPartenaire && s.awaiting.includes('p2') && !s.pending.p2) return 'Attends que le maître de table ait verrouillé.';
        return ecartGeste(s, a, g.cmd as PlayerCommand);
      case 'carte': return cartesPermises(s, a).includes(defDe(s, g.id) ?? '') ? null : `Pas cette carte : ${cartesPermises(s, a).map(nomCarte).join(', ') || 'suis la consigne'}.`;
      case 'case': return casesPermises(s, a).includes(g.cle) ? null : 'Pas ici : suis la lumière.';
      case 'posture': return (a.type === 'commit' || a.type === 'lectureStance') && a.stance === g.st ? null : `Le mode attendu : ${a.type === 'commit' || a.type === 'lectureStance' ? MODE[a.stance] : '—'}.`;
      case 'mode': return a.type === 'tactics' && (a.plans[g.slot]?.mode ?? 'keep') === g.mode ? null : `Ta Secondaire ${g.slot + 1} : ${a.type === 'tactics' ? modeNom(a.plans[g.slot]) : '—'}.`;
      case 'tech': return (a.type === 'start' || a.type === 'tactics') && a.technique?.id === g.t ? null : 'Pas de cette Technique ici.';
    }
  }

  /** Ce que dit et montre le maître de table maintenant. */
  private guide(c: Controller): Guide {
    const v = c.view;
    const l = this.lecon;
    const court = texteCourt(lireLecons(stockageLecons()).profil);
    const txt = (x: readonly [string, string] | undefined) => (x ? x[court ? 1 : 0] : '');
    const tour = tourDe(l, v.turn);
    if (c.sequencing) return { dire: txt(tour?.apres) ? 'Regarde le Clash…' : 'Regarde…', faire: '', cibles: [], cle: `seq:${v.turn}` };
    if (v.phase === 'RESOLVED' || v.phase === 'ENDED') {
      const fin = leconFinie(l, c.match.state);
      return { dire: txt(tour?.apres) || (fin ? 'Bien joué.' : 'Clash résolu.'), faire: fin ? '' : 'Tour suivant.', cibles: fin ? [] : [sel.btn('act-next')], cle: `res:${v.turn}:${fin}` };
    }
    const { geste, libre } = this.gesteCourant(c);
    if (libre) return { dire: txt(tour?.dire), faire: '', cibles: [], cle: `libre:${v.turn}` };
    if (!geste) return { dire: txt(tour?.gestes?.find((x) => x.phase === v.phase)?.dire) || (c.aiThinking ? 'Je réfléchis…' : 'À moi…'), faire: '', cibles: [], cle: `att:${v.turn}:${v.phase}` };
    const s = c.match.state;
    if (geste.apresPartenaire && s.awaiting.includes('p2') && !s.pending.p2) return { dire: txt(geste.dire), faire: 'Attends que je verrouille…', cibles: [], cle: `apres:${v.turn}` };
    const { faire, cibles } = consigne(c, s, geste.attendu(s));
    return { dire: txt(geste.dire), faire, cibles, cle: `${v.turn}:${v.phase}:${faire}` };
  }

  // -------------------------------------------------------------------------
  // Affichage

  private boucle(): void {
    cancelAnimationFrame(this.raf);
    const tick = () => {
      this.raf = requestAnimationFrame(tick);
      const c = this.controleur;
      if (!c || this.fini) return;
      const g = this.guide(c);
      if (g.cle !== this.cleAffichee) { this.cleAffichee = g.cle; this.peindreCoach(g); }
      this.peindreLumiere(this.pause || this.finAffichee ? [] : g.cibles);
      if (!this.finAffichee && leconFinie(this.lecon, c.match.state) && !c.sequencing) {
        this.finAffichee = true;
        const e = marquerFaite(lireLecons(stockageLecons()), this.lecon.id);
        ecrireLecons(stockageLecons(), e);
        if (!this.faites.includes(this.lecon.id)) this.faites.push(this.lecon.id);
        window.setTimeout(() => this.panneauFin(), this.net ? 0 : 900);
      }
    };
    tick();
  }

  private peindreCoach(g: Guide): void {
    const n = this.ids.length;
    this.coach.replaceChildren(
      el('div', 'lecon-plaque', [el('b', null, PARTENAIRE), el('span', 'lecon-titre', `${n > 1 ? `Leçon ${this.i + 1} / ${n} · ` : 'Leçon · '}${this.lecon.titre}`)]),
      el('p', 'lecon-dire', g.dire),
      g.faire ? el('p', 'lecon-faire', g.faire) : el('span', null),
      bouton('Menu', 'lecon-menu', () => this.ouvrirPause(), 'ghost'),
    );
    this.coach.dataset.cle = g.cle;
  }

  private peindreLumiere(cibles: string[]): void {
    const js = JSON.stringify(cibles);
    if (this.anneaux.dataset.cibles !== js) this.anneaux.dataset.cibles = js;
    const W = window.innerWidth;
    const H = window.innerHeight;
    const rects = cibles.flatMap((s) => [...document.querySelectorAll<HTMLElement>(s)].filter((e) => e.offsetParent !== null || e.getClientRects().length).slice(0, 1))
      .map((e) => e.getBoundingClientRect()).filter((r) => r.width > 0 && r.height > 0);
    const pad = 6;
    this.eviter(rects);
    const cle = rects.map((r) => `${Math.round(r.x)},${Math.round(r.y)},${Math.round(r.width)},${Math.round(r.height)}`).join('|') + `@${W}x${H}`;
    if (this.voile.dataset.cle === cle) return;
    this.voile.dataset.cle = cle;
    this.voile.classList.toggle('on', rects.length > 0);
    this.voile.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const trous = rects.map((r) => `<rect x="${r.x - pad}" y="${r.y - pad}" width="${r.width + pad * 2}" height="${r.height + pad * 2}" rx="10" fill="black"/>`).join('');
    this.voile.innerHTML = `<defs><mask id="lecon-masque"><rect width="${W}" height="${H}" fill="white"/>${trous}</mask></defs><rect width="${W}" height="${H}" fill="rgba(4,4,10,0.55)" mask="url(#lecon-masque)"/>`;
    this.anneaux.replaceChildren(...rects.map((r) => { const a = el('div', 'lecon-anneau'); Object.assign(a.style, { left: `${r.x - pad}px`, top: `${r.y - pad}px`, width: `${r.width + pad * 2}px`, height: `${r.height + pad * 2}px` }); return a; }));
  }

  /**
   * Le maître de table ne cache jamais ce qu'il montre : si une cible passe sous son panneau (le menu tactique de la
   * Secondaire de gauche s'ouvre à gauche de sa case), le panneau passe à droite de l'écran, et revient quand la voie est libre.
   */
  private eviter(rects: DOMRect[]): void {
    const c = this.coach.getBoundingClientRect();
    if (!c.width) return;
    const W = window.innerWidth;
    const g = c.left < W / 2 ? c.left : W - c.right;
    const zone = (x0: number) => ({ l: x0 - 10, r: x0 + c.width + 10, t: c.top - 10, b: c.bottom + 10 });
    const touche = (z: { l: number; r: number; t: number; b: number }) => rects.some((r) => r.left < z.r && r.right > z.l && r.top < z.b && r.bottom > z.t);
    const aDroite = touche(zone(g)) && !touche(zone(W - g - c.width));
    if (this.coach.classList.contains('droite') !== aDroite) this.coach.classList.toggle('droite', aDroite);
  }

  // -------------------------------------------------------------------------
  // Fin d'une leçon, pause, sortie

  private panneauFin(): void {
    if (this.fini || this.pause) return;
    const c = this.controleur;
    if (c) c.garde = () => 'La leçon est finie.';
    this.session && (this.session.suspended = true);
    const suivante = this.ids[this.i + 1];
    const box = el('div', 'dialog sh-dialog lecon-fin', [
      el('div', 'lecon-plaque', [el('b', null, PARTENAIRE)]),
      el('h2', null, `Leçon réussie : ${this.lecon.titre}`),
      el('p', null, this.lecon.resume),
      el('div', 'btn-row', [
        bouton('Rejouer', 'lecon-rejouer', () => { this.fermerOverlay(); this.noir(false, () => this.demarrer(this.i)); }, 'ghost'),
        suivante ? bouton('Terminer', 'lecon-terminer', () => this.quitter(), 'ghost') : null,
        suivante ? bouton(`Leçon suivante : ${LECONS[suivante].titre}`, 'lecon-suivante', () => { this.fermerOverlay(); this.noir(false, () => this.demarrer(this.i + 1)); })
          : bouton('Terminer', 'lecon-terminer', () => this.quitter()),
      ]),
    ]);
    this.ouvrirOverlay(box, 'lecon-fin-overlay');
  }

  private ouvrirPause(): void {
    if (this.pause || this.fini) return;
    if (this.session) this.session.suspended = true;
    const box = el('div', 'dialog sh-dialog', [
      el('h2', null, `Leçon en pause : ${this.lecon.titre}`),
      el('p', null, 'Rien ne se perd à quitter : les leçons restent dans le menu « Leçons ».'),
      el('div', 'btn-row', [
        bouton('Quitter les leçons', 'lecon-quitter', () => this.quitter(), 'ghost danger'),
        bouton('Recommencer la leçon', 'lecon-recommencer', () => { this.fermerOverlay(); this.noir(false, () => this.demarrer(this.i)); }, 'ghost'),
        bouton('Reprendre', 'lecon-reprendre', () => { this.fermerOverlay(); if (this.session) this.session.suspended = false; }),
      ]),
    ]);
    this.ouvrirOverlay(box, 'lecon-pause');
  }

  private ouvrirOverlay(box: HTMLElement, cls: string): void {
    this.fermerOverlay();
    const o = el('div', `overlay sh-confirm ${cls}`, [box]);
    o.setAttribute('role', 'dialog');
    o.setAttribute('aria-modal', 'true');
    document.body.append(o);
    this.pause = o;
    (o.querySelector<HTMLElement>('.btn-row .btn:last-child'))?.focus();
  }
  private fermerOverlay(): void { this.pause?.remove(); this.pause = null; }

  private touche(e: KeyboardEvent): void {
    if (this.fini || e.key !== 'Escape') return;
    const c = this.controleur;
    if (this.pause) {
      if (this.pause.classList.contains('lecon-pause')) { e.preventDefault(); e.stopImmediatePropagation(); this.fermerOverlay(); if (this.session) this.session.suspended = false; }
      return;
    }
    if (c && (c.ui.selected || c.ui.menuSlot !== null || c.ui.targetingFor !== null || c.ui.techTargeting || c.ui.recentrageArmed)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    this.ouvrirPause();
  }

  /** Quitte la séance : sous le noir, tout se retire, puis l'hôte reprend la main. */
  quitter(): void {
    if (this.fini) return;
    this.fini = true;
    this.fermerOverlay();
    this.noir(false, () => {
      cancelAnimationFrame(this.raf);
      this.session?.dispose();
      this.session = null;
      this.hote.app.hidden = true;
      window.removeEventListener('keydown', this.onKey, true);
      this.coach.remove(); this.voile.remove(); this.anneaux.remove();
      const r = this.rideau;
      this.hote.fin([...this.faites], () => { r.style.transitionDuration = this.net ? '0ms' : '760ms'; requestAnimationFrame(() => requestAnimationFrame(() => { r.classList.remove('on'); window.setTimeout(() => r.remove(), 900); })); });
    });
  }
}

// ---------------------------------------------------------------------------
// Consigne fine et gestes permis, déduits de la commande attendue

const defDe = (s: GameState, id: string | null | undefined): string | null => (id ? s.cards[id]?.defId ?? null : null);

function cartesPermises(s: GameState, a: PlayerCommand): string[] {
  if (a.type === 'commit') return [defDe(s, a.primaryId), defDe(s, a.secondaryId)].filter((x): x is string => !!x);
  if (a.type === 'start' && a.technique && 'cardId' in a.technique) return [defDe(s, a.technique.cardId)!];
  return [];
}

const slotCle = (i: number) => (i === 0 ? 'slot0' : 'slot1') as 'slot0' | 'slot1';
const oppCle = (i: number) => (i === 0 ? 'opp0' : 'opp1') as 'opp0' | 'opp1';
function slotSecondaire(s: GameState, a: Extract<PlayerCommand, { type: 'commit' }>): SlotIndex {
  return a.slot ?? a.replaceSlot ?? (s.players.p1.slots.findIndex((x) => x === null) === 1 ? 1 : 0);
}

function casesPermises(s: GameState, a: PlayerCommand): string[] {
  switch (a.type) {
    case 'commit': return ['primary', 'hand', ...(a.secondaryId ? [slotCle(slotSecondaire(s, a))] : [])];
    case 'prepare': return a.reveal.map(slotCle);
    case 'tactics': {
      const out: string[] = [];
      a.plans.forEach((p, i) => { if (p && p.mode !== 'keep') { out.push(slotCle(i)); if (p.mode === 'interfere') out.push(oppCle(p.target!)); } });
      if (a.technique?.id === 'Ancrage') out.push(slotCle(a.technique.slot));
      if (a.technique?.id === 'Rupture') out.push(oppCle(a.technique.targetSlot));
      return out;
    }
    case 'dissipate': return a.targetSlot === null ? [] : [oppCle(a.targetSlot)];
    case 'repel': return a.targetSlot === null ? [] : [oppCle(a.targetSlot)];
    default: return [];
  }
}

function consigne(c: Controller, s: GameState, a: PlayerCommand): { faire: string; cibles: string[] } {
  const ui = c.ui;
  const main = (defId: string | null) => { const id = s.players.p1.hand.find((x) => s.cards[x]!.defId === defId); return id ? sel.main(id) : ''; };
  switch (a.type) {
    case 'commit': {
      const dr = ui.draft;
      const p = defDe(s, a.primaryId);
      if (defDe(s, dr.primaryId) !== p) {
        if (ui.selected && defDe(s, ui.selected) === p) return { faire: `Pose ${nomCarte(p)} en ${MODE[a.stance]} (bouton au-dessus de la carte), ou sur la case PRIMAIRE.`, cibles: [sel.btn(`place-${a.stance}`), sel.prim] };
        return { faire: `Choisis ${nomCarte(p)} dans ta main, ou glisse-la sur la case PRIMAIRE.`, cibles: [main(p), sel.prim] };
      }
      if (dr.stance !== a.stance) return { faire: `Choisis ${MODE[a.stance]}.`, cibles: [sel.btn(`stance-${a.stance}`)] };
      const sd = defDe(s, a.secondaryId);
      if (sd && defDe(s, dr.secondaryId) !== sd) {
        const i = slotSecondaire(s, a);
        if (ui.selected && defDe(s, ui.selected) === sd) return { faire: `Pose ${nomCarte(sd)} en SECONDAIRE (bouton au-dessus de la carte), ou sur la case SECONDAIRE ${i + 1}.`, cibles: [sel.btn('place-secondary'), sel.slot(i)] };
        return { faire: `Choisis ${nomCarte(sd)}, puis pose-la face cachée sur la case SECONDAIRE ${i + 1}.`, cibles: [main(sd), sel.slot(i)] };
      }
      if (!sd && dr.secondaryId) return { faire: 'Pas de Secondaire ce tour : clique-la pour la reprendre en main.', cibles: [sel.slot(dr.slot ?? 0)] };
      return { faire: 'Verrouille l’engagement.', cibles: [sel.btn('act-commit')] };
    }
    case 'prepare': {
      const reste = a.reveal.filter((i) => !ui.reveal.includes(i));
      if (reste.length) return { faire: `Clique ta Secondaire ${reste[0]! + 1} pour la révéler.`, cibles: [sel.slot(reste[0]!)] };
      return { faire: 'Valide.', cibles: [sel.btn('act-prepare')] };
    }
    case 'tactics': {
      for (const i of [0, 1] as const) {
        const p = a.plans[i];
        if (!p || p.mode === 'keep') continue;
        const cur = ui.plans[i];
        const ok = cur && cur.mode === p.mode && (p.mode !== 'interfere' || cur.target === p.target);
        if (ok) continue;
        if (p.mode === 'interfere' && ui.targetingFor === i) return { faire: 'Clique ma Secondaire surlignée.', cibles: [sel.opp(p.target!)] };
        if (ui.menuSlot === i) return { faire: `Choisis « ${modeNom(p)} ».`, cibles: [sel.btn(`menu-${i}-${p.mode}`)] };
        return { faire: `Clique ta Secondaire ${i + 1}.`, cibles: [sel.slot(i)] };
      }
      const tq = a.technique;
      if (tq) {
        const fait = ui.tacticsTech?.id === tq.id && ('slot' in tq ? (ui.tacticsTech as { slot?: number }).slot === tq.slot : (ui.tacticsTech as { targetSlot?: number }).targetSlot === tq.targetSlot);
        if (!fait) {
          if (ui.techTargeting === tq.id) return tq.id === 'Ancrage' ? { faire: `Désigne ta Secondaire ${tq.slot + 1}.`, cibles: [sel.slot(tq.slot)] } : { faire: 'Vise ma Secondaire active.', cibles: [sel.opp(tq.targetSlot)] };
          return { faire: `Active ${tq.id}.`, cibles: [sel.btn(`tech-me-${tq.id}`)] };
        }
      }
      return { faire: 'Verrouille tes choix.', cibles: [sel.btn('act-tactics')] };
    }
    case 'start': {
      const tq = a.technique;
      if (tq) {
        const carte = 'cardId' in tq ? defDe(s, tq.cardId) : null;
        const fait = ui.startTech?.id === tq.id && (!carte || defDe(s, (ui.startTech as { cardId?: string }).cardId) === carte);
        if (!fait) {
          if (tq.id === 'Recentrage' && ui.recentrageArmed) return { faire: `Clique ${nomCarte(carte)} dans ta main.`, cibles: [main(carte)] };
          return { faire: `Choisis ${tq.id}.`, cibles: [sel.btn(`tech-me-${tq.id}`)] };
        }
      }
      return { faire: 'Valide.', cibles: [sel.btn('act-start')] };
    }
    case 'lecture': return { faire: a.use ? 'Utilise Lecture.' : 'Passe.', cibles: [sel.btn(a.use ? 'act-lecture' : 'act-lecture-pass')] };
    case 'lectureStance':
      if ((ui.lectureStance ?? c.view.me.primary?.stance) !== a.stance) return { faire: `Choisis ${MODE[a.stance]}.`, cibles: [sel.btn(`stance-${a.stance}`)] };
      return { faire: 'Valide le mode.', cibles: [sel.btn('act-lecture-stance')] };
    case 'dissipate':
      if (a.targetSlot !== null && ui.dissipTarget !== a.targetSlot) return { faire: 'Clique ma Dissimulation.', cibles: [sel.opp(a.targetSlot)] };
      return { faire: 'Dissipe.', cibles: [sel.btn('act-dissip')] };
    case 'repel': return { faire: 'Clique ma Secondaire surlignée.', cibles: a.targetSlot === null ? [] : [sel.opp(a.targetSlot)] };
    default: return { faire: '', cibles: [] };
  }
}

// ---------------------------------------------------------------------------

function el(tag: string, cls: string | null, kids?: string | Array<Node | null> | Node): HTMLElement {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (typeof kids === 'string') e.textContent = kids;
  else if (Array.isArray(kids)) e.append(...kids.filter((k): k is Node => !!k));
  else if (kids) e.append(kids);
  return e;
}

export function bouton(label: string, key: string, onclick: () => void, cls = ''): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `btn ${cls}`.trim();
  b.dataset.key = key;
  b.textContent = label;
  b.addEventListener('click', onclick);
  return b;
}

export function ouvrirSeance(hote: HoteSeance, ids: readonly LeconId[]): Seance | null {
  return ids.length ? new Seance(hote, ids) : null;
}
