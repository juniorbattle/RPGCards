/**
 * M10-B (PROVISOIRE, `?aventure=1`) — prototype jouable du prologue du mode Aventure : écran « Nouvelle aventure », la
 * ville (le Quai, le Parvis, les Ruelles : îlots M09 réutilisés tels quels), Kaï et le duel public, la foule, les quatre
 * émissaires, le choix libre (Accepter, Différer, Chercher une autre voie), la confirmation, les quatre Basics, le premier
 * défi de lieutenant (et la suite des défis structurants, M10-C en avance). Chargé à la demande : rien dans le jeu par
 * défaut, qui reste identique au pixel près. La logique est dans les modules purs de `src/aventure/` ; ce module affiche
 * et relie : ville (`createTown`), duel (`DuelSession`, inchangée), cartes (`cardEl`), arène (`ensureArena`).
 *
 * Depuis l'avenant M10-A (ARB-M10-02, ADR 033), chaque duel se joue avec le deck d'aventure du joueur tel qu'il est
 * (règle R-AV : cartes grises, Basics, variantes, Signature éventuelle).
 */
import '../shell/shell.css';
import type { AppParams } from '../app/params';
import { DuelSession } from '../app/duelSession';
import type { Controller } from '../app/controller';
import { portraitUrl } from '../art/portrait';
import { emblemSvg } from '../art/emblems';
import { CATALOG, cardTitle, EFFECTS, FAMILIES, type Family } from '../game/catalog/cards';
import { TECHNIQUES, type TechniqueId } from '../game/catalog/techniques';
import { viewFor } from '../game/visibility/view';
import { cardEl } from '../presentation/cardView';
import type { RivalPersonality } from '../presentation/personalities';
import type { VenueId } from '../presentation/venues';
import { duelSeed, SaveStore } from '../product/save';
import { webglAvailable, type ArenaHandle } from '../scene/arena';
import { confirmDialog, h } from '../shell/ui';
import { parseRig } from '../ville/cameras';
import { decorPolicy, preloadDecors } from '../ville/decors';
import { ILOTS, type IlotId } from '../ville/ilots';
import { blocked, type Zone } from '../ville/monde';
import { spritePolicy } from '../ville/spritesExternes';
import { installVilleStyles, promptBubble } from '../ville/ui';
import { createTown, type Town } from '../ville/ville';
import { appliquer, chapitre, peutChanger, peutConfirmer, peutEngager, statutDefi, type Evenement, type FaitsPublics, type Issue } from './aventure';
import { equiperSignature, equiperVersion, validerDeckAv, type DeckAv } from './deck';
import { battre, conclure, decider, poses, rencontreDef, type Pose } from './directeur';
import { faitsPublics } from './faits';
import { ilotAventure } from './ilots';
import { aF, deF, emissaire, figure, figureDe, leF, REPLIQUES, TENANTE, isNeutre, KAI_PROLOGUE, MAISONS, NEUTRES, rangNeutre, ROLE_LABEL, ROLES, ROMAIN } from './modele';
import { objectif, quetes } from './quetes';
import { collectionDe, type Gain } from './registre';
import { duelChampionnat, duelEpreuve, duelFacultatif, duelFigure, duelJoute, duelPrologue, personnalite, type DuelPrevu } from './rencontres';
import { CONTRAINTE_JOUTE, manche, ouvertChampionnat, statutEpreuve, statutFinale, statutJoute, statutPoule, varianteDe } from './competitions';
import { CATALOG_AVENTURE, MagasinAventure, nouvelleSauvegarde, verifierDuel, type AventureSave, type DuelAventure } from './sauvegarde';
import { installAventureStyles } from './styles';
import { pvJoueur } from './paliers';

export interface DepsAventure {
  app: HTMLElement;
  shellHost: HTMLElement;
  params: AppParams;
  ensureArena(p: RivalPersonality, venue?: VenueId): ArenaHandle | null;
  arena(): ArenaHandle | null;
}

interface Choix { label: string; key: string; primary?: boolean; run: () => void }

const FOULE = [
  { id: 'foule-1', apparence: 'pnj-docker-12', nom: 'un docker', at: { x: 10.6, z: 1.8 }, facing: 'droite' as const, ligne: 'Tu as vu ça ? Avec des cartes grises ! Les familles ne vont pas te lâcher.' },
  { id: 'foule-2', apparence: 'pnj-marchande-14', nom: 'une marchande', at: { x: 16.4, z: 1.6 }, facing: 'gauche' as const, ligne: 'Les gens de la Cendre aiment ceux qui frappent fort ; ceux de la Ronce, ceux qui tiennent. Le Voile regarde les yeux, l’Astre regarde tout.' },
  { id: 'foule-3', apparence: 'pnj-commis-8', nom: 'un commis', at: { x: 12.2, z: -1.4 }, facing: 'face' as const, ligne: 'Ne choisis pas trop vite. Une famille, c’est pour longtemps… même si on dit que l’Astre aime ceux qui touchent à tout.' },
  { id: 'foule-4', apparence: 'pnj-joueuse-16', nom: 'une joueuse', at: { x: 15.2, z: -1.2 }, facing: 'face' as const, ligne: 'Au tournoi de la salle, ils n’ont pas joué la moitié de ce qu’on vient de voir ici.' },
];

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const de = deF;
const la = leF;

export function startAventure(d: DepsAventure): AventureApp {
  const a = new AventureApp(d);
  if (d.params.qa) (window as unknown as Record<string, unknown>).__lqvAventure = a;
  return a;
}

export class AventureApp {
  readonly store = new MagasinAventure(SaveStore.browser());
  charge = this.store.charger();
  save: AventureSave | null = this.charge.status === 'ok' ? this.charge.save : null;
  town: Town | null = null;
  private host: HTMLElement | null = null;
  private bubble: ReturnType<typeof promptBubble> | null = null;
  private raf = 0;
  private dialog: HTMLElement | null = null;
  private modal: HTMLElement | null = null;
  private hud: HTMLElement | null = null;
  private look = '';
  private live: { session: DuelSession; duel: DuelAventure; prevu: DuelPrevu } | null = null;
  /** Écran courant (QA, aide au rendu). */
  ecran: 'titre' | 'nouveau' | 'ville' | 'preparation' | 'duel' | 'resultat' = 'titre';
  private posesAffichees = '';
  private dernierResultat: { prevu: DuelPrevu; issue: Issue; gains: Gain[]; turns: number; faits: FaitsPublics; pv: [number, number] } | null = null;

  constructor(readonly d: DepsAventure) {
    installVilleStyles();
    installAventureStyles();
    document.title = 'Les Quatre Voies — Aventure (prototype)';
    window.addEventListener('pagehide', () => this.memoriser());
    void preloadDecors(['quai'], decorPolicy(d.params.qa, new URLSearchParams(location.search).get('decors')));
    this.titre();
  }

  get params(): AppParams { return this.d.params; }
  get etat() { return this.save!.etat; }

  // ------------------------------------------------------------------ sauvegarde

  persist(): void {
    if (!this.save) return;
    const w = this.store.ecrire(this.save);
    if (!w.ok) this.toast(`Aventure non sauvegardée : ${w.raison}`);
  }

  /** Applique un fait de l'aventure ; un refus est affiché (jamais un clic sans effet). */
  private faire(ev: Evenement): Gain[] | null {
    const r = appliquer(this.etat, ev, new Date().toISOString());
    if (r.refus) { this.toast(r.refus); return null; }
    this.save!.etat = r.etat;
    this.persist();
    return r.gains;
  }

  private memoriser(): void {
    if (!this.save || !this.town || this.ecran !== 'ville') return;
    this.save.ville = { ilot: this.town.ilotId(), pos: { ...this.town.walker().pos } };
    this.persist();
  }

  // ------------------------------------------------------------------ écrans de l'enveloppe

  private backdrop(): void {
    const kai = personnalite(KAI_PROLOGUE.apparence, { nom: KAI_PROLOGUE.nom, titre: KAI_PROLOGUE.titre });
    const arena = this.d.ensureArena(kai, 'rue');
    arena?.setStaging('title');
    arena?.setView('A');
    arena?.setPaused(true);
    this.d.app.hidden = true;
  }

  private ecranShell(cls: string, ...content: HTMLElement[]): void {
    const host = this.d.shellHost;
    host.hidden = false;
    host.className = `shell ${cls}`;
    host.replaceChildren(...content);
    host.querySelector<HTMLElement>('[data-shell-primary]')?.focus({ preventScroll: true });
  }

