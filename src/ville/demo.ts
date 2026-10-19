/**
 * M09 V2 (provisoire) — démo jouable : le Quai devient le hub du jeu derrière `?demo=1` (le jeu par défaut ne change
 * pas). Branchement minimal sur l'enveloppe : quand le flux est à l'écran « tableau des rencontres », l'enveloppe
 * appelle `show` et la ville remplace le tableau ; toutes les transitions existantes (préparation, duel, résultat,
 * deck, options) restent celles du produit et ramènent ici. La ville ne décide d'aucune règle : elle ouvre la
 * préparation d'une rencontre déjà définie (`src/product/encounters.ts`) si `encounterStatus` l'autorise.
 *
 * Tutoriel de déplacement en bulles non bloquantes ; guide (marchande) ; défis des PNJ (ADR 023) et de Kaï ; porte de
 * la salle de jeu de cartes (Tournoi du Quai), le Fanal (Maëlle), sortie vers l'arène (Orin). Textes de prototype.
 */
import { portraitUrl } from '../art/portrait';
import { encounterById, ENCOUNTERS, personalityOf, SERIES } from '../product/encounters';
import { encounterStatus } from '../product/progression';
import { NPC_TEMPLATES } from '../presentation/npcs';
import type { Shell } from '../shell/shell';
import { parseRig } from './cameras';
import { blocked, type Zone } from './monde';
import { ILOTS, isIlotId, type IlotId } from './ilots';
import { demoObjective, doorEncounter } from './objectifs';
import { installVilleStyles, promptBubble } from './ui';
import { createTown, type Town } from './ville';

const STORE = 'lqv.demo';
/** État propre à la démo, lié au profil (date de création de la sauvegarde) : une nouvelle partie repart du début. */
interface DemoState { tuto: 'move' | 'talk' | 'done'; guide: boolean; pos?: { x: number; z: number }; ilot?: IlotId; profile?: string }
function loadState(): DemoState {
  try {
    const s = JSON.parse(localStorage.getItem(STORE) ?? 'null') as DemoState | null;
    if (s && (s.tuto === 'move' || s.tuto === 'talk' || s.tuto === 'done')) {
      const pos = s.pos && Number.isFinite(s.pos.x) && Number.isFinite(s.pos.z) ? { x: s.pos.x, z: s.pos.z } : undefined;
      return { tuto: s.tuto, guide: !!s.guide, pos, ilot: isIlotId(s.ilot) ? s.ilot : undefined, profile: typeof s.profile === 'string' ? s.profile : undefined };
    }
  } catch { /* stockage indisponible : la démo repart du début */ }
  return { tuto: 'move', guide: false };
}
function saveState(s: DemoState): void {
  try { localStorage.setItem(STORE, JSON.stringify(s)); } catch { /* sans effet */ }
}

interface Choice { label: string; key: string; primary?: boolean; run: () => void }

export class DemoHub {
  private town: Town | null = null;
  private host: HTMLElement | null = null;
  private hud: HTMLElement | null = null;
  private dialog: HTMLElement | null = null;
  private bubble: ReturnType<typeof promptBubble> | null = null;
  private raf = 0;
  private sh: Shell | null = null;
  private state = loadState();
  private returnTo: { ilot: IlotId; spawn: string } | null = null;
  private startX = 0;

