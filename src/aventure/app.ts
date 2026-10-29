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
import { EFFECT_SUMMARY } from '../game/catalog/cardText';
import { TECHNIQUES, type TechniqueId } from '../game/catalog/techniques';
import { viewFor } from '../game/visibility/view';
import { cardEl } from '../presentation/cardView';
import type { RivalPersonality } from '../presentation/personalities';
import type { VenueId } from '../presentation/venues';
import { duelSeed, SaveStore } from '../product/save';
import { webglAvailable, type ArenaHandle } from '../scene/arena';
import { confirmDialog, h } from '../shell/ui';
import { APPARENCE_DEFAUT, estOrigine, idJoueur, type Apparence } from '../ville/apparence';
import { editeurApparence, silhouettesDisponibles } from './apparence';
import { parseRig } from '../ville/cameras';
import { decorPolicy, preloadDecors } from '../ville/decors';
import { MANIFESTE_RANGS, QUARTIERS_AJOUTES, type IlotId } from '../ville/ilots';
import { blocked, type Facing, type Vec2, type Zone } from '../ville/monde';
import { spritePolicy } from '../ville/spritesExternes';
import { installVilleStyles, promptBubble } from '../ville/ui';
import { createTown, type Town } from '../ville/ville';
import { decideVille } from '../ville/villeRangs';
import { apercuEngagement, appliquer, bannieres, chapitre, chapitreDetaille, peutChanger, peutConfirmer, statutDefi, type AventureEtat, type EtatBanniere, type Evenement, type FaitsPublics, type Issue } from './aventure';
import { basculerTechnique, choixPourCase, equiperSignature, rangDe, remplacerCase, standardLegal, validerDeckAv, type DeckAv } from './deck';
import { origineGain, vueCollection, type EntreeCollection } from './collection';
import { conclure, decider, poses, rencontreDef, type Pose } from './directeur';
import { estDepart, estFamille, etatDepart, type Depart } from './departs';
import { ilotAventure, ilotBase } from './ilots';
import { aF, deF, emissaire, figure, figureDe, leF, REPLIQUES, TENANTE, isNeutre, KAI_PROLOGUE, MAISONS, NEUTRES, RANGS, rangNeutre, roleDe, cheffe, chefVaincu, leChef, ROLES, ROMAIN, type EtatFamille } from './modele';
import { objectif, quetes } from './quetes';
import { aGain, collectionDe, prochaineVariante, variantesIdentite, type Gain } from './registre';
import { duelChampionnat, duelEpreuve, duelFacultatif, duelFigure, duelJoute, duelPrologue, duelRival, personnalite, type DuelPrevu } from './rencontres';
import { detecter, guetteursActifs, pointApproche, pointSurgissement, regardVers } from './vue';
import { evenementDef, evenementRival, isKId, type EvenementRival, type KId } from './rival';
import { choisir, memoireVide, type Contexte, type Moment } from './repliques';
import { temperamentDe, temperamentParole } from './temperaments';
import { son } from '../son/moteur';
import { ambianceIlot } from '../son/evenements';
import { consigneVille, numeroChapitre, proximiteFanal, REPOS_VILLE_S, roleDuelAventure } from '../son/musique/chef';
import { CONTRAINTE_JOUTE, famillesDominantes, manche, ouvertChampionnat, statutEpreuve, statutFinale, statutJoute, statutPoule, varianteDe } from './competitions';
import { CATALOG_AVENTURE, MagasinAventure, nouvelleSauvegarde, verifierDuel, type AventureSave, type DuelAventure } from './sauvegarde';
import { installAventureStyles } from './styles';
import { aJouer, arriveeAJouer, cadreDialogue, cadreGroupe, CARTONS_CHAPITRE, cinePermise, DUREES, ecrireCine, estChapitreCarton, LIGNES_LIEU, lireCine, plansAffiliation, plansArrivee, plansChapitre, plansChef, plansEmissaire, plansGuetteur, plansKaiPrologue, plansRival, plansTitre, type CadreDialogue, type CinematiqueId } from './cinematiques';
import { Bandes, Cinema } from './cinema';
import { choixVariante, conclureDuel, enjeuVariante, figureOuNull, ouvrirDuel, REGLES_DUEL } from './fin';
import { conseilLu, conseilsPermis, ecrireConseils, lireConseils } from './conseils';
import { duelTip } from '../shell/tips';

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
/** Stockage du navigateur pour les réglages (un accès refusé ne casse rien). */
const stockageLocal = (): Storage | null => { try { return window.localStorage; } catch { return null; } };
const minuscule = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
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
  ecran: 'titre' | 'nouveau' | 'ville' | 'preparation' | 'duel' | 'choix' | 'resultat' = 'titre';
  private posesAffichees = '';
  /**
   * ARB-M10-12 : le Quai de l'aventure est le Quai en quatre rangs ; depuis la reprise de M09, toute la ville est en rangs
   * (le Parvis et les Ruelles en rangs, la Grande Cour), si elle peut s'afficher (tous ses dioramas admis : en QA, ou hors
   * QA une fois les images approuvées, A2 puis A1) ; sinon la ville d'aujourd'hui, dessinée par code, en secours.
   */
  quaiRangs = false;
  private quaiDecide = false;
  private decisionQuai: Promise<boolean>;
  /** Les quartiers ajoutés ouverts (deuxième reprise de M09, ADR 028). */
  private ouverts: ReadonlySet<IlotId> = new Set();
  private dernierResultat: { prevu: DuelPrevu; issue: Issue; gains: Gain[]; turns: number; faits: FaitsPublics; pv: [number, number] } | null = null;
  /** M11-A : rencontres en vue (front montant : guetteurs qui voyaient déjà le joueur ; armée après une image calme). */
  private vue = { armee: false, dedans: new Set<string>() as ReadonlySet<string> };
  /** M11-A : une rencontre forcée en cours (guetteur qui vient, Kaï qui surgit) : ni menu, ni Échap, ni autre déclenchement. */
  force: { kind: 'vue' | 'rival'; id: string; apparence: string } | null = null;
  /** M11-A : point de décision en attente (le rival se décide quand aucune fenêtre n'est ouverte). */
  private pointDecision: { retourKai: boolean } | null = null;
  private retourKai = false;
  private enVoyage = false;
  /** M11 : cinématique en cours (le monde attend, le menu la passe) ; `cadreGarde` : un dialogue s'est ouvert sur son dernier cadre. */
  private cine: Cinema | null = null;
  /** M13 : une scène du récit se joue (la musique du récit), et l'instant où elle a été vue active pour la dernière fois. */
  private recit = false;
  private recitVu = 0;
  /** M13 : le dialogue ouvert ne baisse pas la musique (réglage du son). */
  private sansFocus = false;
  /** M13 : le dernier instant où le joueur a bougé (ou lu, ou regardé une scène) ; au-delà de 30 s, la ville respire. */
  private bouge = 0;
  private cadreGarde = false;
  /** Bandes partagées des cinématiques et des dialogues cadrés ; `sceneBandes` : le dialogue cadré ouvert les tient. */
  private bandesCine: Bandes | null = null;
  private sceneBandes = false;
  /** Scène à jouer à la prochaine entrée en ville (chef vaincu, titre), avant le carton de chapitre. */
  private sceneEntree: (() => Promise<void>) | null = null;
  /** M11-A : Kaï posé dans l'îlot pendant un événement fixe (il surgit, vient, défie). */
  private rivalScene: { id: KId; at: Vec2; facing: Facing } | null = null;
  /** M11-A : bulle « ! » d'alerte (identifiant de personnalité). */
  private alerte: string | null = null;

  constructor(readonly d: DepsAventure) {
    installVilleStyles();
    installAventureStyles();
    document.title = 'Les Quatre Voies — Aventure';
    window.addEventListener('pagehide', () => this.memoriser());
    const politique = decorPolicy(d.params.qa, new URLSearchParams(location.search).get('decors'));
    this.decisionQuai = decideVille(politique).then(({ rangs: oui, ouverts }) => {
      this.quaiRangs = oui;
      this.ouverts = ouverts;
      this.quaiDecide = true;
      // l'ancien Quai en secours : ses plans éventuels (approuvés) préparés comme avant
      if (!oui) void preloadDecors(['quai'], politique);
      return oui;
    });
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
    son().ambiance(null);
    // M13 : l'écran titre de l'aventure joue le titre
    son().musique.vouloir({ version: 'I-1' });
    this.ecran = 'titre';
    this.backdrop();
    const s = this.save;
    const items: HTMLElement[] = [];
    if (s) {
      const col = collectionDe(s.etat.registre);
      const sous = s.duel ? 'Reprendre le duel en cours' : objectif(s.etat);
      items.push(bouton('Continuer l’aventure', () => this.continuer(), 'av-continue', true, sous));
      items.push(h('p', { class: 'av-profil' }, h('b', null, s.profil.nom), ` · ${CHAPITRE[chapitreDetaille(s.etat)]} · ${s.etat.affiliation ? `voie ${de(s.etat.affiliation)}` : 'sans famille'} · ${col.basics.length * 4} cartes familiales, ${col.variantes.length} variante(s), ${col.signatures.length} Signature(s)`));
    }
    items.push(bouton('Nouvelle aventure', () => void this.nouveau(), 'av-new', !s, 'Seize cartes grises, aucune famille : tout commence sur le Quai'));
    // heure de ville (finalisation de la ville, passe 137) : `?aventure=1&depart=III[&famille=Ronce]`, une aventure d'essai
    // au début d'un chapitre (faits appliqués par la machine) ; sans ce paramètre, rien ne change
    const q = new URLSearchParams(location.search);
    const dep = q.get('depart');
    if (estDepart(dep)) {
      const fam = estFamille(q.get('famille')) ? q.get('famille') as Family : 'Cendre';
      items.push(bouton(`Commencer au chapitre ${dep} (heure de ville)`, () => void this.commencerDepart(dep, fam), 'av-depart', false, `Aventure d’essai : voie ${de(fam)}, ${dep === 'I' ? 'famille rejointe' : 'chefs vaincus jusqu’à ce chapitre'} ; elle remplace l’aventure en cours`));
    }
    if (this.charge.status === 'illisible') items.push(h('p', { class: 'warn' }, `${this.charge.raison} « Nouvelle aventure » la mettra à l’écart (sans l’effacer).`));
    if (this.charge.status === 'future') items.push(h('p', { class: 'warn' }, this.charge.raison));
    if (this.charge.status === 'indisponible') items.push(h('p', { class: 'warn' }, 'Stockage local indisponible : l’aventure ne pourra pas être conservée.'));
    items.push(h('a', { class: 'av-link', href: location.pathname, 'data-key': 'av-standard' }, 'Jeu standard (duels, Tournoi du Quai)'));
    this.ecranShell('scr-home av-scr',
      h('section', { class: 'av-titre', 'data-screen': 'av-titre', 'aria-labelledby': 'av-t' },
        h('div', { class: 'av-emblems', 'aria-hidden': 'true', html: FAMILIES.map((f) => `<span class="fam-${f}">${emblemSvg(f, 30)}</span>`).join('') }),
        h('h1', { id: 'av-t', class: 'av-h1' }, 'Les Quatre Voies'),
        h('p', { class: 'av-sous' }, 'Aventure'),
        h('div', { class: 'av-items' }, ...items)));
  }

  private async nouveau(): Promise<void> {
    if (this.save) {
      const r = await confirmDialog({ title: 'Nouvelle aventure ?', text: 'L’aventure en cours sera remplacée (le jeu standard n’est pas touché).', confirm: 'Recommencer', danger: true });
      if (r !== 'confirm') return;
    }
    this.ecran = 'nouveau';
    const input = h('input', { class: 'av-input', type: 'text', maxlength: '24', value: 'Duelliste', 'data-key': 'av-name', 'aria-label': 'Votre nom' }) as HTMLInputElement;
    let apparence: Apparence = { ...APPARENCE_DEFAUT.a };
    const go = () => this.commencer(input.value.trim() || 'Duelliste', undefined, apparence);
    const zone = h('div', { class: 'av-apparence-zone' });
    void silhouettesDisponibles(this.params.qa, new URLSearchParams(location.search).get('sprites')).then((sil) => {
      zone.replaceChildren(h('p', { class: 'av-label' }, 'Votre apparence'), editeurApparence({ valeur: apparence, tenue: 'gris', silhouettes: sil, change: (a) => { apparence = a; } }));
    });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    this.ecranShell('scr-home av-scr',
      h('section', { class: 'av-titre', 'data-screen': 'av-nouveau' },
        h('h1', { class: 'av-h1' }, 'De la populace'),
        h('p', { class: 'av-sous' }, 'Vous n’avez ni famille ni Signature : seize cartes grises, quatre de chaque Rang, sans effet ni bonus. Le soir du tournoi, le Quai est plein.'),
        h('div', { class: 'av-cards' }, ...[1, 2, 3, 4].map((r) => neutreEl(`neutre-${r}`, '×4'))),
        h('label', { class: 'av-label' }, 'Votre nom ', input),
        zone,
        h('div', { class: 'av-items' }, bouton('Commencer', go, 'av-start', true), bouton('Retour', () => this.titre(), 'av-back'))));
    input.focus();
    input.select();
  }

  /** Heure de ville : une aventure d'essai au début du chapitre `dep` ; elle remplace l'aventure en cours, après confirmation. */
  private async commencerDepart(dep: Depart, fam: Family): Promise<void> {
    if (this.save) {
      const r = await confirmDialog({ title: `Commencer au chapitre ${dep} ?`, text: 'L’aventure en cours sera remplacée par une aventure d’essai (le jeu standard n’est pas touché).', confirm: 'Remplacer', danger: true });
      if (r !== 'confirm') return;
    }
    this.commencer('Duelliste', (e) => etatDepart(e, dep, fam, new Date().toISOString()));
  }

  private commencer(nom: string, depart?: (e: AventureEtat) => AventureEtat, apparence?: Apparence): void {
    const forced = this.params.qa ? Number(new URLSearchParams(location.search).get('profileSeed')) : NaN;
    const graine = Number.isInteger(forced) && forced > 0 ? forced >>> 0 : (crypto.getRandomValues(new Uint32Array(1))[0] ?? Date.now()) >>> 0;
    if (this.charge.status === 'illisible') this.store.ecarter();
    this.save = nouvelleSauvegarde(new Date(), nom, graine, apparence);
    this.charge = { status: 'ok', save: this.save };
    this.save.etat = appliquer(this.save.etat, { type: 'scene', id: 'P1' }, new Date().toISOString()).etat;
    if (depart) this.save.etat = depart(this.save.etat);
    this.persist();
    this.detruireVille();
    void this.decisionQuai.then(() => this.entrerVille(true));
  }

  private continuer(): void {
    const s = this.save;
    if (!s) return;
    if (s.duel) { this.reprendreDuel(s.duel); return; }
    // reprise : la ville se relit telle qu'elle était, sans point de décision (un rechargement ne fait pas re-tirer)
    void this.decisionQuai.then(() => this.entrerVille(false, undefined, true));
  }

  // ------------------------------------------------------------------ la ville

  private lookJoueur(): string {
    return idJoueur(this.etat.affiliation ?? 'gris', this.save?.profil.apparence);
  }

  private posesDe(id: IlotId): Pose[] {
    let out = poses(this.save!.directeur, this.etat, id, this.quaiRangs);
    // P5 : le premier émissaire « fend la foule » sur le Quai ; il rejoint sa maison après la scène du choix (P6).
    const e = this.etat;
    if (e.premier && e.affiliation === null && !e.scenes.includes('P6')) {
      const em = emissaire(e.premier);
      if (id === 'quai') {
        out = out.filter((p) => p.apparence !== em.apparence);
        out.push({ id: `emissaire-${e.premier}`, apparence: em.apparence, nom: em.nom, at: { x: 13.6, z: 0.9 }, facing: 'gauche', repere: '!', genre: 'structurante' });
      } else if (id === em.ilot) out = out.filter((p) => p.apparence !== em.apparence);
    }
    // M11-A : Kaï surgit (événement fixe) : il quitte sa place de bras droit le temps de la scène
    if (this.rivalScene && this.town?.ilotId() === id) {
      out = out.filter((p) => p.apparence !== 'braise');
      out.push({ id: `rival:${this.rivalScene.id}`, apparence: 'braise', nom: 'Kaï', at: this.rivalScene.at, facing: this.rivalScene.facing, repere: null, genre: 'rival' });
    }
    // La foule du prologue (P4, P5) : passants arrêtés autour du lieu du duel, jusqu'au choix de la voie.
    if (id === 'quai' && this.etat.prologue !== null && this.etat.affiliation === null) {
      for (const f of FOULE) if (!out.some((p) => p.apparence === f.apparence)) out.push({ id: f.id, apparence: f.apparence, nom: f.nom, at: f.at, facing: f.facing, repere: null, genre: 'ambiance' });
    }
    return out;
  }

  /** Point de décision du directeur des rencontres (entrée dans un îlot, retour d'un duel). */
  private decider(id: IlotId): void {
    const r = decider(this.save!.directeur, this.etat, id, this.quaiRangs, { rivalFixe: true });
    this.save!.directeur = r.directeur;
    this.persist();
  }

  private creerVille(reprise = false): void {
    const q = new URLSearchParams(location.search);
    this.host = document.createElement('div');
    this.host.className = 'ville-host demo';
    document.body.insertBefore(this.host, this.d.shellHost);
    this.look = this.lookJoueur();
    // la Grande Cour n'existe que dans la ville en rangs : dans la ville d'aujourd'hui, on repart du Quai ; de même d'un
    // quartier ajouté qui n'est pas (ou plus) ouvert (ADR 028, « Deuxième reprise »)
    const ici = this.save!.ville.ilot;
    if ((!this.quaiRangs && ici === 'cour') || (QUARTIERS_AJOUTES.includes(ici) && !this.ouverts.has(ici))) this.save!.ville = { ilot: 'quai', pos: null };
    const at = this.save!.ville.ilot;
    if (!reprise) this.decider(at);
    if (!webglAvailable()) {
      this.host.remove();
      this.host = null;
      throw new Error('WebGL indisponible');
    }
    this.town = createTown({
      host: this.host, artSeed: this.params.artSeed, camera: 'frontale', player: this.look, ilot: at, spawn: 'arrivee',
      freeze: this.params.freeze, reducedMotion: this.params.reducedMotion,
      sprites: spritePolicy(this.params.qa, q.get('sprites')), decors: decorPolicy(this.params.qa, q.get('decors')), rig: parseRig(q.get('rig')),
      ilotDefOf: (id) => ilotAventure(id, this.posesDe(id), this.quaiRangs, this.ouverts),
      ...(this.quaiRangs ? { decorsManifest: MANIFESTE_RANGS } : {}),
      onInteract: (z) => this.interagir(z),
      onMenu: () => this.menu(),
    });
    this.posesAffichees = this.cle(at);
    const pos = this.save!.ville.pos;
    if (pos && !blocked(this.town.ilot, pos)) this.town.place(pos);
    this.bubble = promptBubble(this.town, () => { const z = this.town?.zone(); if (z) this.interagir(z); }, (z) => z.label);
  }

  private detruireVille(): void {
    // M11-A : une rencontre forcée ne survit pas à sa ville (jamais de menu bloqué)
    this.force = null;
    this.rivalScene = null;
    this.alerte = null;
    this.cine?.passer();
    this.cine = null;
    this.cadreGarde = false;
    this.sceneBandes = false;
    this.bandesCine?.replier(true);
    cancelAnimationFrame(this.raf);
    this.town?.dispose();
    this.host?.remove();
    this.bubble?.el.remove();
    this.town = null;
    this.host = null;
    this.bubble = null;
  }

  private cacherVille(): void {
    // M11 : pas de cinématique ni de cadre gardé derrière un autre écran (la caméra revient au joueur, sans mouvement)
    const garde = this.cadreGarde || !!this.cine;
    this.cadreGarde = false;
    this.cine?.passer();
    this.fermerDialogue();
    this.fermerModal();
    this.sceneBandes = false;
    this.bandesCine?.replier(true);
    if (garde) this.town?.cadrer(null, true);
    // M13 : hors de la ville, le combo du Fanal se tait et la musique sort du focus
    son().musique.source('fanal', null, 0);
    son().musique.focus(false);
    this.recit = false;
    this.bouge = 0;
    if (!this.town || this.host?.hidden) return;
    this.memoriser();
    cancelAnimationFrame(this.raf);
    this.town.setPaused(true);
    this.host!.hidden = true;
    if (this.bubble) this.bubble.el.hidden = true;
  }

  /**
   * Entrée (ou retour) dans la ville ; `spawn` : point d'apparition (devant un personnage) au retour d'un duel ;
   * `reprise` : « Continuer » (la ville se relit sans point de décision, M10-E).
   */
  entrerVille(arrivee: boolean, spawn?: string, reprise = false): void {
    // le Quai (en rangs ou en secours) se décide avant de construire la ville : quelques instants au lancement
    if (!this.quaiDecide) { void this.decisionQuai.then(() => this.entrerVille(arrivee, spawn, reprise)); return; }
    this.ecran = 'ville';
    this.d.app.hidden = true;
    this.d.arena()?.setPaused(true);
    if (this.town && this.look !== this.lookJoueur()) this.detruireVille();
    if (!this.town) {
      try { this.creerVille(reprise); } catch (err) {
        // Sans WebGL (navigateur ou poste qui le refuse), pas de ville : le prototype le dit au lieu de rester bloqué.
        console.warn('Ville indisponible', err);
        this.titre();
        this.toast('Le mode Aventure demande WebGL (la ville ne peut pas s’afficher sur ce poste).');
        return;
      }
    }
    else {
      if (!reprise) this.decider(this.town.ilotId());
      this.town.setPaused(false);
      this.host!.hidden = false;
      this.rafraichir(spawn);
    }
    if (spawn && this.town) { const sp = this.town.ilot.spawns[spawn]; if (sp) this.town.place(sp, sp.face); }
    // M11-A : point de décision du rival (pas à la reprise) ; la vue se réarme sur une image calme
    this.vue.armee = false;
    if (!reprise) this.pointDecision = { retourKai: this.retourKai };
    this.retourKai = false;
    this.hud = this.renderHud();
    this.ecranShell('scr-ville av-ville', this.hud);
    this.bubble!.el.hidden = false;
    cancelAnimationFrame(this.raf);
    son().ambiance(ambianceIlot(this.town?.ilotId() ?? 'quai'));
    let phase = 0;
    const loop = () => {
      this.raf = requestAnimationFrame(loop);
      // M11-E : un pas à chaque demi-foulée du joueur qui marche
      const w = this.town?.walker();
      if (w?.moving && Math.floor(w.phase * 2) !== Math.floor(phase * 2)) son().jouer('pas');
      phase = w?.phase ?? 0;
      if (!this.dialog && !this.modal) this.bubble?.update(); else this.bubble!.el.hidden = true;
      this.majHud();
      this.tickMonde();
      this.majMusique();
    };
    loop();
    if (arrivee && !this.arrivee(this.town?.ilotId() ?? 'quai')) this.carton('Le Quai', 'soir de tournoi');
    // M11 : scènes d'entrée (chef vaincu, titre, carton de chapitre), jamais à la reprise
    if (!reprise && !arrivee) void this.scenesEntree();
    else this.sceneEntree = null;
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
    const m: Record<string, '!' | '?' | 'vu' | null> = {};
    for (const p of this.posesDe(this.town.ilotId())) m[p.apparence] = p.repere;
    if (this.alerte) m[this.alerte] = 'vu';
    this.town.setMarkers(m);
  }

  private renderHud(): HTMLElement {
    const t = this.town!;
    const b = (label: string, key: string, run: () => void) => h('button', { class: 'ville-btn', type: 'button', 'data-key': key, onclick: (e: Event) => { (e.currentTarget as HTMLElement).blur(); run(); } }, label);
    return h('div', { class: 'ville-hud' },
      h('div', { class: 'ville-place' }, h('b', { 'data-key': 'ville-place' }, capital(t.ilot.name)), h('small', null, 'la nuit · aventure')),
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
    this.enVoyage = true;
    son().jouer('voyage');
    const veil = h('div', { class: 'ville-fade' });
    document.body.append(veil);
    const still = this.params.reducedMotion || this.params.freeze;
    // M11 : une première visite (une sauvegarde d'avant les cinématiques n'en rejoue pas une déjà faite)
    const premiere = !this.etat.visites.includes(to);
    const swap = () => {
      this.decider(to);
      town.goTo(to, spawn);
      this.posesAffichees = this.cle(to);
      this.marquer();
      this.save!.ville = { ilot: to, pos: { ...town.walker().pos } };
      this.faire({ type: 'visite', lieu: to });
      town.setInputLocked(false);
      this.enVoyage = false;
      son().ambiance(ambianceIlot(to));
      this.vue.armee = false;
      this.pointDecision = { retourKai: false };
      // M11 : première arrivée dans ce quartier, sous le fondu (le premier plan est coupé avant qu'il se lève)
      if (premiere) this.arrivee(to);
      if (still) { veil.remove(); return; }
      veil.classList.add('out');
      setTimeout(() => veil.remove(), 420);
    };
    if (still) { swap(); return; }
    requestAnimationFrame(() => veil.classList.add('in'));
    setTimeout(swap, 300);
  }

  // ------------------------------------------------------------------ M11 : cinématiques runtime (docs/m11/07_CINEMATIQUES.md)

  /** Cinématiques jouées ? Permises par l'adresse (en QA, seulement avec `?cine=1`) et pas coupées dans le menu. */
  private get cineActives(): boolean { return cinePermise(location.search) && lireCine(stockageLocal()); }

  /** Joue une cinématique sur la ville (le monde attend pendant ce temps) ; résolu à la fin. */
  private async jouerCine(o: { bandes: boolean; garder?: boolean; carton?: { lieu: string; ligne: string } }, plans: Parameters<Cinema['jouer']>[0], avant?: Promise<void>): Promise<void> {
    const t = this.town;
    if (!t) return;
    this.cine?.passer();
    const lent = this.params.qa ? Number(new URLSearchParams(location.search).get('cineLent')) : NaN;
    const c = new Cinema(t, { fige: this.params.freeze, reduit: this.params.reducedMotion, ...(Number.isFinite(lent) && lent > 0 ? { lent } : {}), ...o, bandes: o.bandes ? this.bandesEcran() : null });
    this.cine = c;
    t.setInputLocked(true);
    try {
      // le quartier montré (feuilles et décor prêts) avant le premier plan ; une cinématique passée entre-temps ne joue rien
      if (avant) await avant;
      if (!c.passe && this.town === t) await c.jouer(plans);
    } finally {
      if (this.cine === c) this.cine = null;
      if (this.town === t) {
        // le dernier cadre est gardé pour le dialogue qui suit ; la ville cachée entre-temps : caméra rendue au joueur
        if (o.garder && this.ecran === 'ville' && !this.host?.hidden) this.cadreGarde = true;
        else if (o.garder) t.cadrer(null, true);
        if (!this.dialog && !this.modal && !this.force) t.setInputLocked(false);
      }
    }
  }

  /**
   * Première arrivée dans un quartier (une fois par aventure, mémoire `cinematiques`) : travelling le long du premier rang
   * jusqu'au joueur, carton du lieu. Faux si elle n'est pas jouée (déjà vue, coupée, ou en QA sans `?cine=1`).
   */
  private arrivee(id: IlotId): boolean {
    const t = this.town;
    const s = this.save;
    if (!t || !s || !this.cineActives || !arriveeAJouer(id, s.cinematiques)) return false;
    s.cinematiques = [...(s.cinematiques ?? []), `lieu-${id}`];
    this.persist();
    void this.jouerCine({ bandes: true, carton: { lieu: capital(t.ilot.name), ligne: LIGNES_LIEU[id] } }, plansArrivee(t.walker().pos, t.cameraParams()), t.ready());
    return true;
  }

  private bandesEcran(): Bandes {
    this.bandesCine ??= new Bandes(this.params.reducedMotion || this.params.freeze);
    return this.bandesCine;
  }

  /** Une scène du récit, une fois par aventure : vrai si elle est à jouer (cinématiques actives, pas encore vue) ; mémorisée. */
  private scene(id: CinematiqueId): boolean {
    const s = this.save;
    if (!s || !this.town || !this.cineActives || !aJouer(id, s.cinematiques)) return false;
    s.cinematiques = [...(s.cinematiques ?? []), id];
    this.persist();
    // M13 : une scène du récit prend la musique du récit (contrat 2, §3) ; un carton de chapitre a son jingle
    if (id !== 'rival' && id !== 'guetteur') { this.recit = true; this.recitVu = performance.now(); }
    if (id.startsWith('chapitre-')) son().musique.jingle('chapitre');
    return true;
  }

  /**
   * M13 : la musique de la ville, redite à chaque image (le chef ne fait rien si rien ne change) : la version du quartier
   * arrangée selon le chapitre (la ville qui grandit), le récit pendant une scène, le focus sous un dialogue ou un écran,
   * le combo du Fanal selon la distance du joueur à sa porte.
   */
  private majMusique(): void {
    if (this.ecran !== 'ville' || !this.town) return;
    const m = son().musique;
    const actif = !!this.cine || !!this.dialog;
    if (this.recit && actif) this.recitVu = performance.now();
    // une scène se termine quand ni cinématique ni dialogue ne l'a tenue depuis une seconde et demie (entre deux plans)
    if (this.recit && !actif && performance.now() - this.recitVu > 1500) this.recit = false;
    const ilot = this.town.ilotId();
    const maintenant = performance.now();
    if (!this.bouge || this.town.walker().moving || this.dialog || this.modal || this.cine) this.bouge = maintenant;
    const repos = maintenant - this.bouge > REPOS_VILLE_S * 1000;
    // Kaï qui surgit : son thème entre (la rythmique seule), et continue dans le duel qui suit sans recommencer
    const kai = this.force?.kind === 'rival';
    m.vouloir(kai ? { version: 'V-1', couches: { melodie: 0, tension: 0, cuivres: 0 } } : this.recit ? { version: 'I-3' } : consigneVille(ilot, numeroChapitre(chapitreDetaille(this.etat)), repos));
    m.focus((!!this.dialog && !this.recit && !this.sansFocus) || !!this.modal);
    const x = this.recit ? null : proximiteFanal(ilot, this.town.walker().pos);
    m.source('fanal', x === null ? null : 'I-2', x ?? 0);
  }

  /** Position d'un personnage de l'îlot courant (identifiant de personnalité), ou null. */
  private ou(apparence: string): Vec2 | null { return this.town?.npcAt(apparence) ?? null; }

  /**
   * À l'entrée en ville (pas à la reprise) : la scène en attente (chef vaincu, titre), puis le carton du chapitre s'il a
   * changé ; le monde attend pendant ce temps (un point de décision de Kaï se joue ensuite).
   */
  private async scenesEntree(): Promise<void> {
    const sc = this.sceneEntree;
    this.sceneEntree = null;
    if (sc) await sc();
    const t = this.town;
    const ch = this.save ? chapitreDetaille(this.etat) : null;
    if (!t || !ch || !estChapitreCarton(ch) || this.dialog || this.modal || this.force || !this.scene(`chapitre-${ch}`)) return;
    const c = CARTONS_CHAPITRE[ch];
    await this.jouerCine({ bandes: true, carton: { lieu: c.titre, ligne: c.ligne } }, plansChapitre(t.walker().pos, t.cameraParams()), t.ready());
  }

  // ------------------------------------------------------------------ M11-A : rencontres en vue, rival en événements fixes

  /**
   * À chaque image de la ville : le point de décision du rival (s'il en attend un), puis la vue des guetteurs (front
   * montant). Rien pendant un dialogue, une fenêtre, un fondu ou une rencontre forcée (contrats 1 et 2).
   */
  private tickMonde(): void {
    const t = this.town;
    if (!this.mondeActif) { this.pointDecision = null; return; }
    if (this.ecran !== 'ville' || !t || !this.save || this.dialog || this.modal || this.force || this.enVoyage || this.cine) { this.vue.armee = false; return; }
    if (this.pointDecision) {
      const pd = this.pointDecision;
      this.pointDecision = null;
      const k = evenementRival(this.etat, t.ilotId(), this.quaiRangs, pd.retourKai);
      if (k) { void this.surgirRival(k); return; }
      this.vue.armee = false;
    }
    const gs = guetteursActifs(this.save.directeur, this.etat, this.posesDe(t.ilotId()));
    const r = detecter(t.ilot, gs, t.walker().pos, this.vue.armee ? this.vue.dedans : new Set(gs.map((g) => g.id)));
    this.vue = { armee: true, dedans: r.dedans };
    if (r.repere) void this.repere(r.repere);
  }

  /**
   * Rencontres forcées actives ? Toujours dans le jeu ; en QA (`?qa=1`) seulement avec `?vue=1`, pour que les parcours
   * automatisés d'avant M11 restent déterministes (aucun duel imposé pendant qu'ils marchent).
   */
  private get mondeActif(): boolean { return !this.params.qa || new URLSearchParams(location.search).get('vue') === '1'; }

  /** Pause de la bulle « ! » ; en QA, `?vuePause=<ms>` la prolonge (captures de la bulle en rendu logiciel). */
  private pauseAlerte(ms: number): number {
    const q = this.params.qa ? Number(new URLSearchParams(location.search).get('vuePause')) : NaN;
    return Number.isFinite(q) && q > 0 ? q : ms;
  }

  private attendre(ms: number): Promise<void> {
    // une pause, pas une animation : gardée avec le mouvement réduit (la bulle « ! » reste lisible), pas en temps figé
    return this.params.freeze || ms <= 0 ? Promise.resolve() : new Promise((res) => setTimeout(res, ms));
  }

  /** Un guetteur repère le joueur : « ! », il vient, il défie (duel forcé ; contrat 1, §4). */
  private async repere(p: Pose): Promise<void> {
    const t = this.town!;
    this.force = { kind: 'vue', id: p.id, apparence: p.apparence };
    t.setInputLocked(true);
    this.alerte = p.apparence;
    this.marquer();
    son().jouer('repere');
    await this.attendre(this.pauseAlerte(450));
    if (this.town !== t || this.force?.id !== p.id) return;
    const joueur = { ...t.walker().pos };
    const to = pointApproche(t.ilot, p.at, joueur);
    t.place(joueur, regardVers(joueur, to));
    const marche = () => t.walkNpc(p.apparence, to, 1.6, regardVers(to, joueur));
    // M11 : plan court sur les deux personnages pendant qu'il vient (sans bandes) ; le dialogue s'ouvre sur ce cadre
    if (this.cineActives) await this.jouerCine({ bandes: false, garder: true }, plansGuetteur(to, joueur).map((pl) => ({ ...pl, action: marche, finir: () => { void t.walkNpc(p.apparence, to, 1000, regardVers(to, joueur)); } })));
    else await marche();
    if (this.town !== t || this.force?.id !== p.id) return;
    this.alerte = null;
    this.marquer();
    const r = rencontreDef(p.id)!;
    this.dire(capital(r.nom), this.ligneVue(p.id), [
      { label: 'Relever le défi', key: 'dlg-duel', primary: true, run: () => this.preparer(duelFacultatif(p.id, this.etat, this.prochaineGraine(), this.save!.historique), true) },
    ], r.apparence, true);
  }

  /** Kaï surgit (événement fixe, contrat 2, §3) : il apparaît à 3,5 m, court au joueur, défie (ou, K6, tend la main). */
  private async surgirRival(k: EvenementRival): Promise<void> {
    const t = this.town!;
    const joueur = { ...t.walker().pos };
    const sp = t.ilot.spawns.arrivee!;
    const at = pointSurgissement(t.ilot, joueur) ?? { x: sp.x, z: sp.z };
    this.force = { kind: 'rival', id: k.id, apparence: 'braise' };
    this.rivalScene = { id: k.id, at, facing: regardVers(at, joueur) };
    this.rafraichir();
    t.place(joueur, regardVers(joueur, at));
    t.setInputLocked(true);
    this.alerte = 'braise';
    this.marquer();
    son().jouer('rival');
    const to = pointApproche(t.ilot, at, joueur);
    if (this.cineActives) {
      // M11 : la caméra se porte sur Kaï pendant la bulle « ! », puis prend les deux personnages pendant qu'il court
      const [point, duo] = plansRival(at, to, joueur, this.pauseAlerte(DUREES.rivalPoint));
      await this.jouerCine({ bandes: true, garder: true }, [point!, {
        ...duo!, action: () => t.walkNpc('braise', to, 3.2, regardVers(to, joueur)), finir: () => { void t.walkNpc('braise', to, 1000, regardVers(to, joueur)); },
      }]);
    } else {
      await this.attendre(this.pauseAlerte(500));
      if (this.town !== t || this.force?.id !== k.id) return;
      await t.walkNpc('braise', to, 3.2, regardVers(to, joueur));
    }
    if (this.town !== t || this.force?.id !== k.id) return;
    this.alerte = null;
    this.marquer();
    if (!k.duel) {
      this.dire('Kaï, la Braise du quai', this.ligneRival(k.id), [{ label: 'Fermer', key: 'dlg-close', primary: true, run: () => {
        this.faire({ type: 'rival', id: k.id, issue: 'scene' });
        this.force = null;
        this.rivalScene = null;
        this.fermerDialogue();
      } }], 'braise', true);
      return;
    }
    this.dire(`Kaï — ${k.titre}`, this.ligneRival(k.id), [
      { label: 'Relever le défi', key: 'dlg-duel', primary: true, run: () => this.preparer(duelRival(k.id, this.etat, this.prochaineGraine()), true) },
    ], 'braise', true);
  }

  /**
   * M11-C : une réplique du catalogue (`repliques.ts`) pour ce locuteur et ce moment, selon les faits publics (chapitre,
   * voie, tempérament, duels joués contre lui) ; jamais deux fois de suite la même (mémoire `dialogues` de la sauvegarde).
   */
  replique(locuteur: string, moment: Moment, secours = ''): string {
    const s = this.save!;
    const e = this.etat;
    const kai = locuteur === 'kai';
    // les compétitions sont notées `epreuve:<Famille>` dans l'historique ; leur locuteur, `epreuve-<Famille>`
    const rencontreId = locuteur.replace(/^(epreuve|joute)-/, '$1:');
    const histo = s.historique.filter((h) => (kai ? h.rencontre === 'rival-kai' || h.rencontre.startsWith('rival:') || h.rencontre === 'prologue' || h.rencontre === 'brasDroit-Cendre' : h.rencontre === rencontreId));
    const vus = s.directeur.vus?.[locuteur];
    const c: Contexte = {
      moment, chapitre: chapitreDetaille(e), voie: e.affiliation,
      temperament: temperamentDe(locuteur, e, s.historique) ?? (locuteur.startsWith('rumeur') || locuteur === 'heraut' ? null : temperamentParole(locuteur, e, s.historique)),
      joues: histo.filter((h) => h.issue !== 'abandon').length,
      victoires: histo.filter((h) => h.issue === 'victoire').length,
      defaites: histo.filter((h) => h.issue === 'defaite').length,
      dernier: vus?.issue ?? histo[histo.length - 1]?.issue ?? null,
      chefs: FAMILIES.filter((f) => e.familles[f] === 'chef').length,
      cheffe: !!e.affiliation && cheffe(e.affiliation),
      ...(this.town ? { ilot: this.town.ilotId() } : {}),
    };
    const r = choisir(locuteur, c, s.dialogues ?? memoireVide(), s.profil.graine);
    if (!r) return secours;
    s.dialogues = r.memo;
    this.persist();
    return r.texte;
  }

  /** Réplique d'ouverture d'un duel forcé par un guetteur (catalogue, moment « vue »). */
  private ligneVue(id: string): string {
    return this.replique(id, 'vue', '« Hé, toi ! Nos regards se sont croisés : chez nous, ça veut dire une partie. »');
  }

  /** Réplique d'un événement fixe du rival (catalogue, moment « rival »). */
  private ligneRival(_id: KId): string {
    return this.replique('kai', 'rival', '« On se retrouve. Un duel ? »');
  }

  /** QA : pose un PNJ facultatif dans l'îlot courant, à sa première place de cet îlot (parcours déterministe). */
  qaGuetteur(id: string): boolean {
    if (!this.params.qa || !this.town || !this.save) return false;
    const r = rencontreDef(id);
    const il = this.town.ilotId();
    const place = r ? r.lieux.findIndex((l) => l.ilot === il && (this.quaiRangs || !l.rangs)) : -1;
    if (!r || place < 0) return false;
    const d = structuredClone(this.save.directeur);
    d.actives[il] = [{ id, place }];
    d.partants = (d.partants ?? []).filter((x) => x !== id);
    this.save.directeur = d;
    this.persist();
    this.rafraichir();
    return true;
  }

  /** QA : état de la vue (guetteurs, ceux qui voient le joueur, rencontre forcée). */
  qaVue(): { guetteurs: Array<{ id: string; at: Vec2; facing: Facing }>; dedans: string[]; armee: boolean; force: AventureApp['force']; rival: string | null } {
    const t = this.town;
    const gs = t && this.save ? guetteursActifs(this.save.directeur, this.etat, this.posesDe(t.ilotId())) : [];
    return { guetteurs: gs.map((g) => ({ id: g.id, at: g.at, facing: g.facing })), dedans: [...this.vue.dedans], armee: this.vue.armee, force: this.force, rival: this.rivalScene?.id ?? null };
  }

  // ------------------------------------------------------------------ interactions

  interagir(z: Zone): void {
    if (this.dialog || this.modal || this.force) return;
    if (z.kind === 'parler' && z.target) return this.parler(z.target);
    if (z.kind === 'sortie') {
      const exit = ilotBase(this.town!.ilotId(), this.quaiRangs, this.ouverts).exits[z.id];
      if (exit) return this.voyager(exit.to, exit.spawn);
    }
    if (z.kind === 'porte' && z.target === 'salle') return this.salleDesBannieres();
    if (z.kind === 'porte' && z.target === 'fanal') return this.dire('Le Fanal', `La taverne du port, maison de la Ronce. ${this.etat.affiliation ? (this.quaiRangs ? 'Gaspard et Maëlle y tiennent la maison ; Mère Aubépine veille plus haut, dans la ruelle des Lanternes.' : 'Gaspard, Maëlle et Mère Aubépine y tiennent la maison.') : 'On dit que la Ronce y garde le feu du port.'}`, [fermer(this)]);
    if (z.kind === 'porte' && z.target === 'arene') return this.championnatDialog();
    // Quai en rangs : les balises des passages ne sont que des repères (leur nom s'affiche en approchant)
    if (z.kind === 'info' && z.target?.startsWith('rang-')) return;
    const INFO: Record<string, string> = {
      fontaine: 'La fontaine du Voile : les duellistes y jettent une carte usée avant un grand duel. Lior, l’émissaire du Voile, n’est jamais loin.',
      'place-halle': 'La place de la Halle : on y joue aux cartes entre deux livraisons. Quand la Cendre ouvre son Épreuve, c’est ici.',
      'placette-puits': 'La placette du Puits : on y tire l’eau et les défis. La Ronce y tient sa Joute.',
      'cour-chapelle': 'La cour de la Chapelle, le cœur du Quai. Bran, le Premier Feu, y attend les duellistes qui montent jusqu’à lui. Par la porte cochère, on monte vers la Grande Cour.',
      // M10-E : les places du Parvis et des Ruelles en rangs, et la Grande Cour
      'place-paris': 'La place des Paris : on y mise sur les duels de l’arène, et les rumeurs y vont plus vite que les cartes.',
      'placette-tableau': 'La placette du Tableau : les annonces du Tournoi y sont épinglées, les défis aussi.',
      'cour-champions': 'La cour des Champions, au pied de l’arène : les duellistes y attendent leur tour. Par la porte cochère, on monte vers la Grande Cour.',
      'placette-olivier': 'La placette de l’Olivier : un banc, un vieil arbre, et le calme des Ruelles entre deux lectures.',
      'cour-guilde': 'La cour de la Guilde des joueurs : on y joue toute la nuit sous les arcades. Par la porte cochère, on monte vers la Grande Cour.',
      monument: 'Le monument des Quatre Voies : quatre bras, quatre familles, une seule fontaine. On y donne rendez-vous avant les grands duels.',
      estrade: 'L’estrade des duels publics : la ville entière vient y voir les grands duels, et c’est ici que le Championnat proclame son vainqueur.',
      tableau: 'Le tableau des annonces : le Championnat des Champions s’ouvre aux duellistes qui ont vaincu les quatre chefs.',
      belvedere: 'Le Belvédère : la ville haute, au-delà de la balustrade. Toutes les ruelles finissent par monter jusqu’ici.',
      // finalisation de la ville (passe 136) : les places de la Place du Fanal et de la Ville haute (aucune figure n'y est
      // déplacée : la Ronce reçoit toujours au Fanal, l'Astre au Parvis)
      'placette-filets': 'La placette des Filets : on y raccommode les filets autour du puits, et on y joue aux cartes quand la marée est basse.',
      'cour-ronce': 'La cour de la Ronce, au cœur du Port, devant la vieille maison de la famille. On y parle bas et on y joue longtemps ; mais c’est au Fanal, sur le Quai, que la Ronce reçoit les duellistes.',
      'jardin-spheres': 'Le jardin des Sphères : une fontaine, des cadrans, et des joueurs qui calculent leur coup comme on calcule une éclipse.',
      'parvis-observatoire': 'Le parvis de l’Observatoire, au sommet de la ville : l’Astre y observe le ciel et y tient le registre des grands duels. Ses duellistes, eux, se mesurent au Parvis, devant l’arène.',
    };
    this.dire(z.label, INFO[z.id] ?? 'Rien de plus ici.', [fermer(this)]);
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
    if (id === 'heraut') return this.heraut();
    const r = rencontreDef(id);
    if (r?.genre === 'ambiance') return this.rumeur(id);
    if (r) return this.facultatif(id);
  }

  /** Les rumeurs de la ville (M10-E, ambiance) : une réplique qui suit l'aventure (faits publics), sans duel ; le passant repart. */
  private rumeur(id: string): void {
    const r = rencontreDef(id)!;
    // M11-C : les rumeurs viennent du catalogue (chapitre, îlot ; jamais deux fois de suite la même)
    const ligne = this.replique(id, 'rumeur', '« Ce soir, toute la ville joue aux cartes. »');
    // le passant reste pendant qu'il parle (la ville se relit à la fermeture du dialogue), puis repart (passe 136 : il
    // disparaissait dès l'ouverture, `dire` relisant la ville avant d'ouvrir)
    this.dire(capital(r.nom), ligne, [fermer(this)], r.apparence);
    this.save!.directeur = conclure(this.save!.directeur, id, true);
    this.persist();
  }

  /**
   * Le héraut du Tournoi, dans la Grande Cour (M10-E) : à la première rencontre, l'ouverture du Championnat devant
   * l'estrade ; ensuite, il en mène les duels comme la porte de l'arène ; après le titre, il proclame.
   */
  private heraut(): void {
    const c = this.etat.competitions.championnat;
    if (manche(this.etat.competitions) === 'titre') return this.dire('Le héraut du Tournoi', this.replique('heraut', 'parole', '« Personne en ville ne joue mieux que vous. »'), [fermer(this)], 'pnj-commis-40');
    const ouverture = !Object.keys(c.poule).length && !c.dernier && !c.miroir && !c.finale.length;
    if (ouverture) {
      // M11 (cinématiques) : la première fois, plan large de la Grande Cour jusqu'au héraut ; le dialogue sur les deux
      const t = this.town;
      const hr = this.ou('pnj-commis-40');
      const j = t ? { ...t.walker().pos } : null;
      const ouvrir = () => this.dire('Le Championnat des Champions', '« Duellistes de la ville ! » Sur l’estrade, les quatre chefs lèvent leur bannière. « Quiconque a vaincu les quatre maisons peut prétendre au titre : quatre bannières, un miroir, une finale. » La foule de la Grande Cour se tourne vers vous.', [
        { label: 'S’inscrire', key: 'dlg-next', primary: true, run: () => this.championnatDialog() },
        { label: 'Plus tard', key: 'dlg-close', run: () => this.fermerDialogue() },
      ], 'pnj-commis-40', false, hr && j ? cadreDialogue(hr, j) : null);
      if (t && j && this.scene('championnat')) {
        void this.jouerCine({ bandes: true, carton: { lieu: 'Le Championnat des Champions', ligne: 'quatre bannières, un miroir, une finale' } }, plansTitre(hr, j, t.cameraParams())).then(ouvrir);
        return;
      }
      return ouvrir();
    }
    this.championnatDialog();
  }

  private kaiPrologue(): void {
    const p = personnalite(KAI_PROLOGUE.apparence, { nom: KAI_PROLOGUE.nom, titre: KAI_PROLOGUE.titre });
    const deja = this.etat.scenes.includes('P2');
    this.faire({ type: 'scene', id: 'P2' });
    // M11 (cinématiques) : la première fois, la caméra se porte sur Kaï aux braseros ; le dialogue s'ouvre sur les deux
    const t = this.town;
    const kai = this.ou(KAI_PROLOGUE.apparence) ?? KAI_PROLOGUE.at;
    const cadre = t ? cadreDialogue(kai, t.walker().pos) : null;
    const ouvrir = () => this.dire(`${p.name}, ${p.title}`, deja
      ? 'Alors, tu te décides ? La foule commence à regarder.'
      : 'Toi aussi, ils t’ont fermé la porte du tournoi ? Cartes grises, pas de famille… Alors jouons ici, sur le Quai. Qu’ils voient ce qu’ils ratent.', [
      { label: 'Relever le défi', key: 'dlg-duel', primary: true, run: () => this.preparer(duelPrologue(this.prochaineGraine(), this.etat)) },
      { label: 'Pas maintenant', key: 'dlg-close', run: () => this.fermerDialogue() },
    ], KAI_PROLOGUE.apparence, false, cadre);
    if (!deja && this.scene('prologue-kai')) { void this.jouerCine({ bandes: true }, plansKaiPrologue(kai)).then(ouvrir); return; }
    ouvrir();
  }

  /** P5–P6 : l'émissaire présente sa famille ; Accepter (→ confirmation), Différer, Chercher une autre voie. */
  private emissaireDialog(f: Family, cadre?: CadreDialogue | null): void {
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
    ], fig.apparence, false, cadre);
  }

  /** Écran de confirmation (ADR 029 §3) : identité, philosophie, gains immédiats, suite, ce qui ne change pas. */
  private confirmation(f: Family, changement = false): void {
    this.fermerDialogue();
    const m = MAISONS[f];
    const [c, b, ch] = ROLES.map((r) => figureDe(f, r));
    const quittee = this.etat.affiliation;
    const panel = h('div', { class: `av-confirm fam-${f}`, 'data-key': 'av-confirmation' },
      h('div', { class: 'av-confirm-head' }, h('span', { class: `av-emb fam-${f}`, html: emblemSvg(f, 46) }), h('div', null, h('h2', null, `Rejoindre ${la(f)}`), h('p', { class: 'av-devise' }, `${m.nom} · ${m.devise}`))),
      h('p', null, m.credo),
      h('h3', null, 'Vous recevrez tout de suite'),
      h('div', { class: 'av-cards' }, ...[1, 2, 3, 4].map((r) => cardEl(`${f}-${r}-basic`, { artSeed: this.params.artSeed, tag: 'div' }))),
      h('p', null, `Les quatre cartes de base ${de(f)} (I à IV) : une carte grise de chaque Rang leur cède sa place dans votre deck. Et la Technique ${m.technique} (${TECHNIQUES[m.technique].text})`),
      h('h3', null, 'Ensuite'),
      h('p', null, `Défier ${c!.nom} (${roleDe(c!)}), puis ${b!.nom} (${roleDe(b!)}), puis ${ch!.nom} (${roleDe(ch!)}) : chaque lieutenant vaincu donne une variante, ${leChef(f)} donne sa Signature ∞.`),
      h('h3', null, 'Ce qui ne change pas'),
      h('p', null, `Les autres familles restent ouvertes ; quand ${leChef(f)} ${de(f)} sera ${cheffe(f) ? 'vaincue' : 'vaincu'}, vous pourrez engager leur défi à la Salle des Bannières. ${changement && quittee ? `Les cartes déjà reçues restent à vous. Vos adversaires ne comptent que les familles que vous avez rejointes ou dont vous avez engagé le défi : ${la(quittee)} ne comptera qu’à l’engagement de son défi.` : 'Jusqu’à votre premier défi de lieutenant, vous pourrez encore changer de voie.'}`),
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
      // M11 (cinématiques) : le joueur dans ses nouvelles couleurs, gros plan puis recul, carton de la voie ; le cadet
      // parle ensuite, cadré avec le joueur s'il est là
      const ouvrir = () => {
        const t = this.town;
        const at = this.ou(c.apparence);
        this.dire(`${c.nom}, ${c.titre}`, `« Te voilà des nôtres. Maintenant, montre-moi ce que valent tes nouvelles cartes : je mets en jeu ${c.enjeu.kind === 'variante' ? auChoix(c.enjeu.defId) : ''}. »`, [
          { label: `Défier ${c.nom}`, key: 'dlg-duel', primary: true, run: () => this.lancerFigure(c.id) },
          { label: 'Plus tard', key: 'dlg-close', run: () => this.fermerDialogue() },
        ], c.apparence, false, t && at ? cadreDialogue(at, t.walker().pos) : null);
      };
      const t = this.town;
      if (t && this.scene(`affiliation-${f}`)) {
        void this.jouerCine({ bandes: true, carton: { lieu: `Voie ${de(f)}`, ligne: MAISONS[f].devise.replace(/[«»]/g, '').trim() } }, plansAffiliation(t.walker().pos), t.ready()).then(ouvrir);
      } else ouvrir();
    });
  }

  private figureDialog(id: string): void {
    const fig = figure(id);
    const e = this.etat;
    // Cadet d'une autre famille, encore en invitation : changer de voie, si c'est encore possible (P-N6).
    if (fig.role === 'cadet' && e.familles[fig.famille] === 'invite' && e.affiliation) {
      const ok = peutChanger(e) && peutConfirmer({ ...e, affiliation: null }, fig.famille).ok;
      const plusTard = aGain(e.registre, `signature:${e.affiliation}`)
        ? `${cheffe(e.affiliation) ? 'Ta cheffe est tombée' : 'Ton chef est tombé'} : si tu veux nous défier, engage le défi de notre famille à la Salle des Bannières, sur le Quai.`
        : `Ta voie est engagée ; viens nous défier quand ${cheffe(e.affiliation) ? 'ta cheffe sera tombée' : 'ton chef sera tombé'}.`;
      return this.dire(`${fig.nom}, ${fig.titre}`, `« Tu as choisi ${la(e.affiliation)}. ${ok ? 'Si ce n’était pas la bonne voie, il est encore temps.' : plusTard} »`, [
        ...(ok ? [{ label: `Rejoindre ${la(fig.famille)} à la place…`, key: 'dlg-changer', run: () => this.confirmation(fig.famille, true) }] : []),
        { label: 'Au revoir', key: 'dlg-close', primary: true, run: () => this.fermerDialogue() },
      ], fig.apparence);
    }
    const st = statutDefi(e, fig);
    // avenant 09 : la revanche contre un lieutenant met en jeu la variante suivante de la carte gagnée, tant qu'il en reste ;
    // le premier défi, la variante au choix (A, B ou C)
    const suivante = fig.enjeu.kind === 'variante' ? prochaineVariante(e.registre, CATALOG[fig.enjeu.defId]!.identity) : null;
    const enjeu = st.deja
      ? (suivante ? `Revanche : en jeu, ${nomCarte(suivante)}, une autre variante de la carte gagnée.` : 'Revanche, sans récompense : vos victoires sont déjà au registre.')
      : `En jeu : ${fig.enjeu.kind === 'variante' ? auChoix(fig.enjeu.defId) : `la Signature ∞ ${de(fig.famille)}`}.`;
    if (!st.ouvert) return this.dire(`${fig.nom}, ${fig.titre}`, `« Pas encore. » ${st.raison}`, [fermer(this)], fig.apparence);
    // M11-C : au premier défi d'une figure d'une autre famille, elle a entendu parler de votre parcours
    const contexte = !st.deja && fig.famille !== e.affiliation ? this.replique(`defi-${fig.famille}`, 'defi') : '';
    this.dire(`${fig.nom}, ${fig.titre}`, `${st.deja ? this.replique(fig.id, 'revanche', ligneFigure(fig, true)) : REPLIQUES[fig.id] ?? ligneFigure(fig, false)}${contexte ? ` ${contexte}` : ''} ${enjeu}`, [
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
    this.dire(capital(r.nom), `${this.replique(`epreuve-${f}`, 'parole')} « L’Épreuve du quartier : trois de nos membres, l’un après l’autre. Une défaite, et l’on recommence. » ${st.texte} ${gagnee ? '' : `Récompense : ${nomCarte(varianteDe(f, 1))}.`}`, st.ouvert ? [
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
    this.dire(capital(r.nom), `${this.replique(`joute-${f}`, 'parole')} « La Joute de la maison se joue avec ${CONTRAINTE_JOUTE[f].texte}. » ${st.texte} ${gagnee ? '' : `Récompense : ${nomCarte(varianteDe(f, 2))}.`}`, st.ouvert ? [
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
      return this.dire('Les Quatre Bannières', `Battez trois des quatre chefs, avec une Signature différente à chaque victoire, et qui change à chaque duel (${vaincus}/3). Signature équipée : ${sig ? CATALOG[`sig-${sig}`]!.name : 'aucune'}.${choix.length ? '' : ' Aucun duel possible avec cette Signature : changez-la dans le deck.'}`, [...choix, { label: 'Ouvrir le deck', key: 'dlg-deck', run: () => { this.fermerDialogue(); this.collection(); } }, { label: 'Plus tard', key: 'dlg-close', primary: !choix.length, run: () => this.fermerDialogue() }]);
    }
    if (m === 'miroir') {
      // M10-E : le Miroir est construit sur vos deux familles les plus jouées (vos cinq derniers duels, données publiques)
      const prevu = (): DuelPrevu => duelChampionnat('miroir', this.etat, this.prochaineGraine(), undefined, this.save!.historique);
      const dom = famillesDominantes(this.save!.historique, e.affiliation);
      const kai = e.affiliation !== 'Cendre';
      const qui = kai ? 'Kaï' : figure(`brasDroit-${dom.find((f) => f !== 'Cendre') ?? 'Ronce'}`).nom;
      return this.dire('Le Miroir', `${kai ? '« On a commencé ensemble, le soir du tournoi. On finit ensemble. » Kaï a gagné sa place en demi-finale.' : `${qui} a gagné sa place en demi-finale.`} Son deck est construit sur vos deux familles les plus jouées : ${la(dom[0])} et ${la(dom[1])}.`, [
        { label: `Affronter ${qui}`, key: 'dlg-duel', primary: true, run: () => this.preparer(prevu()) },
        { label: 'Plus tard', key: 'dlg-close', run: () => this.fermerDialogue() },
      ], kai ? 'braise' : figure(`brasDroit-${dom.find((f) => f !== 'Cendre') ?? 'Ronce'}`).apparence);
    }
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
    const contreKai = this.save!.historique.filter((h) => h.rencontre === 'rival-kai' || h.rencontre.startsWith('rival:') || h.rencontre === 'prologue' || h.rencontre === 'brasDroit-Cendre');
    const gagnes = contreKai.filter((h) => h.issue === 'victoire').length;
    const ligneKai = ch === 'maison'
      ? `« Alors, ${this.etat.affiliation ? `tu as rejoint ${la(this.etat.affiliation)}` : 'toujours sans famille'} ? Moi, la Cendre m’a pris. Une partie, pour voir qui a le plus appris ? »`
      : ch === 'voies' ? `« Tu as fait tomber ${this.etat.affiliation && cheffe(this.etat.affiliation) ? 'ta cheffe' : 'ton chef'}, à ce qu’on dit. Moi, je monte aussi. ${gagnes > contreKai.length / 2 ? 'Tu mènes, mais pas pour longtemps.' : 'Et je mène, ne l’oublie pas.'} »`
      : `« Le Championnat approche. On se retrouvera là-bas, j’en suis sûr. En attendant, une dernière pour la route ? »`;
    // M10-E : les membres des familles ont la réplique de leur maison
    const MAISON: Record<Family, string> = {
      Cendre: '« Ici, on joue vite et on frappe fort. Une partie, pour voir ce que vaut ta braise ? »',
      Ronce: '« Une partie lente, comme on les aime à la Ronce ? Prends ton temps, la nuit est longue. »',
      Voile: '« Je lis déjà ton jeu… Une partie pour me prouver le contraire ? »',
      Astre: '« Les astres disaient qu’on jouerait ce soir. Une partie ? »',
    };
    const membre = id.startsWith('membre-') ? MAISON[id.slice(7) as Family] : null;
    // finalisation de la ville (passe 136) : les duels de rue du Port et de la Ville haute
    const RUE: Record<string, string> = {
      'rue-port': '« Au Port, une partie se joue entre deux marées. Une main, pour voir si tu tiens ? »',
      'rue-haute': '« Ici, on joue sous les étoiles, et on compte chaque carte. Une partie ? »',
    };
    // M11-C : les joueurs de la rue et les membres parlent selon leur tempérament et vos duels passés (catalogue)
    const texte = kai
      ? `${ligneKai} (défi facultatif, sans récompense ; vos duels contre lui : ${gagnes} victoire(s) sur ${contreKai.length})`
      : `${this.replique(id, 'parole', membre ?? RUE[id] ?? '« Une partie, pour passer le temps ? »')} (duel de rue, sans récompense)`;
    this.dire(capital(r.nom), texte, [
      { label: 'Accepter', key: 'dlg-duel', primary: true, run: () => this.preparer(duelFacultatif(id, this.etat, this.prochaineGraine(), this.save!.historique)) },
      { label: 'Refuser', key: 'dlg-close', run: () => { this.save!.directeur = conclure(this.save!.directeur, id, false); this.persist(); this.fermerDialogue(); } },
    ], r.apparence);
  }

  /**
   * Salle des Bannières (la salle de jeu de cartes) : l'engagement OFFICIEL du défi d'une autre famille (ADR 031 §4,
   * M10-D). Les quatre bannières, chacune avec son état (famille d'accueil, défi à engager, engagé, chef vaincu, ou
   * fermé avec sa raison) ; seul ce lieu engage un défi.
   */
  private salleDesBannieres(): void {
    const e = this.etat;
    if (!e.affiliation) return this.dire('La Salle des Bannières', '« Le tournoi est réservé aux duellistes des familles. Revenez quand vous appartiendrez à une Voie. » La porte reste close.', [fermer(this)]);
    this.fermerDialogue();
    const cartes = bannieres(e).map((b) => h('div', { class: `av-banniere fam-${b.famille} etat-${b.etat}`, 'data-key': `av-banniere-${b.famille}`, 'data-etat': b.etat },
      h('span', { class: `av-emb fam-${b.famille}`, html: emblemSvg(b.famille, 40) }),
      h('b', null, capital(la(b.famille))),
      h('span', { class: 'av-banniere-etat' }, b.etat === 'conquise' ? chefVaincu(b.famille) : ETAT_BANNIERE[b.etat]),
      h('small', null, b.texte),
      b.etat === 'engageable' ? h('button', { class: 'ville-btn primary', type: 'button', 'data-key': `dlg-engager-${b.famille}`, onclick: () => this.confirmationEngagement(b.famille) }, 'Engager le défi…') : null));
    this.ouvrirModal(h('div', { class: 'av-confirm av-large', 'data-key': 'av-bannieres' },
      h('h2', null, 'La Salle des Bannières'),
      h('p', null, 'Le maître de table montre les quatre bannières. « Ici, on engage officiellement le défi d’une famille. Entrer dans son quartier, parler à ses membres ou battre l’un d’eux dans la rue n’engage rien : c’est ici, et nulle part ailleurs. »'),
      h('div', { class: 'av-bannieres' }, ...cartes),
      h('p', { class: 'av-proto', 'data-key': 'av-bannieres-deck' }, `Votre deck : ${resumeDeck(e.deck)}.`),
      h('div', { class: 'ville-choices' }, h('button', { class: 'ville-btn', type: 'button', 'data-key': 'av-bannieres-fermer', onclick: () => this.fermerModal() }, 'Fermer'))));
  }

  /**
   * Écran de confirmation de l'engagement (M10-D, comme celui de l'affiliation, ADR 029 §3) : ce qui est remis, ou déjà
   * possédé (affiliation quittée : rien n'est remis une seconde fois), ce que devient le deck, la suite, ce qui ne change
   * pas. L'aperçu est calculé par la machine de l'aventure (`apercuEngagement`).
   */
  private confirmationEngagement(f: Family): void {
    const e = this.etat;
    const ap = apercuEngagement(e, f);
    if (!ap.ok) { this.toast(ap.raison); return; }
    const m = MAISONS[f];
    const [c, b, ch] = ROLES.map((r) => figureDe(f, r));
    const gb = e.registre.find((g) => g.key === `basics:${f}`);
    const enjeu = (x: typeof c) => (x!.enjeu.kind === 'variante' ? auChoix(x!.enjeu.defId) : `la Signature ∞ ${de(f)}`);
    const remis = ap.basicsDeja
      ? `Les quatre cartes de base ${de(f)} sont déjà à vous (${gb ? minuscule(origineGain(gb)) : 'registre'}) : rien n’est remis une seconde fois.${ap.techniqueDeja ? ` La Technique ${m.technique} est déjà apprise.` : ''}`
      : `Les quatre cartes de base ${de(f)} (I à IV)${ap.techniqueDeja ? ` ; la Technique ${m.technique} est déjà apprise.` : `, et la Technique ${m.technique} (${TECHNIQUES[m.technique].text})`}`;
    const deck = ap.basicsDeja
      ? `Votre deck ne change pas (${ap.neutres[0]} carte${ap.neutres[0] > 1 ? 's' : ''} grise${ap.neutres[0] > 1 ? 's' : ''}).`
      : `Une carte grise de chaque Rang cède sa place à la Basic du même Rang : ${ap.neutres[0]} → ${ap.neutres[1]} cartes grises.`;
    this.ouvrirModal(h('div', { class: `av-confirm fam-${f}`, 'data-key': 'av-engagement' },
      h('div', { class: 'av-confirm-head' }, h('span', { class: `av-emb fam-${f}`, html: emblemSvg(f, 46) }), h('div', null, h('h2', null, `Engager le défi ${de(f)}`), h('p', { class: 'av-devise' }, `${m.nom} · ${m.devise}`))),
      h('p', null, m.credo),
      h('h3', null, ap.basicsDeja ? 'Déjà à vous' : 'Vous recevrez tout de suite'),
      h('div', { class: `av-cards${ap.basicsDeja ? ' av-deja' : ''}` }, ...[1, 2, 3, 4].map((r) => cardEl(`${f}-${r}-basic`, { artSeed: this.params.artSeed, tag: 'div' }))),
      h('p', { 'data-key': 'av-engagement-basics' }, remis),
      h('h3', null, 'Votre deck'),
      h('p', { class: 'av-transition', 'data-key': 'av-engagement-deck' }, deck, ap.standard ? h('b', { class: 'av-standard' }, ` ${STANDARD}`) : null),
      h('h3', null, 'Ensuite'),
      h('p', null, `Défier ${c!.nom}, ${c!.titre} (${enjeu(c)}), puis ${b!.nom} (${enjeu(b)}), puis ${ch!.nom} (${enjeu(ch)}) ; leur maison : ${m.nom}, ${OU_ILOT[m.ilot]}. Dans le quartier, l’Épreuve (${nomCarte(varianteDe(f, 1))}) ; après le bras droit, la Joute de la maison (${nomCarte(varianteDe(f, 2))}).`),
      h('h3', null, 'Ce qui ne change pas'),
      h('p', null, `Votre famille reste ${la(e.affiliation!)}. Les autres défis restent ouverts, dans l’ordre que vous voulez ; une défaite ne ferme rien.`),
      h('div', { class: 'ville-choices' },
        h('button', { class: 'ville-btn primary', type: 'button', 'data-key': 'av-engager-confirmer', onclick: () => this.engager(f) }, 'Engager le défi'),
        h('button', { class: 'ville-btn', type: 'button', 'data-key': 'av-engager-revenir', onclick: () => this.salleDesBannieres() }, 'Revenir'))));
  }

  private engager(f: Family): void {
    const ap = apercuEngagement(this.etat, f);
    this.fermerModal();
    const gains = this.faire({ type: 'engager', famille: f });
    if (!gains) return;
    const notes = [
      ...(ap.basicsDeja ? [`Les cartes de base ${de(f)} étaient déjà à vous : rien n’est remis une seconde fois (registre des gains).`] : []),
      standardLegal(this.etat.deck, collectionDe(this.etat.registre)) ? `Votre deck : ${STANDARD}` : `Votre deck : ${resumeDeck(this.etat.deck)}.`,
    ];
    this.recompense(`Défi ${de(f)} engagé`, gains, () => this.entrerVille(false), notes);
  }

  // ------------------------------------------------------------------ duel

  private prochaineGraine(): number {
    const s = this.save!;
    if (new URLSearchParams(location.search).has('seed')) return this.params.seed;
    return duelSeed(s.profil.graine, s.compteur);
  }

  /** Préparation (dialogue) : adversaire, lieu, PV, enjeu annoncé, les deux decks ; puis le duel. */
  private preparer(prevu: DuelPrevu, forcee = false): void {
    this.fermerDialogue();
    // avenant 09 : une variante au choix (trois cartes) à la première victoire, la suivante qui manque en revanche
    const ev = enjeuVariante(this.etat, prevu.rencontre);
    const carte = (id: string) => cardEl(id, { artSeed: this.params.artSeed, tag: 'div' });
    const enjeuEl = () => ev && 'choix' in ev ? h('div', { class: 'av-enjeu' }, h('span', null, 'En jeu (première victoire) : une variante au choix, '), ...ev.choix.map(carte))
      : ev ? h('div', { class: 'av-enjeu' }, h('span', null, 'En jeu (revanche) : '), carte(ev.suivante))
      : prevu.enjeu?.startsWith('sig-') && CATALOG[prevu.enjeu] ? h('div', { class: 'av-enjeu' }, h('span', null, 'En jeu (première victoire) : '), carte(prevu.enjeu))
      : h('p', null, 'Aucune récompense en jeu.');
    const panel = h('div', { class: 'av-confirm av-prep', 'data-key': 'av-preparation' },
      h('div', { class: 'av-confirm-head' }, h('img', { class: 'ville-portrait', alt: '', src: portraitUrl(prevu.personnalite, this.params.artSeed) }), h('div', null, h('h2', null, prevu.titre), h('p', { class: 'av-devise' }, `Lieu : ${LIEU[prevu.venue]} · PV ${prevu.config.players.p1.hp} contre ${prevu.config.players.p2.hp}`))),
      enjeuEl(),
      h('p', { class: 'av-proto', 'data-key': 'av-deck-adverse' }, `Adversaire : ${prevu.note}`),
      h('p', { class: 'av-proto', 'data-key': 'av-deck-reel' }, `Votre deck : ${resumeDeck(this.etat.deck)} ; Techniques ${this.etat.deck.techniques.join(' et ')}.`),
      h('div', { class: 'ville-choices' },
        h('button', { class: 'ville-btn primary', type: 'button', 'data-key': 'av-duel-go', onclick: () => { this.fermerModal(); this.lancer(prevu); } }, 'Commencer le duel'),
        forcee ? null : h('button', { class: 'ville-btn', type: 'button', 'data-key': 'av-duel-back', onclick: () => this.fermerModal() }, 'Plus tard')),
      forcee ? h('p', { class: 'av-proto', 'data-key': 'av-duel-force' }, 'Ce duel ne se refuse pas. Vous pourrez l’abandonner depuis le menu du duel, sans rien perdre.') : null);
    this.ouvrirModal(panel, forcee);
  }

  private lancer(prevu: DuelPrevu, resume?: DuelAventure): void {
    const s = this.save!;
    let duel = resume;
    if (!duel) {
      const o = ouvrirDuel(s, prevu, new Date().toISOString());
      if (o.refus) this.toast(o.refus);
      duel = o.duel;
      this.persist();
    }
    // M11-A : la rencontre forcée devient un duel (le personnage reprendra sa place au retour)
    this.force = null;
    this.rivalScene = null;
    this.alerte = null;
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
    const banner = h('div', { class: 'av-banner', 'data-key': 'av-banner', title: prevu.note }, 'Aventure');
    document.body.append(banner);
    const session = new DuelSession({
      app: this.d.app, arena, config: duel.config, params: { ...this.params, ...(this.save?.profil.apparence ? { apparence: this.save.profil.apparence } : {}) }, scenario: null, personality: prevu.personnalite, product: { menu: true }, resume: duel.commands,
      onTool: (t) => {
        if (t === 'menu') { void this.menuDuel(); return true; }
        // M12 : un conseil lu (« Compris ») est mémorisé dans la sauvegarde de l'aventure
        if (t.startsWith('tip:') && this.save) { this.save.conseils = conseilLu(this.save.conseils, t.slice(4)); this.persist(); this.live?.session.render(); return true; }
        return false;
      },
      tip: (c) => (this.save && conseilsPermis(location.search) && lireConseils(stockageLocal()) ? duelTip(c, this.save.conseils ?? []) : null),
      onCommand: (c) => this.pointDeSauvegarde(id, c),
      onEnded: (c) => this.finDuel(c, false),
      // M13 : le rôle musical de la rencontre (Kaï, Championnat, Finale, Maison, duel ordinaire)
      musique: roleDuelAventure(prevu.rencontre, prevu.personnalite.id),
      lieu: prevu.venue,
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
      void this.repriseImpossible(d, check.ok ? 'Rencontre inconnue.' : check.reason, prevu);
      return;
    }
    this.lancer(prevu, d);
  }

  /**
   * Duel qui ne peut pas être repris exactement (règles d'une autre version, données altérées) : comme le jeu standard
   * (fiche de la RC, T1), le recommencer depuis le début (même rencontre, même configuration), le retirer sans qu'il
   * compte, ou plus tard. Une rencontre inconnue ne peut qu’être retirée.
   */
  private async repriseImpossible(d: DuelAventure, raison: string, prevu: DuelPrevu | null): Promise<void> {
    const r = prevu
      ? await confirmDialog({ title: 'Reprise exacte impossible', text: `${raison} Vous pouvez recommencer ce duel depuis le début (même adversaire, même configuration) ou le retirer sans qu’il soit compté.`, confirm: 'Recommencer depuis le début', alt: { label: 'Retirer ce duel', key: 'drop' }, cancel: 'Plus tard' })
      : 'drop';
    const s = this.save;
    if (!s || s.duel?.id !== d.id) return;
    if (r === 'confirm' && prevu) {
      s.duel = { ...d, commands: [], hash: '', turn: 0, rules: REGLES_DUEL, catalog: CATALOG_AVENTURE };
      this.persist();
      this.lancer(prevu, s.duel);
    } else if (r === 'drop') {
      s.duel = null;
      this.persist();
      this.toast(`${prevu ? '' : `Reprise exacte impossible : ${raison} `}Duel en cours retiré (non compté).`);
      this.entrerVille(false);
    }
  }

  private prevuDe(d: DuelAventure): DuelPrevu | null {
    const [k, a, b] = d.rencontre.split(':');
    const e = this.etat;
    const base = d.rencontre === 'prologue' ? duelPrologue(d.seed)
      : figureOuNull(d.rencontre) ? duelFigure(d.rencontre, e, d.seed, e.vaincues.includes(d.rencontre))
      : k === 'epreuve' ? duelEpreuve(a as Family, e.competitions.epreuves[a as Family]?.etape ?? 0, e, d.seed, !!e.competitions.epreuves[a as Family]?.gagnee)
      : k === 'joute' ? duelJoute(a as Family, e, d.seed, !!e.competitions.joutes[a as Family]?.gagnee)
      : k === 'champ' ? duelChampionnat(a as 'poule' | 'miroir' | 'finale', e, d.seed, b as Family | undefined)
      : k === 'rival' && a && isKId(a) ? duelRival(a, e, d.seed)
      : rencontreDef(d.rencontre) ? duelFacultatif(d.rencontre, e, d.seed, this.save!.historique) : null;
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
    const conclure = (variante?: string) => {
      if (!this.save) return;
      const fin = conclureDuel(this.save, live.duel, c.match.events, issue, v.turn, new Date().toISOString(), variante);
      if (fin.refus) this.toast(fin.refus);
      this.persist();
      this.dernierResultat = { prevu: live.prevu, issue, gains: fin.gains, turns: v.turn, faits: fin.faits, pv: fin.pv };
      this.resultat();
    };
    // Avenant 09 : la première victoire qui donne une variante la laisse choisir (A, B ou C). En QA, sans `?choix=1`, la
    // variante A est prise d'office (parcours d'avant l'avenant inchangés).
    const choix = issue === 'victoire' ? choixVariante(this.save.etat, live.duel.rencontre) : null;
    if (!choix) return conclure();
    if (this.params.qa && new URLSearchParams(location.search).get('choix') !== '1') return conclure(choix[0]);
    this.choisirVariante(live.prevu, choix, conclure);
  }

  /** Avenant 09 : écran du choix de la variante, après une victoire qui en donne une ; rien n'est écrit avant le choix. */
  private choisirVariante(prevu: DuelPrevu, ids: readonly string[], ok: (v: string) => void): void {
    this.ecran = 'choix';
    this.d.arena()?.setStaging('portrait');
    this.d.arena()?.setPaused(false);
    son().jouer('gain');
    const ident = CATALOG[ids[0]!]!;
    this.ecranShell('scr-result av-scr',
      h('section', { class: 'av-titre av-resultat av-choix', 'data-screen': 'av-choix' },
        h('h1', { class: 'av-h1' }, 'Victoire'),
        h('p', { class: 'av-sous' }, `${prevu.titre} · choisissez votre carte`),
        h('p', null, `${ident.name} : une variante au choix entre au registre et remplace la carte de base dans votre deck. Les deux autres se gagnent ensuite, en revanche ou au titre du Championnat.`),
        h('div', { class: 'av-choix-cartes' }, ...ids.map((id, i) => {
          const d = CATALOG[id]!;
          return h('div', { class: 'av-choix-carte', 'data-key': `av-choix-carte-${id}` },
            cardEl(id, { artSeed: this.params.artSeed, tag: 'div' }),
            h('b', null, `${'ABC'[i]} · ${d.effect ? EFFECTS[d.effect].name : d.name}`),
            h('small', null, d.effect ? EFFECT_SUMMARY[d.effect] : ''),
            bouton('Prendre cette carte', () => ok(id), `av-choix-${id}`, i === 0));
        }))));
  }

  private resultat(): void {
    const r = this.dernierResultat!;
    this.ecran = 'resultat';
    // M13 : après le jingle de fin, l'écran de résultat joue le lounge
    son().musique.vouloir({ version: 'I-2' });
    // M11-E : une carte gagnée s'entend (après le son de fin du duel)
    if (r.gains.length) setTimeout(() => son().jouer('gain'), 900);
    this.d.arena()?.setStaging('portrait');
    this.d.arena()?.setPaused(false);
    const titre = r.issue === 'victoire' ? 'Victoire' : r.issue === 'defaite' ? 'Défaite' : 'Abandon';
    const prologue = r.prevu.rencontre === 'prologue';
    const note = prologue ? 'Quelle que soit l’issue, la foule a tout vu.'
      : r.prevu.rencontre.startsWith('champ:') ? (r.issue === 'victoire' ? (r.gains.length ? 'Le titre est à vous : les variantes qui vous manquaient encore entrent au registre.' : 'Le Championnat avance : aucune carte avant le titre.') : 'Rien n’est perdu : la manche peut se rejouer.')
      : r.prevu.rencontre.startsWith('epreuve:') ? (r.issue === 'victoire' ? (r.gains.length ? 'Épreuve remportée : la variante entre au registre.' : 'Duel gagné : la série continue.') : 'La série repart du début.') : r.issue === 'victoire' ? (r.gains.length ? 'Votre victoire entre au registre.' : 'Revanche : rien de nouveau au registre (aucune duplication ; les trois variantes sont déjà à vous).') : 'Rien n’est perdu : le défi reste ouvert.';
    this.ecranShell('scr-result av-scr',
      h('section', { class: 'av-titre av-resultat', 'data-screen': 'av-resultat' },
        h('h1', { class: 'av-h1' }, titre),
        h('p', { class: 'av-sous' }, `${r.prevu.titre} · ${r.turns} tour(s)`),
        h('p', null, note),
        h('p', { class: 'av-pv', 'data-key': 'av-pv' }, r.pv[1] > r.pv[0] ? `Entraînement : vos PV passent de ${r.pv[0]} à ${r.pv[1]}.` : `Un abandon ne compte pas comme un combat : vos PV restent à ${r.pv[0]}.`),
        prologue ? h('p', { class: 'av-proto', 'data-key': 'av-faits' }, `Ce que la foule a vu (faits publics du duel) : ${r.faits.assautsGagnes} Clash(es) gagné(s) en Assaut, ${r.faits.gardesGagnees} en Garde, ${r.faits.interferencesReussies} Interférence(s) réussie(s).`) : null,
        r.gains.length ? h('div', { class: `av-cards${r.gains.length > 8 ? ' nombreuses' : ''}` }, ...r.gains.flatMap((g) => gainEls(g, this.params.artSeed))) : null,
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
      // M10-E : on revient devant le héraut si l'on venait de la Grande Cour, sinon à la porte de l'arène
      const cour = this.town?.ilotId() === 'cour';
      const titre = rencontre === 'champ:finale' && this.etat.competitions.championnat.titre && r.issue === 'victoire';
      const proclamer = (cadre?: CadreDialogue | null) => this.dire('Le Championnat des Champions', cour
        ? 'La Grande Cour déborde jusqu’au Belvédère. Sur l’estrade, les quatre chefs lèvent leur bannière, et le héraut proclame : « Le titre de la ville vous revient : personne ne joue mieux ! » Kaï vous tend la main : « Personne en ville ne joue mieux que toi. Je le savais depuis le premier soir. »'
        : `La foule envahit le Parvis. Les quatre chefs se lèvent ; Kaï vous tend la main : « Personne en ville ne joue mieux que toi. Je le savais depuis le premier soir. »${this.quaiRangs ? ' Le héraut vous attend dans la Grande Cour pour la proclamation.' : ''}`, [fermer(this)], undefined, false, cadre);
      // M11 (cinématiques) : le titre, plan large de la place jusqu'au héraut et au joueur, puis la proclamation sur eux
      if (titre && this.cineActives && aJouer('titre', this.save!.cinematiques)) {
        this.sceneEntree = async () => {
          const t = this.town;
          if (!t || !this.scene('titre')) { son().jouer('titre'); proclamer(); return; }
          son().jouer('titre');
          const hr = cour ? this.ou('pnj-commis-40') : null;
          const j = { ...t.walker().pos };
          await this.jouerCine({ bandes: true, carton: { lieu: 'Le titre de la ville', ligne: 'personne ne joue mieux' } }, plansTitre(hr, j, t.cameraParams()), t.ready());
          proclamer(hr ? cadreDialogue(hr, j) : cadreDialogue(j));
        };
        this.entrerVille(false, cour ? 'npc-heraut' : 'porte-arene');
        return;
      }
      this.entrerVille(false, cour ? 'npc-heraut' : 'porte-arene');
      if (titre) { son().jouer('titre'); proclamer(); }
      return;
    }
    const comp = rencontre.match(/^(epreuve|joute):(\w+)$/);
    // M11-A : pas de second duel de Kaï au retour d'un duel contre lui ; devant le personnage seulement s'il est encore là
    this.retourKai = rencontre.startsWith('rival:') || rencontre === 'brasDroit-Cendre' || rencontre === 'rival-kai';
    const cible = comp ? `${comp[1]}-${comp[2]}` : rencontre;
    const ici = this.town?.ilotId();
    // M11 (cinématiques) : un chef vaincu, sa Signature gagnée : il s'incline, carton de la Signature
    const fig = figureOuNull(rencontre);
    if (fig?.role === 'chef' && r.issue === 'victoire' && r.gains.some((g) => g.kind === 'signature')) this.sceneEntree = () => this.sceneChef(fig);
    this.entrerVille(false, ici && this.posesDe(ici).some((p) => p.id === cible) ? `npc-${cible}` : undefined);
  }

  /** P4 et P5 : la foule, Kaï, puis le premier émissaire s'avance (les quatre ont invité). */
  private scenesFoule(): void {
    const e = this.etat;
    const victoire = e.prologue === 'victoire';
    // M11 (cinématiques) : la foule cadrée avec le joueur, Kaï s'il est là, puis l'émissaire qui fend la foule
    const t = this.town;
    const j = t ? { ...t.walker().pos } : null;
    const foule = FOULE.map((f) => this.ou(f.apparence) ?? f.at);
    const cadreFoule = j ? cadreGroupe([...foule, j]) : null;
    const kai = this.ou('braise');
    this.dire('La foule', victoire ? '« Des cartes grises ont battu la Braise du quai ! Des cartes de rien ! »' : '« Avec des cartes grises, tenir tête à Kaï jusqu’au bout… Des cartes de rien ! »', [{
      label: 'Suivant', key: 'dlg-next', primary: true, run: () => this.dire('Kaï', victoire ? '« La prochaine fois, je ne te ferai pas de cadeau. »' : '« Pas mal. Avec des cartes grises. »', [{
        label: 'Suivant', key: 'dlg-next', primary: true, run: () => { void this.emissaireFendLaFoule(e.premier ?? 'Astre', foule); },
      }], KAI_PROLOGUE.apparence, false, j && kai ? cadreDialogue(kai, j) : cadreFoule),
    }], undefined, false, cadreFoule);
  }

  /** P5 : le premier émissaire fend la foule jusqu'au joueur (une fois, en cinématique), puis présente sa famille. */
  private async emissaireFendLaFoule(f: Family, foule: readonly Vec2[]): Promise<void> {
    const t = this.town;
    const em = emissaire(f);
    const at = this.ou(em.apparence);
    if (!t || !at || !this.scene('prologue-foule')) { this.emissaireDialog(f, t && at ? cadreDialogue(at, t.walker().pos) : null); return; }
    this.fermerDialogue();
    const j = { ...t.walker().pos };
    const depart = { x: Math.min(t.ilot.bounds.x1 - 1, at.x + 4.5), z: at.z };
    const [groupe, duo] = plansEmissaire(foule, at, j);
    await this.jouerCine({ bandes: true, garder: true }, [
      // coupe sur la foule : l'émissaire part du bord de la rue, hors du cadre d'avant
      { ...groupe!, mouvement: 'coupe', action: () => t.walkNpc(em.apparence, depart, 1000, 'gauche') },
      { ...duo!, action: () => t.walkNpc(em.apparence, at, 1.5, regardVers(at, j)), finir: () => { void t.walkNpc(em.apparence, at, 1000, regardVers(at, j)); } },
    ]);
    if (this.town !== t) return;
    this.emissaireDialog(f, cadreDialogue(at, j));
  }

  /** Un chef vaincu (Signature gagnée, une fois par famille) : il s'incline ; carton de la Signature. */
  private async sceneChef(fig: ReturnType<typeof figure>): Promise<void> {
    const t = this.town;
    if (!t || !this.scene(`chef-${fig.famille}`)) return;
    const chef = this.ou(fig.apparence);
    const j = { ...t.walker().pos };
    await this.jouerCine({ bandes: true, carton: { lieu: `${fig.nom} s’incline`, ligne: `Signature ${de(fig.famille)} gagnée` } }, chef ? plansChef(chef, j) : plansAffiliation(j), t.ready());
  }

  // ------------------------------------------------------------------ fenêtres

  dire(titre: string, texte: string, choix: Choix[], apparence?: string, forcee = false, cadre?: CadreDialogue | null): void {
    this.fermerDialogue();
    this.town?.setInputLocked(true);
    // M11 : dialogue de scène, cadré (la caméra glisse sur le ou les personnages ; bandes gardées si la scène les tient)
    if (cadre && this.town && this.cineActives) {
      this.town.cadrer({
        at: cadre.at, ...(cadre.zoom !== undefined ? { zoom: cadre.zoom } : {}), ...(cadre.hauteur !== undefined ? { hauteur: cadre.hauteur } : {}),
        ...(cadre.sujets ? { sujets: cadre.sujets } : {}), ...(cadre.serre !== undefined ? { serre: cadre.serre } : {}), tau: 0.55,
      }, this.params.reducedMotion || this.params.freeze);
      this.cadreGarde = true;
      if (cadre.bandes && !this.sceneBandes) { this.bandesEcran().prendre(); this.sceneBandes = true; }
    }
    if (!cadre?.bandes && this.sceneBandes) { this.sceneBandes = false; this.bandesEcran().rendre(); }
    const box = h('div', { class: 'ville-dialog', role: 'dialog', 'aria-label': titre });
    if (apparence) {
      const p = personnalite(apparence, { nom: titre, titre: '' });
      box.append(h('img', { class: 'ville-portrait', alt: '', src: portraitUrl(p, this.params.artSeed) }));
    }
    const row = h('div', { class: 'ville-choices' }, ...choix.map((c) => h('button', { class: `ville-btn${c.primary ? ' primary' : ''}`, type: 'button', 'data-key': c.key, onclick: () => c.run() }, c.label)));
    box.append(h('div', { class: 'ville-dialog-body' }, h('b', null, titre), h('p', null, texte), row));
    box.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); if (!forcee) this.fermerDialogue(); } });
    document.body.append(box);
    this.dialog = box;
    (row.querySelector<HTMLButtonElement>('.primary') ?? row.querySelector('button'))?.focus({ preventScroll: true });
  }

  fermerDialogue(): void {
    const ouvert = !!this.dialog;
    this.sansFocus = false;
    this.dialog?.remove();
    this.dialog = null;
    // M11 : la caméra laissée sur un cadre (cinématique, dialogue de scène) revient au joueur quand son dialogue se ferme,
    // une tâche plus tard : une réplique qui enchaîne garde la scène (caméra et bandes) sans retour entre les deux
    if (ouvert && this.cadreGarde) {
      this.cadreGarde = false;
      setTimeout(() => {
        if (this.cadreGarde) return;
        if (this.sceneBandes) { this.sceneBandes = false; this.bandesCine?.rendre(); }
        // une cinématique qui vient de commencer tient la caméra
        if (!this.cine) Cinema.rendre(this.town, this.params.reducedMotion || this.params.freeze);
      }, 0);
    }
    if (!this.modal) this.town?.setInputLocked(false);
    this.rafraichir();
  }

  private ouvrirModal(panel: HTMLElement, forcee = false): void {
    this.fermerModal();
    this.town?.setInputLocked(true);
    const m = h('div', { class: 'av-modal', role: 'dialog', 'aria-modal': 'true' }, panel);
    m.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); if (!forcee) this.fermerModal(); } });
    document.body.append(m);
    this.modal = m;
    m.querySelector<HTMLElement>('.primary, button')?.focus({ preventScroll: true });
  }

  fermerModal(): void {
    this.modal?.remove();
    this.modal = null;
    if (!this.dialog) this.town?.setInputLocked(false);
  }

  private recompense(titre: string, gains: Gain[], suite: () => void, notes: string[] = []): void {
    if (gains.length) son().jouer('gain');
    const panel = h('div', { class: 'av-confirm av-recompense', 'data-key': 'av-recompense' },
      h('h2', null, titre),
      gains.length ? h('p', null, 'Inscription au registre des gains (une seule fois : un rechargement ou une reprise ne le dupliquent pas).') : null,
      gains.length ? h('div', { class: 'av-cards' }, ...gains.flatMap((g) => gainEls(g, this.params.artSeed))) : null,
      ...notes.map((n, i) => h('p', { class: 'av-transition', 'data-key': `av-recompense-note-${i}` }, n)),
      h('div', { class: 'ville-choices' }, h('button', { class: 'ville-btn primary', type: 'button', 'data-key': 'av-continuer', onclick: () => { this.fermerModal(); suite(); } }, 'Continuer')));
    this.ouvrirModal(panel);
  }

  private menu(): void {
    // M11 : Échap passe une cinématique
    if (this.cine) { this.cine.passer(); return; }
    // M11-A : une rencontre forcée ne s'esquive pas par le menu (on peut abandonner le duel, sans perte)
    if (this.force) return;
    if (this.modal) { this.fermerModal(); return; }
    if (this.dialog) { this.fermerDialogue(); return; }
    this.dire('Menu', 'L’aventure est sauvegardée à chaque étape.', [
      { label: 'Reprendre', key: 'dlg-close', primary: true, run: () => this.fermerDialogue() },
      { label: 'Deck et collection', key: 'menu-deck', run: () => { this.fermerDialogue(); this.collection(); } },
      { label: 'Journal des quêtes', key: 'menu-journal', run: () => { this.fermerDialogue(); this.journal(); } },
      { label: 'Apparence', key: 'menu-apparence', run: () => { this.fermerDialogue(); void this.reglageApparence(); } },
      { label: `Son : ${son().reglages().coupe ? 'coupé' : `${Math.round(son().reglages().volume * 100)} %`}`, key: 'menu-son', run: () => this.reglageSon() },
      { label: `Cinématiques : ${!cinePermise(location.search) ? 'coupées par l’adresse' : lireCine(stockageLocal()) ? 'oui' : 'non'}`, key: 'menu-cine', run: () => { ecrireCine(stockageLocal(), !lireCine(stockageLocal())); this.fermerDialogue(); this.menu(); } },
      { label: `Conseils du duel : ${!conseilsPermis(location.search) ? 'coupés par l’adresse' : lireConseils(stockageLocal()) ? 'affichés' : 'masqués'}`, key: 'menu-conseils', run: () => this.reglageConseils() },
      { label: 'Aide', key: 'menu-help', run: () => this.dire('Aide de l’aventure', 'Marcher : ZQSD, WASD, flèches ou clic au sol (Maj : pas lent). Parler, entrer, sortir : E, Entrée ou Espace, ou clic sur la bulle. Échap : menu. Repères : « ! » un défi ou une scène, « ? » quelqu’un à écouter. Les joueurs de cartes de la ville regardent devant eux : entrer dans leur regard, c’est accepter leur défi (une bulle « ! » s’allume, ils viennent à vous) ; passez derrière eux ou à l’abri d’un étal pour les éviter. Kaï surgit à certains moments de votre histoire ; l’objectif du moment s’affiche en haut, le Journal suit vos quêtes. Deck : seize cartes, quatre par Rang, une Signature au plus, deux Techniques ; la Collection dit comment gagner chaque carte. Vos PV montent de 3 à chaque combat mené à son terme, victoire ou défaite ; une défaite ne fait rien perdre, le défi reste ouvert. Après votre chef, engagez les autres familles à la Salle des Bannières ; les quatre chefs vaincus ouvrent le Championnat des Champions. L’aventure est sauvegardée à chaque étape, un duel à chaque action (menu du duel : sauvegarder et quitter). Les duels se jouent comme dans le jeu standard (aide du duel : bouton « ? ») ; des conseils, un à la fois, expliquent chaque phase et chaque signal des cartes la première fois qu’il paraît (« Conseils du duel », dans ce menu). Le son se règle dans ce menu (« Son »). Les grands moments de votre histoire se jouent en cinématique (première arrivée dans un quartier, Kaï qui surgit, votre affiliation, un chef vaincu, un nouveau chapitre, le Championnat) : Échap, Espace, Entrée ou « Passer » pour la passer ; « Cinématiques », dans ce menu, les coupe.', [fermer(this)]) },
      { label: 'Écran titre', key: 'menu-home', run: () => { this.fermerDialogue(); this.titre(); } },
    ]);
  }

  /** Passe 165 : l'apparence du protagoniste (silhouette, peau, cheveux, yeux), modifiable à tout moment ; sauvegardée. */
  private async reglageApparence(): Promise<void> {
    const s = this.save;
    if (!s) return;
    const sil = await silhouettesDisponibles(this.params.qa, new URLSearchParams(location.search).get('sprites'));
    let apparence: Apparence = s.profil.apparence ?? { ...APPARENCE_DEFAUT.a };
    this.ouvrirModal(h('div', { class: 'av-confirm', 'data-key': 'av-apparence-menu' },
      h('h2', null, 'Apparence'),
      editeurApparence({ valeur: apparence, tenue: this.etat.affiliation ?? 'gris', silhouettes: sil, change: (a) => { apparence = a; } }),
      h('div', { class: 'ville-choices' },
        h('button', { class: 'ville-btn primary', type: 'button', 'data-key': 'av-apparence-ok', onclick: () => {
          if (estOrigine(apparence)) delete s.profil.apparence;
          else s.profil.apparence = apparence;
          this.persist();
          this.fermerModal();
          // la ville se remonte sur le nouveau personnage (même îlot, même place, sans nouveau tirage)
          if (this.ecran === 'ville') this.entrerVille(false, undefined, true);
        } }, 'Valider'),
        h('button', { class: 'ville-btn', type: 'button', 'data-key': 'av-apparence-annuler', onclick: () => this.fermerModal() }, 'Annuler'))));
  }

  /** M12 : conseils du duel (un à la fois, « Compris ») : les afficher ou les masquer, réafficher ceux déjà lus. */
  private reglageConseils(): void {
    const s = this.save;
    const lus = s?.conseils?.length ?? 0;
    const actifs = lireConseils(stockageLocal());
    this.dire('Conseils du duel', `Un conseil à la fois, au-dessus des commandes du duel, la première fois qu’une situation se présente : les phases du tour, puis les signaux des cartes (RÉVÉLER, ARMÉ, la pastille de déclenchement, les temps forts, les regards privés). « Compris » le range. Conseils lus : ${lus}.${conseilsPermis(location.search) ? '' : ' Ils sont coupés par l’adresse de la page.'}`, [
      { label: actifs ? 'Masquer les conseils' : 'Afficher les conseils', key: 'conseils-bascule', primary: true, run: () => { ecrireConseils(stockageLocal(), !actifs); this.reglageConseils(); } },
      ...(s && lus ? [{ label: 'Tout réafficher', key: 'conseils-reset', run: () => { s.conseils = []; this.persist(); this.reglageConseils(); } }] : []),
      { label: 'Fermer', key: 'dlg-close', run: () => this.fermerDialogue() },
    ]);
  }

  /** M11-E : réglage du son (coupure, volume), mémorisé dans ce navigateur ; même réglage que les Options du jeu standard. */
  private reglageSon(): void {
    const r = son().reglages();
    const musique = r.musique ? `${Math.round(r.musique * 100)} %` : 'coupée';
    this.dire('Son', `Effets, ambiances et musique, synthétisés par le jeu. Volume : ${Math.round(r.volume * 100)} %${r.coupe ? ' (coupé)' : ''} ; musique : ${musique}.${son().permis ? '' : ' Le son est désactivé par l’adresse de la page.'}`, [
      { label: r.coupe ? 'Activer le son' : 'Couper le son', key: 'son-coupe', primary: true, run: () => { son().regler({ coupe: !r.coupe }); this.reglageSon(); } },
      { label: 'Volume −', key: 'son-moins', run: () => { son().regler({ volume: r.volume - 0.1 }); this.reglageSon(); } },
      { label: 'Volume +', key: 'son-plus', run: () => { son().regler({ volume: r.volume + 0.1 }); this.reglageSon(); } },
      { label: 'Musique −', key: 'musique-moins', run: () => { son().regler({ musique: r.musique - 0.1 }); this.reglageSon(); } },
      { label: 'Musique +', key: 'musique-plus', run: () => { son().regler({ musique: r.musique + 0.1 }); this.reglageSon(); } },
      { label: 'Fermer', key: 'dlg-close', run: () => this.fermerDialogue() },
    ]);
    // M13 : on règle la musique en l'écoutant telle quelle (pas d'effacement sous ce dialogue)
    this.sansFocus = true;
  }

  /**
   * Écran Deck et collection de l'aventure (M10-C) : l'éditeur du deck (R-AV, case par case : 16 cartes, quatre par
   * Rang, une identité au plus une fois, une Signature au plus, deux Techniques), la collection (chaque carte possédée
   * avec l'origine de son gain, ou à gagner avec la manière de l'obtenir) et le registre des gains.
   */
  collection(onglet: 'deck' | 'collection' | 'registre' = 'deck'): void {
    const s = this.save!;
    const col = collectionDe(s.etat.registre);
    const art = this.params.artSeed;
    let draft: DeckAv = structuredClone(s.etat.deck);
    let caseSel: number | null = null;
    const body = h('div', { class: 'av-deck' });
    const carte = (defId: string) => (isNeutre(defId) ? neutreEl(defId) : cardEl(defId, { artSeed: art, tag: 'div' }));
    const version = (defId: string) => (isNeutre(defId) ? 'Neutre' : CATALOG[defId]!.rarity === 'Basic' ? 'Basic' : EFFECTS[CATALOG[defId]!.effect!].name);
    const modifie = () => JSON.stringify(draft) !== JSON.stringify(s.etat.deck);
    const onglets = () => h('div', { class: 'av-onglets', role: 'tablist' }, ...([['deck', 'Deck'], ['collection', 'Collection'], ['registre', 'Registre des gains']] as const).map(([k, l]) =>
      h('button', { class: `ville-btn${onglet === k ? ' primary' : ''}`, type: 'button', role: 'tab', 'aria-selected': onglet === k ? 'true' : 'false', 'data-key': `av-onglet-${k}`, onclick: () => { onglet = k; caseSel = null; render(); } }, l)));

    const vueDeck = (): HTMLElement[] => {
      const issues = validerDeckAv(draft, col);
      // À gauche, les quatre Rangs (2 × 2) ; à droite, la case choisie et ce qui peut y entrer, la Signature, les
      // Techniques, l'état du deck et les boutons : tout tient dans l'écran à 1280 × 720.
      const rangs = h('div', { class: 'av-rangs' }, ...RANGS.map((r) => h('div', { class: 'av-rang' },
        h('span', { class: 'av-rang-nom' }, `Rang ${ROMAIN[r]}`),
        h('div', { class: 'av-rang-cases' }, ...draft.cartes.map((c, i) => [c, i] as const).filter(([c]) => rangDe(c) === r).map(([c, i]) => h('button', {
          class: `av-case${caseSel === i ? ' sel' : ''}`, type: 'button', 'data-key': `av-case-${i}`, 'aria-pressed': caseSel === i ? 'true' : 'false',
          'aria-label': `Case ${i + 1} : ${isNeutre(c) ? 'neutre' : nomCarte(c)} — changer`, onclick: () => { caseSel = caseSel === i ? null : i; render(); },
        }, carte(c), h('small', null, version(c))))))));
      const sel = caseSel;
      const choix = sel === null ? [] : choixPourCase(draft, col, sel);
      const panneau = sel === null
        ? h('p', { class: 'av-aide' }, 'Choisissez une case pour voir ce qui peut y entrer : une neutre, ou la Basic ou une variante possédée d’une identité qui n’est pas déjà dans le deck.')
        : h('div', { class: 'av-choix', 'data-key': 'av-choix' },
          h('p', null, choix.length > 1 ? `Rang ${ROMAIN[rangDe(draft.cartes[sel]!)]} : mettre dans cette case` : 'Aucune autre carte possédée pour cette case (une identité ne se joue qu’une fois).'),
          ...choix.map((c) => h('button', {
            class: `av-case${c === draft.cartes[sel] ? ' actuelle' : ''}`, type: 'button', 'data-key': `av-choix-${c}`,
            onclick: () => { draft = remplacerCase(draft, col, sel, c); caseSel = null; render(); },
          }, carte(c), h('small', null, c === draft.cartes[sel] ? `${version(c)} (en place)` : version(c)))));
      const sigs = h('div', { class: 'ville-choices' }, ...[null, ...col.signatures].map((f) => h('button', { class: `ville-btn${draft.signature === f ? ' primary' : ''}`, type: 'button', 'data-key': `av-sig-${f ?? 'aucune'}`, onclick: () => { draft = equiperSignature(draft, f); render(); } }, f ? CATALOG[`sig-${f}`]!.name : 'Aucune')));
      const techs = h('div', { class: 'ville-choices' }, ...col.techniques.map((t: TechniqueId) => h('button', { class: `ville-btn${draft.techniques.includes(t) ? ' primary' : ''}`, type: 'button', 'data-key': `av-tech-${t}`, title: TECHNIQUES[t].text, onclick: () => { draft = basculerTechnique(draft, col, t); render(); } }, t)));
      const cote = h('div', { class: 'av-deck-cote' },
        panneau,
        h('h3', null, `Signature (${col.signatures.length ? `${col.signatures.length} possédée${col.signatures.length > 1 ? 's' : ''}, une seule équipée` : 'aucune : battez un chef'})`),
        h('div', { class: 'av-sig-ligne' }, draft.signature ? h('div', { class: 'av-cards' }, cardEl(`sig-${draft.signature}`, { artSeed: art, tag: 'div' })) : null, sigs),
        h('h3', null, `Techniques (${draft.techniques.length} sur 2)`), techs,
        issues.length ? h('ul', { class: 'av-issues', 'data-key': 'av-issues' }, ...issues.map((i) => h('li', null, i.text))) : h('p', { class: 'av-ok', 'data-key': 'av-deck-ok' }, `Deck valide (seize cartes, quatre par Rang)${modifie() ? ' — modifications non enregistrées' : ''}.`),
        !issues.length && standardLegal(draft, col) ? h('p', { class: 'av-standard', 'data-key': 'av-deck-standard' }, STANDARD) : null,
        h('div', { class: 'ville-choices' },
          h('button', { class: 'ville-btn primary', type: 'button', 'data-key': 'av-deck-save', disabled: issues.length ? true : null, onclick: () => { s.etat = { ...s.etat, deck: draft }; this.persist(); this.fermerModal(); this.toast('Deck enregistré.'); } }, 'Enregistrer et fermer'),
          h('button', { class: 'ville-btn', type: 'button', 'data-key': 'av-deck-reset', disabled: modifie() ? null : true, onclick: () => { draft = structuredClone(s.etat.deck); caseSel = null; render(); } }, 'Annuler les changements')));
      return [h('p', { class: 'av-resume' }, `${resumeDeck(draft)}.`), h('div', { class: 'av-deck-grille' }, rangs, cote)];
    };

    const vueCollectionEl = (): HTMLElement[] => {
      const v = vueCollection(s.etat);
      const entree = (x: EntreeCollection, titre: string) => h('div', { class: `av-col-entree${x.possedee ? '' : ' verrou'}`, 'data-key': `av-col-${x.id}`, 'data-possedee': x.possedee ? 'true' : 'false' },
        h('span', { class: 'av-col-titre' }, titre), cardEl(x.id, { artSeed: art, tag: 'div' }),
        h('span', { class: 'av-col-texte' }, `${x.possedee ? '' : '🔒 '}${x.texte}`), x.dansDeck ? h('span', { class: 'av-badge' }, 'dans le deck') : null);
      return [
        h('p', null, `Cartes familiales et Signatures : ${v.compte.possedees} sur ${v.compte.total}. Rien n’est caché : chaque carte dit comment la gagner.`),
        h('h3', null, 'Neutres (la populace)'),
        h('div', { class: 'av-cards' }, ...v.neutres.map((n) => h('div', { class: 'av-col-entree' }, neutreEl(n.id, `×${n.possedees}`), h('span', { class: 'av-col-texte' }, `${n.dansDeck} dans le deck`)))),
        ...v.familles.map((f) => h('section', { class: `av-col-fam fam-${f.famille}`, 'data-key': `av-col-fam-${f.famille}` },
          h('h3', null, h('span', { class: `av-emb fam-${f.famille}`, html: emblemSvg(f.famille) }), ` ${capital(leF(f.famille))} — ${f.etat === 'chef' ? chefVaincu(f.famille) : ETAT_FAMILLE[f.etat]}`),
          // avenant 09 : une ligne par Rang (Basic, variantes A, B et C), la Signature à part
          h('div', { class: 'av-col-cartes' },
            ...RANGS.flatMap((r, i) => [entree(f.basics[i]!, `Basic ${ROMAIN[r]}`), ...f.variantes.slice(3 * i, 3 * i + 3).map((x) => entree(x, `${ROMAIN[r]} ${x.lettre ?? ''}`.trim()))]),
            entree(f.signature, 'Signature')))),
        h('h3', null, 'Techniques'),
        h('ul', { class: 'av-col-techs' }, ...v.techniques.map((t) => h('li', { class: t.possedee ? 'faite' : '', title: TECHNIQUES[t.id as TechniqueId].text }, `${t.possedee ? '✓' : '🔒'} ${t.id} — ${t.texte}${t.dansDeck ? ' (équipée)' : ''}`))),
      ];
    };

    const vueRegistre = (): HTMLElement[] => [
      h('p', null, 'Chaque gain est inscrit une fois, avec son origine : une reprise n’en ajoute jamais ; une revanche gagnée ne donne qu’une variante pas encore possédée.'),
      h('ol', { class: 'av-registre', 'data-key': 'av-registre' }, ...s.etat.registre.map((g) => h('li', null, `${nomGain(g)} — ${origineGain(g)}`))),
    ];

    const render = () => {
      body.replaceChildren(
        h('div', { class: 'av-ecran-tete' }, h('h2', null, 'Deck et collection'),
          h('button', { class: 'ville-btn', type: 'button', 'data-key': 'av-deck-close', onclick: () => { if (modifie()) this.toast('Modifications du deck abandonnées.'); this.fermerModal(); } }, 'Fermer')),
        onglets(),
        ...(onglet === 'deck' ? vueDeck() : onglet === 'collection' ? vueCollectionEl() : vueRegistre()));
    };
    render();
    this.ouvrirModal(h('div', { class: 'av-confirm av-ecran', 'data-key': 'av-collection' }, body));
  }

  journal(): void {
    const q = quetes(this.etat);
    this.ouvrirModal(h('div', { class: 'av-confirm av-large', 'data-key': 'av-journal-panel' },
      h('h2', null, 'Journal des quêtes'),
      ...q.map((x) => h('div', { class: 'av-quete' }, h('h3', null, x.titre), h('ul', null, ...x.etapes.map((s) => h('li', { class: s.faite ? 'faite' : '' }, `${s.faite ? '✓ ' : '· '}${s.texte}`))))),
      h('p', { class: 'av-proto' }, `Les familles : ${FAMILIES.map((f) => `${capital(leF(f))}, ${this.etat.familles[f] === 'chef' ? chefVaincu(f) : ETAT_FAMILLE[this.etat.familles[f]]}`).join(' · ')}`),
      h('h3', null, 'Duels de l’aventure (les plus récents d’abord)'),
      this.save!.historique.length
        ? h('ol', { class: 'av-registre', 'data-key': 'av-historique' }, ...[...this.save!.historique].reverse().slice(0, 20).map((d) => h('li', null, `${titreRencontre(d.rencontre)} · ${ISSUE[d.issue]} · ${d.turns} tour${d.turns > 1 ? 's' : ''}`)))
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

  /** QA (cinématiques) : apparence de l'émissaire d'une famille. */
  qaApparenceEmissaire(f: Family): string | null { return this.params.qa ? emissaire(f).apparence : null; }

  /**
   * QA (cinématiques) : le Championnat mené jusqu'au titre par les faits du jeu (poule, Miroir, finale, mêmes règles),
   * puis le retour de la finale gagnée par le code du jeu (proclamation). Vrai si le titre est acquis.
   */
  qaTitre(): boolean {
    if (!this.params.qa || !this.save) return false;
    const evs: Evenement[] = [
      ...(['Cendre', 'Ronce', 'Voile'] as const).map((f): Evenement => ({ type: 'championnat', manche: 'poule', chef: f, signature: f, issue: 'victoire' })),
      { type: 'championnat', manche: 'miroir', signature: 'Astre', issue: 'victoire' },
      { type: 'championnat', manche: 'finale', signature: 'Cendre', issue: 'victoire' },
      { type: 'championnat', manche: 'finale', signature: 'Ronce', issue: 'victoire' },
    ];
    for (const ev of evs) {
      const r = appliquer(this.save.etat, ev, new Date().toISOString());
      if (r.refus) return false;
      this.save.etat = r.etat;
    }
    this.persist();
    this.dernierResultat = { prevu: { rencontre: 'champ:finale', titre: 'La Finale' } as unknown as DuelPrevu, issue: 'victoire', gains: [], turns: 1, faits: { assautsGagnes: 0, gardesGagnees: 0, interferencesReussies: 0 }, pv: [0, 0] };
    this.apresResultat();
    return this.etat.competitions.championnat.titre;
  }

  /** QA : termine le duel en cours avec une issue imposée (parcours automatisés ; jamais sans `?qa=1`). */
  qaTerminer(issue: Issue): void {
    if (!this.params.qa || !this.live) return;
    this.finDuel(this.live.session.controller, issue === 'abandon', issue);
  }
}

const LIEU: Record<VenueId, string> = { salle: 'la salle de jeu de cartes', rue: 'la rue, le Quai la nuit', bar: 'le Fanal', arene: 'l’arène' } as Record<VenueId, string>;

const lieuDe = (f: Family) => (f === 'Cendre' ? 'à la Maison du Chantier, à l’ouest du Quai' : f === 'Ronce' ? 'devant le Fanal, sur le Quai' : f === 'Voile' ? 'dans les Ruelles, près de la fontaine' : 'sur le Parvis de l’arène');
const nomCarte = (defId: string) => (CATALOG[defId] ? cardTitle(CATALOG[defId]!) : defId);
/** Avenant 09 : « une variante au choix de Cendre III (Ferveur, Surenchère, Brûlure) ». */
const auChoix = (defId: string) => `une variante au choix de ${CATALOG[defId]!.name} (${variantesIdentite(CATALOG[defId]!.identity).map((v) => EFFECTS[CATALOG[v]!.effect!].name).join(', ')})`;
/** Le deck au format standard (avenant M10-A, AV-04 ; A-6). */
const STANDARD = 'Format standard : 17 cartes, sans carte grise ; le validateur du mode Duel l’accepte tel quel.';
/** État d'une bannière, lu par le joueur (Salle des Bannières). */
const ETAT_BANNIERE: Record<EtatBanniere, string> = { accueil: 'votre famille', engageable: 'défi à engager', engagee: 'défi engagé', conquise: 'chef vaincu', fermee: 'pas encore' };
const OU_ILOT: Record<IlotId, string> = { quai: 'sur le Quai', ruelles: 'dans les Ruelles (sortie ouest du Quai)', parvis: 'sur le Parvis de l’arène (sortie est du Quai)', cour: 'dans la Grande Cour, au cœur de la ville', port: 'sur la Place du Fanal (au bout ouest de la cour de la Chapelle)', haute: 'dans la Ville haute (au bout ouest du Belvédère)' };
/** État d'une famille, lu par le joueur (écran Collection). */
/** Chapitre de la trame en clair (écran titre) ; épicène. */
const CHAPITRE: Record<ReturnType<typeof chapitreDetaille>, string> = { prologue: 'Prologue', I: 'Chapitre I, la maison', II: 'Chapitre II, les trois voies', III: 'Chapitre III, les trois voies', IV: 'Chapitre IV, les trois voies', V: 'Chapitre V, le Championnat', titre: 'Titre remporté' };
const ISSUE: Record<Issue, string> = { victoire: 'Victoire', defaite: 'Défaite', abandon: 'Abandon' };
/** Nom lisible d'une rencontre de l'historique (identifiant de `DuelAventure.rencontre`). */
function titreRencontre(id: string): string {
  const [k, a, b] = id.split(':');
  if (id === 'prologue') return `Duel public contre ${KAI_PROLOGUE.nom}`;
  const fig = figureOuNull(id);
  if (fig) return `${fig.nom}, ${fig.titre}`;
  if (k === 'epreuve') return `Épreuve du quartier ${deF(a as Family)}`;
  if (k === 'joute') return `Joute de la maison ${deF(a as Family)}`;
  if (k === 'rival' && a && isKId(a)) return `Kaï — ${evenementDef(a).titre}`;
  if (k === 'champ') return a === 'poule' ? `Championnat, poule : ${figureDe(b as Family, 'chef').nom}` : a === 'miroir' ? 'Championnat, le Miroir' : 'Championnat, la Finale';
  const r = rencontreDef(id);
  return r ? capital(r.nom) : id;
}
const ETAT_FAMILLE: Record<EtatFamille, string> = { inconnue: 'pas encore rencontrée', remarque: 'a remarqué votre jeu', invite: 'vous invite', affilie: 'votre famille', defiee: 'défi officiel engagé', chef: 'chef vaincu' };
/** Ce qu'un gain a remis : « Cartes de base de la Cendre », le nom d'une variante ou d'une Signature, « Technique Lecture ». */
function nomGain(g: Gain): string {
  if (g.kind === 'neutres') return 'Seize cartes neutres';
  if (g.kind === 'basics') return `Cartes de base ${deF(g.family!)}`;
  if (g.kind === 'technique') return `Technique ${g.items[0]}`;
  return nomCarte(g.items[0]!);
}

function ligneFigure({ role, famille }: { role: 'cadet' | 'brasDroit' | 'chef'; famille: Family }, revanche: boolean): string {
  if (revanche) return '« Encore ? Soit. Je joue chaque partie comme la première. »';
  return role === 'cadet' ? '« Voyons si tu tiens la distance. »' : role === 'brasDroit' ? `« Avant ${leChef(famille)}, il y a moi. »` : '« Tout ce chemin jusqu’à moi. Montre-moi pourquoi. »';
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