  titre(): void {
    this.cacherVille();
    this.ecran = 'titre';
    this.backdrop();
    const s = this.save;
    const items: HTMLElement[] = [];
    if (s) {
      const col = collectionDe(s.etat.registre);
      const sous = s.duel ? 'Reprendre le duel en cours' : objectif(s.etat);
      items.push(bouton('Continuer l’aventure', () => this.continuer(), 'av-continue', true, sous));
      items.push(h('p', { class: 'av-profil' }, h('b', null, s.profil.nom), ` · ${capital(chapitre(s.etat))} · ${s.etat.affiliation ? `voie ${de(s.etat.affiliation)}` : 'sans famille'} · ${col.basics.length * 4} cartes familiales, ${col.variantes.length} variante(s), ${col.signatures.length} Signature(s)`));
    }
    items.push(bouton('Nouvelle aventure', () => void this.nouveau(), 'av-new', !s, 'Seize cartes grises, aucune famille : tout commence sur le Quai'));
    if (this.charge.status === 'illisible') items.push(h('p', { class: 'warn' }, `${this.charge.raison} « Nouvelle aventure » la mettra à l’écart (sans l’effacer).`));
    if (this.charge.status === 'future') items.push(h('p', { class: 'warn' }, this.charge.raison));
    if (this.charge.status === 'indisponible') items.push(h('p', { class: 'warn' }, 'Stockage local indisponible : l’aventure ne pourra pas être conservée.'));
    items.push(h('a', { class: 'av-link', href: location.pathname, 'data-key': 'av-standard' }, 'Jeu standard (duels, Tournoi du Quai) — sans le paramètre'));
    this.ecranShell('scr-home av-scr',
      h('section', { class: 'av-titre', 'data-screen': 'av-titre', 'aria-labelledby': 'av-t' },
        h('div', { class: 'av-emblems', 'aria-hidden': 'true', html: FAMILIES.map((f) => `<span class="fam-${f}">${emblemSvg(f, 30)}</span>`).join('') }),
        h('h1', { id: 'av-t', class: 'av-h1' }, 'Les Quatre Voies'),
        h('p', { class: 'av-sous' }, 'Aventure — prologue jouable'),
        h('p', { class: 'av-proto' }, 'Prototype M10 : règles de l’avenant M10-A (décisions du responsable du 2026-10-20) ; textes et apparences provisoires.'),
        h('div', { class: 'av-items' }, ...items)));
  }

  private async nouveau(): Promise<void> {
    if (this.save) {
      const r = await confirmDialog({ title: 'Nouvelle aventure ?', text: 'L’aventure en cours sera remplacée (le jeu standard n’est pas touché).', confirm: 'Recommencer', danger: true });
      if (r !== 'confirm') return;
    }
    this.ecran = 'nouveau';
    const input = h('input', { class: 'av-input', type: 'text', maxlength: '24', value: 'Duelliste', 'data-key': 'av-name', 'aria-label': 'Nom du duelliste' }) as HTMLInputElement;
    const go = () => this.commencer(input.value.trim() || 'Duelliste');
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    this.ecranShell('scr-home av-scr',
      h('section', { class: 'av-titre', 'data-screen': 'av-nouveau' },
        h('h1', { class: 'av-h1' }, 'De la populace'),
        h('p', { class: 'av-sous' }, 'Vous n’avez ni famille ni Signature : seize cartes grises, quatre de chaque Rang, sans effet ni bonus. Le soir du tournoi, le Quai est plein.'),
        h('div', { class: 'av-cards' }, ...[1, 2, 3, 4].map((r) => neutreEl(`neutre-${r}`, '×4'))),
        h('label', { class: 'av-label' }, 'Votre nom ', input),
        h('div', { class: 'av-items' }, bouton('Commencer', go, 'av-start', true), bouton('Retour', () => this.titre(), 'av-back'))));
    input.focus();
    input.select();
  }

  private commencer(nom: string): void {
    const forced = this.params.qa ? Number(new URLSearchParams(location.search).get('profileSeed')) : NaN;
    const graine = Number.isInteger(forced) && forced > 0 ? forced >>> 0 : (crypto.getRandomValues(new Uint32Array(1))[0] ?? Date.now()) >>> 0;
    if (this.charge.status === 'illisible') this.store.ecarter();
    this.save = nouvelleSauvegarde(new Date(), nom, graine);
    this.charge = { status: 'ok', save: this.save };
    this.save.etat = appliquer(this.save.etat, { type: 'scene', id: 'P1' }, new Date().toISOString()).etat;
    this.persist();
    this.detruireVille();
    this.entrerVille(true);
  }

  private continuer(): void {
    const s = this.save;
    if (!s) return;
    if (s.duel) { this.reprendreDuel(s.duel); return; }
    this.entrerVille(false);
  }

  // ------------------------------------------------------------------ la ville

  private lookJoueur(): string {
    return this.etat.affiliation ? `player-${this.etat.affiliation}` : 'player-gris';
  }

  private posesDe(id: IlotId): Pose[] {
    let out = poses(this.save!.directeur, this.etat, id);
    // P5 : le premier émissaire « fend la foule » sur le Quai ; il rejoint sa maison après la scène du choix (P6).
    const e = this.etat;
    if (e.premier && e.affiliation === null && !e.scenes.includes('P6')) {
      const em = emissaire(e.premier);
      if (id === 'quai') {
        out = out.filter((p) => p.apparence !== em.apparence);
        out.push({ id: `emissaire-${e.premier}`, apparence: em.apparence, nom: em.nom, at: { x: 13.6, z: 0.9 }, facing: 'gauche', repere: '!', genre: 'structurante' });
      } else if (id === em.ilot) out = out.filter((p) => p.apparence !== em.apparence);
    }
    // La foule du prologue (P4, P5) : passants arrêtés autour du lieu du duel, jusqu'au choix de la voie.
    if (id === 'quai' && this.etat.prologue !== null && this.etat.affiliation === null) {
      for (const f of FOULE) if (!out.some((p) => p.apparence === f.apparence)) out.push({ id: f.id, apparence: f.apparence, nom: f.nom, at: f.at, facing: f.facing, repere: null, genre: 'ambiance' });
    }
    return out;
  }

  /** Point de décision du directeur des rencontres (entrée dans un îlot, retour d'un duel). */
  private decider(id: IlotId): void {
    const r = decider(this.save!.directeur, this.etat, id);
    this.save!.directeur = r.directeur;
    this.persist();
  }

  private creerVille(): void {
    const q = new URLSearchParams(location.search);
    this.host = document.createElement('div');
    this.host.className = 'ville-host demo';
    document.body.insertBefore(this.host, this.d.shellHost);
    this.look = this.lookJoueur();
    const at = this.save!.ville.ilot;
    this.decider(at);
    if (!webglAvailable()) {
      this.host.remove();
      this.host = null;
      throw new Error('WebGL indisponible');
    }
    this.town = createTown({
      host: this.host, artSeed: this.params.artSeed, camera: 'frontale', player: this.look, ilot: at, spawn: 'arrivee',
      freeze: this.params.freeze, reducedMotion: this.params.reducedMotion,
      sprites: spritePolicy(this.params.qa, q.get('sprites')), decors: decorPolicy(this.params.qa, q.get('decors')), rig: parseRig(q.get('rig')),
      ilotDefOf: (id) => ilotAventure(id, this.posesDe(id)),
      onInteract: (z) => this.interagir(z),
      onMenu: () => this.menu(),
    });
    this.posesAffichees = this.cle(at);
    const pos = this.save!.ville.pos;
    if (pos && !blocked(this.town.ilot, pos)) this.town.place(pos);
    this.bubble = promptBubble(this.town, () => { const z = this.town?.zone(); if (z) this.interagir(z); }, (z) => z.label);
  }

  private detruireVille(): void {
    cancelAnimationFrame(this.raf);
    this.town?.dispose();
    this.host?.remove();
    this.bubble?.el.remove();
    this.town = null;
    this.host = null;
    this.bubble = null;
  }

  private cacherVille(): void {
    this.fermerDialogue();
    this.fermerModal();
    if (!this.town || this.host?.hidden) return;
    this.memoriser();
    cancelAnimationFrame(this.raf);
    this.town.setPaused(true);
    this.host!.hidden = true;
    if (this.bubble) this.bubble.el.hidden = true;
  }

  /** Entrée (ou retour) dans la ville ; `spawn` : point d'apparition (devant un personnage) au retour d'un duel. */
  entrerVille(arrivee: boolean, spawn?: string): void {
    this.ecran = 'ville';
    this.d.app.hidden = true;
    this.d.arena()?.setPaused(true);
    if (this.town && this.look !== this.lookJoueur()) this.detruireVille();
    if (!this.town) {
      try { this.creerVille(); } catch (err) {
        // Sans WebGL (navigateur ou poste qui le refuse), pas de ville : le prototype le dit au lieu de rester bloqué.
        console.warn('Ville indisponible', err);
        this.titre();
        this.toast('Le prototype du mode Aventure demande WebGL (la ville ne peut pas s’afficher sur ce poste).');
        return;
      }
    }
    else {
      this.decider(this.town.ilotId());
      this.town.setPaused(false);
      this.host!.hidden = false;
      this.rafraichir(spawn);
    }
    if (spawn && this.town) { const sp = this.town.ilot.spawns[spawn]; if (sp) this.town.place(sp, sp.face); }
    this.hud = this.renderHud();
    this.ecranShell('scr-ville av-ville', this.hud);
    this.bubble!.el.hidden = false;
    cancelAnimationFrame(this.raf);
    const loop = () => {
      this.raf = requestAnimationFrame(loop);
      if (!this.dialog && !this.modal) this.bubble?.update(); else this.bubble!.el.hidden = true;
      this.majHud();
    };
    loop();
    if (arrivee) this.carton('Le Quai', 'soir de tournoi');
  }