  /** L'enveloppe est au hub : la ville apparaît (créée au premier passage), le HUD prend place dans l'enveloppe. */
  show(sh: Shell): HTMLElement {
    this.sh = sh;
    installVilleStyles();
    const profile = sh.save?.createdAt;
    if (this.state.profile !== profile) {
      this.state = { tuto: 'move', guide: false, profile };
      saveState(this.state);
      // Nouveau profil (autre Signature, donc autre manteau) : la ville est reconstruite.
      if (this.town) { cancelAnimationFrame(this.raf); this.town.dispose(); this.host?.remove(); this.bubble?.el.remove(); this.town = null; }
    }
    if (!this.town) {
      this.host = document.createElement('div');
      this.host.className = 'ville-host demo';
      document.body.insertBefore(this.host, document.getElementById('shell'));
      const sig = sh.save?.deck.signature ?? 'Cendre';
      this.town = createTown({
        host: this.host, artSeed: sh.params.artSeed, camera: 'frontale', player: `player-${sig}`, spawn: 'arrivee',
        freeze: sh.params.freeze, reducedMotion: sh.params.reducedMotion,
        externalSprites: sh.params.qa && new URLSearchParams(location.search).get('sprites') === 'externes',
        rig: parseRig(new URLSearchParams(location.search).get('rig')),
        onInteract: (z) => this.interact(z),
        onMenu: () => this.menu(),
      });
      // Position mémorisée (« Continuer » ramène là où l'on était, îlot compris), si elle reste praticable.
      const at = this.state.pos;
      if (at && isIlotId(this.state.ilot) && this.state.ilot !== 'quai') this.town.goTo(this.state.ilot, 'arrivee');
      if (at && !blocked(this.town.ilot, at)) this.town.place(at);
      this.startX = this.town.walker().pos.x;
      window.addEventListener('pagehide', () => { if (this.town && !this.host?.hidden) this.remember(); });

      this.bubble = promptBubble(this.town, () => { const z = this.town?.zone(); if (z) this.interact(z); }, (z) => (z.kind === 'parler' && z.target ? `Parler à ${personalityOf(z.target).name}` : z.label));
      if (sh.params.qa) (window as unknown as Record<string, unknown>).__lqvDemo = this;
      this.titleCard(sh.params.reducedMotion || sh.params.freeze);
    } else {
      this.town.setPaused(false);
      this.host!.hidden = false;
      if (this.returnTo) {
        if (this.town.ilotId() !== this.returnTo.ilot) this.town.goTo(this.returnTo.ilot, this.returnTo.spawn);
        const sp = this.town.ilot.spawns[this.returnTo.spawn];
        if (sp) this.town.place(sp, sp.face);
      }
    }
    this.returnTo = null;
    this.bubble!.el.hidden = false;
    cancelAnimationFrame(this.raf);
    const loop = () => {
      this.raf = requestAnimationFrame(loop);
      if (!this.dialog) this.bubble?.update(); else this.bubble!.el.hidden = true;
      this.tutorial();
    };
    loop();
    this.hud = this.renderHud();
    return this.hud;
  }

  /** Mémorise l'îlot et la position du joueur (reprise de la démo). */
  private remember(): void {
    if (!this.town) return;
    this.state.pos = { ...this.town.walker().pos };
    this.state.ilot = this.town.ilotId();
    saveState(this.state);
  }

  /** L'enveloppe quitte le hub (préparation, duel, deck…) : la ville se fige et disparaît, sans être détruite. */
  hide(): void {
    if (!this.town || this.host?.hidden) return;
    this.remember();
    cancelAnimationFrame(this.raf);
    this.town.setPaused(true);
    this.host!.hidden = true;
    if (this.bubble) this.bubble.el.hidden = true;
    this.closeDialog();
  }

  get townHandle(): Town | null { return this.town; }

  /** Carton d'arrivée (première entrée) : le lieu et le moment, puis il s'efface (mouvement réduit : sans fondu). */
  private titleCard(still: boolean): void {
    const card = document.createElement('div');
    card.className = 'ville-card';
    card.setAttribute('aria-hidden', 'true');
    const b = document.createElement('b');
    b.textContent = placeName(this.town!.ilot.name);
    const sub = document.createElement('span');
    sub.textContent = 'soir de tournoi';
    card.append(b, sub);
    document.body.append(card);
    if (still) { setTimeout(() => card.remove(), 1200); return; }
    requestAnimationFrame(() => card.classList.add('out'));
    setTimeout(() => card.remove(), 3200);
  }

  // --- HUD : lieu, objectif, tutoriel, menu ---

  private objective(): string {
    const sh = this.sh!;
    if (!sh.save) return '';
    return demoObjective({ progress: sh.save.progress, history: sh.save.history, guide: this.state.guide });
  }

  private renderHud(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'ville-hud';
    const place = document.createElement('div');
    place.className = 'ville-place';
    const pb = document.createElement('b');
    pb.dataset.key = 'ville-place';
    pb.textContent = placeName(this.town!.ilot.name);
    const ps = document.createElement('small');
    ps.textContent = 'la nuit · démo jouable (prototype M09)';
    place.append(pb, ps);
    const obj = document.createElement('div');
    obj.className = 'ville-objective';
    obj.dataset.key = 'ville-objective';
    obj.textContent = this.objective();
    const tools = document.createElement('div');
    tools.className = 'ville-tools';
    const b = (label: string, key: string, run: () => void) => {
      const x = document.createElement('button');
      x.type = 'button';
      x.className = 'ville-btn';
      x.dataset.key = key;
      x.textContent = label;
      x.onclick = () => { x.blur(); run(); };
      return x;
    };
    tools.append(b('Menu (Échap)', 'ville-menu', () => this.menu()), b('Deck', 'ville-deck', () => this.sh!.go({ type: 'open', screen: 'deck' })));
    const tip = document.createElement('div');
    tip.className = 'ville-tip';
    tip.dataset.key = 'ville-tip';
    tip.setAttribute('role', 'status');
    el.append(place, obj, tools, tip);
    return el;
  }

  /** Tutoriel non bloquant : se déplacer, puis parler à la guide ; disparaît une fois fait (mémorisé). */
  private tutorial(): void {
    const tip = this.hud?.querySelector<HTMLElement>('.ville-tip');
    if (!tip || !this.town) return;
    const st = this.state;
    if (st.tuto === 'move' && Math.abs(this.town.walker().pos.x - this.startX) > 2) { st.tuto = 'talk'; saveState(st); }
    if (st.tuto === 'talk' && st.guide) { st.tuto = 'done'; saveState(st); }
    const text = st.tuto === 'move'
      ? 'Déplacez-vous avec ZQSD, WASD ou les flèches, ou cliquez au sol. Maj : pas lent.'
      : st.tuto === 'talk' ? 'Approchez quelqu’un : une bulle apparaît. Appuyez sur E (ou cliquez la bulle) pour lui parler.' : '';
    if (tip.textContent !== text) tip.textContent = text;
    tip.hidden = !text;
    const pn = this.hud?.querySelector<HTMLElement>('[data-key="ville-place"]');
    const name = placeName(this.town.ilot.name);
    if (pn && pn.textContent !== name) pn.textContent = name;
    const obj = this.hud?.querySelector<HTMLElement>('.ville-objective');
    const o = this.objective();
    if (obj && obj.textContent !== o) obj.textContent = o;
    // Repères : « ? » sur la guide tant qu'elle n'a pas été écoutée, « ! » sur les défis jamais gagnés (et ouverts).
    const save = this.sh?.save;
    const marks: Record<string, '!' | '?' | null> = {};
    for (const n of ILOTS[this.town.ilotId()].npcs) {
      if (n.role === 'guide') marks[n.id] = this.state.guide ? null : '?';
      else if (n.encounter && save) {
        const enc = encounterById(n.encounter);
        const won = save.history.some((h) => h.encounterId === n.encounter && h.outcome === 'victory');
        marks[n.id] = enc && !won && encounterStatus(enc, save.progress).open ? '!' : null;
      }
    }
    this.town.setMarkers(marks);
  }

  // --- interactions ---

  private interact(z: Zone): void {
    if (this.dialog) return;
    const sh = this.sh!;
    if (z.kind === 'parler') return this.talk(z.target!);
    const p = sh.save?.progress;
    const enc = p && z.target ? doorEncounter(z.target, p) : null;
    if (enc && z.target === 'salle') {
      const step = p!.series.step;
      if (step < SERIES.steps.length) return this.offer(enc, `${SERIES.title} — manche ${step + 1} sur ${SERIES.steps.length}`, 'La salle de jeu de cartes bruisse. Le maître de table vous désigne la table d’honneur.', 'porte-salle');
      return this.offer(enc, 'Salle de jeu de cartes', 'Le Tournoi est à vous. Sélène, liseuse du Voile, accepte un duel libre.', 'porte-salle');
    }
    if (enc && z.target === 'fanal') return this.offer(enc, 'Le Fanal', 'La taverne du port est pleine. Maëlle joue à la table du fond.', 'porte-fanal');
    if (z.kind === 'sortie') {
      const exit = ILOTS[this.town!.ilotId()].exits[z.id];
      if (exit) return this.travel(exit.to, exit.spawn);
    }
    if (enc && z.target === 'arene') return this.offer(enc, 'L’arène', 'La grande scène s’illumine : Orin, l’arpenteur des Astres, y attend les duellistes qui ont remporté le Tournoi.', 'porte-arene');
    const INFO: Record<string, string> = {
      fontaine: 'On dit que son eau porte chance aux liseuses du Voile : les duellistes y jettent une carte usée avant un grand duel.',
    };
    this.say(z.label, INFO[z.id] ?? 'Rien de plus ici pour l’instant (prototype).', [{ label: 'Fermer', key: 'dlg-close', primary: true, run: () => this.closeDialog() }]);
  }