  private cle(id: IlotId): string {
    return JSON.stringify(this.posesDe(id).map((p) => [p.id, p.at.x, p.at.z]));
  }

  /** Les personnages de l'îlot ont changé (progression) : l'îlot est remonté, le joueur reste où il est. */
  private rafraichir(spawn?: string): void {
    const t = this.town;
    if (!t) return;
    const id = t.ilotId();
    const k = this.cle(id);
    if (k !== this.posesAffichees) {
      const pos = { ...t.walker().pos };
      t.goTo(id, 'arrivee');
      if (!spawn && !blocked(t.ilot, pos)) t.place(pos);
      this.posesAffichees = k;
    }
    this.marquer();
  }

  private marquer(): void {
    if (!this.town) return;
    const m: Record<string, '!' | '?' | null> = {};
    for (const p of this.posesDe(this.town.ilotId())) m[p.apparence] = p.repere;
    this.town.setMarkers(m);
  }

  private renderHud(): HTMLElement {
    const t = this.town!;
    const b = (label: string, key: string, run: () => void) => h('button', { class: 'ville-btn', type: 'button', 'data-key': key, onclick: (e: Event) => { (e.currentTarget as HTMLElement).blur(); run(); } }, label);
    return h('div', { class: 'ville-hud' },
      h('div', { class: 'ville-place' }, h('b', { 'data-key': 'ville-place' }, capital(t.ilot.name)), h('small', null, 'la nuit · aventure (prototype M10)')),
      h('div', { class: 'ville-objective', 'data-key': 'ville-objective' }, objectif(this.etat)),
      h('div', { class: 'ville-tools' }, b('Menu (Échap)', 'av-menu', () => this.menu()), b('Deck', 'av-deck', () => this.collection()), b('Journal', 'av-journal', () => this.journal())),
      h('div', { class: 'av-statut', 'data-key': 'av-statut' }),
      h('div', { class: 'av-qa-decor', 'data-key': 'av-qa-decor', hidden: true }));
  }

  private majHud(): void {
    const o = this.hud?.querySelector<HTMLElement>('[data-key="ville-objective"]');
    const txt = objectif(this.etat);
    if (o && o.textContent !== txt) o.textContent = txt;
    const pl = this.hud?.querySelector<HTMLElement>('[data-key="ville-place"]');
    const n = capital(this.town?.ilot.name ?? '');
    if (pl && pl.textContent !== n) pl.textContent = n;
    // QA (`?qa=1`) : un décor ou des personnages en images non approuvées sont signalés à l'image (ADR 027, 028).
    const qa = this.hud?.querySelector<HTMLElement>('[data-key="av-qa-decor"]');
    if (qa && this.town && this.params.qa) {
      const dr = this.town.decorReport();
      const sr = this.town.externalReport();
      const txt = dr.world === 'diorama' && dr.unapproved.length ? `QA : décor en images NON APPROUVÉES (${dr.unapproved.length} plans) — hors QA, décor par code` : '';
      const txt2 = sr.unapproved?.length ? ` · personnages : feuilles non approuvées (${sr.unapproved.length})` : '';
      const all = txt ? txt + txt2 : txt2 ? `QA : ${txt2.slice(3)}` : '';
      if (qa.textContent !== all) { qa.textContent = all; qa.hidden = !all; }
    }
    const st = this.hud?.querySelector<HTMLElement>('[data-key="av-statut"]');
    const e = this.etat;
    const s = e.affiliation ? `Voie ${de(e.affiliation)}` : 'Sans famille';
    if (st && st.textContent !== s) { st.textContent = s; st.className = `av-statut${e.affiliation ? ` fam-${e.affiliation}` : ''}`; }
  }

  private carton(lieu: string, moment: string): void {
    const card = h('div', { class: 'ville-card', 'aria-hidden': 'true' }, h('b', null, lieu), h('span', null, moment));
    document.body.append(card);
    if (this.params.reducedMotion || this.params.freeze) { setTimeout(() => card.remove(), 1200); return; }
    requestAnimationFrame(() => card.classList.add('out'));
    setTimeout(() => card.remove(), 3200);
  }

  private voyager(to: IlotId, spawn: string): void {
    const town = this.town!;
    town.setInputLocked(true);
    const veil = h('div', { class: 'ville-fade' });
    document.body.append(veil);
    const still = this.params.reducedMotion || this.params.freeze;
    const swap = () => {
      this.decider(to);
      town.goTo(to, spawn);
      this.posesAffichees = this.cle(to);
      this.marquer();
      this.save!.ville = { ilot: to, pos: { ...town.walker().pos } };
      this.faire({ type: 'visite', lieu: to });
      town.setInputLocked(false);
      if (still) { veil.remove(); return; }
      veil.classList.add('out');
      setTimeout(() => veil.remove(), 420);
    };
    if (still) { swap(); return; }
    requestAnimationFrame(() => veil.classList.add('in'));
    setTimeout(swap, 300);
  }

  // ------------------------------------------------------------------ interactions

  interagir(z: Zone): void {
    if (this.dialog || this.modal) return;
    if (z.kind === 'parler' && z.target) return this.parler(z.target);
    if (z.kind === 'sortie') {
      const exit = ILOTS[this.town!.ilotId()].exits[z.id];
      if (exit) return this.voyager(exit.to, exit.spawn);
    }
    if (z.kind === 'porte' && z.target === 'salle') return this.salleDesBannieres();
    if (z.kind === 'porte' && z.target === 'fanal') return this.dire('Le Fanal', `La taverne du port, maison de la Ronce. ${this.etat.affiliation ? 'Gaspard, Maëlle et Mère Aubépine y tiennent la maison.' : 'On dit que la Ronce y garde le feu du port.'}`, [fermer(this)]);
    if (z.kind === 'porte' && z.target === 'arene') return this.championnatDialog();
    const INFO: Record<string, string> = { fontaine: 'La fontaine du Voile : les duellistes y jettent une carte usée avant un grand duel. Lior, l’émissaire du Voile, n’est jamais loin.' };
    this.dire(z.label, INFO[z.id] ?? 'Rien de plus ici pour l’instant (prototype).', [fermer(this)]);
  }

  parler(id: string): void {
    const foule = FOULE.find((f) => f.id === id);
    if (foule) return this.dire(capital(foule.nom), foule.ligne, [fermer(this)], foule.apparence);
    this.faire({ type: 'rencontre', personne: id });
    if (id === KAI_PROLOGUE.id) return this.kaiPrologue();
    if (id.startsWith('emissaire-')) return this.emissaireDialog(id.slice(10) as Family);
    if (/^(cadet|brasDroit|chef)-/.test(id)) return this.figureDialog(id);
    if (id.startsWith('epreuve-')) return this.epreuveDialog(id.slice(8) as Family);
    if (id.startsWith('joute-')) return this.jouteDialog(id.slice(6) as Family);
    const r = rencontreDef(id);
    if (r) return this.facultatif(id);
  }

  private kaiPrologue(): void {
    const p = personnalite(KAI_PROLOGUE.apparence, { nom: KAI_PROLOGUE.nom, titre: KAI_PROLOGUE.titre });
    const deja = this.etat.scenes.includes('P2');
    this.faire({ type: 'scene', id: 'P2' });
    this.dire(`${p.name}, ${p.title}`, deja
      ? 'Alors, tu te décides ? La foule commence à regarder.'
      : 'Toi aussi, ils t’ont fermé la porte du tournoi ? Cartes grises, pas de famille… Alors jouons ici, sur le Quai. Qu’ils voient ce qu’ils ratent.', [
      { label: 'Relever le défi', key: 'dlg-duel', primary: true, run: () => this.preparer(duelPrologue(this.prochaineGraine(), this.etat)) },
      { label: 'Pas maintenant', key: 'dlg-close', run: () => this.fermerDialogue() },
    ], KAI_PROLOGUE.apparence);
  }

  /** P5–P6 : l'émissaire présente sa famille ; Accepter (→ confirmation), Différer, Chercher une autre voie. */
  private emissaireDialog(f: Family): void {
    const fig = emissaire(f);
    const m = MAISONS[f];
    const premier = this.etat.premier === f && !this.etat.scenes.includes('P6');
    const autres = FAMILIES.filter((x) => x !== f).map((x) => `${emissaire(x).nom} ${de(x)}`).join(', ');
    const texte = premier
      ? `${fig.nom} fend la foule : « ${m.offre} » Puis, plus bas : « Je ne suis pas ${fig.gender === 'f' ? 'la seule' : 'le seul'} à avoir vu ton jeu. ${autres} l’ont remarqué aussi. Le choix est à toi. »`
      : `« ${m.offre} » ${m.devise}`;
    this.dire(`${fig.nom}, ${fig.titre}`, texte, [
      { label: `Accepter ${la(f)}…`, key: 'dlg-accepter', primary: true, run: () => this.confirmation(f) },
      { label: 'Différer', key: 'dlg-differer', run: () => { this.faire({ type: 'scene', id: 'P6' }); this.dire(fig.nom, `« Prends ton temps. Tu me trouveras ${lieuDe(f)}. L’invitation tient. »`, [fermer(this)], fig.apparence); } },
      { label: 'Chercher une autre voie', key: 'dlg-chercher', run: () => { this.faire({ type: 'scene', id: 'P6' }); this.dire('Les autres voies', `« Va les voir, c’est ton droit. » ${FAMILIES.filter((x) => x !== f).map((x) => `${emissaire(x).nom} (${x}) vous attend ${lieuDe(x)}`).join(' ; ')}. L’invitation ${de(f)} reste valable.`, [fermer(this)], fig.apparence); } },
    ], fig.apparence);
  }