  private talk(id: string): void {
    const n = ALL_NPCS.find((x) => x.id === id)!;
    const p = personalityOf(id);
    const who = p.npc ? `${p.name}, ${NPC_TEMPLATES[p.npc].label.toLowerCase()}` : `${p.name}, ${p.title}`;
    if (n.role === 'guide') {
      const pages = [
        `Bienvenue sur le Quai ! Ici, on se défie aux cartes à chaque coin de rue, et le soir, tout le port vient voir les duels.`,
        `Approchez quelqu’un et appuyez sur E : on vous proposera un duel. Gagner ne rapporte rien contre les gens du port, mais c’est le meilleur entraînement.`,
        `Le ${SERIES.title} se joue dans la salle de jeu de cartes, la porte voûtée aux quatre bannières. Faites-vous la main avant d’y entrer !`,
        `Échap ouvre le menu : deck, collection, options, aide et sauvegarde. Bonne chance, duelliste.`,
      ];
      let i = 0;
      const next = () => {
        if (i >= pages.length) { this.state.guide = true; saveState(this.state); this.closeDialog(); return; }
        const last = i === pages.length - 1;
        this.say(who, pages[i++]!, [{ label: last ? 'Merci !' : 'Suivant', key: 'dlg-next', primary: true, run: next }], id);
      };
      next();
      return;
    }
    const enc = n.encounter!;
    const won = !!this.sh!.save?.history.some((h) => h.encounterId === enc && h.outcome === 'victory');
    const lines: Record<string, [string, string]> = {
      'pnj-docker-1': ['Hé, toi ! Une partie avant la marée ? Je te préviens, j’attaque fort.', 'Joli coup, l’ami. Une revanche quand tu veux.'],
      'pnj-commis-5': ['Pardon… vous jouez ? Mon deck est tout neuf, je ne l’ai encore jamais essayé.', 'Vous m’avez beaucoup appris. On remet ça ?'],
      braise: ['Alors c’est toi, le nouveau ? Le Quai, c’est mon terrain. Montre-moi ce que tu vaux.', 'Pas mal… Mais la prochaine fois, je ne te laisserai rien.'],
      'pnj-joueuse-5': ['Tu viens voir l’arène ? En attendant les grands duels, une partie pour se chauffer ?', 'Bien joué. Tu iras loin, peut-être jusqu’à Orin.'],
      voile: ['Je lis les mains des duellistes avant qu’ils ne jouent leurs cartes. La vôtre hésite encore…', 'Vous avez lu juste. Revenez quand l’envie vous prendra de recommencer.'],
      astre: ['Les étoiles tournent, les duellistes passent. Seuls ceux qui ont remporté le Tournoi du Quai montent sur ma scène.', 'Belle trajectoire. Revenez quand vous voudrez la refaire.'],
    };
    const [hello, after] = lines[id] ?? ['Une partie ?', 'Encore une ?'];
    this.offerEncounter(enc, who, won ? after : hello, `npc-${id}`, id, won ? 'Revanche' : 'Défier');
  }

  private offer(encId: string, title: string, text: string, back: string): void {
    this.offerEncounter(encId, title, text, back, null, 'Jouer');
  }

  private offerEncounter(encId: string, title: string, text: string, back: string, speaker: string | null, verb: string): void {
    const sh = this.sh!;
    const enc = encounterById(encId);
    const p = sh.save?.progress;
    if (!enc || !p) return;
    const st = encounterStatus(enc, p);
    if (!st.open) {
      this.say(title, `${text} ${st.reason}.`, [{ label: 'Plus tard', key: 'dlg-close', primary: true, run: () => this.closeDialog() }], speaker);
      return;
    }
    const rival = personalityOf(enc.rival);
    this.say(title, text, [
      { label: `${verb} — ${rival.name}`, key: 'dlg-duel', primary: true, run: () => { this.closeDialog(); this.returnTo = { ilot: this.town!.ilotId(), spawn: back }; sh.go({ type: 'prep', encounterId: enc.id }); } },
      { label: 'Plus tard', key: 'dlg-close', run: () => this.closeDialog() },
    ], speaker ?? enc.rival);
  }

  /** Passage vers l'îlot voisin : fondu au noir court, changement d'îlot, fondu retour (mouvement réduit : direct). */
  private travel(to: IlotId, spawn: string): void {
    const town = this.town!;
    town.setInputLocked(true);
    const veil = document.createElement('div');
    veil.className = 'ville-fade';
    document.body.append(veil);
    const still = this.sh!.params.reducedMotion || this.sh!.params.freeze;
    const swap = () => {
      town.goTo(to, spawn);
      this.remember();
      town.setInputLocked(false);
      if (still) { veil.remove(); return; }
      veil.classList.add('out');
      setTimeout(() => veil.remove(), 420);
    };
    if (still) swap(); else { requestAnimationFrame(() => veil.classList.add('in')); setTimeout(swap, 300); }
  }

  /** Boîte de dialogue (bas de l'écran) : portrait V2 du personnage, texte, choix au clavier et à la souris. */
  private say(title: string, text: string, choices: Choice[], speaker?: string | null): void {
    this.closeDialog();
    this.town?.setInputLocked(true);
    const box = document.createElement('div');
    box.className = 'ville-dialog';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', title);
    if (speaker) {
      const img = document.createElement('img');
      img.className = 'ville-portrait';
      img.alt = '';
      img.src = portraitUrl(personalityOf(speaker), this.sh!.params.artSeed);
      box.append(img);
    }
    const body = document.createElement('div');
    body.className = 'ville-dialog-body';
    const h = document.createElement('b');
    h.textContent = title;
    const p = document.createElement('p');
    p.textContent = text;
    const row = document.createElement('div');
    row.className = 'ville-choices';
    for (const c of choices) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `ville-btn${c.primary ? ' primary' : ''}`;
      b.dataset.key = c.key;
      b.textContent = c.label;
      b.onclick = () => c.run();
      row.append(b);
    }
    body.append(h, p, row);
    box.append(body);
    box.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); this.closeDialog(); } });
    document.body.append(box);
    this.dialog = box;
    row.querySelector<HTMLButtonElement>('.primary')?.focus({ preventScroll: true });
  }

  private closeDialog(): void {
    this.dialog?.remove();
    this.dialog = null;
    this.town?.setInputLocked(false);
  }

  private menu(): void {
    if (this.dialog) { this.closeDialog(); return; }
    const sh = this.sh!;
    this.say('Menu', 'Le Quai attend. Vos duels et votre deck sont sauvegardés automatiquement.', [
      { label: 'Reprendre', key: 'dlg-close', primary: true, run: () => this.closeDialog() },
      { label: 'Toutes les rencontres', key: 'menu-board', run: () => { this.closeDialog(); sh.hubBoard = true; sh.render(); } },
      { label: 'Deck', key: 'menu-deck', run: () => { this.closeDialog(); sh.go({ type: 'open', screen: 'deck' }); } },
      { label: 'Collection', key: 'menu-collection', run: () => { this.closeDialog(); sh.go({ type: 'open', screen: 'collection' }); } },
      { label: 'Options', key: 'menu-options', run: () => { this.closeDialog(); sh.go({ type: 'open', screen: 'options' }); } },
      { label: 'Aide', key: 'menu-help', run: () => { this.closeDialog(); sh.go({ type: 'open', screen: 'help' }); } },
      { label: 'Accueil', key: 'menu-home', run: () => { this.closeDialog(); sh.go({ type: 'home' }); } },
    ]);
  }
}

const ALL_NPCS = Object.values(ILOTS).flatMap((d) => d.npcs);
/** « le Quai » → « Le Quai » (nom d'îlot en titre). */
const placeName = (n: string) => n.charAt(0).toUpperCase() + n.slice(1);

/** Rencontres atteignables depuis le Quai (QA : chaque rencontre de la démo existe dans le produit). */
export const DEMO_ENCOUNTERS = [...new Set([...ALL_NPCS.map((n) => n.encounter).filter((e): e is string => !!e), ...SERIES.steps.map((_, i) => `quai-${i + 1}`), 'libre-voile', 'libre-ronce', 'libre-astre'])]
  .filter((id) => ENCOUNTERS.some((e) => e.id === id));