  /** Écran de confirmation (ADR 029 §3) : identité, philosophie, gains immédiats, suite, ce qui ne change pas. */
  private confirmation(f: Family, changement = false): void {
    this.fermerDialogue();
    const m = MAISONS[f];
    const [c, b, ch] = ROLES.map((r) => figureDe(f, r));
    const panel = h('div', { class: `av-confirm fam-${f}`, 'data-key': 'av-confirmation' },
      h('div', { class: 'av-confirm-head' }, h('span', { class: `av-emb fam-${f}`, html: emblemSvg(f, 46) }), h('div', null, h('h2', null, `Rejoindre ${la(f)}`), h('p', { class: 'av-devise' }, `${m.nom} · ${m.devise}`))),
      h('p', null, m.credo),
      h('h3', null, 'Vous recevrez tout de suite'),
      h('div', { class: 'av-cards' }, ...[1, 2, 3, 4].map((r) => cardEl(`${f}-${r}-basic`, { artSeed: this.params.artSeed, tag: 'div' }))),
      h('p', null, `Les quatre cartes de base ${de(f)} (I à IV) : une carte grise de chaque Rang leur cède sa place dans votre deck. Et la Technique ${m.technique} (${TECHNIQUES[m.technique].text})`),
      h('h3', null, 'Ensuite'),
      h('p', null, `Défier ${c!.nom} (${ROLE_LABEL.cadet}), puis ${b!.nom} (${ROLE_LABEL.brasDroit}), puis ${ch!.nom} (${ROLE_LABEL.chef}) : chaque lieutenant vaincu donne une variante, le chef donne sa Signature ∞.`),
      h('h3', null, 'Ce qui ne change pas'),
      h('p', null, `Les autres familles restent ouvertes ; quand le chef ${de(f)} sera vaincu, vous pourrez engager leur défi à la Salle des Bannières. ${changement ? 'Les cartes déjà reçues restent à vous.' : 'Jusqu’à votre premier défi de lieutenant, vous pourrez encore changer de voie.'}`),
      h('div', { class: 'ville-choices' },
        h('button', { class: 'ville-btn primary', type: 'button', 'data-key': 'av-confirmer', onclick: () => this.confirmer(f, changement) }, 'Confirmer l’affiliation'),
        h('button', { class: 'ville-btn', type: 'button', 'data-key': 'av-revenir', onclick: () => this.fermerModal() }, 'Revenir')));
    this.ouvrirModal(panel);
  }

  private confirmer(f: Family, changement: boolean): void {
    const gains = this.faire(changement ? { type: 'changer', famille: f } : { type: 'confirmer', famille: f });
    this.fermerModal();
    if (!gains) return;
    this.recompense(`Bienvenue ${f === 'Voile' || f === 'Astre' ? aF(f) : `dans ${leF(f)}`}`, gains, () => {
      // Le duelliste porte désormais les couleurs de sa famille : la ville est reconstruite.
      this.memoriser();
      this.entrerVille(false);
      this.faire({ type: 'scene', id: 'P8' });
      const c = figureDe(f, 'cadet');
      this.dire(`${c.nom}, ${c.titre}`, `« Te voilà des nôtres. Maintenant, montre-moi ce que valent tes nouvelles cartes : je mets en jeu ${nomCarte(c.enjeu.kind === 'variante' ? c.enjeu.defId : '')}. »`, [
        { label: `Défier ${c.nom}`, key: 'dlg-duel', primary: true, run: () => this.lancerFigure(c.id) },
        { label: 'Plus tard', key: 'dlg-close', run: () => this.fermerDialogue() },
      ], c.apparence);
    });
  }

  private figureDialog(id: string): void {
    const fig = figure(id);
    const e = this.etat;
    // Cadet d'une autre famille, encore en invitation : changer de voie, si c'est encore possible (P-N6).
    if (fig.role === 'cadet' && e.familles[fig.famille] === 'invite' && e.affiliation) {
      const ok = peutChanger(e) && peutConfirmer({ ...e, affiliation: null }, fig.famille).ok;
      return this.dire(`${fig.nom}, ${fig.titre}`, `« Tu as choisi ${la(e.affiliation)}. ${ok ? 'Si ce n’était pas la bonne voie, il est encore temps.' : 'Ta voie est engagée ; viens nous défier quand ton chef sera tombé.'} »`, [
        ...(ok ? [{ label: `Rejoindre ${la(fig.famille)} à la place…`, key: 'dlg-changer', run: () => this.confirmation(fig.famille, true) }] : []),
        { label: 'Au revoir', key: 'dlg-close', primary: true, run: () => this.fermerDialogue() },
      ], fig.apparence);
    }
    const st = statutDefi(e, fig);
    const enjeu = st.deja ? 'Revanche, sans récompense : votre victoire est déjà au registre.' : `En jeu : ${fig.enjeu.kind === 'variante' ? nomCarte(fig.enjeu.defId) : `la Signature ∞ ${de(fig.famille)}`}.`;
    if (!st.ouvert) return this.dire(`${fig.nom}, ${fig.titre}`, `« Pas encore. » ${st.raison}`, [fermer(this)], fig.apparence);
    this.dire(`${fig.nom}, ${fig.titre}`, `${st.deja ? ligneFigure(fig.role, true) : REPLIQUES[fig.id] ?? ligneFigure(fig.role, false)} ${enjeu}`, [
      { label: `${st.deja ? 'Revanche' : 'Défier'} — ${fig.nom}`, key: 'dlg-duel', primary: true, run: () => this.lancerFigure(fig.id) },
      { label: 'Plus tard', key: 'dlg-close', run: () => this.fermerDialogue() },
    ], fig.apparence);
  }

  private lancerFigure(id: string): void {
    const st = statutDefi(this.etat, figure(id));
    this.preparer(duelFigure(id, this.etat, this.prochaineGraine(), st.deja));
  }

  /** Épreuve du quartier (facultative) : trois duels en série ; variante I à la première série gagnée. */
  private epreuveDialog(f: Family): void {
    const e = this.etat;
    const st = statutEpreuve(e.competitions, e.registre, f);
    const r = rencontreDef(`epreuve-${f}`)!;
    const etape = e.competitions.epreuves[f]?.etape ?? 0;
    const gagnee = !!e.competitions.epreuves[f]?.gagnee;
    this.dire(capital(r.nom), `« L’Épreuve du quartier : trois de nos membres, l’un après l’autre. Une défaite, et l’on recommence. » ${st.texte} ${gagnee ? '' : `Récompense : ${nomCarte(varianteDe(f, 1))}.`}`, st.ouvert ? [
      { label: `Duel ${etape + 1} sur 3`, key: 'dlg-duel', primary: true, run: () => this.preparer(duelEpreuve(f, etape, this.etat, this.prochaineGraine(), gagnee)) },
      { label: 'Plus tard', key: 'dlg-close', run: () => this.fermerDialogue() },
    ] : [fermer(this)], r.apparence);
  }

  /** Joute de la maison (facultative) : un duel sous contrainte de construction ; variante II à la première victoire. */
  private jouteDialog(f: Family): void {
    const e = this.etat;
    const st = statutJoute(e.competitions, e.vaincues, f, e.deck);
    const r = rencontreDef(`joute-${f}`)!;
    const gagnee = !!e.competitions.joutes[f]?.gagnee;
    this.dire(capital(r.nom), `« La Joute de la maison se joue avec ${CONTRAINTE_JOUTE[f].texte}. » ${st.texte} ${gagnee ? '' : `Récompense : ${nomCarte(varianteDe(f, 2))}.`}`, st.ouvert ? [
      { label: gagnee ? 'Rejouer la Joute' : 'Jouter', key: 'dlg-duel', primary: true, run: () => this.preparer(duelJoute(f, this.etat, this.prochaineGraine(), gagnee)) },
      { label: 'Plus tard', key: 'dlg-close', run: () => this.fermerDialogue() },
    ] : [{ label: 'Ouvrir le deck', key: 'dlg-deck', run: () => { this.fermerDialogue(); this.collection(); } }, fermer(this)], r.apparence);
  }

  /** Porte de l'arène : le Championnat des Champions (M10-E en avance, PROGRESSION §4). */
  private championnatDialog(): void {
    const e = this.etat;
    if (!ouvertChampionnat(e.familles)) {
      const n = FAMILIES.filter((f) => e.familles[f] === 'chef').length;
      return this.dire('L’arène', `La grande scène des duels. Le Championnat des Champions s’ouvre aux duellistes qui ont vaincu les quatre chefs (${n}/4).`, [fermer(this)]);
    }
    const c = e.competitions;
    const m = manche(c);
    const sig = e.deck.signature;
    if (m === 'titre') return this.dire('Le Championnat des Champions', 'Personne en ville ne joue mieux que vous. La foule scande votre nom ; Kaï, le premier, vous salue.', [fermer(this)]);
    if (m === 'poule') {
      const choix: Choix[] = FAMILIES.flatMap((f) => {
        const st = statutPoule(c, f, sig);
        return st.ouvert ? [{ label: `${figureDe(f, 'chef').nom} (${f})`, key: `dlg-poule-${f}`, run: () => this.preparer(duelChampionnat('poule', this.etat, this.prochaineGraine(), f)) }] : [];
      });
      const vaincus = Object.keys(c.championnat.poule).length;
      return this.dire('Les Quatre Bannières', `Battez trois des quatre chefs, avec une Signature différente à chaque victoire (${vaincus}/3). Signature équipée : ${sig ? CATALOG[`sig-${sig}`]!.name : 'aucune'}.${choix.length ? '' : ' Aucun duel possible avec cette Signature : changez-la dans le deck.'}`, [...choix, { label: 'Ouvrir le deck', key: 'dlg-deck', run: () => { this.fermerDialogue(); this.collection(); } }, { label: 'Plus tard', key: 'dlg-close', primary: !choix.length, run: () => this.fermerDialogue() }]);
    }
    if (m === 'miroir') return this.dire('Le Miroir', '« On a commencé ensemble, le soir du tournoi. On finit ensemble. » Kaï a gagné sa place en demi-finale.', [
      { label: 'Affronter Kaï', key: 'dlg-duel', primary: true, run: () => this.preparer(duelChampionnat('miroir', this.etat, this.prochaineGraine())) },
      { label: 'Plus tard', key: 'dlg-close', run: () => this.fermerDialogue() },
    ], 'braise');
    const st = statutFinale(c, sig);
    this.dire('La Finale', `${TENANTE.nom}, ${TENANTE.titre}, vous attend. Deux manches gagnantes ; changez de Signature entre deux manches. ${st.texte}`, st.ouvert ? [
      { label: 'Jouer la manche', key: 'dlg-duel', primary: true, run: () => this.preparer(duelChampionnat('finale', this.etat, this.prochaineGraine())) },
      { label: 'Plus tard', key: 'dlg-close', run: () => this.fermerDialogue() },
    ] : [{ label: 'Ouvrir le deck', key: 'dlg-deck', run: () => { this.fermerDialogue(); this.collection(); } }, fermer(this)], TENANTE.apparence);
  }

  private facultatif(id: string): void {
    const r = rencontreDef(id)!;
    const kai = id === 'rival-kai';
    // L'arc du rival (contrat narratif §4.1) : ses mots suivent le chapitre et les résultats publics de vos duels.
    const ch = chapitre(this.etat);
    const contreKai = this.save!.historique.filter((h) => h.rencontre === 'rival-kai' || h.rencontre === 'prologue' || h.rencontre === 'brasDroit-Cendre');
    const gagnes = contreKai.filter((h) => h.issue === 'victoire').length;
    const ligneKai = ch === 'maison'
      ? `« Alors, ${this.etat.affiliation ? `tu as rejoint ${la(this.etat.affiliation)}` : 'toujours sans famille'} ? Moi, la Cendre m’a pris. Une partie, pour voir qui a le plus appris ? »`
      : ch === 'voies' ? `« Tu as fait tomber ton chef, à ce qu’on dit. Moi, je monte aussi. ${gagnes > contreKai.length / 2 ? 'Tu mènes, mais pas pour longtemps.' : 'Et je mène, ne l’oublie pas.'} »`
      : `« Le Championnat approche. On se retrouvera là-bas, j’en suis sûr. En attendant, une dernière pour la route ? »`;
    const texte = kai
      ? `${ligneKai} (défi facultatif, sans récompense ; vos duels contre lui : ${gagnes} victoire(s) sur ${contreKai.length})`
      : '« Une partie, pour passer le temps ? » (duel de rue, sans récompense)';
    this.dire(capital(r.nom), texte, [
      { label: 'Accepter', key: 'dlg-duel', primary: true, run: () => this.preparer(duelFacultatif(id, this.etat, this.prochaineGraine())) },
      { label: 'Refuser', key: 'dlg-close', run: () => { this.save!.directeur = conclure(this.save!.directeur, id, false); this.persist(); this.fermerDialogue(); } },
    ], r.apparence);
  }

  /** Salle des Bannières (la salle de jeu de cartes) : l'engagement OFFICIEL du défi d'une autre famille (ADR 031 §4). */
  private salleDesBannieres(): void {
    const e = this.etat;
    if (!e.affiliation) return this.dire('La Salle des Bannières', '« Le tournoi est réservé aux duellistes des familles. Revenez quand vous appartiendrez à une Voie. » La porte reste close.', [fermer(this)]);
    const choix: Choix[] = [];
    const raisons: string[] = [];
    for (const f of FAMILIES) {
      if (f === e.affiliation) continue;
      const ok = peutEngager(e, f);
      if (ok.ok) choix.push({ label: `Engager le défi ${de(f)}…`, key: `dlg-engager-${f}`, run: () => void this.engager(f) });
      else raisons.push(`${f} : ${ok.raison}`);
    }
    this.dire('La Salle des Bannières', `Le maître de table montre les quatre bannières. « Ici, on engage officiellement le défi d’une famille. » ${choix.length ? '' : raisons[0] ?? ''}`, [...choix, { label: 'Plus tard', key: 'dlg-close', primary: !choix.length, run: () => this.fermerDialogue() }]);
  }

  private async engager(f: Family): Promise<void> {
    this.fermerDialogue();
    const r = await confirmDialog({ title: `Engager le défi ${de(f)} ?`, text: `Vous recevrez les quatre cartes de base ${de(f)} et sa Technique ${MAISONS[f].technique} ; vous pourrez ensuite défier ${figureDe(f, 'cadet').nom}, ${figureDe(f, 'brasDroit').nom} et ${figureDe(f, 'chef').nom}.`, confirm: 'Engager le défi' });
    if (r !== 'confirm') return;
    const gains = this.faire({ type: 'engager', famille: f });
    if (gains) this.recompense(`Défi ${de(f)} engagé`, gains, () => this.entrerVille(false));
  }

  // ------------------------------------------------------------------ duel

  private prochaineGraine(): number {
    const s = this.save!;
    if (new URLSearchParams(location.search).has('seed')) return this.params.seed;
    return duelSeed(s.profil.graine, s.compteur);
  }

  /** Préparation (dialogue) : adversaire, lieu, PV, enjeu annoncé, les deux decks ; puis le duel. */
  private preparer(prevu: DuelPrevu): void {
    this.fermerDialogue();
    const panel = h('div', { class: 'av-confirm av-prep', 'data-key': 'av-preparation' },
      h('div', { class: 'av-confirm-head' }, h('img', { class: 'ville-portrait', alt: '', src: portraitUrl(prevu.personnalite, this.params.artSeed) }), h('div', null, h('h2', null, prevu.titre), h('p', { class: 'av-devise' }, `Lieu : ${LIEU[prevu.venue]} · PV ${prevu.config.players.p1.hp} contre ${prevu.config.players.p2.hp}`))),
      prevu.enjeu ? h('div', { class: 'av-enjeu' }, h('span', null, 'En jeu (première victoire) : '), CATALOG[prevu.enjeu] ? cardEl(prevu.enjeu, { artSeed: this.params.artSeed, tag: 'div' }) : null) : h('p', null, 'Aucune récompense en jeu.'),
      h('p', { class: 'av-proto', 'data-key': 'av-deck-adverse' }, `Adversaire : ${prevu.note}`),
      h('p', { class: 'av-proto', 'data-key': 'av-deck-reel' }, `Votre deck : ${resumeDeck(this.etat.deck)} ; Techniques ${this.etat.deck.techniques.join(' et ')}.`),
      h('div', { class: 'ville-choices' },
        h('button', { class: 'ville-btn primary', type: 'button', 'data-key': 'av-duel-go', onclick: () => { this.fermerModal(); this.lancer(prevu); } }, 'Commencer le duel'),
        h('button', { class: 'ville-btn', type: 'button', 'data-key': 'av-duel-back', onclick: () => this.fermerModal() }, 'Plus tard')));
    this.ouvrirModal(panel);
  }

  private lancer(prevu: DuelPrevu, resume?: DuelAventure): void {
    const s = this.save!;
    let duel = resume;
    if (!duel) {
      const n = s.compteur;
      s.compteur = n + 1;
      duel = { id: `a${n + 1}`, rencontre: prevu.rencontre, seed: prevu.config.seed, startedAt: new Date().toISOString(), rules: 'V3.0+delta-V3.2', catalog: '', config: structuredClone(prevu.config), commands: [], hash: '', turn: 0, pret: false };
      duel.catalog = CATALOG_ID;
      if (prevu.rencontre !== 'prologue' && figureOuNull(prevu.rencontre)) this.faire({ type: 'lancerDefi', figure: prevu.rencontre });
      s.duel = duel;
      this.persist();
    }
    this.cacherVille();
    this.ecran = 'duel';
    this.d.shellHost.hidden = true;
    this.d.shellHost.className = 'shell';
    this.d.shellHost.replaceChildren();
    const arena = this.d.ensureArena(prevu.personnalite, prevu.venue);
    arena?.setStaging('duel');
    arena?.setPaused(false);
    this.d.app.hidden = false;
    const id = duel.id;
    const banner = h('div', { class: 'av-banner', 'data-key': 'av-banner', title: prevu.note }, 'Aventure · prototype M10');
    document.body.append(banner);
    const session = new DuelSession({
      app: this.d.app, arena, config: duel.config, params: this.params, scenario: null, personality: prevu.personnalite, product: { menu: true }, resume: duel.commands,
      onTool: (t) => { if (t === 'menu') { void this.menuDuel(); return true; } return false; },
      onCommand: (c) => this.pointDeSauvegarde(id, c),
      onEnded: (c) => this.finDuel(c, false),
    });
    this.live = { session, duel, prevu };
    this.pointDeSauvegarde(id, session.controller);
  }

  private pointDeSauvegarde(id: string, c: Controller): void {
    const d = this.save?.duel;
    if (!d || d.id !== id) return;
    d.commands = structuredClone(c.match.commands);
    d.hash = c.match.hash();
    d.turn = c.match.state.turn;
    this.persist();
  }

  private reprendreDuel(d: DuelAventure): void {
    const check = verifierDuel(d);
    const prevu = this.prevuDe(d);
    if (!check.ok || !prevu) {
      this.toast(`Reprise exacte impossible : ${check.ok ? 'rencontre inconnue' : check.reason} Le duel est retiré (non compté).`);
      this.save!.duel = null;
      this.persist();
      this.entrerVille(false);
      return;
    }
    this.lancer(prevu, d);
  }

  private prevuDe(d: DuelAventure): DuelPrevu | null {
    const [k, a, b] = d.rencontre.split(':');
    const e = this.etat;
    const base = d.rencontre === 'prologue' ? duelPrologue(d.seed)
      : figureOuNull(d.rencontre) ? duelFigure(d.rencontre, e, d.seed, e.vaincues.includes(d.rencontre))
      : k === 'epreuve' ? duelEpreuve(a as Family, e.competitions.epreuves[a as Family]?.etape ?? 0, e, d.seed, !!e.competitions.epreuves[a as Family]?.gagnee)
      : k === 'joute' ? duelJoute(a as Family, e, d.seed, !!e.competitions.joutes[a as Family]?.gagnee)
      : k === 'champ' ? duelChampionnat(a as 'poule' | 'miroir' | 'finale', e, d.seed, b as Family | undefined)
      : rencontreDef(d.rencontre) ? duelFacultatif(d.rencontre, e, d.seed) : null;
    return base ? { ...base, config: d.config } : null;
  }

  /** Menu de pause du duel (Échap ou bouton Menu) : reprendre, sauvegarder et quitter, abandonner (confirmé). */
  private async menuDuel(): Promise<void> {
    const live = this.live;
    if (!live || document.querySelector('.av-pause')) return;
    live.session.suspended = true;
    const choix = await new Promise<string>((resolve) => {
      const close = (v: string) => { overlay.remove(); document.removeEventListener('keydown', onKey, true); resolve(v); };
      const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); close('resume'); } };
      const b = (label: string, key: string, v: string, cls = '') => h('button', { class: `btn ${cls}`, type: 'button', 'data-key': key, onclick: () => close(v) }, label);
      const overlay = h('div', { class: 'overlay sh-confirm av-pause', role: 'dialog', 'aria-modal': 'true' },
        h('div', { class: 'dialog sh-dialog' },
          h('h2', null, 'Duel en pause'),
          h('p', null, `Contre ${live.prevu.personnalite.name}. Le duel est sauvegardé à chaque action : en le quittant, vous le reprendrez exactement où il en est.`),
          h('div', { class: 'btn-row' }, b('Abandonner…', 'menu-abandon', 'abandon', 'ghost danger'), b('Sauvegarder et quitter', 'menu-quit', 'quit', 'ghost'), b('Reprendre le duel', 'menu-resume', 'resume'))));
      document.addEventListener('keydown', onKey, true);
      document.body.append(overlay);
      overlay.querySelector<HTMLElement>('[data-key="menu-resume"]')?.focus();
    });
    live.session.suspended = false;
    if (choix === 'quit') return this.quitterDuel();
    if (choix === 'abandon') {
      const a = await confirmDialog({ title: 'Abandonner le duel ?', text: 'Compté comme un abandon : rien n’est perdu, le défi reste ouvert.', confirm: 'Abandonner', danger: true });
      if (a === 'confirm' && this.live === live) this.finDuel(live.session.controller, true);
    }
  }

  private quitterDuel(): void {
    const live = this.live;
    if (!live) return;
    live.session.dispose();
    this.live = null;
    document.querySelector('.av-banner')?.remove();
    this.d.app.hidden = true;
    this.persist();
    this.toast('Duel sauvegardé : « Continuer l’aventure » le reprendra.');
    this.titre();
  }

  /** Fin de duel : faits publics → machine de l'aventure → registre ; une seule écriture ; puis le résultat. */
  finDuel(c: Controller, abandon: boolean, forcee?: Issue): void {
    const live = this.live;
    if (!live || !this.save) return;
    live.session.dispose();
    this.live = null;
    document.querySelector('.av-banner')?.remove();
    this.d.app.hidden = true;
    const v = viewFor(c.match.state, 'p1');
    const issue: Issue = forcee ?? (abandon ? 'abandon' : v.winner === 'me' ? 'victoire' : 'defaite');
    const rencontre = live.duel.rencontre;
    const at = new Date().toISOString();
    let gains: Gain[] = [];
    const s = this.save;
    s.duel = null;
    s.historique = [...s.historique, { id: live.duel.id, rencontre, issue, turns: v.turn, at }].slice(-60);
    s.directeur = battre(s.directeur);
    // AV-08 : les PV du joueur montent à chaque combat mené à son terme (pas à l'abandon)
    const pvAvant = pvJoueur(s.etat.combats);
    s.etat = appliquer(s.etat, { type: 'combat', issue }, at).etat;
    const pvApres = pvJoueur(s.etat.combats);
    const faits = faitsPublics(c.match.events);
    if (rencontre === 'prologue') s.etat = appliquer(s.etat, { type: 'duelPrologue', issue, faits }, at).etat;
    else if (figureOuNull(rencontre)) {
      const r = appliquer(s.etat, { type: 'duelStructurant', figure: rencontre, issue, duel: live.duel.id }, at);
      if (r.refus) this.toast(r.refus);
      s.etat = r.etat;
      gains = r.gains;
    } else if (/^(epreuve|joute|champ):/.test(rencontre)) {
      const [k, a, b] = rencontre.split(':');
      const ev: Evenement = k === 'epreuve' ? { type: 'epreuve', famille: a as Family, issue, duel: live.duel.id }
        : k === 'joute' ? { type: 'joute', famille: a as Family, issue, duel: live.duel.id }
        : { type: 'championnat', manche: a as 'poule' | 'miroir' | 'finale', chef: b as Family | undefined, signature: live.duel.config.players.p1.signature!, issue }; // le Championnat exige une Signature équipée (statutPoule, statutFinale)
      const r = appliquer(s.etat, ev, at);
      if (r.refus) this.toast(r.refus);
      s.etat = r.etat;
      gains = r.gains;
    } else s.directeur = conclure(s.directeur, rencontre, true);
    this.persist();
    this.dernierResultat = { prevu: live.prevu, issue, gains, turns: v.turn, faits, pv: [pvAvant, pvApres] };
    this.resultat();
  }

  private resultat(): void {
    const r = this.dernierResultat!;
    this.ecran = 'resultat';
    this.d.arena()?.setStaging('portrait');
    this.d.arena()?.setPaused(false);
    const titre = r.issue === 'victoire' ? 'Victoire' : r.issue === 'defaite' ? 'Défaite' : 'Abandon';
    const prologue = r.prevu.rencontre === 'prologue';
    const note = prologue ? 'Quelle que soit l’issue, la foule a tout vu.'
      : r.prevu.rencontre.startsWith('champ:') ? (r.issue === 'victoire' ? 'Le Championnat avance : aucune carte en jeu, seulement le titre.' : 'Rien n’est perdu : la manche peut se rejouer.')
      : r.prevu.rencontre.startsWith('epreuve:') ? (r.issue === 'victoire' ? (r.gains.length ? 'Épreuve remportée : la variante entre au registre.' : 'Duel gagné : la série continue.') : 'La série repart du début.') : r.issue === 'victoire' ? (r.gains.length ? 'Votre victoire entre au registre.' : 'Revanche : rien de nouveau au registre (aucune duplication).') : 'Rien n’est perdu : le défi reste ouvert.';
    this.ecranShell('scr-result av-scr',
      h('section', { class: 'av-titre av-resultat', 'data-screen': 'av-resultat' },
        h('h1', { class: 'av-h1' }, titre),
        h('p', { class: 'av-sous' }, `${r.prevu.titre} · ${r.turns} tour(s)`),
        h('p', null, note),
        h('p', { class: 'av-pv', 'data-key': 'av-pv' }, r.pv[1] > r.pv[0] ? `Entraînement : vos PV passent de ${r.pv[0]} à ${r.pv[1]}.` : `Un abandon ne compte pas comme un combat : vos PV restent à ${r.pv[0]}.`),
        prologue ? h('p', { class: 'av-proto', 'data-key': 'av-faits' }, `Ce que la foule a vu (faits publics du duel) : ${r.faits.assautsGagnes} Clash(es) gagné(s) en Assaut, ${r.faits.gardesGagnees} en Garde, ${r.faits.interferencesReussies} Interférence(s) réussie(s).`) : null,
        r.gains.length ? h('div', { class: 'av-cards' }, ...r.gains.flatMap((g) => gainEls(g, this.params.artSeed))) : null,
        h('div', { class: 'av-items' }, bouton('Retour en ville', () => this.apresResultat(), 'av-retour', true))));
  }

  private apresResultat(): void {
    const r = this.dernierResultat!;
    const rencontre = r.prevu.rencontre;
    this.d.arena()?.setPaused(true);
    if (rencontre === 'prologue') {
      this.save!.ville = { ilot: 'quai', pos: { x: 12.4, z: 1.3 } };
      this.persist();
      this.entrerVille(false);
      // ville déjà montée (sans rechargement pendant le duel) : le joueur revient aussi devant la foule
      this.town?.place({ x: 12.4, z: 1.3 }, 'droite');
      this.scenesFoule();
      return;
    }
    if (rencontre.startsWith('champ:')) {
      this.entrerVille(false, 'porte-arene');
      if (rencontre === 'champ:finale' && this.etat.competitions.championnat.titre && r.issue === 'victoire') {
        this.dire('Le Championnat des Champions', 'La foule envahit le Parvis. Les quatre chefs se lèvent ; Kaï vous tend la main : « Personne en ville ne joue mieux que toi. Je le savais depuis le premier soir. » (La cérémonie aura lieu dans la Grande Cour quand elle sera construite.)', [fermer(this)]);
      }
      return;
    }
    const comp = rencontre.match(/^(epreuve|joute):(\w+)$/);
    this.entrerVille(false, comp ? `npc-${comp[1]}-${comp[2]}` : `npc-${rencontre}`);
  }

  /** P4 et P5 : la foule, Kaï, puis le premier émissaire s'avance (les quatre ont invité). */
  private scenesFoule(): void {
    const e = this.etat;
    const victoire = e.prologue === 'victoire';
    this.dire('La foule', victoire ? '« Des cartes grises ont battu la Braise du quai ! Des cartes de rien ! »' : '« Avec des cartes grises, tenir tête à Kaï jusqu’au bout… Des cartes de rien ! »', [{
      label: 'Suivant', key: 'dlg-next', primary: true, run: () => this.dire('Kaï', victoire ? '« La prochaine fois, je ne te ferai pas de cadeau. »' : '« Pas mal. Avec des cartes grises. »', [{
        label: 'Suivant', key: 'dlg-next', primary: true, run: () => this.emissaireDialog(e.premier ?? 'Astre'),
      }], KAI_PROLOGUE.apparence),
    }]);
  }

  // ------------------------------------------------------------------ fenêtres

  dire(titre: string, texte: string, choix: Choix[], apparence?: string): void {
    this.fermerDialogue();
    this.town?.setInputLocked(true);
    const box = h('div', { class: 'ville-dialog', role: 'dialog', 'aria-label': titre });
    if (apparence) {
      const p = personnalite(apparence, { nom: titre, titre: '' });
      box.append(h('img', { class: 'ville-portrait', alt: '', src: portraitUrl(p, this.params.artSeed) }));
    }
    const row = h('div', { class: 'ville-choices' }, ...choix.map((c) => h('button', { class: `ville-btn${c.primary ? ' primary' : ''}`, type: 'button', 'data-key': c.key, onclick: () => c.run() }, c.label)));
    box.append(h('div', { class: 'ville-dialog-body' }, h('b', null, titre), h('p', null, texte), row));
    box.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); this.fermerDialogue(); } });
    document.body.append(box);
    this.dialog = box;
    (row.querySelector<HTMLButtonElement>('.primary') ?? row.querySelector('button'))?.focus({ preventScroll: true });
  }

  fermerDialogue(): void {
    this.dialog?.remove();
    this.dialog = null;
    if (!this.modal) this.town?.setInputLocked(false);
    this.rafraichir();
  }

  private ouvrirModal(panel: HTMLElement): void {
    this.fermerModal();
    this.town?.setInputLocked(true);
    const m = h('div', { class: 'av-modal', role: 'dialog', 'aria-modal': 'true' }, panel);
    m.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); this.fermerModal(); } });
    document.body.append(m);
    this.modal = m;
    m.querySelector<HTMLElement>('.primary, button')?.focus({ preventScroll: true });
  }

  fermerModal(): void {
    this.modal?.remove();
    this.modal = null;
    if (!this.dialog) this.town?.setInputLocked(false);
  }

  private recompense(titre: string, gains: Gain[], suite: () => void): void {
    const panel = h('div', { class: 'av-confirm av-recompense', 'data-key': 'av-recompense' },
      h('h2', null, titre),
      h('p', null, 'Inscrit au registre des gains (une seule fois : un rechargement, une reprise ou une revanche ne le dupliquent pas).'),
      h('div', { class: 'av-cards' }, ...gains.flatMap((g) => gainEls(g, this.params.artSeed))),
      h('div', { class: 'ville-choices' }, h('button', { class: 'ville-btn primary', type: 'button', 'data-key': 'av-continuer', onclick: () => { this.fermerModal(); suite(); } }, 'Continuer')));
    this.ouvrirModal(panel);
  }

  private menu(): void {
    if (this.modal) { this.fermerModal(); return; }
    if (this.dialog) { this.fermerDialogue(); return; }
    this.dire('Menu', 'L’aventure est sauvegardée à chaque étape.', [
      { label: 'Reprendre', key: 'dlg-close', primary: true, run: () => this.fermerDialogue() },
      { label: 'Deck et collection', key: 'menu-deck', run: () => { this.fermerDialogue(); this.collection(); } },
      { label: 'Journal des quêtes', key: 'menu-journal', run: () => { this.fermerDialogue(); this.journal(); } },
      { label: 'Aide', key: 'menu-help', run: () => this.dire('Aide de l’aventure', 'Marcher : ZQSD, WASD, flèches ou clic au sol (Maj : pas lent). Parler, entrer, sortir : E, Entrée ou Espace, ou clic sur la bulle. Échap : menu. Repères : « ! » un défi, « ? » quelqu’un à écouter. Les duels se jouent comme dans le jeu standard (aide du duel : bouton « ? »).', [fermer(this)]) },
      { label: 'Écran titre', key: 'menu-home', run: () => { this.fermerDialogue(); this.titre(); } },
    ]);
  }

  /** Deck et collection de l'aventure : 16 cartes (4 par Rang), une Signature au plus, deux Techniques (R-AV). */
  collection(): void {
    const s = this.save!;
    const col = collectionDe(s.etat.registre);
    let draft: DeckAv = structuredClone(s.etat.deck);
    const art = this.params.artSeed;
    const body = h('div', { class: 'av-deck' });
    const render = () => {
      const issues = validerDeckAv(draft, col);
      const cartes = h('div', { class: 'av-cards av-deck-cards' }, ...draft.cartes.map((c) => {
        const el = isNeutre(c) ? neutreEl(c) : cardEl(c, { artSeed: art, tag: 'div' });
        const d = CATALOG[c];
        const autre = d ? col.variantes.find((v) => CATALOG[v]?.identity === d.identity && v !== c) ?? (d.rarity !== 'Basic' ? `${d.identity}-basic` : null) : null;
        return h('div', { class: 'av-slot' }, el, autre ? h('button', { class: 'ville-btn av-mini', type: 'button', 'data-key': `av-version-${d!.identity}`, onclick: () => { draft = equiperVersion(draft, autre); render(); } }, CATALOG[autre]!.rarity === 'Basic' ? 'Basic' : EFFECTS[CATALOG[autre]!.effect!].name) : null);
      }));
      const sigs = h('div', { class: 'ville-choices' }, ...[null, ...col.signatures].map((f) => h('button', { class: `ville-btn${draft.signature === f ? ' primary' : ''}`, type: 'button', 'data-key': `av-sig-${f ?? 'aucune'}`, onclick: () => { draft = equiperSignature(draft, f); render(); } }, f ? CATALOG[`sig-${f}`]!.name : 'Aucune')));
      const techs = h('div', { class: 'ville-choices' }, ...col.techniques.map((t: TechniqueId) => h('button', { class: `ville-btn${draft.techniques.includes(t) ? ' primary' : ''}`, type: 'button', 'data-key': `av-tech-${t}`, title: TECHNIQUES[t].text, onclick: () => { draft = { ...draft, techniques: draft.techniques.includes(t) ? draft.techniques.filter((x) => x !== t) : [...draft.techniques, t].slice(-2) }; render(); } }, t)));
      body.replaceChildren(
        h('h2', null, 'Deck de l’aventure'),
        h('p', null, `16 cartes ordinaires, quatre de chaque Rang ; ${draft.cartes.filter(isNeutre).length} neutre(s). Signature équipée : ${draft.signature ? CATALOG[`sig-${draft.signature}`]!.name : 'aucune (aucun chef vaincu)'} — une seule à la fois.`),
        cartes,
        h('h3', null, `Signature (${col.signatures.length} possédée${col.signatures.length > 1 ? 's' : ''})`), sigs,
        h('h3', null, 'Techniques (deux)'), techs,
        issues.length ? h('ul', { class: 'av-issues', 'data-key': 'av-issues' }, ...issues.map((i) => h('li', null, i.text))) : h('p', { class: 'av-ok' }, 'Deck légal (règle R-AV, avenant M10-A).'),
        h('h3', null, 'Collection'),
        h('p', null, `Neutres : ${[1, 2, 3, 4].map((r) => `${ROMAIN[r as 1]} ×${col.neutres[r as 1]}`).join(', ')} · Cartes de base : ${col.basics.length ? col.basics.join(', ') : 'aucune'} · Variantes : ${col.variantes.length ? col.variantes.map(nomCarte).join(', ') : 'aucune'} · Techniques : ${col.techniques.join(', ')}`),
        h('h3', null, 'Registre des gains'),
        h('ol', { class: 'av-registre', 'data-key': 'av-registre' }, ...s.etat.registre.map((g) => h('li', null, `${g.key} — ${g.source}`))),
        h('div', { class: 'ville-choices' },
          h('button', { class: 'ville-btn primary', type: 'button', 'data-key': 'av-deck-save', disabled: issues.length ? true : null, onclick: () => { s.etat = { ...s.etat, deck: draft }; this.persist(); this.fermerModal(); this.toast('Deck enregistré.'); } }, 'Enregistrer'),
          h('button', { class: 'ville-btn', type: 'button', 'data-key': 'av-deck-close', onclick: () => this.fermerModal() }, 'Fermer')));
    };
    render();
    this.ouvrirModal(h('div', { class: 'av-confirm av-large', 'data-key': 'av-collection' }, body));
  }

  journal(): void {
    const q = quetes(this.etat);
    this.ouvrirModal(h('div', { class: 'av-confirm av-large', 'data-key': 'av-journal-panel' },
      h('h2', null, 'Journal des quêtes'),
      ...q.map((x) => h('div', { class: 'av-quete' }, h('h3', null, x.titre), h('ul', null, ...x.etapes.map((s) => h('li', { class: s.faite ? 'faite' : '' }, `${s.faite ? '✓ ' : '· '}${s.texte}`))))),
      h('p', { class: 'av-proto' }, `États des familles : ${FAMILIES.map((f) => `${f} ${this.etat.familles[f]}`).join(' · ')}`),
      h('h3', null, 'Duels de l’aventure (les plus récents d’abord)'),
      this.save!.historique.length
        ? h('ol', { class: 'av-registre', 'data-key': 'av-historique' }, ...[...this.save!.historique].reverse().slice(0, 20).map((d) => h('li', null, `${d.id} · ${d.rencontre} · ${d.issue} · ${d.turns} tour(s)`)))
        : h('p', null, 'Aucun duel joué.'),
      h('div', { class: 'ville-choices' }, h('button', { class: 'ville-btn primary', type: 'button', 'data-key': 'av-journal-close', onclick: () => this.fermerModal() }, 'Fermer'))));
  }

  toast(text: string): void {
    const t = h('div', { class: 'ville-toast', role: 'status' }, text);
    document.body.append(t);
    setTimeout(() => t.remove(), 3200);
  }

  // ------------------------------------------------------------------ crochets de QA (`?qa=1` seulement)

  /** QA : place le joueur devant un personnage posé (point d'apparition `npc-<id>`). */
  qaDevant(id: string): boolean {
    const sp = this.town?.ilot.spawns[`npc-${id}`];
    if (!sp || !this.town) return false;
    this.town.place(sp, sp.face);
    return true;
  }

  /**
   * QA : rejoue une suite de FAITS par la machine d'états (mêmes règles que le jeu : refus compris), puis remonte la
   * ville ; pour atteindre un chapitre avancé sans jouer chaque duel (jamais sans `?qa=1`). Renvoie les refus.
   */
  qaFaits(evs: Evenement[]): string[] {
    if (!this.params.qa || !this.save) return ['QA seulement'];
    const refus: string[] = [];
    for (const ev of evs) {
      const r = appliquer(this.save.etat, ev, new Date().toISOString());
      if (r.refus) refus.push(r.refus); else this.save.etat = r.etat;
    }
    this.persist();
    if (this.ecran === 'ville') this.entrerVille(false);
    return refus;
  }

  /** QA : termine le duel en cours avec une issue imposée (parcours automatisés ; jamais sans `?qa=1`). */
  qaTerminer(issue: Issue): void {
    if (!this.params.qa || !this.live) return;
    this.finDuel(this.live.session.controller, issue === 'abandon', issue);
  }
}

const CATALOG_ID = CATALOG_AVENTURE;
const LIEU: Record<VenueId, string> = { salle: 'la salle de jeu de cartes', rue: 'la rue, le Quai la nuit', bar: 'le Fanal', arene: 'l’arène' } as Record<VenueId, string>;

const figureOuNull = (id: string) => { try { return figure(id); } catch { return null; } };
const lieuDe = (f: Family) => (f === 'Cendre' ? 'à la Maison du Chantier, à l’ouest du Quai' : f === 'Ronce' ? 'devant le Fanal, sur le Quai' : f === 'Voile' ? 'dans les Ruelles, près de la fontaine' : 'sur le Parvis de l’arène');
const nomCarte = (defId: string) => (CATALOG[defId] ? cardTitle(CATALOG[defId]!) : defId);

function ligneFigure(role: 'cadet' | 'brasDroit' | 'chef', revanche: boolean): string {
  if (revanche) return '« Encore ? Soit. Mais ce que tu as gagné, tu l’as déjà. »';
  return role === 'cadet' ? '« Voyons si tu tiens la distance. »' : role === 'brasDroit' ? '« Avant le chef, il y a moi. »' : '« Tout ce chemin jusqu’à moi. Montre-moi pourquoi. »';
}

function fermer(a: AventureApp): Choix {
  return { label: 'Fermer', key: 'dlg-close', primary: true, run: () => a.fermerDialogue() };
}

function bouton(label: string, run: () => void, key: string, primary = false, sous?: string): HTMLElement {
  return h('button', { class: `av-btn${primary ? ' primary' : ''}`, type: 'button', 'data-key': key, 'data-shell-primary': primary ? 'true' : null, onclick: run }, h('b', null, label), sous ? h('small', null, sous) : null);
}

/** Carte neutre (ADR 030) : blanche/grise, Rang lisible, sans emblème ni effet ; dessinée en DOM (hors moteur). */
function neutreEl(defId: string, note?: string): HTMLElement {
  const r = rangNeutre(defId);
  const n = NEUTRES[r];
  return h('div', { class: 'card av-neutre', 'aria-label': `${n.name}, Puissance ${n.power}, sans famille ni effet`, 'data-def': defId },
    h('span', { class: 'av-n-rank' }, ROMAIN[r]),
    h('span', { class: 'av-n-name' }, 'Neutre'),
    h('span', { class: 'av-n-pow' }, `P${n.power}`),
    note ? h('span', { class: 'av-n-note' }, note) : null);
}

/** « 12 neutres + 4 Voile (1 variante), sans Signature ». */
function resumeDeck(d: DeckAv): string {
  const n = d.cartes.filter(isNeutre).length;
  const parFam = FAMILIES.map((f) => [f, d.cartes.filter((c) => CATALOG[c]?.family === f)] as const).filter(([, cs]) => cs.length);
  const fam = parFam.map(([f, cs]) => { const v = cs.filter((c) => CATALOG[c]!.rarity !== 'Basic').length; return `${cs.length} ${f}${v ? ` (${v} variante${v > 1 ? 's' : ''})` : ''}`; });
  return `${[n ? `${n} neutre${n > 1 ? 's' : ''}` : '', ...fam].filter(Boolean).join(' + ')}, ${d.signature ? `Signature ${CATALOG[`sig-${d.signature}`]!.name}` : 'sans Signature'}`;
}

function gainEls(g: Gain, artSeed: number): HTMLElement[] {
  if (g.kind === 'technique') return [h('div', { class: 'av-tech', title: TECHNIQUES[g.items[0] as TechniqueId].text }, h('b', null, 'Technique'), h('span', null, g.items[0]!))];
  if (g.kind === 'neutres') return [1, 2, 3, 4].map((r) => neutreEl(`neutre-${r}`, '×4'));
  return g.items.map((d) => cardEl(d, { artSeed, tag: 'div' }));
}
